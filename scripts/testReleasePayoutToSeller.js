"use strict";
require("dotenv").config();

// Throwaway test harness for releasePayoutToSeller -- same pattern as
// scripts/testCreditShopCommission.js. Function bodies below are copied
// verbatim from server.js (as of the funds_pending / insufficient_balance
// change) so this can run without booting the whole Express app. Delete
// this file once testing is done.
//
// Usage: node scripts/testReleasePayoutToSeller.js <orderId>
//
// Prerequisite: an orders/{orderId} doc that already exists, e.g.
//   {
//     sellerId: '<a real userProfiles doc id>',
//     subtotal: '10.00', shippingCost: '0.00',
//     item: { salesTax: '0.00', marketplaceFee: '0.00' },
//     promoFeeWaived: true, stripeFeeCents: 33,
//     availableAt: <Firestore Timestamp, future = funds_pending, past/absent = proceeds>
//   }
// and a userProfiles/{sellerId} doc with a real Connect account, e.g.
//   { stripeConnectAccountId: 'acct_...', connectPayoutsEnabled: true }
//
// Optional, to also exercise the debt-then-fee ordering: one or more
// sellerDebts docs for that sellerId with status: 'outstanding'.

const { initializeFirebase } = require("../firebase");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Timing instrumentation -- not part of the real server.js function bodies,
// added only in this throwaway script to answer "how long does each step
// take". Wraps a call, logs its duration, rethrows/returns unchanged.
async function timed(label, fn) {
  const t0 = Date.now();
  try {
    return await fn();
  } finally {
    console.log(`  [timing] ${label}: ${Date.now() - t0}ms`);
  }
}

function calculateSellerPayoutCents(order) {
  const toCents = (v) => Math.round(parseFloat(v || 0) * 100);

  const subtotalCents = toCents(order.subtotal);
  const shippingCents = toCents(order.shippingCost);
  const salesTaxCents = toCents(order.item?.salesTax);
  const marketplaceFeeCents = toCents(order.item?.marketplaceFee);

  const listingPriceCents = subtotalCents - shippingCents - salesTaxCents - marketplaceFeeCents;
  return listingPriceCents - marketplaceFeeCents;
}

