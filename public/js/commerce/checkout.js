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

// Authentication payments skip the address/tax step entirely (flat service
// fee, server.js's /order-summary already returns tax: 0 for them), so
// isTaxReady starts true for that flow and false otherwise until the buyer
// completes the shipping AddressElement below.
let isAuthPayment = false;
let isTaxReady = false;
let taxRequestSeq = 0;
// Distinct from isAuthPayment above, which means "this checkout IS an
// authentication-tier service fee purchase." This means "this listing
// purchase qualifies for the buyer-authentication feature" -- set from
// /order-summary's authenticationEligible field once data loads below.
let authenticationEligible = false;

if(!currentUser) {
    window.location.href = '/login';
} else {
    // Authentication requests have no seller/shipping/marketplace-fee
    // concept -- they're a flat service fee, not a product sale.
    isAuthPayment = queryItem?.itemType === 'authentication';
    isTaxReady = isAuthPayment;

    let data;
    try {
        data = isAuthPayment
            ? await getAuthOrderSummary(authRequestId, currentUser)
            : await getOrderSummary(listingId, currentUser);
    } catch (error) {
        displayCheckoutError(error.message);
        data = null;
    }
    // console.log("order summary:", data)

    if (data) {
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
            // Authentication is mandatory when eligible, not a buyer choice
            // -- server.js's /create-checkout-session recomputes and enforces
            // this itself from the listing, ignoring anything sent from here.
            // This is only used to decide whether displayOrderSummary shows
            // the informational badge below, and whether handleSubmit waits
            // for pending_authentication before redirecting.
            authenticationEligible = !!data.authenticationEligible;
            displayShipping(currentUser);
            displayOrderDetails(queryItem);
        }

        console.log("item to pay",queryItem)
        displayOrderSummary(data, isAuthPayment);

        await initializeCheckout(data);
    }
}

// Stops checkout cold instead of letting downstream code crash on a missing
// `data` object -- e.g. /order-summary rejects a buyer trying to purchase
// their own listing with a 400 + message, and that message needs to reach
// the buyer rather than just being console.error'd away.
function displayCheckoutError(message) {
    const wrapper = document.querySelector('.container-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = `
        <div class="checkout-error">
            <p>${message || "We couldn't load this checkout. Please try again."}</p>
            <a href="/products">Back to shopping</a>
        </div>
    `;
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

    // Tax is destination-based, so this is what actually drives
    // calculateTax() below -- distinct from the billing address and from
    // the legacy #shippingInfo block (which is the seller's ship-from
    // location, not where the buyer receives the item).
    if (isAuthPayment) {
        const shippingToSection = document.querySelector('#shipping-to-section');
        if (shippingToSection) shippingToSection.style.display = 'none';
    } else {
        const shippingAddressElement = elements.create("address", {
            mode: "shipping",
            allowedCountries: ["US"],
            // EasyShip requires a contact_phone on the destination address to
            // purchase a shipping label. fields.phone alone only makes the
            // field collectible -- validation.phone.required is what actually
            // makes the Element withhold event.complete until it's filled in.
            fields: { phone: "always" },
            validation: { phone: { required: "always" } }
        });
        shippingAddressElement.mount("#shipping-address-element");
        shippingAddressElement.on("change", handleShippingAddressChange);
    }
};

function handleShippingAddressChange(event) {
    if (!event.complete) {
        isTaxReady = false;
        updateSubmitState();
        return;
    }
    // name/phone ride along with address here since this is the only point
    // the buyer's contact info is captured -- both are required later to
    // actually purchase the EasyShip label (destination_address needs them).
    calculateTax(event.value.address, event.value.name, event.value.phone);
}

// Recomputes tax server-side (server.js's /tax/calculate) whenever the
// buyer finishes entering a shipping address, and pushes the corrected
// amount onto the already-created PaymentIntent. requestId guards against a
// slower, earlier calculation overwriting a newer one if the buyer edits
// the address again before the first call resolves.
async function calculateTax(address, name, phone) {
    const requestId = ++taxRequestSeq;
    isTaxReady = false;
    updateSubmitState();

    try {
        const response = await fetch("/tax/calculate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${currentUser.idToken}`
            },
            body: JSON.stringify({ paymentIntentId, listingId, address, name, phone })
        });

        const result = await response.json();

        if (requestId !== taxRequestSeq) return; // superseded by a newer address change

        if (!response.ok) {
            showMessage(result.message || "We couldn't calculate tax for that address. Please double-check it and try again.");
            return;
        }

        queryItem.salesTax = parseFloat(result.tax);
        queryItem.price = parseFloat(result.total);

        document.querySelector('#summary-tax').textContent = `$${result.tax}`;
        document.querySelector('#summary-total').textContent = `$${result.total} USD`;

        isTaxReady = true;
        await elements.fetchUpdates();
    } catch (error) {
        if (requestId !== taxRequestSeq) return;
        console.error("Tax calculation failed:", error);
        showMessage("We couldn't calculate tax for that address. Please double-check it and try again.");
    } finally {
        if (requestId === taxRequestSeq) updateSubmitState();
    }
}

function updateSubmitState() {
    const submitBtn = document.querySelector('#submit');
    const buttonText = document.querySelector('#button-text');
    if (!submitBtn) return;
    submitBtn.disabled = !isTaxReady;
    if (buttonText) buttonText.textContent = isTaxReady ? "Pay now" : "Enter shipping address to continue";
}

