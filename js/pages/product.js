function detail() {
  const params = new URLSearchParams(location.search),
    p = products.find((p) => p.id === Number(params.get('id')));
  if (!p || p.hidden) {
    main.innerHTML =
      heading('NOT FOUND', 'This product isn’t here.') +
      '<a class="button" href="products.html">Explore the collection</a>';
    return;
  }
  const requested = {};
  for (const key of ['color', 'storage', 'memory'])
    if (params.has(key)) requested[key] = params.get(key);
  let selected = resolveConfiguration(p, requested) || defaultConfiguration(p);
  document.title = p.name + ' | Everyday Tech';
  function capacityGroup(key, label, values) {
    return /* HTML */ `<fieldset class="option-group">
      <legend>${label}</legend>
      <div class="capacity-options">
        ${values.map((value) => /* HTML */ `<label><input type="radio" name="${escapeStoreHtml(key)}" value="${escapeStoreHtml(value)}" ${selected[key] === value ? 'checked' : ''} required /><span>${escapeStoreHtml(value)}</span></label>`).join('')}
      </div>
    </fieldset>`;
  }
  main.innerHTML = /* HTML */ `<a class="back-link" href="products.html"
      >${icon('arrow-left')} Back to the collection</a
    >
    <section class="detail-layout">
      <div class="detail-image">
        <img
          id="configuration-image"
          src="${configurationImage(p, selected)}"
          alt="${escapeStoreHtml(p.name)} in ${escapeStoreHtml(selected.color)}"
          width="600"
          height="520"
        />
        <p id="image-caption">${escapeStoreHtml(selected.color)}</p>
        ${p.uploadedImages?.length > 1 ? /* HTML */ `<div class="product-gallery" aria-label="Product photos">${p.uploadedImages.map((image, index) => /* HTML */ `<button type="button" data-photo="${index}" aria-label="View product photo ${index + 1}" aria-pressed="${index === 0}"><img src="${image}" alt="" width="60" height="60" /></button>`).join('')}</div>` : ''}
      </div>
      <div class="detail-info">
        <p class="eyebrow">${escapeStoreHtml(p.category)} / ${escapeStoreHtml(p.tag)}</p>
        <h1>${escapeStoreHtml(p.name)}</h1>
        <p class="detail-price" id="configuration-price">
          ${money(configurationPrice(p, selected))}
        </p>
        <p class="description">${escapeStoreHtml(p.description)}</p>
        <p class="stock">
          <span></span
          >${p.stock > 0 ? p.stock + ' in demo stock across configurations' : p.status === 'Pre-order' ? 'Announced model · preview only' : 'Currently out of stock'}
        </p>
        <form id="add-form" class="configurator">
          <fieldset class="option-group">
            <legend>
              Color
              <span class="selected-color" id="selected-color"
                >— ${escapeStoreHtml(selected.color)}</span
              >
            </legend>
            <div class="color-options">
              ${p.options.colors.map((color) => /* HTML */ `<label title="${escapeStoreHtml(color.name)}"><input type="radio" name="color" value="${escapeStoreHtml(color.name)}" ${selected.color === color.name ? 'checked' : ''} required /><span class="color-dot" style="--swatch:${color.hex}"></span><span class="color-name">${escapeStoreHtml(color.name)}</span></label>`).join('')}
            </div>
          </fieldset>
          ${p.options.storage[0] === 'Standard' ? '' : capacityGroup('storage', 'Storage capacity', p.options.storage)}${p.options.memory.length ? capacityGroup('memory', 'Unified memory (RAM)', p.options.memory) : ''}${p.category === 'MacBook' ? '<p class="option-note">Higher memory tiers use the compatible CPU/GPU variant within this chip family.</p>' : /* HTML */ `<p class="option-note">${p.options.storage[0] === 'Standard' ? 'Choose your preferred color.' : 'Storage is space for apps, photos, and files. RAM is fixed for each hardware configuration.'}</p>`}
          <div class="configuration-recap">
            <span>Your selection</span
            ><strong id="configuration-label"
              >${escapeStoreHtml(configurationLabel(selected))}</strong
            >
          </div>
          <label for="quantity">Quantity</label>
          <div class="purchase-row">
            <input
              id="quantity"
              type="number"
              min="1"
              max="${Math.max(1, p.stock)}"
              value="1"
              required
              ${p.stock === 0 ? 'disabled' : ''}
            /><button class="button" type="submit" ${p.stock === 0 ? 'disabled' : ''}>
              ${p.stock === 0 ? (p.status === 'Pre-order' ? 'Preview only' : 'Out of stock') : 'Add to bag'}${icon('plus')}
            </button>
          </div>
          <p id="add-status" role="status" aria-live="polite"></p>
          <p id="selection-status" class="sr-only" role="status" aria-live="polite"></p>
        </form>
        <p class="shipping-note">
          Prices and upgrade costs are illustrative demo values. Colors have no extra charge.
        </p>
        ${p.optionsSource ? /* HTML */ `<a class="source-link" href="${p.optionsSource}" target="_blank" rel="noopener noreferrer">View Apple specifications ${icon('arrow-up-right')}</a>` : ''}
        <details>
          <summary>The details</summary>
          <dl>
            ${Object.entries(p.specifications)
              .map(
                ([key, value]) =>
                  /* HTML */ `<div>
                    <dt>${escapeStoreHtml(key)}</dt>
                    <dd>${escapeStoreHtml(value)}</dd>
                  </div>`,
              )
              .join('')}
          </dl>
        </details>
      </div>
    </section>
    <section class="collection">
      <div class="section-heading">
        <div>
          <p class="eyebrow">BETTER TOGETHER</p>
          <h2>Keep exploring.</h2>
        </div>
      </div>
      <div class="product-grid">${relatedProducts(p).map(card).join('')}</div>
    </section>`;
  document.querySelectorAll('[data-photo]').forEach((button) =>
    button.addEventListener('click', () => {
      const index = Number(button.dataset.photo);
      document.getElementById('configuration-image').src = p.uploadedImages[index];
      document.getElementById('configuration-image').alt = p.name + ' photo ' + (index + 1);
      document.getElementById('image-caption').textContent = 'Product photo ' + (index + 1);
      document
        .querySelectorAll('[data-photo]')
        .forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    }),
  );
  const form = document.getElementById('add-form');
  form.addEventListener('change', (event) => {
    if (!['color', 'storage', 'memory'].includes(event.target.name)) return;
    const candidate = resolveConfiguration(p, {
      ...selected,
      [event.target.name]: event.target.value,
    });
    if (!candidate) return;
    selected = candidate;
    const image = document.getElementById('configuration-image');
    image.src = configurationImage(p, selected);
    image.alt = p.name + ' in ' + selected.color;
    document.getElementById('image-caption').textContent = selected.color;
    document.getElementById('selected-color').textContent = '— ' + selected.color;
    document.getElementById('configuration-price').textContent = money(
      configurationPrice(p, selected),
    );
    document.getElementById('configuration-label').textContent = configurationLabel(selected);
    document.getElementById('selection-status').textContent =
      configurationLabel(selected) + ', ' + money(configurationPrice(p, selected));
    document.getElementById('add-status').textContent = '';
    const query = new URLSearchParams({
      id: String(p.id),
      color: selected.color,
      storage: selected.storage,
    });
    if (selected.memory) query.set('memory', selected.memory);
    history.replaceState(null, '', location.pathname + '?' + query);
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = addToCart(p.id, Number(document.getElementById('quantity').value), selected);
    document.getElementById('add-status').textContent = result.message;
  });
}
