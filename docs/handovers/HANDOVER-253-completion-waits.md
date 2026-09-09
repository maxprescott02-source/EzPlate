# HANDOVER - 253 (the invoice's completion message waits for the writes)

**Branch:** `253-completion-waits` · **Scope:** `docs/QUEUE.md` item 90's first instance. The other two stay.
**Deploy version shipped:** `ezplate-v208`.

## What changed

An invoice import used to announce **"Invoice imported · 36 prices"** without awaiting a single write. If the server refused them all it still said that, while `pushWrite` toasted each failure underneath - so the user was told twice, once truthfully and once not.

It waits now and reports what landed: **"4 of 36 price writes saved - the rest did not reach the server"**, read from `setProducts`' saved manifest rather than from a boolean, so a partial import says so instead of claiming all or nothing.

**The dialog still closes immediately.** Holding it open through dozens of round trips on café data would be worse than the bug. That is the app's own delete-sequencing rule: the optimistic repaint stays, the WORDING waits for the server.

`logHistory` moved here from the bookkeeping block, where it fired unconditionally. 247 left it ungated on this path, said why at its site, and named this item as where the manifest would settle it.

## Review

**Three findings - two major - and both majors are the same shape.**

**Finding 1:** a write that never settles meant the completion card **never appeared at all**. `pushWrite` always settles given that the fetch under it does, and `createClient` has no timeout - so one stalled request would hold `Promise.all` open forever, and the caller waits on it before saying anything.
**The reviewer's framing of the trade is the right one:** the old code was wrong and always spoke; unbounded, the new code would be right and silent, and this project's own rule says silence is worse. Roster 195 - *a promise that never settles is a third outcome* - in the app rather than in a test.
So the verdict is bounded and **`null` is that third value**: "still saving", rendered as its own sentence. *"0 of 36 saved"* and *"we do not know yet"* are different claims, and only one of them is true there - which is the original defect's mistake pointing the other way.

**Finding 2:** gating the trend point on the price manifest alone dropped the repoint case. A repoint inside an import takes the `addNew` branch - it increments `added` and `relinked`, never `priceWrites` - and re-costs every plate using that ingredient. **A single-line invoice that only repointed logged no point, which is exactly what v114 was written to fix.**

**Finding 3:** the headline counts rows that MOVED and the shortfall counted every write sent; both were called "prices" on one card and read as contradicting each other. The line says "price writes" now.

Full report verbatim: `docs/reviews/REVIEW-253-completion-waits.md`.

## Into CLAUDE.md

Nothing. Both majors are instances of rules already in the file - roster 195, and the v114 history-path lesson - and this batch is evidence they work rather than a gap in them.

**What is worth carrying is a fact about THIS batch's own process**, recorded in the review artifact rather than as a rule: the mutation gate proved the count was untestable inline, I extracted that one, left the sibling decision inline, and the reviewer found exactly the one I left. **A decision nothing can run is a decision nothing has checked** - I had that evidence in hand and applied it to half the problem.

## New docs/QUEUE.md items

None. **Item 90 is updated rather than closed**: the completion message is struck, and what remains is written out - `doDeleteMenu`'s unawaited dish deletes, `priceHistory`'s wholesale replace at boot, and **a UX question this batch deliberately did not answer**.

That question is worth naming here because it is Max's: leaving a REFUSED ROW unticked with its own error needs the invoice review still on screen, so it is a decision about whether the dialog stays open through the writes - seconds, on café data, for dozens of products. The counts are honest without it.
Also recorded on the item, from the review: the shortfall covers the **price-update branch only**, so a failed product CREATION or pack teach is invisible to it.

## New docs/PHONE.md items

None.

## Probe

**What did the item tell you to do that you would have done differently?**
It said *"a rejected write leaves the row unticked with its error"* as though it were a straightforward requirement. It is not - it implies holding the dialog open, which is a real trade on this app's stated network conditions. I built the half that needs no decision and wrote the other half back into the item as a question.

**What did you not propose because it was out of scope?**
Bounding `createClient` itself. Finding 1's root cause is that no fetch in this app has a timeout, and I bounded one caller rather than the client - which is the narrower, more reversible change, but it means the next caller to await a write has the same hole. Not filed as an item: the app's own comment already records the gap in another place, and a second note would be the "vague C entry" `docs/MAINTENANCE.md`'s header warns about. **If a third instance appears, that is the moment.**

## Surprises

**The mutation gate got slower and it was my doing.** Testing a timeout makes every mutant of that function pay for it: at a 5000ms test timeout the full gate went **240s to 588s**, which on a CI job bounded at 20 minutes is not free. At 400ms - still twenty times the 20ms bound under test - a broken-bound mutant costs **0.49s instead of 5.12s**. **Bound the test as well as the code**, or a guard against hanging becomes the reason your guard against untested code hangs.

**And the tally lied again, exactly as `CLAUDE.md` says it does.** Hand-mutating the bound made the never-settles test TIME OUT, and `node --test` printed `fail 0` while exiting 1. Every mutation check in this batch was read from `$?`.
