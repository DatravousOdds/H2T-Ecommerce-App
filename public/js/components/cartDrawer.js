import { removeFromCart, calculateSubtotal, decrementCartCount } from "../core/global.js";
import { checkUserStatus } from "../auth/auth.js";

const currentUser = await checkUserStatus();

const cartTemplate = (item) => 
`<div class="cart-item" data-id="${currentUser ? item.id : item.listingId}">
        <div class="seller-profile">
          <img src="${item.sellerPicture}" alt="" class="seller-profile-picture">
          <a href="#" class="seller-name">
            <span>${item.sellerName}</span>
          </a>
        </div>
        <div class="product-info-wrapper">
          <img src="${item.image}" />
        <div class="cart-item-info">
          <div class="cart-product-info">
            <p class="cart-item-brand">${item.brand}</p>
            <p class="cart-item-name">${item.productName}</p>
            <p class="cart-item-size">Size: ${item.size}</p>
            <p class="cart-item-price">$${item.listingPrice.toFixed(2)}</p>
          </div>
          
        </div> 
        </div>
        
        <button class="cart-item-remove"  aria-label="Remove item">
          <i class="fa-regular fa-trash-can"></i>
        </button>
</div>`; 

async function renderCart(currentUser) {
  const cartDrawer = document.getElementById('cartDrawer');
  if(!cartDrawer) return;
  cartDrawer.innerHTML = "";
  
  const items = await getCartItems(currentUser);
  // console.log("items in cart:", items)
  const subtotal = await calculateSubtotal(items);

  cartDrawer.innerHTML = `
  <div class="cart-drawer-header">
        <h2>Your Bag</h2>
        <button class="modal-close" id="cartDrawerClose" aria-label="Close cart">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    
      <div class="cart-drawer-body" id="cartDrawerBody">
        <!-- cart items will go here -->
        ${items.length ? items.map(cartTemplate).join('') : 'Cart is empty!'}
      </div>
    
      <div class="cart-drawer-footer">
        <div class="cart-subtotal">
          <span>Subtotal</span>
          <span>$${subtotal.toFixed(2) || 0}</span>
        </div>
        <a href="/cart" class="checkout-btn" id="checkoutBtn" role="button">View Cart</a>
  </div>`; 

  const removeItemBtn = document.querySelectorAll('.cart-item-remove');
  const cartDrawerClose = document.getElementById('cartDrawerClose');

  cartDrawerClose.addEventListener('click', () => {
    cartDrawer.classList.remove('is-open');
  });

  removeItemBtn.forEach(btn => {
    btn.addEventListener('click', async () => {
      const cartItem = btn.closest('.cart-item'); 
      const id = cartItem.dataset.id;
      // console.log("item id", id)
      const itemToRemove = document.querySelector(`[data-id="${id}"`);
      removeCartItemFromDisplay(itemToRemove)
      await removeFromCart(id, currentUser);
      decrementCartCount();
      updateSubtotal(currentUser);
    })
  })
};

export async function getCartItems(user) {
  // console.log("getCartItems called with user:", user);
  if (!user) {
    return JSON.parse(localStorage.getItem('cart') || '[]');

  } else {
    const userId = user.idToken;
    // console.log(`userId: ${userId}`)

    try {
      const request = await fetch('/api/cart', {
        headers: {
          'Authorization': `Bearer ${userId}` 
        }
      })

      if(!request.ok) {
        throw new Error(`Failed fetching cart: ${request.status}`)
      }

      const response = await request.json();
      return response;

    } catch (err) {
      console.error("Failed fetching to the server", err);
      return []
    }
  }

};

async function updateSubtotal() {
  const cartSubtotal = document.querySelector('.cart-subtotal');

  const items = await getCartItems();
  const updatedSubtotal = await calculateSubtotal(items);

  if (cartSubtotal) {
    cartSubtotal.innerHTML = `
    <span>Subtotal</span>
    <span>$${updatedSubtotal.toFixed(2)}</span>
    `;
  }
}

function removeCartItemFromDisplay(element) {
  element.remove();
}

export function initCartDrawer() {
  renderCart(currentUser)
  window.addEventListener('cartUpdated', () => renderCart(currentUser))
}





    

