
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  getDoc,
  doc,
  getFirestore,
  setDoc,
  persistenceReady,
} from "../api/firebase-client.js";

import { showLoader, hideLoader } from "../components/pageLoader.js";

// Initialize Firebase Auth
const auth = getAuth();
const db = getFirestore();

// ================================
// CACHING - The key to speed!
// ================================
// var, not let: auth.js is imported by nearly every page/component, and
// checkUserStatus() can get called from one of them before this line has
// synchronously run (same class of race documented in global.js). var has
// no temporal dead zone, so an early read is `undefined`, not a crash.
var cachedUser = null;
var authCheckPromise = null;

// Fetch user profile with caching
const fetchUserProfile = async (user) => {
  try {
    // Check sessionStorage first
    const cachedProfile = sessionStorage.getItem(`profile_${user.uid}`);
    if (cachedProfile) {
      console.log("✅ Using cached profile from sessionStorage");
      console.log(cachedProfile);
      const idToken = await user.getIdToken()
      const parsed = JSON.parse(cachedProfile);
      return {...parsed, idToken}
    }

    console.log("Fetching user profile for email:", user.email);
    const docRef = doc(db, "userProfiles", user.uid);
    const docSnap = await getDoc(docRef);
    const idToken = await user.getIdToken();

    // Fetching user profile
    if (docSnap.exists()) {
      const userData = {
        userId: user.uid,
        email: user.email,
        idToken: idToken,
        ...docSnap.data()
      };

      // Cache profile
      sessionStorage.setItem(`profile_${user.uid}`, JSON.stringify(userData));
      console.log('✅ Profile cached in sessionStorage');
      console.log(userData)
      
      return userData;
    } else {
      console.log("No profile document exists for user:", user.email);
      return null;
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error; // Throw error to be caught by caller
  }
};



// ============================
//      AUTH CHECK
// ============================
export function checkUserStatus() {
  
  // != (loose) so an early, pre-initialization `undefined` read falls through
  // to the real auth check below instead of being treated as "already cached".
  if (cachedUser != null) {
    console.log('⚡️ Returning cached user (instant)');
    return Promise.resolve(cachedUser);
  }

  if (authCheckPromise) {
    console.log('Auth check in progress, waiting...')
    return authCheckPromise;
  }

  console.time("Auth check duration");

   authCheckPromise = persistenceReady.then(() => new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        unsubscribe(); // Stop listening for changes

        if (user) {
          try {
            const userData = await fetchUserProfile(user);

            // Cache user data
            cachedUser = userData;

            console.timeEnd("Auth Check Duration");

            resolve(userData);
          } catch (error) {
            reject(error);
          }
        } else {
          console.log("No user authenticated");
          cachedUser = false;
          resolve(null);
        }

        authCheckPromise = null;

      },
      (error) => {
        console.error("Auth state change error:", error);
        authCheckPromise = null;
        reject(error);
      }
    );
  }));

  return authCheckPromise;
}

// Keep the in-memory + sessionStorage profile cache in sync after a write,
// so a page refresh right after saving doesn't show stale pre-save data.
// `patch.shipping` (if present) is merged one level deep so a partial
// shipping update (e.g. just phoneNumber) doesn't wipe out the rest.
export function updateCachedUser(patch) {
  if (!cachedUser) return;

  cachedUser = {
    ...cachedUser,
    ...patch,
    shipping: { ...cachedUser.shipping, ...patch.shipping }
  };

  const cacheKey = `profile_${cachedUser.userId}`;
  if (sessionStorage.getItem(cacheKey)) {
    sessionStorage.setItem(cacheKey, JSON.stringify(cachedUser));
  }
}

// Create user profile in Firestore
const createUserDocument = async (user, additionalData) => {
  try {
    // add to users collection
    await setDoc(doc(db, "users", user.email), {
      // profile data
      createdAt: new Date(),
      userId: user.uid,
      email: user.email,
      name: additionalData.name,
      notification: additionalData.notification,
      number: additionalData.phoneNumber,
      seller: additionalData.seller,
      tac: additionalData.tac

    });
    console.log("User profile created for:", user.email);
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error; // Throw error to be caught by caller
  }
}

// Create user profile in Firestore userProfiles collection
const createUserProfile = async (user, additionalData) => {
  try {
    // add to userProfiles collection
    await setDoc(doc(db, "userProfiles", user.uid), {
      // profile data
      ...additionalData
    });
    console.log("User profile created for:", user.email);
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error; // Throw error to be caught by caller
  }
}

