# HANDOVER - 283 (percent-precision)

**Branch:** `batch-283-percent-precision` · **Scope:** `docs/QUEUE.md` item 99, the food-cost percentage printed at two precisions. **Shipped `ezplate-v230`.**

## What changed

A dish's food-cost % now reads the same on every screen that prints it. It did not before: the Menu row said `42.9%` and the Edit-menu-item modal you open from that row said `43%`, about the same dish, one click apart.
The cause was two computations, not two formats - `menuMarginPreview` rounded `cost/price*100` to a whole number for five surfaces, and `vbadge` re-derived the identical ratio at one decimal for the Menu row. There is now one computation (`foodCostPct`, which returns the RAW ratio) and one formatter (`fmtFoodPct`), and all six surfaces go through both.
**One decimal, and the reason is not taste:** `cogsPct` has been settable to one decimal since batch 244, so a whole-number food cost cannot say which side of a 32.5% target a dish sits on - which is the only question the figure exists to answer. It is also what the v3 mock prints at all six sites.
`analyze().absPct` is trimmed. Dead since v122, flagged by three audits and a `docs/MAINTENANCE.md` entry; the two tests that still named it were using it as a witness, and both now pin the condition directly.
`avgFoodCostForScope` is deliberately untouched - a mean of per-plate ratios is a different quantity, already at one decimal at all ten of its sites, and item 99's own warning forbade aligning the two.

## Review

`code-review` agent on **Sonnet**, because this batch ran on Opus and a model reviewing its own work is not a second reader. Report: `docs/reviews/REVIEW-283-percent-precision.md`.
**One minor finding: `fmtFoodPct` has no internal null guard.** Correct, and **considered and declined** - every guard available here is a quiet failure (`''` renders "% food cost" with no number, `'0.0'` fabricates a figure the money law forbids, `'—'` invents a fifth spelling of absence when each surface already has its own) while the throw is loud.
**The actionable half was fixed:** the requirement was real and unwritten, so the site now names which of the six absence renderings belongs to which surface, and says a seventh caller owes one of them.
The reviewer also declined to claim a mutation result it had not observed, having killed the gate partway for budget. The batch ran it to completion twice - **1498 mutants, 1443 killed, 55 survived with written allowances, exit 0** - with both new functions added to `tests/mutation/targets.js` as explicit targets.

## Into CLAUDE.md

Nothing.

## New docs/QUEUE.md items

None. One finding was routed to `docs/MAINTENANCE.md` instead (below), and two riders there were closed by this batch: the `absPct` entry, and *"the publish dialog and the Menu row print the same ratio at different precision"* - which was item 99's own source, and which understated it as two displays of one ratio when it was six displays of one ratio computed twice.

## New docs/PHONE.md items

None. Nothing here needs a real phone: the one genuinely device-only question would have been layout, and a browser at 380px settled it.

## Probe

**What did the queue item tell me to do that I would have done differently?**
Almost all of it. The item said *"three different percentages at three precisions"* with *"six consumers"* of `menuMarginPreview().pct`. Measured, it is ONE quantity computed TWICE. It missed `renderEditMargin` - the Edit-menu-item modal, which batch 277 had shipped - and it dropped `vbadge`, the Menu row, which is the site its own source bullet was about. Its citation `js/app.js:12186` for the publish dialog points at unrelated delete-plate code. **A batch running it as written would have gone looking for a third printed surface that does not exist while missing two that do.** Corrected in the file and carried on, per the standing rule.

**What did I not propose because it was out of scope?**
`insDrift` and `insVolatility` print the same per-dish ratio at whole numbers inside generated insight prose. Left alone deliberately and filed in `docs/MAINTENANCE.md` with the reasoning, because those figures are the `facts:` object `api/insight` validates a phrasing against - changing their precision moves a contract at both ends - and a figure in a sentence is a different register from a figure in a data cell. The argument that decided this item does not reach them: they state a movement between two of their own numbers, not a position against the target.

**Was any rule missing when I needed it?**
No, and two arrived usefully. `.claude/rules/app-guards.md` loaded with `js/app.js` and named the exact shape `vbadge`'s comment was in. `.claude/rules/tests.md` loaded when I opened `tests/`, and its *"a pipeline throws the exit code away"* rule caught that my first full Playwright reading came through a `grep` pipe - I re-ran it redirected and read `$?` (exit 0, 563 passed).

## Surprises

**`vbadge`'s own comment asserted the opposite of the truth, and had for a long time:** *"Same ratio, different display precision - a display choice, not a second computation."* It **was** a second computation. That is `app-guards.md`'s "comment filed under the wrong consequence" exactly - an accurate observation with a reassurance attached that closed the question. Corrected at the site.

**The `absPct` trim was half-done and a grep caught it, not the suite.** The first commit left `absPct:null` in `analyze`'s early `nomenu` return while the comment above claimed the field was gone. Every test stayed green, because nothing reads it - which is why it was dead in the first place. Fixed in `de78375`.

**The `flow-tester` agent could not run: the staging Supabase project is PAUSED** and would not wake (503 on every REST call, confirmed independently through the MCP). It correctly reported the blocker instead of falling back to production. The gap it named - layout at 380px with one more character - was closed another way: the Playwright harness seeds its own fixtures and needs no Supabase, so a throwaway spec measured it directly. **Measured against `main`: row `42.9%` / modal `43%`; on the branch both `42.9%`.** No pill clipping (`scrollWidth === clientWidth` on every pill), no horizontal page overflow at 380, both themes, and clearing the price gives *"suggested $10.00 at a 30% food cost"* rather than a fabricated one. **Staging needs resuming from the dashboard before the next batch that wants a live browser pass.**
