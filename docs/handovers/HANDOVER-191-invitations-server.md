# HANDOVER - 191 (invitations, the server half)

**Branch:** `feature/roles-invitations-server` · **Scope:** queue item 1, "Roles - invitations, so an owner can add someone", shape B. Server half only. **Shipped no deploy version** - no client asset changed, so `sw.js` stays at `ezplate-v164`.

## What changed

An owner can create an invitation, and only the invited address can turn it into a membership.
Nothing in the app reaches any of it yet; the client half is queue item 1 and this is the same order 187 and 182 used.

`business_invites` is owner-only across all four commands, in four restrictive policies rather than one.
Staff cannot see the table at all, which was measured rather than assumed: a staff GET returned `[]` while the row was demonstrably there, a POST was refused 42501 by name, and a DELETE returned HTTP 200 having changed nothing.

`claim_business_invite()` takes NO argument, and that is the whole of its security.
It reads the caller's address from `auth.uid()`, so there is nothing to aim at somebody else's invitation.

`invite_pending(email)` is the gate the sign-up form will ask before calling `signUp`, and `business_team()` is how the Team card will ever name anybody, because `auth.users` is unreadable by every client role.

**The split was for size and is a stop condition, not a preference.**
The remaining work is a Team card rebuild, a sign-up form on two screens, the `tests/auth.test.js` rewrite and Playwright, which is a second PR's worth.

**The design decision worth carrying forward: no trigger on `auth.users`.**
That is the documented Supabase pattern and it was written first, then rejected by walking the cases.
A sign-up trigger only ever fires for a person who has NO account, and the person an owner invites may already have one - every account this project has ever had was made by hand in the dashboard.
A claim covers both cases with one mechanism, at the moment the tenant gate already discovers there is no cafe, and it cannot break sign-up or email confirmation the way a failing trigger in the auth schema can.

## Into CLAUDE.md

**Nothing new, and that is a deliberate answer rather than an empty one.**
The one defect this batch found is already law there, in the DEFAULT-versus-BEFORE-trigger section: `invited_by` carried only `default auth.uid()`, and an owner POSTing an explicit `"invited_by":"<another user>"` had it stored verbatim, because a DEFAULT fires only when the column is ABSENT from the INSERT.
That is 182's law read in the other direction, and the existing text already says the remedy is a trigger.
What was missing was not a rule but an instance of it, so the measurement went to `docs/STAGING.md` where the other rehearsal findings live.

`docs/STAGING.md` gained two things: the 191 rehearsal record, and a warning at the accounts table that `c@example.com` is the one account a rehearsal can CONSUME.
Claiming an invitation makes it a member, and "a member of nothing" is the only way this project can reproduce 185's silent-empty-app case.
It was put back.

## New docs/QUEUE.md items

**A new café cannot be CREATED at all** - new item, tier A, inserted at position 2.
Found by reading the policy list, not by hitting it: `businesses` and `business_members` each carry exactly ONE policy, SELECT, authenticated.
No client role may insert into either, so invitations add people to a café that already exists and nothing anywhere creates one.
Every founding row in this project was made by hand in the dashboard, which is the sentence item 1 exists to delete, one level up.
The item names the trap as well: widening the policies is the wrong fix, because an INSERT policy on `business_members` lets any account write itself into any business id it can name.

Item 1 was rewritten as the client half and carries what this batch leaves it, including the two assertions in `tests/roles-client.test.js` it must deliberately change rather than trip over.

The gate-review item gained `invite_pending` as a fifth thing to read.
It is the only unauthenticated endpoint this app has deliberately shipped, nothing here rate-limits it, and the disclosure argument is in the migration header where it can be disagreed with.

## New docs/PHONE.md items

None.
Nothing a user can reach changed, so there is nothing a device could settle that a database cannot.

## Probe

**What did the queue item tell you to do that you would have done differently?**

Two things.

The item framed shape B as "invite first, then a gated sign-up", which reads as a sign-up feature.
Built that way it would have served nobody who already has an account, and today that is everybody in this project including Max.
The claim is the mechanism that makes B work for both, and it is not what the wording implied.

The item also carried, from 188, the correction that the hard part was "the client has no way to turn an email into a `user_id`".
That is still true and still not the hard part.
Nothing in this batch needs to turn an email into a `user_id` at all: the invitation is keyed by ADDRESS and the account resolves itself at claim time, which removes the disclosure surface that paragraph was worried about rather than managing it.

**What did you not propose because it was out of scope?**

An owner cannot remove a member or change a role - only invite, and revoke a pending invitation.
That is stated in the item now rather than left implied, because it is the obvious next question a Team card raises and it needs its own policy work.

`accepted_by` and `accepted_at` can be rewritten by an owner through a direct PATCH, unlike `invited_by`, which the trigger freezes.
It costs nothing today - only `claim_business_invite()` creates a membership, so falsifying those columns neuters an invitation rather than granting anything - and freezing them would have meant a second freeze branch for a column nothing reads for authorisation.
Written down here rather than fixed, because the reasoning is what a later reader needs.

## Surprises

**The one real defect was invisible to reading and was found by measuring, in the batch whose whole job was to be careful about exactly this.**
`invited_by uuid default auth.uid()` looks like "the server decides who invited".
It is not, and I wrote the migration header claiming it was before the rehearsal contradicted me.

**I drafted the header's REHEARSED and APPLIED TO PRODUCTION records before either had happened**, in the correct form, with plausible detail - which is precisely the failure 186's header was caught for and which `CLAUDE.md` now has a rule about.
Caught it on re-reading rather than by any mechanism, replaced both with an explicit "not yet", and wrote them for real afterwards.
The form of the rule is what makes it easy to do: the header asks for a record, and writing one is the same motion whether or not the thing happened.

**A verification of mine was wrong twice before it was right**, both times because the precondition had not been established rather than because the code misbehaved.
A claim I expected to refuse succeeded, correctly, because a pending invitation I had forgotten about was still there.
The output printed the pending list beside the result, which is the only reason I noticed instead of recording a false pass.
