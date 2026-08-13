# HANDOVER - 182 (business_id part 2, the policy swap)

**Branch:** `feature/business-id-part2` · **Scope:** queue item "`business_id` — PART 2, the policy swap".
**Deploy version: NONE.** No client asset changed, so `sw.js` stays on `ezplate-v158` and the six spots were not bumped.

## What changed

All thirteen `using (true)` policies on the ten data tables are now scoped to one function, `public.current_business_id()`.
Part 1's trigger and all ten column DEFAULTs read that same function, so there is one answer to "which tenant am I" rather than three.
A second café's data is now invisible to the public anon key, and an account that is a member of nothing sees nothing.
Nothing a user can see changed: Max's app reads and writes exactly as before, verified in a real browser against production.

**The queue item's design would have emptied the app**, and that is the finding rather than a detail.
Production has zero rows in `auth.users` and zero in `business_members` — measured, not assumed — so the app runs entirely as `anon`, and a membership-only policy resolves to NULL for every request it makes.
RLS with nothing matching returns 200 and an empty array, so the first thing Max would have seen is an app with no products and no error.
`current_business_id()` answers the seeded business for `anon`, the caller's business for a member, and NULL for a signed-in non-member.
The anon branch is today's behaviour kept deliberately; removing it is a one-function change and belongs to the auth item.

The policies are created under new names BEFORE the permissive ones are dropped.
Both are permissive and therefore OR'd, so the overlap grants exactly what today grants, and no statement can leave a table with RLS on and no policy.

`tests/staging-seeds.test.js`'s "restore_backup stays SECURITY INVOKER" is now scoped to `restore_backup`'s own body.
It grepped the whole file, which is a broader claim than its name makes, and it went red on a function that is deliberately definer.

## Into CLAUDE.md

Three edits, made under the standing authority of 13 Aug 2026.

- **New half to the Tier 1 DEFAULT trap: "a DEFAULT is applied BEFORE the trigger, so the two must say the SAME thing."**
  The existing trap covers a DEFAULT failing on the restore path; this is the mirror image on the path that runs every day.
- **A `git checkout --` warning on the mutation check**, because `git checkout -- <tracked> <untracked>` restores nothing and the mutations accumulate silently.
- **The stub roster is FOURTEEN, not twelve.** Both new entries are this batch's own tests, caught before merge by running the mutation.

## New docs/QUEUE.md items

None. The finished item was deleted and the following ones renumbered.
Three `Do after:` lines this batch satisfied were deleted, per the queue's own rule.
Three findings were written into existing items rather than made new ones:

- the **auth item** now owns the empty-app hazard, in the imperative and ending "answer it here, do not route it onward": Max has no account at all, so whichever one is created must get a `business_members` row in the same sitting or signing in empties EzPlate.
- the **semantic-keys item** now carries a measurement: `app_settings.key` is a global primary key and `dbSetSetting` upserts against it, so a second café is refused 42501 the first time it saves any setting at all. It fails loudly, which is the acceptable version.
- the **roles item** now has to decide whether one person may belong to two cafés, in the imperative: `business_members` permits it, and `current_business_id()` resolves such a person to their oldest membership, which is stable rather than correct.
- the **gate review** has one line answered (`restore_backup` is tenant-scoped for free, being SECURITY INVOKER) and one sharpened (the anon key is now the last permissive read in the database).

## The pre-push review

Run on a different model, without the brief, as required.
It queried both live databases itself and mutated a scratch copy of the migration rather than reading the diff.
**Three findings, all real, all fixed in this branch.**

