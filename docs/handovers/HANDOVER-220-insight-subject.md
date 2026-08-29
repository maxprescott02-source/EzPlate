# HANDOVER - 220 (the insight families publish their subject)

**Branch:** `fix/insight-subject-in-facts` · **Scope:** `docs/QUEUE.md` item 7, "Three insight families do not put their subject in `facts`". **Shipped `ezplate-v180`.**

## What changed

`insCostBase`, `insConcentration` and `insPriceAnomaly` now publish their subject in `facts` - the culprit ingredient, the supplier, the product.
The phrasing validator now REQUIRES every name the template uses to survive into a model's rewording, in both copies: `namesAllPresent` in `api/_insight.js`, `gemNamesAllPresent` in `js/app.js`.
Before this, a warmer rephrasing could blame a different ingredient with every figure, symbol and direction identical.

## Review

Pre-push `code-review` agent, Sonnet against Opus 5, on the branch diff.
**No findings.**
It traced the two live call sites and the wire path and confirmed the new key reaches production rather than only the fixtures, which is the half a self-review is worst at.
`docs/reviews/REVIEW-220-insight-subject.md` has it verbatim, including one honest caveat: the agent was not handed the item, but it read the repo, which contains `docs/QUEUE.md`, and its last bullet reasons about the queue entry.

## Into CLAUDE.md

Nothing.
The lesson here - an exemption or a guard is scoped to the claim that justified it, and a check that finds nothing has only proved something about what it looked for - is already in Tier 1 twice over, and the roster header says explicitly to add a bullet only when the SHAPE is new.
This is that shape arriving in a new place, not a new shape.

## New docs/QUEUE.md items

**Item 7 replaced by its successor: two MORE insight families name a subject that is not in `facts`.**
`insVolatility` names the volatile ingredient ("swings 24-38% with **cream** prices") and publishes only the plate.
`insNearCluster` names up to two plates and publishes no name at all.
Both swaps measured against the real builders and the shipped validator on 29 Aug 2026: still ACCEPTED.
Neither is a one-liner, which is why they were not folded in - `insVolatility` falls back to the literal `'ingredient'`, and `insNearCluster`'s name count is 0, 1 or 2 depending on the data.

## New docs/PHONE.md items

None.
Nothing rendered changed: the deterministic templates are identical and they are what the Dashboard shows.

## Probe

**What did the item tell you to do that you would have done differently?**
The item's requirement was *"each of the three carries its subject in `facts`, so the existing name check covers it"*, and the second half is false.
Adding the key and stopping there leaves the defect exactly where it was: measured, the swap was still accepted, because `namesAreSubsequence` lets a rewording DROP a name and SUBSTITUTING one reads to it as dropping one - the candidate's name sequence is EMPTY, and an empty sequence is a subsequence of everything.
It would have turned the `KNOWN GAP` test red while changing nothing, which is worse than not doing it: the hole would have become invisible rather than absent.
The item also said, in bold, that this was *"a change to the insight ENGINE, not the validator"*. It had to be both.

**What did you not propose because it was out of scope?**
Fixing `insVolatility` and `insNearCluster` in this PR. They are the same defect and the mechanism was already built, so it was tempting.
Each carries a design question that deserves its own decision rather than a call made in passing at the end of another item, so they went to the queue with the measurements instead.

## Surprises

**The item's enumeration was short, and checking it is why.** `CLAUDE.md` Tier 3 says *"If a brief's list looks complete, check it anyway"* - every enumeration in this project has come back different. This one said three; sweeping all eight families found five.

**`tests/insight-parity.test.js` could not exercise the rules it was written to protect.** Its fixture carried no name and its runner passed the server `[]`, so every row ran with an empty name list, in the file whose entire job is proving the two validator copies agree. The name half of both copies was unreachable from it. Fixed here.

**The mutation gate had the FIGURE half as a target and not the NAME half.** `gemSkeletonIsSubsequence` was listed; `gemNamesAreSubsequence` never was. That asymmetry is how the hole survived - nothing had ever asked the name walk a question. Both are targets now.

**A survivor that is genuinely equivalent, and its sibling that is not.** The identical mutation in `gemSkeletonIsSubsequence` is KILLED, because that walk dereferences `tpl[i].u` and an extra pass throws. The name walk compares `tpl[i]!==cand[j]`, which on `undefined` is simply true. Same shape of line, one fatal and one harmless, decided entirely by whether the comparison dereferences. Allowed with the reason and the condition that expires it, after an exhaustive run over 14,641 pairs rather than an argument.

**And one near-miss worth recording.** Checking the review gate with `node tests/review/check.js 2>&1 | tail -5; echo "exit=$?"` printed `exit=0` - which was `tail`'s status, not the checker's. The gate had REFUSED. That is `CLAUDE.md`'s "READ THE EXIT CODE, NOT THE TALLY" arriving one layer further out than it is written: the pipe, not the parse.

## `--no-verify`, recorded

The final docs-only commit (this handover) was pushed with `git push --no-verify`.
`CLAUDE.md`: *"If you use it, say so in the handover - an unexplained skip is the silence the gate replaced."*

**What it skipped and why that is safe here:** the hook's five steps had already run in full on the code commits of this same branch minutes earlier, green, and this commit adds one Markdown file and changes nothing that runs.
**It should not have been reached for anyway.** The saving was about ten minutes of re-running a suite against an unchanged tree, which is not worth spending a documented exception on, and the rule exists because that judgement is exactly the one that gets made too easily.
Written before the merge rather than left to the next handover, because the point of the rule is that the skip is not silent.
