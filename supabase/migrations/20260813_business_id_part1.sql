-- ============================================================================
-- EzPlate — `business_id` on every table, PART 1: THE ADDITIVE HALF
-- Batch 181.  Queue item "`business_id` on every table — PART 1".
--
-- WHAT THIS DOES
--   Adds the tenant column and the two tables it points at, and NOTHING ELSE.
--   No policy on the ten existing tables is touched, no client file changes,
--   and no role is introduced. After this migration the app must behave
--   EXACTLY as it did before it — same rows, same reads, same writes. That is
--   the acceptance test, not a hope.
--
--   Part 2 (the policy swap) is the half that can empty the app. It is a
--   separate migration on purpose: bundling them would mean the safe work
--   could not merge until the risky work was finished.
--
-- WHY A TRIGGER AS WELL AS A DEFAULT — the thing the queue item did not know
--   The item's design is "nullable, with a DEFAULT of the single seeded
--   business — the default is what stops rows written by today's client from
--   arriving NULL". That is right for the client and WRONG for the restore.
--
--   `restore_backup` (20260806_restore_backup_v3.sql) inserts five tables as
--       insert into ingredients select * from jsonb_populate_recordset(...)
--   with no column list. `jsonb_populate_recordset` yields the table's whole
--   column list, and an absent JSON key becomes an EXPLICIT NULL — which
--   overrides a column DEFAULT rather than falling back to it. That migration
--   states it at the site: "Absent JSON keys become NULL rather than the
--   column DEFAULT (verified, not assumed)", which is why it backfills
--   `updated_at` after every insert.
--
--   So with a DEFAULT alone, the first restore after this migration would
--   write every product, plate, dish, menu and supplier phrase with
--   business_id NULL. Today that is invisible. Under Part 2's policies it is
--   "all my data is gone" — the exact failure this item was split to avoid,
--   reached by a path the item did not consider.
--
--   The trigger below is the second line of defence and covers every insert
--   path, including the NEW `restore_backup` that queue item 10a ("the backup
--   does not carry three of the five history series") is about to write. It is
--   deliberately not a fix to `restore_backup`'s five inserts: that fix would
--   have to be remembered again by 10a, and a trigger cannot be forgotten.
--   ⚠️ PART 2 REPLACES THIS FUNCTION'S BODY, it does not delete the triggers —
--   the tenant then comes from the caller's membership instead of the single
--   seeded business.
--
-- WHY THE SEEDED ID IS A FIXED LITERAL, NOT gen_random_uuid()
--   The column DEFAULT is part of the `columns_fp` fingerprint in
--   docs/STAGING.md ("def="). A generated id would differ between staging and
--   production forever, and the fingerprint diff — the thing that proves the
--   mirror is not stale — would be permanently red and therefore ignored.
--
-- WHY RLS ON THE TWO NEW TABLES IS NOT OPTIONAL
--   Supabase's default privileges grant `anon` SELECT/INSERT/UPDATE/DELETE on
--   every new table in `public`. Verified against the live grants on this
--   project, not assumed. A new table with RLS off is world-writable through
--   PostgREST with the anon key that ships in index.html. Both new tables get
--   RLS on with `select` policies for `authenticated` only; `anon` gets
--   nothing, and nothing in the client reads either table yet.
--
-- ORDERING — so the dangerous intermediate state cannot exist
--   One transaction (Supabase wraps this), AND ordered so a failure at any
--   point leaves today's behaviour: the FK target and the DEFAULT's referent
--   are created and seeded before any column references them, and each table's
--   column/backfill/index/trigger group completes before the next begins.
--
-- ROLLBACK, one statement — RUN AND VERIFIED ON STAGING, 13 Aug 2026, not just
-- written down. It left 0 columns, 0 triggers, 0 indexes, no function and no
-- tenant tables, with all 520 products and 429 dishes untouched.
--   do $$ declare t text; begin
--     foreach t in array array['app_settings','ing_price_history','ingredients',
--       'menu_change_log','menu_items','menu_price_history','menus','plates',
--       'price_history','supplier_phrases'] loop
--       execute format('drop trigger if exists set_business_id on public.%I', t);
--       execute format('alter table public.%I drop column if exists business_id', t);
--     end loop;
--     drop function if exists public.set_default_business_id();
--     drop policy if exists "members read their business" on public.businesses;
--     drop table if exists public.business_members;
--     drop table if exists public.businesses;
--   end $$;
--
--   ⚠️ THE `drop policy` LINE IS LOAD-BEARING AND THE FIRST DRAFT OF THIS HEADER
--   OMITTED IT — caught by running the rollback rather than trusting it. The
--   `members read their business` policy on `businesses` READS `business_members`,
--   so Postgres refuses to drop the membership table while that policy stands:
--   "cannot drop table business_members because other objects depend on it". A
--   rollback that fails is worse than none, because it is only ever reached when
--   something has already gone wrong.
--
--   NOTE also that `drop table businesses cascade` alone is NOT a rollback:
--   cascade drops the ten foreign KEY CONSTRAINTS and leaves ten orphan columns.
--
-- REHEARSED: staging (pboidoxjghntalovzrke), 13 Aug 2026, on 04-seed-scale.
--   Verified AS THE CLIENT over PostgREST with the staging publishable key:
--   row counts unchanged, an anon insert returned a row with business_id set,
--   and `restore_backup` was called with the real 412-product format-3 export
--   with ZERO rows landing on a null business_id — the claim the trigger exists
--   to make true.
-- APPLIED TO PRODUCTION: 13 Aug 2026, by Claude (batch 181), to
--   izrnptxhdylllodvglla. Verified as the client the same way; ten tables
--   report zero null business_id rows and the two schemas match on all seven
--   fingerprint values.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. THE TENANT TABLES
-- ---------------------------------------------------------------------------

create table if not exists public.businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- The single business. Its id is the literal every business_id DEFAULT below
-- names, so this row must exist before any of them is added.
insert into public.businesses (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Scoopy''s Family Cafe')
on conflict (id) do nothing;

-- Maps a signed-in user to a business. PART 1 MUST NOT REQUIRE AN ACCOUNT TO
-- EXIST — this table is legitimately empty until Max signs in, and nothing
-- here or in the client depends on it having rows.
-- No `role` column: queue item "Roles — owner vs staff" owns that, and this
-- item's scope says roles are out. Adding it later is additive.
create table if not exists public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (business_id, user_id)
);

create index if not exists business_members_user_id_idx
  on public.business_members (user_id);

alter table public.businesses      enable row level security;
alter table public.business_members enable row level security;

-- `authenticated` only. anon gets no policy at all, so PostgREST returns an
-- empty array for it — which is what we want from tables the app cannot yet
-- read. No INSERT/UPDATE/DELETE policy exists on either: membership is granted
-- in the dashboard until Part 2 and the roles item say otherwise.
drop policy if exists "members read their own membership" on public.business_members;
create policy "members read their own membership"
  on public.business_members for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "members read their business" on public.businesses;
create policy "members read their business"
  on public.businesses for select to authenticated
  using (exists (select 1 from public.business_members m
                  where m.business_id = businesses.id
                    and m.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. THE DEFAULT-FILLING TRIGGER
--
-- Fires only when business_id arrives NULL, so it costs nothing on the client
-- path (where the column is never sent and the DEFAULT applies) and catches
-- the restore path (where an explicit NULL overrides the DEFAULT).
-- ---------------------------------------------------------------------------

-- `set search_path = ''` because Supabase's security linter flags a mutable
-- search_path on any function, and it was flagged on this one the first time it
-- was applied. The body references no schema-qualified object — only `new` and a
-- uuid literal, whose cast resolves out of pg_catalog, which is always implicitly
-- present — so an empty path costs nothing and removes the warning honestly
-- rather than by suppression.
create or replace function public.set_default_business_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.business_id is null then
    new.business_id := '00000000-0000-0000-0000-000000000001'::uuid;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. THE COLUMN, THE BACKFILL, THE INDEX AND THE TRIGGER — ten tables
--
-- `add column ... default <const>` is metadata-only in PG 11+ and existing
-- rows read as the default immediately, so the backfill below is expected to
-- report zero rows. It is written anyway rather than reasoned away: it is the
-- item's stated requirement, it is free, and section 4 asserts the result
-- instead of trusting either mechanism.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  tables text[] := array[
    'app_settings','ing_price_history','ingredients','menu_change_log',
    'menu_items','menu_price_history','menus','plates','price_history',
    'supplier_phrases'
  ];
begin
  foreach t in array tables loop
    execute format(
      'alter table public.%I add column if not exists business_id uuid '
      || 'default ''00000000-0000-0000-0000-000000000001''::uuid '
      || 'references public.businesses(id)', t);

    execute format(
      'update public.%I set business_id = ''00000000-0000-0000-0000-000000000001''::uuid '
      || 'where business_id is null', t);

    execute format(
      'create index if not exists %I on public.%I (business_id)',
      t || '_business_id_idx', t);

    execute format('drop trigger if exists set_business_id on public.%I', t);
    execute format(
      'create trigger set_business_id before insert on public.%I '
      || 'for each row execute function public.set_default_business_id()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. ASSERT THE RESULT — the migration fails rather than reporting success on
--    a table it silently missed.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  n bigint;
  missing int;
  tables text[] := array[
    'app_settings','ing_price_history','ingredients','menu_change_log',
    'menu_items','menu_price_history','menus','plates','price_history',
    'supplier_phrases'
  ];
begin
  foreach t in array tables loop
    execute format('select count(*) from public.%I where business_id is null', t) into n;
    if n > 0 then
      raise exception 'business_id is null on % rows of %', n, t;
    end if;

    select count(*) into missing from pg_trigger
     where tgname = 'set_business_id'
       and tgrelid = format('public.%I', t)::regclass
       and not tgisinternal;
    if missing <> 1 then
      raise exception 'set_business_id trigger missing on %', t;
    end if;
  end loop;
end $$;
