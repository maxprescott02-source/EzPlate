# REVIEW-261-parser-corpus-eval

Reviewed-commit: 82d767c

`code-review` agent, Sonnet against Opus, on `git diff main...HEAD`.

**Four findings. Three fixed, one fixed as a message change.** The first is this repo's most-recorded
defect class, committed by the batch whose entire subject was measuring rather than asserting.

⚠️ **The first attempt at this review died on a spend limit** (`rate_limit`, HTTP 429, Sonnet) and
was re-run after the session limit reset. It was not skipped, and the push was held until it ran —
`CLAUDE.md`'s rule is that the review is not skippable, and a hard API failure is not an exemption.

---

## The report, verbatim

## Findings

**1. `docs/MAINTENANCE.md` and `docs/QUEUE-2026-09-08-CONSOLIDATED.md` both make a false claim about test coverage: "both pinned in that test."**

- Severity: **major** (documentation/audit-trail integrity, in a repo where this exact failure mode — a comment claiming coverage a test doesn't have — is the single most-recorded defect class).
- What's wrong: Both docs assert that the two real divergences between `packToUnitCost` and the other three pack-division copies are "pinned in the test" / "Both are pinned in the test so the eventual merge has to choose deliberately rather than silently":
  - `docs/MAINTENANCE.md:1261-1263`
  - `docs/QUEUE-2026-09-08-CONSOLIDATED.md:308-311` (and again in the same wording via the item-93 split)
  In fact `tests/pack-arithmetic.test.js` only pins **one** of the two divergences — the `isNaN`-accepts-`Infinity` case (test at line 157). The unit-casing divergence (`packToUnitCost` compares `unit==='kg'` without `.toLowerCase()`, unlike `derivePackPrice`/`applySupplierMemory`/`resolveMatchedPrice` which all lowercase first) is described only in prose and is **not exercised anywhere** in the test file — `PACKS` (lines 86-90) contains only lowercase unit strings, and no test constructs an uppercase unit.
- How I verified it: read `tests/pack-arithmetic.test.js` in full (no `'KG'`/`toUpperCase` anywhere), then drove the extracted real functions directly:
  ```
  api.packToUnitCost(2,'KG',14.9)  -> base_unit:'ea', cost_per_base_unit:7.45   (ea/count branch)
  api.packToUnitCost(2,'kg',14.9)  -> base_unit:'g',  cost_per_base_unit:0.00745
  api.derivePackPrice(raw,2,'KG')  -> {unitPrice:7.45, unit:'kg'}               (agrees with lowercase case)
  ```
  This confirms the divergence is real (a genuine 1000x error in `cost_per_base_unit` if it were ever reached) and confirms it is currently invisible to the standing test — so if a future edit changed or removed `packToUnitCost`'s guard, or if a data path ever supplied an uppercase `pack_unit`, this specific regression would ship green.
- Confidence: high — directly executed and reproduced.

**2. `docs/PARSER-CORPUS.md` documents a `--csv` flag that does not exist in `tests/parser-corpus/run.js` and crashes when used as documented.**

- Severity: **major** (this is a procedure doc whose job is to be run verbatim; a wrong command in it is exactly what priority 3 asks to catch).
- What's wrong: `docs/PARSER-CORPUS.md` ("Running it" section) states: `` `--json out.json` writes the scores for diffing; `--verbose` prints every line; `--csv` is the same table as CSV. `` `run.js`'s argv parser (lines 168-175) only recognizes `--cases`, `--products`, `--json`, `--verbose`; anything else — including `--csv` — falls into the `else dirs.push(argv[i])` branch and is treated as a case directory to scan.
- How I verified it: ran `node tests/parser-corpus/run.js --csv`, which throws `Error: ENOENT: no such file or directory, scandir '--csv'` and crashes with a stack trace rather than printing a CSV table.
- Note: the false `--csv` claim originates in `run.js`'s own header comment (pre-existing, not part of this diff), but this diff's new `docs/PARSER-CORPUS.md` repeats it as an operational instruction to a future reader, which is what makes it a defect introduced by this branch rather than something merely inherited.
- Confidence: high — reproduced directly.

**3. `tests/pack-arithmetic.test.js` — the test itself is sound; it is not a vacuous/unfalsifiable test.**

- Verified by mutation: individually broke each of the four shipped functions (`applySupplierMemory`'s gram factor, `resolveMatchedPrice` branch 2's gram factor, `packToUnitCost`'s gram factor, and `packPriceOf`'s `lineColumns`-first ordering) and confirmed the suite goes red each time with a specific, correctly-attributed assertion failure (not a generic crash).
- The grid genuinely can't be satisfied vacuously: the test separately asserts `answered === 48` and `refused === 16` (not just pairwise agreement), which forecloses the "all four refuse identically" escape the file's own comment calls out (CLAUDE.md roster 205's shape).
- All five unit branches (kg, g, l, ml, ea) and both refusal branches (zero, negative) are exercised, and the fallback path of `packPriceOf` (line with no `lineColumns` match, `'FLOUR 25KG BAG 32.75'`) is included in the grid.
- The four factual claims I could check against `js/app.js` are all true: `packPriceOf` asks `lineColumns` first and falls back (line 12359); `resolveMatchedPrice` branch 2 (12426-12434) and `packToUnitCost` (2609-2614) each carry an inline duplicate of the division; `packToUnitCost` alone uses `isNaN(price)` (2611) vs. `isFinite` elsewhere; and `packToUnitCost` alone doesn't lowercase `unit` before comparing (confirmed above). The "unreachable" reasoning (`catNum`'s strip-then-`isFinite`, and the browser's own sanitizing of `1e400`/`1e309` on a `type="number"` field) is consistent with `catNum`'s code and is asserted, for the strip half, directly in the test.
- No finding here beyond #1 above (the coverage claim about the *second* divergence).

**4. `tests/queue-routing.test.js` message rewrite — accurate for the observed case, but drops the previous message's alternate diagnosis.**

- Severity: **minor**.
- What's wrong: the condition is unchanged (`all.length >= 3`), and the new message asserts confidently that a failure means "the working set has been drained without a refill" and instructs the reader to "Promote the next group's items rather than lowering this floor." The old message explicitly named a second possible cause — the heading-format becoming unparseable ("the check below finds none and passes for that reason"). The new message drops that alternative entirely. If a future edit ever breaks `queueItemNumbers`'s heading regex (e.g., a format change to `## next N ·` headings), this same assertion would still fire, but the message would send a reader to "promote queue items" when the real defect is a parsing regression elsewhere in the same test file — a wrong-diagnosis message, not a wrong-data or silent-failure bug.
- The accompanying comment (lines 78-87) is honest about this being a deliberate, self-aware trade ("Both readings are true of the assertion; only one of them tells the next reader what to do") — so this isn't a hidden overclaim, but the resulting message text is narrower than the condition it decorates, which is the shape this repo has flagged before ("a comment can record the defect correctly and file it under the wrong consequence").
- Confidence: high on the mechanism (read directly), moderate on how much it matters in practice (it only degrades the message shown in an unlikely secondary failure mode; the test's pass/fail behavior is unaffected).

**5. `docs/QUEUE.md` / `docs/QUEUE-GROUPS.md` refill bookkeeping** — cross-checked (item 37 struck and split into 93, G2 marked exhausted, items 46/57/58/60 promoted into G4 and correspondingly marked in QUEUE-GROUPS.md). No inconsistency found between the two files' claims about what's promoted/struck.

No findings in: the `#buildSandbox`/extraction plumbing shared between `tests/pack-arithmetic.test.js` and `tests/parser-corpus/run.js` (both slice the same real parser region and produce results consistent with hand-driving the functions directly); the fixtures schema described in `docs/PARSER-CORPUS.md` against `tests/parser-corpus/fixtures/README.md` (accurate); the `extract-pdf.mjs` instructions (accurate, version matches `tests/third-party-pins.test.js`'s pinned `4.10.38`).

---

## What was done about each

### Finding 1 — FIXED, and it is the one that matters

**The claim was false and I wrote it twice**, in two files, about a test I had written in the same
hour. The reviewer read the test; I had read my own intention.

`tests/pack-arithmetic.test.js` now pins the casing divergence for real, and the pin is built so it
cannot pass by accident: it asserts the branch each casing takes, asserts **the ratio is exactly
1000x** — which is what makes the error invisible, since the number stays plausible — and then hands
the same uppercase unit to the other three and asserts they are unmoved. Without that last half the
test would pass if every copy were equally broken.

**Proved it can fail:** adding `.toLowerCase()` to `packToUnitCost` — i.e. *fixing* the divergence —
turns it red. The test observes the behaviour rather than asserting nothing.

⚠️ **It pins behaviour that is WRONG, deliberately, and says so at the site.** Fixing it would ship
a client asset and a version bump for a change nobody can observe: measured 12 Sep 2026, all 23
non-null `pack_unit` rows on production are lowercase, and both writers can only produce lowercase
(the form's `<select>` values are literally lowercase; `catUnit` lowercases and maps through
`CAT_UNITS`). What the pin buys is that the eventual merge has to **choose** — lowercasing in the
shared core is almost certainly right, and it must be a decision with this test updated in the same
commit, not a silent side effect of tidying.

The file header said "ONE real divergence" and now says two.

### Finding 2 — FIXED AT BOTH ENDS

The doc's sentence is gone and replaced with what actually happens: there is no `--csv`, and an
unknown flag is not rejected — it falls into the `else` and is read as a **case directory**, so it
crashes on `scandir '--csv'`.

**`run.js`'s own header is corrected too**, which is where the claim came from. Fixing only the doc
would have left the next reader to rediscover it from the file the doc points at.

⚠️ **The verification that missed this is the part worth recording.** I checked the doc's flags by
running `grep -o "\-\-[a-z]*" tests/parser-corpus/run.js` and got five, including `--csv` — because
the grep matched the **header comment**. That is `CLAUDE.md` roster 183(a), *a grep over source
searches PROSE as well as CODE*, biting inside the check run specifically to avoid it. The header
now says to read the parser, not the header.

### Finding 3 — no action, and the independent mutation is the useful half

The reviewer broke all four shipped functions itself rather than taking the file's word for it. I
had run the same check (five mutants, all killed) before the review; two independent mutations
agreeing is worth more than either.

### Finding 4 — FIXED

Fair, and the narrower message is exactly the shape this repo keeps recording. The message now names
**both** diagnoses, says which is likely, and gives the one-step test that tells them apart: open
`docs/QUEUE.md` and count the `## ` headings by eye — three or more means the regex is the defect,
not the queue.

### Finding 5 — no action, bookkeeping confirmed

**After the fixes: `npm test` 2234 pass / 0 fail; smoke green; corpus unchanged at 63 right / 2
silent-wrong / 0 unflagged leaks.**
