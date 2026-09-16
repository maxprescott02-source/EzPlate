# REVIEW - 275 (toast-bottom-stack)

Reviewed-commit: 9dbb06c82eb2d36ceaa489f43498188e137f2930

**Agent:** the `code-review` agent, on **Sonnet**, overriding the definition's `opus` pin because this batch ran on Opus.
`CLAUDE.md` requires the reviewer to be a different model from the batch, and only the batch knows which model it is.
It was given `git diff main...HEAD` and nothing about the queue item, and it checked out the branch and drove the app in Playwright rather than reading only the diff.

**Outcome:** one Major finding, reproduced by the reviewer and reproduced again here before it was fixed.
Fixed in this branch (`window.addEventListener('resize', publishSheetFootClear)`), with a regression test that goes red when the listener is removed.

---

## The report, verbatim

## Review: `fix/toast-bottom-stack-clearance` vs `main`

Unit suite (2376 tests) and the full `tests/visual/226-bottom-stack.spec.js` (21 Playwright tests) both pass. I also traced every ordering/staleness path called out in the prompt and reproduced one real defect that neither suite catches.

### Finding — `publishSheetFootClear` has no resize/orientation recovery path, unlike its two siblings (Major, verified)

`publishBldBarClear` is republished by a `ResizeObserver` (with a `window.resize` fallback) and again on `window.load`, so a stale `--bld-bar-clear` cannot survive a breakpoint crossing — the code's own comment explains this is deliberate ("PUBLISH 0, NEVER SKIP... a stale clearance... floats the toast a third of the way up an empty screen"). `publishClear` (the install banner) has the same protection via its own `ResizeObserver`.

`publishSheetFootClear` has **no such listener at all**. It is only called from `openOverlay` and `closeOverlay` (`js/app.js:11294`, `:11318`). If the viewport width changes *while an overlay stays open* — crossing the `max-width:767px` / `min-width:768px` boundary that `.modal-overlay{align-items:flex-end}` depends on (`css/style.css:5324` vs `:5306`) — `--sheet-foot-clear` keeps whatever it was published as under the old layout, because nothing ever re-reads it.

**Reproduced in a real Chromium instance (Playwright):**
1. 380×800 viewport, open `#delChoiceModal` (the 127px stacked footer). `--sheet-foot-clear` → `127px`.
2. Resize the page to 1024×800 (crosses 768; the dialog is now a centred dialog, `align-items` becomes `flex-start`, the footer is nowhere near the floor).
3. `--sheet-foot-clear` is **still `127px`**. Raising the toast puts it at `bottom:139px` instead of the correct `92px` — floated for no reason on a screen where the dialog's footer sits mid-page, not at the viewport floor.

This is exactly the failure class the diff's own comments treat as the important half of the fix for the other two publishers ("a stale clearance... reads as a design choice, not a bug"), but the third publisher was left without the guard. It doesn't hide a control (cosmetic misplacement only, confirmed by the geometry captured), so I'm not calling it critical — but it is a real, reproducible violation of the invariant the PR states it is establishing, and it's the one publisher of three where the omission is silent.

Exposure for this app's actual usage (one intermittent phone user) is narrower than it would be for a desktop-heavy app — the trigger needs a width change while a modal stays open (desktop window resize, or tablet rotation across ~768px) — but it is a genuine gap, not a theoretical one.

### Things I checked and found correct (stated so as not to be re-litigated)

