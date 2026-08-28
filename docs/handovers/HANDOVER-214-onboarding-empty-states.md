# HANDOVER - 214 (the Menu screen's dead control, and the empty-state voice)

**Branch:** `fix/onboarding-empty-states` (PR #229, merged) · **Scope:** `docs/QUEUE.md` item 6, "Onboarding — the empty-state decisions 190 did not take".
**Shipped `ezplate-v175`.**

## What changed

The Menu screen no longer offers "Existing plate" when there is no plate to add.
At zero costed plates the button sat in the header, and below 768 it moves into `#menuSwitchRow` where it wrapped onto its own row and read as an orphan, and it opened a modal whose entire content was "No costed plates found. Build and save a plate first."
Zero menus hides it too, because the screen is already showing "No menus yet." with its own action and an add-to-menu control beside it names a menu that does not exist.

It asks `eligibleDishes()`, the picker's own function, rather than defining "is there anything to add" a second time.
The button's visibility and the modal's emptiness are now the same answer read twice.

The item's other half is done as READING and is now a decision rather than a fix; see below.

## Review

`code-review` on Sonnet against work on Opus 5, on the branch diff, without a brief.
Report: `docs/reviews/REVIEW-214-onboarding-empty-states.md`.
**No blocking findings.**
It hand-traced the `&&` to `||` mutation against all three fixtures and confirmed the spec would catch an inverted guard, and separately confirmed the `[hidden]` origin trap does not bite here because `.plib-btn2` sets no `display`.

Two minor notes, both taken.
A comment now records that `menusList.length` is a proxy for what `submitAddDish` actually gates on, and that the two agree only because `buildMenuSelector` corrects a stale `currentMenuId` immediately before calling the guard.
And a fixture wrote misc lines as `{misc,name,cost}` where `savePlate` writes `{misc,label,cost}`; the agent called it cosmetic and I did not, because a fixture describing data the app cannot produce is the front half of roster entry 184(b).

## Into CLAUDE.md

**One rule, and it came from my own failure rather than from the code.**

**A green hook is not a green suite.**
`.githooks/pre-push` does not run Playwright; the browser specs take about seven minutes and are deliberately left to CI.
That trade is fine and is not the trap. The trap is reading "hook passed" as "everything passed", and I walked into it: this batch hid a control that `tests/visual/v158-header-actions.spec.js` asserts is on screen, and I pushed on a green hook and a green `npm test` having run only my own new spec.
**The rule: if a change alters whether a control exists, or any other precondition a screen's specs were written against, run the browser specs before pushing and grep the specs for the id.** The ones that break are about OTHER screens, which is exactly why the author does not think of them.

The same edit corrected a stale claim in that bullet: it said the hook runs two commands and it runs five.
The list is deliberately NOT enumerated there now, because it went stale by being enumerated once, and it points at the hook instead.

**Not fixed by adding Playwright to the hook.** Seven minutes on every push would be routed around with `--no-verify`, and a gate people skip is worse than an honest gap CI holds.

## New docs/QUEUE.md items

**None added.** Item 6 is REWRITTEN rather than deleted: its shipped half is gone and what remains is the copy decision, marked `blocked` on Max.

## New docs/PHONE.md items

**None.**

## Probe

**What did the queue item tell you to do that you would have done differently?**
Nothing about the first half; it named a real defect accurately.
On the second half it asked for the six empty states to be READ end to end, which is a task with no stated outcome, and reading them produced a finding the item did not anticipate: the inconsistency is real, it is only in the TITLES, and it is not arbitrary.
Five of the six fit a rule about whether you create the thing on that screen; the one that breaks it is "No menus yet.".
So the honest output was a decision with three rendered options rather than a fix, and the item now says so.

**What did you not propose because it was out of scope?**
Rewriting any of the six BODIES or CTA labels. They were read as part of the same pass and they are consistent, so proposing changes to them would have been scope I invented.

## Surprises

**CI caught a regression I should have caught locally, and the gap was in my own process rather than in the tools.**
Recorded above as the CLAUDE.md rule, and worth repeating here because the handover is where the honest account lives: three assertions in a spec about a different screen went red, and the reason I did not see them is that I ran `npm test` and my own new spec and called that green.

**The fix was to seed the spec's precondition, not to weaken its assertions**, and the difference matters: `v158-header-actions.spec.js` is the only coverage the mobile rehoming of that control has, so tolerating an absent button would have deleted the coverage rather than repaired it.
Its seed now carries a note saying it is load-bearing and naming what stops meaning anything if it is removed.

**And one bug of my own in the wait-and-merge loop**, mentioned because it is the same shape: I captured a CI run id before the newest push had registered its run, waited on the stale one, and tried to merge against checks that had not started.
Reading a green result that was answering a different question than the one asked.
