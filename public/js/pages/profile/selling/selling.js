// Seller Dashboard sub-tab navigation (Overview / Products / Orders / Analytics)
const sellingNavButtons = document.querySelectorAll(".nav-button");
const sellingSections = document.querySelectorAll(".content-section");

sellingNavButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // Remove active class from all other tabs
    sellingNavButtons.forEach((btn) => btn.classList.remove("active"));
    sellingSections.forEach((section) => section.classList.remove("active"));

    // Add active class to the clicked tab and its matching section
    const tabId = button.getAttribute("data-tab");
    const tabToShow = document.getElementById(tabId);
    if (tabToShow) {
      tabToShow.classList.add("active");
    }

    button.classList.add("active");
  });
});

// Filter Menu (scoped to the Products tab only, since these classes/ids
// are specific to its own filter bar -- not the dashboard-level nav above)
const filterButtons = document.querySelectorAll("#products .filter-btn");
const filterSections = document.querySelectorAll(
  ".products-content .content-section"
);

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    // Remove active class from all other filter items
    filterButtons.forEach((b) => b.classList.remove("active"));
    filterSections.forEach((section) => section.classList.remove("active"));

    // Add active class to the clicked filter item
    btn.classList.add("active");
    const sectionId = btn.getAttribute("data-section");
    if (sectionId) {
      const sectionToShow = document.getElementById(sectionId);
      if (sectionToShow) {
        sectionToShow.classList.add("active");
      }
    }
  });
});

// List Product button
// Defensive null-check: without this, a missing element here would throw
// and silently prevent every listener below it in this file from ever
// being attached -- including all four dashboard nav buttons above.
const listProductBtn = document.querySelector(".list-products");
if (listProductBtn) {
  listProductBtn.addEventListener("click", () => {
    window.location.href = "/list-product";
  });
}

// Trade Request and Sell to Us buttons are intentionally not wired here --
// both features are hidden for MVP (see profile.html), so there's nothing
// for these handlers to attach to right now.