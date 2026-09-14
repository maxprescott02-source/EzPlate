# REVIEW-265 — branch protection, one bump script, a closure gate

Reviewed-commit: 970f79e73584cdd2bc5931ce57cdc3ad29ce391f

**Agent:** `code-review`, run on **Sonnet**. The batch itself ran on Opus 5, and `CLAUDE.md` requires the reviewer to be a different model from the writer, so the definition's `opus` pin was overridden for this run.
**Shown:** the branch diff and the file list. Not shown: the fix-plan item, the audit, or any prompt describing the intent.

---

## Findings, verbatim

**1. Critical — duplicate item number 93 in the backlog of record.**

`docs/QUEUE-2026-09-08-CONSOLIDATED.md:324` already holds `## next  93 · The two halves of the parser eval that need the real invoices`, added by batch 261 (and referenced from line 295: *"The two halves that need the real PDFs are item 93"*, and again from `docs/QUEUE-GROUPS.md:117-119`, which routes it into G2 as tier C).

This diff adds a second, unrelated entry at line 816 with the identical heading number: `## next  93 · Re-grep every open backlog item's named sites, once, before any of them is planned against`. Two distinct items now share id 93 in the file this project calls "the backlog of record" and whose numbering is used for cross-references (`Do after: N`, `item N`, `#N`).

This isn't just a latent inconsistency — the new number is immediately used as a live reference: `docs/audits/WORKFLOW-AUDIT-2026-09-09.md`'s new closure line for recommendation 1 reads *"the bulk sweep is queued as **#93**"*, which is exactly the collision. Anyone resolving that `#93` reference (by eye, or via the `#\d+` pattern the new `tests/audit-closure.test.js` `CLOSED` regex matches on) lands on two different items, one of which is an unrelated, already-routed, still-open tier-C item about the parser eval's real PDFs.

Item 94 (`blocked 94 · Merge on a green pre-push hook...`) does not collide with anything existing — only 93 is duplicated.

- **What breaks:** a future reader or batch following "item 93" or "#93" cannot tell which item is meant; `docs/QUEUE-GROUPS.md` routes only the parser-eval 93, so the new "re-grep the backlog" item is an orphan not routed to any group at all, and would be invisible to the group-refill logic in `skills/batch/SKILL.md` step 4 if it were ever promoted into `docs/QUEUE.md` (nothing currently catches this, because `tests/queue-routing.test.js` only checks numbers already living in `docs/QUEUE.md`, and both instances of "93" live only in the consolidated backlog file).
- **How to verify:** `grep -n "^## next  93" docs/QUEUE-2026-09-08-CONSOLIDATED.md` returns two lines (324 and 816). `grep -n "93" docs/QUEUE-GROUPS.md` shows only the parser-eval item routed. The new item should have been numbered 95 (94 is already taken by the other new item in this same diff).
- **Confidence:** high — directly observed by grep, not inferred.

**2. Minor — `SECTION` regex in `tests/audit-closure.test.js:31` over-matches on the substring "recommend", not the phrase "recommendations".**

`/^(#{2,4})\s+.*(recommend|what to change|what to do|proposed fixes)/i` matches any heading containing "recommend" anywhere, including `## 2b. DEAD TRAPS — recommended for removal` in the existing `AUDIT-v207.md` (confirmed by independently re-implementing `closureViolations`/`SECTION`/`NUMBERED`/`CLOSED` from the file's own source and running it against the real newest-audit files — currently zero violations, because that section's body happens to be prose rather than a numbered list). The gate is one future audit-heading choice away from silently policing an unrelated section: if a later "dead traps recommended for removal" (or "not recommended", "recommended reading", etc.) section is written as a numbered list, every item in it would be forced to carry a `#nn`/`declined:`/`done:` marker it was never meant to need, or the newest-audit gate goes red for unrelated content.
- **What breaks:** a future batch could find the closure test failing (or forced to add spurious "decision" markers) on a section that isn't a recommendations-needing-decision section at all.
- **How to verify:** the `SECTION` regex against `"## 2b. DEAD TRAPS — recommended for removal"` returns a match (case-insensitive substring `recommend` inside `recommended`); reproduced independently outside the test harness.
- **Confidence:** high on the mechanism (regex substring match), medium on real-world impact since it hasn't fired yet and depends on how future audits are worded.

