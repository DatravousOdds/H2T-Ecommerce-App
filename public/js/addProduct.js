let user = JSON.parse(sessionStorage.user || null);
let loader = document.querySelector('.loader');

// checking to see if a user is logged in or not
window.onload = () => {
    if (user) {
        if (!compareToken(user.authToken, user.email)) {
            location.replace('/login');
        }
    } else {
        location.replace('/login');
    }
}

// price inputs 

const $realPrice = document.querySelector('#actual-price');
const $discountPercentage = document.querySelector('#discount');
const $sellPrice = document.querySelector('#s-price');

$discountPercentage.addEventListener('input', () => {
    if ($discountPercentage.value > 100) {
        $discountPercentage.value = 90;
    } else {
        let discount = $realPrice.value * $discountPercentage.value / 100;
        $sellPrice.value = $realPrice.value - discount;
    }
})

$sellPrice.addEventListener('input', () => {
    let discount = ($sellPrice.value / $realPrice.value) * 100;
    $discountPercentage.value = discount;
})

// upload img handle
let uploadImg = document.querySelectorAll('.imageupload');
let imgPath = []; // will store all upload img paths

uploadImg.forEach((imageUpload, index) => {
    imageUpload.addEventListener('change', () => {
        const file = imageUpload.files[0];
        let imageUrl;

        if (file.type.includes('image')) {
            // means user upload an image
            fetch('/s3url').then(res => res.json())
                .then(url => {
                    fetch(url, {
                        method: 'PUT',
                        headers: new Headers({'Content-Type': 'multipart/form-data'}),
                        body: file
                    }).then(res => {
                        imageUrl = url.split("?")[0];
                        imgPath[index] = imageUrl;
                        let label = document.querySelector(`label[for=${imageUpload.id}]
                       `);
                        label.style.backgroundImage = `url(${imageUrl})`;
                        let productImg = document.querySelector('.product-image');
                        productImg.style.backgroundImage = `url(${imageUrl})`;
                    })
                })
        } else {
             showAlert('upload image only');
        }

    })
})


// form submission

const prodName = document.querySelector('#product-name');
const shortLine = document.querySelector('#short-des');
const des = document.querySelector('#des');

let sizes = []; // will store all the sizes

const stock = document.querySelector('#stock');
const tags = document.querySelector('#tags');
const tac = document.querySelector('#tac');

//buttons
const addProdBtn = document.querySelector('#add-btn');
const saveDraft = document.querySelector('#save-btn');

// store size function
const storeSizes = () => {
    sizes = [];
    let sizeCheckBox = document.querySelectorAll('.s-checkbox');
    sizeCheckBox.forEach(item => {
        if (item.checked) {
            sizes.push(item.value);
        }
    })
}

const validForm = () => {
    if (!prodName.value.length) {
        return showAlert('enter product name')
    } else if (shortLine.value.length > 100 || shortLine.value.length < 10) {
        return showAlert('short description must be between 10 or 100 characters long');
    } else if (!des.value.length) {
        return showAlert('enter details description about the product');
    } else if (!imgPath.length) { //img link array 
        return showAlert('upload atleast one product image')
    } else if (!sizes.length) { // size array
        return showAlert('select at least one size');
    } else if (!$realPrice.value.length || !$discountPercentage.value.length || !$sellPrice.
        value.length) {
        return showAlert('you must add pricings');
    } else if (stock.value < 20) {
        return showAlert('you should have at least 20 items in stock');
    } else if (!tags.value.length) {
        return showAlert('enter few tags to help ranking your prodcut in search');
    } else if (!tac.checked) {
        return showAlert('you must agree to term and conditions');
    }
    return true;
}

const productData = () => {
    let tagArr = tags.value.split(',');
    tagArr.forEach((item, i) => tagArr[i] = tagArr[i].trim());
    return data = {
        name: prodName.value,
        shortDes: shortLine.value,
        des: des.value,
        images: imgPath,
        sizes: sizes,
        actualPrice: $realPrice.value,
        discount: $discountPercentage.value,
        sellPrice: $sellPrice.value,
        stock: stock.value,
        tags: tagArr,
        tac: tac.checked,
        email: user.email
    }
}

addProdBtn.addEventListener('click', () => {
    storeSizes();
    // validate form
    if (validForm()) { // validForm return true or false while doing validation 
        loader.style.display = 'block';
        let data = productData();
        if (productId) {
            data.id = productId;
        }
        sendData('/add-product', data);
    }
})

// save draft btn
saveDraft.addEventListener('click', () => {
    // store sizes
    storeSizes();
    // check for product name 
    if (!prodName.value.length) {
        showAlert('enter product name');
    } else { // didn't validate the data
        let data = productData();
        data.draft = true;
        if (productId) {
            data.id = productId;
        }
        sendData('/add-product', data);

    }

})

// existing product details handle

const setInfoData = (data) => {
    prodName.value = data.name;
    shortLine.value = data.shortDes;
    des.value = data.des;
    $realPrice.value = data.actualPrice;
    $discountPercentage.value = data.discount;
    $sellPrice.value = data.sellPrice;
    stock.value = data.stock;
    tags.value = data.tags;

    //set up imgs
    imgPath = data.images;
    imgPath.forEach((url, i) => {
        let label = document.querySelector(`label[for=${uploadimg[i].id}]`);
        label.style.backgroundImage = `url(${url})`;
        let productImg = document.querySelector('.product-image');
        productImg.style.backgroundImage = `url(${url})`;
    })

    // set sizes
    sizes = data.sizes;

    let sizeCheckBox = document.querySelectorAll('.size-checkbox');
    sizeCheckBox.forEach(item => {
        if (sizes.includes(item.value)) {
            item.setAttribute('checked', '');
        }
    })
}

const fetchProducData = () => {
    fetch('/get-products', {
        method: 'post',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email: user.email, id: productId })
    })
        .then((res) => res.json())
        .then(data => {
            setInfoData(data);
        })
        .catch(err => {
            console.log(err);
        })
}

let productId = null;
if (location.pathname != '/add-product') {
    productId = decodeURI(location.pathname.split('/').pop());

    let productDtail = JSON.parse(sessionStorage.tempProd || null);
    // fetch teh data if product is not in session
    //if(productDtail == null){
    fetchProducData();
    // }
}
