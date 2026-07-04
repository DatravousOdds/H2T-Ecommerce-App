import { checkUserStatus } from "../auth/auth.js";
import { formatFirebaseDate } from "../core/global.js";
const sessionParams = new URLSearchParams(window.location.search);
const paymentIntent =  sessionParams.get("payment_intent");
const redirectStatus = sessionParams.get("redirect_status");
const currentUser = await checkUserStatus();
const item = JSON.parse(sessionStorage.getItem('item'));
const user = currentUser;
console.log("user:", user)
console.log("item:", item)
await getOrderDetails();




async function getOrderDetails() {
    if (redirectStatus === "succeeded") {
        // Authentication payments never create an `orders` doc -- the
        // webhook updates the authenticationRequests doc instead -- so
        // there's nothing to wait on here. Everything needed to confirm
        // is already in the sessionStorage item plus the payment intent.
        if (item?.itemType === 'authentication') {
            const cardDetails = await fetchCardDetails(paymentIntent);
            displayAuthConfirmation(item, cardDetails);
            return;
        }

        const order = await fetchOrderByPaymentIntentWithRetry(paymentIntent);
        if (!order) {
            displayOrderPendingFallback();
            return;
        }

        const cardDetails = await fetchCardDetails(paymentIntent);
        const orderData = {...order, ...cardDetails}
        displayOrderConfirmation(orderData);
    }
}

// checkout.js's /orders/init call is awaited before Stripe ever redirects
// here, so the order doc should already exist -- but /orders/init is
// deliberately non-blocking on failure (payment is the critical path, not
// bookkeeping), and there's no webhook forwarding configured for local dev
// to fall back on. A couple of short retries bridges any real propagation
// lag; displayOrderPendingFallback() is what the buyer sees if the doc
// genuinely never got created.
async function fetchOrderByPaymentIntentWithRetry(paymentIntent, retries = 2, delayMs = 1000) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        const order = await fetchOrderByPaymentIntent(paymentIntent);
        if (order) return order;
        if (attempt < retries) await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return null;
}

// `orders` has no Firestore rule at all (see the Price History chart entry
// in notes.md) -- reading it straight from the client, the way this used to
// with an onSnapshot listener, always threw permission-denied. checkout.js's
// /orders/init call is awaited before Stripe redirects back here, so the doc
// is normally already there; fetchOrderByPaymentIntentWithRetry() covers the
// rest. A 404 here just means "not there yet/at all" -- not logged as an
// error since the retry wrapper treats it as an expected, retriable result.
async function fetchOrderByPaymentIntent(paymentIntent) {
    try {
        const request = await fetch(`/api/orders/by-payment-intent/${paymentIntent}`, {
            headers: {
                "Authorization": `Bearer ${user.idToken}`
            }
        });

        if (request.status === 404) return null;

        if (!request.ok) {
            throw new Error(`${request.status}`);
        }

        const result = await request.json();
        return result.data;
    } catch (error) {
        console.error("Error fetching order:", error);
        return null;
    }
}

