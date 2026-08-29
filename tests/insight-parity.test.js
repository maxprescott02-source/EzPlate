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
  ${extractVar(src, 'GEM_NEG_NEAR')}
  ${extractVar(src, 'GEM_UP_G')}
  ${extractVar(src, 'GEM_DOWN_G')}
  ${extractVar(src, 'GEM_NUM_EPS')}
  ${extractFn(src, 'gemSameNumber')}
  ${extractFn(src, 'gemNumberSkeleton')}
  ${extractFn(src, 'gemSkeletonIsSubsequence')}
  ${extractFn(src, 'gemFactNames')}
  ${extractFn(src, 'gemNameSequence')}
  ${extractFn(src, 'gemNamesAreSubsequence')}
  ${extractFn(src, 'gemNamesAllPresent')}
  ${extractFn(src, 'gemHasUnnegated')}
  ${extractFn(src, 'gemPolarityOf')}
  ${extractFn(src, 'gemPhrasingOk')}
  return { gemPhrasingOk, gemNumberSkeleton, gemPolarityOf, gemFactNames, gemNameSequence, gemSameNumber };
`)();

const TEMPLATE = 'Beef, up 18% across 5 plates, is most of it.';
/* ⚠️ `name` IS IN THIS FIXTURE BECAUSE IT IS IN THE REAL ONE. Until batch 220 insCostBase put no name
   in `facts`, so this table ran every row with an EMPTY name list and could not exercise the name
   rules in either copy at all — the fixture agreed with the code about a thing neither of them did.
   (`tests/insight-real-templates.test.js`'s header names that hazard; this is the same file it warns
   about.) The runner below now derives the server's names from these facts rather than passing `[]`,
   so both copies are asked the same question. */
const FACTS = { name: 'Beef', pts: 18, plates: 5 };
const NAMES = ['Beef'];
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
  /* ⚠️ THE TRAILING-MISMATCH CASE, ADDED BECAUSE THE MUTATION GATE FOUND IT MISSING THE HOUR THESE
     FUNCTIONS WERE FIRST LISTED AS TARGETS. Flipping `i >= tpl.length` to `i > tpl.length` in the
     subsequence walk survived the whole table above: the off-by-one only shows when the LAST figure
     a candidate carries is the one that fails to match, and every row above failed earlier than that.
     The sentence it lets through is not academic — 5 is a real fact (the plate COUNT), so the set
     check passes it, and the only thing standing between "5 plates" and "up 5%" is this comparison. */
  ['the plate count rendered as a percentage', 'Beef is up 5%.', false],
  ['a trailing figure with the wrong symbol', 'Beef, up 18% across 5%.', false],
  /* ⚠️ 220 — THE SUBSTITUTED SUBJECT, WHICH ORDER ALONE CANNOT SEE. The candidate names no fact name
     at all, so its name sequence is EMPTY — and an empty sequence is a subsequence of every sequence,
     which is why the ordered check accepted this and why putting the name in `facts` did not on its
     own fix it. Every figure, symbol and direction word here is identical to the template; the only
     thing that changed is which ingredient the owner is told to go and look at. */
  ['the SUBJECT swapped for another ingredient', 'Chicken, up 18% across 5 plates, is most of it.', false],
  ['the subject dropped entirely', 'Up 18% across 5 plates, that is most of it.', false],
  // the counterweight — presence must not be satisfiable by rejecting every rewording
  ['a rewording that keeps the subject', 'Beef leads it, up 18% across 5 plates.', true],
];

/* ============================================================================================
 * THE PRE-PUSH REVIEW'S THREE, all verified against REAL shipping templates before being fixed.
 * Two of them were FALSE REJECTS, which is the failure mode with no symptom: a rejected line falls
 * back to the deterministic template, so the feature looks like it is working while never working.
 * ========================================================================================= */
const CAT_TPL = 'Your Salads plates average 20% food cost, Mains sits at 35%.';
const CAT_FACTS = { loName: 'Salads', loPct: 20, hiName: 'Mains', hiPct: 35 };
const CAT_ALLOWED = [20, 35];

const HEALTHY_TPL = 'A healthy read — nothing sits over your 30% target across 12 costed plates, and no other pattern stands out.';
const RANGE_TPL = 'Chowder swings 24–38% with cream prices — your least predictable plate.';

test('REVIEW 1: swapping which NAME gets which number is rejected', () => {
  // Same figures, same symbols, same order — and the opposite claim about which section costs more.
  // The skeleton alone cannot see it; the names are sequenced for exactly this.
  const bad = 'Mains plates average a lean 20% food cost, while Salads sits at 35%.';
  assert.strictEqual(server.validatePhrasing(bad, CAT_ALLOWED, CAT_TPL, server.factNames(CAT_FACTS)), null);
  assert.strictEqual(client.gemPhrasingOk(bad, CAT_FACTS, CAT_TPL), false);
});

test('REVIEW 1b: a rewording that keeps the name order still passes', () => {
  const ok = 'Your Salads plates run 20% while Mains sits at 35%.';
  assert.ok(server.validatePhrasing(ok, CAT_ALLOWED, CAT_TPL, server.factNames(CAT_FACTS)));
  assert.strictEqual(client.gemPhrasingOk(ok, CAT_FACTS, CAT_TPL), true);
});

test('REVIEW 2: a negated direction word does not make a faithful rewording a reversal', () => {
  // healthyLine ships "nothing sits OVER your target" — an UP word inside a sentence meaning the
  // opposite. Saying "under target" is the same claim, and was being thrown away.
  const ok = 'Great news — every costed plate is running under the 30% target across all 12.';
  assert.ok(server.validatePhrasing(ok, [30, 12], HEALTHY_TPL, []));
  assert.strictEqual(client.gemPhrasingOk(ok, { pct: 30, plates: 12 }, HEALTHY_TPL), true);
});

test('REVIEW 3: a compact range and its spelled-out form are the same skeleton', () => {
  // insVolatility prints "swings 24–38%"; "between 24% and 38%" is the same claim.
  const ok = 'Chowder swings between 24% and 38% with cream prices.';
  assert.ok(server.validatePhrasing(ok, [24, 38], RANGE_TPL, []));
  assert.strictEqual(client.gemPhrasingOk(ok, { lo: 24, hi: 38 }, RANGE_TPL), true);
  assert.deepStrictEqual(server.numberSkeleton('24–38%'), [{ v: 24, u: '%' }, { v: 38, u: '%' }]);
});

test('REVIEW 3b: a symbol does NOT spread across a non-range', () => {
  // The counterweight: propagating backward across anything but a joiner would invent a dollar sign.
  assert.deepStrictEqual(server.numberSkeleton('5 plates cost $12'), [{ v: 5, u: '' }, { v: 12, u: '$' }]);
  assert.deepStrictEqual(client.gemNumberSkeleton('5 plates cost $12'), server.numberSkeleton('5 plates cost $12'));
});

test('REVIEW: the direction reversal is STILL rejected — negation did not blanket-disable polarity', () => {
  assert.strictEqual(server.validatePhrasing('Beef is down 18% across 5 plates.', ALLOWED, TEMPLATE, NAMES), null);
  assert.strictEqual(client.gemPhrasingOk('Beef is down 18% across 5 plates.', FACTS, TEMPLATE), false);
});

for (const [name, candidate, shouldPass] of TABLE) {
  test(`server and client agree: ${name}`, () => {
    const s = server.validatePhrasing(candidate, ALLOWED, TEMPLATE, NAMES);
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
  const s = server.validatePhrasing(bad, ALLOWED, TEMPLATE, NAMES);
  const c = client.gemPhrasingOk(bad, FACTS, TEMPLATE);
  assert.strictEqual(s !== null, true, 'if this went red the gap was closed — update docs/MAINTENANCE.md and this test');
  assert.strictEqual(c, true, 'if this went red the gap was closed — update docs/MAINTENANCE.md and this test');
});

/* The tolerance, pinned at its BOUNDARY in both copies. It was written out three times before 215 —
   the fact-set loop, the skeleton walk, and the client's copies of both — and a duplicated epsilon
   is a tolerance waiting to drift. The boundary is asserted rather than the middle, because
   `< NUM_EPS` and `<= NUM_EPS` agree everywhere except exactly on it, and a test that only checks
   "20 and 20.001 are the same" cannot tell the two apart. Found by the mutation gate the hour these
   functions were first listed as targets. */
test('the number tolerance is a HALF-CENT, exclusive, in both copies', () => {
  /* ⚠️ THE BOUNDARY PAIR IS (0, 0.005) AND THAT IS NOT ARBITRARY — the first draft of this test used
     (20, 20.005) and FAILED, because `20.005 - 20` is 0.004999999999999005 in binary floating point,
     not 0.005, so it sits INSIDE an exclusive tolerance. `0.005 - 0` is exactly the double 0.005.
     So the exclusive/inclusive distinction is only observable where the subtraction is exact, and a
     test that reaches for the "obvious" round numbers cannot see it at all. The gate found the
     mutant; this pair is what actually kills it. */
  for (const fn of [server.sameNumber, client.gemSameNumber]) {
    assert.strictEqual(fn(20, 20), true, 'identical figures are the same');
    assert.strictEqual(fn(20, 20.004), true, 'inside the tolerance');
    assert.strictEqual(fn(0, 0.005), false, 'EXACTLY on the boundary is NOT the same figure');
    assert.strictEqual(fn(0, -0.005), false, 'and symmetrically below');
    assert.strictEqual(fn(20, 20.006), false, 'outside it');
  }
});

/* ============================================================================================
 * THE PATHS THE MUTATION GATE FOUND UNTESTED, the hour these functions were first listed as
 * targets. Every one of them is a mutant that survived the whole table above.
 *
 * ⚠️ THE COMMON CAUSE IS WORTH NAMING: with a template present, the meaning checks SHADOW the
 * fact-set check. A hallucinated "$99" is rejected by the skeleton before the set ever matters, so
 * `var ok=false` could be flipped to `true` — disabling number validation outright — and every
 * template-bearing test stayed green. The set check is the ONLY check on the no-template path, and
 * that path had no client test at all.
 * ========================================================================================= */

test('GATE: with NO template the fact-set check is the only thing standing, and it stands', () => {
  // `var ok=false` -> `true` disables number validation entirely. Only a no-template case sees it.
  assert.strictEqual(client.gemPhrasingOk('Beef costs $99.', FACTS), false, 'an invented figure is refused');
  assert.strictEqual(server.validatePhrasing('Beef costs $99.', ALLOWED), null);
  // and a real fact is still allowed through on that path
  assert.strictEqual(client.gemPhrasingOk('Beef is up 18%.', FACTS), true);
  assert.ok(server.validatePhrasing('Beef is up 18%.', ALLOWED));
});

test('GATE: a null template does not accidentally become the string "null"', () => {
  // `template != null && String(template).trim()` -> `||` makes String(null) = "null" truthy, which
  // would run the meaning checks against a template that is not there and reject valid lines.
  assert.strictEqual(client.gemPhrasingOk('Beef is up 18%.', FACTS, null), true);
  assert.strictEqual(client.gemPhrasingOk('Beef is up 18%.', FACTS, ''), true);
  assert.ok(server.validatePhrasing('Beef is up 18%.', ALLOWED, null));
  assert.ok(server.validatePhrasing('Beef is up 18%.', ALLOWED, ''));
});

test('GATE: the range symbol propagates BACKWARD only, never forward', () => {
  // `out[i].u || !out[i+1].u` -> `&&` makes a leading symbol get overwritten by a trailing blank,
  // so "24%–38" would lose the % it actually has.
  assert.deepStrictEqual(server.numberSkeleton('24%–38'), [{ v: 24, u: '%' }, { v: 38, u: '' }]);
  assert.deepStrictEqual(client.gemNumberSkeleton('24%–38'), server.numberSkeleton('24%–38'));
  // and the backward case still works, which is the pair that makes the direction meaningful
  assert.deepStrictEqual(server.numberSkeleton('24–38%'), [{ v: 24, u: '%' }, { v: 38, u: '%' }]);
});

test('GATE: the length and word caps are exclusive at their exact boundary', () => {
  // `length > 240` -> `>= 240` and `words > 24` -> `>= 24` are invisible except exactly on the edge.
  const at240 = 'x'.repeat(240);
  assert.strictEqual(client.gemPhrasingOk(at240, {}), true, '240 characters is allowed');
  assert.strictEqual(client.gemPhrasingOk('x'.repeat(241), {}), false, '241 is not');
  const at24 = Array.from({ length: 24 }, () => 'w').join(' ');
  assert.strictEqual(client.gemPhrasingOk(at24, {}), true, '24 words is allowed');
  assert.strictEqual(client.gemPhrasingOk(Array.from({ length: 25 }, () => 'w').join(' '), {}), false, '25 is not');
  // the server's caps are the same numbers, and this is where that claim is checked rather than assumed
  assert.ok(server.validatePhrasing(at240, []));
  assert.strictEqual(server.validatePhrasing('x'.repeat(241), []), null);
  assert.ok(server.validatePhrasing(at24, []));
  assert.strictEqual(server.validatePhrasing(Array.from({ length: 25 }, () => 'w').join(' '), []), null);
});

test('GATE: a leading $ is not overwritten by a trailing % across a joiner', () => {
  /* `out[i].u || !out[i+1].u` -> `&&` stops the skip when BOTH figures already carry a symbol, and
     then overwrites the first one with the second. "$24–38%" would become two percentages, losing
     the fact that the first figure was money. Contrived as a sentence, cheap as an assertion, and
     the only thing distinguishing the two operators. */
  assert.deepStrictEqual(server.numberSkeleton('$24–38%'), [{ v: 24, u: '$' }, { v: 38, u: '%' }]);
  assert.deepStrictEqual(client.gemNumberSkeleton('$24–38%'), server.numberSkeleton('$24–38%'));
});

test('nested section names are counted once, at their longest match', () => {
  /* A café's sections nest: "Mains" is a substring of "Mains & Grills". Matching each name
     independently counted the short one twice — standing alone, and again inside the long one — and
     the comparison only came out right because the spurious entry appeared on BOTH sides. That is an
     accident, not a property, and it stops holding the moment a template is reworded.
     Longest-first with no overlapping claims makes the sequence mean what it says. */
  const names = ['Mains', 'Mains & Grills'];
  const tpl = 'Your Mains plates average 20% food cost, Mains & Grills sits at 35%.';
  assert.deepStrictEqual(server.nameSequence(tpl, names), ['mains', 'mains & grills']);
  assert.deepStrictEqual(client.gemNameSequence(tpl, names), server.nameSequence(tpl, names));

  const facts = { loName: 'Mains', loPct: 20, hiName: 'Mains & Grills', hiPct: 35 };
  const legit = 'Your Mains plates run 20% while Mains & Grills sits at 35%.';
  const swapped = 'Your Mains & Grills plates run 20% while Mains sits at 35%.';
  assert.ok(server.validatePhrasing(legit, [20, 35], tpl, names), 'a faithful rewording survives');
  assert.strictEqual(client.gemPhrasingOk(legit, facts, tpl), true);
  assert.strictEqual(server.validatePhrasing(swapped, [20, 35], tpl, names), null, 'the swap is still caught');
  assert.strictEqual(client.gemPhrasingOk(swapped, facts, tpl), false);
});

test('a name that is not a valid regex is matched literally, not compiled', () => {
  // "Fish (Battered)" is a legal section name and an illegal pattern. indexOf, never RegExp.
  const names = ['Fish (Battered)'];
  assert.deepStrictEqual(server.nameSequence('Fish (Battered) is 20%', names), ['fish (battered)']);
  assert.deepStrictEqual(client.gemNameSequence('Fish (Battered) is 20%', names), ['fish (battered)']);
  // and a curly apostrophe, which the app's own copy uses throughout
  assert.deepStrictEqual(server.nameSequence('Scoopy’s Special is 20%', ['Scoopy’s Special']), ['scoopy’s special']);
});

test('blank and whitespace-only names never enter the sequence', () => {
  assert.deepStrictEqual(server.factNames({ a: '', b: '   ', c: 'Real' }), ['Real']);
  assert.deepStrictEqual(client.gemFactNames({ a: '', b: '   ', c: 'Real' }), ['Real']);
  assert.deepStrictEqual(server.nameSequence('anything at all', ['', '   ']), []);
  assert.deepStrictEqual(client.gemNameSequence('anything at all', ['', '   ']), []);
});

test('negation is PROXIMATE, so a distant "not" does not disable the direction check', () => {
  /* insLongStanding ships "…over target … — 4 months, not a one-off.", where "not" negates
     "a one-off" and has nothing to do with "over target". A sentence-wide negation test returned
     null for every render of that family, so the direction guard could never fire for it — a
     chronic problem plate could be reported as fine. Found by the second pre-push review, running
     the REAL template rather than the fixture. */
  const distant = 'Kebab has been over target through every cost change since March — 4 months, not a one-off.';
  const adjacent = 'A healthy read — nothing sits over your 30% target across 12 costed plates.';
  for (const [fn, label] of [[server.polarityOf, 'server'], [client.gemPolarityOf, 'client']]) {
    assert.strictEqual(fn(distant), 'up', `${label}: a far-away negator does not suppress the direction`);
    assert.strictEqual(fn(adjacent), null, `${label}: a negator just before it does`);
  }
});

test('a contraction counts as a negator, which \\bn\'t\\b could never do', () => {
  // There is no word boundary inside "isn't", so the original alternative could not match any real
  // contraction — it silently narrowed the safety net the polarity check depends on.
  for (const fn of [server.polarityOf, client.gemPolarityOf]) {
    assert.strictEqual(fn("Kebab isn't over target"), null, 'straight apostrophe');
    assert.strictEqual(fn('Kebab isn\u2019t over target'), null, 'and the curly one the app copy uses');
    assert.strictEqual(fn('Kebab is over target'), 'up', 'while the un-negated form still reads as up');
  }
});
