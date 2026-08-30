# REVIEW - 223 (two more insight families publish their subject)

Reviewed-commit: 6790f08e66ec6a0d319456d520c5ae93cbc06144
**Agent:** pre-push `code-review`, Sonnet against Opus 5 (a different model from the one running the batch).
**Diff:** `git diff main...HEAD` at that commit. The agent was not shown the queue item or the plan.

---

## The report, verbatim

### Finding 1 — Major. The word-boundary fix only closes the *mid-word* substring hole; the *prefix-of-a-different-name* hole is left open, undocumented, and defeats the exact protection this diff exists to add.

`startsAtWordBoundary`/`gemStartsAtWordBoundary` require a match to *start* at a word boundary but deliberately do not require it to *end* at one ("English inflects at the end of a word... the trailing edge deliberately is not [checked]"). That's correct for inflection (`Tomato` → "Tomatoes"), but it also means a name is "present" in the candidate whenever it is a leading substring of *any* longer word or phrase in the candidate text — including the name of a genuinely different, unrelated entity that merely starts with the same letters and is followed by more text (a space plus another word counts, since only the character immediately before the match position is checked).

I confirmed this against the real functions on both sides (`api/_insight.js` and the extracted `js/app.js` copy), using the same `Rice` ingredient the diff's own comments use as the *worked example* of the bug it fixes:

```
$ node -e "
const X = require('./tests/_extract.js');
const I = require('./api/_insight.js');
const ins = X.insVolatility([{ name: 'Chowder', cost: 5, menuPrice: 15, hasRange: true,
  costMin: 3.9, costMax: 5.7, volatileIng: 'Rice' }])[0];
const swapped = ins.text.replace(' Rice prices', ' Rice Noodles prices');
console.log(I.validatePhrasing(swapped, I.factNumbers(ins.facts), ins.text, I.factNames(ins.facts)));
"
Chowder swings 26–38% with Rice Noodles prices — your least predictable plate.
```

