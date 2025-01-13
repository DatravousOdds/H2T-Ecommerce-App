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

// imageItems.forEach((item) => {
//   item.addEventListener("click", () => {
//     // Trigger the file input when clicking the image
//     const fileInput = item.querySelector(".file-input");
//     fileInput.click();
//   });
// });

// Step Navigation Functionality
