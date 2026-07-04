const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 900 } });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  page.on('console', msg => console.log('CONSOLE', msg.type(), msg.text()));

  // Deep-link straight to the Seller Dashboard tab, same as nav.js's account dropdown does.
  await page.goto('http://localhost:3030/profile?tab=selling', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  await page.screenshot({ path: '/private/tmp/claude-501/-Users-coltonclarke-Desktop-dev-projects-H2T-Ecommerce-App/b70ddc5e-3956-4903-ac9b-5741c4f776af/scratchpad/overview-375.png', fullPage: false });
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-coltonclarke-Desktop-dev-projects-H2T-Ecommerce-App/b70ddc5e-3956-4903-ac9b-5741c4f776af/scratchpad/overview-375-full.png', fullPage: true });

  await page.evaluate(() => {
    console.log('body scrollWidth', document.body.scrollWidth, 'innerWidth', window.innerWidth);
    const names = ['.tab#selling', '.dashboard.inner-wrapper', '.dashboard-nav-container', '.dashboard-nav-container .nav-menu'];
    for (const sel of names) {
      const el = document.querySelector(sel);
      if (!el) { console.log(sel, 'NOT FOUND'); continue; }
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      console.log(sel, 'rect=', JSON.stringify(r), 'display=', cs.display, 'position=', cs.position, 'width=', cs.width, 'margin=', cs.margin, 'transform=', cs.transform, 'justify-content=', cs.justifyContent, 'align-items=', cs.alignItems);
    }
  });

  await page.evaluate(() => {
    const btn = document.querySelector('.nav-button[data-tab="products"]');
    if (btn) btn.click();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-coltonclarke-Desktop-dev-projects-H2T-Ecommerce-App/b70ddc5e-3956-4903-ac9b-5741c4f776af/scratchpad/products-375.png', fullPage: false });
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-coltonclarke-Desktop-dev-projects-H2T-Ecommerce-App/b70ddc5e-3956-4903-ac9b-5741c4f776af/scratchpad/products-375-full.png', fullPage: true });

  await browser.close();
})();
