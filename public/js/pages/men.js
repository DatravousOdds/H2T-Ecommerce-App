import { checkUserStatus } from '../auth/auth.js';
import { getStorage, ref, uploadString, getDownloadURL, deleteDoc, db, doc, app } from '../api/firebase-client.js';
import { collection, addDoc, getDocs, where, query, limit, startAfter } from '../api/firebase-client.js';
import { loadProducts, handleFavoriteClick, mensRange } from '../core/global.js';

const currentUser = checkUserStatus();


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

// const loadProducts = async (categoryMeta, state) => {
//   let q;
//   const productsCollection = collection(db, "listings");
//   const baseConstraints = [where("status", "==", "active"), where("categoryMeta", "==", `${categoryMeta}`)];
//   state.lastVisible ? baseConstraints.push(startAfter(state.lastVisible)) : null;
//   q = query(productsCollection, ...baseConstraints, limit(48));
  
//   // loop through active filters
//   let whereConstraints = [];
//   for (const [key, values] of state.filters) {
//     whereConstraints.push(where(key, "in", values));
//   }

//   const finalQuery = whereConstraints.length ? query(q, ...whereConstraints) : q;

//   const querySnapshot = await getDocs(finalQuery);

//   if (querySnapshot.empty) {
//     return [];
//   }
//   // filter products for men products
//   const menProducts = querySnapshot.docs;
//   state.lastVisible = menProducts[menProducts.length - 1];
//   console.log("Last Visible:", state.lastVisible);
//   return menProducts;
  
// };


// loadProducts("men", state.lastVisible);

const state = {
  lastVisible: null,
  filters: new Map(),
}


const products =  await loadProducts("categoryMeta","men", state);

let filteredProducts = [...products];




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
    productsContainer.innerHTML = `<div class="no-results">No results!</div>`
  }
  products.forEach((doc) => {
    const productData = doc.data();
    const productElement = document.createElement("div");
    productElement.classList.add("pro");
    productElement.onclick = () => {
      window.location.href = `shop/product.html?id=${doc.id}`;
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
                  <span class="listing-price">$${productData.originalPrice}</span>
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

    handleFavoriteClick(productElement);
    
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



displayProducts(products);