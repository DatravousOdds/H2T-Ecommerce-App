
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

// Add event listener to the available items grid
availableItemsGrids.forEach((grid) => {
  grid.addEventListener("click", (e) => {
    const itemCard = e.target.closest(".available-item-card");
    if (!itemCard) return; 

    itemCard.classList.toggle('selected')

    const yourSelectedItems = document
      .querySelector(".your-item .available-items-grid")
      .querySelectorAll(".available-item-card.selected");

    const theirSelectedItems = document
      .querySelector(".their-item .available-items-grid")
      .querySelectorAll(".available-item-card.selected");

    if (yourSelectedItems.length === 0) {
      console.log("❌ You have no selected any items to trade!");
    }
     
    if (theirSelectedItems.length === 0) {
        console.log("❌ You have no selected any item you want!");
    }

    yourSelectedItemsCount.textContent = `${yourSelectedItems.length}/${yourTotalItems.length} Selected`;
    theirSelectedItemsCount.textContent = `${theirSelectedItems.length}/${theirTotalItems.length} Selected`;

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
  const fees = calculateTotalFees();
  const difference =  Math.abs(yourTotal - theirTotal)
  return difference + fees;
}

function calculateTotal(selectedItems) {
  let total = 0;
  selectedItems.forEach((item) => {
    const itemValue = item.querySelector('.item-value')
    const priceMatch = itemValue.textContent.match(/\d+/);
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
    const favorText = yourTotal > theirTotal ? "in your favor" : "in their favor";
    valueDifference.textContent = `There is a $${favorDifference} value difference ${favorText}.`;
  }
}

function updateModalValues(yourTotal, theirTotal, fee) {
  const modal = document.querySelector('.trade-confirmation-modal');

  if (modal && modal.classList.contains('active')) {
    const yourTotalValue = modal.querySelector('.your-items');
    const theirTotalValue = modal.querySelector('.their-items');
    const tradingFee = modal.querySelector('.fee-value');
  
    if (yourTotalValue) yourTotalValue.textContent = `$${yourTotal}`;
    if (theirTotalValue) theirTotalValue.textContent = `$${theirTotal}`;
    if (tradingFee) tradingFee.textContent = `$${fee}`;
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

}




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


