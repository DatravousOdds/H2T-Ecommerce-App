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
 * Same orders schema/gotchas as orders.js: subtotal is a string, createdAt
 * is a raw Stripe Unix timestamp in seconds. Repeated here rather than
 * shared, matching the rest of this app's pattern of each selling/<tab>
 * module being self-contained.
 */

function toDate(createdAt) {
  return new Date(createdAt * 1000);
}

function isWithinRange(order, range) {
  if (range === "all") return true;

  const orderDate = toDate(order.createdAt);
  const now = new Date();

  if (range === "today") return orderDate.toDateString() === now.toDateString();
  if (range === "week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return orderDate >= weekAgo;
  }
  if (range === "month") {
    return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
  }
  if (range === "year") return orderDate.getFullYear() === now.getFullYear();
  return true;
}

function setMetric(articleId, value) {
  const el = document.querySelector(`#${articleId} h1`);
  if (el) el.textContent = value;
  // The +10.5%/"last month" trend text is left untouched -- no historical
  // baseline exists yet to compute a real comparison against.
}

function updateMetrics(orders) {
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const activeCustomers = new Set(orders.map((o) => o.buyerId).filter(Boolean)).size;

  setMetric("analytics-total-revenue", `$${totalRevenue.toFixed(2)}`);
  setMetric("analytics-total-orders", totalOrders.toLocaleString());
  setMetric("analytics-average-order-value", `$${averageOrderValue.toFixed(2)}`);
  setMetric("analytics-active-customers", activeCustomers.toLocaleString());
}

function exportToCsv(orders) {
  const headers = ["Order ID", "Date", "Buyer Email", "Item", "Brand", "Amount", "Status"];
  const rows = orders.map((o) => [
    o.id || "",
    toDate(o.createdAt).toLocaleDateString("en-US"),
    o.buyerEmail || "",
    o.item?.name || "",
    o.item?.brand || "",
    (Number(o.subtotal) || 0).toFixed(2),
    o.status || "",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function fetchSellerOrders(userId) {
  const ordersRef = collection(db, "orders");
  const q = query(ordersRef, where("sellerId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => docSnap.data());
}

function wireControls(allOrders) {
  const timeFilter = document.getElementById("analytics-time-filter");
  const exportBtn = document.getElementById("analytics-export-btn");

  let currentFiltered = allOrders;

  if (timeFilter) {
    timeFilter.addEventListener("change", () => {
      currentFiltered = allOrders.filter((o) => isWithinRange(o, timeFilter.value));
      updateMetrics(currentFiltered);
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", () => exportToCsv(currentFiltered));
  }
}

async function loadAnalyticsTab(userId) {
  if (!userId) {
    console.error("loadAnalyticsTab: no userId provided");
    return;
  }

  try {
    const allOrders = await fetchSellerOrders(userId);
    wireControls(allOrders);
    updateMetrics(allOrders);
  } catch (error) {
    console.error("Error loading analytics tab:", error);
  }
}

await loadAnalyticsTab(currentUser.userId);