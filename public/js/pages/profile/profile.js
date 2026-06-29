"use strict";

import { checkUserStatus } from "../../auth/auth.js";
import {
  formatFirebaseDate,
  formatFollowers,
  initGenericDropdowns,
  initProductFilterDropdown,
  initCountryDropdown,
  initStatesDropdown
} from "./ui-helpers.js";

import {
  initProfileInfo,
  loadPersonalInfoData,
  loadShippingInfoData
} from "./profile-info.js";
import { initProfileMedia } from "./profile-media.js";
import { initBio } from "./bio.js";
import { initFavorites } from "../profile/favorites/favorites.js";
import { initPaymentMethods } from "./payment-methods.js";
import { initPayouts } from "./payouts.js";
import { initWallet, loadPaymentInfoData } from "./wallet.js";
import {
  initStatementsTax,
  loadStatements,
  loadTaxDocuments,
  loadYearFilters
} from "./statements-tax.js";
import { initReviews, loadReviewData } from "./reviews.js";



// ---------------------------------------------------------------------------
// Display-only profile header data (avatar, username, stats, join date)
// ---------------------------------------------------------------------------

function loadProfileDisplayData(userData) {
  console.log("loading with userdata:", userData)
  if (userData.backgroundImage) {
    const profileBackground = document.querySelector(".profile-background");
    profileBackground.style.backgroundImage = `url('${userData.backgroundImage}')`;
  }

  document.querySelector("#profile-picture").src = userData.profileImage;
  document.querySelector("#username").textContent = `@${userData.username}`;

  document.querySelector(".timestamp").textContent = `Joined ${formatFirebaseDate(userData.accountInfo.joinedDate)}`;

  document.querySelector("#verified-tag").value = userData.isVerified;

  document.querySelector("#followers-count").textContent = formatFollowers(
    userData.stats.followers
  );
  document.querySelector("#following-count").textContent = formatFollowers(
    userData.stats.following
  );

  document.querySelector("#current-rating").textContent = userData.stats.rating;
}

// ---------------------------------------------------------------------------
// Not-yet-implemented sections (kept as stubs, same as the original)
// ---------------------------------------------------------------------------

async function loadSellingData(userData) {
  if (userData) {
    // load selling info
  }
}

async function loadNotificationData(userData) {
  if (userData) {
    // load user notification settings
  }
}

async function loadPurchasesData(userData) {
  if (userData) {
    // load purchase history
  }
}

async function loadSettingsData(userData) {
  if (userData) {
    // load account settings
  }
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

async function loadProfileData() {
  console.log("loading");
  try {
    const userData = await checkUserStatus();
    console.log("Profile Data:", userData)
    const currentYear = new Date().getFullYear();

    if (userData) {
      loadPersonalInfoData(userData);
      loadShippingInfoData(userData);
      loadProfileDisplayData(userData);
      loadReviewData(userData);
      await initFavorites(userData);
      loadNotificationData(userData);
      // await loadPaymentInfoData(userData);
      // await initPayouts(userData);
      await initPaymentMethods(userData);

      loadSellingData(userData);
      loadPurchasesData(userData);
      loadSettingsData(userData);

      // initStatementsTax(userData);
      // await loadYearFilters(userData);
      // loadStatements(userData, currentYear);
      // loadTaxDocuments(userData, currentYear);
    }
  } catch (error) {
    console.error("Error happened when loading userData from auth.js", error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------


  // Static UI wiring that doesn't depend on fetched profile data
  initGenericDropdowns();
  initProductFilterDropdown();
  initStatesDropdown();
  initCountryDropdown();
  initProfileInfo();
  initProfileMedia();
  initBio();
  initReviews();
  // initWallet();
  // Fetch the user's profile and populate everything else
  loadProfileData();