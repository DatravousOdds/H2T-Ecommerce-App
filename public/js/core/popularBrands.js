// Established brands shown in the homepage "Heavy Hitters" carousel.
// A curated, hardcoded list -- only this module should need to change if it
// moves to Firestore.
//
// `name` must survive shop.js's normalizeBrand() matching against what
// sellers type into the listing's brand field (every name here is also in
// men.js's CURATED_BRANDS). `image` is the brand's cover photo; while it's
// null the card shows the shared placeholder (palette tile + Logo.dev logo),
// so the whole row stays consistent until real covers exist.
//
// TODO: cover photos -- set `image` per brand as they come in.
export const POPULAR_BRANDS = [
  { name: "Nike", subtitle: "Sneakers · Apparel", image: null },
  { name: "Jordan", subtitle: "Sneakers · Apparel", image: null },
  { name: "Adidas", subtitle: "Sneakers · Apparel", image: null },
  { name: "New Balance", subtitle: "Sneakers", image: null },
  { name: "Supreme", subtitle: "Apparel · Accessories", image: null },
  { name: "Bape", subtitle: "Apparel · Sneakers", image: null },
  { name: "Chrome Hearts", subtitle: "Jewelry · Apparel", image: null },
];
