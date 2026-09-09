# REVIEW-242 — tenant switch clears the café it is leaving

Reviewed-commit: 1e0fd2e4cee106964e0a6d9d0aef499f23e9e5df

**Agent:** `code-review`, run on Sonnet (the batch ran on Opus 5 — a model reviewing its own work is
not a second reader). It was given the diff and the codebase conventions, and **not** the queue item,
so it judged whether the code is correct rather than whether it matches what was asked.

**Two findings, both acted on. One of them was right about the defect and wrong about the
consequence, and that is recorded below rather than smoothed over.**

---

## The report, verbatim

> ## Review: `batch-242-tenant-switch` vs `main`
>
> Read `js/app.js`'s new tenant-boundary machinery (`tenantIdOf`, `tenantChanged`,
> `applyTenantBoundary`, `resetTenantState`, `supplierMemApply`), its call sites in `bootstrapSync`,
> and `tests/tenant-switch.test.js` / `tests/smem-sync-guard.test.js` / `tests/mutation/targets.js`.
> `supplierMemApply` is behaviorally identical to the inline code it replaced (verified the "keep
> local, re-push" vs "adopt server rows" branches match exactly, including that `mem: localMem` is a
> no-op reassignment onto the same object). The recursive `bootstrapSync()` calls (claim-invite,
> create-business) both happen from the *non-member gate*, before `applyTenantBoundary` runs on the
> outer call, so there's no double-clear or ordering hazard there, and the whole post-`Promise.all`
> body runs synchronously with no interleaving `await`, so concurrent boots can't tear the boundary
> decision.
>
> ### 1. `businessRole` is exactly the "twelfth" conditionally-applied tenant store, and `resetTenantState` doesn't clear it (major)
>
> `js/app.js:1123` — `var businessRole='owner';`
> `js/app.js:1396-1397`:
> ```js
> var _rs=roleState(_role);
> if(_rs!=='unknown') businessRole=_rs;
> ```
> This is applied the *same* way as the eleven stores the batch's own header (`js/app.js:1208-1231`)
> enumerates as needing the boundary: "the server said nothing about this, so keep what you had" —
> `roleState` returns `'unknown'` on any error/unreadable RPC result (`js/app.js:1133-1135`), in which
> case `businessRole` is left untouched. But `resetTenantState()` (`js/app.js:1242-1259`) never
> touches `businessRole`.
>
> Concretely: an account is a member of café A (owner), gets removed, is invited into café B as
> **staff**, and accepts. The recursive `bootstrapSync()` for B runs a fresh `Promise.all` that
> independently fetches `current_business_id` and `current_business_role`. If the tenant lookup
> succeeds (B's uuid, different from A) but the *separate* `current_business_role` RPC entry in the
> same batch fails or is unreadable — the exact "one flaky request out of twelve" scenario this
> codebase already documents for the sibling 185/186 defects — then `applyTenantBoundary` correctly
> detects the switch and clears every store `resetTenantState` lists, but `businessRole` stays
> `'owner'` from café A. `applyRoleUi()` (`js/app.js:1157-1198`), which runs immediately after and
> reads `isOwner()` (`js/app.js:1141`: `businessRole!=='staff'`), then renders B's screen with the
> owner-only controls visible: `#bldDelete` shown, `#menuDelBtn` shown, `#setCogsInput` editable,
> `#teamOwner` (member list + invites) shown to a staff account in a café where they are staff.
>
> RLS still refuses the actual writes server-side (per `isOwner()`'s own comment: "the server...
> refuses regardless"), so this isn't data loss, but it directly contradicts the diff's stated claim
> of covering "EVERY TENANT-SCOPED STORE" at "the boundary" specifically so nothing can be "fallen
> off." `businessRole` fell off. `tests/tenant-switch.test.js`'s `snap()` never captures
> `businessRole`/`isOwner()`, so nothing in the new suite could have caught this.
>
> **How to verify:** extract `applyTenantBoundary`, `roleState`, `resetTenantState`, `isOwner`
> together; call `applyTenantBoundary(okRes(A_ID))`, set `businessRole='owner'` (as a real owner boot
> would), then call `roleState({error:{message:'x'}})` followed by `applyTenantBoundary(okRes(B_ID))`
> and confirm `businessRole` is still `'owner'` post-switch while every `resetTenantState` field is
> cleared.
>
> ### 2. `resetTenantState` itself is not a mutation-gate target (minor/process)
>
> `tests/mutation/targets.js` adds `tenantIdOf`, `tenantChanged`, `applyTenantBoundary`, and
> `supplierMemApply` (with the comment "All four were confirmed red by hand — ten mutants, ten
> kills"), but not `resetTenantState` — the one function whose entire job is the safety property this
> batch exists to deliver, and which is full of candidate "delete-one-call" mutants (e.g. dropping
> `rebuild()` after `productsById={}` would leave `PRODUCTS`/`byId` still pointing at café A's data
> while `productsById` itself reads empty — a real, plausible regression). `tenant-switch.test.js`
> does assert every field by hand, so a mutation would currently be caught by `npm test`, but not by
> the mechanized `npm run mutate` gate that CI treats as required — inconsistent with the standard
> just applied to its four sibling functions in the same diff, and this project's own stated rule ("a
> function that is not a target has never been asked the question").
>
> ### Everything else checked and found sound
> - `applyTenantBoundary` placement before the required-table throw (`js/app.js:1404`) is deliberately
>   safe-direction (clears on the way to an error), and matches its own comment.
> - Cache-version bumps (`index.html`, `sw.js`, `APP_VERSION`) are consistent at v198→v199.
> - `COGS_PCT_DEFAULT`/`GST_DEFAULT_MODE` are declared textually *after* `resetTenantState`'s
>   definition but are assigned before any boot ever runs (function bodies aren't evaluated at
>   definition time), so no TDZ/undefined hazard.
> - `supplierMemApply`'s reset interaction is correct: after a real switch, `resetTenantState` sets
>   `supplierMem={}`, so a B-empty read correctly produces `rePush:[]` (no cross-tenant re-push),
>   matching the test.
>
> I'm confident in finding 1 (traced the exact mechanism end-to-end and confirmed no other write-site
> resets `businessRole`). Finding 2 is a lower-confidence process observation, not a functional bug by
> itself.

---

## Disposition

### Finding 1 — **FIXED, and the finding's own consequence was wrong**

**The defect is real and was mine.** `businessRole` is applied by exactly the pattern
`resetTenantState`'s header enumerated, from 200 lines away and by a different mechanism, and the
header claimed to cover every such store. `businessRole=BUSINESS_ROLE_DEFAULT` is now in the reset,
and the header says twelve and says how the twelfth was missed.

⚠️ **The remedy does not repair the scenario the finding describes, and the first test written from
the finding's own words could not fail.** Measured with the real extracted functions, both directions,
with and without the fix:

| role held in A | B's role lookup fails | without the fix | with the fix |
|---|---|---|---|
| `owner` | yes | `owner` | `owner` — **no change** |
| `staff` | yes | `staff` (inherited) | `owner` |

The finding's case is owner-in-A → staff-in-B, and it comes out `owner` **either way**, because
`unknown` reads as owner by design (188). A test asserting `businessRole === 'owner'` there has both
sides already `'owner'`: it is roster entry **184(b)**, a fixture whose fields agree cannot tell you
which one the code read. That test was written, hand-mutated, **survived**, and was rewritten.

The direction that actually moves is the opposite one: **a staff member in café A who OWNS café B is
shown a staff screen in their own café** — the four owner controls and the whole team card hidden —
until they reload. That is what `tests/tenant-switch.test.js` now asserts, plus that a definite role
from B wins in both directions. Mutating the fix out reddens it.

This is `CLAUDE.md`'s standing rule arriving from the reviewer rather than at it: a finding carries up
to three claims — the defect, the mechanism, and the remedy it implies — and they fail independently.
Here the defect was right, the consequence was wrong, and adopting the finding's framing wholesale
would have shipped a test that could not fail.

### Finding 2 — **FIXED**

`resetTenantState` added to `tests/mutation/targets.js`. The reviewer's example is exactly right: its
mutants are all call deletions, and dropping `rebuild()` after `productsById={}` would leave
`PRODUCTS` and `byId` holding the previous café. Gate re-run: 1195 mutants, 45 survivors, all with
written allowances.

### The "everything else" list — checked, nothing to do

The `COGS_PCT_DEFAULT` / `GST_DEFAULT_MODE` declaration order had been noted as a worry before the
review and the reviewer independently reached the same verdict: function bodies are not evaluated at
definition time, and the boundary runs after `await Promise.all`, so the constants are assigned before
anything can read them. **No change made** — there is no defect behind it, and moving two lines for
its own sake is churn.

## After the fixes

`npm test` 1970 pass / 0 fail · `npm run smoke` green · `npm run mutate` 1195 mutants, 45 survivors
all allowed · `npx playwright test` 465 passed / 14 skipped (run at `1e0fd2e`).

**What landed after the reviewed commit**, so a reader can judge whether the review still covers the
branch: the `businessRole` reset and its constant, the tests above, `resetTenantState` added to the
gate targets, and **two comment-only additions to `js/app.js`** — the corrected note on which role
direction actually moves, and a note recording that emptying `menusList` lets a failed `menus` read
mint a fictional menu (queue item 20's defect, reached by a second door, and noted on that item).
No behaviour beyond the role default changed after the review read the branch.
