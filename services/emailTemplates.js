"use strict";

// Transactional + admin email templates, rendered by templateBuilder() and
// sent through Resend in server.js.
//
// Email clients are not browsers: Gmail/Outlook strip <style> blocks
// inconsistently, ignore flexbox/grid, and Outlook renders with Word. So the
// markup below is deliberately old-school -- nested tables, inline styles,
// bgcolor attributes, and a "bulletproof" table button -- with a small
// <style> block only for progressive enhancements (mobile padding, hover).
//
// Brand tokens mirror public/css/global.css :root.
const BRAND = {
  ink: '#070707',            // --color-text-primary / --color-background-secondary
  red: '#f30c1e',            // --color-button-primary
  muted: '#7d7d7d',          // --color-text-muted
  body: '#3a3a3a',
  border: '#e5e7eb',         // --color-border-primary
  canvas: '#f4f4f2',
  panel: '#f7f7f5',
  success: '#16803c',        // --color-status-success
  successLight: '#f0fdf4',   // --color-status-success-light
  font: "'Space Grotesk', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  uiFont: "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif",
};

const SITE_URL = 'https://hexxo.store';

// Every value interpolated into a template is escaped. Most inputs are
// internal (Firebase Auth, Stripe, this app's DB), but some are not:
// displayName is user-editable, /send/notification forwards client-supplied
// metadata, AUTH_REQUEST_QUEUED is client-triggerable, and
// CONTACT_FORM_SUBMISSION is fed by a public form -- unescaped, any of those
// could render HTML in a customer's or the admin's inbox.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Only allow http(s) links into href attributes, so a bad value can't become
// a javascript: URL.
function safeUrl(url, fallback = SITE_URL) {
  const value = String(url ?? '').trim();
  return /^https?:\/\//i.test(value) ? escapeHtml(value) : fallback;
}

function formatMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : escapeHtml(value);
}

// ---------- Components ----------

function eyebrow(text) {
  return `<p style="margin:0 0 12px; font:700 12px/1 ${BRAND.uiFont}; letter-spacing:0.16em; text-transform:uppercase; color:${BRAND.red};">${text}</p>`;
}

function heading(text) {
  return `<h1 class="h1" style="margin:0 0 16px; font:700 28px/1.2 ${BRAND.font}; letter-spacing:-0.01em; color:${BRAND.ink};">${text}</h1>`;
}

function paragraph(html, { muted = false, small = false } = {}) {
  const size = small ? '14px/1.6' : '16px/1.6';
  const color = muted ? BRAND.muted : BRAND.body;
  return `<p style="margin:0 0 16px; font:400 ${size} ${BRAND.uiFont}; color:${color};">${html}</p>`;
}

// Table-based so it keeps its padding and colour in Outlook.
// block: full-width with a larger label, for the single main action of a
// marketing email (19px bold keeps white-on-red above the large-text contrast bar).
function button(label, href, { block = false } = {}) {
  const link = block
    ? 'display:block; padding:16px 28px; text-align:center; font:700 19px/1'
    : 'display:inline-block; padding:14px 28px; font:700 16px/1';
  return `
    <table role="presentation"${block ? ' width="100%"' : ''} cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
      <tr>
        <td class="btn" bgcolor="${BRAND.red}" style="border-radius:6px; background:${BRAND.red};">
          <a href="${href}" target="_blank" style="${link} ${BRAND.uiFont}; color:#ffffff; text-decoration:none; border-radius:6px;">${label}&nbsp;&rarr;</a>
        </td>
      </tr>
    </table>`;
}

// Fallback for when the button is blocked or the image-only client hides it.
function linkFallback(href) {
  return paragraph(
    `Button not working? Paste this link into your browser:<br><a href="${href}" style="color:${BRAND.ink}; word-break:break-all;">${href}</a>`,
    { muted: true, small: true }
  );
}

function statusPill(text) {
  return `<span style="display:inline-block; padding:6px 12px; border-radius:999px; background:${BRAND.successLight}; color:${BRAND.success}; font:700 12px/1 ${BRAND.uiFont}; letter-spacing:0.08em; text-transform:uppercase;">&#10003;&nbsp;${text}</span>`;
}

