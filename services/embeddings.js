const aiplatform = require("@google-cloud/aiplatform");

const { PredictionServiceClient } = aiplatform.v1;
const { helpers } = aiplatform;

const LOCATION = "us-central1";
const MODEL = "multimodalembedding@001";
const EMBEDDING_DIMENSION = 512;

let client = null;
let projectId = null;
let storageBucket = null;

// FIREBASE_CONFIG already holds a full GCP service account JSON (used by
// firebase.js for admin.credential.cert()) -- reused here instead of
// provisioning a second credential just for Vertex AI.
function getServiceAccount() {
  if (!process.env.FIREBASE_CONFIG) {
    throw new Error("Missing FIREBASE_CONFIG environment variable");
  }
  return JSON.parse(process.env.FIREBASE_CONFIG);
}

function getClient() {
  if (client) return client;

  const serviceAccount = getServiceAccount();
  projectId = serviceAccount.project_id;
  storageBucket = serviceAccount.storageBucket;

  client = new PredictionServiceClient({
    apiEndpoint: `${LOCATION}-aiplatform.googleapis.com`,
    projectId,
    credentials: {
      client_email: serviceAccount.client_email,
      private_key: serviceAccount.private_key,
    },
  });

  return client;
}

/**
 * imagePath is a Firebase Storage path (the `path` field already stored on
 * both listings.images[] and authenticationRequests.images[] -- see
 * seller.js/authenticate.js's uploadImagesToFirebase()), not a download URL.
 * Vertex AI's image input takes a gs:// URI directly, so no fetch/base64
 * round-trip is needed.
 */
async function generateEmbedding(imagePath) {
  const predictionClient = getClient();
  const endpoint = `projects/${projectId}/locations/${LOCATION}/publishers/google/models/${MODEL}`;

  const instance = helpers.toValue({
    image: { gcsUri: `gs://${storageBucket}/${imagePath}` },
  });

  const request = {
    endpoint,
    instances: [instance],
    parameters: helpers.toValue({ dimension: EMBEDDING_DIMENSION }),
  };

  const [response] = await predictionClient.predict(request);

  const embeddingValues =
    response.predictions[0].structValue.fields.imageEmbedding.listValue.values;

  return embeddingValues.map((v) => v.numberValue);
}

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = {
  generateEmbedding,
  cosineSimilarity,
  EMBEDDING_DIMENSION,
};
