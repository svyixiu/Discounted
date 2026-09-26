const els = {
  products: document.querySelector('#products'),
  search: document.querySelector('#searchInput'),
  sort: document.querySelector('#sortSelect'),
  resultCount: document.querySelector('#resultCount'),
  updatedAt: document.querySelector('#updatedAt'),
  empty: document.querySelector('#emptyState'),
  error: document.querySelector('#errorState'),
  reset: document.querySelector('#resetButton'),
  emptyReset: document.querySelector('#emptyReset'),
  typeTabs: [...document.querySelectorAll('.type-tab')],
  quickChips: [...document.querySelectorAll('.quick-chip')],
  minPrice: document.querySelector('#minPrice'),
  maxPrice: document.querySelector('#maxPrice'),
  budgetOutput: document.querySelector('#budgetOutput'),
  rangeFill: document.querySelector('#rangeFill'),
  rangeMaxLabel: document.querySelector('#rangeMaxLabel'),
  heroCount: document.querySelector('#heroCount'),
  stageBudget: document.querySelector('#stageBudget'),
  stageTitle: document.querySelector('#stageTitle'),
  stageGroup: document.querySelector('#stageGroup'),
  stageDiscount: document.querySelector('#stageDiscount'),
  stagePrice: document.querySelector('#stagePrice'),
  stageWas: document.querySelector('#stageWas'),
  stageCheapest: document.querySelector('#stageCheapest'),
  stageBestCut: document.querySelector('#stageBestCut'),
  counts: {
    game: document.querySelector('#gameCount'),
    dlc: document.querySelector('#dlcCount'),
    bundle: document.querySelector('#bundleCount'),
    all: document.querySelector('#allCount')
  }
};

let catalog = [];
let meta = {};
let activeType = 'game';
let activeDiscount = 'all';
let absoluteMax = 100;

const money = value => `$${Number(value).toFixed(2)}`;
const escapeHtml = value => String(value).replace(/[&<>'"]/g, ch => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
}[ch]));

function normalizeType(value) {
  const raw = String(value || 'game').trim().toLowerCase();
  if (['dlc', 'downloadable content', 'downloadable_content'].includes(raw)) return 'dlc';
  if (['bundle', 'package'].includes(raw)) return 'bundle';
  if (raw === 'game') return 'game';
  return 'other';
}

function typeLabel(type) {
  if (type === 'dlc') return 'DLC';
  if (type === 'bundle') return 'Bundle';
  if (type === 'other') return 'Other';
  return 'Game';
}

function typeIcon(type) {
  if (type === 'dlc') return 'i-puzzle';
  if (type === 'bundle') return 'i-box';
  if (type === 'other') return 'i-grid';
  return 'i-gamepad';
}

