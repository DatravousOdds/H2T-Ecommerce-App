const availableItemsGrid = document.querySelector(".available-items-grid");
availableItemsGrid.addEventListener("click", (e) => {
  const availableItemCard = e.target.closest(".available-item-card");
  console.log(availableItemCard);
});
