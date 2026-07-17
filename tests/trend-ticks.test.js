/*
 * trend-ticks.test.js — v48: the y-axis tick generator is anchored ON the target.
 *
 * HARD REQUIREMENT (v48 patch): the dashed target line carries no label of its own —
 * it is self-explanatory ONLY because it always sits exactly on a y-axis tick that
 * reads the user's own target number. These tests pin that contract: for any target
 * (round or not) and any data extent, tcTicks(target, mn, mx) must return 3–4
 * uniformly-stepped values that INCLUDE the target and COVER the data.
 * If a change here fails, the chart is shipping an unexplained dashed line — stop.
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

// eslint-disable-next-line no-new-func
const tcTicks = new Function(`"use strict"; ${extractFn(APP, 'tcTicks')} return tcTicks;`)();

function checkContract(ticks, target, mn, mx, label) {
  assert.ok(ticks.length >= 3 && ticks.length <= 4, `${label}: 3-4 ticks (got ${ticks.length}: ${ticks})`);
  assert.ok(ticks.some(t => Math.abs(t - target) < 1e-9), `${label}: target ${target} IS a tick (got ${ticks})`);
  const step = ticks[1] - ticks[0];
  for (let i = 1; i < ticks.length; i++) {
    assert.ok(Math.abs((ticks[i] - ticks[i - 1]) - step) < 1e-6, `${label}: uniform step (got ${ticks})`);
  }
  assert.ok(ticks[0] <= mn + 1e-9 || ticks[0] >= 0, `${label}: low tick covers data or stops at 0 (got ${ticks})`);
  assert.ok(ticks[ticks.length - 1] >= mx - 1e-9, `${label}: high tick covers the data max (got ${ticks})`);
  assert.ok(ticks.every(t => t >= 0), `${label}: never a negative %% label (got ${ticks})`);
}

test('round target lands on a tick in a typical window', () => {
  const ticks = tcTicks(30, 24, 35);
  checkContract(ticks, 30, 24, 35, 'target 30, data 24-35');
});

test('NON-ROUND target (32%) still lands exactly on a labelled tick', () => {
  const ticks = tcTicks(32, 24, 35);
  checkContract(ticks, 32, 24, 35, 'target 32, data 24-35');
});

test('decimal target (32.5%) is itself a tick', () => {
  const ticks = tcTicks(32.5, 26, 38);
  checkContract(ticks, 32.5, 26, 38, 'target 32.5, data 26-38');
});

test('flat data pinned at the target (the widened ±2 domain) still yields 3+ ticks on it', () => {
  const ticks = tcTicks(30, 28, 32);        // trendChart widens span<4 to midY±2 before calling
  checkContract(ticks, 30, 28, 32, 'flat at target');
});

test('data far above the target: ticks stretch to cover it, target stays in the set', () => {
  const ticks = tcTicks(27, 27, 58);        // mn includes the target (trendChart concats it)
  checkContract(ticks, 27, 27, 58, 'runaway food cost');
});

test('ticks step outward FROM the target, so similar windows cannot jitter', () => {
  // stability = quantization: any data extent inside the same tick quantum yields IDENTICAL
  // ticks (the axis only changes when the data genuinely crosses onto another tick)
  const a = tcTicks(30, 24, 35);
  const b = tcTicks(30, 24.8, 34.2);
  assert.deepEqual(a, b, `domains inside one tick quantum must produce identical ticks (${a} vs ${b})`);
});

test('sweep: every realistic target/domain combination honours the contract', () => {
  for (let target = 20; target <= 45; target += 2.5) {
    for (let lo = 4; lo <= 20; lo += 4) {
      for (let hi = 4; hi <= 30; hi += 6) {
        const mn = Math.max(0, target - lo), mx = target + hi;
        checkContract(tcTicks(target, mn, mx), target, mn, mx, `t=${target} mn=${mn} mx=${mx}`);
      }
    }
  }
});
