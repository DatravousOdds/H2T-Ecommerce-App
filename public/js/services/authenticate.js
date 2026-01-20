

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


// Image upload functionality
const imageInputs = document.querySelectorAll(".file-input");
const imageItems = document.querySelectorAll(".image-item");
const reviewImages = document.querySelectorAll('.review-image');


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

const categories = document.getElementById('categories');
const dynamicFormContainer = document.getElementById('dynamic-form-container');
let categorySelected;

categories.addEventListener('change', (e) => {
  const target = e.target.value;
  categorySelected = target;
  
  // get form
  formLocator(categorySelected);


})



const tierModal = document.getElementById('tierModal');
const tierContainers = document.querySelectorAll('.tier-container');
const tierConfirmBtn = document.getElementById('confirmTierSelection');
const tierCancelBtn =  document.getElementById('cancelTierSelection');

// add event listeners
tierContainers.forEach(tier => {
  tier.addEventListener('click', () => {
    tierContainers.forEach(t => {
      t.classList.remove('selected');
    })

    tier.classList.add('selected');
  })
})

tierConfirmBtn.addEventListener('click', () => {
  gatherTierInformattion();
})

tierCancelBtn.addEventListener('click', () => {
  if (tierModal)
    tierModal.style.display = 'none';
})

function gatherTierInformattion() {
  const selectedTier = document.querySelector('.tier-container.selected');
  if (!selectedTier) {
    alert('Please select a tier');
    return;
  }

  const tierType = selectedTier.querySelector('[data-tier-type]');
  const tierDuration = selectedTier.querySelector('[data-tier-duration]');
  const tierCost = selectedTier.querySelector('[data-tier-cost]');

  formData.tierSelection = {
    type: tierType ? tierType.textContent.trim() : 'N/A',
    duration: tierDuration ? tierDuration.textContent.trim() : 'N/A',
    cost: tierCost ? tierCost.textContent.trim() : 'N/A'
  };

  if (tierModal){
    tierModal.style.display = 'none';
  }

  return formData.tierSelection;
  
}



const authForm = document.getElementById('authentication-form');
const authSubmitBtn = document.getElementById('submitAuthBtn');


authForm.addEventListener('submit', handleFormSubmission)


let formData = {
  images: [],
  productDetails: {},
  tierSelection: ''

}

// Keep track of current step
let currentStep = 1;
const nextBtn = document.querySelectorAll(".next-btn");
const backBtn = document.querySelectorAll(".back-btn");
const formSteps = document.querySelectorAll(".form-step");

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
    proudctCategory: category,
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
    console.log("Form Data:", formData)
    if (!categorySelected) {
      alert('Please select a category')
    }

    if (!validateForm(categorySelected)) {
      return false;
    }

    formData.productDetails = collectProductData(categorySelected);
    displayReviewData(formData);
    return true;

  } else if (stepNumber === 3) {
    console.log('vaildating data...')
    
    
    return true;

  }
  
}

function handleFormSubmission(e) {
  e.preventDefault();
  console.log("Form submitted");
  console.log("form data: ", formData);

  if(!validateStep(3)) {
    return;
  }

  authSubmitBtn.textContent = "Submitting ...";

  tierModal.style.display = 'flex';



}

function displayReviewData(data) {
  console.log("form data:", formData);
  const reviewDetailsContainer = document.querySelector('.prod-details');
  reviewDetailsContainer.innerHTML = '';
  reviewDetailsContainer.innerHTML = `
    <dl class="review-details">
      ${Object.entries(data.productDetails.details).map(([key, value]) => `
          <dt>${key}:</dt>
          <dd>${value}</dd>
        `).join('')}
    </dl>
  `
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

// Show initial step
showStep(currentStep);

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
  console.log(config);
  console.log(name);
  const button = document.querySelector(config.selector);

  if (button) {
    button.addEventListener('click', () => {
      currentStep =config.step;
      showStep(currentStep);
    });
    console.log(`${name} edit button found`);
  } else {
    console.error(`${name} edit button not found: ${config.selector}`);
  }
})



// Add event listener to navigation buttons
nextBtn.forEach((btn) => {
  btn.addEventListener("click", () => {
    // if(!validateStep(currentStep)) {
    //   return;
    // }
    nextStep();

  });
});

backBtn.forEach((btn) => {
  btn.addEventListener("click", prevStep);
});


