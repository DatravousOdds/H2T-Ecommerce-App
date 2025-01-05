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
