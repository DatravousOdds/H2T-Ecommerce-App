
import { getDocs, where, query, collection, doc, addDoc, updateDoc } from '../api/firebase-client.js';
import { db } from '../api/firebase-client.js';



// create small product cards
const createSmCards = (data) => {
    return `
    <div class="sm-product">  
                    <img src="${data.image}" class="sm-product-img"
                     alt="">
                     <div class="sm-text">
                        <p class="sm-product-name">${data.name}</p>
                        <p class="sm-des">${data.shortDes}</p>
                     </div>
                     <div class="item-counter">
                        <button class="counter-btn decrement">-</button>
                        <p class="item-count">${data.item}</p>
                        <button class="counter-btn increment">-</button>
                     </div>
                     <p class="sm-price" data-price="${data.sellPrice}">$${data.sellPrice * data.item}</p>
                     <button class="sm-delete-btn"><img src="images/close.png" alt=""></button>
                </div>
    `;

}

let totalBill = 0;

const fixProducts = (name) => {
    const element = document.querySelector(`.${name}`);
    let data = JSON.parse(localStorage.getItem(name));
    if (data == null) {
        element.innerHTML = `<img src="images/empty-cart.png" class="empty-img" alt="">`;
    } else {
        for (let i = 0; i < data.length; i++) {
            element.innerHTML += createSmCards(data[i]);
            if (name == 'cart') {
                totalBill += Number(data[i].sellPrice * data[i].item);
            }
           billUpdate();
        }
    }

    setupEvent(name);
}

const billUpdate = () => {
    let billPrice = document.querySelector('.bill');
            billPrice.innerHTML = `$${totalBill}`;
}

const setupEvent = (name) => {
    // setup counter event
    const counterMinus = document.querySelectorAll(`.${name} .decrement`);
    const counterAdd = document.querySelectorAll(`.${name} .increment`);
    const notetakes = document.querySelectorAll(`.${name} .item-count`);
    const price = document.querySelectorAll(`.${name} .sm-price`);
    const delBtn = document.querySelectorAll(`.${name} .sm-delete-btn`);

    let product = JSON.parse(localStorage.getItem(name));

    notetakes.forEach((item, i) => {
        let cost = Number(price[i].getAttribute('data-price'));

        counterMinus[i].addEventListener('click', () => {
            if (item.innerHTML > 1) {
                item.innerHTML--;
                totalBill -= cost;
                price[i].innerHTML = `${item.innerHTML * cost}`;
                if(name == 'cart'){ billUpdate() }
                product[i].item = item.innerHTML;
                localStorage.setItem(name, JSON.stringify(product));
            }
        })
        counterAdd[i].addEventListener('click', () => {
            if (item.innerHTML < 9) {
                item.innerHTML++;
                totalBill += cost;
                price[i].innerHTML = `${item.innerHTML * cost}`;
                if(name == 'cart'){ billUpdate() }
                product[i].item = item.innerHTML;
                localStorage.setItem(name, JSON.stringify(product));
            }
        })

    })

    delBtn.forEach((item, i) => {
        item.addEventListener('click', () => {
            product = product.filter((data, index) => index != i);
            localStorage.setItem(name, JSON.stringify(product));
            location.reload();
        })
    })
}


// fixProducts('cart');
// fixProducts('wishlist');

export function createAuthCartItem(authRequest) {
    console.log(`Item recieved: ${authRequest.productDetails} 👈🏾`)



    return {
        itemType: 'authentication', // ✅ Key differentiator
        authRequestId: authRequest.requestId, // Link to auth request doc
        primaryImage: authRequest.images[0]?.url || null,
        productName: authRequest.productDetails?.details?.Brand || 'Unknown',
        category: authRequest.productDetails?.productCategory,
        tier: {
            name: authRequest.tierSelection?.type,
            icon: authRequest.tierSelection?.icon,
            duration: authRequest.tierSelection?.duration
        },
        cost: parseFloat(authRequest.tierSelection?.cost?.replace('$', '') || 0),
        status: 'pending', // Current status
        quantity: 1,
        addedAt: new Date().toISOString()
    };
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

export async function addToCart(user, item, itemType) {
    // console.log(`Item addToCart recieved: ${item} 👈🏾`)
  try {
    let cartItem;

    if (itemType === 'authentication') {
        cartItem = createAuthCartItem(item);
        console.log("Create authenticated cart item: ", cartItem)
    } else if (itemType === 'product') {
        cartItem = createShoppingCartItem(item);
    } else {
        console.error("❗️Invaild ItemType!");
    }

    // check if user is logged in or not
    if (!user) {
        console.log("🛒 Adding to guest cart")
        return handleGuestCart(cartItem);
    } else {
        console.log("🛒 Adding to authenticated user cart")
       return await handleAuthenticatedCart(user, cartItem);
    }

  } catch (error) {
    console.error("❌ Error occured when adding to cart! ", error);
    return { success: false, error: error.message };
  }

}

export async function getUserCartCount(user) {
    try {

        if (!user) {
            const cart = JSON.parse(localStorage.get('cart') || [] );
            const totalQuantity = cart.reduce((total, item) => {
                total += (item.quantity || 1);
            }, 0);
            
            return totalQuantity;

        } else {
            // get user current cart count
            let totalQuantity = 0;
            const cartSnapshot = await getDocs(collection(db, "userProfiles", user.email, "cart"));
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