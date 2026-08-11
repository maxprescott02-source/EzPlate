-- ============================================================================
-- EzPlate — STAGING schema mirror
-- Project: pboidoxjghntalovzrke (supabase-staging).  NEVER production.
--
-- WHY THIS FILE EXISTS
--   `.mcp.json` has carried a staging project since v121 and the MCP server has
--   answered since 10 Aug 2026, but the schema was EMPTY — so there was nothing to
--   rehearse against and every migration reached production unrehearsed. CLAUDE.md
--   says that out loud at "Migrations — Claude applies them". This file is the
--   thing that makes the safeguard real.
--
-- WHAT IT IS
--   A faithful mirror of production's `public` schema as read out of the live
--   catalogue on 11 Aug 2026 (batch 172): 10 tables, their constraints, indexes,
--   RLS state and policies, the `restore_backup` RPC, and the PostgREST grants.
--   It is IDEMPOTENT — safe to re-run — so re-mirroring after a production
--   migration is just running it again.
--
--   It adds ONE object production does not have, on purpose: `__ezplate_staging`.
--   See the marker section. That single deliberate difference is what every seed
--   file guards on, and it is why `list_tables` shows 11 here against production's 10.
--
-- HOW TO APPLY
--   Through the `supabase-staging` MCP server's execute_sql, or the staging SQL
--   editor. Both run as `postgres`. That is fine for CREATING the schema — but
--   CLAUDE.md's "The client's role is not the MCP's role" still holds for
--   VERIFYING it, so the verification step is a PostgREST call with the staging
--   anon key, not a query here. docs/STAGING.md has the procedure.
--
-- ROLLBACK, one statement:
--   drop schema public cascade; create schema public;
--   (Acceptable ONLY because this database is disposable by definition. Never
--   type it against production. There is no staging data worth keeping — the
--   seeds rebuild everything.)
--
-- APPLIED: 11 Aug 2026, by Claude (batch 172), to pboidoxjghntalovzrke.
-- VERIFIED: table/column/constraint/index/policy counts diffed against production
--   through both MCP servers, then exercised AS THE CLIENT over PostgREST with the
--   staging publishable key — see docs/STAGING.md and the handover.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. THE MARKER — the one deliberate difference from production.
--
-- Every seed file in this directory refuses to run unless this table exists.
-- Production does not have it and must never have it, so a seed pasted into the
-- production SQL editor by accident raises before it deletes anything.
--
-- RLS is on with NO policy, and no grants are issued to anon/authenticated, so
-- the client cannot see it: PostgREST returns an empty array, which is exactly
-- what we want from a table the app has no business knowing about.
-- ---------------------------------------------------------------------------
-- ⚠️ THIS FILE HAS TO GUARD TOO, AND FOR A SHARPER REASON THAN THE SEEDS DO.
-- Everything else here is idempotent and harmless against production — but
-- CREATING THE MARKER THERE WOULD DISARM EVERY SEED, because each seed's only
-- protection is that production does not have this table. Running 01 on
-- production and then 02 by mistake would wipe the café, and the second command
-- would look like it was doing the right thing.
--
-- The test is "does this database already hold a catalogue": production has
-- hundreds of products, a fresh staging project has no `ingredients` table at
-- all, and an already-mirrored staging is let through by the first branch so
-- re-running stays free. It is a heuristic, not an identity check — there is no
-- project ref exposed to SQL to compare against — but it is the strongest signal
-- available in-band, and it fails CLOSED.
do $$
begin
  if to_regclass('public.__ezplate_staging') is not null then
    return;                                                   -- already mirrored; re-run is a no-op
  end if;
  if to_regclass('public.ingredients') is not null
     and exists (select 1 from public.ingredients) then
    raise exception 'REFUSED: this database already holds a product catalogue, so it is not an empty staging project. 01-schema.sql creates the marker every seed guards on, and creating it here would DISARM those guards. Nothing has been changed.';
  end if;
  create table public.__ezplate_staging (
    ok boolean primary key default true,
    note text not null default 'This database is EzPlate STAGING. Seeds guard on this table. Production must never have it.',
    created_at timestamptz not null default now(),
    constraint __ezplate_staging_singleton check (ok)
  );
  alter table public.__ezplate_staging enable row level security;
  insert into public.__ezplate_staging (ok) values (true) on conflict (ok) do nothing;
