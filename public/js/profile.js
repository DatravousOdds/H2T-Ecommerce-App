import { generateCountries } from "./global.js";


// generate countries for select element
document.addEventListener("DOMContentLoaded", () => {
  const apiUrl = "https://restcountries.com/v3.1/all";
  generateCountries(apiUrl, 'country');
})





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
const websiteLinks = document.getElementById("website-link-box");

// Website Links
const url = document.getElementById("website");
const title = document.getElementById("title");
const websiteFeedback = document.getElementById("website-feedback");
const titleFeedback = document.getElementById("title-feedback");
const websiteUrlDisplay = document.getElementById("website-link-display");

// Profile actions: website link validation
url.addEventListener("change", () => {
  

  websiteFeedback.innerHTML = "";
  url.setCustomValidity("");

  if (url.value.trim() === "") {
    websiteFeedback.textContent = "";
    url.setCustomValidity("");
  } else if (!url.checkValidity()) {
    const errorIcon = document.createElement("i");
    errorIcon.classList.add("fa-solid", "fa-circle-exclamation", "error-msg");
    const errorMessage = document.createTextNode(
      "Please enter a valid URL (e.g., https:://example.com). "
    );
    websiteFeedback.appendChild(errorIcon);
    websiteFeedback.appendChild(errorMessage);
    url.setCustomValidity(
      "Please enter a valid URL (e.g., https://example.com). "
    );
  } else {
    websiteFeedback.innerHTML = "";
    url.setCustomValidity("");
  }
});

// Review section
const reviewModal = document.getElementById("reviews-modal");



// see all reviews
const seeAllReviewsBtn = document.getElementById("see-all-reviews");
const closeBtn = document.querySelector(".close");

// Hide bio by default
bioTextarea.style.display = "none";


let currentBio = bioTextarea.value || "";
let currentUrl = url.value || "";
let currentUrlTitle = title.value || "";

// Max word count
const wordCountDisplay = document.getElementById("word-count");
const maxWords = 30;

// Toggle for "edit mode" state
let isEditMode = false;

bioTextarea.addEventListener("input", () => {
  const text = bioTextarea.value;
  

  const words = text.trim().split(/\s+/).filter(Boolean);

  const wordCount = words.length;
  // console.log("The amount word:", wordCount);

  wordCountDisplay.textContent = `${wordCount} / ${maxWords}`;

  // Show error  message if the words are greater than the max words
  if (wordCount > maxWords) {
    wordCountDisplay.style.display = "flex";
    wordCountDisplay.classList.add("error-msg");

    bioTextarea.setCustomValidity("You have exceeded the maximum of words");
    
    saveBioBtn.classList.add("disabled")
    saveBioBtn.disabled = true;

  } else if (wordCount <= 0) {
    wordCountDisplay.style.display = "none";

    // clear any error message
    bioTextarea.setCustomValidity("");

  } else {
    wordCountDisplay.style.display = "flex"
    wordCountDisplay.classList.remove("error-msg");
    
    
    saveBioBtn.disabled = false;

    // clears the error message
    bioTextarea.setCustomValidity("");
  }
});

// Review action: all reviews, close
seeAllReviewsBtn.addEventListener("click", () => {
  reviewModal.style.display = "flex";
  document.body.classList.add("no-scroll");

  
});

closeBtn.addEventListener("click", () => {
  
  reviewModal.style.display = "none";
  document.body.classList.remove("no-scroll");
});

// UserCard action: click
uploadBtn.addEventListener("click", () => {
  
  if (fileInput) {
    fileInput.click();
  }
});

// Image upload validation and preview
const maxFileSize = 2 * 1024 * 1024; // 2 MB in bytes
const feedback = document.getElementById("feedback");

// console.log(feedback);

// UserCard action: upload img
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0]; // Grabs the first img from the list
  

  feedback.textContent = "";

  const reader = new FileReader(); // creates a new FileReader
  reader.onload = function (event) {
    profilePicture.src = event.target.result; // sets the profile picture
  };

