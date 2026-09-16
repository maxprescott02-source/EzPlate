# HANDOVER - 278 (add-dish-picker)

**Branch:** `fix/add-dish-picker` · **Scope:** `docs/QUEUE.md` item 54. Shipped deploy version **ezplate-v227**.

## What changed

**The add-to-menu picker leads with what is missing.** `renderDishPicker` listed every costed plate alphabetically, so the plates already on the current menu sat interleaved among the ones you came to add - measured on four plates with two already on the menu, they landed at positions 1 and 3.
Plates not on the current menu now sort first; the ones already on it are dimmed and say **"Already on this menu"** instead of naming a menu the reader had to compare for themselves.
They stay selectable, because picking one UPDATES its existing entry rather than duplicating it.
The flag asks `menusOfPlate` directly. `plateMenuSummary` collapses to "2 menus" once a plate is on two, which names neither, so the summary string cannot answer "is it on THIS one".

**"Add plate" sits with the menu it adds to.** Measured at 1280 before the move: the button at y37-75 inside `.scr-head`, against `#menuSwitchRow` at y80-136 - the control and its own subject on different lines with the header hairline between them. It is in the switcher row at every width now, and `data-mobile-home` went with the move. `#menuNewBtn` stays, so the header keeps one action.

**Two of the item's four bullets were not work.**
❌ **"Offered at zero menus" DOES NOT REPRODUCE.** `updateMenuAddDishBtn` already hides the button at `!menusList.length` and `submitAddDish` already refuses on `!currentMenuId` - **batch 214**, whose comment at the site says *"Zero MENUS hides it too"*, with `214-empty-menu-action.spec.js` already asserting it. The item's cited `js/app.js:12509` is inside a PDF-parsing `catch`.
❌ **The builder card's "+ Add to another menu" is DECLINED: no such control exists.** Not in `index.html`, not in `js/app.js` - only in `docs/MAINTENANCE.md` and `HANDOVER-128` as deferred out of Q6 and never built. Building it would be a feature nobody queued.

## Review

Sonnet, overriding the definition's `opus` pin because this batch ran on Opus. Report: `docs/reviews/REVIEW-278-add-dish-picker.md`.

**TWO MAJOR findings, both real, both fixed here.** It served `main` and the branch side by side and measured the rendered page, which is what found the first.

**1. The menu switcher `<select>` was crushed across 768-1023.** The `>=768` sizing for that row was hand-tuned for TWO flex children; the move made it three at a width `data-mobile-home` never reached. Measured: **48px at 768** (blank), 72 at 800, 110 at 900, against 141-157 on `main`. Fixed with `.mnu-selwrap{min-width:150px}` - the content width of a two-word menu name plus the chevron.
⚠️ **Re-measuring turned up one the reviewer missed: at 1024-1059 the row now WRAPS** (80px against 56). Accepted, not fixed, and filed in `docs/MAINTENANCE.md` with the band - nothing clips or overflows, it is the wrap the phone already has, and un-wrapping it means re-tuning a `.plib-search` contract four screens share.

**2. Two pre-existing Playwright specs were red** - `v158-header-actions` and `fresh-states` - both still encoding "the action returns to the header at desktop". Rewritten honestly: Menu leaves the movers and gains the opposite contract asserted at 380/767/768/1280, with a counterweight that the header still holds exactly `['menuNewBtn']`, so deleting the button could not satisfy them.

**3. Minor, not fixed:** a shared `.plib-controls` comment now names one screen too many. The reviewer checked for a functional gap and found none; editing it is churn on a rule three screens depend on. Recorded at the site in the review.

⚠️ **AND A THIRD SPEC WAS RED THAT NEITHER I NOR THE REVIEWER FOUND** - `v134-menu-pills.spec.js`, which asserts the pills end on the list's right edge. With the button at the end of the row the pills stop ~101px short and the BUTTON holds that edge instead.
**It was caught by the exit-code fix, on its first use.** The run that found it printed `PLAYWRIGHT_EXIT=1` where four earlier runs in this session had printed `exited with code 0` while specs failed. Rewritten honestly - the property pinned is that the row's right-hand furniture lines up with the content column, which is unchanged; only which element carries the edge moved. That file had already had one such rewrite, in 232, for the same kind of reason.

## Into CLAUDE.md

**One line into `.claude/rules/tests.md`**, under the existing *"read the exit code, not the tally"* section, and it is this batch's own failure rather than a general observation.
**A pipeline throws the exit code away.** `npx playwright test | grep -v WebServer | tail -5` exits with `tail`'s status - so a run with two failing specs printed `exited with code 0`, and the five retained lines were the tail of a list the failures had scrolled off. The follow-up `grep -c "failed"` agreed, because the saved file only ever held those five lines.
**I reported "full Playwright green" four times in this session on that evidence.** The rule already said to read `$?`; it did not name a pipe as a way to lose it.

## New docs/QUEUE.md items

None. Item 54 is finished and deleted, struck in the consolidated file and in `docs/QUEUE-GROUPS.md`'s G5 line.

## New docs/PHONE.md items

None. Everything here is measurable in a browser and was measured in one.

## Probe

**What the item told me to do that I would have done differently.** Half of it was not work: one bullet was fixed four batches before the item was written, and one names a control that has never existed. Both were found by the premise check before any edit. Its `openAddDishModal` line number was 2,747 lines off, and its "59 plates / 40 that are not" counts are unverifiable - nothing in the repo carries them.

**What I did not propose because it was out of scope.** Re-tuning the shared `.plib-search` 320-400 sizing to stop the 1024-1059 wrap. Four screens use it; that is a shell-sizing change inside an item about a picker.

**Was any rule missing when I needed it.** No - and the one I needed most was already written and I did not operate it. `.claude/rules/tests.md` says to read `$?`. `HANDOVER-274` says measuring at the ends and generalising is how this repo gets layout wrong. I did both anyway.

## Surprises

**The mutation gate found a coverage hole the item was not about.** Pointing it at `renderDishPicker` for the first time returned SIX survivors, most of them in the SEARCH FILTER - behaviour this modal has always had and that no test touched, because every case I had written passed an empty filter.

**And then it found that my fixtures were too short to fail.** The last survivor collapsed one side of the comparator, and my groups held TWO plates each, already in order - **V8 leaves a two-element array untouched when the comparator always returns positive**, measured: `['Bacon Roll','Danish'].sort(()=>1)` comes back unchanged. A group of three fed in reverse kills it. Roster 184(b) in a new costume: the coincidence was the array's LENGTH.

**The review's first finding is `HANDOVER-274`'s own lesson, one batch later, by the same author.** That batch wrote down that it had measured at one width and generalised. This one screenshotted 1280 and 380 - the two widths where the row is fine - and shipped a blank select across everything between them. A rule being written does not make it operate, and the only thing that caught it was a second reader rendering both branches side by side.
