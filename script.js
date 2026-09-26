const els = {
  products: document.querySelector("#products"),
  search: document.querySelector("#searchInput"),
  sort: document.querySelector("#sortSelect"),
  pageSize: document.querySelector("#pageSizeSelect"),
  currency: document.querySelector("#currencySelect"),
  layout: document.querySelector("#layoutSelect"),
  resultCount: document.querySelector("#resultCount"),
  updatedAt: document.querySelector("#updatedAt"),
  empty: document.querySelector("#emptyState"),
  error: document.querySelector("#errorState"),
  reset: document.querySelector("#resetButton"),
  emptyReset: document.querySelector("#emptyReset"),
  typeTabs: [...document.querySelectorAll(".type-tab")],
  quickChips: [...document.querySelectorAll(".quick-chip")],
  genreFilters: document.querySelector("#genreFilters"),
  minPrice: document.querySelector("#minPrice"),
  maxPrice: document.querySelector("#maxPrice"),
  budgetOutput: document.querySelector("#budgetOutput"),
  rangeFill: document.querySelector("#rangeFill"),
  rangeMinLabel: document.querySelector("#rangeMinLabel"),
  rangeMaxLabel: document.querySelector("#rangeMaxLabel"),
  heroCount: document.querySelector("#heroCount"),
  previewMedia: document.querySelector("#previewMedia"),
  previewImage: document.querySelector("#previewImage"),
  previewType: document.querySelector("#previewType"),
  previewTitle: document.querySelector("#previewTitle"),
  previewGroup: document.querySelector("#previewGroup"),
  previewDiscount: document.querySelector("#previewDiscount"),
  previewPrice: document.querySelector("#previewPrice"),
  previewWas: document.querySelector("#previewWas"),
  featuredLink: document.querySelector("#featuredLink"),
  stageCheapest: document.querySelector("#stageCheapest"),
  stageBestCut: document.querySelector("#stageBestCut"),
  pagination: document.querySelector("#pagination"),
  prevPage: document.querySelector("#prevPage"),
  nextPage: document.querySelector("#nextPage"),
  pageNumbers: document.querySelector("#pageNumbers"),
  backToTop: document.querySelector("#backToTop"),
  counts: {
    game: document.querySelector("#gameCount"),
    dlc: document.querySelector("#dlcCount"),
    bundle: document.querySelector("#bundleCount"),
    all: document.querySelector("#allCount"),
  },
};

let catalog = [];
let meta = {};
let rates = { USD: 1 };
let activeType = "game";
let activeDiscount = "all";
let activeGenres = new Set();
let currentPage = 1;
let currentCurrency = "USD";
let currencyRate = 1;
let absoluteMaxUSD = 100;
let thumbnailObserver = null;

const THUMB_CACHE_PREFIX = "discounted:thumb:";
const CURRENCY_KEY = "discounted:currency";
const LAYOUT_KEY = "discounted:layout";
const formatterCache = new Map();

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>'"]/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[ch],
  );

function normalizeType(value) {
  const raw = String(value || "game")
    .trim()
    .toLowerCase();
  if (["dlc", "downloadable content", "downloadable_content"].includes(raw))
    return "dlc";
  if (["bundle", "package"].includes(raw)) return "bundle";
  if (raw === "game") return "game";
  return "other";
}

function typeLabel(type) {
  if (type === "dlc") return "DLC";
  if (type === "bundle") return "Bundle";
  if (type === "other") return "Other";
  return "Game";
}

function typeIcon(type) {
  if (type === "dlc") return "i-puzzle";
  if (type === "bundle") return "i-box";
  if (type === "other") return "i-grid";
  return "i-gamepad";
}

function formatDate(iso) {
  const d = new Date(iso || "");
  if (Number.isNaN(d.getTime())) return "Updated recently";

  return `Updated ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d)}`;
}

