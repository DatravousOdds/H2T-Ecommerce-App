import { checkUserStatus } from "../../../auth/auth.js";
import {
  db,
  doc,
  getDoc,
  collection,
  getDocs
} from "../../../api/firebase-client.js";
import { createElement } from "lucide";
const userData = await checkUserStatus();
console.log("dashboard:", userData);
async function loadOverviewTabInfo(userData) {
  if (!userData) return null;

  // create reference
  const data = userData.sellerOverview;

  // update UI display
  document.getElementById("total-revenue-value").textContent =
    data.totalRevenue;
  document.getElementById("active-listing-value").textContent =
    data.activeListing;
  document.getElementById("product-sold-value").textContent = data.productsSold;
  document.getElementById("active-listing-value").textContent =
    data.activeListing;
  document.getElementById("product-sold-value").textContent = data.productsSold;
  document.getElementById("selling-rate-value").textContent =
    userData.sellerOverview.sellerRating;

  loadProducts(userData);
}

loadOverviewTabInfo(userData);

async function loadProducts(userData) {
  if (!userData) {
    return null;
  }

  const productsCollectionRef = collection(
    db,
    "userProfiles",
    userData.email,
    "products"
  );

  const products = await getDocs(productsCollectionRef);

  const productsTable = document.querySelector("products-table__body");

  productsTable.innerHTML = "";

  const productsArray = [];

  products.forEach((doc) => {
    productsArray.push({
      id: doc.id,
      ...doc.data()
    });

    p;
  });

  const allProduct = productsArray.forEach((product) => {
    const tr = createElement("tr");

    tr.innerHTML = `
        <td>
                            <div class="product-info">
                              <img
                                src=${product}
                                alt="Nike Air Max"
                                class="product-image"
                              />
                              <div class="product-details">
                                <p class="product-name">Nike Air Max</p>
                                <p class="product-type">sneakers</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span class="listing-badge">active</span>
                          </td>
                          <td>9/10</td>
                          <td>15</td>
                          <td>$199.99</td>
                          <td>$150</td>
                          <td>$120</td>
                          <td>
                            <button class="action-button">
                              <svg
                                class="action-icon"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                              >
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="12" cy="5" r="1" />
                                <circle cx="12" cy="19" r="1" />
                              </svg>
                            </button>
                          </td>
    `;
  });

  const activeProducts = productsArray.filter(
    (product) => product.status === "active"
  );

  const forTradeProducts = productsArray.filter(
    (product) => product.trading === true
  );

  const pendingTrades = productsArray.filter(
    (product) => product.status === "pending" && product.trading === true
  );

  const totalProducts = products.size;
}
