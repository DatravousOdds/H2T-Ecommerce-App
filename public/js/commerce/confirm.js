import { checkUserStatus } from "../auth/auth.js";
import { collection, query, where, onSnapshot, db } from "../api/firebase-client.js";
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
        const orderId = paymentIntent;

        const docRef = collection(db, "orders");

        const q = query(
            docRef,
            where("id", "==", orderId)
        )

        const unsub = onSnapshot(q, async (querySnapshot) => {
            const order = querySnapshot.docs[0].data();
            console.log(order)
            const cardDetails = await fetchCardDetails(paymentIntent);
            const orderData = {...order, ...cardDetails}
            displayOrderConfirmation(orderData);

            unsub();

        });

        
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
                            <dd id="toAddress">${orderData.shippingAddress.replace(/"/g,'')}</dd> 
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
                                    <p class="cart-item-price">$${item.price}</p>
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
                          <dd>$${item.price}</dd>
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

function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);

    const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })

    return formattedDate;
}




