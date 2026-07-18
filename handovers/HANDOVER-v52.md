# HANDOVER v52 — chart gutter geometry (Part 1) + Menu page on the panel skeleton (Part 2)

Branch: `fix/invoice-new-item-state` (continues from v50/v51). Brief:
`ezplate-fable-chart-and-menu.md` — two parts, committed separately so Part 1
can be reviewed/reverted independently. Part 2's design was approved by Max
before any code (proposal → yes on all three questions).

## PART 1 — chart left-gutter geometry (root cause, finally structural)

**What the old x-scale was doing wrong:** v51 removed the left gutter
(`padL=4`) so the curve could start at the card's text column — but that
mapped the x-scale across (nearly) the full SVG width, so the plot content
(dotted fill, trendline, reading dots) rendered UNDERNEATH the y-axis labels.
Max's screenshot showed fill dots surrounding "10%". Every earlier attempt was
a nudge (label anchor, padding value); none changed the structure that let plot
pixels and label pixels share x-space.

**The v52 structure (per the brief, one constant used by everything):**
- `padL` (= plotLeft = GUTTER) = widest tick label width + 8px gap. The label
  width is **measured, not guessed**: `axCharW()` measures one glyph of the
  real 11px `var(--mono)` on a canvas (cached once; jsdom fallback 6.6px), so
  the geometry is correct whatever mono face the device resolves.
- Every plot element starts at `plotLeft`: fill, curve, dots, the dashed
  target line (`x1=padL`), and the scrub crosshair (wireTrendScrub reads
  `TREND_GEO.padL`, so clamping followed automatically). Zero plot pixels left
  of `plotLeft`.
- Labels live INSIDE the gutter, right-aligned to `plotLeft-8`
  (`text-anchor:end`): digits sit flush as a column, and the WIDEST label's
  left edge lands at x=0 = the title/caption/stats column.
- Gutter width derives from the widest label of the render, floored at the
  "NN%" width — constant across ranges in every real case (all 2-digit
  percents are the same glyph count in a mono face), and a decimal-target
  label ("32.5%") WIDENS the gutter instead of clipping at the svg edge (the
  v48 bug class).
- v48 invariants preserved: labels vertically centred on their value (target
  tick sits exactly ON the dashed rule — pin unchanged and green), geometry
  identical across all six ranges (pinned).

**Pinned-test changes (declared):** in `fresh-states.spec.js` chart statics —
v51's "no gutter / plot hugs the text column" pin is replaced by the v52
contract: labels right-aligned flush (right-edge spread ≤1px), widest label
starts at the title edge, plot begins right of the label column, and a
rendered-pixel check (`drawnLeft >= maxLblRight` on the fill+curve+dots group
AND the target line) on EVERY range at both sizes.

## PART 2 — Menu page rework (approved proposal, built exactly)

Approved calls: full redesign ✓, tap-to-edit cards ✓, h2 retitled "Menu" ✓.

**New structure** (mobile top-to-bottom): `h2 "Menu"` → `.panel-actions`
("+ New menu" primary, "+ Existing dish", strapline *"Cost vs price for every
dish — the lights show what needs repricing"*) → `.an-controls` (menu `select`
with Delete glued to it — the picker is the page's context filter, sitting
where Products puts its filters; search under it) → two quiet meta lines (the
target sentence with its live value + change-in-Settings link; the colour key,
now carrying `.panel-meta` so the shared edge/collapse rules own it) → the
sectioned list. Desktop: picker + Delete + search share one controls row.

**Cards/rows:**
- **Tap-to-edit everywhere** (v46 ingredient-card language): the whole card
  (mobile) / row (desktop) opens the existing edit modal; the per-card Edit
  button is retired. The dish name is a real `<button.mi-name>` so keyboard
  users have the same path. "→ Builder" stays as the one visible chip
  (stopPropagation so it never falls through to the row).
- **Margin stripe:** 3px left edge on every card/row in the light's colour
  (green/amber/red, grey for not-costed) — margin health scans while
  scrolling. The 11px dot stays (the key refers to dots). Desktop puts the
  stripe on the first cell (tr borders don't render on `table-row`).
- **2×2 number grid on phones** (cost|suggested / price|variance) — the card
  is roughly half its old height; the chip rides the name line.

**Wiring-adjacent changes (flagged in the proposal, approved):**
- `menuNewBtn`/`menuAddDishBtn` moved into `.panel-actions`; `menuDelBtn`
  stays beside the select. All ids/handlers/labels unchanged (`+ Existing
  dish` keeps its full mobile label — pin at fresh-states \~331 still green).
- Live `aRow` (the SECOND definition) adds `tr.mi-row.lt-*` + `data-mid`/
  `data-pid` and the `.mi-name` button; the muted "not costed" branch matches.
  `aRow` gained an optional 5th param (`pid`) for custom-plate rows.
- Live `renderAnalysis` binds row clicks (replacing the `.mi-btn.edit`
  binding). `menuActions`/`plateEditAction` emit only the → Builder chip.
- `cogsTargetRead`/`cogsToSettings` ids kept (settings.test.js + smoke pins
  green, untouched).

**Root-caused CSS bugs found while building (comments at the fix sites):**
- The shared `.menu-search{flex:1 1 220px}` basis is a WIDTH in row contexts
  but became a 220px HEIGHT inside the new column-direction `.an-controls`.
- The card base rule `.atable tbody tr:not(.sec):not(.ni-row)` is (0,3,2); its
  border SHORTHAND silently beat the (0,2,2) stripe rules — stripes carry
  `:not(.invtable)` purely for specificity.

**Test changes (declared):**
- `layout-consistency.spec.js`: Menu's "picker-embedded buttons" exception is
  REMOVED — analysis now joins the actions-row assertions (three tabs
  measured, spec got stricter).
- v48 "menu header rhythm" test replaced (its `.cogs-set`/`.cogs-help`
  elements no longer exist) by two v52 tests at both sizes: header block
  order + ONE left edge + live target value/link, and a functional
  tap-to-edit round-trip (card → modal with the right dish, close, chip →
  Builder without opening the modal, Edit buttons gone).

## Versions
v51 → **v52** in all six spots (bumped in the Part 1 commit; Part 2 ships in
the same deploy).

## Verified in-container
`npm test` 139 green · `node -c` clean · jsdom smoke all pass · **47
Playwright checks pass** (chart statics with the new gutter pins, layout
consistency incl. Menu, both v52 Menu tests) · screenshotted at 380 + 1280 in
light AND dark with seeded green/amber/red margin data.

## Needs Max's phone
- **Chart:** every range — labels right-aligned as a flush column, NO dot or
  line left of the labels, target dashed line still exactly on its tick,
  scrubbing works and the crosshair stays out of the gutter.
- **Menu tab, the full flow on a real finger:** switch menus, + New menu,
  + Existing dish, delete a menu (dishes land in "Unassigned dishes"),
  search + clear ×, tap a card → edit modal (does tap-to-edit feel right? any
  accidental opens while scrolling?), → Builder chip, a not-costed dish, the
  stripe colours at a glance, empty + search-empty states, both themes.
- The strapline + meta-line copy — reword freely, it's plain text.

## NOT built (out of scope, unchanged)
- Tidy lists Settings UI (HANDOVER-v40 spec) — still the next feature task.
- The matched/review-row tick-persistence parallel from v50.
