const { chromium } = require('playwright');

async function gotoWithRetry(page, url, opts, retries = 6) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, opts);
      return;
    } catch (e) {
      console.log(`goto attempt ${i + 1} failed: ${e.message}`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error(`Failed to load ${url} after ${retries} attempts`);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleMsgs = [];
  page.on('console', msg => consoleMsgs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleMsgs.push(`[pageerror] ${err.message}`));
  page.on('response', res => { if (res.status() >= 400) consoleMsgs.push(`[http ${res.status()}] ${res.url()}`); });

  const email = `charttest_${Date.now()}@example.com`;
  const password = 'TestPassword123!';
  console.log('Using test email:', email);

  await gotoWithRetry(page, 'http://127.0.0.1:3030/signup', { waitUntil: 'load' });
  await page.fill('#name', 'Chart Test');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.fill('#number', '5555555555');

  await page.click('.submit-btn');
  await page.waitForTimeout(6000);

  console.log('URL after signup:', page.url());
  console.log('--- console after signup ---');
  console.log(consoleMsgs.join('\n'));

  await browser.close();
})();
