const els = {
  list: document.querySelector('#games'),
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
  chips: [...document.querySelectorAll('.chip')]
};

let catalog = [];
let meta = {};
let activeFilter = 'all';

const money = value => `$${Number(value).toFixed(2)}`;
const escapeHtml = value => String(value).replace(/[&<>'"]/g, ch => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'
}[ch]));

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Sep 26';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
}

function matchesQuickFilter(game) {
  switch (activeFilter) {
    case 'under5': return game.sale_price < 5;
    case 'under10': return game.sale_price < 10;
    case 'under20': return game.sale_price < 20;
    case '70plus': return game.discount_percent >= 70;
    case '90plus': return game.discount_percent >= 90;
    default: return true;
  }
}

function sortGames(items) {
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

function render() {
  const query = els.search.value.trim().toLocaleLowerCase();
  const filtered = catalog.filter(game => {
    const haystack = `${game.title} ${game.sale_group || ''}`.toLocaleLowerCase();
    return haystack.includes(query) && matchesQuickFilter(game);
  });
  const ordered = sortGames(filtered);

  els.list.innerHTML = ordered.map(game => {
    const saved = Math.max(0, game.original_price - game.sale_price);
    const verify = game.verified_by === 'Steam offer page' ? 'Steam confirmed' : game.sale_group;
    return `
      <article class="game-row">
        <div class="game-main">
          <div class="game-title" title="${escapeHtml(game.title)}">${escapeHtml(game.title)}</div>
          <div class="game-meta"><span class="verify-dot"></span><span>${escapeHtml(verify || 'Oct 1 promotion')}</span></div>
        </div>
        <div class="price-old">${money(game.original_price)}</div>
        <div class="price-new">${money(game.sale_price)}</div>
        <div class="savings">Save ${money(saved)}</div>
        <div class="discount-badge">-${game.discount_percent}%</div>
        <a class="steam-link" href="${escapeHtml(`https://store.steampowered.com/search/?term=${encodeURIComponent(game.title)}`)}" target="_blank" rel="noopener noreferrer" aria-label="Search ${escapeHtml(game.title)} on Steam">Find on Steam ↗</a>
      </article>`;
  }).join('');

  const hasFilters = query || activeFilter !== 'all' || els.sort.value !== 'az';
  els.resultCount.textContent = ordered.length === catalog.length && !query && activeFilter === 'all'
    ? `${ordered.length} deals. Pick your poison.`
    : `${ordered.length} ${ordered.length === 1 ? 'game' : 'games'} match. I narrowed it down for you.`;
  els.reset.hidden = !hasFilters;
  els.empty.hidden = ordered.length !== 0;
}

function resetAll() {
  els.search.value = '';
  els.sort.value = 'az';
  activeFilter = 'all';
  els.chips.forEach(chip => chip.classList.toggle('active', chip.dataset.filter === 'all'));
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
}

async function boot() {
  try {
    const response = await fetch('./games.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.games)) throw new Error('games.json has no games array');
    meta = data.meta || {};
    catalog = data.games
      .filter(g => g && g.title && Number.isFinite(Number(g.original_price)) && Number.isFinite(Number(g.sale_price)) && Number.isFinite(Number(g.discount_percent)))
      .map(g => ({ ...g, original_price:Number(g.original_price), sale_price:Number(g.sale_price), discount_percent:Number(g.discount_percent) }));
    setSnapshot();
    render();
  } catch (error) {
    console.error('Failed to load games.json', error);
    els.resultCount.textContent = 'Couldn’t load the catalog.';
    els.error.hidden = false;
    els.totalCount.textContent = '—';
  }
}

els.search.addEventListener('input', render);
els.sort.addEventListener('change', render);
els.reset.addEventListener('click', resetAll);
els.emptyReset.addEventListener('click', resetAll);
els.chips.forEach(chip => chip.addEventListener('click', () => {
  activeFilter = chip.dataset.filter;
  els.chips.forEach(c => c.classList.toggle('active', c === chip));
  render();
}));
document.addEventListener('keydown', event => {
  if (event.key === '/' && document.activeElement !== els.search) {
    event.preventDefault();
    els.search.focus();
  }
});

boot();
