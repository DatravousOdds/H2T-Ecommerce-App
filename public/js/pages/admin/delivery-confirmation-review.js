"use strict";

import { checkUserStatus } from "../../auth/auth.js";
import { auth } from "../../api/firebase-client.js";

const listEl = document.getElementById("review-list");
const disputesListEl = document.getElementById("disputes-list");
const failedPayoutsListEl = document.getElementById("failed-payouts-list");
const guardEl = document.getElementById("not-authorized");

// orderId -> that order's photoUrls, wrapped as { url } to reuse the
// authentication-review carousel code unchanged (it reads images[index].url).
let confirmationPhotosById = new Map();
const carouselState = { images: [], index: 0 };
let carouselModal;
let carouselImageEl;

function formatSubmittedDate(item) {
  if (!item.submittedAt) return "--";
  return new Date(item.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ratingStars(rating) {
  return [1, 2, 3, 4, 5]
    .map((n) => `<i class="fa-${n <= rating ? "solid" : "regular"} fa-star"></i>`)
    .join("");
}

// No automated "delivered" webhook exists for ShipStation on our plan (V1 has
// no such event, V2's tracking endpoint needs the Advanced plan) -- this link
// lets admin manually check the carrier's own tracking page before approving
// a payout or resolving a dispute, standing in for that missing ground truth.
const CARRIER_TRACKING_URL_BUILDERS = {
  stamps_com: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
  usps: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
  ups: (n) => `https://www.ups.com/track?tracknum=${n}`,
  ups_walleted: (n) => `https://www.ups.com/track?tracknum=${n}`,
  fedex: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}`,
  fedex_walleted: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}`,
};

function trackingInfoHTML(item) {
  if (!item.trackingNumber) return "";

  const buildUrl = CARRIER_TRACKING_URL_BUILDERS[item.shippingCarrier];
  const trackingDisplay = buildUrl
    ? `<a href="${buildUrl(encodeURIComponent(item.trackingNumber))}" target="_blank" rel="noopener noreferrer">${item.trackingNumber}</a>`
    : item.trackingNumber;

  return `<p class="default-paragraph review-tracking">Tracking: ${trackingDisplay}</p>`;
}

function reviewCard(item) {
  const images = item.photoUrls
    .map((url, index) => `<img src="${url}" alt="Delivery confirmation photo" data-image-index="${index}" />`)
    .join("");

  return `
    <article class="review-card" data-order-id="${item.orderId}">
      <div class="review-card-header">
        <div class="review-card-heading">
          <h3>#${item.orderId.slice(-8)}</h3>
          <span class="review-submitted-date">Submitted ${formatSubmittedDate(item)}</span>
        </div>
        <span class="status-badge status-submitted">submitted</span>
      </div>
      <p class="default-paragraph"><strong>${item.itemName}</strong> &mdash; Buyer: ${item.buyerEmail || item.buyerId}</p>
      ${trackingInfoHTML(item)}
      <div class="delivery-confirmation-rating">${ratingStars(item.rating)}</div>
      ${item.comment ? `<p class="default-paragraph">"${item.comment}"</p>` : ""}
      <div class="review-images">${images}</div>
      <div class="review-actions">
        <button type="button" class="approve-btn" data-action="approve">Approve</button>
      </div>
    </article>
  `;
}

async function fetchReviewableConfirmations() {
  const response = await authorizedFetch("/api/admin/delivery-confirmations");
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Failed to load confirmations");
  return result.items;
}

function renderConfirmations(items) {
  if (items.length === 0) {
    listEl.innerHTML = `<p class="default-paragraph">Nothing waiting on review.</p>`;
    return;
  }

  // .set() per item, not a fresh Map -- the disputes section below shares
  // this same lookup (order ids are unique across both, confirmations and
  // disputes are mutually exclusive statuses), and reassigning the whole
  // Map here would wipe out whichever section rendered first.
  items.forEach((item) => confirmationPhotosById.set(item.orderId, item.photoUrls.map((url) => ({ url }))));

  listEl.innerHTML = items.map(reviewCard).join("");
}

function disputeCard(item) {
  const images = item.photoUrls
    .map((url, index) => `<img src="${url}" alt="Dispute photo" data-image-index="${index}" />`)
    .join("");

  return `
    <article class="review-card" data-order-id="${item.orderId}" data-amount="${item.saleAmount}">
      <div class="review-card-header">
        <div class="review-card-heading">
          <h3>#${item.orderId.slice(-8)}</h3>
          <span class="review-submitted-date">Submitted ${formatSubmittedDate(item)}</span>
        </div>
        <span class="status-badge status-disputed">disputed</span>
      </div>
      <p class="default-paragraph"><strong>${item.itemName}</strong> &mdash; Buyer: ${item.buyerEmail || item.buyerId} &mdash; $${item.saleAmount}</p>
      ${trackingInfoHTML(item)}
      <p class="default-paragraph">"${item.comment}"</p>
      <div class="review-images">${images}</div>
      <div class="dispute-return-shipping-field">
        <label for="return-shipping-cost-${item.orderId}">Return shipping cost (only used if upheld)</label>
        <input type="number" id="return-shipping-cost-${item.orderId}" class="return-shipping-cost-input" min="0" step="0.01" placeholder="0.00" />
      </div>
      <div class="review-actions">
        <button type="button" class="reject-btn" data-action="uphold">Uphold (Refund Buyer)</button>
        <button type="button" class="approve-btn" data-action="reject">Reject (Release Payout)</button>
      </div>
    </article>
  `;
}

async function fetchDisputes() {
  const response = await authorizedFetch("/api/admin/disputes");
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Failed to load disputes");
  return result.items;
}

function renderDisputes(items) {
  if (items.length === 0) {
    disputesListEl.innerHTML = `<p class="default-paragraph">No disputes waiting on review.</p>`;
    return;
  }

  items.forEach((item) => confirmationPhotosById.set(item.orderId, item.photoUrls.map((url) => ({ url }))));

  disputesListEl.innerHTML = items.map(disputeCard).join("");
}

async function handleDisputeAction(card, action) {
  const orderId = card.dataset.orderId;
  let body;

  if (action === "uphold") {
    const costInput = card.querySelector(".return-shipping-cost-input");
    const returnShippingCost = parseFloat(costInput?.value || "0") || 0;

    if (!window.confirm(`Refund the buyer $${card.dataset.amount} for this order${returnShippingCost > 0 ? `, and charge the seller $${returnShippingCost.toFixed(2)} return shipping` : ""}? This cannot be undone.`)) {
      return;
    }

    body = JSON.stringify({ returnShippingCost });
  }

  const response = await authorizedFetch(`/api/orders/${orderId}/dispute/${action}`, { method: "POST", body });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Action failed");

  const payoutSucceeded = result.payout?.status === "transferred" || result.payout?.status === "absorbed_by_debt";
  if (action === "reject" && !payoutSucceeded) {
    alert(`Dispute rejected, but the payout could not be released: ${result.payout?.payoutHoldReason || "unknown reason"}. It's been recorded as failed and can be retried from the Failed Payouts section.`);
  }

  await loadDisputesScreen();
}

function wireDisputeActions() {
  disputesListEl.addEventListener("click", (event) => {
    const image = event.target.closest(".review-images img");
    if (image) {
      openCarousel(image);
      return;
    }

    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const card = button.closest(".review-card");
    handleDisputeAction(card, button.dataset.action).catch((error) => {
      console.error("Dispute action failed:", error);
      alert("Action failed: " + error.message);
    });
  });
}

async function loadDisputesScreen() {
  const items = await fetchDisputes();
  renderDisputes(items);
}

function failedPayoutCard(item) {
  const attemptedDate = item.attemptedAt
    ? new Date(item.attemptedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "--";

  return `
    <article class="review-card" data-order-id="${item.orderId}">
      <div class="review-card-header">
        <div class="review-card-heading">
          <h3>#${item.orderId.slice(-8)}</h3>
          <span class="review-submitted-date">Attempted ${attemptedDate}</span>
        </div>
        <span class="status-badge status-failed">failed</span>
      </div>
      <p class="default-paragraph"><strong>${item.itemName}</strong> &mdash; $${item.amount}</p>
      <p class="default-paragraph">Reason: ${item.payoutHoldReason}${item.lastError ? ` (${item.lastError})` : ""}</p>
      <div class="review-actions">
        <button type="button" class="approve-btn" data-action="retry">Retry Payout</button>
      </div>
    </article>
  `;
}

async function fetchFailedPayouts() {
  const response = await authorizedFetch("/api/admin/failed-payouts");
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Failed to load failed payouts");
  return result.items;
}

function renderFailedPayouts(items) {
  if (items.length === 0) {
    failedPayoutsListEl.innerHTML = `<p class="default-paragraph">No failed payouts right now.</p>`;
    return;
  }

  failedPayoutsListEl.innerHTML = items.map(failedPayoutCard).join("");
}

async function handleRetryAction(card) {
  const orderId = card.dataset.orderId;

  const response = await authorizedFetch(`/api/orders/${orderId}/payout/retry`, { method: "POST" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Retry failed");

  if (result.payout?.status !== "transferred") {
    alert(`Payout still couldn't be released: ${result.payout?.payoutHoldReason || "unknown reason"}${result.payout?.lastError ? ` (${result.payout.lastError})` : ""}.`);
  }

  await loadFailedPayoutsScreen();
}

function wireFailedPayoutActions() {
  failedPayoutsListEl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='retry']");
    if (!button) return;

    const card = button.closest(".review-card");
    handleRetryAction(card).catch((error) => {
      console.error("Payout retry failed:", error);
      alert("Retry failed: " + error.message);
    });
  });
}

async function loadFailedPayoutsScreen() {
  const items = await fetchFailedPayouts();
  renderFailedPayouts(items);
}

async function authorizedFetch(url, options = {}) {
  // Force refresh -- same reasoning as authentication-review.js: a cached
  // token issued before the admin claim was granted won't carry it.
  const idToken = await auth.currentUser.getIdToken(true);

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
      ...options.headers,
    },
  });
}

