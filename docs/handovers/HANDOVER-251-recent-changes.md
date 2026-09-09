# HANDOVER - 251 (Recent changes says what kind of change it was)

**Branch:** `251-recent-changes` · **Scope:** `docs/QUEUE.md` item 55 - **half shipped, half does not reproduce.**
**Deploy version shipped:** `ezplate-v207`.

## What changed

A Recent-changes row now says what KIND of change it was: **"Ingredients"** or **"Line linked"**.
Read from `detail`, never from `kind` alone - which is `CLAUDE.md`'s Tier 1 rule as a live case rather than a rule, because 249's orphan link writes `plate_edited` too and only `detail.via` tells the two apart.
A kind it cannot name renders nothing rather than a guess.

**The item's MAIN claim does not reproduce, and its own instruction is what proved it.**
It said a sell-price rise shows "+$5.00" red, and then said to grep `costBefore` in `logChange`'s writers first. Measured:
- `recentChangeRows` requires **both** cost figures to be finite numbers.
- All three `dish_price` writers pass neither, or only `costAfter`.

So a sell-price change can never appear in that card, and can never be coloured. The colouring is correct for every entry that CAN render. **Nothing was changed to make the finding true.**

## Review

The pre-push `code-review` agent, on Sonnet, not shown the item.
**Three findings - one major, one its consequence in the tests, one a comment. All acted on.**

**The major one is the same shape as the item's own false claim, one level down.** I added a third word, "New plate", for a case the same filter always excludes: `saveCurrentPlate` picks `plate_created` with `_isNew=(_costBefore==null)`, so such an entry never carries a costBefore and is always dropped. The branch could be called and could never return. Removed, on the v112 `plateIdOf` reasoning - a case that cannot fire reads as coverage and is not.

And the test that "proved" it used `costBefore: 0` on a `plate_created` entry, **a shape no writer can produce** - so it was green about something unreachable, and it contradicted the "only ONE cost figure is dropped" test in the same file without saying so.

⚠️ **The first pin I wrote for the invariant did not work, and I found that the same way the reviewer found the original.** It asserted the choice expression and the ternary; both survive a REASSIGNMENT between the choice and the write. I mutated `saveCurrentPlate` with `_costBefore = _costBefore || 0` and it stayed green. It now also asserts `_costBefore` is assigned exactly once, which is what actually holds the invariant.

Full report verbatim: `docs/reviews/REVIEW-251-recent-changes.md`.

## Into CLAUDE.md

Nothing new. Two existing rules fired and both held, which is worth recording as evidence they work:
- **"recipe" is a forbidden noun.** It was the first draft's word for `plate_edited`, and `tests/terminology.test.js` refused it - on a line written by someone who had just read the vocabulary rule. The words are now "Ingredients" and "Line linked".
- **"Read `detail`, never `kind` alone"** is the whole design of the new function, and it is the first time two events have genuinely shared a kind since the rule was written.

## New docs/QUEUE.md items

**One, and it is the counter firing rather than a finding: `project-audit`.**
`sw.js` now ships `ezplate-v207` and the newest report is `AUDIT-v197` - a gap of 10, which `skills/batch` step 10 puts above every unblocked item. The item says what this particular audit has to bite on: ten batches, three new Tier 1 sections, the first database migration in the stretch, four items split or partly falsified, and a queue about to need a refill from `docs/QUEUE-GROUPS.md`.
It also repeats the thing that has gone wrong before: **the agent hands the report back and does not save it, so an unfiled report leaves the counter unchanged and the next audit is never queued.**

Item 55 is deleted from `docs/QUEUE.md` and struck in the backlog with both halves recorded.

## New docs/PHONE.md items

None.

## Probe

**What did the item tell you to do that you would have done differently?**
Its first clause, which I did not build. It asked for the colour to change; the colour is right and the case it described cannot occur. **The item's own "unmeasured, grep this first" note is what settles it**, which is the queue header's rule working as designed rather than a lucky catch.
I also would not have described the second clause as "add a one-word kind" without saying which kinds can reach the card - that omission is what let me write a third word for a row that cannot exist.

**What did you not propose because it was out of scope?**
Whether `dish_price` entries SHOULD reach this card. They carry a real sell-price movement and the card is called "Recent changes", so a reader could reasonably expect them - but showing them needs a second delta with a different meaning (price, not cost) in a card whose colour language is anchored to cost, and that is a design question rather than a fix.
Not filed: it is speculative, and `docs/MAINTENANCE.md`'s header warns against vague entries. If it matters it will arrive as a real observation.

## Surprises

**Three consecutive things in this batch were "a case that cannot occur", at three different levels.** The item claimed one. My fix added one. My test pinned one with a fixture that could not exist.
The common thread is not carelessness - it is that **the filter deciding what reaches this card is five lines away from everything that reasons about it**, and none of the three of us re-read it. The comment above `changeKindWord` now states which two events can reach the card, which is the cheapest place for the next reader to find out.

**And the audit fired on this batch rather than the last one**, because 250 shipped no client asset and therefore no version bump. Worth knowing: the counter tracks DEPLOYS, not batches, so a run of docs-or-database-only work can leave it still while real change accumulates.
