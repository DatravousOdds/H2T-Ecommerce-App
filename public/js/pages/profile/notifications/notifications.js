"use strict";

import { db, doc, getDoc, updateDoc } from "../../../api/firebase-client.js";

/**
 * No save button exists anywhere in this tab's HTML -- every toggle and
 * the frequency selector save immediately on change, the same way most
 * apps handle notification preferences (no separate submit step).
 *
 * Stored as a nested object on the user's own userProfiles doc, matching
 * how bio.js/profile-info.js already store this kind of personal settings
 * data -- not a separate collection, since this isn't a list of things,
 * it's settings belonging to one user.
 *   userProfiles/{uid}.notificationPreferences: {
 *     orderUpdates, priceAlerts, securityAlerts, messagesAlerts,
 *     emailNotifications, smsNotifications, pushNotifications, frequency
 *   }
 *
 * If no preferences have ever been saved, the checkboxes are left exactly
 * as the HTML already has them (all unchecked) -- not overridden with
 * fabricated defaults.
 */

const CHECKBOX_IDS = [
  "order-updates",
  "price-alerts",
  "security-alerts",
  "messages-alerts",
  "email-notifications",
  "sms-notifications",
  "push-notifications",
];

function toFieldName(elementId) {
  // "order-updates" -> "orderUpdates"
  return elementId.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

async function loadPreferences(userId) {
  const snap = await getDoc(doc(db, "userProfiles", userId));
  if (!snap.exists()) return {};
  return snap.data().notificationPreferences || {};
}

function applyPreferences(prefs) {
  CHECKBOX_IDS.forEach((id) => {
    const checkbox = document.getElementById(id);
    const fieldName = toFieldName(id);
    if (checkbox && prefs[fieldName] !== undefined) {
      checkbox.checked = prefs[fieldName];
    }
  });

  const savedFrequency = prefs.frequency || null;
  if (savedFrequency) {
    document.querySelectorAll(".frequency-button").forEach((btn) => {
      btn.classList.toggle("active", btn.textContent.trim() === savedFrequency);
    });
  }
}

async function savePreference(userId, fieldName, value) {
  try {
    await updateDoc(doc(db, "userProfiles", userId), {
      [`notificationPreferences.${fieldName}`]: value,
    });
  } catch (error) {
    console.error(`Error saving notification preference "${fieldName}":`, error);
  }
}

function wireCheckboxes(userId) {
  CHECKBOX_IDS.forEach((id) => {
    const checkbox = document.getElementById(id);
    if (!checkbox) return;

    checkbox.addEventListener("change", () => {
      savePreference(userId, toFieldName(id), checkbox.checked);
    });
  });
}

function wireFrequencyButtons(userId) {
  const buttons = document.querySelectorAll(".frequency-button");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      savePreference(userId, "frequency", btn.textContent.trim());
    });
  });
}

export async function initNotifications(userData) {
  if (!userData?.userId) return;

  try {
    const prefs = await loadPreferences(userData.userId);
    applyPreferences(prefs);
  } catch (error) {
    console.error("Error loading notification preferences:", error);
  }

  wireCheckboxes(userData.userId);
  wireFrequencyButtons(userData.userId);
}