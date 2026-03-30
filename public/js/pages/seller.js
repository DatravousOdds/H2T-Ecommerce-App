import { checkUserStatus } from '../auth/auth.js';
import { getStorage, ref, uploadString, getDownloadURL, deleteDoc, db, doc, app } from '../api/firebase-client.js';
import { collection, addDoc } from '../api/firebase-client.js';


const imageGridContainer = document.querySelector('.images-grid-container');

const productTitle = document.getElementById('title');
const productCategory = document.getElementById('category');
const productDescription = document.getElementById('description');
const productPrice = document.getElementById('price');

const titleCharCounter = document.getElementById('titleCharCounter');
const descriptionWordCounter = document.getElementById('descriptionWordCounter');

const modalOverlay = document.querySelector('.modal-overlay');
const packageDimensions = document.getElementById('packageDimensions');
const courierRatesModal = document.getElementById('courierRatesModal');
const savingModal = document.getElementById('savingModal');

const shippingContainers = document.querySelectorAll('.shipping-btn-container');
const shippingGroupContainer = document.querySelector('.input-grid-wrapper');

const tradeStatus = document.querySelector('.button-container');
const postBtn = document.getElementById('postBtn');

const courierPanel = document.getElementById('carrierPanel');
const carrierWrapper = document.querySelector('.carrier-rows-wrapper');

const courierExitBtn = document.getElementById('courierExitBtn');
const dimensionExitBtn = document.getElementById('dimensionExitBtn');

const loader = document.getElementById('loader');

const currentUser =  await checkUserStatus();
const storage = getStorage(app, 'gs://ecom-website-94d87');

const PLACEHOLDER_DESTINATION = {
    line_1: "1 Main St",
    city:    "Kansas City",    // geographically central US
    state:   "MO",
    postal_code:     "64101",
    country_alpha2: "US"
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

};

initFormListeners();
wordCounter();

postBtn.addEventListener('click', async () => {
    // Step 1: Validate basic information
    if (!validationInformation()) return;

    // Step 2: Get shipping type
    const shippingTypeRadio = document.querySelector('input[name="shipping-method"]:checked');

    if (!shippingTypeRadio) {
        alert("Shipping must be selected");
        return;
    };

    const shippingType = shippingTypeRadio.value;

    // Step 3: Handle prepaid shipping
    if (shippingType === "prepaid") {
        showDimensionsModal();
        return;
    } else {
        collectListingInfo();
        await uploadListing();

    }           
});

