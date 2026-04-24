
import { checkUserStatus } from '../auth/auth.js';
import { loadProducts, updateResultsCount, deleteMapEntry, colors, resetFilterUI, displayProducts, renderFilterTags } from '../core/global.js';

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

const products =  await loadProducts("women", state);
displayProducts(products);

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
  if (!filters.size) return displayProducts(products)
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
  displayProducts(filtered)
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
  
  displayProducts(sortedProducts)

  
};



