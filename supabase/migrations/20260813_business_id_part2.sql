-- ============================================================================
-- EzPlate — `business_id` on every table, PART 2: THE POLICY SWAP
-- Batch 182.  Queue item "`business_id` — PART 2, the policy swap".
--
-- WHAT THIS DOES
--   Replaces all thirteen `using (true)` policies on the ten data tables with
--   policies scoped to `public.current_business_id()`, and repoints BOTH of the
--   things that decide what a new row's tenant is — Part 1's trigger and the
--   column DEFAULT — at that same function. Three mechanisms, one definition.
--   There is no second answer to "which tenant am I" anywhere in this database,
--   and the reason that matters is section 3: for one afternoon there were two,
--   and the second one silently rejected a tenant's own writes.
--
-- ⚠️ THE FACT THE QUEUE ITEM DID NOT HAVE, and it changes the design
--   Production has ZERO rows in `auth.users` and ZERO in `business_members`.
--   Measured 13 Aug 2026, not assumed. The app is used entirely as `anon`:
--   sign-in shipped in batch 174 and gates nothing, and no account has ever
--   been created.
--
--   So the obvious policy — `business_id = (my membership's business)` —
--   resolves to NULL for every request this app actually makes, and RLS with
--   nothing matching returns 200 AND AN EMPTY ARRAY rather than an error. The
--   first thing Max would have seen after this migration is an app with no
--   products, no plates and no menus, and no error anywhere to explain it.
--   That is the precise failure the item's own warning names, reached by a path
--   the item did not consider.
--
-- THE RESOLUTION: `anon` IS THE LEGACY TENANT
--   `current_business_id()` answers three cases, and the first is the only one
--   that exists in production today:
--
--     auth.uid() is null            -> the seeded Scoopy's business
--     a member of a business        -> that business
--     signed in, member of nothing  -> NULL
--
--   What each buys:
--   * The anon fallback is TODAY'S BEHAVIOUR, unchanged. The anon key ships in
--     index.html, so anyone who reads the page can already read Scoopy's data;
--     this migration does not widen that by one row, and it does not narrow it
--     either. Closing it is the auth item's job — see THE ONE THING LEFT below.
--   * The membership case is REAL isolation, and it is what every future tenant
--     gets from the day their row exists: a second café's data is invisible to
--     the public anon key, because that key resolves to the legacy business and
--     never to theirs. Proved on staging with two real accounts — see REHEARSED.
--     ⚠️ READ THAT AS ISOLATION, NOT AS "MULTI-TENANCY WORKS". Reads are scoped
--     on all ten tables and cross-tenant writes are refused, both measured. But
--     a second tenant cannot save a SETTING at all — see the last REHEARSED
--     bullet — so this database can keep two cafés apart before it can carry
--     two cafés. The gap is one queue item and it is named there.
--   * The third case is a designed empty state, not a bug: an account with no
--     membership row sees NOTHING and can write nothing. Supabase sign-ups are
--     open at the API level by default, so a stranger who signs up with the
--     published anon key now gets an app with no data. Today they would see the
--     whole café, so this is a tightening.
--
--   ⚠️ THE COROLLARY, AND IT IS THE ONE WAY THIS BATCH CAN HURT MAX. If an
--   account is created in the Supabase dashboard and signed in on his phone
--   WITHOUT a matching `business_members` row, EzPlate shows an empty app with
--   no error. The fix is one insert:
--       insert into public.business_members (business_id, user_id)
--       values ('00000000-0000-0000-0000-000000000001', '<the new auth.users id>');
--   Written here because this file is where someone debugging an empty app will
--   look, and written into the queue's auth item as a requirement of that item,
--   because the client has no way to say this yet.
--
-- THE ONE THING LEFT, so nobody reads this as finished
--   The anon fallback is the last permissive thing in this database. Removing
--   it — `auth.uid() is null` -> NULL instead of the legacy business — makes
--   sign-in mandatory, which is a product change and needs the client to say so
--   rather than rendering an empty app. That belongs to the auth item, and it is
--   then a change to THIS FUNCTION'S BODY and nothing else. Thirteen policies,
--   ten triggers and ten column defaults never have to be touched again, which
--   is the whole reason they are all written against one function.
--
-- WHY THE POLICIES ARE RENAMED, AND WHY THAT IS THE SAFE ORDER
--   A new name lets the scoped policy be CREATED BEFORE the permissive one is
--   DROPPED. Multiple permissive policies are OR'd, so during the overlap access
--   is exactly what it is today, and a failure at any statement leaves a working
--   app. Reusing the old names would force drop-then-create, and the moment
--   between them is a table with RLS on and no policy — an empty app.
--   Same rule as 20260808_menus_rls.sql (inert policy first, RLS second), and
--   the rename is worth having anyway because the old names stop being true:
--   "open access (single-tenant, pre-login)" would be describing the opposite of
--   what its own body now says.
--
-- WHY security definer ON current_business_id()
--   It reads `business_members`, which has RLS of its own. As INVOKER the lookup
--   would depend on that table keeping a `select` policy for `authenticated`
--   forever — and if one were ever dropped, every member would silently resolve
--   to NULL and every café's app would empty with no error. DEFINER makes the
--   answer depend on the data instead of on a second policy.
--   It leaks nothing: the body filters on `auth.uid()` and returns one uuid, so
--   a caller can only ever learn their own tenant, and the legacy uuid is
--   already a column DEFAULT in this schema.
--   `set search_path = ''` for the same reason Part 1's function has it — a
--   mutable search_path on a SECURITY DEFINER function is a real escalation
--   path, not just a linter warning — so every object below is schema-qualified.
--
-- WHY (select public.current_business_id()) AND NOT THE BARE CALL
--   Wrapped in a sub-select, Postgres evaluates it once per statement as an
--   InitPlan instead of once per row. On `ingredients` that is one call instead
--   of 520 for every boot of the app. The function is STABLE, which is what
--   makes that legal.
--
-- WHAT THIS MIGRATION DOES NOT CHANGE
--   No client file. The client never sends `business_id` (pinned by
--   tests/business-id.test.js), and it does not need to start: the DEFAULT and
--   the trigger both fill the column BEFORE the row is checked, so an insert
--   that names no tenant lands in the caller's tenant and passes `with check`.
--   The queue item said "make the client send business_id on insert"; that was
--   written before Part 1 chose a trigger, and doing it now would move the one
--   decision that must stay on the server into the one place that cannot be
--   trusted with it.
--
-- ROLLBACK, one statement — RUN AND VERIFIED ON STAGING before production, not
-- merely written down. It restores the thirteen permissive policies, Part 1's
-- trigger body and literal defaults, and drops everything this file added.
--   do $$ declare t text; tables text[] := array['app_settings','ing_price_history',
--     'ingredients','menu_change_log','menu_items','menu_price_history','menus',
--     'plates','price_history','supplier_phrases']; begin
--     create or replace function public.set_default_business_id()
--     returns trigger language plpgsql set search_path = '' as $fn$
--     begin
--       if new.business_id is null then
--         new.business_id := '00000000-0000-0000-0000-000000000001'::uuid;
--       end if;
--       return new;
--     end; $fn$;
--     foreach t in array tables loop
--       execute format('alter table public.%I alter column business_id set default ''00000000-0000-0000-0000-000000000001''::uuid', t);
--     end loop;
--     foreach t in array array['app_settings','ingredients','menu_items','menus','plates'] loop
--       execute format('create policy %I on public.%I for all to public using (true) with check (true)', 'staff full access', t);
--       execute format('drop policy if exists %I on public.%I', t||' tenant access', t);
--     end loop;
--     create policy "price_history all" on public.price_history for all to public using (true) with check (true);
--     drop policy if exists "price_history tenant access" on public.price_history;
--     create policy "open access (single-tenant, pre-login)" on public.supplier_phrases for all to public using (true) with check (true);
--     drop policy if exists "supplier_phrases tenant access" on public.supplier_phrases;
--     foreach t in array array['ing_price_history','menu_change_log','menu_price_history'] loop
--       execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t||' anon select', t);
--       execute format('create policy %I on public.%I for insert to anon, authenticated with check (true)', t||' anon insert', t);
--       execute format('drop policy if exists %I on public.%I', t||' tenant select', t);
--       execute format('drop policy if exists %I on public.%I', t||' tenant insert', t);
--     end loop;
--     drop function if exists public.current_business_id();
--   end $$;
--
--   ⚠️ THE ORDER INSIDE THE ROLLBACK IS THE SAME RULE AS THE MIGRATION'S: the
--   permissive policy goes back BEFORE the scoped one is removed, so a rollback
--   that fails half way leaves an app that works. The trigger body and the
--   defaults are restored FIRST, because dropping `current_business_id()` while
--   anything still references it would leave every insert raising 42883.
--   ⚠️ It is NOT re-runnable, and unlike Part 1's that cannot be fixed: there is
--   no `create policy if not exists`, so a second run raises 42710 on the first
--   policy that is already back. Run it once. Part 1's rollback is re-runnable
--   because every statement in it is a `drop`; this one has to create things.
--
-- REHEARSED: staging (pboidoxjghntalovzrke), 13 Aug 2026, on 04-seed-scale.
--   Verified AS THE CLIENT over PostgREST, not through the MCP:
--   * anon read all ten tables at unchanged counts (520 products, 180 plates,
--     429 dishes, 2862 price points), and an anon insert/update/delete round
--     trip on `ingredients` returned a row at every step, with the append-only
--     tables still refusing an update;
--   * ⚠️ AND THE THING docs/STAGING.md SAID COULD NOT BE REHEARSED: three real
--     accounts were created and signed in through the auth API — one a member of
--     the seeded business, one of a second business, one a member of nothing.
--     Each saw ONLY its own rows on all ten tables; the second café's insert was
--     invisible to the first café AND to anon; an attempt by the second café to
--     UPDATE and to DELETE one of café one's products returned an empty array
--     and changed nothing; and the member of nothing saw zero rows everywhere
--     and was refused on write. That is the first multi-tenant exclusion proof
--     this project has ever had, and STAGING.md's "anything auth" bullet has
--     been corrected rather than left standing.
--   * `restore_backup` is SECURITY INVOKER, so these policies scope it for free
--     and that was MEASURED rather than reasoned: called as the second café it
--     restored into that café and left café one's 520 products, 12 menus, 180
--     plates and 429 dishes untouched. Its five `delete ... where true`
--     statements now delete only the caller's tenant. A backup file carrying
--     ANOTHER tenant's business_id would be REJECTED by `with check` rather than
--     silently restored into the wrong café, because the trigger fills only
--     nulls and never overwrites.
--   * ⚠️ KNOWN, DELIBERATELY NOT FIXED HERE, AND WIDER THAN THE RESTORE — this
--     bullet said "a second tenant cannot restore a file containing
--     `app_settings`" until the pre-push review measured what it actually
--     costs, which is the whole of settings and not one import path.
--     `app_settings.key` is the primary key and is GLOBAL, and `dbSetSetting`
--     (`js/app.js`) is the ONE writer for every setting, upserting with no
--     `onConflict` so it resolves against that key. Once any tenant holds a key,
--     a second tenant's identical upsert becomes an ON CONFLICT DO UPDATE
--     against a row it cannot see, and RLS refuses it on the USING expression.
--     The key names are literals in the client, so this is not a rare
--     collision: **a second café's FIRST attempt to save a food cost target, a
--     GST default or its kitchen ingredients fails, permanently, with no
--     workaround.** Reproduced on staging as tenant two, 42501, in a rolled-back
--     transaction.
--     It fails LOUDLY and `pushWrite` toasts the real error, so it is not silent
--     loss — but READ isolation holding must not be read as writes working.
--     That is the queue's "Unique ID generation — the SEMANTIC KEYS half",
--     which this migration unblocks and which now carries the measurement. The
--     fix is a composite `(business_id, key)` primary key, and it is that item's.
-- APPLIED TO PRODUCTION: 13 Aug 2026, by Claude (batch 182), to
--   izrnptxhdylllodvglla. Verified as the anon client the same way — every table
--   read at its pre-migration count, then a full insert/update/delete round trip
--   on `ingredients` — and all seven schema fingerprints match staging.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. THE ONE ANSWER TO "WHICH TENANT AM I"
--
-- Created BEFORE anything references it, so a failure here leaves a database
-- with today's permissive policies and Part 1's trigger, both untouched.
-- ---------------------------------------------------------------------------

