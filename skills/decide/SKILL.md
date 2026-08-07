---
name: decide
description: Generate a decision file for questions only Max can answer, instead of stopping the loop and waiting. Run when queue items are blocked on his judgement, or when he asks what decisions are outstanding.
---

# Decide

Max's decisions are the loop's most common blocker, and stopping to ask one at a
time wastes both his attention and the loop's time. Batch them into a file he can
answer whenever, on whatever device he has.

**The loop does not wait for this.** Generate the file, mark the items blocked,
and take the next unblocked item.

## When a question belongs here

**The test: does the answer depend on the café, the trade, the customers, or
Max's history — rather than on the code?**

His: whether chefs reprice or reformulate. Whether a feature is worth having.
What staff should be allowed to do. Whether a number feels wrong. Whether to
charge for this.

**Yours:** which of two implementations is cleaner, what a function should be
called, how to structure a test, whether to split a batch. **Decide these. Do not
put them in the file.** A decision file full of engineering choices trains him to
skim it.

If the answer is already in `CLAUDE.md` or a prior handover, it is not a
decision — it is a lookup.

## Generating the file

Write `docs/decisions/YYYY-MM-DD.html` — a standalone HTML file, no build step,
readable on a phone. Match the app's own palette so it does not feel foreign.

For each decision:

- **The question**, in plain language. No jargon he would have to decode.
- **Why it matters now** — what is blocked, and what happens if it stays
  unanswered.
- **Two to four options.** Each with what it costs and what it commits him to.
  Not just the upside.
- **Your recommendation**, marked as such, with the reason in one line. He
  prefers being directed to being handed a menu — but the reasoning has to be
  visible enough to overrule.
- **What would change your recommendation.** This is the line that lets him
  disagree usefully rather than just picking.

The file ends with a **copy button** producing a markdown block of his answers,
which he pastes back to you.

Keep it to **five decisions or fewer**. Beyond that it becomes a document rather
than a task, and it will sit unanswered.

## After he answers

- Record each decision and its date in `CLAUDE.md`, so it is never re-litigated.
  A decision that has to be made twice was not recorded properly.
- Unblock the queue items and note which decision unblocked them.
- If an answer contradicts something already in `CLAUDE.md`, say so before acting
  on it — he may not have realised, or the record may be stale.

## What not to do

- Do not ask a question you can answer by reading the code.
- Do not present options you know to be bad in order to make one look good.
- Do not stop the loop waiting for the file to be answered.
- Do not re-ask something already decided. Check the record first.