// Label/value rows in a soft panel -- used for order refs and admin details.
// spaceBetween: label pinned left, value pinned right (the email-safe version
// of justify-content: space-between -- flexbox isn't reliable in mail clients).
function detailCard(rows, { spaceBetween = false } = {}) {
  const labelWidth = spaceBetween ? '' : ' width:38%;';
  const valueAlign = spaceBetween ? ' align="right"' : '';
  const body = rows.map(([label, value], i) => `
      <tr>
        <td style="padding:12px 16px; ${i ? `border-top:1px solid ${BRAND.border};` : ''} font:500 13px/1.4 ${BRAND.uiFont}; color:${BRAND.muted};${labelWidth} vertical-align:top;">${label}</td>
        <td${valueAlign} style="padding:12px 16px; ${i ? `border-top:1px solid ${BRAND.border};` : ''} font:600 14px/1.4 ${BRAND.uiFont}; color:${BRAND.ink}; word-break:break-word;${spaceBetween ? ' text-align:right;' : ''}">${value}</td>
      </tr>`).join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px; background:${BRAND.panel}; border:1px solid ${BRAND.border}; border-radius:8px; border-collapse:separate;">${body}
    </table>`;
}

function orderTable(items) {
  const list = Array.isArray(items) ? items : [];
  const total = list.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0);
  const rows = list.map(item => `
      <tr>
        <td style="padding:14px 0; border-bottom:1px solid ${BRAND.border}; font:600 15px/1.4 ${BRAND.uiFont}; color:${BRAND.ink};">
          ${escapeHtml(item.name)}
          <div style="font:400 13px/1.4 ${BRAND.uiFont}; color:${BRAND.muted}; margin-top:2px;">Qty ${escapeHtml(item.quantity)} &times; ${formatMoney(item.price)}</div>
        </td>
        <td align="right" style="padding:14px 0; border-bottom:1px solid ${BRAND.border}; font:600 15px/1.4 ${BRAND.uiFont}; color:${BRAND.ink}; white-space:nowrap; vertical-align:top;">${formatMoney((Number(item.quantity) || 0) * (Number(item.price) || 0))}</td>
      </tr>`).join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
      <tr>
        <td style="padding:0 0 8px; border-bottom:2px solid ${BRAND.ink}; font:700 12px/1 ${BRAND.uiFont}; letter-spacing:0.12em; text-transform:uppercase; color:${BRAND.ink};">Item</td>
        <td align="right" style="padding:0 0 8px; border-bottom:2px solid ${BRAND.ink}; font:700 12px/1 ${BRAND.uiFont}; letter-spacing:0.12em; text-transform:uppercase; color:${BRAND.ink};">Amount</td>
      </tr>${rows}
      <tr>
        <td style="padding:16px 0 0; font:700 16px/1 ${BRAND.font}; color:${BRAND.ink};">Total</td>
        <td align="right" style="padding:16px 0 0; font:700 20px/1 ${BRAND.font}; color:${BRAND.ink};">${formatMoney(total)}</td>
      </tr>
    </table>`;
}

function divider() {
  return `<div style="height:1px; line-height:1px; font-size:1px; background:${BRAND.border}; margin:8px 0 24px;">&nbsp;</div>`;
}

function supportNote() {
  return paragraph(
    `Questions? <a href="${SITE_URL}/contact" style="color:${BRAND.ink}; font-weight:600;">Contact our team</a> &mdash; we're happy to help.`,
    { muted: true, small: true }
  );
}

// Black band under the header for marketing emails: red tag, big headline,
// one line of support, and an optional strip of [value, label] stats.
function hero({ tag, title, sub, stats = [] }) {
  const cells = stats.map(([value, label], i) => `
        <td align="center" width="${Math.floor(100 / stats.length)}%" style="padding:16px 4px 0; ${i ? 'border-left:1px solid #2a2a2e;' : ''}">
          <div style="font:700 24px/1.1 ${BRAND.font}; color:#ffffff;">${value}</div>
          <div style="margin-top:6px; font:600 11px/1.2 ${BRAND.uiFont}; letter-spacing:0.08em; text-transform:uppercase; color:#b9b9c0;">${label}</div>
        </td>`).join('');
  return `
    <span style="display:inline-block; padding:6px 10px; background:${BRAND.red}; font:700 11px/1 ${BRAND.uiFont}; letter-spacing:0.12em; text-transform:uppercase; color:#ffffff;">${tag}</span>
    <h1 class="hero-h1" style="margin:16px 0 12px; font:700 38px/1.05 ${BRAND.font}; letter-spacing:-0.02em; color:#ffffff;">${title}</h1>
    <p style="margin:0; font:400 16px/1.5 ${BRAND.uiFont}; color:#b9b9c0;">${sub}</p>${stats.length ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px; border-top:1px solid #2a2a2e;">
      <tr>${cells}
      </tr>
    </table>` : ''}`;
}

// Numbered [title, detail] rows. The number sits in its own fixed-size cell
// because mail clients ignore flexbox.
function steps(items) {
  const rows = items.map(([title, detail], i) => `
      <tr>
        <td width="34" valign="top" style="padding:0 14px 16px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="34" height="34" align="center" bgcolor="${BRAND.ink}" style="background:${BRAND.ink}; font:700 15px/34px ${BRAND.font}; color:#ffffff;">${i + 1}</td></tr></table>
        </td>
        <td valign="top" style="padding:0 0 16px; font:400 14px/1.5 ${BRAND.uiFont}; color:${BRAND.muted};"><strong style="display:block; font:700 16px/1.4 ${BRAND.uiFont}; color:${BRAND.ink};">${title}</strong>${detail}</td>
      </tr>`).join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">${rows}
    </table>`;
}

