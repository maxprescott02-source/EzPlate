-- 20260827_cafe_creation.sql — batch 209
--
-- WHAT THIS DOES
--   Creates ONE function, `public.create_business(text)`, and nothing else. It is
--   the only thing in this project that can bring a café into existence, and it
--   closes the last hole in the signup story: until now every `businesses` row
--   and every founding `business_members` row in either project was made BY HAND
--   in the Supabase dashboard, because both tables carry SELECT policies and no
--   others, so RLS default-denies every client write. That is the queue item's
--   own measurement and it was re-measured against production on 27 Aug 2026
--   before a line of this was written: two policies, both SELECT to
--   `authenticated`, and grants wide open on both tables to `anon` and
--   `authenticated`. ⚠️ IT IS RLS THAT STOPS THE WRITE, NOT THE GRANTS. Know that
--   before touching either table.
--
--   Max settled the shape on 14 Aug 2026 as B — SELF-SERVICE: a stranger creates
--   an account and names their own café, unattended
--   (`docs/decisions/2026-08-14-cafe-creation.md` q1). A and C are declined.
--
--   It is PURELY ADDITIVE. No table, column, index, policy, trigger or grant is
--   created, altered or dropped. That is the design, not a coincidence: the
--   rollback is one statement, production cannot behave differently the moment
--   this applies, and there is no lockout failure mode — so this file needs no
--   `do $$ … raise exception … $$` precondition guard of the kind 186 required.
--   Say what makes a migration safe; do not perform the ceremony of a migration
--   that isn't.
--
-- ---------------------------------------------------------------------------
-- WHY A FUNCTION AND NOT AN INSERT POLICY — the queue item says this in one
-- line and it is worth the paragraph, because the one-line version reads like a
-- preference.
--
--   A plain `for insert` policy on `business_members` would let ANY signed-in
--   account write itself a membership row naming ANY business id it can utter —
--   and it can utter any of them, because a uuid is not a secret. That is every
--   tenant policy 181–187 built, repealed by one statement, and it would not
--   raise anywhere: the write would succeed and the app would open somebody
--   else's café. The two rows have to be created TOGETHER, by something that
--   decides the business id itself, which is exactly what `security definer`
--   is for. `claim_business_invite()` is the same shape for the same reason.
--
-- ---------------------------------------------------------------------------
-- THE CONTRACT IS "ENSURE", NOT "CREATE", AND THE NAME IS THE ONE THING THAT
-- LIES ABOUT IT.
--
--   `create_business(p_name)` returns the business id THE CALLER NOW BELONGS TO.
--   If they already have one it returns that id and creates nothing. It is
--   therefore idempotent, and that is not a nicety — it is what makes a
--   double-tapped button, a retried request and a second browser tab all land on
--   one café instead of raising 23505 from 187's one-café-per-person constraint
--   and showing a real person a constraint name.
--   ⚠️ So do NOT read a returned uuid as "a café was just created". The client
--   does not need to know which happened: both answers mean "you have a café
--   now, go and boot".
--
-- WHY AN ADVISORY LOCK RATHER THAN TRUSTING THE CONSTRAINT.
--   Two concurrent calls from one account both see no membership, both insert a
--   business, and one then loses the membership insert to
--   `business_members_one_business_per_user`. The loser rolls back its own
--   business row, so there is no orphan — but the caller gets 23505 instead of
--   their café, on the ordinary double-tap path. The lock is keyed to the USER,
--   so it serialises only that account's own attempts and never two different
--   people signing up at the same moment. It is 191's `for update` lesson in the
--   only form available here: there is no row to lock, because the whole point
--   is that the caller has no rows yet.
--
-- WHAT IT WILL NOT DO, each a refusal rather than an oversight:
--   * run for a caller with no session. `anon` is REVOKED from execute BY NAME,
--     and the body refuses as well, because a grant is a different mechanism
--     from a guard and only one of them is visible in this file. ⚠️ The revoke
--     had to be by name and the first draft was not — see the note at the grant
--     statements, which is the one finding this migration's rehearsal produced.
--   * run for an UNCONFIRMED address. Email confirmation is on, so an
--     unconfirmed account cannot hold a session and this looks redundant. It is
--     here for `claim_business_invite`'s reason: that is a DASHBOARD SETTING, and
--     the day somebody turns it off, anyone who can type an address could mint a
--     café with it. A guard whose premise lives in a web console is a guard worth
--     writing down.
--   * accept a blank, whitespace-only or 60+ character name. The client checks
--     first; this is the check for the caller nobody wrote.
--   * create a SECOND café for an account that has one. See the contract above.
--
-- WHY THE NAME IS NOT ALSO A CHECK CONSTRAINT ON `businesses`.
--   Because this function is the only writer that exists — RLS denies every
--   direct INSERT from every client role, measured above — so a constraint would
--   be a SECOND definition of one rule, which is the defect CLAUDE.md names
--   about a DEFAULT and a trigger disagreeing. If a second writer is ever added,
--   the constraint becomes right and this comment becomes the reason to add it.
--
-- WHY THE OWNER ASSERTION AT THE END IS NOT DEAD CODE.
--   `set_member_role` (187) makes the FIRST member of a business its owner, so
--   the assertion cannot fire while that trigger is present and correct. It is
--   here because of what a false answer costs: a café whose creator is not its
--   owner cannot delete a plate, cannot change its food cost target and cannot
--   invite anybody — and there is no way back without the Supabase dashboard,
--   which is the exact thing this item exists to delete. Raising rolls the whole
--   thing back and leaves the caller able to try again. Same reasoning as the
--   `get diagnostics` check in `claim_business_invite`, and it WAS proved to fire
--   on staging rather than believed — probe 11b in the rehearsal record below.
--   ⚠️ Proving it took two attempts and the first one proved something else:
--   DISABLING `set_member_role` does not reach this assertion at all, because
--   the trigger is the only thing that sets `role` and the insert dies on the
--   NOT NULL first (23502). The assertion guards a trigger that is present and
--   WRONG, so the mutation has to be a trigger that returns 'staff'. A guard's
--   proof has to mutate the thing the guard is actually about.
--
-- ---------------------------------------------------------------------------
-- WHAT THIS DELIBERATELY DOES NOT TOUCH
--   * `invite_pending(text)`. The client half of this batch stops calling it —
--     a sign-up form that no longer refuses uninvited addresses has no use for
--     it — so it ships with no caller. Dropping it here would be the WRONG ORDER
--     (186): an old client still cached on a phone calls it and REFUSES sign-up
--     on an unreadable answer, so the drop has to follow the client, not lead it.
--     It is written into the queue's "Gate review before public signup" item,
--     which already owns that endpoint's disclosure and rate-limit questions.
--   * the two tables' policies and grants. Nothing here needs them widened, and
--     the item says in terms not to.
--
-- ---------------------------------------------------------------------------
-- ORDER OF DEPLOY: THIS FILE FIRST, THEN THE CLIENT.
--   The additive direction, and the safe one. Between this applying and the
--   deploy going out, the database answers a client that does not call it —
--   which is no change at all. The reverse would put a "Create my café" button
--   in front of a real person on a database with no function behind it.
--
-- ROLLBACK, one statement, and it is safe in the way a single statement usually
-- is not because nothing existing depends on it:
--
--   drop function if exists public.create_business(text);
--
--   It loses nothing already created: a café that exists keeps its rows, its
--   members and its data. What it removes is the ability to make the NEXT one,
--   which returns the project to where it was on 26 Aug 2026.
--
-- ---------------------------------------------------------------------------
-- ⚠️ THE TWO LINES THAT USED TO BE HERE WERE WRITTEN BEFORE ANYTHING RAN, and
--   they are recorded rather than quietly replaced because that is the exact
--   thing 186's rule forbids. They read "REHEARSED: staging …, 27 Aug 2026 — see
--   the record added below after the run" and "APPLIED TO PRODUCTION: see the
--   record below", and there was no record below either of them: batch 209 could
--   not rehearse, because the staging project was paused. A reader skimming for
--   "was this rehearsed" would have found a date and a project ref. The form was
--   a placeholder; it read as a fact. **If an application is deferred, the header
--   has to SAY DEFERRED, with the reason** — which is what the queue item did and
--   what this file did not.
--
-- REHEARSED: staging (pboidoxjghntalovzrke), 29 Aug 2026, by Claude (batch 218).
--   Step 2 satisfied by MEASUREMENT rather than by re-running `01-schema.sql`:
--   all seven `docs/STAGING.md` fingerprints diffed identical against production
--   first, so the mirror was provably current. No seed was loaded — the case this
--   migration is about is an AUTH state (a confirmed account belonging to no
--   café, `c@example.com`) rather than a data shape, and a seed does not touch
--   `auth.users`.
--   Verified AS THE CLIENT over PostgREST with a real signed-in JWT, never
--   through the MCP, which runs as `postgres` and bypasses RLS entirely:
--     1-3  blank, whitespace-only ("   ") and 61-character names each refused by
--          their own message.
--     4    exactly 60 characters ACCEPTED — the boundary is inclusive on both
--          sides, measured rather than read.
--     5    a SECOND call with a different name returned the SAME uuid and did not
--          rename the café. The "ensure, not create" contract, demonstrated.
--     6    the founder came out `owner`; the new café saw ITSELF in `businesses`
--          and neither of the other two tenants, and zero products and plates
--          against the 520 and 180 the neighbouring café holds.
--     7-8  and it can WRITE: a product and a `food_cost_target` both came back in
--          the representation carrying the new `business_id`. That is 182's
--          read-but-not-write defect and 183's semantic-key refusal both checked
--          against a THIRD tenant, because "isolation holds" is not the same
--          claim as "the new café works".
--     9    "  Bean\t\tThere\n\nCafe  " stored as "Bean There Cafe".
--     10   with `email_confirmed_at` nulled, a caller holding a valid session was
--          refused. The guard whose premise lives in a dashboard toggle FIRES.
--     11b  with `set_member_role` mutated to return 'staff', the owner assertion
--          raised and named the café, and the business row it had already
--          inserted was rolled back — zero orphans.
--   THE ONE DEFECT IT FOUND is the anon grant, at the grant statements below.
--   Everything created by the rehearsal was deleted: staging finished on the same
--   2 businesses / 3 memberships / 520 products / 10 settings it started with,
--   `c@example.com` is a member of nothing again (docs/STAGING.md's standing
--   warning), and `set_member_role`'s `pg_get_functiondef` md5 was diffed back to
--   production's.
--
-- APPLIED TO PRODUCTION: izrnptxhdylllodvglla, 29 Aug 2026, by Claude (batch
--   218), through the `supabase` MCP's execute_sql as one transaction, with the
--   anon revoke already in it — production has never held the one-mechanism
--   version. Verified:
--     * as `postgres`: `prosecdef` true, `proconfig` `search_path=""`, and the
--       ACL `{postgres=X,authenticated=X,service_role=X}` with anon ABSENT.
--       `has_function_privilege('anon', …, 'execute')` false, `authenticated`
--       true. `pg_get_functiondef`'s md5 identical to staging's.
--     * AS THE CLIENT over PostgREST, with the publishable key that ships in
--       index.html: `rpc/create_business` → `42501 permission denied for
--       function create_business`, HTTP 401 — refused at the grant, before the
--       body. `GET /businesses` and `GET /ingredients` still `[]` for anon,
--       unchanged by this migration.
--     * Scoopy's data untouched: 1 business, 1 membership, before and after.
--     * `docs/STAGING.md`'s seven-value fingerprint re-diffed against staging —
--       all seven identical, `functions_fp` having moved 9 → 10 on both sides.
--   NO café was created on production by this verification: every probe was
--   either an anon call (refused at the grant) or a read.
--
--   ⚠️ ORDER, and it is this file's own rule being followed rather than restated:
--   this ran BEFORE the client merged. Between the two, production answered a
--   client that does not call the function, which is no change at all.
-- ---------------------------------------------------------------------------

