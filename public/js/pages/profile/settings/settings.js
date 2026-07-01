"use strict";

import { db, doc, getDoc, updateDoc } from "../../../api/firebase-client.js";

/**
 * Stored as a nested object on the user's own userProfiles doc, same
 * pattern as notifications.js's notificationPreferences:
 *   userProfiles/{uid}.appSettings: {
 *     newReleases, priceDrops, salesPromotions, newsletter,
 *     language, darkMode
 *   }
 *
 * Three controls on this tab have NO real backend/feature behind them yet,
 * so rather than fake a working toggle, each is left visibly disabled with
 * an explanation -- same standard applied to Seller Rating, Tax Center,
 * and Track Order earlier in this project:
 *
 *   - Two-Factor Authentication: no SMS/TOTP infrastructure exists at all
 *   - Update Password: no change-password flow exists anywhere in the app
 *   - Dark Mode: the *preference* is saved for later, but there's no
 *     actual dark theme/CSS to apply yet -- toggling it wouldn't visibly
 *     do anything, which would be more confusing than a disabled control
 */

const TOGGLE_IDS = ["notif-new-releases", "notif-price-drops", "notif-sales-promos", "notif-newsletter"];

function toFieldName(elementId) {
  // "notif-new-releases" -> "newReleases"
  const withoutPrefix = elementId.replace("notif-", "");
  return withoutPrefix.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function disableWithReason(elementId, reason) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.disabled = true;
  el.title = reason;

  const item = el.closest(".settings__item");
  if (item) {
    const description = item.querySelector(".settings__item-description");
    if (description) description.textContent = reason;
  }
}

async function loadSettings(userId) {
  const snap = await getDoc(doc(db, "userProfiles", userId));
  if (!snap.exists()) return {};
  return snap.data().appSettings || {};
}

function applySettings(settings) {
  TOGGLE_IDS.forEach((id) => {
    const checkbox = document.getElementById(id);
    const fieldName = toFieldName(id);
    if (checkbox && settings[fieldName] !== undefined) {
      checkbox.checked = settings[fieldName];
    }
  });

  const languageSelect = document.getElementById("language-select");
  if (languageSelect && settings.language) {
    languageSelect.value = settings.language;
  }

  const darkModeToggle = document.getElementById("dark-mode-toggle");
  if (darkModeToggle && settings.darkMode !== undefined) {
    darkModeToggle.checked = settings.darkMode;
  }
}

async function saveSetting(userId, fieldName, value) {
  try {
    await updateDoc(doc(db, "userProfiles", userId), {
      [`appSettings.${fieldName}`]: value,
    });
  } catch (error) {
    console.error(`Error saving setting "${fieldName}":`, error);
  }
}

function wireNotificationToggles(userId) {
  TOGGLE_IDS.forEach((id) => {
    const checkbox = document.getElementById(id);
    if (!checkbox) return;

    checkbox.addEventListener("change", () => {
      saveSetting(userId, toFieldName(id), checkbox.checked);
    });
  });
}

function wireLanguageSelect(userId) {
  const select = document.getElementById("language-select");
  if (!select) return;

  select.addEventListener("change", () => {
    saveSetting(userId, "language", select.value);
  });
}

function wireDarkModeToggle(userId) {
  const toggle = document.getElementById("dark-mode-toggle");
  if (!toggle) return;

  // Saves the preference for whenever a real dark theme exists to read it --
  // does not apply any visual change today, since there's no theme to apply.
  toggle.addEventListener("change", () => {
    saveSetting(userId, "darkMode", toggle.checked);
  });
}

function disableUnimplementedControls() {
  disableWithReason(
    "two-factor-toggle",
    "Two-factor authentication isn't available yet -- coming soon."
  );
  disableWithReason(
    "update-password-btn",
    "Password changes aren't available yet -- coming soon."
  );
}

export async function initSettings(userData) {
  if (!userData?.userId) return;

  disableUnimplementedControls();

  try {
    const settings = await loadSettings(userData.userId);
    applySettings(settings);
  } catch (error) {
    console.error("Error loading settings:", error);
  }

  wireNotificationToggles(userData.userId);
  wireLanguageSelect(userData.userId);
  wireDarkModeToggle(userData.userId);
}