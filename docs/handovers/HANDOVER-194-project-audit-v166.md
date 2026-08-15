# HANDOVER - 194 (the v166 audit, filed)

**Branch:** `chore/194-project-audit-v166` · **Scope:** queue item 2, `project-audit`, which fired on its own counter (`AUDIT-v156` against `ezplate-v166` is a gap of exactly 10).
**Deploy version shipped: NONE.** Prose only, no client asset, so no cache bump; production stays `ezplate-v166`.

## What changed

`docs/audits/AUDIT-v166.md` exists, which is the whole mechanism: an unfiled report leaves the counter unchanged and the next audit is never queued.
The audit is clean where it matters: every invariant TRUE, the protected parser region byte-identical across ten more deploy versions and the entire multi-tenant rewrite, no dead traps for the sixth consecutive run, and all fourteen `AUDIT-v156` findings actioned.
That last one is a first for this project: no carry-over.
Nine claims in `CLAUDE.md` that the code disagreed with are corrected, listed in the next section.
`docs/PHONE.md`'s "Settled - checked from here, no phone needed" heading was sitting above seven LIVE sections and is retitled and scoped.
That is the one with real consequence: behind it sat 193's question about whether `LAST PRICE PAID` is per pack or per carton, which decides whether every cost in a new café is wrong by the carton size.
`docs/QUEUE.md` item 1 no longer says "answered, may not be re-litigated" in its header and "that is the blocked question" in its requirements, 41 lines apart.
`docs/MAINTENANCE.md` carried the same `screenshots.spec.js` finding twice, written a week apart by 188 and 190, neither noticing the other; merged into one entry.

## Into CLAUDE.md

Made under standing authority and reported here, not parked.

- `ing_price_history`'s writer is **`setProducts`**, plural, since 193. The singular is now the wrapper the catalogue importer bypasses, so grepping `setProduct(` finds six single-row call sites and misses the path that writes hundreds. Two sites corrected.
- "Custom ids are `CX*`" had become a trap. Two mints now (`CX`, `IMP`), nothing reads either prefix, and `is_custom` is the column that answers.
- The foreign-key count and the `:not([hidden])` count are replaced with instructions rather than numbers. Each had gone stale twice in ten deploy versions, and four separate places carried four different figures for the second.
- `tests/roles.test.js` pins five restrictions, not four, and `tests/invites.test.js` is a second pinning file the section never mentioned. This one mattered more than a count usually would: the paragraph's whole argument is "read its first line, not its condition", and a reader who counts and finds five stops trusting the paragraph.
- The `stamp.format` rule gains the carve-out that 184 and 193 each applied on their own, and now requires the decision be recorded at `buildBackup`'s own site.
- The privacy gate's clause naming pdf.js and the signup item's position is deleted. It was correct, and it was also exactly the kind of scheduling claim Tier 3 forbids this file from holding, because `docs/QUEUE.md` re-checks its copy every batch and this one could only rot.
- The twenty-incident roster gains one sentence saying it records new SHAPES, not every instance. 193 found two more and correctly added no rule, which left the number understating frequency while reading like a tally.
- **One new Tier 3 rule, and it is the audit's sharpest finding: a queued item's approval does not expire, but its facts do.** Four of the last seven batches found their item materially wrong at the point of execution, under four different framings, which is why no batch had named it as one thing. Read a queued item's factual claims like a brief's; rewrite and carry on rather than stopping.

## New docs/QUEUE.md items

None, and that is per the queue's own header: `project-audit` reports, it does not add queue items.
Findings routed to `docs/MAINTENANCE.md` as C: four `js/app.js` and `css/style.css` comment fixes grouped into one entry, the `ingredients_pkey` test assertions, the two skill-directory copies, and two importer threads 193 left in a write-once handover.
The queue is now 7 items against a cap of 20.

## New docs/PHONE.md items

None added.
The file was edited rather than appended to: the misleading "Settled" heading is fixed, and everything behind it is now correctly marked active.

## Probe

**What did the queue item tell you to do that you would have done differently?**
Nothing. The item was accurate, which is worth saying explicitly given that the new Tier 3 rule above exists because four of the last seven were not.
Its three pointed questions were all worth asking and all came back with something: `supplier_code` was genuinely clean in all three places, the roster header was genuinely correct, and the `ingredients_pkey` question produced a recommendation to NOT widen the key and close the gap with two assertions instead.

**What did you not propose because it was out of scope?**
The audit's largest observation is that `CLAUDE.md` grew 90% in ten deploy versions, Tier 1 by 168%, and that six of its seven new Tier 1 sections describe **one mechanism from different angles**: an operation that returns success and does the wrong thing invisibly.
It recommends a shared preamble with the six kept as worked instances beneath it.
I did not do it, and the reason is the one the audit itself gives: nothing in those sections is dead, all of it is measured, and condensing measured material is the single documentation call where a wrong edit loses evidence rather than adding it.
That is the one class where standing authority is the wrong instrument, so it is recorded for Max rather than taken.
Also not done: the four comment fixes in `js/app.js` and `css/style.css`. They are correct and cheap, and each needs a cache bump plus the mandatory review, which a prose batch cannot carry without inventing a version bump for four comments. They are grouped in `docs/MAINTENANCE.md` with an instruction to ride the next batch that already bumps.

## Surprises

**The pre-push review found three real defects in a documentation diff, and the first was serious.**
The `stamp.format` carve-out as first drafted stated two conditions and needed four.
A new column carrying a DEFAULT satisfies "no group touched, no type changed" perfectly, would have skipped the bump, and then restores every old file with that column null instead of defaulted, because `jsonb_populate_recordset` turns an absent key into an explicit NULL that overrides the default.
That is the exact law `CLAUDE.md` already documents two sections away, so the first draft put two rules in one file disagreeing about what is safe.
The lesson is not about backups: **softening a rule is a code change even when the diff is prose**, and running the review on a diff that qualified for the pure-prose exemption is what caught it.

**The second finding bit inside the sentence warning about it.**
Replacing the stale `:not([hidden])` count, I wrote "grep for the live set".
The grep returns 24 against 13 real rules, because eleven hits are comments discussing the idiom, and narrowing it to lines with a brace still returns 14 because one comment contains the literal `[hidden]{display:none}`.
That is roster entry 183(a) verbatim, committed in the paragraph explaining why numbers rot.
It is left written out in `CLAUDE.md` rather than quietly fixed, for that reason.

**The parallel maintenance track was skipped, and the collision rule caught it by construction rather than by luck.**
Every maintenance item deletes itself from `docs/MAINTENANCE.md` on completion, and this batch routes audit findings into that same file.
So every candidate item collided on `docs/MAINTENANCE.md`, not just the ones that happened to share `js/app.js`.
That is the first real data point for the five-batch tally, and it is a shape the tally's question did not anticipate: **an audit-filing batch collides with the entire maintenance file, so the two tracks can never run in parallel during one.**
No item name is recorded because none was started; the collision was foreseeable before picking one.
