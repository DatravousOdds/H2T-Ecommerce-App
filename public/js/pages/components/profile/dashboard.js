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

const daftProductsTableTemplate = (product) =>
  ` 
      <td>
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
            <p class="product-name">${product.basicInfo.name}</p>
            <p class="product-id">ID: #${product.draftId}</p>
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
          <span class="date">${formatFirebaseDate(product.createAt)}</span>
          <span class="time">2:30 PM</span>
        </div>
      </td>
      <td>
        <div class="date-info">
          <span class="date">${formatFirebaseDate(product.lastEdited)}</span>
          <span class="time">4:45 PM</span>
        </div>
      </td>
      <td>
        <div class="category-info">
          <span class="category-badge">${product.basicInfo.category}</span>
          <span class="sub-category">${product.basicInfo.subcategory}</span>
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
            class="action-button draft-edit"
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
            class="action-button draft-publish"
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
            class="action-button draft-delete"
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
      </td>
    `;

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
                                class="action-button oos-restock"
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
                                class="action-button oos-notify"
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
                                class="action-button oos-archive"
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
                                class="action-button pending-view"
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
                                class="action-button pending-message"
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
                                class="action-button pending-approve"
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
                <div class="action-wrapper">
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

                  <!-- Actions menu -->


                  <div class="actions-menu">
                      <ul class="">
                        <li>
                          <div>
                            <div class="actions-icon">
                              <i class="fa-solid fa-pen-to-square"></i>
                            </div>
                            <div class="actions-option">Edit Listing</div>
                          </div>
                        </li>
                        <li>
                          <div>
                            <div class="actions-icon">
                              <i class="fa-solid fa-arrow-up-from-bracket"></i>
                            </div>
                            <div class="actions-option">Promote Listing</div>
                          </div>
                        </li>
                        <li>
                          <div>
                            <div class="actions-icon">
                              <i class="fa-solid fa-clone"></i>
                            </div>
                            <div class="actions-option">Duplicate Listing</div>
                          </div>
                        </li>
                        <li>
                          <div>
                            <div class="actions-icon">
                              <i class="fa-solid fa-plus"></i>
                            </div>
                            <div class="actions-option">Update Stock</div>
                          </div>
                        </li>
                        <li>
                          <div>
                            <div class="actions-icon">
                              <i class="fa-solid fa-dollar-sign"></i>
                            </div>
                            <div class="actions-option">Adjust Price</div>
                          </div>
                        </li>
                        <li>
                          <div>
                            <div class="actions-icon">
                              <i class="fa-solid fa-chart-line"></i>
                            </div>
                            <div class="actions-option">View Analytics</div>
                          </div>
                        </li>
                        <div class="action-divider"></div>
                        <li>
                          <div>
                            <div class="action-icon">
                              <i class="fa-regular fa-rectangle-xmark"></i>
                            </div>
                            <div class="action-option">Mark as Sold Out</div>
                          </div>
                        </li>
                        <li>
                          <div>
                            <div class="action-icon">
                              <i class="fa-regular fa-trash-can"></i>
                            </div>
                            <div class="action-option">Delete Listing</div>
                          </div>
                        </li>
                      </ul>
                    </div>
                </div>
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
                class="action-button active-edit"
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
                class="action-button active-pause"
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
                class="action-button active-promote"
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
              class="action-button "
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
            <div class="actions-menu">
                      <ul class="">
                        <li>
                          <div>
                            <div class="actions-icon">
                              <i class="fa-solid fa-pen-to-square"></i>
                            </div>
                            <div class="actions-option">Edit Listing</div>
                          </div>
                        </li>
                        <li>
                          <div>
                            <div class="actions-icon">
                              <i class="fa-solid fa-arrow-up-from-bracket"></i>
                            </div>
                            <div class="actions-option">Promote Listing</div>
                          </div>
                        </li>
                        <li>
                          <div>
                            <div class="actions-icon">
                              <i class="fa-solid fa-clone"></i>
                            </div>
                            <div class="actions-option">Duplicate Listing</div>
                          </div>
                        </li>
                        <li>
                          <div>
                            <div class="actions-icon">
                              <i class="fa-solid fa-plus"></i>
                            </div>
                            <div class="actions-option">Update Stock</div>
                          </div>
                        </li>
                        <li>
                          <div>
                            <div class="actions-icon">
                              <i class="fa-solid fa-dollar-sign"></i>
                            </div>
                            <div class="actions-option">Adjust Price</div>
                          </div>
                        </li>
                        <li>
                          <div>
                            <div class="actions-icon">
                              <i class="fa-solid fa-chart-line"></i>
                            </div>
                            <div class="actions-option">View Analytics</div>
                          </div>
                        </li>
                        <div class="action-divider"></div>
                        <li>
                          <div>
                            <div class="action-icon">
                              <i class="fa-regular fa-rectangle-xmark"></i>
                            </div>
                            <div class="action-option">Mark as Sold Out</div>
                          </div>
                        </li>
                        <li>
                          <div>
                            <div class="action-icon">
                              <i class="fa-regular fa-trash-can"></i>
                            </div>
                            <div class="action-option">Delete Listing</div>
                          </div>
                        </li>
                      </ul>
                    </div>
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
                class="action-button sell-accept"
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
                class="action-button sell-decline"
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

