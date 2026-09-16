# HANDOVER - 276 (sync-banner-builder-bar)

**Branch:** `fix/sync-banner-builder-bar` · **Scope:** `docs/QUEUE.md` item 97, the sync pill against the builder's summary bar. Shipped deploy version **ezplate-v225**.

## What changed

**The sync pill no longer sits on the builder's "Plate cost" figure.** `.sync-banner` is pinned bottom-left from 1024 up and `.bld-bar` is a fixed bar on the viewport floor hidden only at 1100, so from 1024 to 1099 they were the same region.
Measured at 1024, 1080 and 1099 with a costed plate and the install banner dismissed, identical at all three: the pill's error state (x248-520.5, y740.4-776) over `#bFootFigs` (x240-370, y712.5-755.3).
The error and offline states never auto-dismiss, so this was a permanent pill over a figure on a costing screen.

**The fix is a CHAIN, and that is the whole finding.** §H's corner rule now docks the pill above `--bld-bar-clear`, and the pill publishes `--sync-banner-clear` for the toast.
⚠️ **Lifting the pill alone was not enough and created a second collision:** measured, the pill and the toast both landed at `bottom:111px` at 1024-1099, overlapping x440-520.5 — and `pushWrite` fires `setSync('error')` and `toast()` in the same breath, so that pair is the error path's ordinary case rather than a contrived one.
So the bottom stack is bar → pill → toast, each publishing its reach and each reading the max below it.

⚠️ **The obvious cascade read was silently inert, and this is the durable part.** `publishSyncBannerClear` has to know whether the pill is docked to the floor. §H sets `top:auto`, so `getComputedStyle(el).top === 'auto'` reads as exactly that test.
**It is not: a positioned element's computed `top` is the USED value, with `auto` already resolved to pixels.** Measured, not reasoned: `top` comes back `740.406px` at 1024 and `bottom` comes back `738.812px` at 380, so each property reports a real offset at the width where its own rule says `auto`.
The first cut used `top!=='auto'`, which is true at every width, so the publisher returned `0px` always. Nothing went red; the repro simply did not move.
It reads `transform` instead — §H sets `transform:none` to cancel the base rule's `translateX(-50%)`, and a computed transform is `none` or a matrix with nothing in between.

## Review

Sonnet, overriding the definition's `opus` pin because this batch ran on Opus. Report: `docs/reviews/REVIEW-276-sync-banner-builder-bar.md`.

**No findings at severity.** It did not review by reading alone: it ran the suite and then wrote five ad hoc Playwright probes over states, widths and heights the shipped specs do not reach, and deleted them after.
It confirmed the chain has no staleness window and cannot recurse, that `transform` is correct at every breakpoint touching that selector, and that all four `setSync` exit paths republish.

**One nit was acted on although it was below its own bar**, because this file's own header is the argument: `v141-sync-corner.spec.js` opens with *"THE STATES ARE THE POINT... testing 'ok' alone is how this stayed invisible"* and names both non-dismissing states. My new block asserted only `error`. It is parameterised over `error` and `offline` now, 20 cases to 28.
The other nit (`doing` status, `STATE.json` batch) is pre-handover state and the reviewer said so itself.

**And the MUTATION GATE found what the review did not.** `publishSyncBannerClear` survived a `||`→`&&` flip. Not an equivalent mutant to allow: `cs` was assigned `h ? getComputedStyle(sb) : null`, so `!cs` and `!h` were the same test written twice and the `||` between them could never decide anything.
**The remedy was to delete the dead clause, not to write a reason for keeping it.** Re-run scoped: 4 mutants, 4 killed, 0 survived.
The two instruments asked different questions — the reviewer whether the condition was CORRECT, which it was, and the gate whether every part of it MATTERED, which one part did not.

## Into CLAUDE.md

Nothing, and the one candidate was considered and declined. *"A computed value is not the declared one"* is a genuinely new instance, but `.claude/rules/css.md` already carries the family it belongs to — *"a declaration is not an enforcement"*, with `[hidden]`, `min="0"` and `revoke … from public` as its three costumes — and this is a fourth costume rather than a new rule.
It is written out at the site and in the test that exists because of it, which is where a reader hits it.

## New docs/QUEUE.md items

None. Item 97 is finished and deleted, and struck in `docs/QUEUE-GROUPS.md`'s G5 line.

## New docs/PHONE.md items

None. Everything here is at 1024 and above, which is a desktop width, and the phone cannot reach it.

## Probe

**What the item told me to do that I would have done differently.** Its framing said the bar is *"a full-width fixed bar from 640 to 1099"*; the base rule shows it from 0px and it is offset by the nav rail in that band, so neither half was right. Corrected in the item before planning, because "from 640" invites a fix aimed at a band three times too wide.
It also said the fix *"must not be solved by giving the banner the same variable without re-measuring §H's own reasoning"*. Re-measured, and §H is untouched: its argument is about the TOP band, and lifting the pill by the bar's height keeps it bottom-left and out of that band.

**What I did not propose because it was out of scope.** A general "bottom stack" abstraction with one accumulator. Four publishers now read and write four variables, and a fifth would be the moment to build it — but the CSS `max()` cannot go stale and a shared accumulator can, so the cheap version is still the right one.

**Was any rule missing when I needed it.** No. `.claude/rules/css.md` loaded with `css/style.css`, and its `position:fixed` section is why I read the cascade to decide "is this docked" rather than assuming the breakpoint.

## Surprises

**Fixing one collision created another, and only measuring found it.** The pill and the toast at the same `bottom` is not a state either element's code mentions.

**My own new four-way test was GREEN against the defect it was written for.** Playwright's fresh profile has the install banner up, which docks the bar above it and puts the banner between the pill and the bar, so there was nothing to collide with. That is also the rare state: the banner is dismissed for good after the first visit, and `226-bottom-stack.spec.js` says so at its own conditional test.
**The defect lives in the ordinary state and the fixture had the extraordinary one.** Found by reverting the fix and watching nothing happen, not by reading. Both are parameterised now, and the revert turns three red.

**And 275's own assertion had to be relaxed one batch later, correctly.** It asserted the toast docks at exactly `--bld-bar-clear + 12`, which encoded "the bar is the tallest thing on the stack" — incidentally true then, false as soon as the pill sat between them. The bar tests now silence the pill and own the bar's arithmetic; `v141-sync-corner.spec.js` owns the split. One concern per file.