async function handleAction(card, action) {
  const orderId = card.dataset.orderId;

  if (action === "approve") {
    const response = await authorizedFetch(`/api/orders/${orderId}/delivery-confirmation/approve`, { method: "POST" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Approval failed");

    if (result.payout?.status !== "transferred") {
      alert(`Confirmation approved, but the payout could not be released: ${result.payout?.payoutHoldReason || "unknown reason"}. It's been recorded as failed and can be retried once resolved.`);
    }
  }

  await loadReviewScreen();
}

function renderCarouselImage() {
  const { images, index } = carouselState;
  carouselImageEl.src = images[index]?.url || "";
}

function showNextImage() {
  const { images } = carouselState;
  if (images.length === 0) return;
  carouselState.index = (carouselState.index + 1) % images.length;
  renderCarouselImage();
}

function showPrevImage() {
  const { images } = carouselState;
  if (images.length === 0) return;
  carouselState.index = (carouselState.index - 1 + images.length) % images.length;
  renderCarouselImage();
}

function closeCarousel() {
  carouselModal.hidden = true;
}

function openCarousel(imageEl) {
  const card = imageEl.closest(".review-card");
  carouselState.images = confirmationPhotosById.get(card.dataset.orderId) || [];
  carouselState.index = Number(imageEl.dataset.imageIndex) || 0;
  renderCarouselImage();
  carouselModal.hidden = false;
}

// Built once and reused for every card, rather than one modal per order.
function initImageCarousel() {
  carouselModal = document.createElement("div");
  carouselModal.className = "carousel-modal";
  carouselModal.hidden = true;
  carouselModal.innerHTML = `
    <button type="button" class="carousel-close" aria-label="Close">&times;</button>
    <button type="button" class="carousel-prev" aria-label="Previous image">&#8249;</button>
    <img class="carousel-image" alt="Delivery confirmation photo" />
    <button type="button" class="carousel-next" aria-label="Next image">&#8250;</button>
  `;
  document.body.appendChild(carouselModal);

  carouselImageEl = carouselModal.querySelector(".carousel-image");
  carouselModal.querySelector(".carousel-close").addEventListener("click", closeCarousel);
  carouselModal.querySelector(".carousel-prev").addEventListener("click", showPrevImage);
  carouselModal.querySelector(".carousel-next").addEventListener("click", showNextImage);

  carouselModal.addEventListener("click", (event) => {
    if (event.target === carouselModal) closeCarousel();
  });

  document.addEventListener("keydown", (event) => {
    if (carouselModal.hidden) return;
    if (event.key === "Escape") closeCarousel();
    if (event.key === "ArrowRight") showNextImage();
    if (event.key === "ArrowLeft") showPrevImage();
  });
}

function wireActions() {
  listEl.addEventListener("click", (event) => {
    const image = event.target.closest(".review-images img");
    if (image) {
      openCarousel(image);
      return;
    }

    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const card = button.closest(".review-card");
    handleAction(card, button.dataset.action).catch((error) => {
      console.error("Reviewer action failed:", error);
      alert("Action failed: " + error.message);
    });
  });
}

async function loadReviewScreen() {
  const items = await fetchReviewableConfirmations();
  renderConfirmations(items);
}

async function init() {
  const currentUser = await checkUserStatus();

  if (!currentUser) {
    window.location.href = "/login";
    return;
  }

  // UX-only gate -- real enforcement is GET /api/admin/delivery-confirmations
  // and the approve endpoint's server-side isAdmin checks.
  const tokenResult = await auth.currentUser.getIdTokenResult(true);

  if (tokenResult.claims.admin !== true) {
    guardEl.style.display = "block";
    listEl.style.display = "none";
    disputesListEl.style.display = "none";
    failedPayoutsListEl.style.display = "none";
    return;
  }

  initImageCarousel();
  wireActions();
  wireDisputeActions();
  wireFailedPayoutActions();
  await loadReviewScreen();
  await loadDisputesScreen();
  await loadFailedPayoutsScreen();
}

init();