// Modal Templates
const editProductTemplate = (product) => `
  
                        <div class="product-info-container">
                          <div class="product-image-container">
                            <img
                              src="${product.images[0].url}"
                              alt=""
                              class="${product.images[0].alt}"
                            />
                          </div>
                          <div class="product-info">
                            <div class="product-size">US ${product.basicInfo.size}</div>
                            <div class="product-sku">SKU: ${product.inventory.sku}</div>
                            <div class="product-status">${product.status}</div>
                          </div>
                        </div>
                        <ul class="tabs">
                          <li class="tab" data-tab="basic-info">Basic Info</li>
                          <li class="tab" data-tab="inventory">Inventory</li>
                          <li class="tab" data-tab="pricing">Pricing</li>
                          <li class="tab" data-tab="images">Images</li>
                        </ul>

                        <div id="basic-info" class="tab-content active">
                          <div class="form-group">
                            <label for="product-name">Product Name</label>
                            <input type="text" id="product-name" />
                          </div>

                          <div class="form-group">
                            <label for="product-condition">Condition</label>
                            <select
                              name="product-condition"
                              id="product-condition"
                            >
                              <option value="new-with-tags">
                                New with Tags
                              </option>
                              <option value="pre-owned">Preowned</option>
                              <option value="used">Used</option>
                            </select>
                          </div>

                          <div class="form-group">
                            <label for="product-size">Size</label>
                            <input
                              type="text"
                              id="product-size"
                              name="product-size"
                            />
                          </div>

                          <div class="form-group">
                            <label for="product-category">Category</label>
                            <input
                              type="text"
                              id="product-category"
                              name="product-category"
                            />
                          </div>
                        </div>

                        <div id="inventory" class="tab-content">
                          <div class="form-group">
                            <label for="product-quantity">Quantity</label>
                            <input
                              type="number"
                              id="product-quantity"
                              name="product-quantity"
                            />
                          </div>
                          <div class="form-group">
                            <label for="product-category">SKU</label>
                            <input
                              type="text"
                              id="product-sku-input"
                              name="product-sku-input"
                            />
                          </div>
                          <div class="form-group">
                            <label for="product-category">In Stock</label>
                            <input
                              type="checkbox"
                              id="product-in-stock"
                              name="product-in-stock"
                            />
                          </div>
                        </div>

                        <div id="pricing" class="tab-content">
                          <div class="form-group">
                            <label for="product-retail-price"
                              >Retail Price</label
                            >
                            <input
                              type="number"
                              id="product-retail-price"
                              name="product-retail-price"
                            />
                          </div>
                          <div class="form-group">
                            <label for="product-category"
                              >Selling Price ($)</label
                            >
                            <input
                              type="number"
                              id="product-sell-price"
                              name="product-sell-price"
                            />
                          </div>
                        </div>

                        <div id="images" class="tab-content">
                          <div class="form-group">
                            <label for="product-image-url">Image URL</label>
                            <input
                              type="text"
                              id="product-image-url"
                              name="product-image-url"
                            />
                          </div>
                          <div class="form-group">
                            <label for="product-image-alt"
                              >Image Alt Text</label
                            >
                            <input
                              type="text"
                              id="product-image-alt"
                              name="product-image-alt"
                            />
                          </div>
                        </div>
                      
`;

