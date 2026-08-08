import { getStorage, ref, uploadString, getDownloadURL, deleteDoc } from '../api/firebase-client.js';
import { collection, addDoc, db, serverTimestamp, getDocs, query, where, auth } from '../api/firebase-client.js';
import { checkUserStatus } from '../auth/auth.js';
import { initCartDrawer } from '../components/cartDrawer.js';
import { getUserCartCount, updateCartCount } from '../commerce/cart.js';
import { addToCart, createAuthCartItem } from '../core/global.js';

const storage = getStorage();

initCartDrawer();

let currentUser = null;
currentUser = await checkUserStatus();

// Image upload functionality
const imageInputs = document.querySelectorAll(".file-input");
const imageItems = document.querySelectorAll(".image-item");
const reviewImages = document.querySelectorAll('.review-image');
// auth form
const authSubmitBtn = document.getElementById('submitAuthBtn');
const payNowBtn = document.getElementById('payNowBtn');
// categories selection functionality
const categories = document.getElementById('categories');
const dynamicFormContainer = document.getElementById('dynamic-form-container');
let categorySelected;

const uploadSlotByCategory = {
  "trading cards" : {
    angles: [
      { id: "front", label: "Front View", type: "required", icon:'fa-solid fa-camera' },
      { id: "label", label: "Front of Label", type: "required" },
      { id: "sticker", label: "Laser Sticker Front (Straight On)", type: "required" },
      { id: "upper-left-corners", label: "Front Corners of Card (Upper Left)", type: "required" },
      { id: "upper-right-corners", label: "Front Corners of Card (Upper Right)", type: "required" },
      { id: "lower-left-corners", label: "Front Corners of Card (Lower Left)", type: "required" },
      { id: "lower-right-corners", label: "Front Corners of Card (Lower Right)", type: "required" },
      { id: "back", label: "Back View", type: "required" }
    ]
  },
  "apparel": {
    angles: [
      { id: "front", label: "Front View (Laid Flat or On Hanger)", type: "required", icon: 'fa-solid fa-camera' },
      { id: "back", label: "Back View", type: "required", icon: 'fa-solid fa-camera' },
      { id: "brand-tag", label: "Brand / Main Label Close-Up", type: "required", icon: 'fa-solid fa-camera' },
      { id: "care-label", label: "Care Label / Size Tag Close-Up", type: "required", icon: 'fa-solid fa-camera' },
      { id: "stitching", label: "Stitching Close-Up", type: "required", icon: 'fa-solid fa-camera' },
      { id: "fabric", label: "Fabric / Material Close-Up", type: "required", icon: 'fa-solid fa-camera' },
      { id: "hardware", label: "Hardware Close-Up (Buttons, Zippers, or Drawstrings)", type: "required", icon: 'fa-solid fa-camera' },
      { id: "rn-tag", label: "Manufacturer / RN Number Tag", type: "required", icon: 'fa-solid fa-camera' }
    ]
  },
  "sneakers": {
    angles: [
      { id: "pair-front", label: "Front View (Both Shoes)", type: "required", icon: 'fa-solid fa-camera' },
      { id: "pair-side", label: "Side Profile View (Both Shoes)", type: "required", icon: 'fa-solid fa-camera' },
      { id: "outsole-left", label: "Outsole / Bottom (Left Shoe)", type: "required", icon: 'fa-solid fa-camera' },
      { id: "outsole-right", label: "Outsole / Bottom (Right Shoe)", type: "required", icon: 'fa-solid fa-camera' },
      { id: "size-tag", label: "Size Tag (Inside Tongue)", type: "required", icon: 'fa-solid fa-camera' },
      { id: "box-label", label: "Box Label / UPC Sticker", type: "required", icon: 'fa-solid fa-camera' },
      { id: "stitching", label: "Stitching Close-Up", type: "required", icon: 'fa-solid fa-camera' },
      { id: "logo", label: "Brand Logo Close-Up", type: "required", icon: 'fa-solid fa-camera' }
    ]
  },
}

// cart modal actions
const cartModal = document.getElementById('addedToCartModal');
const cartItemCount = document.getElementById('cartItemCount');
const addAnotherItemBtn = document.getElementById('addAnotherItemBtn');
const viewCartBtn =  document.getElementById('viewCartBtn');
// tier containers
const tierContainers = document.querySelectorAll('.tier-container');
// review 
const reviewTier = document.querySelector('.review-tier');
// Keep track of current step
let currentStep = 1;
const nextBtn = document.querySelectorAll(".next-btn");
const backBtn = document.querySelectorAll(".back-btn");
const formSteps = document.querySelectorAll(".form-step");