async function fetchCardDetails(paymentIntent) {
    try {
        const request = await fetch(`/payment/card-details?id=${paymentIntent}`);

        if(!request.ok) {
            throw new Error(`${request.status}`);
        }

        const result = await request.json();
        return result;

    } catch (error) {
        console.error(error)
    }
}
function displayAuthConfirmation(item, cardDetails) {
    const detailsGrid = document.querySelector('.details-grid');
    detailsGrid.innerHTML = "";
    detailsGrid.innerHTML = `
        <div class="confirm-left-content">
                <div class="order-details">
                    <h2 class="detail-header"><i class="fa-solid fa-circle-check"></i> Payment confirmed!</h2>
                    <div class="" id="orderDetails">
                        <div class="order-content">
                            <strong><p>Your item is now queued for authentication review.</p></strong>
                            <strong><p>We'll notify you once a reviewer has confirmed the result.</p></strong>
                        </div>
                        <hr>
                        <div class="details">
                            <dt id="orderDate">Request Id:</dt>
                            <dd id="orderId">${item.authRequestId}</dd>
                        </div>
                    </div>
                </div>
            <div class="payment-details">
                <div class="order-details">
                    <h2 class="detail-header"><i class="fa-solid fa-credit-card"></i> Payment Method</h2>
                    <div class="details">
                            <dt class="card-icon">Card:</dt>
                            <dd class="card-details">${cardDetails.cardType} ****${cardDetails.last4}</dd>

                    </div>
                </div>

            </div>

            </div>
            <div class="confirm-right-content">
                <div class="order-details">
                  <h2><i class="fa-solid fa-clipboard"></i> Item Details</h2>
                    <div class="order-summary">
                        <div class="order-item">
                            <div class="product-info-wrapper">
                                <img src="${item.primaryImage}" alt="Product image" />

                                <div class="cart-product-info">
                                    <p class="cart-item-brand">${item.category}</p>
                                    <p class="cart-item-name">${item.productName}</p>
                                    <p class="cart-item-size">${item.tier?.icon || ''} ${item.tier?.name || ''} Tier</p>
                                </div>

                            </div>
                            <hr>
                            </div>
                        </div>
                </div>

                <div class="order-details">
                    <h2><i class="fa-solid fa-clipboard-list"></i> Order Summary</h2>
                    <div class="order-total">
                        <div class="line-item-container">
                          <dt>Authentication Fee:</dt>
                          <dd>$${item.cost.toFixed(2)}</dd>
                        </div>
                        <hr>
                        <div class="line-item-container">
                          <dd>Total</dd>
                          <dt class="total-cost">$${item.cost.toFixed(2)} USD</dt>
                        </div>
                    </div>

                </div>
                <div class="cta-buttons">
                        <button type="button" onclick="window.print()" class="printOrderBtn">Print receipt</button>
                        <button type="button" onclick="window.location.href='/profile?tab=selling&subtab=authentication'">View Status</button>
                </div>
            </div>
    `
};

// The payment itself already succeeded (redirectStatus === "succeeded") by
// the time this runs -- the buyer was charged regardless of whether the
// order doc shows up. Never leave the confirmation page blank over a
// bookkeeping delay; point them at Purchases instead of a dead end.
function displayOrderPendingFallback() {
    const detailsGrid = document.querySelector('.details-grid');
    detailsGrid.innerHTML = `
        <div class="confirm-left-content">
            <div class="order-details">
                <h2 class="detail-header"><i class="fa-solid fa-circle-check"></i> Payment received!</h2>
                <div class="details">
                    <strong><p>We're still finalizing your order details -- this can take a moment.</p></strong>
                    <p>Check your <a href="/profile?tab=purchases">Purchases</a> tab shortly for the full order summary.</p>
                </div>
            </div>
        </div>
    `;
};

