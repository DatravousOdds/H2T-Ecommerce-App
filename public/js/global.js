

// function to generate countries
export const generateCountries = (apiUrl, selectId) => {
  fetch(apiUrl)
    .then((res) => res.json())
    .then((data) => {
      const select = document.getElementById(selectId);

      // sorts countries
      const sortCountries = data.sort((a, b) => {
        return a.name.common.localeCompare(b.name.common);
      });

      // Check if there is an select element
      if (select) {
        sortCountries.forEach((country) => {
          const option = document.createElement("option");
          option.value = country.cca2;
          option.textContent = country.name.common;
        
          select.appendChild(option);
        });

        // Call generateRegions to populate regions
        // generateRegions(data);
        
      } else {
        console.error(`Select element with id "${selectId}" not found.`);
      }
    })

    .catch((err) => console.log(err("Error Message:", err)));
};

export const generateRegions = (countriesData) => {
  
  const selectSelect = document.getElementById("state-select")

  countriesData.forEach(country => {
    // console.log(country.region)
    regions.add(country.region);
    // console.log(country.cca2)
  })

  

  const regionSelect = document.getElementById("state-select");

  if (regionSelect) {
    
  }

  

}

export function setError(inputElement, errorElement, message) {
  errorElement.textContent = message;
  inputElement.classList.add("input-error");
  errorElement.classList.add("error-msg");
}

export function clearError(inputElement, errorElement) {
  errorElement.textContent = "";
  inputElement.classList.remove("input-error");
  errorElement.classList.remove("error-msg");
}

export function validateEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

export function validatePhone(phoneNumber) {
  const phonePattern = /^\d{3}-\d{3}-\d{4}$/;
  return phonePattern.test(phoneNumber);
}

export function validateAddress(address) {
  return address.length > 5
}

export function validatePostalCode(postalCode) {
  const postalRegex = /^\d{5}(-\d{4})?$/; // Validates 12345 or 12345-6789
  return postalRegex.test(postalCode);
}

export function validateForm(formElement) {
  let isValid = true; // Assume the form is valid initially

  
  // Get form fields
  const firstname = formElement.querySelector("[name='fname']")?.value.trim();
  const lastname = formElement.querySelector("[name='lname']")?.value.trim();
  const email = formElement.querySelector("[name='email']")?.value.trim();
  const phoneNumber = formElement.querySelector("[name='phoneNumber']")?.value.trim();
  const username = formElement.querySelector("[name='profile-username']")?.value.trim(); // Optional for shipping form
  const country = formElement.querySelector("[name='country']")?.value.trim();
  const addressInput = formElement.querySelector("[name='address']");
  const address = addressInput?.value.trim();
  const city = formElement.querySelector("[name='city']")?.value.trim();
  const postal = formElement.querySelector("[name='postal']")?.value.trim();
  const stateSelect = formElement.querySelector("[name='state-region']")?.value.trim();

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
  const stateError = formElement.querySelector("#stateError")

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
  if(stateError) clearError(formElement.querySelector("[name='state-region']"), stateError);

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
    setError(formElement.querySelector("[name='email']"),
  emailError,
"Please enter a email address")

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
    setError(formElement.querySelector("[name='phoneNumber']"), 
  phoneError,
"Phone number is required")
  }
  if (phoneNumber && !validatePhone(phoneNumber)) {
    setError(formElement.querySelector("[name='phoneNumber']"), phoneError, "Please enter a valid phone number");
    isValid = false;
  }

  // Validate Username (only for personal information form)
  if (username === "" && formElement.querySelector("[name='profile-username']")) {
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
  if(stateSelect === "" && formElement.querySelector("[name='state-region']")) {
    setError(formElement.querySelector("[name='state-region']"),
  stateError, 
  "Please select the state")
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
  if ( postal === "") {
    setError(formElement.querySelector("[name='postal']"),
    postalError,
    "Please enter a postal code"
  )
  isValid = false;
  } else if (postal && !validatePostalCode(postal)) {
    setError(
      formElement.querySelector("[name='postal']"),
      postalError,
      "Please ente a vaild postal code"
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

export function closeDropdown(event, dropdownId, headerId, iconId) {
  const dropdownContent = document.getElementById(dropdownId);
  const header = document.getElementById(headerId);
  const icon = iconId ? document.getElementById(iconId) : null; // check if an idea has been provided


  const isClickInsideDropdown =  dropdownContent.contains(event.target) || header.contains(event.target);

  if (!isClickInsideDropdown) {
    dropdownContent.classList.remove("open");
    dropdownContent.classList.remove("active")

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
