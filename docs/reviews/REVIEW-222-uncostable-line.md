# REVIEW-222 - a plate that cannot cost every line no longer reads as costed

Reviewed-commit: 9ce5bd069e4db7ca7173474b3ada2c64c4c8ae4f

Pre-push `code-review` agent, Sonnet against Opus 5, on `git diff main...HEAD`, without the brief or
the queue item in the prompt. Same independence caveat as 220 and 221: it was not handed the item, but
it reads the repo, which contains `docs/QUEUE.md`.

⚠️ **IT REVIEWED THE COMMITTED STATE WHILE FURTHER WORK WAS UNCOMMITTED, and said so.** Finding 1 was
already fixed in the working tree when the report arrived. That is recorded rather than tidied away,
because it is the most useful thing in this review: **the agent reached the same conclusion
independently, from the code, that the batch had reached by re-counting the item's enumeration.**
Finding 2 is genuinely new and was a defect in this batch's own work.

---

## The agent's findings, verbatim

> **1. CRITICAL — the branch, as committed, ships an incomplete fix, and it fails in exactly the "plausible-looking wrong figure" way the task warns about.**
>
> `git diff main...HEAD` (commit `b7bfc5f`) fixes `lineCost`, adds `costDetail`/`plateFullyCosted`, and repoints `dishesOverTarget`, `avgFoodCostForScope`, the Plates library, and Menu Analysis to the miss-aware total. It does **not** touch five other surfaces that compute the same "is this plate costed" question the old, buggy way — a raw `costFromLines(sp.lines)` / `>0` check with no `miss` guard, so a plate with an uncostable line (deleted product, or a quantity-less line before this same commit's own `lineCost` fix) is still silently included at its understated total:
>
> - `js/app.js:5681` and `:5694` — `digData('foodcost', …)` and `digData('plate', …)`, the Dashboard's "Highest food cost %" and "Highest cost per plate" dig-in cards
> - `js/app.js:6301` — `computeInsights`, the movers/drift/long-standing insight families
> - `js/app.js:6935` — `kpiStripHtml`, the Dashboard's own "Plates over target" / "of N costed" counts
> - `js/app.js:9439` — `renderMenuMarginPreview`, the publish-a-dish margin preview
> - `js/app.js:11823` — `eligibleDishes` (feeding `renderDishPicker` at `:11857`), the "Existing plate" add-to-menu picker
>
> All five will keep showing a confident, understated, too-green food-cost figure for the exact plate shape this batch's own commit message ("item 9: a plate that cannot cost every line no longer reads as costed") says it is fixing — the KPI strip and the two dig-in cards are the most visible instances, sitting on the Dashboard next to the numbers that *were* fixed.
>
> Separately and more urgently: the working tree at review time carries substantial **uncommitted** changes to `js/app.js`, `tests/dash-digin.test.js`, and `tests/insight-coverage.test.js` (all with `222:` comments matching this batch) that appear to close exactly this gap — but they are not committed. `git diff main...HEAD` does not include them, so if this branch is pushed/merged in its current committed state, none of it ships, and nothing in CI would catch the gap: the untouched test files at HEAD are byte-identical to `main` and test the old (matching) behavior of the old (matching) code, so they stay green while the Dashboard keeps lying.
>
> How to verify: `git status --porcelain` shows `M js/app.js`, `M tests/dash-digin.test.js`, `M tests/insight-coverage.test.js` as unstaged; `git diff main...HEAD -- js/app.js` contains no hunk touching `digData`, `computeInsights`, `kpiStripHtml`, `renderMenuMarginPreview`, or `eligibleDishes`; `git show HEAD:js/app.js | grep -n "costFromLines(sp.lines)"` reproduces the five raw, unguarded call sites above.
>
> **2. Minor/moderate — the same "silent zero" shape the diff fixes for quantity is left standing one branch over, for misc-line cost, and is now pinned by a test as intentional.**
>
> `costDetail`'s misc branch (`js/app.js` around the `costDetail` definition, ported unchanged from the old `costFromLines`): `var mc=Number(l.cost); if(!isNaN(mc)) c+=mc; return;`. `Number('')` is `0`, so a misc line whose `cost` is a blank string contributes a real `$0.00` to the total with `miss` never incremented — the identical `isFinite('')`/`Number(null)===0` trap CLAUDE.md says has already bitten this codebase twice, applied to the sibling branch of the very function this diff rewrote to fix that trap for quantities. The new test `tests/plate-cost.test.js` ("a MISC line never counts as missing…") explicitly pins `{cost:0, miss:0}` for `{misc:true, cost:'free'}` and defends it as correct ("it is a line worth nothing, which is what it says") — but that reasoning doesn't extend to a blank/garbage cost field, which means "never entered," not "entered as zero."
>
> Mitigating factor, stated plainly: reachability through the normal UI is low. `addMiscCost` seeds new lines at `cost:0` and `setMiscCost` writes `parseFloat(v)||0`, and `saveCurrentPlate`'s line mapper also does `Number(l.cost)||0` — so a live-authored misc line's stored cost is always already a coerced number, and `0` is a legitimate, UI-default value for a misc line in a way it never is for an ingredient quantity. The exposure is the same class the diff's own comment names for the quantity bug — "reachable from a restore, and from any plate saved before" the relevant rule — just less likely to occur in practice. I'm confident in the mechanism; I'm less confident it's worth blocking on, given the lower reachability.
>
> **No other findings.** `lineCost`'s new `(qty>0)?qty*c:null` guard is correctly typed (rejects `null`/`undefined`/`0`/`NaN`/`''` while accepting positive numeric strings), matches the codebase's own stated `isFinite('')` rule, and I could not find a legitimate live data shape (negative or zero quantity) it wrongly refuses. `costDetail`/`costFromLines` are a faithful split of the old function — verified by running the suite and by hand-mutating the `avgFoodCostForScope` guard (`d.miss===0` → `d.miss!==0`), which the new `tests/plate-cost.test.js` caught immediately. `plateIsCosted`'s deletion and its three (really four, counting the inline duplicate in `renderAnalysis`) call sites are all correctly repointed to the *stronger* question, and none of them wanted the old weaker one — the not-costed path in each case renders an explicit "not costed"/"not costed yet" label, never a silent blank. No duplicate top-level definitions were introduced. All 28 tests in `tests/plate-cost.test.js` + `tests/housekeeping.test.js` pass as committed.

---

## What was done about each

**1 — ALREADY FIXED when the report arrived, and shipped in commit `9ce5bd0`.** All five surfaces plus
`eligibleDishes`/`renderDishPicker` were repointed. The finding is recorded in full anyway, for two
reasons worth separating:

- **It is independent corroboration, not a duplicate.** The batch found the five by re-counting the
  item's enumeration (the item named 6 callers; there are 19) and the agent found the same five by
  reading the committed code. Two routes, one answer.
- **Its second paragraph is a real process warning and it was RIGHT.** A reviewer pointed at
  `main...HEAD` cannot see the working tree, so a batch that reviews before committing gets a report
  about a state it has already left. The agent noticed and said so explicitly rather than reporting
  confidently against a stale tree. **The lesson taken: commit before review, so the artifact and the
  reviewed state are the same thing.** This batch reviewed mid-flight and got away with it.

⚠️ Its parenthetical *"really four, counting the inline duplicate in `renderAnalysis`"* was checked:
the fourth site is the Menu row's `costed` computation, which this batch had already repointed to
`plateFullyCosted`. No fifth exists.

**2 — FIXED, and the review was right that the batch's own test defended the bug.**
The misc branch now treats an empty, absent or non-numeric cost as MISSING. **Zero is deliberately
left costed** — `addMiscCost` seeds a new line at 0, so it is a value someone chose in a way a blank
never is, and that asymmetry is now the content of the test rather than an unstated assumption. A
numeric string still costs, which `tests/plate-cost.test.js` has pinned since 0c.
⚠️ **The first draft of that test asserted `{cost:0, miss:0}` for `{misc:true, cost:'free'}` and argued
for it in prose** — *"a junk misc cost still is not a MISSING line — it is a line worth nothing, which
is what it says."* A confident defence of a defect, written into the file that exists to catch this
class, by someone who had just fixed the identical trap one branch away. It is inverted with the
reasoning recorded, because the wrong version is the instructive half.

The reviewer's own hedge — *"I'm less confident it's worth blocking on, given the lower reachability"* —
was not taken. It is a one-line change inside a function this batch was already rewriting, and leaving
it would have shipped a test actively asserting the wrong answer.

---

## Found by the gate, not by the review, and recorded here because it is the same batch's doing

222's exclusion made `computeInsights`' `if(!l || l.misc)` null guard **UNREACHABLE**: a null line
always increments `miss`, so the plate is filtered out before that loop. That is this repo's
"a fallback that cannot fire reads as a safety net and is not one" shape arriving from the opposite
direction — a live guard retired by a change elsewhere, with nothing but the mutation gate to notice.
The guard stays; the mutant carries a written allowance naming the condition that expires it.
