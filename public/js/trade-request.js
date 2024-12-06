const availableItemsGrid = document.querySelectorAll(".available-items-grid");
const selectedItemsGrid = document.querySelector(".selected-items-grid");

// available items grid
availableItemsGrid.forEach((grid) => {
  grid.addEventListener("click", (e) => {
    console.log("clicked item", e.target);
    const selectedItem = e.target;
    const itemName = selectedItem.alt;
    const itemPrice = selectedItem.getAttribute("data-price");
    const itemCondition = selectedItem.getAttribute("data-condition");

    // create selected item card
    const selectedItemCard = document.createElement("div");

    // remove button
    const selectedItemRemoveBtn = document.createElement("div");

    // image
    const selectedItemImage = document.createElement("img");
    selectedItemImage.src = e.target.src; // get src from the clicked element

    // icon
    const icon = document.createElement("i");
    icon.classList.add("fa-solid", "fa-xmark");
    icon.setAttribute("aria-hidden", "true");

    // Create child elements
    const selectedItemInfo = document.createElement("div");
    const selectedItemName = document.createElement("h2");
    const selectedItemPrice = document.createElement("p");
    const selectedItemCondition = document.createElement("p");

    selectedItemName.textContent = itemName;
    selectedItemPrice.textContent = itemPrice;
    selectedItemCondition.textContent = itemCondition;

    // Append child elements
    selectedItemInfo.appendChild(selectedItemName);
    selectedItemInfo.appendChild(selectedItemPrice);
    selectedItemInfo.appendChild(selectedItemCondition);

    // Add classes
    selectedItemInfo.classList.add("selected-item-info");
    selectedItemRemoveBtn.classList.add("selected-item-remove");
    selectedItemImage.classList.add("selected-item-image");
    selectedItemCard.classList.add("selected-item-card");

    selectedItemRemoveBtn.appendChild(icon);
    selectedItemCard.appendChild(selectedItemRemoveBtn);
    selectedItemCard.appendChild(selectedItemImage);
    selectedItemCard.appendChild(selectedItemInfo);
    selectedItemsGrid.appendChild(selectedItemCard);
  });
});

const itemRemoveBtn = document.querySelectorAll(".selected-item-remove");
itemRemoveBtn.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    console.log("closed item card", e.target);
    e.target.closest(".selected-item-card").remove();
  });
});
