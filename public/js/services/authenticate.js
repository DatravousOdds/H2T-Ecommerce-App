import { getStorage, ref, uploadString, getDownloadURL, deleteDoc } from '../api/firebase-client.js';
import { collection, addDoc, db, serverTimestamp, getDocs, query, where } from '../api/firebase-client.js';
import { checkUserStatus } from '../auth/auth.js';
import { initCartDrawer } from '../components/cartDrawer.js';
import { getUserCartCount, updateCartCount } from '../commerce/cart.js';
import { addToCart, createAuthCartItem } from '../core/global.js';

const storage = getStorage();

initCartDrawer();



let currentUser = null;
currentUser = await checkUserStatus();
console.log("current User:", currentUser);


// Image upload functionality
const imageInputs = document.querySelectorAll(".file-input");
const imageItems = document.querySelectorAll(".image-item");
const reviewImages = document.querySelectorAll('.review-image');
// auth form
const authSubmitBtn = document.getElementById('submitAuthBtn');
const payNowBtn = document.getElementById('payNowBtn');
// categories selection functionality
const categories = document.getElementById('categories');
const dynamicFormContainer = document.getElementById('dynamic-form-container');
let categorySelected;
// product sku search
const productSkuInput = document.getElementById('productSku');
const skuSearchGroup = document.getElementById('skuSearchGroup');
const SKU_DEBOUNCE_MS = 250;
const SKU_MAX_RESULTS = 8;
let cachedActiveListings = null;
let skuDebounceTimer = null;
// cart modal actions
const cartModal = document.getElementById('addedToCartModal');
const cartItemCount = document.getElementById('cartItemCount');
const addAnotherItemBtn = document.getElementById('addAnotherItemBtn');
const viewCartBtn =  document.getElementById('viewCartBtn');
// tier containers
const tierContainers = document.querySelectorAll('.tier-container');
// review 
const reviewTier = document.querySelector('.review-tier');
// Keep track of current step
let currentStep = 1;
const nextBtn = document.querySelectorAll(".next-btn");
const backBtn = document.querySelectorAll(".back-btn");
const formSteps = document.querySelectorAll(".form-step");

const validationRules = {
      'Trading Cards': 
      [
        {id: 'card-brand', name: 'Brand', required: true },
        {id: 'card-name', name: 'Card Name', required: true },
        {id: 'card-set', name: 'Set', required: true },
        {id: 'card-year', name: 'Year', required: true, type: 'number' },
        {id: 'card-condition', name: 'Condition', required: true },

        // Other details
        {id: 'card-number', name: 'Card Number', required: false },
        {id: 'card-edition', name: 'Card Edition', required: false },
        {id: 'card-grading-company', name: 'Card Grading Company', required: false },
        {id: 'card-additionalDetails', name: 'Additional Details', required: false },

      ],
      'Apparel': 
      [
        {id: 'apparel-brand', name: 'Brand', required: true, type: 'text'},
        {id: 'apparel-type', name: 'Item Type', required: true },
        {id: 'apparel-size', name: 'Size', required: true },
        {id: 'apparel-condition', name: 'Condition', required: true },
        {id: 'apparel-color', name: 'Color', required: true, type: 'text'},

        // Other details
        {id: 'apparel-material', name: 'Material', required: false, type: 'text'},
        {id: 'apparel-style', name: 'Style', required: false, type: 'text'},
        {id: 'apparel-additionalDetails', name: 'Additional Details', required: false, type: 'text'},

      ],
      'Sneakers': 
      [
        {id: 'sneaker-brand', name: 'Brand', required: true, type: 'text'},
        {id: 'sneaker-model', name: 'Model', required: true, type: 'text'},
        {id: 'sneaker-size', name: 'Size', required: true },
        {id: 'sneaker-condition', name: 'Condition', required: true },

        // Other details
        {id: 'sneaker-color', name: 'Color', required: false },
        {id: 'sneaker-year', name: 'Condition', required: false },
        {id: 'sneaker-additionalDetails', name: 'Additonal Details', required: false },


      ],
      'Shoes':
      [
        {id: 'shoes-brand', name: 'Brand', required: true, type: 'text'},
        {id: 'shoes-model', name: 'Model', required: true, type: 'text'},
        {id: 'shoes-type', name: 'Shoe Type', required: true },
        {id: 'shoes-color', name: 'Color', required: true, type: 'text' },
        {id: 'shoes-condition', name: 'Condition', required: true },

        // Other details
        {id: 'shoes-material', name: 'Material', required: false },
        {id: 'shoes-additionalDetails', name: 'Additonal Details', required: false },

      ],
      'Accessories': 
      [
        // Required fields
        {id: 'accessories-type', name: 'Accessory Type', required: true },
        {id: 'accessories-brand', name: 'Brand', required: true, type: 'text'},
        {id: 'accessories-condition', name: 'Condition', required: true },

        // Other details
        {id: 'accessories-model', name: 'Model', required: false },
        {id: 'accessories-color', name: 'Color', required: false },
        {id: 'accessories-size', name: 'Size', required: false },
        {id: 'accessories-year', name: 'Year', required: false },
        {id: 'accessories-additionalDetails', name: 'Additional Details', required: false },
      ]
}