function formatDate(iso) {
  const d = new Date(`${iso || ''}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 'Updated recently';
  return `Updated ${new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(d)}`;
}

function discountMatches(product) {
  if (activeDiscount === '50plus') return product.discount_percent >= 50;
  if (activeDiscount === '70plus') return product.discount_percent >= 70;
  if (activeDiscount === '90plus') return product.discount_percent >= 90;
  return true;
}

function typeMatches(product) {
  return activeType === 'all' || product.type === activeType;
}

function sortProducts(items) {
  const copy = [...items];
  const byName = (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });

  switch (els.sort.value) {
    case 'za':
      return copy.sort((a, b) => byName(b, a));
    case 'cheap':
      return copy.sort((a, b) => a.sale_price - b.sale_price || byName(a, b));
    case 'expensive':
      return copy.sort((a, b) => b.sale_price - a.sale_price || byName(a, b));
    case 'discount':
      return copy.sort((a, b) => b.discount_percent - a.discount_percent || a.sale_price - b.sale_price || byName(a, b));
    case 'discount-low':
      return copy.sort((a, b) => a.discount_percent - b.discount_percent || byName(a, b));
    case 'savings':
      return copy.sort((a, b) =>
        (b.original_price - b.sale_price) - (a.original_price - a.sale_price) || byName(a, b)
      );
    default:
      return copy.sort(byName);
  }
}

function updateBudgetUI() {
  let min = Number(els.minPrice.value);
  let max = Number(els.maxPrice.value);

  if (min > max) {
    if (document.activeElement === els.minPrice) max = min;
    else min = max;

    els.minPrice.value = min;
    els.maxPrice.value = max;
  }

  const minPct = absoluteMax ? (min / absoluteMax) * 100 : 0;
  const maxPct = absoluteMax ? (max / absoluteMax) * 100 : 100;

  els.rangeFill.style.left = `${minPct}%`;
  els.rangeFill.style.width = `${Math.max(0, maxPct - minPct)}%`;
  els.budgetOutput.textContent = `${money(min)} — ${money(max)}`;

  if (els.stageBudget) {
    els.stageBudget.textContent = `${money(min).replace('.00', '')} — ${money(max).replace('.00', '')}`;
  }
}

function filteredCatalog() {
  const query = els.search.value.trim().toLocaleLowerCase();
  const min = Number(els.minPrice.value);
  const max = Number(els.maxPrice.value);

  return catalog.filter(product => {
    const haystack = `${product.title} ${product.sale_group || ''} ${product.type}`.toLocaleLowerCase();

    return typeMatches(product)
      && discountMatches(product)
      && product.sale_price >= min
      && product.sale_price <= max
      && haystack.includes(query);
  });
}

function renderCard(product) {
  const saved = Math.max(0, product.original_price - product.sale_price);
  const steamUrl = `https://store.steampowered.com/search/?term=${encodeURIComponent(product.title)}`;
  const sourceIcon = product.verified_by === 'Steam offer page' ? 'i-check' : 'i-info';

  return `
    <article class="product-card">
      <div class="card-top">
        <span class="type-badge type-${escapeHtml(product.type)}">
          <svg class="i i-sm"><use href="#${typeIcon(product.type)}"/></svg>
          ${escapeHtml(typeLabel(product.type))}
        </span>
        <span class="discount-badge">-${product.discount_percent}%</span>
      </div>

      <div class="card-body">
        <h3 class="product-title">${escapeHtml(product.title)}</h3>
        <p class="sale-group">${escapeHtml(product.sale_group || 'Steam promotion')}</p>

        <div class="price-line">
          <strong class="price-now">${money(product.sale_price)}</strong>
          <span class="price-was">${money(product.original_price)}</span>
        </div>

        <div class="saving-line">Save ${money(saved)}</div>
      </div>

      <div class="card-action">
        <a class="steam-link"
           href="${escapeHtml(steamUrl)}"
           target="_blank"
           rel="noopener noreferrer"
           aria-label="Search ${escapeHtml(product.title)} on Steam">
          <span>FIND ON STEAM</span>
          <svg class="i i-sm"><use href="#i-external"/></svg>
        </a>

        <span class="card-source" title="${escapeHtml(product.verified_by || 'Indexed source')}">
          <svg class="i i-sm"><use href="#${sourceIcon}"/></svg>
        </span>
      </div>
    </article>
  `;
}

function render() {
  updateBudgetUI();

  const ordered = sortProducts(filteredCatalog());
  els.products.innerHTML = ordered.map(renderCard).join('');

  const label =
    activeType === 'all' ? 'products'
    : activeType === 'dlc' ? 'DLC'
    : activeType === 'bundle' ? 'bundles'
    : activeType === 'other' ? 'products'
    : 'games';

  els.resultCount.textContent = `${ordered.length.toLocaleString('en-US')} ${label}`;
  els.empty.hidden = ordered.length !== 0;
}

function resetAll() {
  els.search.value = '';
  els.sort.value = 'az';
  activeType = 'game';
  activeDiscount = 'all';
  els.minPrice.value = 0;
  els.maxPrice.value = absoluteMax;

  els.typeTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.type === 'game');
  });

  els.quickChips.forEach(chip => {
    chip.classList.toggle('active', chip.dataset.filter === 'all');
  });

  render();
}

