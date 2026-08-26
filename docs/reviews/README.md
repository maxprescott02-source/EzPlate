# reviews/ — the pre-push review's audit trail

One file per batch that changed **what runs**: `REVIEW-<batch>-<short-name>.md`.
It is the report of the mandatory pre-push `code-review` agent, pasted verbatim, with a
`Reviewed-commit: <sha>` line naming the commit it read.

## Why this directory exists (QUEUE item 0d, batch 207)

That agent is, on the record, the most productive gate in this process — and it was **the only gate
with no trace of any kind**: not on the PR, not in CI, not in git, and not in the handover template.

**Six batches that shipped a client asset to production have no record of one** — 151, 153, 170, 176,
179 and 183, the last of which also shipped a production migration. Only 176 is knowable, because its
brief said to skip it. **The other five are silence, and silence is indistinguishable from
compliance.** The 13 Aug 2026 rule that a review is *not skippable by instruction* fixed the one case
that was visible and could do nothing about the five that were not, because it is another convention
layered on the convention that failed.

## What enforces it, and what that enforcement is worth

`.githooks/pre-push` runs `tests/review/check.js`, which refuses a push whose diff touches `js/`,
`css/`, `index.html`, `sw.js`, `tests/`, `.github/`, `supabase/`, `.githooks/` or `api/` unless a file
here names a commit on the branch being pushed.

⚠️ **It is a gate against FORGETTING and nothing more.** It cannot tell whether a review actually
happened, whether the artifact describes this diff, or whether the findings were acted on. A file
with the right header satisfies it, and `git push --no-verify` skips it entirely. That is the honest
limit, and it is stated here so nobody reads a green push as a reviewed one. The half that records a
judgement is the handover's mandatory `## Review` section, which a human writes and a human reads.

⚠️ **`Reviewed-commit:` names an ANCESTOR, not necessarily HEAD.** Requiring the exact tip is
unsatisfiable in practice — the review's own findings get fixed, each fix is a commit, and HEAD moves
past the artifact every time. A gate nobody can satisfy gets disabled, which is this repo's
most-recorded gate failure. The cost is real and is stated where it is taken: a review at commit one
does not know about commit five.

## Write-once

Like `docs/handovers/`, these are dated evidence of what was believed at the time and are never
edited afterwards. A review that turns out to have missed something is corrected by the next batch's
work, not by rewriting the record.

## Files whose change does NOT require one

Pure prose: handovers, queue entries, briefs, decisions, `CLAUDE.md`. **The line is deliberately not
code-versus-docs** — it was nearly written that way on 8 Aug 2026, and the review of the batch that
wrote it, a diff of nothing but YAML and Markdown, found a CI change that would have silently run the
live-production-database spec in a job documented as hermetic. `.github/` is on the guarded list for
that reason.
