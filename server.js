"use strict";
require("dotenv").config();

// importing packages
const express = require("express");
const path = require("path");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const easyship = require('@api/easyship');
const resend = require("resend")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

const { getRatesForCarrier, createLabel } = require('./services/shipstation');
const { templateBuilder } = require('./services/emailTemplates');
easyship.auth(process.env.EASYSHIP_KEY);
if (process.env.EASYSHIP_KEY?.startsWith('sand_')) {
    easyship.server('https://public-api-sandbox.easyship.com');
}

// Hexxo only lists clothing/accessories, so USPS's restricted-content rate
// classes (media mail and its close relatives) are never legitimate for a
// listing and should never reach the seller's courier picker. Matching on
// single words with a boundary check rather than the full USPS product name
// since carriers are inconsistent about exact naming.
const RESTRICTED_COURIER_KEYWORD_PATTERNS = [/\bmedia\b/, /\blibrary\b/, /\bbound printed matter\b/];

function isRestrictedCourierRate(rate) {
  // Normalize hyphens/underscores to spaces so "USPS Media Mail" and
  // ShipStation's snake_case serviceCode ("usps_media_mail") both match the
  // same way.
  const haystack = `${rate.serviceName ?? ""} ${rate.serviceCode ?? ""}`.toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ");
  return RESTRICTED_COURIER_KEYWORD_PATTERNS.some((pattern) => pattern.test(haystack));
}



// Import Firebase configuration
const { initializeFirebase, getDb, getAdmin } = require("./firebase");
const { verifyAuth } = require("./middleware/auth.js");
const { matchAuthenticationRequest } = require("./services/matching.js");

// Initialize Firebase
const { admin, db } = initializeFirebase();
const bucket = admin.storage().bucket();

// aws config
const aws = require("aws-sdk");
const dotenv = require("dotenv");
const { data } = require("jquery");
const { type } = require("os");
const { error } = require("console");
dotenv.config();

// aws parameters
const region = "us-east-1";
const bucketName = "ecom-websiteh2t";
const accessKeyId = process.env.aws_access_key_id;
const secretKeyId = process.env.aws_secret_access_key;
const MARKETPLACE_FEE_RATE = 0.07
const DELIVERY_CONFIRMATION_WINDOW_MS = 3 * 24 * 60 * 60 * 1000

// shipstation parameters
const shipStationKey = process.env.SHIPSTATION_KEY;
const shipStationSecretKey = process.env.SHIPSTATION_SECRET_KEY;

// Initializing the Resend client with the API key
const resendClient = new resend.Resend(process.env.RESEND_API_KEY);

// Best-effort notifications to the site owner (new sale / signup / auth
// request queued). Never throws -- callers fire this without awaiting so a
// Resend hiccup can't block a webhook or an API response.
async function sendAdminNotification(notificationType, data) {
  if (!process.env.ADMIN_EMAIL) {
    console.warn(`ADMIN_EMAIL not set, skipping ${notificationType} admin notification`);
    return;
  }

  try {
    const template = templateBuilder(notificationType, data);
    if (!template) return;

    await resendClient.emails.send({
      from: 'noreply@hexxo.store',
      to: process.env.ADMIN_EMAIL,
      subject: template.subject,
      html: template.html
    });
  } catch (error) {
    console.error(`Error sending admin notification (${notificationType}):`, error);
  }
}

const AUTHENTICATION_MIN_PRICE = 150;
const SNEAKER_FOOTWEAR_BRANDS = [
  "nike", "jordan", "adidas", "yeezy", "new balance", "asics", "vans",
  "converse", "reebok", "hoka", "on", "saucony", "salomon", "veja",
  "alexander mcqueen", "gucci", "balenciaga", "christian louboutin",
  "off-white", "dior", "louis vuitton"
];
const STREETWEAR_APPAREL_BRANDS = [
  "supreme", "bape", "stussy", "palace", "travis scott", "denim tears",
  "fear of god essentials", "eric emanuel", "hellstar", "moncler",
  "the north face", "polo ralph lauren", "mcm", "canada goose"
];
// Keyed by the de-gendered value actually stored in listing.category (see
// seller.js's collectListingInfo: category.split('-')[1] -- gender lives
// separately in categoryMeta). This used to be keyed by gender-prefixed
// values ("men-sneakers" etc.) that never matched any real listing doc, so
// the brand-match path silently never fired for sneakers/shoes -- only
// listingPrice >= AUTHENTICATION_MIN_PRICE was ever qualifying them.
const AUTHENTICATION_CATALOG = {
  "sneakers": SNEAKER_FOOTWEAR_BRANDS,
  "shoes": SNEAKER_FOOTWEAR_BRANDS,
  "apparel": STREETWEAR_APPAREL_BRANDS
};

// Two independent qualifying paths, not one combined AND: price alone
// qualifies any listing regardless of category (including the categories
// with no entry in AUTHENTICATION_CATALOG at all -- a $200 hat still
// qualifies here), and separately, an approved category+brand combo
// qualifies regardless of price.
function isAuthenticationEligible(listing) {
  if (listing.listingPrice >= AUTHENTICATION_MIN_PRICE) return true;

  const approvedBrands = AUTHENTICATION_CATALOG[listing.category];
  return !!approvedBrands && approvedBrands.includes(listing.brand?.toLowerCase());
}

aws.config.update({
  region,
  accessKeyId,
  secretKeyId
});

// init s3
const s3 = new aws.S3();

// generate img upload link
async function generateUrl() {
  let date = new Date();
  let id = parseInt(Math.random() * 10000000000);

  const imgName = `${id}${date.getTime()}.jpg`;

  const params = {
    Bucket: bucketName,
    Key: imgName,
    Expires: 300, //300 ms
    ContentType: "image/jpeg"
  };
  const uploadURL = await s3.getSignedUrlPromise("putObject", params);
  return uploadURL;
}

// declare static path
let staticPth = path.join(__dirname, "public");
console.log(staticPth);

const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;
// intial express.js
const app = express();

// Trust the first hop proxy (Render/Heroku/nginx/etc.) so req.protocol
// reflects the client's original scheme via X-Forwarded-Proto instead of
// always reporting 'http' -- without this, Stripe live-mode redirect URLs
// built from req.protocol (see accountLinks.create) get rejected with
// "Livemode requests must always be redirected via HTTPS."
app.set("trust proxy", 1);

// middlewares
app.use(
  express.static(staticPth, {
    setHeaders: (res, path) => {
      if (path.endsWith(".js")) {
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      }
    }
  })
);

