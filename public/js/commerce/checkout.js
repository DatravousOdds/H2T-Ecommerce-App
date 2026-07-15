import { collection, getDocs, db } from '../api/firebase-client.js';
import { checkUserStatus } from '../auth/auth.js';
const stripe = Stripe("pk_live_51TfzCeClJc0GzijRcUvKdnm7dCkWSNuBzQMI3hgeoJsQ97IXaDCQtrLZCyuVVXiPZOWpyfGD2jfj13IpIJeQwy3X00GHsIsrzz");


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
            const initResponse = await fetch("/orders/init", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${currentUser.idToken}`
                },
                body: JSON.stringify({ paymentIntentId })
            });

            if (!initResponse.ok) {
                const body = await initResponse.json().catch(() => ({}));
                console.error(`Failed to initialize pending order (${initResponse.status}):`, body.message);
            }
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
            <button id="submit" class="place-order-btn" disabled>
              <div class="spinner hidden" id="spinner"></div>
              <span id="button-text">Checkout Unavailable</span>
            </button>
            <div id="payment-message">Checkout is temporarily disabled while we finish getting our sales permit -- check back soon.</div>
    `;


    section.append(checkoutBox);

    // Checkout is disabled site-wide until the sales permit is in place --
    // see the #submit button's disabled state above. Not wiring handleSubmit
    // at all (rather than relying on the disabled attribute alone) so this
    // stays inert even if something else re-enables the button.

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
                   <p class="cart-item-price">$${item.listingPrice.toFixed(2)}</p>
                 </div>
                 
               </div> 
               </div>
              <div class="seller-profile" data-id="${item.sellerId}">
                <img src="${item.sellerPicture || '/images/default-avatar.svg'}" alt="" class="seller-profile-picture">
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

// Only affects this order -- edits here are never written back to the
// buyer's saved profile (no PUT to /userProfiles/:id), just to `queryItem`
// so the address the buyer confirms is the one that actually reaches the
// PaymentIntent metadata (shipping_from) instead of whatever's on file.
function formatShippingAddress(shipping) {
    return `${shipping.address}, ${shipping.city}, ${shipping.state} ${shipping.zipCode}`;
}

function displayShipping(data) {
    const shippingInfo = document.getElementById('shippingInfo');
    shippingInfo.innerHTML = "";

    queryItem.shippingFrom = formatShippingAddress(data.shipping);

    const div = document.createElement('div');
    div.classList.add('address-wrapper');
    shippingInfo.append(div);

    renderShippingView(div, data);
}

function renderShippingView(container, data) {
    container.innerHTML = `
        <div class="address-value">
            <p class="first-last-name">${data.firstName} ${data.lastName}</p>
            <p class="address-street">${data.shipping.address}</p>
            <p class="address-city">${data.shipping.city}, ${data.shipping.state} ${data.shipping.zipCode}</p>
        </div>

        <div class="edit-address">
            <p>Edit</p>
        </div>
    `;

    container.querySelector('.edit-address').addEventListener('click', () => {
        renderShippingForm(container, data);
    });
}

function renderShippingForm(container, data) {
    container.innerHTML = `
        <form class="address-edit-form">
            <label>
                Street address
                <input type="text" name="address" value="${data.shipping.address}" required>
            </label>
            <label>
                City
                <input type="text" name="city" value="${data.shipping.city}" required>
            </label>
            <label>
                State
                <input type="text" name="state" value="${data.shipping.state}" required>
            </label>
            <label>
                Zip code
                <input type="text" name="zipCode" value="${data.shipping.zipCode}" required>
            </label>
            <div class="address-edit-actions">
                <button type="submit" class="save-address-btn">Save</button>
                <button type="button" class="cancel-address-btn">Cancel</button>
            </div>
            <p class="address-edit-error hidden"></p>
        </form>
    `;

    const form = container.querySelector('.address-edit-form');
    const errorEl = form.querySelector('.address-edit-error');
    const saveBtn = form.querySelector('.save-address-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorEl.classList.add('hidden');

        const formData = new FormData(form);
        const updatedShipping = {
            ...data.shipping,
            address: formData.get('address').trim(),
            city: formData.get('city').trim(),
            state: formData.get('state').trim(),
            zipCode: formData.get('zipCode').trim()
        };
        const shippingFrom = formatShippingAddress(updatedShipping);

        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";

        try {
            await updateOrderShipping(shippingFrom);
            data.shipping = updatedShipping;
            queryItem.shippingFrom = shippingFrom;
            renderShippingView(container, data);
        } catch (error) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save";
            errorEl.textContent = "Couldn't save this address, please try again.";
            errorEl.classList.remove('hidden');
        }
    });

    form.querySelector('.cancel-address-btn').addEventListener('click', () => {
        renderShippingView(container, data);
    });
}

// Patches the shipping_from metadata on the already-created PaymentIntent so
// the edit actually reaches the order -- buildOrderDataFromPaymentIntent
// (server.js) reads shippingAddress straight off that metadata, not off
// whatever queryItem looks like at the moment "Pay now" is clicked.
async function updateOrderShipping(shippingFrom) {
    const response = await fetch("/orders/update-shipping", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentUser.idToken}`
        },
        body: JSON.stringify({ paymentIntentId, shippingFrom })
    });

    if (!response.ok) {
        throw new Error(`Failed to update shipping (${response.status})`);
    }
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






    
    
