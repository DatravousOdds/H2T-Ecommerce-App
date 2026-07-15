
import { checkUserStatus } from '../auth/auth.js';
import { loadProducts, kidsRange, womenRange, mensRange, displayProducts, renderProductSkeletons } from '../core/global.js';
import { showLoader, hideLoader } from '../components/pageLoader.js';
import { db, collection, where, query, getDocs, limit, startAfter, orderBy } from '../api/firebase-client.js';


const params = new URLSearchParams(window.location.search);
const categoryParam = params.get("category");
const brandParam = params.get("brand");
const activeFilter = categoryParam || brandParam;
// brand is free text (seller.js saves whatever was typed, no fixed casing),
// so it can't go through loadProducts()'s where(field, "==", value) equality
// query the way category can -- it needs its own client-side-matched loader,
// same reasoning as loadBrandFilteredProducts() below.
const isBrandFilter = !categoryParam && !!brandParam;
// "Under $X" homepage cards link here with ?maxPrice=X instead of a
// category/brand -- it's a range query, not an equality one, so it can't
// go through loadProducts() and gets its own query function below.
const maxPrice = params.has("maxPrice") ? parseFloat(params.get("maxPrice")) : null;
// Home page's "Just Dropped" / "Below Retail Prices" Shop Now links land
// here with these instead of a category/brand -- same reasoning as maxPrice.
const isNewestFilter = params.get("sort") === "newest";
const isOnSaleFilter = params.get("onSale") === "true";
console.log(activeFilter)




const state = {
  lastVisible: null,
  filters: new Map(),
};
renderProductSkeletons("productsContainer");
let products = maxPrice
  ? await loadPriceFilteredProducts(maxPrice, state)
  : isBrandFilter
  ? await loadBrandFilteredProducts(activeFilter, state)
  : isOnSaleFilter
  ? await loadOnSaleProducts(state)
  : isNewestFilter
  ? await loadNewestProducts(state)
  : await loadProducts("category", `${activeFilter}`, state);

const pageHeader = document.getElementById("page-header");
const breadcrumbs = document.querySelector(".breadcrumbs");
const currentUser = checkUserStatus();
const sortSelect = document.getElementById("sort-select");
const sortIcon = document.querySelector("#sort-btn i");
const sortOption = document.querySelectorAll("#sort-container .sort-content a");
const sortContainer = document.getElementById("sort-container");
const pageResults = document.getElementById("pageResults");
const filterSection = document.getElementById("filter-section");
const appliedFilters = document.getElementById("appliedFilters");
const filterDisplay = document.getElementById("filterDisplay");
const picker = document.getElementById("colorPicker");
const menSizePicker = document.getElementById("men-size-filter");
const womenSizePicker = document.getElementById("women-size-filter");
const kidSizePicker = document.getElementById("kid-size-filter");
const categoryFilter = document.querySelectorAll("#category-filter input[type='checkbox']");
const productsContainer = document.getElementById("productsContainer");
const loadMoreBtn = document.getElementById("loadMoreBtn");
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

let filteredProducts = [...products];


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
    displayProducts(products, "productsContainer");
    
  }

});

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
    const newProducts = maxPrice
      ? await loadPriceFilteredProducts(maxPrice, state)
      : isBrandFilter
      ? await loadBrandFilteredProducts(activeFilter, state)
      : isOnSaleFilter
      ? await loadOnSaleProducts(state)
      : isNewestFilter
      ? await loadNewestProducts(state)
      : await loadProducts("category", activeFilter, state);
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

// renders one size group's checkboxes; ids are namespaced per group since
// mensRange/womenRange/kidsRange overlap (e.g. both include size 9), and
// shop.html shows all three groups on one page unlike mens.html/women.html
const renderSizeOptions = (container, range, group) => {
  range.forEach((size) => {
    const wrapper = document.createElement("div");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "check";
    checkbox.id = `size-${group}-${size}`;
    checkbox.value = size;

    const label = document.createElement("label");
    label.setAttribute("for", `size-${group}-${size}`);
    label.textContent = size;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    container.appendChild(wrapper);
  });
};