app.post('/webhook', express.raw({type: 'application/json'}), (request, response) => {
  let event = request.body;
  // Only verify the event if you have an endpoint secret defined.
  // Otherwise use the basic event deserialized with JSON.parse
  if (endpointSecret) {
    // Get the signature sent by Stripe
    const signature = request.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(
        request.body,
        signature,
        endpointSecret
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`, err.message);
      return response.sendStatus(400);
    }
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
      // Then define and call a method to handle the successful payment intent.
      handlePaymentIntentSucceeded(paymentIntent);
      break;
    case 'payment_intent.amount_capturable_updated':
      // Only fires for capture_method: 'manual' PaymentIntents (i.e.
      // authentication-opted orders) -- this is the authorization moment,
      // distinct from and prior to the actual capture that later fires
      // payment_intent.succeeded above.
      handlePaymentIntentAuthorized(event.data.object);
      break;
    default:
      // Unexpected event type
      console.log(`Unhandled event type ${event.type}.`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.sendStatus(200);
});

app.use(express.json());




app.post('/send/update', verifyAuth, async (req, res) => {
  const { notificationType, metadata } = req.body;

  if (!notificationType) {
    return res.status(400).json({ success: false, message: 'Missing notificationType' });
  }

  try {
    const userRecord = await admin.auth().getUser(req.token.uid);
    const template = templateBuilder(notificationType, { firstName: userRecord.displayName, ...metadata });

    if (!template) {
      return res.status(400).json({ success: false, message: 'Unknown notificationType' });
    }

    await resendClient.emails.send({
      from: 'noreply@hexxo.store',
      to: userRecord.email,
      subject: template.subject,
      html: template.html
    });

    if (notificationType === 'ACCOUNT_CREATED') {
      sendAdminNotification('NEW_SIGNUP', { firstName: userRecord.displayName, email: userRecord.email });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
});

// Admin-only notification types a logged-in client is allowed to trigger
// directly (as opposed to NEW_SALE, which only ever fires server-side from
// the Stripe webhook -- an allow-list here stops a client from forging one).
const CLIENT_TRIGGERABLE_ADMIN_NOTIFICATIONS = ['AUTH_REQUEST_QUEUED'];

app.post('/send/admin-notify', verifyAuth, async (req, res) => {
  const { notificationType, metadata } = req.body;

  if (!CLIENT_TRIGGERABLE_ADMIN_NOTIFICATIONS.includes(notificationType)) {
    return res.status(400).json({ success: false, message: 'Unknown notificationType' });
  }

  await sendAdminNotification(notificationType, metadata || {});
  res.json({ success: true });
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Deliberately no verifyAuth -- the contact page has to work for logged-out
// visitors, unlike /send/update and /send/admin-notify above (both require
// a Firebase session). Not routed through sendAdminNotification() either:
// that helper is fire-and-forget and swallows errors, but this route needs
// to actually report success/failure back to the submitter.
app.post('/send/contact', async (req, res) => {
  const { name, email, subject, message, website } = req.body;

  // Honeypot -- a hidden field real visitors never see or fill in, but a
  // naive bot filling every field in the form will. Report success so it
  // doesn't learn to look elsewhere, just silently drop the message instead
  // of actually sending it.
  if (website) {
    return res.json({ success: true });
  }

  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }
  if (!EMAIL_PATTERN.test(email.trim())) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  }
  if (!process.env.ADMIN_EMAIL) {
    console.warn('ADMIN_EMAIL not set, cannot send contact form submission');
    return res.status(500).json({ success: false, message: 'Contact form is temporarily unavailable.' });
  }

  try {
    const template = templateBuilder('CONTACT_FORM_SUBMISSION', {
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
    });

    await resendClient.emails.send({
      from: 'noreply@hexxo.store',
      to: process.env.ADMIN_EMAIL,
      replyTo: email.trim(),
      subject: template.subject,
      html: template.html,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error sending contact form email:', error);
    return res.status(500).json({ success: false, message: 'Failed to send message. Please try again.' });
  }
});

app.post('/webhooks/easyship', async (req, res) => {
  const signature = req.headers['x-easyship-signature'];
  if (!signature) {
    return res.sendStatus(401);
  }

  try {
    jwt.verify(signature, process.env.EASYSHIP_WEBHOOK_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    console.error("Easyship webhook signature verification failed:", err.message);
    return res.sendStatus(401);
  }

  const event = req.body;
  console.log("Received Easyship webhook:", JSON.stringify(event));

  if (event?.event_type !== 'shipment.tracking.status.changed') {
    return res.sendStatus(200);
  }

  const shipment = event.data;
  const shipmentId = shipment?.easyship_shipment_id;
  const deliveryStatus = shipment?.status;

  if (!shipmentId || deliveryStatus?.toLowerCase() !== 'delivered') {
    return res.sendStatus(200);
  }

  try {
    const snapshot = await db.collection('orders').where('easyshipShipmentId', '==', shipmentId).limit(1).get();
    if (snapshot.empty) {
      console.error(`No order found for Easyship shipment ${shipmentId}`);
      return res.sendStatus(200);
    }

    const orderDoc = snapshot.docs[0];
    const order = orderDoc.data();

    // Already delivered (duplicate webhook delivery) or somehow not shipped
    // yet -- either way, nothing to do. Not an error: Easyship's own docs
    // don't promise exactly-once delivery.
    if (order.fulfillmentStatus !== 'shipped') {
      return res.sendStatus(200);
    }

    const deliveredAt = new Date();
    await orderDoc.ref.update({
      fulfillmentStatus: 'delivered',
      deliveredAt,
      deliveryConfirmationDeadlineAt: new Date(deliveredAt.getTime() + DELIVERY_CONFIRMATION_WINDOW_MS),
      deliveryConfirmationStatus: 'required',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await createNotification(
      order.buyerId,
      "order_status",
      "Order Delivered",
      `Your order for ${order.item?.name || "your item"} has been delivered.`,
      "/profile?tab=purchases"
    );

    res.sendStatus(200);
  } catch (err) {
    console.error("Failed to process Easyship webhook:", err);
    res.sendStatus(500);
  }
});


app.get('/carriers', async (req, res) => {
  try {
    const request =  await fetch('https://ssapi.shipstation.com/carriers', {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${shipStationKey}:${shipStationSecretKey}`).toString('base64')}`
      }
    })

   const data = await request.json();

   return res.json(data);

  } catch (error) {
    return res.status(500).json({success: false, message: error})
  }
})

app.post('/rates/compare', async (req, res) => {
  try {
    const request =  await fetch('https://ssapi.shipstation.com/carriers', {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${shipStationKey}:${shipStationSecretKey}`).toString('base64')}`
      }
    })

   const data = await request.json();
   // TEMPORARY: walleted carriers (Stamps.com, ups_walleted, fedex_walleted)
   // quote rates fine but fail label purchase with InsufficientFundsException
   // until the ShipStation wallet is funded -- excluded here so testing only
   // surfaces carriers that can actually complete a real label purchase.
   // Remove this filter once the wallet is funded.
   const codes = data.filter(d => d.requiresFundedAccount).map(d => d.code);

   const rates = codes.map(code => getRatesForCarrier(code, req.body));
   const carrierRates = await Promise.allSettled(rates);
   const lowestRates = carrierRates.filter(carrier => carrier.status === "fulfilled").map(v => v.value).flat().filter(rate => !isRestrictedCourierRate(rate)).sort((a, b) => (a.shipmentCost + a.otherCost) - (b.shipmentCost + b.otherCost))

   return res.json(lowestRates);

  } catch (error) {
    return res.status(500).json({success: false, message: error})
  }
})


// routes
// home route
app.get("/", (req, res) => {
  res.sendFile(path.join(staticPth, "index.html"));
});
// mens page route
app.get("/mens", (req, res) => {
  res.sendFile(path.join(staticPth, "shop/mens.html"));
});

// women page route
app.get("/women", (req, res) => {
  res.sendFile(path.join(staticPth, "shop/women.html"));
});

// accessories page route
app.get("/accessories", (req, res) => {
  res.sendFile(path.join(staticPth, "shop/accessories.html"));
});

// collectibles page route
app.get("/collectibles", (req, res) => {
  res.sendFile(path.join(staticPth, "shop/collectibles.html"));
});
// accessories page route
app.get("/contact", (req, res) => {
  res.sendFile(path.join(staticPth, "static/contact.html"));
});

// terms of service route
app.get("/terms", (req, res) => {
  res.sendFile(path.join(staticPth, "static/terms.html"));
});

//login route
app.get("/login", (req, res) => {
  res.sendFile(path.join(staticPth, 'auth/login.html'));
});

// forgot password route
app.get("/forgot-password", (req, res) => {
  res.sendFile(path.join(staticPth, "auth/forgot.html"));
});

//profile route
app.get("/profile", (req, res) => {
  res.sendFile(path.join(staticPth, "account/profile.html"));
});
//signup route
app.get("/signup", (req, res) => {
  res.sendFile(path.join(staticPth, "auth/signup.html"));
});
//list product route
app.get("/list-product", (req, res) => {
  res.sendFile(path.join(staticPth, "list-product.html"));
});
// trade request route
app.get("/trade-request", (req, res) => {
  res.sendFile(path.join(staticPth, "trade/trade-request.html"));
});
// view trade request route
app.get("/view-trade-request", (req, res) => {
  res.sendFile(path.join(staticPth, "viewTradeRequest.html"));
});

app.get("/trade", (req, res) => {
  res.sendFile(path.join(staticPth, "trade/trade.html"))
})
// sell to us route
app.get("/sell-to-us", (req, res) => {
  res.sendFile(path.join(staticPth, "sell-to-us/sell-to-us.html"));
});
// releases route
app.get("/releases", (req, res) => {
  res.sendFile(path.join(staticPth, "shop/releases.html"));
});
// shop landing route
app.get("/shop", (req, res) => {
  res.sendFile(path.join(staticPth, "shop/shop.html"));
});
// brands route
app.get("/brands", (req, res) => {
  res.sendFile(path.join(staticPth, "shop/brands.html"));
});
// about route
app.get("/about", (req, res) => {
  res.sendFile(path.join(staticPth, "static/about.html"));
});
// authentication route
app.get("/authenticate", (req, res) => {
  res.sendFile(path.join(staticPth, "authenticator/authenticate.html"));
});
// authentication results route
app.get("/authenticate/results", (req, res) => {
  res.sendFile(path.join(staticPth, "authenticator/authenticate-results.html"));
});
// authentication reviewer route -- first admin surface in the app; access
// is gated client-side by checking the admin custom claim (UX only, see
// authentication-review.js) and server-side by the PUT route's isAdmin check
app.get("/admin/authentication-review", (req, res) => {
  res.sendFile(path.join(staticPth, "admin/authentication-review.html"));
});

// Same UX-only client-side gate pattern as authentication-review above.
// Real enforcement is GET /api/admin/delivery-confirmations' and
// POST /api/orders/:id/delivery-confirmation/approve's isAdmin checks.
app.get("/admin/delivery-confirmation-review", (req, res) => {
  res.sendFile(path.join(staticPth, "admin/delivery-confirmation-review.html"));
});

// Same UX-only client-side gate pattern as authentication-review above.
// Real enforcement is GET /api/admin/order-authentications' and
// POST /api/admin/order-authentications/:orderId/decision's isAdmin checks.
app.get("/admin/order-authentication-review", (req, res) => {
  res.sendFile(path.join(staticPth, "admin/order-authentication-review.html"));
});

// login route
app.get("/login", (req, res) => {
  res.sendFile(path.join(staticPth, "login.html"));
});

// seller route
app.get("/seller", (req, res) => {
  res.sendFile(path.join(staticPth, "seller/seller.html"));
});

// seller profile route (public-facing, viewed via ?id=<sellerId>)
app.get("/sellerProfile", (req, res) => {
  res.sendFile(path.join(staticPth, "sellerProfile/sellerProfile.html"));
});



// add product
app.get("/add-product", (req, res) => {
  res.sendFile(path.join(staticPth, "addProduct.html"));
});

app.get("/add-product/:id", (req, res) => {
  res.sendFile(path.join(staticPth, "addProduct.html"));
});

// get the upload link
app.get("/s3url", (req, res) => {
  generateUrl().then((url) => res.json(url));
});


app.post("/delete-product", (req, res) => {
  let { id } = req.body;

  db.collection("products")
    .doc(id)
    .delete()
    .then((data) => {
      res.json("success");
    })
    .catch((err) => {
      res.json("err");
    });
});

app.post("/orders", verifyAuth, async (req, res) => {
  const data = req.body;

  try {
    if(data.items.length > 0) {

      const orderData = {
        buyerId: req.token.uid,
        status: "captured",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentMethod: data.paymentMethod,
        paymentIntentId: data.paymentIntentId,
        shippingAddress: {
          firstName: data.firstName,
          lastName: data.lastName,
          address1: data.address1,
          address2: data.address2,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country,
          phone: data.phone
        },
        items: data.items,
        orderSource: data.orderSource
      };

      const docRef = await db.collection("orders").add(orderData);
      return res.status(200).json({success: true, message: `Document written with ID: , ${docRef.id}` })
    } else {
      return res.status(400).json({success: false, message: "Order is empty!"});
    }
  
  } catch (error) {
    return res.status(500).json({success: false, message: error.message})
  }

})

// The PaymentIntent (and its shipping_from metadata) is created on checkout
// page load, before the buyer has a chance to use the "Edit" link on their
// shipping address -- buildOrderDataFromPaymentIntent later reads
// shippingAddress straight off that metadata, so an edit that only lives in
// the page's local state would never actually reach the order. This patches
// just that one metadata key on the same PaymentIntent (order-only change,
// nothing written back to the buyer's saved profile).
app.post("/orders/update-shipping", verifyAuth, async (req, res) => {
  const { paymentIntentId, shippingFrom } = req.body;

  if (!paymentIntentId || !shippingFrom) {
    return res.status(400).json({ success: false, message: "Missing paymentIntentId or shippingFrom" });
  }

  try {
    const paymentData = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentData.metadata.buyer_id !== req.token.uid) {
      return res.status(403).json({ success: false, message: "Not authorized for this payment intent" });
    }

    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: { shipping_from: shippingFrom }
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Writes the order doc as fulfillmentStatus:"pending" at the moment the buyer
// clicks "Pay now" (checkout.js's handleSubmit), not when the checkout page
// merely loads -- the PaymentIntent itself is created on page load, so tying
// order creation to that would leave a pending order behind for every
// abandoned/reloaded checkout. The webhook below then flips this same doc to
// "processing" once payment actually captures, instead of creating a new one.
app.post("/orders/init", verifyAuth, async (req, res) => {
  const { paymentIntentId } = req.body;

  try {
    const paymentData = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Authentication payments never create an `orders` doc -- see the
    // item_type branch in handlePaymentIntentSucceeded for why.
    if (paymentData.metadata.item_type === 'authentication') {
      return res.status(200).json({ success: true, skipped: true });
    }

    if (paymentData.metadata.buyer_id !== req.token.uid) {
      return res.status(403).json({ success: false, message: "Not authorized for this payment intent" });
    }

    const existingOrder = await db.collection('orders').where('id', '==', paymentIntentId).limit(1).get();
    if (!existingOrder.empty) {
      return res.status(200).json({ success: true, message: "Order already initialized" });
    }

    const data = buildOrderDataFromPaymentIntent(paymentData);

    await db.collection('orders').add({
      ...data,
      status: paymentData.status,
      fulfillmentStatus: 'pending'
    });

    await createNotification(
      data.buyerId,
      "purchase",
      "Order Confirmed",
      `Your order for ${data.item?.name || "an item"} has been placed.`,
      "/profile?tab=purchases"
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// product page
app.get("/products/:id", (req, res) => {
  res.sendFile(path.join(staticPth, "shop/product.html"));
});

app.get("/search/:key", (req, res) => {
  res.sendFile(path.join(staticPth, "search.html"));
});

app.get("/cart", (req, res) => {
  res.sendFile(path.join(staticPth, "cart.html"));
});

app.get("/api/cart", verifyAuth, async (req, res) => {
  const uid = req.token.uid;
  console.log("uid:", uid)

  try {
    const snapshot = await db.collection('carts').doc(uid).collection('items').get();

    if (snapshot.empty) {
      console.log("No matching documents");
      return res.json([]);
    }

    const cartItems = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    return res.json(cartItems);

  } catch (err) {
    return res.status(500).json({status:"Interal server error", error: err.message })
  }



})


// Public seller-profile data for product pages/seller profile pages. Same
// reasoning as sales-history below: userProfiles docs carry stripeCustomerId
// and shipping (home address/phone), and Security Rules can only grant/deny
// the whole document, not individual fields. A Firestore rule permissive
// enough for an anonymous shopper to read username/profileImage/isVerified
// would also expose those private fields to them. Routing through the admin
// SDK here hands back only the fields a storefront view actually needs.
app.get("/api/sellers/:id/public-profile", async (req, res) => {
  try {
    const docSnap = await db.collection("userProfiles").doc(req.params.id).get();

    if (!docSnap.exists) {
      return res.status(404).json({});
    }

    const profile = docSnap.data();

    return res.json({
      username: profile.username || "",
      profileImage: profile.profileImage || "",
      isVerified: profile.isVerified || false,
      ratings: profile.ratings || {},
      stats: profile.stats || {},
      websiteLinks: profile.websiteLinks || [],
      salesCount: profile.salesCount || 0,
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Public price-history data for the product page chart. No verifyAuth — this is
// storefront data any shopper can see. Kept out of Firestore rules on purpose:
// `orders` docs carry buyerId/buyerEmail/shippingAddress, and Security Rules can
// only grant/deny a whole document, not individual fields. Routing through the
// admin SDK here lets us hand back just { date, subtotal } per sale.
app.get("/api/products/:id/sales-history", async (req, res) => {
  try {
    const listingSnap = await db.collection("listings").doc(req.params.id).get();

    if (!listingSnap.exists) {
      return res.status(404).json({ error: "Product not found" });
    }

    const { productName, brand } = listingSnap.data();

    let ordersQuery = db.collection("orders");
    const { startDate, endDate } = req.query;

    // Same field, both inequalities -> no composite index required.
    if (startDate && endDate) {
      ordersQuery = ordersQuery
        .where("createdAt", ">=", Number(startDate))
        .where("createdAt", "<=", Number(endDate));
    }

    const snapshot = await ordersQuery.get();

    const sales = snapshot.docs
      .map((doc) => doc.data())
      .filter((data) => data.item && data.item.name === productName && data.item.brand === brand)
      .map((data) => ({ createdAt: data.createdAt, subtotal: parseFloat(data.subtotal) }));

    return res.json(sales);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Same reasoning as /sales-history above: rather than open a public Firestore
// rule on `offers` (whose current fields look harmless but aren't guaranteed
// to stay that way), compute the summary server-side and hand back just two
// numbers.
//
// Note: offerAmount is whatever's currently on the table for a still-"active"
// thread, so a seller's counter-down shows up here as if it were a buyer ask.
// That was true of this route's original design; flagging it now that offer
// creation actually populates it, in case the highest/lowest semantics need
// to change (e.g. only count amounts whose last history entry was `by: "buyer"`).
app.get("/api/products/:id/offer-summary", async (req, res) => {
  try {
    // Filtering on productId alone (no status filter in the query itself)
    // avoids needing a composite index -- status is checked in memory instead,
    // same trick as the date-range filtering above.
    const offersSnap = await db.collection("offers").where("productId", "==", req.params.id).get();

    const activeAmounts = offersSnap.docs
      .map((doc) => doc.data())
      .filter((data) => data.status === "active")
      .map((data) => data.offerAmount);

    return res.json({
      highest: activeAmounts.length ? Math.max(...activeAmounts) : 0,
      lowest: activeAmounts.length ? Math.min(...activeAmounts) : 0,
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Buyer submits an offer on a listing. Counters/accepts/rejects below all
// update this same doc (status stays "active" through a whole negotiation,
// only offerAmount/turn change) instead of creating new offer docs -- that
// keeps a single thread per buyer per listing and keeps offer-summary above
// showing the live number, not a stale first-ask.
app.post("/api/products/:id/offer", verifyAuth, async (req, res) => {
  try {
    const amount = Number(req.body.offerAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Enter a valid offer amount" });
    }

    const listingSnap = await db.collection("listings").doc(req.params.id).get();
    if (!listingSnap.exists) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    const listing = listingSnap.data();
    const sellerId = listing.userId;

    if (sellerId === req.token.uid) {
      return res.status(400).json({ success: false, message: "You can't make an offer on your own listing" });
    }

    // One offer doc per (listing, buyer) pair, at a deterministic ID, rather
    // than a fresh auto-id per submission. That lets a resolved negotiation
    // be restarted in place (see history below) instead of accumulating
    // orphaned docs, and lets the transaction below check-and-set atomically
    // -- a plain read-then-.add() would let two rapid submits both pass the
    // "no active offer yet" check before either write lands.
    const offerRef = db.collection("offers").doc(`${req.params.id}_${req.token.uid}`);

    try {
      await db.runTransaction(async (tx) => {
        const existing = await tx.get(offerRef);
        if (existing.exists && existing.data().status === "active") {
          throw new Error("DUPLICATE_ACTIVE_OFFER");
        }

        tx.set(offerRef, {
          productId: req.params.id,
          buyerId: req.token.uid,
          sellerId,
          offerAmount: amount,
          status: "active",
          turn: "seller",
          history: [{ by: "buyer", action: "offer", amount, at: Date.now() }],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    } catch (error) {
      if (error.message === "DUPLICATE_ACTIVE_OFFER") {
        return res.status(409).json({ success: false, message: "You already have an active offer on this item" });
      }
      throw error;
    }

    await createNotification(
      sellerId,
      "offer",
      "New offer received",
      `You received a $${amount} offer on ${listing.productName || "your listing"}.`,
      `/sellerProfile/offers?id=${sellerId}`
    );

    return res.status(200).json({ success: true, offerId: offerRef.id });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// The logged-in buyer's own offer thread on this listing (if any) -- not
// filtered to "active" so an accepted/rejected outcome still shows up here;
// otherwise the buyer's status panel would go blank the instant the seller
// responds instead of showing the outcome.
app.get("/api/products/:id/offers/mine", verifyAuth, async (req, res) => {
  try {
    const docSnap = await db.collection("offers").doc(`${req.params.id}_${req.token.uid}`).get();
    if (!docSnap.exists) return res.json({ offer: null });

    return res.json({ offer: { id: docSnap.id, ...docSnap.data() } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Seller-only: every active offer on their own listing.
app.get("/api/products/:id/offers", verifyAuth, async (req, res) => {
  try {
    const listingSnap = await db.collection("listings").doc(req.params.id).get();
    if (!listingSnap.exists) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    if (listingSnap.data().userId !== req.token.uid) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const snap = await db.collection("offers").where("productId", "==", req.params.id).get();

    const offers = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((data) => data.status === "active");

    return res.json({ offers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Accept/reject/counter an offer. Whichever side's `turn` it is may act;
// counter-offers update the same doc (offerAmount + flipped turn) so the
// negotiation stays a single back-and-forth thread rather than branching
// into new docs.
app.post("/api/offers/:offerId/respond", verifyAuth, async (req, res) => {
  try {
    const { action, counterAmount } = req.body;
    if (!["accept", "reject", "counter"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }

    const offerRef = db.collection("offers").doc(req.params.offerId);
    const offerSnap = await offerRef.get();
    if (!offerSnap.exists) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    const offer = offerSnap.data();
    const uid = req.token.uid;
    const role = uid === offer.buyerId ? "buyer" : uid === offer.sellerId ? "seller" : null;

    if (!role) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    if (offer.status !== "active") {
      return res.status(400).json({ success: false, message: "This offer is no longer active" });
    }
    if (offer.turn !== role) {
      return res.status(403).json({ success: false, message: "It's not your turn to respond to this offer" });
    }

    const otherRole = role === "buyer" ? "seller" : "buyer";
    const otherUid = otherRole === "buyer" ? offer.buyerId : offer.sellerId;

    let update;
    let notifArgs;

    if (action === "accept") {
      update = {
        status: "accepted",
        respondedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        history: [...offer.history, { by: role, action: "accept", amount: offer.offerAmount, at: Date.now() }],
      };
      notifArgs = ["Offer accepted", `Your offer of $${offer.offerAmount} was accepted.`];
    } else if (action === "reject") {
      update = {
        status: "rejected",
        respondedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        history: [...offer.history, { by: role, action: "reject", amount: offer.offerAmount, at: Date.now() }],
      };
      notifArgs = ["Offer declined", `Your offer of $${offer.offerAmount} was declined.`];
    } else {
      const amount = Number(counterAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ success: false, message: "Enter a valid counter amount" });
      }

      update = {
        offerAmount: amount,
        turn: otherRole,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        history: [...offer.history, { by: role, action: "counter", amount, at: Date.now() }],
      };
      notifArgs = ["Counter offer received", `Countered with $${amount} on your offer.`];
    }

    await offerRef.update(update);
    await createNotification(otherUid, "offer", notifArgs[0], notifArgs[1], `/sellerProfile/offers?id=${offer.sellerId}`);

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Favoriting/unfavoriting used to be two direct client-side Firestore writes
// (favorites/{uid}/items/{listingId} + an increment on listings/{id}) batched
// together for atomicity. Firestore rules correctly only let a listing's
// owner write to that listing doc, so as soon as the counter update was
// added to the batch, favoriting someone else's listing (the normal case)
// got rejected wholesale -- including the favorite record itself, since a
// batch is all-or-nothing. Moved server-side so it runs with admin
// privileges instead of needing a client-writable counter field.
app.post("/favorites/:listingId", verifyAuth, async (req, res) => {
  try {
    const userId = req.token.uid;
    const listingId = req.params.listingId;

    const listingRef = db.collection("listings").doc(listingId);
    const favoriteRef = db.collection("favorites").doc(userId).collection("items").doc(listingId);

    await db.runTransaction(async (tx) => {
      const [listingSnap, favoriteSnap] = await Promise.all([tx.get(listingRef), tx.get(favoriteRef)]);

      if (!listingSnap.exists) {
        throw new Error("LISTING_NOT_FOUND");
      }
      if (favoriteSnap.exists) {
        // Already favorited -- nothing to do, not an error (e.g. a retried request).
        return;
      }

      const listing = listingSnap.data();
      tx.set(favoriteRef, {
        listingId,
        productName: listing.productName || "",
        listingPrice: listing.listingPrice || 0,
        brand: listing.brand || "",
        category: listing.category || "",
        images: listing.images || [],
        addedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      tx.update(listingRef, { favoritesCount: admin.firestore.FieldValue.increment(1) });
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    if (error.message === "LISTING_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.delete("/favorites/:listingId", verifyAuth, async (req, res) => {
  try {
    const userId = req.token.uid;
    const listingId = req.params.listingId;

    const listingRef = db.collection("listings").doc(listingId);
    const favoriteRef = db.collection("favorites").doc(userId).collection("items").doc(listingId);

    await db.runTransaction(async (tx) => {
      // Firestore transactions require every read to happen before any write
      // -- both tx.get() calls have to run first, even though the listing
      // read is only needed by the write branch further down.
      const [favoriteSnap, listingSnap] = await Promise.all([tx.get(favoriteRef), tx.get(listingRef)]);
      if (!favoriteSnap.exists) {
        // Already unfavorited -- nothing to do, not an error (e.g. a retried request).
        return;
      }

      tx.delete(favoriteRef);
      // The listing itself may since have been deleted -- only decrement a
      // counter that still exists rather than throwing on a dangling favorite.
      if (listingSnap.exists) {
        tx.update(listingRef, { favoritesCount: admin.firestore.FieldValue.increment(-1) });
      }
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Backs the "conversation" page tied to a seller's profile (linked from the
// buyer's "View offers" confirmation after sending an offer). One query
// covers both roles: the seller viewing this route on their own profile sees
// every offer on any of their listings; a buyer viewing another seller's
// profile only sees their own thread(s) with that seller.
app.get("/api/sellers/:sellerId/offers", verifyAuth, async (req, res) => {
  try {
    const isOwner = req.token.uid === req.params.sellerId;

    const snap = await db.collection("offers").where("sellerId", "==", req.params.sellerId).get();

    const offers = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((data) => isOwner || data.buyerId === req.token.uid);

    const listingIds = [...new Set(offers.map((offer) => offer.productId))];
    const listingSnaps = await Promise.all(
      listingIds.map((id) => db.collection("listings").doc(id).get())
    );
    const listingsById = {};
    listingSnaps.forEach((snap, i) => {
      listingsById[listingIds[i]] = snap.exists ? snap.data() : null;
    });

    const enriched = offers.map((offer) => {
      const listing = listingsById[offer.productId];
      return {
        ...offer,
        productName: listing?.productName || "Listing removed",
        productImage: listing?.images?.find((img) => img.isPrimary)?.url || listing?.images?.[0]?.url || "",
      };
    });

    return res.json({ offers: enriched, viewerRole: isOwner ? "seller" : "buyer" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/sellerProfile/offers", (req, res) => {
  res.sendFile(path.join(staticPth, "sellerProfile/offers.html"));
});

app.get("/checkout", (req, res) => {
  res.sendFile(path.join(staticPth, "checkout.html"));
});

app.get("/track-order", (req, res) => {
  res.sendFile(path.join(staticPth, "track-order.html"));
});

app.get("/orders/:id", verifyAuth, async (req, res) => {
  try {
    const docId = req.params.id;

    const docRef = await db.collection("orders").doc(docId).get();
    if (!docRef.exists) return res.status(404).json({success: false, message: "Order not found"});

    const order = docRef.data();

    if (req.token.uid === order.buyerId || req.token.uid === order.sellerId) {
      return res.status(200).json({ success: true, data: order });
    } else {
      return res.status(403).json({success: false, message: "Unauthorized"})
    }
  } catch (error) {
    return res.status(500).json({success: false, message: error.message})
  }
})

app.get("/api/orders/by-payment-intent/:paymentIntentId", verifyAuth, async (req, res) => {
  try {
    const snapshot = await db.collection("orders")
      .where("id", "==", req.params.paymentIntentId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = snapshot.docs[0].data();

    if (req.token.uid !== order.buyerId && req.token.uid !== order.sellerId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Server-mediated for the same PII/ownership reasoning as the route above --
// joins orders + orderAuthenticationPhotos (for the reviewed timestamp)
// rather than exposing either collection directly to the client. Only ever
// returns data for an order that actually passed; a cancelled/still-pending
// order has nothing to certify.
app.get("/api/orders/:id/authentication-certificate", verifyAuth, async (req, res) => {
  try {
    const orderId = req.params.id;
    const orderSnap = await db.collection("orders").doc(orderId).get();

    if (!orderSnap.exists) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orderSnap.data();

    if (req.token.uid !== order.buyerId && req.token.uid !== order.sellerId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (order.authenticationStatus !== "passed") {
      return res.status(409).json({ success: false, message: "This order does not have a passed authentication certificate" });
    }

    const photosSnap = await db.collection("orderAuthenticationPhotos").doc(orderId).get();
    const photos = photosSnap.data() || {};

    return res.status(200).json({
      success: true,
      data: {
        orderId,
        itemName: order.item?.name || "Item",
        itemBrand: order.item?.brand || null,
        subtotal: order.subtotal,
        authenticatedAt: order.authenticationDecidedAt?.toDate?.().getTime()
          || photos.reviewedAt?.toDate?.().getTime()
          || null
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 404 route
app.get("/404", (req, res) => {
  res.sendFile(path.join(staticPth, "/static/404.html"));
});

// update and modify product information
app.put("/products/:id", verifyAuth, async (req, res) => {
    const data = req.body;
    const docId = req.params.id;

    try {
      const docRef = await db.collection("listings").doc(docId).get();
      if (!docRef.exists) return res.status(404).json({ result: `Not listing found for ${docId}`});

      if(req.token.uid === docRef.data().userId) {
        const updateData = {
          ...(data.images !== undefined && { images: data.images }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.category !== undefined && { category: data.category }),
          ...(data.brand !== undefined && { brand: data.brand }),
          ...(data.condition !== undefined && { condition: data.condition }),
          ...(data.size !== undefined && { size: data.size }),
          ...(data.shipping !== undefined && { shipping: data.shipping }),
          ...(data.listingPrice !== undefined && { listingPrice: data.listingPrice }),
        };

        if (Object.keys(updateData).length === 0) return res.status(400).json({update: false, message: "No changes made"});

        await db.collection("listings").doc(docId).update({
          ...updateData,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({update: true, message: "Update successful"});

      } else {
        return res.status(403).json({result: "No match"})
      }
    } catch (error) {
      res.status(500).json({ verified: false, message: error.message})
    }
    
});

// update and modify user profile information
app.put("/users/:id", verifyAuth, async (req, res) => {
  const userId = req.params.id;
  const data = req.body;

  try {
    if (req.token.uid === userId) {
      const docRef = db.collection("users").doc(userId);
      const doc = await docRef.get();

      if (doc.exists) {    
        const updateData = {
          ...(data.number !== undefined && { number: data.number}),
          ...(data.notification !== undefined && { notification: data.notification })
        }

        if (Object.keys(updateData).length === 0) return res.status(400).json({update: false, message: "No changes made"});

        await docRef.update({
          ...updateData,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({ update: true, message: "Update successful" });
      }
      
    } else {
      return res.status(403);
    }

  } catch (error) {
    return res.status(500).json({success: false, message: error.message})
  }
 
  
});

// Which fulfillmentStatus values a seller is allowed to move *from* for
// each target status -- e.g. you can only mark "shipped" from pending or
// processing. Keeps the state machine in one place instead of scattered
// if/else checks.
//
// Sellers can never self-declare "delivered" -- that used to let a seller
// start the buyer's 3-day delivery-confirmation window (deliveredAt) with a
// single click, regardless of whether the item had actually arrived.
// "delivered" is now only set from ground truth: the /webhooks/easyship
// route below (for orders with a purchased label, order.easyshipShipmentId
// set) or the buyer confirming receipt themselves via
// BUYER_FULFILLMENT_TRANSITIONS (for self-ship orders, where no carrier
// webhook exists to source that truth from).
const SELLER_FULFILLMENT_TRANSITIONS = {
  shipped: ["pending", "processing"]
};

const BUYER_FULFILLMENT_TRANSITIONS = {
  delivered: ["shipped"]
};

app.put("/orders/:id", verifyAuth, async (req, res) => {
  const data = req.body;

  try {
    const docId = req.params.id;

    const docRef =  await db.collection("orders").doc(docId).get();
    if(!docRef.exists) return res.status(404).json({success: false, message: "Document not found!"});

    const order = docRef.data();

    const isBuyer = req.token.uid === order.buyerId;
    const isSeller = req.token.uid === order.sellerId;
    const isAdmin = req.token.admin === true;

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({ success:false, message: "Role type not found!" })
    }

    // Once delivered, cancelled, or refunded, the order is a closed record
    // -- nothing below should be able to touch it further. "refunded" is
    // set by /api/orders/:id/dispute/uphold, a separate dedicated route
    // that bypasses this lock the same way the delivery-confirmation
    // endpoints already do -- this array just has to know the state exists
    // so a later PUT on the same order can't un-refund it.
    const locked = ['delivered', 'cancelled', 'refunded'];
    const isLocked = locked.includes(order.fulfillmentStatus);

    if (isLocked) {
      return res.status(409).json({ success: false, message: "Order is locked!" })
    }

    const updatedData = {};

    if (isSeller && data.fulfillmentStatus !== undefined) {
      const allowedFrom = SELLER_FULFILLMENT_TRANSITIONS[data.fulfillmentStatus];

      if (!allowedFrom) {
        return res.status(400).json({ success: false, message: `Sellers cannot set fulfillmentStatus to "${data.fulfillmentStatus}"` });
      }
      if (!allowedFrom.includes(order.fulfillmentStatus)) {
        return res.status(409).json({ success: false, message: `Cannot mark "${data.fulfillmentStatus}" from "${order.fulfillmentStatus}"` });
      }
      if (!data.trackingNumber) {
        return res.status(400).json({ success: false, message: "Tracking number is required to mark an order shipped" });
      }

      updatedData.fulfillmentStatus = data.fulfillmentStatus;
      updatedData.trackingNumber = data.trackingNumber;
      updatedData.shippingCarrier = data.shippingCarrier;
      // Both prepaid-label and self-ship orders converge on this same
      // branch to actually mark "shipped" (a prepaid label being generated
      // deliberately doesn't set fulfillmentStatus itself -- see
      // purchaseShippingLabel's call site) -- so this is the one place that
      // needs to stamp it. Nothing else on the order doc records a
      // per-stage timestamp for this transition otherwise.
      updatedData.shippedAt = admin.firestore.FieldValue.serverTimestamp();
    }

    // Buyer-confirmed delivery -- only reachable when there's no Easyship
    // shipment to source ground truth from instead (self-ship listings, or a
    // prepaid listing whose label purchase failed and the seller had to ship
    // manually). Orders with a real Easyship shipment are only ever moved to
    // "delivered" by /webhooks/easyship below.
    if (isBuyer && data.fulfillmentStatus !== undefined) {
      const allowedFrom = BUYER_FULFILLMENT_TRANSITIONS[data.fulfillmentStatus];

      if (!allowedFrom) {
        return res.status(400).json({ success: false, message: `Buyers cannot set fulfillmentStatus to "${data.fulfillmentStatus}"` });
      }
      if (!allowedFrom.includes(order.fulfillmentStatus)) {
        return res.status(409).json({ success: false, message: `Cannot mark "${data.fulfillmentStatus}" from "${order.fulfillmentStatus}"` });
      }
      if (order.easyshipShipmentId) {
        return res.status(409).json({ success: false, message: "This order's delivery is tracked automatically and can't be confirmed manually." });
      }

      // Plain Dates, not FieldValue.serverTimestamp() -- the deadline has to
      // be computed from deliveredAt in the same write, and a serverTimestamp
      // sentinel can't be used for arithmetic client-side.
      const deliveredAt = new Date();
      updatedData.fulfillmentStatus = "delivered";
      updatedData.deliveredAt = deliveredAt;
      updatedData.deliveryConfirmationDeadlineAt = new Date(deliveredAt.getTime() + DELIVERY_CONFIRMATION_WINDOW_MS);
      updatedData.deliveryConfirmationStatus = "required";
    }

    if(isAdmin) {
      if (data.status !== undefined) {
        updatedData.status = data.status
      }
    }

    if (Object.keys(updatedData).length === 0) {
      return res.status(400).json({update: false, message: "No changes made"})
    }

    await docRef.ref.update({
      ...updatedData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const itemName = order.item?.name || "your item";

    if (updatedData.fulfillmentStatus === "shipped") {
      await createNotification(
        order.buyerId,
        "order_status",
        "Order Shipped",
        `Your order for ${itemName} has shipped (tracking #${data.trackingNumber}).`,
        "/profile?tab=purchases"
      );
    }

    if (updatedData.fulfillmentStatus === "delivered") {
      await createNotification(
        order.buyerId,
        "order_status",
        "Order Delivered",
        `Your order for ${itemName} has been delivered.`,
        "/profile?tab=purchases"
      );
    }

    res.status(200).json({ update: true, message: "Update successful"});

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// Shared by both delivery-confirmation routes below -- loads the order,
// confirms the caller is its buyer, and confirms it's actually waiting on
// them (delivered, and nobody's submitted a confirmation or dispute yet).
// Returns { order, docRef } on success, or null after already sending an
// error response.
async function loadOrderForBuyerConfirmation(req, res) {
  const docRef = db.collection("orders").doc(req.params.id);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    res.status(404).json({ success: false, message: "Order not found" });
    return null;
  }

  const order = docSnap.data();

  if (req.token.uid !== order.buyerId) {
    res.status(403).json({ success: false, message: "Only the buyer can do this" });
    return null;
  }

  if (order.fulfillmentStatus !== "delivered") {
    res.status(409).json({ success: false, message: "Order must be marked delivered first" });
    return null;
  }

  if (order.deliveryConfirmationStatus !== "required") {
    res.status(409).json({ success: false, message: `A response has already been submitted for this order (status: ${order.deliveryConfirmationStatus})` });
    return null;
  }

  return { order, docRef };
}

