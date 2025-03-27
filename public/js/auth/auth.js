import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  db,
  doc,
  getDoc
} from "../api/firebase-client.js";

// Fetch user profile
const fetchUserProfile = async (user) => {
  try {
    const docRef = doc(db, "userProfiles", user.email);
    console.log("Fetching user profile for email:", user.email);
    const docSnap = await getDoc(docRef);

    // Fetching user profile
    if (docSnap.exists()) {
      const userData = {
        uid: user.uid,
        email: user.email,
        ...docSnap.data()
      };
      // console.log("User profile found:", userData);
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

// Checks user status and gets their profile data
export function checkUserStatus() {
  return new Promise((resolve, reject) => {
    const auth = getAuth();
    console.log("Starting auth check...");

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        unsubscribe(); // Stop listening for changes

        if (user) {
          try {
            // console.log("User is authenticated:", user.email);
            const userData = await fetchUserProfile(user);
            resolve(userData);
          } catch (error) {
            reject(error);
          }
        } else {
          console.log("No user authenticated");
          resolve(null);
        }
      },
      (error) => {
        console.error("Auth state change error:", error);
        reject(error);
      }
    );
  });
}

// Update your sendData function to handle the response
const submitFormData = async (path, data) => {
  try {
    console.log("Submitting data:", data);
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const responseData = await response.json();
    console.log("Server response:", responseData);

    if (responseData.alert) {
      showAlert(responseData.alert);
    } else if (responseData.success) {
      console.log("Login successful, storing user data");
      // Store in both sessionStorage (for your existing code)

      const userData = {
        name: responseData.data.name,
        email: responseData.data.email,
        seller: responseData.data.seller,
        authToken: responseData.data.token
      };

      console.log("Storing user data:", userData);
      sessionStorage.user = JSON.stringify(userData);

      // and localStorage (for navigation)
      localStorage.setItem(
        "user",
        JSON.stringify({
          name: responseData.data.name,
          email: responseData.data.email,
          seller: responseData.data.seller
        })
      );
      localStorage.setItem("token", responseData.data.token);

      console.log("Redirecting to home page");
      location.replace("/");
    } else {
      console.log("Unexpected response format:", responseData);
      showAlert("Unexpected response from server");
    }
  } catch (error) {
    console.error("Error during form submission:", error);
    showAlert("Something went wrong. Please try again.");
  } finally {
    loader.style.display = "none";
  }
};

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
    submitBtn.addEventListener("click", () => {
      if (name != null) {
        // sign up page validation
        if (name.value.length < 3) {
          showAlert("name must be 3 letters long");
        } else if (!email.value.length) {
          showAlert("enter your email");
        } else if (password.value.length < 8) {
          showAlert("password should be 8 letters long");
        } else if (!number.value.length) {
          showAlert("enter your phone number");
        } else if (!Number(number.value) || number.value.length < 10) {
          showAlert("invalid number, please enter valid one");
        } else if (!tac.checked) {
          showAlert("you must agree to our terms and conditions");
        } else {
          // Signed up
          createUserWithEmailAndPassword(auth, email.value, password.value)
            .then((userCredential) => {
              const user = userCredential.user;
              console.log(user);
              loader.style.display = "block";
              return submitFormData("/signup", {
                name: name.value,
                email: email.value,
                password: password.value,
                number: number.value,
                tac: tac.checked,
                notification: notification.checked,
                seller: false
              });
            })
            .catch((error) => {
              showAlert(error.message);
            });
        }
      } else {
        // login page validation
        if (!email.value.length || !password.value.length) {
          showAlert("fill all the inputs");
        } else {
          loader.style.display = "block";
          // For login
          const auth = getAuth();
          signInWithEmailAndPassword(auth, email.value, password.value)
            .then((userCredential) => {
              // Signed in
              const user = userCredential.user;
              console.log(user);
              loader.style.display = "block";
              return submitFormData("/login", {
                email: email.value,
                password: password.value
              });
            })
            .catch((error) => {
              showAlert(error.message);
            });
        }
      }
    });
  }
});

// Add logout functionality
export const logout = () => {
  const auth = getAuth();
  signOut(auth)
    .then(() => {
      console.log("User was signout successfully");
      // Clear storage and redirect only after successful signout
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
