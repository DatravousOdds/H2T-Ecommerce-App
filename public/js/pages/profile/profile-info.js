"use strict";

import { validateForm } from "../../core/global.js";
import { db, doc, updateDoc } from "../../api/firebase-client.js";
import { notification, populateStatesForCountry } from "./ui-helpers.js";
import { checkUserStatus, updateCachedUser } from "../../auth/auth.js";



// ---------------------------------------------------------------------------
// Database writes
// ---------------------------------------------------------------------------

// Returns true/false so callers can decide whether to refresh the cached
// profile (checkUserStatus()/sessionStorage) after a successful write.
export const updateProfile = async (userId, updateData) => {
  try {
    const userDocRef = doc(db, "userProfiles", userId);
    await updateDoc(userDocRef, {
      ...updateData,
      lastUpdated: new Date()
    });
    notification.success("Profile updated successfully", "update");
    return true;
  } catch (error) {
    console.error("Error fetching profile:", error);
    notification.error("Error updating profile");
    return false;
  }
};

export const updateShippingInfo = async (userId, shippingData) => {
  console.log("shipping data:",shippingData)
  try {
    const userDocRef = doc(db, "userProfiles", userId);
    await updateDoc(userDocRef, {
      // firstName/lastName live at the top level (shared with Personal Info),
      // not nested under shipping - the form collects them but was previously
      // dropping them on the floor before this write.
      firstName: shippingData.firstName,
      lastName: shippingData.lastName,
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
    return true;
  } catch (error) {
    console.error("Error updating shipping:", error);
    notification.error("Error updating shipping information");
    return false;
  }
};

// ---------------------------------------------------------------------------
// Loading data into the form fields
// ---------------------------------------------------------------------------

export function loadPersonalInfoData(userData) {
  const shipping = userData.shipping || {};
  document.querySelector("#personal-fname").value = userData.firstName || "";
  document.querySelector("#personal-lname").value = userData.lastName || "";
  document.querySelector("#personal-email").value = userData.email || "";
  document.querySelector("#personal-phoneNumber").value = shipping.phoneNumber || "";
  document.querySelector("#profile-username").value = userData.username || "";
}

export function loadShippingInfoData(userData) {
  console.log("userData being loaded:", userData)
  const shipping = userData.shipping || {};
  document.querySelector("#shipping-fname").value = userData.firstName || "";
  document.querySelector("#shipping-lname").value = userData.lastName || "";
  document.querySelector("#shipping-address").value = shipping.address || "";
  document.querySelector("#shipping-address2").value = shipping.address2 || "";
  document.querySelector("#shipping-city").value = shipping.city || "";
  document.querySelector("#shipping-country").value = shipping.country || "";
  populateStatesForCountry(shipping.country || "");
  document.querySelector("#shipping-state").value = shipping.state || "";
  document.querySelector("#shipping-postal").value = shipping.zipCode || "";
  document.querySelector("#shipping-phoneNumber").value = shipping.phoneNumber || "";
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
        // Use the same cached-user source as the rest of the profile page
        // (auth.js checkUserStatus) instead of localStorage, which is only
        // ever populated on login - not on signup - and could be stale/absent.
        const user = await checkUserStatus();
        const firstName = document.querySelector("#personal-fname").value;
        const lastName = document.querySelector("#personal-lname").value;
        const phoneNumber = document.querySelector("#personal-phoneNumber").value;
        const username = document.querySelector("#profile-username").value;

        const updateData = {
          firstName,
          lastName,
          username,
          // Phone number is stored under `shipping.phoneNumber` since that's
          // the single field both this form and the Shipping form read from.
          // Dot-notation is required so updateDoc merges instead of replacing
          // the whole `shipping` map.
          "shipping.phoneNumber": phoneNumber
        };

        const success = await updateProfile(user.userId, updateData);
        if (success) {
          updateCachedUser({ firstName, lastName, username, shipping: { phoneNumber } });
        }
      }
    });
  }

  if (shippingInformationForm) {
    shippingInformationForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (validateForm(shippingInformationForm)) {
        const user = await checkUserStatus();
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

        const success = await updateShippingInfo(user.userId, shippingData);
        if (success) {
          updateCachedUser({
            firstName: shippingData.firstName,
            lastName: shippingData.lastName,
            shipping: {
              address: shippingData.address1,
              address2: shippingData.address2,
              city: shippingData.city,
              country: shippingData.country,
              phoneNumber: shippingData.phoneNumber,
              state: shippingData.state,
              zipCode: shippingData.postalCode
            }
          });
        }
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
    // Email is excluded: changing it requires a Firebase Auth email update
    // (re-authentication), not just a Firestore write, so it isn't wired up yet.
    const inputs = section.querySelectorAll("input:not(#personal-email)");
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
          const formSelects = currentForm.querySelectorAll("select");

          formInputs.forEach((input) => {
            input.disabled = true;
            input.style.backgroundColor = "transparent";
            input.style.border = "none";
            input.style.boxShadow = "none";
            input.style.padding = "0px 0px";
          });
          formSelects.forEach((select) => {
            select.disabled = true;
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
        // Snapshot values before unlocking the form so Cancel can restore
        // them exactly -- including reverting back to blank/placeholder if
        // the field was empty before editing started.
        inputs.forEach((input) => {
          input.dataset.originalValue = input.value;
        });
        select.forEach((element) => {
          element.dataset.originalValue = element.value;
        });

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
            "personal-fname",
            "personal-lname",
            "personal-email",
            "personal-phoneNumber",
            "profile-username"
          ];

          personalFormIds.forEach((id) => {
            const input = document.getElementById(id);
            console.log("cancel input:", input)
            if (input) {
              input.classList.remove("input-error");
              if(input.dataset.originalValue !== undefined) {
                input.placeholder = dataset.originalValue;
              } else {
                return;
              }
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

        // Restore the value each field had before Edit was clicked, then
        // disable. Discards unsaved typing instead of leaving it visible --
        // an empty original value restores to "" so the placeholder shows.
        select.forEach((ele) => {
          if (ele.dataset.originalValue !== undefined) {
            ele.value = ele.dataset.originalValue;
          }
          ele.disabled = true;
        });

        inputs.forEach((input) => {
          if (input.dataset.originalValue !== undefined) {
            input.value = input.dataset.originalValue;

          }
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

function activateTab(tabId) {
  const tab = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  const content = document.getElementById(tabId);
  if (!tab || !content) return;

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  document.querySelectorAll(".tab").forEach((c) => {
    c.classList.remove("active");
  });

  tab.classList.add("active");
  content.classList.add("active");

  localStorage.setItem("activeTab", tabId);
}

function initTabNavigation() {
  const allTabs = document.querySelectorAll(".tab-btn");

  allTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activateTab(tab.getAttribute("data-tab"));
    });
  });

  // No ?tab= read here -- nav.js's handleTabs()/switchTabs() already does
  // this deep-link on load for these same .tab-btn/.tab elements.
}

