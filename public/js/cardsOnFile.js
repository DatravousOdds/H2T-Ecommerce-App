export function createDefaultBtn(parentElement, e) {
    const parentContainer = e.target.closest(parentElement);
  
    const divider = document.createElement("div");
    divider.classList.add("divider");
  
    const button = document.createElement("button");
    button.id = "set_default_card";
    button.textContent = "Set default";
  
    if (parentContainer) {
      parentContainer.appendChild(divider);
      parentContainer.appendChild(button);
    }
  }