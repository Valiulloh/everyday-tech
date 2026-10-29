const STORE_KEY = 'everyday-tech-store-v1';
const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const STATUS_TRANSITIONS = {
  Pending: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: [],
  Cancelled: [],
};
const baseProductState = new Map(
  products.map((p) => [p.id, { price: p.price, stock: p.stock, hidden: false, image: p.image }]),
);
const builtInProducts = [...products];
const builtInCategories = [...new Set(products.map((p) => p.category))];
function escapeStoreHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}
function validText(value, max) {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= max &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
  );
}
function validProductImage(value) {
  return (
    typeof value === 'string' &&
    value.length <= 350000 &&
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
  );
}
function validImages(images) {
  return (
    Array.isArray(images) &&
    images.length > 0 &&
    images.length <= 4 &&
    images.every(validProductImage)
  );
}
function getCategories() {
  return [...builtInCategories, ...storeState.categories];
}
let storeStorageWarning = false;
function emptyStore() {
  return {
    version: 1,
    overrides: {},
    orders: [],
    activity: [],
    sampleLoaded: false,
    categories: [],
    customProducts: [],
  };
}
function validSavedConfiguration(product, raw) {
  return (
    raw &&
    typeof raw === 'object' &&
    product.options.colors.some((c) => c.name === raw.color) &&
    product.options.storage.includes(raw.storage) &&
    (product.options.memory.length
      ? product.options.memory.includes(raw.memory)
      : raw.memory === '')
  );
}
function cleanStore(raw) {
  const clean = emptyStore();
  if (!raw || raw.version !== 1) return clean;
  const categoryNames = new Set(builtInCategories.map((name) => name.toLowerCase()));
  if (Array.isArray(raw.categories))
    for (const value of raw.categories.slice(0, 50)) {
      if (
        validText(value, 50) &&
        value.trim().toLowerCase() !== 'all' &&
        !categoryNames.has(value.trim().toLowerCase())
      ) {
        clean.categories.push(value.trim());
        categoryNames.add(value.trim().toLowerCase());
      }
    }
  if (Array.isArray(raw.customProducts))
    for (const product of raw.customProducts.slice(0, 50)) {
      if (
        !product ||
        !Number.isSafeInteger(product.id) ||
        product.id < 1000 ||
        product.id > 999999 ||
        clean.customProducts.some((p) => p.id === product.id)
      )
        continue;
      const result = validateNewProduct(product, [...builtInCategories, ...clean.categories]);
      if (!result.ok) continue;
      clean.customProducts.push(makeCustomProduct(product.id, result.value));
    }
  const catalog = [...builtInProducts, ...clean.customProducts];
  for (const [id, value] of Object.entries(raw.overrides || {})) {
    const product = catalog.find((p) => String(p.id) === id);
    if (!product || !value || typeof value !== 'object') continue;
    if (
      Number.isFinite(value.price) &&
      value.price >= 1 &&
      value.price <= 99999.99 &&
      Number.isInteger(value.stock) &&
      value.stock >= 0 &&
      value.stock <= 9999 &&
      typeof value.hidden === 'boolean'
    )
      clean.overrides[id] = {
        price: Math.round(value.price * 100) / 100,
        stock: product.status === 'Pre-order' ? 0 : value.stock,
        hidden: value.hidden,
        ...(validImages(value.images) ||
        (!product.custom && Array.isArray(value.images) && !value.images.length)
          ? { images: [...value.images] }
          : {}),
      };
  }
  if (Array.isArray(raw.orders))
    for (const order of raw.orders.slice(-500)) {
      if (
        !order ||
        !/^ET-[A-Z0-9-]{1,40}$/.test(order.id) ||
        !ORDER_STATUSES.includes(order.status) ||
        !Number.isFinite(Date.parse(order.createdAt)) ||
        !Array.isArray(order.items) ||
        !order.items.length
      )
        continue;
      const items = [];
      for (const item of order.items) {
        const product = catalog.find((p) => p.id === item.id);
        if (
          !product ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 9999 ||
          !Number.isSafeInteger(item.unitPrice) ||
          item.unitPrice < 0 ||
          !validSavedConfiguration(product, item.configuration)
        )
          continue;
        items.push({
          id: product.id,
          name: product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          configuration: {
            color: item.configuration.color,
            storage: item.configuration.storage,
            memory: item.configuration.memory,
          },
        });
      }
      if (items.length !== order.items.length) continue;
      const subtotal = items.reduce((s, item) => s + item.quantity * item.unitPrice, 0);
      if (
        !Number.isSafeInteger(subtotal) ||
        ![0, 999].includes(order.shipping) ||
        order.total !== subtotal + order.shipping
      )
        continue;
      if (clean.orders.some((saved) => saved.id === order.id)) continue;
      clean.orders.push({
        id: order.id,
        createdAt: new Date(order.createdAt).toISOString(),
        status: order.status,
        items,
        subtotal,
        shipping: order.shipping,
        total: order.total,
        sample: order.sample === true,
        inventoryReserved: order.inventoryReserved === true,
      });
    }
  if (Array.isArray(raw.activity))
    clean.activity = raw.activity
      .filter(
        (item) =>
          item &&
          ['product', 'order', 'status', 'sample', 'category', 'new-product'].includes(item.type) &&
          Number.isFinite(Date.parse(item.at)),
      )
      .slice(-40)
      .map((item) => ({
        type: item.type,
        at: new Date(item.at).toISOString(),
        productId: catalog.some((p) => p.id === item.productId) ? item.productId : null,
        orderId:
          typeof item.orderId === 'string' && /^ET-[A-Z0-9-]{1,40}$/.test(item.orderId)
            ? item.orderId
            : null,
      }));
  clean.sampleLoaded = raw.sampleLoaded === true;
  return clean;
}
function readStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? cleanStore(JSON.parse(raw)) : emptyStore();
  } catch {
    storeStorageWarning = true;
    return emptyStore();
  }
}
let storeState = readStore();
function applyProductOverrides() {
  products.splice(
    0,
    products.length,
    ...builtInProducts,
    ...storeState.customProducts.map((p) => JSON.parse(JSON.stringify(p))),
  );
  for (const p of products) {
    const base = baseProductState.get(p.id) || { price: p.price, stock: p.stock, hidden: p.hidden },
      override = storeState.overrides[p.id] || base;
    p.price = override.price;
    p.stock = p.status === 'Pre-order' ? 0 : override.stock;
    p.hidden = override.hidden;
    p.uploadedImages = override.images || p.images || [];
    if (p.uploadedImages.length) p.image = p.uploadedImages[0];
    else if (base.image) p.image = base.image;
  }
}
applyProductOverrides();
function refreshStore() {
  storeState = readStore();
  applyProductOverrides();
}
function storeDraft() {
  refreshStore();
  return JSON.parse(JSON.stringify(storeState));
}
function commitStore(draft) {
  try {
    const clean = cleanStore(draft);
    const stored = {
      ...clean,
      customProducts: clean.customProducts.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        brand: p.brand,
        category: p.category,
        price: p.price,
        stock: p.stock,
        hidden: p.hidden,
        colors: p.colors,
        storage: p.storage,
        memory: p.memory,
        images: p.images,
      })),
    };
    localStorage.setItem(STORE_KEY, JSON.stringify(stored));
    storeState = clean;
    applyProductOverrides();
    return { ok: true };
  } catch {
    storeStorageWarning = true;
    return {
      ok: false,
      message: 'Browser storage is unavailable or full. Changes were not saved.',
    };
  }
}
function recordActivity(draft, type, fields = {}) {
  draft.activity.push({ type, at: new Date().toISOString(), ...fields });
  draft.activity = draft.activity.slice(-40);
}
function editProduct(id, values) {
  const draft = storeDraft(),
    product = products.find((p) => p.id === id);
  if (!product) return { ok: false, message: 'Product not found.' };
  if (
    !Number.isFinite(values.price) ||
    values.price < 1 ||
    values.price > 99999.99 ||
    Math.abs(values.price * 100 - Math.round(values.price * 100)) > 0.00001
  )
    return {
      ok: false,
      message: 'Enter a price from $1 to $99,999.99 with at most two decimal places.',
    };
  if (
    !Number.isInteger(values.stock) ||
    values.stock < 0 ||
    values.stock > 9999 ||
    typeof values.hidden !== 'boolean'
  )
    return { ok: false, message: 'Stock must be a whole number from 0 to 9,999.' };
  if (product.status === 'Pre-order' && values.stock !== 0)
    return { ok: false, message: 'Announced models remain preview-only.' };
  if (
    values.images !== undefined &&
    !validImages(values.images) &&
    !(Array.isArray(values.images) && !values.images.length && !product.custom)
  )
    return { ok: false, message: 'Choose 1–4 valid product images.' };
  draft.overrides[id] = {
    price: values.price,
    stock: values.stock,
    hidden: values.hidden,
    ...(values.images
      ? { images: values.images }
      : draft.overrides[id]?.images
        ? { images: draft.overrides[id].images }
        : {}),
  };
  recordActivity(draft, 'product', { productId: id });
  return commitStore(draft);
}
function placeDemoOrder(items, expectedTotal) {
  const draft = storeDraft();
  if (!Array.isArray(items) || !items.length) return { ok: false, message: 'Your bag is empty.' };
  const requested = new Map(),
    snapshots = [];
  for (const item of items) {
    const product = products.find((p) => p.id === item.id);
    if (
      !product ||
      product.hidden ||
      product.status === 'Pre-order' ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      !validSavedConfiguration(product, item.configuration)
    )
      return {
        ok: false,
        message: 'A bag item is no longer available. Return to your bag to review it.',
      };
    requested.set(item.id, (requested.get(item.id) || 0) + item.quantity);
    snapshots.push({
      id: item.id,
      name: product.name,
      configuration: { ...item.configuration },
      quantity: item.quantity,
      unitPrice: configurationPrice(product, item.configuration),
    });
  }
  for (const [id, quantity] of requested) {
    const p = products.find((p) => p.id === id);
    if (quantity > p.stock)
      return { ok: false, message: p.name + ' has insufficient stock. Review your bag.' };
  }
  const subtotal = snapshots.reduce((s, item) => s + item.unitPrice * item.quantity, 0),
    shipping = subtotal >= 10000 ? 0 : 999;
  if (expectedTotal !== undefined && expectedTotal !== subtotal + shipping)
    return {
      ok: false,
      message: 'The catalog price changed. Reload checkout to review the updated total.',
    };
  const suffix =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8).toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase();
  const order = {
    id: 'ET-' + Date.now().toString(36).toUpperCase() + '-' + suffix,
    createdAt: new Date().toISOString(),
    status: 'Pending',
    items: snapshots,
    subtotal,
    shipping,
    total: subtotal + shipping,
    sample: false,
    inventoryReserved: true,
  };
  for (const [id, quantity] of requested) {
    const p = products.find((p) => p.id === id);
    draft.overrides[id] = {
      ...draft.overrides[id],
      price: p.price,
      stock: p.stock - quantity,
      hidden: !!p.hidden,
    };
  }
  draft.orders.push(order);
  recordActivity(draft, 'order', { orderId: order.id });
  const result = commitStore(draft);
  return result.ok ? { ok: true, order } : result;
}
function changeOrderStatus(id, next) {
  const draft = storeDraft(),
    order = draft.orders.find((o) => o.id === id);
  if (!order) return { ok: false, message: 'Order not found.' };
  if (!STATUS_TRANSITIONS[order.status].includes(next))
    return { ok: false, message: 'That status transition is not allowed.' };
  if (next === 'Cancelled' && order.inventoryReserved) {
    const quantities = new Map();
    for (const item of order.items)
      quantities.set(item.id, (quantities.get(item.id) || 0) + item.quantity);
    for (const [id, quantity] of quantities) {
      const p = products.find((p) => p.id === id);
      if (p.stock + quantity > 9999)
        return {
          ok: false,
          message: 'Restocking would exceed the inventory limit. Adjust stock first.',
        };
      draft.overrides[id] = {
        ...draft.overrides[id],
        price: p.price,
        stock: p.stock + quantity,
        hidden: !!p.hidden,
      };
    }
    order.inventoryReserved = false;
  }
  order.status = next;
  recordActivity(draft, 'status', { orderId: id });
  return commitStore(draft);
}
function loadSampleOrders() {
  const draft = storeDraft();
  if (draft.sampleLoaded)
    return { ok: false, message: 'Sample activity has already been loaded in this browser.' };
  const available = products.filter((p) => p.status !== 'Pre-order');
  const states = [
    'Delivered',
    'Delivered',
    'Shipped',
    'Processing',
    'Pending',
    'Delivered',
    'Processing',
    'Pending',
  ];
  for (let index = 0; index < 8; index++) {
    const p = available[(index * 7) % available.length],
      configuration = defaultConfiguration(p),
      unitPrice = configurationPrice(p, configuration),
      quantity = index % 3 === 0 ? 2 : 1,
      subtotal = unitPrice * quantity;
    const createdAt = new Date(Date.now() - (7 - index) * 86400000 - 3600000).toISOString();
    draft.orders.push({
      id: 'ET-SAMPLE-' + String(index + 1).padStart(3, '0'),
      createdAt,
      status: states[index],
      items: [{ id: p.id, name: p.name, configuration, quantity, unitPrice }],
      subtotal,
      shipping: 0,
      total: subtotal,
      sample: true,
      inventoryReserved: false,
    });
  }
  draft.sampleLoaded = true;
  recordActivity(draft, 'sample');
  return commitStore(draft);
}
function dashboardStats(days = 7) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days + 1);
  const since = start.getTime(),
    orders = storeState.orders.filter((o) => Date.parse(o.createdAt) >= since),
    open = orders.filter((o) => ['Pending', 'Processing'].includes(o.status));
  return {
    revenue: orders.filter((o) => o.status !== 'Cancelled').reduce((s, o) => s + o.total, 0),
    orderCount: orders.length,
    openCount: open.length,
    activeProducts: products.filter((p) => !p.hidden).length,
    lowStock: products.filter((p) => !p.hidden && p.status !== 'Pre-order' && p.stock <= 5).length,
    units: products.filter((p) => !p.hidden).reduce((s, p) => s + p.stock, 0),
  };
}

