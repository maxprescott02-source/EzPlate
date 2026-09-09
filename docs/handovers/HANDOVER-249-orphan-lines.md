# HANDOVER - 249 (the app asks which ingredient a stranded plate line meant)

**Branch:** `249-orphan-lines` · **Scope:** `docs/QUEUE.md` item 88.
**Deploy version shipped:** `ezplate-v206`.

## What changed

Settings gains **"Link older plate lines"**, offered only while there is something to ask about.
It asks one question per PRODUCT - six, not thirteen - and applies the answer to every line pointing at it, through the heal's own write and rollback path.
Re-measured on production before building: six products, 13 lines, 9 plates, every one with **zero** owning ingredients. Exactly what the item said.

⚠️ **The heal's promise does not transfer, and that is most of the design.**
239 can say *"nothing costs a different amount afterwards"* because `barePidSameProduct` proves the ingredient it writes already points at the line's product. **Here no ingredient owns the product, so every candidate points at a different one and the cost moves by construction.**
So the picker computes the delta and every row states what those plates would cost, in money, before anything is committed. A picker that borrowed the heal's sentence would have been lying.

"Leave these alone" is a real answer and stays one, as the item required.

## Review

The pre-push `code-review` agent, on Sonnet, not shown the item.
**Three findings - one CRITICAL, one moderate, one minor. All three acted on.**

**The critical one is the most valuable this process has produced**, because the defect is invisible at the call site.
`logChange` defaults an omitted `avgAfter` to a LIVE `computeAvgFoodCost()`, evaluated when that plate's write SETTLES - by which time every plate in the batch has already been mutated. With one `avgBefore` read before the loop, all N entries carried the whole batch's movement, and `trendMarkers` sums `drop` per calendar day, so a two-plate choice drew **twice** the real fall on the chart.
**Nothing at the call site looked wrong.** The code passed an average. What was wrong was the ABSENCE of the second one, resolved live several statements and one promise away.
The remedy is already in this file with a comment explaining itself - the invoice repoint loop measures its pair around each item's own mutation *"so the entries compose in sequence rather than each claiming the whole batch's movement"*.

Findings 2 and 3: an empty-batch early return that skipped the toast, against the sibling's explicit *"never silence"*; and the ambiguous message saying "Either costs the same" while the list offers every ingredient, not only the owners.

Full report verbatim: `docs/reviews/REVIEW-249-orphan-lines.md`.

## Into CLAUDE.md

Nothing. The critical finding is an instance of a rule the file already carries - *arithmetic across two series fabricates movement* - and the remedy is a pattern already written out at the invoice repoint loop with its own explanation.
What this batch adds is a second worked instance, and it is recorded where a reader will be standing: in the comment at `applyOrphanChoice`, and struck onto item 88 with a warning to read it before touching any batched `logChange`.

## New docs/QUEUE.md items

None. Item 88 is deleted from `docs/QUEUE.md` and struck in the consolidated backlog.

## New docs/PHONE.md items

None. The screen is driven at 380 and 1280 in `tests/visual/249-orphan-link.spec.js`, including the sentence it exists to get right.

## Probe

**What did the item tell you to do that you would have done differently?**
Nothing - it was accurate, its measurement reproduced exactly, and its two prohibitions (never guess by name-matching; refusing must stay a legitimate answer) are both right and both honoured.
The one thing it did not say is the interesting one: it did not say the heal's cost promise cannot transfer. That falls out of reading `barePidSameProduct`, and it is the difference between this picker and the heal it sits beside.

**What did you not propose because it was out of scope?**
Applying the same ask to the `ambiguous` case as a PRODUCTION concern - there are none today, and the picker handles the case because `barePidPlan` emits it, not because anyone has one.
Also the six products themselves are still in the catalogue with nothing using them; whether they should be deleted is Max's and is not this item's.

## Surprises

**Two tests pinned a decision this batch deliberately reverses**, one unit and one browser, and both had to be rewritten rather than deleted.
239 kept the heal row visible after the fixable half was gone, as the standing report of the lines nothing could decide. This item is that they CAN be decided, so the report becomes the ask.
The property both tests protected - *the lines stay findable in Settings* - is unchanged and is what they now assert. Only the row changed, and it changed to one that can act.

**The mutation gate reported seven survivors on two brand-new functions**, all of them unexercised defensive guards. Five were killed by feeding the shapes they defend against - a null plate, a `lines` that is not an array, a null line, a misc line, a kid line - and two were allowed with reasons.
Worth noting for the next new function: **the survivors were not wrong code, they were a fixture that never reached it.** The functions were written with the guards; the tests were written with the happy path.
