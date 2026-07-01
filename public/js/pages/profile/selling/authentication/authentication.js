"use strict";

import { checkUserStatus } from "../../../../auth/auth.js";
import {
  collection,
  db,
  getDocs,
  query,
  where,
} from "../../../../api/firebase-client.js";

const currentUser = await checkUserStatus();

/**
 * Full status enum written across submitToFirebase() (authenticate.js) and
 * the (not yet built) reviewer actions route: submitted | pending_review |
 * needs_manual_review | needs_info | approved | rejected.
 *
 * "submitted", "pending_review", and "needs_manual_review" are collapsed
 * into a single "Under Review" badge here on purpose -- the distinction
 * between the AI having a suggested match or not is only useful to a human
 * reviewer, not the seller who submitted the request.
 */
const STATUS_DISPLAY = {
  submitted: { label: "Under Review", badge: "under-review" },
  pending_review: { label: "Under Review", badge: "under-review" },
  needs_manual_review: { label: "Under Review", badge: "under-review" },
  needs_info: { label: "Needs Info", badge: "needs-info" },
  approved: { label: "Approved", badge: "approved" },
  rejected: { label: "Rejected", badge: "rejected" },
};

function toDate(timestamp) {
  return timestamp?.toDate ? timestamp.toDate() : null;
}

function itemLabel(productDetails) {
  const details = productDetails?.details || {};
  const descriptor = details.Brand || details.Model || details["Card Name"] || "";
  return [productDetails?.category, descriptor].filter(Boolean).join(" - ") || "--";
}

function requestRow(id, request) {
  const submittedDate = toDate(request.createdAt);
  const display = STATUS_DISPLAY[request.status] || STATUS_DISPLAY.submitted;

  return `
    <tr>
      <td>
        <p class="product-id" title="${id}">#${id.slice(-8)}</p>
      </td>
      <td>
        <span class="date">${submittedDate ? submittedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "--"}</span>
      </td>
      <td>
        <span class="items">${itemLabel(request.productDetails)}</span>
      </td>
      <td>
        <span>${request.tierSelection?.type || "--"}</span>
      </td>
      <td>
        <span class="status-badge ${display.badge}">${display.label}</span>
      </td>
    </tr>
  `;
}

function renderRequests(requests) {
  const tbody = document.querySelector(".auth-request-table tbody");
  if (!tbody) return;

  if (requests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="default-paragraph" style="text-align:center; padding: 24px;">No authentication requests yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = requests
    .map(({ id, data }) => requestRow(id, data))
    .join("");
}

async function fetchAuthRequests(userId) {
  // No orderBy here on purpose -- combining it with the where() below would
  // need a composite Firestore index that doesn't exist yet (same reason
  // orders.js's equivalent query sorts client-side instead of in Firestore).
  const requestsRef = collection(db, "authenticationRequests");
  const q = query(requestsRef, where("userId", "==", userId));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, data: docSnap.data() }))
    .sort((a, b) => (toDate(b.data.createdAt) || 0) - (toDate(a.data.createdAt) || 0));
}

async function loadAuthenticationTab(userId) {
  if (!userId) {
    console.error("loadAuthenticationTab: no userId provided");
    return;
  }

  try {
    const requests = await fetchAuthRequests(userId);
    renderRequests(requests);
  } catch (error) {
    console.error("Error loading authentication requests tab:", error);
  }
}

await loadAuthenticationTab(currentUser.userId);
