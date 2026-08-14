# HANDOVER - 192 (invitations, the client half)

**Branch:** `feature/invitations-client` · **Scope:** `docs/QUEUE.md` item 1, "Invitations - the CLIENT half".
Shipped `ezplate-v165`.

## What changed

An owner can add somebody to their cafe without opening the Supabase dashboard, and that person can get in.
191 built all of the server for this and none of it was reachable from the app; this is the reaching.

- **The claim runs at the tenant gate.** `bootstrapSync` already discovers "this account is a member of nothing", which is exactly the population an invitation is for, so that is where `claim_business_invite()` is called.
  An invited person opens the app and lands in the cafe with no button to press and no reload.
- **Three answers, resolved like every other one in this app.** A uuid re-syncs, a null paints 185's screen exactly as before, an error changes nothing.
  A re-entrancy latch makes the re-sync provably terminate.
- **The Team card is real.** It lists the members from `business_team()`, lists pending invitations, sends one, revokes one.
  Owner-only, resolved in `applyRoleUi`, hidden from staff as one block.
- **A sign-up form on the boot gate**, gated by `invite_pending` before `signUp` so an uninvited address never creates an account.
  It is a second form rather than a mode of the sign-in one, because `new-password` and `current-password` tell a password manager opposite things.
- **`tests/auth.test.js`'s `!/signUp\s*\(/` assertion was rewritten to the CONDITION, not deleted**, as the item required.
  It is behavioural now: four cases prove an uninvited address, an unreadable gate and a non-boolean all fail to reach `signUp`.

## The pre-push review

Run on a different model, without the brief, as required.
**Three findings, all three real, all three fixed in this branch.**
It found no critical defect and said so; these are the two genuine gaps and the nit.

1. **`applyRoleUi`'s guard was false for the exact case its comment claimed to cover.**
   The condition was `teamData.status!=='idle'` with a comment reading "once the Account screen has opened it once, the state is no longer idle".
   That is true for an owner and false for staff, because `loadTeam` RESETS the state to idle for a staff caller.
   Promote a staff account while they are looking at the Account screen, let an `online` blip re-sync, and the block is unhidden while the fetch is skipped: an empty card for the person who just gained the right to see it.
   Fixed by asking the question that was actually meant - is the pane on screen - OR the state is not idle. Both halves are load-bearing.
2. **`loadTeam` had no request-ordering guard**, and the review pointed out the precedent is already a rule in `CLAUDE.md`: `gemToken`, in the invoice referee.
   Three triggers can overlap, and two reads resolving out of order let an invitation the owner just revoked reappear as pending.
   Fixed with a generation token, checked above BOTH writes so a stale error cannot replace good data either.
3. **`#bgAltIn` was the one boot-gate toggle shipping without `hidden`.**
   Harmless today only because every path runs `hideForms()` first, which is a claim about two other functions rather than about the element. Added.

Both code fixes have a test, and **both tests were mutated to confirm they fail without the fix** - the generation check deleted turns two red, the reverted guard turns one red.

## The check that was skipped, and the gate that now prevents it

**CI went red on `smoke (jsdom)` after the PR opened.**
The Account-cards contract - which cards may carry controls - is asserted in **three** places, and `tests/smoke.js` is the only one outside `npm test`.
Two were moved, `npm test` was green, the mutation gate was green, 326 Playwright specs were green, and the third went red on push.

**174 did exactly this, on exactly this assertion, and left a warning inside `tests/smoke.js` saying it would happen again.**
It did not help, because a comment in a file is only readable by somebody already opening the file they are about to break.

So the fix is not a fourth comment:

- **`.githooks/pre-push` now runs `npm run smoke`** as check 2 of 3. It takes 8 seconds. The hook was `npm test` + the mutation gate, which is not a local copy of CI - CI runs smoke as its own job, so this whole class could only ever be caught after pushing.
- **The `verify` skill's pre-PR list says `npm run smoke` ALWAYS**, not "if anything renders", with the two-incident count as the reason.

Both are process files, so both were edited rather than proposed, per `CLAUDE.md`'s standing authority.
Nothing was pushed with `--no-verify`.

## Into CLAUDE.md

Nothing.
No new durable rule was found: every trap this batch hit was already written down and every one of them fired.
The `[hidden]` corollary, the DEFAULT-vs-trigger law, the silent 200-with-no-rows, the three-answer discipline and the twenty-incident test roster were all load-bearing here, and the batch is evidence they work rather than evidence they need amending.

## New docs/QUEUE.md items

