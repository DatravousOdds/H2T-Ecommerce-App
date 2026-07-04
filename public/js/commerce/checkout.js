import { collection, getDocs, db } from '../api/firebase-client.js';
import { checkUserStatus } from '../auth/auth.js';
const stripe = Stripe("pk_test_51Tfwj9PHPIWBS1BJqszOAwKKlL5xCJGBsfTJhcbyWndXlUBiLbDsGhlmLCf7XGxdiFtamED8mlZxZbVKJDBu1tao004NMblLug");


const searchQuery = new URLSearchParams(window.location.search);
const listingId = searchQuery.get('listingId');
const authRequestId = searchQuery.get('authRequestId');
const queryItem = JSON.parse(sessionStorage.getItem('item'));

let checkout;
let actions;
let elements;
let paymentIntentId;
let currentUser = await checkUserStatus();

if(!currentUser) {
    window.location.href = '/login';
} else {
    // Authentication requests have no seller/shipping/marketplace-fee
    // concept -- they're a flat service fee, not a product sale.
    const isAuthPayment = queryItem?.itemType === 'authentication';

    const data = isAuthPayment
        ? await getAuthOrderSummary(authRequestId, currentUser)
        : await getOrderSummary(listingId, currentUser);
    // console.log("order summary:", data)

    queryItem.price = data.total;
    queryItem.buyerId = currentUser.userId;
    queryItem.buyerEmail = currentUser.email;

    if (isAuthPayment) {
        queryItem.authRequestId = authRequestId;
        hideShippingSection();
        displayAuthOrderDetails(queryItem);
    } else {
        queryItem.salesTax = data.tax;
        queryItem.marketplaceFee = data.marketplaceFee;
        displayShipping(currentUser);
        displayOrderDetails(queryItem);
    }

    console.log("item to pay",queryItem)
    displayOrderSummary(data, isAuthPayment);

    await initializeCheckout(data);
}

async function initializeCheckout() {
    // console.log("cart item:",cartItem)
    const response = await fetch("/create-checkout-session", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
        },
        body: JSON.stringify( { priceData: [queryItem] } )
    })
    
    if(!response.ok) throw new Error(`Server Error`);

    const { clientSecret } = await response.json()

    paymentIntentId = clientSecret.split('_secret')[0];

    const appearance = {
        theme: 'stripe',
        variables: {
          colorPrimary: '#e10505',
        }
    }

    elements = stripe.elements({appearance, clientSecret})

    const paymentElement = elements.create("payment");
    paymentElement.mount("#payment-element");

    const billingAddressElement = elements.create("address", {
        mode: "billing"
    });
    billingAddressElement.mount("#billing-address-element");

};

