// Self-check for public/js/pages/sellerSummary.js: node scripts/checkSellerTakeHome.js
const assert = require("assert");

(async () => {
  const { estimateTakeHome } = await import("../public/js/pages/sellerSummary.js");

  assert.deepStrictEqual(estimateTakeHome("285"), { priceCents: 28500, feeCents: 1995, netCents: 26505 });

  for (const [price, feeCents] of [["118.50", 829], ["461.50", 3230], ["935.50", 6548]]) {
    assert.strictEqual(estimateTakeHome(price).feeCents, feeCents, `server fee parity for ${price}`);
  }

  for (const price of ["", "abc", "0", "-5", "0.001", "Infinity", "1e308", "1e17"]) {
    assert.strictEqual(estimateTakeHome(price), null, `price=${price} is rejected`);
  }

  for (let cents = 1; cents <= 1000000; cents++) {
    const price = (cents / 100).toFixed(2);
    const { netCents } = estimateTakeHome(price);
    assert.ok(netCents > 0, `net is positive for ${price}`);
  }

  console.log("seller take-home self-check passed");
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
