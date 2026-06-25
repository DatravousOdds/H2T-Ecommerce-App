"use strict";

import { db, doc, updateDoc } from "../../api/firebase-client.js";

// ---------------------------------------------------------------------------
// Database writes
// ---------------------------------------------------------------------------

export const updateProfilePicture = async (email, imageUrl) => {
  try {
    // First upload to S3 (will implement this later)

    // Then update profile
    const userDocRef = doc(db, "userProfiles", email);
    await updateDoc(userDocRef, {
      profileImage: imageUrl,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error("Error updating profile picture:", error);
  }
};

// ---------------------------------------------------------------------------
// Wiring: profile picture + background image upload/remove
// ---------------------------------------------------------------------------

export function initProfileMedia() {
  initProfilePictureUpload();
  initBackgroundImageUpload();
}

function initProfilePictureUpload() {
  const fileInput = document.getElementById("file-input");
  const uploadBtn = document.getElementById("upload-btn");
  const profilePicture = document.getElementById("profile-picture");
  const removeBtn = document.getElementById("remove-btn");
  const feedback = document.getElementById("feedback");
  const maxFileSize = 2 * 1024 * 1024; // 2 MB in bytes

  if (!fileInput || !uploadBtn || !profilePicture) return;

  uploadBtn.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0]; // Grabs the first img from the list

    if (feedback) feedback.textContent = "";

    const reader = new FileReader();
    reader.onload = function (event) {
      profilePicture.src = event.target.result;
    };

    if (file) {
      const validImageTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!validImageTypes.includes(file.type)) {
        const err = new Error("File format error!");

        if (feedback) {
          feedback.innerHTML = "";

          const errIcon = document.createElement("i");
          errIcon.classList.add("fa-solid", "fa-circle-exclamation", "error");
          feedback.appendChild(errIcon);

          const errorMessage = document.createTextNode(`${err.message}`);
          feedback.appendChild(errorMessage);

          feedback.classList.add("error");
        }

        return;
      }

      if (file.size > maxFileSize) {
        if (feedback) {
          const errIcon = document.createElement("i");
          errIcon.classList.add("fa-solid", "fa-circle-exclamation", "error");
          feedback.appendChild(errIcon);

          const err = new Error(`File too big ${maxFileSize.toFixed(2)} MB`);
          const errorMessage = document.createTextNode(`${err.message}`);
          feedback.appendChild(errorMessage);

          feedback.classList.add("error");
        }
        return;
      }

      reader.readAsDataURL(file);
    }

    fileInput.value = "";
  });

  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      profilePicture.src = "/images/default-avatar.svg";
      // Reset the file input to allow uploading the same image again
      fileInput.value = "";
    });
  }
}

function initBackgroundImageUpload() {
  const uploadBackgroundBtn = document.getElementById(
    "upload-background-btn"
  );
  const removeBackgroundBtn = document.getElementById(
    "remove-background-btn"
  );
  const backgroundElement = document.querySelector(".profile-background");
  const backgroundInput = document.getElementById("background-input");

  if (!uploadBackgroundBtn || !backgroundElement || !backgroundInput) return;

  uploadBackgroundBtn.addEventListener("click", () => {
    console.log("Uploading background image...");
    backgroundInput.click();
  });

  if (removeBackgroundBtn) {
    removeBackgroundBtn.addEventListener("click", () => {
      handleBackgroundRemove();
    });
  }

  backgroundInput.addEventListener("change", (e) => {
    console.log("Uploading background image...");
    const file = e.target.files[0];
    if (file) {
      handleBackgroundUpload(file);
    }
    // Reset the file input value so the same file can be selected again
    backgroundInput.value = "";
  });

  function handleBackgroundUpload(file) {
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      console.error("Invalid file type");
      return;
    }

    if (file.size > maxFileSize) {
      console.error("File too large");
      return;
    }

    const reader = new FileReader();

    reader.onload = function (event) {
      const imageUrl = `url("${event.target.result}")`;
      backgroundElement.style.backgroundImage = imageUrl;
    };

    reader.readAsDataURL(file);

    if (removeBackgroundBtn) removeBackgroundBtn.style.display = "inline";
    uploadBackgroundBtn.style.display = "none";
  }

  function handleBackgroundRemove() {
    backgroundElement.style.backgroundImage = "none";
    backgroundInput.value = "";
    if (removeBackgroundBtn) removeBackgroundBtn.style.display = "none";
    uploadBackgroundBtn.style.display = "inline";
  }
}
