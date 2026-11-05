"use strict";

import { checkUserStatus } from "../../auth/auth.js";
import { auth } from "../../api/firebase-client.js";
import { showAssetUpload, hideAssetUpload } from "./assetUpload.js";

const panels = {
  loading: document.getElementById("loadingPanel"),
  loggedOut: document.getElementById("loggedOutPanel"),
  status: document.getElementById("statusPanel"),
  error: document.getElementById("errorPanel"),
  form: document.getElementById("formPanel"),
  username: document.getElementById("usernamePanel"),
};

const form = document.getElementById("brandApplyForm");
const formTitle = document.getElementById("formTitle");
const formError = document.getElementById("formError");
const submitButton = document.getElementById("submitButton");
const einPrevious = document.getElementById("einPrevious");

// Copy for each status the server can return. `tone` picks the chip color.
// rejected's message depends on the reapply date, so renderStatus fills it.
const STATUS_VIEWS = {
  pending_review: {
    chip: "Under review", tone: "pending",
    title: "We're reviewing your application",
    message: "We'll email you when we've made a decision.",
  },
  approved_awaiting_assets: {
    chip: "Approved", tone: "approved",
    title: "You're approved",
    message: "Upload your card image, logo, and cover photo below. We'll check them, then your brand goes live.",
  },
  assets_submitted: {
    chip: "Images in review", tone: "pending",
    title: "We're checking your images",
    message: "We'll email you as soon as your brand is live.",
  },
  published: {
    chip: "Live", tone: "live",
    title: "Your brand is live",
    message: "It's featured in Upcoming Brands on the Hexxo homepage.",
  },
  unpublished: {
    chip: "Not featured", tone: "neutral",
    title: "Your brand isn't featured right now",
    message: "Contact us if you have questions about your listing.",
  },
  rejected: {
    chip: "Not approved", tone: "rejected",
    title: "Your application wasn't approved",
  },
};

// The last application loaded, kept so Reapply can pre-fill the form.
let currentApplication = null;
// From GET /me. Applying requires a username, and new accounts start without one.
let hasUsername = false;

function showPanel(name) {
  for (const [key, panel] of Object.entries(panels)) {
    panel.hidden = key !== name;
  }
}

async function authorizedFetch(url, options = {}) {
  const idToken = await auth.currentUser.getIdToken();

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
      ...options.headers,
    },
  });
}

// Central Time, same as the rejection email (formatBrandEmailDate in
// server.js), so the page and the email always name the same day.
function formatDate(ms) {
  return new Date(ms).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/Chicago" });
}

function renderSummary(application) {
  const rows = [
    ["Brand", application.brandName],
    ["Category", application.category],
    ["Instagram", `@${application.instagram}`],
    ["Website", application.website || "None"],
    ["EIN", application.einLast4 ? `On file, ending in ${application.einLast4}` : "Not provided"],
  ];

  const summary = document.getElementById("statusSummary");
  summary.replaceChildren(...rows.flatMap(([label, value]) => {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = value;
    return [dt, dd];
  }));
}

function renderStatus(application) {
  const view = STATUS_VIEWS[application.status] || STATUS_VIEWS.pending_review;
  const chip = document.getElementById("statusChip");
  const canReapplyNow = application.status === "rejected" && (!application.reapplyAt || application.reapplyAt <= Date.now());

  chip.textContent = view.chip;
  chip.dataset.tone = view.tone;
  document.getElementById("statusTitle").textContent = view.title;

  let message = view.message;
  if (application.status === "rejected") {
    message = canReapplyNow
      ? "You can update your application and reapply now."
      : `You can reapply on ${formatDate(application.reapplyAt)} (Central Time).`;
  }
  document.getElementById("statusMessage").textContent = message;

  const notes = document.getElementById("statusNotes");
  notes.hidden = !application.reviewerNotes;
  document.getElementById("statusNotesText").textContent = application.reviewerNotes || "";

  renderSummary(application);
  document.getElementById("reapplyActions").hidden = !canReapplyNow;
  document.getElementById("pendingActions").hidden = application.status !== "pending_review";
  disarmWithdraw();
  showStatusError("");

  if (application.status === "approved_awaiting_assets") {
    showAssetUpload(application.assets, loadApplication);
  } else {
    hideAssetUpload();
  }
  showPanel("status");
}

const FORM_MODES = {
  new: { title: "Tell us about your brand", submit: "Submit application" },
  reapply: { title: "Update and reapply", submit: "Resubmit application" },
  edit: { title: "Edit your application", submit: "Save changes" },
};

