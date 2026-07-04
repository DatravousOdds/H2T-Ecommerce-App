"use strict";

import { checkUserStatus } from "../../../../auth/auth.js";
import {
  collection,
  db,
  getDocs,
  query,
  where,
} from "../../../../api/firebase-client.js";

const currentUser = await checkUserStatus();

// Populated by loadOrdersTab/refreshOrders -- the click-delegation handler
// in wireOrderActions() looks orders up here by docId rather than
// re-querying Firestore on every "View Details" click.
let currentOrders = [];

/**
 * Real order shape, first written by POST /orders/init (checkout submit,
 * fulfillmentStatus: "pending") and then updated in place by the Stripe
 * webhook (fulfillmentStatus: "processing") and PUT/DELETE /orders/:id
 * (shipped/delivered/cancelled):
 *   { id, buyerId, sellerId, buyerEmail, createdAt, subtotal, status,
 *     fulfillmentStatus, shippingCost, shippingAddress, item: { name, size,
 *     brand, image, salesTax, marketplaceFee } }
 *
 * order.status is Stripe's own payment status ("succeeded", etc) and is
 * unrelated to fulfillmentStatus, which is what this file's status badge
 * and the "Pending Orders" stat below actually track.
 *
 * Two gotchas handled explicitly below, not assumed away:
 *   - subtotal is a STRING (server does .toFixed(2)) -- summing without
 *     Number() does string concatenation, not addition.
 *   - createdAt is a raw Stripe Unix timestamp in SECONDS, not a Firestore
 *     Timestamp -- different shape than listings.createdAt in products.js.
 */

function toDate(createdAt) {
  return new Date(createdAt * 1000);
}

function isWithinRange(order, range) {
  if (range === "all") return true;

  const orderDate = toDate(order.createdAt);
  const now = new Date();

  if (range === "today") {
    return orderDate.toDateString() === now.toDateString();
  }
  if (range === "week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return orderDate >= weekAgo;
  }
  if (range === "month") {
    return (
      orderDate.getMonth() === now.getMonth() &&
      orderDate.getFullYear() === now.getFullYear()
    );
  }
  if (range === "year") {
    return orderDate.getFullYear() === now.getFullYear();
  }
  return true;
}

function matchesSearch(order, searchTerm) {
  if (!searchTerm) return true;
  const term = searchTerm.toLowerCase();
  return (
    (order.item?.name || "").toLowerCase().includes(term) ||
    (order.item?.brand || "").toLowerCase().includes(term) ||
    (order.buyerEmail || "").toLowerCase().includes(term) ||
    (order.id || "").toLowerCase().includes(term)
  );
}

function orderRow(order) {
  const subtotal = Number(order.subtotal) || 0;
  const isPaid = order.status === "succeeded";

  return `
    <tr class="product-row" data-doc-id="${order.docId}">
      <td>
        <div class="product-info">
          <div class="product-details">
            <p class="product-id" title="${order.id}">#${(order.id || "").slice(-8)}</p>
          </div>
        </div>
      </td>
      <td>
        <div class="date-info">
          <span class="date">${toDate(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
      </td>
      <td>
        <div class="customer-info">
          <span class="customer-name">${order.buyerEmail || "--"}</span>
        </div>
      </td>
      <td>
        <div class="items-info">
          <span class="items">${order.item?.name || "--"}${order.item?.brand ? " (" + order.item.brand + ")" : ""}</span>
        </div>
      </td>
      <td>
        <div class="total-info">
          <span class="total">$${subtotal.toFixed(2)}</span>
        </div>
      </td>
      <td>
        <div class="status-info">
          <span class="status-badge ${isPaid ? "active" : "pending"}">${order.fulfillmentStatus || "pending"}</span>
        </div>
      </td>
      <td>
        <div class="payment-info">
          <span class="payment-method">Card</span>
          <span class="payment-status">${isPaid ? "Paid" : "Unpaid"}</span>
        </div>
      </td>
      <td>
        <div class="action-buttons">
          <button class="action-button view">View Details</button>
        </div>
      </td>
    </tr>
  `;
}

