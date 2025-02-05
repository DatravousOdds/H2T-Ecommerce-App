"use strict";

import { generateCountries, validateForm, closeDropdown } from "./global.js";
import {
  db,
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs
} from "./firebase-client.js";
import { checkUserStatus } from "./auth.js";

// Update profile information
const updateProfile = async (email, updateData) => {
  try {
    const userDocRef = doc(db, "userProfiles", email);
    await updateDoc(userDocRef, {
      ...updateData,
      lastUpdated: new Date()
    });
    showAlert("Profile updated successfully", "success");
  } catch (error) {
    console.error("Error fetching profile:", error);
    showAlert("Error updating profile");
  }
};

// Update shipping information
const updateShippingInfo = async (email, shippingData) => {
  try {
    await db.collection("userProfiles").doc(email).update({
      address1: shippingData.address1,
      address2: shippingData.address2,
      state: shippingData.state,
      postalCode: shippingData.postalCode,
      lastUpdated: new Date()
    });
    showAlert("Shupping information updated", "success");
  } catch (error) {
    console.error("Error updating shipping:", error);
    showAlert("Error updating shipping information");
  }
};

// Update profile picture
const updateProfilePicture = async (email, imageUrl) => {
  try {
    // First upload to S3 (will implement this later)

    // Then update profile
    await db.collection("userProfiles").doc(email).update({
      profileImage: imageUrl,
      lastUpdated: new Date()
    });

    showAlert("Profile picture updated", "success");
  } catch (error) {
    console.error("Error updating profile picture:", error);
    showAlert("Error updating profile picture");
  }
};

// update personal information
const updatePersonalInfo = async (email, data) => {
  if (!email && !data) {
    // check if user is autheticate

    // get user document
    const userDocRef = getDoc();
  }
};

// update payment information
const updatePaymentInfo = async (email, data) => {};

// update notification settings
const updateNotificationSettings = async (email, data) => {};

async function loadProfileData() {
  try {
    const userData = await checkUserStatus();
    console.log("User Data imported:", userData);
    if (userData) {
      loadPersonalInfoData(userData);
      loadShippingInfoData(userData);
      loadProfileDisplayData(userData);
      loadReviewData(userData);
      loadFavoritesData(userData);
      loadNotificationData(userData);
      loadPaymentInfoData(userData);
      loadSellingData(userData);
      loadPurchasesData(userData);
      loadSettingsData(userData);
    }
  } catch (error) {
    console.error("Error happened when loading userData from auth.js", error);
    throw error;
  }
}

function loadProfileDisplayData(userData) {
  if (userData.backgroundImage) {
    const profileBackground = document.querySelector(".profile-background");
    profileBackground.style.backgroundImage = `url('${userData.backgroundImage}')`;
  } else {
    console.log("No user data available");
  }
  // profile picture image
  document.querySelector("#profile-picture").value = userData.profileImage;
  // profile username
  document.querySelector("#username").value = userData.username;
  document.querySelector("#timestamp-container").value = userData.joinedDate;
  document.querySelector("#verified-tag").value = userData.isVerified;
  // user stats
  document.querySelector("#followers-count").textContent =
    userData.stats.followers;
  document.querySelector("#following-count").textContent =
    userData.stats.following;
  document.querySelector("#current-rating").textContent = userData.stats.rating;
}

function loadPersonalInfoData(userData) {
  //  personal information
  document.querySelector("#personal-fname").value = userData.FirstName;
  document.querySelector("#personal-lname").value = userData.LastName;
  document.querySelector("#personal-email").value = userData.Email;
  document.querySelector("#personal-phoneNumber").value = userData.phoneNumber;
}

function loadShippingInfoData(userData) {
  // shipping information
  document.querySelector("#shipping-fname").value = userData.FirstName;
  document.querySelector("#shipping-lname").value = userData.LastName;
  document.querySelector("#shipping-address").value = userData.address1;
  document.querySelector("#shipping-address2").value = userData.address2;
  document.querySelector("#shipping-city").value = userData.city;
  document.querySelector("#shipping-state").value = userData.state;
  // document.querySelector("#shipping-postalCode").value =
  //   userData.postalCode || "";
  document.querySelector("#shipping-phoneNumber").value = userData.phoneNumber;
}

function loadReviewData(userData) {
  // review section
  document.querySelector("#average-rating").textContent =
    userData.ratings.metrics.averageRating;
  document.querySelector("#total-ratings").textContent =
    userData.ratings.metrics.totalRatings;
  // review counts
  for (let i = 1; i <= 5; i++) {
    const element = document.querySelector(`#rating-count-${i}`);
    if (element) {
      const ratingCount = userData.ratings.ratingCounts[i] || 0;
      const reviewText = ratingCount === 1 ? "review" : "reviews";
      element.textContent = `${ratingCount} ${reviewText}`;
    }
  }
  // review categories
}

async function loadPaymentInfoData(userData) {
  const payoutItems = document.querySelectorAll(".payouts-item");
  console.log(payoutItems);
  if (userData) {
    // load wallet info
    document.querySelector("#act-wallet-balance").textContent =
      userData.wallet.balance;
    document.querySelector("#monthly-activity").textContent =
      userData.wallet.monthlyActivity;
    document.querySelector("#pending-balance").textContent =
      userData.wallet.pendingBalance;
    document.querySelector("#currency-info").textContent =
      userData.wallet.currency;
    document.querySelector("#update-status").textContent =
      userData.wallet.lastUpdated;

    // load payout info
    document.querySelector("#upcoming-payouts").textContent =
      userData.payments.upcomingPayouts;
    document.querySelector("#payout-schedule").textContent =
      userData.payments.payoutSchedule;
    try {
      const payoutsRef = collection(
        db,
        "userProfiles",
        userData.email,
        "payouts"
      );
      const snapShot = await getDocs(payoutsRef);

      // Log what we got
      console.log("Number of payouts:", snapShot.size);
    } catch (error) {
      console.error("Error occured when fetching payouts:", error);
    }
  }
}

function loadSellingData(userData) {
  if (userData) {
    // load selling info
  }
}

function loadFavoritesData(userData) {
  if (userData) {
    // load user's favorite items
  }
}

function loadNotificationData(userData) {
  if (userData) {
    // load user notification settings
  }
}

function loadPurchasesData(userData) {}

function loadSettingsData(userData) {}

// generate countries for select element
document.addEventListener("DOMContentLoaded", () => {
  const apiUrl = "https://restcountries.com/v3.1/all";
  generateCountries(apiUrl, "shipping-country");
  loadProfileData();
});

// Payment Information Section
const dropdownSection = document.querySelectorAll(".dropdown-section");
const smallDropdownSection = document.querySelectorAll(".dropdown-section-sm");
const spanElement = document.getElementById("filter-icon");
const profileSection = document.querySelectorAll(".profile-section");
const hasFilterIcon =
  spanElement && spanElement.querySelector("i.fa-filter") !== null;

// Bio Section
const bioTextarea = document.getElementById("bio-value");
const updateBioBtn = document.getElementById("update-bio-btn"); // Edit profile Button
const saveBioBtn = document.getElementById("save-bio-btn"); // save changes Button
const allTabs = document.querySelectorAll(".tab-btn");
const pfpActions = document.getElementById("pfp-actions");
const fileInput = document.getElementById("file-input");
const uploadBtn = document.getElementById("upload-btn");
const profilePicture = document.getElementById("profile-picture");
const removeBtn = document.getElementById("remove-btn");
const websiteLinks = document.getElementById("website-link-box");
// Image upload validation and preview
const maxFileSize = 2 * 1024 * 1024; // 2 MB in bytes
const feedback = document.getElementById("feedback");
// Website Links
const url = document.getElementById("website");
const title = document.getElementById("title");
const websiteFeedback = document.getElementById("website-feedback");
const titleFeedback = document.getElementById("title-feedback");
const websiteUrlDisplay = document.getElementById("website-link-display");
// Forms
const personalInformationForm = document.getElementById("personalInformation");
const shippingInformationForm = document.getElementById("shippingInformation");
// close add card popup
const closePopup = document.getElementById("closePopup");

// Form submission
personalInformationForm.addEventListener("submit", async (e) => {
  e.preventDefault(); // prevents form submission for validation checks
  if (validateForm(personalInformationForm)) {
    console.log("session", localStorage.user);
    const user = JSON.parse(localStorage.user);
    const updateData = {
      firstName: document.querySelector("#fname").value,
      lastName: document.querySelector("#lname").value,
      phoneNumber: document.querySelector("#phoneNumber").value,
      username: document.querySelector("#profile-username").value,
      lastUpdated: new Date()
    };
    console.log("Updated Data: ", updateData);
    await updateProfile(user.email, updateData);
  }
});

shippingInformationForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (validateForm(shippingInformationForm)) {
    const user = JSON.parse(sessionStorage.user);
    const shippingData = {
      firstName: document.querySelector("#shippingInformation #fname").value,
      lastName: document.querySelector("#shippingInformation #lname").value,
      address1: document.querySelector("#shippingInformation #address").value,
      address2: document.querySelector("#shippingInformation #address-two")
        .value,
      city: document.querySelector("#shippingInformation #city").value,
      state: document.querySelector("#shippingInformation #state-select").value,
      postalCode: document.querySelector("#shippingInformation #postal").value,
      country: document.querySelector("#shippingInformation #country").value,
      phoneNumber: document.querySelector("#shippingInformation #phoneNumber")
        .value,
      lastUpdated: new Date()
    };

    await updateShippingInfo(user.email, shippingData);
  }
});

