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
 * ⚠️ THE CAUSE IS UNTESTABLE HERE AND THE WIRING IS NOT, AND THE FIRST DRAFT OF
 * THIS FILE TREATED THEM AS ONE. No browser this project can automate has a soft
 * keyboard, so iOS panning the visual viewport cannot be reproduced — but the
 * subscription is just a function that registers listeners, and a fake window
 * with a recording addEventListener runs it and proves each handler reaches
 * `reanchorOpenLayers`. A regex proves only that a string sits in a file.
 * Whether it fixes his screen is still on the phone list.
 * ------------------------------------------------------------------------- */
const APP = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
const APP_CODE = APP.replace(/\/\*[\s\S]*?\*\//g, '');

/* ⚠️ THIS RUNS THE SUBSCRIPTION RATHER THAN GREPPING IT, AND THE FIRST DRAFT ONLY GREPPED IT.
   The pre-push review made the distinction that matters: the CAUSE (iOS panning the visual viewport
   for a keyboard) genuinely cannot be reproduced in any browser this project can automate — but the
   WIRING can. A fake window with a recording `addEventListener` proves the handler is registered AND
   that invoking it reaches `reanchorOpenLayers`; a regex only ever proves a string is in a file.
   The file said "no soft keyboard, so this must be a source assertion", which conflated the two, and
   only the first half was true. Roster 167/172/195 is exactly that conflation. */
function runSubscription() {
  const block = /\(function\(\)\{\s*window\.addEventListener\('resize',reanchorOpenLayers\)[\s\S]*?\}\)\(\);/.exec(APP_CODE);
  assert.ok(block, 'the re-anchor subscription block must still be findable — if it moved, update this test');
  const calls = [];
  const win = {
    addEventListener: (type, fn, capture) => calls.push({ on: 'window', type, fn, capture: !!capture }),
    visualViewport: {
      addEventListener: (type, fn) => calls.push({ on: 'visualViewport', type, fn })
    }
  };
  let ran = 0;
  // eslint-disable-next-line no-new-func
  new Function('window', 'reanchorOpenLayers', block[0])(win, () => { ran++; });
  return { calls, ran: () => ran };
}

test('⚠️ open layers re-anchor on visualViewport, not just on resize and scroll', () => {
  const { calls } = runSubscription();
  const on = (o, t) => calls.find((c) => c.on === o && c.type === t);

  assert.ok(on('window', 'resize'), 'a desktop window resize');
  const sc = on('window', 'scroll');
  assert.ok(sc && sc.capture === true, 'capture-phase, so a scrolling modal body is caught too');

  assert.ok(on('visualViewport', 'resize'),
    'the ONLY event source an iOS keyboard produces — window.innerHeight does not shrink for it');
  assert.ok(on('visualViewport', 'scroll'),
    'and the pan iOS uses to reveal a focused field, which fires no window scroll at all');
});

test('⚠️ every registered handler actually reaches reanchorOpenLayers', () => {
  /* The half a regex cannot see. A subscription that registers four listeners pointing at the wrong
     function, or at a stale copy, matches the same source text and is completely broken. */
  const { calls, ran } = runSubscription();
  assert.equal(calls.length, 4, 'four subscriptions: window resize + scroll, visualViewport resize + scroll');
  calls.forEach((c) => c.fn());
  assert.equal(ran(), 4, 'each one re-anchors');
});

test('the subscription survives a browser with no visualViewport, and registers the other two', () => {
  /* jsdom and older Safari have none. A bare subscription would throw at boot and take the rest of
     the file's top-level initialisation with it. */
  const block = /\(function\(\)\{\s*window\.addEventListener\('resize',reanchorOpenLayers\)[\s\S]*?\}\)\(\);/.exec(APP_CODE);
  const calls = [];
  const win = { addEventListener: (type, fn) => calls.push(type) };   // no visualViewport at all
  assert.doesNotThrow(() => {
    // eslint-disable-next-line no-new-func
    new Function('window', 'reanchorOpenLayers', block[0])(win, () => {});
  });
  assert.deepEqual(calls, ['resize', 'scroll'], 'the two it can register, and no attempt at the others');
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


