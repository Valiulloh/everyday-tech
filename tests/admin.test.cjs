const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
function workspace(shared = new Map(), blocked = false) {
  const context = vm.createContext({
    localStorage: {
      getItem: (key) => shared.get(key) || null,
      setItem(key, value) {
        if (blocked) throw Error('storage unavailable');
        shared.set(key, value);
      },
    },
    document: { getElementById: () => null },
  });
  vm.runInContext(
    ['products.js', 'store.js', 'cart.js', 'catalog-utils.js']
      .map((file) => fs.readFileSync('js/' + file, 'utf8'))
      .join('\n'),
    context,
  );
  return {
    shared,
    run: (source) => JSON.parse(vm.runInContext('JSON.stringify(' + source + ')', context)),
    exec: (source) => vm.runInContext(source, context),
  };
}
function addDefault(w, id = 105, quantity = 1) {
  assert.equal(w.run(`addToCart(${id},${quantity})`).ok, true);
}
test('product edits persist and affect storefront search, price and stock', () => {
  const w = workspace();
  assert.equal(w.run('editProduct(105,{price:749.99,stock:3,hidden:false})').ok, true);
  assert.equal(w.run('products.find(p=>p.id===105).price'), 749.99);
  assert.equal(w.run('products.find(p=>p.id===105).stock'), 3);
  const reload = workspace(w.shared);
  assert.equal(reload.run('products.find(p=>p.id===105).price'), 749.99);
  assert.equal(
    reload.run(
      'configurationPrice(products.find(p=>p.id===105),defaultConfiguration(products.find(p=>p.id===105)))',
    ),
    74999,
  );
});
test('hidden products cannot be browsed, added, or restored in a bag', () => {
  const w = workspace();
  addDefault(w);
  assert.equal(w.run('editProduct(105,{price:799,stock:4,hidden:true})').ok, true);
  assert.equal(w.run('filterProducts().some(p=>p.id===105)'), false);
  assert.equal(w.run('addToCart(105)').ok, false);
  assert.deepEqual(workspace(w.shared).run('cart'), []);
});
test('product validation rejects invalid prices, inventory and preview activation', () => {
  const w = workspace();
  for (const values of [
    { price: 0, stock: 3, hidden: false },
    { price: 10.001, stock: 3, hidden: false },
    { price: 50, stock: -1, hidden: false },
    { price: 50, stock: 1.5, hidden: false },
    { price: NaN, stock: 3, hidden: false },
  ])
    assert.equal(w.run(`editProduct(105,${JSON.stringify(values)})`).ok, false);
  const preview = w.run('products.find(p=>p.status==="Pre-order").id');
  assert.equal(w.run(`editProduct(${preview},{price:999,stock:2,hidden:false})`).ok, false);
  assert.deepEqual(w.run('storeState.overrides'), {});
});
test('checkout creates an immutable order snapshot and reserves shared model inventory', () => {
  const w = workspace();
  w.run('editProduct(105,{price:799,stock:8,hidden:false})');
  addDefault(w, 105, 2);
  const other = w.run('products.find(p=>p.id===105).options.colors[1].name');
  w.run(`addToCart(105,1,{color:${JSON.stringify(other)}})`);
  const total = w.run('cartTotals().total');
  const result = w.run(`placeDemoOrder(cart,${total})`);
  assert.equal(result.ok, true);
  assert.equal(result.order.status, 'Pending');
  assert.equal(result.order.items.length, 2);
  assert.equal(result.order.total, total);
  assert.equal(w.run('products.find(p=>p.id===105).stock'), 5);
  assert.equal(w.run('storeState.orders.length'), 1);
  w.run('editProduct(105,{price:999,stock:5,hidden:false})');
  assert.equal(w.run('storeState.orders[0].items[0].unitPrice'), 79900);
  const saved = JSON.parse(w.shared.get('everyday-tech-store-v1'));
  assert.ok(!JSON.stringify(saved).includes('email'));
  assert.ok(!JSON.stringify(saved).includes('address'));
});
test('cancelling an unshipped order restores inventory exactly once', () => {
  const w = workspace();
  const before = w.run('products.find(p=>p.id===105).stock');
  addDefault(w, 105, 2);
  const order = w.run('placeDemoOrder(cart)').order;
  assert.equal(w.run(`changeOrderStatus('${order.id}','Cancelled')`).ok, true);
  assert.equal(w.run('products.find(p=>p.id===105).stock'), before);
  assert.equal(w.run(`changeOrderStatus('${order.id}','Cancelled')`).ok, false);
  assert.equal(w.run('products.find(p=>p.id===105).stock'), before);
});
test('fulfillment follows valid transitions and shipped orders cannot be cancelled', () => {
  const w = workspace();
  addDefault(w);
  const order = w.run('placeDemoOrder(cart)').order;
  assert.equal(w.run(`changeOrderStatus('${order.id}','Delivered')`).ok, false);
  for (const status of ['Processing', 'Shipped', 'Delivered'])
    assert.equal(w.run(`changeOrderStatus('${order.id}','${status}')`).ok, true);
  assert.equal(w.run(`changeOrderStatus('${order.id}','Cancelled')`).ok, false);
});
test('stale stock or prices block checkout without creating or reserving an order', () => {
  const w = workspace();
  addDefault(w, 105, 2);
  const total = w.run('cartTotals().total');
  w.run('editProduct(105,{price:999,stock:8,hidden:false})');
  assert.equal(w.run(`placeDemoOrder(cart,${total})`).ok, false);
  assert.equal(w.run('storeState.orders.length'), 0);
  w.run('editProduct(105,{price:799,stock:1,hidden:false})');
  assert.equal(w.run('placeDemoOrder(cart)').ok, false);
  assert.equal(w.run('products.find(p=>p.id===105).stock'), 1);
});
test('multiple browser contexts refresh latest inventory before reserving it', () => {
  const shared = new Map(),
    a = workspace(shared),
    b = workspace(shared);
  a.run('editProduct(105,{price:799,stock:1,hidden:false})');
  addDefault(a);
  addDefault(b);
  assert.equal(a.run('placeDemoOrder(cart)').ok, true);
  assert.equal(b.run('placeDemoOrder(cart)').ok, false);
  assert.equal(b.run('storeState.orders.length'), 1);
});
test('sample activity is explicit, idempotent, labeled and never changes stock', () => {
  const w = workspace();
  const before = w.run('products.map(p=>p.stock)');
  assert.equal(w.run('loadSampleOrders()').ok, true);
  assert.equal(w.run('storeState.orders.length'), 8);
  assert.equal(w.run('storeState.orders.every(o=>o.sample&&!o.inventoryReserved)'), true);
  assert.deepEqual(w.run('products.map(p=>p.stock)'), before);
  assert.equal(w.run('loadSampleOrders()').ok, false);
  assert.equal(w.run('storeState.orders.length'), 8);
  const pending = w.run('storeState.orders.find(o=>o.status==="Pending").id');
  assert.equal(w.run(`changeOrderStatus('${pending}','Cancelled')`).ok, true);
  assert.deepEqual(w.run('products.map(p=>p.stock)'), before);
});
test('storage failures never claim to save edits or orders', () => {
  const w = workspace(new Map(), true);
  assert.equal(w.run('editProduct(105,{price:200,stock:2,hidden:false})').ok, false);
  const before = w.run('products.find(p=>p.id===105).stock');
  addDefault(w);
  assert.equal(w.run('placeDemoOrder(cart)').ok, false);
  assert.equal(w.run('storeState.orders.length'), 0);
  assert.equal(w.run('products.find(p=>p.id===105).stock'), before);
});
test('malformed saved dashboard data is rejected safely', () => {
  for (const value of [
    'not json',
    'null',
    '[]',
    '{"version":9}',
    '{"version":1,"overrides":{"105":{"price":1,"stock":-1,"hidden":false}},"orders":[{"id":"<script>"}]}',
  ]) {
    const w = workspace(new Map([['everyday-tech-store-v1', value]]));
    assert.equal(w.run('storeState.orders.length'), 0);
    assert.deepEqual(w.run('storeState.overrides'), {});
  }
});
test('dashboard metrics use saved non-cancelled orders and visible products', () => {
  const w = workspace();
  w.run('loadSampleOrders()');
  const stats = w.run('dashboardStats(30)');
  assert.equal(stats.orderCount, 8);
  assert.ok(stats.revenue > 0);
  assert.equal(stats.activeProducts, 61);
  w.run('editProduct(105,{price:799,stock:2,hidden:true})');
  assert.equal(w.run('dashboardStats(30).activeProducts'), 60);
});
test('all dashboard sections render without runtime errors', () => {
  for (const hash of ['#overview', '#products', '#categories', '#orders']) {
    const nodes = new Map();
    function node(id) {
      if (!nodes.has(id))
        nodes.set(id, { innerHTML: '', textContent: '', addEventListener() {}, focus() {} });
      return nodes.get(id);
    }
    const context = vm.createContext({
      localStorage: { getItem: () => null },
      document: { getElementById: node, querySelectorAll: () => [] },
      location: { hash },
      window: { addEventListener() {} },
      Intl,
      URLSearchParams,
      clearTimeout() {},
      setTimeout() {},
    });
    vm.runInContext(
      ['products.js', 'store.js', 'cart.js', 'admin-create.js', 'admin.js']
        .map((file) => fs.readFileSync('js/' + file, 'utf8'))
        .join('\n'),
      context,
    );
    const html = node('admin-main').innerHTML;
    assert.ok(html.length > 100);
    assert.ok(!html.includes('undefined'));
  }
});
test('admin page links, scripts and icon symbols exist in the source', () => {
  const html = fs.readFileSync('admin.html', 'utf8');
  for (const [, target] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (target.startsWith('#')) continue;
    assert.ok(fs.existsSync(target.split(/[?#]/)[0]), target);
  }
  const icons = fs.readFileSync('images/icons.svg', 'utf8');
  for (const [, name] of (html + fs.readFileSync('js/admin.js', 'utf8')).matchAll(
    /images\/icons\.svg#([a-z-]+)/g,
  ))
    assert.ok(icons.includes('id="' + name + '"'));
});
const uploadPhoto =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVhoAAAAASUVORK5CYII=';
function customProductInput(overrides = {}) {
  return {
    name: 'Studio Headphones',
    description: 'Comfortable wireless listening.',
    brand: 'Everyday',
    category: 'Accessories',
    price: 129.99,
    stock: 6,
    hidden: false,
    colors: ['Black', 'White'],
    storage: ['Standard'],
    memory: [],
    images: [uploadPhoto],
    ...overrides,
  };
}
test('categories persist, reject duplicate names, and populate the shared catalog', () => {
  const w = workspace();
  assert.equal(w.run('addCategory("Accessories")').ok, true);
  assert.equal(w.run('addCategory(" accessories ")').ok, false);
  assert.equal(w.run('addCategory("All")').ok, false);
  assert.equal(w.run('addCategory(" ")').ok, false);
  assert.ok(workspace(w.shared).run('getCategories()').includes('Accessories'));
});
test('new products and uploaded images survive reload and appear in their category', () => {
  const w = workspace();
  w.run('addCategory("Accessories")');
  const result = w.run(`createProduct(${JSON.stringify(customProductInput())})`);
  assert.equal(result.ok, true);
  assert.equal(result.id, 1000);
  assert.equal(w.run('products.length'), 62);
  const reloaded = workspace(w.shared);
  const product = reloaded.run('products.find(p=>p.id===1000)');
  assert.equal(product.name, 'Studio Headphones');
  assert.equal(product.image, uploadPhoto);
  assert.equal(reloaded.run('filterProducts({category:"Accessories"}).length'), 1);
  assert.equal(reloaded.run('getCategories().filter(c=>c==="Accessories").length'), 1);
});
test('new accessory supports standard configuration, stock reservation and cancellation', () => {
  const w = workspace();
  w.run('addCategory("Accessories")');
  w.run(`createProduct(${JSON.stringify(customProductInput())})`);
  assert.equal(w.run('addToCart(1000,2)').ok, true);
  assert.equal(w.run('cartTotals().total'), 25998);
  const placed = w.run('placeDemoOrder(cart)');
  assert.equal(placed.ok, true);
  assert.equal(w.run('products.find(p=>p.id===1000).stock'), 4);
  assert.equal(w.run(`changeOrderStatus('${placed.order.id}','Cancelled')`).ok, true);
  assert.equal(w.run('products.find(p=>p.id===1000).stock'), 6);
  assert.equal(workspace(w.shared).run('storeState.orders.length'), 1);
});
test('new device options sort by capacity and charge correct upgrades', () => {
  const w = workspace();
  const input = customProductInput({
    category: 'iPad',
    storage: ['1TB', '128GB', '256GB'],
    memory: ['16GB', '8GB'],
  });
  const result = w.run(`createProduct(${JSON.stringify(input)})`);
  assert.equal(result.ok, true);
  const p = w.run('products.find(p=>p.id===1000)');
  assert.deepEqual(p.options.storage, ['128GB', '256GB', '1TB']);
  assert.deepEqual(p.options.memory, ['8GB', '16GB']);
  assert.equal(w.run('addToCart(1000,1,{storage:"256GB",memory:"16GB"})').ok, true);
  assert.equal(w.run('cartTotals().total'), 29999);
});
test('invalid category, image format, image count and variant inputs cannot create products', () => {
  const w = workspace();
  w.run('addCategory("Accessories")');
  for (const override of [
    { category: 'Missing' },
    { images: [] },
    { images: ['data:image/svg+xml;base64,PHN2Zz4='] },
    { images: [uploadPhoto, uploadPhoto, uploadPhoto, uploadPhoto, uploadPhoto] },
    { colors: ['Black', 'black'] },
    { storage: ['128GB', 'Standard'] },
    { memory: ['8TB'] },
    { price: 3.001 },
    { stock: -1 },
  ])
    assert.equal(w.run(`createProduct(${JSON.stringify(customProductInput(override))})`).ok, false);
  assert.equal(w.run('products.length'), 61);
});
test('existing photos can be replaced and restored without losing inventory reservations', () => {
  const w = workspace();
  const original = w.run('products.find(p=>p.id===105).image');
  w.run(
    `editProduct(105,{price:799,stock:9,hidden:false,images:[${JSON.stringify(uploadPhoto)}]})`,
  );
  assert.equal(w.run('products.find(p=>p.id===105).image'), uploadPhoto);
  addDefault(w);
  w.run('placeDemoOrder(cart)');
  assert.equal(w.run('products.find(p=>p.id===105).image'), uploadPhoto);
  assert.equal(workspace(w.shared).run('products.find(p=>p.id===105).image'), uploadPhoto);
  assert.equal(w.run('editProduct(105,{price:799,stock:8,hidden:false,images:[]})').ok, true);
  assert.equal(w.run('products.find(p=>p.id===105).image'), original);
});
test('storage quota failure does not add a phantom category or product', () => {
  const w = workspace(new Map(), true);
  assert.equal(w.run('addCategory("Accessories")').ok, false);
  assert.equal(
    w.run(`createProduct(${JSON.stringify(customProductInput({ category: 'iPad' }))})`).ok,
    false,
  );
  assert.equal(w.run('products.length'), 61);
});
test('custom product and category text is escaped in the storefront', () => {
  const shared = new Map(),
    w = workspace(shared);
  w.run('addCategory("Audio & Accessories")');
  const input = customProductInput({
    name: 'Headphones "Pro" <Studio>',
    description: 'Clear sound & comfort.',
    category: 'Audio & Accessories',
  });
  assert.equal(w.run(`createProduct(${JSON.stringify(input)})`).ok, true);
  const nodes = new Map();
  const node = (id) => {
    if (!nodes.has(id))
      nodes.set(id, { innerHTML: '', textContent: '', addEventListener() {}, focus() {} });
    return nodes.get(id);
  };
  const context = vm.createContext({
    localStorage: { getItem: (key) => shared.get(key) || null },
    document: {
      body: { dataset: { page: 'detail' } },
      getElementById: node,
      querySelectorAll: () => [],
    },
    window: { addEventListener() {} },
    location: { search: '?id=1000' },
    Intl,
    URLSearchParams,
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
  const html = node('main').innerHTML;
  assert.ok(html.includes('Headphones &quot;Pro&quot; &lt;Studio&gt;'));
  assert.ok(html.includes('Clear sound &amp; comfort.'));
  assert.ok(!html.includes('<Studio>'));
  assert.ok(!html.includes('href="undefined"'));
  assert.ok(!html.includes('undefined'));
});
