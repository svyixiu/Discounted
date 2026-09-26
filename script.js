const els = {
  products: document.querySelector('#products'),
  search: document.querySelector('#searchInput'),
  sort: document.querySelector('#sortSelect'),
  pageSize: document.querySelector('#pageSizeSelect'),
  currency: document.querySelector('#currencySelect'),
  layout: document.querySelector('#layoutSelect'),
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
  rangeMinLabel: document.querySelector('#rangeMinLabel'),
  rangeMaxLabel: document.querySelector('#rangeMaxLabel'),
  heroCount: document.querySelector('#heroCount'),
  previewMedia: document.querySelector('#previewMedia'),
  previewImage: document.querySelector('#previewImage'),
  previewType: document.querySelector('#previewType'),
  previewTitle: document.querySelector('#previewTitle'),
  previewGroup: document.querySelector('#previewGroup'),
  previewDiscount: document.querySelector('#previewDiscount'),
  previewPrice: document.querySelector('#previewPrice'),
  previewWas: document.querySelector('#previewWas'),
  stageCheapest: document.querySelector('#stageCheapest'),
  stageBestCut: document.querySelector('#stageBestCut'),
  pagination: document.querySelector('#pagination'),
  prevPage: document.querySelector('#prevPage'),
  nextPage: document.querySelector('#nextPage'),
  pageNumbers: document.querySelector('#pageNumbers'),
  backToTop: document.querySelector('#backToTop'),
  counts: {
    game: document.querySelector('#gameCount'),
    dlc: document.querySelector('#dlcCount'),
    bundle: document.querySelector('#bundleCount'),
    all: document.querySelector('#allCount')
  }
};

let catalog = [];
let meta = {};
let rates = { USD: 1 };
let activeType = 'game';
let activeDiscount = 'all';
let currentPage = 1;
let currentCurrency = 'USD';
let currencyRate = 1;
let absoluteMaxUSD = 100;
let thumbnailObserver = null;

const THUMB_CACHE_PREFIX = 'discounted:thumb:';
const CURRENCY_KEY = 'discounted:currency';
const LAYOUT_KEY = 'discounted:layout';
const formatterCache = new Map();

const escapeHtml = value => String(value).replace(/[&<>'"]/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
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

function getFormatter(code) {
  if (formatterCache.has(code)) return formatterCache.get(code);

  let formatter;

  try {
    formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2
    });
  } catch {
    formatter = {
      format(value) {
        return `${code} ${Number(value).toFixed(2)}`;
      }
    };
  }

  formatterCache.set(code, formatter);
  return formatter;
}

function converted(usd) {
  return Number(usd) * currencyRate;
}

function moneyUSD(usd) {
  return getFormatter(currentCurrency).format(converted(usd));
}

function moneyValue(value) {
  return getFormatter(currentCurrency).format(Number(value));
}

function steamSearchUrl(title) {
  return `https://store.steampowered.com/search/?term=${encodeURIComponent(title)}`;
}

function internalProductUrl(title) {
  return `./product.html?title=${encodeURIComponent(title)}`;
}

function steamHeaderUrl(appid) {
  return `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`;
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
    case 'za': return copy.sort((a, b) => byName(b, a));
    case 'cheap': return copy.sort((a, b) => a.sale_price - b.sale_price || byName(a, b));
    case 'expensive': return copy.sort((a, b) => b.sale_price - a.sale_price || byName(a, b));
    case 'discount': return copy.sort((a, b) => b.discount_percent - a.discount_percent || a.sale_price - b.sale_price || byName(a, b));
    case 'discount-low': return copy.sort((a, b) => a.discount_percent - b.discount_percent || byName(a, b));
    case 'savings':
      return copy.sort((a, b) =>
        (b.original_price - b.sale_price) - (a.original_price - a.sale_price) || byName(a, b)
      );
    default: return copy.sort(byName);
  }
}

function budgetStep(max) {
  if (max >= 100000) return 1000;
  if (max >= 10000) return 100;
  if (max >= 1000) return 10;
  if (max >= 250) return 1;
  return .5;
}

