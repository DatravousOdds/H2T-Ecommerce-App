import { getDoc, getDocs, deleteDoc, addDoc, query, collection, doc, db, where, orderBy, limit} from '../api/firebase-client.js';
import { formatFirebaseDate, addToCart, createCartItemInFirebase, getSellerInfo, getUserProfile, updateResultsCount, handleFavoriteClick, getCartItems, renderProductSkeletons, renderRatingStars, isReleaseLive } from '../core/global.js';
import { checkUserStatus } from '../auth/auth.js';
import { initCartDrawer } from '../components/cartDrawer.js';
import { showLoader, hideLoader } from '../components/pageLoader.js';
import { fetchSalesPrices } from '../components/priceChart.js';


const user = await checkUserStatus();
const searchQuery = new URLSearchParams(window.location.search);
const productId = searchQuery.get('id');



const productDetailsWrapper = document.querySelector('.product-details-wrapper');
const productCategory = document.querySelector('.prod-category');
const sellerProfileLink = document.getElementById('sellerProfileLink');
const sellerProfilePicture = document.getElementById('sellerProfilePicture');
const sellerName = document.getElementById('sellerName');
const sellerVerifiedTag = document.getElementById('sellerVerifiedTag');
const sellerRatingStat = document.getElementById('sellerRatingStat');
const sellerRatingStars = document.getElementById('sellerRatingStars');
const sellerRating = document.getElementById('sellerRating');
const sellerListingsCount = document.getElementById('sellerListingsCount');
const productTitle = document.querySelector('.prod-title');
const productPrice = document.querySelector('.prod-price')
const productOriginalPrice = document.querySelector('.original-price');
const mainImage = document.getElementById('MainImg');
const smallImagesGroup = document.querySelector('.s-img-group');

// Scoped past .s_prod_details:not(.skeleton-item) -- the skeleton placeholder
// reuses the same .sizes class for layout, so a bare '.sizes' selector would
// grab the (hidden) skeleton's copy instead of the real one.
const sizes = document.querySelector('.s_prod_details:not(.skeleton-item) .sizes');

const reviewCount = document.getElementById('reviews-count');
const reviewsContainer = document.querySelector('.comments');

const detailTriggers = document.querySelectorAll('.detail-trigger');
const writeReviewBtn = document.getElementById("writeReviewBtn");
const offerBtn = document.getElementById('offerBtn');
const modalOverlay = document.querySelector('.modal-overlay');
const modalCloseBtns = document.querySelectorAll('.modal-close');
const offerModal = document.getElementById('offerModal');
const offerSent = document.getElementById('offerSent');
const viewOffersBtn = document.getElementById('viewOffersBtn');
const cartDrawerClose = document.getElementById('cartDrawerClose');
const cartDrawer = document.getElementById('cartDrawer');
const addToCartBtn = document.getElementById('addToCartBtn');
const cartDrawerBody = document.getElementById('cartDrawerBody');
const priceHistoryFilters = document.querySelectorAll('.chart-filter-grid .filter');
const statRow = document.querySelector('.stat-row');
const buyBtn = document.getElementById('buyBtn');
const salesDrawer = document.getElementById('salesDrawer');
const salesDrawerBackdrop = document.getElementById('salesDrawerBackdrop');
const viewAllSalesBtn = document.getElementById('viewAllSalesBtn');

initCartDrawer();
setAddToCartButtonState();
setBreadcrumb();
displayProductDetails();
displayPricingKpis();
displaySalesHistory();
displayReviews();
initOfferPanels();
renderProductSkeletons('proContainer');
try {
    const products = await loadRelateProducts();
    displayProducts(products);
} catch (error) {
    console.error("Error fetching related products:", error);
}
const item = await createCartItem();



/* ==== EVENT LISTENERS ===== */
detailTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
            const detailText = trigger.closest('.detail-container').lastElementChild;
            const isActive = detailText.classList.toggle('active');
            
            const icon = trigger.lastElementChild;
            icon.classList.toggle('fa-plus', !isActive)
            icon.classList.toggle('fa-minus', isActive)
         })
})

