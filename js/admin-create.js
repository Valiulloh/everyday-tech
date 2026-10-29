async function prepareProductImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw Error('Choose JPEG, PNG, or WebP photos. SVG and other file types are not supported.');
  if (file.size > 8 * 1024 * 1024) throw Error('Each photo must be 8MB or smaller.');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71,
    webp =
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (!jpeg && !png && !webp) throw Error('This file is not a supported image.');
  let source, objectUrl;
  try {
    if (typeof createImageBitmap === 'function') source = await createImageBitmap(file);
    else {
      objectUrl = URL.createObjectURL(file);
      source = new Image();
      source.src = objectUrl;
      await source.decode();
    }
    const width = source.width || source.naturalWidth,
      height = source.height || source.naturalHeight;
    if (!width || !height || width * height > 36000000)
      throw Error('Choose an image with up to 36 megapixels.');
    const canvas = document.createElement('canvas'),
      scale = Math.min(1, 1000 / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw Error('Image processing is not available in this browser.');
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    let data;
    for (const quality of [0.82, 0.68, 0.5, 0.35]) {
      data = canvas.toDataURL('image/webp', quality);
      if (data.length <= 350000 && validProductImage(data)) return data;
    }
    throw Error('This photo is too detailed for the local demo. Try a smaller or simpler image.');
  } catch (error) {
    throw Error(error.message || 'This photo could not be read.');
  } finally {
    source?.close?.();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
function imageUploadMarkup() {
  return /* HTML */ `<div class="image-manager">
    <label class="admin-form-label"
      >Product photos
      <span class="field-help"
        >Up to 4 JPEG, PNG, or WebP images. Maximum 8MB each; optimized before saving.</span
      ><input
        class="product-file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
    /></label>
    <div class="image-previews"></div>
    <p class="image-upload-status field-help" role="status"></p>
    <p class="image-upload-error admin-form-error" role="alert"></p>
  </div>`;
}
function bindImageManager(container, initial = []) {
  let images = [...initial],
    busy = false,
    changed = false;
  const fileInput = container.querySelector('input[type=file]'),
    previews = container.querySelector('.image-previews'),
    status = container.querySelector('.image-upload-status'),
    error = container.querySelector('.image-upload-error');
  function render() {
    previews.innerHTML = images
      .map(
        (image, index) =>
          /* HTML */ `<div class="image-preview">
            <img src="${image}" alt="Product photo ${index + 1}" width="100" height="100" /><span
              >${index === 0 ? 'Cover' : 'Photo ' + (index + 1)}</span
            ><button
              type="button"
              data-remove-photo="${index}"
              aria-label="Remove photo ${index + 1}"
            >
              ×</button
            >${index > 0 ? /* HTML */ `<button type="button" class="set-cover" data-cover-photo="${index}">Set as cover</button>` : ''}
          </div>`,
      )
      .join('');
    previews.querySelectorAll('[data-remove-photo]').forEach((button) =>
      button.addEventListener('click', () => {
        if (busy) return;
        images.splice(Number(button.dataset.removePhoto), 1);
        changed = true;
        render();
      }),
    );
    previews.querySelectorAll('[data-cover-photo]').forEach((button) =>
      button.addEventListener('click', () => {
        if (busy) return;
        const [image] = images.splice(Number(button.dataset.coverPhoto), 1);
        images.unshift(image);
        changed = true;
        render();
      }),
    );
    status.textContent = images.length
      ? images.length + ' of 4 photos · first image is the cover.'
      : 'No uploaded photos yet.';
  }
  fileInput.addEventListener('change', async () => {
    error.textContent = '';
    const files = [...fileInput.files];
    if (!files.length) return;
    if (files.length + images.length > 4) {
      error.textContent = 'Keep a maximum of four photos. Remove one before adding another.';
      fileInput.value = '';
      return;
    }
    busy = true;
    fileInput.disabled = true;
    status.textContent = 'Optimizing photos…';
    try {
      const prepared = [];
      for (const file of files) prepared.push(await prepareProductImage(file));
      images.push(...prepared);
      changed = true;
      render();
    } catch (reason) {
      error.textContent = reason.message;
      status.textContent = 'Upload failed. Existing photos were kept.';
    } finally {
      busy = false;
      fileInput.disabled = false;
      fileInput.value = '';
    }
  });
  render();
  return { getImages: () => [...images], isBusy: () => busy, hasChanged: () => changed };
}
function showCategoryCreator() {
  document.getElementById('dialog-content').innerHTML = /* HTML */ `<form id="new-category-form">
    <div class="dialog-heading">
      <div>
        <p class="admin-eyebrow">ORGANIZE YOUR STORE</p>
        <h2 id="dialog-title">Add category</h2>
      </div>
      <button type="button" class="dialog-close" data-close-dialog aria-label="Close category form">
        ×
      </button>
    </div>
    <label class="admin-form-label"
      >Category name<input
        id="new-category-name"
        maxlength="50"
        required
        placeholder="For example, Accessories"
    /></label>
    <p class="field-help">Categories appear in the product form and storefront filters.</p>
    <p id="category-form-error" class="admin-form-error" role="alert"></p>
    <div class="dialog-actions">
      <button type="button" class="admin-button secondary" data-close-dialog>Cancel</button
      ><button class="admin-button" type="submit">Add category</button>
    </div>
  </form>`;
  bindCloseDialog();
  document.getElementById('new-category-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const result = addCategory(document.getElementById('new-category-name').value);
    if (!result.ok) {
      document.getElementById('category-form-error').textContent = result.message;
      return;
    }
    adminDialog.close();
    renderAdmin();
    adminNotify('Category added. You can now assign products to it.');
  });
  adminDialog.showModal();
}
function renderCategories() {
  const categories = getCategories();
  adminMain.innerHTML =
    heading(
      'A place for every product.',
      'Organize your growing collection into categories.',
      '<button class="admin-button" data-new-category>' +
        adminIcon('plus') +
        ' Add category</button>',
    ) +
    /* HTML */ `<section class="category-grid">
      ${categories
        .map((category) => {
          const count = products.filter((p) => p.category === category).length;
          return /* HTML */ `<article class="admin-panel category-card">
            <span>${adminIcon('grid')}</span>
            <h2>${escapeHtml(category)}</h2>
            <p>
              ${count} ${count === 1 ? 'product' : 'products'} ·
              ${builtInCategories.includes(category) ? 'Built-in' : 'Custom category'}
            </p>
            <a class="subtle-link" href="#products" data-category-products="${escapeHtml(category)}"
              >Manage products ${adminIcon('arrow-right')}</a
            >
          </article>`;
        })
        .join('')}
    </section>`;
  document
    .querySelectorAll('[data-new-category]')
    .forEach((button) => button.addEventListener('click', showCategoryCreator));
  document.querySelectorAll('[data-category-products]').forEach((link) =>
    link.addEventListener('click', () => {
      adminFilters.family = link.dataset.categoryProducts;
      adminFilters.query = '';
      adminFilters.stock = 'All';
      adminFilters.productPage = 1;
    }),
  );
}
function showNewProduct() {
  document.getElementById('dialog-content').innerHTML = /* HTML */ `<form id="new-product-form">
    <div class="dialog-heading">
      <div>
        <p class="admin-eyebrow">GROW YOUR COLLECTION</p>
        <h2 id="dialog-title">Add product</h2>
      </div>
      <button
        type="button"
        class="dialog-close"
        data-close-dialog
        aria-label="Close new product form"
      >
        ×
      </button>
    </div>
    <div class="new-product-grid">
      <label class="admin-form-label full"
        >Product name<input
          id="new-product-name"
          maxlength="100"
          required
          placeholder="For example, Wireless Headphones" /></label
      ><label class="admin-form-label"
        >Brand<input id="new-product-brand" maxlength="50" placeholder="Optional" /></label
      ><label class="admin-form-label"
        >Category<select id="new-product-category">
          ${getCategories()
            .map((c) => /* HTML */ `<option>${escapeHtml(c)}</option>`)
            .join('')}
        </select></label
      ><label class="admin-form-label full"
        >Description<textarea
          id="new-product-description"
          rows="3"
          maxlength="1600"
          required
          placeholder="What makes this product useful?"
        ></textarea></label
      ><label class="admin-form-label"
        >Base price (USD)<input
          id="new-product-price"
          type="number"
          min="1"
          max="99999.99"
          step=".01"
          required /></label
      ><label class="admin-form-label"
        >Available units<input
          id="new-product-stock"
          type="number"
          min="0"
          max="9999"
          step="1"
          value="10"
          required /></label
      ><label class="admin-form-label full"
        >Colors<input
          id="new-product-colors"
          value="Default"
          maxlength="320"
          placeholder="Black, White"
        /><span class="field-help"
          >Separate names with commas. Up to 8 colors; all use the uploaded cover image.</span
        ></label
      ><label class="admin-form-label"
        >Storage sizes<input id="new-product-storage" placeholder="128GB, 256GB, 1TB" /><span
          class="field-help"
          >Optional. Leave blank for accessories.</span
        ></label
      ><label class="admin-form-label"
        >Memory (RAM)<input id="new-product-memory" placeholder="8GB, 16GB, 32GB" /><span
          class="field-help"
          >Optional. Use GB values.</span
        ></label
      >
    </div>
    ${imageUploadMarkup()}<label class="admin-toggle"
      ><input id="new-product-visible" type="checkbox" checked /><span
        ><strong>Visible in storefront</strong
        ><small>Uncheck to save it as a hidden product.</small></span
      ></label
    >
    <p id="new-product-error" class="admin-form-error" role="alert"></p>
    <div class="dialog-actions">
      <button type="button" class="admin-button secondary" data-close-dialog>Cancel</button
      ><button class="admin-button" type="submit">Create product ${adminIcon('plus')}</button>
    </div>
  </form>`;
  bindCloseDialog();
  const manager = bindImageManager(document.querySelector('#new-product-form .image-manager'));
  document.getElementById('new-product-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const error = document.getElementById('new-product-error');
    if (manager.isBusy()) {
      error.textContent = 'Wait until the photos finish processing.';
      return;
    }
    const split = (id) =>
        document
          .getElementById(id)
          .value.split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      storage = split('new-product-storage').map((s) => s.toUpperCase()),
      memory = split('new-product-memory').map((s) => s.toUpperCase());
    const result = createProduct({
      name: document.getElementById('new-product-name').value,
      brand: document.getElementById('new-product-brand').value,
      description: document.getElementById('new-product-description').value,
      category: document.getElementById('new-product-category').value,
      price: Number(document.getElementById('new-product-price').value),
      stock: Number(document.getElementById('new-product-stock').value),
      hidden: !document.getElementById('new-product-visible').checked,
      colors: split('new-product-colors'),
      storage: storage.length ? storage : ['Standard'],
      memory,
      images: manager.getImages(),
    });
    if (!result.ok) {
      error.textContent = result.message;
      return;
    }
    adminDialog.close();
    adminFilters.query = '';
    adminFilters.family = 'All';
    adminFilters.stock = 'All';
    adminFilters.productPage = Math.ceil(products.length / 12);
    if (location.hash !== '#products') location.hash = 'products';
    else renderAdmin();
    adminNotify('Product created. It is now available in this browser’s storefront.');
  });
  adminDialog.showModal();
}
