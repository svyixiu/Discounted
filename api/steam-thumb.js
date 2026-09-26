const STEAM_SEARCH = 'https://store.steampowered.com/search/';

function normalize(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&[^;]+;/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function decode(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]*>/g, '')
    .trim();
}

function scoreTitle(query, candidate) {
  const q = normalize(query);
  const c = normalize(candidate);

  if (!q || !c) return 0;
  if (q === c) return 100;
  if (c.startsWith(q) || q.startsWith(c)) return 82;
  if (c.includes(q) || q.includes(c)) return 72;

  const qWords = new Set(q.split(' '));
  const cWords = new Set(c.split(' '));
  let overlap = 0;

  qWords.forEach(word => {
    if (word.length > 1 && cWords.has(word)) overlap += 1;
  });

  return overlap / Math.max(qWords.size, 1) * 60;
}

function validSteamImage(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && /steamstatic\.com$/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const title = String(req.query.title || '').trim().slice(0, 140);

  if (!title) {
    return res.status(400).json({ error: 'Missing title' });
  }

  try {
    const url = new URL(STEAM_SEARCH);
    url.searchParams.set('term', title);
    url.searchParams.set('cc', 'US');
    url.searchParams.set('l', 'english');

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Discounted/1.0; +https://github.com/svyixiu/Discounted)',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Steam search failed' });
    }

    const html = await response.text();
    const rows = html.match(/<a[^>]*class="search_result_row[^"]*"[^>]*>[\s\S]*?<\/a>/gi) || [];

    let best = null;

    for (const row of rows.slice(0, 12)) {
      const appid =
        row.match(/data-ds-appid="(\d+)"/i)?.[1]
        || row.match(/\/app\/(\d+)\//i)?.[1];

      const rawTitle = row.match(/<span[^>]*class="title"[^>]*>([\s\S]*?)<\/span>/i)?.[1];
      const rawImage = row.match(/<img[^>]+src="([^"]+)"/i)?.[1];

      if (!appid || !rawTitle) continue;

      const candidateTitle = decode(rawTitle);
      const score = scoreTitle(title, candidateTitle);

      if (!best || score > best.score) {
        const searchImage = rawImage ? rawImage.replace(/&amp;/g, '&') : null;

        best = {
          appid,
          title: candidateTitle,
          score,
          thumbnail_url: `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`,
          fallback_url: validSteamImage(searchImage) ? searchImage : null
        };
      }
    }

    res.setHeader('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=2592000');

    if (!best || best.score < 36) {
      return res.status(404).json({ error: 'No confident Steam match' });
    }

    return res.status(200).json(best);
  } catch (error) {
    console.error('steam-thumb error', error);
    return res.status(500).json({ error: 'Thumbnail lookup failed' });
  }
}
