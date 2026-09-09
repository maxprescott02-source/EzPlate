# HANDOVER - 246 (a failed menus read is a failed boot)

**Branch:** `246-menus-read-fatal` · **Scope:** `docs/QUEUE.md` item 20, promoted from group G1.
**Deploy version shipped:** `ezplate-v203`.

## What changed

A failed `menus` read is a failed boot instead of a menu the server never had.
The item was marked unmeasured and it reproduced on the first attempt, deterministically, by failing that one request in Chromium:

```
boot gate visible : false                      <- the app reported a clean boot
menusList         : [{"id":"MENUmttz2qz2-1-uyhz2oci","name":"Original menu"}]
currentMenuId     : MENUmttz2qz2-1-uyhz2oci
MENU (via rebuild): [{"id":"MI1","menuId":"MENU_WINTER"}]      <- the dish was fine all along
menu screen       : "Nothing on this menu yet. Publish a plate from the Plates tab to see it here."
```

The café's data was all there.
One flaky request out of the thirteen in the boot batch hid itself behind a working-looking screen, repointed `currentMenuId` at an invented menu, and then invited a republish against an id no `menus` row answers to.

`menus` joins the four required reads.
`soft()` was written for *"an older project may not have this table"* and cannot tell that from *"this one request failed"* - the 185 family, one table along.

`ensureDefaultMenu` is deleted with the branch that called it, and that buys an invariant rather than a tidy-up: **`menusList` means menus the server has**, which two comments already asserted while that function quietly falsified it.
Three writers survive and every one waits for the server.

## Review

The pre-push `code-review` agent, on Sonnet, told to look specifically at what a deletion and a newly-fatal read could break, and not shown the item.
**No code-correctness defects.** It traced the read ordering, the throw placement, the catch-path memory state, the three surviving writers' contracts, and whether the rewritten tests still pin what they used to, and found nothing.

**Two process findings, and the first is the valuable one because it is about a DIFFERENT item.**
Half of it was a false alarm about batch order - the strike and the handover are step 10, after the merge, and the review is step 7.
The other half is real: **item 21 carried `Do after: 20 - reproduce its fictional menu first; part of this may fall out of that`, and this batch makes that state unreachable.** The ordering is satisfied and its stated reason is falsified, by the batch immediately before the one that would have picked it up.
So 21 needed more than the line deleting; it is now told that nothing falls out of 20 and that it must build a failure trigger of its own, with the copyable one named.
**The same falsified premise was in `docs/MAINTENANCE.md`**, in the sibling bullet of the entry being struck. Corrected in the same edit.
Neither would have been found by reading this diff; the reviewer found them by reading the queue against it.

Second finding: `tests/smoke.js` carried a comment saying only `bootstrapSync` may seed and only when the table did not answer. Nothing seeds any more. Fixed.

Full report verbatim: `docs/reviews/REVIEW-246-menus-read.md`.

## Into CLAUDE.md

**The Tier 2 Menus paragraph is rewritten.** It described `ensureDefaultMenu` and its call-site gate, and both are gone.
What replaces it is the invariant rather than the mechanism: `menusList` means menus the server has, `withPublishMenu` decides whether to create one by reading `menusList.length`, three writers survive and all of them wait for the server, **and if you add a fourth this is what it owes.**
The successful-EMPTY-read rule is unchanged and is restated, because it was never the problem.
The correction records why: a two-valued gate could not express the third case, and **the answer was to remove the third case rather than to give the seeder a better guess.**

## New docs/QUEUE.md items

None. Item 20 is deleted from `docs/QUEUE.md` and struck in `docs/QUEUE-2026-09-08-CONSOLIDATED.md`.
**Item 21 was edited rather than left alone** - see Review above; its `Do after:` is deleted as satisfied AND its stated reason is marked false, which are two separate facts and the item now says so.
`docs/MAINTENANCE.md`'s duplicate record of the same finding is struck with the measurement, and its sibling bullet's repro claim is corrected.

## New docs/PHONE.md items

None. The defect and the fix are both measurable in a browser and were measured.

## Probe

**What did the item tell you to do that you would have done differently?**
Nothing about the fix - it offered "join the fatal list or retry", and the fatal list is right for the reason the item itself gives.
One thing about the *record*: the item says to fix the publish guard's comment because it is false. It is, and after this change it becomes **true**, so the amendment is not a correction but an explanation - it now names what used to violate the claim, so the next reader knows why the enumeration is complete rather than merely current.

**What did you not propose because it was out of scope?**
The other `soft()`-wrapped reads were not audited. Five of the thirteen are history and supplier tables where degrading one feature really is the right answer, and two are the tenant and role lookups whose three-valued handling `CLAUDE.md` documents at length.
`menus` was different in kind - the app cannot place a dish without it - and widening this into "review every soft read" would have been a different batch with a different argument.

## Surprises

**Fixing this item falsified the next-but-one item's premise, and the batch that would have suffered was the very next one.**
That is the queue's own "a queued item's approval does not expire and its FACTS do" rule firing at the shortest possible range - not months of drift, but one batch - and it was caught by the review reading the queue against the diff rather than by anything in the loop.
Worth noting for the step-1 sweep: **the sweep checks whether a `Do after:` is SATISFIED, and it has no way to notice that the reason attached to it has become false.** Those are different questions and only one of them is mechanised.

**A verification run of this batch was invalid and is recorded rather than quietly re-run.**
The first full Playwright pass was launched in the background while the working tree was still being edited: 47 minutes against a normal 8.6, 466 passed where 474 was expected, exit code 0, no failures reported.
A green result from a run whose subject moved underneath it is worth nothing, and it looks exactly like a good one.
Re-run against the committed tree with no concurrent edits: 474 passed, 14 skipped, 8.6 minutes. That is the run this batch relies on.
