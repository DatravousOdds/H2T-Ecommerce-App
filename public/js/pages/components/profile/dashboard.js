import { checkUserStatus } from "../../../auth/auth.js";
import { formatFirebaseDate } from "../../../core/global.js";
import {
  db,
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "../../../api/firebase-client.js";

const userData = await checkUserStatus();

const daftProductsTableTemplate = (product) => `<td>
                            <div class="product-info">
                              <div class="product-image-container">
                                <img
                                  src=${product.images[0].url}
                                  alt=${product.images[0].alt}
                                  class="product-image"
                                />
                                <span class="draft-badge">Draft</span>
                              </div>
                              <div class="product-details">
                                <p class="product-name">${
                                  product.basicInfo.name
                                }</p>
                                <p class="product-id">ID: #${
                                  product.draftId
                                }</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div class="completion-info">
                              <div class="progress-bar">
                                <div class="progress" style="width: ${
                                  product.completionProgress
                                }%"></div>
                              </div>
                              <span class="completion-text">${
                                product.completionProgress
                              }% Complete</span>
                            </div>
                          </td>
                          <td>
                            <div class="missing-info">
                              <ul class="missing-list">
                                <li class="missing-item">
                                  <svg
                                    class="missing-icon"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    width="12"
                                    height="12"
                                  >
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line
                                      x1="12"
                                      y1="16"
                                      x2="12"
                                      y2="16"
                                    ></line>
                                  </svg>
                                  ${product.missingInfo[0]}
                                </li>
                                <li class="missing-item">
                                  <svg
                                    class="missing-icon"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    width="12"
                                    height="12"
                                  >
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line
                                      x1="12"
                                      y1="16"
                                      x2="12"
                                      y2="16"
                                    ></line>
                                  </svg>
                                  ${product.missingInfo[1]}
                                </li>
                              </ul>
                            </div>
                          </td>
                          <td>
                            <div class="date-info">
                              <span class="date">${formatFirebaseDate(
                                product.createAt
                              )}</span>
                              <span class="time">2:30 PM</span>
                            </div>
                          </td>
                          <td>
                            <div class="date-info">
                              <span class="date">${formatFirebaseDate(
                                product.lastEdited
                              )}</span>
                              <span class="time">4:45 PM</span>
                            </div>
                          </td>
                          <td>
                            <div class="category-info">
                              <span class="category-badge">${
                                product.basicInfo.category
                              }</span>
                              <span class="sub-category">${
                                product.basicInfo.subcategory
                              }</span>
                            </div>
                          </td>
                          <td>
                            <div class="price-info">
                              <span class="draft-price">$${product.price}</span>
                            </div>
                          </td>
                          <td>
                            <div class="action-buttons">
                              <button
                                class="action-button edit"
                                aria-label="Edit Draft"
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
                                class="action-button publish"
                                aria-label="Publish Draft"
                              >
                                <svg
                                  class="action-icon"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2"
                                >
                                  <path d="M12 20V10"></path>
                                  <path d="M18 14l-6-6-6 6"></path>
                                </svg>
                              </button>
                              <button
                                class="action-button delete"
                                aria-label="Delete Draft"
                              >
                                <svg
                                  class="action-icon"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2"
                                >
                                  <path d="M3 6h18"></path>
                                  <path
                                    d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                                  ></path>
                                </svg>
                              </button>
                            </div>
                          </td>`;

const outOfStockProductsTemplate = (product) => `<td>
                            <div class="product-info">ORD-2024-1234</div>
                          </td>
                          <td>
                            <div class="category-info">
                              <span class="category-badge">${product.basicInfo.category}</span>
                              <span class="sub-category">${product.basicInfo.subcategory}</span>
                            </div>
                          </td>
                          <td>
                            <div class="stock-date">
                              <span class="date">${product.analytics.listedDate}</span>
                              <span class="time-ago">7 days ago</span>
                            </div>
                          </td>
                          <td>
                            <div class="price-info">
                              <span class="last-price">$${product.pricing.lastRetailPrice}</span>
                              <span class="price-note">${product.pricing.notes}</span>
                            </div>
                          </td>
                          <td>
                            <div class="demand-info">
                              <span class="demand-badge high">${product.demand.level}</span>
                              <div class="demand-trend">
                                <span class="trend-arrow ${product.demand.trend}">↑</span>
                                <span class="trend-value">${product.demand.percentageChange}%</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div class="waitlist-info">
                              <span class="waitlist-count">${product.waitlist.count}</span>
                              <span class="waitlist-label">people waiting</span>
                            </div>
                          </td>
                          <td>
                            <div class="notification-info">
                              <span class="notification-count">${product.waitlist.subscribers}</span>
                              <span class="notification-status"
                                >Subscribed</span
                              >
                            </div>
                          </td>
                          <td>
                            <div class="supplier-info">
                              <span class="supplier-name">${product.supplier.name}</span>
                              <span class="restock-estimate"
                                >Expected: ${product.supplier.expectedRestock}</span
                              >
                            </div>
                          </td>
                          <td>
                            <div class="action-buttons">
                              <button
                                class="action-button restock"
                                aria-label="Restock Product"
                              >
                                <svg
                                  class="action-icon"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2"
                                >
                                  <path d="M3 3v18h18"></path>
                                  <path d="M18.4 8.64L18.4 15.36"></path>
                                  <path d="M13.6 10.72L13.6 15.36"></path>
                                  <path d="M8.8 12.8L8.8 15.36"></path>
                                </svg>
                              </button>
                              <button
                                class="action-button notify"
                                aria-label="Send Notifications"
                              >
                                <svg
                                  class="action-icon"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2"
                                >
                                  <path
                                    d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                                  ></path>
                                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                </svg>
                              </button>
                              <button
                                class="action-button archive"
                                aria-label="Archive Product"
                              >
                                <svg
                                  class="action-icon"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2"
                                >
                                  <path d="M21 8v13H3V8"></path>
                                  <path d="M1 3h22v5H1z"></path>
                                  <path d="M10 12h4"></path>
                                </svg>
                              </button>
                            </div>
                          </td>`;

const pendingTradesProductsTableTemplate = (product) => `<td>
                            <div class="trade-items" id="trading-items" >
                              <div class="product-info">
                                <img
                                  src=${product.tradingItems[0].imageUrl}
                                  alt=${product.tradingItems[0].name}
                                  class="product-image"
                                />
                                <div class="product-details">
                                  <p class="product-name">${
                                    product.tradingItems[0].name
                                  }</p>
                                  <p class="product-condition">
                                    Condition: ${
                                      product.tradingItems[0].condition
                                    }
                                  </p>
                                </div>
                              </div>
                              <div class="additional-items">+2 more items</div>
                            </div>
                          </td>
                          <td class="trading-value">$${
                            product.tradingItems[0].value
                          }</td>
                          <td>
                            <div class="trade-items" id="requestingItems">
                              <div class="product-info">
                                <img
                                  src=${product.requestingItems[0].imageUrl}
                                  alt=${product.requestingItems[0].name}
                                  class="product-image"
                                />
                                <div class="product-details">
                                  <p class="product-name">${
                                    product.requestingItems[0].name
                                  }</p>
                                  <p class="product-condition">
                                    Condition: ${
                                      product.requestingItems[0].condition
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>$${product.requestingItems[0].value}</td>
                          <td>
                            <div class="balance-due positive">
                              +$${product.tradeBalance.toFixed(2)}
                              <span class="balance-label">Store Credit</span>
                            </div>
                          </td>
                          <td>
                            <div class="submission-info">
                              <span class="date">${formatFirebaseDate(
                                product.submitted
                              )}</span>
                              <span class="time">14:30</span>
                            </div>
                          </td>
                          <td>
                            <span class="status-badge pending"
                              >${
                                product.status[0].toUpperCase() +
                                product.status.substring(1)
                              }</span
                            >
                          </td>
                          <td>
                            <div class="action-buttons">
                              <button
                                class="action-button view"
                                aria-label="View Details"
                              >
                                <svg
                                  class="action-icon"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2"
                                >
                                  <path
                                    d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                                  ></path>
                                  <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                              </button>
                              <button
                                class="action-button message"
                                aria-label="Message Customer"
                              >
                                <svg
                                  class="action-icon"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2"
                                >
                                  <path
                                    d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                                  ></path>
                                </svg>
                              </button>
                              <button
                                class="action-button approve"
                                aria-label="Approve Trade"
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
                            </div>
                          </td>`;

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
              <td>
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
                src=${product.images[0].url}
                alt=${product.images[0].alt}
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
                product.analytics.listedDate
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
          <td>$${product.pricing.retailPrice}</td>
          <td>$${product.pricing.sellPrice}</td>
          <td>${formatFirebaseDate(product.analytics.lastUpdated)}</td>
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
            <span class="demand-badge high">${product.demand.level}</span>
          </td>
          <td>
            <span class="status-badge ${
              product.sellBack.inProgress === true ? "processing" : "completed"
            }">${
  product.sellBack.inProgress === true ? "Processing" : "Completed"
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

