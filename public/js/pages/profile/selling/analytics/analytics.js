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

/**
 * Trend indicators compare against a FIXED calendar month-over-month
 * window, independent of the page's own time filter -- same design as
 * the Orders tab. All four cards here consistently say "last month" in
 * their subtitle (unlike Overview's mixed-semantic cards), so all four
 * use the same percent-change comparison.
 */

function isInCalendarMonth(createdAt, year, month) {
  const d = toDate(createdAt);
  return d.getFullYear() === year && d.getMonth() === month;
}

function percentChange(current, previous) {
  if (previous === 0) {
    return current === 0 ? null : Infinity;
  }
  return ((current - previous) / previous) * 100;
}

function renderTrend(articleId, current, previous) {
  const icon = document.querySelector(`#${articleId} .metric-trend i`);
  const status = document.querySelector(`#${articleId} .metric-trend-status`);
  if (!icon || !status) return;

  const change = percentChange(current, previous);

  if (change === null) {
    icon.className = "fa-solid";
    status.textContent = "No data last month";
    return;
  }

  const isUp = change >= 0;
  icon.className = `fa-solid fa-arrow-trend-${isUp ? "up" : "down"}`;
  status.textContent = change === Infinity ? "New this month" : `${isUp ? "+" : ""}${change.toFixed(1)}%`;
}

function updateTrends(allOrders) {
  const now = new Date();
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonthOrders = allOrders.filter((o) => isInCalendarMonth(o.createdAt, now.getFullYear(), now.getMonth()));
  const lastMonthOrders = allOrders.filter((o) =>
    isInCalendarMonth(o.createdAt, lastMonthDate.getFullYear(), lastMonthDate.getMonth())
  );

  const sumRevenue = (orders) => orders.reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0);
  const thisMonthRevenue = sumRevenue(thisMonthOrders);
  const lastMonthRevenue = sumRevenue(lastMonthOrders);

  const thisMonthAOV = thisMonthOrders.length > 0 ? thisMonthRevenue / thisMonthOrders.length : 0;
  const lastMonthAOV = lastMonthOrders.length > 0 ? lastMonthRevenue / lastMonthOrders.length : 0;

  const distinctBuyers = (orders) => new Set(orders.map((o) => o.buyerId).filter(Boolean)).size;
  const thisMonthCustomers = distinctBuyers(thisMonthOrders);
  const lastMonthCustomers = distinctBuyers(lastMonthOrders);

  renderTrend("analytics-total-revenue", thisMonthRevenue, lastMonthRevenue);
  renderTrend("analytics-total-orders", thisMonthOrders.length, lastMonthOrders.length);
  renderTrend("analytics-average-order-value", thisMonthAOV, lastMonthAOV);
  renderTrend("analytics-active-customers", thisMonthCustomers, lastMonthCustomers);
}

function setMetric(articleId, value) {
  const el = document.querySelector(`#${articleId} h1`);
  if (el) el.textContent = value;
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
    updateTrends(allOrders);
  } catch (error) {
    console.error("Error loading analytics tab:", error);
  }
}

await loadAnalyticsTab(currentUser.userId);