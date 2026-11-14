// Self-check for public/js/core/returnTo.js: node scripts/checkReturnTo.js
// It's security logic (open-redirect guard), so it gets a check even though
// the rest of the frontend has no tests.
const assert = require("assert");

(async () => {
  const { safeReturnTo } = await import("../public/js/core/returnTo.js");
  const origin = "https://hexxo.store";
  const check = (value, expected) => assert.strictEqual(safeReturnTo(value, origin), expected, `returnTo=${value}`);

  // Allowed: paths on this site, with query/hash kept
  check("/brand-onboarding", "/brand-onboarding");
  check("/shop/brands.html#upcoming", "/shop/brands.html#upcoming");
  check("/checkout?step=2", "/checkout?step=2");

  // Blocked: anything that leaves the site, or nothing at all
  check("https://evil.com", "/");
  check("//evil.com", "/");
  check("/\\evil.com", "/");
  check("javascript:alert(1)", "/");
  check("", "/");
  check(null, "/");

  console.log("returnTo self-check passed");
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