// TODO: create function to generate error

  if (file) {
    console.log(file.type);
    // Validate file type
    const validImageTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validImageTypes.includes(file.type)) {
      const err = new Error("File format error!");

      feedback.innerHTML = ""; // Clears out old content

      // append error icon
      const errIcon = document.createElement("i");
      errIcon.classList.add("fa-solid", "fa-circle-exclamation", "error");
      feedback.appendChild(errIcon);

      // add error message after the icon
      const errorMessage = document.createTextNode(`${err.message}`);
      feedback.appendChild(errorMessage);

      // add style to error msg
      feedback.classList.add("error");

      return;
    }

    if (file.size > maxFileSize) {
      const errIcon = document.createElement("i");
      errIcon.classList.add("fa-solid", "fa-circle-exclamation", "error");
      feedback.appendChild(errIcon);

      const err = new Error(`File too big ${maxFileSize.toFixed(2)} MB`);
      const errorMessage = document.createTextNode(`${err.message}`);
      feedback.appendChild(errorMessage);

      feedback.classList.add("error");
      return;
    }

    reader.readAsDataURL(file); // Read the files as a Data URL
  }

  fileInput.value = "";
});

// UserCard actions: edit
updateBioBtn.addEventListener("click", () => {
  
  bioTextarea.disabled = false;
  saveBioBtn.style.display = "inline"; // show the save button
  updateBioBtn.style.display = "none"; // removes edit button
  bioTextarea.style.display = "inline"; // shows the textarea
  pfpActions.style.display = "flex";
  websiteLinks.style.display = "inline";
  wordCountDisplay.style.display = "flex"; // show word counter

  // Set is EditMode to true to enable removing links
  isEditMode = true;

  // Show the close icon when in edit mode
  const closeIcons = document.querySelectorAll(".close-icon");
  closeIcons.forEach((icon) => {
    icon.style.display = "block";
  });
});

// UserProfile actions: remove img
removeBtn.addEventListener("click", () => {
  
  profilePicture.src = "/images/1.png";

  // Reset the file input to allow uploading the same image again
  fileInput.value = "";
});

