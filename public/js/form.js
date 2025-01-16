// redirect to the home page if user is confirmed
// window.onload = () => {
//   if (sessionStorage.user) {
//     user = JSON.parse(sessionStorage.user);
//     if (compareToken(user.authToken, user.email)) {
//       location.replace("/");
//     }
//   }
// };

const loader = document.querySelector(".loader");

// select inputs
const subBtn = document.querySelector(".submit-btn");
const name = document.querySelector("#name") || null;
const email = document.querySelector("#email");
const password = document.querySelector("#password");
const number = document.querySelector("#number") || null;
const tac = document.querySelector("#terms-and-cond") || null;
const noti = document.querySelector("#notification") || null;

// Update your sendData function to handle the response
const submitFormData = async (path, data) => {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const responseData = await response.json();

    if (responseData.alert) {
      showAlert(responseData.alert);
    } else if (responseData.success) {
      // Store in both sessionStorage (for your existing code)
      // and localStorage (for navigation)
      sessionStorage.user = JSON.stringify({
        name: responseData.data.name,
        email: responseData.data.email,
        seller: responseData.data.seller,
        authToken: responseData.data.token
      });

      localStorage.setItem(
        "user",
        JSON.stringify({
          name: responseData.data.name,
          email: responseData.data.email,
          seller: responseData.data.seller
        })
      );
      localStorage.setItem("token", responseData.data.token);

      location.replace("/");
    }
  } catch (error) {
    showAlert("Something went wrong. Please try again.");
  } finally {
    loader.style.display = "none";
  }
};

subBtn.addEventListener("click", () => {
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
      //submit
      loader.style.display = "block";
      submitFormData("/signup", {
        name: name.value,
        email: email.value,
        password: password.value,
        number: number.value,
        tac: tac.checked,
        notification: notification.checked,
        seller: false
      });
    }
  } else {
    // login page validation
    if (!email.value.length || !password.value.length) {
      showAlert("fill all the inputs");
    } else {
      loader.style.display = "block";
      submitFormData("/login", {
        email: email.value,
        password: password.value
      });
    }
  }
});

// Add logout functionality
const logout = () => {
  sessionStorage.clear();
  localStorage.clear();
  location.replace("/login");
};
