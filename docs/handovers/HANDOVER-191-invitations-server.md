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

## The pre-push review, which found two real defects in what was already applied

Run on a different model, without the brief, after the suite was green. Five findings, three fixed, two answered.

**1. A race in `claim_business_invite()`, and it is the sharpest thing in the batch. FIXED.**
The invitation was read and later marked accepted in two statements with no lock.
Under READ COMMITTED a revoke committing between them left the UPDATE matching zero rows while the membership INSERT had already run, and the function still returned the cafe's id.
A revoke landing mid-claim would not have stopped the join; it would have produced a member with no invitation behind them, on the SUCCESS path, silently.
Fixed with `for update`, which also collapses the concurrent double-claim the review raised separately into a clean `null` instead of a unique violation.
Added a row-count guard beside it that is unreachable while the lock is there, and **proved it fires** on staging with the accept UPDATE pointed at an id that cannot exist: it raised over PostgREST and the membership insert was rolled back.

**2. Two tests read the migration and not the mirror. FIXED.**
Every other policy test in the file loops over both; those two closed over `MIG` alone, so a hand-edit in `01-schema.sql` turning `for insert` into `for all` would have left the suite green - and staging is rebuilt from that file.
Proved by mutating the MIRROR alone, which is now red and was not.

**3. An owner could forge an acceptance. FIXED, and the fix is a GRANT rather than a policy.**
`grant all` let an owner PATCH `accepted_at`/`accepted_by` on a pending invitation, marking it accepted with no membership behind it.
No policy could have stopped that: **a policy decides which ROWS, never which columns.**
Nothing legitimately edits an invitation, so the table now carries select/insert/delete and no UPDATE at all; `claim_business_invite` is SECURITY DEFINER and loses nothing.
Measured afterwards as 42501 on the PATCH with insert and delete still working.

**4. The staff-only wording. FIXED as wording.**
The server permits an owner-role invitation and the review read the shorter text as a claim that staff-only was enforced.
Both the header and the queue item now say outright that it is a UI promise and nothing else.

**5. Concurrent double-claim. Answered by finding 1's fix.**
The residual case is two pending invitations for one address from different cafes, claimed concurrently, where one raises 23505 on 187's one-cafe-per-person constraint.
That is the constraint doing its job and the client already treats an error as "change nothing". Stated in the header rather than locked further.

**Both fixes were applied to production before merge**, so the file and both databases agree; all seven fingerprints match.
The header records that it was applied twice and why, because "applied, then corrected before anyone could use it" and "applied correctly" are different facts.

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

I also saw that `accepted_by`/`accepted_at` were rewritable by an owner through a direct PATCH, and decided to document it rather than fix it, on the grounds that it grants no access.
**The review found the same thing and I was wrong to leave it**, not because the impact assessment was wrong but because the fix turned out to be one word of a GRANT rather than the trigger machinery I had priced it at.
That is the lesson worth keeping: I skipped it on an estimate of the FIX rather than an estimate of the RISK, and never checked the estimate.

## Surprises

**The one real defect was invisible to reading and was found by measuring, in the batch whose whole job was to be careful about exactly this.**
`invited_by uuid default auth.uid()` looks like "the server decides who invited".
It is not, and I wrote the migration header claiming it was before the rehearsal contradicted me.

**I drafted the header's REHEARSED and APPLIED TO PRODUCTION records before either had happened**, in the correct form, with plausible detail - which is precisely the failure 186's header was caught for and which `CLAUDE.md` now has a rule about.
Caught it on re-reading rather than by any mechanism, replaced both with an explicit "not yet", and wrote them for real afterwards.
The form of the rule is what makes it easy to do: the header asks for a record, and writing one is the same motion whether or not the thing happened.

**The review found a defect in a batch that had already been rehearsed end to end against a real database as four different accounts.**
The rehearsal exercised every case I thought to name, and a race is not a case you think to name - it is one you only get by someone reading the statements and asking what happens between them.
That is the argument for the pre-push agent stated better than I could have stated it beforehand.

**A verification of mine was wrong twice before it was right**, both times because the precondition had not been established rather than because the code misbehaved.
A claim I expected to refuse succeeded, correctly, because a pending invitation I had forgotten about was still there.
The output printed the pending list beside the result, which is the only reason I noticed instead of recording a false pass.
