/*
 * safe-area-inset.test.js — the safe-area inset is counted ONCE per stacked bar.
 *
 * WHAT WENT WRONG, on Max's phone, 11 Sep 2026, found by the phone list's own check 3 and reported
 * with a screenshot. The builder's sticky summary bar (`.bld-bar`, which holds SAVE) docks above the
 * tab bar with `bottom: var(--bottomnav-h)`. It used to read:
 *
 *     bottom: calc(var(--bottomnav-h, 64px) + env(safe-area-inset-bottom))
 *
 * `--bottomnav-h` is published by `js/app.js` from `.bottomnav`'s `getBoundingClientRect().height`,
 * and `.bottomnav` sets `padding-bottom:env(safe-area-inset-bottom)` on ITSELF — so the measured
 * height ALREADY CONTAINS the inset, and the `calc` added it a second time. On a phone with a home
 * indicator that is about 34px, so the bar floated one whole inset above the tab bar with the page
 * scrolling through the transparent band between them.
 *
 * ⚠️ WHY THIS IS A SOURCE ASSERTION AND NOT A RENDERED ONE, WHICH IS THE PART WORTH READING.
 * `env(safe-area-inset-bottom)` is **0 in every browser this project can automate** — headless
 * Chromium, a desktop window, a Playwright device emulation. At 0 the wrong expression and the right
 * one compute to the SAME NUMBER, so no measurement of the rendered page can tell them apart. A
 * Playwright test asserting "the bar's bottom edge meets the nav's top edge" passes identically
 * before and after the fix. There is no value to inject either: `env()` is set by the user agent and
 * cannot be overridden from CSS or from script.
 * So the only thing that CAN be checked here is the expression itself, and this file says so rather
 * than pretending to more. `CLAUDE.md`'s roster is explicit that grepping source is a weak check —
 * it is used here because the alternative is no check at all, and because the defect is a
 * double-count that is visible in the text and invisible everywhere else.
 *
 * ⚠️ AND THE GENERAL RULE, which is why this file is named for the INSET rather than for the bar:
 * **an element stacked above another element that already pads for the inset must not add the inset
 * again.** Any future bar docked above `.bottomnav` — a second toast rail, an undo bar, anything —
 * has this same trap waiting, and it will look correct on every machine anyone develops on.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const CSS = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');

/* Strip comments before searching. The block above quotes the defective expression verbatim, and
   without this the test would find its own explanation and fail — roster entry 183(a), which is
   about exactly this: a grep over a source file searches PROSE as well as CODE, and here the prose
   is this very rule being described. */
const CODE = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

function declOf(selector, prop) {
  const rule = new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`).exec(CODE);
  assert.ok(rule, `${selector} must exist in the stylesheet — if it was renamed, update this test rather than deleting it`);
  const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:([^;]*)`).exec(rule[1]);
  assert.ok(m, `${selector} must declare ${prop}`);
  return m[1].trim();
}

