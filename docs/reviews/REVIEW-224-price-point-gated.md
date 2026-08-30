# REVIEW - 224 (a price point rides the write that carries it)

Reviewed-commit: 4e2915358406ca6a9cda11b14148ec1913ea09c9
**Agent:** pre-push `code-review`, Sonnet against Opus 5, on the branch diff, without the queue item.
**Verdict:** two findings, both verified by reproduction against the real extracted functions. Both fixed in this branch.

⚠️ The `Reviewed-commit` above names an ANCESTOR, not the tip: the review read the first cut of the
gate, and the commits after it are the fixes for what it found. That is the documented limit of this
artifact (`docs/reviews/README.md`), not a slip.

---

## The report, verbatim

I have what I need. Two verified findings, both reproduced by running the real extracted functions from `js/app.js` (not hand-rolled stubs).

---

## Finding 1 — CRITICAL: the new gate treats a chunked, non-atomic write as one atomic verdict, silently deleting real price history

**Where:** `js/app.js:1413,1433-1434` (`setProducts` passing `write` to `saveIngLog`/`confirmPrices`) × `js/app.js:470-481` (`dbPushIngredients`'s per-chunk `reduce`) × `js/app.js:3685-3703` (`confirmPrices`) × `js/app.js:3706-3719` (`unlogIngPrices`).

**Mechanism:** `dbPushIngredients` splits `entries` into 200-row chunks (`ING_PUSH_CHUNK=470`) and sends them **sequentially**, stopping at the first chunk that errors — chunks already sent have already landed on the server; chunks after the failure are never attempted. This was already known and pinned before this batch (`tests/bulk-product-writes.test.js:303-309`, *"a failed chunk STOPS the rest, and the failure is what resolves"*). It resolves to **one combined promise** carrying only the first error.

`setProducts` hands that single promise to `saveIngLog(write)` and `confirmPrices(write, entries, priced)`, both of which treat it as an all-or-nothing verdict for **every** entry in the call: on error, `unlogIngPrices` deletes every point the call logged, and `confirmPrices`' `refuse()` marks every priced id "unconfirmed." Neither has any idea that an earlier chunk actually succeeded.

**Concrete failure:** `catImportApply` (`js/app.js:2631-2664`) calls `setProducts(entries)` with the whole import plan — Scoopy's real catalogue is ~400 products, guaranteeing 3 chunks. If chunk 2 of 3 fails (a transient blip on a multi-hundred-row payload, on the "café phone, one bar" connection this whole feature is framed around), chunk 1's ~200 products are **genuinely saved on the server**, but:
- Their price-history points are deleted from `ingPriceLog` (never reach `ing_price_history`) even though the price change is real and confirmed.
- `confirmedPrice()` for those ~200 products reverts to the pre-import value, disagreeing with `productsById` and with what the server actually holds.
- The user is told *"The import did not finish saving. Nothing is lost — press Import again when you have a connection"* (`js/app.js:2663`) — false for the successfully-landed chunk's price history.

**Verified by reproduction** (extracted the real `pushWrite`, `dbPushIngredients`, `setProducts`, `saveIngLog`, `confirmPrices`, `unlogIngPrices`, `confirmedPrice` via `_extractfn`, ran a 3-product/chunk-size-2 scenario where chunk 1 `[A,B]` succeeds and chunk 2 `[C]` fails):
```
upsertCalls (what actually reached the mock server): [ [ 'A', 'B' ], [ 'C' ] ]
pointPushes (what reached ing_price_history): []
points(A) in memory log: []
confirmedPrice(A): 1   actual productsById(A).cpbu: 1.5
```
A and B's price changes really landed; their history points and confirmed-price baseline were silently erased anyway.

**No test in the diff catches this.** `tests/price-log-paths.test.js` and `tests/bulk-product-writes.test.js`'s new "[8]" tests all stub `dbPushIngredients` as a single atomic call (`if(CTL.mode==='error') return Promise.resolve({error:...})`), so the real chunking behavior is never exercised alongside the new confirm/rollback logic — the one existing test that does exercise real chunking (`bulk-product-writes.test.js:303`) predates this batch and never touches the price log.

**Confidence:** high — reproduced directly against the extracted real functions, not reasoned about.

---

## Finding 2 — MAJOR: out-of-order settlement of two overlapping writes to the same product corrupts `_unconfirmedPrice`

**Where:** `js/app.js:3673-3703` (`_unconfirmedPrice`, `confirmedPrice`, `confirmPrices`).

**Mechanism:** `confirmPrices`' `refuse()` (`js/app.js:3688-3691`) sets `_unconfirmedPrice[p.id] = p.had` on any failed write, guarded only by "if not already present" ("oldest refusal wins"). That comment assumes the oldest-*issued* write's `had` is always the last-confirmed price — true only if writes for one id settle in issue order. They don't have to: two independent HTTP requests for the same row (e.g. `applyInvoice`'s own back-to-back price-write-then-pack-teach-write for one matched line, `js/app.js:11572` then `js/app.js:11594`, or two rapid saves) can settle out of order. If an **earlier**-issued write's failure arrives **after** a **later**-issued write for the same id has already succeeded, `refuse()` stomps `_unconfirmedPrice` with the stale, superseded `had`, even though the later write's full-row upsert already persisted a newer, correct price to the server.

