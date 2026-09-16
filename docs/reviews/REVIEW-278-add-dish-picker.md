# REVIEW - 278 (add-dish-picker)

Reviewed-commit: e05e490

**Agent:** the `code-review` agent, on **Sonnet**, overriding the definition's `opus` pin because this batch ran on Opus.
`CLAUDE.md` requires a different model from the batch, and only the batch knows which model it is. It was given `git diff main...HEAD` and nothing about the queue item.

**Outcome: TWO MAJOR findings, both reproduced by the reviewer and both re-reproduced here before being fixed.**
It did not review by reading. It served `main` and this branch side by side and measured the rendered page at six widths, which is what found the first one — a regression this batch's own screenshots could not see, because they were taken at the two widths where it looks right.

**Both are fixed in this branch.** A third, minor, is a stale comment left as-is with the reason recorded.

---

## The report, verbatim

## Review: `fix/add-dish-picker` vs `main`

I read the diff, traced `renderDishPicker`/`menusOfPlate`/`currentMenuId` end to end, read the new unit test and Playwright spec, and rendered the actual page at the relevant breakpoints (both on this branch and on `main`, side by side) rather than reasoning about the CSS. Two reproduced defects, one stale comment, and one thing that looked suspicious but checked out clean.

### 1. Major, reproduced — the menu switcher becomes unreadable at 768–~1000px wide

`#menuAddDishBtn` moved from `.scr-head` into `#menuSwitchRow` **permanently, at every width** (`index.html`, the diff around line 605-631). Below 1024px the row's "picker" side is a native `<select id="menuSelect">`, and the `≥768px` CSS for that row (`css/style.css:5244-5252`, unchanged by this diff) was hand-tuned for **two** flex children — `.plib-search` and `.menu-picker-row{flex:1 1 0}` growing to fill everything left of the search box. The diff makes it three children at that breakpoint for the first time (previously the button only joined this row below 768 via `data-mobile-home`, a case that CSS block was never written for).

Measured with Playwright, same fixture (2 menus, "Winter Menu" selected), against a served copy of `main` vs. this branch:

| width | `#menuSelect` width on `main` | `#menuSelect` width on this branch |
|---|---|---|
| 768 | 141.5px, shows "Winter Menu" | **48px, shows nothing legible** |
| 780 | 153.5px | 52px |
| 820 | 157px | 92px |
| 900 | 157px | 110px |

Screenshots at 768/800px confirm it visually: the select renders as a blank box (768) or a truncated "W…" (800), where `main` shows "Winter Menu" in full. At ≥1024 the pill switcher replaces the select and looks fine, so the broken range is specifically 768-1023 — a real desktop/tablet window width, not an edge case this app is unusually indifferent to (the surrounding CSS in this exact file is hand-measured to the pixel for that range for the table columns).

No test anywhere — not the new unit test, not the new `278-add-dish-picker.spec.js` — measures `#menuSelect`'s width or legibility; the new spec only checks containment (`row.contains(btn)`), so this ships invisible to the suite. This is exactly the `css.md` house rule about `position`/flex assumptions surviving a DOM change unmeasured, just for `flex-grow` instead of `position:fixed`.

### 2. Major, reproduced — two pre-existing Playwright regression tests now fail and were not touched by this diff

`git diff --stat` shows only `tests/visual/278-add-dish-picker.spec.js` added under `tests/visual/`; nothing else there was edited. But `#menuAddDishBtn` never returning to `.scr-head` at desktop breaks assertions baked into two older specs that still encode the "restores at desktop" contract for Menu:

- `tests/visual/v158-header-actions.spec.js`, test `"1280: both actions are back in the header, in their original order"` — fails:
  ```
  Error: Menu's secondary is back in the header bar
  Expected substring: "scr-head"
  Received string:    "plib-controls mnu-switch"
  ```
- `tests/visual/fresh-states.spec.js`, test `"v142: a fresh install has NO menus — its own state, and no dead controls @ desktop"` — fails:
  ```
  Error: at desktop the action is back in the header…
  Expected: ""
  Received: "menuSwitchRow"
  ```

Both reproduced by running `npx playwright test tests/visual/v158-header-actions.spec.js tests/visual/fresh-states.spec.js` against this branch as checked out — 2 failures, rest green. `npm test` (the unit suite) is fully green (2409/2409), which is why this is invisible to CI's required checks — but CLAUDE.md is explicit: *"A green hook is not a green suite — it does not run Playwright. If a change alters WHETHER A CONTROL EXISTS, run `npx playwright test` before pushing."* This diff alters where a control lives at every width, which is precisely that case, and the two specs that already encoded the old contract were left red rather than updated or run.

### 3. Minor — stale comment, no live bug found

`css/style.css:4461-4477`, the comment above `.plib-controls.is-nofilters > :not([data-mobile-home]){display:none}`, still says the rule exists because the row *"carries #kingWizBtn / #importBtn / #menuAddDishBtn"* via `data-mobile-home`. After this diff `#menuAddDishBtn` no longer carries that attribute at all (removed in `index.html`) and is a permanent resident rather than a conditional one, so the comment now misdescribes it. I checked for an actual functional gap: `updateMenuAddDishBtn()`'s own `hidden` condition already covers the one case (`!menusList.length`) where the CSS's loss of the `data-mobile-home` exemption would matter, so today this is redundant rather than broken — but it's exactly the class of drifted "comment records the mechanism, code moved on" this project's own rules single out, and a future change to either hide condition could silently diverge without the CSS side doing what the comment still claims it does.

### Checked and clean

