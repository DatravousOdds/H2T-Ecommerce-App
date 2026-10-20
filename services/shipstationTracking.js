// Decision logic for ShipStation API V2 `track_event_v2` webhooks.
// Pure -- no Firestore, no HTTP -- so every branch can be exercised with
// sample payloads. server.js's /webhooks/shipstation route does the I/O
// and acts on what planTrackingUpdate() returns.
//
// Payload shape (docs.shipstation.com/apis/docs/guides/webhooks-schemas):
//   { resource_type: "TRACK_EVENT_V2",
//     resource_url: "https://api.shipstation.com/v2/labels/se-123/track",
//     data: { tracking_number, status_code, status_detail_code, events[], ... } }

const TRACK_EVENT_RESOURCE_TYPE = 'TRACK_EVENT_V2';

// Only the newest few events are kept on the order doc -- enough for a
// tracking timeline in the UI without letting a long-haul package grow the
// document unboundedly.
const MAX_STORED_EVENTS = 20;

// V2 status_code values (docs.shipstation.com/tracking):
//   NY not yet in system · AC accepted · IT in transit · AT delivery attempt
//   EX exception · DE delivered · SP delivered to pickup point · UN unknown
// The carrier physically has the package -> the order counts as shipped.
// EX is deliberately excluded: an exception can be raised before the
// carrier ever scans the parcel, and marking shipped blocks cancellation.
const CARRIER_HAS_PACKAGE = new Set(['AC', 'IT', 'AT']);
const DELIVERED = new Set(['DE', 'SP']);
const NEEDS_ATTENTION = new Set(['AT', 'EX']);

// Terminal order states a tracking event must never act on.
const CLOSED_STATUSES = new Set(['cancelled', 'refunded']);

function parseLabelId(resourceUrl) {
  if (typeof resourceUrl !== 'string') return null;
  const match = resourceUrl.match(/\/v2\/labels\/(se-[A-Za-z0-9-]+)\/track(?:[?#]|$)/);
  return match ? match[1] : null;
}

function eventTimeMs(event) {
  const ms = Date.parse(event?.occurred_at);
  return Number.isNaN(ms) ? null : ms;
}

// Carriers can deliver events out of order and ShipStation retries failed
// deliveries, so "how new is this payload" comes from the newest event it
// carries, not from when it arrived.
function latestEventMs(data) {
  const times = (data?.events || []).map(eventTimeMs).filter((ms) => ms !== null);
  return times.length ? Math.max(...times) : null;
}

function buildTrackingSnapshot(data, eventMs) {
  const events = [...(data.events || [])]
    .sort((a, b) => (eventTimeMs(b) ?? 0) - (eventTimeMs(a) ?? 0))
    .slice(0, MAX_STORED_EVENTS)
    .map((event) => ({
      occurredAt: event.occurred_at || null,
      description: event.description || event.carrier_status_description || null,
      city: event.city_locality || null,
      state: event.state_province || null,
      statusCode: event.status_code || null,
      statusDetailCode: event.status_detail_code || null
    }));

  return {
    trackingStatusCode: data.status_code,
    trackingStatusDetailCode: data.status_detail_code || null,
    // The detail description is the more specific of the two -- and
    // status_description has been seen disagreeing with status_code itself
    // (UN + "Exception" on a voided label), so it's only a fallback.
    trackingStatusDescription: data.status_detail_description || data.status_description || null,
    carrierStatusDescription: data.carrier_status_description || null,
    trackingUrl: data.tracking_url || null,
    estimatedDeliveryDate: data.estimated_delivery_date || null,
    actualDeliveryDate: data.actual_delivery_date || null,
    trackingEvents: events,
    ...(eventMs !== null ? { lastTrackingEventAt: new Date(eventMs) } : {})
  };
}

// prev: what's already on the order --
//   { fulfillmentStatus, lastTrackingEventAtMs, outForDeliveryNotified }
// Returns what the webhook route should do:
//   stale            -- older than (or same as) what's stored; don't
//                       overwrite the snapshot or re-notify
//   snapshot         -- tracking fields to write when not stale
//   ship / deliver   -- status transitions to attempt
//   notifyOutForDelivery, notifyAttention -- one-off notifications
//
// ship/deliver are computed even when stale, on purpose: if an earlier
// attempt wrote the snapshot but then failed before the transition (and
// ShipStation retried), the retry looks "stale" yet still has to finish the
// transition. That's safe because markOrderShipped/markOrderDelivered only
// move forward and no-op when already there.
function planTrackingUpdate(prev, data) {
  const code = data.status_code;
  const eventMs = latestEventMs(data);
  const stale = eventMs !== null && prev.lastTrackingEventAtMs != null && eventMs <= prev.lastTrackingEventAtMs;

  const closed = CLOSED_STATUSES.has(prev.fulfillmentStatus);
  const delivered = prev.fulfillmentStatus === 'delivered';
  const active = !closed && !delivered;

  return {
    stale,
    snapshot: buildTrackingSnapshot(data, eventMs),
    ship: active && CARRIER_HAS_PACKAGE.has(code),
    deliver: active && DELIVERED.has(code),
    notifyOutForDelivery: active && !stale && !prev.outForDeliveryNotified &&
      data.status_detail_code === 'OUT_FOR_DELIVERY',
    notifyAttention: active && !stale && NEEDS_ATTENTION.has(code)
      ? {
          kind: code === 'AT' ? 'attempt' : 'exception',
          description: data.exception_description || data.status_detail_description || data.carrier_status_description || null
        }
      : null
  };
}

module.exports = {
  TRACK_EVENT_RESOURCE_TYPE,
  DELIVERED,
  parseLabelId,
  planTrackingUpdate
};
