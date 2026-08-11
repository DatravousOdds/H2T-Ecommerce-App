import { checkUserStatus } from '../auth/auth.js';
import { initCartDrawer } from '../components/cartDrawer.js';

initCartDrawer();

// order.createdAt is a raw Stripe unix-seconds number, not a Firestore
// Timestamp at all (see buildOrderDataFromPaymentIntent in server.js).
// order.shippedAt/deliveredAt ARE Firestore Timestamps, but this page reads
// them through a JSON REST endpoint rather than the live SDK, so they
// arrive as {seconds, nanoseconds} plain objects with no working .toDate()
// -- same shape/reasoning as payouts.js and profile/ui-helpers.js's own
// formatFirebaseDate. Handles both shapes since this page has both.
function formatOrderDate(value) {
    if (!value) return '';
    const seconds = typeof value === 'number' ? value : value.seconds;
    if (seconds === undefined) return '';
    return new Date(seconds * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

const TERMINAL_UNSUCCESSFUL = ['cancelled', 'refunded'];

// Carrier codes on the order doc are ShipStation's raw codes (e.g. "usps"),
// not display names -- self-ship orders can also carry whatever free-text
// the seller typed in, so this only maps the known codes and falls back to
// showing the raw value as-is for anything else.
const CARRIER_DISPLAY_NAMES = {
    usps: 'USPS',
    ups: 'UPS',
    ups_walleted: 'UPS',
    fedex: 'FedEx',
    fedex_walleted: 'FedEx',
    stamps_com: 'USPS',
};

const searchParams = new URLSearchParams(window.location.search);
const orderId = searchParams.get('orderId');

const orderIdShort = document.getElementById('orderIdShort');
const trackOrderError = document.getElementById('trackOrderError');
const timelineSection = document.getElementById('timelineSection');
const orderTimeline = document.getElementById('orderTimeline');
const trackOrderColumns = document.getElementById('trackOrderColumns');
const orderSummaryCard = document.getElementById('orderSummaryCard');
const orderPriceBreakdown = document.getElementById('orderPriceBreakdown');
const messageSellerLink = document.getElementById('messageSellerLink');
const trackOrderSkeleton = document.getElementById('trackOrderSkeleton');

const currentUser = await checkUserStatus();

if (!currentUser) {
    window.location.href = '/login';
} else if (!orderId) {
    showError('No order specified.');
} else {
    await loadOrder();
}

async function loadOrder() {
    try {
        const response = await fetch(`/api/orders/by-payment-intent/${orderId}`, {
            headers: { Authorization: `Bearer ${currentUser.idToken}` }
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "We couldn't find this order.");
        }

        const order = result.data;
        const sellerProfile = await getSellerPublicProfile(order.sellerId).catch(() => ({}));

        displayOrder(order, sellerProfile);
    } catch (error) {
        console.error('Error loading order:', error);
        showError(error.message || 'Something went wrong loading this order.');
    }
}

async function getSellerPublicProfile(sellerId) {
    const response = await fetch(`/api/sellers/${sellerId}/public-profile`);
    if (!response.ok) return {};
    return await response.json();
}

function showError(message) {
    trackOrderSkeleton.style.display = 'none';
    trackOrderError.textContent = message;
    trackOrderError.style.display = 'block';
}

function displayOrder(order, sellerProfile) {
    trackOrderSkeleton.style.display = 'none';
    orderIdShort.textContent = orderId.slice(0, 8);

    if (TERMINAL_UNSUCCESSFUL.includes(order.fulfillmentStatus)) {
        trackOrderError.textContent = order.fulfillmentStatus === 'cancelled'
            ? 'This order was cancelled.'
            : 'This order was refunded.';
        trackOrderError.style.display = 'block';
    } else {
        timelineSection.style.display = '';
        orderTimeline.innerHTML = buildTimelineHTML(order);
    }

    trackOrderColumns.style.display = '';
    orderSummaryCard.innerHTML = buildOrderSummaryHTML(order, sellerProfile);
    orderPriceBreakdown.innerHTML = buildPriceBreakdownHTML(order);

    // No buyer<->seller messaging system exists yet -- routes to the
    // existing support contact page rather than exposing a seller's
    // personal email address.
    messageSellerLink.href = `/contact?order=${orderId}`;
}

// Only 3 real, timestamp-backed stages exist -- there's no "out for
// delivery" status or timestamp anywhere in this app's order model (no
// carrier-tracking webhook reports it), so it's left out rather than shown
// as an undated placeholder step.
function buildTimelineHTML(order) {
    const isShipped = ['shipped', 'delivered'].includes(order.fulfillmentStatus);
    const isDelivered = order.fulfillmentStatus === 'delivered';

    const steps = [
        {
            label: 'Order Placed',
            description: 'We have received your order and payment.',
            date: order.createdAt,
            completed: true,
        },
        {
            label: 'Shipped',
            description: 'The seller dropped off your package and it is on the way.',
            date: order.shippedAt,
            completed: isShipped,
        },
        {
            label: 'Delivered',
            description: 'Your package was successfully delivered to your address.',
            date: order.deliveredAt,
            completed: isDelivered,
        },
    ];

    return steps.map((step, index) => `
        <div class="timeline-step ${step.completed ? 'completed' : ''}">
            <div class="timeline-row">
                <div class="timeline-circle">
                    ${step.completed ? '<i class="fa-solid fa-check"></i>' : ''}
                </div>
                ${index < steps.length - 1 ? '<div class="timeline-line"></div>' : ''}
            </div>
            <div class="timeline-label">
                <h4>${step.label}</h4>
                <p>${step.description}</p>
                ${step.date ? `<span class="timeline-date">${formatOrderDate(step.date)}</span>` : ''}
            </div>
        </div>
    `).join('');
}

function formatCarrierName(carrier) {
    if (!carrier) return '';
    return CARRIER_DISPLAY_NAMES[carrier.toLowerCase()] || carrier;
}

function buildOrderSummaryHTML(order, sellerProfile) {
    const item = order.item || {};
    const image = item.image || '/images/HypebeastBG.jpeg';
    const totalRatings = sellerProfile.ratings?.metrics?.totalRatings || 0;

    const ratingHTML = totalRatings > 0
        ? `<span class="seller-rating-stars">${renderStars(sellerProfile.stats?.rating || 0)}</span>`
        : '';

    const trackingHTML = order.trackingNumber
        ? `
            <div class="tracking-row">
                <i class="fa-solid fa-truck"></i>
                <span>Tracking Number: <strong>${order.trackingNumber}</strong></span>
            </div>
            ${order.shippingCarrier ? `<div>Shipping Carrier: ${formatCarrierName(order.shippingCarrier)}</div>` : ''}
        `
        : `<div class="tracking-row"><i class="fa-solid fa-truck"></i><span>Not yet shipped</span></div>`;

    return `
        <div class="product-info-wrapper">
            <img src="${image}" alt="${item.name || 'Item'}" />
            <div class="product-info">
                <p class="product-name">${item.name || 'Item'}</p>
                ${item.size ? `<p class="product-meta">Size: ${item.size}</p>` : ''}
                <p class="product-price">$${formatItemPrice(order)}</p>
            </div>
        </div>

        <a class="seller-profile" href="/sellerProfile?id=${order.sellerId}">
            <img class="seller-profile-picture" src="${sellerProfile.profileImage || '/images/default-avatar.svg'}" alt="" />
            <div>
                <p class="seller-name">@${sellerProfile.username || 'Seller'}</p>
                ${ratingHTML}
            </div>
        </a>

        <div class="shipping-info">
            ${trackingHTML}
        </div>
    `;
}

function renderStars(rating) {
    const filledCount = Math.round(rating);
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
        starsHtml += i <= filledCount
            ? '<i class="fa-solid fa-star"></i>'
            : '<i class="fa-regular fa-star"></i>';
    }
    return starsHtml;
}

// order.subtotal is actually the full charged PaymentIntent amount (see
// buildOrderDataFromPaymentIntent in server.js -- (paymentData.amount /
// 100), a misleading field name), not the item price alone. The item price
// isn't stored anywhere on the order doc directly, so it's back-computed
// here instead -- purchases.js currently treats order.subtotal as the item
// price and adds shipping+tax on top of it, which double-counts tax and
// omits marketplace fee from its displayed total; this page uses the
// correct math instead of copying that bug.
function computeBreakdown(order) {
    const total = Number(order.subtotal || 0);
    const shippingCost = Number(order.shippingCost || 0);
    const salesTax = Number(order.item?.salesTax || 0);
    const marketplaceFee = Number(order.item?.marketplaceFee || 0);
    const itemPrice = total - shippingCost - salesTax - marketplaceFee;

    return { itemPrice, shippingCost, salesTax, marketplaceFee, total };
}

function formatItemPrice(order) {
    return computeBreakdown(order).itemPrice.toFixed(2);
}

function buildPriceBreakdownHTML(order) {
    const { itemPrice, shippingCost, salesTax, marketplaceFee, total } = computeBreakdown(order);

    return `
        <div class="line-item-container">
          <dt>Subtotal</dt>
          <dd>$${itemPrice.toFixed(2)}</dd>
        </div>
        <div class="line-item-container">
          <dt>Shipping</dt>
          <dd>${shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}</dd>
        </div>
        <div class="line-item-container">
          <dt>Tax</dt>
          <dd>$${salesTax.toFixed(2)}</dd>
        </div>
        <div class="line-item-container">
          <dt>Discount</dt>
          <dd>$0.00</dd>
        </div>
        <div class="line-item-container">
          <dt>Marketplace fee</dt>
          <dd>$${marketplaceFee.toFixed(2)}</dd>
        </div>
        <hr>
        <div class="line-item-container total-row">
          <dt>Total</dt>
          <dd class="total-cost">$${total.toFixed(2)}</dd>
        </div>
    `;
}
