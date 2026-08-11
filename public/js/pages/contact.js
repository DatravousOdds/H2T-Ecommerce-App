const contactForm = document.getElementById('contact-form');
const statusEl = document.getElementById('contactFormStatus');
const submitBtn = document.getElementById('contact-submit-btn');

contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // novalidate on the form + reportValidity() here (not the browser's own
    // default bubble) so this always goes through the same checkValidity()
    // path regardless of browser, matching the pattern newsletter.js already
    // uses for its own public, logged-out-friendly form.
    if (!contactForm.checkValidity()) {
        contactForm.reportValidity();
        return;
    }

    const formData = new FormData(contactForm);
    const payload = {
        name: formData.get('name'),
        email: formData.get('email'),
        subject: formData.get('subject'),
        message: formData.get('message'),
        website: formData.get('website'), // honeypot -- left blank by real visitors
    };

    setSubmitting(true);
    hideStatus();

    try {
        const response = await fetch('/send/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "We couldn't send your message. Please try again.");
        }

        showStatus("Thanks! Your message has been sent -- we'll get back to you soon.", 'success');
        contactForm.reset();
    } catch (error) {
        showStatus(error.message, 'error');
    } finally {
        setSubmitting(false);
    }
});

function setSubmitting(isSubmitting) {
    submitBtn.disabled = isSubmitting;
    submitBtn.textContent = isSubmitting ? 'Sending...' : 'Submit';
}

function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `contact-form-status ${type}`;
    statusEl.style.display = 'block';
    statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideStatus() {
    statusEl.style.display = 'none';
    statusEl.textContent = '';
}
