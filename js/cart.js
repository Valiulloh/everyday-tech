const CART_KEY = 'cart';
let storageWarning = false;
function defaultConfiguration(product) {
  return {
    color: product.options.colors[0].name,
    storage: product.options.storage[0],
    memory: product.options.memory[0] || '',
  };
}
function resolveConfiguration(product, raw) {
  if (raw === undefined) return defaultConfiguration(product);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const config = { ...defaultConfiguration(product), ...raw };
  if (
    !product.options.colors.some((color) => color.name === config.color) ||
    !product.options.storage.includes(config.storage)
  )
    return null;
  if (
    product.options.memory.length
      ? !product.options.memory.includes(config.memory)
      : config.memory !== ''
  )
    return null;
  return { color: config.color, storage: config.storage, memory: config.memory };
}
function configurationKey(id, config) {
  return [
    id,
    config.color.toLowerCase().replace(/\s+/g, '-'),
    config.storage.toLowerCase(),
    config.memory.toLowerCase() || 'fixed',
  ].join(':');
}
function capacityGB(value) {
  return (
    (value === 'Standard' ? 0 : Number.parseInt(value, 10)) * (value.endsWith('TB') ? 1024 : 1)
  );
}
function configurationPrice(product, config) {
  const storageUpgrade = Math.round(
    ((capacityGB(config.storage) - capacityGB(product.options.storage[0])) * 10000) / 256,
  );
  const memoryUpgrade = config.memory
    ? (capacityGB(config.memory) - capacityGB(product.options.memory[0])) * 1500
    : 0;
  return Math.round(product.price * 100) + storageUpgrade + memoryUpgrade;
}
function configurationLabel(config) {
  return [
    config.color,
    config.storage === 'Standard' ? 'Standard configuration' : config.storage + ' storage',
    config.memory ? config.memory + ' memory' : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
function configurationImage(product, config) {
  return product.custom ||
    (product.uploadedImages?.length && config.color === product.options.colors[0].name)
    ? product.image
    : product.options.colors.find((color) => color.name === config.color).image;
}
function modelQuantity(id) {
  return cart.filter((item) => item.id === id).reduce((sum, item) => sum + item.quantity, 0);
}
function normalizeCart(value) {
  if (!Array.isArray(value)) return [];
  const merged = new Map(),
    used = new Map();
  for (const item of value) {
    if (
      !item ||
      !Number.isInteger(item.id) ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1
    )
      continue;
    const product = products.find((p) => p.id === item.id);
    if (!product || product.hidden || product.stock < 1) continue;
    const configuration = resolveConfiguration(product, item.configuration);
    if (!configuration) continue;
    const quantity = Math.min(item.quantity, product.stock - (used.get(item.id) || 0));
    if (quantity < 1) continue;
    const key = configurationKey(item.id, configuration);
    if (merged.has(key)) merged.get(key).quantity += quantity;
    else merged.set(key, { id: item.id, key, configuration, quantity });
    used.set(item.id, (used.get(item.id) || 0) + quantity);
  }
  return [...merged.values()];
}
function readCart() {
  try {
    return normalizeCart(JSON.parse(localStorage.getItem(CART_KEY)));
  } catch {
    storageWarning = true;
    return [];
  }
}
let cart = readCart();
function updateCartCount() {
  const el = document.getElementById('cart-count');
  if (el) el.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
}
function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    storageWarning = true;
  }
  updateCartCount();
}
function addToCart(id, quantity = 1, rawConfiguration) {
  const product = products.find((p) => p.id === id);
  if (!product || product.hidden || !Number.isSafeInteger(quantity) || quantity < 1)
    return { ok: false, message: 'Choose a valid quantity.' };
  const configuration = resolveConfiguration(product, rawConfiguration);
  if (!configuration)
    return { ok: false, message: 'Choose a supported color, storage, and memory configuration.' };
  if (modelQuantity(id) + quantity > product.stock)
    return {
      ok: false,
      message:
        product.stock === 0
          ? 'This announced model is preview-only.'
          : `Only ${product.stock} available across all configurations. Check the quantity already in your bag.`,
    };
  const key = configurationKey(id, configuration),
    item = cart.find((item) => item.key === key);
  if (item) item.quantity += quantity;
  else cart.push({ id, key, configuration, quantity });
  saveCart();
  return {
    ok: true,
    message: `${product.name} (${configurationLabel(configuration)}) added to your bag.${storageWarning ? ' Browser storage is unavailable; your bag is saved for this page only.' : ''}`,
  };
}
function cartTotals() {
  const subtotal = cart.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.id);
    return sum + configurationPrice(product, item.configuration) * item.quantity;
  }, 0);
  const shipping = subtotal === 0 || subtotal >= 10000 ? 0 : 999;
  return { subtotal, shipping, total: subtotal + shipping };
}
