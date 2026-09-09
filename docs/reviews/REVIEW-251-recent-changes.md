# REVIEW-251 — Recent changes says what kind of change it was

Reviewed-commit: dd09dcddeeb518ed0c7da915d74575e701a04ec3

**Agent:** `code-review`, run on Sonnet (the batch ran on Opus 5).
Given the diff and the codebase conventions, and **not** the queue item, so it judged correctness rather than conformance.

**Three findings — one major, one its consequence in the tests, one a comment. All three acted on.**

The major one is the same shape as the queue item this batch was executing: **a label for a case that cannot occur.** The item claimed a defect the filter makes unreachable; I then built a word for a row the same filter makes unreachable. One level down, same day, same function.

---

## The report, verbatim

> ## Findings
>
> **1. (Major, high confidence) The "New plate" label can never actually appear — it labels a case `recentChangeRows`'s own filter always excludes.**
>
> - `js/app.js:4343-4348` (`changeKindWord`) maps `kind==='plate_created'` → `'New plate'`.
> - `js/app.js:4351-4366` (`recentChangeRows`) requires `typeof e.costBefore==='number'` (and finite) before a row is even considered — `js/app.js:4358` (`if(typeof e.costBefore!=='number' || typeof e.costAfter!=='number') return;`).
> - The only writer of `kind:'plate_created'` is `saveCurrentPlate`, at `js/app.js:3669-3673,3736`: `var _costBefore=_prev?costFromLines(_prev.lines):null;` and `var _isNew=(_costBefore==null);`, then `logChangeIfSaved(_write, _isNew?'plate_created':'plate_edited', {..., costBefore:_costBefore, ...})`. By construction, `_isNew` (and therefore `kind==='plate_created'`) is true *exactly when* `_costBefore` is `null`. I checked git history (`git log -S"plate_created"`) — this invariant has held since the change-log feature was introduced; there is no legacy shape and no other writer.
>
> So every `plate_created` entry that has ever existed, or ever will under the current code, carries `costBefore:null`. `typeof null !== 'number'`, so `recentChangeRows` drops every such entry before it is ever pushed to the array the card renders. The `'New plate'` branch in `changeKindWord` is therefore dead code: it is called, but the input that would make it return a non-empty string never reaches it in production. This directly undercuts the batch's own stated goal (distinguish "new plate" from "ingredients edited" from "line linked" on the card) — one of the three cases is silently unreachable.
>
> **2. (Follow-on of #1, high confidence) The new tests "proving" the New-plate label use a fixture that no real writer can produce, so they can't catch this.**
>
> - `tests/dash-recent.test.js`, test `'251: the row says what kind of change it was…'`: `entry({ id:'A', ..., kind:'plate_created', ..., costBefore:0, costAfter:4, ... })`. Real `plate_created` entries always have `costBefore:null`, never `0`.
> - Same fixture reused in `'251: the word reaches the markup, before the relative day'`.
>
> Both tests pass only because they fabricate an event shape (`kind:'plate_created'` + numeric `costBefore`) that violates the invariant the app's own single writer enforces. This is exactly the class this repo's CLAUDE.md calls out under "a fixture whose fields agree cannot tell you which one the code read" / "a stub that mirrors a real function must mirror its contract" — here the *test data*, not a stub, disagrees with what the real writer can ever emit, so green here proves nothing about whether "New plate" can ever be seen by Max. If a future change broke the `plate_created→null costBefore` link inadvertently (e.g. someone "fixed" `_costBefore` to default to `0`), these tests would still not catch that it's the wrong direction — they'd stay green regardless, since they don't test through the real writer (`saveCurrentPlate`) at all, only through the hand-built `entry()` fixture.
>
> **How to verify:** change the test's fixture to `costBefore: null` (the real invariant) and confirm the row disappears from `api.rows(null)` — it will, matching the already-existing test two blocks above it (`'an entry with only ONE cost figure is dropped, not treated as a move from zero'`), which the new tests contradict without acknowledging it.
>
> **3. (Minor, lower confidence — worth flagging, not blocking) The comment's claim is stated more strongly than the code supports.**
>
> The new comment block above `changeKindWord` says: *"only two writers supply both [cost figures]"* — true only in the sense that both call sites *pass* a `costBefore` key; for one of the two (`plate_created`), the value is always `null`, and the entry is never a candidate row at all. The comment reads as though both `plate_created` and `plate_edited` produce visible rows on the card; only `plate_edited` (from either writer) actually does.
>
> **Everything else checked and found fine:**
> - `'Line linked'` (`detail.via==='orphan-link'`, from `linkOrphanPlate`) is genuinely reachable — `cb`/`costFromLines(lines)` are always real numbers, never null.
> - `'Ingredients'` (plain `plate_edited` from `saveCurrentPlate`) is genuinely reachable, and correctly reflects that any nonzero delta on that kind can only come from a lines change, since both figures are computed with the same live product prices at write time (so price drift alone cancels out and can't masquerade as an edit).
> - Guard ordering (`detail.via` checked before `kind`) correctly implements CLAUDE.md's "read `detail`, never `kind` alone" for the two events sharing `plate_edited`.
> - Malformed/`null`/non-object `detail` is handled defensively and pinned by a test that actually exercises it through a source other than `detail.name` (the plate lookup), avoiding the trap the test's own comment describes.
> - Terminology: `'New plate'`, `'Ingredients'`, `'Line linked'` don't introduce a forbidden noun ("recipe", "dish").
> - Escaping: `esc(r.kindWord)` is applied before insertion into markup.
> - Cache-version bump: all six spots moved v206→v207 consistently.
> - Mutation-gate target added for `changeKindWord` — the added tests would kill a mutant that drops the `detail.via` branch or the `plate_edited` branch; only the `plate_created` branch's "protection" is against dead code.

---

## What was done about it

**Finding 1: the branch is REMOVED.** Verified independently — `_isNew=(_costBefore==null)` is the expression that picks the kind, so the two are the same condition and the filter drops every one. The reasoning for deleting rather than keeping is the one this repo already applied to `plateIdOf`'s third branch in v112 and to two other cases this session: **a case that cannot fire reads as coverage and is not.**

**Finding 2: the fixtures are corrected**, and the contradiction the reviewer spotted is worth restating — my new test asserted a row for an entry that the test two blocks above it says is dropped. Both were in the same file and only one of them could be right.

**And the unreachability is now PINNED rather than remembered**, because it is a property of a *different* function and properties change: if the writer link ever breaks, new plates start reaching the card unlabelled, which is quiet.

⚠️ **The first version of that pin did not work, and finding it took the same technique the reviewer used.** It asserted the choice expression and the ternary — and both survive a REASSIGNMENT between the choice and the write. I mutated `saveCurrentPlate` with `_costBefore = _costBefore || 0` and the test stayed green, which is the exact defect class the pin was written to prevent. It now also asserts `_costBefore` is assigned exactly once, and that mutation turns it red.

**Finding 3: the comment is corrected**, and it now says which two events reach the card and records that "New plate" was written, was dead, and was removed — so the next reader does not re-add it.

**Verification after all three:** `npm test` 2049 pass · `npm run smoke` pass · full mutation gate 1274 mutants, 1226 killed, 48 survived all with written allowances · `npx playwright test` 478 pass, 14 skipped.
