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
function button(label, href) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
      <tr>
        <td class="btn" bgcolor="${BRAND.red}" style="border-radius:6px; background:${BRAND.red};">
          <a href="${href}" target="_blank" style="display:inline-block; padding:14px 28px; font:700 16px/1 ${BRAND.uiFont}; color:#ffffff; text-decoration:none; border-radius:6px;">${label}&nbsp;&rarr;</a>
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
function detailCard(rows) {
  const body = rows.map(([label, value], i) => `
      <tr>
        <td style="padding:12px 16px; ${i ? `border-top:1px solid ${BRAND.border};` : ''} font:500 13px/1.4 ${BRAND.uiFont}; color:${BRAND.muted}; width:38%; vertical-align:top;">${label}</td>
        <td style="padding:12px 16px; ${i ? `border-top:1px solid ${BRAND.border};` : ''} font:600 14px/1.4 ${BRAND.uiFont}; color:${BRAND.ink}; word-break:break-word;">${value}</td>
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

// ---------- Shell ----------

// preheader: the preview line inbox lists show next to the subject.
// audience: 'customer' gets the social row (inside the white card -- the icon
// JPGs have a white background baked in) + "why you got this" line;
// 'admin' gets a compact internal footer.
function baseTemplate(innerHtml, { preheader = '', audience = 'customer' } = {}) {
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
            <p style="margin:0; font:400 12px/1.6 ${BRAND.uiFont}; color:${BRAND.muted};">You're receiving this because you have a Hexxo account.<br>&copy; ${new Date().getFullYear()} Hexxo. All rights reserved.</p>`;

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
          <tr><td bgcolor="${BRAND.red}" style="background:${BRAND.red}; height:4px; line-height:4px; font-size:4px;">&nbsp;</td></tr>
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
      ${detailCard([['Order number', `#${escapeHtml(orderId)}`]])}
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
  })
};

function templateBuilder(notificationType, data) {
  const build = notificationTemplates[notificationType];
  if (!build) return null;
  return build(data || {});
}

module.exports = { templateBuilder, notificationTemplates };
