/*
 * toast-bottom-stack.test.js — 275 (queue item 50) and 276 (queue item 97).
 *
 * THE BOTTOM STACK IS A CHAIN, AND THE TOAST IS AT THE TOP OF IT.
 * 226 built the publish/read pattern for the install banner and its own comment stated the rule in
 * general terms ("the element that owns it publishes it; nothing that reads it may know a number").
 * It built one publisher because the banner was the only element anyone had measured. 275 added the
 * builder's sticky summary bar, which carries SAVE, and an open bottom sheet's footer, which
 * carries the commit verb, and deleted the "Loaded: <plate>" toast that was firing on top of them.
 * 276 added the fourth, the sync pill, and turned the flat list into a CHAIN: the bar lifts the
 * pill (§H's corner rule reads `--bld-bar-clear`), and the pill lifts the toast.
 *
 * ⚠️ THE CHAIN IS NOT DECORATION. Lifting the pill over the bar alone put the pill and the toast
 * both at `bottom:111px` at 1024-1099, overlapping x440-520.5 — and `pushWrite` fires
 * `setSync('error')` and `toast()` in the SAME BREATH, so that pair is the error path's normal
 * case. Fixing one collision had created another, measured rather than predicted.
 *
 * WHY EACH TEST IS A REGRESSION RATHER THAN A DESCRIPTION:
 *
 *  1. THE TWO BUILDER OPENERS ARE A PAIR AND THEY MUST DISAGREE. `loadPlate` must not toast;
 *     `openHealedPlate` must. Asserting only the first is satisfied by `toast` being deleted from
 *     the app entirely, and asserting either one from SOURCE is roster 167 — both are EXECUTED
 *     here, with a recording stub, and both must also have opened the builder, so an early return
 *     cannot masquerade as a silent open.
 *  2. THE PUBLISHERS PUBLISH ZERO, NOT NOTHING. A stale clearance for an element that has left the
 *     screen floats the toast a third of the way up an empty page, and that is the half with no
 *     visible symptom — it reads as a design choice. Both publishers are run in both directions.
 *  3. THE SHEET TEST IS READ FROM THE CASCADE, NOT FROM 767. `align-items:flex-end` is what docks a
 *     sheet to the floor; above 768 the same markup is a centred dialog whose footer must publish
 *     nothing. Pinned by handing the real function an overlay of each kind.
 *  4. EVERY `var()` IN THE TOAST'S `bottom` CARRIES A `0px` FALLBACK. An undefined custom property
 *     invalidates the whole declaration at computed-value time — not "falls back to the base rule",
 *     but no `bottom` at all, which drops the toast to the viewport floor. The fallback is the only
 *     thing standing between a fourth publisher being added and the toast losing its dock.
 *
 * NOT TESTED HERE, AND DELIBERATELY: that `hide()` removes the inline `--install-banner-clear`.
 * `tests/visual/226-bottom-stack.spec.js`'s "dismissing the banner releases the reserve and the lift
 * together" already asserts the toast returns to 92px after a dismiss, and under 275's single
 * unconditional rule a leftover inline value keeps the lift — so that spec goes red on its own if
 * the removal is dropped. A source-level copy of it here would be the weaker of the two.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();
/* ⚠️ COMMENTS ARE STRIPPED FIRST, AND THIS FILE IS ITS OWN WORKED EXAMPLE OF WHY.
   `.claude/rules/tests.md` roster 183(a): a grep over a source file searches PROSE as well as CODE,
   and the prose is usually written by the same person, in the same hour, saying the same words.
   275 left a TOMBSTONE where `html.has-install-banner .toast{…}` used to be, quoting the deleted
   rule verbatim so the measurement behind it is not lost — so the assertion that the rule is gone
   found it in its own explanation and went red on the first run. Every CSS assertion below reads
   CSS, never RAW. */
