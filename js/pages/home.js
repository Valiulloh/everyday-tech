function home() {
  const heroProduct =
    products.find((p) => p.id === 136 && !p.hidden) ||
    products.find((p) => p.category === 'MacBook' && !p.hidden) ||
    products.find((p) => !p.hidden);
  main.innerHTML = /* HTML */ `<section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">THE EVERYDAY, UPGRADED</p>
        <h1>Small upgrades.<br /><em>Big possibilities.</em></h1>
        <p>
          Meet the tech that fits your life. Thoughtfully selected essentials for creating,
          connecting, and everything in between.
        </p>
        <a class="button" href="products.html"
          >Explore the collection
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
              <use href="images/icons.svg#arrow-right"></use></svg></span
        ></a>
        <div class="hero-note">
          <span class="tiny-line"></span> Less searching. More discovering.
        </div>
      </div>
      <a class="hero-visual" href="product.html?id=${heroProduct?.id || 136}"
        ><span class="hero-label">A NEW PERSPECTIVE</span
        ><span class="hero-orbit" aria-hidden="true"></span
        ><img
          src="${heroProduct?.image || 'images/apple/macbook-air-13-inch-m5.jpg'}"
          alt="${escapeStoreHtml(heroProduct?.name || 'Explore the collection')}"
          width="600"
          height="440"
          fetchpriority="high" />
        <div class="hero-product">
          <div>
            <small>MAKE ROOM FOR YOUR IDEAS</small>
            <h2>${heroProduct?.name || 'Explore the collection'}</h2>
          </div>
          <span class="round-arrow" aria-hidden="true"
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
              <use href="images/icons.svg#arrow-up-right"></use></svg
          ></span></div
      ></a>
    </section>
    <div class="benefits">
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
          <use href="images/icons.svg#truck"></use>
        </svg>
        Free shipping over $100</span
      ><span
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
          <use href="images/icons.svg#devices"></use>
        </svg>
        Current & recent Apple models</span
      ><span
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
          <use href="images/icons.svg#shield"></use>
        </svg>
        Simple, transparent shopping</span
      >
    </div>
    <section class="collection">
      <div class="section-heading">
        <div>
          <p class="eyebrow">GOOD TECH STARTS HERE</p>
          <h2>Your next everyday favorite.</h2>
        </div>
        <a class="text-link" href="products.html"
          >Shop all products
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
      </div>
      <div class="product-grid">
        ${[
          products.find((p) => p.id === 103),
          products.find((p) => p.id === 136),
          products.find((p) => p.id === 118),
          products.find((p) => p.id === 105),
          products.find((p) => p.id === 135),
          products.find((p) => p.id === 128),
        ]
          .filter((p) => p && !p.hidden)
          .map(card)
          .join('')}
      </div>
    </section>
    <section class="editorial">
      <p class="eyebrow">LESS NOISE. MORE POSSIBILITY.</p>
      <h2>Tech should make life simpler.<br />Finding it should, too.</h2>
      <p>iPhone, iPad, and MacBook. Find the generation that fits your everyday.</p>
      <a class="text-link" href="products.html"
        >Find your fit
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
}