None.
The finished item is deleted.

**Two things were found and routed elsewhere rather than queued:**

- `tests/visual/screenshots.spec.js` still fails 13 ways for one cause, unchanged since 186.
  It is already recorded in `docs/MAINTENANCE.md` by batch 190 and the entry is accurate, so nothing was added.
- The Team card cannot REMOVE a member or change a role, only invite and revoke a pending invitation.
  191's header already states this is a deliberate omission and not required to close the launch blocker.
  It is not queued because nobody has asked for it; it becomes an item the first time somebody leaves.

**Audit counter:** newest audit is `AUDIT-v156`, this batch shipped `ezplate-v165`, so the gap is **9**.
The trigger is 10, so `project-audit` is NOT queued here - **the next batch to ship a client asset will hit it and must queue the audit above every unblocked item.**

## New docs/PHONE.md items

Six, under "192 - the sign-up form, and inviting a real second person".
The two that only a phone can settle: whether the sign-up field makes a password manager OFFER TO GENERATE rather than autofill the saved EzPlate password (a desktop browser cannot show this, and it is the entire reason sign-up is a separate form), and whether the on-screen keyboard covers "Create account" on a form one control taller than the sign-in one 186 already passed.
The rest need a second human, and the sharpest failure to watch for is the invited person seeing "This account isn't linked to a cafe yet", which usually means a typo in the address rather than a bug.

## Probe

**What did the queue item tell you to do that you would have done differently?**

One thing, and it was a wording call rather than a disagreement.
The item describes "a gated sign-up form on two screens", which reads as the boot gate and the Account screen.
It shipped on the boot gate only.
Since 186 a signed-out browser sees nothing but the gate, so the Account card's sign-in form is already behind a screen nobody can reach, and a sign-up there would be a control that cannot be arrived at plus a second copy of a flow whose whole risk is that it is rarely driven.
The item's own sizing paragraph is what said "two screens", not its requirements, so this is not a departure from anything it asked for.

**What did you not propose because it was out of scope?**

The Account screen's unreachable sign-in form itself.
It has been dead since 186 and this batch worked directly beside it twice.
Deleting it is a real change with a real argument on both sides (it is the natural home for a future signed-in "change password"), and it is not this item's, so it was left alone and is not queued either.

## Surprises

**Three, and all three were caught by running things rather than by reading them.**

- **`claimState` was written wrong first, in the way this codebase keeps writing wrong.**
  `res.data ? 'joined' : 'none'` reads correctly and collapses two different unknowns: an absent body became a DEFINITE "nothing to claim", and any truthy non-string would have triggered the re-sync.
  Its own test caught it within a minute of being written.
  The lesson is already in `CLAUDE.md` twice over, which is why nothing was added there.

- **A brand-new Playwright spec named "the latch, driven rather than read" passed with the latch DELETED.**
  In the ordinary fixture a successful claim makes the re-sync succeed, so the nested run never reaches the claim branch and the latch is never consulted.
  The name claimed a guarantee the assertions could not give.
  Found by hand-mutating a spec written that hour, which is exactly what the 190 entry argues for.
  Fixed by adding the fixture state that does consult it - a claim that keeps saying "joined" while the tenant keeps saying "no cafe" - and the rewritten spec now hangs for 35 seconds and fails without the latch.

- **The mutation gate found six survivors in the new code**, including one real defect rather than a missing assertion: flipping `!SUPA || !SUPA.rpc` to `&&` made a null client raise a TypeError BEFORE the try block, which `authSubmit` does not catch, leaving the button disabled forever on an unconfigured device.
  All six are killed.

**And one non-surprise worth recording because it was checked rather than assumed:** the real production `invite_pending` was driven from a real browser with an uninvited address.
It returned false, the refusal rendered, and no account was created - which is also the only proof available that the RPC signature matches production, since nothing else in the suite talks to it.

**A process note, because it cost twenty minutes and could have cost the batch.**
`git stash` was used mid-batch to check whether a Playwright failure also failed on `main`, and the command that would have popped it timed out and was killed - leaving every tracked change sitting in `stash@{0}` and the working tree back at `main`, with only the two new untracked files still present.
Nothing was lost, and it recovered cleanly with `git stash pop`.
`CLAUDE.md` already warns that `git checkout --` restores nothing when a pathspec is unknown; this is the same family and the same remedy applies.
**To compare against `main` mid-batch, use the maintenance worktree that already exists, not a stash of live work.**
It is not proposed as a new rule because the existing one covers the principle, and a second near-identical warning would dilute it.
