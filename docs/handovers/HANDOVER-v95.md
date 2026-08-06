# HANDOVER v95 — Dashboard desktop bento: variable tiles last

**Completed:** 29 Jul 2026 · branch `fix/dashboard-density` (same branch as v94, PR #34).
Brief: `ezplate-fable-dashboard-bento.md`. Grid arrangement approved by Max before building
(the "variable tiles last" wireframe, chosen over a compares-strip variant and an
insights-top-right-with-scroll variant).
Six spots → **v95**. No migration. Mobile (<1024px) markup-order and visuals unchanged.

## The diagnosis the brief named, confirmed

No fixed two-column desktop split can absorb a right column whose height is *inherently*
variable (1–5 insights by design, menus grow the BY MENU list). v94's tuning traded gaps for
reserved air and still moved. The v95 answer is compositional, not tuned:

## The grid approach chosen and why

**Every fixed-height region composes the upper rows; both variable-height regions share the
terminal row.** A tile that grows toward the page end has nothing beside it to mismatch and
nothing below it to push — the two hard requirements (no dead space at any content level, no
jumping on scope change) hold *structurally* rather than at one tuned content level.

At ≥1280px:
```
┌ AVERAGE FOOD COST ──────────────────────────────┐
│ [ verdict + selector (4) ][ chart (8)          ]│
│ [ compares (4)           ][  …spans both rows  ]│
└─────────────────────────────────────────────────┘
[ dig ][ dig ][ dig ][ dig ]      ← four naked tiles (wrapper chrome stripped)
[ WHAT NEEDS ATTENTION (8) ][ BY MENU + sparklines (4) ]   ← terminal row
```
At 1024–1279px the top card is two rows instead — verdict | compares side by side, chart
full width beneath — because a 4-col side column wraps taller than the narrowed chart and
strands air at its floor (measured, not guessed).

**Mechanism:** `renderDashboard` wraps the top card's three pieces in `.dp-tile` divs (DOM =
the mobile reading order; the wrappers are chrome-free below 1024px, so the phone stack is
unchanged). Everything else is CSS placement of existing elements. All ids, classes and
handlers kept; the drill-down, scope selector and scrub wiring are untouched.

## How it behaves at each content level (all measured, not asserted)

A throwaway Playwright harness drove 4 widths (1024/1280/1440/1920) × menus (1/2/4) ×
insight lines (1/2/3/5, DOM-injected — layout was under test, not the engine), asserting:
no horizontal overflow, no gap over 40px between rows, no tile with meaningful trailing
dead space, and — switching the scope through **every** menu — zero movement of the top
card's bottom edge, DIG IN, and BY MENU. Final state: **every check green.**

- **Insights 1→5**: the tile grows downward only; the page just ends later. BY MENU beside
  it is independent. Nothing above moves.
- **Menus 1/2/4**: BY MENU grows in the terminal row. With ONE menu (no selector, no
  comparison list) `:has()` fallbacks give the surviving terminal tile the full row and
  hand compares the wider top-row share.
- **Scope changes**: three sources of movement were found and each got a structural fix —
  (1) the per-menu caption under the chart: its line is permanently RESERVED at the chart
  tile's floor and the note absolutely positioned into it; (2) the verdict sentence wraps to
  two lines for some scopes ("under" vs "over", trend word): two lines are reserved always;
  (3) the compares lead gains "all-menus" when scoped and can wrap: the chart tile's reserved
  band out-sizes that wrap so the row track never yields. Plus `scrollbar-gutter:stable` at
  ≥1024px, because a classic scrollbar toggling with page height narrows the viewport and
  reflows every tile by ~6px (found via the harness; overlay-scrollbar platforms unaffected).

## Also in this batch

