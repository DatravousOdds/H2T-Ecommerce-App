"use strict";
require("dotenv").config();

const { initializeFirebase } = require("../firebase");

const listingId = process.argv[2];
const count = parseInt(process.argv[3], 10) || 6;

if (!listingId) {
  console.error("Usage: node scripts/seedSalesHistory.js <listingId> [count]");
  console.error("listingId is the Firestore doc id from the 'listings' collection (the ?id= on a product page URL).");
  process.exit(1);
}

// Spreads fake sales across the last 13 months so every chart filter (1M/3M/6M/1Y/All)
// has at least one point to render, with prices wobbling +/-15% around the listing price
// so the line isn't a flat, obviously-fake plateau.
function randomPastDate(monthsAgoMax) {
  const monthsAgo = Math.random() * monthsAgoMax;
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  date.setDate(1 + Math.floor(Math.random() * 27));
  return date;
}

function randomPrice(basePrice) {
  const wobble = 1 + (Math.random() * 0.3 - 0.15);
  return parseFloat((basePrice * wobble).toFixed(2));
}

async function run() {
  const { db } = initializeFirebase();

  const listingSnap = await db.collection("listings").doc(listingId).get();
  if (!listingSnap.exists) {
    throw new Error(`No listing found with id ${listingId}`);
  }

  const listing = listingSnap.data();
  const basePrice = listing.price || 100;

  console.log(`Seeding ${count} fake orders for "${listing.productName}" (${listing.brand})...`);

  const batch = db.batch();

  for (let i = 0; i < count; i++) {
    const date = randomPastDate(13);
    const price = randomPrice(basePrice);

    const docRef = db.collection("orders").doc();
    batch.set(docRef, {
      id: `test_${docRef.id}`,
      buyerId: "test-buyer-uid",
      sellerId: "test-seller-uid",
      buyerEmail: "test-buyer@example.com",
      listingId,
      createdAt: Math.floor(date.getTime() / 1000),
      subtotal: price.toFixed(2),
      status: "succeeded",
      shippingCost: "0.00",
      shippingAddress: null,
      item: {
        name: listing.productName,
        brand: listing.brand,
      },
      isTestData: true,
    });
  }

  await batch.commit();
  console.log(`Done. ${count} fake orders written, all tagged isTestData: true for easy cleanup.`);
}

run().catch((error) => {
  console.error("Failed to seed sales history:", error.message);
  process.exit(1);
});
