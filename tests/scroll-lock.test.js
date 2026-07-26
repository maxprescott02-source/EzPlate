/*
 * scroll-lock.test.js (v87) — the page behind an open modal must not scroll.
 *
 * Max: "scrolling whilst having modal open still scrolls the main page behind modal."
 * Reproduced and measured in a real browser before the fix — with a modal open at scrollY 150,
 * a wheel on the BACKDROP took the page to 550 at both 380px and desktop, and a wheel over the
 * card took desktop on to 1150. `.mbody`/`.modal` already carried overscroll-behavior:contain,
 * but that only bites when THAT element is itself scrollable and hits its end; on the backdrop,
 * or with a modal too short to scroll, the gesture chained straight to <body>.
 *
 * The geometry is verified in a browser and the state machine in tests/smoke.js [23]. What is
 * pinned HERE is the shape of the fix — the three things that would silently rot:
 *   1. both choke points call the lock (a new modal path can't forget it),
 *   2. closeOverlay calls it BEFORE its reduced-motion early return,
 *   3. the lock is DERIVED from the DOM, not counted, and uses position:fixed not overflow:hidden.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');

const fnBody = name => {
  const i = app.indexOf(`function ${name}(`);
  assert.ok(i >= 0, `${name} not found in app.js — update this test's anchor`);
  const start = app.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < app.length; n++) {
    if (app[n] === '{') depth++;
    else if (app[n] === '}' && --depth === 0) return app.slice(i, n + 1);
  }
  throw new Error(`unbalanced braces for ${name}`);
};

test('openOverlay routes through the scroll lock', () => {
  assert.match(fnBody('openOverlay'), /syncBodyScrollLock\(\)/,
    'every modal open goes through openOverlay (v72) — that is why the lock lives there');
});

test('closeOverlay routes through the scroll lock', () => {
  assert.match(fnBody('closeOverlay'), /syncBodyScrollLock\(\)/);
});

test('closeOverlay releases the page BEFORE its reduced-motion early return', () => {
  const body = fnBody('closeOverlay');
  const lockAt = body.indexOf('syncBodyScrollLock()');
  const returnAt = body.indexOf('prefersReducedMotion()');
  assert.ok(lockAt >= 0 && returnAt >= 0, 'both markers must exist');
  assert.ok(lockAt < returnAt,
    'with reduced motion on, closeOverlay returns early — a lock released after it would strand the page');
});

test('the lock is DERIVED from the DOM, not a counter that can drift', () => {
  const body = fnBody('syncBodyScrollLock');
  assert.match(body, /querySelector\('\.modal-overlay\.open'\)/,
    'the app stacks a confirm on a modal; "is any overlay still open?" is the only safe question');
  assert.ok(!/\+\+|--/.test(body), 'no refcounting — a counter drifts the moment one path is missed');
});

test('the lock is position:fixed, not overflow:hidden (iOS Safari ignores the latter on body)', () => {
  const body = fnBody('syncBodyScrollLock');
  assert.match(body, /scroll-locked/);
  assert.ok(!/style\.overflow/.test(body), 'overflow:hidden on <body> does not hold on iOS');
  assert.match(css, /body\.scroll-locked\{[^}]*position:fixed/);
});

test('the held scroll offset is restored on unlock, so closing never jumps the page', () => {
  const body = fnBody('syncBodyScrollLock');
  assert.match(body, /_scrollLockY\s*=\s*window\.pageYOffset/, 'capture on lock');
  assert.match(body, /scrollTo\(0,\s*_scrollLockY\)/, 'restore on unlock');
});

test('the desktop scrollbar is compensated so content does not jolt sideways', () => {
  const body = fnBody('syncBodyScrollLock');
  assert.match(body, /innerWidth\s*-\s*document\.documentElement\.clientWidth/);
  assert.match(body, /paddingRight/);
});

test('inline styles the lock wrote are cleaned up on unlock', () => {
  const body = fnBody('syncBodyScrollLock');
  assert.match(body, /style\.top\s*=\s*''/, 'top must be cleared, not left at a stale offset');
  assert.match(body, /style\.paddingRight\s*=\s*_scrollLockPad/, 'padding restored to whatever it was');
});

test('the overlay contains its own overscroll as the second layer', () => {
  const rule = css.slice(css.indexOf('.modal-overlay{'), css.indexOf('.modal-overlay.open'));
  assert.match(rule, /overscroll-behavior:contain/,
    'so a wheel/drag on the BACKDROP cannot chain even before the lock applies');
});
