



// function to generate countries
export const generateCountries = (apiUrl, selectId) => {
    fetch(apiUrl)
    .then(res => res.json())
    .then(data => {
      console.log(data)
      const select = document.getElementById(selectId);
  
      // Check if there is an select element
      if (select) {
        
        data.forEach(country => {
        const option = document.createElement("option");
        
        option.value = country.cca2;
        option.textContent = country.name.common;
        select.appendChild(option);
        });
      } else {
        console.error(`Select element with id "${selectId}" not found.`)
      }
    })
  
    .catch(err => console.log(err("Error Message:", err)))
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

export function validateForm(formElement) {
  let isValid = true; // Assume the form is valid initially

  // Get form fields
  const firstname = formElement.querySelector("[name='fname']")?.value.trim();
  const lastname = formElement.querySelector("[name='lname']")?.value.trim();
  const email = formElement.querySelector("[name='email']")?.value.trim();
  const phoneNumber = formElement.querySelector("[name='phoneNumber']")?.value.trim();
  const username = formElement.querySelector("[name='profile-username']")?.value.trim(); // Optional for shipping form
  const country = formElement.querySelector("select")?.value.trim();
  const address = formElement.querySelector("[name='address']")?.value.trim();


  // Get error message containers
  const addressError = formElement.querySelector("#addressError");
  const countryError = formElement.querySelector("#countryError");
  const fnameError = formElement.querySelector("#fnameError");
  const lnameError = formElement.querySelector("#lnameError");
  const emailError = formElement.querySelector("#emailError");
  const phoneError = formElement.querySelector("#phoneError");
  const usernameError = formElement.querySelector("#usernameError");

  // Clear previous errors
  if (addressError) clearError(formElement.querySelector("[name='address']"), addressError)
  if (fnameError) clearError(formElement.querySelector("[name='fname']"), fnameError);
  if (lnameError) clearError(formElement.querySelector("[name='lname']"), lnameError);
  if (emailError) clearError(formElement.querySelector("[name='email']"), emailError);
  if (phoneError) clearError(formElement.querySelector("[name='phoneNumber']"), phoneError);
  if (addressError) clearError(formElement.querySelector("select"), countryError);
  if (usernameError) clearError(formElement.querySelector("[name='profile-username']"), usernameError);

  // Validate First Name
  if (!firstname) {
    setError(formElement.querySelector("[name='fname']"), fnameError, "First name is required");
    isValid = false;
  }

  // Validate Last Name
  if (!lastname) {
    setError(formElement.querySelector("[name='lname']"), lnameError, "Last name is required");
    isValid = false;
  }

  // Validate Email
  if (!validateEmail(email)) {
    setError(formElement.querySelector("[name='email']"), emailError, "Please enter a valid email address");
    isValid = false;
  }

  // Validate Phone Number
  if (!validatePhone(phoneNumber)) {
    setError(formElement.querySelector("[name='phoneNumber']"), phoneError, "Phone number must be in the format 123-456-7890");
    isValid = false;
  }

  // Validate Username (only for personal information form)
  if (username !== undefined && username === "") {
    setError(formElement.querySelector("[name='profile-username']"), usernameError, "Username is required");
    isValid = false;
  }

  // Validate Country
  if (!country || country == "") {
    setError(formElement.querySelector("select"), countryError, "Please select a country");
    isValid = false;
  }

  // Validate Address
  if (address === "") {
    setError(formElement.querySelector("[name='address']"), addressError, "Please enter a valid address");
    isValid = false;
  }

  return isValid; // Return true if valid, false if there are errors
}