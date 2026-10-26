"use strict";

import { checkUserStatus } from "../../auth/auth.js";
import { auth } from "../../api/firebase-client.js";
import { escapeHtml } from "../../core/escapeHtml.js";

const listEl = document.getElementById("review-list");
const guardEl = document.getElementById("not-authorized");
const messageEl = document.getElementById("review-message");

// Every field on these cards was typed by an applicant, so it's escaped
// before going into innerHTML. It must escape quotes too: several values go
// inside attributes (data-brand-name, href), where an unescaped " in a
// brand name would let it add its own attributes, e.g. an onmouseover.

function formatSubmittedDate(item) {
  if (!item.submittedAt) return "--";
  return new Date(item.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function detailRow(label, valueHtml) {
  return `
    <div class="detail-row">
      <span class="detail-label">${label}</span>
      <span class="detail-value">${valueHtml}</span>
    </div>
  `;
}

function reviewCard(item) {
  const instagram = escapeHtml(item.instagram);
  // The server only stores http(s) URLs, so this can't be a javascript: link
  const website = item.website
    ? `<a href="${escapeHtml(item.website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.website)}</a>`
    : "None";
  const ein = item.einLast4
    ? `<span class="brand-review-ein">••-•••${escapeHtml(item.einLast4)}</span>
       <button type="button" class="brand-review-link-btn" data-action="show-ein">Show</button>`
    : "Not provided";

  return `
    <article class="review-card" data-uid="${escapeHtml(item.uid)}" data-brand-name="${escapeHtml(item.brandName)}">
      <div class="review-card-header">
        <div class="review-card-heading">
          <h3>${escapeHtml(item.brandName)}</h3>
          <span class="review-submitted-date">Submitted ${formatSubmittedDate(item)}</span>
        </div>
        <span class="status-badge status-pending_review">${item.applicationCount > 1 ? `reapply #${item.applicationCount}` : "new"}</span>
      </div>

      <div class="review-product-details">
        ${detailRow("Founder", `@${escapeHtml(item.founderHandle)} · ${escapeHtml(item.contactEmail)}`)}
        ${detailRow("Category", escapeHtml(item.category))}
        ${detailRow("Instagram", `<a href="https://instagram.com/${instagram}" target="_blank" rel="noopener noreferrer">@${instagram}</a>`)}
        ${detailRow("Website", website)}
        ${detailRow("EIN", ein)}
      </div>

      <p class="brand-review-description">${escapeHtml(item.description)}</p>

      <label class="brand-review-notes-label" for="notes-${escapeHtml(item.uid)}">Note to the brand owner (required to reject, included in the email)</label>
      <textarea class="review-notes" id="notes-${escapeHtml(item.uid)}" maxlength="1000"></textarea>
      <div class="review-actions">
        <button type="button" class="approve-btn" data-action="approved">Approve</button>
        <button type="button" class="reject-btn" data-action="rejected">Reject</button>
      </div>
    </article>
  `;
}

async function authorizedFetch(url, options = {}) {
  // Force refresh -- same reasoning as the other admin pages: a cached
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

// tone: "success" | "warning" | "error"
function showMessage(text, tone) {
  messageEl.textContent = text;
  messageEl.dataset.tone = tone;
  messageEl.hidden = false;
}

async function loadReviewScreen() {
  const response = await authorizedFetch("/api/admin/brand-applications?status=pending_review");
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Failed to load applications");

  listEl.innerHTML = result.items.length
    ? result.items.map(reviewCard).join("")
    : `<p class="default-paragraph">No applications waiting on review.</p>`;
}

async function handleDecision(card, decision) {
  const notesEl = card.querySelector(".review-notes");
  const notes = notesEl.value.trim();
  const brandName = card.dataset.brandName;

  if (decision === "rejected" && !notes) {
    showMessage(`Add a note before rejecting ${brandName}. The owner sees it in their email.`, "error");
    notesEl.focus();
    return;
  }

  const buttons = card.querySelectorAll(".review-actions button");
  buttons.forEach((button) => { button.disabled = true; });

  try {
    const response = await authorizedFetch(`/api/admin/brand-applications/${encodeURIComponent(card.dataset.uid)}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, reviewerNotes: notes }),
    });
    const result = await response.json();

    // 409: someone else already decided it, so refresh to the real list
    if (response.status === 409) {
      showMessage(result.message, "warning");
      await loadReviewScreen();
      return;
    }
    if (!response.ok) throw new Error(result.message || "Could not save the decision");

    const verb = decision === "approved" ? "Approved" : "Rejected";
    if (result.emailSent) {
      showMessage(`${verb} ${brandName}. The owner has been emailed.`, "success");
    } else {
      showMessage(`${verb} ${brandName}, but the email to the owner didn't send. Contact them directly.`, "warning");
    }
    await loadReviewScreen();
  } catch (error) {
    showMessage(`${error.message}. Nothing was changed for ${brandName}.`, "error");
    buttons.forEach((button) => { button.disabled = false; });
  }
}

// Fetches the full EIN only when asked; the list never includes it.
async function toggleEin(card, button) {
  const einEl = card.querySelector(".brand-review-ein");

  if (button.dataset.revealed === "true") {
    einEl.textContent = einEl.dataset.masked;
    button.textContent = "Show";
    button.dataset.revealed = "false";
    return;
  }

  button.disabled = true;
  try {
    const response = await authorizedFetch(`/api/admin/brand-applications/${encodeURIComponent(card.dataset.uid)}/ein`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Could not load the EIN");

    einEl.dataset.masked = einEl.textContent;
    einEl.textContent = result.ein;
    button.textContent = "Hide";
    button.dataset.revealed = "true";
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    button.disabled = false;
  }
}

function wireActions() {
  listEl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const card = button.closest(".review-card");
    if (button.dataset.action === "show-ein") {
      toggleEin(card, button);
    } else {
      handleDecision(card, button.dataset.action);
    }
  });
}

async function init() {
  const currentUser = await checkUserStatus();

  if (!currentUser) {
    window.location.href = "/login?returnTo=/admin/brand-review";
    return;
  }

  // UX-only gate -- real enforcement is the admin check on every
  // /api/admin/brand-applications route.
  const tokenResult = await auth.currentUser.getIdTokenResult(true);

  if (tokenResult.claims.admin !== true) {
    guardEl.style.display = "block";
    listEl.style.display = "none";
    return;
  }

  wireActions();
  try {
    await loadReviewScreen();
  } catch (error) {
    console.error("Failed to load brand applications:", error);
    listEl.innerHTML = `<p class="default-paragraph">Couldn't load applications. Refresh to try again.</p>`;
  }
}

init();
