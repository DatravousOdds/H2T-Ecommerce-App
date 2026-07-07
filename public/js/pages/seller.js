import { checkUserStatus } from '../auth/auth.js';
import { getStorage, ref, uploadString, getDownloadURL, deleteDoc, db, doc, app, getDoc, updateDoc, Timestamp } from '../api/firebase-client.js';
import { collection, addDoc } from '../api/firebase-client.js';
import { serverTimestamp } from '../api/firebase-client.js';
import { showLoader, hideLoader } from '../components/pageLoader.js';

// Kept in sync with the color values men.js filters listings by.
const colors = [
    { name: "Black",  value: "black" },
    { name: "White",  value: "white" },
    { name: "Multi",  value: "multi" },
    { name: "Blue",   value: "blue" },
    { name: "Grey",   value: "grey" },
    { name: "Red",    value: "red" },
    { name: "Yellow", value: "yellow" },
    { name: "Brown",  value: "brown" },
    { name: "Pink",   value: "pink" },
    { name: "Purple", value: "purple" },
    { name: "Green",  value: "green" },
    { name: "Orange", value: "orange" },
];

// Curated suggestions for the brand typeahead. Brand itself stays free text --
// this is just a shortcut for common picks, not a restricted set of values.
const BRAND_GROUPS = [
    { label: "Streetwear", brands: ["Supreme", "Bape", "Palace", "Stüssy", "Off-White", "Fear of God", "Chrome Hearts", "Kith", "Vlone", "Essentials"] },
    { label: "Sneakers", brands: ["Nike", "Jordan", "Adidas", "New Balance", "Converse", "Vans", "Puma", "Reebok", "Asics", "Yeezy"] },
    { label: "Vintage & Heritage", brands: ["Carhartt", "Champion", "Polo Ralph Lauren", "Levi's", "The North Face", "Nautica"] },
];



const imageGridContainer = document.querySelector('.images-grid-container');

const videoContainer = document.getElementById('videoContainer');
const videoInput = document.getElementById('video');
const videoPreview = document.querySelector('.video-preview');
const removeVideoBtn = videoContainer.querySelector('.remove-image-btn');

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_DURATION = 30; // seconds
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

const productTitle = document.getElementById('title');
const listingTypeSection = document.getElementById('listingTypeSection');
const productListingType = document.getElementById('listingType');
const releaseDateSection = document.getElementById('releaseDateSection');
const productReleaseDate = document.getElementById('releaseDate');
const productCategory = document.getElementById('category');
const productDescription = document.getElementById('description');
const productPrice = document.getElementById('price');
const productSize = document.getElementById("size");
const sizeInfo = document.getElementById("sizeInfo");
const productInfo = document.getElementById("product-info");
const productBrand = document.getElementById("brand");
const brandOptions = document.getElementById("brandOptions");
const productCondition = document.getElementById("condition");
const productColor = document.getElementById("color");

const titleCharCounter = document.getElementById('titleCharCounter');
const descriptionWordCounter = document.getElementById('descriptionWordCounter');


const modalOverlay = document.querySelector('.modal-overlay');
const packageDimensions = document.getElementById('packageDimensions');
const courierRatesModal = document.getElementById('courierRatesModal');
const savingModal = document.getElementById('savingModal');

const shippingContainers = document.querySelectorAll('.shipping-btn-container');
const shippingGroupContainer = document.querySelector('.input-grid-wrapper');

const postBtn = document.getElementById('postBtn');
const draftBtn = document.getElementById('draftBtn');

const courierPanel = document.getElementById('carrierPanel');
const carrierWrapper = document.querySelector('.carrier-rows-wrapper');

const courierExitBtn = document.getElementById('courierExitBtn');
const dimensionExitBtn = document.getElementById('dimensionExitBtn');

const currentUser =  await checkUserStatus();

if (!currentUser) {
    window.location.replace('/login');
};

// Release-type listings (StockX-style calendar drops) are an admin-only
// tool -- regular sellers never see the option. This is UI-only, same as
// every other client-direct-to-Firestore write in this file (userId,
// status, etc. are equally spoofable today) -- there's no Firestore rule
// or server route checked in this repo to enforce it, so a non-admin could
// still set listingType:"release" via devtools. Flagging rather than fixing
// here since it'd require a Firestore Security Rules change outside this repo.
if (currentUser.isAdmin) {
    listingTypeSection.style.display = '';
}

