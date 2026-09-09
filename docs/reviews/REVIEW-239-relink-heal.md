# REVIEW - 239 (the relink heal)

Reviewed-commit: 5d3db183e81c6634c08b0f6c31e107c959c1a509

**Agent:** the pre-push `code-review` agent, forced onto **Sonnet** (the batch ran on Opus), given the branch diff against `main` and nothing about the queue item.
**Outcome:** one critical finding, confirmed and fixed on the branch before push (commit 693cac6). Everything else came back clean.

---

## The report, verbatim

Confirmed at `js/app.js:5433-5449`. This is my primary finding; everything else below it is minor.

## Findings

### 1. `applyBarePidHeal` re-verifies the wrong thing — the plan can go stale between confirm and apply, and nothing re-checks the ownership invariant that makes the write safe

**Severity: critical** (can silently move a real plate's cost with no error, no warning, and no way for the user to notice — the exact outcome this feature exists to prevent).

`js/app.js:5217` `runBarePidHeal` computes `plan = barePidPlan(savedPlates, kitchenIngredients)` once, then hands that closed-over `plan` to `askConfirm`'s callback (`js/app.js:5480-5482`). The confirm dialog can sit open indefinitely — there is no re-plan on confirm. `applyBarePidHeal` (`js/app.js:5433-5449`) then does:

```js
(f.moves||[]).forEach(function(m){
  var l=lines[m.i];
  // re-checked against the array as it is NOW...
  if(!l || l.misc || l.kid || !l.pid) return;
  lines[m.i]={kid:m.kid, qty:l.qty}; moved++;
});
```

This re-checks only the **line's own shape** (still bare-pid, not since become `kid`/`misc`/empty). It never re-checks the thing that actually makes the rewrite safe: that `kById[m.kid].pid` still equals `l.pid`. `barePidPlan`'s whole safety argument, stated in its own comment, is `own.length===1` — i.e. the target ingredient is proven to own the *same* product as the line, at plan time. That proof is never redone at apply time; `kById` isn't even referenced inside `applyBarePidHeal`.

Concretely: plan says line X (pointing at product P1) should become `{kid:'K1'}` because K1 is P1's sole owner. While the confirm dialog is open, K1 gets relinked to a different product P9 (via `saveKingModal`, from another tab/device of the same account — plausible on a café's phone+register setup) and that change reaches this session because `window.addEventListener('online', function(){ bootstrapSync(); })` (`js/app.js:7735`) re-fires and replaces `kitchenIngredients`/`kById` (and `savedPlates`, via `savedPlates=(pla.data||[]).map(rowToPlate)` at `js/app.js:1352`) with fresh server state — a realistic trigger on flaky mobile data, which is this app's own documented usage pattern. The user then clicks "Fix N lines." `applyBarePidHeal` blindly writes `{kid:'K1', qty}` using the stale plan. The line's product silently changes from P1 to P9 — a real cost change, `dbPushPlate` persists it, and `logChange('plate_relinked', {..., avgBefore:null, avgAfter:null, ...})` records an entry whose figures are deliberately null, so nothing anywhere shows that a cost moved.

This directly contradicts the feature's own stated invariant, restated in the confirm text the user is agreeing to (`barePidHealMessage`, `js/app.js:5407`): *"Nothing costs a different amount afterwards."* That promise is enforced only at plan time, not at the moment of the write.

**How to verify:** read `applyBarePidHeal` (`js/app.js:5433-5449`) and confirm `kById` is never consulted. To reproduce: build a plan via `barePidPlan`, then mutate the ingredient's `pid` (simulating a relink or a `bootstrapSync` refresh) before calling `applyBarePidHeal(plan)` with the *original* plan — the line will be rewritten to point at the new product, and its cost will change, with no error and no flag. None of the tests in `tests/bare-pid-heal.test.js` exercise this: the "reshaped between plan and confirm" test block (`RESHAPED`, lines ~372-393) only mutates the *line's own shape*, never the target ingredient's `pid` or `kById`, so the gap is untested as well as unguarded.

I'm highly confident in the mechanism (it's a straightforward read of the code — the check that exists checks shape, not the value the safety claim depends on). I'm less certain how often the trigger condition (concurrent edit + resync landing inside the confirm-dialog window) occurs in Max's actual single-intermittent-user pattern, but the code path is real and the consequence, if hit, is exactly the "silently wrong cost" class this app treats as its worst-case failure.

---

Everything else I checked came back clean: `barePidPlan`'s exclusion order matches `lineProduct`'s exactly; the safety identity (`K.pid === l.pid` at plan time) is correctly proven; `healBarePidPlate`'s rollback-on-failure and rollback-on-rejection are both handled (roster 184a's lesson applied); the change-log entry's null figures are genuinely null (not `undefined`, so `logChange` doesn't backfill `avgAfter` from `computeAvgFoodCost()`); `plateToRow` already round-trips `lines` so the healed shape actually persists; the six cache-version spots agree at v197; the CSS `:not([hidden])` guard is present at both breakpoints as claimed; and the unit tests use `deepStrictEqual`/literal regex matches rather than the weak "was it called" pattern this repo has been burned by before. The one gap above is real and specific to the confirm-to-apply window.

---

## What was done about it

**FIXED, and the finding was right about all three of its claims — the defect, the mechanism and the remedy.** The repro reproduces exactly as written.

`barePidSameProduct(kids, kid, pid)` is a new function holding the one condition the heal's safety rests on: the ingredient about to be written already points at the product the line already points at. `applyBarePidHeal` calls it beside the shape check, so the plan's own proof is made again against the ingredients as they stand at the moment of the write, and a move that cannot be re-proved is skipped.

**One thing the finding UNDERSTATED, found while writing its repro:** the same window also breaks the plan's INDICES. `bootstrapSync` replaces `savedPlates` wholesale, so a plate can come back with its lines in a different order and `moves[i]` then names a different bare-pid line entirely — pointing at a different product, with the line's shape unchanged, so the shipped shape check passed it. That is the same silently-wrong-cost outcome by a second route, and it is likelier than the relink one because it needs no second device. The identity check closes both, because it asks about whatever line is actually at that index now.

Three tests were added: the pure identity (including that `null === null` must not read as "same product"), the finding's own relink repro, and the reordering case. `barePidSameProduct` is on the mutation gate.

**Also fixed, from writing those tests rather than from the report:** a plan that is entirely stale wrote nothing and said nothing — the user pressed "Fix 1 line" and got silence, which reads as success. It now toasts and repaints, and the repaint is pinned (the gate found it surviving as a deleted call).
