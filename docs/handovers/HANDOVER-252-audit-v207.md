# HANDOVER - 252 (AUDIT-v207 filed, and the wrong facts it found corrected)

**Branch:** `252-audit-v207` · **Scope:** the `project-audit` item batch 251 queued when the counter reached 10.
**Deploy version shipped: NONE.** No client asset changed - the two `js/app.js` edits are comments.

## What changed

**`docs/audits/AUDIT-v207.md` is filed**, so the counter reads v207 instead of v197. Ten deploy versions, eight batches. **The report's verdict is that the project is healthy** and this stretch is the most disciplined it has been: 2049 tests passing and monotonic across eleven batches, all six version spots agreeing, the protected parser region byte-identical to its v197 baseline, and all three new Tier 1 sections reproducing against the code including their measured numbers.

**Then the corrections it found**, each measured rather than edited from a handover:

⚠️ **`CLAUDE.md` stated a CLOSED security gap as open.** It told every batch that `claim_business_invite()` and `business_team()` carry an `anon` execute hole "filed in maintenance rather than fixed on sight" - and batch 243 had closed both **the day before**, on staging and production, with the maintenance entry and the backlog item struck. 243's handover says *"Into CLAUDE.md: Nothing."*
Wrong in both directions: it named two functions that were safe and none of the seven that still hold `anon` EXECUTE. Corrected against `proacl` on **production**, which is what that paragraph's own next sentence tells you to do.

Also: item 21's body taught the chunked-manifest justification 247 was corrected for, out of a struck item; `QUEUE-GROUPS` G1 read as eight open items; G3's context named a function 246 deleted; the "Stops for Max" list named two discharged stops; Tranche 0's `.env` bullet was done in 240 and unstruck; **Tranche 0's ZZ-AUDIT cleanup is PARTIAL** - the menu and plates went, both products, three history rows and `K0164` did not.

Three threads that had reached nowhere are routed: `applyInvoice` as a mutation target, 249's six products, and `dbSetSetting`'s toast wording into item 46's own body, where `CLAUDE.md` says such a note lives.

`logChange`'s live `avgAfter` default now carries its warning at the **definition** and at `trendMarkers`, not only at two call sites - the wrong end for the next author writing a batched caller.

## Review

**Two findings, both major, both mine, and both are this batch committing the exact failure it was correcting.**

**Finding 1 is the worst thing in the batch.** I wrote that 249 had linked the thirteen stranded plate lines and that nothing now references the six products. **Measured: all thirteen lines across nine plates are still live.** 249 shipped the picker that ASKS; it applies nothing on its own and Max has not used it.
The source was `HANDOVER-249`'s Probe - *"still in the catalogue with nothing using them"* - which meant **no INGREDIENT uses them** and was true. One step further, "nothing uses them" became "nothing references them", and a true sentence about ingredients became a false one about plate lines **that would have justified deleting six products nine plates cost from**.
That is a measurement quoted one step too far: the identical shape I corrected in the ZZ-AUDIT bullet, in the same diff, in the batch whose whole subject was re-measuring stale claims.

**Finding 2: I broke the routing rule for item 91 in the same commit that fixed it for item 90** and restated it in bold.

Full report verbatim: `docs/reviews/REVIEW-252-audit-v207.md`.

⚠️ **The review ran although the diff is comment-only in `js/app.js`.** The artifact gate refused the push and the rule is right that the line is *not* code-versus-docs. It paid: both findings are in documentation and one was dangerous.

## Into CLAUDE.md

**One correction, no new rules.** The audit's own recommendation was to add none, and the two findings are covered by rules that already exist - they were violations, not gaps.

**And one recommendation DECLINED with a measurement.** AUDIT-v207 said to record the parser region's md5. **It does not reproduce**: four plausible slice variants against `tests/_extract.js`'s own `sliceBetween` all disagreed with the quoted value while agreeing with each other on the line count. A hash in prose nobody can reproduce is an artefact nobody can falsify - which is `docs/MAINTENANCE.md`'s own instruction (*"compute it at the time rather than trusting a number written here"*) proving itself against the process meant to be checking things. The hash was computed and deliberately not written down; **the pin in `npm test` remains Max's**, as that entry has always said.

## New docs/QUEUE.md items

**Item 91, blocked on Max: staff may not delete a plate, and may delete every product that plate costs from.** Measured against `pg_policies` - `ingredients` and `supplier_phrases` carry the same permissive `FOR ALL` that made `price_history` a hole until 250. **`menu_items` is a third such table and is DELIBERATE** (187 decided staff may unpublish a dish), so it is excluded.

**Two new `docs/MAINTENANCE.md` entries**: `applyInvoice` as a mutation target, and the six products with the `DO NOT DELETE` warning.

**And one new test: `tests/queue-routing.test.js`.** Three restatements of "route an item in BOTH files" had not worked, so it is mechanised. **It failed on its first clean run and surfaced a fourth instance** - item **89**, split out of 18 by batch 241, unrouted for eleven days through two audits while its group read as finished.

## New docs/PHONE.md items

None.

## Probe

**What did the audit tell you to do that you would have done differently?**
Record the region hash - declined above, with the measurement.
And its §5 row on the six products was the source of my worst error: it said *"FILED, batch 252 - it had reached nowhere"* without re-measuring, unlike its sibling rows which it did measure. **I copied that framing instead of checking**, which is the same trust I was auditing other people's handovers for.

**What did you not propose because it was out of scope?**
The audit's S-A finding - that the pre-push review found a defect in nine of eleven batches and *"what is missing is not a rule, it is the channel"*. It is right, and the answer is a change to how the review is invoked or enforced, which is a process decision rather than a batch. Not filed as an item because `docs/QUEUE.md`'s header forbids items about the process itself; recorded in the audit, which is where a reader will meet it.

## Surprises

**The check I wrote to catch a recurring failure was itself too weak, and I found that the only way anyone does.** Its first version searched the whole routing file - so deleting item 91 from the `Items:` line left it green, because 91 is also named in the paragraph explaining that it had once been missing. **A grep over a document searches its prose, and here the prose was this very rule being written about.** It reads only the `**Items:**` lines now.

**Two audits and this batch had all missed item 89's routing**, and a three-line regex found it in a second. The lesson is not that the audits were careless - it is that *"is every item in both files"* is a question a human reader never asks in that form, and a machine asks in exactly that form.
