# REVIEW-256-parser-arithmetic

Reviewed-commit: 217c394b8f92fe677f3b14a38f021a818bc1a2d2

`code-review` agent, run on a different model from the batch (Sonnet against Opus), on the branch
diff `git diff main...HEAD`, with no sight of the queue item, the audit or the plan.

**Two findings, both REAL, both reproduced against the real extracted functions before anything was
changed, and both fixed in this branch.** The agent's report is pasted verbatim below; what was done
about each follows it.

---

## The report, verbatim

## Review of `fix/parser-arithmetic` vs `main`

I read the full diff, ran the suite (2162/2162 pass) and the new parser tests (113/113 pass), then traced every caller of the functions the diff touches, not just the diff itself.

### 1. CRITICAL — the new credit/negative-amount guard only protects the parser's own derivation; every downstream re-pricing path ignores it and can silently store a wrong price for a credit line

`js/app.js`, `moneyMatches` (~12000) now tags each amount with `.neg`, and `parsePdfLine` (~12201) refuses to price a line if any amount is negative:
```js
if(monies.some(function(mo){ return mo.neg; })) return manual('credit');
```
`.neg` is consulted in exactly three places in the whole file — all inside `lineColumns`/`parsePdfLine`. It is never read by `firstPairPrice`, `packPriceOf`, `derivePackPrice`, `resolveMatchedPrice`, or `applySupplierMemory` (verified with `grep -n '\.neg\b' js/app.js`). All of those re-derive a price straight from `row.raw` via `packPriceOf`→`firstPairPrice`, which does `parseFloat(m[4]...)` — the digit group only, sign stripped — and picks the first equal adjacent pair with `val>0`.

`buildInvRows` calls `resolveMatchedPrice(row, product, mem)` whenever the row matched a product, and calls `applySupplierMemory(row, mem)` whenever `row.needManual && mem` — both completely independent of *why* `needManual` was set. A credit note line for a product that already has a taught pack (`product.pack_qty`/`pack_unit`) or a remembered supplier phrase will have its `needManual:true, basis.kind:'credit'` silently overwritten to `needManual:false` with a price computed from the credit's own magnitude.

Reproduced directly against the real functions:
```js
const { parsePdfLine, resolveMatchedPrice } = require('./tests/_extract.js');
const line = '13612 FZ CHIPS - S/CUT 10MM GF 6X2KG GARDEN LAND -2.00 -2.00 CTN $29.50 $-59.00';
const row = parsePdfLine(line);              // needManual:true, basis.kind:'credit'  — correct
resolveMatchedPrice(row, {pack_qty:12, pack_unit:'kg'}, null);
// -> unitPrice: 0.1667, unit:'kg', needManual:false, priceSource:'product-pack'
```
`applySupplierMemory` reproduces the identical failure on the same input (unmatched-row/memory path). The true price for this line is ~$2.4583/kg; the row is silently priced at $0.1667/kg with `needManual:false`.

This is exactly the same chip line the audit doc's real Supplier B corpus contains a genuine credit-note page for (`docs/audits/PARSER-AUDIT-2026-09-08.md` §3, 25/08/2026 invoice), and chips is the one product that appears, and is very likely already taught, on every one of that supplier's invoices — so this is not a contrived edge case, it is the shape of Max's own next credit note.

**Partial mitigation, not a fix:** `flagNeedsAttention` (13249) computes a price-jump check afterward and can push the row to `invRowState==='review'` if the wrong price differs enough from the product's existing stored cost — but only when the product already has `cpbu(p)>0`, and only if the (wrong) derived number happens to land outside `PRICE_JUMP`. This is incidental — the same class of "caught by a flag that isn't designed for this" the audit doc itself says used to mask D5's original defect (*"the 12% price-jump flag... caught 34 of the 35 wrong lines... which does not exist for a new product, a new supplier or a new cafe"*). Where it does trigger, the row is still shown with a plausible-looking number rather than the "type the price" prompt a `needManual` credit line is supposed to get.

**Confidence: high.** Reproduced directly against the real, unmodified functions extracted from the branch, not reasoned about.

### 2. Major/moderate — `lineColumns`'s arithmetic tolerance scales with quantity rather than price, and can make it prefer a wrong price over a correct one