const validationRules = {
      'Trading Cards': 
      [
        {id: 'card-brand', name: 'Brand', required: true },
        {id: 'card-name', name: 'Card Name', required: true },
        {id: 'card-set', name: 'Set', required: true },
        {id: 'card-year', name: 'Year', required: true, type: 'number' },
        {id: 'card-condition', name: 'Condition', required: true },

        // Other details
        {id: 'card-number', name: 'Card Number', required: false },
        {id: 'card-edition', name: 'Card Edition', required: false },
        {id: 'card-grading-company', name: 'Card Grading Company', required: false },

      ],
      'Apparel': 
      [
        {id: 'apparel-brand', name: 'Brand', required: true },
        {id: 'apparel-type', name: 'Item Type', required: true },
        {id: 'apparel-size', name: 'Size', required: true },
        {id: 'apparel-condition', name: 'Condition', required: true },
        {id: 'apparel-color', name: 'Color', required: true, type: 'text'},

        // Other details
        {id: 'apparel-material', name: 'Material', required: false, type: 'text'},
        {id: 'apparel-style', name: 'Style', required: false, type: 'text'},

      ],
      'Sneakers':
      [
        {id: 'sneaker-brand', name: 'Brand', required: true },
        // Only required when the selected brand actually has a closed model
        // list (SNEAKER_MODELS_BY_BRAND) -- e.g. required once Jordan is
        // picked, but skippable for a brand with no model list defined yet.
        {id: 'sneaker-model', name: 'Model', required: () => !!SNEAKER_MODELS_BY_BRAND[document.getElementById('sneaker-brand')?.value] },
      ],
      'Bags & Leather Goods':
      [
        // Required fields
        {id: 'bags-type', name: 'Item Type', required: true },
        {id: 'bags-brand', name: 'Brand', required: true },
        {id: 'bags-condition', name: 'Condition', required: true },

        // Other details -- bags-model resolves to whichever element currently
        // carries that id (free-text or the Hermès dropdown), swapped by
        // initBagsBrandModelToggle() based on the selected brand. Only
        // required when Hermès's closed model list is what's showing.
        {id: 'bags-model', name: 'Model', required: () => document.getElementById('bags-brand')?.value === 'Hermès' },
        {id: 'bags-color', name: 'Color', required: false },
        {id: 'bags-size', name: 'Size', required: false },
      ],
      'Luxury Shoes':
      [
        // Required fields
        {id: 'luxury-shoes-brand', name: 'Brand', required: true },
        // luxury-shoes-model resolves to whichever element currently carries
        // that id (free-text or the Jordan/Nike collab dropdown), swapped by
        // initLuxuryShoesBrandModelToggle() based on the selected brand.
        {id: 'luxury-shoes-model', name: 'Model', required: true },
        {id: 'luxury-shoes-size', name: 'Size', required: true },
        {id: 'luxury-shoes-color', name: 'Color', required: true },
        {id: 'luxury-shoes-condition', name: 'Condition', required: true },
      ]
}

const forms = {
  "Apparel": "/authenticator/templates/apparel-form.html",
  "Sneakers": "/authenticator/templates/sneakers-form.html",
  "Trading Cards": "/authenticator/templates/trading-card-form.html",
  "Bags & Leather Goods": "/authenticator/templates/bags-form.html",
  "Luxury Shoes": "/authenticator/templates/luxury-shoes-form.html"
}

// Only Jordan and Nike have a closed list of eligible collab styles within
// Luxury Shoes -- every other brand in that category keeps free-text Model.
const LUXURY_SHOES_MODELS_BY_BRAND = {
  "Jordan": [
    "Dior Jordan 1 Retro High",
    "Dior Jordan 1 Retro Low",
    "Off-White x Air Jordan 1 Retro High OG 'Chicago'",
    "Off-White x Air Jordan 1 Retro High OG 'UNC'",
    "Off-White x Air Jordan 1 Retro High OG 'White'"
  ],
  "Nike": [
    "Air Yeezy 'Blink'",
    "Air Yeezy 'Net'",
    "Air Yeezy 'Zen'",
    "Air Yeezy 2 NRG 'Pure Platinum'",
    "Air Yeezy 2 NRG 'Solar Red'",
    "Air Yeezy 2 SP 'Red October'",
    "Louis Vuitton Nike Air Force 1 Low By Virgil Abloh White",
    "Louis Vuitton Nike Air Force 1 Low By Virgil Abloh Black",
    "Louis Vuitton Nike Air Force 1 Low By Virgil Abloh Black Metallic Silver",
    "Louis Vuitton Nike Air Force 1 Low By Virgil Abloh Metallic Gold",
    "Louis Vuitton Nike Air Force 1 Low By Virgil Abloh White Green",
    "Louis Vuitton Nike Air Force 1 Low By Virgil Abloh White Red",
    "Louis Vuitton Nike Air Force 1 Low By Virgil Abloh White Royal",
    "NikeCraft Mars Yard Shoe 1.0",
    "NikeCraft Mars Yard Shoe 2.0"
  ]
};

// Closed list -- these are the only brands Hexxo currently authenticates
// sneakers for. Rendered as buttons by initSneakerBrandPicker() rather than
// a native <select>, per the searchable brand-picker design.
const SNEAKER_BRANDS = [
  "Adidas", "Asics", "Converse", "Hoka", "Jordan", "New Balance", "Nike",
  "On", "Reebok", "Salomon", "Saucony", "Vans", "Veja"
];

// Per-brand closed model lists for the standalone Model picker
// (initSneakerModelPicker) -- empty for a brand just means that picker shows
// its "No matches found" empty state until a list is added here, same as
// every other brand today.
const SNEAKER_MODELS_BY_BRAND = {
  "Jordan": [
    "Jordan 1", "Jordan 2", "Jordan 3", "Jordan 4", "Jordan 5", "Jordan 6",
    "Jordan 7", "Jordan 8", "Jordan 9", "Jordan 10", "Jordan 11", "Jordan 12",
    "Jordan 13", "Jordan 14", "Jordan 15", "Jordan 1 Low", "Other"
  ],
  "Converse": ["Chuck 1970s", "Other"],
  "Asics": ["Gel-1130", "Gel-NYC", "Gel-Kayano", "Other"],
  "Adidas": [
    "Samba", "Handball", "Campus", "Gazelle", "Taekwondo", "SL 72", "Superstar",
    "Adizero", "Fear of God", "AE 1", "Harden", "Forum", "Stan Smith", "NMD",
    "Ultra Boost", "Tobacco", "Country", "Bermuda", "Italia SPZL", "SL83 SPZL",
    "Response CL", "Human Race", "Ozweego", "Manchester", "Wimberly SPZL",
    "Helvellyn SPZL", "adiFOM", "D.O.N.", "Dame", "Mad liinfinity", "XLG Runner",
    "Orketro Bape", "Palos Hills", "Radlander", "Nite Jogger", "Iniki", "EQT",
    "Ivy Park", "Raf Simons", "Basketball", "Running", "Skateboarding", "Soccer",
    "Other"
  ]
};

