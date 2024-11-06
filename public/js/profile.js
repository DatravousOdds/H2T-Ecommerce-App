import { generateCountries, validateForm } from "./global.js";
import { closeDropdown } from "./global.js";

// generate countries for select element
document.addEventListener("DOMContentLoaded", () => {
  const apiUrl = "https://restcountries.com/v3.1/all";
  generateCountries(apiUrl, "country");
  // generateCountries(apiUrl, "state-select");
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
personalInformationForm.addEventListener("submit", (e) => {
  e.preventDefault(); // prevents form submission for validation checks
  console.log(validateForm(personalInformationForm));
});

shippingInformationForm.addEventListener("submit", (e) => {
  e.preventDefault();
  console.log(validateForm(shippingInformationForm));
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

function showSuccess(message) {
  const successDiv = document.createElement("div");
  successDiv.className = "success-message";
  successDiv.textContent = message;

  const formElement = document.getElementById("add-card");
  formElement.insertBefore(successDiv, formElement.firstChild);

  setTimeout(() => {
    successDiv.remove();
  }, 3000);
}

/* Add card Popup Functionality */
// Form Validation and Formatting
const cardForm = document.getElementById("add-card");
const cardNumber = document.getElementById("cardNumber");
const cvv = document.getElementById("cvv");
const expiry = document.getElementById("expiry");

// Card Number Formatting
cardNumber.addEventListener("input", (e) => {
  let value = e.target.value.replace(/\D/g, "");
  value = value.replace(/(\d{4})(?=\d)/g, "$1 ");
  value = value.substring(0, 19);
  e.target.value = value;
  removeError(cardNumber);
});

// CVV Formatting
cvv.addEventListener("input", (e) => {
  let value = e.target.value.replace(/\D/g, "");
  value = value.substring(0, 4);
  e.target.value = value;
  removeError(cvv);
});

// Expiry Date Validation
expiry.addEventListener("input", (e) => {
  const currentDate = new Date();
  const selectedDate = new Date(e.target.value);
  removeError(expiry);

  if (selectedDate < currentDate) {
    showError(expiry, "Please select a future date");
  }
});

// Add card event Listener
cardForm.addEventListener("submit", (e) => {
  e.preventDefault();
  let hasError = false;

  // Get form elements
  const holderName = document.getElementById("nameOnCard");
  const cardNumber = document.getElementById("cardNumber");
  const cvv = document.getElementById("cvv");
  const expiry = document.getElementById("input-expiry");
  const billingAddress = document.getElementById("billing-address");

  // Validate Name
  if (!holderName.value.trim()) {
    showError(holderName, "Card holder name is required");
    hasError = true;
  }
  // Validate Card Number
  if (
    !cardNumber.value.trim() ||
    cardNumber.value.replace(/\s/g, "").length < 16
  ) {
    showError(cardNumber, "Valid card number is required (16 digits)");
    hasError = true;
  }

  // Validate CVV
  if (!cvv.value.trim() || cvv.value.length < 3) {
    showError(cvv, "Valid CVV is required (3-4 digits)");
    hasError = true;
  }
  // Validate Expiry
  if (!expiry.value.trim()) {
    showError(expiry, "Expiry date is required");
    hasError = true;
  }

  // Validate Billing Address
  if (!billingAddress.value.trim()) {
    showError(billingAddress, "Billing address is required");
    hasError = true;
  }

  // If there are any errors, don't submit
  if (hasError) {
    return;
  }

  // card header ui
  const cardEnding = document.getElementById("card-ending");
  // console.log(cardEnding);
  cardEnding.textContent = `Visa Debit ending in ${cardNumber.value.slice(-4)}`;

  // If validation passes, update the display
  document.getElementById("card-holder").textContent = holderName.value;
  document.getElementById("expiry").textContent = expiry.value;
  document.querySelector(".billingAddress").textContent = billingAddress.value;

  // add to db then add div container
  handleAddCard();

  // Close popup
  closePopupMenu(".add-card-menu");
});

const addNewCard = document.getElementById("add-new-card");
const closePopMenu = document.getElementById("closePopup");

addNewCard.addEventListener("click", () => {
  openPopupMenu(".add-card-menu");
});

closePopMenu.addEventListener("click", () => {
  // popupMenu.classList.remove("active");
  closePopupMenu(".add-card-menu");
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
// const ADD_CARD_BTN_SELECTOR = ".addCard-btn";
const CARD_LIST_SELECTOR = ".card-list";
const CARD_WRAPPER_TEMPLATE = (name, lastFourDigits) => `
  <div class="card-wrapper">
    <div class="payment-card">
      <p>${name} ending in ${lastFourDigits}</p>
      <i class="fa-brands fa-cc-discover"></i>
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

function handleAddCard() {
  // Get form values
  const newCard = {
    cardHolder: document.getElementById("nameOnCard").value,
    cvv: document.getElementById("cvv").value,
    cardNumber: document.getElementById("cardNumber").value,
    expirationDate: document.getElementById("expiry").value,
    billingAddress: document.getElementById("billingAddress").value,
  };

  // Get the last 4 digits of the card
  const lastFourDigits = newCard.cardNumber.slice(-4);

  // Update card list if CARD_LIST_SELECTOR and CARD_WRAPPER_TEMPLATE are defined
  const cardList = document.querySelector(CARD_LIST_SELECTOR);
  if (cardList && typeof CARD_WRAPPER_TEMPLATE === "function") {
    const newCardHTML = CARD_WRAPPER_TEMPLATE(
      newCard.cardHolder,
      lastFourDigits
    );
    cardList.insertAdjacentHTML("afterbegin", newCardHTML);
    closePopupMenu(".add-card-menu");
  }
}

class PaymentCardManager {
  constructor() {
    // Initialize class properties
    this.cardsContainer = document.querySelector("#cards-on-file");
    this.popup = document.querySelector(".view-details-menu");
    this.closeButton = document.querySelector(
      ".view-details-menu .close-button"
    ); // Update close button selector
    this.activeCard = null;
    this.isPopupOpen = false; // Add state tracking

    if (!this.cardsContainer) {
      console.error("Cards container element not found");
      return;
    }

    if (!this.popup) {
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
        !this.popup.contains(event.target) &&
        !event.target.matches(".view-card-details")
      ) {
        this.closePopup();
      }
    });
  }

  showPopup(button) {
    if (!this.popup || this.isPopupOpen) {
      return;
    }

    this.isPopupOpen = true;
    this.popup.style.display = "flex"; // Ensure popup is visible

    // Use requestAnimationFrame for smooth animation
    requestAnimationFrame(() => {
      this.popup.classList.add("active");
      document.body.style.overflow = "hidden";

      const cardWrapper = button.closest(".card-wrapper");
      const isDefault = this.isDefaultCard(cardWrapper);

      if (isDefault) {
        this.showPrimaryTag();
      }

      this.activeCard = cardWrapper;
      document.addEventListener("keydown", this.bindEscapeHandler);
    });
  }

  closePopup() {
    if (!this.popup || !this.isPopupOpen) {
      console.log("Popup already closed or not found");
      return;
    }

    console.log("Closing popup");
    document.removeEventListener("keydown", this.bindEscapeHandler);
    this.popup.classList.remove("active");

    // Wait for transition to complete before hiding
    this.popup.addEventListener(
      "transitionend",
      () => {
        this.popup.style.display = "none";
        document.body.style.overflow = "";
        this.activeCard = null;
        this.popup.querySelector(".primary-card")?.remove();
        this.isPopupOpen = false;
      },
      { once: true }
    ); // Use once: true to automatically remove the listener
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

  showPrimaryTag() {
    const container = this.popup.querySelector(".primary-card-container");
    if (!container || container.querySelector(".primary-card")) return;

    const primaryTag = document.createElement("div");
    primaryTag.className = "primary-card";
    primaryTag.textContent = "Primary Payment Method";
    primaryTag.setAttribute("aria-label", "Primary payment method indicator");
    container.appendChild(primaryTag);
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
const reviewModal = document.getElementById("reviews-modal");
// see all reviews
const seeAllReviewsBtn = document.getElementById("see-all-reviews");
const closeBtn = document.querySelector(".close");

// Review action: all reviews, close
seeAllReviewsBtn.addEventListener("click", () => {
  reviewModal.style.display = "flex";
  document.body.classList.add("no-scroll");
});

closeBtn.addEventListener("click", () => {
  reviewModal.style.display = "none";
  document.body.classList.remove("no-scroll");
});

// Add this to your profile.js file
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
  handleBackgroundUpload(file);
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

  // TODO: upload file to firebase

  // Create FileReader to read the file
  const reader = new FileReader();

  reader.onload = function (event) {
    backgroundElement.style.backgroundImage = `url(${event.target.result})`;
  };

  reader.readAsDataURL(file);
}

function handleBackgroundRemove() {
  backgroundElement.style.backgroundImage = "none";
}

// UserCard action: click
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

  // Logging for testing
  console.log("The url is:", currentUrl);
  console.log("The current bio is:", currentBio);
  console.log("The url title is:", currentUrlTitle);

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
    console.log("Dropdown clicked!");
    // Hide all other dropdown menus
    document.querySelectorAll(".dropdown-menu").forEach((otherMenu) => {
      console.log(otherMenu);
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

  console.log(yearHeader);

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
    // console.log(ele);
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
          "profile-username",
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
          "usernameError",
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
          "addressError",
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
  addFundsCloseBtn: document.querySelector(".close-button"),
  walletAmount: document.querySelector(".wallet-amount"),
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

  success(amount, type = "deposit") {
    this.notification.textContent = "";

    const container = document.createElement("div");
    if (type === "withdraw") {
      container.classList.add("notification-container", "withdraw");
    }
    container.classList.add("notification-container", "success");

    this.notification.appendChild(container);

    const icon = document.createElement("i");
    icon.classList.add("fa-solid", "fa-circle-check");
    icon.setAttribute("aria-hidden", "true");

    const p = document.createElement("p");
    p.classList.add("amount-text");

    // Set appropriate message based on transaction type
    if (type === "deposit") {
      p.textContent = `$${amount.toFixed(2)} has been added to your wallet`;
    } else if (type === "withdraw") {
      p.textContent = `$${amount.toFixed(
        2
      )} has been withdrawn from your wallet`;
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
