import { collection, query, where, db, getDocs } from '../api/firebase-client.js';
import { getProductData } from '../pages/product.js';


const searchQuery = new URLSearchParams(window.location.search);
const productId = searchQuery.get('id');
const productData = await getProductData(productId);

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
        console.log(startDate)
        await updateData(startDate, endDate);
        
    })
})

function formatFilter(filter) {
    const amountStr = filter.split(" ")[0];
    const amount = parseInt(amountStr);
    console.log(amount)
    const type = filter.split(" ")[1];

    const today = new Date();
    let endDate = new Date(today);
    let startDate;

    console.log("amount:", amountStr);
    console.log("type:", type);

    switch (type) {
        case "month":
            startDate = new Date(today.getFullYear(), today.getMonth() - amount, 1);
            console.log("Start:", startDate, "End:", endDate);
            break;
        case "year":
        case "ytd":
            startDate = new Date(today.getFullYear(),0,1);
            console.log("Start:", startDate, "End:", endDate);
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
        ({ dates, prices } = await fetchSalesPrices(start, end, productData.productName, productData.brand));
    } catch (error) {
        // e.g. Firestore permission errors for unauthenticated users — treat like no data
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

async function fetchSalesPrices(startDate = null, endDate = null, productName, brand) {
    let q;

    // createdAt is stored as Unix seconds (see server.js webhook handler), not a Firestore Timestamp
    if (startDate && endDate) {
       q = query(
        collection(db, "orders"),
        where("createdAt", ">=", Math.floor(startDate.getTime() / 1000)),
        where("createdAt", "<=", Math.floor(endDate.getTime() / 1000)),
        );
    } else {
        q = query(collection(db, "orders"))
    }

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return { dates: [], prices: []}
    }

    const prices = [];
    const dates = [];

    querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const item = data.item;

        // orders store a single "item" object (name/brand), not an "items" array
        if (item && item.name === productName && item.brand === brand) {
            dates.push(new Date(data.createdAt * 1000));
            prices.push(parseFloat(data.subtotal));
        }
    })

    return { dates, prices }
}