// Mirrors orderRow's 8-column shape so the table doesn't reflow when real
// rows swap in.
function orderSkeletonRow() {
  return `
    <tr class="product-row skeleton-item">
      ${Array.from({ length: 8 }, () => `<td><span class="skeleton skeleton-line medium"></span></td>`).join("")}
    </tr>
  `;
}

function renderOrderSkeletons(count = 5) {
  const tbody = document.querySelector(".order-table tbody");
  if (!tbody) return;
  tbody.innerHTML = Array.from({ length: count }, orderSkeletonRow).join("");
}

function renderOrders(orders) {
  const tbody = document.querySelector(".order-table tbody");
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="default-paragraph" style="text-align:center; padding: 24px;">No orders match this view.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(orderRow).join("");
}

/**
 * Trend indicators compare against a FIXED calendar month-over-month
 * window, independent of whatever range the page's own filter is set to --
 * the HTML label literally says "Compared to last month," so changing what
 * it actually compares against based on the filter would make that label
 * lie. allOrders (unfiltered) is always used here, not the filtered set.
 *
 * "Pending Orders" here counts by order.status !== "succeeded" (Stripe
 * payment status), not fulfillmentStatus -- i.e. it's "awaiting payment
 * capture", a real and normally short-lived state now that orders get
 * created at checkout submit instead of only after payment succeeds.
 */

function isInCalendarMonth(order, year, month) {
  const d = toDate(order.createdAt);
  return d.getFullYear() === year && d.getMonth() === month;
}

function percentChange(current, previous) {
  if (previous === 0) {
    // No baseline to compare against -- not 0% (which would imply "no
    // change" from a real number), and not a divide-by-zero NaN either.
    return current === 0 ? null : Infinity;
  }
  return ((current - previous) / previous) * 100;
}

function renderTrend(articleId, current, previous, { isCurrency = false } = {}) {
  const trendIcon = document.querySelector(`#${articleId} .trend-icon`);
  const trendStatus = document.querySelector(`#${articleId} .trend-status`);
  if (!trendIcon || !trendStatus) return;

  const change = percentChange(current, previous);

  if (change === null) {
    trendIcon.className = "trend-icon";
    trendIcon.innerHTML = "";
    trendStatus.className = "trend-status";
    trendStatus.textContent = "No data last month";
    return;
  }

  const isUp = change >= 0;
  trendIcon.className = `trend-icon ${isUp ? "up" : "down"}`;
  trendIcon.innerHTML = `<i class="fa-solid fa-arrow-trend-${isUp ? "up" : "down"}"></i>`;
  trendStatus.className = `trend-status ${isUp ? "up" : "down"}`;

  trendStatus.textContent =
    change === Infinity
      ? "New this month"
      : `${isUp ? "+" : ""}${change.toFixed(1)}%`;
}

function updateTrends(allOrders) {
  const now = new Date();
  const thisMonthOrders = allOrders.filter((o) => isInCalendarMonth(o, now.getFullYear(), now.getMonth()));

  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthOrders = allOrders.filter((o) =>
    isInCalendarMonth(o, lastMonthDate.getFullYear(), lastMonthDate.getMonth())
  );

  const thisMonthRevenue = thisMonthOrders.reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0);
  const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0);

  const thisMonthAOV = thisMonthOrders.length > 0 ? thisMonthRevenue / thisMonthOrders.length : 0;
  const lastMonthAOV = lastMonthOrders.length > 0 ? lastMonthRevenue / lastMonthOrders.length : 0;

  const thisMonthPending = thisMonthOrders.filter((o) => o.status !== "succeeded").length;
  const lastMonthPending = lastMonthOrders.filter((o) => o.status !== "succeeded").length;

  renderTrend("total-orders", thisMonthOrders.length, lastMonthOrders.length);
  renderTrend("total-revenue", thisMonthRevenue, lastMonthRevenue, { isCurrency: true });
  renderTrend("average-order-value", thisMonthAOV, lastMonthAOV, { isCurrency: true });
  renderTrend("pending-orders", thisMonthPending, lastMonthPending);
}

