-- 20260814_roles_part1.sql — batch 187
--
-- WHAT THIS DOES
--   Teaches the database the two roles Max decided on 9 Aug 2026 — an owner and
--   working staff — and ENFORCES the four things staff may not do. It changes no
--   client file: `js/app.js` never sends a role and does not need to, exactly as
--   it never sends `business_id`. The decisions that matter belong on the server.
--
--   Nothing here is reachable today. Production has ONE account, it is the owner
--   of the only business, and every check below passes for an owner. That is the
--   same order batch 182 used for the tenant policies and 174 for sign-in: the
--   rule exists before anything can exercise it, so the batch that builds the
--   client (part 2) is adding affordances rather than inventing enforcement.
--
-- WHAT STAFF MAY NOT DO, and where each one is enforced
--   * delete a plate ................. restrictive policy on `plates`
--   * delete a menu .................. restrictive policy on `menus`
--   * change the food cost target .... restrictive policies on `app_settings`,
--     one for EACH of insert, update AND delete — see the note at that section:
--     covering the upsert's two halves and stopping was this batch's real defect.
--   * restore a backup ............... a guard inside `restore_backup` itself
--   Staff KEEP everything else, including deleting a `menu_items` row. That is
--   unpublishing a dish from a menu, which is everyday editing; the decision's
--   words are "cannot delete plates or menus", and `dbDeleteMenu` in js/app.js
--   deletes dishes rather than menus despite its name (CLAUDE.md warns that the
--   name lies).
--
-- WHY RESTRICTIVE POLICIES, AND WHY NOTHING EXISTING IS REWRITTEN
--   Each of the ten tables carries ONE permissive `for all` tenant policy from
--   182. `for all` includes DELETE, so the obvious way to restrict deletion is to
--   split that policy into four command-specific ones — which would rewrite the
--   policy every table depends on, on the strength of a change that concerns one
--   command. A RESTRICTIVE policy is ANDed with the permissive ones instead, so
--   the tenant rule keeps working untouched and the extra condition applies to
--   the named command only. Smaller diff, and the tenant isolation proved on
--   staging in 182 is not re-litigated by this batch.
--
--   ⚠️ A restrictive policy needs a permissive one to permit anything at all; it
--   can only ever subtract. That is why these are additive and why dropping them
--   is a complete rollback.
--
-- WHY THE ROLE COLUMN HAS NO DEFAULT
--   CLAUDE.md's law: a column DEFAULT and a BEFORE INSERT trigger on the same
--   column are ONE mechanism with two entry points, and they must compute the
--   same value — a DEFAULT fires when the column is ABSENT, so by the time the
--   trigger runs the value is already non-null and a "fill it if null" trigger
--   correctly does nothing. Here the value depends on the ROW BEING INSERTED
--   ("is this business's first member?"), which a DEFAULT cannot see. So there is
--   deliberately no DEFAULT and exactly one entry point: `set_member_role()`.
--   The first member of a business is its OWNER by construction, which is the
--   only answer that cannot lock a new café out of its own settings.
--
--   `security definer` on that trigger for the same reason `current_business_id()`
--   has it: the "does this business have members yet" check reads a table with
--   RLS, and as INVOKER a caller who cannot SEE the other members would find none
--   and be made an owner. Nothing can reach that path today — `business_members`
--   has no INSERT policy at all, so only `postgres` can add a member — but a
--   function that is correct only because its callers are limited is a trap with
--   a date on it.
--
-- ONE CAFÉ PER PERSON, and this is the queue item's delegated decision, ANSWERED
--   `business_members`' primary key is `(business_id, user_id)`, so nothing
--   forbade one person holding two memberships, and `current_business_id()`
--   resolved such a person to their OLDEST — which 182's pre-push review made
--   STABLE rather than correct, and said so.
--   A unique constraint on `user_id` closes it. Measured first: zero people hold
--   two memberships in either project, so the constraint costs nothing today, and
--   what it buys is that the failure moves to the moment someone is ADDED, as a
--   refusal an owner can read, instead of a silent arbitrary pick at every boot.
--   The alternative is not "allow two" — it is "allow two, store which one is
--   active, and build a switcher", because a stored choice with no control to set
--   it is a dead control. That is a feature, and nobody has asked for it.
--   ⚠️ THE REVERSAL IS ONE STATEMENT — `alter table public.business_members drop
--   constraint business_members_one_business_per_user;` — the day a real person
--   genuinely has two cafés. Same shape as Max's own "no manager role unless a
--   real person at a real café needs one later".
--
-- ORDERING, so the dangerous intermediate state cannot exist
--   The column and its backfill and both functions come FIRST, and the policies
--   LAST. Reversed, there would be an instant where `current_business_role()`
--   answers NULL for everybody while a restrictive policy is already consulting
--   it — which is Max refused permission to delete his own plates. The
--   transaction is kept as well; the ordering is not a substitute for it.
--
-- ROLLBACK, and it is TWO STEPS IN THIS ORDER, not one.
-- ⚠️ This header said "one statement" until the pre-push review read it against
-- what it actually does. The `do` block below drops `current_business_role()`,
-- and `restore_backup` CALLS that function — so running the block on its own
-- leaves every restore raising 42883 for everybody, owner included. Restore was
-- working before this migration; a rollback performed as the headline described
-- would have left production worse off than not rolling back at all. The body of
-- the note did say to do both, which is exactly the shape that gets skimmed.
--
--   STEP 1, FIRST: re-run the whole `create or replace function
--   public.restore_backup` block from `supabase/migrations/20260813_semantic_keys.sql`.
--   That is the previous definition, guard-free. It is not copied here on
--   purpose: 170 lines in a comment is a second copy to keep in step, which is
--   the defect this repo names rather than a safeguard.
--
--   STEP 2, AFTER IT: everything else, policies first so nothing consults a
--   function that is about to go:
--   do $$ begin
--     drop policy if exists "plates owner-only delete" on public.plates;
--     drop policy if exists "menus owner-only delete" on public.menus;
--     drop policy if exists "app_settings owner-only target insert" on public.app_settings;
--     drop policy if exists "app_settings owner-only target update" on public.app_settings;
--     drop policy if exists "app_settings owner-only target delete" on public.app_settings;
--     alter table public.business_members drop constraint if exists business_members_one_business_per_user;
--     drop trigger if exists set_member_role on public.business_members;
--     drop function if exists public.set_member_role();
--     drop function if exists public.current_business_role();
--     alter table public.business_members drop column if exists role;
--   end $$;
--   Step 2 is re-runnable — every statement in it is a drop. Step 1 is a
--   `create or replace`, so it is too. Doing them in the other order is what
--   breaks the restore, which is why the order is in the heading and not only
--   in the prose.
--
-- ⚠️ THE `restore_backup` BLOCK BELOW IS 183's, COPIED MECHANICALLY, WITH ONE
--   INSERTION. It was extracted from `20260813_semantic_keys.sql` by script and
--   the guard spliced in immediately after `begin`, rather than retyped — because
--   `pg_get_functiondef` returns the body's COMMENTS, docs/STAGING.md's
--   fingerprint hashes it, and `supabase/staging/01-schema.sql` must carry the
--   same block byte-identically. `tests/semantic-keys.test.js` pins those two
--   equal, so the copy is machine-checked rather than eyeballed. **The only
--   hand-written lines in it are the eleven at the top of the body.**
--
-- REHEARSED: staging (pboidoxjghntalovzrke), 14 Aug 2026, with a REAL STAFF
--   ACCOUNT signed in over PostgREST — not through the MCP, which runs as
--   `postgres` and bypasses RLS entirely.
--   The account is new: `d@example.com`, added to the seeded café by inserting a
--   `business_members` row WITH NO ROLE — so the trigger's answer is the one
--   being tested, and it returned `staff` because that business already had a
--   member. `a@example.com` and `b@example.com` backfilled to `owner`.
--
--   As STAFF, all four refused:
--   * delete a plate ... HTTP 204 and the count UNCHANGED at 181. ⚠️ That is the
--     silent shape docs/STAGING.md warns about — no error, nothing deleted — and
--     it is why this was measured by counting rows rather than by reading a
--     status code.
--   * delete a menu .... HTTP 204, count unchanged.
--   * set the target ... `42501 new row violates row-level security policy
--     "app_settings owner-only target insert"`, HTTP 403. Named, so a future
--     reader of a support log can find this file.
--   * restore .......... `P0001 restore_backup: only an owner may restore a
--     backup`, HTTP 400, raised before anything was deleted.
--
--   As STAFF, still allowed (the half that proves the restrictions are narrow):
--   edited a product, wrote `gst_default` — a DIFFERENT `app_settings` key —
--   and created and deleted a `menu_items` row, which is unpublishing a dish.
--
--   As OWNER, unaffected: deleted the probe plate and the probe menu, wrote
--   `food_cost_target`, and reached the restore's FORMAT check (`unsupported
--   payload format 9`) rather than the ownership one — which is how an owner
--   getting past the guard was proved without performing a restore.
--
--   ⚠️ The `restore_backup` body was spliced SERVER-SIDE from the deployed
--   `prosrc` rather than retyped, then the result was proved byte-identical to
--   this file: md5 `6afc0c4f42ac2da6726577dfbe3babfd`, 11337 bytes, on both. A
--   hand-copied 170-line body is exactly the drift docs/STAGING.md's fingerprint
--   exists to catch, and catching it afterwards is worse than not creating it.
--
--   MEASURED BEFORE THE UNIQUE CONSTRAINT WENT ON, in both projects: nobody
--   holds two memberships, so it locked nothing out that exists.
--
--   ⚠️ RE-REHEARSED AFTER THE PRE-PUSH REVIEW, because the first pass had a hole:
--   there was no restrictive DELETE on `app_settings`, so a staff account could
--   REMOVE the target rather than change it. Reproduced as `d@example.com` before
--   the fix — `DELETE /app_settings?key=eq.food_cost_target` returned HTTP 200
--   with the row, and the target was gone. After the fix, same request: `[]` and
--   the row survived; staff deleting a DIFFERENT key still works; the owner can
--   still delete the target. The deleted row was put back.
--
-- APPLIED TO PRODUCTION: 14 Aug 2026, by Claude, written here after it ran
--   (batch 186's rule: a pre-written record is the audit trail lying).
--   Unlike 186 this has NO client half, so there is no deploy-order hazard — the
--   shipped client sends no role, reads none, and Max is an owner, so nothing he
--   can do behaves differently today.
--   * `maxprescott02@gmail.com` backfilled to `owner`; he is the only account.
--   * the `restore_backup` body was spliced from production's own `prosrc` the
--     same way, and came out md5 `6afc0c4f42ac2da6726577dfbe3babfd`, 11337 bytes
--     — IDENTICAL to staging's and to this file's. Three copies, one hash.
--   * verified as HIM with RLS applied (`set local role authenticated` + his
--     `sub`; a plain MCP query would bypass RLS and prove nothing), inside a
--     transaction that was ROLLED BACK: `current_business_role()` -> `owner`,
--     the food-cost-target upsert succeeded, and a plate delete succeeded. After
--     the rollback: 79 plates still there and the target still 30, so the proof
--     cost nothing. ⚠️ Not a real sign-in over PostgREST — his password is his.
--     The staff half above IS a real sign-in, which is the half that needed one.
--   * the missing DELETE policy went on BOTH projects when the review found it,
--     and the fingerprints below were taken after that, so they cover it.
--   * fingerprints (docs/STAGING.md, plus `permissive` added to the policy line
--     for this batch — the column that distinguishes a restriction from a grant)
--     IDENTICAL to staging afterwards: policies 19, functions 5, constraints 31,
--     columns 90, and one non-internal trigger on `business_members`.

begin;

-- ---------------------------------------------------------------------------
-- 1. the column. Nullable first, backfilled, then constrained — so the NOT NULL
--    is never asserted against a row that has not been given a value yet.
--    Existing members are OWNERS: every membership that exists today was made by
--    hand in the dashboard by the person who owns the café.
-- ---------------------------------------------------------------------------
alter table public.business_members add column if not exists role text;
update public.business_members set role = 'owner' where role is null;
alter table public.business_members alter column role set not null;
alter table public.business_members drop constraint if exists business_members_role_check;
alter table public.business_members add constraint business_members_role_check
  check (role in ('owner','staff'));

-- ---------------------------------------------------------------------------
-- 2. ONE café per person. See the header for the decision and its reversal.
-- ---------------------------------------------------------------------------
alter table public.business_members drop constraint if exists business_members_one_business_per_user;
alter table public.business_members add constraint business_members_one_business_per_user
  unique (user_id);

-- ---------------------------------------------------------------------------
-- 3. the ONE entry point that decides a new member's role. See the header for
--    why there is no column DEFAULT and why this is SECURITY DEFINER.
-- ---------------------------------------------------------------------------
create or replace function public.set_member_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if new.role is null then
    if exists (select 1 from public.business_members m
                where m.business_id = new.business_id) then
      new.role := 'staff';
    else
      new.role := 'owner';
    end if;
  end if;
  return new;
end;
$fn$;

drop trigger if exists set_member_role on public.business_members;
create trigger set_member_role
  before insert on public.business_members
  for each row execute function public.set_member_role();

-- ---------------------------------------------------------------------------
-- 4. which role am I. It reads the role OF THE ROW `current_business_id()` has
--    already picked, rather than picking a row of its own — so there is one
--    definition of "which membership is yours" and these two can never disagree
--    about it, which is the failure 182 spent an afternoon on.
-- ---------------------------------------------------------------------------
create or replace function public.current_business_role()
returns text
language sql
stable
security definer
set search_path = ''
as $fn$
  select m.role
    from public.business_members m
   where m.user_id = auth.uid()
     and m.business_id = (select public.current_business_id());
$fn$;

revoke all on function public.current_business_role() from public;
grant execute on function public.current_business_role() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. the restrictions. RESTRICTIVE, so they AND with 182's tenant policy rather
--    than replacing it. `(select ...)` wraps the call for the same reason 182
--    wraps its own: Postgres evaluates it once per statement as an InitPlan
--    instead of once per row.
--    ⚠️ NULL IS NOT AN OWNER, and it must not be: a caller with no membership
--    answers NULL, `NULL = 'owner'` is NULL, and a policy that evaluates to NULL
--    REFUSES. That is the direction we want here — unlike the client, where "I
--    could not tell" must not lock anyone out, the server's job is to refuse when
--    it cannot establish permission.
-- ---------------------------------------------------------------------------
drop policy if exists "plates owner-only delete" on public.plates;
create policy "plates owner-only delete" on public.plates
  as restrictive for delete to public
  using ((select public.current_business_role()) = 'owner');

drop policy if exists "menus owner-only delete" on public.menus;
create policy "menus owner-only delete" on public.menus
  as restrictive for delete to public
  using ((select public.current_business_role()) = 'owner');

-- The target is one KEY in a shared table, so these name it. Everything else in
-- `app_settings` — the kitchen words, the AI toggles, the GST default — stays
-- writable by staff. `dbSetSetting` upserts, which is an INSERT that may become
-- an UPDATE, so BOTH commands need the condition or the restriction is
-- reachable through whichever half the row's existence selects.
drop policy if exists "app_settings owner-only target insert" on public.app_settings;
create policy "app_settings owner-only target insert" on public.app_settings
  as restrictive for insert to public
  with check (key <> 'food_cost_target' or (select public.current_business_role()) = 'owner');

drop policy if exists "app_settings owner-only target update" on public.app_settings;
create policy "app_settings owner-only target update" on public.app_settings
  as restrictive for update to public
  using (key <> 'food_cost_target' or (select public.current_business_role()) = 'owner')
  with check (key <> 'food_cost_target' or (select public.current_business_role()) = 'owner');

-- ⚠️ AND DELETE, WHICH THE PRE-PUSH REVIEW FOUND MISSING AND WHICH IS THE WHOLE
-- LESSON OF THIS SECTION. The first cut covered "the upsert's two halves" and
-- stopped, because an upsert HAS two halves — but the restriction is keyed to a
-- VALUE rather than to a command, and a value can also be REMOVED. Reproduced as
-- a real staff account on staging before it was fixed: `DELETE /app_settings
-- ?key=eq.food_cost_target` returned HTTP 200 with the row, and the target was
-- gone. The client then falls back to its hardcoded default on the next boot
-- (`cogsPct` is 40 until app_settings says otherwise) with nothing raised
-- anywhere, which moves every suggested price and every good/bad colour in the
-- app — the quiet-wrong-number failure this repo keeps finding.
drop policy if exists "app_settings owner-only target delete" on public.app_settings;
create policy "app_settings owner-only target delete" on public.app_settings
  as restrictive for delete to public
  using (key <> 'food_cost_target' or (select public.current_business_role()) = 'owner');

-- ---------------------------------------------------------------------------
-- 6. the restore. See the header: this block is 183's, copied by script, with
--    eleven hand-written lines at the top of the body and nothing else changed.
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
  -- 187 -- ONLY AN OWNER MAY RESTORE, AND THIS IS THE FIRST STATEMENT IN THE FUNCTION.
  -- Everything below deletes five tables before it inserts anything, so a check placed after any of
  -- it would be a check on a database that had already been emptied. RLS cannot express this one:
  -- the restore is SECURITY INVOKER, so its deletes already run as the caller, and staff legitimately
  -- delete ingredients and dishes in the ordinary course of work -- there is nothing in a row to tell
  -- the two apart. `is distinct from` rather than `<>` because a caller with no membership answers
  -- NULL, and NULL <> 'owner' is NULL, which would fall through the `if` and let them past.
  if (select public.current_business_role()) is distinct from 'owner' then
    raise exception 'restore_backup: only an owner may restore a backup';
  end if;

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

commit;
