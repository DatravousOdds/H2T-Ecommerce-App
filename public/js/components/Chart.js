import { checkUserStatus } from "../auth/auth.js";
import { collection, db, getDocs, query, where } from "../api/firebase-client.js";

function lastSixMonthBuckets() {
  const buckets = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ label: d.toLocaleDateString("en-US", { month: "short" }), year: d.getFullYear(), month: d.getMonth() });
  }
  return buckets;
}

// Initialize the chart using Chart.js
document.addEventListener("DOMContentLoaded", async () => {
  const ctx = document.getElementById("salesChart").getContext("2d");
  const currentUser = await checkUserStatus();

  const ordersRef = collection(db, "orders");
  const q = query(ordersRef, where("sellerId", "==", currentUser.userId));
  const snapshot = await getDocs(q);
  const orders = snapshot.docs.map((d) => d.data());

  const buckets = lastSixMonthBuckets();
  const salesByMonth = buckets.map((bucket) =>
    orders
      .filter((o) => {
        const d = new Date(o.createdAt * 1000);
        return d.getFullYear() === bucket.year && d.getMonth() === bucket.month;
      })
      .reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0)
  );

  // Fetch and format data
  const salesData = {
    labels: buckets.map((b) => b.label),
    datasets: [
      {
        label: "Sales",
        data: salesByMonth,
        borderColor: "#dc2626",
        backgroundColor: "rgba(220, 38, 38, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const config = {
    type: "line",
    data: salesData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) => `Revenue: $${context.raw.toLocaleString()}`,
          },
        },
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => `$${value.toLocaleString()}`,
          },
        },
      },
    },
  };

  new Chart(ctx, config);
});

// Initialize the chart using Chart.js
document.addEventListener("DOMContentLoaded", async () => {
  const ctx = document.getElementById("revenueChart").getContext("2d");
  const currentUser = await checkUserStatus();

  const ordersRef = collection(db, "orders");
  const q = query(ordersRef, where("sellerId", "==", currentUser.userId));
  const snapshot = await getDocs(q);
  const orders = snapshot.docs.map((d) => d.data());

  const buckets = lastSixMonthBuckets();
  const revenueByMonth = buckets.map((bucket) =>
    orders
      .filter((o) => {
        const d = new Date(o.createdAt * 1000);
        return d.getFullYear() === bucket.year && d.getMonth() === bucket.month;
      })
      .reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0)
  );

  const revenueData = {
    labels: buckets.map((b) => b.label),
    datasets: [
      {
        label: "Revenue",
        data: revenueByMonth,
        backgroundColor: "rgba(220, 38, 38, 0.1)",
        borderColor: "#dc2626",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const config = {
    type: "line",
    data: revenueData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => `Revenue: $${context.raw.toLocaleString()}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => `$${value.toLocaleString()}`,
          },
        },
      },
    },
  };

  const revenueChart = new Chart(ctx, config);
});

// Initialize the chart using Chart.js
document.addEventListener("DOMContentLoaded", async () => {
  const ctx = document.getElementById("categoryChartPie").getContext("2d");
  const currentUser = await checkUserStatus();

  // Orders have no category field on them at all -- there's no listingId
  // link from an order back to its originating listing either. So this
  // is built from current listings (what's for sale, grouped by category),
  // not historical sales by category, which the data can't support yet.
  const listingsRef = collection(db, "listings");
  const q = query(listingsRef, where("userId", "==", currentUser.userId));
  const snapshot = await getDocs(q);
  const listings = snapshot.docs.map((d) => d.data());

  const counts = {};
  listings.forEach((listing) => {
    const category = listing.category || "Uncategorized";
    counts[category] = (counts[category] || 0) + 1;
  });

  const categoryLabels = Object.keys(counts);
  const categoryValues = Object.values(counts);
  const palette = ["#dc2626", "#059669", "#0284c7", "#7c3aed", "#d97706", "#db2777"];

  const categoryData = {
    labels: categoryLabels.length ? categoryLabels : ["No listings yet"],
    datasets: [
      {
        data: categoryValues.length ? categoryValues : [1],
        backgroundColor: categoryLabels.length
          ? categoryLabels.map((_, i) => palette[i % palette.length])
          : ["#e5e7eb"],
        hoverOffset: 4,
      },
    ],
  };

  // Chart Configuration
  const pieConfig = {
    type: "pie",
    data: categoryData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 20,
            usePointStyle: true,
            pointStyle: "circle",
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const value = context.raw;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${context.label}: ${percentage}%`;
            },
          },
        },
      },
    },
  };

  const categoryChart = new Chart(ctx, pieConfig);
});

// Initialize the chart using Chart.js
document.addEventListener("DOMContentLoaded", async () => {
  const ctx = document.getElementById("orderTimelineBarChart").getContext("2d");
  const currentUser = await checkUserStatus();

  const ordersRef = collection(db, "orders");
  const q = query(ordersRef, where("sellerId", "==", currentUser.userId));
  const snapshot = await getDocs(q);
  const orders = snapshot.docs.map((d) => d.data());

  const buckets = lastSixMonthBuckets();
  const ordersByMonth = buckets.map(
    (bucket) =>
      orders.filter((o) => {
        const d = new Date(o.createdAt * 1000);
        return d.getFullYear() === bucket.year && d.getMonth() === bucket.month;
      }).length
  );

  const timelineData = {
    labels: buckets.map((b) => b.label),
    datasets: [
      {
        label: "Orders",
        data: ordersByMonth,
        backgroundColor: "#dc2626",
        hoverOffset: 4,
        borderRadius: 4,
      },
    ],
  };

  const barConfig = {
    type: "bar",
    data: timelineData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `Orders: ${context.raw}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            drawBorder: false,
          },
          ticks: {
            padding: 10,
          },
        },
        x: {
          grid: {
            display: false,
          },
          ticks: {
            padding: 10,
          },
        },
      },
    },
  };

  const orderTimelineChart = new Chart(ctx, barConfig);
});

// Function to update chart with new data
function updateChart(newData) {
  if (salesChart) {
    salesChart.data.datasets[0].data = newData;
    salesChart.update();
  }
}