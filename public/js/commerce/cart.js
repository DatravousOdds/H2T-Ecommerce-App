
import { getDocs, where, query, collection, doc, addDoc, updateDoc } from '../api/firebase-client.js';
import { db } from '../api/firebase-client.js';
import { checkUserStatus } from '../auth/auth.js';
import { getCartItems, initCartDrawer } from '../components/cartDrawer.js';

const currentUser = await checkUserStatus();
let bagItems = await getCartItems(currentUser);
console.log("bag items:", bagItems);

displayCartItems(bagItems);
initCartDrawer();

window.addEventListener('cartUpdated', async () => {
    bagItems = await getCartItems(currentUser);
    console.log("bag items:", bagItems);
    displayCartItems(bagItems);
})

function displayCartItems(items) {
    const bagItemGrid = document.getElementById('bagItemGrid');
    bagItemGrid.innerHTML = "";

    if (items.length <= 0) {
        bagItemGrid.innerHTML = `
            <div class="empty-wrapper">
                <h3>Cart is empty!</h3>
                <img src="./images/empty-cart_1.png" alt="Seller profile photo">
            </div>
            
        `;
    }

    items.forEach(item => {
        console.log("bag item:", item);
        const div = document.createElement('div');
        div.classList.add('item-container');
        div.dataset.id = item.listingId;
        div.innerHTML = `
            <div class="item-wrapper">
                <div class="item-info">
                  <div class="seller-info">
                    <img src="./images/pexels-erik-mclean-9367504%202.jpg" alt="Seller profile photo">
                    <div class="seller-at">
                      <p>${item.sellerName}</p>
                      <p>@gioseller</p>
                    </div>
                  </div>
                  <img src="${item.image}" class="product-img" alt="Nike Air Jordan 1 sneaker">
                </div>
                <div class="item-description">
                  <p>${item.brand} ${item.productName}</p>
                  <div class="item-price">
                    ${item.retailPrice ? `<p class="retail-price">$${item.retailPrice}`: ''}
                    <p class="listing-price">$${item.listingPrice.toFixed(2)}</p>
                  </div>
                  <p>Size ${item.size}</p>
                  <p>Brand New</p>
                  <div class="button-container">
                    <button class="delete-product" id="deleteProduct">
                      <i class="fa-regular fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              </div>

              <div class="item-cost">
                <div class="cost-row">
                  <p class="item-cost-label">Subtotal:</p>
                  <p class="item-cost">$${item.listingPrice.toFixed(2)}</p>
                </div>

                <button type="button" class="checkout-btn" id="checkoutBtn">Checkout</button>
              </div>
        `;

        bagItemGrid.appendChild(div);

    })

    const checkoutBtns = document.querySelectorAll('.checkout-btn');
    console.log(checkoutBtns);

    checkoutBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const card = btn.closest('.item-container');
            const id = card.dataset.id;
            const item = items.find(item => item.listingId === id)
            sessionStorage.setItem('item', JSON.stringify(item))
            window.location.href = `/checkout?listingId=${id}`;
        })
    })
}



function createShoppingCartItem(product) {
    return {
        itemType: 'product',
        baseInfo: {
            title: product.name
        },
        inventory: {
            backorderAllowed: true,
            quantity: 1,
        },
        pricing: { currency: 'USD', price: product.price },
        productSku: '',
        sellback: { enable: true, price: 0 },
        sellerId: user.uid,
        shipping: { shippingClass: '', weight: ''},
        status: '',
        updateAt: new Date().toISOString(),
        createdAt: new Date().toISOString()

    }
}

export function handleGuestCart(product) {
  // check if there a cart already in localStorage
 let cart = localStorage.get('cart')
 cart = cart ? JSON.parse(cart) : [];
 // check if item already in cart
 const existingItemIndex = cart.findIndex(item => item.productSku === product.productDetail.productSku);
 console.log("existing item:", existingItem);
 // if item add to quantity
 if (existingItemIndex > -1) {
  cart[existingItem].quantity += 1;
 } else {
  // if item does not exist add to cart array
  cart.append(createCartItem(product));
 }
 // store in localStorage
 localStorage.set("cart", JSON.stringify(cart))
}

export async function handleAuthenticatedCart(user, cartItem) {
    console.log("🛒 Cart item received: ", cartItem)
  try {
    const cartRef = collection(db, 'userProfiles', user.email, 'cart');

    let q;
    if (cartItem.itemType === 'authentication') {
        q = query(cartRef,
            where("itemType", "==", "authentication"),
            where("authRequestId", "==", cartItem.authRequestId)
        )
    } else if (cartItem.itemType === 'product') {
        q = query(cartRef,
            where("itemType", "==", "product"),
            where("productSku", "==", cartItem.productSku)
            
        )
    }

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
    
        if (cartItem.itemType === 'product') {
            const existingDoc = snapshot.docs[0];
            const docRef = collection(db, 'userProfiles', user.email, 'cart', existingDoc.id);
            // update quantity
            await updateDoc(docRef, {
                quantity: existingDoc.data().quantity += 1,
                updateAt: new Date().toISOString()
            })

            return { success: true, action: 'updated' };
        } else {
            return { success: false, message: 'Authentication Request already in cart!'}
        }
    } else {
        await addDoc(cartRef, cartItem)

        return {success: true, action: '✅ Item added to cart'};
    }

  } catch (error) {
    console.error("Error occur when handling authenticated cart: ", error.message);
  }
  
}



export async function getUserCartCount(user) {
    try {

        if (!user) {
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            const totalQuantity = cart.reduce((total, item) => {
                return total + (item.quantity || 1);
            }, 0);

            return totalQuantity;

        } else {
            // get user current cart count
            let totalQuantity = 0;
            const cartSnapshot = await getDocs(collection(db, "carts", user.userId, "items"));
            cartSnapshot.forEach(doc => {
                totalQuantity += doc.data().quantity || 1
            });

            console.log("🛒 Total items in cart: ", totalQuantity);
            return totalQuantity;
        }

    }
    catch (error) {
        console.log("😭 Error occured when fetching count: ", error.message);
        return 0;
    }
   
}

export function updateCartCount(count) {
    const cartAmount = document.getElementById('cart-amount');
    // update cart count
    if (count > 0) {
        cartAmount.textContent = count;
        cartAmount.style.display = 'flex';
        console.log("🔄 More than 0 in cart showing counter!");
    } else {
        cartAmount.textContent = '';
        cartAmount.style.display = 'none';
        console.log(" 👌 Zero items in cart, removed cart amount!");
    }

    
    
}


