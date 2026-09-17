# HANDOVER - 281 (dup-files)

**Branch:** `chore/dup-files-and-98` · **Scope:** three tracked files batch 279 shipped by accident, a guard for the class, and item 98's strike. **No client asset, so no deploy version.**

## What changed

**Three iCloud conflict duplicates are deleted.** Batch 279 committed `docs/audits/AUDIT-v227 2.md`, `docs/handovers/HANDOVER-279-audit-v227 2.md` and `docs/reviews/REVIEW-279-audit-v227 2.md` — byte-identical copies of files it had just written, merged to `main` in `9c521b0`.
This repo lives under `~/Documents`, an iCloud-synced location. When iCloud cannot reconcile two versions of a file it does not fail: it keeps both, naming the loser `<name> 2.<ext>`. **`git add -A` then commits it.**

⚠️ **NOTHING IN THE REPO COULD SEE THEM AND `npm test` WAS GREEN THROUGHOUT.** `tests/audit-closure.test.js` reads the newest audit by a regex the duplicate did not match, and `tools/state.js` derived `AUDIT-v227.md` correctly. **The only reader that would notice is a human running `ls`** — which is how they were found, two batches late, by a command run for an unrelated reason.

**`tests/housekeeping.test.js` now fails on any tracked file matching ` \d+\.<ext>`.** Proved red against a real duplicate and green without one, with a control asserting the pattern matches the observed name and not the original.
⚠️ **Its limit is stated at the site and in `docs/MAINTENANCE.md`: it catches the file at `npm test`, which is AFTER `git add -A` staged it.** It turns a silent merge into a red suite; it does not stop the file being created. The upstream fix is not running `git add -A` on a synced working tree, and that is a habit rather than something this repo can enforce.

**Item 98 is deleted from the working set** and struck in `docs/QUEUE-GROUPS.md` (280, `v228`). It shipped in 280 and the entry was left behind — the strike step 10 owes and I missed.

## Review

Sonnet, overriding the definition's `opus` pin because this batch ran on Opus. Report: `docs/reviews/REVIEW-281-dup-files.md`.

**NO FINDINGS**, said plainly rather than manufactured, which is the right answer for a diff this narrow.

**It verified the deletions by BLOB SHA and that is better than what I did.** `git ls-tree` gave identical hashes for all three pairs. I had checked byte SIZE (15172 for both), and same size is not same content — two files that look identical in an editor can differ by a trailing byte, and a deleted audit is evidence this repo does not keep twice.
It also injected a duplicate itself to prove the guard goes red, checked the test does not depend on cwd or on a `git` binary CI lacks, and confirmed 98's strike was complete everywhere it needed to be.

## Into CLAUDE.md

Nothing. The duplicate class is a test now, which is what `.claude/rules/tests.md` says to do with a failure nobody chooses to make — no batch decides to commit a conflicted copy; the filesystem makes it and the staging command sweeps it up.

## New docs/QUEUE.md items

None. One was DELETED (98, shipped in 280).

## New docs/PHONE.md items

None.

## Probe

**What the item told me to do that I would have done differently.** There was no item — this batch is cleanup found while closing 280, plus the strike 280 owed. Worth noting that it only exists because I ran `ls docs/audits/` for an unrelated reason; nothing routed me to it.

**What I did not propose because it was out of scope.** A pre-commit hook that refuses the staging rather than failing the suite. That is the honest fix and it is a change to `.githooks/`, which is the gates themselves — a different subsystem from a housekeeping assertion, and one that deserves its own consideration rather than riding a cleanup.

**Was any rule missing when I needed it.** No. `AGENTS.md`'s *"fix what is clearly wrong even if unrelated, when it is small and in the surface you are already in"* is exactly what this batch is, and it is why the guard rode the cleanup instead of becoming an item.

## Surprises

**A green suite and a clean `git status` said nothing about three junk files sitting in `main` for two batches.** Every mechanism this repo has for noticing staleness is keyed to CONTENT — a claim that disagrees with the code, an entry whose subject is gone, a count that drifted. None of them can see a file that is perfectly correct and simply should not exist.

**And the reviewer's instrument was better than mine on the one irreversible step in the diff.** I compared file sizes; it compared blob hashes. For "may I delete this", those are not the same question, and only one of them is proof.
