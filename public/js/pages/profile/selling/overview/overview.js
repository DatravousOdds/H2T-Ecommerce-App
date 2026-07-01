"use strict";

import { checkUserStatus } from "../../../../auth/auth.js";
import { collection, doc, db, getDocs, query, where } from "../../../../api/firebase-client.js";

const currentUser = await checkUserStatus();


/**
 * Total Revenue's "+X% from last month" is a real, computable month-over-
 * month comparison -- same approach as the Orders tab's trend indicators,
 * reusing the same order data this card's own value is built from.
 *
 * Active Listings' "+X new listings this month" is a different kind of
 * metric, not a percent comparison -- its own label says "new listings
 * this month," so it's a count of listings created in the current
 * calendar month, not a vs-last-month delta.
 *
 * Products Sold's trend is intentionally left untouched (still the
 * original "+123 in the last 30 days"): fetchProductsSold queries for
 * listings where status == "sold", but nothing in this app ever writes
 * that status -- seller.js only ever creates listings as 'active'. This
 * metric is always 0 by architecture, same root cause as Pending Orders'
 * always-0 problem on the buyer side. A trend on a number that can't move
 * yet has nothing real to compute.
 */

function isInCalendarMonth(timestamp, year, month) {
  const d = new Date(timestamp * 1000);
  return d.getFullYear() === year && d.getMonth() === month;
}

function setTrend(elementId, text, direction) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.textContent = text;
  el.classList.remove("trend-positive", "trend-negative", "trend-neutral");
  el.classList.add(
    direction === "up" ? "trend-positive" : direction === "down" ? "trend-negative" : "trend-neutral"
  );
}

async function updateRevenueTrend(userId) {
  const docRef = collection(db, "orders");
  const q = query(docRef, where("sellerId", "==", userId));
  const querySnapshot = await getDocs(q);
  const orders = querySnapshot.docs.map((d) => d.data());

  const now = new Date();
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const sumFor = (year, month) =>
    orders
      .filter((o) => isInCalendarMonth(o.createdAt, year, month))
      .reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0);

  const thisMonthRevenue = sumFor(now.getFullYear(), now.getMonth());
  const lastMonthRevenue = sumFor(lastMonthDate.getFullYear(), lastMonthDate.getMonth());

  if (lastMonthRevenue === 0) {
    setTrend(
      "total-revenue-trend",
      thisMonthRevenue === 0 ? "No data last month" : "New this month",
      thisMonthRevenue === 0 ? "neutral" : "up"
    );
    return;
  }

  const change = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
  const isUp = change >= 0;
  setTrend(
    "total-revenue-trend",
    `${isUp ? "+" : ""}${change.toFixed(1)}% from last month`,
    isUp ? "up" : "down"
  );
}

