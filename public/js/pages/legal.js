// Shared behavior for legal pages (Terms, Privacy Policy): section jump on
// mobile, scrollspy for the sticky table of contents, and back-to-top.
//
// Legal pages load this instead of home.js, which runs the homepage's
// product queries on load -- wasted Firestore reads on a page that shows
// no products.

import { initCartDrawer } from '../components/cartDrawer.js';

initCartDrawer();

// Mobile: the <select> stands in for the sticky TOC
const tocSelect = document.getElementById('tocSelect');
tocSelect?.addEventListener('change', () => {
  document.getElementById(tocSelect.value)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Desktop: highlight the TOC link for the section currently in view
const tocLinks = Array.from(document.querySelectorAll('#toc a'));
const sections = tocLinks.map((link) => document.getElementById(link.dataset.target));

const setActive = (id) => {
  tocLinks.forEach((link) => link.classList.toggle('active', link.dataset.target === id));
};

const spy = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) setActive(entry.target.id);
  });
}, { rootMargin: '-110px 0px -70% 0px', threshold: 0 });

sections.forEach((section) => section && spy.observe(section));

const backToTop = document.getElementById('backToTop');
if (backToTop) {
  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('show', window.scrollY > 480);
  }, { passive: true });
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}
