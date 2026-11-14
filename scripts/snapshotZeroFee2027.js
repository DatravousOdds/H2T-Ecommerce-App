"use strict";
require("dotenv").config();

const { initializeFirebase } = require("../firebase");

// Dec 31, 2026 11:59:59 PM Pacific -- the latest US time zone, so no US
// seller is cut off early.
const CUTOFF_MS = Date.parse("2027-01-01T07:59:59Z");
const CAP_CENTS = 1000000; // $10K of 2027 sales
const ALREADY_EXISTS = 6; // gRPC status code Firestore throws from create()

const write = process.argv.includes("--write");

// Run once right after the cutoff. Listings (and their createdAt) are written
// client-side, so eligibility is frozen here into sellerPromos -- a
// server-only collection -- rather than re-derived from listings at checkout,
// where a 2027 listing backdated to 2026 would pass.
async function run() {
  const { admin, db } = initializeFirebase();

  // shortcut: full scan filtered in memory; fine at current listing count,
  // switch to a paged query if listings grow large. A range query on
  // createdAt would also silently drop legacy listings that lack the field.
  const snap = await db.collection("listings").select("userId", "status", "createdAt").get();

  const qualifying = new Map(); // userId -> first qualifying listingId
  for (const doc of snap.docs) {
    const { userId, status, createdAt } = doc.data();
    if (!userId || status === "draft" || qualifying.has(userId)) continue;
    // Missing createdAt = legacy listing from before the field existed. A
    // client-written non-Timestamp createdAt is skipped, not allowed to crash
    // the whole run.
    if (createdAt && !(createdAt.toMillis?.() <= CUTOFF_MS)) continue;
    qualifying.set(userId, doc.id);
  }

  console.log(`${qualifying.size} qualifying sellers out of ${snap.size} listings.`);

  if (!write) {
    console.log("Dry run -- sample:", [...qualifying.keys()].slice(0, 5));
    console.log("Re-run with --write to create sellerPromos docs.");
    return;
  }

  let created = 0;
  let skipped = 0;
  for (const [uid, listingId] of qualifying) {
    try {
      // create(), not set(): it fails if the doc exists, so a re-run can
      // never reset a seller's already-spent waivedSalesCents back to 0.
      await db.collection("sellerPromos").doc(uid).create({
        program: "zeroFee2027",
        qualifyingListingId: listingId,
        qualifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        capCents: CAP_CENTS,
        waivedSalesCents: 0
      });
      created++;
    } catch (error) {
      if (error.code !== ALREADY_EXISTS) throw error;
      skipped++;
    }
  }

  console.log(`Created ${created}, skipped ${skipped} (already had a sellerPromos doc).`);
}

run().catch((error) => {
  console.error("Failed to snapshot zero-fee 2027 promo:", error.message);
  process.exit(1);
});
