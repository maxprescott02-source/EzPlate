/*
 * inv-gemini-match.test.js — the PURE suspected-wrong-match decision (v63 item 2).
 *
 * gemMatchSuspect is extracted straight from js/app.js via _extract (no DOM, no live API, no
 * PRODUCTS): the caller passes the already-ranked AI candidates and the canonical price
 * readings/histories as primitives, so the whole decision is testable against canned inputs.
 *
 * The rule mirrors the price rules: never silent, never auto-applies. It only decides whether
 * to FLAG "check match" and rank the AI product first; the human still ticks.
 */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { gemMatchSuspect } = require('./_extract.js');

const cand = (id, coverage) => ({ id, coverage });

test('no AI candidates → not suspect', () => {
  assert.equal(gemMatchSuspect({ bestId: 'P1', aiCands: [] }).suspect, false);
});

test('AI top candidate IS the local match → not suspect (agreement)', () => {
  const d = gemMatchSuspect({ bestId: 'P1', localCov: 0.6, aiCands: [cand('P1', 0.9), cand('P2', 0.4)] });
  assert.equal(d.suspect, false);
});

test('the maple-syrup case: AI names a clearly better DIFFERENT product → suspect, flagged, ranked first', () => {
  // local matched P_TABLE (table syrup) weakly; the invoice text really reads "maple syrup" → P_MAPLE.
  const d = gemMatchSuspect({
    bestId: 'P_TABLE', localCov: 0.35,
    aiCands: [cand('P_MAPLE', 0.8), cand('P_TABLE', 0.3)]
  });
  assert.equal(d.suspect, true);
  assert.equal(d.suggestId, 'P_MAPLE');
  assert.ok(d.coverage >= 0.5);
});

test('a real price rise on the CORRECT match → NOT a suspected wrong match', () => {
  // AI agrees the product is P1 (top candidate), price just moved → this is a price change, not a mis-match.
  const d = gemMatchSuspect({
    bestId: 'P1', localCov: 0.8,
    aiCands: [cand('P1', 0.85)],
    gCanon: { cat: 'kg', per: 12 }, localHist: { per: 9, cat: 'kg' }
  });
  assert.equal(d.suspect, false);
});

test('v65 WIDENED: a CONFIDENT-but-wrong parser match is now flagged when Gemini names a different product', () => {
  // The common painful case: the parser matched P_TABLE with HIGH confidence (0.85), but the invoice
  // really says maple syrup. Pre-v65 this never fired (Gemini had to beat the parser's confidence).
  const d = gemMatchSuspect({
    bestId: 'P_TABLE', localCov: 0.85,               // parser was very sure — no longer a shield
    aiCands: [cand('P_MAPLE', 0.7), cand('P_TABLE', 0.2)]
  });
  assert.equal(d.suspect, true);
  assert.equal(d.suggestId, 'P_MAPLE');
});

test('v65 WIDENED: a solid name match (>=0.45) fires WITHOUT needing price corroboration', () => {
  const d = gemMatchSuspect({
    bestId: 'P_LOCAL', localCov: 0.6,
    aiCands: [cand('P_AI', 0.5), cand('P_LOCAL', 0.2)]   // no histories at all
  });
  assert.equal(d.suspect, true);
  assert.equal(d.suggestId, 'P_AI');
});

test('a thin name match (<0.45) with price history backing the AI product → suspect (corroborated)', () => {
  const d = gemMatchSuspect({
    bestId: 'P_LOCAL',
    aiCands: [cand('P_AI', 0.35), cand('P_LOCAL', 0.15)],
    gCanon: { cat: 'kg', per: 20 },
    localHist: { per: 5, cat: 'kg' },   // line ($20/kg) is nowhere near local's $5/kg
    suggHist: { per: 19, cat: 'kg' }    // …but sits right on the AI product's $19/kg
  });
  assert.equal(d.suspect, true);
  assert.equal(d.suggestId, 'P_AI');
  assert.equal(d.corroborated, true);
});

test('a thin name match (<0.45) with NO corroborating history → not suspect (the floor)', () => {
  const d = gemMatchSuspect({
    bestId: 'P_LOCAL',
    aiCands: [cand('P_AI', 0.35), cand('P_LOCAL', 0.15)]
    // 0.35 is below the 0.45 name floor and there's no price backing → stays quiet
  });
  assert.equal(d.suspect, false);
});

test('near-tie in Gemini\'s own ranking → ambiguity, not a wrong match (margin guard)', () => {
  const d = gemMatchSuspect({
    bestId: 'P_LOCAL',
    aiCands: [cand('P_AI', 0.6), cand('P_LOCAL', 0.55)]   // Gemini barely prefers P_AI → don't cry wolf
  });
  assert.equal(d.suspect, false);
});

test('a thin name match (<0.45) where price fits the LOCAL match → not suspect', () => {
  const d = gemMatchSuspect({
    bestId: 'P_LOCAL',
    aiCands: [cand('P_AI', 0.35), cand('P_LOCAL', 0.15)],
    gCanon: { cat: 'kg', per: 5 },
    localHist: { per: 5, cat: 'kg' },   // line matches LOCAL history → local is plausible → not corroborated
    suggHist: { per: 19, cat: 'kg' }
  });
  assert.equal(d.suspect, false);
});

test('pure: does not mutate its input', () => {
  const input = { bestId: 'P_TABLE', localCov: 0.35, aiCands: [cand('P_MAPLE', 0.8), cand('P_TABLE', 0.3)] };
  const snap = JSON.stringify(input);
  gemMatchSuspect(input);
  assert.equal(JSON.stringify(input), snap);
});
