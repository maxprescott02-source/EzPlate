# HANDOVER v57 — Plates icon: plate glyph → fork + knife

Branch: `feat/plates-independent-library` (continues v54–v56, off `main` @ v53).
One-item follow-up requested by Max: change the Plates icon to a fork and knife.

Baseline before: 150 green, smoke green, `node -c` clean, six spots at v56.
After: **150 green, smoke green, `node -c` clean, six spots at v57.**

## What changed
The Plates glyph was two concentric circles (rim + inner = a plate, v55 §D3). Swapped to a
hand-authored **fork + knife** line icon (3 tines + crossbar + handle, beside a bladed knife;
24×24 viewBox, stroke-based to match the rest of the icon set). Updated in ALL FOUR spots that
share the glyph, so the nav tab and its echoing empty states stay consistent (the v32 rule:
every empty state uses its tab's nav glyph):

1. **Nav tab** — `index.html` `data-tab="builder"` button SVG.
2. **`ICON_PLATE_BIG`** — `js/app.js`, the Plates "No plates yet" true-empty state.
3. **Builder docket empty** — `#lines .empty::before` mask-image in `css/style.css`.
4. **Plates search-empty** — `.plate-noresult::before` mask-image in `css/style.css`.

The exact same path data is used inline (nav + ICON_PLATE_BIG, `currentColor`) and URL-encoded
in the two CSS masks (`stroke='white'` luminance mask). Rasterized locally (qlmanage) to
confirm it reads as fork + knife before committing.

Six version spots bumped to v57. No logic/data-model change; no test pinned the icon shape, so
the suite is unchanged at 150.

## Needs Max's phone
- Eyeball the fork+knife at nav size (16–18px) and in the three empty states (64px), both themes.
- `npm run shots` still outstanding from v56 (icon change adds to the stale-shots list).
