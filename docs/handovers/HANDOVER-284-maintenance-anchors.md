# HANDOVER - 284 (maintenance anchors)

**Branch:** `chore/maintenance-anchors` · **Scope:** `docs/QUEUE.md` item 100, the one process slot: `docs/MAINTENANCE.md` had no cap and no entry test.
**Deploy version:** none shipped. No client asset changed; `sw.js` stays `ezplate-v230`, so no tag.
**Premise check:** the diagnosis held and the numbers had drifted - 1,616 lines not 1,520, the quoted sentence at line 1397 not 1352, and both stale entries the item cited (`doDeleteMenu`, `edDelArmed`, including consolidated item 76) were already struck.

## What changed
- `docs/MAINTENANCE.md` is a WORKING LIST, and git plus the handovers are the record. Finished entries are deleted, never struck.
- Every entry opens with an `Anchor:` line naming the literal it is about and the tracked file or directory it lives in. `absent` inverts it for something unbuilt; `none - <reason>` is allowed for at most 10 entries.
- `tools/maintenance-check.js` enforces it and `tests/maintenance-file.test.js` runs it in `npm test`. An entry whose subject is deleted, or built, turns the suite red. This was proved on the real file by removing `function renderPlate` from a copy.
- The entry cap is 99, the count after the first run, so the next entry displaces the one you would least miss, named in the handover.
- The first run took the file from 1,616 lines and about 140 headings to about 1,180 lines and 99 entries.
- Every struck or DONE entry is gone, plus six found fixed in code:
  - the pre-push hook install
  - the `priceHistory` wholesale replace
  - "Existing plate" at zero menus
  - Invoice Apply's early completion message
  - the ungated `logHistory`
  - "Comments that disagree with the code"
- Deleted by judgement:
  - the iCloud duplicates entry (its guard shipped in 281)
  - the v156 retrospective review and abbreviation matching (both live in consolidated items 80 and 78)
  - the self-expiring stored-prices entry
  - the CI-minutes entry's three residual notes
  - audit rows E7 and E8
- `skills/batch/SKILL.md` states the rule. `docs/QUEUE.md` item 101 warns that moving the agents turns `npm test` red by design.
- The stated limit: a defect fixed IN PLACE keeps its anchor green. Grep the file for any function you change.

## Review
`code-review` on Sonnet, because the batch ran on Opus.
Six findings:
- CRLF breaking `none` anchors: fixed, with a test.
- Headings inside code fences: fixed, with a test.
- A one-anchor six-selector entry: fixed, it now has six anchors.
- A `type="number"` anchor that could never go stale: fixed, re-anchored.
- Prose between two entries is unguarded: documented as a limit, because a body bullet and a stray finding cannot be told apart.
- Content loss: none found; the iCloud deletion was intentional.
Both code fixes were hand-mutated and went red.
Artifact: `docs/reviews/REVIEW-284-maintenance-anchors.md`.

## Into CLAUDE.md
Nothing. The rule lives in the file's header, the checker and `skills/batch/SKILL.md`.

## New docs/QUEUE.md items
None.

## New docs/PHONE.md items
None.

## Probe
The item offered "record or working list"; it is one decision, and the file's own header already described work, so it was not close.
Not proposed: a line cap (the entry cap is the real limit) and a diff-aware check for fixed-in-place defects (too flaky for CI).
Five fork agents anchored the file in parallel chunks, each validated by the checker. That was worth it at this size, and a future re-anchor should reuse the pattern.

## Surprises
Six entries read as open while their fixes had already shipped - the item's exact failure, found on the detector's first run.
My first commit carried a `Co-Authored-By` line against `AGENTS.md`; it was amended before push.
