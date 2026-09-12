# REVIEW-262-one-verb-per-intent

Reviewed-commit: 7b34924

`code-review` agent, Sonnet against Opus, on `git diff main...HEAD`.

**One CRITICAL finding, and it is this batch's own regression — the exact defect the batch was fixing,
in the sibling case I did not check.** Everything else checked out, including two points the reviewer
confirmed empirically rather than by reasoning.

---

## The report, verbatim

## Findings

### 1. CRITICAL — `#editSave` is reset to the old label "Save changes" on every real use, silently defeating the rename

- **File/line:** `index.html:1533` sets the static markup to `Save`. `js/app.js:14965`, inside `setEditMode()`, unconditionally runs `if(save)save.textContent='Save changes';`.
- **Mechanism:** `setEditMode()` is called from exactly one live site, `openMenuEdit()` (`js/app.js:14876`), which is the only way the edit-menu-item modal opens (`row.onclick=function(){ ... openMenuEdit(mid); }`, `js/app.js:14450`). The big comment block above `setEditMode` (14942–14956) documents that this modal *used to* have a second "orphan-plate" mode, and that branch is dead — but `setEditMode()` itself is not dead, it is the *only* mode's setup function, and it stomps the button text back to "Save changes" every single time a user opens the edit-item modal. There is no code path that ever leaves it at the new "Save" label in practice, because the first (and every) real interaction with this modal calls `setEditMode()`.
- **What breaks:** a user taps a dish on the Menu tab to edit its price/category → `openMenuEdit` → `setEditMode()` → button reads "Save changes", not "Save". The `index.html` edit and the `tests/verbs.test.js` table (`editSave: 'Save'`) are both true only of markup nobody ever sees once the modal is used.
- **Why nothing caught it:** `tests/verbs.test.js` reads static HTML only (`labelOf()` regexes `index.html`), never executes `js/app.js`. No other test in the repo touches `editSave`'s text or drives `openMenuEdit`/`setEditMode` (confirmed by grep across `tests/*.test.js` and `tests/visual/*.spec.js`, and by running the full suite — 2240/2240 pass with this bug present). This is exactly the trap the diff's own `kingModalSave` fix was written to avoid (dual-purpose commit button, static label), except it wasn't checked for the sibling case that already existed on this modal.
- **Verification:** read the call graph directly (`setEditMode` has one caller, `openMenuEdit` has one caller); confirmed no code between `setEditMode()` and `show('editModal')` resets the text back; confirmed no test exercises this path. High confidence — this is a direct read of unambiguous, unconditional code.

### 2. `kingModalSave` dual-purpose fix (item 2 in your list) — correct

- `isEdit` is computed once in `openKingModal` (`var isEdit=!!kingEditId;`) and reused for both the Remove button's visibility and the Save button's label (`js/app.js:6272-6273`), so the two cannot drift.
- `kingSyncSave()` (called immediately after) only toggles `.disabled` and calls `updateKingCat()`, which only touches `#king_cat`; neither touches `#kingModalSave`'s text. Verified by reading both functions.
- `saveKingModal`'s branch (`if(kingEditId){...} else {...}`) matches `isEdit` exactly.
- `openKingModal` is the only opener of this modal (confirmed by grep), so this runs on every path.
- This one is genuinely correct.

### 3. `tests/verbs.test.js` — real for the static-HTML assertions; weaker (source-grep) for the one dynamic assertion, and it happens to sit next to the bug it didn't catch

