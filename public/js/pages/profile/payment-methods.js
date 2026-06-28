"use strict";

/**
 * Cards on File — rebuilt on Stripe Elements + Setup Intents.
 *
 * Card numbers, CVCs, and expiry never touch this code or your backend —
 * Stripe Elements mounts an iframe you don't control, and confirmCardSetup()
 * talks to Stripe directly from the browser. Your backend only ever sees a
 * PaymentMethod ID.
 *
 * Backend contract this expects (not yet written — see chat for the
 * Express routes when you're ready for those):
 *   POST   /api/payment-methods/setup-intent   -> { clientSecret }
 *   GET    /api/payment-methods                -> { paymentMethods: [{ id, brand, last4, expMonth, expYear }] }
 *   DELETE /api/payment-methods/:id             -> { success: true }
 *
 * Two assumptions flagged for you to verify:
 *   1. `auth` (the Firebase client Auth instance) needs to be exported from
 *      firebase-client.js the same way `db`/`doc` already are:
 *        import { getAuth } from "firebase/auth";
 *        export const auth = getAuth(app);
 *   2. <script src="https://js.stripe.com/v3/"></script> needs to be added
 *      directly in profile.html's <head> — Stripe recommends loading it as
 *      a static tag rather than injecting it dynamically, since their
 *      fraud-detection signals work best that way.
 *   3. STRIPE_PUBLISHABLE_KEY below needs your real publishable key
 *      (the pk_... one — never the secret sk_... key, which must only ever
 *      live on your Express server).
 */

import { auth } from "../../api/firebase-client.js";
import { notification, openPopupMenu, closePopupMenu } from "./ui-helpers.js";

const STRIPE_PUBLISHABLE_KEY = "pk_REPLACE_WITH_YOUR_PUBLISHABLE_KEY";
const API_BASE = "/api/payment-methods";
const CARD_LIST_SELECTOR = ".card-list";
const MODAL_ID = "add-card-modal";

let stripe = null;
let cardElement = null;

// Visa/Mastercard/etc. icon per brand instead of always showing Discover,
// which is what the old CARD_WRAPPER_TEMPLATE did regardless of actual brand.
const BRAND_ICONS = {
  visa: "fa-cc-visa",
  mastercard: "fa-cc-mastercard",
  amex: "fa-cc-amex",
  discover: "fa-cc-discover",
  diners: "fa-cc-diners-club",
  jcb: "fa-cc-jcb",
  unionpay: "fa-credit-card"
};

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function authHeader() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not signed in");
  }
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(await authHeader()),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Card list rendering
// ---------------------------------------------------------------------------

const CARD_WRAPPER_TEMPLATE = (paymentMethod) => {
  const iconClass = BRAND_ICONS[paymentMethod.brand] || "fa-credit-card";
  const brandLabel =
    paymentMethod.brand.charAt(0).toUpperCase() + paymentMethod.brand.slice(1);

  return `
  <div class="card-wrapper" data-payment-method-id="${paymentMethod.id}">
    <div class="payment-card">
      <div class="card-icon">
        <i class="fa-brands ${iconClass}"></i>
      </div>
      <div class="card-inner">
        <p class="card-name">${brandLabel} ****${paymentMethod.last4}</p>
        <p class="card-expiry">Expires ${String(paymentMethod.expMonth).padStart(
          2,
          "0"
        )}/${paymentMethod.expYear}</p>
      </div>
    </div>
    <div class="card-options">
      <button type="button" class="remove-card-btn" aria-label="Remove card">
        <i class="fa-regular fa-trash-can"></i>
      </button>
    </div>
  </div>
  `;
};

const ADD_CARD_TILE = `
  <div class="card-wrapper add-card" id="add-card-tile">
    <div>
      <p class="margin-bottom-0">Add new card</p>
    </div>
    <div class="card-options">
      <i class="fa-solid fa-plus"></i>
    </div>
  </div>
`;

async function loadAndRenderCards() {
  const cardList = document.querySelector(CARD_LIST_SELECTOR);
  if (!cardList) return;

  cardList.innerHTML = `<p class="default-paragraph">Loading...</p>`;

  try {
    const { paymentMethods } = await apiFetch("", { method: "GET" });

    cardList.innerHTML = "";

    if (paymentMethods.length === 0) {
      cardList.insertAdjacentHTML("beforeend", ADD_CARD_TILE);
    } else {
      paymentMethods.forEach((pm) => {
        cardList.insertAdjacentHTML("beforeend", CARD_WRAPPER_TEMPLATE(pm));
      });
      cardList.insertAdjacentHTML("beforeend", ADD_CARD_TILE);
    }

    attachCardListListeners(cardList);
  } catch (error) {
    console.error("Error loading payment methods:", error);
    cardList.innerHTML = `<p class="default-paragraph">Couldn't load your cards. Please refresh and try again.</p>`;
  }
}

