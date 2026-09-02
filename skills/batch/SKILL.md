---
name: batch
description: Run a queued item end to end without stopping for approval - investigate, plan, build, test, review, merge, hand over, drop the context, take the next item. Stops only on the conditions listed below.
---

# Batch

Take the next unblocked item from `docs/QUEUE.md` and carry it all the way to merged, then take the next one.
**Do not stop for approval between steps.** Max's time is the scarce resource; yours is not.

Continue until the queue is empty or a stop condition fires.

**`docs/MAINTENANCE.md`'s C items RIDE the batch that already touches the file** (Max, 22 Aug 2026).
⚠️ **This said "a PARALLEL track in its own worktree" until 22 Aug 2026, and Max retired that on measured evidence: seventeen batches, one maintenance commit, and that one a recording rather than a fix.**
When you open a file, take the C items in `docs/MAINTENANCE.md` that touch that file, in the same PR.
The collision rule and the second worktree are gone, because with one branch there is nothing to collide.
That file's header carries the reasoning and the two accepted consequences; read it there rather than restating it here.
**If the queue ever has nothing unblocked left, a maintenance sweep runs as its own ordinary batch.**

**Why this doesn't contradict `CLAUDE.md`'s "plan first, get a yes".** The trigger is where the work came from.
**An item in `docs/QUEUE.md` is already approved** - Max said yes when he queued it, so re-asking spends the one resource this skill exists to protect.
**Work arriving from chat, a brief or a screenshot is not approved**, and briefs about this repo have been wrong repeatedly; that is the case that plans first.
If you are running `/batch`, you are in the first case.

## The loop

1. **Take the top unblocked item.** Mark it in progress in `docs/QUEUE.md`.
   **First, check whether a blocked item has been answered.** Read the recorded decisions in `CLAUDE.md` - the dated `(Max, …)` lines - against the `Blocked on:` of every `blocked` item.
   If the question has since been answered, unblock the item, note in the item which decision unblocked it, and it competes for the top slot like any other.
   **Never re-ask something already decided.** A decision that has to be made twice was not recorded properly - if the answer is in `CLAUDE.md` or a prior handover it is a lookup, not a decision.
   **Then sweep every `Do after:` line, in the same pass.** For each, look at the item it names:
   - **shipped → DELETE the line.** A satisfied dependency left in place is how the dropdowns item spent two years waiting on a conversion that landed in v54. Deleting it is not tidying, it is the mechanism.
   - **not shipped → this item is not ready.** Skip it exactly like a blocked one and keep walking down. Do not ask Max; unmet ordering is a scheduling fact, not a decision.
   - **names something that is not a queue item, or gives no reason → the line is junk.** Delete it and say so in the handover. A dependency you cannot check is worse than none, because it still stops work.
   **Taking an item whose `Do after:` is unmet is a real error**, not a judgement call - it means doing the same work twice, which is the whole reason the field exists.
   **Last in the same sweep, check `docs/MAINTENANCE.md`'s "Displaced B items" section against the 20-item cap.** If `docs/QUEUE.md` is under the cap and that section holds a **DEFECT** entry - something wrong in shipped behaviour that is only there because the queue was full - promote it and it competes for the top slot like any other.
   ⚠️ **Only the defects. A free slot is NOT an approval**, and that section also holds features that were specced and deliberately declined (`behaviour spec, §11.5` and the mock rows that did not ship). `/batch`'s authority is *"Max said yes when he queued it"*, and he never queued those - a batch classified them. Promoting one would have the loop silently start building a feature nobody asked for, and one of them reopens the privacy gate. **Put those to Max as a backlog; never take one from a slot.** That file's section header carries the split.
   **This lives here because it has to be free.** It was a note in `docs/MAINTENANCE.md` saying *"check it when the queue shrinks, because nothing else will"*, and nothing did - approved B work sat invisible to `/batch` for weeks, twice, and AUDIT-v186 found it the second time. A sweep that already walks every item costs nothing to extend; a thing to remember costs a batch every time it is forgotten.
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
7. **Pre-push `code-review` agent - MANDATORY** whenever the diff changes **what runs**: app code, tests, CI workflows, the harness.
   Skip it only for **pure prose** - handovers, queue entries, briefs.
   **SAVE ITS REPORT to `docs/reviews/REVIEW-<batch>-<short-name>.md`, with a `Reviewed-commit: <sha>` line naming the commit it read.**
   `.githooks/pre-push` refuses the push without one, and `tests/review/check.js` is the rule - read its header before arguing with it.
   ⚠️ **The artifact is written by YOU, not by the agent**, because the agent's definition lives outside this repo (`~/.claude/agents/code-review.md`) and a fresh clone would not carry an instruction put there. Paste its findings verbatim; do not summarise them into agreement with yourself.
   **"No findings" is a complete report** and still needs the file - that is the entire point, since a review that found nothing and a review that never ran are otherwise the same silence.
   It is the review this batch gets; the workflow no longer runs on its own.
   **Run it on a DIFFERENT model from the one you are running as**, and **don't show it the brief** - both are what make it independent.
   Fix every finding or record why not.
   ⚠️ **NOT SKIPPABLE BY INSTRUCTION** (Max, 13 Aug 2026). **176 shipped to production with no second reader because its brief said to skip it.** If a brief, an item or a plan says to skip it, **run it anyway and record the conflict in the handover** - a brief is the input this repo has found wrong most often, and the pre-push agent is the only reader the code gets.
