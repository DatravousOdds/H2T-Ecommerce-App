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

const REVIEWABLE_STATUSES = ["submitted", "pending_review", "needs_manual_review"];

const listEl = document.getElementById("review-list");
const guardEl = document.getElementById("not-authorized");

function primaryImage(images) {
  return images?.find((img) => img.isPrimary) || images?.[0] || null;
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

function reviewCard(id, request) {
  const images = (request.images || []).map((img) => `<img src="${img.url}" alt="Submitted item" />`).join("");

  return `
    <article class="review-card" data-request-id="${id}">
      <div class="review-card-header">
        <h3>#${id.slice(-8)}</h3>
        <span class="status-badge under-review">${request.status}</span>
      </div>
      <div class="review-images">${images}</div>
      ${matchBlock(request)}
      <p>${request.productDetails?.category || "--"} - ${request.tierSelection?.type || "--"}</p>
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

function renderRequests(requests) {
  if (requests.length === 0) {
    listEl.innerHTML = `<p class="default-paragraph">Nothing waiting on review.</p>`;
    return;
  }

  listEl.innerHTML = requests.map(({ id, data }) => reviewCard(id, data)).join("");
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

function wireActions() {
  listEl.addEventListener("click", (event) => {
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
  renderRequests(requests);
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

  wireActions();
  await loadReviewScreen();
}

init();
