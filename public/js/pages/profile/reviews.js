"use strict";

import { notification, formatTimestamp } from "./ui-helpers.js";

// ---------------------------------------------------------------------------
// Data load
// ---------------------------------------------------------------------------

export function loadReviewData(userData) {
  document.querySelector("#average-rating").textContent =
    userData.ratings.metrics.averageRating;
  document.querySelector("#total-ratings").textContent =
    userData.ratings.metrics.totalRatings;

  for (let i = 1; i <= 5; i++) {
    const element = document.querySelector(`#rating-count-${i}`);
    if (element) {
      const ratingCount = userData.ratings.ratingCounts[i] || 0;
      const reviewText = ratingCount === 1 ? "review" : "reviews";
      element.textContent = `${ratingCount} ${reviewText}`;
    }
  }
}

// ---------------------------------------------------------------------------
// Reply count / templates
// ---------------------------------------------------------------------------

function updatedReplyCount(reviewCard) {
  // Skip counting if this is a reply-card
  if (reviewCard.classList.contains("reply-card")) return;

  const repliesContainer = reviewCard.querySelector(".review-replies");
  if (!repliesContainer) return;

  const directReplies = repliesContainer.children.length;
  const nestedReplies = repliesContainer.querySelectorAll(
    ".reply-card .review-replies article"
  ).length;

  const totalReplies = directReplies + nestedReplies;

  const viewAllRepliesBtn = reviewCard.querySelector(".view-all-replies");
  const hideRepliesBtn = reviewCard.querySelector(".hide-replies");

  if (totalReplies > 0) {
    viewAllRepliesBtn?.classList.remove("hidden");
    if (viewAllRepliesBtn) {
      const replyText = totalReplies === 1 ? "reply" : "replies";
      viewAllRepliesBtn.innerHTML = `View all ${replyText} (${totalReplies})`;
    }

    hideRepliesBtn?.classList.add("hidden");
    repliesContainer.classList.add("hidden");
  } else {
    viewAllRepliesBtn?.classList.add("hidden");
    hideRepliesBtn?.classList.add("hidden");
  }
}

const REPLY_CARD_TEMPLATE = (pfp, username, replyText, timestamp) => `
<article class="review-card reply-card">
  <header class="user-review">
    <div class="user-info">
      <div class="user-image-wrapper">
        <img
          class="user-review-img"
          src="${pfp}"
          alt="user-image"
          width="50"
          height="50"
        />
      </div>
      <div class="username-and-rating">
        <div class="username-wrapper">
          <h3 class="username">${username}</h3>
          <span class="seller-badge">Seller</span>
        </div>
      </div>
    </div>
    <div class="reply-actions">
      <time class="rating-timestamp" datetime="${timestamp}">
        ${formatTimestamp(timestamp)}
      </time>
    <div class="reply-dropdown-btn">
      <button class="reply-dropdown-btn">
        <i class="fa-solid fa-ellipsis"></i>
      </button>
      <div class="reply-dropdown-content hidden">
        <button class="edit-reply-btn">
          <i class="fa-solid fa-pen"></i>
          Edit Reply
        </button>
        <button class="delete-reply-btn">
          <i class="fa-solid fa-trash"></i>
          Delete Reply
        </button>
      </div>
    </div>
    </div>
  </header>
  <p class="review-details">
    ${replyText}
  </p>
  <div class="edit-form-wrapper hidden">
    <form class="edit-form">
      <textarea>${replyText}</textarea>
      <div class="edit-btn-wrapper">
        <button type="button" class="cancel-edit">Cancel</button>
        <button type="submit">Save</button>
      </div>
    </form>
  </div>
</article>
`;

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

export function initReviews() {
  const reviewModal = document.getElementById("reviews-modal");
  const seeAllReviewsBtn = document.getElementById("see-all-reviews");
  const closeReviewModal = document.querySelector(".review-close");
  const reviewCards = document.querySelectorAll(".review-card");

  reviewCards.forEach((reviewCard) => {
    if (!reviewCard.classList.contains("reply-card")) {
      updatedReplyCount(reviewCard);
    }
  });

  seeAllReviewsBtn?.addEventListener("click", () => {
    reviewModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  });

  closeReviewModal?.addEventListener("click", () => {
    reviewModal.style.display = "none";
    document.body.style.overflow = "auto";
  });

  const viewAllRepliesBtn = document.querySelectorAll(".view-all-replies");
  const hideRepliesBtn = document.querySelectorAll(".hide-replies");
  const likeBtn = document.querySelectorAll(".like-btn");

  viewAllRepliesBtn.forEach((btn) => {
    btn.addEventListener("click", () => {
      const reviewCard = btn.closest(".review-card");
      const replies = reviewCard.querySelector(".review-replies");

      replies.classList.remove("hidden");
      replies.classList.add("animate-slide-down");

      btn.classList.add("hidden");

      const hideBtn = reviewCard.querySelector(".hide-replies");
      hideBtn.classList.remove("hidden");
    });
  });

  hideRepliesBtn.forEach((btn) => {
    btn.addEventListener("click", () => {
      const reviewCard = btn.closest(".review-card");
      const replies = reviewCard.querySelector(".review-replies");

      replies.classList.add("animate-slide-up");
      btn.classList.add("hidden");
      replies.classList.add("hidden");

      const viewAllBtn = reviewCard.querySelector(".view-all-replies");
      viewAllBtn.classList.remove("hidden");
    });
  });

  likeBtn.forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      // TODO: send like to server
    });
  });

  initReplyHandlers();
}

