function summary(checkout = false) {
  const t = cartTotals();
  return /* HTML */ `<aside class="order-summary">
    <p class="eyebrow">THE OVERVIEW</p>
    <h2>Order summary</h2>
    ${
      checkout
        ? cart
            .map((item) => {
              const p = products.find((p) => p.id === item.id);
              return /* HTML */ `<div class="summary-product">
                <div>
                  <span>${escapeStoreHtml(p.name)} × ${item.quantity}</span
                  ><small>${escapeStoreHtml(configurationLabel(item.configuration))}</small>
                </div>
                <b>${money(configurationPrice(p, item.configuration) * item.quantity)}</b>
              </div>`;
            })
            .join('')
        : ''
    }
    <dl>
      <div>
        <dt>Subtotal</dt>
        <dd>${money(t.subtotal)}</dd>
      </div>
      <div>
        <dt>Shipping</dt>
        <dd>${t.shipping ? money(t.shipping) : 'Complimentary'}</dd>
      </div>
    </dl>
    <div class="total"><span>Total</span><strong>${money(t.total)}</strong></div>
    <p class="muted">USD · Demo pricing. No payment will be collected.</p>
    ${checkout ? '' : /* HTML */ `<a class="button" href="checkout.html">Continue to checkout ${icon('arrow-right')}</a><a class="continue-link" href="products.html">Continue exploring</a>`}
  </aside>`;
}

function cartPage(focusKey) {
  main.innerHTML =
    heading(
      'YOUR SELECTION',
      'Your shopping bag.',
      cart.reduce((s, i) => s + i.quantity, 0) + ' items, configured for your everyday.',
    ) +
    (cart.length
      ? /* HTML */ `<div class="cart-layout">
          <section aria-label="Bag items">
            ${cart
              .map((item) => {
                const p = products.find((p) => p.id === item.id),
                  query = new URLSearchParams({
                    id: String(p.id),
                    color: item.configuration.color,
                    storage: item.configuration.storage,
                  });
                if (item.configuration.memory) query.set('memory', item.configuration.memory);
                return /* HTML */ `<article class="cart-item">
                  <a class="cart-image" href="product.html?${query}"
                    ><img
                      src="${configurationImage(p, item.configuration)}"
                      alt="${escapeStoreHtml(p.name)} in ${item.configuration.color}"
                      width="160"
                      height="160"
                  /></a>
                  <div class="cart-item-info">
                    <p class="eyebrow">${escapeStoreHtml(p.category)}</p>
                    <h2><a href="product.html?${query}">${escapeStoreHtml(p.name)}</a></h2>
                    <p class="cart-configuration">
                      ${escapeStoreHtml(configurationLabel(item.configuration))}
                    </p>
                    <p>${money(configurationPrice(p, item.configuration))} each</p>
                    <div class="quantity-controls">
                      <button
                        data-action="decrease"
                        data-key="${item.key}"
                        data-focus="decrease-${item.key}"
                        aria-label="Decrease ${escapeStoreHtml(p.name)}, ${escapeStoreHtml(configurationLabel(item.configuration))}, quantity"
                      >
                        ${icon('minus')}</button
                      ><span aria-label="Quantity">${item.quantity}</span
                      ><button
                        data-action="increase"
                        data-key="${item.key}"
                        data-focus="increase-${item.key}"
                        aria-label="Increase ${escapeStoreHtml(p.name)}, ${escapeStoreHtml(configurationLabel(item.configuration))}, quantity"
                        ${modelQuantity(p.id) >= p.stock ? 'disabled' : ''}
                      >
                        ${icon('plus')}</button
                      ><button
                        class="remove"
                        data-action="remove"
                        data-key="${item.key}"
                        data-focus="remove-${item.key}"
                        aria-label="Remove ${escapeStoreHtml(p.name)}, ${escapeStoreHtml(configurationLabel(item.configuration))}, from bag"
                      >
                        ${icon('trash')}<span>Remove</span>
                      </button>
                    </div>
                    ${modelQuantity(p.id) >= p.stock ? '<small>Model stock limit reached</small>' : ''}
                  </div>
                  <strong
                    >${money(configurationPrice(p, item.configuration) * item.quantity)}</strong
                  >
                </article>`;
              })
              .join('')}
          </section>
          ${summary()}
        </div>`
      : /* HTML */ `<div class="empty">
          <span class="empty-symbol">${icon('bag')}</span>
          <h2>A little room for possibility.</h2>
          <p>Your bag is empty. Find an essential you’ll love.</p>
          <a class="button" href="products.html">Explore the collection ${icon('arrow-right')}</a>
        </div>`);
  document.querySelectorAll('[data-action]').forEach((button) =>
    button.addEventListener('click', () => {
      const key = button.dataset.key,
        item = cart.find((item) => item.key === key);
      if (!item) return;
      const product = products.find((p) => p.id === item.id);
      if (
        button.dataset.action === 'remove' ||
        (button.dataset.action === 'decrease' && item.quantity === 1)
      )
        cart = cart.filter((item) => item.key !== key);
      else if (button.dataset.action === 'decrease') item.quantity--;
      else if (modelQuantity(item.id) < product.stock) item.quantity++;
      saveCart();
      cartPage(button.dataset.focus);
      notify('Your bag has been updated.');
    }),
  );
  if (focusKey) {
    const focus =
      document.querySelector('[data-focus="' + focusKey + '"]:not(:disabled)') ||
      document.querySelector('[data-action]') ||
      main;
    focus.focus();
  }
}