offerBtn.addEventListener('click', () => {
    // console.log("offer btn clicked")

    modalOverlay.classList.add('show');
    offerModal.classList.add('active')
    document.body.style.overflow = 'hidden';
    // createOfferInFirebase()
    setOfferModalData();
})

// querySelectorAll, not querySelector -- the offer modal and the "offer
// sent" panel each have their own .modal-close button (plus a third, unused
// one on the dormant review modal). A single querySelector only ever wired
// the first one in the DOM, so the offer modal/offer-sent close (X) buttons
// silently did nothing.
modalCloseBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
        modalOverlay.classList.remove('show');
        offerModal.classList.remove('active');
        offerSent.classList.remove('active');
        document.body.style.overflow = 'auto';
    });
});

viewOffersBtn?.addEventListener('click', async () => {
    try {
        const data = await getProductData(productId);
        window.location.href = `/sellerProfile/offers?id=${data.userId}`;
    } catch (error) {
        console.error("Error navigating to offers conversation:", error);
    }
});

viewAllSalesBtn?.addEventListener('click', () => {
    salesDrawer.classList.add('is-open');
});

salesDrawerBackdrop?.addEventListener('click', () => {
    salesDrawer.classList.remove('is-open');
});

addToCartBtn.addEventListener('click', () => {
    addToCart(productId,user);

    cartDrawer.classList.add('is-open');
    addToCartBtn.classList.add('disabled');

});

buyBtn.addEventListener('click', async () => {
    sessionStorage.setItem('item', JSON.stringify(item))
    window.location.href = `/checkout?listingId=${productId}`
})

// Keep the button in sync when the cart changes elsewhere (drawer delete,
// bag page delete) -- both dispatch 'cartUpdated' from removeFromCart().
window.addEventListener('cartUpdated', setAddToCartButtonState);

/* ==== ASYNC FUNCTIONS ===== */

// The button only greys itself out in the click handler below, so a refresh
// forgets that state -- this checks the cart (Firestore for logged-in users,
// localStorage for guests, both via getCartItems()) on load and re-applies it.
async function setAddToCartButtonState() {
    try {
        const cartItems = await getCartItems(user);
        const alreadyInCart = cartItems.some(item => item.listingId === productId);

        if (alreadyInCart) {
            addToCartBtn.classList.add('disabled');
        } else {
            addToCartBtn.classList.remove('disabled');
        }
    } catch (error) {
        console.error("Error checking cart state for add-to-cart button:", error);
    }
}

async function createCartItem() {
  try {
    const profile = await getSellerInfo(productId);

    let cartItem = {
      sellerName: profile.username,
      sellerPicture: profile.profilePicture,
      sellerId: profile.id,
      listingId: productId,
      listingPrice: profile.listingPrice,
      image: profile.listingImage,
      size: profile.listingSize,
      quantity: 1,
      brand: profile.listingBrand,
      productName: profile.productName,
      shipping: profile.shipping,
      shippingCost: profile.shipping.estimateRate || 0,
      shippingFrom: ""
    };

    return cartItem;

  } catch (error) {
    console.error(`Failed to load seller profile ${error}`)
  }
}

async function getProductData(productId) {
    if (!productId) {
        console.log("No id provided")
    }
    
    const docRef = doc(db, "listings", productId);
    
    const docSnap = await getDoc(docRef);
    
    if(!docSnap.exists()) {
        console.log("No id provided")
    }
    
    const data = docSnap.data();

    return data;
    
}

