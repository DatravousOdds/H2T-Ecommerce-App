const dropdownSection = document.querySelectorAll(".dropdown-section");





/* 
    Selects all elements with class .dropdown-section 
    Loops through each dropdown-section to apply logic 
*/
dropdownSection.forEach((section) => {
  const dropdownIcon = section.querySelector(".dropdown-icon i");
  const menu = section.querySelector(".dropdown-menu");
  const toggle = section.querySelector(".dropdown-header");

  toggle.addEventListener("click", () => {
    // Hide all other dropdown menus
    document.querySelectorAll(".dropdown-menu").forEach((otherMenu) => {
      if (otherMenu !== menu) {
        otherMenu.classList.remove("active");
        otherMenu.previousElementSibling.querySelector(
          ".dropdown-icon i"
        ).style.transform = "rotate(0deg)";
      }
    });

    // Toggle the clicked dropdown menu
    menu.classList.toggle("active");

    // Toggle rotation
    if (menu.classList.contains("active")) {
      dropdownIcon.style.transform = "rotate(180deg)";
    } else {
      dropdownIcon.style.transform = "rotate(0deg)";
    }
  });
});

/* 
  TODO: Create a function that has the dropdown functionality
*/




const smallDropdownSection = document.querySelectorAll(".dropdown-section-sm");
const spanElement = document.getElementById('filter-icon');
const hasFilterIcon = spanElement.querySelector('i.fa-filter') !== null;
// testing
smallDropdownSection.forEach((smallMenu) => {
  const yearHeader = smallMenu.querySelector(".dropdown-header")
  const yearIcon = smallMenu.querySelector(".dropdown-icon i")
  const yearMenu = smallMenu.querySelector(".year-dropdown")

  yearHeader.addEventListener("click", () => {
  // Toggle the click dropdown menu
  yearMenu.classList.toggle("open");

  // Toggle rotation
  if (yearMenu.classList.contains("open")) {
    yearIcon.style.transform = "rotate(180deg)";
  } else {
    yearIcon.style.transform = "rotate(0deg)";
  }
});

})


