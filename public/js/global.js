const apiUrl = 'https://restcountries.com/v3.1/all';



// function to generate countries
export const generateCountries = (apiUrl, selectId) => {
    fetch(apiUrl)
    .then(res => res.json())
    .then(data => {
      console.log(data)
      const select = document.getElementById(selectId);
  
      // Check if there is an select element
      if (select) {
        console.log(select)
        data.forEach(country => {
        const option = document.createElement("option");
        console.log(option);
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