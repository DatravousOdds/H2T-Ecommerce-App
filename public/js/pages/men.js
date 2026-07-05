import { checkUserStatus } from '../auth/auth.js';
import { getStorage, ref, uploadString, getDownloadURL, deleteDoc, db, doc, app } from '../api/firebase-client.js';
import { collection, addDoc, getDocs, where, query, limit, startAfter } from '../api/firebase-client.js';
import { loadProducts, handleFavoriteClick, mensRange, renderProductSkeletons } from '../core/global.js';
import { showLoader, hideLoader } from '../components/pageLoader.js';
import { initCartDrawer } from '../components/cartDrawer.js';

initCartDrawer();

const currentUser = checkUserStatus();

// lets links like the product-page breadcrumb (?category=sneakers) land here pre-filtered
const params = new URLSearchParams(window.location.search);
const categoryParam = params.get("category");


const sortSelect = document.getElementById("sort-select");
const pgSelect = document.getElementById("pg-amount-select");
const sortIcon = document.querySelector("#sort-btn i");
const pgIcon = document.getElementById("pg-icon");
const pgContainer = document.getElementById("pg-container");
const sortOption = document.querySelectorAll("#sort-container .sort-content a");
const pgOption = document.querySelectorAll("#pg-container .sort-content a");
const sortContainer = document.getElementById("sort-container");
const pageResults = document.getElementById("pageResults");
const filterSection = document.getElementById("filter-section");
const appliedFilters = document.getElementById("appliedFilters");
const filterDisplay = document.getElementById("filterDisplay");
const picker = document.getElementById("colorPicker");
const sizePicker = document.getElementById("size-filter");
const categoryFilter = document.querySelectorAll("#category-filter input[type='checkbox']");
const paginationLinks = document.querySelectorAll(".pagination-link-container a");
const productsContainer = document.getElementById("productsContainer");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const brandFilterContainer = document.getElementById("brand-filter");
const brandLabels = new Map(); // normalized brand slug -> display name, for filter tags

// Popular picks always shown in the brand filter, even with 0 listings so far.
// Kept in sync with seller.js's BRAND_GROUPS -- same names, flattened.
const CURATED_BRANDS = [
  "Supreme", "Bape", "Palace", "Stüssy", "Off-White", "Fear of God", "Chrome Hearts", "Kith", "Vlone", "Essentials",
  "Nike", "Jordan", "Adidas", "New Balance", "Converse", "Vans", "Puma", "Reebok", "Asics", "Yeezy",
  "Carhartt", "Champion", "Polo Ralph Lauren", "Levi's", "The North Face", "Nautica",
];

// brand is free text, so there's no fixed casing/punctuation to match on.
// Mirrors brands.js's normalizeBrand() -- keep in sync if that one changes.
function normalizeBrand(brand) {
  return (brand || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

console.log("Pagination Links:", paginationLinks)


// reusable moving to global later
const colors = [
  { name: "Black",  value: "black",  hex: "#000000" },
  { name: "White",  value: "white",  hex: "#ffffff" },
  { name: "Multi",  value: "multi",  hex: "#46FE8C" },
  { name: "Blue",   value: "blue",   hex: "#657EEA" },
  { name: "Grey",   value: "grey",   hex: "#A1A5A4" },
  { name: "Red",    value: "red",    hex: "#C92E1A" },
  { name: "Yellow", value: "yellow", hex: "#F5BA19" },
  { name: "Brown",  value: "brown",  hex: "#593230" },
  { name: "Pink",   value: "pink",   hex: "#E8BFBA" },
  { name: "Purple", value: "purple", hex: "#504A9E" },
  { name: "Green",  value: "green",  hex: "#156340" },
  { name: "Orange", value: "orange", hex: "#F06142" },
];



const state = {
  lastVisible: null,
  filters: new Map(),
}


renderProductSkeletons("productsContainer");
let products =  await loadProducts("categoryMeta","men", state);

let filteredProducts = [...products];

if (categoryParam) {
  const matchingCheckbox = document.querySelector(`#category-filter input[value="${categoryParam}"]`);
  if (matchingCheckbox) {
    matchingCheckbox.checked = true;
    state.filters.set("category", [categoryParam]);
  }
}




filterDisplay.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-button');

  if (!btn) return;
  
  const datasetFilterTag = btn.dataset.filterTag;

  if(!datasetFilterTag) return;

  if (datasetFilterTag !== "clear-all") {
    deleteMapEntry(datasetFilterTag);
    resetFilterUI(datasetFilterTag);
    btn.remove();
    
    filterProducts(products,state.filters);
    if (state.filters.size === 0) filterDisplay.classList.remove("active");

  } else {
    const filterContainers = document.querySelectorAll(".filter-container");
    const colors = document.querySelectorAll('.color.active');
    
    colors.forEach(color => color.classList.remove('active'));
    
    filterContainers.forEach(container => {
      const input = container.querySelector("input[type='checkbox']:checked");

      if (input) {
        input.checked = false;
      } 

      if (container.classList.contains('show')) {
    
        container.classList.remove('show');
        
      }
    })
    appliedFilters.innerHTML = "";
    filterDisplay.classList.remove("active");
    state.filters = new Map();
    displayProducts(products)
    
  }

});

