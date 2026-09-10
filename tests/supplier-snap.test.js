/*
 * supplier-snap.test.js — the add-new-product form must not offer a supplier the cafe already has.
 *
 * Max, 11 Sep 2026, from a real import: **"a supplier that already exists B&E was being suggested to
 * create a new supplier B&E Poultry product - this sort of double up shouldnt be possible it should
 * check first if there is already a matching supplier."**
 *
 * WHY IT HAPPENED. The form prefills Supplier from the AI's reading of the letterhead, or failing
 * that from `invSupplier`. Neither was ever compared against the suppliers already on his products.
 * A letterhead that says a little more than his stored spelling therefore proposed a second one.
 *
 * WHY IT MATTERS MORE THAN IT LOOKS. Suppliers are not a table — they are a string on each product —
 * so a "new supplier" is just a spelling, and nothing refuses it. The costs land later: the Products
 * screen's supplier filter grows a near-duplicate, and `memKey` splits taught packs across the two,
 * so a pack taught under one is invisible to the other.
 *
 * ⚠️ THE DIRECTION IS THE DESIGN. It snaps TOWARDS what he already has and never away from it. An
 * existing name that is a whole-word prefix of the candidate wins, because his stored spelling is
 * something he typed once and the candidate is what a letterhead happened to print. The reverse is
 * never done — an existing "B&E Poultry" is not proposed for a candidate of "B&E" — because that
 * invents specificity the invoice did not carry.
 *
 * ⚠️ AND IT IS A WHOLE-WORD PREFIX, NOT A SUBSTRING. `CLAUDE.md` records batch 223 finding `Rice`
 * matched inside `Rice Noodles`, and closing that boundary the obvious way was actively harmful. The
 * same trap is here: a bare substring folds "Bidfoods Direct" into "Bidfood". The test below that
 * matters most is the one asserting that does NOT happen.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

/* The real functions, not a copy. supplierSnap reads prodSuppliers, which reads PRODUCTS. */
function snapWith(products) {
  // eslint-disable-next-line no-new-func
  return new Function('PRODUCTS', `
    "use strict";
    ${extractFn(SRC, 'normSupplier')}
    ${extractFn(SRC, 'prodSuppliers')}
    ${extractFn(SRC, 'supplierSnap')}
    return supplierSnap;
  `)(products);
}

const HIS = [
  { supplier: 'B&E' }, { supplier: 'The Fruit Wagon' }, { supplier: 'Bidfood' },
  { supplier: 'Lactalis' }, { supplier: 'Cookers' }
];

test("the reported case: a letterhead saying more than his spelling snaps to HIS", () => {
  const snap = snapWith(HIS);
  assert.equal(snap('B&E Poultry'), 'B&E', 'this is the duplicate he was offered');
  assert.equal(snap('B&E Poultry Products'), 'B&E');
});

test('an exact match returns HIS spelling, whatever case the invoice used', () => {
  const snap = snapWith(HIS);
  assert.equal(snap('the fruit wagon'), 'The Fruit Wagon');
  assert.equal(snap('BIDFOOD'), 'Bidfood');
  assert.equal(snap('B&E'), 'B&E');
});

test('⚠️ a WHOLE-WORD prefix only — "Bidfoods Direct" is NOT folded into "Bidfood"', () => {
  /* The assertion this whole rule stands or falls on. A substring test would collapse two genuinely
     different suppliers into one and there would be no way to tell from the screen, which is a worse
     defect than the one being fixed. */
  const snap = snapWith(HIS);
  assert.equal(snap('Bidfoods Direct'), 'Bidfoods Direct', 'the character after the match must not be a letter');
  assert.equal(snap('Cookersons'), 'Cookersons');
  assert.equal(snap('Lactalisa'), 'Lactalisa');
});