const cardWrappers = document.querySelectorAll(".payment-card");
cardWrappers.forEach((card) => {
  // Check if the card already has a "Set Default" span, if not
  if (!card.querySelector(".set-default-card")) {
    const setDefaultBtn = document.createElement("button");
    setDefaultBtn.classList.add("set-default-card");
    card.appendChild(setDefaultBtn);
  }
});

function openPopupMenu(menuSelector) {
  const overlay = document.querySelector(menuSelector);
  if (!overlay) {
    console.error(`Menu element "${menuSelector}" not found`);
    return;
  }

  // Add active class with animation timing
  overlay.style.display = "flex";
  requestAnimationFrame(() => {
    overlay.classList.add("active");
  });

  // Prevent background scrolling
  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";

  // Add escape key listener
  document.addEventListener("keydown", handleEscapeKey);

  // Add click outside listener
  overlay.addEventListener("click", handleOutsideClick);

  // Focus first focusable element
  const firstFocusable = overlay.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (firstFocusable) {
    firstFocusable.focus();
  }
}

function closePopupMenu(menuSelector) {
  const overlay = document.querySelector(menuSelector);
  if (!overlay) {
    console.error(`Menu element "${menuSelector}" not found`);
    return;
  }

  overlay.classList.remove("active");

  // Reset scrolling
  document.body.style.overflow = "auto";
  document.documentElement.style.overflow = "auto";

  // Remove event listeners
  document.removeEventListener("keydown", handleEscapeKey);
  overlay.removeEventListener("click", handleOutsideClick);

  // Reset form if present
  const form = overlay.querySelector("form");
  if (form) {
    form.reset();
  }

  // Hide overlay after animation
  overlay.addEventListener("transitionend", function hideOverlay() {
    overlay.style.display = "none";
    overlay.removeEventListener("transitionend", hideOverlay);
  });
}

function handleEscapeKey(event) {
  if (event.key === "Escape") {
    const activeMenu = document.querySelector(".add-card-menu.active");
    if (activeMenu) {
      closePopupMenu(".add-card-menu");
    }
  }
}

function handleOutsideClick(event) {
  const popup = event.currentTarget.querySelector(".add-card-popup");
  if (popup && !popup.contains(event.target)) {
    closePopupMenu(".add-card-menu");
  }
}

function showError(element, message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message;

  if (element) {
    const existingError = element.parentElement.querySelector(".error-message");
    if (existingError) {
      existingError.remove();
    }

    element.parentElement.appendChild(errorDiv);
    element.classList.add("error");
    element.focus();
  } else {
    const formElement = document.getElementById("add-card");
    formElement.insertBefore(errorDiv, formElement.firstChild);
  }

  setTimeout(() => {
    errorDiv.remove();
    if (element) {
      element.classList.remove("error");
    }
  }, 3000);
}

function removeError(element) {
  element.classList.remove("error");
  const errorMessage = element.parentElement.querySelector(".error-message");
  console.log("Error Messasge: ", errorMessage);
  if (errorMessage) {
    errorMessage.remove();
  }
}

function formatTimestamp(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now - date) / 1000);

  // Less than a minute
  if (diffInSeconds < 60) {
    return "Just now";
  }

  // Less than an hour
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }

  // Less than a day
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  // Less than a week
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }

  // Less than a month
  if (diffInSeconds < 2592000) {
    const weeks = Math.floor(diffInSeconds / 604800);
    return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  }

  // Less than a year
  if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} ${months === 1 ? "month" : "months"} ago`;
  }

  // More than a year
  const years = Math.floor(diffInSeconds / 31536000);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

/* Add card Popup Functionality */

function validateCardForm(element, errorMessage, options = {}) {
  const value = element.value.trim();
  const existingError = element.parentElement.querySelector(".error-message");
  if (existingError) {
    existingError.remove();
  }

  if (
    !value ||
    (options.minLength && value.length < options.minLength) ||
    (options.maxLength && value.length > options.maxLength)
  ) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = errorMessage;
    element.parentElement.appendChild(errorDiv);
    element.classList.add("error");
    return true;
  }
  element.classList.remove("error");
  return false;
}

function validateExpiry(element, errorMessage) {
  const value = element.value.trim();

  const expiryDate = new Date(value);
  console.log(expiryDate);

  const today = new Date();
  console.log(today);

  if (expiryDate < today || !value) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = errorMessage;
    element.parentElement.appendChild(errorDiv);
    element.classList.add("error");
    return true;
  }
  return false;
}
// Form Validation and Formatting

// Add these element references
const methodSelection = document.querySelector(".select-method-card");
const card_form = document.querySelector("#card-form");
const cardForm = document.querySelector("#cardForm");
const bankForm = document.querySelector("#bankForm");
const successCard = document.querySelector("#successCard");

// Card Number Formatting
const cardNumber = document.querySelector("#cardForm #cardNumber");
const expiry = document.querySelector("#cardForm #expiry");
const cvv = document.querySelector("#cardForm #cvv");

if (cardNumber) {
  cardNumber.addEventListener("input", (e) => {
    // Remove all non-digit characters
    let value = e.target.value.replace(/\D/g, "");
    // Insert spaces every 4 digits
    value = value.replace(/(\d{4})(?=\d)/g, "$1 ");
    // Limit to 19 digits
    value = value.substring(0, 19);
    e.target.value = value;
  });
}

// CVV Formatting

if (cvv) {
  cvv.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").substring(0, 4);
  });
}

// Expiry Formatting

if (expiry) {
  expiry.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "");

    let month = value.substring(0, 2);
    // console.log("Month: ", month);

    let year = value.substring(2, 6);
    // console.log("Year: ", year);

    if (month.length === 1 && parseInt(month) > 1) {
      month = "0" + month;
      console.log("Month: ", month);
    }
    if (parseInt(month) > 12) {
      month = "12";
    }

    if (value.length > 2) {
      e.target.value = `${month}/${year}`;
    } else if (value.length === 2) {
      e.target.value = month;
    }

    e.target.value = e.target.value.substring(0, 7);
  });
}

const routingNumber = document.querySelector("#bankForm #routingNumber");
const accountNumber = document.querySelector("#bankForm #accountNumber");

if (routingNumber) {
  routingNumber.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").substring(0, 9);
    e.target.value = e.target.value.substring(0, 9);
  });
}

if (accountNumber) {
  accountNumber.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").substring(0, 12);
    e.target.value = e.target.value.substring(0, 12);
  });
}

if (cardForm) {
  cardForm.addEventListener("submit", (e) => {
    e.preventDefault(); // Prevent form submission immediately
    let hasError = false;

    // Get form elements with null checks
    const formElements = {
      nameOnCard: document.querySelector("#cardForm #nameOnCard"),
      cardNumber: document.querySelector("#cardForm #cardNumber"),
      cvv: document.querySelector("#cardForm #cvv"),
      expiry: document.querySelector("#cardForm #expiry"),
      billingAddress: document.querySelector("#cardForm #billingAddress")
    };

    if (!formElements) {
      console.error("Form elements not found");
      return;
    }
    // Clear any existing errors
    const errorMessages = document.querySelectorAll(".error-message");
    errorMessages.forEach((msg) => msg.remove());

    // Clear error styles
    // const errorStyles = document.querySelectorAll(".error");
    // errorStyles.forEach((style) => style.remove());

    // // Remove error class from all inputs
    // Object.values(formElements).forEach((input) => {
    //   if (input) input.classList.remove("error");
    // });

    // Validation becomes much cleaner:
    hasError |= validateCardForm(
      formElements.cardNumber,
      "Please enter a valid card number (16 digits)",
      { minLength: 19, maxLength: 19 }
    );
    hasError |= validateCardForm(
      formElements.cvv,
      "Please enter a valid CVV (3-4 digits)",
      { minLength: 3, maxLength: 4 }
    );
    hasError |= validateCardForm(
      formElements.nameOnCard,
      "Please enter the cardholder name"
    );
    hasError |= validateCardForm(
      formElements.billingAddress,
      "Please enter a billing address"
    );
    hasError |= validateExpiry(
      formElements.expiry,
      "Please enter an expiry date",
      { minLength: 7, maxLength: 7 }
    );

    if (!hasError) {
      showSuccess(e);
      handleAddCard(e);
    }
  });
}

if (bankForm) {
  bankForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const formElements = {
      accountHolderName: document.querySelector("#bankForm #accountHolderName"),
      routingNumber: document.querySelector("#bankForm #routingNumber"),
      accountNumber: document.querySelector("#bankForm #accountNumber")
    };

    let hasError = false;

    const errorMessages = document.querySelectorAll(".error-message");
    errorMessages.forEach((msg) => msg.remove());

    Object.values(formElements).forEach((input) => {
      if (input) input.classList.remove("error");
    });

    hasError |= validateCardForm(
      formElements.accountNumber,
      "Please enter a valid account number (8-12 digits)",
      { minLength: 8, maxLength: 12 }
    );

    hasError |= validateCardForm(
      formElements.routingNumber,
      "Please enter a valid routing number (9 digits)",
      { minLength: 9, maxLength: 9 }
    );

    hasError |= validateCardForm(
      formElements.accountHolderName,
      "Please enter an account holder name"
    );

    if (!hasError) {
      showSuccess(e);
      handleAddBank(e);
    } else {
      e.preventDefault();
      return false;
    }
  });
}

function clearFormErrors(form) {
  if (!form) return;

  const errorMessages = form.querySelectorAll(".error-message");
  errorMessages.forEach((msg) => msg.remove());

  const inputElements = form.querySelectorAll("input");
  inputElements.forEach((input) => input.classList.remove("error"));

  if (form instanceof HTMLFormElement) form.reset();
}
// Define functions
function showCardForm() {
  methodSelection.style.display = "none";
  card_form.style.display = "block";
}

function showBankForm() {
  methodSelection.style.display = "none";
  bankForm.style.display = "block";
}

function showMethodSelection() {
  methodSelection.style.display = "block";
  card_form.style.display = "none";
  bankForm.style.display = "none";
  successCard.style.display = "none";
}

function showSuccess() {
  methodSelection.style.display = "none";
  card_form.style.display = "none";
  bankForm.style.display = "none";
  successCard.style.display = "block";
}

function resetFlow() {
  showMethodSelection();
}

const accountTypeButtons = document.querySelectorAll(
  "#edit-bank-details .account-type-buttons .account-type-button"
);

if (accountTypeButtons) {
  accountTypeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      button.classList.add("active");
    });
  });
}

// Add event listeners when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Payment options
  const cardOption = document.querySelector(".payment-option:nth-child(1)");

  const bankOption = document.querySelector(".payment-option:nth-child(2)");

  cardOption.addEventListener("click", () => {
    clearFormErrors(bankForm);
    showCardForm();
  });
  bankOption.addEventListener("click", () => {
    clearFormErrors(cardForm);
    showBankForm();
  });

  // Back button
  document.querySelectorAll(".back-button").forEach((btn) =>
    btn.addEventListener("click", () => {
      clearFormErrors(cardForm);
      clearFormErrors(bankForm);
      showMethodSelection();
    })
  );

  // Done button
  document
    .querySelector("#successCard .button")
    .addEventListener("click", resetFlow);
});

const addNewCard = document.querySelector(".add-card");
const closePopMenu = document.getElementById("closePopup");

addNewCard.addEventListener("click", () => {
  openPopupMenu(".payment-method-popup");
});

closePopMenu.addEventListener("click", () => {
  // popupMenu.classList.remove("active");
  closePopupMenu(".payment-method-popup");
});

// Event Listener for deleting card on file
document.addEventListener("click", (e) => {
  if (e.target.matches(".delete-card i")) {
    const cardWrapper = e.target.closest(".card-wrapper");
    if (cardWrapper) {
      cardWrapper.remove();
    }
  }
});

// Closes dropdown menu when click outside of menu
document.addEventListener("click", (event) => {
  closeDropdown(event, "select-year", "year-header", "yearIcon");
  closeDropdown(event, "dropdown-menu", "statement-header", "statementIcon");
  closeDropdown(event, "year-selection", "filter");
});

// Add Card functionality

const CARD_LIST_SELECTOR = ".card-list";
const CARD_WRAPPER_TEMPLATE = (name, lastFourDigits, expiry) => `
  <div class="card-wrapper">
    <div class="payment-card">
      <div class="card-icon">
        <i class="fa-brands fa-cc-discover"></i>
      </div>
      <div class="card-inner">
        <p class="default-paragraph card-name">${name} ****${lastFourDigits}</p>
        <p class="default-paragraph card-expiry">Expires on ${expiry}</p>
      </div>
    </div>
    <div class="card-options">
      <div class="edit-container">
        <button type="button" class="edit-card" aria-label="Edit Card">Edit</button>
      </div>
      <div class="delete-card">
        <i class="fa-regular fa-trash-can" aria-label="Delete Card"></i>
      </div>
    </div>
  </div>
