// Self-check for public/js/pages/profile/certificates/certificateList.js: node scripts/checkCertificates.js
// These rules decide which certificates a user sees and where each link goes,
// and the rendered strings come from user-written docs.
const assert = require("assert");

(async () => {
  const { SOURCES, certificatesView } = await import("../public/js/pages/profile/certificates/certificateList.js");

  const ts = (date) => ({ toDate: () => date });
  const bought = (docId, data = {}) => SOURCES.bought.toCertificate(docId, data);
  const sold = (docId, data = {}) => SOURCES.sold.toCertificate(docId, data);
  const checked = (docId, data = {}) => SOURCES.checked.toCertificate(docId, data);
  const loaded = (overrides = {}) => ({ bought: [], sold: [], checked: [], ...overrides });
  const grid = (certificate) => certificatesView(loaded({ [certificate.source]: [certificate] }), "all").gridHTML;
  const titles = (html) => [...html.matchAll(/class="cert-title">([^<]*)</g)].map((match) => match[1]);
  const button = (html, filter) => html.match(new RegExp(`<button[^>]*data-filter="${filter}".*?</button>`))[0];
  const countOf = (html, filter) => button(html, filter).match(/cert-count">(\d+)</)?.[1] ?? null;
  const type = (value) => checked("r1", { tierSelection: { type: value } });

  assert.deepStrictEqual(Object.keys(SOURCES), ["bought", "sold", "checked"], "SOURCES key order is bought, sold, checked");
  assert.deepStrictEqual(
    Object.values(SOURCES).map(({ collectionName, ownerField, passedWhere }) => [collectionName, ownerField, ...passedWhere]),
    [
      ["orders", "buyerId", "authenticationStatus", "passed"],
      ["orders", "sellerId", "authenticationStatus", "passed"],
      ["authenticationRequests", "userId", "status", "approved"],
    ],
    "each source queries its collection by owner and passed status",
  );

  assert.strictEqual(bought("doc1", { id: "pi_stripe" }).href, "/certificate.html?orderId=doc1", "order href uses the doc id, not order.id");
  assert.strictEqual(sold("doc1", { id: "pi_stripe" }).href, "/certificate.html?orderId=doc1", "sold href uses the doc id, not order.id");
  assert.strictEqual(bought("a/b c").href, "/certificate.html?orderId=a%2Fb%20c", "order doc id is URL-encoded");
  assert.strictEqual(checked("a/b c").href, "/authenticator/authenticate-results.html?authRequestId=a%2Fb%20c", "checked doc id is URL-encoded");

  for (const status of ["refunded", "cancelled"]) {
    assert.strictEqual(bought("o1", { fulfillmentStatus: status }), null, `bought excludes ${status} orders`);
    assert.ok(sold("o1", { fulfillmentStatus: status }), `sold keeps ${status} orders`);
  }
  assert.ok(bought("o1", { fulfillmentStatus: "delivered" }), "bought keeps delivered orders");

  assert.strictEqual(bought("o1", { item: { name: "Dunk" } }).title, "Dunk", "order title is item.name");
  assert.strictEqual(bought("o1").title, "Item", "order title falls back to Item");
  assert.strictEqual(bought("o1").typeLabel, "Authenticity Guarantee", "orders are labeled Authenticity Guarantee");
  assert.strictEqual(bought("o1").tier, null, "orders have no tier");
  assert.ok(!grid(bought("o1")).includes("cert-tier"), "order card has no tier span");

  const details = (fields) => checked("r1", { productDetails: { category: "Sneakers", details: fields } });
  assert.strictEqual(details({ Brand: "Nike", Model: "Dunk" }).title, "Nike Dunk", "checked title is Brand plus Model");
  assert.strictEqual(details({ Brand: "Nike", "Item Type": "Hoodie" }).title, "Nike Hoodie", "checked title falls back to Item Type");
  assert.strictEqual(details({ "Card Name": "Charizard" }).title, "Charizard", "checked title falls back to Card Name");
  assert.strictEqual(details({}).title, "Sneakers", "checked title falls back to category");
  assert.strictEqual(checked("r1").title, "Checked item", "checked title falls back to Checked item");

  for (const [value, tier] of [["QuickCheck", 1], ["Standard", 2], ["Expert+", 3]]) {
    assert.strictEqual(type(value).tier, tier, `${value} maps to tier ${tier}`);
    assert.ok(grid(type(value)).includes(`${value}<span class="cert-tier">· Tier ${tier}</span>`), `${value} card shows Tier ${tier}`);
  }
  assert.strictEqual(type("Mystery").tier, null, "unknown type has no tier");
  assert.ok(grid(type("Mystery")).includes("Mystery"), "unknown type shows raw");
  assert.ok(!grid(type("Mystery")).includes("cert-tier"), "unknown type card has no tier span");
  assert.strictEqual(type("constructor").tier, null, "constructor type gives tier null");
  assert.ok(!grid(type("constructor")).includes("function"), "constructor type leaks no function into the HTML");
  assert.ok(!grid(type("constructor")).includes("cert-tier"), "constructor type card has no tier span");
  assert.strictEqual(checked("r1").typeLabel, "", "missing tierSelection gives an empty type label");
  assert.ok(!grid(checked("r1")).includes("cert-type"), "empty type label renders no type span");

  const oct12 = new Date(2026, 9, 12);
  const oct20 = new Date(2026, 9, 20);
  assert.strictEqual(checked("r1", { reviewedAt: ts(oct12), createdAt: ts(oct20) }).verifiedAt, oct12, "checked date prefers reviewedAt");
  assert.strictEqual(checked("r1", { reviewedAt: null, createdAt: ts(oct20) }).verifiedAt, oct20, "checked date falls back to createdAt");
  assert.strictEqual(checked("r1", { updateAt: ts(oct12) }).verifiedAt, null, "checked date ignores updateAt");
  assert.strictEqual(bought("o1", { authenticationDecidedAt: ts(oct12) }).verifiedAt, oct12, "order date is authenticationDecidedAt");
  assert.ok(grid(bought("o1", { authenticationDecidedAt: ts(oct12) })).includes('<span class="cert-date">Verified Oct 12, 2026</span>'), "card shows the formatted verified date");
  assert.ok(grid(bought("o1")).includes('<span class="cert-date">Verified</span>'), "card shows plain Verified with no date");

  assert.strictEqual(bought("o1", { item: { brand: "Jordan", size: "10" } }).subtitle, "Jordan · Size 10", "subtitle joins brand and size");
  assert.strictEqual(bought("o1", { item: { brand: "Jordan" } }).subtitle, "Jordan", "subtitle with brand only");
  assert.strictEqual(bought("o1", { item: { size: "10" } }).subtitle, "Size 10", "subtitle with size only");
  assert.strictEqual(details({ Brand: "Jordan", Size: "10" }).subtitle, "Sneakers · Size 10", "checked subtitle uses category and Size");
  assert.strictEqual(details({ Brand: "Nike", Model: "Dunk" }).subtitle, "Sneakers", "checked subtitle with no size does not repeat the brand");
  assert.strictEqual(checked("r1", { productDetails: { details: { Size: "10" } } }).subtitle, "Size 10", "checked subtitle with size only");
  assert.ok(!grid(bought("o1")).includes("cert-subtitle"), "no brand or size renders no subtitle span");

  const fallback = "/images/HypebeastBG.jpeg";
  assert.strictEqual(bought("o1").imageUrl, fallback, "order image falls back");
  assert.strictEqual(bought("o1", { item: { image: "/dunk.jpg" } }).imageUrl, "/dunk.jpg", "order image is item.image");
  assert.strictEqual(checked("r1").imageUrl, fallback, "checked image falls back with no images");
  assert.strictEqual(checked("r1", { images: [{ url: "/a.jpg" }, { url: "/b.jpg", isPrimary: true }] }).imageUrl, "/b.jpg", "isPrimary image is preferred");
  assert.strictEqual(checked("r1", { images: [{ url: "/a.jpg" }, { url: "/b.jpg" }] }).imageUrl, "/a.jpg", "first image is used with no isPrimary");
  assert.ok(grid(bought("o1")).includes(`src="${fallback}"`), "card renders the image url");

  const card = (source, title, date) => ({ ...SOURCES[source].toCertificate("d", {}), title, verifiedAt: date });
  const undated = card("checked", "undated", null);
  const oldest = card("bought", "oldest", new Date(2026, 0, 1));
  const newest = card("sold", "newest", new Date(2026, 5, 1));
  const middle = card("checked", "middle", new Date(2026, 2, 1));
  const unsorted = loaded({ bought: [oldest], sold: [newest], checked: [undated, middle] });
  assert.deepStrictEqual(titles(certificatesView(unsorted, "all").gridHTML), ["newest", "middle", "oldest", "undated"], "grid sorts newest first across sources with missing dates last");
  assert.deepStrictEqual(titles(certificatesView(unsorted, "checked").gridHTML), ["middle", "undated"], "a single filter also sorts newest first");
  assert.deepStrictEqual(unsorted.checked, [undated, middle], "sorting does not mutate bySource arrays");
  assert.deepStrictEqual(titles(certificatesView(unsorted, "bought").gridHTML), ["oldest"], "a filter shows only its source");

  const counts = certificatesView({ bought: [oldest], sold: null, checked: [undated, middle] }, "all").navHTML;
  assert.deepStrictEqual(
    [...counts.matchAll(/data-filter="(\w+)"/g)].map((match) => match[1]),
    ["all", "bought", "sold", "checked"],
    "nav lists All then every source in order",
  );
  assert.strictEqual(countOf(counts, "sold"), null, "failed source shows no count");
  assert.strictEqual(countOf(counts, "bought"), "1", "loaded source shows its count");
  assert.strictEqual(countOf(counts, "all"), "3", "All counts only what loaded");
  assert.strictEqual(countOf(certificatesView(loaded(), "all").navHTML, "sold"), "0", "a loaded source with no certificates shows zero");
  const allFailed = certificatesView({ bought: null, sold: null, checked: null }, "all");
  assert.strictEqual(countOf(allFailed.navHTML, "all"), null, "All shows no count when nothing loaded");

  const activeNav = certificatesView(loaded(), "sold").navHTML;
  assert.ok(button(activeNav, "sold").includes('class="purchase-type-item active"'), "active filter gets the active class");
  assert.ok(button(activeNav, "sold").includes('aria-pressed="true"'), "active filter is aria-pressed");
  assert.ok(button(activeNav, "all").includes('class="purchase-type-item"'), "inactive filter has no active class");
  assert.ok(button(activeNav, "all").includes('aria-pressed="false"'), "inactive filter is not aria-pressed");

  const soldFailed = { bought: [oldest], sold: null, checked: [] };
  const soldError = '<div class="cert-error"><p>Couldn\'t load your sold items.</p><button type="button" class="cert-retry" data-retry="sold">Try again</button></div>';
  assert.strictEqual(certificatesView(soldFailed, "bought").errorsHTML, "", "Sold error is not shown on the Bought filter");
  assert.strictEqual(certificatesView(soldFailed, "all").errorsHTML, soldError, "Sold error is shown on All");
  assert.strictEqual(certificatesView(soldFailed, "sold").errorsHTML, soldError, "Sold error is shown on Sold");
  assert.strictEqual(certificatesView(loaded(), "all").errorsHTML, "", "no failures means no errors");

  const zero = certificatesView(loaded(), "all");
  assert.strictEqual(zero.isEmpty, true, "isEmpty is true when every source loaded with zero");
  assert.strictEqual(zero.gridHTML, "", "grid is blank when isEmpty");
  assert.strictEqual(certificatesView(loaded(), "sold").gridHTML, "", "a filter shows no line when isEmpty");
  assert.strictEqual(certificatesView(loaded({ sold: null }), "all").isEmpty, false, "isEmpty is false if any source failed");
  assert.strictEqual(allFailed.isEmpty, false, "isEmpty is false if every source failed");
  assert.strictEqual(certificatesView(loaded({ bought: [oldest] }), "sold").isEmpty, false, "isEmpty is false if any source has certificates");

  const filterEmpty = '<li class="cert-filter-empty">No sold certificates yet.</li>';
  assert.strictEqual(certificatesView(loaded({ bought: [oldest] }), "sold").gridHTML, filterEmpty, "Sold with no certs shows the filter-empty line while bought has some");
  assert.strictEqual(certificatesView({ bought: [oldest], sold: null, checked: [] }, "sold").gridHTML, "", "filter-empty line is absent when that source failed");
  assert.strictEqual(certificatesView({ bought: null, sold: [], checked: [] }, "sold").gridHTML, filterEmpty, "filter-empty line keeps the pane from going blank when only another source failed");
  assert.strictEqual(certificatesView({ bought: null, sold: [], checked: [] }, "all").gridHTML, "", "All never shows the filter-empty line");

  const xss = "<img src=x onerror=alert(1)>";
  const hostile = grid(bought("it's", { item: { name: xss, brand: xss, image: 'x" onerror="alert(1)' } }));
  assert.ok(!hostile.includes(xss), "hostile title and brand never appear raw");
  assert.ok(hostile.includes('<h2 class="cert-title">&lt;img src=x onerror=alert(1)&gt;</h2>'), "title is escaped");
  assert.ok(hostile.includes('<span class="cert-subtitle">&lt;img src=x onerror=alert(1)&gt;</span>'), "subtitle is escaped");
  assert.ok(!hostile.includes('x" onerror'), "image url with a quote never appears raw");
  assert.ok(hostile.includes('src="x&quot; onerror=&quot;alert(1)"'), "image url is escaped in its attribute");
  assert.ok(hostile.includes('href="/certificate.html?orderId=it&#39;s"'), "href is escaped in its attribute");
  assert.ok(grid(type(xss)).includes('</i>&lt;img src=x onerror=alert(1)&gt;</span>'), "type label is escaped");

  console.log("certificates self-check passed");
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
