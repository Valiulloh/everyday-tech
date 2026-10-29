const main = document.getElementById('main');

function updateNavigation() {
  const category = new URLSearchParams(location.search).get('category');
  document.querySelectorAll('[data-nav]').forEach((link) => {
    const active =
      document.body.dataset.page === 'home'
        ? link.dataset.nav === 'home'
        : document.body.dataset.page === 'catalog'
          ? category
            ? link.dataset.nav === category
            : link.dataset.nav === 'all'
          : false;
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

updateCartCount();

(({ home, catalog, detail, cart: cartPage, checkout })[document.body.dataset.page] || home)();

if (storageWarning)
  notify('Saved bag data could not be loaded. Your bag has been reset for this page.');

window.addEventListener('storage', (event) => {
  if (event.key === CART_KEY || event.key === null) {
    cart = readCart();
    updateCartCount();
    if (document.body.dataset.page === 'cart') cartPage();
    if (document.body.dataset.page === 'checkout') {
      checkout();
      notify('Your bag changed in another tab. Please review the updated order.');
    }
  }
});

updateNavigation();

window.addEventListener('storage', (event) => {
  if (event.key === STORE_KEY || event.key === null) {
    refreshStore();
    cart = readCart();
    updateCartCount();
    const page = document.body.dataset.page;
    if (page === 'cart') cartPage();
    else if (page === 'checkout') checkout();
    else if (page === 'detail') detail();
    else if (page === 'catalog') catalog();
    else if (page === 'home') home();
    notify('The demo catalog was updated in another tab.');
  }
});
