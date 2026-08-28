# HANDOVER - 216 (project-audit at v176)

**Branch:** `chore/audit-v176` · **Scope:** `docs/QUEUE.md` item 0, queued by the `/batch` loop at a gap of 10 from `AUDIT-v166`.
**Deploy version shipped: none.** Docs only.

## What changed

`docs/audits/AUDIT-v176.md` is filed, which is the half of this item that is actually the work: the agent is read-only and hands the report back, so an unfiled report leaves the counter unchanged and the next audit is never queued.

Six stale `CLAUDE.md` claims corrected under the standing documentation authority.
`docs/STAGING.md` now carries the staging outage at the top.
Two duplicate `docs/MAINTENANCE.md` entries resolved and two stale counts in them corrected.
Eight findings filed to `docs/MAINTENANCE.md` as C items.

## The one that matters

**The protected parser region was edited by batch 197 and nothing recorded a decision to allow it.**
`CLAUDE.md`'s rule is absolute: never edit inside it, stop and tell Max.
I verified it twice by hand rather than taking the agent's word: the region hash changed at commit `f259c5c` (PR #198) and has been stable since, and diffing the region span across that commit shows one line removed and 25 added inside it.

The change itself was good and I am not questioning it.
It fixed taught-pack and supplier-memory lines being stored 10% high, because the GST divisor ran on the parser's candidate price rather than the resolved one.
The four never-touch functions were not modified and are byte-identical to their v166 state, so the narrower rule held.

What is missing is the mechanism.
The only region check anywhere is `tests/extractfn.test.js:121`, which asserts the anchors still slice, not that the contents are unchanged.
Every audit since v125 has compared the hash by hand and this is the first time it moved.
The strongest invariant in the file is the only one with no test behind it.

**Two things are Max's and I did neither:** whether 197's edit is ratified after the fact, and whether the region gets a hash pin in `npm test`.
Both are recorded in `docs/MAINTENANCE.md` under his name.

## Review

Skipped, and this is the pure-prose exception rather than a judgement call: the diff is five files, all of them Markdown, and it ships no client asset.
`node tests/review/check.js` agrees, and the pre-push hook did not ask for an artifact.

I deliberately did NOT fix two findings that would have broken that.
C6 (two files citing an incident count `CLAUDE.md` has disowned) lives in `.githooks/pre-push` and `tests/semantic-keys.test.js`, and C7 in the hook's header.
Both are comment-only, but they are in files whose diff changes what runs, which would have pulled a docs-only PR into the mandatory-review path for the sake of two comments.
They are filed to ride the next batch that opens either file.

## Into CLAUDE.md

Six corrections, all measured, none of them new rules:
the terminology inversion guards are three and not two;
`css/style.css` no longer says "twelve" in two comments, it says it once and that comment is the fix;
Bidfood is in 37 tracked files and not 26, with 27 of them tests rather than "~20";
the pointer to a queued `js/app.js` comment fix is dead at both ends;
the `cafe*` grep returns fourteen and not thirteen, the fourteenth being prose inside a comment, which is roster entry 183(a) biting inside the sentence that recommends the grep;
and the review-artifact gate is inside the required `unit` CI job, not hook-only as the file said.

That last one is the only one that could have caused harm: it understated enforcement, which is the direction that invites a batch to think it can skip a gate it cannot.

## New docs/QUEUE.md items

None, and that is deliberate.
The audit item's own scope says out of scope is fixing what it finds, and `docs/QUEUE.md`'s header says nothing about the process itself belongs there.
Every finding went to `docs/MAINTENANCE.md` by the tier test.
The queue is back to 9 items against a cap of 20.

## New docs/PHONE.md items

None.
Nothing in this batch touches anything a device can judge.

## Probe

**What did the queue item tell you to do that you would have done differently?**
Nothing.
Its warning that filing IS the work was well aimed, and I would flag that the item was written by the previous batch, which is me, so it is weak evidence of anything.

The judgement I would defend is going slightly past "report only" for the documentation corrections.
The item says out of scope is fixing what it finds, and I read that as being about code and product findings rather than about `CLAUDE.md` claims, because verifying those claims is the audit's whole purpose and `CLAUDE.md` gives standing authority to fix them.
Leaving six known-stale lines in a file whose own header says a stale fact is worse than no fact would have been the wrong reading.

**What did you not propose because it was out of scope?**
The region hash pin, which I think should exist and which is one small test.
It is Max's because the region rule is his, and because ratifying 197 after the fact is a question only he can answer.
I also did not touch the Tier 1 growth finding: `CLAUDE.md` is now 19,320 words with Tier 1 at 56% of it, up 52% since v166, and AUDIT-v166 already recommended a consolidating preamble that was recorded rather than acted on.
Three more sections have been added since. It is a real cost paid on every message of every batch, and it is his call, so it stays in the audit report.

## Surprises

The audit's own highest-value finding was invisible to every mechanism in the project.
The region edit passed the suite, the mutation gate, CI, a pre-push review and a handover, because nothing anywhere hashes the thing the rule protects.
It was found by an agent comparing a number to one written down in a previous audit, by hand, which is the least mechanised check in the process.

The second surprise is that two audits running have now found `docs/MAINTENANCE.md` recording one problem twice, and the cause is structural rather than careless: the file is 765 lines with no index, and both duplicate pairs were filed by different processes that had no way to see each other.
I merged the pairs and wrote "grep this file for the subject before adding a C item" into both, which is a convention and will therefore work about as well as conventions usually do here.
