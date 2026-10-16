"use strict";
require("dotenv").config();

// One-time (and re-runnable) registration of our ShipStation API V2 tracking
// webhook. V2 events can only be created through the API, not the
// ShipStation dashboard.
//
//   node scripts/registerShipstationWebhook.js <publicBaseUrl> [--apply]
//
// Dry run by default: lists what's registered and says what it *would* do.
// Pass --apply to actually create/update. Idempotent -- re-running with the
// same URL and token is a no-op, and a changed SHIPSTATION_WEBHOOK_TOKEN gets
// pushed onto the existing webhook instead of creating a duplicate (V2 409s
// on a duplicate url+event anyway).
//
// Only ever touches webhooks pointing at <publicBaseUrl>/webhooks/shipstation
// -- anything else registered on the account (e.g. a third-party app's own
// `track` webhook) is listed for visibility and left alone.

const { listWebhooks, createWebhook, updateWebhook } = require("../services/shipstation");
const { TOKEN_HEADER } = require("../services/shipstationWebhookAuth");

const EVENT = "track_event_v2";
const NAME = "Hexxo order tracking";

const baseUrl = process.argv[2];
const apply = process.argv.includes("--apply");

if (!baseUrl || baseUrl.startsWith("--")) {
  console.error("Usage: node scripts/registerShipstationWebhook.js <publicBaseUrl> [--apply]");
  console.error("  e.g. node scripts/registerShipstationWebhook.js https://hexxo.store --apply");
  process.exit(1);
}

function buildTargetUrl(base) {
  const parsed = new URL(base);
  // ShipStation has to reach this from the public internet, and the shared
  // token rides in a header -- plain http would send it in the clear.
  if (parsed.protocol !== "https:") throw new Error(`Base URL must be https (got ${parsed.protocol})`);
  if (["localhost", "127.0.0.1"].includes(parsed.hostname)) throw new Error("ShipStation can't reach localhost -- use the deployed URL or a tunnel");
  return `${parsed.origin}/webhooks/shipstation`;
}

// Registering a URL that isn't actually serving our route fails silently on
// ShipStation's side: every event gets a non-2xx, is retried twice, and is
// dropped. So before registering, POST to it *without* the token -- only our
// deployed route answers that with 401. Anything else is diagnosed here.
async function preflight(targetUrl) {
  const response = await fetch(targetUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    redirect: "manual",
    signal: AbortSignal.timeout(10000)
  });
  const { status } = response;

  if (status === 401) return;
  if (status >= 300 && status < 400) {
    const location = response.headers.get("location") || "";
    if (location.endsWith("/404")) {
      throw new Error(`${targetUrl} isn't deployed yet (the site redirects it to its 404 page) -- deploy this branch first`);
    }
    throw new Error(`${targetUrl} redirects (${status}) to ${location} -- webhook senders don't follow redirects; register the final URL instead`);
  }
  if (status === 503) throw new Error(`${targetUrl} is deployed but SHIPSTATION_WEBHOOK_TOKEN isn't set on that server`);
  throw new Error(`${targetUrl} answered ${status}, expected 401 from the deployed webhook route`);
}

// Header *values* are never printed -- ours is the shared secret, and other
// apps' webhooks may carry their own.
const describe = (w) => `${w.webhook_id}  event=${w.event}  url=${w.url}  headers=[${(w.headers || []).map((h) => h.key).join(", ")}]`;

async function run() {
  const token = process.env.SHIPSTATION_WEBHOOK_TOKEN;
  if (!process.env.SHIPSTATION_V2_API_KEY) throw new Error("SHIPSTATION_V2_API_KEY is not set");
  if (!token) throw new Error("SHIPSTATION_WEBHOOK_TOKEN is not set");

  const targetUrl = buildTargetUrl(baseUrl);
  const headers = [{ key: TOKEN_HEADER, value: token }];

  await preflight(targetUrl);
  console.log(`Preflight OK: ${targetUrl} is live and enforcing the token.\n`);

  const existing = await listWebhooks();
  console.log(`Registered webhooks (${existing.length}):`);
  existing.forEach((w) => console.log(`  ${describe(w)}`));

  const ours = existing.find((w) => w.event === EVENT && w.url === targetUrl);

  if (ours) {
    const currentToken = (ours.headers || []).find((h) => h.key === TOKEN_HEADER)?.value;
    if (currentToken === token) {
      console.log(`\nAlready registered (${ours.webhook_id}) with the current token -- nothing to do.`);
      return;
    }
    console.log(`\n${apply ? "Updating" : "Would update"} ${ours.webhook_id}: token header is missing or differs from SHIPSTATION_WEBHOOK_TOKEN.`);
    if (apply) {
      await updateWebhook(ours.webhook_id, { name: NAME, url: targetUrl, headers });
      console.log("Updated.");
    }
    return;
  }

  console.log(`\n${apply ? "Creating" : "Would create"}: event=${EVENT} url=${targetUrl} headers=[${TOKEN_HEADER}]`);
  if (apply) {
    const created = await createWebhook({ name: NAME, event: EVENT, url: targetUrl, headers });
    console.log(`Created ${created.webhook_id}.`);
  } else {
    console.log("Dry run -- re-run with --apply to register.");
  }
}

run().catch((error) => {
  console.error("Failed to register ShipStation webhook:", error.message);
  process.exit(1);
});
