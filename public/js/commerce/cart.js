
import { getDocs, where, query, collection, doc, addDoc, updateDoc } from '../api/firebase-client.js';

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
    return {
        itemType: 'authentication', // ✅ Key differentiator
        authRequestId: authRequest.requestId, // Link to auth request doc
        primaryImage: authRequest.images[0]?.url || null,
        productName: authRequest.productDetails?.details?.Brand || 'Unknown',
        category: authRequest.productDetails?.category,
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
  try {
    const cartRef = collection(db, 'userProfiles', user.email, 'cart');

    let q;
    if (cartItem.itemType === 'authentication') {
        q = query(cartRef,
            where("itemType", "==", "authentication"),
            where("authRequestId", "==", product.requestId)
        )
    } else if (cartItem.itemType === 'product') {
        q = query(cartRef,
            where("itemType", "==", "product"),
            where("productSku", "==", product.productSku)
            
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
    }

  } catch {
    console.error("Error occur when handling authenticated cart: ", error.message);
  }
  
}

export async function addToCart(user, item, itemType) {
  try {
    let cartItem;

    if (itemType === 'authentication') {
        cartItem = createAuthCartItem(item);
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
        console.log("🛒 Adding to guest user cart")
       return await handleAuthenticatedCart(user, cartItem);
    }

  } catch (error) {
    console.error("❌ Error occured when adding to cart! ", error);
    return { success: false, error: error.message };
  }

}