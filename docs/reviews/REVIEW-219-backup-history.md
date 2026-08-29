# REVIEW-219 — the backup carries all five history series

Reviewed-commit: dee09a571ff72a1071231a13cf3756f2612b93ef

Pre-push `code-review` agent, run on a different model from the batch (Sonnet against Opus), on
`git diff main...HEAD`, without the brief or the queue item. Findings pasted verbatim below, then
what was done about each.

**This review caught a production security regression that the whole suite, the mutation gate,
Playwright, the smoke check and a full staging rehearsal all missed.** It is the single strongest
argument in this repo's history for the pre-push agent, and it is recorded that way on purpose.

---

## The agent's findings, verbatim

### 1. CRITICAL — `restore_backup` v5 silently drops the owner-only guard added by batch 187; any staff member can now wipe and restore a business's entire catalogue

**File:** `supabase/migrations/20260829_restore_backup_v5.sql` (new function body, no line numbers in a CREATE OR REPLACE block) and the mirrored copy in `supabase/staging/01-schema.sql:988-1226`.

**Mechanism.** `20260814_roles_part1.sql` (batch 187) replaced `restore_backup` with a version whose first statement is:

```sql
if (select public.current_business_role()) is distinct from 'owner' then
  raise exception 'restore_backup: only an owner may restore a backup';
end if;
```

placed deliberately before any `delete`, per that file's own comment ("ONLY AN OWNER MAY RESTORE, AND THIS IS THE FIRST STATEMENT IN THE FUNCTION"). This branch's new migration does `create or replace function public.restore_backup(...)` again, and the new body has **no such check anywhere** — the function now opens straight into the format guard. Since `create or replace function` replaces the whole body, the deployed function after this migration accepts a restore call from *any* authenticated member of a business, not just its owner. `staff` accounts already legitimately have write access to `ingredients`, `menus`, `plates`, `menu_items` and `supplier_phrases` under the tenant-wide permissive RLS policies from batch 182 (batch 187 only ever restricted `plates` delete and the `food_cost_target` setting), so RLS does not backstop this — the function-level check was the only thing preventing a staff account from replacing the whole business's catalogue via `restore_backup`.

The migration's own header explains its lineage as "REPLACES the function created by `20260813_semantic_keys.sql` section 2 (v4)" — i.e. it was authored from the **pre-187** body and never incorporated batch 187's later change. Nothing in the ~140-line header (which otherwise documents staging/production verification in exhaustive detail) mentions the owner check, reversing it, or even being aware it existed.

**Why nothing caught it:**
- No test in this diff exercises the owner-vs-staff distinction on `restore_backup` at all.
- `tests/roles.test.js` (unchanged by this branch, not in the file list) has the pinning test `'the restore refuses a non-owner BEFORE it deletes anything'`, but it reads its SQL from a **hardcoded path**, `supabase/migrations/20260814_roles_part1.sql` — the old file, which still textually contains the guard because it's a historical, superseded migration. This is the exact "stale pin on a superseded migration" defect class that this same branch's `tests/restore.test.js` diff explicitly identifies and fixes for its own CONDITION tests (rewriting `MIGRATION_RAW` to read "the newest migration that defines restore_backup" instead of a hardcoded filename) — but that fix was never applied to `roles.test.js`, so its security-critical assertion is now permanently green regardless of what the currently-deployed function actually does.
- `js/app.js:8343-8344` (unchanged) still carries the comment *"restore_backup's own first statement raises for a non-owner"* — a comment that was true before this branch and is now false. The only remaining defense is the client-side `ownerOnly('restore a backup')` gate at `js/app.js:8346-8347`, which is trivially bypassed by calling `dbRestoreBackup`/`SUPA.rpc('restore_backup', ...)` directly (devtools console, a stale cached client, or a raw PostgREST call) — exactly the class of gap CLAUDE.md's own "client's role is not the MCP's role" and "policy that RESTRICTS vs GRANTS" sections warn about.
- The migration's own staging/production verification section tests only the `anon` role (unauthenticated), never a signed-in `staff` member of an existing business — so the rehearsal that this migration cites as proof never exercised the one case that regressed.

