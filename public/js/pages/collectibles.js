
import { checkUserStatus } from '../auth/auth.js';
import { db, collection, getDocs, where, query } from '../api/firebase-client.js';
import { loadProducts, updateResultsCount, deleteMapEntry, colors, resetFilterUI, displayProducts, renderFilterTags, renderProductSkeletons, matchesPriceBuckets } from '../core/global.js';
import { showLoader, hideLoader } from '../components/pageLoader.js';
import { initCartDrawer } from '../components/cartDrawer.js';

initCartDrawer();

// Popular picks always shown in the brand filter, even with 0 listings so far.
// Kept in sync with seller.js's BRAND_GROUPS -- same names, flattened.
const CURATED_BRANDS = [
  "Supreme", "Bape", "Palace", "Stüssy", "Off-White", "Fear of God", "Chrome Hearts", "Kith", "Vlone", "Essentials",
  "Nike", "Jordan", "Adidas", "New Balance", "Converse", "Vans", "Puma", "Reebok", "Asics", "Yeezy",
  "Carhartt", "Champion", "Polo Ralph Lauren", "Levi's", "The North Face", "Nautica",
];

// brand is free text, so there's no fixed casing/punctuation to match on.
// Mirrors men.js's normalizeBrand() -- keep in sync if that one changes.
function normalizeBrand(brand) {
  return (brand || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

const sortSelect = document.getElementById("sort-select");
const sortIcon = document.querySelector("#sort-btn i");
const sortOption = document.querySelectorAll("#sort-container .sort-content a");
const sortContainer = document.getElementById("sort-container");

const pageResults = document.getElementById("pageResults");

const filterSection = document.getElementById("filter-section");

const appliedFilters = document.getElementById("appliedFilters");
const filterDisplay = document.getElementById("filterDisplay");

const picker = document.getElementById("colorPicker");

const productsContainer = document.getElementById("productsContainer");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const brandFilterContainer = document.getElementById("brand-filter");
const brandLabels = new Map(); // normalized brand slug -> display name, for filter tags

// fetches every active collectibles listing (not just the loaded/paginated page)
// so the brand filter reflects everything sellers have listed, not only what's on screen
async function loadBrandFilterOptions() {
  if (!brandFilterContainer) return;

  try {
    const q = query(
      collection(db, "listings"),
      where("status", "==", "active"),
      where("category", "==", "collectibles")
    );
    const snapshot = await getDocs(q);

    // normalizedBrand -> { name: first-seen casing, count }
    const brandCounts = new Map();
    snapshot.docs.forEach((doc) => {
      const rawBrand = (doc.data().brand || "").trim();
      const key = normalizeBrand(rawBrand);
      if (!key) return;

      if (!brandCounts.has(key)) brandCounts.set(key, { name: rawBrand, count: 0 });
      brandCounts.get(key).count += 1;
    });

    renderBrandFilterOptions(brandCounts);
  } catch (error) {
    console.error("Error loading brand filter options:", error);
  }
}

function renderBrandFilterOptions(brandCounts) {
  brandFilterContainer.innerHTML = "";

  const appendBrandCheckbox = (key, name, count) => {
    const wrapper = document.createElement("div");

    const checkbox = document.createElement("input");
    checkbox.name = "brand";
    checkbox.type = "checkbox";
    checkbox.className = "check";
    checkbox.id = `brand-${key}`;
    checkbox.value = key;

    const label = document.createElement("label");
    label.setAttribute("for", `brand-${key}`);
    label.textContent = count ? `${name} (${count})` : name;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    brandFilterContainer.appendChild(wrapper);

    // so applied-filter tags can show "New Balance" instead of the raw "newbalance" slug
    brandLabels.set(key, name);
  };

  CURATED_BRANDS.forEach((name) => {
    const key = normalizeBrand(name);
    const count = brandCounts.get(key)?.count || 0;
    brandCounts.delete(key);
    appendBrandCheckbox(key, name, count);
  });

  // Everything else sellers have actually listed under, most-listed first.
  [...brandCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[1].name.localeCompare(b[1].name))
    .forEach(([key, { name, count }]) => appendBrandCheckbox(key, name, count));
}

loadBrandFilterOptions();

document
  .querySelectorAll(".filter-option .expand-details")
  .forEach(function (expandDetails) {
    expandDetails.addEventListener("click", function () {
      let dropDownFilterOptions = this.nextElementSibling;
      if (dropDownFilterOptions) {
        dropDownFilterOptions.classList.toggle("show");
        let icon = this.querySelector("i");
        if (icon.classList.contains("fa-plus")) {
          icon.classList.remove("fa-plus");
          icon.classList.add("fa-minus"); // change to a minus icon
        } else {
          icon.classList.remove("fa-minus");
          icon.classList.add("fa-plus"); // change back to plus icon
        }
      }
    });
});

const currentUser = checkUserStatus();

const state = {
  lastVisible: null,
  filters: new Map(),
};

renderProductSkeletons("productsContainer");
let products = await loadProducts("category", "collectibles", state);
displayProducts(products, "productsContainer");
updateLoadMoreVisibility();

let filteredProducts = [...products];

window.onclick = (event) => {
  if (!event.target.matches(".dropdown-btn")) {
    let dropdowns = document.getElementsByClassName("sort-content");
    for (let i = 0; i < dropdowns.length; i++) {
      let openDropdown = dropdowns[i];

      if (openDropdown.classList.contains("show")) {
        openDropdown.classList.remove("show");
      }
    }
  }
};

filterDisplay.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-button');

  if (!btn) return;

  const datasetFilterTag = btn.dataset.filterTag;

  if(!datasetFilterTag) return;

  if (datasetFilterTag !== "clear-all") {
    deleteMapEntry(state.filters, datasetFilterTag);
    resetFilterUI(datasetFilterTag);
    btn.remove();

    filterProducts(products,state.filters);
    if (state.filters.size === 0) filterDisplay.classList.remove("active");

  } else {
    const filterContainers = document.querySelectorAll(".filter-container");
    const colors = document.querySelectorAll('.color.active');

    colors.forEach(color => color.classList.remove('active'));

    filterContainers.forEach(container => {
      const inputs = container.querySelectorAll("input[type='checkbox']:checked");

      inputs.forEach((input) => { input.checked = false; });

      if (container.classList.contains('show')) {

        container.classList.remove('show');

      }
    })
    appliedFilters.innerHTML = "";
    filterDisplay.classList.remove("active");
    state.filters = new Map();
    displayProducts(products, "productsContainer")

  }

});