const forms = {
  "Accessories": "/authenticator/templates/accessories-form.html",
  "Apparel": "/authenticator/templates/apparel-form.html",
  "Shoes": "/authenticator/templates/shoes-form.html",
  "Sneakers": "/authenticator/templates/sneakers-form.html",
  "Trading Cards": "/authenticator/templates/trading-card-form.html"
}

let formData = {
  images: [],
  productDetails: {},
  productSku: '',
  tierSelection: ''
}

// Draft persistence -- sessionStorage (not localStorage) because this
// should survive a refresh but not linger after the tab is closed.
const DRAFT_STORAGE_KEY = 'h2t_auth_draft';

imageInputs.forEach((input) => {
  const imageItem = input.closest(".image-item");
  const removeImageBtn = imageItem.querySelector(".remove-image-btn");
  const previewContainer = imageItem.querySelector(".preview-container");
  const imagePreview = imageItem.querySelector(".image-preview");
  const uploadIcon = imageItem.querySelector(".upload-icon");
  const uploadText = imageItem.querySelector(".upload-text");

  // Handle file selection
  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    const slotIndex = parseInt(e.target.dataset.index);

    if (file) {
      // Validate file type
      if (file.size > 5 * 1024 * 1024) {
        alert("File too large");
        input.value = "";
        return;
      }

      if (!file.type.match("image/*")) {
        alert("Invalid file type");
        input.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        // Find the parent image-item and update its background
        imagePreview.src = e.target.result;
        imagePreview.style.display = "block";

        // Hide upload elements
        uploadIcon.style.display = "none";
        if (uploadText) {
          uploadText.style.display = "none";
        }

        reviewImages[slotIndex].src = e.target.result;

        // Show remove button
        removeImageBtn.style.display = "block";
      };
      reader.readAsDataURL(file);
    }
  });

  // Remove background Image
  removeImageBtn.addEventListener("click", (e) => {
    e.preventDefault();

    // Reset the file input
    input.value = "";

    // Reset the preview
    imagePreview.src = "";
    imagePreview.style.display = "none";

    // Show upload elements again
    uploadIcon.style.display = "block";

    if (uploadText) {
      uploadText.style.display = "block";
    }
    

    // Hide remove button
    removeImageBtn.style.display = "none";
  });

  
});

async function fetchActiveListingsForSkuSearch() {
  if (cachedActiveListings) return cachedActiveListings;

  const listingsRef = collection(db, 'listings');
  const q = query(listingsRef, where('status', '==', 'active'));
  const snapshot = await getDocs(q);

  cachedActiveListings = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  return cachedActiveListings;
}

function matchesSku(listing, term) {
  return (listing.sku || '').toLowerCase().includes(term.toLowerCase());
}

