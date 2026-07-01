const { getDb, getAdmin } = require("../firebase");
const { generateEmbedding, cosineSimilarity } = require("./embeddings");

// Not yet set -- per the planning doc, this needs to be tuned against real
// known-good/known-bad photo pairs once reference embeddings exist. This
// value is a placeholder, not a considered decision.
const CONFIDENCE_THRESHOLD = 0.65;

const TOP_MATCH_COUNT = 5;

function primaryImage(images) {
  return images?.find((img) => img.isPrimary) || images?.[0] || null;
}

/**
 * Every submitted image is embedded and compared (GOAT-style multi-angle
 * submission), not just the primary one -- a counterfeit tell can show up
 * in any angle, so the best-matching angle should decide the score. Listings
 * still only get ONE reference embedding each (primary image, from the
 * backfill script) -- see the scope decision: multi-image on the reference
 * side would multiply backfill cost up to 5x for accuracy gains that don't
 * matter much given the doc's own noted limitation that many listings only
 * have one usable reference angle anyway.
 */
async function matchAuthenticationRequest(requestId) {
  const db = getDb();
  const admin = getAdmin();

  const requestRef = db.collection("authenticationRequests").doc(requestId);
  const requestSnap = await requestRef.get();

  if (!requestSnap.exists) {
    throw new Error(`Authentication request ${requestId} not found`);
  }

  const request = requestSnap.data();
  const submittedImages = (request.images || []).filter((img) => img.path);

  if (submittedImages.length === 0) {
    throw new Error(`Authentication request ${requestId} has no usable images`);
  }

  const submittedEmbeddings = await Promise.all(
    submittedImages.map(async (img) => ({
      imageUrl: img.url,
      embedding: await generateEmbedding(img.path),
    }))
  );

  // Fetched in full rather than queried by a "has referenceEmbedding" filter
  // -- at 100-1000 SKUs a composite index isn't worth the setup, per the
  // planning doc's "no vector database needed at this volume."
  const listingsSnap = await db.collection("listings").get();

  const matches = listingsSnap.docs
    .map((doc) => ({ id: doc.id, data: doc.data() }))
    .filter((listing) => Array.isArray(listing.data.referenceEmbedding))
    .map((listing) => {
      // Best score across all submitted angles against this listing's
      // single reference embedding.
      let best = { score: -1, matchedSubmittedImageUrl: null };

      for (const submitted of submittedEmbeddings) {
        const score = cosineSimilarity(submitted.embedding, listing.data.referenceEmbedding);
        if (score > best.score) {
          best = { score, matchedSubmittedImageUrl: submitted.imageUrl };
        }
      }

      return {
        listingId: listing.id,
        score: best.score,
        matchedSubmittedImageUrl: best.matchedSubmittedImageUrl,
        imageUrl: primaryImage(listing.data.images)?.url || null,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_MATCH_COUNT);

  const topScore = matches[0]?.score ?? 0;
  const status = topScore >= CONFIDENCE_THRESHOLD ? "pending_review" : "needs_manual_review";

  await requestRef.update({
    matches,
    confidenceThreshold: CONFIDENCE_THRESHOLD,
    matchedAt: admin.firestore.FieldValue.serverTimestamp(),
    status,
  });

  return { status, matches };
}

module.exports = { matchAuthenticationRequest, CONFIDENCE_THRESHOLD };