- **The `app_settings` collision is not restore-only, and my documentation said it was.** `dbSetSetting` is the one writer for every setting and upserts against the global `key`, so a second café's FIRST live settings write is refused, not just an import. It proved this as tenant two in a rolled-back transaction. The defect is the semantic-keys item's and predates this batch; the understatement was mine and was in this diff. Corrected in the migration header, the queue item and `docs/STAGING.md`, including the sentence that mattered: **isolation holding is not multi-tenancy working.**
- **Two more tests that could not fail**, in the file whose own header records two of exactly that shape from this same batch. The migration types the table list five times and nothing cross-checked them: dropping a table from the DEFAULT-repoint array, or from the create array (leaving RLS on with no policy at all), left all eighteen tests green. Both are caught by the migration's runtime assertions, but only once it is applied — which is after review and merge. Now cross-checked, and while verifying that fix I found the rollback's own list is checked by nothing either, so that is pinned too.
- **`current_business_id()`'s membership lookup had no `order by`.** `business_members` permits one user in two cafés, so which one they resolved to was planner-dependent. Now ordered by oldest membership, which makes it stable and explicitly not an answer; the real question went to the roles item.

## New docs/PHONE.md items

None.
Nothing in this batch is visible on a device, and the read and write paths were both driven in a real browser against production.

## Probe

**What did the brief or queue item tell you to do that you would have done differently?**

Two things, and the first is the whole batch.

The item said to replace the policies with "`business_id`-scoped ones" and did not say what resolves the tenant.
Written the obvious way — the caller's membership — it empties the café on the day it lands, because nobody has an account.
I did not substitute my own item; I built the scoping it asked for and added the legacy-anon branch that makes it safe today, and recorded why in the migration header.

The item also said to "make the client send `business_id` on insert".
I did not, and would argue against it: that sentence predates Part 1 choosing a trigger, and doing it would move the one decision that must stay on the server into the one place that cannot be trusted with it.
The client is unchanged and still sends no tenant column, which `tests/business-id.test.js` pins.

**What did you not propose because it was out of scope?**

The client has no way to tell a signed-in non-member why the app is empty.
That wants a boot-time message and a way back out, which is the auth item's work and item 4's empty-state work, so it went into the auth item as a stated requirement rather than being built here.

The parallel `docs/MAINTENANCE.md` track did not run this batch.
Not a collision — this batch touched no client file — but the queue item was a live-production migration on two databases and I judged a second concurrent worktree the wrong thing to be doing alongside it.

## Surprises

**A defect that every SQL-side assertion passed straight over, found only by rehearsing as a real second tenant.**
With the scoped policies live and Part 1's literal DEFAULT still in place, café two could READ its rows and could not WRITE any — 42501 on its own insert.
A DEFAULT is applied when the column is ABSENT from the INSERT, which is every write the client makes, so the tenant column was already non-NULL when the BEFORE trigger ran and held the legacy café's id; the trigger fills only nulls and correctly left it; `with check` then refused the row.
Reads looked perfect throughout, and a single-tenant database behaves perfectly, so this is invisible until a second tenant exists.

**Staging can rehearse multi-tenancy after all, and `docs/STAGING.md` said it could not.**
Three accounts and a second business took about ten minutes, and gave the first exclusion proof this project has ever had — in both directions, on all ten tables, plus the silent no-op an anon UPDATE returns.
Two mechanics are worth knowing: Supabase rejects `.test` email addresses and rate-limits confirmation emails almost immediately, and a hand-made `auth.users` row must have `email_confirmed_at` set and its token columns `''` rather than NULL, or GoTrue answers "Database error querying schema" on sign-in.
The bullet in `docs/STAGING.md` has been corrected rather than left standing, and the accounts were left in place for the auth and roles items.

**`restore_backup` became tenant-safe without being touched.**
It is SECURITY INVOKER, so its five `delete … where true` statements now only reach the caller's own café.
Called as café two on staging it restored into café two and left café one's 520 products, 12 menus, 180 plates and 429 dishes untouched.

**My own mutation harness corrupted two files and confounded its own results.**
`git checkout -- <tracked> <untracked>` aborts entirely rather than restoring what it can, so nine mutations accumulated on the new migration and three on the staging mirror, and every "red" after the first was red for the wrong reason.
Repaired, re-run properly with `cp` backups, and two of my tests turned out not to fail on the thing they named.
