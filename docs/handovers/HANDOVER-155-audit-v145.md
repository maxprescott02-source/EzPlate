# HANDOVER - 155 (project audit at v145)

**Branch:** `audit-v145` · **Scope:** the queue's `project-audit` item, which tripped at a gap of 10 (newest report `AUDIT-v135.md`, `sw.js` at `ezplate-v145`).

**Deploy version: none.** Docs only, no client asset touched, `sw.js` stays at `ezplate-v145`.

## What changed
`docs/audits/AUDIT-v145.md` exists, so the audit counter is reset and the next one is due at v155.
Five findings became queue items instead of staying in a report nobody re-reads.
Two stale counts in the queue were corrected in place, and three passages that assert something the code disproves are now marked as wrong at the point of reading.

## Into CLAUDE.md
Nothing.
The audit found no new durable rule to propose, and it found no error in `CLAUDE.md`'s own text: all six corrections approved on 10 Aug landed exactly as approved, which is the first 100% pass-through in three audits.

## New docs/QUEUE.md items
- **The `.legacy` wrapper is described as operative and has never existed** (C1). Two passages describe it in the present tense and the Dead CSS sweep item is banking on it; the class has zero occurrences in the shipped code.
- **The tint-vs-hover item still points at F5, which disproved its premise** (C2). Re-pointed four times, wrong the last two.
- **`tests/kpi-strip.test.js` hand-stubs `fmtTargetPct` instead of extracting it** (D1). The exact function the new Tier 1 stub rule cites as its origin incident.
- **"Abbreviation matching in search" has been recorded as shipped for three audits and is not built** (D2).
- Not a new item, but recorded on the existing one: **Mutation testing (Stryker) did NOT earn the earlier slot** the audit item offered it, because the fourth cannot-fail test was searched for deliberately and not found.
- **The Playwright job has no retries, so one slow context launch fails the whole PR.** Added after the CI run, below.

**Added after the sections above were written, on the same batch, after CI ran.** Marked rather than folded in silently: everything above was written before the PR's checks came back, and the write-once rule protects the record from being tidied, not from being finished.
Max caught that PR #137 had a failed check and asked why it was not flagged. **It was not flagged because I verified the suite locally (848 unit, 221 Playwright, both green) and never looked at CI after pushing** - I read step 9's "the suite is green" as my own run. That is the process miss, and it is mine rather than the harness's.
The failure itself was a flake: `tests/visual/v141-sync-corner.spec.js:174` died with `Test timeout of 30000ms exceeded while setting up "context"` before any assertion ran, 208 passed, and a re-run on the identical commit went 209/209 green. The diff is three `.md` files and zero lines of code, so it could not have caused a browser failure. Root cause is `playwright.config.js` setting no `retries` and no `workers`; it is queued.

## New docs/PHONE.md items
None.
Nothing in this batch is reachable from a device; the audit is read-only and shipped no client asset.

## Probe
**What did the queue item tell you to do that you would have done differently?**
Nothing about the procedure, which was right - filing the report myself is the step that keeps the counter honest, and the item says so.
One thing in it turned out to be a trap worth naming: it told the next batch that if the audit found a fourth cannot-fail test, the Stryker item "has earned an earlier slot". That framing only records the promoting outcome. The audit looked and found none, so the interesting result was the negative one, and nothing in the item asked for that to be written down anywhere. I wrote it onto the Stryker item explicitly, because otherwise the next reader sees AUDIT-v135's R2 arguing for promotion and no record that the evidence moved.

**What did you not propose because it was out of scope?**
Two things. The `.github/workflows/test.yml:174` count comment is now wrong by 13 and has been flagged by two consecutive audits; fixing it is one line, but it is a workflow-file change that takes the mandatory review, and it is already its own queue item, so I corrected the item's numbers and left the file alone. And the `kpi-strip.test.js` stub is a three-word fix I could have made here, but it changes what runs and would have converted a pure-prose batch into one needing the review agent - it is queued instead.
I also did not correct the abbreviation-search record in full, only annotated the two places that cite it, because the rename is the queued item's job and doing it here would have been the item.

## Surprises
**The audit agent's headline finding had the wrong mechanism, and it mattered.** It reported the `fmtTargetPct` stub as divergent for values the Settings input allows. It is not: `js/app.js:5160` is the only Settings path and routes through `setCogs`, which does `Math.round` at `:1107`, so every value the app persists is an integer. The one path assigning a fractional `cogsPct` is the boot read at `:514`, which takes `parseFloat` output with no rounding, so the divergence is reachable only from a restore or an older stored file. The finding survives - the stub is still a hand-rolled mirror where two sibling tests extract the real function - but it is latent rather than live, and I filed the corrected mechanism in the report and the queue item so the fix is not judged on the wrong reading. This is `CLAUDE.md`'s "never dismiss a finding because its stated cause is wrong" running in the direction it is usually not: the cause was wrong and the finding was still real.

**Three separate instances of the same failure, and they are the real result of this audit.** A correction gets written down and then does not propagate: the tint item was re-pointed at a batch that disproved it (C2), the abbreviation-search mislabelling was flagged in `HANDOVER-v120` and then repeated by v121, v122 and AUDIT-v135 (D2), and AUDIT-v135's own C2 had already named this exact shape. The individual items are all small. The pattern has now been named three times and recurred anyway, which is a stronger signal than any single finding in the report.

**The `.legacy` gap was flagged inside this window and the batch that was asked to decide it shipped without doing so.** `HANDOVER-151-menu.md` said the protocol's stated safety net does not exist and asked for a decision "before F6 rather than after F10". F6 shipped and does not mention it. Nothing is broken - the manual per-screen deletion has worked for six screens - but one queue item is relying on a mechanism that was never built.

**The good surprise:** the protected parser region is byte-identical to the md5 first recorded at v125, now across ten more deploy versions and five whole screen rebuilds. Fourth consecutive audit with no dead Tier 1 trap to remove.
