

async function getRatesForCarrier(carrierCode, shipmentDetails) {
    
    const request = await fetch('https://ssapi.shipstation.com/shipments/getrates', {
    method: 'POST',
    headers: {
        'Content-Type': "application/json",
        'Authorization':`Basic ${Buffer.from(`${process.env.SHIPSTATION_KEY}:${process.env.SHIPSTATION_SECRET_KEY}`).toString('base64')}`
    },
    body: JSON.stringify({ "carrierCode": carrierCode, ...shipmentDetails})
    })

    if(!request.ok) {
        throw new Error(`Response status: ${request.status}`)
    }

    const data = await request.json();
    // Merged carrier is lost once /rates/compare flattens all carriers'
    // arrays together -- tag it here so the UI/label-purchase step can
    // still tell which carrier+service a given rate came from.
    return data.map(rate => ({ ...rate, carrierCode }));

}

async function createLabel(labelDetails) {

    const request = await fetch('https://ssapi.shipstation.com/shipments/createlabel', {
    method: 'POST',
    headers: {
        'Content-Type': "application/json",
        'Authorization':`Basic ${Buffer.from(`${process.env.SHIPSTATION_KEY}:${process.env.SHIPSTATION_SECRET_KEY}`).toString('base64')}`
    },
    body: JSON.stringify(labelDetails)
    })

    if(!request.ok) {
        const errorBody = await request.text().catch(() => '');
        throw new Error(`Response status: ${request.status} - ${errorBody}`)
    }

    return await request.json();

}

// --- ShipStation API V2 ---
// V2 is a different API from V1 above: its own base URL, and a single
// `api-key` header instead of Basic auth. Tracking + webhooks only exist
// here, so this is used alongside V1 until label purchase/rates migrate too.
const V2_BASE_URL = 'https://api.shipstation.com';

// The tracking webhook gives ShipStation 10s to get a 2xx back from us, and
// the webhook handler calls getLabelTracking() before marking an order
// delivered -- bounded below that budget so a slow ShipStation response
// can't make us miss it.
const V2_TIMEOUT_MS = 8000;

async function v2Request(path, { method = 'GET', body } = {}) {

    const request = await fetch(`${V2_BASE_URL}${path}`, {
    method,
    headers: {
        'Content-Type': "application/json",
        'api-key': process.env.SHIPSTATION_V2_API_KEY
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(V2_TIMEOUT_MS)
    })

    if(!request.ok) {
        const errorBody = await request.text().catch(() => '');
        throw new Error(`ShipStation V2 ${method} ${path} - status: ${request.status} - ${errorBody}`)
    }

    // Some V2 endpoints (e.g. webhook delete) return 204 with no body.
    if (request.status === 204) return null;

    return await request.json();

}

// V1's numeric shipmentId is the same label as V2's "se-{shipmentId}" --
// confirmed live against a real V1-purchased label. Lets orders bought
// through V1 be tracked through V2 without re-purchasing anything.
function toV2LabelId(shipmentId) {
    if (shipmentId === undefined || shipmentId === null || shipmentId === '') return null;
    const id = String(shipmentId);
    return id.startsWith('se-') ? id : `se-${id}`;
}

async function getLabelTracking(labelId) {
    return await v2Request(`/v2/labels/${encodeURIComponent(labelId)}/track`);
}

async function listWebhooks() {
    return await v2Request('/v2/environment/webhooks');
}

// headers: optional [{ key, value }] that ShipStation sends back on every
// delivery -- used to carry a shared secret our webhook route can check.
async function createWebhook({ name, event, url, headers }) {
    return await v2Request('/v2/environment/webhooks', {
        method: 'POST',
        body: { name, event, url, headers }
    });
}

// PUT only changes the fields sent -- used to rotate the shared-secret header
// on an already-registered webhook without deleting and re-creating it.
async function updateWebhook(webhookId, { name, url, headers }) {
    return await v2Request(`/v2/environment/webhooks/${encodeURIComponent(webhookId)}`, {
        method: 'PUT',
        body: { name, url, headers }
    });
}

module.exports = { getRatesForCarrier, createLabel, toV2LabelId, getLabelTracking, listWebhooks, createWebhook, updateWebhook }