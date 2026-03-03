
import { db, doc, getDoc, getDocs, collection, query, where } from '../api/firebase-client.js';
import { checkUserStatus } from '../auth/auth.js';


let yourSelectedItems = [];
let theirSelectedItems = [];

const currentUser = await checkUserStatus();


// available items
const availableItemsGrids = document.querySelectorAll(".available-items-grid");
const selectedItemsGrids = document.querySelectorAll(".selected-items-grid");
const yourTotalItems = document.querySelector(".your-item .available-items-grid").querySelectorAll(".available-item-card");
const theirTotalItems = document.querySelector(".their-item .available-items-grid").querySelectorAll(".available-item-card");
// cta buttons
const createTradeRequestBtn = document.getElementById("create-trade-request");
const cancelTradeRequestBtn = document.getElementById("cancel-trade-request");

// selected items count
let yourSelectedItemsCount = document.querySelector(".your-item .item-counter");
let theirSelectedItemsCount = document.querySelector(".their-item .item-counter");

// search
const yourSearchInput = document.getElementById("yourSearchInput");
const theirSearchInput = document.getElementById("theirSearchInput");

const tradeConfirmationModal = document.querySelector(".trade-confirmation-modal");
const cancelConfirmBtn = tradeConfirmationModal.querySelector('.cancel-trade-request');
const confirmBtn = tradeConfirmationModal.querySelector('.confirm-trade');

// modal buttons
const backToTradingPageBtn = document.querySelector(".trade-confirmation-modal-content .back-to-trading-page");
const viewTradeRequestBtn = document.querySelector(".trade-confirmation-modal-content .view-trade-request");
const viewTradeRequestPage = document.getElementById("view-trade-request");

// fee elements
const totalFeesValue = document.getElementById('total-fees-value');
const finalTotalValue = document.getElementById('final-total-value');

const urlParams = new URLSearchParams(window.location.search);
const selectedUserId = urlParams.get('with');

if (!selectedUserId) {
  alert('No user selected. Redirecting...')
  window.location.href = '/trade'
}

console.log("selected user id: ", selectedUserId)

const selectedUser = await loadSelectedUser();
const yourProducts = await loadYourInventory();
const theirProducts = await loadTheirInventory();

displaySelectedUser(selectedUser);
displayYourInventory(yourProducts);
displayTheirInventory(theirProducts);

yourSearchInput.addEventListener("input", (e) => {
  console.log("searching your inventory:", e.target.value);
  let searchProduct = e.target.value.trim(); // product your are looking for
  const filteredProducts = searchInventoryForProduct(searchProduct,yourProducts);
  displayYourInventory(filteredProducts);

})

theirSearchInput.addEventListener("input", (e) => {
  console.log("searching their inventory:", e.target.value);
  let searchProduct = e.target.value.trim(); // product you want to receive
  const filteredProducts = searchInventoryForProduct(searchProduct, theirProducts);
  displayTheirInventory(filteredProducts);
  

})

availableItemsGrids.forEach((grid) => {
  grid.addEventListener("click", (e) => {
  
    const itemCard = e.target.closest(".available-item-card");
    if (!itemCard) return; 

    itemCard.classList.toggle('selected');
    const isNowSelected = itemCard.classList.contains('selected');
    console.log("Now selected:", isNowSelected);
    console.log("current item selected ",itemCard)
    const itemData = {
      id: itemCard.dataset.id,
      productName: itemCard.querySelector(".item-name").textContent,
      productSku: itemCard.querySelector(".item-sku").textContent,
      productValue: itemCard.querySelector(".item-value").textContent,
      productCondition: itemCard.querySelector(".item-condition").textContent,
      productBox: true,
      isAuthenticated: true
    }

    const theirGrid = itemCard.closest('.their-item');
    const yourGrid = itemCard.closest('.your-item');

    // determine where item was selected
    if (isNowSelected) {
      if(yourGrid) {
       yourSelectedItems.push(itemData);
      } else if (theirGrid) {
        theirSelectedItems.push(itemData);
      }
    } else {
      if (yourGrid) {
        yourSelectedItems = yourSelectedItems.filter(item => item.id !== itemData.id)
      } else if (theirGrid) {
        theirSelectedItems = theirSelectedItems.filter(item => item.id !== itemData.id)
      }
        
    }
    

    if (yourSelectedItems.length === 0) {
      console.log("❌ You have no selected any items to trade!");
    } else if (theirSelectedItems.length === 0) {
        console.log("❌ You have no selected any item you want!");
    }

    yourSelectedItemsCount.textContent = `${yourSelectedItems.length}/${yourTotalItems.length} Selected`;
    theirSelectedItemsCount.textContent = `${theirSelectedItems.length}/${theirTotalItems.length} Selected`;

    console.log("your selected items: ", yourSelectedItems);
    console.log("their selected items: ", theirSelectedItems);

    // Update the total value
    let yourTotal = calculateTotal(yourSelectedItems);
    let theirTotal = calculateTotal(theirSelectedItems);

    // Update the total value
    document.querySelector(".your-value .amount").textContent = `$${yourTotal}`;
    document.querySelector(".their-value .amount").textContent = `$${theirTotal}`;

    // Update the value difference
    updateValueDifference(yourTotal, theirTotal)
    
    const fees = calculateTotalFees();

    totalFeesValue.textContent = `$${fees}`;
    finalTotalValue.textContent = `$${calculateFinalTotal(yourTotal,theirTotal)}`;

  });
});

