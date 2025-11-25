// needed imports
import { getAuth, sendPasswordResetEmail, app } from "../api/firebase-client.js";


// initialize auth
const auth = getAuth(app);  

console.log(auth)
// needed elements for password reset
const forgotForm = document.getElementById("forgot-form");
const emailInput = document.getElementById("email");

// testing
console.log(forgotForm, emailInput.value);

// handle password reset form submission
forgotForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  console.log(email)

  try {
    await sendPasswordResetEmail(auth, email);
    // alert("Password reset email sent! Please check your inbox.");
    // Optionally, redirect to a confirmation page
    window.location.href = "/auth/email-sent.html?email=" + encodeURIComponent(email);
    
    // Clear the form
    forgotForm.reset();

    
  } catch (error) {
    console.error("Error during password reset:", error);
  }
});