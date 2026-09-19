import { getStorage, ref, uploadString, getDownloadURL, deleteDoc } from '../api/firebase-client.js';
import { db, doc, getDocs, query, where, auth } from '../api/firebase-client.js';
import { checkUserStatus } from '../auth/auth.js';
import { initCartDrawer } from '../components/cartDrawer.js';
import { getUserCartCount, updateCartCount } from '../commerce/cart.js';
import { addToCart, createAuthCartItem } from '../core/global.js';
import { ANGLE_REQUIREMENTS, getRequiredAngleCount } from '../core/angleRequirements.js';

const storage = getStorage();

initCartDrawer();

let currentUser = null;
currentUser = await checkUserStatus();

// auth form
const authSubmitBtn = document.getElementById('submitAuthBtn');
const payNowBtn = document.getElementById('payNowBtn');
// categories selection functionality
const categoryCards = document.querySelectorAll('.category-card');
const dynamicFormContainer = document.getElementById('dynamic-form-container');
let categorySelected;

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
        // Card name, year, card number, edition, condition/grade and grading
        // company are intentionally not collected -- the AI detects them from
        // the photos.
        {id: 'card-brand', name: 'Brand', required: true },

        // card-model is the Model picker's hidden input (the kind of product:
        // Graded Singles, Booster Box...). The field is only shown when the brand
        // has a curated model list and is required whenever it's showing -- see
        // initBrandModelToggle().
        {id: 'card-model', name: 'Model', required: () => document.getElementById('card-model-field')?.style.display !== 'none' },
      ],
      'Apparel':
      [
        // Item type, size, condition, color, material and style are intentionally
        // not collected -- the AI detects them from the photos.
        {id: 'apparel-brand', name: 'Brand', required: true },

        // apparel-model is the Model picker's hidden input. The field is only
        // shown once the server has a cached model list for the brand and is
        // required whenever it's showing -- see initBrandModelToggle().
        {id: 'apparel-model', name: 'Model', required: () => document.getElementById('apparel-model-field')?.style.display !== 'none' },
      ],
      'Sneakers':
      [
        {id: 'sneaker-brand', name: 'Brand', required: true },
        // Always optional -- "Skip selecting a model" lets the user move on
        // even when the selected brand has a closed model list.
        {id: 'sneaker-model', name: 'Model', required: false },
      ],
      'Bags & Leather Goods':
      [
        // Item type, size, color/material and condition are intentionally not
        // collected -- the AI detects them from the photos.
        {id: 'bags-brand', name: 'Brand', required: true },

        // bags-model is the Model picker's hidden input. The field is only
        // shown once a model list exists for the brand (Hermès: curated,
        // others: live from KicksDB) and is required whenever it's showing --
        // see initBrandModelToggle().
        {id: 'bags-model', name: 'Model', required: () => document.getElementById('bags-model-field')?.style.display !== 'none' },
      ],
      'Luxury Shoes':
      [
        // Size, color and condition are intentionally not collected -- the AI
        // detects them from the photos.
        {id: 'luxury-shoes-brand', name: 'Brand', required: true },

        // luxury-shoes-model is the Model picker's hidden input. The field is
        // only shown once a model list exists for the brand (Jordan/Nike:
        // curated, others: live from KicksDB) and is required whenever it's
        // showing -- see initBrandModelToggle().
        {id: 'luxury-shoes-model', name: 'Model', required: () => document.getElementById('luxury-shoes-model-field')?.style.display !== 'none' },
      ]
}

const forms = {
  "Apparel": "/authenticator/templates/apparel-form.html",
  "Sneakers": "/authenticator/templates/sneakers-form.html",
  "Trading Cards": "/authenticator/templates/trading-card-form.html",
  "Bags & Leather Goods": "/authenticator/templates/bags-form.html",
  "Luxury Shoes": "/authenticator/templates/luxury-shoes-form.html"
}

// Brand lists and curated model lists live in catalogData.json so the browser
// and the cache seed script (scripts/seedCatalogCache.js) read one source. If it
// can't be loaded the pickers just come up empty -- the rest of the flow works.
let catalogData = {
  sneakers: { brands: [], curated: {} },
  bags: { brands: [], curated: {} },
  'luxury-shoes': { brands: [], curated: {} },
  apparel: { brands: [], curated: {} },
  'trading-cards': { brands: [], curated: {} }
};
try {
  const response = await fetch(new URL('../core/catalogData.json', import.meta.url));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  // merged onto the defaults so a kind missing from an older cached copy is just empty
  catalogData = { ...catalogData, ...(await response.json()) };
} catch (error) {
  console.error('Could not load the brand/model lists:', error);
}