function skuResultRowHTML(listing) {
  const imageUrl = listing.images?.[0]?.url || '/images/HypebeastBG.jpeg';

  return `
    <div class="search-result-item" data-sku="${listing.sku}">
      <img src="${imageUrl}" alt="${listing.productName || ''}" class="search-result-image" loading="lazy" />
      <div class="search-result-info">
        <p class="search-result-name">${listing.productName || 'Untitled listing'}</p>
        <p class="search-result-meta">SKU: ${listing.sku}</p>
      </div>
    </div>
  `;
}

const skuResultsPanel = document.createElement('div');
skuResultsPanel.className = 'search-results-panel';
skuSearchGroup.appendChild(skuResultsPanel);

function renderSkuResults(results, term) {
  if (!term) {
    skuResultsPanel.innerHTML = '';
    skuResultsPanel.classList.remove('active');
    return;
  }

  if (results.length === 0) {
    skuResultsPanel.innerHTML = `<p class="search-no-results">No product with this SKU</p>`;
    skuResultsPanel.classList.add('active');
    return;
  }

  skuResultsPanel.innerHTML = results.slice(0, SKU_MAX_RESULTS).map(skuResultRowHTML).join('');
  skuResultsPanel.classList.add('active');
}

productSkuInput.addEventListener('input', () => {
  const term = productSkuInput.value.trim();

  clearTimeout(skuDebounceTimer);
  skuDebounceTimer = setTimeout(async () => {
    saveDraftState();

    if (!term) {
      renderSkuResults([], term);
      return;
    }

    try {
      const listings = await fetchActiveListingsForSkuSearch();
      const results = listings.filter(listing => matchesSku(listing, term));
      renderSkuResults(results, term);
    } catch (error) {
      console.error('Error searching listings by SKU:', error);
    }
  }, SKU_DEBOUNCE_MS);
});

// Listing docs (seller.js) only ever save brand/condition/size/description --
// no model/color/material/etc. So only these four can be auto-filled; the
// rest of each category's fields still need the user to fill them in by hand.
const LISTING_FIELD_MAP = {
  brand: 'brand',
  condition: 'condition',
  size: 'size',
  additionalDetails: 'description'
};

function fillFormFieldsFromListing(listing, category) {
  const rules = validationRules[category];
  if (!rules) return;

  rules.forEach(rule => {
    const suffix = rule.id.split('-').slice(1).join('-');
    const listingField = LISTING_FIELD_MAP[suffix];
    if (!listingField) return;

    const value = listing[listingField];
    if (value === undefined || value === null || value === '') return;

    const element = document.getElementById(rule.id);
    if (element) element.value = value;
  });
}

skuResultsPanel.addEventListener('click', async (e) => {
  const item = e.target.closest('.search-result-item');
  if (!item) return;

  const sku = item.dataset.sku;
  const listing = cachedActiveListings?.find(l => l.sku === sku);

  productSkuInput.value = sku;
  formData.productSku = sku;
  skuResultsPanel.classList.remove('active');

  if (listing?.category && forms[listing.category]) {
    categories.value = listing.category;
    categorySelected = listing.category;
    await formLocator(categorySelected);
    fillFormFieldsFromListing(listing, categorySelected);
  }
});

document.addEventListener('click', (e) => {
  if (!skuSearchGroup.contains(e.target)) {
    skuResultsPanel.classList.remove('active');
  }
});

categories.addEventListener('change', (e) => {
  const target = e.target.value;
  categorySelected = target;
  
  // get form
  formLocator(categorySelected);


})

authSubmitBtn.addEventListener('click', handleAddToCartSubmission);
payNowBtn.addEventListener('click', handlePayNowSubmission);

addAnotherItemBtn.addEventListener('click', () => {
  // reset step
  currentStep = 1;
  showStep(currentStep);
  clearDraftState();
  // reset form data
  formData = {
    images: [],
    productDetails: {},
    productSku: null,
    tierSelection: null
  };

  resetImages();

  categories.value = "";
  categorySelected = null;

  if (dynamicFormContainer) {
    dynamicFormContainer.innerHTML = "";
  }

  tierContainers.forEach(tier => {
    tier.classList.remove('selected');
  });

  clearValidationErrors();

  updateProgressBar(1);

  cartModal.style.display = "none";

  const root = document.documentElement;
  root.style.setProperty('--progress-percentage', '20%');

});

