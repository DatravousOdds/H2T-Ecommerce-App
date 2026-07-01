"use strict";

import { db, collection, getDocs, query, where } from "../api/firebase-client.js";

/**
 * Firestore has no native "contains" / substring search -- only exact
 * match or single-field prefix-range queries. Real fuzzy multi-field
 * search (matching name OR brand, anywhere in the string) would need a
 * dedicated search service (Algolia/Typesense), which is out of scope
 * for MVP. Same approach already used in purchases.js's search: fetch
 * once, filter client-side on each keystroke. Fine at the listing
 * volumes a marketplace like this deals with at launch.
 *
 * SKU is deliberately left out of the results, not shown as "--":
 * confirmed by reading seller.js directly that the SKU input on the
 * listing form is never actually written to the listing object saved to
 * Firestore -- no real listing has one. Showing "SKU: --" on literally
 * every single result forever would look like a real, structurally-
 * present-but-empty field rather than what it actually is: a feature
 * that was never wired up. Omitting it is the honest version of this UI
 * until the listing form itself saves a real SKU.
 */

const DEBOUNCE_MS = 250;
const MAX_RESULTS = 8;

let cachedListings = null;
let debounceTimer = null;

async function fetchActiveListings() {
  if (cachedListings) return cachedListings;

  const listingsRef = collection(db, "listings");
  const q = query(listingsRef, where("status", "==", "active"));
  const snapshot = await getDocs(q);

  cachedListings = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  return cachedListings;
}

function matchesSearch(listing, term) {
  const lowerTerm = term.toLowerCase();
  return (
    (listing.productName || "").toLowerCase().includes(lowerTerm) ||
    (listing.brand || "").toLowerCase().includes(lowerTerm)
  );
}

function resultRowHTML(listing) {
  const imageUrl = listing.images?.[0]?.url || "/images/HypebeastBG.jpeg";

  return `
    <a class="search-result-item" href="/shop/product.html?id=${listing.id}">
      <img src="${imageUrl}" alt="${listing.productName || ""}" class="search-result-image" />
      <div class="search-result-info">
        <p class="search-result-name">${listing.productName || "Untitled listing"}</p>
        <p class="search-result-meta">
          ${listing.brand || "Unknown brand"}${listing.condition ? ` &middot; ${listing.condition}` : ""}
        </p>
      </div>
    </a>
  `;
}

function renderResults(panel, results, term) {
  if (!term) {
    panel.innerHTML = "";
    panel.classList.remove("active");
    return;
  }

  if (results.length === 0) {
    panel.innerHTML = `<p class="search-no-results">No results for "${term}"</p>`;
    panel.classList.add("active");
    return;
  }

  panel.innerHTML = results.slice(0, MAX_RESULTS).map(resultRowHTML).join("");
  panel.classList.add("active");
}

function buildResultsPanel(searchForm) {
  let panel = searchForm.querySelector(".search-results-panel");
  if (panel) return panel;

  panel = document.createElement("div");
  panel.className = "search-results-panel";
  searchForm.appendChild(panel);
  return panel;
}

export function setupSearch(nav) {
  const searchForm = nav.querySelector(".search-form");
  const searchInput = nav.querySelector(".search-input");

  if (!searchForm || !searchInput) return;

  // .search-form already has position: relative and matches the input's
  // width -- the dropdown panel anchors here, not to the wider
  // .search-section flex container (which also holds the logo).
  const panel = buildResultsPanel(searchForm);

  // The form's native submit (full page navigation) isn't useful here --
  // results already render live as the user types, the same way StockX's
  // search behaves.
  searchForm.addEventListener("submit", (e) => e.preventDefault());

  searchInput.addEventListener("input", () => {
    const term = searchInput.value.trim();

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (!term) {
        renderResults(panel, [], term);
        return;
      }

      try {
        const listings = await fetchActiveListings();
        const results = listings.filter((listing) => matchesSearch(listing, term));
        renderResults(panel, results, term);
      } catch (error) {
        console.error("Error searching listings:", error);
      }
    }, DEBOUNCE_MS);
  });

  // Clicking outside the search form closes the dropdown -- otherwise it
  // would stay open over whatever the user clicks next on the page.
  document.addEventListener("click", (e) => {
    if (!searchForm.contains(e.target)) {
      panel.classList.remove("active");
    }
  });
}