const statusModalTemplate = (product) => `
<div class="product-info-container">
                          <div class="product-image-container">
                            <img
                              src="${product.images[0].url}"
                              alt="${product.images[0].alt}"
                              class="product-image"
                            />
                          </div>
                          <div class="product-info">
                            <div class="product-name">${product.basicInfo.name}</div>
                            <div class="product-status-container">
                              Current Status:
                              <span class="product-status">${product.status}</span>
                            </div>
                          </div>
                        </div>
                        <div class="form-group">
                          <label for="product-name">New Status</label>
                          <select id="product-status" name="product-status">
                            <option value="active">Active</option>
                            <option value="for-trade">For Trade</option>
                            <option value="paused">Paused</option>
                            <option value="draft">Draft</option>
                            <option value="out-of-stock">Out of Stock</option>
                            <option value="pending">Pending Trade</option>
                            <option value="sold">Sold</option>
                          </select>
                        </div>
                        <div class="form-group">
                          <label for="stat-notes">Notes (Optional) </label>
                          <textarea
                            name="status-notes"
                            id="status-notes"
                            placeholder="Add any notes about this status change..."
                          ></textarea>
                        </div>
`;

const promoteModalTemplate = (product) => `

                        <div class="product-info-container">
                          <div class="product-image-container">
                            <img
                              src="${product.images[0].url}"
                              alt="${product.images[0].alt}"
                              class="product-image"
                              id="promote-product-image"
                            />
                          </div>
                          <div class="product-info">
                            <div
                              id="promote-product-name"
                              class="promote-product-name"
                            >
                              ${product.basicInfo.name}
                            </div>
                            <div
                              id="promote-product-sku"
                              class="promote-product-sku"
                            >
                              SKU: ${product.inventory.sku}
                            </div>
                          </div>
                        </div>
                        <p class="collection-info">
                          Add this product to collections for better
                          organization and featuring on your store
                        </p>

                        <div class="collection-list">
                          <div class="collection-item">
                            <input
                              type="checkbox"
                              id="collection-featured"
                              name="collection-featured"
                            />
                            <label for="collection-featured"
                              >Featured Products</label
                            >
                          </div>
                          <div class="collection-item">
                            <input
                              type="checkbox"
                              id="collection-best-sellers"
                              name="collection-best-sellers"
                            />
                            <label for="collection-best-sellers"
                              >Best Sellers</label
                            >
                          </div>
                          <div class="collection-item">
                            <input
                              type="checkbox"
                              id="collection-new"
                              name="collection-new"
                            />
                            <label for="collection-new">New Arrivals</label>
                          </div>
                        </div>

                        <div class="collection-form">
                          <div class="form-group">
                            <label for="new-collection"
                              >Create New Collection</label
                            >
                            <div class="input-group">
                              <input
                                type="text"
                                placeholder="Enter new collection name"
                              />
                              <button
                                class="btn btn-secondary"
                                id="add-collection-btn"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      
`;

const acceptModalTemplate = (product) => `
<div class="modal-body">
                        <div class="product-info-container">
                          <div class="product-image-container">
                            <img
                              class="product-image"
                              src="${product.images[0].url}"
                              alt=""
                              id="accept-product-image"
                            />
                          </div>
                          <div class="product-info">
                            <div class="sell-product-name">${product.basicInfo.name}</div>
                            <div class="sell-product-category">
                              ${product.basicInfo.category}
                            </div>
                          </div>
                        </div>

                        <div class="offer-details">
                          <div class="offer-row">
                            <span class="offer-label"
                              >Your Item Condition:</span
                            >
                              <span class="offer-value">9/10</span>
                          </div>
                          <div class="offer-row">
                            <span class="offer-label">Market Value:</span>
                            <span class="offer-value">$${product.pricing.retailPrice}</span>
                          </div>
                          <div class="offer-row highlight">
                            <span class="offer-label">Their Offer:</span>
                            <span class="offer-value">$${product.pricing.retailPrice}</span>
                          </div>
                        </div>

                        <div class="confirmation-message">
                          <p>
                            You are about to accept an offer of
                            <strong>$${product.pricing.retailPrice} cash</strong> or
                            <strong>$${product.pricing.retailPrice} store credit</strong> for your ${product.basicInfo.name}.
                          </p>
                        </div>

                        <div class="form-group">
                          <label for="payment-preference"
                            >How would you like to get paid?</label
                          >
                          <select
                            name="payment-preference"
                            id="payment-preference"
                          >
                            <option value="store-credit">
                              Store Credit ($${product.pricing.retailPrice})
                            </option>
                            <option value="cash">
                              Cash/Bank Transfer ($${product.pricing.retailPrice})
                            </option>
                          </select>
                        </div>
                      </div>
`;