viewCartBtn.addEventListener('click', () => {
  // go to cart
  window.location.href = '/cart';
})

cartModal.addEventListener('click', (event) => {
  console.log("clicked:",event.target)
  if (event.target !== cartModal) {
    cartModal.style.display = "none";
  }
})

tierContainers.forEach(tier => {
  tier.addEventListener('click', () => {
    if (tier.classList.contains('disabled-tier')) return;

    tierContainers.forEach(t => {
      t.classList.remove('selected');
    })

    tier.classList.add('selected');
    formData.tierSelection = gatherTierInformation();
    saveDraftState();
  })
})

// Fields are injected dynamically via formLocator(), so listen on the
// container rather than on individual inputs that don't exist yet.
dynamicFormContainer.addEventListener('input', () => {
  saveDraftState();
});

const editButtons = {
  images: {
    selector:'.review-images .review-edit',
    step: 3
  },
  details: {
    selector:'.review-details .review-edit',
    step: 2
  }
};

Object.entries(editButtons).forEach(([name, config]) => {
  const button = document.querySelector(config.selector);

  if (button) {
    button.addEventListener('click', () => {
      currentStep = config.step;
      showStep(currentStep);
      saveDraftState();
    });
    console.log(`${name} edit button found`);
  } else {
    console.error(`${name} edit button not found: ${config.selector}`);
  }
})

function clearValidationErrors() {
  const imageErrorsContainer = document.querySelector(".image-section-errors");
  if  (imageErrorsContainer) {
    imageErrorsContainer.innerHTML = "";
  }

  const validationErrors = document.querySelector(".validation-errors");
  if (validationErrors) {
    validationErrors.innerHTML = "";
  }

  document.querySelectorAll(".error").forEach(el => {
    el.classList.remove("error");
  });
}

function resetImages() {
  imageInputs.forEach((input, index) => {
    input.value = "";

    const imageItem = input.closest(".image-item");
    const imagePreview = imageItem.querySelector(".image-preview");
    const uploadIcon = imageItem.querySelector(".upload-icon");
    const uploadText = imageItem.querySelector(".upload-text");
    const removeImageBtn = imageItem.querySelector(".remove-image-btn");

    if (imagePreview) {
      imagePreview.src = "";
      imagePreview.style.display = "none";
    }

    if (uploadIcon) {
      uploadIcon.style.display = "block";
    }

    if (uploadText) {
      uploadText.style.display = "block";
    }

    if (removeImageBtn) {
      removeImageBtn.style.display = "none";
    }

    if (reviewImages[index]) {
      reviewImages[index].src = "";
    }
  })

  console.log("✅ All image reset");
}

function collectDraftFieldValues() {
  if (!categorySelected) return {};

  const rules = validationRules[categorySelected] || [];
  const values = {};

  rules.forEach(rule => {
    const element = document.getElementById(rule.id);
    if (element) values[rule.id] = element.value;
  });

  return values;
}

function saveDraftState() {
  const draft = {
    step: currentStep,
    category: categorySelected || null,
    productSku: productSkuInput.value || '',
    tierSelection: formData.tierSelection || null,
    fieldValues: collectDraftFieldValues()
  };

  try {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    // Quota exceeded or storage disabled (private browsing) -- losing the
    // draft isn't worth breaking the form over.
    console.warn('Could not save authentication draft:', error);
  }
}

function clearDraftState() {
  sessionStorage.removeItem(DRAFT_STORAGE_KEY);
}

