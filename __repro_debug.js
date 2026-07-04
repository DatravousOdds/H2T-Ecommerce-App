require('dotenv').config({ path: '/Users/coltonclarke/Desktop/dev/projects/H2T-Ecommerce-App/.env' });
const admin = require('firebase-admin');
const Stripe = require('stripe');

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
const app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const WEB_API_KEY = "AIzaSyBY2UnjxAeO344Q0L841KybRcgk_VztUzo";
const BASE = "http://127.0.0.1:3030";
const BUYER_UID = "debug-buyer-" + Date.now();
const SELLER_UID = "debug-seller-" + Date.now();

async function getIdTokenFor(uid) {
  const customToken = await admin.auth().createCustomToken(uid);
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${WEB_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true })
  });
  const json = await res.json();
  if (!json.idToken) throw new Error("Failed to mint idToken: " + JSON.stringify(json));
  return json.idToken;
}

async function main() {
  const idToken = await getIdTokenFor(BUYER_UID);
  console.log("✅ minted idToken for buyer uid:", BUYER_UID);

  const item = {
    itemType: 'listing',
    buyerId: BUYER_UID,
    buyerEmail: "buyer@example.com",
    sellerId: SELLER_UID,
    listingId: "debug-listing-1",
    productName: "Debug Hoodie",
    size: "M",
    brand: "DebugBrand",
    image: "https://example.com/img.png",
    salesTax: "1.00",
    marketplaceFee: "2.00",
    shippingCost: "0",
    shippingFrom: "76116",
    price: 42.00
  };

  const ccsRes = await fetch(`${BASE}/create-checkout-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceData: [item] })
  });
  const ccsJson = await ccsRes.json();
  console.log("create-checkout-session status:", ccsRes.status, ccsJson);
  const clientSecret = ccsJson.clientSecret;

  // mirror checkout.js's client-side extraction exactly
  const paymentIntentId = clientSecret.split('_secret')[0];
  console.log("extracted paymentIntentId:", paymentIntentId);

  const initRes = await fetch(`${BASE}/orders/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
    body: JSON.stringify({ paymentIntentId })
  });
  const initJson = await initRes.json();
  console.log("orders/init status:", initRes.status, initJson);

  // Confirm the PaymentIntent server-side with a test card, same as the buyer would in the browser
  const confirmed = await stripe.paymentIntents.confirm(paymentIntentId, {
    payment_method: "pm_card_visa"
  });
  console.log("stripe confirm status:", confirmed.status);

  const byPiRes = await fetch(`${BASE}/api/orders/by-payment-intent/${paymentIntentId}`, {
    headers: { "Authorization": `Bearer ${idToken}` }
  });
  const byPiJson = await byPiRes.json();
  console.log("by-payment-intent status:", byPiRes.status, byPiJson);

  // cleanup
  const snap = await db.collection('orders').where('id', '==', paymentIntentId).get();
  for (const doc of snap.docs) await doc.ref.delete();
  console.log("🧹 cleaned up test order doc(s):", snap.size);
}

main().catch(e => { console.error("SCRIPT ERROR:", e); process.exit(1); });
