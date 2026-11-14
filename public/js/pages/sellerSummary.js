// Mirrors server.js MARKETPLACE_FEE_RATE.
// shortcut: hand-copied rate, serve it from the server if it ever varies per seller.
const SELLER_FEE_RATE = 0.07;

export function estimateTakeHome(priceText) {
    // Same parse collectListingInfo saves as listingPrice.
    const price = parseFloat(priceText);
    if (!Number.isFinite(price) || price <= 0) return null;

    const priceCents = Math.round(price * 100);
    if (priceCents < 1) return null;

    // Same toFixed(2) rounding the server charges with; rounding priceCents * rate is off by 1 cent on some prices.
    const feeCents = Math.round(parseFloat((SELLER_FEE_RATE * price).toFixed(2)) * 100);

    return { priceCents, feeCents, netCents: priceCents - feeCents };
}
