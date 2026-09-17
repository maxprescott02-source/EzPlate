# REVIEW - 281 (dup-files)

Reviewed-commit: b3db80b

**Agent:** the `code-review` agent, on **Sonnet**, overriding the definition's `opus` pin because this batch ran on Opus.

**Outcome: NO FINDINGS.** It said so plainly rather than manufacturing one, which is the right answer for a diff this narrow — and it verified the one irreversible thing in it (three file deletions) by **blob SHA**, which is proof rather than inspection.

---

## The report, verbatim

## Findings

I found nothing wrong with this diff. Specifically, I verified:

1. **The three deletions are genuinely redundant, not just similar.** `git ls-tree` shows identical blob SHAs (and identical file modes) for each duplicate against the file it shadows: `AUDIT-v227 2.md` / `AUDIT-v227.md` both hash `faf32f0`, the two `HANDOVER-279-audit-v227*.md` both hash `fefcc26`, the two `REVIEW-279-audit-v227*.md` both hash `33bb678`. `git log` confirms all three duplicates were introduced in the same commit (`9c521b0`, batch 279) as their originals, matching the claim in the new test/doc comment. No irreversible loss.

2. **The new test can actually fail and its regex is scoped correctly.** Ran the suite as-is (green, 15/15 in `housekeeping.test.js`, 2419/2419 overall). Injected a real duplicate (`docs/MAINTENANCE 2.md`, staged with `git add`) and the test went red with the expected assertion message; removed it and it's back to green. Ran the exact regex (` \d+\.[A-Za-z0-9]+$`) against the full `git ls-files` output and got zero matches, so no legitimate tracked filename currently trips it. The control assertions inside the test (`.test('docs/audits/AUDIT-v227 2.md')` true, `.test('docs/audits/AUDIT-v227.md')` false) genuinely constrain the pattern rather than being decorative.

3. **No CI/cwd fragility.** `execFileSync('git', ['ls-files'], { cwd: root })` uses `path.join(__dirname, '..')` for `root`, so it's independent of process cwd. `.github/workflows/test.yml`'s `unit` job runs `actions/checkout@v4` with `fetch-depth: 0`, so `.git` and the `git` binary are present; other tests in this repo (`review-gate.test.js`, `ci-workflow.test.js`) already shell out to git/node the same way, so this isn't a new dependency class for the suite.

4. **Item 98's removal is real.** `git log main` shows commit `1bc5bd4` ("280: the Edit-product form asks what the New form asks (#310)"), and `docs/handovers/HANDOVER-280-product-form-parity.md` documents it shipping as `ezplate-v228`. `docs/QUEUE-GROUPS.md` strikes it correctly (`~~98~~ (280, v228)`). The consolidated backlog (`docs/QUEUE-2026-09-08-CONSOLIDATED.md`) never gave item 98 its own heading — it only exists there as a sub-bullet under already-struck item 53 — so there was nothing further to strike there; that matches how sibling item 97 was handled when it shipped. No dangling references to item 98 remain anywhere in `docs/`.

5. **`docs/STATE.json` re-derives correctly.** `node tools/state.js` and `node tools/state.js --check` both reproduce the committed file exactly (`open_ab_count: 14`, matching a fresh `grep -cE "^## (doing|next|blocked)" docs/QUEUE.md`), and `git status` is clean after running it — no drift.

6. **`batch` staying at 280** (no `HANDOVER-281` yet) is consistent with `tools/state.js`'s derivation (batch = highest `HANDOVER-<n>` file) and isn't a bug — it just means this diff is being reviewed before the batch's own handover is written, which is the normal point in the process to run this review.

Nothing here would benefit from a manufactured finding. This is a clean, narrowly-scoped diff.

---

## Decisions

### No findings — no action, and two things in the report are worth keeping.

**The deletions were checked by BLOB SHA, not by reading.** `git ls-tree` gave identical hashes for all three pairs. That is the right instrument for "is this file redundant": two files that look identical in an editor can differ by a trailing byte, and a deleted audit or review is an audit trail this repo treats as evidence. I had checked byte SIZE (15172 for both) and that is weaker — same size is not same content.

**`tools/state.js --check` exists**, and settling that is worth a line because two reports disagreed about it. The `project-audit` agent's returned report said the tool *"has no dry-run flag and writes unconditionally, ignoring unknown arguments"*; this reviewer used `--check` and reported it reproduced the file exactly.
**Checked here: the reviewer is right.** `--check` is documented in the tool's own usage block (`tools/state.js:40` — *"derive and print; exit 1 if the file on disk disagrees"*) and handled at `:286`. Measured: exits 0, prints the derived JSON, leaves the file untouched.
⚠️ **And there is nothing in the repo to correct, which is the point worth recording.** That claim was in the AGENT'S report and I did not carry it into `docs/audits/AUDIT-v227.md` when I filed it — grep finds no "dry-run" there. So the stale fact never entered the record. **An audit's report is not the audit**; what gets filed is, and the filing step is where a wrong operational note gets dropped rather than propagated. It was dropped by accident here rather than by judgement, which is worth less than it sounds.

### Finding 6 is a process observation and it is acted on.

The reviewer notes the handover does not exist yet and that this is the normal point to review. It is — and batch 279's review made "no handover exists" an actual finding, so writing it as part of closing the batch rather than after is the lesson from two batches ago. `docs/handovers/HANDOVER-281-dup-files.md` is written, and `node tools/state.js` re-run so `batch` reaches 281.