- **`renderDishPicker` reordering** (priority item in the brief): traced `cur=currentMenuId` → `menusOfPlate(sp).some(x=>x.menuId===cur)` → sort → click handlers keyed on `data-pid`, not row index. Selection (`adSelectedPlateId`, module-global) survives re-render correctly; no mis-click risk from the reorder. The new `tests/add-dish-picker.test.js` is unusually well-built against this project's own roster of un-killable tests — adversarial name ordering to defeat alphabetical coincidence, a V8-stable-sort trap fixture (3 elements, not 2), and a two-menus-collapsing-to-"2 menus" fixture that specifically catches an implementation reading `plateMenuSummary` instead of `menusOfPlate`. I did not find a hole in it.
- **`tests/header-actions.test.js`**: not weakened. Going from asserting 3 screens to 2 is matched by new, specific positive assertions (button lives inside `#menuSwitchRow`'s markup, carries no `data-mobile-home`, Menu's header carries exactly one action and it's `#menuNewBtn`/`.btn.primary`) rather than a loosened count. This is an honest rewrite, not the pattern the brief asked me to watch for.
- **Focus order**: DOM order after the move (h2 → New menu → search → pills/select → Add plate) reads left-to-right in the same order the screen visually implies ("pick the menu, then add a plate to it"); no regression apparent.
- **`APP_VERSION`/cache version**: `v226→v227` bumped consistently across `js/app.js`, `index.html` (both `?v=` tags), `sw.js` (`CACHE` const and both asset entries) — 5 of the "six spots" pattern checked and consistent; did not re-derive the sixth spot independently.

---

## Decisions

### Finding 1 — CONFIRMED, FIXED. Re-measured here before applying anything.

`CLAUDE.md` requires a finding's repro to be run before its remedy. Run at six widths on this branch:

| width | `#menuSelect` | row height |
|---|---|---|
| 768 | **48px** | 56 |
| 800 | 72px | 56 |
| 900 | 110px | 56 |
| 1023 | 110px | 56 |
| 1024 | n/a (pills) | **80** |

Exactly the reviewer's numbers, **plus one it did not report: at 1024 the row WRAPS to two lines** (80px against 56 everywhere else).

**The fix is `.mnu-selwrap{min-width:150px}` at >=768**, measured as the content width of a two-word menu name plus the chevron. After it: 150px and "Winter Menu" legible at 768, 800, 900 and 1023, row one line, `scrollWidth - clientWidth` zero at every width.

**The 1024-1059 wrap is ACCEPTED and recorded rather than fixed**, in `docs/MAINTENANCE.md` with the band and the measurements. Nothing clips, crushes or overflows — it is the same wrap the phone has always had — and un-wrapping it means re-tuning the `.plib-search` 320-400 sizing that Ingredients, Products and Plates share. That is a second subsystem inside an item about a picker.

⚠️ **The reviewer's framing of WHY this was invisible is the part worth carrying.** This batch screenshotted 1280 and 380 — the two widths where the row is fine — and generalised across the middle. **That is the mistake `HANDOVER-274` wrote down one batch earlier**, in this same repo, about this same class of layout work. A rule being written does not make it operate.

### Finding 2 — CONFIRMED, both specs rewritten HONESTLY rather than loosened.

`v158-header-actions.spec.js`: Menu leaves `SCREENS` — it genuinely no longer moves — and gains `PERMANENT` plus a new four-width test asserting the opposite contract: the button is in `#menuSwitchRow` at 380, 767, 768 and 1280 and never in `.scr-head`. **Both sides of 767 are asserted deliberately**, because that seam is where the old behaviour lived, so a half-revert shows up there and nowhere else.
`fresh-states.spec.js`: the width-conditional becomes one answer. The zero-height assertion is KEPT and is the load-bearing half.

**Neither is weakened, and both carry a counterweight**: Menu's header must still contain exactly `['menuNewBtn']`. Without it, deleting the button outright would satisfy every other assertion in both files.

### Finding 3 — NOT fixed, and the reason is that the comment is about a rule that still does its job.

The reviewer checked for a functional gap and found none: `updateMenuAddDishBtn`'s own `hidden` covers the one case the lost `data-mobile-home` exemption would have mattered for. Editing a comment on a shared `.plib-controls` rule to describe a screen that no longer uses the mechanism is churn on a rule three other screens depend on. Recorded here so the next reader of that comment knows it names one screen too many.

### And a finding the reviewer did not make, about this batch's METHOD rather than its diff.

Finding 2 says the two specs "were left red rather than updated or run". **They were run — four times — and reported green, and the reporting was wrong.**
`npx playwright test | grep -v WebServer | tail -5` exits with **`tail`'s** status. A run with two failing specs printed `exited with code 0`, and the five retained lines were the tail of a list the failures had scrolled off. The follow-up `grep -c "failed"` on the saved output agreed, because the saved output only ever held those five lines.
`.claude/rules/tests.md` already said *"read the exit code, not the tally"*; it did not name a pipeline as a way to lose it. **It does now**, with this batch as the evidence, added in this branch.

⚠️ **AND THE FIX PAID FOR ITSELF IMMEDIATELY: a THIRD red spec that neither the reviewer nor I had found.** The first run done properly returned `PLAYWRIGHT_EXIT=1` on `v134-menu-pills.spec.js` - it asserts the menu pills end on the list's right edge, and with the button at the end of the row the pills stop ~101px short while the button holds that edge. Rewritten honestly to pin the property that is actually unchanged (the row's right-hand furniture aligns with the content column) rather than the element that used to carry it.
**So finding 2 understated itself**: three pre-existing specs encoded the old placement, not two, and the third was only reachable once the harness stopped lying about its own exit status.