end $$;

-- ---------------------------------------------------------------------------
-- 1. TABLES
--
-- Column order, nullability and defaults are copied from production's
-- information_schema, not from the migration files — the files are the audit
-- trail of CHANGES and several columns arrived by later ALTER, so the live
-- catalogue is the only honest source for the end state.
--
-- The two foreign keys between `plates` and `menu_items` are CIRCULAR
-- (CLAUDE.md, "Three foreign keys"), so every table is created first and the
-- FKs are added afterwards in section 2. Creating them inline is impossible in
-- any order.
-- ---------------------------------------------------------------------------

create table if not exists public.ingredients (
  id                  text primary key,
  description         text not null,
  brand               text,
  category            text,
  sub_category        text,
  item_type           text,
  base_unit           text,
  cost_per_base_unit  numeric,
  cost_basis          text,
  is_food             boolean default true,
  pack_size_raw       text,
  sold_by             text,
  current_price_exgst numeric,
  price_as_of         timestamptz,
  search_aliases      jsonb default '[]'::jsonb,
  is_custom           boolean default false,
  updated_at          timestamptz default now(),
  supplier            text,
  pack_qty            numeric,
  pack_unit           text
);

create table if not exists public.menus (
  id         text primary key,
  name       text not null,
  season     text,
  created_at timestamptz default now()
);

create table if not exists public.plates (
  id         text primary key,
  name       text not null,
  menu_id    text,
  lines      jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now(),
  category   text
);

create table if not exists public.menu_items (
  id              text primary key,
  section         text,
  name            text not null,
  price           numeric,
  notes           text,
  is_custom       boolean default false,
  updated_at      timestamptz default now(),
  menu_id         text,
  photo_url       text,
  source_plate_id text,
  plate_id        text
);

create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.supplier_phrases (
  id          text primary key,
  supplier    text not null,
  phrase_norm text not null,
  qty         numeric not null,
  unit        text not null,
  updated_at  timestamptz default now()
);

-- `price_history.id` is a real IDENTITY column (GENERATED ALWAYS); the two
-- history tables below use plain serial-style sequence defaults. That asymmetry
-- is production's and is reproduced rather than tidied, because the restore RPC
-- inserts into `ing_price_history` WITHOUT naming id and would behave differently
-- if this one were identity-always too.
create table if not exists public.price_history (
  id                bigint generated always as identity primary key,
  recorded_at       timestamptz not null default now(),
  avg_food_cost_pct numeric,
  menu_id           text
);

create table if not exists public.menu_price_history (
  id           bigserial primary key,
  menu_item_id text not null,
  recorded_at  timestamptz not null default now(),
  price        numeric not null
);

create table if not exists public.ing_price_history (
  id                 bigserial primary key,
  product_id         text not null,
  recorded_at        timestamptz not null default now(),
  cost_per_base_unit numeric not null
);

create table if not exists public.menu_change_log (
  id          text primary key,
  recorded_at timestamptz not null default now(),
  kind        text not null,
  plate_id    text,
  dish_id     text,
  menu_ids    text[] not null default '{}'::text[],
  avg_before  numeric,
  avg_after   numeric,
  cost_before numeric,
  cost_after  numeric,
  detail      jsonb
);

