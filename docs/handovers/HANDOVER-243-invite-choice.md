# HANDOVER - 243 (invite choice)

**Branch:** `batch-243-invite-choice` · **Scope:** `docs/QUEUE.md` item 14, plus item 40 riding its migration.
**Deploy version: `ezplate-v200`.** Migration `20260909_invite_choice.sql` applied to staging AND production.

## What changed

An account invited by two cafés is now asked which one, instead of being joined to the older one silently.
`claim_business_invite` used to take `limit 1` over `order by created_at`, which chose the café AND the role.
It refuses when it cannot tell, and `my_pending_invites()` plus a chooser on the non-member gate is how the person answers.
`claim_business_invite`, `business_team` and the new `my_pending_invites` are no longer callable by `anon`, which closes item 40.

## Review

The `code-review` agent, on Sonnet, without the queue item.
Report and disposition in `docs/reviews/REVIEW-243-invite-choice.md`.
**Six findings, all fixed, none declined.** Two were majors and both were mine.

**Finding 1.** `invitesOf` returned `[]` for both "no invitations" and "could not tell", so the recheck after a failed join emptied a chooser somebody was reading.
That recheck runs on exactly the flaky connection that made the join fail.
It matters more than it sounds because 187 makes membership one café per person with no way to leave, so somebody who concludes the invitation never arrived and creates their own café cannot undo it.
Reproduced against the real function before fixing: the two answers printed byte-identically.
`invitesOf` now returns `null` for could-not-tell and `applyPendingInvites` is the single writer.

**Finding 2, and the one I am most glad of.** `tests/invites.test.js` read `20260814_invitations.sql` at a hardcoded path, so the test titled *"claim_business_invite takes NO argument, that is the whole of its security"* stayed green while asserting against dead code.
That is roster entry 219, in the file whose own docstring names that property, in a batch whose migration header cites 219 as the reason to list the directory.
It now resolves the newest definition by listing the directory, and states the property that is now true.

**Findings 3 to 6:** the schema mirror re-run, the two docs struck, the TOCTOU between the ambiguity probe and the row pick collapsed into one locking statement, and the double-submit widened to every row.

**Two corrections to the findings, both recorded in the artifact.**
Finding 2's implied remedy is the wrong resolver for a grant: `business_team` is defined by one migration and revoked by another, so looking where a function is defined finds no revoke and reports a hole that is not there.
The assertion is an ordering instead.
Finding 5 was filed MINOR and was worth more, because "count before choosing" is the migration's stated correctness mechanism and a two-statement version of it restores the guess.

## Into CLAUDE.md

Nothing.
Every rule this batch leaned on was already written: 219 on finding the newest definition, the `anon` grant mechanism, the three-value discipline, "a done-mark is not a strike".
The batch is evidence they are load-bearing, not evidence they need changing, and adding a bullet per instance is what the roster's own header warns against.

## New docs/QUEUE.md items

None.
Item 14 is deleted from `docs/QUEUE.md`; it lived only there, so there is nothing to strike in the consolidated backlog.
**Item 40 is struck** in `docs/QUEUE-2026-09-08-CONSOLIDATED.md` and its `docs/MAINTENANCE.md` entry, both with the measurement and both keeping their bodies unstruck, because the mechanism and the four functions that must NOT be swept up with these two are what a future reader needs.
The blind-audit preamble records that 14 ran and was true, leaving 15 as the only unmeasured claim of the four.

## New docs/PHONE.md items

None.
The chooser is a gate screen and the gate is already covered by the Playwright specs; what cannot be exercised anywhere is the two-invitation case itself, which needs a second café and is item 29's job.

## Probe

**What did the item tell you to do that you would have done differently?**
Its remedy, and the investigation is the reason this batch is shaped as it is.
The item said *"the claim names which invitation it is claiming"*, which assumes the invitee has an identifier.
They do not: there is no invitation link, no token, and nothing is ever sent, and they cannot read their own pending invitations either because `business_invites` is owner-scoped.
So half the remedy did not exist, and shipping only the refusal would have turned "joins the wrong café" into "can join no café at all".
The item was rewritten before any code, in its own commit, and that rewrite is the durable output of the investigation.
This is the third of the four blind-audit items to be right in substance and wrong in a stated detail.

**What did you not propose because it was out of scope?**
Invitation emails.
Every problem in this item would be smaller if an invitation arrived as a link, and that is a new capability rather than a wiring change, so it is not something to slip into a batch about a `limit 1`.
I also left `invite_pending`'s `anon` grant alone, which is deliberate and is now asserted so a later tidy cannot sweep it up, and did not touch the four other functions the Supabase linter names for the same class.

## Surprises

**An invitation is not a thing you send, it is a row keyed on an address.**
The whole flow is the owner typing an email and telling the person out of band, and the app's sign-up copy is the entire mechanism: *"use the address they invited and you'll join it automatically."*
Nothing in the item hinted at that, and it is the fact the remedy turned on.

**Production had one pending invitation**, which is the single-invitation case, so nobody there can reach the ambiguous path today.
That is what made landing the migration ahead of the client uneventful rather than merely safe in principle.

**`Object.assign` copies a getter's VALUE, not the accessor.**
A stub node built with a get/set pair inside an object literal silently became a plain data property holding `''`, so a test failed for a reason with nothing to do with the app.

**`boot-gate.test.js` had no `bgSignUpForm` or `bgDone` node**, so 192's guard protecting a half-typed sign-up was reading two nulls and could not fire in any test in the file.
That is the same hole 209 recorded in that file, a third time, found while adding a fix two lines from it.

**The staging rehearsal had to be run twice**, because the review's TOCTOU fix changed the SQL and a rehearsal of superseded SQL proves nothing.
`c@example.com` was joined to a café twice and restored to a member of nothing both times, which `docs/STAGING.md` requires by name.
