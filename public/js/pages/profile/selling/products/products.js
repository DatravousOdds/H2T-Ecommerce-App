"use strict";

import { checkUserStatus } from "../../../../auth/auth.js";
import {
  collection,
  db,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "../../../../api/firebase-client.js";

const currentUser = await checkUserStatus();

const listBtn = document.getElementById('list-products-btn').addEventListener('click', () => {
  if (!currentUser || currentUser === null) {
    window.href.location = '/login';
  } else {
    window.href.location = '/seller';
  }
})


/**
 * Real listing shape, as written by seller.js (NOT the nested
 * basicInfo/inventory/pricing shape dashboard.js's old templates assumed):
 *   { userId, productName, listingPrice, originalPrice, status, brand,
 *     condition, size, category, categoryMeta, description,
 *     availableForTrade, createdAt, listingId,
 *     images: [{ url, path, isPrimary, index }] }
 *
 * Two real gaps in the current schema, handled defensively below rather
 * than assumed away:
 *   - no stock/quantity field exists yet -> shown as "--"
 *   - no view-count field exists yet -> shown as "--"
 */

const EMPTY_ROW = (colspan, message) =>
  `<tr><td colspan="${colspan}" class="default-paragraph" style="text-align:center; padding: 24px;">${message}</td></tr>`;

function firstImageUrl(listing) {
  return listing.images && listing.images[0] && listing.images[0].url
    ? listing.images[0].url
    : "/images/HypebeastBG.jpeg";
}

// Shared across every row template's delete button. Was previously
// inlined in draftRow as a single <path d="M3 6h18">, which only draws the
// trash can's top rim -- the body/lid paths below were missing.
function trashIconSVG() {
  return `
    <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 6h18"></path>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" x2="10" y1="11" y2="17"></line>
      <line x1="14" x2="14" y1="11" y2="17"></line>
    </svg>
  `;
}

function deleteButtonHTML(label = "Delete Listing") {
  return `
    <button class="action-button delete" aria-label="${label}">
      ${trashIconSVG()}
    </button>
  `;
}

// listing.status is a raw slug ("out-of-stock") -- reuse it as the modifier
// class name directly so new statuses don't need a mapping table kept in sync.
function statusBadgeClass(status) {
  return status || "active";
}

function allProductsRow(listing) {
  return `
    <tr class="product-row" data-product-id="${listing.id}">
      <td>
        <div class="product-info">
          <img src="${firstImageUrl(listing)}" alt="${listing.productName || ""}" class="product-image" loading="lazy" />
          <div class="product-details">
            <p class="product-name">${listing.productName || "Untitled listing"}</p>
            <p class="product-type">${listing.category || "--"}</p>
          </div>
        </div>
      </td>
      <td><span class="listing-badge ${statusBadgeClass(listing.status)}">${listing.status || "active"}</span></td>
      <td>${listing.condition || "--"}</td>
      <td>--</td>
      <td>$${Number(listing.listingPrice || 0).toFixed(2)}</td>
      <td>${listing.availableForTrade ? "$" + Number(listing.listingPrice || 0).toFixed(2) : "--"}</td>
      <td>--</td>
      <td>
        <div class="action-buttons">
          <button class="action-button edit" aria-label="Edit Listing">
            <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          ${deleteButtonHTML()}
        </div>
      </td>
    </tr>
  `;
}

function activeProductsRow(listing) {
  return `
    <tr class="product-row" data-product-id="${listing.id}">
      <td>
        <div class="product-info">
          <img src="${firstImageUrl(listing)}" alt="${listing.productName || ""}" class="product-image" loading="lazy" />
          <div class="product-details">
            <p class="product-name">${listing.productName || "Untitled listing"}</p>
            <p class="product-sku">ID: ${listing.id.slice(0, 8)}</p>
          </div>
        </div>
      </td>
      <td><span class="category-badge">${listing.category || "--"}</span></td>
      <td>${listing.size ? "US " + listing.size : "--"}</td>
      <td>
        <div class="condition-info">
          <span class="condition-badge new">${listing.condition || "--"}</span>
        </div>
      </td>
      <td>
        <div class="stock-info">
          <span class="stock-number">--</span>
          <span class="stock-status in-stock">In Stock</span>
        </div>
      </td>
      <td>$${Number(listing.listingPrice || 0).toFixed(2)}</td>
      <td>
        <div class="price-info">
          <span class="current-price">$${Number(listing.listingPrice || 0).toFixed(2)}</span>
        </div>
      </td>
      <td>
        <div class="views-info">
          <span class="view-count">--</span>
        </div>
      </td>
      <td>
        <div class="listing-date">
          <span class="date">${formatListedDate(listing.createdAt)}</span>
        </div>
      </td>
      <td>
        <div class="action-buttons">
          <button class="action-button edit" aria-label="Edit Listing">
            <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="action-button pause" aria-label="Pause Listing">
            <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          </button>
          ${deleteButtonHTML()}
        </div>
      </td>
    </tr>
  `;
}

function outOfStockRow(listing) {
  return `
    <tr class="product-row" data-product-id="${listing.id}">
      <td>
        <div class="product-info">
          <p class="product-name">${listing.productName || "Untitled listing"}</p>
        </div>
      </td>
      <td><span class="category-badge">${listing.category || "--"}</span></td>
      <td><span class="date">${formatListedDate(listing.createdAt)}</span></td>
      <td><span class="last-price">$${Number(listing.listingPrice || 0).toFixed(2)}</span></td>
      <td>--</td>
      <td>--</td>
      <td>--</td>
      <td>--</td>
      <td>
        <div class="action-buttons">
          <button class="action-button restock" aria-label="Restock Product">
            <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 3v18h18"></path>
            </svg>
          </button>
          ${deleteButtonHTML()}
        </div>
      </td>
    </tr>
  `;
}

function draftRow(listing) {
  return `
    <tr class="product-row" data-product-id="${listing.id}">
      <td>
        <div class="product-info">
          <div class="product-image-container">
            <img src="${firstImageUrl(listing)}" alt="${listing.productName || ""}" class="product-image" loading="lazy" />
            <span class="draft-badge">Draft</span>
          </div>
          <div class="product-details">
            <p class="product-name">${listing.productName || "Untitled draft"}</p>
            <p class="product-id">ID: #${listing.id.slice(0, 8)}</p>
          </div>
        </div>
      </td>
      <td>
        <div class="completion-info">
          <span class="completion-text">${estimateCompletion(listing)}% Complete</span>
        </div>
      </td>
      <td>${listMissingFields(listing)}</td>
      <td><span class="date">${formatListedDate(listing.createdAt)}</span></td>
      <td><span class="date">${formatListedDate(listing.createdAt)}</span></td>
      <td><span class="category-badge">${listing.category || "--"}</span></td>
      <td><span class="draft-price">$${Number(listing.listingPrice || 0).toFixed(2)}</span></td>
      <td>
        <div class="action-buttons">
          <button class="action-button publish" aria-label="Publish Draft">
            <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20V10"></path>
              <path d="M18 14l-6-6-6 6"></path>
            </svg>
          </button>
          ${deleteButtonHTML("Delete Draft")}
        </div>
      </td>
    </tr>
  `;
}

// A draft's "completion" isn't tracked anywhere in the schema yet -- this is
// a simple stand-in based on which real fields are present, not a stored value.
function estimateCompletion(listing) {
  const fields = ["productName", "listingPrice", "brand", "condition", "size", "category", "images"];
  const filled = fields.filter((f) => {
    if (f === "images") return listing.images && listing.images.length > 0;
    return Boolean(listing[f]);
  }).length;
  return Math.round((filled / fields.length) * 100);
}

function listMissingFields(listing) {
  const missing = [];
  if (!listing.productName) missing.push("Name");
  if (!listing.images || listing.images.length === 0) missing.push("Photos");
  if (!listing.description) missing.push("Description");
  return missing.length ? missing.join(", ") : "--";
}

function formatListedDate(createdAt) {
  // createdAt is a Firestore serverTimestamp() once written, which arrives
  // back as a Firestore Timestamp object with a .toDate() method -- not a
  // raw number like the Stripe-derived orders.createdAt field.
  if (!createdAt || typeof createdAt.toDate !== "function") return "--";
  return createdAt.toDate().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// All four tables' EMPTY_ROW uses colspan 8, so a single 8-cell skeleton
// row matches every one of them.
function productSkeletonRow() {
  return `
    <tr class="skeleton-item">
      ${Array.from({ length: 8 }, () => `<td><span class="skeleton skeleton-line medium"></span></td>`).join("")}
    </tr>
  `;
}

function renderProductTableSkeletons(count = 5) {
  ["all-products-table", "active-products-table", "out-of-stock-products-table", "draft-products-table"].forEach(
    (tableId) => {
      const tbody = document.getElementById(tableId);
      if (tbody) tbody.innerHTML = Array.from({ length: count }, productSkeletonRow).join("");
    }
  );
}

function populateTable(tableId, items, rowTemplate, emptyMessage) {
  const tbody = document.getElementById(tableId);
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = EMPTY_ROW(8, emptyMessage);
    return;
  }

  tbody.innerHTML = items.map(rowTemplate).join("");
}

function updateStatCard(articleId, value) {
  const el = document.querySelector(`#${articleId} .stat-card-value`);
  if (el) el.textContent = value;
}

async function fetchSellerListings(userId) {
  const listingsRef = collection(db, "listings");
  const q = query(listingsRef, where("userId", "==", userId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

async function fetchTotalSales(userId) {
  const ordersRef = collection(db, "orders");
  const q = query(ordersRef, where("sellerId", "==", userId));
  const snapshot = await getDocs(q);

  // subtotal is stored as a string (toFixed() on the server), not a number --
  // Number() it explicitly or this silently does string concatenation.
  return snapshot.docs.reduce((total, docSnap) => {
    const subtotal = Number(docSnap.data().subtotal);
    return total + (Number.isFinite(subtotal) ? subtotal : 0);
  }, 0);
}

// Master list fetched once from Firestore; search/filter re-slice this
// in memory instead of re-querying on every keystroke or checkbox change.
let allListings = [];

const searchInput = document.getElementById("product-search");
const applyFiltersBtn = document.querySelector("#filter-container .filter-actions .primary");
const clearFiltersBtn = document.querySelector("#filter-container .filter-actions .secondary");

// Checkbox groups whose value maps directly onto a real listing field.
// Price Range and Listing Type need their own comparison logic below since
// they don't reduce to a single equality check.
const CATEGORY_FILTER_IDS = {
  "product-sneakers": "sneakers",
  "product-apparel": "apparel",
  "product-accessories": "accessories",
};

const BRAND_FILTER_IDS = {
  "brand-nike": "nike",
  "brand-jordan": "jordan",
  "brand-yeezy": "yeezy",
  "brand-offWhite": "offwhite",
};

const PRICE_RANGE_FILTER_IDS = {
  "price-priceRange1": [25, 50],
  "price-priceRange2": [50, 100],
  "price-priceRange3": [100, 150],
  "price-priceRange4": [150, Infinity],
};

// "New listings" and "Low stock" have no backing field yet (no stock/quantity
// or "listed recently" data exists on a listing -- same schema gap noted at
// the top of this file), so they're left unwired rather than silently
// filtering everything to zero results.
const STATUS_FILTER_IDS = {
  "listType-active": "active",
  "listType-OutOfStock": "out-of-stock",
};

function normalizeBrand(brand) {
  return (brand || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function checkedIdsIn(filterIdMap) {
  return Object.keys(filterIdMap).filter((id) => document.getElementById(id)?.checked);
}

function getFilteredListings() {
  const searchTerm = (searchInput?.value || "").trim().toLowerCase();

  const checkedCategories = checkedIdsIn(CATEGORY_FILTER_IDS).map((id) => CATEGORY_FILTER_IDS[id]);
  const checkedBrands = checkedIdsIn(BRAND_FILTER_IDS).map((id) => BRAND_FILTER_IDS[id]);
  const checkedPriceRanges = checkedIdsIn(PRICE_RANGE_FILTER_IDS).map((id) => PRICE_RANGE_FILTER_IDS[id]);
  const checkedStatuses = checkedIdsIn(STATUS_FILTER_IDS).map((id) => STATUS_FILTER_IDS[id]);

  return allListings.filter((listing) => {
    if (searchTerm) {
      const haystack = `${listing.productName || ""} ${listing.brand || ""} ${listing.category || ""}`.toLowerCase();
      if (!haystack.includes(searchTerm)) return false;
    }

    if (checkedCategories.length && !checkedCategories.includes(listing.category)) return false;

    if (checkedBrands.length && !checkedBrands.includes(normalizeBrand(listing.brand))) return false;

    if (checkedPriceRanges.length) {
      const price = Number(listing.listingPrice || 0);
      const inRange = checkedPriceRanges.some(([min, max]) => price >= min && price <= max);
      if (!inRange) return false;
    }

    if (checkedStatuses.length && !checkedStatuses.includes(listing.status)) return false;

    return true;
  });
}

function renderProductTables(listings) {
  // No status-change write path exists yet (Status modal save isn't wired
  // up), so right now every real listing is realistically "active" --
  // this filtering is correct for when that gets built, not dead code.
  const active = listings.filter((l) => l.status === "active");
  const outOfStock = listings.filter((l) => l.status === "out-of-stock");
  const drafts = listings.filter((l) => l.status === "draft");

  populateTable("all-products-table", listings, allProductsRow, "No listings match your search or filters.");
  populateTable("active-products-table", active, activeProductsRow, "No active listings match your search or filters.");
  populateTable("out-of-stock-products-table", outOfStock, outOfStockRow, "No out-of-stock listings match your search or filters.");
  populateTable("draft-products-table", drafts, draftRow, "No drafts match your search or filters.");

  updateStatCard("active-listings", active.length);
}

function refreshProductTables() {
  renderProductTables(getFilteredListings());
}

// Pausing takes a listing out of "active" by writing status: "draft" --
// same field renderProductTables() already filters on, so the row just
// stops matching the active table and starts matching the draft one on
// the next render. No separate "paused" status: the ask was specifically
// "send it to drafts," and introducing a distinct paused state would mean
// a table for it that doesn't exist yet (see the unwired Status Modal in
// profile.html for that larger, separate feature).
async function pauseListing(listingId) {
  await updateDoc(doc(db, "listings", listingId), { status: "draft" });

  const listing = allListings.find((l) => l.id === listingId);
  if (listing) listing.status = "draft";

  refreshProductTables();
}

async function deleteListing(listingId) {
  await deleteDoc(doc(db, "listings", listingId));

  allListings = allListings.filter((l) => l.id !== listingId);
  refreshProductTables();
}

// #trashModal already existed in profile.html as static markup (hardcoded
// to "Jordan 4 Retro") with no JS behind it -- reusing it here instead of
// building a new confirm dialog, filling in the real listing on open.
const trashModal = document.getElementById("trashModal");
let pendingDeleteListingId = null;

function openDeleteModal(listing) {
  if (!trashModal) return;

  pendingDeleteListingId = listing.id;
  const message = trashModal.querySelector(".delete-message");
  const productId = trashModal.querySelector(".product-id");
  if (message) {
    message.textContent = `Are you sure you want to delete "${listing.productName || "this listing"}"? This action cannot be undone and will permanently remove the product from your inventory.`;
  }
  if (productId) productId.textContent = `Product ID: ${listing.id}`;

  trashModal.classList.add("active");
}

function closeDeleteModal() {
  pendingDeleteListingId = null;
  trashModal?.classList.remove("active");
}

function initDeleteModalListeners() {
  trashModal?.querySelector(".cancel-btn")?.addEventListener("click", closeDeleteModal);

  trashModal?.querySelector(".delete-btn")?.addEventListener("click", async (e) => {
    if (!pendingDeleteListingId) return;

    const confirmBtn = e.currentTarget;
    confirmBtn.disabled = true;
    try {
      await deleteListing(pendingDeleteListingId);
      closeDeleteModal();
    } catch (error) {
      console.error(`Error deleting listing ${pendingDeleteListingId}:`, error);
    } finally {
      confirmBtn.disabled = false;
    }
  });
}

// Edit/Pause/Delete buttons live inside four separately-rendered tables
// (all/active/out-of-stock/draft), so one delegated listener on the shared
// "products" section catches all of them instead of re-binding after every
// re-render.
function initActionButtonListeners() {
  const productsSection = document.getElementById("products");

  productsSection?.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".action-button.edit");
    if (editBtn) {
      const listingId = editBtn.closest(".product-row")?.dataset.productId;
      if (listingId) window.location.href = `/seller?listingId=${listingId}`;
      return;
    }

    const pauseBtn = e.target.closest(".action-button.pause");
    if (pauseBtn) {
      const listingId = pauseBtn.closest(".product-row")?.dataset.productId;
      if (!listingId) return;

      pauseBtn.disabled = true;
      try {
        await pauseListing(listingId);
      } catch (error) {
        console.error(`Error pausing listing ${listingId}:`, error);
        pauseBtn.disabled = false;
      }
      return;
    }

    const deleteBtn = e.target.closest(".action-button.delete");
    if (deleteBtn) {
      const listingId = deleteBtn.closest(".product-row")?.dataset.productId;
      const listing = allListings.find((l) => l.id === listingId);
      if (listing) openDeleteModal(listing);
    }
  });
}

function initSearchAndFilterListeners() {
  searchInput?.addEventListener("input", refreshProductTables);

  applyFiltersBtn?.addEventListener("click", () => {
    refreshProductTables();
    document.querySelector(".filter-opt .filter-dropdown-content")?.classList.remove("show");
  });

  clearFiltersBtn?.addEventListener("click", () => {
    document
      .querySelectorAll("#filter-container .filter-group input[type='checkbox']")
      .forEach((checkbox) => (checkbox.checked = false));
    refreshProductTables();
  });
}

async function loadProductsTab(userId) {
  if (!userId) {
    console.error("loadProductsTab: no userId provided");
    return;
  }

  renderProductTableSkeletons();

  try {
    const [listings, totalSales] = await Promise.all([
      fetchSellerListings(userId),
      fetchTotalSales(userId),
    ]);

    allListings = listings;
    renderProductTables(getFilteredListings());
    updateStatCard("total-sales", `$${totalSales.toFixed(2)}`);
  } catch (error) {
    console.error("Error loading products tab:", error);
  }
}

initActionButtonListeners();
initDeleteModalListeners();
initSearchAndFilterListeners();
await loadProductsTab(currentUser.userId);