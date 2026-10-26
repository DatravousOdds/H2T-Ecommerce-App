"use strict";

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// "YYYY-MM" keys for the last `count` calendar months (UTC), oldest first.
function monthKeys(nowMs, count = 6) {
  const now = new Date(nowMs);
  const keys = [];
  for (let i = count - 1; i >= 0; i--) {
    // Date.UTC rolls negative months back into the previous year.
    keys.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
  }
  return keys;
}

function emptyUserTally(nowMs) {
  return {
    total: 0,
    signedUp30d: 0,
    active30d: 0,
    // 30-day retention = retained / signedUpBefore30d: of users old enough
    // to have had 30 days, how many were active in the last 30.
    signedUpBefore30d: 0,
    retained: 0,
    signupsByMonth: Object.fromEntries(monthKeys(nowMs).map((key) => [key, 0]))
  };
}

// Counts one Firebase Auth user into `tally`, so callers can page through
// listUsers() without holding every user in memory. `metadata` is the
// UserRecord's metadata: UTC date strings, lastRefreshTime may be null.
function tallyUser(tally, metadata, nowMs) {
  const cutoff = nowMs - WINDOW_MS;
  const created = Date.parse(metadata.creationTime);
  // lastRefreshTime moves whenever the app refreshes a token (roughly hourly
  // while it's open); lastSignInTime only on an explicit login.
  const lastActive = Date.parse(metadata.lastRefreshTime || metadata.lastSignInTime);
  const isActive = lastActive >= cutoff; // NaN (never active) compares false

  tally.total++;
  if (isActive) tally.active30d++;
  if (created >= cutoff) {
    tally.signedUp30d++;
  } else if (created < cutoff) {
    tally.signedUpBefore30d++;
    if (isActive) tally.retained++;
  }

  const month = Number.isNaN(created) ? null : new Date(created).toISOString().slice(0, 7);
  if (month in tally.signupsByMonth) tally.signupsByMonth[month]++;
  return tally;
}

// Money taken and kept. pending = checkout never paid; pending_authentication
// = card only authorized; cancelled/refunded = money released or returned.
const CAPTURED = new Set(["processing", "shipped", "delivered"]);
const STUCK_MS = 3 * 24 * 60 * 60 * 1000;

// Current orders store createdAt as Stripe's seconds; legacy POST /orders
// docs used a Firestore Timestamp.
function orderCreatedMs(createdAt) {
  return typeof createdAt === "number" ? createdAt * 1000 : createdAt?.toMillis?.() ?? NaN;
}

// subtotal is a string like "123.45"; summing in cents avoids float drift.
const toCents = (value) => Math.round((parseFloat(value) || 0) * 100);

// subtotal is the full charge (item + shipping + sales tax + marketplace fee);
// backing those out recovers the item's price -- same derivation as
// calculateSellerPayoutCents in server.js (orders don't store it directly).
function itemValueCents(order) {
  return Math.max(0, toCents(order.subtotal) - toCents(order.shippingCost)
    - toCents(order.item?.salesTax) - toCents(order.item?.marketplaceFee));
}

