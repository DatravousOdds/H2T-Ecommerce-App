



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
    console.log(slotIndex)

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

const forms = {
  "Accessories": "/authenticator/templates/accessories-form.html",
  "Apparel": "/authenticator/templates/apparel-form.html",
  "Shoes": "/authenticator/templates/shoes-form.html",
  "Sneakers": "/authenticator/templates/sneakers-form.html",
  "Trading Cards": "/authenticator/templates/trading-card-form.html"
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
    progressPercentage = '65%'
  } else {
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

function vaildateForm(form) {
 
    const vaildationRules = {

      'Trading Cards': 
      [
        {id: 'card-brand', name: 'Brand', required: true },
        {id: 'card-name', name: 'Card Name', required: true },
        {id: 'card-set', name: 'Set', required: true },
        {id: 'card-year', name: 'Year', required: true, type: 'number' },
        {id: 'card-condition', name: 'Condition', required: true },
      ],
      'Apparel': 
      [
        {id: 'apparel-brand', name: 'Brand', required: true, type: 'text'},
        {id: 'apparel-type', name: 'Item Type', required: true },
        {id: 'apparel-size', name: 'Size', required: true },
        {id: 'apparel-condition', name: 'Condition', required: true },
        {id: 'apparel-color', name: 'Color', required: true, type: 'text'},
      ],
      'Sneakers': 
      [
        {id: 'sneaker-brand', name: 'Brand', required: true, type: 'text'},
        {id: 'sneaker-model', name: 'Model', required: true, type: 'text'},
        {id: 'sneaker-size', name: 'Size', required: true },
        {id: 'sneaker-condition', name: 'Condition', required: true },
      ],
      'Shoes':
      [
        {id: 'shoes-brand', name: 'Brand', required: true, type: 'text'},
        {id: 'shoes-model', name: 'Model', required: true, type: 'text'},
        {id: 'shoes-type', name: 'Shoe Type', required: true },
        {id: 'shoes-color', name: 'Color', required: true, type: 'text' },
        {id: 'shoes-condition', name: 'Condition', required: true },
      ],
      'Accessories': 
      [
        {id: 'accessories-type', name: 'Accessory Type', required: true },
        {id: 'accessories-brand', name: 'Brand', required: true, type: 'text'},
        {id: 'accessories-condition', name: 'Condition', required: true },
      ]
    }

    const rules = vaildationRules[form];

    const errors = [];

    rules.forEach(rule => {

      const element = document.getElementById(rule.id);

      if (!element) {
        console.log('No element found!');
      }

      const value = element.value;

      if(!value && rule.required) {
        errors.push(`${rule.name} is required`);
        return;
      }

      if (rule.type === 'number' && value && isNaN(value)) {
        errors.push(`${rule.name} is must a number`);
        return;
      }

    })

    console.log(errors)
    

  
}

function validateStep(stepNumber) {
  
  if (stepNumber === 1) {
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
      alert(`Please upload ${REQUIRED_IMAGES} images, currently uploaded ${uploadedImages}`);
      return false;
    }

    return true;
    
  } else if (stepNumber === 2) {

    vaildateForm(categorySelected);

    return;
  }
  return true;
}



// Takes in category and display that form
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

// Add event listener to navigation buttons
nextBtn.forEach((btn) => {
  btn.addEventListener("click", () => {
    console.log("current step:", currentStep);
    if (validateStep(currentStep)) {
      nextStep();
    }
    return;
  });
});

backBtn.forEach((btn) => {
  btn.addEventListener("click", prevStep);
});


