"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const purchaseTypeNav = document.querySelector(".purchase-type-nav");
  const purchaseTypeItems = document.querySelectorAll(".purchase-type-item");
  const purchaseContentSections = document.querySelectorAll(
    ".purchases-content-section"
  );

  console.log("purchaseContentSections", purchaseContentSections);
  purchaseTypeItems.forEach((item, index) => {
    item.addEventListener("click", () => {
      purchaseTypeItems.forEach((item) => item.classList.remove("active"));
      item.classList.add("active");

      purchaseContentSections.forEach((section) =>
        section.classList.remove("active")
      );
      console.log("index", index);
      purchaseContentSections[index].classList.add("active");
    });
  });
});

const orderDetailsMenu = document.querySelector(".order-details-menu");
const closeOrderDetailsMenu = document.getElementById(
  "close-order-details-menu"
);
const viewOrderDetailsButton = document.querySelectorAll(".purchase-controls");

viewOrderDetailsButton.forEach((button) => {
  button.addEventListener("click", () => {
    orderDetailsMenu.classList.add("active");
  });
});

closeOrderDetailsMenu.addEventListener("click", () => {
  orderDetailsMenu.classList.remove("active");
});