function initReplyHandlers() {
  const replyBtn = document.querySelectorAll(".reply-btn");
  const cancelReplyBtn = document.querySelectorAll(".cancel-reply");
  const submitReplyBtn = document.querySelectorAll(".reply-btn");

  replyBtn.forEach((btn) => {
    btn.addEventListener("click", () => {
      const reviewCard = btn.closest(".review-card");
      // Don't allow replies if there's already a seller response
      if (reviewCard.querySelector(".reply-card")) {
        return;
      }

      const replyFormWrapper = reviewCard.querySelector(".reply-form-wrapper");
      replyFormWrapper?.classList.add("active");
    });
  });

  cancelReplyBtn.forEach((btn) => {
    btn.addEventListener("click", () => {
      const replyFormWrapper = btn.closest(".reply-form-wrapper");
      replyFormWrapper.classList.remove("active");
    });
  });

  submitReplyBtn.forEach((btn) => {
    const replyFormWrapper = btn.closest(".reply-form-wrapper");
    const replyForm = replyFormWrapper?.querySelector(".reply-form");
    const reviewCard = btn.closest(".review-card");

    if (!replyForm) {
      console.error("No reply form found");
      return;
    }

    replyForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const textarea = replyForm.querySelector("textarea");
      const replyText = textarea.value.trim();

      if (!replyText) {
        notification.error("Please enter a reply");
        return;
      }

      const currentUser = {
        pfp: reviewCard.querySelector(".user-review-img").src,
        username: reviewCard.querySelector(".username-wrapper").textContent
      };

      const formData = {
        pfp: currentUser.pfp,
        username: currentUser.username,
        text: replyText,
        timestamp: new Date().toISOString()
      };

      let repliesContainer = reviewCard.querySelector(".review-replies");
      if (!repliesContainer) {
        repliesContainer = document.createElement("div");
        repliesContainer.classList.add("review-replies");
        reviewCard.appendChild(repliesContainer);
      }

      const newReplyCard = REPLY_CARD_TEMPLATE(
        formData.pfp,
        formData.username,
        formData.text,
        formData.timestamp
      );

      repliesContainer.insertAdjacentHTML("beforeend", newReplyCard);
      updatedReplyCount(reviewCard);

      wireUpReplyCard(repliesContainer.lastElementChild, reviewCard);

      textarea.value = "";
      replyFormWrapper.classList.remove("active");

      // TODO: send reply to server
      notification.success("Reply submitted", "reply");
    });
  });

  // Close any open reply dropdown when clicking outside of it
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".reply-dropdown-btn")) {
      document
        .querySelectorAll(".reply-dropdown-content")
        .forEach((dropdown) => {
          dropdown.classList.add("hidden");
        });
    }
  });
}

function wireUpReplyCard(replyCard, reviewCard) {
  const replyDropdownBtn = replyCard.querySelector(".reply-dropdown-btn");
  const replyDropdownContent = replyCard.querySelector(
    ".reply-dropdown-content"
  );
  const editReplyBtn = replyCard.querySelector(".edit-reply-btn");
  const deleteReplyBtn = replyCard.querySelector(".delete-reply-btn");
  const editFormWrapper = replyCard.querySelector(".edit-form-wrapper");
  const replyCancelEditBtn = replyCard.querySelector(".cancel-edit");
  const editForm = replyCard.querySelector(".edit-form");
  const replyTxt = replyCard.querySelector(".review-details");

  replyDropdownBtn.addEventListener("click", () => {
    replyDropdownContent.classList.toggle("hidden");
  });

  editReplyBtn.addEventListener("click", () => {
    replyDropdownContent.classList.add("hidden");
    editFormWrapper.classList.remove("hidden");
    replyTxt.classList.add("hidden");
  });

  deleteReplyBtn.addEventListener("click", () => {
    replyCard.remove();
    updatedReplyCount(reviewCard);
  });

  replyCancelEditBtn.addEventListener("click", () => {
    editFormWrapper.classList.add("hidden");
    replyTxt.classList.remove("hidden");
  });

  editForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const editTextarea = editForm.querySelector("textarea");
    if (!editTextarea) {
      console.error("No edit textarea found");
      return;
    }

    replyTxt.textContent = editTextarea.value;

    editFormWrapper.classList.add("hidden");
    replyTxt.classList.remove("hidden");
    replyDropdownContent.classList.add("hidden");
  });
}
