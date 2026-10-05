/* Product page: one deal, its recorded price and similar deals. */
const D = window.Discounted;
const { t, escapeHtml } = D;

const els = {
  loading: document.querySelector("#productLoading"),
  view: document.querySelector("#productView"),
  missing: document.querySelector("#missingProduct"),
  kicker: document.querySelector("#productKicker"),
  title: document.querySelector("#productTitle"),
  image: document.querySelector("#productImage"),
  cut: document.querySelector("#productCut"),
  price: document.querySelector("#productPrice"),
  was: document.querySelector("#productWas"),
  save: document.querySelector("#productSave"),
  ends: document.querySelector("#productEnds"),
  steam: document.querySelector("#steamButton"),
  recorded: document.querySelector("#productRecorded"),
  genresRow: document.querySelector("#genresRow"),
  genres: document.querySelector("#productGenres"),
  saleRow: document.querySelector("#saleRow"),
  sale: document.querySelector("#productSale"),
  reviewsRow: document.querySelector("#reviewsRow"),
  reviews: document.querySelector("#productReviews"),
  more: document.querySelector("#recommendations"),
  moreGrid: document.querySelector("#recommendGrid"),
};

let catalog = [];
let meta = {};
let product = null;

/* ---------- Recommendations: same franchise first, then shared sale and title words ---------- */

