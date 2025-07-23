// function to generate countries
// const generateCountries = (apiUrl, selectId) => {
//   fetch(apiUrl)
//     .then((res) => res.json())
//     .then((data) => {
//       const select = document.getElementById(selectId);

//       // sorts countries
//       const sortCountries = data.sort((a, b) => {
//         return a.name.common.localeCompare(b.name.common);
//       });

//       // Check if there is an select element
//       if (select) {
//         sortCountries.forEach((country) => {
//           const option = document.createElement("option");
//           option.value = country.cca2;
//           option.textContent = country.name.common;

//           select.appendChild(option);
//         });

//         // Call generateRegions to populate regions
//         // generateRegions(data);
//       } else {
//         console.error(`Select element with id "${selectId}" not found.`);
//       }
//     })

//     .catch((err) => console.log(("Error Message:", err)));
// };

const generateRegions = (countriesData) => {
  const selectSelect = document.getElementById("shipping-state");

  countriesData.forEach((country) => {
    // console.log(country.region)
    regions.add(country.region);
    // console.log(country.cca2)
  });

  const regionSelect = document.getElementById("shipping-state");

  if (regionSelect) {
  }
};

function formatFirebaseDate(timestamp) {
  const date = timestamp.toDate();
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function setError(inputElement, errorElement, message) {
  errorElement.textContent = message;
  inputElement.classList.add("input-error");
  errorElement.classList.add("error-msg");
}

function clearError(inputElement, errorElement) {
  errorElement.textContent = "";
  inputElement.classList.remove("input-error");
  errorElement.classList.remove("error-msg");
}

function validateEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

function validatePhone(phoneNumber) {
  const phonePattern = /^\d{3}-\d{3}-\d{4}$/;
  return phonePattern.test(phoneNumber);
}

function validateAddress(address) {
  return address.length > 5;
}

function validatePostalCode(postalCode) {
  const postalRegex = /^\d{5}(-\d{4})?$/; // Validates 12345 or 12345-6789
  return postalRegex.test(postalCode);
}

function validateForm(formElement) {
  let isValid = true; // Assume the form is valid initially

  // Get form fields
  const firstname = formElement.querySelector("[name='fname']")?.value.trim();
  const lastname = formElement.querySelector("[name='lname']")?.value.trim();
  const email = formElement.querySelector("[name='email']")?.value.trim();
  const phoneNumber = formElement
    .querySelector("[name='phoneNumber']")
    ?.value.trim();
  const username = formElement
    .querySelector("[name='profile-username']")
    ?.value.trim(); // Optional for shipping form
  const country = formElement.querySelector("[name='country']")?.value.trim();
  const addressInput = formElement.querySelector("[name='address']");
  const address = addressInput?.value.trim();
  const city = formElement.querySelector("[name='city']")?.value.trim();
  const postal = formElement.querySelector("[name='postal']")?.value.trim();
  const stateSelect = formElement
    .querySelector("[name='state-region']")
    ?.value.trim();

  // Get error message containers
  const addressError = formElement.querySelector("#addressError");
  const countryError = formElement.querySelector("#countryError");
  const fnameError = formElement.querySelector("#fnameError");
  const lnameError = formElement.querySelector("#lnameError");
  const emailError = formElement.querySelector("#emailError");
  const phoneError = formElement.querySelector("#phoneError");
  const usernameError = formElement.querySelector("#usernameError");
  const cityError = formElement.querySelector("#cityError");
  const postalError = formElement.querySelector("#postalError");
  const stateError = formElement.querySelector("#stateError");

  // Clear previous errors
  if (addressError)
    clearError(formElement.querySelector("[name='address']"), addressError);
  if (fnameError)
    clearError(formElement.querySelector("[name='fname']"), fnameError);
  if (lnameError)
    clearError(formElement.querySelector("[name='lname']"), lnameError);
  if (emailError)
    clearError(formElement.querySelector("[name='email']"), emailError);
  if (phoneError)
    clearError(formElement.querySelector("[name='phoneNumber']"), phoneError);
  if (countryError)
    clearError(formElement.querySelector("[name='country']"), countryError);
  if (usernameError)
    clearError(
      formElement.querySelector("[name='profile-username']"),
      usernameError
    );
  if (cityError)
    clearError(formElement.querySelector("[name='city']"), cityError);
  if (postalError)
    clearError(formElement.querySelector("[name='postal']"), postalError);
  if (stateError)
    clearError(formElement.querySelector("[name='state-region']"), stateError);

  console.log(phoneNumber);
  console.log(phoneError);

  // Validate First Name
  if (firstname === "" && formElement.querySelector("[name='fname']")) {
    setError(
      formElement.querySelector("[name='fname']"),
      fnameError,
      "First name is required"
    );
    isValid = false;
  }

  // Validate Last Name
  if (lastname === "" && formElement.querySelector("[name='lname']")) {
    setError(
      formElement.querySelector("[name='lname']"),
      lnameError,
      "Last name is required"
    );
    isValid = false;
  }

  // Validate Email
  if (email === "") {
    setError(
      formElement.querySelector("[name='email']"),
      emailError,
      "Please enter a email address"
    );
  } else if (email && !validateEmail(email)) {
    setError(
      formElement.querySelector("[name='email']"),
      emailError,
      "Please enter a valid email address"
    );
    isValid = false;
  }

  // Validate Phone Number if the field exists

  if (phoneNumber === "") {
    setError(
      formElement.querySelector("[name='phoneNumber']"),
      phoneError,
      "Phone number is required"
    );
  }
  if (phoneNumber && !validatePhone(phoneNumber)) {
    setError(
      formElement.querySelector("[name='phoneNumber']"),
      phoneError,
      "Please enter a valid phone number"
    );
    isValid = false;
  }

  // Validate Username (only for personal information form)
  if (
    username === "" &&
    formElement.querySelector("[name='profile-username']")
  ) {
    setError(
      formElement.querySelector("[name='profile-username']"),
      usernameError,
      "Username is required"
    );
    isValid = false;
  }

  // Validate Country
  if (country === "" && formElement.querySelector("[name='country']")) {
    setError(
      formElement.querySelector("[name='country']"),
      countryError,
      "Please select a country"
    );
    isValid = false;
  }

  // Validate state-region
  if (
    stateSelect === "" &&
    formElement.querySelector("[name='state-region']")
  ) {
    setError(
      formElement.querySelector("[name='state-region']"),
      stateError,
      "Please select the state"
    );
    isValid = false;
  }

  // Validate City
  if (city === "" && formElement.querySelector("[name='city']")) {
    setError(
      formElement.querySelector("[name='city']"),
      cityError,
      "Please enter a city"
    );
    isValid = false;
  }

  // Validate Postal Code
  /* TODO : implement a function to validate the postal code */
  if (postal === "") {
    setError(
      formElement.querySelector("[name='postal']"),
      postalError,
      "Please enter a postal code"
    );
    isValid = false;
  } else if (postal && !validatePostalCode(postal)) {
    setError(
      formElement.querySelector("[name='postal']"),
      postalError,
      "Please enter a valid postal code"
    );

    isValid = false;
  }

  // Validate Address
  if (address === "" && addressInput) {
    setError(addressInput, addressError, "Please enter a valid address");
    isValid = false;
  }

  return isValid; // Return true if valid, false if there are errors
}

function closeDropdown(event, dropdownId, headerId = null, iconId = null) {
  const dropdownContent = document.getElementById(dropdownId);
  const header = document.getElementById(headerId);
  const icon = iconId ? document.getElementById(iconId) : null; // check if an idea has been provided

  const isClickInsideDropdown =
    dropdownContent.contains(event.target) || header.contains(event.target);

  if (!isClickInsideDropdown) {
    dropdownContent.classList.remove("open");
    dropdownContent.classList.remove("active");

    // Remove rotation from the icon if it exists
    if (icon) {
      icon.classList.remove("rotate");
    } else {
      // If the dropdown is clicked, you might want to add rotation
      if (icon) {
        icon.classList.add("rotate");
      }
    }
  }
}

// Payment Method Validation Utilities
class PaymentValidation {
  constructor() {
    this.cardTypes = {
      visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
      mastercard: /^5[1-5][0-9]{14}$/,
      amex: /^3[47][0-9]{13}$/,
      discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
    };
  }

  validateCardNumber(cardNumber) {
    // Remove all non-digit characters
    const cleaned = cardNumber.replace(/\D/g, "");

    // Check if empty or not the right length
    if (!cleaned || cleaned.length < 13 || cleaned.length > 19) {
      return {
        isValid: false,
        error: "Card number must be between 13 and 19 digits",
      };
    }

    // Luhn Algorithm Implementation
    let sum = 0;
    let isEven = false;

    // Loop through values starting from the rightmost side
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned.charAt(i), 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    // Determine card type
    let cardType = null;
    for (const [type, regex] of Object.entries(this.cardTypes)) {
      if (regex.test(cleaned)) {
        cardType = type;
        break;
      }
    }

    return {
      isValid: sum % 10 === 0,
      cardType,
      error: sum % 10 === 0 ? null : "Invalid card number",
    };
  }

  validateExpiryDate(month, year) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-based

    // Convert to numbers and validate format
    const expMonth = parseInt(month, 10);
    const expYear = parseInt(year, 10);

    if (isNaN(expMonth) || isNaN(expYear)) {
      return {
        isValid: false,
        error: "Invalid expiration date format",
      };
    }

    // Validate month range
    if (expMonth < 1 || expMonth > 12) {
      return {
        isValid: false,
        error: "Invalid month",
      };
    }

    // Check if card is expired
    if (
      expYear < currentYear ||
      (expYear === currentYear && expMonth < currentMonth)
    ) {
      return {
        isValid: false,
        error: "Card has expired",
      };
    }

    // Check if date is too far in the future (optional)
    if (expYear > currentYear + 10) {
      return {
        isValid: false,
        error: "Expiration date too far in the future",
      };
    }

    return {
      isValid: true,
      error: null,
    };
  }

  validateCVV(cvv, cardType = "default") {
    // Remove any non-digit characters
    const cleaned = cvv.replace(/\D/g, "");

    // Determine required length based on card type
    const requiredLength = cardType.toLowerCase() === "amex" ? 4 : 3;

    if (cleaned.length !== requiredLength) {
      return {
        isValid: false,
        error: `CVV must be ${requiredLength} digits`,
      };
    }

    return {
      isValid: true,
      error: null,
    };
  }

  validatePostalCode(postalCode, country = "US") {
    const postalRegexes = {
      US: /^\d{5}(-\d{4})?$/,
      CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
      UK: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
    };

    const regex = postalRegexes[country] || /^[A-Za-z0-9\s-]{3,10}$/;

    return {
      isValid: regex.test(postalCode),
      error: regex.test(postalCode) ? null : "Invalid postal code format",
    };
  }

  validateBankAccount(accountNumber) {
    // Remove spaces and special characters
    const cleaned = accountNumber.replace(/[\s-]/g, "");

    // Check length (most bank accounts are between 8 and 17 digits)
    if (cleaned.length < 8 || cleaned.length > 17) {
      return {
        isValid: false,
        error: "Account number must be between 8 and 17 digits",
      };
    }

    // Check if contains only digits
    if (!/^\d+$/.test(cleaned)) {
      return {
        isValid: false,
        error: "Account number must contain only digits",
      };
    }

    return {
      isValid: true,
      error: null,
    };
  }

  validateRoutingNumber(routingNumber) {
    // Remove any non-digit characters
    const cleaned = routingNumber.replace(/\D/g, "");

    // Check if it's exactly 9 digits
    if (cleaned.length !== 9) {
      return {
        isValid: false,
        error: "Routing number must be 9 digits",
      };
    }

    // Implement ABA routing number validation algorithm
    let sum = 0;
    for (let i = 0; i < cleaned.length; i++) {
      let digit = parseInt(cleaned.charAt(i), 10);
      if (i % 3 === 0) {
        sum += digit * 3;
      } else if (i % 3 === 1) {
        sum += digit * 7;
      } else {
        sum += digit;
      }
    }

    return {
      isValid: sum !== 0 && sum % 10 === 0,
      error: sum % 10 === 0 ? null : "Invalid routing number",
    };
  }
}

