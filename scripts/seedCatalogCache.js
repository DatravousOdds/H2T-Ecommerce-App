"use strict";
require("dotenv").config();

// Fills the `catalogCache` Firestore collection that the authentication flow's
// model pickers read (see services/catalogModels.js). The site never calls
// KicksDB while people browse -- its free plan is a hard cap of 1,000 requests
// a month -- so this script is the only thing that spends requests, on purpose.
//
// Usage: node scripts/seedCatalogCache.js --budget=<n> [options]
//
//   --budget=<n>     REQUIRED. The most KicksDB requests this run may make.
//                    Checked before every request; the run stops cleanly when
//                    it is used up and a later run picks up where it left off.
//   --kind=<kind>    only "sneakers", "luxury-shoes", "bags" or "apparel" (default: all)
//   --brand=<name>   only this brand (case-insensitive)
//   --refresh        redo brands that are already cached (default: skip them)
//   --dry-run        print what would be requested, spend nothing, write nothing
//
// What it does, per brand in public/js/core/catalogData.json:
//   - no curated model list -> one request for the brand's top 100 results,
//     reduced to that brand's models (with photos), stored as the model list
//   - curated model list    -> one request for the brand, the curated names are
//     matched to the results locally (free), and only names that didn't match
//     cost one more request each. Names searched for with no result are
//     remembered so they aren't paid for again.
// Trading Cards is not seeded: it has curated model lists only and no KicksDB source.
// It looks at what is already stored first, so re-running only does what's
// left. Requests are spaced out to stay under KicksDB's 60-per-minute limit.
//
// NOTE: dev and prod share one Firestore, so this writes to the real database.
// The Firestore project it will write to is printed before anything happens.

const fs = require("fs");
const path = require("path");

const {
  KINDS,
  fetchModelsFromKicks,
  fetchPhotoByName,
  matchCuratedPhotos,
  readCacheDoc,
  writeCachedModels
} = require("../services/catalogModels");

const REQUEST_SPACING_MS = 1100;
const OTHER = "other";

class BudgetReached extends Error {}

function parseArgs(argv) {
  const options = { budget: null, kind: null, brand: null, refresh: false, dryRun: false };

  for (const arg of argv) {
    const [flag, value] = arg.split(/=(.*)/s);
    if (flag === "--refresh") options.refresh = true;
    else if (flag === "--dry-run") options.dryRun = true;
    else if (flag === "--budget") options.budget = Number(value);
    else if (flag === "--kind") options.kind = value;
    else if (flag === "--brand") options.brand = value;
    else throw new Error(`Unknown option: ${arg}`);
  }

  if (!Number.isInteger(options.budget) || options.budget < 1) {
    throw new Error("--budget=<n> is required (a whole number of KicksDB requests, at least 1)");
  }
  if (options.kind && !KINDS[options.kind]) {
    throw new Error(`--kind must be one of: ${Object.keys(KINDS).join(", ")}`);
  }

  return options;
}

// Sneakers are the core category, so they go first: if the budget runs out, it
// is the least important brands that are left for the next run.
const SEED_ORDER = ["sneakers", "luxury-shoes", "bags", "apparel"];

// Every kind + brand to consider, in the order they are seeded.
function buildJobs(catalog, options) {
  const wantedBrand = options.brand?.toLowerCase();
  const jobs = [];

  for (const kind of SEED_ORDER) {
    if (options.kind && options.kind !== kind) continue;

    for (const brand of catalog[kind].brands) {
      if (wantedBrand && brand.toLowerCase() !== wantedBrand) continue;
      const curated = catalog[kind].curated[brand] || null;
      jobs.push({ kind, brand, curated });
    }
  }

  return jobs;
}

const namesToFind = (curated) => curated.filter(name => name.toLowerCase() !== OTHER);

