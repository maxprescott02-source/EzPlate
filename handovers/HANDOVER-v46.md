# HANDOVER — v46 (Fable UX polish — third pass on the v44/v45 visual line)

Branch: `fix/pack-control-and-menus` (v42–v45 already committed; this rides on top).
Ships as **v46** — all six version spots bumped. `npm test` = **131 green**; `node -c`
clean; jsdom smoke passes; **34 Playwright checks pass** (27 existing + 7 new v46
checks). Items 3, 5 and 6 verified with rendered screenshots at 380px and 1280px —
see `tests/visual/__shots__/v46-*.png` (pill short + wrapped, builder baseline, king
grid, dash label). Design skills used: `/frontend-design` and `/web-design-guidelines`
(no `/general-design-review` installed). No conflicts arose between the skills'
guidance and the briefed fixes, so nothing was overridden.

## What shipped

**Item 1 — Ingredients strapline inline with the buttons row (desktop).** The v45
order (title → divider → buttons → strapline-below) stays in the DOM; a single
`≥640px` rule lets the strapline sit on the buttons row itself — right of the
buttons, vertically centred by the row's existing `align-items:center`, muted as
before. At ≤639px the existing `flex-basis:100%` rule still drops it to its own line
beneath the buttons (measured: cleanest at 380px, per the brief's let-it-drop
instruction). The "N of M products have a kitchen word" line is untouched below.
Verified: strapline centre == button centre at 1280px (0.0px delta).

