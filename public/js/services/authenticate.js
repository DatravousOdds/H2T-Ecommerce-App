
import { getStorage, ref, uploadString, getDownloadURL, deleteDoc } from '../api/firebase-client.js';
import { collection, addDoc, db, serverTimestamp  } from '../api/firebase-client.js';
import { checkUserStatus } from '../auth/auth.js';
import { handleGuestCart, handleAuthenticatedCart, createAuthCartItem, addToCart, getUserCartCount, updateCartCount } from '../commerce/cart.js';

// const storage = getStorage();

let currentUser = null;
currentUser = await checkUserStatus();


// Image upload functionality
const imageInputs = document.querySelectorAll(".file-input");
const imageItems = document.querySelectorAll(".image-item");
const reviewImages = document.querySelectorAll('.review-image');
// auth form
const authForm = document.getElementById('authentication-form');
const authSubmitBtn = document.getElementById('submitAuthBtn');
// categories selection functionality
const categories = document.getElementById('categories');
const dynamicFormContainer = document.getElementById('dynamic-form-container');
let categorySelected;
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
    // console.log(slotIndex)

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

categories.addEventListener('change', (e) => {
  const target = e.target.value;
  categorySelected = target;
  
  // get form
  formLocator(categorySelected);


})

authForm.addEventListener('submit', handleFormSubmission);

addAnotherItemBtn.addEventListener('click', () => {
  // reset step
  currentStep = 1;
  showStep(currentStep);

  formData = {
    images: [],
    productDetails: {},
    productSku: null,
    tierSelection: null
  };



  cartModal.style.display = "none";

  root.style.setProperty('--progress-percentage', '20%');

});

viewCartBtn.addEventListener('click', () => {
  // go to cart
  window.location.href = '/cart';
})

cartModal.addEventListener((event) => {
  if (event && event !== cartModal) {
    cartModal.style.display = "none";
  }
})

function nextStep() {
  currentStep++; // Added increment
  showStep(currentStep);
  updateProgressBar(currentStep);
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

  // Update progress indicator
  updateProgressSteps(stepNumber);
}

tierContainers.forEach(tier => {
  tier.addEventListener('click', () => {
    tierContainers.forEach(t => {
      t.classList.remove('selected');
    })

    tier.classList.add('selected');
  })
})

const editButtons = {
  images: {
    selector:'.reivew-images .review-edit',
    step: 1
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
    });
    console.log(`${name} edit button found`);
  } else {
    console.error(`${name} edit button not found: ${config.selector}`);
  }
})

function prevStep() {
  if (currentStep > 1) {
    currentStep--;
    showStep(currentStep);
    updateProgressBar(currentStep);
  }
}

function nextStep() {
  currentStep++; // Added increment
  showStep(currentStep);
  updateProgressBar(currentStep);
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

  // Update progress indicator
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
      alert('Please select a tier');
      return false;
    }
    formData.tierSelection = gatherTierInformattion();

    return true;
  }

  if (stepNumber === 2) {

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

  } else if (stepNumber === 3) {
    // console.log("Form Data:", formData)
    if (!categorySelected) {
      alert('Please select a category')
    }

    if (!validateForm(categorySelected)) {
      return false;
    }

    formData.productDetails = collectProductData(categorySelected);
    displayReviewData(formData);
    
    return true;

  } else if (stepNumber === 4) {
    // console.log("Final review step");
    // Check term and conditions are selected
    const termsCheckbox = document.querySelectorAll('.chekbox-group input[type="checkbox"]  ');
    // console.log("termsCheckbox:", termsCheckbox);
    
    
    return true;

  }
  
}

async function handleFormSubmission(e) {
  e.preventDefault();
  
  if(!validateStep(4)) {
    return;
  }

  authSubmitBtn.disabled = true;

  try {
    // Step 1: Upload images to Firebase
    authSubmitBtn.textContent = "Uploading images...";
    const result = await submitToFirebase();

    if (!result.success) {
      throw Error("Failed to upload images");
      
    } else {
      let uploadRequestId = result.requestId;
      console.log("✅ Images uploaded successfully!");


      // Step 2: Add item to cart
      authSubmitBtn.textContent = "Adding to cart...";

      const authRequestData = {
        images: formData.images || null,
        requestId: result.requestId || null,
        productDetails: formData.productDetails || null,
        tierSelection: formData.tierSelection || null,
      }

      const cartResult = await addToCart(currentUser, authRequestData, 'authentication');

      if (!cartResult.success) {
        // Clean up Firebase request if cart fails
        await deleteFirebaseRequest(currentUser.email, uploadRequestId);
        throw new Error("Failed to add item to cart");
      } else {

        console.log("✅ Added item to cart!");
        // Step 3: Update UI on sucess
        authSubmitBtn.textContent = "Success!";

        // get current user cart count
        const cartCount = await getUserCartCount(currentUser);
        updateCartCount(cartCount);

        cartModal.style.display = "flex";
        cartItemCount.textContent = cartCount;

        showNotification("Item successfully added!", "success")
        
        
      }
    }
  }
  catch (error) {
    console.error("❌ Submission failed!", error);

    showNotification(error.message || "Something went wrong. Please try again.", "error");
    
    cartModal.style.display = 'none';
  }

  setTimeout(() => {
    authSubmitBtn.innerHTML = `<i class="fa-solid fa-arrow-up-from-bracket"></i> Submit for Authentication`;
    authSubmitBtn.disabled = false;
    }, 
  3000);
}

function displayReviewData(data) {
  // console.log("form data:", data);
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
  if (dynamicFormContainer) {
    dynamicFormContainer.innerHTML = `<p>Loading...</p>`;

    const form = forms[category];

    if (!form) {
      dynamicFormContainer.innerHTML = '';
    }
    
    fetch(form)
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

      }
    )
  }

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
      <span>${tierData.cost}</span>
    </div>
  </div>
              
`;
}

function gatherTierInformattion() {
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
    cost: tierCost ? tierCost.textContent.trim() : 'N/A',
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

async function deleteFirebaseRequest(userId, requestId) {
  // get request ref
  try {
    const docRef = doc(db, "userProfiles", user.email, "cart", requestId);

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
      console.log("❌ User must be login")
      
    }

    const tempRequestId = `temp+${Date.now()}`;

    console.log("📤 Uploading images to Storage...");
    // const uploadedImages = uploadImagesToFirebase(formData.images, user.uid, tempRequestId);
    console.log("✅ All images uploaded!")

    const formatPrice = formData.tierSelection.cost.replace('$', '');
    
    const authRequestData = {
      images: '',
      price: parseInt(formatPrice),

      productDetails: {
        category: formData.productDetails.productCategory,
        details: formData.productDetails.details
      },

      tierSelection: {
        type: formData.tierSelection.type,
        duration: formData.tierSelection.duration,
        cost: formData.tierSelection.cost
      },

      status: "pending",
      userId: user.uid,

      createdAt: serverTimestamp(),
      updateAt: serverTimestamp()
    }

    console.log("auth Data:",authRequestData);

    const docRef = await addDoc(collection(db, "authenticationRequests"),
      authRequestData
    );

    console.log("✅ Document created with id: ", docRef.id);

    return { success: true, requestId: docRef.id }
    
  } 
  catch (error) {

    console.log("❌ Error storing auth Request", error);

    return { success: false, ref: null, errorMsg: error.messag }

  }
}
// Show initial step
showStep(currentStep);

// Add event listener to navigation buttons
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


