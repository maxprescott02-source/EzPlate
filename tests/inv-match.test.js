/*
 * inv-match.test.js — D9 of PARSER-AUDIT-2026-09-08.
 *
 * `rankCandidates` normalises the token overlap by the SHORTER of the two token sets, which is what
 * lets a short invoice line match a long product name. The cost is that a ONE-WORD product scores a
 * perfect 1.0 against every line containing that word — so "Mayonnaise" (Kewpie, stored per gram)
 * ties at 1.0 with "Mayonnaise Aioli Squeeze Bottle Gluten Free" (Jeffersons, per millilitre) on a
 * line that names the aioli in full. The sort was on coverage alone and is stable, so the tie went
 * to whichever product came first in the catalogue — that is, to catalogue order, which means
 * nothing at all. The row then arrives matched to the WRONG PRODUCT at the high-confidence tier.
 *
 * The tie now breaks on how much of the LINE the product explains (overlap), then on product size.
 *
 * ⚠️ THE ORDER OF THE FIXTURE IS THE TEST. The wrong product is listed FIRST on purpose: with the
 * old stable sort that is what won, so a fixture listing them the other way round would pass
 * against the defect. CLAUDE.md roster 184(b) — a fixture whose candidates agree cannot tell you
 * which one the code read.
 */
const test = require('node:test');
const assert = require('node:assert');
const { setInvState, rankCandidates } = require('./_extract.js');

test('D9: a one-word product does not win a tie by being first in the catalogue', () => {
  setInvState({ PRODUCTS: [
    { id: 'KEWPIE', description: 'Mayonnaise', brand: 'Kewpie' },                          // FIRST: the wrong one
    { id: 'AIOLI', description: 'Mayonnaise Aioli Squeeze Bottle Gluten Free', brand: 'Jeffersons' }
  ]});
  const ranked = rankCandidates('MAYONNAISE AIOLI SQUEEZE BOTTLE JEFFERSONS 1lt');
  assert.equal(ranked[0].id, 'AIOLI', 'the product that explains the whole line wins');
  assert.equal(ranked[0].coverage, ranked[1].coverage,
    'and it wins ON THE TIE-BREAK — if these two stopped tying, this test would be measuring something else');
  assert.ok(ranked[0].overlap > ranked[1].overlap, 'the tie-break is how much of the LINE is explained');
});

test('D9: reversing the catalogue order gives the same answer', () => {
  // The pair above is only evidence if it is not itself an accident of ordering.
  setInvState({ PRODUCTS: [
    { id: 'AIOLI', description: 'Mayonnaise Aioli Squeeze Bottle Gluten Free', brand: 'Jeffersons' },
    { id: 'KEWPIE', description: 'Mayonnaise', brand: 'Kewpie' }
  ]});
  assert.equal(rankCandidates('MAYONNAISE AIOLI SQUEEZE BOTTLE JEFFERSONS 1lt')[0].id, 'AIOLI');
});

test('⚠️ the tie-break is a TIE-break: a difference in coverage still decides first', () => {
  /* This is the assertion that stops the fix becoming a different ranking rule. SMALL has the
     BIGGER coverage (1.0) and the SMALLER overlap (2); BIG has 0.75 and 3. If the comparator ever
     let overlap speak before coverage, BIG would come first — and every short exact product in the
     catalogue would start losing to a long one that happens to share more words with the line.
     The two numbers are asserted, not just the order, so the day these stop differing this test
     says so instead of passing for a reason it no longer has (roster 205). */
  setInvState({ PRODUCTS: [
    { id: 'BIG', description: 'Mayonnaise Aioli Squeeze Egg' },
    { id: 'SMALL', description: 'Mayonnaise Basil' }
  ]});
  const ranked = rankCandidates('MAYONNAISE AIOLI SQUEEZE BASIL 1lt');
  assert.ok(ranked[0].coverage > ranked[1].coverage, 'the fixture must genuinely differ on coverage');
  assert.ok(ranked[0].overlap < ranked[1].overlap, 'and disagree with overlap, or it proves nothing');
  assert.equal(ranked[0].id, 'SMALL', 'coverage decided this one; the tie-break never ran');
});

test('a line naming nothing in the catalogue still matches nothing', () => {
  setInvState({ PRODUCTS: [{ id: 'P1', description: 'Mayonnaise' }] });
  assert.deepEqual(rankCandidates('FUEL LEVY'), []);
});

test('at most three candidates come back', () => {
  setInvState({ PRODUCTS: [
    { id: 'A', description: 'Cheese Halloumi Block' },
    { id: 'B', description: 'Cheese Cream Express' },
    { id: 'C', description: 'Cheese Fetta Danish' },
    { id: 'D', description: 'Cheese Mozzarella Shredded' }
  ]});
  assert.equal(rankCandidates('CHEESE - HALLOUMI PDO 750G').length, 3);
});
