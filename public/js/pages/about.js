import { checkUserStatus } from "../auth/auth.js";

// "Start selling" links to /seller, which bounces logged-out visitors to a
// generic login page (seller.js replaces the history entry, so Back skips
// /about too). Most About-page visitors are new, so send logged-out ones to
// signup instead. The /seller href stays in the HTML as the fallback if
// this script fails or the click lands before the auth check resolves.
//
// checkUserStatus() is cached in auth.js and nav.js already calls it, so
// this reuses the same in-flight check rather than starting a second one.
const updateSellCtas = async () => {
  let user = null;
  try {
    user = await checkUserStatus();
  } catch (error) {
    // Leave the /seller fallback in place; seller.js handles auth itself.
    console.error("About page: auth check failed", error);
    return;
  }

  if (user) return;

  document.querySelectorAll("[data-sell-cta]").forEach((link) => {
    link.href = "/signup";
  });
};

updateSellCtas();

// ---------- KPI count-up ----------
// Numbers come from /api/about-stats (live Firestore counts). The fetch
// starts right away; the count-up waits until the band scrolls into view.
// Only textContent changes, once per animation frame, on three elements.
const COUNT_UP_MS = 1200;
const formatKpi = new Intl.NumberFormat("en-US", { notation: "compact" }).format;
const easeOutCubic = (t) => 1 - (1 - t) ** 3;

const countUp = (el, target) => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || target === 0) {
    el.textContent = formatKpi(target);
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min((now - start) / COUNT_UP_MS, 1);
    el.textContent = formatKpi(Math.round(target * easeOutCubic(progress)));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

const initKpis = async () => {
  const band = document.querySelector(".about-kpis");
  if (!band) return;

  let stats;
  try {
    const res = await fetch("/api/about-stats");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    stats = await res.json();
  } catch (error) {
    // Leave the "—" placeholders rather than show a made-up number.
    console.error("About page: stats unavailable", error);
    return;
  }

  // Screen readers can read the band without scrolling it into view, so they
  // get the final value right away; the animated digits are aria-hidden.
  const counters = [...band.querySelectorAll("[data-kpi]")].map((el) => {
    const target = Number(stats[el.dataset.kpi]) || 0;
    const shown = document.createElement("span");
    shown.setAttribute("aria-hidden", "true");
    shown.textContent = "0";
    const spoken = document.createElement("span");
    spoken.className = "visually-hidden";
    spoken.textContent = formatKpi(target);
    el.replaceChildren(shown, spoken);
    return { shown, target };
  });
  const run = () => counters.forEach(({ shown, target }) => countUp(shown, target));

  if (!("IntersectionObserver" in window)) return run();

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    run();
  }, { threshold: 0.4 });
  observer.observe(band);
};

initKpis();
