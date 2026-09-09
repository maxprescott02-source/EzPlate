# WORKFLOW AUDIT - 2026-09-09 (throughput, not code)

**Scope:** why a `/batch` item costs 30 to 70 minutes, and what would let the 8 Sep backlog land in days rather than weeks.
**Method:** every gate timed on this machine, batch cadence read out of git, per-item read cost measured in bytes.
Read-only. Nothing in this file is queued; per this repo's rule, audits report and Max adds.

---

## The headline

**Tests are not the bottleneck. Every local gate together is 25 seconds.**

| Gate | Measured, 9 Sep | Where it runs |
|---|---|---|
| `npm test` | **10.3s**, 1967 tests | pre-push, CI `unit` |
| `npm run smoke` | **10.7s** | pre-push, CI `smoke` |
| `node tests/mutation/run.js --changed` | **1.6s**, 15 mutants | pre-push |
| `node -c js/app.js` | under 1s | CI `unit` |
| `npm run mutate` (full) | **did not finish in 180s** | CI `unit` only |
| Playwright, 479 tests in 56 files | **10m51s to 11m14s** (the workflow's own measured note) | CI `playwright` only |

⚠️ **`.claude/skills/verify/SKILL.md` says the suite "runs in about a second" and the full mutation gate is "~12s". Both are wrong by an order of magnitude**, and a skill that misstates a gate's cost is how a batch reaches for the wrong one.

## Where the hour actually goes

Batch cadence, commit to commit, on the two most active days:

- **9 Sep:** 10:32, 11:51, 12:24, 14:01, 15:09 - gaps of 79, 33, 97, 68 min
- **2 Sep:** 11:31, 12:10, 13:06, 13:42, 14:55 - gaps of 39, 56, 36, 73 min

**Median is about 62 minutes. Thirty is the best case, not the normal one.**

Four things spend it, and none of them is a test.

### 1. Waiting on CI to decide the merge (~11 to 15 min per item, pure dead time)

`skills/batch` step 9 merges when the suite is green, so the batch waits for the PR run.
The `playwright` job is ~11 minutes; the `unit` job runs the FULL mutation gate, which is why its own timeout was raised to 20 minutes on measurement.
The same workflow then runs again on the push to main, because the triggers are `pull_request` and `push: branches: [main]`.

The pre-push hook already runs four of the five things CI runs. **The only two it does not run are the full mutation gate and Playwright.**

### 2. The re-read tax (~68k tokens before any code is opened, per item)

Step 11 requires re-reading these from disk at the start of every item:

| File | Bytes | Approx tokens |
|---|---|---|
| `CLAUDE.md` | 138,635 | ~35,000 |
| `docs/PHONE.md` | 78,263 | ~20,000 |
| `docs/QUEUE.md` | 44,022 | ~11,000 |
| newest handover | ~2,000 | ~500 |

`CLAUDE.md` is 954 lines and **one single Tier 1 section is 20,856 bytes**, 15% of the file, read in full on every item regardless of what the item touches.
`js/app.js` is 1,012,920 bytes across 13,718 lines (~253k tokens), so it can never be read whole and every batch re-greps it from cold.

This is the same shape brain-ops solved with `conventions.md`: a trigger line in the always-read file, the detail behind it.

### 3. One item, one PR, one full set of fixed costs

Per item, regardless of size: a branch, a `code-review` agent pass on a second model, a `docs/reviews/` artifact, a handover, a six-spot version bump, and two full CI runs.
`docs/QUEUE-GROUPS.md` has already done the analysis that says items share context.
`/batch` still spends that context one item at a time.

### 4. Premise rot, paid at the most expensive moment

`docs/QUEUE-GROUPS.md`, its own words: **"Four of the last seven batches found their item materially wrong at the point of execution."**
That is a 57% rework rate, and it is paid inside a batch with full context loaded, at ~62 minutes a go.
Batch 234 shipped nothing but "R12 did not reproduce".
AUDIT-v197 found both halves of a G2 note false.

## The finding that changes the plan

**The version bump is what serialises the lanes, not `js/app.js`.**

`.claude/skills/cache-version` bumps six literals across three files on every batch that ships a client asset, and one of them is `js/app.js:8071` (`var APP_VERSION='v199'`).
So a pure-CSS batch writes `js/app.js`. A pure-copy batch writes `js/app.js`.

Churn confirms it. Last 30 commits:

```
20  js/app.js          20  index.html          20  sw.js
 8  css/style.css      22  docs/QUEUE.md
```

`docs/QUEUE-GROUPS.md` refuses a second track on the evidence of batches 181 to 197 (seventeen batches, zero landed), and quotes the cause as *"the whole app is one js/app.js, so this will happen"*.
**That evidence is about a maintenance track competing for the same functions. It is not about groups that share no file.**
The real file sets are disjoint:

| Lane | Files | Groups |
|---|---|---|
| A | `js/app.js` | G1, G2, G6 |
| B | `css/style.css`, `tests/visual/` | G5 |
| C | `index.html`, `tests/terminology.test.js` | G4 |
| D | `tests/`, `docs/` | G7 |

The only things making B, C and D collide with A are six version literals and `docs/QUEUE.md`.

## What to change, in the order that buys the most time

**1. Take the premise pass out of the batches and do it once, in parallel.**
71 open items in `docs/QUEUE-2026-09-08-CONSOLIDATED.md` (3 struck of 74).
Re-grep every item's named sites, confirm it still reproduces, mark the stale ones, all read-only, all fan-out, zero collisions.
`docs/QUEUE-GROUPS.md` already prescribes exactly this and nothing does it.
At a 57% miss rate this deletes or rewrites a large fraction of the list before a single branch is opened, and it is the one change that saves whole batches rather than minutes inside them.

**2. Stop letting CI decide the merge.**
Add Playwright to `.githooks/pre-push`, gated on the diff touching `css/`, `index.html`, `sw.js` or `tests/visual/`, and run it while the handover is being written rather than after.
Then merge on a green hook and let CI be the post-merge alarm.
**The cost this accepts is a red main for the ~11 minutes until CI reports, on a repo whose main auto-deploys. That is a call only Max makes.**
Measure the local Playwright wall time first: it was not measurable here (3-core VM), and if it is 6 minutes rather than 2 the saving is half of what it looks.

**3. One PR per group where the Design law allows it.**
`/batch`'s stop condition is *"the batch would exceed what one PR can be reviewed as"*, which is a review-size test, not a one-item rule.
G1's nine items call each other's functions; G4's five are one vocabulary pass over one file.
Grouping collapses the per-item fixed cost from nine payments to two or three.
**G5 stays split, and `docs/QUEUE-GROUPS.md` is right about why:** the Design law's *one screen per change set* is binding and G5 spans eight screens.

**4. Get the version bump out of the branch.**
Either derive the six literals from one source, or bump on main in a separate one-line commit after the merge.
This is what makes lanes B, C and D real rather than theoretical.
`sw.js` is network-first for HTML already, so the `?v=` query strings on `index.html` are belt-and-braces rather than the mechanism.

**5. Split Tier 1 of `CLAUDE.md` by area.**
SQL/RLS, CSS, costing, parser, with a trigger line each, the way `projects/brain-ops/conventions.md` is triggered.
Every item currently reads every trap.

**6. Then run three lanes.**
Only after 4. Not worktrees on one file: disjoint file sets, which is a different claim from the one batches 181 to 197 disproved.

## The pushback

**Shipping all 71 in a day is the wrong target, and the queue's own test says so.**
The test is *would this stop, embarrass or hurt a paying customer at launch*, and most of the backlog is B and C against a product with zero paying customers.
The 5 Sep commercial review's operative instruction was **no feature work before the first external demo**, and the demo is queued nowhere in either project.

The list that actually gates the practice offer is short: G1's remaining costing and history items, item 17 once the parser reversal is written, and the two multi-tenant defects (13, 14).
That is roughly eight batches. **Eight batches at a 30-minute cadence is one day. Seventy-one at sixty-two minutes is not, and no amount of process change makes it one.**

## Numbers in this file, and where they came from

Every duration was run on this machine on 9 Sep 2026 except the Playwright figure, which is `.github/workflows/test.yml`'s own measured note (10m51s to 11m14s across two runs before batch 232 raised the bound).
Byte counts are `wc -c`. Cadence is `git log` commit timestamps. Churn is `git log -30 --name-only`.
The full mutation gate was started and did not complete inside a 180s ceiling, so it is reported as a floor rather than a figure.