async function restoreDraftState() {
  let draft;

  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return;
    draft = JSON.parse(raw);
  } catch (error) {
    console.warn('Could not read saved authentication draft:', error);
    return;
  }

  if (draft.category && forms[draft.category]) {
    categories.value = draft.category;
    categorySelected = draft.category;
    await formLocator(categorySelected);

    Object.entries(draft.fieldValues || {}).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.value = value;
    });

    // Restoring the DOM fields isn't enough -- formData.productDetails is
    // only ever set inside validateStep(2), which a restored draft may skip
    // (currentStep is capped at 3 below). Rebuild it here so a refresh past
    // step 2 doesn't submit with an undefined productCategory.
    formData.productDetails = collectProductData(categorySelected);
  }

  if (draft.productSku) {
    productSkuInput.value = draft.productSku;
    formData.productSku = draft.productSku;
  }

  if (draft.tierSelection) {
    formData.tierSelection = draft.tierSelection;

    const matchingTier = Array.from(tierContainers).find(tier => {
      const typeEl = tier.querySelector('[data-tier-type]');
      return typeEl && typeEl.textContent.trim() === draft.tierSelection.type;
    });

    if (matchingTier) matchingTier.classList.add('selected');
  }

  // Uploaded images are data URLs -- too large to round-trip through
  // sessionStorage reliably, so they're never persisted (see
  // saveDraftState). If the saved step was past the upload step, land
  // back on step 3 to re-add images rather than opening the review step
  // with no images in it.
  currentStep = Math.min(draft.step || 1, 3);
}

function prevStep() {
  if (currentStep > 1) {
    currentStep--;
    showStep(currentStep);
    updateProgressBar(currentStep);
    saveDraftState();
  }
}

function nextStep() {
  currentStep++;
  showStep(currentStep);
  updateProgressBar(currentStep);
  saveDraftState();
}

function showStep(stepNumber) {
  // hide all steps
  formSteps.forEach((step) => {
    step.style.display = "none";
  });

  // gets the id of the of the step number and shows that step
  document.getElementById(`step${stepNumber}`).style.display = "block";

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

  updateProgressSteps(stepNumber);
}

function updateProgressBar(currentStep) {

  const root = document.documentElement;

  let progressPercentage;
  
  if (currentStep === 1) {
     progressPercentage = '30%'
  } else if (currentStep === 2) {
    progressPercentage = '50%'
  } else if (currentStep === 3) {
    progressPercentage = '75%'
  } else if (currentStep === 4) {
    progressPercentage = '100%'
  }

  root.style.setProperty('--progress-percentage', progressPercentage); 
}

function updateProgressSteps(currentStep) {
  const steps = document.querySelectorAll(".progress-steps .step");

  steps.forEach((step, index) => {
    if (index + 1 < currentStep) {
      // Completed steps
      step.classList.remove("active");
      step.classList.add("completed");
    } else if (index + 1 === currentStep) {
      // Current step
      step.classList.remove("active");
      step.classList.add("completed");
    } else {
      // Future steps
      step.classList.remove("active", "completed");
    }
  });
}

function collectProductData(category) {
  const rules = validationRules[category.trim()];
  
  if(!rules) {
    console.error(`Unknown category: ${category}`)
  }

  const productData = {
    productCategory: category,
    details: {}
  };

  rules.forEach(rule => {

    const element = document.getElementById(rule.id);

      if (!element) {
        console.log(`${element} not found!`);
        return;
      }

      let value = element.value.trim();

      if(value && rule.type === 'number') {
        value = Number(element.value);
      } else if (value && rule.type === 'textarea') {
        value = element.value.trim();
      } else {
        value = element.value.trim() || null;
      }

      if(value !== '' && value !== null) {
        productData.details[rule.name] = value;
      }     
  });

  return productData;
}

function collectImageData() {
  const images = document.querySelectorAll('.image-preview');
  const imageData = [];

  images.forEach((img, index) => {
    const src = img.getAttribute('src');
    if (src && src.trim() !== '') {
      imageData.push({
        index: index,
        url:src,
        isPrimary:index === 0
      });
    }
  });

  return imageData;
}