// Click handling (toggle active state, fire filter logic, etc.)
picker.addEventListener("click", e => {
  const btn = e.target.closest(".color");
  if (!btn) return;
  btn.classList.toggle("active");
  // // console.log("Filter by:", btn.dataset.color);

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

loadMoreBtn.addEventListener("click", async () => {
  loadMoreBtn.disabled = true;
  showLoader(productsContainer);

  try {
    const newProducts = await loadProducts("categoryMeta", "men", state);
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

// Close the dropdown menu if the user clicks outside of it
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

sortContainer.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleDropdown(sortContainer, sortIcon);
});

// listen for change on filters
filterSection.addEventListener("change", (event) => {
  const filterType = event.target.closest(".filter-container").dataset.filterType;

  if (!event.target.type === "checkbox") return;
  // append selected filters to active filters array
  if (event.target.checked) {
    if (filterType === "category") {
      state.filters.set("category", [event.target.value]);
    } else {
      // check if filter not already there 
      if(!state.filters.has(filterType)) state.filters.set(filterType, []);
      state.filters.get(filterType).push(event.target.value);
    }
  } else {
    const updated = (state.filters.get(filterType) || []).filter(f => f !== event.target.value);
    updated.length ? state.filters.set(filterType, updated) : state.filters.delete(filterType)
  }
  
  
  filterProducts(products, state.filters);
  renderFilterTags(state.filters);
  
  // console.log("active filters:",activeFilters)

});

categoryFilter.forEach((checkbox) => {
  // add event listener to each checkbox
  checkbox.addEventListener("change", (event) => {
    // active categories to only show currently selected category
    
    
    // uncheck all other checkboxes
    categoryFilter.forEach((cb) => {
      if (cb !== event.target) {
        cb.checked = false;
      }
    });


  });
});


function resetFilterUI(targetValue) {
  const sortOptions = document.querySelectorAll("#sort-container .sort-content a");
  
  sortOptions.forEach(option => {
    if (option.textContent === targetValue) {
      sortSelect.textContent = "Featured";
    }
  })


  const activeColor = document.querySelector(`#colorPicker .color[data-color="${targetValue}"]`);

  if (activeColor) {
    activeColor.classList.remove('active');
  }

  const checkedFilters = document.querySelectorAll('.filter-container input[type="checkbox"]:checked');

  if (!checkedFilters.length) return;

  const match = [...checkedFilters].find(f => f.value === targetValue);

  if (match) {
    match.checked = false;
  } else {
    return;
  }

  
};




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

mensRange.forEach((size) => {
  const wrapper = document.createElement("div");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "check";
  checkbox.id = `size-${size}`;
  checkbox.value = size;

  const label = document.createElement("label");
  label.setAttribute("for", `size-${size}`);
  label.textContent = size;

  wrapper.appendChild(checkbox);
  wrapper.appendChild(label);
  sizePicker.appendChild(wrapper);
});

loadBrandFilterOptions();

// fetches every active men's listing (not just the loaded/paginated page) so the
// brand filter reflects everything sellers have listed, not only what's on screen
async function loadBrandFilterOptions() {
  if (!brandFilterContainer) return;

  try {
    const q = query(
      collection(db, "listings"),
      where("status", "==", "active"),
      where("categoryMeta", "==", "men")
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

// shows the load more button only while Firestore has more pages left for the active category
const updateLoadMoreVisibility = () => {
  loadMoreBtn.style.display = state.hasMore ? "" : "none";
};
// toggles dropdown menu params: container, icon
const toggleDropdown = (container, icon) => {
  container.querySelector(".sort-content").classList.toggle("show");
  // console.log(icon);
  icon.classList.toggle("rotate-down");
};

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


// reusable function to render filter tags based on active filters, moves to global later
const renderFilterTags = (filterTagsArray) => {
  // if there is not active filters remove filterTags
  if (filterTagsArray.size === 0) {
    filterDisplay.classList.remove('active');
  } else {
    // show filterTags 
    filterDisplay.classList.add("active");
    appliedFilters.innerHTML = "";

    for (const [key, values] of filterTagsArray) {
      values.forEach(v => {
        const btn = document.createElement('button');
        btn.className = "filter-button";
        const label = key === "brand" ? (brandLabels.get(v) || v) : `${v.charAt(0).toUpperCase() + v.slice(1)}`;
        btn.innerText = `${label} `;
        btn.dataset.filterTag = v;

        const icon = document.createElement('i');
        icon.className = `fa-solid fa-circle-xmark`;

        btn.appendChild(icon);
        appliedFilters.appendChild(btn)
      })

    

    }


  }
};
// reusable function to delete map entry based on value, moves to global later
function deleteMapEntry(entry) {
  for (let [key, value] of state.filters.entries()) {
      const index = value.indexOf(entry);

      if (index !== -1) {
        value.splice(index, 1)
        if (value.length === 0) {
          state.filters.delete(key);
        }
        break;
      }
      
    }
}
// reusable function to update results count, moves to global later
const updateResultsCount = (count) => {
  if (count === 1) {
    pageResults.textContent = `${count} result`;
    return;
  }
  pageResults.textContent = `${count} results`;

};


// reusable function to filter products based on active filters, moves to global later
const filterProducts = (products, filters) => {
  if (!filters.size) return displayProducts(products)
  const filtered = products.filter(product => {
    const data = product.data();
    for (const [key, values] of filters) {
      if (key === "sort") continue;
      if (key === "brand") {
        if (!values.includes(normalizeBrand(data.brand))) return false;
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
  displayProducts(filtered)
};



// reusable function to sort products based on selection, moves to global later
const sortProducts = (sortType) => {
  if (!sortType) return;

  let sortedProducts = [...filteredProducts];

  console.log("Sorted Products:",sortedProducts)

  if (sortType === "Price: Low-High") {
    sortedProducts = sortedProducts.sort((a, b) => a.data().originalPrice - b.data().originalPrice);
  } else if (sortType === "Price: High-Low") {
    sortedProducts = sortedProducts.sort((a, b) => b.data().originalPrice - a.data().originalPrice);
  } else if (sortType === "Newest") {
    sortedProducts = sortedProducts.sort((a, b) => b.data().createdAt - a.data().createdAt);
  } else if (sortType === "Featured") {
    // TODO: Implement logic for featured
  }
  
  displayProducts(sortedProducts)

  
}

// reusable function to display products, moves to global later
const displayProducts = (products) => {
  const productsContainer = document.getElementById("productsContainer");
  // clear existing products
  productsContainer.innerHTML = "";
  // display
  if (products.length === 0) {
    // Invite the user to fill the gap instead of a dead-end message.
    // Reuses .chart-empty-state so this matches the price-history empty state on product.html.
    productsContainer.innerHTML = `
      <div class="chart-empty-state no-results-invite">
        <i class="fa-solid fa-box-open"></i>
        <h3>Nothing here yet</h3>
        <p>Be the first to list an item like this.</p>
        <a href="/seller" class="no-results-cta">List an item</a>
      </div>
    `;
    updateResultsCount(products.length);
    return;
  }
  products.forEach((doc) => {
    const productData = doc.data();
    const productElement = document.createElement("div");
    productElement.classList.add("pro");
    productElement.onclick = () => {
      window.location.href = `/shop/product.html?id=${doc.id}`;
    };
    productElement.innerHTML = `
      
            <!--- Image container-->
            <div class="product-image">
              <div class="liked">
                <i class="fa-regular fa-heart"></i>
              </div>

              <img
                src="${productData.images[0].url}"
                class="image-custom"
                alt="${productData.productName}"
              />
            </div>
            <!--- Image container-->

            <!-- product details -->
            <div class="des">
              <div class="price-description">
                <p class="product-name">
                  ${productData.productName}
                </p>
                
                <div class="pro-price">
                  <span class="listing-price">$${productData.listingPrice.toFixed(2)}</span>
                  <div class="price-change">
                    <div class="product-discount">
                      <p>20% OFF</p>
                    </div>
                    <div class="price-trend trend-up">
                      <i class="fa-solid fa-arrow-trend-up"></i>
                      <span>+5%</span>
                    </div>
                  </div>
                </div>

              </div>
              
            </div>
            <!-- product details -->
          
    `;

    handleFavoriteClick(productElement, doc.id, productData);
    
    productsContainer.appendChild(productElement);
  });

  // update results count
  updateResultsCount(products.length);
}
/** Filter by functions **/
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



filterProducts(products, state.filters);
renderFilterTags(state.filters);
updateLoadMoreVisibility();