/* Catalog page: filters, URL state, results and the price notice. */
const D = window.Discounted;
const { t, escapeHtml } = D;

const els = {
  adult: document.querySelector("#showAdult"),
  products: document.querySelector("#products"),
  search: document.querySelector("#searchInput"),
  sorts: [...document.querySelectorAll("[data-sort]")],
  pageSize: document.querySelector("#pageSizeSelect"),
  views: [...document.querySelectorAll("[data-view]")],
  resultsTitle: document.querySelector("#resultsTitle"),
  resultsRange: document.querySelector("#resultsRange"),
  empty: document.querySelector("#emptyState"),
  error: document.querySelector("#errorState"),
  reset: document.querySelector("#resetButton"),
  emptyReset: document.querySelector("#emptyReset"),
  types: [...document.querySelectorAll("[data-type]")],
  tiers: [...document.querySelectorAll("[data-tier]")],
  genreList: document.querySelector("#genreList"),
  minPrice: document.querySelector("#minPrice"),
  maxPrice: document.querySelector("#maxPrice"),
  priceOutput: document.querySelector("#priceOutput"),
  rangeFill: document.querySelector("#rangeFill"),
  rangeMin: document.querySelector("#rangeMin"),
  rangeMax: document.querySelector("#rangeMax"),
  pills: document.querySelector("#activeFilters"),
  pagination: document.querySelector("#pagination"),
  pageNumbers: document.querySelector("#pageNumbers"),
  prevPage: document.querySelector("#prevPage"),
  nextPage: document.querySelector("#nextPage"),
  events: document.querySelector("#events"),
  eventList: document.querySelector("#eventList"),
  panel: document.querySelector("#filterPanel"),
  backdrop: document.querySelector(".filters-backdrop"),
  sheetToggle: document.querySelector(".filters-toggle"),
  sheetClose: document.querySelector(".sheet-close"),
  sheetDone: document.querySelector("#sheetDone"),
  filtersCount: document.querySelector("#filtersCount"),
};

const LAYOUT_KEY = "discounted:layout";
const SORTS = ["featured", "discount", "ending", "cheap", "expensive", "savings", "az", "za", "discount-low"];
const TYPES = ["all", "game", "dlc", "bundle"];
const TIERS = { all: 0, "50plus": 50, "70plus": 70, "90plus": 90 };
const PAGE_SIZES = ["24", "48", "96"];
const PREFERRED_GENRES = ["Action", "Adventure", "RPG", "Strategy", "Simulation", "Casual", "Indie", "Puzzle", "Racing", "Sports", "Horror", "Survival", "Open World", "Massively Multiplayer"];
const SLIDER_MAX = 1000;

let catalog = [];
let meta = {};
let byKey = new Map();
let maxUSD = 100;
let lastCount = 0;

const state = {
  type: "all",
  tier: "all",
  genres: new Set(),
  sale: "",
  q: "",
  sort: "featured",
  view: "full",
  size: 24,
  page: 1,
};

/* ---------- Price range ----------
   Most deals cost under $20, so the slider is quadratic: the first third of the track covers the
   first tenth of the price range. Bounds snap to round values in the display currency. */

function niceStep(value) {
  if (value < 10) return 0.5;
  if (value < 100) return 1;
  if (value < 1000) return 5;
  if (value < 10000) return 50;
  return 500;
}

function positionToUSD(pos) {
  const usd = maxUSD * (pos / SLIDER_MAX) ** 2;
  const local = usd * D.rate();
  const step = niceStep(local);
  return (Math.round(local / step) * step) / D.rate();
}

function usdToPosition(usd) {
  return Math.round(SLIDER_MAX * Math.sqrt(Math.max(0, Math.min(1, usd / maxUSD))));
}

function priceBounds() {
  const minPos = Number(els.minPrice.value);
  const maxPos = Number(els.maxPrice.value);
  return {
    min: minPos <= 0 ? 0 : positionToUSD(minPos),
    max: maxPos >= SLIDER_MAX ? Infinity : positionToUSD(maxPos),
  };
}