test('.bottomnav is the element that pads for the inset', () => {
  /* The premise the rest of this file rests on. If the padding ever moves off `.bottomnav`, then
     `--bottomnav-h` stops carrying the inset and the bar above it has to add it back — so this
     assertion failing is the signal to re-read the whole file, not to delete a line. */
  const pad = declOf('.bottomnav', 'padding-bottom');
  assert.match(pad, /env\(\s*safe-area-inset-bottom/,
    '.bottomnav pads for the home indicator itself, which is what puts the inset inside --bottomnav-h');
});

test('⚠️ .bld-bar docks on --bottomnav-h and does NOT add the inset again', () => {
  const bottom = declOf('.bld-bar', 'bottom');
  assert.match(bottom, /var\(\s*--bottomnav-h/,
    'the bar docks on the MEASURED nav height, not on a guess');

  /* The fallback is allowed to add the inset and must: `64px` is a guess at the bar's height that
     does not include one, so the pre-publish state needs what the measured value already carries.
     So the check is not "no env() anywhere" — it is "no env() added to the var". */
  const withoutFallback = bottom.replace(/var\(\s*--bottomnav-h\s*,[\s\S]*?\)/, 'VAR');
  assert.doesNotMatch(withoutFallback, /env\(\s*safe-area-inset-bottom/,
    'the inset is already inside --bottomnav-h (see .bottomnav above) — adding it here docks the bar '
    + 'one home-indicator too high, with the page showing through the gap. Invisible on every desktop '
    + 'browser, because env() is 0 there.');
});

test('the check can fail — the defective expression is rejected', () => {
  /* Roster 195 and 205: prove the assertion is capable of failing, because a source check that
     matches nothing passes forever and reads exactly like a passing one. */
  const bad = 'calc(var(--bottomnav-h, 64px) + env(safe-area-inset-bottom))';
  const stripped = bad.replace(/var\(\s*--bottomnav-h\s*,[\s\S]*?\)/, 'VAR');
  assert.match(stripped, /env\(\s*safe-area-inset-bottom/,
    'the shipped-until-11-Sep expression must be caught by the rule above');

  const good = 'var(--bottomnav-h, calc(64px + env(safe-area-inset-bottom)))';
  const strippedGood = good.replace(/var\(\s*--bottomnav-h\s*,[\s\S]*?\)/, 'VAR');
  assert.doesNotMatch(strippedGood, /env\(\s*safe-area-inset-bottom/,
    'and an inset INSIDE the fallback must not be mistaken for one added to the var');
});

/* ---------------------------------------------------------------------------
 * The other half of the same phone report: a floating layer must follow its
 * field when the KEYBOARD moves it.
 *
 * Max, 11 Sep 2026, check 3: the ingredient list ends up over the text he just
 * typed. `anchorDrop` places the list 4px BELOW the field's bottom edge and gets
 * that right — but it does so ONCE, at open time, and then the field moves.
 *
 * ⚠️ `resize` AND `scroll` BOTH MISS THE KEYBOARD, which is why this is here.
 * `window.innerHeight` does not shrink for an iOS keyboard (recorded in
 * docs/PHONE.md since batch 212), so no `resize`; and when iOS reveals a focused
 * field by panning the VISUAL viewport rather than scrolling the document, no
 * `scroll` either. Both listeners existed and neither could fire.
 *
 * ⚠️ THIS IS A SOURCE ASSERTION FOR THE SAME REASON AS THE ONES ABOVE, and the
 * reason is worth repeating rather than cross-referencing: no browser this
 * project can automate has a soft keyboard, so the CAUSE cannot be reproduced in
 * any harness here. What is checkable is that the app subscribes to the only API
 * that reports it. Whether it actually fixes his screen is on the phone list.
 * ------------------------------------------------------------------------- */
const APP = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
const APP_CODE = APP.replace(/\/\*[\s\S]*?\*\//g, '');

test('⚠️ open layers re-anchor on visualViewport, not just on resize and scroll', () => {
  const block = /window\.addEventListener\('resize',reanchorOpenLayers\)[\s\S]{0,900}?\}\)\(\);/.exec(APP_CODE);
  assert.ok(block, 'the re-anchor subscription block must still be findable — if it moved, update this test');
  const src = block[0];

  assert.match(src, /window\.addEventListener\('scroll',reanchorOpenLayers,true\)/,
    'the capture-phase scroll listener catches a scrolling modal body');
  assert.match(src, /visualViewport/,
    'the ONLY event source an iOS keyboard produces — without it a layer anchored at open time never '
    + 'follows the field the keyboard pushed away from under it');
  assert.match(src, /vv\.addEventListener\('resize',reanchorOpenLayers\)/);
  assert.match(src, /vv\.addEventListener\('scroll',reanchorOpenLayers\)/);
});

test('⚠️ it does not READ visualViewport.height, which is the part deliberately not done', () => {
  /* docs/PHONE.md declined to clamp the dropdown's height to visualViewport.height blind, because
     that number also moves when the page is pinch-zoomed and guessing which of the two a phone is
     doing is how this gets worse. Re-anchoring needs no such guess — it recomputes from the field's
     current rect. This asserts the restraint, so a future batch reaching for the height has to come
     here and argue with the reasoning rather than quietly widening the change. */
  assert.doesNotMatch(APP_CODE, /visualViewport\s*\.\s*height/,
    'if you are adding this deliberately, delete the assertion and say why in docs/PHONE.md');
});

test('the visualViewport subscription is guarded for browsers without it', () => {
  const block = /var vv=[\s\S]{0,400}?\}\)\(\);/.exec(APP_CODE);
  assert.ok(block, 'the guard must be findable');
  assert.match(block[0], /if\(vv && typeof vv\.addEventListener==='function'\)/,
    'jsdom and older Safari have no visualViewport; a bare subscription would throw at boot');
});
