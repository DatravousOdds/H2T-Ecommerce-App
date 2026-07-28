import { checkUserStatus } from "../auth/auth.js";

const sessionParams = new URLSearchParams(window.location.search);
const orderId = sessionParams.get("orderId");
const cardEl = document.getElementById("certificate-card");

function formatDate(timestampMs) {
    if (!timestampMs) return "--";
    return new Date(timestampMs).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function displayError(message) {
    cardEl.innerHTML = `
        <div class="certificate-error">
            <p>${message}</p>
        </div>
    `;
}

function displayCertificate(data) {
    cardEl.innerHTML = `
        <div class="certificate-seal"><i class="fa-solid fa-shield-halved"></i></div>
        <h1 class="certificate-title">Certificate of Authenticity</h1>
        <p class="certificate-subtitle">Issued by the Hexxo Authentication Team</p>

        <p class="certificate-item-name">${data.itemName}</p>
        ${data.itemBrand ? `<p class="certificate-item-brand">${data.itemBrand}</p>` : ""}

        <dl class="certificate-fields">
            <div class="certificate-field">
                <dt>Order ID</dt>
                <dd>${data.orderId}</dd>
            </div>
            <div class="certificate-field">
                <dt>Authenticated On</dt>
                <dd>${formatDate(data.authenticatedAt)}</dd>
            </div>
        </dl>

        <div class="certificate-actions">
            <button type="button" class="certificate-print-btn" onclick="window.print()">Print Certificate</button>
        </div>
    `;
}

async function init() {
    const currentUser = await checkUserStatus();

    if (!currentUser) {
        window.location.href = "/login";
        return;
    }

    if (!orderId) {
        displayError("No order specified.");
        return;
    }

    try {
        const response = await fetch(`/api/orders/${orderId}/authentication-certificate`, {
            headers: { "Authorization": `Bearer ${currentUser.idToken}` }
        });

        const result = await response.json();

        if (!response.ok) {
            displayError(result.message || "We couldn't load this certificate.");
            return;
        }

        displayCertificate(result.data);
    } catch (error) {
        console.error("Failed to load certificate:", error);
        displayError("We couldn't load this certificate. Please try again.");
    }
}

init();
