"use strict";

import { checkUserStatus } from "../../../../auth/auth.js";
import { collection, doc, db, getDocs, query, where } from "../../../../api/firebase-client.js";

const currentUser = await checkUserStatus();



fetchTotalRevenue(currentUser.userId);



async function fetchTotalRevenue(userId) {
    if (!userId) {
        throw new Error("No uid provided!");
    }

    try {
      const docRef = collection(db, 'orders');

        const q = query(docRef, where("sellerId", "==", '7Hy9Tq5c6Gez94LMnRkeWbPM01h1'));

        const querySnapshot = await getDocs(q);

        const totalRevenue = querySnapshot.docs.reduce((preValue, doc) => {
            console.log("preValue:", preValue)
            const orderData = doc.data();
            const subtotal = orderData.subtotal;
            return parseFloat(preValue) + parseFloat(subtotal);
        }, 0)

        console.log(totalRevenue);
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
  
          const q = query(docRef, where("userId", "==", '7Hy9Tq5c6Gez94LMnRkeWbPM01h1'));
  
          const querySnapshot = await getDocs(q);
  
           querySnapshot.docs.lengh
  
      } catch (error) {
          console.error("Failed to fetch total revenue: ", error)
      }
}

async function fetchProductsSold(userId) {
    
}