function priceActive() {
  const { min, max } = priceBounds();
  return min > 0 || max < Infinity;
}

function priceLabel() {
  const { min, max } = priceBounds();
  const fmt = (usd) => D.moneyRounded(usd * D.rate());
  if (min <= 0 && max === Infinity) return t("filters.priceAny");
  if (min <= 0) return t("filters.priceUpTo", { max: fmt(max) });
  if (max === Infinity) return t("filters.priceFrom", { min: fmt(min) });
  return t("filters.priceRange", { min: fmt(min), max: fmt(max) });
}

function updatePriceUI() {
  let minPos = Number(els.minPrice.value);
  let maxPos = Number(els.maxPrice.value);
  if (minPos > maxPos) {
    if (document.activeElement === els.minPrice) maxPos = minPos;
    else minPos = maxPos;
    els.minPrice.value = minPos;
    els.maxPrice.value = maxPos;
  }
  els.rangeFill.style.insetInlineStart = `${(minPos / SLIDER_MAX) * 100}%`;
  els.rangeFill.style.width = `${((maxPos - minPos) / SLIDER_MAX) * 100}%`;
  els.priceOutput.textContent = priceLabel();
  els.rangeMin.textContent = D.moneyRounded(0);
  els.rangeMax.textContent = D.moneyRounded(Math.ceil(maxUSD * D.rate()));
  const { min, max } = priceBounds();
  els.minPrice.setAttribute("aria-valuetext", D.moneyRounded(min * D.rate()));
  els.maxPrice.setAttribute("aria-valuetext", max === Infinity ? t("filters.priceAny") : D.moneyRounded(max * D.rate()));
}

/* ---------- Filtering and sorting ---------- */

function matches(item, skip = "") {
  if (!D.canShow(item)) return false;
  const { min, max } = priceBounds();
  if (skip !== "type" && state.type !== "all" && item.type !== state.type) return false;
  if (item.discount_percent < TIERS[state.tier]) return false;
  if (state.genres.size && !item.genres.some((genre) => state.genres.has(genre))) return false;
  if (state.sale && item.sale_group !== state.sale) return false;
  if (item.sale_price < min - 1e-9 || item.sale_price > max + 1e-9) return false;
  if (state.q) {
    const haystack = item._search ||= `${item.title} ${item.sale_group || ""} ${item.type} ${item.genres.join(" ")} ${item.genres.map(I18n.genre).join(" ")}`.toLocaleLowerCase();
    if (!haystack.includes(state.q.toLocaleLowerCase())) return false;
  }
  return true;
}

