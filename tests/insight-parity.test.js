/*
 * insight-parity.test.js — batch 215.
 *
 * WHY THIS FILE EXISTS. The insight phrasing is validated TWICE, by two copies of the same logic:
 * `validatePhrasing` in `api/_insight.js` (Node, the server) and `gemPhrasingOk` in `js/app.js` (the
 * browser). CLAUDE.md forbids no new dependencies and there is no build step, so a browser script
 * cannot `require()` the server module — **the duplication is a constraint of this project, not an
 * oversight, and it is not going away.**
 *
 * CLAUDE.md's rule for exactly this case is the one applied here: *"If a stub is genuinely
 * unavoidable, assert the stub against the real function first — one test that they agree — so the
 * copy cannot drift silently."* That is the whole job of this file.
 *
 * ⚠️ IT COMPARES VERDICTS, NOT SOURCE. Both functions are EXECUTED against one shared table. A test
 * that grepped the two bodies for matching regexes would pass on two functions that agree about
 * their text and disagree about their behaviour, which is this repo's most-recorded defect shape.
 *
 * The table doubles as the meaning suite: `tests/api-insight.test.js` owns the server's own
 * contract, and every row here is a sentence a model could plausibly return.
 */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { loadApp, extractFn, extractVar } = require('./_extractfn.js');
const server = require('../api/_insight.js');

/* The client copy, EXTRACTED and run — not mirrored. */
const src = loadApp();
// eslint-disable-next-line no-new-func
const client = new Function(`
  "use strict";
  ${extractVar(src, 'GEM_UP_WORDS')}
  ${extractVar(src, 'GEM_DOWN_WORDS')}
  ${extractFn(src, 'gemNumberSkeleton')}
  ${extractFn(src, 'gemSkeletonIsSubsequence')}
  ${extractFn(src, 'gemPolarityOf')}
  ${extractFn(src, 'gemPhrasingOk')}
  return { gemPhrasingOk, gemNumberSkeleton, gemPolarityOf };
`)();

const TEMPLATE = 'Beef, up 18% across 5 plates, is most of it.';
const FACTS = { pts: 18, plates: 5 };
const ALLOWED = [18, 5];

/* Every row is (name, candidate, shouldPass). The four marked FALSE are the audit's own examples,
   which the shipped validator accepted — every number "preserved" and the sentence untrue. */
const TABLE = [
  ['the template itself', TEMPLATE, true],
  ['a genuine rewording keeps the skeleton', 'Beef is up 18% across 5 plates and leads the rise.', true],
  ['a warmer rewording may omit a fact, which the docblock promises', 'Beef is up 18% and leads the rise.', true],
  ['AUDIT: % became $', 'Beef, up $18 across 5 plates, is most of it.', false],
  ['AUDIT: the two facts swapped', 'Beef, up 5% across 18 plates, is most of it.', false],
  ['AUDIT: direction reversed', 'Beef is down 18% across 5 plates.', false],
  ['a hallucinated figure', 'Beef, up 18% across 5 plates, costing $99.', false],
  ['two sentences', 'Beef is up 18%. It is across 5 plates.', false],
  ['over the word cap', ('Beef ' + 'and beef '.repeat(20) + 'is up 18% across 5 plates.'), false],
  ['empty', '', false],
  ['a synonym for up is still up', 'Beef rose 18% across 5 plates, leading the rise.', true],
  ['an ambiguous sentence does not trip polarity', 'Beef, up 18% across 5 plates, is still under target.', true],
];

for (const [name, candidate, shouldPass] of TABLE) {
  test(`server and client agree: ${name}`, () => {
    const s = server.validatePhrasing(candidate, ALLOWED, TEMPLATE);
    const c = client.gemPhrasingOk(candidate, FACTS, TEMPLATE);
    // the parity claim, which is the point of the file
    assert.strictEqual(s !== null, c,
      `server ${s !== null ? 'accepted' : 'rejected'} but client ${c ? 'accepted' : 'rejected'}: ${JSON.stringify(candidate)}`);
    // and the verdict itself, so "they agree" cannot be satisfied by both being wrong
    assert.strictEqual(c, shouldPass, `expected ${shouldPass ? 'accept' : 'reject'} for: ${JSON.stringify(candidate)}`);
  });
}

/* The skeleton is the load-bearing half, so it is compared directly as well as through the verdict.
   Both sides must read the SAME symbol off the same sentence. */
for (const s of ['up 18% across 5 plates', '$18 and 5', '-2.5% down', 'no numbers here', '18 % spaced']) {
  test(`server and client read the same skeleton: ${JSON.stringify(s)}`, () => {
    assert.deepStrictEqual(client.gemNumberSkeleton(s), server.numberSkeleton(s));
  });
}

for (const s of ['up 18%', 'down 18%', 'up but under target', 'neither word here']) {
  test(`server and client read the same polarity: ${JSON.stringify(s)}`, () => {
    assert.strictEqual(client.gemPolarityOf(s), server.polarityOf(s));
  });
}

/* ⚠️ THE RESIDUAL, PINNED AS A KNOWN GAP RATHER THAN LEFT TO BE REDISCOVERED. An inverted
   RECOMMENDATION carries the same figures, the same symbols and no direction word, so nothing in
   either copy can see it. This test asserts the CURRENT truth — both accept it — so that the day
   someone closes the gap, this test goes red and makes them come here and say so, rather than the
   gap quietly changing status with no record. */
test('KNOWN GAP: an inverted recommendation is accepted by both, and that is recorded not fixed', () => {
  const bad = 'Beef, up 18% across 5 plates, is fine and needs no action.';
  const s = server.validatePhrasing(bad, ALLOWED, TEMPLATE);
  const c = client.gemPhrasingOk(bad, FACTS, TEMPLATE);
  assert.strictEqual(s !== null, true, 'if this went red the gap was closed — update docs/MAINTENANCE.md and this test');
  assert.strictEqual(c, true, 'if this went red the gap was closed — update docs/MAINTENANCE.md and this test');
});
