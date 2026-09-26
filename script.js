const els = {
  products: document.querySelector('#products'),
  search: document.querySelector('#searchInput'),
  sort: document.querySelector('#sortSelect'),
  pageSize: document.querySelector('#pageSizeSelect'),
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
let activeType = 'game';
let activeDiscount = 'all';
let absoluteMax = 100;
let currentPage = 1;
let thumbnailObserver = null;

const THUMB_CACHE_PREFIX = 'discounted:thumb:';
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

function steamSearchUrl(title) {
  return `https://store.steampowered.com/search/?term=${encodeURIComponent(title)}`;
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
  const steamUrl = steamSearchUrl(product.title);
  const sourceIcon = product.verified_by === 'Steam offer page' ? 'i-check' : 'i-info';

  return `
    <article class="product-card">
      <a class="card-media"
         href="${escapeHtml(steamUrl)}"
         target="_blank"
         rel="noopener noreferrer"
         aria-label="Search ${escapeHtml(product.title)} on Steam">
        <span class="thumb-fallback" aria-hidden="true">
          <svg class="i"><use href="#i-image"/></svg>
        </span>
        <img class="product-thumb" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
      </a>

      <div class="card-top">
        <span class="type-badge">
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

function readThumbCache(title) {
  try {
    const raw = localStorage.getItem(THUMB_CACHE_PREFIX + title);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!data || !data.thumbnail_url) return null;

    return data;
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
  } catch {
    // Storage can be unavailable in private/restricted browser modes.
  }
}

function setCardImage(card, primaryUrl, fallbackUrl = null) {
  const media = card.querySelector('.card-media');
  const image = card.querySelector('.product-thumb');

  if (!media || !image || !primaryUrl) return;

  let triedFallback = false;

  image.onload = () => {
    media.classList.add('loaded');
  };

  image.onerror = () => {
    if (!triedFallback && fallbackUrl && fallbackUrl !== primaryUrl) {
      triedFallback = true;
      image.src = fallbackUrl;
      return;
    }

    media.classList.remove('loaded');
    image.removeAttribute('src');
  };

  image.src = primaryUrl;
}

async function resolveThumbnail(card, product) {
  if (card.dataset.thumbResolved === '1') return;
  card.dataset.thumbResolved = '1';

  if (product.thumbnail_url) {
    setCardImage(card, product.thumbnail_url);
    return;
  }

  const appid = product.steam_appid || product.thumbnail_appid;

  if (appid) {
    setCardImage(card, steamHeaderUrl(appid));
    return;
  }

  const cached = readThumbCache(product.title);

  if (cached) {
    setCardImage(card, cached.thumbnail_url, cached.fallback_url);
    return;
  }

  try {
    const response = await fetch(`/api/steam-thumb?title=${encodeURIComponent(product.title)}`, {
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) return;

    const data = await response.json();
    if (!data.thumbnail_url) return;

    writeThumbCache(product.title, data);
    setCardImage(card, data.thumbnail_url, data.fallback_url);
  } catch {
    // The SVG fallback remains visible.
  }
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
      const product = pageItems[index];

      if (product) resolveThumbnail(entry.target, product);
      thumbnailObserver.unobserve(entry.target);
    });
  }, {
    rootMargin: '240px 0px',
    threshold: 0.01
  });

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
  const visiblePages = [...pages]
    .filter(page => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const parts = [];
  let previous = 0;

  visiblePages.forEach(page => {
    if (previous && page - previous > 1) {
      parts.push('<span class="page-gap">…</span>');
    }

    parts.push(`
      <button
        class="page-number ${page === currentPage ? 'active' : ''}"
        type="button"
        data-page="${page}"
        aria-label="Page ${page}"
        aria-current="${page === currentPage ? 'page' : 'false'}">
        ${page}
      </button>
    `);

    previous = page;
  });

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

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * pageSize;
  const pageItems = ordered.slice(start, start + pageSize);

  els.products.innerHTML = pageItems.map(renderCard).join('');
  attachThumbnails(pageItems);

  const label =
    activeType === 'all' ? 'products'
    : activeType === 'dlc' ? 'DLC'
    : activeType === 'bundle' ? 'bundles'
    : activeType === 'other' ? 'products'
    : 'games';

  const rangeStart = ordered.length ? start + 1 : 0;
  const rangeEnd = Math.min(start + pageSize, ordered.length);

  els.resultCount.textContent = ordered.length
    ? `${ordered.length.toLocaleString('en-US')} ${label} · showing ${rangeStart}–${rangeEnd}`
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

  const featured = [...catalog]
    .filter(item => item.type === 'game')
    .sort((a, b) =>
      b.discount_percent - a.discount_percent
      || a.sale_price - b.sale_price
      || a.title.localeCompare(b.title)
    )[0] || catalog[0];

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
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -30px'
  });

  items.forEach(item => observer.observe(item));
}

function setupBackToTop() {
  if (!els.backToTop) return;

  const update = () => {
    els.backToTop.hidden = window.scrollY < 700;
  };

  window.addEventListener('scroll', update, { passive: true });
  els.backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  update();
}

function setupStageMotion() {
  const stage = document.querySelector('.stage');
  const app = stage?.querySelector('.app');

  if (!stage || !app || !window.matchMedia('(pointer:fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  stage.addEventListener('pointermove', event => {
    const rect = stage.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 8;

    app.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  });

  stage.addEventListener('pointerleave', () => {
    app.style.transform = '';
  });
}

async function boot() {
  setupScrollReveal();
  setupBackToTop();
  setupStageMotion();

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

window.addEventListener('pageshow', () => {
  if (!location.hash) {
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }
});

els.search.addEventListener('input', resetPageAndRender);
els.sort.addEventListener('change', resetPageAndRender);
els.pageSize.addEventListener('change', resetPageAndRender);
els.minPrice.addEventListener('input', resetPageAndRender);
els.maxPrice.addEventListener('input', resetPageAndRender);
els.reset.addEventListener('click', resetAll);
els.emptyReset.addEventListener('click', resetAll);

els.prevPage.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage -= 1;
    render({ scrollToResults: true });
  }
});

els.nextPage.addEventListener('click', () => {
  currentPage += 1;
  render({ scrollToResults: true });
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
  const activeTag = document.activeElement?.tagName;

  if (
    event.key === '/'
    && document.activeElement !== els.search
    && !['INPUT', 'SELECT', 'TEXTAREA'].includes(activeTag)
  ) {
    event.preventDefault();
    els.search.focus();
  }

  if (event.key === 'Escape' && document.activeElement === els.search && els.search.value) {
    els.search.value = '';
    resetPageAndRender();
  }
});

boot();