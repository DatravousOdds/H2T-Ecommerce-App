import { db, doc, getDoc, auth, getStorage, ref, uploadString, getDownloadURL } from '../api/firebase-client.js';
import { formatFirebaseDate, getUserProfile } from '../core/global.js';

const storage = getStorage();
const urlParams = new URLSearchParams(window.location.search);
const requestId = urlParams.get('authRequestId');

// Keep in sync with MAX_AUTH_REQUEST_IMAGES in server.js's resubmit route.
const MAX_AUTH_REQUEST_IMAGES = 8;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];

const authData = await fetchAuthInfo(requestId);
const submitterProfile = authData ? await getUserProfile(authData.userId) : null;

// Same three outcomes as STATUS_DISPLAY in the seller dashboard's
// authentication.js / server.js's REVIEW_RESULT_NOTIFICATION. approved/rejected
// use the actual Hexxo badge logos; needs_info has no logo asset so it keeps
// the fa-circle-info icon.
const RESULT_BADGE = {
    approved: { badgeClass: "authentic-badge", image: "/images/hexxo_auth_badge.png", label: "PASSED AUTHENTICATION" },
    rejected: { badgeClass: "fake-badge", image: "/images/hexxo_auth_badge_failed.png", label: "FAILED AUTHENTICATION" },
    needs_info: { badgeClass: "needs-info-badge", icon: "fa-circle-info", label: "MORE INFO NEEDED" },
};

const resultHTML = status => {
    const result = RESULT_BADGE[status];
    if (!result) return "";

    const iconHTML = result.image
        ? `<img src="${result.image}" alt="">`
        : `<i class="fa-solid ${result.icon}"></i>`;

    return `<div class="authenticate-result ${result.badgeClass}">
            ${iconHTML}
            <span>${result.label}</span>
        </div>`;
}

const authTemplates = {
    header: (data) =>
        `<div class="content-title">
            <h1>Authentication Results</h1>
            <p>Submission <span class="submit-number" id="submitNumber">#123243</span> - Reviewed ${formatFirebaseDate(data.reviewedAt)}</p>
        </div>
        ${resultHTML(data.status)}`
    ,
    details: (data, sellerProfile) => {
        const primaryImage = data.images?.find((image) => image.isPrimary) || data.images?.[0];
        const details = data.productDetails?.details || {};

        return `<div class="image-wrapper">
            <img src="${primaryImage?.url || ''}" alt="${details.Brand || 'Submitted item'}">
        </div>
        <div class="prod-details">
            <p class="details-title">ITEM</p>
            <div class="prod-specs">
                <p>${details.Brand || '--'}</p>
                <div>
                    <p class="prod-size">Size ${details.Size || '--'}</p>
                    <p class="color">${details.Color || '--'}</p>
                </div>
            </div>
            <div class="auth-info">
                <div class="submitted-by">
                    <div class="auth-label">Submitted by</div>
                    <div class="auth-value">@${sellerProfile?.username || "unknown"}</div>
                </div>
                <div class="auth-tier">
                    <div class="auth-label">Authenticator</div>
                    <div class="auth-value">${data.tierSelection.type}</div>
                </div>
                <div class="turnaround-time">
                    <div class="auth-label">Turnaround</div>
                    <div class="auth-value">${data.reviewedAt ? calculateTurnAroundTime(data.createdAt, data.reviewedAt) : 'Pending'}</div>
                </div>
            </div>
        </div>
        ${data.status === 'approved'
            ? `<div class="auth-cta">
                <button type="button" class="btn-primary" id="listForSaleBtn">List item for sale ➡</button>
                <button type="button" class="btn-secondary" id="downloadCertBtn">Download certificate</button>
            </div>`
            : ''}`;
    },
    remarks: (data) => {
        const commentsBlock = data.reviewerNotes
            ? `<div class="auth-wrapper" id="authComments">
                    <h2 class="auth-header">Comments</h2>
                    <p>${data.reviewerNotes}</p>
                </div>`
            : "";

        const photos = (data.images || [])
            .map((image, i) => `
                <div class="img-wrapper">
                    <img src="${image.url}" alt="Submitted photo ${i + 1} of ${data.details?.Brand || "item"}">
                </div>`)
            .join("");

        const resubmitBlock = data.status === 'needs_info'
            ? `<div class="auth-wrapper" id="resubmitPanel">
                    <h2 class="auth-header">Add Photos &amp; Resubmit</h2>
                    <p class="resubmit-hint">Add the photos the reviewer asked for, then resubmit — this updates the same request.</p>
                    <div class="flex-wrapper of-y" id="pendingPhotos"></div>
                    <input type="file" id="resubmitFileInput" accept="image/jpeg,image/png" multiple hidden>
                    <button type="button" class="btn-secondary" id="addPhotosBtn">+ Add Photos</button>
                    <textarea id="resubmitNote" class="resubmit-note" placeholder="Optional note for the reviewer..."></textarea>
                    <p class="errorText" id="resubmitError"></p>
                    <button type="button" class="btn-primary" id="resubmitBtn" disabled>Resubmit for Review</button>
                </div>`
            : '';

        return `${commentsBlock}
                ${resubmitBlock}
                <div class="auth-photos">
                    <div class="auth-header">
                        <h2>Submitted Photos</h2>
                    </div>
                    <div class="flex-wrapper of-y">
                        ${photos}
                    </div>
                </div>`;
    }
}