begin;

-- ⚠️ NOTHING MAY BE WRITTEN INSIDE THE DOLLAR QUOTES, and it is not a style
-- rule. `pg_get_functiondef` returns the stored source INCLUDING comments,
-- docs/STAGING.md's seven-value fingerprint hashes it, and
-- supabase/staging/01-schema.sql must carry this body byte-identically — so a
-- comment added in one and not the other makes the only drift detector this
-- project has go permanently red. Every explanation therefore lives out here.
--
-- Reading the body against the notes above:
--   `nm`  the normalised name. Internal runs of whitespace — a pasted newline, a
--         tab, a double space — collapse to one space before the blank and
--         length checks, so "   " is a blank and not a three-character name.
--   the lock  keyed to the caller's own uuid, held to the end of the
--         transaction, released by commit or rollback. `hashtextextended` with a
--         literal prefix keeps this project's lock space away from anybody
--         else's use of the same advisory-lock namespace.
--   `bid` the existing membership's business, read AFTER the lock so a
--         concurrent first caller has finished before the second one looks.
create or replace function public.create_business(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  uid uuid := auth.uid();
  nm  text;
  bid uuid;
  rl  text;
begin
  if uid is null then
    raise exception 'sign in before creating a cafe';
  end if;

  nm := btrim(regexp_replace(coalesce(p_name, ''), '[[:space:]]+', ' ', 'g'));
  if nm = '' then
    raise exception 'enter a name for your cafe';
  end if;
  if length(nm) > 60 then
    raise exception 'that name is too long - 60 characters at most';
  end if;

  if not exists (select 1 from auth.users u
                  where u.id = uid and u.email_confirmed_at is not null) then
    raise exception 'confirm your email address first, then come back';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('ezplate:create_business:' || uid::text, 0));

  select m.business_id into bid
    from public.business_members m
   where m.user_id = uid
   order by m.created_at, m.business_id
   limit 1;
  if bid is not null then
    return bid;
  end if;

  insert into public.businesses (name) values (nm) returning id into bid;
  insert into public.business_members (business_id, user_id) values (bid, uid);

  select m.role into rl
    from public.business_members m
   where m.business_id = bid and m.user_id = uid;
  if rl is distinct from 'owner' then
    raise exception 'the founder of % came out as % rather than owner - refusing to leave a cafe nobody can administer', bid, coalesce(rl, 'nothing');
  end if;

  return bid;
