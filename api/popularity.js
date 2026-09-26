const reviewCache = new Map();
let chartCache = { expires: 0, ids: new Set() };

async function reviewsFor(id) {
  const cached = reviewCache.get(id);
  if (cached && cached.expires > Date.now()) return cached.value;
  const url = new URL(`https://store.steampowered.com/appreviews/${id}`);
  url.searchParams.set("json", "1");
  url.searchParams.set("language", "all");
  url.searchParams.set("purchase_type", "all");
  url.searchParams.set("num_per_page", "0");
  const response = await fetch(url, {
    signal: AbortSignal.timeout(5000),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Discounted/1.0)" },
  });
  if (!response.ok) throw new Error(`Steam reviews ${response.status}`);
  const body = await response.json();
  const total = Number(body?.query_summary?.total_reviews);
  const value = body.success === 1 && Number.isFinite(total) ? Math.max(0, total) : null;
  reviewCache.set(id, { value, expires: Date.now() + 6 * 60 * 60 * 1000 });
  return value;
}

async function topSellers() {
  if (chartCache.expires > Date.now()) return chartCache.ids;
  try {
    const response = await fetch("https://store.steampowered.com/charts/topselling/global", {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Discounted/1.0)" },
    });
    if (!response.ok) throw new Error("Chart unavailable");
    const html = await response.text();
    // Only accept app links inside the chart table; other page links can be recommendations.
    const chartRows = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];
    const ids = new Set(chartRows.map((row) => Number(row.match(/\/app\/(\d+)\//)?.[1])).filter(Boolean));
    if (ids.size >= 20 && ids.size <= 100) chartCache = { ids, expires: Date.now() + 30 * 60 * 1000 };
  } catch { /* Review counts remain useful when the chart is unavailable. */ }
  chartCache.expires = Date.now() + 30 * 60 * 1000;
  return chartCache.ids;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const ids = [...new Set(String(req.query.ids || "").split(",").map(Number))]
    .filter((id) => Number.isSafeInteger(id) && id > 0).slice(0, 30);
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
  for (const id of ids) items[id].topSeller = chart.has(id);
  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=3600");
  return res.status(200).json({ items, metric: "Steam review count; top seller is Steam's revenue chart" });
}
