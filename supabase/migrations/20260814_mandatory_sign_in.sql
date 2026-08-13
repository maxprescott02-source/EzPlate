-- 20260814_mandatory_sign_in.sql — batch 186
--
-- WHAT THIS DOES
--   Removes the `auth.uid() is null` branch from `public.current_business_id()`.
--   That branch answered the seeded Scoopy's business for any caller with no JWT,
--   and it is THE LAST PERMISSIVE READ IN THIS DATABASE: the anon key ships in
--   `index.html`, so anyone who opened the page could read the café's whole
--   product catalogue, plates, menus and pricing. Afterwards a caller with no
--   session resolves to NULL, every policy is false for every row, and sign-in
--   is mandatory for the first time.
--
--   It is a one-function change and always was — verified against the live
--   catalogue rather than assumed: `current_business_id` is the ONLY function in
--   `public` whose body mentions `auth.uid() is null`, and the ten `business_id`
--   DEFAULTs plus `set_default_business_id` already call it rather than naming
--   the legacy uuid themselves (batch 182 pointed all three mechanisms at one
--   definition for exactly this reason).
--
-- WHY THE CLIENT SHIPPED FIRST, AND WHY THAT IS THE SAFE ORDER
--   The dangerous intermediate state here is not inside the transaction, it is
--   between this file and the deploy. A signed-out caller and a signed-in
--   non-member now answer identically — null tenant, empty reads, clean 200 —
--   and only the client can tell them apart, from the session. The client that
--   does that is `ezplate-v162`.
--     * new client + old database: `anon` still resolves to the café, the gate
--       reads 'ok', the app behaves exactly as it did. Nothing to notice.
--     * old client + new database: every anon boot lands on 185's screen and
--       reads "you're signed in, but this account isn't linked to a café yet",
--       to someone who is not signed in at all, with a Sign out button that
--       cannot help.
--   So the client goes first and this file follows it. Same law as ordering the
--   statements inside a migration; the unit here is the deploy.
--
-- THE GUARD IS NOT DECORATION
--   If no confirmed account holds a `business_members` row, this migration turns
--   every caller — including Max — into a caller who can read nothing, with no
--   client-side way back. The `do $$` block below refuses in that case, and it
--   runs BEFORE the replace so a refusal leaves today's behaviour untouched.
--   Measured before applying (production, 14 Aug 2026): one row in `auth.users`,
--   `maxprescott02@gmail.com`, confirmed, member of
--   `00000000-0000-0000-0000-000000000001` (Scoopy's Family Cafe). The queue
--   item's recorded ids were re-measured rather than trusted, as it instructs.
--
-- ROLLBACK, one statement. It restores the anon fallback verbatim, and the app
-- works again for a signed-out browser the moment it runs.
--   create or replace function public.current_business_id()
--   returns uuid language sql stable security definer set search_path = '' as $fn$
--     select case
--       when auth.uid() is null
--         then '00000000-0000-0000-0000-000000000001'::uuid
--       else (select m.business_id
--               from public.business_members m
--              where m.user_id = auth.uid()
--              order by m.created_at, m.business_id
--              limit 1)
--     end;
--   $fn$;
--   It is re-runnable, and it does NOT require the client to be rolled back:
--   `ezplate-v162` reads 'ok' against either version of this function.
--
-- WHAT IT DOES NOT CHANGE
--   No policy, no default, no trigger, no grant. `security definer` and
--   `set search_path = ''` are kept for the reasons Part 2's header gives (the
--   lookup must not depend on `business_members` keeping a select policy, and a
--   mutable search_path on a definer function is an escalation path).
--   The `case` disappears rather than being rewritten: `where m.user_id = null`
--   matches no rows and yields NULL on its own, so the anon case needs no branch
--   of its own once it is no longer special.
--
-- REHEARSED: staging (pboidoxjghntalovzrke), 14 Aug 2026, on the scale seed with
--   the three accounts batch 182 created. Verified AS THE CLIENT over PostgREST
--   with real signed-in JWTs, not through the MCP:
--   * BEFORE: anon `rpc/current_business_id` -> the café's uuid, and
--     `GET /ingredients` -> 520 rows. A member and anon were indistinguishable.
--   * AFTER: anon -> `null`, `ingredients` -> `*/0`, `plates` -> `*/0`, all with
--     HTTP 200 — an empty count, never an error, which is precisely why a client
--     cannot detect this by waiting for something to throw;
--     `a@example.com` (a member) -> the café's uuid, 520 products and 180 plates,
--     byte-for-byte unchanged;
--     `c@example.com` (a member of nothing) -> `null` and nothing, unchanged.
--   * ⚠️ An anon INSERT was REFUSED OUT LOUD — `42501 new row violates row-level
--     security policy`, HTTP 401 — rather than returning the empty array that
--     docs/STAGING.md warns about. The `with check` fails before the column is
--     ever examined, so the not-null on `business_id` never gets a say. Recorded
--     because the expectation written here first said "comes back empty": the
--     silent-success shape is real for UPDATE and DELETE, and an INSERT with
--     `Prefer: return=representation` against a `with check` is not it.
--
-- THE GUARD WAS PROVED TO FIRE, not merely written. On staging, inside a `do`
--   block that deleted every membership and let the raise unwind it: the block
--   raised `GUARD FIRED (n=0)` and both membership rows were still there
--   afterwards. Without that, the guard is an assertion nobody has ever seen
--   execute — this repo's most common defect.
--
-- THE ROLLBACK WAS RUN, not merely stated (batch 181's lesson: a rollback that
--   has only been written down has been checked by nobody). Applied to staging
--   after the migration: anon went straight back to the café's uuid and its 520
--   products. The migration was then re-applied so staging stays mirrored.
--
-- APPLIED TO PRODUCTION: 14 Aug 2026, by Claude, after `ezplate-v162` was live on
--   https://scoopyscosting.vercel.app. Verified the same way as staging, from the
--   client over PostgREST: anon -> `null` + `[]`, and Max's account -> his café's
--   uuid + his 412 products.

do $$
declare n int;
begin
  select count(*) into n
    from public.business_members m
    join auth.users u on u.id = m.user_id
   where u.email_confirmed_at is not null;
  if n = 0 then
    raise exception
      'refusing to close the anon fallback: no CONFIRMED account holds a business_members row, so every caller would resolve to NULL and nobody could read anything. Create the membership first — see docs/QUEUE.md item 1 step 1.';
  end if;
end $$;

-- ⚠️ NOTHING MAY BE WRITTEN INSIDE THE DOLLAR QUOTES BELOW, and that is not a
-- style rule. `pg_get_functiondef` returns the stored source text INCLUDING its
-- comments, docs/STAGING.md's seven-value fingerprint hashes it, and
-- supabase/staging/01-schema.sql must carry this block byte-identically — so a
-- comment added in one and not the other makes the only drift detector this
-- project has go permanently red. The explanation therefore lives out here:
-- there is no anon case any more because there does not need to be one — a
-- caller with no session matches no membership row, and the select yields NULL
-- on its own. `order by` keeps a two-café person's answer stable (see Part 2).
create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $fn$
  select m.business_id
    from public.business_members m
   where m.user_id = auth.uid()
   order by m.created_at, m.business_id
   limit 1;
$fn$;