renderSizeOptions(menSizePicker, mensRange, "men");
renderSizeOptions(womenSizePicker, womenRange, "women");
renderSizeOptions(kidSizePicker, kidsRange, "kid");

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
        btn.innerText = `${v.charAt(0).toUpperCase() + v.slice(1)} `;
        btn.dataset.filterTag = v;

        const icon = document.createElement('i');
        icon.className = `fa-solid fa-circle-xmark`;

        btn.appendChild(icon);
        appliedFilters.appendChild(btn)
      })

    

    }


  }
};
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
  if (!filters.size) return displayProducts(products, "productsContainer");
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
  displayProducts(filtered, "productsContainer")
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
  
  displayProducts(sortedProducts, "productsContainer")

  
}
function setCateogryFilter() {
    const input = document.querySelectorAll(`#category-filter div #${activeFilter}`);
    input.checked = true;
};

function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
}

function setHeader() {
    // brand values in the URL are slugs (e.g. "chrome-hearts"); category
    // values are already plain words, so only brand needs de-slugging for display.
    // Either way this came straight from the query string, so it's escaped
    // before going into innerHTML below.
    const rawLabel = isBrandFilter
        ? activeFilter.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
        : activeFilter;
    const displayLabel = escapeHtml(rawLabel);

    pageHeader.innerHTML = "";
    pageHeader.innerHTML = `
    <h2>${displayLabel}</h2>

    <p>
        Buy Item any of our newly listed item, or find something that fits your
        budget. All our items are guarantee authenticate here are Head-To-Toe!
    </p>

    `;

    breadcrumbs.innerHTML = "";
    breadcrumbs.innerHTML = `
        <ol class="breadcrumbs-routes">
            <li><a href="/">Home</a></li>
            <li><span>></span></li>
            <li id="curr-page" class="curr-pg">${displayLabel}</li>
        </ol>
    `;
};

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

function setState() {
    // No category/brand in the URL (the plain "browse everything" page) --
    // nothing to seed into the checkbox filter state.
    if (!activeFilter) return;

    let value = activeFilter.toString();
    state.filters.set("category", [value]);
};

// Mirrors loadProducts()'s pagination shape (lastVisible/hasMore/limit 48)
// so the same loadMoreBtn handler works for both, but queries on
// originalPrice < maxPrice instead of an equality field -- Firestore
// doesn't let a single query mix that range filter through loadProducts()'s
// generic where(field, "==", value) signature.
async function loadPriceFilteredProducts(maxPrice, state) {
    const productsCollection = collection(db, "listings");
    const constraints = [
        where("status", "==", "active"),
        where("originalPrice", "<", maxPrice),
    ];
    if (state.lastVisible) constraints.push(startAfter(state.lastVisible));

    const q = query(productsCollection, ...constraints, limit(48));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        state.hasMore = false;
        return [];
    }

    const docs = querySnapshot.docs;
    state.lastVisible = docs[docs.length - 1];
    state.hasMore = docs.length === 48;
    return docs;
}

// Mirrors loadPriceFilteredProducts()'s pagination shape but orders by
// createdAt instead -- "Just Dropped" isn't a range on a fixed threshold,
// it's a sort, so it gets its own query rather than reusing loadProducts().
async function loadNewestProducts(state) {
    const productsCollection = collection(db, "listings");
    const constraints = [where("status", "==", "active"), orderBy("createdAt", "desc")];
    if (state.lastVisible) constraints.push(startAfter(state.lastVisible));

    const q = query(productsCollection, ...constraints, limit(48));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        state.hasMore = false;
        return [];
    }

    const docs = querySnapshot.docs;
    state.lastVisible = docs[docs.length - 1];
    state.hasMore = docs.length === 48;
    return docs;
}

