"use strict";


import { auth, db, collection, getDocs, query, where, getStorage, ref, uploadString, getDownloadURL } from "../../../api/firebase-client.js";

const storage = getStorage();
const MAX_DELIVERY_CONFIRMATION_PHOTOS = 5;

// Reset every time openOrderDetails() builds a fresh confirmation section --
// holds { url } objects for photos already uploaded to Storage for the
// order currently open in the modal, in upload order.
let deliveryConfirmationPhotos = [];

/**
 * Buyer-side view of the same `orders` collection the Selling tab's Orders
 * module reads (there: where sellerId == uid; here: where buyerId == uid).
 *
 * fulfillmentStatus is real now: "pending" (checkout submit, before payment
 * captures) -> "processing" (webhook confirms payment) -> "shipped" (seller
 * enters tracking) -> "delivered" (never seller-set -- either
 * /webhooks/easyship, for orders with a purchased label, or the buyer
 * confirming receipt themselves below, for self-ship orders with no carrier
 * webhook to source that truth from), or "cancelled" from pending/processing.
 * order.status stays Stripe's own payment status
 * ("succeeded"/etc) and is unrelated -- see orders.js for that one.
 * trackingNumber/carrier are written by PUT /orders/:id when a seller ships.
 *
 * One field still handled defensively, not just faked: `shippingAddress`
 * on a real order is actually the *seller's* ship-from location (confirmed
 * by reading checkout.js/server.js directly -- it's set from
 * `shippingFrom`), not the buyer's delivery address. Showing it under
 * "Shipping Information" as if it were the buyer's own address would be
 * actively wrong, not just an honest gap -- so it's labeled for what it
 * really is instead of presented as something it isn't.
 */

// Populated by initPurchases/refreshPurchases -- read by the click
// delegation below so re-renders after a cancel don't leave stale closures
// pointing at the pre-cancel order list.
let currentOrders = [];

const STATUS_DISPLAY = {
  pending: { icon: "fa-clock", label: "Pending" },
  processing: { icon: "fa-box", label: "Processing" },
  shipped: { icon: "fa-truck", label: "Shipped" },
  delivered: { icon: "fa-check", label: "Delivered" },
  cancelled: { icon: "fa-xmark", label: "Cancelled" },
};

function getDisplayStatus(order) {
  const status = (order.fulfillmentStatus || "processing").toLowerCase();
  return STATUS_DISPLAY[status] ? status : "processing";
}

function toDate(createdAt) {
  return new Date(createdAt * 1000);
}

