-- 20260814_invitations.sql — batch 191
--
-- WHAT THIS DOES
--   The SERVER half of "Roles — invitations, so an owner can add someone", which
--   Max settled on 14 Aug 2026 as shape B: an owner creates a pending invite for
--   an email address, and that address — and only that address — can then join
--   the café. It changes no client file. Nothing here is reachable until the
--   client half ships, which is the same order 187 used for the roles it
--   enforces and 182 for the tenant policies: the rule exists before anything
--   can exercise it, so the batch that builds the client is adding affordances
--   rather than inventing enforcement.
--
--   It is PURELY ADDITIVE. No existing table, column, policy, function, trigger
--   or grant is altered or dropped. That is not a coincidence, it is the design:
--   it means the rollback is "drop what this created", it means production
--   cannot behave differently the moment this applies, and it means this file
--   has no lockout failure mode and therefore needs no `do $$ … raise` guard of
--   the kind 186 required. Say what makes a migration safe; do not perform the
--   ceremony of a migration that isn't.
--
-- WHAT IT CREATES
--   * `public.business_invites` .......... one pending invitation per email, per café
--   * `public.normalize_invite_email()` .. BEFORE trigger; lower/trim the address
--   * `public.invite_pending(text)` ...... the gate on the sign-up form
--   * `public.claim_business_invite()` ... turns a pending invite into a membership
--   * `public.business_team()` ........... who is in this café (owner-only)
--
-- ---------------------------------------------------------------------------
-- WHY A CLAIM FUNCTION AND NOT A TRIGGER ON `auth.users`
--
--   The obvious mechanism is the documented Supabase one: an `after insert on
--   auth.users` trigger that looks for a pending invite and creates the
--   membership, so the account "joins a café by construction". It was written
--   that way first and then rejected, by walking the cases rather than by taste.
--
--   ⚠️ A TRIGGER ON SIGN-UP ONLY EVER FIRES FOR A PERSON WHO HAS NO ACCOUNT YET,
--   and the person an owner invites may well already have one. Every account
--   this project has ever had was made BY HAND in the Supabase dashboard —
--   that is the queue item's own measurement, and Max's is one of them. For any
--   of those people `signUp` answers "user already registered", the trigger
--   never fires, and shape B would have no path at all. The hole is invisible
--   while production has one account and appears the first time a real second
--   person is invited.
--
--   `claim_business_invite()` covers BOTH cases with ONE mechanism — CLAUDE.md's
--   law that two definitions of the same thing IS the defect — and it is called
--   at the exact moment the client already discovers there is no café: the
--   tenant gate. It also touches nothing in the `auth` schema, so a bug in it
--   can leave someone without a café (recoverable, and 185 already has a screen
--   that says so) but can never break sign-up or e-mail confirmation itself.
--   That asymmetry is the whole argument: the trigger's failure mode is worse
--   than the thing it was buying.
--
-- ---------------------------------------------------------------------------
-- WHY `invite_pending` EXISTS, AND WHAT IT DISCLOSES — stated, not buried
--
--   The sign-up form has to refuse an address nobody invited BEFORE calling
--   `signUp`, or an uninvited stranger creates a real `auth.users` row and burns
--   one of the project's rate-limited confirmation emails. So there is an
--   endpoint an anonymous caller may ask "is there a pending invitation for
--   this address", and it answers a boolean.
--
--   What that gives away: that some café has invited a given address. Not which
--   café, not by whom, not the role, and nothing at all about an address that
--   was never invited. The alternative — no probe, sign-up always attempted —
--   discloses the same fact through the success or failure of the sign-up
--   itself, and adds an email-sending amplifier on top. This is the smaller
--   surface, not a free one.
--
--   ⚠️ IT IS UNAUTHENTICATED AND UNRATE-LIMITED BY THIS FILE. Supabase's own
--   per-IP limits are the only brake. That belongs to the queue's "Gate review
--   before public signup" item alongside the Gemini endpoints, and a line has
--   been added there rather than left as a comment nobody greps.
--
-- ---------------------------------------------------------------------------
-- WHY `business_invites` IS NOT IN THE BACKUP AND NOT IN `restore_backup`
--
--   `buildBackup` emits café CONTENT — products, plates, menus, dishes, taught
--   packs, history, settings. An invitation is membership state: it says who may
--   join, which is the same class of thing as `business_members` and
--   `businesses`, neither of which is in a backup either. Restoring last week's
--   file must not revoke an invitation sent yesterday, and must not resurrect
--   one that was revoked. So this table is deliberately outside both, and hard
--   rule 9 (a change to what `bootstrapSync` puts in memory is a format change)
--   is not engaged: nothing here reaches memory at boot.
--
-- ---------------------------------------------------------------------------
-- THE ORDER OF THE STATEMENTS, WHICH IS THE OPPOSITE OF 20260808_menus_rls.sql
--
--   CLAUDE.md says to order statements so the dangerous intermediate state
--   cannot exist, and 182's worked example creates the policy BEFORE enabling
--   RLS — because that table already held rows being served, so a failure
--   between the two had to leave today's behaviour.
--
--   This table is NEW and EMPTY, so the dangerous intermediate is the mirror
--   image: `create table` + Supabase's stock grants with RLS still off is a
--   world-readable table. RLS is therefore enabled IMMEDIATELY after the create
--   and BEFORE any policy — RLS with no policies denies everything, which is the
--   harmless intermediate here — and the grants are last. Same law, opposite
--   order, because the safe state is the opposite state. The transaction is kept
--   as well.
--
-- ---------------------------------------------------------------------------
-- ROLLBACK. Not one statement, because this creates five objects rather than
-- changing one; it is safe in a way a single statement usually is not, because
-- nothing existing depends on any of them until the client half ships:
--
--   drop function if exists public.business_team();
--   drop function if exists public.claim_business_invite();
--   drop function if exists public.invite_pending(text);
--   drop table if exists public.business_invites;      -- takes its trigger with it
--   drop function if exists public.normalize_invite_email();
--
--   In that order (functions first, then the table, then the trigger's function)
--   so nothing is dropped out from under a dependency. It loses any pending
--   invitations, which is the correct amount of data loss for a feature nothing
--   has used yet — and is why this rollback is worth having BEFORE anyone is
--   invited rather than after.
--
-- ---------------------------------------------------------------------------
-- REHEARSED: staging (pboidoxjghntalovzrke), 14 Aug 2026, on the scale seed with
--   the four accounts 182 and 187 created. The mirror was confirmed CURRENT first
--   by diffing all seven fingerprints against production — identical — which is
--   docs/STAGING.md step 2 satisfied by measurement rather than by re-running a
--   file and hoping. Verified AS THE CLIENT over PostgREST with real signed-in
--   JWTs, never through the MCP, which runs as `postgres` and bypasses RLS:
--   * OWNER (a@, café one): created an invite, read it back, revoked one.
--     `business_team()` returned its two members WITH their email addresses —
--     the thing `auth.users` being unreadable makes impossible today.
--   * STAFF (d@, café one): `GET /business_invites` -> `[]` while the row was
--     demonstrably there, `POST` refused OUT LOUD with 42501 naming the policy,
--     and `DELETE` returned HTTP 200 having changed NOTHING — the silent no-op
--     docs/STAGING.md warns about, with the row still present afterwards.
--     `business_team()` -> zero rows.
--   * OWNER OF CAFÉ TWO (b@): could not see café one's invitations, and its own
--     were invisible to café one. Exclusion demonstrated both ways.
--   * ANON: `[]` on the table, `false` from the probe, `null` from the claim.
--   * THE CLAIM, END TO END: c@ (a member of nothing since 182) was invited by
--     café one, called `claim_business_invite()` as itself, got café one's uuid
--     back — and went from `*/0` to 520 products on `GET /ingredients`. A second
--     call returned `null` rather than joining twice.
--   * THE REFUSALS, which matter more than the success: with c@ holding NO
--     membership and NO invitation of its own, a claim returned `null` and left
--     it at `*/0` — it cannot consume somebody else's. Once a member, café two's
--     invitation to it also returned `null` (one café per person, 187).
--   * Mixed case and surrounding spaces (`"  C@Example.COM  "`) were stored as
--     `c@example.com`; four malformed addresses were refused 23514; a second
--     PENDING invite for one address in one café was refused 23505 while the
--     SAME address remained invitable by a different café.
--   * ⚠️ THE ONE REAL DEFECT THIS REHEARSAL FOUND, and it was found by measuring
--     rather than by reading: with `invited_by` carrying only a DEFAULT, an owner
--     POSTing an explicit `"invited_by":"<another user>"` had it stored VERBATIM.
--     A DEFAULT fires only when the column is ABSENT from the INSERT. That is
--     CLAUDE.md's DEFAULT-vs-trigger law read in the other direction, and its
--     remedy is the `stamp_invite` trigger below — after which the spoof, and a
--     later UPDATE trying to rewrite the column, both came back as the true
--     inviter. The claim's own UPDATE still works through the freeze branch,
--     re-checked end to end afterwards.
--   * The MIRROR's section 4c was then re-run against a staging that already had
--     every object, and completed clean — so docs/STAGING.md's claim that
--     01-schema.sql is idempotent stays true with this section in it.
--   * Staging was returned to its documented state afterwards: c@ a member of
--     nothing again, no invitations left, café one still 520 products.
--
-- ⚠️ AND THEN THE PRE-PUSH REVIEW FOUND THREE MORE, TWO OF THEM REAL DEFECTS IN
--   WHAT HAD ALREADY BEEN APPLIED. This file was amended and BOTH databases were
--   brought to the amended version before merge; the records above and below
--   describe the file as it now stands. Recorded rather than quietly rewritten,
--   because "applied, then corrected before anyone could use it" and "applied
--   correctly" are different facts and only one of them is true here.
--   * THE RACE, and it was the sharpest thing in the batch: the invitation was
--     read and later marked accepted in two statements with no lock, so a revoke
--     committing between them left the UPDATE matching zero rows while the
--     membership INSERT had already happened — and the function still returned
--     the café's id. A revoke landing mid-claim would not have stopped the join.
--     Fixed with `for update`, which also collapses the concurrent double-claim
--     into a clean `null`. See the note at the function.
--   * THE FORGEABLE ACCEPTANCE: `grant all` let an owner PATCH `accepted_at` and
--     `accepted_by` on a pending invitation directly. A policy decides which
--     ROWS, never which columns, so no policy could have stopped it. Fixed by
--     granting the table select/insert/delete and no UPDATE at all — measured
--     afterwards as `42501 permission denied` on the PATCH, with INSERT and
--     DELETE still working for an owner.
--   * THE GUARD WAS PROVED TO FIRE rather than assumed, on staging, with the
--     accept UPDATE deliberately pointed at an id that cannot exist: the claim
--     raised `P0001 … (0 rows)` over PostgREST AND the membership insert was
--     rolled back — zero memberships afterwards, the invitation still pending.
--     Without that demonstration it is an assertion nobody has watched execute,
--     which is this repo's most common defect.
--   * The third finding was a test that read only this file and not the mirror,
--     so a hand-edit turning a mirror policy into `for all` would have stayed
--     green. Fixed in tests/invites.test.js and proved by mutating the MIRROR
--     alone, which is now red.
--
-- APPLIED TO PRODUCTION: 14 Aug 2026, by Claude, in the commit that added these
--   lines — written after the statements ran, never before. Applied TWICE, and
--   the second time is the one that counts: the first application was of the
--   pre-review file, and the two fixes above were applied to production before
--   merge (the `for update` + row-count guard as a `create or replace`, and the
--   grant as `revoke all` then `grant select, insert, delete`). Nothing had used
--   the feature in between, because no client calls it. Verified:
--   * as the ANON CLIENT over PostgREST, with the publishable key that ships in
--     index.html: `GET /business_invites` -> `[]`, `invite_pending` -> `false`,
--     `business_team()` -> `[]`, `claim_business_invite()` -> `null`, and an
--     INSERT refused 42501. 186's gate is undisturbed — `ingredients` is still
--     `*/0` for anon.
--   * as MAX'S ACCOUNT with RLS APPLIED (`set local role authenticated` plus his
--     `sub` claim; a plain MCP query bypasses RLS and would prove nothing):
--     tenant `…0001`, role `owner`, zero invitations, and `business_team()`
--     returning exactly one row — his own address. His café is untouched: 412
--     products, 79 plates, 2 menus, 76 dishes.
--   * SCHEMA FINGERPRINTS (docs/STAGING.md) IDENTICAL to staging afterwards on
--     all seven values, `functions_fp` included — which hashes
--     `pg_get_functiondef`, so the deployed source of all four functions is
--     byte-identical on both projects and the mirror is not stale.
--   ⚠️ NOTHING IS REACHABLE BY THE APP YET. `js/app.js` calls none of these; the
--   client half is queue item 1. That is deliberate and is the same order 187
--   and 182 used.
-- ---------------------------------------------------------------------------

