# HANDOVER - 275 (toast-bottom-stack)

**Branch:** `fix/toast-bottom-stack-clearance` · **Scope:** `docs/QUEUE.md` item 50, the bottom stack. Shipped deploy version **ezplate-v224**.

## What changed

**The toast stopped announcing a plate you just tapped.** `loadPlate` toasted `Loaded: <name>` on every open, and the breadcrumb and `#plateName` already name it.
That toast is also the one that landed on `#clearBtn` ("Start over") at 768, 900 and 1024, measured.
`openHealedPlate`'s toast stays: a minted plate has nothing else to announce it.

**The bottom stack has three publishers now, not one.** 226 built the pattern for the install banner and its comment stated the rule generally; two more elements reach up from the same floor and the toast was landing on both.
`.bld-bar` publishes `--bld-bar-clear` (its used `bottom` plus its measured height); an open bottom sheet's footer publishes `--sheet-foot-clear` (`modal.bottom - foot.top`, which a transform cannot skew).
The toast takes the **max** of those two, the banner's clearance and its own 92px dock, in one rule.

**`html.has-install-banner .toast` is deleted and the condition moved into the value.** Its (0,2,1) specificity was there to beat two `@media` blocks that set `left` and nothing else, so a single unconditional `bottom` has nothing to beat.
`hide()` now removes the inline `--install-banner-clear` with the class, or a dismissed banner would hold the lift forever.

**The measured before-state, and the item named one width of four.** A real-length toast (y616-708) overlapped `.bld-bar` at every width the bar is shown at: 380 (bar y635-735, covering `.bfs-save`), 768 and 900 (y700-800), 1024 (y701-800).
**And nineteen of the twenty sheets were already clear** - a `.mfoot` is 76px against a 92px dock. `#delChoiceModal`'s footer stacks three choices and is **127px**, so the toast sat on the delete-choice buttons. One sheet in twenty, and a test pins that the other nineteen do not move.

## Review

Sonnet, overriding the definition's `opus` pin because this batch ran on Opus. Report: `docs/reviews/REVIEW-275-toast-bottom-stack.md`.

**One Major finding, reproduced and fixed in branch.** `publishSheetFootClear` was the one publisher of three with no resize path: it ran only from `openOverlay`/`closeOverlay`, so widening past 768 with a sheet open left `--sheet-foot-clear` at 127px and the toast lifted to 139px over a centred dialog.
Reproduced before applying anything: align-items flex-end to flex-start, clear still 127px, toast still 139px.

**The remedy was decided rather than copied.** The finding framed it as a missing `ResizeObserver`, by analogy with the two siblings.
The right instrument is one `window.resize` listener: what changes is the viewport crossing 767, not any one overlay's size, and there are twenty overlays that come and go.

**The regression test asserts BOTH directions, which the finding did not ask for.** The widen is the cosmetic half; the **narrow back** is a toast returning to the delete-choice dialog's buttons, which is the defect this batch exists to remove, reintroduced by its own fix.
Deleting the listener turns that test red.

The reviewer also measured the `sheetUp` transform-cancellation claim at t=0 and at settle rather than accepting the comment's argument. It holds.

## Into CLAUDE.md

Nothing. Every trap this batch hit already has a rule, and both fired as written.

## New docs/QUEUE.md items

**97** - `.sync-banner`'s error state sits on `#bFootFigs` at 1024-1099. Measured at 1024, 1080 and 1099: banner x248-520.5 y740.4-776 against the figures at x240-370 y712.5-755.3, identical at all three.
The error and offline states never auto-dismiss, so it is a persistent pill over a figure on a costing screen.
**274 opened the band and nothing could have noticed:** it showed `.bld-bar` up to 1099 so the band would have a reachable commit control, and the banner's desktop corner was already there. `v141-sync-corner.spec.js` checks the banner against the toast and the install banner, which was the whole of the bottom chrome when it was written.

## New docs/PHONE.md items

None, and the entry test is why rather than the cap. Both new clearances are structurally inset-correct - one reads a used `bottom`, the other pure rects - rather than carrying a constant, which is the shape that made check 3 necessary in 230.
The failure would be a toast 34px off, not a wrong figure.

## Probe

**What the item told me to do that I would have done differently.** It states that `.bld-bar` publishes `--bld-bar-clear` as an existing fact; it did not exist anywhere. `docs/MAINTENANCE.md` said *"would publish"* and the queue entry dropped the conditional.
Both its line numbers were wrong: `loadPlate` is at 11384, not 9475 (which is `authApply`), and `loadMenuItem` does not exist at all - the sibling to keep is `openHealedPlate`, and `:9412` is comment prose about `APP_VERSION`.
Its sheet bullet asked for something broader than the defect, and the honest version is nineteen-of-twenty unchanged.

**What I did not propose because it was out of scope.** Giving `.sync-banner` the same clearance variable. That is item 97, and it needs §H's own corner reasoning re-measured rather than a fourth reader bolted on.

**Was any rule missing when I needed it.** No. `.claude/rules/css.md` loaded with `css/style.css`, and its `@media`-specificity section is why the old rule's (0,2,1) comment was read *before* deleting it rather than after - which is what showed the specificity was guarding `left`, not `bottom`.

## Surprises

**The item measured one width and the overlap was at all four the bar is shown at.** Above 768 it reaches only the bar's top 8px, so the symptom is a clipped "Plate cost" label rather than a buried button. Same defect, quieter, and a fix judged against 380 alone would have read as complete.

**The lift does not make a sheet toast-free and cannot.** At 380 the tallest sheet has 96px of headroom and a real toast is 91.5px, so no position clears a sheet entirely.
It moves what the toast covers from the footer's **controls** to the dialog's **title**, which is the right trade on a delete-choice dialog and is not the same as solving it. Recorded because the next reader will assume it did.

**My own test asserting the deleted CSS rule was gone went red on its first run, because the tombstone comment I wrote quotes that rule verbatim.**
That is `.claude/rules/tests.md` roster 183(a) - a grep over a source file searches PROSE as well as CODE, and the prose is written by the same person in the same hour - biting *inside the assertion written to check a deletion*.
The fix is one line (strip comments first) and it is now commented as its own worked example.
