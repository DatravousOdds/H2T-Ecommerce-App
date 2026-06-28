"use strict";

import { validateForm } from "../../core/global.js";
import { db, doc, updateDoc } from "../../api/firebase-client.js";
import { notification } from "./ui-helpers.js";



// ---------------------------------------------------------------------------
// Database writes
// ---------------------------------------------------------------------------

export const updateProfile = async (userId, updateData) => {
  try {
    const userDocRef = doc(db, "userProfiles", userId);
    await updateDoc(userDocRef, {
      ...updateData,
      lastUpdated: new Date()
    });
    notification.success("Profile updated successfully", "update");
  } catch (error) {
    console.error("Error fetching profile:", error);
    notification.error("Error updating profile");
  }
};

export const updateShippingInfo = async (userId, shippingData) => {
  console.log("shipping data:",shippingData)
  try {
    const userDocRef = doc(db, "userProfiles", userId);
    await updateDoc(userDocRef, {
      shipping: {
        address: shippingData.address1,
        address2: shippingData.address2,
        city: shippingData.city,
        country: shippingData.country,
        phoneNumber: shippingData.phoneNumber,
        state: shippingData.state,
        zipCode: shippingData.postalCode,
        lastUpdated: new Date()
      }
      
    });
    notification.success("Shipping information updated", "update");
  } catch (error) {
    console.error("Error updating shipping:", error);
    notification.error("Error updating shipping information");
  }
};

// ---------------------------------------------------------------------------
// Loading data into the form fields
// ---------------------------------------------------------------------------

export function loadPersonalInfoData(userData) {
  document.querySelector("#personal-fname").value = userData.firstName;
  document.querySelector("#personal-lname").value = userData.lastName;
  document.querySelector("#personal-email").value = userData.email;
  document.querySelector("#personal-phoneNumber").value = userData.shipping.phoneNumber;
  document.querySelector("#profile-username").value = userData.username;
}

export function loadShippingInfoData(userData) {
  console.log("userData being loaded:", userData)
  document.querySelector("#shipping-fname").value = userData.firstName;
  document.querySelector("#shipping-lname").value = userData.lastName;
  document.querySelector("#shipping-address").value = userData.shipping.address;
  document.querySelector("#shipping-address2").value = userData.shipping.address2;
  document.querySelector("#shipping-city").value = userData.shipping.city;
  document.querySelector("#shipping-country").value = userData.shipping.country;
  document.querySelector("#shipping-state").value = userData.shipping.state;
  document.querySelector("#shipping-postal").value =
    userData.shipping.zipCode;
  document.querySelector("#shipping-phoneNumber").value = userData.shipping.phoneNumber;
}

// ---------------------------------------------------------------------------
// Wiring: forms, edit/save/cancel, tab navigation
// ---------------------------------------------------------------------------

/**
 * Sets up the personal info / shipping info forms and the edit-save-cancel
 * behavior for each ".profile-section". Call once, after the DOM is ready.
 */
export function initProfileInfo() {
  const personalInformationForm = document.getElementById(
    "personalInformation"
  );
  const shippingInformationForm = document.getElementById(
    "shippingInformation"
  );

  if (personalInformationForm) {
    personalInformationForm.addEventListener("submit", async (e) => {
      e.preventDefault(); // prevents form submission for validation checks
      if (validateForm(personalInformationForm)) {
        // NOTE: this reads the session user from localStorage rather than
        // the userData passed around elsewhere on this page, matching the
        // original implementation.
        const user = JSON.parse(localStorage.user);
        const updateData = {
          firstName: document.querySelector("#fname").value,
          lastName: document.querySelector("#lname").value,
          phoneNumber: document.querySelector("#phoneNumber").value,
          username: document.querySelector("#profile-username").value,
          lastUpdated: new Date()
        };
        await updateProfile(user.userId, updateData);
      }
    });
  }

  if (shippingInformationForm) {
    shippingInformationForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (validateForm(shippingInformationForm)) {
        // NOTE: original code reads from sessionStorage here, while the
        // personal info form above reads from localStorage. Worth
        // double-checking which storage your auth flow actually writes to.
        const user = JSON.parse(sessionStorage.user);
        const shippingData = {
          firstName: document.querySelector("#shippingInformation #shipping-fname")
            .value,
          lastName: document.querySelector("#shippingInformation #shipping-lname")
            .value,
          address1: document.querySelector("#shippingInformation #shipping-address")
            .value,
          address2: document.querySelector(
            "#shippingInformation #shipping-address2"
          ).value,
          city: document.querySelector("#shippingInformation #shipping-city").value,
          state: document.querySelector("#shippingInformation #shipping-state")
            .value,
          postalCode: document.querySelector("#shippingInformation #shipping-postal")
            .value,
          country: document.querySelector("#shippingInformation #shipping-country")
            .value,
          phoneNumber: document.querySelector(
            "#shippingInformation #shipping-phoneNumber"
          ).value,
          lastUpdated: new Date()
        };

        await updateShippingInfo(user.userId, shippingData);
      }
    });
  }

  initEditSaveCancel();
  initTabNavigation();
}

