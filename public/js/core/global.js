import { collection, addDoc, getDocs, where, query, limit, getDoc, startAfter } from '../api/firebase-client.js';
import { getStorage, ref, uploadString, getDownloadURL, deleteDoc, setDoc, serverTimestamp, db, doc, app } from '../api/firebase-client.js';
import { getCartItems } from '../components/cartDrawer.js';
import { checkUserStatus } from '../auth/auth.js';

const currentUser = await checkUserStatus();
const cartItemCount = await getCartItems(currentUser);
let cartCount = Number(localStorage.getItem('cartCount')) || 0;
setCartCount(cartItemCount.length);

/**
 * favorites/{userId}/items/{listingId} -- doc ID is the listingId itself,
 * each doc denormalizes the listing's display fields (mirrors how
 * order.item already does this elsewhere in the app).
 */
let favoritedIds = await getFavoritedIds(currentUser?.userId);

async function getFavoritedIds(userId) {
  if (!userId) return new Set();

  try {
    const itemsRef = collection(db, "favorites", userId, "items");
    const snapshot = await getDocs(itemsRef);
    return new Set(snapshot.docs.map((d) => d.id));
  } catch (error) {
    console.error("Error fetching favorited ids:", error);
    return new Set();
  }
}

async function addFavorite(userId, listingId, listingData) {
  await setDoc(doc(db, "favorites", userId, "items", listingId), {
    listingId,
    productName: listingData.productName || "",
    originalPrice: listingData.originalPrice || 0,
    brand: listingData.brand || "",
    category: listingData.category || "",
    images: listingData.images || [],
    addedAt: serverTimestamp(),
  });
}

async function removeFavorite(userId, listingId) {
  await deleteDoc(doc(db, "favorites", userId, "items", listingId));
}


export async function getCountries() {
  try {
    const response = await fetch('/countries');

    if (!response.ok) {
      throw error;
    }

    const res = await response.json();
    return res;

  } catch (error) {
    console.error(`Failed to fetch countries: ${error}`)
  }
}

export async function getStates() {
  try {
    const response = await fetch('/states');

    if (!response.ok) {
      throw error;
    }

    const res = await response.json();
    return res;

  } catch (error) {
    console.error(`Failed to fetch countries: ${error}`)
  }
}

async function addToCart(itemData, currentUser, itemType = 'product') {
  if (!itemData) {
    console.error("❌ No item provided for addToCart");
    return { success: false, error: "No item provided" };
  }

  try {
    let cartItem;
    let dedupeField;
    let dedupeValue;

    if (itemType === 'authentication') {
      // itemData here is the authRequestData object built in authenticate.js
      // (images, requestId, productDetails, tierSelection) -- not a productId.
      // TODO: build the auth cart item. cart.js's createAuthCartItem() is close
      // but unused/untested -- worth checking its Brand/tier.cost assumptions
      // against what collectProductData()/gatherTierInformattion() actually produce.
      cartItem = createAuthCartItem(itemData);
      dedupeField = 'authRequestId';
      dedupeValue = cartItem.authRequestId;
    } else {
      const profile = await getSellerInfo(itemData);

      if (!profile) throw new Error("Seller information does not exist");

      cartItem = {
        sellerName: profile.username,
        sellerPicture: profile.profilePicture,
        sellerId: profile.id,
        listingId: itemData,
        listingPrice: profile.listingPrice,
        image: profile.listingImage,
        size: profile.listingSize,
        quantity: 1,
        brand: profile.listingBrand,
        productName: profile.productName,
        shipping: profile.shipping
      };
      dedupeField = 'listingId';
      dedupeValue = itemData;
    }

    if (!currentUser) {
      const existingCart = JSON.parse(localStorage.getItem('cart')) || [];

      const filteredCart = existingCart.filter(item => item[dedupeField] !== dedupeValue);

      filteredCart.push(cartItem);

      localStorage.setItem('cart', JSON.stringify(filteredCart));
    } else {
        const firebaseId = await createCartItemInFirebase(cartItem, currentUser.userId);
        cartItem.id = firebaseId;
    }

    incrementCartCount();

    window.dispatchEvent(new CustomEvent('cartUpdated'));

    return { success: true, item: cartItem };
  } catch(error) {
    console.error(`Adding to cart failed: ${error}`);
    return { success: false, error: error.message };
  }
}