const RAW = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');
const CSS = RAW.replace(/\/\*[\s\S]*?\*\//g, '');

/* ------------------------------------------------------------------ 1. the two builder openers */

/* Runs the REAL loadPlate and the REAL openHealedPlate against recording stubs. Everything they
   reach outside themselves is a stub that records; nothing is reimplemented. */
function openers() {
  const log = { toasts: [], opens: 0 };
  // eslint-disable-next-line no-new-func
  const factory = new Function('LOG', `
    function toast(msg){ LOG.toasts.push(msg); }
    function openBuilder(){ LOG.opens++; }
    function loadPlateState(id){ return id ? { id: id, name: 'Big Breakfast' } : null; }
    ${extractFn(SRC, 'loadPlate')}
    ${extractFn(SRC, 'openHealedPlate')}
    return { loadPlate: loadPlate, openHealedPlate: openHealedPlate };
  `);
  return { fns: factory(log), log };
}

test('275: opening a saved plate opens the builder and says NOTHING', () => {
  const { fns, log } = openers();
  fns.loadPlate('PL1');
  assert.strictEqual(log.opens, 1, 'the builder must actually have opened — an early return would also not toast');
  assert.deepStrictEqual(log.toasts, [], 'loadPlate must not toast: the user tapped this plate, and the breadcrumb already names it');
});

test('275: the heal opener DOES toast — the control that makes the test above mean something', () => {
  const { fns, log } = openers();
  fns.openHealedPlate({ name: 'Fish pie' }, { id: 'PL9' }, false);
  assert.strictEqual(log.opens, 1);
  assert.strictEqual(log.toasts.length, 1, 'a minted plate has nothing else to announce it');
  assert.match(log.toasts[0], /add ingredients to cost it/);
});

test('275: a RELINK still says nothing, so "no toast" is not being read as "this path is mute"', () => {
  const { fns, log } = openers();
  fns.openHealedPlate({ name: 'Fish pie' }, { id: 'PL9' }, true);
  assert.strictEqual(log.opens, 1);
  assert.deepStrictEqual(log.toasts, []);
});

/* ------------------------------------------------------------------ 2 + 3. the two publishers */

/* A fake document narrow enough to be honest: it serves exactly the elements the function asks for
   and records exactly what it set on <html>. `getComputedStyle` is a parameter rather than a global
   so a test can vary one property without building a style engine. */
function publisher(name, env) {
  const set = {};
  const docEl = { style: { setProperty(k, v) { set[k] = v; }, removeProperty(k) { delete set[k]; } } };
  const doc = {
    documentElement: docEl,
    getElementById: (id) => env.byId[id] || null,
    querySelectorAll: (sel) => env.byQuery[sel] || [],
  };
  /* 97: `publishBldBarClear` now CALLS `publishSyncBannerClear` on both its paths, because the
     pill's own `bottom` reads `--bld-bar-clear` at >=1024 and the toast docks above the pill.
     The real one is extracted alongside rather than stubbed, so the chain under test is the
     shipped chain — a stub here would agree with whatever the caller believes, which is this
     repo's most-recorded defect. A sandbox with no `#syncBanner` makes it a no-op, which is what
     the bar-only tests want. */
  // eslint-disable-next-line no-new-func
  const factory = new Function('document', 'getComputedStyle', `
    ${extractFn(SRC, 'publishSyncBannerClear')}
    ${name === 'publishSyncBannerClear' ? '' : extractFn(SRC, name)}
    return ${name};
  `);
  factory(doc, env.computed || (() => ({})))();
  return set;
}

const rect = (t, b, h) => ({ getBoundingClientRect: () => ({ top: t, bottom: b, height: h == null ? b - t : h }) });

test('275: the builder bar publishes its own dock plus its own height', () => {
  const bar = rect(635.3, 735, 99.8);
  const set = publisher('publishBldBarClear', {
    byId: { bFootSum: bar }, byQuery: {},
    computed: () => ({ bottom: '65px' }),
  });
  // 65 (the dock, above the tab bar) + 99.8 (two wrapped rows) -> 165, the value measured at 380
  assert.strictEqual(set['--bld-bar-clear'], '165px');
});

test('275: a bar that is not on screen publishes 0px — never nothing, never the last value', () => {
  const set = publisher('publishBldBarClear', {
    byId: { bFootSum: rect(0, 0, 0) }, byQuery: {},
    computed: () => ({ bottom: '0px' }),
  });
  assert.strictEqual(set['--bld-bar-clear'], '0px',
    'at >=1100 the bar is display:none; a stale lift there floats the toast up an empty builder');
});

/* An overlay as the function sees it: an align-items, a .modal and a .mfoot. */
function overlay(alignItems, modalBottom, footTop, footHeight) {
  const modal = rect(0, modalBottom);
  const foot = rect(footTop, modalBottom, footHeight);
  return {
    __align: alignItems,
    querySelector: (sel) => (sel === '.modal' ? modal : sel === '.mfoot' ? foot : null),
  };
}

function sheetClear(overlays) {
  return publisher('publishSheetFootClear', {
    byId: {},
    byQuery: { '.modal-overlay.open': overlays },
    computed: (el) => ({ alignItems: el.__align }),
  })['--sheet-foot-clear'];
}

test('275: a docked sheet publishes how far its FOOTER reaches above the sheet\'s own bottom', () => {
  // #delChoiceModal: its footer STACKS three choices and is 127px, which is past the toast's 92 dock
  assert.strictEqual(sheetClear([overlay('flex-end', 800, 673, 127)]), '127px');
  // the ordinary two-button footer is 76px — published honestly, and the toast's max() ignores it
  assert.strictEqual(sheetClear([overlay('flex-end', 800, 724, 76)]), '76px');
});

test('275: a CENTRED dialog publishes nothing, and the test for that is the cascade not the width', () => {
  assert.strictEqual(sheetClear([overlay('flex-start', 560, 484, 76)]), '0px',
    'above 768 the footer is mid-screen; a clearance computed there shoves the toast halfway up');
  assert.strictEqual(sheetClear([overlay('center', 560, 484, 76)]), '0px');
});

test('275: overlays STACK, so the published value is the deepest footer of the open set', () => {
  assert.strictEqual(sheetClear([overlay('flex-end', 800, 724, 76), overlay('flex-end', 800, 673, 127)]), '127px');
  assert.strictEqual(sheetClear([overlay('flex-end', 800, 673, 127), overlay('flex-end', 800, 724, 76)]), '127px');
});

test('275: no overlay open publishes 0px', () => {
  assert.strictEqual(sheetClear([]), '0px');
});

test('275: a sheet with no footer contributes nothing rather than throwing', () => {
  const wiz = { __align: 'flex-end', querySelector: (sel) => (sel === '.modal' ? rect(0, 800) : null) };
  assert.strictEqual(sheetClear([wiz]), '0px', 'the setup wizard is a full-height takeover with no .mfoot');
});

/* --------------------------------------------- 3b. the sync pill, and the chain it sits in (97) */

/* The pill is bottom-docked only at >=1024; below that it is top-centred over the app header.
   `transform` is the discriminator the shipped code uses and these fixtures mirror the real
   computed values, which is the whole point of the test below it. */
const pill = (h, opts) => ({ byId: { syncBanner: rect(0, 0, h) }, byQuery: {}, computed: () => opts });

test('97: the sync pill publishes its dock plus its height when it is docked to the floor', () => {
  const set = publisher('publishSyncBannerClear', pill(35.6, { transform: 'none', bottom: '24px' }));
  assert.strictEqual(set['--sync-banner-clear'], '60px');   // 24 + 35.6 -> 60
});

test('97: lifted by the builder bar, the pill publishes the LIFTED reach', () => {
  /* Its own `bottom` is max(24, --bld-bar-clear + 12), so at 1024 with the bar up it is 111 and the
     pill reaches 147. That is the number the toast has to clear, not 60. */
  const set = publisher('publishSyncBannerClear', pill(35.6, { transform: 'none', bottom: '111px' }));
  assert.strictEqual(set['--sync-banner-clear'], '147px');
});

/* ⚠️ THE TEST THAT EXISTS BECAUSE THE FIRST CUT GOT IT WRONG, and it went wrong silently.
   §H's corner rule sets `top:auto`, so `getComputedStyle(el).top === 'auto'` reads as the exact
   test for "is this docked to the floor". It is not: for a positioned element getComputedStyle
   returns the USED value, and `auto` has already been resolved to a pixel offset — measured, `top`
   comes back `740.406px` at 1024 and `bottom` comes back `738.812px` at 380. The first cut used
   `top!=='auto'`, which is true at EVERY width, so the publisher returned `0px` always and the
   toast went on colliding with the pill exactly as before. Nothing went red; the repro just did not
   move. These fixtures carry the real measured values so the wrong discriminator cannot pass. */
test('97: top-centred below 1024, the pill publishes 0px — and `top`/`bottom` cannot tell you that', () => {
  const below = pill(35.6, { transform: 'matrix(1, 0, 0, 1, -95, 0)', top: '10px', bottom: '738.812px' });
  assert.strictEqual(publisher('publishSyncBannerClear', below)['--sync-banner-clear'], '0px');

  const above = pill(35.6, { transform: 'none', top: '740.406px', bottom: '24px' });
  assert.strictEqual(publisher('publishSyncBannerClear', above)['--sync-banner-clear'], '60px');

  /* The point, stated as an assertion rather than a comment: neither offset distinguishes the two
     states, so a publisher keyed on either is keyed on nothing. */
  assert.notStrictEqual(below.computed().transform, above.computed().transform);
  assert.ok(below.computed().top !== 'auto' && above.computed().top !== 'auto',
    'both report a pixel `top`, so `top===auto` can never be the test');
  assert.ok(below.computed().bottom !== 'auto' && above.computed().bottom !== 'auto',
    'and both report a pixel `bottom`, so neither can `bottom===auto`');
});

test('97: a hidden pill publishes 0px', () => {
  assert.strictEqual(publisher('publishSyncBannerClear', pill(0, { transform: 'none', bottom: '24px' }))['--sync-banner-clear'], '0px');
});

test('97: publishing the bar republishes the pill — the chain, not two independent listeners', () => {
  /* Both elements present. The bar publishes its own reach AND drives the pill, because the pill's
     `bottom` is computed FROM the bar's variable: publishing one without the other leaves the toast
     docked against where the pill used to be. */
  const set = publisher('publishBldBarClear', {
    byId: { bFootSum: rect(701.5, 800, 98.5), syncBanner: rect(0, 0, 35.6) },
    byQuery: {},
    computed: (el) => (el.getBoundingClientRect().height === 98.5
      ? { bottom: '0px' }                                    // the bar at 1024 docks on the floor
      : { transform: 'none', bottom: '111px' }),             // …so the pill sits at 99 + 12
  });
  assert.strictEqual(set['--bld-bar-clear'], '99px');
  assert.strictEqual(set['--sync-banner-clear'], '147px', 'the bar must drive the pill in the same call');
});

test('97: a bar going off screen republishes the pill too, on the 0px path', () => {
  const set = publisher('publishBldBarClear', {
    byId: { bFootSum: rect(0, 0, 0), syncBanner: rect(0, 0, 35.6) },
    byQuery: {},
    computed: () => ({ transform: 'none', bottom: '24px' }),
  });
  assert.strictEqual(set['--bld-bar-clear'], '0px');
  assert.strictEqual(set['--sync-banner-clear'], '60px', 'the pill drops back to its own dock in the same call');
});

/* ------------------------------------------------------------------ 4. the reader's contract */

/* The `.toast{...}` declaration block, brace-matched from its own selector rather than sliced to the
   next `@media` — roster 268: a structural claim tested by a proximity heuristic silently widens as
   the file grows. */
function toastBlock() {
  const m = /(^|\n)\.toast\{/.exec(CSS);
  assert.ok(m, '.toast rule not found in css/style.css');
  const start = m.index + m[0].length;
  let depth = 1;
  for (let i = start; i < CSS.length; i++) {
    if (CSS[i] === '{') depth++;
    else if (CSS[i] === '}') { depth--; if (!depth) return CSS.slice(start, i); }
  }
  throw new Error('unterminated .toast rule');
}

const CLEAR_VARS = ['--install-banner-clear', '--bld-bar-clear', '--sheet-foot-clear', '--sync-banner-clear'];

test('275: the toast reads all four published clearances, in ONE rule', () => {
  const block = toastBlock();
  const bottom = /bottom:([\s\S]*?);/.exec(block);
  assert.ok(bottom, '.toast must set its own bottom');
  CLEAR_VARS.forEach((v) => {
    assert.ok(bottom[1].includes(v), `the toast must clear ${v} — it is published by js/app.js and read nowhere else`);
  });
  assert.ok(/\bmax\(/.test(bottom[1]), 'the four are combined with max(): the tallest wins, and none of them may know about the others');
});

test('275: every var() in that bottom carries a 0px fallback', () => {
  const bottom = /bottom:([\s\S]*?);/.exec(toastBlock())[1];
  CLEAR_VARS.forEach((v) => {
    assert.ok(new RegExp(`var\\(\\s*${v}\\s*,\\s*0px\\s*\\)`).test(bottom),
      `${v} needs its 0px fallback: an undefined custom property makes the WHOLE declaration invalid at computed-value time, and the toast then has no bottom at all`);
  });
});

test('275: the toast keeps a dock of its own that owes nothing to any publisher', () => {
  const bottom = /bottom:([\s\S]*?);/.exec(toastBlock())[1];
  assert.ok(/92px/.test(bottom), 'with nothing else on the bottom stack the toast sits at its own 92px');
  assert.ok(/env\(safe-area-inset-bottom\)/.test(bottom),
    'only the constant arm adds the inset — the published arms have already resolved theirs');
});

test('275: the banner no longer lifts the toast by selector, because two more elements need the same lift', () => {
  assert.ok(!/html\.has-install-banner\s+\.toast\s*\{/.test(CSS),
    'a per-element selector cannot express "the tallest of three"; the condition moved into the value');
  assert.ok(/html\.has-install-banner\s*\{[^}]*--install-banner-clear/.test(CSS),
    'the class rule still supplies the pre-JS fallback for the banner and for .bld-bar');
  assert.ok(/html\.has-install-banner\s+\.bld-bar\s*\{/.test(CSS),
    'the bar is still docked above the banner by selector — it reads the number, the toast reads the bar');
});
