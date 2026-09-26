# Discounted

A static, JSON-driven Steam sale browser.

## Structure

- `index.html` — application shell
- `styles.css` — neobrutalist visual system
- `script.js` — search, tabs, sorting, dual budget slider and rendering
- `games.json` — the catalog
- `vercel.json` — Vercel static configuration

## Catalog schema

Each product is a JSON object:

```json
{
  "title": "Example Game",
  "type": "game",
  "original_price": 29.99,
  "sale_price": 7.49,
  "discount_percent": 75,
  "ends_at": "2026-10-01",
  "verified_by": "Steam offer page",
  "sale_group": "Example promotion"
}
```

`type` supports:

- `game`
- `dlc`
- `bundle`
- `other`

If `type` is omitted, the frontend treats the entry as `game` for backwards compatibility.

Steam links are generated from the product title and open a Steam search page, so App IDs are not required.

## Updating the sale

Update or replace `games.json`. No frontend edits are required when adding more products, changing categories, prices or discounts.

The UI automatically recalculates tab counts, the maximum budget slider value, cheapest price and biggest discount.