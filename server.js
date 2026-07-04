"use strict";
require("dotenv").config();

// importing packages
const express = require("express");
const path = require("path");
const nodemailer = require("nodemailer");
const easyship = require('@api/easyship');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

easyship.auth(process.env.EASYSHIP_KEY);



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
const MARKETPLACE_FEE_RATE = 0.05

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
    default:
      // Unexpected event type
      console.log(`Unhandled event type ${event.type}.`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.sendStatus(200);
});

app.use(express.json());


app.post('/seller/api/shipping-rates',  async (req, res) => {
  const { fromAddress , toAddress, parcel } = req.body;

  

  try {
    const { data } = await easyship.rates_request({
      origin_address: fromAddress,
      destination_address: toAddress,
      incoterms: 'DDU',
      insurance: { is_insured: false },
      courier_settings: {
        apply_shipping_rules: true,
        show_courier_logo_url: true
      },
      shipping_settings: {
        units: {
          weight: 'lb',
          dimensions: 'in'
        }
      },
      parcels: [
        {
          total_actual_weight: parcel.weight,
          box: 
            {
              slug: 'custom',
              length: parcel.length,
              width: parcel.width,
              height: parcel.height
            },
            items: 
            [
              {
              quantity: 1,
              category: 'Clothes & Accessories',
              declared_currency: 'USD',
              declared_customs_value: parcel.price ?? 1,
              hs_code: '6211'

              }
            ]
        }
    ],
      calculate_tax_and_duties: false
    });

    console.log("Returned shipping data:", data);

    res.json(data)

  } catch (err) {
    console.error("Failed to fetch shipping rates", JSON.stringify(err.data?.error?.details, null, 2))
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
// accessories page route
app.get("/contact", (req, res) => {
  res.sendFile(path.join(staticPth, "contact.html"));
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
// authentication route
app.get("/authenticate", (req, res) => {
  res.sendFile(path.join(staticPth, "authenticator/authenticate.html"));
});
// authentication reviewer route -- first admin surface in the app; access
// is gated client-side by checking the admin custom claim (UX only, see
// authentication-review.js) and server-side by the PUT route's isAdmin check
app.get("/admin/authentication-review", (req, res) => {
  res.sendFile(path.join(staticPth, "admin/authentication-review.html"));
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

// add product
app.post("/add-product", (req, res) => {
  let {
    name,
    shortDes,
    des,
    images,
    sizes,
    actualPrice,
    discount,
    sellerPrice,
    stock,
    tags,
    tac,
    email,
    draft,
    id
  } = req.body;

  // validation
  if (!draft) {
    if (!name.length) {
      return res.json({ alert: "enter product name" });
    } else if (shortDes.length > 100 || shortDes.length < 10) {
      return res.json({
        alert: "short description must be between 10 or 100 characters long"
      });
    } else if (!des.length) {
      return res.json({ alert: "enter details description about the product" });
    } else if (!images.length) {
      //img link array
      return res.json({ alert: "upload atleast one product image" });
    } else if (!sizes.length) {
      // size array
      return res.json({ alert: "select at least one size" });
    } else if (!actualPrice.length || !discount.length || !sellerPrice.length) {
      return res.json({ alert: "you must add pricings" });
    } else if (stock < 20) {
      return res.json({ alert: "you should have at least 20 items in stock" });
    } else if (!tags.length) {
      return res.json({
        alert: "enter few tags to help ranking your prodcut in search"
      });
    } else if (!tac) {
      return res.json({ alert: "you must agree to term and conditions" });
    }
  }

  // add product
  let docName =
    id == undefined
      ? `${name.toLowerCase()}-${Math.floor(Math.random() * 5000)}`
      : id;
  db.collection("products")
    .doc(docName)
    .set(req.body)
    .then((data) => {
      res.json({ product: name });
    })
    .catch((err) => {
      return res.json({ alert: "some error occured. Try again" });
    });
});

// get prod
app.post("/get-products", (req, res) => {
  let { email, id, tag } = req.body;
  let docRf = id
    ? db.collection("products").doc(id)
    : db.collection("products").where("email", "==", email);

  if (id) {
    docRf = db.collection("products").doc(id);
    db.collection("products").doc(id);
  } else if (tag) {
    docRf = db.collection("products").where("tags", "array-contains", tag);
  } else {
    db.collection("products").where("email", "==", email);
  }

  docRf.get().then((products) => {
    if (products.empty) {
      return res.json("no products");
    }
    let productArr = [];
    if (id) {
      return res.json(products.data());
    } else {
      products.forEach((item) => {
        let data = item.data();
        data.id = item.id;
        productArr.push(data);
      });
      res.json(productArr);
    }
  });
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
      `/products/${req.params.id}`
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
    await createNotification(otherUid, "offer", notifArgs[0], notifArgs[1], `/products/${offer.productId}`);

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

// The order confirmation page only has the Stripe payment intent id (from
// the redirect URL), not the Firestore doc id `/orders/:id` above expects --
// and `orders` has no Firestore rule at all (see the Price History chart
// entry in notes.md), so this can't be a client-side onSnapshot listener
// like confirm.js used to run. Same buyerId/sellerId check as `/orders/:id`.
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

app.put("/userProfiles/:id", verifyAuth, async (req, res) => {
  const userId = req.params.id;
  const data = req.body;
  
  try {
    if (req.token.uid === userId) {
      const docRef = db.collection("userProfiles").doc(userId);
      const doc = await docRef.get();

      if (doc.exists) {    
        const updateData = {
          ...(data.firstname !== undefined && { firstname: data.firstname }),
          ...(data.lastname !== undefined && { lastname: data.lastname }),
          ...(data.backgroundImage !== undefined && { backgroundImage: data.backgroundImage }),
          ...(data.username !== undefined && { username: data.username }),
          ...(data.shipping !== undefined && { shipping: {
            address1: data.shipping.address1,
            address2: data.shipping.address2,
            country: data.shipping.country,
            city: data.shipping.city,
            state: data.shipping.state,
            postalCode: data.shipping.postalCode,
            phone: data.shipping.phone
          } }),
        };

        if (Object.keys(updateData).length === 0) return res.status(400).json({ update: false, message: "No changes made"});

        await docRef.update({
          ...updateData,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({ update: true, message: "Update successful"});
      } else {
        res.status(404).json({ success: false, message: "No document found!"})
      }
      
    } else {
      return res.status(403);
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
});

// Which fulfillmentStatus values a seller is allowed to move *from* for
// each target status -- e.g. you can only mark "shipped" from pending or
// processing, and only mark "delivered" once it's actually shipped. Keeps
// the state machine in one place instead of scattered if/else checks.
const SELLER_FULFILLMENT_TRANSITIONS = {
  shipped: ["pending", "processing"],
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

    // Once delivered or cancelled, the order is a closed record -- nothing
    // below should be able to touch it further.
    const locked = ['delivered', 'cancelled'];
    const isLocked = locked.includes(order.fulfillmentStatus);

    if (isLocked) {
      return res.status(409).json({ success: false, message: "Order is locked!" })
    }

    const updatedData = {};

    if (isBuyer) {
      if (data.shipping !== undefined) {
        updatedData.shipping = {
          address1: data.shipping.address1,
          address2: data.shipping.address2,
          country: data.shipping.country,
          city: data.shipping.city,
          state: data.shipping.state,
          postalCode: data.shipping.postalCode,
          phone: data.shipping.phone
        }
      }
    }

    if (isSeller && data.fulfillmentStatus !== undefined) {
      const allowedFrom = SELLER_FULFILLMENT_TRANSITIONS[data.fulfillmentStatus];

      if (!allowedFrom) {
        return res.status(400).json({ success: false, message: `Sellers cannot set fulfillmentStatus to "${data.fulfillmentStatus}"` });
      }
      if (!allowedFrom.includes(order.fulfillmentStatus)) {
        return res.status(409).json({ success: false, message: `Cannot mark "${data.fulfillmentStatus}" from "${order.fulfillmentStatus}"` });
      }
      if (data.fulfillmentStatus === "shipped" && !data.trackingNumber) {
        return res.status(400).json({ success: false, message: "Tracking number is required to mark an order shipped" });
      }

      updatedData.fulfillmentStatus = data.fulfillmentStatus;
      if (data.fulfillmentStatus === "shipped") {
        updatedData.trackingNumber = data.trackingNumber;
        updatedData.shippingCarrier = data.shippingCarrier;
      }
    }

    if(isAdmin) {
      if (data.status !== undefined) {
        updatedData.status = data.status
      }
    }

    if (Object.keys(updatedData).length === 0) {
      return res.status(400).json({update: false, message: "No changes made"})
    }

    await docRef.update({
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

        await docRef.update({
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
      const response = await fetch(
        'https://api.restcountries.com/countries/v5?limit=100&offset=200&pretty=1',
        { headers: { 'Authorization': 'Bearer rc_live_c6c7200d1e9b48d59bf1f59acce2a437' } }
    );
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
          shipping_cost: item.shippingCost,
          shipping_from: item.shippingFrom,
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

      const marketplaceFee = MARKETPLACE_FEE_RATE * listing.listingPrice;
      const tax = 0.20; // just for testing
      const delivery = listing.shipping === "" ? 0 : listing.shipping.estimateRate;

      return res.status(200).json({
        marketplaceFee: marketplaceFee.toFixed(2),
        price: listing.listingPrice,
        tax: tax.toFixed(2),
        delivery: delivery,
        total: parseFloat((marketplaceFee + delivery + tax + listing.listingPrice).toFixed(2))
      })

    } catch (error) {
      res.status(500).json({success: false, message: `Internal server error: ${error.message}`})
    }
})

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
      const setupIntent = await stripe.setupIntents.create({
        customer: user.stripeCustomerId,
        automatic_payment_methods: { enabled: true }
      })

      return res.json({clientSecret: setupIntent.client_secret})
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

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Error updating authentication request:", error);
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
    item: JSON.parse(paymentData.metadata.item)
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

    if (!existingOrder.empty) {
      const orderDoc = existingOrder.docs[0];
      data = orderDoc.data();

      if (data.fulfillmentStatus === 'processing') {
        console.log(`order for payment intent ${paymentData.id} already processed, skipping duplicate webhook delivery`);
        return;
      }

      await orderDoc.ref.update({
        status: paymentData.status,
        fulfillmentStatus: 'processing',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // No pending order found -- /orders/init either never fired or
      // failed. Build the order now off the PaymentIntent's own metadata
      // rather than silently losing a captured payment.
      data = buildOrderDataFromPaymentIntent(paymentData);

      await db.collection('orders').add({
        ...data,
        status: paymentData.status,
        fulfillmentStatus: 'processing'
      });
    }

    console.log(`order for payment intent ${paymentData.id} now processing`);

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
      } else {
        console.error(`listing ${listingId} not found, skipping sale price update`);
      }
    } else {
      console.error(`payment intent ${paymentData.id} has no listing_id in metadata, skipping sale price update`);
    }

    const itemName = data.item?.name || "an item";

    // Buyer already got "Order Confirmed" from /orders/init at pending --
    // only the seller gets notified here, since this is the point they
    // learn about the sale for the first time.
    await createNotification(
      data.sellerId,
      "sale",
      "New Order",
      `You sold ${itemName}.`,
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