# HANDOVER - 268 (subtitles)

**Branch:** `batch-268-subtitles` · **Scope:** `docs/QUEUE.md` item 58, "Screen subtitles and status copy" (consolidated backlog item 58).
**Deploy version shipped:** `ezplate-v217`.

## What changed

The `.scr-sub` slot meant four things across seven screens.
It means one now: **scope or a count, never a sentence**, and `tests/terminology.test.js` pins the SHAPE rather than the seven strings, so it fails on a sentence and not on Max rewording one.

Invoices said *"Imports update product prices automatically"* directly above a dropzone saying *"Nothing changes without your review."*
Both shipped, written by different batches, and a reader going top to bottom got the false one first.
The subtitle is deleted rather than reworded; the promise already lives in the body.
The "Recent imports" heading over a sentence apologising for the absence of recent imports is gone too, and what is kept is the half that says where a changed price CAN be found.

Settings names its cards; three copy slips fixed ("your phone's setting" on a screen read at 1360, `Off = imports stay fully offline`, and a help line promising billing).
Account's subtitle is scope, the Plan card is removed, and so is the More row's promise of it.
"Version v217" said version twice - fixed at the concatenation, because `APP_VERSION` keeps its `v` for the six cache spots that mirror it.
The Team card's three badge treatments become one `.team-tag`, with the one colour variance kept for "invited" because it is the only one naming work somebody still has to do.

⚠️ **THE INGREDIENTS COUNT COULD NOT DO WHAT THE ITEM ASKED, AND THIS IS THE FINDING WORTH CARRYING.**
`.scr-sub` is `display:none` below 768 - **the header subtitle slot does not exist on a phone.**
So *"move the line into the header sub"* renders perfectly at 1360, keeps the whole suite green, and **silently deletes the count on the device the app is mostly used on.**
Found by rendering the screen at 380.
The count is computed once (`kingUnlinkedClause`) and rendered into both the sub and `#kingProgress`, with the hide written into the SAME `@media (min-width:768px)` block that shows the sub, so exactly one is on screen at any width.
The same applies to the Invoices date, which stays in the body for the same reason.
`tests/king-head-sub.test.js` pins one-source-two-sinks and the breakpoint pairing.

**Premise check:** every line citation in item 58 was wrong - about nineteen lines of drift, most landing inside block comments - while every named literal existed.
Three corrections: "Account and team" names nothing (the site is the Settings → Account card's help text); `#kingHeadSub` was never an empty slot; and **the item's proposed string was arithmetically wrong**, reading 164 as an ingredient count when it was the count of linked products.
Its enumeration was also short by one - the More row promised the Plan card the item removes.

**One bullet deleted, does not reproduce.** `renderManageMenusZero` already offers exactly one obvious action; only its TITLE is out of step with `emptyStateHtml`'s rule. Copy is Max's, so it is proposed and not taken: **"No menus yet." → "Create your first menu"**, matching what 217 did to the Menu tab. Filed in `docs/MAINTENANCE.md`.

## Review

The `code-review` agent ran on **Sonnet**, overridden from its pinned `opus` because this batch ran on Opus.
Five findings. **All five were real and all five are fixed in this branch.**
Four were comment or dead-code rot I had introduced: a spec comment still claiming `#kingProgress` was deleted (from the abandoned first attempt), a wrong CSS citation, the now-dead `.stg-soon` rule, and a stale comment in an untouched file that this change falsified.
The fifth was substantive: the new test located the media block by slicing to the next `@media` token, so moving the hide to top-level CSS would have left it green while reintroducing the exact both-places bug it exists to stop.
It walks braces now, and was proved red against the reviewer's own scenario.
Full report and disposal: `docs/reviews/REVIEW-268-subtitles.md`.

**Gates.** `npm test` 2312 tests, 0 fail.
Mutation gate, full run: 1408 mutants, 1354 killed, 54 survived with all 54 carrying a written allowance, exit 0.
Playwright 480 passed, 14 skipped, 0 failed. Smoke: all checks passed.
A browser agent drove all five changed screens at 380 and 1360 in both themes and **measured computed styles** across the breakpoint, the wizard toggle and the zero-unlinked state: the count shows exactly once at every width, never twice and never in neither place.

## Into CLAUDE.md

`.claude/rules/css.md` gains **"A SLOT THAT DOES NOT EXIST AT EVERY WIDTH IS NOT A HOME"** - the breakpoint fact, the one-source-two-sinks remedy, and the inline-style trap underneath it.
It lives there rather than in `CLAUDE.md` so it loads with the stylesheet it protects. Nothing in `CLAUDE.md` itself changed.

## New docs/QUEUE.md items

`project-audit`, above every unblocked item: newest audit is `AUDIT-v207` and this ships v217, a gap of 10, which is `skills/batch` step 10's trigger.
Its entry carries one specific instruction - items 61-64 all touch screen headers and none of them knows about the 768 rule.

## New docs/PHONE.md items

None.
Every width question this batch raised was settled by a browser agent measuring computed styles, which by the five-things test is an agent check.

## Probe

**What the item told me to do that I would have done differently.**
"Move it into the header sub", twice, for the reason above - it is a data-losing instruction on a phone and nothing in the item could have known.
And its own replacement string, which would have printed a confidently wrong count on a costing screen.

**What I did not propose because it was out of scope.**
Consolidated item 79's bullet naming `tests/terminology.test.js` as one of four files reading `js/app.js` by hand instead of `loadApp()`.
This batch opened that file, but taking one bullet of a four-file item leaves it half-struck and the next reader cannot tell which three remain.

**Was any rule missing when I needed it.**
Yes, and it is the one this batch shipped and then caught: `.claude/rules/css.md` had nothing about a slot that is not rendered at every width.
It does now.

## Surprises

I killed the mutation gate mid-run believing it was editing `js/app.js` under me.
It was not - it works in a per-pid sandbox copy, which `HANDOVER-267`'s own Surprises section had already recorded, in this repo, three days ago.
The belief cost about eighteen minutes and one full re-run.

Narrowing a regex in `tests/smoke.js` to strip the `v` broke a second consumer of the same variable three hundred lines below - the backup stamp's `app_version`, which stores `APP_VERSION` verbatim.
One constant, two renderings, and only one of them strips.

My own comment recording that "Recent imports" was deleted made a negative grep assertion fail, because a grep searches prose as well as code.
That is roster entry 183(a), biting inside the sentence written to record the deletion.
