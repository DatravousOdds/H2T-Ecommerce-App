

const images = document.querySelectorAll('.image-item');
const itemDetails = document.querySelectorAll("select");
const description = document.querySelector('.form-group textarea')
const askingPrice = document.querySelector('.form-group input[name="asking-price"]');
const title = document.querySelector('.form-group .title');
const condition = document.getElementById('condition');
const category = document.getElementById("category")
const modelOverlay = document.querySelector('.modal-overlay');
const modelClose = modelOverlay.querySelector('.c-button');
const quoteBtn = document.querySelector(".submit-button");
const goBack = document.querySelector('.modal-footer .btn-secondary');
const editAskingPriceBtn = document.getElementById('edit-asking-price');
const productAskingPrice = modelOverlay.querySelector('.product-asking');
const modelActionsButtons = modelOverlay.querySelector('.action-buttons');





function showReviewQuoteModal() {


    const imagesUploaded = modelOverlay.querySelector('.images-uploaded p');
    imagesUploaded.textContent = `✓ ${uploadCount} images uploaded`;

    const askingPriceModal = modelOverlay.querySelector('.asking-price');
    askingPriceModal.textContent = `$${parseFloat(askingPrice.value).toFixed(2)}`;

    const reviewImages = modelOverlay.querySelectorAll('.review-image');
    const uploadedImages = document.querySelectorAll('.image-item .image-preview');
    uploadedImages.forEach((img, index) => {
        reviewImages[index].src = img.src;
    });

    const itemDetailContent =  modelOverlay.querySelector('.detail-content');
    itemDetailContent.innerHTML = '';

    let itemDetails = {
        category: category.value,
        title: title.value,
        condition: condition.value,
        description: description.value
    }

    for (let key in itemDetails) {
        if(itemDetails[key]) {
            const div = document.createElement('div');
            div.classList.add('detail-item');

            const span = document.createElement('span');
            span.classList.add('detail-label');
            span.textContent = `${key}`;

            const span2 = document.createElement('span');
            span2.textContent = `${itemDetails[key]}`;

            div.appendChild(span);
            div.appendChild(span2);
            itemDetailContent.appendChild(div);
            
        } 

    }

    // show modal
    modelOverlay.style.display = 'flex';
}

let uploadCount = 0;

images.forEach(( image )=> {
    const fileInput = image.firstElementChild;

    image.addEventListener('click', () => {
        console.log(fileInput.click());
    })

    image.addEventListener('change', (e) => {
        const imagePreview = image.querySelector('.image-preview');
        const uploadPreivew = image.querySelector('.upload-placeholder');
        const file = e.target.files[0];

        // image vaildation
        if (file && file.type == 'image/jpeg') {
            if (file.size <= 2 * 1024 * 1024) {
                uploadCount++;
               const reader = new FileReader();
                reader.onload = (e) => {

                uploadPreivew.style.display = 'none';
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
                
                };
                reader.readAsDataURL(file); 
            } else {
                alert("file is too big!");
            }
            
            
        }
        
    })
})





quoteBtn.addEventListener('click', () => {
    let isValid = true;
    let errorMessage = '';
    // check if 3 files or more are uploaded
    if (uploadCount <  3) {
        errorMessage += '3 or more images need to upload!\n';
        isValid = false;
    }
    // check if there is an asking price
    if(!askingPrice.value) {
        errorMessage += 'Please enter a asking price!\n';
        isValid = false;
    }

    if(!isValid) {
        alert(errorMessage);
        return;
        
    }
    // review model that reviews quote request
    showReviewQuoteModal();
})

modelClose.addEventListener('click', () => {
    modelOverlay.style.display = 'none';
});

goBack.addEventListener('click', () => {
    modelOverlay.style.display = 'none';
});

editAskingPriceBtn.addEventListener('click', () => {
    if (modelOverlay.style.display === 'flex') {
        console.log("modal is open");
        productAskingPrice.innerHTML = `
        <p class="asking-text">You're asking for</p>
        <input type="number" name="asking-price" id="asking-price" class="edit-asking-price" placeholder="Enter asking price">`;


        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = "Cancel";
        cancelBtn.classList.add('btn-secondary');
        modelActionsButtons.appendChild(cancelBtn);
        editAskingPriceBtn.classList.add('submit-price');
        editAskingPriceBtn.textContent = "Submit";

        editAskingPriceBtn.addEventListener('click', () => {
            const newAskingPrice = document.getElementById('asking-price').value;
            if (newAskingPrice) {
                askingPrice.value = newAskingPrice;
                productAskingPrice.innerHTML = `
                <p class="asking-text">You're asking for</p>
                <p class="product-asking-price">$${parseFloat(newAskingPrice).toFixed(2)}</p>`;
                modelActionsButtons.removeChild(cancelBtn);
                editAskingPriceBtn.classList.remove('submit-price');
                editAskingPriceBtn.textContent = "Edit";
            } else {
                alert("Please enter a valid asking price");
            }
        });

        cancelBtn.addEventListener('click', () => {
            productAskingPrice.innerHTML = `
            <p class="asking-text">You're asking for</p>
            <p class="product-asking-price">$${parseFloat(askingPrice.value).toFixed(2)}</p>`;
            modelActionsButtons.removeChild(cancelBtn);
            editAskingPriceBtn.classList.remove('submit-price');
            editAskingPriceBtn.textContent = "Edit";
        });


    } else {
        console.log("modal is closed");
    }
})