// Same query shape as fetchActiveListings in pages/sellerProfile.js -- public
// page, so only "active" listings count toward what a viewer sees/can buy.
async function fetchSellerActiveListingsCount(sellerId) {
    const q = query(
        collection(db, "listings"),
        where("userId", "==", sellerId),
        where("status", "==", "active")
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
}

async function getReviews() {
    const q = query(
        collection(db, "reviews"),
        where("productId", "==", productId)
    );

    const docSnapshot = await getDocs(q);
    return docSnapshot;

}

async function displayReviews() {
    showLoader(reviewsContainer);
    try {
        const reviews = await getReviews();

        if (reviews.empty) {
            document.querySelector('.sm-reviews-section').style.display = 'none';
            return;
        }

        getTotalReviews(reviews);

        reviewsContainer.innerHTML = "";
        reviews.forEach(review => {
            const reviewData = review.data()

            const div = document.createElement('div');
            div.classList.add('comment-container');
            div.innerHTML = `<div class="rating-timestamp" style="display: flex">
                <div class="stars" id="stars">
                    ${ratingStars(reviewData.rating)}
                  </div>
                  <span class="comment-date">${formatFirebaseDate(reviewData.createdAt)}</span>
                </div>

                <div class="active-comment">
                  <div class="comment">
                    <p>${reviewData.description}</p>
                  </div>
                  <div class="user-pfp" style="display: flex">
                    <div class="user">
                      <img src=${reviewData.reviewerPhoto} alt="${reviewData.altImage}" loading="lazy" />
                    </div>
                    <div class="user-name">
                      <a href="#">${reviewData.reviewerUsername}</a>
                    </div>
                  </div>
                </div>`;

            reviewsContainer.append(div);
        })
    } catch (error) {
        console.error("Error fetching reviews:", error);
    } finally {
        hideLoader(reviewsContainer);
    }
}

async function displayProductDetails() {
    productDetailsWrapper.classList.add('is-loading');
    try {
        const data = await getProductData(productId);

        productCategory.textContent = data.category;

        const sellerProfile = await getUserProfile(data.userId);
        sellerProfilePicture.src = sellerProfile.profileImage || '';
        sellerName.textContent = sellerProfile.username || 'Unknown Seller';
        sellerProfileLink.href = `/sellerProfile?id=${data.userId}`;

        sellerVerifiedTag.style.display = sellerProfile.isVerified ? '' : 'none';

        // Same "hide instead of showing a fake 0/5" gate as sellerProfile.js/profile.js.
        const totalRatings = sellerProfile.ratings?.metrics?.totalRatings || 0;
        if (totalRatings > 0) {
            sellerRatingStat.style.display = '';
            sellerRatingStars.innerHTML = renderRatingStars(sellerProfile.stats?.rating || 0);
            sellerRating.textContent = sellerProfile.stats?.rating;
        } else {
            sellerRatingStat.style.display = 'none';
        }

        const sellerActiveListings = await fetchSellerActiveListingsCount(data.userId);
        sellerListingsCount.textContent = sellerActiveListings;

        productTitle.textContent = data.productName;
        productPrice.textContent = `$${data.listingPrice.toFixed(2)}`;
        productOriginalPrice.textContent = data.originalPrice ? `$${data.originalPrice.toFixed(2)}` : '';

        const productMainImage = data.images.find(image => image.isPrimary === true) || data.images[0];

        mainImage.src = productMainImage.url;

        smallImagesGroup.innerHTML = "";

        data.images.forEach(image => {
            console.log("image:", image)
            const div = document.createElement("div");
            div.classList.add("s-img-col");

            const img = document.createElement('img');
            img.classList.add('s-img');
            img.src = image.url;
            img.addEventListener('click', () => {
                mainImage.src = image.url;
            });

            div.append(img);
            smallImagesGroup.append(div);
        });

        sizes.innerHTML = `<button class="size-btn">${data.size}</button>`;

        setProductDescription(data);
    } catch (error) {
        console.error("Error fetching product details:", error);
    } finally {
        productDetailsWrapper.classList.remove('is-loading');
    }
}

async function setBreadcrumb() {
    const data = await getProductData(productId);
    // console.log(data)
    const breadcrumb = document.querySelector('.product-breadcrumb');
    // console.log("product data:", data);

    // categoryMeta ("men"/"women") maps to the /mens and /women routes in
    // server.js -- "men" needs the extra "s", "women" is already an exact match.
    const categoryMetaRoutes = { men: "/mens", women: "/women" };
    const categoryMetaRoute = categoryMetaRoutes[data.categoryMeta] || "/shop/shop.html";

    breadcrumb.innerHTML = `
        <li><a href="/">Home</a></li>
        <li>></li>
        <li><a href="${categoryMetaRoute}">${data.categoryMeta}</a></li>
        <li>></li>
        <li><a href="${categoryMetaRoute}?category=${data.category}"><strong>${data.category}</strong></a></li>
    `
}

async function setOfferModalData() {
    const offerBody = document.getElementById('offerBody');

    showLoader(offerBody);
    let data;
    try {
        data = await getProductData(productId);
    } catch (error) {
        console.error("Error fetching offer product data:", error);
        return;
    } finally {
        hideLoader(offerBody);
    }

    const productMainImage = data.images.find(image => image.isPrimary === true);

    offerBody.innerHTML = '';
    offerBody.innerHTML = `
        <div class="offer-info">
          <img src=${productMainImage.url} alt="" loading="lazy">
          <div class="product-info">
            <p class="product-brand">${data.productName}</p>
            <p class="product-size">Size: ${data.size}</p>
            <p class="product-price">$${data.listingPrice}</p>
          </div>
        </div>
        <div class="offer-input">
          <label for="offerInput">Your offer</label>
          <input type="number" id="offerInput" value="">
        </div>
        <div class="offer-suggestions" aria-label="Quick offer suggestion">
          <button type="button" class="offer-suggestion" data-value="">
            <span>10% Off</span>
            <span>$${calculateDiscountPrice(10,data.listingPrice)}</span>
          </button>
          <button type="button" class="offer-suggestion" data-value="">
            <span>20% Off</span>
            <span>$${calculateDiscountPrice(20, data.listingPrice)}</span>
          </button>
          <button type="button" class="offer-suggestion" data-value="">
            <span>15% Off</span>
            <span>$${calculateDiscountPrice(30, data.listingPrice)}</span>
          </button>
        </div>
        <div class="offer-tooltip" id="offerTooltip">
          <p>An offer accepted is not a purchase. If the seller accepts, you’ll have 24  hours to buy item at offer price</p>
        </div>
        <button class="send-offer-btn" id="sendOfferBtn" type="button">Send Offer</button>
    `;

    const sendOfferBtn = document.getElementById('sendOfferBtn');
    sendOfferBtn.disabled = true;

    const offerSuggestions = document.querySelectorAll('.offer-suggestion');
    
    const offerInput = document.getElementById('offerInput');

    offerInput.addEventListener('input', (e) => {
        const event = e.target.value;
        if(!event) {
            sendOfferBtn.disabled = true;
        } else {
            sendOfferBtn.disabled = false;
            offerSuggestions.forEach(s => s.classList.remove('active'))

        }
    });

    sendOfferBtn.addEventListener('click', async () => {
        sendOfferBtn.disabled = true;

        try {
            await submitOffer(Number(offerInput.value));
            offerModal.classList.remove('active');
            offerSent.classList.add('active');
            await renderBuyerOfferStatus();
        } catch (error) {
            alert(error.message);
            sendOfferBtn.disabled = false;
        }
    });

    offerSuggestions.forEach(suggestion => {
        suggestion.addEventListener('click', () => {
            const discount = suggestion.lastElementChild.textContent.split('$')[1];
            offerInput.value = discount;

            offerSuggestions.forEach(s => s.classList.remove('active'))
            suggestion.classList.add('active');
            
            if (suggestion.classList.contains('active')) {
                sendOfferBtn.disabled = false; 
            }
        })
    });
}
  
async function submitOffer(offerAmount) {
    if (!user) {
        throw new Error("Please log in to make an offer");
    }

    const res = await fetch(`/api/products/${productId}/offer`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${user.idToken}`,
        },
        body: JSON.stringify({ offerAmount }),
    });

    const result = await res.json();
    if (!res.ok) {
        throw new Error(result.message || "Failed to send offer");
    }

    return result;
}

async function respondToOffer(offerId, action, counterAmount) {
    const res = await fetch(`/api/offers/${offerId}/respond`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${user.idToken}`,
        },
        body: JSON.stringify({ action, counterAmount }),
    });

    const result = await res.json();
    if (!res.ok) {
        throw new Error(result.message || "Failed to respond to offer");
    }

    return result;
}

