const availableItemsGrids = document.querySelectorAll(".available-items-grid");
const selectedItemsGrids = document.querySelectorAll(".selected-items-grid");
const createTradeRequestBtn = document.getElementById("create-trade-request");
const cancelTradeRequestBtn = document.getElementById("cancel-trade-request");
const tradeConfirmationModal = document.querySelector(
  ".trade-confirmation-modal"
);
const yourItemsCount = document.querySelector(".items-count.your-items");
const theirItemsCount = document.querySelector(".items-count.their-items");
const backToTradingPageBtn = document.querySelector(
  ".trade-confirmation-modal-content .back-to-trading-page"
);
const viewTradeRequestBtn = document.querySelector(
  ".trade-confirmation-modal-content .view-trade-request"
);
const viewTradeRequestPage = document.getElementById("view-trade-request");

console.log("view trade request page", viewTradeRequestPage);

console.log("your items count", yourItemsCount);
console.log("their items count", theirItemsCount);

// Add event listener to the available items grid
availableItemsGrids.forEach((grid) => {
  grid.addEventListener("click", (e) => {
    // console.log("clicked item", e.target);
    // Find the clicked card or its parent
    const itemCard = e.target.closest(".available-item-card");
    // console.log("item card", itemCard);
    if (!itemCard) return; // if no card is clicked, return

    const tradeSection = itemCard.closest(".trade-section");
    console.log("trade section", tradeSection);
    const selectedItemsGrid = tradeSection.querySelector(
      ".selected-items-grid"
    );
    // console.log("selected items grid", selectedItemsGrid);

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
    // console.log("item name", itemName);
    // console.log("item value", itemValue);
    // console.log("item condition", itemCondition);
    // console.log("item image", itemImage);
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
    // console.log("item count", itemCount);
    if (itemCount > 4) {
      // Disable the trade button
      document.getElementById("create-trade-request").classList.add("disabled");
    }
    // Update the selected items count
    const selectedItemsCount = tradeSection.querySelector(".item-counter");
    selectedItemsCount.textContent = `${selectedItemsGrid.children.length}/4 Selected`;

    const yourItems = document
      .querySelector(".your-item .selected-items-grid")
      .querySelectorAll(".item-value");

    console.log("your items", yourItems);

    const theirItems = document
      .querySelector(".their-item .selected-items-grid")
      .querySelectorAll(".item-value");

    console.log("their items", theirItems);

    // Update the total value
    let yourTotal = 0;
    let theirTotal = 0;

    yourItems.forEach((item) => {
      const price = item.textContent.match(/\d+/)[0];
      yourTotal += parseInt(price) || 0;
    });

    theirItems.forEach((item) => {
      const price = item.textContent.match(/\d+/)[0];
      theirTotal += parseInt(price) || 0;
    });

    console.log("your total", yourTotal);
    console.log("their total", theirTotal);

    // Update the total value
    const yourTotalValue = document.querySelector(".your-value .amount");
    yourTotalValue.textContent = `$${yourTotal}`;

    const theirTotalValue = document.querySelector(".their-value .amount");
    theirTotalValue.textContent = `$${theirTotal}`;

    // Update the value difference
    const valueDifference = document.querySelector(
      ".value-difference .alert-message"
    );
    const favorDifference = Math.abs(theirTotal - yourTotal);
    console.log("favor difference", favorDifference);

    if (favorDifference > 0) {
      const favorText =
        yourTotal > theirTotal ? "in your favor" : "in their favor";
      valueDifference.textContent = `There is a $${favorDifference} value difference ${favorText}.`;
    }

    // add remove event listener to the selected items
    const removeBtn = selectedItemCard.querySelector(".selected-item-remove");
    removeBtn.addEventListener("click", (e) => {
      console.log("remove btn clicked", e.target);
      e.target.closest(".selected-item-card").remove();
    });

    // confirmation item counts
    yourItemsCount.textContent = `${selectedItemsGrids[0].children.length} items ($${yourTotal})`;
    theirItemsCount.textContent = `${selectedItemsGrids[1].children.length} items ($${theirTotal})`;
  });
});

// Add event listener to the create trade request button
createTradeRequestBtn.addEventListener("click", () => {
  console.log("create trade request button clicked");
  // create trade request
  tradeConfirmationModal.style.display = "flex";
  document.body.style.overflow = "hidden";
});

// Add event listener to the cancel trade request button
cancelTradeRequestBtn.addEventListener("click", () => {
  console.log("cancel trade request button clicked");

  // clear the selected items
  const selectedItems = document.querySelectorAll(".selected-item-card");
  selectedItems.forEach((item) => {
    item.remove();
  });

  // redirect to the profile page
  window.location.href = "/profile";
});

// Add event listener to the back to trading page button
backToTradingPageBtn.addEventListener("click", () => {
  console.log("back to trading page button clicked");
  tradeConfirmationModal.style.display = "none";
  document.body.style.overflow = "auto";
});

// Add event listener to the view trade request button
viewTradeRequestBtn.addEventListener("click", () => {
  console.log("view trade request button clicked");
  window.location.href = "/view-trade-request";
});
