// Homepage brand carousels. Each <section data-brand-carousel="<key>"> picks
// its data, card renderer and end card from CAROUSELS below, so another
// carousel is one config entry plus markup, no new behavior code.
// renderUpcomingBrandCard() is exported on its own so /shop/brands.html's
// #upcoming grid can render the exact same card instead of keeping a second
// copy of the markup in sync.

import { fetchUpcomingBrands } from "../core/upcomingBrands.js";
import { POPULAR_BRANDS } from "../core/popularBrands.js";
import { brandLogoUrl } from "../core/brandLogos.js";

// Home carousels show at most this many brand cards, then an end card that
// links to the full list. Applied at render rather than in the data, because
// brands.html's View All grid reads the same data module and needs all of it.
const MAX_VISIBLE = 7;

// Same slug rules as brands.js's slugify() -- shop.html?brand= re-normalizes
// whatever it gets, so this only needs to be readable, not exact.
function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function brandHref(name) {
  return `/shop/shop.html?brand=${encodeURIComponent(slugify(name))}`;
}

// Type-only tile for Upcoming brands without a photo. Seller brand names run
// up to 60 chars, which overflow the card at display size, so long ones get a
// smaller size (24 chars ~ the most that fits in 2-3 lines at full size).
function renderWordmark(name) {
  const longClass = name.length > 24 ? " brand-card__wordmark--long" : "";
  return `<span class="brand-card__wordmark${longClass}" aria-hidden="true">${escapeHtml(name)}</span>`;
}

// Placeholder cover for Heavy Hitters until a brand has a cover photo: one of
// the 6 palettes in brandCarousel.css, chosen by card position so neighbors
// never share a color, with the brand name on it. The Logo.dev logo (if any)
// sits on top and hides the name; the name is what's left without one.
function renderBrandPlaceholder(name, index) {
  return `<span class="brand-card__placeholder" data-tone="${index % 6}" aria-hidden="true">${escapeHtml(name)}</span>`;
}

// The whole card is one <a> and the "Shop the brand" CTA is a <span> inside
// it, not a second link -- nested links are invalid HTML, and one big target
// is easier to tap than a small button over an image.
export function renderUpcomingBrandCard(brand) {
  const name = escapeHtml(brand.name);
  const handle = escapeHtml(brand.founderHandle);
  const category = escapeHtml(brand.category);

  return `
    <a class="brand-card" href="${brandHref(brand.name)}">
      <div class="brand-card__media">
        ${brand.image
          ? `<img src="${escapeHtml(brand.image)}" alt="" width="400" height="500" loading="lazy" decoding="async">`
          : renderWordmark(brand.name)}
      </div>
      ${brand.isNew ? '<span class="brand-card__badge">New</span>' : ""}
      <div class="brand-card__body">
        <p class="brand-card__category">${category}</p>
        <h3 class="brand-card__name">${name}</h3>
        <p class="brand-card__founder">by @${handle}</p>
        <span class="brand-card__cta">Shop the brand <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
      </div>
    </a>
  `;
}

// Same card shell as the upcoming one (gradient, overlay CTA, hover), but
// square and name-first: these are navigation shortcuts to brands people
// already know, so there's no founder/NEW badge. Without a cover photo it
// shows the brand's Logo.dev logo: a blurred copy fills the card with the
// brand's colors and a crisp copy sits above the text. The placeholder tile
// (with the name) is what's left if there's no logo (e.g. Jordan) or it fails.
// data-brand is the hook listing counts will attach to later.
function renderPopularBrandCard(brand, index) {
  const name = escapeHtml(brand.name);
  const logoUrl = brand.image ? null : brandLogoUrl(brand.name, 512);
  const media = brand.image
    ? `<img src="${escapeHtml(brand.image)}" alt="" width="400" height="400" loading="lazy" decoding="async">`
    : `${renderBrandPlaceholder(brand.name, index)}
       ${logoUrl ? `<img class="brand-card__logo-backdrop" src="${logoUrl}" alt="" width="512" height="512" loading="lazy" decoding="async">
       <img class="brand-card__logo" src="${logoUrl}" alt="" width="512" height="512" loading="lazy" decoding="async">` : ""}`;

  return `
    <a class="brand-card brand-card--popular" href="${brandHref(brand.name)}" data-brand="${name}">
      <div class="brand-card__media">${media}</div>
      <div class="brand-card__body">
        <p class="brand-card__category">${escapeHtml(brand.subtitle)}</p>
        <h3 class="brand-card__name">${name}</h3>
        <span class="brand-card__cta">Shop ${name} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
      </div>
    </a>
  `;
}

