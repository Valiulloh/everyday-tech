const adminMain = document.getElementById('admin-main');
const adminDialog = document.getElementById('admin-dialog');
const adminFilters = {
  query: '',
  family: 'All',
  stock: 'All',
  productPage: 1,
  orderQuery: '',
  orderStatus: 'All',
  orderPage: 1,
  days: 7,
};
const adminMoney = (cents) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const adminDate = (value) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(value),
  );
function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
}
function adminIcon(name) {
  return /* HTML */ `<svg
    class="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <use href="images/icons.svg#${name}"></use>
  </svg>`;
}
function adminNotify(message) {
  const el = document.getElementById('admin-toast');
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(adminNotify.timer);
  adminNotify.timer = setTimeout(() => el.classList.remove('visible'), 5000);
}
function currentSection() {
  const hash = location.hash.slice(1);
  return ['overview', 'products', 'categories', 'orders'].includes(hash) ? hash : 'overview';
}
function badge(status) {
  return /* HTML */ `<span class="status-badge status-${status.toLowerCase()}"
    ><span></span>${status}</span
  >`;
}
function heading(title, subtitle, actions = '') {
  return /* HTML */ `<div class="admin-page-heading">
    <div>
      <p class="admin-eyebrow">EVERYDAY TECH / ${currentSection().toUpperCase()}</p>
      <h1>${title}</h1>
      <p>${subtitle}</p>
    </div>
    <div class="heading-actions">${actions}</div>
  </div>`;
}
function sampleButton() {
  return !storeState.sampleLoaded
    ? '<button class="admin-button secondary" data-load-samples>Load sample activity</button>'
    : '';
}
function orderRows(orders) {
  return orders
    .map(
      (order) =>
        /* HTML */ `<tr>
          <td>
            <button class="order-reference" data-view-order="${order.id}">${order.id}</button
            >${order.sample ? '<small class="sample-label">SAMPLE</small>' : ''}
          </td>
          <td>${adminDate(order.createdAt)}</td>
          <td>${order.items.reduce((s, item) => s + item.quantity, 0)} items</td>
          <td class="amount-cell">${adminMoney(order.total)}</td>
          <td>${badge(order.status)}</td>
          <td>
            <button
              class="table-action"
              data-view-order="${order.id}"
              aria-label="View order ${order.id}"
            >
              View ${adminIcon('arrow-right')}
            </button>
          </td>
        </tr>`,
    )
    .join('');
}
function recentOrders() {
  const orders = [...storeState.orders]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 5);
  return orders.length
    ? /* HTML */ `<div class="admin-table-scroll">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Quantity</th>
              <th>Total</th>
              <th>Status</th>
              <th><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            ${orderRows(orders)}
          </tbody>
        </table>
      </div>`
    : '<div class="admin-empty compact"><span>' +
        adminIcon('bag') +
        '</span><h3>No orders yet</h3><p>Complete a demo checkout or load sample activity to explore order management.</p></div>';
}
function revenueChart(days) {
  const bins = [];
  for (let index = Math.min(days, 14) - 1; index >= 0; index--) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - index);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    const amount = storeState.orders
      .filter(
        (o) =>
          o.status !== 'Cancelled' &&
          Date.parse(o.createdAt) >= date.getTime() &&
          Date.parse(o.createdAt) < end.getTime(),
      )
      .reduce((s, o) => s + o.total, 0);
    bins.push({
      label: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date),
      amount,
    });
  }
  const max = Math.max(1, ...bins.map((b) => b.amount));
  return /* HTML */ `<div class="chart-summary">
      <strong>${adminMoney(dashboardStats(days).revenue)}</strong
      ><span>Demo order value · includes shipping</span>
    </div>
    <div
      class="bar-chart"
      role="img"
      aria-label="Daily demo order values. ${bins.map((b) => b.label + ': ' + adminMoney(b.amount)).join('; ')}"
    >
      ${bins
        .map(
          (bin) =>
            /* HTML */ `<div class="chart-column">
              <div class="bar-track">
                <div
                  class="chart-bar ${bin.amount ? '' : 'zero'}"
                  style="height:${bin.amount ? Math.max(3, (bin.amount / max) * 100) : 2}%"
                >
                  <span>${adminMoney(bin.amount)}</span>
                </div>
              </div>
              <small>${bin.label}</small>
            </div>`,
        )
        .join('')}
    </div>
    <p class="chart-caption">
      ${days > 14 ? 'Daily bars show the latest 14 days. The total above covers all 30 days.' : 'Order values for the last 7 calendar days.'}
      Cancelled orders are excluded.
    </p>`;
}
function renderOverview() {
  const stats = dashboardStats(adminFilters.days);
  const cards = [
    ['Demo revenue', adminMoney(stats.revenue), 'Non-cancelled orders in this period', 'chart'],
    ['Orders', stats.orderCount, 'Demo checkouts + sample orders', 'bag'],
    ['Active products', stats.activeProducts, 'Visible in your storefront', 'grid'],
    ['Open orders', stats.openCount, 'Pending or processing', 'clock'],
  ];
  adminMain.innerHTML =
    heading(
      'Your store, at a glance.',
      'A clear view of your catalog, inventory, and demo orders.',
      sampleButton() +
        '<button class="admin-button" data-export="workspace">' +
        adminIcon('download') +
        ' Export data</button>',
    ) +
    /* HTML */ `<div class="overview-period">
        <span>Order metrics for the selected period</span
        ><label
          ><span class="sr-only">Overview period</span
          ><select id="overview-period">
            <option value="7" ${adminFilters.days === 7 ? 'selected' : ''}>Last 7 days</option>
            <option value="30" ${adminFilters.days === 30 ? 'selected' : ''}>Last 30 days</option>
          </select></label
        >
      </div>
      <div class="metric-grid">
        ${cards
          .map(
            ([label, value, note, icon]) =>
              /* HTML */ `<article class="metric-card">
                <div><span>${label}</span><span class="metric-icon">${adminIcon(icon)}</span></div>
                <strong>${value}</strong>
                <p>${note}</p>
              </article>`,
          )
          .join('')}
      </div>
      <div class="overview-grid">
        <section class="admin-panel revenue-panel">
          <div class="panel-heading">
            <div>
              <h2>Order activity</h2>
              <p>Every order tells a little story.</p>
            </div>
            <span class="live-label"><span></span> Browser data</span>
          </div>
          ${revenueChart(adminFilters.days)}
        </section>
        <section class="admin-panel inventory-panel">
          <div class="panel-heading">
            <div>
              <h2>Inventory pulse</h2>
              <p>Keep your next sale ready.</p>
            </div>
            ${adminIcon('devices')}
          </div>
          <div class="inventory-big">${stats.units}<span>units available</span></div>
          <div class="inventory-breakdown">
            ${getCategories()
              .map((family) => {
                const list = products.filter((p) => p.category === family && !p.hidden),
                  units = list.reduce((s, p) => s + p.stock, 0);
                return /* HTML */ `<div>
                  <span
                    >${adminIcon(family === 'iPhone' ? 'phone' : family === 'iPad' ? 'tablet' : 'laptop')}${escapeHtml(family)}</span
                  ><strong>${units}<small>${list.length} models</small></strong>
                </div>`;
              })
              .join('')}
          </div>
          <a class="inventory-link" href="#products"
            >${stats.lowStock ? stats.lowStock + ' models need a stock check' : 'Inventory is looking healthy'}
            ${adminIcon('arrow-right')}</a
          >
        </section>
      </div>
      <section class="admin-panel recent-orders">
        <div class="panel-heading">
          <div>
            <h2>Recent orders</h2>
            <p>Your latest demo orders, in one place.</p>
          </div>
          <a class="subtle-link" href="#orders">View all ${adminIcon('arrow-right')}</a>
        </div>
        ${recentOrders()}
      </section>
      <div class="overview-grid lower-grid">
        <section class="admin-panel">
          <div class="panel-heading">
            <div>
              <h2>Recent activity</h2>
              <p>Changes made in this browser.</p>
            </div>
          </div>
          ${renderActivity()}
        </section>
        <section class="admin-panel quick-start">
          <span class="quick-start-icon">${adminIcon('shield')}</span>
          <h2>Make it your workspace.</h2>
          <p>
            Edit a price or inventory count, then open the store in another tab. Your changes appear
            there automatically.
          </p>
          <a class="admin-button secondary" href="#products"
            >Manage products ${adminIcon('arrow-right')}</a
          >
          <p class="quick-note">
            Each visitor has an isolated demo. There is no shared customer database.
          </p>
        </section>
      </div>`;
  document.getElementById('overview-period').addEventListener('change', (event) => {
    adminFilters.days = Number(event.target.value);
    renderOverview();
    document.getElementById('overview-period').focus();
  });
  bindActions();
}
function renderActivity() {
  const list = [...storeState.activity].reverse().slice(0, 5);
  if (!list.length)
    return '<div class="activity-empty">Your activity will appear here after a product edit or demo order.</div>';
  return (
    '<ul class="activity-list">' +
    list
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        const text =
          item.type === 'product'
            ? (product?.name || 'Product') + ' updated'
            : item.type === 'order'
              ? 'New demo order ' + item.orderId
              : item.type === 'status'
                ? 'Order status updated: ' + item.orderId
                : item.type === 'category'
                  ? 'New category added'
                  : item.type === 'new-product'
                    ? 'New product added: ' + (product?.name || 'Product')
                    : 'Sample activity loaded';
        return /* HTML */ `<li>
          <span>${adminIcon(item.type === 'product' ? 'grid' : 'bag')}</span>
          <div><strong>${escapeHtml(text)}</strong><small>${adminDate(item.at)}</small></div>
        </li>`;
      })
      .join('') +
    '</ul>'
  );
}
function productResults() {
  const query = adminFilters.query.trim().toLowerCase();
  return products.filter(
    (p) =>
      (p.name + ' ' + p.specifications.Chip).toLowerCase().includes(query) &&
      (adminFilters.family === 'All' || p.category === adminFilters.family) &&
      (adminFilters.stock === 'All' ||
        (adminFilters.stock === 'Low' &&
          !p.hidden &&
          p.status !== 'Pre-order' &&
          p.stock > 0 &&
          p.stock <= 5) ||
        (adminFilters.stock === 'Out' && p.status !== 'Pre-order' && p.stock === 0) ||
        (adminFilters.stock === 'Hidden' && p.hidden)),
  );
}
function renderProducts() {
  adminMain.innerHTML =
    heading(
      'A well-kept collection.',
      'Manage ' + products.length + ' products, their photos, pricing, and inventory.',
      '<button class="admin-button secondary" data-export="products">' +
        adminIcon('download') +
        ' Export products</button><button class="admin-button" data-new-product>' +
        adminIcon('plus') +
        ' Add product</button>',
    ) +
    /* HTML */ `<section class="admin-panel">
      <div class="admin-filters">
        <label class="admin-search"
          ><span class="sr-only">Search products</span>${adminIcon('search')}<input
            id="admin-product-search"
            type="search"
            placeholder="Search model or chip…"
            value="${escapeHtml(adminFilters.query)}" /></label
        ><label
          ><span class="sr-only">Product family</span
          ><select id="admin-family">
            <option value="All">All families</option>
            ${getCategories()
              .map(
                (c) =>
                  /* HTML */ `<option ${adminFilters.family === c ? 'selected' : ''}>
                    ${escapeHtml(c)}
                  </option>`,
              )
              .join('')}
          </select></label
        ><label
          ><span class="sr-only">Stock filter</span
          ><select id="admin-stock">
            ${[
              ['All', 'All inventory'],
              ['Low', 'Low stock (1–5)'],
              ['Out', 'Out of stock'],
              ['Hidden', 'Hidden products'],
            ]
              .map(
                ([value, label]) =>
                  /* HTML */ `<option
                    value="${value}"
                    ${adminFilters.stock === value ? 'selected' : ''}
                  >
                    ${label}
                  </option>`,
              )
              .join('')}
          </select></label
        >
      </div>
      <div id="admin-product-table"></div>
    </section>`;
  document.getElementById('admin-product-search').addEventListener('input', (event) => {
    adminFilters.query = event.target.value;
    adminFilters.productPage = 1;
    renderProductTable();
  });
  for (const [id, key] of [
    ['admin-family', 'family'],
    ['admin-stock', 'stock'],
  ])
    document.getElementById(id).addEventListener('change', (event) => {
      adminFilters[key] = event.target.value;
      adminFilters.productPage = 1;
      renderProductTable();
    });
  renderProductTable();
  bindActions();
}
function pager(page, total, type) {
  const pages = Math.max(1, Math.ceil(total / 12));
  return /* HTML */ `<div class="admin-pagination">
    <span
      >${total ? (page - 1) * 12 + 1 + '–' + Math.min(page * 12, total) : '0'} of ${total}
      ${type === 'product' ? 'products' : 'orders'}</span
    >
    <div>
      <button
        class="pagination-button"
        data-page-type="${type}"
        data-page="${page - 1}"
        ${page <= 1 ? 'disabled' : ''}
      >
        ${adminIcon('arrow-left')} Previous</button
      ><span>${page} / ${pages}</span
      ><button
        class="pagination-button"
        data-page-type="${type}"
        data-page="${page + 1}"
        ${page >= pages ? 'disabled' : ''}
      >
        Next ${adminIcon('arrow-right')}
      </button>
    </div>
  </div>`;
}
function renderProductTable() {
  const results = productResults();
  adminFilters.productPage = Math.min(
    adminFilters.productPage,
    Math.max(1, Math.ceil(results.length / 12)),
  );
  const page = adminFilters.productPage;
  document.getElementById('admin-product-table').innerHTML = results.length
    ? /* HTML */ `<div class="admin-table-scroll">
          <table class="admin-table product-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Family</th>
                <th>Base price</th>
                <th>Inventory</th>
                <th>Visibility</th>
                <th><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              ${results
                .slice((page - 1) * 12, page * 12)
                .map(
                  (p) =>
                    /* HTML */ `<tr>
                      <td>
                        <div class="admin-product-cell">
                          <img src="${p.image}" alt="" width="48" height="48" loading="lazy" />
                          <div>
                            <strong>${escapeHtml(p.name)}</strong
                            ><small
                              >${p.options.colors.length} colors · ${p.options.storage.length}
                              storage tiers</small
                            >
                          </div>
                        </div>
                      </td>
                      <td><span class="family-tag">${escapeHtml(p.category)}</span></td>
                      <td class="amount-cell">${adminMoney(Math.round(p.price * 100))}</td>
                      <td>
                        ${p.status === 'Pre-order' ? '<span class="stock-label preview">Preview only</span>' : /* HTML */ `<span class="stock-label ${p.stock === 0 ? 'out' : p.stock <= 5 ? 'low' : ''}"><span></span>${p.stock} available</span>`}
                      </td>
                      <td>
                        <span class="visibility-label ${p.hidden ? 'hidden' : ''}"
                          >${p.hidden ? 'Hidden' : 'Visible'}</span
                        >
                      </td>
                      <td>
                        <button class="table-action" data-edit-product="${p.id}">
                          Edit ${adminIcon('arrow-right')}
                        </button>
                      </td>
                    </tr>`,
                )
                .join('')}
            </tbody>
          </table>
        </div>
        ${pager(page, results.length, 'product')}`
    : '<div class="admin-empty"><span>' +
      adminIcon('search') +
      '</span><h3>No products match.</h3><p>Try another search or change your filters.</p><button class="admin-button secondary" id="reset-product-filters">Reset filters</button></div>';
  document.getElementById('reset-product-filters')?.addEventListener('click', () => {
    adminFilters.query = '';
    adminFilters.family = 'All';
    adminFilters.stock = 'All';
    renderProducts();
  });
  bindTableActions();
}
function orderResults() {
  const query = adminFilters.orderQuery.trim().toLowerCase();
  return [...storeState.orders]
    .filter(
      (order) =>
        (order.id + ' ' + order.items.map((i) => i.name).join(' ')).toLowerCase().includes(query) &&
        (adminFilters.orderStatus === 'All' || order.status === adminFilters.orderStatus),
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
function renderOrders() {
  adminMain.innerHTML =
    heading(
      'From bag to doorstep.',
      'Review demo orders and move them through fulfillment.',
      sampleButton() +
        '<button class="admin-button secondary" data-export="orders">' +
        adminIcon('download') +
        ' Export orders</button>',
    ) +
    /* HTML */ `<section class="admin-panel">
      <div class="admin-filters">
        <label class="admin-search"
          ><span class="sr-only">Search orders</span>${adminIcon('search')}<input
            id="admin-order-search"
            type="search"
            placeholder="Search order reference or product…"
            value="${escapeHtml(adminFilters.orderQuery)}" /></label
        ><label
          ><span class="sr-only">Order status</span
          ><select id="admin-order-status">
            <option value="All">All statuses</option>
            ${ORDER_STATUSES.map((status) => /* HTML */ `<option ${adminFilters.orderStatus === status ? 'selected' : ''}>${status}</option>`).join('')}
          </select></label
        >
      </div>
      <div id="admin-order-table"></div>
    </section>`;
  document.getElementById('admin-order-search').addEventListener('input', (event) => {
    adminFilters.orderQuery = event.target.value;
    adminFilters.orderPage = 1;
    renderOrderTable();
  });
  document.getElementById('admin-order-status').addEventListener('change', (event) => {
    adminFilters.orderStatus = event.target.value;
    adminFilters.orderPage = 1;
    renderOrderTable();
  });
  renderOrderTable();
  bindActions();
}
function renderOrderTable() {
  const list = orderResults();
  adminFilters.orderPage = Math.min(
    adminFilters.orderPage,
    Math.max(1, Math.ceil(list.length / 12)),
  );
  document.getElementById('admin-order-table').innerHTML = list.length
    ? /* HTML */ `<div class="admin-table-scroll">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Quantity</th>
                <th>Total</th>
                <th>Status</th>
                <th><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              ${orderRows(list.slice((adminFilters.orderPage - 1) * 12, adminFilters.orderPage * 12))}
            </tbody>
          </table>
        </div>
        ${pager(adminFilters.orderPage, list.length, 'order')}`
    : '<div class="admin-empty"><span>' +
      adminIcon('bag') +
      '</span><h3>No orders to show.</h3><p>Try another filter, complete a storefront checkout, or load sample activity.</p><a class="admin-button secondary" href="index.html" target="_blank" rel="noopener">Visit storefront ' +
      adminIcon('arrow-up-right') +
      '</a></div>';
  bindTableActions();
}
function showProductEditor(id) {
  refreshStore();
  const p = products.find((p) => p.id === id);
  if (!p) return;
  document.getElementById('dialog-content').innerHTML = /* HTML */ `<form id="edit-product-form">
    <div class="dialog-heading">
      <div>
        <p class="admin-eyebrow">PRODUCT SETTINGS</p>
        <h2 id="dialog-title">Edit product</h2>
      </div>
      <button
        type="button"
        class="dialog-close"
        data-close-dialog
        aria-label="Close product editor"
      >
        ×
      </button>
    </div>
    <div class="editor-product">
      <img src="${p.image}" alt="" width="70" height="70" />
      <div>
        <strong>${escapeHtml(p.name)}</strong
        ><span>${escapeHtml(p.category)} · ${p.specifications.Chip}</span>
      </div>
    </div>
    <label class="admin-form-label"
      >Base price (USD)<input
        id="edit-price"
        name="price"
        type="number"
        min="1"
        max="99999.99"
        step="0.01"
        value="${p.price.toFixed(2)}"
        required
    /></label>
    <p class="field-help">Storage and memory upgrades are added to this base price.</p>
    <label class="admin-form-label"
      >Available units<input
        id="edit-stock"
        name="stock"
        type="number"
        min="0"
        max="9999"
        step="1"
        value="${p.stock}"
        ${p.status === 'Pre-order' ? 'disabled' : ''}
        required
    /></label>
    <p class="field-help">
      ${p.status === 'Pre-order' ? 'Announced models remain preview-only.' : 'Shared across all colors, storage, and memory configurations.'}
    </p>
    ${imageUploadMarkup()}<label class="admin-toggle"
      ><input id="edit-visible" type="checkbox" ${p.hidden ? '' : 'checked'} /><span
        ><strong>Visible in storefront</strong
        ><small>Hidden products are excluded from browsing and purchasing.</small></span
      ></label
    >
    <p id="editor-error" class="admin-form-error" role="alert"></p>
    <div class="dialog-actions">
      <button type="button" class="admin-button secondary" data-close-dialog>Cancel</button
      ><button class="admin-button" type="submit">Save changes ${adminIcon('check')}</button>
    </div>
  </form>`;
  bindCloseDialog();
  const imageManager = bindImageManager(
    document.querySelector('#edit-product-form .image-manager'),
    p.uploadedImages || [],
  );
  document.getElementById('edit-product-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (imageManager.isBusy()) {
      document.getElementById('editor-error').textContent = 'Wait until photos finish processing.';
      return;
    }
    const result = editProduct(id, {
      price: Number(document.getElementById('edit-price').value),
      stock: Number(document.getElementById('edit-stock').value),
      hidden: !document.getElementById('edit-visible').checked,
      ...(imageManager.hasChanged() ? { images: imageManager.getImages() } : {}),
    });
    if (!result.ok) {
      document.getElementById('editor-error').textContent = result.message;
      return;
    }
    adminDialog.close();
    renderAdmin();
    document.querySelector('[data-edit-product="' + id + '"]')?.focus();
    adminNotify('Product saved. The storefront is updated in this browser.');
  });
  adminDialog.showModal();
}
function showOrder(id) {
  refreshStore();
  const order = storeState.orders.find((o) => o.id === id);
  if (!order) return;
  const next = STATUS_TRANSITIONS[order.status];
  document.getElementById('dialog-content').innerHTML = /* HTML */ `<div class="dialog-heading">
      <div>
        <p class="admin-eyebrow">${order.sample ? 'SAMPLE ORDER' : 'DEMO CHECKOUT'}</p>
        <h2 id="dialog-title">Order details</h2>
      </div>
      <button type="button" class="dialog-close" data-close-dialog aria-label="Close order details">
        ×
      </button>
    </div>
    <div class="order-detail-meta">
      <strong>${order.id}</strong><span>${adminDate(order.createdAt)}</span>${badge(order.status)}
    </div>
    <div class="order-line-items">
      ${order.items
        .map((item) => {
          const p = products.find((p) => p.id === item.id);
          return /* HTML */ `<div>
            <img src="${configurationImage(p, item.configuration)}" alt="" width="55" height="55" />
            <div>
              <strong>${escapeHtml(item.name)}</strong
              ><small>${escapeHtml(configurationLabel(item.configuration))}</small
              ><small>Quantity ${item.quantity}</small>
            </div>
            <b>${adminMoney(item.unitPrice * item.quantity)}</b>
          </div>`;
        })
        .join('')}
    </div>
    <dl class="order-detail-totals">
      <div>
        <dt>Subtotal</dt>
        <dd>${adminMoney(order.subtotal)}</dd>
      </div>
      <div>
        <dt>Shipping</dt>
        <dd>${order.shipping ? adminMoney(order.shipping) : 'Complimentary'}</dd>
      </div>
      <div>
        <dt>Total</dt>
        <dd><strong>${adminMoney(order.total)}</strong></dd>
      </div>
    </dl>
    <p class="field-help">
      No customer identity or delivery details are stored.
      ${order.sample ? 'Sample orders do not affect inventory.' : 'Order prices are snapshots from checkout.'}
    </p>
    ${
      next.length
        ? /* HTML */ `<form id="order-status-form">
            <label class="admin-form-label"
              >Move order to<select id="next-order-status">
                ${next.map((status) => /* HTML */ `<option>${status}</option>`).join('')}
              </select></label
            >
            <p class="field-help">
              Cancelling an unshipped checkout restores its reserved inventory once.
            </p>
            <p id="order-status-error" class="admin-form-error" role="alert"></p>
            <div class="dialog-actions">
              <button type="button" class="admin-button secondary" data-close-dialog>Close</button
              ><button class="admin-button" type="submit">Update status</button>
            </div>
          </form>`
        : '<div class="dialog-actions"><button class="admin-button secondary" data-close-dialog>Close</button></div>'
    }`;
  bindCloseDialog();
  document.getElementById('order-status-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const nextStatus = document.getElementById('next-order-status').value,
      result = changeOrderStatus(id, nextStatus);
    if (!result.ok) {
      document.getElementById('order-status-error').textContent = result.message;
      return;
    }
    adminDialog.close();
    renderAdmin();
    adminNotify('Order moved to ' + nextStatus.toLowerCase() + '.');
  });
  adminDialog.showModal();
}
function bindCloseDialog() {
  document
    .querySelectorAll('[data-close-dialog]')
    .forEach((button) => button.addEventListener('click', () => adminDialog.close()));
}
function bindTableActions() {
  document
    .querySelectorAll('[data-edit-product]')
    .forEach((button) =>
      button.addEventListener('click', () => showProductEditor(Number(button.dataset.editProduct))),
    );
  document
    .querySelectorAll('[data-view-order]')
    .forEach((button) =>
      button.addEventListener('click', () => showOrder(button.dataset.viewOrder)),
    );
  document.querySelectorAll('[data-page-type]').forEach((button) =>
    button.addEventListener('click', () => {
      if (button.dataset.pageType === 'product') {
        adminFilters.productPage = Number(button.dataset.page);
        renderProductTable();
      } else {
        adminFilters.orderPage = Number(button.dataset.page);
        renderOrderTable();
      }
    }),
  );
}
function exportData(type) {
  refreshStore();
  if (type === 'workspace') {
    downloadFile(
      'everyday-tech-demo.json',
      JSON.stringify({ exportedAt: new Date().toISOString(), ...storeState }, null, 2),
      'application/json',
    );
    return;
  }
  const cell = (value) => {
    let text = String(value);
    if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const rows =
    type === 'products'
      ? [
          ['Model', 'Family', 'Base price USD', 'Stock', 'Visible'],
          ...productResults().map((p) => [
            p.name,
            p.category,
            p.price.toFixed(2),
            p.stock,
            !p.hidden,
          ]),
        ]
      : [
          ['Order', 'Date', 'Status', 'Sample', 'Total USD', 'Configurations'],
          ...orderResults().map((o) => [
            o.id,
            o.createdAt,
            o.status,
            o.sample,
            (o.total / 100).toFixed(2),
            o.items
              .map((i) => i.name + ' | ' + configurationLabel(i.configuration) + ' x' + i.quantity)
              .join('; '),
          ]),
        ];
  downloadFile(
    'everyday-tech-' + type + '.csv',
    rows.map((row) => row.map(cell).join(',')).join('\r\n'),
    'text/csv;charset=utf-8',
  );
}
function downloadFile(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type })),
    link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  adminNotify('Export downloaded.');
}
function bindActions() {
  document
    .querySelectorAll('[data-new-product]')
    .forEach((button) => button.addEventListener('click', showNewProduct));
  document.querySelectorAll('[data-load-samples]').forEach((button) =>
    button.addEventListener('click', () => {
      const result = loadSampleOrders();
      if (result.ok) renderAdmin();
      adminNotify(
        result.ok ? 'Eight labeled sample orders loaded. Inventory is unchanged.' : result.message,
      );
    }),
  );
  document
    .querySelectorAll('[data-export]')
    .forEach((button) => button.addEventListener('click', () => exportData(button.dataset.export)));
  if (currentSection() === 'overview') bindTableActions();
}
function renderAdmin() {
  const section = currentSection();
  document.title = section[0].toUpperCase() + section.slice(1) + ' | Everyday Tech Admin';
  document.getElementById('breadcrumb').textContent = section[0].toUpperCase() + section.slice(1);
  document.getElementById('product-nav-count').textContent = products.length;
  document.getElementById('order-nav-count').textContent = storeState.orders.filter((o) =>
    ['Pending', 'Processing'].includes(o.status),
  ).length;
  document.querySelectorAll('[data-section]').forEach((link) => {
    if (link.dataset.section === section) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  ({
    overview: renderOverview,
    products: renderProducts,
    categories: renderCategories,
    orders: renderOrders,
  })[section]();
}
window.addEventListener('hashchange', () => {
  renderAdmin();
  adminMain.focus();
});
window.addEventListener('storage', (event) => {
  if (event.key === STORE_KEY || event.key === null) {
    refreshStore();
    if (adminDialog.open) {
      adminDialog.close();
      adminNotify('Demo data changed in another tab. Reopen the item to edit its latest state.');
    }
    renderAdmin();
  }
});
renderAdmin();
if (storeStorageWarning)
  adminNotify('Saved demo data could not be loaded. Changes require available browser storage.');
