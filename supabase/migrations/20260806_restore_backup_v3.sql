-- v114 — restore_backup() gains the change log, and learns to read two formats.
--
-- This REPLACES the function created by 20260803_restore_backup_fn.sql. That file stays in the repo as
-- the record of what v110 ran; this one is the current definition. Everything the original file says
-- about WHY this is an RPC rather than client-side writes, why it is SECURITY INVOKER, and why it names
-- tables but almost never columns is unchanged and still load-bearing -- read it first.
--
-- WHAT CHANGES, AND WHY EACH CHANGE IS FORCED
--
-- 1. IT ACCEPTS format 2 OR 3. v114 adds a group to the backup file, which under CLAUDE.md hard rule 9
--    is a format change and must bump the stamp. But refusing format 2 would make
--    ~/Downloads/ezplate-PRE-STEP2.json unrestorable -- the newest backup in existence and the only
--    recovery path there is. Refusing a restorable file costs a real disaster; accepting a format-2 file
--    costs nothing, because the only thing it lacks is a log that did not exist when it was written.
--    So: 2 and 3 both restore. Anything else is still refused by name.
--
-- 2. menu_change_log IS ADDITIVE, NEVER DELETED -- the second deliberate exception to "replace", and
--    for a sharper reason than ing_price_history's. A replace here would mean that restoring last
--    month's backup ERASES every intervention made since, which is exactly the failure the log was
--    built to prevent: a silent loss of the record of what was done, while the trend line it annotates
--    survives. Additive means a restore can never lose an entry that is IN THE FILE -- which is not the
--    same as never losing an entry, and the difference is worth stating. The client reads the newest 500
--    at boot and caps memory at 500, so the export carries at most 500. Everything older lives on the
--    server and only there: fine for a restore onto a live database (nothing was deleted), NOT fine
--    after a full wipe, where anything beyond the newest 500 is gone. Same shape as ing_price_history's
--    60-per-product cap; recorded here rather than left to be discovered.
--    What additive leaves behind is entries describing a state the restore has just rolled back. That
--    is honest and is the right residue: a restore does not un-happen an intervention, and the log's
--    own rule is that an intervention which later proved wrong is still one that happened. How a chart
--    draws a marker pointing at a plate that no longer exists is that batch's decision, not this one's.
--
-- 3. menu_change_log IS NOT IN THE `required` LIST, and that is not laziness. The strict
--    "missing group = damaged file" rule exists because every other group is DELETEd before it is
--    reinserted, so a missing one would silently empty a live table -- a 412-product catalogue replaced
--    with nothing. This group is never deleted, so a missing one can destroy exactly nothing. It is
--    treated as an empty array, which is also what a legitimate format-2 file carries.
--
-- 4. NO CHANGE TO THE DELETE ORDER OR TO `where true`. menu_change_log carries no foreign keys (see
--    20260806_menu_change_log.sql for why that is forced rather than chosen), so it does not enter the
--    circular menu_items/plates dependency, and it is never deleted, so safeupdate never sees it.
--
-- APPLY THIS IN THE SQL EDITOR AFTER 20260806_menu_change_log.sql AND BEFORE THE v114 CODE SHIPS.
-- The two must go in that order: this function references the table.
-- Idempotent: safe to run twice. Reversible by re-running 20260803_restore_backup_fn.sql.
--
-- VERIFY AS THE CLIENT'S ROLE, NOT THROUGH THE SQL EDITOR (CLAUDE.md hard rule 10). `postgres` and
-- `authenticator` differ in preloaded libraries, statement_timeout and RLS; v110's function was hashed,
-- guard-tested and atomicity-proven through the MCP and still failed on the first real browser call.
-- From the app's console:  await SUPA.rpc('restore_backup', {payload:{format:1}})
-- -- which every guard below refuses before a single write, so it is free to run against production.

create or replace function public.restore_backup(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
set statement_timeout = '30s'
as $$
declare
  required text[] := array['ingredients','menus','plates','menu_items',
                           'supplier_phrases','ing_price_history','app_settings'];
  grp text;
  fmt text := payload->>'format';
  n_ing int; n_mnu int; n_pla int; n_men int; n_spr int; n_ipl int; n_set int; n_chg int;
begin
  -- The stamp guard exists on BOTH sides on purpose. The client refuses a bad file with an explanation
  -- the user can act on; this refuses anything that reaches the database without one, so a future caller
  -- cannot skip the check by not knowing about it.
  if fmt is null or fmt not in ('2','3') then
    raise exception 'restore_backup: unsupported payload format %; only formats 2 and 3 are accepted',
      coalesce(fmt, '(none)');
  end if;

  -- EVERY REPLACED GROUP MUST BE PRESENT AND BE AN ARRAY. A payload missing "ingredients" would
  -- otherwise populate zero rows from a NULL while the DELETE below stood -- a silently emptied
  -- catalogue, the "renders as real but isn't" failure. An EMPTY array is allowed through: zero menus is
  -- a legitimate state (hard rule 7), and judging whether an empty group is plausible is the client's
  -- job, where it can explain itself to the user.
  -- menu_change_log is absent from this list by design -- see note 3 in the header.
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
  -- ing_price_history and menu_change_log are NOT deleted -- see the additive inserts below.

  -- INSERT IN REFERENCE ORDER: products, then menus, then plates, then the dishes that reference both.
  -- jsonb_populate_recordset(null::<table>, ...) yields exactly the table's column list in table order,
  -- so `select *` stays correct if a column is added later. Absent JSON keys become NULL rather than the
  -- column DEFAULT (verified, not assumed), which is why each insert is followed by a timestamp backfill.
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

  -- app_settings is UPSERTED, not replaced: the export carries only some of its keys, and the others
  -- (last_invoice_import, the two AI toggles) are not this file's to destroy. Restore replaces the
  -- datasets the export CONTAINS.
  insert into app_settings (key, value, updated_at)
  select s.key, s.value, now()
    from jsonb_populate_recordset(null::app_settings, payload->'app_settings') s
   where s.key is not null
  on conflict (key) do update set value = excluded.value, updated_at = now();
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
    'app_settings',           n_set
  );
end;
$$;

revoke all on function public.restore_backup(jsonb) from public;
grant execute on function public.restore_backup(jsonb) to anon, authenticated;
