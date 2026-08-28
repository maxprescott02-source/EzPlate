# REVIEW-215 - the insight validator, two rounds

Reviewed-commit: 1f76a0c
**Agent:** `code-review`, on **Sonnet** against work done on **Opus 5**, on the branch diff, without a brief.
**Rounds:** TWO. The diff roughly doubled after round 1, so a second pass read the new shape.
**Outcome:** **six real findings across the two rounds. Five fixed, one queued.** Every one was
verified by executing the shipped code before being acted on.

---

# ROUND 1 - three findings, on commit 1f76a0c

## 1 (Major, FIXED) - a dangerous rewording still passed: no concept of which entity a number belongs to

> `skeletonIsSubsequence` and its mirror only compare the *order* and *symbol* (`%`/`$`) of the
> figures in a sentence, never which word or name a figure sits next to. Any insight family that
> names **two** entities and gives each **one** number is exposed: swapping which name gets which
> number preserves order and symbols perfectly.
>
> ```
> template : "Your Salads plates average 20% food cost, Mains sits at 35%."
> accepted : "Mains plates average a lean 20% food cost, while Salads sits at 35%."
> ```
>
> This is a factually inverted business claim ... shown to the cafe owner as if it were the
> verified/warm-phrased version of a number the app itself computed.

**Taken and FIXED.** Reproduced exactly. The entity names are already in `facts`
(`{loName, loPct, hiName, hiPct}`), so they are now sequenced by the same subsequence rule as the
figures: a rewording may drop a name, it may not reorder them. Swapping both names AND both figures
was already rejected by the figures.

The agent also said the new `docs/MAINTENANCE.md` entry "overstates what shipped". **It was right**,
and that entry is corrected rather than argued with.

## 2 (Major, FIXED) - a FALSE REJECT: negation-blind polarity on a real shipping template

> `healthyLine`'s 4th pooled variant reads *"nothing sits **over** your X% target"* - a healthy
> claim that happens to contain the literal word "over", an `UP_WORDS` entry ... Any natural
> rewording that instead says the plates are running "under" or "below" target - an entirely
> faithful paraphrase - reads as `down`, mismatches, and is rejected.
>
> This silently disables the AI phrasing feature for roughly 1 in 4 renders of the all-healthy line
> ... with no error surfaced anywhere - it just falls back to the deterministic template every time,
> which is indistinguishable from "working as designed" to anyone watching the app.

**Taken and FIXED**, first by abstaining on any negator, then - after round 2 found that over-broad -
by making negation **proximate**. See round 2 finding 1.

**The sentence worth keeping is the agent's last one.** A false reject has NO symptom. This is the
failure mode I would not have found by using the app.

## 3 (Major, FIXED) - a FALSE REJECT: the trailing-symbol regex misattaches in compact ranges

> `insVolatility`'s template prints a compact range like `"24-38%"`, so the skeleton records the
> **first** figure as symbol-less and only the second as `%`. An LLM asked for "warm, natural"
> phrasing very plausibly spells this out as "between 24% and 38%" ... which then fails the symbol
> match on the first entry and is rejected outright.
>
> This is arguably the most likely of the three to fire in production.

**Taken and FIXED.** A trailing symbol now propagates BACKWARD across a range joiner (`-`, en/em
dash, `to`, `and`) and only across a joiner, so `5 plates cost $12` does not give 5 a dollar sign.

## What round 1 cleared

> the two copies ... are byte-for-byte equivalent logic and `tests/insight-parity.test.js` genuinely
> executes both (via `extractFn`/`extractVar`, not hand-copied stubs) rather than asserting on source
> text - so the "two copies disagree" risk is not present.

---

# ROUND 2 - three findings, on the round-1 fixes

## 1 (Critical, FIXED) - a real template's own copy disabled the polarity check permanently

> **both** text branches of `insLongStanding` contain a negator word as part of their fixed copy ...
> Since `polarityOf` is called on the *template* as well as the candidate, and the template itself
> always trips `NEGATORS`, `pt` is `null` on every single render of this family - the guard can
> never fire for `insLongStanding`, regardless of what the model writes.
>
> **What breaks:** a model rephrasing can flip "over target" to "under target" for a plate that has
> been a genuine long-standing problem ... The owner is told a chronic problem plate is fine.

**Taken and FIXED, and it is a defect I introduced in round 1's fix.** The negation test was
sentence-wide; "not" in ", not a one-off." has nothing to do with "over target" forty characters
earlier. Negation is now **proximate** - a direction word counts unless a negator sits just before
it - which fixes this family while keeping round 1 finding 2's healthy-line abstention.

## 2 (Critical, QUEUED as item 7) - the name defence does not cover 3 of the real families

> `factNames` can only sequence names that appear as *string values in `facts`*, and three real
> families put their leading proper noun only in the rendered `text`, never in `facts`:
> `insCostBase` ... `insConcentration` ... `insPriceAnomaly`.
>
> **This is the exact motivating example from the "215" audit comment at the top of the diff, and
> the fix does not cover it.**

