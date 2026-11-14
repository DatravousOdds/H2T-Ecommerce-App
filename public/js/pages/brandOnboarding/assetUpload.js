"use strict";

// The three brand image slots on /brand-onboarding, shown while an
// application is approved_awaiting_assets. Each image goes straight to
// Storage at upcomingBrands/{uid}/{kind}; the Submit button then asks
// POST /api/brand-onboarding/assets to check all three server-side.

import { app, auth, getStorage, ref, uploadBytes } from "../../api/firebase-client.js";

// Same bucket as every other browser upload (seller.js, profile-media.js),
// and the one server.js's brandAssetsBucket checks.
const storage = getStorage(app, "gs://ecom-website-94d87");

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

const container = document.getElementById("assetUpload");
const submitButton = document.getElementById("assetSubmitButton");
const errorEl = document.getElementById("assetError");
const slots = [...container.querySelectorAll(".brand-asset")];

// kind -> true once that slot has an image in Storage
let uploaded = {};
let inFlight = 0;
let onSubmitted = () => {};

function setSlotState(slot, text, tone = "") {
  const stateEl = slot.querySelector(".brand-asset__state");
  stateEl.textContent = text;
  stateEl.dataset.tone = tone;
}

function showPreview(slot, src) {
  const img = slot.querySelector("img");
  img.src = src;
  img.hidden = false;
  slot.querySelector(".brand-asset__empty").hidden = true;
}

function updateSubmitButton() {
  const allUploaded = slots.every((slot) => uploaded[slot.dataset.kind]);
  submitButton.disabled = !allUploaded || inFlight > 0;
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = !message;
}

// Same settings as the listing photos in seller.js. Falls back to the
// original file if compression fails, since the server still caps size.
async function compress(file) {
  try {
    return await window.imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });
  } catch (error) {
    console.error(`Failed to compress "${file.name}", using original:`, error);
    return file;
  }
}

async function handleFile(slot, file) {
  const kind = slot.dataset.kind;
  showError("");

  if (!ACCEPTED_TYPES.includes(file.type)) {
    setSlotState(slot, "Use a JPG, PNG, or WebP image.", "error");
    return;
  }

  inFlight += 1;
  updateSubmitButton();
  setSlotState(slot, "Uploading...");

  try {
    const upload = await compress(file);
    if (upload.size > MAX_BYTES) {
      setSlotState(slot, "This image is over 5 MB. Try a smaller one.", "error");
      return;
    }

    // Fixed path per kind: uploading again replaces the old image
    const storageRef = ref(storage, `upcomingBrands/${auth.currentUser.uid}/${kind}`);
    await uploadBytes(storageRef, upload, { contentType: upload.type || file.type });

    uploaded[kind] = true;
    showPreview(slot, URL.createObjectURL(upload));
    setSlotState(slot, "Uploaded", "done");
  } catch (error) {
    console.error(`Failed to upload ${kind} image:`, error);
    setSlotState(slot, "Couldn't upload. Try again.", "error");
  } finally {
    inFlight -= 1;
    updateSubmitButton();
  }
}

async function submitAssets() {
  showError("");
  submitButton.disabled = true;
  const idleLabel = submitButton.textContent;
  submitButton.textContent = "Submitting...";

  try {
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch("/api/brand-onboarding/assets", {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const result = await response.json();

    // 409: the status changed elsewhere; the caller reloads the real one
    if (response.ok || response.status === 409) {
      await onSubmitted();
      return;
    }
    throw new Error(result.message || "We couldn't submit your images. Please try again.");
  } catch (error) {
    showError(error.message);
  } finally {
    submitButton.textContent = idleLabel;
    updateSubmitButton();
  }
}

slots.forEach((slot) => {
  slot.querySelector("input[type=file]").addEventListener("change", (event) => {
    const file = event.target.files[0];
    event.target.value = ""; // so picking the same file again still fires change
    if (file) handleFile(slot, file);
  });
});
submitButton.addEventListener("click", submitAssets);

// existingAssets: { card, logo, cover } URLs already on file (after an admin
// asks for changes), or null. onDone runs after a successful submit.
export function showAssetUpload(existingAssets, onDone) {
  uploaded = {};
  onSubmitted = onDone;
  showError("");

  slots.forEach((slot) => {
    const url = existingAssets?.[slot.dataset.kind];
    if (url) {
      uploaded[slot.dataset.kind] = true;
      showPreview(slot, url);
      setSlotState(slot, "On file. Upload again to replace it.", "done");
    }
  });

  container.hidden = false;
  updateSubmitButton();
}

export function hideAssetUpload() {
  container.hidden = true;
}
