function catalog() {
  const params = new URLSearchParams(location.search);
  main.innerHTML =
    heading(
      'THE COLLECTION',
      'Find your next upgrade.',
      'Explore ' +
        products.filter((p) => !p.hidden).length +
        ' products across our curated collections.',
    ) +
    /* HTML */ `<section aria-label="Product catalog">
      <p class="catalog-note">
        Independent portfolio demo · Prices and stock are illustrative. Choose a model, then
        personalize its color, storage, and available memory.
      </p>
      <div class="catalog-controls">
        <label class="search-label"
          ><span class="sr-only">Search Apple models or chips</span
          ><span class="search-field"
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
              <use href="images/icons.svg#search"></use></svg
            ><input
              type="search"
              id="search"
              placeholder="Search iPhone, iPad, MacBook, M5…" /></span></label
        ><label
          >Family<select id="category">
            <option value="All">All families</option>
            ${getCategories()
              .map((c) => '<option>' + escapeStoreHtml(c) + '</option>')
              .join('')}
          </select></label
        ><label
          >Generation<select id="generation">
            <option value="All">All generations</option>
          </select></label
        ><label
          >Sort by<select id="sort">
            <option value="default">Featured</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select></label
        ><button id="clear-filters" class="filter-reset" type="button">
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
            <use href="images/icons.svg#reset"></use></svg
          ><span>Reset</span>
        </button>
      </div>
      <p id="results" role="status" class="muted"></p>
      <div class="product-grid" id="grid"></div>
      <div class="load-more-wrap">
        <button class="button" id="load-more" type="button" hidden>
          Show more models
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
              <use href="images/icons.svg#plus"></use></svg
          ></span>
        </button>
      </div>
    </section>`;
  const search = document.getElementById('search'),
    category = document.getElementById('category'),
    generation = document.getElementById('generation'),
    sort = document.getElementById('sort'),
    more = document.getElementById('load-more');
  search.value = params.get('q') || '';
  if ([...category.options].some((o) => o.value === params.get('category')))
    category.value = params.get('category');
  if ([...sort.options].some((o) => o.value === params.get('sort')))
    sort.value = params.get('sort');
  function populateGenerations(selected = 'All') {
    const choices = [
      ...new Set(
        products
          .filter((p) => category.value === 'All' || p.category === category.value)
          .map((p) => p.generation),
      ),
    ];
    generation.innerHTML =
      '<option value="All">All generations</option>' +
      choices.map((g) => '<option>' + escapeStoreHtml(g) + '</option>').join('');
    generation.value = choices.includes(selected) ? selected : 'All';
  }
  populateGenerations(params.get('generation') || 'All');
  let visible = 12;
  function reset() {
    search.value = '';
    category.value = 'All';
    sort.value = 'default';
    populateGenerations();
    render();
    search.focus();
  }
  function render(append = false) {
    if (!append) visible = 12;
    const items = filterProducts({
      query: search.value,
      category: category.value,
      generation: generation.value,
      sort: sort.value,
    });
    const shown = items.slice(0, visible);
    document.getElementById('results').textContent =
      'Showing ' + shown.length + ' of ' + items.length + ' models';
    document.getElementById('grid').innerHTML = items.length
      ? shown.map(card).join('')
      : '<div class="empty"><h2>No matching models.</h2><p>Try another search or reset your filters.</p><button class="button" id="reset">Reset filters</button></div>';
    document.getElementById('reset')?.addEventListener('click', reset);
    more.hidden = visible >= items.length;
    const next = new URLSearchParams();
    if (search.value) next.set('q', search.value);
    if (category.value !== 'All') next.set('category', category.value);
    if (generation.value !== 'All') next.set('generation', generation.value);
    if (sort.value !== 'default') next.set('sort', sort.value);
    history.replaceState(null, '', location.pathname + (next.size ? '?' + next : ''));
    updateNavigation();
  }
  search.addEventListener('input', () => render());
  category.addEventListener('change', () => {
    populateGenerations();
    render();
  });
  generation.addEventListener('change', () => render());
  sort.addEventListener('change', () => render());
  document.getElementById('clear-filters').addEventListener('click', reset);
  more.addEventListener('click', () => {
    const firstNew = visible;
    visible += 12;
    render(true);
    document.querySelectorAll('#grid .product-card a.product-image')[firstNew]?.focus();
  });
  render();
}
