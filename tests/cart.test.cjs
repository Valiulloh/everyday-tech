const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function app(saved = null, blocked = false) {
  let persisted;
  const context = vm.createContext({
    localStorage: {
      getItem() {
        if (blocked) throw Error('blocked');
        return saved;
      },
      setItem(key, value) {
        if (blocked) throw Error('blocked');
        persisted = value;
      },
    },
    document: { getElementById: () => null },
  });
  vm.runInContext(
    ['products.js', 'store.js', 'cart.js', 'catalog-utils.js']
      .map((f) => fs.readFileSync('js/' + f, 'utf8'))
      .join('\n'),
    context,
  );
  return {
    run: (source) => JSON.parse(vm.runInContext('JSON.stringify(' + source + ')', context)),
    persisted: () => persisted,
  };
}
const catalog = app().run('products');
function expectedItem(product, quantity) {
  const a = app();
  const configuration = a.run(`defaultConfiguration(products.find(p=>p.id===${product.id}))`);
  const key = a.run(`configurationKey(${product.id},${JSON.stringify(configuration)})`);
  return { id: product.id, key, configuration, quantity };
}
const p = catalog.find((p) => p.stock > 0),
  q = catalog.find((p) => p.category === 'MacBook' && p.stock > 0),
  preview = catalog.find((p) => p.stock === 0);
