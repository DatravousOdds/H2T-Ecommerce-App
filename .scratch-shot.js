const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 900 } });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR', msg.text()); });
  await page.goto('http://localhost:8642/profile', { waitUntil: 'networkidle' });

  // Click the real "Seller Dashboard" tab button so the app's own tab-switching logic runs
  await page.click('.tab-btn[data-tab="selling"]');

  await page.waitForTimeout(300);
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-coltonclarke-Desktop-dev-projects-H2T-Ecommerce-App/b70ddc5e-3956-4903-ac9b-5741c4f776af/scratchpad/overview-375.png', fullPage: false });

  // scroll down a bit more, capture full page too
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-coltonclarke-Desktop-dev-projects-H2T-Ecommerce-App/b70ddc5e-3956-4903-ac9b-5741c4f776af/scratchpad/overview-375-full.png', fullPage: true });

  // Click Products tab
  await page.click('.nav-button[data-tab="products"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-coltonclarke-Desktop-dev-projects-H2T-Ecommerce-App/b70ddc5e-3956-4903-ac9b-5741c4f776af/scratchpad/products-375.png', fullPage: false });
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-coltonclarke-Desktop-dev-projects-H2T-Ecommerce-App/b70ddc5e-3956-4903-ac9b-5741c4f776af/scratchpad/products-375-full.png', fullPage: true });

  await browser.close();
})();