**Concrete failure:** issue write A (price 5→10, held in flight), then B (10→14, succeeds), then C (14→13, succeeds) for the same product — all real, all landing on the server, final server price 13. Now A's held request finally resolves as a refusal. `confirmedPrice()` afterward reports the pre-A value (5) instead of the true, server-confirmed 13. From then on, any future price write for that product computes its "did the price move" baseline against this stale value — able to either fabricate a phantom history point (if the next save re-affirms the true current price, which now looks "different" from the stale baseline) or **silently suppress a real point** (if the next genuine price happens to equal the stale baseline).

**Verified by reproduction** using the real extracted `setProducts`/`confirmPrices`/`saveIngLog`/`unlogIngPrices`/`confirmedPrice` with a controllable "hold" write:
```
BEFORE release, confirmedPrice = 0.013
AFTER late refusal of A, confirmedPrice = 0.0122
but productsById price = 0.013
pushedPoints = [ {v:0.014}, {v:0.013} ]   ← both landed on the mock server
```
The batch's own new test `tests/price-log-paths.test.js` (*"a refusal removes ITS OWN point, not whichever point happens to be last"*) drives exactly this A/B/C-then-late-refusal sequence already, but only asserts on `points()`/`pushedPoints` — it never asserts `confirmedPrice()` afterward, so the bug it's already producing goes unchecked. One added `assert.equal(s.confirmedPrice('P0004'), 0.0130, ...)` at the end of that existing test would fail today.

**Confidence:** high — reproduced against real code; the trigger (overlapping writes to the same product id settling out of order) is realistic given `applyInvoice`'s own unawaited double-write-per-row pattern and the flaky-mobile-connection framing this feature is built around.

---

Both findings share the same root cause: the new `confirmedPrice`/`_unconfirmedPrice` mechanism assumes each `setProducts` call's settle event is the sole authority on that call's ids, with no way to detect that a *different* write (a later chunk of the same call, or a separate concurrent call) already established a newer truth for the same id. Relevant files: `/Users/max/Documents/Scoopys-Costing/js/app.js` (lines cited above), `/Users/max/Documents/Scoopys-Costing/tests/price-log-paths.test.js`, `/Users/max/Documents/Scoopys-Costing/tests/bulk-product-writes.test.js`.

---

## What was done about each

**Finding 1 — ACCEPTED AND FIXED.** Reproduced independently before acting on it, per `CLAUDE.md`'s
rule that a finding carries up to three separable claims. The defect and the mechanism are both
right; the closing paragraph names the correct root cause for both findings.

It is a REGRESSION against `main`, not merely a limitation, and that is the part that settles the
severity: before this batch a partial chunk failure pushed phantom points for the un-landed chunks
AND correct points for the landed ones. The first cut of the gate pushed neither. So it traded a
visible wrong number for an invisible missing one, on the 412-product catalogue import — by this
batch's own stated reasoning, the worse of the two.

`dbPushIngredients` now resolves a `saved` manifest naming the ids that reached the server, present
on every exit it has. `saveIngLog` and `confirmPrices` read that instead of the error, so the verdict
is per PRODUCT. The `ING_PUSH_CHUNK=470` in the finding is a line number, not the value (it is 200);
the mechanism is unaffected.

**Finding 2 — ACCEPTED AND FIXED, with a remedy wider than the one implied.** The finding's suggested
action is an added assertion, which would have made the defect visible rather than fixing it. The
assertion was added *and* the mechanism was rebuilt: `_unconfirmedPrice` is replaced by `_priceSeen`,
one record per product carrying the `seq` of the write that produced it, stamped at ISSUE time in
`setProducts`. A refusal may only name the server's price if nothing newer has settled for that
product; among refusals the oldest still wins. `applyInvoice`'s unawaited price-then-pack pair, which
the finding names, is exactly the reachable trigger.

**Coverage the finding was right to call out.** Both new-test criticisms were correct: every "[8]"
test stubbed the write as one atomic call, and the held-write test asserted everything except the
value that was wrong. `tests/bulk-product-writes.test.js` section 8 now runs the REAL `dbPushIngredients`,
the REAL chunk fold and the REAL price-log chain together, with `ING_PUSH_CHUNK` overridden to 2 after
the shipped declaration is sliced in. Hand-mutated to confirm it goes red against the pre-review code.

Four new mutants appeared in the reworked `confirmPrices`; two are killed by new tests and two are
equal-`seq` boundaries that are unreachable by construction, with written allowances in
`tests/mutation/targets.js` saying why.