test('adding and persisting a product respects stock', () => {
  const a = app();
  assert.equal(a.run(`addToCart(${p.id},${p.stock})`).ok, true);
  assert.equal(a.run(`addToCart(${p.id})`).ok, false);
  assert.deepEqual(JSON.parse(a.persisted()), [expectedItem(p, p.stock)]);
});
test('cart survives a reload and computes cents', () => {
  const a = app(JSON.stringify([expectedItem(q, 3)]));
  assert.deepEqual(a.run('cart'), [expectedItem(q, 3)]);
  assert.equal(a.run('cartTotals()').total, Math.round(q.price * 100) * 3);
});
test('corrupted or wrong-shaped storage resets safely', () => {
  for (const saved of ['invalid', '{}', 'null', '42']) assert.deepEqual(app(saved).run('cart'), []);
});
test('saved entries are validated, merged and clamped', () => {
  const a = app(
    JSON.stringify([
      { id: p.id, quantity: p.stock },
      { id: p.id, quantity: 8 },
      { id: q.id, quantity: -1 },
      { id: q.id, quantity: 1.5 },
      { id: 999, quantity: 1 },
      { id: 1, quantity: 2 },
      null,
    ]),
  );
  assert.deepEqual(a.run('cart'), [expectedItem(p, p.stock)]);
});
test('invalid input cannot mutate cart', () => {
  const a = app();
  for (const call of [
    'addToCart(999)',
    `addToCart(${p.id},0)`,
    `addToCart(${p.id},-1)`,
    `addToCart(${p.id},1.5)`,
    `addToCart(${p.id},NaN)`,
  ])
    assert.equal(a.run(call).ok, false);
  assert.deepEqual(a.run('cart'), []);
});
test('pre-order previews cannot be added or restored to the bag', () => {
  const a = app(JSON.stringify([{ id: preview.id, quantity: 1 }]));
  assert.deepEqual(a.run('cart'), []);
  assert.equal(a.run(`addToCart(${preview.id})`).ok, false);
});
test('totals use cents and free shipping applies', () => {
  const a = app();
  assert.deepEqual(a.run('cartTotals()'), { subtotal: 0, shipping: 0, total: 0 });
  a.run(`addToCart(${p.id},3)`);
  a.run(`addToCart(${q.id},2)`);
  const expected = Math.round(p.price * 100) * 3 + Math.round(q.price * 100) * 2;
  assert.deepEqual(a.run('cartTotals()'), { subtotal: expected, shipping: 0, total: expected });
});
test('unavailable browser storage keeps a usable in-memory cart', () => {
  const a = app(null, true);
  assert.equal(a.run('storageWarning'), true);
  assert.equal(a.run(`addToCart(${q.id})`).ok, true);
  assert.deepEqual(a.run('cart'), [expectedItem(q, 1)]);
});
test('all pages reference existing local assets and navigation', () => {
  for (const page of [
    'index.html',
    'products.html',
    'product.html',
    'cart.html',
    'checkout.html',
  ]) {
    const html = fs.readFileSync(page, 'utf8');
    for (const [, target] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      if (target.startsWith('#') || target.startsWith('http')) continue;
      assert.ok(fs.existsSync(target.split(/[?#]/)[0]), page + ' -> ' + target);
    }
  }
});
test('all JavaScript files parse', () => {
  for (const name of fs.readdirSync('js', { recursive: true }))
    if (name.endsWith('.js'))
      new vm.Script(fs.readFileSync('js/' + name, 'utf8'), { filename: name });
});
test('catalog has 61 unique models and valid local JPEGs', () => {
  assert.equal(catalog.length, 61);
  assert.equal(new Set(catalog.map((p) => p.id)).size, 61);
  assert.equal(new Set(catalog.map((p) => p.name)).size, 61);
  for (const product of catalog) {
    assert.ok(product.source.startsWith('https://www.apple.com/'));
    assert.ok(product.price > 0);
    assert.ok(Number.isInteger(product.stock) && product.stock >= 0);
    const bytes = fs.readFileSync(product.image);
    assert.equal(bytes[0], 255);
    assert.equal(bytes[1], 216);
  }
  assert.deepEqual(
    Object.fromEntries(
      ['iPhone', 'iPad', 'MacBook'].map((c) => [c, catalog.filter((p) => p.category === c).length]),
    ),
    { iPhone: 17, iPad: 17, MacBook: 27 },
  );
});
test('combined search, family, generation, sorting and no-results states', () => {
  const a = app();
  const result = a.run(
    'filterProducts({query:"pro",category:"MacBook",generation:"M4",sort:"price-low"})',
  );
  assert.equal(result.length, 5);
  assert.ok(result.every((p) => p.category === 'MacBook' && p.generation === 'M4'));
  assert.deepEqual(
    result.map((p) => p.price),
    result.map((p) => p.price).sort((a, b) => a - b),
  );
  assert.deepEqual(a.run('filterProducts({query:"does not exist"})'), []);
  assert.equal(a.run('filterProducts({category:"iPad",generation:"M3"})').length, 2);
  assert.equal(a.run('filterProducts({query:"  IPHONE 15  "})').length, 4);
  assert.equal(a.run('filterProducts()').length, 61);
});
test('related items stay within the family, exclude self and cap at three', () => {
  const a = app();
  for (const product of catalog) {
    const result = a.run(`relatedProducts(products.find(p=>p.id===${product.id}))`);
    assert.equal(result.length, 3);
    assert.ok(
      result.every((p) => p.category === product.category && p.id !== product.id && p.stock > 0),
    );
  }
});
test('every model renders a complete detail page, with preview purchasing disabled', () => {
  for (const product of catalog) {
    const main = { innerHTML: '', focus() {} };
    const document = {
      body: { dataset: { page: 'detail' } },
      getElementById(id) {
        return id === 'main'
          ? main
          : { textContent: '', addEventListener() {}, classList: { add() {}, remove() {} } };
      },
      querySelectorAll() {
        return [];
      },
    };
    const context = vm.createContext({
      document,
      localStorage: { getItem: () => null },
      location: { search: '?id=' + product.id },
      URLSearchParams,
      Intl,
      setTimeout,
      clearTimeout,
      window: { addEventListener() {} },
    });
    vm.runInContext(
      [
        'products.js',
        'store.js',
        'cart.js',
        'catalog-utils.js',
        'ui.js',
        'pages/home.js',
        'pages/catalog.js',
        'pages/product.js',
        'pages/cart.js',
        'pages/checkout.js',
        'app.js',
      ]
        .map((f) => fs.readFileSync('js/' + f, 'utf8'))
        .join('\n'),
      context,
    );
    assert.ok(main.innerHTML.includes(product.name));
    assert.ok(main.innerHTML.includes(product.image));
    assert.ok(main.innerHTML.includes(product.specifications.Chip));
    assert.ok(!main.innerHTML.includes('undefined'));
    if (product.stock === 0)
      assert.match(main.innerHTML, /<button class="button" type="submit" disabled>/);
  }
});

test('every device has supported options and a valid local photo for each color', () => {
  for (const product of catalog) {
    assert.ok(product.options.colors.length >= 2);
    assert.ok(product.options.storage.length >= 2);
    assert.equal(
      new Set(product.options.colors.map((c) => c.name)).size,
      product.options.colors.length,
    );
    assert.equal(new Set(product.options.storage).size, product.options.storage.length);
    assert.equal(product.options.memory.length > 0, product.category === 'MacBook');
    for (const color of product.options.colors) {
      assert.match(color.hex, /^#[a-f0-9]{6}$/i);
      const bytes = fs.readFileSync(color.image);
      assert.equal(bytes[0], 255);
      assert.equal(bytes[1], 216);
    }
    if (product.specifications.Chip === 'M3 Pro') {
      assert.deepEqual(product.options.memory, ['18GB', '36GB']);
      assert.ok(!product.options.storage.includes('8TB'));
    }
    if (product.specifications.Chip === 'M4 Pro')
      assert.ok(!product.options.memory.includes('128GB'));
  }
});
test('different configurations stay separate while identical configurations merge', () => {
  const a = app(),
    one = {
      color: p.options.colors[0].name,
      storage: p.options.storage[0],
      memory: p.options.memory[0] || '',
    },
    two = { ...one, color: p.options.colors[1].name };
  assert.equal(a.run(`addToCart(${p.id},1,${JSON.stringify(one)})`).ok, true);
  assert.equal(a.run(`addToCart(${p.id},2,${JSON.stringify(two)})`).ok, true);
  a.run(`addToCart(${p.id},1,${JSON.stringify(one)})`);
  const items = a.run('cart');
  assert.equal(items.length, 2);
  assert.equal(items[0].quantity, 2);
  assert.equal(items[1].quantity, 2);
  assert.notEqual(items[0].key, items[1].key);
  assert.deepEqual(app(a.persisted()).run('cart'), items);
});
test('stock is shared across every configuration of the model', () => {
  const a = app(),
    one = { color: p.options.colors[0].name, storage: p.options.storage[0] },
    two = { ...one, color: p.options.colors[1].name };
  a.run(`addToCart(${p.id},${p.stock - 1},${JSON.stringify(one)})`);
  assert.equal(a.run(`addToCart(${p.id},1,${JSON.stringify(two)})`).ok, true);
  assert.equal(a.run(`addToCart(${p.id},1,${JSON.stringify(two)})`).ok, false);
  assert.equal(a.run(`modelQuantity(${p.id})`), p.stock);
  const loaded = app(
    JSON.stringify([
      { id: p.id, quantity: p.stock, configuration: one },
      { id: p.id, quantity: p.stock, configuration: two },
    ]),
  );
  assert.equal(loaded.run(`modelQuantity(${p.id})`), p.stock);
});
test('unsupported or tampered configurations are rejected without saving', () => {
  const a = app();
  for (const config of [
    { color: '<script>bad</script>' },
    { storage: '99TB' },
    { memory: '999GB' },
    'invalid',
    null,
  ]) {
    assert.equal(a.run(`addToCart(${q.id},1,${JSON.stringify(config)})`).ok, false);
    assert.deepEqual(
      app(JSON.stringify([{ id: q.id, quantity: 1, configuration: config }])).run('cart'),
      [],
    );
  }
  assert.deepEqual(a.run('cart'), []);
});
test('legacy carts migrate to an explicit default configuration', () => {
  const a = app(JSON.stringify([{ id: p.id, quantity: 2 }]));
  const item = a.run('cart[0]');
  assert.deepEqual(item, expectedItem(p, 2));
});
test('upgraded storage and memory prices are included in totals after reload', () => {
  const a = app(),
    mac = catalog.find((p) => p.category === 'MacBook' && p.options.memory.length > 1),
    configuration = {
      color: mac.options.colors.at(-1).name,
      storage: mac.options.storage.at(-1),
      memory: mac.options.memory.at(-1),
    };
  const amount = a.run(
    `configurationPrice(products.find(p=>p.id===${mac.id}),${JSON.stringify(configuration)})`,
  );
  assert.ok(Number.isInteger(amount));
  assert.ok(amount > Math.round(mac.price * 100));
  a.run(`addToCart(${mac.id},2,${JSON.stringify(configuration)})`);
  assert.equal(a.run('cartTotals()').total, amount * 2);
  assert.equal(app(a.persisted()).run('cartTotals()').total, amount * 2);
});
function pageContext(product, saved = null, page = 'detail') {
  const nodes = new Map();
  function node(id) {
    if (!nodes.has(id))
      nodes.set(id, {
        innerHTML: '',
        textContent: '',
        value: id === 'quantity' ? '1' : '',
        listeners: {},
        classList: { add() {}, remove() {} },
        addEventListener(event, callback) {
          this.listeners[event] = callback;
        },
        querySelectorAll() {
          return [];
        },
        focus() {},
      });
    return nodes.get(id);
  }
  const document = {
    body: { dataset: { page } },
    getElementById: node,
    querySelectorAll(selector) {
      if (selector !== '[data-action]') return [];
      return [...node('main').innerHTML.matchAll(/<button[^>]*data-action="[^"]+"[^>]*>/g)].map(
        (match) => {
          const dataset = Object.fromEntries(
            [...match[0].matchAll(/data-(action|key|focus)="([^"]*)"/g)].map((m) => [m[1], m[2]]),
          );
          const button = node(dataset.action + '-' + dataset.key);
          button.dataset = dataset;
          return button;
        },
      );
    },
    querySelector: () => null,
  };
  let persisted;
  const history = {
    last: '',
    replaceState(a, b, url) {
      this.last = url;
    },
  };
  const context = vm.createContext({
    document,
    localStorage: {
      getItem: () => saved,
      setItem: (key, value) => {
        persisted = value;
      },
    },
    location: {
      search: product ? '?id=' + product.id : '',
      pathname: page === 'detail' ? '/product.html' : '/checkout.html',
    },
    history,
    URLSearchParams,
    Intl,
    setTimeout: () => 0,
    clearTimeout() {},
    window: { addEventListener() {} },
  });
  vm.runInContext(
    [
      'products.js',
      'store.js',
      'cart.js',
      'catalog-utils.js',
      'ui.js',
      'pages/home.js',
      'pages/catalog.js',
      'pages/product.js',
      'pages/cart.js',
      'pages/checkout.js',
      'app.js',
    ]
      .map((f) => fs.readFileSync('js/' + f, 'utf8'))
      .join('\n'),
    context,
  );
  return {
    node,
    history,
    buttons: () => document.querySelectorAll('[data-action]'),
    run: (source) => JSON.parse(vm.runInContext('JSON.stringify(' + source + ')', context)),
    persisted: () => persisted,
  };
}
test('every product responds to color and capacity changes and submits the chosen variant', () => {
  for (const product of catalog) {
    const page = pageContext(product),
      form = page.node('add-form'),
      selected = {
        color: product.options.colors.at(-1).name,
        storage: product.options.storage.at(-1),
        memory: product.options.memory.at(-1) || '',
      };
    for (const [name, value] of Object.entries(selected))
      if (name !== 'memory' || value) form.listeners.change({ target: { name, value } });
    assert.equal(page.node('configuration-image').src, product.options.colors.at(-1).image);
    assert.ok(page.node('configuration-label').textContent.includes(selected.color));
    assert.ok(page.node('configuration-label').textContent.includes(selected.storage));
    assert.ok(page.history.last.includes('storage='));
    form.listeners.submit({ preventDefault() {} });
    const cart = page.run('cart');
    if (product.stock > 0) {
      assert.equal(cart.length, 1);
      assert.deepEqual(cart[0].configuration, selected);
    } else assert.equal(cart.length, 0);
  }
});
test('checkout and order confirmation show the chosen configuration and clear the bag', () => {
  const a = app(),
    config = {
      color: q.options.colors.at(-1).name,
      storage: q.options.storage.at(-1),
      memory: q.options.memory.at(-1),
    };
  a.run(`addToCart(${q.id},1,${JSON.stringify(config)})`);
  const page = pageContext(null, a.persisted(), 'checkout');
  assert.ok(page.node('main').innerHTML.includes(config.color));
  assert.ok(page.node('main').innerHTML.includes(config.storage + ' storage'));
  page.node('checkout-form').listeners.submit({
    preventDefault() {},
    currentTarget: { querySelectorAll: () => [{ value: 'Demo details' }] },
  });
  assert.ok(page.node('main').innerHTML.includes(config.color));
  assert.ok(page.node('main').innerHTML.includes(config.memory + ' memory'));
  assert.deepEqual(page.run('cart'), []);
  assert.deepEqual(JSON.parse(page.persisted()), []);
});

test('bag quantity and removal controls target only the selected configuration', () => {
  const a = app(),
    one = { color: p.options.colors[0].name, storage: p.options.storage[0] },
    two = { ...one, color: p.options.colors[1].name };
  a.run(`addToCart(${p.id},1,${JSON.stringify(one)})`);
  a.run(`addToCart(${p.id},1,${JSON.stringify(two)})`);
  const page = pageContext(null, a.persisted(), 'cart');
  const original = page.run('cart');
  const remove = page
    .buttons()
    .find((button) => button.dataset.action === 'remove' && button.dataset.key === original[0].key);
  remove.listeners.click();
  assert.equal(page.run('cart.length'), 1);
  assert.equal(page.run('cart[0].configuration.color'), two.color);
  const increase = page.buttons().find((button) => button.dataset.action === 'increase');
  increase.listeners.click();
  assert.equal(page.run('cart[0].quantity'), 2);
  assert.equal(page.run('cart[0].configuration.color'), two.color);
});
