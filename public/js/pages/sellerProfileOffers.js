"use strict";

import { checkUserStatus } from "../auth/auth.js";
import { getUserProfile } from "../core/global.js";
import { initCartDrawer } from "../components/cartDrawer.js";

const sellerId = new URLSearchParams(window.location.search).get("id");

function renderSellerHeader(sellerProfile) {
  const avatarEl = document.getElementById("seller-picture");
  const usernameEl = document.getElementById("seller-username");

  if (avatarEl) {
    avatarEl.src = sellerProfile?.profileImage || "/images/default-avatar.svg";
  }
  if (usernameEl) {
    usernameEl.textContent = sellerProfile?.username ? `@${sellerProfile.username}` : "@unknown";
  }
}

async function respondToOffer(user, offerId, action, counterAmount) {
  const res = await fetch(`/api/offers/${offerId}/respond`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${user.idToken}`,
    },
    body: JSON.stringify({ action, counterAmount }),
  });

  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.message || "Failed to respond to offer");
  }

  return result;
}

function offerStatusText(offer) {
  if (offer.status === "accepted") return "Accepted";
  if (offer.status === "rejected") return "Declined";
  return offer.turn === "seller" ? "Awaiting seller response" : "Awaiting buyer response";
}

function offerStatusBadgeClass(offer) {
  if (offer.status === "accepted") return "offer-status-badge--accepted";
  if (offer.status === "rejected") return "offer-status-badge--rejected";
  return "offer-status-badge--pending";
}

// viewerRole comes from the API: "seller" if this is the seller's own
// profile (every offer here is theirs to manage), "buyer" if it's someone
// viewing another seller's profile (every offer here is one of their own
// threads, and it's their turn whenever offer.turn === "buyer").
function canRespond(offer, viewerRole) {
  return offer.status === "active" && offer.turn === viewerRole;
}

function offerCardTemplate(offer, viewerRole) {
  const respondable = canRespond(offer, viewerRole);

  return `
    <div class="offer-conversation-card" data-offer-id="${offer.id}">
      <img src="${offer.productImage || "/images/HypebeastBG.jpeg"}" alt="${offer.productName}" loading="lazy" />
      <div class="offer-conversation-details">
        <p class="offer-conversation-product">${offer.productName}</p>
        <p class="offer-conversation-amount">$${offer.offerAmount}</p>
        <span class="offer-status-badge ${offerStatusBadgeClass(offer)}">${offerStatusText(offer)}</span>
        ${respondable ? `
          <div class="offer-status-actions">
            <button type="button" class="offer-accept-btn" data-action="accept">Accept</button>
            <button type="button" class="offer-reject-btn" data-action="reject">Decline</button>
            <input type="number" class="offer-counter-input" data-input="counter" placeholder="Counter amount">
            <button type="button" class="offer-counter-btn" data-action="counter">Counter</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function wireOfferCards(listEl, user, viewerRole, reload) {
  listEl.querySelectorAll(".offer-conversation-card").forEach((card) => {
    const offerId = card.dataset.offerId;

    card.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const action = btn.dataset.action;
        const counterAmount = card.querySelector('[data-input="counter"]')?.value;

        try {
          await respondToOffer(user, offerId, action, counterAmount);
          await reload();
        } catch (error) {
          alert(error.message);
        }
      });
    });
  });
}

async function loadOffers(user, listEl) {
  const res = await fetch(`/api/sellers/${sellerId}/offers`, {
    headers: { "Authorization": `Bearer ${user.idToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to load offers: ${res.status}`);
  }

  const { offers, viewerRole } = await res.json();

  if (!offers.length) {
    listEl.innerHTML = `<p class="default-paragraph offers-conversation-empty">No offers yet.</p>`;
    return;
  }

  listEl.innerHTML = offers.map((offer) => offerCardTemplate(offer, viewerRole)).join("");
  wireOfferCards(listEl, user, viewerRole, () => loadOffers(user, listEl));
}

async function initOffersPage() {
  if (!sellerId) {
    console.error("No seller id in URL. Redirecting...");
    window.location.href = "/";
    return;
  }

  const listEl = document.getElementById("offersConversationList");

  const [sellerProfile, user] = await Promise.all([
    getUserProfile(sellerId),
    checkUserStatus(),
  ]);

  renderSellerHeader(sellerProfile);

  if (!user) {
    listEl.innerHTML = `<p class="default-paragraph offers-conversation-empty">Please log in to view offers.</p>`;
    return;
  }

  try {
    await loadOffers(user, listEl);
  } catch (error) {
    console.error("Error loading offers:", error);
    listEl.innerHTML = `<p class="default-paragraph offers-conversation-empty">Couldn't load offers.</p>`;
  }
}

initOffersPage();
initCartDrawer();
