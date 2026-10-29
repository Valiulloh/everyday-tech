function checkout() {
  if (!cart.length) {
    main.innerHTML =
      heading('CHECKOUT', 'Your bag is empty.') +
      '<a class="button" href="products.html">Explore the collection <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><use href="images/icons.svg#arrow-up-right"></use></svg></a>';
    return;
  }
  const reviewedTotal = cartTotals().total;
  main.innerHTML =
    heading(
      'ALMOST YOURS',
      'The final details.',
      'A sample checkout to complete your shopping experience.',
    ) +
    /* HTML */ `<div class="demo-note">
        <strong>This is a demo.</strong> Use fictional details. No payment, shipment, or email will
        be sent. Delivery details stay on this page and are not saved. Order items, totals, and
        status are saved in this browser for the demo dashboard.
      </div>
      <div class="cart-layout">
        <form id="checkout-form" class="checkout-form">
          <h2>Delivery details</h2>
          <div class="form-grid">
            <label
              >First name<input
                name="firstName"
                autocomplete="given-name"
                required
                maxlength="60" /></label
            ><label
              >Last name<input
                name="lastName"
                autocomplete="family-name"
                required
                maxlength="60" /></label
            ><label class="full"
              >Email address<input
                type="email"
                name="email"
                autocomplete="email"
                required
                maxlength="120" /></label
            ><label class="full"
              >Street address<input
                name="address"
                autocomplete="street-address"
                required
                maxlength="160" /></label
            ><label
              >City<input
                name="city"
                autocomplete="address-level2"
                required
                maxlength="80" /></label
            ><label
              >Postal code<input
                name="postal"
                autocomplete="postal-code"
                required
                maxlength="20" /></label
            ><label class="full"
              >Country / region<select name="country" autocomplete="country-name" required>
                <option value="">Select country / region</option>
                <option>Uzbekistan</option>
                <option>United States</option>
                <option>United Kingdom</option>
                <option>Canada</option>
                <option>Germany</option>
                <option>Other</option>
              </select></label
            >
          </div>
          <fieldset>
            <legend>Payment</legend>
            <p>Demo payment · No card details needed.</p>
          </fieldset>
          <label class="checkbox"
            ><input type="checkbox" required /> I understand this is a demo order.</label
          >
          <p id="form-error" role="alert"></p>
          <button class="button" type="submit">
            Place demo order
            <span
              ><svg
                class="icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <use href="images/icons.svg#arrow-right"></use></svg
            ></span></button
          ><a class="continue-link" href="cart.html"
            ><svg
              class="icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <use href="images/icons.svg#arrow-left"></use>
            </svg>
            Return to bag</a
          >
        </form>
        ${summary(true)}
      </div>`;
  document.getElementById('checkout-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    for (const input of form.querySelectorAll('input:not([type=checkbox])')) {
      if (!input.value.trim()) {
        document.getElementById('form-error').textContent = 'Please complete all delivery details.';
        input.focus();
        return;
      }
    }
    const placed = placeDemoOrder(cart, reviewedTotal);
    if (!placed.ok) {
      document.getElementById('form-error').textContent = placed.message;
      return;
    }
    const total = placed.order.total;
    const orderedItems = cart
      .map((item) => {
        const p = products.find((p) => p.id === item.id);
        return (
          '<li><strong>' +
          escapeStoreHtml(p.name) +
          ' × ' +
          item.quantity +
          '</strong><span>' +
          configurationLabel(item.configuration) +
          '</span></li>'
        );
      })
      .join('');
    const order = placed.order.id;
    cart = [];
    saveCart();
    main.innerHTML = /* HTML */ `<section class="confirmation">
      <span class="confirmation-check" aria-hidden="true"
        ><svg
          class="icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <use href="images/icons.svg#check"></use></svg
      ></span>
      <p class="eyebrow">YOUR DEMO ORDER IS COMPLETE</p>
      <h1>A good day for an upgrade.</h1>
      <p>Thanks for trying Everyday Tech. Your sample order has been placed.</p>
      <div class="confirmation-receipt">
        <span>Reference <strong>${order}</strong></span
        ><span>Demo total <strong>${money(total)}</strong></span>
      </div>
      <ul class="confirmation-items">
        ${orderedItems}
      </ul>
      <p class="muted">
        No payment was taken. Nothing will be shipped.<br />This order is saved locally in the demo
        dashboard.
      </p>
      <a class="button" href="products.html"
        >Keep exploring
        <svg
          class="icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <use href="images/icons.svg#arrow-up-right"></use></svg
      ></a>
    </section>`;
    main.focus();
  });
}
