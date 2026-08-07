---
name: batch
description: Run a queued item end to end without stopping for approval - investigate, plan, build, test, review, merge, hand over, take the next item. Stops only on the conditions listed below.
---

# Batch

Take the next unblocked item from `docs/QUEUE.md` and carry it all the way to merged, then take the next one.
**Do not stop for approval between steps.** Max's time is the scarce resource; yours is not.

Continue until the queue is empty or a stop condition fires.

**Why this doesn't contradict `CLAUDE.md`'s "plan first, get a yes".** The trigger is where the work came from.
**An item in `docs/QUEUE.md` is already approved** - Max said yes when he queued it, so re-asking spends the one resource this skill exists to protect.
**Work arriving from chat, a brief or a screenshot is not approved**, and briefs about this repo have been wrong repeatedly; that is the case that plans first.
If you are running `/batch`, you are in the first case.

## The loop

1. **Take the top unblocked item.** Mark it in progress in `docs/QUEUE.md`.
   **First, check whether a blocked item has been answered.** Read the recorded decisions in `CLAUDE.md` - the dated `(Max, …)` lines - against the `Blocked on:` of every `blocked` item.
   If the question has since been answered, unblock the item, note in the item which decision unblocked it, and it competes for the top slot like any other.
   **Never re-ask something already decided.** A decision that has to be made twice was not recorded properly - if the answer is in `CLAUDE.md` or a prior handover it is a lookup, not a decision.
2. **Decide whether to investigate.** If the item rests on a claim about the code that its author could not see, run `/investigate` first - read-only, no branch.
   If the investigation contradicts the item, **the code wins**: rewrite the item in `docs/QUEUE.md` to match reality and say what changed.
   Reproduce before you fix: a misdiagnosed dead-code path was once briefed as a live compounding bug because nobody drove it.
3. **Plan.** Write it down.
   Do not wait for it to be read.
4. **Build.**
5. **Test.** Use the `verify` skill - it has the harnesses, what each one misses, and the baseline rule.
   Pin conditions, not structure.
6. **Drive it in a real browser**, both themes, 380px and desktop, if the item touches anything a user can reach.
   Two real defects in v113 and three in v115 were invisible to a green suite and visible immediately here.
7. **Pre-push `code-review` agent - MANDATORY.** It is the review this batch gets; the workflow no longer runs on its own.
   **Run it on a DIFFERENT model from the one you are running as**, and **don't show it the brief** - both are what make it independent.
   Fix every finding or record why not.
8. **Open the PR.** There is **no automatic workflow review to wait for** - it is on demand now, by manual run or the `deep-review` label.
   If you do request one, **read it before merging**: a finding on `main` cannot be fixed in the PR that carried it, which once cost six extra PRs.
   And confirm the run exists - an absent check and a passing one look the same.
9. **Merge** if the suite is green, step 7 is done, and no stop condition applies.
10. **Hand over.** Use the `handover` skill.
    Tick the queue, and add anything found-not-fixed as a new queue item - a finding that lives only in a handover is a finding nobody will action.
    **Then check the audit counter.** The newest `docs/audits/AUDIT-vNN.md` is the version the last audit ran at; `sw.js` has the version you just shipped.
    At a gap of **10 or more** - or if `docs/audits/` is empty or missing - put `project-audit` into `docs/QUEUE.md` as the next item, above every unblocked one.
    Nothing to remember and no calendar: the version increments once per batch, so it already is the counter.
    **When you later run that item, YOU file the report** to `docs/audits/AUDIT-vNN.md` at the version it audited.
    The agent is read-only and hands the report back rather than saving it, so an unfiled report leaves the counter unchanged and the next audit never gets queued.
11. **Next item.**

**Bump the cache version** as part of step 4 whenever the batch ships a client asset - the `cache-version` skill has the six spots.
`CLAUDE.md` has no snapshot section to update; current state lives in git, `docs/QUEUE.md` and `docs/PHONE.md`.

## A decision only Max can make DEFERS the item - it does not stop the loop

The test is unchanged: **does the answer depend on the café, the trade, or his history rather than on the code?**
"Do chefs reprice or reformulate" is his.
"Which of two implementations is cleaner" is yours - decide it, and keep it out of the file.

When one of his comes up:

1. Mark the item `blocked` in `docs/QUEUE.md` with the question written into `Blocked on:`, in plain language.
2. **Take the next unblocked item.** Don't stop, and don't ask him now.

**The blocked items ARE the pending decisions list** - there is no second place to keep it, and nothing to remember between sessions.

Run the `decide` skill when either is true:

- **Three or more items are blocked on a decision** (migrations don't count - those are their own stop condition).
- **The queue has nothing unblocked left**, whatever the count. One pending decision holding up everything is worth a file of one.

Then tell Max the file is ready and give its path, and carry on if there is anything left to work on.

**Three is a starting number, not a rule.** It trades his attention against the queue stalling.
If files sit unanswered because a batch of them reads as homework, lower it.
If he is answering them one at a time anyway, raise it.
**Say in the handover which way it felt** - that is the only signal the number ever gets.

## Stop conditions - the only times to come back to Max

Stop, say plainly which condition fired and what you need, then take the next unblocked item if there is one.
**Do not sit idle waiting.**

- **A migration is needed.** Never bundled, never applied by you.
  Write it, put it in the item, mark the item blocked.
- **Data loss is possible** and not fully reversible from the current backup.
- **The item is wrong in a way you cannot repair.** Rewriting a mis-stated premise is yours.
  Discovering the item solves the wrong problem is his.
- **A review finding you cannot resolve** without one of the above.
- **The batch would exceed what one PR can be reviewed as.** Split it, do the first half, queue the rest.

**Not stop conditions:** the plan being long, the diff being large, a decision between two reasonable implementations, uncertainty about taste where the item states a requirement, or anything that has already been decided in `CLAUDE.md` or a prior handover.
**A product decision only Max can make is no longer one either** - it defers the item and the loop carries on, per the section above.

## The queue

`docs/QUEUE.md`.
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
Append to `docs/PHONE.md` - the item, why only a device can settle it, and what a failure would look like.
Max works through it in one session.

If something can only be judged on a phone **and** shipping it wrong would be costly, that is a stop condition.
Otherwise it accumulates.
