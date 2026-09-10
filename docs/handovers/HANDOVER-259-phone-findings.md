# HANDOVER - 259 (phone findings)

**Branch:** `fix/phone-findings` · **Scope:** Max ran the new five-check `docs/PHONE.md` in chat and reported five things. Shipped `ezplate-v213`.

## What changed

**The builder's summary bar sat one home indicator too high.**
`.bld-bar` docked at `calc(var(--bottomnav-h) + env(safe-area-inset-bottom))`, and `.bottomnav` pads itself with that same inset, so the published height already carried it.
About 34px of page scrolled through the transparent band between the bar and the tab bar, which is what his screenshot circled.
Invisible on every desktop browser because `env()` is 0 there, so the wrong expression and the right one compute the same number.

**A fuel levy is no longer imported as a product.**
`INV_EXCLUDE` already held `levy`, but `hasProductStructure` rescued the line because it carries `1.00 EA`.
The discriminator is the name, not the structure: if every word is a charge word, no quantity makes it food.

**A supplier he already has is no longer offered back as a new one.**
The add-new form prefilled Supplier from the AI or the letterhead and never compared it against his own products, so `B&E Poultry` proposed a second `B&E`.
`supplierSnap` snaps towards what he has, never away, on a whole-word prefix.

**A confirmation link that worked now says so.**
The failure message paints into `#bgErr` on the sign-in gate, which is exactly the screen a successful confirmation skips, so success had no surface at all.
It claims only what `type` says; an access token with no type is an ordinary boot and stays silent.

**Floating layers re-anchor on `visualViewport`.**
He confirmed it is the LIST covering the field, not the keyboard, which leaves one mechanism: `anchorDrop` places it correctly once and then the field moves.
`resize` and `scroll` both miss an iOS keyboard, so nothing re-anchored.

## Review

`code-review` agent, Sonnet against Opus. `docs/reviews/REVIEW-259-phone-findings.md`, `Reviewed-commit: fc4a595`.
Two findings, both real, both fixed.

**The first is this batch's own regression.** `nameIsAllChargeWords` treated `INV_QTY_UNIT` as neutral, and that set holds `bag`, `box`, `carton`, `tray`, `roll` - words that are units AND products.
`DELIVERY BAG` and `FREIGHT ROLL`, takeaway bags and cling film, returned a row on `main` and `null` on the branch.
The exemption bought nothing anyway: `name` is sliced at the first money, so on a real columnar line the quantity is not in the name, and the unit words it was written for only ever appeared in fixtures I invented.

⚠️ **The sharper half is that it checked my justification and found it false.**
My comment excused the loose rule with *"the worst case is a MISSING review row, which is visible"*.
Nothing reconciles the invoice's line count against the rows built from it, the summary counts what survived, and the only trace is `invDbg` behind a flag that is off.
That sentence was the whole argument for the looseness and it was wrong about the consequence it was weighing.

**The second:** the `visualViewport` tests grepped source when the WIRING was testable.
"No soft keyboard" is true of the cause and not of a function that registers listeners.
They now run the subscription against a fake window and prove each handler reaches `reanchorOpenLayers`.

## Into CLAUDE.md

Nothing.
Both lessons already have sections - the comment trap is *"a comment can record the defect CORRECTLY and file it under the wrong consequence"*, and the test one is roster 167/172/195.
`CLAUDE.md` says to stop writing about a rule that already exists, so both instances are recorded at their sites and in the review artifact.

## New docs/QUEUE.md items

None.
`nameIsAllChargeWords` and `supplierSnap` are now mutation targets, which is where the durable follow-up went: five survivors, three killed and two allowed by enumeration over 56 combinations.

## New docs/PHONE.md items

No new checks, two RE-CHECKS on existing ones, both because no browser here can settle them.
Check 3 gains the dropdown: **fail is the list still sitting over the field**, which would mean the mechanism is wrong rather than the subscription incomplete.
Check 5 gains the confirmation message: **fail is it still saying nothing**, or saying it on an ordinary launch when no link was clicked.
The levy line in check 1 is struck with its own failure mode named: **a real product going MISSING** is the direction that fix can be wrong in.

## Probe

**What did the report tell you to do that you would have done differently?**

Nothing, but one of the five could not be acted on as written and that is worth recording.
His description of the dropdown - *"starts in line with the text inside the field and as such covers it"* - does not match what `anchorDrop` does, which is place the list 4px below the field's bottom edge.
Two readings needed opposite fixes, on the input he uses most, so I asked rather than guessed, and his answer eliminated one of them in a sentence.
**The general thing: a report of a SYMPTOM on a screen is not a report of a mechanism, and the gap between them is exactly where a wrong fix gets built confidently.**

**What did you not propose because it was out of scope?**

Clamping the dropdown's height to `visualViewport.height`.
`docs/PHONE.md` declined that blind since batch 212 because the same number moves under pinch-zoom, and he said the list is scrollable and the keyboard covering the bottom is fine.
Re-anchoring needs no guess about which is happening; the height clamp does. A test now asserts the restraint so a future batch has to argue with the reasoning rather than quietly widen it.

I also did not widen `INV_EXCLUDE` to catch `cartage` or `admin fee`.
The charge vocabulary can only narrow a line that regex already suspected, and widening it to chase charges nobody has seen on a real invoice trades a known annoyance for an unknown one.

## Surprises

**The phone list paid for itself on its first run, and the shape of what it found is the argument for it.**
Four defects, three of them invisible to every harness in this repo: one because `env(safe-area-inset-bottom)` is 0 on a desk, one because no desktop browser has a soft keyboard, and one because the success message needed a screen that a success never shows.
The entry test written into that file the day before - *is a phone the only thing that CAN check it* - selected for exactly the class of defect that nothing else can reach.

**Two hand-picked test sandboxes broke loudly**, `boot-gate.test.js` and (in 256) `pack-survives.test.js`, because a shipped function gained a dependency their private function lists did not carry.
That is the good failure: a `ReferenceError` rather than a wrong answer.
The one to watch for is a sandbox that STUBS what it is missing.

**And a syntax error four lines from where I wrote it:** a comment I added inside a template literal contained back-ticks, which closed the string.
Recorded because the error message named a line that had nothing wrong with it.
