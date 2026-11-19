// Self-check for public/js/core/promoCountdown.js: node scripts/checkPromoCountdown.js
const assert = require("assert");

(async () => {
  const { promoCountdownLabel } = await import("../public/js/core/promoCountdown.js");
  const check = (iso, expected) => assert.strictEqual(promoCountdownLabel(Date.parse(iso)), expected, iso);

  check("2026-11-14T20:00:00Z", "48 days left to qualify");
  // Dec 30, 11:59 PM Pacific: one full day plus a minute remains
  check("2026-12-31T07:59:00Z", "2 days left to qualify");
  // Dec 31 Pacific, start and end of the day
  check("2026-12-31T08:00:00Z", "Last day to qualify");
  check("2027-01-01T07:59:59Z", "Last day to qualify");
  // Deadline reached: chip stays hidden
  check("2027-01-01T08:00:00Z", "");
  check("2027-03-01T00:00:00Z", "");

  console.log("promoCountdown self-check passed");
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