function validateNewProduct(input, categories) {
  if (!input || !validText(input.name, 100) || !validText(input.description, 1600))
    return {
      ok: false,
      message:
        'Enter a product name (up to 100 characters) and description (up to 1,600 characters).',
    };
  if (!categories.includes(input.category))
    return { ok: false, message: 'Choose an existing category, or add one in Categories first.' };
  if (
    !Number.isFinite(input.price) ||
    input.price < 1 ||
    input.price > 99999.99 ||
    Math.abs(input.price * 100 - Math.round(input.price * 100)) > 0.00001 ||
    !Number.isInteger(input.stock) ||
    input.stock < 0 ||
    input.stock > 9999
  )
    return { ok: false, message: 'Enter a valid price and a whole stock count from 0 to 9,999.' };
  const colors =
      input.colors ||
      (Array.isArray(input.options?.colors) ? input.options.colors.map((c) => c.name) : undefined),
    storage = input.storage || input.options?.storage,
    memory = input.memory || input.options?.memory || [];
  if (
    !Array.isArray(colors) ||
    !colors.length ||
    colors.length > 8 ||
    colors.some((c) => typeof c !== 'string' || !/^[a-z0-9][a-z0-9 -]{0,39}$/i.test(c)) ||
    new Set(colors.map((c) => c.toLowerCase())).size !== colors.length
  )
    return {
      ok: false,
      message: 'Use 1–8 unique color names with letters, numbers, spaces, or hyphens.',
    };
  if (
    !Array.isArray(storage) ||
    !storage.length ||
    storage.length > 12 ||
    new Set(storage).size !== storage.length ||
    storage.some((v) => !/^(?:[1-9][0-9]{0,3}(?:GB|TB)|Standard)$/.test(v)) ||
    (storage.includes('Standard') && storage.length !== 1)
  )
    return {
      ok: false,
      message:
        'Enter valid storage sizes such as 128GB, 256GB, or 1TB. Leave blank for a standard configuration.',
    };
  if (
    !Array.isArray(memory) ||
    memory.length > 12 ||
    new Set(memory).size !== memory.length ||
    memory.some((v) => !/^[1-9][0-9]{0,3}GB$/.test(v))
  )
    return { ok: false, message: 'Enter memory sizes such as 8GB, 16GB, or 32GB, or leave blank.' };
  if (!validImages(input.images))
    return { ok: false, message: 'Upload 1–4 JPEG, PNG, or WebP product photos.' };
  const size = (v) => (v === 'Standard' ? 0 : parseInt(v, 10) * (v.endsWith('TB') ? 1024 : 1));
  return {
    ok: true,
    value: {
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category,
      brand: validText(input.brand, 50) ? input.brand.trim() : 'Independent',
      price: input.price,
      stock: input.stock,
      hidden: input.hidden === true,
      colors: [...colors],
      storage: [...storage].sort((a, b) => size(a) - size(b)),
      memory: [...memory].sort((a, b) => size(a) - size(b)),
      images: [...input.images],
    },
  };
}
function makeCustomProduct(id, value) {
  const swatches = {
    black: '#292c32',
    white: '#eeeeee',
    silver: '#c7c9cf',
    blue: '#799ec2',
    red: '#bd4c4c',
    green: '#82a98a',
    pink: '#e5b8c8',
    gold: '#d1bb8a',
    purple: '#a296c5',
    default: '#8995ad',
  };
  return {
    id,
    custom: true,
    name: value.name,
    description: value.description,
    category: value.category,
    brand: value.brand,
    price: value.price,
    stock: value.stock,
    hidden: value.hidden,
    status: 'Current',
    series: value.category,
    generation: 'Custom collection',
    tag: 'New arrival',
    image: value.images[0],
    images: value.images,
    colors: value.colors,
    storage: value.storage,
    memory: value.memory,
    specifications: { Brand: value.brand, Collection: value.category, Chip: 'Not specified' },
    options: {
      colors: value.colors.map((name) => ({
        name,
        hex: swatches[name.toLowerCase()] || '#8995ad',
        image: value.images[0],
      })),
      storage: value.storage,
      memory: value.memory,
    },
  };
}
function addCategory(name) {
  const draft = storeDraft();
  if (!validText(name, 50) || name.trim().toLowerCase() === 'all')
    return { ok: false, message: 'Enter a category name from 1 to 50 characters.' };
  if (draft.categories.length >= 50)
    return { ok: false, message: 'This demo supports up to 50 custom categories.' };
  if (getCategories().some((c) => c.toLowerCase() === name.trim().toLowerCase()))
    return { ok: false, message: 'That category already exists.' };
  draft.categories.push(name.trim());
  recordActivity(draft, 'category');
  return commitStore(draft);
}
function createProduct(input) {
  const draft = storeDraft();
  if (draft.customProducts.length >= 50)
    return { ok: false, message: 'This demo supports up to 50 new products.' };
  const validated = validateNewProduct(input, getCategories());
  if (!validated.ok) return validated;
  const id = Math.max(999, ...draft.customProducts.map((p) => p.id)) + 1;
  draft.customProducts.push(makeCustomProduct(id, validated.value));
  recordActivity(draft, 'new-product', { productId: id });
  const result = commitStore(draft);
  return result.ok ? { ok: true, id } : result;
}
