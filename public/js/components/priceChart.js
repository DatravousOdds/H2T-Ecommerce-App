const { collection, Timestamp, query, where } = require('../api/firebase-client.js');
const { getProductData } = require('../pages/product.js');

const searchQuery = new URLSearchParams(window.location.search);
const productId = searchQuery.get('id');
const productData = await getProductData(productId);

// By default get last sales - all

// fetchSalesPrices(productData.productName);
priceHistoryChart();

function priceHistoryChart() {
    const ctx = document.getElementById('priceChart');
    
    const data = {
        labels: ["Jan 18", "Feb 18", "Mar 18", "Apr 18", "May 18" ],
        datasets: [{
            data: [0,50,200,150,500],
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
    
    new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            plugins: {
                legend: {
                    display: false
                }
            }
        }
        
    })
}

async function fetchSalesPrices(startDate = null, endDate= null, productName, brand) {

    i

    const q = query(
        collection(db, "orders"),
        where("createdAt", ">=", Timestamp.fromDate(startDate)),
        where("createdAt", "<=", Timestamp.fromDate(endDate)),
    
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return { dates: [], prices: []}
    }

    const prices = [];
    const dates = [];

    querySnapshot.docs.forEach(doc => {
        // filter productName & brand
        const data = doc.data();

        dates.push(data.createdAt)

        const matchingItems = data.items.filter(item => item.productName === productName && item.brand === brand)
        .map(item => item.salePrice);

        if (matchingItems.length > 0) {
            prices.push(...matchingItems)
        }
    })

    return { dates, prices }
}