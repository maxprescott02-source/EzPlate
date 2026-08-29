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

/* ⚠️ 215 (second pass) — THE PROMPT MUST WANT WHAT THE VALIDATOR ALLOWS, and it did not.
   validatePhrasing compares the candidate's figures against the template's as an ORDERED
   subsequence, while this same prompt said "FRONT-LOAD the fact" — which, on a template whose
   aggregate comes first (insCostBase: "…is 3.2 pts higher … Beef, up 18% across 5 plates"), asks
   for exactly the reordering the validator then throws away. Measured while fixing it: 4 of 10
   faithful rewordings were rejected, every one a clause reorder.
   That failure is INVISIBLE — a rejected line falls back to the deterministic template, so the
   panel looks like it is working while the phrasing call is paid for and discarded, and the café's
   costing data has already gone to Google either way.
   This test is the join between the two halves: relax the ordering rule and the drift tests in
   tests/insight-real-templates.test.js go red; delete the ordering instruction and this one does. */
test('buildInsightPrompt tells the model to keep the figures in the ORDER given', () => {
  const p = I.buildInsightPrompt([insight()]);
  assert.match(p, /KEEP THE FIGURES IN THE ORDER GIVEN/i);
  assert.match(p, /same sequence/i);
  // and front-loading is still asked for — by SUBJECT, which is the form that survives the check
  assert.match(p, /leading with the SUBJECT/i);
});

/* ⚠️ 215 (third review round) — AND THE TWO PRE-EXISTING BULLETS MUST AGREE WITH IT.
   The first fix added the ordering rule as a NEW bullet and left "FRONT-LOAD the fact" and "Vary your
   sentence shapes" untouched, so the prompt still contradicted itself and the commit claiming
   otherwise was wrong. Caught by the pre-push review, which read the diff rather than the claim.
   A prompt is not a list of independent rules — the model reads all of them — so a constraint added
   at the bottom does not amend an invitation at the top. These assertions pin the reconciliation at
   the two sites that carried it, because that is where a later editor will undo it. */
test('the FRONT-LOAD and vary-your-shapes rules do not contradict the ordering rule', () => {
  const p = I.buildInsightPrompt([insight()]);
  /* The prompt is assembled from an array of lines and these rules WRAP, so a bullet's own text can
     straddle two entries. Collapse all whitespace before matching rather than filtering line by
     line — the first draft of this test filtered lines, missed the continuation, and failed on a
     prompt that was actually correct. */
  const flat = p.replace(/\s+/g, ' ');
  assert.match(flat, /Front-load by naming the SUBJECT first/i,
    'the front-load bullet must say WHAT to put first, or it reads as "lead with the figure"');
  assert.match(flat, /not by moving a figure to the front/i,
    'and must exclude the reading the ordering rule forbids');
  assert.match(flat, /vary the wording around the figures rather than their order/i,
    'asking for varied shapes without excluding figure order asks for rejected output');
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

/* ⚠️ 220 — THE SUBJECT, AND WHY IT IS A SEPARATE RULE FROM ORDER RATHER THAN A STRONGER ORDER RULE.
   `namesAreSubsequence` lets a rewording DROP a name (deliberately - see the omit-a-fact test above,
   which is the same freedom for figures). SUBSTITUTING a name reads to it as dropping one: the
   candidate below names nothing in the fact list, so its name sequence is EMPTY, and an empty sequence
   is a subsequence of everything. Order therefore accepted it, every figure and symbol identical,
   and the owner was told the wrong ingredient drove the rise. `namesAllPresent` is the second half.
   The three-argument form is deliberately UNCHANGED and still exercised by the tests above: with no
   names supplied there is nothing to require, so an old caller cannot start failing. */
test('220: the SUBJECT may not be substituted, even though a name may still be dropped', () => {
  const NAMES = ['Beef'];
  assert.equal(
    I.validatePhrasing('Chicken, up 18% across 5 plates, is most of it.', MEANING_ALLOWED, MEANING_TPL, NAMES), null,
    'same figures, same symbols, same direction - only the ingredient blamed has changed');
  assert.ok(
    I.validatePhrasing('Beef is up 18% and leads the rise.', MEANING_ALLOWED, MEANING_TPL, NAMES),
    'and dropping a FIGURE is still allowed, so this did not quietly repeal the rule above');
  assert.ok(
    I.validatePhrasing('Beef, up 18% across 5 plates, drives it.', MEANING_ALLOWED, MEANING_TPL, NAMES),
    'a faithful rewording that keeps the subject still passes');
});

test('220: with NO names supplied the rule is vacuous, not a blanket refusal', () => {
  // The failure this guards is a presence check that requires names the caller never published:
  // every family without a subject (insComplexity, healthyLine) would then have every rewording
  // rejected, and a rejected line is INVISIBLE because the template is the fallback.
  assert.ok(I.validatePhrasing('Chicken, up 18% across 5 plates, is most of it.', MEANING_ALLOWED, MEANING_TPL, []));
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
