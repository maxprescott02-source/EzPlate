/*
 * api-insight.test.js — the server-side insight phrasing validator (v63 item 3b).
 *
 * require()s the PURE api/_insight.js (no network, no key). The whole point of this layer is
 * the HARD LAW: the model may rephrase but may NEVER produce a figure. validatePhrasing /
 * validateInsightResponse are the enforcement — any number not handed to the model gets the
 * line rejected and the deterministic template kept.
 *
 * ⚠️ 215 — THAT PARAGRAPH DESCRIBED THIS FILE ACCURATELY AND DESCRIBED THE FEATURE FALSELY, and
 * the queue item was as much about this file as about the validator. Every one of the five
 * validatePhrasing assertions here tested the SAME half — that a number NOT in the fact set is
 * rejected — while the summary above implied the numbers were protected. They were not: a
 * sentence could swap two facts, turn a percentage into a dollar amount or reverse the direction,
 * keep the set intact, and pass.
 * The MEANING half is now asserted below, by name, and the parity with the client's second copy
 * of this logic lives in tests/insight-parity.test.js.
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

test('v74: a waffly over-24-word phrasing is rejected (scannability cap), a tight one passes', () => {
  const allowed = I.factNumbers(insight().facts);   // 10 is a fact
  const waffle = 'Barra and Chips is sitting at a whisker over your target and honestly that is probably worth taking a really good careful look at whenever you next get a spare moment to review it.';
  assert.ok(waffle.trim().split(/\s+/).length > 24);
  assert.equal(I.validatePhrasing(waffle, allowed), null);           // too many words → rejected → caller keeps the template
  assert.ok(I.validatePhrasing('Barra & Chips is 10 pts over target — worth a glance.', allowed));   // tight, same fact → accepted
});

test('v74: word-cap boundary — exactly 24 words accepted, 25 rejected', () => {
  const allowed = I.factNumbers(insight().facts);
  assert.ok(I.validatePhrasing(Array(24).fill('word').join(' '), allowed));
  assert.equal(I.validatePhrasing(Array(25).fill('word').join(' '), allowed), null);
});

test('v74: a multi-sentence phrasing is rejected (one sentence only); em-dash + decimal is fine', () => {
  const allowed = I.factNumbers(insight().facts);
  assert.equal(I.validatePhrasing('Barra & Chips is 10 pts over. Worth a glance.', allowed), null);   // two sentences
  assert.ok(I.validatePhrasing('Barra & Chips is 10 pts over — worth a glance at $15.00.', allowed));  // one sentence, decimal safe
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

// v92 (Max): the near-miss line came back reading as a shortfall. The engine controls the framing of
// its own copy; the rephrasing layer must not be free to invert it, especially under a panel headed
// "What needs attention", which pulls a model towards a concerned register.
test('buildInsightPrompt forbids re-framing a neutral or good line as a problem', () => {
  const p = I.buildInsightPrompt([insight()]);
  assert.match(p, /KEEP THE FRAMING YOU ARE GIVEN/i);
  assert.match(p, /never add "only"/i);
});

/* ============================================================================================
 * 215 — THE MEANING HALF. Every assertion above this line tests the SET: a figure the model was
 * not given is rejected. These test what the set cannot see, and each one is a sentence that
 * PASSED the shipped validator with every number "preserved".
 *
 * The template is the second argument's whole point: it is the deterministic sentence the app
 * already computed, so it IS the meaning. Comparing against a bag of values never was.
 * ========================================================================================= */
const MEANING_TPL = 'Beef, up 18% across 5 plates, is most of it.';
const MEANING_ALLOWED = [18, 5];

test('215: a percentage may not become a dollar amount', () => {
  // shipped behaviour: ACCEPTED. $18 and 18% "preserve" the same number and mean different things.
  assert.equal(I.validatePhrasing('Beef, up $18 across 5 plates, is most of it.', MEANING_ALLOWED, MEANING_TPL), null);
});

test('215: the two facts may not swap places', () => {
  // shipped behaviour: ACCEPTED. Same set, both figures reattached to the wrong noun.
  assert.equal(I.validatePhrasing('Beef, up 5% across 18 plates, is most of it.', MEANING_ALLOWED, MEANING_TPL), null);
});

test('215: the direction may not be reversed', () => {
  // shipped behaviour: ACCEPTED. Identical figures and symbols; the opposite claim about the money.
  assert.equal(I.validatePhrasing('Beef is down 18% across 5 plates.', MEANING_ALLOWED, MEANING_TPL), null);
});

/* The other side of each, because a validator that rejects everything passes all three above and
   destroys the feature — the failure mode would be invisible, since a rejected line silently falls
   back to the template it was meant to warm up. */
test('215: a genuine rewording still passes', () => {
  assert.equal(
    I.validatePhrasing('Beef is up 18% across 5 plates and leads the rise.', MEANING_ALLOWED, MEANING_TPL),
    'Beef is up 18% across 5 plates and leads the rise.');
});

test('215: a synonym for the direction still passes', () => {
  assert.ok(I.validatePhrasing('Beef rose 18% across 5 plates, leading the rise.', MEANING_ALLOWED, MEANING_TPL));
});

test('215: omitting a fact is still allowed, as this file\'s docblock promises', () => {
  // The check is a SUBSEQUENCE, not an equality, precisely to keep this. An equality would have
  // repealed a documented freedom while looking like a tightening.
  assert.ok(I.validatePhrasing('Beef is up 18% and leads the rise.', MEANING_ALLOWED, MEANING_TPL));
});

test('215: a sentence carrying BOTH directions does not trip the polarity check', () => {
  // "up … under" is ambiguous, and this app's own templates produce it. Guessing would reject
  // good sentences, so the check abstains unless both sides are definite and disagree.
  assert.ok(I.validatePhrasing('Beef, up 18% across 5 plates, is still under target.', MEANING_ALLOWED, MEANING_TPL));
});

test('215: validateInsightResponse threads the template, not just the fact set', () => {
  // The end-to-end proof that the template actually reaches the validator. Asserted through the
  // public entry point rather than by grepping the call site for an argument (roster entry 167).
  const insights = [{ facts: { pts: 18, plates: 5 }, text: MEANING_TPL }];
  const swapped = { lines: [{ text: 'Beef, up 5% across 18 plates, is most of it.' }] };
  const out = I.validateInsightResponse(swapped, insights);
  assert.equal(out.lines[0].text, MEANING_TPL, 'the swapped line is rejected and the template kept');
});

test('215: with no template the set check still stands alone', () => {
  // The pre-215 contract, kept so the function cannot throw on a caller that predates the argument.
  assert.ok(I.validatePhrasing('Beef, up 5% across 18 plates, is most of it.', MEANING_ALLOWED));
  assert.equal(I.validatePhrasing('Beef costs $99.', MEANING_ALLOWED), null);
});
