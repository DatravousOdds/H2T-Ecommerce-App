const sellingNavButtons = document.querySelectorAll(".nav-button");
const sellingSections = document.querySelectorAll(".content-section");
console.log("sellingNavButtons", sellingNavButtons);
console.log("sellingSections", sellingSections);
// Dashboard navigation
sellingNavButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // Remove active class from all other tab
    sellingNavButtons.forEach((button) => button.classList.remove("active"));
    sellingSections.forEach((section) => section.classList.remove("active"));

    // Add show class to the clicked section
    const tabId = button.getAttribute("data-tab");
    const tabToShow = document.getElementById(tabId);
    tabToShow.classList.add("active");

    button.classList.add("active");
  });
});

// Filter Menu

const filterButtons = document.querySelectorAll(".filter-btn");
const filterSections = document.querySelectorAll(
  ".products-content .content-section"
);

console.log("filterSections", filterSections);

console.log("filterButtons", filterButtons);

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    // Remove active class from all other filter items
    filterButtons.forEach((btn) => btn.classList.remove("active"));
    filterSections.forEach((section) => section.classList.remove("active"));

    // Add active class to the clicked filter item
    btn.classList.add("active");
    const sectionId = btn.getAttribute("data-section");
    if (sectionId) {
      const sectionToShow = document.getElementById(sectionId);

      sectionToShow.classList.add("active");
    }
  });
});

// List Product
const listProductBtn = document.querySelector(".list-products");
listProductBtn.addEventListener("click", () => {
  window.location.href = "/list-product";
});

// Trade Request
const tradeRequestBtn = document.querySelector(".trade-request");
tradeRequestBtn.addEventListener("click", () => {
  window.location.href = "/trade-request";
});

// Sell to Us
const sellToUsBtn = document.querySelector(".sell-to-us");
sellToUsBtn.addEventListener("click", () => {
  window.location.href = "/sell-to-us";
});