`;

const BANK_WRAPPER_TEMPLATE = (nameOfBank, accountType, lastFourDigits) => `
  <div class="card-wrapper bank-card">
    <div class="payment-card" id="bank-account">
      <div class="bank-icon">
        <i class="fa-solid fa-building-columns"></i>
      </div>
      <div class="card-inner">
        <p class="default-paragraph bank-name" >${nameOfBank}</p>
        <p class="default-paragraph account-type">${accountType} ****${lastFourDigits}</p>
      </div>
    </div>
    <div class="card-options">
      <div class="edit-container">
        <button type="button" class="edit-card" aria-label="Edit Card">Edit</button>
      </div>
      <div class="delete-card">
        <i class="fa-regular fa-trash-can" aria-label="Delete Card"></i>
      </div>
    </div>
  </div>
`;

const closeBtnForDetails = document.querySelector(
  ".view-details-menu .close-button"
);

closeBtnForDetails.addEventListener("click", () => {
  closePopupMenu(".view-details-menu");
});

/* View Details Functionality */
const updateCardBtn = document.querySelector("#updateCard");
const continueBtn = document.querySelector("#step-1-verify-continue");
const cardHolder = document.querySelector(".view-details-menu #card-holder");
const expirationDate = document.querySelector(".view-details-menu #expiry");
const billingAddress = document.querySelector(
  ".view-details-menu #billingAddress"
);
const backToViewDetailsBtn = document.querySelector("#step-1-verify-back");
const cancelBtn = document.querySelectorAll(".btn-cancel");
const verifyBtn = document.querySelector("#verifyBtn");
const viewDetailsMenu = document.querySelector(".view-details-menu");
const backToStepOneView = document.querySelector("#backBtn");
const backToStepTwoView = document.querySelector("#backUpdateBtn");
const securityVerification1 = document.querySelector("#securityVerification1");
const securityVerification2 = document.querySelector("#securityVerification2");
const securityVerification3 = document.querySelector("#securityVerification3");

const statusCircles = document.querySelectorAll(
  "#securityVerification1 .status-icon-circle"
);

const statusCircle1 = document.querySelectorAll(
  "#securityVerification2 .status-icon-circle"
);

const statusCircle3 = document.querySelectorAll(
  "#securityVerification3 .status-icon-circle"
);

function showViewDetailsMenu() {
  viewDetailsMenu.style.display = "flex";
  viewDetailsMenu.classList.add("active");
  document.body.style.overflow = "hidden";
}

function hideViewDetailsMenu() {
  viewDetailsMenu.style.display = "none";
  viewDetailsMenu.classList.remove("active");
  document.body.style.overflow = "";
}

function resetVerificationState() {
  securityVerification1.classList.add("hidden");
  securityVerification2.classList.add("hidden");
  securityVerification3.classList.add("hidden");

  statusCircles.forEach((circle) => circle.classList.remove("active"));
  statusCircle1.forEach((circle) => circle.classList.remove("active"));
  statusCircle3.forEach((circle) => circle.classList.remove("active"));
}

// Continue to step 1 of verification
updateCardBtn.addEventListener("click", () => {
  hideViewDetailsMenu();
  resetVerificationState();
  securityVerification1.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  statusCircles[0].classList.add("active");
});

// Continue to step 2 of verification
continueBtn.addEventListener("click", () => {
  securityVerification1.classList.add("hidden");
  securityVerification2.classList.remove("hidden");
  statusCircle1[0].classList.add("active");
  statusCircle1[1].classList.add("active");
  document.body.style.overflow = "hidden";
});

// Back to view details menu
backToViewDetailsBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  securityVerification1.classList.add("hidden");
  showViewDetailsMenu();
  statusCircles.forEach((circle) => circle.classList.remove("active"));
});

// Continue to step 3 of verification
verifyBtn.addEventListener("click", () => {
  securityVerification2.classList.add("hidden");
  securityVerification3.classList.remove("hidden");
  statusCircle3.forEach((circle) => circle.classList.add("active"));
  document.body.style.overflow = "hidden";
});

// Back to step 1 of verification
backToStepOneView.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  securityVerification2.classList.add("hidden");
  securityVerification1.classList.remove("hidden");
  statusCircles[1].classList.remove("active");
});

// Back to step 2 of verification
backToStepTwoView.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  securityVerification3.classList.add("hidden");
  securityVerification2.classList.remove("hidden");
  statusCircle3[2].classList.remove("active");
});

// Edit Bank Details
const editBankDetailsBtn = document.querySelector("#edit-bank-details-btn");
editBankDetailsBtn.addEventListener("click", () => {
  closePopupMenu(".bank-modal-overlay");
  openPopupMenu(".edit-bank-overlay");
});

// Bank Details View Elements
const bankType = document.querySelector("#view-bank-details #bank-type");
const bankEnding = document.querySelector("#view-bank-details #bank-ending");
const accountHolder = document.querySelector(
  "#view-bank-details #account-holder"
);
const bankRoutingNumber = document.querySelector(
  "#view-bank-details #routing-number"
);
const bankAccountNumber = document.querySelector(
  "#view-bank-details #account-number"
);
const bankAccountType = document.querySelector(
  "#view-bank-details #account-type"
);
const bankDetailsCloseBtn = document.querySelector(
  "#view-bank-details .close-button"
);

bankDetailsCloseBtn.addEventListener("click", () => {
  closePopupMenu(".bank-modal-overlay");
});
// Edit Bank Account Validation
const editBankAccountForm = document.querySelector("#edit-bank-form");
const streetAddress = document.querySelector("#edit-bank-form #street");
const city = document.querySelector("#edit-bank-form #city");
const state = document.querySelector("#edit-bank-form #state");
const editBankAccountCancelBtn = document.querySelector(
  ".edit-bank-footer button:first-child"
);
const editBankAccountMenuCloseBtn = document.querySelector(
  ".edit-bank-header button"
);

const saveChangesBtn = document.querySelector(
  ".edit-bank-footer #saveChangesBtn"
);
const editBankOverlay = document.querySelector(".edit-bank-overlay");

class PaymentCardManager {
  constructor() {
    // Initialize class properties
    this.cardsContainer = document.querySelector("#cards-on-file");
    this.bankPopup = document.querySelector("#view-bank-details");
    this.popup = document.querySelector(".view-details-menu");
    this.closeButton = document.querySelector(
      ".view-details-menu .close-button"
    );
    this.bankCloseBtn = document.querySelector(
      "#view-bank-details .close-button"
    );
    this.activeCard = null;
    this.isPopupOpen = false; // Add state tracking

    if (!this.cardsContainer) {
      console.error("Cards container element not found");
      return;
    }

    if (!this.popup || !this.bankPopup) {
      console.error("Popup element not found");
      return;
    }

    // Bind methods to preserve context
    this.bindEscapeHandler = this.handleEscape.bind(this);
    this.handleClosePopup = this.closePopup.bind(this);

    this.init();
  }

  init() {
    this.setupEventListeners();

    // Add close button listener if it exists
    if (this.closeButton) {
      this.closeButton.addEventListener("click", this.handleClosePopup);
    }

    if (this.bankCloseBtn) {
      this.bankCloseBtn.addEventListener("click", this.handleClosePopup);
    }
  }

  setupEventListeners() {
    // Use event delegation for card container
    this.cardsContainer.addEventListener("click", (event) => {
      const target = event.target;
      console.log("Clicked element:", target);

      if (target?.matches(".set-default-card")) {
        this.setDefaultCard(target);
      } else if (target?.matches(".edit-card")) {
        this.toggleEditCardMode(target);
      } else if (target?.matches(".view-card-details")) {
        console.log("View details clicked");
        this.openViewDetails(target);
      }
    });

    // Add click outside listener for popup
    document.addEventListener("click", (event) => {
      if (
        this.isPopupOpen &&
        !this.bankPopup.contains(event.target) &&
        !this.popup.contains(event.target) &&
        !event.target.matches(".view-card-details")
      ) {
        this.closePopup();
      }
    });
  }

  showPopup(button) {
    const cardWrapper = button.closest(".card-wrapper");
    const isBankAccount = cardWrapper.classList.contains("bank-card");
    const popup = isBankAccount ? this.bankPopup : this.popup;
    if (!popup) {
      return;
    }

    this.isPopupOpen = true;
    popup.style.display = "flex"; // Ensure popup is visible

    resetVerificationState();

    this.removePrimaryTag(popup);

    if (cardWrapper.querySelector(".default-card")) {
      this.showPrimaryTag(popup);
    }

    // Use requestAnimationFrame for smooth animation
    requestAnimationFrame(() => {
      popup.classList.add("active");
      document.body.style.overflow = "hidden";
    });
  }

  closePopup() {
    if (!this.popup || !this.isPopupOpen) {
      console.log("Popup already closed or not found");
      return;
    }

    [this.popup, this.bankPopup].forEach((popup) => {
      if (popup) {
        console.log("Closing popup");
        document.removeEventListener("keydown", this.bindEscapeHandler);
        popup.classList.remove("active");
        // Clean up primary tag
        this.removePrimaryTag(popup);
      }
    });
  }

  openViewDetails(button) {
    console.log("Opening view details");
    this.showPopup(button);
  }

  setDefaultCard(button) {
    const cardWrapper = button.closest(".card-wrapper");
    if (!cardWrapper) return;

    this.clearDefaultCard();
    this.markAsDefault(cardWrapper);
    this.updatePopupView(true);
  }

  clearDefaultCard() {
    const defaultCard = this.cardsContainer.querySelector(".default-card");
    if (defaultCard) {
      const wrapper = defaultCard.closest(".card-wrapper");
      defaultCard.remove();
      this.updateCardInterface(wrapper, false);
    }
  }

  markAsDefault(cardWrapper) {
    const cardInner = cardWrapper.querySelector(".payment-card");
    const defaultTag = document.createElement("span");
    defaultTag.className = "default-card";
    defaultTag.textContent = "Default";
    defaultTag.setAttribute("aria-label", "Default payment method");
    cardInner.appendChild(defaultTag);

    this.updateCardInterface(cardWrapper, true);
  }

  updateCardInterface(cardWrapper, isDefault) {
    const editContainer = cardWrapper.querySelector(".edit-container");
    const mainButton =
      editContainer.querySelector("button") || document.createElement("button");

    if (isDefault) {
      mainButton.textContent = "View Details";
      mainButton.className = "view-card-details";
      mainButton.setAttribute("aria-label", "View card details");
      editContainer.querySelector(".set-default-card")?.remove();
    } else {
      mainButton.textContent = "Edit";
      mainButton.className = "edit-card";
      mainButton.setAttribute("aria-label", "Edit Card");
    }

    if (!mainButton.parentNode) editContainer.appendChild(mainButton);
  }

  toggleEditCardMode(button) {
    const cardWrapper = button.closest(".card-wrapper");
    if (!cardWrapper) return;

    button.textContent = "View Details";
    button.className = "view-card-details";
    button.setAttribute("aria-label", "View card details");

    if (!this.isDefaultCard(cardWrapper)) {
      this.addSetDefaultButton(cardWrapper);
    }
  }

  addSetDefaultButton(cardWrapper) {
    const editContainer = cardWrapper.querySelector(".edit-container");
    if (!editContainer || editContainer.querySelector(".set-default-card"))
      return;

    const setDefaultBtn = document.createElement("button");
    setDefaultBtn.textContent = "Set default";
    setDefaultBtn.className = "set-default-card";
    setDefaultBtn.setAttribute("aria-label", "Set as default card");
    setDefaultBtn.setAttribute("type", "button");
    editContainer.appendChild(setDefaultBtn);
  }

  handleEscape(event) {
    if (event.key === "Escape") {
      this.closePopup();
    }
  }

  isDefaultCard(cardWrapper) {
    return cardWrapper?.querySelector(".default-card") !== null;
  }

  showPrimaryTag(popup) {
    const container = popup.querySelector(".primary-card-container");
    if (!container) return;

    const existingTag = popup.querySelector(".primary-card");
    if (existingTag) return;

    const primaryTag = document.createElement("div");
    primaryTag.className = "primary-card";
    primaryTag.textContent = "Primary Payment Method";
    primaryTag.setAttribute("aria-label", "Primary payment method indicator");
    container.appendChild(primaryTag);
  }

  removePrimaryTag(popup) {
    const primaryTag = this.popup.querySelector(".primary-card");
    if (primaryTag) {
      primaryTag.remove();
    }
  }

  updatePopupView(isDefault) {
    if (!this.popup.classList.contains("active")) return;

    const existingTag = this.popup.querySelector(".primary-card");
    if (isDefault && !existingTag) {
      this.showPrimaryTag();
    } else if (!isDefault && existingTag) {
      existingTag.remove();
    }
  }
}

function handleAddCard(event) {
  event.preventDefault(); // Prevent default form submission
  // Get form values
  const newCard = {
    cardHolder: document.querySelector("#cardForm #nameOnCard")?.value,
    cvv: document.querySelector("#cardForm #cvv")?.value,
    cardNumber: document.querySelector("#cardForm #cardNumber")?.value,
    expirationDate: document.querySelector("#cardForm #expiry")?.value,
    billingAddress: document.querySelector("#cardForm #billingAddress")?.value,
    cardEnding: document.querySelector("#card-ending")
  };

  // Get the last 4 digits of the card
  const lastFourDigits = newCard.cardNumber.slice(-4);

  const cardNumber = document.querySelector(
    "#securityVerification3 .card-number"
  );
  const cardNumberId = document.querySelector("#card-number");
  cardNumber.textContent = `ending in ${lastFourDigits}`;
  cardNumberId.value = `**** **** **** ${lastFourDigits}`;

  // Update card list if CARD_LIST_SELECTOR and CARD_WRAPPER_TEMPLATE are defined
  const cardList = document.querySelector(CARD_LIST_SELECTOR);
  if (cardList && typeof CARD_WRAPPER_TEMPLATE === "function") {
    const newCardHTML = CARD_WRAPPER_TEMPLATE(
      newCard.cardHolder,
      lastFourDigits,
      newCard.expirationDate
    );
    cardList.insertAdjacentHTML("afterbegin", newCardHTML);
    closePopupMenu(".add-card-menu");
  }

  cardHolder.textContent = newCard.cardHolder;
  expirationDate.textContent = newCard.expirationDate;
  billingAddress.textContent = newCard.billingAddress;
  newCard.cardEnding.textContent = `Visa Debit ending in ${lastFourDigits}`;
}

function handleAddBank(event) {
  event.preventDefault();
  const newBank = {
    accountHolderName: document.getElementById("accountHolderName").value,
    routingNumber: document.getElementById("routingNumber").value,
    accountNumber: document.getElementById("accountNumber").value,
    accountType: document.querySelector("#bankForm .bank-detail-value")
      ?.textContent,
    bank: document.querySelector("#bankForm .bank-detail-value:nth-child(2)")
      ?.textContent
  };

  const lastFourDigits = newBank.accountNumber.slice(-4);

  const cardList = document.querySelector(CARD_LIST_SELECTOR);
  const newBankHTML = BANK_WRAPPER_TEMPLATE(
    newBank.accountHolderName,
    newBank.accountType,
    lastFourDigits
  );

  cardList.insertAdjacentHTML("afterbegin", newBankHTML);
  closePopupMenu(".add-card-menu");

  // Update bank details view
  bankEnding.textContent = `Bank Account ending in ${lastFourDigits}`;
  accountHolder.textContent = newBank.accountHolderName;
  bankRoutingNumber.textContent = newBank.routingNumber;
  bankAccountNumber.textContent = newBank.accountNumber;
  bankAccountType.textContent = newBank.accountType;
  // bank.textContent = newBank.bank;
}

function validateEditBankAccountForm() {
  let isValid = true;

  clearFormErrors();

  if (streetAddress.value.trim() === "") {
    showError(streetAddress, "Street address is required");
    isValid = false;
  }
  if (city.value.trim() === "") {
    showError(city, "City is required");
    isValid = false;
  }

  if (state.value.trim() === "") {
    showError(state, "State is required");
    isValid = false;
  } else if (!/^[A-Z]{2}$/.test(state.value.trim().toUpperCase())) {
    showError(state, "Invalid state abbreviation");
    isValid = false;
  }
  return isValid;
}

// Event Listeners
editBankAccountMenuCloseBtn.addEventListener("click", () => {
  editBankOverlay.classList.remove("active");
  editBankOverlay.style.display = "none";
  document.body.style.overflow = "auto";
});

saveChangesBtn.addEventListener("click", () => {
  validateEditBankAccountForm();
});
editBankAccountForm.addEventListener("submit", (e) => {
  e.preventDefault();

  if (validateEditBankAccountForm()) {
    console.log("Form is valid");

    // TODO: Send form data to server

    // TODO: Show success message
    const notification = new PaymentNotification();
    notification.success(
      "Bank account information updated successfully",
      "update"
    );

    // TODO: Close popup
    closePopupMenu(".edit-bank-overlay");
  }
});

editBankAccountCancelBtn.addEventListener("click", (e) => {
  e.preventDefault();
  closePopupMenu(".edit-bank-overlay");
});

// Payouts Event Listeners
const viewPayoutsBtn = document.querySelector(".view-all-payouts-link");
const viewPayoutsMenu = document.querySelector(".view-all-payouts-menu");
const closePayoutsMenu = document.getElementById("close-view-all-payouts");

viewPayoutsBtn.addEventListener("click", () => {
  viewPayoutsMenu.style.display = "flex";
});

closePayoutsMenu.addEventListener("click", () => {
  viewPayoutsMenu.style.display = "none";
});

// Initialize PaymentCardManager instance
const paymentManager = new PaymentCardManager();

// Profile actions: website link validation
url.addEventListener("change", () => {
  websiteFeedback.innerHTML = "";
  url.setCustomValidity("");

  if (url.value.trim() === "") {
    websiteFeedback.textContent = "";
    url.setCustomValidity("");
  } else if (!url.checkValidity()) {
    const errorIcon = document.createElement("i");
    errorIcon.classList.add("fa-solid", "fa-circle-exclamation", "error-msg");
    const errorMessage = document.createTextNode(
      "Please enter a valid URL (e.g., https:://example.com). "
    );
    websiteFeedback.appendChild(errorIcon);
    websiteFeedback.appendChild(errorMessage);
    url.setCustomValidity(
      "Please enter a valid URL (e.g., https://example.com). "
    );
  } else {
    websiteFeedback.innerHTML = "";
    url.setCustomValidity("");
  }
});

// Hide bio by default
bioTextarea.style.display = "none";

let currentBio = bioTextarea.value || "";
let currentUrl = url.value || "";
let currentUrlTitle = title.value || "";

// Max word count
const wordCountDisplay = document.getElementById("word-count");
const maxWords = 150;

// Toggle for "edit mode" state
let isEditMode = false;

bioTextarea.addEventListener("input", () => {
  const text = bioTextarea.value;
  const charCount = text.length;

  wordCountDisplay.textContent = `${charCount} / ${maxWords}`;

  // Show error  message if the words are greater than the max words
  if (charCount > maxWords) {
    wordCountDisplay.style.display = "flex";
    wordCountDisplay.classList.add("error-msg");

    bioTextarea.setCustomValidity(
      "You have exceeded the maximum of characters"
    );

    saveBioBtn.classList.add("disabled");
    saveBioBtn.disabled = true;
  } else if (charCount <= 0) {
    wordCountDisplay.style.display = "none";
    wordCountDisplay.classList.remove("error-msg");
    saveBioBtn.disabled = false;

    // clear any error message
    bioTextarea.setCustomValidity("");
  } else {
    wordCountDisplay.style.display = "flex";
    wordCountDisplay.classList.remove("error-msg");

    saveBioBtn.disabled = false;

    // clears the error message
    bioTextarea.setCustomValidity("");
  }
});

// Review section

// Reply Count Functionality
function updatedReplyCount(reviewCard) {
  // Skip counting if this is a reply-card
  if (reviewCard.classList.contains("reply-card")) return;

  const repliesContainer = reviewCard.querySelector(".review-replies");
  if (!repliesContainer) return;

  // Count all direct replies
  const directReplies = repliesContainer.children.length;

  // Count nested replies
  const nestedReplies = repliesContainer.querySelectorAll(
    ".reply-card .review-replies article"
  ).length;

  // Total reply count
  const totalReplies = directReplies + nestedReplies;

  const viewAllRepliesBtn = reviewCard.querySelector(".view-all-replies");
  const hideRepliesBtn = reviewCard.querySelector(".hide-replies");

  if (totalReplies > 0) {
    // Only show view replies button if there are replies
    viewAllRepliesBtn?.classList.remove("hidden");
    if (viewAllRepliesBtn) {
      // Use proper grammar for reply count
      const replyText = totalReplies === 1 ? "reply" : "replies";
      viewAllRepliesBtn.innerHTML = `View all ${replyText} (${totalReplies})`;
    }

    // Keep hide button hidden initially
    hideRepliesBtn?.classList.add("hidden");

    // Keep replies hidden initially
    repliesContainer.classList.add("hidden");
  } else {
    // Hide both buttons if no replies
    viewAllRepliesBtn?.classList.add("hidden");
    hideRepliesBtn?.classList.add("hidden");
  }
}

const reviewModal = document.getElementById("reviews-modal");
// see all reviews
const seeAllReviewsBtn = document.getElementById("see-all-reviews");
const closeReviewModal = document.querySelector(".review-close");
const reviewCards = document.querySelectorAll(".review-card");

reviewCards.forEach((reviewCard) => {
  // skip reply cards
  if (!reviewCard.classList.contains("reply-card")) {
    updatedReplyCount(reviewCard);
  }
});

// Review action: all reviews, close
seeAllReviewsBtn.addEventListener("click", () => {
  reviewModal.style.display = "flex";
  document.body.style.overflow = "hidden";
});

closeReviewModal.addEventListener("click", () => {
  reviewModal.style.display = "none";
  document.body.style.overflow = "auto";
});

// Review actions: view all replies
const viewAllRepliesBtn = document.querySelectorAll(".view-all-replies");
const hideRepliesBtn = document.querySelectorAll(".hide-replies");

viewAllRepliesBtn.forEach((btn) => {
  btn.addEventListener("click", () => {
    // Find parent review card
    const reviewCard = btn.closest(".review-card");
    const replies = reviewCard.querySelector(".review-replies");

    replies.classList.remove("hidden");
    replies.classList.add("animate-slide-down");

    // Hide view all replies button
    btn.classList.add("hidden");

    // Show hide replies button
    const hideRepliesBtn = reviewCard.querySelector(".hide-replies");
    hideRepliesBtn.classList.remove("hidden");
  });
});

hideRepliesBtn.forEach((btn) => {
  btn.addEventListener("click", () => {
    const reviewCard = btn.closest(".review-card");
    const replies = reviewCard.querySelector(".review-replies");

    replies.classList.add("animate-slide-up");
    btn.classList.add("hidden");

    // hide review replies
    replies.classList.add("hidden");

    // show view all replies button
    const viewAllRepliesBtn = reviewCard.querySelector(".view-all-replies");
    viewAllRepliesBtn.classList.remove("hidden");
  });
});

// Review actions: like review
const likeBtn = document.querySelectorAll(".like-btn");

likeBtn.forEach((btn) => {
  btn.addEventListener("click", () => {
    btn.classList.toggle("active");

    // TODO: send like to server
  });
});

// Review actions: reply to review, cancel reply, submit reply
const replyBtn = document.querySelectorAll(".reply-btn");
const cancelReplyBtn = document.querySelectorAll(".cancel-reply");
const submitReplyBtn = document.querySelectorAll(".reply-btn");
const editReplyBtn = document.querySelectorAll(".edit-reply-btn");
const replyDropdownBtn = document.querySelectorAll(".reply-dropdown-btn");
const deleteReplyBtn = document.querySelectorAll(".delete-reply-btn");
const REPLY_CARD_TEMPLATE = (pfp, username, replyText, timestamp) => `
<article class="review-card reply-card">
  <header class="user-review">
    <div class="user-info">
      <div class="user-image-wrapper">
        <img
          class="user-review-img"
          src="${pfp}"
          alt="user-image"
          width="50"
          height="50"
        />
      </div>
      <div class="username-and-rating">
        <div class="username-wrapper">
          <h3 class="username">${username}</h3>
          <span class="seller-badge">Seller</span>
        </div>
      </div>
    </div>
    <div class="reply-actions">
      <time class="rating-timestamp" datetime="${timestamp}">
        ${formatTimestamp(timestamp)}
      </time>
    <div class="reply-dropdown-btn">
      <button class="reply-dropdown-btn">
        <i class="fa-solid fa-ellipsis"></i>
      </button>
      <div class="reply-dropdown-content hidden">
        <button class="edit-reply-btn">
          <i class="fa-solid fa-pen"></i>
          Edit Reply
        </button>
        <button class="delete-reply-btn">
          <i class="fa-solid fa-trash"></i>
          Delete Reply
        </button>
      </div>
    </div>
    </div>
  </header>
  <p class="review-details">
    ${replyText}
  </p>
  <div class="edit-form-wrapper hidden">
    <form class="edit-form">
      <textarea>${replyText}</textarea>
      <div class="edit-btn-wrapper">
        <button type="button" class="cancel-edit">Cancel</button>
        <button type="submit">Save</button>
      </div>
    </form>
  </div>