function formatDate(createdAt) {
  return toDate(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function purchaseCardHTML(order) {
  const status = getDisplayStatus(order);
  const { icon, label } = STATUS_DISPLAY[status];
  const itemName = order.item?.name || "Item";
  const price = Number(order.subtotal || 0).toFixed(2);
  const image = order.item?.image || "/images/HypebeastBG.jpeg";

  return `
    <div class="purchase-item" data-order-id="${order.id}">
      <!-- Mobile View -->
      <div class="mobile-view">
        <div class="order-header">
          <p class="order-number">Order #${(order.id || "").slice(-10)}</p>
          <div class="status-badge ${status}">
            <i class="fa-solid ${icon}"></i>
            <span>${label}</span>
          </div>
        </div>

        <div class="product-info">
          <img src="${image}" alt="${itemName}" />
          <div class="details">
            <h3>${itemName}</h3>
            <p>Quantity: 1</p>
            <p>Price: $${price}</p>
          </div>
        </div>

        <button class="view-details-btn">
          <span>
            <i class="fa-solid fa-eye"></i>
            View Details
          </span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      <!-- Desktop View -->
      <div class="desktop-view">
        <div class="product-section">
          <img src="${image}" alt="${itemName}" />
          <div class="details">
            <h3>${itemName}</h3>
            <p class="order-number">Order #${(order.id || "").slice(-10)}</p>
            <div class="price-quantity">
              <span>Quantity: 1</span>
              <span>Price: $${price}</span>
            </div>
          </div>
        </div>

        <div class="status-section">
          <div class="status-badge ${status}">
            <i class="fa-solid ${icon}"></i>
            <span>${label}</span>
          </div>
          <button class="view-details-btn">
            <i class="fa-solid fa-eye"></i>
            <span>View Details</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

// Mirrors purchaseCardHTML's structure (image + detail lines) so the
// shimmering placeholder is the same size/shape as the real card -- that's
// what keeps the swap-in from causing layout jump.
function purchaseSkeletonHTML() {
  return `
    <div class="purchase-item skeleton-item">
      <div class="mobile-view">
        <div class="order-header">
          <span class="skeleton skeleton-line short"></span>
          <span class="skeleton skeleton-line short" style="width: 70px;"></span>
        </div>
        <div class="product-info">
          <div class="skeleton skeleton-img"></div>
          <div class="details" style="flex: 1;">
            <span class="skeleton skeleton-line medium"></span>
            <span class="skeleton skeleton-line short"></span>
            <span class="skeleton skeleton-line short"></span>
          </div>
        </div>
      </div>
      <div class="desktop-view">
        <div class="product-section">
          <div class="skeleton skeleton-img"></div>
          <div class="details" style="flex: 1;">
            <span class="skeleton skeleton-line medium"></span>
            <span class="skeleton skeleton-line long"></span>
          </div>
        </div>
        <div class="status-section">
          <span class="skeleton skeleton-line short" style="width: 70px;"></span>
        </div>
      </div>
    </div>
  `;
}

function renderSkeletons(count = 3) {
  const html = Array.from({ length: count }, purchaseSkeletonHTML).join("");
  document.querySelectorAll(".purchase-list").forEach((list) => {
    list.innerHTML = html;
  });
}

function renderSection(sectionId, orders) {
  const section = document.getElementById(sectionId);
  console.log("section", section)
  if (!section) return;

  const list = section.querySelector(".purchase-list");
  console.log("list", list)
  if (!list) return;

  if (orders.length === 0) {
    list.innerHTML = `<p class="default-paragraph" style="text-align:center; padding: 24px;">No purchases here yet.</p>`;
    return;
  }

  list.innerHTML = orders.map(purchaseCardHTML).join("");
}

function renderAllSections(allOrders, searchTerm = "") {
  const filtered = searchTerm
    ? allOrders.filter((o) => {
        const term = searchTerm.toLowerCase();
        return (
          (o.item?.name || "").toLowerCase().includes(term) ||
          (o.item?.brand || "").toLowerCase().includes(term) ||
          (o.id || "").toLowerCase().includes(term)
        );
      })
    : allOrders;

  renderSection("all-purchases", filtered);
  renderSection("processing-purchases", filtered.filter((o) => getDisplayStatus(o) === "processing"));
  renderSection("shipped-purchases", filtered.filter((o) => getDisplayStatus(o) === "shipped"));
  renderSection("delivered-purchases", filtered.filter((o) => getDisplayStatus(o) === "delivered"));
  renderSection("cancelled-purchases", filtered.filter((o) => getDisplayStatus(o) === "cancelled"));
}

function buildOrderDetailsHTML(order) {
  const status = getDisplayStatus(order);
  const { label } = STATUS_DISPLAY[status];
  const itemName = order.item?.name || "Item";
  const image = order.item?.image || "/images/HypebeastBG.jpeg";
  const subtotal = Number(order.subtotal || 0);
  const shippingCost = Number(order.shippingCost || 0);
  const tax = Number(order.item?.salesTax || 0);
  const total = subtotal + shippingCost + tax;

  const sizeRow = order.item?.size
    ? `<p class="default-paragraph product-size">Size: ${order.item.size}</p>`
    : "";

  // shippingAddress is the seller's ship-from location, not the buyer's
  // delivery address -- labeled for what it actually is rather than shown
  // as if it were the buyer's own address.
  const shipFromRow = order.shippingAddress
    ? `<p class="shipping-recipient">Ships from: ${order.shippingAddress}</p>`
    : "";

  const trackingSection = order.trackingNumber
    ? `<button class="track-order-btn" data-order-id="${order.id}">
         <i class="fa-solid fa-truck"></i>
         Track Order
       </button>`
    : `<button class="track-order-btn" disabled title="Not yet shipped">
         <i class="fa-solid fa-truck"></i>
         Not yet shipped
       </button>`;

  // Cancellation only makes sense before the item has shipped -- matches
  // the same "pending"/"processing" window the backend (DELETE
  // /orders/:id) actually allows.
  const isCancellable = status === "pending" || status === "processing";
  const cancelSection = isCancellable
    ? `<div class="order-details-cancel">
         <button type="button" class="order-action-btn danger" id="buyer-cancel-order-btn">Cancel Order</button>
         <p class="order-action-error"></p>
       </div>`
    : "";

  // "delivered" is a locked terminal fulfillmentStatus, but the separate
  // deliveryConfirmationStatus field tracks the buyer's own review/dispute
  // progress on top of it -- "required" means delivered and still
  // untouched, matching what PUT /orders/:id sets the moment a seller marks
  // an order delivered.
  const needsDeliveryConfirmation = status === "delivered" && order.deliveryConfirmationStatus === "required";
  if (needsDeliveryConfirmation) deliveryConfirmationPhotos = [];

  // Self-ship orders (no purchased Easyship label, order.easyshipShipmentId
  // unset) have no carrier webhook to source real delivery ground truth
  // from -- the buyer confirms receipt themselves instead of trusting the
  // seller's own say-so. Easyship-tracked orders skip this section entirely;
  // /webhooks/easyship marks them delivered automatically (see server.js's
  // BUYER_FULFILLMENT_TRANSITIONS).
  const needsMarkAsReceived = status === "shipped" && !order.easyshipShipmentId;
  const markAsReceivedSection = needsMarkAsReceived
    ? `<div class="order-mark-received">
         <p class="mark-received-subtext">This seller ships independently, so we can't confirm delivery automatically. Let us know once your item arrives.</p>
         <button type="button" class="order-action-btn" id="mark-as-received-btn">Mark as Received</button>
         <p class="order-action-error mark-received-error"></p>
       </div>`
    : "";

  const confirmationSection = needsDeliveryConfirmation
    ? `<div class="order-delivery-confirmation">
         <div class="delivery-confirmation-header">
           <h3>Confirm Delivery</h3>
           <p class="delivery-confirmation-subtext">Leave a review and upload a photo to confirm delivery or report a problem.</p>
         </div>
         <div class="delivery-confirmation-rating" data-rating="0">
           ${[1, 2, 3, 4, 5].map((n) => `<i class="fa-regular fa-star" data-value="${n}"></i>`).join("")}
         </div>
         <div class="delivery-confirmation-comment">
           <label for="delivery-confirmation-comment-input">Leave a comment (optional)</label>
           <textarea id="delivery-confirmation-comment-input" placeholder="Leave a comment (optional)"></textarea>
         </div>
         <div class="delivery-confirmation-photos">
           <input type="file" id="delivery-confirmation-photo-input" accept="image/jpeg,image/png" multiple hidden />
           <button type="button" class="delivery-confirmation-upload-btn" id="delivery-confirmation-upload-trigger">
             <i class="fa-solid fa-camera"></i> Upload Photo
           </button>
           <div class="delivery-confirmation-photo-previews"></div>
         </div>
         <p class="order-action-error delivery-confirmation-error"></p>
         <p class="delivery-confirmation-success"></p>
         <div class="delivery-confirmation-actions">
           <button type="button" class="order-action-btn primary" id="submit-review-btn">Submit review</button>
           <button type="button" class="order-action-btn secondary" id="report-problem-btn">Report a problem</button>
         </div>
       </div>`
    : "";

  return {
    title: `Order #${(order.id || "").slice(-10)}`,
    status,
    statusLabel: label,
    orderDate: formatDate(order.createdAt),
    html: `
      <div class="order-products-container">
        <div class="order-item">
          <img class="product-img" src="${image}" alt="${itemName}" />
        </div>
        <div class="order-item-info">
          <h3 class="default-paragraph product-name">${itemName}</h3>
          ${sizeRow}
          <p class="default-paragraph product-quantity">Quantity: 1</p>
          <p class="default-paragraph product-price">Price: $${subtotal.toFixed(2)}</p>
        </div>
      </div>
      <div class="order-shipping-info">
        <div class="order-shipping-info-container">
          <div class="order-shipping-info-header">
            <i class="fa-solid fa-location-dot"></i>
            <h3>Shipping Information</h3>
          </div>
          <div class="order-shipping-info-content">
            ${shipFromRow}
          </div>
          ${trackingSection}
        </div>
        <div class="order-payment-details">
          <div class="order-payment-details-header">
            <i class="fa-regular fa-credit-card"></i>
            <h3>Payment Details</h3>
          </div>
          <div class="order-payment-details-content">
            <p class="payment-method">Payment Method: Card</p>
            <div class="order-pricing">
              <div class="order-subtotal space-between">
                <p>Subtotal:</p>
                <span>$${subtotal.toFixed(2)}</span>
              </div>
              <div class="order-shipping space-between">
                <p>Shipping:</p>
                <span>$${shippingCost.toFixed(2)}</span>
              </div>
              <div class="order-tax space-between">
                <p>Tax:</p>
                <span>$${tax.toFixed(2)}</span>
              </div>
            </div>
            <div class="order-total space-between">
              <p>Total:</p>
              <span>$${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      ${cancelSection}
      ${markAsReceivedSection}
      ${confirmationSection}
    `,
  };
}

function openOrderDetails(order) {
  const menu = document.querySelector("#purchases-order-details-menu");
  if (!menu) return;

  const { title, status, statusLabel, orderDate, html } = buildOrderDetailsHTML(order);

  // Read by the delegated cancel-button handler below to know which order
  // to send the DELETE for -- order.docId is the Firestore doc id, not
  // order.id (which is the Stripe payment intent id).
  menu.dataset.docId = order.docId;

  const titleEl = document.getElementById("order-details-title");
  const subheaderTitle = menu.querySelector(".order-details-subheader-title");
  const statusEl = menu.querySelector(".order-details-status");
  const dateEl = menu.querySelector(".order-details-subheader-right p");
  const contentContainer = menu.querySelector(".order-details-content");

  if (titleEl) titleEl.textContent = "Order Details";
  if (subheaderTitle) subheaderTitle.textContent = title;
  if (statusEl) {
    statusEl.textContent = statusLabel;
    statusEl.className = `order-details-status ${status}`;
  }
  if (dateEl) dateEl.textContent = `Order Date: ${orderDate}`;

  // Everything below the subheader is fully rebuilt per order rather than
  // patched field-by-field, since the product/shipping/payment sections
  // are entirely order-specific.
  const subheader = menu.querySelector(".order-details-subheader");
  if (contentContainer && subheader) {
    contentContainer.innerHTML = "";
    contentContainer.appendChild(subheader);
    contentContainer.insertAdjacentHTML("beforeend", html);
  }

  menu.classList.add("active");
}

async function cancelOrder(docId) {
  // Fresh every call rather than a page-load snapshot -- see the identical
  // fix and its writeup in orders.js/notes.md; a tab left open past the
  // token's ~1hr lifetime would otherwise 401 here too.
  const idToken = await auth.currentUser.getIdToken();

  const response = await fetch(`/orders/${docId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: JSON.stringify({}),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Cancel failed");
  return result;
}

// Buyer-initiated "shipped" -> "delivered" for self-ship orders only --
// server.js's BUYER_FULFILLMENT_TRANSITIONS rejects this for any order with
// an easyshipShipmentId, since /webhooks/easyship owns that transition there.
async function markOrderReceived(docId) {
  const idToken = await auth.currentUser.getIdToken();

  const response = await fetch(`/orders/${docId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: JSON.stringify({ fulfillmentStatus: "delivered" }),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Update failed");
  return result;
}

// Mirrors uploadImagesToFirebase() in authenticate.js -- same technique
// (FileReader to a data URL, then uploadString/getDownloadURL), different
// Storage path. Returns the download URL string.
function uploadDeliveryConfirmationPhoto(file, uid, orderId, index) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the selected file"));
    reader.onload = async () => {
      try {
        const path = `deliveryConfirmations/${uid}/${orderId}/image_${index}_${Date.now()}.jpg`;
        const storageRef = ref(storage, path);
        const uploadResult = await uploadString(storageRef, reader.result, "data_url");
        const url = await getDownloadURL(uploadResult.ref);
        resolve(url);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsDataURL(file);
  });
}

async function submitDeliveryConfirmation(docId, { rating, comment, photoUrls }) {
  const idToken = await auth.currentUser.getIdToken();

  const response = await fetch(`/api/orders/${docId}/delivery-confirmation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: JSON.stringify({ rating, comment, photoUrls }),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Submission failed");
  return result;
}

async function submitDispute(docId, { comment, photoUrls }) {
  const idToken = await auth.currentUser.getIdToken();

  const response = await fetch(`/api/orders/${docId}/dispute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: JSON.stringify({ comment, photoUrls }),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Submission failed");
  return result;
}

// Re-fetches and re-renders after a cancel, keeping currentOrders (and
// anything closed over it, like the click delegation below) in sync.
async function refreshPurchases(currentUser) {
  currentOrders = await fetchBuyerOrders(currentUser.userId);

  const searchInput = document.querySelector(".purchases-search input");
  renderAllSections(currentOrders, searchInput ? searchInput.value.trim() : "");
}

function wireEventDelegation(currentUser) {
  const purchasesContent = document.querySelector(".purchases-content");
  const orderDetailsMenu = document.querySelector("#purchases-order-details-menu");
  const closeBtn = document.getElementById("close-order-details-menu");

  if (purchasesContent) {
    purchasesContent.addEventListener("click", (e) => {
      const viewBtn = e.target.closest(".view-details-btn");
      if (!viewBtn) return;

      const card = viewBtn.closest(".purchase-item");
      const orderId = card?.dataset.orderId;
      const order = currentOrders.find((o) => o.id === orderId);
      if (order) openOrderDetails(order);
    });
  }

  if (closeBtn && orderDetailsMenu) {
    closeBtn.addEventListener("click", () => orderDetailsMenu.classList.remove("active"));
  }

  // Delegated on the modal itself (not the button directly) since the
  // cancel button is regenerated fresh every time openOrderDetails() runs.
  if (orderDetailsMenu) {
    orderDetailsMenu.addEventListener("click", async (e) => {
      const cancelBtn = e.target.closest("#buyer-cancel-order-btn");
      if (!cancelBtn) return;

      const docId = orderDetailsMenu.dataset.docId;
      if (!docId) return;

      if (!window.confirm("Cancel this order? This can't be undone.")) return;

      const errorEl = orderDetailsMenu.querySelector(".order-action-error");

      try {
        await cancelOrder(docId);
        orderDetailsMenu.classList.remove("active");
        await refreshPurchases(currentUser);
      } catch (error) {
        if (errorEl) {
          errorEl.textContent = error.message;
          errorEl.classList.add("visible");
        }
      }
    });

    // Delegated for the same reason as the cancel button above -- this
    // button (and its data-order-id) is regenerated fresh every
    // openOrderDetails() call.
    orderDetailsMenu.addEventListener("click", (e) => {
      const trackBtn = e.target.closest(".track-order-btn");
      if (!trackBtn || trackBtn.disabled) return;

      const orderId = trackBtn.dataset.orderId;
      if (!orderId) return;

      window.location.href = `/track-order?orderId=${orderId}`;
    });

    // Feeds straight into the same Confirm Delivery flow below -- patches
    // the in-memory order and re-renders the modal in place (rather than
    // closing it) so the star-rating/photo section appears immediately
    // instead of making the buyer reopen the modal to see it.
    orderDetailsMenu.addEventListener("click", async (e) => {
      const receivedBtn = e.target.closest("#mark-as-received-btn");
      if (!receivedBtn) return;

      const docId = orderDetailsMenu.dataset.docId;
      if (!docId) return;

      const errorEl = orderDetailsMenu.querySelector(".mark-received-error");
      receivedBtn.disabled = true;

      try {
        await markOrderReceived(docId);

        const order = currentOrders.find((o) => o.docId === docId);
        if (order) {
          order.fulfillmentStatus = "delivered";
          order.deliveryConfirmationStatus = "required";
          openOrderDetails(order);
        }

        await refreshPurchases(currentUser);
      } catch (error) {
        receivedBtn.disabled = false;
        if (errorEl) {
          errorEl.textContent = error.message;
          errorEl.classList.add("visible");
        }
      }
    });

    // Star rating -- click sets the rating to that star's value and toggles
    // fa-regular/fa-solid up to it, reusing the same icon convention the
    // read-only rating displays elsewhere in the app already use.
    orderDetailsMenu.addEventListener("click", (e) => {
      const star = e.target.closest(".delivery-confirmation-rating i");
      if (!star) return;

      const value = Number(star.dataset.value);
      const ratingContainer = star.closest(".delivery-confirmation-rating");
      ratingContainer.dataset.rating = String(value);

      ratingContainer.querySelectorAll("i").forEach((icon) => {
        const isFilled = Number(icon.dataset.value) <= value;
        icon.classList.toggle("fa-solid", isFilled);
        icon.classList.toggle("fa-regular", !isFilled);
      });
    });

    orderDetailsMenu.addEventListener("click", (e) => {
      const uploadTrigger = e.target.closest("#delivery-confirmation-upload-trigger");
      if (!uploadTrigger) return;
      document.getElementById("delivery-confirmation-photo-input")?.click();
    });

    orderDetailsMenu.addEventListener("change", async (e) => {
      const fileInput = e.target.closest("#delivery-confirmation-photo-input");
      if (!fileInput || !fileInput.files.length) return;

      const errorEl = orderDetailsMenu.querySelector(".delivery-confirmation-error");
      const previewsEl = orderDetailsMenu.querySelector(".delivery-confirmation-photo-previews");
      const uploadTrigger = document.getElementById("delivery-confirmation-upload-trigger");
      if (errorEl) errorEl.classList.remove("visible");

      const remainingSlots = MAX_DELIVERY_CONFIRMATION_PHOTOS - deliveryConfirmationPhotos.length;
      const files = Array.from(fileInput.files).slice(0, remainingSlots);
      fileInput.value = "";

      if (uploadTrigger) uploadTrigger.disabled = true;

      try {
        for (const file of files) {
          const url = await uploadDeliveryConfirmationPhoto(
            file,
            currentUser.userId,
            orderDetailsMenu.dataset.docId,
            deliveryConfirmationPhotos.length
          );
          deliveryConfirmationPhotos.push({ url });

          if (previewsEl) {
            const thumb = document.createElement("div");
            thumb.className = "delivery-confirmation-photo-thumb";
            thumb.innerHTML = `<img src="${url}" alt="Uploaded photo" /><button type="button" class="delivery-confirmation-photo-remove" data-url="${url}"><i class="fa-solid fa-xmark"></i></button>`;
            previewsEl.appendChild(thumb);
          }
        }
      } catch (error) {
        if (errorEl) {
          errorEl.textContent = "Photo upload failed, please try again.";
          errorEl.classList.add("visible");
        }
      } finally {
        if (uploadTrigger) uploadTrigger.disabled = false;
      }
    });

    orderDetailsMenu.addEventListener("click", (e) => {
      const removeBtn = e.target.closest(".delivery-confirmation-photo-remove");
      if (!removeBtn) return;

      const url = removeBtn.dataset.url;
      deliveryConfirmationPhotos = deliveryConfirmationPhotos.filter((p) => p.url !== url);
      removeBtn.closest(".delivery-confirmation-photo-thumb")?.remove();
    });

    orderDetailsMenu.addEventListener("click", async (e) => {
      const isSubmit = Boolean(e.target.closest("#submit-review-btn"));
      const isDispute = Boolean(e.target.closest("#report-problem-btn"));
      if (!isSubmit && !isDispute) return;

      const docId = orderDetailsMenu.dataset.docId;
      if (!docId) return;

      const section = orderDetailsMenu.querySelector(".order-delivery-confirmation");
      // Both buttons, regardless of which one was actually clicked -- both
      // need to be disabled/re-enabled together either way.
      const submitBtn = section?.querySelector("#submit-review-btn");
      const disputeBtn = section?.querySelector("#report-problem-btn");
      const errorEl = section?.querySelector(".delivery-confirmation-error");
      const successEl = section?.querySelector(".delivery-confirmation-success");
      const comment = section?.querySelector("#delivery-confirmation-comment-input")?.value.trim() || "";
      const rating = Number(section?.querySelector(".delivery-confirmation-rating")?.dataset.rating || 0);
      const photoUrls = deliveryConfirmationPhotos.map((p) => p.url);

      if (errorEl) errorEl.classList.remove("visible");

      if (photoUrls.length === 0) {
        if (errorEl) {
          errorEl.textContent = "Upload at least one photo to continue.";
          errorEl.classList.add("visible");
        }
        return;
      }

      if (isSubmit && (rating < 1 || rating > 5)) {
        if (errorEl) {
          errorEl.textContent = "Select a star rating to continue.";
          errorEl.classList.add("visible");
        }
        return;
      }

      if (isDispute && !comment) {
        if (errorEl) {
          errorEl.textContent = "Describe the problem to continue.";
          errorEl.classList.add("visible");
        }
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      if (disputeBtn) disputeBtn.disabled = true;

      try {
        if (isSubmit) {
          await submitDeliveryConfirmation(docId, { rating, comment, photoUrls });
          if (successEl) successEl.textContent = "Thank you for your review!";
        } else {
          await submitDispute(docId, { comment, photoUrls });
          if (successEl) successEl.textContent = "Thank you! Our support team will review the problem and email you on the next step.";
        }

        if (section) section.querySelectorAll("button, textarea").forEach((el) => (el.disabled = true));

        setTimeout(async () => {
          orderDetailsMenu.classList.remove("active");
          await refreshPurchases(currentUser);
        }, 1800);

      } catch (error) {
        if (submitBtn) submitBtn.disabled = false;
        if (disputeBtn) disputeBtn.disabled = false;
        if (errorEl) {
          errorEl.textContent = error.message;
          errorEl.classList.add("visible");
        }
      }
    });
  }
}

function wireTabSwitching() {
  const purchaseTypeItems = document.querySelectorAll(".purchase-type-item");
  const purchaseContentSections = document.querySelectorAll(".purchases-content-section");

  purchaseTypeItems.forEach((item, index) => {
    item.addEventListener("click", () => {
      purchaseTypeItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");

      purchaseContentSections.forEach((section) => section.classList.remove("active"));
      purchaseContentSections[index].classList.add("active");
    });
  });
}

function wireSearch() {
  const searchInput = document.querySelector(".purchases-search input");
  const form = document.querySelector(".purchases-search");

  if (form) form.addEventListener("submit", (e) => e.preventDefault());

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      renderAllSections(currentOrders, searchInput.value.trim());
    });
  }
}

async function fetchBuyerOrders(userId) {
  const ordersRef = collection(db, "orders");
  const q = query(ordersRef, where("buyerId", "==", userId));
  const snapshot = await getDocs(q);

  // docId is the Firestore document id -- distinct from order.id, which is
  // the Stripe payment intent id. The cancel action (DELETE /orders/:id)
  // keys off the Firestore doc, so this has to be captured here.
  const orders = snapshot.docs.map((d) => ({ ...d.data(), docId: d.id }));
  orders.sort((a, b) => b.createdAt - a.createdAt);
  console.log("orders from purchases", orders)
  return orders;
}

export async function initPurchases(currentUser) {
    console.log("purchases init called!")

  if (!currentUser?.userId) return;

  renderSkeletons();

  try {
    currentOrders = await fetchBuyerOrders(currentUser.userId);

    renderAllSections(currentOrders);
    wireEventDelegation(currentUser);
    wireTabSwitching();
    wireSearch();
  } catch (error) {
    console.error("Error loading purchases:", error);
  }
}

