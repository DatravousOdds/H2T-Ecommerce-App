/* * 09/22/2024 Travis Odds  Adding action to forms, no connect db yet. * */
/* * 09/23/2024 Travis Odds  Rewrote form logic w bio actions. * */

const dropdownSection = document.querySelectorAll(".dropdown-section");
const smallDropdownSection = document.querySelectorAll(".dropdown-section-sm");
const spanElement = document.getElementById("filter-icon");
const profileSection = document.querySelectorAll(".profile-section");
const hasFilterIcon = spanElement.querySelector("i.fa-filter") !== null;
const userProfileCard = profileSection[0];
const bio = userProfileCard.querySelector("#bio");
console.log(bio);

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

// Performs small menu action for profile -- payment information --
smallDropdownSection.forEach((smallMenu) => {
  const yearHeader = smallMenu.querySelector(".dropdown-header");
  const yearIcon = smallMenu.querySelector(".dropdown-icon i");
  const yearMenu = smallMenu.querySelector(".year-dropdown");

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
});

// Performs menu actions such as save, cancel or edit for profile -- profile --
profileSection.forEach((section) => {
  const edit = section.querySelectorAll(".edit-info-header");
  const allActionButtons = section.querySelectorAll(".action-buttons");
  const saveBtn = section.querySelectorAll(".save-btn");
  const cancelBtn = section.querySelectorAll(".cancel-btn");
  const inputs = section.querySelectorAll("input");

  // Handle save button click
  saveBtn.forEach((btn) => {
    btn.addEventListener("click", () => {
      // console.log("save button was click");
      inputs.forEach((input) => {
        input.disabled = true;
        input.style.backgroundColor = "transparent";
        input.style.border = "none";
        input.style.boxShadow = "none";
        input.style.padding = "0px 0px";
      });
      allActionButtons.forEach((action) => {
        action.style.display = "none";
      });
    });
  });

  // Handle edit button click
  edit.forEach((btn) => {
    btn.addEventListener("click", () => {
      console.log("edit button was clicked!");

      inputs.forEach((input) => {
        input.disabled = false;

        // input disabled
        input.style.backgroundColor = "#e0e0e0";
        input.style.border = "#b0b0b0";
        input.style.padding = "12px 20px";
      });

      allActionButtons.forEach((action) => {
        action.style.display = "flex";
      });
    });
  });

  // Handle cancel button click
  cancelBtn.forEach((btn) => {
    console.log(btn);
    btn.addEventListener("click", () => {
      console.log("cancel button was clicked!");

      inputs.forEach((input) => {
        input.disabled = true;

        // .input-enabled
        input.style.backgroundColor = "transparent";
        input.style.border = "none";
        input.style.boxShadow = "none";
        input.style.padding = "0px 0px";
      });
      allActionButtons.forEach((action) => {
        action.style.display = "none";
      });
    });
  });

  // Hides the cta buttons by default
  allActionButtons.forEach((action) => {
    action.style.display = "none";
  });
});

const allTabs = document.querySelectorAll(".tab-btn");
allTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const tabId = tab.getAttribute("data-tab");

    // Hide all tab content
    document.querySelectorAll(".tab").forEach((t) => {
      console.log(t);
    });

    // Show the clicked tab content
    document.getElementById(tabId).classList.add("tab-active");
  });
});