function renderAuthResults(authData, sellerProfile) {
    const resultsWrapper = document.querySelector('.results-wrapper');

    if (!authData) {
        console.error("renderAuthResults: no authData to render");
        resultsWrapper?.classList.remove('is-loading');
        const details = document.querySelector('#details');
        if (details) details.innerHTML = '<p>This authentication request could not be found.</p>';
        return;
    }

    const contentHeader = document.getElementById('contentHeader');
    const details = document.querySelector('#details');
    const productRemarks = document.querySelector('#productRemarks');

    if (contentHeader) contentHeader.innerHTML = authTemplates.header(authData);
    if (details) details.innerHTML = authTemplates.details(authData, sellerProfile);
    if (productRemarks) productRemarks.innerHTML = authTemplates.remarks(authData);

    resultsWrapper?.classList.remove('is-loading');

    // #listForSaleBtn/#downloadCertBtn are rebuilt by the innerHTML assignment
    // above, so bind via delegation on the (stable) details container rather
    // than the buttons themselves.
    details?.addEventListener('click', (e) => {
        if (e.target.closest('#listForSaleBtn')) {
            window.location.href = `/seller/seller.html?authRequestId=${requestId}`;
            return;
        }
        if (e.target.closest('#downloadCertBtn')) {
            downloadCertificate();
        }
    });

    if (authData.status === 'approved') {
        populateCertificate(authData, sellerProfile);
    }

    wireResubmitPanel(authData, productRemarks);
}

function formatCertificateDate(timestamp) {
    if (!timestamp) return '--';
    return timestamp.toDate().toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).replace(',', ' @');
}

function populateCertificate(data, sellerProfile) {
    const details = data.productDetails?.details || {};

    document.getElementById('certBrand').textContent = details.Brand || '--';
    document.getElementById('certDate').textContent = formatCertificateDate(data.createdAt);
    document.getElementById('certTier').textContent = data.tierSelection?.type || '--';
    document.getElementById('certOwner').textContent = sellerProfile?.username ? `@${sellerProfile.username}` : 'Unknown';

    const certPhotos = document.getElementById('certPhotos');
    certPhotos.innerHTML = (data.images || [])
        .map((image, i) => `<img src="${image.url}" alt="Item photo ${i + 1}">`)
        .join('');
}