createTradeRequestBtn.addEventListener("click", () => {

  const yourTotalValue = parseInt(document.querySelector('.your-value .amount').textContent.replace('$', ''));
  const theirTotalValue = parseInt(document.querySelector('.their-value .amount').textContent.replace('$', ''));
  const tradingFee = parseInt(document.querySelector('.trading-fee .fee-value').textContent.replace('$', ''));
  

  if (yourTotalValue === 0 && theirTotalValue === 0) {
    showErrorModal("No items selected!", "Please select at least one item");
  } else {
    tradeConfirmationModal.classList.add('active');
    document.body.style.overflow = "hidden";

    updateModalValues(yourTotalValue, theirTotalValue, tradingFee);

    if (cancelConfirmBtn) {
      cancelConfirmBtn.addEventListener('click', () => {
        tradeConfirmationModal.classList.remove('active');
        document.body.style.overflow = "auto";
      })
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        confirmBtn.textContent = "Creating trade request...";

        // create a request in firebase
        createTradeRequest();

        // show confirmation modal
        showErrorModal("Trade Request Created!", "Your trade request has been successfully created!", "info" );

        tradeConfirmationModal.classList.remove("active");
        document.body.style.overflow = "auto";

      })
    }
  }

  tradeConfirmationModal.addEventListener('click', (e) => {
    if (e.target === tradeConfirmationModal) {
      tradeConfirmationModal.classList.remove('active');
      document.body.style.overflow = "auto";
    }
  })
});

// Add event listener to the cancel trade request button
cancelTradeRequestBtn.addEventListener("click", () => {

  // clear the selected items
  const selectedItems = document.querySelectorAll(".selected-item-card");
  selectedItems.forEach((item) => {
    item.remove();
  });

  // redirect to the profile page
  window.location.href = "/";
});



async function loadSelectedUser() {
  if (typeof selectedUserId !== 'string') {
    console.error("selected user is not string!");
    return null;
  } else {
    try {
      const userRef = doc(db, "userProfiles", selectedUserId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.error("user does not exist!");
        window.location.href = '/trade';
        return null;
      }

      const userData = {
        id: userSnap.id,
        ...userSnap.data()
      }

      return userData;

    } catch (error) {
      console.error("Failed to load selected user!", error);
      alert('Error loading user. Please try again.')
      return null;
    }
    

  }
}

async function loadYourInventory() {
  const userId = currentUser.email;
  console.log("ownerId: ", userId)
  if (!userId || typeof userId !== "string") {
      console.error("this function takes a string ")
  }

  try {
  // load user products
  const listingsRef = collection(db, "listings");
  const q  = query(listingsRef, 
    where("ownerId", "==", userId),
    where("status", "==", "active"),
    where("availableForTrade", "==", true)
  );
  const listingsSnapshot = await getDocs(q);

  // map to array
  const items = listingsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))

  console.log("Your items:", items);

  return items;

  } catch (error) {
    console.log("Failed to load your products: ", error)
    throw new Error("Failed to load your products");
  }  
  
}

