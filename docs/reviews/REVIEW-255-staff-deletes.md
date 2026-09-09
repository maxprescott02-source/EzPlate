# REVIEW-255 — staff may delete plates, not products

Reviewed-commit: f366b5f133ab5f34435e1e60e9b4e79aeeaeddbc

**Agent:** `code-review`, on Sonnet (the batch ran on Opus 5). Given the diff and the four files to look at, and **not** the decision it implements.

**Three findings, one of them a major, and all three were mine.** The major is the best finding this process has produced: it did not find a bug in what I wrote, it found the **cost** of a judgement I had made on Max's behalf — and that cost is what sent the judgement back to him.

---

## The report, verbatim

> ## Review: branch `255-queue-unblock` (staff/owner delete line move)
>
> Scope checked: the migration, the schema mirror, all `js/app.js` delete paths for plates/products/taught packs, the two test files, `CLAUDE.md`, and the six cache-version spots. All 2102 existing tests pass on this branch.
>
> ### 1. MAJOR/CRITICAL — a fourth delete-of-a-taught-pack door was left ungated, and the new server policy turns it into a silent partial failure
>
> The PR gates two client doors to `dbDeleteSupplierPhrase`: the "Remove" button in `renderSmemList` (`js/app.js:5178-5185`, gated) and `deleteIngredient` for products (gated). It misses a third caller: `applyTidy`'s supplier rename/merge/clear flow.
>
> `js/app.js:9740-9747` (`applyTidy`, unchanged by this diff):
> ```js
> if(field==='supplier'){
>   tidySupplierMemMigration(supplierMem, from, (action==='clear'?null:to)).forEach(function(mig){
>     if(mig.drop){ delete supplierMem[mig.oldId]; if(typeof dbDeleteSupplierPhrase==='function') dbDeleteSupplierPhrase(mig.oldId); return; }
>     delete supplierMem[mig.oldId]; if(mig.oldId!==mig.newId && typeof dbDeleteSupplierPhrase==='function') dbDeleteSupplierPhrase(mig.oldId);
>     supplierMem[mig.newId]={...};
>     if(typeof dbPushSupplierPhrase==='function') dbPushSupplierPhrase(supplierMem[mig.newId]);
>   });
> }
> ```
> This runs from the "Tidy" modal (`openTidyManage` / `#setTidyOpen`), which carries **no** `isOwner()`/`ownerOnly()` check anywhere in its chain (`openTidyManage`, `renderTidyValues`, `openTidy`, `applyTidy` — I grepped all of them; none mention "owner"), and `#setTidyOpen` has no `hidden` attribute gating it by role in `index.html`.
>
> Before this migration, `supplier_phrases` had no owner-only delete policy, so this path worked for staff. After `20260910_staff_deletes.sql`, staff DELETE on `supplier_phrases` is refused server-side. Walking the sequence for a staff-performed supplier rename/merge:
> 1. `dbDeleteSupplierPhrase(mig.oldId)` fires, gets refused (RESTRICTIVE policy), `pushWrite`'s `fail()` toasts a generic "Couldn't save supplier phrase delete: …" — but the caller never awaits or checks this, so nothing stops the rest of the loop.
> 2. `supplierMem[mig.oldId]` is deleted from **local** memory regardless.
> 3. `dbPushSupplierPhrase(supplierMem[mig.newId])` (an upsert, not gated by the new delete-only policy) succeeds and creates the new row.
> 4. `applyTidy` unconditionally toasts success: `"Renamed supplier … on N packs"`.
> 5. On the next reload, `bootstrapSync` re-reads `supplier_phrases` from the server, which **still has the old row** (the delete never landed) alongside the new one — so the stale supplier's taught pack reappears in memory, exactly the "orphaned taught pack" scenario CLAUDE.md already warns about for renames, now caused by this PR's own policy change.
>
> This is precisely the harm the migration's own header exists to prevent ("a taught pack decides what every FUTURE import prices that product at… it reaches other people's plates by the same route [as a product], one step later and less visibly") — except here it's the migration's own untested blind spot that produces it. Nothing in the diff (migration header, `js/app.js` comments, or either test file) acknowledges this fourth caller.
>
> **Confidence:** high on the mechanism — traced the full call chain and confirmed no gate exists on any path into it.
>
> ### 2. MINOR — `newestPolicySource()` in `tests/roles.test.js` picks its "newest" file from raw (comment-included) text, inconsistent with its own `code()` step
>
> The *selection* filter (`.includes(...)`) scans the raw file including SQL comments; only the file finally chosen gets passed through `code()` (which strips `--` lines) before the actual `create policy` search. This is roster item 183(a) — "a grep over a source file searches PROSE as well as CODE" — applied one level up, at the file-selection step rather than the statement-search step, and the surrounding code shows the author clearly knows the lesson but didn't apply it here.
>
> Currently harmless: I confirmed no migration merely *mentions* any of the `RESTRICTED` policy names in prose without also being the file that actually creates/drops them. But this is exactly the class of mistake the repo has been bitten by twice already (183(a), 219), and it's a fragility worth fixing given the file's own stated lesson right above it.
>
> ### 3. NIT — an unrelated UX change rides along with the role reversal
>
> `openDelChoice` changed from `hidden = hasPlate && !isOwner` to `hidden = !hasPlate`. Beyond removing the role condition (in scope), this also newly **hides** "Delete everything" entirely for a plate-less dish for *every* role, where previously it was shown. This looks like a legitimate, tested cleanup rather than a functional regression — but it wasn't part of the decision recorded in `docs/decisions/2026-09-10.md`, and CLAUDE.md is explicit that incidental extra work should be written down rather than built silently into an unrelated PR.
>
> ### What's correct
> - The SQL migration and its rollback are correct: `plates owner-only delete` dropped (leaving the permissive tenant `for all` policy), and `ingredients`/`supplier_phrases` gain the exact shape CLAUDE.md's roster requires (restrictive keyword present, command named, equality not existence, NULL-refuses).
> - The schema mirror agrees with the migration exactly — drop-not-recreate for plates, create for the other two, nothing else touched.
> - `deleteIngredient` and the `smem-del` listener are correctly gated at the action, not just at the affordance.
> - The plate gate removal is complete and consistent; no dead `ownerOnly('delete a plate')` code remains.
> - All six cache-version spots agree on `v210`.
> - `CLAUDE.md`'s correction of the naming-inversion table fixes a real, previously self-contradicting error.

