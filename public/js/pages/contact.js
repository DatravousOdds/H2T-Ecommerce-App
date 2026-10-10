// Contact page: form validation + submit to POST /send/contact.
// Loaded as a module, so it runs after the DOM is parsed.

const MAX_MESSAGE_LENGTH = 1000;
const MIN_MESSAGE_LENGTH = 10;
// Same pattern as the server's EMAIL_PATTERN in server.js, so an address
// can't pass here and then fail there with a less helpful banner error.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_ERROR = "We couldn't send your message. Please try again.";
// The server route waits on the email provider with no timeout of its own;
// without this a stalled request leaves the button stuck on "Sending…".
const REQUEST_TIMEOUT_MS = 20000;

// Marks errors whose message came from our server and is safe to show as-is.
// Anything else (offline, timeout, bad JSON) gets the generic copy.
class ContactError extends Error {}

// Fields that can show an inline error, keyed by their input `name`.
const VALIDATED_FIELDS = ['name', 'email', 'message'];

const form = document.getElementById('contact-form');
const submitBtn = document.getElementById('contact-submit-btn');
const submitLabel = submitBtn.querySelector('.contact-btn__label');
const alertEl = document.getElementById('contact-form-alert');
const messageInput = document.getElementById('contact-message');
const counterEl = document.getElementById('contact-message-count');

const successPanel = document.getElementById('contact-success');
const successTitle = document.getElementById('contact-success-title');
const successName = document.getElementById('contact-success-name');
const successEmail = document.getElementById('contact-success-email');
const resetBtn = document.getElementById('contact-reset-btn');

// ---------- Pure helpers (no DOM) ----------

function readValues() {
    const data = new FormData(form);
    const text = (key) => (data.get(key) || '').trim();
    return {
        name: text('name'),
        email: text('email'),
        topic: text('topic'),
        order: text('order'),
        message: text('message'),
        website: data.get('website') || '', // honeypot -- left blank by real visitors
    };
}

function validate(values) {
    const errors = {};
    if (!values.name) errors.name = 'Enter your name';
    if (!EMAIL_PATTERN.test(values.email)) errors.email = 'Enter a valid email';
    if (values.message.length < MIN_MESSAGE_LENGTH) {
        errors.message = `Add a few more details (${MIN_MESSAGE_LENGTH}+ characters)`;
    }
    return errors;
}

// The server route only knows `subject`, so topic + order # are folded into it.
function buildSubject(topic, order) {
    return order ? `${topic} · ${order}` : topic;
}

// ---------- DOM updates ----------

function setFieldError(field, message) {
    const input = form.elements[field];
    document.getElementById(`contact-${field}-error`).textContent = message;
    if (message) {
        input.setAttribute('aria-invalid', 'true');
    } else {
        input.removeAttribute('aria-invalid');
    }
}

function showErrors(errors) {
    VALIDATED_FIELDS.forEach((field) => setFieldError(field, errors[field] || ''));

    // Move focus to the first broken field so keyboard/screen-reader users
    // land on the problem instead of having to hunt for it.
    const firstInvalid = VALIDATED_FIELDS.find((field) => errors[field]);
    if (firstInvalid) form.elements[firstInvalid].focus();
}

function updateCounter() {
    counterEl.textContent = `${messageInput.value.length}/${MAX_MESSAGE_LENGTH}`;
}

function showAlert(message) {
    alertEl.textContent = message;
    alertEl.hidden = false;
}

function hideAlert() {
    alertEl.hidden = true;
    alertEl.textContent = '';
}

function setSubmitting(isSubmitting) {
    submitBtn.disabled = isSubmitting;
    submitBtn.setAttribute('aria-busy', String(isSubmitting));
    submitLabel.textContent = isSubmitting ? 'Sending…' : 'Send message';
}

function showSuccess({ name, email }) {
    // textContent, never innerHTML -- both values are raw user input.
    successName.textContent = name.split(/\s+/)[0];
    successEmail.textContent = email;
    form.hidden = true;
    successPanel.hidden = false;
    successTitle.focus();
}

function resetForm() {
    form.reset();
    VALIDATED_FIELDS.forEach((field) => setFieldError(field, ''));
    hideAlert();
    updateCounter();
    successPanel.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
}

// ---------- Network ----------