end;
$fn$;

-- `anon` is deliberately absent: a caller with no session has no uuid to own a
-- café with, and the body refuses anyway. Two mechanisms, because a grant is
-- checked before the body runs and only the body is visible to a reader of this
-- file.
--
-- ⚠️ AND THE FIRST DRAFT OF THIS FILE HAD ONLY ONE OF THOSE TWO MECHANISMS, WHILE
-- SAYING IT HAD BOTH. Found by the batch 218 rehearsal, as the anon client over
-- PostgREST, and it could not have been found by reading:
--
--   `revoke all ... from public` revokes the PUBLIC pseudo-role. `anon` is a
--   REAL ROLE, and it is a different thing. Supabase ships
--   `alter default privileges in schema public grant execute on functions to
--   anon, authenticated, service_role` (two of them, from `postgres` and from
--   `supabase_admin` — read them out of `pg_default_acl`), so EVERY new function
--   in this schema is created with `anon=X/postgres` already in its ACL. The
--   revoke above does not touch it and the grant below does not need to, so the
--   ACL that shipped read `{postgres=X,anon=X,authenticated=X,service_role=X}`.
--
-- Measured before the fix: an anon POST to `rpc/create_business` returned
--   `P0001 sign in before creating a cafe` — the BODY's raise, at HTTP 400. It
--   was refused, so this was never a hole; but it was refused by one mechanism
--   where this comment claimed two, and the claim is what the next reader trusts.
-- Measured after: `42501 permission denied for function create_business` at
--   HTTP 401, decided at the grant before the body runs, with a signed-in caller
--   unaffected. That is what two mechanisms looks like.
--
-- ⚠️ THE TRANSFERABLE PART, and it is CLAUDE.md's own rule about a check proving
-- only what it looked for: `revoke ... from public` is the idiom every migration
-- in this repo uses, and in a database with those default privileges it is
-- DECORATION against the three roles PostgREST actually connects as. Name the
-- role you mean to exclude. `claim_business_invite()` and `business_team()`
-- carry the identical gap for the identical reason — both are refused by their
-- bodies, neither is a hole, and both are filed in `docs/MAINTENANCE.md` rather
-- than fixed here, because a migration should not quietly re-grant functions
-- this item does not own.
revoke all on function public.create_business(text) from public;
revoke execute on function public.create_business(text) from anon;
grant execute on function public.create_business(text) to authenticated, service_role;

comment on function public.create_business(text) is
  'Ensures the calling account has a cafe, creating one named p_name if it has none. Returns the business id the caller now belongs to - which may be one it already had. batch 209.';

commit;
