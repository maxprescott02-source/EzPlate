# HANDOVER - 261 (parser corpus standing eval)

**Branch:** `chore/parser-corpus-standing-eval` · **Scope:** `docs/QUEUE.md` item 37, consolidated item 37, split. **Shipped no client asset, so no deploy version.**

## What changed

**`docs/PARSER-CORPUS.md` is the procedure, and it did not exist.**
Which corpus lives where and why only one of them can be committed, how a new supplier is onboarded, what the two runs can each see, and the two numbers a parser batch owes before and after.
The external-corpus run needed no code at all: `run.js --cases DIR` already worked, and it was proved against a scratch directory rather than assumed.

**The four copies of the pack division are measured identical, and the measurement is now standing.**
`tests/pack-arithmetic.test.js`: eight real line shapes by eight pack shapes, 48 answers, 16 mutual refusals, zero disagreements, proved to go red by diverging one copy's gram factor.

**The queue-routing floor now says what it enforces.**
It caught this batch draining the working set without refilling, which is exactly the failure worth catching, while calling itself a parseability check.

## Review

`code-review` agent, Sonnet against Opus. `docs/reviews/REVIEW-261-parser-corpus-eval.md`, `Reviewed-commit: 82d767c`.
**Four findings, all real, all fixed.**

⚠️ **The first attempt died on a spend limit** (HTTP 429) and was re-run after the session limit reset.
**The push was held until it ran.** `CLAUDE.md` says the review is not skippable by instruction; a hard API failure is not an exemption either, and 176 is the batch that shipped unread.

**The finding that matters is one I wrote twice.**
Two docs said both `packToUnitCost` divergences were "pinned in that test", and only the Infinity one was; the casing one was prose.
The reviewer read the test, I had read my own intention.
**That is this repo's single most-recorded defect - a comment asserting coverage a test does not have - committed by the batch whose entire subject was measuring rather than asserting.**
It is pinned now, built so it cannot pass by accident: the branch each casing takes, the ratio being exactly 1000x, and the other three proved unmoved by the same uppercase unit.

**And a `--csv` flag documented that has never existed.**
An unknown flag is not rejected by `run.js` - it falls into the `else` and is read as a case directory, so it crashes on `scandir '--csv'`.
⚠️ **My own check for this is what missed it:** `grep -o "\-\-[a-z]*" run.js` returned five flags because it matched the **header comment**, which is roster 183(a) biting inside the verification run to avoid it.
Fixed at both ends; the header now says to read the parser.

The other two: the test itself was independently mutation-checked by the reviewer and found sound, and the queue-routing message was too narrow - it now names both diagnoses and how to tell them apart.

## Into CLAUDE.md

Nothing.
Every lesson here already has a section: the item's wrong enumeration is *"an item that names a behaviour without naming its sites is an item whose list is already wrong"*, the floor is *"a comment can record the defect CORRECTLY and file it under the wrong consequence"*, and the unreachable divergences are the standing rule to measure rather than reason.

## New docs/QUEUE.md items

**Four, by refill rather than by discovery**: 46, 57, 58 and 60, which opened **G4**.
G1 and G2 both have tier-C survivors only, and `docs/QUEUE.md` holds A and B, so both are finished as sources of queue items.
⚠️ **That reading is not in the refill rule and is now written into `docs/QUEUE-GROUPS.md`**: *the first group with unstruck items* has to mean *the first group with PROMOTABLE items*, or the queue stalls on work it is not allowed to hold.

**Consolidated item 93** carries the two halves of 37 that need Max's invoice PDFs: the AI second reader replayed offline, and D12's x-sort.

## New docs/PHONE.md items

None.
Nothing here reaches a screen.

## Probe

**What did the queue item tell you to do that you would have done differently?**

**It named the wrong four functions, and its count was right by coincidence**, which is the part that would have caught a careful reader out.
It lists `packPriceOf`, `derivePackPrice`, `applySupplierMemory` and `lineColumns` as four copies of one arithmetic.
Measured: the first and last are a different computation and were **already unified by batch 256** — which is that same bullet's own primary instruction, shipped before the item was promoted — while the division that really is duplicated has two copies the item never mentions, in `resolveMatchedPrice` and `packToUnitCost`.
**A batch that checked the number and not the membership would have agreed with the item and merged the wrong pair.**

**What did you not propose because it was out of scope?**

**The merge itself, and it is a decision rather than a deferral.**
The bullet says *measure that the four are identical **before merging them*** — the measurement is the obligation and the merge is conditional on it.
Extracting the shared core touches four shipped functions on the money path and about fourteen test sandboxes that would each throw `ReferenceError` without the new dependency: a large diff for zero behaviour change, in the same PR as a new document.
**The standing test already buys what the merge would buy**, which is that the four cannot drift apart unnoticed, so the merge is routed to `docs/MAINTENANCE.md` as the tidy-up it is.

I also did not fix either divergence I found, because **neither is reachable** and a fix nobody can observe is a change with no evidence behind it.

## Surprises

**Two real divergences, both dead, and I would have shipped a fix for one of them on reasoning alone.**
`packToUnitCost` guards with `isNaN` where its three siblings use `isFinite`, so it alone accepts an infinite price — and the HTML spec's number-input grammar accepts `1e400`, so the path looked open.
Chromium sanitises `1e400` and `1e309` to `''`, measured in a browser; `catNum` strips the exponent so `1e400` lands as **1400**; and all 23 non-null `pack_unit` rows on production are lowercase, closing the second one.
**Three measurements, three dead ends, and every one of them would have read as a live bug from the code alone.**

**The corpus harness needed nothing to run an external directory**, which is the opposite of what the item implied. What was missing was never the capability, only the document saying it existed — and an undocumented capability is indistinguishable from an absent one to the next reader.

**The queue drained twice in one session.** Item 89 emptied it, the refill opened G2, and G2's one promotable item was this one — which then emptied it again. Two groups finished in a day is not a pace; it is two groups that were nearly finished already and whose remaining items are all tier C.