function sortItems(items) {
  const byTitle = (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  const byCut = (a, b) => b.discount_percent - a.discount_percent || a.sale_price - b.sale_price || byTitle(a, b);
  const copy = [...items];
  switch (state.sort) {
    case "featured":
      return copy.sort((a, b) => (D.isNamedSale(b.sale_group) - D.isNamedSale(a.sale_group)) || byCut(a, b));
    case "discount":
      return copy.sort(byCut);
    case "ending": {
      const now = Date.now();
      const rank = (item) => {
        const end = D.endTime(item.ends_at);
        if (!Number.isFinite(end)) return [2, 0];
        return end > now ? [0, end] : [1, -end];
      };
      return copy.sort((a, b) => {
        const [ra, ea] = rank(a);
        const [rb, eb] = rank(b);
        return ra - rb || ea - eb || byCut(a, b);
      });
    }
    case "cheap":
      return copy.sort((a, b) => a.sale_price - b.sale_price || byTitle(a, b));
    case "expensive":
      return copy.sort((a, b) => b.sale_price - a.sale_price || byTitle(a, b));
    case "savings":
      return copy.sort((a, b) => b.original_price - b.sale_price - (a.original_price - a.sale_price) || byTitle(a, b));
    case "za":
      return copy.sort((a, b) => byTitle(b, a));
    case "discount-low":
      return copy.sort((a, b) => a.discount_percent - b.discount_percent || byTitle(a, b));
    default:
      return copy.sort(byTitle);
  }
}

/* ---------- Rendering ---------- */

function renderPagination(total) {
  const pages = Math.max(1, Math.ceil(total / state.size));
  els.pagination.hidden = pages <= 1;
  els.prevPage.disabled = state.page <= 1;
  els.nextPage.disabled = state.page >= pages;
  if (pages <= 1) {
    els.pageNumbers.innerHTML = "";
    return;
  }
  const wanted = [...new Set([1, pages, state.page - 1, state.page, state.page + 1])].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
  const parts = [];
  let previous = 0;
  for (const page of wanted) {
    if (previous && page - previous > 1) parts.push('<span class="pager-gap" aria-hidden="true">…</span>');
    const current = page === state.page;
    parts.push(`<button type="button" data-page="${page}" ${current ? 'aria-current="page"' : ""} aria-label="${escapeHtml(t("page.label", { n: I18n.number(page) }))}">${I18n.number(page)}</button>`);
    previous = page;
  }
  els.pageNumbers.innerHTML = parts.join("");
}

function render({ scroll = false } = {}) {
  updatePriceUI();
  const results = sortItems(catalog.filter((item) => matches(item)));
  const pages = Math.max(1, Math.ceil(results.length / state.size));
  state.page = Math.min(Math.max(1, state.page), pages);
  const start = (state.page - 1) * state.size;
  const pageItems = results.slice(start, start + state.size);
  lastCount = results.length;

  els.products.classList.toggle("is-list", state.view === "compact");
  els.products.innerHTML = pageItems.map((item, i) => D.dealCard(item, { query: state.q, layout: state.view, eager: i < 4 })).join("");
  els.products.setAttribute("aria-busy", "false");
  D.hydrateArt(els.products, byKey);
  D.loadPopularity(pageItems.map((item) => item.steam_appid)).then(() => D.paintPopularity(els.products));

  els.resultsTitle.textContent = I18n.count("deals", results.length);
  els.resultsRange.textContent = results.length > state.size
    ? t("results.range", { from: I18n.number(start + 1), to: I18n.number(start + pageItems.length) })
    : "";
  els.empty.hidden = results.length !== 0;
  document.querySelector(".pager-bar").hidden = results.length === 0;
  renderPagination(results.length);
  renderCounts();
  syncControls();
  syncUrl();

  if (scroll) document.querySelector(".results-head").scrollIntoView({ block: "start", behavior: "auto" });
}

// Type counts reflect every other active filter, so each number is what that button would show.
function renderCounts() {
  const counts = { all: 0, game: 0, dlc: 0, bundle: 0 };
  for (const item of catalog.filter(D.canShow)) {
    if (!matches(item, "type")) continue;
    counts.all += 1;
    if (item.type in counts) counts[item.type] += 1;
  }
  for (const [type, n] of Object.entries(counts)) {
    const el = document.querySelector(`#${type}Count`);
    if (el) el.textContent = I18n.number(n);
  }
}

function activeFilters() {
  const list = [];
  if (state.type !== "all") list.push(["type", t(`type.${state.type}`)]);
  if (state.tier !== "all") list.push(["tier", state.tier.replace("plus", "%+")]);
  [...state.genres].sort().forEach((genre) => list.push([`genre:${genre}`, I18n.genre(genre)]));
  if (state.sale) list.push(["sale", state.sale]);
  if (priceActive()) list.push(["price", priceLabel()]);
  return list;
}

function syncControls() {
  els.adult.checked = D.adultAllowed();
  els.types.forEach((el) => el.setAttribute("aria-pressed", String(el.dataset.type === state.type)));
  els.tiers.forEach((el) => el.setAttribute("aria-pressed", String(el.dataset.tier === state.tier)));
  els.genreList.querySelectorAll("[data-genre]").forEach((el) => el.setAttribute("aria-pressed", String(state.genres.has(el.dataset.genre))));
  els.eventList.querySelectorAll("[data-sale]").forEach((el) => el.setAttribute("aria-pressed", String(el.dataset.sale === state.sale)));
  els.views.forEach((el) => el.setAttribute("aria-pressed", String(el.dataset.view === state.view)));
  els.sorts.forEach((el) => (el.value = state.sort));
  els.pageSize.value = String(state.size);
  if (els.search.value !== state.q && document.activeElement !== els.search) els.search.value = state.q;

  const filters = activeFilters();
  const pills = [...filters];
  if (state.q) pills.push(["q", `“${state.q}”`]);
  els.pills.innerHTML = pills
    .map(([key, label]) => `<button type="button" class="pill" data-remove="${escapeHtml(key)}" aria-label="${escapeHtml(t("filters.remove", { label }))}"><span dir="auto">${escapeHtml(label)}</span><svg class="i i-sm" aria-hidden="true"><use href="#i-x"/></svg></button>`)
    .join("");
  els.pills.hidden = !pills.length;
  els.filtersCount.hidden = !filters.length;
  els.filtersCount.textContent = I18n.number(filters.length);
  els.sheetDone.textContent = t("filters.showCount", { deals: I18n.count("deals", lastCount), n: I18n.number(lastCount) });
}

/* ---------- URL state ---------- */

function syncUrl() {
  const params = new URLSearchParams();
  if (state.type !== "all") params.set("type", state.type);
  if (state.tier !== "all") params.set("tier", state.tier);
  if (state.genres.size) params.set("genres", [...state.genres].sort().join(","));
  if (state.sale) params.set("sale", state.sale);
  if (state.q) params.set("q", state.q);
  if (state.sort !== "featured") params.set("sort", state.sort);
  if (state.view !== "full") params.set("view", state.view);
  if (state.size !== 24) params.set("size", state.size);
  if (state.page > 1) params.set("page", state.page);
  const { min, max } = priceBounds();
  if (min > 0) params.set("min", +min.toFixed(4));
  if (max < Infinity) params.set("max", +max.toFixed(4));
  const query = params.toString();
  history.replaceState(null, "", location.pathname + (query ? "?" + query : "") + location.hash);
  try { sessionStorage.setItem(D.FILTERS_KEY, query ? "?" + query : ""); } catch {}
}

function restoreFromUrl() {
  const p = new URLSearchParams(location.search);
  state.type = TYPES.includes(p.get("type")) ? p.get("type") : "all";
  state.tier = p.get("tier") in TIERS ? p.get("tier") : "all";
  state.genres = new Set((p.get("genres") || "").split(",").map((g) => g.trim()).filter(Boolean));
  state.sale = p.get("sale") || "";
  state.q = (p.get("q") || "").trim();
  state.sort = SORTS.includes(p.get("sort")) ? p.get("sort") : "featured";
  let savedView = "full";
  try { savedView = localStorage.getItem(LAYOUT_KEY) || "full"; } catch {}
  state.view = ["full", "compact"].includes(p.get("view")) ? p.get("view") : savedView === "compact" ? "compact" : "full";
  state.size = PAGE_SIZES.includes(p.get("size")) ? Number(p.get("size")) : 24;
  state.page = Math.max(1, Math.floor(Number(p.get("page"))) || 1);
  const min = Number(p.get("min"));
  const max = Number(p.get("max"));
  els.minPrice.value = p.has("min") && Number.isFinite(min) && min > 0 ? usdToPosition(min) : 0;
  els.maxPrice.value = p.has("max") && Number.isFinite(max) && max < maxUSD ? usdToPosition(max) : SLIDER_MAX;
  const known = new Set(catalog.flatMap((item) => item.genres));
  state.genres = new Set([...state.genres].filter((g) => known.has(g)));
  if (state.sale && !catalog.some((item) => item.sale_group === state.sale)) state.sale = "";
  els.search.value = state.q;
}

/* ---------- Page furniture ---------- */

function buildSortOptions() {
  const options = SORTS.map((key) => `<option value="${key}">${escapeHtml(t(`sort.${key}`))}</option>`).join("");
  els.sorts.forEach((select) => (select.innerHTML = options));
}

function buildGenres() {
  const counts = new Map();
  catalog.filter(D.canShow).forEach((item) => item.genres.forEach((genre) => counts.set(genre, (counts.get(genre) || 0) + 1)));
  const genres = [...counts.keys()].sort((a, b) => {
    const ai = PREFERRED_GENRES.indexOf(a);
    const bi = PREFERRED_GENRES.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.localeCompare(b);
  });
  els.genreList.innerHTML = genres
    .map((genre) => `<button type="button" class="chip" data-genre="${escapeHtml(genre)}" aria-pressed="false"><span>${escapeHtml(I18n.genre(genre))}</span><b>${I18n.number(counts.get(genre))}</b></button>`)
    .join("");
}

function buildEvents() {
  const now = Date.now();
  const groups = new Map();
  for (const item of catalog.filter(D.canShow)) {
    if (!D.isNamedSale(item.sale_group)) continue;
    const group = groups.get(item.sale_group) || { name: item.sale_group, count: 0, end: Infinity };
    group.count += 1;
    const end = D.endTime(item.ends_at);
    if (Number.isFinite(end) && end > now) group.end = Math.min(group.end, end);
    groups.set(item.sale_group, group);
  }
  const events = [...groups.values()]
    .filter((group) => group.count >= 8 && group.end < Infinity)
    .sort((a, b) => b.count - a.count || a.end - b.end)
    .slice(0, 10);
  els.events.hidden = !events.length;
  els.eventList.innerHTML = events
    .map((group) => `<button type="button" class="event" data-sale="${escapeHtml(group.name)}" aria-pressed="false">
      <span class="event-name" dir="auto">${escapeHtml(group.name)}</span>
      <span class="event-meta">${escapeHtml(t("events.item", { count: I18n.count("deals", group.count), date: I18n.date(group.end) }))}</span>
    </button>`)
    .join("");
}

function buildStats() {
  const visible = catalog.filter(D.canShow);
  const now = Date.now();
  const lowest = visible.reduce((a, b) => (b.sale_price < a.sale_price ? b : a), { sale_price: Infinity });
  const deepest = visible.reduce((a, b) => (b.discount_percent > a.discount_percent ? b : a), { discount_percent: 0 });
  const next = visible.map((item) => D.endTime(item.ends_at)).filter((end) => Number.isFinite(end) && end > now).sort((a, b) => a - b)[0];
  document.querySelector("#statCount").textContent = I18n.number(visible.length);
  document.querySelector("#statLowest").textContent = visible.length ? D.money(lowest.sale_price) : "—";
  document.querySelector("#statDeepest").innerHTML = `<bdi dir="ltr">−${deepest.discount_percent}%</bdi>`;
  const deadline = document.querySelector("#statDeadline");
  deadline.textContent = next ? (next - now < 172800000 ? I18n.relative(next - now) : I18n.date(next)) : t("stat.none");
  const updated = I18n.date(meta.updated_at, { month: "short", day: "numeric", year: "numeric" });
  if (updated) {
    document.querySelector("#introUpdated").textContent = t("intro.updated", { date: updated });
    document.querySelector("#footerUpdated").textContent = t("footer.updated", { date: updated });
  }
}

/* ---------- Filter sheet (below 1024px) ---------- */

const sheetQuery = matchMedia("(max-width: 1023px)");
let sheetReturnFocus = null;

function openSheet() {
  sheetReturnFocus = document.activeElement;
  els.panel.classList.add("open");
  els.panel.setAttribute("role", "dialog");
  els.panel.setAttribute("aria-modal", "true");
  els.backdrop.hidden = false;
  els.sheetToggle.setAttribute("aria-expanded", "true");
  document.documentElement.classList.add("sheet-open");
  els.sheetClose.focus();
}

function closeSheet() {
  if (!els.panel.classList.contains("open")) return;
  els.panel.classList.remove("open");
  els.panel.removeAttribute("role");
  els.panel.removeAttribute("aria-modal");
  els.backdrop.hidden = true;
  els.sheetToggle.setAttribute("aria-expanded", "false");
  document.documentElement.classList.remove("sheet-open");
  sheetReturnFocus?.focus?.();
}

els.sheetToggle.addEventListener("click", openSheet);
els.sheetClose.addEventListener("click", closeSheet);
els.sheetDone.addEventListener("click", () => {
  closeSheet();
  document.querySelector(".results-head").scrollIntoView({ block: "start" });
});
els.backdrop.addEventListener("click", closeSheet);
sheetQuery.addEventListener?.("change", () => !sheetQuery.matches && closeSheet());
document.addEventListener("keydown", (event) => {
  if (!els.panel.classList.contains("open") || document.querySelector("#adultGate[open]")) return;
  if (event.key === "Escape") closeSheet();
  if (event.key !== "Tab") return;
  const focusable = [...els.panel.querySelectorAll("button, input, select")].filter((el) => !el.disabled && el.offsetParent !== null);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
let touchStartY = null;
els.panel.querySelector(".filters-head").addEventListener("touchstart", (event) => (touchStartY = event.touches[0].clientY), { passive: true });
els.panel.querySelector(".filters-head").addEventListener("touchend", (event) => {
  if (touchStartY != null && event.changedTouches[0].clientY - touchStartY > 80) closeSheet();
  touchStartY = null;
}, { passive: true });

/* ---------- Events ---------- */

function update(changes = {}, options) {
  Object.assign(state, changes);
  if (!("page" in changes)) state.page = 1;
  render(options);
}

function resetAll() {
  D.setAdultAllowed(false);
  state.type = "all";
  state.tier = "all";
  state.genres = new Set();
  state.sale = "";
  state.q = "";
  els.search.value = "";
  els.minPrice.value = 0;
  els.maxPrice.value = SLIDER_MAX;
  update();
  D.toast(t("toast.reset"));
}

els.adult.addEventListener("change", async () => {
  const requested = els.adult.checked;
  els.adult.checked = D.adultAllowed();
  if (!requested) D.setAdultAllowed(false);
  else await D.requestAdult();
  syncControls();
});
document.addEventListener("adultcontentchange", () => {
  if (!catalog.length) return;
  buildGenres();
  buildEvents();
  buildStats();
  update();
});

let searchTimer;
els.search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => update({ q: els.search.value.trim() }), 120);
});
els.search.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && els.search.value) {
    els.search.value = "";
    update({ q: "" });
  }
});
els.sorts.forEach((select) => select.addEventListener("change", () => update({ sort: select.value })));
els.pageSize.addEventListener("change", () => update({ size: Number(els.pageSize.value) }, { scroll: true }));
els.views.forEach((button) => button.addEventListener("click", () => {
  try { localStorage.setItem(LAYOUT_KEY, button.dataset.view); } catch {}
  update({ view: button.dataset.view, page: state.page });
}));
els.types.forEach((button) => button.addEventListener("click", () => update({ type: button.dataset.type })));
els.tiers.forEach((button) => button.addEventListener("click", () => update({ tier: button.dataset.tier })));
els.genreList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-genre]");
  if (!button) return;
  const genres = new Set(state.genres);
  genres.has(button.dataset.genre) ? genres.delete(button.dataset.genre) : genres.add(button.dataset.genre);
  update({ genres });
});
els.eventList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-sale]");
  if (!button) return;
  update({ sale: state.sale === button.dataset.sale ? "" : button.dataset.sale });
  document.querySelector("#browse").scrollIntoView({ block: "start", behavior: D.reducedMotion.matches ? "auto" : "smooth" });
});
let priceTimer;
[els.minPrice, els.maxPrice].forEach((input) => input.addEventListener("input", () => {
  updatePriceUI();
  clearTimeout(priceTimer);
  priceTimer = setTimeout(() => update(), 90);
}));
els.reset.addEventListener("click", resetAll);
els.emptyReset.addEventListener("click", resetAll);
els.pills.addEventListener("click", (event) => {
  const key = event.target.closest("[data-remove]")?.dataset.remove;
  if (!key) return;
  if (key === "type") state.type = "all";
  if (key === "tier") state.tier = "all";
  if (key === "sale") state.sale = "";
  if (key === "q") {
    state.q = "";
    els.search.value = "";
  }
  if (key === "price") {
    els.minPrice.value = 0;
    els.maxPrice.value = SLIDER_MAX;
  }
  if (key.startsWith("genre:")) {
    state.genres = new Set(state.genres);
    state.genres.delete(key.slice(6));
  }
  update();
});
els.prevPage.addEventListener("click", () => update({ page: state.page - 1 }, { scroll: true }));
els.nextPage.addEventListener("click", () => update({ page: state.page + 1 }, { scroll: true }));
els.pageNumbers.addEventListener("click", (event) => {
  const button = event.target.closest("[data-page]");
  if (button) update({ page: Number(button.dataset.page) }, { scroll: true });
});
document.addEventListener("keydown", (event) => {
  const tag = document.activeElement?.tagName;
  if (event.key === "/" && !["INPUT", "SELECT", "TEXTAREA"].includes(tag) && !document.querySelector("dialog[open]")) {
    event.preventDefault();
    els.search.focus();
  }
});
document.addEventListener("currencychange", () => {
  buildStats();
  render();
});
addEventListener("popstate", () => {
  restoreFromUrl();
  render();
});

