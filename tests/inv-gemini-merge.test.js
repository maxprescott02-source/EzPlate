/*
 * inv-gemini-merge.test.js — the PURE per-line merge rule table (v62 AI second reader).
 *
 * Extracted straight from js/app.js via _extract (no DOM, no live API). Every rule 1–7 that can be
 * expressed as a per-line decision is pinned here against CANNED Gemini readings. The DOM-level parts
 * (rule 5 append, late-response discard, unavailable degrades to identical rendering) are covered by
 * the jsdom smoke test — see tests/smoke.js §9.
 *
 * P = parser reading, G = Gemini reading, H = canonical price history |null, T = taught-layer boolean.
 */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const app = require('./_extract.js');
const { gemMergeLine, gemCanon, gemPackEq } = app;

// helpers to build readings
const P = (unitPrice, unit, packCount) => ({ unitPrice, unit, packCount });
const Gm = (derivedUnitPrice, unitType, packCount) => ({ derivedUnitPrice, unitType, packCount });
const H = (per, cat) => ({ per, cat });

test('gemCanon normalises to per-kg / per-litre / per-each', () => {
  assert.deepEqual(gemCanon(2, 'kg'), { cat: 'kg', per: 2 });
  assert.deepEqual(gemCanon(0.002, 'g'), { cat: 'kg', per: 2 });   // per-g → per-kg
  assert.deepEqual(gemCanon(0.003, 'ml'), { cat: 'l', per: 3 });   // per-ml → per-litre
  assert.deepEqual(gemCanon(1.5, 'ea'), { cat: 'ea', per: 1.5 });
  assert.equal(gemCanon(0, 'kg'), null);      // non-positive → not comparable
  assert.equal(gemCanon(2, 'auto'), null);    // unknown unit → not comparable
});

test('gemPackEq: equal, or both unknown', () => {
  assert.equal(gemPackEq(6, 6), true);
  assert.equal(gemPackEq(null, null), true);
  assert.equal(gemPackEq(6, null), false);
  assert.equal(gemPackEq(6, 8), false);
});

test('rule 1: a taught line wins over both P and G — no conflict shown', () => {
  const d = gemMergeLine(P(5, 'kg', 6), Gm(9, 'kg', 6), H(5, 'kg'), true);
  assert.equal(d.rule, 1);
  assert.equal(d.action, 'keep');
  assert.equal(d.winner, 'T');
});

test('rule 2: P ≈ G at cent precision, same unit, packs agree → verified silently', () => {
  const d = gemMergeLine(P(4.00, 'kg', 6), Gm(4.004, 'kg', 6), H(4, 'kg'), false);
  assert.equal(d.rule, 2);
  assert.equal(d.action, 'keep');
});

test('rule 2 does NOT fire when pack counts disagree (falls to history/rule table)', () => {
  const d = gemMergeLine(P(4.00, 'kg', 6), Gm(4.00, 'kg', 8), H(4, 'kg'), false);
  assert.notEqual(d.rule, 2);
});

test('v66 rule 3: parser price OUT of band, Gemini IN band → FLAG for review, price NOT changed', () => {
  // P says $9.30/ea, G says $1.55/ea, history $1.55/ea. Parser looks wrong per history → flag; NEVER adopt.
  const d = gemMergeLine(P(9.30, 'ea', 1), Gm(1.55, 'ea', 1), H(1.55, 'ea'), false);
  assert.equal(d.rule, 3);
  assert.equal(d.action, 'flag');
  assert.equal(d.winner, 'review');
  assert.equal(d.unitPrice, undefined);          // the AI never writes a price — money stays deterministic
});

test('v66 rule 3: parser price IN band → parser stands silently, even if Gemini is closer to H', () => {
  // P=$2.00, G=$1.60, H=$1.55 — both inside ±50%. The AI does NOT overrule the parser just because G is closer.
  const d = gemMergeLine(P(2.00, 'ea', 1), Gm(1.60, 'ea', 1), H(1.55, 'ea'), false);
  assert.equal(d.action, 'keep');
  assert.equal(d.winner, 'P');
  assert.equal(d.rule, 7);
});

