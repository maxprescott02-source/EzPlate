# REVIEW-246 — a failed menus read is a failed boot

Reviewed-commit: ee2f2a679bf419201297e5472aad21750dc8325f

**Agent:** `code-review`, run on Sonnet (the batch ran on Opus 5).
Given the diff and the codebase conventions, and **not** the queue item, so it judged correctness rather than conformance.

**No code-correctness defects.** Two findings, both process, both acted on — and the first turned out to be about a **different queue item**, which is the more valuable half of it.

It was told explicitly to look for what a deletion and a newly-fatal read could break, and it traced the read ordering, the throw placement, the catch-path memory state, the surviving writers' contracts, and whether the rewritten tests still pin what they used to. Nothing.

---

## The report, verbatim

> ## Review: branch `246-menus-read-fatal` vs `main`
>
> **Scope traced:** the `menus` read becoming fatal in `bootstrapSync` (`js/app.js:1514-1656`), the deletion of `ensureDefaultMenu` (`js/app.js:3219` tombstone, was around old `:3226`), the three surviving `menusList` writers (`bootstrapSync` assignment, `submitNewMenu`, `ensurePublishMenu`), the rewritten unit tests (`tests/boot-gate.test.js`, `tests/menu-default.test.js`, `tests/unique-ids.test.js`, `tests/housekeeping.test.js`), the new Playwright spec (`tests/visual/246-menus-read.spec.js`), the six cache-version spots, and the CI spec-count comment.
>
> ### Core mechanism — no defect found
>
> I checked this specifically against the priority list:
>
> - **Wrong condition:** the fatal check `if(ing.error||men.error||pla.error||setg.error||mres.error) throw(...)` at `js/app.js:1656` is placed after `mres` is destructured from `results[4]`, and `SUPA.from('menus').select('*')` is issued bare (not `soft()`-wrapped) at the correct array position — indices for every other destructured result (`_h`, `_mp2`, `spr`, `_ipl`, `_chg`, `_biz`, `_ses`, `_role`) are unaffected, since `menus` already occupied slot 4 before the diff. Verified by reading the full `Promise.all` array and the destructuring line side by side.
> - **Writes not landing:** the `else ensureDefaultMenu()` branch that used to unshift an unwritten, in-memory-only menu is gone, and I confirmed `ensureDefaultMenu` has no remaining callers anywhere (`grep -rn ensureDefaultMenu` across the repo — every remaining hit is prose/tombstone/test). The three surviving writers of `menusList` (`bootstrapSync` line 1706, `submitNewMenu` line 13525/13539, `ensurePublishMenu` line 3290-3299) all either assign from a confirmed server read or roll back on a refused write — I read each and they match the claim made in the new comments.
> - **Sequencing / catch behavior:** on a thrown `mres.error`, control never reaches the `menusList=(mres.data||[]).map(...)` assignment (line 1706) — the throw at line 1656 happens first, and the outer `catch` (line 1776) leaves memory untouched, so `menusList` stays at its module-scope initial `[]` rather than being corrupted or partially written. Confirmed this is what the new Playwright spec measures (`expect(...menusList).toEqual([])`).
> - **Silent failure:** this is exactly what the diff removes — a `soft()`-swallowed `menus` failure that previously left the boot reporting `ok` with a fabricated menu. Now it's a proper `bootReady('error', ...)` state.
> - **Tests that can't fail:** the grep-based unit tests in `boot-gate.test.js`/`housekeeping.test.js`/`unique-ids.test.js` are explicitly labeled as coupling checks, and the real behavioral assertion lives in the Playwright spec, which injects a genuine `menus` failure at the fake Supabase client and asserts on `#bootGate` visibility, `menusList`, and `currentMenuId` — including a counterweight test proving the ordinary (non-broken) boot still works. I read both tests in full; they exercise the actual condition, not a restated tautology. `housekeeping.test.js`'s new comment-stripping change is itself tested for not going vacuous (asserts a live call still matches, a tombstone comment doesn't) — this is the correct remedy pattern this file's own roster prescribes.
> - **Dead/unreachable code:** none left behind — `ensureDefaultMenu` is fully deleted (definition and reference), `DEFAULT_MENU_NAME` still has a live consumer (`ensurePublishMenu`), and the old `var menusRead` local is gone with no stray references.
>
> I ran the full suite (`npm test`, 2015 tests) and the four directly-touched test files individually — all green. Cache version bumped consistently across all six spots (`sw.js` `CACHE` + 2 `ASSETS` entries, `index.html` CSS link + JS script tag, `APP_VERSION` var). CI's spec-count comment (58→59, 57→58) matches the actual file count (59 spec files, `screenshots.spec.js` excluded).
>
> ### Findings
>
> **1. Minor / process — the shipped fix doesn't strike its own queue entries.**
> `docs/QUEUE.md` and `docs/QUEUE-2026-09-08-CONSOLIDATED.md` still list item 20 ("A failed `menus` read is treated as a valid boot and mints a menu the server never had") as open `next` work, and `docs/MAINTENANCE.md:1078` still describes it as `⚠️ UNMEASURED`. `git diff main...HEAD --stat -- docs/` is empty except `CLAUDE.md`. This is the exact "done-mark is not a strike" pattern CLAUDE.md itself names (AUDIT-v197) and the project's own rule is explicit: *"When one ships, delete it here AND strike it there... the strike is what stops finished work being re-promoted."* Worse, item 21 in the queue says `Do after: 20 — reproduce its fictional menu first; part of this may fall out of that` — but this fix eliminates the fictional-menu state entirely, so item 21's stated repro trigger is now false, which is the "a queued item's facts expire" trap the file separately warns about. No `docs/handovers/HANDOVER-246-*.md` exists either. Confidence: high that this is a real gap (verified via `git diff --stat -- docs/` and reading the current queue text); low-stakes since it's bookkeeping, not runtime behavior, but it's the kind of gap this repo has previously called out as costly (stale facts get trusted, and a future `/batch` could re-pick or misjudge item 21).
>
> **2. Nit — `tests/smoke.js:66-69` comment is now stale.**
> It says *"only bootstrapSync may decide to seed, and only when the table did not answer"* — bootstrapSync no longer seeds under any condition (the seeder is deleted). Not touched by this diff, and not functionally significant since `smoke.js` hydrates `menusList` directly rather than calling `bootstrapSync`, but it's exactly the kind of comment this project's own rules say to catch.
>
> ### Bottom line
>
> The core change — making the `menus` read fatal, deleting `ensureDefaultMenu`, and updating the three writers/comments that depended on the old two-valued gate — is correct and internally consistent everywhere I traced it: the read ordering, the throw condition, the catch-path memory state, the surviving writers' contracts, and the test coverage (both the grep-based coupling checks and the real browser behavioral spec). I did not find a wrong condition, a write that fails to land, a sequencing bug, or a test that can't fail. The only findings are process/documentation drift (queue items not struck, one stale test comment), not code-correctness defects.

---

## What was done about it

**Finding 1 — half of it is a false alarm about batch ORDER, and the other half is a real catch about a different item. Both are worth separating.**

The strike and the handover are `skills/batch` **step 10**, which runs after the merge; the review is step 7. So "the queue is not struck yet" at review time is the process working, not drifting, and the reviewer could not have known that from the diff alone. Recorded rather than waved away, because a reader of this artifact would otherwise see the finding and no response.

**What is a genuine finding, and it is about ITEM 21 rather than item 20:** item 21 carried `Do after: 20 — reproduce its fictional menu first; part of this may fall out of that`, and **this batch's fix makes that state unreachable.** The ordering is satisfied and its stated *reason* is falsified, by the batch immediately before the one that would have picked it up. So 21 needed more than the `Do after:` line deleting — it needed to be told that nothing falls out of 20 and that it must build a failure trigger of its own. Both `docs/QUEUE.md` and the consolidated file now say so, and name the copyable one: a refused `menu_items` upsert injected at the client, exactly as `tests/visual/246-menus-read.spec.js` does for a different table.

**The same falsified premise was in `docs/MAINTENANCE.md`**, in the sibling bullet of the very entry being struck — it pointed at "the fictional menu in the FIRST bullet of this section" as its deterministic trigger. Corrected in the same edit. Neither of those would have been found by looking at this diff; the reviewer found them by reading the queue against it.

**Finding 2 — FIXED.** `tests/smoke.js`'s comment now records what actually happened, and notes that nothing seeds under any condition any more. It is the second comment in two batches that was correct when written and falsified by a later change, which is `CLAUDE.md`'s wrong-consequence family arriving by way of time rather than by way of a wrong conclusion.

---

## A note on the verification behind this batch, because one run of it was invalid

The first full Playwright run for this branch was launched in the background **while the working tree was still being edited**, and it is discarded: 47 minutes against a normal 8.6, and 466 passed where 474 was expected, with exit code 0 and no failures reported. A green result from a run whose subject changed underneath it is worth nothing, and this project's own rule about proving a harness actually ran covers exactly that shape.
Re-run against the committed tree with no concurrent edits: **474 passed, 14 skipped, 8.6 minutes.** That is the run this batch is relying on.
