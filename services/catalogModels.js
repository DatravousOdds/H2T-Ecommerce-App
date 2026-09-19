// Model lists and model photos for the authentication flow's brand -> model
// screens, from KicksDB (StockX) data.
//
// KicksDB's free plan allows 1,000 requests a month, so requests never happen
// while a user is browsing. A seed script (scripts/seedCatalogCache.js) calls
// KicksDB on purpose and stores what it finds in the `catalogCache` Firestore
// collection (KicksDB's terms, section 2.1, permit caching). The routes only
// ever read that collection.
//
// One document per kind + brand, `items: [{ name, image }]`:
//   - brands with no curated list: `items` IS the model list
//   - brands with a curated list (public/js/core/catalogData.json): `items` is a
//     name -> photo table for those curated names, `pending` the names still to
//     search for, `missing` the names searched for and not found (so they aren't
//     paid for again)
// Only image URLs are stored, never copies of the images.

const { getDb } = require('../firebase');
const { kicksFetch } = require('./kicksdb');

// KicksDB search isn't filtered by type -- a plain "Chanel" query also returns
// sneakers, apparel and sunglasses, and `product_type` can't be trusted (skis
// and earrings come back tagged "handbags", moccasins "sneakers"). `categories`
// is the reliable field.
const KINDS = {
  bags: ['bags', 'wallets-and-card-holders'],
  sneakers: ['sneakers'],
  // luxury houses list both sneakers and dress shoes (heels, flats, mules) under
  // separate categories
  'luxury-shoes': ['sneakers', 'shoes'],
  // seen on apparel results as e.g. ['apparel', 'tops', 'hoodies-and-sweatshirts']
  apparel: ['apparel']
};

// Brands whose picker label is a poor search term or differs from how StockX
// spells them. Unverified against live data -- extend as gaps show up.
//   searchTerm: what to send to KicksDB (a bare "On" matches nearly everything)
//   aliases:    other spellings of the brand to accept in results
const BRAND_OVERRIDES = {
  on: { searchTerm: 'On Running', aliases: ['On Running'] }
};

const stripAccents = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
// "Off White" / "Off-White" / "Hermès" / "Hermes" all compare equal
const brandKey = (s) => stripAccents(s).toLowerCase().replace(/[^a-z0-9]/g, '');

function brandLabels(brand) {
  const override = BRAND_OVERRIDES[brandKey(brand)];
  // longest first, so "On Running Cloud" strips "On Running", not just "On"
  return [brand, ...(override?.aliases || [])].sort((a, b) => b.length - a.length);
}

function extractModels(kind, brand, items) {
  const categories = KINDS[kind];
  const labels = brandLabels(brand);
  const wanted = new Set(labels.map(brandKey));
  const models = new Map();

  for (const item of items) {
    if (!item.categories?.some(c => categories.includes(c))) continue;
    if (!wanted.has(brandKey(item.brand))) continue;
    if (!item.model || !item.image) continue;

    // "Chanel Classic Double Flap" -> "Classic Double Flap": the brand is
    // already captured by the brand picker.
    const prefix = labels.find(label => brandKey(item.model.slice(0, label.length)) === brandKey(label));
    const name = (prefix ? item.model.slice(prefix.length) : item.model).trim();

    // results are rank-ordered, so the first hit per model has the best photo
    if (!name || models.has(name.toLowerCase())) continue;
    models.set(name.toLowerCase(), { name, image: item.image });
  }

  return [...models.values()];
}

// ---- upstream (KicksDB) -- used by the seed script, never by a request route ----