const declineModalTemplate = (product) => `
<div class="modal-product-info-container">
                          <div class="product-image-container">
                            <img
                              src="${product.images[0].url}"
                              alt="${product.images[0].alt}"
                              id="reject-product-image"
                            />
                          </div>
                          <div class="product-info">
                            <div class="sell-product-name">${product.basicInfo.name}</div>
                            <div class="sell-product-category">
                              ${product.basicInfo.category}
                            </div>
                            <div class="offer-details">
                              <div class="offer-row">
                                <span class="offer-label"
                                  >Your Item Condition:</span
                                >
                                <span class="offer-value">9/10</span>
                              </div>
                              <div class="offer-row">
                                <span class="offer-label">Their Offer:</span>
                                <span class="offer-value">$${product.pricing.retailPrice}</span>
                              </div>
                              <div class="offer-row">
                                <span class="offer-label">Store Credit:</span>
                                <span class="offer-value">$${product.pricing.retailPrice}</span>
                              </div>
                            </div>

                            <div class="confirmation-message warning">
                              <p>
                                You are about to decline the offer for your
                                <strong>${product.basicInfo.name}</strong>
                              </p>
                            </div>

                            <div class="form-group">
                              <label for="rejection-reason"
                                >Reason for Declining</label
                              >
                              <select
                                name="rejection-reason"
                                id="rejection-reason"
                              >
                                <option value="price-too-low">
                                  Offer price is too low
                                </option>
                                <option value="changed-mind">
                                  Changed my mind
                                </option>
                                <option value="sold-elsewhere">
                                  Sold elsewhere
                                </option>
                                <option value="other">Other reason</option>
                              </select>
                            </div>

                            <div class="form-group">
                              <label for="minimum-acceptable"
                                >Minimum Acceptable Offer (Optional)</label
                              >
                              <div class="input-group">
                                <span class="currency-symbol">$</span>
                                <input
                                  type="number"
                                  id="minimum-acceptable"
                                  name="minimum-acceptable"
                                />
                              </div>
                            </div>

                            <div class="form-group">
                              <label for="reject-notes"
                                >Additional Comments</label
                              >
                              <textarea
                                name="reject-notes"
                                id="reject-notes"
                                placeholder="Tell us more about why you're declining..."
                              ></textarea>
                            </div>

                            <div class="modal-footer">
                              <button class="btn btn-secondary close-modal">
                                Cancel
                              </button>
                              <button class="btn btn-primary confirm-reject">
                                Decline Offer
                              </button>
                            </div>
                          </div>
                        </div>
`;