let formData = {
  images: [],
  productDetails: {},
  additionalComments: '',
  tierSelection: ''
}

function rebuildUploadCards(category) {
  const currentListing = [category].angles.map(angle => ({
    ...angle,
    status: "not-uploaded",
    file: null
  }))

  return currentListing;
}

function renderUploadCards(arrayOfAngles) {
  arrayOfAngles.forEach((index, angles) => {
    const div = document.createElement('div');
    div.classList.add('image-item');
    div.dataset.dataIndex = index;
    div.innerHTML = `
      <input
        data-index="0"
        type="file"
        id="mainImage"
        name="mainImage"
        accept="image/png, image/jpeg"
        class="file-input"
        required
        aria-required="true"
        aria-describedby="mainImageHelp"
      />
      <label for="mainImage" class="file-label">
        <div class="preview-container">
          <i class="fas fa-plus upload-icon"></i>
          <span class="upload-text"> Upload Main Image </span>
          <img
            src=""
            alt="Preview"
            class="image-preview"
            style="display: none"
          />
        </div>
      </label>

      <button
        class="remove-image-btn"
        style="display: none"
        aria-label="Remove image"
      >
        <i class="fas fa-trash-alt" aria-hidden="true"></i>
      </button>
    `

  })
}

// Draft persistence -- sessionStorage (not localStorage) because this
// should survive a refresh but not linger after the tab is closed.
const DRAFT_STORAGE_KEY = 'h2t_auth_draft';

imageInputs.forEach((input) => {
  const imageItem = input.closest(".image-item");
  const removeImageBtn = imageItem.querySelector(".remove-image-btn");
  const previewContainer = imageItem.querySelector(".preview-container");
  const imagePreview = imageItem.querySelector(".image-preview");
  const uploadIcon = imageItem.querySelector(".upload-icon");
  const uploadText = imageItem.querySelector(".upload-text");

  // Handle file selection
  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    const slotIndex = parseInt(e.target.dataset.index);

    if (file) {
      // Validate file type
      if (file.size > 5 * 1024 * 1024) {
        alert("File too large");
        input.value = "";
        return;
      }

      if (!["image/jpeg", "image/png"].includes(file.type)) {
        alert("Invalid file type. Please upload a JPEG or PNG image.");
        input.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        // Find the parent image-item and update its background
        imagePreview.src = e.target.result;
        imagePreview.style.display = "block";

        // Hide upload elements
        uploadIcon.style.display = "none";
        if (uploadText) {
          uploadText.style.display = "none";
        }

        reviewImages[slotIndex].src = e.target.result;

        // Show remove button
        removeImageBtn.style.display = "block";
      };
      reader.readAsDataURL(file);
    }
  });

  // Remove background Image
  removeImageBtn.addEventListener("click", (e) => {
    e.preventDefault();

    // Reset the file input
    input.value = "";

    // Reset the preview
    imagePreview.src = "";
    imagePreview.style.display = "none";

    // Show upload elements again
    uploadIcon.style.display = "block";

    if (uploadText) {
      uploadText.style.display = "block";
    }
    

    // Hide remove button
    removeImageBtn.style.display = "none";
  });

  
});

// Bags & Leather Goods only: Hermès models are a closed, well-known list, so
// swap the free-text Model input for a constrained dropdown when Hermès is
// selected -- every other brand keeps free text since there's no equivalent
// closed list for them. Both elements share the name="model" attribute, but
// only one at a time carries id="bags-model" so collectProductData/
// validateForm's generic getElementById(rule.id) lookup keeps working
// unmodified regardless of which variant is showing.
function initBagsBrandModelToggle() {
  const brandSelect = document.getElementById('bags-brand');
  const modelText = document.getElementById('bags-model');
  const modelHermes = document.getElementById('bags-model-hermes');
  if (!brandSelect || !modelText || !modelHermes) return;

  const syncModelField = () => {
    const isHermes = brandSelect.value === 'Hermès';

    if (isHermes) {
      modelText.style.display = 'none';
      modelText.removeAttribute('id');
      modelHermes.style.display = '';
      modelHermes.id = 'bags-model';
    } else {
      modelHermes.style.display = 'none';
      modelHermes.removeAttribute('id');
      modelText.style.display = '';
      modelText.id = 'bags-model';
    }
  };

  brandSelect.addEventListener('change', syncModelField);
  syncModelField();
}

// Luxury Shoes only: Jordan and Nike each have their own closed list of
// eligible collab styles (see LUXURY_SHOES_MODELS_BY_BRAND above) -- every
// other brand in this category keeps free-text Model, same reasoning as
// Hermès in Bags. Unlike the Bags toggle, the dropdown's options are rebuilt
// per-brand here since two different brands each need their own list rather
// than one fixed list.
function initLuxuryShoesBrandModelToggle() {
  const brandSelect = document.getElementById('luxury-shoes-brand');
  const modelText = document.getElementById('luxury-shoes-model');
  const modelSelect = document.getElementById('luxury-shoes-model-select');
  if (!brandSelect || !modelText || !modelSelect) return;

  const syncModelField = () => {
    const models = LUXURY_SHOES_MODELS_BY_BRAND[brandSelect.value];

    if (models) {
      modelSelect.innerHTML = '<option value="">Select model...</option>' +
        models.map(model => `<option value="${model}">${model}</option>`).join('');

      modelText.style.display = 'none';
      modelText.removeAttribute('id');
      modelSelect.style.display = '';
      modelSelect.id = 'luxury-shoes-model';
    } else {
      modelSelect.style.display = 'none';
      modelSelect.removeAttribute('id');
      modelText.style.display = '';
      modelText.id = 'luxury-shoes-model';
    }
  };

  brandSelect.addEventListener('change', syncModelField);
  syncModelField();
}

