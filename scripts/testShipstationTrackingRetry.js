"use strict";

// Runs the real handler without starting the server or contacting Firestore.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { planTrackingUpdate, DELIVERED } = require("../services/shipstationTracking");
const source = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
const start = source.indexOf("async function handleShipstationTrackingUpdate(");
const end = source.indexOf("\napp.use(express.json());", start);
assert.ok(start >= 0 && end > start, "tracking handler must exist");

function harness(status = "processing") {
  let order = { fulfillmentStatus: status, trackingNumber: "1ZTEST", buyerId: "buyer", sellerId: "seller", item: { name: "Shoes" } };
  const notifications = [];
  let failShip = false;
  let confirmedStatus = "DE";
  let queue = Promise.resolve();
  const snapshot = () => ({ data: () => ({ ...order }) });
  const orderRef = { get: async () => snapshot() };
  const context = {
    planTrackingUpdate, DELIVERED, console: { error() {} },
    admin: { firestore: { FieldValue: { serverTimestamp: () => new Date() } } },
    db: {
      // Serialize commits, including pending writes: a failed callback commits nothing.
      runTransaction(callback) {
        const result = queue.then(async () => {
          let pending;
          const value = await callback({ get: async () => snapshot(), update: (_ref, fields) => { pending = fields; } });
          if (pending) {
            if (pending.lastTrackingEventAt) {
              const ms = pending.lastTrackingEventAt.getTime();
              pending.lastTrackingEventAt = { toMillis: () => ms };
            }
            order = { ...order, ...pending };
          }
          return value;
        });
        queue = result.catch(() => {});
        return result;
      }
    },
    async markOrderShipped() {
      if (failShip) { failShip = false; throw new Error("temporary ship failure"); }
      if (order.fulfillmentStatus === "processing") order.fulfillmentStatus = "shipped";
    },
    async markOrderDelivered() {
      if (order.fulfillmentStatus === "shipped") order.fulfillmentStatus = "delivered";
    },
    getLabelTracking: async () => ({ status_code: confirmedStatus }),
    createNotification: async (...args) => { notifications.push(args); }
  };
  const handler = vm.runInNewContext(source.slice(start, end) + "\nhandleShipstationTrackingUpdate", context);
  return {
    run: (event) => handler(orderRef, "se-test", event),
    order: () => order,
    notifications,
    failNextShip: () => { failShip = true; },
    confirm: (code) => { confirmedStatus = code; }
  };
}

const event = (code, extra = {}) => ({
  tracking_number: "1ZTEST", status_code: code,
  events: [{ occurred_at: "2026-05-02T12:00:00Z", status_code: code }], ...extra
});

async function run() {
  for (const [payload, title, recipients] of [
    [event("IT", { status_detail_code: "OUT_FOR_DELIVERY" }), "Out for Delivery", ["buyer"]],
    [event("AT"), "Delivery Attempted", ["buyer", "seller"]]
  ]) {
    const h = harness();
    h.failNextShip();
    await assert.rejects(h.run(payload), /temporary ship failure/);
    assert.equal(h.order().lastTrackingEventAt, undefined, "failed transition must not consume tracking event");
    assert.equal(h.order().outForDeliveryNotifiedAt, undefined, "failed transition must not claim notification");
    assert.equal(h.notifications.length, 0);
    await h.run(payload);
    assert.equal(h.order().fulfillmentStatus, "shipped");
    assert.deepEqual(h.notifications.map(([user, , heading]) => [user, heading]), recipients.map(user => [user, title]));
    await Promise.all(Array.from({ length: 5 }, () => h.run(payload)));
    assert.equal(h.notifications.length, recipients.length, "retries must not duplicate notifications");

    const racing = harness();
    await Promise.all(Array.from({ length: 5 }, () => racing.run(payload)));
    assert.equal(racing.notifications.length, recipients.length, "concurrent first deliveries must claim each notification once");
  }

  const mismatch = harness();
  await mismatch.run(event("IT", { tracking_number: "OTHER", status_detail_code: "OUT_FOR_DELIVERY" }));
  assert.equal(mismatch.order().fulfillmentStatus, "processing");
  assert.equal(mismatch.order().lastTrackingEventAt, undefined);
  assert.equal(mismatch.notifications.length, 0);

  for (const status of ["cancelled", "refunded", "delivered"]) {
    const h = harness(status);
    await h.run(event("AT"));
    assert.equal(h.order().fulfillmentStatus, status);
    assert.equal(h.notifications.length, 0);
  }

  const delivery = harness();
  delivery.confirm("IT");
  await assert.rejects(delivery.run(event("DE")), /not marking delivered yet/);
  assert.equal(delivery.order().lastTrackingEventAt, undefined, "unconfirmed delivery must remain retriable");
  delivery.confirm("DE");
  await delivery.run(event("DE"));
  assert.equal(delivery.order().fulfillmentStatus, "delivered");
  assert.ok(delivery.order().lastTrackingEventAt);
  console.log("ShipStation tracking retry self-check passed.");
}

run().catch(error => { console.error(error); process.exitCode = 1; });