productListingType?.addEventListener('change', () => {
    releaseDateSection.style.display = productListingType.value === 'release' ? '' : 'none';
});

// Presence of ?listingId= is what turns this page from "create" into "edit" --
// same form, same submit handlers, just pointed at an existing document.
const editListingId = new URLSearchParams(window.location.search).get('listingId');
const isEditing = Boolean(editListingId);

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
    listingPrice: 0,
    userId: currentUser.userId,
    productName: '',
    images: [],
    status: '',
    listingId: '',
    shipping: '',
    description: ''

};

// Set from the existing doc when editing so collectListingInfo() can tell
// whether the seller actually changed the price (see price-drop logic there).
let previousListingPrice = null;

const kidsRange = Array.from({ length: 12 }, (_, i) => {
    if (i < 7) {
      return 10.5 + i * 0.5;
    } 
    return 1 + (i - 7) * 0.5;
    
});
   
const mensRange = Array.from({length:17 }, (_,i) => {
    if (i > 12) {
      return i;
  }
    return 6 + i * 0.5;
})
  
const womenRange = Array.from({length: 17}, (_,i) => {
    return 4 + i * 0.5;
});

const sneakersSizes = [...kidsRange, ...womenRange, ...mensRange]

const CATEGORY_FIELDS = {
    "women-sneakers": 
    {
        fields: createSneakerFields(womenRange)
    },
    "men-sneakers": 
    {
        fields: createSneakerFields(mensRange)
    },
    "kids-sneakers": 
    {
        fields: createSneakerFields(kidsRange)

    },
    "men-shoes": {
        fields: createSneakerFields(mensRange)
    },
    "women-shoes": {
        fields: createSneakerFields(womenRange)
    },
    "women-bags": {
        fields: []
    },
    "apparel": {
        fields: [{ type: "dropdown", name:"size", options: ["XXS","XS", "S","M","L","XL","XXL"] }]
    },
     
    "hats": {
        fields: [{ type: "dropdown", name:"size", options: ['XS','S','M','L','XL','XXL'] }]
    },
    "accessories": {
        fields: [{ type: "dropdown", name:"size", options: ['OS','S/M','L/XL'] }]
    },
    "other": {
        fields: []
    }
        
    
    
}



initFormListeners();
wordCounter();
populateColorOptions();
initBrandCombobox();
syncSelectedShippingContainer();

if (isEditing) {
    postBtn.textContent = 'Update';
    const headerTitle = document.querySelector('.header-title');
    if (headerTitle) headerTitle.textContent = 'Edit listing';

    await loadListingForEdit(editListingId);
}

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

draftBtn.addEventListener('click', async () => {
    if (!validationInformation()) return;

    collectListingInfo('draft');
    await saveDraft();
});

carrierWrapper.addEventListener('click', (e) => {
    const row = e.target.closest('.carrier-row');
    const carrierInput = row.querySelector('.form-input input[type="radio"]');
    // console.log(carrierInput);
    carrierInput.checked = true;
})

shippingContainers.forEach(container => {
    container.addEventListener('click', () => {
        // Clicking the box anywhere (not just the label/radio dot) should
        // actually select the radio -- otherwise the box can visually look
        // selected while the checked radio (what postBtn reads) disagrees.
        const radio = container.querySelector('input[type="radio"]');
        radio.checked = true;

        // remove selected from all first
        shippingContainers.forEach(c => c.classList.remove('selected'));
        // add to clicked one
        container.classList.add('selected');
    });
});

