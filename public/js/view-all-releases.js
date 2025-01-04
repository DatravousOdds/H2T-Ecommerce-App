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
    sectionIcon.classList.add("rotate");

    // Optional: collapse other sections when one is expanded
    filterSections.forEach((otherSection) => {
      if (otherSection !== section) {
        otherSection.classList.remove("expanded");
      }
    });
  });
});
