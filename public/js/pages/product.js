import { getDoc, getDocs, deleteDoc, addDoc, query, collection, doc, db, where, orderBy, limit} from '../api/firebase-client.js';
import { formatFirebaseDate, addToCart, createCartItemInFirebase, getSellerInfo } from '../core/global.js';
import { checkUserStatus } from '../auth/auth.js';
import { initCartDrawer } from '../components/cartDrawer.js';
import { showLoader, hideLoader } from '../components/pageLoader.js';


const user = await checkUserStatus();
const searchQuery = new URLSearchParams(window.location.search);
const productId = searchQuery.get('id');



const productDetailsWrapper = document.querySelector('.product-details-wrapper');
const productCategory = document.querySelector('.prod-category');
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

initCartDrawer();
setBreadcrumb();
displayProductDetails();
displayPricingKpis();
displayReviews();
showLoader(proContainer);
try {
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
    offerModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
})

addToCartBtn.addEventListener('click', () => {
    addToCart(productId,user)

    cartDrawer.classList.add('is-open');
    addToCartBtn.classList.add('disabled');

});

buyBtn.addEventListener('click', async () => {
    sessionStorage.setItem('item', JSON.stringify(item))
    window.location.href = `/checkout?listingId=${productId}`
})

/* ==== ASYNC FUNCTIONS ===== */
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
        productTitle.textContent = data.productName;
        productPrice.textContent = `$${data.listingPrice.toFixed(2)}`;
        productOriginalPrice.textContent = `$${data.originalPrice.toFixed(2)}`;

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
    breadcrumb.innerHTML = `
        <li><a href="/">Home</a></li>
        <li>></li>
        <li><a href="/${data.categoryMeta}">${data.categoryMeta}</a></li>
        <li>></li>
        <li><a href="/${data.category}"><strong>${data.category}</strong></a></li>
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
    const data = await getProductData(productId)
    const ordersColRef = collection(db, "orders");

    let q = query(ordersColRef, 
        where("productName", "==", data.productName),
        where("brand", "==", data.brand),
        orderBy("salePrice", "asc"),
        limit(1)
    );


    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return [];
    }

    const marketPrice = querySnapshot.docs[0].data().salePrice || 0;

    return marketPrice.toFixed(2);
};

async function getAverageSalePrice() {

    const data = await getProductData(productId);

    const ordersColRef = collection(db, "orders");

    let q = query(ordersColRef, where("productName", "==", data.productName));

    if (data.sku) {
        q = query(ordersColRef, 
            where("productName", "==", data.productName),
            where("sku", "==", data.sku));
    }

    const querySnapshot = await getDocs(q);

    const prices = querySnapshot.docs.map(doc => doc.data().listingPrice);

    const totalPrice = prices.reduce((sum, price) => sum += price, 0);

    const averagePrice = totalPrice / prices.length || 0;

    return parseFloat(averagePrice.toFixed(2));
};

async function getOfferKpis() {
    const offersColRef = collection(db, "offers");
    const baseConstraints = [where("status", "==", "active"), where("productId", "==", productId)];
    
    const highestOffers = query(offersColRef, ...baseConstraints, orderBy("offerAmount", "desc"));
    const lowestOffers = query(offersColRef, ...baseConstraints, orderBy("offerAmount", "asc"));

    const [lowest, highest] = await Promise.all([getDocs(lowestOffers), getDocs(highestOffers)]);
    // console.log(lowest, highest)

    return {
        highest: highest.empty ? 0 : highest.docs[0].data().offerAmount,
        lowest: lowest.empty ? 0 : lowest.docs[0].data().offerAmount,
    };
}

async function loadRelateProducts() {
    const data = await getProductData(productId);
    // console.log("related data:", data)
    let q;
    
    const productsCollection = collection(db, "listings");
    const baseConstraints = [where("status", "==", "active"),where("productName","!=", data.productName), where("brand", "==", data.brand), where("category", "==", data.category)];
    q = query(productsCollection, ...baseConstraints, limit(20));
  
 
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return [];
    }

    return querySnapshot;
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

function getTotalReviews(reviews) {
    const count = reviews.docs?.length ?? 0;
    const reviewCount = document.getElementById('reviewsCount');
    if (reviewCount) {
        reviewCount.innerText = `(${count})`;
    }
    
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
      productsContainer.innerHTML = `<div class="no-results">No results!</div>`
    }
    products.forEach((doc) => {
      const productData = doc.data();
      const productElement = document.createElement("div");
      productElement.classList.add("pro");
      productElement.onclick = () => {
        window.location.href = `shop/product.html?id=${doc.id}`;
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
                    <span class="listing-price">$${productData.originalPrice.toFixed(2)}</span>
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
  
    //   handleFavoriteClick(productElement);
  
  
      productsContainer.appendChild(productElement);
    });
  
    // update results count
    if (products.length) {
      updateResultsCount(products.length);
    }
    
};




export {
    getProductData
}