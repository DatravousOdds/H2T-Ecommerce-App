const sortSelect = document.getElementById("sort-select");
const pgSelect = document.getElementById("pg-amount-select");
const sortIcon = document.getElementById("sort-icon");
const pgIcon = document.getElementById("pg-icon");
const pgContainer = document.getElementById("pg-container");
const sortOption = document.querySelectorAll("#sort-container .sort-content a");
const pgOption = document.querySelectorAll("#pg-container .sort-content a");
const sortContainer = document.getElementById("sort-container");

// toggles dropdown menu params: container, icon
const toggleDropdown = (container, icon) => {
  container.querySelector(".sort-content").classList.toggle("show");
  icon.classList.toggle("rotate-down");
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

sortContainer.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleDropdown(sortContainer, sortIcon);
});

pgContainer.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleDropdown(pgContainer, pgIcon);
});

sortOption.forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    sortSelect.textContent = this.textContent;
  });
});

pgOption.forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    pgSelect.textContent = this.textContent;
  });
});


/* selected item function */
const selectedItem = (element) => {
  const items = document.querySelectorAll('.sort-content a');
  console.log(items);
  items.forEach(item => {
    item.classList.remove('selected');
});

  element.classList.add('selected');
}


/** Filter by functions **/

document
  .querySelectorAll(".filter-option .expand-details")
  .forEach(function (expandDetails) {
    expandDetails.addEventListener("click", function () {
      let dropDownFilterOptions = this.nextElementSibling;
      if (dropDownFilterOptions) {
        dropDownFilterOptions.classList.toggle("show");
        let icon = this.querySelector("i");
        if (icon.classList.contains("fa-plus")) {
          icon.classList.remove("fa-plus");
          icon.classList.add("fa-minus"); // change to a minus icon
        } else {
          icon.classList.remove("fa-minus");
          icon.classList.add("fa-plus"); // change back to plus icon
        }
      }
    });
  });
