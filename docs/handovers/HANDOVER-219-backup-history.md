# HANDOVER - 219 (the backup carries all five history series)

**Branch:** `batch-219-backup-history` · **Scope:** `docs/QUEUE.md` item 5a, the backup not carrying three of the five history series.
**Shipped `ezplate-v179`.**

## What changed

The backup file carries all five history series, not three.
`price_history` (284 rows on production) and `menu_price_history` (143) were in neither the export nor `restore_backup`'s deletes, so a restore after a total loss returned a working app with a flat trend chart, no per-menu food cost and no sell-price history, and raised nothing.
`buildBackup` gains `price_history`, `menu_history` and `menu_price_log`, plus the three live settings the export never carried (`ai_invoice_check`, `ai_suggestions`, `last_invoice_import`), and the stamp moves 3 to 4.
`parseBackupFile` accepts 2, 3 and 4, and type-checks the new groups only when present, so Max's real format-3 export stays restorable.
`backupToPayload` sends wire format 4 only when there is a history point to carry, extending the existing `chg.length?3:2` ladder.
`20260829_restore_backup_v5.sql` adds two additive inserts with their columns named, and is applied to staging and production.
The Settings copy under Export now says the file carries your price history, because it does.

Rode one C item from `docs/MAINTENANCE.md`: `restore_backup` is now proven inert for `anon` rather than reasoned to be.

## Review

The pre-push `code-review` agent, run on Sonnet against a batch running on Opus, without the brief.
**It found a production security regression that the full suite, the mutation gate, Playwright, the smoke check and a complete staging rehearsal all missed.**

The first draft of v5 was built by copying the function body out of `20260813_semantic_keys.sql`, and silently reverted batch 187's owner-only guard, which `20260814_roles_part1.sql` had added the day after.
`create or replace function` replaces the whole body, so the guard was deleted by omission with no diff anywhere showing a deletion.
The shipped function let any signed-in staff account wipe and replace the whole catalogue, and it had already reached staging **and production** before the review ran, because the migration procedure applies before the review.

Fixed in the same branch.
Both projects now return the same `md5(pg_get_functiondef(...))` and answer `guard_before_first_delete` true.
Verified as the client over PostgREST: a staff account is refused `P0001` on a populated payload **and** on an empty-groups one, which is the shape that reaches the deletes without raising on an insert; the owner's restore still returns 200 with the dedup intact.
`tests/roles.test.js` now reads whichever migration last defines the function instead of a hardcoded path, and three hand-run mutations were confirmed red.
The agent's second finding, a client comment claiming the server refuses a non-owner, was true before the branch and is true again now the guard is back; it needed no edit.
Full findings verbatim in `docs/reviews/REVIEW-219-backup-history.md`.

## Into CLAUDE.md

Added, under standing authority, and reported here rather than parked:

- **A new Tier 1 section: `create or replace function` replaces the WHOLE body, so copying one forward from the wrong ancestor deletes guards by omission.** Find the newest definition by listing the directory, never the one an item, a comment or your memory names. It carries the corollary that a migration file is a historical record, so a test pinned to one by name pins what was true on the day it ran, and the corollary that a rehearsal must sign in AS the role a guard names.
- `docs/STAGING.md` step 2 gains the same instruction at the point where a body actually gets copied, plus the 219 rehearsal record and a corrected Current state.
- `docs/MAINTENANCE.md`: the anon-inertness item struck as done, with the note that the gate review's conclusion held and its stated mechanism did not.

## New docs/QUEUE.md items

None.
Item 5a is deleted, and 5b's `Do after:` line is deleted because it is now satisfied.

## New docs/PHONE.md items

None.
Nothing here needs a device: the export was driven in a real browser and the restore is a server function.

## Probe

**What did the queue item tell you to do that you would have done differently?**
It said *"Start from v4, not from `20260806_restore_backup_v3.sql`"*, and naming a specific ancestor is what caused the owner-guard regression.
That advice was correct when written on 12 Aug and falsified 36 hours later by batch 187, and nothing could notice.
`CLAUDE.md` already says a queued item's approval does not expire and its facts do; I checked the item's other claims against the code and did not check that one, because it read as a warning rather than as a fact.
**A queue item should never name the file to copy a function from.** The new rule says to list the directory instead, and that is the durable form of this answer.

The item also said to reload seed `03`/`04` before rehearsing.
I did not, deliberately: the two tables the migration is about already held 264 and 602 rows, 35 of them with a NULL `menu_id`, which is the exact case the new dedup exists for, and a seed would have replaced real accumulated rows with generated ones and proved less.
That is recorded in the migration header and in `docs/STAGING.md`.

**What did you not propose because it was out of scope?**
The `menu_price_log` memory window is 60 points per dish while `price_history` and `menu_history` keep 500, so a very long-lived dish exports a shorter sell-price series than the server holds.
It is not a defect - the restore is additive, so the server keeps the rest - but the asymmetry is undocumented and I left it alone.
Also: `restore_backup` now returns ten counts and the client reports none of them to the user; the confirm still describes what will happen rather than what did.

## Surprises

The staging rehearsal was thorough and still could not have caught the real defect, because it exercised `anon` and the owner and never a signed-in staff member.
The one role the guard exists for was the one role never tried, and the batch had no reason to try it, because the batch did not know the guard existed.

The mirror test in `tests/semantic-keys.test.js` compares `01-schema.sql` against the newest migration defining the function.
It passed throughout, because after my change the newest migration was mine: the mirror and the migration agreed with each other about a body that was wrong.
**Two artefacts agreeing is not evidence when one was copied from the other.**

Section 6 of `tests/restore.test.js` had been pinning a superseded migration since batch 183, sixteen days, with a comment at that exact spot saying *"if a later batch replaces the function again, move this path with it."*
I found and fixed that one while writing the batch, and then made the identical mistake in `tests/roles.test.js`, which I never opened.