const SNEAKER_BRANDS = catalogData.sneakers.brands;
const SNEAKER_MODELS_BY_BRAND = catalogData.sneakers.curated;
const BAGS_BRANDS = catalogData.bags.brands;
const HERMES_MODELS = catalogData.bags.curated['Hermès'] || [];
const LUXURY_SHOES_BRANDS = catalogData['luxury-shoes'].brands;
const LUXURY_SHOES_MODELS_BY_BRAND = catalogData['luxury-shoes'].curated;
const APPAREL_BRANDS = catalogData.apparel.brands;
const TRADING_CARD_BRANDS = catalogData['trading-cards'].brands;
const TRADING_CARD_MODELS_BY_BRAND = catalogData['trading-cards'].curated;

// Brand logos come from Logo.dev, looked up by domain. This is Logo.dev's
// *publishable* key (pk_...), which is designed to ship in client code -- its
// secret keys are the ones that must never appear here.
//
// Domain, not company name: name lookup is fuzzy and returns the wrong company
// for ambiguous brands ("Jordan" -> a law firm, "Palace" -> "Mundo Palace").
// Every domain below was checked by eye. Brands left out get their letter
// avatar instead of a wrong logo:
//   - Jordan: every Jordan domain redirects to Nike's swoosh
//   - READYMADE: readymade.jp returns an unrelated logo
//   - GV Gallery, Saint Michael, Sp5der: no logo found
//   - Magic: The Gathering returns Wizards of the Coast's "W" (the publisher,
//     not the game) and Soccer would return FIFA (the governing body)
// The looser ones (Denim Tears, Travis Scott, Vale Forever) resolved but
// weren't confirmable, so eyeball them.
const LOGO_DEV_TOKEN = 'pk_UO6L-oMIRFCIgDxX6J5DQQ';
const BRAND_LOGO_DOMAINS = {
  "Adidas": "adidas.com", "Asics": "asics.com", "Converse": "converse.com",
  "Hoka": "hoka.com", "New Balance": "newbalance.com", "Nike": "nike.com",
  "On": "on.com", "Reebok": "reebok.com", "Salomon": "salomon.com",
  "Saucony": "saucony.com", "Vans": "vans.com", "Veja": "veja-store.com",
  "Chanel": "chanel.com", "Dior": "dior.com", "Goyard": "goyard.com",
  "Hermès": "hermes.com", "Balenciaga": "balenciaga.com",
  "Bottega Veneta": "bottegaveneta.com", "Burberry": "burberry.com",
  "Celine": "celine.com", "Chloé": "chloe.com",
  "Christian Louboutin": "christianlouboutin.com",
  "Dolce & Gabbana": "dolcegabbana.com", "D&G": "dolcegabbana.com",
  "D&G Beachwear": "dolcegabbana.com", "Fendi": "fendi.com",
  "Givenchy": "givenchy.com", "Gucci": "gucci.com", "Loewe": "loewe.com",
  "Louis Vuitton": "louisvuitton.com", "Prada": "prada.com",
  "Saint Laurent": "ysl.com", "Salvatore Ferragamo": "ferragamo.com",
  "Valentino": "valentino.com", "Miu Miu": "miumiu.com", "BAPE": "bape.com",
  "Coach": "coach.com", "Denim Tears": "denimtears.com",
  "Eric Emanuel": "ericemanuel.com", "Fear of God Essentials": "fearofgod.com",
  "Hellstar": "hellstar.com", "MCM": "mcmworldwide.com",
  "Off White": "off---white.com", "Off-White": "off---white.com",
  "Alexander McQueen": "alexandermcqueen.com", "Chrome Hearts": "chromehearts.com",
  "Canada Goose": "canadagoose.com", "Moncler": "moncler.com", "Skylrk": "skylrk.com",
  "Pokémon": "pokemon.com", "Yu-Gi-Oh!": "yugioh-card.com", "Baseball (MLB)": "mlb.com",
  "Basketball (NBA)": "nba.com", "Football (NFL)": "nfl.com",
  "Palace": "palaceskateboards.com",
  "Polo Ralph Lauren": "ralphlauren.com", "Stussy": "stussy.com",
  "Supreme": "supreme.com", "The North Face": "thenorthface.com",
  "Travis Scott": "travisscott.com", "Vale Forever": "valeforever.com"
};

// fallback=404 so a domain with no logo fails cleanly (the card keeps its
// letter avatar) instead of Logo.dev's default black-and-white monogram.
const logoDomainByBrand = new Map(
  Object.entries(BRAND_LOGO_DOMAINS).map(([brand, domain]) => [brand.toLowerCase(), domain])
);

