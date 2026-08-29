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
 * paired with hand-written facts. It LOOKED like insCostBase's output and it was not: the real
 * function put no name in `facts` at all, so every assertion about name-swapping was true of a
 * fixture nobody shipped. CLAUDE.md's roster records this shape repeatedly - a fixture written from
 * the same belief as the code agrees with it.
 * ⚠️ BATCH 220 CLOSED THE DIVERGENCE FROM THE OTHER END: the three families now publish their subject,
 * and the parity fixture carries a `name` because the real one does. The warning stands as a rule -
 * a hand-written facts/text pair is a guess about a builder until a test calls the builder - but the
 * specific claim it was making about insCostBase is no longer true, and is left written out because
 * this file exists to record what was measured rather than to stay quotable.
 *
 * So this file builds each family with the REAL builder, takes the REAL {facts, text} it produces,
 * and asks the validator what it protects. Where a family is NOT protected, that is asserted as the
 * current truth with a pointer, so the gap is visible in the suite rather than discoverable only by
 * a reviewer who happens to look. ⚠️ No such assertion is live right now - the one this file shipped
 * with (insCostBase's subject unprotected) was closed by 220 and inverted below. Keep the practice:
 * an asserted gap is what makes a fix turn something RED rather than quietly changing status.
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
  out.concentration = X.insConcentration(
    { name: 'Fresh Co', plates: 11, total: 14, suppliers: 3, coverage: 0.8, ptsPer10: 1.4 })[0];
  out.anomaly = X.insPriceAnomaly({ name: 'Saffron', unit: 'kg', top: 55.2, next: 13.1, count: 9 })[0];
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

/* ============================================================================================
 * THE SUBJECT. Batch 220, closing docs/QUEUE.md item 7 - and the item was WRONG about how, which is
 * the part worth reading before changing anything here.
 *
 * The item said: put each family's subject in `facts` "so the existing name check covers it". It does
 * not. `namesAreSubsequence` deliberately lets a rewording DROP a name, and SUBSTITUTING one reads to
 * it as exactly that - the candidate's name sequence for "Chicken, up 18% across 5 plates" against the
 * name "Beef" is EMPTY, and an empty sequence is a subsequence of everything. Measured with the key
 * added and nothing else changed: the swap was still ACCEPTED.
 * ⚠️ So the facts key ALONE would have been a cosmetic fix - it turns the old gap assertion below red
 * (the name is now in facts) while leaving the defect exactly where it was. That is this repo's
 * most-recorded failure: a change that makes a hole invisible rather than absent.
 * The other half is `namesAllPresent` in api/_insight.js and `gemNamesAllPresent` in js/app.js:
 * presence is a SEPARATE requirement from order. Why it went unseen is worth keeping too - the
 * two-name families hid it. Swapping BOTH names in insCategory reorders the sequence and is caught,
 * so the rule looked like it worked; it never covered a family naming ONE subject.
 *
 * Each family below gets a PAIR: the swap is refused, and a faithful rewording that keeps the subject
 * still passes - or "presence" could be satisfied by rejecting everything, which is the false-reject
 * failure mode with no symptom (the deterministic template is always the fallback, so the feature
 * looks like it is working while never working).
 * ========================================================================================= */

const SUBJECTS = [
  ['insCostBase', 'costbase', 'Beef', 'Chicken', ['is most of it.', 'is the bulk of it.']],
  ['insConcentration', 'concentration', 'Fresh Co', 'Harbour Meats', ['is in', 'features in']],
  ['insPriceAnomaly', 'anomaly', 'Saffron', 'Cinnamon', ['worth checking', 'worth a check']],
];

for (const [fn, key, subject, impostor, [from, to]] of SUBJECTS) {
  test(`REAL ${fn}: its subject is in FACTS, not only in the text`, () => {
    const ins = build()[key];
    assert.deepStrictEqual(I.factNames(ins.facts), [subject],
      'the subject must be published, or the name check has nothing to sequence');
    assert.ok(ins.text.includes(subject), 'and the text really does name it');
  });

  test(`REAL ${fn}: swapping the subject for another is REFUSED`, () => {
    const ins = build()[key];
    const swapped = ins.text.split(subject).join(impostor);
    assert.notStrictEqual(swapped, ins.text, 'the swap actually changed the sentence');
    assert.deepStrictEqual(
      I.numberSkeleton(swapped), I.numberSkeleton(ins.text),
      'every figure and symbol is UNCHANGED - the subject is the only signal left');
    assert.strictEqual(I.polarityOf(swapped), I.polarityOf(ins.text), 'and the direction is unchanged too');
    assert.strictEqual(
      I.validatePhrasing(swapped, I.factNumbers(ins.facts), ins.text, I.factNames(ins.facts)), null,
      'if this goes green the owner can be pointed at the wrong subject - read the block above');
  });

  test(`REAL ${fn}: a faithful rewording that keeps the subject still passes`, () => {
    const ins = build()[key];
    const ok = ins.text.replace(from, to);
    assert.notStrictEqual(ok, ins.text, 'the rewording actually changed the sentence');
    assert.ok(I.validatePhrasing(ok, I.factNumbers(ins.facts), ins.text, I.factNames(ins.facts)),
      'presence must not be satisfiable by rejecting every rewording');
  });
}

/* The two-name family, kept as the case that DID work and therefore hid the one above: here the swap
   is caught by ORDER, with presence satisfied on both sides, so the two rules are visibly different
   things rather than one rule written twice. */
test('REAL insCategory: with TWO names the swap is caught by ORDER, presence being satisfied either way', () => {
  const ins = build().category;
  const names = I.factNames(ins.facts);
  const swapped = ins.text.replace(/Salads/g, '\u0001').replace(/Mains/g, 'Salads').replace(/\u0001/g, 'Mains');
  assert.deepStrictEqual(
    I.nameSequence(swapped, names).slice().sort(), I.nameSequence(ins.text, names).slice().sort(),
    'both names are still present - so presence alone could NOT catch this one');
  assert.strictEqual(I.validatePhrasing(swapped, I.factNumbers(ins.facts), ins.text, names), null,
    'and order catches it');
});
