// Seller-created labels for the homepage "Upcoming Brands" carousel and the
// #upcoming section of /shop/brands.html. Only brands an admin has published
// come back (server.js /api/upcoming-brands), as { name, founderHandle,
// category, image }.
//
// `name` is the brand name the seller applied with; cards link to
// shop.html?brand=<slug of name>, which matches listings via normalizeBrand().

// Fails closed: any error resolves to [] so both sections stay hidden rather
// than showing a broken or empty carousel.
export async function fetchUpcomingBrands() {
  try {
    const response = await fetch("/api/upcoming-brands");
    if (!response.ok) return [];
    const { brands } = await response.json();
    return Array.isArray(brands) ? brands : [];
  } catch (error) {
    console.error("Error loading upcoming brands:", error);
    return [];
  }
}
