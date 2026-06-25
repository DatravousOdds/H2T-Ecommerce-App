"use strict";

import {
  notification,
  formatRelativeTime,
  openPopupMenu,
  closePopupMenu
} from "./ui-helpers.js";
import { updatePayoutDisplay } from "./payouts.js";

const AMOUNTS = [10, 25, 50, 75, 100, 150, 200, 300, 400, 500];
let selectAmount = 0;
let walletBalance = 0;

// ---------------------------------------------------------------------------
// Formatters / display
// ---------------------------------------------------------------------------

function formatCurrency(amount) {
  return `$${parseFloat(amount).toFixed(2)}`;
}

export function updateWalletStatisticsDisplay(walletData) {
  document.querySelector(
    "#act-wallet-balance"
  ).textContent = `$${walletData.balance.toFixed(2)}`;

  document.querySelector(
    "#monthly-activity"
  ).textContent = `$${walletData.monthlyActivity.toFixed(2)}`;
  document.querySelector(
    "#pending-balance"
  ).textContent = `$${walletData.pendingBalance.toFixed(2)}`;
  document.querySelector("#currency-info").textContent = walletData.currency;
  document.querySelector("#update-status").textContent = formatRelativeTime(
    walletData.lastUpdated
  );
}

/**
 * Loads and displays payment/payout information for the user.
 * @param {Object} userData
 * @returns {Promise<void>}
 */
export async function loadPaymentInfoData(userData) {
  if (!userData) return null;
  const paymentData = userData.payments;
  const walletData = userData.wallet;

  updateWalletStatisticsDisplay(walletData);
  document.querySelector("#upcoming-payouts").textContent =
    paymentData.upcomingPayouts;
  document.querySelector("#payout-schedule").textContent =
    paymentData.payoutSchedule;

  await updatePayoutDisplay(userData, "all");
}

// ---------------------------------------------------------------------------
// Wiring: add funds / withdraw popups
// ---------------------------------------------------------------------------

export function initWallet() {
  const elements = {
    quickAmountsContainer: document.getElementById(
      "quick-amounts-container"
    ),
    fundsBalance: document.getElementById("funds-balance"),
    amountButtons: document.querySelectorAll(
      ".withdraw-container .amount-btn"
    ),
    withdrawAmount: document.querySelector(".amount-input"),
    closeWithdrawPopup: document.getElementById("popup-close-btn"),
    withdrawBtn: document.getElementById("widthdraw"),
    confirmWithdrawBtn: document.querySelector(".confirm-withdraw-btn"),
    addFundsBtn: document.getElementById("add-funds"),
    addFundsButton: document.getElementById("add-funds-btn"),
    addFundsCloseBtn: document.querySelector(".funds-container .close-button"),
    walletAmount: document.querySelector(".wallet-amount")
  };

  function updateFundsBalance(amount) {
    if (elements.fundsBalance) {
      elements.fundsBalance.value = amount.toFixed(2);
    }
  }

  function updateWalletDisplay() {
    const walletElement = document.getElementById("act-wallet-balance");
    if (walletElement) {
      walletElement.textContent = formatCurrency(walletBalance);
    }
    if (elements.walletAmount) {
      elements.walletAmount.textContent = `${formatCurrency(
        walletBalance
      )} USD`;
    }
  }

  function updateBalance(newAmount, action) {
    const amount = parseFloat(newAmount) || 0;
    if (action === "withdraw" && walletBalance >= amount) {
      walletBalance -= amount;
    } else if (action === "add") {
      walletBalance += amount;
    }
    updateWalletDisplay();
  }

  // Dynamically create Quick Amount Buttons (QABs)
  if (elements.quickAmountsContainer) {
    AMOUNTS.forEach((amount) => {
      const button = document.createElement("button");
      button.className = "amount-btn";
      button.value = amount;
      button.textContent = `$${amount}`;

      button.addEventListener("click", () => {
        selectAmount = amount;
        updateFundsBalance(selectAmount);
      });

      elements.quickAmountsContainer.appendChild(button);
    });
  }

  if (elements.fundsBalance) {
    elements.fundsBalance.addEventListener("blur", () => {
      const inputAmount = parseFloat(elements.fundsBalance.value);
      updateFundsBalance(isNaN(inputAmount) ? 0 : inputAmount);
    });

    elements.fundsBalance.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        elements.fundsBalance.blur();
      }
    });
  }

  elements.amountButtons?.forEach((button) => {
    button.addEventListener("click", () => {
      const amount = button.textContent.replace("$", "");
      if (elements.withdrawAmount) {
        elements.withdrawAmount.value = parseFloat(amount).toFixed(2);
      }
    });
  });

  elements.closeWithdrawPopup?.addEventListener("click", () => {
    closePopupMenu(".popup-overlay");
  });

  elements.withdrawBtn?.addEventListener("click", () => {
    openPopupMenu(".popup-overlay");
  });

  elements.addFundsBtn?.addEventListener("click", () =>
    openPopupMenu(".add-funds-menu")
  );

  elements.addFundsCloseBtn?.addEventListener("click", () =>
    closePopupMenu(".add-funds-menu")
  );

  elements.addFundsButton?.addEventListener("click", () => {
    const amount = parseFloat(elements.fundsBalance?.value) || 0;
    notification.success(amount, "deposit");
    updateBalance(amount, "add");
    closePopupMenu(".add-funds-menu");
  });

  elements.confirmWithdrawBtn?.addEventListener("click", () => {
    const amount = parseFloat(elements.withdrawAmount?.value) || 0;
    if (amount <= walletBalance) {
      notification.success(amount, "withdraw");
      updateBalance(amount, "withdraw");
      closePopupMenu(".popup-overlay");
    } else {
      notification.error("insufficient funds");
    }
  });
}