- **BY MENU sparklines restored** (the approved mockup's row: name · sparkline · figure) —
  new `mcmpSparkHtml`, drawn from `menuHistory` (recording since v89). A menu with <2 points
  gets NO sparkline rather than a fabricated shape; flat series draw centred; colour is the
  chart's semantic pair (cost falling = good). Both breakpoints, decorative (`aria-hidden`).
- **DIG IN reads as four top-level tiles** at desktop by stripping the wrapper panel's chrome
  (the drill-down's open state gets its card chrome back). Markup and all v90 pins untouched.
- The chart KEEPS its 540px rendered cap: scaling the 320-unit viewBox wider scales the axis
  type with it (axis fonts are pinned and out of scope). The chart tile centres it.

## Pinned contracts touched (deliberate, same commit)

- `v90-dash.spec.js` desktop geometry block rewritten: the v90 "insights beside the chart"
  pin is SUPERSEDED by the Max-approved bento (dig below the chart section, insights in the
  terminal row; verdict|chart tile relationship asserted per band).
- `tests/dash-scope.test.js` extraction closure gained `mcmpSparkHtml` (+ an empty
  `menuHistory`) so `menuCompareHtml` still evaluates.

## Judgement calls

- **Insights move to the bottom band.** The only arrangement satisfying both hard
  requirements at every content level; Max chose it seeing that trade explicitly. The panel
  is wider there (8 cols), so lines read better than the old right column.
- **A scope with NO insights** removes the panel (v90's no-empty-state rule) — the terminal
  row's `:has()` fallback re-spans BY MENU so no hole opens; the row simply gets shorter.
  This was the one case v94's row-locks could never solve.
- **Verdict tile centres its stack** so the single-menu case (no selector) reads as
  breathing room, not a hole.

## CodeRabbit (four findings, each decided)

1. **MAJOR, real bug, fixed:** the single-menu fallback `#dashBody:not(:has(.dash-scope))
   .dp-stats{grid-column:6/13}` out-specifies the plain `#dashBody .dp-stats` rules, so at
   ≥1280 a single-menu tenant's compares tile would land ON TOP of the chart. Re-pinned with
   matching specificity inside the 1280 block. My own harness had missed it — its trailing-
   space checks don't detect overlap; a lesson for the next harness.
2–3. **Accepted:** the terminal-row assertions in v89/v90 specs now compare against the
   Dig-in region's BOTTOM, not its top — strictly stronger.
4. **Skipped:** duplicating the By-menu alignment assertions into v90-dash — v89-dash owns
   exactly those assertions; two copies of one pin drift.

## Verification

485 `npm test` green, jsdom smoke green (24 sections), `node -c` clean, full Playwright
70/71 run alone (the one red is the pre-existing stale v45 button-copy pin, red on main),
CodeRabbit as above, flow-tester run per the brief, plus the bento harness matrix above.
Screenshots at 1024/1280 × 1/2/4 menus, both themes.

## Flow-tester (per the brief) — pass

All checks green at 380/1024/1280, both themes: four drill-downs + back, selector and
By-menu scope switching (selector syncs back), all six ranges, scrubbing, sparklines
rendering with seeded history and degrading cleanly without it, no overflow, no clipped or
overlapping text, Products-tab leak check clean. Its stability check independently confirmed
DIG IN and BY MENU tops are bit-for-bit identical across every scope switch — **including a
scope where the insights panel disappears entirely**, the case no earlier layout survived.
One pre-existing friction it flagged (NOT from this batch): at 380px the "Offline — changes
won't save" badge overlaps the header title. Worth its own small fix sometime.

## Needs Max's desktop/laptop + phone

- Switch between every menu at 1024/1280/1440/1920 — confirm nothing moves and no gaps,
  both themes (the browser says yes; your screen decides).
- The insights band at the page bottom: does "What needs attention" still get seen? If it
  feels buried on real use, the fallback is the top-right fixed-slot variant — but that
  trades back the 1-insight dead space.
- The BY MENU sparklines against real data (they've been recording since 25 Jul — shapes
  will be thin for a while).
- Mobile: confirm the stack is visually unchanged (it should be pixel-identical).
