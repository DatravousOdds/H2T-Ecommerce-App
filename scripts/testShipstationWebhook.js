"use strict";

// Self-check for the ShipStation V2 tracking webhook's pure logic -- no
// network, no Firebase, safe to run anywhere:
//   node scripts/testShipstationWebhook.js
// Covers services/shipstationTracking.js (what an event should do to an
// order) and services/shipstationWebhookAuth.js (token + RSA signature),
// the two pieces whose mistakes would silently drop or forge deliveries.

const assert = require("assert");
const crypto = require("crypto");
const { parseLabelId, planTrackingUpdate } = require("../services/shipstationTracking");
const { TOKEN_HEADER, verifyShipstationWebhook } = require("../services/shipstationWebhookAuth");

const event = (code, occurredAt, extra = {}) => ({
  tracking_number: "1ZTEST", status_code: code, ...extra,
  events: [{ occurred_at: occurredAt, description: `${code} event`, status_code: code }]
});
const fresh = { fulfillmentStatus: "processing", lastTrackingEventAtMs: null, outForDeliveryNotified: false };
const shipped = { ...fresh, fulfillmentStatus: "shipped" };

async function run() {
  // --- tracking decisions
  assert.strictEqual(parseLabelId("https://api.shipstation.com/v2/labels/se-123/track"), "se-123");
  assert.strictEqual(parseLabelId("https://api.shipstation.com/v2/labels/se-123/void"), null);

  let plan = planTrackingUpdate(fresh, event("NY", "2026-05-01T08:00:00Z"));
  assert.ok(!plan.ship && !plan.deliver && !plan.notifyAttention, "NY only records the snapshot");

  assert.ok(planTrackingUpdate(fresh, event("IT", "2026-05-01T10:00:00Z")).ship, "first scan ships");
  assert.ok(!planTrackingUpdate(fresh, event("EX", "2026-05-01T10:00:00Z")).ship, "EX can precede pickup, never ships");
  assert.ok(planTrackingUpdate(shipped, event("DE", "2026-05-02T12:00:00Z")).deliver, "DE delivers");
  assert.ok(planTrackingUpdate(shipped, event("IT", "2026-05-02T08:00:00Z", { status_detail_code: "OUT_FOR_DELIVERY" })).notifyOutForDelivery);
  assert.ok(!planTrackingUpdate({ ...shipped, outForDeliveryNotified: true }, event("IT", "2026-05-02T09:00:00Z", { status_detail_code: "OUT_FOR_DELIVERY" })).notifyOutForDelivery, "out-for-delivery notifies once");

  const stored = Date.parse("2026-05-02T12:00:00Z");
  plan = planTrackingUpdate({ ...shipped, lastTrackingEventAtMs: stored }, event("AT", "2026-05-01T12:00:00Z"));
  assert.ok(plan.stale && !plan.notifyAttention, "older event: stale, no re-notify");
  plan = planTrackingUpdate({ ...shipped, lastTrackingEventAtMs: stored }, event("DE", "2026-05-02T12:00:00Z"));
  assert.ok(plan.stale && plan.deliver, "a retried DE still finishes the transition");

  for (const fulfillmentStatus of ["cancelled", "refunded", "delivered"]) {
    plan = planTrackingUpdate({ ...fresh, fulfillmentStatus }, event("DE", "2026-05-02T12:00:00Z", { status_detail_code: "OUT_FOR_DELIVERY" }));
    assert.ok(!plan.ship && !plan.deliver && !plan.notifyOutForDelivery, `${fulfillmentStatus} orders are never acted on`);
  }

  // --- webhook auth (local key pair stands in for ShipStation's JWKS)
  const TOKEN = "test-token-abc123";
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const getKey = async (kid) => (kid === "k1" ? publicKey : null);
  const body = '{"resource_type":"TRACK_EVENT_V2"}';
  const signedHeaders = (raw, ts = new Date().toISOString()) => ({
    [TOKEN_HEADER]: TOKEN,
    "x-shipengine-rsa-sha256-key-id": "k1",
    "x-shipengine-rsa-sha256-signature": crypto.createSign("RSA-SHA256").update(`${ts}.${raw}`).sign(privateKey, "base64"),
    "x-shipengine-timestamp": ts
  });
  const verify = (headers, raw = body, expectedToken = TOKEN) => verifyShipstationWebhook(headers, raw, { expectedToken, getKey });

  assert.strictEqual((await verify({ [TOKEN_HEADER]: TOKEN }, body, null)).status, 503, "unset token fails closed");
  assert.strictEqual((await verify({ [TOKEN_HEADER]: "wrong-token-xyz12" })).status, 401);
  assert.deepStrictEqual(await verify(signedHeaders(body)), { ok: true, signed: true });
  assert.strictEqual((await verify(signedHeaders(body), body.replace("V2", "V3"))).status, 401, "tampered body rejected");
  assert.strictEqual((await verify(signedHeaders(body, new Date(Date.now() - 6 * 60 * 1000).toISOString()))).status, 400, "stale timestamp rejected");
  const partial = signedHeaders(body); delete partial["x-shipengine-timestamp"];
  assert.strictEqual((await verify(partial)).status, 404);
  // TEMPORARY until a real delivery confirms V2 signs (see shipstationWebhookAuth.js)
  assert.deepStrictEqual(await verify({ [TOKEN_HEADER]: TOKEN }), { ok: true, signed: false });

  console.log("ShipStation webhook self-check passed.");
}

run().catch((error) => {
  console.error("ShipStation webhook self-check FAILED:", error.message);
  process.exit(1);
});
