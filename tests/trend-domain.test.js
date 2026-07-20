/*
 * trend-domain.test.js — v60 item 1b: the y-domain fits the DATA, not the target.
 *
 * SUPERSESSION: v48 always concatenated the target into the domain (the dashed line always showed).
 * v60 replaces that: niceTicks generates round ticks over the DATA extent only, and the target line
 * is shown only when it's inside the domain (or within one tick, via targetInView). tcTicks' own
 * "target sits on a labelled tick" contract is unchanged and still pinned by trend-ticks.test.js —
 * this file pins the NEW data-fit generator and the in-view decision.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const APP = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`function not found -> ${name}`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`unbalanced braces for ${name}`);
}

// TICK_STEPS is a module-level const the helpers close over — pull it in with them.
const ctx = new Function(`"use strict";
  var TICK_STEPS=[1,2,5,10,20,50];
  ${extractFn(APP, 'niceStep')}
  ${extractFn(APP, 'niceTicks')}
  ${extractFn(APP, 'targetInView')}
  return { niceStep:niceStep, niceTicks:niceTicks, targetInView:targetInView };
`)();
const { niceStep, niceTicks, targetInView } = ctx;

function checkTicks(ticks, mn, mx, label) {
  assert.ok(ticks.length >= 3 && ticks.length <= 4, `${label}: 3-4 ticks (got ${ticks.length}: ${ticks})`);
  const step = ticks[1] - ticks[0];
  for (let i = 1; i < ticks.length; i++) {
    assert.ok(Math.abs((ticks[i] - ticks[i - 1]) - step) < 1e-6, `${label}: uniform step (got ${ticks})`);
  }
  assert.ok(ticks[0] <= mn + 1e-9, `${label}: low tick covers the data min (got ${ticks})`);
  assert.ok(ticks[ticks.length - 1] >= mx - 1e-9, `${label}: high tick covers the data max (got ${ticks})`);
  assert.ok(ticks.every(t => t >= 0), `${label}: never a negative %% label (got ${ticks})`);
}

test('niceTicks covers a tight window with 3-4 uniform round ticks', () => {
  checkTicks(niceTicks(28, 33), 28, 33, 'tight 28-33');
});

test('niceTicks does NOT reach a distant target — the domain stays on the data', () => {
  // data 28-33, target 30 would be in view; but a runaway 55-60 window must not stretch down to 30
  const ticks = niceTicks(55, 60);
  checkTicks(ticks, 55, 60, 'runaway 55-60');
  assert.ok(ticks[0] >= 50, `low tick should stay near the data, not fall to the target (got ${ticks})`);
});

test('niceTicks widens the step rather than emitting more than 4 labels', () => {
  const ticks = niceTicks(2, 40);
  assert.ok(ticks.length <= 4, `wide span keeps <=4 labels (got ${ticks})`);
});

test('targetInView: inside the domain is shown', () => {
  assert.ok(targetInView(30, 28, 33, 5), 'target 30 inside 28-33');
});

test('targetInView: within one tick of the domain is still shown', () => {
  assert.ok(targetInView(35, 28, 33, 5), 'target 35 is one step (5) above 33 -> shown');
  assert.ok(targetInView(24, 28, 33, 5), 'target 24 is within one step below 28 -> shown');
});

test('targetInView: far outside is hidden (edge annotation instead)', () => {
  assert.ok(!targetInView(30, 52, 60, 5), 'target 30 far below a 52-60 window -> hidden');
  assert.ok(!targetInView(70, 28, 33, 5), 'target 70 far above a 28-33 window -> hidden');
});

test('niceStep returns a value from the allowed step set that covers the raw span', () => {
  [1, 2, 5, 10, 20, 50].forEach(s => assert.ok([1, 2, 5, 10, 20, 50].includes(niceStep(s))));
  assert.strictEqual(niceStep(3), 5);
  assert.strictEqual(niceStep(1.4), 2);
});
