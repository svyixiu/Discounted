# Discounted

Static Steam deal catalog. No build step and no dependencies.

## Updating the catalog

Edit only `games.json`. The frontend reads every title, price, discount, sale group and expiry date from that file. **Steam App IDs are not required.** The website automatically generates a Steam search URL from each game title.

### Required fields per game

```json
{
  "title": "Game name",
  "original_price": 59.99,
  "sale_price": 14.99,
  "discount_percent": 75,
  "ends_at": "2026-10-01",
  "verified_by": "Steam offer page",
  "sale_group": "Weekend Deal"
}
```

Only the first five fields are needed for display/filtering. `verified_by` and `sale_group` are provenance metadata for audits.

## Steam links

Every **Find on Steam** button is generated as:

```text
https://store.steampowered.com/search/?term=<URL-encoded game title>
```

This deliberately prioritizes catalog coverage over maintaining a separate App ID mapping.

## Deploying

Upload this directory to Vercel as a static project. `vercel.json` disables caching for `games.json` so a data-file swap becomes visible immediately.