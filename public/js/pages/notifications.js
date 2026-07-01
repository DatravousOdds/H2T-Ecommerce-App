"use strict";

import {
  db,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
} from "../api/firebase-client.js";
import { checkUserStatus } from "../auth/auth.js";

/**
 * notifications/{userId}/items/{notificationId}, written server-side by
 * createNotification() in server.js. Schema: { type, title, message,
 * link, read, createdAt }.
 *
 * Only two types ever actually get written today ('purchase', 'sale') --
 * 'message', 'order_status', and 'security' are defined in the backend's
 * schema but have no trigger yet (see server.js's comment on
 * createNotification for why). This component doesn't need to know or
 * care which types exist -- it renders whatever's actually in the
 * collection, so the day those other triggers ship, nothing here needs
 * to change.
 */

const MAX_RESULTS = 10;
const TYPE_ICONS = {
  purchase: "fa-bag-shopping",
  sale: "fa-sack-dollar",
  message: "fa-message",
  order_status: "fa-truck",
  security: "fa-shield-halved",
};

let panel = null;
let unsubscribe = null;

function buildPanel() {
  if (panel) return panel;

  panel = document.createElement("div");
  panel.className = "notification-panel";
  document.body.appendChild(panel);
  return panel;
}

function positionPanel(anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  panel.style.top = `${rect.bottom + window.scrollY + 8}px`;
  panel.style.left = `${Math.min(rect.left + window.scrollX, window.innerWidth - 340)}px`;
}

function formatRelativeTime(createdAt) {
  // createdAt is a Firestore serverTimestamp() -- a Timestamp object with
  // .toDate(), same shape already established for listings.createdAt in
  // products.js. A notification can briefly have no createdAt yet if this
  // renders before the server timestamp resolves -- handled, not assumed.
  if (!createdAt || typeof createdAt.toDate !== "function") return "Just now";

  const diffMs = Date.now() - createdAt.toDate().getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function notificationRowHTML(notification) {
  const icon = TYPE_ICONS[notification.type] || "fa-bell";
  const unreadClass = notification.read ? "" : "unread";

  return `
    <a class="notification-item ${unreadClass}" href="${notification.link || "#"}" data-id="${notification.id}">
      <div class="notification-icon">
        <i class="fa-solid ${icon}"></i>
      </div>
      <div class="notification-info">
        <p class="notification-title">${notification.title || ""}</p>
        <p class="notification-message">${notification.message || ""}</p>
        <p class="notification-time">${formatRelativeTime(notification.createdAt)}</p>
      </div>
    </a>
  `;
}

function renderNotifications(notifications) {
  if (notifications.length === 0) {
    panel.innerHTML = `<p class="notification-empty">No notifications yet.</p>`;
    return;
  }

  panel.innerHTML = notifications.map(notificationRowHTML).join("");
}

function updateBadge(unreadCount) {
  const badges = document.querySelectorAll(".notification-badge");
  badges.forEach((badge) => {
    badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
    badge.classList.toggle("active", unreadCount > 0);
  });
}

async function markAllAsRead(userId, notifications) {
  const unread = notifications.filter((n) => !n.read);
  if (unread.length === 0) return;

  // Best-effort -- if a single update fails, the rest still go through
  // and the user isn't blocked from seeing their notifications either way.
  await Promise.allSettled(
    unread.map((n) => updateDoc(doc(db, "notifications", userId, "items", n.id), { read: true }))
  );
}

function listenForNotifications(userId) {
  const itemsRef = collection(db, "notifications", userId, "items");
  const q = query(itemsRef, orderBy("createdAt", "desc"), limit(MAX_RESULTS));

  let latestNotifications = [];

  unsubscribe = onSnapshot(q, (snapshot) => {
    latestNotifications = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    const unreadCount = latestNotifications.filter((n) => !n.read).length;

    updateBadge(unreadCount);

    // Only re-render the open panel's contents live -- building it here
    // unconditionally would mean every snapshot update (including the
    // read-status flip from markAllAsRead) re-renders a panel nobody's
    // looking at.
    if (panel && panel.classList.contains("active")) {
      renderNotifications(latestNotifications);
    }
  });

  return () => latestNotifications;
}

export async function setupNotifications(nav) {
  const currentUser = await checkUserStatus();
  const bells = nav.querySelectorAll('a[href="#notifications"], a[href="/notifications"]');

  if (bells.length === 0) return;

  buildPanel();

  if (!currentUser?.userId) {
    bells.forEach((bell) => {
      bell.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "/login";
      });
    });
    return;
  }

  const getLatest = listenForNotifications(currentUser.userId);

  bells.forEach((bell) => {
    bell.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isOpening = !panel.classList.contains("active");

      if (isOpening) {
        positionPanel(bell);
        renderNotifications(getLatest());
        panel.classList.add("active");
        markAllAsRead(currentUser.userId, getLatest());
      } else {
        panel.classList.remove("active");
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && ![...bells].some((b) => b.contains(e.target))) {
      panel.classList.remove("active");
    }
  });
}

// If the page ever tears down nav.js's listeners (it currently doesn't),
// this is here so a future refactor has a clean detach point rather than
// leaking a live Firestore listener.
export function teardownNotifications() {
  if (unsubscribe) unsubscribe();
}