function setupBudget(preserve = null) {
  absoluteMaxUSD = Math.max(5, Math.ceil(Math.max(0, ...catalog.map(item => item.sale_price)) / 5) * 5);

  const selectedMax = Math.ceil(absoluteMaxUSD * currencyRate);
  const step = budgetStep(selectedMax);

  [els.minPrice, els.maxPrice].forEach(input => {
    input.min = '0';
    input.max = String(selectedMax);
    input.step = String(step);
  });

  if (preserve) {
    els.minPrice.value = String(Math.max(0, Math.min(selectedMax, preserve.minUSD * currencyRate)));
    els.maxPrice.value = String(Math.max(0, Math.min(selectedMax, preserve.maxUSD * currencyRate)));
  } else {
    els.minPrice.value = '0';
    els.maxPrice.value = String(selectedMax);
  }

  updateBudgetUI();
}

function updateBudgetUI() {
  let min = Number(els.minPrice.value);
  let max = Number(els.maxPrice.value);

  if (min > max) {
    if (document.activeElement === els.minPrice) max = min;
    else min = max;

    els.minPrice.value = String(min);
    els.maxPrice.value = String(max);
  }

  const selectedMax = Number(els.maxPrice.max) || 1;
  const minPct = min / selectedMax * 100;
  const maxPct = max / selectedMax * 100;

  els.rangeFill.style.left = `${minPct}%`;
  els.rangeFill.style.width = `${Math.max(0, maxPct - minPct)}%`;
  els.budgetOutput.textContent = `${moneyValue(min)} — ${moneyValue(max)}`;
  els.rangeMinLabel.textContent = moneyValue(0);
  els.rangeMaxLabel.textContent = moneyValue(selectedMax);
}

function filteredCatalog() {
  const query = els.search.value.trim().toLocaleLowerCase();
  const min = Number(els.minPrice.value);
  const max = Number(els.maxPrice.value);

  return catalog.filter(product => {
    const haystack = `${product.title} ${product.sale_group || ''} ${product.type}`.toLocaleLowerCase();
    const selectedPrice = converted(product.sale_price);

    return typeMatches(product)
      && discountMatches(product)
      && selectedPrice >= min
      && selectedPrice <= max
      && haystack.includes(query);
  });
}

function fullCard(product) {
  const saved = Math.max(0, product.original_price - product.sale_price);

  return `
    <article class="product-card" data-title="${escapeHtml(product.title)}">
      <a class="card-media" href="${escapeHtml(internalProductUrl(product.title))}" aria-label="View ${escapeHtml(product.title)} on Discounted">
        <span class="thumb-fallback" aria-hidden="true"><svg class="i"><use href="#i-image"/></svg></span>
        <img class="product-thumb" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
      </a>

      <div class="card-top">
        <span class="type-badge"><svg class="i i-sm"><use href="#${typeIcon(product.type)}"/></svg>${escapeHtml(typeLabel(product.type))}</span>
        <span class="discount-badge">-${product.discount_percent}%</span>
      </div>

      <div class="card-body">
        <h3 class="product-title">${escapeHtml(product.title)}</h3>
        <p class="sale-group">${escapeHtml(product.sale_group || 'Steam promotion')}</p>
        <div class="price-line">
          <strong class="price-now">${moneyUSD(product.sale_price)}</strong>
          <span class="price-was">${moneyUSD(product.original_price)}</span>
        </div>
        <div class="saving-line">Save ${moneyUSD(saved)}</div>
      </div>

      <div class="card-action">
        <a href="${escapeHtml(internalProductUrl(product.title))}"><svg class="i i-sm"><use href="#i-eye"/></svg>VIEW HERE</a>
        <a href="${escapeHtml(steamSearchUrl(product.title))}" target="_blank" rel="noopener noreferrer"><svg class="i i-sm"><use href="#i-external"/></svg>STEAM</a>
      </div>
    </article>
  `;
}

