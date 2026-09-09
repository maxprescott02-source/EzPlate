# REVIEW-248 — a price gets a date, an import gets a record, a column gets its real name

Reviewed-commit: 2c826f18c9cbfcd76069d73c082a20648faef994

**Agent:** `code-review`, run on Sonnet (the batch ran on Opus 5).
Given the diff and the codebase conventions, and **not** the queue item, so it judged correctness rather than conformance.

**One finding, a major, and it was mine.** Acted on; not declined.

It is the sharpest finding this process has produced, because of *how* it was found: the reviewer read my new comment against an **unmodified comment eleven lines above it** and noticed they say opposite things. Nothing in the diff itself was wrong-looking; the contradiction was only visible by reading the neighbourhood.

---

## The report, verbatim

> ## Findings
>
> ### 1. Major — `invoice_applied` change-log entry is gated on a write that has nothing to do with what it records
>
> **File:** `js/app.js`, in `applyInvoice`, roughly lines 13177–13203.
>
> ```js
> if(n||added){
>     var iso=new Date().toISOString(); try{localStorage.setItem('cafeDB_lastImport',iso);}catch(e){}
>     var setWrite=dbSetSetting('last_invoice_import',iso);
>     logHistory();
>     /* ... Gated on the setting write for the same reason 247 gates the trend point: a record of an
>        import that the server did not keep is a record of nothing. */
>     logChangeIfSaved(setWrite, 'invoice_applied', {avgBefore:null, avgAfter:null,
>       detail:{supplier:(invSupplier||null), lines:(invRows||[]).length, changed:n, added:added}});
> }
> ```
>
> `setWrite` is the promise from `dbSetSetting('last_invoice_import', iso)` — a write to the `app_settings` table. It has no relationship to whether the actual price/product writes for this import (the `n` price changes and `added` new products, each dispatched via its own `setProduct`/`setProducts` → `dbPushIngredients` call earlier in the same function) reached the server.
>
> The new comment justifies this as "the same reason 247 gates the trend point," but the unmodified comment three lines above it (from batch 247, still present verbatim) says the opposite:
>
> > "247: NOT GATED. ... Left as it was rather than gated on the `last_invoice_import` setting write beside it, **which decides nothing about the prices.**"
>
> That sentence is about `logHistory()` specifically not being gated on this same settings write, for exactly the reason that makes gating the new `logChangeIfSaved` call on it wrong: the settings write is orthogonal to whether the price data landed.
>
> **Concrete failure scenarios:**
> - The settings-key upsert (`last_invoice_import`) fails on a flaky connection (a single small write) while all the price/product writes for the import succeeded (they are separate `pushWrite` calls). Result: the invoice genuinely applied — prices are correct on the server — but `logChangeIfSaved` sees `setWrite` resolve to `{error}` and silently returns `null`. No `invoice_applied` entry is ever written, even though this is precisely the case the entry exists to record ("who, how many lines, how many moved"). Nothing tells the user this record was dropped; `showImportSummary`'s toast fires unconditionally from `n||added` regardless.
> - Inverted case: the settings write succeeds while `dbPushIngredients`' own chunked upsert (the code's own comments describe this exact hazard — "a 412-row import whose second chunk blips") only partially lands. `n`/`added` are counts of rows the UI *attempted*, not rows *confirmed saved* (unlike `logIngPrice`/`saveIngLog`, which correctly wait on the write's `saved` manifest for exactly this reason). Here, an `invoice_applied` row gets durably written to `menu_change_log` claiming `changed:n, added:added` even when some of those writes never reached the server — a false record, now persisted rather than ephemeral.
>
> This is a textbook "guard tests the wrong condition" bug, and it sits directly beside code (`dbPushIngredients`'s `saved` manifest, `confirmPrices`, `saveIngLog`) that already solved this exact partial-failure problem correctly for the price-log and product paths — making the new gate's crudeness look like a regression in discipline rather than an oversight.
>
> **Confidence:** high on the mechanism — it's demonstrated by reading the adjacent, unmodified 247 comment that directly contradicts the new comment's claimed precedent, and by the absence of any single write in this function that reflects the aggregate success of the price-changing operations.
>
> **Not caught by the diff's own tests:** `tests/change-log.test.js`'s new coupling check only asserts the *shape* of the `detail`/avg object literal at the call site (`avgBefore: null`, `avgAfter: null`) via regex on the source text — it never exercises or asserts what the first argument (`setWrite`) actually is or should be. `applyInvoice` is also not present in `tests/mutation/targets.js` (the queue item explicitly asked for this: "Add the writers to `tests/mutation/targets.js`"), so the mechanical mutation gate cannot catch this defect either — flipping `setWrite` to some other promise, or to `Promise.resolve({error:null})` unconditionally, would go undetected by every test this diff adds.
>
> ### Everything else checked and found correct
> - `price_as_of` stamping in `setProducts` (`js/app.js:1873-1892`): correctly gated on `hasOwnProperty('cost_per_base_unit')` rather than truthiness (handles `$0.00` correctly), written into `productsById` before `rebuild()`/`dbPushIngredients` so it reaches the row (the mappers at lines 410/439 already round-tripped this pre-existing column — confirmed unmodified by this diff), and covered by real assertions in `tests/bulk-product-writes.test.js` including a row-boundary check (`pushRows`) and an N=1-vs-N-plural equivalence check.
> - `invoice_applied` is correctly excluded from `lastChangeEntry`/`sinceLineHtml`, `recentChangeRows`, and `trendMarkers` — all three filter on `typeof e.avgBefore/avgAfter === 'number'`, and the entry passes `null` for both, verified by reading each function plus the new behavioural test in `tests/change-log.test.js`.
> - No naming-inversion problem: "Last change" → "Supplier move" is renamed in both `renderIngredients` (Products UI) and `renderKitchenPanel` (Ingredients UI), consistently, both driven by the same `ingLastMovePct` figure — matches the queue item's explicit scope note.
> - Cache version bump is consistent across all six spots — v204→v205 throughout.
> - No duplicate top-level declarations introduced; `CHANGE_KINDS` closed-list addition of `invoice_applied` is a single, well-formed array edit.
> - Visual test renames (`tests/visual/v140-products.spec.js`, `v190-tablet-band.spec.js`) are honest relabelings of the same assertions, not weakenings.
> - `price_as_of` addition does not require a backup-format bump: the key already existed in the in-memory shape and both row mappers before this diff (confirmed via `git diff` — those lines are untouched); only its *value* changes from always-null to sometimes-populated, so none of the four format-bump conditions are triggered.
>
> ### Minor / process note
> `docs/QUEUE-2026-09-08-CONSOLIDATED.md` item 22 (the item this batch implements) is not struck or marked done in this diff — only a *different* item (U38's first half) was struck with a cross-reference to 248. If this is meant to be the closing PR for item 22, the queue entry itself should be struck too, per this repo's own "a done-mark is not a strike" rule.

---

## What was done about it

**Finding 1: FIXED, and the finding is right on the defect, the mechanism and the reason the remedy is not "gate it better".**

Verified independently: the prices go out as one `setProduct` per row inside the loop, each with its own verdict. There is no aggregate promise in that function, so `setWrite` is orthogonal to what the record describes, and the reviewer's two scenarios are both reachable.

**The record is now UNGATED**, and the counts are renamed `attempted` / `addedAttempted`. The reasoning, written at the site:

- Gating on `setWrite` is wrong in both directions and the first direction is the worse one — dropping the record for an import that fully succeeded.
- **There is no honest boolean here.** An import's verdict is a *count* of what the server kept, which needs the saved manifest — and that is queue item 90's, together with the completion message that has the identical dependency. Batch 247 wrote that same sentence at this same site, which is the precedent I should have read instead of the one I cited.
- `menu_change_log` records **what Max did**. He applied an invoice of this size from this supplier, and that is true whatever the writes did. The entry carries no figures, so it reaches no surface.

**A second defect in the test, found while fixing the first:** the census's kind-matching regex only recognised `logChangeIfSaved(write, 'kind', …)`. Switching to plain `logChange('kind', …)` would have slipped a new kind into `applyInvoice` unseen — which is the census's own subject. Widened, plus an assertion that the record is *not* gated on an unrelated write. Both properties hand-mutated red.

**The process note is acknowledged and was a matter of ORDER, not omission:** the strike and the handover are `skills/batch` step 10, after the merge; the review is step 7. Both are now done in this branch. It is the second review running to raise it, which suggests the artifact would read better if it said so — noted here rather than acted on, since changing the loop's order to satisfy a reviewer's expectation would be the wrong direction.

**And the rule these two batches earned went into `CLAUDE.md`.** 247 cited the chunked-manifest argument at sites where `setProduct` is the N=1 wrapper; 248 cited a comment that says the opposite, in the same function, eleven lines up. **A justification that cites a precedent is a claim that the precedent's condition holds here, and it is never checked** — an exemption with no comment invites the next reader to check it, and one with a citation closes the question.

**Verification after the fix:** `npm test` 2028 pass · `npm run smoke` pass · full mutation gate 1243 mutants, 1197 killed, 46 survived all with written allowances · `npx playwright test` 474 pass, 14 skipped, run against the committed tree.

⚠️ **One Playwright run for this branch was discarded before that**, for the second batch running: it was launched in the background and then edited under while the review findings were applied. It is stopped rather than reported. The discipline that fixes this is to commit first and run second, which is what produced the numbers above.
