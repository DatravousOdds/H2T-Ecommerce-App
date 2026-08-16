import { db, collection, query, where, orderBy, limit, getDocs } from '../api/firebase-client.js';
import { isReleaseLive } from '../core/global.js';

// Same query/live-filter as home.js's justDropped() -- limit(7) rather than
// 5 for the same reason: isReleaseLive() can still exclude a few (scheduled-
// but-not-yet-live drops), so overfetching a little keeps this from
// regularly coming up short of 5 real items.
async function fetchNewReleases() {
  try {
    const q = query(
      collection(db, "listings"),
      where("status", "==", "active"),
      orderBy("createdAt", "desc"),
      limit(7)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
      .filter(doc => isReleaseLive(doc.data()))
      .slice(0, 5)
      .map(doc => ({ id: doc.id, productName: doc.data().productName || "Untitled listing" }));
  } catch (error) {
    console.error("Error fetching new releases for footer:", error);
    return [];
  }
}

function newReleaseLinksHTML(listings) {
  if (listings.length === 0) {
    return `<a href="/releases">New Releases</a>`;
  }
  return listings
    .map(listing => `<a href="/shop/product.html?id=${listing.id}">${listing.productName}</a>`)
    .join('');
}

const createFooter = async () => {
  let footer = document.querySelector("footer");

  const newReleases = await fetchNewReleases();

  footer.innerHTML = `
    <div class="col">
      <h4>New Releases</h4>
      ${newReleaseLinksHTML(newReleases)}
    </div>

    <div class="col">
      <div class="follow">
        <h4>Follow Us</h4>
        <div class="icon">
          <a href="https://x.com/hexxostore?s=11" target="_blank" rel="noopener noreferrer" aria-label="Hexxo on X"><i class="fab fa-twitter"></i></a>
          <a href="https://www.instagram.com/hexxo.store" target="_blank" rel="noopener noreferrer" aria-label="Hexxo on Instagram"><i class="fab fa-instagram"></i></a>
          <a href="https://www.tiktok.com/@hexxo.shop" target="_blank" rel="noopener noreferrer" aria-label="Hexxo on TikTok"><i class="fa-brands fa-tiktok"></i></a>
        </div>
      </div>
    </div>

    <!-- gird-container-3 -->
    <div class="col">
      <h4>Company</h4>
      <a href="/static/about.html">About Us</a>
    </div>

    <!-- gird-container-4 -->
    <div class="col">
      <h4>Help</h4>
      <a href="/contact">Contact Us</a>
      <a href="/terms">Terms of Service</a>
    </div>

    <div class="col">
      <h4>Sell</h4>
      <a href="/seller">Sell on Hexxo</a>
    </div>

    <div class="rights">
      <p>&copy; 2026, Hexxo etc - Ecommerce website. All rights Reserved.</p>
    </div>
  `;
};

createFooter();