function compactCard(product) {
  return `
    <article class="product-card compact-card" data-title="${escapeHtml(product.title)}">
      <a class="card-media" href="${escapeHtml(internalProductUrl(product.title))}" aria-label="View ${escapeHtml(product.title)} on Discounted">
        <span class="thumb-fallback" aria-hidden="true"><svg class="i"><use href="#i-image"/></svg></span>
        <img class="product-thumb" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
      </a>
      <div class="compact-main">
        <h3 class="product-title">${escapeHtml(product.title)}</h3>
        <p class="sale-group">${escapeHtml(typeLabel(product.type))} · ${escapeHtml(product.sale_group || 'Steam promotion')}</p>
      </div>
      <div class="compact-discount">-${product.discount_percent}%</div>
      <div class="compact-price">
        <s>${moneyUSD(product.original_price)}</s>
        <strong>${moneyUSD(product.sale_price)}</strong>
      </div>
      <div class="compact-actions">
        <a href="${escapeHtml(internalProductUrl(product.title))}"><svg class="i i-sm"><use href="#i-eye"/></svg>VIEW</a>
        <a href="${escapeHtml(steamSearchUrl(product.title))}" target="_blank" rel="noopener noreferrer"><svg class="i i-sm"><use href="#i-external"/></svg>STEAM</a>
      </div>
    </article>
  `;
}

function readThumbCache(title) {
  try {
    const raw = localStorage.getItem(THUMB_CACHE_PREFIX + title);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.thumbnail_url ? data : null;
  } catch {
    return null;
  }
}

function writeThumbCache(title, data) {
  try {
    localStorage.setItem(THUMB_CACHE_PREFIX + title, JSON.stringify({
      thumbnail_url: data.thumbnail_url,
      fallback_url: data.fallback_url || null,
      cached_at: Date.now()
    }));
  } catch {}
}

function setImage(container, image, primaryUrl, fallbackUrl = null) {
  if (!container || !image || !primaryUrl) return;

  let triedFallback = false;

  image.onload = () => container.classList.add('loaded');
  image.onerror = () => {
    if (!triedFallback && fallbackUrl && fallbackUrl !== primaryUrl) {
      triedFallback = true;
      image.src = fallbackUrl;
      return;
    }

    container.classList.remove('loaded');
    image.removeAttribute('src');
  };

  image.src = primaryUrl;
}

async function thumbnailData(product) {
  if (product.thumbnail_url) return { thumbnail_url: product.thumbnail_url };

  const appid = product.steam_appid || product.thumbnail_appid;
  if (appid) return { thumbnail_url: steamHeaderUrl(appid) };

  const cached = readThumbCache(product.title);
  if (cached) return cached;

  try {
    const response = await fetch(`/api/steam-thumb?title=${encodeURIComponent(product.title)}`, {
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.thumbnail_url) return null;

    writeThumbCache(product.title, data);
    return data;
  } catch {
    return null;
  }
}

async function resolveThumbnail(card, product) {
  if (card.dataset.thumbResolved === '1') return;
  card.dataset.thumbResolved = '1';

  const data = await thumbnailData(product);
  if (!data) return;

  setImage(card.querySelector('.card-media'), card.querySelector('.product-thumb'), data.thumbnail_url, data.fallback_url);
}

function attachThumbnails(pageItems) {
  if (thumbnailObserver) {
    thumbnailObserver.disconnect();
    thumbnailObserver = null;
  }

  const cards = [...els.products.querySelectorAll('.product-card')];

  if (!('IntersectionObserver' in window)) {
    cards.forEach((card, index) => resolveThumbnail(card, pageItems[index]));
    return;
  }

  thumbnailObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const index = cards.indexOf(entry.target);
      if (pageItems[index]) resolveThumbnail(entry.target, pageItems[index]);
      thumbnailObserver.unobserve(entry.target);
    });
  }, { rootMargin: '220px 0px', threshold: 0.01 });

  cards.forEach(card => thumbnailObserver.observe(card));
}

function renderPagination(totalItems, pageSize) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  currentPage = Math.min(currentPage, totalPages);

  els.pagination.hidden = totalItems <= pageSize || totalItems === 0;
  els.prevPage.disabled = currentPage <= 1;
  els.nextPage.disabled = currentPage >= totalPages;

  if (els.pagination.hidden) {
    els.pageNumbers.innerHTML = '';
    return;
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const visible = [...pages].filter(p => p >= 1 && p <= totalPages).sort((a,b) => a-b);
  const parts = [];
  let previous = 0;

  for (const page of visible) {
    if (previous && page - previous > 1) parts.push('<span class="page-gap">…</span>');
    parts.push(`<button class="page-number ${page === currentPage ? 'active' : ''}" type="button" data-page="${page}" aria-current="${page === currentPage ? 'page' : 'false'}">${page}</button>`);
    previous = page;
  }

  els.pageNumbers.innerHTML = parts.join('');
  els.pageNumbers.querySelectorAll('[data-page]').forEach(button => {
    button.addEventListener('click', () => {
      currentPage = Number(button.dataset.page);
      render({ scrollToResults: true });
    });
  });
}