create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case
    -- No JWT: the anon key, which is every request this app makes today. The
    -- legacy tenant. Removing this branch is what makes sign-in mandatory.
    when auth.uid() is null
      then '00000000-0000-0000-0000-000000000001'::uuid
    -- Signed in: their business, or NULL if they are a member of nothing. NULL
    -- never equals a business_id, so `= (select current_business_id())` is
    -- false for every row and they see an empty app rather than someone else's.
    --
    -- ⚠️ THE `order by` IS NOT DECORATION AND IT IS NOT AN ANSWER EITHER.
    -- `business_members`' primary key is (business_id, user_id), so one user
    -- MAY belong to two businesses; nothing forbids it and the roles item will
    -- want it. With a bare `limit 1` the row that wins is whatever the planner
    -- returns first, so the same person could resolve to a different café on
    -- two consecutive requests and see two different sets of data with no error
    -- anywhere. Ordering makes that stable and reproducible.
    -- It does NOT decide which café they SHOULD see. That is a product question
    -- — a person working two cafés needs to choose, and the choice has to live
    -- somewhere the client can set. Until then the oldest membership wins,
    -- which is at least explicable. Flagged in the queue's roles item.
    -- (Pre-push review, 13 Aug 2026.)
    else (select m.business_id
            from public.business_members m
           where m.user_id = auth.uid()
           order by m.created_at, m.business_id
           limit 1)
  end;
