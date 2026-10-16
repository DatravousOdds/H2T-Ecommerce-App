// Authenticates incoming ShipStation API V2 webhooks, two layers:
//
// 1. Shared token -- we register our webhook with a custom header
//    (V2's `headers` field on POST /v2/environment/webhooks), and ShipStation
//    echoes it on every delivery. Only ShipStation and us know the value.
//
// 2. RSA-SHA256 signature, per docs.shipstation.com/apis/docs/guides/webhooks-validation:
//    headers x-shipengine-rsa-sha256-key-id / -signature / x-shipengine-timestamp,
//    signed payload = `${timestamp}.${rawBody}`, public keys from the JWKS below.
//
// Returns { ok: true, signed } or { ok: false, status, reason }. Status
// codes follow the validation guide: 404 missing signature headers, 400
// stale timestamp, 401 bad token/signature.

const crypto = require('crypto');

const JWKS_URL = 'https://api.shipengine.com/jwks';
const TOKEN_HEADER = 'x-hexxo-webhook-token';
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const SIGNATURE_HEADERS = ['x-shipengine-rsa-sha256-key-id', 'x-shipengine-rsa-sha256-signature', 'x-shipengine-timestamp'];

// kid -> KeyObject, refreshed with ETag/If-None-Match (a 304 means the
// cached set is still current) and re-fetched whenever an unknown kid shows
// up, which is how a key rotation on ShipStation's side gets picked up.
const jwksCache = { etag: null, keys: new Map() };

async function refreshJwks() {
  const response = await fetch(JWKS_URL, {
    headers: jwksCache.etag ? { 'If-None-Match': jwksCache.etag } : {},
    signal: AbortSignal.timeout(5000)
  });
  if (response.status === 304) return;
  if (!response.ok) throw new Error(`JWKS fetch failed: ${response.status}`);

  const { keys = [] } = await response.json();
  const next = new Map();
  for (const jwk of keys) {
    // The set also carries an EC key used for other purposes -- only RSA
    // keys can verify an RSA-SHA256 webhook signature.
    if (jwk.kty !== 'RSA' || !jwk.kid) continue;
    next.set(jwk.kid, crypto.createPublicKey({ key: jwk, format: 'jwk' }));
  }
  jwksCache.keys = next;
  jwksCache.etag = response.headers.get('etag');
}

async function getSigningKey(kid) {
  if (!jwksCache.keys.has(kid)) await refreshJwks();
  return jwksCache.keys.get(kid) || null;
}

function tokenMatches(received, expected) {
  if (typeof received !== 'string') return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on unequal lengths; a length mismatch is already
  // a mismatch, and comparing lengths leaks nothing useful about the value.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function verifyShipstationWebhook(headers, rawBody, { expectedToken, now = Date.now(), getKey = getSigningKey } = {}) {
  // Fail closed: an unset token must not mean "accept everything".
  if (!expectedToken) return { ok: false, status: 503, reason: 'SHIPSTATION_WEBHOOK_TOKEN not configured' };
  if (!tokenMatches(headers[TOKEN_HEADER], expectedToken)) return { ok: false, status: 401, reason: 'bad token' };

  const present = SIGNATURE_HEADERS.filter((h) => headers[h]);

  // TEMPORARY: the validation guide says every webhook is signed, but this
  // hasn't been observed on a real V2 delivery yet. Until it has, a request
  // with *no* signature headers is accepted on the shared token alone (and
  // logged by the caller) -- rejecting it would silently drop every real
  // tracking event if V2 turns out not to sign. Once a real delivery shows
  // the headers, change this to return { ok: false, status: 404 }.
  if (present.length === 0) return { ok: true, signed: false };

  if (present.length !== SIGNATURE_HEADERS.length) return { ok: false, status: 404, reason: 'incomplete signature headers' };

  const [kid, signature, timestamp] = SIGNATURE_HEADERS.map((h) => headers[h]);

  const sentAt = Date.parse(timestamp);
  if (Number.isNaN(sentAt) || Math.abs(now - sentAt) > MAX_CLOCK_SKEW_MS) {
    return { ok: false, status: 400, reason: 'timestamp outside allowed window' };
  }

  const key = await getKey(kid);
  if (!key) return { ok: false, status: 401, reason: `unknown key id ${kid}` };

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${timestamp}.${rawBody}`);
  verifier.end();

  let valid = false;
  try {
    valid = verifier.verify(key, signature, 'base64');
  } catch {
    valid = false;
  }
  return valid ? { ok: true, signed: true } : { ok: false, status: 401, reason: 'bad signature' };
}

module.exports = { TOKEN_HEADER, verifyShipstationWebhook, getSigningKey };