- **Ordering in the install-banner `show()`/`hide()`**: `publishClear()` (sets `--install-banner-clear`) runs, then the `has-install-banner` class is added, then `publishBldBarClear()` reads the bar's now-class-affected `bottom` — correct order in both directions. `hide()` removes the class, removes the inline `--install-banner-clear` property, then republishes the bar. Verified against the CSS selector `html.has-install-banner .bld-bar{bottom:var(--install-banner-clear)}`.
- **`renderBuilderCost`'s new `publishBldBarClear()` call**: sits inside the `if(foot&&footFigs&&footLine)` guard, runs after `foot.hidden` is set either way, so the empty-docket (`hidden=true`) case correctly measures 0 height and publishes `0px`.
- **The `sheetUp` transform-cancellation claim** (`modal.bottom - foot.top` is invariant to the `translateY(24px)→0` animation because both sides move together): verified directly — reading `--sheet-foot-clear` synchronously at animation start (t=0) versus after the animation has fully settled produced the identical value (`127px` both times) in real Chromium. The reasoning in the comment holds.
- **`openOverlay`/`closeOverlay` class-vs-publish ordering**: `.open` is added before `publishSheetFootClear()` runs in `openOverlay`; `.open` is removed before it runs in `closeOverlay` — both correct, and stacking (deepest footer wins, from either order) is correctly computed and tested.
- **Six cache-version spots** all agree at `224` (`index.html` ×2, `sw.js` `CACHE` + both `ASSETS` entries, `js/app.js` `APP_VERSION`).
- **`loadPlate`'s toast deletion**: no other test or call site depended on the "Loaded: …" toast; `openHealedPlate` (the sibling that must still toast) calls `loadPlateState` directly rather than `loadPlate`, so it's unaffected — matches the new test's own two-opener pair.
- **Mutation-gate allowance for `c>clear` vs `c>=clear`**: the stated equivalence-by-construction (both operators store the same value at a tie) is correct; the ordering behaviour it protects is independently pinned by the "stacked, both orders" assertions.
- No naming-inversion renames, no duplicate top-level declarations, no row-boundary or Supabase-write changes in this diff — it's client CSS/JS + docs only.

### Not a finding, just noted

`docs/STATE.json` still shows `"batch": 274` while every code comment in this diff is stamped `275`; no `HANDOVER-275-*.md` exists yet. That's consistent with the review running before the handover step (`STATE.json` is rewritten in the same commit as the handover per `CLAUDE.md`), not a defect in the diff itself.

---

## Decisions

### Finding 1 — FIXED. Confirmed first, by running its own repro.

`CLAUDE.md` requires a finding's repro to be run before its remedy is applied, and both to be run in both directions.
Reproduced at 380 -> 1024 with `#delChoiceModal` open: `align-items` flex-end -> flex-start, `--sheet-foot-clear` **still `127px`**, toast **still `139px`**.
Exactly what the report describes, including the numbers.

The fix is one line, `window.addEventListener('resize', publishSheetFootClear)`, and after it the same repro gives `0px` / `92px` at 1024.

**Two things about the remedy that were decided rather than copied from the finding.**
The report frames the gap as a missing *ResizeObserver*, by analogy with the two siblings.
An observer is the wrong instrument here: the thing that changes is the **viewport crossing 767**, not any one overlay's size, and there are twenty overlays that come and go - so it would mean observing a changing set to detect a fact about the window.
One `window.resize` listener is the smaller mechanism. It is registered unconditionally, unlike `publishNavH`'s, because there is no observer here for it to be the fallback to.

**And the regression test asserts BOTH directions, which the finding did not ask for.**
The widen is the direction the reviewer measured and it is the *cosmetic* one - a toast floating with nothing under it.
The **narrow back** is the direction that matters: a toast returning to the delete-choice dialog's buttons, which is the defect this whole batch exists to remove, reintroduced by its own fix.
`tests/visual/226-bottom-stack.spec.js` walks 380 -> 1024 -> 380 with the sheet open throughout and asserts all three states; deleting the listener turns it red.

### The "not a finding" note — correct, and it was already true when the review ran.

`docs/STATE.json` is rewritten by `node tools/state.js` in the handover commit, which is the step after this one.
Its `deploy_version` was already at 224 in the reviewed commit; `batch` moves when the handover lands.

### Everything in "things I checked" — no action, and that is the point of it being written down.

The `sheetUp` transform-cancellation claim is the one worth naming: the comment at the site argues that `modal.bottom - foot.top` is invariant to the open animation, and the reviewer **measured it at t=0 and at settle rather than accepting the argument**.
That is the check this repo wants against a comment that states an observation and then reassures you about it.
