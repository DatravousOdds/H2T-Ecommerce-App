"use strict";

import { db, doc, collection, getDocs } from "../../api/firebase-client.js";
import {
  notification,
  showError,
  clearFormErrors,
  formatFirebaseDate,
  getStatusClass,
  openPopupMenu,
  closePopupMenu
} from "./ui-helpers.js";

const CARD_LIST_SELECTOR = ".card-list";

const CARD_WRAPPER_TEMPLATE = (cardHolderName, lastFourDigits, expiry) => `
  <div class="card-wrapper">
    <div class="payment-card">
      <div class="card-icon">
        <i class="fa-brands fa-cc-discover"></i>
      </div>
      <div class="card-inner">
        <p class="card-name">${cardHolderName} ****${lastFourDigits}</p>
        <p class="card-expiry">Expires on ${expiry}</p>
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
        <p class="bank-name" >${nameOfBank}</p>
        <p class="account-type">${accountType} ****${lastFourDigits}</p>
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

// ---------------------------------------------------------------------------
// Database loads
// ---------------------------------------------------------------------------

// update payment information (not yet implemented)
export const updatePaymentInfo = async (email, data) => {};

export async function loadCreditCardTransactions(userData, cardId) {
  if (!userData || !cardId) return null;

  const userProfileRef = doc(db, "userProfiles", userData.email);
  const creditCards = doc(userProfileRef, "creditCards", cardId);
  const transactionsRef = collection(creditCards, "transactions");

  const transactionSnapShot = await getDocs(transactionsRef);

  const transactions = transactionSnapShot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));
  return transactions;
}

export async function loadBankTransactions(userData, bankId) {
  if (!userData || !bankId) return null;

  try {
    const userProfileRef = doc(db, "userProfiles", userData.email);
    const bankAccounts = doc(userProfileRef, "bankAccounts", bankId);
    const transactionsRef = collection(bankAccounts, "transactions");

    const transactionSnapShot = await getDocs(transactionsRef);

    const bankTransactions = transactionSnapShot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    return bankTransactions;
  } catch (error) {
    console.error("Error occurred when fetching bank account transactions");
  }
}

export async function loadPaymentMethods(userData) {
  if (!userData) return null;
  try {
    const userProfileRef = doc(db, "userProfiles", userData.email);

    const bankAccountsRef = collection(userProfileRef, "bankAccounts");
    const creditCardsRef = collection(userProfileRef, "creditCards");

    const [bankAccountSnapshot, creditCardsSnapshot] = await Promise.all([
      getDocs(bankAccountsRef),
      getDocs(creditCardsRef)
    ]);

    const bankAccounts = bankAccountSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    const creditCardAccounts = creditCardsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    // load credit card transactions
    const transactionPromises = creditCardAccounts.map(async (card) => {
      const cardId = card.id;
      const transactions = await loadCreditCardTransactions(userData, cardId);
      return { cardId, transactions };
    });

    // load bank transactions
    const bankTransactionsPromise = bankAccounts.map(async (acc) => {
      const bankId = acc.id;
      const transactions = await loadBankTransactions(userData, bankId);
      return { bankId, transactions };
    });

    const allBankActivity = await Promise.all(bankTransactionsPromise);
    const allTransactions = await Promise.all(transactionPromises);

    const activityElements = allBankActivity.flatMap((bankData) => {
      return bankData.transactions.map((act) => {
        const activityItem = document.createElement("div");
        activityItem.className = "activity-item";
        if (act.type === "Deposit") {
          activityItem.innerHTML = `
                   <div class="activity-item-wrapper">
                    <label class="details-label font-500">${act.type}</label>
                    <p class="detail-date">${formatFirebaseDate(act.date)}</p>
                    </div>
                    <div class="activity-item-wrapper">
                    <label class="detail-value font-500 deposit">
                       +$${act.amount} ${act.currency}
                      </label>
                      <p class="status-indicator ${getStatusClass(
                        act.status
                      )}" >${act.status}</p>
                    </div>`;
        } else {
          activityItem.className = "activity-item";
          activityItem.innerHTML = `
                  <div class="activity-item-wrapper">
                    <label class="details-label font-500">${act.type}</label>
                    <p class="detail-date">${formatFirebaseDate(act.date)}</p>
                  </div>
                  <div class="activity-item-wrapper">
                    <label class="detail-value font-500 withdraw">$${
                      act.amount
                    } ${act.currency}</label>
                    <p class="status-indicator ${getStatusClass(act.status)}">${
            act.status
          }</p>
                  </div>`;
        }
        return activityItem;
      });
    });
    const recentActivity = document.querySelector("#recent-activity");
    if (recentActivity) {
      recentActivity.innerHTML = "";
      activityElements.forEach((element) => {
        recentActivity.appendChild(element);
      });
    }

    // credit card transactions
    const transactionElements = allTransactions.flatMap((cardData) =>
      cardData.transactions.map((tran) => {
        const transDiv = document.createElement("div");
        transDiv.className = "trans";
        transDiv.innerHTML = `
            <p>${tran.itemName}</p>
            <p>$${tran.amount}</p>
            `;
        return transDiv;
      })
    );
    const recentTransactions = document.querySelector("#r-trans");
    if (recentTransactions) {
      recentTransactions.innerHTML = "";
      transactionElements.forEach((element) => {
        recentTransactions.appendChild(element);
      });
    }

    return { bankAccounts, creditCardAccounts };
  } catch (error) {
    console.error("Error happened when fetching payment information");
    throw error;
  }
}

// ---------------------------------------------------------------------------
// UI display
// ---------------------------------------------------------------------------

export async function displayPaymentMethods(userData) {
  if (!userData) return;

  const cardListContainer = document.querySelector(CARD_LIST_SELECTOR);
  if (!cardListContainer) return;

  try {
    cardListContainer.innerHTML = "";

    const paymentMethods = await loadPaymentMethods(userData);

    if (!paymentMethods) {
      showEmptyState(cardListContainer);
      return;
    }

    paymentMethods.creditCardAccounts.forEach((card) => {
      const cardElement = CARD_WRAPPER_TEMPLATE(
        card.brand,
        card.last4,
        `${card.expiryMonth}/${card.expiryYear}`
      );
      cardListContainer.insertAdjacentHTML("beforeend", cardElement);
    });

    paymentMethods.bankAccounts.forEach((bank) => {
      const bankElement = BANK_WRAPPER_TEMPLATE(
        bank.bankName,
        bank.accountType,
        bank.routingNumberLast4
      );
      cardListContainer.insertAdjacentHTML("beforeend", bankElement);
    });

    const addCardElement = `
      <div class="card-wrapper add-card">
        <div>
          <p class="margin-bottom-0">Add card or bank account</p>
        </div>
        <div class="card-options" id="add-new-card">
          <i class="fa-solid fa-plus"></i>
        </div>
      </div>
    `;
    cardListContainer.insertAdjacentHTML("beforeend", addCardElement);

    attachPaymentMethodsModalEventListener();
    displayCardDetails(paymentMethods);
    displayBankDetails(paymentMethods);
  } catch (error) {
    console.error("Error occured when fetching card information ", error);
    showEmptyState(cardListContainer);
  }
}

export async function displayCardDetails(object) {
  const cardEnding = document.querySelector("#card-ending");
  const cardHolder = document.querySelector("#card-holder");
  const expiry = document.querySelector("#expiry");
  const domesticFee = document.querySelector("#domestic-fee");
  const internationalFee = document.querySelector("#international-fee");
  const achFee = document.querySelector("#ach-fee");

  if (!object) return;

  try {
    object.creditCardAccounts.forEach((doc) => {
      if (cardEnding) cardEnding.textContent = `Card ending in ${doc.last4}`;
      if (cardHolder) cardHolder.textContent = doc.cardHolderName;
      if (expiry) expiry.textContent = `${doc.expiryMonth}/${doc.expiryYear}`;
      if (domesticFee)
        domesticFee.textContent = `${doc.processingFees.domestic}%`;
      if (internationalFee)
        internationalFee.textContent = `${doc.processingFees.international}%`;
      if (achFee) achFee.textContent = `${doc.processingFees.ach}%`;
    });
  } catch (error) {
    console.error("Error occur when retrieving:", error);
    throw error;
  }
}

export async function displayBankDetails(object) {
  const bankType = document.querySelector("#bank-type");
  const bankEnding = document.querySelector("#bank-ending");
  const accountHolder = document.querySelector("#account-holder");
  const routingNumber = document.querySelector("#routing-number");
  const accountNumber = document.querySelector("#account-number");
  const accountType = document.querySelector("#account-type");

  if (!object) return null;

  try {
    object.bankAccounts.forEach((doc) => {
      if (bankType) bankType.textContent = doc.bankName;
      if (bankEnding)
        bankEnding.textContent = `Bank ending in ${doc.accountNumberLast4}`;
      if (accountHolder) accountHolder.textContent = doc.accountHolderName;
      if (accountNumber)
        accountNumber.textContent = `****${doc.accountNumberLast4}`;
      if (accountType) accountType.textContent = doc.accountType;
      if (routingNumber)
        routingNumber.textContent = `****${doc.routingNumberLast4}`;
    });
  } catch (error) {
    console.error("Error occur when retrieving:", error);
    throw error;
  }
}

function showEmptyState(container) {
  container.innerHTML = `<!-- COF Container-->
              <div class="card-wrapper add-card">
                <div>
                  <p class="margin-bottom-0">Add card or bank account</p>
                </div>

                <div class="card-options" id="add-new-card">
                  <i class="fa-solid fa-plus"></i>
                </div>
              </div>`;

  attachPaymentMethodsModalEventListener();
}

function attachPaymentMethodsModalEventListener() {
  document.addEventListener("click", (e) => {
    if (e.target.closest(".add-card")) {
      openPopupMenu(".payment-method-popup");
    }
    if (e.target.closest("#closePopup")) {
      closePopupMenu(".payment-method-popup");
    }
  });
}


// ---------------------------------------------------------------------------
// Card / bank form validation
// ---------------------------------------------------------------------------

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

/**
 * @returns {boolean} true if there is an error, false otherwise
 */
function validateExpiry(element, errorMessage) {
  const value = element.value.trim();
  const expiryDate = new Date(value);
  const today = new Date();

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

// ---------------------------------------------------------------------------
// Add card / add bank handlers
// ---------------------------------------------------------------------------

function handleAddCard(event) {
  event.preventDefault();

  const newCard = {
    cardHolder: document.querySelector("#cardForm #nameOnCard")?.value,
    cvv: document.querySelector("#cardForm #cvv")?.value,
    cardNumber: document.querySelector("#cardForm #cardNumber")?.value,
    expirationDate: document.querySelector("#cardForm #expiry")?.value,
    billingAddress: document.querySelector("#cardForm #billingAddress")?.value,
    cardEnding: document.querySelector("#card-ending")
  };

  const lastFourDigits = newCard.cardNumber.slice(-4);

  const cardNumberEl = document.querySelector(
    "#securityVerification3 .card-number"
  );
  const cardNumberId = document.querySelector("#card-number");
  if (cardNumberEl) cardNumberEl.textContent = `ending in ${lastFourDigits}`;
  if (cardNumberId)
    cardNumberId.value = `**** **** **** ${lastFourDigits}`;

  const cardList = document.querySelector(CARD_LIST_SELECTOR);
  if (cardList) {
    const newCardHTML = CARD_WRAPPER_TEMPLATE(
      newCard.cardHolder,
      lastFourDigits,
      newCard.expirationDate
    );
    cardList.insertAdjacentHTML("afterbegin", newCardHTML);
    closePopupMenu(".add-card-menu");
  }

  const cardHolder = document.querySelector(".view-details-menu #card-holder");
  const expirationDate = document.querySelector(".view-details-menu #expiry");
  const billingAddress = document.querySelector(
    ".view-details-menu #billingAddress"
  );

  if (cardHolder) cardHolder.textContent = newCard.cardHolder;
  if (expirationDate) expirationDate.textContent = newCard.expirationDate;
  if (billingAddress) billingAddress.textContent = newCard.billingAddress;
  if (newCard.cardEnding)
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

  if (cardList) {
    cardList.insertAdjacentHTML("afterbegin", newBankHTML);
    closePopupMenu(".add-card-menu");
  }

  const bankEnding = document.querySelector("#bank-ending");
  const accountHolder = document.querySelector("#account-holder");
  const bankRoutingNumber = document.querySelector("#routing-number");
  const bankAccountNumber = document.querySelector("#account-number");
  const bankAccountType = document.querySelector("#account-type");

  if (bankEnding)
    bankEnding.textContent = `Bank Account ending in ${lastFourDigits}`;
  if (accountHolder) accountHolder.textContent = newBank.accountHolderName;
  if (bankRoutingNumber) bankRoutingNumber.textContent = newBank.routingNumber;
  if (bankAccountNumber) bankAccountNumber.textContent = newBank.accountNumber;
  if (bankAccountType) bankAccountType.textContent = newBank.accountType;
}

// ---------------------------------------------------------------------------
// Manager class: default card, edit/view-details toggling, popups
// ---------------------------------------------------------------------------

class PaymentCardManager {
  constructor() {
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
    this.isPopupOpen = false;

    if (!this.cardsContainer) {
      console.error("Cards container element not found");
      return;
    }

    if (!this.popup || !this.bankPopup) {
      console.error("Popup element not found");
      return;
    }

    this.bindEscapeHandler = this.handleEscape.bind(this);
    this.handleClosePopup = this.closePopup.bind(this);

    this.init();
  }

  init() {
    this.setupEventListeners();

    if (this.closeButton) {
      this.closeButton.addEventListener("click", this.handleClosePopup);
    }

    if (this.bankCloseBtn) {
      this.bankCloseBtn.addEventListener("click", this.handleClosePopup);
    }
  }

  setupEventListeners() {
    this.cardsContainer.addEventListener("click", (event) => {
      const target = event.target;

      if (target?.matches(".set-default-card")) {
        this.setDefaultCard(target);
      } else if (target?.matches(".edit-card")) {
        this.toggleEditCardMode(target);
      } else if (target?.matches(".view-card-details")) {
        this.openViewDetails(target);
      }
    });

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
    popup.style.display = "flex";

    resetVerificationState();

    this.removePrimaryTag(popup);

    if (cardWrapper.querySelector(".default-card")) {
      this.showPrimaryTag(popup);
    }

    requestAnimationFrame(() => {
      popup.classList.add("active");
      document.body.style.overflow = "hidden";
    });
  }

  closePopup() {
    if (!this.popup || !this.isPopupOpen) {
      return;
    }

    [this.popup, this.bankPopup].forEach((popup) => {
      if (popup) {
        document.removeEventListener("keydown", this.bindEscapeHandler);
        popup.classList.remove("active");
        this.removePrimaryTag(popup);
      }
    });
  }

  openViewDetails(button) {
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

// ---------------------------------------------------------------------------
// Security verification step state (shared by the view-details flow)
// ---------------------------------------------------------------------------

function resetVerificationState() {
  const securityVerification1 = document.getElementById(
    "securityVerification1"
  );
  const securityVerification2 = document.getElementById(
    "securityVerification2"
  );
  const securityVerification3 = document.getElementById(
    "securityVerification3"
  );

  const statusCircles = document.querySelectorAll(
    "#securityVerification1 .status-icon-circle"
  );
  const statusCircle1 = document.querySelectorAll(
    "#securityVerification2 .status-icon-circle"
  );
  const statusCircle3 = document.querySelectorAll(
    "#securityVerification3 .status-icon-circle"
  );

  securityVerification1?.classList.add("hidden");
  securityVerification2?.classList.add("hidden");
  securityVerification3?.classList.add("hidden");

  statusCircles.forEach((circle) => circle.classList.remove("active"));
  statusCircle1.forEach((circle) => circle.classList.remove("active"));
  statusCircle3.forEach((circle) => circle.classList.remove("active"));
}

// ---------------------------------------------------------------------------
// Main wiring entry point
// ---------------------------------------------------------------------------

export function initPaymentMethods(userData) {
  initCardsOnFileDefaultButtons();
  initAddCardBankForms();
  initViewDetailsAndVerification();
  initEditBankDetails();
  initDeleteCardListener();
  initRecentActivityOverlay();

  // Instantiate the manager that wires up default/edit/view-details on the
  // dynamically rendered card list.
  new PaymentCardManager();

  // Kick off the initial render + DB load.
  return displayPaymentMethods(userData);
}

function initCardsOnFileDefaultButtons() {
  const cardWrappers = document.querySelectorAll(".payment-card");
  cardWrappers.forEach((card) => {
    if (!card.querySelector(".set-default-card")) {
      const setDefaultBtn = document.createElement("button");
      setDefaultBtn.classList.add("set-default-card");
      card.appendChild(setDefaultBtn);
    }
  });
}

function initAddCardBankForms() {
  const methodSelection = document.querySelector(".select-method-card");
  const card_form = document.querySelector("#card-form");
  const cardForm = document.querySelector("#cardForm");
  const bankForm = document.querySelector("#bankForm");
  const successCard = document.querySelector("#successCard");

  if (!methodSelection || !card_form || !cardForm || !bankForm || !successCard)
    return;

  const cardNumber = document.querySelector("#cardForm #cardNumber");
  const expiry = document.querySelector("#cardForm #expiry");
  const cvv = document.querySelector("#cardForm #cvv");

  if (cardNumber) {
    cardNumber.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");
      value = value.replace(/(\d{4})(?=\d)/g, "$1 ");
      value = value.substring(0, 19);
      e.target.value = value;
    });
  }

  if (cvv) {
    cvv.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").substring(0, 4);
    });
  }

  if (expiry) {
    expiry.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");

      let month = value.substring(0, 2);
      let year = value.substring(2, 6);

      if (month.length === 1 && parseInt(month) > 1) {
        month = "0" + month;
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
    });
  }

  if (accountNumber) {
    accountNumber.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").substring(0, 12);
    });
  }

  cardForm.addEventListener("submit", (e) => {
    e.preventDefault();
    let hasError = false;

    const formElements = {
      nameOnCard: document.querySelector("#cardForm #nameOnCard"),
      cardNumber: document.querySelector("#cardForm #cardNumber"),
      cvv: document.querySelector("#cardForm #cvv"),
      expiry: document.querySelector("#cardForm #expiry"),
      billingAddress: document.querySelector("#cardForm #billingAddress")
    };

    const errorMessages = document.querySelectorAll(".error-message");
    errorMessages.forEach((msg) => msg.remove());

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
    hasError |= validateExpiry(formElements.expiry, "Please enter an expiry date");

    if (!hasError) {
      showSuccess();
      handleAddCard(e);
    }
  });

  bankForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const formElements = {
      accountHolderName: document.querySelector(
        "#bankForm #accountHolderName"
      ),
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
      showSuccess();
      handleAddBank(e);
    }
  });

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
  accountTypeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      button.classList.add("active");
    });
  });

  const cardOption = document.querySelector(".payment-option:nth-child(1)");
  const bankOption = document.querySelector(".payment-option:nth-child(2)");

  cardOption?.addEventListener("click", () => {
    clearFormErrors(bankForm);
    showCardForm();
  });
  bankOption?.addEventListener("click", () => {
    clearFormErrors(cardForm);
    showBankForm();
  });

  document.querySelectorAll(".back-button").forEach((btn) =>
    btn.addEventListener("click", () => {
      clearFormErrors(cardForm);
      clearFormErrors(bankForm);
      showMethodSelection();
    })
  );

  document
    .querySelector("#successCard .button")
    ?.addEventListener("click", resetFlow);
}

function initViewDetailsAndVerification() {
  const closeBtnForDetails = document.querySelector(
    ".view-details-menu .close-button"
  );
  const updateCardBtn = document.querySelector("#updateCard");
  const continueBtn = document.querySelector("#step-1-verify-continue");
  const backToViewDetailsBtn = document.querySelector("#step-1-verify-back");
  const verifyBtn = document.querySelector("#verifyBtn");
  const viewDetailsMenu = document.querySelector(".view-details-menu");
  const backToStepOneView = document.querySelector("#backBtn");
  const backToStepTwoView = document.querySelector("#backUpdateBtn");
  const securityVerification1 = document.querySelector(
    "#securityVerification1"
  );
  const securityVerification2 = document.querySelector(
    "#securityVerification2"
  );
  const securityVerification3 = document.querySelector(
    "#securityVerification3"
  );

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

  closeBtnForDetails?.addEventListener("click", () => {
    closePopupMenu(".view-details-menu");
  });

  updateCardBtn?.addEventListener("click", () => {
    hideViewDetailsMenu();
    resetVerificationState();
    securityVerification1?.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    statusCircles[0]?.classList.add("active");
  });

  continueBtn?.addEventListener("click", () => {
    securityVerification1?.classList.add("hidden");
    securityVerification2?.classList.remove("hidden");
    statusCircle1[0]?.classList.add("active");
    statusCircle1[1]?.classList.add("active");
    document.body.style.overflow = "hidden";
  });

  backToViewDetailsBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    securityVerification1?.classList.add("hidden");
    showViewDetailsMenu();
    statusCircles.forEach((circle) => circle.classList.remove("active"));
  });

  verifyBtn?.addEventListener("click", () => {
    securityVerification2?.classList.add("hidden");
    securityVerification3?.classList.remove("hidden");
    statusCircle3.forEach((circle) => circle.classList.add("active"));
    document.body.style.overflow = "hidden";
  });

  backToStepOneView?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    securityVerification2?.classList.add("hidden");
    securityVerification1?.classList.remove("hidden");
    statusCircles[1]?.classList.remove("active");
  });

  backToStepTwoView?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    securityVerification3?.classList.add("hidden");
    securityVerification2?.classList.remove("hidden");
    statusCircle3[2]?.classList.remove("active");
  });

  // Bank details view close
  const bankDetailsCloseBtn = document.querySelector(
    "#view-bank-details .close-button"
  );
  bankDetailsCloseBtn?.addEventListener("click", () => {
    closePopupMenu(".bank-modal-overlay");
  });
}

function initEditBankDetails() {
  const editBankDetailsBtn = document.querySelector(
    "#edit-bank-details-btn"
  );
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

  if (!editBankDetailsBtn || !editBankOverlay) return;

  editBankDetailsBtn.addEventListener("click", () => {
    closePopupMenu(".bank-modal-overlay");
    openPopupMenu(".edit-bank-overlay");
  });

  function validateEditBankAccountForm() {
    let isValid = true;

    clearFormErrors(editBankAccountForm);

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

  editBankAccountMenuCloseBtn?.addEventListener("click", () => {
    editBankOverlay.classList.remove("active");
    editBankOverlay.style.display = "none";
    document.body.style.overflow = "auto";
  });

  saveChangesBtn?.addEventListener("click", () => {
    validateEditBankAccountForm();
  });

  editBankAccountForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    if (validateEditBankAccountForm()) {
      notification.success(
        "Bank account information updated successfully",
        "update"
      );
      closePopupMenu(".edit-bank-overlay");
    }
  });

  editBankAccountCancelBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closePopupMenu(".edit-bank-overlay");
  });
}

function initDeleteCardListener() {
  document.addEventListener("click", (e) => {
    if (e.target.matches(".delete-card i")) {
      const cardWrapper = e.target.closest(".card-wrapper");
      if (cardWrapper) {
        cardWrapper.remove();
      }
    }
  });
}

function initRecentActivityOverlay() {
  const viewAllActivityBtn = document.querySelector(".view-all-link");
  const viewAllActivityOverlay = document.querySelector(
    ".view-all-activity-overlay"
  );
  const closeViewAllActivityBtn = document.querySelector(
    ".close-view-all-activity"
  );

  if (!viewAllActivityBtn || !viewAllActivityOverlay) return;

  viewAllActivityBtn.addEventListener("click", () => {
    viewAllActivityOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
  });

  closeViewAllActivityBtn?.addEventListener("click", () => {
    viewAllActivityOverlay.classList.remove("active");
    document.body.style.overflow = "auto";
  });
}
