# HANDOVER - 218 (café creation: the rehearsal, and the grant that was never there)

**Branch:** `feature/cafe-creation` · **Scope:** `docs/QUEUE.md` item 1, resumed.
Batch 209 built it and could not rehearse it, because staging was paused.
Max restored staging on 29 Aug 2026, so this batch ran `docs/STAGING.md` steps 2-7, applied the migration to production, and merged.
**Ships `ezplate-v178`**, re-bumped from the `v172` the PR claimed, which batch 210 had since taken.

## What changed

A stranger can now create an account and name their own café, unattended, with no Supabase dashboard involved.
That was the last hole in the signup story and the item was an A-tier launch blocker.
`create_business(text)` is on production, verified as the anon client and as `postgres`.
Scoopy's data was measured before and after and is untouched: 415 products, 98 plates, 3 menus, 134 dishes.

## Review

The pre-push `code-review` agent, on **Sonnet** against a batch running on **Opus 5**, without the item.
Artifact: `docs/reviews/REVIEW-218-cafe-creation-rehearsal.md`.
This is the branch's **second** artifact and the reviewer is the reason it exists.

**Finding 1, the unicode unit mismatch. Accepted, reproduced, filed rather than fixed.**
`node '😀'.repeat(31).length` is 62 and `psql length(repeat('😀',31))` is 31, so the client counts UTF-16 code units and the server counts codepoints.
The three "60"s in this feature are not all the same unit, which the equality test written earlier the same day cannot see.
It is not fixed because the client is the STRICTER side, so it can only ever produce a false refusal, never a bad stored name.
And the obvious fix moves the mismatch rather than closing it: counting codepoints in `cafeNameProblem` leaves `maxlength` as the sole binding constraint, still UTF-16 and still silent, because HTML `maxlength` has no codepoint form.
Closing it properly means dropping `maxlength` and giving up a native affordance, which is a real trade and belongs to whoever next opens this form.
What shipped instead is the assertion that was missing: the client may refuse more than the server and must never accept more, over a spread of astral lengths.
Confirmed red by widening the client's bound.

**Finding 2 was about the review mechanism itself, and it was right.**
This branch was reviewed at `ff379e1` in batch 209, parked, then grew a security-relevant `revoke` statement in this batch, and the artifact gate stayed satisfied the whole time because it accepts any ANCESTOR.
That is inherent to naming an ancestor, which is deliberate: requiring the exact tip is unsatisfiable, since a review's own findings get fixed and each fix is a commit.
The transferable half is recorded in the artifact rather than turned into a rule: a batch that resumes a parked branch owes that branch a second artifact, and the gate cannot ask for one.

Everything else in the report was "checked and found correct" and is not contested.

## Into CLAUDE.md

**One new Tier 1 section, written and merged under the standing authority of 13 Aug 2026.**
*"`revoke … from public` DOES NOT REVOKE `anon`, and every migration in this repo is written as if it does."*

Supabase ships `alter default privileges in schema public grant execute on functions to anon, authenticated, service_role`, so every new function in `public` is born with `anon=X` in its ACL.
`revoke all … from public` revokes the PUBLIC pseudo-role, which is a different thing, and omitting `anon` from your own grant cannot decline a privilege you never gave.
The measured tell is which error you get: `P0001` from the body means the grant did nothing, `42501` means it held.
Both are refusals, which is why this survives a review and a green suite.

## New docs/QUEUE.md items

None. Item 1 is deleted, per the loop's own rule that git and the handover are the record.

Three findings went to `docs/MAINTENANCE.md` instead, none of which passes the tier test:

- `claim_business_invite()` and `business_team()` carry the identical grant gap. Both are refused by their bodies and neither is a hole. Not fixed here because a migration should not quietly re-grant functions this item does not own; Supabase's own `get_advisors('security')` lint `0028` is the cheapest way to re-check it, and it names six functions of which only these two are the entry.
- Supabase's leaked-password protection is OFF and sign-up is now public. A dashboard toggle, so Max's. `docs/GATE-REVIEW.md` did not cover it, because the bullet naming it existed only on this unmerged branch when batch 210 ran.
- The unicode unit mismatch above.

## New docs/PHONE.md items

None.
The screen was driven in a real browser against staging in both themes, and its Playwright spec already covers 380px in both themes with tap-target assertions.
Nothing here needs a device to settle.

## Probe

**What did the queue item tell you to do that you would have done differently?**
Nothing about the work, and one thing about the file it pointed at.
The item said the branch was built and reviewed and not to do it again, and that was correct and saved the batch.
But the migration's own header carried two records written BEFORE anything ran: a `REHEARSED: staging …, 27 Aug 2026` line for a rehearsal that never happened, and a citation to a record that did not exist below it.
A reader skimming for "was this rehearsed" would have found a date and a project ref.
That is exactly what 186's rule forbids, and the queue item was more honest than the file it described.
Both are corrected in place with the original text quoted, and the lesson is written at the site: **if an application is deferred, the header has to say deferred, with the reason.**

**What did you not propose because it was out of scope?**
Fixing the two sibling functions' grants in the same migration.
It is two lines and I had the rehearsal set up, which is exactly the argument that makes scope creep feel free.
They are refused by their bodies, nothing is at risk, and a migration that re-grants functions its item was not sent to touch is the shape this repo's rules exist to stop.
Also not proposed: dropping `invite_pending`, which now has no caller at all. That order is already argued in the migration and owned by `docs/GATE-REVIEW.md`'s residuals.

## Surprises

**Step 3 of the staging procedure did not apply, and saying why is worth more than following it.**
The case this migration is about is an AUTH state, a confirmed account belonging to no café, not a data shape, and a seed does not touch `auth.users`.
`c@example.com` already was that state. Loading a seed would have churned 500 rows and proved nothing about the function.
Read step 3 as "make sure the case exists", not as "always run a seed".

**Proving a guard fires took two attempts and the first proved something else.**
The owner assertion is unreachable while `set_member_role` is correct, so it had to be mutated.
Disabling the trigger does not reach the assertion at all: the trigger is the only thing that sets `role`, so the insert dies on the NOT NULL constraint first with `23502`.
The assertion guards a trigger that is present and WRONG, so the mutation had to be one returning `'staff'`.
It then raised, named the café, and rolled the already-inserted business row back.
**Mutate the thing the guard is actually about, or you have tested a different failure.**

**Step 2 was satisfied by measurement for the third batch running, and it should now simply be the way it is done.**
All seven fingerprints were diffed against production before anything ran and came back identical, which proves the mirror is current far better than re-running a 54KB file and assuming it worked.

**The browser drive found the app's own blank-name message is shadowed by `required` on the input.**
A truly empty field is stopped by the browser's native validation, so `cafeNameProblem`'s blank branch is only reachable via whitespace, which `required` accepts.
That is a sensible layering rather than a defect, and the Playwright spec that names it fills four spaces rather than an empty string, so it is not passing for the wrong reason.
