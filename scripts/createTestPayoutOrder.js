"use strict";
require("dotenv").config();

// Throwaway fixture creator for testReleasePayoutToSeller.js. Delete this
// file once testing is done.
//
// Two modes, selected by the second CLI arg:
//
// "debt" (default, no availableAt -- exercises the debt-then-fee ordering,
// same fixture used earlier this session):
//   gross = $50.00 (subtotal, no shipping/tax/marketplaceFee)
//   debt  = $45.00 outstanding -> debtApplied = $45.00, leaves $5.00
//   fee   = $1.75 (promoFeeWaived) -> comes out of that $5.00, leaves $3.25
//   expected transferred amount: $3.25
//
// "future" / "past" -- exercises the new funds_pending gate in isolation
// (no debt, no fee), setting availableAt to +/- 1 day from now:
//   gross = $10.00, expect "future" to stop at funds_pending,
//   "past" to proceed past the gate same as if availableAt were absent.
//
// Usage: node scripts/createTestPayoutOrder.js <sellerId> [debt|future|past]

const { initializeFirebase } = require("../firebase");

async function run() {
  const sellerId = process.argv[2];
  const mode = process.argv[3] || "debt";
  if (!sellerId || !["debt", "future", "past"].includes(mode)) {
    console.error("Usage: node scripts/createTestPayoutOrder.js <sellerId> [debt|future|past]");
    process.exit(1);
  }

  const { admin, db } = initializeFirebase();

  const orderId = `test-payout-${mode}-${Date.now()}`;

  if (mode === "debt") {
    await db.collection("orders").doc(orderId).set({
      sellerId,
      subtotal: "50.00",
      shippingCost: "0.00",
      item: {
        name: "Throwaway test item",
        salesTax: "0.00",
        marketplaceFee: "0.00"
      },
      promoFeeWaived: true,
      stripeFeeCents: 175,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const debtRef = await db.collection("sellerDebts").add({
      sellerId,
      remainingAmount: "45.00",
      status: "outstanding",
      reason: "throwaway test fixture",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Created orders/${orderId}`);
    console.log(`Created sellerDebts/${debtRef.id}`);
  } else {
    const offsetMs = (mode === "future" ? 1 : -1) * 24 * 60 * 60 * 1000;
    const availableAt = admin.firestore.Timestamp.fromMillis(Date.now() + offsetMs);

    await db.collection("orders").doc(orderId).set({
      sellerId,
      subtotal: "100.00",
      shippingCost: "0.00",
      item: {
        name: "Throwaway test item",
        salesTax: "0.00",
        marketplaceFee: "0.00"
      },
      promoFeeWaived: false,
      stripeFeeCents: null,
      availableAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Created orders/${orderId} with availableAt ${mode} (${availableAt.toDate().toISOString()})`);
  }

  console.log(`\nRun next: node scripts/testReleasePayoutToSeller.js ${orderId}`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  });