test('v66: disagreement, neither reading within the band → parser stands, silent (no overrule)', () => {
  const d = gemMergeLine(P(5.00, 'ea', 1), Gm(4.00, 'ea', 1), H(1.00, 'ea'), false);
  assert.equal(d.action, 'keep');
  assert.equal(d.winner, 'P');
  assert.equal(d.rule, 7);
});

test('v66: disagreement with NO history → parser stands, silent (the AI never overrules a price)', () => {
  const d = gemMergeLine(P(5.00, 'ea', 48), Gm(1.00, 'ea', 288), null, false);
  assert.equal(d.action, 'keep');
  assert.equal(d.winner, 'P');
  assert.equal(d.rule, 7);
});

test('rule 4: parser had NO usable price but Gemini does → adopt G, flagged (fills a blank, no overrule)', () => {
  const d = gemMergeLine(P(null, 'auto', null), Gm(3.20, 'kg', 6), null, false);
  assert.equal(d.rule, 4);
  assert.equal(d.action, 'adopt');
  assert.equal(d.unitPrice, 3.20);
  assert.equal(d.unit, 'kg');
  assert.equal(d.flagged, true);
});

test('rule 6: parser found the line, Gemini gave no usable reading → parser stands', () => {
  const d = gemMergeLine(P(4.00, 'kg', 6), Gm(null, null, null), H(4, 'kg'), false);
  assert.equal(d.rule, 6);
  assert.equal(d.action, 'keep');
  assert.equal(d.winner, 'P');
});

test('PANCAKE case: parser over-priced 6x (out of band), Gemini correct (in band) → FLAG, price untouched', () => {
  // The parser derived a per-unit price off 48/pack; Gemini read the true 288/pack. Compared to H=$1.55/ea:
  // G ($1.55) lands in band, P ($9.30) does not → rule 3 FLAG. v66: flagged for a human, NOT silently adopted.
  const perUnitFromParser = 1.55 * (288 / 48);   // parser over-priced 6x because it saw 48 not 288
  const d = gemMergeLine(P(perUnitFromParser, 'ea', 48), Gm(1.55, 'ea', 288), H(1.55, 'ea'), false);
  assert.equal(d.rule, 3);
  assert.equal(d.action, 'flag');
  assert.equal(d.unitPrice, undefined);          // the parser's (wrong) price stays until the human fixes it
});

test('CHEESE case: taught pack/supplier memory resolves the line → T wins, no conflict', () => {
  // Even though G disagrees wildly, a taught line is rule 1 — the disagreement is never surfaced.
  const d = gemMergeLine(P(3.20, 'ea', 105), Gm(0.30, 'ea', 105), H(3.20, 'ea'), true);
  assert.equal(d.rule, 1);
  assert.equal(d.winner, 'T');
  assert.equal(d.action, 'keep');
});

test('band boundary: Gemini exactly at ±50% of H (parser outside) → rule 3 flag', () => {
  const d = gemMergeLine(P(2.40, 'ea', 1), Gm(1.50, 'ea', 1), H(1.00, 'ea'), false, { band: 0.5 });
  // G at 1.50 == H*1.5 (boundary, inside); P at 2.40 outside → rule 3 flag (parser looks off per history).
  assert.equal(d.rule, 3);
  assert.equal(d.action, 'flag');
});

test('purity: gemMergeLine never mutates its inputs', () => {
  const p = P(5, 'ea', 1), g = Gm(4, 'ea', 1), h = H(1, 'ea');
  const pC = JSON.stringify(p), gC = JSON.stringify(g), hC = JSON.stringify(h);
  gemMergeLine(p, g, h, false);
  assert.equal(JSON.stringify(p), pC);
  assert.equal(JSON.stringify(g), gC);
  assert.equal(JSON.stringify(h), hC);
});
