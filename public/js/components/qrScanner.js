"use strict";

// Lazy-loaded only when the scan button is actually clicked -- this runs on
// every page via nav.js, so a camera/decoding library shouldn't be part of
// every page's up-front load. Same CDN-script pattern as html2canvas/chart.js
// elsewhere in this codebase, just deferred until first use.
const HTML5_QRCODE_SRC = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";

let html5QrcodeLoadPromise = null;
let scannerInstance = null;

// Injected once at module load rather than relying on a <link> added to
// every page's <head> -- this module runs off nav.js on every page in the
// app, and this codebase's per-page stylesheet links are inconsistent
// enough (several pages have been found missing CSS a shared component
// needed) that a self-contained style block is the reliable option here.
function injectStyles() {
  if (document.getElementById("qrScannerStyles")) return;

  const style = document.createElement("style");
  style.id = "qrScannerStyles";
  style.textContent = `
    .qr-scan-btn {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: #757575;
      font-size: 1rem;
    }

    .qr-scan-btn:hover {
      color: #333333;
    }

    .search-input.input-with-icon {
      padding-right: 40px !important;
    }

    .qr-scanner-modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 10000;
      align-items: center;
      justify-content: center;
    }

    .qr-scanner-modal.is-open {
      display: flex;
    }

    .qr-scanner-box {
      background: #fff;
      border-radius: 12px;
      padding: 1.5rem;
      width: 100%;
      max-width: 360px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .qr-scanner-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }

    .qr-scanner-header h2 {
      font-size: 1.1rem;
      margin: 0;
    }

    .qr-scanner-header .modal-close {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.1rem;
      color: #333;
    }

    .qr-scanner-hint {
      font-size: 0.875rem;
      color: #666;
      margin-bottom: 1rem !important;
    }

    #qr-reader {
      width: 100%;
      border-radius: 8px;
      overflow: hidden;
    }

    .qr-scanner-divider {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 1rem 0;
      color: #999;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .qr-scanner-divider::before,
    .qr-scanner-divider::after {
      content: "";
      flex: 1;
      height: 1px;
      background: #e5e5e5;
    }

    .qr-scanner-upload-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.65rem 1rem;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      background: #f5f5f5;
      color: #333;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      box-sizing: border-box;
    }

    .qr-scanner-upload-btn:hover {
      background: #ececec;
    }

    .qr-scanner-error {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.75rem;
      text-align: center;
    }
  `;
  document.head.appendChild(style);
}

injectStyles();

function loadHtml5QrcodeScript() {
  if (window.Html5Qrcode) return Promise.resolve();
  if (html5QrcodeLoadPromise) return html5QrcodeLoadPromise;

  html5QrcodeLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = HTML5_QRCODE_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load QR scanner library"));
    document.head.appendChild(script);
  });

  return html5QrcodeLoadPromise;
}

// Built once and appended to <body> on first use, same pattern as
// pageLoader.js's getPageLoader() -- avoids needing this modal's markup
// hand-added to every page's static HTML just because nav.js (and this
// scan button) runs on all of them.
function getModalEl() {
  let modal = document.getElementById("qrScannerModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.className = "qr-scanner-modal";
  modal.id = "qrScannerModal";
  modal.innerHTML = `
    <div class="qr-scanner-box">
      <div class="qr-scanner-header">
        <h2>Scan Certificate</h2>
        <button type="button" class="modal-close" id="qrScannerClose" aria-label="Close scanner">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <p class="qr-scanner-hint">Point your camera at the QR code on your authentication certificate, or upload a saved image below.</p>
      <div id="qr-reader"></div>

      <div class="qr-scanner-divider"><span>or</span></div>

      <label class="qr-scanner-upload-btn" for="qrFileInput">
        <i class="fa-solid fa-upload"></i>
        Upload a saved QR code
      </label>
      <input type="file" id="qrFileInput" accept="image/*" hidden />

      <p class="qr-scanner-error" id="qrScannerError" hidden></p>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector("#qrScannerClose").addEventListener("click", closeScanner);
  // Click on the dimmed backdrop (not the box itself) also closes it.
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeScanner();
  });

  modal.querySelector("#qrFileInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (file) handleFileUpload(file);
  });

  return modal;
}

function showScannerError(message) {
  const errorEl = document.getElementById("qrScannerError");
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.hidden = false;
}

// A certificate's QR code encodes its own full /certificate.html?orderId=...
// URL (see certificate.js's QR generation), so the common case is just
// navigating straight there. Anything that isn't a URL is treated as a bare
// order ID instead, so a plainly-printed/typed order ID still resolves.
function resolveScanResult(decodedText) {
  const trimmed = decodedText.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    window.location.href = trimmed;
    return;
  }
  window.location.href = `/certificate.html?orderId=${encodeURIComponent(trimmed)}`;
}

async function openScanner() {
  const modal = getModalEl();
  modal.classList.add("is-open");
  document.getElementById("qrScannerError").hidden = true;

  try {
    await loadHtml5QrcodeScript();
  } catch (error) {
    console.error("Failed to load QR scanner library:", error);
    showScannerError("Couldn't load the scanner. Please check your connection and try again.");
    return;
  }

  if (!scannerInstance) {
    scannerInstance = new window.Html5Qrcode("qr-reader");
  }

  try {
    await scannerInstance.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (decodedText) => {
        closeScanner();
        resolveScanResult(decodedText);
      },
      // Per-frame "no code found this frame" callback -- fires constantly
      // while the user is still aiming the camera, not a real error.
      () => {}
    );
  } catch (error) {
    console.error("Failed to start QR scanner:", error);
    showScannerError("Couldn't access your camera -- you can still upload a saved QR code image below.");
  }
}

// Desktop-friendly alternative to the live camera -- decodes a QR code out
// of an uploaded image instead. scanFile() renders into the same #qr-reader
// element the live camera uses, so the camera has to be stopped first or
// its video stream stays layered underneath the uploaded image.
async function handleFileUpload(file) {
  document.getElementById("qrScannerError").hidden = true;

  try {
    await loadHtml5QrcodeScript();
  } catch (error) {
    console.error("Failed to load QR scanner library:", error);
    showScannerError("Couldn't load the scanner. Please check your connection and try again.");
    return;
  }

  if (scannerInstance) {
    await scannerInstance.stop().catch(() => {});
  } else {
    scannerInstance = new window.Html5Qrcode("qr-reader");
  }

  try {
    const decodedText = await scannerInstance.scanFile(file, true);
    closeScanner();
    resolveScanResult(decodedText);
  } catch (error) {
    console.error("Failed to decode uploaded image:", error);
    showScannerError("Couldn't find a QR code in that image. Please try another file.");
  }
}

function closeScanner() {
  const modal = document.getElementById("qrScannerModal");
  if (modal) modal.classList.remove("is-open");

  // stop() throws if the scanner was never started (e.g. camera permission
  // was denied before it began) -- fine to ignore either way, we're closing.
  scannerInstance?.stop().catch(() => {});
}

export function setupQrScanner(nav) {
  const scanBtn = nav.querySelector("#qrScanBtn");
  if (!scanBtn) return;

  scanBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openScanner();
  });
}
