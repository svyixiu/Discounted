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
        original_price: original,
        sale_price: final,
        discount_percent: discount,
        thumbnail_url: image || null,
      };
    })
    .filter(Boolean);
}

async function appDetails(appid) {
  try {
    const url = new URL("https://store.steampowered.com/api/appdetails");
    url.searchParams.set("appids", String(appid));
    url.searchParams.set("cc", "US");
    url.searchParams.set("l", "english");

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Discounted/1.0; +https://github.com/svyixiu/Discounted)",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) return null;
    const payload = await response.json();
    const entry = payload?.[String(appid)];
    if (!entry?.success || !entry.data) return null;

    const data = entry.data;
    return {
      type: String(data.type || "").toLowerCase(),
      genres: Array.isArray(data.genres)
        ? data.genres.map((genre) => genre?.description).filter(Boolean)
        : [],
      canonical_title: data.name || null,
    };
  } catch {
    return null;
  }
}

async function mapConcurrent(items, limit, worker) {
  const result = new Array(items.length);
  let next = 0;

  async function run() {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      result[index] = await worker(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => run()),
  );
  return result;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const start = Math.max(0, Number(req.query.start) || 0);
  const count = Math.min(50, Math.max(1, Number(req.query.count) || 50));

  try {
    const url = new URL("https://store.steampowered.com/search/results/");
    url.searchParams.set("query", "");
    url.searchParams.set("start", String(start));
    url.searchParams.set("count", String(count));
    url.searchParams.set("dynamic_data", "");
    url.searchParams.set("sort_by", "_ASC");
    url.searchParams.set("specials", "1");
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
      return res.status(502).json({
        error: "Steam specials search failed",
        status: response.status,
      });
    }

    const payload = await response.json();
    const items = parseRows(payload.results_html || "");

    const enriched = await mapConcurrent(items, 10, async (item) => {
      const details = await appDetails(item.steam_appid);
      return {
        ...item,
        type:
          details?.type === "dlc"
            ? "dlc"
            : details?.type === "game"
              ? "game"
              : details?.type || "other",
        genres: details?.genres || [],
        canonical_title: details?.canonical_title || item.title,
        source_url: `https://store.steampowered.com/app/${item.steam_appid}/`,
        verified_by: "Steam specials search",
      };
    });

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=900",
    );

    return res.status(200).json({
      start,
      count,
      total_count: Number(payload.total_count) || null,
      returned: enriched.length,
      items: enriched,
    });
  } catch (error) {
    console.error("steam-specials error", error);
    return res.status(500).json({ error: "Steam specials lookup failed" });
  }
}
