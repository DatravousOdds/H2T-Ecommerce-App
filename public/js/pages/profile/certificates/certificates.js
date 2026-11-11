"use strict";

import { db, collection, getDocs, query, where } from "../../../api/firebase-client.js";
import { SOURCES, certificatesView } from "./certificateList.js";

const bySource = {};
let activeFilter = "all";

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
  pane.querySelector(".cert-errors").innerHTML = errorsHTML;

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

    // shortcut: a filter click during a retry re-enables this button, so two
    // retries can overlap and a late failure can overwrite good data until the
    // next retry. Add an in-flight guard if that shows up in practice.
    const key = retryBtn.dataset.retry;
    retryBtn.disabled = true;
    retryBtn.textContent = "Trying again…";
    await loadSource(key, userId);
    render();

    const focusTarget = pane.querySelector(`[data-retry="${key}"]`) || pane.querySelector("[data-filter].active");
    focusTarget.focus();
  });
}

export async function initCertificates(userData) {
  const userId = userData?.userId;
  if (!userId) return;

  wirePane(userId);
  await Promise.all(Object.keys(SOURCES).map((key) => loadSource(key, userId)));
  render();
}
