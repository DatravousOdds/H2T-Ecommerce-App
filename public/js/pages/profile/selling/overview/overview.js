"use strict";

import { checkUserStatus } from "../../../../auth/auth.js";
import { collection, doc, db, getDocs, query, where } from "../../../../api/firebase-client.js";

const currentUser = await checkUserStatus();


function renderMetrics(revenue,activeListings,prodcutSold) {

    setMetric("total-revenue-value", revenue);
    setMetric("active-listing-value", activeListings);
    setMetric("product-sold-value", prodcutSold);
}

function setMetric(elementId, value) {
   const el = document.getElementById(elementId);
   
   if (el) {
    el.textContent = value;
   } else {
    throw new Error("Element not found!")
   }
}

async function fetchTotalRevenue(userId) {
    if (!userId) {
        throw new Error("No uid provided!");
    }

    try {
      const docRef = collection(db, 'orders');

        const q = query(docRef, where("sellerId", "==", userId));

        const querySnapshot = await getDocs(q);

        const totalRevenue = querySnapshot.docs.reduce((preValue, doc) => {
            const orderData = doc.data();
            const subtotal = orderData.subtotal;
            return parseFloat(preValue) + parseFloat(subtotal);
        }, 0)

        console.log("total revenue",totalRevenue);
        return totalRevenue;  
    } catch (error) {
        console.error("Failed to fetch total revenue: ", error)
    }
};

async function fetchActiveListings(userId) {
    if (!userId) {
        throw new Error("No uid provided!");
    }

    try {
        const docRef = collection(db, 'listings');
  
        const q = query(docRef, where("userId", "==", userId));
  
        const querySnapshot = await getDocs(q);
  
        const activeListings = querySnapshot.docs.length;

        console.log("active listing",activeListings);
        return activeListings;
  
      } catch (error) {
          console.error("Failed to fetch active listings: ", error)
      }
}

async function fetchProductsSold(userId) {
    if (!userId) {
        throw new Error("No uid provided!");
    }

    try {
        const docRef = collection(db, 'listings');
  
        const q = query(docRef, where("userId", "==", userId), where("status", "==", "sold"));
  
        const querySnapshot = await getDocs(q);
  
        const soldProducts = querySnapshot.docs.length;

        console.log("products sold",soldProducts);
        return parseInt(soldProducts);
  
      } catch (error) {
          console.error("Failed to fetch sold products: ", error)
      }
}

async function loadOverviewTab(userId) {
    if (!userId) {
        throw new Error("No uid provided!");
    }

    const totalRevenue = await fetchTotalRevenue(userId);
    const activeListings = await fetchActiveListings(userId);
    const productsSold = await fetchProductsSold(userId);

    renderMetrics(totalRevenue,activeListings,productsSold)

}

await loadOverviewTab(currentUser.userId);


