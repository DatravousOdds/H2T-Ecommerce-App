const sellingTabs = document.querySelectorAll(".selling-tabs .selling-tab");

// Dashboard navigation
sellingTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    // Remove active class from all other tab
    sellingTabs.forEach((tab) => tab.classList.remove("active"));

    tab.classList.add("active");
  });
});
