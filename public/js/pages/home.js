setupSliderEffect = () => {
  const prodcontainers = [...document.querySelectorAll(".pro-container")];
  const nextBTn = [...document.querySelectorAll("nxt-btn")];
  const preBTn = [...document.querySelectorAll("pre-btn")];

  prodcontainers.forEach((item, i) => {
    let containerDimensions = item.getBoundingClientRect();
    let containerWidth = containerDimensions.width;

    nextBTn[i].addEventListener("click", () => {
      item.scrollLeft += containerWidth;
    });

    preBTn[i].addEventListener("click", () => {
      item.scrollLeft -= containerWidth;
    });
  });
};
//fetch prod cards
// const getProducts = (tag) => {
//     return fetch('/get-products', {
//         method: "post",
//         headers: new Headers({ 'Content-Type': 'application/json' }),
//         body: JSON.stringify({ tag: tag })
//     })
//         .then(res => res.json())
//         .then(data => {
//             return data;
//         })
// }

// create product slider
const createProductSlider = (data, parent, title) => {
  let slideContainer = document.querySelector(`${parent}`);

  slideContainer.innerHTML += `<section id="product1" class="section-p1">
      <h2>${title}</h2>
      ${createProductCards(data)}
      </section>

    
    `;

  setupSliderEffect();
};

const createProductCards = (data, parent) => {
  //here parent is for search product
  let start = '<div class="pro-container" id="shop">';
  let middle = ""; // this will contain card HTML
  let end = "</div>";

  for (let i = 0; i < data.length; i++) {
    if (data[i].id != decodeURI(location.pathname.split("/").pop())) {
      middle += ` <div class="pro product-card product-image">
                    
        <img src="${data[i].images[0]}" alt="">
        <div class="des" onclick="location.href = '/product/${data[i].id}'">
            <span>${data[i].name}</span>
            <!-- insert product name below !-->
            <h5>${data[i].shortDes}</h5>
            <div class="star">
                <i class="fas fa-star"></i>
                <i class="fas fa-star"></i>
                <i class="fas fa-star"></i>
                <i class="fas fa-star"></i>
                <i class="fas fa-star"></i>
            </div>
            <!-- insert price final price here !-->
            <h4 class="price">${data[i].sellPrice}</h4><span class="actual-price">${data[i].actualPrice}</span>
        </div>
    <a href="#"><i class="fas fa-shopping-cart cart"></i></a>
    </div>
        `;
    }
  }

  if (parent) {
    let cardContainer = document.querySelector(parent);
    cardContainer.innerHTML = start + middle + end;
  } else {
    return start + middle + end;
  }
};

const add_product_to_cart_or_wishlist = (type, product) => {
  let data = JSON.parse(localStorage.getItem(type));
  if (data == null) {
    data = [];
  }

  product = {
    item: 1,
    name: product.name,
    sellPrice: product.sellPrice,
    size: size || null,
    shortDes: product.shortDes,
    image: product.images[0]
  };

  data.push(product);
  localStorage.setItem(type, JSON.stringify(data));
  return "added";
};

document.addEventListener("DOMContentLoaded", () => {
  const slides = document.querySelectorAll(".slide");
  const prevButton = document.querySelector(".prev-arrow");
  const nextButton = document.querySelector(".next-arrow");
  const indicatorsContainer = document.querySelector(".slide-indicators");

  let currentSlide = 0;
  let slideInterval;

  // Create indicators
  slides.forEach((_, index) => {
    const indicator = document.createElement("div");
    indicator.classList.add("indicator");
    if (index === 0) indicator.classList.add("active");
    indicator.addEventListener("click", () => goToSlide(index));
    indicatorsContainer.appendChild(indicator);
  });

  const indicators = document.querySelectorAll(".indicator");

  function updateSlides() {
    slides.forEach((slide) => slide.classList.remove("active"));
    indicators.forEach((indicator) => indicator.classList.remove("active"));

    slides[currentSlide].classList.add("active");
    indicators[currentSlide].classList.add("active");
  }

  function nextSlide() {
    currentSlide = (currentSlide + 1) % slides.length;
    updateSlides();
  }

  function prevSlide() {
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    updateSlides();
  }

  function goToSlide(index) {
    currentSlide = index;
    updateSlides();
  }

  function resetInterval() {
    clearInterval(slideInterval);
    slideInterval = setInterval(nextSlide, 5000);
  }

  if (prevButton) {
    prevButton.addEventListener("click", () => {
      prevSlide();
      resetInterval();
    });
  }
  if (nextButton)
    nextButton.addEventListener("click", () => {
      nextSlide();
      resetInterval();
    });

  // Start automatic sliding
  slideInterval = setInterval(nextSlide, 5000);

  // Pause on hover
  const slidesContainer = document.querySelector(".slider-container");
  if (slidesContainer) {
    slidesContainer.addEventListener("mouseenter", () => {
      clearInterval(slideInterval);
    });
    slidesContainer.addEventListener("mouseleave", () => {
      slideInterval = setInterval(nextSlide, 5000);
    });
  }
});


const newsletterForm = document.querySelector("#newsletter .form");
const newsletterSubmitBtn = document.getElementById("newsletter-submit");
const email = document.getElementById("newsletter-email");

newsletterSubmitBtn.addEventListener('click', () => {
  let emailValue = email.value.trim()
  console.log(emailValue)
  // newsletterForm.classList.add("hidden")
  newsletterForm.innerHTML = `
  
  <div class="success-signup">
    <p class="signup-text">You've been successfully signed up!</p>
  </div>

  `
  
})