async function updateActiveListingsTrend(userId) {
  const docRef = collection(db, "listings");
  const q = query(docRef, where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  const listings = querySnapshot.docs.map((d) => d.data());

  const now = new Date();
  const newThisMonth = listings.filter((listing) => {
    // listings.createdAt is a Firestore serverTimestamp() (a Timestamp
    // object with .toDate()) -- a different shape than orders.createdAt's
    // raw Stripe Unix-seconds number, same distinction made in products.js.
    if (!listing.createdAt || typeof listing.createdAt.toDate !== "function") return false;
    const d = listing.createdAt.toDate();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  setTrend(
    "active-listings-trend",
    `+${newThisMonth} new listing${newThisMonth === 1 ? "" : "s"} this month`,
    newThisMonth > 0 ? "up" : "neutral"
  );
}

function renderMetrics(revenue,activeListings,prodcutSold) {

    setMetric("total-revenue-value", revenue);
    setMetric("active-listing-value", activeListings);
    setMetric("product-sold-value", prodcutSold);
}

function setMetric(elementId, value) {
   const el = document.getElementById(elementId);
   
   if (el) {
    el.textContent = value;
   } else {
    throw new Error("Element not found!")
   }
}

async function fetchTotalRevenue(userId) {
    if (!userId) {
        throw new Error("No uid provided!");
    }

    try {
      const docRef = collection(db, 'orders');

        const q = query(docRef, where("sellerId", "==", userId));

        const querySnapshot = await getDocs(q);

        const totalRevenue = querySnapshot.docs.reduce((preValue, doc) => {
            const orderData = doc.data();
            const subtotal = orderData.subtotal;
            return parseFloat(preValue) + parseFloat(subtotal);
        }, 0)

        console.log("total revenue",totalRevenue);
        return totalRevenue;  
    } catch (error) {
        console.error("Failed to fetch total revenue: ", error)
    }
};

async function fetchActiveListings(userId) {
    if (!userId) {
        throw new Error("No uid provided!");
    }

    try {
        const docRef = collection(db, 'listings');
  
        const q = query(docRef, where("userId", "==", userId));
  
        const querySnapshot = await getDocs(q);
  
        const activeListings = querySnapshot.docs.length;

        console.log("active listing",activeListings);
        return activeListings;
  
      } catch (error) {
          console.error("Failed to fetch active listings: ", error)
      }
}

async function fetchProductsSold(userId) {
    if (!userId) {
        throw new Error("No uid provided!");
    }

    try {
        const docRef = collection(db, 'listings');
  
        const q = query(docRef, where("userId", "==", userId), where("status", "==", "sold"));
  
        const querySnapshot = await getDocs(q);
  
        const soldProducts = querySnapshot.docs.length;

        console.log("products sold",soldProducts);
        return parseInt(soldProducts);
  
      } catch (error) {
          console.error("Failed to fetch sold products: ", error)
      }
}

async function loadOverviewTab(userId) {
    if (!userId) {
        throw new Error("No uid provided!");
    }

    const totalRevenue = await fetchTotalRevenue(userId);
    const activeListings = await fetchActiveListings(userId);
    const productsSold = await fetchProductsSold(userId);

    renderMetrics(totalRevenue,activeListings,productsSold)

    await updateRevenueTrend(userId);
    await updateActiveListingsTrend(userId);

    const recentOrders = await fetchRecentOrders(userId);
    renderActivity(recentOrders);
    wireViewAllModal();

}

/**
 * Same orders shape as the rest of the Selling tab: createdAt is a raw
 * Stripe Unix timestamp in seconds, not a Firestore Timestamp.
 *
 * There's no real "Low Stock Alert" data source -- listings have no
 * stock/quantity field at all yet -- so unlike the original static markup,
 * every activity item here is a real order, not a mix of order + inventory
 * events. Showing only what's real rather than half-fabricating the rest.
 */
async function fetchRecentOrders(userId) {
    if (!userId) {
        throw new Error("No uid provided!");
    }

    try {
        const docRef = collection(db, 'orders');
        const q = query(docRef, where("sellerId", "==", userId));
        const querySnapshot = await getDocs(q);

        const orders = querySnapshot.docs.map((doc) => doc.data());

        // No orderBy in the query (would need a composite index) -- sorting
        // client-side is fine at the order volumes a seller dashboard like
        // this deals with.
        orders.sort((a, b) => b.createdAt - a.createdAt);

        return orders;
    } catch (error) {
        console.error("Failed to fetch recent orders: ", error);
        return [];
    }
}

function formatRelativeTime(createdAt) {
    const orderDate = new Date(createdAt * 1000);
    const diffMs = Date.now() - orderDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

    return orderDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function activityItemHTML(order, { expanded }) {
    const itemName = order.item?.name || "an item";
    const brand = order.item?.brand ? ` (${order.item.brand})` : "";
    const orderNumberLine = expanded
        ? `<p class="order-number">Order #${(order.id || "").slice(-10)}</p>`
        : "";

    return `
      <article class="activity-item">
        <div class="activity-icon icon-success">
          <i class="fa-solid fa-bag-shopping"></i>
        </div>
        <div class="activity-content">
          <p class="activity-title">New Order Received</p>
          <p class="default-paragraph activity-detail">${itemName}${brand}</p>
          ${orderNumberLine}
          <p class="activity-time default-paragraph">${formatRelativeTime(order.createdAt)}</p>
        </div>
      </article>
    `;
}

function renderActivity(orders) {
    const previewList = document.querySelector(".activity-list");
    const expandedList = document.querySelector(".view-all-activity-content");

    if (previewList) {
        previewList.innerHTML = orders.length
            ? orders.slice(0, 3).map((o) => activityItemHTML(o, { expanded: false })).join("")
            : `<p class="default-paragraph">No recent activity yet.</p>`;
    }

    if (expandedList) {
        expandedList.innerHTML = orders.length
            ? orders.slice(0, 20).map((o) => activityItemHTML(o, { expanded: true })).join("")
            : `<p class="default-paragraph">No activity yet.</p>`;
    }
}

function wireViewAllModal() {
    const viewAllLink = document.querySelector(".view-all-link");
    const overlay = document.querySelector(".view-all-activity-overlay");
    const closeBtn = document.querySelector(".close-view-all-activity");

    if (viewAllLink && overlay) {
        viewAllLink.addEventListener("click", (e) => {
            e.preventDefault();
            overlay.classList.add("active");
        });
    }

    if (closeBtn && overlay) {
        closeBtn.addEventListener("click", () => overlay.classList.remove("active"));
    }
}

await loadOverviewTab(currentUser.userId);