function render(options = {}) {
  updateBudgetUI();

  const ordered = sortProducts(filteredCatalog());
  const pageSize = Number(els.pageSize.value) || 25;
  const totalPages = Math.max(1, Math.ceil(ordered.length / pageSize));

  currentPage = Math.max(1, Math.min(currentPage, totalPages));

  const start = (currentPage - 1) * pageSize;
  const pageItems = ordered.slice(start, start + pageSize);
  const compact = els.layout.value === 'compact';

  els.products.classList.toggle('compact', compact);
  els.products.innerHTML = pageItems.map(compact ? compactCard : fullCard).join('');
  attachThumbnails(pageItems);

  const label = activeType === 'all' ? 'products' : activeType === 'dlc' ? 'DLC' : activeType === 'bundle' ? 'bundles' : 'games';
  const rangeStart = ordered.length ? start + 1 : 0;
  const rangeEnd = Math.min(start + pageSize, ordered.length);

  els.resultCount.textContent = ordered.length
    ? `${ordered.length.toLocaleString()} ${label} · showing ${rangeStart}–${rangeEnd}`
    : `0 ${label}`;

  els.empty.hidden = ordered.length !== 0;
  renderPagination(ordered.length, pageSize);

  if (options.scrollToResults) {
    document.querySelector('.results-head')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function resetPageAndRender() {
  currentPage = 1;
  render();
}

function resetAll() {
  els.search.value = '';
  els.sort.value = 'az';
  els.pageSize.value = '25';
  activeType = 'game';
  activeDiscount = 'all';
  currentPage = 1;

  els.typeTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.type === 'game'));
  els.quickChips.forEach(chip => chip.classList.toggle('active', chip.dataset.filter === 'all'));

  setupBudget();
  render();
}

function setCounts() {
  const counts = { game: 0, dlc: 0, bundle: 0, all: catalog.length };

  catalog.forEach(item => {
    if (counts[item.type] !== undefined) counts[item.type] += 1;
  });

  els.counts.game.textContent = counts.game.toLocaleString();
  els.counts.dlc.textContent = counts.dlc.toLocaleString();
  els.counts.bundle.textContent = counts.bundle.toLocaleString();
  els.counts.all.textContent = counts.all.toLocaleString();
}