const tradeModalTemplate = (product) => `
<div class="modal-body">
                        <div class="trade-content-container">
                          <div class="trade-status-message">
                            <div class="trade-group">
                              <p><strong>Status:</strong></p>
                              <p class="trade-status-value pending">
                                ${product.trading.status}
                              </p>
                            </div>
                            <div class="trade-group">
                              <p><strong>Submitted:</strong></p>
                              <p class="trade-submitted-date-value">
                                ${product.trading.date}
                              </p>
                            </div>
                          </div>
                          <div class="trade-info">
                            <div class="trade-group">
                              <p>
                                <strong>Trade Balance:</strong>
                                <span class="store-credit-positive"
                                  >+$50.00 Store Credit</span
                                >
                              </p>
                            </div>
                            <div class="trade-group">
                              <p><strong>Trade ID:</strong></p>
                              <p class="trade-id-value">${product.trading.id}</p>
                            </div>
                          </div>
                        </div>

                        <div class="item-group">
                          <label for="trading-item">You're Trading In:</label>
                          <div class="trade-item-container">
                            <div class="your-trade-item">
                              <div class="your-trade-image">
                                <img
                                  src="${product.images[0].url}"
                                  alt="${product.images[0].alt}"
                                />
                              </div>
                              <div class="your-trade-info">
                                <div class="product-name">
                                  <strong>${product.basicInfo.name}</strong>
                                </div>
                                <div class="product-condition">
                                  Condition: 9/10
                                </div>
                                <div class="product-size">Size: US 11</div>
                                <div class="product-value">$${product.pricing.retailPrice}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div class="item-group">
                          <label for="request-item">You're Requesting:</label>
                          <div class="trade-item-container">
                            <div class="requesting-item">
                              <div class="requesting-item-image">
                                <img
                                  src="${product.images[0].url}"
                                  alt="${product.images[0].alt}"
                                />
                              </div>
                              <div class="requesting-item-info">
                                <div class="product-name">
                                  <strong>${product.basicInfo.name}</strong>
                                </div>
                                <div class="product-condition">
                                  Condition: New
                                </div>
                                <div class="product-size">Size: US ${product.basicInfo.size}</div>
                                <div class="product-value">$${product.pricing.retailPrice}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div class="modal-footer">
                          <button class="btn btn-secondary close-modal">
                            Close
                          </button>
                          <button class="btn btn-primary message-trader">
                            Message
                          </button>
                        </div>
                      </div>
`;

const messageModalTemplate = (product) => `
<div class="trader-info-container">
                          <div class="trader-profile">
                            <div class="trader-image-wrapper">
                              <img
                                src="${product.images[0].url}"
                                alt="${product.images[0].alt}"
                                class="user-image"
                              />
                            </div>

                            <div class="trader-details">
                              <div class="user-identity">
                                <h3 class="username">${product.trading.traderName}</h3>
                                <div class="user-rating">
                                  <i class="fa-solid fa-star"></i>
                                  <span class="rating-rate">${product.trading.traderRating}</span>
                                </div>
                              </div>

                              <div class="response-info">
                                <p class="response-time">
                                  ${product.trading.traderResponseTime}
                                </p>
                              </div>
                            </div>
                          </div>

                          <!-- Trade Item Info -->
                          <div class="trade-item--summary">
                            <div class="item-details">
                              <span class="detail-label">Item:</span>
                              <span class="detail-value">${product.basicInfo.name}</span>
                            </div>
                            <div class="item-details">
                              <span class="detail-label">Trade ID:</span>
                              <span class="detail-value">${product.trading.id}</span>
                            </div>
                          </div>
                        </div>
`;

const approveModalTemplate = (product) => `
<div class="approve-confirmation-message">
                          <p class="approve-message">
                            You're about to approve trading your ${product.basicInfo.name}
                            for a ${product.trading.traderItem}.
                          </p>
                          <p>
                            You will receive
                            <span class="store-credit-highlight"
                              >$${product.trading.traderOffer} store credit as balance</span
                            >
                          </p>
                        </div>
`;

const trashModalTemplate = (product) => `
<div class="modal-body">
                        <p class="delete-message">
                          Are you sure you want to delete "${product.basicInfo.name}"? This
                          action cannot be undone and will permanently remove
                          the product from your inventory.
                        </p>
                        <p class="product-id">Product ID: ${product.id}</p>
                      </div>
`;

