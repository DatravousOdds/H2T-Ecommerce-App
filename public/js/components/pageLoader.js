let pageLoaderEl = null;

function getPageLoader() {
  if (pageLoaderEl) return pageLoaderEl;

  pageLoaderEl = document.createElement('div');
  pageLoaderEl.className = 'page-loader';
  pageLoaderEl.id = 'pageLoader';
  pageLoaderEl.innerHTML = `
    <div class="page-loader-dots">
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;

  document.body.appendChild(pageLoaderEl);
  return pageLoaderEl;
}

export function showPageLoader() {
  getPageLoader().classList.add('is-visible');
}

export function hidePageLoader() {
  getPageLoader().classList.remove('is-visible');
}

const CONTAINER_LOADER_CLASS = 'container-loader';

function getContainerLoader(containerEl) {
  let loaderEl = containerEl.querySelector(`:scope > .${CONTAINER_LOADER_CLASS}`);
  if (loaderEl) return loaderEl;

  loaderEl = document.createElement('div');
  loaderEl.className = CONTAINER_LOADER_CLASS;
  loaderEl.innerHTML = `
    <div class="page-loader-dots">
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;

  containerEl.appendChild(loaderEl);
  return loaderEl;
}

// container-loader is positioned absolute, so its nearest positioned
// ancestor must be the container itself, not some parent further up.
export function showLoader(containerEl) {
  if (getComputedStyle(containerEl).position === 'static') {
    containerEl.dataset.loaderPositioned = 'true';
    containerEl.style.position = 'relative';
  }

  getContainerLoader(containerEl).classList.add('is-visible');
}

export function hideLoader(containerEl) {
  const loaderEl = containerEl.querySelector(`:scope > .${CONTAINER_LOADER_CLASS}`);
  if (loaderEl) loaderEl.classList.remove('is-visible');

  if (containerEl.dataset.loaderPositioned) {
    containerEl.style.position = '';
    delete containerEl.dataset.loaderPositioned;
  }
}

const BUTTON_DOTS_CLASS = 'button-loading-dots';

// Same dots as showLoader()/showPageLoader(), shown in place of a "Load
// More"-style button while it's loading -- for a button whose own styling
// (e.g. .load-more-btn's red background) shouldn't show through, this hides
// the button outright and inserts a plain sibling dots element instead of
// trying to reskin the button itself.
export function setButtonLoading(button, isLoading) {
  if (!button) return;

  if (isLoading) {
    button.disabled = true;
    button.style.display = 'none';

    let dotsEl = button.nextElementSibling;
    if (!dotsEl?.classList.contains(BUTTON_DOTS_CLASS)) {
      dotsEl = document.createElement('div');
      dotsEl.className = BUTTON_DOTS_CLASS;
      dotsEl.innerHTML = `
        <div class="page-loader-dots button-loader-dots">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      `;
      button.insertAdjacentElement('afterend', dotsEl);
    }
  } else {
    button.disabled = false;
    button.style.display = '';

    const dotsEl = button.nextElementSibling;
    if (dotsEl?.classList.contains(BUTTON_DOTS_CLASS)) {
      dotsEl.remove();
    }
  }
}