// Sneakers' brand field is a custom searchable button-picker rather than a
// native <select> (matches the Figma "Frame 10" mockup). Single step only --
// Model is a separate standalone picker below it (initSneakerModelPicker),
// not a drill-down within this widget. Whichever brand is clicked is
// written into the #sneaker-brand hidden input, so collectProductData/
// validateForm/draft save-restore all keep working unmodified via their
// existing getElementById('sneaker-brand') lookup.
function initSneakerBrandPicker() {
  const searchInput = document.getElementById('sneaker-brand-search');
  const optionList = document.getElementById('sneaker-brand-options');
  const hiddenInput = document.getElementById('sneaker-brand');
  if (!searchInput || !optionList || !hiddenInput) return;

  function renderOptions(names, selectedValue) {
    optionList.innerHTML = names.map(name => `
      <button type="button" class="brand-option${name === selectedValue ? ' selected' : ''}" data-value="${name}">
        ${name}
      </button>
    `).join('') || `<p class="brand-option-empty">No matches found.</p>`;
  }

  // Does NOT dispatch 'change' -- only an external set (draft restore) needs
  // the resync listener below to run. Having every in-widget click dispatch
  // 'change' too would just trigger that same listener, which calls back
  // into selectValue() -- a self-triggering loop for no reason, since the
  // visuals are already updated right here.
  //
  // Does dispatch a *custom* 'sneaker-brand-selected' event -- this is what
  // initSneakerModelPicker() listens for to know which brand's model list
  // to show.
  function selectValue(value) {
    hiddenInput.value = value;

    [...optionList.children].forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.value === value);
    });

    hiddenInput.dispatchEvent(new CustomEvent('sneaker-brand-selected', { bubbles: true, detail: { brand: value } }));
  }

  optionList.addEventListener('click', (e) => {
    const btn = e.target.closest('.brand-option');
    if (!btn) return;
    selectValue(btn.dataset.value);
  });

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    renderOptions(SNEAKER_BRANDS.filter(name => name.toLowerCase().includes(query)), hiddenInput.value);
  });

  // Draft restore sets #sneaker-brand's value directly and dispatches
  // 'change' (see restoreDraftState) -- resync the visible picker so the
  // right button shows as selected instead of silently drifting out of
  // sync with the hidden input.
  hiddenInput.addEventListener('change', () => {
    if (hiddenInput.value) selectValue(hiddenInput.value);
  });

  // Bakes hiddenInput's current value (empty at this point -- formLocator
  // just injected fresh HTML) into the initial render's selected state.
  renderOptions(SNEAKER_BRANDS, hiddenInput.value);
}

// Standalone second picker for Sneakers' Model, same button+search widget
// as the brand picker but not a drill-down within it -- Brand stays captured
// in #sneaker-brand no matter what's picked here. Its option list is
// SNEAKER_MODELS_BY_BRAND[currently selected brand], refreshed whenever the
// brand picker fires 'sneaker-brand-selected' (live user pick) or
// #sneaker-brand fires a plain 'change' (draft restore). Empty for every
// brand today -- renders the "No matches found" empty state until per-brand
// model lists are added there.
function initSneakerModelPicker() {
  const fieldWrapper = document.getElementById('sneaker-model-field');
  const searchInput = document.getElementById('sneaker-model-search');
  const optionList = document.getElementById('sneaker-model-options');
  const hiddenInput = document.getElementById('sneaker-model');
  const brandHiddenInput = document.getElementById('sneaker-brand');
  if (!fieldWrapper || !searchInput || !optionList || !hiddenInput || !brandHiddenInput) return;

  function currentModels() {
    return SNEAKER_MODELS_BY_BRAND[brandHiddenInput.value] || [];
  }

  function renderOptions(names, selectedValue) {
    optionList.innerHTML = names.map(name => `
      <button type="button" class="brand-option${name === selectedValue ? ' selected' : ''}" data-value="${name}">
        ${name}
      </button>
    `).join('') || `<p class="brand-option-empty">No matches found.</p>`;
  }

  function selectValue(value) {
    hiddenInput.value = value;

    [...optionList.children].forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.value === value);
    });
  }

  // A brand change invalidates whatever model was picked for the previous
  // brand -- clears the field rather than leaving a stale model attached to
  // a different brand. Also shows/hides the whole field (not just an empty
  // option list) depending on whether this brand has any models at all,
  // via the CSS transition on .model-field-hidden.
  function refreshForNewBrand() {
    hiddenInput.value = '';
    searchInput.value = '';

    const models = currentModels();
    renderOptions(models, '');
    fieldWrapper.classList.toggle('model-field-hidden', models.length === 0);
  }

  optionList.addEventListener('click', (e) => {
    const btn = e.target.closest('.brand-option');
    if (!btn) return;
    selectValue(btn.dataset.value);
  });

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    renderOptions(currentModels().filter(name => name.toLowerCase().includes(query)), hiddenInput.value);
  });

  brandHiddenInput.addEventListener('sneaker-brand-selected', refreshForNewBrand);
  brandHiddenInput.addEventListener('change', refreshForNewBrand);

  // Draft restore sets #sneaker-model directly and dispatches 'change' after
  // #sneaker-brand's own restore already ran refreshForNewBrand() above --
  // resync the visible selection now that the correct brand's options exist.
  hiddenInput.addEventListener('change', () => {
    if (hiddenInput.value) selectValue(hiddenInput.value);
  });

  refreshForNewBrand();
}

