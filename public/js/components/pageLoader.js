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
