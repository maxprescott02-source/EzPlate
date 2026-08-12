---
name: decide
description: Generate a decision file for questions only Max can answer, instead of stopping the loop. Visual decisions must render the options, not describe them. Run when items are blocked on his judgement, or when he asks what is outstanding.
---

# Decide

Max's decisions are the loop's most common blocker. Batch them into a file he
can answer whenever, on whatever device he has.

**The loop does not wait.** Generate the file, mark the items blocked, take the
next unblocked item.

## What belongs here — and what does not

**The test: does the answer depend on the café, the trade, the customers, or
Max's history — rather than on the code?**

**His:** whether a screen reads right in his hand. Whether a control is missed.
What staff should be allowed to do. Whether a trade-off is worth it. Anything
that reverses a decision he made himself.

**Yours — decide these and do not ask:** documentation and `CLAUDE.md` in every
tier, new rules, corrections and strikes, which implementation is cleaner, what
a thing is called, how a test is structured, whether to split a batch, what goes
in `docs/MAINTENANCE.md`.

He does not want to make documentation decisions and has never once deviated
from a recommendation on one. A decision file containing a documentation
question trains him to skim it, and then the visual ones get skimmed too.

If the answer is already in `CLAUDE.md` or a prior handover, it is a lookup.

## Visual decisions RENDER the options

**If a decision has a visual answer, draw every option. Do not describe them.**

- Side by side in the same file, each fully rendered.
- **380px and dark mode** are the primary view, because that is where he uses
  the app. Add 1360 and light beneath if the decision differs across them.
- Real tokens from `css/style.css`. Real copy. Real figures from production
  where the decision turns on data — a layout judged against invented content is
  judged against the wrong thing.
- Label them A, B, C with the trade-off in one line beneath, not a paragraph
  above.

Three chat-sourced UI reports in a row did not reproduce, each time because a
description of a screen is not the screen. That gap runs in both directions: a
described option cannot be judged either.

**If an option cannot be rendered, say so at that option** rather than quietly
describing it and letting it lose to the two that were drawn.

Non-visual decisions keep prose: question, why it matters now, two to four
options with what each costs, your recommendation marked as such, and what would
change it.

## The file — and how he actually answers

`docs/decisions/YYYY-MM-DD.html` when anything in it is rendered; `.md` when it
is all prose. Standalone, no build step, readable on a phone. Match the app's
palette so it does not feel foreign.

**Five decisions or fewer.** Beyond that it is a document, not a task, and it
will sit unanswered.

⚠️ **He answers in CHAT, never in the file, and no interactive control in the
file has ever worked on his device.** He declined the copy-button flow twice —
9 Aug 2026 (the HTML's interactive parts did not work on his phone) and 10 Aug
2026 (*"let me answer decision in chat"*).

So:

- **No copy button, no radio buttons, no form.** The file RENDERS; it does not
  collect.
- **Post the questions in the next chat message**: compact, option letters bold,
  one-line recommendation each, one line on what would change it. End with
  *"reply with the letters, e.g. `1A 2B 3C`"*.
- **Still write the file**, because it is the durable record the `Blocked on:`
  lines point at — but never make opening it the mechanism for a prose decision.
  A rendered decision is the one case where he does have to look, so say in the
  chat message that the drawn options are in the file and name the path.

## After he answers

- Record each decision and its date in `CLAUDE.md`. A decision made twice was
  not recorded properly.
- Unblock the items and note which decision unblocked them.
- If an answer contradicts something already recorded, say so before acting —
  he may not have realised, or the record may be stale.

## Do not

- Ask what you can answer by reading the code.
- Ask a documentation question.
- Present an option you know to be bad to make another look good.
- Stop the loop waiting for an answer.
- Re-ask something already decided. Check the record first.
