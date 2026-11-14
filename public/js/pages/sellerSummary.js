// Mirrors server.js MARKETPLACE_FEE_RATE; seller.html's "Seller fee (7%)" label repeats it.
// shortcut: hand-copied rate, serve it from the server if it ever varies per seller.
const SELLER_FEE_RATE = 0.07;

export function estimateTakeHome(priceText) {
    // Same parse collectListingInfo saves as listingPrice.
    const price = parseFloat(priceText);
    if (!Number.isFinite(price) || price <= 0) return null;

    const priceCents = Math.round(price * 100);
    if (priceCents < 1) return null;

    // Same toFixed(2) rounding the server charges with; rounding priceCents * rate is off by 1 cent on some prices.
    const feeCents = Math.round(parseFloat((SELLER_FEE_RATE * price).toFixed(2)) * 100);

    return { priceCents, feeCents, netCents: priceCents - feeCents };
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const formatCents = (cents) => money.format(cents / 100);

function setText(id, text) {
    const el = document.getElementById(id);
    if (el.textContent !== text) el.textContent = text;
}

export function initListingSummary(readDraft, photoGrid) {
    const stepEls = document.querySelectorAll('[data-step]');
    const takeHome = document.querySelector('.summary-takehome');
    const labelNote = document.getElementById('labelNote');
    const cover = document.getElementById('summaryCover');
    const coverPlaceholder = document.querySelector('.summary-image span');

    function render() {
        const draft = readDraft();

        stepEls.forEach((el) => {
            const done = draft.done[el.dataset.step];
            el.classList.toggle('done', done);
            const row = el.querySelector(':scope > button');
            row?.setAttribute('aria-label', `${row.textContent.trim()}, ${done ? 'done' : 'not done'}`);
        });
        setText('summaryProgress', `${Object.values(draft.done).filter(Boolean).length} of 5 done`);

        const estimate = estimateTakeHome(draft.priceText);
        const { priceCents = 0, feeCents = 0, netCents = 0 } = estimate ?? {};
        setText('summaryTakeHome', formatCents(netCents));
        setText('breakdownPrice', formatCents(priceCents));
        setText('breakdownFee', `−${formatCents(feeCents)}`);
        setText('breakdownTakeHome', formatCents(netCents));
        takeHome.classList.toggle('empty', !estimate);
        labelNote.hidden = !draft.prepaid;

        setText('conditionHint', draft.conditionHint);
        setText('summaryBrand', draft.brand || 'Brand');
        setText('summaryTitle', draft.title || 'Your title');
        setText('summaryMeta', [draft.size, draft.conditionLabel].filter(Boolean).join(' · ') || 'Size · Condition');
        setText('summaryPrice', formatCents(priceCents));

        // Re-assigning a multi-MB data URL would re-decode the image on every keystroke.
        if (cover.getAttribute('src') !== draft.coverUrl) cover.setAttribute('src', draft.coverUrl);
        cover.hidden = !draft.coverUrl;
        coverPlaceholder.hidden = Boolean(draft.coverUrl);

        // Queried each time because renderImageSlots replaces the slots.
        const oldCoverSlot = photoGrid.querySelector('.is-cover');
        if (oldCoverSlot !== draft.coverSlot) {
            oldCoverSlot?.classList.remove('is-cover');
            draft.coverSlot?.classList.add('is-cover');
        }
    }

    let scheduled = false;
    function refresh() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            render();
        });
    }

    // The frame delay puts render after seller.js's synchronous handlers, so this
    // also catches writes that fire no event: brand option, shipping box, resetForm.
    ['input', 'change', 'click'].forEach((type) => document.addEventListener(type, refresh));

    // Covers what never reaches document: FileReader onload, the remove button's
    // stopPropagation, drag swap. render only changes classes here, so it can't loop.
    new MutationObserver(refresh).observe(photoGrid, { subtree: true, childList: true, attributeFilter: ['src'] });

    // Midnight Pacific, when the promo's listing window closes.
    document.getElementById('zeroFeePromo').hidden = Date.now() >= Date.UTC(2027, 0, 1, 8);

    document.querySelector('.summary-checklist').addEventListener('click', (e) => {
        const step = e.target.closest('li[data-step]')?.dataset.step;
        if (!step) return;
        const section = document.querySelector(`section[data-step="${step}"]`);
        // No behavior option: Bootstrap's :root scroll-behavior is already smooth only without prefers-reduced-motion.
        section.scrollIntoView();
        // Takes keyboard and screen-reader users to the step too; Photos has no field to focus.
        section.querySelector('h4').focus({ preventScroll: true });
    });

    refresh();
}
