/*
 * insight-real-templates.test.js - batch 215, written because the second pre-push review found two
 * defects the batch's own tests could not see, and named the reason exactly:
 *
 *   "No test ever calls the real insCostBase / insConcentration / insPriceAnomaly / insLongStanding
 *    functions and threads their actual facts/text pairing through the validator, so the mismatch
 *    between what those functions put in `facts` and what their `text` actually names was never
 *    exercised."
 *
 * WARNING - THAT IS THE FIXTURE PROBLEM ONE LEVEL UP. tests/insight-parity.test.js and the meaning
 * half of tests/api-insight.test.js both use a hand-written "Beef, up 18% across 5 plates" sentence
 * paired with hand-written facts. It LOOKS like insCostBase's output and it is not: the real
 * function puts no name in `facts` at all. Every assertion about name-swapping was therefore true of
 * a fixture nobody ships. CLAUDE.md's roster records this shape repeatedly - a fixture written from
 * the same belief as the code agrees with it.
 *
 * So this file builds each family with the REAL builder, takes the REAL {facts, text} it produces,
 * and asks the validator what it protects. Where a family is NOT protected, that is asserted as the
 * current truth with a pointer, so the gap is visible in the suite rather than discoverable only by
 * a reviewer who happens to look.
 */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const X = require('./_extract.js');
const I = require('../api/_insight.js');

function build() {
  const out = {};
  out.costbase = X.insCostBase({ pts: 3.2, ingPct: 18, plates: 5, name: 'Beef', sinceLabel: 'March' })[0];
  out.longstanding = X.insLongStanding({ name: 'Kebab', sinceLabel: 'March', months: 4, priceHeld: false })[0];
  out.category = X.insCategory(
    [{ cost: 2, menuPrice: 10, section: 'Salads' }, { cost: 2, menuPrice: 10, section: 'Salads' },
     { cost: 3.5, menuPrice: 10, section: 'Mains' }, { cost: 3.5, menuPrice: 10, section: 'Mains' }], 0.3)[0];
  return out;
}

test('the real builders still produce the {facts, text} shape this file reasons about', () => {
  const b = build();
  for (const k of Object.keys(b)) {
    assert.ok(b[k], k + ' built an insight - if undefined the seed no longer clears its floor');
    assert.ok(b[k].text && b[k].text.length > 10, k + ' has template text');
    assert.ok(b[k].facts && typeof b[k].facts === 'object', k + ' has facts');
  }
});

/* ⚠️ 215 (second pass) — WHY THE FIGURE ORDER IS LOAD-BEARING, PINNED ON THE FAMILY THAT PROVES IT.
   The ordered-subsequence rule is the strictest thing this validator does, and it is the one most
   likely to be "relaxed" later by someone who has just watched it reject a perfectly good sentence.
   `insDrift` is the answer to that: it renders "lifts it from 25% to 40%" — two BARE percentages,
   with no name between them, no unit word, and the same symbol. Nothing but their ORDER
   distinguishes them, so under set membership (or any binding to names or units) "from 40% to 25%"
   validates clean, and a plate whose food cost got materially WORSE is reported as improving.
   These two tests are a matched pair on purpose: one proves the swap is refused, the other proves a
   faithful rewording of the same sentence still passes, so the rule cannot be satisfied by simply
   rejecting everything. */
test('REAL insDrift: swapping the from/to percentages is caught by ORDER ALONE', () => {
  const ins = X.insDrift({ name: 'Burger', sinceLabel: 'March', up: 1.40, fromPct: 25, toPct: 40, priceHeld: false })[0];
  const sk = I.numberSkeleton(ins.text);
  const pcts = sk.filter((e) => e.u === '%');
  assert.strictEqual(pcts.length, 2, 'the template really does carry two bare percentages');
  assert.deepStrictEqual(I.factNames(ins.facts), ['Burger'],
    'and only ONE name, which therefore cannot bind either percentage to a subject');
  const swapped = ins.text.replace('from 25% to 40%', 'from 40% to 25%');
  assert.notStrictEqual(swapped, ins.text, 'the swap actually changed the sentence');
  // the set is identical, so this is exactly the case the pre-215 validator accepted
  assert.deepStrictEqual(
    I.numberSkeleton(swapped).map((e) => e.v).slice().sort(),
    sk.map((e) => e.v).slice().sort(),
    'the multiset of figures is UNCHANGED — order is the only signal left');
  assert.strictEqual(
    I.validatePhrasing(swapped, I.factNumbers(ins.facts), ins.text, I.factNames(ins.facts)), null,
    'if this goes green the ordering rule was relaxed — read the comment above before doing that');
});