test('⚠️ it never snaps AWAY from what the invoice said, only towards what he has', () => {
  /* An existing longer name is not proposed for a shorter candidate: that would be the app deciding
     which of his suppliers an ambiguous letterhead meant, which is a guess, not a de-duplication. */
  const snap = snapWith([{ supplier: 'B&E Poultry' }, { supplier: 'Bidfood Direct Supply' }]);
  assert.equal(snap('B&E'), 'B&E');
  assert.equal(snap('Bidfood'), 'Bidfood');
});

test('the LONGEST existing match wins when two could apply', () => {
  const snap = snapWith([{ supplier: 'Bidfood' }, { supplier: 'Bidfood Direct Supply' }]);
  assert.equal(snap('Bidfood Direct Supply'), 'Bidfood Direct Supply', 'exact beats prefix');
  assert.equal(snap('Bidfood Direct Supply Pty'), 'Bidfood Direct Supply', 'and the longer prefix beats the shorter');
});

test('⚠️ LONGEST, not LAST — and this needs an unsorted list to mean anything', () => {
  /* The test above cannot tell those two rules apart, and the mutation gate is what showed it.
     `prodSuppliers()` SORTS, and among several prefixes of one candidate the alphabetical order IS
     increasing length — a prefix always sorts before its own extension. So "keep the longest" and
     "take the last one seen" agree on every list the app itself can produce, and a mutant that
     replaces one with the other survives.
     `supplierSnap` takes the list as an argument precisely so this can be asked properly: handed the
     same two suppliers in the other order, only the longest-wins rule still answers correctly. */
  const snap = snapWith([]);   // the catalogue is irrelevant when the list is passed explicitly
  const unsorted = ['Bidfood Direct Supply', 'Bidfood'];
  assert.equal(snap('Bidfood Direct Supply Pty', unsorted), 'Bidfood Direct Supply',
    'the LAST match here is the short one, so last-wins would answer "Bidfood"');
  assert.equal(snap('Bidfood Direct Supply Pty', ['Bidfood', 'Bidfood Direct Supply']), 'Bidfood Direct Supply',
    'and the sorted order gives the same answer, which is the point');
});

test('an unknown supplier is left exactly as it arrived', () => {
  const snap = snapWith(HIS);
  assert.equal(snap('Coastal Poultry Distributors'), 'Coastal Poultry Distributors');
  assert.equal(snap(''), '');
  assert.equal(snap(null), '');
});

test('an empty catalogue cannot snap anything, and must not throw', () => {
  const snap = snapWith([]);
  assert.equal(snap('B&E Poultry'), 'B&E Poultry', 'a first import has nothing to match against');
});

test('⚠️ KNOWN LIMIT: punctuation spacing is not normalised away', () => {
  /* `normSupplier` lowercases and collapses whitespace; it does not strip punctuation. So "b & e"
     and "B&E" are different suppliers to this rule. Stripping punctuation would fold more spellings
     together AND would fold apart-by-punctuation names that are genuinely different, and no real
     invoice has produced that case yet. Asserted so the limit is a decision rather than a surprise. */
  const snap = snapWith(HIS);
  assert.equal(snap('B & E Poultry'), 'B & E Poultry',
    'if a real invoice ever prints this, widen normSupplier and change this expectation');
});

test('⚠️ two suppliers that NORMALISE the same: the first wins, and that is a decision', () => {
  /* `normSupplier` trims and collapses whitespace, so a product carrying "B&E " and one carrying
     "B&E" are two distinct strings in `prodSuppliers()` that reduce to one key. A stray trailing
     space in a supplier field is an ordinary thing to happen.
     Neither spelling is more correct, so what matters is that the choice is STABLE rather than
     arbitrary: the first match is kept, which with the sort makes it deterministic. The mutation gate
     is what showed this was unpinned — flipping the tie-break to "last wins" changed the answer and
     nothing noticed. */
  const snap = snapWith([]);
  assert.equal(snap('B&E Poultry', ['B&E', 'B&E ']), 'B&E', 'the first of two equal-length matches');
  assert.equal(snap('B&E Poultry', ['B&E ', 'B&E']), 'B&E ', 'and it really is the FIRST, not a favourite spelling');
});