// UserProfile actions: save
saveBioBtn.addEventListener("click", () => {
  wordCountDisplay.style.display = "none";

  // Disable the bioTextArea
  bioTextarea.disabled = true;

  // Hide save button, show edit button
  saveBioBtn.style.display = "none";
  updateBioBtn.style.display = "inline";

  // Hide profile actions
  isEditMode = false;

  // Hide profile actions
  pfpActions.style.display = "none";

  const closeIcons = document.querySelectorAll(".close-icon");
  closeIcons.forEach((icon) => {
    icon.style.display = "none";
  });

  // Get the trimmed values
  currentBio = bioTextarea.value.trim();
  currentUrl = url.value.trim();
  currentUrlTitle = title.value.trim();

  // Logic to hide or show elements based on content
  if (currentBio === "") {
    // Hide bio, and website element
    bioTextarea.style.display = "none";
  } else {
    // Show bio and website if they are filled
    bioTextarea.style.display = "block";
  }

  if (currentUrl === "" && currentUrlTitle == "") {
    // Hide bio, and website element
    websiteLinks.style.display = "none";
  } else if (currentUrl !== "" && currentUrlTitle === "") {
    // If URL is provided but title is missing, show an
    titleFeedback.innerHTML = "";

    const errorIcon = document.createElement("i");
    errorIcon.classList.add("fa-solid", "fa-circle-exclamation", "error-msg");
    const errorMessage = document.createTextNode("Please enter a title!");

    titleFeedback.appendChild(errorIcon);
    titleFeedback.appendChild(errorMessage);

    return; // Exit early since there's an error
  } else if ((currentUrl === "") & (currentUrlTitle !== "")) {
    websiteFeedback.innerHTML = "";

    const errorIcon = document.createElement("i");
    errorIcon.classList.add("fa-solid", "fa-circle-exclamation", "error-msg");
    const errorMessage = document.createTextNode("Please fill out this field!");

    websiteFeedback.appendChild(errorIcon);
    websiteFeedback.appendChild(errorMessage);

    return; // Exit early since there's an error
  } else {
    websiteFeedback.innerHTML = "";
    titleFeedback.innerHTML = "";
    // Show bio and website if they are filled
    websiteLinks.style.display = "block";

    const div = document.createElement("div");
    div.classList.add("website-link-div");

    const anchor = document.createElement("a");
    anchor.href = currentUrl;
    anchor.target = "_blank"; // create a new tab
    anchor.classList.add("website-link");
    anchor.type = "text";

    const linkIcon = document.createElement("i");

    const domain = new URL(currentUrl).hostname;

    // Checks if the url matches known e-commerce websites
    if (domain.includes("amazon")) {
      linkIcon.classList.add("fa-brands", "fa-amazon", "amazon"); // amazon icon
    } else if (domain.includes("shopify")) {
      linkIcon.classList.add("fa-brands", "fa-shopify", "shopify");
    } else if (domain.includes("ebay")) {
      linkIcon.classList.add("fa-brands", "fa-ebay", "ebay");
    } else if (domain.includes("facebook")) {
      linkIcon.classList.add("fa-brands", "fa-facebook", "facebook");
    } else if (domain.includes("instagram")) {
      linkIcon.classList.add("fa-brands", "fa-instagram", "instagram");
    } else {
      linkIcon.classList.add("fa-link");
    }

    anchor.appendChild(linkIcon);
    div.appendChild(anchor);

    // Close Icon
    const closeIcon = document.createElement("i");
    closeIcon.classList.add("fa-solid", "fa-xmark", "close-icon");
    closeIcon.style.display = "none";

    // Event listener for removing the link
    closeIcon.addEventListener("click", (e) => {
      e.preventDefault();
      div.remove();
    });

    div.append(closeIcon);

    // Append to the website display container
    websiteUrlDisplay.appendChild(div);
    websiteUrlDisplay.style.display = "flex";
    websiteLinks.style.display = "none";
  }

  // Logging for testing
  console.log("The url is:", currentUrl);
  console.log("The current bio is:", currentBio);
  console.log("The url title is:", currentUrlTitle);

  // Reset the url & title for next input
  url.value = "";
  title.value = "";

  /* TODO: Save user data to firebase  */
});

// Review actions : dropdown menu
seeAllReviewsBtn.addEventListener("click", () => {
  
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
  const select = section.querySelectorAll("select");


  
  select.forEach(ele => {
    // console.log(ele);
    ele.disabled = true;
  })
  

  


  // Handle save button click
  saveBtn.forEach((btn) => {

    select.forEach(ele => {
      ele.disabled = true;
    })

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
      // console.log("edit button was clicked!");

      select.forEach(element => {
        element.disabled = false;
      })

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
    // console.log(btn);
    btn.addEventListener("click", () => {
      // console.log("cancel button was clicked!");

      select.forEach(ele => {
        ele.disabled = true;
      })

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

const personalInformationForm = document.getElementById("personalInformation");
console.log(personalInformationForm);
const shippingInformationForm = document.getElementById("shippingInformation");
console.log(shippingInformationForm);

personalInformationForm.addEventListener('submit', (e) => {
  e.preventDefault(); // prevents form submission for validation checks

  console.log("form was submitted!");

  const firstname = document.getElementById("fname").value.trim();
  const lastname = document.getElementById("lname").value.trim();
  const email = document.getElementById("email").value.trim();
  const phoneNumber = document.getElementById("phoneNumber").value.trim();
  const username =  documenet.getElementById("profile-username").value.trim();


  const fnameError = document.getElementById("fnameError");
  const lnameError = document.getElementById("lnameError");
  const emailError = document.getElementById("emailError");
  const phoneError = document.getElementById("phoneError");
  const usernameError = document.getElementById("usernameError");

  let hasErrors = false; // means there is not any errors

  if (firstname === "") {
    fnameError.textContent = "Please input a username"
  }
  
  



  // testing 
  console.log(firstname);
  console.log(lastname);
  console.log(email);
  console.log(phoneNumber);
  console.log(username)


})
