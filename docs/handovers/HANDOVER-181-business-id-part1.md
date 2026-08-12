# HANDOVER - 181 (business_id part 1, the additive half)

**Branch:** `feature/business-id-part1` · **Scope:** queue item "`business_id` on every table — PART 1, the additive half".
**Deploy version: NONE.** No client asset changed, so `sw.js` stays on `ezplate-v158` and the six spots were not bumped.

## What changed

Every one of the ten public tables now carries a `business_id`, backfilled to a single seeded business, with an index and a foreign key.
A `businesses` table holds that one row and a `business_members` table maps `auth.uid()` to it; both have RLS on with `select` policies for `authenticated` only, because Supabase's default privileges grant `anon` full DML on any new table in `public` and a new table with RLS off is world-writable through the anon key that ships in `index.html`.
Nothing a user can see changed, which is the point: no policy on the ten existing tables was touched and no client file was edited.
Applied to staging then production, both verified as the client over PostgREST; all seven schema fingerprints match.

The one design departure from the item: **a `BEFORE INSERT OR UPDATE` trigger fills the column as well as the DEFAULT, and the column is `NOT NULL`.**
`restore_backup` inserts five tables with `select *` and no column list, and `jsonb_populate_recordset` turns an absent JSON key into an explicit NULL, which overrides a column DEFAULT rather than falling back to it.
Measured on staging with Max's real 412-product export: trigger dropped, all 412 products restored null; trigger intact, zero.
A DEFAULT alone would have left every restored row outside Part 2's policies, silently.

## The pre-push review

Run on a different model, without the brief, as required.
It queried both live databases itself rather than reading the diff, and independently mutation-tested the two boundary claims by making `rowToIngredient` spread the raw row and `ingredientToRow` echo the column back, confirming both tests go red.
**Two real findings, both fixed in this branch rather than queued.**

- **The trigger guarded INSERT only, so `update … set business_id = null` was unguarded.** Correct, and it mattered: under Part 2 a nulled row is one the café can no longer see, reported as 200 and an empty array rather than an error. The review also said, fairly, that calling the trigger something that "cannot be forgotten" overstated a guard covering one of the two ways in. The trigger now fires on UPDATE too, and `business_id` is `NOT NULL`. Reproduced the gap on staging first, then confirmed the fix repairs it.
- **The corrected rollback was not re-runnable.** `drop policy IF EXISTS … ON t` still needs `t` to exist, so a second run would error rather than no-op, breaking the idempotency every other line in that block follows. Guarded with `to_regclass`.

Two further notes it raised, both answered rather than actioned:

- It could not execute the rollback itself (its sandbox blocked the destructive DDL), so it verified that fix analytically and asked for someone to run it for real. **It had already been run for real** before the review started, which is why the header says so; the second, guarded version was re-verified after.
- It reported a `columns_fp` mismatch it then could not reproduce and wrote off as its own tooling. **It was not tooling — it was real, and it was me.** The review was querying while this branch was mid-way through rebuilding staging's tables to fix exactly that mismatch. Recorded because "could not reproduce, probably my tools" is how a real finding gets discarded, and here the only reason it was safe to discard was that someone already knew the cause.

`NOT NULL` is safe only because a BEFORE trigger fills the value before the constraint is checked, so the restore's explicit NULL is repaired rather than rejected.
That ordering is now pinned by a test that fails if the two are swapped, because the swap breaks every restore and nothing else would notice.

## Into CLAUDE.md

Three edits, made under the standing authority of 13 Aug 2026 rather than parked.

- **New Tier 1 trap: "A column DEFAULT does not survive the restore."** The five `select *` inserts, why an absent key beats a DEFAULT, the measurement above, and the rule that the remedy is a trigger rather than a fix to those five inserts.
- **"Three foreign keys" is now "Three foreign keys between the DATA tables".** The live count is fifteen after this batch. The three named are still the only ones that constrain the app, so the section was scoped rather than rewritten, and the new count is stated so a reader who greps and finds fifteen knows which three it means.
- Nothing was proposed and left waiting.

`docs/STAGING.md` also gained two sections: the 181 rehearsal record, and the `ordinal_position` finding below.

## New docs/QUEUE.md items

None.
The finished item was deleted, the following items were renumbered, and `business_id PART 2`'s now-satisfied `Do after: business_id PART 1` line was deleted per the queue's own rule, replaced with a pointer telling PART 2 to read the migration header before writing its policies.
A note was added inside item 9a (the backup history series), in the imperative and ending "answer it here, do not route it onward", because its two new insert paths must not reintroduce a null `business_id`.

## New docs/PHONE.md items

None.
Nothing in this batch is visible on a device, and the read path was verified in a real browser against production.

## Probe

**What did the brief or queue item tell you to do that you would have done differently?**
The item specified "nullable, with a DEFAULT of the single seeded business — the default is what stops rows written by today's client from arriving NULL".
That is correct for the client and wrong for the restore, and following it literally would have shipped a migration that looks right, passes every check, and produces a database where the next disaster recovery puts every row outside the tenant policies.
The item could not have known this; it is only visible by reading `restore_backup`'s body, which says so in its own comments about `updated_at`.
I built the item's design and added the trigger, rather than substituting my own.

The item also said the column should be **nullable**, and it is now `NOT NULL`.
That departure is the review's finding rather than a preference, and it is recorded in the migration header rather than made quietly: the item chose nullable so an additive change could not break an insert, and the trigger already guarantees that, so the constraint costs nothing and converts a silent disappearing row into a loud 23502.

**What did you not propose because it was out of scope?**
`business_members` has no `role` column, though the roles item is already decided as owner plus working staff and adding it now would save a migration.
The item says roles are out of scope, and adding a column later is additive, so it was left out and said so at the site.
I also did not touch the thirteen `using (true)` policies, which is Part 2 and is the half that can empty the app.

## Surprises

**The stated rollback did not work, and I only know because I ran it.**
`businesses`'s `select` policy reads `business_members`, so Postgres refuses to drop the membership table while it stands (2BP01).
The header now drops the policy first, and says it was run rather than merely written.
A rollback that fails is worse than none, because it is only ever reached when something has already gone wrong.

**Rehearsing that rollback then broke the fingerprint, in a way worth knowing about.**
`columns_fp` includes `ordinal_position`, and Postgres never reuses a dropped column's `attnum` — so drop-then-re-add left staging one position higher on all ten tables, with the same column count.
Functionally irrelevant, but it made the mirror's only drift detector permanently red, which is the state where a detector stops being read.
Fixed by dropping and recreating staging's ten data tables from `01-schema.sql`'s sections 1 to 5; `create table if not exists` cannot fix it, because it skips an existing table.
Written up in `docs/STAGING.md` with how to tell "positions differ" from "a column is missing".

**Staging briefly held Max's real café data** as part of the restore rehearsal, and was reloaded with the scale seed afterwards.
Staging's anon key is public in `index.html` and its policies are all `using (true)`, so anything left there is readable by anyone who reads the page.
Noted in `docs/STAGING.md` as a rule: a rehearsal that needs real data ends by wiping it.

**The additive column cannot reach the backup file, and that is by design rather than luck.**
All eight backup groups cross an explicit-field boundary mapper, so `stamp.format` legitimately stays 3.
Confirmed in the real production app in a browser: `business_id` appears nowhere in the whole exported JSON.
