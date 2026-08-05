"use strict";

// Shared shell every notification email renders inside -- keeps brand colors
// (see public/css/style2.css :root) and layout in one place instead of each
// template repeating its own HTML boilerplate.
function baseTemplate(innerHtml) {
  return `
    <div style="font-family:'Space Grotesk', sans-serif; max-width: 480px; margin: 0 auto;">
      <div class="c" style="background: #070707; padding: 10px; text-align: center; display: flex; align-items: center; justify-content:center">
        <a href="https://hexxo.store/" style="text-decoration: none; display: flex; align-items: center; justify-content:center">
          <img class="logo" src="https://hexxo.store/images/Hexxo_Bg_Removed.png" style="width:70px; height:70px;">
        </a>
      </div>
      <main style="background: #fff; padding: 24px; color: #070707;">
        ${innerHtml}
      </main>
      <div style="padding: 16px; text-align: center; color:#070707; font- size: 12px; ">&copy; 2026, Hexxo etc - Ecommerce website. All rights Reserved.
      </div>
      <div style="display:flex; align-items: center; justify-content:center; gap: 1rem;">
        <a href="https://x.com/hexxostore?s=11" target="_blank" rel="noopener noreferrer" aria-label="Hexxo on X" style="background: #F30C1E; width:50px; height:50px; border-radius:50%; display:flex; align-items:center; justify-content:center; text-decoration:none;">
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#F2F2F2" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </a>
        <a href="https://www.instagram.com/hexxo.store" target="_blank" rel="noopener noreferrer" aria-label="Hexxo on Instagram" style="background: #F30C1E; width:50px; height:50px; border-radius:50%; display:flex; align-items:center; justify-content:center; text-decoration:none;">
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#F2F2F2" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
        </a>
        <a href="https://www.tiktok.com/@hexxo.shop" target="_blank" rel="noopener noreferrer" aria-label="Hexxo on TikTok" style="background: #F30C1E; width:50px; height:50px; border-radius:50%; display:flex; align-items:center; justify-content:center; text-decoration:none;">
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#F2F2F2" d="M16.6 5.82c-.7-.73-1.09-1.7-1.09-2.72h-3.03v13.6c0 1.5-1.22 2.72-2.72 2.72a2.72 2.72 0 0 1 0-5.44c.28 0 .55.04.8.12V11.1a5.8 5.8 0 0 0-.8-.06 5.75 5.75 0 1 0 5.75 5.75V9.4a8.9 8.9 0 0 0 5.15 1.64V8.01a5.72 5.72 0 0 1-4.06-2.19z"/></svg>
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
  })

};

function templateBuilder(notificationType, data) {
  const build = notificationTemplates[notificationType];
  if (!build) return null;
  return build(data);
}

module.exports = { templateBuilder };
