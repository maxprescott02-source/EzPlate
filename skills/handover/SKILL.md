---
name: handover
description: Write the end-of-batch handover for EzPlate. Use at the end of every batch, after the code merges - the batch is not finished until this exists. Covers the template, the write-once rule, and where findings go.
---

# Handover

Every batch ends with `docs/handovers/HANDOVER-<batch>-<short-name>.md` (e.g. `HANDOVER-123-dashboard.md`).
**The `v` was dropped on 8 Aug 2026** because it implied the number was the app version; it is not.
The batch number counts batches; the deploy version in `sw.js` moves only when a batch ships a client asset, so they drift apart.
**State the deploy version the batch shipped, or say it shipped none.** Older `HANDOVER-vNN.md` files keep their names - write-once.
It is a dated diary entry for ONE batch, and it is the audit trail - several rules in `CLAUDE.md` exist only because a handover recorded why something was done.

**Write-once.** A handover is evidence of what was believed at the time, so it is never edited after the fact.
If it turns out to be wrong, the correction goes in the NEXT handover, which is itself the record of finding the error.

`docs/handovers/README.md` documents the numbering gaps and the follow-up convention.
Read it before adding a file that is not the next integer.

**Keep it short.** Handovers accumulate faster than anyone reads them, so the handover carries only what nothing else does.
Root-cause narrative, judgement-call essays and verification logs are NOT in the template any more: the PR, the tests and git already carry them.
The recent ones run 300 to 430 lines (v113 299, v114 426, v115 306); the target now is one screen, around 40.
A batch that produced nothing but a green suite and a merged diff has a very short handover, and that is correct.

**Style:** follow `~/.claude/AGENTS.md` - no em dashes, one sentence per line.
Existing handovers below the current one predate that rule and are write-once, so they keep their own style.
Do not restyle them.

## The template

Every section appears, in this order, every time.

```markdown
# HANDOVER - <batch> (short name for the batch)

**Branch:** `...` · **Scope:** the queue item, brief or review finding this came from. One line.

## What changed
One line per item: what the user can now do, or what stopped being wrong.

## Into CLAUDE.md
Rules proposed, and whether Max said yes. "Nothing."

## New docs/QUEUE.md items
One actionable line each. "None."

## New docs/PHONE.md items
One line each, plus what a failure would look like. "None."

## Probe
**What did the brief or queue item tell you to do that you would have done differently?**
**What did you not propose because it was out of scope?**

## Surprises
Anything that did not match what the code or the brief led you to expect. "None."
```

## The Probe section is mandatory

It is the one section that has no other home: nothing in the PR, the tests or git records what you were told to do and thought was wrong, or what you saw and stayed silent about.

**Answer both questions explicitly, every time.**
"Nothing - the brief matched the code" and "nothing worth proposing" are perfectly good answers.
What is not acceptable is leaving the section out, because an omitted section reads identically to a forgotten one, and those are different things.
The point of the section is that it was ASKED.

## Where findings go, and where they do not

- A **durable lesson** - something worth learning twice - goes to `CLAUDE.md`, NOT into the handover.
  A lesson buried in one batch's diary is read once; a rule in `CLAUDE.md` is read every batch.
  Past examples that belonged there: "name-reachability is not enough on its own" (HANDOVER-v112), and the change-log marker-timing finding.
  **MAKE THE EDIT and report it here.** ⚠️ This line read *"propose it and wait for Max's yes - do not add it yourself"* until 13 Aug 2026 (corrected in 180), when `CLAUDE.md`'s "Changing this file" section was reversed on evidence: a parked documentation change is caught by nothing, while a wrong one is caught by `project-audit`.
  The only two things still needing Max are reversing a decision he made himself and anything that deletes or rewrites production data.
  Rules there exist because a mistake already happened once, and the file is short on purpose.
- A **real, unfixed problem** → a `docs/QUEUE.md` item with enough context to act on cold, plus a line in the handover.
  Never only the handover - a finding that lives only in a handover is a finding nobody will action.
- A **device question** → `docs/PHONE.md`, plus a line in the handover.
  The handover is the record, `docs/PHONE.md` is the working list.

## After writing it

- Copy it to `~/Downloads/` - Max reads handovers from there.
- A handover-only PR is free, and so is every other PR: since 8 Aug 2026 **no PR is reviewed automatically at all**.
  `paths-ignore` is gone - the workflow runs only on a manual run or the `deep-review` label.
  That is why moving something to the outstanding list costs nothing.
- **The corollary is the part to remember:** a batch touching `js/app.js` is no longer "still reviewed in full" either.
  Nothing reviews it unless the pre-push `code-review` agent did, or someone applies the label.