function displayOrderConfirmation(orderData) {
    console.log("order data:",orderData)
    const detailsGrid = document.querySelector('.details-grid');
    detailsGrid.innerHTML = "";
    detailsGrid.innerHTML = `
        <div class="confirm-left-content">
                <div class="order-details">
                    <h2 class="detail-header"><i class="fa-solid fa-circle-check"></i> Your order was placed!</h2>
                    <div class="" id="orderDetails">
                        <div class="order-content">
                            <strong><p>An order confirmation. will be sent to <span class="email">${orderData.buyerEmail}</span></p></strong>
                            <strong><p>We will update order with tracking number once it has been shipped by seller</p></strong>
                        </div>
                        <hr>
                        <div class="details">
                            <dt id="orderDate">Order Date:</dt>
                            <dd id="">${formatDate(orderData.createdAt)}</dd>
                        </div>
                        <div class="details">
                            <dt id="">Order Id:</dt>
                            <dd id="orderId">${orderData.id}</dd>
                        </div>
                    </div>
                </div>
            <div class="shipment-details">
                <div class="order-details">
                    <h2 class="detail-header">
                    <i class="fa-solid fa-box-archive"></i> 
                    Shipment</h2>
                    <div class="dt-wrapper">
                        
                        <div class="details">
                            <dt>Shipping To:</dt>
                            <dd id="toAddress">${formatBuyerShippingAddress(user)}</dd>
                        </div>
                        <hr>
                        <div class="details">
                            <dt>Shipping Estimate:</dt>
                            <dd>2-3 days</dd>  
                        </div>  
                    </div>  
                </div>
                
            </div>
            <div class="payment-details">
                <div class="order-details">
                    <h2 class="detail-header"><i class="fa-solid fa-credit-card"></i> Payment Method</h2>
                    <div class="details">
                            <dt class="card-icon">Card:</dt>
                            <dd class="card-details">${orderData.cardType} ****${orderData.last4}</dd>
                        
                    </div>  
                </div>
                
            </div>

            </div>
            <div class="confirm-right-content">
                <div class="order-details">
                  <h2><i class="fa-solid fa-clipboard"></i> Order Details</h2>
                    <div class="order-summary">
                        <div class="order-item">
                            <div class="product-info-wrapper">
                                <img src="${orderData.item.image}" alt="Product image" />
                            
                                <div class="cart-product-info">
                                    <p class="cart-item-brand">${orderData.item.brand}</p>
                                    <p class="cart-item-name">${orderData.item.name}</p>
                                    <p class="cart-item-size">Size: ${orderData.item.size}</p>
                                    <p class="cart-item-price">$${item.listingPrice}</p>
                                </div>
                            
                            </div> 
                            <hr>
                            </div>
                            <div class="seller-profile">
                                <p>SOLD BY</p>
                                <div class="sell-info">
                                    <img src="${item.sellerPicture}" alt="" class="seller-profile-picture">
                                    <a href="#" class="seller-name">
                                        <span>${item.sellerName}</span>
                                    </a>
                                </div>
                                
                            </div>           
                        </div>
                </div> 
                
                <div class="order-details">
                    <h2><i class="fa-solid fa-clipboard-list"></i> Order Summary</h2>
                    <div class="order-total">
                        <div class="line-item-container">
                          <dt>Item Price:</dt>
                          <dd>$${item.listingPrice}</dd>
                        </div>
                        <div class="line-item-container">
                          <dt>Delivery Price:</dt>
                          <dd>${orderData.shippingCost === "0" ? "Free Shipping" : `$${parseFloat(orderData.shippingCost)}`}</dd>
                        </div>
                        <div class="line-item-container">
                          <dt>Marketplace fee:</dt>
                          <dd>$${orderData.item.marketplaceFee}</dd>
                        </div>
                        <div class="line-item-container">
                          <dt>Sales Tax:</dt>
                          <dd>$${orderData.item.salesTax}</dd>
                        </div>
                        <hr> 
                        <div class="line-item-container">
                          <dd>Total</dd>
                          <dt class="total-cost">$${orderData.subtotal} USD</dt>
                        </div>
                    </div>
                    
                </div>
                <div class="cta-buttons">
                        <button type="button" onclick="window.print()" class="printOrderBtn">Print receipt</button>
                        <button type="button">Track order</button>
                </div>
            </div>
    `
};

// order.shippingAddress is the seller's ship-from location (see purchases.js),
// not the buyer's delivery address -- this page's "Shipping To" needs the
// buyer's own address instead, the same source checkout.js's shipping section
// already reads from.
function formatBuyerShippingAddress(buyer) {
    if (!buyer?.shipping) return "";

    const { address, city, state, zipCode } = buyer.shipping;
    return `${buyer.firstName || ''} ${buyer.lastName || ''} -- ${address}, ${city}, ${state} ${zipCode}`.trim();
}

function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);

    const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })

    return formattedDate;
}