-- ---------------------------------------------------------------------------
-- 2. CONSTRAINTS THAT COULD NOT BE INLINE
--
-- `add constraint` has no IF NOT EXISTS, so each is wrapped in a catch on
-- duplicate_object to keep the file re-runnable.
--
-- ⚠️ The FK definitions here are load-bearing and are copied exactly:
--   menu_items.plate_id -> plates.id     NO ACTION  (the app's only 23503 hazard)
--   plates.menu_id      -> menu_items.id ON DELETE SET NULL  (legacy, read by nothing)
--   menu_items.menu_id  -> menus.id      ON DELETE SET NULL
-- Getting the first one's action wrong would make staging SILENTLY tolerate a
-- delete order that production rejects, which is the exact class of bug a
-- rehearsal exists to catch.
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter table public.ingredients
      add constraint ingredients_base_unit_check
      check (base_unit = any (array['g'::text, 'ml'::text, 'ea'::text]));
  exception when duplicate_object or duplicate_table then null; end;

  begin
    alter table public.ing_price_history
      add constraint ing_price_history_product_moment_key unique (product_id, recorded_at);
  exception when duplicate_object or duplicate_table then null; end;

  begin
    alter table public.menu_items
      add constraint menu_items_plate_id_fkey foreign key (plate_id) references public.plates(id);
  exception when duplicate_object or duplicate_table then null; end;

  begin
    alter table public.menu_items
      add constraint menu_items_menu_id_fkey foreign key (menu_id) references public.menus(id) on delete set null;
  exception when duplicate_object or duplicate_table then null; end;

  begin
    alter table public.plates
      add constraint plates_menu_id_fkey foreign key (menu_id) references public.menu_items(id) on delete set null;
  exception when duplicate_object or duplicate_table then null; end;
end $$;

-- ---------------------------------------------------------------------------
-- 3. INDEXES (beyond the primary keys and the unique constraint above)
-- ---------------------------------------------------------------------------
create index if not exists ing_price_history_product_recorded_at_idx
  on public.ing_price_history using btree (product_id, recorded_at);
create index if not exists menu_change_log_recorded_at_idx
  on public.menu_change_log using btree (recorded_at desc);
create index if not exists menu_items_plate_id_idx
  on public.menu_items using btree (plate_id);
create index if not exists menu_price_history_item_recorded_at_idx
  on public.menu_price_history using btree (menu_item_id, recorded_at);
create index if not exists price_history_menu_id_recorded_at_idx
  on public.price_history using btree (menu_id, recorded_at);

-- ---------------------------------------------------------------------------
-- 4. RLS AND POLICIES
--
-- Production has RLS ON with at least one permissive policy on all ten tables.
-- Policy NAMES are copied verbatim, because the multi-tenant item's whole job is
-- to REPLACE these `using (true)` policies with business_id ones — and it will
-- find them by name.
--
-- ⚠️ Order matters and is the CLAUDE.md rule, not a style choice: the policy is
-- created BEFORE RLS is enabled, so a failure between the two leaves the table
-- readable rather than locked out. Same shape as 20260808_menus_rls.sql.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  full_access text[] := array['app_settings','ingredients','menu_items','menus','plates'];
  hist        text[] := array['ing_price_history','menu_change_log','menu_price_history'];
begin
  -- the five "staff full access" tables
  foreach t in array full_access loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='staff full access') then
      execute format('create policy %I on public.%I for all to public using (true) with check (true)', 'staff full access', t);
    end if;
    execute format('alter table public.%I enable row level security', t);
  end loop;

  -- the three append-only history tables: anon/authenticated may SELECT and INSERT,
  -- and nothing grants UPDATE or DELETE. Production words them "<table> anon select"
  -- and "<table> anon insert"; the names are reproduced exactly.
  foreach t in array hist loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||' anon select') then
      execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t||' anon select', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||' anon insert') then
      execute format('create policy %I on public.%I for insert to anon, authenticated with check (true)', t||' anon insert', t);
    end if;
    execute format('alter table public.%I enable row level security', t);
  end loop;

  -- two singletons whose production policy names match neither pattern
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='price_history' and policyname='price_history all') then
    create policy "price_history all" on public.price_history for all to public using (true) with check (true);
  end if;
  alter table public.price_history enable row level security;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='supplier_phrases' and policyname='open access (single-tenant, pre-login)') then
    create policy "open access (single-tenant, pre-login)" on public.supplier_phrases for all to public using (true) with check (true);
  end if;
  alter table public.supplier_phrases enable row level security;
