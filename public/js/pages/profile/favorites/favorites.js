"use strict";

import { db, doc, collection, getDocs, deleteDoc } from "../../../api/firebase-client.js";


/**
 * Schema assumption (favorites/{userId}/items/{itemId} is being designed
 * separately right now -- this is the shape being assumed until confirmed):
 *   - the item doc's Firestore ID IS the listingId itself, not a random
 *     auto-id -- so removing a favorite or checking "is this favorited"
 *     is a direct doc lookup, not a query
 *   - each doc denormalizes the listing's display fields, mirroring how
 *     order.item already does this elsewhere in the app, rather than
 *     storing just a bare reference and requiring a second lookup to render:
 *       { listingId, productName, originalPrice, brand, category,
 *         images: [{ url }], addedAt }
 *
 * If the real write-side schema ends up different, only the two small
 * read sites below (favoriteCardHTML, fetchFavorites) need to change --
 * everything else here is shape-agnostic.
 */

function favoriteCardHTML(favorite) {
  const imageUrl = favorite.images?.[0]?.url || "/images/HypebeastBG.jpeg";

  return `
    <div class="pro" role="listitem" data-listing-id="${favorite.id}">
      <div class="product-image">
        <div class="liked" data-remove-favorite="${favorite.id}">
          <i class="fa-solid fa-heart"></i>
        </div>
        <img src="${imageUrl}" class="image-custom" alt="${favorite.productName || ""}" />
      </div>
      <div class="des">
        <div class="price-description">
          <p class="product-name">${favorite.productName || "Untitled listing"}</p>
          <h5>$${Number(favorite.originalPrice || 0).toFixed(2)}</h5>
        </div>
      </div>
    </div>
  `;
}

function showEmptyState() {
  const emptyState = document.querySelector("#favorites .empty-state");
  const grid = document.querySelector("#favorites .favorite-grid");

  if (emptyState) emptyState.hidden = false;
  if (grid) grid.hidden = true;
}

function showGrid(favorites) {
  const emptyState = document.querySelector("#favorites .empty-state");
  const grid = document.querySelector("#favorites .favorite-grid");

  if (emptyState) emptyState.hidden = true;
  if (grid) {
    grid.hidden = false;
    grid.innerHTML = favorites.map(favoriteCardHTML).join("");
  }
}

async function fetchFavorites(userId) {
  const itemsRef = collection(db, "favorites", userId, "items");
  const snapshot = await getDocs(itemsRef);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

async function removeFavorite(userId, listingId) {
  await deleteDoc(doc(db, "favorites", userId, "items", listingId));
}

function wireRemoveButtons(userId) {
  const grid = document.querySelector("#favorites .favorite-grid");
  if (!grid) return;

  grid.addEventListener("click", async (e) => {
    const removeBtn = e.target.closest("[data-remove-favorite]");
    if (!removeBtn) return;

    // The whole card navigates to the product page on click -- removing
    // a favorite shouldn't also trigger that navigation.
    e.stopPropagation();

    const listingId = removeBtn.dataset.removeFavorite;

    try {
      await removeFavorite(userId, listingId);
      const card = removeBtn.closest(".pro");
      if (card) card.remove();

      const remaining = grid.querySelectorAll(".pro").length;
      if (remaining === 0) showEmptyState();
    } catch (error) {
      console.error("Error removing favorite:", error);
    }
  });

  // The card itself navigates to the product page -- wired here since the
  // cards are rendered dynamically and didn't exist at page-load time for
  // any earlier listener to attach to.
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".pro");
    if (!card || e.target.closest("[data-remove-favorite]")) return;
    window.location.href = `/shop/product.html?id=${card.dataset.listingId}`;
  });
}

export async function initFavorites(userData) {
  if (!userData?.userId) return;

  try {
    const favorites = await fetchFavorites(userData.userId);

    if (favorites.length === 0) {
      showEmptyState();
    } else {
      showGrid(favorites);
    }

    wireRemoveButtons(userData.userId);
  } catch (error) {
    console.error("Error loading favorites:", error);
    showEmptyState();
  }
}