categories.addEventListener('change', (e) => {
  const target = e.target.value;
  categorySelected = target;
  
  // get form
  formLocator(categorySelected);


})

authSubmitBtn.addEventListener('click', handleAddToCartSubmission);
payNowBtn.addEventListener('click', handlePayNowSubmission);

addAnotherItemBtn.addEventListener('click', () => {
  // reset step
  currentStep = 1;
  showStep(currentStep);
  clearDraftState();
  // reset form data
  formData = {
    images: [],
    productDetails: {},
    additionalComments: '',
    tierSelection: null
  };

  resetImages();

  categories.value = "";
  categorySelected = null;

  if (dynamicFormContainer) {
    dynamicFormContainer.innerHTML = "";
  }

  tierContainers.forEach(tier => {
    tier.classList.remove('selected');
  });

  clearValidationErrors();

  updateProgressBar(1);

  cartModal.style.display = "none";

  const root = document.documentElement;
  root.style.setProperty('--progress-percentage', '20%');

});

viewCartBtn.addEventListener('click', () => {
  // go to cart
  window.location.href = '/cart';
})

cartModal.addEventListener('click', (event) => {
  console.log("clicked:",event.target)
  if (event.target !== cartModal) {
    cartModal.style.display = "none";
  }
})

tierContainers.forEach(tier => {
  tier.addEventListener('click', () => {
    if (tier.classList.contains('disabled-tier')) return;

    tierContainers.forEach(t => {
      t.classList.remove('selected');
    })

    tier.classList.add('selected');
    formData.tierSelection = gatherTierInformation();
    saveDraftState();
  })
})

// Fields are injected dynamically via formLocator(), so listen on the
// container rather than on individual inputs that don't exist yet.
dynamicFormContainer.addEventListener('input', () => {
  saveDraftState();
});

const editButtons = {
  images: {
    selector:'.review-images .review-edit',
    step: 3
  },
  details: {
    selector:'.review-details .review-edit',
    step: 2
  }
};

Object.entries(editButtons).forEach(([name, config]) => {
  const button = document.querySelector(config.selector);

  if (button) {
    button.addEventListener('click', () => {
      currentStep = config.step;
      showStep(currentStep);
      saveDraftState();
    });
    console.log(`${name} edit button found`);
  } else {
    console.error(`${name} edit button not found: ${config.selector}`);
  }
})

function clearValidationErrors() {
  const imageErrorsContainer = document.querySelector(".image-section-errors");
  if  (imageErrorsContainer) {
    imageErrorsContainer.innerHTML = "";
  }

  const validationErrors = document.querySelector(".validation-errors");
  if (validationErrors) {
    validationErrors.innerHTML = "";
  }

  document.querySelectorAll(".error").forEach(el => {
    el.classList.remove("error");
  });
}

function resetImages() {
  imageInputs.forEach((input, index) => {
    input.value = "";

    const imageItem = input.closest(".image-item");
    const imagePreview = imageItem.querySelector(".image-preview");
    const uploadIcon = imageItem.querySelector(".upload-icon");
    const uploadText = imageItem.querySelector(".upload-text");
    const removeImageBtn = imageItem.querySelector(".remove-image-btn");

    if (imagePreview) {
      imagePreview.src = "";
      imagePreview.style.display = "none";
    }

    if (uploadIcon) {
      uploadIcon.style.display = "block";
    }

    if (uploadText) {
      uploadText.style.display = "block";
    }

    if (removeImageBtn) {
      removeImageBtn.style.display = "none";
    }

    if (reviewImages[index]) {
      reviewImages[index].src = "";
    }
  })

  console.log("✅ All image reset");
}

function collectDraftFieldValues() {
  if (!categorySelected) return {};

  const rules = validationRules[categorySelected] || [];
  const values = {};

  rules.forEach(rule => {
    const element = document.getElementById(rule.id);
    if (element) values[rule.id] = element.value;
  });

  return values;
}

function saveDraftState() {
  const draft = {
    step: currentStep,
    category: categorySelected || null,
    additionalComments: document.getElementById('photo-additionalComments')?.value || '',
    tierSelection: formData.tierSelection || null,
    fieldValues: collectDraftFieldValues()
  };

  try {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    // Quota exceeded or storage disabled (private browsing) -- losing the
    // draft isn't worth breaking the form over.
    console.warn('Could not save authentication draft:', error);
  }
}

function clearDraftState() {
  sessionStorage.removeItem(DRAFT_STORAGE_KEY);
}

async function restoreDraftState() {
  let draft;

  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return;
    draft = JSON.parse(raw);
  } catch (error) {
    console.warn('Could not read saved authentication draft:', error);
    return;
  }

  if (draft.category && forms[draft.category]) {
    categories.value = draft.category;
    categorySelected = draft.category;
    await formLocator(categorySelected);

    Object.entries(draft.fieldValues || {}).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (!element) return;

      element.value = value;
      // Same reasoning as fillFormFieldsFromListing -- setting .value
      // directly doesn't fire 'change', which the sneaker brand-picker
      // relies on to resync its visible selected button after a restore.
      element.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Restoring the DOM fields isn't enough -- formData.productDetails is
    // only ever set inside validateStep(2), which a restored draft may skip
    // (currentStep is capped at 3 below). Rebuild it here so a refresh past
    // step 2 doesn't submit with an undefined productCategory.
    formData.productDetails = collectProductData(categorySelected);
  }

  if (draft.additionalComments) {
    const commentsField = document.getElementById('photo-additionalComments');
    if (commentsField) commentsField.value = draft.additionalComments;
    formData.additionalComments = draft.additionalComments;
  }

  if (draft.tierSelection) {
    formData.tierSelection = draft.tierSelection;

    const matchingTier = Array.from(tierContainers).find(tier => {
      const typeEl = tier.querySelector('[data-tier-type]');
      return typeEl && typeEl.textContent.trim() === draft.tierSelection.type;
    });

    if (matchingTier) matchingTier.classList.add('selected');
  }

  // Uploaded images are data URLs -- too large to round-trip through
  // sessionStorage reliably, so they're never persisted (see
  // saveDraftState). If the saved step was past the upload step, land
  // back on step 3 to re-add images rather than opening the review step
  // with no images in it.
  currentStep = Math.min(draft.step || 1, 3);
}

