"use strict";
require("dotenv").config();
const { initializeFirebase } = require("./firebase");

async function run() {
  const { admin, db } = initializeFirebase();
  const email = "chart-debug-test@example.com";
  const password = "TestPassword123!";

  let user;
  try {
    user = await admin.auth().getUserByEmail(email);
    console.log("Reusing existing test user:", user.uid);
  } catch (e) {
    user = await admin.auth().createUser({ email, password, displayName: "Chart Debug" });
    console.log("Created test user:", user.uid);
  }

  const uid = user.uid;

  await db.collection("users").doc(uid).set({
    createdAt: new Date(),
    userId: uid,
    name: "Chart Debug",
    phoneNumber: "5555555555",
    tac: true,
    notification: false,
    email,
    seller: true
  }, { merge: true });

  await db.collection("userProfiles").doc(uid).set({
    userId: uid,
    email,
    firstName: "Chart",
    lastName: "Debug",
    phoneNumber: "5555555555",
    username: "chartdebug",
    backgroundImage: "",
    profileImage: "",
    notification: false,
    tac: true,
    isVerified: false,
    accountInfo: { joinedDate: new Date() },
    shipping: { address: "1 Main St", address2: "", city: "Kansas City", state: "MO", zipCode: "64101", country: "US", phoneNumber: "5555555555" },
    stats: { followers: 0, following: 0, rating: 0 },
    ratings: { metrics: { averageRating: 0, totalRatings: 0 }, ratingCount: {} }
  }, { merge: true });

  const listingRef = db.collection("listings").doc();
  await listingRef.set({
    userId: uid,
    productName: "Chart Debug Sneaker",
    originalPrice: 120,
    status: "active",
    brand: "nike",
    condition: "good",
    size: "10",
    category: "sneakers",
    categoryMeta: "men",
    description: "seed data for chart debugging",
    availableForTrade: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    images: []
  });
  console.log("Created listing:", listingRef.id);

  const batch = db.batch();
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const orderRef = db.collection("orders").doc();
    batch.set(orderRef, {
      id: `test_${orderRef.id}`,
      buyerId: `test-buyer-${i}`,
      sellerId: uid,
      buyerEmail: `test-buyer-${i}@example.com`,
      listingId: listingRef.id,
      createdAt: Math.floor(d.getTime() / 1000),
      subtotal: (100 + i * 10).toFixed(2),
      status: "succeeded",
      shippingCost: "0.00",
      item: { name: "Chart Debug Sneaker", brand: "nike" }
    });
  }
  await batch.commit();
  console.log("Seeded 5 orders");

  console.log("\nLogin with:", email, "/", password);
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
