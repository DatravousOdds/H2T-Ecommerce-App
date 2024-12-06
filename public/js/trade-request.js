const availableItemsGrids = document.querySelectorAll(".available-items-grid");
const selectedItemsGrids = document.querySelectorAll(".selected-items-grid");

// available items grid
availableItemsGrids.forEach((grid) => {
  grid.addEventListener("click", (e) => {
    // console.log("clicked item", e.target);
    // Find the clicked card or its parent
    const itemCard = e.target.closest(".available-item-card");
    console.log("item card", itemCard);
    if (!itemCard) return; // if no card is clicked, return

    const tradeSection = itemCard.closest(".trade-section");
    console.log("trade section", tradeSection);
    const selectedItemsGrid = tradeSection.querySelector(
      ".selected-items-grid"
    );
    console.log("selected items grid", selectedItemsGrid);

    // Check if the selected items grid has 4 items
    const selectedItems = selectedItemsGrid.querySelectorAll(
      ".selected-item-card"
    );
    console.log("selected items", selectedItems);
    if (selectedItems.length >= 4) return;

    // Get the item details from the clicked card
    const itemName = itemCard.querySelector(".item-name").textContent;
    const itemValue = itemCard.querySelector(".item-value").textContent;
    const itemCondition = itemCard.querySelector(".item-condition").textContent;
    const itemImage = itemCard.querySelector(".item-image").src;
    console.log("item name", itemName);
    console.log("item value", itemValue);
    console.log("item condition", itemCondition);
    console.log("item image", itemImage);
    // Create a new selected item card
    const selectedItemCard = document.createElement("div");
    selectedItemCard.classList.add("selected-item-card");

    // Structure the selected item card
    selectedItemCard.innerHTML = `
    <div class="selected-item-remove">
        <i class="fa-solid fa-circle-xmark"></i>
      </div>
      <img src="${itemImage}" alt="Item Image" width="100px" height="100px">
      <div class="selected-item-info">
        <h3 class="item-name">${itemName}</h3>
        <p class="item-value">${itemValue}</p>
        <p class="item-condition">${itemCondition}</p>
      </div>
    `;

    // Append the new selected item card to the selected items grid
    selectedItemsGrid.appendChild(selectedItemCard);

    // Remove the clicked item card from the available items grid
    // itemCard.remove();

    // Update selected items count
    const itemCount = selectedItemsGrid.querySelectorAll(
      ".selected-item-card"
    ).length;
    console.log("item count", itemCount);
    if (itemCount > 4) {
      // Disable the trade button
      document.getElementById("create-trade-request").classList.add("disabled");
    }
    // Update the selected items count
    const selectedItemsCount = tradeSection.querySelector(".item-counter");
    selectedItemsCount.textContent = `${selectedItemsGrid.children.length}/4 Selected`;

    const yourItems = tradeSection
      .querySelector(".your-item .selected-items-grid")
      .querySelectorAll(".item-value");
    console.log("your items", yourItems);

    const theirItems = tradeSection
      .querySelector(".their-item .selected-items-grid")
      .querySelectorAll(".item-value");
    console.log("their items", theirItems);

    // Update the total value
    let totalValue = 0;
    let theirValue = 0;
  });
});

const itemRemoveBtn = document.querySelectorAll(".selected-item-remove");
itemRemoveBtn.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    console.log("closed item card", e.target);
    e.target.closest(".selected-item-card").remove();
  });
});
