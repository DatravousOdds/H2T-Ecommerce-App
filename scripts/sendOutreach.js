// One-off outreach to opted-in users: a "list your first item" email to those
// with no published listing, a feedback email to those who have listed.
//
//   node scripts/sendOutreach.js          # dry run: prints who would get what
//   node scripts/sendOutreach.js --send   # sends, then stamps each profile
//
// Preview the emails first: node scripts/sendTestEmail.js you@x.com FIRST_LISTING_NUDGE
// Needs RESEND_API_KEY, ADMIN_EMAIL and FIREBASE_CONFIG in .env.
// NOTE: local .env points at the production Firestore, so --send is live.
require("dotenv").config();
const { marketingTemplates } = require("../services/emailTemplates");

// Same cutoff as scripts/snapshotZeroFee2027.js: Dec 31, 2026 11:59 PM Pacific.
const PROMO_DEADLINE = new Date("2027-01-01T07:59:59Z");

// privacy.html: marketing email is opt-in only, and the Newsletter toggle
// turns it off. So an explicit toggle value wins; the signup checkbox only
// counts while the toggle has never been touched.
function isOptedIn(profile) {
  const newsletter = profile.appSettings?.newsletter;
  return newsletter === true || (newsletter == null && profile.notification === true);
}

// Which template a profile gets, or null to skip it.
function pickTemplate(profile, hasPublishedListing, now = new Date()) {
  const email = String(profile.email || "").toLowerCase();
  // example.com is our test accounts; they'd bounce and hurt sender reputation.
  if (!email.includes("@") || email.endsWith("@example.com")) return null;
  if (!isOptedIn(profile)) return null;
  if (profile.outreach?.firstListing2026SentAt) return null; // already sent
  if (hasPublishedListing) return "SELLER_FEEDBACK";
  return now > PROMO_DEADLINE ? null : "FIRST_LISTING_NUDGE"; // the nudge is built on the promo; never send it expired
}

async function run() {
  const send = process.argv.includes("--send");
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) throw new Error("ADMIN_EMAIL is not set (replies and unsubscribes go there).");
  if (send && !process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set.");

  const { admin, db } = require("../firebase").initializeFirebase();
  // shortcut: full scans filtered in memory, fine for tens of users; switch to paged queries if this is reused at scale.
  const [profiles, listings] = await Promise.all([
    db.collection("userProfiles").select("email", "firstName", "notification", "appSettings.newsletter", "outreach").get(),
    db.collection("listings").select("userId", "status").get(),
  ]);

  // Drafts don't count as listed (they don't count toward the promo either).
  const published = new Set(listings.docs.filter((d) => d.data().status !== "draft").map((d) => d.data().userId));

  const queue = [];
  for (const doc of profiles.docs) {
    const profile = doc.data();
    const type = pickTemplate(profile, published.has(doc.id));
    if (type) queue.push({ ref: doc.ref, type, email: profile.email, firstName: profile.firstName });
  }

  console.log(`${queue.length} to send out of ${profiles.size} profiles:`);
  for (const { type, email } of queue) console.log(`  ${type.padEnd(20)} ${email}`);
  if (!send) return console.log("Dry run -- nothing sent. Re-run with --send to send.");

  const { Resend } = require("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  for (const { ref, type, email, firstName } of queue) {
    const { subject, html } = marketingTemplates[type]({ firstName, unsubscribeEmail: adminEmail });
    const { error } = await resend.emails.send({
      from: "noreply@hexxo.store", to: email, replyTo: adminEmail, subject, html,
      // Lets Gmail/Yahoo show their own unsubscribe control.
      headers: { "List-Unsubscribe": `<mailto:${adminEmail}?subject=Unsubscribe>` },
    });
    if (error) {
      console.error(`✗ ${email}: ${error.message}`);
      process.exitCode = 1;
    } else {
      // Stamp right after each send so a re-run can never email someone twice.
      // If the stamp itself fails this throws and stops the run on purpose.
      await ref.update({ "outreach.firstListing2026SentAt": admin.firestore.FieldValue.serverTimestamp() });
      console.log(`✓ ${email}`);
      sent++;
    }
    await new Promise((resolve) => setTimeout(resolve, 600)); // Resend allows ~2 requests/second
  }
  console.log(`Sent ${sent} of ${queue.length}.`);
}

if (require.main === module) {
  run().then(() => process.exit(), (error) => {
    console.error("Outreach failed:", error.message);
    process.exit(1);
  });
}

module.exports = { isOptedIn, pickTemplate };
