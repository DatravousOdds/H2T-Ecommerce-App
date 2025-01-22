const admin = require("firebase-admin");

let db = null;

const initializeFirebase = () => {
  // firebase admin setup
  try {
    if (!process.env.FIREBASE_CONFIG) {
      console.error("❌ Missing FIREBASE_CONFIG environment variable");
      process.exit(1);
    }

    console.log("Using environment variable configuration...");
    const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);

    // Initialize Firebase
    const firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    // Initailize Firestore
    db = admin.firestore();

    console.log("✅ Firebase connection successful!");
    return { admin, db };
  } catch (error) {
    console.error("❌ Error with Firebase configuration:", error);
    console.error("Error details:", error.message);
    process.exit(1);
  }
};

// Export the initialization function and database instance
module.exports = {
  initializeFirebase,
  getDb: () => db,
  getAdmin: () => admin
};
