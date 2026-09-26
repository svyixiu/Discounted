# Discounted · The Gem Vault

A static, build-free catalog of discounted Steam games, DLC and bundles. Edit `games.json` to add products; no frontend edits are needed. Vercel serves the pages and the existing currency and Steam-thumbnail API handlers.

## Run and deploy

Serve this directory with any static HTTP server. Use Vercel for `/api/fx` and `/api/steam-thumb`; a plain local server cannot execute those handlers. Missing currency service falls back to the existing approximate exchange rates. Prices are estimates; Steam is authoritative.

There is no install step, bundler, framework or production JavaScript dependency. `script.js` owns catalog behavior, `product.js` owns product details, and `vault.js` owns shared interaction and motion. The existing `games.json`, `api/fx.js` and `api/steam-thumb.js` are unchanged.

## Design system

The first block in `styles.css` is the token source. Backgrounds progress from `--void` (#070a0f), `--bg` (#0b0f15), and `--bg-raised` (#111722) to `--surface` (#151c28) and `--surface-2` (#1b2432). Raised panels pair their elevation shadow (`--e0`–`--e4`) with an edge highlight. Text uses `--text`, `--text-soft`, and `--muted`. Steam blue is reserved for actions and Rare gems. Radii are 8, 12, 18 and 28px.

| Discount | Rarity | Gem | Color |
| --- | --- | --- | --- |
| 1–49% | Common | Quartz | #9fb3c8 |
| 50–69% | Rare | Sapphire | #66c0f4 |
| 70–89% | Epic | Amethyst | #b48cff |
| 90–99% | Legendary | Topaz | #ffcf6b |
| 100% | Mythic | Prism | Iridescent |

`Vault.rarity()` is the shared classifier. Rarity filters are cumulative thresholds: Epic includes all discounts of 70% or more. Never rely on color alone: badges retain percentages and tier names.

Headlines use a locally served, preloaded Space Grotesk face; UI uses Inter with a system fallback. Prices use tabular figures. The included Space Grotesk font is licensed under the SIL Open Font License (see `assets/OFL.txt`).

## Behavior

- All existing type, budget, search, currency, view, sorting and pagination controls remain. Catalog pages render at most 100 results, plus eight shelf items.
- URL parameters (`type`, `tier`, `q`, `sort`, `view`, `size`, `page`, `min`, `max`) encode the catalog state. Budget values in the URL are USD, independent of display currency. Product links carry the catalog query; back links restore it. Currency and view preferences retain their existing local-storage keys.
- The daily gem is selected from the highest-discount products costing at most USD 10, with a UTC day seed and a title tie-break. If that pool is empty, it falls back to the ranked catalog. Identical snapshots show the same daily gem worldwide.
- Date-only offer deadlines are interpreted as 00:00 UTC on that date, because the source has no exact end time. The timer is indicative; Steam is authoritative. Expired offers are labeled, not silently removed from the snapshot.
- Recommendations preserve the existing family/type/promotion ranking and fix its title-token splitting.
- `/` focuses search; `G` then `H` goes home; `R` opens a random product; `?` shows shortcut help. Arrows move a focused shelf. Escape closes a filter sheet or shortcut dialog.
- Konami code or five clicks on the logo's upper-right glint enables gold treasure mode for the session.

## Motion and accessibility

Use transform/opacity/filter for animation, with `--spring` for entrances and `--snap` for feedback. List entrance staggering is capped at 300ms. Pointer tilt only applies to visible slabs and never to touch input or compact rows. A single rAF-coalesced pointer handler sets the shared light position. The canvas uses 30 dust particles and pauses when hidden. Autoplay also pauses while hidden, hovered or focused.

Reduced motion disables tilt, ambient animation, autoplay, digit flips and entrance motion. All primary controls are native links, buttons, selects and range inputs. The mobile sheet traps focus, restores focus and closes with Escape or a downward swipe. Keep explicit image ratios, lazy catalog images, readable focus rings and keyboard access when extending the site.

## Assets and provenance

The brief referred to `discounted-logo.svg`, but that file was not present in the repository or available attachments. The included gem-and-tag-hole mark is an original SVG reconstruction from the written brief, **not a byte-identical copy of the missing supplied mark**. Replace `assets/logo-mark.svg`, `assets/discounted.svg` and `favicon.svg` together when the original becomes available, then regenerate the lockup, touch icon and social card. The lockup uses the display-family name with a sans-serif fallback for standalone SVG viewers.

## Verification

See `CHANGELOG.md` for completed checks and environment limitations. Lighthouse 90+, sustained 60fps, and Safari/iOS/Android results must be measured on a deployment; they are targets, not guaranteed claims.
