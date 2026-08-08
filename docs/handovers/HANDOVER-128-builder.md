# HANDOVER - 128 (Q6: Builder redesign)

**Branch:** `feature/q6-builder-redesign` (PR #89) · **Scope:** queue item Q6, the plate builder screen of the redesign phase.

**Ships `ezplate-v125`.**

**Suite at close:** `npm test` **799 green** · **103** Playwright green (one new spec) · smoke clean · `node -c` clean.

## What changed
The builder stays a modal (Max's decision, twice) and gains the design's substance inside it.
At ≥900px the modal widens to 980 and the body becomes docket + a 320px sticky cost panel: 32px total, suggested price at the live target %, and a tinted per-menu verdict ("46% food cost — 30c under suggested").
Docket lines flatten to columns at that width (name / qty / unit-cost chip / line cost / ×) over the unchanged two-row DOM.
Under 900px the sticky footer carries total + the WORST menu's verdict + Save together, and the panel's cost block hides so the figure has one carrier per width.
Everything renders from `renderBuilderCost`, called by `updateTotals`, with lights from `menuMarginPreview` — the builder, the publish dialog and the Menu row cannot disagree.

## Into CLAUDE.md
Nothing proposed.

## New docs/QUEUE.md items
`project-audit` queued as the next item - v125 vs AUDIT-v115 is the gap-of-10 trigger.
The design's "+ Add to another menu" shortcut, deferred out of this batch (modal stacking + refresh are their own risk) - in Small.

## New docs/PHONE.md items
None - driven at 380 and 1280 in both themes; the sticky footer and the two-column modal are the things to feel on the real device, and the standing v102 builder block already covers that screen.

## Probe
**What did the item tell you to do that you would have done differently?**
Nothing structural - the "keep the shell, take the substance" plan held up exactly as written, including its position:sticky-in-.mbody suggestion.
The mock put Save inside the cost panel; the v82 sticky-footer decision kept it in the footer, and nothing was worth reopening there.

**What did you not propose because it was out of scope?**
The mock's "+ Add to another menu" — deferred to the queue with its reason rather than shipped untested.
Widening the docket columns into a shared cross-row grid via subgrid — the fixed tracks achieve the alignment without a compat question.

## Surprises
- **A "flaky test" was a real defect wearing a flake's clothes.** The columned-layout spec failed only under full-suite load, passed solo, and burned real time on wrong theories (server contention, rAF starvation, sticky loops). The truth, once measured: the qtybox's ~116px min-content overflowed its 92px grid track leftward into the name column — a genuine layout bug, intermittently visible to the assertion depending on which row got measured. The lesson for the next such chase: **dump the geometry numbers FIRST**; every theory before the numbers was wrong.
- The review caught `rank[light]||3` burying red (rank.red is 0) — the exact falsy-zero trap this project has already documented, in code written the same day. The worst menu, the one losing money, never led the mobile footer.
- jsdom does not compile inline `oninput=` handlers on innerHTML-created nodes — the smoke pin had to call the handler function directly. Worth knowing before the Q8 invoice batch, whose renderer is full of inline handlers.
