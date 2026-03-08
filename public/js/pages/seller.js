const imageGridContainer = document.querySelector('.images-grid-container');
const productTitle = document.getElementById('title');
const productCategory = document.getElementById('category');
const productDescription = document.getElementById('description');
const productPrice = document.getElementById('itemPrice');
const tradingActive = document.querySelector('.button-container');

tradingActive.addEventListener('click', () => {
    tradingActive.classList.toggle('active');
})

const shippingGroupContainer = document.querySelector('.input-grid-wrapper');

let listing = {
    availableForTrade: true,
    originalPrice: 0,
    ownerId: '',
    productName: '',
    images: [],
    status: '',
    listingId: ''

}

shippingGroupContainer.addEventListener('change', (e) => {
    // console.log(e.target)
    if (e.target && e.target.matches('input[type="radio"]')) {
        console.log("radio value:", e.target.value);
    }


})




imageGridContainer.addEventListener('click', (e) => {
    const imageContainer = e.target.closest('.image-container');
    if (!imageContainer) { return null;}
        console.log(e.target)
        const imageInput = imageContainer.querySelector('input');
        const imagePreview = imageContainer.querySelector('.image-preview');
        const removeImageBtn = imageContainer.querySelector('.remove-image-btn');

        if (e.target.closest('.remove-image-btn')) {
            e.stopPropagation();
            handleImageRemove(imageInput, imagePreview, removeImageBtn);
            return;
        }

        handleImageUpload(imageInput, imagePreview, removeImageBtn);

})

// collectListingInfo()

function collectListingInfo() {
    listing[originalPrice] = productPrice;
    listing[productName] = productTitle;

    console.log(tradingActive);
}

function handleImageUpload(input,preview,removeBtn) {
    if (typeof input !== "object") {
        console.error('type error!');
    }

    if (input) {
        input.click();

        input.addEventListener('change', (e) => {
            const MAX_SIZE = 5 * 1025 * 1025;
            const allowedFileTypes = ['image/jpeg', 'image/png'];

            const selectedFile = e.target.files[0];
            const selectFileType = selectedFile.type;

            if (!allowedFileTypes.includes(selectFileType)) {
                alert(`Invalid file type: ${selectFileType} is not a valid type.`);
                handleImageRemove(input,preview,removeBtn);
            }

            if (selectedFile && selectedFile.size < MAX_SIZE  ) {
                const imageUrl = URL.createObjectURL(selectedFile);
                preview.src = imageUrl;
                preview.style.display = 'block';
                removeBtn.style.display = 'block';

            } else {
                alert("File is too large!");
                handleImageRemove(input,preview,removeBtn);
            }

        }, { once : true }) 
    } else {
        console.log("File element not found!");
    }
    
}

function handleImageRemove(input, preview, removeBtn) {
    input.value = '';
    preview.src = '';
    preview.style.display = 'none';
    removeBtn.style.display = 'none';
    return;
}





async function uploadToFirebase() { 

}