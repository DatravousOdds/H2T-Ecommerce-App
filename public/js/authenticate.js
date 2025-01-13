// Image upload functionality
const imageInputs = document.querySelectorAll(".file-input");
const imageItems = document.querySelectorAll(".image-item");
// console.log(imageInputs);
imageInputs.forEach((input) => {
  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    // console.log(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        // Find the parent image-item and update its background
        const imageItem = input.closest(".image-item");
        imageItem.style.background = `url(${e.target.result})`;
      };
      reader.readAsDataURL(file);
    }
  });
});

imageItems.forEach((item) => {
  item.addEventListener("click", () => {
    // Trigger the file input when clicking the image
    const fileInput = item.querySelector(".file-input");
    fileInput.click();
  });
});

// Step Navigation Functionality
