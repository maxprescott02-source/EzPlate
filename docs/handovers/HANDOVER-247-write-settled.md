# HANDOVER - 247 (the trend point waits for the write)

**Branch:** `247-write-settled` · **Scope:** `docs/QUEUE.md` item 21, **split** - this batch ships its history half.
**Deploy version shipped:** `ezplate-v204`.

## What changed

A food-cost trend point is only written when the mutation it describes actually landed.
`logHistory` pushed its point the instant the in-memory change happened, before the `pushWrite` that decides whether the change is real had settled.
So a dish price edit the server refused still put a point on the trend line saying the café's average had moved: `pushWrite` toasted, memory kept the new price, and the next boot read the OLD price back and left the point behind - a reading of a state that never existed, in `price_history`, the table item 89 exists because nothing in the app can correct.

**The item named two call sites. There are eighteen, and fifteen were optimistic.**
Fourteen now pass the write; three were already inside a server-success branch; one is left, with its reason at the site.

**Two halves split deliberately: the repaint is NOT gated.** v60 item 1a says a data-changing event must always refresh a visible dashboard, so gating both would make the header stale for a round trip on every edit - the bug v60 fixed.
**And the value is computed AFTER the write settles**, because computing early and pushing late would let two rapid edits both pass the near-duplicate check before either landed.

The pattern was already in the file twice - `logChangeIfSaved` for the change log, 224's `saveIngLog(write)` for `ing_price_history`, whose comment says outright it is *"the discipline logChangeIfSaved already applies to the change log, arriving on the series it was measuring against"*. This is the third and last series.

## Review

The pre-push `code-review` agent, on Sonnet, told to look for wrong promises, missed sites and timing the deferral changes. Not shown the item.
**Two findings. The first is a MAJOR and it was mine.**

I left `commitPrice` and `saveIngEdit` ungated and wrote a justification: `setProducts` returns a chunked write whose verdict is a manifest, so `!r||r.error` is the wrong question.
**True of the catalogue importer and false at both those sites.** `setProduct` is the N=1 wrapper - one entry, one chunk, one `pushWrite` - so `.error` is a complete binary verdict and there is nothing partial to lose. Verified by reading `dbPushIngredients` before acting.
Both now gate. Only `applyInvoice` is left ungated, which the reviewer independently agreed is different.

**What is worth recording is not the missing guard, it is that I argued for it.**
A site with no comment invites the next reader to check. A site with a confident, specific, wrong argument closes the question.
That is `CLAUDE.md`'s wrong-consequence family at its worst, shipped inside the batch whose whole subject is the gate - and it is why the fix carries the correction at the site rather than quietly gating.

The second finding is real and smaller than it looks: the gate proves THIS write landed, not that the state the point is computed from landed, because `computeAvgFoodCost` reads live memory and this app does not roll back a refused optimistic edit.
The comment now says exactly that. **The fix is a rollback, not a tighter gate - there is nothing tighter to gate on** - and it is filed in `docs/MAINTENANCE.md` with its grounds for being C.

Full report verbatim: `docs/reviews/REVIEW-247-write-settled.md`.

## Into CLAUDE.md

Nothing. Both findings are covered by rules that already exist - the wrong-consequence section and "an exemption is scoped to the CLAIM that justified it" - and this batch is an instance of them rather than a new shape.
The instance is recorded in the review artifact and in the comment at `commitPrice`, which is where a reader who is about to make the same mistake will be standing.

## New docs/QUEUE.md items

**One: item 90**, carrying item 21's other three instances.
21 grouped four things under one mechanism and only one shared it in substance - the invoice completion message needs a COUNT of what landed rather than a boolean, the menu delete is a sequencing change, and the boot-time replace is a merge decision. Each has a different risk and none falls out of the others, which is `skills/batch`'s own stop condition for splitting.
The invoice half is explicitly told that 247's ungated `logHistory()` on that path belongs to it, because both need the same manifest.

**One new C in `docs/MAINTENANCE.md`:** a refused optimistic edit is left in memory, so the next successful edit's point includes it. From review finding 2.

## New docs/PHONE.md items

None. Every path here is drivable in the unit harness with a refused write, which is a more precise instrument than a device for this.

## Probe

**What did the item tell you to do that you would have done differently?**
Its enumeration. It said "dish mutation and plate save"; there were eighteen call sites and fifteen were optimistic, which is the seventh recent item to be short this way and the reason the queue header tells you to grep before planning.
And I would not have grouped its four instances, which is why they are now split - the grouping made it read as one change and it is four, with four different risks.

**What did you not propose because it was out of scope?**
The rollback of refused optimistic edits, which is the real answer to finding 2 and touches every mutation path in the app. Filed, not built.
Also `doDeleteMenu`'s unawaited dish deletes, which sit two lines from a site this batch changed and were tempting to fix in passing - they are item 90's, and taking them here would have been the "it is already open in front of me" rationalisation `CLAUDE.md` names.

## Surprises

**The review found the batch's own defect for the third batch running** (12 → 12b, 244's sequence race, and now this).
The pattern is worth naming even though no rule is missing: **a batch that adds a guard reasons hardest about the guard, and least about the sites it decides to exempt.** All three were exemptions - a value the gate skipped, an ordering the fix introduced, a justification copied to where it did not hold.
The tell in all three is the same: the exemption was written in the same hour as the rule, by someone who had just convinced themselves of the rule.

**And the backtick trap bit again**, in the same place as batch 246: a comment added inside `history-paths.test.js`'s template-literal sandbox used backticks and broke the file with a `SyntaxError` pointing at an unrelated line 60.
Both files carry a note saying not to. **Reading the note does not help, because you are not reading it when you write the comment** - the note is at the top of the block and the comment goes in the middle.
Not proposing a rule for it: it fails loudly and instantly, which is the cheap kind of mistake.
