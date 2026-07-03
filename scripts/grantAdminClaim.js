"use strict";
require("dotenv").config();

const { initializeFirebase } = require("../firebase");

const email = process.argv[2];
const expectedUid = process.argv[3];

if (!email) {
  console.error("Usage: node scripts/grantAdminClaim.js <email> [expectedUid]");
  process.exit(1);
}

async function run() {
  const { admin, db } = initializeFirebase();

  const user = await admin.auth().getUserByEmail(email);

  if (expectedUid && user.uid !== expectedUid) {
    throw new Error(`UID mismatch: getUserByEmail(${email}) returned ${user.uid}, expected ${expectedUid}`);
  }

  await admin.auth().setCustomUserClaims(user.uid, { admin: true });

  // The custom claim is what actually gates access (checked via req.token.admin
  // in server.js and the ID token in authentication-review.js) -- this Firestore
  // flag exists only so server-side code can *find* admins to notify (e.g. "a
  // new authentication request needs review") without paginating through every
  // user via the Auth Admin SDK's listUsers().
  await db.collection("userProfiles").doc(user.uid).set({ isAdmin: true }, { merge: true });

  console.log(`Granted admin claim to ${email} (${user.uid}).`);
  console.log("They need to force-refresh their ID token (or log out/in) before the client picks up the new claim.");
}

run().catch((error) => {
  console.error("Failed to grant admin claim:", error.message);
  process.exit(1);
});
