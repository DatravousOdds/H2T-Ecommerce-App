const toggle = document.getElementById("dropdown-toggle");
const menu = document.getElementById("dropdown-menu");


function setupDropdown(toggleId, menuId) {
  const toggle = document.getElementById(toggleId);
  const menu = document.getElementById(menuId);
  const dropdownIcon = document.querySelector(
    "#dropdown-toggle .dropdown-icon i"
  );
  // Dropdown for Statement Section
  toggle.addEventListener("click", () => {
    menu.classList.toggle("active");

    // Toggle rotation
    if (menu.classList.contains("active")) {
      dropdownIcon.style.transform = "rotate(0deg)";
    } else {
      dropdownIcon.style.transform = "rotate(180deg)";
    }
  });
}

// Initialize dropdowns
setupDropdown("dropdown-toggle", "dropdown-menu");
