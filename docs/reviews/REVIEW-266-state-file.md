# REVIEW - 266 (state file and two subagents)

Reviewed-commit: 5c09e66
Agent: `code-review`, **model overridden to `sonnet`**.
The definition pins `opus`; this batch ran on Opus 5, and `CLAUDE.md` requires the reviewer to be a different model from the batch, so the pin was overridden for this run and is recorded here.
It was not shown a brief. It was pointed at the branch diff and told which question mattered most (which parse failures are silent).

**Landed after the reviewed commit**, in `240def3` and after: two fixture tests for newest-by-number, the item 57 premise annotation in `docs/QUEUE-2026-09-08-CONSOLIDATED.md`, and the four fixes below. The reviewer did not see those.

## Findings, verbatim, and what was done

### 1. `consolidatedItems()` has no completeness check, unlike every sibling derivation - major, silent-failure risk

> `handovers()` and `audits()` throw if they find zero matches. `groupOrder()` goes further and explicitly cross-checks that every `### G\d ·` section it found is also named in "## The order" list, throwing by name if one is missing - the file's own comment explains why: *"An order that omits a group is not a shorter order, it is a WRONG one, and it reads as fine."*
>
> `consolidatedItems()` (`tools/state.js:152-166`) has no equivalent. It loops every line of the consolidated file, and any `## ` heading that fails its anchor regex is silently `continue`d past [...] `firstUnstruckGroup()` then does `items[n] && !items[n].struck && (...)` - if an item's heading never registered at all, it is indistinguishable from a struck item and is silently excluded from "is this group still open" consideration.
>
> I confirmed this is reachable, not theoretical: the real file contains `## ~~blocked~~  91 · original item` (docs/QUEUE-2026-09-08-CONSOLIDATED.md:784) [...] That specific line happens to be harmless today only because it's a secondary/historical heading for an item (91) whose *primary* heading already registered the correct status [...] But the mechanism that would make this safe in general - a check that every `## ` heading was actually captured - does not exist.

**FIXED.** Repro run first and it reproduces exactly: the regex returns `null` on that line, because the `\s+` it wants after `blocked` is a `~`.
`consolidatedItems()` now collects every `## ` heading carrying a `·` that it cannot read and THROWS naming them, rather than skipping. The file's sections are single-`#`, so every `## ` heading in it is an item heading and a `·` line that will not parse is a shape nobody has seen.
Pinned by *"an item heading it cannot read is a hard stop, never a skip"*; reverting the throw to a `continue` turns it red.
The finding's stated consequence was also checked rather than copied: item 91 reads `struck: true` both before and after, from its primary heading, so the live instance is harmless as the reviewer said. The fix is for the mechanism, not for 91.

### 2. That same gap means `tests/state-file.test.js` cannot catch a wrong `first_unstruck_group` on the real files - major, "tests that cannot fail" category

> `first_unstruck_group` has no such check. The only places it's exercised are (a) the fixture tests [...] and (b) the "every other field agrees" test (line 79), which calls `state.derive(ROOT)` and compares it to the committed `docs/STATE.json` - both sides run the *same* function, so this is exactly the stub-agrees-with-itself shape the test file's own header warns about [...] If `firstUnstruckGroup()` derived the wrong group on the real files, `node tools/state.js` would write that wrong value into `docs/STATE.json`, and every test in the suite would still pass.

**FIXED, and it is the finding worth the review on its own.** It is right, and it is right by quoting this test file's own header back at it.
Added *"the current group is one docs/QUEUE.md was actually refilled from"*: the working set is a third file the derivation never consults for this field, `skills/batch` refills it from the current group, so if `first_unstruck_group` names a group none of the promoted items belong to, one of the two is wrong. It reads the group's raw `**Items:**` text rather than calling `groupMembers()`, so a broken membership parse cannot satisfy it.
It returns early rather than failing on two legitimate states: a null group, and a working set holding only pre-consolidation items 1-15.

### 3. `groupMembers()`'s `n < 200` filter silently drops real items once item numbers reach 200 - minor, documented but unguarded latent defect

> It currently works because the consolidated file's own item numbers top out in the 90s. But there is no assertion anywhere that item numbers stay under 200 - once the backlog's own item numbering crosses that boundary [...] a real item in a group's `**Items:**` line would be silently excluded from `groupMembers()`, with no error.

**FIXED.** The ceiling is now derived: the highest number the consolidated file actually uses (95 today), so it moves with the backlog and there is no constant to go stale.
⚠️ **The first attempt to pin this did not.** The fixture's stray numbers were 266 and 999, which the literal `200` also excludes, so reverting the fix left the test green - caught by hand-mutation, not by reading. A second test builds a backlog numbered 210 and 211, where the literal ceiling drops a live A item and `firstUnstruckGroup` returns null for a backlog that is not finished. That one does go red on the revert.

### 4. Struck-detection fallback conflates "status word struck" with "item struck", currently harmless by luck

> `consolidatedItems()`'s `struck` test ORs `line.includes('~~${n} ·')` with `/^##\s+~~/.test(line)` - the second clause fires on any heading starting `## ~~…` regardless of what the tildes actually wrap [...] It would misclassify a heading where only a status word like `blocked` is struck-through ahead of an otherwise-open item number.

**FIXED.** Struck is now decided by whether the ITEM NUMBER sits inside a `~~…~~` span, which is what "this item shipped" actually means in that file. Pinned by *"a struck STATUS WORD on an open item does not make the item struck"*, which reverts red.

### Not a finding (the reviewer's own words)

> `groupOrder()`'s handling of `**G4 + G5**` [...] is correct and matches its regression test. `handovers()` correctly spans both the old `HANDOVER-vNN.md` and new `HANDOVER-NNN-name.md` series with no collision in the real directory. `readSpots()` reuse for `deploy_version` correctly piggybacks on the six-cache-spot agreement check. The `.vercelignore` and agent-definition additions are consistent with existing conventions and introduce no new public-origin exposure.

## Verification run alongside the review

- `npm test` green, `npm run smoke` green. `npm run mutate --changed` reports nothing in scope: the gate mutates `js/app.js` only, and this diff touches none of it.
- Playwright NOT run. The diff changes no client asset and no control's existence, which is `CLAUDE.md`'s stated trigger for it.
- **Nine hand-mutations of `tools/state.js`**, backed up by `cp` and not `git checkout --`, each checked to have actually changed the file. Eight killed. One survived on the first pass - `audits()` sorted by filename instead of by number, invisible today because the ten `AUDIT-vNN.md` files sort identically either way, and silently stale the first time the series crosses a digit boundary. Killed by a synthetic directory holding `AUDIT-v99.md` and `AUDIT-v207.md`.
- The required freshness assertion was proved red-before/green-after by editing `docs/STATE.json` to a stale batch and watching it fail with the fix command in its message.
