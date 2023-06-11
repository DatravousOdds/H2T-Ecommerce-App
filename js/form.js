// redirect to the home page if user is confirmed
window.onload = () => {
  if (sessionStorage.user) {
    user = JSON.parse(sessionStorage.user);
    if (compareToken(user.authToken, user.email)) {
      location.replace("/");
    }
  }
};

const loader = document.querySelector(".loader");

// select inputs
const subBtn = document.querySelector(".submit-btn");
const firstName = document.querySelector("#fname") || null;
const email = document.querySelector("#email");
const password = document.querySelector("#password");
const lastName = document.querySelector("#lname") || null;
const tac = document.querySelector("#terms-and-cond") || null;
const noti = document.querySelector("#notification") || null;

subBtn.addEventListener("click", () => {
  if (firstName != null) {
    // sign up page
    if (firstName.value.length < 1) {
      showAlert("first name must be 3 letters long");
    } else if (!firstName.value.length) {
      showAlert("enter your first name");
    } else if (!lastName.value.length) {
      showAlert("enter your last name");
    } else if (!email.value.length || !email.value.includes("@")) {
      showAlert("enter a valid email");
    } else if (password.value.length < 8) {
      showAlert("password should be 8 letters long");
    } else if (!tac.checked) {
      showAlert("you must agree to our terms and conditions");
    } else {
      //submit
      loader.style.display = "block";
      sendData('/signup', {
        firstName: firstName.value,
        lastName: lastName.value,
        email: email.value,
        password: password.value,
        tac: tac.checked,
        notification: noti.checked,
        seller: false
      });
    }
  } else {
    // login page
    if (!email.value.length || !password.value.length) {
      showAlert("fill all the inputs");
    } else {
      loader.style.display = "block";
      sendData("/login", {
        email: email.value,
        password: password.value,
      });
    }
  }
});
