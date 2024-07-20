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