**Taken, verified, and QUEUED rather than fixed - a scope call, stated plainly.** The fix is one key
per family in the insight ENGINE (`computeInsights`), which is a different surface from the
validator, is a mutation target, and is covered by a large existing suite whose own notes already
reason about which families carry a `facts.name`. That deserves its own batch and its own review.

**What ships instead is VISIBILITY**: `tests/insight-real-templates.test.js` asserts the gap as the
current truth, so it is in the suite rather than in a reviewer's head, and the queue item ships red
by design.

## 3 (Minor, FIXED) - `\bn't\b` can never match

> In every English contraction the character immediately before `n` is itself a word character, so
> there is never a boundary there - `\bn't\b` cannot match inside any real contraction.

**Taken and FIXED.** Inert since written. Now `n['\u2019]t\b` with no leading boundary, both
apostrophes, pinned by a test.

## THE FINDING BEHIND THE FINDINGS - why the tests missed all of this

The agent's own diagnosis, quoted because it is the most useful thing in either round:

> Both `tests/api-insight.test.js`'s "meaning half" and `tests/insight-parity.test.js`'s table
> exercise only a synthetic `'Beef, up 18% across 5 plates, is most of it.'` fixture (matching
> `insCostBase`'s *prose shape* but tested with `facts` that were written for the test, not lifted
> from the real function) ... so the mismatch between what those functions put in `facts` and what
> their `text` actually names was never exercised.

**That is CLAUDE.md's roster shape one level up: a fixture written from the same belief as the code
agrees with it.** My "Beef, up 18%" sentence looks like `insCostBase`'s output and is not - the real
function puts no name in `facts` at all - so every name-swap assertion was true of a fixture nobody
ships.

`tests/insight-real-templates.test.js` is the answer: it builds each family with the REAL builder and
threads its actual `{facts, text}` through the validator.

---

# What the mutation gate found behind both rounds

Listing these functions as targets (they are in `js/app.js`, so unlike batch 213's portal the gate can
reach them) immediately exposed a gap neither review named:

**With a template present, the meaning checks SHADOW the fact-set check.** A hallucinated `$99` is
rejected by the skeleton before the set ever matters, so `var ok=false` could be flipped to `true` -
disabling number validation outright - and every template-bearing test stayed green. The no-template
client path had no test at all. Six survivors closed; the last is allowed with a proof that it is a
provable no-op rather than an unlikely one.

The epsilon was written out three times and is now one named helper, pinned at its boundary. **That
test needed `(0, 0.005)` and not `(20, 20.005)`**, because `20.005 - 20` is `0.004999999999999005` in
binary floating point and sits inside an exclusive tolerance - the obvious pair cannot see the
distinction at all.

# And one I found myself, probing rather than waiting

Nested section names: `Mains` is a substring of `Mains & Grills`, so matching each name independently
counted the short one twice and the comparison only came out right because the spurious entry
appeared on BOTH sides. An accident, not a property. Longest-match-first with no overlapping claims.

---

# Round 3 — run after the smoke suite came back red

Reviewed-commit: ab4df05
Model: Sonnet (the batch ran as Opus; the review is forced onto a different model, and was not shown the brief).

## Why there was a third round at all

`npm run smoke` failed two assertions on this branch. A clean worktree at `origin/main` was green, so
the branch introduced it — the batch had run `npm test` and the mutation gate, neither of which
includes smoke. **The hook would have caught it; `npm test` alone did not.**

The cause was not a stale fixture. `validatePhrasing` now requires the figures in template ORDER,
while `buildInsightPrompt`, in the same file, still said *"FRONT-LOAD the fact"* — which on an
aggregate-first template asks for exactly the reordering the validator throws away. Measured on
hand-written faithful rewordings: **4 of 10 rejected, every one a clause reorder**, and a rejection is
invisible because the template is the fallback.

**A binding-to-names-or-units scheme was considered and rejected.** `insDrift` renders "lifts it from
25% to 40%" — two bare percentages, no name between them, no unit word, same symbol — so ORDER is the
only signal separating it from "from 40% to 25%". Relaxing the order rule would have accepted a plate
that got worse being reported as improving. The rule is right; the prompt was wrong.

## Findings — verbatim

