# HANDOVER v51 — dashboard chart: plot now starts at the card's text column

Branch: `fix/invoice-new-item-state` (continues from v50). Single item, from
Max's on-phone follow-up to v50's item 3.

## What changed and why

v50 concluded item 3 as "no change" — I had measured that the caption shares a
left edge with the y-axis labels and title, and read the brief as caption-vs-
axis. **That was the wrong reference.** Max clarified on his phone: the real
issue is that **the whole graph (the plotted curve/area) is not inline with the
rest of the card** — the h2, the "Food cost trend" title, the caption, and the
"How today's average compares" section all sit at one left edge (x=0 of the
svg ≈ the card's text column), while the **curve started ~44px to the right**.

Re-measured to confirm (Playwright, true text edges, 380 + 1280):

| Element | left edge (@380) |
|---|---|
| h2 "Average food cost" (text) | 29 |
| "Food cost trend" title | 29 |
| y-axis labels (35% …) | 29 |
| caption | 29 |
| "How today's average compares" / stat rows | 31 |
| **plotted curve** | **73** |

So every text element was already aligned at 29–31; only the **plot** was inset,
by the y-axis-label gutter (`padL = 44`). That gutter is what made the graph read
as "not inline with the card."

## Root cause + fix

`trendChart()` used `padL = 44` so the start-anchored y-labels ("27.5%" etc.)
had a clear gutter to the LEFT of the plot (a v48 choice to stop label
clipping). Fix: **`padL = 4`** — the plot now begins at the card's text column.
The y-axis % labels stay start-anchored at `x = 0` and **centred on their value**
(unchanged), so they now **overlay the plot's left edge** rather than sitting in
a gutter; the existing white halo (`paint-order:stroke` on `.ax`) keeps them
legible over the dotted fill / curve.

**Invariant preserved:** labels stay centred on their value, so the target tick
still sits exactly on the dashed reference line (v48's whole reason the "Target"
word could be dropped). I briefly tried offsetting labels 6px ABOVE the line to
avoid curve overlap and **reverted it** — it broke that invariant and its pin
(`fresh-states.spec.js:532`, "target tick label centred ON the dashed rule").
Halo-over-plot was the right trade.

Everything else in the chart is untouched: the domain/tick maths (`tcTicks`),
the monotone spline, dotted fill, scrub wiring (reads `TREND_GEO.padL`, so it
followed the change automatically), semantic colours, both themes. Verified the
curve now starts at the text column in light AND dark at 380 + 1280.

## Pinned-test change (declared, per CLAUDE.md)

`tests/visual/fresh-states.spec.js` — the v47/v48 "chart statics" test pinned
`maxLblRight <= plotLeftPx` ("the widest label ends BEFORE the plot gutter —
nothing can clip"). That contract is exactly what v51 overturns: labels now
overlay the plot, there is no gutter. **Replaced** that one assertion with the
v51 invariant — the plot's left edge hugs the title/label edge
(`plotLeftPx - titleLeft` within [−1.5, 10]px, i.e. no ~44px inset). The other
pins in that test are unchanged and still pass: labels share the title's left
edge; label size / left edge / `padL` identical across all six ranges; target
tick present; smooth curve; dotted fill; sparse/dense dots; focusable plot. The
`target tick centred on the dashed rule` pin (line 532) also still passes.

## Cache version
v50 → v51 in all six spots.

## Verified in-container
`npm test` 139 green · jsdom smoke all pass · `node -c` clean · **34 Playwright
checks pass** (layout-consistency + fresh-states, incl. the updated chart-statics
pin and the target-on-line pin) · rendered the chart at 380 + 1280 in both
themes and eyeballed the alignment + label legibility.

## Needs Max's phone
- The dashboard chart: the green curve/area should now start at the same left
  edge as "Food cost trend", the caption, and "How today's average compares".
  Check the y-axis % labels are still readable where the curve passes behind
  them (halo), on a real range with real data, both themes. Switch all six
  ranges — only the trendline should move; the target dashed line must still sit
  exactly under its % label.

## NOT changed
- No other chart behaviour; no caption/title indent (v50's option B is still not
  taken — this fixes the actual complaint at its source instead).