async function loadTheirInventory() {
  // console.log("TradeId: ", selectedUserId)
  if (!selectedUserId || typeof selectedUserId !== "string") {
      console.error("this function takes a string ")
  }

  try {
  // load user products
  const listingsRef = collection(db, "listings");
  const q  = query(listingsRef, 
    where("ownerId", "==", selectedUserId),
    where("status", "==", "active"),
    where("availableForTrade", "==", true)
  );
  const listingsSnapshot = await getDocs(q);

  // map to array
  const items = listingsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))

  console.log("Their items:", items);
  return items;

  } catch (error) {
    console.error("Failed to load your products: ", error)
    throw error;
  } 
}

function searchInventoryForProduct(productName, products) {
  const searchTerm = productName.toLowerCase();

  const filteredProducts = products.filter(product => 
    product.productName.toLowerCase().includes(searchTerm) ||
    product.productSku.toLowerCase().includes(searchTerm)
  );

  console.log("Filtered products: ", filteredProducts);

  return filteredProducts; 
}

function displaySelectedUser(user) {
  const userInfoSection = document.getElementById('selectedUserInfo');

  if (!userInfoSection) return;

  console.log(user)

  const username = user.username || 'Unknown';
  const rating = user.sellerOverview?.sellerRating;
  const totalTrades = user.sellerOverview?.productsSold || 0;
  const isVerified = user.accountInfo?.isVerified || false;
  const joinYear = user.accountInfo?.joinedDate
    ? new Date(user.accountInfo.joinedDate.toDate()).getFullYear()
    : '2026';

  userInfoSection.innerHTML = `
    <div class="user-header">
      <div class="user-content">
        <div class="user-avatar">
              <img
                src="/images/default-avatar.svg" 
                alt=${username}
                width="60"
                height="60"
              >
        </div>
        <div class="user-stats">
            <div class="user-id">
              <h3 class="user-name">${username}</h3>
              <span class="verified-badge" title="Verified user">
                ${isVerified ? '<i class="fa-solid fa-circle-check"></i>' : ""} 
              </span>
              <span class="user-at">@${username}</span>
            </div>
            <div class="user-info">
              <div class="rating" title="Average rating">
                <i class="fa-solid fa-star" aria-hidden="true"></i>
                <span>${rating}</span>
              </div>
              <div class="user-trades">
                <p>${totalTrades} trades</p>
              </div>
              <div class="user-start-date">
                <p>Since ${joinYear}</p>
              </div>
            </div>
          </div>
      </div>
        
      <div>
        <button type="button" class="msg-user-button">
          <i class="fa-regular fa-message"></i>
          Message
        </button>
      </div>
    </div>
  `;
}

function displayYourInventory(items) {
  if(!items || !Array.isArray(items)) {
    console.error("Please ensure items are array or items exist!");
    throw new Error("Provided parameter is invaild");
  }
  const yourGridContainer = document.querySelector(".trade-section.your-item .available-items-grid");
  // console.log("your grid: ",yourGridContainer);

  if (!yourGridContainer) {
    console.log("Your grid container does not exist!");
    return null;
  }

  yourGridContainer.innerHTML = "";

  // loop through items
  items.forEach(item => {
    const card = document.createElement('div');
    card.classList.add("available-item-card");
    card.dataset.id = item.id
    card.innerHTML = `
    <div class="item-image-container">
      <img
        src="${item.images[0]}"
        alt="${item.productName}"
        width="100px"
        height="100px"
        class="item-image"
      />
      </div>
      <div class="available-item-info">
        <h3 class="item-name">${item.productName}</h3>
        <p class="item-sku">${item.productSku}</p>
        <p class="item-size">Size: ${item.size}</p>
        <p class="item-value">Value: $${item.estimatedValue}</p>
        <p class="item-condition">Condition: ${item.condition}</p>
        <p class="item-box"><i class="fa-solid fa-check"></i> Original Box Included</p>
        <div class="item-auth">
          <i class="fa-solid fa-circle-check"></i>
          <p>Authenticity Guaranteed</p>
        </div>
    </div>

    `;

    yourGridContainer.append(card);
  })

  
}