`validatePhrasing` (and the client's `gemPhrasingOk`, verified identically) accepts the rewording. `Rice` and `Rice Noodles` are two different products in a real supplier catalogue; the sentence now blames the wrong one, and every figure/symbol/direction check passes because `nameSequence` records the matched token as the *known name string itself* (`"rice"`), never what actually follows it in the candidate text — so `Rice`, `Rice Noodles`, `Rice Bran Oil` etc. are indistinguishable to `namesAllPresent`. The same holds for `Cream` → `Cream Cheese`, `Chicken` → `Chicken Breast`, `Tomato` → `Tomato Paste` — all ordinary compound product names of exactly the kind CLAUDE.md says this codebase's real (Bidfood) catalogue contains.

This is not a pre-existing, already-accepted gap: it's distinct from the one gap the diff *does* document (`docs/MAINTENANCE.md`, "A name IDENTICAL to a word in the template's own prose still defeats the name check" — that's about the name colliding with the template's fixed boilerplate, e.g. a plate named "Point"). Nothing in the diff's comments or in `docs/MAINTENANCE.md` acknowledges that the trailing-edge-open design also lets a candidate substitute one real entity for a *different* real entity sharing a name prefix — which is precisely "changes... WHICH ENTITY the sentence is about," the failure class this validator's whole job is to reject. The comment's claim that leaving the trailing edge open "costs nothing" is not accurate; it costs exactly this, silently.

Confidence: high — mechanism verified by running the real, unmodified functions from both copies, not reasoned about.

How to verify: run the two `node -e` snippets above (or the client extraction via `tests/_extract.js`-style pull of `gemNameSequence`/`gemPhrasingOk`) against `main`'s successor commit; `validatePhrasing`/`gemPhrasingOk` return the swapped text rather than `null`/`false`.

### Finding 2 — Nit. `NAME_WORD_CHAR`/`GEM_NAME_WORD_CHAR` (`/[0-9a-zÀ-ɏ]/i`) includes two non-letter symbols.

The comment says "Latin-1 and Latin Extended letters count as word characters," but the Latin-1 Supplement block (`À`–`ÿ`) also contains `×` (U+00D7) and `÷` (U+00F7), which the range includes as "word characters" even though they aren't letters. In practice this is very unlikely to be hit (café template prose and product names are unlikely to butt a name directly against `×`/`÷` with no separating space), so I'm not raising it above nit level, but it's a real mismatch between the stated intent and the implementation.

### Everything else checked and found correct

- The two copies (`nameSequence`/`gemNameSequence`, `startsAtWordBoundary`/`gemStartsAtWordBoundary`) are textually identical in logic; parity verified by direct extraction and by `tests/insight-parity.test.js`, which calls the real extracted functions (not stubs) and would fail on an inverted guard.
- `insVolatility`'s conditional `vf.volatileIng` and `insNearCluster`'s conditional `facts.name`/`facts.name2` are correct for every branch I traced (no name, one name, two names with a remainder, two names with no remainder) — they publish exactly and only the names the emitted `text` prints, in the order the text prints them (which matters because `factNames`/`gemFactNames` rely on object key insertion order matching sentence order).
- Tests added (`tests/insight-real-templates.test.js`, `tests/insights.test.js`) call the real builders and the real validator end-to-end rather than hand-rolled fixtures, so they don't fall into this repo's "stub disagrees with the code" trap; they would fail if the leading-boundary guard, the tie-break (`swing<=bestSwing`), or the conditional-fact guards were inverted or dropped.
- The new functions sit well outside the protected parser region (`INV_EXCLUDE`…`unitLabelFor`) and outside `resolveMatchedPrice`/`unitCatCategory`/`applySupplierMemory`/`packToUnitCost`.
- No duplicate top-level declarations introduced (`grep` for the four new top-level names found exactly one definition each); `npm test` is green (1788/1788), and `node tests/mutation/run.js --base main` exits 0 with all 26 survivors matching existing/new documented allowances.
- All six cache-version spots (`index.html` ×2, `sw.js` `CACHE` + 2 asset URLs, `js/app.js` `APP_VERSION`) agree at `v183`.
- No migration is implied by this diff.

Relevant files: `api/_insight.js`, `js/app.js`, `tests/insight-parity.test.js`, `tests/insight-real-templates.test.js`, `tests/insights.test.js`, `tests/mutation/targets.js`, `docs/MAINTENANCE.md`.

---

## What was done about each

### Finding 1 — the DEFECT is real and confirmed; TWO of its supporting claims are not.

**Reproduced exactly as written.** `Rice` -> `Rice Noodles` is ACCEPTED by both copies.
`CLAUDE.md`: *"NEVER DISMISS A FINDING BECAUSE ITS STATED CAUSE IS WRONG... Go and look at what it was
pointing at."* Both corrections below were measured before being written, and neither reduces the
finding: it is the most valuable thing this review produced.

**Correction 1 — the open trailing edge is not the cause, and closing it does not fix this.**
The character after `Rice` in "Rice Noodles" is a SPACE, which satisfies a trailing boundary exactly
as it satisfies a leading one. Measured with a strict trailing edge in place: "Rice Noodles" is
**still matched**, and `Tomato` stops matching "Tomatoes". So the remedy the finding implies buys
nothing and costs a real class of good sentence.
This matters because the finding, left as written, sends the next reader to close the trailing edge.

**Correction 2 — it is not new in this branch.** Measured on `main`: `insCostBase` has published a
bare name since 220, and "Beef" -> "Beef Mince" is accepted there. It affects every family that
publishes a name, which after this batch is all eight.

**The comment's "costs nothing" was an overclaim and is fixed.** That half of the finding is
accepted without qualification. Both copies now state the real scope of the boundary rule, name the
prefix limit, and record why closing the trailing edge is the wrong answer.

**Fixed in this branch:**
- both validator copies' comments corrected, with the measurement.
- `docs/MAINTENANCE.md`'s entry rewritten to hold BOTH limits, with the prefix case ranked as the
  wider of the two (it needs nothing unusual of the café, only a model that elaborates a name), and
  both wrong claims recorded so the wrong remedy is not reached for.
- **`tests/insight-parity.test.js` now PINS the gap** the way this repo pins the inverted-recommendation
  gap: it asserts the current ACCEPT in both copies, so closing it turns the test red and forces the
  doc update. It also asserts the two facts that make the obvious remedy wrong.
  Verified red: with a strict trailing edge applied, that test and the inflection test both fail.

**Not fixed here, deliberately.** A real fix needs the builders to publish WHERE a name sits rather
than only what it is - a change to `facts` across all eight families. That is its own item with its
own measurement, not a rider on this one, and it is C by the queue's tier test: the deterministic
template is always the fallback and names the right product.

### Finding 2 — accepted and fixed.

Correct as stated. `À-ɏ` spans U+00D7 (×) and U+00F7 (÷), which are math symbols, not
letters. Both copies now use `[0-9a-zÀ-ÖØ-öø-ɏ]`, and the comment says
why the two holes are there. Verified: × and ÷ no longer count as word characters; é and î still do.

### The "everything else" section

Its `npm test` count of 1788 was taken mid-review and is 1789 after the fixes above.
No other claim in it was contradicted by anything found afterwards.
