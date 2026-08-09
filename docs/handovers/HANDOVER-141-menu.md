# HANDOVER - 141 (V4a: the Menu screen)

**Branch:** `feature/v3-menu` (PR #114) · **Scope:** queue item V4a - Menu (spec §3.2).
**Deploy version shipped: `ezplate-v134`.**

## What changed
Desktop Menu tab is the v3 screen: switcher pills (name + mono food-cost %, active tinted, ≤5 menus) replace the visible select at ≥1024; the select stays the mobile control and the >5-menus fallback, and the two mirror each other on the one switch path.
The table wears the v3 column-label band, uppercase group rows, and the verdict cell's tint as a pill - all CSS, scoped away from the invoice review's shared classes.
The v131 verdict wording, the pinned header names, the 5-td row shape and the row-tap edit modal are untouched.
Mobile is unchanged until V9.

## Into CLAUDE.md
Nothing proposed.

## New docs/QUEUE.md items
None new. Two notes attached to existing items: the "N more ▾" pills overflow rides the floating-layers item (Do after V6), and the 6th-menu pills-to-select swap has no explanatory copy - flagged for Max's eye below rather than queued as work.

## New docs/PHONE.md items
None - the phone screen did not change. (An iPad at 1024 gets the pills with a 44px coarse-pointer floor; G2's tablet pass will judge it properly.)

## Probe
**What did the queue item tell you to do that you would have done differently?**
The mock's "N more ▾" overflow and its "New plate" header button. The first needs the V6 layer system (building a floating layer on this tab now would re-open the exact bug class v90 closed); the second mislabels the tab's action - it creates menus and publishes existing plates, not new plates.
**What did you not propose because it was out of scope?**
Copy explaining why pills disappear at 6+ menus (the select takes over silently). Max should see it once: if it reads as breakage, it needs a line of copy or the V6 overflow sooner.

## Surprises
The review's first major repeats V1's sideSettings lesson in miniature: the pills re-render on their own click, so focus fell to `<body>` on every switch - and at desktop the pills are the ONLY switcher. Focus now lands on the new active pill.
The second major: the unit file claimed the click path was "driven in Playwright" and no such spec existed - the whole onclick could be deleted green. The claim is now true (`v134-menu-pills.spec.js`), and the harness states plainly what it does NOT execute.
Also caught: the first cut shrank the verdict figure to the mock's 11.5/500, quietly reversing v122's recorded "reads at table size" decision - the cell keeps its size and gains only the tint.
The stub-lies pattern hit a third time (a hand-rolled `esc` missing `>`); the real function is now extracted instead. Three batches running, the same lesson: stubs must mirror real contracts or say what they skip.