async function sendMessage(values) {
    const response = await fetch('/send/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: values.name,
            email: values.email,
            subject: buildSubject(values.topic, values.order),
            message: values.message,
            website: values.website,
        }),
        // Optional call: AbortSignal.timeout is Safari 16+ / Chrome 103+.
        // On older browsers this is undefined, so the request just has no
        // timeout instead of throwing and blocking every submit.
        signal: AbortSignal.timeout?.(REQUEST_TIMEOUT_MS),
    });

    // A proxy/crash can return an HTML error page, so don't assume JSON.
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
        throw new ContactError(result.message || GENERIC_ERROR);
    }
}

// ---------- Events ----------

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitBtn.disabled) return; // already in flight

    hideAlert();
    const values = readValues();
    const errors = validate(values);
    if (Object.keys(errors).length) {
        showErrors(errors);
        return;
    }

    setSubmitting(true);
    try {
        await sendMessage(values);
        showSuccess(values);
    } catch (error) {
        // Only server-provided messages are shown verbatim; browser errors like
        // "Failed to fetch" or "signal timed out" mean nothing to a visitor.
        showAlert(error instanceof ContactError ? error.message : GENERIC_ERROR);
    } finally {
        setSubmitting(false);
    }
});

// One delegated listener instead of one per field: typing clears that
// field's error, and the message box also updates its counter.
form.addEventListener('input', (e) => {
    const field = e.target.name;
    if (VALIDATED_FIELDS.includes(field)) setFieldError(field, '');
    if (field === 'message') updateCounter();
});

resetBtn.addEventListener('click', resetForm);

// Browsers can restore field values on back/forward navigation, so sync the
// counter with whatever is already in the textarea.
updateCounter();

// ======================================================================
// FAQ accordion + search
// ----------------------------------------------------------------------
// Two independent pieces of state, and the display is derived from both:
//   openIndex -- what the user chose in the accordion (one at a time)
//   query     -- a temporary filter on top of it
// Searching never touches openIndex, so clearing the search puts the
// accordion back exactly how the user left it. While searching, clicks
// collapse/expand an item only for that search (collapsedWhileSearching),
// which is thrown away whenever the query changes.
// ======================================================================

const NO_RESULTS_TEXT = "No matches. Send us a message above and we'll help.";

const faqList = document.getElementById('contact-faq-list');
const faqSearch = document.getElementById('contact-faq-search');
const faqEmpty = document.getElementById('contact-faq-empty');

// Normalise once so "  Refund   policy " matches the same text as "refund policy".
const normalize = (text) => text.replace(/\s+/g, ' ').trim().toLowerCase();

// Read the static markup once up front; search then compares against cached
// strings instead of walking the DOM on every keystroke.
const faqItems = [...faqList.querySelectorAll('.contact-faq__item')].map((el) => {
    const button = el.querySelector('.contact-faq__toggle');
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    return {
        el,
        button,
        panel,
        searchText: normalize(`${button.textContent} ${panel.textContent}`),
    };
});

let openIndex = 0;
let query = '';
const collapsedWhileSearching = new Set();

function renderFaq() {
    let visibleCount = 0;

    faqItems.forEach((item, index) => {
        const matches = !query || item.searchText.includes(query);
        const isOpen = query
            ? matches && !collapsedWhileSearching.has(index)
            : index === openIndex;

        item.el.hidden = !matches;
        item.button.setAttribute('aria-expanded', String(isOpen));
        item.panel.hidden = !isOpen;
        if (matches) visibleCount += 1;
    });

    faqEmpty.textContent = visibleCount ? '' : NO_RESULTS_TEXT;
}

function toggleFaq(index) {
    if (query) {
        // Search mode: flip just this item, for this search only.
        if (collapsedWhileSearching.has(index)) {
            collapsedWhileSearching.delete(index);
        } else {
            collapsedWhileSearching.add(index);
        }
    } else {
        // Accordion mode: one open at a time; clicking the open one closes it.
        openIndex = openIndex === index ? -1 : index;
    }
    renderFaq();
}

// One delegated listener for all six buttons.
faqList.addEventListener('click', (e) => {
    const button = e.target.closest('.contact-faq__toggle');
    if (!button) return;
    toggleFaq(faqItems.findIndex((item) => item.button === button));
});

// 'input' also fires when the native clear (×) button of type="search" is used.
faqSearch.addEventListener('input', () => {
    query = normalize(faqSearch.value);
    collapsedWhileSearching.clear();
    renderFaq();
});

// The search box can also be restored on back/forward navigation.
query = normalize(faqSearch.value);
renderFaq();
