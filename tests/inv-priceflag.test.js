/*
 * inv-priceflag.test.js — v55 §E1: the invoice "price change — check" flag compares at CENT precision.
 *
 * THE BUG: flagNeedsAttention computed the price jump on UNROUNDED floats, so two prices that both DISPLAY
 * as the same $x.xx (differing only past the cent) tripped a "price change" alert — e.g. 0.01 vs 0.01.
 * THE FIX (CLAUDE.md rounding rule — displays/compare at the cent, stored stays exact): no jump when the
 * two values are equal at cent precision.
 *
 * Against the REAL shipped flagNeedsAttention (brace-extracted from js/app.js).
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`inv-priceflag: function not found -> ${name}`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`inv-priceflag: unbalanced braces for ${name}`);
}

function makeFlag(byId) {
  // eslint-disable-next-line no-new-func
  const factory = new Function('BYID', `
    "use strict";
    var byId = BYID;
    var PRICE_JUMP = 0.12;
    function cpbu(p){ return p.cost_per_base_unit; }
    ${extractFn(SRC, 'flagNeedsAttention')}
    return flagNeedsAttention;
  `);
  return factory(byId);
}

test('v55 §E1: prices equal at the cent do NOT flag, even if the raw floats differ past the cent', () => {
  const flag = makeFlag({ P1: { base_unit: 'ea', cost_per_base_unit: 0.0134 } });
  const row = { bestId: 'P1', unitPrice: 0.0101, unitMismatch: false, needManual: false };  // both display $0.01
  assert.strictEqual(flag(row), false, '0.01 vs 0.01 at the cent must not be a "price change"');
});

test('v55 §E1: a genuine change (displays differ) still flags', () => {
  const flag = makeFlag({ P1: { base_unit: 'ea', cost_per_base_unit: 10.0 } });
  const row = { bestId: 'P1', unitPrice: 15.0, unitMismatch: false, needManual: false };
  assert.strictEqual(flag(row), true, 'a +50% jump must still be flagged');
});

test('v55 §E1: a small move within the threshold does not flag', () => {
  const flag = makeFlag({ P1: { base_unit: 'ea', cost_per_base_unit: 10.0 } });
  const row = { bestId: 'P1', unitPrice: 10.5, unitMismatch: false, needManual: false };   // +5% < 12%
  assert.strictEqual(flag(row), false);
});

test('v55 §E1: per-kg products compare in the row unit (stored per-g x1000)', () => {
  const flag = makeFlag({ P1: { base_unit: 'g', cost_per_base_unit: 0.012 } });             // $12.00/kg
  const same = { bestId: 'P1', unitPrice: 12.001, unitMismatch: false, needManual: false }; // $12.00/kg at the cent
  assert.strictEqual(flag(same), false, 'equal at the cent per kg -> no flag');
  const jump = { bestId: 'P1', unitPrice: 18.0, unitMismatch: false, needManual: false };   // $18.00/kg
  assert.strictEqual(flag(jump), true, 'a real per-kg jump still flags');
});
