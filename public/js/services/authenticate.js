

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


categories.addEventListener('change', (e) => {
  const target = e.target.value;
  // get form
  formLocator(target);


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


function validateStep(stepNumber) {
  if (stepNumber === 1) {
    // Validate image uploads
    const uploadedImages = document.querySelectorAll(".image-preview[src]");
    // console.log("Images Uploaded:", uploadedImages);
    if (uploadedImages.length < 5) {
      alert("Please upload all required images"); // turn into alert ui component later
      return false;
    }
  } else if (stepNumber === 2) {
    // check type of form

    // vaildate form

    
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
  btn.addEventListener("click", nextStep);
});

backBtn.forEach((btn) => {
  btn.addEventListener("click", prevStep);
});


