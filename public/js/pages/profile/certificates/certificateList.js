"use strict";

import { escapeHtml } from "../../../core/escapeHtml.js";

const FALLBACK_IMAGE = "/images/HypebeastBG.jpeg";

// A Map because tierSelection.type is user-influenced, and a plain object
// would return a function for "constructor".
const TIER_BY_TYPE = new Map([["QuickCheck", 1], ["Standard", 2], ["Expert+", 3]]);

const toDate = (ts) => (ts?.toDate ? ts.toDate() : null);

const joinSubtitle = (label, size) =>
  [label, size && `Size ${size}`].filter(Boolean).join(" · ");

function orderCertificate(source, docId, order) {
  const item = order.item || {};

  return {
    source,
    title: item.name || "Item",
    subtitle: joinSubtitle(item.brand, item.size),
    imageUrl: item.image || FALLBACK_IMAGE,
    typeLabel: "Authenticity Guarantee",
    tier: null,
    verifiedAt: toDate(order.authenticationDecidedAt),
    // The doc id, not order.id -- that field is the Stripe PaymentIntent id.
    href: `/certificate.html?orderId=${encodeURIComponent(docId)}`,
  };
}

function checkedCertificate(docId, request) {
  const details = request.productDetails?.details || {};
  const name = details.Model || details["Item Type"] || details["Card Name"];
  const image = request.images?.find((img) => img.isPrimary) || request.images?.[0];
  const typeLabel = request.tierSelection?.type || "";

  return {
    source: "checked",
    title: [details.Brand, name].filter(Boolean).join(" ")
      || request.productDetails?.category
      || "Checked item",
    // Category, not Brand -- the title already has the brand.
    subtitle: joinSubtitle(request.productDetails?.category, details.Size),
    imageUrl: image?.url || FALLBACK_IMAGE,
    typeLabel,
    tier: TIER_BY_TYPE.get(typeLabel) ?? null,
    // Not updateAt -- it is only written at creation, so it isn't a verified date.
    verifiedAt: toDate(request.reviewedAt) || toDate(request.createdAt),
    href: `/authenticator/authenticate-results.html?authRequestId=${encodeURIComponent(docId)}`,
  };
}

const ORDER_SOURCE = {
  collectionName: "orders",
  passedWhere: ["authenticationStatus", "passed"],
  linkLabel: "View certificate",
  linkIcon: "fa-qrcode",
};

export const SOURCES = {
  bought: {
    ...ORDER_SOURCE,
    label: "Bought",
    ownerField: "buyerId",
    toCertificate: (docId, order) => (
      ["refunded", "cancelled"].includes(order.fulfillmentStatus)
        ? null
        : orderCertificate("bought", docId, order)
    ),
  },
  sold: {
    ...ORDER_SOURCE,
    label: "Sold",
    ownerField: "sellerId",
    toCertificate: (docId, order) => orderCertificate("sold", docId, order),
  },
  checked: {
    label: "Checked",
    collectionName: "authenticationRequests",
    ownerField: "userId",
    passedWhere: ["status", "approved"],
    linkLabel: "View result",
    linkIcon: "fa-arrow-right",
    toCertificate: checkedCertificate,
  },
};

const SOURCE_KEYS = Object.keys(SOURCES);

function filterButtonHTML(filter, label, count, activeFilter) {
  const isActive = filter === activeFilter;
  const countHTML = count === null ? "" : `<span class="cert-count">${count}</span>`;

  return `<button type="button" class="purchase-type-item${isActive ? " active" : ""}" data-filter="${filter}" aria-pressed="${isActive}">${label}${countHTML}</button>`;
}

function navHTML(bySource, activeFilter) {
  const loaded = SOURCE_KEYS.filter((key) => bySource[key]);
  const allCount = loaded.length
    ? loaded.reduce((sum, key) => sum + bySource[key].length, 0)
    : null;

  return [
    filterButtonHTML("all", "All", allCount, activeFilter),
    ...SOURCE_KEYS.map((key) => (
      filterButtonHTML(key, SOURCES[key].label, bySource[key]?.length ?? null, activeFilter)
    )),
  ].join("");
}

function errorHTML(key) {
  return `<div class="cert-error"><p>Couldn't load your ${SOURCES[key].label.toLowerCase()} items.</p><button type="button" class="cert-retry" data-retry="${key}">Try again</button></div>`;
}

function certificateCardHTML(certificate) {
  const { source, title, subtitle, imageUrl, typeLabel, tier, verifiedAt, href } = certificate;
  const { label, linkLabel, linkIcon } = SOURCES[source];

  const tierHTML = tier ? `<span class="cert-tier">· Tier ${tier}</span>` : "";
  const typeHTML = typeLabel
    ? `<span class="cert-type"><i class="fa-solid fa-certificate" aria-hidden="true"></i>${escapeHtml(typeLabel)}${tierHTML}</span>`
    : "";
  const subtitleHTML = subtitle ? `<span class="cert-subtitle">${escapeHtml(subtitle)}</span>` : "";
  const dateText = verifiedAt
    ? `Verified ${verifiedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : "Verified";

  return `
    <li class="cert-card">
      <img class="cert-thumb" src="${escapeHtml(imageUrl)}" alt="" loading="lazy" width="112" height="112" />
      <div class="cert-info">
        <span class="cert-source">${label}</span>
        <h2 class="cert-title">${escapeHtml(title)}</h2>
        ${subtitleHTML}
        ${typeHTML}
        <span class="cert-date">${dateText}</span>
      </div>
      <a class="cert-link" href="${escapeHtml(href)}"><i class="fa-solid ${linkIcon}" aria-hidden="true"></i>${linkLabel}</a>
    </li>
  `;
}

export function certificatesView(bySource, filter) {
  const covered = filter === "all" ? SOURCE_KEYS : [filter];
  const isEmpty = SOURCE_KEYS.every((key) => bySource[key]?.length === 0);

  // flatMap copies, so sorting never reorders the caller's bySource arrays.
  // A missing date coerces to 0, which sorts it after every real date.
  const certificates = covered
    .flatMap((key) => bySource[key] || [])
    .sort((a, b) => (b.verifiedAt ?? 0) - (a.verifiedAt ?? 0));

  const showFilterEmpty = filter !== "all" && bySource[filter]?.length === 0 && !isEmpty;

  return {
    navHTML: navHTML(bySource, filter),
    errorsHTML: covered.filter((key) => !bySource[key]).map(errorHTML).join(""),
    gridHTML: showFilterEmpty
      ? `<li class="cert-filter-empty">No ${SOURCES[filter].label.toLowerCase()} certificates yet.</li>`
      : certificates.map(certificateCardHTML).join(""),
    isEmpty,
  };
}
