import { checkUserStatus } from '../auth/auth.js';
import { db, collection, where, query, getDocs } from '../api/firebase-client.js';
import { initCartDrawer } from '../components/cartDrawer.js';

initCartDrawer();
checkUserStatus();

// Featured/sponsor brands: always shown on this page, even with 0 listings.
// Everything else is discovered from real listings and appended below them.
const FEATURED_BRANDS = [
  { name: "Jordan", note: "Sneakers", image: "../images/IMG_2604.jpg", dark: false },
  { name: "Gucci", note: "Apparel", image: "../images/brand_2.jpg", dark: true },
  { name: "Vlone", note: "Apparel", image: "../images/brand_1.jpg", dark: true },
  { name: "Chrome Hearts", note: "Sneakers", image: "../images/chrome_banner_01.jpeg", dark: false },
];

// brand is free text (seller.js just saves whatever was typed), so there's no
// fixed casing/punctuation to match on. Same normalization as men.js's
// normalizeBrand() -- keep in sync if that one changes.
function normalizeBrand(brand) {
  return (brand || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

// shop.html?brand= reads this slug and re-normalizes it the same way, so
// spaces/punctuation differences between the slug and the stored brand don't
// matter as long as both pass through normalizeBrand().
function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

// Matches .brand-tile's shape (name + count line) -- only allBrandsGrid gets
// one since featuredGrid's 4 banners are hardcoded in FEATURED_BRANDS and
// already render immediately; only their listing count depends on the fetch.
function renderBrandTileSkeletons(grid, count = 8) {
  if (!grid) return;
  grid.innerHTML = Array.from({ length: count }, () => `
    <div class="brand-tile skeleton-item">
      <span class="skeleton skeleton-line medium"></span>
      <span class="skeleton skeleton-line short"></span>
    </div>
  `).join("");
}

async function loadBrands() {
  const featuredGrid = document.getElementById("featuredBrandGrid");
  const allBrandsSection = document.getElementById("all-brands");
  const allBrandsGrid = document.getElementById("allBrandsGrid");

  renderBrandTileSkeletons(allBrandsGrid);

  try {
    const q = query(collection(db, "listings"), where("status", "==", "active"));
    const querySnapshot = await getDocs(q);

    // normalizedBrand -> { name: first-seen casing, count }
    const brandCounts = new Map();
    querySnapshot.docs.forEach((doc) => {
      const rawBrand = (doc.data().brand || "").trim();
      const key = normalizeBrand(rawBrand);
      if (!key) return;

      if (!brandCounts.has(key)) {
        brandCounts.set(key, { name: rawBrand, count: 0 });
      }
      brandCounts.get(key).count += 1;
    });

    renderFeaturedBrands(featuredGrid, brandCounts);
    renderOtherBrands(allBrandsSection, allBrandsGrid, brandCounts);
  } catch (error) {
    console.error("Error loading brands:", error);
  }
}

function renderFeaturedBrands(grid, brandCounts) {
  FEATURED_BRANDS.forEach((brand) => {
    const key = normalizeBrand(brand.name);
    const count = brandCounts.get(key)?.count || 0;
    // pull it out so the same brand doesn't also show up in the "all brands" tier below
    brandCounts.delete(key);

    const name = escapeHtml(brand.name);
    const link = document.createElement("a");
    link.href = `shop.html?brand=${encodeURIComponent(slugify(brand.name))}`;
    link.innerHTML = `
      <div class="brand-banner ${brand.dark ? "black-banner" : ""}" data-brand="${name}">
        <div class="card_text">
          <h2 class="${brand.dark ? "hdr-w-text" : ""}">${name}</h2>
          <p class="total-listings ${brand.dark ? "tl-d-text" : ""}">${count.toLocaleString()} listing${count === 1 ? "" : "s"}</p>
          <p class="card_note">${escapeHtml(brand.note)}</p>
        </div>
        <div class="banner-brand-logo">
          <img src="${brand.image}" alt="${name} Brand">
        </div>
      </div>
    `;
    grid.appendChild(link);
  });
}

function renderOtherBrands(section, grid, brandCounts) {
  const remaining = [...brandCounts.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name)
  );

  grid.innerHTML = "";

  if (remaining.length === 0) {
    section.style.display = "none";
    return;
  }

  remaining.forEach((brand) => {
    const name = escapeHtml(brand.name);
    const link = document.createElement("a");
    link.className = "brand-tile";
    link.href = `shop.html?brand=${encodeURIComponent(slugify(brand.name))}`;
    link.innerHTML = `
      <span class="brand-tile-name">${name}</span>
      <span class="brand-tile-count">${brand.count.toLocaleString()} listing${brand.count === 1 ? "" : "s"}</span>
    `;
    grid.appendChild(link);
  });
}

loadBrands();