// Security Utilities
class PaymentSecurity {
  constructor() {
    this.lastAttempt = null;
    this.attemptCount = 0;
    this.maxAttempts = 3;
    this.cooldownPeriod = 15 * 60 * 1000; // 15 minutes in milliseconds
  }

  validateAttempt() {
    const now = Date.now();

    // Check if in cooldown period
    if (this.lastAttempt && now - this.lastAttempt < this.cooldownPeriod) {
      const remainingTime = Math.ceil(
        (this.cooldownPeriod - (now - this.lastAttempt)) / 1000 / 60
      );
      return {
        allowed: false,
        error: `Too many attempts. Please try again in ${remainingTime} minutes.`,
      };
    }

    // Reset if outside cooldown period
    if (this.lastAttempt && now - this.lastAttempt >= this.cooldownPeriod) {
      this.attemptCount = 0;
    }

    // Update attempt count
    this.attemptCount++;
    this.lastAttempt = now;

    // Check if exceeded max attempts
    if (this.attemptCount > this.maxAttempts) {
      return {
        allowed: false,
        error: "Maximum attempts exceeded. Please try again later.",
      };
    }

    return {
      allowed: true,
      error: null,
    };
  }

  validateTransaction(amount, userProfile) {
    const checks = {
      amount: this.validateTransactionAmount(amount, userProfile),
      velocity: this.checkTransactionVelocity(userProfile),
      location: this.validateLocation(userProfile),
    };

    const failed = Object.values(checks).filter((check) => !check.isValid);

    return {
      isValid: failed.length === 0,
      errors: failed.map((f) => f.error),
      requiresVerification: amount > 1000 || failed.length > 0,
    };
  }

