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
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }
    ]
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
            label: (context) => `Revenue: $${context.raw.toLocaleString()}`
          }
        },
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => `$${value.toLocaleString()}`
          }
        }
      }
    }
  };

  new Chart(ctx, config);
});

// Function to update chart with new data
function updateChart(newData) {
  if (salesChart) {
    salesChart.data.datasets[0].data = newData;
    salesChart.update();
  }
}
