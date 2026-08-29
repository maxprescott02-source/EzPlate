-- 219 -- restore_backup, v5: the two history tables the backup never carried.
--
-- QUEUE item 5a. REPLACES the function last defined by 20260814_roles_part1.sql (batch 187), which
-- replaced 20260813_semantic_keys.sql section 2 (batch 183), which replaced
-- 20260806_restore_backup_v3.sql, which replaced 20260803_restore_backup_fn.sql.
-- Everything v3's header says about the format guard, the required-group guard, the delete ORDER,
-- the load-bearing `where true`, and why `select *` was wrong for the change log is UNCHANGED and
-- still load-bearing -- READ THAT FILE rather than assuming this one restates it. 183's one-line
-- change (the app_settings conflict target, forced by its composite primary key) is carried through
-- verbatim; reverting it would raise 42P10 on the next restore. 187's owner-only guard is likewise
-- carried through verbatim and is the FIRST statement in the body.
--
-- ⚠️⚠️ THE FIRST DRAFT OF THIS FILE DROPPED 187'S OWNER GUARD, AND THE MECHANISM IS THE WHOLE REASON
-- THE PARAGRAPH ABOVE NOW LISTS FOUR ANCESTORS INSTEAD OF SAYING "the previous one".
-- It was built by copying the body out of `20260813_semantic_keys.sql` -- because the QUEUE ITEM
-- said, in as many words, "Start from v4, not from 20260806_restore_backup_v3.sql". That advice was
-- written on 12 Aug 2026 and was correct for about 36 hours: batch 187 replaced the function again
-- on 14 Aug, adding the check that stops a STAFF account wiping and replacing a whole catalogue.
-- The item never learned. Copying 183's body forward silently reverted 187.
--
-- It shipped to staging AND to production before the pre-push review caught it. Both were repaired
-- in the same session, both verified below, and no data was lost -- but for the length of that
-- window any signed-in staff member could have called `restore_backup` and replaced everything.
--
-- ⚠️ THREE THINGS ALLOWED IT, and only the third is about a person:
--   1. `tests/roles.test.js` pins the guard by reading `20260814_roles_part1.sql` BY HARDCODED PATH.
--      A migration file is a HISTORICAL RECORD -- it will contain that guard forever, whatever the
--      database holds -- so the assertion stayed green while the shipped function had no guard at
--      all. Fixed in this batch: those tests now read whichever migration LAST defines the function.
--      `tests/restore.test.js` and `tests/semantic-keys.test.js` already worked that way, which is
--      the sharp part: two files had learned the lesson and the third, holding the only
--      security-critical assertion of the three, had not.
--   2. The staging rehearsal exercised `anon` and the OWNER, and never a signed-in STAFF member --
--      so it could not have noticed. It does now, and the measurement is recorded below.
--   3. The queue item's factual claim was trusted over the directory. `CLAUDE.md` already says a
--      queued item's approval does not expire and its FACTS do; this is that rule costing something.
--
-- **THE TRANSFERABLE RULE, and it is now in CLAUDE.md: to copy a function body forward, find the
-- NEWEST migration that defines it -- by listing the directory -- never the one an item, a comment
-- or your memory names.** `create or replace` replaces the WHOLE body, so every guard some other
-- batch added in between is deleted by omission, in silence, with no diff anywhere that shows a
-- deletion. The one command that answers it:
--   grep -l 'create or replace function public.<name>' supabase/migrations/*.sql | sort | tail -1
--
-- WHAT WAS WRONG, measured against production rather than inferred:
--
--   price_history       69 rows   6 Jul - 10 Aug 2026   not in the file, not deleted by the restore
--   menu_price_history  79 rows  30 Jul -  4 Aug 2026   not in the file, not deleted by the restore
--
-- `buildBackup` emitted eight groups and neither table was one of them. On a LIVE database that is
-- harmless -- this function never deleted them, so they simply survived. A FULL WIPE is where it
-- bites: they are gone and nothing puts them back, and the app returns with a flat trend chart, no
-- per-menu food cost and no sell-price history, raising nothing anywhere. That is why the queue's
-- full-wipe item (5b) is sequenced BEHIND this one -- running it first would have lost 148 rows of
-- real history that the export demonstrably could not restore.
--
-- ⚠️ THE DEPLOY ORDER IS THE OPPOSITE OF THIS PROJECT'S USUAL ONE, AND IT IS DELIBERATE.
-- CLAUDE.md says a client change and a migration are one change and the harmless intermediate is
-- USUALLY the client first, because a client written for both answers is cheap. That reasoning does
-- not hold here, and the asymmetry is worth reading before resequencing anything:
--   * NEW server (accepts 2, 3, 4) + OLD client (sends 2 or 3)  -> nothing changes. Harmless.
--   * OLD server (accepts 2, 3)    + NEW client (sends 4)       -> EVERY restore of a new file is
--     refused by name, for as long as the window lasts.
-- So THIS FILE GOES TO PRODUCTION FIRST and the client merges after. The refusal would at least be
-- loud rather than silent, but there is no reason to open the window at all.
-- The client half hedges the same way from its own side: `backupToPayload` sends format 4 only when
-- there is actually a history point to carry, extending the existing `chg.length?3:2` ladder -- the
-- wire number declares WHAT THE PAYLOAD CONTAINS, never which build sent it.
--
-- WHAT CHANGED FROM v4, and it is only these:
--   1. the format guard accepts '4' as well as '2' and '3';
--   2. two optional-group well-formedness guards, mirroring menu_change_log's;
--   3. two ADDITIVE inserts -- price_history and menu_price_history -- with their columns NAMED;
--   4. two counters in the returned object.
-- No delete is added. No grant is changed. The five replaced tables are untouched.
--
-- ⚠️ TWO THINGS IN THE NEW INSERTS THAT LOOK LIKE STYLE AND ARE NOT, restated here because this is
-- the header someone reads before the body:
--   * `price_history.id` is `bigint generated always as identity` -- NOT the bigserial the other
--     three history tables carry. `select *` from a populated recordset would hand it a NULL id and
--     be REJECTED, not defaulted. The columns are named because they have to be.
--   * `e.menu_id is not distinct from p.menu_id`, never `=`. menu_id is NULLABLE and NULL is what
--     the all-menus aggregate series looks like -- 45 of production's 69 rows. `=` yields NULL, the
--     `not exists` therefore holds for rows that are already present, and re-running a restore would
--     silently DUPLICATE the entire aggregate series, doubling the weight of every point the
--     dashboard trend line draws. The dedup is the whole safety of an additive insert; getting the
--     NULL semantics wrong removes it while leaving it fully written out.
--
-- ROLLBACK, one statement: re-run `supabase/migrations/20260813_semantic_keys.sql` section 2 -- the
-- v4 `create or replace` block, which is byte-identical to the body below minus the four changes
-- listed above. A client already sending format 4 would then be refused by name, which is the
-- correct direction for a rollback and the reason the deploy order above is what it is.
--
-- Idempotent: `create or replace`, safe to run twice.
--
-- APPLIED TO STAGING (pboidoxjghntalovzrke), 29 Aug 2026, by Claude, batch 219.
--   Staging was on v4 before (`accepts_4` false, composite conflict target present) -- i.e. exactly
--   production's state, so the transition rehearsed is the real one. `docs/STAGING.md` step 3's seed
--   reload was deliberately SKIPPED and the reason is measured, not a shortcut: the two tables this
--   migration is about already held 264 price_history rows (35 with a NULL menu_id) and 602
--   menu_price_history rows, so the existing data is a RICHER dedup target than a fresh seed, which
--   is the only thing the new inserts can get wrong. A seed reload would have replaced those rows
--   with generated ones and proved less.
--
--   VERIFIED AS THE CLIENT over PostgREST -- signed in as a@example.com (owner of business
--   ...0001, which owns every history row), never through the MCP. The payload was built by the
--   SHIPPED `backupToPayload`, brace-extracted from js/app.js, so the boundary under test is the one
--   the app actually crosses. Measured:
--
--     run 1  food_cost_points_added 6  (3 all-menus + 3 per-menu)   sell_price_points_added 3
--     run 2  food_cost_points_added 0                               sell_price_points_added 0
--
--   Row counts moved 264 -> 270 and 602 -> 605 and then stood still, and all-menus moved 35 -> 38.
--   ⚠️ THE COUNTERFACTUAL WAS MEASURED TOO, so the `is not distinct from` note below is a fact rather
--   than an argument. Running the two predicates side by side against the same payload after run 1:
--     `e.menu_id is not distinct from p.menu_id`  ->  0 rows would insert   (shipped)
--     `e.menu_id = p.menu_id`                     ->  3 rows would insert   (every restore, forever)
--   Those 3 are exactly the all-menus points. With `=` the aggregate series the dashboard trend line
--   draws would double on each restore, with no error and the right-looking row counts.
--
--   Also verified as the client: every restored dish resolved to BOTH its plate and its menu (2 of 2,
--   zero null plate links -- the signature of the 76-of-77 failure); plates inserted with menu_id
--   null; every new history row carried the CALLER'S business_id, none null and none foreign; the
--   three new app_settings keys landed with their real values (ai_invoice_check `false`, which is the
--   one that would look restored if it had been dropped). Refusals fired by name: format 5 -> P0001
--   "only formats 2, 3 and 4 are accepted"; a `price_history` object and a `menu_price_history`
--   string -> P0001 naming the group. A format-3 payload with the two groups REMOVED restored 200 OK
--   with zero history points added, which is the backward compatibility this file promises.
--
--   AND THE MAINTENANCE ITEM THAT RODE THIS BATCH (docs/MAINTENANCE.md, gate review): `anon` retains
--   EXECUTE on this function, and the gate review argued from the schema that it is inert. It is --
--   but the argued MECHANISM was not what fires, which is why running it mattered:
--     * an EMPTY-group payload as anon returns HTTP 200 with all-zero counts. The five
--       `delete ... where true` matched nothing because RLS scopes them to a NULL tenant. This is
--       the sharp case -- SUCCESS and inert -- and a populated payload alone would not have shown it.
--     * a POPULATED payload as anon is refused 42501 "new row violates row-level security policy for
--       table ingredients" and rolls the whole thing back. The gate review predicted a NOT-NULL
--       violation on business_id; the RLS `with check` is what actually refuses first.
--   Every staging count was identical before and after both anon calls. The grants are UNCHANGED by
--   this migration: re-granting or revoking is not this item's to do.
--
-- APPLIED TO PRODUCTION (izrnptxhdylllodvglla), 29 Aug 2026, by Claude, batch 219.
--   Confirmed on v4 immediately before (`accepts_4` false) and that no `__ezplate_staging` marker
--   exists, i.e. that this really is production. `create or replace function` only -- no data is
--   read, written or deleted by applying it, and the row counts were identical either side:
--   284 price_history (124 all-menus), 143 menu_price_history, 44 ing_price_history, 415 products,
--   98 plates, 3 menus, 134 dishes, 159 change-log entries.
--   ⚠️ THE TWO TABLES HAVE GROWN SINCE THE QUEUE ITEM WAS WRITTEN -- it recorded 69 and 79 rows on
--   12 Aug 2026 and they are now 284 and 143. The gap being closed is bigger than the item said.
--   Step 7, the fingerprint diff: all SEVEN values matched between the two projects afterwards,
--   `functions_fp` included (10:7cd8098b4679718cd7063f85dc6b2fd3), so both projects hold a
--   byte-identical body and the mirror in supabase/staging/01-schema.sql matches it too.
--
--   ⚠️ THE CLIENT HAS NOT SHIPPED YET AT THE TIME THIS WAS APPLIED, and that is the intended order --
--   see the deploy-order note above. Production accepts format 4 from the moment this ran; nothing
--   sends it until ezplate-v179 is merged, and the old client's format 2/3 payloads are unaffected.
--
-- RE-APPLIED TO BOTH PROJECTS, 29 Aug 2026, same session -- the owner-guard repair described at the
-- top of this header. Staging was re-created from this file's text; production was repaired by
-- inserting the guard block into its deployed body inside a `do $$ … $$` that REFUSES if the marker
-- it expects is absent and returns early if the guard is already there, so it cannot half-apply.
--   Both projects then returned the SAME `md5(pg_get_functiondef(...))` -- 022197552f422b9837d151e2b7da5df5
--   -- which is what proves production matches this file, since staging's copy came from it verbatim.
--   Both also answer `guard_before_first_delete` = true, checked by string position rather than by
--   eye: a guard placed after any delete is a guard on an already-emptied database.
--
--   VERIFIED AS THE CLIENT, and this is the check the first rehearsal did not have:
--     staff  (d@example.com, staff of ...0001), populated payload    -> 400 P0001 "only an owner may
--                                                                       restore a backup"
--     staff  (same), EMPTY-GROUPS payload                            -> 400 P0001, same message
--     owner  (a@example.com), the same populated payload             -> 200, and 0 additive points,
--                                                                       so the dedup still holds
--   The EMPTY-GROUPS case is the one worth keeping: it is the shape that reaches the five deletes
--   without raising on an insert, so a refusal test that only ever sends a payload which fails at
--   `ingredients` has not tested the deletes at all. Same lesson the anon record above learned, one
--   role along -- and if the first rehearsal had sent it as staff, this whole episode would have
--   been a red result instead of a review finding.

create or replace function public.restore_backup(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
set statement_timeout = '30s'
as $fn$
declare
  required text[] := array['ingredients','menus','plates','menu_items',
                           'supplier_phrases','ing_price_history','app_settings'];
  grp text;
  fmt text := payload->>'format';
  n_ing int; n_mnu int; n_pla int; n_men int; n_spr int; n_ipl int; n_set int; n_chg int;
  n_phi int; n_mph int;
begin
  -- 187 -- ONLY AN OWNER MAY RESTORE, AND THIS IS THE FIRST STATEMENT IN THE FUNCTION.
  -- Everything below deletes five tables before it inserts anything, so a check placed after any of
  -- it would be a check on a database that had already been emptied. RLS cannot express this one:
  -- the restore is SECURITY INVOKER, so its deletes already run as the caller, and staff legitimately
  -- delete ingredients and dishes in the ordinary course of work -- there is nothing in a row to tell
  -- the two apart. `is distinct from` rather than `<>` because a caller with no membership answers
  -- NULL, and NULL <> 'owner' is NULL, which would fall through the `if` and let them past.
  --
  -- 219 -- THIS BLOCK WAS DROPPED BY THE FIRST DRAFT OF v5 AND PUT BACK BY THE PRE-PUSH REVIEW.
  -- v5 was built from 20260813_semantic_keys.sql (v4) because the queue item said to start there,
  -- and 187 had replaced the function the DAY AFTER that file. Copying a function body forward means
  -- finding the newest definition, not the one an item names -- see this file's header.
  if (select public.current_business_role()) is distinct from 'owner' then
    raise exception 'restore_backup: only an owner may restore a backup';
  end if;

  -- The stamp guard exists on BOTH sides on purpose. The client refuses a bad file with an explanation
  -- the user can act on; this refuses anything that reaches the database without one, so a future caller
  -- cannot skip the check by not knowing about it.
  -- 219 -- FORMAT 4 JOINS THE LIST; 2 and 3 stay accepted forever. The two groups format 4 adds are
  -- both ADDITIVE and both OPTIONAL below, so an older payload is not a lesser restore of the same
  -- data -- it is a restore of a file that genuinely did not contain them.
  if fmt is null or fmt not in ('2','3','4') then
    raise exception 'restore_backup: unsupported payload format %; only formats 2, 3 and 4 are accepted',
      coalesce(fmt, '(none)');
  end if;

  -- EVERY REPLACED GROUP MUST BE PRESENT AND BE AN ARRAY. A payload missing "ingredients" would
  -- otherwise populate zero rows from a NULL while the DELETE below stood -- a silently emptied
  -- catalogue, the "renders as real but isn't" failure. An EMPTY array is allowed through: zero menus is
  -- a legitimate state (hard rule 7), and judging whether an empty group is plausible is the client's
  -- job, where it can explain itself to the user.
  -- menu_change_log is absent from this list by design -- see note 3 in the v3 header.
  foreach grp in array required loop
    if jsonb_typeof(payload->grp) is distinct from 'array' then
      raise exception 'restore_backup: group "%" is missing or is not an array', grp;
    end if;
  end loop;

  -- A change-log group that is PRESENT must still be well-formed. Absent is fine; a string or an object
  -- where an array belongs is a damaged file and saying so beats inserting nothing and reporting zero.
  if payload ? 'menu_change_log' and jsonb_typeof(payload->'menu_change_log') is distinct from 'array' then
    raise exception 'restore_backup: group "menu_change_log" is present but is not an array';
  end if;

  -- 219 -- the two new groups get the SAME treatment as menu_change_log and for the same reasons:
  -- absent is legal (a format-2 or -3 payload has no such group), present-but-not-an-array is a
  -- damaged payload and is worth a sentence rather than a silent zero. They are deliberately NOT in
  -- `required`: adding them there would refuse every file taken before this batch, including the one
  -- real recovery file that exists.
  if payload ? 'price_history' and jsonb_typeof(payload->'price_history') is distinct from 'array' then
    raise exception 'restore_backup: group "price_history" is present but is not an array';
  end if;
  if payload ? 'menu_price_history' and jsonb_typeof(payload->'menu_price_history') is distinct from 'array' then
    raise exception 'restore_backup: group "menu_price_history" is present but is not an array';
  end if;

  -- DELETE ORDER IS FORCED BY A CIRCULAR FK, NOT CHOSEN.
  -- menu_items.plate_id -> plates.id carries NO delete action, so deleting plates first raises 23503.
  -- plates.menu_id -> menu_items.id is ON DELETE SET NULL and cannot be inserted before the dishes
  -- exist. Dishes must go first. Do not "tidy" this order.
  --
  -- `where true` IS LOAD-BEARING -- DO NOT REMOVE IT AS REDUNDANT. Supabase preloads `safeupdate` for
  -- the `authenticator` role, which rejects any DELETE with no WHERE clause; the `postgres` role does
  -- NOT load it, so a bare DELETE works from the SQL editor and from the MCP and fails ONLY on the real
  -- client path. That is exactly how v110 shipped green through every SQL test and failed on the first
  -- browser call. Measured, not guessed: bare is blocked, `where true` passes, so safeupdate reads the
  -- PARSE TREE rather than the plan and constant folding cannot reintroduce the problem.
  delete from menu_items where true;
  delete from plates where true;
  delete from menus where true;
  delete from ingredients where true;
  delete from supplier_phrases where true;
  -- NONE of the four history tables is deleted -- ing_price_history, menu_change_log, price_history
  -- and menu_price_history all arrive through the additive inserts below. That is what lets a restore
  -- run onto a LIVE database without erasing observations taken since the export, and it is also why
  -- the two groups 219 adds could be missing from this function for so long without anyone noticing:
  -- on a live database their absence is invisible. It is the FULL WIPE that exposes it.

  -- INSERT IN REFERENCE ORDER: products, then menus, then plates, then the dishes that reference both.
  -- jsonb_populate_recordset(null::<table>, ...) yields exactly the table's column list in table order,
  -- so `select *` stays correct if a column is added later. Absent JSON keys become NULL rather than the
  -- column DEFAULT (verified, not assumed), which is why each insert is followed by a timestamp backfill
  -- and why business_id is filled by a BEFORE INSERT trigger rather than by its DEFAULT.
  insert into ingredients select * from jsonb_populate_recordset(null::ingredients, payload->'ingredients');
  get diagnostics n_ing = row_count;
  update ingredients set updated_at = now() where updated_at is null;

  insert into menus select * from jsonb_populate_recordset(null::menus, payload->'menus');
  get diagnostics n_mnu = row_count;
  update menus set created_at = now() where created_at is null;

  -- plates.menu_id is legacy and unmapped by plateToRow, so restored plates carry NULL there. Nothing
  -- reads it -- as of v112 plateIdOf does not look at plate.menuId at all -- and 0 of 78 rows still hold
  -- a value. Stated rather than silently true.
  insert into plates select * from jsonb_populate_recordset(null::plates, payload->'plates');
  get diagnostics n_pla = row_count;
  update plates set updated_at = now() where updated_at is null;

  -- menu_items.photo_url is likewise unmapped and restores as NULL. No code path reads it.
  insert into menu_items select * from jsonb_populate_recordset(null::menu_items, payload->'menu_items');
  get diagnostics n_men = row_count;
  update menu_items set updated_at = now() where updated_at is null;

  insert into supplier_phrases select * from jsonb_populate_recordset(null::supplier_phrases, payload->'supplier_phrases');
  get diagnostics n_spr = row_count;
  update supplier_phrases set updated_at = now() where updated_at is null;

  -- ADDITIVE #1: ing_price_history. Append-only observations, and the export caps each product at 60
  -- points, so a replace could only ever LOSE observations -- silently, in the series the movers card
  -- reads. Columns are named here because a keyed merge requires it and because `id` is a nextval()
  -- default that must NOT come from the payload. DISTINCT ON is not decoration: `not exists` dedupes
  -- against rows already in the table, but cannot see duplicates WITHIN the payload, and two points
  -- sharing a timestamp would now raise against ing_price_history_product_moment_key rather than
  -- silently double-weight an observation. The ORDER BY makes the survivor deterministic.
  insert into ing_price_history (product_id, recorded_at, cost_per_base_unit)
  select distinct on (p.product_id, p.recorded_at)
         p.product_id, p.recorded_at, p.cost_per_base_unit
    from jsonb_populate_recordset(null::ing_price_history, payload->'ing_price_history') p
   where p.product_id is not null
     and p.recorded_at is not null
     and p.cost_per_base_unit is not null
     and not exists (select 1 from ing_price_history e
                      where e.product_id = p.product_id
                        and e.recorded_at = p.recorded_at)
   order by p.product_id, p.recorded_at, p.cost_per_base_unit;
  get diagnostics n_ipl = row_count;

  -- ADDITIVE #2: menu_change_log. The conflict target is the entry's own client-generated id, so
  -- re-running a restore inserts nothing the second time. No DISTINCT ON is needed either: `on conflict
  -- do nothing` also absorbs duplicates WITHIN the payload, which is the case a unique-constraint merge
  -- cannot handle on its own.
  -- coalesce on the group, not a guard clause: a format-2 file has no such group and that is not an error.
  --
  -- ⚠️ THE WHERE CLAUSE AND THE NAMED COLUMNS ARE LOAD-BEARING, AND `select *` WAS WRONG HERE.
  -- Absent JSON keys populate as NULL rather than as the column default (stated at the top of this
  -- function, and the reason every insert above is followed by a timestamp backfill). id, recorded_at,
  -- kind and menu_ids are all NOT NULL. So ONE malformed entry -- a hand-edited file, a foreign file, a
  -- future client with a bug -- would raise a not-null violation and roll back the WHOLE transaction,
  -- taking the products, plates, dishes and menus with it. This function argues that the change log
  -- "can destroy exactly nothing because it is never deleted"; with `select *` it was the only group
  -- able to veto a catalogue recovery. A log has no business doing that. Same filtering discipline as
  -- ing_price_history above, for the same reason.
  --
  -- The conflict target here is UNTOUCHED by batch 183 and must stay that way: menu_change_log's primary
  -- key is still `id` alone, and it does not need widening because those ids come from uid() (batch 173)
  -- and are collision-proof across accounts by construction. Only the two CONTENT-derived keys moved.
  insert into menu_change_log (id, recorded_at, kind, plate_id, dish_id, menu_ids,
                               avg_before, avg_after, cost_before, cost_after, detail)
  select p.id, p.recorded_at, p.kind, p.plate_id, p.dish_id, coalesce(p.menu_ids, '{}'),
         p.avg_before, p.avg_after, p.cost_before, p.cost_after, p.detail
    from jsonb_populate_recordset(null::menu_change_log,
                                  coalesce(payload->'menu_change_log', '[]'::jsonb)) p
   where p.id is not null
     and p.recorded_at is not null
     and p.kind is not null
  on conflict (id) do nothing;
  get diagnostics n_chg = row_count;

  -- ADDITIVE #3: price_history -- the all-menus food cost series AND the per-menu one, which are one
  -- table split in memory by whether menu_id is set. Additive for the same reason as the two above:
  -- the export trims each series to its in-memory window (500 points for these, 60 for the sell-price
  -- log below), so a REPLACE could only ever lose observations from the table that holds the lot.
  --
  -- ⚠️ THE COLUMNS ARE NAMED, AND HERE THAT IS NOT A STYLE CHOICE -- `select *` WOULD RAISE.
  -- price_history.id is `bigint generated always as identity`, unlike the bigserial on every other
  -- history table, so a populated recordset carrying a NULL id is rejected outright rather than
  -- defaulted. (ing_price_history above gets away with naming columns for a softer reason; this one
  -- has no choice.) business_id is likewise absent on purpose: the BEFORE INSERT trigger fills it
  -- with the CALLER'S tenant, which is what makes a restore land in the caller's own cafe and what
  -- makes a file carrying another tenant's id fail `with check` rather than be silently adopted.
  --
  -- ⚠️ `is not distinct from` ON menu_id IS LOAD-BEARING AND `=` IS THE BUG. menu_id is NULLABLE and
  -- NULL is exactly what the all-menus series looks like -- 45 of production's 69 rows. With `=` the
  -- comparison is NULL rather than true, `not exists` therefore holds for every all-menus point that
  -- is ALREADY in the table, and re-running a restore duplicates the whole aggregate series silently,
  -- doubling the weight of every point the dashboard trend line draws. Same for the DISTINCT ON,
  -- which treats NULLs as equal and so needs no such care -- the asymmetry is Postgres's, not ours.
  insert into price_history (recorded_at, avg_food_cost_pct, menu_id)
  select distinct on (p.menu_id, p.recorded_at)
         p.recorded_at, p.avg_food_cost_pct, p.menu_id
    from jsonb_populate_recordset(null::price_history,
                                  coalesce(payload->'price_history', '[]'::jsonb)) p
   where p.recorded_at is not null
     and p.avg_food_cost_pct is not null
     and not exists (select 1 from price_history e
                      where e.recorded_at = p.recorded_at
                        and e.menu_id is not distinct from p.menu_id)
   order by p.menu_id, p.recorded_at, p.avg_food_cost_pct;
  get diagnostics n_phi = row_count;

  -- ADDITIVE #4: menu_price_history -- the per-dish SELL price log. menu_item_id and price are both
  -- NOT NULL on the table, so the filter is a guard against one malformed entry rolling back the
  -- whole catalogue recovery, which is the reason the change log above stopped using `select *`.
  -- No `is not distinct from` needed here: menu_item_id is NOT NULL.
  insert into menu_price_history (menu_item_id, recorded_at, price)
  select distinct on (p.menu_item_id, p.recorded_at)
         p.menu_item_id, p.recorded_at, p.price
    from jsonb_populate_recordset(null::menu_price_history,
                                  coalesce(payload->'menu_price_history', '[]'::jsonb)) p
   where p.menu_item_id is not null
     and p.recorded_at is not null
     and p.price is not null
     and not exists (select 1 from menu_price_history e
                      where e.menu_item_id = p.menu_item_id
                        and e.recorded_at = p.recorded_at)
   order by p.menu_item_id, p.recorded_at, p.price;
  get diagnostics n_mph = row_count;

  -- app_settings is UPSERTED, not replaced: the export may carry only some of its keys, and the ones
  -- it does not carry are not this file's to destroy. Restore replaces the datasets the export
  -- CONTAINS.
  -- ⚠️ THE PARENTHETICAL THAT USED TO BE HERE NAMED last_invoice_import AND THE TWO AI TOGGLES as the
  -- examples of keys the export never carries. Format 4 carries all three, so the example is now
  -- wrong while the rule is unchanged -- corrected rather than deleted, because "the export carries
  -- only some of its keys" is still true (the retired tombstone keys are still not carried, and
  -- deliberately: no reader remains for them). No change to the statement itself: an upsert by key
  -- needs no list of which keys exist, which is exactly why the three new ones need no server change.
  --
  -- ⚠️ THE ONE LINE THAT DIFFERS FROM v3, AND IT IS FORCED, NOT TIDIED. The v3 arbiter was the bare
  -- `key`, which stops existing once app_settings' primary key is (business_id, key) — Postgres would
  -- raise 42P10 at RUNTIME, so the migration applies green and the first restore after it fails.
  -- business_id is deliberately NOT in the insert column list: the trigger and the DEFAULT both fill it
  -- with the CALLER'S tenant, which is what makes a restore land in the caller's own café and what makes
  -- a file carrying another tenant's id fail `with check` instead of being silently adopted. Naming the
  -- column here would move that decision into the payload, which is the one place it must never live.
  insert into app_settings (key, value, updated_at)
  select s.key, s.value, now()
    from jsonb_populate_recordset(null::app_settings, payload->'app_settings') s
   where s.key is not null
  on conflict (business_id, key) do update set value = excluded.value, updated_at = now();
  get diagnostics n_set = row_count;

  -- Real counts, so the client reports what happened rather than what it hoped happened, and so the
  -- tests can assert against the database rather than against the request.
  return jsonb_build_object(
    'ingredients',            n_ing,
    'menus',                  n_mnu,
    'plates',                 n_pla,
    'menu_items',             n_men,
    'supplier_phrases',       n_spr,
    'ing_price_points_added', n_ipl,
    'change_log_added',       n_chg,
    'food_cost_points_added', n_phi,
    'sell_price_points_added', n_mph,
    'app_settings',           n_set
  );
end;
$fn$;
