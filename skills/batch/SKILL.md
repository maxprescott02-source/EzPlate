---
name: batch
description: Run a queued item end to end without stopping for approval - investigate, plan, build, test, review, merge, hand over, take the next item. Stops only on the conditions listed below.
---

# Batch

Take the next unblocked item from `QUEUE.md` and carry it all the way to merged, then take the next one.
**Do not stop for approval between steps.** Max's time is the scarce resource; yours is not.

Continue until the queue is empty or a stop condition fires.

**Why this doesn't contradict `CLAUDE.md`'s "plan first, get a yes".** The trigger is where the work came from.
**An item in `QUEUE.md` is already approved** - Max said yes when he queued it, so re-asking spends the one resource this skill exists to protect.
**Work arriving from chat, a brief or a screenshot is not approved**, and briefs about this repo have been wrong repeatedly; that is the case that plans first.
If you are running `/batch`, you are in the first case.

## The loop

1. **Take the top unblocked item.** Mark it in progress in `QUEUE.md`.
2. **Decide whether to investigate.** If the item rests on a claim about the code that its author could not see, run `/investigate` first - read-only, no branch.
   If the investigation contradicts the item, **the code wins**: rewrite the item in `QUEUE.md` to match reality and say what changed.
   Reproduce before you fix: a misdiagnosed dead-code path was once briefed as a live compounding bug because nobody drove it.
3. **Plan.** Write it down.
   Do not wait for it to be read.
4. **Build.**
5. **Test.** Use the `verify` skill - it has the harnesses, what each one misses, and the baseline rule.
   Pin conditions, not structure.
6. **Drive it in a real browser**, both themes, 380px and desktop, if the item touches anything a user can reach.
   Two real defects in v113 and three in v115 were invisible to a green suite and visible immediately here.
7. **Pre-push `code-review` agent.** Fix every finding or record why not.
   This has found the sharpest defect in each of the last three batches.
8. **Open the PR.** Wait for the workflow review.
   **Read it before merging** - a finding on `main` cannot be fixed in the PR that carried it, which once cost six extra PRs.
9. **Merge** if everything is green and no stop condition applies.
10. **Hand over.** Use the `handover` skill.
    Tick the queue, and add anything found-not-fixed as a new queue item - a finding that lives only in a handover is a finding nobody will action.
11. **Next item.**

**Bump the cache version** as part of step 4 whenever the batch ships a client asset - the `cache-version` skill has the six spots.
`CLAUDE.md` has no snapshot section to update; current state lives in git, `QUEUE.md` and `PHONE.md`.

## Stop conditions - the only times to come back to Max

Stop, say plainly which condition fired and what you need, then take the next unblocked item if there is one.
**Do not sit idle waiting.**

- **A migration is needed.** Never bundled, never applied by you.
  Write it, put it in the item, mark the item blocked.
- **A product decision only Max can make.** The test: does the answer depend on the café, the trade, or his history rather than on the code?
  "Do chefs reprice or reformulate" is his.
  "Which of two implementations is cleaner" is yours - decide it.
- **Data loss is possible** and not fully reversible from the current backup.
- **The item is wrong in a way you cannot repair.** Rewriting a mis-stated premise is yours.
  Discovering the item solves the wrong problem is his.
- **A review finding you cannot resolve** without one of the above.
- **The batch would exceed what one PR can be reviewed as.** Split it, do the first half, queue the rest.

**Not stop conditions:** the plan being long, the diff being large, a decision between two reasonable implementations, uncertainty about taste where the item states a requirement, or anything that has already been decided in `CLAUDE.md` or a prior handover.

## The queue

`QUEUE.md` at the repo root.
One item per heading, in priority order:

```
## [status] Title
Problem: what is wrong, in Max's words where possible.
Requirements: what must be true when this is done.
Out of scope: what this must not touch.
Blocked on: (only if blocked - migration pending, decision pending)
```

`status` is one of `next`, `blocked`, `doing`, `done`.
Move `done` items out weekly.

**Add to the queue as you go.** Anything found-not-fixed becomes an item with enough context to act on later.
Do not let findings live only in handovers.

## Phone checks accumulate

Do not stop for one.
Append to `PHONE.md` - the item, why only a device can settle it, and what a failure would look like.
Max works through it in one session.

If something can only be judged on a phone **and** shipping it wrong would be costly, that is a stop condition.
Otherwise it accumulates.
