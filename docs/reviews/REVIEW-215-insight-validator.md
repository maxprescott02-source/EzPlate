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
