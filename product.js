const els = {
  currency: document.querySelector('#currencySelect'),
  view: document.querySelector('#productView'),
  missing: document.querySelector('#missingProduct'),
  media: document.querySelector('#productMedia'),
  image: document.querySelector('#productImage'),
  type: document.querySelector('#productType'),
  title: document.querySelector('#productTitle'),
  group: document.querySelector('#productGroup'),
  discount: document.querySelector('#productDiscount'),
  price: document.querySelector('#productPrice'),
  was: document.querySelector('#productWas'),
  saving: document.querySelector('#productSaving'),
  steam: document.querySelector('#steamButton'),
  recommendations: document.querySelector('#recommendations'),
  recommendGrid: document.querySelector('#recommendGrid')
};

const CURRENCY_KEY = 'discounted:currency';
const THUMB_CACHE_PREFIX = 'discounted:thumb:';
let catalog = [];
let product = null;
let rates = { USD: 1 };
let currentCurrency = 'USD';
let currencyRate = 1;
const formatterCache = new Map();

const escapeHtml = value => String(value).replace(/[&<>'"]/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[ch]));

function normalizeType(value) {
  const raw = String(value || 'game').trim().toLowerCase();
  if (['dlc','downloadable content','downloadable_content'].includes(raw)) return 'dlc';
  if (['bundle','package'].includes(raw)) return 'bundle';
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
    formatter = { format: value => `${code} ${Number(value).toFixed(2)}` };
  }

  formatterCache.set(code, formatter);
  return formatter;
}

function moneyUSD(usd) {
  return getFormatter(currentCurrency).format(Number(usd) * currencyRate);
}

function steamSearchUrl(title) {
  return `https://store.steampowered.com/search/?term=${encodeURIComponent(title)}`;
}

function steamUrl(item) {
  return item.steam_appid
    ? `https://store.steampowered.com/app/${item.steam_appid}/`
    : steamSearchUrl(item.title);
}

function productUrl(title) {
  return `./product.html?title=${encodeURIComponent(title)}`;
}

function steamHeaderUrl(appid) {
  return `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`;
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

async function thumbnailData(item) {
  if (item.thumbnail_url) return { thumbnail_url: item.thumbnail_url };

  const appid = item.steam_appid || item.thumbnail_appid;
  if (appid) return { thumbnail_url: steamHeaderUrl(appid) };

  const cached = readThumbCache(item.title);
  if (cached) return cached;

  try {
    const response = await fetch(`/api/steam-thumb?title=${encodeURIComponent(item.title)}`, {
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (!data.thumbnail_url) return null;

    writeThumbCache(item.title, data);
    return data;
  } catch {
    return null;
  }
}

function setImage(container, image, data) {
  if (!container || !image || !data?.thumbnail_url) return;

  let triedFallback = false;
  image.onload = () => container.classList.add('loaded');
  image.onerror = () => {
    if (!triedFallback && data.fallback_url && data.fallback_url !== data.thumbnail_url) {
      triedFallback = true;
      image.src = data.fallback_url;
      return;
    }
    container.classList.remove('loaded');
    image.removeAttribute('src');
  };
  image.src = data.thumbnail_url;
}

function tokens(title) {
  const stop = new Set(['the','of','and','a','an','edition','deluxe','ultimate','complete','pack','pass','dlc','hd','remastered','windows']);
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/s+/)
    .filter(token => token.length > 1 && !stop.has(token));
}

const familyMatchers = [
  ['far cry', /^far cry/i],
  ['assassins creed', /^assassin['’]?s creed/i],
  ['final fantasy', /^final fantasy/i],
  ['kingdom hearts', /^kingdom hearts/i],
  ['the crew', /^the crew/i],
  ['ghost recon', /ghost recon/i],
  ['star wars outlaws', /^star wars outlaws/i],
  ['watch dogs', /^watch[_ ]?dogs/i],
  ['prince of persia', /^prince of persia/i],
  ['rainbow six', /rainbow six/i],
  ['splinter cell', /splinter cell/i],
  ['anno', /^anno/i],
  ['trackmania', /^trackmania|^trackmania²/i],
  ['south park', /^south park/i]
];

function family(title) {
  const match = familyMatchers.find(([, rx]) => rx.test(title));
  return match ? match[0] : null;
}

function relationScore(current, candidate) {
  if (current.title === candidate.title) return -Infinity;

  let score = 0;
  const currentFamily = family(current.title);
  const candidateFamily = family(candidate.title);

  if (currentFamily && candidateFamily && currentFamily === candidateFamily) score += 120;
  if (current.sale_group && candidate.sale_group && current.sale_group === candidate.sale_group) score += 24;

  const a = new Set(tokens(current.title));
  const b = new Set(tokens(candidate.title));
  let overlap = 0;
  a.forEach(token => { if (b.has(token)) overlap += 1; });
  score += overlap * 12;

  if (current.type === 'game' && candidate.type === 'dlc' && currentFamily && currentFamily === candidateFamily) score += 18;
  if (current.type === 'dlc' && candidate.type === 'game' && currentFamily && currentFamily === candidateFamily) score += 18;
  if (candidate.type === 'bundle' && currentFamily && currentFamily === candidateFamily) score += 14;

  score += Math.min(candidate.discount_percent, 90) / 15;
  return score;
}

function recommendationsFor(item) {
  return catalog
    .map(candidate => ({ candidate, score: relationScore(item, candidate) }))
    .filter(entry => entry.score > 8)
    .sort((a,b) => b.score - a.score || b.candidate.discount_percent - a.candidate.discount_percent || a.candidate.title.localeCompare(b.candidate.title))
    .slice(0, 8)
    .map(entry => entry.candidate);
}

async function renderRecommendationImage(card, item) {
  const data = await thumbnailData(item);
  if (!data) return;
  setImage(card.querySelector('.recommend-media'), card.querySelector('img'), data);
}

function renderRecommendations() {
  const items = recommendationsFor(product);

  if (!items.length) {
    els.recommendations.hidden = true;
    return;
  }

  els.recommendations.hidden = false;
  els.recommendGrid.innerHTML = items.map(item => `
    <a class="recommend-card" href="${escapeHtml(productUrl(item.title))}">
      <div class="recommend-media">
        <span class="thumb-fallback"><svg class="i"><use href="#i-image"/></svg></span>
        <img alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
      </div>
      <div class="recommend-body">
        <strong>${escapeHtml(item.title)}</strong>
        <span>-${item.discount_percent}% · ${moneyUSD(item.sale_price)}</span>
      </div>
    </a>
  `).join('');

  [...els.recommendGrid.querySelectorAll('.recommend-card')].forEach((card, index) => {
    renderRecommendationImage(card, items[index]);
  });
}

async function renderProduct() {
  if (!product) return;

  document.title = `${product.title} — Discounted`;
  els.type.innerHTML = `<svg class="i i-sm"><use href="#${typeIcon(product.type)}"/></svg>${escapeHtml(typeLabel(product.type))}`;
  els.title.textContent = product.title;
  els.group.textContent = product.sale_group || 'Steam promotion';
  els.discount.textContent = `-${product.discount_percent}%`;
  els.price.textContent = moneyUSD(product.sale_price);
  els.was.textContent = moneyUSD(product.original_price);
  els.saving.textContent = `Save ${moneyUSD(Math.max(0, product.original_price - product.sale_price))}`;
  els.steam.href = steamUrl(product);

  const data = await thumbnailData(product);
  if (data) setImage(els.media, els.image, data);

  els.view.hidden = false;
  renderRecommendations();
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

  const common = ['USD','EUR','GBP','SAR','AED','JPY','CAD','AUD'];
  const codes = Object.keys(rates).sort((a,b) => a.localeCompare(b));
  const ordered = [...new Set([...common.filter(code => rates[code]), ...codes])];

  els.currency.innerHTML = ordered.map(code => `<option value="${code}">${code}</option>`).join('');

  let saved = 'USD';
  try { saved = localStorage.getItem(CURRENCY_KEY) || 'USD'; } catch {}
  if (!rates[saved]) saved = 'USD';

  currentCurrency = saved;
  currencyRate = rates[saved] || 1;
  els.currency.value = saved;
}

async function boot() {
  const title = new URLSearchParams(location.search).get('title');

  if (!title) {
    els.missing.hidden = false;
    return;
  }

  try {
    const [catalogResponse] = await Promise.all([
      fetch('./games.json', { cache:'no-store' }),
      loadRates()
    ]);

    if (!catalogResponse.ok) throw new Error('Catalog unavailable');
    const data = await catalogResponse.json();

    catalog = (data.games || []).map(item => ({
      ...item,
      type: normalizeType(item.type || item.product_type),
      original_price: Number(item.original_price),
      sale_price: Number(item.sale_price),
      discount_percent: Number(item.discount_percent)
    }));

    product = catalog.find(item => item.title.toLocaleLowerCase() === title.toLocaleLowerCase());

    if (!product) {
      els.missing.hidden = false;
      return;
    }

    await renderProduct();
  } catch (error) {
    console.error(error);
    els.missing.hidden = false;
  }
}

els.currency.addEventListener('change', async () => {
  currentCurrency = els.currency.value;
  currencyRate = rates[currentCurrency] || 1;
  try { localStorage.setItem(CURRENCY_KEY, currentCurrency); } catch {}
  await renderProduct();
});

boot();