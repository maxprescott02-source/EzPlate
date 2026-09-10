# REVIEW-259-phone-findings

Reviewed-commit: fc4a59530f53504f3f2f5ce2dd2cae9dd58ece2e

`code-review` agent, Sonnet against Opus, on `git diff main...HEAD`.

**Two findings. The first is a regression this batch introduced, and it was found by the reviewer
checking a claim I had written into a comment to justify the risk — and finding the claim false.**

---

## The report, verbatim

Clean. Here is the review.

## Findings

### 1. `nameIsAllChargeWords` silently drops real products whose name combines a charge-vocabulary word with a unit word — `js/app.js:11961-11971` (function), used at `:11992`

**Severity: major** (silent data loss on a real product line — category 4, with a wrong-condition classifier at its root — category 1).

`nameIsAllChargeWords` treats a token as "explained" if it matches `INV_CHARGE_WORD` **or** `INV_EXCLUDE`, or if it matches `INV_QTY_UNIT`. If every token in the name clears one of those two buckets, the whole line is excluded regardless of the full line's structure (real qty, real unit, real price). The bug: `INV_EXCLUDE` contains `freight|delivery|surcharges?|...`, and `INV_QTY_UNIT` contains `bags?|boxes?|cartons?|trays?|rolls?|...` — both packaging-charge vocabulary and literal packaging-product vocabulary. A genuine product named e.g. "Delivery Bag" (paper takeaway bags, a plausible thing for a café to buy from a food-service supplier) tokenizes to `DELIVERY` (matches `INV_EXCLUDE`) and `BAG` (matches `INV_QTY_UNIT`) — both buckets are satisfied, `charge>0`, and the line is dropped with no rescue.

I verified this by running `parsePdfLine` from both branches:
- On `main`: `parsePdfLine('DELIVERY BAG 1 EA 5.00')` → returns a row (`uncertain:true`, goes to review).
- On `fix/phone-findings`: same input → returns `null` (silently dropped, never reaches review).