// `orders`: plain order docs (only the fields the admin endpoint selects).
function summarizeOrders(orders, nowMs) {
  const cutoff = nowMs - WINDOW_MS;
  const summary = {
    total: 0,
    last30d: 0,
    byStatus: {},
    // Orders that were actually charged (captured, incl. later refunded):
    // the denominator for dispute/refund rates, since only these can be
    // disputed or refunded.
    paid: 0,
    captured30d: 0,
    salesCents30d: 0,
    feesCents30d: 0,
    buyers: 0,
    repeatBuyers: 0,
    stuck: 0,
    tier1: { passed: 0, failed: 0 },
    topBrands: [],
    refundsByBuyer: []
  };
  const ordersPerBuyer = new Map();
  const brands = new Map();
  const refunds = new Map();

  for (const order of orders) {
    // Orders from before livemode was stored have no field and count as live.
    if (order.livemode === false) continue;

    const status = order.fulfillmentStatus || "unknown";
    summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;
    if (status === "pending") continue;

    const createdMs = orderCreatedMs(order.createdAt);
    const inWindow = createdMs >= cutoff;
    summary.total++;
    if (inWindow) summary.last30d++;
    if (order.buyerId) ordersPerBuyer.set(order.buyerId, (ordersPerBuyer.get(order.buyerId) || 0) + 1);

    if (order.authenticationStatus === "passed") summary.tier1.passed++;
    if (order.authenticationStatus === "failed") summary.tier1.failed++;

    // Authenticated orders are only charged when they pass review, so money
    // metrics (and "stuck") date from that decision, not from checkout.
    const chargedAtMs = order.authenticationDecidedAt?.toMillis?.() ?? createdMs;

    if (CAPTURED.has(status) || status === "refunded") summary.paid++;
    if (CAPTURED.has(status)) {
      if (chargedAtMs >= cutoff) {
        summary.captured30d++;
        summary.salesCents30d += itemValueCents(order);
        summary.feesCents30d += toCents(order.item?.marketplaceFee);
      }
      const brand = String(order.item?.brand || "").trim();
      if (brand) {
        const key = brand.toLowerCase();
        const entry = brands.get(key) || { brand, sales: 0 };
        entry.sales++;
        brands.set(key, entry);
      }
    }

    if (status === "processing" && nowMs - chargedAtMs > STUCK_MS) summary.stuck++;

    if (status === "refunded") {
      const key = order.buyerId || "unknown";
      const entry = refunds.get(key) || { buyerId: order.buyerId || null, email: order.buyerEmail || null, count: 0, amountCents: 0 };
      entry.count++;
      entry.amountCents += toCents(order.subtotal);
      refunds.set(key, entry);
    }
  }

  summary.buyers = ordersPerBuyer.size;
  for (const count of ordersPerBuyer.values()) if (count >= 2) summary.repeatBuyers++;
  summary.topBrands = [...brands.values()].sort((a, b) => b.sales - a.sales).slice(0, 5);
  summary.refundsByBuyer = [...refunds.values()].sort((a, b) => b.amountCents - a.amountCents).slice(0, 10);
  return summary;
}

// Average photos-submitted -> decision time over orderAuthenticationPhotos
// docs. createdAt resets if a seller resubmits, so this times the last
// submission. Returns null when nothing has been reviewed yet.
function averageReviewMs(photos) {
  let totalMs = 0;
  let reviewed = 0;
  for (const photo of photos) {
    const ms = photo.reviewedAt?.toMillis?.() - photo.createdAt?.toMillis?.();
    if (ms >= 0) { // NaN when either timestamp is missing
      totalMs += ms;
      reviewed++;
    }
  }
  return reviewed ? Math.round(totalMs / reviewed) : null;
}

// `disputes`: docs with { sellerId, status: submitted | upheld | rejected }.
function summarizeDisputes(disputes) {
  const byStatus = { submitted: 0, upheld: 0, rejected: 0 };
  const perSeller = new Map();

  for (const dispute of disputes) {
    if (dispute.status in byStatus) byStatus[dispute.status]++;
    if (!dispute.sellerId) continue;
    const entry = perSeller.get(dispute.sellerId) || { sellerId: dispute.sellerId, disputes: 0, upheld: 0 };
    entry.disputes++;
    if (dispute.status === "upheld") entry.upheld++;
    perSeller.set(dispute.sellerId, entry);
  }

  const topSellers = [...perSeller.values()]
    .sort((a, b) => b.disputes - a.disputes || b.upheld - a.upheld)
    .slice(0, 10);
  return { total: disputes.length, byStatus, topSellers };
}

// `debts`: outstanding sellerDebts docs; remainingAmount is a string like "12.50".
function summarizeSellerDebt(debts) {
  return {
    outstandingCents: debts.reduce((sum, debt) => sum + toCents(debt.remainingAmount), 0),
    sellers: new Set(debts.map((debt) => debt.sellerId)).size
  };
}

// Needs-action counts, each using the same filter as the review page its
// tile links to -- so the tile always matches the queue. Unlike the metrics
// above, these don't skip test-mode orders: the queues don't either.
// `orders`/`photos`/`disputes`: { id, ...fields } with id = order doc id.
function countQueues({ orders, photos, disputes, failedPayouts }) {
  const orderIds = new Set(orders.map((o) => o.id));
  const awaitingAuth = new Set(orders.filter((o) => o.fulfillmentStatus === "pending_authentication").map((o) => o.id));
  return {
    // /api/admin/disputes: submitted disputes on orders that still exist
    disputes: disputes.filter((d) => d.status === "submitted" && orderIds.has(d.id)).length,
    // /api/admin/order-authentications: awaiting auth AND seller has sent photos
    tier1: photos.filter((p) => p.status === "submitted" && awaitingAuth.has(p.id)).length,
    // /api/admin/failed-payouts: every failed payout doc
    failedPayouts,
    // /api/admin/in-transit-orders: shipped with a prepaid label
    inTransit: orders.filter((o) => o.fulfillmentStatus === "shipped" && o.shipstationLabelId).length
  };
}