// Wires up the login/signup form. Not just a DOMContentLoaded listener --
// this module now has a real async dependency (firebase-client.js awaits
// setPersistence() before finishing evaluation), so by the time this module
// script finishes running, DOMContentLoaded has often already fired. A
// listener added after the fact never gets called. Running immediately
// when the DOM is already parsed (the common case here) sidesteps that race
// entirely; the listener path only matters if this ever loads before the
// DOM is ready.
function initAuthForm() {
  const loader = document.querySelector(".loader");
  // select inputs
  const submitBtn = document.querySelector(".submit-btn");
  const name = document.querySelector("#name") || null;
  const email = document.querySelector("#email");
  const password = document.querySelector("#password");
  const number = document.querySelector("#number") || null;
  const tac = document.querySelector("#terms-and-cond") || null;
  const noti = document.querySelector("#notification") || null;
  const signupForm = document.querySelector(".signup-form");
  const loginForm = document.querySelector(".login-form");

  // Force email to lowercase as the user types (preserve cursor position)
  if (email) {
    email.addEventListener("input", () => {
      email.value = email.value.toLowerCase(); 
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      console.log("Submit button clicked");
      if (name != null) {
        // ====== SIGNUP PAGE ======

        // validation
        if (name.value.length < 3) {
          showAlert("name must be 3 letters long");
          return;
        }
        if (!email.value.length) {
          showAlert("enter your email");
          return;
        }
         if (password.value.length < 8) {
          showAlert("password should be 8 letters long");
          return;
        }
        if (!number.value.length) {
          showAlert("enter your phone number");
          return;
        }
         if (!Number(number.value) || number.value.length < 10) {
          showAlert("invalid number, please enter valid one");
          return;
         }
         if (!tac.checked) {
          showAlert("you must agree to our terms and conditions");
          return;
        }

        // Show loader
        showLoader(signupForm);
        try{
            // Create user with email and password
            const userCredential  = await createUserWithEmailAndPassword(auth, email.value, password.value);
          
           const user = userCredential.user;
           console.log("User created:", user.uid);

           // Update user profile with display name
           await updateProfile(user, { displayName: name.value });

           console.log("User profile updated with name:", name.value);

           const userData = {
            "userId": user.uid,
            "email": email.value,
            "firstName": name.value,
            "lastName": "",
            "phoneNumber": number.value,
            "username": "",
            "backgroundImage": "",
            "profileImage": "",
            "notification": noti.checked,
            "tac": tac.checked,
            "isVerified": false,
            "accountInfo": {
              "joinedDate": new Date()
            },
            "shipping": {
              "address": "",
              "address2": "",
              "city": "",
              "state": "",
              "zipCode": "",
              "country": "",
              "phoneNumber": number.value
            },
            // Defaults so the profile page has real fields to read instead of
            // crashing on userData.stats.followers / userData.ratings.metrics.
            "stats": {
              "followers": 0,
              "following": 0,
              "rating": 0
            },
            "ratings": {
              "metrics": {
                "averageRating": 0,
                "totalRatings": 0
              },
              "ratingCount": {}
            }
           }

           // Proceed to submit form data to your server
           await createUserDocument(user, {
            createdAt: new Date(),
            userId: user.uid,
            name: name.value,
            phoneNumber: number.value,
            tac: tac.checked,
            notification: noti.checked,
            email: email.value,
            seller: false
          });

          await createUserProfile(user, userData);

          showAlert("Account created successfully!");

          sessionStorage.setItem("user", JSON.stringify({ 
            userId:user.uid,
            email: email.value,
            name: name.value,
            seller: false
        }));
          // Redirect to home page or login
          setTimeout(() => {
            location.replace("/");

        }, 2000);
          // Signed up
         
        } catch(error) {
          console.error('Signup error:', error);

          let errorMessage = "Something went wrong during signup.";

          switch (error.code) { 
            case 'auth/email-already-in-use':
              errorMessage = "The email address is already in use by another account.";
              break;
            case 'auth/invalid-email':
              errorMessage = "The email address is not valid.";
              break;
            case 'auth/operation-not-allowed':
              errorMessage = "Email/password accounts are not enabled.";
              break;
            case 'auth/weak-password':
              errorMessage = "The password is too weak.";
              break;
          }

          showAlert(errorMessage);
        } finally {
          hideLoader(signupForm);
        }

      } else {
        // ====== LOGIN PAGE ======

        // Ensure email is in lowercase while typing (already handled above), but also enforce it here before submission
        email.value = email.value.toLowerCase();

        // login page validation
        if (!email.value.length || !password.value.length) {
          showAlert("Fill all the inputs");
          return;
        } 


          showLoader(loginForm);
          try {
            const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value);
            // Signed in
            const user = userCredential.user;
            console.log("User signed in:", user.email);

            const userData = await fetchUserProfile(user);
            if (!userData) {
              showAlert("User profile not found. Please contact support.");
              return;
            }

            sessionStorage.setItem("user", JSON.stringify({
              userId: user.uid,
              email: user.email,
              name: userData.name,
              seller: userData.seller
            }));

            localStorage.setItem(
              "user",
              JSON.stringify({
                name: userData.name,
                email: userData.email,
                seller: userData.seller
              }));

            console.log("Login successful, redirecting to home page");
            location.replace("/");

          } catch (error) {
            hideLoader(loginForm);
            console.error("Login error:", error);
            let errorMessage = "Something went wrong during login.";

            switch (error.code) {
              case 'auth/invalid-email':
                errorMessage = "The email address is not valid.";
                break;
              case 'auth/user-disabled':
                errorMessage = "The user corresponding to the given email has been disabled.";
                break;
              case 'auth/user-not-found':
                errorMessage = "There is no user corresponding to the given email.";
                break;
              case 'auth/wrong-password':
                errorMessage = "The password is invalid for the given email.";
                break;
            }

            showAlert(errorMessage);
          } finally {
            hideLoader(loginForm);
          }
        }
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuthForm);
} else {
  initAuthForm();
}

// Add logout functionality
export const logout = () => {
  signOut(auth)
    .then(() => {
      console.log("User was signout successfully");
      // Clear storage and redirect only after successful signout

      // Clear All caches
      cachedUser = null;
      authCheckPromise = null;

      sessionStorage.clear();
      localStorage.clear();

      location.replace("/"); // redirect to home page
    })
    .catch((error) => {
      // Display error message
      console.log("Error occured during signout: ", error);
      showAlert("Error signing out. Please try again.");
    });
};