imageGridContainer.addEventListener('click', (e) => {
    const imageContainer = e.target.closest('.image-container');
    if (!imageContainer) { return null;}

    if (imageContainer === videoContainer) {
        if (e.target.closest('.remove-image-btn')) {
            e.stopPropagation();
            handleImageRemove(videoInput, videoPreview, removeVideoBtn);
            return;
        }
        handleVideoUpload(videoInput, videoPreview, removeVideoBtn);
        return;
    }

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

productCategory.addEventListener("change", () => {
    if (!category) return;
    getCategoryFields(category.value.trim());
})







function createSneakerFields(sizeRange) {
    return [
        { type: "dropdown", name: "size", options: [...sizeRange]},
        { type: "text", name: "sku", options: []}
    ]
}
  
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

function populateColorOptions() {
    colors.forEach(({ name, value }) => {
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = name;
        productColor.appendChild(opt);
    });
}

function initBrandCombobox() {
    const renderBrandOptions = (query) => {
        const search = query.trim().toLowerCase();
        brandOptions.innerHTML = "";

        BRAND_GROUPS.forEach(({ label, brands }) => {
            const matches = brands.filter((brand) => brand.toLowerCase().includes(search));
            if (!matches.length) return;

            const groupLabel = document.createElement("li");
            groupLabel.className = "brand-group-label";
            groupLabel.textContent = label;
            brandOptions.appendChild(groupLabel);

            matches.forEach((brand) => {
                const item = document.createElement("li");
                item.setAttribute("role", "option");
                item.dataset.brand = brand;
                item.textContent = brand;
                brandOptions.appendChild(item);
            });
        });

        const otherItem = document.createElement("li");
        otherItem.className = "other-option";
        otherItem.setAttribute("role", "option");
        otherItem.textContent = search ? `Other -- use "${query.trim()}"` : "Other (enter your own brand)";
        brandOptions.appendChild(otherItem);
    };

    const openBrandOptions = (query) => {
        renderBrandOptions(query);
        brandOptions.classList.add("show");
        productBrand.setAttribute("aria-expanded", "true");
    };

    const closeBrandOptions = () => {
        brandOptions.classList.remove("show");
        productBrand.setAttribute("aria-expanded", "false");
    };

    productBrand.addEventListener("focus", () => openBrandOptions(productBrand.value));
    productBrand.addEventListener("input", () => {
        openBrandOptions(productBrand.value);
        removeError("brand");
    });

    brandOptions.addEventListener("click", (e) => {
        const item = e.target.closest("li[role='option']");
        if (!item) return;

        if (item.dataset.brand) {
            productBrand.value = item.dataset.brand;
            removeError("brand");
        }

        closeBrandOptions();
        productBrand.focus();
    });

    productBrand.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeBrandOptions();
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".brand-combobox")) closeBrandOptions();
    });
}

async function loadListingForEdit(listingId) {
    try {
        const snap = await getDoc(doc(db, 'listings', listingId));

        if (!snap.exists()) {
            alert('Listing not found.');
            window.location.href = '/profile';
            return;
        }

        const existing = { id: snap.id, ...snap.data() };

        if (existing.userId !== currentUser.userId) {
            alert('You do not have permission to edit this listing.');
            window.location.href = '/profile';
            return;
        }

        // Carry these over directly rather than through collectListingInfo()
        // so an edit updates the existing document instead of minting a new
        // one, and doesn't clobber the original creation date.
        listing.listingId = existing.id;
        listing.createdAt = existing.createdAt;
        listing.status = existing.status;
        previousListingPrice = existing.listingPrice ?? null;

        populateFormForEdit(existing);
    } catch (error) {
        console.error('Error loading listing for edit:', error);
        alert('Something went wrong loading this listing.');
    }
}

function populateFormForEdit(existing) {
    productTitle.value = existing.productName || '';
    titleCharCounter.textContent = `${productTitle.value.length}/80`;

    const categoryValue = (existing.categoryMeta && existing.categoryMeta !== 'other')
        ? `${existing.categoryMeta}-${existing.category}`
        : 'other';
    productCategory.value = categoryValue;
    getCategoryFields(categoryValue);
    if (existing.size) productSize.value = existing.size;

    productBrand.value = existing.brand || '';
    productColor.value = existing.color || '';
    productCondition.value = existing.condition || '';
    productPrice.value = existing.listingPrice ?? '';

    productDescription.value = existing.description || '';
    const words = productDescription.value.trim() ? productDescription.value.trim().split(/\s+/) : [];
    descriptionWordCounter.textContent = `${words.length}/100`;

    if (currentUser.isAdmin && existing.listingType === 'release' && existing.releaseDate) {
        productListingType.value = 'release';
        releaseDateSection.style.display = '';
        const d = existing.releaseDate.toDate();
        // toISOString() would shift back a day in US timezones (UTC-based) --
        // build the YYYY-MM-DD string from local getters instead.
        const localIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        productReleaseDate.value = localIso;
    }

    restoreShippingSelection(existing.shipping);
    populateExistingImages(existing.images || []);
    if (existing.video) populateExistingVideo(existing.video);
}