module.exports = { emptyUserTally, tallyUser, summarizeOrders, averageReviewMs, summarizeDisputes, summarizeSellerDebt, countQueues };

// Self-check: node services/adminStats.js
if (require.main === module) {
  const assert = require("assert");
  const now = Date.parse("2026-10-22T12:00:00Z");

  // Year rollover: Jan looks back into the previous year
  assert.deepStrictEqual(Object.keys(emptyUserTally(Date.parse("2026-01-15T00:00:00Z")).signupsByMonth),
    ["2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01"]);

  const tally = emptyUserTally(now);
  // New this month, active
  tallyUser(tally, { creationTime: "Tue, 20 Oct 2026 10:00:00 GMT", lastRefreshTime: "Wed, 21 Oct 2026 10:00:00 GMT", lastSignInTime: "Tue, 20 Oct 2026 10:00:00 GMT" }, now);
  // Older user, no refresh time, signed in within 30 days -> retained
  tallyUser(tally, { creationTime: "Mon, 01 Jun 2026 10:00:00 GMT", lastRefreshTime: null, lastSignInTime: "Thu, 01 Oct 2026 10:00:00 GMT" }, now);
  // Older than the 6-month chart and inactive
  tallyUser(tally, { creationTime: "Sun, 01 Mar 2026 10:00:00 GMT", lastRefreshTime: null, lastSignInTime: "Sat, 01 Aug 2026 10:00:00 GMT" }, now);
  // Never signed in at all
  tallyUser(tally, { creationTime: "Mon, 05 Oct 2026 10:00:00 GMT", lastRefreshTime: null, lastSignInTime: null }, now);

  assert.strictEqual(tally.total, 4);
  assert.strictEqual(tally.signedUp30d, 2);
  assert.strictEqual(tally.active30d, 2);
  assert.strictEqual(tally.signedUpBefore30d, 2);
  assert.strictEqual(tally.retained, 1);
  assert.strictEqual(tally.signupsByMonth["2026-10"], 2);
  assert.strictEqual(tally.signupsByMonth["2026-06"], 1);
  assert.strictEqual(tally.signupsByMonth["2026-03"], undefined);

  const sec = (iso) => Date.parse(iso) / 1000;
  const ts = (iso) => ({ toMillis: () => Date.parse(iso) });
  const orders = summarizeOrders([
    // Captured this month, buyer A's 1st order
    { buyerId: "A", fulfillmentStatus: "delivered", createdAt: sec("2026-10-10T00:00:00Z"), subtotal: "100.10", item: { brand: "Jordan", marketplaceFee: 10.01 } },
    // Buyer A's 2nd order, brand casing differs; stuck: processing 5 days
    { buyerId: "A", fulfillmentStatus: "processing", createdAt: sec("2026-10-17T00:00:00Z"), subtotal: "50.20", item: { brand: " jordan ", marketplaceFee: 5.02 } },
    // Old shipped orders: paid, outside the 30-day window
    { buyerId: "G", fulfillmentStatus: "shipped", shipstationLabelId: "se-1", createdAt: sec("2026-08-01T00:00:00Z"), subtotal: "10.00" },
    { buyerId: "G", fulfillmentStatus: "shipped", createdAt: sec("2026-08-02T00:00:00Z"), subtotal: "10.00" },
    // Authenticated 20 days ago but only passed yesterday -> not stuck
    { buyerId: "B", fulfillmentStatus: "processing", createdAt: sec("2026-10-02T00:00:00Z"), authenticationStatus: "passed", authenticationDecidedAt: ts("2026-10-21T12:00:00Z"), subtotal: "300.00", item: { brand: "Bape", marketplaceFee: 30 } },
    // Authorized 42 days ago, passed (charged) 2 days ago -> in 30-day sales
    // but not in orders placed. Sales is the item price: 133 - 15 shipping
    // - 8 tax - 10 fee = 100.
    { buyerId: "H", fulfillmentStatus: "delivered", createdAt: sec("2026-09-10T00:00:00Z"), authenticationStatus: "passed", authenticationDecidedAt: ts("2026-10-20T00:00:00Z"), subtotal: "133.00", shippingCost: "15", item: { brand: "Nike", salesTax: 8, marketplaceFee: 10 } },
    // Refunded: counted as paid, not in sales
    { buyerId: "C", buyerEmail: "c@example.com", fulfillmentStatus: "refunded", createdAt: sec("2026-09-01T00:00:00Z"), subtotal: "80.00", item: { brand: "Nike" } },
    // Legacy doc: Timestamp createdAt, no fulfillmentStatus
    { buyerId: "D", createdAt: ts("2026-10-15T00:00:00Z"), subtotal: "20.00" },
    // Unpaid checkout and a test-mode order: both excluded from totals
    { buyerId: "E", fulfillmentStatus: "pending", createdAt: sec("2026-10-20T00:00:00Z"), subtotal: "999.00" },
    { buyerId: "F", fulfillmentStatus: "delivered", livemode: false, createdAt: sec("2026-10-20T00:00:00Z"), subtotal: "999.00" }
  ], now);

  assert.strictEqual(orders.total, 8);
  assert.strictEqual(orders.last30d, 4); // by checkout date: H was placed 42 days ago
  assert.deepStrictEqual(orders.byStatus, { delivered: 2, processing: 2, shipped: 2, refunded: 1, unknown: 1, pending: 1 });
  assert.strictEqual(orders.paid, 7); // not the legacy no-status doc
  assert.strictEqual(orders.captured30d, 4); // by charge date: includes H
  // item prices: 90.09 + 45.18 + 270.00 + 100.00
  assert.strictEqual(orders.salesCents30d, 50527);
  assert.strictEqual(orders.feesCents30d, 5503);
  assert.strictEqual(orders.buyers, 6);
  assert.strictEqual(orders.repeatBuyers, 2);
  assert.strictEqual(orders.stuck, 1);
  assert.deepStrictEqual(orders.tier1, { passed: 2, failed: 0 });
  assert.deepStrictEqual(orders.topBrands, [{ brand: "Jordan", sales: 2 }, { brand: "Bape", sales: 1 }, { brand: "Nike", sales: 1 }]);
  assert.deepStrictEqual(orders.refundsByBuyer, [{ buyerId: "C", email: "c@example.com", count: 1, amountCents: 8000 }]);

  assert.deepStrictEqual(countQueues({
    orders: [
      { id: "o1", fulfillmentStatus: "pending_authentication" }, // photos submitted -> queued
      { id: "o2", fulfillmentStatus: "pending_authentication" }, // waiting on seller -> not queued
      { id: "o3", fulfillmentStatus: "shipped", shipstationLabelId: "se-1" },
      { id: "o4", fulfillmentStatus: "shipped" }, // self-ship: not tracked in transit
      { id: "o5", fulfillmentStatus: "delivered" }
    ],
    photos: [
      { id: "o1", status: "submitted" },
      { id: "o3", status: "passed" },
      { id: "gone", status: "submitted" } // order deleted: not on the review page
    ],
    disputes: [
      { id: "o5", status: "submitted" },
      { id: "o4", status: "upheld" },
      { id: "gone", status: "submitted" }
    ],
    failedPayouts: 2
  }), { disputes: 1, tier1: 1, failedPayouts: 2, inTransit: 1 });

  assert.strictEqual(averageReviewMs([]), null);
  assert.strictEqual(averageReviewMs([
    { createdAt: ts("2026-10-20T10:00:00Z"), reviewedAt: ts("2026-10-20T12:00:00Z") }, // 2h
    { createdAt: ts("2026-10-21T10:00:00Z"), reviewedAt: ts("2026-10-21T14:00:00Z") }, // 4h
    { createdAt: ts("2026-10-21T10:00:00Z"), reviewedAt: null } // still pending: ignored
  ]), 3 * 60 * 60 * 1000);

  const disputes = summarizeDisputes([
    { sellerId: "S1", status: "upheld" },
    { sellerId: "S1", status: "submitted" },
    { sellerId: "S2", status: "upheld" },
    { sellerId: "S2", status: "upheld" },
    { sellerId: "S3", status: "rejected" }
  ]);
  assert.strictEqual(disputes.total, 5);
  assert.deepStrictEqual(disputes.byStatus, { submitted: 1, upheld: 3, rejected: 1 });
  // S1 and S2 tie on disputes; S2 ranks first on more upheld
  assert.deepStrictEqual(disputes.topSellers.map((s) => s.sellerId), ["S2", "S1", "S3"]);

  assert.deepStrictEqual(summarizeSellerDebt([
    { sellerId: "S1", remainingAmount: "12.50" },
    { sellerId: "S1", remainingAmount: "0.10" },
    { sellerId: "S2", remainingAmount: "7.20" }
  ]), { outstandingCents: 1980, sellers: 2 });
  console.log("adminStats self-check passed");
}
