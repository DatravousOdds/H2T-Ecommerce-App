"use strict";

import {
  db,
  collection,
  doc,
  getDocs,
  query,
  where,
  limit,
  orderBy
} from "../../api/firebase-client.js";
import { formatFirebaseDate, formatRelativeTime } from "./ui-helpers.js";

// ---------------------------------------------------------------------------
// Database loads
// ---------------------------------------------------------------------------

export async function loadAllPayouts(userData, filterType = "all") {
  if (!userData) return null;
  try {
    const userProfileRef = doc(db, "userProfiles", userData.email);
    const payoutsRef = collection(userProfileRef, "payouts");

    let payoutsQuery = payoutsRef;
    if (filterType === "today") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      payoutsQuery = query(
        payoutsRef,
        where("date", ">=", startOfDay),
        where("date", "<=", endOfDay)
      );
    } else {
      payoutsQuery = query(payoutsRef);
    }

    const allPayouts = await getDocs(payoutsQuery);

    const payoutsArray = allPayouts.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    updatePayoutsDisplay(payoutsArray);

    return payoutsArray;
  } catch (error) {
    console.error("Error happen when fetching payout", error);
    return [];
  }
}

export async function updatePayoutDisplay(userData, filterType) {
  try {
    const payoutsRef = collection(
      db,
      "userProfiles",
      userData.email,
      "payouts"
    );
    const filteredPayouts = filterPayouts(payoutsRef, filterType);
    const querySnapshot = await getDocs(filteredPayouts);

    const payoutList = document.querySelector("#payouts-list");
    if (!payoutList) return;

    payoutList.innerHTML = "";

    if (querySnapshot.empty) {
      payoutList.innerHTML = `
      <!-- No current payouts Modal -->
              <div id="no-payouts-menu" class="no-payouts-menu">
                <div class="p-container">
                  <div class="no-payout-icons">
                    <div class="no-payouts-inner-circle">
                      <i class="fa-solid fa-calendar"></i>
                    </div>
                  </div>
                  <div class="no-payouts-subheader">
                    <h2>No payouts for today</h2>
                  </div>
                  <div class="no-payout-description">
                    <p>
                      Payouts will appear here when you receive new orders. They
                      typically process within 2-3 business days
                    </p>
                  </div>
                </div>
              </div>
      `;
    } else {
      querySnapshot.forEach((doc) => {
        const payoutElement = document.createElement("div");
        payoutElement.classList.add("payouts-item");

        payoutElement.innerHTML = `
  <!-- Wrapper OrderId/Date -->
              <div class="payouts-item-wrapper">
                <p class="default-paragraph payout-id">Order #${
                  doc.data().orderId
                }</p>
                <p class="default-paragraph payout-date" id="payout-date">
                  ${formatFirebaseDate(doc.data().processingDate)}
                </p>
              </div>

              <!-- Wrapper Amount/Status -->
              <div class="payouts-item-wrapper space-between">
                <p
                  class="default-paragraph payout-amount"
                  id="payout-amount"
                >
                  $${doc.data().amount.toFixed(2)}
                </p>
                <p
                  class="status default-paragraph ${
                    doc.data().status
                  } payout-status"
                  id="payout-status"
                >
                  ${
                    doc.data().status.charAt(0).toUpperCase() +
                    doc.data().status.slice(1)
                  }
                </p>
              </div>
  `;

        payoutList.appendChild(payoutElement);
      });
    }
  } catch (error) {
    console.error("Error updating payout display:", error);
  }
}

export async function updatePayoutStats(payoutsRef) {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const statsQuery = query(
      payoutsRef,
      where("processingDate", ">=", monthStart)
    );
    const statsSnapshot = await getDocs(statsQuery);

    let stats = {
      completed: 0,
      processing: 0,
      pending: 0,
      total: 0
    };

    statsSnapshot.forEach((doc) => {
      const data = doc.data();
      stats[data.status]++;
      stats.total += data.amount;
    });

    document.querySelector("#completed-count").textContent = stats.completed;
    document.querySelector("#processing-count").textContent = stats.processing;
    document.querySelector("#pending-count").textContent = stats.pending;
    document.querySelector(
      "#total-amount"
    ).textContent = `$${stats.total.toFixed(2)}`;

    return stats;
  } catch (error) {
    console.error("Error updating payout stats:", error);
  }
}

// ---------------------------------------------------------------------------
// UI display
// ---------------------------------------------------------------------------

export function updatePayoutsDisplay(payouts) {
  const filterPayoutList = document.querySelector(".filter-payout-list");
  if (!filterPayoutList) return;

  filterPayoutList.innerHTML = "";

  if (!payouts || payouts.length === 0) {
    showNoPayoutsModal(filterPayoutList);
  }

  payouts.forEach((payout) => {
    const payoutItemDiv = document.createElement("div");
    payoutItemDiv.className = "filter-payout-item";
    payoutItemDiv.innerHTML = `
                      <p class="default-paragraph" id="order-date">
                        ${formatRelativeTime(payout.date)}
                      </p>
                      <p class="default-paragraph" id="order-id">
                        #${payout.orderId}
                      </p>
                      <p class="default-paragraph" id="order-type">
                        ${payout.type}
                      </p>
                      <p class="default-paragraph" id="order-amount">$${
                        payout.amount
                      }</p>
                      <div class="status-wrapper">
                        <p class="default-paragraph" id="order-status">
                          ${payout.status}
                        </p>
                      </div>
                      <p class="default-paragraph" id="order-processingDate">
                        ${formatRelativeTime(payout.processingDate)}
                      </p>
                    `;
    filterPayoutList.appendChild(payoutItemDiv);
  });
}

