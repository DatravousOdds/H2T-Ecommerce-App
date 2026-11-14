// Self-check for who scripts/sendOutreach.js emails: node scripts/checkOutreach.js
// It decides who gets marketing email (opt-in only per privacy.html), so the
// rule gets a check even though the rest of the repo has no tests.
const assert = require("assert");
const { isOptedIn, pickTemplate } = require("./sendOutreach");

// Opt-in: the Newsletter toggle wins; the signup checkbox counts only while the toggle is unset
assert.strictEqual(isOptedIn({ notification: true }), true);
assert.strictEqual(isOptedIn({ notification: false, appSettings: { newsletter: true } }), true);
assert.strictEqual(isOptedIn({ notification: true, appSettings: { newsletter: false } }), false);
assert.strictEqual(isOptedIn({ notification: true, appSettings: {} }), true);
assert.strictEqual(isOptedIn({ notification: false }), false);
assert.strictEqual(isOptedIn({}), false);

const user = { email: "a@gmail.com", notification: true };
assert.strictEqual(pickTemplate(user, false), "FIRST_LISTING_NUDGE");
assert.strictEqual(pickTemplate(user, true), "SELLER_FEEDBACK");

// Skipped: not opted in, test accounts, no email, already sent
assert.strictEqual(pickTemplate({ email: "a@gmail.com" }, true), null);
assert.strictEqual(pickTemplate({ ...user, email: "Test1@Example.com" }, false), null);
assert.strictEqual(pickTemplate({ notification: true }, false), null);
assert.strictEqual(pickTemplate({ ...user, outreach: { firstListing2026SentAt: new Date() } }, false), null);

console.log("outreach self-check passed");
