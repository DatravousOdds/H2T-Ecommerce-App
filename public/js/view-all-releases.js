// Pagination functionality
const paginationList = document.querySelector(".pagination-list");
const paginationButtons = paginationList?.querySelectorAll(".pagination-btn");

if (paginationButtons) {
  paginationButtons.forEach((button) => {
    button.addEventListener("click", () => {
      paginationButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
    });
  });
}

// Filter functionality
const filterSections = document.querySelectorAll(".filter-section");
const filterHeaders = document.querySelectorAll(".filter-header");

filterHeaders.forEach((header) => {
  header.addEventListener("click", () => {
    const section = header.closest(".filter-section");
    const sectionIcon = header.querySelector("i");
    section.classList.toggle("expanded");
    sectionIcon.classList.toggle("rotate");

    // Optional: collapse other sections when one is expanded
    filterSections.forEach((otherSection) => {
      if (otherSection !== section) {
        otherSection.classList.remove("expanded");
        // Also remove rotate class from other section icons
        otherSection.querySelector("i")?.classList.remove("rotate");
      }
    });
  });
});

// Clear filters functionality
const clearFilterBtn = document.querySelector(".clear-filters");
// console.log(clearFilterBtn);
const inputElements = document.querySelectorAll(".filter-options input");
// console.log("Input Elements:", inputElements);

if (clearFilterBtn && inputElements.length > 0) {
  clearFilterBtn.addEventListener("click", () => {
    // console.log("Clear filter has been clicked!");
    inputElements.forEach((input) => {
      input.checked = false;
      // Dispatch change event to trigger any  listeners
      input.dispatchEvent(new Event("change"));
    });
  });
}

// Wishlist functionality
document.querySelectorAll(".wishlist-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    btn.classList.toggle("active");

    const icon = btn.querySelector("i");
    icon.classList.toggle("bi-heart-fill");
    icon.classList.toggle("bi-heart");
  });
});

// Notify Me functionality
const notifiedBtn = document.querySelectorAll(".notify-btn");
const notifiedModal = document.querySelector(".notified-availablity-wrapper");
const notifiedCloseBtn = document.querySelector(".close-button");
console.log(notifiedModal);

let activeNotifyButton = null;

notifiedBtn.forEach((btn) => {
  btn.addEventListener("click", () => {
    console.log("Notify Me button was clicked!");
    activeNotifyButton = btn;
    // Display Modal
    notifiedModal.classList.add("active");
    document.body.style.overflow = "hidden";
  });
});

notifiedCloseBtn.addEventListener("click", () => {
  notifiedModal.classList.remove("active");
  document.body.style.overflow = "auto";
  activeNotifyButton = null; // Clear the active button
});

// Size Item Selected code
const sizeItem = document.querySelectorAll(".size-item");
console.log(sizeItem);

sizeItem.forEach((size) => {
  size.addEventListener("click", () => {
    sizeItem.forEach((btn) => {
      btn.classList.remove("selected");
    });
    // console.log("Size button was clicked");
    size.classList.add("selected");
  });
});

// Toast Component
const notificationModal = document.querySelector(".toast-component");
const closeButton = notificationModal.querySelector(".notification-close-btn");
const notifyButtons = document.querySelectorAll(".notify-me");
console.log(notifyButtons);

function showNotification() {
  // Make the notification visible
  notificationModal.style.display = "flex";

  // Automatically hide after 5 seconds
  setTimeout(() => {
    hideNotification();
  }, 5000);
}

function hideNotification() {
  notificationModal.classList.remove("show-notification");
  // Wait for animation to finish before hiding completely
  setTimeout(() => {
    notificationModal.style.display = "none";
  }, 300);
}

function handleNotifySuccess(button) {
  if (!button) return;

  // Add success class to trigger animation
  button.classList.add("notify-success");
  button.setAttribute("disabled", true);

  // Update button text and icon
  const checkIcon = button.querySelector(".check-icon");
  const bellIcon = button.querySelector(".bell-icon");

  if (checkIcon) checkIcon.style.display = "contents";
  if (bellIcon) bellIcon.style.display = "none";
}

// Add click handlers to all Notify Me buttons
notifyButtons.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();

    // Check if a size is selected
    const selectedSize = document.querySelector(".size-item.selected");
    console.log(selectedSize);

    if (!selectedSize) {
      alert("Please select a size first");
      return;
    }

    notifiedModal.classList.remove("active");
    document.body.style.overflow = "auto";

    // If we have a size, show the notification
    showNotification();
    handleNotifySuccess(activeNotifyButton);
  });
});

if (closeButton) {
  closeButton.addEventListener("click", hideNotification);
}
