// firebase-client (for browser)
import { firebaseConfig } from "../core/config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
  uploadBytes
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  limit,
  orderBy,
  addDoc,
  serverTimestamp,
  deleteDoc,
  startAfter,
  Timestamp,
  onSnapshot,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  setPersistence, 
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Awaited at module scope (not fire-and-forget) so that any module
// importing `auth` -- e.g. auth.js's onAuthStateChanged listener in
// checkUserStatus() -- can't run until persistence is actually configured.
// Otherwise onAuthStateChanged can fire once with a premature `null` before
// the persisted session loads, and since that listener unsubscribes after
// its first callback, it locks in "logged out" for the rest of the page.
try {
  await setPersistence(auth, browserLocalPersistence);
  console.log('Firebase persistence enabled');
} catch (error) {
  console.log('Failed to enable persistence', error);
}

export {
  deleteDoc,
  getDownloadURL,
  getStorage,
  ref,
  uploadString,
  serverTimestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  startAfter,
  query,
  where,
  limit,
  orderBy,
  getFirestore,
  updateProfile,
  sendPasswordResetEmail,
  Timestamp,
  onSnapshot,
  uploadBytes,
  arrayUnion,
  arrayRemove
};
