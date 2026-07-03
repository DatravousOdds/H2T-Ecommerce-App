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
// to stay that way -- offer creation isn't even implemented client-side yet),
// compute the summary server-side and hand back just two numbers.
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

app.get("/checkout", (req, res) => {
  res.sendFile(path.join(staticPth, "checkout.html"));
});

app.get("/orders/:id", verifyAuth, async (req, res) => {
  try {
    const docId = req.params.id;

    const docRef = await db.collection("orders").doc(docId).get();
    if (!docRef.exists) return res.status(404).json({success: false, message: "Order not found"});

    const order = docRef.data();

    if (req.token.uid === order.buyerId || order.items.some(item => item.sellerId === req.token.uid)) {
      return res.status(200).json({ success: true, data: order });
    } else {
      return res.status(403).json({success: false, message: "Unauthorized"})
    }
  } catch (error) {
    return res.status(500).json({success: false, message: error.message})
  }
})

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

app.put("/orders/:id", verifyAuth, async (req, res) => {
  const data = req.body;

  try {
    const docId = req.params.id;

    const docRef =  await db.collection("orders").doc(docId).get();
    if(!docRef.exists) return res.status(404).json({success: false, message: "Document not found!"});

    const order = docRef.data();

    const isBuyer = req.token.uid === order.buyerId;
    const isSeller = order.items.some(item => item.sellerId === req.token.uid);
    const isAdmin = req.token.admin === true;

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({ success:false, message: "Role type not found!" })
    }

    const locked = ['fullfilled', 'shipped', 'completed', 'invoiced', 'cancelled', 'returned', 'disputed', 'refunded'];
    const isLocked = locked.some(val => order.status.includes(val));

    const updatedData = {};

    if (!isLocked) {
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
  
      if (isSeller) {
        if (data.items.length > 0) {
          updatedData.items = data.items.map(item => {
            if (item.sellerId === req.token.uid) {
              if(data.trackingNumber !== undefined || data.itemStatus !== undefined) {
                return {
                  ...item,
                  trackingNumber:  data.trackingNumber,
                  shippingCarrier: data.shippingCarrier,
                  itemStatus: data.itemStatus
                }
              }
              return item;
            } else {
              return item;
            }
          })
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

      res.status(200).json({ update: true, message: "Update successful"});

    } else {
      res.status(409).json({ success: false, message: "Order is locked!" })
    }
    
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

    const docRef = await db.collection("orders").doc(docId).get();
    if (!docRef.exists) {
      return res.status(404).json({ success: false, message: "Document not found!" });
    }

    const order = docRef.data();

    const isBuyer = req.token.uid === order.buyerId;
    const isSeller = order.items.some(item => item.sellerId === req.token.uid);
    const isAdmin = req.token.admin === true;

    if (isBuyer || isSeller || isAdmin) {
      const locked = ['fullfilled', 'shipped', 'completed', 'invoiced','disputed'];
      const isLocked = locked.some(val => order.status.includes(val));

      if (!isLocked) {
        await docRef.update({
          status: "cancelled",
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })

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
 * Five types are defined in this system, but only 'purchase' and 'sale'
 * have a real trigger today (both fire right here, from the same
 * successful payment). The other three are intentionally left wired up
 * in name only, with no call site yet:
 *   - 'message': no DM/conversation system exists anywhere in this app
 *   - 'order_status': no real fulfillment-status field exists yet
 *     (orders.status is just Stripe's payment status)
 *   - 'security': no account-security flow exists yet (no password
 *     change, no 2FA -- confirmed when Settings was built)
 * Whenever those features actually ship, calling createNotification()
 * from their own trigger points is the only change needed here.
 */
// Maps a notification type to the userProfiles.notificationPreferences
// field that gates it. Types with no entry here (none yet -- 'message',
// 'order_status', 'security' have no trigger) are always sent.
const TYPE_TO_PREFERENCE_FIELD = {
  purchase: "orderUpdates",
  sale: "orderUpdates",
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
      "/profile?tab=selling"
    );
  } catch (err) {
    console.error(`Error handling authentication payment for request ${authRequestId}:`, err);
  }
}

async function handlePaymentIntentSucceeded(paymentData){
  console.log(paymentData)
  try {
    if (paymentData.metadata.item_type === 'authentication') {
      return await handleAuthPaymentSucceeded(paymentData);
    }

    const existingOrder = await db.collection('orders').where('id', '==', paymentData.id).limit(1).get();
    if (!existingOrder.empty) {
      console.log(`order for payment intent ${paymentData.id} already exists, skipping duplicate webhook delivery`);
      return;
    }

    const listingId = paymentData.metadata.listing_id;
    const salePrice = paymentData.amount / 100;

    const data = {
      id: paymentData.id,
      buyerId: paymentData.metadata.buyer_id,
      sellerId: paymentData.metadata.seller_id,
      buyerEmail: paymentData.metadata.buyer_email,
      listingId,
      createdAt: paymentData.created,
      subtotal: salePrice.toFixed(2),
      status: paymentData.status,
      shippingCost: paymentData.metadata.shipping_cost,
      shippingAddress: paymentData.metadata.shipping_from,
      item: JSON.parse(paymentData.metadata.item)
    }

    const docRef = await db.collection('orders').add(data);
    console.log(`created a order with the id: ${docRef.id}`);

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

    await createNotification(
      data.buyerId,
      "purchase",
      "Order Confirmed",
      `You bought ${itemName}.`,
      "/profile?tab=purchases"
    );

    await createNotification(
      data.sellerId,
      "sale",
      "Item Sold!",
      `You sold ${itemName}.`,
      "/profile?tab=selling"
    );

    return JSON.stringify({status: "order created!"})

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