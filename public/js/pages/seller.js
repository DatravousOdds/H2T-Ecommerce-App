let loader = document.querySelector(".loader");
let user = JSON.parse(sessionStorage.user || null);

const bcomeSellerEle = document.querySelector(".bcome-seller");
const prodListingEle = document.querySelector(".product-listing");
const applyForm = document.querySelector(".apply");
const showApplyFormBtn = document.querySelector("#apply-btn");

window.onload = () => {
  if (user) {
    if (compareToken(user.authToken, user.email)) {
      if (!user.seller) {
        bcomeSellerEle.classList.remove("hide");
      } else {
        loader.style.display = "block";
        setupProducts();
      }
    } else {
      location.replace("/login");
    }
  } else {
    location.replace("/login");
  }
};

showApplyFormBtn.addEventListener("click", () => {
  bcomeSellerEle.classList.add("hide");
  applyForm.classList.remove("hide");
});

// form submission

const applyFormBtn = document.querySelector("#form-btn");
const bussinessName = document.querySelector("#b-name");
const addy = document.querySelector("#b-add");
const about = document.querySelector("#about");
const num = document.querySelector("#number");
const terms = document.querySelector("#terms-and-cond");
const realinfo = document.querySelector("#realinfo");

applyFormBtn.addEventListener("click", () => {
  if (
    !bussinessName.value.length ||
    !addy.value.length ||
    !about.value.length ||
    !num.value.length
  ) {
    showAlert("fill all the inputs");
  } else if (!terms.checked || !realinfo.checked) {
    showAlert("you must agree to our terms and conditions");
  } else {
    // making server request
    loader.style.display = "block";
    sendData("/seller", {
      name: bussinessName.value,
      addy: addy.value,
      about: about.value,
      num: num.value,
      terms: terms.checked,
      realinfo: realinfo.checked,
      email: JSON.parse(sessionStorage.user).email
    });
  }
});

const setupProducts = () => {
  fetch("/get-products", {
    method: "post",
    headers: new Headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ email: user.email })
  })
    .then((res) => res.json())
    .then((data) => {
      loader.style.display = null;
      prodListingEle.classList.remove("hide");
      if (data == "no products") {
        let noSvg = document.querySelector(".no-product-image");
        noSvg.classList.remove("hide");
      } else {
        data.forEach((product) => createProduct(product));
      }
    });
};