- The `labelOf()` regex correctly requires the literal `id="X"` with the closing quote, so no id-prefix bleed is possible; non-greedy `[\s\S]*?` correctly stops at each button/h3/a's own close tag for every id checked. Comment-stripping is applied before matching, avoiding the documented "prose vs code" grep trap.
- Empirically verified test #1 actually fails on a mutated label (flipped `mSave`'s text, test went red with the right diff, restored the file with `cp`, re-ran clean).
- The `Object.keys(TABLE).length === 23` check is accurate (counted independently) and not vacuous.
- However, the `kingModalSave` test (`'kingModalSave is dual-purpose...'`) asserts against **source text via regex** (`app.match(...)`, `assert.match(body, /isEdit\?'Save':'Add ingredient'/)`), not by executing `openKingModal` and reading the resulting DOM text. That means it would not catch a regression where the assignment is present in source but something *else*, added later, overwrites `kingModalSave.textContent` afterward — which is precisely the shape of the bug in Finding 1 (an assignment that's correct in isolation but is stomped by a sibling function later in the same code path). I manually verified no such stomp currently exists for `kingModalSave`, so this specific test isn't wrong today, but it's the same "grep the source instead of extracting and running the real function" weakness this codebase's own CLAUDE.md calls out repeatedly (roster items 172, 195). Minor/methodological, not a live defect.
- No vacuous assertions found in this file.

### 4. Playwright spec edits

- **`v143-dashboard.spec.js`** — `toBeCloseTo(x, 0)` on two `getBoundingClientRect()` floats. Precision 0 = tolerance of 0.5px (standard Jest/Playwright `toBeCloseTo` semantics). The comment's claim that a real regression would move the row by "tens of pixels" is consistent with what the assertion protects (revealing a text row/credit line). The MAINTENANCE.md entry says the tolerance was proved against a real regression case (44.5 vs 73), which is the right way to validate a loosened tolerance. No issue.
- **`fresh-states.spec.js`** — the comment claims "Playwright's `innerText()` on a hidden node returns the raw text, not the rendered text." I tested this directly against this repo's own Playwright/Chromium (v1.62.1): a `<button hidden>` with `display:none` (computed, confirmed via `getComputedStyle`, zero bounding rect) still returns its full text from both `page.locator(...).innerText()` and the raw DOM `element.innerText` getter in this engine. So the comment's technical claim is **true**, confirmed empirically rather than assumed — counter to the commonly-cited spec behavior, but correct for this toolchain. The assertion itself (`.toBe('Add plate')`) is therefore not a false-negative machine; it's honestly disclosed (in the same comment and in `docs/MAINTENANCE.md`) as not actually measuring rendering, which is accurate. No defect here, just an acknowledged, disclosed coverage gap.

### 5. Six cache-version spots — all agree

`index.html` (css link, js script tag), `sw.js` (`CACHE` const, both `ASSETS` entries), `js/app.js` (`APP_VERSION`) all read `v215`/`215`. `tests/settings.test.js`'s mirror check passes. Clean.

### 6. Minor/nits

- `js/app.js:15128` comment still says `"the mock's §3.6 'Upload invoice'"` — stale now that the button reads "Import invoice". Harmless (comment only), but it's exactly the kind of stale citation this repo's CLAUDE.md warns rots silently.
- Other Playwright specs (`v158-header-actions.spec.js`, `v191-control-rows.spec.js`, `214-empty-menu-action.spec.js`) still contain the string `"Existing plate"` in comments/assertion messages, but none of them assert the button's actual text — they check visibility/geometry/parent — so they don't break. Worth a pass eventually for prose accuracy, not a functional bug.

## Summary

One real, unguarded, user-facing regression: the diff changed `#editSave`'s static label to "Save" but left `setEditMode()` (the only setup function for the only live mode of the edit-menu-item modal) forcibly resetting it to "Save changes" on every open — so the rename never actually reaches the screen for this control, and nothing in the 2240-test suite (including the new `verbs.test.js`) exercises the runtime path to catch it. Everything else in the diff — the `kingModalSave` dual-purpose fix, the six cache-version spots, and the two Playwright tolerance/assertion edits — checked out correct on direct verification (including two points I confirmed empirically rather than by reasoning: the mutation-kill of the verb test, and the surprising-but-true `innerText()`-on-hidden-element behavior in this Chromium build).

---

## What was done about each

### Finding 1 — FIXED, and it is the batch's own regression

**Verified before touching anything**, per the rule that a finding's stated cause is a separate claim
from the finding: `setEditMode` has one caller, `openMenuEdit`, which is the only way the modal
opens, and the write is unconditional. Exactly as reported.

⚠️ **The sharpest part is that this is the SIBLING of the defect this batch existed to fix.** The
`kingModalSave` change was written because a dual-purpose commit button carried one static label. I
found that by counting verbs across all 103 buttons — and then did not ask the next question, which
is *what else writes a label at runtime*. A static-markup pass is exactly the change that cannot see
a runtime override, and I had just finished writing a test that reads static markup.

**The fix is not "set it to Save" — it is that a label has ONE OWNER.** All three `textContent`
writes in `setEditMode` are gone. Two of them wrote precisely what `index.html` already says ("Edit
menu item", "Menu item name *"), which is why the third looked like the others; they existed to
restore the labels for the first of two modes, and the second has been dead since v55. The markup
owns them now, and a mode needing different words would set them from its own branch — which is what
the dead mode actually did. Three locals became unused and went with them.

**Driven in a browser, which is the check that would have caught it:** open the real modal via
`openMenuEdit` and the button reads **"Save"**; title and name label are unchanged, confirming those
two writes were pure identity.

### Finding 3 — FIXED, and it is the same lesson one level up

The reviewer called the source-grep weakness "minor/methodological, not a live defect". It is the
methodology that let Finding 1 through, so it is treated as the finding.

`tests/verbs.test.js` now has a **runtime** half: it extracts the real `setEditMode` and runs it
against a fake document seeded with the shipped labels, so an override shows up as a CHANGE from the
markup. **Proved it catches the regression** by reintroducing the exact line — `actual: 'Save
changes'`, red.

The `kingModalSave` assertion keeps its source check (it is about the two answers coming from one
flag, which is a structural claim) and is backed by the browser drive recorded above.

### Finding 6 — FIXED, both parts

The `js/app.js` citation now names both the mock's word and the shipped one. The three specs'
`"Existing plate"` references are updated; the two remaining mentions are deliberate history
("the app said X from then until 262"), which is the one form that does not rot.

**Also corrected while there:** several of my own new comments said "261". This is batch **262**.

### Findings 2, 4, 5 — agreed, no action

Two were confirmed empirically by the reviewer rather than reasoned, which is worth recording: the
verb table's mutation-kill, and that `innerText()` on a hidden element really does return raw text in
this Chromium build — the claim my comment makes, checked against the actual toolchain rather than
against the spec.

**After the fixes: `npm test` 2241 pass / 0 fail; smoke green; `node -c` clean; Playwright re-run
clean.**