// Mirrors loadBrandFilteredProducts()'s pagination shape -- "on sale" isn't
// a stored field (it's derived from listingPrice vs. originalPrice), so it
// gets matched client-side the same way brand does.
async function loadOnSaleProducts(state) {
    const productsCollection = collection(db, "listings");
    const constraints = [where("status", "==", "active")];
    if (state.lastVisible) constraints.push(startAfter(state.lastVisible));

    const q = query(productsCollection, ...constraints, limit(48));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        state.hasMore = false;
        return [];
    }

    const docs = querySnapshot.docs;
    state.lastVisible = docs[docs.length - 1];
    state.hasMore = docs.length === 48;

    return docs.filter((doc) => doc.data().listingPrice < doc.data().originalPrice);
}

// Mirrors men.js's normalizeBrand() -- brand is free text with no fixed
// casing/punctuation, so this is how brand values get compared everywhere.
function normalizeBrand(brand) {
    return (brand || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Same shape as loadPriceFilteredProducts() above: brand can't be matched
// with a Firestore where(field, "==", value) equality query since sellers
// type it free-form, so this pages through active listings and matches
// brand client-side instead. Like the price filter, this means a given
// Firestore page (48 docs) can come back with zero matches for the target
// brand even though more matches exist further in -- hasMore still reflects
// whether Firestore has more pages, not whether more matches are in them.
async function loadBrandFilteredProducts(brandSlug, state) {
    const productsCollection = collection(db, "listings");
    const constraints = [where("status", "==", "active")];
    if (state.lastVisible) constraints.push(startAfter(state.lastVisible));

    const q = query(productsCollection, ...constraints, limit(48));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        state.hasMore = false;
        return [];
    }

    const docs = querySnapshot.docs;
    state.lastVisible = docs[docs.length - 1];
    state.hasMore = docs.length === 48;

    const targetBrand = normalizeBrand(brandSlug);
    return docs.filter((doc) => normalizeBrand(doc.data().brand) === targetBrand);
}

function setPriceHeader(maxPrice) {
    pageHeader.innerHTML = "";
    pageHeader.innerHTML = `
    <h2>Under $${maxPrice}</h2>

    <p>
        Buy Item any of our newly listed item, or find something that fits your
        budget. All our items are guarantee authenticate here are Head-To-Toe!
    </p>

    `;

    breadcrumbs.innerHTML = "";
    breadcrumbs.innerHTML = `
        <ol class="breadcrumbs-routes">
            <li><a href="/">Home</a></li>
            <li><span>></span></li>
            <li id="curr-page" class="curr-pg">Under $${maxPrice}</li>
        </ol>
    `;
};

function setNewestHeader() {
    pageHeader.innerHTML = "";
    pageHeader.innerHTML = `
    <h2>Just Dropped</h2>

    <p>
        The newest listings on Head-To-Toe, freshest drops first.
    </p>

    `;

    breadcrumbs.innerHTML = "";
    breadcrumbs.innerHTML = `
        <ol class="breadcrumbs-routes">
            <li><a href="/">Home</a></li>
            <li><span>></span></li>
            <li id="curr-page" class="curr-pg">Just Dropped</li>
        </ol>
    `;
};

function setOnSaleHeader() {
    pageHeader.innerHTML = "";
    pageHeader.innerHTML = `
    <h2>Below Retail Prices</h2>

    <p>
        Listings currently priced below their original retail price.
    </p>

    `;

    breadcrumbs.innerHTML = "";
    breadcrumbs.innerHTML = `
        <ol class="breadcrumbs-routes">
            <li><a href="/">Home</a></li>
            <li><span>></span></li>
            <li id="curr-page" class="curr-pg">Below Retail Prices</li>
        </ol>
    `;
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
};


if (maxPrice) {
    setPriceHeader(maxPrice);
} else if (isOnSaleFilter) {
    setOnSaleHeader();
} else if (isNewestFilter) {
    setNewestHeader();
} else {
    setHeader();
    // setState()/setCateogryFilter() seed and check the *category* checkbox
    // filter -- meaningless (and actively wrong) for a brand slug like
    // "chrome-hearts", so brand-filtered products already came back
    // pre-matched from loadBrandFilteredProducts() and skip both.
    if (!isBrandFilter) {
        setState();
        setCateogryFilter();
    }
}
displayProducts(products, "productsContainer");
updateLoadMoreVisibility();