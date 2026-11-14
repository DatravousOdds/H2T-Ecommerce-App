"use strict";

import { db, doc, updateDoc, ref, getStorage, app, uploadBytes, getDownloadURL } from "../../api/firebase-client.js";
import { checkUserStatus, updateCachedUser } from "../../auth/auth.js";

const USER = await checkUserStatus();
const storage = getStorage(app, 'gs://ecom-website-94d87');

// ---------------------------------------------------------------------------
// Database writes
// ---------------------------------------------------------------------------




export const updateProfilePicture = async (userId, file) => {
  try {
    const storageRef = ref(
      storage,
      `profile-pictures/${userId}/${Date.now()}-${file.name}`
    );
    await uploadBytes(storageRef, file);
    const imageUrl = await getDownloadURL(storageRef);
 
    const userDocRef = doc(db, "userProfiles", userId);
    await updateDoc(userDocRef, {
      profileImage: imageUrl,
      lastUpdated: new Date()
    });
    updateCachedUser({ profileImage: imageUrl });

    console.log("Image update success!")
  } catch (error) {
    console.error("Was not able to upload profile image:", error)
  }
};

// Banners render as a ~1300x220 strip (and show to every visitor of the
// seller's public profile), but uploads arrive as full-size phone photos --
// one measured at 4.9 MB / 4284x5712. 2560px on the longest side stays sharp
// on a 2x screen at that width.
const BANNER_MAX_DIMENSION = 2560;

export async function shrinkBannerImage(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, BANNER_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  // JPEG has no alpha; without this, transparent PNG areas would turn black.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("Canvas could not encode the banner");
  // An already-small, well-compressed upload can come out bigger re-encoded.
  return blob.size < file.size ? blob : file;
}

export const updateBackgroundPicture = async (userId, file) => {
  try {
    const storageRef = ref(
      storage,
      `background-pictures/${userId}/${Date.now()}-${file.name}`
    );
    // A resize problem (e.g. a format this browser can't decode) must never
    // block the banner change itself, so fall back to the original file.
    const upload = await shrinkBannerImage(file).catch((error) => {
      console.error("Banner resize failed, uploading original:", error);
      return file;
    });
    await uploadBytes(storageRef, upload);
    const imageUrl = await getDownloadURL(storageRef);
 
    const userDocRef = doc(db, "userProfiles", userId);
    await updateDoc(userDocRef, {
      backgroundImage: imageUrl,
      lastUpdated: new Date()
    });
    updateCachedUser({ backgroundImage: imageUrl });

    console.log("Background Image update successfully!")
  } catch (error) {
    console.error("Was not able to upload profile image:", error)
  }
}

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
      updateProfilePicture(USER.userId,file)
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
    "uploadBackgroundBtn"
  );
  console.log("uploadButton", uploadBackgroundBtn)
  const removeBackgroundBtn = document.getElementById(
    "remove-background-btn"
  );
  const backgroundElement = document.querySelector(".profile-background");
  const backgroundInput = document.getElementById("background-input");

  if (!uploadBackgroundBtn || !backgroundElement || !backgroundInput) return;

  uploadBackgroundBtn.addEventListener("click", () => {
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
    updateBackgroundPicture(USER.userId, file)

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
