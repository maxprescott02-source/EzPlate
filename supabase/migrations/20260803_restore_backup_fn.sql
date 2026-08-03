-- v110 — restore_backup(): the counterpart to exportBackup, which has shipped without one.
--
-- WHY A POSTGRES FUNCTION AND NOT CLIENT-SIDE WRITES.
-- A partial restore is worse than no restore: if plates land and products don't, every plate
-- line costs nothing and the margin still shows green. PostgREST has no cross-table transaction
-- over multiple requests, so ~575 rows sent from the client is ~6 independent transactions with
-- no rollback between them. An RPC is wrapped in ONE transaction, so this is the only mechanism
-- that can actually promise all-or-nothing. (It is also the only one that CAN run at all:
-- ing_price_history and menu_price_history carry SELECT+INSERT policies only, so the anon key
-- cannot DELETE from them under any circumstances.)
--
-- SECURITY INVOKER, DELIBERATELY — NOT DEFINER.
-- The first draft was SECURITY DEFINER, on the assumption a restore must wipe ing_price_history
-- and anon cannot. That assumption died with the additive-log decision below: this function now
-- needs nothing the anon key does not already hold (ALL policies on ingredients / menu_items /
-- plates / app_settings / supplier_phrases; menus has RLS off entirely; INSERT+SELECT on
-- ing_price_history). So it buys atomicity and NO new privilege. That matters because the anon
-- key is public in index.html — a DEFINER function here would have handed every reader of the
-- page a one-call database wipe that RLS would otherwise have refused.
--
-- WHY THIS FUNCTION NAMES TABLES BUT (ALMOST) NEVER COLUMNS.
-- CLAUDE.md hard rule 8: the export dumps IN-MEMORY shapes, so dishes come out camelCase
-- (menuId, plateId) against snake_case columns (menu_id, plate_id). A restore written from the
-- schema inserts every row with nothing connected — silently, no error, 76 of 77 dishes on the
-- 1 Aug file. The fix is that the CLIENT maps through the existing xToRow writers and sends
-- already-row-shaped JSON; jsonb_populate_recordset then maps by column name, so this function
-- does not need to know a single column name for the five replaced tables. The two exceptions
-- are commented where they occur, and both are forced by the operation rather than by naming.
--
-- APPLIED BY HAND 3 Aug 2026 via the Supabase MCP server (execute_sql). This project has no CLI
-- migration tracking — list_migrations is empty — so this file plus its commit message IS the
-- audit trail. Reversible with: drop function public.restore_backup(jsonb);

