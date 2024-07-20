const sortBtn = document.getElementById("sort-btn");

const toggleDropdown = () => {
  document.querySelector(".sort-content").classList.toggle("show");
  document.getElementById("sort-icon").classList.toggle("rotate-down")
  
};

// Close the dropdown menu if the user clicks outside of it
window.onclick = (event) => {
  if (!event.target.matches(".dropdown-btn")) {
    let dropdowns = document.getElementsByClassName("sort-content");
    for (let i = 0; i < dropdowns.length; i++) {
      let openDropdown = dropdowns[i];
      console.log(openDropdown[1]);
      if (openDropdown.classList.contains("show")) {
        openDropdown.classList.remove("show");
      }
    }
  }
};

sortBtn.addEventListener("click", toggleDropdown);

const sortOption = document.querySelectorAll(".sort-content a");
console.log(sortOption);
