# HANDOVER - 265 (branch protection, one bump script, a closure gate)

**Branch:** `265-protection-bump-closure` (PR #294) · **Scope:** fix-plan item C3 / EZ-P3, gaps E5, E6 and E8 of the 12 Sep 2026 standards audit.
**Deploy version: none.** No client asset changed, so `sw.js` stays at `ezplate-v215`.

## What changed

- **A Playwright run that is merely flaky now fails the job.** The detector wrote a warning and exited 0, so the check went green; a warning on a green check is indistinguishable from a pass, and what it let through is an intermittent real regression. It writes its output first, then `exit 1`.
- **`tools/bump-version.js NN` moves all six deploy-version literals, or refuses.** Nothing is written until every spot is located, and a spot that matches zero or two times is a hard stop naming the count.
- **`tests/cache-version.test.js` reddens if any of the six disagrees with `sw.js`'s `CACHE`.** Spots 2 to 5 - the `?v=` strings in `sw.js`'s ASSETS and in `index.html` - were covered by no test at all, and `skills/cache-version` said so in as many words.
- **`tests/audit-closure.test.js` refuses the newest audit of each kind unless every numbered recommendation records a decision.** `WORKFLOW-AUDIT-2026-09-09`'s six are closed: two queued, two done, two declined in writing.
- **`docs/QUEUE.md` now allows one process item to hold a slot**, under a three-part test. `skills/batch` step 10 follows it.

## ⚠️ `enforce_admins` is still FALSE, and it is half of part A

The API write was **refused twice by the session's permission classifier**, not by anything in the diff, and it was not worked around. One line, Max's to run:

```
gh api -X POST repos/maxprescott02-source/EzPlate/branches/main/protection/enforce_admins
```

Rollback is `-X DELETE` on the same path. The required contexts are unchanged and Playwright is deliberately **not** added as one - item 80's SEGV arm lands first.
**Until he runs it, an admin merge still bypasses every check**, which is the state `HANDOVER-238-auth-callback-redirect.md:65` records happening once already.

## Review

`code-review` on **Sonnet**. The batch ran on Opus 5, so the agent definition's `opus` pin was overridden for this run, per `CLAUDE.md`'s rule that the reviewer must not be the writer's model.
Artifact: `docs/reviews/REVIEW-265-protection-bump-closure.md`.

**Three findings, all three fixed.**
1. **Critical, and real.** Item **93 was already taken** by batch 261 and routed into G2, so the two new backlog items collided with it. Repro run first (`grep -n "^## next  93"` returned two lines), then renumbered to **94** and **95**, with the audit's closure lines following them. Its second half was the one nothing could catch: an unrouted backlog item is invisible to the refill, because `tests/queue-routing.test.js` only checks items already promoted into `docs/QUEUE.md`. Both are now routed into G7.
  ⚠️ **The finding's own numbering advice was one out** - it proposed 95 for the first item on the assumption the second kept 94. Both moved. The defect, mechanism and repro were right; the remedy was checked rather than applied, which is the rule.
2. The closure gate's section regex matched a bare `recommend`, so "Recommended reading" would have opened a section. Tightened, with a test pinning both directions.
3. `bump-version.js`'s header claimed a guarantee the code does not have (three writes, no rollback). It now states the one it does and names the residual.

## Into CLAUDE.md

Nothing. Two process files moved under standing authority and are recorded above: `docs/QUEUE.md`'s header (one process item may hold a slot) and `skills/batch` step 10, which restated the old rule and would otherwise now contradict it.

## New docs/QUEUE.md items

None promoted. Two raised in `docs/QUEUE-2026-09-08-CONSOLIDATED.md`, both routed into G7:
- **94** · re-grep every open backlog item's named sites, once, before any is planned against. Read-only, tier C.
- **95** · merge on a green pre-push hook instead of waiting for CI. **Blocked on Max:** is he willing to have `main` red for ~11 minutes after a merge, on a repo that auto-deploys?

## New docs/PHONE.md items

None. Nothing here reaches a phone.

## Probe

**What the item told me to do that I would have done differently.** EZ-P3 part C said to put the closure assertion in `tests/ci-workflow.test.js`. That file's own header scopes it to the couplings inside `.github/workflows/test.yml`, and an assertion about `docs/audits/` is not one, so it went in `tests/audit-closure.test.js` instead. The prompt also said "the newest file in `docs/audits/`", which is not well defined across two naming families; the gate checks the newest of each.
**Not proposed because it was out of scope.** The 12 Sep standards audit's E-list is not in `docs/audits/`, so the new gate cannot see it. Copying it in would create a second source of truth against the fix-plan that already tracks it, so it was declined rather than deferred.
**Was a rule missing?** No. `.claude/rules/tests.md` loaded with the first read under `tests/` and is what made the extraction-and-run harnesses the default rather than a grep for `exit 1`.

## Surprises

**`skills/cache-version` was documenting its own hole and nobody read it as one.** "Neither test checks spots 2-5. Those are on you." had been sitting in the skill that batches invoke every time they bump a version. A known gap written in the place it would be read is still a gap; it is the shape `CLAUDE.md` calls a declaration that is not an enforcement.
