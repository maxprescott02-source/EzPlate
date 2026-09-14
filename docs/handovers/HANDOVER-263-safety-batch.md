# HANDOVER - 263 (the safety batch)

**Branch:** `safety-batch-263`, merged as #291.
**Scope:** item C1 of `fix-plan.md` in Max's brain-ops folder, which is the first five gaps of a 12 Sep 2026 standards audit of this repo. Not a `docs/QUEUE.md` item.
**Deploy version:** none. No client asset changed, so `sw.js` still carries `ezplate-v215`.

## What changed

An ordinary session can no longer reach the production database.
`.mcp.json` carries staging alone; production moved to `.mcp.production.json`, which is loaded only by `claude --mcp-config .mcp.production.json`, and the standing `mcp__supabase__execute_sql` grant is gone.
That grant named production and nothing else, so the café's live data was pre-approved while the disposable staging rehearsal prompted every time.
`docs/STAGING.md` step 6 now says what to write in a migration header when production is out of reach, and gives Max the one line that lets the next session apply it.

Editing a doc no longer runs the test suite.
The PostToolUse hook ran `node --test tests/*.test.js` after every Edit and Write, with no path filter, no timeout and the default concurrency rather than the `--test-concurrency=2` that `npm test` pins.
It is now `tools/post-edit-tests.js`, which decides from the edited path and is bounded at 90 seconds under the hook's own 120.

A fresh clone installs the pre-push gate.
`npm install` now runs `prepare`, which sets `core.hooksPath`, so a clone that has never run the gate stops looking identical to one that passed it.

The Supabase agent skills are in the repo.
`.agents/` and `skills-lock.json` were gitignored, so the RLS and Postgres material the migration work reads existed on one laptop and in no clone. Both are tracked and both are in `.vercelignore`.

Four rotting figures are out of the skills.
`skills/verify` said the suite runs in about a second: measured, 2241 tests and about 46 seconds. It also carried `~12s` for the mutation gate, `~8s` and "check 2 of 3" for a hook that runs five. `skills/handover` said handovers run 300 to 430 lines; the last dozen run 59 to 123.
Each is replaced by the command that measures it, not by a fresh number.

`tests/harness-config.test.js` is the detector for all of the above, and is the actual point of the batch.
The audit's finding was not any single gap: eleven of its twelve had no detector, so nothing could notice a regression. Every assertion in the new file was proved red against a broken subject and green after, with each mutation diffed against a backup before the run.

## Review

The pre-push `code-review` agent, on Sonnet against a batch running as Opus 5, without the brief.
Full report at `docs/reviews/REVIEW-263-safety-batch.md`.

**Two findings, both fixed in the branch.**

It found the path filter written from "which files are the app" rather than from "what does the suite read", so it returned false for `.mcp.json`, `.claude/settings.json`, `.gitignore`, `.vercelignore`, the CI workflow and the migrations - every one of which the suite asserts on by name, and every one of which is what this batch is about. It verified that by running the real exported function rather than reading it. The list is now derived from what the test files open, `docs/` stays excluded with the two files `tests/queue-routing.test.js` actually reads named explicitly, and the eleven paths it listed are assertions that go red if the narrow filter comes back.

It also found that the audit motivating the batch was cited in six files and recorded in none, so no reader inside this repo could check what the other seven gaps were or whether anyone still owed them. `docs/MAINTENANCE.md` now carries all twelve with an owner and a status.

Of three nits, one was taken (the timeout margin), one was declined with a reason (`shell:true` for a platform nobody runs), and the third was the reviewer independently verifying the two mechanisms this batch had the least evidence for - that `ETIMEDOUT` actually fires on a `spawnSync` timeout, and that `prepare` is safe without git.

## Into CLAUDE.md

One line, in Tier 3's Migrations section: an ordinary session cannot reach production, what that means for "write it, apply it, verify it, record it", and that a header must never read as applied because it could have been.
No new rule. The batch found no new durable trap, and the two the review raised are both already in the file - a check that finds nothing has only proved something about what it looked for, and an exemption is scoped to the claim that justified it.

## New docs/QUEUE.md items

None. Everything outstanding here is process, and `skills/batch` step 10 forbids queueing process items - the seven open audit gaps are in `docs/MAINTENANCE.md` with owners.

## New docs/PHONE.md items

None. Nothing here is reachable from a phone.

## Probe

**What did the item tell you to do that you would have done differently?**
The item said "move production out of the default MCP config" and did not say where to. Moving it to user scope would have kept it connected in every session, which defeats the point, so it went to a second file in the repo that nothing loads on its own. That is a choice the item did not make and somebody should disagree with it if they think a `/batch` needs to reach production unattended - it now cannot, and `CLAUDE.md`'s own reversal ("i dont want you to stop for me to hand run a query") is the standing argument on the other side. **This is the one thing in the batch worth Max's attention.** It does not undo that reversal for staging, where the rehearsal and the verification happen; it costs the last step.

The item also said to delete three `*.test 2.js` files. There were none - they had already gone. The detector is what the item was actually worth.

**What did you not propose because it was out of scope?**
The `code-review` agent's own definition still lives at `~/.claude/agents/code-review.md`, so a fresh clone gets the material but not the reviewer. That is the other half of gap E4 and belongs to the batch that lands `AGENTS.md`.
`enforce_admins` is still false, so an admin merge bypasses every check that just passed here.
And the `~12s` class is not closed by deleting four numbers: nothing stops the next one, which is what a freshness test would be for.

## Surprises

The suite is fifty times slower than the file describing it claimed, and that stale sentence was load-bearing rather than cosmetic - a hook was firing the whole suite after every edit on the strength of it costing a second. A figure nobody re-measured was paying for itself in wall-clock every batch since.

`tests/queue-routing.test.js` reads the real `docs/QUEUE.md` and `docs/QUEUE-GROUPS.md`, so "a docs edit cannot break the suite" is false for exactly two files. The filter names them rather than pretending the rule is clean.
