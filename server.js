"use strict";
const jwt = require("jsonwebtoken");
require("dotenv").config();

const { generateToken } = require("./tokenUtils");

// importing packages
const express = require("express");
const bcrypt = require("bcrypt");
const path = require("path");
const nodemailer = require("nodemailer");

// Import Firebase configuration
const { initializeFirebase, getDb, getAdmin } = require("./firebase");

// Initialize Firebase
const { admin, db } = initializeFirebase();
// firebase admin setup
// try {
//   if (!process.env.FIREBASE_CONFIG) {
//     console.error("❌ Missing FIREBASE_CONFIG environment variable");
//     process.exit(1);
//   }

//   console.log("Using environment variable configuration...");
//   const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);

//   // Test Firebase connection
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount)
//   });

//   console.log("✅ Firebase connection successful!");
// } catch (error) {
//   console.error("❌ Error with Firebase configuration:", error);
//   console.error("Error details:", error.message);
//   process.exit(1);
// }

// let db = admin.firestore();

// aws config
const aws = require("aws-sdk");
const dotenv = require("dotenv");
const { data } = require("jquery");

dotenv.config();

// aws parameters
const region = "us-east-1";
const bucketName = "ecom-websiteh2t";
const accessKeyId = process.env.aws_access_key_id;
const secretKeyId = process.env.aws_secret_access_key;

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

app.use(express.json());

// route
// home route
app.get("/", (req, res) => {
  res.sendFile(path.join(staticPth, "index.html"));
});
// mens page route
app.get("/mens", (req, res) => {
  res.sendFile(path.join(staticPth, "mens.html"));
});

// women page route
app.get("/women", (req, res) => {
  res.sendFile(path.join(staticPth, "women.html"));
});

// accessories page route
app.get("/accessories", (req, res) => {
  res.sendFile(path.join(staticPth, "accessories.html"));
});
// accessories page route
app.get("/contact", (req, res) => {
  res.sendFile(path.join(staticPth, "contact.html"));
});

//login route
app.get("/login", (req, res) => {
  res.sendFile(path.join(staticPth, "login.html"));
});

//profile route
app.get("/profile", (req, res) => {
  res.sendFile(path.join(staticPth, "profile.html"));
});

//signup route
app.get("/signup", (req, res) => {
  res.sendFile(path.join(staticPth, "signup.html"));
});

//list product route
app.get("/list-product", (req, res) => {
  res.sendFile(path.join(staticPth, "list-product.html"));
});

// trade request route
app.get("/trade-request", (req, res) => {
  res.sendFile(path.join(staticPth, "trade-request.html"));
});

// view trade request route
app.get("/view-trade-request", (req, res) => {
  res.sendFile(path.join(staticPth, "viewTradeRequest.html"));
});

// sell to us route
app.get("/sell-to-us", (req, res) => {
  res.sendFile(path.join(staticPth, "sell-to-us.html"));
});

// releases route
app.get("/releases", (req, res) => {
  res.sendFile(path.join(staticPth, "releases.html"));
});

// authentication route
app.get("/authenticate", (req, res) => {
  res.sendFile(path.join(staticPth, "authenticate.html"));
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
  res.sendFile(path.join(staticPth, "seller.html"));
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

// product page
app.get("/products/:id", (req, res) => {
  res.sendFile(path.join(staticPth, "product.html"));
});

app.get("/search/:key", (req, res) => {
  res.sendFile(path.join(staticPth, "search.html"));
});

app.get("/cart", (req, res) => {
  res.sendFile(path.join(staticPth, "cart.html"));
});

app.get("/checkout", (req, res) => {
  res.sendFile(path.join(staticPth, "checkout.html"));
});

app.post("/order", (req, res) => {
  const { order, email, add } = req.body;

  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD
    }
  });

  const mailOption = {
    from: "valid sender email id",
    to: email,
    subject: "Clothing: Order Placed",
    html: `
        <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>

    <style>
        body{
            min-height: 90vh;
            background: #f5f5f5;
            font-family: sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .heading{
            text-align: center;
            font-size: 40px;
            width: 50%;
            display: block;
            line-height: 50px;
            margin: 30px auto 60px;
            text-transform: capitalize;
        }
        .heading span{
            font-weight: 300;
        }

        .btn{
            width: 200px;
            height: 50px;
            border-radius: 5px;
            background: red;
            color: #f5f5f5;
            display: block;
            margin: auto;
            font-size: 18px;
            text-transform: capitalize;
        }
    </style>



</head>
<body>
    
<div>
    <h1 class="heading">dear ${
      email.split("@")[0]
    }, <span>your order is successfully placed</span></h1>
    <button class="btn"> check status</button>
</div>


</body>
</html>
        `
  };

  let docName = email + Math.floor(Math.random() * 123719287419824);
  db.collection("order")
    .doc(docName)
    .set(req.body)
    .then((data) => {
      transporter.sendMail(mailOption, (err, info) => {
        if (err) {
          res.json({
            alert: "opps! it looks like some error occured. Try again"
          });
        } else {
          res.json({ alert: "your order has been placed " });
        }
      });
    });
});

// 404 route
app.get("/404", (req, res) => {
  res.sendFile(path.join(staticPth, "404.html"));
});

app.use((req, res) => {
  if (req.path.endsWith(".js")) {
    res.type("application/javascript");
    res.status(404).send("// Module not found");
  } else {
    res.redirect("/404");
  }
});

const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`listening on port ${port}.......`);
});
