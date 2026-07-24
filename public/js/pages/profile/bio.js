"use strict";
import { checkUserStatus } from "../../auth/auth.js";
import { db, doc, updateDoc } from '../../api/firebase-client.js';
import { createWebsiteLinkAnchor } from "./ui-helpers.js";

const currentUser = await checkUserStatus();

async function updateBio(data, userId) {
  const userDocRef = doc(db, "userProfiles" ,userId)
  await updateDoc(userDocRef, {
    bio: data.bio,
    websiteLinks: data.websiteLinks,
    lastUpdated: new Date()
  })

  console.log("Bio has been updated successfully")

}

/**
 * Bio editing + website link section of the profile page.
 */
export function initBio() {
  const bioTextarea = document.getElementById("bio-value");
  const updateBioBtn = document.getElementById("update-bio-btn"); // Edit profile button
  const saveBioBtn = document.getElementById("save-bio-btn"); // Save changes button
  const pfpActions = document.getElementById("pfp-actions");
  const websiteLinks = document.getElementById("website-link-box");
  const wordCountDisplay = document.getElementById("word-count");
  const maxWords = 150;

  const url = document.getElementById("website");
  const title = document.getElementById("title");
  const websiteFeedback = document.getElementById("website-feedback");
  const titleFeedback = document.getElementById("title-feedback");
  const websiteUrlDisplay = document.getElementById("website-link-display");
  const webLinks = [];

  if (!bioTextarea || !updateBioBtn || !saveBioBtn || !url || !title) return;

  // Hide bio by default
  bioTextarea.style.display = "none";

  let currentBio = bioTextarea.value || "";
  let currentUrl = url.value || "";
  let currentUrlTitle = title.value || "";

  // Builds one saved-link row (icon + title + remove-in-edit-mode "x") and
  // appends it to the display list. Shared by the initial render below and
  // by the save handler, so a link looks identical whether it's freshly
  // added or was already on the profile from a previous visit.
  function renderWebsiteLink(linkUrl, linkTitle) {
    const div = document.createElement("div");
    div.classList.add("website-link-div");

    div.appendChild(createWebsiteLinkAnchor(linkUrl, linkTitle));

    const closeIcon = document.createElement("i");
    closeIcon.classList.add("fa-solid", "fa-xmark", "close-icon");
    closeIcon.style.display = "none";

    closeIcon.addEventListener("click", (e) => {
      e.preventDefault();
      div.remove();
    });

    div.append(closeIcon);
    websiteUrlDisplay.appendChild(div);
  }

  // Restore links saved on a previous visit -- currentUser (fetched at
  // module load, top of this file) already has them, so this doesn't need
  // a second round trip.
  (currentUser?.websiteLinks || []).forEach(({ url: linkUrl, title: linkTitle }) => {
    webLinks.push({ url: linkUrl, title: linkTitle });
    renderWebsiteLink(linkUrl, linkTitle);
  });
  if (webLinks.length > 0) {
    websiteUrlDisplay.style.display = "flex";
  }

  bioTextarea.addEventListener("input", () => {
    const text = bioTextarea.value;
    const charCount = text.length;

    wordCountDisplay.textContent = `${charCount} / ${maxWords}`;

    if (charCount > maxWords) {
      wordCountDisplay.style.display = "flex";
      wordCountDisplay.classList.add("error-msg");

      bioTextarea.setCustomValidity(
        "You have exceeded the maximum of characters"
      );

      saveBioBtn.classList.add("disabled");
      saveBioBtn.disabled = true;
    } else if (charCount <= 0) {
      wordCountDisplay.style.display = "none";
      wordCountDisplay.classList.remove("error-msg");
      saveBioBtn.disabled = false;

      bioTextarea.setCustomValidity("");
    } else {
      wordCountDisplay.style.display = "flex";
      wordCountDisplay.classList.remove("error-msg");

      saveBioBtn.disabled = false;

      bioTextarea.setCustomValidity("");
    }
  });

  url.addEventListener("change", () => {
    websiteFeedback.innerHTML = "";
    url.setCustomValidity("");

    if (url.value.trim() === "") {
      websiteFeedback.textContent = "";
      url.setCustomValidity("");
    } else if (!url.checkValidity()) {
      const errorIcon = document.createElement("i");
      errorIcon.classList.add("fa-solid", "fa-circle-exclamation", "error-msg");
      const errorMessage = document.createTextNode(
        "Please enter a valid URL (e.g., https:://example.com). "
      );
      websiteFeedback.appendChild(errorIcon);
      websiteFeedback.appendChild(errorMessage);
      url.setCustomValidity(
        "Please enter a valid URL (e.g., https://example.com). "
      );
    } else {
      websiteFeedback.innerHTML = "";
      url.setCustomValidity("");
    }
  });

  // Edit mode
  updateBioBtn.addEventListener("click", () => {
    bioTextarea.disabled = false;
    saveBioBtn.style.display = "inline";
    updateBioBtn.style.display = "none";
    bioTextarea.style.display = "inline";
    if (pfpActions) pfpActions.style.display = "flex";
    if (websiteLinks) websiteLinks.style.display = "inline";
    wordCountDisplay.style.display = "flex";

    const closeIcons = document.querySelectorAll(".close-icon");
    closeIcons.forEach((icon) => {
      icon.style.display = "block";
    });
  });

  // Save
  saveBioBtn.addEventListener("click", async () => {
    wordCountDisplay.style.display = "none";

    bioTextarea.disabled = true;

    saveBioBtn.style.display = "none";
    updateBioBtn.style.display = "inline";

    if (pfpActions) pfpActions.style.display = "none";

    const closeIcons = document.querySelectorAll(".close-icon");
    closeIcons.forEach((icon) => {
      icon.style.display = "none";
    });

    currentBio = bioTextarea.value.trim();
    currentUrl = url.value.trim();
    currentUrlTitle = title.value.trim();

    if (currentBio === "") {
      bioTextarea.style.display = "none";
    } else {
      bioTextarea.style.display = "block";
    }

    if (currentUrl === "" && currentUrlTitle === "") {
      if (websiteLinks) websiteLinks.style.display = "none";
    } else if (currentUrl !== "" && currentUrlTitle === "") {
      titleFeedback.innerHTML = "";

      const errorIcon = document.createElement("i");
      errorIcon.classList.add("fa-solid", "fa-circle-exclamation", "error-msg");
      const errorMessage = document.createTextNode("Please enter a title!");

      titleFeedback.appendChild(errorIcon);
      titleFeedback.appendChild(errorMessage);

      return; // Exit early since there's an error
    } else if (currentUrl === "" && currentUrlTitle !== "") {
      websiteFeedback.innerHTML = "";

      const errorIcon = document.createElement("i");
      errorIcon.classList.add("fa-solid", "fa-circle-exclamation", "error-msg");
      const errorMessage = document.createTextNode(
        "Please fill out this field!"
      );

      websiteFeedback.appendChild(errorIcon);
      websiteFeedback.appendChild(errorMessage);

      return; // Exit early since there's an error
    } else {
      websiteFeedback.innerHTML = "";
      titleFeedback.innerHTML = "";

      webLinks.push({ url: currentUrl, title: currentUrlTitle });

      if (websiteLinks) websiteLinks.style.display = "block";

      renderWebsiteLink(currentUrl, currentUrlTitle);

      websiteUrlDisplay.style.display = "flex";
      websiteLinks.style.display = "none";
    }

    // Reset the url & title for next input
    url.value = "";
    title.value = "";

    await updateBio({
      bio: currentBio,
      websiteLinks: webLinks
    }, currentUser.userId);

  });
}
