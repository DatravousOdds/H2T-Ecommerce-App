import { getDoc, getDocs, deleteDoc, addDoc, query, collection, doc, db, where, orderBy, limit} from '../api/firebase-client.js';
import { formatFirebaseDate, addToCart, createCartItemInFirebase, getSellerInfo, getUserProfile, updateResultsCount, handleFavoriteClick, getCartItems } from '../core/global.js';
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
const sellerRating = document.getElementById('sellerRating');
const sellerListingsCount = document.getElementById('sellerListingsCount');
const productTitle = document.querySelector('.prod-title');
const productPrice = document.querySelector('.prod-price')
const productOriginalPrice = document.querySelector('.original-price');
const mainImage = document.getElementById('MainImg');
const smallImagesGroup = document.querySelector('.s-img-group');

const sizes = document.querySelector('.sizes');

const reviewCount = document.getElementById('reviews-count');
const reviewsContainer = document.querySelector('.comments');

const detailTriggers = document.querySelectorAll('.detail-trigger');
const writeReviewBtn = document.getElementById("writeReviewBtn");
const offerBtn = document.getElementById('offerBtn');
const modalOverlay = document.querySelector('.modal-overlay');
const modalCloseBtn = document.querySelector('.modal-close')
const offerModal = document.getElementById('offerModal');
const cartDrawerClose = document.getElementById('cartDrawerClose');
const cartDrawer = document.getElementById('cartDrawer');
const addToCartBtn = document.getElementById('addToCartBtn');
const cartDrawerBody = document.getElementById('cartDrawerBody');
const priceHistoryFilters = document.querySelectorAll('.chart-filter-grid .filter');
const proContainer = document.querySelector('.pro-container');
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
showLoader(proContainer);
try {
    showLoader(proContainer);
    const products = await loadRelateProducts();
    displayProducts(products);
} catch (error) {
    console.error("Error fetching related products:", error);
} finally {
    hideLoader(proContainer);
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

modalCloseBtn.addEventListener('click', () => {
    modalOverlay.classList.remove('show');
    offerModal.classList.remove('active');
    document.body.style.overflow = 'auto';

})

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
                      <img src=${reviewData.reviewerPhoto} alt="${reviewData.altImage}" />
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
    showLoader(productDetailsWrapper);
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
        hideLoader(productDetailsWrapper);
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
    const offerSent = document.getElementById('offerSent');

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
          <img src=${productMainImage.url} alt="">
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

    sendOfferBtn.addEventListener('click', () => {
        console.log("offer sent!");
        console.log(offerInput.value);
        offerModal.classList.remove('active')
        offerSent.classList.add('active');
        
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

    if (!querySnapshot.empty) {
        return querySnapshot.docs;
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
        .filter((doc) => doc.id !== productId)
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
                    <div class="price-change">
                      <div class="price-trend trend-up">
                        <i class="fa-solid fa-arrow-trend-up"></i>
                        <span>+5%</span>
                      </div>
                    </div>
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