function validateForm(form) {
    const validationErrors = document.querySelector('.validation-errors');
    const rules = validationRules[form.trim()];

    const errors = [];

    rules.forEach(rule => {
      const element = document.getElementById(rule.id);

      if (!element) {
        console.log('No element found!');
      }

      const value = element.value.trim();

      if(!value && rule.required) {
        errors.push(`${rule.name} is required`);
        element.classList.add('error');
        return;
      }

      if (rule.type === 'number' && value && isNaN(value)) {
        errors.push(`${rule.name} is must a number`);
        element.classList.add('error');
        return;
      }

      element.classList.remove('error');

    })

    if (errors.length > 0) {
      if (validationErrors) {
        validationErrors.innerHTML = `
      <div class="error-message">
        <h4>
          <i class="fa-solid fa-circle-exclamation"></i>
          Please fix the following errors 
         </h4>
        <ul>
          ${errors.map(error => `<li>${error}</li>`).join('')}
        </ul>
      </div>
      `;

      validationErrors.scrollIntoView({behavior: 'smooth', block: 'center'});

      } else {
        alert(errors.join('\n'));
      }
    
      return false;
    }

    // if no errors clear any current errors
    if (validationErrors) {
      validationErrors.innerHTML = '';
    }
    return true;  
}

function validateStep(stepNumber) {
  if (stepNumber === 1) {
    const selectedTier = document.querySelector('.tier-container.selected');
    if (!selectedTier) {
      showNotification('Please select a tier','error');
      return false;
    }
    formData.tierSelection = gatherTierInformation();

    return true;

  } else if (stepNumber === 3) {

    const imgErrorsContainer = document.querySelector('.image-section-errors');
    const images = document.querySelectorAll('.image-preview');
    const REQUIRED_IMAGES = 5;

    let uploadedImages = 0;
    let emptyIndexes = [];
    
    images.forEach((img, index) => {
      const src = img.getAttribute('src');
      if (src && src.trim() !== '') {
        uploadedImages++;
      } else {
        emptyIndexes.push(index + 1);
      }
    });

    if (uploadedImages < REQUIRED_IMAGES) {
      
      if (imgErrorsContainer) {

        imgErrorsContainer.innerHTML = `
          <div class="error-message u-d-flex">
            <i class="fa-solid fa-circle-exclamation"></i>
            <h4>Please upload ${REQUIRED_IMAGES} images, currently uploaded ${uploadedImages}</h4>
          </div>
        `

        imgErrorsContainer.scrollIntoView({behavior: 'smooth', block: 'center'})
      } else {

        alert(`Please upload ${REQUIRED_IMAGES} images, currently uploaded ${uploadedImages}`);

      }

      return false;

    } else {

      formData.images = collectImageData();
      imgErrorsContainer.innerHTML = '';
      return true;
    }

  } else if (stepNumber === 2) {
    if (!categorySelected) {
      showNotification('Please select a category', 'error')
    }

    if (!validateForm(categorySelected)) {
      return false;
    }

    formData.productDetails = collectProductData(categorySelected);
    displayReviewData(formData);

    return true;
  } else if (stepNumber === 4) {
    const terms1 = document.getElementById('terms1');
    const terms2 = document.getElementById('terms2');

    if (!terms1?.checked || !terms2?.checked) {
      showNotification('Please confirm both checkboxes before submitting', 'error');
      return false;
    }

    return true;
  }
}

// Shared by both submission paths: uploads images and creates the
// authenticationRequests doc. AI matching is *not* triggered here anymore --
// it now fires from the Stripe webhook once payment is confirmed, so it
// actually matches what the terms2 checkbox tells the user ("the
// authentication process will begin once payment is confirmed").
async function createAuthenticationRequest() {
  authSubmitBtn.disabled = true;
  payNowBtn.disabled = true;

  console.log("Submitting authentication request with data:", formData);

  const result = await submitToFirebase();

  if (!result.success) {
    throw new Error("Failed to upload images");
  }

  console.log("✅ Images uploaded successfully!");

  const authRequestData = {
    images: result.images || null,
    requestId: result.requestId || null,
    productDetails: formData.productDetails || null,
    tierSelection: formData.tierSelection || null,
  };

  return { requestId: result.requestId, authRequestData };
}