// builds { itemType: 'authentication', authRequestId, primaryImage, productName, category,
// tier: {name, icon, duration}, cost, status, quantity, addedAt } from an authRequestData
// shaped like { images, requestId, productDetails, tierSelection }.
function createAuthCartItem(authRequestData) {
  console.log(`Item received: ${authRequestData.productDetails} 👈🏾`)

  if (!authRequestData) { 
    throw new Error("No authRequestData provided to createAuthCartItem");
  }

  return {
      itemType: 'authentication', // ✅ Key differentiator
      authRequestId: authRequestData.requestId, // Link to auth request doc
      primaryImage: authRequestData.images[0]?.url || null,
      productName: authRequestData.productDetails?.details?.Brand || 'Unknown',
      category: authRequestData.productDetails?.productCategory,
      tier: {
          name: authRequestData.tierSelection?.type,
          icon: authRequestData.tierSelection?.icon,
          duration: authRequestData.tierSelection?.duration
      },
      cost: authRequestData.tierSelection?.cost ?? 0,
      status: 'pending', // Current status
      quantity: 1,
      addedAt: new Date().toISOString()
  };
}

async function getSellerInfo(productId) {
  const data = await getProductData(productId);
  
  const sellerId = data.userId;
  const productMainImage = data.images.find(image => image.isPrimary === true);

  return {
      id: data.userId,
      username: "",
      profilePicture: "",
      listingId: productId,
      listingPrice: data.listingPrice,
      listingSize: data.size,
      listingBrand: data.brand,
      listingImage: productMainImage.url,
      productName: data.productName,
      shipping: data.shipping
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

async function createCartItemInFirebase(cartItem, userId) {
  const cartRef = doc(db, "carts", userId);

  const subColRef = collection(cartRef, "items");

  const docRef = await addDoc(subColRef, { ...cartItem });

  return docRef.id;
}

async function removeFromCart(productId, user) {
  console.log("pId:", productId)
  console.log("user:", user)
  if(!user) {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const updatedCart = cart.filter(item => item.listingId !== productId);
    console.log("updated cart:", updatedCart)
    localStorage.setItem('cart', JSON.stringify(updatedCart))
    
  } else {
    console.log("Trying to delete from firebase...")
    try {
     await deleteItemFromFirebaseCart(productId, user.userId);
    } catch (error) {
      console.error(`Failed to remove from firebase ${error}`);
     
    }
  }
  
  window.dispatchEvent(new CustomEvent('cartUpdated'));
}

async function deleteItemFromFirebaseCart(id, userId) {
  console.log("userId:", userId)
  console.log("id", id)
  const docRef = doc(db, "carts", userId, "items", id);
  const deletedItem = await deleteDoc(docRef);
  return {delete: true, message: deletedItem}
  
}

async function calculateSubtotal(items) {
  console.log("items to calculate:", items)
  return items.reduce((acc, curr) => {
    console.log(curr)
    const price = curr.itemType === 'authentication' ? curr.cost : curr.listingPrice;
    return acc + (parseFloat(price) || 0)
  }, 0);
};

const colors = [
  { name: "Black",  value: "black",  hex: "#000000" },
  { name: "White",  value: "white",  hex: "#ffffff" },
  { name: "Multi",  value: "multi",  hex: "#46FE8C" },
  { name: "Blue",   value: "blue",   hex: "#657EEA" },
  { name: "Grey",   value: "grey",   hex: "#A1A5A4" },
  { name: "Red",    value: "red",    hex: "#C92E1A" },
  { name: "Yellow", value: "yellow", hex: "#F5BA19" },
  { name: "Brown",  value: "brown",  hex: "#593230" },
  { name: "Pink",   value: "pink",   hex: "#E8BFBA" },
  { name: "Purple", value: "purple", hex: "#504A9E" },
  { name: "Green",  value: "green",  hex: "#156340" },
  { name: "Orange", value: "orange", hex: "#F06142" },
];


const kidsRange = Array.from({ length: 12 }, (_, i) => {
  if (i < 7) {
    return 10.5 + i * 0.5;
  } 
  return 1 + (i - 7) * 0.5;
  
});
 
const mensRange = Array.from({length:17 }, (_,i) => {
  if (i > 12) {
    return i;
}
  return 6 + i * 0.5;
})

const womenRange = Array.from({length: 17}, (_,i) => {
  return 4 + i * 0.5;
});

const generateRegions = (countriesData) => {
  const selectSelect = document.getElementById("shipping-state");

  countriesData.forEach((country) => {
    // console.log(country.region)
    regions.add(country.region);
    // console.log(country.cca2)
  });

  const regionSelect = document.getElementById("shipping-state");

  if (regionSelect) {
  }
};


function formatFirebaseDate(timestamp) {
  const date = timestamp.toDate();
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function setError(inputElement, errorElement, message) {
  errorElement.textContent = message;
  inputElement.classList.add("input-error");
  errorElement.classList.add("error-msg");
}

function clearError(inputElement, errorElement) {
  errorElement.textContent = "";
  inputElement.classList.remove("input-error");
  errorElement.classList.remove("error-msg");
}

function validateEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

function validatePhone(phoneNumber) {
  const phonePattern = /^\d{3}-\d{3}-\d{4}$/;
  return phonePattern.test(phoneNumber);
}

function validateAddress(address) {
  return address.length > 5;
}

function validatePostalCode(postalCode) {
  const postalRegex = /^\d{5}(-\d{4})?$/; // Validates 12345 or 12345-6789
  return postalRegex.test(postalCode);
}

function validateForm(formElement) {
  let isValid = true; // Assume the form is valid initially

  // Get form fields
  const firstname = formElement.querySelector("[name='fname']")?.value.trim();
  const lastname = formElement.querySelector("[name='lname']")?.value.trim();
  const email = formElement.querySelector("[name='email']")?.value.trim();
  const phoneNumber = formElement
    .querySelector("[name='phoneNumber']")
    ?.value.trim();
  const username = formElement
    .querySelector("[name='profile-username']")
    ?.value.trim(); // Optional for shipping form
  const country = formElement.querySelector("[name='country']")?.value.trim();
  const addressInput = formElement.querySelector("[name='address']");
  const address = addressInput?.value.trim();
  const city = formElement.querySelector("[name='city']")?.value.trim();
  const postal = formElement.querySelector("[name='postal']")?.value.trim();
  const stateSelect = formElement
    .querySelector("[name='state-region']")
    ?.value.trim();

  // Get error message containers
  const addressError = formElement.querySelector("#addressError");
  const countryError = formElement.querySelector("#countryError");
  const fnameError = formElement.querySelector("#fnameError");
  const lnameError = formElement.querySelector("#lnameError");
  const emailError = formElement.querySelector("#emailError");
  const phoneError = formElement.querySelector("#phoneError");
  const usernameError = formElement.querySelector("#usernameError");
  const cityError = formElement.querySelector("#cityError");
  const postalError = formElement.querySelector("#postalError");
  const stateError = formElement.querySelector("#stateError");

  // Clear previous errors
  if (addressError)
    clearError(formElement.querySelector("[name='shipping-address']"), addressError);
  if (fnameError)
    clearError(formElement.querySelector("[name='fname']"), fnameError);
  if (lnameError)
    clearError(formElement.querySelector("[name='lname']"), lnameError);
  if (emailError)
    clearError(formElement.querySelector("[name='email']"), emailError);
  if (phoneError)
    clearError(formElement.querySelector("[name='phoneNumber']"), phoneError);
  if (countryError)
    clearError(formElement.querySelector("[name='country']"), countryError);
  if (usernameError)
    clearError(
      formElement.querySelector("[name='profile-username']"),
      usernameError
    );
  if (cityError)
    clearError(formElement.querySelector("[name='city']"), cityError);
  if (postalError)
    clearError(formElement.querySelector("[name='postal']"), postalError);
  if (stateError)
    clearError(formElement.querySelector("[name='state-region']"), stateError);

  console.log(phoneNumber);
  console.log(phoneError);

  // Validate First Name
  if (firstname === "" && formElement.querySelector("[name='fname']")) {
    setError(
      formElement.querySelector("[name='fname']"),
      fnameError,
      "First name is required"
    );
    isValid = false;
  }

  // Validate Last Name
  if (lastname === "" && formElement.querySelector("[name='lname']")) {
    setError(
      formElement.querySelector("[name='lname']"),
      lnameError,
      "Last name is required"
    );
    isValid = false;
  }

  // Validate Email
  if (email === "") {
    setError(
      formElement.querySelector("[name='email']"),
      emailError,
      "Please enter a email address"
    );
  } else if (email && !validateEmail(email)) {
    setError(
      formElement.querySelector("[name='email']"),
      emailError,
      "Please enter a valid email address"
    );
    isValid = false;
  }

  // Validate Phone Number if the field exists

  if (phoneNumber === "") {
    setError(
      formElement.querySelector("[name='phoneNumber']"),
      phoneError,
      "Phone number is required"
    );
  }
  if (phoneNumber && !validatePhone(phoneNumber)) {
    setError(
      formElement.querySelector("[name='phoneNumber']"),
      phoneError,
      "Please enter a valid phone number"
    );
    isValid = false;
  }

  // Validate Username (only for personal information form)
  if (
    username === "" &&
    formElement.querySelector("[name='profile-username']")
  ) {
    setError(
      formElement.querySelector("[name='profile-username']"),
      usernameError,
      "Username is required"
    );
    isValid = false;
  }

  // Validate Country
  if (country === "" && formElement.querySelector("[name='country']")) {
    setError(
      formElement.querySelector("[name='country']"),
      countryError,
      "Please select a country"
    );
    isValid = false;
  }

  // Validate state-region
  if (
    stateSelect === "" &&
    formElement.querySelector("[name='state-region']")
  ) {
    setError(
      formElement.querySelector("[name='state-region']"),
      stateError,
      "Please select the state"
    );
    isValid = false;
  }

  // Validate City
  if (city === "" && formElement.querySelector("[name='city']")) {
    setError(
      formElement.querySelector("[name='city']"),
      cityError,
      "Please enter a city"
    );
    isValid = false;
  }

  // Validate Postal Code
  /* TODO : implement a function to validate the postal code */
  if (postal === "") {
    setError(
      formElement.querySelector("[name='postal']"),
      postalError,
      "Please enter a postal code"
    );
    isValid = false;
  } else if (postal && !validatePostalCode(postal)) {
    setError(
      formElement.querySelector("[name='postal']"),
      postalError,
      "Please enter a valid postal code"
    );

    isValid = false;
  }

  // Validate Address
  if (address === "" && addressInput) {
    setError(addressInput, addressError, "Please enter a valid address");
    isValid = false;
  }

  return isValid; // Return true if valid, false if there are errors
}

function closeDropdown(event, dropdownId, headerId = null, iconId = null) {
  const dropdownContent = document.getElementById(dropdownId);
  const header = document.getElementById(headerId);
  const icon = iconId ? document.getElementById(iconId) : null; // check if an idea has been provided

  const isClickInsideDropdown =
    dropdownContent.contains(event.target) || header.contains(event.target);

  if (!isClickInsideDropdown) {
    dropdownContent.classList.remove("open");
    dropdownContent.classList.remove("active");

    // Remove rotation from the icon if it exists
    if (icon) {
      icon.classList.remove("rotate");
    } else {
      // If the dropdown is clicked, you might want to add rotation
      if (icon) {
        icon.classList.add("rotate");
      }
    }
  }
}

const loadProducts = async (field,categoryMeta, state = { lastVisible: null, filters: new Map()}) => {
  let q;
  const productsCollection = collection(db, "listings");
  const baseConstraints = [where("status", "==", "active"), where(field, "==", `${categoryMeta}`)];
  state.lastVisible ? baseConstraints.push(startAfter(state.lastVisible)) : null;
  q = query(productsCollection, ...baseConstraints, limit(48));
  
  // loop through active filters ("sort" is UI-only state, not a listing field)
  let whereConstraints = [];
  for (const [key, values] of state.filters) {
    if (key === "sort") continue;
    whereConstraints.push(where(key, "in", values));
  }

  const finalQuery = whereConstraints.length ? query(q, ...whereConstraints) : q;

  const querySnapshot = await getDocs(finalQuery);

  if (querySnapshot.empty) {
    state.hasMore = false;
    return [];
  }
  // filter products for men products
  const menProducts = querySnapshot.docs;

  state.lastVisible = menProducts[menProducts.length - 1];
  state.hasMore = menProducts.length === 48;
  console.log("Last Visible:", state.lastVisible);
  return menProducts;

};

const renderFilterTags = (filterTagsArray) => {
  // if there is not active filters remove filterTags
  if (filterTagsArray.size === 0) {
    filterDisplay.classList.remove('active');
  } else {
    // show filterTags 
    filterDisplay.classList.add("active");
    appliedFilters.innerHTML = "";

    for (const [key, values] of filterTagsArray) {
      values.forEach(v => {
        const btn = document.createElement('button');
        btn.className = "filter-button";
        btn.innerText = `${v.charAt(0).toUpperCase() + v.slice(1)} `;
        btn.dataset.filterTag = v;

        const icon = document.createElement('i');
        icon.className = `fa-solid fa-circle-xmark`;

        btn.appendChild(icon);
        appliedFilters.appendChild(btn)
      })

    

    }


  }
};

function resetFilterUI(targetValue) {
  const sortOptions = document.querySelectorAll("#sort-container .sort-content a");
  
  sortOptions.forEach(option => {
    if (option.textContent === targetValue) {
      sortSelect.textContent = "Featured";
    }
  })


  const activeColor = document.querySelector(`#colorPicker .color[data-color="${targetValue}"]`);

  if (activeColor) {
    activeColor.classList.remove('active');
  }

  const checkedFilters = document.querySelectorAll('.filter-container input[type="checkbox"]:checked');

  if (!checkedFilters.length) return;

  const match = [...checkedFilters].find(f => f.value === targetValue);

  if (match) {
    match.checked = false;
  } else {
    return;
  }

  
};

function deleteMapEntry(entry) {
  for (let [key, value] of state.filters.entries()) {
      const index = value.indexOf(entry);

      if (index !== -1) {
        value.splice(index, 1)
        if (value.length === 0) {
          state.filters.delete(key);
        }
        break;
      }
      
    }
};

function handleFavoriteClick(element, listingId, listingData) {
  const heartIcon = element.querySelector(".liked i");

  // Reflect the real current state on render, not always defaulting to
  // outline -- otherwise a user's own favorites would look unfavorited
  // every time they revisit a shop page.
  if (favoritedIds.has(listingId)) {
    heartIcon.classList.remove("fa-regular");
    heartIcon.classList.add("fa-solid");
    heartIcon.style.color = "red";
  }

  heartIcon.addEventListener("click", async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!currentUser?.userId) {
      window.location.href = "/login";
      return;
    }

    const wasFavorited = heartIcon.classList.contains("fa-solid");

    // Optimistic update -- toggle immediately, roll back if the write fails
    heartIcon.classList.toggle("fa-regular");
    heartIcon.classList.toggle("fa-solid");
    heartIcon.style.color = heartIcon.classList.contains("fa-solid") ? "red" : "black";

    try {
      if (wasFavorited) {
        await removeFavorite(currentUser.userId, listingId);
        favoritedIds.delete(listingId);
      } else {
        await addFavorite(currentUser.userId, listingId, listingData);
        favoritedIds.add(listingId);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      heartIcon.classList.toggle("fa-regular");
      heartIcon.classList.toggle("fa-solid");
      heartIcon.style.color = heartIcon.classList.contains("fa-solid") ? "red" : "black";
    }
  });
};

const updateResultsCount = (count) => {
  const pageResults = document.getElementById("pageResults");
  if (!pageResults) return;

  if (count === 1) {
    pageResults.textContent = `${count} result`;
    return;
  }
  pageResults.textContent = `${count} results`;

};

function setCartCount(count) {
  cartCount = count;
  localStorage.setItem('cartCount', cartCount);
  document.dispatchEvent(new CustomEvent('cart-updated', { detail: cartCount}))
};

export function incrementCartCount(amount = 1) {
  setCartCount(cartCount + amount);
};

export function decrementCartCount(amount = 1) {
  setCartCount(cartCount - amount);
}

export function getCartCount() {
  return cartCount;
};

export function resetCartCount() {
  setCartCount(0);
}



const displayProducts = (products, containerElement) => {
  const productsContainer = document.getElementById(`${containerElement}`);
  // clear existing products
  productsContainer.innerHTML = "";
  // display
  if (products.length === 0) {
    // Invite the user to fill the gap instead of a dead-end message.
    // Reuses .chart-empty-state so this matches the price-history empty state on product.html.
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
      window.location.href = `shop/product.html?id=${doc.id}`;
    };

    // A discount only exists if the item has a higher original price to compare against.
    const hasDiscount =
      typeof productData.originalPrice === "number" &&
      productData.originalPrice > productData.listingPrice;
    const discountPercent = hasDiscount
      ? Math.round(
          ((productData.originalPrice - productData.listingPrice) /
            productData.originalPrice) *
            100
        )
      : 0;

    const originalPriceHTML = hasDiscount
      ? `<span class="orgin-price">$${productData.originalPrice.toFixed(2)}</span>`
      : "";
    const priceChangeHTML = hasDiscount
      ? `<div class="price-change">
          <div class="product-discount">
            <p>${discountPercent}% OFF</p>
          </div>
          <div class="price-trend trend-down">
            <i class="fa-solid fa-arrow-trend-down"></i>
            <span>-${discountPercent}%</span>
          </div>
        </div>`
      : "";

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

  // update results count
  if (products.length) {
    updateResultsCount(products.length);
  }
  
};





// Payment Method Validation Utilities
class PaymentValidation {
  constructor() {
    this.cardTypes = {
      visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
      mastercard: /^5[1-5][0-9]{14}$/,
      amex: /^3[47][0-9]{13}$/,
      discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
    };
  }

  validateCardNumber(cardNumber) {
    // Remove all non-digit characters
    const cleaned = cardNumber.replace(/\D/g, "");

    // Check if empty or not the right length
    if (!cleaned || cleaned.length < 13 || cleaned.length > 19) {
      return {
        isValid: false,
        error: "Card number must be between 13 and 19 digits",
      };
    }

    // Luhn Algorithm Implementation
    let sum = 0;
    let isEven = false;

    // Loop through values starting from the rightmost side
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned.charAt(i), 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    // Determine card type
    let cardType = null;
    for (const [type, regex] of Object.entries(this.cardTypes)) {
      if (regex.test(cleaned)) {
        cardType = type;
        break;
      }
    }

    return {
      isValid: sum % 10 === 0,
      cardType,
      error: sum % 10 === 0 ? null : "Invalid card number",
    };
  }

  validateExpiryDate(month, year) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-based

    // Convert to numbers and validate format
    const expMonth = parseInt(month, 10);
    const expYear = parseInt(year, 10);

    if (isNaN(expMonth) || isNaN(expYear)) {
      return {
        isValid: false,
        error: "Invalid expiration date format",
      };
    }

    // Validate month range
    if (expMonth < 1 || expMonth > 12) {
      return {
        isValid: false,
        error: "Invalid month",
      };
    }

    // Check if card is expired
    if (
      expYear < currentYear ||
      (expYear === currentYear && expMonth < currentMonth)
    ) {
      return {
        isValid: false,
        error: "Card has expired",
      };
    }

    // Check if date is too far in the future (optional)
    if (expYear > currentYear + 10) {
      return {
        isValid: false,
        error: "Expiration date too far in the future",
      };
    }

    return {
      isValid: true,
      error: null,
    };
  }

  validateCVV(cvv, cardType = "default") {
    // Remove any non-digit characters
    const cleaned = cvv.replace(/\D/g, "");

    // Determine required length based on card type
    const requiredLength = cardType.toLowerCase() === "amex" ? 4 : 3;

    if (cleaned.length !== requiredLength) {
      return {
        isValid: false,
        error: `CVV must be ${requiredLength} digits`,
      };
    }

    return {
      isValid: true,
      error: null,
    };
  }

  validatePostalCode(postalCode, country = "US") {
    const postalRegexes = {
      US: /^\d{5}(-\d{4})?$/,
      CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
      UK: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
    };

    const regex = postalRegexes[country] || /^[A-Za-z0-9\s-]{3,10}$/;

    return {
      isValid: regex.test(postalCode),
      error: regex.test(postalCode) ? null : "Invalid postal code format",
    };
  }

  validateBankAccount(accountNumber) {
    // Remove spaces and special characters
    const cleaned = accountNumber.replace(/[\s-]/g, "");

    // Check length (most bank accounts are between 8 and 17 digits)
    if (cleaned.length < 8 || cleaned.length > 17) {
      return {
        isValid: false,
        error: "Account number must be between 8 and 17 digits",
      };
    }

    // Check if contains only digits
    if (!/^\d+$/.test(cleaned)) {
      return {
        isValid: false,
        error: "Account number must contain only digits",
      };
    }

    return {
      isValid: true,
      error: null,
    };
  }

  validateRoutingNumber(routingNumber) {
    // Remove any non-digit characters
    const cleaned = routingNumber.replace(/\D/g, "");

    // Check if it's exactly 9 digits
    if (cleaned.length !== 9) {
      return {
        isValid: false,
        error: "Routing number must be 9 digits",
      };
    }

    // Implement ABA routing number validation algorithm
    let sum = 0;
    for (let i = 0; i < cleaned.length; i++) {
      let digit = parseInt(cleaned.charAt(i), 10);
      if (i % 3 === 0) {
        sum += digit * 3;
      } else if (i % 3 === 1) {
        sum += digit * 7;
      } else {
        sum += digit;
      }
    }

    return {
      isValid: sum !== 0 && sum % 10 === 0,
      error: sum % 10 === 0 ? null : "Invalid routing number",
    };
  }
}

// Security Utilities
class PaymentSecurity {
  constructor() {
    this.lastAttempt = null;
    this.attemptCount = 0;
    this.maxAttempts = 3;
    this.cooldownPeriod = 15 * 60 * 1000; // 15 minutes in milliseconds
  }

  validateAttempt() {
    const now = Date.now();

    // Check if in cooldown period
    if (this.lastAttempt && now - this.lastAttempt < this.cooldownPeriod) {
      const remainingTime = Math.ceil(
        (this.cooldownPeriod - (now - this.lastAttempt)) / 1000 / 60
      );
      return {
        allowed: false,
        error: `Too many attempts. Please try again in ${remainingTime} minutes.`,
      };
    }

    // Reset if outside cooldown period
    if (this.lastAttempt && now - this.lastAttempt >= this.cooldownPeriod) {
      this.attemptCount = 0;
    }

    // Update attempt count
    this.attemptCount++;
    this.lastAttempt = now;

    // Check if exceeded max attempts
    if (this.attemptCount > this.maxAttempts) {
      return {
        allowed: false,
        error: "Maximum attempts exceeded. Please try again later.",
      };
    }

    return {
      allowed: true,
      error: null,
    };
  }

  validateTransaction(amount, userProfile) {
    const checks = {
      amount: this.validateTransactionAmount(amount, userProfile),
      velocity: this.checkTransactionVelocity(userProfile),
      location: this.validateLocation(userProfile),
    };

    const failed = Object.values(checks).filter((check) => !check.isValid);

    return {
      isValid: failed.length === 0,
      errors: failed.map((f) => f.error),
      requiresVerification: amount > 1000 || failed.length > 0,
    };
  }

  validateTransactionAmount(amount, userProfile) {
    const dailyLimit = userProfile.dailyLimit || 2000;
    const dailyTotal =
      userProfile.dailyTransactions?.reduce((sum, tx) => sum + tx.amount, 0) ||
      0;

    if (dailyTotal + amount > dailyLimit) {
      return {
        isValid: false,
        error: "Transaction would exceed daily limit",
      };
    }

    return {
      isValid: true,
      error: null,
    };
  }

  checkTransactionVelocity(userProfile) {
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    const maxTransactions = 3;
    const now = Date.now();

    const recentTransactions = (userProfile.transactions || []).filter(
      (tx) => now - tx.timestamp < timeWindow
    );

    return {
      isValid: recentTransactions.length < maxTransactions,
      error:
        recentTransactions.length >= maxTransactions
          ? "Too many transactions in a short period"
          : null,
    };
  }

  validateLocation(userProfile) {
    // This would integrate with a real geolocation service
    const lastLocation = userProfile.lastLocation;
    const currentLocation = userProfile.currentLocation;

    // Simplified distance check (would use proper geolocation in production)
    const isSuspiciousLocation =
      lastLocation &&
      currentLocation &&
      Math.abs(lastLocation.lat - currentLocation.lat) > 10;

    return {
      isValid: !isSuspiciousLocation,
      error: isSuspiciousLocation ? "Unusual location detected" : null,
    };
  }
}


class AdminUser {}

class User extends AdminUser {}

// Profile Utilities
class Profile {}

// Usage Example:
const validator = new PaymentValidation();
const security = new PaymentSecurity();

export { PaymentValidation, PaymentSecurity };

export {
  // generateCountries,
  validateForm,
  closeDropdown,
  validatePhone,
  validateEmail,
  validatePostalCode,
  validateAddress,
  generateRegions,
  setError,
  clearError,
  formatFirebaseDate,
  loadProducts,
  renderFilterTags,
  deleteMapEntry,
  updateResultsCount,
  displayProducts,
  resetFilterUI,
  handleFavoriteClick,
  kidsRange,
  mensRange,
  womenRange,
  colors,
  addToCart,
  removeFromCart,
  deleteItemFromFirebaseCart,
  createCartItemInFirebase,
  createAuthCartItem,
  getSellerInfo,
  getProductData,
  calculateSubtotal

};