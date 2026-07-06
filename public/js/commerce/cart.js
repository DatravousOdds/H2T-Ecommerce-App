
import { getDocs, where, query, collection, doc, addDoc, updateDoc } from '../api/firebase-client.js';
import { db } from '../api/firebase-client.js';
import { checkUserStatus } from '../auth/auth.js';
import { initCartDrawer } from '../components/cartDrawer.js';
import { removeFromCart, decrementCartCount, getCartItems } from '../core/global.js';

renderCartSkeletons();

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

// Mirrors productBagItemMarkup's layout (avatar + product image + text
// lines + cost row) so the skeleton doesn't reflow when real cards swap in.
function cartSkeletonHTML() {
    return `
        <div class="item-container skeleton-item">
            <div class="item-wrapper">
                <div class="item-info">
                  <div class="seller-info">
                    <div class="skeleton" style="width:50px;height:50px;border-radius:50%;"></div>
                    <div class="seller-at">
                      <span class="skeleton skeleton-line short"></span>
                      <span class="skeleton skeleton-line short"></span>
                    </div>
                  </div>
                  <div class="skeleton" style="width:200px;height:200px;border-radius:8px;margin-top:1rem;"></div>
                </div>
                <div class="item-description">
                  <span class="skeleton skeleton-line long"></span>
                  <span class="skeleton skeleton-line short"></span>
                  <span class="skeleton skeleton-line short"></span>
                </div>
              </div>

              <div class="item-cost">
                <div class="cost-row">
                  <span class="skeleton skeleton-line medium"></span>
                </div>
                <div class="skeleton" style="width:100%;height:38px;border-radius:4px;margin-top:0.5rem;"></div>
              </div>
        </div>
    `;
}

function renderCartSkeletons(count = 2) {
    const bagItemGrid = document.getElementById('bagItemGrid');
    if (!bagItemGrid) return;
    bagItemGrid.innerHTML = Array.from({ length: count }, cartSkeletonHTML).join("");
}

function displayCartItems(items) {
    const bagItemGrid = document.getElementById('bagItemGrid');
    if (!bagItemGrid) return;
    bagItemGrid.innerHTML = "";

    if (items.length <= 0) {
        bagItemGrid.innerHTML = `
            <div class="empty-wrapper">
                <h3>Cart is empty!</h3>
                <img src="./images/empty-cart_1.png" alt="Empty cart image">
            </div>
            
        `;
    }

    items.forEach(item => {
        console.log("bag item:", item);
        const isAuth = item.itemType === 'authentication';
        const div = document.createElement('div');
        div.classList.add('item-container');
        div.dataset.id = isAuth ? item.authRequestId : item.listingId;
        div.dataset.cartId = currentUser ? item.id : (isAuth ? item.authRequestId : item.listingId);
        div.innerHTML = isAuth ? authBagItemMarkup(item) : productBagItemMarkup(item);

        bagItemGrid.appendChild(div);

    })

    const checkoutBtns = document.querySelectorAll('.checkout-btn');
    console.log(checkoutBtns);

    checkoutBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const card = btn.closest('.item-container');
            const id = card.dataset.id;
            const item = items.find(item => item.listingId === id || item.authRequestId === id)
            sessionStorage.setItem('item', JSON.stringify(item))

            const checkoutUrl = item.itemType === 'authentication'
                ? `/checkout?authRequestId=${id}`
                : `/checkout?listingId=${id}`;
            window.location.href = checkoutUrl;
        })
    })

    const deleteBtns = document.querySelectorAll('.delete-product');

    deleteBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const card = btn.closest('.item-container');
            const cartId = card.dataset.cartId;
            await removeFromCart(cartId, currentUser);
            decrementCartCount();
        })
    })
}

function productBagItemMarkup(item) {
    return `
            <div class="item-wrapper">
                <div class="item-info">
                  <div class="seller-info">
                    <img src="${item.sellerPicture}" alt="Seller profile photo">
                    <div class="seller-at">
                      <p>${item.sellerName}</p>
                      <p>@${item.sellerName}</p>
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
}

function authBagItemMarkup(item) {
    return `
            <div class="item-wrapper">
                <div class="item-info">
                  <div class="seller-info">
                    <div class="seller-at">
                      <p>Authentication Service</p>
                      <p>${item.tier?.icon || ''} ${item.tier?.name || ''} Tier</p>
                    </div>
                  </div>
                  <img src="${item.primaryImage}" class="product-img" alt="${item.productName}">
                </div>
                <div class="item-description">
                  <p>${item.productName} &mdash; ${item.category}</p>
                  <div class="item-price">
                    <p class="listing-price">$${item.cost.toFixed(2)}</p>
                  </div>
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
                  <p class="item-cost">$${item.cost.toFixed(2)}</p>
                </div>

                <button type="button" class="checkout-btn" id="checkoutBtn">Checkout</button>
              </div>
        `;
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


