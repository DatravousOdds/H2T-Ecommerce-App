// Brand logos come from Logo.dev, looked up by domain. This is Logo.dev's
// *publishable* key (pk_...), which is designed to ship in client code -- its
// secret keys are the ones that must never appear here.
//
// Domain, not company name: name lookup is fuzzy and returns the wrong company
// for ambiguous brands ("Jordan" -> a law firm, "Palace" -> "Mundo Palace").
// Every domain below was checked by eye. Brands left out get their letter
// avatar instead of a wrong logo:
//   - Jordan: every Jordan domain redirects to Nike's swoosh
//   - READYMADE: readymade.jp returns an unrelated logo
//   - GV Gallery, Saint Michael, Sp5der: no logo found
//   - Magic: The Gathering returns Wizards of the Coast's "W" (the publisher,
//     not the game) and Soccer would return FIFA (the governing body)
// The looser ones (Denim Tears, Travis Scott, Vale Forever) resolved but
// weren't confirmable, so eyeball them.
const LOGO_DEV_TOKEN = 'pk_UO6L-oMIRFCIgDxX6J5DQQ';
const BRAND_LOGO_DOMAINS = {
  "Adidas": "adidas.com", "Asics": "asics.com", "Converse": "converse.com",
  "Hoka": "hoka.com", "New Balance": "newbalance.com", "Nike": "nike.com",
  "On": "on.com", "Reebok": "reebok.com", "Salomon": "salomon.com",
  "Saucony": "saucony.com", "Vans": "vans.com", "Veja": "veja-store.com",
  "Chanel": "chanel.com", "Dior": "dior.com", "Goyard": "goyard.com",
  "Hermès": "hermes.com", "Balenciaga": "balenciaga.com",
  "Bottega Veneta": "bottegaveneta.com", "Burberry": "burberry.com",
  "Celine": "celine.com", "Chloé": "chloe.com",
  "Christian Louboutin": "christianlouboutin.com",
  "Dolce & Gabbana": "dolcegabbana.com", "D&G": "dolcegabbana.com",
  "D&G Beachwear": "dolcegabbana.com", "Fendi": "fendi.com",
  "Givenchy": "givenchy.com", "Gucci": "gucci.com", "Loewe": "loewe.com",
  "Louis Vuitton": "louisvuitton.com", "Prada": "prada.com",
  "Saint Laurent": "ysl.com", "Salvatore Ferragamo": "ferragamo.com",
  "Valentino": "valentino.com", "Miu Miu": "miumiu.com", "BAPE": "bape.com",
  "Coach": "coach.com", "Denim Tears": "denimtears.com",
  "Eric Emanuel": "ericemanuel.com", "Fear of God Essentials": "fearofgod.com",
  "Hellstar": "hellstar.com", "MCM": "mcmworldwide.com",
  "Off White": "off---white.com", "Off-White": "off---white.com",
  "Alexander McQueen": "alexandermcqueen.com", "Chrome Hearts": "chromehearts.com",
  "Canada Goose": "canadagoose.com", "Moncler": "moncler.com", "Skylrk": "skylrk.com",
  "Pokémon": "pokemon.com", "Yu-Gi-Oh!": "yugioh-card.com", "Baseball (MLB)": "mlb.com",
  "Basketball (NBA)": "nba.com", "Football (NFL)": "nfl.com",
  "Palace": "palaceskateboards.com",
  "Polo Ralph Lauren": "ralphlauren.com", "Stussy": "stussy.com",
  "Supreme": "supreme.com", "The North Face": "thenorthface.com",
  "Travis Scott": "travisscott.com", "Vale Forever": "valeforever.com"
};

// fallback=404 so a domain with no logo fails cleanly (the card keeps its
// letter avatar) instead of Logo.dev's default black-and-white monogram.
const logoDomainByBrand = new Map(
  Object.entries(BRAND_LOGO_DOMAINS).map(([brand, domain]) => [brand.toLowerCase(), domain])
);

// size: Logo.dev's square edge in px (128 default; bigger tiles ask for more)
export function brandLogoUrl(brand, size = 128) {
  // case-insensitive: the brand lists spell some differently ("Fear of God ESSENTIALS")
  const domain = logoDomainByBrand.get(brand.toLowerCase());
  return domain
    ? `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=${size}&format=png&fallback=404`
    : null;
}