// The "view all" stop at the end of the scroll, so someone who swiped
// through every card lands on a next step instead of a dead end.
function renderEndCard({ label, href }) {
  return `
    <a class="brand-carousel__end-card" href="${href}">
      <span class="brand-carousel__end-icon" aria-hidden="true"><i class="fa-solid fa-arrow-right"></i></span>
      <span class="brand-carousel__end-label">${escapeHtml(label)}</span>
    </a>
  `;
}

const CAROUSELS = {
  upcoming: {
    loadBrands: fetchUpcomingBrands,
    renderCard: renderUpcomingBrandCard,
    endCard: { label: "Discover all upcoming brands", href: "/shop/brands.html#upcoming" },
  },
  popular: {
    loadBrands: async () => POPULAR_BRANDS,
    renderCard: renderPopularBrandCard,
    endCard: { label: "See all brands", href: "/shop/brands.html" },
  },
};

// Arrows page by whole cards, and the section carries data-at-start /
// data-at-end / data-overflowing so CSS can disable, hide and fade from the
// same state the buttons use -- one source, so they can't disagree.
function initArrows(root, track) {
  const prevButton = root.querySelector("[data-carousel-prev]");
  const nextButton = root.querySelector("[data-carousel-next]");

  // Re-measured on every click instead of cached, so it stays right after a
  // resize or when the mobile breakpoint changes the card width.
  const scrollByPage = (direction) => {
    const item = track.firstElementChild;
    if (!item) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const step = item.getBoundingClientRect().width + gap;
    const perPage = Math.max(1, Math.floor(track.clientWidth / step));
    // No `behavior` passed: CSS scroll-behavior decides, so the
    // reduced-motion media query in brandCarousel.css makes this instant.
    track.scrollBy({ left: direction * perPage * step });
  };

  // 1px tolerance: scrollLeft can be fractional on high-DPI screens, so an
  // exact comparison might never report "at end".
  const updateEdges = () => {
    const maxScroll = track.scrollWidth - track.clientWidth;
    const atStart = track.scrollLeft <= 1;
    const atEnd = track.scrollLeft >= maxScroll - 1;

    root.toggleAttribute("data-overflowing", maxScroll > 1);
    root.toggleAttribute("data-at-start", atStart);
    root.toggleAttribute("data-at-end", atEnd);
    if (prevButton) prevButton.disabled = atStart;
    if (nextButton) nextButton.disabled = atEnd;
  };

  // scroll fires many times per frame; this batches it to at most one
  // updateEdges() per frame.
  let frameId = 0;
  const scheduleUpdate = () => {
    if (frameId) return;
    frameId = requestAnimationFrame(() => {
      frameId = 0;
      updateEdges();
    });
  };

  prevButton?.addEventListener("click", () => scrollByPage(-1));
  nextButton?.addEventListener("click", () => scrollByPage(1));
  track.addEventListener("scroll", scheduleUpdate, { passive: true });
  // The track's width changes with the viewport, which changes whether it
  // overflows at all (e.g. wide screens where every card fits).
  if ("ResizeObserver" in window) new ResizeObserver(scheduleUpdate).observe(track);

  updateEdges();
}

// Cards fade up once, the first time the section scrolls into view.
// .reveal-ready (which hides them) is only added here, so if this never runs
// -- script error, no IntersectionObserver, reduced motion -- they just show.
function initReveal(root) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !("IntersectionObserver" in window)) return;

  root.classList.add("reveal-ready");
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    root.classList.add("is-visible");
    observer.disconnect();
  }, { threshold: 0.2 });
  observer.observe(root);
}

async function initBrandCarousel(root) {
  const config = CAROUSELS[root.dataset.brandCarousel];
  const track = root.querySelector("[data-brand-track]");
  if (!config || !track) return;

  // No brands (e.g. none published yet, or the request failed) = no section,
  // not an empty carousel with a dangling "View all"
  const brands = await config.loadBrands();
  root.hidden = brands.length === 0;
  if (root.hidden) return;

  // --i is each item's position, used by the CSS reveal to stagger delays
  const items = brands
    .slice(0, MAX_VISIBLE)
    .map((brand, i) => config.renderCard(brand, i))
    .concat(renderEndCard(config.endCard));

  track.innerHTML = items
    .map((html, i) => `<li class="brand-carousel__item" style="--i: ${i}">${html}</li>`)
    .join("");

  // fallback=404 means Logo.dev has no logo for that domain -- drop the
  // <img> so the wordmark underneath shows instead of a broken image
  track.querySelectorAll(".brand-card__logo").forEach((img) => {
    // the backdrop is the same URL, so it failed too -- drop both
    img.addEventListener("error", () => {
      img.parentElement.querySelector(".brand-card__logo-backdrop")?.remove();
      img.remove();
    }, { once: true });
  });

  initArrows(root, track);
  initReveal(root);
}

document.querySelectorAll("[data-brand-carousel]").forEach(initBrandCarousel);