create or replace function public.restore_backup(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
-- anon carries statement_timeout=3s. ~575 rows should be tens of milliseconds, so this is
-- belt-and-braces rather than a known need; whether it extends an already-armed statement
-- timer is verified at apply time, not assumed.
set statement_timeout = '30s'
as $$
declare
  required text[] := array['ingredients','menus','plates','menu_items',
                           'supplier_phrases','ing_price_history','app_settings'];
  grp text;
  n_ing int; n_mnu int; n_pla int; n_men int; n_spr int; n_ipl int; n_set int;
begin
  -- The stamp guard exists on BOTH sides on purpose. The client refuses a format-1 file with an
  -- explanation the user can act on; this refuses anything that reaches the database without one,
  -- so a future caller cannot skip the check by not knowing about it.
  if payload->>'format' is distinct from '2' then
    raise exception 'restore_backup: unsupported payload format %; only format 2 is accepted',
      coalesce(payload->>'format', '(none)');
  end if;

  -- EVERY GROUP MUST BE PRESENT AND BE AN ARRAY. This is the guard that matters most here: a
  -- payload missing "ingredients" would otherwise populate zero rows from a NULL and the DELETE
  -- above it would stand — a silently emptied 412-product catalogue, which is precisely the
  -- "renders as real but isn't" failure. An EMPTY array is allowed through: zero menus is a
  -- legitimate state (hard rule 7), and judging whether an empty group is plausible is the
  -- client's job, where it can explain itself to the user.
  foreach grp in array required loop
    if jsonb_typeof(payload->grp) is distinct from 'array' then
      raise exception 'restore_backup: group "%" is missing or is not an array', grp;
    end if;
  end loop;

  -- DELETE ORDER IS FORCED BY A CIRCULAR FK, NOT CHOSEN.
  -- plates.menu_id -> menu_items.id is ON DELETE SET NULL (still live, still used by 20 of 78
  -- plates as of 3 Aug 2026 — CLAUDE.md hard rule 6 said this constraint was gone; it is not).
  -- menu_items.plate_id -> plates.id has NO delete action, so deleting plates first raises a
  -- foreign-key violation. Dishes must go first. Do not "tidy" this order.
  --
  -- `where true` IS LOAD-BEARING — DO NOT REMOVE IT AS REDUNDANT.
  -- Supabase preloads the `safeupdate` extension for the `authenticator` role
  -- (session_preload_libraries = supautils, safeupdate), which rejects any DELETE with no WHERE
  -- clause: "DELETE requires a WHERE clause". The `postgres` role does NOT load it, so a bare
  -- DELETE works from the SQL editor and from the MCP and fails ONLY on the real client path.
  -- That is exactly how this shipped green through every SQL test and failed on the first
  -- browser call (3 Aug 2026). Measured from the anon path, not guessed: bare is blocked, while
  -- `where true`, `where id is not null` and a self-subquery all pass — so safeupdate inspects
  -- the PARSE TREE, not the plan, and constant folding cannot reintroduce the problem.
  -- `where true` is chosen because it states the intent: every row, deliberately.
  delete from menu_items where true;
  delete from plates where true;
  delete from menus where true;
  delete from ingredients where true;
  delete from supplier_phrases where true;
  -- ing_price_history is NOT deleted — see the additive insert near the bottom.

  -- INSERT IN REFERENCE ORDER: products, then menus, then plates, then the dishes that reference
  -- both. jsonb_populate_recordset(null::<table>, ...) yields exactly the table's column list in
  -- table order, so `select *` stays correct if a column is added later.
  -- Absent JSON keys become NULL rather than the column DEFAULT (verified, not assumed), which is
  -- why each insert is followed by a timestamp backfill.
  insert into ingredients select * from jsonb_populate_recordset(null::ingredients, payload->'ingredients');
  get diagnostics n_ing = row_count;
  update ingredients set updated_at = now() where updated_at is null;

  insert into menus select * from jsonb_populate_recordset(null::menus, payload->'menus');
  get diagnostics n_mnu = row_count;
  update menus set created_at = now() where created_at is null;

  -- plates.menu_id is legacy and unmapped by plateToRow, so restored plates carry NULL there.
  -- Nothing reads it (v55); the 20 rows that still hold a value lose it on any restore. Stated
  -- rather than silently true.
  insert into plates select * from jsonb_populate_recordset(null::plates, payload->'plates');
  get diagnostics n_pla = row_count;
  update plates set updated_at = now() where updated_at is null;

  -- menu_items.photo_url is likewise unmapped and restores as NULL. Verified 3 Aug 2026: no code
  -- path reads it and all 78 rows are already NULL.
  insert into menu_items select * from jsonb_populate_recordset(null::menu_items, payload->'menu_items');
  get diagnostics n_men = row_count;
  update menu_items set updated_at = now() where updated_at is null;

  insert into supplier_phrases select * from jsonb_populate_recordset(null::supplier_phrases, payload->'supplier_phrases');
  get diagnostics n_spr = row_count;
  update supplier_phrases set updated_at = now() where updated_at is null;

  -- THE ONE DELIBERATE EXCEPTION TO "REPLACE": ing_price_history is ADDITIVE, never deleted.
  -- These are append-only observations, and the export caps each product at 60 points
  -- (bootstrapSync slices, logIngPrice caps), so a replace could only ever LOSE observations —
  -- silently, in the series the movers card and insight family 1 read. It still restores in full
  -- into an empty table after a real disaster, which is the case that matters.
  -- Columns are named here because a keyed merge requires it, and because `id` is a
  -- nextval() default that must NOT come from the payload.
  -- DISTINCT ON is not decoration. `not exists` dedupes against rows ALREADY in the table, which
  -- makes re-running a restore idempotent — but it cannot see duplicates within the payload itself,
  -- and there is no unique constraint on (product_id, recorded_at) to catch them. Two points sharing
  -- a timestamp in the file would both insert, silently doubling an observation in a series the
  -- movers card reads. The ORDER BY is what makes the survivor deterministic rather than arbitrary.
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

  -- app_settings is UPSERTED, not replaced: the export carries only some of its keys, and the
  -- others (last_invoice_import, the two AI toggles, the two dead deleted_* tombstones) are not
  -- this file's to destroy. Restore replaces the datasets the export CONTAINS.
  insert into app_settings (key, value, updated_at)
  select s.key, s.value, now()
    from jsonb_populate_recordset(null::app_settings, payload->'app_settings') s
   where s.key is not null
  on conflict (key) do update set value = excluded.value, updated_at = now();
  get diagnostics n_set = row_count;

  -- Real counts, so the client reports what happened rather than what it hoped happened, and so
  -- the tests can assert against the database rather than against the request.
  return jsonb_build_object(
    'ingredients',            n_ing,
    'menus',                  n_mnu,
    'plates',                 n_pla,
    'menu_items',             n_men,
    'supplier_phrases',       n_spr,
    'ing_price_points_added', n_ipl,
    'app_settings',           n_set
  );
end;
$$;

revoke all on function public.restore_backup(jsonb) from public;
grant execute on function public.restore_backup(jsonb) to anon, authenticated;
