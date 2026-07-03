const { chromium } = require('playwright');

async function gotoWithRetry(page, url, opts, retries = 10) {
  for (let i = 0; i < retries; i++) {
    try { await page.goto(url, opts); return; }
    catch (e) { await new Promise(r => setTimeout(r, 700)); }
  }
  throw new Error(`failed to load ${url}`);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const msgs = [];
  page.on('console', m => msgs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => msgs.push(`[pageerror] ${e.message}`));

  await gotoWithRetry(page, 'http://127.0.0.1:3030/login', { waitUntil: 'load' });
  await page.fill('#email', 'chart-debug-test@example.com');
  await page.fill('#password', 'TestPassword123!');
  msgs.length = 0;
  await page.click('.submit-btn, button');
  await page.waitForTimeout(4000);
  console.log('URL after login:', page.url());

  if (!page.url().includes('/profile') && !page.url().endsWith('/') ) {
    // try navigating directly
  }

  await gotoWithRetry(page, 'http://127.0.0.1:3030/profile', { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  msgs.length = 0; // clear pre-tab-click noise, focus on selling tab specifically
  // click main "Selling" tab
  const sellingTabBtn = await page.$('.tab-btn[data-tab="selling"]');
  console.log('found selling tab btn:', !!sellingTabBtn);
  if (sellingTabBtn) await sellingTabBtn.click();
  await page.waitForTimeout(2500);

  await page.screenshot({ path: '/tmp/profile-overview.png', fullPage: false });

  // now click Analytics sub-nav
  const analyticsBtn = await page.$('.nav-button[data-tab="analytics"]');
  console.log('found analytics sub-tab btn:', !!analyticsBtn);
  if (analyticsBtn) await analyticsBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/profile-analytics.png', fullPage: false });

  console.log('--- console messages ---');
  console.log(msgs.join('\n'));

  await browser.close();
})();
