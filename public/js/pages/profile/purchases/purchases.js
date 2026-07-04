"use strict";


import { db, collection, getDocs, query, where } from "../../../api/firebase-client.js";

/**
 * Buyer-side view of the same `orders` collection the Selling tab's Orders
 * module reads (there: where sellerId == uid; here: where buyerId == uid).
 *
 * fulfillmentStatus is real now: "pending" (checkout submit, before payment
 * captures) -> "processing" (webhook confirms payment) -> "shipped" (seller
 * enters tracking) -> "delivered" (seller marks it), or "cancelled" from
 * pending/processing. order.status stays Stripe's own payment status
 * ("succeeded"/etc) and is unrelated -- see orders.js for that one.
 * trackingNumber/carrier are written by PUT /orders/:id when a seller ships.
 *
 * One field still handled defensively, not just faked: `shippingAddress`
 * on a real order is actually the *seller's* ship-from location (confirmed
 * by reading checkout.js/server.js directly -- it's set from
 * `shippingFrom`), not the buyer's delivery address. Showing it under
 * "Shipping Information" as if it were the buyer's own address would be
 * actively wrong, not just an honest gap -- so it's labeled for what it
 * really is instead of presented as something it isn't.
 */

// Populated by initPurchases/refreshPurchases -- read by the click
// delegation below so re-renders after a cancel don't leave stale closures
// pointing at the pre-cancel order list.
let currentOrders = [];

const STATUS_DISPLAY = {
  pending: { icon: "fa-clock", label: "Pending" },
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
    ? `<button class="track-order-btn" data-tracking="${order.trackingNumber}" data-carrier="${order.shippingCarrier || ""}">
         <i class="fa-solid fa-truck"></i>
         Track Order
       </button>`
    : `<button class="track-order-btn" disabled title="Not yet shipped">
         <i class="fa-solid fa-truck"></i>
         Not yet shipped
       </button>`;

  // Cancellation only makes sense before the item has shipped -- matches
  // the same "pending"/"processing" window the backend (DELETE
  // /orders/:id) actually allows.
  const isCancellable = status === "pending" || status === "processing";
  const cancelSection = isCancellable
    ? `<div class="order-details-cancel">
         <button type="button" class="order-action-btn danger" id="buyer-cancel-order-btn">Cancel Order</button>
         <p class="order-action-error"></p>
       </div>`
    : "";

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
      ${cancelSection}
    `,
  };
}

function openOrderDetails(order) {
  const menu = document.querySelector(".order-details-menu");
  if (!menu) return;

  const { title, status, statusLabel, orderDate, html } = buildOrderDetailsHTML(order);

  // Read by the delegated cancel-button handler below to know which order
  // to send the DELETE for -- order.docId is the Firestore doc id, not
  // order.id (which is the Stripe payment intent id).
  menu.dataset.docId = order.docId;

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

async function cancelOrder(docId, idToken) {
  const response = await fetch(`/orders/${docId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: JSON.stringify({}),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Cancel failed");
  return result;
}

// Re-fetches and re-renders after a cancel, keeping currentOrders (and
// anything closed over it, like the click delegation below) in sync.
async function refreshPurchases(currentUser) {
  currentOrders = await fetchBuyerOrders(currentUser.userId);

  const searchInput = document.querySelector(".purchases-search input");
  renderAllSections(currentOrders, searchInput ? searchInput.value.trim() : "");
}

function wireEventDelegation(currentUser) {
  const purchasesContent = document.querySelector(".purchases-content");
  const orderDetailsMenu = document.querySelector(".order-details-menu");
  const closeBtn = document.getElementById("close-order-details-menu");

  if (purchasesContent) {
    purchasesContent.addEventListener("click", (e) => {
      const viewBtn = e.target.closest(".view-details-btn");
      if (!viewBtn) return;

      const card = viewBtn.closest(".purchase-item");
      const orderId = card?.dataset.orderId;
      const order = currentOrders.find((o) => o.id === orderId);
      if (order) openOrderDetails(order);
    });
  }

  if (closeBtn && orderDetailsMenu) {
    closeBtn.addEventListener("click", () => orderDetailsMenu.classList.remove("active"));
  }

  // Delegated on the modal itself (not the button directly) since the
  // cancel button is regenerated fresh every time openOrderDetails() runs.
  if (orderDetailsMenu) {
    orderDetailsMenu.addEventListener("click", async (e) => {
      const cancelBtn = e.target.closest("#buyer-cancel-order-btn");
      if (!cancelBtn) return;

      const docId = orderDetailsMenu.dataset.docId;
      if (!docId) return;

      if (!window.confirm("Cancel this order? This can't be undone.")) return;

      const errorEl = orderDetailsMenu.querySelector(".order-action-error");

      try {
        await cancelOrder(docId, currentUser.idToken);
        orderDetailsMenu.classList.remove("active");
        await refreshPurchases(currentUser);
      } catch (error) {
        if (errorEl) {
          errorEl.textContent = error.message;
          errorEl.classList.add("visible");
        }
      }
    });
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

function wireSearch() {
  const searchInput = document.querySelector(".purchases-search input");
  const form = document.querySelector(".purchases-search");

  if (form) form.addEventListener("submit", (e) => e.preventDefault());

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      renderAllSections(currentOrders, searchInput.value.trim());
    });
  }
}

async function fetchBuyerOrders(userId) {
  const ordersRef = collection(db, "orders");
  const q = query(ordersRef, where("buyerId", "==", userId));
  const snapshot = await getDocs(q);

  // docId is the Firestore document id -- distinct from order.id, which is
  // the Stripe payment intent id. The cancel action (DELETE /orders/:id)
  // keys off the Firestore doc, so this has to be captured here.
  const orders = snapshot.docs.map((d) => ({ ...d.data(), docId: d.id }));
  orders.sort((a, b) => b.createdAt - a.createdAt);
  console.log("orders from purchases", orders)
  return orders;
}

export async function initPurchases(currentUser) {
    console.log("purchases init called!")

  if (!currentUser?.userId) return;

  try {
    currentOrders = await fetchBuyerOrders(currentUser.userId);

    renderAllSections(currentOrders);
    wireEventDelegation(currentUser);
    wireTabSwitching();
    wireSearch();
  } catch (error) {
    console.error("Error loading purchases:", error);
  }
}

