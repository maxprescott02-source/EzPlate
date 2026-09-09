# REVIEW-250 — staff could delete the café's food-cost history

Reviewed-commit: 4c27dde94b6ee47ab00460719764c038eec10052

**Agent:** `code-review`, run on Sonnet (the batch ran on Opus 5).
Given the diff and the codebase conventions, and **not** the queue item, so it judged correctness rather than conformance.

**No defect found**, and this is the first review in this session to reach that verdict — which is worth stating plainly rather than skipping past, because the same reviewer found a critical in the batch before this one.

**One correction taken**, on a claim the file made about its own mechanism.

⚠️ **This review did something none of the others did: it verified the LIVE DATABASES, not the diff.** It read `pg_policies` on production *and* staging through the MCP and confirmed the deployed policies match the file; it checked the table grants; it checked for foreign keys and triggers on both tables; it confirmed the two bad points are real rows; and it hand-mutated the migration three ways and watched the tests go red. For a change whose whole subject is what the server permits, that is the only kind of review worth having.

---

## The report, verbatim

> ## Summary: no defect found
>
> I reviewed `supabase/migrations/20260910_history_delete.sql`, the mirrored block in `supabase/staging/01-schema.sql`, and the new tests in `tests/roles.test.js`, against every trap `CLAUDE.md` names for this class of change (permissive-vs-restrictive, NULL handling, migration-name-pinned tests, mirror drift, sequencing, FK/trigger interaction). I also verified independently rather than trusting the file's own claims:
>
> - **Read `pg_policies` on both production and staging via the MCP.** Live state matches the file exactly: `price_history owner-only delete` is `RESTRICTIVE`/`{public}`/`DELETE`/`role='owner'`; `menu_price_history` carries both the new permissive `tenant delete` (`{anon,authenticated}`, tenant-scoped) and the restrictive `owner-only delete` (`{public}`, `role='owner'`) — on both databases.
> - **Checked `information_schema.role_table_grants`** — table-level `DELETE` is granted to `anon`/`authenticated` on both tables, as the header claims (no missing grant that would make the new permissive policy inert).
> - **Checked for FKs/triggers on these two tables** — none exist (`menu_id`/`menu_item_id` are plain `text`, not real foreign keys, and the only trigger on either table is `BEFORE INSERT OR UPDATE`, not `DELETE`), so there's no cascade or trigger interaction to get wrong.
> - **Hand-mutated the migration three ways and re-ran `tests/roles.test.js`** against each, restoring the file afterward:
>   1. Dropped `as restrictive` from the `menu_price_history` owner-only policy → 2 tests correctly went red (the direct RESTRICTIVE check and the mirror-drift check).
>   2. Narrowed `to public` → `to authenticated` on the `price_history` owner-only policy → 2 tests correctly went red.
>   3. Flipped `= 'owner'` → `<> 'owner'` on the `menu_price_history` owner-only policy → 2 tests correctly went red.
>
>   This directly addresses this project's most-recorded defect class (roster entries 182(a)/(b), 167, etc. in `CLAUDE.md`) — a test that can't fail. These ones can, and do.
> - Confirmed the two "bad points" the docs describe (354.4 all-menus, 30000 per-menu) are both real rows in `price_history` (ids 378/379, distinguished by `menu_id` null vs set — consistent with `price_history` being one table holding both series, per the restore comment elsewhere in the schema), and `menu_price_history` has no such outlier — so the queue-doc claims about "two bad points" are accurate, not overclaimed.
> - `npm test` (2041 tests) passes; `node --test tests/roles.test.js` passes standalone.
>
> The permissive/restrictive split is correct and matches the established `187` idiom exactly: the restrictive policy checks only role, the permissive policy checks only tenant, and Postgres ANDs them — so a delete requires both same-tenant *and* owner, without the restrictive policy needing to re-derive tenant scoping itself. The sequencing (permissive `menu_price_history tenant delete` created before the restrictive owner-only guard, both inside one `begin`/`commit`) is stated correctly, though I'll note the stated rationale ("split across two deploys the permissive one alone would briefly hand staff the delete") is about redeploying the two statements separately, not about intra-transaction visibility — within a single transaction no other session can observe the intermediate state regardless of statement order, so the ordering here is precautionary documentation rather than something the transaction itself required. That's not a bug, just a slightly overstated justification for an otherwise-correct choice.
>
> Confidence: high. This is a well-constructed, narrowly-scoped migration that was actually rehearsed as the role it claims to guard (not just as `postgres`/MCP), verified live on both databases as part of this review, and backed by tests I proved can fail.

---

## What was done about it

**The correction is taken, in both the migration and the mirror.**

The reviewer is right and the distinction is exact. My header said the ordering mattered because the permissive policy alone *"would briefly let STAFF delete"*. **Inside one transaction no other session can observe the intermediate state at all**, whatever the order — the transaction is doing that work, not the ordering. What the ordering actually guards is the two statements being split across two **deploys**, where the window is real and minutes long.

That is still a good reason to write them this way. It is not what the file said, and **a justification that claims the wrong mechanism is the shape this project added a Tier 1 rule about two batches ago** — a wrong justification is worse than none, because it closes the question for the next reader.

**The SQL is untouched; only the comment changed**, and it is written as a correction rather than a silent rewrite: the migration is a record, the claim was made, it was wrong, and the next reader should be able to see which. The mirror carries the same correction.

**Nothing else was actioned, because nothing else was found.** Recorded in full above rather than summarised, so that a "no defect" review leaves the same evidence a defect-finding one does — otherwise a clean review and an unrun one look identical in this directory, which is the thing the artifact gate exists to prevent.
