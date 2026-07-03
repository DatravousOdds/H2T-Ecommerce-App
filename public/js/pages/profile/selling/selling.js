// Seller Dashboard sub-tab navigation (Overview / Products / Orders / Analytics)
const sellingNavButtons = document.querySelectorAll(".nav-button");
// Scoped to `section.content-section` only -- the Products tab's own sub-views
// (all/active/out-of-stock/draft) reuse the ".content-section" class on <div>s
// nested inside #products. A bare ".content-section" selector here would also
// match those nested divs, so switching dashboard tabs would strip their
// "active" state and leave the Products tab showing no sub-view at all.
const sellingSections = document.querySelectorAll("section.content-section");

function activateSellingTab(tabId) {
  const button = document.querySelector(`.nav-button[data-tab="${tabId}"]`);
  const section = document.getElementById(tabId);
  if (!button || !section) return;

  sellingNavButtons.forEach((btn) => btn.classList.remove("active"));
  sellingSections.forEach((s) => s.classList.remove("active"));

  section.classList.add("active");
  button.classList.add("active");
}

sellingNavButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activateSellingTab(button.getAttribute("data-tab"));
  });
});

// Deep-link support, e.g. /profile?tab=selling&subtab=authentication from
// confirm.js's "View Status" button -- only acts when the Selling tab is
// actually the one being deep-linked to, so a ?subtab= left over from
// navigating away doesn't hijack an unrelated ?tab= visit.
const sellingParams = new URLSearchParams(window.location.search);
if (sellingParams.get("tab") === "selling") {
  const requestedSubtab = sellingParams.get("subtab");
  if (requestedSubtab) {
    activateSellingTab(requestedSubtab);
  }
}

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