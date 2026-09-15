# HANDOVER - 269 (AUDIT-v217)

**Branch:** `batch-269-audit-v217` · **Scope:** `docs/QUEUE.md`'s `project-audit` item, queued by batch 268 when the version counter fired.
**Deploy version shipped:** `ezplate-v218`. *(The audit is keyed to the version it AUDITED, v217; this batch ships v218 because it edits `index.html`. Those are two different numbers on purpose - `CLAUDE.md`'s two-counters rule.)*

## What changed

The audit ran and is filed at `docs/audits/AUDIT-v217.md`. **Its documentation findings are corrected here rather than queued**, per `CLAUDE.md`'s standing authority - a parked edit is caught by nothing.

⚠️ **THE HEADLINE IS NOT A DOC NIT. `enforce_admins` is TRUE on `main` and four live documents said FALSE** - `CLAUDE.md` among them, carrying the sentence *"an admin merge bypasses everything."* That is an instruction-shaped falsehood in the direction that matters, loaded into every turn of every session, telling every batch the wall is not a wall. Max evidently ran 265's one-liner after that batch merged and nothing in the repo could notice. Verified against the GitHub API, not inferred. Corrected in all four places, and the correction says the transferable half: **a setting that lives outside the repo is not a fact this repo can hold - read it, do not cite it.**

⚠️ **AND A RULE BATCH 268 SHIPPED THE DAY BEFORE WAS WRONG IN THE DIRECTION THAT MANUFACTURES BUGS.** It wrote *"the subtitle slot does not exist on a phone at all"* into `.claude/rules/css.md`. Six of the seven do not; **`#menuHeadSub` does**, set `display:block` at id specificity outside any media query, with its own comment explaining that the Menu screen otherwise shows a bare "Menu" with the menu name scrolled away.
**Consolidated item 61 IS the Menu screen**, and one of its bullets is true *because of* the exception. A batch running 61 with the absolute in hand would have duplicated the menu name into the body - manufacturing the two-places bug 268 spent a batch removing. Corrected, and **pinned by a test** that walks braces to prove the rule sits outside every `@media`, so it cannot be re-derived as an absolute a third time.

The rest, all from the audit: `docs/MAINTENANCE.md`'s **E5 and E6 were both marked OPEN and both are done** (E6's remedy shipped in 265, one batch after the file carrying "a done-mark is not a strike"). **`tools/state.js` and its own test both required a queue item to be NUMBERED**, so the un-numbered process item 265 allows went uncounted - two readers derived from one wrong belief, agreeing with each other, suite green. **Items 24, 53 and 54 are tier B and were in no group at all**, so the refill could never reach them; 43, 45 and 85 were unrouted too. Roster **bullet 23**: a structural claim tested by a proximity heuristic. And the **mutation gate's per-pid sandbox** is now written where a batch reads it, after two batches in a row killed it on the same wrong belief.

**For Max, in `docs/MAINTENANCE.md`, not taken:** `AGENTS.md` says *"Never add yourself as commit co-author"* and the last eight merges carry **13** `Co-Authored-By:` trailers, because the harness instructs it. Neither side can be called wrong by a batch. **A repo rule that every commit breaks teaches readers to discount the file it lives in**, and that file carries "reproduce before fixing" and "enumerate before changing". Recommended: delete or qualify the line. His file, his call.

## Review

The `code-review` agent ran on **Sonnet**, overridden from its pinned `opus` because this batch ran on Opus.
**Two findings. Both real. Both fixed here.**

**The first is the finding of the batch, because it landed inside the correction it was correcting.** `tests/audit-closure.test.js` **could not go red for `AUDIT-v217.md` no matter what it said** - only the `2b` heading opens a policed section, and *"Recommendation 1:"* is not a shape its `NUMBERED` pattern matches. The reviewer ran the unmodified checker against the file with every marker stripped: `[]` both times. **I had written those markers believing they were load-bearing, and the audit agent's own closing note said the suite would go red without one.** Both wrong. It is `**1. …**` now and was proved red by stripping the marker. **The gate was deliberately NOT widened** - its site records why a bare `recommend` was rejected - and the audit file now states what it actually polices, so the next reader gets the measured reach rather than the assumption.

The second: the `queueItems()` fix had a hole (`## next  24hrs of X` matched neither branch) **and was exercised by nothing**, because the fix and the deletion of its only live example landed in the same commit. The status word is the whole test now, and a synthetic fixture covers all five shapes plus the negative direction.
Full report and disposal: `docs/reviews/REVIEW-269-audit-v217.md`.

**Gates.** `npm test` 2314 tests, 0 fail. Mutation gate, full run: 1408 mutants, 1354 killed, 54 survived with all 54 carrying a written allowance, exit 0. Smoke: all checks passed. Playwright run on the branch before merge.

## Into CLAUDE.md

**`CLAUDE.md` itself:** the `enforce_admins` sentence, and the `docs/QUEUE.md` index row, which still said "tier A and B only" after 265 gave that file the right to hold one process item.
**`.claude/rules/css.md`:** the `.scr-sub` absolute becomes "six of seven", with the exception named and the reason it is dangerous written out.
**`.claude/rules/tests.md`:** roster bullet 23, and the mutation-gate sandbox fact.
**`.claude/agents/code-review.md`, `docs/rules/process.md`, `docs/MAINTENANCE.md`:** the same `enforce_admins` correction, plus the E5/E6 strikes.

## New docs/QUEUE.md items

None. The `project-audit` item is deleted; the audit is filed, so the counter has moved and the next one is nine versions away.
**The audit's own findings were routed by tier** - the documentation ones done here, the rest into `docs/MAINTENANCE.md` and `docs/QUEUE-GROUPS.md`. `project-audit` reports; it does not add queue items.

## New docs/PHONE.md items

None. Nothing this batch touched needs a real device.

## Probe

**What the item told me to do that I would have done differently.**
Nothing - the item was three lines and every one of them held. The instruction it carried *for* the audit (check whether items 61-64 move something into a header) is what surfaced the wrong rule, so it earned its place.

**What I did not propose because it was out of scope.**
The audit found `tests/visual/screenshots.spec.js` dark since v162 - **55 deploy versions, 14 tests, the top test-drift finding in three consecutive audits** - blocked on a staging test account that `docs/QUEUE-GROUPS.md` calls a two-minute job and the one live Tranche 0 gate left. It is consolidated item 27 and it unblocks 28 and 29 as well. **It needs Max, not a batch**, and it is the highest-value thing on his list that nobody has asked him for.

**Was any rule missing when I needed it.**
The inverse: a rule was PRESENT and wrong, one day old, written by the previous batch in this same session. The lesson is not that it was missing but that **an absolute is the form a rule rots into** - "at all" was doing no work in the sentence and made it false.

## Surprises

**The gate I was leaning on was decorative, and the agent that told me it would bite was wrong too.** `tests/audit-closure.test.js` passed the audit file with every closure marker deleted. Two independent sources agreed it was policing the file and neither had run it.

**`tools/state.js` and `tests/state-file.test.js` carried the same wrong regex**, so the test agreed with the code and the count was wrong in both. That is the roster's oldest entry - a check derived from the code's own assumption is a mirror, not a second opinion - in the file written to police a derived value.

**Three of this batch's corrections were to things written in the previous two batches of this same session**, which is a faster rot cycle than the record suggests is normal. All three were absolutes or done-marks: "at all", "OPEN", "tier A and B only".