const publishModalTemplate = (product) => `
<div class="modal-content">
                      <div class="modal-header">
                        <div class="modal-title">
                          <div class="header-icon">
                            <i class="fa-solid fa-arrow-up"></i>
                          </div>
                          Publish Draft Product
                        </div>
                        <div class="modal-close">
                          <i class="fa-solid fa-xmark"></i>
                        </div>
                      </div>
                      <div class="modal-body">
                        <div class="publish-message">
                          You're about to publish "${product.basicInfo.name}" and make it
                          available for trade.
                        </div>
                        <div class="completion-status">
                          <h3>Completion Status</h3>
                          <div class="status">
                            <span class="status-percentage">${product.basicInfo.completionStatus}% Complete</span>
                          </div>
                        </div>
                        <div class="missing-info-container">
                          <div class="missing-info-header">
                            <div class="header-icon">
                              <i class="fa-solid fa-exclamation"></i>
                            </div>
                            <h3>Missing required information:</h3>
                          </div>
                          <ul class="missing-items">
                            <li>${product.basicInfo.missingInfo}</li>
                          </ul>
                        </div>
                      </div>
                      <div class="modal-footer">
                        <button type="button" class="btn required-fields">
                          <i class="fa-solid fa-arrow-up"></i>
                          Complete Required Fields
                        </button>
                        <button type="button" class="btn cancel-btn">
                          Cancel
                        </button>
                      </div>
                    </div>
`;

const editModalTemplate = (product) => `

`;

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

    console.log("Trade Array: ", productsArray);

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

    const searchProducts = [];

    // loop through docs
    productsSnapshot.forEach((doc) => {
      const productData = doc.data();
      const name = productData.basicInfo.name.toLowerCase();
      if (name.startsWith(inputString)) {
        searchProducts.push({
          id: doc.id,
          ...productData,
        });
      }
    });

    // populate table
    populateTable(
      searchProducts,
      "all-products-table",
      allProductsTableTemplate
    );
  } catch (error) {
    console.error(`Error occurred when trying to fetch collection ${error}`);
  }
});

// Actions menu functionality
const productActionBtn = document.querySelector(".action-button");

// Event Listeners
productActionBtn.addEventListener("click", () => {
  document.querySelector(".actions-menu").classList.add("active");
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
    console.log(product);
    const tr = document.createElement("tr");
    tr.className = "product-row";
    tr.setAttribute("data-product-id", `${product.id}`);
    tr.innerHTML = rowTemplate(product);
    table.appendChild(tr);
  });

  attachEventListeners(tabId, products);
}

function attachEventListeners(tableId, products) {
  if (!tableId) console.log(`${tableId} does not exist`);

  const id = document.getElementById(tableId);

  const editButtons = id.querySelectorAll(".action-button");
  console.log("Edit Buttons:", editButtons);

  if (!editButtons) {
    console.log("no edit menu here");
  } else {
    editButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        console.log("clicked Button: ", btn);

        // check if menu exist
        const menu = btn.nextElementSibling;
        if (menu && menu.classList.contains("actions-menu")) {
          menu.classList.toggle("active");
          e.stopPropagation();
        } else if (btn && btn.classList.contains("edit")) {
          let editModal = document.getElementById("editModal");
          editModal.classList.add("active");
          console.log("edit Modal State: ", editModal);
        }
      });
    });

    document.addEventListener("click", () => {
      const openMenus = document.querySelectorAll(".actions-menu.active");
      openMenus.forEach((menu) => {
        menu.classList.remove("active");
      });
    });
  }
}

// Classes
class ProductModalManager {
  constructor() {
    this.modals = new Map();
    this.currentModal = null;
  }

  registerModal(type, modalElement) {
    // check if modal is already registered
    if (!this.modals.has(type)) {
      this.modals.set(type, modalElement);
    }
    // if registered, don't register again
    else {
      console.log(`Modal ${type} is already registered`);
    }
  }

  openModal(type, modalElement) {
    // if modal is registered, open it
    if (modalElement) {
      // register
      if (!this.modals.has(type)) {
        this.registerModal(type, modalElement);
      }

      // current reference
      this.currentModal = this.modals.get(type);
      // open modal
      this.currentModal.classList.add("active");
    } else {
      return null;
    }
  }

  closeModal(type) {
    if (this.modals.has(type)) {
      this.modals.get(type).classList.remove("active");
      this.currentModal = null;
    }
  }
}
const p = new ProductModalManager();

function setUpEventDelegation() {
  document
    .querySelector(".products-content")
    .addEventListener("click", async (e) => handleProductAction(e));

  document
    .querySelector(".modals-container")
    .addEventListener("click", (e) => handleModalClose(e));
}