function brandLogoUrl(brand) {
  // case-insensitive: the brand lists spell some differently ("Fear of God ESSENTIALS")
  const domain = logoDomainByBrand.get(brand.toLowerCase());
  return domain
    ? `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=128&format=png&fallback=404`
    : null;
}

let formData = {
  images: [],
  productDetails: {},
  additionalComments: '',
  tierSelection: ''
}

// Draft persistence -- sessionStorage (not localStorage) because this
// should survive a refresh but not linger after the tab is closed.
const DRAFT_STORAGE_KEY = 'h2t_auth_draft';

function imageSlotHTML(angle, index) {
  const isOptional = angle.type !== 'required';
  return `
    <div class="image-item${index === 0 ? ' main-image' : ''}" data-angle-id="${angle.id}">
      <input
        data-index="${index}"
        type="file"
        id="angleImage-${angle.id}"
        accept="image/png, image/jpeg"
        class="file-input"
        ${isOptional ? '' : 'required aria-required="true"'}
      />
      <label for="angleImage-${angle.id}" class="file-label">
        <div class="preview-container">
          <i class="fa-solid ${isOptional ? 'fa-plus' : 'fa-camera'} upload-icon"></i>
          <span class="upload-text">${angle.label}</span>
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
    </div>
  `;
}

// Rebuilds the image-upload slots (plus the matching step-4 review
// thumbnails and the "required photos" hint list) around whichever category
// was picked in step 2 -- required angle count varies a lot per category
// (Apparel needs 5, Sneakers needs 8), so this can't be a fixed static grid
// like it used to be.
function renderImageSlots(category) {
  const grid = document.getElementById('imageGrid');
  const subheader = document.getElementById('imageUploadSubheader');
  if (!grid) return;

  const angles = ANGLE_REQUIREMENTS[category];

  if (!angles) {
    grid.innerHTML = '';
    if (subheader) subheader.textContent = 'Select a category to see the required photos';
    renderReviewImageSlots(0);
    return;
  }

  const requiredCount = angles.filter(a => a.type === 'required').length;

  grid.innerHTML = angles.map((angle, index) => imageSlotHTML(angle, index)).join('');

  if (subheader) subheader.textContent = `Upload ${requiredCount} required photos for ${category}`;

  // Must run before wireImageInputs() -- the change listener writes into
  // reviewImages[slotIndex] by index, so the review thumbnails need to
  // already exist at the right count before any upload can happen.
  renderReviewImageSlots(angles.length);
  wireImageInputs();
}

function renderReviewImageSlots(count) {
  const reviewGrid = document.getElementById('reviewImageGrid');
  if (!reviewGrid) return;
  reviewGrid.innerHTML = Array.from({ length: count }, () => `<img class="review-image" src="" alt="" />`).join('');
}

