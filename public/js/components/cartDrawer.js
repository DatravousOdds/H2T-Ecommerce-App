import { removeFromCart, calculateSubtotal, decrementCartCount, getCartItems } from "../core/global.js";
import { checkUserStatus } from "../auth/auth.js";

let currentUser = null;

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

const authTemplate = (item) =>
`<div class="cart-item cart-item--auth" data-id="${currentUser ? item.id : item.authRequestId}">
        <div class="product-info-wrapper">
          <img src="${item.primaryImage}" />
        <div class="cart-item-info">
          <div class="cart-product-info">
            <p class="cart-item-brand">${item.category}</p>
            <p class="cart-item-name">${item.productName}</p>
            <p class="cart-item-tier">${item.tier?.icon ?? ''} ${item.tier?.name ?? ''} Tier</p>
            <p class="cart-item-price">$${item.cost.toFixed(2)}</p>
          </div>
        </div>
        </div>

        <button class="cart-item-remove" aria-label="Remove item">
          <i class="fa-regular fa-trash-can"></i>
        </button>
</div>`;

// Mirrors cartTemplate/authTemplate's shape (avatar+name, image, brand/name/
// size/price lines) so the drawer doesn't jump when real items swap in. The
// close button is wired here too since getCartItems() is async -- without
// it, clicking close during that gap would do nothing until it resolves.
function cartSkeletonHTML() {
  return `
    <div class="cart-item skeleton-item">
      <div class="seller-profile">
        <span class="skeleton" style="width: 20px; height: 20px; border-radius: 50%;"></span>
        <span class="skeleton skeleton-line short" style="width: 80px;"></span>
      </div>
      <div class="product-info-wrapper">
        <span class="skeleton" style="width: 50px; height: 50px; border-radius: 4px; flex-shrink: 0;"></span>
        <div class="cart-item-info">
          <div class="cart-product-info">
            <span class="skeleton skeleton-line short"></span>
            <span class="skeleton skeleton-line medium"></span>
            <span class="skeleton skeleton-line short"></span>
            <span class="skeleton skeleton-line short" style="width: 30%;"></span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderCartSkeleton(cartDrawer, count = 2) {
  cartDrawer.innerHTML = `
    <div class="cart-drawer-header">
      <h2>Your Bag</h2>
      <button class="modal-close" id="cartDrawerClose" aria-label="Close cart">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <div class="cart-drawer-body" id="cartDrawerBody">
      ${Array.from({ length: count }, cartSkeletonHTML).join("")}
    </div>
  `;

  document.getElementById('cartDrawerClose').addEventListener('click', () => {
    cartDrawer.classList.remove('is-open');
  });
}

async function renderCart(currentUser) {
  const cartDrawer = document.getElementById('cartDrawer');
  if(!cartDrawer) return;
  renderCartSkeleton(cartDrawer);

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
        ${items.length ? items.map(item => item.itemType === 'authentication' ? authTemplate(item) : cartTemplate(item)).join('') : 'Cart is empty!'}
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

export async function initCartDrawer() {
  currentUser = await checkUserStatus();
  renderCart(currentUser)
  window.addEventListener('cartUpdated', () => renderCart(currentUser))
}





    