// ---------- Shell ----------

// CAN-SPAM needs a postal address in promotional email; same one as privacy.html.
const POSTAL_ADDRESS = 'Hexxo LLC, 9112 Saddlehorn Drive, Apt 201, Fort Worth, TX 76116';

// preheader: the preview line inbox lists show next to the subject.
// audience: 'customer' gets the social row (inside the white card -- the icon
// JPGs have a white background baked in) + "why you got this" line;
// 'admin' gets a compact internal footer; 'marketing' swaps the "why you got
// this" line for the postal address + unsubscribe link (use marketingTemplate).
// heroHtml: optional black band that replaces the red stripe under the header.
function baseTemplate(innerHtml, { preheader = '', audience = 'customer', heroHtml = '', unsubscribeHref = '' } = {}) {
  const reason = audience === 'marketing'
    ? `${POSTAL_ADDRESS}<br>You're getting this because you opted in to Hexxo emails.<br><a href="${unsubscribeHref}" style="display:inline-block; padding:12px 16px; font-size:14px; color:${BRAND.muted};">Unsubscribe</a>`
    : `You're receiving this because you have a Hexxo account.<br>&copy; ${new Date().getFullYear()} Hexxo. All rights reserved.`;
  const social = [
    ['https://x.com/hexxostore?s=11', 'email-icon-x.jpg', 'X'],
    ['https://www.instagram.com/hexxo.store', 'email-icon-instagram.jpg', 'Instagram'],
    ['https://www.tiktok.com/@hexxo.shop', 'email-icon-tiktok.jpg', 'TikTok'],
  ].map(([href, img, alt]) => `
              <a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block; margin:0 6px; text-decoration:none;">
                <img src="${SITE_URL}/images/${img}" width="36" height="36" alt="Hexxo on ${alt}" style="display:block; width:36px; height:36px; border-radius:50%; border:0;">
              </a>`).join('');

  const footer = audience === 'admin'
    ? `<p style="margin:0; font:400 12px/1.6 ${BRAND.uiFont}; color:${BRAND.muted};">Internal notification &middot; sent to Hexxo admins only.</p>`
    : `
            <p style="margin:0 0 6px; font:400 12px/1.6 ${BRAND.uiFont}; color:${BRAND.muted};">
              <a href="${SITE_URL}/shop" style="color:${BRAND.muted};">Shop</a> &nbsp;&middot;&nbsp;
              <a href="${SITE_URL}/track-order" style="color:${BRAND.muted};">Track an order</a> &nbsp;&middot;&nbsp;
              <a href="${SITE_URL}/contact" style="color:${BRAND.muted};">Help</a>
            </p>
            <p style="margin:0; font:400 12px/1.6 ${BRAND.uiFont}; color:${BRAND.muted};">${reason}</p>`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Hexxo</title>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @media (max-width: 620px) {
      .container { width: 100% !important; }
      .px { padding-left: 24px !important; padding-right: 24px !important; }
      .h1 { font-size: 24px !important; }
      .hero-h1 { font-size: 30px !important; }
    }
    .btn a:hover { background: #b91c1c !important; }
  </style>
</head>
<body style="margin:0; padding:0; background:${BRAND.canvas}; -webkit-text-size-adjust:100%;">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.canvas}" style="background:${BRAND.canvas};">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">
          <!-- Header -->
          <tr>
            <td bgcolor="${BRAND.ink}" style="background:${BRAND.ink}; padding:20px 40px; border-radius:12px 12px 0 0;" class="px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <a href="${SITE_URL}/" target="_blank" style="text-decoration:none;">
                      <img src="${SITE_URL}/images/Hexxo_Bg_Removed.png" width="52" height="49" alt="Hexxo" style="display:block; width:52px; height:auto; border:0;">
                    </a>
                  </td>
                  <td align="right" style="font:700 12px/1 ${BRAND.uiFont}; letter-spacing:0.16em; text-transform:uppercase; color:#ffffff;">
                    Buy &middot; Sell &middot; Authenticate
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${heroHtml
            ? `<tr><td bgcolor="${BRAND.ink}" class="px" style="background:${BRAND.ink}; padding:8px 40px 28px;">${heroHtml}</td></tr>`
            : `<tr><td bgcolor="${BRAND.red}" style="background:${BRAND.red}; height:4px; line-height:4px; font-size:4px;">&nbsp;</td></tr>`}
          <!-- Body -->
          <tr>
            <td bgcolor="#ffffff" class="px" style="background:#ffffff; padding:40px 40px 24px; border-radius:0 0 12px 12px;">
              ${innerHtml}${audience === 'admin' ? '' : `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px; border-top:1px solid ${BRAND.border};">
                <tr>
                  <td style="padding-top:16px; vertical-align:middle; font:700 12px/1 ${BRAND.uiFont}; letter-spacing:0.12em; text-transform:uppercase; color:${BRAND.ink};">Follow @hexxo</td>
                  <td align="right" style="padding-top:16px; vertical-align:middle; white-space:nowrap;">${social}
                  </td>
                </tr>
              </table>`}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" class="px" style="padding:28px 40px 8px;">${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Marketing email is opt-in only and must always carry an unsubscribe link
// (privacy.html), so this throws rather than build one without it.
// shortcut: unsubscribe is a mailto the admin actions by hand, swap for a signed one-click /unsubscribe route once the list passes ~100.
function marketingTemplate(innerHtml, { unsubscribeEmail, ...options }) {
  if (!unsubscribeEmail) throw new Error('Marketing emails need unsubscribeEmail');
  return baseTemplate(innerHtml, {
    ...options,
    audience: 'marketing',
    unsubscribeHref: `mailto:${escapeHtml(unsubscribeEmail)}?subject=Unsubscribe`,
  });
}

// ---------- Templates ----------
// Subjects are plain text (not HTML), so they are NOT escaped -- escaping
// would show literal "&amp;" in the inbox.

const notificationTemplates = {
  ACCOUNT_CREATED: ({ firstName }) => ({
    subject: `Welcome to Hexxo, ${firstName}! 🎉`,
    html: baseTemplate(`
      ${eyebrow('Welcome to Hexxo')}
      ${heading(`You're in, ${escapeHtml(firstName)}.`)}
      ${paragraph('Your Hexxo account is officially set up &mdash; welcome aboard!')}
      ${paragraph("Hexxo is built so you can shop trending items with confidence. Every high-value item is authenticated at checkout, so you always know exactly what you're getting.")}
      ${button('Explore trending items', `${SITE_URL}/shop`)}
      ${supportNote()}
    `, { preheader: 'Your account is ready. Start shopping authenticated streetwear and sneakers.' })
  }),

  PASSWORD_RESET: ({ firstName, resetLink }) => {
    const href = safeUrl(resetLink);
    return {
      subject: `Reset your Hexxo password`,
      html: baseTemplate(`
        ${eyebrow('Account security')}
        ${heading('Reset your password')}
        ${paragraph(`Hi ${escapeHtml(firstName)},`)}
        ${paragraph('We received a request to reset your Hexxo password. Tap the button below to choose a new one.')}
        ${button('Reset password', href)}
        ${paragraph("Didn't request this? You can safely ignore this email &mdash; your password won't change.", { muted: true, small: true })}
        ${divider()}
        ${linkFallback(href)}
      `, { preheader: 'Use this link to choose a new Hexxo password.' })
    };
  },

  ORDER_CONFIRMATION: ({ firstName, orderId, orderDetails }) => ({
    subject: `Your Hexxo order #${orderId} is confirmed! ✅`,
    html: baseTemplate(`
      <div style="margin:0 0 20px;">${statusPill('Order confirmed')}</div>
      ${heading('Thanks for your order.')}
      ${paragraph(`Hi ${escapeHtml(firstName)}, your order is locked in. We'll email you again as soon as it ships.`)}
      ${detailCard([['Order number', `#${escapeHtml(orderId)}`]], { spaceBetween: true })}
      ${orderTable(orderDetails)}
      ${button('Track your order', `${SITE_URL}/track-order`)}
      ${supportNote()}
    `, { preheader: `Order #${escapeHtml(orderId)} is confirmed. Here's your receipt.` })
  }),

  SHIPPING_UPDATE: ({ firstName, orderId, trackingLink }) => {
    const href = safeUrl(trackingLink, `${SITE_URL}/track-order`);
    return {
      subject: `Your Hexxo order #${orderId} has shipped! 🚚`,
      html: baseTemplate(`
        ${eyebrow('On its way')}
        ${heading('Your order has shipped.')}
        ${paragraph(`Hi ${escapeHtml(firstName)}, good news &mdash; order <strong style="color:${BRAND.ink};">#${escapeHtml(orderId)}</strong> is on the move. Follow it every step of the way below.`)}
        ${button('Track shipment', href)}
        ${paragraph('Thank you for shopping with Hexxo!', { muted: true, small: true })}
      `, { preheader: `Order #${escapeHtml(orderId)} is on its way.` })
    };
  },

  SHIPPING_REMINDER: ({ firstName, orderId, trackingLink }) => {
    const href = safeUrl(trackingLink, `${SITE_URL}/track-order`);
    return {
      subject: `Reminder: Track your Hexxo order #${orderId} 📦`,
      html: baseTemplate(`
        ${eyebrow('Action needed')}
        ${heading(`Ship order #${escapeHtml(orderId)}`)}
        ${paragraph(`Hi ${escapeHtml(firstName)}, this is a friendly reminder to ship Hexxo order <strong style="color:${BRAND.ink};">#${escapeHtml(orderId)}</strong> within <strong style="color:${BRAND.ink};">5 business days</strong>. Orders that miss the deadline may be canceled automatically.`)}
        ${button('View shipment', href)}
        ${paragraph('Thank you for selling with Hexxo!', { muted: true, small: true })}
      `, { preheader: `Ship order #${escapeHtml(orderId)} within 5 business days.` })
    };
  },

  // --- Admin-facing notifications below (sent to ADMIN_EMAIL, not a customer) ---

  NEW_SIGNUP: ({ firstName, email }) => ({
    subject: `New signup: ${firstName}`,
    html: baseTemplate(`
      ${eyebrow('Admin &middot; New signup')}
      ${heading('A new account was created')}
      ${detailCard([
        ['Name', escapeHtml(firstName)],
        ['Email', escapeHtml(email)],
      ])}
    `, { preheader: `${escapeHtml(firstName)} just joined Hexxo.`, audience: 'admin' })
  }),

  NEW_SALE: ({ itemName, salePrice, orderId, buyerEmail }) => ({
    subject: `💰 New sale: ${itemName} — $${salePrice}`,
    html: baseTemplate(`
      ${eyebrow('Admin &middot; New sale')}
      ${heading(`${formatMoney(salePrice)} sale`)}
      ${detailCard([
        ['Item', escapeHtml(itemName)],
        ['Sale price', formatMoney(salePrice)],
        ['Order ID', escapeHtml(orderId)],
        ['Buyer', escapeHtml(buyerEmail)],
      ])}
    `, { preheader: `${escapeHtml(itemName)} sold for ${formatMoney(salePrice)}.`, audience: 'admin' })
  }),

  AUTH_REQUEST_QUEUED: ({ itemLabel, requestId }) => ({
    subject: `🔍 New authentication request needs review`,
    html: baseTemplate(`
      ${eyebrow('Admin &middot; Authentication')}
      ${heading('New item waiting for review')}
      ${paragraph('A new item was submitted for authentication and is waiting in the queue.')}
      ${detailCard([
        ['Item', escapeHtml(itemLabel)],
        ['Request ID', escapeHtml(requestId)],
      ])}
    `, { preheader: `${escapeHtml(itemLabel)} is in the authentication queue.`, audience: 'admin' })
  }),

  // Fed by the public, unauthenticated /send/contact route.
  CONTACT_FORM_SUBMISSION: ({ name, email, subject, message }) => ({
    subject: `New contact form message: ${subject}`,
    html: baseTemplate(`
      ${eyebrow('Admin &middot; Contact form')}
      ${heading(escapeHtml(subject))}
      ${detailCard([
        ['From', escapeHtml(name)],
        ['Email', `<a href="mailto:${escapeHtml(email)}" style="color:${BRAND.ink};">${escapeHtml(email)}</a>`],
      ])}
      <p style="margin:0 0 8px; font:700 12px/1 ${BRAND.uiFont}; letter-spacing:0.12em; text-transform:uppercase; color:${BRAND.muted};">Message</p>
      <div style="margin:0 0 24px; padding:16px 20px; border-left:3px solid ${BRAND.red}; background:${BRAND.panel}; font:400 15px/1.6 ${BRAND.uiFont}; color:${BRAND.body}; white-space:pre-wrap;">${escapeHtml(message)}</div>
    `, { preheader: `${escapeHtml(name)} sent a message via the contact form.`, audience: 'admin' })
  }),

  // ---- Upcoming Brand onboarding ----
  // brandName, founderHandle, description and reviewerNotes come from
  // applicant or admin input, so they're escaped like everything else.
  // The EIN is never passed to any template: email isn't a safe place for a
  // tax ID, so the admin email only gets hasEin.

  BRAND_APPLICATION_SUBMITTED: ({ brandName, category, description, instagram, website, founderHandle, contactEmail, hasEin, applicationCount, isUpdate }) => ({
    subject: isUpdate ? `Brand application updated: ${brandName}` : `New brand application: ${brandName}`,
    html: baseTemplate(`
      ${eyebrow('Admin &middot; Brand application')}
      ${heading(escapeHtml(brandName))}
      ${paragraph(isUpdate
        ? 'The applicant edited their application while it was waiting for review. These are the current details.'
        : applicationCount > 1
          ? `A previously rejected brand reapplied (attempt ${escapeHtml(applicationCount)}).`
          : 'A new brand applied to be featured in Upcoming Brands.')}
      ${detailCard([
        ['Founder', `@${escapeHtml(founderHandle)} (${escapeHtml(contactEmail)})`],
        ['Category', escapeHtml(category)],
        ['Instagram', `@${escapeHtml(instagram)}`],
        ['Website', website ? escapeHtml(website) : 'None'],
        ['EIN provided', hasEin ? 'Yes' : 'No'],
      ])}
      <p style="margin:0 0 8px; font:700 12px/1 ${BRAND.uiFont}; letter-spacing:0.12em; text-transform:uppercase; color:${BRAND.muted};">Description</p>
      <div style="margin:0 0 24px; padding:16px 20px; border-left:3px solid ${BRAND.red}; background:${BRAND.panel}; font:400 15px/1.6 ${BRAND.uiFont}; color:${BRAND.body}; white-space:pre-wrap;">${escapeHtml(description)}</div>
      ${button('Review application', `${SITE_URL}/admin/brand-review`)}
    `, { preheader: `${escapeHtml(brandName)} applied to Upcoming Brands.`, audience: 'admin' })
  }),

  BRAND_ASSETS_SUBMITTED: ({ brandName, founderHandle }) => ({
    subject: `Brand images ready to review: ${brandName}`,
    html: baseTemplate(`
      ${eyebrow('Admin &middot; Brand images')}
      ${heading(escapeHtml(brandName))}
      ${paragraph(`@${escapeHtml(founderHandle)} uploaded their card image, logo, and cover photo. Check them before the brand goes live.`)}
      ${button('Review images', `${SITE_URL}/admin/brand-review`)}
    `, { preheader: `${escapeHtml(brandName)} uploaded their brand images.`, audience: 'admin' })
  }),

  // Both decision emails link to /brand-onboarding, which always shows the
  // owner's current status and next step, so the link stays right as the
  // flow grows.
  BRAND_APPROVED: ({ brandName, founderHandle, reviewerNotes }) => ({
    subject: `${brandName} is approved for Upcoming Brands`,
    html: baseTemplate(`
      ${eyebrow('Upcoming Brands')}
      ${heading("You're approved.")}
      ${paragraph(`Hi @${escapeHtml(founderHandle)}, good news &mdash; <strong style="color:${BRAND.ink};">${escapeHtml(brandName)}</strong> is approved to be featured in Upcoming Brands on Hexxo.`)}
      ${paragraph('Next step: upload your brand images (a card image, your logo, and a cover photo). We&rsquo;ll check them, then your brand goes live.')}
      ${reviewerNotes ? `<p style="margin:0 0 8px; font:700 12px/1 ${BRAND.uiFont}; letter-spacing:0.12em; text-transform:uppercase; color:${BRAND.muted};">A note from our team</p>
      <div style="margin:0 0 24px; padding:16px 20px; border-left:3px solid ${BRAND.red}; background:${BRAND.panel}; font:400 15px/1.6 ${BRAND.uiFont}; color:${BRAND.body}; white-space:pre-wrap;">${escapeHtml(reviewerNotes)}</div>` : ''}
      ${button('Upload your images', `${SITE_URL}/brand-onboarding`)}
    `, { preheader: `${escapeHtml(brandName)} is approved. Upload your images to go live.` })
  }),

  BRAND_REJECTED: ({ brandName, founderHandle, reviewerNotes, reapplyDate }) => ({
    subject: 'An update on your Hexxo brand application',
    html: baseTemplate(`
      ${eyebrow('Upcoming Brands')}
      ${heading('An update on your application.')}
      ${paragraph(`Hi @${escapeHtml(founderHandle)}, thanks for applying to feature <strong style="color:${BRAND.ink};">${escapeHtml(brandName)}</strong> on Hexxo. We weren&rsquo;t able to approve it this time.`)}
      <p style="margin:0 0 8px; font:700 12px/1 ${BRAND.uiFont}; letter-spacing:0.12em; text-transform:uppercase; color:${BRAND.muted};">A note from our team</p>
      <div style="margin:0 0 24px; padding:16px 20px; border-left:3px solid ${BRAND.red}; background:${BRAND.panel}; font:400 15px/1.6 ${BRAND.uiFont}; color:${BRAND.body}; white-space:pre-wrap;">${escapeHtml(reviewerNotes)}</div>
      ${paragraph(`You can update your application and reapply on or after ${escapeHtml(reapplyDate)} (Central Time).`)}
      ${button('View your application', `${SITE_URL}/brand-onboarding`)}
    `, { preheader: `An update on your ${escapeHtml(brandName)} application.` })
  }),

  BRAND_PUBLISHED: ({ brandName, founderHandle }) => ({
    subject: `${brandName} is live on Hexxo`,
    html: baseTemplate(`
      ${eyebrow('Upcoming Brands')}
      ${heading("You're live.")}
      ${paragraph(`Hi @${escapeHtml(founderHandle)}, <strong style="color:${BRAND.ink};">${escapeHtml(brandName)}</strong> is now featured in Upcoming Brands on the Hexxo homepage.`)}
      ${paragraph('Shoppers who tap your card see your listings, so make sure your best pieces are listed under your brand name.')}
      ${button('See your brand', `${SITE_URL}/shop/brands.html#upcoming`)}
    `, { preheader: `${escapeHtml(brandName)} is now featured in Upcoming Brands.` })
  }),

  // Sent when an admin sends submitted images back; the owner's existing
  // images stay on file, so they only replace the ones the note mentions.
  BRAND_CHANGES_REQUESTED: ({ brandName, founderHandle, reviewerNotes }) => ({
    subject: `Update your images for ${brandName}`,
    html: baseTemplate(`
      ${eyebrow('Upcoming Brands')}
      ${heading('Almost there.')}
      ${paragraph(`Hi @${escapeHtml(founderHandle)}, we checked the images for <strong style="color:${BRAND.ink};">${escapeHtml(brandName)}</strong> and need a change before your brand goes live.`)}
      <p style="margin:0 0 8px; font:700 12px/1 ${BRAND.uiFont}; letter-spacing:0.12em; text-transform:uppercase; color:${BRAND.muted};">A note from our team</p>
      <div style="margin:0 0 24px; padding:16px 20px; border-left:3px solid ${BRAND.red}; background:${BRAND.panel}; font:400 15px/1.6 ${BRAND.uiFont}; color:${BRAND.body}; white-space:pre-wrap;">${escapeHtml(reviewerNotes)}</div>
      ${paragraph('Your other images are still on file, so you only need to replace the ones mentioned above.')}
      ${button('Update your images', `${SITE_URL}/brand-onboarding`)}
    `, { preheader: `One change needed before ${escapeHtml(brandName)} goes live.` })
  })
};

// Marketing emails go to opted-in users only, sent by scripts/sendOutreach.js.
// Kept out of notificationTemplates on purpose: POST /send/update lets a
// client pick any type templateBuilder() serves, and these must not be
// reachable that way.
const marketingTemplates = {

  // To opted-in users with no published listing. Fee claims mirror the
  // homepage promo wording, including the processing-fee fine print.
  FIRST_LISTING_NUDGE: ({ firstName, unsubscribeEmail }) => ({
    subject: 'List by Dec 31, sell fee-free in 2027',
    html: marketingTemplate(`
      ${paragraph(`Hey ${escapeHtml(firstName || 'there')},`)}
      ${paragraph("Thanks for joining Hexxo. You haven't listed yet, and one published listing by Dec 31 locks this in. Here's how:")}
      ${eyebrow('Three steps')}
      ${steps([
        ['Add a photo', 'One is enough to start.'],
        ['Fill in the details', 'Brand, size, condition, price.'],
        ['Pick shipping and hit &ldquo;List it&rdquo;', "Use our prepaid label (add your address in your profile first) or ship it yourself. Saved drafts don't count toward the promo."],
      ])}
      ${button('List your first item', `${SITE_URL}/seller`, { block: true })}
      <p style="margin:-12px 0 24px; text-align:center; font:400 13px/1.5 ${BRAND.uiFont}; color:${BRAND.muted};">Asked to log in? Log in, then tap this button again.</p>
      <div style="margin:0 0 24px; padding:16px 20px; border-left:4px solid ${BRAND.red}; background:${BRAND.panel}; font:400 14px/1.6 ${BRAND.uiFont}; color:${BRAND.body};">
        <strong style="display:block; margin-bottom:6px; font:700 18px/1.25 ${BRAND.font}; color:${BRAND.ink};">What would make Hexxo better for you?</strong>
        Hit reply and tell us. A real person reads every one. Stuck on a listing? Reply and we'll help you get it posted.
      </div>
      ${paragraph('The Hexxo team')}
      ${paragraph('*On your first $10K of 2027 sales. Payment processing fees apply.', { muted: true, small: true })}
    `, {
      unsubscribeEmail,
      preheader: 'One listing by Dec 31 gets you 0% seller fees on your first $10K of 2027 sales.',
      heroHtml: hero({
        tag: 'Ends Dec 31, 2026',
        title: `Sell <span style="color:${BRAND.red};">fee-free</span> all of 2027.`,
        sub: 'Publish one listing before the deadline and keep more of every sale next year.',
        stats: [['0%', 'Seller fees*'], ['$0', 'Listing fees'], ['90 sec', 'To list']],
      }),
    })
  }),

  // To opted-in users who have published a listing: feedback by reply.
  SELLER_FEEDBACK: ({ firstName, unsubscribeEmail }) => ({
    subject: '3 quick questions about selling on Hexxo',
    html: marketingTemplate(`
      ${paragraph(`Hey ${escapeHtml(firstName || 'there')},`)}
      ${paragraph("Thanks for listing on Hexxo. You've used the selling side for real, so you know what works and what doesn't. Hit reply and answer these:")}
      ${[
        'What do you like most about Hexxo so far?',
        'What was confusing or annoying when you listed?',
        "What's the one thing we should build next?",
      ].map((question, i) => `
      <div style="margin:0 0 10px; padding:14px 16px; background:${BRAND.panel}; font:600 15px/1.5 ${BRAND.uiFont}; color:${BRAND.ink};"><span style="color:${BRAND.red}; font:700 18px/1 ${BRAND.font};">${i + 1}</span>&nbsp;&nbsp;${question}</div>`).join('')}
      <div style="height:14px; line-height:14px; font-size:14px;">&nbsp;</div>
      ${paragraph('Short answers are perfect. A real person reads every reply.')}
      ${paragraph('The Hexxo team')}
    `, {
      unsubscribeEmail,
      preheader: 'Three quick questions. Your answers decide what we build next.',
      heroHtml: hero({
        tag: '3 questions, 2 minutes',
        title: `You're one of our <span style="color:${BRAND.red};">first sellers.</span>`,
        sub: 'Your answers decide what we build next.',
      }),
    })
  })
};

function templateBuilder(notificationType, data) {
  const build = notificationTemplates[notificationType];
  if (!build) return null;
  return build(data || {});
}

module.exports = { templateBuilder, notificationTemplates, marketingTemplates };