end $$;

-- ---------------------------------------------------------------------------
-- 5. GRANTS
--
-- Production carries Supabase's stock grant-all to the three API roles on every
-- public table. RLS is what actually constrains them; the grants only decide
-- whether PostgREST sees the table at all. `__ezplate_staging` is deliberately
-- EXCLUDED — it is granted to nobody, so the client cannot read the marker.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['app_settings','ingredients','ing_price_history','menu_change_log',
                           'menu_items','menu_price_history','menus','plates',
                           'price_history','supplier_phrases'] loop
    execute format('grant all on table public.%I to anon, authenticated, service_role', t);
  end loop;
end $$;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. THE RESTORE RPC
--
-- Copied verbatim from production's pg_get_functiondef on 11 Aug 2026. Do not
-- hand-edit it here: if it drifts, staging stops rehearsing the thing that
-- actually runs. When a production migration changes it, re-copy the whole body.
--
-- It is SECURITY INVOKER (queue item "Gate review before public signup" requires
-- it to stay that way), and its `delete ... where true` lines are LOAD-BEARING:
-- `safeupdate` rejects a WHERE-less DELETE for `authenticator` but not for
-- `postgres`, so removing them would break the client while still passing here.
-- ---------------------------------------------------------------------------
create or replace function public.restore_backup(payload jsonb)
 returns jsonb
 language plpgsql
 set search_path to 'public'
 set statement_timeout to '30s'
as $function$
declare
  required text[] := array['ingredients','menus','plates','menu_items',
                           'supplier_phrases','ing_price_history','app_settings'];
  grp text;
  fmt text := payload->>'format';
  n_ing int; n_mnu int; n_pla int; n_men int; n_spr int; n_ipl int; n_set int; n_chg int;
begin
  if fmt is null or fmt not in ('2','3') then
    raise exception 'restore_backup: unsupported payload format %; only formats 2 and 3 are accepted',
      coalesce(fmt, '(none)');
  end if;

  foreach grp in array required loop
    if jsonb_typeof(payload->grp) is distinct from 'array' then
      raise exception 'restore_backup: group "%" is missing or is not an array', grp;
    end if;
  end loop;

  if payload ? 'menu_change_log' and jsonb_typeof(payload->'menu_change_log') is distinct from 'array' then
    raise exception 'restore_backup: group "menu_change_log" is present but is not an array';
  end if;

  delete from menu_items where true;
  delete from plates where true;
  delete from menus where true;
  delete from ingredients where true;
  delete from supplier_phrases where true;

  insert into ingredients select * from jsonb_populate_recordset(null::ingredients, payload->'ingredients');
  get diagnostics n_ing = row_count;
  update ingredients set updated_at = now() where updated_at is null;

  insert into menus select * from jsonb_populate_recordset(null::menus, payload->'menus');
  get diagnostics n_mnu = row_count;
  update menus set created_at = now() where created_at is null;

  insert into plates select * from jsonb_populate_recordset(null::plates, payload->'plates');
  get diagnostics n_pla = row_count;
  update plates set updated_at = now() where updated_at is null;

  insert into menu_items select * from jsonb_populate_recordset(null::menu_items, payload->'menu_items');
  get diagnostics n_men = row_count;
  update menu_items set updated_at = now() where updated_at is null;

  insert into supplier_phrases select * from jsonb_populate_recordset(null::supplier_phrases, payload->'supplier_phrases');
  get diagnostics n_spr = row_count;
  update supplier_phrases set updated_at = now() where updated_at is null;

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

  insert into app_settings (key, value, updated_at)
  select s.key, s.value, now()
    from jsonb_populate_recordset(null::app_settings, payload->'app_settings') s
   where s.key is not null
  on conflict (key) do update set value = excluded.value, updated_at = now();
  get diagnostics n_set = row_count;

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
$function$;

grant execute on function public.restore_backup(jsonb) to anon, authenticated, service_role;
