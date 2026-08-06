# HANDOVER v56 — Plates polish batch

Branch: `feat/plates-independent-library` (continues v54+v55, off `main` @ v53).
Brief: `~/Downloads/ezplate-opus-plates-polish.md`. Small surgical polish batch — no
data-model or logic changes, all four items are markup/CSS/copy. `/frontend-design`
consulted for the two layout items (2 and 4).

Baseline verified before starting: 150 tests green, jsdom smoke green, `node -c` clean,
six spots at v55. After the batch: **150 green, smoke green, `node -c` clean, six spots at v56.**

## What changed

### Item 1 — empty-state glyphs + Plates search-empty copy/affordance
Two empty states still showed the wrong tab's glyph (the plate icon shipped in v55 didn't
propagate everywhere). Both fixed; a sweep confirmed these were the ONLY two stale spots
(Products cube, Ingredients leaf, Menu bar-chart, and all three `emptyStateHtml` true-empty
states were already correct).

- **Builder docket empty** ("No ingredients yet") used `#lines .empty::before` = the
  clipboard/docket glyph. Swapped its mask-image to the plate glyph (rim + inner circle,
  matches `ICON_PLATE_BIG`). This selector is used ONLY by the builder docket empty, so the
  change is isolated. (`css/style.css`, the `#lines .empty::before` rule.)
- **Plates search-empty** rendered `<div class="an-empty ing-empty">` and so inherited the
  Products **cube** via `.ing-empty::before`. Root cause: the shared `.ing-empty::before`
  glyph is correct for Products but wrong for Plates. Fix without touching Products: the
  element now also carries a new `plate-noresult` class, and a later `.plate-noresult::before`
  rule overrides just the mask-image to the plate glyph (sizing/background still inherited from
  the shared `.ing-empty::before` rule; equal specificity, later source order wins). Products'
  cube is untouched. (`renderPlatesTab` in `js/app.js` + `css/style.css`.)
- **Copy**: the search-empty already read "No plates match your search." in the live code
  (the leaked "Import an invoice / + Add new ingredient" copy the brief screenshot showed had
  been corrected earlier). Added the missing **Clear-filters affordance**, matching the Menu
  tab's `.linklike` pattern: a "Clear filters" button (`id="plateEmptyClear"`) wired in
  `renderPlatesTab` to reset both `plateSearch` and `plateCatFilter` then re-render.

### Item 2 — builder popup flow reorder (`/frontend-design`)
Max found the order illogical (search first, name second). Reordered to one obvious
top-to-bottom flow, **markup relocated only — every id and handler unchanged**:

- New top panel `#platePanel` ("The plate") holds plate name + category (+ suggest/err/tools).
- The Add-ingredient search integrates into the **top of the `#docketPanel`** (its `<h2>` is now
  "Add ingredient", its `.pad` now holds the `#q` search + `#builderHint`), then the receipt
  docket-head / `#lines` / misc / total / actions follow unchanged.
- The old standalone `.search-card` panel wrapper is gone (it had no dedicated CSS).

Chose **two panels** (name → then search-integrated-with-docket) over three, per the brief's
"or integrated with the docket" and frontend-design's one-flow guidance. `#docketPanel`'s
receipt styling is preserved: same shape (h2 → `.pad` → docket-head → …), so
`#docketPanel > .pad{padding-bottom:0}` and the tear/`::after` still work.

### Item 3 — dashboard "How today's average compares" alignment
The compares block sat a hair off the chart block's left edge. `.stat-lead` (margin-left) and
`.stat-line` (padding-left) were at **2px**; the chart title (`.chart-controls`, left 0), the
y-axis label column (SVG x0 = dash-chart left), and the caption (`.chart-hint`,
`margin-left:0`) all share **x0**. Set both to **0** so the whole block shares that one x.
NOTE: the code delta is only 2px — if Max still sees a gap on his phone it's rendering-specific
and needs his eyes (flagged below).

### Item 4 — misc-cost line: one price, no duplication
`miscRowHtml` DOM order changed from `name · $input · leader · bold-total(.lc) · ×` to
**`name · dotted leader · $input · ×`**. The `.lc` bold duplicate total is **removed** — the
`$` input IS the line total, right-aligned where the bold total used to sit. `.nm` is `flex:1`
so it fills and pushes the input to the right edge; the leader is the short dotted connector.
Totals math unchanged (`setMiscCost` still calls `updateTotals()`; its `getElementById('lc-'+uid)`
is now a guarded no-op for misc lines — ingredient lines keep their `lc-` totals). Dead
`.line.misc-line .lc` CSS rule removed.

## Tests
- `npm test` = **150 green** (unchanged count — no logic contracts touched).
- jsdom `tests/smoke.js` green (builder popup restructure + wiring verified: `plateName`,
  `docketPanel`, misc add all pass).
- **Playwright specs updated deliberately (NOT run — no browser here):**
  - `fresh-states.spec.js` misc block: removed the `.lc` reference (now asserts **no** `.lc`
    exists and the `.misc-costbox` sits left of the ×); the builder-baseline loop no longer
    expects a `.lc` on the misc line (ingredient totals only, count `>= 2`).
  - No spec pins the builder panel order or the "The plate"/"Add ingredient" h2 text, so the
    item-2 restructure needed no other spec edits.

## Needs Max's phone / browser (could not verify here — no browser)
- **`npm run shots`**: builder-popup shots are now stale — the panel order changed (item 2),
  the misc line reflowed (item 4). Regenerate refs. Affected at least:
  `builder-lines-mobile.png`, `v46-builder-baseline-*.png`, and any builder/plates/dashboard
  screenshots in `screenshots.spec.js` / `layout-consistency.spec.js`.
- **Builder popup flow at 380px** (and desktop): name → search → docket reads top-to-bottom;
  the search dropdown (`#drop`), plate-name suggest (`#plateSuggest`) and category combo
  (`#plateCatDrop`) all overflow their panels correctly (panels are `overflow:visible`).
- **Misc line entry** at 380px: name field wide, `$` input right-aligned before ×, dotted
  leader between; nothing clips; typing updates the grand total.
- **Both empty states**: builder docket "No ingredients yet" shows the plate glyph; Plates
  search-empty shows the plate glyph + a working "Clear filters" link.
- **Dashboard compares alignment** (item 3) — see the 2px note above.
- **Both themes** for all of the above.

## Deliberately NOT done (scope)
- No data-model, logic, or protected-region changes. No new dependencies.
- Did not restyle the misc leader to `flex:1` — `.nm` flex:1 already right-aligns the input;
  kept the short-connector leader to preserve the name field's width.

## Still outstanding (from v55, unchanged)
- Max's phone sign-off on v54+v55+v56; apply the 3 v55 migrations to prod; then merge.
- `fresh-states.spec.js` still has other v54/v55-stale tests to reconcile on a browser env
  (v55 §K) — the v56 edits above are additional deliberate updates in the same file.
- Tidy-lists Settings UI still not built; optional purchased-quantity capture (§I).