async function seed(options, deps) {
  const { catalog, apiKey, log, sleep } = deps;
  const summary = { requests: 0, wrote: 0, skipped: 0, failed: [], stoppedBy: null, planned: 0 };

  // Every KicksDB request goes through here: budget check, then pacing.
  let lastRequestAt = 0;
  async function spend() {
    if (summary.requests >= options.budget) throw new BudgetReached();

    const wait = lastRequestAt + REQUEST_SPACING_MS - Date.now();
    if (wait > 0) await sleep(wait);

    lastRequestAt = Date.now();
    summary.requests++;
  }

  for (const job of buildJobs(catalog, options)) {
    const { kind, brand, curated } = job;
    const label = `${kind} / ${brand}`;

    try {
      const existing = options.refresh ? null : await readCacheDoc(kind, brand);

      // ---- brand without a curated list: the cached list itself ----
      if (!curated) {
        if (existing) { summary.skipped++; log(`skip    ${label} (cached, ${existing.items.length} models)`); continue; }

        if (options.dryRun) { summary.planned += 1; log(`would   ${label}: 1 request`); continue; }

        await spend();
        const models = await fetchModelsFromKicks(kind, brand, apiKey);
        await writeCachedModels(kind, brand, models);
        summary.wrote++;
        log(`seeded  ${label}: ${models.length} models`);
        continue;
      }

      // ---- curated brand: a photo table for its names ----
      let items = existing?.items ?? [];
      let pending = existing ? (existing.pending || []) : null;
      let missing = existing?.missing || [];

      if (existing && pending.length === 0) { summary.skipped++; log(`skip    ${label} (cached, ${items.length} photos)`); continue; }

      if (options.dryRun) {
        const searches = pending ? pending.length : namesToFind(curated).length;
        summary.planned += (pending ? 0 : 1) + searches;
        log(`would   ${label}: ${pending ? "resume" : "1 request, then"} up to ${searches} name searches`);
        continue;
      }

      if (!pending) {
        await spend();
        const models = await fetchModelsFromKicks(kind, brand, apiKey);
        const matched = matchCuratedPhotos(brand, curated, models);

        items = [...matched].map(([name, image]) => ({ name, image }));
        pending = namesToFind(curated).filter(name => !matched.has(name));
        missing = [];
        await writeCachedModels(kind, brand, items, { pending, missing });
        log(`matched ${label}: ${matched.size} of ${matched.size + pending.length} names from the brand search`);
      }

      for (const name of [...pending]) {
        await spend();
        const image = await fetchPhotoByName(kind, brand, name, apiKey);

        pending = pending.filter(n => n !== name);
        if (image) items.push({ name, image }); else missing.push(name);

        // saved after every name so a stopped run loses nothing
        await writeCachedModels(kind, brand, items, { pending, missing });
        log(`  ${image ? "found  " : "no photo"} ${label}: ${name}`);
      }

      summary.wrote++;
      log(`seeded  ${label}: ${items.length} photos, ${missing.length} without one`);
    } catch (error) {
      if (error instanceof BudgetReached) { summary.stoppedBy = "budget"; break; }
      if (error.paused || error.status === 401 || error.status === 429) { summary.stoppedBy = "kicksdb"; log(`STOP    ${label}: KicksDB refused (${error.message})`); break; }

      summary.failed.push(`${label}: ${error.message}`);
      log(`FAILED  ${label}: ${error.message}`);
    }
  }

  return summary;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const { initializeFirebase } = require("../firebase");
  const projectId = JSON.parse(process.env.FIREBASE_CONFIG || "{}").project_id;
  console.log(`Firestore project: ${projectId || "(unknown)"}  -- dev and prod share this database`);
  initializeFirebase();

  if (!options.dryRun && !process.env.KICKDB_KEY) {
    throw new Error("KICKDB_KEY is not set");
  }

  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "../public/js/core/catalogData.json"), "utf8"));
  console.log(options.dryRun ? "DRY RUN -- no requests, no writes\n" : `Budget: ${options.budget} KicksDB requests\n`);

  const summary = await seed(options, {
    catalog,
    apiKey: process.env.KICKDB_KEY,
    log: console.log,
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms))
  });

  console.log("\n---");
  if (options.dryRun) {
    console.log(`Worst case ${summary.planned} requests (budget ${options.budget}); ${summary.skipped} brands already cached.`);
  } else {
    console.log(`Requests used: ${summary.requests} of ${options.budget}. Wrote ${summary.wrote}, skipped ${summary.skipped}.`);
    if (summary.stoppedBy === "budget") console.log("Stopped: budget used up. Run again to continue where this left off.");
    if (summary.stoppedBy === "kicksdb") console.log("Stopped: KicksDB rejected the key or the quota. Check the dashboard, then run again.");
    if (summary.failed.length) console.log(`Failed:\n  ${summary.failed.join("\n  ")}`);
  }

  process.exit(summary.stoppedBy === "kicksdb" || summary.failed.length ? 1 : 0);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
