/* Shared catalog helpers, header controls and deal cards. No dependencies or build step. */
window.Discounted = (() => {
  const t = I18n.t;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  const CURRENCY_KEY = "discounted:currency";
  const THUMB_CACHE_PREFIX = "discounted:thumb:";
  const FILTERS_KEY = "discounted:filters";
  // A short list: the store's base currency, the Gulf currencies our Arabic readers use, and Steam's largest markets.
  const CURRENCIES = ["USD", "SAR", "AED", "EUR", "GBP", "CAD", "AUD", "JPY"];
  const FALLBACK_RATES = { USD: 1, SAR: 3.75, AED: 3.6725, EUR: 0.86, GBP: 0.74, CAD: 1.4, AUD: 1.42, JPY: 158 };
  // Generic Steam promotion labels are not sale events worth surfacing by name.
  const GENERIC_SALE = /^(steam )?(specials?|special promotion|promotion)$|^(other )?(\w+ \d+ )?promotions?$|^standalone\b|^introductory offer$|^steam launch discount$/i;

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>'"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[ch]);

  /* ---------- Catalog ---------- */

  function normalizeType(value) {
    const raw = String(value || "game").trim().toLowerCase();
    if (["dlc", "downloadable content", "downloadable_content"].includes(raw)) return "dlc";
    if (["bundle", "package"].includes(raw)) return "bundle";
    if (raw === "game") return "game";
    return "other";
  }

  function routeHash(value) {
    let hash = 2166136261;
    for (const ch of String(value)) {
      hash ^= ch.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function routeId(item) {
    if (Number.isInteger(item?.steam_appid)) return String(item.steam_appid);
    if (Number.isInteger(item?.steam_bundleid)) return "b" + item.steam_bundleid;
    if (Number.isInteger(item?.steam_subid)) return "s" + item.steam_subid;
    return "x" + routeHash(`${normalizeType(item?.type)}|${item?.title || ""}`);
  }

  function productUrl(item) {
    if (!item || typeof item === "string") return `/product.html?title=${encodeURIComponent(String(item || ""))}`;
    return `/${normalizeType(item.type)}/${routeId(item)}`;
  }

  function steamUrl(item) {
    if (item.store_url && /^https:\/\/store\.steampowered\.com\//.test(item.store_url)) return item.store_url;
    if (Number.isInteger(item.steam_appid)) return `https://store.steampowered.com/app/${item.steam_appid}/`;
    if (Number.isInteger(item.steam_bundleid)) return `https://store.steampowered.com/bundle/${item.steam_bundleid}/`;
    if (Number.isInteger(item.steam_subid)) return `https://store.steampowered.com/sub/${item.steam_subid}/`;
    return `https://store.steampowered.com/search/?term=${encodeURIComponent(item.title)}`;
  }

  function isNamedSale(name) {
    return Boolean(name) && !GENERIC_SALE.test(String(name).trim());
  }

  let catalogPromise = null;
  function loadCatalog() {
    catalogPromise ||= fetch("/games.json", { cache: "default" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data.games)) throw new Error("games.json has no games array");
        const items = data.games
          .filter((item) => item && typeof item.title === "string" && item.title.trim() &&
            [item.original_price, item.sale_price, item.discount_percent].every((value) => Number.isFinite(Number(value))))
          .map((item) => ({
            ...item,
            type: normalizeType(item.type || item.product_type),
            original_price: Number(item.original_price),
            sale_price: Number(item.sale_price),
            discount_percent: Number(item.discount_percent),
            genres: Array.isArray(item.genres) ? item.genres.map(String).filter(Boolean) : [],
          }));
        return { meta: data.meta || {}, items };
      });
    return catalogPromise;
  }

  /* ---------- Dates ---------- */

  function endTime(value) {
    return Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value + "T00:00:00Z" : value);
  }

  // Short deadline text for cards: relative inside two days, otherwise the date.
  function endsLabel(value) {
    const end = endTime(value);
    if (!Number.isFinite(end)) return null;
    const left = end - Date.now();
    if (left <= 0) return { text: t("card.ended"), state: "ended" };
    if (left < 172800000) return { text: t("card.endsIn", { rel: I18n.relative(left) }), state: "soon" };
    return { text: t("card.ends", { date: I18n.date(end) }), state: "" };
  }

  /* ---------- Currency ---------- */

  let rates = { USD: 1 };
  let currency = "USD";
  const formatters = new Map();

  let ratesPromise = null;
  function loadRates() {
    ratesPromise ||= fetchRates();
    return ratesPromise;
  }

  async function fetchRates() {
    try {
      const response = await fetch("/api/fx", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("FX unavailable");
      const data = await response.json();
      rates = data.rates && data.rates.USD ? data.rates : FALLBACK_RATES;
    } catch {
      rates = FALLBACK_RATES;
    }
    let saved = "USD";
    try { saved = localStorage.getItem(CURRENCY_KEY) || "USD"; } catch {}
    currency = CURRENCIES.includes(saved) && rates[saved] ? saved : "USD";
    return rates;
  }

  const rate = () => rates[currency] || 1;

  // Arabic puts the amount first and the currency after it ("1.84 ر.س"), which reads correctly right to left.
  const ARABIC_SYMBOLS = { USD: "$", SAR: "ر.س", AED: "د.إ", EUR: "€", GBP: "£", CAD: "CA$", AUD: "A$", JPY: "¥" };

  function formatter(code, compact) {
    const key = `${code}|${compact ? 1 : 0}`;
    if (formatters.has(key)) return formatters.get(key);
    const digits = compact || code === "JPY" ? 0 : 2;
    let fmt;
    try {
      if (I18n.language() === "ar") {
        const number = new Intl.NumberFormat(I18n.locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
        fmt = { format: (value) => `${number.format(value)}\u00a0${ARABIC_SYMBOLS[code] || code}` };
      } else {
        fmt = new Intl.NumberFormat(I18n.locale, { style: "currency", currency: code, minimumFractionDigits: digits, maximumFractionDigits: digits });
      }
    } catch {
      fmt = { format: (value) => `${code} ${Number(value).toFixed(digits)}` };
    }
    formatters.set(key, fmt);
    return fmt;
  }

  // Price in the display currency from a USD amount.
  const money = (usd) => formatter(currency).format(Number(usd) * rate());
  // A display-currency value, rounded for filter labels.
  const moneyRounded = (value) => formatter(currency, value === 0 || Math.abs(value) >= 10).format(value);

  function setCurrency(code) {
    if (!rates[code]) return;
    currency = code;
    try { localStorage.setItem(CURRENCY_KEY, code); } catch {}
    document.querySelectorAll("[data-currency]").forEach((select) => (select.value = code));
    document.dispatchEvent(new CustomEvent("currencychange", { detail: code }));
  }

  function mountCurrency() {
    document.querySelectorAll("[data-currency]:not([data-mounted])").forEach((select) => {
      select.dataset.mounted = "1";
      select.innerHTML = CURRENCIES.filter((code) => rates[code])
        .map((code) => `<option value="${code}">${code}</option>`)
        .join("");
      select.value = currency;
      select.addEventListener("change", () => setCurrency(select.value));
    });
  }

  /* ---------- Artwork ---------- */

  function artUrl(item) {
    if (item.thumbnail_url) return item.thumbnail_url;
    const appid = item.steam_appid || item.thumbnail_appid;
    return appid ? `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg` : null;
  }

  function readThumbCache(title) {
    try {
      const data = JSON.parse(localStorage.getItem(THUMB_CACHE_PREFIX + title) || "null");
      return data?.thumbnail_url ? data : null;
    } catch {
      return null;
    }
  }

  async function lookupArt(item) {
    const cached = readThumbCache(item.title);
    if (cached) return cached;
    try {
      const response = await fetch(`/api/steam-thumb?title=${encodeURIComponent(item.title)}`, { headers: { Accept: "application/json" } });
      if (!response.ok) return null;
      const data = await response.json();
      if (!data.thumbnail_url) return null;
      try {
        localStorage.setItem(THUMB_CACHE_PREFIX + item.title, JSON.stringify({ thumbnail_url: data.thumbnail_url, fallback_url: data.fallback_url || null, cached_at: Date.now() }));
      } catch {}
      return data;
    } catch {
      return null;
    }
  }

  function setArt(img, url, fallback) {
    if (!img || !url) return;
    const frame = img.parentElement;
    let triedFallback = false;
    img.onload = () => frame.classList.add("has-art");
    img.onerror = () => {
      if (!triedFallback && fallback && fallback !== url) {
        triedFallback = true;
        img.src = fallback;
        return;
      }
      frame.classList.remove("has-art");
      img.removeAttribute("src");
    };
    img.src = url;
  }

  // Artwork without a known Steam app id is looked up only when its card nears the viewport.
  let artObserver = null;
  function hydrateArt(root, items) {
    const pending = [];
    root.querySelectorAll("[data-art-lookup]").forEach((img) => {
      const item = items.get(img.dataset.artLookup);
      if (item) pending.push([img, item]);
    });
    if (!pending.length) return;
    const load = ([img, item]) => lookupArt(item).then((data) => data && setArt(img, data.thumbnail_url, data.fallback_url));
    if (!("IntersectionObserver" in window)) return pending.forEach(load);
    artObserver ||= new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        artObserver.unobserve(entry.target);
        entry.target._load?.();
      });
    }, { rootMargin: "300px 0px" });
    pending.forEach((pair) => {
      pair[0]._load = () => load(pair);
      artObserver.observe(pair[0]);
    });
  }

  /* ---------- Popularity (Steam review totals and Steam's revenue-ranked chart) ---------- */

  const popularity = new Map();

  async function loadPopularity(ids) {
    const wanted = [...new Set(ids)].filter((id) => Number.isSafeInteger(id) && id > 0 && !popularity.has(id));
    for (let offset = 0; offset < wanted.length; offset += 30) {
      try {
        const response = await fetch(`/api/popularity?ids=${wanted.slice(offset, offset + 30).join(",")}`);
        if (!response.ok) continue;
        const { items } = await response.json();
        for (const [id, value] of Object.entries(items || {})) popularity.set(Number(id), value);
      } catch { /* Cards stay usable without Steam's review service. */ }
    }
    return popularity;
  }

  function popularityMarkup(id, { long = false } = {}) {
    const result = popularity.get(Number(id));
    if (!result) return "";
    const parts = [];
    if (result.reviews != null) {
      const n = result.reviews;
      const formatted = long || n < 10000 ? I18n.number(n) : I18n.number(n, { notation: "compact", maximumFractionDigits: 1 });
      parts.push(`<span class="reviews">${escapeHtml(I18n.count("reviews", n, formatted))}</span>`);
    }
    if (result.topSeller) parts.push(`<span class="top-seller" title="${escapeHtml(t("card.topSellerHint"))}">${escapeHtml(t("card.topSeller"))}</span>`);
    return parts.join("");
  }

  function paintPopularity(root = document) {
    root.querySelectorAll("[data-pop]").forEach((el) => {
      const html = popularityMarkup(el.dataset.pop);
      if (html && el.innerHTML !== html) el.innerHTML = html;
    });
  }

  /* ---------- Deal cards ---------- */

  function dealMeta(item) {
    const bits = [];
    if (item.type !== "game") bits.push(t(`kind.${item.type}`));
    if (isNamedSale(item.sale_group)) bits.push(item.sale_group);
    else if (item.genres.length) bits.push(item.genres.slice(0, 2).map(I18n.genre).join(" · "));
    return bits.join(" · ");
  }

  function highlight(title, query) {
    const q = (query || "").trim();
    const i = q ? title.toLocaleLowerCase().indexOf(q.toLocaleLowerCase()) : -1;
    if (i < 0) return escapeHtml(title);
    return escapeHtml(title.slice(0, i)) + "<mark>" + escapeHtml(title.slice(i, i + q.length)) + "</mark>" + escapeHtml(title.slice(i + q.length));
  }

  function priceBlock(item) {
    return `<span class="cut">−${item.discount_percent}%</span><span class="amounts"><s>${money(item.original_price)}</s><strong>${money(item.sale_price)}</strong></span>`;
  }

  function dealCard(item, { query = "", layout = "full", eager = false } = {}) {
    const url = escapeHtml(productUrl(item));
    const art = artUrl(item);
    const ends = endsLabel(item.ends_at);
    const meta = dealMeta(item);
    const appid = Number.isInteger(item.steam_appid) ? item.steam_appid : "";
    const key = escapeHtml(routeId(item));
    const img = art
      ? `<img src="${escapeHtml(art)}" alt="" width="460" height="215" loading="${eager ? "eager" : "lazy"}" decoding="async" referrerpolicy="no-referrer" onload="this.parentElement.classList.add('has-art')" onerror="this.remove()">`
      : `<img alt="" width="460" height="215" decoding="async" referrerpolicy="no-referrer" data-art-lookup="${key}">`;
    const foot = `<span class="deal-pop" ${appid ? `data-pop="${appid}"` : ""}>${appid ? popularityMarkup(appid) : ""}</span>${ends ? `<span class="deal-ends ${ends.state}">${escapeHtml(ends.text)}</span>` : ""}`;

    if (layout === "compact") {
      return `<article class="deal deal-row" data-key="${key}">
        <div class="deal-art">${img}</div>
        <div class="deal-main">
          <h3 class="deal-title"><a href="${url}" dir="auto">${highlight(item.title, query)}</a></h3>
          <p class="deal-meta" dir="auto">${escapeHtml(meta)}</p>
          <p class="deal-foot">${foot}</p>
        </div>
        <div class="deal-price">${priceBlock(item)}</div>
        <a class="deal-steam" href="${escapeHtml(steamUrl(item))}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(t("card.steamLabel", { title: item.title }))}"><span>${escapeHtml(t("card.steam"))}</span><svg class="i i-sm" aria-hidden="true"><use href="#i-external"/></svg></a>
      </article>`;
    }
    return `<article class="deal" data-key="${key}">
      <div class="deal-art">${img}<span class="cut cut-float" aria-hidden="true">−${item.discount_percent}%</span></div>
      <div class="deal-body">
        <h3 class="deal-title"><a href="${url}" dir="auto">${highlight(item.title, query)}</a></h3>
        ${meta ? `<p class="deal-meta" dir="auto">${escapeHtml(meta)}</p>` : ""}
        <div class="deal-price">${priceBlock(item)}</div>
        <p class="deal-foot">${foot}</p>
      </div>
    </article>`;
  }

  function refreshDeadlines(root = document) {
    root.querySelectorAll("[data-ends]").forEach((el) => {
      const label = endsLabel(el.dataset.ends);
      if (label) el.textContent = label.text;
    });
  }

  /* ---------- Feedback ---------- */

  let toastTimer;
  function toast(message) {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.append(el);
    }
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 2600);
  }

  async function copy(url) {
    try {
      await navigator.clipboard.writeText(new URL(url, location.href).href);
      toast(t("toast.copied"));
    } catch {
      toast(t("toast.copyFailed"));
    }
  }

  async function random() {
    try {
      const { items } = await loadCatalog();
      if (!items.length) throw new Error("empty");
      location.href = productUrl(items[Math.floor(Math.random() * items.length)]);
    } catch {
      toast(t("toast.unavailable"));
    }
  }

  /* ---------- Page chrome ---------- */

  function mountChrome() {
    document.querySelectorAll("[data-lang-toggle]").forEach((button) => {
      button.addEventListener("click", () => I18n.setLanguage(I18n.language() === "ar" ? "en" : "ar"));
    });

    const shortcuts = document.querySelector("#shortcuts");
    let lastG = 0;
    document.addEventListener("keydown", (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable) return;
      if (document.querySelector("dialog[open], .filters.open")) return;
      const key = event.key.toLowerCase();
      if (event.key === "?" && shortcuts) shortcuts.showModal();
      else if (key === "r") random();
      else if (key === "h" && Date.now() - lastG < 1000) location.href = "/";
      else if (key === "g") lastG = Date.now();
    });

    document.addEventListener("click", (event) => {
      const copyButton = event.target.closest("[data-copy]");
      if (copyButton) {
        event.preventDefault();
        copy(copyButton.dataset.copy || location.href);
      }
      if (event.target.closest("[data-random]")) random();
      if (event.target.closest("[data-close-dialog]")) event.target.closest("dialog")?.close();
    });

    const toTop = document.querySelector("#backToTop");
    if (toTop) {
      const update = () => (toTop.hidden = scrollY < 1400);
      addEventListener("scroll", update, { passive: true });
      toTop.addEventListener("click", () => scrollTo({ top: 0, behavior: reducedMotion.matches ? "auto" : "smooth" }));
      update();
    }

    // Pages without prices still let people pick a currency for the next page they open.
    if (document.querySelector("[data-currency]")) loadRates().then(mountCurrency);

    // Deadlines are shown to the minute, so they refresh once a minute rather than ticking.
    setInterval(() => !document.hidden && refreshDeadlines(), 60000);
  }

  document.addEventListener("DOMContentLoaded", mountChrome);

  return {
    t, escapeHtml, reducedMotion, FILTERS_KEY,
    normalizeType, routeId, productUrl, steamUrl, isNamedSale, loadCatalog,
    endTime, endsLabel, refreshDeadlines,
    loadRates, mountCurrency, setCurrency, money, moneyRounded, rate, currency: () => currency,
    artUrl, lookupArt, setArt, hydrateArt,
    loadPopularity, popularityMarkup, paintPopularity, popularity,
    dealCard, dealMeta, highlight,
    toast, copy, random,
  };
})();
