"use strict";

import { getCountries, getStates } from "../../core/global.js";

const countries = await getCountries();
const states = await getStates();

/**
 * Shared, data-agnostic UI helpers used across the profile page modules:
 * popup menus, dropdown toggles, form-error helpers, formatters,
 * the toast notification class, and a generic file-download helper.
 */

// ---------------------------------------------------------------------------
// Popup menu helpers
// ---------------------------------------------------------------------------

export function openPopupMenu(menuSelector) {
  const overlay = document.querySelector(menuSelector);
  if (!overlay) {
    console.error(`Menu element "${menuSelector}" not found`);
    return;
  }

  // Add active class with animation timing
  overlay.style.display = "flex";
  requestAnimationFrame(() => {
    overlay.classList.add("active");
  });

  // Prevent background scrolling
  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";

  // Add escape key listener
  document.addEventListener("keydown", handleEscapeKey);

  // Add click outside listener
  overlay.addEventListener("click", handleOutsideClick);

  // Focus first focusable element
  const firstFocusable = overlay.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (firstFocusable) {
    firstFocusable.focus();
  }
}

export function closePopupMenu(menuSelector) {
  const overlay = document.querySelector(menuSelector);
  if (!overlay) {
    console.error(`Menu element "${menuSelector}" not found`);
    return;
  }

  overlay.classList.remove("active");

  // Reset scrolling
  document.body.style.overflow = "auto";
  document.documentElement.style.overflow = "auto";

  // Remove event listeners
  document.removeEventListener("keydown", handleEscapeKey);
  overlay.removeEventListener("click", handleOutsideClick);

  // Reset form if present
  const form = overlay.querySelector("form");
  if (form) {
    form.reset();
  }

  // Hide overlay after animation
  overlay.addEventListener("transitionend", function hideOverlay() {
    overlay.style.display = "none";
    overlay.removeEventListener("transitionend", hideOverlay);
  });
}

export function handleEscapeKey(event) {
  if (event.key === "Escape") {
    const activeMenu = document.querySelector(".add-card-menu.active");
    if (activeMenu) {
      closePopupMenu(".add-card-menu");
    }
  }
}

export function handleOutsideClick(event) {
  const popup = event.currentTarget.querySelector(".add-card-popup");
  if (popup && !popup.contains(event.target)) {
    closePopupMenu(".add-card-menu");
  }
}

// ---------------------------------------------------------------------------
// Generic form-error helpers
// ---------------------------------------------------------------------------

export function showError(element, message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message;

  if (element) {
    const existingError = element.parentElement.querySelector(".error-message");
    if (existingError) {
      existingError.remove();
    }

    element.parentElement.appendChild(errorDiv);
    element.classList.add("error");
    element.focus();
  } else {
    const formElement = document.getElementById("add-card");
    formElement.insertBefore(errorDiv, formElement.firstChild);
  }

  setTimeout(() => {
    errorDiv.remove();
    if (element) {
      element.classList.remove("error");
    }
  }, 3000);
}

export function removeError(element) {
  element.classList.remove("error");
  const errorMessage = element.parentElement.querySelector(".error-message");
  if (errorMessage) {
    errorMessage.remove();
  }
}

/**
 * @param {HTMLFormElement} form - form that errors will be cleared from
 */
export function clearFormErrors(form) {
  if (!form) return;

  const errorMessages = form.querySelectorAll(".error-message");
  errorMessages.forEach((msg) => msg.remove());

  const inputElements = form.querySelectorAll("input");
  inputElements.forEach((input) => input.classList.remove("error"));

  if (form instanceof HTMLFormElement) form.reset();
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

export function formatFirebaseDate(timestamp) {
  const dateObject = new Date(timestamp.seconds * 1000);
  return dateObject.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

export function formatRelativeTime(timestamp) {
  if (!timestamp) return "";

  const firebaseDate = new Date(timestamp.seconds * 1000);
  const now = new Date();
  const diff = now - firebaseDate;

  // Convert time differences to minutes, hours, days
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) {
    return "just now";
  } else if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  } else if (hours < 24) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  } else if (days < 7) {
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  } else {
    return firebaseDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }
}

export function formatFollowers(count) {
  // Return the original count if it's not a valid number
  if (typeof count !== "number" || isNaN(count)) {
    return count;
  }

  // Format to K (thousands)
  if (count >= 1000 && count < 1000000) {
    return (count / 1000).toFixed(count % 1000 === 0 ? 0 : 1) + "K";
  } else if (count >= 1000000 && count < 1000000000) {
    return (count / 1000000).toFixed(count % 1000000 === 0 ? 0 : 1) + "M";
  } else if (count >= 1000000000) {
    return (count / 1000000000).toFixed(count % 1000000000 === 0 ? 0 : 1) + "B";
  }

  return count.toString();
}

