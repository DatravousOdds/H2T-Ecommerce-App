"use strict";

// Adds `days` weekdays (Mon-Fri) to `date`, keeping the time of day. Counted
// in UTC so the result doesn't shift with the server's local timezone.
// shortcut: holidays count as business days, add a holiday list if a
// reapply date landing on one ever matters.
function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;

  while (added < days) {
    result.setUTCDate(result.getUTCDate() + 1);
    const weekday = result.getUTCDay();
    if (weekday !== 0 && weekday !== 6) added++;
  }

  return result;
}

module.exports = { addBusinessDays };

// Self-check: node services/businessDays.js
if (require.main === module) {
  const assert = require("assert");
  const plus3 = (iso) => addBusinessDays(new Date(iso), 3).toISOString();

  // Friday -> Wednesday: the weekend is skipped, not counted
  assert.strictEqual(plus3("2026-10-16T15:00:00.000Z"), "2026-10-21T15:00:00.000Z");
  // Monday -> Thursday: no weekend in between
  assert.strictEqual(plus3("2026-10-12T15:00:00.000Z"), "2026-10-15T15:00:00.000Z");
  // Saturday -> Wednesday: a weekend start counts from Monday
  assert.strictEqual(plus3("2026-10-17T15:00:00.000Z"), "2026-10-21T15:00:00.000Z");

  console.log("businessDays self-check passed");
}
