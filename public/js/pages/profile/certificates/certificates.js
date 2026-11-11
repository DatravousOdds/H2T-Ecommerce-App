"use strict";

import { db, collection, getDocs, query, where } from "../../../api/firebase-client.js";
import { SOURCES, certificatesView } from "./certificateList.js";

const bySource = {};
let activeFilter = "all";
// Rewriting an unchanged aria-live region makes screen readers announce it again.
let lastErrorsHTML = null;

// Never rejects, so one failed source can't take the others down with it
// in Promise.all. A null slot is what makes certificatesView show its error.
async function loadSource(key, userId) {
  const source = SOURCES[key];

  try {
    const snapshot = await getDocs(query(
      collection(db, source.collectionName),
      where(source.ownerField, "==", userId),
      where(source.passedWhere[0], "==", source.passedWhere[1]),
    ));
    // Offline, the memory-only cache can answer with an empty result, which
    // would read as "No certificates yet" instead of an error with a retry.
    if (snapshot.metadata.fromCache) throw new Error("No response from the server");

    bySource[key] = snapshot.docs
      .map((docSnap) => source.toCertificate(docSnap.id, docSnap.data()))
      .filter(Boolean);
  } catch (error) {
    console.error(`Error loading ${key} certificates:`, error);
    bySource[key] = null;
  }
}

function render() {
  const pane = document.querySelector("#certificates");
  if (!pane) return;

  const { navHTML, errorsHTML, gridHTML, isEmpty } = certificatesView(bySource, activeFilter);
  const focusedFilter = document.activeElement?.dataset?.filter;

  pane.querySelector(".purchase-type-list").innerHTML = navHTML;
  if (errorsHTML !== lastErrorsHTML) {
    pane.querySelector(".cert-errors").innerHTML = errorsHTML;
    lastErrorsHTML = errorsHTML;
  }

  const grid = pane.querySelector(".cert-grid");
  grid.innerHTML = gridHTML;
  grid.hidden = isEmpty;
  pane.querySelector(".empty-state").hidden = !isEmpty;

  // The rewrite above destroys the focused button, which would drop keyboard
  // users back to the top of the page.
  if (focusedFilter) pane.querySelector(`[data-filter="${focusedFilter}"]`)?.focus();
}

function wirePane(userId) {
  const pane = document.querySelector("#certificates");

  pane?.addEventListener("click", async (e) => {
    const filterBtn = e.target.closest("[data-filter]");
    if (filterBtn) {
      activeFilter = filterBtn.dataset.filter;
      render();
      return;
    }

    const retryBtn = e.target.closest("[data-retry]");
    if (!retryBtn) return;

    // shortcut: switching to a filter that hides this error and back during a
    // retry re-renders the button enabled, so two retries can overlap and a late
    // failure can overwrite good data until the next retry. Add an in-flight
    // guard if that shows up in practice.
    const key = retryBtn.dataset.retry;
    retryBtn.disabled = true;
    retryBtn.textContent = "Trying again…";
    await loadSource(key, userId);
    // The button was changed in place, so the next render must rewrite it even
    // if the error comes back the same.
    lastErrorsHTML = null;
    render();

    const focusTarget = pane.querySelector(`[data-retry="${key}"]`) || pane.querySelector("[data-filter].active");
    focusTarget.focus();
  });
}

// Resolves the first time the pane is shown. Watching the class covers every
// way the tab opens: the left nav, ?tab= links and the account menus.
function firstShown(pane) {
  if (pane.classList.contains("active")) return Promise.resolve();

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (!pane.classList.contains("active")) return;
      observer.disconnect();
      resolve();
    });
    observer.observe(pane, { attributes: true, attributeFilter: ["class"] });
  });
}

export async function initCertificates(userData) {
  const userId = userData?.userId;
  const pane = document.querySelector("#certificates");
  if (!userId || !pane) return;

  wirePane(userId);
  // No reads until the tab is opened, so a profile visit that never opens it is free.
  await firstShown(pane);
  await Promise.all(Object.keys(SOURCES).map((key) => loadSource(key, userId)));
  render();
}
