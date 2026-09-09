-- 243 -- two pending invitations: refuse rather than guess, and let the person choose.
--
-- QUEUE item 14. REPLACES `public.claim_business_invite`, last defined by 20260814_invitations.sql
-- (batch 191) -- which is also the ONLY prior definition, established by listing the directory
-- rather than by trusting the item's citation:
--
--   grep -l 'create or replace function public.claim_business_invite' supabase/migrations/*.sql
--
-- That is 219's lesson and it is not ceremony: 219 copied a function forward from the wrong
-- ancestor because a queue item named one, and silently deleted 187's owner-only guard. Everything
-- 20260814_invitations.sql says about the confirmed-email requirement, the already-a-member refusal,
-- the `for update` lock and the accepted-at row-count guard is UNCHANGED and carried through
-- verbatim -- READ THAT FILE rather than assuming this one restates it.
--
-- ---------------------------------------------------------------------------
-- THE DEFECT
--
-- `claim_business_invite()` took no arguments. It found every pending invitation for the caller's
-- confirmed email, ordered by `created_at, id`, and took `limit 1` -- so with two invitations it
-- silently picked the OLDEST, and inserted `business_members` with THAT invitation's `role`.
--
-- Café A invites alice@ on Monday. Café B invites the same address on Tuesday. Alice is told by B
-- to sign up. The client calls this RPC automatically at boot, so she is never asked. She joins
-- **A**, with **A's role**, and the one-business-per-user rule then blocks the membership she
-- actually wanted. No error is raised anywhere.
--
-- ---------------------------------------------------------------------------
-- WHY THE OBVIOUS FIX WAS NOT AVAILABLE, AND WHAT REPLACED IT
--
-- The item said: make the claim NAME which invitation it is claiming. Measured first, per
-- CLAUDE.md's rule that an item's approval does not expire and its facts do:
--
--   ⚠️ THERE IS NO INVITATION LINK AND NO TOKEN. Nothing is ever sent. An invitation is a row keyed
--   on the EMAIL ADDRESS; the owner types an address into the Team card and tells the person out of
--   band. No edge function, no mailer, no token column. The app's own sign-up copy IS the mechanism:
--   "If a café has invited you, use the address they invited and you'll join it automatically."
--
-- So the invitee has no identifier to name, and could not read one either: `business_invites` is
-- owner-scoped by 191's four restrictive policies, so the person the invitation is FOR has no
-- select path to it. "Name the invitation" therefore needs a READ before it needs anything else.
--
-- Hence two halves, and shipping only the first would be a regression -- it would turn "joins the
-- wrong café" into "can join no café at all":
--
--   1. `claim_business_invite(p_invite uuid default null)` REFUSES when it cannot tell. No argument
--      and exactly one pending invitation behaves as before; no argument and MORE THAN ONE returns
--      null without claiming anything. An argument claims that invitation, after checking it is
--      pending and addressed to the caller's own confirmed email.
--   2. `my_pending_invites()` lets the invitee SEE who invited them, so the client can ask.
--
-- ---------------------------------------------------------------------------
-- THE SIGNAL, AND WHY THE RETURN TYPE DID NOT CHANGE
--
-- The obvious move is to make the claim say "ambiguous". It returns `uuid`, and the client's
-- `claimState` maps uuid -> joined, an EXPLICIT null -> nothing to claim, anything else -> unknown
-- (which deliberately changes nothing). Widening that to a composite would have rewritten a
-- three-answer contract that 192 got right and that CLAUDE.md holds up as the pattern.
--
-- So the claim keeps returning uuid-or-null, and the client asks a SECOND question -- `my_pending_
-- invites()` -- only on the non-member path, which is not the hot path and is already the screen
-- that explains itself. Null now means "nothing was claimed", and the count of pending invitations
-- says why: 0 means nobody invited you, 2+ means we will not guess.
--
-- ⚠️ ORDERING, AND THE INTERMEDIATE STATE IS HARMLESS ON PURPOSE (CLAUDE.md: a client change and a
-- migration are ONE change, and the window between them has a real phone in it). This migration may
-- land FIRST. An old cached client calls the argumentless form, gets null for an ambiguous caller,
-- and paints 185's existing "your account has no café" screen -- which is TRUE, merely unhelpful,
-- and strictly better than joining the wrong café. The new client adds the chooser.
--
-- ⚠️ THE 0-ARG FUNCTION MUST BE DROPPED, NOT LEFT ALONGSIDE. `f()` and `f(uuid default null)` are
-- both callable with no arguments, so keeping both makes an old client's argumentless call fail
-- with "function is not unique" (42725) -- which would break the claim for EVERY invitee, not just
-- the ambiguous ones. The drop and the create are in one transaction so no intermediate state has
-- neither.
--
-- ---------------------------------------------------------------------------
-- AND `revoke ... from public` DOES NOT REVOKE `anon` -- QUEUE item 40, closed here
--
-- 20260814_invitations.sql wrote `revoke all on function ... from public` and granted only to
-- `authenticated, service_role`, believing that left `anon` out. It does not: Supabase ships
-- `alter default privileges ... grant execute on functions to anon, authenticated, service_role`,
-- so every function in `public` is BORN with `anon=X`, and revoking the PUBLIC pseudo-role does not
-- touch a grant to the real role `anon`.
--
-- MEASURED on staging out of `pg_proc.proacl`, 9 Sep 2026, before this file ran:
--   claim_business_invite()  {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,...}
--   business_team()          {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,...}
--   create_business(text)    {postgres=X/postgres,authenticated=X/postgres,...}   <- 218 fixed this one
--
-- Neither is a hole -- both refuse an anon caller in their BODY (`auth.uid()` is null) -- which is
-- exactly why it survived: the function was callable-and-raising rather than callable-and-harmful,
-- so nothing looked wrong from any screen. The revokes below name the role, and FOLLOW the creates:
-- placed above, they would run against the old ACL and the fresh default grant would land after,
-- putting `anon` straight back.
--
-- `invite_pending(text)` KEEPS its anon grant and that is deliberate -- it is the app's one
-- intentionally unauthenticated endpoint (QUEUE item 42 retires it separately). Do not "fix" it.
-- `current_business_id()` and `current_business_role()` likewise keep theirs.
--
-- ---------------------------------------------------------------------------
-- ROLLBACK, one transaction, restores 191's behaviour exactly:
--
--   begin;
--     drop function if exists public.my_pending_invites();
--     drop function if exists public.claim_business_invite(uuid);
--     -- then re-run section 4 of supabase/migrations/20260814_invitations.sql verbatim
--     -- (the 0-arg create, its revoke and its grant).
--   commit;
--
-- The rollback is NOT a single statement, and saying so is the point: dropping the new function
-- without restoring the old one leaves the app unable to claim ANY invitation. Re-running 191's
-- section 4 is the second half and it is not optional.
--
-- ---------------------------------------------------------------------------
-- APPLIED
--
--   staging (pboidoxjghntalovzrke): 9 Sep 2026, batch 243, via the Supabase MCP, in one
--   transaction. VERIFIED AS THE CLIENT over PostgREST with the publishable key, signed in as
--   `c@example.com` (the member-of-nothing account, password reset for the rehearsal per
--   STAGING.md's recipe and not recorded anywhere). Nine checks, all measured:
--
--     1. anon POST /rpc/claim_business_invite  -> HTTP 401   (was 400 from the BODY; now the GRANT)
--     2. anon POST /rpc/my_pending_invites     -> HTTP 401
--     3. anon POST /rpc/business_team          -> HTTP 401   (QUEUE item 40's other half)
--     4. TWO pending invitations, argumentless claim -> null, and `current_business_id()` still
--        null: it refused rather than guessing. Under 191's function this joined the OLDER café.
--     5. `my_pending_invites()` returned both, with café NAMES and roles.
--     6. a named claim with an id belonging to no invitation of this caller's -> null, refused.
--     7. a named claim of the INTENDED (newer) invitation -> joined it, and
--        `current_business_role()` returned `staff`, that invitation's own role.
--     8. the COMMON path is unchanged: exactly one pending invitation, argumentless claim, joined
--        it with its role (`owner`).
--     9. replay while already a member -> null, refused, as before.
--
--   ⚠️ THE FIXTURE WAS BUILT SO THE OLD BEHAVIOUR WOULD BE VISIBLE IN THE ROLE, NOT ONLY THE CAFÉ:
--   the older invitation carried `owner` and the newer `staff`, so 191's `limit 1` would have made
--   this account an OWNER of a café that is not the one that asked for them. A fixture whose two
--   candidates agree cannot tell you which one the code read (CLAUDE.md, roster 184(b)).
--
--   Staging was then RESTORED to its documented baseline and re-counted: 4 accounts, 2 businesses,
--   3 memberships, 0 invites, and `c@example.com` a member of nothing again — which STAGING.md
--   requires by name, because it is the only way this project can reproduce 185's silent empty app.
--
--   production (izrnptxhdylllodvglla): NOT YET APPLIED at the time this line was written.
--   Deliberately deferred to the deploy, not forgotten: see the ordering note above — this
--   migration is safe to land before the client, and the record goes in when it happens.
-- ---------------------------------------------------------------------------

begin;

-- 1. THE CLAIM ------------------------------------------------------------
-- Dropped rather than replaced: the signature changes, and the two would be ambiguous together.
drop function if exists public.claim_business_invite();

create or replace function public.claim_business_invite(p_invite uuid default null)
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

  if p_invite is null then
    -- 243: COUNT BEFORE CHOOSING. Two pending invitations to one address is a question only the
    -- person can answer, and it decides their ROLE as well as their café. `limit 1` over an
    -- ordering answered it silently, always in favour of whoever invited them first.
    -- Bounded at 2: the count is only ever compared against 1, and an address invited by fifty
    -- cafés should not make the boot read fifty rows to learn the same thing.
    select count(*) into n
      from (select 1
              from public.business_invites i
             where i.email = em
               and i.accepted_at is null
             limit 2) probe;
    if n <> 1 then
      -- 0 = nobody invited this address. 2+ = we will not guess. Both are "nothing was claimed",
      -- and `my_pending_invites()` is how the client tells the two apart and says so.
      return null;
    end if;

    select i.* into inv
      from public.business_invites i
     where i.email = em
       and i.accepted_at is null
     order by i.created_at, i.id
     limit 1
       for update;
  else
    -- 243: NAMED. Every condition of the blind path is repeated here rather than assumed, because
    -- this argument arrives from the client: the row must still be PENDING and must be addressed to
    -- THIS caller's own confirmed address. An id belonging to somebody else's invitation therefore
    -- finds nothing and refuses, rather than joining a café that never invited this person.
    select i.* into inv
      from public.business_invites i
     where i.id = p_invite
       and i.email = em
       and i.accepted_at is null
     limit 1
       for update;
  end if;

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

-- 2. WHO HAS INVITED ME ---------------------------------------------------
-- The read the invitee never had. `business_invites` is owner-scoped by 191's policies, so the
-- person an invitation is FOR cannot see it -- which is correct for the table and leaves the
-- invitee unable to answer the only question the claim now asks them.
--
-- SECURITY DEFINER, and scoped by the caller's own CONFIRMED address, exactly as the claim is: an
-- unconfirmed account resolves no address and gets nothing, so this cannot be used to discover
-- which cafés invited an address you merely typed into a sign-up form.
--
-- It returns the café NAME, which is the whole point: "Kelly's" and "The Beach Shack" is a choice a
-- person can make, and two uuids is not.
create or replace function public.my_pending_invites()
returns table (invite_id uuid, business_id uuid, business_name text, role text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $fn$
  select i.id, i.business_id, b.name, i.role, i.created_at
    from public.business_invites i
    join public.businesses b on b.id = i.business_id
   where i.accepted_at is null
     and i.email = (select lower(btrim(u.email))
                      from auth.users u
                     where u.id = auth.uid()
                       and u.email_confirmed_at is not null)
   order by i.created_at, i.id;
$fn$;

-- 3. GRANTS ---------------------------------------------------------------
-- AFTER the creates, and naming `anon` explicitly. See the header: a revoke placed above a create
-- runs against the old ACL, and the default privilege then re-grants `anon` on the new function.
revoke all     on function public.claim_business_invite(uuid) from public;
revoke execute on function public.claim_business_invite(uuid) from anon;
grant  execute on function public.claim_business_invite(uuid) to authenticated, service_role;

revoke all     on function public.my_pending_invites() from public;
revoke execute on function public.my_pending_invites() from anon;
grant  execute on function public.my_pending_invites() to authenticated, service_role;

-- QUEUE item 40's other half. `business_team()` is NOT redefined here -- only its grant is
-- corrected -- so this revoke runs against the ACL the function already has and nothing re-grants
-- it afterwards.
revoke execute on function public.business_team() from anon;

commit;