</article>
`;

// Review actions: reply to review
replyBtn.forEach((btn) => {
  btn.addEventListener("click", () => {
    const reviewCard = btn.closest(".review-card");
    // Don't allow replies if there's already a seller response
    if (reviewCard.querySelector(".reply-card")) {
      return;
    }

    const replyFormWrapper = reviewCard.querySelector(".reply-form-wrapper");
    replyFormWrapper?.classList.add("active");
  });
});

// Review actions: cancel reply
cancelReplyBtn.forEach((btn) => {
  btn.addEventListener("click", () => {
    const replyFormWrapper = btn.closest(".reply-form-wrapper");
    replyFormWrapper.classList.remove("active");
  });
});

// Review actions: submit reply
submitReplyBtn.forEach((btn) => {
  const replyFormWrapper = btn.closest(".reply-form-wrapper");
  const replyForm = replyFormWrapper?.querySelector(".reply-form");
  // Get either the parent review card or the parent reply card
  const reviewCard = btn.closest(".review-card");

  if (!replyForm) {
    console.error("No reply form found");
    return;
  }

  replyForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const textarea = replyForm.querySelector("textarea");
    const replyText = textarea.value.trim();

    if (!replyText) {
      const notification = new PaymentNotification();
      notification.error("Please enter a reply", "reply");
      return;
    }

    // Get current user
    const currentUser = {
      pfp: reviewCard.querySelector(".user-review-img").src,
      username: reviewCard.querySelector(".username-wrapper").textContent
    };

    // Get form Data
    const formData = {
      pfp: currentUser.pfp,
      username: currentUser.username,
      text: replyText,
      timestamp: new Date().toISOString()
    };

    // Check if there is already a replies container
    let repliesContainer = reviewCard.querySelector(".review-replies");
    if (!repliesContainer) {
      repliesContainer = document.createElement("div");
      repliesContainer.classList.add("review-replies");
      reviewCard.appendChild(repliesContainer);
    }

    // Create and append new reply
    const newReplyCard = REPLY_CARD_TEMPLATE(
      formData.pfp,
      formData.username,
      formData.text,
      formData.timestamp
    );

    // Append new reply card to replies container
    repliesContainer.insertAdjacentHTML("beforeend", newReplyCard);

    // Update reply count
    updatedReplyCount(reviewCard);

    const replyCard = repliesContainer.lastElementChild;
    const replyDropdownBtn = replyCard.querySelector(".reply-dropdown-btn");
    const replyDropdownContent = replyCard.querySelector(
      ".reply-dropdown-content"
    );
    const editReplyBtn = replyCard.querySelector(".edit-reply-btn");
    const deleteReplyBtn = replyCard.querySelector(".delete-reply-btn");
    const editFormWrapper = replyCard.querySelector(".edit-form-wrapper");
    const replyCancelEditBtn = replyCard.querySelector(".cancel-edit");
    const replySaveEditBtn = replyCard.querySelector(".save-edit");
    const editForm = replyCard.querySelector(".edit-form");
    const replyTxt = replyCard.querySelector(".review-details");

    replyDropdownBtn.addEventListener("click", () => {
      replyDropdownContent.classList.toggle("hidden");
    });

    editReplyBtn.addEventListener("click", () => {
      // Hide reply dropdown content
      replyDropdownContent.classList.add("hidden");
      // Show edit form
      editFormWrapper.classList.remove("hidden");
      replyTxt.classList.add("hidden");
    });

    deleteReplyBtn.addEventListener("click", () => {
      replyCard.remove();
      updatedReplyCount(reviewCard);
    });

    replyCancelEditBtn.addEventListener("click", () => {
      editFormWrapper.classList.add("hidden");
      replyTxt.classList.remove("hidden");
    });

    editForm.addEventListener("submit", (e) => {
      e.preventDefault();

      console.log("Edit form submitted");

      const editTextarea = editForm.querySelector("textarea");
      if (!editTextarea) {
        console.error("No edit textarea found");
        return;
      }
      console.log(editTextarea.value);

      replyTxt.textContent = editTextarea.value;

      editFormWrapper.classList.add("hidden");
      replyTxt.classList.remove("hidden");

      // Hide reply dropdown content
      replyDropdownContent.classList.add("hidden");
    });

    // Add click outside handler to close dropdown
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".reply-dropdown-btn")) {
        document
          .querySelectorAll(".reply-dropdown-content")
          .forEach((dropdown) => {
            dropdown.classList.add("hidden");
          });
      }
    });

    // Clear the textarea
    textarea.value = "";
    replyFormWrapper.classList.remove("active");

    // TODO: send reply to server

    // Show success notification
    const notification = new PaymentNotification();
    notification.success("Reply submitted", "reply");
  });
});

/* Background actions */
const uploadBackgroundBtn = document.getElementById("upload-background-btn");
const removeBackgroundBtn = document.getElementById("remove-background-btn");
const backgroundElement = document.querySelector(".profile-background");
const backgroundInput = document.getElementById("background-input");

uploadBackgroundBtn.addEventListener("click", () => {
  console.log("Upload background clicked");
  console.log(backgroundElement);
  backgroundInput.click();
});

removeBackgroundBtn.addEventListener("click", () => {
  handleBackgroundRemove();
});

backgroundInput.addEventListener("change", (e) => {
  console.log("Background input changed");
  const file = e.target.files[0];
  console.log(file);
  if (file) {
    handleBackgroundUpload(file);
  }
  // Reset the file input value so the same file can be selected again
  backgroundInput.value = "";
});

function handleBackgroundUpload(file) {
  // set maximum file size
  const maxFileSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    console.error("Invalid file type");
    return;
  }

  if (file.size > maxFileSize) {
    console.error("File too large");
    return;
  }

  // Create FileReader to read the file
  const reader = new FileReader();

  reader.onload = function (event) {
    // Ensure we're setting a new URL each time
    const imageUrl = `url("${event.target.result}")`;
    backgroundElement.style.backgroundImage = imageUrl;
  };

  reader.readAsDataURL(file);

  removeBackgroundBtn.style.display = "inline";
  uploadBackgroundBtn.style.display = "none";
}

function handleBackgroundRemove() {
  backgroundElement.style.backgroundImage = "none";
  // Reset the file input value
  backgroundInput.value = "";
  removeBackgroundBtn.style.display = "none";
  uploadBackgroundBtn.style.display = "inline";
}

/* UserCard actions */
uploadBtn.addEventListener("click", () => {
  if (fileInput) {
    fileInput.click();
  }
});

// UserCard action: upload img
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0]; // Grabs the first img from the list

  feedback.textContent = "";

  const reader = new FileReader(); // creates a new FileReader
  reader.onload = function (event) {
    profilePicture.src = event.target.result; // sets the profile picture
  };

  // TODO: create function to generate error

  if (file) {
    console.log(file.type);
    // Validate file type
    const validImageTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validImageTypes.includes(file.type)) {
      const err = new Error("File format error!");

      feedback.innerHTML = ""; // Clears out old content

      // append error icon
      const errIcon = document.createElement("i");
      errIcon.classList.add("fa-solid", "fa-circle-exclamation", "error");
      feedback.appendChild(errIcon);

      // add error message after the icon
      const errorMessage = document.createTextNode(`${err.message}`);
      feedback.appendChild(errorMessage);

      // add style to error msg
      feedback.classList.add("error");

      return;
    }

    if (file.size > maxFileSize) {
      const errIcon = document.createElement("i");
      errIcon.classList.add("fa-solid", "fa-circle-exclamation", "error");
      feedback.appendChild(errIcon);

      const err = new Error(`File too big ${maxFileSize.toFixed(2)} MB`);
      const errorMessage = document.createTextNode(`${err.message}`);
      feedback.appendChild(errorMessage);

      feedback.classList.add("error");
      return;
    }

    reader.readAsDataURL(file); // Read the files as a Data URL
  }

  fileInput.value = "";
});

// UserCard actions: edit
updateBioBtn.addEventListener("click", () => {
  bioTextarea.disabled = false;
  saveBioBtn.style.display = "inline"; // show the save button
  updateBioBtn.style.display = "none"; // removes edit button
  bioTextarea.style.display = "inline"; // shows the textarea
  pfpActions.style.display = "flex";
  websiteLinks.style.display = "inline";
  wordCountDisplay.style.display = "flex"; // show word counter

  // Set is EditMode to true to enable removing links
  isEditMode = true;

  // Show the close icon when in edit mode
  const closeIcons = document.querySelectorAll(".close-icon");
  closeIcons.forEach((icon) => {
    icon.style.display = "block";
  });
});

// UserProfile actions: remove img
removeBtn.addEventListener("click", () => {
  profilePicture.src = "/images/1.png";

  // Reset the file input to allow uploading the same image again
  fileInput.value = "";
});

// UserProfile actions: save
saveBioBtn.addEventListener("click", () => {
  wordCountDisplay.style.display = "none";

  // Disable the bioTextArea
  bioTextarea.disabled = true;

  // Hide save button, show edit button
  saveBioBtn.style.display = "none";
  updateBioBtn.style.display = "inline";

  // Hide profile actions
  isEditMode = false;

  // Hide profile actions
  pfpActions.style.display = "none";

  const closeIcons = document.querySelectorAll(".close-icon");
  closeIcons.forEach((icon) => {
    icon.style.display = "none";
  });

  // Get the trimmed values
  currentBio = bioTextarea.value.trim();
  currentUrl = url.value.trim();
  currentUrlTitle = title.value.trim();

  // Logic to hide or show elements based on content
  if (currentBio === "") {
    // Hide bio, and website element
    bioTextarea.style.display = "none";
  } else {
    // Show bio and website if they are filled
    bioTextarea.style.display = "block";
  }

  if (currentUrl === "" && currentUrlTitle == "") {
    // Hide bio, and website element
    websiteLinks.style.display = "none";
  } else if (currentUrl !== "" && currentUrlTitle === "") {
    // If URL is provided but title is missing, show an
    titleFeedback.innerHTML = "";

    const errorIcon = document.createElement("i");
    errorIcon.classList.add("fa-solid", "fa-circle-exclamation", "error-msg");
    const errorMessage = document.createTextNode("Please enter a title!");

    titleFeedback.appendChild(errorIcon);
    titleFeedback.appendChild(errorMessage);

    return; // Exit early since there's an error
  } else if ((currentUrl === "") & (currentUrlTitle !== "")) {
    websiteFeedback.innerHTML = "";

    const errorIcon = document.createElement("i");
    errorIcon.classList.add("fa-solid", "fa-circle-exclamation", "error-msg");
    const errorMessage = document.createTextNode("Please fill out this field!");

    websiteFeedback.appendChild(errorIcon);
    websiteFeedback.appendChild(errorMessage);

    return; // Exit early since there's an error
  } else {
    websiteFeedback.innerHTML = "";
    titleFeedback.innerHTML = "";
    // Show bio and website if they are filled
    websiteLinks.style.display = "block";

    const div = document.createElement("div");
    div.classList.add("website-link-div");

    const anchor = document.createElement("a");
    anchor.href = currentUrl;
    anchor.target = "_blank"; // create a new tab
    anchor.classList.add("website-link");
    anchor.type = "text";

    const linkIcon = document.createElement("i");
    const linkText = document.createElement("p");

    linkText.textContent = currentUrlTitle;

    const domain = new URL(currentUrl).hostname;

    // Checks if the url matches known e-commerce websites
    if (domain.includes("amazon")) {
      linkIcon.classList.add("fa-brands", "fa-amazon", "amazon"); // amazon icon
    } else if (domain.includes("shopify")) {
      linkIcon.classList.add("fa-brands", "fa-shopify", "shopify");
    } else if (domain.includes("ebay")) {
      linkIcon.classList.add("fa-brands", "fa-ebay", "ebay");
    } else if (domain.includes("facebook")) {
      linkIcon.classList.add("fa-brands", "fa-facebook", "facebook");
    } else if (domain.includes("instagram")) {
      linkIcon.classList.add("fa-brands", "fa-instagram", "instagram");
    } else if (domain.includes("etsy")) {
      linkIcon.classList.add("fa-brands", "fa-etsy");
    } else {
      linkIcon.classList.add("fa-solid", "fa-link");
    }

    anchor.appendChild(linkIcon);
    anchor.appendChild(linkText);
    div.appendChild(anchor);

    // Close Icon
    const closeIcon = document.createElement("i");
    closeIcon.classList.add("fa-solid", "fa-xmark", "close-icon");
    closeIcon.style.display = "none";

    // Event listener for removing the link
    closeIcon.addEventListener("click", (e) => {
      e.preventDefault();
      div.remove();
    });

    div.append(closeIcon);

    // Append to the website display container
    websiteUrlDisplay.appendChild(div);
    websiteUrlDisplay.style.display = "flex";
    websiteLinks.style.display = "none";
  }

  // Reset the url & title for next input
  url.value = "";
  title.value = "";

  /* TODO: Save user data to firebase  */
});

// Review actions : dropdown menu
seeAllReviewsBtn.addEventListener("click", () => {});
/* 
    Selects all elements with class .dropdown-section 
    Loops through each dropdown-section to apply logic 
*/

// Payment Information actions: dropdown menu
dropdownSection.forEach((section) => {
  const dropdownIcon = section.querySelector(".dropdown-icon i");
  const menu = section.querySelector(".dropdown-menu");
  const toggle = section.querySelector(".dropdown-header");

  toggle.addEventListener("click", () => {
    // Hide all other dropdown menus
    document.querySelectorAll(".dropdown-menu").forEach((otherMenu) => {
      if (otherMenu !== menu) {
        otherMenu.classList.remove("active");

        otherMenu.previousElementSibling.querySelector(
          ".dropdown-icon i"
        ).style.transform = "rotate(0deg)";
      }

      const otherIcon = otherMenu
        .closest("dropdown-section")
        ?.querySelector("dropdown-icon i");
      if (otherIcon) {
        otherIcon.style.transform = "rotate(0deg)";
      }
    });

    // Toggle the clicked dropdown menu
    menu.classList.toggle("active");

    // Toggle rotation
    if (menu.classList.contains("active")) {
      dropdownIcon.style.transform = "rotate(180deg)";
    } else {
      dropdownIcon.style.transform = "rotate(0deg)";
    }
  });
});

/* 
  TODO: Create a function that has the dropdown functionality
*/

// Payment Information actions: small dropdown menu
smallDropdownSection.forEach((smallMenu) => {
  const yearHeader = smallMenu.querySelector(".dropdown-header");
  const yearIcon = smallMenu.querySelector(".dropdown-icon i");
  const yearMenu = smallMenu.querySelector(".year-dropdown");
  const options = smallMenu.querySelectorAll("#list .options");
  const selectedYear = smallMenu.querySelector(".selected-year");

  options.forEach((opt) => {
    opt.addEventListener("click", () => {
      const selectValue = opt.textContent;
      selectedYear.textContent = selectValue;

      // function that filters by the selected year
    });
  });

  yearHeader.addEventListener("click", () => {
    // Toggle the click dropdown menu
    yearMenu.classList.toggle("open");

    // Toggle rotation
    if (yearMenu.classList.contains("open")) {
      yearIcon.style.transform = "rotate(180deg)";
    } else {
      yearIcon.style.transform = "rotate(0deg)";
    }
  });
});

// Profile actions: edit, save, cancel
profileSection.forEach((section) => {
  const edit = section.querySelectorAll(".edit-info-header");
  const allActionButtons = section.querySelectorAll(".action-buttons");
  const saveBtn = section.querySelectorAll(".save-btn");
  const cancelBtn = section.querySelectorAll(".cancel-btn");
  const inputs = section.querySelectorAll("input");
  const select = section.querySelectorAll("select");

  select.forEach((ele) => {
    ele.disabled = true;
  });

  // Handle save action for form
  saveBtn.forEach((btn) => {
    select.forEach((ele) => {
      ele.disabled = true;
    });

    btn.addEventListener("click", () => {
      console.log(btn.id);
      let currentForm = null;

      currentForm =
        btn.id === "save-personal-info"
          ? document.getElementById("personalInformation")
          : document.getElementById("shippingInformation");

      if (!currentForm) return; // exit early

      if (validateForm(currentForm) === true) {
        const inputs = currentForm.querySelectorAll("input");
        console.log(inputs);

        inputs.forEach((input) => {
          input.disabled = true;
          input.style.backgroundColor = "transparent";
          input.style.border = "none";
          input.style.boxShadow = "none";
          input.style.padding = "0px 0px";
        });
        allActionButtons.forEach((action) => {
          action.style.display = "none";
        });
      } else {
      }
    });
  });

  // Handle edit button click | Profile
  edit.forEach((btn) => {
    btn.addEventListener("click", () => {
      // console.log("edit button was clicked!");

      select.forEach((element) => {
        element.disabled = false;
      });

      inputs.forEach((input) => {
        input.disabled = false;

        // input disabled
        input.style.backgroundColor = "#e0e0e0";
        input.style.border = "#b0b0b0";
        input.style.padding = "12px 20px";
      });

      allActionButtons.forEach((action) => {
        action.style.display = "flex";
      });
    });
  });

  // Handle cancel button click | Profile
  cancelBtn.forEach((btn) => {
    btn.addEventListener("click", () => {
      console.log("The Id is:", btn.id);

      if (btn.id === "cancel-personal-info") {
        const personalFormIds = [
          "fname",
          "lname",
          "email",
          "phoneNumber",
          "profile-username"
        ];

        personalFormIds.forEach((id) => {
          const input = document.getElementById(id);
          if (input) {
            input.classList.remove("input-error");
          }
        });

        const personalErrorIds = [
          "fnameError",
          "lnameError",
          "emailError",
          "phoneError",
          "usernameError"
        ];

        personalErrorIds.forEach((id) => {
          const errorElem = document.getElementById(id);
          if (errorElem) {
            errorElem.textContent = "";
          }
        });
      } else if (btn.id === "cancel-shipping-info") {
        const shippingForm = document.getElementById("shippingInformation");

        const inputs = shippingForm.querySelectorAll("input");
        const spans = shippingForm.querySelectorAll("span");
        const selects = shippingForm.querySelectorAll("select");

        selects.forEach((select) => select.classList.remove("input-error"));
        inputs.forEach((input) => input.classList.remove("input-error"));
        spans.forEach((span) => {
          console.log(span.id);
          if (span.id === "fnameError") span.textContent = "";
          if (span.id === "lnameError") span.textContent = "";
          if (span.id === "addressError") span.textContent = "";
          if (span.id === "cityError") span.textContent = "";
          if (span.id === "postalError") span.textContent = "";
          if (span.id === "phoneError") span.textContent = "";
          if (span.id === "stateError") span.textContent = "";
        });

        const shippingErrorIds = [
          "fnameError",
          "lnameError",
          "countryError",
          "addressError"
        ];

        shippingErrorIds.forEach((id) => {
          const errorElem = document.getElementById(id);

          if (errorElem) {
            errorElem.innerText = "";
          } else {
            console.log("Could not find input with ID:", id);
          }
        });
      }

      // Disable select elements
      select.forEach((ele) => (ele.disabled = true));

      // Reset input fields (remove custom styles, etc.)
      inputs.forEach((input) => {
        input.disabled = true;
        input.style.backgroundColor = "transparent";
        input.style.border = "none";
        input.style.boxShadow = "none";
        input.style.padding = "0px 0px";
      });

      // Hide cta button
      allActionButtons.forEach((action) => {
        action.style.display = "none";
      });
    });
  });

  // Hides the cta buttons by default | Profile
  allActionButtons.forEach((action) => {
    action.style.display = "none";
  });
});

// Profile Page actions: navigate
allTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const tabId = tab.getAttribute("data-tab");

    // Remove active from all other tabs
    allTabs.forEach((btn) => {
      btn.classList.remove("active");
    });

    // Hide all tab content
    document.querySelectorAll(".tab").forEach((content) => {
      content.classList.remove("active");
    });

    tab.classList.add("active");
    document.getElementById(tabId).classList.add("active");

    // Storage active tab in localStorage
    localStorage.setItem("activeTab", tabId);
  });
});

// Add funds popup menu
const elements = {
  quickAmountsContainer: document.getElementById("quick-amounts-container"),
  fundsBalance: document.getElementById("funds-balance"),
  amountButtons: document.querySelectorAll(".withdraw-container .amount-btn"),
  withdrawAmount: document.querySelector(".amount-input"),
  closeWithdrawPopup: document.getElementById("popup-close-btn"),
  withdrawBtn: document.getElementById("widthdraw"),
  confirmWithdrawBtn: document.querySelector(".confirm-withdraw-btn"),
  addFundsBtn: document.getElementById("add-funds"),
  addFundsButton: document.getElementById("add-funds-btn"),
  addFundsCloseBtn: document.querySelector(".funds-container .close-button"),
  walletAmount: document.querySelector(".wallet-amount")
};

const AMOUNTS = [10, 25, 50, 75, 100, 150, 200, 300, 400, 500];
let selectAmount = 0;
let walletBalance = 0;

// Helper Functions
function formatCurrency(amount) {
  return `$${parseFloat(amount).toFixed(2)}`;
}

function updateFundsBalance(amount) {
  if (elements.fundsBalance) {
    elements.fundsBalance.value = amount.toFixed(2);
  }
}

function updateWalletDisplay() {
  const walletElement = document.getElementById("act-wallet-balance");
  if (walletElement) {
    walletElement.textContent = formatCurrency(walletBalance);
  }
  if (elements.walletAmount) {
    elements.walletAmount.textContent = `${formatCurrency(walletBalance)} USD`;
  }
}

function updateBalance(newAmount, action) {
  const amount = parseFloat(newAmount) || 0;
  if ((action === "withdraw") & (walletBalance >= amount)) {
    walletBalance -= amount;
  } else if (action === "add") {
    walletBalance += amount;
  }
  updateWalletDisplay();
}

// Dynamically  creates QABs (Quick Amount Buttons)
if (elements.quickAmountsContainer) {
  AMOUNTS.forEach((amount) => {
    const button = document.createElement("button");
    button.className = "amount-btn";
    button.value = amount;
    button.textContent = `$${amount}`;

    // Click event to update selected amount and highlight the button
    button.addEventListener("click", () => {
      // Updated selected amount
      selectAmount = amount;
      updateFundsBalance(selectAmount);
    });

    elements.quickAmountsContainer.appendChild(button);
  });
}

if (elements.fundsBalance) {
  elements.fundsBalance.addEventListener("blur", () => {
    const inputAmount = parseFloat(elements.fundsBalance.value);
    updateFundsBalance(isNaN(inputAmount) ? 0 : inputAmount);
  });

  elements.fundsBalance.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      elements.fundsBalance.blur(); // Trigger blur event
    }
  });
}

elements.amountButtons?.forEach((button) => {
  button.addEventListener("click", () => {
    const amount = button.textContent.replace("$", "");
    if (elements.withdrawAmount) {
      elements.withdrawAmount.value = parseFloat(amount).toFixed(2);
    }
  });
});

elements.closeWithdrawPopup?.addEventListener("click", () => {
  closePopupMenu(".popup-overlay");
});

elements.withdrawBtn.addEventListener("click", () => {
  openPopupMenu(".popup-overlay");
});

elements.addFundsBtn.addEventListener("click", () =>
  openPopupMenu(".add-funds-menu")
);

elements.addFundsCloseBtn.addEventListener("click", () =>
  closePopupMenu(".add-funds-menu")
);

class PaymentNotification {
  constructor() {
    this.notification = document.querySelector(".payment-nofication");
    this.timeout = null;
  }

  success(msg, type = "deposit") {
    this.notification.textContent = "";

    const container = document.createElement("div");
    container.classList.add("notification-container");

    // Add class based on type of notification
    switch (type) {
      case "withdraw":
        container.classList.add("withdraw");
        break;
      case "update":
        container.classList.add("update");
        break;
      default:
        container.classList.add("success");
    }

    // this.notification.appendChild(container);

    const icon = document.createElement("i");
    icon.classList.add("fa-solid", "fa-circle-check");
    icon.setAttribute("aria-hidden", "true");

    const p = document.createElement("p");
    p.classList.add("notification-text");
    p.classList.add("amount-text");

    // Set appropriate message based on transaction type
    if (type === "deposit" || type === "withdraw") {
      const amount = typeof msg === "string" ? parseFloat(msg) : msg;
      p.textContent =
        type === "deposit"
          ? `$${amount.toFixed(2)} has been added to your wallet`
          : `$${amount.toFixed(2)} has been withdrawn from your wallet`;
    } else if (type === "update") {
      p.textContent = msg;
    }

    container.appendChild(icon);
    container.appendChild(p);
    this.notification.appendChild(container);

    // Show notification
    this.show();
  }

  error(message) {
    this.notification.textContent = "";

    const container = document.createElement("div");
    container.classList.add("notification-container", "error");

    const icon = document.createElement("i");
    icon.classList.add("fa-solid", "fa-circle-xmark");
    icon.setAttribute("aria-hidden", "true");

    const p = document.createElement("p");
    p.classList.add("error-text");
    p.textContent = message;

    container.appendChild(icon);
    container.appendChild(p);
    this.notification.appendChild(container);

    this.show();
  }

  show(amount) {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.notification.classList.add("show");

    this.timeout = setTimeout(() => {
      this.hide();
    }, 3000);

    this.notification.onclick = () => this.hide();
  }

  hide() {
    this.notification.classList.remove("show");
  }
}

const notification = new PaymentNotification();

// Add Funds Button
elements.addFundsButton.addEventListener("click", () => {
  const amount = parseFloat(elements.fundsBalance?.value) || 0;
  notification.success(amount, "deposit");
  updateBalance(amount, "add");
  closePopupMenu(".add-funds-menu");
});

// Withdraw Funds
elements.confirmWithdrawBtn?.addEventListener("click", () => {
  const amount = parseFloat(elements.withdrawAmount?.value) || 0;
  console.log(amount);
  if (amount <= walletBalance) {
    notification.success(amount, "withdraw");
    updateBalance(amount, "withdraw");
    closePopupMenu(".popup-overlay");
  } else {
    notification.error("insufficient funds");
  }
});

// View All Activity
const viewAllActivityBtn = document.querySelector(".view-all-link");
const viewAllActivityOverlay = document.querySelector(
  ".view-all-activity-overlay"
);
const closeViewAllActivityBtn = document.querySelector(
  ".close-view-all-activity"
);

viewAllActivityBtn.addEventListener("click", () => {
  viewAllActivityOverlay.classList.add("active");
  document.body.style.overflow = "hidden";
});

closeViewAllActivityBtn.addEventListener("click", () => {
  viewAllActivityOverlay.classList.remove("active");
  document.body.style.overflow = "auto";
});