const ordersTableTemplate = (product) => `
<td>
  <div class="product-info">
    <div class="product-details">
      <p class="product-id">Order: #${product.orderNumber}</p>
    </div>
  </div>
</td>
<td>
  <div class="date-info">
    <span class="date">${formatFirebaseDate(product.createAt)}</span>
  </div>
</td>
<td>
  <div class="customer-info">
    <span class="customer-name">${product.customerId}</span>
  </div>
</td>
<td>
  <div class="items-info">
    <span class="items">${product.items.length}</span>
  </div>
</td>
<td>
  <div class="total-info">
    <span class="total">$159.99</span>
  </div>
</td>
<td>
  <div class="status-info">
    <span class="status-badge pending">Pending</span>
  </div>
</td>
<td>
  <div class="payment-info">
    <span class="payment-method">Credit Card</span>
    <span class="payment-status">Not Paid</span>
  </div>
</td>
<td>
  <div class="action-buttons">
    <button class="action-button view">
      View Details
    </button>
  </div>
</td>`;

// console.log("dashboard:", userData);

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

    const tradesCollectionRef = collection(
      db,
      "userProfiles",
      userData.email,
      "trades"
    );

    const productDrafts = collection(
      db,
      "userProfiles",
      userData.email,
      "productDrafts"
    );

    const tradesQuery = query(
      tradesCollectionRef,
      where("tradingUserId", "==", userData.email)
    );

    // call both promises
    const [productsSnapshot, tradesSnapshot, productDraftsSnapshot] =
      await Promise.all([
        getDocs(productsCollectionRef),
        getDocs(tradesQuery),
        getDocs(productDrafts),
      ]);

    const tradesArray = [];
    tradesSnapshot.forEach((trade) => {
      tradesArray.push({
        id: trade.id,
        ...trade.data(),
      });
    });

    const productsArray = [];
    productsSnapshot.forEach((doc) => {
      productsArray.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    const productDraftsArray = [];
    productDraftsSnapshot.forEach((doc) => {
      productDraftsArray.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    const activeProducts = productsArray.filter(
      (product) => product.status === "active"
    );

    const forTradeProducts = productsArray.filter(
      (product) => product.trading === true
    );

    const sellToUsProducts = productsArray.filter(
      (product) => product.sellBack.inProgress === true
    );

    const outOfStockProducts = productsArray.filter(
      (product) => product.status === "out_of_stock"
    );

    const activeListing = activeProducts.length;

    const sellToUsRequests = sellToUsProducts.length;

    const totalSales = 0;
    // load all products
    populateTable(
      productDraftsArray,
      "draft-products-table",
      daftProductsTableTemplate
    );

    populateTable(
      outOfStockProducts,
      "out-of-stock-products-table",
      outOfStockProductsTemplate
    );

    populateTable(
      productsArray,
      "all-products-table",
      allProductsTableTemplate
    );

    populateTable(
      tradesArray,
      "pending-trades-products-table",
      pendingTradesProductsTableTemplate
    );

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
  } catch (error) {
    console.error("Error occurred when loading products: ", error);
  }
}

const filters = {
  productFilters: [], // only allowed filter at time
  brandFilters: [], // multiple filters
  priceRangeFilters: [], // multiple filters
  listingTypeFilters: [], // multiple filters
};
const filterSectionsInputs = document.querySelectorAll(
  ".filter-section .filter-group input"
);
const clearAllFiltersBtn = document.querySelector(".filter-actions .secondary");
const applyFilters = document.querySelector(".filter-actions .primary");

// Event Listeners
filterSectionsInputs.forEach((input) => {
  input.addEventListener("click", () => {
    const id = input.id;
    const label = document
      .querySelector(`label[for="${id}"]`)
      .textContent.trim();
    if (input.checked) {
      if (id.startsWith("product-")) {
        // for single selection replace existing value;
        filters.productFilters = [label];
        // Uncheck other input boxes
        filterSectionsInputs.forEach((otherInput) => {
          if (otherInput.id.startsWith("product-") && otherInput !== input) {
            otherInput.checked = false;
          }
        });
      } else if (id.startsWith("brand-")) {
        filters.brandFilters.push(label);
      } else if (id.startsWith("price-")) {
        filters.priceRangeFilters.push(label);
      } else if (id.startsWith("listType-")) {
        filters.listingTypeFilters.push(label);
      }
    } else {
      // when boxes are unchecked
      if (id.startsWith("product-")) {
        filters.productFilters = filters.productFilters.filter(
          (item) => item !== label
        );
      } else if (id.startsWith("brand-")) {
        filters.brandFilters = filters.brandFilters.filter(
          (item) => item !== label
        );
      } else if (id.startsWith("price-")) {
        filters.priceRangeFilters = filters.priceRangeFilters.filter(
          (item) => item !== label
        );
      } else if (id.startsWith("listType-")) {
        filters.listingTypeFilters = filters.listingTypeFilters.filter(
          (item) => item !== label
        );
      }
    }
    console.log("product array", filters);
  });
});

clearAllFiltersBtn.addEventListener("click", () => {
  clearFilter(filterSectionsInputs, filters);

  console.log("product array", filters);
});

applyFilters.addEventListener("click", async function () {
  // Array to contains all item
  const filteredProducts = [];

  // Create reference
  const productsCollectionRef = collection(
    db,
    "userProfiles",
    userData.email,
    "products"
  );

  // if filter has item, then filter
  if (filters.productFilters.length > 0) {
    filteredProducts.push(
      where("basicInfo.productType", "==", filters.productFilters[0])
    );
  }

  if (filters.brandFilters.length > 0) {
    filteredProducts.push(where("basicInfo.brand", "in", filters.brandFilters)); // Use "in", keyword because array has mulitple values
  }

  if (filters.priceRangeFilters.length > 0) {
    let maxPrice = 0;
    let minPrice = Number.MAX_SAFE_INTEGER;
    // check ranges
    if (filters.priceRangeFilters.includes("$25-$50")) {
      minPrice = Math.min(minPrice, 25);
      maxPrice = Math.max(maxPrice, 50);
    }

    if (filters.priceRangeFilters.includes("$50-$100")) {
      minPrice = Math.min(minPrice, 50);
      maxPrice = Math.max(maxPrice, 100);
    }

    if (filters.priceRangeFilters.includes("$100-$150")) {
      minPrice = Math.min(minPrice, 100);
      maxPrice = Math.max(maxPrice, 150);
    }

    if (filters.priceRangeFilters.includes("Over $150")) {
      minPrice = Math.min(minPrice, 150);
      maxPrice = Number.MAX_SAFE_INTEGER;
    }

    console.log("min", minPrice);
    console.log("max", maxPrice);

    filteredProducts.push(where("pricing.sellPrice", "<=", maxPrice));
    filteredProducts.push(where("pricing.sellPrice", ">=", minPrice));
  }

  if (filters.listingTypeFilters.length > 0) {
    filteredProducts.push(where("status", "in", filters.listingTypeFilters));
  }

  // build query
  const filterQuery = query(
    productsCollectionRef,
    ...filteredProducts,
    orderBy("analytics.createdAt", "desc")
  );

  const filterSnapshot = await getDocs(filterQuery);

  console.log("filterSnapshot: ", filterSnapshot);

  const products = [];
  filterSnapshot.forEach((doc) => {
    products.push({
      id: doc.id,
      ...doc.data(),
    });
  });

  // populate the table
  populateTable(products, "all-products-table", allProductsTableTemplate);

  console.log("filter products: ", products);
});

// Search bar functionality
const search = document.getElementById("product-search");

// Event Listeners
search.addEventListener("input", async (e) => {
  const input = e.target.value; // take in user input value
  const inputString = input.toLowerCase();
  // Check the first letter of input string
  try {
    const productsCollectionRef = collection(
      db,
      "userProfiles",
      userData.email,
      "products"
    );

    // returns a promise (Should be awaited)
    const productsSnapshot = await getDocs(productsCollectionRef);

    // console.log("products: ", productsSnapshot);

    // loop through docs
    productsSnapshot.forEach((doc) => {
      const productData = doc.data();
      const name = productData.basicInfo.name.toLowerCase();
      if (name.startsWith(inputString)) {
        console.log("product name: ", name);
      } else {
        console.log("cannot find: ", name);
      }
    });
  } catch (error) {
    console.error("Error occurred when trying to fetch collection " + error);
  }
});

// Helper functions
function clearFilter(filterInputs, filters) {
  // uncheck the boxes
  filterInputs.forEach((input) => (input.checked = false));
  for (const key in filters) {
    if (filters.hasOwnProperty(key)) {
      // Clear each array
      filters[key] = [];
    }
  }
}

function populateTable(products, tabId, rowTemplate) {
  const table = document.getElementById(tabId);
  console.log("table", table);
  if (!table) return;

  table.innerHTML = "";

  if (products.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="10" class="empty-state"> 
          <p>No Products available </p> 
        </td>
      </td>
    `;
  }

  products.forEach((product) => {
    const tr = document.createElement("tr");
    tr.className = "product-row";
    tr.innerHTML = rowTemplate(product);
    table.appendChild(tr);
  });
}
