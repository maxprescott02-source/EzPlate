# REVIEW-247 — the trend point waits for the write

Reviewed-commit: 501ad127af96bbc06c7cbd18005b8c8db5967fa5

**Agent:** `code-review`, run on Sonnet (the batch ran on Opus 5).
Given the diff and the codebase conventions, and **not** the queue item, so it judged correctness rather than conformance.

**Two findings. The first is a major and it was mine — a justification I wrote that is FALSE at the two sites it was written on.** Both acted on; neither declined.

The finding is the batch's own defect rather than the item's, which is now the third batch running where that has happened. It is also the sharpest kind: not a missing guard, but a *comment arguing for* a missing guard.

---

## The report, verbatim

> ## Review: `247-write-settled` branch (`js/app.js` logHistory deferral)
>
> Read the diff plus `logHistoryPoint`, `logChangeIfSaved`, `dbPushIngredients`/`setProducts`, `pushWrite`, `dbDeleteMenuRecord`, and all 18 `logHistory` call sites in full. Findings below.
>
> ### 1. `commitPrice` and `saveIngEdit` (js/app.js:2115–2134, 5424–5454) — the "chunked write, wrong question" justification is false for these two sites, and they retain exactly the bug this batch exists to fix
>
> **Severity: major.**
>
> The new `logHistory(write)` gates a trend-line point on `!r||r.error`. Two call sites are deliberately left calling `logHistory()` with no argument, each carrying an identical comment:
>
> > "NOT GATED, deliberately. `setProducts` returns a CHUNKED write whose verdict is a saved manifest rather than a single error … so `!r||r.error` is the wrong question here: a partial success really did move the average."
>
> But `setProduct(id, patch)` is defined as `return setProducts([{id:id, patch:patch}])` — always a **single-element array**. In `dbPushIngredients`, `chunks=[[row]]` for one row, so exactly one `pushWrite` call is made and its `error` field is a complete, binary verdict — there is no "partial success" possible for one row. The "manifest vs. single error" distinction only matters when `setProducts` is called with many entries at once (the catalogue importer), which neither `commitPrice` nor `saveIngEdit` ever does.
>
> Concretely: a user edits a product's price in the builder (`commitPrice`) or the Products-tab edit form (`saveIngEdit`) while offline or on a flaky connection. `pushWrite` fails and toasts "it has NOT been saved," but `logHistory()` still runs synchronously and unconditionally, pushes a point to `priceHistory`, **and calls `dbPushHistory(iso, v)` which writes that point to the server's `price_history` table** — a permanent row describing a price move that never happened, in the exact table the batch's own top-of-function comment says "nothing can correct." This is the precise failure mode the whole diff was written to close, still open on two of the app's most common single-price-edit paths.
>
> The `write` value needed to close this is trivially available (`var write=setProduct(...); logHistory(write);`), exactly like the twelve other threaded sites — it just wasn't captured. `applyInvoice`'s ungating is legitimately different (its loop fires N independent `setProduct` calls with no single aggregate promise to gate on), but that reasoning was copy-pasted onto two sites where a single reliable promise already exists.
>
> **How to verify:** call `commitPrice` (or `saveIngEdit`) in a harness where the underlying `dbSetSetting`/write mock returns `{error:...}`, and check `priceHistory`/`histPushes` — they will contain a point, same as before this diff. `tests/history-paths.test.js`'s new refusal tests cover paths 2/5/10/12 but nothing exercises this path, which is consistent with the gap being real rather than merely untested.
>
> **Confidence:** high on the mechanism (verified `dbPushIngredients`'s single-chunk behavior directly); high that this reproduces the exact defect the diff's own preamble describes.
>
> ### 2. The point gates on "this write landed" but is computed from live global state, so a concurrently-failed sibling edit can still ride in on a different write's success
>
> **Severity: minor/informational — narrow window, largely pre-existing.**
>
> `logHistoryPoint()` calls `computeAvgFoodCost()` etc., which read the *entire current in-memory state* (documented elsewhere in the file as "live"). The new gate only checks that **the write passed to this particular `logHistory` call** succeeded — it says nothing about whether other optimistic mutations currently sitting in memory (from a different, still-pending or already-failed sibling write, e.g. another dish edited moments earlier) are real. Sequence: edit A mutates state and calls `logHistory(writeA)`; edit B mutates state further and calls `logHistory(writeB)`; `writeB` fails and correctly logs nothing, but leaves its bad state in memory (this app does not roll back optimistic edits outside the plate/menu-delete paths); `writeA` then resolves successfully and `logHistoryPoint()` computes and pushes a point off the *combined* state, which includes B's un-landed edit. The comment `// the mutation did not land, so nothing moved` is true only of the write being awaited, not of the value actually pushed.
>
> This isn't new in kind — the "live" read design already meant every logging call read whatever state happened to exist — but the diff's framing implies a stronger per-write guarantee than the mechanism actually provides. Realistically low-frequency for a single intermittent user, but worth naming since the comment overstates what the gate proves.
>
> **Confidence:** medium — mechanism reasoning is sound, but I can't rule out that rapid double-edits of this shape are rare enough in practice to be a non-issue; flagging per the "state confidence separately" instruction.
>
> ### Everything else checked and found consistent
>
> - All twelve `logHistory(write)`/`logHistory(_write)`/`logHistory(menuWrite)` threaded call sites pass the correct promise for their own mutation, threaded after the relevant in-memory mutation and (where required) after `rebuildMenu()` — matches each site's own "stale MENU" comment.
> - `dbDeleteMenuRecord`, `upsertCustomMenu`, `removeMenuItem`, `dbPushMenuAfterPlate`, `saveKitchenIngredients` are all genuinely `pushWrite`-backed promises (never reject, per `pushWrite`'s own contract), so the `.then(ok, ()=>null)` two-arm handling in `logHistory` is safe.
> - `doDeleteMenu` gates the point/change-log entry only on the `menus` row delete, not on the fire-and-forget per-dish `menu_items` deletes — but this is pre-existing, explicitly flagged in-code as out of scope, and unchanged in substance by this diff (only which promise the *point* also waits on).
> - Six-cache-version spots (`index.html` ×2, `sw.js` CACHE + 2 ASSETS entries, `APP_VERSION` in `js/app.js`) are all bumped to v204 consistently.
> - `tests/history-paths.test.js` and `tests/mutation/targets.js` additions are real (extract-and-run the shipped `logHistory`/`logHistoryPoint`, not a hand-rolled stub) and include both a refusal case and a same-path success counterweight for each of the four newly-tested paths, avoiding the "test that cannot fail" trap.
> - `docs/QUEUE.md`/`docs/QUEUE-2026-09-08-CONSOLIDATED.md` correctly strike item 21's history half and split the remainder into item 90, consistent with the "strike the entry, not just a done-mark" rule.

---

## What was done about it

**Finding 1: FIXED at both sites, and the finding is right on all three of its separable claims.**

Verified independently before acting, by reading `dbPushIngredients`: `chunks` is built at `ING_PUSH_CHUNK` granularity, so one row is one chunk, one `pushWrite`, one `.error`. There is nothing partial to lose at these two sites. The "manifest" argument belongs to the catalogue importer, which passes hundreds of entries — and `setProduct` is `setProducts`' N=1 wrapper, a distinction `CLAUDE.md` already records under `ingredients.updated_at` ("Grep the plural") and which I got backwards in the other direction.

Both now gate: `logHistory(setProduct(...))` in `commitPrice`, and a captured `_prodWrite` in `saveIngEdit`. Only `applyInvoice` remains ungated, which the reviewer independently agreed is legitimately different, and its note is unchanged.

**The part worth recording is not the missing guard — it is that I wrote a justification for it.** A site with no comment invites the next reader to check; a site with a confident, specific, wrong argument closes the question. That is the "comment records the defect correctly and files it under the wrong consequence" family at its worst, shipped inside the batch whose entire subject is the gate. `tests/history-paths.test.js` now drives `commitPrice` with a refused product write and asserts no point lands, plus the success counterweight; hand-mutating the site back to ungated turns it red.

**Finding 2: the COMMENT is fixed and the DEFECT is filed, because they are different sizes.**

The reviewer is right that the gate proves less than the comment implied, and right to hold it at medium confidence. The comment now says exactly what it proves — "THIS mutation did not land" — and states the residual in full: `computeAvgFoodCost` reads live memory, and this app does not roll back an optimistic edit outside the plate and menu delete paths, so a sibling edit whose write failed a moment ago is still in that average.

**The real fix is not a tighter gate — there is nothing tighter to gate on. It is rolling back a refused edit**, which the delete paths already do and every other optimistic path does not. That is a larger change than this batch and is filed in `docs/MAINTENANCE.md` with its measured grounds for being C (one round trip; the user is toasted; the next boot replaces memory — so the wrongness survives only in the `price_history` row, which is the part that matters). The entry says explicitly: do not "fix" this by gating `logHistory` harder.

**Verification after both fixes:** `npm test` 2023 pass · `npm run smoke` pass · full mutation gate 1241 mutants, 1195 killed, 46 survived all with written allowances · `npx playwright test` 474 pass, 14 skipped (run against the committed tree with no concurrent edits).
