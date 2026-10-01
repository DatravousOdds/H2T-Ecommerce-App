// Homepage hero carousel: crossfades between .home-hero__slide elements,
// auto-advances, pauses on hover/focus, and handles the seller sign-up form.

const AUTO_ADVANCE_MS = 6000;
const SWIPE_MIN_PX = 50;
const SIGNUP_EMAIL_KEY = "hexxoSignupEmail";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function initHeroCarousel(root) {
  const slides = [...root.querySelectorAll(".home-hero__slide")];
  const dotsContainer = root.querySelector("[data-hero-dots]");
  const prevButton = root.querySelector("[data-hero-prev]");
  const nextButton = root.querySelector("[data-hero-next]");
  if (slides.length < 2 || !dotsContainer) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let index = 0;
  let timerId = null;
  // Separate flags so leaving with the mouse doesn't resume while the
  // keyboard focus (e.g. typing in the email field) is still inside.
  let hovered = false;
  let focused = false;

  const dots = slides.map((_, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "home-hero__dot";
    dot.setAttribute("aria-label", `Slide ${i + 1}`);
    dot.addEventListener("click", () => {
      goTo(i);
      start();
    });
    dotsContainer.appendChild(dot);
    return dot;
  });

  function render() {
    slides.forEach((slide, i) => {
      const active = i === index;
      slide.classList.toggle("is-active", active);
      // aria-hidden hides inactive slides from screen readers; inert also
      // stops their links/inputs from being reachable with Tab.
      slide.toggleAttribute("aria-hidden", !active);
      slide.inert = !active;
      dots[i].setAttribute("aria-current", active ? "true" : "false");
    });
  }

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    render();
  }

  function stop() {
    clearInterval(timerId);
    timerId = null;
  }

  // Also called after every manual navigation, so the user gets a full 6s
  // on the slide they picked instead of whatever was left on the old timer.
  function start() {
    stop();
    if (hovered || focused || reduceMotion.matches) return;
    timerId = setInterval(() => goTo(index + 1), AUTO_ADVANCE_MS);
  }

  prevButton?.addEventListener("click", () => {
    goTo(index - 1);
    start();
  });
  nextButton?.addEventListener("click", () => {
    goTo(index + 1);
    start();
  });

  // Pointer events filtered to mouse: on phones a tap fires an emulated
  // mouseenter with no matching mouseleave, which would pause rotation
  // until the user tapped somewhere else on the page.
  root.addEventListener("pointerenter", (e) => {
    if (e.pointerType !== "mouse") return;
    hovered = true;
    stop();
  });
  root.addEventListener("pointerleave", (e) => {
    if (e.pointerType !== "mouse") return;
    hovered = false;
    start();
  });

  // Swipe left/right on touch screens (the arrows are hidden on mobile).
  // Only a mostly-horizontal drag counts, so vertical page scrolling
  // through the hero never changes the slide.
  let touchStartX = null;
  let touchStartY = null;
  root.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );
  root.addEventListener(
    "touchend",
    (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      touchStartX = null;
      if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy)) return;
      goTo(index + (dx < 0 ? 1 : -1));
      start();
    },
    { passive: true }
  );
  root.addEventListener("focusin", () => {
    focused = true;
    stop();
  });
  root.addEventListener("focusout", (e) => {
    if (root.contains(e.relatedTarget)) return;
    focused = false;
    start();
  });
  reduceMotion.addEventListener("change", start);

  render();
  start();
}

function initSignupForm(form) {
  const input = form.querySelector("input[type='email']");
  const error = document.getElementById("heroSignupError");
  if (!input || !error) return;

  function showError(message) {
    input.setAttribute("aria-invalid", "true");
    error.textContent = message;
    error.hidden = false;
  }

  function clearError() {
    input.removeAttribute("aria-invalid");
    error.hidden = true;
  }

  input.addEventListener("input", clearError);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = input.value.trim();

    if (!EMAIL_RE.test(email)) {
      showError("Enter a valid email address.");
      input.focus();
      return;
    }

    // Handed to the signup page through sessionStorage rather than a query
    // string, so the address never lands in URLs, server logs or analytics.
    try {
      sessionStorage.setItem(SIGNUP_EMAIL_KEY, email);
    } catch {
      // Storage can be blocked (private mode); signup still works without it.
    }
    window.location.href = "/signup";
  });
}

const hero = document.querySelector(".home-hero");
if (hero) {
  initHeroCarousel(hero);
  const signupForm = hero.querySelector(".home-hero__signup");
  if (signupForm) initSignupForm(signupForm);
}
