// Send sample versions of the email templates to an inbox so they can be
// checked in real mail clients before going live.
//
//   node scripts/sendTestEmail.js you@example.com                 # every template
//   node scripts/sendTestEmail.js you@example.com ORDER_CONFIRMATION
//
// Needs RESEND_API_KEY in .env (same key server.js uses).
require("dotenv").config();
const { Resend } = require("resend");
const { notificationTemplates } = require("../services/emailTemplates");

const SAMPLE_DATA = {
  ACCOUNT_CREATED: { firstName: "Datravous" },
  PASSWORD_RESET: { firstName: "Datravous", resetLink: "https://hexxo.store/login" },
  ORDER_CONFIRMATION: {
    firstName: "Datravous",
    orderId: "HX-10482",
    orderDetails: [
      { name: "Air Jordan 4 Retro 'Military Blue'", quantity: 1, price: 285 },
      { name: "Chrome Hearts Cemetery Cross Tee", quantity: 1, price: 140 },
    ],
  },
  SHIPPING_UPDATE: { firstName: "Datravous", orderId: "HX-10482", trackingLink: "https://hexxo.store/track-order" },
  SHIPPING_REMINDER: { firstName: "Datravous", orderId: "HX-10482", trackingLink: "https://hexxo.store/track-order" },
  NEW_SIGNUP: { firstName: "Datravous", email: "newuser@example.com" },
  NEW_SALE: { itemName: "Air Jordan 4 Retro 'Military Blue'", salePrice: 285, orderId: "HX-10482", buyerEmail: "buyer@example.com" },
  AUTH_REQUEST_QUEUED: { itemLabel: "Bape Shark Full Zip Hoodie", requestId: "AR-2291" },
  CONTACT_FORM_SUBMISSION: {
    name: "Jordan Lee",
    email: "jordan@example.com",
    subject: "Question about authentication",
    message: "Hey! How long does Tier 1 authentication usually take?\n\nThanks!",
  },
};

async function main() {
  const [to, only] = process.argv.slice(2);
  if (!to) {
    console.error("Usage: node scripts/sendTestEmail.js <to-email> [TEMPLATE_TYPE]");
    process.exit(1);
  }
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set (add it to .env).");
    process.exit(1);
  }

  const types = only ? [only] : Object.keys(SAMPLE_DATA);
  const resend = new Resend(process.env.RESEND_API_KEY);

  for (const type of types) {
    const build = notificationTemplates[type];
    if (!build) {
      console.error(`Unknown template type: ${type}`);
      process.exitCode = 1;
      continue;
    }
    const { subject, html } = build(SAMPLE_DATA[type]);
    const { error } = await resend.emails.send({
      from: "noreply@hexxo.store",
      to,
      subject: `[TEST] ${subject}`,
      html,
    });
    console.log(error ? `✗ ${type}: ${error.message}` : `✓ ${type} sent`);
    if (error) process.exitCode = 1;
  }
}

main();