function setupBudget() {
  const maxPrice = Math.max(0, ...catalog.map(item => item.sale_price));
  absoluteMax = Math.max(5, Math.ceil(maxPrice / 5) * 5);

  [els.minPrice, els.maxPrice].forEach(input => {
    input.max = String(absoluteMax);
  });

  els.minPrice.value = '0';
  els.maxPrice.value = String(absoluteMax);
  els.rangeMaxLabel.textContent = money(absoluteMax).replace('.00', '');

  updateBudgetUI();
}

function setCounts() {
  const counts = { game: 0, dlc: 0, bundle: 0, all: catalog.length };

  catalog.forEach(item => {
    if (counts[item.type] !== undefined) counts[item.type] += 1;
  });

  els.counts.game.textContent = counts.game.toLocaleString('en-US');
  els.counts.dlc.textContent = counts.dlc.toLocaleString('en-US');
  els.counts.bundle.textContent = counts.bundle.toLocaleString('en-US');
  els.counts.all.textContent = counts.all.toLocaleString('en-US');
}

function setHeroSnapshot() {
  if (!catalog.length) return;

  const cheapest = catalog.reduce((a, b) => a.sale_price <= b.sale_price ? a : b);
  const biggestCut = catalog.reduce((a, b) => a.discount_percent >= b.discount_percent ? a : b);

  const featured = [...catalog].sort((a, b) =>
    b.discount_percent - a.discount_percent
    || a.sale_price - b.sale_price
    || a.title.localeCompare(b.title)
  )[0];

  if (els.heroCount) {
    const updated = meta.updated_at
      ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${meta.updated_at}T00:00:00`))
      : 'current snapshot';

    els.heroCount.textContent = `${catalog.length.toLocaleString('en-US')} tracked discounts · ${updated}`;
  }

  els.stageCheapest.textContent = money(cheapest.sale_price);
  els.stageBestCut.textContent = `-${biggestCut.discount_percent}%`;
  els.stageTitle.textContent = featured.title;
  els.stageGroup.textContent = featured.sale_group || 'Steam promotion';
  els.stageDiscount.textContent = `-${featured.discount_percent}%`;
  els.stagePrice.textContent = money(featured.sale_price);
  els.stageWas.textContent = money(featured.original_price);
}

async function boot() {
  try {
    const response = await fetch('./games.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data.games)) throw new Error('games.json has no games array');

    meta = data.meta || {};

    catalog = data.games
      .filter(item =>
        item
        && item.title
        && Number.isFinite(Number(item.original_price))
        && Number.isFinite(Number(item.sale_price))
        && Number.isFinite(Number(item.discount_percent))
      )
      .map(item => ({
        ...item,
        type: normalizeType(item.type || item.product_type),
        original_price: Number(item.original_price),
        sale_price: Number(item.sale_price),
        discount_percent: Number(item.discount_percent)
      }));

    setupBudget();
    setCounts();
    setHeroSnapshot();

    els.updatedAt.textContent = formatDate(meta.updated_at);
    render();
  } catch (error) {
    console.error('Failed to load games.json', error);
    els.resultCount.textContent = 'Catalog unavailable';
    els.error.hidden = false;
    if (els.heroCount) els.heroCount.textContent = 'Catalog unavailable';
  }
}

els.search.addEventListener('input', render);
els.sort.addEventListener('change', render);
els.minPrice.addEventListener('input', render);
els.maxPrice.addEventListener('input', render);
els.reset.addEventListener('click', resetAll);
els.emptyReset.addEventListener('click', resetAll);

els.typeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    activeType = tab.dataset.type;
    els.typeTabs.forEach(item => item.classList.toggle('active', item === tab));
    render();
  });
});

els.quickChips.forEach(chip => {
  chip.addEventListener('click', () => {
    activeDiscount = chip.dataset.filter;
    els.quickChips.forEach(item => item.classList.toggle('active', item === chip));
    render();
  });
});

document.addEventListener('keydown', event => {
  const activeTag = document.activeElement?.tagName;

  if (
    event.key === '/'
    && document.activeElement !== els.search
    && !['INPUT', 'SELECT', 'TEXTAREA'].includes(activeTag)
  ) {
    event.preventDefault();
    els.search.focus();
  }
});

boot();