// prefill is the current application when reapplying or editing, otherwise null.
function openForm(prefill, mode = "new") {
  if (!hasUsername) {
    showPanel("username");
    return;
  }

  form.reset();
  hideFormError();

  if (prefill) {
    for (const field of ["brandName", "category", "description", "instagram", "website"]) {
      form.elements[field].value = prefill[field] || "";
    }
  }

  // The full EIN never comes back to the browser, only its last 4 digits, so
  // a reapply can't pre-fill it. Leaving it blank removes it from file.
  einPrevious.hidden = !prefill?.einLast4;
  einPrevious.textContent = prefill?.einLast4
    ? `You previously gave an EIN ending in ${prefill.einLast4}. Enter it again to keep it on file.`
    : "";

  formTitle.textContent = FORM_MODES[mode].title;
  submitButton.textContent = FORM_MODES[mode].submit;
  // Editing or reapplying started from the status view, so offer a way back
  document.getElementById("cancelFormButton").hidden = mode === "new";
  showPanel("form");
}

function showStatusError(message) {
  const el = document.getElementById("statusError");
  el.textContent = message;
  el.hidden = !message;
}

// Withdrawing deletes the application and can't be undone, so it takes two
// clicks, the same pattern as Approve on the admin page.
const WITHDRAW_CONFIRM_MS = 5000;
const withdrawButton = document.getElementById("withdrawButton");
let withdrawArmedUntil = 0;

function disarmWithdraw() {
  withdrawArmedUntil = 0;
  withdrawButton.textContent = "Withdraw application";
  withdrawButton.classList.remove("is-armed");
}

async function handleWithdraw() {
  if (Date.now() > withdrawArmedUntil) {
    withdrawArmedUntil = Date.now() + WITHDRAW_CONFIRM_MS;
    withdrawButton.textContent = "Click again to withdraw";
    withdrawButton.classList.add("is-armed");
    setTimeout(() => { if (Date.now() >= withdrawArmedUntil) disarmWithdraw(); }, WITHDRAW_CONFIRM_MS);
    return;
  }

  withdrawButton.disabled = true;
  showStatusError("");
  try {
    const response = await authorizedFetch("/api/brand-onboarding", { method: "DELETE" });
    const result = await response.json();
    // 409/404: it was reviewed or removed meanwhile; show whatever is true now
    if (!response.ok && response.status !== 409 && response.status !== 404) {
      throw new Error(result.message || "We couldn't withdraw your application. Please try again.");
    }
    await loadApplication();
  } catch (error) {
    showStatusError(error.message);
  } finally {
    withdrawButton.disabled = false;
  }
}

async function loadApplication() {
  showPanel("loading");

  try {
    const response = await authorizedFetch("/api/brand-onboarding/me");
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Check your connection and try again.");
    }

    currentApplication = result.application;
    hasUsername = result.hasUsername;
    if (currentApplication) {
      renderStatus(currentApplication);
    } else {
      openForm(null);
    }
  } catch (error) {
    document.getElementById("errorMessage").textContent = error.message;
    showPanel("error");
  }
}

function showFormError(message) {
  formError.textContent = message;
  formError.hidden = false;
  formError.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideFormError() {
  formError.hidden = true;
  formError.textContent = "";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideFormError();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const idleLabel = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  try {
    const response = await authorizedFetch("/api/brand-onboarding", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const result = await response.json();

    // 409 means the application changed since this page loaded (another tab
    // submitted, or the cooldown hasn't passed), so show the real status.
    if (response.status === 409) {
      await loadApplication();
      return;
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || "We couldn't submit your application. Please try again.");
    }

    await loadApplication();
    panels.status.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showFormError(error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = idleLabel;
  }
});

document.getElementById("reapplyButton").addEventListener("click", () => openForm(currentApplication, "reapply"));
document.getElementById("editButton").addEventListener("click", () => openForm(currentApplication, "edit"));
document.getElementById("cancelFormButton").addEventListener("click", () => renderStatus(currentApplication));
withdrawButton.addEventListener("click", handleWithdraw);
document.getElementById("retryButton").addEventListener("click", loadApplication);
document.getElementById("usernameDoneButton").addEventListener("click", loadApplication);

async function init() {
  let user = null;
  try {
    user = await checkUserStatus();
  } catch (error) {
    console.error("Auth check failed:", error);
  }

  if (!user) {
    showPanel("loggedOut");
    return;
  }

  await loadApplication();
}

init();
