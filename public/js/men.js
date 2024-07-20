const sortSelect = document.getElementById("sort-select");
const sortIcon = document.getElementById("sort-icon");

const sortBtn = document.getElementById("sort-btn");

const toggleDropdown = () => {
  document.querySelector(".sort-content").classList.toggle("show");
  sortIcon.classList.toggle("rotate-down");
};

// Close the dropdown menu if the user clicks outside of it
window.onclick = (event) => {
  if (!event.target.matches(".dropdown-btn")) {
    let dropdowns = document.getElementsByClassName("sort-content");
    for (let i = 0; i < dropdowns.length; i++) {
      let openDropdown = dropdowns[i];

      if (openDropdown.classList.contains("show")) {
        openDropdown.classList.remove("show");
      }
    }
  }
};

sortBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleDropdown();
});
const sortOption = document.querySelectorAll(".sort-content a");
// console.log(sortOption);
sortOption.forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    sortSelect.textContent = this.textContent;
  });
});
