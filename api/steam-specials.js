const GENRE_TAGS = new Map([
  [19, "Action"],
  [21, "Adventure"],
  [122, "RPG"],
  [9, "Strategy"],
  [599, "Simulation"],
  [597, "Casual"],
  [492, "Indie"],
  [699, "Racing"],
  [701, "Sports"],
  [128, "Massively Multiplayer"],
  [1664, "Puzzle"],
  [1667, "Horror"],
  [1662, "Survival"],
  [1695, "Open World"],
]);

function decode(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function numberFromPrice(value = "") {
  const cleaned = String(value).replace(/[^0-9.,]/g, "").replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function rowValue(row, className) {
  const rx = new RegExp(
    '<div[^>]*class="[^"]*' + className + '[^"]*"[^>]*>([\\s\\S]*?)<\\/div>',
    "i",
  );
  return decode(row.match(rx)?.[1] || "");
}

function rowGenres(row) {
  const raw = row.match(/data-ds-tagids="([^"]+)"/i)?.[1];
  if (!raw) return [];
  try {
    const ids = JSON.parse(raw.replace(/&quot;/g, '"'));
    return [...new Set(ids.map(Number).map((id) => GENRE_TAGS.get(id)).filter(Boolean))];
  } catch {
    return [];
  }
}

function parseRows(html = "") {
  const rows =
    String(html).match(
      /<a[^>]*class="search_result_row[^"]*"[^>]*>[\s\S]*?<\/a>/gi,
    ) || [];

  return rows
    .map((row) => {
      const appid =
        row.match(/data-ds-appid="(\d+)"/i)?.[1] ||
        row.match(/\/app\/(\d+)\//i)?.[1];

      const rawTitle = row.match(
        /<span[^>]*class="title"[^>]*>([\s\S]*?)<\/span>/i,
      )?.[1];

      const discountText =
        rowValue(row, "discount_pct") || row.match(/-(\d+)%/)?.[0] || "";
      const discount = Number(discountText.replace(/[^0-9]/g, ""));

      const original = numberFromPrice(rowValue(row, "discount_original_price"));
      const final = numberFromPrice(rowValue(row, "discount_final_price"));

      const image = row.match(/<img[^>]+src="([^"]+)"/i)?.[1]?.replace(/&amp;/g, "&");

      if (
        !appid ||
        !rawTitle ||
        !Number.isFinite(discount) ||
        discount <= 0 ||
        original == null ||
        final == null
      ) {
        return null;
      }

      return {
        steam_appid: Number(appid),
        title: decode(rawTitle),
        type: "game",
        genres: rowGenres(row),
        original_price: original,
        sale_price: final,
        discount_percent: discount,
        thumbnail_url: image || null,
        source_url: `https://store.steampowered.com/app/${appid}/`,
        verified_by: "Steam specials search",
      };
    })
    .filter(Boolean);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const start = Math.max(0, Number(req.query.start) || 0);
  const count = 50;
  const pages = Math.min(20, Math.max(1, Number(req.query.pages) || 1));

  try {
    const fetchPage = async (pageStart) => {
      const url = new URL("https://store.steampowered.com/search/results/");
      url.searchParams.set("query", "");
      url.searchParams.set("start", String(pageStart));
      url.searchParams.set("count", String(count));
      url.searchParams.set("dynamic_data", "");
      url.searchParams.set("sort_by", "_ASC");
      url.searchParams.set("specials", "1");
      url.searchParams.set("category1", "998");
      url.searchParams.set("infinite", "1");
      url.searchParams.set("cc", "US");
      url.searchParams.set("l", "english");

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; Discounted/1.0; +https://github.com/svyixiu/Discounted)",
          "Accept-Language": "en-US,en;q=0.9",
          Accept: "application/json,text/plain,*/*",
        },
      });

      if (!response.ok) {
        throw new Error(`Steam specials search failed: ${response.status}`);
      }

      return response.json();
    };

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const payloads = [];

    for (let i = 0; i < pages; i += 1) {
      const pageStart = start + i * count;
      let payload = null;
      let lastError = null;

      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          payload = await fetchPage(pageStart);
          break;
        } catch (error) {
          lastError = error;
          await sleep(2000 * (attempt + 1));
        }
      }

      if (!payload) throw lastError || new Error("Steam page fetch failed");
      payloads.push(payload);
      if (i + 1 < pages) await sleep(850);
    }

    const items = payloads.flatMap((payload) =>
      parseRows(payload.results_html || ""),
    );
    const totalCount = Number(payloads[0]?.total_count) || null;

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=900",
    );

    return res.status(200).json({
      start,
      count,
      pages,
      total_count: totalCount,
      returned: items.length,
      items,
    });
  } catch (error) {
    console.error("steam-specials error", error);
    return res.status(500).json({ error: "Steam specials lookup failed" });
  }
}
