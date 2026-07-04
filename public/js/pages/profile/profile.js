"use strict";

import { checkUserStatus, logout } from "../../auth/auth.js";
import { initCartDrawer } from "../../components/cartDrawer.js";
import {
  formatFirebaseDate,
  formatFollowers,
  initGenericDropdowns,
  initProductFilterDropdown,
  initCountryDropdown,
  initStatesDropdown
} from "./ui-helpers.js";

import { showLoader, hideLoader } from "../../components/pageLoader.js";  

import {
  initProfileInfo,
  loadPersonalInfoData,
  loadShippingInfoData
} from "./profile-info.js";
import { initProfileMedia } from "./profile-media.js";
import { initBio } from "./bio.js";
import { initFavorites } from "../profile/favorites/favorites.js";
import { initPurchases } from "../profile/purchases/purchases.js"
import { initNotifications } from "../profile/notifications/notifications.js";
import { initSettings } from "../profile/settings/settings.js";
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

  // Existing accounts predate `accountInfo`, so guard against it being
  // missing rather than throwing and aborting the rest of this function
  // (which is what shows followers/following/rating below).
  if (userData.accountInfo?.joinedDate) {
    document.querySelector(".timestamp").textContent =
      `Joined ${formatFirebaseDate(userData.accountInfo.joinedDate)}`;
  }

  // Verified badge = trusted seller. `.value` doesn't exist on a <div>, so this
  // never actually showed/hid anything before - toggle visibility instead.
  document.querySelector("#verified-tag").style.display = userData.isVerified
    ? ""
    : "none";

  const stats = userData.stats || {};
  document.querySelector("#followers-count").textContent = formatFollowers(
    stats.followers || 0
  );
  document.querySelector("#following-count").textContent = formatFollowers(
    stats.following || 0
  );

  // No ratings yet -> hide the "Rating" stat instead of showing a fake 0/5.
  const totalRatings = userData.ratings?.metrics?.totalRatings || 0;
  const ratingStat = document.querySelector("#rating");
  if (totalRatings > 0) {
    ratingStat.style.display = "";
    document.querySelector("#current-rating").textContent = stats.rating;
  } else {
    ratingStat.style.display = "none";
  }
}

// ---------------------------------------------------------------------------
// Not-yet-implemented sections (kept as stubs, same as the original)
// ---------------------------------------------------------------------------

async function loadSellingData(userData) {
  if (userData) {
    // load selling info
  }
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

async function loadProfileData() {
  const profileDataSection = document.getElementById("profile-data");
  const shippingDataSection = document.getElementById("shipping-data");
  profileDataSection?.classList.add("is-loading");
  shippingDataSection?.classList.add("is-loading");

  try {
    const userData = await checkUserStatus();
    console.log("Profile Data:", userData)
    const currentYear = new Date().getFullYear();

    if (userData) {
      loadPersonalInfoData(userData);
      loadShippingInfoData(userData);
      profileDataSection?.classList.remove("is-loading");
      shippingDataSection?.classList.remove("is-loading");
      loadProfileDisplayData(userData);
      loadReviewData(userData);
      await initFavorites(userData);
      await initNotifications(userData);
      await initPurchases(userData);
      // await loadPaymentInfoData(userData);
      // await initPayouts(userData);
      await initPaymentMethods(userData);

      loadSellingData(userData);
      await initSettings(userData);

      // initStatementsTax(userData);
      // await loadYearFilters(userData);
      // loadStatements(userData, currentYear);
      // loadTaxDocuments(userData, currentYear);
    }
  } catch (error) {
    console.error("Error happened when loading userData from auth.js", error);
    throw error;
  } finally {
    profileDataSection?.classList.remove("is-loading");
    shippingDataSection?.classList.remove("is-loading");
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function wireLogout() {
  const logoutBtn = document.getElementById("logout-btn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });
}

  // Static UI wiring that doesn't depend on fetched profile data
  initGenericDropdowns();
  initProductFilterDropdown();
  initStatesDropdown();
  initCountryDropdown();
  initProfileInfo();
  initProfileMedia();
  initBio();
  initReviews();
  wireLogout();
  initCartDrawer();

  // initWallet();
  // Fetch the user's profile and populate everything else
  loadProfileData();