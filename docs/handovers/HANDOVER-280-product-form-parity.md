# HANDOVER - 280 (product-form-parity)

**Branch:** `fix/product-form-parity` · **Scope:** `docs/QUEUE.md` item 98, the two product forms. Shipped deploy version **ezplate-v228**.

## What changed

**The Edit-product form asks what the New-product form asks.** New takes pack size + pack unit + pack price and derives the unit cost into `#f_calc`. Edit took a price PER UNIT, so a sack created as "10 kg for $65" reopened as "6.50" - and the $65 had been stored in `current_price_exgst` since creation and **read by nothing anywhere in the app**.
Edit now shows the pack price, and editing any of the three pack fields fills the per-unit price live, with the derivation read out beneath exactly as `#f_calc` does.

**❌ "With an empty pack" DOES NOT REPRODUCE.** That half was Max's own repro, root-caused and fixed in **v82 D2**, and `tests/create-pack.test.js` locks the round-trip. Reopening a 10 kg pack shows 10 and kg.

**⚠️ THE FIX IS NOT A LITERAL MIRROR, AND THAT IS ITS SAFETY.** On New, `packToUnitCost` derives `base_unit` FROM the pack unit. Here it must not: v54 made unit type create-only at two sites because a saved plate line holds its quantity in the product's base unit, so flipping g/ml/ea silently re-means every line referencing it.
So the pack **fills `#ig_price`** and the write path is untouched - `saveIngEdit` still reads that field and still takes its unit from the STORED product. A pack whose unit does not convert to the stored one is **refused**, and the form names both units.

**`current_price_exgst` is now persisted by the edit form**, because the first cut showed the pack price and let it drive the price without saving it - so $65 → $80 saved the new unit cost and reopened still saying $65, a stale number beside a cost it no longer explained. Caught by the save test, which exists precisely because everything before it in that file is display.

## Review

Sonnet, overriding the definition's `opus` pin because this batch ran on Opus. Report: `docs/reviews/REVIEW-280-product-form-parity.md`.

**ONE CRITICAL FINDING, AND IT IS THE MOST SERIOUS DEFECT I PRODUCED THIS SESSION.**
`igPackDerive`'s guard read `if(storedBaseUnit && r.base_unit!==storedBaseUnit)`, so a **null `base_unit` skipped the check entirely**. Entering a pack of `1 ea` at `$1.41` - a correct entry for a $1.41 container - printed **"= $1.41 / unit"** and saved `cost_per_base_unit: 0.00141, base_unit:'g'`. **$1.41 each became $1.41 per kilo, wrong by 1000x, with the UI stating the opposite of what it wrote.**
The reviewer reproduced it in a live browser; I reproduced it independently through the extracted shipped functions before touching anything, and the factor came out exactly 1000.
**`base_unit` NULL is a documented production state** - `supabase/migrations/20260801_base_products_backfill.sql` coerces eight rows to null because their unit is unknown, and all eight are uncosted, which makes them precisely the rows someone opens Edit on to price.

**⚠️ AND MY OWN TEST HAD ASSERTED THE BROKEN BEHAVIOUR AS CORRECT**, justified as *"the create-ish path"*. There is no create path - `igPackDerive` is reached only from `openIngEdit`. **A justification that names a caller the function does not have is this repo's most-recorded comment defect, and here it made a green test out of a 1000x mis-store.**
Fixed: an unknown unit is its own refused state, asserted across all five pack units, with a control proving the same pack still derives once the unit is known.

**One MINOR, also real:** `.calc-line.bad` had no CSS rule, so both safety refusals rendered byte-identically to the "no pack entered yet" placeholder. The spec's assertion was the real gap - it checked `className` contains `'bad'`, which passes whether or not `bad` means anything. It now compares rendered colour against the neutral and happy states.

## Into CLAUDE.md

Nothing, and I considered one. The shape here - *a guard whose truthiness check silently exempts the absent case* - is close kin to two rules `.claude/rules/app-guards.md` already carries (`isFinite('')` is TRUE; "fail open is what you do with NO information"). The new instance is written out at its own site and in the test that exists because of it. Adding a fourth phrasing of the same family to a file that is short on purpose would be the restatement `CLAUDE.md` warns against.

## New docs/QUEUE.md items

**102 [A]** - a product with no recorded unit stores its price 1000x wrong, and eight such rows are in production. `saveIngEdit`'s `_bu==='g'?'kg':…:'kg'` fallback turns a null unit into `'kg'`, so `invUnitToBase` divides by 1000.
**It is PRE-EXISTING and 280 did not cause it** - typing directly into `#ig_price` has always taken that path - and **280's fix does not remove it**: the honest refusal now routes the user to *"enter the price per unit directly"*, which is the path that is still wrong. Filed [A] because it writes a wrong cost, which `CLAUDE.md` treats as the one thing this app must never do.

## New docs/PHONE.md items

None. Everything here is measurable in a browser and was measured in one.

## Probe

**What the item told me to do that I would have done differently.** Two things. Half of it was already fixed four batches before it was written. And *"make Edit mirror New"* is unsafe taken literally - a literal mirror derives `base_unit` from the pack unit, which v54 forbids for a stated reason. The item's own ⚠️ flagged the risk; what it did not say is that the safe version leaves the write path alone entirely, which is what made the change small.

**What I did not propose because it was out of scope.** Letting Edit SET the unit when it is currently null. That is the real fix for item 102 and it is the one case v54's rule protects nothing - there is no stored cost and no plate line to re-mean - but it is a change to what the form may write, not to what it displays.

**Was any rule missing when I needed it.** No, and two were doing real work: `.claude/rules/app-guards.md`'s exemption-scope rule is why I checked what the pack could reach, and its `$2166.67 instead of $1.30` record is the precedent I cited to myself for refusing a mismatch. What neither rule caught was the ABSENT case, which is the finding.

## Surprises

**The review found a 1000x mis-store in code I had commented as safe.** The comment block says *"THE WRITE PATH IS DELIBERATELY UNTOUCHED… cannot reach `base_unit`"* - true for every product with a unit, false for the eight without one, because `saveIngEdit`'s own fallback invents `'kg'`. I had reasoned about what my code writes and not about what the code downstream does with an absence.

**And I wrote the test that hid it, in the same hour, having just read the roster about exactly this.** The justification even named a caller - "the create-ish path" - that a two-second grep would have disproved.

**A second contention lesson, in a new shape.** I started the mutation gate and the full Playwright sweep concurrently; the run took **34.7 minutes against a normal ten** and returned 13 failures, none reproducible alone. `playwright.config.js` carries a comment about exactly that - a local run sharing the machine with the gate once exhausted memory, which is why it caps workers at 2. **And I read "1 failed" off a `tail` again** - the same mistake 278 wrote a rule about, two batches later, in a different output shape. The rule says do not pipe; it does not say do not tail. It does now, at the same site.
