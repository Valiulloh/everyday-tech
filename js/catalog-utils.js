function filterProducts({
  query = '',
  category = 'All',
  generation = 'All',
  sort = 'default',
} = {}) {
  const search = query.trim().toLowerCase();
  const result = products.filter(
    (product) =>
      !product.hidden &&
      (category === 'All' || product.category === category) &&
      (generation === 'All' || product.generation === generation) &&
      [product.name, product.series, product.specifications.Chip]
        .join(' ')
        .toLowerCase()
        .includes(search),
  );
  if (sort === 'price-low') result.sort((a, b) => a.price - b.price);
  if (sort === 'price-high') result.sort((a, b) => b.price - a.price);
  return result;
}
function relatedProducts(product, limit = 3) {
  return products
    .filter(
      (item) =>
        !item.hidden &&
        item.id !== product.id &&
        item.category === product.category &&
        item.stock > 0,
    )
    .sort((a, b) => Math.abs(a.price - product.price) - Math.abs(b.price - product.price))
    .slice(0, limit);
}
