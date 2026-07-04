const { chromium } = require('playwright');

const widths = [375, 600, 800, 1280];

(async () => {
  const browser = await chromium.launch();
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto('http://localhost:3030/account/profile.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const info = await page.evaluate(() => {
      const nav = document.querySelector('#left-navigation');
      const wrapper = document.querySelector('#left-nav-wrapper');
      const navWrapper = document.querySelector('.nav-wrapper');
      const tabBtns = document.querySelectorAll('.tab-btn');
      const r = (el) => el ? el.getBoundingClientRect() : null;
      return {
        bodyScrollWidth: document.body.scrollWidth,
        innerWidth: window.innerWidth,
        navDisplay: nav ? getComputedStyle(nav).display : 'MISSING',
        navRect: r(nav),
        wrapperOverflowX: wrapper ? getComputedStyle(wrapper).overflowX : null,
        navWrapperFlexDirection: navWrapper ? getComputedStyle(navWrapper).flexDirection : null,
        tabBtnCount: tabBtns.length,
        firstTabRect: r(tabBtns[0]),
      };
    });
    console.log(`--- width=${width} ---`);
    console.log(JSON.stringify(info, null, 2));

    await page.screenshot({ path: `/private/tmp/claude-501/-Users-coltonclarke-Desktop-dev-projects-H2T-Ecommerce-App/cb4e3de2-fcff-4045-b30c-0eccca47119c/scratchpad/profile-${width}.png`, fullPage: false });

    const clicked = await page.evaluate(() => {
      const btn = document.querySelector('.tab-btn[data-tab="selling"]');
      if (btn) { btn.click(); return true; }
      return false;
    });
    await page.waitForTimeout(200);
    const activeTabId = await page.evaluate(() => {
      const active = document.querySelector('.tab.active');
      return active ? active.id : null;
    });
    console.log(`clicked selling tab: ${clicked}, active tab after click: ${activeTabId}`);

    await page.close();
  }
  await browser.close();
})();
