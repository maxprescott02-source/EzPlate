# REVIEW-253 — the invoice's completion message waits for the writes

Reviewed-commit: b9e79fca67fce787ce9ae1e1819399ac95eaf929

**Agent:** `code-review`, run on Sonnet (the batch ran on Opus 5).
Given the diff and the codebase conventions, and **not** the queue item, so it judged correctness rather than conformance.

**Three findings — two major, one minor. All three acted on; none declined.**

⚠️ **Both majors are the same shape and it is this batch's lesson: the decisions that were wrong were the ones buried inside `applyInvoice` where nothing could run them.** The mutation gate had already made that point about the count before the review did — it survived a mutation while inline — and I extracted that one and left the other. The reviewer found the other.

---

## The report, verbatim

> ## Finding 1 — A hung write means the completion toast, and the price-trend point, never fire at all (major, confident on mechanism)
>
> Before this diff, `showImportSummary` fired synchronously and unconditionally right after the write loop — the user always got a completion card, even a wrong one. Now it fires only once `Promise.all` over every `priceWrites` entry has settled (`importKeptCount`).
>
> `pushWrite` is documented in CLAUDE.md as never resolving to `null` and always settling — but that's only true if the underlying `SUPA.from(...).upsert(...)` promise itself settles. `SUPA` is created with no timeout (plain `createClient`), and the codebase elsewhere explicitly acknowledges this exact gap ("an empty app, and a slow fetch would too... has no timeout"). If one `fetch` genuinely stalls (flaky café mobile data, exactly the environment CLAUDE.md says this app runs in), `pushWrite`'s `.then` chain has nothing to resolve, `dbPushIngredients`'s promise never settles, `Promise.all` in `importKeptCount` never resolves, and neither the completion toast nor `logHistory()` ever runs — for that import, permanently (or until the user gives up and reloads). Previously the toast (even if occasionally wrong) always appeared instantly, so the user was never left with zero feedback. Now a stalled write silently converts "false completion" into "no completion at all," which is arguably worse under this app's own stated design rule ("would rather be told a thing did not save than discover it next week").
>
> ## Finding 2 — `logHistory()`'s new gate is scoped to price-only writes, but a king-repoint's cost movement (triggered via the same import) is never represented in that gate (major)
>
> `applyInvoice` runs the invoice's immediate (non-guarded) ingredient repoints synchronously, before the async block — `k.pid=rp.pid` reassigns an *existing* kitchen ingredient to a new product, which can move the cost of every plate that already uses it. This only happens via the `addNew` branch (`kact.action==='repoint'`), which always increments `added`, never `n`, and never pushes anything to `priceWrites`.
>
> So: an invoice apply consisting of an add-new row that repoints an existing kitchen ingredient, with no other row landing a confirmed price write in the same import (e.g. a single-line invoice, or every other line refused/rebased), produces `kept===0` even though a real average-moving change just happened. `if(kept) logHistory();` then silently skips logging the trend point.
>
> Before this diff, `logHistory()` ran unconditionally whenever `n||added`, so it reliably captured this movement — and the code around `confirmGuardedRepoints` (comment "the invoice's own logHistory (applyInvoice) fired before these were applied") confirms that applyInvoice's own call was relied on specifically to cover the *immediate* repoints. This is the identical failure class v114 was written to fix ("an ingredient repoint... put no point on the line" — see `tests/history-paths.test.js`'s own file header), reintroduced in this one narrower branch. No test in this diff exercises "invoice apply, immediate repoint, zero successful priceWrites" — the gap is unguarded.
>
> ## Finding 3 — The headline's "X prices" count and the new shortfall line's "kept of attempted" count use two different definitions of "price," on the same card (minor/UX)
>
> `bits.push(changes.length+' price'...)` counts rows in `priceChanges`, i.e. only rows whose price moved by more than 0.5%. The new shortfall line counts every price-write attempt, including rows that re-confirmed an unchanged price. These can legitimately diverge and would render as "2 prices ▲▼" next to "9 of 10 prices saved" on the same toast — two different counts both called "prices," with nothing distinguishing them.
>
> ## Minor/scope note
>
> The add-new branch's own product-creation write, and the pack-teach write, are never collected into `priceWrites` either, so a failure there is invisible to the new shortfall line — it only ever reports on the "existing product price update" branch. This may be intentional scoping for item 90's "first instance", but it means "X of Y prices saved" doesn't cover everything the import wrote, which is worth being explicit about if not already.

---

## What was done about it

**Finding 1: FIXED, and the reviewer's framing of the trade is the right one.** The old code was wrong and always spoke; unbounded, the new code would have been right and silent — and by this project's own stated rule about its user, silence is the worse of the two. It is `CLAUDE.md` roster 195 (*a promise that never settles is a third outcome*) arriving in the app rather than in a test.

The verdict is bounded, and **`null` is that third value**: "no answer yet", rendered as its own sentence rather than as a count. `0 of 36 saved` and `we do not know yet` are different claims and only one of them is true there — which is the same distinction the original defect got wrong in the opposite direction.

**Finding 2: FIXED, and it is the more embarrassing of the two** — a fix that reintroduced a defect v114 exists to have fixed, in the one branch the tests did not reach. `importMovedCost(kept, relinked)` is now extracted and pinned, including that a null verdict logs nothing on its own while a repoint alongside it still counts.

**Both majors were decisions buried in a 500-line function.** The gate had already proved that about the count — the tally mutation survived while it was inline — and I extracted that one and left this one inline. The reviewer found exactly the one I left. **The lesson is not "extract more", it is that a decision nothing can run is a decision nothing has checked**, and I had the evidence in hand and applied it to only half the problem.

**Finding 3: FIXED.** The shortfall line says "price writes"; the headline still says "prices" and still means rows that moved. Two meanings, two words, on a card where both appear.

**The scope note is acknowledged and stated in the item**: the shortfall covers the price-update branch only, not product creation or pack teaches. That is deliberate for this instance and is now written into item 90 rather than left implied.

⚠️ **And a cost this batch measured on the way past: testing a timeout makes the mutation gate pay for it.** Every mutant of `importKeptCount` that breaks the race waits out the test's own timeout. At 5000ms the full gate went **240s → 588s**; at 400ms a broken-bound mutant costs **0.49s instead of 5.12s**. The bound under test is 20ms, so 400ms is twenty times the headroom it needs. **Bound the test as well as the code**, or a guard against hanging becomes a reason the guard against untested code hangs.

**Verification after all three:** `npm test` 2073 pass · `npm run smoke` pass · full mutation gate 1281 mutants, 1233 killed, 48 survived all with written allowances. Each fix hand-mutated and confirmed red **by exit code, not by the tally** — a broken bound surfaces as a TIMEOUT, and `node --test` reports those as `fail 0`.