  validateTransactionAmount(amount, userProfile) {
    const dailyLimit = userProfile.dailyLimit || 2000;
    const dailyTotal =
      userProfile.dailyTransactions?.reduce((sum, tx) => sum + tx.amount, 0) ||
      0;

    if (dailyTotal + amount > dailyLimit) {
      return {
        isValid: false,
        error: "Transaction would exceed daily limit",
      };
    }

    return {
      isValid: true,
      error: null,
    };
  }

  checkTransactionVelocity(userProfile) {
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    const maxTransactions = 3;
    const now = Date.now();

    const recentTransactions = (userProfile.transactions || []).filter(
      (tx) => now - tx.timestamp < timeWindow
    );

    return {
      isValid: recentTransactions.length < maxTransactions,
      error:
        recentTransactions.length >= maxTransactions
          ? "Too many transactions in a short period"
          : null,
    };
  }

  validateLocation(userProfile) {
    // This would integrate with a real geolocation service
    const lastLocation = userProfile.lastLocation;
    const currentLocation = userProfile.currentLocation;

    // Simplified distance check (would use proper geolocation in production)
    const isSuspiciousLocation =
      lastLocation &&
      currentLocation &&
      Math.abs(lastLocation.lat - currentLocation.lat) > 10;

    return {
      isValid: !isSuspiciousLocation,
      error: isSuspiciousLocation ? "Unusual location detected" : null,
    };
  }
}

class AdminUser {}

class User extends AdminUser {}

// Profile Utilities
class Profile {}

// Usage Example:
const validator = new PaymentValidation();
const security = new PaymentSecurity();

export { PaymentValidation, PaymentSecurity };

export {
  // generateCountries,
  validateForm,
  closeDropdown,
  validatePhone,
  validateEmail,
  validatePostalCode,
  validateAddress,
  generateRegions,
  setError,
  clearError,
  formatFirebaseDate,
};
