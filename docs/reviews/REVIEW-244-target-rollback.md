# REVIEW-244 — a refused food-cost target takes the number back with it

Reviewed-commit: a0f745e3bcef871f63206f608f72e87cd79c6dfc

**Agent:** `code-review`, run on Sonnet (the batch ran on Opus 5).
Given the diff and the codebase conventions, and **not** the queue item, so it judged correctness rather than conformance.

**One finding, a major, and it was mine.**
It was reproduced independently before being acted on, per `CLAUDE.md`'s rule that a finding's defect, mechanism and remedy fail independently — all three held here.
The reviewer's own note about scope is kept verbatim below and is worth reading: it reviewed the committed diff plus the working tree, which is what was going to ship, and said so rather than reviewing half the change silently.

---

## The report, verbatim

> ## Review: branch `244-target-rollback` vs `main`
>
> **Note on scope first:** `git diff main...HEAD` only shows the committed commit (`375b444`). The working tree has *uncommitted* changes on top of it in `js/app.js` and `tests/visual/244-target-rollback.spec.js` (confirmed via `git status --porcelain`) — the debounce/flush-on-blur logic and the visual spec only exist uncommitted. I reviewed the full diff against `main` (committed + uncommitted), since that's what will actually ship, but flagging this because if this gets pushed as-is those changes need to be committed first.
>
> ### 1. Major — `cogsServer` can regress to a stale value when two persisted writes both succeed out of order, and a later refusal then rolls the screen back to the wrong number
>
> `js/app.js:3307-3324` (`setCogs`), specifically line 3312: `if(r && !r.error){ cogsServer=pct; return r; }`.
>
> This unconditionally sets `cogsServer` to whatever value *this* request was for, on any success — with no check for whether a *newer* request has already landed a different confirmed value in the meantime. The debounce (500ms) plus the flush-on-`change` (blur/Enter) mean two persisted writes for two different values genuinely can be in flight concurrently — e.g. type "30", wait 500ms (write A sent), then before A's response returns (plausible on the mobile connections this app explicitly targets), type "35" and tab away, which flushes immediately via the `change` handler (write B sent). Network responses have no ordering guarantee relative to send order.
>
> I measured this against the real extracted `setCogs`/`cogsRound`/`applyCogs`, not reasoned about it:
> - Both writes (30, then 35) succeed, but B's (newer, 35) response arrives first and A's (older, 30) arrives late → `cogsServer` ends at **30**, even though the screen shows 35 and 35 is what the server actually holds.
> - A subsequent refusal (e.g. the exact "transient owner-role lookup fails" scenario this batch was written to fix) then rolls `cogsPct` back to `cogsServer` = **30** — a number that is neither what the user last confirmed nor what the server row actually contains (35).
>
> Full repro output:
> ```
> after both successes: cogsPct= 35  cogsServer= 30 (should be 35, actual server state)
> after the refusal, screen rolls back to cogsPct= 30
> ```
> This is precisely the class of bug this batch exists to fix ("a wrong number on a costing screen"), reintroduced one layer up by the fix itself. The codebase already has a precedent for this exact shape of problem (`gemToken`, used to invalidate a late-arriving async response) that wasn't applied here — there's no generation/sequence counter gating which response is allowed to update `cogsServer`.
>
> **Test coverage gap that lets this through:** `tests/cogs-rollback.test.js` has a test for two overlapping writes where both are *refused* (`'both settle orders'`, either order) and one where the newer succeeds and the older refuses late — but no test where **both succeed** and resolve out of order. That's exactly the missing case.
>
> **Confidence:** high — measured directly against the real shipped functions via `tests/_extractfn`, not inferred.
>
> **Severity judgment:** major rather than critical — it requires two overlapping persisted writes to actually be in flight together and resolve out of order, which needs an indecisive edit within one round-trip of the first save. Plausible on the mobile latency this app is designed around, but not the common case.
>
> ### Everything else checked and found correct
>
> - `resetTenantState` (line ~1439) resets both `cogsPct` and `cogsServer` together — verified against `tests/tenant-switch.test.js`'s new assertion that a café switch doesn't leave A's confirmed target as B's rollback target.
> - The boot read (`bootstrapSync`, ~line 1733) correctly rejects out-of-range rows rather than clamping them, and rounds through the same `cogsRound` both the setter uses.
> - The `cogsPct===pct` guard in `setCogs` correctly avoids clobbering a newer local edit with a refusal of a superseded one — verified this against the two "settle order" tests, and by hand-tracing several typing sequences.
> - `cogsRound`'s one-decimal precision is exercised across the full [1,99]×0.1 range with no floating-point display mismatches between raw concatenation and `fmtTargetPct` (checked numerically — no case where `String(cogsRound(x))` has more than one decimal digit).
> - `setCogs` now returns the write promise as CLAUDE.md requires ("a helper that swallows its promise cannot be sequenced by anyone") — verified.
> - The six cache-version spots (`sw.js` CACHE, `sw.js` ASSETS ×2, `index.html` link, `index.html` script, `js/app.js` APP_VERSION) are all bumped to v201 consistently.
> - No duplicate top-level declarations introduced (`cogsRound`, `applyCogs`, `setCogs`, `cogsServer` each declared once; `cogsPersist` is correctly nested inside the IIFE, not top-level).
> - The protected parser region (`INV_EXCLUDE` → `unitLabelFor`, lines 11324–11574) is untouched.
> - The `tests/roles-client.test.js` guard-ordering assertion was rewritten from a single-line regex to a block-scoped indexOf comparison and is not vacuous — I confirmed `ci.addEventListener('input'` is a unique string in the stripped source, so the test can actually fail if the guard is moved or removed.
> - The `isFinite('')` trap is avoided: the input handler uses `parseFloat(ci.value)` and numeric comparison, not `isFinite`, so a blank field is correctly rejected (`NaN >= 1` is false).
> - Row boundary: `dbSetSetting('food_cost_target', pct)` — key/value shape unchanged, no new column named outside the boundary.
>
> No other findings at the "wrong condition" / "silent failure" / "sequencing" tiers beyond the one above.