**3. Nit — `bump-version.js`'s "no path that half-applies" claim is stated more strongly than the code guarantees.**

`readSpots()` is called before any write, so a missing/duplicated spot can't cause a partial bump — that part is solid and tested (`tests/cache-version.test.js`'s "writes NOTHING when a spot has gone missing"). But the final write loop (`tools/bump-version.js:63-67`) does three separate `fs.writeFileSync` calls across `sw.js`, `index.html`, `js/app.js` with no rollback; a mid-loop I/O failure (disk full, permissions, ENOSPC) on the second or third file would leave the six spots disagreeing after all — the header comment's "there is no path that half-applies one" doesn't cover this. Not tested, and given the failure mode (a full disk) is rare and would be immediately visible (the CLI throws and prints "REFUSED"... actually it wouldn't print REFUSED cleanly here since the throw happens mid-write, inside the try, and would still hit the catch block and report "REFUSED: <fs error>" — but the two already-written files stay bumped while the third doesn't), this is low severity but the comment overstates the guarantee.
- **Confidence:** medium — mechanism reasoned from reading the code, not reproduced (would require simulating a disk-full condition).

No other findings. The new `tests/ci-workflow.test.js` extraction-and-run harness for the flaky-detector exit code was checked for mis-slice risk (indentation-boundary walk, canary assertion on `GITHUB_OUTPUT` presence) and for false negatives on all three code paths (flaky, clean, malformed/missing report) by tracing the actual extracted shell against the real `test.yml` body — it correctly executes the real script and would fail if the exit-1 behavior were removed or inverted. `tools/bump-version.js`'s refusal path (read-everything-before-writing-anything) and its regression tests were verified to actually exercise the real `readSpots`/`bump` functions rather than a parallel mirror.

---

## Disposition

**1 — FIXED, and its repro was run first.** `grep -n "^## \(next\|blocked\|doing\)  9[0-9]"` returned 92, **93 twice**, 94: confirmed. Batch 261 raised 93 and `docs/QUEUE-GROUPS.md:117` routes it into G2.
The new items are renumbered **94** (re-grep the backlog) and **95** (merge on a green hook), the two closure lines in `WORKFLOW-AUDIT-2026-09-09.md` now read `#94` and `#95`, and both are routed into **G7** in `docs/QUEUE-GROUPS.md` — which the finding correctly noted was the second half of the defect, and which nothing would have caught: `tests/queue-routing.test.js` only checks items already promoted into `docs/QUEUE.md`.
⚠️ **The finding's own numbering advice was one out** — it proposed 95 for the first item on the basis that 94 was taken by the second, which is true only if the second keeps 94. Both moved, so 94 and 95. The defect, the mechanism and the repro were all right; the remedy was checked rather than applied.

**2 — FIXED.** `SECTION` is now `/recommendations?\b|recommended for|what to change|what to do|proposed fixes/i`. "Recommended reading" and "Not recommended" no longer open a section; "2b. DEAD TRAPS — recommended for removal" still does, because a trap recommended for removal *is* a recommendation someone owes a decision about. Pinned by a new test asserting both directions — the two headings that must be ignored and the two that must still be policed — so the tightening cannot be loosened back silently.

**3 — FIXED, as a comment.** The header now states the guarantee it actually has ("no write until every spot is found") and names the residual: three `writeFileSync` calls with no rollback, so an I/O failure part-way leaves the files disagreeing. That case is loud, not silent — the CLI reports the fs error and `tests/cache-version.test.js` reddens on the disagreement — and the script is idempotent, so re-running finishes the job. No transactional write was added: it would need a temp-file-and-rename dance across three files to defend against a full disk, which is more machinery than the failure warrants.

**Not fixed, and not a finding — stated here because a reader will look for it.** `enforce_admins` is still **false** on `main`. The API write was refused twice by the session's permission classifier, not by anything in this diff, and it was not worked around. The one-line command is in the PR body and the handover.
