
import { checkUserStatus } from '../auth/auth.js';
import { loadProducts, updateResultsCount, deleteMapEntry, colors, resetFilterUI, renderFilterTags } from '../core/global.js';
import { showLoader, hideLoader } from '../components/pageLoader.js';
import { initCartDrawer } from '../components/cartDrawer.js';

initCartDrawer();

const sortSelect = document.getElementById("sort-select");
const sortIcon = document.querySelector("#sort-btn i");
const sortOption = document.querySelectorAll("#sort-container .sort-content a");
const sortContainer = document.getElementById("sort-container");

const pageResults = document.getElementById("pageResults");

const filterSection = document.getElementById("filter-section");

const appliedFilters = document.getElementById("appliedFilters");
const filterDisplay = document.getElementById("filterDisplay");

const picker = document.getElementById("colorPicker");

const categoryFilter = document.querySelectorAll("#category-filter input[type='checkbox']");
const productsContainer = document.getElementById("productsContainer");
const loadMoreBtn = document.getElementById("loadMoreBtn");

const releasesProductTemplate = (data) => {
  const releaseDateMarkup = (data.releaseMonth && data.releaseDay)
    ? `<div class="release-month">${data.releaseMonth}</div>
       <div class="release-day">${data.releaseDay}</div>`
    : `<div class="release-coming-soon">Coming Soon</div>`;

  return `
  <!--- Image container-->
    <div class="product-image">
      <div class="release-date-wrapper">
        <i class="fa-regular fa-calendar"></i>
        ${releaseDateMarkup}
      </div>

      <img
        src="${data.images[0].url}"
        class="image-custom"
        alt=""
        loading="lazy"
      />
    </div>
    <!--- Image container-->

    <!-- product details -->
    <div class="des">
      <p class="product-name">
        ${data.productName}
      </p>
    </div>
    <!-- product details -->
`;
};



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

const displayProducts = (products, template) => {
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
    productElement.classList.add("pro", "pro-upcoming");
    productElement.innerHTML = template(productData);
    productsContainer.appendChild(productElement);
  });

  // update results count
  updateResultsCount(products.length);
}

// Mirrors releasesProductTemplate's shape (image + single name line, no
// price row) -- this page's card is shorter than the shared .pro card in
// global.js, so it gets its own skeleton instead of renderProductSkeletons.
const renderReleaseSkeletons = (count = 12) => {
  const productsContainer = document.getElementById("productsContainer");
  productsContainer.innerHTML = Array.from({ length: count }, () => `
    <div class="pro pro-upcoming skeleton-item">
      <div class="product-image">
        <div class="skeleton skeleton-image"></div>
      </div>
      <div class="des">
        <p class="product-name"><span class="skeleton skeleton-line medium"></span></p>
      </div>
    </div>
  `).join("");
};

// Only upcoming drops belong on the calendar -- once a release's date has
// passed it's just a normal listing now (visible on the regular shop pages
// via loadProducts()'s own releaseDate check), so it drops out of this view.
const isUpcoming = (docSnap) => docSnap.data().releaseDate.toDate() > new Date();
const bySoonestFirst = (a, b) => a.data().releaseDate.toDate() - b.data().releaseDate.toDate();

renderReleaseSkeletons();
let products = (await loadProducts("listingType", "release", state))
  .filter(isUpcoming)
  .sort(bySoonestFirst);
displayProducts(products, releasesProductTemplate);
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
    displayProducts(products, releasesProductTemplate)
    
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
    const newProducts = (await loadProducts("listingType", "release", state)).filter(isUpcoming);
    products = [...products, ...newProducts].sort(bySoonestFirst);
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
  if (!filters.size) return displayProducts(products, releasesProductTemplate)
  const filtered = products.filter(product => {
    const data = product.data();
    for (const [key, values] of filters) {
      if (key === "sort") continue;
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
  displayProducts(filtered, releasesProductTemplate)
};

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
  
  displayProducts(sortedProducts, releasesProductTemplate)

  
};

