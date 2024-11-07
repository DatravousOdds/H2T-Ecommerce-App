"use strict";

// importing packages
const express = require("express");
const admin = require("firebase-admin");
const bcrypt = require("bcrypt");
const path = require("path");
const nodemailer = require("nodemailer");

// firebase admin setup
let serviceAccount = require("./ecom-website-94d87-firebase-adminsdk-uzg8o-a9f385696e.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

let db = admin.firestore();

// aws config
const aws = require("aws-sdk");
const dotenv = require("dotenv");

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
app.use(express.static(staticPth));
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

app.post("/signup", (req, res) => {
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

  // store user in db
  db.collection("users")
    .doc(email)
    .get()
    .then((user) => {
      if (user.exists) {
        return res.json({ alert: "email already exists" });
      } else {
        // encrypt the password before storing it.
        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(password, salt, (err, hash) => {
            req.body.password = hash;
            db.collection("users")
              .doc(email)
              .set(req.body)
              .then((data) => {
                res.json({
                  name: req.body.name,
                  email: req.body.email,
                  seller: req.body.seller
                });
              });
          });
        });
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
            return res.json({
              name: data.name,
              email: data.email,
              seller: data.seller
            });
          } else {
            return res.json({ alert: "password in incorrect" });
          }
        });
      }
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
  res.redirect("/404");
});

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`listening on port ${port}.......`);
});
