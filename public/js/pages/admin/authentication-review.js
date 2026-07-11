"use strict";

import { checkUserStatus } from "../../auth/auth.js";
import {
  auth,
  collection,
  db,
  getDocs,
  query,
  where,
} from "../../api/firebase-client.js";
import { getUserProfile } from "../../core/global.js";

const REVIEWABLE_STATUSES = ["submitted", "pending_review", "needs_manual_review"];

const listEl = document.getElementById("review-list");
const guardEl = document.getElementById("not-authorized");

// requestId -> that request's images array, so the carousel can page through
// all of them without re-embedding the array into every <img> tag.
let requestImagesById = new Map();
const carouselState = { images: [], index: 0 };
let carouselModal;
let carouselImageEl;

function primaryImage(images) {
  return images?.find((img) => img.isPrimary) || images?.[0] || null;
}

// createdAt is a Firestore serverTimestamp() -- comes back as a Timestamp
// object with .toDate(), same shape/convention used for this same field in
// the seller-facing authentication.js list.
function toDate(timestamp) {
  return timestamp?.toDate ? timestamp.toDate() : null;
}

function formatSubmittedDate(request) {
  const submittedDate = toDate(request.createdAt);
  if (!submittedDate) return "--";

  return submittedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function matchBlock(request) {
  const topMatch = request.matches?.[0];

  if (!topMatch) {
    return `<div class="review-match no-match">No match found${request.status === "submitted" ? " (not yet analyzed)" : ""}</div>`;
  }

  return `
    <div class="review-match">
      ${topMatch.imageUrl ? `<img src="${topMatch.imageUrl}" alt="Matched listing" />` : ""}
      <div>
        <p><strong>Suggested match:</strong> ${topMatch.listingId}</p>
        <p>Confidence: ${(topMatch.score * 100).toFixed(1)}%</p>
        ${topMatch.matchedSubmittedImageUrl ? `<p><a href="${topMatch.matchedSubmittedImageUrl}" target="_blank" rel="noopener">View matching angle</a></p>` : ""}
      </div>
    </div>
  `;
}

function productDetailsBlock(productDetails) {
  const details = productDetails?.details || {};
  const rows = Object.entries(details)
    .map(([key, value]) => `
      <div class="detail-row">
        <span class="detail-label">${key}</span>
        <span class="detail-value">${value}</span>
      </div>
    `)
    .join("");

  if (!rows) return "";

  return `<div class="review-product-details">${rows}</div>`;
}

function reviewCard(id, request, sellerProfile) {
  const images = (request.images || [])
    .map((img, index) => `<img src="${img.url}" alt="Submitted item" data-image-index="${index}" />`)
    .join("");

  return `
    <article class="review-card" data-request-id="${id}">
      <div class="review-card-header">
        <div class="review-card-heading">
          <h3>#${id.slice(-8)}</h3>
          <span class="review-submitted-date">Submitted ${formatSubmittedDate(request)}</span>
        </div>
        <span class="status-badge status-${request.status}">${request.status}</span>
      </div>
      <div class="review-seller">
        <img class="review-seller-avatar" src="${sellerProfile?.profileImage || "/images/default-avatar.svg"}" alt="Seller avatar" />
        <span class="review-seller-username">@${sellerProfile?.username || "unknown"}</span>
      </div>
      <div class="review-images">${images}</div>
      ${matchBlock(request)}
      <p>${request.productDetails?.category || "--"} - ${request.tierSelection?.type || "--"}</p>
      ${productDetailsBlock(request.productDetails)}
      <textarea class="review-notes" placeholder="Notes for the seller (used for Needs Info / Rejected)"></textarea>
      <div class="review-actions">
        <button type="button" class="approve-btn" data-action="approved">Approve</button>
        <button type="button" class="reject-btn" data-action="rejected">Reject</button>
        <button type="button" class="needs-info-btn" data-action="needs_info">Needs Info</button>
        <button type="button" class="run-match-btn" data-action="run-match">Run AI Match</button>
      </div>
    </article>
  `;
}

async function fetchReviewableRequests() {
  const requestsRef = collection(db, "authenticationRequests");
  const q = query(requestsRef, where("status", "in", REVIEWABLE_STATUSES));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, data: docSnap.data() }));
}

async function renderRequests(requests) {
  if (requests.length === 0) {
    listEl.innerHTML = `<p class="default-paragraph">Nothing waiting on review.</p>`;
    return;
  }

  const sellerProfiles = await Promise.all(
    requests.map(({ data }) => getUserProfile(data.userId))
  );

  requestImagesById = new Map(requests.map(({ id, data }) => [id, data.images || []]));

  listEl.innerHTML = requests
    .map(({ id, data }, index) => reviewCard(id, data, sellerProfiles[index]))
    .join("");
}

async function authorizedFetch(url, options = {}) {
  // Force refresh -- the server re-verifies whatever JWT is sent, and a
  // cached token issued before the admin claim was granted won't carry it.
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
  const requestId = card.dataset.requestId;

  if (action === "run-match") {
    await authorizedFetch(`/api/authentication-requests/${requestId}/analyze`, { method: "POST" });
  } else {
    const notes = card.querySelector(".review-notes").value.trim();
    await authorizedFetch(`/api/authentication-requests/${requestId}`, {
      method: "PUT",
      body: JSON.stringify({ status: action, reviewerNotes: notes || null }),
    });
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
  carouselState.images = requestImagesById.get(card.dataset.requestId) || [];
  carouselState.index = Number(imageEl.dataset.imageIndex) || 0;
  renderCarouselImage();
  carouselModal.hidden = false;
}

// Built once and reused for every card, rather than one modal per request.
function initImageCarousel() {
  carouselModal = document.createElement("div");
  carouselModal.className = "carousel-modal";
  carouselModal.hidden = true;
  carouselModal.innerHTML = `
    <button type="button" class="carousel-close" aria-label="Close">&times;</button>
    <button type="button" class="carousel-prev" aria-label="Previous image">&#8249;</button>
    <img class="carousel-image" alt="Submitted item" />
    <button type="button" class="carousel-next" aria-label="Next image">&#8250;</button>
  `;
  document.body.appendChild(carouselModal);

  carouselImageEl = carouselModal.querySelector(".carousel-image");
  carouselModal.querySelector(".carousel-close").addEventListener("click", closeCarousel);
  carouselModal.querySelector(".carousel-prev").addEventListener("click", showPrevImage);
  carouselModal.querySelector(".carousel-next").addEventListener("click", showNextImage);

  // Click on the dark backdrop (not the image or nav buttons) closes the modal.
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
      console.error("❌ Reviewer action failed:", error);
      alert("Action failed: " + error.message);
    });
  });
}

async function loadReviewScreen() {
  const requests = await fetchReviewableRequests();
  await renderRequests(requests);
}

async function init() {
  const currentUser = await checkUserStatus();

  if (!currentUser) {
    window.location.href = "/login";
    return;
  }

  // UX-only gate -- real enforcement is the PUT route's server-side isAdmin
  // check plus Firestore rules. Forces a refresh (true) since a custom claim
  // set after this session's token was issued won't show up in the cached
  // token otherwise -- without this, a freshly-granted reviewer would have
  // to log out/in before the claim was visible here.
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
