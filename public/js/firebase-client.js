// firebase-client (for browser)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

const firebaseConfig = {
  // Your web app's Firebase configuration
  apiKey: "AIzaSyBY2UnjxAeO344Q0L841KybRcgk_VztUzo",
  authDomain: "ecom-website-94d87.firebaseapp.com",
  projectId: "ecom-website-94d87",
  storageBucket: "ecom-website-94d87.firebasestorage.app",
  messagingSenderId: "786012301650",
  appId: "1:786012301650:web:cc60aa81cadff2a561728b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
