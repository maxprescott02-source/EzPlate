# HANDOVER - 135 (dashboard scope dropdown)

**Branch:** `feature/dash-scope-dropdown` (PR #102) · **Scope:** the queue item "Dashboard scope chips → one simple dropdown" (Max's reversal of Q2's chips, 9 Aug 2026). Shipped **`ezplate-v129`**.

## What changed
- The v120 scope chips and their ≤5/6+ collapse rule are gone; one button right of the verdict ("All menus 21.7 ▾") now opens the ranked popover.
- The popover leads with a selectable All-menus row, then every costed menu worst-first; uncosted menus stay excluded; sparklines and the `.mcmp-row`/`data-scope` delegate are unchanged.
- The button and every popover figure carry the v115 anchor-to-target colour pair (good at or under target, bad over); the mock's third amber tier was deliberately not taken because one control does not fork the dashboard's binary colour language.
- Picking a scope closes the dropdown; outside click and Escape dismiss it; Escape and pick return focus to the rebuilt button.
- The honesty note ("cost efficiency, not earnings") moved inside the popover, with the ranking it qualifies; the always-visible surface no longer ranks anything, so it carries no note.
- 44px touch floor holds below 1024px on the button and every row, spec-measured.
- Tests: `dash-chips.test.js` retired with the chips, `dash-dropdown.test.js` replaces it; 805 unit, 111 Playwright, both green.

## Into CLAUDE.md
Nothing.

## New docs/QUEUE.md items
None. The one open question (the doubled figure) went to `docs/PHONE.md` because it is a device taste call, not buildable work.

## New docs/PHONE.md items
- v129: the verdict figure and the dropdown button state the same number in the same colour a few centimetres apart; judge on the phone whether that reads as confirmation or clutter. Failure: it reads as the same stat twice for no reason, in which case the button drops its figure.
- v129: tap the button, pick a menu, tap elsewhere; failure is the popover ignoring the outside tap or re-opening itself after a tab switch.

## Probe
**What did the brief or queue item tell you to do that you would have done differently?** The item said the button "opens the existing ranked disclosure", and the word "existing" underplayed what changed: the disclosure was previously a tail-overflow for 6+ menus and had never been the whole control, so it had none of the obligations of one (dismissal, focus return, an All-menus row). The pre-push review's major finding was exactly that gap, so building it as "reuse the disclosure" without re-deriving its contract was the wrong frame and cost a fix round.
**What did you not propose because it was out of scope?** Unifying this popover with the shared `anchorDrop` placement engine; the queued "Floating layers and mobile dropdowns" item owns that. Also `aria-controls` on the button: the popover has no id and is absent from the DOM when closed, so the reference would be broken most of the time; recorded at the code instead.

## Surprises
- The review found the chips' hover had been a silent no-op in light theme for two versions: `--field` equals `--surface` there, so `hover{background:var(--field)}` painted nothing. The new button uses `--hover`.
- The popover row padding rule shipped in v120 was dead on arrival: `#dashBody .mcmp-row` (1,1,0) out-specifies `.dash-menus-pop .mcmp-row` (0,2,0), so the override never applied. Replaced with an id-qualified rule that actually wins.
- Chrome on macOS would not resize below ~1400px for the manual 380px drive; the mobile check rode the Playwright screenshots instead, which capture the open popover at 380px in both themes.
