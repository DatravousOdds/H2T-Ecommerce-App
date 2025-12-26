
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
} from "../api/firebase-client.js";



// Initialize Firebase Auth
const auth = getAuth();
const db = getFirestore();

// ================================
// CACHING - The key to speed!
// ================================
let cachedUser = null;
let authCheckPromise = null;

// Fetch user profile with caching
const fetchUserProfile = async (user) => {
  try {
    // Check sessionStorage first
    const cachedProfile = sessionStorage.getItem(`profile_${user.uid}`);
    if (cachedProfile) {
      console.log("✅ Using cached profile from sessionStorage");
      return JSON.parse(cachedProfile);
    }

    console.log("Fetching user profile for email:", user.email);
    const docRef = doc(db, "userProfiles", user.email);
    const docSnap = await getDoc(docRef);

    // Fetching user profile
    if (docSnap.exists()) {
      const userData = {
        uid: user.uid,
        email: user.email,
        ...docSnap.data()
      };

      // Cache profile
      sessionStorage.setItem(`profile_${user.uid}`, JSON.stringify(userData));
      console.log('✅ Profile cached in sessionStorage');
      
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
  
  if (cachedUser !== null) {
    console.log('⚡️ Returning cached user (instant)');
    return Promise.resolve(cachedUser);
  }

  if (authCheckPromise) {
    console.log('Auth check in progress, waiting...')
    return authCheckPromise;
  }

  console.time("Auth check duration");

   authCheckPromise = new Promise((resolve, reject) => {
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
  });

  return authCheckPromise;
}

// Update your sendData function to handle the response
// const submitFormData = async (path, data) => {
//   try {
//     console.log("Submitting data:", data);
//     const response = await fetch(path, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json"
//       },
//       body: JSON.stringify(data)
//     });

//     const responseData = await response.json();
//     console.log("Server response:", responseData);

//     if (responseData.alert) {
//       showAlert(responseData.alert);
//     } else if (responseData.success) {
//       console.log("Login successful, storing user data");
//       // Store in both sessionStorage (for your existing code)

//       const userData = {
//         name: responseData.data.name,
//         email: responseData.data.email,
//         seller: responseData.data.seller,
//         authToken: responseData.data.token
//       };

//       console.log("Storing user data:", userData);
//       sessionStorage.user = JSON.stringify(userData);

//       // and localStorage (for navigation)
//       localStorage.setItem(
//         "user",
//         JSON.stringify({
//           name: responseData.data.name,
//           email: responseData.data.email,
//           seller: responseData.data.seller
//         })
//       );
//       localStorage.setItem("token", responseData.data.token);

//       console.log("Redirecting to home page");
//       location.replace("/");
//     } else {
//       console.log("Unexpected response format:", responseData);
//       showAlert("Unexpected response from server");
//     }
//   } catch (error) {
//     console.error("Error during form submission:", error);
//     showAlert("Something went wrong. Please try again.");
//   } finally {
//     loader.style.display = "none";
//   }
// };

// Create user profile in Firestore
const createUserDocument = async (user, additionalData) => {
  try {
    // add to users collection
    await setDoc(doc(db, "users", user.email), {
      // profile data
      createdAt: new Date(),
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
    await setDoc(doc(db, "userProfiles", user.email), {
      // profile data
      ...additionalData
    });
    console.log("User profile created for:", user.email);
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error; // Throw error to be caught by caller
  }
}

// DOMContentLoaded event to ensure the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  const loader = document.querySelector(".loader");
  // select inputs
  const submitBtn = document.querySelector(".submit-btn");
  const name = document.querySelector("#name") || null;
  const email = document.querySelector("#email");
  const password = document.querySelector("#password");
  const number = document.querySelector("#number") || null;
  const tac = document.querySelector("#terms-and-cond") || null;
  const noti = document.querySelector("#notification") || null;

  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {

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
        loader.style.display = "block";

        try{
            // Create user with email and password
            const userCredential  = await createUserWithEmailAndPassword(auth, email.value, password.value);
          
           const user = userCredential.user;
           console.log("User created:", user.uid);

           // Update user profile with display name
           await updateProfile(user, { displayName: name.value });

           console.log("User profile updated with name:", name.value);

           const userData = {
            "Email": email.value,
            "FirstName": name.value,
            "LastName": "",
            "phoneNumber": number.value,
            
           }

           // Proceed to submit form data to your server
           await createUserDocument(user, {
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
            uid:user.uid,
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
          loader.style.display = "none";
        }

      } else {
        // ====== LOGIN PAGE ======

        // login page validation
        if (!email.value.length || !password.value.length) {
          showAlert("Fill all the inputs");
          return;
        } 


          loader.style.display = "block";

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
              uid: user.uid,
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
            loader.style.display = "none";
          }
        }
    });
  }
});

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