$$;

comment on function public.current_business_id() is
  'The tenant of the calling request: the seeded business for anon (legacy, pre-login), '
  'the caller''s business for a member, NULL for a signed-in non-member. Every RLS policy '
  'on the ten data tables, the set_business_id trigger and every business_id column DEFAULT '
  'read it, so there is one definition and not twenty-three. Batch 182.';

-- ---------------------------------------------------------------------------
-- 2. PART 1'S TRIGGER FUNCTION, REPOINTED
--
-- Part 1's header said Part 2 replaces this BODY rather than deleting the ten
-- triggers, and this is that. Unchanged: it acts only when the incoming value
-- is NULL, so a row can still be MOVED between tenants deliberately and cannot
-- be blanked accidentally. That "only when NULL" is also what makes a backup
-- file from another tenant fail loudly instead of being adopted.
-- ---------------------------------------------------------------------------

create or replace function public.set_default_business_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.business_id is null then
    new.business_id := public.current_business_id();
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. THE COLUMN DEFAULTS, REPOINTED — AND THIS IS THE FINDING OF THE BATCH
--
-- ⚠️ FOUND BY REHEARSING AS THE CLIENT, AND IT WOULD NEVER HAVE BEEN FOUND ANY
-- OTHER WAY. With sections 1 and 2 applied and the defaults left as Part 1
-- wrote them, the second café's own insert was REJECTED — 42501, "new row
-- violates row-level security policy". Its reads were already correct, so
-- nothing before this point in the rehearsal had shown a problem.
--
-- The mechanism: Part 1 gave every one of these columns
--     default '00000000-0000-0000-0000-000000000001'::uuid
-- and a DEFAULT is applied when the column is ABSENT from the INSERT — which is
-- exactly what the client does, on every write it makes. So by the time the
-- BEFORE trigger runs, `new.business_id` is already NON-NULL and holds the
-- LEGACY café's id; the trigger fills only nulls, so it correctly leaves it
-- alone; and then `with check` compares the legacy id against the caller's own
-- tenant and refuses. Every tenant except the seeded one could read its rows
-- and not write any.
--
-- Part 1 was right to add a DEFAULT and right to make it a fixed literal — its
-- header explains that a generated id would make the staging/production
-- fingerprint permanently red. What it could not know is that the literal stops
-- being the right answer the moment a SECOND tenant exists, which is this
-- migration. So the DEFAULT is not dropped, it is repointed: the column, the
-- trigger and the policy now all read one function, and the failure mode of one
-- disagreeing with another is gone rather than fixed.
--
-- `alter column ... set default` NEVER rewrites the table, so this is metadata
-- only on all ten and costs nothing on production's 520 products.
--
-- Why keep a DEFAULT at all when the trigger would do it? Because they cover
-- different holes and both are cheap: the DEFAULT covers a path with triggers
-- disabled, and the trigger covers the explicit-NULL path that a DEFAULT cannot
-- (CLAUDE.md, "A column DEFAULT does not survive the restore"). Neither is
-- redundant, and now they can no longer contradict each other.
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
      'alter table public.%I alter column business_id set default public.current_business_id()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. THE SWAP — new policy first, old policy second