---

## What was done about it

**Finding 1: the policy is REVERTED, and the decision goes back to Max.** The finding is right on all three of its claims — defect, mechanism, and that nothing in the diff acknowledged the fourth caller. Verified independently before acting: `openTidyManage`, `renderTidyValues`, `openTidy` and `applyTidy` contain no role check of any kind.

**The remedy is NOT to gate the tidy flow, and that is the whole lesson.** Taught packs were never in Max's answer — he named products. I extended to them on his stated reason. Gating supplier renames to make that extension safe would take away a capability he was never asked about, and which is exactly the sort of tidying a staff member does.

So the question stopped being *"is my inference sound"* — it still looks sound — and became *"is it worth staff losing supplier renames"*, which is his. `supplier_phrases` is dropped from the migration, the mirror, staging and production; item 91 is reopened carrying that cost, with both options costed and a recommendation.

**This is one batch old, arriving immediately.** 254 recorded that a cost stated in a comment is priced straight into someone's answer. Here I nearly handed Max a decision whose cost I had not measured.
**The rule now in `CLAUDE.md`: an inference from someone's stated reason is free while it costs nothing, and becomes theirs the moment it costs something.** The test is not whether the reasoning holds — it usually does, which is what lets this shape survive — but **what the extension takes away, and from whom.** Go and find the OTHER callers of whatever you are restricting before deciding you have merely applied their answer.
**And what made it recoverable was labelling it:** the migration, the mirror, the queue item and `CLAUDE.md` all said "inference, not his answer", so the reviewer had a claim to check rather than a rule to re-derive.

**Finding 2: FIXED.** The selection now runs over `code(...)`. It is 183(a) at the file-selection step, inside the function written to apply 219's lesson — a hazard I introduced in the same commit that explained why it matters.

**Finding 3: FIXED, and the reviewer was right to call it a change rather than a cleanup.** The original was `!hasPlate || isOwner()` — "show unless staff AND there is a plate". Removing the role half leaves *always shown*, which is what the other three cases already did. `hasPlate` reads tidier and newly hid the button for a plate-less dish for everyone. Restored. The plate-less wording is odd and is pre-existing; filed rather than fixed here.

**Both deliberate absences are now ASSERTED rather than left out**, because an omission from a census reads as an oversight — and the next reader will have Max's quoted reason in front of them and reach for the policy again.

## What the browser found that nothing else did

`tests/visual/188-roles.spec.js` asserted `#bldDelete` is HIDDEN for staff — the exact rule being reversed. **`npm test` and the mutation gate were both green on the change; this spec is the only thing in the repo that went red for the right reason.** Inverted rather than deleted, and both roles gained `#ingDelete`, so the pair now reads as the whole decision on one screen at both themes and both widths. Hand-mutated: forcing `ingDelete` visible turns 4 of the 9 red.

⚠️ **And a run was discarded, for a cause the `verify` skill did not cover.** The first full Playwright run reported **exit 0, no failures, 474 passed + 14 skipped = 488** against **492 collected**. Four tests neither passed, failed nor skipped. The cause: I launched the `code-review` agent while Playwright was running, and **the reviewer hand-mutates `js/app.js` to check its own findings**. "Commit first, run second" is about *your* edits; this is the reviewer's. Written into `skills/verify`, along with the instruction to check the total against `--list` every time — a green exit code that has not run what you think it ran is the same class as `node --test` printing `fail 0` while exiting 1.

**Verification after every fix:** `npm test` 2103 pass · `npm run smoke` pass · changed-scope gate 24 mutants, 24 killed, 0 survived · `npx playwright test` **478 passed / 14 skipped, equal to the 492 collected** · five hand-mutations on the SQL and client killed, each proved to have changed the file.
