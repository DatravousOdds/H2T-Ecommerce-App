// Seller Dashboard sub-tab navigation (Overview / Products / Orders / Analytics)
const sellingNavButtons = document.querySelectorAll(".nav-button");
// Scoped to `section.content-section` only -- the Products tab's own sub-views
// (all/active/out-of-stock/draft) reuse the ".content-section" class on <div>s
// nested inside #products. A bare ".content-section" selector here would also
// match those nested divs, so switching dashboard tabs would strip their
// "active" state and leave the Products tab showing no sub-view at all.
const sellingSections = document.querySelectorAll("section.content-section");

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

// Filter Menu (the All/Active/Out of Stock/Draft tabs inside the Products tab).
// Scoped to "#filter-menu .filter-btn" rather than "#products .filter-btn" --
// the "Filter" dropdown toggle button also carries the ".filter-btn" class but
// lives outside #filter-menu, so the broader selector used to catch it too.
// Since that toggle has no data-section, clicking it wiped every sub-view's
// "active" state and showed nothing.
const filterButtons = document.querySelectorAll("#filter-menu .filter-btn");
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