function prevStep() {
  if (currentStep > 1) {
    currentStep--;
    showStep(currentStep);
    updateProgressBar(currentStep);
    saveDraftState();
  }
}

function nextStep() {
  currentStep++;
  showStep(currentStep);
  updateProgressBar(currentStep);
  saveDraftState();
}

function showStep(stepNumber) {
  // hide all steps
  formSteps.forEach((step) => {
    step.style.display = "none";
  });

  // gets the id of the of the step number and shows that step
  document.getElementById(`step${stepNumber}`).style.display = "block";

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

  updateProgressSteps(stepNumber);
}

function updateProgressBar(currentStep) {

  const root = document.documentElement;

  let progressPercentage;
  
  if (currentStep === 1) {
     progressPercentage = '30%'
  } else if (currentStep === 2) {
    progressPercentage = '50%'
  } else if (currentStep === 3) {
    progressPercentage = '75%'
  } else if (currentStep === 4) {
    progressPercentage = '100%'
  }

  root.style.setProperty('--progress-percentage', progressPercentage); 
}

function updateProgressSteps(currentStep) {
  const steps = document.querySelectorAll(".progress-steps .step");

  steps.forEach((step, index) => {
    if (index + 1 < currentStep) {
      // Completed steps
      step.classList.remove("active");
      step.classList.add("completed");
    } else if (index + 1 === currentStep) {
      // Current step
      step.classList.remove("active");
      step.classList.add("completed");
    } else {
      // Future steps
      step.classList.remove("active", "completed");
    }
  });
}

function collectProductData(category) {
  const rules = validationRules[category.trim()];
  
  if(!rules) {
    console.error(`Unknown category: ${category}`)
  }

  const productData = {
    productCategory: category,
    details: {}
  };

  rules.forEach(rule => {

    const element = document.getElementById(rule.id);

      if (!element) {
        console.log(`${element} not found!`);
        return;
      }

      let value = element.value.trim();

      if(value && rule.type === 'number') {
        value = Number(element.value);
      } else if (value && rule.type === 'textarea') {
        value = element.value.trim();
      } else {
        value = element.value.trim() || null;
      }

      if(value !== '' && value !== null) {
        productData.details[rule.name] = value;
      }     
  });

  return productData;
}

function collectImageData() {
  const images = document.querySelectorAll('.image-preview');
  const imageData = [];

  images.forEach((img, index) => {
    const src = img.getAttribute('src');
    if (src && src.trim() !== '') {
      imageData.push({
        index: index,
        url:src,
        isPrimary:index === 0
      });
    }
  });

  return imageData;
}

function validateForm(form) {
    const validationErrors = document.querySelector('.validation-errors');
    const rules = validationRules[form.trim()];

    const errors = [];

    rules.forEach(rule => {
      const element = document.getElementById(rule.id);

      if (!element) {
        console.log('No element found!');
      }

      const value = element.value.trim();

      // required can be a plain boolean or a function -- the latter lets a
      // field's required-ness depend on other form state, e.g. Sneakers'
      // Model field only being required when the selected brand actually
      // has a closed model list to pick from.
      const isRequired = typeof rule.required === 'function' ? rule.required() : rule.required;

      if(!value && isRequired) {
        errors.push(`${rule.name} is required`);
        element.classList.add('error');
        return;
      }

      if (rule.type === 'number' && value && isNaN(value)) {
        errors.push(`${rule.name} is must a number`);
        element.classList.add('error');
        return;
      }

      element.classList.remove('error');

    })

    if (errors.length > 0) {
      if (validationErrors) {
        validationErrors.innerHTML = `
      <div class="error-message">
        <h4>
          <i class="fa-solid fa-circle-exclamation"></i>
          Please fix the following errors 
         </h4>
        <ul>
          ${errors.map(error => `<li>${error}</li>`).join('')}
        </ul>
      </div>
      `;

      validationErrors.scrollIntoView({behavior: 'smooth', block: 'center'});

      } else {
        alert(errors.join('\n'));
      }
    
      return false;
    }

    // if no errors clear any current errors
    if (validationErrors) {
      validationErrors.innerHTML = '';
    }
    return true;  
}

