# HANDOVER - 266 (state file and two subagents)

**Branch:** `state-and-subagents` · **Scope:** fix-plan item C4 (prompt EZ-P4), from `~/Desktop/brain-ops/projects/brain-ops/fix-plan.md`. Not a `docs/QUEUE.md` item. **Deploy version: NONE** - no client asset changed, so `sw.js` stays at `ezplate-v215`, with no cache bump and no tag.

## What changed

`node tools/state.js` writes `docs/STATE.json`: batch, deploy version, current group, open A/B count, newest audit, newest handover, written_at.
Every field is derived from a file and it refuses rather than guessing, so there is no status marker for a batch to forget.
The current group is the one the refill would promote from - first group in `docs/QUEUE-GROUPS.md`'s order with an unstruck A or B item - which is NOT "first group with unstruck items": G1's four survivors are all tier C, and `docs/QUEUE.md` holds A and B only, so that reading names G1 for ever.
`tests/state-file.test.js` asserts its batch against the newest handover, so a handover landing without the writer reddens `npm test`.
`premise-check` (Sonnet, read-only) reports claimed-against-found on a queue item at `skills/batch` step 1; `handover-writer` (Haiku) drafts this file at step 10.
`docs/QUEUE.md`'s section heading said "group G1, the costing core" over three items that are G4's, and now names G4.
`AGENTS.md` is in `.vercelignore` - it had been served from the production origin since batch 264.

## Review

The pre-push `code-review` agent, **model overridden from its `opus` pin to `sonnet`** because this batch ran on Opus 5 and the reviewer has to be a different model. Four findings, all fixed. Artifact: `docs/reviews/REVIEW-266-state-file.md`.

1. `consolidatedItems()` silently skipped any item heading it could not parse, and a skipped heading is indistinguishable from a struck one - so a group could read as finished with open work in it. It now refuses and names the lines. The live instance it found (`## ~~blocked~~  91 · original item`) is harmless, because 91's primary heading already registered it; the mechanism was not.
2. `first_unstruck_group` was the one field with no independent check - `derive()` compared against a file `derive()` wrote, which is the stub-agrees-with-itself shape `.claude/rules/tests.md` names. It is now cross-checked against `docs/QUEUE.md`, a third file the derivation never reads for that field.
3. The `n < 200` membership ceiling would silently drop real items once backlog numbering reached 200. It derives from the backlog's own highest item now.
4. Struck-detection read "the line starts with `~~`" rather than "the item number is inside the `~~` span".

Each fix was reverted to check it was load-bearing. **Fix 3's first test was not** - its stray fixture numbers were above 200 too, so the literal ceiling passed it - caught by hand-mutation rather than by reading, and a second fixture numbered past 200 pins it now.
Separately: nine hand-mutations of `tools/state.js`, eight killed, one survivor found and killed - `audits()` sorted by filename instead of by number, invisible today because the ten `AUDIT-vNN.md` files sort identically either way, and silently stale the first time the series crosses a digit boundary.

## Into CLAUDE.md

One row in the "Where things live" table, pointing at `docs/STATE.json` and `node tools/state.js`. 179 lines, under the 200 cap.

## New docs/QUEUE.md items

None.

## New docs/PHONE.md items

None.

## Probe

**What would I have done differently:** EZ-P4 specifies "effort low" for `premise-check`. No agent definition in this repo or in `~/.claude/agents/` uses a reasoning-effort frontmatter key, so I could not verify its spelling and declared none - a key that silently does nothing reads as a setting and gets trusted as one. The intent is in the file's prose. That is the one place the prompt was not followed literally.
**What I did not propose because it was out of scope:** adding `tools/state.js` to the mutation gate. The gate mutates `js/app.js` only; widening it is a harness change this batch did not need, and the nine hand-mutations covered the same ground once.
**Was any rule missing when I needed it:** No. `.claude/rules/tests.md` loaded on the first read under `tests/`, and its "would this test FAIL if I broke the thing it names" is what produced the mutation pass that found the `audits()` survivor. `app-guards.md` loaded too and was not needed - the diff touches no client code.

## Surprises

**The two new agents were not callable in the session that wrote them.** Agent types register at session start, so the first `premise-check` call failed with "agent type not found". They registered partway through the batch and both were then run for real, which is what closed the item's done-when.
**Running `premise-check` on queue item 57 found it materially wrong.** Three symbols it names - `renderKingRows`, `renderIngRows`, `buildCatOptions` - do not exist anywhere in the repo, and every line citation in it points at unrelated code. Two sub-items are wrong about the mechanism as well: the dropdown's forced capitals are on the category tag, not the product name, and the PACK SIZE example is already split into a `.hint` span, so what remains there is a CSS inheritance fix. Spot-verified by hand before recording; item 57 now carries the corrected sites.
**The `handover-writer` draft of this file invented three claims** - that `docs/STATE.json` feeds the subagents, that `docs/QUEUE.md` regenerates from it, and a judgement about `AGENTS.md` nobody made. None is true and all three were removed. Its definition tells it never to invent a section's content; that instruction is not sufficient, and the review step in `skills/handover` is load-bearing rather than a formality. **Read its draft against the diff before saving it.**