`js/app.js` ~12140:
```js
if(Math.abs(q.val*P.val-T.val) > 0.01*q.val+0.006) continue;
```
The rounding slack a printed total can carry is bounded by the *price's* own cent-rounding (≈half a cent), not by the quantity. Scaling the tolerance by `q.val` makes it far too loose at realistic bulk quantities (napkins, cups, sachets — the kind of consumable a café orders in the hundreds), and it can make the "prefer rightmost price, then dollar-marked" tie-break choose a wrong-but-nearby figure over the true one:
```js
const { lineColumns } = require('./tests/_extract.js');
lineColumns('WIDGET 200 UNIT $5.00 $5.01 $1000.00');
// -> { price: 5.01, qty: 200, total: 1000 }   -- true price is 5.00; 5.01 was accepted only
//    because tolerance = 0.01*200+0.006 = 2.006, and it's picked because it is the RIGHTMOST $ amount
```
At q=300, a total that's $0.50 off an exact multiple (`300 x 0.10 = 30.00` vs a printed `30.50`) is still silently accepted as confirming — no flag, `needManual:false`. This is a genuinely wrong-but-plausible number, produced from arithmetic that looks tight (`q x P = T`) but has slack disproportionate to what real invoice rounding produces at scale.

**Confidence: high in the mechanism** (reproduced directly); **moderate on real-world frequency** — the six real invoices audited are mostly single/low-double-digit cartons, so this mainly bites on high-volume consumable lines, which the corpus doesn't cover. Neither `lineColumns` nor `parsePdfLine` is a mutation-gate target (deliberately, per the new `tests/mutation/targets.js` comment, deferred to "consolidated item 92" with 34 known survivors) — so nothing in CI would catch a regression or confirm this tolerance is intentional rather than a typo (`0.01*P.val` looks like the more defensible formula).

### 3. Verified NOT a bug — `invFixRow`'s branch-A deletion

