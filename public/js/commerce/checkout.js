import { collection, getDocs, db } from '../api/firebase-client';
import { checkUserStatus } from '../auth/auth.js';

const currentUser = await checkUserStatus();
const cartItems = await getCartItems(currentUser.userId);
const searchQuery = new URLSearchParams(window.location.search);
const listingId = searchQuery.get('listingId');

console.log(listingId)

// window.onload = () => {
//     if (!sessionStorage.user) {
//         location.replace('/login');
//     }
// }






async function getCartItems(userId) {
    try {
        const cartRef = collection(db, 'carts', userId, 'items');
        const itemSnapshot = await getDocs(cartRef);

        if (itemSnapshot.empty) {
            return [];
        }
    
        const cartItems = itemSnapshot.docs.map(doc => doc.data())

        return cartItems;
    } catch (error) {
        console.error(`Failed to fetch cart items for user ${userId}:`, error);
        throw error;
    }
}
    
    