carrierWrapper.addEventListener('click', (e) => {
    const row = e.target.closest('.carrier-row');
    const carrierInput = row.querySelector('.form-input input[type="radio"]');
    // console.log(carrierInput);
    carrierInput.checked = true;
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

function initFormListeners() {
    productTitle.addEventListener('input', () => {
        removeError('title');
    });
    productCategory.addEventListener('input', () => {
        removeError('category');
    });
    productDescription.addEventListener('input', () => {
        removeError('description');
    });
    productPrice.addEventListener('input', () => {
        removeError('price');
    });

    charCounter();

}

function charCounter() {
    const charLimit = 80;
    let current = 0;

    productTitle.addEventListener('input', (e) => {
        const currentLetterCount = e.target.value.length;
        current = currentLetterCount;
        titleCharCounter.textContent = `${current}/80`;
        if (current >= charLimit) {
            // Show error
            showError('title', 'Title must be less then 80 characters')
            return;
        }
        
    })

}

function wordCounter() {
    const limit = 100;
    let current = 0;

    productDescription.addEventListener('input', (e) => {
        const currentWordCount = e.target.value.trim();
        const words = currentWordCount.split(' ');

        if (words[0] === '') {
            words.length = 0;
        }

        current = words.length;

        descriptionWordCounter.textContent = `${current}/100`;

        if (current >= limit) {
            showError('description', 'Description must be 1000 words or less!');
            return;
        }
    })
};


function exitModalListener(selector, modal) {
    selector.addEventListener('click', () => {
        modal.classList.remove('show');
        modalOverlay.classList.remove('show');
    })
}

// Setters
function setCourierListeners() {
    const courierConfirmBtn = document.getElementById('courierConfirmBtn');
    const courierBackBtn = document.getElementById('courierBackBtn');
    
    exitModalListener(courierExitBtn, courierRatesModal);

    courierConfirmBtn.addEventListener('click', async () => {
        const selectedRate = document.querySelector('input[name="carrier-price"]:checked');

        if (!selectedRate) {
            alert("shipping rate must be selected!");
            return;
        }

        removeCourierRatesModal();

        listing.shipping = {
            courier: selectedRate.dataset.courier,
            service_name : selectedRate.dataset.serviceName,
            min_delivery_time: selectedRate.dataset.minDeliveryTime,
            max_delivery_time: selectedRate.dataset.maxDeliveryTime,
            estimateRate: parseFloat(selectedRate.value)
        };

        collectListingInfo();
        await uploadListing();

    })

    courierBackBtn.addEventListener('click', () => {
        removeCourierRatesModal();
        showDimensionsModal();
        return;
    })
}

function setDimensionsListeners() {
    const defaultsBtn = document.getElementById('defaultsBtn');

    defaultsBtn.addEventListener('click', () => {
        const parcel = {
            "length": document.getElementById('length').value,
            "width": document.getElementById('width').value,
            "height": document.getElementById('height').value,
            "weight": document.getElementById('weight').value
        }
        
        closeDimensionsModal();
        proceedWithShipping(parcel);
        showCourierRatesModal();

    })

    

}

function setDefaultDimensions(category) {
        const defaults = CATEGORY_DEFAULTS[category] ?? CATEGORY_DEFAULTS['other'];

        document.getElementById('length').value = defaults.length;
        document.getElementById('width').value = defaults.width;
        document.getElementById('height').value = defaults.height;
        document.getElementById('weight').value = defaults.weight;

}


// Help functions
function showError(elementId, errorMessage) {
    const id = document.getElementById(elementId);
    const errorId = document.getElementById(`error-${elementId}`);
    errorId.textContent = `${errorMessage}`;
    id.scrollIntoView({ behavior: 'smooth'});
    id.classList.add('error');
};

function removeError(elementId) {
    const id = document.getElementById(elementId);
    const errorId = document.getElementById(`error-${elementId}`);
    errorId.textContent = '';
    id.classList.remove('error');
}

function displayShippingCouriers(couriersArray) {
    const panel = document.getElementById('carrierPanel');
    panel.style.display = 'block';

    const carrierRows = document.querySelector('.carrier-rows-wrapper');
    carrierRows.innerHTML = '';

    couriersArray.forEach(courier => {
        console.log(courier)
        const courierInfo = {
            id: courier.courier_service.courier_id,
            logo: courier.courier_service.logo,
            name: courier.courier_service.name,
            total_charge: parseFloat(courier.total_charge),
            time: `${courier.min_delivery_time} - ${courier.max_delivery_time}`
        }
        
        // create row element
        const carrierRow = document.createElement('div');
        carrierRow.classList.add('carrier-row');
        carrierRow.dataset.id = `${courierInfo.id}`;
        carrierRow.innerHTML = `
            <div class="carrier-info">
                <div class="carrier-image-wrapper">
                    <img src=${courierInfo.logo} alt="" class="carrier-image">
                </div>
                <div class="carrier-title">
                    <span>${courierInfo.name}</span>
                    <p>${courierInfo.time} business days</p>
                </div>
            </div>
            <div class="carrier-pricing">
                <div class="carrier-price">
                    <span>$${courierInfo.total_charge}</span>
                    <p>est. rate</p>   
                </div>
                
                <div class="form-input">
                    <label for="carrier-price"></label>
                    <input
                        type="radio"
                        name="carrier-price"
                        id="carrier-price"
                        value="${courierInfo.total_charge}"
                        data-courier="${courier.courier_service.umbrella_name}"
                        data-service-name="${courierInfo.name}"
                        data-min-delivery-time="${courier.min_delivery_time}"
                        data-max-delivery-time="${courier.max_delivery_time}"
                    >
                </div>
            </div>
        `;

        carrierRows.append(carrierRow);    
        
    })

    // add listeners to new elements
    const courierOptions = document.querySelectorAll('.carrier-rows-wrapper .carrier-row');
    console.log("All courier options: ", courierOptions);
    courierOptions.forEach(option => {
        option.addEventListener('click', () => {
            // console.log("clicked option: ", option);
            const radioInput = option.querySelector('.carrier-pricing .form-input input[type="radio"]');
            console.log("Selected radio input: ", radioInput);
            radioInput.checked = true;
             // remove selected from all first
             courierOptions.forEach(c => c.classList.remove('selected'));
             // add to clicked one
             option.classList.add('selected');
        });
    })

}

function showCourierRatesModal() {
    courierRatesModal.classList.add('show');
    modalOverlay.classList.add('show');

    setCourierListeners();
}

function removeCourierRatesModal() {
    courierRatesModal.classList.remove('show');
    modalOverlay.classList.remove('show');
}

function showDimensionsModal() {
    const category = productCategory.value;

    setDefaultDimensions(category);
    exitModalListener(dimensionExitBtn, packageDimensions);
    setDimensionsListeners();

    packageDimensions.classList.add('show');
    modalOverlay.classList.add('show');

}

function closeDimensionsModal() {
    packageDimensions.classList.remove('show');
    modalOverlay.classList.remove('show');
}

function showSavingModal() {
    modalOverlay.classList.add('show');
    savingModal.classList.add('show');
}

function showSuccessMessage() {
    modalOverlay.classList.add('show');

    const successModal = document.getElementById('successModal');
    const itemName = successModal.querySelector('.item-title');
    const itemImage = successModal.querySelector('.product-image');
    const modalProductName = successModal.querySelector('.modal-product-name');
    const modalProductMeta = successModal.querySelector('.modal-product-meta');

    itemName.textContent = listing.productName;
    itemImage.src = listing.images[0].url; // Assuming the first image is the primary one
    modalProductName.textContent = listing.productName;
    modalProductMeta.textContent = `$${listing.originalPrice} - ${listing.shipping.courier} ${listing.shipping.service_name}`;

    successModal.classList.add('show');

    // Add event listener to view listing button
    const viewListingBtn = successModal.querySelector('.view-listing-btn');
    viewListingBtn.addEventListener('click', () => {
        window.location.href = `/shop/product/${listing.listingId}`;
    });
    // Add event listener to list another item button
    const listAnotherBtn = successModal.querySelector('.listing-another-item');
    listAnotherBtn.addEventListener('click', () => {
        successModal.classList.remove('show');
        modalOverlay.classList.remove('show');
        // Reset form for new listing
        resetForm();
    });

}

function removeSavingModal() {
    modalOverlay.classList.remove('show');
    savingModal.classList.remove('show');
}

function showLoading() {
    loader.style.display = 'flex';
}

function removeLoading() {
    loader.style.display = 'none';
}

function resetForm() {
    productTitle.value = '';
    productCategory.value = '';
    productDescription.value = '';
    productPrice.value = '';

    const images = document.querySelectorAll('.image-preview');
    images.forEach(image => {
        image.src = '';
        image.style.display = 'none';
    });

    const removeButtons = document.querySelectorAll('.remove-image-btn');
    removeButtons.forEach(button => {
        button.style.display = 'none';
    });

    tradeStatus.classList.remove('active');

};


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


function collectListingInfo() {

    listing.originalPrice = parseFloat(productPrice.value);
    listing.productName = productTitle.value.trim();
    listing.availableForTrade = tradeStatus.classList.contains('active');
    listing.ownerId = currentUser.email;
    listing.status = 'active';
    listing.description = productDescription.value.trim();

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

function proceedWithShipping(parcel) {
    fetchShippingRates(parcel);
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


async function fetchShippingRates(parcel) {
    showLoading();
    const payload = {
        fromAddress: {
            line_1: currentUser.address1,
            city: currentUser.city,
            state: 'TX',
            postal_code: currentUser.postalCode,
            country_alpha2: 'US',
        },
        toAddress: PLACEHOLDER_DESTINATION,
        parcel: {
            ...parcel,
            category: productCategory.value,
            price: parseFloat(productPrice.value)
        }
    };
    
    try {
        const response = await fetch('/seller/api/shipping-rates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
        })

        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`)
        }
        const result =  await response.json();
        const bestShippingCourier = result.rates ? result.rates.filter(rates => rates.cost_rank <= 5) : [];
        displayShippingCouriers(bestShippingCourier);
    } catch (error) {
        console.error("Error fetching data:", error);
        alert("Error loading data")
    } finally {
        removeLoading();
    }
    

    

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

async function uploadListing() {
    showSavingModal();
    try {
        const images = collectImageData('.image-preview');
        const imagesURL =  await uploadImagesToFirebase(images, currentUser.email);
        listing.images = imagesURL;
        await uploadListingToFirebase(listing); 
        removeSavingModal();
        showSuccessMessage();
    } catch (e) {
        removeSavingModal();
        console.log("Error occur when uploading data: ", e);
    }
}