async function downloadCertificate() {
    const certificate = document.getElementById('certificate');
    const downloadBtn = document.getElementById('downloadCertBtn');

    try {
        if (downloadBtn) downloadBtn.disabled = true;

        const canvas = await html2canvas(certificate, { backgroundColor: '#ffffff', scale: 2, useCORS: true });

        const link = document.createElement('a');
        link.download = `hexxo-certificate-${requestId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (error) {
        console.error('❌ Error generating certificate:', error);
        alert('Something went wrong generating your certificate. Please try again.');
    } finally {
        if (downloadBtn) downloadBtn.disabled = false;
    }
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

async function uploadResubmitImages(pendingImages, userId, existingCount) {
    const uploadPromises = pendingImages.map(async (img, i) => {
        const index = existingCount + i;
        const imagePath = `authenticationRequests/${userId}/${requestId}/image_${index}_${Date.now()}.jpg`;
        const storageRef = ref(storage, imagePath);

        const uploadResult = await uploadString(storageRef, img.dataUrl, 'data_url');
        const downloadURL = await getDownloadURL(uploadResult.ref);

        return { url: downloadURL, path: imagePath, isPrimary: false, index };
    });

    return Promise.all(uploadPromises);
}

function wireResubmitPanel(authData, productRemarks) {
    if (authData.status !== 'needs_info' || !productRemarks) return;

    const fileInput = productRemarks.querySelector('#resubmitFileInput');
    const addPhotosBtn = productRemarks.querySelector('#addPhotosBtn');
    const pendingList = productRemarks.querySelector('#pendingPhotos');
    const noteInput = productRemarks.querySelector('#resubmitNote');
    const errorText = productRemarks.querySelector('#resubmitError');
    const resubmitBtn = productRemarks.querySelector('#resubmitBtn');

    if (!fileInput || !addPhotosBtn || !pendingList || !resubmitBtn) return;

    const existingCount = authData.images?.length || 0;
    let pendingImages = [];

    const showError = (message) => { errorText.textContent = message; };

    const renderPending = () => {
        pendingList.innerHTML = pendingImages
            .map((img, i) => `
                <div class="img-wrapper pending">
                    <img src="${img.dataUrl}" alt="New photo ${i + 1}">
                    <button type="button" class="remove-image-btn" data-index="${i}">&times;</button>
                </div>`)
            .join('');
        resubmitBtn.disabled = pendingImages.length === 0;
    };

    addPhotosBtn.addEventListener('click', () => fileInput.click());

    pendingList.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-image-btn');
        if (!removeBtn) return;
        pendingImages.splice(Number(removeBtn.dataset.index), 1);
        renderPending();
    });

    fileInput.addEventListener('change', async () => {
        showError('');
        const files = [...fileInput.files];
        fileInput.value = '';
        if (files.length === 0) return;

        const remainingSlots = MAX_AUTH_REQUEST_IMAGES - existingCount - pendingImages.length;
        if (files.length > remainingSlots) {
            showError(remainingSlots > 0
                ? `Only ${remainingSlots} more photo(s) can be added (${MAX_AUTH_REQUEST_IMAGES} max).`
                : `You've reached the ${MAX_AUTH_REQUEST_IMAGES} photo limit.`);
            return;
        }

        for (const file of files) {
            if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
                showError('Photos must be JPEG or PNG.');
                return;
            }
            if (file.size > MAX_FILE_SIZE) {
                showError('Each photo must be under 10MB.');
                return;
            }
        }

        const dataUrls = await Promise.all(files.map(readFileAsDataURL));
        dataUrls.forEach((dataUrl) => pendingImages.push({ dataUrl }));
        renderPending();
    });

    resubmitBtn.addEventListener('click', async () => {
        showError('');
        resubmitBtn.disabled = true;
        resubmitBtn.textContent = 'Resubmitting...';

        try {
            const user = auth.currentUser;
            if (!user) throw new Error('You must be logged in to resubmit.');

            const uploadedImages = await uploadResubmitImages(pendingImages, user.uid, existingCount);
            const idToken = await user.getIdToken(true);

            const response = await fetch(`/api/authentication-requests/${requestId}/resubmit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ images: uploadedImages, note: noteInput?.value.trim() || null }),
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to resubmit.');
            }

            // Fire-and-forget, same as the initial submission does right after
            // creating the doc -- re-runs AI matching against the new photos.
            fetch(`/api/authentication-requests/${requestId}/analyze`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${idToken}` },
            }).catch((error) => console.error('❌ Failed to trigger re-analysis:', error));

            window.location.reload();
        } catch (error) {
            console.error('❌ Error resubmitting authentication request:', error);
            showError(error.message || 'Something went wrong. Please try again.');
            resubmitBtn.disabled = false;
            resubmitBtn.textContent = 'Resubmit for Review';
        }
    });

    renderPending();
}



function calculateTurnAroundTime(createdDate, reviewedDate) {
    const createdTimestamp = createdDate.toDate();
    const reviewedTimestamp = reviewedDate.toDate();

    const diff = reviewedTimestamp - createdTimestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
    const minutes = Math.floor(diff / (1000 * 60)) % 60;

    return `${days}d ${hours}h ${minutes}m`;
}

async function fetchAuthInfo(requestId) {
    if (!requestId || typeof requestId !== "string") {
        console.error("Request id is missing or wrong type!");
        return;
    }

    const docRef = doc(db, "authenticationRequests", requestId);

    try {
        const snapShot = await getDoc(docRef);
        if (!snapShot.exists()) {
            console.error(`${requestId} does not exist!`);
            return;
        }

        return snapShot.data();
    } catch (error) {
        throw new Error(`Failed to fetch auth request information: ${error}`)
    }
}

renderAuthResults(authData, submitterProfile);