export function updateStatisticsDisplay(stats) {
  document.querySelector(
    "#totalPayoutAmount"
  ).textContent = `$${stats.total.toFixed(2)}`;
  document.querySelector("#completed-payouts").textContent = stats.completed;
  document.querySelector("#pending-payouts").textContent = stats.pending;
  document.querySelector("#processing-payouts").textContent = stats.processing;
}

function showNoPayoutsModal(container) {
  container.innerHTML = `<div id="no-payouts-menu" class="no-payouts-menu">
                <div class="p-container">
                  <div class="no-payout-icons">
                    <div class="no-payouts-inner-circle">
                      <i class="fa-solid fa-calendar"></i>
                    </div>
                  </div>
                  <div class="no-payouts-subheader">
                    <h2>No payouts today</h2>
                  </div>
                  <div class="no-payout-description">
                    <p>
                      Payouts will appear here when you receive new orders. They
                      typically process within 2-3 business days
                    </p>
                  </div>
                </div>
              </div>`;
}

// ---------------------------------------------------------------------------
// Filtering / sorting helpers
// ---------------------------------------------------------------------------

/**
 * @param {*} payoutRef - Firestore collection reference to query against
 * @param {string} filterType - the applied filter
 * @returns the filtered (or unfiltered) query
 */
function filterPayouts(payoutRef, filterType) {
  let baseQuery;

  switch (filterType) {
    case "pending":
      baseQuery = query(
        payoutRef,
        where("status", "==", filterType),
        orderBy("processingDate", "desc"),
        limit(2)
      );
      return baseQuery;

    case "today": {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      baseQuery = query(
        payoutRef,
        where("processingDate", ">=", todayStart),
        orderBy("processingDate", "desc"),
        limit(2)
      );
      return baseQuery;
    }
    case "this-week": {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      baseQuery = query(
        payoutRef,
        where("processingDate", ">=", weekStart),
        orderBy("processingDate", "desc"),
        limit(2)
      );
      return baseQuery;
    }
    case "this-month": {
      const now = new Date();
      // NOTE: original code had a typo here (`now, getMonth()` as two args
      // to `new Date`, plus an undefined global `getMonth()` call) which
      // would throw if this branch ever ran. Fixed to use now.getMonth().
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      baseQuery = query(
        payoutRef,
        where("processingDate", ">=", monthStart),
        orderBy("processingDate", "desc"),
        limit(2)
      );
      return baseQuery;
    }
    case "completed":
      baseQuery = query(
        payoutRef,
        where("status", "==", filterType),
        orderBy("processingDate", "desc"),
        limit(2)
      );
      return baseQuery;

    case "processing":
      baseQuery = query(
        payoutRef,
        where("status", "==", filterType),
        orderBy("processingDate", "desc"),
        limit(2)
      );
      return baseQuery;

    default:
      baseQuery = query(payoutRef, orderBy("processingDate", "desc"), limit(2));
      return baseQuery;
  }
}

function filterPayoutsByDate(payouts, filterType) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (filterType) {
    case "today":
      return payouts.filter((payout) => {
        const payoutDate = new Date(payout.date.seconds * 1000);
        payoutDate.setHours(0, 0, 0, 0);
        return payoutDate.getTime() === today.getTime();
      });
    case "all":
    default:
      return payouts;
  }
}

function sortPayouts(payouts, sortType) {
  return [...payouts].sort((a, b) => {
    const dateA = new Date(a.date.seconds * 1000);
    const dateB = new Date(b.date.seconds * 1000);

    switch (sortType) {
      case "newest":
        return dateB - dateA;
      case "oldest":
        return dateA - dateB;
      default:
        console.warn("Invalid sort type:", sortType);
        return dateB - dateA;
    }
  });
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

export async function initializePayoutsFilters(userData) {
  const filterSelect = document.querySelector(".payout-filter");
  if (!filterSelect) return;

  filterSelect.addEventListener("change", async (e) => {
    try {
      await updatePayoutDisplay(userData, e.target.value);
    } catch (error) {
      console.error("Error filtering payouts:", error);
    }
  });
}

export async function initializeAllPayoutsFilters(userData) {
  const payoutsFilter = document.querySelector(
    ".view-all-payouts-container #payouts-filter"
  );
  const payoutsSort = document.querySelector(
    ".view-all-payouts-container #payouts-sort"
  );
  if (!payoutsFilter || !payoutsSort) return;

  let payouts = await loadAllPayouts(userData);

  payoutsFilter.addEventListener("change", async () => {
    payouts = await loadAllPayouts(userData, payoutsFilter.value);
  });

  payoutsSort.addEventListener("change", () => {
    sortPayouts(payouts, payoutsSort.value);
    // updatePayoutDisplay(sortedPayouts);
  });
}

export function initPayoutsViewAll() {
  const viewPayoutsBtn = document.querySelector(".view-all-payouts-link");
  const viewPayoutsMenu = document.querySelector(".view-all-payouts-menu");
  const closePayoutsMenu = document.getElementById("close-view-all-payouts");

  if (!viewPayoutsBtn || !viewPayoutsMenu) return;

  viewPayoutsBtn.addEventListener("click", () => {
    viewPayoutsMenu.style.display = "flex";
  });
  closePayoutsMenu?.addEventListener("click", () => {
    viewPayoutsMenu.style.display = "none";
  });
}

/**
 * Wires up all payout-related sections of the page in one call.
 */
export async function initPayouts(userData) {
  initPayoutsViewAll();
  await initializePayoutsFilters(userData);
  await initializeAllPayoutsFilters(userData);
  await loadAllPayouts(userData);
}
