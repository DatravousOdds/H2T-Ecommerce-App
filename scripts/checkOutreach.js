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
const now = new Date("2026-11-14T00:00:00Z");
assert.strictEqual(pickTemplate(user, false, now), "FIRST_LISTING_NUDGE");
assert.strictEqual(pickTemplate(user, true, now), "SELLER_FEEDBACK");

// Skipped: not opted in, test accounts, no email, already sent
assert.strictEqual(pickTemplate({ email: "a@gmail.com" }, true), null);
assert.strictEqual(pickTemplate({ ...user, email: "Test1@Example.com" }, false), null);
assert.strictEqual(pickTemplate({ notification: true }, false), null);
assert.strictEqual(pickTemplate({ ...user, outreach: { firstListing2026SentAt: new Date() } }, false), null);

// The promo nudge stops at the deadline; the feedback email does not
const before = new Date("2026-12-31T12:00:00Z"), after = new Date("2027-01-02T00:00:00Z");
assert.strictEqual(pickTemplate(user, false, before), "FIRST_LISTING_NUDGE");
assert.strictEqual(pickTemplate(user, false, after), null);
assert.strictEqual(pickTemplate(user, true, after), "SELLER_FEEDBACK");

// Marketing templates must not be reachable through templateBuilder (POST /send/update)
const { templateBuilder, marketingTemplates } = require("../services/emailTemplates");
for (const type of Object.keys(marketingTemplates)) {
  assert.strictEqual(templateBuilder(type, { unsubscribeEmail: "a@b.co" }), null, type);
  assert.throws(() => marketingTemplates[type]({ firstName: "x" }), /unsubscribeEmail/, type);
}

console.log("outreach self-check passed");