async function handleAddToCartSubmission() {
  if (!validateStep(4)) {
    return;
  }

  authSubmitBtn.textContent = "Uploading images...";

  try {
    const { requestId, authRequestData } = await createAuthenticationRequest();

    authSubmitBtn.textContent = "Adding to cart...";

    const cartResult = await addToCart(authRequestData, currentUser, 'authentication');
    console.log("cart results: ", cartResult.success);

    if (!cartResult.success) {
      await deleteFirebaseRequest(requestId);
      throw new Error("Failed to add item to cart");
    }

    console.log("✅ Added item to cart!");
    authSubmitBtn.textContent = "Success!";
    clearDraftState();

    const cartCount = await getUserCartCount(currentUser);
    updateCartCount(cartCount);

    cartModal.classList.add("show");
    cartItemCount.textContent = cartCount;

    showNotification("Item successfully added!", "success");
  }
  catch (error) {
    console.error("❌ Submission failed!", error);

    showNotification(error.message || "Something went wrong. Please try again.", "error");

    cartModal.classList.remove("show");
  }

  setTimeout(() => {
    authSubmitBtn.innerHTML = `<i class="fa-solid fa-cart-plus"></i> Add to Cart`;
    authSubmitBtn.disabled = false;
    payNowBtn.disabled = false;
    },
  3000);
}

async function handlePayNowSubmission() {
  if (!validateStep(4)) {
    return;
  }

  payNowBtn.textContent = "Uploading images...";

  try {
    const { requestId, authRequestData } = await createAuthenticationRequest();

    // Skip the cart entirely -- stash the same item shape addToCart()
    // would have stored, then hand off to checkout.js the same way
    // cart.js's per-item Checkout button does for a product listing.
    const cartItem = createAuthCartItem(authRequestData);
    sessionStorage.setItem('item', JSON.stringify(cartItem));

    clearDraftState();

    window.location.href = `/checkout?authRequestId=${requestId}`;
  }
  catch (error) {
    console.error("❌ Submission failed!", error);

    showNotification(error.message || "Something went wrong. Please try again.", "error");

    payNowBtn.innerHTML = `<i class="fa-solid fa-credit-card"></i> Pay Now`;
    payNowBtn.disabled = false;
    authSubmitBtn.disabled = false;
  }
}

function displayReviewData(data) {
  const reviewDetailsContainer = document.querySelector('.prod-details');
  reviewDetailsContainer.innerHTML = '';
  reviewDetailsContainer.innerHTML = `
    <div class="item-details">
      ${Object.entries(data.productDetails.details).map(([key,value]) => `
        <div class="detail-row">
          <div class="item-label">${key}</div>
          <div class="item-value">${value}</div>
        </div>
        `
        ).join('')}
    </div>
  `
  reviewTier.innerHTML = createReviewTierHTML(data.tierSelection);

  
}

function formLocator(category) {
  if (!dynamicFormContainer) {
    return Promise.resolve();
  }

  dynamicFormContainer.innerHTML = `<p>Loading...</p>`;

  const form = forms[category];

  if (!form) {
    dynamicFormContainer.innerHTML = '';
    return Promise.resolve();
  }

  return fetch(form)
    .then(res => {
      if (!res.ok) {
        return null;
      }
      return res.text();
    })
    .then(html => dynamicFormContainer.innerHTML = html)
    .catch(err => {
      dynamicFormContainer.innerHTML = "Internal Error";
      console.error("Error", err);
    });
}

function createReviewTierHTML(tierData) {
  return `
  <div class="review-header">
    <h3>Authentication Tier</h3>
    <div class="review-edit">
      <i class="fa-solid fa-pen"></i>
      <p>Edit</p>
    </div>
  </div>
  <div class="tier-summary">
    <div class="review-tier-selected">
      <div class="review-tier-icon">
        ${tierData.icon}
      </div>
      <div class="tier-type">
        <h4>${tierData.type}</h4>
        <p>${tierData.duration}</p>
      </div>
    </div>
    
    <div class="tier-cost">
      <span>$${tierData.cost.toFixed(2)}</span>
    </div>
  </div>         
`;
}

function gatherTierInformation() {
  // gather info
  const selectedTier = document.querySelector('.tier-container.selected');
  const tierType = selectedTier.querySelector('[data-tier-type]');
  const tierDuration = selectedTier.querySelector('[data-tier-duration]');
  const tierCost = selectedTier.querySelector('[data-tier-cost]');
  const tierIcon = selectedTier.querySelector('[data-tier-icon]');
  
  // store info
  formData.tierSelection = {
    type: tierType ? tierType.textContent.trim() : 'N/A',
    duration: tierDuration ? tierDuration.textContent.trim() : 'N/A',
    cost: tierCost ? parseFloat(tierCost.textContent.replace(/[^0-9.]/g, '')) || 0 : 0,
    icon: tierIcon ? tierIcon.innerHTML.trim() : "N/A"
  };

  return formData.tierSelection;
  
}