--
-- The two shapes are production's, not a tidy-up: seven tables carry a single
-- `for all` policy, and the three history tables carry a `select` and an
-- `insert` and deliberately NO update or delete. That absence is a real
-- constraint — an append-only log — and is preserved exactly.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  -- The seven `for all` tables. price_history and supplier_phrases are in here
  -- despite their odd old policy names, because the SHAPE is the same; only the
  -- name they are dropped by differs, which is handled below.
  full_tables text[] := array[
    'app_settings','ingredients','menu_items','menus','plates',
    'price_history','supplier_phrases'
  ];
  -- The three append-only history tables.
  log_tables text[] := array[
    'ing_price_history','menu_change_log','menu_price_history'
  ];
begin
  foreach t in array full_tables loop
    execute format(
      'create policy %I on public.%I for all to public '
      || 'using (business_id = (select public.current_business_id())) '
      || 'with check (business_id = (select public.current_business_id()))',
      t || ' tenant access', t);
  end loop;

  foreach t in array log_tables loop
    execute format(
      'create policy %I on public.%I for select to anon, authenticated '
      || 'using (business_id = (select public.current_business_id()))',
      t || ' tenant select', t);
    execute format(
      'create policy %I on public.%I for insert to anon, authenticated '
      || 'with check (business_id = (select public.current_business_id()))',
      t || ' tenant insert', t);
  end loop;

  -- Only now that every table has a scoped policy alongside its permissive one
  -- do the permissive ones go. Nothing above this line can leave a table
  -- unreadable, and nothing below it can either.
  foreach t in array array['app_settings','ingredients','menu_items','menus','plates'] loop
    execute format('drop policy if exists %I on public.%I', 'staff full access', t);
  end loop;
  drop policy if exists "price_history all" on public.price_history;
  drop policy if exists "open access (single-tenant, pre-login)" on public.supplier_phrases;

  foreach t in array log_tables loop
    execute format('drop policy if exists %I on public.%I', t || ' anon select', t);
    execute format('drop policy if exists %I on public.%I', t || ' anon insert', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. ASSERT THE RESULT
--
-- The failure this whole item is afraid of is silent, so the migration refuses
-- to report success on a table it missed. Everything here is checkable as
-- `postgres`; what is NOT checkable here — whether the CLIENT can still read
-- its rows — is why step 5 of docs/STAGING.md's procedure exists and is not
-- optional. Section 3 is the standing proof of that: every assertion below
-- passed while the second café could not write a row.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  n bigint;
  tables text[] := array[
    'app_settings','ing_price_history','ingredients','menu_change_log',
    'menu_items','menu_price_history','menus','plates','price_history',
    'supplier_phrases'
  ];
begin
  -- (a) Nothing permissive survives on the ten data tables. A leftover
  --     `using (true)` would make the swap a no-op that looks like a success.
  select count(*) into n
    from pg_policies
   where schemaname = 'public'
     and tablename = any(tables)
     and (coalesce(qual,'') = 'true' or coalesce(with_check,'') = 'true');
  if n > 0 then
    raise exception '% permissive policy expressions still stand on the data tables', n;
  end if;

  -- (b) Every one of the thirteen is scoped to the function. Counted by BODY
  --     rather than by name, so a policy created with the right name and the
  --     wrong expression cannot pass.
  select count(*) into n
    from pg_policies
   where schemaname = 'public'
     and tablename = any(tables)
     and coalesce(qual,'') || coalesce(with_check,'') like '%current_business_id%';
  if n <> 13 then
    raise exception 'expected 13 tenant-scoped policies on the data tables, found %', n;
  end if;

  -- (c) No table lost its cover. A table with RLS on and no policy is the empty
  --     app this migration exists to avoid, and it is invisible from SQL run as
  --     postgres — RLS does not apply to the owner — so it must be asserted.
  foreach t in array tables loop
    select count(*) into n from pg_policies
     where schemaname = 'public' and tablename = t;
    if n = 0 then
      raise exception 'table % has RLS on and no policy at all — the client sees nothing', t;
    end if;
  end loop;

  -- (d) The three history tables keep their append-only shape: select and
  --     insert, and deliberately no update or delete.
  foreach t in array array['ing_price_history','menu_change_log','menu_price_history'] loop
    select count(*) into n from pg_policies
     where schemaname = 'public' and tablename = t and cmd in ('UPDATE','DELETE','ALL');
    if n > 0 then
      raise exception '% gained an update/delete policy — it is append-only', t;
    end if;
  end loop;

  -- (e) No column DEFAULT still names a tenant literally. This is section 3's
  --     finding turned into a check: a literal default and a scoped policy
  --     disagree for every tenant but the seeded one, and the symptom is that
  --     reads work and writes are refused.
  select count(*) into n
    from information_schema.columns
   where table_schema = 'public'
     and column_name = 'business_id'
     and table_name = any(tables)
     and coalesce(column_default,'') not like '%current_business_id%';
  if n > 0 then
    raise exception '% of the ten business_id defaults are not current_business_id() — a second tenant cannot write', n;
  end if;

  -- (f) Every existing row is in the legacy tenant, which is what makes the
  --     anon fallback equivalent to today's behaviour rather than merely
  --     similar to it. Part 1 asserted no NULLs; this asserts no STRANGERS.
  --     ⚠️ Staging legitimately fails this once a second café exists there —
  --     that is the assertion doing its job, not a fault, and it is why the
  --     rehearsal order is: apply to a mirror that still has one tenant, then
  --     create the second tenant to test with.
  foreach t in array tables loop
    execute format(
      'select count(*) from public.%I where business_id <> ''00000000-0000-0000-0000-000000000001''::uuid', t)
      into n;
    if n > 0 then
      raise exception '% rows of % belong to another business — anon would stop seeing them', n, t;
    end if;
  end loop;

  -- (g) The function answers the legacy tenant when there is no JWT. Run as
  --     postgres, auth.uid() is null, which is exactly the anon case.
  if public.current_business_id() <> '00000000-0000-0000-0000-000000000001'::uuid then
    raise exception 'current_business_id() does not answer the legacy business for an anonymous caller';
  end if;
end $$;