async function getOutstandingSellerDebts(db, sellerId) {
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

async function settleSellerDebts(db, admin, debts, amountCents) {
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

async function releasePayoutToSeller(db, admin, order, orderId) {
  try {
    await timed("creditShopCommission", () => creditShopCommission(db, admin, orderId));
  } catch (err) {
    console.error(`Failed to credit shop commission for order ${orderId}:`, err.message);
  }

  const payoutRef = db.collection("payouts").doc(orderId);
  const t0 = Date.now();
  const grossAmountCents = calculateSellerPayoutCents(order);
  console.log(`  [timing] calculateSellerPayoutCents: ${Date.now() - t0}ms`);

  const { debts, totalCents: outstandingDebtCents } = await timed("getOutstandingSellerDebts", () => getOutstandingSellerDebts(db, order.sellerId));
  const debtAppliedCents = Math.min(grossAmountCents, outstandingDebtCents);
  const afterDebtCents = grossAmountCents - debtAppliedCents;
  const debtApplied = (debtAppliedCents / 100).toFixed(2);

  const stripeFeeCents = order.promoFeeWaived ? (order.stripeFeeCents || 0) : 0;
  const netAmountCents = Math.max(0, afterDebtCents - stripeFeeCents);
  const stripeFeeApplied = (Math.min(stripeFeeCents, afterDebtCents) / 100).toFixed(2);

  console.log("\nBreakdown:", {
    grossAmountCents,
    outstandingDebtCents,
    debtAppliedCents,
    afterDebtCents,
    stripeFeeCents,
    netAmountCents,
    availableAt: order.availableAt ? order.availableAt.toDate().toISOString() : null,
    now: new Date().toISOString()
  });

  if (netAmountCents === 0) {
    try {
      await timed("settleSellerDebts (absorbed path)", () => settleSellerDebts(db, admin, debts, debtAppliedCents));
      const absorbed = {
        orderId,
        sellerId: order.sellerId,
        amount: "0.00",
        debtApplied,
        stripeFeeApplied,
        status: afterDebtCents === 0 ? "absorbed_by_debt" : "absorbed_by_fee",
        stripeTransferId: null,
        payoutHoldReason: null,
        lastError: null,
        availableAt: null,
        attemptedAt: admin.firestore.FieldValue.serverTimestamp(),
        transferredAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await payoutRef.set(absorbed);
      return absorbed;
    } catch (debtSettlementError) {
      const failure = {
        orderId,
        sellerId: order.sellerId,
        amount: "0.00",
        debtApplied,
        stripeFeeApplied,
        status: "failed",
        stripeTransferId: null,
        payoutHoldReason: "debt_settlement_error",
        lastError: debtSettlementError.message,
        availableAt: null,
        attemptedAt: admin.firestore.FieldValue.serverTimestamp(),
        transferredAt: null
      };
      await payoutRef.set(failure);
      return failure;
    }
  }

  const sellerSnap = await timed("userProfiles.get (seller)", () => db.collection("userProfiles").doc(order.sellerId).get());
  const seller = sellerSnap.data() || {};

  if (!seller.stripeConnectAccountId || !seller.connectPayoutsEnabled) {
    const failure = {
      orderId,
      sellerId: order.sellerId,
      amount: (netAmountCents / 100).toFixed(2),
      debtApplied,
      stripeFeeApplied,
      status: "failed",
      stripeTransferId: null,
      payoutHoldReason: "connect_account_not_ready",
      lastError: null,
      availableAt: null,
      attemptedAt: admin.firestore.FieldValue.serverTimestamp(),
      transferredAt: null
    };
    await payoutRef.set(failure);
    return failure;
  }

  if (order.availableAt && order.availableAt.toMillis() > Date.now()) {
    const failure = {
      orderId,
      sellerId: order.sellerId,
      amount: (netAmountCents / 100).toFixed(2),
      debtApplied,
      stripeFeeApplied,
      status: "failed",
      stripeTransferId: null,
      payoutHoldReason: "funds_pending",
      lastError: null,
      availableAt: order.availableAt,
      attemptedAt: admin.firestore.FieldValue.serverTimestamp(),
      transferredAt: null
    };
    await payoutRef.set(failure);
    return failure;
  }

  try {
    const transfer = await timed("stripe.transfers.create", () => stripe.transfers.create({
      amount: netAmountCents,
      currency: "usd",
      destination: seller.stripeConnectAccountId
    }));

    await timed("settleSellerDebts (transferred path)", () => settleSellerDebts(db, admin, debts, debtAppliedCents));

    const success = {
      orderId,
      sellerId: order.sellerId,
      amount: (netAmountCents / 100).toFixed(2),
      debtApplied,
      stripeFeeApplied,
      status: "transferred",
      stripeTransferId: transfer.id,
      payoutHoldReason: null,
      lastError: null,
      availableAt: null,
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
      stripeFeeApplied,
      status: "failed",
      stripeTransferId: null,
      payoutHoldReason: stripeError.code === "balance_insufficient" ? "insufficient_balance" : "stripe_error",
      lastError: stripeError.message,
      availableAt: null,
      attemptedAt: admin.firestore.FieldValue.serverTimestamp(),
      transferredAt: null
    };
    await payoutRef.set(failure);
    return failure;
  }
}

async function run() {
  const orderId = process.argv[2];
  if (!orderId) {
    console.error("Usage: node scripts/testReleasePayoutToSeller.js <orderId>");
    process.exit(1);
  }

  const { admin, db } = initializeFirebase();

  const orderSnap = await db.collection("orders").doc(orderId).get();
  if (!orderSnap.exists) {
    console.error(`orders/${orderId} not found`);
    process.exit(1);
  }
  const order = orderSnap.data();

  console.log(`Calling releasePayoutToSeller for order ${orderId}...`);
  console.log("Order fields used:", {
    sellerId: order.sellerId,
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    salesTax: order.item?.salesTax,
    marketplaceFee: order.item?.marketplaceFee,
    promoFeeWaived: order.promoFeeWaived,
    stripeFeeCents: order.stripeFeeCents,
    availableAt: order.availableAt ? order.availableAt.toDate().toISOString() : null
  });

  const total0 = Date.now();
  const result = await releasePayoutToSeller(db, admin, order, orderId);
  console.log(`  [timing] releasePayoutToSeller TOTAL: ${Date.now() - total0}ms`);
  console.log("\nResult:", JSON.stringify(result, null, 2));
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  });
