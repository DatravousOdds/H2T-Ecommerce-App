// Where to send someone after login/signup, from a ?returnTo= value.
// Only paths on this site are allowed; anything else falls back to "/" so
// the login page can't be used to bounce people to a phishing site.
//
// Resolving against our own origin and comparing origins catches every way
// to point elsewhere ("https://evil.com", "//evil.com", "/\evil.com",
// "javascript:..."), which a startsWith("/") check alone would miss: browsers
// treat "/\" the same as "//".
export function safeReturnTo(value, origin = window.location.origin) {
  if (!value) return "/";

  try {
    const url = new URL(value, origin);
    if (url.origin !== origin) return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}
