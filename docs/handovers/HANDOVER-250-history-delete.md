# HANDOVER - 250 (staff could delete the café's food-cost history)

**Branch:** `250-history-point` · **Scope:** `docs/QUEUE.md` item 89, **split** - this batch ships the server half.
**Deploy version shipped: NONE.** No client asset changed, so no cache bump. The change is a migration, applied to staging and production on 10 Sep 2026.

## What changed

Deleting a food-cost history point is an OWNER-ONLY action now, on both series, and possible at all on one of them.

**Scoping the item turned up a hole rather than a gap.** Measured on production before anything ran:

- **`price_history`** had `GRANT DELETE` and ONE permissive `FOR ALL` tenant policy. **`FOR ALL` includes DELETE, so any member of the café - staff included - could delete any point of the food-cost history.** Nothing in `js/app.js` does it, which is why it never surfaced. *"No client code does it"* is not a gate; the anon key ships in the page and the policy was the only thing standing there.
- **`menu_price_history`**, its sibling, written by the same function on the same event, had only SELECT and INSERT policies - so **nobody** could delete, the owner included.

Two series, opposite rules, neither of them a rule anybody chose.

## Review

The pre-push `code-review` agent, on Sonnet, not shown the item.
**No defect found - the first clean verdict of the session**, from the same reviewer that found a critical in the batch before it.

⚠️ **It did something the others did not: it verified the LIVE DATABASES rather than the diff.** It read `pg_policies` on production *and* staging, checked the table grants, checked for foreign keys and triggers on both tables, confirmed the two bad points are real rows, and hand-mutated the migration three ways to watch the tests go red. For a change whose whole subject is what the server permits, that is the only review worth having.

**One correction taken.** My header claimed the statement ordering mattered because the permissive policy alone *"would briefly let STAFF delete"*. **Inside one transaction no other session can observe the intermediate state at all** - the transaction does that work, not the ordering. What the ordering actually guards is the two statements being split across two DEPLOYS, where the window is real and minutes long.
Still a good reason to write them that way; not what the file said. Corrected in the migration and the mirror, **as a correction rather than a rewrite**, because a migration is a record and the next reader should see which claim was wrong.

Full report verbatim: `docs/reviews/REVIEW-250-history-delete.md`.

## Into CLAUDE.md

Nothing new. This batch is an instance of rules the file already carries and they all held: `as restrictive` is the word that gets dropped; a restriction must name its command; NULL denies; a test pinned to a named migration pins a name; the mirror must carry what the migration carries.
**What is worth noting is that the correction I had to take is the rule this session ADDED two batches ago** - a justification that cites a mechanism is a claim that the mechanism applies, and mine did not. Third instance, same session, and the first one a reviewer had to catch in prose rather than in code.

## New docs/QUEUE.md items

None. **Item 89 stays**, with its server half struck and the client surface described as what is left.
Its acceptance is unchanged for the surface, and it now records that production carries **TWO** bad points rather than the one the item named - the 354.4 on the all-menus series, and a 30000 on a per-menu series for a menu that was itself an 8 Sep audit artefact, so that one renders nowhere.

## New docs/PHONE.md items

None.

## Probe

**What did the item tell you to do that you would have done differently?**
It described a missing capability - "a point cannot be deleted from the app" - and the truth was that one series could already be deleted by anyone in the café and the other by nobody. **The item was right about the app and wrong about the database**, and the difference is a live hole rather than a missing feature.
I would also not have taken it as one batch. The server half stands alone, closes something real, and is one thing a reviewer can hold; bundling a new Settings surface into the same PR would have made it two.

**What did you not propose because it was out of scope?**
The other eight tables' delete rules were not audited. `price_history`'s `FOR ALL` came from 182's tenant sweep and the same shape is on every table it touched - 187 restricted four of them by hand, and whether the rest are right is a question this batch did not ask.
**Not filed, deliberately**: it is a real question and an unmeasured one, and filing "audit the other eight" as a C item is the kind of vague entry `docs/MAINTENANCE.md`'s own header warns about. The `project-audit` run that is now two versions away is the right instrument.

## Surprises

**The item was about building a surface and the interesting part was in the database.**
Nothing in the item, the audit that produced it, or any prior batch had looked at whether the history tables could be deleted from - because the app never tries, so no path exercised it. The gap was found by asking what the server would permit before writing the client that asks it to.
**The transferable half: a feature request is also a question about what is already allowed**, and this repo's oldest rule is that a check finds only what it looked for.

**And the deploy version did not move.** This is the first batch in the session to ship no client asset, so `sw.js` stays at `ezplate-v206` - which means the audit counter is still at 9 rather than the 10 I expected. `project-audit` becomes due on the next batch that ships a client file, not on the next batch.
