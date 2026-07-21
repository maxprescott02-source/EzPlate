/*
 * insights.test.js — the PURE deterministic insight engine (v63 item 3a).
 *
 * deriveInsights is extracted from js/app.js via _extract (no DOM). It turns costed dishes +
 * a target food-cost fraction into 1–3 grounded observations. This engine ships and is useful
 * with NO API call; the optional Gemini phrasing only rewrites the text, never the numbers.
 */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { deriveInsights } = require('./_extract.js');

const dish = (name, cost, menuPrice) => ({ name, cost, menuPrice });

test('no costed+priced dishes → empty (the area hides)', () => {
  assert.deepEqual(deriveInsights([], 0.3), []);
  assert.deepEqual(deriveInsights([dish('X', 0, 10), dish('Y', 5, 0)], 0.3), []);
});

test('worst over-target dish leads, with points over and the target price', () => {
  // Barra: cost $6 on a $15 menu = 40% food cost, 10 pts over a 30% target.
  // target price = 6/0.3 = $20.00 (already a .50 multiple).
  const out = deriveInsights([dish('Barra & Chips', 6, 15)], 0.3);
  assert.ok(out.length >= 1);
  const first = out[0];
  assert.equal(first.kind, 'over');
  assert.equal(first.facts.pts, 10);
  assert.equal(first.facts.targetPrice, 20);
  assert.equal(first.facts.menuPrice, 15);
  assert.match(first.text, /Barra & Chips/);
  assert.match(first.text, /10 pts over/);
  assert.match(first.text, /\$20\.00/);
});

test('target price rounds UP to the nearest $0.50', () => {
  // cost $5 at 30% → 16.666… → rounds up to $17.00
  const out = deriveInsights([dish('Roll', 5, 12)], 0.3);
  assert.equal(out[0].facts.targetPrice, 17);
});

test('dishes at or under target → no over-target line; a single positive summary', () => {
  const out = deriveInsights([dish('Salad', 3, 12), dish('Soup', 2, 9)], 0.3);   // 25% and ~22% — both under
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'allgood');
  assert.match(out[0].text, /All 2 costed dishes/);
  assert.match(out[0].text, /30% target/);
});

test('multiple over-target dishes → worst two + a count line, capped at 3', () => {
  const out = deriveInsights([
    dish('A', 6, 15),   // 40% → 10 over
    dish('B', 5, 15),   // ~33% → 3 over
    dish('C', 4.8, 15), // 32% → 2 over
    dish('D', 3, 15)    // 20% → under
  ], 0.3);
  assert.equal(out.length, 3);
  assert.equal(out[0].facts.name, 'A');       // worst first
  assert.equal(out[1].facts.name, 'B');       // second worst
  assert.equal(out[2].kind, 'count');
  assert.equal(out[2].facts.over, 3);
  assert.equal(out[2].facts.total, 4);
  assert.match(out[2].text, /3 of 4 costed dishes sit over your 30% target/);
});

test('a dish barely over (< 1 pt) is not flagged as over-target', () => {
  // cost 3.02 on 10 = 30.2% → 0 pts rounded → treated as on-target
  const out = deriveInsights([dish('Edge', 3.02, 10)], 0.3);
  assert.equal(out[0].kind, 'allgood');
});

test('invalid target fraction → empty', () => {
  assert.deepEqual(deriveInsights([dish('A', 6, 15)], 0), []);
  assert.deepEqual(deriveInsights([dish('A', 6, 15)], -1), []);
});

test('pure: does not mutate the dishes array', () => {
  const dishes = [dish('A', 6, 15), dish('B', 3, 15)];
  const snap = JSON.stringify(dishes);
  deriveInsights(dishes, 0.3);
  assert.equal(JSON.stringify(dishes), snap);
});
