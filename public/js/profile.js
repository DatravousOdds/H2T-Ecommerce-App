/* * 09/22/2024 Travis Odds  Adding action to forms, no connect db yet. * */


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

const editBtn = document.querySelector("#edit-info-header .edit-info");
const saveBtn = document.querySelector("#personalInfoActionBtn .save-btn");
const cancelBtn = document.querySelector("#personalInfoActionBtn .cancel-btn");
const inputs = document.querySelectorAll("#personalInformation input");




console.log(inputs)





cancelBtn.addEventListener("click", function(){
  console.log('Cancel button clicked')
})

editBtn.addEventListener('click', () => {
  console.log('Edit button clicked')
  inputs.forEach(input => {
    input.disabled = false;
    input.style.backgroundColor = "#dfefff";
    input.style.border = "#b0b0b0";

  
    
  });
  saveBtn.style.display = "inline"
  cancelBtn.style.display = "inline"
  editBtn.style.display = "none"  
});

// action for when the save chgs  btn is clicked :: Personal Information 
saveBtn.addEventListener("click", function() {
  inputs.forEach(input =>  {
    input.disabled = true;
    input.style.backgroundColor = "transparent";
    input.style.border = "none";
    input.style.boxShadow = "none";
  })
   //  removing the save, cancel btns from the dom
  saveBtn.style.display = "none"
  cancelBtn.style.display =  "none"
  editBtn.style.display = "flex"

}) 

