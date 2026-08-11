# HANDOVER - 173 (unique ids, the surrogate half)

**Branch:** `unique-ids-173` · **Scope:** `docs/QUEUE.md` item *Unique ID generation*, which turned out to be two items. Ships `ezplate-v153`.

## What changed

Every id the client mints for a surrogate primary key now goes through one `uid()`: plates `SP`, dishes `um`, menus `MENU`, custom products `CX` and `U`, change-log entries `CL`.
The shape is prefix + timestamp + an in-session counter + eight base-36 characters of `crypto` entropy.
The counter is the deterministic half and covers several ids minted in the same millisecond inside one session, which the invoice importer really does.
The random block is the half that separates two accounts, where two counters know nothing about each other.

`nextChangeId` was the precedent for exactly this shape and is now a caller rather than a near-copy, which retires `_changeTok`'s 1296 values in favour of 36^8.

**No migration of live rows**, which is the part worth reading. It is not a shortcut: a new id always contains `-` and the old format never did, so the two id sets are disjoint by construction and Scoopy's existing rows cannot be collided with. Rewriting every live id would have meant chasing references inside plate-line JSONB, both history tables, the change log and the tombstone arrays - a large destructive migration bought for nothing. `tests/unique-ids.test.js` pins the disjointness, because it is the claim the safety rests on.

## Into CLAUDE.md

Nothing new proposed. The batch used three rules already there and none of them needed changing.
The one line worth checking on a future pass is Tier 2's *"Custom ids are `CX*`"*, which is still true - `uid('CX')` keeps the prefix - but is a description of what the generator emits and not a parsed contract. I verified nothing in the app parses an id prefix; `is_custom` has been a column since v108.

## New docs/QUEUE.md items

None added. The existing item was **rewritten**, which is the substantive queue change: the surrogate half shipped, and what remains is a different problem with a different fix.

## New docs/PHONE.md items

None. Nothing here is visible on a screen, and the round trip was proved against the real database rather than by eye.

## Probe

**What did the queue item tell you to do that you would have done differently?**
Two things, and the second is the batch.

The item required *"a migration of the live café's existing rows"*. I did not write one, because it is not needed, and I would rather say that plainly than perform a destructive migration to satisfy a sentence. New ids cannot collide with old ones, so the live rows are already safe.

More importantly, **the item conflated two problems under one name.** Surrogate ids (`SP`, `um`, `MENU`, `CX`, `U`, `CL`) are opaque handles and randomising them is correct and self-contained. The nine `app_settings` keys, `supplier_phrases.id`, `K0001` and `MENU_ORIGINAL` are **names the code looks things up by**, and randomising those breaks the lookup rather than fixing the collision - `supplier_phrases.id` is content-derived *on purpose*, because that is what makes re-teaching a pack update one row instead of duplicating it.

The second half's fix is "compose the key with the tenant", which needs a tenant column that does not exist. So the item's own claim that it is *"first of the A items because every other multi-tenant table change inherits it"* is **true of the half that shipped and false of the half that is left** - that half now carries `Do after: business_id + RLS`, which inverts the order the queue assumed. I rewrote the item rather than asking, since restating a mis-stated premise is mine.

**What did you not propose because it was out of scope?**
`uid()` uses `crypto.getRandomValues` where it exists and `Math.random` where it does not. I did not add telemetry or a warning for the fallback path: an id needs to not repeat, not to be unguessable, and a browser without `crypto` is already outside what this PWA supports. Worth knowing the fallback exists rather than discovering it.

I also left `_uidSeq`'s wrap at 36^4 without a guard for a session that mints more than 1.6 million ids. That cannot happen in this app - it would be sixteen hundred invoice imports in one page load - and a guard would be untestable ceremony.

## Surprises

**The change log had already solved this, and nobody noticed it generalised.** `nextChangeId` carried timestamp + a random per-load token + a counter, with a comment explaining that two tabs in the same millisecond would otherwise mint the same id. That is the identical argument one level up: two *accounts* in the same millisecond. The fix existed in the file the whole time, applied to one table, and the queue item describing the general problem never referred to it. **Worth generalising the habit rather than the code: when an item describes a class of bug, grep for somewhere the codebase already fixed one instance of it.**

**Five test harnesses broke, and that was the useful signal.** They build sandboxes out of real extracted functions, so adding a dependency to `saveCurrentPlate` and friends broke them loudly - which is exactly what that machinery is for. I gave each the real `uid` rather than a stub, per the rule about stubs mirroring contracts. Two self-inflicted mistakes on the way: backticks in a comment inside a template literal terminated the literal, and one file had **four** sandboxes where I had patched only the first.

**Nothing in the app parses an id.** I expected to find at least one place keying off the `CX` prefix, since `CLAUDE.md` says "Custom ids are `CX*`". There is none - v108 removed the last one when `is_custom` became a column. The only shape-parsing left is `nextKid`'s `^K`, which is inside the blob and out of scope. That is why changing the id format was safe, and it was worth checking rather than assuming.

## Review findings, all fixed in this branch

The pre-push agent (different model, no brief) found three, and the first is the one worth reading.

**The counter was not pinned by any test that could fail.** `uid`'s comment claims `_uidSeq` gives *absolute, deterministic* uniqueness within a session, but every uniqueness test ran with real `crypto`, whose eight random characters carry ~41 bits and mask any counter bug at those sample sizes. I proved the finding rather than taking it on trust: **freezing the counter at a constant left all five original uniqueness tests green**, and only the two new ones went red. That is the fourth-plus instance of the green-test-that-cannot-fail shape `CLAUDE.md` records, and I wrote it while writing the file that warns about it. The new test freezes the clock AND the randomness, so the counter is the only remaining source of difference.

**Modulo bias in the random block.** `byte % 36` over 0-255 makes the digits 0-3 about 14% likelier, because 256 is not a multiple of 36. Bytes at or above 252 are now rejected instead of folded, and the test proves rejection directly (a source alternating a rejected byte with byte 10 must yield only `a`) rather than statistically.

**A miscount in the queue prose**, and the correction was itself wrong: the reviewer said 26 against my 25, and the answer is 28 occurrences across 26 lines, one of which is my own new comment. Now written as measured, with the caveat, rather than as a number that rots.

Fixing the bias introduced a bug I then caught: the bounded retry loop can exit with a partly-filled buffer, and the Math.random fallback appended a fixed `n` characters on top of it, returning an over-long id. It now tops up TO `n`. Pinned, along with the fact that a hostile source cannot hang the loop.
