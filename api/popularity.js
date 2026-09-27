// Popularity signals for the visible catalog page.
// - reviews: Steam's total user review count. It shows recognition, not copies sold.
// - topSeller: the app is on Steam's top-sellers chart, which Steam ranks by gross revenue.
// Discounted never estimates sales. If a source is unavailable the value is unknown, not zero.

const reviewCache = new Map();
let chartCache = { expires: 0, ids: new Set(), source: null };
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; Discounted/1.0)" };

async function reviewsFor(id) {
  const cached = reviewCache.get(id);
  if (cached && cached.expires > Date.now()) return cached.value;
  const url = new URL(`https://store.steampowered.com/appreviews/${id}`);
  url.searchParams.set("json", "1");
  url.searchParams.set("language", "all");
  url.searchParams.set("purchase_type", "all");
  url.searchParams.set("num_per_page", "0");
  const response = await fetch(url, { signal: AbortSignal.timeout(5000), headers: HEADERS });
  if (!response.ok) throw new Error(`Steam reviews ${response.status}`);
  const body = await response.json();
  const total = Number(body?.query_summary?.total_reviews);
  const value = body.success === 1 && Number.isFinite(total) ? Math.max(0, total) : null;
  reviewCache.set(id, { value, expires: Date.now() + 6 * 60 * 60 * 1000 });
  return value;
}

// A believable chart has between 20 and 100 distinct app ids; anything else is treated as unavailable.
const plausible = (ids) => ids.size >= 20 && ids.size <= 100;

// Steam's weekly top sellers (the data behind store.steampowered.com/charts/topsellers), ranked by revenue.
async function weeklyTopSellers() {
  const input = { country_code: "US", context: { language: "english", country_code: "US", steam_realm: 1 }, page_start: 0, page_count: 100 };
  const url = `https://api.steampowered.com/IStoreTopSellersService/GetWeeklyTopSellers/v1/?input_json=${encodeURIComponent(JSON.stringify(input))}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(5000), headers: HEADERS });
  if (!response.ok) throw new Error(`Top sellers ${response.status}`);
  const body = await response.json();
  const ranks = Array.isArray(body?.response?.ranks) ? body.response.ranks : [];
  return new Set(ranks.map((row) => Number(row?.appid)).filter((id) => Number.isSafeInteger(id) && id > 0));
}

// Fallback: app links inside the rows of the server-rendered chart table, when Steam provides one.
async function chartPageTopSellers() {
  const response = await fetch("https://store.steampowered.com/charts/topselling/global", { signal: AbortSignal.timeout(5000), headers: HEADERS });
  if (!response.ok) throw new Error("Chart unavailable");
  const html = await response.text();
  const rows = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];
  return new Set(rows.map((row) => Number(row.match(/\/app\/(\d+)\//)?.[1])).filter(Boolean));
}

async function topSellers() {
  if (chartCache.expires > Date.now()) return chartCache;
  for (const [source, load] of [["weekly-top-sellers", weeklyTopSellers], ["top-selling-chart", chartPageTopSellers]]) {
    try {
      const ids = await load();
      if (plausible(ids)) {
        chartCache = { ids, source, expires: Date.now() + 30 * 60 * 1000 };
        return chartCache;
      }
    } catch { /* Try the next source; review counts stay useful without either. */ }
  }
  // Without a verified chart nobody is labelled a top seller. Retry in ten minutes.
  chartCache = { ids: new Set(), source: null, expires: Date.now() + 10 * 60 * 1000 };
  return chartCache;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const ids = [...new Set(String(req.query.ids || "").split(",").map(Number))]
    .filter((id) => Number.isSafeInteger(id) && id > 0)
    .slice(0, 30);
  if (!ids.length) return res.status(400).json({ error: "Provide Steam app IDs" });
  const chartPromise = topSellers();
  const items = {};
  // One failed title does not hide the rest of the visible page.
  await Promise.all(ids.map(async (id) => {
    let reviews = null;
    try { reviews = await reviewsFor(id); } catch { /* Unknown, not zero. */ }
    items[id] = { reviews };
  }));
  const chart = await chartPromise;
  for (const id of ids) items[id].topSeller = chart.ids.has(id);
  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=3600");
  return res.status(200).json({
    items,
    metric: "reviews = Steam user review count (recognition, not sales); topSeller = on Steam's revenue-ranked top-sellers chart",
    chart: chart.source,
  });
}
