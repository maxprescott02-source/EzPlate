# HANDOVER - v117 (the first project audit, filed)

**Branch:** `chore/project-audit` · **Scope:** `docs/QUEUE.md` → "Run `project-audit` and FILE the report".

**No client asset changed, so no cache bump: `sw.js` stays `ezplate-v115`.**
Second no-bump batch in a row, so the diary now runs two ahead of the deploy number.
That is the distinction the audit's top finding was about, and it is deliberate here rather than accidental.

**Suite at close:** `npm test` **756 green** (unchanged) · `node -c` clean.
**Pre-push `code-review`: SKIPPED, on the documented exception.** The diff is `docs/QUEUE.md`, `docs/PHONE.md` and one new report - pure prose, nothing that changes what runs. No CI config, no tests, no app code.

## What changed

- `docs/audits/AUDIT-v115.md` exists, so the counter that schedules the next audit has something to count from for the first time.
- `docs/PHONE.md` no longer asks Max to judge a UI that was reverted on his own instruction.

**Verdict: healthy.** Every Tier 1 invariant reachable from the repo verified TRUE, and **no Tier 1 entry was dead enough to recommend for deletion** - which the audit notes is not the normal result for that check.

## Into CLAUDE.md

Two wording fixes **proposed, not made** - queued as "Two `CLAUDE.md` lines point a batch at the wrong file", blocked on Max.
Neither changes what the code does; both send a batch to the wrong file if followed literally.

## New docs/QUEUE.md items

- **The three foreign keys are Tier 1 law that the repo cannot check** (blocked on an MCP session). Tier 3 says the migrations are the audit trail, and none of the three FKs appears in any of them.
- **Threads that never reached any landing place** - five, checked against all 68 handovers as well as the queue. The eval harness for the invoice reader is the one that matters: zero hits anywhere, on the app's highest-stakes surface and its only AI path.
- **Menu / empty-state centring** - four fixes across v44/v49/v54/v70 with no shared cause on record. The audit's pick for the strongest remaining unfound root cause.
- **Two `CLAUDE.md` lines point a batch at the wrong file** (blocked on Max).
- The `.range-btn` entry and the `addProduct`/`fresh-states` coupling were corrected in place rather than added as new items.

## New docs/PHONE.md items

- **The chips.** The entry said "the dotless chips" and described a state that never shipped - v115 removed the dots in a first draft and Max put them back the same day. Both the dots and the active-chip tint ship together, so the question was rewritten to the one actually open: whether that is one signal too many.
- **The v115 splash / loading screen.** Added; it had none. Rebuilt live on the last shipping batch after being decided three ways in one day, it is the first thing a user sees, and it carried a bug only a browser caught. Failure looks like a flash on a warm open, showing twice, or the wrong state after a real week-long gap.

## Probe

**What did the queue item tell you to do that you would have done differently?**
It told me to file as `AUDIT-v116.md`, and I filed `v115`.
I wrote that item myself earlier in this same run, so this is my own error caught by the thing I commissioned: I conflated the handover diary number with the deploy number.
The counter compares against `sw.js`, which is v115 because v116 shipped no client asset - filing as v116 would have put it a version ahead of what it measures and bought a free version of silence before the next audit was due.

**What did you not propose because it was out of scope?**
Acting on any finding, which the item put out of scope on purpose - except the two that were cheaper to fix than to describe (`PHONE.md`, and the stale `.range-btn` correction).
I also did not run the FK verification, though I have MCP access and it is a read-only query, because the item said triage only. It is queued instead.

## Surprises

- **The audit's highest-consequence finding was about the instruction that commissioned it,** not about the code. That is a better outcome than it sounds: a report filed under the wrong number silently disables the control it exists to feed.
- **One finding did not survive checking, and it was the one ranked second.** The audit flagged an unexplained loss of 12 Playwright specs between v115 and v116 and honestly said the repo could not settle it without a browser. It can: `--list` gives 100 for `tests/visual` and 88 with `screenshots.spec.js` excluded, which is exactly what CI excludes. Both numbers were always right about different sets. **Worth noting that the agent flagged its own inability to check rather than guessing** - that is why the finding was cheap to close instead of expensive to believe.
- **The audit ran out of API capacity mid-run and had to be resumed.** It kept its work and finished. Recorded because a batch that treats that as a failed run would pay for the whole audit twice.
- `CLAUDE.md` came out of this well. The three-tier rewrite is recent and the audit found no dead traps at all, which suggests the "a stale fact is worse than no fact" pass did its job.