function validateStep(stepNumber) {
  if (stepNumber === 1) {
    const selectedTier = document.querySelector('.tier-container.selected');
    if (!selectedTier) {
      showNotification('Please select a tier','error');
      return false;
    }
    formData.tierSelection = gatherTierInformation();

    return true;

  } else if (stepNumber === 3) {

    const imgErrorsContainer = document.querySelector('.image-section-errors');
    const images = document.querySelectorAll('.image-preview');
    const REQUIRED_IMAGES = 5;

    let uploadedImages = 0;
    let emptyIndexes = [];
    
    images.forEach((img, index) => {
      const src = img.getAttribute('src');
      if (src && src.trim() !== '') {
        uploadedImages++;
      } else {
        emptyIndexes.push(index + 1);
      }
    });

    if (uploadedImages < REQUIRED_IMAGES) {
      
      if (imgErrorsContainer) {

        imgErrorsContainer.innerHTML = `
          <div class="error-message u-d-flex">
            <i class="fa-solid fa-circle-exclamation"></i>
            <h4>Please upload ${REQUIRED_IMAGES} images, currently uploaded ${uploadedImages}</h4>
          </div>
        `

        imgErrorsContainer.scrollIntoView({behavior: 'smooth', block: 'center'})
      } else {

        alert(`Please upload ${REQUIRED_IMAGES} images, currently uploaded ${uploadedImages}`);

      }

      return false;

    } else {

      formData.images = collectImageData();
      formData.additionalComments = document.getElementById('photo-additionalComments')?.value.trim() || '';
      imgErrorsContainer.innerHTML = '';
      return true;
    }

  } else if (stepNumber === 2) {
    if (!categorySelected) {
      showNotification('Please select a category', 'error')
    }

    if (!validateForm(categorySelected)) {
      return false;
    }

    formData.productDetails = collectProductData(categorySelected);
    displayReviewData(formData);

    return true;
  } else if (stepNumber === 4) {
    const terms1 = document.getElementById('terms1');
    const terms2 = document.getElementById('terms2');

    if (!terms1?.checked || !terms2?.checked) {
      showNotification('Please confirm both checkboxes before submitting', 'error');
      return false;
    }

    return true;
  }
}

// Shared by both submission paths: uploads images and creates the
// authenticationRequests doc. AI matching is *not* triggered here anymore --
// it now fires from the Stripe webhook once payment is confirmed, so it
// actually matches what the terms2 checkbox tells the user ("the
// authentication process will begin once payment is confirmed").
async function createAuthenticationRequest() {
  authSubmitBtn.disabled = true;
  payNowBtn.disabled = true;

  console.log("Submitting authentication request with data:", formData);

  const result = await submitToFirebase();

  if (!result.success) {
    throw new Error("Failed to upload images");
  }

  console.log("✅ Images uploaded successfully!");

  const authRequestData = {
    images: result.images || null,
    requestId: result.requestId || null,
    productDetails: formData.productDetails || null,
    tierSelection: formData.tierSelection || null,
  };

  return { requestId: result.requestId, authRequestData };
}

async function handleAddToCartSubmission() {
  if (!validateStep(4)) {
    return;
  }

  authSubmitBtn.textContent = "Uploading images...";

  try {
    const { requestId, authRequestData } = await createAuthenticationRequest();

    authSubmitBtn.textContent = "Adding to cart...";

    const cartResult = await addToCart(authRequestData, currentUser, 'authentication');
    console.log("cart results: ", cartResult.success);

    if (!cartResult.success) {
      await deleteFirebaseRequest(requestId);
      throw new Error("Failed to add item to cart");
    }

    console.log("✅ Added item to cart!");
    authSubmitBtn.textContent = "Success!";
    clearDraftState();

    const cartCount = await getUserCartCount(currentUser);
    updateCartCount(cartCount);

    cartModal.classList.add("show");
    cartItemCount.textContent = cartCount;

    showNotification("Item successfully added!", "success");
  }
  catch (error) {
    console.error("❌ Submission failed!", error);

    showNotification(error.message || "Something went wrong. Please try again.", "error");

    cartModal.classList.remove("show");
  }

  setTimeout(() => {
    authSubmitBtn.innerHTML = `<i class="fa-solid fa-cart-plus"></i> Add to Bag`;
    authSubmitBtn.disabled = false;
    payNowBtn.disabled = false;
    },
  3000);
}

async function handlePayNowSubmission() {
  if (!validateStep(4)) {
    return;
  }

  payNowBtn.textContent = "Uploading images...";

  try {
    const { requestId, authRequestData } = await createAuthenticationRequest();

    // Skip the cart entirely -- stash the same item shape addToCart()
    // would have stored, then hand off to checkout.js the same way
    // cart.js's per-item Checkout button does for a product listing.
    const cartItem = createAuthCartItem(authRequestData);
    sessionStorage.setItem('item', JSON.stringify(cartItem));

    clearDraftState();

    window.location.href = `/checkout?authRequestId=${requestId}`;
  }
  catch (error) {
    console.error("❌ Submission failed!", error);

    showNotification(error.message || "Something went wrong. Please try again.", "error");

    payNowBtn.innerHTML = `<i class="fa-solid fa-credit-card"></i> Pay Now`;
    payNowBtn.disabled = false;
    authSubmitBtn.disabled = false;
  }
}

function displayReviewData(data) {
  const reviewDetailsContainer = document.querySelector('.prod-details');
  reviewDetailsContainer.innerHTML = '';
  reviewDetailsContainer.innerHTML = `
    <div class="item-details">
      ${Object.entries(data.productDetails.details).map(([key,value]) => `
        <div class="detail-row">
          <div class="item-label">${key}</div>
          <div class="item-value">${value}</div>
        </div>
        `
        ).join('')}
    </div>
  `
  reviewTier.innerHTML = createReviewTierHTML(data.tierSelection);

  
}

