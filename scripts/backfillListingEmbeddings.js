"use strict";
require("dotenv").config();

const { initializeFirebase } = require("../firebase");
const { generateEmbedding } = require("../services/embeddings");

const DELAY_BETWEEN_CALLS_MS = 250;

function primaryImage(images) {
  return images?.find((img) => img.isPrimary) || images?.[0] || null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const { admin, db } = initializeFirebase();

  const listingsSnap = await db.collection("listings").get();
  const allListings = listingsSnap.docs;

  // Skipping docs that already have a referenceEmbedding is what makes this
  // safely re-runnable -- only newly added listings (or a deliberately
  // cleared field) get re-embedded on a second run.
  const pending = allListings.filter((doc) => !Array.isArray(doc.data().referenceEmbedding));

  console.log(`Found ${allListings.length} listings, ${pending.length} need embeddings.`);

  let succeeded = 0;
  let failed = 0;

  for (const [index, doc] of pending.entries()) {
    const listing = doc.data();
    const image = primaryImage(listing.images);

    if (!image?.path) {
      console.warn(`[${index + 1}/${pending.length}] ${doc.id}: no usable image, skipping.`);
      failed++;
      continue;
    }

    try {
      const embedding = await generateEmbedding(image.path);

      await doc.ref.update({
        referenceEmbedding: embedding,
        embeddingGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      succeeded++;
      console.log(`[${index + 1}/${pending.length}] ${doc.id}: embedded.`);
    } catch (error) {
      failed++;
      console.error(`[${index + 1}/${pending.length}] ${doc.id}: failed -- ${error.message}`);
    }

    await delay(DELAY_BETWEEN_CALLS_MS);
  }

  console.log(`Done. ${succeeded} embedded, ${failed} failed/skipped.`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((error) => {
  console.error("Backfill script crashed:", error);
  process.exit(1);
});
