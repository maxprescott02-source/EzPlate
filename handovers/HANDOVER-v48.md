# HANDOVER — v48 (final pre-merge patch: chart declutter + stability, menu rhythm)

**Date:** 18 Jul 2026
**Branch:** `fix/pack-control-and-menus` (v42–v48). Not on `main` yet.
**Brief:** `ezplate-fable-final-patch.md` (Max's annotated screenshots), 7 items — item 7
was a cancellation (no change), so 6 built.

## What shipped

1. **Chart declutter** — the "Target" word on the dashed line is GONE (no replacement
   label, no caption change — Max's call), and the x-axis date labels are gone (the range
   buttons state the window; the scrub tooltip gives exact dates). `padB` back to 20.
2. **One left edge** — the y-axis labels are now start-anchored at x=0 of the viewBox and
   `.chart-controls` is constrained to the same 540px centred box as `.dash-chart`, so the
   "FOOD COST TREND" title, the % labels, and the caption all share one vertical edge
   (pinned by test at both 380px and 1280px, tolerance 1.5px).
3. **Mono axis** — `.dash-chart .ax` now uses the existing `var(--mono)` token (the same
   stack the scrub tooltip's value and the docket already use). No new font, no new token.
4. **Range-switch stability** — root-caused, see below. Tick generation is target-anchored;
   plot geometry is constant across every range.
5. **Blue tap box** — `-webkit-tap-highlight-color:transparent` + `:focus{outline:none}`
   on the plot, with `:focus-visible` restated AFTER it so keyboard scrubbers keep their
   ring. (Cascade order matters: a later plain `:focus{outline:none}` would beat the v47
   focus-visible rule, so it's re-declared in the v48 block.)
6. **Menu header rhythm** — target label → value line → colour key all breathe on
   `--sp-2` (was 6px then 22px). `.an-controls` gap + `.akey` padding-top moved onto the
   same token. Spacing-only change, theme-independent.
7. **"Print docket"** — untouched everywhere, per Max's reverted decision.

## Item 4's ACTUAL root cause (neither of the brief's guesses)

Measured with a Playwright probe at 380px across all six ranges **before** patching:

- **The font size never changed.** Computed 11px, rendered height 13.0px in every range.
  `padL` was already a constant 40 — it was never derived per-range.
- What actually happened: on tight ranges (1W) the old `tcTicks` picked a **2.5 step**,
  producing decimal labels ("27.5%") that are ~35 viewBox units wide in a ~33-unit gutter.
  With `text-anchor="end"`, the label **overhung and was clipped by the svg's left edge**
  (measured: label left 27.5px vs svg left 29px) and sat 10px left of its 3-character
  neighbours. A clipped, shifted, longer label on a phone reads as a font change.
- **The framing shift was real**: ticks and domain were computed independently per range
  from the data span with proportional 28% padding, so the target line's rendered y jumped
  ~50px between adjacent ranges (256 → 305 → 284 across 1W/1M/3M on identical data).

**Fix (both symptoms, one mechanism):** `tcTicks(target, mn, mx)` now anchors the tick
sequence ON the target and steps outward (integer-biased ladder 1/2/5/10/20/50 — decimal
labels only if the user's own target is decimal) until the data is covered; the **domain
derives from the ticks** (extent ± half a step), so headroom is consistent and similar
ranges can't jitter. Labels are start-anchored at x=0 so nothing can ever clip at the left
edge again, and `padL` (now 44) clears the widest possible label in the mono stack. The
domain still adapts to the data — stable, not fixed (a hard-fixed domain would squash 1W;
the brief said ask first, and it wasn't needed).

**The hard requirement holds by construction:** the target is always one of the labelled
ticks, which is the entire basis for removing the "Target" word. Pinned three ways:
`tests/trend-ticks.test.js` (7 node tests incl. a 300-combination sweep, non-round 32%,
decimal 32.5%), a Playwright check that a tick reading exactly the target number sits
centred ON the dashed line (round 30% and non-round 32%, three ranges), and a per-range
sweep asserting label height / label left edge / gutter are IDENTICAL across all six
ranges.

## Judgement calls

- The old `tcTicks` "thin to every other tick" branch is gone — thinning could have
  dropped the target tick. When there are too many ticks the step widens and the sequence
  rebuilds from the target instead.
- v45's proportional-headroom comment block is superseded and was replaced (the v45
  property "consistent headroom across ranges" is preserved, now in tick units).
- Perfect no-jitter between arbitrarily-close domains is mathematically impossible for a
  covering axis; the contract pinned is quantization — identical ticks for any data extent
  inside the same tick quantum. The unit test documents this.
- The rhythm token for item 6 is `--sp-2` (8px): closest to the existing label→value 6px,
  so the pair still reads as a pair while the key row joins the same rhythm.
- Playwright count is now **42** (39 prior, of which 3 assertions updated for the new
  contract — ref-lbl gone, date labels gone — plus 3 new v48 tests). Contract changes are
  deliberate and named here per the testing rules.

## Deliberately NOT built

- No caption text explaining the dashed line (explicitly forbidden by the brief).
- No hard-fixed y-domain across ranges (brief: ask first; not needed — see above).
- The cross-tab consistency refactor (separate brief, separate branch, per the patch).
- "Print docket" rename — cancelled by Max; docket language untouched.

## Verification

- `npm test` = **138 green** (131 + 7 new), `node -c js/app.js` clean, jsdom smoke passes,
  **42 Playwright checks pass**, screenshots regenerated in `tests/visual/__shots__/`
  (see `v47-*` regenerated + `v48-target32-mobile.png`, `v48-menu-rhythm.png`).
- All six version spots at **v48**.

## Needs Max's phone (branch preview) — add to the standing v42–v47 list

- Switch every range in sequence on the dashboard: ONLY the trendline should move — label
  size, label edge, and the plot frame must stay planted.
- Set the target to **32%** (and back) in Settings: a labelled tick must sit exactly on
  the dashed line at every range.
- Tap and scrub the chart: **no blue box**, no focus ring on touch.
- Keyboard (external or iPad): Tab to the plot → ring appears, arrows scrub, Escape rests.
- Menu tab: the target block and colour key rhythm, both themes.
- The chart's left edge: title, % labels, and caption on one vertical line, 380px + desktop.
