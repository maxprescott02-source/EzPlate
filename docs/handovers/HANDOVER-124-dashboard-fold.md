# HANDOVER - 124 (the Q2 fold: Max called v120 janky, and he was right)

**Branch:** `fix/q2-dashboard-polish` (PR #81) · **Scope:** Max's correction of the Q2 dashboard, from a production screenshot.

**Ships `ezplate-v121`.**

**Suite at close:** `npm test` **782 green** · **102** Playwright green · `node -c` clean · smoke clean.

## What changed

Max's words: *"they look janky... ensure these design briefs are being folded into existing design we know looks and works good."* Three causes, all in v120:

1. **The chart floated in dead space.** It is capped at 540px on purpose - wider scales the axis type out of bounds - and v120 put it in a full-width card. Before Q2 the card was ~7/12 wide and the chart filled it.
2. **The number and its target sentence stacked.** v120's baseline CSS sat on an element that cannot join the number's line box, so the mock's one-line verdict never happened.
3. **Two stacked full-width cards** where the app's proven surface was one.

The fix is the fold he asked for: the v98 7/5 split returns - one top card (verdict → chips → since → hairline → chart), **What moved in the column the By-menu card used to earn**, insights and Dig in full width below, four tiles again. `.dash-row2` dissolves at ≥1024 via `display:contents`. Everything v120 added survives: chips, eyebrow, type scale, ranked disclosure, touch floor. Mobile gains the verdict/trend hairline his screenshot showed missing.

## Into CLAUDE.md

Nothing. **"FOLD, DON'T REPLACE" went into `docs/QUEUE.md`'s redesign phase header instead**, where Q3-Q10 will actually read it, with Q2 as the worked example: screenshot the current screen first, judge against it and not only the mock, and when the mock and the app's proven layout disagree, the app wins.

## New docs/QUEUE.md items

None. The directive above is the change.

## New docs/PHONE.md items

None - the fix was driven at 380px both themes, and the mobile change is one hairline.

## Probe

**What did the item tell you to do that you would have done differently?**
This batch WAS the different way - Max corrected the course. The lesson worth keeping is why v120 happened: I implemented the mock faithfully and verified against the mock, so mock-shaped mistakes (a full-width trend card the 540px chart cannot fill, 6px chip padding under a 44px floor) passed every check I ran. The screenshot-current-screen-first rule now in the queue exists because "judged against the mock" and "judged against the app" gave different answers twice in one batch.

**What did you not propose because it was out of scope?**
Widening the chart's 540px cap so a full-width card could work. The cap exists because the axis type scales with the viewBox; lifting it means re-cutting the chart's text rendering, which is its own item if the design ever truly needs a wide chart.

## Surprises

- **The review came back with zero defects for the first time**, and its two nits were both about honesty rather than behaviour: a comment overclaiming that the baseline fix holds everywhere (the empty state legitimately wraps at 700-820px), and a spec tolerance that passed by exactly 8px above ~1352px viewport - one token change from flipping silently. Both fixed.
- **`display:contents` did the desktop/mobile split cleanly** - the under-1024 two-column wrapper simply stops generating a box and its children join the outer grid. The reviewer verified the child rules still apply (DOM tree, not box tree) at 13 widths in both drill-down states.
- **Production will show a real What-moved row on day one** - P0001 logged +21.5% on 8 Aug, checked against `ing_price_history` before shipping rather than assumed from the fixture's empty state.
