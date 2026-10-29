function icon(name) {
  return (
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><use href="images/icons.svg#' +
    name +
    '"></use></svg>'
  );
}

const money = (cents) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

const price = (value) => money(Math.round(value * 100));

function notify(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove('visible'), 5000);
}

function card(p) {
  return /* HTML */ `<article class="product-card">
    <a
      class="product-image"
      href="product.html?id=${p.id}"
      aria-label="View ${escapeStoreHtml(p.name)}"
      ><span class="product-tag">${escapeStoreHtml(p.tag)}</span
      ><img
        src="${p.image}"
        alt="${escapeStoreHtml(p.name)}"
        width="400"
        height="320"
        loading="lazy"
      /><span class="image-arrow">${icon('arrow-up-right')}</span></a
    >
    <div class="card-meta">
      <span>${escapeStoreHtml(p.category)}</span><span>${p.options.colors.length} colors</span>
    </div>
    <div class="card-title">
      <h3><a href="product.html?id=${p.id}">${escapeStoreHtml(p.name)}</a></h3>
      <strong><small>From </small>${price(p.price)}</strong>
    </div>
    <div class="card-swatches" aria-label="Available colors">
      ${p.options.colors.map((color) => /* HTML */ `<a href="product.html?id=${p.id}&amp;color=${encodeURIComponent(color.name)}" title="${escapeStoreHtml(color.name)}" aria-label="Configure ${escapeStoreHtml(p.name)} in ${escapeStoreHtml(color.name)}" style="--swatch:${color.hex}"></a>`).join('')}
    </div>
    <a class="add-button" href="product.html?id=${p.id}"
      >${p.stock > 0 ? 'Choose options' : 'Explore options'}<span>${icon('arrow-right')}</span></a
    >
  </article>`;
}

function heading(eyebrow, title, description = '') {
  return /* HTML */ `<div class="page-heading">
    <p class="eyebrow">${eyebrow}</p>
    <h1>${title}</h1>
    ${description ? /* HTML */ `<p>${description}</p>` : ''}
  </div>`;
}
