

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