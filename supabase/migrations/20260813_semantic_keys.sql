-- ============================================================================
-- EzPlate — THE SEMANTIC KEYS: `app_settings` and `supplier_phrases` become
-- per-tenant, by widening their primary keys rather than by renaming anything.
-- Batch 183.  Queue item "Unique ID generation — the SEMANTIC KEYS half".
--
-- WHAT THIS FIXES, AND IT IS MEASURED RATHER THAN PREDICTED
--   Batch 173 made every SURROGATE id collision-proof (`uid()`), and said so:
--   what was left were four NAMES the code looks things up by, where randomising
--   the id breaks the lookup instead of fixing the collision. Two of those four
--   are table keys, and both are GLOBAL:
--
--     app_settings.key        primary key (key)   -- 'food_cost_target', …
--     supplier_phrases.id     primary key (id)    -- memKey(supplier, phrase)
--
--   Reproduced as the CLIENT on staging, 13 Aug 2026, signed in as the second
--   café, before a line of this file was written:
--
--     POST /rest/v1/app_settings     {"key":"food_cost_target","value":32}
--       -> 42501  new row violates row-level security policy (USING expression)
--     POST /rest/v1/supplier_phrases {"id":"sp-scale-001", …}
--       -> 42501  new row violates row-level security policy (USING expression)
--
--   The mechanism, which is the same one both times and is NOT an import edge
--   case: the key is global, so the second café's upsert becomes an
--   ON CONFLICT DO UPDATE against a row RLS will not let it see, and RLS refuses
--   it on the USING expression. `dbSetSetting` is the ONE writer for every
--   setting and the key names are literals in `js/app.js`, so there is nothing
--   to collide *around*: a second café's FIRST attempt to save a food cost
--   target, a GST default or its kitchen ingredients fails, permanently.
--
--   It fails LOUDLY — `pushWrite` toasts the real error — so this was never
--   silent loss. What it was is the line between "the database can keep two
--   cafés apart" and "the database can carry two cafés". Batch 182 shipped the
--   first; this is the second.
--
-- WHY A COMPOSITE KEY AND NOT A PREFIXED ID
--   The queue item's stated fix for `supplier_phrases` was to prefix the tenant
--   onto the id. That works, and it costs the thing 182 was careful to protect:
--   the client would have to know which tenant it is, and then the decision of
--   which tenant a row belongs to would exist in two places — the client's
--   string and the server's trigger — which is the exact defect 182's section 3
--   was written about. `(business_id, id)` gets the same property with the
--   server still the only thing that answers the question:
--
--     * content-addressing is PRESERVED WITHIN an account, so re-teaching the
--       same pack still UPDATEs one row instead of duplicating it — which
--       CLAUDE.md lists as a fragile area and is the whole reason memKey is
--       content-derived on purpose;
--     * `js/app.js` keeps keying `supplierMem` by `memKey(...)` unchanged;
--     * the client still never sends `business_id`, so tests/business-id.test.js
--       keeps holding.
--
--   ⚠️ THE THIRD OF THE FOUR KEYS IS FIXED BY THIS FILE WITHOUT BEING NAMED IN
--   IT. `nextKid()`'s `K0001` ids live INSIDE the `kitchen_ingredients` blob,
--   which is one `app_settings` row — so once that row is per-café, the kitchen
--   id namespace is per-café by construction. There is nothing to migrate and
--   no client change; it is recorded here because a reader looking for the fix
--   will otherwise go hunting for one.
--
--   The FOURTH — `MENU_ORIGINAL` — is deliberately NOT in this file. It is a
--   client change across 27 literal sites, it cannot use this trick (`menus.id`
--   is referenced by two foreign keys, so scoping it means composite FKs), and
--   preparing this batch turned up a second defect living under the same
--   literal. It is its own queue item and that item carries the measurements.
--
-- WHY THE ORDER IS INDEXES → FUNCTION → PRIMARY KEYS
--   Standing rule: order the statements so the dangerous intermediate state
--   cannot exist, and keep the transaction as well.
--
--   * The composite unique indexes are created FIRST, so uniqueness on these two
--     tables NEVER lapses — not for one statement. `drop constraint` then
--     `add constraint` would, and a PK swap is precisely where you do not want
--     a window.
--   * `restore_backup` is replaced SECOND, and this is the half that is easy to
--     miss. Its `app_settings` upsert says `on conflict (key)`, which becomes
--     **42P10, "there is no unique or exclusion constraint matching the ON
--     CONFLICT specification"** the moment the single-column PK goes. The PK
--     swap and the function are ONE change, not two — and because the composite
--     index already exists by this point, the new conflict target is valid
--     before the old one is taken away.
--   * The PK swap goes LAST, via `add constraint … primary key using index`,
--     which adopts the index created in step 1 and renames it to the constraint
--     name. So `app_settings_pkey` and `supplier_phrases_pkey` keep their names
--     and only their column lists change.
--
-- ROLLBACK, one statement. Narrows both keys back to global and puts the v3
-- conflict target back. Run it whole; the function must go back BEFORE the key
-- it depends on does, for the same reason the migration does it the other way.
--   do $$ begin
--     execute replace(pg_get_functiondef('public.restore_backup(jsonb)'::regprocedure),
--                     'on conflict (business_id, key)', 'on conflict (key)');
--     create unique index app_settings_key_uk on public.app_settings (key);
--     alter table public.app_settings drop constraint app_settings_pkey;
--     alter table public.app_settings
--       add constraint app_settings_pkey primary key using index app_settings_key_uk;
--     create unique index supplier_phrases_id_uk on public.supplier_phrases (id);
--     alter table public.supplier_phrases drop constraint supplier_phrases_pkey;
--     alter table public.supplier_phrases
--       add constraint supplier_phrases_pkey primary key using index supplier_phrases_id_uk;
--     notify pgrst, 'reload schema';
--   end $$;
--
--   ⚠️ IT WILL RAISE 23505 IF A SECOND TENANT HAS ALREADY SAVED A SETTING OR
--   TAUGHT A PACK — because that is the rollback correctly refusing to throw a
--   row away. Narrowing a key is only reversible while the wider key is unused.
--   On production today there is exactly one tenant, so it is clean; it was
--   rehearsed on staging BEFORE the second café's rows existed, for that reason.
--   Re-runnable: no. `create unique index` has no `if not exists` escape that
--   would also be correct here, and a second run would raise 42P07.
--
-- REHEARSED: staging (pboidoxjghntalovzrke), 13 Aug 2026, on 04-seed-scale with
--   the two businesses and three accounts batch 182 left there. See the handover
--   for the transcript; the two results that matter:
--   * the 42501 pair above, reproduced as the client BEFORE the migration and
--     both returning a row AFTER it, as tenant two, over PostgREST;
--   * tenant one's own settings and taught packs unchanged throughout, and
--     neither tenant able to see the other's.
--
-- APPLIED TO PRODUCTION: 13 Aug 2026, by Claude (batch 183), to
--   izrnptxhdylllodvglla. Verified as the anon client over PostgREST — every
--   setting read back at its pre-migration value and a `food_cost_target` upsert
--   round-tripped — and all seven schema fingerprints match staging.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. THE COMPOSITE UNIQUE INDEXES
--
-- Created before anything depends on them and before anything is dropped, so
-- the tables are never for one moment without a uniqueness guarantee on their
-- key. These are the indexes sections 2 and 3 both rely on.
--
-- Column order is (business_id, key) rather than (key, business_id) on purpose:
-- every query the app makes is already scoped to one tenant by RLS, so the
-- leading column is the one every plan filters on first.
-- ---------------------------------------------------------------------------