function restoreShippingSelection(shipping) {
    // Only the prepaid path stores a shipping object (courier info); the
    // own-shipping path never writes `listing.shipping` at all currently,
    // so that's the fallback guess for anything else.
    const isPrepaid = Boolean(shipping && typeof shipping === 'object' && shipping.courier);
    const radio = document.getElementById(isPrepaid ? 'prepaid' : 'yourShip');
    if (!radio) return;

    radio.checked = true;
    syncSelectedShippingContainer();
}

// Applies the `.selected` highlight to whichever shipping box's radio is
// actually checked -- keeps the visual state and the value postBtn reads
// in agreement, both on initial page load and after restoreShippingSelection.
function syncSelectedShippingContainer() {
    const checkedRadio = document.querySelector('input[name="shipping-method"]:checked');
    if (!checkedRadio) return;

    shippingContainers.forEach(c => c.classList.remove('selected'));
    checkedRadio.closest('.shipping-btn-container')?.classList.add('selected');
}

function populateExistingImages(images) {
    const containers = [...document.querySelectorAll('.images-grid-container .image-container')]
        .filter(c => c !== videoContainer);
    const sorted = [...images].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

    sorted.forEach((img, i) => {
        const container = containers[i];
        if (!container || !img?.url) return;

        const preview = container.querySelector('.image-preview');
        const removeBtn = container.querySelector('.remove-image-btn');

        preview.src = img.url;
        // Marks this preview as an already-uploaded Storage file, not a
        // freshly-picked one -- see collectImageData/uploadImagesToFirebase.
        preview.dataset.storagePath = img.path || '';
        preview.style.display = 'block';
        removeBtn.style.display = 'block';
    });
}

function populateExistingVideo(video) {
    if (!video?.url) return;

    videoPreview.src = video.url;
    videoPreview.dataset.storagePath = video.path || '';
    videoPreview.style.display = 'block';
    removeVideoBtn.style.display = 'block';
}

function getCategoryFields(category) {
    if (!category) return;
    const normalizedCategory = CATEGORY_FIELDS[category] ? category : category.split("-")[1];
    renderSizeOptions(normalizedCategory);
    

  
}