**1. Major (confidence: high on the fact, medium on the consequence) — the prompt still contains the
contradiction the commit claims to have resolved.**
`api/_insight.js:301` — the original `'- FRONT-LOAD the fact and cut the wind-up. Aim for 12–20
words...'` line is **untouched** by this diff. The new instruction at `api/_insight.js:317-319`
(`'KEEP THE FIGURES IN THE ORDER GIVEN... Front-load by leading with the SUBJECT, never by moving a
number past another.'`) is a separate, later bullet that never references or amends line 301. The
commit message asserts *"front-loading is kept as an instruction to lead with the SUBJECT rather than
by moving a number"* as if the original bullet were redefined — but `git show` confirms it wasn't
edited at all. A model reading the prompt top-to-bottom sees two different "front-load" instructions
with no cross-reference: one that (on its most natural reading, "front-load the fact") invites putting
a number first, and one later that forbids exactly that when it would reorder figures. Compounding
this, the unmodified `'Vary your sentence shapes — do not open every line the same way (never start
them all with "X is N pts over")'` (line 303) explicitly discourages the one restructuring pattern
(number-first) guaranteed to preserve order on aggregate-first templates like `insCostBase`. So the
fix adds a rule saying "don't move numbers" without ever reconciling it against two pre-existing,
unedited rules that push the model toward exactly the reordering it forbids. Whether this reduces the
model's real-world rejection rate from 40% to some lower-but-nonzero number can't be settled
statically — but the textual contradiction the commit says it fixed is still there verbatim.

**2. Minor, but a clear instance of this project's worst-recorded failure class — a wrong comment
describing test coverage that does not exist.**
`tests/smoke.js:756-763` — the comment says *"The reordered form is asserted below as a REJECT, so the
strictness is pinned rather than merely accommodated: if someone relaxes the check back to set
membership, that assertion goes red instead of this one silently starting to pass again."* Grepped the
whole file (and the diff): **no such assertion exists in `tests/smoke.js`.** The old reordered fixture
string is nowhere in this file, mocked or asserted against. The actual pin against relaxing
`skeletonIsSubsequence` lives in `tests/insight-real-templates.test.js` (verified by hand: reverting
the ordering guard turns `'REAL insDrift: swapping the from/to percentages is caught by ORDER ALONE'`
red) — a different file the comment never names. Worse, it's not just imprecise: the current smoke.js
fixture (`tests/smoke.js:767`) doesn't reorder any figures, so **relaxing the validator back to
set-membership would not change this test's outcome at all** — smoke.js provides zero protection
against the exact regression this comment claims it pins. That's precisely the "test that cannot fail"
shape CLAUDE.md's roster is built around, except here it's a comment falsely claiming a guard is
present rather than a guard that silently can't fail.

**3. Nit.** `tests/smoke.js:707` (deterministic template, unmodified) says `"...than at April
prices..."`; the new candidate fixture at `tests/smoke.js:767` says `"...than March..."`. Not a
functional bug (month text isn't validated), but it's an internally inconsistent fixture — reads like
it was adapted from a different insight's `sinceLabel` example without checking against the template
it's actually being validated against in this test.

## What the reviewer checked and found correct

- The two new `insDrift` tests genuinely execute the real function (guards `d.up>=0.20` and
  `d.toPct-d.fromPct>=2` both satisfied, so `[0]` is never `undefined`), and it confirmed by mutation
  that the swap test goes red when `skeletonIsSubsequence` is disabled — not vacuous. The `’`
  matches the character `insDrift` emits.
- The `tests/smoke.js` fixture passes the CLIENT validator when checked against the smoke file's own
  stubbed template (not the real `insCostBase` output, which differs), and all three assertions that
  read it match the new text.
- The new prompt-pin test is tautological in the literal sense but matches the established pattern in
  that file and would fail if the instruction were deleted — not a new defect.

## Decisions

**1 — FIXED.** The reviewer is right and the commit message overstated what the diff did. Both
pre-existing bullets are now amended at their own sites: `FRONT-LOAD` says to lead with the SUBJECT
(the plate, section, product or supplier) and not by moving a figure forward, and the vary-your-shapes
rule now asks for variety in wording rather than in figure order. A new test,
*"the FRONT-LOAD and vary-your-shapes rules do not contradict the ordering rule"*, pins the
reconciliation at the two sites that carried it — mutation-checked by deleting only the front-load
amendment, reproducing the reviewer's exact finding as a red test.

**2 — FIXED.** Confirmed by grep before acting: the string appears in this repo only inside my own
comment. The comment now says plainly that smoke.js does NOT pin the ordering rule and could not
notice it being relaxed, names `tests/insight-real-templates.test.js` as the real pin, and states what
the smoke assertion actually proves (that a valid phrasing reaches the live DOM node and reveals the
credit). Writing a comment that claims a guard which does not exist is the failure this file's own
roster is built around, and it went in during the round fixing that same class.

**3 — FIXED.** The fixture now reads "than at April prices", matching the template it is validated
against.

## The residual, filed rather than half-built

The 4-of-10 measurement is from sentences written by hand, not sampled from Gemini. It shows the check
forbids a natural class of rewording; it is **not** a production reject rate. `docs/MAINTENANCE.md`
records that, records that a rejected line is not free (the POST has already sent the café's costing
data to Google and spent the quota — only the words are discarded, which qualifies the neighbouring
entry's claim that rejection "costs nothing"), and says what would settle it: instrument the endpoint
and count. A high reject rate would be an argument for a better prompt, never for relaxing the check.
