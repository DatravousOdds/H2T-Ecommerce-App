import { checkUserStatus } from "../../../auth/auth.js";
import { formatFirebaseDate } from "../../../core/global.js";
import {
  db,
  doc,
  getDoc,
  collection,
  getDocs
} from "../../../api/firebase-client.js";

const userData = await checkUserStatus();
console.log("dashboard:", userData);
async function loadOverviewTabInfo(userData) {
  if (!userData) return null;

  // create reference
  const data = userData.sellerOverview;

  // update UI display
  document.getElementById("total-revenue-value").textContent =
    data.totalRevenue;
  document.getElementById("active-listing-value").textContent =
    data.activeListing;
  document.getElementById("product-sold-value").textContent = data.productsSold;
  document.getElementById("active-listing-value").textContent =
    data.activeListing;
  document.getElementById("product-sold-value").textContent = data.productsSold;
  document.getElementById("selling-rate-value").textContent =
    userData.sellerOverview.sellerRating;

  loadProducts(userData);
}

loadOverviewTabInfo(userData);

async function loadProducts(userData) {
  if (!userData) {
    return null;
  }

  const productsCollectionRef = collection(
    db,
    "userProfiles",
    userData.email,
    "products"
  );

  const products = await getDocs(productsCollectionRef);

  // if there are products
  if (!products.empty) {
    const productsTable = document.querySelector(".products-table__body");

    productsTable.innerHTML = "";

    const productsArray = [];

    products.forEach((doc) => {
      productsArray.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // load all products
    productsArray.forEach((product) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
          <td>
              <div class="product-info">
                  <img
                  src=${product.images[0].url}
                  alt=${product.images[0].alt}
                  class="product-image"
                  />
                  <div class="product-details">
                  <p class="product-name">${product.productName}</p>
                  <p class="product-type">${product.subcategory}</p>
                  </div>
              </div>
          </td>
  
              <td>
                  <span class="listing-badge">${product.status}</span>
              </td>
  
              <td class="condition">${product.condition}</td>
              <td class="stock">${product.inventory.quantity}</td>
              <td class="sales-price">$${product.sellPrice}</td>
              <td class="trade-value">$${product.tradeValue}</td>
              <td class="sell-to-us-price">$${product.sellToUsValue}</td>
              <td
              <button class="action-button">
                  <svg
                  class="action-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                  </svg>
              </button>
              </td>
      `;

      productsTable.appendChild(tr);
    });

    const activeProducts = productsArray.filter(
      (product) => product.status === "active"
    );

    const forTradeProducts = productsArray.filter(
      (product) => product.trading === true
    );

    const pendingTrades = productsArray.filter(
      (product) => product.status === "pending" && product.trading === true
    );

    const totalProducts = products.size;

    if (activeProducts.length > 0) {
      const activeProductsTable = document.getElementById(
        "active-products-table"
      );

      activeProductsTable.innerHTML = "";

      activeProducts.forEach((product) => {
        const tr = document.createElement("tr");

        tr.className = "product-row";

        tr.innerHTML = `
                <td>
                                    <div class="product-info">
                                      <img
                                        src=${product.images.url}
                                        alt=${product.images.alt}
                                        class="product-image"
                                      />
                                      <div class="product-details">
                                        <p class="product-name">${
                                          product.productName
                                        }</p>
                                        <p class="product-sku">SKU: ${
                                          product.inventory.sku
                                        }</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <span class="category-badge">${
                                      product.category
                                    }</span>
                                  </td>
                                  <td>US ${product.size}</td>
                                  <td>
                                    <div class="condition-info">
                                      <span class="condition-badge new">${
                                        product.condition
                                      }</span>
                                      <span class="condition-note">${
                                        product.basicInfo.withBox === true
                                          ? "With box"
                                          : "No box"
                                      }</span>
                                    </div>
                                  </td>
                                  <td>
                                    <div class="stock-info">
                                      <span class="stock-number">${
                                        product.inventory.quantity
                                      }</span>
                                      <span class="stock-status in-stock"
                                        >${
                                          product.inventory.inStock === true
                                            ? "In Stock"
                                            : "Not in Stock"
                                        }</span
                                      >
                                    </div>
                                  </td>
                                  <td>$${product.compareAtPrice}</td>
                                  <td>
                                    <div class="price-info">
                                      <span class="current-price">$${
                                        product.sellPrice
                                      }</span>
                                      <span class="price-trend positive">+22%</span>
                                    </div>
                                  </td>
                                  <td>
                                    <div class="views-info">
                                      <span class="view-count">${
                                        product.analytics.views
                                      }</span>
                                      <span class="view-trend positive">↑12%</span>
                                    </div>
                                  </td>
                                  <td>
                                    <div class="listing-date">
                                      <span class="date">${formatFirebaseDate(
                                        product.listedDate
                                      )}</span>
                                      <span class="time-listed">14 days</span>
                                    </div>
                                  </td>
                                  <td>
                                    <div class="action-buttons">
                                      <button
                                        class="action-button edit"
                                        aria-label="Edit Listing"
                                      >
                                        <svg
                                          class="action-icon"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          stroke-width="2"
                                        >
                                          <path
                                            d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                                          ></path>
                                          <path
                                            d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                                          ></path>
                                        </svg>
                                      </button>
                                      <button
                                        class="action-button pause"
                                        aria-label="Pause Listing"
                                      >
                                        <svg
                                          class="action-icon"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          stroke-width="2"
                                        >
                                          <rect
                                            x="6"
                                            y="4"
                                            width="4"
                                            height="16"
                                          ></rect>
                                          <rect
                                            x="14"
                                            y="4"
                                            width="4"
                                            height="16"
                                          ></rect>
                                        </svg>
                                      </button>
                                      <button
                                        class="action-button promote"
                                        aria-label="Promote Listing"
                                      >
                                        <svg
                                          class="action-icon"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          stroke-width="2"
                                        >
                                          <polygon
                                            points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                                          ></polygon>
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
            `;

        activeProductsTable.append(tr);
      });
    } else {
      // display error message
      console.log("there are no current active products");
    }
  }
}
