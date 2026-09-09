-- 20260910_history_delete.sql — batch 250
--
-- WHAT THIS DOES
--   Makes deleting a food-cost history point an OWNER-ONLY action, on both series,
--   and makes it possible at all on one of them. It is the server half of QUEUE
--   item 89 (a `price_history` point cannot be deleted or corrected from the app);
--   the client half is the Settings surface that uses it.
--
-- WHAT IS ACTUALLY TRUE TODAY, MEASURED ON PRODUCTION 10 SEP 2026 RATHER THAN READ
-- OFF THIS DIRECTORY, and the two halves are OPPOSITE:
--
--   price_history       GRANT DELETE to anon+authenticated (the Supabase default)
--                       + ONE permissive policy, "price_history tenant access",
--                       which is `FOR ALL` — and FOR ALL includes DELETE.
--                       ⚠️ So ANY member of the café, staff included, can delete
--                       any point of the food-cost history right now. Nothing in
--                       js/app.js does it, which is why it has never shown up —
--                       but "no client code does it" is not a gate, and this table
--                       is the answer to "what was our food cost that week".
--
--   menu_price_history  GRANT DELETE as well, but only SELECT and INSERT policies.
--                       No DELETE policy means RLS refuses, so NOBODY can delete —
--                       not staff, not the owner, not the app.
--
--   Two sibling series, written by the same function on the same event, with
--   opposite deletion rules, and neither of them the rule anybody chose. That
--   asymmetry is the reason this migration exists in the shape it does: it is not
--   only enabling item 89's surface, it is closing a hole on the way past.
--
-- WHY RESTRICTIVE, AND WHY THE WORD MATTERS
--   Postgres ORs permissive policies together and ANDs restrictive ones in, and
--   `as permissive` is the DEFAULT — so a policy meant to take something away and
--   written without the word is decoration: it is OR'd with the tenant policy that
--   already permits the delete, changes nothing, and still shows up in the policy
--   list with the right name. CLAUDE.md records that as a shipped defect. Every
--   "owner-only" policy below therefore says `as restrictive` and is `to public`,
--   because a restriction that does not apply to everyone restricts nobody.
--
--   NULL REFUSES, which is what we want here: `current_business_role()` answers
--   NULL for a caller with no membership, and a policy evaluating to NULL denies.
--
-- THE ORDER OF THE STATEMENTS
--   `menu_price_history` gains its permissive DELETE and its restrictive owner-only
--   guard in that order, inside one transaction.
--   ⚠️ CORRECTED AFTER APPLICATION by this batch's pre-push review, and the SQL is
--   untouched — only this paragraph was wrong. It claimed the ordering mattered
--   because the permissive policy alone "would briefly let STAFF delete". Inside a
--   single transaction NO OTHER SESSION CAN OBSERVE THE INTERMEDIATE STATE at all,
--   whatever the statement order, so the transaction is doing that work and the
--   ordering is not. What the ordering actually guards is the two statements being
--   split across two DEPLOYS, where the window is real and is minutes long. That is
--   still worth writing them this way for; it is not what the file said.
--   Left as a correction rather than a rewrite because a migration is a record: the
--   claim was made, it was wrong, and the next reader should see which.
--
-- ROLLBACK, one statement per policy, and it restores exactly today's behaviour:
--   drop policy "price_history owner-only delete" on public.price_history;
--   drop policy "menu_price_history owner-only delete" on public.menu_price_history;
--   drop policy "menu_price_history tenant delete" on public.menu_price_history;
--
-- ⚠️ WHAT THIS MIGRATION DOES NOT DELETE. It grants no data change of its own and
--   removes no row. Production carries two bad points — 354.4 on the all-menus
--   series and 30000 on a per-menu series whose menu was itself an audit artefact —
--   and removing them is Max's, from the app, once this and the surface are live.
--   That is the standing rule for destructive production work and it is unchanged.
--
-- APPLIED: staging AND production, 10 Sep 2026. See the record at the bottom.

begin;

-- ---------------------------------------------------------------------------
-- price_history — take the DELETE away from staff.
-- The permissive `FOR ALL` tenant policy stays exactly as it is: it is what lets
-- the owner delete, and rewriting it to spell out three commands would be a second
-- definition of the tenant rule that has to keep agreeing with the other nine.
-- ---------------------------------------------------------------------------
drop policy if exists "price_history owner-only delete" on public.price_history;
create policy "price_history owner-only delete" on public.price_history
  as restrictive for delete to public
  using ((select public.current_business_role()) = 'owner');

