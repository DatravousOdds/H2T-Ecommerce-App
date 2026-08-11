// Client-side mirror of isAuthenticationEligible() in server.js. Can't be a
// single shared file -- server.js is CommonJS/Node, this runs as a browser
// ES module, and this project has no bundler to reconcile the two module
// systems. This only needs to drive a "will be authenticated at checkout"
// badge on product cards (server.js's copy is still what actually enforces
// and charges for it at /create-checkout-session and /order-summary, per
// that file's own comments) -- keep both in sync by hand if the eligibility
// rule ever changes.
const AUTHENTICATION_MIN_PRICE = 150;
const SNEAKER_FOOTWEAR_BRANDS = [
  "nike", "jordan", "adidas", "yeezy", "new balance", "asics", "vans",
  "converse", "reebok", "hoka", "on", "saucony", "salomon", "veja",
  "alexander mcqueen", "gucci", "balenciaga", "christian louboutin",
  "off-white", "dior", "louis vuitton"
];
const STREETWEAR_APPAREL_BRANDS = [
  "supreme", "bape", "stussy", "palace", "travis scott", "denim tears",
  "fear of god essentials", "eric emanuel", "hellstar", "moncler",
  "the north face", "polo ralph lauren", "mcm", "canada goose"
];
// Keyed by the de-gendered value actually stored in listing.category (see
// seller.js's collectListingInfo: category.split('-')[1] -- gender lives
// separately in categoryMeta), matching server.js's own fix for the same
// mismatch (its catalog used to be keyed by gender-prefixed values that
// never matched a real listing doc).
const AUTHENTICATION_CATALOG = {
  "sneakers": SNEAKER_FOOTWEAR_BRANDS,
  "shoes": SNEAKER_FOOTWEAR_BRANDS,
  "apparel": STREETWEAR_APPAREL_BRANDS
};

// Two independent qualifying paths, not one combined AND: price alone
// qualifies any listing regardless of category, and separately, an
// approved category+brand combo qualifies regardless of price. Mirrors
// server.js's isAuthenticationEligible() exactly.
export function isAuthenticationEligible(listing) {
  if (listing.listingPrice >= AUTHENTICATION_MIN_PRICE) return true;

  const approvedBrands = AUTHENTICATION_CATALOG[listing.category];
  return !!approvedBrands && approvedBrands.includes(listing.brand?.toLowerCase());
}