setUpEventDelegation();

const templates = {
  editModal: editModalTemplate,
  statusModal: statusModalTemplate,
  promoteModal: promoteModalTemplate,
  acceptModal: acceptModalTemplate,
  rejectModal: declineModalTemplate,
  tradeModal: tradeModalTemplate,
  messageModal: messageModalTemplate,
  approveModal: approveModalTemplate,
  trashModal: trashModalTemplate,
  publishModal: publishModalTemplate,
  editModal: editProductTemplate,
};

// Helper Functions
async function handleProductAction(event) {
  let button = event.target.closest(".action-button");

  if (!button) return;

  const actionType = getActionType(button);
  const modal = getModal(actionType);
  const productData = await getProductData(button);
  populateModal(modal, productData);
  p.openModal(actionType, modal);
}
async function getProductData(button) {
  const product = button.closest(".product-row");
  const tableId = button.closest("tbody").id;
  const id = product.getAttribute("data-product-id");
  const productData = await fetchProductData(id, tableId);
  return productData;
}
async function fetchProductData(productId, tableId) {
  let collectionRef;

  // determine which table to fetch from
  switch (tableId) {
    case "all-products-table":
    case "active-products-table":
    case "sell-to-us-products-table":
    case "out-of-stock-products-table":
      collectionRef = "products";
      break;

    case "for-trade-products-table":
    case "pending-trades-products-table":
      collectionRef = "trades";
      break;

    case "draft-products-table":
      collectionRef = "productDrafts";
      break;
    default:
      collectionRef = "products";
      break;
  }

  if (!productId) return;

  // fetch document
  try {
    const docRef = doc(
      db,
      "userProfiles",
      userData.email,
      collectionRef,
      productId
    );

    const productSnap = await getDoc(docRef);

    if (productSnap.exists()) {
      const productData = productSnap.data();

      // validate document
      const product = validateProductInformation(productData, tableId);

      return product;
    } else {
      console.log("No such document!");
    }
  } catch (error) {
    console.error(`No data found for the product id: ${productId}`);
  }
}
function handleModalClose(event) {
  let button = event.target.closest(".close-button");

  if (!button) return;

  const actionType = getActionType(button);
  const modal = getModal(actionType);
  p.closeModal(modal)
}
function validateProductInformation(data, id) {
  if (!id || !data) return null;

  switch (id) {
    case "active-products-table":
      if (data.status == "active") {
        return data;
      }
      break;
    case "sell-to-us-products-table":
      if (data.sellBack.inProgress == true) {
        return data;
      }
      break;
    case "out-of-stock-products-table":
      if (data.inStock == false) {
        return data;
      }
      break;
    case "for-trade-products-table":
      if (data.status == "pending") {
        return data;
      }
      break;
    case "pending-trades-products-table":
      if (data.status == "pending") {
        return data;
      }
      break;

    default:
      return data;
  }
}
function getActionType(button) {
  if (!button) return null;

  const typeOfAction = button.className.split(" ")[1];
  console.log("type of action:", typeOfAction);

  return typeOfAction;
}
function getModal(action) {
  // const productModals = document.querySelectorAll(".modals-container .modal");
  let modals = {
    "active-edit": document.getElementById("editModal"),
    "active-pause": document.getElementById("statusModal"),
    "active-promote": document.getElementById("promoteModal"),

    "sell-accept": document.getElementById("acceptModal"),
    "sell-decline": document.getElementById("rejectModal"),

    "pending-view": document.getElementById("tradeModal"),
    "pending-message": document.getElementById("messageModal"),
    "pending-approve": document.getElementById("approveModal"),

    "draft-edit": document.getElementById("editModal"),
    "draft-publish": document.getElementById("publishModal"),
    "draft-delete": document.getElementById("trashModal"),
  };

  return modals[action];
}

function populateModal(modalType, productData) {
  const id = modalType.id;
  const modalBody = document.getElementById(id).querySelector(".modal-body");
  modalBody.innerHTML = "";
  if (templates[id]) {
    // console.log("modal template:", templates[id](productData));
    modalBody.innerHTML = templates[id](productData);
  }
  return null;
}

// Event Listeners
