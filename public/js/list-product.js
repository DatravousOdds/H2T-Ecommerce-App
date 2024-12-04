document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.querySelectorAll(".file-input");
  fileInput.forEach((input) => {
    const imageItem = input.closest(".image-item");
    const imagePreview = imageItem.querySelector(".image-preview");
    const removeImageBtn = imageItem.querySelector(".remove-image-btn");
    const uploadIcon = imageItem.querySelector(".upload-icon");
    const uploadText = imageItem.querySelector(".upload-text");

    input.addEventListener("change", (e) => {
      const file = e.target.files[0];

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
    });

    removeImageBtn.addEventListener("click", () => {
      imagePreview.src = "";
      imagePreview.style.display = "none";
      removeImageBtn.style.display = "none";
      uploadIcon.style.display = "flex";
      uploadText.style.display = "flex";
    });
  });

  // Back to product list
  const backToProductListBtn = document.querySelector(
    ".list-product-header .back-btn"
  );
  backToProductListBtn.addEventListener("click", () => {
    window.location.href = "/product-list";
  });
});
