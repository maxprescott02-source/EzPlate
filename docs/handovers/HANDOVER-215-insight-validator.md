# HANDOVER - 215 (insight validator: meaning, not digits)

**Branch:** `fix/insight-validator` · **Scope:** `docs/QUEUE.md` item 7, from the blind code audit of 22 Aug 2026.
**Deploy version shipped: `ezplate-v176`.**

## What changed

`validatePhrasing` compared the model's rewording against a SET of the facts, which is what the file's own header said it did.
Set membership is not meaning.
Measured against the real function, a `%` turned into a `$`, two facts swapped, and a direction reversed were all accepted, with every number "preserved".

It now compares the candidate against the deterministic template instead.
Figures must be an ordered subsequence, each keeping its own `%` or `$`; entity names are sequenced the same way; direction is compared separately and abstains on a genuine ambiguity.
A subsequence and not an equality, because the function's docblock already promised that a warmer sentence may drop a fact.

The client carries a second copy of this logic and always will, since there is no build step.
`tests/insight-parity.test.js` executes both against one shared table rather than comparing their source.

## Review

Three rounds, all by the `code-review` agent forced onto Sonnet while the batch ran as Opus.
Full report and every finding verbatim in `docs/reviews/REVIEW-215-insight-validator.md`.

Rounds 1 and 2 found a false reject on a shipping template (`insVolatility`'s "24-38%" range shares its symbol), a sentence-wide negation test that disabled the direction check for a whole family, and a `\bn't\b` regex that could never match a contraction.
All fixed.

Round 3 happened because `npm run smoke` was red on this branch and green on a clean `origin/main` worktree.
`npm test` and the mutation gate both pass without smoke, which is how it got that far.
The cause was the two halves of one feature disagreeing: the validator required template figure order while the prompt in the same file said "FRONT-LOAD the fact", which on an aggregate-first template asks for exactly the reordering the validator throws away.
Four of ten hand-written faithful rewordings were rejected, every one a clause reorder.

That round then found three things in my own fix.
The major one: my commit message claimed it had reconciled front-loading with the ordering rule, and it had not.
It added a new bullet and left the two pre-existing ones untouched, so the prompt still argued with itself.
Fixed at both sites and pinned by a test that reproduces the reviewer's exact finding as a red test.
Second: a comment in `tests/smoke.js` claimed "the reordered form is asserted below as a REJECT", and no such assertion was ever written.
Confirmed by grep that the string appeared in this repo only inside that comment.
The comment now says plainly that smoke.js cannot notice the ordering rule being relaxed, and names the file that can.
Third, a nit: the fixture said "than March" against a template saying "than at April prices". Aligned.

## Into CLAUDE.md

Nothing.
The lessons this batch produced are already covered by the existing roster entries: a fixture whose fields agree cannot tell you which one the code read, and a grep over a source file searches prose as well as code.
Neither is a new shape, and the roster's own header says to leave the number alone when the shape is not new.

## New docs/QUEUE.md items

Item 7 is rewritten rather than deleted, to the half this batch did not do: **three insight families put no name in `facts`** (`insCostBase`, `insConcentration`, `insPriceAnomaly`), so the name check has nothing to sequence and a rewording can blame the wrong ingredient, supplier or product with every figure intact.
That is a change to the insight engine rather than the validator, it is a mutation target with a large existing suite, and `tests/insight-real-templates.test.js` asserts the gap as it stands, so shipping it turns that test red by design.
`insCostBase` is the family the original audit used as its example, so the motivating case is the one still open.

Two entries added to `docs/MAINTENANCE.md`, both C:
- the validator cannot see an inverted RECOMMENDATION ("is fine and needs no action"), because the only cheap implementation is a denylist of advice phrasings;
- a rejected phrasing is not free, which qualifies the neighbouring entry's claim that it "costs nothing".

## New docs/PHONE.md items

None.
Everything here is server-side validation logic with no visual surface; a wrong outcome is a deterministic template rendering instead of a warmer sentence, which a device cannot judge better than the suite can.

## Probe

**What did the queue item tell you to do that you would have done differently?**
Nothing in its requirements, which were right.
But its framing invited a mistake I nearly made: it said to validate the sequence of numbers, and when the sequence rule produced measured false rejects the obvious repair was to bind each figure to its nearest name or unit word and drop the ordering.
That would have been a bug.
`insDrift` renders "lifts it from 25% to 40%": two bare percentages, no name between them, no unit word, same symbol, so order is the only signal separating it from "from 40% to 25%", which reports a plate that got worse as improving.
The item could not have known that, because it was written from the audit's `insCostBase` example.
The real fix was the prompt, not the check.

**What did you not propose because it was out of scope?**
Instrumenting `api/insight.js` to count validated against rejected phrasings.
The four-of-ten figure is from sentences I wrote by hand, not sampled from Gemini, and it shows the check forbids a natural class of rewording without being a production reject rate.
It is filed in `docs/MAINTENANCE.md` with that limit stated, because a number nobody can source gets argued from in both directions.

I also left the `docs/MAINTENANCE.md` C item about `tests/smoke.js` reading `js/app.js` by hand, despite opening that file.
The item's own text says smoke.js may want leaving alone since it is not in `npm test` and runs standalone, and I only edited a fixture, not the file-reading line.

## Surprises

The smoke suite is not in `npm test` and not in the mutation gate, so a change can be fully green locally on both and still be red.
The pre-push hook does run it, so nothing could have reached production this way, but the gap between "the suite passes" and "the checks pass" is wider than it reads.
`CLAUDE.md` already records the Playwright half of exactly this; smoke is the same shape.

The stronger surprise is that both of round 3's substantive findings were in work written to fix that same class of defect, in the hour after reading the roster that describes it.
The commit message overstated its own diff, and the comment claimed a guard that was never written.
Neither was caught by any test, and both were caught by a second reader given the diff and not the intent.
