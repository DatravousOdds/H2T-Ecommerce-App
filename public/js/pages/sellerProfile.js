"use strict";

import { collection, db, getDocs, query, where } from "../api/firebase-client.js";
import { checkUserStatus } from "../auth/auth.js";
import { getUserProfile } from "../core/global.js";
import { initCartDrawer } from "../components/cartDrawer.js";
import { isFollowing, toggleFollow } from "../services/follow.js";
import { formatFollowers } from "./profile/ui-helpers.js";

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

function listingTile(listing) {
  return `
    <a class="seller-listing-tile" href="/shop/product.html?id=${listing.id}">
      <img src="${firstImageUrl(listing)}" alt="${listing.productName || "Listing"}" loading="lazy" />
      <span class="seller-listing-price">$${Number(listing.listingPrice || 0).toFixed(2)}</span>
    </a>
  `;
}

function renderListingsGrid(listings, containerEl) {
  if (!containerEl) return;

  if (listings.length === 0) {
    containerEl.innerHTML = `<p class="default-paragraph seller-listings-empty">No active listings yet.</p>`;
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

// Mirrors listingTile's shape (image + price) so the grid doesn't reflow
// when real tiles swap in.
function renderListingSkeletons(containerEl, count = 8) {
  if (!containerEl) return;
  containerEl.innerHTML = Array.from({ length: count }, () => `
    <div class="seller-listing-tile skeleton-item">
      <div class="skeleton skeleton-image"></div>
      <span class="skeleton skeleton-line short"></span>
    </div>
  `).join("");
}

async function loadSellerListings(sellerId, containerEl) {
  if (!sellerId) {
    console.error("loadSellerListings: no sellerId provided");
    return;
  }

  renderListingSkeletons(containerEl);

  try {
    const listings = await fetchActiveListings(sellerId);
    renderListingsGrid(listings, containerEl);

    const listingsCountEl = document.getElementById("seller-listings-count");
    if (listingsCountEl) {
      listingsCountEl.textContent = listings.length;
    }
  } catch (error) {
    console.error("Error loading seller listings:", error);
  }
}

// ---------------------------------------------------------------------------
// Header (avatar + @username + verified badge + rating)
// ---------------------------------------------------------------------------

function renderSellerHeader(sellerProfile) {
  const avatarEl = document.getElementById("seller-picture");
  const usernameEl = document.getElementById("seller-username");
  const verifiedTagEl = document.getElementById("verified-tag");
  const ratingStatEl = document.getElementById("seller-rating-stat");
  const ratingEl = document.getElementById("seller-rating");
  const followersCountEl = document.getElementById("seller-followers-count");
  const followingCountEl = document.getElementById("seller-following-count");

  if (avatarEl) {
    avatarEl.src = sellerProfile?.profileImage || "/images/default-avatar.svg";
  }
  if (usernameEl) {
    usernameEl.textContent = sellerProfile?.username ? `@${sellerProfile.username}` : "@unknown";
  }
  if (verifiedTagEl) {
    verifiedTagEl.style.display = sellerProfile?.isVerified ? "" : "none";
  }

  // Same "hide instead of showing a fake 0/5" gate as profile.js's own
  // loadProfileDisplayData -- only render the rating stat once it exists.
  const totalRatings = sellerProfile?.ratings?.metrics?.totalRatings || 0;
  if (ratingStatEl && ratingEl) {
    if (totalRatings > 0) {
      ratingStatEl.style.display = "";
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

function setFollowButtonState(buttonEl, isFollowingNow) {
  buttonEl.textContent = isFollowingNow ? "Following" : "Follow";
  buttonEl.classList.toggle("is-following", isFollowingNow);
}

function wireFollowButton(buttonEl, currentUserId, sellerId, followersCountEl, initialFollowerCount) {
  if (!buttonEl) return;

  // Raw count, tracked separately from followersCountEl's formatted text
  // ("12.3k" can't be parsed back into a number to increment/decrement).
  let followerCount = initialFollowerCount;

  buttonEl.addEventListener("click", async () => {
    if (!currentUserId) {
      window.location.href = "/login";
      return;
    }

    buttonEl.disabled = true;
    try {
      const nowFollowing = await toggleFollow(currentUserId, sellerId);
      setFollowButtonState(buttonEl, nowFollowing);

      followerCount += nowFollowing ? 1 : -1;
      if (followersCountEl) {
        followersCountEl.textContent = formatFollowers(followerCount);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      buttonEl.disabled = false;
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

  renderSellerHeader(sellerProfile);
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
    }
  }
}

initSellerProfilePage();
initCartDrawer();

export { fetchActiveListings, renderListingsGrid, loadSellerListings };
