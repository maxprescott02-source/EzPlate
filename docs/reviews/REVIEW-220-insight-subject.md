# REVIEW-220 - the three insight families publish their subject

Reviewed-commit: 93074a069c89451b8300b6ed0d305c488f7b788b

Pre-push `code-review` agent, run on a different model from the batch (Sonnet against Opus 5), on
`git diff main...HEAD`, without the brief or the queue item in the prompt.
Findings pasted verbatim below, then what was done about each.

⚠️ **ONE HONEST CAVEAT ABOUT ITS INDEPENDENCE.** The agent was not GIVEN the item, but it read the
repo, which contains `docs/QUEUE.md`, and its last bullet reasons about the queue entry.
So it was blind to the brief only in the sense that nothing was handed to it.
That is the standing limit of running an adversarial reader inside the repo it is reviewing, and it
is recorded rather than presented as a clean separation.

---

## The agent's findings, verbatim

> No duplicate-declaration violations. I've now traced the whole change: both validator copies, the three builder call sites, the wire path, the mutation-target coverage, the cache-version bump, and the test suite.
>
> ## Findings
>
> No findings. This is a clean, well-contained fix.
>
> Specifics I checked and could not break:
>
> - **`namesAllPresent` (api/_insight.js:161) / `gemNamesAllPresent` (js/app.js:6392)** - identical mirror implementations. Verified by hand that they close the exact hole the comments describe: with `facts.name` present but the candidate text using a different subject, `nameSequence` on the candidate returns `[]`, `namesAreSubsequence([], tpl)` is vacuously true (the pre-existing hole), and the new `namesAllPresent` correctly catches it via `cand.indexOf(tpl[i]) < 0`.
> - **Real call sites, not just tests**: `js/app.js:6487` (`gemPhrasingOk(cand, ins.facts, ins.text)`) and `api/_insight.js:291` (`validatePhrasing(cand, factNumbers(ins.facts), tpl, factNames(ins.facts))`) both already pass `ins.facts`/`factNames(ins.facts)` unfiltered, so the new `name` key flows through in production, not only in the test fixtures. The wire path (`js/app.js:6479`, `POST /api/insight`) sends `facts` whole, so nothing strips `name` in transit.
> - **Guards before the write**: `insCostBase` (`!mv.name`), `insConcentration` (`!sup.name`), `insPriceAnomaly` (`!an.name`) all already require the name truthy before the `facts` object is built, so `facts.name` can never leak through as `undefined`/blank and silently disable the new check.
> - **No false-reject regression**: the added test table (`tests/insight-real-templates.test.js` `SUBJECTS` loop) pairs every "swap refused" case with a "faithful rewording still passes" case per family, which is the right shape to catch a presence check that could only be satisfied by rejecting everything.
> - **Parity file** (`tests/insight-parity.test.js`) now feeds `FACTS = {name:'Beef', ...}` instead of `{}` - previously the parity table ran every row with an empty name list and could not exercise the name-check code path in either copy at all (that gap is called out explicitly in the diff's own comment, and it's correct).
> - **Mutation coverage**: both `gemNamesAreSubsequence` and `gemNamesAllPresent` were added to `tests/mutation/targets.js` (previously `gemNamesAreSubsequence` had no target, despite `gemSkeletonIsSubsequence` - its numeric sibling - already having one, which the comment identifies as exactly how this hole survived). The one allowed survivor for `gemNamesAreSubsequence` is argued and justified as equivalent-mutant (a bounds check that can't be distinguished because the extra iteration only compares `undefined !== nonEmptyString`), which is a defensible allowance, not a cover-up.
> - **Version bump**: all 6 cache-version spots (`index.html` x2, `sw.js` x3 including `CACHE` and both entries in `ASSETS`, `js/app.js` `APP_VERSION`) agree at v180.
> - **Scope discipline**: the diff fixes exactly the 3 families the pre-push review found (`insCostBase`, `insConcentration`, `insPriceAnomaly`) and correctly leaves the other 2 known-affected families (`insVolatility`, `insNearCluster`) filed as `docs/QUEUE.md` item 7 rather than silently declaring the class closed - the queue entry itself documents that those two are real, currently-unprotected instances of the same defect, which is honest scoping rather than a gap the diff pretends doesn't exist.
> - Full suite (1752 tests) and the housekeeping duplicate-declaration guard both pass with the two new top-level functions added.
>
> I looked hard for the things the task flagged as likely (divergence between the two validator copies, a test that couldn't fail, a stale docblock) and didn't find any in this diff.

---

## What was done about each

**Nothing to do: no findings.**
Nothing was dismissed, because nothing was raised.

⚠️ **A REVIEW THAT FINDS NOTHING IS THE CASE THIS ARTIFACT EXISTS FOR.**
`CLAUDE.md`: *"a review that found nothing and a review that never ran are otherwise the same silence."*
Six batches that shipped a client asset have no record of one, and five of those are unknowable.
This file is the only thing that distinguishes this batch from those five.

**What it confirmed that the batch could not confirm for itself**, and which is worth keeping:
the new `name` key reaches production rather than only the fixtures.
The batch verified the two validator copies and the builders; the agent traced the wire path
(`POST /api/insight` sends `facts` whole) and the two live call sites, which is the half a
self-review is worst at, because it is the half you already believe.