// Attaches the file-select/remove listeners to whatever .file-input elements
// currently exist in #imageGrid -- called after every renderImageSlots(),
// since the previous category's slots (and their listeners) were just
// discarded along with the old innerHTML.
function wireImageInputs() {
  const imageInputs = document.querySelectorAll(".file-input");

  imageInputs.forEach((input) => {
    const imageItem = input.closest(".image-item");
    const removeImageBtn = imageItem.querySelector(".remove-image-btn");
    const imagePreview = imageItem.querySelector(".image-preview");
    const uploadIcon = imageItem.querySelector(".upload-icon");
    const uploadText = imageItem.querySelector(".upload-text");

    // Handle file selection
    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      const slotIndex = parseInt(e.target.dataset.index);
      const reviewImages = document.querySelectorAll('.review-image');

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

          if (reviewImages[slotIndex]) {
            reviewImages[slotIndex].src = e.target.result;
          }

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
}

// Model data comes from the server (GET /api/<kind>-models), which answers
// from a Firestore cache of KicksDB results -- the browser never triggers a
// KicksDB request itself (the free plan allows only 1,000 a month; see
// services/catalogModels.js). For a brand with no curated list the response
// IS the model list; for a curated brand it's a photo table for those names.
// Cached per kind+brand for the life of the page; a failed lookup is dropped
// from the cache so the next pick retries.
const MODEL_OTHER = 'Other';
const brandModelsCache = new Map();

// A curated model list has names but no photos. Pairs each name with its photo
// from the brand's cached photo table (one request for the whole brand); a name
// with no cached photo just keeps its letter avatar.
async function withPhotos(kind, brand, names) {
  const table = await fetchBrandModels(kind, brand);
  const photoFor = new Map(table.map(({ name, image }) => [name.toLowerCase(), image]));
  return names.map(name => ({ name, image: photoFor.get(name.toLowerCase()) }));
}

function fetchBrandModels(kind, brand) {
  const cacheKey = `${kind}:${brand}`;

  if (!brandModelsCache.has(cacheKey)) {
    const request = (async () => {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/${kind}-models?brand=${encodeURIComponent(brand)}`, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      if (!res.ok) throw new Error(`Model lookup failed (${res.status})`);
      return (await res.json()).data || [];
    })().catch(() => {
      brandModelsCache.delete(cacheKey);
      return [];
    });
    brandModelsCache.set(cacheKey, request);
  }
  return brandModelsCache.get(cacheKey);
}

// The brand -> model wiring shared by every category with brand and model
// screens. The Model field (a card picker) is filled per brand -- from `curated`
// when it has a list for that brand, otherwise from the server's cached list via
// fetchBrandModels(kind, brand) -- and only shown once a list exists. No list
// (nothing cached for the brand, or the lookup failed) means no Model field at
// all, and a Model field that is showing is required.
//
// - Curated lists get their photos from the server's cache (withPhotos) unless
//   `photos` is false. They are closed, so they get no "Other" card.
// - Live lists get an "Other" card so an item missing from a partial list
//   doesn't block the user.
// - A category with no `kind` has no live source (Trading Cards): a brand
//   without a curated list simply has no Model field.
//
// The picker's hidden input permanently owns its id so validateForm/
// collectProductData's generic getElementById(rule.id) lookup always finds an
// element. A model belongs to one brand, so any brand change clears it.
function initBrandModelToggle({ brandId, modelId, modelFieldId, modelPicker, kind, curated = {}, photos = true }) {
  const brandInput = document.getElementById(brandId);
  const modelField = document.getElementById(modelFieldId);
  const modelInput = document.getElementById(modelId);
  if (!brandInput || !modelField || !modelInput || !modelPicker) return;

  // Tells the Step 2 screen controller whether a model screen exists for this brand.
  const announce = (count) => modelField.dispatchEvent(
    new CustomEvent('models-ready', { bubbles: true, detail: { count } })
  );

  const syncModelField = async () => {
    const brand = brandInput.value;

    if (modelInput.value) {
      modelInput.value = '';
      // lets the model picker deselect its highlighted card
      modelInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    modelField.style.display = 'none';
    if (!brand) return;

    let models;
    if (curated[brand]) {
      models = photos ? await withPhotos(kind, brand, curated[brand]) : curated[brand];
      // the user may have picked another brand while this was loading -- that
      // newer run announces its own result
      if (brandInput.value !== brand) return;
    } else if (!kind) {
      return announce(0);
    } else {
      const derived = await fetchBrandModels(kind, brand);
      if (brandInput.value !== brand) return;
      if (derived.length === 0) return announce(0);
      models = [...derived, MODEL_OTHER];
    }

    modelPicker.setItems(models);
    modelField.style.display = '';
    announce(models.length);
  };

  brandInput.addEventListener('change', syncModelField);
  syncModelField();
}

// Puts a photo in a card's icon circle in place of its letter avatar. The
// URL is assigned as a DOM property (never spliced into an HTML string), so a
// value from an external API can't break out of an attribute.
function showCardPhoto(card, url) {
  const img = document.createElement('img');
  img.src = url;
  img.alt = '';
  img.loading = 'lazy';

  const icon = card.querySelector('.brand-option-icon');
  icon.classList.add('has-photo');
  icon.replaceChildren(img);
}

// Same idea for a brand's logo. The <img> goes in straight away (so the browser
// can lazy-load it), and if it fails to load -- Logo.dev answers 404 for a
// domain it has no logo for -- the letter avatar comes back.
function showCardLogo(card, url) {
  const icon = card.querySelector('.brand-option-icon');
  const letter = icon.textContent;

  const img = document.createElement('img');
  img.alt = '';
  img.loading = 'lazy';
  img.addEventListener('error', () => {
    icon.classList.remove('has-logo');
    icon.textContent = letter;
  });
  img.src = url;

  icon.classList.add('has-logo');
  icon.replaceChildren(img);
}

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, ch => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));

// Generic searchable brand card picker -- replaces a native brand <select>
// with the same icon-card grid Sneakers uses. The clicked brand is written
// to a hidden input that keeps the old select's id, so validateForm,
// collectProductData and draft save/restore keep reading `.value` unchanged.
//
// Unlike Sneakers' picker, a click dispatches a plain 'change' event on the
// hidden input, because other code (e.g. initBrandModelToggle) listens
// for 'change' on the brand element exactly as it did on the <select>. The
// listener below therefore only resyncs visuals (never re-dispatches) --
// otherwise click -> change -> listener -> change would loop forever. That
// same listener is what makes a draft restore (which sets .value and
// dispatches 'change') light up the right card.
//
// `brands` entries are plain names or { name, image } -- the latter (model
// lists from the server's cache) already know their photo. Names may come from
// an external API, so everything is HTML-escaped when rendered.
//
// Optional `logo: name => url | null` shows a brand logo on cards that have
// no photo (see showCardLogo); a null keeps the letter avatar.
//
// Returns { setItems(items) } so a caller can swap the whole list later (e.g.
// when the selected brand changes); undefined if the markup isn't present.
function initBrandCardPicker({ searchId, listId, hiddenId, brands, logo }) {
  const searchInput = document.getElementById(searchId);
  const optionList = document.getElementById(listId);
  const hiddenInput = document.getElementById(hiddenId);
  if (!searchInput || !optionList || !hiddenInput) return;

  const toItem = (entry) => (typeof entry === 'string' ? { name: entry } : entry);
  let items = brands.map(toItem);

  function renderOptions(list, selectedValue) {
    optionList.innerHTML = list.map(({ name }) => `
      <button type="button" class="brand-option${name === selectedValue ? ' selected' : ''}" data-value="${escapeHtml(name)}" aria-pressed="${name === selectedValue}">
        <span class="brand-option-icon">${escapeHtml(name.charAt(0).toUpperCase())}</span>
        <span class="brand-option-name">${escapeHtml(name)}</span>
        <span class="brand-option-check"><i class="fa-solid fa-check"></i></span>
      </button>
    `).join('') || `<p class="brand-option-empty">No matches found.</p>`;

    const cards = [...optionList.querySelectorAll('.brand-option')];
    list.forEach(({ name, image }, i) => {
      if (image) return showCardPhoto(cards[i], image);

      const logoUrl = logo?.(name);
      if (logoUrl) showCardLogo(cards[i], logoUrl);
    });
  }

  function syncSelected(value) {
    optionList.querySelectorAll('.brand-option').forEach(btn => {
      const isSelected = btn.dataset.value === value;
      btn.classList.toggle('selected', isSelected);
      btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });
  }

  optionList.addEventListener('click', (e) => {
    const btn = e.target.closest('.brand-option');
    if (!btn) return;

    hiddenInput.value = btn.dataset.value;
    syncSelected(hiddenInput.value);
    hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
  });

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    renderOptions(items.filter(({ name }) => name.toLowerCase().includes(query)), hiddenInput.value);
  });

  hiddenInput.addEventListener('change', () => syncSelected(hiddenInput.value));

  renderOptions(items, hiddenInput.value);

  return {
    setItems(newItems) {
      items = newItems.map(toItem);
      searchInput.value = '';
      renderOptions(items, hiddenInput.value);
    }
  };
}

// Standalone second picker for Sneakers' Model -- the shared card picker
// (initBrandCardPicker) with its list swapped whenever the brand changes:
// brands with a hand-curated SNEAKER_MODELS_BY_BRAND entry use it (photos added
// by withPhotos), every other brand gets the server's cached list via
// fetchBrandModels (plus an "Other" card, like the curated lists have). A brand
// with no list at all -- nothing cached, or the lookup failed -- hides the whole
// Model field. Model is
// always optional (validationRules['Sneakers']); the Skip button clears it.
//
// Brand stays captured in #sneaker-brand no matter what's picked here. The
// list refreshes whenever #sneaker-brand fires 'change' (a brand click, or a
// draft restore).
function initSneakerModelPicker() {
  const fieldWrapper = document.getElementById('sneaker-model-field');
  const searchInput = document.getElementById('sneaker-model-search');
  const hiddenInput = document.getElementById('sneaker-model');
  const brandHiddenInput = document.getElementById('sneaker-brand');
  const skipBtn = document.getElementById('sneaker-model-skip');
  if (!fieldWrapper || !searchInput || !hiddenInput || !brandHiddenInput) return;

  // Starts empty -- refreshForNewBrand fills it.
  const picker = initBrandCardPicker({
    searchId: 'sneaker-model-search',
    listId: 'sneaker-model-options',
    hiddenId: 'sneaker-model',
    brands: []
  });
  if (!picker) return;

  async function modelsForBrand(brand) {
    if (SNEAKER_MODELS_BY_BRAND[brand]) return withPhotos('sneaker', brand, SNEAKER_MODELS_BY_BRAND[brand]);

    const derived = await fetchBrandModels('sneaker', brand);
    return derived.length ? [...derived, 'Other'] : [];
  }

  // A brand change invalidates whatever model was picked for the previous
  // brand, so it clears first. The field stays hidden until the new list is
  // known (via the CSS transition on .model-field-hidden).
  async function refreshForNewBrand() {
    const brand = brandHiddenInput.value;

    if (hiddenInput.value) {
      hiddenInput.value = '';
      // lets the picker deselect its highlighted card
      hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    fieldWrapper.classList.add('model-field-hidden');
    if (!brand) return;

    const models = await modelsForBrand(brand);
    // the user may have picked another brand while a live list was loading
    if (brandHiddenInput.value !== brand) return;

    picker.setItems(models);
    fieldWrapper.classList.toggle('model-field-hidden', models.length === 0);
    // tells the Step 2 screen controller whether a model screen exists for this brand
    fieldWrapper.dispatchEvent(new CustomEvent('models-ready', { bubbles: true, detail: { count: models.length } }));
  }

  skipBtn?.addEventListener('click', () => {
    if (hiddenInput.value) {
      hiddenInput.value = '';
      hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    // re-render the full list in case a search had narrowed it
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
  });

  brandHiddenInput.addEventListener('change', refreshForNewBrand);

  refreshForNewBrand();
}

// ---- Step 2 detail screens: category -> brand -> model, one at a time ----
//
// The category grid is one screen; the injected template's sections marked
// data-screen="brand" / "model" are the others. Exactly one is visible at a
// time (via .screen-hidden), which leaves each section's own visibility rules
// alone -- e.g. the model field still hides itself when a brand has no models.
// Every hidden input (#sneaker-brand, #bags-model, ...) stays in the DOM the
// whole time, so validation, draft save/restore and collectProductData keep
// reading `.value` exactly as before.
const categoryScreen = document.getElementById('category-screen');
const detailsNav = document.getElementById('detailsNav');
const detailsBackBtn = document.getElementById('detailsBackBtn');
const detailsBreadcrumb = document.getElementById('detailsBreadcrumb');

// Hidden-input ids behind each category's brand/model pickers, plus the model
// field's wrapper, whose own visibility says whether the chosen brand has any
// models. A category missing here has no brand/model screens yet and shows its
// whole form right under the category grid, as it always did.
const CATEGORY_FIELDS = {
  'Sneakers': { brand: 'sneaker-brand', model: 'sneaker-model', modelField: 'sneaker-model-field' },
  'Bags & Leather Goods': { brand: 'bags-brand', model: 'bags-model', modelField: 'bags-model-field' },
  'Luxury Shoes': { brand: 'luxury-shoes-brand', model: 'luxury-shoes-model', modelField: 'luxury-shoes-model-field' },
  'Apparel': { brand: 'apparel-brand', model: 'apparel-model', modelField: 'apparel-model-field' },
  'Trading Cards': { brand: 'card-brand', model: 'card-model', modelField: 'card-model-field' }
};

let currentDetailScreen = 'category';
// While a draft is being restored, its field events must not move the user
// between screens -- showRestoredScreen() picks the right one afterwards.
let restoringDraft = false;

const detailScreens = () => [...new Set(
  [...dynamicFormContainer.querySelectorAll('[data-screen]')].map(el => el.dataset.screen)
)];
const fieldValue = (id) => document.getElementById(id)?.value || '';

function modelScreenAvailable() {
  const field = document.getElementById(CATEGORY_FIELDS[categorySelected]?.modelField);
  return !!field && field.style.display !== 'none' && !field.classList.contains('model-field-hidden');
}

function renderBreadcrumb() {
  const fields = CATEGORY_FIELDS[categorySelected];
  if (!fields) return;

  const brand = fieldValue(fields.brand);
  const model = fieldValue(fields.model);
  const parts = [{ label: categorySelected, screen: 'category' }];
  // the screen you're on always shows, even before anything is chosen there
  if (brand || currentDetailScreen === 'brand') parts.push({ label: brand || 'Choose a brand', screen: 'brand' });
  if (model || currentDetailScreen === 'model') parts.push({ label: model || 'Choose a model', screen: 'model' });

  detailsBreadcrumb.replaceChildren(...parts.flatMap((part, i) => {
    const crumb = document.createElement('button');
    crumb.type = 'button';
    crumb.className = 'details-crumb';
    crumb.dataset.screen = part.screen;
    crumb.textContent = part.label;
    if (part.screen === currentDetailScreen) crumb.setAttribute('aria-current', 'step');
    if (i === 0) return [crumb];

    const separator = document.createElement('span');
    separator.className = 'details-crumb-separator';
    separator.setAttribute('aria-hidden', 'true');
    separator.textContent = '›';
    return [separator, crumb];
  }));
}

function showDetailScreen(name) {
  currentDetailScreen = name;
  const onCategory = name === 'category';

  categoryScreen.classList.toggle('screen-hidden', !onCategory);
  dynamicFormContainer.classList.toggle('screen-hidden', onCategory);
  detailsNav.classList.toggle('screen-hidden', onCategory);
  dynamicFormContainer.querySelectorAll('[data-screen]').forEach(el => {
    el.classList.toggle('screen-hidden', el.dataset.screen !== name);
  });

  if (!onCategory) renderBreadcrumb();
}

// Called once a category's template has loaded.
function enterCategoryFlow() {
  const screens = detailScreens();

  if (screens.length === 0) {
    currentDetailScreen = 'category';
    categoryScreen.classList.remove('screen-hidden');
    dynamicFormContainer.classList.remove('screen-hidden');
    detailsNav.classList.add('screen-hidden');
    return;
  }

  showDetailScreen(screens[0]);
}

// After a draft restore: land on the furthest screen the draft reaches. A live
// model list that hasn't arrived yet advances the user on its own later (see
// the 'models-ready' listener).
function showRestoredScreen() {
  const screens = detailScreens();
  if (screens.length === 0) return enterCategoryFlow();

  const fields = CATEGORY_FIELDS[categorySelected];
  const target = fields && fieldValue(fields.brand) && modelScreenAvailable() ? 'model' : 'brand';
  showDetailScreen(screens.includes(target) ? target : screens[0]);
}

detailsBackBtn.addEventListener('click', () => {
  const order = ['category', ...detailScreens()].filter(name => name !== 'model' || modelScreenAvailable());
  const index = order.indexOf(currentDetailScreen);
  showDetailScreen(order[Math.max(index - 1, 0)]);
});

detailsBreadcrumb.addEventListener('click', (e) => {
  const crumb = e.target.closest('.details-crumb');
  if (crumb && crumb.dataset.screen !== currentDetailScreen) showDetailScreen(crumb.dataset.screen);
});

// Keep the breadcrumb in step with what's chosen: the pickers dispatch 'change'
// on their hidden input.
dynamicFormContainer.addEventListener('change', () => {
  if (currentDetailScreen !== 'category') renderBreadcrumb();
});

// The brand pickers' model lists load asynchronously (a live KicksDB lookup for
// most brands), so "brand chosen" alone can't say where to go next. Each
// category's model toggle announces the outcome with 'models-ready': a list
// exists -> the model screen; none -> stay put (or move on to a later screen if
// the category has one).
dynamicFormContainer.addEventListener('models-ready', (e) => {
  if (restoringDraft || currentDetailScreen !== 'brand') return;

  const fields = CATEGORY_FIELDS[categorySelected];
  if (!fields || !fieldValue(fields.brand)) return;

  const screens = detailScreens();
  const next = e.detail.count > 0 ? 'model' : screens[screens.indexOf('model') + 1];
  if (next && next !== 'brand') showDetailScreen(next);
});

function setCategorySelection(category) {
  categorySelected = category || null;

  categoryCards.forEach(card => {
    const isSelected = card.dataset.category === categorySelected;
    card.classList.toggle('selected', isSelected);
    card.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  });
}

categoryCards.forEach(card => {
  card.addEventListener('click', async () => {
    const category = card.dataset.category;

    // Re-picking the category you're already in keeps whatever brand/model
    // you'd chosen and just goes back into it.
    if (category === categorySelected && dynamicFormContainer.children.length > 0) {
      enterCategoryFlow();
      return;
    }

    setCategorySelection(category);
    // step 3's required photo slots are driven by this same category
    renderImageSlots(categorySelected);

    await formLocator(category);
    // another card may have been clicked while the template was loading
    if (categorySelected === category) enterCategoryFlow();
  });
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

  setCategorySelection(null);
  // Rebuilds to the empty placeholder state -- not resetImages(), since that
  // only clears values on whatever slots are currently rendered, leaving the
  // previous category's (now-empty) slots sitting there instead of actually
  // going away.
  renderImageSlots(categorySelected);

  if (dynamicFormContainer) {
    dynamicFormContainer.innerHTML = "";
  }
  showDetailScreen('category');

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
    // keeps the restored fields' events from moving the user between screens
    restoringDraft = true;

    try {
      setCategorySelection(draft.category);
      await formLocator(categorySelected);
      renderImageSlots(categorySelected);

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
    } finally {
      restoringDraft = false;
    }

    showRestoredScreen();
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
    const REQUIRED_IMAGES = getRequiredAngleCount(categorySelected);

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
      return false;
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
        initBrandCardPicker({
          searchId: 'bags-brand-search',
          listId: 'bags-brand-options',
          hiddenId: 'bags-brand',
          brands: BAGS_BRANDS,
          logo: brandLogoUrl
        });
        // Starts empty -- initBrandModelToggle fills it whenever the brand
        // changes (curated list for Hermès, the server's cached list otherwise).
        const bagModelPicker = initBrandCardPicker({
          searchId: 'bags-model-search',
          listId: 'bags-model-options',
          hiddenId: 'bags-model',
          brands: []
        });
        initBrandModelToggle({
          brandId: 'bags-brand',
          modelId: 'bags-model',
          modelFieldId: 'bags-model-field',
          modelPicker: bagModelPicker,
          kind: 'bag',
          curated: { 'Hermès': HERMES_MODELS }
        });
      } else if (category === 'Luxury Shoes') {
        initBrandCardPicker({
          searchId: 'luxury-shoes-brand-search',
          listId: 'luxury-shoes-brand-options',
          hiddenId: 'luxury-shoes-brand',
          brands: LUXURY_SHOES_BRANDS,
          logo: brandLogoUrl
        });
        // Starts empty -- initBrandModelToggle fills it whenever the brand changes.
        const luxuryModelPicker = initBrandCardPicker({
          searchId: 'luxury-shoes-model-search',
          listId: 'luxury-shoes-model-options',
          hiddenId: 'luxury-shoes-model',
          brands: []
        });
        initBrandModelToggle({
          brandId: 'luxury-shoes-brand',
          modelId: 'luxury-shoes-model',
          modelFieldId: 'luxury-shoes-model-field',
          modelPicker: luxuryModelPicker,
          kind: 'luxury-shoe',
          curated: LUXURY_SHOES_MODELS_BY_BRAND
        });
      } else if (category === 'Apparel') {
        initBrandCardPicker({
          searchId: 'apparel-brand-search',
          listId: 'apparel-brand-options',
          hiddenId: 'apparel-brand',
          brands: APPAREL_BRANDS,
          logo: brandLogoUrl
        });
        // Starts empty -- initBrandModelToggle fills it whenever the brand changes.
        const apparelModelPicker = initBrandCardPicker({
          searchId: 'apparel-model-search',
          listId: 'apparel-model-options',
          hiddenId: 'apparel-model',
          brands: []
        });
        initBrandModelToggle({
          brandId: 'apparel-brand',
          modelId: 'apparel-model',
          modelFieldId: 'apparel-model-field',
          modelPicker: apparelModelPicker,
          kind: 'apparel'
        });
      } else if (category === 'Trading Cards') {
        initBrandCardPicker({
          searchId: 'card-brand-search',
          listId: 'card-brand-options',
          hiddenId: 'card-brand',
          brands: TRADING_CARD_BRANDS,
          logo: brandLogoUrl
        });
        // Starts empty -- initBrandModelToggle fills it whenever the brand changes.
        const cardModelPicker = initBrandCardPicker({
          searchId: 'card-model-search',
          listId: 'card-model-options',
          hiddenId: 'card-model',
          brands: []
        });
        initBrandModelToggle({
          brandId: 'card-brand',
          modelId: 'card-model',
          modelFieldId: 'card-model-field',
          modelPicker: cardModelPicker,
          curated: TRADING_CARD_MODELS_BY_BRAND,
          photos: false
        });
      } else if (category === 'Sneakers') {
        initBrandCardPicker({
          searchId: 'sneaker-brand-search',
          listId: 'sneaker-brand-options',
          hiddenId: 'sneaker-brand',
          brands: SNEAKER_BRANDS,
          logo: brandLogoUrl
        });
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

    const authRequestPayload = {
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
      }
    }

    console.log("auth Data:",authRequestPayload);

    // Routed through the server (not a direct client-side addDoc) so the
    // required-angle-count rule actually means something -- see
    // app.post("/authentication-requests") in server.js, which recomputes
    // the required count for productDetails.category itself instead of
    // trusting however many images the client claims to have uploaded.
    // status/userId/timestamps are now set there too, not here.
    const response = await fetch("/authentication-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.idToken}`
      },
      body: JSON.stringify(authRequestPayload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to submit authentication request");
    }

    console.log("✅ Document created with id: ", result.requestId);

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
            itemLabel: authRequestPayload.productDetails.details || authRequestPayload.productDetails.category,
            requestId: result.requestId
          }
        })
      });
    } catch (error) {
      console.error("Error sending admin notification for auth request:", error);
    }

    return { success: true, requestId: result.requestId, images: uploadedImages }
    
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