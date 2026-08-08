-- ============================================================================
-- ✅ APPLIED to production 8 Aug 2026, by Claude, on Max's explicit instruction
--    ("run the migration for me... i dont want you to stop for me to hand run a query").
--    ⚠️ APPLIED STRAIGHT TO PRODUCTION WITH NO STAGING REHEARSAL. Max's instruction assumed it
--    could be rehearsed on the new staging project first; it could not. The Supabase MCP takes its
--    project_ref from the server URL in .mcp.json and execute_sql has no project argument, so the
--    running session could only ever reach production. Staging is now IN .mcp.json as a second
--    server and is reachable from the next session on - this was the last migration that could not
--    be rehearsed.
--
--    Verified after applying, in this order:
--      1. pg_class/pg_policies: menus relrowsecurity=true, 1 policy. All 11 public tables now RLS-on.
--      2. AS THE ANON CLIENT over PostgREST, which is the check that counts:
--         - SELECT returned both menus, matching the pre-migration baseline of 2.
--         - UPDATE with `Prefer: return=representation` RETURNED THE ROW, proving the write actually
--           landed. A blocked anon UPDATE returns success and touches nothing, so an empty response
--           here - not an error - would have been the failure signal.
--      3. https://scoopyscosting.vercel.app in a real browser: boot gate cleared, both menus listed,
--         zero console errors.
--
-- menus: enable row level security, with the same permissive policy its siblings carry.
--
-- WHY NOW. Max's call, 8 Aug 2026 (docs/decisions/2026-08-08.html): fix it now rather than at the
-- multi-tenant gate. `menus` was the ONE table of eleven with `relrowsecurity = false` and ZERO
-- policies. Harmless with a single café, and a real hole the moment there are two accounts.
-- Doing it now also means `menus` is no longer the one table that would need ENABLING as well as
-- POLICYING when business_id lands - which is exactly the asymmetry CLAUDE.md warns about.
--
-- WHAT IT CHANGES FOR THE APP TODAY: nothing. The policy is `for all to public using (true)`, which
-- is byte-for-byte the "staff full access" policy already on menu_items, plates, ingredients and
-- app_settings (verified against pg_policies, 8 Aug 2026). Every read and write that worked before
-- works after. This closes the hole in the SHAPE of the schema, not in today's behaviour.
--
-- ⚠️⚠️ THE TWO STATEMENTS ARE ONE TRANSACTION AND MUST STAY THAT WAY.
-- Between `enable row level security` and the `create policy`, the menus table is RLS-on with no
-- policy. For the anon client that is not an error - PostgREST returns 200 and an EMPTY ARRAY.
-- bootstrapSync reads that as `menusRead = true` (no error, an array), assigns `menusList = []`, and
-- correctly refuses to re-seed, because a successful empty read is "the user deleted everything".
-- So a half-applied migration does not throw: it shows Max an app with ZERO MENUS and every dish
-- unlinked, which is indistinguishable from having lost his data. Run it whole or not at all.
--
-- ⚠️ VERIFYING THIS IN THE SQL EDITOR PROVES NOTHING ABOUT THE APP.
-- The SQL editor runs as `postgres`, which BYPASSES RLS entirely. The app reaches Postgres as
-- `authenticator` -> `anon`, which does not. A policy mistake is invisible from the editor and looks
-- like "no data" in the app. After running this, verify from the CLIENT - see below.
-- ============================================================================

-- ⚠️ THE ORDER OF THESE TWO STATEMENTS IS A SAFETY PROPERTY, NOT A STYLE CHOICE.
-- POLICY FIRST, THEN ENABLE. A policy on a table with RLS disabled is inert - it sits there
-- enforcing nothing - so statement 1 cannot change behaviour no matter what. Enabling RLS then
-- switches the already-present policy on in the same instant.
-- Written the other way round (enable, then create) there is a window, however brief, where the
-- table is RLS-on with no policy - the zero-menus state described above - and the ONLY thing
-- preventing it is the transaction holding. This way round, the bad state does not exist even if
-- the transaction is not honoured: a failure after statement 1 leaves RLS off and an unused policy,
-- which is exactly today's behaviour.
-- The transaction stays as well. Belt and braces, cheap.

begin;

create policy "staff full access"
  on public.menus
  for all
  to public
  using (true)
  with check (true);

alter table public.menus enable row level security;

commit;

-- ============================================================================
-- AFTER RUNNING - the checks that actually mean something.
--
-- 1. Schema, from the SQL editor (necessary, not sufficient):
--
--      select c.relname, c.relrowsecurity,
--             (select count(*) from pg_policies p
--               where p.schemaname='public' and p.tablename=c.relname) as policies
--        from pg_class c join pg_namespace n on n.oid=c.relnamespace
--       where n.nspname='public' and c.relname='menus';
--
--    Expect: relrowsecurity = true, policies = 1. If policies = 0, the transaction did not complete -
--    DO NOT LEAVE IT THERE, either create the policy or `alter table public.menus disable row level
--    security` until it can be run whole. RLS-on-with-no-policy is the zero-menus state described above.
--
-- 2. As the CLIENT, which is the check that counts. Open https://scoopyscosting.vercel.app and
--    confirm the menus are all still listed and a menu can still be renamed and saved. A read that
--    returns 200 with an empty array is the failure mode, and it does not raise a toast.
--
-- 3. Correct the now-false sentence that said menus starts from RLS OFF.
--    ⚠️ IT IS IN `docs/QUEUE.md`, under "`business_id` on every table, plus RLS" - NOT in CLAUDE.md.
--    An earlier draft of this file sent the reader to CLAUDE.md Tier 2, where that sentence has
--    never existed; the v121 pre-push review caught it. Done 8 Aug 2026, in the same batch.
-- ============================================================================