I checked the claim in the deleted-branch comment (`js/app.js` ~12378) that the old re-base compared "the same call on the same string" and is therefore dead code. This holds structurally: for every row that reaches the surviving code (`basis.kind` is `'pair'` or `'single'`, since `'columns'`/`perQtyUnit` rows return early), `packText === name` always (it's only reassigned inside the `if(col)` branch), so `row.basis.weight` (set from `packWeight(packText)`) and `invPackWeight(row)` (`packWeight(row.name)`) are provably identical calls on the same string. The deletion is sound, not a regression.

### 4. Not independently verified, lower confidence — the two new `invSupplierDetect` skips

The `Label: value` colon-skip and the trailing-heading strip (`js/app.js` 5247/5256) are narrowly scoped and match their own tests correctly. Both fail safe toward blank (by design, per the function's own precedent), so a false positive here degrades to "no supplier detected" rather than a wrong price — lower severity than items 1–2, and I did not find a concrete failing input. Noting only for completeness, not as a finding.

### What I did not find

`pdfTextToRows`'s splicing loop, the `moneyMatches` sign regex itself (traced through each capture group by hand), and the `packWeight`/`packCount` D3/D6/D7 additions all behaved correctly against every input I constructed, including deliberately adversarial ones (glued vs spaced dashes, mid-line vs leading quantities, spliced continuation lines with pre-splice `raw` retained for supplier-memory keys). I did not find a test that passes for the wrong reason among the new files — `tests/parser-corpus.test.js` in particular is unusually well-built against this project's own recorded weak-test shapes (asserts `CASES.length===14`, asserts the two named residual allowances are still actually reproducing, and has a floor test specifically to stop the two zero-count assertions being satisfied by flagging everything manual).

### Files referenced
- `/Users/max/Documents/Scoopys-Costing/js/app.js` (`moneyMatches` ~11995, `lineColumns` ~12118, `parsePdfLine` ~12190, `pdfTextToRows` ~12253, `invFixRow` ~12360, `resolveMatchedPrice` ~12053, `applySupplierMemory` ~12019, `packPriceOf`/`firstPairPrice` ~12003–12017, `flagNeedsAttention`/`invRowState` ~12920, 13249)
- `/Users/max/Documents/Scoopys-Costing/tests/mutation/targets.js` (documents the deliberate `lineColumns`/`parsePdfLine`/`rankCandidates` gap)
- `/Users/max/Documents/Scoopys-Costing/docs/audits/PARSER-AUDIT-2026-09-08.md` (the design rationale this batch implements)
- `/Users/max/Documents/Scoopys-Costing/tests/parser-credit.test.js`, `tests/inv-row-fix.test.js`, `tests/parser-columns.test.js` (no coverage of finding #1's downstream paths)

---

## What was done about each

**Every finding got its repro run first, and then its FIX run, before anything was applied** — this
repo's standing rule that a finding carries three separable claims (the defect, the mechanism, the
remedy) and that they fail independently.

### Finding 1 — FIXED, and it was worse than reported

**Reproduced exactly**, against the real extracted functions:

```
parsePdfLine  : {"p":null,"m":true,"k":"credit"}          <- correct
after resolve : {"p":0.1667,"u":"kg","m":false,"src":"product-pack"}
after memory  : {"p":0.1667,"u":"kg","m":false,"rem":true}
```

⚠️ **The first attempt at reproducing the `applySupplierMemory` half FAILED, and the finding was
right and the reproduction was wrong** — it was called with `{pack_qty, pack_unit}` where that
function takes `{qty, unit}`. Recorded because dismissing half a finding on a bad repro is exactly
the failure this repo's rule about review findings warns against, and it was thirty seconds from
happening here.

**The fix, and where it went.** `buildInvRows` was DROPPING `basis` when it built the row, so no
downstream path could see that the parser had refused — the refusal existed only for the length of
one function call. `basis` is now carried onto the row, and a single predicate `invRowIsCredit(row)`
guards **the two functions** rather than their call sites: `resolveMatchedPrice` has two callers, and
the second is the user picking a product by hand, which wants the same answer. A guard at one call
site would have left the other open.

**And running the finding's own repro turned up a bigger one the review did not report.** The same
probe showed a *purchase* with a taught pack coming back at **$0.25/kg** against a truth of $2.4583.
`packPriceOf` — three lines — still carried the whole of D1 (`firstPairPrice`, else the last amount),
and it feeds the path that **outranks** the parser. So this batch would have shipped "the parser
prices by arithmetic" while every product the user had taught was still priced by the defect.
The audit had filed that as a follow-up (item 37); it is one line and it is now in, asking
`lineColumns` — the same function the parser asks, so the two cannot disagree.
**Measured on production, 10 Sep 2026: 23 of 431 products carry a taught pack, plus 7 remembered
supplier phrases.**

Pinned by four new cases in `tests/parser-credit.test.js`, including the one that stops the guard
being too wide: **a purchase must still price off its taught pack.**

### Finding 2 — FIXED, taking the reviewer's own suggested formula

**Both repros confirmed**: `WIDGET 200 UNIT $5.00 $5.01 $1000.00` returned 5.01, and
`CUPS 300 EA 0.10 30.50` confirmed a 50c discrepancy with `needManual:false`.

**The remedy was measured rather than accepted.** Four candidate tolerances were run against the
whole corpus:

| tolerance | corpus | widget | cups |
|---|---|---|---|
| `0.01*q + 0.006` (shipped in the first cut) | 63 / 2 / 0 leaks | **5.01** | **0.10** |
| `0.005*q + 0.006` | 63 / 2 / 0 leaks | 5.00 | **0.10** |
| **`0.01*P + 0.006`** (the reviewer's) | 63 / 2 / 0 leaks | 5.00 | null |
| `0.006` flat | 63 / 2 / 0 leaks | 5.00 | null |

**All four score the corpus identically**, which is the useful result: the loose version was never
earning anything on any layout in the set, and only the two repro lines could tell them apart. The
price-scaled one is in, because when it is too tight the line does not add up and the row ASKS —
the safe direction, and the one this whole function exists for.

### Finding 3 — agreed, no action

The agent independently verified the `invFixRow` deletion by the same structural argument the code
comment gives. Recorded because an independent confirmation of a DELETION is worth more than one of
an addition.

### Finding 4 — noted, no action

Explicitly not raised as a finding by the agent. Both new `invSupplierDetect` skips fail safe toward
blank, and blank is safe by that function's own design (`rememberSupplierPhrase` refuses to store
without a supplier). Both were hand-mutated during the batch and both go red.

### On the agent's observation about the mutation gate

It noticed, unprompted, that `lineColumns` and `parsePdfLine` are not gate targets and that nothing
in CI would therefore confirm the tolerance was deliberate. **That is correct and it is the split
this batch made on purpose** — consolidated item 92, with the survivor counts measured. It is worth
recording that an independent reader reached the same conclusion the split was reasoned from, and
that finding 2 landed precisely in the gap the split leaves.

### One consequence of the fix, caught by the gate rather than by reading

Adding `!credit &&` to `resolveMatchedPrice`'s two precedence guards rewrote those lines, so the two
written allowances keyed to them came back as **STALE ALLOWANCE** — the gate's own check that an
allowance which is no longer needed is as much a failure as a survivor with none. Both were
re-anchored to the new keys rather than deleted: the mutants are the same `>` -> `>=` on the same
subexpression and the enumerations that justified them still hold. The NEW clause needs no allowance
— its mutants are killed by `tests/parser-credit.test.js`.
**Worth recording because the gate caught a second-order effect of a fix, which is the thing a
reader cannot see:** nothing in the diff of `js/app.js` says "two allowances in another file just
stopped matching".

**After the fixes: `npm test` 2167 pass / 0 fail; corpus 63 right / 2 silent-wrong / 0 unflagged
leaks; `--products` pre-ticked-wrong 0; `node -c` clean; full mutation gate clean with every
survivor carrying a written allowance.**