function displayTheirInventory(items) {
  if(!items || !Array.isArray(items)) {
    console.error("Please ensure items are array or items exist!");
    throw new Error("Provided parameter is invaild");
  }
  const theirGridContainer = document.querySelector(".trade-section.their-item .available-items-grid");
  console.log("their grid: ",theirGridContainer);

  if (!theirGridContainer) {
    console.log("Their grid container does not exist!");
    return null;
  }

  theirGridContainer.innerHTML = "";

  // loop through items
  items.forEach(item => {
    const card = document.createElement('div');
    card.classList.add("available-item-card");
    card.dataset.id = item.id
    card.innerHTML = `
    <div class="item-image-container">
      <img
        src="${item.images[0]}"
        alt="${item.productName}"
        width="100px"
        height="100px"
        class="item-image"
      />
      </div>
      <div class="available-item-info">
        <h3 class="item-name">${item.productName}</h3>
        <p class="item-sku">${item.productSku}</p>
        <p class="item-size">Size: ${item.size}</p>
        <p class="item-value">Value: $${item.estimatedValue}</p>
        <p class="item-condition">Condition: ${item.condition}</p>
        <p class="item-box"><i class="fa-solid fa-check"></i> Original Box Included</p>
        <div class="item-auth">
          <i class="fa-solid fa-circle-check"></i>
          <p>Authenticity Guaranteed</p>
        </div>
    </div>

    `;

    theirGridContainer.append(card);
  })
}


function calculateTotalFees() {
  const fees = document.querySelectorAll('.fees-breakdown-container .fee-value');
  let total = 0
  fees.forEach(fee => {
    const feePrice = parseInt(fee.textContent.replace('$', ''));
    console.log(feePrice)
    total += feePrice;
  })

  return total;
}

function calculateFinalTotal(yourTotal, theirTotal) {
  if (yourTotal === 0 || theirTotal === 0) {
    return 0;
  }
  const fees = calculateTotalFees();
  const difference =  Math.abs(yourTotal - theirTotal);
  // user A value is greater than user B value, user A pays fees and user B difference + fees
  if (yourTotal > theirTotal) {
    return fees;
  // user B value is greater than user A value, user B pays fees and user A pays difference + fees
  } else if (theirTotal > yourTotal) {
    return fees + difference;
  // values are equal, both users pay fees
  } else {
    return fees;
  }
}

function calculateTotal(selectedItems) {
  let total = 0;
  selectedItems.forEach((item) => {
    const itemValue = item.productValue;
    const priceMatch = itemValue.match(/\d+/);
    const price = priceMatch ? parseInt(priceMatch[0]) : 0;
    total += price;
  });

  return total;
}



function updateValueDifference(yourTotal, theirTotal) {
  const valueDifference = document.querySelector(".value-difference .alert-message");
  const favorDifference = Math.abs(theirTotal - yourTotal);


  if (favorDifference === 0) {
    valueDifference.textContent = "✅ Values are equal!";
  } else {
    const favorText = yourTotal > theirTotal ? "in their favor" : "in your favor";
    valueDifference.textContent = `There is a $${favorDifference} value difference ${favorText}.`;
  }
}

function updateModalValues(yourTotal, theirTotal, fee) {
  const modal = document.querySelector('.trade-confirmation-modal');

  if (modal && modal.classList.contains('active')) {
    const yourTotalValue = modal.querySelector('.your-items');
    const theirTotalValue = modal.querySelector('.their-items');
    const tradingFee = modal.querySelector('.fee-value');
    const finalTotalValue = modal.querySelector('.final-total-value');
  
    if (yourTotalValue) yourTotalValue.textContent = `$${yourTotal}`;
    if (theirTotalValue) theirTotalValue.textContent = `$${theirTotal}`;
    if (tradingFee) tradingFee.textContent = `$${fee}`;
    if (finalTotalValue) finalTotalValue.textContent = `$${calculateFinalTotal(yourTotal, theirTotal)}`;
  }
}


function showErrorModal(title, message, type) {
  let errorModal = document.querySelector('.errorModal');

  if (!errorModal) {
    errorModal = document.createElement('div');
    errorModal.className = 'errorModal';
    document.body.append(errorModal);
  }

  if (type === "info") {
    errorModal.classList.add('info');
  }

  errorModal.innerHTML = `
      <div>
        <p><strong>${title}</strong></p>
        <p>${message}</p>
      </div>
  `;

  errorModal.classList.remove('hiding');

  if (errorModal.hideTimeout) {
    clearTimeout(errorModal.hideTimeout)
  }

  errorModal.hideTimeout = setTimeout(() => {
    errorModal.classList.add('hiding')
  }, 3000);

}

function createTradeRequest(tradingItems, requestingItems, requestedUserId) {
  return;
}