function updateStats(orders) {
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const pendingOrders = orders.filter((o) => o.status !== "succeeded").length;

  setStat("total-orders", totalOrders.toLocaleString());
  setStat("total-revenue", `$${totalRevenue.toFixed(2)}`);
  setStat("average-order-value", `$${averageOrderValue.toFixed(2)}`);
  setStat("pending-orders", pendingOrders);
}

function setStat(articleId, value) {
  const el = document.querySelector(`#${articleId} .stat-number`);
  if (el) el.textContent = value;
}

async function fetchSellerOrders(userId) {
  const ordersRef = collection(db, "orders");
  const q = query(ordersRef, where("sellerId", "==", userId));
  const snapshot = await getDocs(q);

  // docId is the actual Firestore document id -- distinct from order.id,
  // which is the Stripe payment intent id. PUT/DELETE /orders/:id key off
  // the Firestore doc, so this has to be captured here or there's no way
  // to address a specific order for the ship/deliver/cancel actions below.
  return snapshot.docs.map((docSnap) => ({ ...docSnap.data(), docId: docSnap.id }));
}

function applyFiltersAndRender(allOrders, range, searchTerm) {
  const filtered = allOrders.filter(
    (order) => isWithinRange(order, range) && matchesSearch(order, searchTerm)
  );

  renderOrders(filtered);
  updateStats(filtered);
}

function wireControls(allOrders) {
  const rangeSelect = document.getElementById("orders-filter");
  const filterBtn = document.getElementById("orders-filter-btn");
  const searchInput = document.querySelector("#orders-filters .search-bar input");
  const form = document.getElementById("orders-filters");

  // The form has no submit handler today, and a bare <button type="button">
  // inside a <form> won't submit it anyway -- but guard against a future
  // type="submit" change causing a real page reload here regardless.
  if (form) {
    form.addEventListener("submit", (e) => e.preventDefault());
  }

  const rerender = () => {
    const range = rangeSelect ? rangeSelect.value : "all";
    const term = searchInput ? searchInput.value.trim() : "";
    applyFiltersAndRender(allOrders, range, term);
  };

  if (rangeSelect) rangeSelect.addEventListener("change", rerender);
  if (filterBtn) filterBtn.addEventListener("click", rerender);
  if (searchInput) searchInput.addEventListener("input", rerender);
}

// Re-fetches and re-renders after a ship/deliver/cancel action, without
// re-attaching the filter/search listeners wireControls sets up -- those
// only need wiring once, and doing it again on every action would stack
// duplicate listeners each time.
async function refreshOrders(userId) {
  currentOrders = await fetchSellerOrders(userId);

  const rangeSelect = document.getElementById("orders-filter");
  const searchInput = document.querySelector("#orders-filters .search-bar input");
  const range = rangeSelect ? rangeSelect.value : "all";
  const term = searchInput ? searchInput.value.trim() : "";

  applyFiltersAndRender(currentOrders, range, term);
  updateTrends(currentOrders);
}

function getOrderActionState(order) {
  const status = order.fulfillmentStatus || "pending";
  return {
    status,
    canShip: status === "pending" || status === "processing",
    canDeliver: status === "shipped",
    canCancel: status === "pending" || status === "processing",
  };
}

function showActionError(message) {
  const errorEl = document.querySelector("#seller-order-action-menu .order-action-error");
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.classList.toggle("visible", Boolean(message));
}