function renderSizeOptions(category) {
    const fields = CATEGORY_FIELDS[category].fields;
    if (fields.length === 0) {
        sizeInfo.style.display = "none";

    } else {
        sizeInfo.style.display = 'block';
        productSize.innerHTML = "";
        fields.forEach(field => {  
            if (field.type === "dropdown") {
                const options = field.options;
                options.forEach(option => {
                    const opt = document.createElement("option");
                    opt.value = option;
                    opt.textContent = option;

                    productSize.appendChild(opt)
                });
            } else if (field.type === "text") {
                const productSku = document.getElementById("sku");
                if (productSku) return;
                const skuInput = ` 
                    <div class="input-header">
                        <label for="sku">SKU</label>
                        <div class="char-counter" id="skuCounter">0/100</div>
                    </div>
                    <input type="text" id="${field.name}" name="${field.name}" placeholder="Enter product sku" />
                    <p class="errorText" id="error-sku"></p>
                `;
                const inputContainer = document.createElement("div");
                inputContainer.classList.add("input-container");
                inputContainer.innerHTML = skuInput;
                
                productInfo.appendChild(inputContainer);
            }
        });
    };
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

function carrierRowSkeletonHTML() {
    return `
        <div class="carrier-row carrier-row-skeleton">
            <div class="carrier-info">
                <div class="carrier-image-wrapper">
                    <div class="skeleton" style="width:64px;height:64px;border-radius:8px;"></div>
                </div>
                <div class="carrier-title">
                    <span class="skeleton skeleton-line" style="width:140px;"></span>
                    <p><span class="skeleton skeleton-line" style="width:90px;"></span></p>
                </div>
            </div>
            <div class="carrier-pricing">
                <div class="carrier-price">
                    <span class="skeleton skeleton-line" style="width:60px;"></span>
                    <p><span class="skeleton skeleton-line" style="width:50px;"></span></p>
                </div>
            </div>
        </div>
    `;
}

function renderCarrierSkeletons(count = 3) {
    removeError('carrierPanel');
    carrierWrapper.innerHTML = Array.from({ length: count }, carrierRowSkeletonHTML).join('');
}

function displayShippingCouriers(couriersArray) {
    const panel = document.getElementById('carrierPanel');
    panel.style.display = 'block';

    const carrierRows = document.querySelector('.carrier-rows-wrapper');
    carrierRows.innerHTML = '';

    if (couriersArray.length === 0) {
        showError('carrierPanel', 'No shipping rates were found for this package. Try adjusting the dimensions or weight.');
        return;
    }

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
    const successHeading = successModal.querySelector('.m-header-text h5');
    if (successHeading) successHeading.textContent = isEditing ? 'Listing updated!' : 'Item listed successfully!';

    itemName.textContent = listing.productName;
    itemImage.src = listing.images[0].url; // Assuming the first image is the primary one
    modalProductName.textContent = listing.productName;
    modalProductMeta.textContent = listing.shipping.courier ? `$${listing.listingPrice} - ${listing.shipping.courier} ${listing.shipping.service_name}` : `$${listing.listingPrice} - Free Shipping`;
    successModal.classList.add('show');

    // Add event listener to view listing button
    const viewListingBtn = successModal.querySelector('.view-listing-btn');
    viewListingBtn.addEventListener('click', () => {
        window.location.href = `/shop/product.html?id=${listing.listingId}`;
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

function resetForm() {
    productTitle.value = '';
    productCategory.value = '';
    productDescription.value = '';
    productPrice.value = '';
    productBrand.value = '';
    productCondition.value = '';
    productColor.value = '';
    if (productSize) productSize.value = '';


    const images = document.querySelectorAll('.image-preview');
    images.forEach(image => {
        image.src = '';
        image.style.display = 'none';
    });

    const removeButtons = document.querySelectorAll('.remove-image-btn');
    removeButtons.forEach(button => {
        button.style.display = 'none';
    });

    videoPreview.src = '';
    videoPreview.style.display = 'none';

    // Uncheck shipping selection so postBtn's validation forces a fresh pick.
    document.querySelectorAll('input[name="shipping-method"]').forEach(radio => radio.checked = false);
    shippingContainers.forEach(c => c.classList.remove('selected'));

    // listing.listingId carries over from the just-created doc -- without
    // resetting it, uploadListing()'s `listing.listingId || newId` reuses
    // that id and overwrites the listing just posted instead of creating
    // a new one.
    listing = {
        listingPrice: 0,
        userId: currentUser.userId,
        productName: '',
        images: [],
        status: '',
        listingId: '',
        shipping: '',
        description: ''
    };
    previousListingPrice = null;
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
    const brand = productBrand.value.trim() !== '';
    const condition = productCondition.value.trim() !== '';

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
    if (currentUser.isAdmin && productListingType?.value === 'release') {
        const releaseDateValue = productReleaseDate.value;
        if (!releaseDateValue) {
            showError('releaseDate', "Please pick a release date");
            isValid = false;
            return;
        }
        const [year, month, day] = releaseDateValue.split('-').map(Number);
        const releaseDate = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (releaseDate <= today) {
            showError('releaseDate', "Release date must be in the future");
            isValid = false;
            return;
        }
    }
    if (!brand) {
        showError('brand', "Please enter a brand");
        isValid = false;
        return;
    };
    if (!condition) {
        showError("condition", "Please enter a condition to continue");
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


function collectListingInfo(status = 'active') {
    const category = productCategory.value.trim().split('-')[1] || 'other';
    const categoryMeta = productCategory.value.trim().split('-')[0] || 'other';

    listing.category = category;
    listing.categoryMeta = categoryMeta;
    const enteredPrice = parseFloat(productPrice.value);

    // Price drop: if editing and the seller lowered/raised the price, keep
    // the price it used to be as originalPrice so the UI can strike it
    // through. Leaving originalPrice unset (rather than clobbering it) when
    // the price didn't change preserves whatever markdown state was already
    // saved on the listing.
    if (isEditing && previousListingPrice !== null && enteredPrice !== previousListingPrice) {
        listing.originalPrice = previousListingPrice;
    }

    listing.listingPrice = enteredPrice;
    listing.productName = productTitle.value.trim();
    listing.userId = currentUser.userId;
    listing.status = status;
    listing.description = productDescription?.value.trim();
    listing.brand = productBrand?.value.trim();
    listing.condition = productCondition?.value.trim();
    listing.size = productSize?.value.trim();
    listing.color = productColor?.value.trim() || null;

    // Release-type listings (admin-only, see listingTypeSection) get held off
    // the normal shop pages until releaseDate -- see loadProducts() in
    // global.js for the visibility check. releaseMonth/releaseDay are
    // denormalized here so releasesProductTemplate (releases.js) can render
    // the calendar tile without a second lookup.
    if (currentUser.isAdmin && productListingType?.value === 'release') {
        listing.listingType = 'release';
        // new Date("YYYY-MM-DD") parses as UTC, which shifts the date back a
        // day in US timezones once read back with local getters below -- the
        // multi-arg constructor always builds in local time instead.
        const [year, month, day] = productReleaseDate.value.split('-').map(Number);
        const releaseDate = Timestamp.fromDate(new Date(year, month - 1, day));
        listing.releaseDate = releaseDate;
        listing.releaseMonth = releaseDate.toDate().toLocaleString('en-US', { month: 'short' }).toUpperCase();
        listing.releaseDay = String(releaseDate.toDate().getDate());
    } else {
        listing.listingType = 'standard';
    }

    // Editing keeps the original createdAt (already carried over in
    // loadListingForEdit) and stamps lastUpdated instead, so listings don't
    // appear freshly-created every time they're touched.
    if (isEditing) {
        listing.lastUpdated = serverTimestamp();
    } else {
        listing.createdAt = serverTimestamp();
    }

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
        // Set only on previews populated from an existing listing --
        // marks this image as already uploaded (see uploadImagesToFirebase).
        path: img.dataset.storagePath || null,
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
    delete preview.dataset.storagePath;
    preview.style.display = 'none';
    removeBtn.style.display = 'none';
    return;
}

function handleVideoUpload(input, preview, removeBtn) {
    input.click();

    input.addEventListener('change', (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        if (!ALLOWED_VIDEO_TYPES.includes(selectedFile.type)) {
            alert(`Invalid file type: ${selectedFile.type} is not a valid video type.`);
            handleImageRemove(input, preview, removeBtn);
            return;
        }

        if (selectedFile.size >= MAX_VIDEO_SIZE) {
            alert("Video file is too large! Max size is 50MB.");
            handleImageRemove(input, preview, removeBtn);
            return;
        }

        const objectUrl = URL.createObjectURL(selectedFile);
        const probe = document.createElement('video');
        probe.preload = 'metadata';

        probe.onloadedmetadata = () => {
            URL.revokeObjectURL(objectUrl);

            if (probe.duration > MAX_VIDEO_DURATION) {
                alert(`Video is too long! Keep it under ${MAX_VIDEO_DURATION} seconds.`);
                handleImageRemove(input, preview, removeBtn);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.style.display = 'block';
                removeBtn.style.display = 'block';
            };
            reader.readAsDataURL(selectedFile);
        };

        probe.src = objectUrl;
    });
}


async function fetchShippingRates(parcel) {
    const shipping = currentUser.shipping;
    const requiredFields = ['address', 'city', 'state', 'zipCode', 'country'];
    const missingShippingInfo = !shipping || requiredFields.some(field => !shipping[field]);

    if (missingShippingInfo) {
        showError('carrierPanel', 'Add your shipping address in your profile before requesting rates.');
        return;
    }

    renderCarrierSkeletons();
    const payload = {
        fromAddress: {
            line_1: shipping.address,
            city: shipping.city,
            state: shipping.state,
            postal_code: shipping.zipCode,
            country_alpha2: shipping.country,
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
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || `Response status: ${response.status}`)
        }
        const result =  await response.json();
        const bestShippingCourier = result.rates ? result.rates.filter(rates => rates.cost_rank <= 5) : [];
        displayShippingCouriers(bestShippingCourier);
    } catch (error) {
        console.error("Error fetching data:", error);
        carrierWrapper.innerHTML = '';
        showError('carrierPanel', 'Could not load shipping rates. Please try again.');
    }
}

async function uploadImagesToFirebase(images, userId) {
    // Reuse the real document ID when editing so Storage paths for any newly
    // added images land under the same listing instead of a fresh one.
    const listingId = listing.listingId || doc(collection(db, 'listings')).id;
    listing.listingId = listingId;
    const uploadPromises = images.map(async (img, index) => {
        // Carried over unchanged from an existing listing -- already in
        // Storage, so re-uploading would just duplicate it under a new path.
        if (img.path) {
            return {
                url: img.url,
                path: img.path,
                isPrimary: img.isPrimary,
                index: img.index
            };
        }

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

  const settledUploads = await Promise.allSettled(uploadPromises);

  const uploadedImages = settledUploads
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);

  const failedUploads = settledUploads
      .filter(result => result.status === 'rejected')
      .map(result => result.reason);

  return { images: uploadedImages, failed: failedUploads };

}

function collectVideoData() {
    const src = videoPreview.getAttribute('src');
    if (src && src.trim() !== '') {
        return { url: src, path: videoPreview.dataset.storagePath || null };
    }
    return null;
}

async function uploadVideoToFirebase(videoData, userId, listingId) {
    // Same as images -- a video carried over unchanged is already in Storage.
    if (videoData.path) {
        return { url: videoData.url, path: videoData.path };
    }

    const videoPath = `listings/${userId}/${listingId}/video_${Date.now()}.mp4`;
    const storageRef = ref(storage, videoPath);

    const uploadResult = await uploadString(storageRef, videoData.url, 'data_url');
    const downloadURL = await getDownloadURL(uploadResult.ref);

    return { url: downloadURL, path: videoPath };
}

async function saveListingToFirebase(data) {
    try {
        if (isEditing) {
            await updateDoc(doc(db, 'listings', listing.listingId), data);
            console.log("Document updated with the ID: ", listing.listingId);
            return listing.listingId;
        }

        const docRef = await addDoc(collection(db, 'listings'), data);
        console.log("Document written with the ID: ", docRef.id);
        return docRef.id;
    } catch(e) {
        console.error("Error saving document:", e);
        throw e;
    }

}

async function uploadListing() {
    showSavingModal();
    try {
        const images = collectImageData('.image-preview');
        const { images: uploadedImages, failed } = await uploadImagesToFirebase(images, currentUser.userId);

        if (failed.length > 0) {
            removeSavingModal();
            alert(`${failed.length} of ${images.length} photo(s) failed to upload. Please try again.`);
            return;
        }

        listing.images = uploadedImages;

        const videoData = collectVideoData();
        if (videoData) {
            listing.video = await uploadVideoToFirebase(videoData, currentUser.userId, listing.listingId);
        }

        await saveListingToFirebase(listing);
        removeSavingModal();
        showSuccessMessage();
    } catch (e) {
        removeSavingModal();
        console.error("Error occurred when uploading listing: ", e);
        alert("Something went wrong while posting your listing. Please try again.");
    }
}

async function saveDraft() {
    const mainEl = document.querySelector('main');
    showLoader(mainEl);
    try {
        const images = collectImageData('.image-preview');
        const { images: uploadedImages, failed } = await uploadImagesToFirebase(images, currentUser.userId);

        if (failed.length > 0) {
            alert(`${failed.length} of ${images.length} photo(s) failed to upload. Please try again.`);
            return;
        }

        listing.images = uploadedImages;

        const videoData = collectVideoData();
        if (videoData) {
            listing.video = await uploadVideoToFirebase(videoData, currentUser.userId, listing.listingId);
        }

        await saveListingToFirebase(listing);
        alert("Your listing has been saved as a draft.");
    } catch (e) {
        console.error("Error occurred when saving draft: ", e);
        alert("Something went wrong while saving your draft. Please try again.");
    } finally {
        hideLoader(mainEl);
    }
}

