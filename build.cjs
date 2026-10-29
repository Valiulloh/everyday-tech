const fs = require('node:fs');
const path = require('node:path');
const output = path.join(__dirname, 'dist');
fs.mkdirSync(output, { recursive: true });
for (const file of [
  'index.html',
  'products.html',
  'product.html',
  'cart.html',
  'checkout.html',
  'admin.html',
])
  fs.copyFileSync(path.join(__dirname, file), path.join(output, file));
for (const dir of ['css', 'js', 'images/apple', 'images/brand'])
  fs.cpSync(path.join(__dirname, dir), path.join(output, dir), { recursive: true });
for (const asset of ['favicon.svg', 'icons.svg'])
  fs.copyFileSync(path.join(__dirname, 'images', asset), path.join(output, 'images', asset));
console.log('Static site prepared in dist/');