function initEditSaveCancel() {
  const profileSection = document.querySelectorAll(".profile-section");

  profileSection.forEach((section) => {
    const edit = section.querySelectorAll(".edit-info-header");
    const allActionButtons = section.querySelectorAll(".action-buttons");
    const saveBtn = section.querySelectorAll(".save-btn");
    const cancelBtn = section.querySelectorAll(".cancel-btn");
    const inputs = section.querySelectorAll("input");
    const select = section.querySelectorAll("select");

    select.forEach((ele) => {
      ele.disabled = true;
    });

    // Handle save action for form
    saveBtn.forEach((btn) => {
      select.forEach((ele) => {
        ele.disabled = true;
      });

      btn.addEventListener("click", () => {
        let currentForm = null;

        currentForm =
          btn.id === "save-personal-info"
            ? document.getElementById("personalInformation")
            : document.getElementById("shippingInformation");

        if (!currentForm) return; // exit early

        if (validateForm(currentForm) === true) {
          const formInputs = currentForm.querySelectorAll("input");

          formInputs.forEach((input) => {
            input.disabled = true;
            input.style.backgroundColor = "transparent";
            input.style.border = "none";
            input.style.boxShadow = "none";
            input.style.padding = "0px 0px";
          });
          allActionButtons.forEach((action) => {
            action.style.display = "none";
          });
        }
      });
    });

    // Handle edit button click | Profile
    edit.forEach((btn) => {
      btn.addEventListener("click", () => {
        select.forEach((element) => {
          element.disabled = false;
        });

        inputs.forEach((input) => {
          input.disabled = false;
          input.style.backgroundColor = "#e0e0e0";
          input.style.border = "#b0b0b0";
          input.style.padding = "12px 20px";
        });

        allActionButtons.forEach((action) => {
          action.style.display = "flex";
        });
      });
    });

    // Handle cancel button click | Profile
    cancelBtn.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.id === "cancel-personal-info") {
          const personalFormIds = [
            "fname",
            "lname",
            "email",
            "phoneNumber",
            "profile-username"
          ];

          personalFormIds.forEach((id) => {
            const input = document.getElementById(id);
            if (input) {
              input.classList.remove("input-error");
            }
          });

          const personalErrorIds = [
            "fnameError",
            "lnameError",
            "emailError",
            "phoneError",
            "usernameError"
          ];

          personalErrorIds.forEach((id) => {
            const errorElem = document.getElementById(id);
            if (errorElem) {
              errorElem.textContent = "";
            }
          });
        } else if (btn.id === "cancel-shipping-info") {
          const shippingForm = document.getElementById("shippingInformation");

          const shippingInputs = shippingForm.querySelectorAll("input");
          const spans = shippingForm.querySelectorAll("span");
          const selects = shippingForm.querySelectorAll("select");

          selects.forEach((sel) => sel.classList.remove("input-error"));
          shippingInputs.forEach((input) =>
            input.classList.remove("input-error")
          );
          spans.forEach((span) => {
            if (span.id === "fnameError") span.textContent = "";
            if (span.id === "lnameError") span.textContent = "";
            if (span.id === "addressError") span.textContent = "";
            if (span.id === "cityError") span.textContent = "";
            if (span.id === "postalError") span.textContent = "";
            if (span.id === "phoneError") span.textContent = "";
            if (span.id === "stateError") span.textContent = "";
          });

          const shippingErrorIds = [
            "fnameError",
            "lnameError",
            "countryError",
            "addressError"
          ];

          shippingErrorIds.forEach((id) => {
            const errorElem = document.getElementById(id);
            if (errorElem) {
              errorElem.innerText = "";
            }
          });
        }

        // Disable select elements
        select.forEach((ele) => (ele.disabled = true));

        // Reset input fields (remove custom styles, etc.)
        inputs.forEach((input) => {
          input.disabled = true;
          input.style.backgroundColor = "transparent";
          input.style.border = "none";
          input.style.boxShadow = "none";
          input.style.padding = "0px 0px";
        });

        // Hide cta buttons
        allActionButtons.forEach((action) => {
          action.style.display = "none";
        });
      });
    });

    // Hide the cta buttons by default | Profile
    allActionButtons.forEach((action) => {
      action.style.display = "none";
    });
  });
}

function initTabNavigation() {
  const allTabs = document.querySelectorAll(".tab-btn");

  allTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabId = tab.getAttribute("data-tab");

      allTabs.forEach((btn) => {
        btn.classList.remove("active");
      });

      document.querySelectorAll(".tab").forEach((content) => {
        content.classList.remove("active");
      });

      tab.classList.add("active");
      document.getElementById(tabId).classList.add("active");

      localStorage.setItem("activeTab", tabId);
    });
  });
}

