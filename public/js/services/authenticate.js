// Image upload functionality
const imageInputs = document.querySelectorAll(".file-input");
const imageItems = document.querySelectorAll(".image-item");

// console.log(imageInputs);
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
        uploadText.style.display = "none";

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
    uploadText.style.display = "block";

    // Hide remove button
    removeImageBtn.style.display = "none";
  });
});

// Keep track of current step
let currentStep = 1;
const nextBtn = document.querySelectorAll(".next-btn");
const backBtn = document.querySelectorAll(".back-btn");
const formSteps = document.querySelectorAll(".form-step");

function prevStep() {
  if (currentStep > 1) {
    currentStep--;
    showStep(currentStep);
  }
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

function updateProgressSteps(currentStep) {
  const steps = document.querySelectorAll(".progress-steps .step");
  console.log("Steps", steps);

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

// Validate current step
function validateStep(stepNumber) {
  if (stepNumber === 1) {
    // Validate image uploads
    const uploadedImages = document.querySelectorAll(".image-preview[src]");
    console.log("Images Uploaded:", uploadedImages);
    if (uploadedImages.length < 5) {
      alert("Please upload all required images"); // turn into alert ui component later
      return false;
    }
  } else if (stepNumber === 2) {
    // Validate product details
    const requiredFields = [
      "productSku",
      "brand",
      "model",
      "size",
      "condition"
    ];
    for (const fieldId of requiredFields) {
      const field = document.getElementById(fieldId);
      if (!field.value) {
        alert(
          `Please fill in ${fieldId.replace(/([A-Z])/g, " $1").toLowerCase()}`
        );
        field.focus();
        return false;
      }
    }
  }
  return true;
}

// Handle next button click
function nextStep() {
  currentStep++; // Added increment
  showStep(currentStep);
}

// Show initial step
showStep(1);

// Add event listener to navigation buttons
nextBtn.forEach((btn) => {
  btn.addEventListener("click", nextStep);
});

backBtn.forEach((btn) => {
  btn.addEventListener("click", prevStep);
});

// Validate Form