// Buyer confirms the order matches what they received -- rating + at least
// one photo, comment optional. Photos are uploaded client-side straight to
// Firebase Storage first (same pattern as authenticationRequests' proof
// photos); this route only ever receives the resulting URLs, never raw
// file bytes.
app.post("/api/orders/:id/delivery-confirmation", verifyAuth, async (req, res) => {
  try {
    const { rating, comment, photoUrls } = req.body;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be an integer between 1 and 5" });
    }
    if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
      return res.status(400).json({ success: false, message: "Upload at least one photo to continue" });
    }

    const loaded = await loadOrderForBuyerConfirmation(req, res);
    if (!loaded) return;
    const { order, docRef } = loaded;

    const orderId = req.params.id;

    // doc id = orderId, same idempotency reasoning as everywhere else in
    // this feature -- a retry after a partial failure overwrites the same
    // doc instead of risking a second one.
    await db.collection("deliveryConfirmations").doc(orderId).set({
      buyerId: order.buyerId,
      rating,
      comment: comment || null,
      photoUrls,
      status: "submitted",
      reviewedByUserId: null,
      reviewedAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await docRef.update({
      deliveryConfirmationStatus: "submitted",
      deliveryConfirmedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const itemName = order.item?.name || "your order";
    await createNotification(
      order.sellerId,
      "order_status",
      "Delivery Confirmed",
      `The buyer confirmed delivery for ${itemName}. Payout is pending review.`,
      "/profile?tab=selling"
    );

    return res.status(200).json({ success: true, message: "Thank you for your review!" });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Seller confirms an order at pending_authentication is ready for review by
// uploading photos -- at least one, same minimal bar as
// /delivery-confirmation above rather than the per-angle checklist the
// seller-listing authentication wizard uses, since this is a single
// already-known item, not a fresh listing certification (revisit if this
// turns out not to be enough evidence for admin to review against). Photos
// are uploaded client-side straight to Storage first, same pattern as
// everywhere else in this codebase -- this route only ever receives the
// resulting URLs. No admin notification yet -- that's step 6 of this
// feature's build order; step 4's review page queries submitted photos
// directly, same as the existing authentication-review.js does today.
const AUTHENTICATION_MIN_PHOTOS = 8;

app.post("/api/orders/:id/authentication-photos", verifyAuth, async (req, res) => {
  try {
    const { photoUrls } = req.body;

    if (!Array.isArray(photoUrls) || photoUrls.length < AUTHENTICATION_MIN_PHOTOS) {
      return res.status(400).json({ success: false, message: `Upload at least ${AUTHENTICATION_MIN_PHOTOS} photos to continue` });
    }

    const orderId = req.params.id;
    const docRef = db.collection("orders").doc(orderId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = docSnap.data();

    if (req.token.uid !== order.sellerId) {
      return res.status(403).json({ success: false, message: "Only the seller can do this" });
    }

    if (order.fulfillmentStatus !== "pending_authentication") {
      return res.status(409).json({ success: false, message: `Order is not awaiting authentication (status: ${order.fulfillmentStatus})` });
    }

    // doc id = orderId, same idempotent-upsert reasoning as
    // deliveryConfirmations above -- a retry after a partial failure
    // overwrites the same doc instead of risking a second one.
    await db.collection("orderAuthenticationPhotos").doc(orderId).set({
      sellerId: order.sellerId,
      photoUrls,
      status: "submitted",
      reviewedByUserId: null,
      reviewedAt: null,
      reviewerNotes: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({ success: true, message: "Photos submitted for authentication review." });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// order.subtotal is the buyer's FULL total (listing price + tax + marketplace
// fee combined -- see buildOrderDataFromPaymentIntent), not the seller's cut.
// order.shippingCost is always 0 going forward (the buyer is never charged
// for shipping -- a Hexxo prepaid label's cost is deducted from the seller's
// payout via a sellerDebts entry instead, see purchaseShippingLabel's caller).
// It's still backed out here for orders placed before that change, where
// shipping genuinely was part of the buyer's subtotal. There's no
// listingPrice field stored directly, so it has to be derived: subtract
// shipping/tax/fee back out to recover the listing price, then subtract the
// fee once more for the platform's cut. Computed in cents throughout to
// avoid float drift on currency math.
function calculateSellerPayoutCents(order) {
  const toCents = (v) => Math.round(parseFloat(v || 0) * 100);

  const subtotalCents = toCents(order.subtotal);
  const shippingCents = toCents(order.shippingCost);
  const salesTaxCents = toCents(order.item?.salesTax);
  const marketplaceFeeCents = toCents(order.item?.marketplaceFee);

  const listingPriceCents = subtotalCents - shippingCents - salesTaxCents - marketplaceFeeCents;
  return listingPriceCents - marketplaceFeeCents;
}

// Reads a seller's outstanding debts (e.g. return-shipping costs charged
// from an upheld dispute -- see /api/orders/:id/dispute/uphold) without
// writing anything yet. No orderBy in the query -- would need a composite
// index alongside the status equality filter, and at the volume a single
// seller could realistically have outstanding, sorting client-side is fine
// (same reasoning already used elsewhere in this codebase for order lists).
async function getOutstandingSellerDebts(sellerId) {
  const debtsSnap = await db.collection("sellerDebts")
    .where("sellerId", "==", sellerId)
    .where("status", "==", "outstanding")
    .get();

  const debts = debtsSnap.docs
    .map((d) => ({ ref: d.ref, ...d.data() }))
    .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));

  const totalCents = debts.reduce((sum, d) => sum + Math.round(parseFloat(d.remainingAmount) * 100), 0);
  return { debts, totalCents };
}

// Applies `amountCents` across the given debts, oldest first, partially
// settling one if it doesn't divide evenly. Only ever called once the
// corresponding money movement (or debt-absorption) is confirmed -- never
// speculatively, so a failed transfer never settles debt for money that
// didn't actually move.
async function settleSellerDebts(debts, amountCents) {
  let remaining = amountCents;
  const batch = db.batch();

  for (const debt of debts) {
    if (remaining <= 0) break;

    const debtRemainingCents = Math.round(parseFloat(debt.remainingAmount) * 100);
    const applyCents = Math.min(remaining, debtRemainingCents);
    remaining -= applyCents;

    const newRemainingCents = debtRemainingCents - applyCents;
    batch.update(debt.ref, {
      remainingAmount: (newRemainingCents / 100).toFixed(2),
      status: newRemainingCents === 0 ? "settled" : "outstanding",
      settledAt: newRemainingCents === 0 ? admin.firestore.FieldValue.serverTimestamp() : null
    });
  }

  await batch.commit();
}

// Attempts the actual transfer to the seller's Connect account and records
// the outcome on a payouts/{orderId} doc. Created lazily here, at the
// moment a release is actually attempted -- not eagerly when the order is
// delivered -- since before this point "held" is fully expressed by
// Orders.deliveryConfirmationStatus alone. Failure here doesn't throw: a
// seller with an unfinished Connect account is an expected, retriable
// case, not a 500.
async function releasePayoutToSeller(order, orderId) {
  const payoutRef = db.collection("payouts").doc(orderId);
  const grossAmountCents = calculateSellerPayoutCents(order);

  const { debts, totalCents: outstandingDebtCents } = await getOutstandingSellerDebts(order.sellerId);
  const debtAppliedCents = Math.min(grossAmountCents, outstandingDebtCents);
  const netAmountCents = grossAmountCents - debtAppliedCents;
  const debtApplied = (debtAppliedCents / 100).toFixed(2);

  // Outstanding debt covers the whole payout -- nothing left to actually
  // send, so there's no Stripe call to make and no failure mode to retry.
  // Safe to settle immediately since this doesn't depend on an external
  // system succeeding.
  if (netAmountCents === 0) {
    await settleSellerDebts(debts, debtAppliedCents);
    const absorbed = {
      orderId,
      sellerId: order.sellerId,
      amount: "0.00",
      debtApplied,
      status: "absorbed_by_debt",
      stripeTransferId: null,
      payoutHoldReason: null,
      lastError: null,
      attemptedAt: admin.firestore.FieldValue.serverTimestamp(),
      transferredAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await payoutRef.set(absorbed);
    return absorbed;
  }

  const sellerSnap = await db.collection("userProfiles").doc(order.sellerId).get();
  const seller = sellerSnap.data() || {};

  if (!seller.stripeConnectAccountId || !seller.connectPayoutsEnabled) {
    const failure = {
      orderId,
      sellerId: order.sellerId,
      amount: (netAmountCents / 100).toFixed(2),
      debtApplied,
      status: "failed",
      stripeTransferId: null,
      payoutHoldReason: "connect_account_not_ready",
      lastError: null,
      attemptedAt: admin.firestore.FieldValue.serverTimestamp(),
      transferredAt: null
    };
    await payoutRef.set(failure);
    return failure;
  }

  try {
    const transfer = await stripe.transfers.create({
      amount: netAmountCents,
      currency: "usd",
      destination: seller.stripeConnectAccountId
    });

    // Only settle once the transfer is confirmed -- if this had thrown
    // instead, the debt has to stay outstanding for the next attempt.
    await settleSellerDebts(debts, debtAppliedCents);

    const success = {
      orderId,
      sellerId: order.sellerId,
      amount: (netAmountCents / 100).toFixed(2),
      debtApplied,
      status: "transferred",
      stripeTransferId: transfer.id,
      payoutHoldReason: null,
      lastError: null,
      attemptedAt: admin.firestore.FieldValue.serverTimestamp(),
      transferredAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await payoutRef.set(success);
    return success;

  } catch (stripeError) {
    const failure = {
      orderId,
      sellerId: order.sellerId,
      amount: (netAmountCents / 100).toFixed(2),
      debtApplied,
      status: "failed",
      stripeTransferId: null,
      payoutHoldReason: "stripe_error",
      lastError: stripeError.message,
      attemptedAt: admin.firestore.FieldValue.serverTimestamp(),
      transferredAt: null
    };
    await payoutRef.set(failure);
    return failure;
  }
}

// Server-mediated on purpose, not a direct client Firestore query like
// authentication-review.js uses for its own list -- `orders` deliberately
// has no Firestore rule at all (default-deny) because it carries buyer PII
// (email, shipping address), the same reasoning behind every
// /api/*-history, *-summary, and by-payment-intent endpoint elsewhere in
// this file. Joins the matching deliveryConfirmations doc per order (same
// doc id, so it's a direct get() rather than a second query) to attach
// rating/comment/photoUrls without exposing the rest of the order.
app.get("/api/admin/delivery-confirmations", verifyAuth, async (req, res) => {
  try {
    if (req.token.admin !== true) {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    const ordersSnap = await db.collection("orders")
      .where("deliveryConfirmationStatus", "==", "submitted")
      .get();

    const items = await Promise.all(ordersSnap.docs.map(async (orderDoc) => {
      const order = orderDoc.data();
      const confirmationSnap = await db.collection("deliveryConfirmations").doc(orderDoc.id).get();
      const confirmation = confirmationSnap.data() || {};

      return {
        orderId: orderDoc.id,
        itemName: order.item?.name || "Item",
        buyerId: order.buyerId,
        buyerEmail: order.buyerEmail || null,
        rating: confirmation.rating,
        comment: confirmation.comment,
        photoUrls: confirmation.photoUrls || [],
        // No automated delivery webhook exists for ShipStation on our plan
        // (see project notes) -- surfacing these lets admin manually check
        // the carrier's own tracking page before approving payout.
        trackingNumber: order.trackingNumber || null,
        shippingCarrier: order.shippingCarrier || null,
        // Plain millis, not the raw Firestore Timestamp -- res.json() doesn't
        // serialize that back into something toDate()-able on the other end.
        submittedAt: confirmation.updatedAt?.toDate?.().getTime() || null
      };
    }));

    return res.status(200).json({ success: true, items });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Same server-mediated reasoning as the confirmations list above -- joins
// orders + disputes (same doc id) instead of a direct client Firestore
// query, since orders carries PII.
app.get("/api/admin/disputes", verifyAuth, async (req, res) => {
  try {
    if (req.token.admin !== true) {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    const ordersSnap = await db.collection("orders")
      .where("deliveryConfirmationStatus", "==", "disputed")
      .get();

    const items = await Promise.all(ordersSnap.docs.map(async (orderDoc) => {
      const order = orderDoc.data();
      const disputeSnap = await db.collection("disputes").doc(orderDoc.id).get();
      const dispute = disputeSnap.data() || {};

      // Only surface disputes still actually waiting on a decision -- an
      // order can sit at deliveryConfirmationStatus "disputed" forever
      // (it's not advanced by resolution, unlike the confirmation path),
      // so the dispute doc's own status is what tells submitted apart from
      // already-resolved.
      if (dispute.status !== "submitted") return null;

      return {
        orderId: orderDoc.id,
        itemName: order.item?.name || "Item",
        buyerId: order.buyerId,
        buyerEmail: order.buyerEmail || null,
        saleAmount: dispute.saleAmount,
        comment: dispute.comment,
        photoUrls: dispute.photoUrls || [],
        trackingNumber: order.trackingNumber || null,
        shippingCarrier: order.shippingCarrier || null,
        submittedAt: dispute.createdAt?.toDate?.().getTime() || null
      };
    }));

    return res.status(200).json({ success: true, items: items.filter(Boolean) });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Same server-mediated reasoning as the two lists above -- orders carries
// PII, so this joins orders + orderAuthenticationPhotos server-side instead
// of a direct client query. Primary source is orders at
// pending_authentication; an order that hasn't had photos submitted yet is
// correctly excluded by filtering out anything whose joined doc isn't
// "submitted" (same pattern as the disputes list above).
app.get("/api/admin/order-authentications", verifyAuth, async (req, res) => {
  try {
    if (req.token.admin !== true) {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    const ordersSnap = await db.collection("orders")
      .where("fulfillmentStatus", "==", "pending_authentication")
      .get();

    const items = (await Promise.all(ordersSnap.docs.map(async (orderDoc) => {
      const order = orderDoc.data();
      const photosSnap = await db.collection("orderAuthenticationPhotos").doc(orderDoc.id).get();
      const photos = photosSnap.data();

      if (!photos || photos.status !== "submitted") return null;

      return {
        orderId: orderDoc.id,
        itemName: order.item?.name || "Item",
        itemBrand: order.item?.brand || null,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        subtotal: order.subtotal,
        photoUrls: photos.photoUrls || [],
        submittedAt: photos.updatedAt?.toDate?.().getTime() || null
      };
    }))).filter(Boolean);

    return res.status(200).json({ success: true, items });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

const ORDER_AUTHENTICATION_DECISIONS = ["passed", "failed"];

// orderId here is the orders collection's Firestore doc id (matches every
// other /api/orders/:id/... route's convention) -- NOT the same as
// order.id, which is the Stripe PaymentIntent id and is what the capture/
// cancel calls below actually need (same distinction dispute/uphold's
// stripe.refunds.create({ payment_intent: order.id }) already relies on).
app.post("/api/admin/order-authentications/:orderId/decision", verifyAuth, async (req, res) => {
  const orderId = req.params.orderId;
  const { decision, reviewerNotes } = req.body;

  if (!ORDER_AUTHENTICATION_DECISIONS.includes(decision)) {
    return res.status(400).json({ success: false, message: `decision must be one of: ${ORDER_AUTHENTICATION_DECISIONS.join(", ")}` });
  }

  try {
    if (req.token.admin !== true) {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orderSnap.data();

    if (order.fulfillmentStatus !== "pending_authentication") {
      return res.status(409).json({ success: false, message: `Order is not awaiting an authentication decision (status: ${order.fulfillmentStatus})` });
    }

    const photosRef = db.collection("orderAuthenticationPhotos").doc(orderId);
    const photosSnap = await photosRef.get();

    if (!photosSnap.exists || photosSnap.data().status !== "submitted") {
      return res.status(409).json({ success: false, message: "No submitted photos to review for this order" });
    }

    const itemName = order.item?.name || "your item";

    if (decision === "passed") {
      // Triggers the existing payment_intent.succeeded webhook unchanged --
      // that's what actually flips fulfillmentStatus to "processing",
      // records the tax transaction, bumps listing sale stats, AND already
      // purchases a real EasyShip label unconditionally for prepaid-shipping
      // listings (purchaseShippingLabel, called from inside that same
      // webhook) -- none of that is duplicated here. authenticationStatus is
      // set directly here (not left to the webhook) so the seller's
      // certificate link can appear immediately without racing it.
      await stripe.paymentIntents.capture(order.id);

      await orderRef.update({
        authenticationStatus: "passed",
        authenticationDecidedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      await createNotification(
        order.buyerId,
        "order_status",
        "Authentication Passed",
        `Good news -- ${itemName} passed authentication and is being prepared for shipment.`,
        "/profile?tab=purchases"
      );
    } else {
      // Zero-tolerance: void the authorization hold outright, no refund
      // object needed since nothing was ever captured. Nothing listens for
      // payment_intent.canceled, so fulfillmentStatus is set directly here
      // -- same reasoning as dispute/uphold setting "refunded" directly
      // rather than waiting on a webhook.
      await stripe.paymentIntents.cancel(order.id);

      await orderRef.update({
        fulfillmentStatus: "cancelled",
        authenticationStatus: "failed",
        authenticationDecidedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      await createNotification(
        order.buyerId,
        "order_status",
        "Authentication Failed",
        `${itemName} did not pass authentication. Your order has been cancelled and the authorization on your card has been released -- you were never charged.`,
        "/profile?tab=purchases"
      );
    }

    await photosRef.update({
      status: decision,
      reviewerNotes: reviewerNotes || null,
      reviewedByUserId: req.token.uid,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Shared by every successful-payout-outcome call site (initial release,
// dispute-reject, and the retry endpoint) -- "succeeded" covers both an
// actual transfer and a payout fully absorbed by outstanding debt, since
// neither needs the retriable-failure handling each caller does
// differently for its own "first attempt" vs "retry" framing.
async function notifySellerPayoutSucceeded(order, payout) {
  const itemName = order.item?.name || "your order";

  if (payout.status === "absorbed_by_debt") {
    await createNotification(
      order.sellerId,
      "order_status",
      "Payout Applied to Balance Owed",
      `Your $${payout.debtApplied} payout for ${itemName} was fully applied to an outstanding return-shipping charge. No funds were transferred this time.`,
      "/profile?tab=selling"
    );
    return;
  }

  const debtNote = Number(payout.debtApplied) > 0 ? ` ($${payout.debtApplied} was deducted for a prior return-shipping charge)` : "";
  await createNotification(
    order.sellerId,
    "order_status",
    "Payout Released",
    `Your payout of $${payout.amount} for ${itemName} has been sent.${debtNote}`,
    "/profile?tab=selling"
  );
}

// Rolls a delivery confirmation's rating into the seller's public-profile
// stats (running average + count + per-star breakdown) once that
// confirmation is fully admin-reviewed and confirmed good -- direct
// approval, or a dispute resolved in the seller's favor (both call this via
// approveDeliveryAndReleasePayout below). Deliberately never called from
// dispute/uphold: whether a refunded, upheld-dispute order's original
// rating should still count against the seller is a separate, more
// contestable call than "aggregate ratings exist at all," left for a later
// decision instead of assumed here.
async function applyDeliveryRatingToSellerProfile(sellerId, orderId) {
  const confirmationSnap = await db.collection("deliveryConfirmations").doc(orderId).get();
  const rating = confirmationSnap.data()?.rating;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return;

  const profileRef = db.collection("userProfiles").doc(sellerId);

  await db.runTransaction(async (tx) => {
    const profileSnap = await tx.get(profileRef);
    if (!profileSnap.exists) return;

    const profile = profileSnap.data();
    const metrics = profile.ratings?.metrics || { averageRating: 0, totalRatings: 0 };
    const ratingCount = profile.ratings?.ratingCount || {};

    const newTotal = metrics.totalRatings + 1;
    // Rounded here (the one place this is computed) rather than left as a
    // raw repeating-decimal float -- product.js/sellerProfile.js/reviews.js
    // all just display stats.rating directly, no formatting of their own.
    const newAverage = parseFloat(
      (((metrics.averageRating * metrics.totalRatings) + rating) / newTotal).toFixed(1)
    );

    tx.update(profileRef, {
      "ratings.metrics.totalRatings": newTotal,
      "ratings.metrics.averageRating": newAverage,
      [`ratings.ratingCount.${rating}`]: (ratingCount[rating] || 0) + 1,
      "stats.rating": newAverage,
    });
  });
}

// Shared by the approve endpoint below and the dispute-reject endpoint --
// both end the same way: deliveryConfirmationStatus -> "approved", attempt
// the payout, notify the seller either way. Advances regardless of whether
// the payout itself succeeds; a stalled transfer is a retriable ops
// problem (see the retry endpoints), not a reason to leave the record
// stuck mid-review.
async function approveDeliveryAndReleasePayout(order, orderId, docRef) {
  await docRef.update({
    deliveryConfirmationStatus: "approved",
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Best-effort, same reasoning as the tax-transaction record and admin
  // notifications elsewhere in this file -- a rating-aggregation failure
  // shouldn't block the actual payout, which is the critical path here.
  await applyDeliveryRatingToSellerProfile(order.sellerId, orderId).catch((error) => {
    console.error(`Failed to apply delivery rating to seller profile for order ${orderId}:`, error);
  });

  const payout = await releasePayoutToSeller(order, orderId);
  const itemName = order.item?.name || "your order";

  if (payout.status === "transferred" || payout.status === "absorbed_by_debt") {
    await notifySellerPayoutSucceeded(order, payout);
  } else {
    console.error(`payout for order ${orderId} failed to release: ${payout.payoutHoldReason}${payout.lastError ? ` (${payout.lastError})` : ""}`);

    // connect_account_not_ready is actionable by the seller (finish
    // onboarding and it'll resolve itself on retry); stripe_error is not
    // -- an insufficient-balance or API failure is an ops problem, not
    // something telling the seller to "fix their account" would help.
    const notification = payout.payoutHoldReason === "connect_account_not_ready"
      ? {
          title: "Payout Setup Needed",
          message: `Complete your seller payout setup to receive your $${payout.amount} payment for ${itemName}.`
        }
      : {
          title: "Payout Delayed",
          message: `Your $${payout.amount} payout for ${itemName} is delayed. Our team has been notified and is looking into it.`
        };

    await createNotification(
      order.sellerId,
      "order_status",
      notification.title,
      notification.message,
      "/profile?tab=selling"
    );
  }

  return payout;
}

// Admin/support approves a buyer's submitted delivery confirmation. This is
// deliberately separate from resolving a dispute (disputed -> upheld/
// rejected below) -- that's a different review queue with a refund path
// as one of its two outcomes, not just a payout.
app.post("/api/orders/:id/delivery-confirmation/approve", verifyAuth, async (req, res) => {
  try {
    if (req.token.admin !== true) {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    const orderId = req.params.id;
    const docRef = db.collection("orders").doc(orderId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = docSnap.data();

    if (order.deliveryConfirmationStatus !== "submitted") {
      return res.status(409).json({ success: false, message: `Cannot approve from status "${order.deliveryConfirmationStatus}"` });
    }

    await db.collection("deliveryConfirmations").doc(orderId).update({
      status: "approved",
      reviewedByUserId: req.token.uid,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const payout = await approveDeliveryAndReleasePayout(order, orderId, docRef);

    return res.status(200).json({ success: true, payout });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Once deliveryConfirmationStatus reaches "approved" it's terminal for the
// approve endpoint above -- it can't be called again to try the transfer a
// second time. This is the only way a failed payout (e.g. seller finished
// Connect onboarding after the first attempt) gets moving again. Server-
// mediated for the same PII reason as the list endpoint below.
app.get("/api/admin/failed-payouts", verifyAuth, async (req, res) => {
  try {
    if (req.token.admin !== true) {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    const payoutsSnap = await db.collection("payouts")
      .where("status", "==", "failed")
      .get();

    const items = await Promise.all(payoutsSnap.docs.map(async (payoutDoc) => {
      const payout = payoutDoc.data();
      const orderSnap = await db.collection("orders").doc(payoutDoc.id).get();
      const order = orderSnap.data() || {};

      return {
        orderId: payoutDoc.id,
        itemName: order.item?.name || "Item",
        buyerId: order.buyerId,
        sellerId: payout.sellerId,
        amount: payout.amount,
        payoutHoldReason: payout.payoutHoldReason,
        lastError: payout.lastError,
        attemptedAt: payout.attemptedAt?.toDate?.().getTime() || null
      };
    }));

    return res.status(200).json({ success: true, items });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Re-runs releasePayoutToSeller for an order whose payout previously failed
// -- same function the approve endpoint calls, just callable again without
// needing deliveryConfirmationStatus to still be "submitted".
app.post("/api/orders/:id/payout/retry", verifyAuth, async (req, res) => {
  try {
    if (req.token.admin !== true) {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    const orderId = req.params.id;
    const [orderSnap, payoutSnap] = await Promise.all([
      db.collection("orders").doc(orderId).get(),
      db.collection("payouts").doc(orderId).get()
    ]);

    if (!orderSnap.exists) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (!payoutSnap.exists || payoutSnap.data().status !== "failed") {
      return res.status(409).json({ success: false, message: "No failed payout to retry for this order" });
    }

    const order = orderSnap.data();
    const payout = await releasePayoutToSeller(order, orderId);

    if (payout.status === "transferred" || payout.status === "absorbed_by_debt") {
      await notifySellerPayoutSucceeded(order, payout);
    } else {
      // Already notified once on the original failure -- avoid re-notifying
      // the seller on every retry attempt that still fails, just log it.
      console.error(`payout retry for order ${orderId} failed again: ${payout.payoutHoldReason}${payout.lastError ? ` (${payout.lastError})` : ""}`);
    }

    return res.status(200).json({ success: true, payout });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Buyer reports a problem instead of confirming -- separate from the review
// path above (no rating; the comment carries the signal since there isn't
// one), goes to admin review with the payout still on hold rather than a
// star rating being auto-approved.
app.post("/api/orders/:id/dispute", verifyAuth, async (req, res) => {
  try {
    const { comment, photoUrls } = req.body;

    if (!comment || typeof comment !== "string" || !comment.trim()) {
      return res.status(400).json({ success: false, message: "Describe the problem to continue" });
    }
    if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
      return res.status(400).json({ success: false, message: "Upload at least one photo to continue" });
    }

    const loaded = await loadOrderForBuyerConfirmation(req, res);
    if (!loaded) return;
    const { order, docRef } = loaded;

    const orderId = req.params.id;

    // Snapshotted at report time -- this is meant to stand on its own as a
    // support/audit record even if the order itself changes state later.
    await db.collection("disputes").doc(orderId).set({
      orderId,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      listingId: order.listingId || null,
      saleAmount: order.subtotal || null,
      comment: comment.trim(),
      photoUrls,
      status: "submitted",
      reviewedByUserId: null,
      reviewedAt: null,
      refundId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await docRef.update({
      deliveryConfirmationStatus: "disputed",
      deliveryConfirmedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const itemName = order.item?.name || "your order";
    await createNotification(
      order.sellerId,
      "order_status",
      "Problem Reported",
      `The buyer reported a problem with ${itemName}. Our team will review it.`,
      "/profile?tab=selling"
    );

    return res.status(200).json({ success: true, message: "Thank you! Our support team will review the problem and email you on the next step." });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Shared by both dispute-resolution endpoints below -- loads the order and
// its dispute doc, confirms the caller is admin, and confirms there's
// actually a submitted dispute waiting on a decision.
async function loadDisputeForResolution(req, res) {
  const orderId = req.params.id;

  if (req.token.admin !== true) {
    res.status(403).json({ success: false, message: "Admin only" });
    return null;
  }

  const docRef = db.collection("orders").doc(orderId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    res.status(404).json({ success: false, message: "Order not found" });
    return null;
  }

  const order = docSnap.data();

  if (order.deliveryConfirmationStatus !== "disputed") {
    res.status(409).json({ success: false, message: `Cannot resolve a dispute from status "${order.deliveryConfirmationStatus}"` });
    return null;
  }

  const disputeRef = db.collection("disputes").doc(orderId);
  const disputeSnap = await disputeRef.get();

  if (!disputeSnap.exists || disputeSnap.data().status !== "submitted") {
    res.status(409).json({ success: false, message: "No submitted dispute to resolve for this order" });
    return null;
  }

  return { order, orderId, docRef, disputeRef };
}

// Admin sides with the buyer -- refunds the full original charge and closes
// the order out with no payout. Safe to refund the whole PaymentIntent:
// separate charges & transfers means nothing has been sent to the seller
// for a disputed order yet, the full amount is still sitting in Hexxo's own
// Stripe balance.
app.post("/api/orders/:id/dispute/uphold", verifyAuth, async (req, res) => {
  try {
    const { returnShippingCost } = req.body;

    if (typeof returnShippingCost !== "number" || !Number.isFinite(returnShippingCost) || returnShippingCost < 0) {
      return res.status(400).json({ success: false, message: "returnShippingCost must be a non-negative number" });
    }

    const loaded = await loadDisputeForResolution(req, res);
    if (!loaded) return;
    const { order, orderId, docRef, disputeRef } = loaded;

    const refund = await stripe.refunds.create({ payment_intent: order.id });

    await disputeRef.update({
      status: "upheld",
      reviewedByUserId: req.token.uid,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      refundId: refund.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // deliveryConfirmationStatus stays "disputed" -- it marks which path
    // this order took, not the money outcome. fulfillmentStatus carries the
    // outcome instead, so the two concerns don't get overloaded onto one
    // field (same reasoning as keeping payoutHoldReason off Orders entirely
    // back when the data model was designed).
    await docRef.update({
      fulfillmentStatus: "refunded",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // No real courier-rate integration for return shipping yet (would need
    // parcel dimensions this app doesn't capture anywhere at listing
    // creation) -- admin enters the cost manually here instead. Only
    // recorded as debt if actually > 0, so a dispute upheld with no return
    // shipment involved doesn't leave a pointless $0 ledger entry.
    if (returnShippingCost > 0) {
      await db.collection("sellerDebts").doc(orderId).set({
        sellerId: order.sellerId,
        orderId,
        reason: "return_shipping",
        amount: returnShippingCost.toFixed(2),
        remainingAmount: returnShippingCost.toFixed(2),
        status: "outstanding",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        settledAt: null
      });
    }

    const itemName = order.item?.name || "your order";

    await createNotification(
      order.buyerId,
      "order_status",
      "Refund Processed",
      `Your refund for ${itemName} is being processed and should appear in 5-10 business days.`,
      "/profile?tab=purchases"
    );

    const sellerMessage = returnShippingCost > 0
      ? `${itemName} was found not as described. The item will be shipped back to you at your cost -- $${returnShippingCost.toFixed(2)} for return shipping will be deducted from your next payout.`
      : `A reported problem with ${itemName} was upheld. The buyer has been refunded and no payout will be issued for this order.`;

    await createNotification(
      order.sellerId,
      "order_status",
      "Dispute Upheld",
      sellerMessage,
      "/profile?tab=selling"
    );

    return res.status(200).json({ success: true, refund: { id: refund.id, status: refund.status } });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Admin sides with the seller -- releases the payout exactly as if the
// buyer had approved a normal delivery confirmation, via the same shared
// helper the approve endpoint uses.
app.post("/api/orders/:id/dispute/reject", verifyAuth, async (req, res) => {
  try {
    const loaded = await loadDisputeForResolution(req, res);
    if (!loaded) return;
    const { order, orderId, docRef, disputeRef } = loaded;

    await disputeRef.update({
      status: "rejected",
      reviewedByUserId: req.token.uid,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const payout = await approveDeliveryAndReleasePayout(order, orderId, docRef);

    const itemName = order.item?.name || "your order";
    await createNotification(
      order.buyerId,
      "order_status",
      "Dispute Reviewed",
      `Your reported issue for ${itemName} was reviewed. The seller's payout has been released.`,
      "/profile?tab=purchases"
    );

    return res.status(200).json({ success: true, payout });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// delete entire product
app.delete("/products/:id", verifyAuth, async (req, res) => {
    const docId = req.params.id;

    try {
      const docRef = await db.collection("listings").doc(docId).get();
      if (!docRef.exists) return res.status(404).json({ success: false, message: "No document found!"});

      if (req.token.uid === docRef.data().userId) {
        const images = docRef.data().images;
        await Promise.all(images.map(image => 
          admin.storage().bucket().file(image.path).delete()
        ));

        await db.collection("listings").doc(docId).delete();

        return res.status(200).json({success: true, message: "Document successfully deleted"})
      } else {
        return res.status(403).json({ success: false, message: "Not authorize"})
      }
    } catch (error) {
      return res.status(500).json({success: false, message: error.message })
    }
});

app.delete("/orders/:id", verifyAuth, async (req, res) => {
  try {
    const docId = req.params.id;
    const { reason } = req.body || {};

    const docRef = await db.collection("orders").doc(docId).get();
    if (!docRef.exists) {
      return res.status(404).json({ success: false, message: "Document not found!" });
    }

    const order = docRef.data();

    const isBuyer = req.token.uid === order.buyerId;
    const isSeller = req.token.uid === order.sellerId;
    const isAdmin = req.token.admin === true;

    if (isBuyer || isSeller || isAdmin) {
      // Cancellation is only meaningful before the item has actually shipped
      // -- once it's shipped/delivered/already cancelled, "cancel" no longer
      // makes sense as an action.
      const cancellable = ['pending', 'processing'];
      const isCancellable = cancellable.includes(order.fulfillmentStatus);

      if (isCancellable) {
        const cancelledBy = isAdmin ? "admin" : isSeller ? "seller" : "buyer";

        await docRef.ref.update({
          fulfillmentStatus: "cancelled",
          cancelledBy,
          ...(isAdmin && reason ? { cancellationReason: reason } : {}),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })

        const itemName = order.item?.name || "your item";
        const message = isAdmin && reason
          ? `Your order for ${itemName} was cancelled by support: ${reason}`
          : `Your order for ${itemName} was cancelled.`;

        await createNotification(
          order.buyerId,
          "order_status",
          "Order Cancelled",
          message,
          "/profile?tab=purchases"
        );

        return res.status(200).json({ success: true, message: "Order has been cancelled!" })
      }

       return res.status(409).json({ success: false, message: "Order is locked!" })

    } else {
      return res.status(403).json({success: false, message: "Role type not found!" })
    }

  } catch (err) {
    res.status(500).json({success: false, message: `Internal server error: ${err.message}`})
  }
})

app.get('/countries', async (req, res) => {
    try {
      const response = await fetch('https://countriesnow.space/api/v0.1/countries');
      const data = await response.json();
      return res.json(data)
    } catch (error) {
      res.status(500).json({request: false, errMsg: error.message})
    }
})

app.get('/states', async (req, res) => {
  try {
    const response = await fetch('https://countriesnow.space/api/v0.1/countries/states');
      
      const states = await response.json();
      return res.json(states)
  } catch (error) {
    res.status(500).json({request: fail, errMsg: error.message})
  }
  
})



// checkout
app.post("/create-checkout-session", async (req, res) => {
  const { priceData } = req.body;
  console.log("session data:", priceData)
  try {
    const item = priceData[0];
    const isAuthPayment = item.itemType === 'authentication';

    // Mandatory, not a buyer choice -- authentication triggers purely off
    // server-recomputed eligibility. item.authenticationRequested (or any
    // other client-sent flag) is never consulted here: a buyer sending a
    // manipulated request to skip mandatory authentication on a genuinely
    // eligible item must not be able to, so this can't depend on anything
    // the client provides, not even as one half of an AND.
    let authenticationRequested = false;
    if (!isAuthPayment && item.listingId) {
      const listingSnap = await db.collection("listings").doc(item.listingId).get();
      const listing = listingSnap.data();
      authenticationRequested = !!listing && isAuthenticationEligible(listing);
    }

    // Authentication payments carry no seller/listing/shipping -- tagging
    // item_type here is what lets the webhook branch to the
    // authenticationRequests update instead of creating an `orders` doc.
    const metadata = isAuthPayment
      ? {
          item_type: 'authentication',
          buyer_id: item.buyerId,
          buyer_email: item.buyerEmail,
          auth_request_id: item.authRequestId,
          item: JSON.stringify({
            name: item.productName,
            category: item.category,
            tier: item.tier?.name,
            cost: item.cost
          })
        }
      : {
          buyer_id: item.buyerId,
          buyer_email: item.buyerEmail,
          seller_id: item.sellerId,
          listing_id: item.listingId,
          // Always 0 -- the buyer is never charged for shipping (see
          // /order-summary and /tax/calculate). A Hexxo prepaid label's cost
          // is deducted from the seller's payout instead, via the
          // sellerDebts entry purchaseShippingLabel creates.
          shipping_cost: 0,
          shipping_from: item.shippingFrom,
          authentication_requested: String(authenticationRequested),
          item: JSON.stringify({
            name: item.productName,
            size: item.size,
            brand: item.brand,
            image: item.image,
            salesTax: parseFloat(item.salesTax),
            marketplaceFee: parseFloat(item.marketplaceFee)
          })
        };

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(item.price * 100),
      currency: 'usd',
      payment_method_types: ['card'],
      // Authentication-opted orders authorize the card without capturing --
      // money only actually moves once admin passes the item (capture) or
      // never at all if it fails (cancel/void). Normal purchases keep
      // capturing immediately, unchanged.
      ...(authenticationRequested ? { capture_method: 'manual' } : {}),
      metadata,
    });

    res.json({ clientSecret: paymentIntent.client_secret })
  } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

app.get('/checkout/session', async (req, res) => {
    const { sessionId } = req.query;
    console.log('session id:', sessionId);

    let isPaid = false;

    try{
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      isPaid = session.payment_status === 'paid';

      if(!isPaid) {
        return res.status(400).json( {status: "unpaid"} )
      }

      return res.json({
        id: session.id,
        orderDate: session.created,
        email: session.customer_email,
        shippingAddress: session.shipping_details,
        shippingCost: session.shipping_cost,
        subtotalAmount: session.amount_subtotal,
      })

    } catch (error)  {
      res.status(500).json({error: "Interval server error" })
    }
    
})

app.post("/order-summary", verifyAuth, async(req, res) => {
    const { listingId, authRequestId } = req.body;
    // console.log('id', listingId)

    try {
      // Authentication requests are a flat tier-cost service fee -- no
      // seller, no shipping, no marketplace fee, so this is its own branch
      // rather than shoehorning it into the listing-priced math below.
      if (authRequestId) {
        const requestRef = await db.collection("authenticationRequests").doc(authRequestId).get();

        if (!requestRef.exists) {
          return res.status(404).json({ success: false, message: "Authentication request not found" });
        }

        const request = requestRef.data();

        if (request.userId !== req.token.uid) {
          return res.status(403).json({ success: false, message: "Not authorized for this request" });
        }

        const cost = request.tierSelection?.cost ?? request.price ?? 0;

        return res.status(200).json({
          marketplaceFee: 0,
          price: cost,
          tax: 0,
          delivery: 0,
          total: parseFloat(cost.toFixed(2))
        });
      }

      const docRef = await db.collection("listings").doc(listingId).get();
      const listing = docRef.data();
      // console.log("listingData:", listing)

      // Same guard as /listings/:id/offers -- a buyer can't purchase their
      // own listing.
      if (listing.userId === req.token.uid) {
        return res.status(400).json({ success: false, message: "You can't purchase your own listing" });
      }

      const marketplaceFee = MARKETPLACE_FEE_RATE * listing.listingPrice;

      // A Hexxo prepaid label's courier rate is a seller cost, not a buyer
      // one -- it's deducted from the seller's payout (see the sellerDebts
      // entry purchaseShippingLabel creates), never added to what the buyer
      // pays. Self-ship listings were already free to the buyer, so this
      // just makes both paths consistent: delivery is always 0 here.
      const delivery = 0;

      // Real tax depends on the buyer's destination address, which isn't
      // known yet at this point in the flow -- /tax/calculate fills it in
      // once the buyer enters a shipping address on the checkout page.
      return res.status(200).json({
        marketplaceFee: marketplaceFee.toFixed(2),
        price: listing.listingPrice,
        tax: "0.00",
        taxPending: true,
        delivery: delivery,
        total: parseFloat((marketplaceFee + delivery + listing.listingPrice).toFixed(2)),
        authenticationEligible: isAuthenticationEligible(listing),
        authenticated: !!listing.authenticated
      })

    } catch (error) {
      res.status(500).json({success: false, message: `Internal server error: ${error.message}`})
    }
})

// Called once the buyer completes the shipping AddressElement on checkout.
// Recomputes tax off the item price only (never shipping/marketplace fee,
// per policy) and pushes the corrected amount onto the PaymentIntent that
// /create-checkout-session already made, so the mounted Payment Element can
// pick it up via elements.fetchUpdates() before the buyer submits payment.
app.post("/tax/calculate", verifyAuth, async (req, res) => {
  const { paymentIntentId, listingId, address, name, phone } = req.body;

  if (!paymentIntentId || !listingId || !address) {
    return res.status(400).json({ success: false, message: "paymentIntentId, listingId, and address are required" });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.metadata.buyer_id !== req.token.uid) {
      return res.status(403).json({ success: false, message: "Not authorized for this payment" });
    }

    // Recomputed server-side from the listing doc -- never trust a
    // client-supplied price for the tax base.
    const docRef = await db.collection("listings").doc(listingId).get();
    const listing = docRef.data();

    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    // Same guard as /order-summary -- belt-and-suspenders in case this ever
    // gets reached without going through the summary step first.
    if (listing.userId === req.token.uid) {
      return res.status(400).json({ success: false, message: "You can't purchase your own listing" });
    }

    const marketplaceFee = MARKETPLACE_FEE_RATE * listing.listingPrice;

    // Same reasoning as /order-summary -- the buyer never pays the courier
    // rate, so this stays 0 regardless of shipping method.
    const delivery = 0;

    const calculation = await stripe.tax.calculations.create({
      currency: 'usd',
      line_items: [{
        amount: Math.round(listing.listingPrice * 100),
        reference: listingId,
        tax_behavior: 'exclusive',
        tax_code: 'txcd_99999999'
      }],
      customer_details: {
        address: {
          line1: address.line1,
          line2: address.line2 || undefined,
          city: address.city,
          state: address.state,
          postal_code: address.postal_code,
          country: address.country
        },
        address_source: 'shipping'
      }
    });

    const tax = calculation.tax_amount_exclusive / 100;
    const total = parseFloat((marketplaceFee + delivery + tax + listing.listingPrice).toFixed(2));

    const currentItem = JSON.parse(paymentIntent.metadata.item);
    currentItem.salesTax = parseFloat(tax.toFixed(2));

    // name/phone are carried alongside the address fields here (rather than
    // as separate metadata keys) since buildOrderDataFromPaymentIntent just
    // JSON.parses this whole blob into buyerShippingAddress -- that's what
    // the EasyShip shipment-create call will read contact_name/contact_phone
    // off of later.
    await stripe.paymentIntents.update(paymentIntentId, {
      amount: Math.round(total * 100),
      metadata: {
        tax_calculation_id: calculation.id,
        shipping_to: JSON.stringify({ ...address, name, phone }),
        item: JSON.stringify(currentItem)
      }
    });

    return res.status(200).json({
      success: true,
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      calculationId: calculation.id
    });

  } catch (error) {
    console.error("Tax calculation failed:", error.message);
    return res.status(502).json({ success: false, message: "We couldn't calculate tax for that address right now. Please try again shortly." });
  }
});

// payment
app.get('/payment/card-details', async (req, res) => {
  const { id } = req.query;
  console.log("lastest charge id:", id);

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(id, {
      expand: ['latest_charge.payment_method_details']
    });

    const charge = paymentIntent.latest_charge;
    console.log("charge data:",charge)

    return res.json({
      cardType: charge.payment_method_details.card.brand,
      last4: charge.payment_method_details.card.last4
    });

  } catch (err) {
    res.status(500).json({ error:"Interal Server Error", err})
  }
  
});

app.get('/api/payment-methods', verifyAuth, async (req, res) => {
  const uid = req.token.uid;
  console.log("user:", uid);

  try {
    let docRef = await db.collection('userProfiles').doc(uid).get();
    const user = docRef.data();

    if (user.stripeCustomerId) {
      try {
        const paymentMethod = await stripe.paymentMethods.list({
          type: 'card',
          customer: user.stripeCustomerId,
        })

        const pm = {
          paymentMethods: paymentMethod.data.map(m => ({
            id: m.id,
            brand: m.card.brand,
            last4: m.card.last4,
            expMonth:m.card.exp_month,
            expYear: m.card.exp_year
          }))
        }

        return res.json(pm)
      } catch (stripeError) {
        // stripeCustomerId points at a customer from a different Stripe mode
        // (e.g. leftover from test mode after switching to live keys) --
        // treat it the same as "no customer yet" instead of erroring out.
        if (stripeError.code === 'resource_missing') {
          await db.collection('userProfiles').doc(uid).update({ stripeCustomerId: null });
          return res.json({ paymentMethods: [] });
        }
        throw stripeError;
      }
    } else {
      return res.json({paymentMethods: []})
    }
  } catch (error) {
    return res.status(400).json({ error: error.message})
  }
})

app.post('/api/payment-methods/setup-intent', verifyAuth, async (req, res) => {
  const uid = req.token.uid;
  console.log("user:", uid);
  try {
    let docRef = await db.collection('userProfiles').doc(uid).get();
    const user = docRef.data();

    if (user.stripeCustomerId) {
      try {
        const setupIntent = await stripe.setupIntents.create({
          customer: user.stripeCustomerId,
          automatic_payment_methods: { enabled: true }
        })

        return res.json({clientSecret: setupIntent.client_secret})
      } catch (stripeError) {
        // Same stale-customer-id case as GET /api/payment-methods above --
        // fall through to create a fresh customer instead of erroring out.
        if (stripeError.code !== 'resource_missing') throw stripeError;
      }
    }

    const customer = await stripe.customers.create({
      name: user.firstName,
      email: user.email
    });

    docRef = db.collection('userProfiles').doc(uid);
    await docRef.update({
      stripeCustomerId: customer.id
    })

    const s = await stripe.setupIntents.create({
      customer: customer.id,
      automatic_payment_methods: { enabled: true }
    })

    return res.json({clientSecret: s.client_secret})

  } catch (error) {
    return res.status(400).json({ error: error.message})
  }
})

// Maps a v2 Core Account's recipient-transfer capability status onto our
// four-value connectOnboardingStatus enum. Verified against a real sandbox
// account: a brand-new, untouched account already reports status:
// "restricted" with status_details.code "requirements_past_due" -- Stripe
// uses "restricted" for both "never started" and "actively blocked," so
// status alone can't tell those apart. status_details[].resolution can:
// "provide_info" means it's on the seller to finish onboarding (harmless),
// "contact_stripe" means something's actually wrong.
function deriveConnectStatus(account) {
  const transfers = account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers;
  const status = transfers?.status;

  if (status === 'active') {
    return { connectOnboardingStatus: 'complete', connectPayoutsEnabled: true };
  }

  const needsStripe = transfers?.status_details?.some(d => d.resolution === 'contact_stripe');
  if (needsStripe) {
    return { connectOnboardingStatus: 'restricted', connectPayoutsEnabled: false };
  }
  if (status === 'restricted' || status === 'pending') {
    return { connectOnboardingStatus: 'pending', connectPayoutsEnabled: false };
  }
  return { connectOnboardingStatus: 'not_started', connectPayoutsEnabled: false };
}

// Kicks off (or resumes) Stripe Express-style onboarding for a seller via the
// Accounts v2 API -- v1 accounts.create is blocked for new Connect
// integrations on this account. Returns a one-time Account Link URL for the
// frontend to redirect to. No webhook pushes status updates here: v2
// accounts fire "thin events" that need a separate Event Destination setup
// we're deferring, so GET /api/connect/status below polls for status instead.
app.post('/api/connect/onboard', verifyAuth, async (req, res) => {
  const uid = req.token.uid;

  try {
    const docRef = db.collection('userProfiles').doc(uid);
    const docSnap = await docRef.get();
    const user = docSnap.data();

    let accountId = user.stripeConnectAccountId;

    if (accountId) {
      try {
        await stripe.v2.core.accounts.retrieve(accountId);
      } catch (stripeError) {
        // Same stale-id pattern as stripeCustomerId in /api/payment-methods
        // above -- a leftover account id from a different Stripe mode/key
        // should be treated as "no account yet" instead of erroring out.
        if (stripeError.code === 'resource_missing') {
          accountId = null;
        } else {
          throw stripeError;
        }
      }
    }

    if (!accountId) {
      const account = await stripe.v2.core.accounts.create({
        contact_email: user.email,
        dashboard: 'express',
        // Hardcoded to match the rest of the codebase's US-only assumptions
        // (tax calc and pricing are both hardcoded to 'usd' elsewhere) --
        // Stripe's hosted onboarding link collects the seller's actual
        // address/identity details directly, this is just the required hint.
        identity: {
          country: 'us'
        },
        configuration: {
          recipient: {
            capabilities: {
              stripe_balance: {
                stripe_transfers: { requested: true }
              }
            }
          }
        },
        defaults: {
          currency: 'usd',
          // Matches the "Marketplace" business model chosen in the Connect
          // dashboard: Hexxo collects payment and only transfers out once
          // approved, so Hexxo (the platform) is the one on the hook for
          // Stripe fees and any refund/dispute losses, not the seller.
          responsibilities: {
            fees_collector: 'application',
            losses_collector: 'application'
          }
        },
        // For support/debugging lookups in the Stripe dashboard -- actual
        // status comes from polling below, not from this metadata.
        metadata: { firebaseUid: uid }
      });

      accountId = account.id;

      await docRef.update({
        stripeConnectAccountId: accountId,
        connectOnboardingStatus: 'pending',
        connectPayoutsEnabled: false
      });
    }

    const origin = `${req.protocol}://${req.get('host')}`;

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      // Stripe sends the seller back here if the link expires before they
      // finish -- same destination as return_url since either way the next
      // step is "reload the seller profile and let it re-check status."
      // connect_return=1 lets the client tell "just came back from Stripe"
      // apart from a normal page visit, so it only pays the extra status-
      // recheck delay when it's actually likely to be needed.
      refresh_url: `${origin}/profile?tab=selling&connect_return=1`,
      return_url: `${origin}/profile?tab=selling&connect_return=1`,
      type: 'account_onboarding'
    });

    return res.json({ url: accountLink.url });

  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// Stands in for the account.updated webhook we're not wiring up yet (see
// the onboarding endpoint above) -- polls Stripe directly for this seller's
// current Connect status and syncs it onto userProfiles. Call this whenever
// the seller profile page needs a fresh read, e.g. right after they return
// from onboarding.
app.get('/api/connect/status', verifyAuth, async (req, res) => {
  const uid = req.token.uid;

  try {
    const docRef = db.collection('userProfiles').doc(uid);
    const docSnap = await docRef.get();
    const user = docSnap.data();

    if (!user.stripeConnectAccountId) {
      return res.json({ connectOnboardingStatus: 'not_started', connectPayoutsEnabled: false });
    }

    const account = await stripe.v2.core.accounts.retrieve(user.stripeConnectAccountId, {
      include: ['configuration.recipient']
    });

    const status = deriveConnectStatus(account);

    await docRef.update(status);

    return res.json(status);

  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.delete('/api/payment-methods/:id', verifyAuth, async (req, res) => {
  const paymentMethodId  = req.params.id;
  const uid  = req.token.uid;
  console.log("card id to delete:", paymentMethodId );
  console.log("payment method:", uid)

  try {
    const docRef = await db.collection('userProfiles').doc(uid).get();
    const firebaseStripeCustomerId = docRef.data().stripeCustomerId;

    try {
      const paymentMethod = await stripe.customers.retrievePaymentMethod(
      firebaseStripeCustomerId,
      paymentMethodId
      );

      console.log("payment user:", paymentMethod)

      const stripeCustomerId = paymentMethod.customer;
      const match = stripeCustomerId === firebaseStripeCustomerId;

      if (match) {
        const deletePaymentMethod = await stripe.paymentMethods.detach(
          paymentMethodId
        )
  
        return res.status(200).json({ message: `stripe payment_methods detach ${deletePaymentMethod.id}`});
      }
    } catch (error) {
      return res.status(403).json({error: error.message})
    }
    
  } catch (error) {
    return res.status(500).json({ error: error.message})
  }
})

// Mirrors ANGLE_REQUIREMENTS in public/js/services/authenticate.js -- just
// the required-angle *count* per category, not the full label list, since
// this only needs to check "enough photos for this category," not render
// anything. Luxury Shoes has no angle table of its own (see that file's
// comment) and reuses Sneakers' count for the same reason.
const REQUIRED_ANGLE_COUNTS = {
  "Trading Cards": 8,
  "Apparel": 5,
  "Sneakers": 8,
  "Bags & Leather Goods": 6,
  "Luxury Shoes": 8,
};

// Authentication requests used to be created with a direct client-side
// addDoc() call (authenticate.js's old submitToFirebase()) -- meaning the
// "upload N required angle photos" rule (ANGLE_REQUIREMENTS/validateStep(3)
// in that file) was purely a client-side check, trivially skippable by
// editing the running JS or calling Firestore directly. This recomputes the
// required count for the declared category server-side and rejects a
// request that doesn't actually meet it, instead of trusting the client's
// own image array length.
app.post("/authentication-requests", verifyAuth, async (req, res) => {
  try {
    const { images, price, productDetails, additionalComments, tierSelection } = req.body;

    const category = productDetails?.category;
    const requiredCount = REQUIRED_ANGLE_COUNTS[category];

    if (!requiredCount) {
      return res.status(400).json({ success: false, message: "Unknown or missing category" });
    }

    if (!Array.isArray(images) || images.length < requiredCount) {
      return res.status(400).json({
        success: false,
        message: `${category} requires at least ${requiredCount} photos (received ${Array.isArray(images) ? images.length : 0})`,
      });
    }

    const authRequestData = {
      images,
      price,
      productDetails,
      additionalComments: additionalComments || "",
      tierSelection,

      // Transitional status -- the AI matching step (not yet built) is
      // responsible for advancing this to "pending_review" (confident
      // match found) or "needs_manual_review" (no match cleared the
      // threshold), per the planning doc's status table. "submitted" is
      // the honest interim state between form submission and that
      // pipeline actually running.
      // Full enum: submitted | pending_review | needs_manual_review |
      // needs_info | approved | rejected
      status: "submitted",
      userId: req.token.uid,

      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updateAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("authenticationRequests").add(authRequestData);

    return res.status(200).json({ success: true, requestId: docRef.id });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Triggers the AI matching step for a submitted authentication request:
// generates an embedding for its primary image, compares against every
// listing's referenceEmbedding, and writes matches + status. Called
// fire-and-forget from the client right after the request doc is created
// (see authenticate.js's handleFormSubmission()) -- see the reviewer
// screen's "Run AI Match" button for the manual retry path if that call
// never fires.
app.post("/api/authentication-requests/:id/analyze", verifyAuth, async (req, res) => {
  const requestId = req.params.id;

  try {
    const docRef = await db.collection("authenticationRequests").doc(requestId).get();

    if (!docRef.exists) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    const isOwner = req.token.uid === docRef.data().userId;
    const isAdmin = req.token.admin === true;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized for this request" });
    }

    const result = await matchAuthenticationRequest(requestId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("❌ Error matching authentication request:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mirrors itemLabel() in the seller-facing authentication.js -- kept as a
// separate copy here since that file is an ES module and this one is
// CommonJS, so it can't just be imported.
function authRequestItemLabel(productDetails) {
  const details = productDetails?.details || {};
  const descriptor = details.Brand || details.Model || details["Card Name"] || "";
  return [productDetails?.category, descriptor].filter(Boolean).join(" - ") || "your item";
}

const REVIEW_RESULT_NOTIFICATION = {
  approved: (label) => ({
    title: "Authentication Approved",
    message: `${label} passed authentication and is ready to list.`,
  }),
  rejected: (label) => ({
    title: "Authentication Rejected",
    message: `${label} did not pass authentication.`,
  }),
  needs_info: (label) => ({
    title: "More Information Needed",
    message: `We need more information about ${label} before authentication can continue.`,
  }),
};

// Reviewer action: approve / reject / request more info on an
// authentication request. isAdmin-gated the same way PUT /orders/:id
// gates its status field to admins only. NOTE: still inert until a
// reviewer account actually has the admin custom claim set.
app.put("/api/authentication-requests/:id", verifyAuth, async (req, res) => {
  const requestId = req.params.id;
  const { status, reviewerNotes } = req.body;

  const allowedStatuses = ["approved", "rejected", "needs_info"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${allowedStatuses.join(", ")}` });
  }

  try {
    const docRef = db.collection("authenticationRequests").doc(requestId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    const isAdmin = req.token.admin === true;

    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Reviewer access required" });
    }

    await docRef.update({
      status,
      reviewerNotes: reviewerNotes || null,
      reviewerId: req.token.uid,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const requestData = docSnap.data();
    const label = authRequestItemLabel(requestData.productDetails);
    const { title, message } = REVIEW_RESULT_NOTIFICATION[status](label);

    await createNotification(
      requestData.userId,
      "authentication",
      title,
      message,
      `/authenticator/authenticate-results.html?authRequestId=${requestId}`
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Error updating authentication request:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Seller action: respond to a "needs_info" request by adding photos (and an
// optional note) to the SAME ticket, then send it back into the review
// queue. Owner-gated (not admin-gated like the PUT above) since this is the
// seller acting on their own request -- mirrors the isOwner check in
// POST .../analyze. Images are uploaded to Storage client-side first (same
// division of labor as the initial submission in authenticate.js); this
// route only persists the resulting metadata.
const MAX_AUTH_REQUEST_IMAGES = 8;

app.post("/api/authentication-requests/:id/resubmit", verifyAuth, async (req, res) => {
  const requestId = req.params.id;
  const { images, note } = req.body;

  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ success: false, message: "At least one new image is required" });
  }

  try {
    const docRef = db.collection("authenticationRequests").doc(requestId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    const requestData = docSnap.data();

    if (req.token.uid !== requestData.userId) {
      return res.status(403).json({ success: false, message: "Not authorized for this request" });
    }

    if (requestData.status !== "needs_info") {
      return res.status(400).json({ success: false, message: "Only requests marked needs_info can be resubmitted" });
    }

    const existingImages = requestData.images || [];

    if (existingImages.length + images.length > MAX_AUTH_REQUEST_IMAGES) {
      return res.status(400).json({
        success: false,
        message: `A request can have at most ${MAX_AUTH_REQUEST_IMAGES} photos (${existingImages.length} already submitted)`,
      });
    }

    await docRef.update({
      images: admin.firestore.FieldValue.arrayUnion(...images),
      statusHistory: admin.firestore.FieldValue.arrayUnion({
        status: requestData.status,
        reviewerNotes: requestData.reviewerNotes || null,
        reviewerId: requestData.reviewerId || null,
        reviewedAt: requestData.reviewedAt || null,
      }),
      status: "submitted",
      sellerNote: note || null,
      reviewerNotes: null,
      reviewerId: null,
      reviewedAt: null,
      resubmittedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Error resubmitting authentication request:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});


/**
 * notifications/{userId}/items/{notificationId} -- same subcollection
 * shape already established for favorites/cart in this app.
 *
 * 'order_status' now has real triggers (fulfillmentStatus transitions in
 * PUT/DELETE /orders/:id and the webhook above). The remaining two types
 * are still wired up in name only, with no call site yet:
 *   - 'message': no DM/conversation system exists anywhere in this app
 *   - 'security': no account-security flow exists yet (no password
 *     change, no 2FA -- confirmed when Settings was built)
 * Whenever those features actually ship, calling createNotification()
 * from their own trigger points is the only change needed here.
 */
// Maps a notification type to the userProfiles.notificationPreferences
// field that gates it. Types with no entry here (none yet -- 'message',
// 'security' have no trigger) are always sent.
const TYPE_TO_PREFERENCE_FIELD = {
  purchase: "orderUpdates",
  sale: "orderUpdates",
  order_status: "orderUpdates",
  
};

// A user who has never saved preferences has no notificationPreferences
// field at all -- that's the state of every user today, since this is a
// new setting. Treating "never saved" as disabled would silently mute
// order confirmations for everyone until they individually discover and
// enable a toggle they don't know exists. So only an explicit `false`
// suppresses; undefined (or a missing profile/doc) defaults to sending.
async function isNotificationEnabled(userId, type) {
  const preferenceField = TYPE_TO_PREFERENCE_FIELD[type];
  if (!preferenceField) return true;

  const profileSnap = await db.collection("userProfiles").doc(userId).get();
  const preferences = profileSnap.exists ? profileSnap.data().notificationPreferences : undefined;

  return preferences?.[preferenceField] !== false;
}

async function createNotification(userId, type, title, message, link) {
  try {
    const enabled = await isNotificationEnabled(userId, type);
    if (!enabled) {
      console.log(`Skipped "${type}" notification for ${userId}: disabled in preferences`);
      return;
    }

    await db.collection("notifications").doc(userId).collection("items").add({
      type,
      title,
      message,
      link,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    // A failed notification write should never take down the order flow
    // that triggered it -- the order itself already succeeded by the
    // time this runs.
    console.error(`Failed to create "${type}" notification for ${userId}:`, error);
  }
}

// Admin-ness is a Firebase Auth custom claim (grantAdminClaim.js), not
// natively queryable -- finding every admin via the Auth Admin SDK would mean
// paginating listUsers() over the whole user base. grantAdminClaim.js also
// stamps isAdmin: true on the same user's userProfiles doc so this can just
// be a normal Firestore query instead.
async function notifyAdminsOfReviewableRequest(item) {
  const adminsSnap = await db.collection("userProfiles").where("isAdmin", "==", true).get();

  await Promise.all(
    adminsSnap.docs.map((adminDoc) =>
      createNotification(
        adminDoc.id,
        "authentication_review",
        "New Authentication Request",
        `${item.name || "An item"} was submitted for authentication review.`,
        "/admin/authentication-review.html"
      )
    )
  );
}

// Authentication payments never go through the `orders` collection --
// they mark the authenticationRequests doc paid and kick off the AI
// matching step that used to fire immediately on form submission (see
// authenticate.js's createAuthenticationRequest()). Gating matching on
// payment is what actually makes terms2's checkbox copy on
// authenticate.html true: "the authentication process will begin once
// payment is confirmed."
async function handleAuthPaymentSucceeded(paymentData) {
  const authRequestId = paymentData.metadata.auth_request_id;

  try {
    const requestRef = db.collection('authenticationRequests').doc(authRequestId);
    const requestSnap = await requestRef.get();

    if (!requestSnap.exists) {
      console.error(`authenticationRequests/${authRequestId} not found, skipping payment update`);
      return;
    }

    if (requestSnap.data().paid) {
      console.log(`authentication request ${authRequestId} already marked paid, skipping duplicate webhook delivery`);
      return;
    }

    await requestRef.update({
      paid: true,
      paymentIntentId: paymentData.id,
    });

    await matchAuthenticationRequest(authRequestId);

    const item = JSON.parse(paymentData.metadata.item || '{}');

    await createNotification(
      paymentData.metadata.buyer_id,
      "authentication",
      "Payment Confirmed",
      `Your ${item.name || "item"} is now queued for authentication review.`,
      "/profile?tab=selling&subtab=authentication"
    );

    await notifyAdminsOfReviewableRequest(item);
  } catch (err) {
    console.error(`Error handling authentication payment for request ${authRequestId}:`, err);
  }
}

// Shared between /orders/init (writes the "pending" doc at checkout submit)
// and the webhook below (which either flips that doc to "processing" or,
// if init never ran, builds the doc from scratch off the PaymentIntent's own
// metadata rather than trusting anything the client sends at capture time).
function buildOrderDataFromPaymentIntent(paymentData) {
  return {
    id: paymentData.id,
    buyerId: paymentData.metadata.buyer_id,
    sellerId: paymentData.metadata.seller_id,
    buyerEmail: paymentData.metadata.buyer_email,
    listingId: paymentData.metadata.listing_id,
    createdAt: paymentData.created,
    subtotal: (paymentData.amount / 100).toFixed(2),
    shippingCost: paymentData.metadata.shipping_cost,
    shippingAddress: paymentData.metadata.shipping_from,
    item: JSON.parse(paymentData.metadata.item),
    taxCalculationId: paymentData.metadata.tax_calculation_id || null,
    buyerShippingAddress: paymentData.metadata.shipping_to ? JSON.parse(paymentData.metadata.shipping_to) : null
  };
}

// Authorization-time counterpart to handlePaymentIntentSucceeded below --
// deliberately thin. Does NOT record the tax transaction, bump the
// listing's sale stats, or notify the seller of a sale, since none of that
// is true yet: this fires when the card is merely authorized (capture_method
// 'manual'), before admin has passed the item. Those steps stay entirely in
// handlePaymentIntentSucceeded, which will still fire later, unchanged, once
// step 5's admin-pass actually captures the PaymentIntent.
async function handlePaymentIntentAuthorized(paymentData) {
  try {
    if (paymentData.metadata.authentication_requested !== 'true') return;

    const existingOrder = await db.collection('orders').where('id', '==', paymentData.id).limit(1).get();
    let data;

    if (!existingOrder.empty) {
      const orderDoc = existingOrder.docs[0];
      data = orderDoc.data();

      if (data.fulfillmentStatus !== 'pending') {
        console.log(`order for payment intent ${paymentData.id} already past pending, skipping duplicate authorization webhook`);
        return;
      }

      await orderDoc.ref.update({
        status: paymentData.status,
        fulfillmentStatus: 'pending_authentication',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // /orders/init either never fired or failed -- build the order now
      // off the PaymentIntent's own metadata, same fallback reasoning as
      // handlePaymentIntentSucceeded.
      data = buildOrderDataFromPaymentIntent(paymentData);

      await db.collection('orders').add({
        ...data,
        status: paymentData.status,
        fulfillmentStatus: 'pending_authentication'
      });
    }

    console.log(`order for payment intent ${paymentData.id} now pending authentication`);

    await createNotification(
      data.sellerId,
      "order_status",
      "Authentication Required",
      `Your sale of ${data.item?.name || "an item"} needs authentication photos before it can ship. Submit at least 8 photos from your Selling dashboard.`,
      "/profile?tab=selling"
    );
  } catch (err) {
    console.error(err);
  }
}

// Builds & purchases a ShipStation label for a prepaid-shipping sale, called
// right as the order moves to "processing" in handlePaymentIntentSucceeded
// below. Self-ship listings (no carrierCode/serviceCode saved on
// listing.shipping -- see seller.js's courierConfirmBtn handler) are skipped
// entirely; this only applies to the "Hexxo's prepaid label" path. Throws on
// any failure instead of swallowing it, so the caller can notify the seller
// rather than silently leaving an order with no label and no tracking number.
//
// Returns `shipstationShipmentId`, deliberately NOT `easyshipShipmentId` --
// the buyer-confirms-delivery path (PUT /orders/:id) only blocks a buyer's
// self-confirm when `easyshipShipmentId` is set, since ShipStation has no
// delivered webhook to source that ground truth from instead. Keeping this
// field under a different name lets these orders fall into the same
// buyer-self-confirms flow as self-ship orders, on purpose.
async function purchaseShippingLabel(order, listing) {
  const shipping = listing.shipping;
  if (!shipping || typeof shipping !== 'object' || !shipping.carrierCode || !shipping.serviceCode) {
    return null;
  }

  if (!order.buyerShippingAddress) {
    throw new Error('Order has no buyerShippingAddress -- cannot address a label');
  }

  const sellerSnap = await db.collection('userProfiles').doc(order.sellerId).get();
  const seller = sellerSnap.data();

  if (!seller?.shipping?.address) {
    throw new Error(`Seller ${order.sellerId} has no shipping address on file`);
  }

  const sellerName = `${seller.firstName || ''} ${seller.lastName || ''}`.trim() || 'Hexxo Seller';
  const buyerAddress = order.buyerShippingAddress;

  const label = await createLabel({
    carrierCode: shipping.carrierCode,
    serviceCode: shipping.serviceCode,
    packageCode: 'package',
    shipDate: new Date().toISOString().slice(0, 10),
    weight: {
      value: parseFloat(shipping.parcel.weight),
      units: 'pounds'
    },
    dimensions: {
      units: 'inches',
      length: parseFloat(shipping.parcel.length),
      width: parseFloat(shipping.parcel.width),
      height: parseFloat(shipping.parcel.height)
    },
    shipFrom: {
      name: sellerName,
      company: sellerName,
      street1: seller.shipping.address,
      street2: seller.shipping.address2 || undefined,
      city: seller.shipping.city,
      state: seller.shipping.state,
      postalCode: seller.shipping.zipCode,
      country: seller.shipping.country,
      phone: seller.shipping.phoneNumber
    },
    shipTo: {
      name: buyerAddress.name,
      street1: buyerAddress.line1,
      street2: buyerAddress.line2 || undefined,
      city: buyerAddress.city,
      state: buyerAddress.state,
      postalCode: buyerAddress.postal_code,
      country: buyerAddress.country,
      phone: buyerAddress.phone,
      residential: true
    }
  });

  if (!label?.trackingNumber || !label?.labelData) {
    throw new Error(`ShipStation returned no label/tracking for shipment ${label?.shipmentId}`);
  }

  // ShipStation returns the label as a base64 PDF directly in the response
  // (no hosted URL like EasyShip gave us) -- upload it to our own Storage
  // bucket so the rest of the app can keep treating shippingLabelUrl as a
  // plain link, same as before.
  const labelBuffer = Buffer.from(label.labelData, 'base64');
  const labelFile = bucket.file(`shippingLabels/${order.id}.pdf`);
  await labelFile.save(labelBuffer, { contentType: 'application/pdf' });
  const [shippingLabelUrl] = await labelFile.getSignedUrl({
    action: 'read',
    expires: '01-01-2100'
  });

  return {
    trackingNumber: label.trackingNumber,
    shippingCarrier: shipping.carrierCode,
    shippingLabelUrl,
    shipstationShipmentId: label.shipmentId
  };
}

async function handlePaymentIntentSucceeded(paymentData){
  console.log(paymentData)
  try {
    if (paymentData.metadata.item_type === 'authentication') {
      return await handleAuthPaymentSucceeded(paymentData);
    }

    const salePrice = paymentData.amount / 100;
    const existingOrder = await db.collection('orders').where('id', '==', paymentData.id).limit(1).get();

    let data;
    let orderRef;

    if (!existingOrder.empty) {
      const orderDoc = existingOrder.docs[0];
      data = orderDoc.data();
      orderRef = orderDoc.ref;

      if (data.fulfillmentStatus === 'processing') {
        console.log(`order for payment intent ${paymentData.id} already processed, skipping duplicate webhook delivery`);
        return;
      }

      await orderRef.update({
        status: paymentData.status,
        fulfillmentStatus: 'processing',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // No pending order found -- /orders/init either never fired or
      // failed. Build the order now off the PaymentIntent's own metadata
      // rather than silently losing a captured payment.
      data = buildOrderDataFromPaymentIntent(paymentData);

      orderRef = await db.collection('orders').add({
        ...data,
        status: paymentData.status,
        fulfillmentStatus: 'processing'
      });
    }

    console.log(`order for payment intent ${paymentData.id} now processing`);

    // Records the calculation against Stripe's own tax reporting/filing
    // records. Never blocks order processing or notifications on this --
    // a failed filing record shouldn't stop the buyer/seller from seeing
    // their order go through.
    if (data.taxCalculationId) {
      try {
        const taxTransaction = await stripe.tax.transactions.createFromCalculation({
          calculation: data.taxCalculationId,
          reference: paymentData.id
        });
        await orderRef.update({ taxTransactionId: taxTransaction.id });
      } catch (err) {
        console.error(`Failed to record tax transaction for ${paymentData.id}:`, err.message);
      }
    }

    const itemName = data.item?.name || "an item";

    // Fire-and-forget, same reasoning as the tax transaction record above --
    // a Resend hiccup here shouldn't stop the order itself from completing.
    sendAdminNotification('NEW_SALE', {
      itemName,
      salePrice: salePrice.toFixed(2),
      orderId: orderRef.id,
      buyerEmail: data.buyerEmail
    });

    let labelCost = 0;

    const listingId = data.listingId;
    if (listingId) {
      const listingRef = db.collection('listings').doc(listingId);
      const listingSnap = await listingRef.get();

      if (listingSnap.exists) {
        const listing = listingSnap.data();
        const totalSales = listing.totalSales || 0;
        const currentAverage = listing.averageSalePrice || 0;
        const newAverage = ((currentAverage * totalSales) + salePrice) / (totalSales + 1);

        await listingRef.update({
          totalSales: totalSales + 1,
          averageSalePrice: parseFloat(newAverage.toFixed(2)),
          lastSalePrice: salePrice
        });

        // Denormalized on the seller's public profile (not a live orders
        // query) since orders has no public Firestore read rule -- see
        // /api/sellers/:id/public-profile's own reasoning. Best-effort,
        // same as the admin notification above.
        if (listing.userId) {
          db.collection('userProfiles').doc(listing.userId)
            .update({ salesCount: admin.firestore.FieldValue.increment(1) })
            .catch((error) => console.error(`Failed to increment salesCount for seller ${listing.userId}:`, error));
        }

        // Prepaid-shipping sales only (purchaseShippingLabel no-ops on
        // self-ship listings). fulfillmentStatus deliberately stays
        // "processing" here -- the seller still confirms drop-off themselves
        // from their orders screen, same as the self-ship flow, just with
        // tracking/carrier pre-filled instead of hand-typed.
        try {
          const label = await purchaseShippingLabel(data, listing);
          if (label) {
            await orderRef.update({
              trackingNumber: label.trackingNumber,
              shippingCarrier: label.shippingCarrier,
              shippingLabelUrl: label.shippingLabelUrl,
              shipstationShipmentId: label.shipstationShipmentId,
              labelGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // The buyer was never charged for this label (see /order-summary),
            // so its cost comes out of the seller's payout instead -- same
            // debt ledger/netting path as a return-shipping charge from an
            // upheld dispute (see /api/orders/:id/dispute/uphold).
            labelCost = parseFloat(listing.shipping?.estimateRate) || 0;
            if (labelCost > 0) {
              await db.collection("sellerDebts").doc(orderRef.id).set({
                sellerId: data.sellerId,
                orderId: orderRef.id,
                reason: "prepaid_shipping_label",
                amount: labelCost.toFixed(2),
                remainingAmount: labelCost.toFixed(2),
                status: "outstanding",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                settledAt: null
              });
            }

            console.log(`shipping label purchased for order ${paymentData.id}`);
          }
        } catch (err) {
          console.error(`Failed to purchase shipping label for order ${paymentData.id}:`, err.message);
          await createNotification(
            data.sellerId,
            "order_status",
            "Shipping Label Needed",
            `We couldn't automatically generate a shipping label for ${itemName}. Please ship this item yourself and add tracking from your Selling dashboard.`,
            "/profile?tab=selling"
          );
        }
      } else {
        console.error(`listing ${listingId} not found, skipping sale price update`);
      }
    } else {
      console.error(`payment intent ${paymentData.id} has no listing_id in metadata, skipping sale price update`);
    }

    // Buyer already got "Order Confirmed" from /orders/init at pending --
    // only the seller gets notified here, since this is the point they
    // learn about the sale for the first time.
    const saleMessage = labelCost > 0
      ? `You sold ${itemName}. $${labelCost.toFixed(2)} for your prepaid shipping label will be deducted from this payout.`
      : `You sold ${itemName}.`;

    await createNotification(
      data.sellerId,
      "sale",
      "New Order",
      saleMessage,
      "/profile?tab=selling"
    );

    return JSON.stringify({status: "order processing"})

  } catch (err) {
    console.error(err)
  }
}

app.use((req, res) => {
  if (req.path.endsWith(".js")) {
    res.type("application/javascript");
    res.status(404).send("// Module not found");
  } else {
    res.redirect("/404");
  }
});

const port = process.env.PORT || 3030;

app.listen(port, () => {
  console.log(`listening on port ${port}.......`);
});