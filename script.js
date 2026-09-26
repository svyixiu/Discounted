const els = {
  products: document.querySelector('#products'),
  search: document.querySelector('#searchInput'),
  sort: document.querySelector('#sortSelect'),
  resultCount: document.querySelector('#resultCount'),
  totalCount: document.querySelector('#totalCount'),
  updatedAt: document.querySelector('#updatedAt'),
  cheapest: document.querySelector('#cheapestValue'),
  bestDiscount: document.querySelector('#bestDiscountValue'),
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
  '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'
}[ch]));

function normalizeType(value) {
  const raw = String(value || 'game').trim().toLowerCase();
  if (['dlc','downloadable content','downloadable_content'].includes(raw)) return 'dlc';
  if (['bundle','package'].includes(raw)) return 'bundle';
  if (raw === 'game') return 'game';
  return 'other';
}

function formatDate(iso) {
  const d = new Date(`${iso || ''}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 'Updated recently';
  return `Updated ${new Intl.DateTimeFormat('en-US', { month:'short', day:'numeric', year:'numeric' }).format(d)}`;
}

function discountMatches(game) {
  if (activeDiscount === '50plus') return game.discount_percent >= 50;
  if (activeDiscount === '70plus') return game.discount_percent >= 70;
  if (activeDiscount === '90plus') return game.discount_percent >= 90;
  return true;
}

function typeMatches(game) {
  return activeType === 'all' || game.type === activeType;
}

function sortProducts(items) {
  const copy = [...items];
  const byName = (a,b) => a.title.localeCompare(b.title, undefined, { sensitivity:'base' });
  switch (els.sort.value) {
    case 'za': return copy.sort((a,b) => byName(b,a));
    case 'cheap': return copy.sort((a,b) => a.sale_price - b.sale_price || byName(a,b));
    case 'expensive': return copy.sort((a,b) => b.sale_price - a.sale_price || byName(a,b));
    case 'discount': return copy.sort((a,b) => b.discount_percent - a.discount_percent || a.sale_price - b.sale_price || byName(a,b));
    case 'discount-low': return copy.sort((a,b) => a.discount_percent - b.discount_percent || byName(a,b));
    case 'savings': return copy.sort((a,b) => (b.original_price-b.sale_price) - (a.original_price-a.sale_price) || byName(a,b));
    default: return copy.sort(byName);
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
}

function render() {
  updateBudgetUI();
  const query = els.search.value.trim().toLocaleLowerCase();
  const min = Number(els.minPrice.value);
  const max = Number(els.maxPrice.value);

  const filtered = catalog.filter(product => {
    const haystack = `${product.title} ${product.sale_group || ''} ${product.type}`.toLocaleLowerCase();
    return typeMatches(product)
      && discountMatches(product)
      && product.sale_price >= min
      && product.sale_price <= max
      && haystack.includes(query);
  });
  const ordered = sortProducts(filtered);

  els.products.innerHTML = ordered.map(product => {
    const saved = Math.max(0, product.original_price - product.sale_price);
    const steamUrl = `https://store.steampowered.com/search/?term=${encodeURIComponent(product.title)}`;
    const sourceMark = product.verified_by === 'Steam offer page' ? '✓' : 'i';
    return `
      <article class="product-card">
        <div class="card-top">
          <span class="type-badge type-${escapeHtml(product.type)}">${escapeHtml(product.type)}</span>
          <span class="discount-badge">-${product.discount_percent}%</span>
        </div>
        <div class="card-body">
          <h3 class="product-title">${escapeHtml(product.title)}</h3>
          <p class="sale-group">${escapeHtml(product.sale_group || 'Steam promotion')}</p>
          <div class="price-line">
            <strong class="price-now">${money(product.sale_price)}</strong>
            <span class="price-was">${money(product.original_price)}</span>
          </div>
          <div class="saving-line">SAVE ${money(saved)}</div>
        </div>
        <div class="card-action">
          <a class="steam-link" href="${escapeHtml(steamUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Search ${escapeHtml(product.title)} on Steam">
            <span>FIND ON STEAM</span><span>↗</span>
          </a>
          <span class="card-source" title="${escapeHtml(product.verified_by || 'Indexed source')}">${sourceMark}</span>
        </div>
      </article>`;
  }).join('');

  const label = activeType === 'all' ? 'PRODUCTS' : activeType === 'dlc' ? 'DLC' : `${activeType.toUpperCase()}S`;
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
  els.typeTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.type === 'game'));
  els.quickChips.forEach(chip => chip.classList.toggle('active', chip.dataset.filter === 'all'));
  render();
}

