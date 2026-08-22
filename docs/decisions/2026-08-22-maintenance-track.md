# Max's answer, 22 Aug 2026 — how `docs/MAINTENANCE.md` actually gets worked

**Question:** when does maintenance get addressed?

**Answer: C items RIDE the batch that already touches the file.** The separate parallel track is retired.

This reverses his own decision of 13 Aug 2026, which created the track with a second worktree at
`/Users/max/Documents/Scoopys-Costing-maintenance`, a collision rule, and a five-batch tally to
judge whether it was working.

## The evidence he was given

Batches 181 to 197 have run since. The git log contains **exactly one** maintenance commit
(`735082d`), and it is a recording rather than a fix. Two handovers record the track explicitly not
running (182, 194), and 194 found a structural reason it can never run during an audit batch.
**Seventeen batches, zero items.** The tally had its answer.

Measured by the blind process audit of 22 Aug 2026 (`docs/audits/BLIND-AUDIT-2026-08-22-process.md`
§4.2), which also observed that the maintenance item proposing to retire the track was itself filed
on the track — evidence as much as argument.

## What replaces it

What already happened in practice: a batch that opens a file takes the C items in
`docs/MAINTENANCE.md` touching that file, in the same PR. No second worktree, no collision rule to
get wrong, no separate track to forget. **The collision problem the worktree existed to solve
disappears rather than being managed**, because there is only ever one branch.

## The costs, accepted with eyes open

- **A C item in a file nothing is touching will wait, possibly a long time.** That was already true
  under the old scheme — the difference is that a worktree and a written procedure implied
  otherwise, which is worse than an honest queue.
- **If the queue's A and B items are ever cleared, a maintenance sweep runs as its own ordinary
  batch.** That is the escape hatch and it needs no special machinery.

## The one C item pulled forward regardless

The four comments that disagree with the code, because one of them already propagated into
`CLAUDE.md:138` and was trusted there until a blind auditor that had never seen the file caught it.
A wrong comment that reaches the rulebook stops being a comment problem.

## Where this is written

`docs/MAINTENANCE.md` header · `docs/QUEUE.md` tier test · `.claude/skills/batch/SKILL.md` ·
`CLAUDE.md`'s "Where things live" table. Four places carried the old claim; all four now carry the
new one, because a process decision recorded in one place and contradicted in three is how the
parallel track survived unexamined for seventeen batches.