/* ---------- Price notice ---------- */

const NOTICE_KEY = "discounted:hide-price-notice";
const notice = document.querySelector("#priceNotice");

function openNotice() {
  let dismissed = false;
  try { dismissed = localStorage.getItem(NOTICE_KEY) === "1"; } catch {}
  if (!dismissed && notice?.showModal) notice.showModal();
}
document.querySelector("#noticeClose")?.addEventListener("click", () => notice.close());
document.querySelector("#noticeNever")?.addEventListener("click", () => {
  try { localStorage.setItem(NOTICE_KEY, "1"); } catch {}
  notice.close();
});

/* ---------- Boot ---------- */

els.products.innerHTML = Array.from({ length: 8 }, () => '<div class="deal deal-skeleton" aria-hidden="true"><div class="deal-art"></div><div class="deal-body"><i></i><i></i><i></i></div></div>').join("");

// Requests cancelled by navigating away are not failures worth reporting.
let leaving = false;
addEventListener("pagehide", () => (leaving = true));

async function boot() {
  buildSortOptions();
  syncControls();
  try {
    const [data] = await Promise.all([D.loadCatalog(), D.loadRates()]);
    catalog = data.items;
    meta = data.meta;
    byKey = new Map(catalog.map((item) => [D.routeId(item), item]));
    maxUSD = Math.max(5, Math.ceil(catalog.reduce((max, item) => Math.max(max, item.sale_price), 0) / 5) * 5);
    D.mountCurrency();
    buildGenres();
    buildEvents();
    buildStats();
    restoreFromUrl();
    render();
  } catch (error) {
    if (leaving) return;
    console.error("Failed to load catalog", error);
    els.products.innerHTML = "";
    els.products.setAttribute("aria-busy", "false");
    els.resultsTitle.textContent = t("results.unavailable");
    els.error.hidden = false;
    els.events.hidden = true;
    document.querySelector(".pager-bar").hidden = true;
  }
}

addEventListener("pageshow", () => {
  if (!location.hash && !location.search) requestAnimationFrame(() => scrollTo(0, 0));
});
openNotice();
boot();
