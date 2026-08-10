# HANDOVER - 152 (F6, the Dashboard)

**Branch:** `feature/f6-dashboard` · **Scope:** the queue's F6 item, with the "Dashboard panel sits 4px high" item riding its `Do with:`.
**Deploy version: `ezplate-v143`.**

## What changed

The Dashboard is rebuilt from the v3 mock, desktop and mobile, and is the last of the five main screens to convert.
It now has a `.scr-head` like the other four, with the menu-scope dropdown rehoused into it from beside the big number.
Desktop reads KPI strip, trend, Needs attention, then What moved beside Dig in; a phone reads the same order with a 44px hero in place of the strip.
The trend chart is drawn at 1:1 for the first time: its type and stroke are in viewBox units, so a fixed 320-unit box was enlarging the whole plot 2.7x on an 872px column, and it is now sized to the column.
Dig in is the mock's four rows rather than four tiles, and is two-line on a phone.
A café with nothing costed and priced gets a composed first-run card with a New plate button instead of an em dash.
Five stacked layout layers are deleted, not overridden: the v89 verdict rules, the v120/v121 verdict-panel rules, the v94 density block, the v98/v121 desktop grid, and v132's per-screen title-bar rule.
There is no CSS reordering left on this screen at any width.

The panel-gap item landed with it: the tab's top gap has one owner instead of two, 700px is promoted from `EDGE_SIZES` into `SIZES` in `layout-consistency.spec.js`, and Dashboard joins the compared set.

## Into CLAUDE.md

Nothing.
Nothing durable turned up that is not already covered.
The `@media` specificity rule added on 10 Aug earned its keep twice here and needed no amendment.

## New docs/QUEUE.md items

- **The trend chart does not re-measure on resize.** `renderDashboard` does not run on resize, so the plot keeps the previous width's viewBox until the next render and its type is off by that ratio in the meantime. Created by this batch's own fix; harmless for an intermittent phone user, which is also why nothing else will notice it.

## New docs/PHONE.md items

- **v143 block added.** The scope control moved to the top of the screen: check it reads and reaches one-handed, and that a long menu name truncates rather than shoving the title. The desktop chart got visibly finer; the phone chart should look essentially unchanged, so say if it looks thinner or smaller than it did. And the one-glance test on the whole screen, which is the only thing a phone can settle. A failure looks like having to scroll or think before knowing whether you are over target.

## Probe

**What did the queue item tell you to do that you would have done differently?**
Two of its lines, and the code won both.
It asked for a **delta pill** beside the mobile hero, which was DECIDED NO on 9 Aug 2026 (answers Q1, "the chart is the one trend surface", closed without building, do not re-propose); the line inherited it from the mock at the queue reset and would have quietly reversed a twice-made decision.
It also asked for briefing rows with a **bold lead and ONE link each**, and the app has none of the three: an insight is one deterministic sentence with no navigation target, and `applyPhrasedInsights` replaces `textContent` wholesale, so a lead/body split could not survive the Gemini swap that is the point of the panel.
Both are recorded on the now-done item rather than only here.

**What did you not propose because it was out of scope?**
The "Synced 4 min ago" text the mock draws in this screen's header, which is fenced off by its own queue item whose `Do after:` was F6; the slot is built and empty with a comment saying so.
A resize listener for the chart, which is real but is new machinery on a screen rebuild, so it is queued instead.
The insight rows are not buttons and the What-moved rows are not either, both because there is no destination the app can honestly navigate to yet.

## Pre-push review

**Two findings, both real, both fixed in branch.**

1. **A phone-only seam collapse.** `.dash-row2` is the only top-level child of `#dashBody` that is not a `.dash-sec`, so it missed `.dash-sec`'s margin, and the rule below it deliberately zeroes its children's. Measured before fixing: the gap between "Needs attention" and "What moved" was **0.0px at 380 and at 700**, against 20px at 1360, so two card borders sat flush on the device that matters. Eleven ordering assertions in this batch missed it, because `b.top >= a.bottom - 1` passes identically whether the gap is 20px or nothing. There is a spacing assertion now, at all three widths.
2. **The What-moved lozenge rendered 13px, not the 12px its own comment claimed.** `.pill{font-size:12px}` and `.dig-v{font-size:13px}` are both single-class and `.dig-v` is declared later, so it won the tie. v133 shipped an override for exactly this collision and it was deleted with that block as no-longer-needed. Restored, narrower, and pinned.

**Closing the second one exposed a harness gap worth more than the fix.** `ing_price_history` was in `_boot.js`'s always-empty list, and it is the only feeder for the What-moved panel and the "Biggest movers" row - so **no Playwright spec has ever rendered either of them populated**. `v98-grid.spec.js`'s empty-tile test reads "this seed writes no per-product price points" as though that were a choice; it was the only reachable state. The shim now serves it from `cafeDB_ingPriceLog`, in the same shape as the two series beside it. Specs that do not seed the key are unaffected.

Three planted defects confirmed the new pins can fail: reverting the chart sizing fails the scale test at 1360, reverting the `.dash-row2` margin fails all three seam tests, and reverting the lozenge override fails the size test.

## Surprises

The chart's oversizing had been shipping since v94 and nobody had measured it.
The v121 comment names the symptom exactly ("rendering the 320-unit viewBox wider scales the axis type out of bounds") and worked around it with a 540px cap; the cause was one line.
It was right on a phone by accident, because 320 units is about 340 rendered pixels there.

A v40 rule I deleted as dead had been fixing a real problem, and the problem came straight back in the first cut of this batch: "on narrow phones the 6-button range bar squeezed the title into a 3-line stack".
It did exactly that again at 380px.
The difference is that v40 never pinned it, which is why it could return; there is a one-line-title assertion now.

`tests/smoke.js` caught four failures that `npm test` could not see, because the Gemini credit moved out of `#dashInsBody` and `applyPhrasedInsights` was still looking it up from there.
Left alone that is a credit that never appears again, with every unit test green.
It is not in `npm test`, so it is only ever caught by someone running it.

`v98-grid.spec.js` had been carrying a sentence that read like a decision and was a limitation: "this seed writes no per-product price points, so Biggest movers renders its empty state".
The seed had no choice, because the harness could not serve that table at all.

The old `.ins-credit[hidden]{visibility:hidden}` reservation turned out to be inert on its own: `visibility:hidden` reserves nothing, because the UA's `[hidden]{display:none}` still removes the box, and the `display:block` half of the original pair was doing the work.
Measured rather than reasoned, then deleted rather than carried forward under a comment claiming it worked.
