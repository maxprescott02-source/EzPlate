# REVIEW - 236 (item 12: a quantity-first carton line halves the unit cost)

Reviewed-commit: 11359cc
Reviewer: `code-review` agent on **Sonnet** (claude-sonnet-5), diff of `fix/carton-qty-first-repro` against `main`, no brief shown.
Fix commit after the review: see `docs/handovers/HANDOVER-236-carton-qty-first.md`. Every finding below was taken.

## Findings, verbatim

### 1. CRITICAL — the guard's fold-check reads a different string than the one that produced the price it's checking

`js/app.js:10681` — `var w=packWeight(row.name);`

`invQtyFirstRebase` re-derives `packWeight` from `row.name` to decide whether the original parse actually folded `k` into the denominator (`w.factors[0]!==k` guard, line 10682). But `parsePdfLine` (line 10612) computed the row's real `unitPrice`/`unit` from `packWeight(line)` — the **whole raw line**, not the name-only substring. `packWeight` picks the *last* weight/volume-unit match in whatever string it's given (line 10563-10564), so on any line where a kg/L token appears a second time **after** the first money value (a trailing "net weight" / "total kg" column — plausible on invoices for variable-weight meat/produce, which is exactly the product category in this diff's own fixture, "Beef Mince"), the two computations of `packWeight` diverge, and the multiply-by-`k` step gets applied on top of an already-differently-derived price.

Reproduced:
```
node -e "
const {parsePdfLine, invQtyFirstRebase, packWeight} = require('./tests/_extract.js');
var line = '2 CTN Beef Mince 6 x 1kg 60.00 60.00 120.00 12.0kg';
var parsed = parsePdfLine(line);           // unitPrice: 0.41666... (parser's own bug, picked '12.0kg' as the weight)
console.log(invQtyFirstRebase(Object.assign({}, parsed)));
"
# -> { unitPrice: 0.8333333333333334, unit: 'kg', needManual: false, ... }
```
Correct answer is $10/kg. The row ends up at $0.83/kg — worse than the parser's own pre-existing bug (0.417) and worse than the case this PR exists to fix — with `needManual:false`, i.e. pre-ticked and applied silently. The third gate (`k*P===T`, line 10689) does nothing to catch this because it only checks the raw money figures against each other; it never re-validates that the `w` used for the multiply is the same `w` that produced `row.unitPrice`.

The test file's own comment at `tests/inv-qty-first.test.js:96-99` states the false premise that lets this through: *"If the NAME the weight was computed from carries no leading qty, there is nothing to undo"* — the weight was **not** computed from `name`, it was computed from the full `line`/`raw`. That wrong belief is baked into the one test aimed at exactly this divergence, so it only exercises the harmless direction (name missing the prefix) and never the dangerous one (raw containing a second weight token the name doesn't).

Confidence: mechanism is measured, not reasoned (reproduced above). Real-world frequency on Scoopy's actual Bidfood invoices is unverified — I have no real invoice sample showing a trailing weight column — but the code path is real and reachable by construction, not hypothetical.

**Decision: TAKEN, and its repro was run first — reproduced exactly.** This is `CLAUDE.md`'s own *"a guard that recomputes the write's answer is a stub of it"* rule, which the function's comment CITED while breaking it: calling the region's real function with a **different argument** is the same defect as copying it. The guard now asks `packWeight` for BOTH strings and refuses the row when they disagree, so it can never verify a fold that did not price the row.
⚠️ **The finding also exposes a PRE-EXISTING defect that is not mine and is worse than the one this item fixes:** on that line the parser ALONE returns **$0.42/kg where the truth is $10/kg**, silently, pre-ticked. It is inside the protected region. Filed as a new queue item (A) rather than fixed here; this function's job was only to stop making it worse, and a test now pins that it does not.

### 2. MAJOR — the arithmetic gate can't tell "purchased-carton count" from "cartons-per-case composition," and resolves the ambiguity by flagging previously-correct rows

`js/app.js:10676-10692`. A line whose leading `k CTN`/`case`/`box` genuinely describes the pack's own composition (e.g. a single case containing 6 cartons of 2kg each, sold as qty=1, unit price repeated as the line total per the parser's own documented "qty-1" convention) gets the fold undone and flagged `needManual:true`, even though the original price was already correct.