create unique index app_settings_business_key_uk
  on public.app_settings (business_id, key);

create unique index supplier_phrases_business_id_uk
  on public.supplier_phrases (business_id, id);

-- ---------------------------------------------------------------------------
-- 2. restore_backup, v4 — ONE LINE DIFFERENT FROM v3
--
-- The body below is 20260806_restore_backup_v3.sql's, verbatim, with a single
-- change: the `app_settings` upsert's conflict target. Everything v3's header
-- says about the format guard, the required-group guard, the delete ORDER, the
-- load-bearing `where true`, the two additive inserts and why `select *` was
-- wrong for the change log is unchanged and still load-bearing — READ THAT FILE
-- rather than assuming this one restates it.
--
-- ⚠️ WHY THE WHOLE FUNCTION IS RESTATED FOR A ONE-LINE CHANGE. There is no
-- `alter function … body` in Postgres, and generating the new body by string
-- surgery on `pg_get_functiondef` (which is what the rollback above does, where
-- it is a one-shot) would make the deployed definition depend on what happened
-- to be deployed. A migration that can only be understood by first querying the
-- database is not a record of anything. The assertion in section 5 checks the
-- deployed body for both the new target and the absence of the old one.
--
-- WHY THIS CHANGE IS FORCED, restated at its own site because this is where
-- someone will read it: `on conflict (key)` names an arbiter that stops existing
-- in section 3. Postgres raises 42P10 at RUNTIME, not at replace time, so the
-- migration would apply cleanly and the FIRST RESTORE AFTER IT would fail — and
-- the restore is the path nobody exercises until they need it most.
-- ---------------------------------------------------------------------------

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

  -- app_settings is UPSERTED, not replaced: the export carries only some of its keys, and the others
  -- (last_invoice_import, the two AI toggles) are not this file's to destroy. Restore replaces the
  -- datasets the export CONTAINS.
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
    'app_settings',           n_set
  );
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 3. THE PRIMARY KEY SWAP
--
-- `using index` adopts the index from section 1 and RENAMES it to the
-- constraint name, so both tables keep `<table>_pkey` and only the column list
-- changes. It also sets the key columns NOT NULL — already true of business_id
-- on both tables since batch 181, so this is metadata only and does not rewrite
-- anything.
-- ---------------------------------------------------------------------------

alter table public.app_settings drop constraint app_settings_pkey;
alter table public.app_settings
  add constraint app_settings_pkey primary key using index app_settings_business_key_uk;

