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
