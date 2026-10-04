// Google Analytics loader. Replaces the inline gtag snippet each page used to
// carry, so the privacy check lives in one place.
//
// Privacy Policy section 05 promises that a Global Privacy Control signal is
// treated as an opt-out, so when the browser sends one, GA never loads: no
// gtag.js request, no _ga cookies, nothing sent to Google.

const GA_MEASUREMENT_ID = 'G-D58F3PLGPS';

if (!navigator.globalPrivacyControl) {
  window.dataLayer = window.dataLayer || [];
  // gtag.js expects the raw `arguments` object pushed onto dataLayer, which
  // is why this stays a regular function rather than an arrow function.
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID);

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}