function getFormatter(code) {
  if (formatterCache.has(code)) return formatterCache.get(code);

  let formatter;

  try {
    formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    });
  } catch {
    formatter = {
      format(value) {
        return `${code} ${Number(value).toFixed(2)}`;
      },
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

function routeHash(value) {
  let hash = 2166136261;
  for (const ch of String(value)) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function productRouteId(product) {
  if (Number.isInteger(product?.steam_appid)) return String(product.steam_appid);
  if (Number.isInteger(product?.steam_bundleid)) return "b" + product.steam_bundleid;
  if (Number.isInteger(product?.steam_subid)) return "s" + product.steam_subid;
  return "x" + routeHash(`${normalizeType(product?.type)}|${product?.title || ""}`);
}

function internalProductUrl(product) {
  if (!product || typeof product === "string")
    return `./product.html?title=${encodeURIComponent(String(product || ""))}`;
  return `/${normalizeType(product.type)}/${productRouteId(product)}`;
}

function steamHeaderUrl(appid) {
  return `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`;
}

function discountMatches(product) {
  if (activeDiscount === "50plus") return product.discount_percent >= 50;
  if (activeDiscount === "70plus") return product.discount_percent >= 70;
  if (activeDiscount === "90plus") return product.discount_percent >= 90;
  return true;
}

function typeMatches(product) {
  return activeType === "all" || product.type === activeType;
}

function genreMatches(product) {
  if (!activeGenres.size) return true;
  const genres = Array.isArray(product.genres) ? product.genres : [];
  return genres.some((genre) => activeGenres.has(String(genre)));
}

function populateGenreFilters() {
  const counts = new Map();
  catalog.forEach((product) => {
    (Array.isArray(product.genres) ? product.genres : []).forEach((genre) => {
      const name = String(genre || "").trim();
      if (name) counts.set(name, (counts.get(name) || 0) + 1);
    });
  });

  const preferred = [
    "Action",
    "Adventure",
    "RPG",
    "Strategy",
    "Simulation",
    "Casual",
    "Indie",
    "Racing",
    "Sports",
    "Massively Multiplayer",
    "Puzzle",
    "Horror",
    "Survival",
    "Open World",
  ];

  const genres = [...counts.keys()].sort((a, b) => {
    const ai = preferred.indexOf(a);
    const bi = preferred.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return a.localeCompare(b);
  });

  const valid = new Set(genres);
  activeGenres = new Set([...activeGenres].filter((genre) => valid.has(genre)));

  els.genreFilters.innerHTML = genres
    .map(
      (genre) => `<button class="genre-chip" type="button" data-genre="${escapeHtml(genre)}" aria-pressed="false"><span>${escapeHtml(genre)}</span><b>${counts.get(genre).toLocaleString()}</b></button>`,
    )
    .join("");
}

function sortProducts(items) {
  const copy = [...items];
  const byName = (a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" });

  switch (els.sort.value) {
    case "za":
      return copy.sort((a, b) => byName(b, a));
    case "cheap":
      return copy.sort((a, b) => a.sale_price - b.sale_price || byName(a, b));
    case "expensive":
      return copy.sort((a, b) => b.sale_price - a.sale_price || byName(a, b));
    case "discount":
      return copy.sort(
        (a, b) =>
          b.discount_percent - a.discount_percent ||
          a.sale_price - b.sale_price ||
          byName(a, b),
      );
    case "discount-low":
      return copy.sort(
        (a, b) => a.discount_percent - b.discount_percent || byName(a, b),
      );
    case "savings":
      return copy.sort(
        (a, b) =>
          b.original_price - b.sale_price - (a.original_price - a.sale_price) ||
          byName(a, b),
      );
    default:
      return copy.sort(byName);
  }
}

function budgetStep(max) {
  if (max >= 100000) return 1000;
  if (max >= 10000) return 100;
  if (max >= 1000) return 10;
  if (max >= 250) return 1;
  return 0.5;
}

function setupBudget(preserve = null) {
  absoluteMaxUSD = Math.max(
    5,
    Math.ceil(Math.max(0, ...catalog.map((item) => item.sale_price)) / 5) * 5,
  );

  const selectedMax = Math.ceil(absoluteMaxUSD * currencyRate);
  const step = budgetStep(selectedMax);

  [els.minPrice, els.maxPrice].forEach((input) => {
    input.min = "0";
    input.max = String(selectedMax);
    input.step = String(step);
  });

  if (preserve) {
    els.minPrice.value = String(
      Math.max(0, Math.min(selectedMax, preserve.minUSD * currencyRate)),
    );
    els.maxPrice.value = String(
      Math.max(0, Math.min(selectedMax, preserve.maxUSD * currencyRate)),
    );
  } else {
    els.minPrice.value = "0";
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
  const minPct = (min / selectedMax) * 100;
  const maxPct = (max / selectedMax) * 100;

  els.rangeFill.style.left = `${minPct}%`;
  els.rangeFill.style.width = `${Math.max(0, maxPct - minPct)}%`;
  els.budgetOutput.textContent = `${moneyValue(min)} — ${moneyValue(max)}`;
  els.rangeMinLabel.textContent = moneyValue(0);
  els.rangeMaxLabel.textContent = moneyValue(selectedMax);
  const lo = document.querySelector("#minBubble"),
    hi = document.querySelector("#maxBubble");
  lo.textContent = moneyValue(min);
  hi.textContent = moneyValue(max);
  lo.style.left = `${Math.max(12, Math.min(88, minPct))}%`;
  hi.style.left = `${Math.max(12, Math.min(88, maxPct))}%`;
}

function filteredCatalog() {
  const query = els.search.value.trim().toLocaleLowerCase();
  const min = Number(els.minPrice.value);
  const max = Number(els.maxPrice.value);

  return catalog.filter((product) => {
    const haystack =
      `${product.title} ${product.sale_group || ""} ${product.type} ${(Array.isArray(product.genres) ? product.genres : []).join(" ")}`.toLocaleLowerCase();
    const selectedPrice = converted(product.sale_price);

    return (
      typeMatches(product) &&
      discountMatches(product) &&
      genreMatches(product) &&
      selectedPrice >= min &&
      selectedPrice <= max &&
      haystack.includes(query)
    );
  });
}

function fullCard(product) {
  const saved = Math.max(0, product.original_price - product.sale_price);

  return `
    <article class="product-card" data-rarity="${Vault.rarity(product.discount_percent)}" style="--rarity:var(--${Vault.rarity(product.discount_percent)},#b5e8ef)" data-title="${escapeHtml(product.title)}">
      <a class="card-media" href="${escapeHtml(internalProductUrl(product.title))}" aria-label="View ${escapeHtml(product.title)} on Discounted">
        <span class="thumb-fallback" aria-hidden="true"><svg class="i"><use href="#i-image"/></svg></span>
        <img class="product-thumb" width="460" height="215" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
      </a>

      <div class="card-top">
        <span class="type-badge"><svg class="i i-sm"><use href="#${typeIcon(product.type)}"/></svg>${escapeHtml(typeLabel(product.type))}</span>
        <span class="discount-badge" title="${Vault.rarity(product.discount_percent)} · Was ${moneyUSD(product.original_price)}">-${product.discount_percent}%</span>
      </div>

      <div class="card-body">
        <h3 class="product-title">${highlightTitle(product.title)}</h3>
        <p class="sale-group">${escapeHtml(product.sale_group || "Steam promotion")}</p>
        <div class="price-line">
          <strong class="price-now">${moneyUSD(product.sale_price)}</strong>
          <span class="price-was">${moneyUSD(product.original_price)}</span>
        </div>
        <div class="saving-line">Save ${moneyUSD(saved)}</div>${product.ends_at ? `<span class="countdown" data-ends="${escapeHtml(product.ends_at)}"></span>` : ""}
      </div>

      <div class="card-action">
        <a href="${escapeHtml(internalProductUrl(product.title))}"><svg class="i i-sm"><use href="#i-eye"/></svg>View deal</a>
        <a href="${escapeHtml(steamSearchUrl(product.title))}" target="_blank" rel="noopener noreferrer"><svg class="i i-sm"><use href="#i-external"/></svg>Steam</a>
        <button class="copy-link" data-copy="${escapeHtml(internalProductUrl(product.title))}" aria-label="Copy link to ${escapeHtml(product.title)}">Copy</button>
      </div>
    </article>
  `;
}

function compactCard(product) {
  return `
    <article class="product-card compact-card" style="--rarity:var(--${Vault.rarity(product.discount_percent)},#b5e8ef)" data-title="${escapeHtml(product.title)}">
      <a class="card-media" href="${escapeHtml(internalProductUrl(product.title))}" aria-label="View ${escapeHtml(product.title)} on Discounted">
        <span class="thumb-fallback" aria-hidden="true"><svg class="i"><use href="#i-image"/></svg></span>
        <img class="product-thumb" width="460" height="215" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
      </a>
      <div class="compact-main">
        <h3 class="product-title">${highlightTitle(product.title)}</h3>
        <p class="sale-group">${escapeHtml(typeLabel(product.type))} · ${escapeHtml(product.sale_group || "Steam promotion")}</p>
      </div>
      <div class="compact-discount">-${product.discount_percent}%</div>
      <div class="compact-price">
        <s>${moneyUSD(product.original_price)}</s>
        <strong>${moneyUSD(product.sale_price)}</strong>
      </div>
      <div class="compact-actions">
        <a href="${escapeHtml(internalProductUrl(product.title))}"><svg class="i i-sm"><use href="#i-eye"/></svg>VIEW</a>
        <a href="${escapeHtml(steamSearchUrl(product.title))}" target="_blank" rel="noopener noreferrer"><svg class="i i-sm"><use href="#i-external"/></svg>Steam</a>
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
    localStorage.setItem(
      THUMB_CACHE_PREFIX + title,
      JSON.stringify({
        thumbnail_url: data.thumbnail_url,
        fallback_url: data.fallback_url || null,
        cached_at: Date.now(),
      }),
    );
  } catch {}
}

function setImage(container, image, primaryUrl, fallbackUrl = null) {
  if (!container || !image || !primaryUrl) return;

  let triedFallback = false;

  image.onload = () => container.classList.add("loaded");
  image.onerror = () => {
    if (!triedFallback && fallbackUrl && fallbackUrl !== primaryUrl) {
      triedFallback = true;
      image.src = fallbackUrl;
      return;
    }

    container.classList.remove("loaded");
    image.removeAttribute("src");
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
    const response = await fetch(
      `/api/steam-thumb?title=${encodeURIComponent(product.title)}`,
      {
        headers: { Accept: "application/json" },
      },
    );

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
  if (card.dataset.thumbResolved === "1") return;
  card.dataset.thumbResolved = "1";

  const data = await thumbnailData(product);
  if (!data) return;

  setImage(
    card.querySelector(".card-media"),
    card.querySelector(".product-thumb"),
    data.thumbnail_url,
    data.fallback_url,
  );
}

function attachThumbnails(pageItems) {
  if (thumbnailObserver) {
    thumbnailObserver.disconnect();
    thumbnailObserver = null;
  }

  const cards = [...els.products.querySelectorAll(".product-card")];

  if (!("IntersectionObserver" in window)) {
    cards.forEach((card, index) => resolveThumbnail(card, pageItems[index]));
    return;
  }

  thumbnailObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const index = cards.indexOf(entry.target);
        if (pageItems[index]) resolveThumbnail(entry.target, pageItems[index]);
        thumbnailObserver.unobserve(entry.target);
      });
    },
    { rootMargin: "220px 0px", threshold: 0.01 },
  );

  cards.forEach((card) => thumbnailObserver.observe(card));
}

function renderPagination(totalItems, pageSize) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  currentPage = Math.min(currentPage, totalPages);

  els.pagination.hidden = totalItems <= pageSize || totalItems === 0;
  els.prevPage.disabled = currentPage <= 1;
  els.nextPage.disabled = currentPage >= totalPages;

  if (els.pagination.hidden) {
    els.pageNumbers.innerHTML = "";
    return;
  }

  const pages = new Set([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);
  const visible = [...pages]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
  const parts = [];
  let previous = 0;

  for (const page of visible) {
    if (previous && page - previous > 1)
      parts.push('<span class="page-gap">…</span>');
    parts.push(
      `<button class="page-number ${page === currentPage ? "active" : ""}" type="button" data-page="${page}" aria-current="${page === currentPage ? "page" : "false"}">${page}</button>`,
    );
    previous = page;
  }

  els.pageNumbers.innerHTML = parts.join("");
  els.pageNumbers.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
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
  const compact = els.layout.value === "compact";

  els.products.classList.toggle("compact", compact);
  const before = new Map(
    [...els.products.children].map((el) => [
      el.dataset.title,
      el.getBoundingClientRect(),
    ]),
  );
  if (!Vault.reduced.matches) {
    const keep = new Set(pageItems.map((p) => p.title));
    [...els.products.children]
      .filter((el) => el.dataset.title && !keep.has(el.dataset.title))
      .slice(0, 12)
      .forEach((el) => {
        const box = el.getBoundingClientRect();
        if (box.bottom < 0 || box.top > innerHeight) return;
        const clone = el.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        clone.inert = true;
        clone.style.cssText += `;position:fixed;left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;z-index:50;pointer-events:none`;
        document.body.append(clone);
        clone
          .animate(
            [
              { opacity: 0.6, transform: "scale(1)" },
              { opacity: 0, transform: "scale(.94)" },
            ],
            { duration: 150 },
          )
          .finished.finally(() => clone.remove());
      });
  }
  els.products.innerHTML = pageItems
    .map(compact ? compactCard : fullCard)
    .join("");
  if (!Vault.reduced.matches)
    [...els.products.children].forEach((el, i) => {
      const prev = before.get(el.dataset.title),
        next = el.getBoundingClientRect();
      el.animate(
        prev
          ? [
              {
                transform: `translate(${prev.left - next.left}px,${prev.top - next.top}px)`,
              },
              { transform: "none" },
            ]
          : [
              { opacity: 0, transform: "translateY(16px)" },
              { opacity: 1, transform: "none" },
            ],
        {
          duration: 180,
          delay: prev ? 0 : Math.min(i * 8, 80),
          easing: "cubic-bezier(.22,1,.36,1)",
        },
      );
    });
  Vault.observe(els.products);
  Vault.timers();
  syncFilters();
  attachThumbnails(pageItems);

  const label =
    activeType === "all"
      ? "products"
      : activeType === "dlc"
        ? "DLC"
        : activeType === "bundle"
          ? "bundles"
          : "games";
  const rangeStart = ordered.length ? start + 1 : 0;
  const rangeEnd = Math.min(start + pageSize, ordered.length);

  els.resultCount.textContent = ordered.length
    ? `${ordered.length.toLocaleString()} gems found · ${rangeStart}–${rangeEnd}`
    : `0 gems found`;

  els.empty.hidden = ordered.length !== 0;
  renderPagination(ordered.length, pageSize);

  if (options.scrollToResults) {
    document
      .querySelector(".results-head")
      ?.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
  }
}

function resetPageAndRender() {
  currentPage = 1;
  render();
}

function resetAll() {
  els.search.value = "";
  els.sort.value = "az";
  els.pageSize.value = "25";
  activeType = "game";
  activeDiscount = "all";
  activeGenres.clear();
  currentPage = 1;

  els.typeTabs.forEach((tab) =>
    tab.classList.toggle("active", tab.dataset.type === "game"),
  );
  els.quickChips.forEach((chip) =>
    chip.classList.toggle("active", chip.dataset.filter === "all"),
  );

  setupBudget();
  render();
  Vault.toast("Filters reset");
}

function setCounts() {
  const counts = { game: 0, dlc: 0, bundle: 0, all: catalog.length };

  catalog.forEach((item) => {
    if (counts[item.type] !== undefined) counts[item.type] += 1;
  });

  for (const key of Object.keys(counts))
    Vault.countUp(els.counts[key], counts[key]);
}

async function setHeroSnapshot() {
  if (!catalog.length) return;

  const cheapest = catalog.reduce((a, b) =>
    a.sale_price <= b.sale_price ? a : b,
  );
  const biggestCut = catalog.reduce((a, b) =>
    a.discount_percent >= b.discount_percent ? a : b,
  );
  const featured =
    [...catalog]
      .filter((item) => item.type === "game")
      .sort(
        (a, b) =>
          b.discount_percent - a.discount_percent ||
          a.sale_price - b.sale_price,
      )[0] || catalog[0];

  const updated = meta.updated_at
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(new Date(meta.updated_at))
    : "current snapshot";

  els.heroCount.textContent = `${catalog.length.toLocaleString()} tracked discounts · ${updated}`;
  els.stageCheapest.textContent = moneyUSD(cheapest.sale_price);
  els.stageBestCut.textContent = `-${biggestCut.discount_percent}%`;
  els.previewType.textContent = typeLabel(featured.type);
  els.previewTitle.textContent = featured.title;
  els.previewGroup.textContent = featured.sale_group || "Steam promotion";
  els.previewDiscount.textContent = `-${featured.discount_percent}%`;
  els.previewPrice.textContent = moneyUSD(featured.sale_price);
  els.previewWas.textContent = moneyUSD(featured.original_price);

  const featuredUrl = internalProductUrl(featured.title);
  if (els.featuredLink) els.featuredLink.href = featuredUrl;
  if (els.previewMedia) els.previewMedia.href = featuredUrl;

  const data = await thumbnailData(featured);
  if (data)
    setImage(
      els.previewMedia,
      els.previewImage,
      data.thumbnail_url,
      data.fallback_url,
    );
}

function populateCurrencies() {
  const codes = Object.keys(rates).sort((a, b) => a.localeCompare(b));
  const common = ["USD", "EUR", "GBP", "SAR", "AED", "JPY", "CAD", "AUD"];
  const ordered = [...new Set([...common.filter((c) => rates[c]), ...codes])];

  els.currency.innerHTML = ordered
    .map((code) => `<option value="${code}">${code}</option>`)
    .join("");

  let saved = "USD";
  try {
    saved = localStorage.getItem(CURRENCY_KEY) || "USD";
  } catch {}
  if (!rates[saved]) saved = "USD";

  currentCurrency = saved;
  currencyRate = rates[saved] || 1;
  els.currency.value = currentCurrency;
}

async function loadRates() {
  try {
    const response = await fetch("/api/fx", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("FX unavailable");
    const data = await response.json();
    if (data.rates) rates = data.rates;
  } catch {
    rates = {
      USD: 1,
      EUR: 0.86,
      GBP: 0.74,
      SAR: 3.75,
      AED: 3.6725,
      JPY: 158,
      CAD: 1.4,
      AUD: 1.42,
    };
  }

  populateCurrencies();
}

function setupLayout() {
  let saved = "full";
  try {
    saved = localStorage.getItem(LAYOUT_KEY) || "full";
  } catch {}
  if (!["full", "compact"].includes(saved)) saved = "full";
  els.layout.value = saved;
}

function setupScrollReveal() {
  const items = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -30px" },
  );

  items.forEach((item) => observer.observe(item));
}

function setupBackToTop() {
  const update = () => {
    els.backToTop.hidden = window.scrollY < 700;
  };
  window.addEventListener("scroll", update, { passive: true });
  els.backToTop.addEventListener("click", () =>
    window.scrollTo({
      top: 0,
      behavior: Vault.reduced.matches ? "instant" : "smooth",
    }),
  );
  update();
}

async function boot() {
  setupScrollReveal();
  setupBackToTop();
  setupLayout();

  try {
    const [catalogResponse] = await Promise.all([
      fetch("./games.json", { cache: "default" }),
      loadRates(),
    ]);

    if (!catalogResponse.ok) throw new Error(`HTTP ${catalogResponse.status}`);
    const data = await catalogResponse.json();
    if (!Array.isArray(data.games))
      throw new Error("games.json has no games array");

    meta = data.meta || {};
    catalog = data.games
      .filter(
        (item) =>
          item &&
          item.title &&
          Number.isFinite(Number(item.original_price)) &&
          Number.isFinite(Number(item.sale_price)) &&
          Number.isFinite(Number(item.discount_percent)),
      )
      .map((item) => ({
        ...item,
        type: normalizeType(item.type || item.product_type),
        original_price: Number(item.original_price),
        sale_price: Number(item.sale_price),
        discount_percent: Number(item.discount_percent),
      }));

    setCounts();
    populateGenreFilters();
    setupBudget();
    els.updatedAt.textContent = formatDate(meta.updated_at);
    restoreFilters();
    render();
    setHeroSnapshot().then(buildDiscoveries);
    Vault.countUp(document.querySelector("#totalGems"), catalog.length);
  } catch (error) {
    console.error("Failed to load catalog", error);
    els.resultCount.textContent = "Catalog unavailable";
    els.products.innerHTML = "";
    els.error.hidden = false;
    els.heroCount.textContent = "Catalog unavailable";
    document.querySelector("#dailyGem").hidden = true;
    document.querySelector(".legendary-section").hidden = true;
  }
}

window.addEventListener("pageshow", () => {
  if (!location.hash && !location.search)
    requestAnimationFrame(() => window.scrollTo(0, 0));
});

let searchTimer;
els.search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(resetPageAndRender, 80);
});
els.sort.addEventListener("change", resetPageAndRender);
els.pageSize.addEventListener("change", resetPageAndRender);
els.minPrice.addEventListener("input", resetPageAndRender);
els.maxPrice.addEventListener("input", resetPageAndRender);
els.reset.addEventListener("click", resetAll);
els.emptyReset.addEventListener("click", resetAll);

els.currency.addEventListener("change", async () => {
  const oldRate = currencyRate || 1;
  const preserve = {
    minUSD: Number(els.minPrice.value) / oldRate,
    maxUSD: Number(els.maxPrice.value) / oldRate,
  };

  currentCurrency = els.currency.value;
  currencyRate = rates[currentCurrency] || 1;

  try {
    localStorage.setItem(CURRENCY_KEY, currentCurrency);
  } catch {}

  setupBudget(preserve);
  await setHeroSnapshot();
  buildDiscoveries();
  currentPage = 1;
  render();
  Vault.flipPrices();
});

els.layout.addEventListener("change", () => {
  try {
    localStorage.setItem(LAYOUT_KEY, els.layout.value);
  } catch {}
  currentPage = 1;
  render();
});

els.prevPage.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage -= 1;
    render({ scrollToResults: true });
  }
});

els.nextPage.addEventListener("click", () => {
  currentPage += 1;
  render({ scrollToResults: true });
});

els.typeTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeType = tab.dataset.type;
    currentPage = 1;
    els.typeTabs.forEach((item) =>
      item.classList.toggle("active", item === tab),
    );
    render();
  });
});

els.quickChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    activeDiscount = chip.dataset.filter;
    currentPage = 1;
    els.quickChips.forEach((item) =>
      item.classList.toggle("active", item === chip),
    );
    render();
  });
});

els.genreFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-genre]");
  if (!button) return;
  const genre = button.dataset.genre;
  if (activeGenres.has(genre)) activeGenres.delete(genre);
  else activeGenres.add(genre);
  currentPage = 1;
  render();
});

document.addEventListener("keydown", (event) => {
  const tag = document.activeElement?.tagName;

  if (
    event.key === "/" &&
    document.activeElement !== els.search &&
    !["INPUT", "SELECT", "TEXTAREA"].includes(tag)
  ) {
    event.preventDefault();
    els.search.focus();
  }

  if (
    event.key === "Escape" &&
    document.activeElement === els.search &&
    els.search.value
  ) {
    els.search.value = "";
    resetPageAndRender();
  }
});

els.products.innerHTML = Array.from(
  { length: 6 },
  () => '<div class="skeleton" aria-hidden="true"></div>',
).join("");
boot();
function highlightTitle(title) {
  const q = els.search.value.trim();
  if (!q) return escapeHtml(title);
  const i = title.toLowerCase().indexOf(q.toLowerCase());
  return i < 0
    ? escapeHtml(title)
    : escapeHtml(title.slice(0, i)) +
        "<mark>" +
        escapeHtml(title.slice(i, i + q.length)) +
        "</mark>" +
        escapeHtml(title.slice(i + q.length));
}
function syncFilters() {
  const params = new URLSearchParams();
  params.set("type", activeType);
  if (activeDiscount !== "all") params.set("tier", activeDiscount);
  if (activeGenres.size)
    params.set("genres", [...activeGenres].sort((a, b) => a.localeCompare(b)).join(","));
  if (els.search.value) params.set("q", els.search.value);
  params.set("sort", els.sort.value);
  params.set("view", els.layout.value);
  params.set("size", els.pageSize.value);
  params.set("page", currentPage);
  params.set("min", Number(els.minPrice.value) / currencyRate);
  params.set("max", Number(els.maxPrice.value) / currencyRate);
  history.replaceState(
    null,
    "",
    location.pathname + "?" + params + location.hash,
  );
  try {
    sessionStorage.setItem("vault:filters", "?" + params);
  } catch {}
  const pills = [];
  if (activeType !== "all") pills.push(["type", typeLabel(activeType)]);
  if (activeDiscount !== "all")
    pills.push(["tier", activeDiscount.replace("plus", "%+")]);
  [...activeGenres]
    .sort((a, b) => a.localeCompare(b))
    .forEach((genre) => pills.push([`genre:${genre}`, genre]));
  if (els.search.value) pills.push(["q", els.search.value]);
  if (
    Number(els.minPrice.value) > 0 ||
    Number(els.maxPrice.value) < Number(els.maxPrice.max)
  )
    pills.push(["budget", els.budgetOutput.textContent]);
  document.querySelector("#activeFilters").innerHTML = pills
    .map(([k, v]) => `<button data-remove="${k}">${escapeHtml(v)} ×</button>`)
    .join("");
  document.querySelector(".mobile-filters").textContent =
    `Filters (${pills.length})`;
  const currentTab = els.typeTabs.find((el) => el.dataset.type === activeType);
  if (currentTab) {
    document
      .querySelector("#typeTabs")
      .style.setProperty("--tab-y", currentTab.offsetTop + "px");
    document
      .querySelector("#typeTabs")
      .style.setProperty("--tab-height", currentTab.offsetHeight + "px");
  }
  els.typeTabs.forEach((el) => {
    el.classList.toggle("active", el.dataset.type === activeType);
    el.setAttribute("aria-pressed", el.dataset.type === activeType);
  });
  els.quickChips.forEach((el) => {
    el.classList.toggle("active", el.dataset.filter === activeDiscount);
    el.setAttribute("aria-pressed", el.dataset.filter === activeDiscount);
  });
  els.genreFilters.querySelectorAll("[data-genre]").forEach((el) => {
    const selected = activeGenres.has(el.dataset.genre);
    el.classList.toggle("active", selected);
    el.setAttribute("aria-pressed", selected);
  });
}
function restoreFilters() {
  const p = new URLSearchParams(location.search);
  if (["game", "dlc", "bundle", "all"].includes(p.get("type")))
    activeType = p.get("type");
  if (["all", "50plus", "70plus", "90plus"].includes(p.get("tier")))
    activeDiscount = p.get("tier");
  activeGenres = new Set(
    (p.get("genres") || "")
      .split(",")
      .map((genre) => genre.trim())
      .filter(Boolean),
  );
  els.search.value = p.get("q") || "";
  for (const [k, el] of [
    ["sort", els.sort],
    ["view", els.layout],
    ["size", els.pageSize],
  ])
    if ([...el.options].some((o) => o.value === p.get(k))) el.value = p.get(k);
  currentPage = Math.max(1, Number(p.get("page")) || 1);
  if (
    p.has("min") &&
    p.has("max") &&
    Number.isFinite(+p.get("min")) &&
    Number.isFinite(+p.get("max"))
  )
    setupBudget({ minUSD: +p.get("min"), maxUSD: +p.get("max") });
}
document.querySelector("#activeFilters").addEventListener("click", (e) => {
  const key = e.target.dataset.remove;
  if (!key) return;
  if (key === "type") activeType = "all";
  if (key === "tier") activeDiscount = "all";
  if (key.startsWith("genre:")) activeGenres.delete(key.slice(6));
  if (key === "q") els.search.value = "";
  if (key === "budget") setupBudget();
  resetPageAndRender();
});
window.addEventListener("popstate", () => {
  restoreFilters();
  render();
});
let showcaseTimer,
  showcaseIndex = 0;
async function buildDiscoveries() {
  const ranked = [...catalog].sort(
    (a, b) =>
      b.discount_percent - a.discount_percent || a.title.localeCompare(b.title),
  );
  const eligible = ranked.filter((p) => p.sale_price <= 10);
  const best = eligible.filter(
    (p) => p.discount_percent === eligible[0]?.discount_percent,
  );
  const day = Math.floor(Date.now() / 86400000);
  const gem = (best.length ? best : ranked)[
    day % (best.length || ranked.length)
  ];
  if (!gem) return;
  const daily = document.querySelector("#dailyGem");
  daily.classList.remove("skeleton");
  Vault.paint(daily, gem.discount_percent);
  daily.innerHTML = `<img width="460" height="215" alt="" hidden><div><p class="eyebrow">◇ GEM OF THE DAY</p><h2>${escapeHtml(gem.title)}</h2><p>${moneyUSD(gem.sale_price)} <s>${moneyUSD(gem.original_price)}</s></p>${gem.ends_at ? `<span class="countdown" data-ends="${escapeHtml(gem.ends_at)}"></span>` : ""}</div><strong class="daily-cut">−${gem.discount_percent}%</strong><a class="primary-action" href="${escapeHtml(internalProductUrl(gem.title))}">View gem ↗</a>`;
  thumbnailData(gem).then((d) => {
    if (d) {
      const img = daily.querySelector("img");
      img.hidden = false;
      img.src = d.thumbnail_url;
      img.onerror = () => (img.hidden = true);
    }
  });
  const shelf = document.querySelector("#legendaryShelf"),
    items = ranked.filter((p) => p.discount_percent >= 90).slice(0, 8);
  shelf.parentElement.hidden = !items.length;
  if (items.length) {
    const run = items.map(fullCard).join("");
    shelf.innerHTML = `<div class="shelf-track">${run}${run}</div>`;
    const track = shelf.querySelector(".shelf-track");
    [...track.children].forEach((el, i) =>
      resolveThumbnail(el, items[i % items.length]),
    );
    Vault.observe(track);
  } else {
    shelf.innerHTML = "";
  }
  const soon = catalog
    .filter((p) => Vault.endTime(p.ends_at) > Date.now())
    .sort((a, b) => Vault.endTime(a.ends_at) - Vault.endTime(b.ends_at))[0];
  if (soon) document.querySelector("#soonest").dataset.ends = soon.ends_at;
  else document.querySelector("#soonest").textContent = "No dated offers";
  const bins = Array(20).fill(0);
  catalog.forEach(
    (p) =>
      bins[Math.min(19, Math.floor((p.sale_price / absoluteMaxUSD) * 20))]++,
  );
  document.querySelector("#histogram").innerHTML = bins
    .map(
      (n) =>
        `<i style="height:${Math.max(3, (n / Math.max(...bins)) * 100)}%"></i>`,
    )
    .join("");
  const footer = document.querySelector(".site-footer .footer-inner");
  let stats = footer.querySelector(".footer-stats");
  if (!stats) {
    stats = document.createElement("p");
    stats.className = "footer-stats";
    footer.append(stats);
  }
  stats.textContent = `Tracking ${catalog.length.toLocaleString()} deals across ${new Set(catalog.map((p) => p.type)).size} product types · ${formatDate(meta.updated_at)}`;
  clearInterval(showcaseTimer);
  const featured = ranked.filter((p) => p.type === "game").slice(0, 4);
  const fan = document.querySelector("#fanCards");
  fan.innerHTML = featured
    .slice(1)
    .map(
      (p, i) =>
        `<div class="fan-card" style="--fan:${i + 1}"><img width="460" height="215" alt=""><span>${escapeHtml(p.title)}</span></div>`,
    )
    .join("");
  featured.slice(1).forEach((p, i) =>
    thumbnailData(p).then((d) => {
      if (d) fan.children[i].querySelector("img").src = d.thumbnail_url;
    }),
  );
  const show = async () => {
    const p = featured[showcaseIndex % featured.length];
    if (!p) return;
    Vault.paint(document.querySelector(".featured-card"), p.discount_percent);
    els.previewTitle.textContent = p.title;
    els.previewType.textContent =
      typeLabel(p.type) + " · " + Vault.rarity(p.discount_percent);
    els.previewGroup.textContent = p.sale_group || "Steam promotion";
    els.previewPrice.textContent = moneyUSD(p.sale_price);
    els.previewWas.textContent = moneyUSD(p.original_price);
    els.previewDiscount.textContent = "−" + p.discount_percent + "%";
    els.featuredLink.href = els.previewMedia.href = internalProductUrl(p.title);
    const d = await thumbnailData(p);
    if (d)
      setImage(
        els.previewMedia,
        els.previewImage,
        d.thumbnail_url,
        d.fallback_url,
      );
  };
  show();
  showcaseTimer = setInterval(() => {
    if (
      document.hidden ||
      Vault.reduced.matches ||
      document.querySelector(".featured-card").matches(":hover,:focus-within")
    )
      return;
    showcaseIndex++;
    show();
    if (!Vault.reduced.matches)
      document.querySelector(".featured-card").animate(
        [
          { opacity: 0.4, transform: "translateX(20px) rotateY(-12deg)" },
          {
            opacity: 1,
            transform: "perspective(900px) rotateY(-8deg) rotateX(4deg)",
          },
        ],
        { duration: 600, easing: "cubic-bezier(.22,1,.36,1)" },
      );
  }, 6000);
  Vault.timers();
}


const PRICE_NOTICE_KEY = "discounted:hide-price-notice";
const priceNoticeDialog = document.querySelector("#priceNoticeDialog");
const priceNoticeClose = document.querySelector("#priceNoticeClose");
const priceNoticeDismissForever = document.querySelector("#priceNoticeDismissForever");

function openPriceNotice() {
  if (!priceNoticeDialog) return;

  let hiddenForever = false;
  try {
    hiddenForever = localStorage.getItem(PRICE_NOTICE_KEY) === "1";
  } catch {}

  if (hiddenForever) return;

  priceNoticeDialog.hidden = false;
  document.documentElement.classList.add("price-notice-open");
  requestAnimationFrame(() => priceNoticeClose?.focus());
}

function closePriceNotice() {
  if (!priceNoticeDialog) return;
  priceNoticeDialog.hidden = true;
  document.documentElement.classList.remove("price-notice-open");
}

priceNoticeClose?.addEventListener("click", closePriceNotice);

priceNoticeDismissForever?.addEventListener("click", () => {
  try {
    localStorage.setItem(PRICE_NOTICE_KEY, "1");
  } catch {}
  closePriceNotice();
});

priceNoticeDialog?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePriceNotice();
});

window.addEventListener("DOMContentLoaded", openPriceNotice);