-- ---------------------------------------------------------------------------
-- menu_price_history — give the owner a delete that does not exist yet, and take
-- it away from staff in the same breath. The permissive half is scoped to the
-- tenant the same way its SELECT already is, and names the same two roles that
-- policy names, so the table keeps one convention rather than two.
-- ---------------------------------------------------------------------------
drop policy if exists "menu_price_history tenant delete" on public.menu_price_history;
create policy "menu_price_history tenant delete" on public.menu_price_history
  for delete to anon, authenticated
  using (business_id = (select public.current_business_id()));

drop policy if exists "menu_price_history owner-only delete" on public.menu_price_history;
create policy "menu_price_history owner-only delete" on public.menu_price_history
  as restrictive for delete to public
  using ((select public.current_business_role()) = 'owner');

commit;

-- ---------------------------------------------------------------------------
-- APPLICATION RECORD — written when it happened, never ahead of it.
-- ---------------------------------------------------------------------------
-- STAGING, 10 Sep 2026, by Claude via the Supabase MCP (execute_sql; apply_migration
--   is blocked on this setup). Verified three ways, in this order:
--     1. `pg_policies` — all three exist and the two owner-only ones really do say
--        RESTRICTIVE. That word is the whole mechanism and is the one most often
--        left out, so it is read back rather than assumed.
--     2. AS THE ANON CLIENT over PostgREST with the publishable key, DELETE with
--        `Prefer: return=representation` on both tables: HTTP 200 and an EMPTY body,
--        i.e. nothing was removed. ⚠️ ON ITS OWN THIS PROVES ALMOST NOTHING and is
--        recorded as such — anon has no tenant, so the rows were already invisible
--        to it and the result would have been identical before this migration.
--     3. THE ONE THAT COUNTS — AS A SIGNED-IN STAFF MEMBER. Staging's seed carries
--        a staff row (user 4444…, business 0000…0001), so the role this guard exists
--        for could actually be exercised rather than reasoned about, which is the
--        failure batch 219 recorded. In one transaction, with `set local role
--        authenticated` and that user's JWT claims: staff deleted 0 of 1 on
--        price_history and 0 of 1 on menu_price_history; the OWNER (user 1111…) then
--        deleted 1 of 1 on each. Test rows removed afterwards; leftover count 0.
--     4. AND THE HARNESS WAS PROVED TO FAIL. The same block was re-run with its
--        assertion inverted and raised `staff_deleted=0` — so the pass in step 3 is
--        a measurement and not a green light nobody has watched go red.
--
-- PRODUCTION, 10 Sep 2026, same method, immediately after. `pg_policies` re-read:
--   price_history      → one RESTRICTIVE DELETE policy, to public.
--   menu_price_history → one PERMISSIVE DELETE (anon, authenticated) and one
--                        RESTRICTIVE owner-only, to public.
--   ⚠️ The staff refusal was NOT re-exercised on production, and deliberately: it
--   has exactly one member, who is the owner, so there is no staff account to sign
--   in as and creating one on the real café's database to test a policy is not a
--   trade worth making. The behaviour was measured on staging against the identical
--   policy text; what production verifies is that the policies are present and
--   RESTRICTIVE. Recorded rather than glossed, because "verified on production" and
--   "the same SQL verified on staging" are different claims.
--
-- FINGERPRINT DIFF, 10 Sep 2026 (step 7 of docs/STAGING.md's procedure), run after both
--   applications: **all seven values identical between staging and production**, with
--   `policies_fp` reading `28:56c7b9e9d9d9482f5ca3a92b5081c594` on each — the three new policies
--   landed the same way on both, and the mirror in `supabase/staging/01-schema.sql` is current.
--   Recorded here because the procedure's last step is the one most often skipped once the
--   migration itself is seen to work.
--
-- NO DATA WAS DELETED BY THIS MIGRATION. Production still carries both bad points
--   (354.4 on the all-menus series, 30000 on a per-menu series). Removing them is
--   Max's, from the app, once QUEUE item 89's surface ships.