picker.addEventListener("click", e => {
  const btn = e.target.closest(".color");
  if (!btn) return;
  btn.classList.toggle("active");

  const colors = state.filters.get("color") || [];
  const colorValue = btn.dataset.color;

  if(btn.classList.contains("active")) {
    state.filters.set("color", [...colors, colorValue])
  } else {
    const updated = colors.filter(f => f !== colorValue);
    updated.length ? state.filters.set("color", updated) : state.filters.delete("color");
  }



  filterProducts(products, state.filters);
  renderFilterTags(state.filters);


});

sortContainer.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleDropdown(sortContainer, sortIcon);
});

// unlike gendered category pickers, collectible types are multi-select --
// a buyer can browse trading cards and vinyl figures at the same time.
filterSection.addEventListener("change", (event) => {
  const filterType = event.target.closest(".filter-container").dataset.filterType;

  if (!event.target.type === "checkbox") return;
  // append selected filters to active filters array
  if (event.target.checked) {
    if(!state.filters.has(filterType)) state.filters.set(filterType, []);
    state.filters.get(filterType).push(event.target.value);
  } else {
    const updated = (state.filters.get(filterType) || []).filter(f => f !== event.target.value);
    updated.length ? state.filters.set(filterType, updated) : state.filters.delete(filterType)
  }


  filterProducts(products, state.filters);
  renderFilterTags(state.filters);

});

colors.forEach(({ name, value, hex }) => {
  const li = document.createElement("li");
  li.className = "color-wrapper";

  const btn = document.createElement("button");
  btn.className = "color";
  btn.dataset.color = value;
  btn.style.setProperty("--swatch", hex);
  btn.setAttribute("aria-label", name);
  // Special case: white needs a border so it's visible
  if (value === "white") btn.dataset.light = "true";

  li.appendChild(btn);
  picker.appendChild(li);
});

const toggleDropdown = (container, icon) => {
  container.querySelector(".sort-content").classList.toggle("show");
  icon.classList.toggle("rotate-down");
};

// shows the load more button only while Firestore has more pages left for the active category
function updateLoadMoreVisibility() {
  loadMoreBtn.style.display = state.hasMore ? "" : "none";
}

loadMoreBtn.addEventListener("click", async () => {
  loadMoreBtn.disabled = true;
  showLoader(productsContainer);

  try {
    const newProducts = await loadProducts("category", "collectibles", state);
    products = [...products, ...newProducts];
    filteredProducts = [...products];
    filterProducts(products, state.filters);
  } catch (error) {
    console.error("Error loading more products:", error);
  } finally {
    hideLoader(productsContainer);
    loadMoreBtn.disabled = false;
    updateLoadMoreVisibility();
  }
});

sortOption.forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();

    sortSelect.textContent = this.textContent;
    const sortSelection = sortSelect.textContent;

    state.filters.set("sort", [sortSelection]);

    sortProducts(sortSelection);

    renderFilterTags(state.filters);



  });
});


const filterProducts = (products, filters) => {
  if (!filters.size) return displayProducts(products, "productsContainer")
  const filtered = products.filter(product => {
    const data = product.data();
    for (const [key, values] of filters) {
      if (key === "sort") continue;
      if (key === "brand") {
        if (!values.includes(normalizeBrand(data.brand))) return false;
        continue;
      }
      if (key === "price") {
        if (!matchesPriceBuckets(data.listingPrice, values)) return false;
        continue;
      }
      if(!values.includes(data[key])) {
        return false;
      }
    }
    return true;
  });
  filteredProducts = filtered;

  console.log(filters)
  if (filters.has("sort")) {
    sortProducts(filters.get("sort")[0]);
    return;
  }
  displayProducts(filtered, "productsContainer")
};

const sortProducts = (sortType) => {
  if (!sortType) return;

  let sortedProducts = [...filteredProducts];

  console.log("Sorted Products:",sortedProducts)

  if (sortType === "Price: Low-High") {
    sortedProducts = sortedProducts.sort((a, b) => a.data().listingPrice - b.data().listingPrice);
  } else if (sortType === "Price: High-Low") {
    sortedProducts = sortedProducts.sort((a, b) => b.data().listingPrice - a.data().listingPrice);
  } else if (sortType === "Newest") {
    sortedProducts = sortedProducts.sort((a, b) => b.data().createdAt - a.data().createdAt);
  }
  // "Featured" falls through with no reordering -- see men.js for why that's
  // correct, not a stub.

  displayProducts(sortedProducts, "productsContainer")

};