const STOP_WORDS = new Set(["the", "of", "and", "a", "an", "edition", "deluxe", "ultimate", "complete", "pack", "pass", "dlc", "hd", "remastered", "windows"]);
const FAMILIES = [
  ["far cry", /^far cry/i], ["assassins creed", /^assassin['’]?s creed/i], ["final fantasy", /^final fantasy/i],
  ["kingdom hearts", /^kingdom hearts/i], ["the crew", /^the crew/i], ["ghost recon", /ghost recon/i],
  ["star wars outlaws", /^star wars outlaws/i], ["watch dogs", /^watch[_ ]?dogs/i], ["prince of persia", /^prince of persia/i],
  ["rainbow six", /rainbow six/i], ["splinter cell", /splinter cell/i], ["anno", /^anno/i], ["trackmania", /^trackmania/i],
  ["south park", /^south park/i],
];

const tokens = (title) => String(title).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter((w) => w.length > 1 && !STOP_WORDS.has(w));
const family = (title) => FAMILIES.find(([, rx]) => rx.test(title))?.[0] || null;

function relationScore(current, candidate) {
  if (current === candidate || current.title === candidate.title) return -Infinity;
  let score = 0;
  const currentFamily = family(current.title);
  const sameFamily = currentFamily && currentFamily === family(candidate.title);
  if (sameFamily) score += 120;
  if (current.sale_group && current.sale_group === candidate.sale_group && D.isNamedSale(current.sale_group)) score += 24;
  const words = new Set(tokens(current.title));
  score += tokens(candidate.title).filter((w) => words.has(w)).length * 12;
  if (sameFamily && current.type !== candidate.type) score += candidate.type === "bundle" ? 14 : 18;
  const sharedGenres = candidate.genres.filter((g) => current.genres.includes(g)).length;
  score += sharedGenres * 3;
  score += Math.min(candidate.discount_percent, 90) / 15;
  return score;
}

function recommendationsFor(item) {
  const ranked = catalog.filter(D.canShow)
    .map((candidate) => ({ candidate, score: relationScore(item, candidate) }))
    .filter((entry) => entry.score > 12)
    .sort((a, b) => b.score - a.score || b.candidate.discount_percent - a.candidate.discount_percent || a.candidate.title.localeCompare(b.candidate.title));
  const selected = [];
  const take = (type, limit) => {
    for (const { candidate } of ranked) {
      if (selected.length >= 8 || limit <= 0) break;
      if (candidate.type !== type || selected.includes(candidate)) continue;
      selected.push(candidate);
      limit -= 1;
    }
  };
  take("game", 4);
  take("dlc", 2);
  take("bundle", 2);
  for (const { candidate } of ranked) {
    if (selected.length >= 8) break;
    if (!selected.includes(candidate)) selected.push(candidate);
  }
  // Titles with nothing close by still get a short row of deals from the same genres.
  if (selected.length < 4 && item.genres.length) {
    const fallback = catalog.filter(D.canShow)
      .filter((candidate) => candidate !== item && !selected.includes(candidate) && candidate.type === item.type)
      .map((candidate) => ({ candidate, shared: candidate.genres.filter((g) => item.genres.includes(g)).length }))
      .filter((entry) => entry.shared > 0)
      .sort((a, b) => b.shared - a.shared || D.isNamedSale(b.candidate.sale_group) - D.isNamedSale(a.candidate.sale_group) || b.candidate.discount_percent - a.candidate.discount_percent || a.candidate.title.localeCompare(b.candidate.title));
    for (const { candidate } of fallback) {
      if (selected.length >= 4) break;
      selected.push(candidate);
    }
  }
  return selected;
}

/* ---------- Rendering ---------- */

function renderPrices() {
  const saved = Math.max(0, product.original_price - product.sale_price);
  els.cut.textContent = `−${product.discount_percent}%`;
  els.price.textContent = D.money(product.sale_price);
  els.was.textContent = D.money(product.original_price);
  els.was.setAttribute("aria-label", t("product.was", { price: D.money(product.original_price) }));
  els.save.textContent = t("product.save", { amount: D.money(saved) });
  const updated = I18n.date(meta.updated_at, { month: "short", day: "numeric", year: "numeric" });
  const source = product.verified_by ? escapeHtml(product.verified_by) : "";
  const sourceHtml = source && /^https:\/\//.test(product.source_url || "")
    ? `<a href="${escapeHtml(product.source_url)}" target="_blank" rel="noopener noreferrer">${source}</a>`
    : source;
  els.recorded.innerHTML = updated
    ? sourceHtml ? escapeHtml(t("product.recorded", { date: updated, source: "\u0000" })).replace("\u0000", sourceHtml) : escapeHtml(t("product.recordedNoSource", { date: updated }))
    : "";
  els.recorded.hidden = !updated;
}

function renderEnds() {
  const end = D.endTime(product.ends_at);
  els.ends.classList.remove("soon", "ended");
  if (!Number.isFinite(end)) {
    els.ends.textContent = t("product.noEnd");
    return;
  }
  const left = end - Date.now();
  if (left <= 0) {
    els.ends.textContent = t("product.ended");
    els.ends.classList.add("ended");
    return;
  }
  const hasTime = /T/.test(product.ends_at);
  const date = I18n.date(end, hasTime
    ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: undefined, timeZoneName: "short" }
    : { month: "short", day: "numeric", year: "numeric" });
  els.ends.innerHTML = `<span>${escapeHtml(t("product.ends", { date }))}</span><b>${escapeHtml(I18n.relative(left))}</b>`;
  els.ends.classList.toggle("soon", left < 172800000);
}

function renderReviews() {
  const id = product.steam_appid;
  if (!Number.isSafeInteger(id)) return;
  els.reviewsRow.hidden = false;
  els.reviews.innerHTML = `<span class="muted">…</span>`;
  D.loadPopularity([id]).then(() => {
    const result = D.popularity.get(id);
    if (!result || (result.reviews == null && !result.topSeller)) {
      els.reviews.innerHTML = `<span class="muted">${escapeHtml(t("product.reviewsUnknown"))}</span>`;
      return;
    }
    els.reviews.innerHTML = `<span class="deal-pop">${D.popularityMarkup(id, { long: true })}</span>`;
  });
}

function renderRecommendations() {
  const items = recommendationsFor(product);
  els.more.hidden = !items.length;
  els.moreGrid.innerHTML = items.map((item) => D.dealCard(item)).join("");
  D.hydrateArt(els.moreGrid, new Map(items.map((item) => [D.routeId(item), item])));
  D.loadPopularity(items.map((item) => item.steam_appid)).then(() => D.paintPopularity(els.moreGrid));
}

async function renderProduct() {
  if (!D.canShow(product)) {
    els.loading.hidden = true;
    els.view.hidden = true;
    els.more.hidden = true;
    els.moreGrid.innerHTML = "";
    els.image.removeAttribute("src");
    let gate = document.querySelector("#adultProductGate");
    if (!gate) {
      gate = document.createElement("section");
      gate.id = "adultProductGate";
      gate.className = "adult-product-gate";
      els.view.before(gate);
    }
    document.title = `${t("adult.title")} — Discounted`;
    gate.innerHTML = `<h1>${escapeHtml(t("adult.title"))}</h1><p>${escapeHtml(t("adult.hidden"))}</p>
      <button class="button button-primary" type="button">${escapeHtml(t("adult.show"))}</button>`;
    gate.querySelector("button").addEventListener("click", () => D.requestAdult());
    return;
  }
  document.querySelector("#adultProductGate")?.remove();
  document.title = `${product.title} — Discounted`;
  const kicker = [t(`kind.${product.type}`)];
  if (D.isNamedSale(product.sale_group)) kicker.push(product.sale_group);
  els.kicker.textContent = kicker.join(" · ");
  els.title.textContent = product.title;
  els.steam.href = D.steamUrl(product);
  document.querySelector("[data-copy]").dataset.copy = location.origin + D.productUrl(product);

  renderPrices();
  renderEnds();
  renderReviews();

  els.genresRow.hidden = !product.genres.length;
  els.genres.innerHTML = product.genres
    .map((genre) => `<a class="chip" href="/?genres=${encodeURIComponent(genre)}#browse">${escapeHtml(I18n.genre(genre))}</a>`)
    .join("");
  const named = D.isNamedSale(product.sale_group);
  els.saleRow.hidden = !product.sale_group;
  els.sale.innerHTML = named
    ? `<a href="/?sale=${encodeURIComponent(product.sale_group)}#browse" dir="auto">${escapeHtml(product.sale_group)}</a>`
    : `<span dir="auto">${escapeHtml(product.sale_group || "")}</span>`;

  const art = D.artUrl(product);
  if (art) D.setArt(els.image, art);
  else D.lookupArt(product).then((data) => data && D.canShow(product) && D.setArt(els.image, data.thumbnail_url, data.fallback_url));

  els.loading.hidden = true;
  els.view.hidden = false;
  renderRecommendations();
}

function showMissing() {
  els.loading.hidden = true;
  els.missing.hidden = false;
}

// Requests cancelled by navigating away are not failures worth reporting.
let leaving = false;
addEventListener("pagehide", () => (leaving = true));

async function boot() {
  const params = new URLSearchParams(location.search);
  const title = params.get("title");
  const route = location.pathname.match(/^\/(game|dlc|bundle|other)\/([^/?#]+)\/?$/i);

  let back = params.get("from");
  try { back ||= sessionStorage.getItem(D.FILTERS_KEY); } catch {}
  if (back && back.startsWith("?")) document.querySelector("#backLink").href = "/" + back + "#browse";

  if (!title && !route) return showMissing();

  try {
    const [data] = await Promise.all([D.loadCatalog(), D.loadRates()]);
    catalog = data.items;
    meta = data.meta;
    D.mountCurrency();
    if (route) {
      const type = D.normalizeType(route[1]);
      const id = decodeURIComponent(route[2]).toLowerCase();
      product = catalog.find((item) => item.type === type && D.routeId(item).toLowerCase() === id);
    } else {
      product = catalog.find((item) => item.title.toLocaleLowerCase() === title.toLocaleLowerCase());
    }
    if (!product) return showMissing();
    const canonical = D.productUrl(product);
    if (location.pathname !== canonical || location.search) history.replaceState(null, "", canonical);
    renderProduct();
  } catch (error) {
    if (leaving) return;
    console.error(error);
    showMissing();
  }
}

document.addEventListener("currencychange", () => {
  if (!product || !D.canShow(product)) return;
  renderPrices();
  renderRecommendations();
});

document.addEventListener("adultcontentchange", () => {
  if (product) renderProduct();
});

boot();
