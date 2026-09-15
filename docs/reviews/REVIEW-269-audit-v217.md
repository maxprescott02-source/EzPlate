# REVIEW - 269, filing AUDIT-v217 and correcting what it found

Reviewed-commit: 0c6766325e1249ea12d93bc751f32354e5259731

**Agent:** `code-review`, run on **Sonnet**.
The definition pins `opus`; this batch ran on Opus, so the reviewer was overridden to Sonnet for this run per `CLAUDE.md` ("a model reviewing its own work is not a second reader").
It was given the branch diff and **not** the audit report, the plan or the queue item. It was asked to spend its effort on the parts that change what runs and to re-verify the factual claims itself, because this batch exists because four documents stated a fact that was false.

**Two findings. Both real. Both fixed in this branch.**
**The first is the one worth reading: the gate this batch was relying on could not go red for the file it was filing.**

---

## The agent's report, verbatim

### Findings

**1. [Major] The new `docs/audits/AUDIT-v217.md` is not actually policed by `tests/audit-closure.test.js`, despite the diff and CLAUDE.md treating that test as the closure gate for it.**

`tests/audit-closure.test.js`'s `SECTION` regex only opens a "recommendations section" on a heading containing `recommendations?`, `recommended for`, `what to change`, `what to do`, or `proposed fixes`. In `docs/audits/AUDIT-v217.md` the only heading that matches is `## 2b. DEAD TRAPS - recommended for removal` (line 61). The file's substantive findings — `## 2a. VERIFY` (7 numbered items, each carrying a `done:`/`declined:` marker), `## 2c. CONTRADICTIONS` (C1-C4), and `## 3. Test drift` (5 numbered items) — never open a section, so their numbered items are never examined at all. Even the one section the checker does recognize contains only `**Recommendation 1: narrow this check's standing instruction.**`, which the `NUMBERED` regex (`\d+[.)]\s` or `R\d+`) does not match either (it's the word "Recommendation" + digit + colon, not "1." or "R1").

I extracted the real `closureViolations()` unmodified and ran it against the real file: `[]` (no violations found — expected, since it's finding nothing to check). I then stripped **every** `done:`, `declined:`, and `#87` marker from the entire document and reran the same unmodified function: still `[]`. The gate cannot go red for this file no matter what its findings say. `tests/audit-closure.test.js` itself is unchanged in this diff, so this isn't a regression in the checker — it's the new audit file failing to trip the mechanism the batch relies on, silently. Confidence: high — verified by running the actual (unmodified) checker against the actual (unmodified, then mutated) file, not a reimplementation.

**2. [Minor-to-major] `tools/state.js`'s fixed `queueItems()` regex ships with zero test coverage of the branch it adds, and the diff deletes the only live example that would have exercised it.**

The new alternative (`\`?([A-Za-z][\w-]*)\`?\s{2,}`) exists to recognize an un-numbered heading like the `project-audit` one AUDIT-v217 says was miscounted — but that exact heading is deleted from `docs/QUEUE.md` in this same commit (its item is closed by filing the audit). I confirmed `queueItems()` is called from nowhere except `tools/state.js` itself, and `tests/state-file.test.js` has no fixture constructing an un-numbered heading — its only check reads the real `docs/QUEUE.md`, which after this diff has zero such headings. So the "fix" is currently exercised by nothing. I threw adversarial inputs at the regex by hand (backtick-wrapped, bare, single-space vs two-space) and it behaved correctly on all of them, so I can't say the regex is wrong today — only that nothing in the repo would notice if a future edit broke it.

Related gap found while constructing those adversarial cases: a hypothetical un-numbered heading whose text starts with a digit that isn't a clean `\d+[a-z]?·` id (e.g. `## next  24hrs to fix X  **[C]**`) matches **neither** alternative — alt1 requires the digits to be immediately followed by `·`, alt2 requires the first character to be a letter. Such a heading would silently under-count `open_ab_count` again, reproducing the exact class of bug this fix claims to close. No such heading exists today, so this is latent, not live.

### 3. Clean, verified directly, no defects found

- **`enforce_admins`**: live `gh api` call returns `"enforce_admins":{"enabled":true}` — matches the diff's correction in all four files exactly.
- **`#menuHeadSub{display:block}`**: confirmed the only `display` declaration for that id is at `css/style.css:4043`, outside any `@media`; confirmed via a brace-depth walk (109 top-level-reachable `@media` blocks, including 6 real nested ones) that it sits outside all of them; confirmed ID (1,0,0) beats `.scr-sub`'s class (0,1,0) regardless of source order. **Reproduced the claimed failure mode** by moving the rule inside `@media (min-width:768px)` in a scratch copy — `inside` flips to `true`, so the new test would correctly go red.
- The brace walker strips comments before walking (verified 20 of 135 `@media` text occurrences live only in prose and are correctly excluded, avoiding the roster's 183(a) trap), and braces balance before/after stripping (1873/1873 raw, 1823/1823 stripped) — no string/`url()` corruption in this file today.
- All six cache-version spots read v218, no stray "217" left.
- Items 24, 45, 53, 54, 85, 43 confirmed absent from every `**Items:**` line on `main` and present after the diff.
- `tools/bump-version.js`/`tests/cache-version.test.js` do exactly what the corrected E6 row claims.

---

## Disposal

**1. FIXED, and it is the finding of the batch.** Reproduced exactly as described: the unmodified checker returns `[]` against the file both with every marker in place and with every marker deleted. **I had written the markers believing they were load-bearing, and the audit agent's own closing note told me the suite would go red without one — both were wrong**, which is precisely the class this batch was filed to correct, arriving inside the correction.
The recommendation is written as `**1. …**` now, which the `NUMBERED` pattern matches, and **the fix was verified in the failing direction**: stripping the marker reddens the gate with *"1 recommendation(s) with no decision recorded - 1 (line 71)"*.
⚠️ **The gate was NOT widened to cover `2a`, `2c` and `3`**, and that is a decision rather than an omission. Its own site records why a bare `recommend` was rejected — it would force decision markers onto unrelated numbered prose — and that reasoning still holds. What was wrong was this file's shape and my belief about the gate's reach. **The audit file now states what the gate actually polices**, so the next reader gets the measured answer instead of inheriting the assumption.

**2. FIXED, both halves.** The latent hole was reproduced against the reviewer's own example (`## next  24hrs to fix X`) and is real: the two-alternative pattern matched neither branch.
**Rewritten so the STATUS WORD is the whole test** — a heading is an item iff it carries `next`/`blocked`/`doing`, and extracting the id is a deliberately separate second step that cannot change that answer. There is no third shape to miss.
**And the coverage gap was the more useful half of the finding.** The branch was exercised by nothing, because the fix and the deletion of its only live example landed in the same commit — so `tests/state-file.test.js` gained a synthetic fixture covering all five shapes including both that the first fix got wrong, plus the negative direction (a heading with no status word must never count, or the design-law sections inflate the cap).

**Nothing was dismissed.** No finding was declined, deferred or routed onward.
