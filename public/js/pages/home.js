import { checkUserStatus } from '../auth/auth.js';
import { loadProducts, displayProducts, getCartCount, renderProductSkeletons, getCartItems } from '../core/global.js';
import { initCartDrawer } from '../components/cartDrawer.js';
import { db, orderBy, limit, getDocs, query, collection, where } from '../api/firebase-client.js';
import { showPageLoader, hidePageLoader } from '../components/pageLoader.js';

const categoryCarousel = document.querySelector(".category-carousel");
const cartBtn = document.querySelector('#cartBtn i');
const cartDrawer = document.getElementById('cartDrawer');


initCartDrawer();



const categories = [
  {category: "sneakers", title: "Sneakers", image: "./images/download.jpg"},
  {category: "accessories", title: "Accessories", image: "./images/KAWS-Tokyo-First-Flayed-Companion-Keychain-Gray-2021.jpg-2+copy.jpg"},
  {category: "apparel", title: "Apparel", image: "./images/UCC2261886011T.jpg"},
  {category: "shoes", title: "Shoes", image: "./images/new-balance-Whitewithblackandraincloud-low-top-sneakers-1_800x1000.jpg.jpg"}

];







const justDropped = async () => {
  try {
    const q = query(
    collection(db, "listings"),
    where("status", "==", "active"),
    orderBy("createdAt", "desc"),
    limit(16)
  );

    const querySnapshot = await getDocs(q);
    displayProducts(querySnapshot.docs, "justDropped");
  
  } catch (error) {
    console.error("Error fetching just dropped products:", error);
  } finally { 
    hidePageLoader();
  }
  
};

const mensCollection = async () => {
  const q = query(
    collection(db, "listings"),
    where("status", "==", "active"),
    where("categoryMeta","==","men"),
    limit(16)
  );

  const querySnapshot = await getDocs(q);
  displayProducts(querySnapshot.docs, "menCollection");
  
};

const womenCollection = async () => {
  const q = query(
    collection(db, "listings"),
    where("status", "==", "active"),
    where("categoryMeta","==","women"),
    limit(16)
  );

  const querySnapshot = await getDocs(q);
  displayProducts(querySnapshot.docs, "womenCollection");
  
};

const belowRetailPrices = async () => {
  const q = query(
    collection(db, "listings"),
    where("status", "==", "active"),
    limit(16)
  );

  const querySnapshot = await getDocs(q);
  const filtered = querySnapshot.docs.filter(doc => doc.data().listingPrice < doc.data().originalPrice);

  displayProducts(filtered, "belowRetail");
  
}

["justDropped", "menCollection", "womenCollection", "belowRetail"].forEach(
  (containerId) => renderProductSkeletons(containerId)
);

justDropped();
mensCollection();
womenCollection();
belowRetailPrices();
loadHomepageCounts();

// Firestore has no case-insensitive query, and seller.js saves `brand` as
// free-text (no fixed dropdown/casing) -- so this fetches active listings
// once and matches brands client-side, same reasoning as search.js's
// listing search. `data-brand` on each .brand-banner is the source of
// truth for which brand each banner counts, independent of its (currently
// inconsistent) ?brand= link slug.
//
// The "Under $X" price tier cards need a count too, and since Firestore
// can't cheaply return counts for several disjoint price buckets in one
// call either, they piggyback on this same fetch instead of firing their
// own query.
async function loadHomepageCounts() {
  const brandBanners = document.querySelectorAll('.brand-banner[data-brand]');
  const priceTiers = document.querySelectorAll('.category-shop[data-max-price]');
  if (brandBanners.length === 0 && priceTiers.length === 0) return;

  try {
    const q = query(collection(db, "listings"), where("status", "==", "active"));
    const querySnapshot = await getDocs(q);
    const activeListings = querySnapshot.docs.map(doc => doc.data());

    updateBrandCounts(brandBanners, activeListings);
    updatePriceTierCounts(priceTiers, activeListings);
  } catch (error) {
    console.error("Error loading homepage listing counts:", error);
  }
}

