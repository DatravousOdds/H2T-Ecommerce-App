"use strict";
require("dotenv").config();

// Throwaway test harness for creditShopCommission -- see the "Testing
// Checklist" Notion doc, section 1. Not wired into server.js; the function
// body below is copied verbatim from server.js so this can run without
// booting the whole Express app. Delete this file once testing is done.
//
// Usage: node scripts/testCreditShopCommission.js [orderId]
//   defaults to 'test-order-1' to match the checklist's fixture.
//
// Prerequisite: a redemptions doc already exists with that orderId, e.g.
//   { orderId: 'test-order-1', shopCode: '<your test code>',
//     commissionAmount: 5.00, refunded: false, commissionSettled: false }

const { initializeFirebase } = require("../firebase");

async function creditShopCommission(db, admin, orderId) {
  const redemptionsSnap = await db.collection('redemptions')
    .where('orderId', '==', orderId)
    .where('refunded', '==', false)
    .where('commissionSettled', '==', false)
    .get();

  if (redemptionsSnap.empty) {
    console.log(`No uncredited redemptions found for order ${orderId}`);
    return;
  }

  const redemptionRef = redemptionsSnap.docs[0].ref;
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  await db.runTransaction(async (transaction) => {
    const freshRedemptionSnap = await transaction.get(redemptionRef);
    const redemption = freshRedemptionSnap.data();

    if (!redemption || redemption.commissionSettled || redemption.refunded) {
      console.log(`Commission for order ${orderId} already settled or refunded, skipping.`);
      return;
    }

    const commissionCents = Math.round(parseFloat(redemption.commissionAmount || 0) * 100);

    if (commissionCents > 0) {
      const bucketRef = db.collection('shopCommissionBuckets').doc(`${redemption.shopCode}_${month}`);
      const bucketSnap = await transaction.get(bucketRef);

      if (!bucketSnap.exists) {
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const dueAt = new Date(lastDayOfMonth.getTime() + 30 * 24 * 60 * 60 * 1000);

        transaction.set(bucketRef, {
          shopCode: redemption.shopCode,
          month,
          amountCents: commissionCents,
          status: 'open',
          dueAt: admin.firestore.Timestamp.fromDate(dueAt),
          payoutTransferId: null,
          payoutHoldReason: null,
          lastError: null,
          paidAt: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        transaction.update(bucketRef, { amountCents: admin.firestore.FieldValue.increment(commissionCents) });
      }
    }

    transaction.update(redemptionRef, {
      commissionSettled: true,
      settledAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
}

async function run() {
  const orderId = process.argv[2] || 'test-order-1';
  const { admin, db } = initializeFirebase();

  console.log(`Calling creditShopCommission('${orderId}')...`);
  await creditShopCommission(db, admin, orderId);

  // Print resulting state so the checklist's "verify" steps don't require a
  // separate trip to the Firestore console.
  const redemptionsSnap = await db.collection('redemptions').where('orderId', '==', orderId).get();
  if (redemptionsSnap.empty) {
    console.log(`No redemptions doc found for order ${orderId} -- nothing to show.`);
    return;
  }

  const redemption = redemptionsSnap.docs[0].data();
  console.log('\nRedemption doc:', JSON.stringify(redemption, null, 2));

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const bucketRef = db.collection('shopCommissionBuckets').doc(`${redemption.shopCode}_${month}`);
  const bucketSnap = await bucketRef.get();

  console.log(`\nBucket doc (${bucketRef.id}):`, bucketSnap.exists ? JSON.stringify(bucketSnap.data(), null, 2) : '(does not exist)');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
  });