Reproduced:
```
parse('6 CTN 2kg Chicken 12.00 12.00')
// before this diff: unitPrice: 1, needManual: false   (correct: $12 / 12kg = $1/kg)
// after this diff:  unitPrice: 1, needManual: true     (price unchanged, but now unnecessarily flagged)
```
The function's own comment (10662-10665, "the parser's answer might be right... a loud row beats either silent guess") shows the author knew this ambiguity exists and chose to fail safe (flag, not mis-price) — so this is a *documented* tradeoff rather than a silent-wrong-data bug, and it doesn't corrupt the stored price. But it is a real regression on rows that previously worked with no human involvement, and it's undetected by the test suite (no test exercises a `k>=2` composition-only, single-purchase line).

**Decision: TAKEN, and it improved the design rather than patching it.** The reviewer's fixture exposed that the whole "flag when unconfirmed" branch was wrong for the commonest shape: when the repeated pair IS the line total (`P===T`), there is no purchased-quantity column at all, so the price already covers the whole folded weight and the parse is CORRECT. The function now returns those untouched, and only flags a line whose total is neither `P` nor `k*P` — genuinely unaddable arithmetic. Two of my own tests asserted the wrong behaviour here and were rewritten.

### 3. MINOR/PROCESS — the `^` anchor, the single most safety-critical part of the entry regex, is completely unpinned by the test suite, and structurally can't be caught by the mutation gate either

`js/app.js:10678` — `/^\s*(\d{1,3})\s*(?:ctns?|cartons?|cases?|boxe?s?)\b/i`. Removing the `^` anchor entirely leaves all 14 tests in `tests/inv-qty-first.test.js` green:
```
# anchor stripped to: /(\d{1,3})\s*(?:ctns?|cartons?|cases?|boxe?s?)\b/i
node --test tests/inv-qty-first.test.js   # 14/14 pass, 0 fail
```
Two tests explicitly claim to cover this — `'a mid-line quantity never matches...'` and `'composition-first (Bidfood) layout is untouched...'` — but neither fixture contains a digit-immediately-followed-by-container-noun pattern *anywhere* in the line, so both pass identically whether the match is anchored, unanchored, or removed altogether. This is the project's own named defect class ("a test that cannot fail for the reason its title claims"). Additionally, `tests/mutation/mutate.js` masks regex literals out of mutation entirely, so `npm run mutate` can never generate this mutant — only a human/adversarial read catches it.

**Decision: TAKEN.** A fixture whose leading pack factor equals a mid-line `k CTN` now pins the anchor directly; hand-running the anchor removal turns it red (measured, 16/17 with one failure). The comment at the fixture says it is contrived on purpose and why a realistic line cannot do this job — and records that the mutation gate structurally cannot generate this mutant, which is the part a future reader needs.

### 4. Minor — fixed 1-cent tolerance doesn't scale with `k`

`js/app.js:10689`, `Math.round(Math.abs(k*P - T)*100) <= 1`. For a large legitimate multi-carton purchase where `P` is itself a rounded 2-decimal display figure, `k*P` vs. the true `T` can legitimately drift by more than a cent as `k` grows, causing a correct rebase to be needlessly flagged rather than confirmed. Safe direction (flags, doesn't mis-price); not a correctness bug, just a false-negative on the confirm path.

**Decision: TAKEN.** The budget is now `k` cents — one cent of rounding per container, which is what the drift actually is — and the boundary fixture moved to a 2-carton line two cents out.

### Checked and clean (reviewer's words, condensed)

- **Complete set of ingestion paths**: `pdfTextToRows` has exactly one call site (the one hooked). The manual-paste/CSV path is a structurally different parser with no `packWeight` call at all — not a gap.
- **AI referee**: cannot silently overwrite a confirmed rebase. `gemMergeLine`'s only price-mutating branch fires when the parser's price is `null`; otherwise it can only keep or flag. Verified by reading both functions in full.
- **GST handling**: the rebase runs pre-conversion on numbers consistently GST-inclusive-or-not on both sides of the ratio; the single conversion point runs after and is unaffected.
- **Mutation/immutability**: mutating the row and returning it matches the codebase convention; the only call site maps over a freshly-built array with no caller relying on the originals.
- **Negative/credit lines**: `-2 CTN …` never matches the entry regex and passes through untouched.
- **Six cache-version spots**: all agree at v194.

## After the fixes

19 tests in `tests/inv-qty-first.test.js`; full suite 1849 green; smoke green; `npm run mutate` exits 0 with every `invQtyFirstRebase` mutant killed except one **written allowance** — the `!w.factors` null-safety half, proven unreachable by probe (the anchored regex's noun list is a subset of `packWeight`'s multiplier alternatives, so `factors[0]===k` whenever the anchor matched). Two of the three survivors the gate found after the rework were killed by new fixtures, one of which prevents a `TypeError` that would have broken a whole import.