async function setHeroSnapshot() {
  if (!catalog.length) return;

  const cheapest = catalog.reduce((a,b) => a.sale_price <= b.sale_price ? a : b);
  const biggestCut = catalog.reduce((a,b) => a.discount_percent >= b.discount_percent ? a : b);
  const featured = [...catalog]
    .filter(item => item.type === 'game')
    .sort((a,b) => b.discount_percent - a.discount_percent || a.sale_price - b.sale_price)[0] || catalog[0];

  const updated = meta.updated_at
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${meta.updated_at}T00:00:00`))
    : 'current snapshot';

  els.heroCount.textContent = `${catalog.length.toLocaleString()} tracked discounts · ${updated}`;
  els.stageCheapest.textContent = moneyUSD(cheapest.sale_price);
  els.stageBestCut.textContent = `-${biggestCut.discount_percent}%`;
  els.previewType.textContent = typeLabel(featured.type);
  els.previewTitle.textContent = featured.title;
  els.previewGroup.textContent = featured.sale_group || 'Steam promotion';
  els.previewDiscount.textContent = `-${featured.discount_percent}%`;
  els.previewPrice.textContent = moneyUSD(featured.sale_price);
  els.previewWas.textContent = moneyUSD(featured.original_price);

  const data = await thumbnailData(featured);
  if (data) setImage(els.previewMedia, els.previewImage, data.thumbnail_url, data.fallback_url);
}

function populateCurrencies() {
  const codes = Object.keys(rates).sort((a,b) => a.localeCompare(b));
  const common = ['USD','EUR','GBP','SAR','AED','JPY','CAD','AUD'];
  const ordered = [...new Set([...common.filter(c => rates[c]), ...codes])];

  els.currency.innerHTML = ordered.map(code => `<option value="${code}">${code}</option>`).join('');

  let saved = 'USD';
  try { saved = localStorage.getItem(CURRENCY_KEY) || 'USD'; } catch {}
  if (!rates[saved]) saved = 'USD';

  currentCurrency = saved;
  currencyRate = rates[saved] || 1;
  els.currency.value = currentCurrency;
}

async function loadRates() {
  try {
    const response = await fetch('/api/fx', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('FX unavailable');
    const data = await response.json();
    if (data.rates) rates = data.rates;
  } catch {
    rates = { USD:1, EUR:.86, GBP:.74, SAR:3.75, AED:3.6725, JPY:158, CAD:1.4, AUD:1.42 };
  }

  populateCurrencies();
}

function setupLayout() {
  let saved = 'full';
  try { saved = localStorage.getItem(LAYOUT_KEY) || 'full'; } catch {}
  if (!['full','compact'].includes(saved)) saved = 'full';
  els.layout.value = saved;
}

function setupScrollReveal() {
  const items = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window)) {
    items.forEach(item => item.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .12, rootMargin: '0px 0px -30px' });

  items.forEach(item => observer.observe(item));
}

function setupBackToTop() {
  const update = () => { els.backToTop.hidden = window.scrollY < 700; };
  window.addEventListener('scroll', update, { passive: true });
  els.backToTop.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));
  update();
}

async function boot() {
  setupScrollReveal();
  setupBackToTop();
  setupLayout();

  try {
    const [catalogResponse] = await Promise.all([
      fetch('./games.json', { cache:'no-store' }),
      loadRates()
    ]);

    if (!catalogResponse.ok) throw new Error(`HTTP ${catalogResponse.status}`);
    const data = await catalogResponse.json();
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

    setCounts();
    setupBudget();
    els.updatedAt.textContent = formatDate(meta.updated_at);
    await setHeroSnapshot();
    render();
  } catch (error) {
    console.error('Failed to load catalog', error);
    els.resultCount.textContent = 'Catalog unavailable';
    els.error.hidden = false;
    els.heroCount.textContent = 'Catalog unavailable';
  }
}

window.addEventListener('pageshow', () => {
  if (!location.hash) requestAnimationFrame(() => window.scrollTo(0,0));
});

els.search.addEventListener('input', resetPageAndRender);
els.sort.addEventListener('change', resetPageAndRender);
els.pageSize.addEventListener('change', resetPageAndRender);
els.minPrice.addEventListener('input', resetPageAndRender);
els.maxPrice.addEventListener('input', resetPageAndRender);
els.reset.addEventListener('click', resetAll);
els.emptyReset.addEventListener('click', resetAll);

els.currency.addEventListener('change', async () => {
  const oldRate = currencyRate || 1;
  const preserve = {
    minUSD: Number(els.minPrice.value) / oldRate,
    maxUSD: Number(els.maxPrice.value) / oldRate
  };

  currentCurrency = els.currency.value;
  currencyRate = rates[currentCurrency] || 1;

  try { localStorage.setItem(CURRENCY_KEY, currentCurrency); } catch {}

  setupBudget(preserve);
  await setHeroSnapshot();
  currentPage = 1;
  render();
});

els.layout.addEventListener('change', () => {
  try { localStorage.setItem(LAYOUT_KEY, els.layout.value); } catch {}
  currentPage = 1;
  render();
});

els.prevPage.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage -= 1;
    render({ scrollToResults:true });
  }
});

els.nextPage.addEventListener('click', () => {
  currentPage += 1;
  render({ scrollToResults:true });
});

els.typeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    activeType = tab.dataset.type;
    currentPage = 1;
    els.typeTabs.forEach(item => item.classList.toggle('active', item === tab));
    render();
  });
});

els.quickChips.forEach(chip => {
  chip.addEventListener('click', () => {
    activeDiscount = chip.dataset.filter;
    currentPage = 1;
    els.quickChips.forEach(item => item.classList.toggle('active', item === chip));
    render();
  });
});

document.addEventListener('keydown', event => {
  const tag = document.activeElement?.tagName;

  if (event.key === '/' && document.activeElement !== els.search && !['INPUT','SELECT','TEXTAREA'].includes(tag)) {
    event.preventDefault();
    els.search.focus();
  }

  if (event.key === 'Escape' && document.activeElement === els.search && els.search.value) {
    els.search.value = '';
    resetPageAndRender();
  }
});

boot();