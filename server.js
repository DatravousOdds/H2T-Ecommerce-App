"use strict";
const jwt = require("jsonwebtoken");
require("dotenv").config();

const { generateToken } = require("./tokenUtils");

// importing packages
const express = require("express");
const bcrypt = require("bcrypt");
const path = require("path");
const nodemailer = require("nodemailer");
const easyship = require('@api/easyship');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

easyship.auth(process.env.EASYSHIP_KEY);



// Import Firebase configuration
const { initializeFirebase, getDb, getAdmin } = require("./firebase");
const { verifyAuth } = require("./middleware/auth.js");

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

app.post("/signup", async (req, res) => {
  let { name, email, password, number, tac, notification } = req.body;

  // form validations
  if (name.length < 3) {
    return res.json({ alert: "name must be 3 letters long" });
  } else if (!email.length) {
    return res.json({ alert: "enter your email" });
  } else if (password.length < 8) {
    return res.json({ alert: "password should be 8 letters long" });
  } else if (!number.length) {
    return res.json({ alert: "enter your phone number" });
  } else if (!Number(number) || number.length < 10) {
    return res.json({ alert: "invalid number, please enter valid one" });
  } else if (!tac) {
    return res.json({ alert: "you must agree to our terms and conditions" });
  }

  // Get user from database
  const userDoc = await db.collection("users").doc(email).get();
  console.log(userDoc);
  if (userDoc.exists) {
    return res.json({ alert: "email already exists" });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user object
  const userData = {
    name,
    email,
    password: hashedPassword,
    number,
    notification: notification || false,
    seller: false,
    createdAt: new Date().toISOString()
  };

  // Save user to database
  await db.collection("users").doc(email).set(userData);

  // Create JWT token
  const token = jwt.sign({ email, seller: false }, process.env.JWT_SECRET, {
    expiresIn: "24h"
  });

  // Return success with token
  res.status(201).json({
    success: true,
    data: {
      name,
      email,
      token
    }
  });
});

// login route
app.get("/login", (req, res) => {
  res.sendFile(path.join(staticPth, "login.html"));
});

app.post("/login", (req, res) => {
  let { email, password } = req.body;

  if (!email.length || !password.length) {
    return res.json({ alert: "fill all the inputs" });
  }

  db.collection("users")
    .doc(email)
    .get()
    .then((user) => {
      if (!user.exists) {
        // email does not exists
        return res.json({ alert: "log in email does not exists " });
      } else {
        bcrypt.compare(password, user.data().password, (err, result) => {
          if (result) {
            let data = user.data();
            // generate auth token
            const token = generateToken(email);
            return res.json({
              success: true,
              data: {
                name: data.name,
                email: data.email,
                seller: data.seller,
                token: token
              }
            });
          } else {
            return res.json({ alert: "password in incorrect" });
          }
        });
      }
    })
    .catch((err) => {
      console.error("Login error:", err);
      return res.json({ alert: "An error occured during login" });
    });
});

// seller route
app.get("/seller", (req, res) => {
  res.sendFile(path.join(staticPth, "seller/seller.html"));
});

app.post("/seller", (req, res) => {
  let { name, about, addy, num, terms, realinfo, email } = req.body;
  if (
    !name.length ||
    !addy.length ||
    !about.length ||
    num.length < 10 ||
    !Number(num)
  ) {
    return res.json({ alert: "some information(s) is/are invalid" });
  } else if (!terms || !realinfo) {
    return res.json({ alert: "you must agree to our terms and conditions" });
  } else {
    // update users seller status here.
    db.collection("sellers")
      .doc(email)
      .set(req.body)
      .then((data) => {
        db.collection("users")
          .doc(email)
          .update({
            seller: true
          })
          .then((data) => {
            res.json(true);
          });
      });
  }
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
  const uid = req.token;
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
  
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(priceData[0].price * 100),
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: {
        buyer_id: priceData[0].buyerId,
        buyer_email: priceData[0].buyerEmail,
        seller_id: priceData[0].sellerId,
        shipping_cost: priceData[0].shippingCost,
        shipping_from: priceData[0].shippingFrom,
        item: JSON.stringify({
          name: priceData[0].productName,
          size: priceData[0].size,
          brand: priceData[0].brand,
          image: priceData[0].image,
          salesTax: parseFloat(priceData[0].salesTax),
          marketplaceFee: parseFloat(priceData[0].marketplaceFee)
        })

      },
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
    const { listingId } = req.body;
    // console.log('id', listingId)

    try {
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
  const uid = req.token;
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
  const uid = req.token;
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
  const uid  = req.token;
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



async function handlePaymentIntentSucceeded(paymentData){
  console.log(paymentData)
  try {
    const data = {
      id: paymentData.id,
      buyerId: paymentData.metadata.buyer_id,
      sellerId: paymentData.metadata.seller_id,
      buyerEmail: paymentData.metadata.buyer_email,
      createdAt: paymentData.created,
      subtotal: (paymentData.amount / 100).toFixed(2),
      status: paymentData.status,
      shippingCost: paymentData.metadata.shipping_cost,
      shippingAddress: paymentData.metadata.shipping_from,
      item: JSON.parse(paymentData.metadata.item)
    }

    const docRef = await db.collection('orders').add(data);
    console.log(`created a order with the id: ${docRef.id}`);
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
