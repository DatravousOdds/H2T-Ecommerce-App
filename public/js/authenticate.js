// Image upload functionality
const imageInputs = document.querySelectorAll(".file-input");
const imageItems = document.querySelectorAll(".image-item");

// console.log(imageInputs);
imageInputs.forEach((input) => {
  const imageItem = input.closest(".image-item");
  const removeImageBtn = imageItem.querySelector(".remove-image-btn");
  const previewContainer = imageItem.querySelector(".preview-container");

  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    // console.log(file);
    if (file) {
      if (file) {
        // Validate file type
        if (file.size > 5 * 1024 * 1024) {
          alert("File too large");
          this.value = "";
          return;
        }

        if (!file.type.match("image/*")) {
          alert("Invalid file type");
          this.value = "";
          return;
        }

        // Show preview image
        const reader = new FileReader();
        reader.onload = function (event) {
          imagePreview.src = event.target.result;

          imagePreview.style.display = "block";
          uploadIcon.style.display = "none";
          uploadText.style.display = "none";
          removeImageBtn.style.display = "flex";
        };
        reader.readAsDataURL(file);
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        // Find the parent image-item and update its background
        previewContainer.style.display = "none";
        imageItem.style.background = `url(${e.target.result})`;
        removeImageBtn.style.display = "flex"; // Show the removal button
      };
      reader.readAsDataURL(file);
    }

    // Remove background Image
    removeImageBtn.addEventListener("click", () => {
      removeImageBtn.style.display = "none";
      previewContainer.style.display = "flex";
      imageItem.style.background = "none"; // Clear the background image
      input.value = ""; // Clear the file input
    });
  });
});

// Step Navigation Functionality
function nextStep() {
  currentStep++;
  showStep(currentStep);
}

function showStep(stepNumber) {
  // hide all steps
  formSteps.forEach((step) => {
    step.style.display = "none";
  });

  // gets the id of the of the step number and shows that step
  document.getElementById(`"step${stepNumber}"`).style.display = "block";
}
// Keep track of current step
let currentStep = 1;
const nextBtn = document.querySelector(".next-btn");
const backBtn = document.querySelectorAll(".back-btn");
const formSteps = document.querySelectorAll(".form-step");
console.log(formSteps);
console.log(backBtn);
console.log(nextBtn);

nextBtn.addEventListener("click", () => {
  nextStep();
});