---

## What was done about it

**Finding 1: FIXED, and the finding was right on all three of its separable claims.**

Reproduced independently first, against the real extracted functions, before anything was changed — the numbers came out exactly as reported:

```
both succeeded  : cogsPct=35  cogsServer=30   (server holds 35)
after a refusal : cogsPct=30  field=30        (should be 35)
```

The remedy is the one the finding names: a sequence, `_cogsSeq` / `_cogsConfirmed`, so a late answer for an older write cannot overwrite a newer confirmed value.
Re-run after the fix, both directions:

```
both succeeded  : cogsPct=35  cogsServer=35   (server holds 35)
after a refusal : cogsPct=35  field=35        (should be 35)
```

**Three things the fix added beyond what the finding asked for, each because the finding's mechanism implied them:**

1. **The refusal path got the sequence guard too**, alongside the existing value guard, because they answer different questions and neither subsumes the other. `cogsPct===pct` is about the SCREEN (do not repaint over somebody still typing); `seq===_cogsSeq` is about the SERVER (a newer write is in flight and this refusal is not the last word). The case only the second catches is a re-save of the SAME value, where the two `pct`s are equal by coincidence. `tests/cogs-rollback.test.js` pins it.
2. **`resetTenantState` retires every outstanding sequence** (`_cogsConfirmed=++_cogsSeq`). This is the finding's mechanism reached across a café move, and it is worse there than in the same-café case, because the number that lands belongs to somebody else's café. `tests/tenant-switch.test.js` drives it for real — a write issued in A, left unanswered across the boundary, then answered — rather than asserting the counters structurally, which is the one thing that could not have checked it.
3. **`setCogs` and `cogsRound` were already added to `tests/mutation/targets.js`** by the batch; the gate then reported one survivor on the new line, `seq>_cogsConfirmed` → `>=`. It is **equivalent, not a gap**: a sequence is issued by `++_cogsSeq` and belongs to exactly one write whose handler runs once, and the only other writer of `_cogsConfirmed` sets it above every outstanding seq — so equality is unreachable. Written into `allowedSurvivors` with that reasoning rather than killed with an assertion that would be about nothing.

**The scope note is acknowledged and was correct.** Everything is committed now, and the artifact's `Reviewed-commit` names `a0f745e`, an ancestor of the tip, per `docs/reviews/README.md`.