// One KicksDB product search; the error carries the HTTP status.
async function searchKicks(query, limit, apiKey) {
  const response = await kicksFetch(
    `https://api.kicks.dev/v3/stockx/products?query=${encodeURIComponent(query)}&limit=${limit}`,
    apiKey
  );

  if (!response.ok) {
    const error = new Error(`KicksDB lookup failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return (await response.json()).data || [];
}

// One request: the brand's top 100 results, reduced to this kind's models.
async function fetchModelsFromKicks(kind, brand, apiKey) {
  const searchTerm = BRAND_OVERRIDES[brandKey(brand)]?.searchTerm || brand;
  return extractModels(kind, brand, await searchKicks(searchTerm, 100, apiKey));
}

const tokens = (s) => stripAccents(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
const startsWithTokens = (full, prefix) => prefix.length <= full.length && prefix.every((t, i) => full[i] === t);

// Pairs curated names with the photo of the KicksDB model they correspond to,
// without spending a request per name. A curated name matches a model whose
// name *starts with* it, word by word: "Dunk" matches "Dunk Low", "Jordan 1"
// matches "Jordan 1 Retro High" but not "Jordan 10". When several curated names
// match, the longest wins, so "Jordan 1 Low" isn't claimed by "Jordan 1".
// Models arrive rank-ordered with the brand prefix stripped, so each is also
// tried with the brand put back ("Jordan" + "1 Retro High").
// Returns Map(curatedName -> image).
function matchCuratedPhotos(brand, curatedNames, models) {
  const brandTokens = tokens(brand);
  const curated = curatedNames
    .filter(name => name.toLowerCase() !== 'other')
    .map(name => ({ name, tokens: tokens(name) }))
    .filter(entry => entry.tokens.length > 0);
  const photos = new Map();

  for (const model of models) {
    const modelTokens = tokens(model.name);
    const candidates = [modelTokens, [...brandTokens, ...modelTokens]];

    let best = null;
    for (const entry of curated) {
      const matches = candidates.some(candidate => startsWithTokens(candidate, entry.tokens));
      if (matches && (!best || entry.tokens.length > best.tokens.length)) best = entry;
    }

    if (best && !photos.has(best.name)) photos.set(best.name, model.image);
  }

  return photos;
}

// One request for one curated name -- the fallback for names matchCuratedPhotos
// couldn't pair up (e.g. long collab names). Returns an image URL or null.
async function fetchPhotoByName(kind, brand, name, apiKey) {
  const query = startsWithTokens(tokens(name), tokens(brand)) ? name : `${brand} ${name}`;
  const results = await searchKicks(query, 5, apiKey);
  const hit = results.find(item => item.image && item.categories?.some(c => KINDS[kind].includes(c)));
  return hit ? hit.image : null;
}

// ---- Firestore cache ----

const COLLECTION = 'catalogCache';
const docId = (kind, brand) => `${kind}_${brandKey(brand)}`;

// A short in-memory layer so a popular brand isn't a Firestore read per pick.
// Misses aren't remembered, so a freshly seeded brand shows up straight away.
const READ_TTL_MS = 10 * 60 * 1000;
const recentReads = new Map();

async function readCachedModels(kind, brand) {
  const id = docId(kind, brand);

  const hit = recentReads.get(id);
  if (hit && hit.expires > Date.now()) return hit.items;

  const snapshot = await getDb().collection(COLLECTION).doc(id).get();
  if (!snapshot.exists) return [];

  const items = snapshot.data().items || [];
  recentReads.set(id, { expires: Date.now() + READ_TTL_MS, items });
  return items;
}

// The whole stored document, or null -- never served from memory, because the
// seed script uses it to decide what still needs a request.
async function readCacheDoc(kind, brand) {
  const snapshot = await getDb().collection(COLLECTION).doc(docId(kind, brand)).get();
  return snapshot.exists ? snapshot.data() : null;
}

// `extra` carries the curated-brand bookkeeping ({ pending, missing }).
async function writeCachedModels(kind, brand, items, extra = {}) {
  const id = docId(kind, brand);
  await getDb().collection(COLLECTION).doc(id).set({ kind, brand, items, ...extra, fetchedAt: new Date() });
  recentReads.delete(id);
}

module.exports = {
  KINDS,
  fetchModelsFromKicks,
  fetchPhotoByName,
  matchCuratedPhotos,
  readCachedModels,
  readCacheDoc,
  writeCachedModels
};
