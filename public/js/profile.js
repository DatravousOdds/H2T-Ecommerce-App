/* * 09/22/2024 Travis Odds  Adding action to forms, no connect db yet. * */


const dropdownSection = document.querySelectorAll(".dropdown-section");
const smallDropdownSection = document.querySelectorAll(".dropdown-section-sm");
const spanElement = document.getElementById('filter-icon');
const profileForms =  document.querySelectorAll(".profile-section");
const hasFilterIcon = spanElement.querySelector('i.fa-filter') !== null;
const firstSection = profileForms[0];
const bio = firstSection.querySelector("#bio");






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

// Performs menu actions such as save, cancel or edit for profile -- profile --
profileForms.forEach(section => {
  const editBtn = section.querySelectorAll('.edit-btn')
  const actionBtns = section.querySelectorAll(".action-buttons");
  actionBtns.forEach(btn => {{
    btn.style.display = "none";
  }})
  
})
  
 
 
  
  // Initially hide save and cancel buttons
  // saveBtn.style.display = "none";
  // cancelBtn.style.display = "none";
 

  // Handle cancel button click
  // cancelBtn.addEventListener("click", () => {
  //   inputs.forEach(input => {
  //     input.disabled = true;
  //     input.style.backgroundColor = "transparent";
  //     input.style.border = "none";
  //     input.style.boxShadow = "none";
  //     input.style.padding = "0px 0px";
  
  //     saveBtn.style.display = "none";
  //     cancelBtn.style.display = "none";
  //     editBtn.style.display = "flex";
  
  //   })
  // })
  
  // // Handle edit button click
  // editBtn.addEventListener('click', () => {
  //   console.log('Edit button clicked'); // testing 
  //   inputs.forEach(input => {
  //     input.disabled = false;
  //     input.style.backgroundColor = "#e0e0e0";
  //     input.style.border = "#b0b0b0";
  //     input.style.padding = "12px 20px";
  
    
      
  //   });
  //   saveBtn.style.display = "inline"
  //   cancelBtn.style.display = "inline"
  //   editBtn.style.display = "none"  
  // });
  
  // action for when the save chgs  btn is clicked :: Personal Information 
  // saveBtn.addEventListener("click", () => {
  //   inputs.forEach(input =>  {
  //     input.disabled = true;
  //     input.style.backgroundColor = "transparent";
  //     input.style.border = "none";
  //     input.style.boxShadow = "none";
  //     input.style.padding = "0px 0px";
  
  //     // Send to a database
      
  
  //   })
  //    //  removing the save, cancel btns from the dom
  //   saveBtn.style.display = "none"
  //   cancelBtn.style.display =  "none"
  //   editBtn.style.display = "flex"
  
  
  
  
  // }) 

 

  


  
    


// Performs menu actions for pfp-section bio-section for profile -- profile --












