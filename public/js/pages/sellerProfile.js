"use strict";

import { collection, db, getDocs, query, where } from "../api/firebase-client.js";
import { checkUserStatus } from "../auth/auth.js";
import { getUserProfile, renderRatingStars } from "../core/global.js";
import { initCartDrawer } from "../components/cartDrawer.js";
import { isFollowing, toggleFollow } from "../services/follow.js";
import { formatFollowers, createWebsiteLinkAnchor } from "./profile/ui-helpers.js";

/**
 * Real listing shape (same schema documented in
 * profile/selling/products/products.js, written by seller.js):
 *   { userId, productName, listingPrice, originalPrice, status, brand,
 *     condition, size, category, categoryMeta, description,
 *     availableForTrade, createdAt, listingId,
 *     images: [{ url, path, isPrimary, index }] }
 */

function firstImageUrl(listing) {
  return listing.images && listing.images[0] && listing.images[0].url
    ? listing.images[0].url
    : "/images/HypebeastBG.jpeg";
}

// Listing fields are seller-typed text going into innerHTML below.
function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function listingTile(listing) {
  // Same rule as displayProducts's card meta (core/global.js): collectibles'
  // "size" field holds the sub-type (e.g. "Trading Cards"), not a wearable
  // size, so those tiles show nothing extra here -- brand already leads.
  const isCollectibles = listing.category === "collectibles";
  const sizeText = !isCollectibles && listing.size ? `Size ${escapeHtml(listing.size)}` : "";
  const name = escapeHtml(listing.productName || "Listing");

  // Free shipping is stated once in the section heading (sellerProfile.html)
  // rather than repeated on every tile.
  return `
    <a class="seller-listing-tile" href="/shop/product.html?id=${listing.id}">
      <div class="seller-listing-media">
        <img src="${firstImageUrl(listing)}" alt="${name}" loading="lazy" />
      </div>
      <div class="seller-listing-info">
        ${listing.brand ? `<span class="seller-listing-brand">${escapeHtml(listing.brand)}</span>` : ""}
        <span class="seller-listing-name">${name}</span>
        <div class="seller-listing-meta">
          <span class="seller-listing-price">$${Number(listing.listingPrice || 0).toFixed(2)}</span>
          ${sizeText ? `<span class="seller-listing-size">${sizeText}</span>` : ""}
        </div>
      </div>
    </a>
  `;
}

function renderListingsGrid(listings, containerEl) {
  if (!containerEl) return;

  if (listings.length === 0) {
    containerEl.innerHTML = `
      <div class="seller-listings-state">
        <i class="fa-solid fa-box-open" aria-hidden="true"></i>
        <h3>No active listings</h3>
        <p>This seller doesn't have anything for sale right now. Follow them to see new drops.</p>
      </div>
    `;
    return;
  }

  containerEl.innerHTML = listings.map(listingTile).join("");
}