This is a genuine regression this diff introduces, not a pre-existing gap. The function is only reached once `INV_EXCLUDE` already flagged the line (as the code's own comment notes), so an ordinary product is safe — but any product whose entire name happens to combine `INV_EXCLUDE`/`INV_CHARGE_WORD` vocabulary (freight, delivery, pallet, surcharge, credit, …) with `INV_QTY_UNIT` vocabulary (bag, box, carton, tray, roll, …) is now indistinguishable from a genuine fee line and vanishes from the invoice with **zero UI signal** — the only trace is `invDbg`, gated behind `window.EZ_INV_DEBUG`, off by default.

The function's own comment claims *"the worst case is a MISSING review row, which is visible, rather than a wrong price, which is not."* I checked: there is no total-line-count reconciliation or any other UI signal that a line was dropped (`invRows` simply never contains it). That claim is not true of the shipped UI — this is the same "comment records the defect correctly and files it under the wrong consequence" trap CLAUDE.md names, and it likely gave false confidence that a stronger guard (e.g. requiring the *whole line*, not just the name, to structurally resemble a charge — no real qty×price arithmetic — before excluding) wasn't needed.

Confidence: **high** — reproduced directly against the real extracted function, before and after.

### 2. `tests/safe-area-inset.test.js`'s visualViewport tests are weaker than an available check, though the "source assertion" framing is partly honest

**Severity: minor** (test-rigor gap, category 5/7, not a functional defect in the shipped code).

The subscription block itself (`js/app.js:12836-12869`) looks correct: guarded for browsers without `visualViewport`, no listener leak (registered once at top level), and `reanchorOpenLayers` is idempotent/safe to call at any time (each managed layer is individually guarded on visibility/open state).

The tests at `tests/safe-area-inset.test.js:115-144` are pure regex-on-source-text assertions (`assert.match(src, /vv\.addEventListener\('resize',reanchorOpenLayers\)/)` etc.), and the file states outright that this is deliberate because no automatable browser has a soft keyboard. That's true of the *cause* (iOS panning the visual viewport) — genuinely untestable here. But it doesn't follow that the *wiring* is untestable: a fake `window`/`visualViewport` object with a recording `addEventListener`, extracted via the same block-regex already used here, could invoke the captured handler and assert `reanchorOpenLayers` was actually called — that would prove the subscription is live rather than merely that a particular string sits in the file. The file conflates "the cause can't be reproduced" with "the wiring can't be exercised," and only the first is true. This is exactly the class of gap CLAUDE.md's roster (167, 172, 195) warns about, though here the assertions are reasonably specific (not vacuous/order-only) and the gap is acknowledged rather than hidden.

Confidence: **medium** — the functional code looks fine; this is a critique of test strength, not a claim of a live bug.

### No bugs found in the other three areas

- **`.bld-bar`'s `bottom` (css/style.css:977)**: verified independently that `.bottomnav` sets `padding-bottom:env(safe-area-inset-bottom)` on itself (css/style.css:1642) and that `--bottomnav-h` is published from `getBoundingClientRect().height` (js/app.js:10476), which does include that padding — so the old expression really did double-count. The new fallback (`calc(64px + env(...))`) is correct for the pre-publish window because `.bld-bar` uses this base rule only below 640px, where `.bottomnav` is the real bottom bar; at ≥640px a separate rule (`css/style.css:1080-1082`) overrides `bottom` to `env(safe-area-inset-bottom)` directly, and at ≥768px `.bld-bar` is `display:none` — so the desktop-rail case the task asked me to check never reaches the base rule's fallback at all. Correct.
- **`supplierSnap`**: whole-word-prefix boundary test is correctly implemented and matches its own tests (real extracted-function tests, not stubs); it's applied to the single *resolved* value in `expandNewItem` (after `niFld` has already chosen between the AI value and `invSupplier`), which does cover both sources as claimed, since only one of them can win per call. The one documented limitation (punctuation spacing not normalized, e.g. "B & E" vs "B&E") is explicitly tested and declared a known, accepted limit rather than a silent gap.
- **`authUrlOkMessage`/`paintAuthUrlOk`**: reads `location.hash` via a plain-object parser with no `history.replaceState` call anywhere in the new code, so it cannot consume the fragment; it runs before `SUPA` (the client that would consume the fragment) is even created, so there's no race. The latch (`_authUrlOkShown`) is set once and never cleared, matching its sibling `_authUrlErrShown`'s pattern; the `'ok'` branch's `if(_bootNoMember) return;` early exit doesn't swallow it in practice because `_bootNoMember` is cleared (`js/app.js:1623`) whenever the tenant lookup actually succeeds, before `bootReady('ok')` fires. Tests use real extracted functions and assert real transitions, not vacuous conditions.

### Six cache-version spots

Checked all: `sw.js` `CACHE` and both `ASSETS` entries, `index.html`'s CSS and JS query strings, and `js/app.js`'s `APP_VERSION` — all agree at `v213`.

### Relevant files
- `/Users/max/Documents/Scoopys-Costing/js/app.js` (11961-11993, 12603-12615, 12836-12869, 259-287, 9394-9406)
- `/Users/max/Documents/Scoopys-Costing/tests/parser-charges.test.js`
- `/Users/max/Documents/Scoopys-Costing/tests/safe-area-inset.test.js`
- `/Users/max/Documents/Scoopys-Costing/tests/supplier-snap.test.js`
- `/Users/max/Documents/Scoopys-Costing/tests/auth-url-error.test.js`
- `/Users/max/Documents/Scoopys-Costing/tests/boot-gate.test.js`
- `/Users/max/Documents/Scoopys-Costing/css/style.css` (965-982, 1080-1082, 1639-1643)

---

## What was done about each

### Finding 1 — FIXED, and it is the batch's own regression

**Reproduced before touching anything:** `DELIVERY BAG 1 EA 5.00` and `FREIGHT ROLL 1 EA 9.00` — takeaway
bags and cling film, both things a café buys from a foodservice supplier — returned a row on `main`
and `null` on this branch. Silently.

**The mechanism is exactly as reported.** `INV_QTY_UNIT` was being treated as "neutral", and it holds
`bag`, `box`, `carton`, `tray`, `roll` — words that are units **and** products. So a name only had to
pair one `INV_EXCLUDE` word with one of those to vanish.

⚠️ **The exemption bought nothing, which is what made removing it the right fix rather than a
trade.** `name` is sliced at the FIRST money on the line, so on a real columnar invoice the quantity
columns are not in the name at all — the levy's name is `S77 FUEL LEVY`. The unit words the exemption
was written for were only ever in fixtures **I invented**, on single-money lines. The rule is now
"every word must be a charge word", with no exemptions, and the real levy still drops.

⚠️ **AND THE FINDING'S SHARPEST PART IS NOT THE BUG, IT IS THAT IT CHECKED MY JUSTIFICATION.** The
comment said the worst case is *"a MISSING review row, which is visible, rather than a wrong price,
which is not"* — and the reviewer went and looked: **nothing reconciles the invoice's line count
against the rows built from it.** The review summary counts what SURVIVED. A dropped line leaves no
trace on any screen; the only record is `invDbg`, behind a flag that is off.

That sentence was doing real work — it was the argument for allowing a loose rule — and it was wrong
about the consequence it was weighing. It is `CLAUDE.md`'s own "a comment can record the defect
CORRECTLY and file it under the wrong consequence", written by me, in the same commit as the rule it
was excusing. The comment is corrected at the site and the rule is as tight as it can be instead.

Two new tests pin the direction that matters: a café buys bags, boxes, trays and rolls, and none of
them may vanish.

### Finding 2 — FIXED, and the distinction it drew was the right one

The file said "no soft keyboard, so this must be a source assertion", which **conflated the cause
with the wiring** — and only the cause is untestable here. The subscription is a function that
registers listeners; a fake `window` with a recording `addEventListener` runs it.

It now does exactly that: four listeners are asserted by name and capture flag, **each handler is
invoked and proven to reach `reanchorOpenLayers`**, and a third case runs the block against a window
with no `visualViewport` at all and asserts it neither throws nor attempts the other two. The
remaining source assertion — that `visualViewport.height` is still not read — is kept, because that
one really is about restraint rather than behaviour.

### The other three — agreed, no action

The reviewer verified the inset double-count independently rather than accepting the diff's account,
and went further than asked on the fallback: it confirmed the `>=640` and `>=768` rules mean the base
rule's fallback is never reached at desktop width, which is the case I had reasoned about but not
checked.

**After the fixes: `npm test` 2201 pass / 0 fail; Playwright 478 passed, 14 skipped; smoke green;
`node -c` clean; parser corpus unchanged at 63 right / 2 silent-wrong / 0 unflagged leaks.**
