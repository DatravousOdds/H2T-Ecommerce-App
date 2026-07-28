"use strict";

import { checkUserStatus } from "../../auth/auth.js";
import { auth } from "../../api/firebase-client.js";

const listEl = document.getElementById("review-list");
const guardEl = document.getElementById("not-authorized");

// orderId -> that order's photoUrls, wrapped as { url } to reuse the
// authentication-review carousel code unchanged (it reads images[index].url).
let photosById = new Map();
const carouselState = { images: [], index: 0 };
let carouselModal;
let carouselImageEl;

function formatSubmittedDate(item) {
  if (!item.submittedAt) return "--";
  return new Date(item.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function reviewCard(item) {
  const images = item.photoUrls
    .map((url, index) => `<img src="${url}" alt="Authentication photo" data-image-index="${index}" />`)
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
      <p class="default-paragraph"><strong>${item.itemName}</strong>${item.itemBrand ? ` (${item.itemBrand})` : ""} &mdash; $${item.subtotal}</p>
      <div class="review-images">${images}</div>
      <textarea class="review-notes" placeholder="Notes (required if failing)"></textarea>
      <div class="review-actions">
        <button type="button" class="approve-btn" data-action="passed">Pass</button>
        <button type="button" class="reject-btn" data-action="failed">Fail</button>
      </div>
    </article>
  `;
}

async function fetchReviewableOrders() {
  const response = await authorizedFetch("/api/admin/order-authentications");
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Failed to load authentication requests");
  return result.items;
}

function renderOrders(items) {
  if (items.length === 0) {
    listEl.innerHTML = `<p class="default-paragraph">Nothing waiting on review.</p>`;
    return;
  }

  photosById = new Map(items.map((item) => [item.orderId, item.photoUrls.map((url) => ({ url }))]));

  listEl.innerHTML = items.map(reviewCard).join("");
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
  const notes = card.querySelector(".review-notes").value.trim();

  if (action === "failed" && !notes) {
    alert("Please submit a reason for failing this item!");
    return;
  }

  if (action === "failed" && !window.confirm("Fail this item? The order will be cancelled immediately and the buyer's card authorization released -- this cannot be undone.")) {
    return;
  }

  const response = await authorizedFetch(`/api/admin/order-authentications/${orderId}/decision`, {
    method: "POST",
    body: JSON.stringify({ decision: action, reviewerNotes: notes || null }),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Action failed");

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
  carouselState.images = photosById.get(card.dataset.orderId) || [];
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
    <img class="carousel-image" alt="Authentication photo" />
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
  const items = await fetchReviewableOrders();
  renderOrders(items);
}

async function init() {
  const currentUser = await checkUserStatus();

  if (!currentUser) {
    window.location.href = "/login";
    return;
  }

  // UX-only gate -- real enforcement is GET /api/admin/order-authentications
  // and the decision endpoint's server-side isAdmin checks.
  const tokenResult = await auth.currentUser.getIdTokenResult(true);

  if (tokenResult.claims.admin !== true) {
    guardEl.style.display = "block";
    listEl.style.display = "none";
    return;
  }

  initImageCarousel();
  wireActions();
  await loadReviewScreen();
}

init();