async function handleSubmit(e) {
    e.preventDefault()

    if (!isTaxReady) {
        showMessage("Please enter a valid shipping address before continuing.");
        return;
    }

    console.log("confirming payment...");

    // Show the loading state as soon as the buyer commits -- previously this
    // only got set inside the error branch (immediately undone right after)
    // or inside waitForPendingAuthentication, which never runs for a normal
    // purchase. Without this the button just sat there doing nothing for the
    // full /orders/init + confirmPayment round trip.
    setLoading(true);

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

    // Every other checkout keeps Stripe's default automatic redirect
    // (unchanged, still untouched below) -- only an authentication-eligible
    // order needs redirect: 'if_required' here, so control actually returns
    // to this function on success instead of the browser navigating away
    // immediately, letting waitForPendingAuthentication hold the buyer on a
    // loader until the order doc is genuinely at pending_authentication
    // rather than just "card confirmed."
    const { error, paymentIntent: confirmedPaymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
            return_url: `${window.location.origin}/confirm.html`
        },
        ...(authenticationEligible ? { redirect: 'if_required' } : {})
    });

    if (error) {
        showMessage(error.message);
        setLoading(false);
        return;
    }

    if (authenticationEligible) {
        await waitForPendingAuthentication(confirmedPaymentIntent.id);
    }
}

async function fetchOrderByPaymentIntent(paymentIntentId) {
    try {
        const response = await fetch(`/api/orders/by-payment-intent/${paymentIntentId}`, {
            headers: { "Authorization": `Bearer ${currentUser.idToken}` }
        });
        if (!response.ok) return null;
        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error("Error polling order status:", error);
        return null;
    }
}

// Polls rather than trusting "card confirmed" alone, since the order only
// actually reaches pending_authentication once the webhook processes
// amount_capturable_updated -- a real, if usually short, async gap. Redirects
// to confirm.html regardless of whether polling ever saw
// pending_authentication -- the card is already authorized either way by
// this point, and confirm.js has its own displayOrderPendingFallback() for a
// doc that's still slow to show up. Never leave the buyer stuck on this page
// over a webhook delay.
async function waitForPendingAuthentication(paymentIntentId) {
    setLoading(true);

    const MAX_ATTEMPTS = 10;
    const DELAY_MS = 1000;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const order = await fetchOrderByPaymentIntent(paymentIntentId);
        if (order?.fulfillmentStatus === 'pending_authentication') break;
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }

    window.location.href = `${window.location.origin}/confirm.html?payment_intent=${paymentIntentId}&redirect_status=succeeded`;
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
    const response = await fetch('/order-summary', {
        method: 'POST',
        headers: {
            "Content-Type": 'application/json',
            "Authorization": `Bearer ${currentUser.idToken}`
        },
        body: JSON.stringify({listingId})
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.message || "We couldn't load this order.");
    }

    return result;
}

async function getAuthOrderSummary(authRequestId, currentUser) {
    console.log("Getting summary for authentication request:", authRequestId);
    const response = await fetch('/order-summary', {
        method: 'POST',
        headers: {
            "Content-Type": 'application/json',
            "Authorization": `Bearer ${currentUser.idToken}`
        },
        body: JSON.stringify({ authRequestId })
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.message || "We couldn't load this order.");
    }

    return result;
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
              <dt id="summary-tax">$${data.tax}</dt>
            </div>
        `;

    // Informational only, not a choice -- authentication is mandatory for
    // eligible items (server.js enforces this independent of anything sent
    // from the client). Not a checkbox: a buyer being able to opt out would
    // let a counterfeit item in an authenticate-required category skip
    // review entirely.
    const authenticationBadgeHTML = isAuthPayment
        ? ''
        : data.authenticated
        ? `
            <div class="authentication-guarantee-badge">
              <img src="/images/hexxo_auth_badge.png" alt="" style="width: 20px; height: 20px; object-fit: contain;">
              <span>This item has already been authenticated.</span>
            </div>
        `
        : data.authenticationEligible
        ? `
            <div class="authentication-guarantee-badge">
              <i class="fa-solid fa-shield-halved"></i>
              <span>Authenticity Guarantee -- this item will be authenticated before it ships to you.</span>
            </div>
        `
        : '';

    checkoutBox.innerHTML = `
        <h3>Order Summary</h3>
        ${lineItemsHTML}
        ${authenticationBadgeHTML}
            <hr>
            <div class="line-item-container">
              <dt>Total</dt>
              <dd class="total-cost" id="summary-total">$${data.total.toFixed(2)} USD</dd>
            </div>
            <button id="submit" class="place-order-btn" disabled>
              <div class="spinner hidden" id="spinner"></div>
              <span id="button-text">${isAuthPayment ? "Pay now" : "Enter shipping address to continue"}</span>
            </button>
            <div id="payment-message" class="hidden"></div>
    `;


    section.append(checkoutBox);

    // Submission is gated on isTaxReady (set once /tax/calculate succeeds,
    // or immediately for auth payments which skip tax entirely) rather than
    // the disabled attribute alone -- see handleSubmit's guard and
    // updateSubmitState().
    document.querySelector('#submit').addEventListener('click', handleSubmit);
    updateSubmitState();
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






    
    