// Same query shape as fetchSellerListings in profile/selling/products/products.js,
// narrowed to "active" -- this is a public page, so drafts/sold/out-of-stock
// listings shouldn't show up in someone else's grid.
async function fetchActiveListings(sellerId) {
  const listingsRef = collection(db, "listings");
  const q = query(
    listingsRef,
    where("userId", "==", sellerId),
    where("status", "==", "active")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

// Mirrors listingTile's shape (image + brand/name/price lines) so the grid
// doesn't reflow when real tiles swap in.
function renderListingSkeletons(containerEl, count = 8) {
  if (!containerEl) return;
  containerEl.innerHTML = Array.from({ length: count }, () => `
    <div class="seller-listing-tile skeleton-item" aria-hidden="true">
      <div class="seller-listing-media"><div class="skeleton skeleton-image"></div></div>
      <div class="seller-listing-info">
        <span class="skeleton skeleton-line short"></span>
        <span class="skeleton skeleton-line long"></span>
        <span class="skeleton skeleton-line short"></span>
      </div>
    </div>
  `).join("");
}

async function loadSellerListings(sellerId, containerEl) {
  if (!sellerId) {
    console.error("loadSellerListings: no sellerId provided");
    return;
  }

  renderListingSkeletons(containerEl);

  const listingsCountEl = document.getElementById("seller-listings-count");

  try {
    const listings = await fetchActiveListings(sellerId);
    renderListingsGrid(listings, containerEl);
    if (listingsCountEl) listingsCountEl.textContent = listings.length;
  } catch (error) {
    console.error("Error loading seller listings:", error);
    // Without this the skeletons above shimmer forever, which reads as
    // "still loading" rather than "failed".
    if (containerEl) {
      containerEl.innerHTML = `
        <div class="seller-listings-state" role="alert">
          <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
          <h3>Couldn't load listings</h3>
          <p>Check your connection and refresh the page to try again.</p>
        </div>
      `;
    }
  }
}

// ---------------------------------------------------------------------------
// Header (avatar + @username + verified badge + rating)
// ---------------------------------------------------------------------------

function renderSellerHeader(sellerProfile) {
  const avatarEl = document.getElementById("seller-picture");
  const usernameEl = document.getElementById("seller-username");
  const verifiedTagEl = document.getElementById("verified-tag");
  const trustedTagEl = document.getElementById("trusted-tag");
  const ratingStatEl = document.getElementById("seller-rating-stat");
  const ratingStarsEl = document.getElementById("seller-rating-stars");
  const ratingEl = document.getElementById("seller-rating");
  const followersCountEl = document.getElementById("seller-followers-count");
  const followingCountEl = document.getElementById("seller-following-count");

  const bannerEl = document.getElementById("seller-banner");
  const bioEl = document.getElementById("seller-bio");
  const soldCountEl = document.getElementById("seller-sold-count");

  if (avatarEl) {
    avatarEl.src = sellerProfile?.profileImage || "/images/default-avatar.svg";
    avatarEl.alt = sellerProfile?.username ? `${sellerProfile.username}'s profile picture` : "";
  }
  if (usernameEl) {
    usernameEl.textContent = sellerProfile?.username ? `@${sellerProfile.username}` : "@unknown";
  }

  // Banner + bio only render when the profile carries them; otherwise the
  // banner keeps its CSS gradient and the bio stays hidden. Both are a
  // seller's own public-facing content, set from their account page
  // (profile-media.js / bio.js).
  if (bannerEl && sellerProfile?.backgroundImage) {
    // Not encodeURI -- Storage download URLs already contain %2F, which it
    // would double-encode. Only a stray quote could break out of url("").
    bannerEl.style.backgroundImage = `url("${sellerProfile.backgroundImage.replace(/"/g, "%22")}")`;
    bannerEl.classList.add("has-image");
  }
  if (bioEl && sellerProfile?.bio) {
    bioEl.textContent = sellerProfile.bio;
    bioEl.hidden = false;
  }
  if (soldCountEl) {
    soldCountEl.textContent = formatFollowers(sellerProfile?.salesCount || 0);
  }
  if (verifiedTagEl) {
    verifiedTagEl.style.display = sellerProfile?.isVerifiedSeller ? "" : "none";
  }
  if (trustedTagEl) {
    trustedTagEl.style.display = sellerProfile?.isTrustedSeller ? "" : "none";
  }

  // Same "hide instead of showing a fake 0/5" gate as profile.js's own
  // loadProfileDisplayData -- only render the rating stat once it exists.
  const totalRatings = sellerProfile?.ratings?.metrics?.totalRatings || 0;
  if (ratingStatEl && ratingEl) {
    if (totalRatings > 0) {
      ratingStatEl.style.display = "";
      if (ratingStarsEl) {
        ratingStarsEl.innerHTML = renderRatingStars(sellerProfile.stats?.rating || 0);
      }
      ratingEl.textContent = sellerProfile.stats?.rating;
    } else {
      ratingStatEl.style.display = "none";
    }
  }

  const stats = sellerProfile?.stats || {};
  if (followersCountEl) {
    followersCountEl.textContent = formatFollowers(stats.followers || 0);
  }
  if (followingCountEl) {
    followingCountEl.textContent = formatFollowers(stats.following || 0);
  }
}

// getUserProfile returns {} for a 404 (bad/deleted id) and for a failed
// request alike, so the copy covers both. Swaps the whole page body for a
// clear dead end instead of an "@unknown" profile with a live Follow button.
function renderSellerNotFound() {
  const headerEl = document.querySelector(".seller-header");
  const listingsSectionEl = document.getElementById("seller-listings-section");
  const notFoundEl = document.getElementById("seller-not-found");

  if (headerEl) headerEl.hidden = true;
  if (listingsSectionEl) listingsSectionEl.hidden = true;
  if (notFoundEl) notFoundEl.hidden = false;
}

function renderSellerWebsiteLinks(sellerProfile) {
  const containerEl = document.getElementById("seller-website-links");
  if (!containerEl) return;

  const links = sellerProfile?.websiteLinks || [];
  if (links.length === 0) {
    containerEl.style.display = "none";
    return;
  }

  containerEl.innerHTML = "";
  links.forEach(({ url, title }) => {
    containerEl.appendChild(createWebsiteLinkAnchor(url, title));
  });
  containerEl.style.display = "flex";
}

// ---------------------------------------------------------------------------
// Follow button
//
// Deliberately NOT the same optimistic-toggle-then-rollback pattern used for
// favorite hearts (core/global.js handleFavoriteClick). toggleFollow() does
// its own fresh read before deciding follow-vs-unfollow, so guessing the
// outcome client-side and flipping the button first can end up mismatched
// with what actually got written (e.g. stale state from a second tab).
// Disabling the button and setting state from toggleFollow's return value
// costs one round trip but is guaranteed correct.
// ---------------------------------------------------------------------------

// While following, the button swaps "Following" for "Unfollow" on
// hover/focus (CSS) so it's clear what a click will do. Only one label is
// ever displayed, so the accessible name stays a single word.
function setFollowButtonState(buttonEl, isFollowingNow) {
  buttonEl.innerHTML = isFollowingNow
    ? `<span class="follow-label">Following</span><span class="unfollow-label">Unfollow</span>`
    : "Follow";
  buttonEl.classList.toggle("is-following", isFollowingNow);
  buttonEl.setAttribute("aria-pressed", String(isFollowingNow));
}

// Clears the HTML's initial placeholder state once the real follow state
// has been rendered.
function markFollowButtonReady(buttonEl) {
  buttonEl.classList.remove("is-pending");
  buttonEl.removeAttribute("aria-busy");
  buttonEl.disabled = false;
}

function wireFollowButton(buttonEl, currentUserId, sellerId, followersCountEl, initialFollowerCount) {
  if (!buttonEl) return;

  // Raw count, tracked separately from followersCountEl's formatted text
  // ("12.3k" can't be parsed back into a number to increment/decrement).
  let followerCount = initialFollowerCount;
  const errorEl = document.getElementById("follow-error");

  // Right after a toggle the pointer (or keyboard focus) is still on the
  // button, which would immediately swap the fresh "Following" for a red
  // "Unfollow". .just-toggled holds the swap off until the user moves away.
  const clearJustToggled = () => buttonEl.classList.remove("just-toggled");
  buttonEl.addEventListener("mouseleave", clearJustToggled);
  buttonEl.addEventListener("blur", clearJustToggled);

  buttonEl.addEventListener("click", async () => {
    if (!currentUserId) {
      window.location.href = "/login";
      return;
    }

    if (errorEl) errorEl.hidden = true;
    buttonEl.disabled = true;
    buttonEl.setAttribute("aria-busy", "true");
    try {
      const nowFollowing = await toggleFollow(currentUserId, sellerId);
      setFollowButtonState(buttonEl, nowFollowing);
      // Only while still hovered/focused -- if the pointer already left during
      // the request, mouseleave has fired and nothing would clear the class.
      if (buttonEl.matches(":hover, :focus")) {
        buttonEl.classList.add("just-toggled");
      }

      followerCount += nowFollowing ? 1 : -1;
      if (followersCountEl) {
        followersCountEl.textContent = formatFollowers(followerCount);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      if (errorEl) {
        errorEl.textContent = "Couldn't update follow. Please try again.";
        errorEl.hidden = false;
      }
    } finally {
      buttonEl.disabled = false;
      buttonEl.removeAttribute("aria-busy");
    }
  });
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function initSellerProfilePage() {
  const sellerId = new URLSearchParams(window.location.search).get("id");
  if (!sellerId) {
    console.error("No seller id in URL. Redirecting...");
    window.location.href = "/";
    return;
  }

  const listingsGrid = document.getElementById("seller-listings-grid");
  const followBtn = document.getElementById("follow-btn");
  const viewOffersLink = document.getElementById("view-offers-link");

  const [sellerProfile, currentUser] = await Promise.all([
    getUserProfile(sellerId),
    checkUserStatus(),
  ]);

  if (!sellerProfile?.username) {
    renderSellerNotFound();
  } else {
    renderSellerHeader(sellerProfile);
    renderSellerWebsiteLinks(sellerProfile);
  }
  await loadSellerListings(sellerId, listingsGrid);

  const isOwnProfile = currentUser?.userId === sellerId;

  // Only the seller themselves gets a link into their offers conversation --
  // a shopper viewing someone else's profile has no reason to see it here
  // (they land on their own thread via the "View offers" link after making
  // an offer instead, see product.js).
  if (viewOffersLink) {
    if (isOwnProfile) {
      viewOffersLink.href = `/sellerProfile/offers?id=${sellerId}`;
      viewOffersLink.style.display = "";
    } else {
      viewOffersLink.style.display = "none";
    }
  }

  if (followBtn) {
    // Following yourself isn't a real action -- hide the button rather than
    // wire it up and rely on follow.js's self-follow guard to silently no-op.
    if (isOwnProfile) {
      followBtn.style.display = "none";
    } else {
      if (currentUser?.userId) {
        const alreadyFollowing = await isFollowing(currentUser.userId, sellerId);
        setFollowButtonState(followBtn, alreadyFollowing);
      } else {
        setFollowButtonState(followBtn, false);
      }
      wireFollowButton(
        followBtn,
        currentUser?.userId,
        sellerId,
        document.getElementById("seller-followers-count"),
        sellerProfile?.stats?.followers || 0
      );
      markFollowButtonReady(followBtn);
    }
  }
}

initSellerProfilePage();
initCartDrawer();

export { fetchActiveListings, renderListingsGrid, loadSellerListings };
