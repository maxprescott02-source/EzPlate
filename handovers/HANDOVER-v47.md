# HANDOVER — v47 (Dashboard trend-chart rebuild — Collectr feel, EzPlate skin)

Branch: `fix/pack-control-and-menus` (rides on v46). Ships as **v47** — all six version
spots bumped. `npm test` = **131 green**; `node -c` clean; jsdom smoke passes; **39
Playwright checks pass** (34 prior — one updated for the new Target label — + 5 new
v47 checks). Every range screenshot at 380px and 1280px, light and dark, in
`tests/visual/__shots__/v47-*.png`. No new dependencies; still one hand-written inline
SVG built by `trendChart()` (js/app.js) + vanilla wiring. Plan approved by Max first.

## What survived untouched (deliberately)

Range buttons and their data windows (`dashRangePts`, capped at 60), the v45
proportional y-scale padding, the target line's position from the COGS setting
(`.ref-line` keeps its class + `y1` — the v45 headroom test passes unchanged), the
**semantic line colour** (green = trending down/improving, red = up/worsening — pinned
by a new dark-theme test), the panel header with today's %, and the empty-state card.

## How it's built

**Smooth curve (item 7).** Fritsch–Carlson monotone cubic: `tcTangents()` computes
per-point tangents from secants (tangent zeroed at local extrema, magnitudes clamped to
3× the secant slope), `tcPath()` emits cubic béziers with controls at ±h/3 along the
tangents, and `tcYAt()` evaluates the SAME Hermite data at any x — so the scrub dot
rides exactly the curve that is drawn, never an approximation. Monotone means the curve
can never overshoot a reading, dip below 0, or invent a peak between real points.
With 2 points it degenerates to the straight segment.

**Dotted fill (item 8).** A 6×6 `userSpaceOnUse` `<pattern>` of 1.1-radius dots at
0.28 opacity, filled with the line's CSS variable — so it tracks green/red and both
themes with zero extra logic. Replaces the flat 10% wash.

**Dim-ahead + scrubbing (item 9).** The static drawing (fill + curve + reading dots)
is duplicated into two `<g>`s: bright, clipped by `#tcRectB` (full width at rest), and
dim (`opacity:.35`), clipped by `#tcRectD` (zero width at rest). `wireTrendScrub()`
(replaces `wireTrendTip()` in `renderDashboard`) moves ONLY five things per frame —
crosshair x, dot cx/cy, the two clip rects, and the tooltip — behind a
`requestAnimationFrame` throttle; the chart itself is never re-rendered while
scrubbing. Mouse scrubs on hover (Collectr behaviour); touch scrubs after a press with
pointer capture. `touch-action:none` was already scoped to the plot svg only (v23) —
unchanged, so page scroll is only suppressed on the plot itself. Pointer-leave, touch
release, Escape, and blur all restore the resting state.

**Tooltip.** Small two-line card (muted date over bold mono value, e.g. "22 Jul 2026 /
21.3%"), EzPlate surface tokens in both themes. The **reported reading snaps to the
nearest real data point** while the crosshair/dot slide continuously. Positioning
clamps inside the chart at both edges (measured ≤ 0 overflow in tests) and flips below
the dot near the top edge (`.below`). I chose clamping over Collectr's side-flip for
horizontal overflow — same guarantee, less jumpy; the vertical flip is kept.

**Axes (items 1–5).** The two stray corner figures (max % top-left, min % bottom-left)
are gone; `tcTicks()` picks 3–4 "nice" y values (steps 0.5/1/2/2.5/5/10…, stepping
down if phase luck lands only 2 ticks, thinning to every-other if 5+ land) rendered as
muted `%` labels in the left gutter. X-axis: first / middle / last reading dates
("19 Apr"), upright — rotation wasn't needed at 380px with three labels. Edge labels
claim their indexes before the middle one so a 2-point range keeps its end anchors
(found by test: a middle-anchored label at the right edge clips outside the viewBox).
`padB` grew 20→30 for the date row. The dashed target line now carries just the word
**"Target"** at its left end, vertically centred (the % lives in Settings and the
header); the `.ax` halo lets the rule pass behind the word legibly.

**Dots threshold (item 10).** Reading dots render when the range holds **≤ 32 points**
— by count, not by range name, so a sparse 6M still shows which readings are real.
With the 60-point cap this maps to: 1W/1M always dotted, 3M usually dotted (≤32
readings), dense 3M/6M/1Y/All undotted. The scrub dot always shows.

**A11y.** The plot is ONE focusable control (`tabindex=0`, aria-label includes the
trend sentence + arrow-keys hint) instead of v33's up-to-60 individually-tabbable
dots. Left/Right step point-to-point, Home/End jump to the ends, Escape rests. The
caption sentence stays as the screen-reader summary. Reduced motion: the only
transition in play (tooltip fade) is disabled under `prefers-reduced-motion`; the
crosshair/dot track the pointer 1:1 with no animation of their own.

## Degenerate data (verified by test)

- **0 or 1 point** → the existing empty-state card + contextual hint; `TREND_GEO` is
  null so scrub wiring bails cleanly. No crash, no broken path.
- **2 points** → one valid cubic segment (a straight line), dots shown, scrubbing and
  keyboard work between the two readings, both date labels stay inside the viewBox.

## Deliberately NOT copied from Collectr

- **Its dark navy theme/palette** — EzPlate keeps its own tokens, and the line colour
  stays semantic (green/red by trend direction), which Collectr doesn't do.
- **~45° rotated x labels** — three upright labels are legible at 380px; rotation adds
  height and reads worse at small sizes.
- **Always-visible data dots** — dense ranges drop them (this is a costing tool;
  the dots' job is "this was a real reading", and 60 of them defeat that).
- **Side-flipping tooltip** — clamping gives the same never-overflow guarantee with
  less visual jumpiness; kept the vertical flip near the top edge.
- **Volume/secondary panes and price badges** — out of scope, nothing asked for them.

## Needs Max's phone (branch preview) — the scrub interaction can't be screenshot-proven

- **Slide slowly across the whole curve** on a real import range: the crosshair and dot
  should track your finger continuously, the value snapping reading-to-reading.
- **Slide off each edge** (left and right): tooltip must stay inside the card, and
  lifting your finger / leaving the plot returns it to the clean resting look.
- **Confirm the page does NOT scroll while scrubbing** the plot, and still scrolls
  normally when you swipe anywhere else on the Dashboard.
- Both themes: dotted fill + tooltip card legibility, green and red trends.
- All six ranges: axis labels sane, "Target" tag readable over the fill, dots only on
  sparse ranges.
- Keyboard (external/iPad): tab to the chart, arrows/Home/End/Escape.

## Judgement calls

- Ticks aim for 3–4 but the *step down / thin out* rules mean a pathological domain
  still gets a sane axis rather than 2 or 6 labels.
- Tooltip date uses the device locale (`toLocaleDateString`) — "22 Jul 2026" on
  en-AU phones, "Jul 22, 2026" under en-US test runs. Deliberate: staff phones are
  the audience.
- The old `.tp-dot` interactive CSS (22px stroke targets, hover states) is now dead
  code, as are `.ref-pill` rules from v46 — both left in place per the surgical-CSS
  rule; folded into the standing "dead CSS cleanup" proposal for Max.
