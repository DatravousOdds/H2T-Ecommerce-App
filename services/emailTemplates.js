"use strict";

// Shared shell every notification email renders inside -- keeps brand colors
// (see public/css/style2.css :root) and layout in one place instead of each
// template repeating its own HTML boilerplate.
function baseTemplate(innerHtml) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background: #070707; padding: 20px; text-align: center;">
        <span style="color: #fff; font-size: 20px; font-weight: bold;">Hexxo</span>
      </div>
      <div style="background: #fff; padding: 24px; color: #070707;">
        ${innerHtml}
      </div>
      <div style="padding: 16px; text-align: center; color: #747474; font-size: 12px;">
        &copy; ${new Date().getFullYear()} Hexxo
      </div>
    </div>
  `;
}

const notificationTemplate = {
  ACCOUNT_CREATED: ({ firstName }) => ({
    subject: `Welcome to Hexxo, ${firstName}! 🎉`,
    html: baseTemplate(`<p>Hi ${firstName}, your account was created successfully.</p>`)
  }),

  CREATED_ACCOUNT_HTML: () => `
  
  
  
  `
};

function templateBuilder(notificationType, data) {
  const build = notificationTemplate[notificationType];
  if (!build) return null;
  return build(data);
}

module.exports = { templateBuilder };
