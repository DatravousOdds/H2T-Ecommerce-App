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

/**
 * Real order shape, written by handlePaymentIntentSucceeded() in server.js
 * (the only code path that ever creates an order doc -- triggered by the
 * Stripe payment_intent.succeeded webhook):
 *   { id, buyerId, sellerId, buyerEmail, createdAt, subtotal, status,
 *     shippingCost, shippingAddress, item: { name, size, brand, image,
 *     salesTax, marketplaceFee } }
 *
 * Two gotchas handled explicitly below, not assumed away:
 *   - subtotal is a STRING (server does .toFixed(2)) -- summing without
 *     Number() does string concatenation, not addition.
 *   - createdAt is a raw Stripe Unix timestamp in SECONDS, not a Firestore
 *     Timestamp -- different shape than listings.createdAt in products.js.
 *
 * Per the decision already made: orders only ever get created already
 * "succeeded" (that's the only webhook event that writes one), so there's
 * no real concept of a "pending" order yet. Pending Orders is correctly 0
 * given the current architecture -- not a bug, a consequence of it.
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
    <tr class="product-row">
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
          <span class="status-badge ${isPaid ? "active" : "pending"}">${order.status || "unknown"}</span>
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

function renderOrders(orders) {
  const tbody = document.querySelector(".order-table tbody");
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="default-paragraph" style="text-align:center; padding: 24px;">No orders match this view.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(orderRow).join("");
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

  // No historical baseline exists to compare against yet, so the trend
  // indicators (the +10.5%/last-month text from the static markup) are
  // left untouched rather than filled with a fabricated comparison.
}

function setStat(articleId, value) {
  const el = document.querySelector(`#${articleId} .stat-number`);
  if (el) el.textContent = value;
}

async function fetchSellerOrders(userId) {
  const ordersRef = collection(db, "orders");
  const q = query(ordersRef, where("sellerId", "==", userId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => docSnap.data());
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

async function loadOrdersTab(userId) {
  if (!userId) {
    console.error("loadOrdersTab: no userId provided");
    return;
  }

  try {
    const allOrders = await fetchSellerOrders(userId);

    wireControls(allOrders);
    applyFiltersAndRender(allOrders, "all", "");
  } catch (error) {
    console.error("Error loading orders tab:", error);
  }
}

await loadOrdersTab(currentUser.userId);