function setSnapshot() {
  els.totalCount.textContent = catalog.length.toLocaleString('en-US');
  els.updatedAt.textContent = formatDate(meta.updated_at);
  if (!catalog.length) return;
  const cheapest = catalog.reduce((a,b) => a.sale_price <= b.sale_price ? a : b);
  const biggest = catalog.reduce((a,b) => a.discount_percent >= b.discount_percent ? a : b);
  els.cheapest.textContent = money(cheapest.sale_price);
  els.bestDiscount.textContent = `-${biggest.discount_percent}%`;

  const counts = { game:0, dlc:0, bundle:0, all:catalog.length };
  catalog.forEach(item => { if (counts[item.type] !== undefined) counts[item.type] += 1; });
  els.counts.game.textContent = counts.game;
  els.counts.dlc.textContent = counts.dlc;
  els.counts.bundle.textContent = counts.bundle;
  els.counts.all.textContent = counts.all;
}

function setupBudget() {
  const maxPrice = Math.max(0, ...catalog.map(item => item.sale_price));
  absoluteMax = Math.max(5, Math.ceil(maxPrice / 5) * 5);
  [els.minPrice, els.maxPrice].forEach(input => input.max = String(absoluteMax));
  els.minPrice.value = '0';
  els.maxPrice.value = String(absoluteMax);
  els.rangeMaxLabel.textContent = money(absoluteMax).replace('.00','');
  updateBudgetUI();
}

async function boot() {
  try {
    const response = await fetch('./games.json', { cache:'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.games)) throw new Error('games.json has no games array');

    meta = data.meta || {};
    catalog = data.games
      .filter(item => item && item.title && Number.isFinite(Number(item.original_price)) && Number.isFinite(Number(item.sale_price)) && Number.isFinite(Number(item.discount_percent)))
      .map(item => ({
        ...item,
        type: normalizeType(item.type || item.product_type),
        original_price: Number(item.original_price),
        sale_price: Number(item.sale_price),
        discount_percent: Number(item.discount_percent)
      }));

    setupBudget();
    setSnapshot();
    render();
  } catch (error) {
    console.error('Failed to load games.json', error);
    els.resultCount.textContent = 'CATALOG UNAVAILABLE';
    els.error.hidden = false;
    els.totalCount.textContent = '—';
  }
}

els.search.addEventListener('input', render);
els.sort.addEventListener('change', render);
els.minPrice.addEventListener('input', render);
els.maxPrice.addEventListener('input', render);
els.reset.addEventListener('click', resetAll);
els.emptyReset.addEventListener('click', resetAll);

els.typeTabs.forEach(tab => tab.addEventListener('click', () => {
  activeType = tab.dataset.type;
  els.typeTabs.forEach(item => item.classList.toggle('active', item === tab));
  render();
}));

els.quickChips.forEach(chip => chip.addEventListener('click', () => {
  activeDiscount = chip.dataset.filter;
  els.quickChips.forEach(item => item.classList.toggle('active', item === chip));
  render();
}));

document.addEventListener('keydown', event => {
  if (event.key === '/' && document.activeElement !== els.search && !['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)) {
    event.preventDefault();
    els.search.focus();
  }
});

boot();