// 2027 zero-fee promo deadline: 11:59 PM Pacific on Dec 31, 2026.
// Same instant as ZERO_FEE_2027_START_MS in server.js; change both together.
const CUTOFF_MS = Date.parse("2027-01-01T08:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

// Text for the hero's deadline chip, or "" once the deadline has passed.
export function promoCountdownLabel(now = Date.now()) {
  const days = Math.ceil((CUTOFF_MS - now) / DAY_MS);
  if (days <= 0) return "";
  return days === 1 ? "Last day to qualify" : `${days} days left to qualify`;
}
