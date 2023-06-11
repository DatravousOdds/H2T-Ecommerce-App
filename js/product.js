const prodImages = document.querySelectorAll(".image-sub img");
console.log(prodImages);
const ImagesSlide = document.querySelector(".img-slide");
console.log(ImagesSlide);

let storedCurrentImg = 0; // default slider image

prodImages.forEach((item, i) => { // looping through each image thumb 
    item.addEventListener('click', () => { // adding click event to each image thumb
       prodImages[storedCurrentImg].classList.remove('active'); // removing active
       item.classList.add('active'); // adding active class to the current or clicked
       ImagesSlide.style.backgroundImage = `url('${item.src}')`; // setting up 
       storedCurrentImg = i; // updating the image slider variable  to the track current
    });
});

// toggle size button

const sizeBtns = document.querySelectorAll('.size-radio-btn'); // selecting size button
let checkBTn = 0; // current selected button 
let size;

sizeBtns.forEach((item, i) => { // looping through each button
    item.addEventListener('click', () => { // adding click event to each 
        sizeBtns[checkBTn].classList.remove('check'); // removing check class from 
        item.classList.add('check'); // adding check class to clicked button
        checkBTn = i; // updating the variable
        size = item.innerHTML;
    })
})

const setData = (data) => {
    let title = document.querySelector('title');
    

    // setup the images
    prodImages.forEach((img, i) => {
        if(data.images[i]){
            img.src = data.images[i];
        } else{
            img.style.display = 'none';
        }
    })
    prodImages[0].click();

    // setup size buttons
    sizeBtns.forEach(item => {
        if(!data.sizes.includes(item.innerHTML)){
            item.style.display = 'none';
        }
    }) 

    //setting up texts
    const brandName = document.querySelector('.product-brand');
    const shortDescription = document.querySelector('.product-short-des');
    const des = document.querySelector('.des');

    title.innerHTML += brandName.innerHTML = data.name;
    shortDescription.innerHTML = data.shortDescription;
    des.innerHTML = data.des;

    // pricing
    const sellPrice = document.querySelector('.product-price');
    const actualPrice = document.querySelector('.product-actual-price');
    const discount = document.querySelector('.product-discount');

    sellPrice.innerHTML = `$${data.sellPrice}`;
    actualPrice.innerHTML = `$${data.actualPrice}`;
    discount.innerHTML = `( ${data.discount}% off )`;

    // wishlist and cart btn
    const wishlistBtn = document.querySelector('.wishlist-btn');
    wishlistBtn.addEventListener('click', () => {
        wishlistBtn.innerHTML = add_product_to_cart_or_wishlist('wishlist', data);
    })

    const cartBtn = document.querySelector('.cart-btn');
    cartBtn.addEventListener('click', () => {
        cartBtn.innerHTML = add_product_to_cart_or_wishlist('cart', data);
    })


}

//fetch data
// const fetchProductData = () => {
//     fetch('/get-products', {
//         method: 'post',
//         headers: new Headers({'Content-Type': 'application/json'}),
//         body: JSON.stringify({id: productId})
//     })
//     .then(res => res.json())
//     .then(data => {
//         setData(data);
//         getProducts(data.tags[1]).then(data => createProductSlider(data, '.container-for-card-slider', 
//         'similar products'))
//     })
//     .catch(err => {
//         location.replace('/404');
//     })
// }

// let productId = null;
// if(location.pathname != '/products'){
//     productId = decodeURI(location.pathname.split('/').pop());
//     fetchProductData();
// }