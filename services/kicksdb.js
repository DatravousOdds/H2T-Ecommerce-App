// The one place the server talks to KicksDB, with a circuit breaker.
//
// The free plan is a hard cap of 1,000 requests a month, and a rejected key
// (401 "Key is not active") or an exhausted quota (429) doesn't fix itself
// within a request. So after either, further calls are refused locally for a
// while instead of each one going out just to fail again.

const PAUSE_MS = 15 * 60 * 1000;
let pausedUntil = 0;

function pausedError() {
  const error = new Error('KicksDB calls are paused after the API rejected the key or the request quota');
  error.status = 503;
  error.paused = true;
  return error;
}

async function kicksFetch(url, apiKey) {
  if (Date.now() < pausedUntil) throw pausedError();

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });

  if (response.status === 401 || response.status === 429) {
    pausedUntil = Date.now() + PAUSE_MS;

    let detail = '';
    try { detail = (await response.clone().json()).detail || ''; } catch { /* body wasn't JSON */ }
    console.error(
      `KicksDB answered ${response.status}${detail ? ` ("${detail}")` : ''} -- ` +
      `pausing all KicksDB calls for ${PAUSE_MS / 60000} minutes`
    );
  }

  return response;
}

module.exports = { kicksFetch };