**Failure scenario:** A café using self-service signup (shipped in batch 209+218, per the repo's own recent history) invites a staff member. That staff member — or anyone with their session token — calls `restore_backup` with a crafted or stale backup payload (or an empty-groups payload) directly via the RPC. The catalogue, menus, plates and dishes are wiped and replaced with no error, no warning, and no record that a non-owner did it, because the guard that used to stop this is gone.

**Confidence:** High — verified by direct text comparison of the two function bodies (batch 187's vs. this branch's), by confirming the check is absent from both the new migration and the schema mirror, and by tracing `tests/roles.test.js`'s file path to prove it cannot observe the regression.

**How to verify:** `git diff main...HEAD -- supabase/staging/01-schema.sql` around the `restore_backup` function shows the owner-check block being deleted outright (visible in the diff hunk beginning `-  -- 187 -- ONLY AN OWNER MAY RESTORE...`). Compare against `supabase/migrations/20260814_roles_part1.sql:346-347` to confirm the guard existed. Then check `tests/roles.test.js:24-25` to see `MIGRATION` is read from `20260814_roles_part1.sql` by hardcoded path, never the newest definition.

**Per CLAUDE.md's own rule**, this is also a reversal of a decision Max made himself (batch 187, "owner vs staff") without any acknowledgment or approval — the kind of change this file says explicitly still needs him.

### 2. Comment disagrees with code (consequence of #1)

**File:** `js/app.js:8343-8344` (unchanged by this diff, but now false because of it).

> *"restore_backup's own first statement raises for a non-owner, which would surface as a raw exception string. Better to say it plainly before anything is read off disk."*

This is no longer true after the migration in this branch. Not itself a new defect introduced by an edit, but it's a comment the diff should have caught and updated — its falseness is direct evidence of finding #1, not a separate root cause.

---

Everything else in the diff — the format-4 negotiation ladder in `backupToPayload`/`parseBackupFile`, the `is not distinct from` vs `=` dedup fix for `price_history.menu_id`, the named-column inserts around the `bigint generated always as identity` column, the `menu_id`/table sequencing (menus/menu_items inserted before the history rows that reference them), the null-point filtering in `pointToRow` call sites, and the new test coverage in `tests/restore.test.js`/`tests/settings.test.js`/`tests/smoke.js`/`tests/invites.test.js` — is well-reasoned, internally consistent, and the SQL NULL semantics for the additive inserts are correct (verified by re-reading the dedup logic and the schema's column defaults). The six cache-version spots (`sw.js` CACHE, both `sw.js` ASSETS entries, both `index.html` `?v=` references, `js/app.js` `APP_VERSION`) are all consistently bumped to v179. I found nothing wrong in that part of the diff.

The one finding above, however, is severe enough on its own to block this branch: it silently reverses a documented security decision, ships (per the migration's own header) to production, and is invisible to the test suite because of a stale test pin — precisely the failure mode this repository's own CLAUDE.md file has a whole section warning about.

---

## What was done

### Finding 1 — CONFIRMED IN FULL, and it was already on production. FIXED.

Every claim checked and every one correct. `20260814_roles_part1.sql:325` does define the function
and `:347` does raise; my v5 contained the string zero times; `tests/roles.test.js:24-25` does read a
hardcoded superseded path. The finding also correctly identified *why* the wrong ancestor was chosen,
which the agent could not have been told: the queue item says **"Start from v4, not from
`20260806_restore_backup_v3.sql`"** — true on 12 Aug, falsified by 187 on 14 Aug.

**The window was real, not hypothetical.** The guardless function had already been applied to staging
*and to production* before the review ran, because the migration procedure puts application before the
pre-push review. Both were repaired in the same session:

- staging re-created from the corrected file text;
- production repaired by inserting the guard into its deployed body inside a `do $$ … $$` that refuses
  if the expected marker is absent and returns early if the guard is already present, so it cannot
  half-apply;
- both then returned the **same** `md5(pg_get_functiondef(...))` = `022197552f422b9837d151e2b7da5df5`,
  which is what proves production matches the repo file, since staging's copy came from it verbatim;
- both answer `guard_before_first_delete` = true, checked by string position rather than by eye.

**Verified as the client over PostgREST — the check the first rehearsal did not have:**

| caller | payload | result |
|---|---|---|
| `d@example.com` (**staff**) | populated | **400 P0001** "only an owner may restore a backup" |
| `d@example.com` (**staff**) | **empty groups** | **400 P0001**, same message |
| `a@example.com` (owner) | populated | 200, and 0 additive points — the dedup still holds |

The empty-groups case is the one worth keeping: it is the shape that reaches the five deletes without
raising on an insert, so a refusal proved only with a payload that fails at `ingredients` has not
tested the deletes at all.

**The structural fix, which is the half that stops a recurrence.** `tests/roles.test.js` now reads
whichever migration LAST defines the function, and carries a new test pinning both that *and* that the
mirror's copy has the guard ahead of its first delete. **Three mutations run by hand, all confirmed
red:** deleting the guard from the newest migration (2 failures), deleting it from the mirror only
(1), and weakening `is distinct from` to `<>` so a NULL role walks through (1).

**On the agent's closing point that this reverses a decision of Max's and therefore needed him:**
correct as stated, and the resolution is that the reversal was never intended and is undone rather
than ratified. 187's guard is restored byte-for-byte. Nothing about the owner/staff decision is
changed by this batch, and no approval is being sought for one.

The durable rule is now in `CLAUDE.md` (its own Tier 1 section) and in `docs/STAGING.md` step 2:
**`create or replace function` replaces the whole body, so find the newest definition by listing the
directory — never the one an item, a comment or your memory names.**

### Finding 2 — resolves with #1. No edit needed.

`js/app.js:8343-8344` says the server's first statement raises for a non-owner. That was true before
this branch, false in the reviewed commit, and is **true again** now the guard is restored — verified
by reading the deployed body, not just the file. Correcting the comment would have been the wrong fix
for the right observation: the code was wrong, not the comment.

### The rest of the diff — no findings, and one point worth recording

The agent's "nothing wrong" on the format-4 ladder, the `is not distinct from` dedup, the named-column
inserts and the cache bump agrees with the batch's own staging measurements, including the
counterfactual (`=` would have inserted 3 rows, exactly the all-menus series, on every restore).
That is two independent readings converging, not one confirming itself.
