import { checkUserStatus } from '../auth/auth.js';
import { getStorage, ref, uploadString, getDownloadURL, 
    deleteDoc, db, doc, app } from '../api/firebase-client.js';
import { collection, addDoc } from '../api/firebase-client.js';


const imageGridContainer = document.querySelector('.images-grid-container');
const productTitle = document.getElementById('title');
const productCategory = document.getElementById('category');
const productDescription = document.getElementById('description');
const productPrice = document.getElementById('price');
const modalOverlay = document.querySelector('.modal-overlay');
const packageDimensions = document.getElementById('packageDimensions');
const shippingContainers = document.querySelectorAll('.shipping-btn-container');
const shippingGroupContainer = document.querySelector('.input-grid-wrapper');
const tradeStatus = document.querySelector('.button-container');
const postBtn = document.getElementById('postBtn');
const currentUser =  await checkUserStatus();
const storage = getStorage(app, 'gs://ecom-website-94d87');
const PLACEHOLDER_DESTINATION = {
    street1: "1 Main St",
    city:    "Kansas City",    // geographically central US
    state:   "MO",
    zip:     "64101",
    country: "US"
};
const CATEGORY_DEFAULTS = {
    'sneakers':    { length: 14, width: 10, height: 6,  weight: 2.5 },
    't-shirts':    { length: 12, width: 9,  height: 2,  weight: 0.5 },
    'hoodies':     { length: 14, width: 12, height: 4,  weight: 1.5 },
    'pants':       { length: 14, width: 10, height: 3,  weight: 1.0 },
    'jackets':     { length: 16, width: 14, height: 5,  weight: 2.0 },
    'hats':        { length: 12, width: 10, height: 6,  weight: 0.5 },
    'accessories': { length: 8,  width: 6,  height: 2,  weight: 0.25 },
    'other':       { length: 12, width: 9,  height: 4,  weight: 1.0 },
  };

let listing = {
    availableForTrade: true,
    originalPrice: 0,
    ownerId: '',
    productName: '',
    images: [],
    status: '',
    listingId: '',
    shipping: '',
    description: ''

}


initFormListeners();

postBtn.addEventListener('click', async () => {
    if (!validationInformation()) return;

    const shippingType = document.querySelector('input[type="radio"]:checked').value;

    if (shippingType === "prepaid") {
        showDimensionsModal();
        setDimensionsListeners();
    } else {
        
    }

    collectListingInfo();
    const images = collectImageData('.image-preview');

    try {
    //    const imagesURL =  await uploadImagesToFirebase(images, currentUser.email);
    //     listing.images = imagesURL;
    //     await uploadListingToFirebase(listing); 

        // modalOverlay.classList.remove('show');

    } catch (e) {
        // modalOverlay.classList.remove('show');
        console.log("Error occur when uploading data: ", e)
    }
    



    
})

tradeStatus.addEventListener('click', () => {
    tradeStatus.classList.toggle('active');
})

shippingContainers.forEach(container => {
    container.addEventListener('click', () => {
        // remove selected from all first
        shippingContainers.forEach(c => c.classList.remove('selected'));
        // add to clicked one
        container.classList.add('selected');
    });
});

shippingGroupContainer.addEventListener('click', (e) => {
    checkShippingBox('.shipping-btn-container', e);
})

