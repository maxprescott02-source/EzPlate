# REVIEW-284 - docs/MAINTENANCE.md as an anchored working list

Reviewed-commit: ae80d12
Agent: `code-review`, run on **Sonnet**. The batch itself ran on Opus, so the reviewer was overridden off its pinned `opus` per `CLAUDE.md`'s "a model reviewing its own work is not a second reader".
Brief: not shown to the agent. It was given the branch diff and the areas to attack, nothing about the queue item's reasoning.

---

## The report, verbatim

> Reviewed `git diff main...chore/maintenance-anchors` (one commit, 284). Findings ranked by severity.
>
> ## 1. MAJOR - the group-prose guard checks the wrong condition; unanchored findings between two entries escape it completely
>
> `tools/maintenance-check.js` lines 70-95. `group.intro` is only incremented while `!entry` - i.e. before a group's *first* `###` heading. Once one entry exists in a group, the counter is never touched again, so any amount of unanchored prose written *between* two entries in the same group is invisible to the checker.
>
> Repro: a body of `### A` with an anchor, then eight `- ` bullet lines, then `### B` with an anchor. Result: `{ problems: [], entries: 2 }`.
>
> This directly contradicts the feature's stated purpose (`tools/maintenance-check.js:54-57`, and the new `docs/MAINTENANCE.md:28`): *"A group may carry at most six lines before its first entry, so a finding cannot sit in group prose and escape the anchor check."* That promise only holds for the first entry in a group. The test for this only exercises the before-first-entry case and the zero-entries case.
>
> ## 2. MINOR/EDGE-CASE (checker) - `Anchor: none - <reason>` breaks under CRLF; repo has no `.gitattributes`
>
> `NONE_RE = /^Anchor: none - (\S.*)$/` requires `$` to reach the true end of the line string. On a CRLF-encoded line, `.` does not match `\r`, so the match fails: `Anchor: none - some reason\r\n` reports "malformed anchor" AND "no `Anchor:` line" (both false).
>
> ## 3. MINOR/EDGE-CASE (checker) - heading-like lines inside a code fence are parsed as real headings
>
> `parse()` has no fenced-code awareness. A fenced `### not a real heading` is parsed as an entry and flagged for lacking an anchor. Not currently triggered. Fails safe (false red) rather than false green.
>
> ## 4. MINOR - dishonest/under-scoped anchor: "Dead CSS sweep" anchors one symbol for a six-symbol finding
>
> The entry's subject is six dead selector families, but it carries a single `.ref-pill` anchor. If `.ref-pill` alone is removed the entry reads STALE and the header says to delete it, silently dropping the other five.
>
> ## 5. MINOR - anchor that can never meaningfully go stale
>
> `Anchor: \`type="number"\` in \`js/app.js\`` for the entry about ~11 unguarded numeric inputs. The literal exists regardless of whether any field is ever guarded; it tracks nothing about the entry's real content.
>
> ## 6. Content-loss check (old vs new `docs/MAINTENANCE.md`)
>
> Diffed all 140 old `###` headings against the 99 new entries; 106 did not read as finished; 18 had no exact-title match and each was traced. Confirmed fixed in code: pre-push hook install (`package.json` `prepare`), `priceHistory` wholesale-replace (`mergeSeries`), "Existing plate" at zero menus (`updateMenuAddDishBtn`), the `doDeleteMenu` stale comment, the pack-formula duplication (batch 261's `tests/pack-arithmetic.test.js`). Preserved under new titles: the HANDOVER-175 supplier filter, the `buildBackup` comment, "One magnitude check", the flow-tester sweep, the `fresh-states.spec.js` entry, the two Playwright-flake residuals; the v156 review and abbreviation matching are live in consolidated items 80 and 78.
> **One real, if minor, loss:** "iCloud keeps conflicted copies" is deleted with no trace; its guard is real, but its residual (*do not run `git add -A` on a synced tree*) is carried nowhere else.
> **One dangling cross-reference:** `docs/QUEUE-2026-09-08-CONSOLIDATED.md:836` still says the VoiceOver/thumb-feel device checks are "filed in `docs/MAINTENANCE.md`"; they are not in the new file.
> I did not find any case of a still-broken, unrecorded-elsewhere defect being silently dropped as "done".
>
> `docs/QUEUE.md`, `skills/batch/SKILL.md` and `tests/trend-reframe.test.js` diffs are clean.

*(Code blocks in findings 1 and 2 condensed to one-line repros; wording otherwise as returned.)*

## Decisions

1. **Considered, not fixable as stated; limit documented.** Text after an entry IS that entry's body, and markdown gives no way to tell a body bullet from a stray finding - every long entry here has bullets. The claim was overstated, so the checker comment and the file header now say the guard covers group prose before the first entry only, and that a new finding must be its own `###`. Commit `65cbd8f`.
2. **Fixed.** CRLF is normalised before parsing; `tests/maintenance-file.test.js` pins it, and removing the normalisation turns that test red (hand-mutated, file diffed, restored by copy).
3. **Fixed.** Fenced code is skipped; pinned by a test that also proves an entry after the fence is still checked, and red with the fence skip disabled.
4. **Fixed.** Dead CSS sweep carries one anchor per selector; the header now says an entry about several things carries one anchor per thing and is narrowed, not deleted, when one goes red.
5. **Fixed.** Re-anchored on `invPrice` and `invPackQty`, the two highest-stakes fields the entry names. Still blind to a guard added in place, which is the checker's stated limit.
6. **iCloud: intentional.** Deleted on purpose - the guard shipped in 281 and what remained is a habit the entry itself says cannot be enforced. **The consolidated cross-reference: left**, because that file is the backlog of record and is struck, never edited for history; the VoiceOver half already points at consolidated item 68.