function showNotification(message, type) {
  const div = document.createElement('div');
  div.className = `notification notification--${type}`;
  div.textContent = message;

  document.body.appendChild(div);

  setTimeout(() => div.classList.add('show'), 10)
  setTimeout(() => div.classList.remove('show'), 3000)
}

async function uploadImagesToFirebase(images, userId, requestId) {
  const uploadPromises = images.map(async (img, index) => {
    try {
      const imagePath = `authenticationRequests/${userId}/${requestId}/image_${index}_${Date.now()}.jpg`;
      const storageRef = ref(storage, imagePath);

      const uploadResult = await uploadString(storageRef, img.url, 'data_url');

      const downloadURL = await getDownloadURL(uploadResult.ref);

      console.log(`✅ Image ${index} uploaded:`, downloadURL);

      return {
        url: downloadURL,
        path: imagePath,
        isPrimary: img.isPrimary,
        index: img.index
      };

    }
    catch (error) {
      console.error(`❌ Failed to upload image ${index}:`, error)
      throw error;
    }
  });

  const uploadedImages = await Promise.all(uploadPromises);
  return uploadedImages;
  
}

async function deleteFirebaseRequest(requestId) {
  // get request ref
  try {
    const docRef = doc(db, "authenticationRequests", requestId);

    await deleteDoc(docRef);
    
    console.log("✅ Document successfully deleted!");
    return true;
    
  } catch (error) {
    console.error("❌ Error removing document: ", error);
    throw error;
  }
}

async function submitToFirebase() {
  try {
    const user = currentUser;

    if (!user) {
      console.log("❌ User must be login");
      window.location.href = "/login";
      return { success: false, ref: null, errorMsg: "You must be logged in to submit an authentication request." };
    }

    const tempRequestId = `temp+${Date.now()}`;

    console.log("📤 Uploading images to Storage...");
    const uploadedImages = await uploadImagesToFirebase(formData.images, user.userId, tempRequestId);
    console.log("✅ All images uploaded!")

    const authRequestData = {
      images: uploadedImages,
      price: formData.tierSelection.cost,

      productDetails: {
        category: formData.productDetails.productCategory,
        details: formData.productDetails.details
      },

      tierSelection: {
        type: formData.tierSelection.type,
        duration: formData.tierSelection.duration,
        cost: formData.tierSelection.cost
      },

      // Transitional status -- the AI matching step (not yet built) is
      // responsible for advancing this to "pending_review" (confident
      // match found) or "needs_manual_review" (no match cleared the
      // threshold), per the planning doc's status table. "submitted" is
      // the honest interim state between form submission and that
      // pipeline actually running.
      // Full enum: submitted | pending_review | needs_manual_review |
      // needs_info | approved | rejected
      status: "submitted",
      userId: user.userId,

      createdAt: serverTimestamp(),
      updateAt: serverTimestamp()
    }

    console.log("auth Data:",authRequestData);

    const docRef = await addDoc(collection(db, "authenticationRequests"),
      authRequestData
    );

    console.log("✅ Document created with id: ", docRef.id);

    return { success: true, requestId: docRef.id, images: uploadedImages }
    
  } 
  catch (error) {

    console.log("❌ Error storing auth Request", error);

    return { success: false, ref: null, errorMsg: error.message }

  }
}

await restoreDraftState();
showStep(currentStep);
updateProgressBar(currentStep);

window.addEventListener('beforeunload', saveDraftState);

nextBtn.forEach((btn) => {
  btn.addEventListener("click", () => {
    if(!validateStep(currentStep)) {
      return;
    }
    nextStep();

  });
});

backBtn.forEach((btn) => {
  btn.addEventListener("click", prevStep);
});