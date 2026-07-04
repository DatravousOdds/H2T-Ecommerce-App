const searchQuery = new URLSearchParams(window.location.search);
const productId = searchQuery.get('id');

const chartFilterBtns = document.querySelectorAll('.chart-filter-grid .filter');

const data = {
    labels: [],
    datasets: [{
        data: [],
        borderColor: '#f75f5f',
        fill: true,
        backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 300); // x0, y0, x1, y1
            gradient.addColorStop(0, 'rgba(255, 99, 132, 1)');      // Solid red at top
            gradient.addColorStop(1, 'rgba(255, 99, 132, 0)');      // Transparent at bottom
            return gradient;
        }
    }]
}

const ctx = document.getElementById('priceChart');
const emptyStateEl = document.getElementById('chartEmptyState');
const priceHistoryChart = new Chart(ctx, {
    type: 'line',
    data: data,
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                ticks: {
                    callback: function(value, index, ticks) {
                        return new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                        }).format(value)
                    }
                }
            }
        },
        plugins: {
            legend: {
                display: false
            }
        }
    }
    
})

await updateData(null, null);

chartFilterBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        const filterVal = btn.dataset.filter;
        const { startDate, endDate } = formatFilter(filterVal);
        await updateData(startDate, endDate);
    })
})

function formatFilter(filter) {
    const amount = parseInt(filter.split(" ")[0]);
    const type = filter.split(" ")[1];

    const today = new Date();
    const endDate = new Date(today);
    let startDate;

    switch (type) {
        case "month":
            startDate = new Date(today.getFullYear(), today.getMonth() - amount, 1);
            break;
        case "year":
            // Trailing N years back from today, not "since Jan 1" (that'd be YTD,
            // which doesn't match what a "1Y" button implies).
            startDate = new Date(today.getFullYear() - amount, today.getMonth(), today.getDate());
            break;
        default:
          return  { startDate: null, endDate: null }
    };

    return { startDate, endDate };
}


async function updateData(start, end) {
    let dates = [];
    let prices = [];

    try {
        ({ dates, prices } = await fetchSalesPrices(start, end));
    } catch (error) {
        // e.g. network/server errors — treat like no data
        console.error("Error fetching sales prices:", error);
    }

    if (dates.length === 0 || prices.length === 0) {
        ctx.hidden = true;
        if (emptyStateEl) emptyStateEl.hidden = false;
        return;
    }

    ctx.hidden = false;
    if (emptyStateEl) emptyStateEl.hidden = true;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    priceHistoryChart.data.labels = dates.map(date => [months[date.getMonth()], date.getDate()]);
    priceHistoryChart.data.datasets[0].data = prices;
    priceHistoryChart.update();
}

export async function fetchSalesPrices(startDate = null, endDate = null) {
    // Routed through the server (not a direct Firestore read) because `orders`
    // docs carry buyer PII — see server.js's /api/products/:id/sales-history
    // for why this can't just be a public Firestore rule.
    const params = new URLSearchParams();
    if (startDate && endDate) {
        params.set("startDate", Math.floor(startDate.getTime() / 1000));
        params.set("endDate", Math.floor(endDate.getTime() / 1000));
    }

    const res = await fetch(`/api/products/${productId}/sales-history?${params}`);

    if (!res.ok) {
        throw new Error(`Failed to fetch sales history: ${res.status}`);
    }

    const sales = await res.json();

    return {
        dates: sales.map(sale => new Date(sale.createdAt * 1000)),
        prices: sales.map(sale => sale.subtotal),
    };
}