export function formatTimestamp(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) {
    return "Just now";
  }
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }
  if (diffInSeconds < 2592000) {
    const weeks = Math.floor(diffInSeconds / 604800);
    return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  }
  if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} ${months === 1 ? "month" : "months"} ago`;
  }

  const years = Math.floor(diffInSeconds / 31536000);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

// ---------------------------------------------------------------------------
// Transaction status styling
// ---------------------------------------------------------------------------

export const TRANSACTION_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed"
};

export const STATUS_STYLES = {
  [TRANSACTION_STATUS.PENDING]: {
    className: "status-pending",
    backgroundColor: "#FFF4E5",
    color: "#FF9800"
  },
  [TRANSACTION_STATUS.COMPLETED]: {
    className: "status-completed",
    backgroundColor: "#E8F5E9",
    color: "#4CAF50"
  },
  [TRANSACTION_STATUS.FAILED]: {
    className: "status-failed",
    backgroundColor: "#FFEBEE",
    color: "#F44336"
  }
};

export function getStatusClass(status) {
  const normalizedStatus = status?.toLowerCase();
  const statusStyle = STATUS_STYLES[normalizedStatus];

  if (!statusStyle) {
    console.warn(`Unknown transaction status: ${status}`);
    return STATUS_STYLES[TRANSACTION_STATUS.PENDING].className; // Default class
  }

  return statusStyle.className;
}

// ---------------------------------------------------------------------------
// Website / social link icons
//
// Shared by bio.js (owner's edit view) and sellerProfile.js (public view) so
// a link saved on the profile page renders with the same brand icon
// everywhere it shows up.
// ---------------------------------------------------------------------------

const LINK_BRAND_ICONS = [
  { match: "amazon", classes: ["fa-brands", "fa-amazon", "amazon"] },
  { match: "shopify", classes: ["fa-brands", "fa-shopify", "shopify"] },
  { match: "ebay", classes: ["fa-brands", "fa-ebay", "ebay"] },
  { match: "facebook", classes: ["fa-brands", "fa-facebook", "facebook"] },
  { match: "instagram", classes: ["fa-brands", "fa-instagram", "instagram"] },
  { match: "etsy", classes: ["fa-brands", "fa-etsy"] },
];

export function createWebsiteLinkAnchor(url, title) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.classList.add("website-link");

  const linkIcon = document.createElement("i");

  // Links saved before URL validation was in place (or entered without a
  // scheme, e.g. "instagram.com/handle") aren't valid absolute URLs, and
  // `new URL()` throws rather than returning something empty -- fall back
  // to the generic link icon instead of crashing the whole render.
  let brand = null;
  try {
    const domain = new URL(url).hostname;
    brand = LINK_BRAND_ICONS.find(({ match }) => domain.includes(match));
  } catch {
    brand = null;
  }
  linkIcon.classList.add(...(brand ? brand.classes : ["fa-solid", "fa-link"]));

  const linkText = document.createElement("p");
  linkText.textContent = title;

  anchor.appendChild(linkIcon);
  anchor.appendChild(linkText);
  return anchor;
}

// ---------------------------------------------------------------------------
// File download helper
// ---------------------------------------------------------------------------

export function downloadBlob(
  content = "this is the statement that will be download",
  filename = "statement.txt",
  mimeType = "text/plain"
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const tempLink = document.createElement("a");
  tempLink.href = url;
  tempLink.download = filename;

  document.body.appendChild(tempLink);
  tempLink.click();
  document.body.removeChild(tempLink);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}

// ---------------------------------------------------------------------------
// Toast notification
// ---------------------------------------------------------------------------

export class PaymentNotification {
  constructor() {
    this.notification = document.querySelector(".payment-nofication");
    this.timeout = null;
  }

  success(msg, type = "deposit") {
    this.notification.textContent = "";

    const container = document.createElement("div");
    container.classList.add("notification-container");

    switch (type) {
      case "withdraw":
        container.classList.add("withdraw");
        break;
      case "update":
        container.classList.add("update");
        break;
      default:
        container.classList.add("success");
    }

    const icon = document.createElement("i");
    icon.classList.add("fa-solid", "fa-circle-check");
    icon.setAttribute("aria-hidden", "true");

    const p = document.createElement("p");
    p.classList.add("notification-text");
    p.classList.add("amount-text");

    if (type === "deposit" || type === "withdraw") {
      const amount = typeof msg === "string" ? parseFloat(msg) : msg;
      p.textContent =
        type === "deposit"
          ? `$${amount.toFixed(2)} has been added to your wallet`
          : `$${amount.toFixed(2)} has been withdrawn from your wallet`;
    } else if (type === "update") {
      p.textContent = msg;
    }

    container.appendChild(icon);
    container.appendChild(p);
    this.notification.appendChild(container);

    this.show();
  }

  error(message) {
    this.notification.textContent = "";

    const container = document.createElement("div");
    container.classList.add("notification-container", "error");

    const icon = document.createElement("i");
    icon.classList.add("fa-solid", "fa-circle-xmark");
    icon.setAttribute("aria-hidden", "true");

    const p = document.createElement("p");
    p.classList.add("error-text");
    p.textContent = message;

    container.appendChild(icon);
    container.appendChild(p);
    this.notification.appendChild(container);

    this.show();
  }

  show() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.notification.classList.add("show");

    this.timeout = setTimeout(() => {
      this.hide();
    }, 3000);

    this.notification.onclick = () => this.hide();
  }

  hide() {
    this.notification.classList.remove("show");
  }
}

// Single shared notification instance used across modules
export const notification = new PaymentNotification();

// ---------------------------------------------------------------------------
// Generic dropdown toggles (used by several sections of the profile page)
// ---------------------------------------------------------------------------

export function initGenericDropdowns() {
  const dropdownSection = document.querySelectorAll(".dropdown-section");
  const smallDropdownSection = document.querySelectorAll(
    ".dropdown-section-sm"
  );

  dropdownSection.forEach((section) => {
    const dropdownIcon = section.querySelector(".dropdown-icon i");
    const menu = section.querySelector(".dropdown-menu");
    const toggle = section.querySelector(".dropdown-header");
    if (!dropdownIcon || !menu || !toggle) return;

    toggle.addEventListener("click", () => {
      // Hide all other dropdown menus
      document.querySelectorAll(".dropdown-menu").forEach((otherMenu) => {
        if (otherMenu !== menu) {
          otherMenu.classList.remove("active");
          const otherToggleIcon =
            otherMenu.previousElementSibling?.querySelector(
              ".dropdown-icon i"
            );
          if (otherToggleIcon) {
            otherToggleIcon.style.transform = "rotate(0deg)";
          }
        }
      });

      // Toggle the clicked dropdown menu
      menu.classList.toggle("active");

      if (menu.classList.contains("active")) {
        dropdownIcon.style.transform = "rotate(180deg)";
      } else {
        dropdownIcon.style.transform = "rotate(0deg)";
      }
    });
  });

  smallDropdownSection.forEach((smallMenu) => {
    const yearHeader = smallMenu.querySelector(".dropdown-header");
    const yearIcon = smallMenu.querySelector(".dropdown-icon i");
    const yearMenu = smallMenu.querySelector(".year-dropdown");
    const options = smallMenu.querySelectorAll("#list .options");
    const selectedYear = smallMenu.querySelector(".selected-year");
    if (!yearHeader || !yearIcon || !yearMenu) return;

    options.forEach((opt) => {
      opt.addEventListener("click", () => {
        const selectValue = opt.textContent;
        if (selectedYear) selectedYear.textContent = selectValue;
        // function that filters by the selected year
      });
    });

    yearHeader.addEventListener("click", () => {
      yearMenu.classList.toggle("open");

      if (yearMenu.classList.contains("open")) {
        yearIcon.style.transform = "rotate(180deg)";
      } else {
        yearIcon.style.transform = "rotate(0deg)";
      }
    });
  });
}

// Generic filter dropdown used on dashboard/product list views
export function initProductFilterDropdown() {
  const filterContainer = document.getElementById("filter-container");
  const productsFilterDropdown = document.querySelector(
    ".filter-opt .filter-dropdown-content"
  );
  if (!filterContainer || !productsFilterDropdown) return;

  filterContainer.addEventListener("click", (event) => {
    event.stopPropagation();
    productsFilterDropdown.classList.toggle("show");
  });

  // Prevent menu from closing when clicked inside of it
  productsFilterDropdown.addEventListener("click", (e) => e.stopPropagation());

  document.addEventListener("click", () => {
    productsFilterDropdown.classList.remove("show");
  });
}

export function initCountryDropdown() {
  const countryContainer = document.getElementById('shipping-country');

  countries.data.forEach(country => {
    const option = document.createElement('option');
    option.value = country.iso2;
    option.textContent = country.country;

    countryContainer.append(option)
  });

}

// Rebuilds the #shipping-state options for the given country code. Shared by
// the live country-change listener and loadShippingInfoData(), since setting
// #shipping-country's value via JS (on load) doesn't fire a 'change' event.
export function populateStatesForCountry(countryCode) {
  const stateContainer = document.getElementById('shipping-state');
  if (!stateContainer) return;

  // Clear any previously-appended state options, keeping just the placeholder.
  stateContainer.innerHTML = '<option value="">Select</option>';

  const stateArray = states.data.filter(state => state.iso2 === countryCode);
  if (!stateArray[0]) return;

  stateArray[0].states.forEach(state => {
    const option = document.createElement('option');
    option.value = state.name;
    option.textContent = state.state_code;
    stateContainer.append(option);
  });
}

export function initStatesDropdown() {
  const countryContainer = document.getElementById('shipping-country');

  countryContainer.addEventListener('change', (e) => {
    console.log("country selected:", e.target.value);
    populateStatesForCountry(e.target.value);
  })
}

