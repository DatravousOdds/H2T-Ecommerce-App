import { showLoader } from '../components/pageLoader.js';
import { openScanner } from '../components/qrScanner.js';

const params = new URLSearchParams(window.location.search);
const code = params.get('code');
const brand = params.get('brand') || '';
const expired = params.get('expired') === 'true';

// /r/:code already validated this code server-side before redirecting here,
// so landing on this page with no code means it was opened directly.
if (!code) {
  window.location.href = '/signup';
}

const codeInputEl = document.getElementById('codeInput');
if (codeInputEl) codeInputEl.textContent = code;

let progress = 0;

const container = document.getElementById('qrWrapper');
showLoader(document.getElementById('loaderSlot'));

const CHECKING_DELAY_MS = 1200;
const REDIRECT_DELAY_MS = 1500;
setTimeout(() => updateProgress(100), CHECKING_DELAY_MS);

const checkingCodeContent = (code) => `
    <div class="container-loader pos-relative">

    </div>
    <div class="modal-content text-center">
        <h1 class="text-upper lh-loose">Checking your code</h1>
        <p class="subheading">Matching QR code to Hexxo rewards</p>
        <hr />
        <p class="text-upper redeem-text">Code <span id="codeInput">${code}</span></p>
    </div>
`;

const enableCodeContent = (brand) => `
    <div class="modal-content text-center">
        <div class="modal-header">
            <i class="fa-solid fa-circle-check icon enabled"></i>
            <h2 class="text-upper">${brand ? `${brand} x Hexxo`: "Hexxo"}</h2>
            <h1 class="text-upper">Reward enabled</h1>
            <p>Free authentication on your first purchase</p>
        </div>
        <div class="modal-footer">
            <div class="redirect-loader"></div>
            <p class="redirect-note">Taking you to signup</p>
        </div>
    </div>
`;

const expiredCodeContent = (code, brand) => `
    <div class="modal-content text-center">
        <div class="modal-header">
            <i class="fa-solid fa-circle-exclamation icon expired"></i>
            <p class="expired-code">Code ${code}</p>
            <h1 class="text-upper">This code has expired</h1>
            <p>Codes from ${brand} are valid for 30 days. You can still create your account - a new code can be added any time</p>
        </div>
        <div class="modal-footer">
            <button class="btn btn-primary">
                Create account 
            </button>
            <a href="#" class="qr-scan">Scan a different code</a>
        </div>
    </div>
`;

function updateProgress(value) {
    progress = value;

    if (progress === 100) {
        onLoaderCompleted();
    }
}

function onLoaderCompleted() {
    if (expired) {
        container.innerHTML = expiredCodeContent(code, brand);
        container.querySelector('.modal-footer button')
            .addEventListener('click', () => { window.location.href = '/signup'; });
        container.querySelector('.qr-scan').addEventListener('click', (e) => {
            e.preventDefault();
            openScanner({
                title: 'Scan a code',
                hint: 'Point your camera at a Hexxo reward QR code to check it.',
            });
        });
    } else {
        container.innerHTML = enableCodeContent(brand);
        setTimeout(() => {
            window.location.href = `/signup?code=${encodeURIComponent(code)}`;
        }, REDIRECT_DELAY_MS);
    }
}

async function checkCode(code) {
    try {
        const response = await fetch(`/r/${code}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({code: code})

        })

        const result = await response.json();
        return result;
    } catch (err) {
        console.error(err);
    }
}

