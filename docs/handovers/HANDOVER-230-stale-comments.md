# HANDOVER - 230 (six stale comments, and `--bottomnav-h` made real)

**Branch:** `chore/stale-comments` · **Scope:** a maintenance sweep, run as its own batch because `docs/QUEUE.md` has nothing unblocked left. Takes AUDIT-v186's six shipped comments that the code disagrees with, plus the two files carrying an incident count `CLAUDE.md` disowns. **Shipped `ezplate-v189`.**

## What changed

**X1 grew, and it is the only one that changed behaviour.**
`css/style.css` docks the builder's summary bar with `var(--bottomnav-h, 64px)` and its own comment two rules below said the offset "is measured against `.bottomnav` rather than assumed".
Nothing anywhere defined the variable, so the fallback had been the live value since the rule was written.
Measured: the tab bar is 65px at 380 and 67px at 600, so the summary bar — which has held SAVE since 177 — was docking 1 to 3px INTO it at every phone width.
The fallback was wrong as well as unpublished, which removed the cheaper remedy the entry offered, so `js/app.js` publishes the measured height with the orientation guard v141 already uses.
`.bottomnav` IS the left rail at 640 and up, and publishing 800px as a bar height would push the summary bar off the screen.

**X2 and X3** said the backup format "accepts 2 and 3" and that a line below was "a flat `format:3`", both falsified by 219.
They now say which function holds which kind of number and quote neither.

**X4** — the module's write-map named `dbPushIngPrice`, which `saveIngLog` has not called since 193.
The map is fixed and the wrapper is deleted: three separate audits had found it, and nothing outside comments referenced it.

**X5** was three comments quoting the Menu tab's pre-217 copy.
They quote no copy at all now, which is the only version that cannot rot.
The two LIVE uses of "No menus yet." in `renderManageMenusZero` are correct and were left — the audit read them as stale and they are not.

**X6** — one comment cited a spec deleted when the builder became a page, the other cited a spec that has never existed in this repo's history.
Named as gone rather than repointed, and the real guard named.

**And the two disowned counts.** `.githooks/pre-push` said "Four checks" above five, and quoted "ten instances across batches 165-176"; `tests/semantic-keys.test.js` cited a "fourteen-incident rule" against a roster at 22.
216 declined these because touching those files costs a mandatory review — a cost this batch was paying anyway.

## Review

Pre-push `code-review` agent, Sonnet against Opus 5, on the branch diff, without the maintenance entries.
**One Major finding, confirmed by reproducing it, and it is the most valuable thing in this batch.** `docs/reviews/REVIEW-230-stale-comments.md` has the report verbatim.

It ran the mutation my own new spec comment described and got the opposite result: with the `load` listener present, deleting the eager `publishNavH()` leaves all five tests green, because `page.goto('/')` waits for `load`.
So the comment claiming that test protected the line from being deleted as dead code was false.

**The comment was true when written and stopped being true two edits later, inside the same batch.**
The mutation was real at the time — there was no `load` listener then, and deleting the eager call did turn the no-ResizeObserver test red.
Adding `load`, itself a fix for a hole that same test had found, silently retired the mutation the comment was boasting about.
That is this batch's own subject happening to the batch.

The resolution was to delete the eager call rather than keep a line no test can defend: measured, it published nothing anyway, because `.bottomnav` is 0 high while the document is parsing.
Its nit on the swallowed `ResizeObserver` constructor is taken too — the fallback is chosen on whether the observer actually worked, not on whether the name is defined.

## Into CLAUDE.md

**Nothing**, and this was the closest call of the session.

The shape — a comment correct when written, falsified by a later change that never re-read it — is what the whole batch is about, and `CLAUDE.md` already carries it twice: as the general rule that a stale fact is worse than no fact, and as batch 227's section on a comment recording the defect correctly and filing it under the wrong consequence.
What is new here is only that the interval was two edits rather than two years.
The roster's instruction is to add a bullet when the SHAPE is new; a shorter interval is not a new shape, and adding one would make the file longer for a case its existing rules already name.

## New docs/QUEUE.md items

**None.** The queue is unchanged and still has nothing unblocked: 2b deferred indefinitely, 5 waiting on Max's go on the day, 8 waiting on his answer to `docs/decisions/2026-09-02.md`.
Two `docs/MAINTENANCE.md` entries are struck as done.

## New docs/PHONE.md items

**None.**
The 1 to 3px change is measured at both phone widths in a browser, and it moves the bar OFF the tab bar rather than onto anything.

## Probe

**What the item told me to do that I would have done differently.**
The maintenance entry offered two remedies for X1 — publish the variable, or delete it and write the 64 with a reason — and the second is not available, because 64 is measurably wrong.
An entry that offers a choice has assumed both branches are honest; this one had not been measured when it was written.
That is worth more than it sounds: the entry was filed by the batch that BUILT the equivalent mechanism for the install banner four batches ago, and still guessed at this one.

**What I did not propose because it was out of scope.**
Auditing every other `var(--x, fallback)` in the stylesheet for the same shape — a variable read with a plausible fallback that nothing publishes.
`--bottomnav-h` was found because an audit happened to notice the comment, not because anything looks for the pattern, and a fallback that is merely wrong rather than absent has no symptom at all.
It is a real sweep and it is not a comment fix.

## Surprises

**The most-recorded defect class in this repo bit inside the batch fixing its cousin, and the pre-push review caught it.**
Nothing shipped wrong, and the interval is the interesting part: two edits, both mine, twenty minutes apart.
The rule that a claim must be re-checked when the thing it describes changes does not have a grace period for the same author in the same sitting.

**A test found a real defect in my own implementation before the review did.**
Writing the no-ResizeObserver case revealed that the eager publish measured 0 and published nothing, so without `ResizeObserver` the wrong fallback would have stood for the whole session.
The mechanism looked complete and was half-dead, and only removing the constructor showed it.