imageGridContainer.addEventListener('click', (e) => {
    const imageContainer = e.target.closest('.image-container');
    if (!imageContainer) { return null;}
        // console.log(e.target)
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



function showDimensionsModal() {
    const category = productCategory.value;

    setDefaultDimensions(category);

    packageDimensions.classList.add('show');
    modalOverlay.classList.add('show');
}

function setDimensionsListeners() {
    const defaultsBtn = document.getElementById('defaultsBtn');
    const confirmPostBtn = document.getElementById('confirmBtn');

    defaultsBtn.addEventListener('click', () => {
      const parcel = CATEGORY_DEFAULTS[category] ?? CATEGORY_DEFAULTS['other'];

      proceedWithShipping(parcel);
    })

    confirmPostBtn.addEventListener('click', () => {
        const parcel = {
            "length": document.getElementById('length').value,
            "width": document.getElementById('width').value,
            "height": document.getElementById('height').value,
            "weight": document.getElementById('weight').value
        }
        
        proceedWithShipping(parcel);
    });
}

function proceedWithShipping(parcel) {
    fetchShippingRates(parcel);
}

function setDefaultDimensions(category) {
        const defaults = CATEGORY_DEFAULTS[category] ?? CATEGORY_DEFAULTS['other'];

        document.getElementById('length').value = defaults.length;
        document.getElementById('width').value = defaults.width;
        document.getElementById('height').value = defaults.height;
        document.getElementById('weight').value = defaults.weight;

}

function showError(elementId, errorMessage) {
    const id = document.getElementById(elementId);
    const errorId = document.getElementById(`error-${elementId}`);
    errorId.textContent = `${errorMessage}`;
    id.scrollIntoView({ behavior: 'smooth'});
    id.classList.add('error');
}

function removeError(elementId) {
    const id = document.getElementById(elementId);
    const errorId = document.getElementById(`error-${elementId}`);
    errorId.textContent = '';
    id.classList.remove('error');
}

function validationInformation() {
    if(!validateImages()) return false;
    if(!validateProductInfo()) return false;
    return true;
}

function validateProductInfo() {
    const productShipping = document.querySelector('input[type="radio"]:checked')?.value.trim();
    const title = productTitle.value.trim() !== '';
    const category = productCategory.value.trim() !== '';
    const description = productDescription.value.trim() !== '';
    const price = productPrice.value.trim() !== '';
    const shipping = !!productShipping;

    let isValid = true;

    if (!title) { 
        // alert("Add a title to continue");
        showError('title', "Please enter a title to continue");
        isValid = false;
        return;
    };
    if (!category) { 
        showError('category', "Please enter a category to continue");
        isValid = false; 
        return;
    };
    if (!description) { 
        showError('description', "Please enter at least five word to describe product");
        isValid = false;
        return;
    };
    if (!price) { 
        showError('price', "Please enter a price to continue");
        isValid = false;
        return;
    };
    if (!shipping) { 
        showError('shipping', "Please select your choice of shipping");
        isValid = false;
        return;
    }
    return isValid;
    

    


}

function validateImages() {
    const images = document.querySelectorAll('.image-preview');

    if (images.length === 0) return false;

    const hasAtLeastOneImage = [...images].some(image => {
        const imageSrc = image.getAttribute('src');
        return imageSrc !== '' && imageSrc !== null;
    })

    if (!hasAtLeastOneImage) {
        alert('Please upload at least one photo!');
        return false;
    }

    return true;
}

function checkShippingBox(selector, event) {
    const shippingContainer = event.target.closest(selector);
    const input = shippingContainer.querySelector('input[type="radio"]');
    input.checked = true;
}

function collectListingInfo() {

    listing.originalPrice = parseFloat(productPrice.value);
    listing.productName = productTitle.value.trim();
    listing.availableForTrade = tradeStatus.classList.contains('active');
    listing.ownerId = currentUser.email;
    listing.status = 'active';
    listing.description = productDescription.value.trim();
    listing.shipping = document.querySelector('input[type="radio"]:checked').value;

}

function collectImageData(selector) {
  const images = document.querySelectorAll(selector);
  const imageData = [];

  images.forEach((img, index) => {
    const src = img.getAttribute('src');
    if (src && src.trim() !== '') {
      imageData.push({
        index: index,
        url: src,
        isPrimary: index === 0
      });
    }
  });

  return imageData;
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
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                    removeBtn.style.display = 'block'; 
                }
                reader.readAsDataURL(selectedFile);

            } else {
                alert("File is too large!");
                handleImageRemove(input,preview,removeBtn);
            }

        }) 
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

function initFormListeners() {
    productTitle.addEventListener('input', () => {
        removeError('title');
    });
    productCategory.addEventListener('input', () => {
        removeError('category');
    })
    productDescription.addEventListener('input', () => {
        removeError('description');
    })
    productPrice.addEventListener('input', () => {
        removeError('price');
    })

}

function fetchShippingRates(parcel) {
    const payload = {
        from_address: {
            state: currentUser.state,
            line_1: currentUser.address1,
            city: currentUser.city,
            postal_code: currentUser.postalCode,
            country: 'US',
        },
        to_address: PLACEHOLDER_DESTINATION,
        parcel: parcel
    }

    fetch('/seller/api/shipping-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify(payload)

    })
    .then(res => res.json())
    .then(data => console.log(data))
    .catch(err => console.error(err))
}

async function uploadImagesToFirebase(images, userId) {
    const newListingRef = doc(collection(db, 'listings'));
    const listingId = newListingRef.id;
    listing.listingId = listingId;
    const uploadPromises = images.map(async (img, index) => {
        try {
        const imagePath = `listings/${userId}/${listingId}/image_${index}_${Date.now()}.jpg`;
        const storageRef = ref(storage, imagePath);

        const uploadResult = await uploadString(storageRef, img.url, 'data_url');

        const downloadURL = await getDownloadURL(uploadResult.ref);

        console.log(`✅ Image ${index} uploaded:`, downloadURL);

        return {
            url: downloadURL,
            path: imagePath,
            isPrimary: img.isPrimary,
            index: img.index
        };

        }
        catch (error) {
        console.error(`❌ Failed to upload image ${index}:`, error)
        throw error;
        }
    });

  const uploadedImages = await Promise.all(uploadPromises);
  return uploadedImages;
  
}
 
async function uploadListingToFirebase(data) { 
    try {
        const docRef = await addDoc(collection(db, 'listings'), data);
        console.log("Document written with the ID: ", docRef.id);
        return docRef.id;
    } catch(e) {
        console.error("Error adding document:", e);
    }
    
}

