const images = document.querySelectorAll('.image-item');
const itemDetails = document.querySelectorAll("select");
const description = document.querySelector('.form-group textarea')
const askingPrice = document.querySelector('.form-group input');
const condition = document.getElementById('condition');
const category = document.getElementById("category")
const modelOverlay = document.querySelector('.modal-overlay');


function showReviewQuoteModal() {
    // populate modal with user data
    const imagesUploaded = modelOverlay.querySelector('.images-uploaded p');
    imagesUploaded.textContent = `✓ ${uploadCount} images uploaded`;

    const askingPriceModal = modelOverlay.querySelector('.asking-price');
    askingPriceModal.textContent = `$${parseFloat(askingPrice.value).toFixed(2)}`;

    const reviewImages = modelOverlay.querySelectorAll('.review-image');
    console.log(images.forEach(img => console.log(img)));
    

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


const quoteBtn = document.querySelector(".submit-button");


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