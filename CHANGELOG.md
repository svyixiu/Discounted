# Changelog

## Redesign: charcoal, cream and the tag

Rebuilt the visual system and page composition from scratch.

- **Identity.** A new logo: a D-shaped price tag with a punched hole, used as the mark, favicon, touch icon, outlined lockup and social card. The cream "tag" panel with its punched hole carries the brand across the intro, the product price panel, the price notice and the 404 page.
- **Type and color.** Archivo (with a condensed display cut) and IBM Plex Sans Arabic, self-hosted, replace Space Grotesk, the system serif and the default sans. One accent color, lime, is reserved for discounts.
- **Home.** Removed the rotating featured card, fan cards, "Today's pick" and the auto-scrolling deep-discount shelf, which repeated the same few titles. Replaced them with a compact intro and a row of named sale events that filter the catalog. Search and the first cards now sit inside the first screen: search at 734px and the first card at 870px on a 1440×900 desktop, versus 1,684px and 1,923px before; and 612px and 740px on a 390px phone, versus 1,863px and 2,141px.
- **Catalog.** Cards are a single link with art, title, sale or genre, price and deadline; the per-card Steam/Copy buttons and "Checking…" placeholders are gone. Search stays pinned while scrolling. Filters use a left rail on desktop and a bottom sheet on phones and tablets (the old floating button overlapped content). Grid and list layouts; two columns on phones.
- **Filters.** Type counts reflect the other active filters. Genre chips no longer truncate. The price slider is quadratic and snaps to round prices. Added a sale-event filter, a "Featured" default sort and an "Ending soonest" sort. Page sizes are 24/48/96 so grids fill evenly.
- **Product page.** Title first, art beside a cream price tag with the discount, savings, deadline, Steam and copy actions, and where the price was recorded. Genres and the sale event link back into filtered catalog views. "More like this" is a grid, not an overflowing row.
- **Arabic.** Key-based translations cover every interface string, including ones the old text-matching approach missed. Added Arabic plural forms, localized dates and relative times, Latin digits, right-aligned Latin titles and a mirrored layout. Fixed the horizontal overflow in RTL.
- **Popularity.** Top-seller detection now reads Steam's weekly top-sellers service (revenue-ranked), with the chart page as a fallback and a sanity check on the result. Cards show review counts only when they are known.
- **Removed.** The WebGL shader gradient and its CSS fallback, `theme.css`, `vault.js` (replaced by `common.js`), digit-flip, count-up, list reflow and entrance animations, and the Space Grotesk font.
- **Unchanged.** `games.json` and its schema, `api/fx.js`, `api/steam-thumb.js`, `api/steam-specials.js` and the Vercel routes.

## Validation

Checked in headless Chromium against a local server that mirrors the Vercel routes (95 automated checks):

- Search, type/discount/genre/sale filters, every sort order, the price range (including RTL), pagination, list/grid view, URL restore, legacy parameters and links, clean product routes, the back link carrying filters, currency persistence, the price notice, the 404 page and random deal, the mobile filter sheet (focus trap, Escape, backdrop) and reduced motion.
- Arabic: `dir`/`lang`, no untranslated interface text, Arabic plurals, Arabic genre search, currency order and RTL alignment.
- No horizontal overflow on the home, list, product, How it works and 404 pages at 320, 360, 390, 768, 1024, 1280 and 1440px in both languages.

Not verified here: Steam's CDN and APIs are blocked in the build sandbox, so artwork was stood in with placeholder images and the popularity labels were exercised with stubbed Steam responses. Check real artwork, live review counts and the top-sellers source on the Vercel preview.
