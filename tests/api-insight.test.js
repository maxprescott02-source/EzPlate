/*
 * api-insight.test.js — the server-side insight phrasing validator (v63 item 3b).
 *
 * require()s the PURE api/_insight.js (no network, no key). The whole point of this layer is
 * the HARD LAW: the model may rephrase but may NEVER produce a figure. validatePhrasing /
 * validateInsightResponse are the enforcement — any number not handed to the model gets the
 * line rejected and the deterministic template kept.
 */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const I = require('../api/_insight.js');

const insight = () => ({
  facts: { pts: 10, menuPrice: 15, targetPrice: 20, targetPct: 30 },
  text: 'Barra & Chips is 10 pts over target — $15.00 → $20.00 gets you to ~30%.'
});

test('factNumbers pulls only the numeric fact values', () => {
  const nums = I.factNumbers(insight().facts).sort((a, b) => a - b);
  assert.deepEqual(nums, [10, 15, 20, 30]);
  assert.deepEqual(I.factNumbers(null), []);
});

test('a warmer phrasing that keeps every number is accepted', () => {
  const allowed = I.factNumbers(insight().facts);
  const ok = I.validatePhrasing('Nudging Barra & Chips from $15.00 to $20.00 pulls it to ~30% — it is 10 pts over right now.', allowed);
  assert.ok(ok);   // returns the trimmed text, not null
});

test('a phrasing that CHANGES a number is rejected (returns null)', () => {
  const allowed = I.factNumbers(insight().facts);
  // model hallucinated $22.00 (not in the facts) → reject
  assert.equal(I.validatePhrasing('Lift Barra & Chips from $15.00 to $22.00 to hit ~30%.', allowed), null);
});

test('a phrasing that INVENTS an extra figure is rejected', () => {
  const allowed = I.factNumbers(insight().facts);
  assert.equal(I.validatePhrasing('Barra & Chips is 10 pts over — raising it 5 dollars fixes it.', allowed), null);   // "5" not a fact
});

test('empty / overlong phrasings are rejected', () => {
  const allowed = I.factNumbers(insight().facts);
  assert.equal(I.validatePhrasing('', allowed), null);
  assert.equal(I.validatePhrasing('x'.repeat(300), allowed), null);
});

test('validateInsightResponse: valid line kept, tampered line falls back to its template', () => {
  const insights = [
    insight(),
    { facts: { over: 3, total: 4, targetPct: 30 }, text: '3 of 4 costed dishes sit over your 30% target.' }
  ];
  const modelOut = JSON.stringify({
    lines: [
      { text: 'Barra & Chips runs 10 pts hot — $15.00 becomes $20.00 to reach ~30%.' },  // valid
      { text: '5 of 4 dishes are over your 30% target.' }                                 // tampered: invented "5"
    ]
  });
  const res = I.validateInsightResponse(modelOut, insights);
  assert.equal(res.status, 'ok');
  assert.equal(res.lines.length, 2);
  assert.match(res.lines[0].text, /\$20\.00/);                       // accepted rephrasing
  assert.equal(res.lines[1].text, insights[1].text);                // rejected → template kept verbatim
});

test('validateInsightResponse: malformed JSON → unavailable (client keeps all templates)', () => {
  assert.equal(I.validateInsightResponse('not json', [insight()]).status, 'unavailable');
  assert.equal(I.validateInsightResponse({ nope: true }, [insight()]).status, 'unavailable');
});

test('buildInsightPrompt fences the lines as DATA and forbids changing numbers', () => {
  const p = I.buildInsightPrompt([insight()]);
  assert.match(p, /untrusted DATA/i);
  assert.match(p, /MUST NOT introduce, change, round, or remove any number/i);
  assert.match(p, /"""/);   // the lines are fenced
});
