// const toggle = document.getElementById("dropdown-toggle");

const dropdownSection = document.querySelectorAll(".dropdown-section");

/* 
    Selects all elements with class .dropdown-section 
    Loops through each dropdown-section to apply logic 
*/
dropdownSection.forEach((section) => {

  const dropdownIcon = section.querySelector(".dropdown-icon i");
  const menu = section.querySelector(".dropdown-menu");
  const toggle = section.querySelector(".statement-header");
  
  
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

