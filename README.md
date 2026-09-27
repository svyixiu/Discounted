# Discounted

A static, build-free catalog of discounted Steam games, DLC and bundles, in English and Arabic. Edit `games.json` to add products; no frontend edits are needed. Vercel serves the pages and the small API handlers in `api/`.

## Run and deploy

Serve this directory with any static HTTP server. Use Vercel for `/api/fx`, `/api/popularity` and `/api/steam-thumb`, and for the clean product routes in `vercel.json`. A plain local server cannot run those handlers; without them the site falls back to approximate exchange rates and simply omits review counts. Prices are estimates; Steam is authoritative.

There is no install step, bundler, framework or production JavaScript dependency.

| File | Owns |
| --- | --- |
| `i18n.js` | English and Arabic strings, plural rules, number and date formatting, `dir`/`lang` |
| `common.js` | Catalog loading, routes, currency, artwork, popularity, the deal card, header controls |
| `script.js` | Catalog page: filters, sorting, URL state, filter sheet, price notice |
| `product.js` | Product page and recommendations |
| `styles.css` | The whole visual system |

## Design system

**Palette.** A charcoal page (`--bg` #1a1916) with cream text (`--text` #f2ece0). Cream panels (`--cream` #efe7d7) with charcoal ink are "tags": the intro, the product price panel, the price notice and the 404 page. Each tag has a punched hole, the same one that appears in the logo. The only accent is lime (`--lime` #cfdd7a), and it is reserved for discount percentages. No glow, gradients, glass or decorative motion.

**Type.** Archivo (variable weight and width) sets Latin text. Headlines use its condensed cut (`font-stretch: 78%`, weight 800). IBM Plex Sans Arabic sets Arabic text; Arabic headings drop the negative tracking and uppercase labels. Prices use tabular figures. Both fonts are self-hosted woff2 subsets under the SIL Open Font License (`assets/fonts/OFL.txt`); the Arabic and Latin-extended files only download when those characters appear.

**Logo.** The mark is a D-shaped price tag with a punched hole: the flat side and bowl read as a D, the hole makes it a tag. `assets/logo-mark.svg` is the cream mark, `favicon.svg` and `assets/discounted.svg` are the charcoal app tile, and `assets/logo-lockup.svg` is the mark with the wordmark converted to outlines (Archivo 800, 82% width).

**Layout.** Everything uses logical properties (`inset-inline-start`, `padding-inline-end`…), so Arabic mirrors without separate RTL styles. Latin titles inside Arabic pages keep `dir="auto"` and align right. Filters are a left rail at 1024px and wider and a bottom sheet below that. The catalog grid is two columns on phones.

## Behavior

- **URL state.** Parameters `type`, `tier`, `genres`, `sale`, `q`, `sort`, `view`, `size`, `page`, `min`, `max` encode the catalog; defaults are omitted, so the home page URL stays clean. Budget values are USD, independent of display currency. Product pages link back to the catalog with its filters.
- **Product URLs.** Products live at `/game/:id`, `/dlc/:id`, `/bundle/:id` and `/other/:id`. Legacy `/product.html?title=…` links resolve and replace themselves with the clean URL.
- **Sorting.** "Featured" (the default) lists deals from named sale events first, then the rest by discount. "Ending soonest" orders dated offers by deadline. The previous sort values (`az`, `za`, `cheap`, `expensive`, `discount`, `discount-low`, `savings`) still work.
- **Sale events.** Named promotions with at least eight listings and a future end date appear as filters above the catalog. Generic labels such as "Steam Specials" are excluded.
- **Price range.** The slider is quadratic, so the cheap end where most deals sit gets most of the track. Bounds snap to round values in the display currency.
- **Currencies.** USD, SAR, AED, EUR, GBP, CAD, AUD and JPY. The choice is remembered.
- **Deadlines.** Date-only end dates mean 00:00 UTC on that date. Cards show the date, or a relative time inside 48 hours, and refresh once a minute. Expired offers are labeled, not hidden.
- **Price notice.** First visit shows a dialog explaining that Steam has the final price. "Don't show again" remembers the choice.
- **Shortcuts.** `/` search, `G` `H` home, `R` random deal, `?` list of shortcuts, `Esc` closes panels.

## Popularity, honestly

`/api/popularity` returns two signals and the interface never goes beyond them:

- **Steam reviews:** the total user review count from Steam's review API. It shows how widely a game is known. It is not a count of copies sold.
- **Top seller:** set only when the app is on Steam's top-sellers chart, which Steam ranks by revenue. The handler reads Steam's weekly top sellers service, falls back to the server-rendered chart table, and accepts a chart only if it holds 20–100 app ids. If neither source is available, nobody is labeled a top seller.

Discounted does not estimate or display sales figures. The same explanation appears in the filter panel and on the How it works page.

## Accessibility and motion

Controls are native buttons, links, selects and range inputs, with visible focus rings. The mobile filter sheet traps focus, restores focus when it closes, and closes with Escape, its backdrop or a downward swipe on its header. Dialogs use `<dialog>`. Motion is limited to short color and opacity transitions and the sheet sliding in; `prefers-reduced-motion` removes all transitions. Nothing autoplays.

## Verification

See `CHANGELOG.md`. Lighthouse scores, real-device Safari/iOS/Android behavior and the live Steam endpoints must be checked on a deployment.
