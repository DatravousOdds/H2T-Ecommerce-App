import { checkUserStatus } from "../../../auth/auth.js";
import { formatFirebaseDate } from "../../../core/global.js";
import {
  db,
  doc,
  getDoc,
  collection,
  getDocs,
} from "../../../api/firebase-client.js";

const userData = await checkUserStatus();

const allProductsTableTemplate = (product) => `
          <td>
              <div class="product-info">
                  <img
                  src=${product.images[0].url}
                  alt=${product.images[0].alt}
                  class="product-image"
                  />
                  <div class="product-details">
                  <p class="product-name">${product.basicInfo.name}</p>
                  <p class="product-type">${product.basicInfo.category}</p>
                  </div>
              </div>
          </td>
  
              <td>
                  <span class="listing-badge">${product.status}</span>
              </td>
  
              <td class="condition">${product.basicInfo.condition}</td>
              <td class="stock">${product.inventory.quantity}</td>
              <td class="sales-price">$${product.pricing.sellPrice}</td>
              <td class="trade-value">$${product.pricing.tradeValue}</td>
              <td class="sell-to-us-price">$${product.pricing.sellToUsValue}</td>
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

const activeProductsTableTemplate = (product) => `
          <td>
            <div class="product-info">
              <img
                src=${product.images.url}
                alt=${product.images.alt}
                class="product-image"
              />
              <div class="product-details">
                <p class="product-name">${product.basicInfo.name}</p>
                <p class="product-sku">SKU: ${product.inventory.sku}</p>
              </div>
            </div>
          </td>
          <td>
            <span class="category-badge">${product.basicInfo.category}</span>
          </td>
          <td>US ${product.basicInfo.size}</td>
          <td>
            <div class="condition-info">
              <span class="condition-badge new">${
                product.basicInfo.condition
              }</span>
              <span class="condition-note">${
                product.basicInfo.withBox === true ? "With box" : "No box"
              }</span>
            </div>
          </td>
          <td>
            <div class="stock-info">
              <span class="stock-number">${product.inventory.quantity}</span>
              <span class="stock-status in-stock"
                >${
                  product.inventory.inStock === true
                    ? "In Stock"
                    : "Not in Stock"
                }</span
              >
            </div>
          </td>
          <td>$${product.pricing.retailPrice}</td>
          <td>
            <div class="price-info">
              <span class="current-price">$${product.pricing.sellPrice}</span>
              <span class="price-trend positive">+22%</span>
            </div>
          </td>
          <td>
            <div class="views-info">
              <span class="view-count">${product.analytics.views}</span>
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

const forTradeProductsTableTemplate = (product) => `
          <td>
            <div class="product-info">
              <img
                src=${product.images[0].url}
                alt=${product.images[0].alt}
                class="product-image"
              />
              <div class="product-details">
                <p class="product-name">${product.basicInfo.name}</p>
                <p class="product-type">${product.basicInfo.category}</p>
              </div>
            </div>
          </td>
          <td>${product.inventory.sku}</td>
          <td>
            <span class="status-badge in-stock">${
              product.inventory.inStock === true ? "In Stock" : "Not in stock"
            }</span>
          </td>
          <td>${product.basicInfo.condition}</td>
          <td>${product.inventory.quantity}</td>
          <td>$${product.compareAtPrice}</td>
          <td>$${product.sellPrice}</td>
          <td>${formatFirebaseDate(product.lastUpdated)}</td>
          <td>
            <button
              class="action-button"
              aria-label="More options"
            >
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

const sellToUsProductsTableTemplate = (product) => `
          <td>
            <div class="product-info">
              <img
                src=${product.images[0].url}
                alt=${product.images[0].alt}
                class="product-image"
              />
              <div class="product-details">
                <p class="product-name">
                  ${product.basicInfo.name}
                </p>
                <p class="product-type">${product.basicInfo.category}</p>
              </div>
            </div>
          </td>
          <td>${product.basicInfo.brand}</td>
          <td>$${product.pricing.marketValue}</td>
          <td>
            <span class="condition-badge excellent">9/10</span>
          </td>
          <td>$${product.pricing.offerPrice}</td>
          <td>$${product.pricing.tradeValue}</td>
          <td>
            <span class="demand-badge high">${product.demand}</span>
          </td>
          <td>
            <span class="status-badge ${product.sellBack.status}">${
  product.sellBack.status[0].toUpperCase() +
  product.sellBack.status.substring(1)
}</span>
          </td>
          <td>
            <div class="action-buttons">
              <button
                class="action-button primary"
                aria-label="Accept offer"
              >
                <svg
                  class="action-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
              <button
                class="action-button danger"
                aria-label="Reject offer"
              >
                <svg
                  class="action-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </td>
        
        `;

console.log("dashboard:", userData);

loadOverviewTabInfo(userData);

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

async function loadProducts(userData) {
  if (!userData) {
    return null;
  }

  try {
    const productsCollectionRef = collection(
      db,
      "userProfiles",
      userData.email,
      "products"
    );

    const products = await getDocs(productsCollectionRef);

    // if there are products
    if (!products.empty) {
      const productsArray = [];

      products.forEach((doc) => {
        productsArray.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      // load all products
      populateTable(
        productsArray,
        "all-products-table",
        allProductsTableTemplate
      );

      const activeProducts = productsArray.filter(
        (product) => product.status === "active"
      );

      const forTradeProducts = productsArray.filter(
        (product) => product.trading === true
      );

      const sellToUsProducts = productsArray.filter(
        (product) => product.sellBack.inProgress === true
      );

      const pendingTrades = productsArray.filter(
        (product) => product.status === "pending" && product.trading === true
      );

      const totalProducts = products.size;

      populateTable(
        activeProducts,
        "active-products-table",
        activeProductsTableTemplate
      );

      populateTable(
        forTradeProducts,
        "for-trade-products-table",
        forTradeProductsTableTemplate
      );

      populateTable(
        sellToUsProducts,
        "sell-to-us-products-table",
        sellToUsProductsTableTemplate
      );
    }
  } catch (error) {
    console.error("Error occurred when loading products: ", error);
  }
}

function populateTable(products, tabId, rowTemplate) {
  const table = document.getElementById(tabId);
  if (!table) return;

  table.innerHTML = "";

  if (products.length === 0) {
    console.log(`There is not products for ${table}`);
  }

  products.forEach((product) => {
    const tr = document.createElement("tr");
    tr.className = "product-row";
    tr.innerHTML = rowTemplate(product);
    table.appendChild(tr);
  });
}
