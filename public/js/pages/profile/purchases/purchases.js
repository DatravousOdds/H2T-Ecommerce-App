"use strict";


import { db, collection, getDocs, query, where } from "../../../api/firebase-client.js";

/**
 * Buyer-side view of the same `orders` collection the Selling tab's Orders
 * module reads (there: where sellerId == uid; here: where buyerId == uid).
 *
 * Two fields the static design assumed don't exist on real orders yet --
 * built defensively against them rather than faked, per the decision:
 * build off what's real now, pick up the gaps automatically once added.
 *
 *   - fulfillmentStatus: doesn't exist (order.status is just Stripe's
 *     payment status, effectively always "succeeded"). Defaults every
 *     order to "processing" until a real value is ever set -- once orders
 *     start having shipped/delivered/cancelled written to them, the
 *     Shipped/Delivered/Cancelled tabs start working with no code changes.
 *   - trackingNumber / carrier: doesn't exist at all. Track Order shows a
 *     clear "not yet shipped" state until these are populated for real.
 *
 * One field handled deliberately, not just defensively: `shippingAddress`
 * on a real order is actually the *seller's* ship-from location (confirmed
 * by reading checkout.js/server.js directly -- it's set from
 * `shippingFrom`), not the buyer's delivery address. Showing it under
 * "Shipping Information" as if it were the buyer's own address would be
 * actively wrong, not just an honest gap -- so it's labeled for what it
 * really is instead of presented as something it isn't.
 */

const STATUS_DISPLAY = {
  processing: { icon: "fa-box", label: "Processing" },
  shipped: { icon: "fa-truck", label: "Shipped" },
  delivered: { icon: "fa-check", label: "Delivered" },
  cancelled: { icon: "fa-xmark", label: "Cancelled" },
};

function getDisplayStatus(order) {
  const status = (order.fulfillmentStatus || "processing").toLowerCase();
  return STATUS_DISPLAY[status] ? status : "processing";
}

function toDate(createdAt) {
  return new Date(createdAt * 1000);
}

