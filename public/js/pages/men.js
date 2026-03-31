import { checkUserStatus } from '../auth/auth.js';
import { getStorage, ref, uploadString, getDownloadURL, deleteDoc, db, doc, app } from '../api/firebase-client.js';
import { collection, addDoc, getDocs, where, query } from '../api/firebase-client.js';

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



console.log("current user:", currentUser);

// toggles dropdown menu params: container, icon
const toggleDropdown = (container, icon) => {
  container.querySelector(".sort-content").classList.toggle("show");
  console.log(icon);
  icon.classList.toggle("rotate-down");
};

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



sortOption.forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    sortSelect.textContent = this.textContent;
  });
});

pgOption.forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    pgSelect.textContent = this.textContent;
  });
});

// update results count
const updateResultsCount = (count) => {
  if (count === 1) {
    pageResults.textContent = `${count} result`;
    return;
  }
  pageResults.textContent = `${count} results`;

};


// product filtering functions
const filterByPrice = (products, minPrice, maxPrice) => { 
  
}

/* Selected sort filter */
const selectedItem = (element) => {
  const items = document.querySelectorAll('.sort-content a');
  console.log(items);
  items.forEach(item => {
    item.classList.remove('selected');
});

  element.classList.add('selected');
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


  /* Load men's products from firebase and display on page */
const loadProducts = async () => {
  const productsContainer = document.getElementById("productsContainer");
  const productsCollection = collection(db, "listings");
  const q = query(productsCollection, where("status", "==", "active"));
  const querySnapshot = await getDocs(q);
  // filter products for men products
  const menProducts = querySnapshot.docs.filter(doc => doc.data().categoryMeta === "men");
  // clear existing products
  productsContainer.innerHTML = "";
  // display
  menProducts.forEach((doc) => {
    const productData = doc.data();
    const productElement = document.createElement("div");
    productElement.classList.add("pro");
    productElement.onclick = () => {
      window.location.href = `product.html?id=${doc.id}`;
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
                  <span>$${productData.originalPrice}</span>
                  <div class="price-change">
                    <div class="product-discount">
                      <p>20% OFF</p>
                    </div>
                    <div class="price-trend">
                      <i class="fa-solid fa-arrow-trend-up"></i>
                      <span>+5%</span>
                    </div>
                  </div>
                </div>

              </div>
              
            </div>
            <!-- product details -->
          
    `;
    productsContainer.appendChild(productElement);
  });
  // update results count
  updateResultsCount(menProducts.length);

  
};

loadProducts();