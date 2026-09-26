export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`FX upstream returned ${response.status}`);
    }

    const data = await response.json();

    if (data.result !== 'success' || !data.rates) {
      throw new Error('FX upstream returned an invalid payload');
    }

    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');

    return res.status(200).json({
      base: 'USD',
      updated_at: data.time_last_update_utc || null,
      rates: data.rates
    });
  } catch (error) {
    console.error('fx error', error);

    return res.status(200).json({
      base: 'USD',
      updated_at: null,
      fallback: true,
      rates: {
        USD: 1,
        EUR: 0.86,
        GBP: 0.74,
        SAR: 3.75,
        AED: 3.6725,
        JPY: 158,
        CAD: 1.40,
        AUD: 1.42
      }
    });
  }
}