async function handleSubmit(e) {
    e.preventDefault()
    console.log("confirming payment...");

    // Writes the order as "pending" now, right as the buyer commits to
    // paying -- not blocking/aborting checkout if this fails, since the
    // payment itself is the critical path and the webhook will still
    // create the order from the PaymentIntent's metadata as a fallback.
    const isAuthPayment = queryItem?.itemType === 'authentication';
    if (!isAuthPayment && paymentIntentId) {
        try {
            await fetch("/orders/init", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${currentUser.idToken}`
                },
                body: JSON.stringify({ paymentIntentId })
            });
        } catch (error) {
            console.error("Failed to initialize pending order:", error);
        }
    }

    const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
            return_url: `${window.location.origin}/confirm.html`
        }
    })
    setLoading(true);

    showMessage(error.message);

    setLoading(false);
}

async function getCartItems(userId) {
    
    try {
        const cartRef = collection(db, 'carts', userId, 'items');
        const itemSnapshot = await getDocs(cartRef);

        if (itemSnapshot.empty) {
            return [];
        }
    
        const cartItems = itemSnapshot.docs.map(doc => doc.data())
        // console.log(cartItems)
        if (listingId) {
            const filtered = cartItems.filter(i => i.listingId === listingId);
            return filtered.length > 0 ? filtered : [];
        }
        

        return cartItems;
    } catch (error) {
        console.error(`Failed to fetch cart items for user ${userId}:`, error);
        throw error;
    }
}

async function getOrderSummary(listingId, currentUser) {
    console.log("Getting summary for listing:", listingId);
    try {
        const response = await fetch('/order-summary', {
            method: 'POST',
            headers: { 
                "Content-Type": 'application/json',
                "Authorization": `Bearer ${currentUser.idToken}`
                
            
            },
            body: JSON.stringify({listingId})
        });

        if (!response.ok) {
            throw new Error("fetch failed", response.status)
        }

        const result = await response.json();
        return result;


    } catch (err) {
        console.error(err)

    }
}

async function getAuthOrderSummary(authRequestId, currentUser) {
    console.log("Getting summary for authentication request:", authRequestId);
    try {
        const response = await fetch('/order-summary', {
            method: 'POST',
            headers: {
                "Content-Type": 'application/json',
                "Authorization": `Bearer ${currentUser.idToken}`
            },
            body: JSON.stringify({ authRequestId })
        });

        if (!response.ok) {
            throw new Error("fetch failed", response.status)
        }

        return await response.json();

    } catch (err) {
        console.error(err)
    }
}

function displayOrderSummary(data, isAuthPayment = false) {

    console.log("summary", data)
    const section = document.querySelector('.checkout-section');
    section.innerHTML = "";

    const checkoutBox = document.createElement('div');
    checkoutBox.classList.add('checkout-box');

    const lineItemsHTML = isAuthPayment
        ? `
            <div class="line-item-container">
              <dd>Authentication Fee:</dd>
              <dt>$${data.price.toFixed(2)}</dt>
            </div>
        `
        : `
            <div class="line-item-container">
              <dd>Item Price:</dd>
              <dt>$${data.price.toFixed(2)}</dt>
            </div>
            <div class="line-item-container">
              <dd>Delivery Price:</dd>
              <dt>$${data.delivery}</dt>
            </div>
            <div class="line-item-container">
              <dd>Marketplace fee:</dd>
              <dt>$${data.marketplaceFee}</dt>
            </div>
            <div class="line-item-container">
              <dd>Sales Tax:</dd>
              <dt>$${data.tax}</dt>
            </div>
        `;

    checkoutBox.innerHTML = `
        <h3>Order Summary</h3>
        ${lineItemsHTML}
            <hr>
            <div class="line-item-container">
              <dt>Total</dt>
              <dd class="total-cost">$${data.total.toFixed(2)} USD</dd>
            </div>
            <button id="submit" class="place-order-btn">
              <div class="spinner hidden" id="spinner"></div>
              <span id="button-text">Pay now</span>
            </button>
            <div id="payment-message" class="hidden"></div>
    `;


    section.append(checkoutBox);

    document.getElementById("submit").addEventListener('click', handleSubmit)
    

}

function displayOrderDetails(item) {
    console.log("displaying",item)
    const cart = document.querySelector('.cart');
    cart.innerHTML = "";

    const cartItem = document.createElement('div');
    cartItem.classList.add('cart-item');
    cartItem.innerHTML = `
        <div class="product-info-wrapper">
                <img src=${item.image} />
               <div class="cart-item-info">
                 <div class="cart-product-info" data-listingId="${item.listingId}">
                   <p class="cart-item-brand">${item.brand}</p>
                   <p class="cart-item-name">${item.productName}</p>
                   <p class="cart-item-size">Size: ${item.size}</p>
                   <p class="cart-item-price">$${item.price.toFixed(2)}</p>
                 </div>
                 
               </div> 
               </div>
              <div class="seller-profile" data-id="${item.sellerId}">
                <img src=${item.sellerPicture} alt="" class="seller-profile-picture">
                <a href="#" class="seller-name">
                  <span>${item.sellerName}</span>
                </a>
              </div>
    `;
    cart.append(cartItem)



}

// Authentication requests have no seller and nothing ships at payment time --
// the item preview just shows what's being authenticated and which tier.
function displayAuthOrderDetails(item) {
    console.log("displaying auth item", item)
    const cart = document.querySelector('.cart');
    cart.innerHTML = "";

    const cartItem = document.createElement('div');
    cartItem.classList.add('cart-item');
    cartItem.innerHTML = `
        <div class="product-info-wrapper">
                <img src=${item.primaryImage} />
               <div class="cart-item-info">
                 <div class="cart-product-info" data-authRequestId="${item.authRequestId}">
                   <p class="cart-item-brand">${item.category}</p>
                   <p class="cart-item-name">${item.productName}</p>
                   <p class="cart-item-size">${item.tier?.icon || ''} ${item.tier?.name || ''} Tier</p>
                   <p class="cart-item-price">$${item.price.toFixed(2)}</p>
                 </div>
               </div>
               </div>
    `;
    cart.append(cartItem)
}

// No shipping address is collected at this step for an authentication
// payment -- hide the whole block rather than leaving it half-relevant.
function hideShippingSection() {
    const shippingInfo = document.getElementById('shippingInfo');
    const shippingBlock = shippingInfo?.closest('.input-form');
    if (shippingBlock) shippingBlock.style.display = 'none';
}

function displayShipping(data) {
    const shippingInfo = document.getElementById('shippingInfo');
    shippingInfo.innerHTML = "";

    const div = document.createElement('div');
    div.classList.add('address-wrapper')
    div.innerHTML = `
        <div class="address-value">
            <p class="first-last-name">${data.firstName} ${data.lastName}</p>
            <p class="address-street">${data.shipping.address}</p>
            <p class="address-city">${data.shipping.city}, ${data.shipping.state} ${data.shipping.zipCode}</p>
        </div>
        
        <div class="edit-address">
            <p>Edit</p>
        </div>
    `;

    shippingInfo.append(div);
}

function setLoading(isLoading) {
    if (isLoading) {
      // Disable the button and show a spinner
      document.querySelector("#submit").disabled = true;
      document.querySelector("#spinner").classList.remove("hidden");
      document.querySelector("#button-text").classList.add("hidden");
    } else {
      document.querySelector("#submit").disabled = false;
      document.querySelector("#spinner").classList.add("hidden");
      document.querySelector("#button-text").classList.remove("hidden");
    }
}

function showMessage(messageText) {
const messageContainer = document.querySelector("#payment-message");

messageContainer.classList.remove("hidden");
messageContainer.textContent = messageText;

setTimeout(function () {
    messageContainer.classList.add("hidden");
    messageContainer.textContent = "";
}, 4000);
}  






    
    