function updateBrandCounts(brandBanners, activeListings) {
  brandBanners.forEach(banner => {
    const brandName = banner.dataset.brand.trim().toLowerCase();
    const count = activeListings.filter(
      listing => (listing.brand || '').trim().toLowerCase() === brandName
    ).length;

    const listingsEl = banner.querySelector('.total-listings');
    if (listingsEl) {
      listingsEl.textContent = `${count.toLocaleString()} listing${count === 1 ? '' : 's'}`;
    }
  });
}

function updatePriceTierCounts(priceTiers, activeListings) {
  priceTiers.forEach(tierEl => {
    const maxPrice = parseFloat(tierEl.dataset.maxPrice);
    const count = activeListings.filter(
      listing => Number(listing.originalPrice) < maxPrice
    ).length;

    const countEl = tierEl.querySelector('.price-tier-count');
    if (countEl) {
      countEl.textContent = `${count.toLocaleString()} listing${count === 1 ? '' : 's'}`;
    }
  });
}



const renderCategories = () => {
  categoryCarousel.innerHTML = "";
  categories.forEach(data => {
  console.log(data)
  let wrapper = document.createElement('div');
  wrapper.classList.add("category-wrapper");
  wrapper.dataset.category = data.category;
  wrapper.innerHTML = 
    ` 
      <a href="/shop/shop.html?category=${data.category}">
        <div class="category">
          <img src="${data.image}" alt="sneaker">
        </div>
        <div class="category-title">${data.title}</div>
      </a>
    `;

    categoryCarousel.appendChild(wrapper);
    
  });
};

renderCategories();


// const displayProduct = (products) => {
//   const proContainer = document.querySelector('.pro-container');
//   proContainer.innerHTML = "";
//   if (products.length === 0) {
//     proContainer.innerHTML = `<div class="no-results">No results!</div>`
//   }
//   products.forEach((doc) => {
//     const productData = doc.data();
//     const productElement = document.createElement("div");
//     productElement.classList.add("pro");
//     productElement.onclick = () => {
//       window.location.href = `shop/product.html?id=${doc.id}`;
//     };
//     productElement.innerHTML = `
      
//             <!--- Image container-->
//             <div class="product-image">
//               <div class="liked">
//                 <i class="fa-regular fa-heart"></i>
//               </div>

//               <img
//                 src="${productData.images[0].url}"
//                 class="image-custom"
//                 alt="${productData.productName}"
//               />
//             </div>
//             <!--- Image container-->

//             <!-- product details -->
//             <div class="des">
//               <div class="price-description">
//                 <p class="product-name">
//                   ${productData.productName}
//                 </p>
                
//                 <div class="pro-price">
//                   <span>$${productData.originalPrice}</span>
//                   <div class="price-change">
//                     <div class="product-discount">
//                       <p>20% OFF</p>
//                     </div>
//                     <div class="price-trend">
//                       <i class="fa-solid fa-arrow-trend-up"></i>
//                       <span>+5%</span>
//                     </div>
//                   </div>
//                 </div>

//               </div>
              
//             </div>
//             <!-- product details -->
          
//     `;
//     proContainer.appendChild(productElement);
//   });
// }


// setupSliderEffect = () => {
//   const prodcontainers = [...document.querySelectorAll(".pro-container")];
//   const nextBTn = [...document.querySelectorAll("nxt-btn")];
//   const preBTn = [...document.querySelectorAll("pre-btn")];

//   prodcontainers.forEach((item, i) => {
//     let containerDimensions = item.getBoundingClientRect();
//     let containerWidth = containerDimensions.width;

//     nextBTn[i].addEventListener("click", () => {
//       item.scrollLeft += containerWidth;
//     });

//     preBTn[i].addEventListener("click", () => {
//       item.scrollLeft -= containerWidth;
//     });
//   });
// };
//fetch prod cards
// const getProducts = (tag) => {
//     return fetch('/get-products', {
//         method: "post",
//         headers: new Headers({ 'Content-Type': 'application/json' }),
//         body: JSON.stringify({ tag: tag })
//     })
//         .then(res => res.json())
//         .then(data => {
//             return data;
//         })
// }

