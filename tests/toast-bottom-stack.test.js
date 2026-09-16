/*
 * toast-bottom-stack.test.js — 275 (queue item 50).
 *
 * THE BOTTOM STACK HAS THREE THINGS THAT REACH UP FROM THE FLOOR, AND THE TOAST READS ALL THREE.
 * 226 built the publish/read pattern for the install banner and its own comment stated the rule in
 * general terms ("the element that owns it publishes it; nothing that reads it may know a number").
 * It built one publisher because the banner was the only element anyone had measured. 275 adds the
 * other two — the builder's sticky summary bar, which carries SAVE, and an open bottom sheet's
 * footer, which carries the commit verb — and deletes the "Loaded: <plate>" toast that was firing
 * on top of them for no reason.
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
  // eslint-disable-next-line no-new-func
  const factory = new Function('document', 'getComputedStyle', `
    ${extractFn(SRC, name)}
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

const CLEAR_VARS = ['--install-banner-clear', '--bld-bar-clear', '--sheet-foot-clear'];

test('275: the toast reads all three published clearances, in ONE rule', () => {
  const block = toastBlock();
  const bottom = /bottom:([\s\S]*?);/.exec(block);
  assert.ok(bottom, '.toast must set its own bottom');
  CLEAR_VARS.forEach((v) => {
    assert.ok(bottom[1].includes(v), `the toast must clear ${v} — it is published by js/app.js and read nowhere else`);
  });
  assert.ok(/\bmax\(/.test(bottom[1]), 'the three are combined with max(): the tallest wins, and none of them may know about the others');
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