**Item 2 — "Set up from products" reads as a real button.** It was `.btn.ghost`
(transparent border — bare text). It's now plain `.btn`, the exact class "Import
invoice" uses on Products: same 1.5px border, same radius, padding and height
(measured equal to the primary's height at both widths). One-word HTML change;
`.ghost` itself is untouched (it's the app-wide Cancel idiom).

**Item 3 — Ingredient cards join the Products grid.** `#kingList` now mirrors
`.ing-list` breakpoint-for-breakpoint: stacked column <640px (8px gap, `8px 16px 4px`
padding), 2-across ≥640px (10px gap), 12px gap + `--sp-5` side padding ≥1024px,
**3-across ≥1280px**. Card side margins moved into the grid gap (`margin:0`). The
linked-product line (`.king-link`) swaps nowrap-ellipsis for a 2-line clamp
(`-webkit-line-clamp:2`) so "Bacon Middle Rindless … — Caterers Choice · $12.20/kg"
survives one-third width. Markup, tap-to-edit, `role="button"`, tabindex and the
Enter/Space handler are all unchanged — the Playwright check drives Enter-to-edit at
both widths. Empty states span the full grid width (`grid-column:1/-1`).

**Item 4 — Target pill removed; the line labels itself.** `trendChart()` no longer
emits `.ref-pill`; instead the SVG gets a `<text class="ax ref-lbl">Target 30%</text>`
sitting 5 viewBox-units above the dashed rule. It anchors at whichever END of the
chart the data sits farther from the target line (compares first vs last point's
distance), so it stays off the line's busy side; the `.ax` class gives it the muted
axis colour plus the existing white halo (`paint-order:stroke`) so it stays legible
over the area fill. **The big current-value number stays** — Max has not asked to
remove it this session, per the brief. The `.ref-pill` CSS rules are now dead code
(left in place — see proposals).

**Item 5 — invoice flag pill alignment: ACTUAL root cause (second attempt).** The
v44 fix ("pills share the title's baseline") never held because THREE cascade leaks
stacked on the title cell:
1. v44 made `td:first-child` a `baseline` flex row but never set `justify-content`,
   so `justify-content:space-between` leaked in from the generic `.invtable td` card
   rule — the pill was flung to the card's FAR EDGE instead of hugging the title
   (clearly visible at desktop widths).
2. Baseline-pinning the 12px pill text to the 15px title text parks the pill's taller
   box ~2px below the title's optical centre — baseline alignment *could never look
   centred* for boxes of different font sizes; measured 2.0px low pre-fix.
3. The pre-flex `.invtable .flag-review{margin:4px 0 0}` (line ~694) still added a
   stray top margin from the era when the pill sat below the title as a block.

Fix at the root: the title cell returns to **inline flow** (`display:block`), and the
pills ride the text as `inline-block` with numeric `vertical-align:2px` —
`middle` was measured 2px low too, because it anchors at baseline + half x-height,
not at the line's centre. Result: **pill centre off by 0.00px** on single-line titles
at both 380px and 1280px, and a wrapped title lets the pill follow the last word or
wrap to the card's left edge (never mid-air). New Playwright checks pin ≤1px centring
and the wrapped-title behaviour at both widths, with screenshots of both cases.

**Item 6 — builder total vs dotted leader: ACTUAL root cause.** `.leader`'s
`transform:translateY(-4px)` is a stale optical nudge from the ONE-ROW line era.
Inside v44's two-row `.costs` (align-items:center) it parked the dotted rule 3px
above the total's text centre — 9px above its baseline, visibly "floating" over
every figure. Fix at the root: `.line .costs` now aligns by **baseline** — the qty
input, the "@ $2.63/kg" unit price and the bold total align by their real text
baselines (inputs baseline-align by their inner text in flexbox), and the empty
leader span's synthesized baseline is its bottom edge, so the dotted rule sits
exactly ON the shared baseline: the classic docket look, zero nudges. Measured: rule
4.0px above text-bottom (== the descent band) on every row type (kitchen line,
direct product, misc) at both widths; v45's overflow checks still green (no total
leaves its card, no horizontal scroll at 380px).

**Item 7 — scoped audit: two fixes shipped, both invisible.**
1. `.ms-clear` (the clear-search ×, used by all four search bars + builder's
   `#qClear`) is 26×26px — under the 44px floor. Fixed with an invisible hit-area
   extension (`::after{inset:-9px}` → 44×44 tappable); zero visual change.
   Justification: touch-target floor (both design skills), same-component fix
   applied once for every instance.
2. `.range-btn` (dashboard 1W/1M/…/All segments) is 32px tall. Same technique,
   vertical only (`top/bottom:-6px` → 44px tall) so adjacent segments can't overlap.
   Justification: touch-target floor; these are primary dashboard controls.

Audited and found CLEAN: theme-color metas, modal `overscroll-behavior:contain`,
search inputs' clear affordance parity, ellipsis characters (`…` everywhere),
tabular numerals on figures, cross-tab header pattern (title → divider → buttons),
button radius/border consistency after item 2.

## Item-7 proposals NOT built (need Max's yes)

- **`.invAppr` (invoice Apply checkbox) is 26×26px** — under the touch floor, but it
  lives in the protected invoice review area, so per the brief I didn't touch it.
  Same `::after` technique would fix it in one rule.
- **Dead `.ref-pill` CSS** (~4 rules at lines ~1035, ~1091, ~1325 + the user-select
  list entry) now has no markup emitting it. Safe delete, ~6 lines.
- **Leftover pre-grid `.king-row` rules**: the ≤700px `{flex-wrap:wrap}` block
  (~line 1806) targets a grid container (flex-wrap is a no-op there) and dates from
  the flex-row era. Safe delete after the grid settles on Max's phone.
- **Builder "+ Add misc cost" wraps to two lines at 380px** — could shorten to
  "+ Misc cost" or let it keep one line; copy call, so it's Max's.
- **`user-scalable=no, maximum-scale=1` in the viewport meta** — an accessibility
  anti-pattern by current guidelines (blocks pinch-zoom), but removing it changes
  real phone behaviour app-wide (double-tap zoom on inputs etc.), so it needs a
  deliberate decision + on-device testing, not a drive-by fix.

## Needs Max's phone (branch preview) — export a JSON backup first

- **Ingredient card grid** at real widths: phone portrait (1-col), a tablet if handy
  (2-col), desktop (3-col); long linked-product names should clamp at 2 lines.
- **Ingredients header**: strapline inline on desktop, below the buttons on the phone;
  "Set up from products" should now read as a bordered button next to "+ New".
- **Dashboard chart**: all six ranges — "Target NN%" should sit on the dashed line
  (left or right end, whichever is clear of the data) with no pill top-right; the
  big current-value % is still there.
- **Invoice flag pills on a REAL import**: single-line and wrapped product titles —
  pill centred on the title line, or tucked under long titles at the left edge.
- **Builder at 380px** with a real multi-ingredient plate: dotted leaders should run
  along the baseline of the figures ("100 g @ $2.63/kg ····· $0.26" all on one line
  of dots), qty box included.
- **Search-clear × and dashboard range pills**: taps should land easier now (hit
  areas grew invisibly).
- Everything still pending from the v42/v44/v45 lists if not yet done.

## Judgement calls

- `vertical-align:2px` on the pills is a measured font-metric constant, not a vibe
  nudge — `baseline` and `middle` anchors were each measured 2px low for this
  15px-title/12px-pill pairing; the value is documented at the fix site and pinned
  by a ≤1px Playwright assertion so it can't silently rot.
- Item 3 copies `.ing-list`'s exact values (including its hard-coded 16px base
  padding) rather than "cleaning them up" to tokens — matching Products exactly was
  the brief; token migration would touch Products too and belongs to a future pass.
- Item 4's label side is chosen per-render (farther-from-target end). A fixed side
  would be simpler but collides with the data on ranges where the trend hugs the
  target at that end — the v45 headroom screenshots showed both shapes are common.
- The v45 Playwright check "strapline below the buttons" still passes untouched —
  it runs at 380px where that IS the intended layout; the new v46 check pins the
  desktop inline position.