alter table public.supplier_phrases drop constraint supplier_phrases_pkey;
alter table public.supplier_phrases
  add constraint supplier_phrases_pkey primary key using index supplier_phrases_business_id_uk;

-- PostgREST derives an upsert's ON CONFLICT target from the table's primary key,
-- and it reads that from a cached schema snapshot. Supabase's event triggers
-- normally reload it on DDL; this makes it explicit, because a stale snapshot
-- here means the client keeps sending the OLD conflict target and the fix looks
-- like it did not work.
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- 4. ASSERT THE RESULT
--
-- Everything here is checkable as `postgres`. What is NOT checkable here —
-- whether the CLIENT's upsert now succeeds as a second tenant — is the whole
-- point of docs/STAGING.md step 5, and 182's section 3 is the standing proof
-- that every SQL-side assertion can pass while the client is broken.
-- ---------------------------------------------------------------------------

do $$
declare
  d text;
  n bigint;
  src text;
begin
  -- (a) Both primary keys are the composite pair. Read from the catalogue's own
  --     rendering of the constraint, so a PK on the right table with the wrong
  --     columns cannot pass.
  select pg_get_constraintdef(oid) into d from pg_constraint where conname = 'app_settings_pkey';
  if d is distinct from 'PRIMARY KEY (business_id, key)' then
    raise exception 'app_settings_pkey is %, expected PRIMARY KEY (business_id, key)', coalesce(d,'(missing)');
  end if;
  select pg_get_constraintdef(oid) into d from pg_constraint where conname = 'supplier_phrases_pkey';
  if d is distinct from 'PRIMARY KEY (business_id, id)' then
    raise exception 'supplier_phrases_pkey is %, expected PRIMARY KEY (business_id, id)', coalesce(d,'(missing)');
  end if;

  -- (b) NOTHING still enforces uniqueness on the bare key. This is the assertion
  --     that matters most and it is not a restatement of (a): a leftover unique
  --     index on `key` alone would leave the collision exactly where it was
  --     while the primary key looked correct, and the symptom would be the same
  --     42501 with nothing in the schema to explain it.
  select count(*) into n
    from pg_index i
    join pg_class c on c.oid = i.indrelid
    join pg_namespace ns on ns.oid = c.relnamespace
   where ns.nspname = 'public'
     and i.indisunique
     and i.indnkeyatts = 1
     and ((c.relname = 'app_settings'     and pg_get_indexdef(i.indexrelid) like '%(key)')
       or (c.relname = 'supplier_phrases' and pg_get_indexdef(i.indexrelid) like '%(id)'));
  if n > 0 then
    raise exception '% single-column unique index(es) still make the key global — the collision is unfixed', n;
  end if;

  -- (c) The DEPLOYED restore_backup names the new arbiter and not the old one.
  --     Checked against the catalogue rather than against this file, because
  --     what runs after a restore is whatever is deployed. `on conflict (key)`
  --     would be 42P10 at runtime — green migration, broken recovery.
  --
  --     ⚠️ THE COMMENT STRIP IS THE ASSERTION, NOT TIDINESS — and this file is
  --     its own evidence. `pg_get_functiondef` returns the body's COMMENTS too,
  --     and the comment above the upsert quotes both spellings in prose. Written
  --     without the strip, the negative check fired on its own explanation (that
  --     is how this was found, on the first staging run) and, far worse, THE
  --     POSITIVE CHECK WOULD HAVE PASSED ON THE PROSE ALONE — green whatever the
  --     statement said. Exactly CLAUDE.md's "an assertion that cannot fail",
  --     in the migration written to prevent a silent break.
  src := regexp_replace(pg_get_functiondef('public.restore_backup(jsonb)'::regprocedure),
                        '--[^\n]*', '', 'g');
  if position('on conflict (business_id, key)' in src) = 0 then
    raise exception 'restore_backup does not carry the composite app_settings conflict target';
  end if;
  if position('on conflict (key)' in src) > 0 then
    raise exception 'restore_backup still carries the bare-key conflict target — 42P10 on the next restore';
  end if;
  -- And it is still the client's own role that runs it, which is what makes the
  -- 182 policies scope a restore to the caller's café for free.
  if (select prosecdef from pg_proc where oid = 'public.restore_backup(jsonb)'::regprocedure) then
    raise exception 'restore_backup became SECURITY DEFINER — it would restore across tenants';
  end if;

  -- (d) No row was lost or duplicated by the widening. A narrow key cannot
  --     produce duplicates under a wider one, so this can only fail if the swap
  --     did something other than what it says — which is exactly when an
  --     assertion earns its place.
  select count(*) into n from public.app_settings;
  if n <> (select count(distinct (business_id, key)) from public.app_settings) then
    raise exception 'app_settings has rows that are not distinct on (business_id, key)';
  end if;
  select count(*) into n from public.supplier_phrases;
  if n <> (select count(distinct (business_id, id)) from public.supplier_phrases) then
    raise exception 'supplier_phrases has rows that are not distinct on (business_id, id)';
  end if;
end $$;

commit;
