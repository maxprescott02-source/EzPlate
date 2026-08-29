# REVIEW-217 — the empty-state title grammar

Reviewed-commit: 6f0302c
Model: Sonnet (the batch ran as Opus; the review is forced onto a different model, and was not shown the decision file or the queue item — it was asked to judge whether the code is CORRECT).

## Findings

**None.**

That is a complete report, and the file exists because a review that found nothing and a review that never ran are otherwise the same silence. The reviewer was pointed hard at five specific ways this change could be wrong, and each came back negative with evidence:

**1. A second render path for the same state.** Confirmed `renderManageMenusZero` (`js/app.js:8867`) is a genuinely different, separately-reachable surface — the "Add to menu" modal opened from a plate via `openManageMenus` — and not a duplicate of the Menu-tab empty state.

⚠️ **It did confirm the consequence I had already filed, and stated it more sharply than I had:** *"A user CAN see both strings for the same zero-menus state (Menu tab → 'Create your first menu'; then open a plate's 'Add to menu' modal → 'No menus yet.')."* Its judgement was that this is *"a documented tradeoff, not a bug"*, because the commit scopes itself explicitly to the six tab-level titles and `docs/MAINTENANCE.md` carries the honest note that the seventh surface now disagrees with the rule. **Recorded here rather than acted on because the copy is Max's** — he chose option A, which is one title.

**2. The new negative assertion is not vacuous.** `.not.toContain('this menu')` at `tests/visual/fresh-states.spec.js:1224`: `st.copy` is the `textContent` of the zero-menus node only, none of which contains "this menu", while the substring genuinely appears in the sibling variant "Nothing on this menu yet." (`js/app.js:11293`) — a real, reachable, different code path. **So it can fail on a real regression (copy-pasting the wrong empty-state string) and passes correctly today.** Neither a tautology nor always-true by construction.

**3. Every factual claim in the new comment block checks out.** All six titles and their action counts verified against the live call sites: Products/two buttons (`:4082`), Ingredients/one (`:4339`), Plates/one (`:8590`), Menu-none/one (`:11290`), Menu-empty/zero plus a "Plates tab" body (`:11293`), Dig-in/zero (`:5574`). This mattered most — a confidently-wrong comment is treated as worse than no comment here, and the block asserts six things.

**4. Cache version.** All six spots at v177, confirmed by direct grep and by the pre-existing `tests/settings.test.js` pair, which between them cover 1 + 5 = all six despite the split naming.

**5. Nothing else depends on the old string.** The only other hits are unrelated: comments in `tests/onboarding-zero.test.js` explaining `renderManageMenus`'s repaint obligation, and an "All menus" scope-selector string in two other specs.

It also confirmed the change sits well outside the protected parser region (anchors at `:9552` and `:9802`; edits at `:3943-3968` and `:11290`) — worth noting given AUDIT-v176 found that region edited without a record one batch earlier.

## What I checked myself, before and independently of the review

- Reverted the title and ran the owning Playwright test: **both viewports go red** on `expect(st.copy).toContain('Create your first menu')`. The first attempt at this used `-g "menu header structure"` and matched a *different* test that passed — the assertion lives in *"a fresh install has NO menus"*, and a green run against the wrong test would have proved nothing.
- Grepped for the old string across `js/`, `tests/`, `docs/`, `index.html` and `css/` before changing it, per `CLAUDE.md`'s rule that a change altering a precondition a screen's specs were written against needs the specs grepped and Playwright run locally.
- Verified all six titles and the Products two-button claim by hand before writing them into the comment.

Suite 1700/1700 · smoke green · 848 mutants, 23 survivors all with written allowances · Playwright 385 passed.
