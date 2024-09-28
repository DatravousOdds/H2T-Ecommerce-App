// Payment Information Section
const dropdownSection = document.querySelectorAll(".dropdown-section");
const smallDropdownSection = document.querySelectorAll(".dropdown-section-sm");
const spanElement = document.getElementById("filter-icon");
const profileSection = document.querySelectorAll(".profile-section");
const hasFilterIcon =
  spanElement && spanElement.querySelector("i.fa-filter") !== null;

// Bio Section
const userProfileCard = profileSection[0];
const bioSection = userProfileCard.querySelector("#bio");
const bioTextarea = document.getElementById("bio-value");
const updateBioBtn = document.getElementById("update-bio-btn"); // Edit profile Button
const saveBioBtn = document.getElementById("save-bio-btn"); // save changes Button
const allTabs = document.querySelectorAll(".tab-btn");
const pfpActions = document.getElementById("pfp-actions");
const fileInput = document.getElementById("file-input");
const uploadBtn = document.getElementById("upload-btn");
const profilePicture = document.getElementById("profile-picture");
const removeBtn = document.getElementById("remove-btn");
const websiteLinks =  document.getElementById("website-link-box");
const url = document.getElementById("website");
const username = document.getElementById("username");
bioTextarea.style.display = "none";
let currentBio = bioTextarea.value || "";
let currentUrl = url.value || "";





// Testing
// console.log("File Input:", fileInput);
// console.log("Upload Button:", uploadBtn);
// console.log("Profile Picture: ", profilePicture);
// console.log("Remove Button:", removeBtn);
// console.log("Website Links:", websiteLinks);
console.log(username.textContent);


// UserCard action: click
uploadBtn.addEventListener("click", () => {
  console.log("Upload button was clicked!");
  if (fileInput) {
    fileInput.click();
  }
});

// UserCard action: upload img
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0]; // Grabs the first img from the list
  console.log(file);
  const reader = new FileReader(); // creates a new FileReader
  reader.onload = function (event) {
    profilePicture.src = event.target.result; // sets the profile picture
  };

  reader.readAsDataURL(file); // Read the files as a Data URL
});

// UserCard actions: edit
updateBioBtn.addEventListener("click", () => {
  console.log("update bio button was clicked!");
  bioTextarea.disabled = false;
  saveBioBtn.style.display = "inline"; // show the save button
  updateBioBtn.style.display = "none"; // removes edit button
  bioTextarea.style.display = "inline"; // shows the textarea
  pfpActions.style.display = "flex";
  websiteLinks.style.display = "inline";
});

// UserProfile actions: remove img
removeBtn.addEventListener("click", () => {
  console.log("the removed button was clicked!")
  profilePicture.src = "/images/1.png";
});

// UserProfile actions: save
saveBioBtn.addEventListener("click", () => {

  console.log("The save button was clicked!");

  // Disable the bioTextArea
  bioTextarea.disabled = true;

  // Hide save button, show edit button
  saveBioBtn.style.display = "none";
  updateBioBtn.style.display = "inline";

  // Hide profile actions
  pfpActions.style.display = "none";

  // Get the trimmed values
  currentBio = bioTextarea.value.trim();
  currentUrl = url.value.trim();

  // Logic to hide or show elements based on content
  if (currentBio === "") {

    // Hide bio, and website element
    bioTextarea.style.display = "none";
    

  } else {
    // Show bio and website if they are filled
    bioTextarea.style.display = "block";
   
  }

  if (currentUrl === "") {

    // Hide bio, and website element
    websiteLinks.style.display = "none";
    

  } else {
    // Show bio and website if they are filled
    websiteLinks.style.display = "block";
   
  }



  

  // Logging for testing
  console.log("The url is:", currentUrl)
  console.log("The current bio is:", currentBio);

  /* TODO: Save user data to firebase  */


});

/* 
    Selects all elements with class .dropdown-section 
    Loops through each dropdown-section to apply logic 
*/

// Payment Information actions: dropdown menu
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

// Payment Information actions: small dropdown menu
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

// Profile actions: edit, save, cancel
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

// Profile Page actions: navigate
allTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const tabId = tab.getAttribute("data-tab");
    tab.classList.add("active");

    // Remove active from all other tabs
    allTabs.forEach((btn) => {
      btn.classList.remove("active");
    });

    // Hide all tab content
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.remove("active");
    });

    // Show the clicked tab content
    document.getElementById(tabId).classList.add("active");

    // Add active class to the current tab
    tab.classList.add("active");
  });
});