test('REAL insDrift: a faithful rewording that keeps the figure order still passes', () => {
  const ins = X.insDrift({ name: 'Burger', sinceLabel: 'March', up: 1.40, fromPct: 25, toPct: 40, priceHeld: false })[0];
  const ok = ins.text.replace('at today\u2019s price that lifts it', 'at today\u2019s price that takes it');
  assert.notStrictEqual(ok, ins.text, 'the rewording actually changed the sentence');
  assert.ok(I.validatePhrasing(ok, I.factNumbers(ins.facts), ins.text, I.factNames(ins.facts)),
    'the rule must not be satisfied by rejecting everything');
});

test('REAL insCategory: swapping the two section names is caught', () => {
  const ins = build().category;
  const names = I.factNames(ins.facts).slice().sort();
  assert.deepStrictEqual(names, ['Mains', 'Salads'], 'this family DOES carry its names in facts');
  const swapped = ins.text.replace(/Salads/g, '\u0001').replace(/Mains/g, 'Salads').replace(/\u0001/g, 'Mains');
  assert.notStrictEqual(swapped, ins.text, 'the swap actually changed the sentence');
  assert.strictEqual(I.validatePhrasing(swapped, I.factNumbers(ins.facts), ins.text, I.factNames(ins.facts)), null);
});

test('REAL insLongStanding: reversing over/under target is caught', () => {
  const ins = build().longstanding;
  assert.match(ins.text, /\bnot\b|\bno\b/, 'the template really does contain a negator, which is the trap');
  assert.strictEqual(I.polarityOf(ins.text), 'up', 'and the negator no longer suppresses its direction');
  const flipped = ins.text.replace('over target', 'under target');
  assert.notStrictEqual(flipped, ins.text);
  assert.strictEqual(
    I.validatePhrasing(flipped, I.factNumbers(ins.facts), ins.text, I.factNames(ins.facts)), null);
});

test('REAL insLongStanding: a faithful rewording of it still passes', () => {
  const ins = build().longstanding;
  const ok = ins.text.replace('has been over target', 'has sat over target');
  assert.ok(I.validatePhrasing(ok, I.factNumbers(ins.facts), ins.text, I.factNames(ins.facts)));
});

/* KNOWN GAP, ASSERTED AS IT STANDS. insCostBase names the culprit ingredient in its TEXT and puts no
   name in its FACTS, so the name-sequencing defence has nothing to sequence and a rewording may
   blame a different ingredient with every figure intact. Two more families are the same shape
   (insConcentration names a supplier, insPriceAnomaly a product).
   It is NOT fixed here because the fix belongs in the insight ENGINE - adding the name to each
   family's facts - which is a different surface from the validator, is a mutation target, and is
   covered by a large existing suite. It is docs/QUEUE.md's "three insight families do not put their
   subject in facts".
   This test asserts the CURRENT truth so the gap is visible in the suite. When the queue item ships,
   this goes red and makes whoever fixes it come here and invert it. */
test('KNOWN GAP: insCostBase names its culprit only in the text, so a name swap is NOT caught', () => {
  const ins = build().costbase;
  assert.deepStrictEqual(I.factNames(ins.facts), [], 'no name in facts - this is the gap, not an oversight here');
  assert.match(ins.text, /Beef/, 'while the text names the ingredient');
  const swapped = ins.text.split('Beef').join('Chicken');
  assert.notStrictEqual(swapped, ins.text);
  assert.notStrictEqual(
    I.validatePhrasing(swapped, I.factNumbers(ins.facts), ins.text, I.factNames(ins.facts)), null,
    'if this went RED the queue item shipped - invert this test and delete the gap note');
});