function formLocator(category) {
  if (!dynamicFormContainer) {
    return Promise.resolve();
  }

  dynamicFormContainer.innerHTML = `<p>Loading...</p>`;

  const form = forms[category];

  if (!form) {
    dynamicFormContainer.innerHTML = '';
    return Promise.resolve();
  }

  return fetch(form)
    .then(res => {
      if (!res.ok) {
        return null;
      }
      return res.text();
    })
    .then(html => {
      dynamicFormContainer.innerHTML = html;
      if (category === 'Bags & Leather Goods') {
        initBagsBrandModelToggle();
      } else if (category === 'Luxury Shoes') {
        initLuxuryShoesBrandModelToggle();
      } else if (category === 'Sneakers') {
        initSneakerBrandPicker();
        initSneakerModelPicker();
      }
    })
    .catch(err => {
      dynamicFormContainer.innerHTML = "Internal Error";
      console.error("Error", err);
    });
}

function createReviewTierHTML(tierData) {
  return `
  <div class="review-header">
    <h3>Authentication Tier</h3>
    <div class="review-edit">
      <i class="fa-solid fa-pen"></i>
      <p>Edit</p>
    </div>
  </div>
  <div class="tier-summary">
    <div class="review-tier-selected">
      <div class="review-tier-icon">
        ${tierData.icon}
      </div>
      <div class="tier-type">
        <h4>${tierData.type}</h4>
        <p>${tierData.duration}</p>
      </div>
    </div>
    
    <div class="tier-cost">
      <span>$${tierData.cost.toFixed(2)}</span>
    </div>
  </div>         
`;
}

function gatherTierInformation() {
  // gather info
  const selectedTier = document.querySelector('.tier-container.selected');
  const tierType = selectedTier.querySelector('[data-tier-type]');
  const tierDuration = selectedTier.querySelector('[data-tier-duration]');
  const tierCost = selectedTier.querySelector('[data-tier-cost]');
  const tierIcon = selectedTier.querySelector('[data-tier-icon]');
  
  // store info
  formData.tierSelection = {
    type: tierType ? tierType.textContent.trim() : 'N/A',
    duration: tierDuration ? tierDuration.textContent.trim() : 'N/A',
    cost: tierCost ? parseFloat(tierCost.textContent.replace(/[^0-9.]/g, '')) || 0 : 0,
    icon: tierIcon ? tierIcon.innerHTML.trim() : "N/A"
  };

  return formData.tierSelection;
  
}

function showNotification(message, type) {
  const div = document.createElement('div');
  div.className = `notification notification--${type}`;
  div.textContent = message;

  document.body.appendChild(div);

  setTimeout(() => div.classList.add('show'), 10)
  setTimeout(() => div.classList.remove('show'), 3000)
}

async function uploadImagesToFirebase(images, userId, requestId) {
  const uploadPromises = images.map(async (img, index) => {
    try {
      const imagePath = `authenticationRequests/${userId}/${requestId}/image_${index}_${Date.now()}.jpg`;
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

async function deleteFirebaseRequest(requestId) {
  // get request ref
  try {
    const docRef = doc(db, "authenticationRequests", requestId);

    await deleteDoc(docRef);
    
    console.log("✅ Document successfully deleted!");
    return true;
    
  } catch (error) {
    console.error("❌ Error removing document: ", error);
    throw error;
  }
}

async function submitToFirebase() {
  try {
    const user = currentUser;

    if (!user) {
      console.log("❌ User must be login");
      window.location.href = "/login";
      return { success: false, ref: null, errorMsg: "You must be logged in to submit an authentication request." };
    }

    const tempRequestId = `temp+${Date.now()}`;

    console.log("📤 Uploading images to Storage...");
    const uploadedImages = await uploadImagesToFirebase(formData.images, user.userId, tempRequestId);
    console.log("✅ All images uploaded!")

    const authRequestData = {
      images: uploadedImages,
      price: formData.tierSelection.cost,

      productDetails: {
        category: formData.productDetails.productCategory,
        details: formData.productDetails.details
      },

      additionalComments: formData.additionalComments || '',

      tierSelection: {
        type: formData.tierSelection.type,
        duration: formData.tierSelection.duration,
        cost: formData.tierSelection.cost
      },

      // Transitional status -- the AI matching step (not yet built) is
      // responsible for advancing this to "pending_review" (confident
      // match found) or "needs_manual_review" (no match cleared the
      // threshold), per the planning doc's status table. "submitted" is
      // the honest interim state between form submission and that
      // pipeline actually running.
      // Full enum: submitted | pending_review | needs_manual_review |
      // needs_info | approved | rejected
      status: "submitted",
      userId: user.userId,

      createdAt: serverTimestamp(),
      updateAt: serverTimestamp()
    }

    console.log("auth Data:",authRequestData);

    const docRef = await addDoc(collection(db, "authenticationRequests"),
      authRequestData
    );

    console.log("✅ Document created with id: ", docRef.id);

    // Best-effort admin alert -- isolated from the submission try/catch so a
    // Resend/network failure never surfaces as a submission error to a user
    // whose request was actually queued fine.
    try {
      const idToken = await auth.currentUser.getIdToken();
      await fetch("/send/admin-notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          notificationType: "AUTH_REQUEST_QUEUED",
          metadata: {
            itemLabel: authRequestData.productDetails.details || authRequestData.productDetails.category,
            requestId: docRef.id
          }
        })
      });
    } catch (error) {
      console.error("Error sending admin notification for auth request:", error);
    }

    return { success: true, requestId: docRef.id, images: uploadedImages }
    
  } 
  catch (error) {

    console.log("❌ Error storing auth Request", error);

    return { success: false, ref: null, errorMsg: error.message }

  }
}

await restoreDraftState();
showStep(currentStep);
updateProgressBar(currentStep);

window.addEventListener('beforeunload', saveDraftState);

nextBtn.forEach((btn) => {
  btn.addEventListener("click", () => {
    if(!validateStep(currentStep)) {
      return;
    }
    nextStep();

  });
});
backBtn.forEach((btn) => {
  btn.addEventListener("click", prevStep);
});