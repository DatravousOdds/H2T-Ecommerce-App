"use strict";

import { checkUserStatus } from "../../../../auth/auth.js";
import { collection, doc, db, getDocs, query, where } from "../../../../api/firebase-client.js";

const currentUser = await checkUserStatus();



fetchTotalRevenue(currentUser.userId);



async function fetchTotalRevenue(userId) {
    if (!userId) {
        throw new Error("No uid provided!");
    }

    const docRef =  await collection(db, 'orders');

    const q = query(docRef, where("sellerId", "==", '7Hy9Tq5c6Gez94LMnRkeWbPM01h1'));

    const querySnapshot = await getDocs(q);

    querySnapshot.docs.reduce((preValue, currentValue) => {
        const orderData = preValue.subtotal;
        currentValue += preValue;
        const totalRevenue = currentValue;
        console.log(totalRevenue);
    })


}