function openOrderActionMenu(order) {
  const menu = document.getElementById("seller-order-action-menu");
  if (!menu) return;

  menu.dataset.docId = order.docId;
  showActionError("");

  const { status, canShip, canDeliver, canCancel } = getOrderActionState(order);

  menu.querySelector(".seller-order-action-item-name").textContent = order.item?.name || "Item";
  menu.querySelector(".seller-order-action-status").textContent = `Status: ${status}`;
  menu.querySelector(".seller-order-action-ship-fields").style.display = canShip ? "flex" : "none";
  menu.querySelector("#seller-mark-delivered-btn").style.display = canDeliver ? "block" : "none";
  menu.querySelector("#seller-cancel-order-btn").style.display = canCancel ? "block" : "none";

  document.getElementById("seller-tracking-number").value = order.trackingNumber || "";
  document.getElementById("seller-shipping-carrier").value = order.shippingCarrier || "";

  menu.classList.add("active");
}

function closeOrderActionMenu() {
  document.getElementById("seller-order-action-menu")?.classList.remove("active");
}

async function patchOrder(docId, body) {
  const response = await fetch(`/orders/${docId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${currentUser.idToken}`,
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Update failed");
  return result;
}

async function cancelOrder(docId) {
  const response = await fetch(`/orders/${docId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${currentUser.idToken}`,
    },
    body: JSON.stringify({}),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Cancel failed");
  return result;
}

// Delegated to the table itself (not per-row) so re-rendered rows after
// every filter/search/refresh stay wired without re-attaching listeners.
function wireOrderActions(userId) {
  const table = document.querySelector(".order-table");
  const menu = document.getElementById("seller-order-action-menu");
  const closeBtn = document.getElementById("close-seller-order-action-menu");
  const shipBtn = document.getElementById("seller-mark-shipped-btn");
  const deliverBtn = document.getElementById("seller-mark-delivered-btn");
  const cancelBtn = document.getElementById("seller-cancel-order-btn");

  if (table) {
    table.addEventListener("click", (e) => {
      const viewBtn = e.target.closest(".action-button.view");
      if (!viewBtn) return;

      const docId = viewBtn.closest("tr")?.dataset.docId;
      const order = currentOrders.find((o) => o.docId === docId);
      if (order) openOrderActionMenu(order);
    });
  }

  if (closeBtn) closeBtn.addEventListener("click", closeOrderActionMenu);

  if (shipBtn) {
    shipBtn.addEventListener("click", async () => {
      const docId = menu.dataset.docId;
      const trackingNumber = document.getElementById("seller-tracking-number").value.trim();
      const shippingCarrier = document.getElementById("seller-shipping-carrier").value.trim();

      if (!trackingNumber) {
        showActionError("Tracking number is required.");
        return;
      }

      try {
        await patchOrder(docId, { fulfillmentStatus: "shipped", trackingNumber, shippingCarrier });
        closeOrderActionMenu();
        await refreshOrders(userId);
      } catch (error) {
        showActionError(error.message);
      }
    });
  }

  if (deliverBtn) {
    deliverBtn.addEventListener("click", async () => {
      const docId = menu.dataset.docId;

      try {
        await patchOrder(docId, { fulfillmentStatus: "delivered" });
        closeOrderActionMenu();
        await refreshOrders(userId);
      } catch (error) {
        showActionError(error.message);
      }
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", async () => {
      const docId = menu.dataset.docId;

      try {
        await cancelOrder(docId);
        closeOrderActionMenu();
        await refreshOrders(userId);
      } catch (error) {
        showActionError(error.message);
      }
    });
  }
}

async function loadOrdersTab(userId) {
  if (!userId) {
    console.error("loadOrdersTab: no userId provided");
    return;
  }

  renderOrderSkeletons();

  try {
    currentOrders = await fetchSellerOrders(userId);

    wireControls(currentOrders);
    wireOrderActions(userId);
    applyFiltersAndRender(currentOrders, "all", "");
    updateTrends(currentOrders);
  } catch (error) {
    console.error("Error loading orders tab:", error);
  }
}

await loadOrdersTab(currentUser.userId);