begin;

-- ---------------------------------------------------------------------------
-- 1. THE TABLE
--
-- `email` is the identity here, not a `user_id`, and that is the point of shape
-- B: the person being invited need not have an account yet. It is stored
-- normalised — lower-cased and trimmed — by the BEFORE trigger below, and the
-- check constraint then PROVES the trigger ran. That pairing is deliberate: a
-- BEFORE trigger fires ahead of constraint checking, so the trigger is the
-- mechanism and the constraint is the evidence, and neither can silently stop
-- working while the other still does.
--
-- `role` carries the same two values as `business_members.role` rather than
-- being pinned to 'staff'. It has to: the invite is what DECIDES the
-- membership's role, so a narrower vocabulary here would be a second, disagreeing
-- definition of what a role is.
-- ⚠️ SO NOTHING HERE STOPS AN OWNER INVITING A CO-OWNER, and the client half
-- offering staff only is a UI promise rather than an enforced rule. Spelled out
-- because the pre-push review read the shorter wording as a claim that staff-only
-- was enforced somewhere. If it ever needs to BE enforced, that is a check
-- constraint or a policy, not a sentence.
--
-- `business_id` gets BOTH a default and a trigger, and both call
-- `current_business_id()` — CLAUDE.md's rule that a DEFAULT and a BEFORE trigger
-- on one column are one mechanism with two entry points and must compute the
-- same value. The trigger is redundant on every path this table has today (no
-- restore inserts into it, so no `jsonb_populate_recordset` can supply an
-- explicit NULL that overrides the default). It is here anyway, because the ten
-- tables that needed it needed it for a path nobody was exercising either.
-- ---------------------------------------------------------------------------
create table public.business_invites (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null default public.current_business_id()
                 references public.businesses(id) on delete cascade,
  email        text not null,
  role         text not null default 'staff',
  -- WHO SENT IT IS THE SERVER'S ANSWER, not the client's, for the same reason
  -- `business_id` is: this is the audit trail for the only action in the app
  -- that can hand somebody else a key.
  --
  -- ⚠️ THE DEFAULT ALONE IS NOT ENOUGH AND THE REHEARSAL PROVED IT. The first cut
  -- left the column bare and every invite came back `invited_by: null`; the
  -- second cut added this DEFAULT and an owner posting an explicit
  -- `"invited_by":"<somebody else>"` was stored VERBATIM — measured over
  -- PostgREST, not reasoned. A DEFAULT only fires when the column is ABSENT from
  -- the INSERT, which is CLAUDE.md's law read in the other direction. So the
  -- BEFORE trigger below overwrites it on insert and freezes it on update, and
  -- the two entry points compute the same value because that is the same law's
  -- other half.
  invited_by   uuid default auth.uid() references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  accepted_by  uuid references auth.users(id) on delete set null,
  constraint business_invites_role_check check (role in ('owner','staff')),
  -- Normalised, and a shape that is at least plausibly an address. Not RFC 5322:
  -- the useful job is refusing a blank, a name, or something with a space in it
  -- before it becomes a row nobody can ever match against a real sign-in.
  constraint business_invites_email_check check (
    email = lower(btrim(email))
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  -- Both or neither. A row with `accepted_by` set and `accepted_at` null would
  -- read as pending to every query below while a membership already exists.
  constraint business_invites_accepted_check check (
    (accepted_at is null) = (accepted_by is null)
  )
);

-- ONE pending invitation per address per café, and re-inviting after acceptance
-- is allowed — the index is partial so an accepted row stops competing. Without
-- `where accepted_at is null` an owner could never re-invite somebody who had
-- left, and with no index at all a double-tap on the invite button would leave
-- two rows that `claim_business_invite` would consume one at a time.
create unique index business_invites_pending_uk
  on public.business_invites (business_id, email)
  where accepted_at is null;

-- The claim reads by email across every café, so it wants the address indexed on
-- its own rather than only behind `business_id`.
create index business_invites_email_idx
  on public.business_invites (email) where accepted_at is null;

-- The row's two server-decided fields, in ONE trigger because they are one
-- question — "what does the caller not get to choose". The email is normalised
-- (the check constraint above then proves it happened); `invited_by` is stamped
-- from the session on insert and FROZEN on update, so neither a request body nor
-- a later edit can rewrite who handed out a key. `claim_business_invite`'s own
-- update passes through the freeze unchanged, which is what makes it a no-op
-- there rather than a special case.
create or replace function public.stamp_invite()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  new.email := lower(btrim(coalesce(new.email, '')));
  if tg_op = 'INSERT' then
    new.invited_by := auth.uid();
  else
    new.invited_by := old.invited_by;
  end if;
  return new;
end;
$fn$;

create trigger stamp_invite
  before insert or update on public.business_invites
  for each row execute function public.stamp_invite();

-- The same function the ten data tables use, for the reason in the table's
-- comment above. It fills only a NULL, so the DEFAULT wins on every client
-- write and the two agree by construction because they call the same thing.
create trigger set_business_id
  before insert or update on public.business_invites
  for each row execute function public.set_default_business_id();

-- ---------------------------------------------------------------------------
-- 2. RLS — ENABLED BEFORE THE POLICIES, WHICH IS THE OPPOSITE OF 182
--
-- See the header. A new empty table's dangerous intermediate is "grants exist,
-- RLS off"; RLS on with no policies denies everything, so that is the state this
-- passes through.
-- ---------------------------------------------------------------------------
alter table public.business_invites enable row level security;

-- The tenant policy, in the shape 182's loop produces for the seven `for all`
-- tables, written out because this table is not in that loop.
create policy "business_invites tenant access" on public.business_invites
  for all to public
  using (business_id = (select public.current_business_id()))
  with check (business_id = (select public.current_business_id()));

-- ⚠️ FOUR RESTRICTIVE POLICIES, ONE PER COMMAND, AND ALL FOUR ARE THE POINT.
--
-- `as restrictive` is not decoration and its absence is invisible: permissive
-- policies are OR'd, so the same words without those two would be OR'd with the
-- tenant policy above and take away NOTHING — staff would read, write and revoke
-- invitations, the SQL would still say 'owner', the policy list would still show
-- a policy with the right name, and nothing would raise. That is 187's lesson.
--
-- Enumerating all four commands is 187's OTHER lesson, the one that shipped past
-- the first draft: its `food_cost_target` restriction covered an upsert's two
-- halves and forgot DELETE, because the frame was "what does my client send"
-- rather than "what are ALL the ways this can change". Invitations are the same
-- shape — the client half will only ever INSERT and DELETE — so SELECT and
-- UPDATE are named here for the caller nobody wrote.
--
-- And `for all` would be a third bug in the same family: `as restrictive for
-- all` requires ownership to READ as well, which on a tenant table means staff
-- open the app to an empty café. Each policy names its one command.
create policy "business_invites owner-only select" on public.business_invites
  as restrictive for select to public
  using ((select public.current_business_role()) = 'owner');

create policy "business_invites owner-only insert" on public.business_invites
  as restrictive for insert to public
  with check ((select public.current_business_role()) = 'owner');

create policy "business_invites owner-only update" on public.business_invites
  as restrictive for update to public
  using ((select public.current_business_role()) = 'owner')
  with check ((select public.current_business_role()) = 'owner');

create policy "business_invites owner-only delete" on public.business_invites
  as restrictive for delete to public
  using ((select public.current_business_role()) = 'owner');

-- ⚠️ NOT `grant all`, unlike every other table here, and the difference is the
-- point. The review found that an owner could PATCH `accepted_at`/`accepted_by`
-- on a pending invitation directly — marking it accepted with no membership
-- behind it, which the `both or neither` constraint cannot catch because it can
-- only see the row. The restrictive UPDATE policy above does not help: a policy
-- decides WHICH ROWS, never which columns.
--   There is no legitimate client UPDATE on this table at all. An invitation is
--   created, and then either claimed by the server or revoked; nothing edits one.
--   So the grant is the bar, and it is a stronger one than any policy could be:
--   `claim_business_invite` is SECURITY DEFINER and runs as the owner of the
--   function, so withholding UPDATE from the API roles costs it nothing.
--   The restrictive UPDATE policy STAYS as a backstop, and because 187's lesson
--   is to name every command rather than the ones your client happens to send.
grant select, insert, delete on table public.business_invites to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. THE GATE ON THE SIGN-UP FORM
--
-- Answers a boolean and nothing else. `security definer` because the caller is
-- by definition not signed in and cannot read the table — that is the whole
-- reason it exists rather than the client selecting for itself. The disclosure
-- it makes is argued in the header; it is not an accident.
--
-- ⚠️ NOTHING MAY BE WRITTEN INSIDE THE DOLLAR QUOTES OF ANY FUNCTION IN THIS
-- FILE, and it is not a style rule. `pg_get_functiondef` returns the stored
-- source text INCLUDING comments, docs/STAGING.md's seven-value fingerprint
-- hashes it, and supabase/staging/01-schema.sql must carry these bodies
-- byte-identically — so a comment added in one and not the other makes the only
-- drift detector this project has go permanently red.
-- ---------------------------------------------------------------------------
create or replace function public.invite_pending(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.business_invites i
     where i.email = lower(btrim(coalesce(p_email, '')))
       and i.accepted_at is null
  );
$fn$;

revoke all on function public.invite_pending(text) from public;
grant execute on function public.invite_pending(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. THE CLAIM — the one mechanism that turns an invitation into a membership
--
-- Called by a signed-in account that the tenant gate has just found has no café.
-- It joins that account to the café that invited its own address, and marks the
-- invitation accepted. Three answers, and the client resolves them the way it
-- resolves every other three-answer question in this app: a uuid means joined, a
-- NULL means there was nothing to claim, and an error is neither.
--
-- WHAT IT WILL NOT DO, each one a refusal rather than an oversight:
--   * claim for anybody but the CALLER. The address comes from `auth.users` by
--     `auth.uid()`, never from an argument — the function takes none, so there
--     is nothing to point at somebody else's invitation.
--   * claim on an UNCONFIRMED address. Email confirmation is on, so an
--     unconfirmed account cannot hold a session anyway and this looks redundant.
--     It is here because that is a dashboard SETTING, and the day somebody turns
--     it off, an invitation would become claimable by anyone who could type the
--     address. A guard whose premise lives in a web console is a guard worth
--     writing down.
--   * join a SECOND café. 187 decided one café per person and has a unique
--     constraint saying so; this returns early instead of letting that
--     constraint raise, because the honest answer to "you already have a café"
--     is nothing-to-claim rather than an error the client would have to decode.
--   * consume somebody else's invitation, or one already accepted.
--
-- `security definer` is what lets it insert into `business_members`, which no
-- client may write. Everything it inserts is derived from `auth.uid()` and from
-- the matched invitation, so the caller supplies none of it.
--
-- ⚠️ `FOR UPDATE` IS LOAD-BEARING AND WAS ADDED BY THE PRE-PUSH REVIEW. Without
-- it the SELECT and the UPDATE are two statements with two snapshots, and under
-- READ COMMITTED a revoke committing between them leaves the UPDATE matching
-- ZERO rows — while the membership INSERT has already happened and the function
-- still returns the café's id. A revoke that lands mid-claim would not have
-- stopped the join; it would have produced a member with no invitation behind
-- them, silently, on the success path. The window is small and it is on an
-- ordinary path rather than an exotic one, because the client half calls this
-- automatically from the tenant gate on every boot of a memberless account.
--   Locking the row makes the two orders both correct rather than one of them
--   lucky: a revoke that commits FIRST means the locked read finds nothing and
--   the answer is a clean `null`; a revoke that arrives SECOND waits, and then
--   deletes an invitation that was legitimately claimed.
--   It also settles the concurrent DOUBLE-claim the review raised separately:
--   the second caller waits, re-reads under the lock, sees `accepted_at` is no
--   longer null and returns `null` instead of raising a unique violation.
--   ⚠️ Honestly stated, one narrow case survives: two pending invitations for the
--   same address from DIFFERENT cafés, claimed concurrently, lock different rows
--   and race the membership insert. One of them raises 23505 on 187's
--   one-café-per-person constraint — which is that constraint doing its job, and
--   the client already treats an error as "change nothing".
--
-- THE `get diagnostics` CHECK IS NOT DEAD CODE, and it is unreachable on purpose.
-- With the lock above, the UPDATE cannot match zero rows. It is here so that if
-- a later edit removes `for update` — the exact thing the review found missing —
-- the failure is a raised exception that rolls the membership insert back, not a
-- silent success. Proved to fire before it was believed: on staging, with the
-- `where` deliberately pointed at a non-existent id, the claim raised and the
-- `business_members` row was rolled back rather than left behind.
-- ---------------------------------------------------------------------------
create or replace function public.claim_business_invite()
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  uid uuid := auth.uid();
  em  text;
  n   int;
  inv public.business_invites%rowtype;
begin
  if uid is null then
    return null;
  end if;

  if exists (select 1 from public.business_members m where m.user_id = uid) then
    return null;
  end if;

  select lower(btrim(u.email)) into em
    from auth.users u
   where u.id = uid
     and u.email_confirmed_at is not null;
  if em is null or em = '' then
    return null;
  end if;

  select i.* into inv
    from public.business_invites i
   where i.email = em
     and i.accepted_at is null
   order by i.created_at, i.id
   limit 1
     for update;
  if not found then
    return null;
  end if;

  insert into public.business_members (business_id, user_id, role)
       values (inv.business_id, uid, inv.role);

  update public.business_invites
     set accepted_at = now(), accepted_by = uid
   where id = inv.id;
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'invitation % could not be marked accepted (% rows) - refusing to leave a membership with no invitation behind it', inv.id, n;
  end if;

  return inv.business_id;
end;
$fn$;

revoke all on function public.claim_business_invite() from public;
grant execute on function public.claim_business_invite() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. WHO IS IN THIS CAFÉ
--
-- The Team card cannot answer that today: `business_members` holds user ids and
-- `auth.users` is not readable by any client role, so the owner can see which
-- role THEY hold and nothing about anybody else. 188's own handover names this
-- as the gap this item should close.
--
-- Owner-only, and the guard is inside the query rather than in a `raise`: a
-- non-owner gets zero rows. Empty is normally an ambiguous answer in this
-- codebase and here it is not, which is worth stating because the general rule
-- says otherwise — an owner is always a member of their own café, so an owner
-- can never see an empty team. Zero rows therefore means "you are not an owner"
-- unambiguously, and the client half calls this only when it already believes it
-- is one.
--
-- It discloses the email addresses of the caller's own café's members to the
-- owner of that café, which is a person who invited every one of them by typing
-- that address.
-- ---------------------------------------------------------------------------
create or replace function public.business_team()
returns table (user_id uuid, email text, role text)
language sql
stable
security definer
set search_path = ''
as $fn$
  select m.user_id, u.email::text, m.role
    from public.business_members m
    join auth.users u on u.id = m.user_id
   where m.business_id = (select public.current_business_id())
     and (select public.current_business_role()) = 'owner'
   order by m.created_at, m.user_id;
$fn$;

revoke all on function public.business_team() from public;
grant execute on function public.business_team() to authenticated, service_role;

commit;
