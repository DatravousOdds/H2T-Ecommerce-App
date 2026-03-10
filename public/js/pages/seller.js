import { checkUserStatus } from '../auth/auth.js';
import { getStorage, ref, uploadString, getDownloadURL, 
    deleteDoc, collection, db, doc, app } from '../api/firebase-client.js';

const imageGridContainer = document.querySelector('.images-grid-container');
const productTitle = document.getElementById('title');
const productCategory = document.getElementById('category');
const productDescription = document.getElementById('description');
const productPrice = document.getElementById('itemPrice');
const productShipping = document.querySelector('input[type="radio"]:checked');
const shippingContainers = document.querySelectorAll('.shipping-btn-container');
const shippingGroupContainer = document.querySelector('.input-grid-wrapper');
const tradeStatus = document.querySelector('.button-container');
const postBtn = document.getElementById('postBtn');
const currentUser =  await checkUserStatus();
const storage = getStorage(app, 'gs://ecom-website-94d87');
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


// console.log("current user: ",currentUser.email)

postBtn.addEventListener('click', () => {
    collectListingInfo();
    const images = collectImageData('.image-preview');
    uploadImagesToFirebase(images, currentUser.email);
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



function collectListingInfo() {
    listing.originalPrice = parseFloat(productPrice.value);
    listing.productName = productTitle.value.trim();
    listing.availableForTrade = tradeStatus.classList.contains('active');
    listing.ownerId = currentUser.email;
    listing.status = 'active';
    listing.description = productDescription.value.trim();
    listing.shipping = productShipping?.value.trim();

}

function checkShippingBox(selector, event) {
    const shippingContainer = event.target.closest(selector);
    const input = shippingContainer.querySelector('input[type="radio"]');
    input.checked = true;
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



async function uploadImagesToFirebase(images, userId) {
    const newListingRef = doc(collection(db, 'listings'));
    const listingId = newListingRef.id;
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

async function uploadToFirebase() { 

}