// create product slider
const createProductSlider = (data, parent, title) => {
  let slideContainer = document.querySelector(`${parent}`);

  slideContainer.innerHTML += `<section id="product1" class="section-p1">
      <h2>${title}</h2>
      ${createProductCards(data)}
      </section>

    
    `;

  setupSliderEffect();
};

const createProductCards = (data, parent) => {
  //here parent is for search product
  let start = '<div class="pro-container" id="shop">';
  let middle = ""; // this will contain card HTML
  let end = "</div>";

  for (let i = 0; i < data.length; i++) {
    if (data[i].id != decodeURI(location.pathname.split("/").pop())) {
      middle += ` <div class="pro product-card product-image">
                    
        <img src="${data[i].images[0]}" alt="">
        <div class="des" onclick="location.href = '/product/${data[i].id}'">
            <span>${data[i].name}</span>
            <!-- insert product name below !-->
            <h5>${data[i].shortDes}</h5>
            <div class="star">
                <i class="fas fa-star"></i>
                <i class="fas fa-star"></i>
                <i class="fas fa-star"></i>
                <i class="fas fa-star"></i>
                <i class="fas fa-star"></i>
            </div>
            <!-- insert price final price here !-->
            <h4 class="price">${data[i].sellPrice}</h4><span class="actual-price">${data[i].actualPrice}</span>
        </div>
    <a href="#"><i class="fas fa-shopping-cart cart"></i></a>
    </div>
        `;
    }
  }

  if (parent) {
    let cardContainer = document.querySelector(parent);
    cardContainer.innerHTML = start + middle + end;
  } else {
    return start + middle + end;
  }
};



document.addEventListener("DOMContentLoaded", () => {
  const slides = document.querySelectorAll(".slide");
  const prevButton = document.querySelector(".prev-arrow");
  const nextButton = document.querySelector(".next-arrow");
  const indicatorsContainer = document.querySelector(".slide-indicators");

  let currentSlide = 0;
  let slideInterval;
  let isPaused = false;

  // Create indicators
  slides.forEach((_, index) => {
    const indicator = document.createElement("div");
    indicator.classList.add("indicator");
    if (index === 0) indicator.classList.add("active");
    indicator.addEventListener("click", () => {
      goToSlide(index);
      resetInterval();
    });
    indicatorsContainer.appendChild(indicator);
  });

  const indicators = document.querySelectorAll(".indicator");

  function updateSlides() {
    slides.forEach((slide) => slide.classList.remove("active"));
    indicators.forEach((indicator) => indicator.classList.remove("active"));

    slides[currentSlide].classList.add("active");
    indicators[currentSlide].classList.add("active");
  }

  function nextSlide() {
    currentSlide = (currentSlide + 1) % slides.length;
    updateSlides();
  }

  function prevSlide() {
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    updateSlides();
  }

  function goToSlide(index) {
    currentSlide = index;
    updateSlides();
  }

  function resetInterval() {
    clearInterval(slideInterval);
    if (!isPaused) {
      slideInterval = setInterval(nextSlide, 5000);
    }
  }

  if (prevButton) {
    prevButton.addEventListener("click", () => {
      prevSlide();
      resetInterval();
    });
  }
  if (nextButton)
    nextButton.addEventListener("click", () => {
      nextSlide();
      resetInterval();
    });

  // Start automatic sliding
  slideInterval = setInterval(nextSlide, 5000);

  // Pause on hover
  const slidesContainer = document.querySelector(".slider-container");
  if (slidesContainer) {
    slidesContainer.addEventListener("mouseenter", () => {
      isPaused = true;
      clearInterval(slideInterval);
    });
    slidesContainer.addEventListener("mouseleave", () => {
      isPaused = false;
      resetInterval();
    });
  }
});
