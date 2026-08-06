---
name: handover
description: Write the end-of-batch handover for EzPlate. Use at the end of every batch, after the code merges - the batch is not finished until this exists. Covers the template, the write-once rule, and where findings go.
---

# Handover

Every batch ends with `handovers/HANDOVER-vNN.md`.
It is a dated diary entry for ONE batch, and it is the audit trail - several rules in `CLAUDE.md` exist only because a handover recorded why something was done.

**Write-once.** A handover is evidence of what was believed at the time, so it is never edited after the fact.
If it turns out to be wrong, the correction goes in the NEXT handover, which is itself the record of finding the error.

`handovers/README.md` documents the numbering gaps and the follow-up convention.
Read it before adding a file that is not the next integer.

**Style:** follow `~/.claude/AGENTS.md` - no em dashes, one sentence per line.
Existing handovers below the current one predate that rule and are write-once, so they keep their own style.
Do not restyle them.

## The template

```markdown
# HANDOVER - vNN (short name for the batch)

**Branch:** `...` · **Scope:** where the work came from - a queue item, a brief, a review finding.
One or two lines.

## What changed
Per item.
What the user can now do, or what stopped being wrong.
Not a diff summary - the diff is in git.

## Root causes found
The actual mechanism, not the symptom.
If something was "sometimes broken", say what made it sometimes.
This is the section future batches read.

## Judgement calls
Every place two reasonable options existed and you picked one.
Say what you rejected and why.
A call with no alternative stated reads as the only option, which is how a decision becomes an assumption.

## Deliberately NOT built
Scope discipline is a hard rule, so what you declined is part of the record, each with a reason.
**Anything real here also becomes a `QUEUE.md` item** - a finding that lives only in a handover is a finding nobody will action.

## Verification
Suite, `node -c`, smoke, Playwright, real browser, database checks.
State what you ran, not that "tests pass".
Say which claims are measured and which are assumed.

## Needs Max's phone
Anything about feel - touch, spacing, animation, keyboard, iOS Safari.
Each with what a failure would look like.
**Also append these to `PHONE.md`**; the handover is the record, `PHONE.md` is the working list.
```

## Where findings go, and where they do not

- A **real, unfixed problem** → a `QUEUE.md` item with enough context to act on cold, plus a line in the handover.
  Never only the handover.
- A **device question** → `PHONE.md`, plus a line in the handover.
- A **new durable rule** discovered the hard way → propose it for `CLAUDE.md` and **wait for Max's yes**.
  Do not add it yourself.
  Rules there exist because a mistake already happened once, and the file is short on purpose.

## After writing it

- Copy it to `~/Downloads/` - Max reads handovers from there.
- A handover-only PR is free: `code-review.yml` has `paths-ignore: '**.md'`, so a docs-only change triggers no review run.
  That is why moving something to the outstanding list costs nothing.
- `paths-ignore` skips only when EVERY changed file matches, so a batch touching `js/app.js` and its handover in one PR is still reviewed in full.
