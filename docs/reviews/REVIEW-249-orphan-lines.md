# REVIEW-249 — the app asks which ingredient a stranded plate line meant

Reviewed-commit: 47c36506b543564a3108112646bb4e15147dcc70

**Agent:** `code-review`, run on Sonnet (the batch ran on Opus 5).
Given the diff and the codebase conventions, and **not** the queue item, so it judged correctness rather than conformance.

**Three findings — one CRITICAL, one moderate, one minor. All three acted on; none declined.**

The critical one is the most valuable this process has produced, because the defect is invisible at the call site: the code passes an average, and the *absence* of the second one is what makes it wrong, resolved live at a moment several statements away.

---

## The report, verbatim

> ## Findings
>
> **1. CRITICAL — `applyOrphanChoice` shares one `avgBefore`/`avgAfter` pair across every plate in the batch, and `trendMarkers` sums it once per entry, inflating the dashboard's daily drop marker.**
>
> `js/app.js:6255-6272` (`applyOrphanChoice`) computes `avgBefore` **once**, before the `forEach` over `savedPlates` runs, then mutates `sp.lines` for *every* matching plate synchronously inside that same loop before any write settles. Each plate gets its own `linkOrphanPlate` job (`js/app.js:6238-6246`), which calls `logChange('plate_edited', {... avgBefore:avgBefore ...})` with no `avgAfter` — so `logChange` defaults it via `computeAvgFoodCost()` (`js/app.js:4674`), called live at *that plate's* write-resolution time. Because all plates' `sp.lines` were already swapped before any promise resolved, every one of these calls observes the same post-batch state — so every entry in a multi-plate batch gets essentially identical `avgBefore→avgAfter`, each claiming to be responsible for the *whole* batch's average movement rather than its own share.
>
> `trendMarkers` (`js/app.js:6644-6663`) then aggregates by calendar day: `days[key].drop+=drop` for every qualifying `changeLog` entry that day. N plates linked in one product-choice therefore produce a marker showing roughly N× the real drop for that day.
>
> This is the exact class of bug CLAUDE.md documents ("arithmetic across two series fabricates movement") and the fix pattern already exists in this same file: the invoice repoint loop (`js/app.js:13361-13374`, and again at `13455-13465`) deliberately captures `avgBefore`/`avgAfter` **sequentially inside the loop, per item, immediately around that item's own mutation** — with a comment saying explicitly "the before/after pair is measured across this ingredient's own mutation, so the entries compose in sequence rather than each claiming the whole batch's movement." This diff does not follow that established, hard-won pattern.
>
> Concretely reproducible with the PR's own visual-spec seed (`tests/visual/249-orphan-link.spec.js`, 2 plates on one product): choosing an ingredient there logs two `plate_edited` entries, both carrying the *same* `avgBefore`/`avgAfter`, so the chart for that day shows double the actual food-cost drop. `sinceLineHtml`'s single-entry headline ("Your last change cut X pts") is *not* affected, since it just reads the newest entry — only the summed daily marker on the trend chart is wrong.
>
> No test (unit or the new Playwright spec) reads `changeLog` or the trend markers, so nothing catches this. Confidence: high — traced through `logChange`, `trendMarkers`, and the established sequential-composition precedent in the same file.
>
> **2. MINOR/MODERATE — `applyOrphanChoice` silently does nothing when the chosen product no longer has any matching lines, contradicting the sibling function's own stated rule.**
>
> `js/app.js:6272`: `if(!jobs.length) return Promise.resolve({plates:0, lines:0, failed:0});` — this early return skips `rerenderCurrentTab()` and every `toast(...)` call. Compare `applyBarePidHeal` (`js/app.js:6194-6224`), which has no such early exit: even with zero jobs it falls through to `Promise.all([])` and always fires a toast, with the comment "and never silence: pressing a button and being told nothing is how a user concludes it worked." If the underlying lines for a queued product resolve (e.g. a background `bootstrapSync`/`online` resync, per this diff's own comment at `6249-6252` acknowledging that race) between the modal rendering the group and the user clicking a candidate, `orphanChoose` calls `applyOrphanChoice`, gets back `{plates:0,lines:0,failed:0}` with zero visible feedback, and only the *next* `.then()` in `orphanChoose` re-derives the queue and silently moves on. Confidence: high (code read directly); severity is moderate since it's a narrow race, not a data-correctness bug.
>
> **3. MINOR — the "ambiguous" message overclaims relative to what's actually offered.**
>
> `js/app.js:6351`: *"More than one ingredient uses that product, so the app will not choose between them. Either costs the same."* This is only true of the two-or-more ingredients that actually own the product. The list rendered below it (`renderOrphanChoice`, `js/app.js:~6355-6363`) offers **every** kitchen ingredient with a linked product, not just the ambiguous owners — so a user who picks some unrelated ingredient gets a real cost change despite being told upfront "Either costs the same." The per-row `.ad-meta` text (via `orphanChoiceDelta`) does show the correct number for that specific row, so the actual figures aren't wrong — but the blanket reassurance at the top of the modal is. Confidence: medium-high on the wording being misleading; whether this rises to "wrong" depends on how literally a reader takes "either."
>
> ## Not a finding, checked and clean
>
> - The rollback path (`linkOrphanPlate`'s fulfilled/rejected arms both reset `sp.lines=before`) mirrors the heal's pattern correctly and only logs on confirmed success.
> - The re-check-at-write logic (`l.pid!==pid`, `l.kid` exclusion) correctly re-derives from live `savedPlates`/`kitchenIngredients` at write time rather than trusting the stale modal snapshot, matching `barePidSameProduct`'s pattern.
> - `costBefore`/`costAfter` per plate (used by "Recent changes") are computed correctly per-plate and are unaffected by finding 1.
> - All six cache-version spots agree at v206.
> - No duplicate top-level declarations introduced; `orphanPidGroups`/`orphanChoiceDelta` correctly derive from `barePidPlan` rather than re-walking plates (avoiding the mirrored-copy defect class).
> - `lineCost`/`orphanChoiceDelta` correctly treat `0` as a legitimate cost and null/undefined as unknown, per the `isFinite('')` and "0 is legitimate" rules.

---

## What was done about it

**Finding 1: FIXED, and it was right on the defect, the mechanism and the remedy.**

Verified independently before acting: `logChange` really does default an omitted `avgAfter` to a live `computeAvgFoodCost()` at call time, and `trendMarkers` really does sum `drop` per calendar day.

**The remedy is the one the finding names, and it is already in this file with a comment explaining itself** — the invoice repoint loop measures its pair around each item's own mutation *"so the entries compose in sequence rather than each claiming the whole batch's movement"*. `applyOrphanChoice` now reads `avgBefore` immediately before assigning `sp.lines` and `avgAfter` immediately after, per plate, and passes **both** explicitly. Leaving `avgAfter` to default is what made it late.

**Why this one is worth reading twice:** nothing at the call site looked wrong. The code passed an average. The defect was the *absence* of the second argument, resolved live several statements and one promise away — a comment could have described that call correctly and still been wrong about what it produced.

Pinned end to end in the browser, which is where it had to be, since `changeLog` is the subject: two entries, both real numbers, B's `before` equal to A's `after`, and the per-plate drops summing to the batch drop rather than double it. **Restoring the exact defect turns it red.** The spec's seed gained two dishes on a menu, because without them every average is null and all of those assertions would have been vacuous — the 205 shape, caught before it shipped rather than after.

**Finding 2: FIXED.** The early return is gone. `applyBarePidHeal` has none and its comment is the reason — *"never silence: pressing a button and being told nothing is how a user concludes it worked"*. An empty batch is exactly the re-sync race this function guards for, which makes it the case a person most needs told about, not least.

**Finding 3: FIXED.** The ambiguous copy said *"Either costs the same"* while the list offers every ingredient with a product, not only the owners. It now says the ones that use it cost the same as each other and that anything else re-costs, with each row saying what — which is what the rows were already doing.

**Verification after all three:** `npm test` 2035 pass · `npm run smoke` pass · full mutation gate 1269 mutants, 1221 killed, 48 survived all with written allowances · `npx playwright test` 478 pass, 14 skipped, against the committed tree.