function offerStatusLabel(offer) {
    if (offer.status === "accepted") return "Offer accepted! The seller has 24 hours to complete the sale.";
    if (offer.status === "rejected") return "Offer declined.";
    if (offer.turn === "buyer") return `Seller countered with $${offer.offerAmount} — your move`;
    return `Offer pending — $${offer.offerAmount} sent to seller`;
}

// Renders the logged-in buyer's own negotiation thread on this listing (if
// any). Re-rendered after every accept/reject/counter so the panel always
// reflects whichever side's turn it now is.
async function renderBuyerOfferStatus() {
    const panel = document.getElementById('offerStatusPanel');
    if (!user) return;

    let offer;
    try {
        const res = await fetch(`/api/products/${productId}/offers/mine`, {
            headers: { "Authorization": `Bearer ${user.idToken}` },
        });
        ({ offer } = await res.json());
    } catch (error) {
        console.error("Error fetching offer status:", error);
        return;
    }

    if (!offer) {
        panel.style.display = 'none';
        return;
    }

    const canRespond = offer.status === "active" && offer.turn === "buyer";

    panel.style.display = 'block';
    panel.innerHTML = `
        <p class="offer-status-text">${offerStatusLabel(offer)}</p>
        ${canRespond ? `
            <div class="offer-status-actions">
                <button type="button" class="offer-accept-btn" id="buyerAcceptBtn">Accept</button>
                <button type="button" class="offer-reject-btn" id="buyerRejectBtn">Decline</button>
                <input type="number" class="offer-counter-input" id="buyerCounterInput" placeholder="Counter amount">
                <button type="button" class="offer-counter-btn" id="buyerCounterBtn">Counter</button>
            </div>
        ` : ''}
    `;

    if (!canRespond) return;

    document.getElementById('buyerAcceptBtn').addEventListener('click', async () => {
        try {
            await respondToOffer(offer.id, "accept");
            await renderBuyerOfferStatus();
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById('buyerRejectBtn').addEventListener('click', async () => {
        try {
            await respondToOffer(offer.id, "reject");
            await renderBuyerOfferStatus();
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById('buyerCounterBtn').addEventListener('click', async () => {
        const counterAmount = document.getElementById('buyerCounterInput').value;
        try {
            await respondToOffer(offer.id, "counter", counterAmount);
            await renderBuyerOfferStatus();
        } catch (error) {
            alert(error.message);
        }
    });
}

// Only rendered when the current viewer owns this listing -- lets a seller
// accept/reject/counter offers right from their own product page. A proper
// Selling > Offers dashboard (mirroring the existing Selling > Orders tab)
// would be the natural next step, but that's a bigger addition than this
// page warrants on its own.
async function renderSellerOffersPanel(sellerId) {
    const panel = document.getElementById('sellerOffersPanel');
    const list = document.getElementById('sellerOffersList');
    if (!user || sellerId !== user.userId) return;

    let offers;
    try {
        const res = await fetch(`/api/products/${productId}/offers`, {
            headers: { "Authorization": `Bearer ${user.idToken}` },
        });
        ({ offers } = await res.json());
    } catch (error) {
        console.error("Error fetching seller offers:", error);
        return;
    }

    if (!offers || !offers.length) {
        panel.style.display = 'none';
        return;
    }

    panel.style.display = 'block';
    list.innerHTML = offers.map((offer) => `
        <div class="seller-offer-row" data-offer-id="${offer.id}">
            <p class="seller-offer-amount">$${offer.offerAmount}</p>
            <p class="seller-offer-turn">${offer.turn === "seller" ? "Awaiting your response" : "Waiting on buyer"}</p>
            ${offer.turn === "seller" ? `
                <div class="offer-status-actions">
                    <button type="button" class="offer-accept-btn" data-action="accept">Accept</button>
                    <button type="button" class="offer-reject-btn" data-action="reject">Decline</button>
                    <input type="number" class="offer-counter-input" data-input="counter" placeholder="Counter amount">
                    <button type="button" class="offer-counter-btn" data-action="counter">Counter</button>
                </div>
            ` : ''}
        </div>
    `).join('');

    list.querySelectorAll('.seller-offer-row').forEach((row) => {
        const offerId = row.dataset.offerId;

        row.querySelectorAll('button[data-action]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const action = btn.dataset.action;
                const counterAmount = row.querySelector('[data-input="counter"]')?.value;

                try {
                    await respondToOffer(offerId, action, counterAmount);
                    await renderSellerOffersPanel(sellerId);
                } catch (error) {
                    alert(error.message);
                }
            });
        });
    });
}

async function initOfferPanels() {
    if (!user) return;

    try {
        await Promise.all([
            renderBuyerOfferStatus(),
            getProductData(productId).then((productData) => renderSellerOffersPanel(productData.userId)),
        ]);
    } catch (error) {
        console.error("Error initializing offer panels:", error);
    }
}

async function getMarketValuePrice() {
    const data = await getProductData(productId);

    return (data.lastSalePrice || 0).toFixed(2);
};

async function getAverageSalePrice() {
    const data = await getProductData(productId);

    return parseFloat((data.averageSalePrice || 0).toFixed(2));
};

async function getOfferKpis() {
    // Routed through the server (not a direct Firestore read) -- see
    // server.js's /api/products/:id/offer-summary for why.
    const res = await fetch(`/api/products/${productId}/offer-summary`);

    if (!res.ok) {
        throw new Error(`Failed to fetch offer summary: ${res.status}`);
    }

    return await res.json();
}

async function loadRelateProducts() {
    const data = await getProductData(productId);
    const productsCollection = collection(db, "listings");

    // Tier A: related by brand + category
    const baseConstraints = [where("status", "==", "active"),where("productName","!=", data.productName), where("brand", "==", data.brand), where("category", "==", data.category)];
    const q = query(productsCollection, ...baseConstraints, limit(20));

    const querySnapshot = await getDocs(q);
    const visibleDocs = querySnapshot.docs.filter((doc) => isReleaseLive(doc.data()));

    if (visibleDocs.length > 0) {
        return visibleDocs;
    }

    // Tier B: no related products for this brand/category combo — fall back to
    // the newest active listings in the same category ("just dropped"), same
    // pattern as home.js's justDropped(). Firestore won't let us combine an
    // inequality filter on productId with orderBy("createdAt"), so we over-fetch
    // by 1 and filter the current product out client-side instead.
    const FALLBACK_LIMIT = 16;
    const fallbackQuery = query(
        productsCollection,
        where("status", "==", "active"),
        where("category", "==", data.category),
        orderBy("createdAt", "desc"),
        limit(FALLBACK_LIMIT + 1)
    );

    const fallbackSnapshot = await getDocs(fallbackQuery);

    return fallbackSnapshot.docs
        .filter((doc) => doc.id !== productId && isReleaseLive(doc.data()))
        .slice(0, FALLBACK_LIMIT);
}

/* ==== HELPER FUNCTIONS ===== */

function ratingStars(maxRatings = 5) {
    let ratingHTML = '';
    
    const totalStars = parseInt(maxRatings);
    for(let i = 1; i <= totalStars; i++) {
        ratingHTML += 
        `
        <span class="star" data-value="${i}" aria-label="${i} out of ${totalStars} stars">
            <i class="fa-solid fa-star"></i>
        </span>`
    }

    return ratingHTML;
}

function calculateDiscountPrice(discountAmount, price) {
    let discount = parseFloat(price * (discountAmount/100)).toFixed(2);
    return (price - discount).toFixed(2);
}

function setProductDescription(data) {
    const productDescription = document.getElementById('detail-product');
    productDescription.innerText = data.description;
}

function toggleTrend(statValueEl, hasData) {
    const delta = statValueEl.closest('.stat-card')?.querySelector('.stat-delta');
    if (delta) delta.hidden = !hasData;
}

// fetchSalesPrices returns two parallel, unsorted arrays (the server route has
// no orderBy). Zip them into records and sort oldest -> newest so each sale's
// trend can be measured against the one immediately before it.
function buildSalesHistory(dates, prices) {
    const sales = dates
        .map((date, i) => ({ date, price: prices[i] }))
        .sort((a, b) => a.date - b.date);

    return sales.map((sale, i) => {
        const previousPrice = i > 0 ? sales[i - 1].price : null;
        const percentChange = previousPrice
            ? ((sale.price - previousPrice) / previousPrice) * 100
            : null;

        return { ...sale, percentChange };
    });
}

function getTotalReviews(reviews) {
    const count = reviews.docs?.length ?? 0;
    const reviewCount = document.getElementById('reviewsCount');
    if (reviewCount) {
        reviewCount.innerText = `(${count})`;
    }
    
}

function saleRowTemplate(sale) {
    const dateStr = sale.date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    const trendHTML = sale.percentChange === null
        ? ''
        : `<span class="stat-delta ${sale.percentChange >= 0 ? 'up' : 'down'}">
             <i class="fa-solid fa-arrow-trend-${sale.percentChange >= 0 ? 'up' : 'down'}"></i>
             ${Math.abs(sale.percentChange).toFixed(2)}%
           </span>`;

    return `
    <div class="sale-row">
        <div class="sale-row-info">
            <span class="sale-price">$${sale.price.toFixed(2)}</span>
            <span class="sale-date">${dateStr}</span>
        </div>
        ${trendHTML}
    </div>`;
}

async function displaySalesHistory() {
    if (!salesDrawer) return;

    let dates = [];
    let prices = [];
    try {
        ({ dates, prices } = await fetchSalesPrices());
    } catch (error) {
        console.error("Error fetching sales history:", error);
    }

    const sales = buildSalesHistory(dates, prices);
    const mostRecentSale = sales[sales.length - 1];

    const lastSalePriceEl = document.getElementById('lastSalePrice');
    if (lastSalePriceEl) {
        lastSalePriceEl.textContent = mostRecentSale ? `$${mostRecentSale.price.toFixed(2)}` : 'N/A';
    }

    // Most recent sale first, like StockX's sales feed — buildSalesHistory
    // sorts oldest -> newest so trend math reads correctly, so reverse for display.
    salesDrawer.innerHTML = `
      <div class="cart-drawer-header">
        <h2>All sales</h2>
        <button type="button" class="modal-close" id="salesDrawerClose" aria-label="Close sales history">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="cart-drawer-body">
        ${sales.length ? [...sales].reverse().map(saleRowTemplate).join('') : '<p>No sales yet.</p>'}
      </div>
    `;

    document.getElementById('salesDrawerClose')?.addEventListener('click', () => {
        salesDrawer.classList.remove('is-open');
    });
}

async function displayPricingKpis() {
    showLoader(statRow);
    try {
        const offers = await getOfferKpis();
        const average = await getAverageSalePrice();
        const marketValuePrice = await getMarketValuePrice();

        const highestOffer = document.getElementById('highestOffer');
        const lowestOffer = document.getElementById('lowestOffer');
        const averageSalesPrice = document.getElementById('averageSalesPrice');
        const marketPrice = document.getElementById('marketValue');

        highestOffer.textContent = `$${offers.highest.toFixed(2) || 0}`;
        lowestOffer.textContent = `$${offers.lowest.toFixed(2) || 0}`;
        averageSalesPrice.textContent = `$${average}`;
        marketPrice.textContent = `$${marketValuePrice || 0}`

        // The trend arrows/percentages are hardcoded markup with no real
        // computation behind them yet — hide them rather than show a fake
        // trend next to a $0 placeholder when there's no data for that stat.
        toggleTrend(highestOffer, offers.highest > 0);
        toggleTrend(lowestOffer, offers.lowest > 0);
        toggleTrend(averageSalesPrice, average > 0);
        toggleTrend(marketPrice, parseFloat(marketValuePrice) > 0);
    } catch (error) {
        console.error("Error fetching pricing KPIs:", error);
    } finally {
        hideLoader(statRow);
    }
}

function displayProducts(products) {
    const productsContainer = document.querySelector('.pro-container');
    // clear existing products
    productsContainer.innerHTML = "";
    // console.log(products)
    // display
    if (products.length === 0) {
      // Tier A (related) and tier B (just dropped, same category) both came up
      // empty, so invite the user to fill the gap instead of a dead-end message.
      // Reuses .chart-empty-state so this matches the price-history empty state
      // above it on the same page.
      productsContainer.style.justifyContent = 'center';
      productsContainer.innerHTML = `
        <div class="chart-empty-state no-results-invite">
          <i class="fa-solid fa-box-open"></i>
          <h3>Nothing here yet</h3>
          <p>Be the first to list an item like this.</p>
          <a href="/seller" class="no-results-cta">List an item</a>
        </div>
      `;
      return;
    }
    products.forEach((doc) => {
      const productData = doc.data();
      const productElement = document.createElement("div");
      productElement.classList.add("pro");
      productElement.onclick = () => {
        window.location.href = `/shop/product.html?id=${doc.id}`;
      };

      // originalPrice only gets set when a seller edits listingPrice on an
      // existing listing (see seller.js collectListingInfo()) -- it's the
      // price right before that edit, not a fixed retail/MSRP value. That
      // makes it exactly "previousPrice" for a momentum calculation.
      const previousPrice = productData.originalPrice;
      const currentPrice = productData.listingPrice;
      const hasPriceHistory =
        typeof previousPrice === "number" &&
        previousPrice > 0 &&
        previousPrice !== currentPrice;

      // momentum = (currentPrice - previousPrice) / previousPrice
      const priceMomentum = hasPriceHistory
        ? (currentPrice - previousPrice) / previousPrice
        : 0;
      const momentumPercent = Math.round(Math.abs(priceMomentum) * 100);
      const priceDropped = hasPriceHistory && priceMomentum < 0;

      const originalPriceHTML = priceDropped
        ? `<span class="orgin-price">$${previousPrice.toFixed(2)}</span>`
        : "";
      // "% OFF" and the trend arrow would show the identical number here --
      // both come from the same single previousPrice data point -- so only
      // one renders: "% OFF" for a drop (familiar shopper language), the
      // trend-up arrow for an increase (no "% OFF" equivalent applies there).
      const priceChangeHTML = !hasPriceHistory
        ? ""
        : priceDropped
        ? `<div class="price-change">
            <div class="product-discount">
              <p>${momentumPercent}% OFF</p>
            </div>
          </div>`
        : `<div class="price-change">
            <div class="price-trend trend-up">
              <i class="fa-solid fa-arrow-trend-up"></i>
              <span>+${momentumPercent}%</span>
            </div>
          </div>`;

      productElement.innerHTML = `

              <!--- Image container-->
              <div class="product-image">
                <div class="liked">
                  <i class="fa-regular fa-heart"></i>
                </div>

                <img
                  src="${productData.images[0].url}"
                  class="image-custom"
                  alt="${productData.productName}"
                  loading="lazy"
                />
              </div>
              <!--- Image container-->

              <!-- product details -->
              <div class="des">
                <div class="price-description">
                  <p class="product-name">
                    ${productData.productName}
                  </p>

                  <div class="pro-price">
                    <span class="listing-price">$${productData.listingPrice.toFixed(2)}</span>
                    ${originalPriceHTML}
                    ${priceChangeHTML}
                  </div>

                </div>

              </div>
              <!-- product details -->
      `;
  
      handleFavoriteClick(productElement, doc.id, productData);

      productsContainer.appendChild(productElement);
    });
  
  
};




export {
    getProductData
}