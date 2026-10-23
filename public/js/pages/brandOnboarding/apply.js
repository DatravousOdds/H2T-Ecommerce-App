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

function formatDate(ms) {
  return new Date(ms).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
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
      : `You can reapply on ${formatDate(application.reapplyAt)}.`;
  }
  document.getElementById("statusMessage").textContent = message;

  const notes = document.getElementById("statusNotes");
  notes.hidden = !application.reviewerNotes;
  document.getElementById("statusNotesText").textContent = application.reviewerNotes || "";

  renderSummary(application);
  document.getElementById("reapplyActions").hidden = !canReapplyNow;

  if (application.status === "approved_awaiting_assets") {
    showAssetUpload(application.assets, loadApplication);
  } else {
    hideAssetUpload();
  }
  showPanel("status");
}

// prefill is the previous application when reapplying, otherwise null.
function openForm(prefill) {
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

  formTitle.textContent = prefill ? "Update and reapply" : "Tell us about your brand";
  submitButton.textContent = prefill ? "Resubmit application" : "Submit application";
  showPanel("form");
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

document.getElementById("reapplyButton").addEventListener("click", () => openForm(currentApplication));
document.getElementById("retryButton").addEventListener("click", loadApplication);

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
