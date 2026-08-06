"use strict";

// Shared shell every notification email renders inside -- keeps brand colors
// (see public/css/style2.css :root) and layout in one place instead of each
// template repeating its own HTML boilerplate.
function baseTemplate(innerHtml) {
  return `
    <div style="font-family:'Space Grotesk', sans-serif; max-width: 480px; margin: 0 auto;">
      <div class="c" style="background: #070707; padding: 10px; text-align: center;">
        <a href="https://hexxo.store/" style="text-decoration: none;">
          <img class="logo" src="https://hexxo.store/images/Hexxo_Bg_Removed.png" style="width:70px; height:70px; display:inline-block;">
        </a>
      </div>
      <main style="background: #fff; padding: 24px; color: #070707;">
        ${innerHtml}
      </main>
      <div style="padding: 16px; text-align: center; color:#070707; font- size: 12px; ">&copy; 2026, Hexxo etc - Ecommerce website. All rights Reserved.
      </div>
      <div style="text-align: center;">
        <a href="https://x.com/hexxostore?s=11" target="_blank" rel="noopener noreferrer" aria-label="Hexxo on X" style="display:inline-block; text-decoration:none; margin: 0 8px;">
          <img src="https://hexxo.store/images/email-icon-x.jpg" width="50" height="50" alt="X" style="width:50px; height:50px; border-radius:50%; display:block;">
        </a>
        <a href="https://www.instagram.com/hexxo.store" target="_blank" rel="noopener noreferrer" aria-label="Hexxo on Instagram" style="display:inline-block; text-decoration:none; margin: 0 8px;">
          <img src="https://hexxo.store/images/email-icon-instagram.jpg" width="50" height="50" alt="Instagram" style="width:50px; height:50px; border-radius:50%; display:block;">
        </a>
        <a href="https://www.tiktok.com/@hexxo.shop" target="_blank" rel="noopener noreferrer" aria-label="Hexxo on TikTok" style="display:inline-block; text-decoration:none; margin: 0 8px;">
          <img src="https://hexxo.store/images/email-icon-tiktok.jpg" width="50" height="50" alt="TikTok" style="width:50px; height:50px; border-radius:50%; display:block;">
        </a>
      </div>
    </div>
  `;
}

const notificationTemplates = {
  ACCOUNT_CREATED: ({ firstName }) => ({
    subject: `Welcome to Hexxo, ${firstName}! 🎉`,
    html: baseTemplate(`
      <div style="background: #fff; padding: 24px; color: #070707;">
        <p>Your Hexxo account is officially set up — welcome aboard!</p>
        <p>Hexxo is built so you can shop trending items with confidence. Every high-value item is authenticated at checkout, so you always know exactly what you're getting.</p>
        <button class="btn">Explore trending items</button>
        <p>Questions or issues? Reach out anytime at support@hexxo.com — we're happy to help.</p>
      </div>
      `)
  }),

  PASSWORD_RESET: ({ firstName, resetLink }) => ({
    subject: `Reset your Hexxo password`,
    html: baseTemplate(`
      <div style="background: #fff; padding: 24px; color: #070707;">
        <p>Hi ${firstName},</p>
        <p>We received a request to reset your Hexxo password. Click the button below to set a new password:</p>
        <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #070707; color: #fff; text-decoration: none; border-radius: 4px;">Reset Password</a>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
      `)
  }),

  ORDER_CONFIRMATION: ({ firstName, orderId, orderDetails }) => ({
    subject: `Your Hexxo order #${orderId} is confirmed! ✅`,
    html: baseTemplate(`
      <div style="background: #fff; padding: 24px; color: #070707;">
        <p>Hi ${firstName},</p>
        <p>Thank you for your order! Your order #${orderId} has been confirmed.</p>
        <h3>Order Details:</h3>
        <ul>
          ${orderDetails.map(item => `<li>${item.name} - ${item.quantity} x $${item.price}</li>`).join('')}
        </ul>
        <p>Total: $${orderDetails.reduce((total, item) => total + (item.quantity * item.price), 0)}</p>
        <p>We'll notify you once your items are shipped.</p>
      </div>
      `)
  }),

  SHIPPING_UPDATE: ({ firstName, orderId, trackingLink }) => ({
    subject: `Your Hexxo order #${orderId} has shipped! 🚚`,
    html: baseTemplate(`
      <div style="background: #fff; padding: 24px; color: #070707;">
        <p>Hi ${firstName},</p>
        <p>Good news! Your order #${orderId} has been shipped.</p>
        <p>You can track your shipment using the link below:</p>
        <a href="${trackingLink}" style="display: inline-block; padding: 10px 20px; background-color: #070707; color: #fff; text-decoration: none; border-radius: 4px;">Track Shipment</a>
        <p>Thank you for shopping with Hexxo!</p>
      </div>
      `)
  }),

  // Additional notification types can be added here following the same structure
  SHIPPING_REMINDER: ({ firstName, orderId, trackingLink }) => ({
    subject: `Reminder: Track your Hexxo order #${orderId} 📦`,
    html: baseTemplate(`
      <div style="background: #fff; padding: 24px; color: #070707;">
        <p>Hi ${firstName},</p>
        <p>This is a friendly reminder to ship your Hexxo order #${orderId} within 5 business days.</p>
        <p>You can check the status of your shipment using the link below:</p>
        <a href="${trackingLink}" style="display: inline-block; padding: 10px 20px; background-color: #070707; color: #fff; text-decoration: none; border-radius: 4px;">Track Shipment</a>
        <p>Thank you for shopping with Hexxo!</p>
      </div>
      `)
  }),

  // --- Admin-facing notifications below (sent to ADMIN_EMAIL, not a customer) ---

  NEW_SIGNUP: ({ firstName, email }) => ({
    subject: `New signup: ${firstName}`,
    html: baseTemplate(`
      <div style="background: #fff; padding: 24px; color: #070707;">
        <p>A new account was just created on Hexxo.</p>
        <ul>
          <li>Name: ${firstName}</li>
          <li>Email: ${email}</li>
        </ul>
      </div>
      `)
  }),

  NEW_SALE: ({ itemName, salePrice, orderId, buyerEmail }) => ({
    subject: `💰 New sale: ${itemName} — $${salePrice}`,
    html: baseTemplate(`
      <div style="background: #fff; padding: 24px; color: #070707;">
        <p>A sale just went through.</p>
        <ul>
          <li>Item: ${itemName}</li>
          <li>Sale price: $${salePrice}</li>
          <li>Order ID: ${orderId}</li>
          <li>Buyer: ${buyerEmail}</li>
        </ul>
      </div>
      `)
  }),

  AUTH_REQUEST_QUEUED: ({ itemLabel, requestId }) => ({
    subject: `🔍 New authentication request needs review`,
    html: baseTemplate(`
      <div style="background: #fff; padding: 24px; color: #070707;">
        <p>A new item was submitted for authentication and is waiting in the queue.</p>
        <ul>
          <li>Item: ${itemLabel}</li>
          <li>Request ID: ${requestId}</li>
        </ul>
      </div>
      `)
  })

};

function templateBuilder(notificationType, data) {
  const build = notificationTemplates[notificationType];
  if (!build) return null;
  return build(data);
}

module.exports = { templateBuilder };
