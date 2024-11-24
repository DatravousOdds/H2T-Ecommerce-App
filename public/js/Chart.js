// Initialize the chart using Chart.js
document.addEventListener("DOMContentLoaded", () => {
  const ctx = document.getElementById("salesChart").getContext("2d");

  // Fetch and format data
  const salesData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Revenue",
        data: [35231, 38420, 42150, 40280, 43900, 45231],
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
document.addEventListener("DOMContentLoaded", () => {
  const ctx = document.getElementById("revenueChart").getContext("2d");

  const revenueData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Revenue",
        data: [35231, 38420, 42150, 40280, 43900, 45231],
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

  const revenueChart = new Chart(ctx, config);
});

// Initialize the chart using Chart.js
document.addEventListener("DOMContentLoaded", () => {
  const ctx = document.getElementById("categoryChartPie").getContext("2d");

  const categoryData = {
    labels: ["Sneakers", "T-shirts", "Hoodies", "Accessories"],
    datasets: [
      {
        data: [30, 20, 10, 40],
        backgroundColor: ["#dc2626", "#059669", "#0284c7", "#7c3aed"],
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
document.addEventListener("DOMContentLoaded", () => {
  const ctx = document.getElementById("orderTimelineBarChart").getContext("2d");

  const timelineData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Orders",
        data: [10, 20, 30, 40, 50, 60],
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
