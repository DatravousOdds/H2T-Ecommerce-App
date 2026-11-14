// Run with node scripts/checkProductDetails.cjs (uses the existing Playwright dev dependency).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('public/js/pages/product.js');
const between = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const copy = between('const AUTH_DETAIL_COPY', '\n\n\nconst user');
const auth = between('        const authStatus', '        const sellerProfile');
const shipping = between('        detailShippingCarrier.textContent', '        const productMainImage');
const click = "authNote.addEventListener('click', () => { authDetail.open = true; });";
assert.ok(source.indexOf(click) > 0 && source.indexOf(click) < source.indexOf('displayProductDetails();'),
    'Disclosure link must work before unrelated asynchronous product loads finish');
const eligibility = read('public/js/core/authenticationEligibility.js').replace('export function', 'function');
const description = between('function setProductDescription(data)', '// fetchSalesPrices');
const ids = ['authBadge', 'authNote', 'authDetail', 'authDetailRow', 'authDetailIcon', 'authDetailTitle', 'authDetailText', 'detailShippingCarrier'];
const bindings = ids.map((id) => `const ${id} = document.getElementById('${id}');`).join('\n');
const render = `${copy}\n${eligibility}\n${bindings}\nconst authBadgeText = authBadge.querySelector('span');\n${click}\n${auth}\n${shipping}\n${description}\nsetProductDescription(data);`;
const html = read('public/shop/product.html').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        // Serve the actual markup and local CSS without Firebase, production writes or CDN dependencies.
        await page.route('**/*', async (route) => {
            const url = new URL(route.request().url());
            if (url.origin !== 'http://product.test') return route.abort();
            if (url.pathname === '/shop/product.html') return route.fulfill({ contentType: 'text/html', body: html });
            const file = path.join(root, 'public', url.pathname);
            if (file.startsWith(path.join(root, 'public') + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
                return route.fulfill({ path: file });
            }
            return route.fulfill({ status: 404, body: '' });
        });
        for (const width of [320, 390, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            for (const [name, data, expected] of [
                ['already authenticated', { authenticated: true, listingPrice: 200 }, 'Authenticated by Hexxo'],
                ['price eligible', { listingPrice: 150 }, 'Hexxo Tier 1 authentication included'],
                ['brand eligible', { listingPrice: 50, category: 'sneakers', brand: 'Nike' }, 'Hexxo Tier 1 authentication included'],
                ['ineligible', { listingPrice: 149, category: 'accessories', brand: 'Other' }, 'Not authenticated by Hexxo']
            ]) {
                await page.goto('http://product.test/shop/product.html');
                await page.evaluate(({ render, data }) => new Function('data', render)(data), { render, data });
                assert.equal(await page.locator('#authDetailTitle').textContent(), expected);
                const none = name === 'ineligible';
                assert.equal(await page.locator('#authNote').isVisible(), none);
                assert.equal(await page.locator('#authBadge').isVisible(), !none);
                assert.equal(await page.locator('#authDetail').evaluate((el) => el.open), none);
                assert.equal(await page.locator('#detail-product').textContent(), 'No description provided.');
                assert.match(await page.locator('#detailShippingCarrier').textContent(), /carrier of choice/);
                if (none) {
                    assert.match(await page.locator('#authDetailText').textContent(), /Buyer Protection still applies/);
                    await page.locator('#authDetail > summary').click();
                    await page.locator('#authNote').click();
                    assert.equal(await page.locator('#authDetail').evaluate((el) => el.open), true);
                }
                for (const summary of await page.locator('.details-container summary').all()) {
                    const before = await summary.evaluate((el) => el.parentElement.open);
                    await summary.focus();
                    await page.keyboard.press('Enter');
                    assert.equal(await summary.evaluate((el) => el.parentElement.open), !before);
                    await page.keyboard.press('Space');
                    assert.equal(await summary.evaluate((el) => el.parentElement.open), before);
                }
                assert.ok(await page.locator('.details-container').evaluate((el) =>
                    el.getBoundingClientRect().right <= innerWidth && el.scrollWidth <= el.clientWidth), `${name} panels overflow at ${width}px`);
                console.log(`PASS ${name} at ${width}px`);
            }
        }
        await page.goto('http://product.test/shop/product.html');
        const untrusted = '<img src=x onerror="window.injected=true">';
        await page.evaluate(({ render, untrusted }) => new Function('data', render)({ listingPrice: 100, shipping: { service_name: untrusted }, description: untrusted }), { render, untrusted });
        assert.equal(await page.locator('#detailShippingCarrier img, #detail-product img').count(), 0);
        assert.match(await page.locator('#detailShippingCarrier').textContent(), /<img/);
        assert.equal(await page.locator('#detail-product').textContent(), untrusted);
        console.log('PASS prepaid carrier and description remain plain text');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(await page.locator('.detail-trigger i').first().evaluate((el) => getComputedStyle(el).transitionDuration), '0s');
        assert.equal(await page.locator('a[href="/static/terms.html#s8"]').count(), 1);
        assert.match(read('public/static/terms.html'), /id="s8"/);
        console.log('PASS reduced motion and Buyer Protection link');
    } finally {
        await browser.close();
    }
})().catch((error) => { console.error(error); process.exitCode = 1; });