function formatDate(createdAt) {
  return toDate(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function purchaseCardHTML(order) {
  const status = getDisplayStatus(order);
  const { icon, label } = STATUS_DISPLAY[status];
  const itemName = order.item?.name || "Item";
  const price = Number(order.subtotal || 0).toFixed(2);
  const image = order.item?.image || "/images/HypebeastBG.jpeg";

  return `
    <div class="purchase-item" data-order-id="${order.id}">
      <!-- Mobile View -->
      <div class="mobile-view">
        <div class="order-header">
          <p class="order-number">Order #${(order.id || "").slice(-10)}</p>
          <div class="status-badge ${status}">
            <i class="fa-solid ${icon}"></i>
            <span>${label}</span>
          </div>
        </div>

        <div class="product-info">
          <img src="${image}" alt="${itemName}" />
          <div class="details">
            <h3>${itemName}</h3>
            <p>Quantity: 1</p>
            <p>Price: $${price}</p>
          </div>
        </div>

        <button class="view-details-btn">
          <span>
            <i class="fa-solid fa-eye"></i>
            View Details
          </span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      <!-- Desktop View -->
      <div class="desktop-view">
        <div class="product-section">
          <img src="${image}" alt="${itemName}" />
          <div class="details">
            <h3>${itemName}</h3>
            <p class="order-number">Order #${(order.id || "").slice(-10)}</p>
            <div class="price-quantity">
              <span>Quantity: 1</span>
              <span>Price: $${price}</span>
            </div>
          </div>
        </div>

        <div class="status-section">
          <div class="status-badge ${status}">
            <i class="fa-solid ${icon}"></i>
            <span>${label}</span>
          </div>
          <button class="view-details-btn">
            <i class="fa-solid fa-eye"></i>
            <span>View Details</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderSection(sectionId, orders) {
  const section = document.getElementById(sectionId);
  console.log("section", section)
  if (!section) return;

  const list = section.querySelector(".purchase-list");
  console.log("list", list)
  if (!list) return;

  if (orders.length === 0) {
    list.innerHTML = `<p class="default-paragraph" style="text-align:center; padding: 24px;">No purchases here yet.</p>`;
    return;
  }

  list.innerHTML = orders.map(purchaseCardHTML).join("");
}

function renderAllSections(allOrders, searchTerm = "") {
  const filtered = searchTerm
    ? allOrders.filter((o) => {
        const term = searchTerm.toLowerCase();
        return (
          (o.item?.name || "").toLowerCase().includes(term) ||
          (o.item?.brand || "").toLowerCase().includes(term) ||
          (o.id || "").toLowerCase().includes(term)
        );
      })
    : allOrders;

  renderSection("all-purchases", filtered);
  renderSection("processing-purchases", filtered.filter((o) => getDisplayStatus(o) === "processing"));
  renderSection("shipped-purchases", filtered.filter((o) => getDisplayStatus(o) === "shipped"));
  renderSection("delivered-purchases", filtered.filter((o) => getDisplayStatus(o) === "delivered"));
  renderSection("cancelled-purchases", filtered.filter((o) => getDisplayStatus(o) === "cancelled"));
}

function buildOrderDetailsHTML(order) {
  const status = getDisplayStatus(order);
  const { label } = STATUS_DISPLAY[status];
  const itemName = order.item?.name || "Item";
  const image = order.item?.image || "/images/HypebeastBG.jpeg";
  const subtotal = Number(order.subtotal || 0);
  const shippingCost = Number(order.shippingCost || 0);
  const tax = Number(order.item?.salesTax || 0);
  const total = subtotal + shippingCost + tax;

  const sizeRow = order.item?.size
    ? `<p class="default-paragraph product-size">Size: ${order.item.size}</p>`
    : "";

  // shippingAddress is the seller's ship-from location, not the buyer's
  // delivery address -- labeled for what it actually is rather than shown
  // as if it were the buyer's own address.
  const shipFromRow = order.shippingAddress
    ? `<p class="shipping-recipient">Ships from: ${order.shippingAddress}</p>`
    : "";

  const trackingSection = order.trackingNumber
    ? `<button class="track-order-btn" data-tracking="${order.trackingNumber}" data-carrier="${order.carrier || ""}">
         <i class="fa-solid fa-truck"></i>
         Track Order
       </button>`
    : `<button class="track-order-btn" disabled title="Not yet shipped">
         <i class="fa-solid fa-truck"></i>
         Not yet shipped
       </button>`;

  return {
    title: `Order #${(order.id || "").slice(-10)}`,
    status,
    statusLabel: label,
    orderDate: formatDate(order.createdAt),
    html: `
      <div class="order-products-container">
        <div class="order-item">
          <img class="product-img" src="${image}" alt="${itemName}" />
        </div>
        <div class="order-item-info">
          <h3 class="default-paragraph product-name">${itemName}</h3>
          ${sizeRow}
          <p class="default-paragraph product-quantity">Quantity: 1</p>
          <p class="default-paragraph product-price">Price: $${subtotal.toFixed(2)}</p>
        </div>
      </div>
      <div class="order-shipping-info">
        <div class="order-shipping-info-container">
          <div class="order-shipping-info-header">
            <i class="fa-solid fa-location-dot"></i>
            <h3>Shipping Information</h3>
          </div>
          <div class="order-shipping-info-content">
            ${shipFromRow}
          </div>
          ${trackingSection}
        </div>
        <div class="order-payment-details">
          <div class="order-payment-details-header">
            <i class="fa-regular fa-credit-card"></i>
            <h3>Payment Details</h3>
          </div>
          <div class="order-payment-details-content">
            <p class="payment-method">Payment Method: Card</p>
            <div class="order-pricing">
              <div class="order-subtotal space-between">
                <p>Subtotal:</p>
                <span>$${subtotal.toFixed(2)}</span>
              </div>
              <div class="order-shipping space-between">
                <p>Shipping:</p>
                <span>$${shippingCost.toFixed(2)}</span>
              </div>
              <div class="order-tax space-between">
                <p>Tax:</p>
                <span>$${tax.toFixed(2)}</span>
              </div>
            </div>
            <div class="order-total space-between">
              <p>Total:</p>
              <span>$${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    `,
  };
}

function openOrderDetails(order) {
  const menu = document.querySelector(".order-details-menu");
  if (!menu) return;

  const { title, status, statusLabel, orderDate, html } = buildOrderDetailsHTML(order);

  const titleEl = document.getElementById("order-details-title");
  const subheaderTitle = menu.querySelector(".order-details-subheader-title");
  const statusEl = menu.querySelector(".order-details-status");
  const dateEl = menu.querySelector(".order-details-subheader-right p");
  const contentContainer = menu.querySelector(".order-details-content");

  if (titleEl) titleEl.textContent = "Order Details";
  if (subheaderTitle) subheaderTitle.textContent = title;
  if (statusEl) {
    statusEl.textContent = statusLabel;
    statusEl.className = `order-details-status ${status}`;
  }
  if (dateEl) dateEl.textContent = `Order Date: ${orderDate}`;

  // Everything below the subheader is fully rebuilt per order rather than
  // patched field-by-field, since the product/shipping/payment sections
  // are entirely order-specific.
  const subheader = menu.querySelector(".order-details-subheader");
  if (contentContainer && subheader) {
    contentContainer.innerHTML = "";
    contentContainer.appendChild(subheader);
    contentContainer.insertAdjacentHTML("beforeend", html);
  }

  menu.classList.add("active");
}

function wireEventDelegation(allOrders) {
  const purchasesContent = document.querySelector(".purchases-content");
  const orderDetailsMenu = document.querySelector(".order-details-menu");
  const closeBtn = document.getElementById("close-order-details-menu");

  if (purchasesContent) {
    purchasesContent.addEventListener("click", (e) => {
      const viewBtn = e.target.closest(".view-details-btn");
      if (!viewBtn) return;

      const card = viewBtn.closest(".purchase-item");
      const orderId = card?.dataset.orderId;
      const order = allOrders.find((o) => o.id === orderId);
      if (order) openOrderDetails(order);
    });
  }

  if (closeBtn && orderDetailsMenu) {
    closeBtn.addEventListener("click", () => orderDetailsMenu.classList.remove("active"));
  }
}

function wireTabSwitching() {
  const purchaseTypeItems = document.querySelectorAll(".purchase-type-item");
  const purchaseContentSections = document.querySelectorAll(".purchases-content-section");

  purchaseTypeItems.forEach((item, index) => {
    item.addEventListener("click", () => {
      purchaseTypeItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");

      purchaseContentSections.forEach((section) => section.classList.remove("active"));
      purchaseContentSections[index].classList.add("active");
    });
  });
}

function wireSearch(allOrders) {
  const searchInput = document.querySelector(".purchases-search input");
  const form = document.querySelector(".purchases-search");

  if (form) form.addEventListener("submit", (e) => e.preventDefault());

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      renderAllSections(allOrders, searchInput.value.trim());
    });
  }
}

async function fetchBuyerOrders(userId) {
  const ordersRef = collection(db, "orders");
  const q = query(ordersRef, where("buyerId", "==", userId));
  const snapshot = await getDocs(q);

  const orders = snapshot.docs.map((d) => d.data());
  orders.sort((a, b) => b.createdAt - a.createdAt);
  console.log("orders from purchases", orders)
  return orders;
}

export async function initPurchases(currentUser) {
    console.log("purchases init called!")
  
  if (!currentUser?.userId) return;

  try {
    const allOrders = await fetchBuyerOrders(currentUser.userId);

    renderAllSections(allOrders);
    wireEventDelegation(allOrders);
    wireTabSwitching();
    wireSearch(allOrders);
  } catch (error) {
    console.error("Error loading purchases:", error);
  }
}