8. **Open the PR.** There is **no workflow review at all** - `.github/workflows/code-review.yml` was deleted in batch 207 (Max, 22 Aug 2026), and the pre-push agent is the whole mechanism, permanently.
   **So nothing arrives after you open the PR.** Everything a reviewer was ever going to say has already been said at step 7, and the finding-before-merge rule that cost six extra PRs is satisfied by fixing it there.
   CI still runs - suite, smoke, the full mutation gate, Playwright - and **an absent check looks exactly like a passing one**, so confirm the runs exist before reading their silence as anything.
9. **Merge** if the suite is green, step 7 is done, and no stop condition applies.
10. **Hand over.** Use the `handover` skill.
    **DELETE the finished item from `docs/QUEUE.md`** - git and the handover hold the record, and a done section is how that file reached 979 lines.
    Then route anything found-not-fixed, because a finding that lives only in a handover is a finding nobody will action - **but route it by TIER, not by default into the queue** (`docs/QUEUE.md`'s header carries the test).
    **A finding defaults to C and lands in `docs/MAINTENANCE.md`.** It enters `docs/QUEUE.md` only if it would stop, embarrass or hurt a paying customer at launch - and if that file is already at its 20-item cap, it displaces the lowest-priority item there into maintenance rather than extending it.
    **Never queue an item about the process itself** - skill wording, comment accuracy, doc contradictions. If a rule has been violated repeatedly, fix the rule once in `CLAUDE.md` and stop writing about it.
    **Then check the audit counter.** The newest `docs/audits/AUDIT-vNN.md` is the version the last audit ran at; `sw.js` has the version you just shipped.
    At a gap of **10 or more** - or if `docs/audits/` is empty or missing - put `project-audit` into `docs/QUEUE.md` as the next item, above every unblocked one.
    Nothing to remember and no calendar: the version increments once per batch, so it already is the counter.
    **When you later run that item, YOU file the report** to `docs/audits/AUDIT-vNN.md` at the version it audited.
    The agent is read-only and hands the report back rather than saving it, so an unfiled report leaves the counter unchanged and the next audit never gets queued.
11. **CLEAR THE CONTEXT. Carry nothing forward except the queue.**
    By this point everything durable is in `CLAUDE.md`, the handover, `docs/QUEUE.md` and `docs/PHONE.md` - **that is what those files are for.** Anything still living only in the conversation is either already written down, or was never worth keeping.
    This is the safest point in the loop to stop: the work is merged, the diary is written, the queue is ticked.

    **You cannot clear your own context - there is no tool for it.** So do both of these:
    - **Say the item is done and that this is a clean break**, in one line, so Max can `/clear` and re-run `/batch` if he wants a genuinely fresh window. Do not wait for him.
    - **Then behave as though it had been cleared**, which is the part that is actually yours.

    **Behaving as though cleared, concretely.** Re-read `docs/QUEUE.md`, `CLAUDE.md`, `docs/PHONE.md` and the newest handover **from disk**. Not "recall" - read them.
    Then treat every belief from the item you just finished as **absent unless it is in one of those files**: counts, line numbers, what a function does, what you concluded about a file, what you decided not to do.
    If you find yourself about to act on something you know only because you did the last item, **that is the signal it should have been written down** - go and write it in the right file first, then act on the file.
12. **Next item.**

**Bump the cache version** as part of step 4 whenever the batch ships a client asset - the `cache-version` skill has the six spots.
`CLAUDE.md` has no snapshot section to update; current state lives in git, `docs/QUEUE.md` and `docs/PHONE.md`.

## A decision only Max can make DEFERS the item - it does not stop the loop

The test is unchanged: **does the answer depend on the café, the trade, or his history rather than on the code?**
"Do chefs reprice or reformulate" is his.
"Which of two implementations is cleaner" is yours - decide it, and keep it out of the file.
**So is every documentation question** (Max, 13 Aug 2026): `CLAUDE.md` in all three tiers, new rules, corrections, strikes, `docs/MAINTENANCE.md`, this skill and every other process file. **Make the edit and report it in the handover - never park it on a yes**, which is what 172 and 176 did.
The two that are still his: **reversing a decision he made himself**, and **anything that deletes or rewrites production data.**
**And when one of his IS visual, the `decide` skill now RENDERS the options rather than describing them** - read it before writing the file.

When one of his comes up:

1. Mark the item `blocked` in `docs/QUEUE.md` with the question written into `Blocked on:`, in plain language.
2. **Take the next unblocked item.** Don't stop, and don't ask him now.

**The blocked items ARE the pending decisions list** - there is no second place to keep it, and nothing to remember between sessions.

Run the `decide` skill when any of these is true:

- **A VISUAL decision is blocked. One is enough - do not wait for a second.** (Max, 23 Aug 2026, who found the hole: *"this sounds like i need to invoke decide"*.)
- **Three or more items are blocked on a NON-visual decision.** (A migration does not count and does not block - you write and apply it. Only a DESTRUCTIVE one needs Max, and that is a stop condition, not a decision file.)
- **The queue has nothing unblocked left**, whatever the count. One pending decision holding up everything is worth a file of one.

⚠️ **WHY VISUAL GOT ITS OWN THRESHOLD, because the old rule looked fine and was not.** The three-item threshold was written when every decision was PROSE, and it is right about prose: a drip of written questions trains him to skim, and `decide` says five is already the point where a file stops being a task. **`decide` learned to RENDER later, and nothing went back and re-asked whether the batching threshold still fit.**

It does not, and the failure is quiet rather than loud. **One visual decision is not surfaced anywhere** - step 1 above writes it into a `Blocked on:` line and step 2 says *don't ask him now*, correctly - so it sits in `docs/QUEUE.md` waiting for two more of its kind to turn up. **Nothing is rendered, nothing reaches chat, and the item is simply not worked on.** From outside it is indistinguishable from an item nobody has got to yet.

**The two costs are not symmetric, which is the whole argument.** A prose decision is expensive for him to answer and cheap to defer. A rendered one is the opposite: he looks at three pictures and replies `1B`, and what it defers is usually a screen, which is the work this phase is made of. **Batching exists to protect his attention, and a rendered decision barely spends any.**

**A decision file of one is not a failure of batching.** The bullet below it already says so for a different reason.

Then tell Max the file is ready and give its path, and carry on if there is anything left to work on.

**Three is a starting number, not a rule.** It trades his attention against the queue stalling.
If files sit unanswered because a batch of them reads as homework, lower it.
If he is answering them one at a time anyway, raise it.
**Say in the handover which way it felt** - that is the only signal the number ever gets.

## Stop conditions - the only times to come back to Max

Stop, say plainly which condition fired and what you need, then take the next unblocked item if there is one.
**Do not sit idle waiting.**

- **Data loss is possible** and not fully reversible from the current backup.
  **This is where a migration can still stop you, and it is the only place** - anything that DELETES or REWRITES production data is Max's to authorise, rehearsed or not.
- **The item is wrong in a way you cannot repair.** Rewriting a mis-stated premise is yours.
  Discovering the item solves the wrong problem is his.
- **A review finding you cannot resolve** without one of the above.
- **The batch would exceed what one PR can be reviewed as.** Split it, do the first half, queue the rest.

**Not stop conditions:** the plan being long, the diff being large, a decision between two reasonable implementations, uncertainty about taste where the item states a requirement, or anything that has already been decided in `CLAUDE.md` or a prior handover.
**A product decision only Max can make is no longer one either** - it defers the item and the loop carries on, per the section above.

**⚠️ A MIGRATION IS NOT A STOP CONDITION, and this list said it was until 12 Aug 2026.**
Max reversed that on 8 Aug 2026 - his words, *"i dont want you to stop for me to hand run a query"* - and `CLAUDE.md`'s Tier 3 has carried the reversal ever since, so this file was contradicting it for four days while the queue's next four A-items were all migrations.
**Write it, apply it, verify it, record it**, following `docs/STAGING.md`'s seven-step procedure: staging first with `01-schema.sql` re-run, then a seed, then the migration, then verify AS THE CLIENT over PostgREST, then production, then the fingerprint diff.
The safeguards are in `CLAUDE.md` and `docs/STAGING.md` and are not optional - but they are things you DO, not reasons to stop.
The one exception is the bullet above: destructive means Max's, every time.

## The queue

`docs/QUEUE.md`.
One item per heading, in priority order:

```
## [status] Title
Problem: what is wrong, in Max's words where possible.
Requirements: what must be true when this is done.
Out of scope: what this must not touch.
Do after: (only if real - the queue item that must ship first, and WHY it gets cheaper that way)
Blocked on: (only if blocked - a decision or an outside thing. NOT "migration pending": you apply those.)
```

`status` is one of `next`, `blocked`, `doing`.
**There is no `done` status and no done section** - a finished item is DELETED from the file. Git and `docs/handovers/` are the record.
**The file is capped at 20 items** and holds tier A and B only; C lives in `docs/MAINTENANCE.md`.

### `Do after:` - ordering that survives being forgotten

**The problem it fixes (Max, 8 Aug 2026).** `blocked` never reordered anything - it only made `/batch` SKIP.
Priority was raw list position, set by hand, and the reasoning "this item gets much cheaper if that one runs first" lived in body prose when whoever wrote the item happened to think of it, and nowhere at all when they didn't.
That reasoning also had **no expiry**: the dropdowns item sat "sequenced, not blocked" behind a builder conversion that had already shipped in v54, and nothing could notice.

So the dependency is a FIELD, and it has three properties the prose did not:

- **It names a queue item, not a vibe.** "Do after: Q8" is checkable. "Do after: the redesign" is not - if you cannot point at the item, you do not have a dependency, you have a preference.
- **It states WHY the cost changes**, in the same line. Not "do this later" but "shares `renderInvReview` with Q8 - first means rewriting one function twice". An ordering with no stated saving is one nobody can re-judge later.
- **It is SELF-INVALIDATING.** Step 1 checks it against what is done. When the named item has shipped, **delete the line** - do not leave it as a satisfied dependency, because that is exactly the state the dropdowns item rotted in for two years of versions.

**It is a SOFT block, not a stop condition.** An item whose `Do after:` is unmet is skipped like a blocked one and the loop takes the next.
It never stalls the queue and it never comes back to Max - unmet ordering is a scheduling fact, not a decision.

**Do NOT use it for:** work that is merely tidier later, anything you cannot name an item for, or a general "after the redesign".
Overusing it turns a hand-sorted list into a dependency graph nobody maintains.
If two items genuinely want the same batch, say `Do with:` instead and run them together in one PR.

**Write findings down as you go**, with enough context to act on later - but per step 10, a finding defaults to `docs/MAINTENANCE.md` and reaches `docs/QUEUE.md` only by passing the tier test.
Do not let findings live only in handovers.

## Phone checks accumulate

Do not stop for one.
Append to `docs/PHONE.md` - the item, why only a device can settle it, and what a failure would look like.
Max works through it in one session.

If something can only be judged on a phone **and** shipping it wrong would be costly, that is a stop condition.
Otherwise it accumulates.