function attachCardListListeners(cardList) {
  cardList.addEventListener("click", async (e) => {
    if (e.target.closest("#add-card-tile")) {
      openAddCardModal();
      return;
    }

    const removeBtn = e.target.closest(".remove-card-btn");
    if (removeBtn) {
      const wrapper = removeBtn.closest(".card-wrapper");
      const paymentMethodId = wrapper?.dataset.paymentMethodId;
      if (paymentMethodId) {
        await handleRemoveCard(paymentMethodId, wrapper);
      }
    }
  });
}

async function handleRemoveCard(paymentMethodId, cardElementNode) {
  const confirmed = window.confirm("Remove this card from your account?");
  if (!confirmed) return;

  try {
    await apiFetch(`/${paymentMethodId}`, { method: "DELETE" });
    cardElementNode.remove();
    notification.success("Card removed", "update");
  } catch (error) {
    console.error("Error removing card:", error);
    notification.error("Couldn't remove that card, please try again");
  }
}

// ---------------------------------------------------------------------------
// Add card modal (built dynamically — no static HTML needed for this)
// ---------------------------------------------------------------------------

function buildModalMarkup() {
  const overlay = document.createElement("div");
  overlay.id = MODAL_ID;
  overlay.className = "payment-method-popup";
  overlay.innerHTML = `
    <div class="form-card active" style="display:block;">
      <div class="mb-24 space-between">
        <div>
          <h1 class="card-title">Add a card</h1>
          <p class="card-subtitle">Enter your card information</p>
        </div>
        <button type="button" class="close" id="closeAddCardModal" aria-label="Close popup">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>

      <div class="secure-badge">
        <i class="fa-solid fa-lock" aria-hidden="true"></i>
        <span class="secure-text">Secured by Stripe, your card details never touch our servers</span>
      </div>

      <div class="form-group">
        <label class="form-label" for="stripe-card-element">Card information</label>
        <div id="stripe-card-element" class="form-input"></div>
        <div id="card-element-errors" class="error-message" role="alert"></div>
      </div>

      <button type="button" id="saveCardBtn" class="button button-primary" style="width:100%;">
        Save card
      </button>
    </div>
  `;
  return overlay;
}

async function openAddCardModal() {
  let overlay = document.getElementById(MODAL_ID);
  if (!overlay) {
    overlay = buildModalMarkup();
    document.body.appendChild(overlay);
  }

  openPopupMenu(`#${MODAL_ID}`);

  const errorBox = overlay.querySelector("#card-element-errors");
  errorBox.textContent = "";

  const saveBtn = overlay.querySelector("#saveCardBtn");
  saveBtn.disabled = false;
  saveBtn.textContent = "Save card";

  overlay
    .querySelector("#closeAddCardModal")
    .addEventListener("click", () => closePopupMenu(`#${MODAL_ID}`), {
      once: true
    });

  try {
    if (!stripe) {
      if (!window.Stripe) {
        throw new Error(
          "Stripe.js hasn't loaded — add <script src='https://js.stripe.com/v3/'></script> to profile.html"
        );
      }
      stripe = window.Stripe(STRIPE_PUBLISHABLE_KEY);
    }

    const { clientSecret } = await apiFetch("/setup-intent", {
      method: "POST"
    });

    const elements = stripe.elements();
    cardElement = elements.create("card");
    cardElement.mount("#stripe-card-element");

    cardElement.on("change", (event) => {
      errorBox.textContent = event.error ? event.error.message : "";
    });

    saveBtn.onclick = () => handleSaveCard(clientSecret, saveBtn, errorBox);
  } catch (error) {
    console.error("Error opening add card modal:", error);
    errorBox.textContent = error.message || "Something went wrong, please try again";
  }
}

async function handleSaveCard(clientSecret, saveBtn, errorBox) {
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";
  errorBox.textContent = "";

  const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
    payment_method: { card: cardElement }
  });

  if (error) {
    errorBox.textContent = error.message;
    saveBtn.disabled = false;
    saveBtn.textContent = "Save card";
    return;
  }

  // Stripe automatically attaches the resulting PaymentMethod to the
  // customer the SetupIntent was created for — no extra "attach" call
  // needed here.
  void setupIntent;

  closePopupMenu(`#${MODAL_ID}`);
  cardElement.unmount();
  cardElement = null;

  notification.success("Card added", "update");
  await loadAndRenderCards();
}

// ---------------------------------------------------------------------------
// Entry point — keeps the same export name profile.js already imports
// ---------------------------------------------------------------------------

export async function initPaymentMethods() {
  await loadAndRenderCards();
}