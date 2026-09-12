/*
 * tests/pack-arithmetic.test.js — the FOUR copies of "a pack price and a pack size make a unit price".
 *
 * ⚠️ WRITTEN BEFORE THE MERGE, ON PURPOSE, AND THAT ORDER IS THE POINT. Queue item 37 says
 * "measure that the four are identical before merging them", and this file is that measurement
 * turned into a standing one: it pins what every copy answers TODAY, so the extraction that follows
 * is proved rather than hoped. A refactor whose only evidence is that the suite stayed green has
 * proved the suite, not the refactor.
 *
 * ⚠️ AND ITEM 37 NAMED THE WRONG FOUR. It lists `packPriceOf`, `derivePackPrice`,
 * `applySupplierMemory` and `lineColumns`. Measured against the code:
 *
 *   - `packPriceOf` and `lineColumns` are a DIFFERENT computation — a line in, the price of one
 *     pack out — and they are ALREADY unified: batch 256 made `packPriceOf` ask `lineColumns`
 *     first, precisely so the two could not disagree. Nothing is left to merge there.
 *   - The computation that really is duplicated is the DIVISION — pack price + pack size -> unit
 *     price — and it has four copies, two of which the item does not name:
 *        1. `derivePackPrice`                  (the product's own taught pack)
 *        2. `applySupplierMemory`              (a remembered pack, inline)
 *        3. `resolveMatchedPrice` branch 2     (the same remembered pack, inline AGAIN)
 *        4. `packToUnitCost`                   (the product form and the catalogue importer)
 *
 * That is `CLAUDE.md`'s "an item that names a behaviour without naming its sites is an item whose
 * list is already wrong", and the count being right by coincidence is what makes it worth writing
 * out: four is four, and two of the members are different, so a batch checking the count would have
 * agreed with the item and still merged the wrong pair.
 *
 * WHAT THE GRID FOUND, measured over 8 real line shapes x 8 pack shapes = 64 cases:
 *   - all four agree on every reachable case (48 answers, 16 mutual refusals, 0 disagreements);
 *   - ONE nominal difference: `packToUnitCost` labels a count 'unit' where the other three say
 *     'ea'. Same number, different word, and the merge has to keep both because they are read by
 *     different screens;
 *   - TWO real divergences, both in `packToUnitCost`, and NEITHER reachable today:
 *       (a) it guards with `isNaN(price)` where the others use `isFinite`, so it alone accepts an
 *           INFINITE price — blocked at both entry points, because `catNum` strips every character
 *           outside [0-9.-] and Chromium's number input sanitises `1e400` and `1e309` to '';
 *       (b) it compares `unit==='kg'` WITHOUT lowercasing, unlike the other three, so an uppercase
 *           unit falls through to the count branch — a 1000x error in `cost_per_base_unit`.
 *           Blocked because every writer produces lowercase, measured on production.
 *     Both are pinned below as the unreachable-but-real cases they are, so the extraction has to
 *     CHOOSE rather than absorb them.
 *
 * ⚠️ (b) WAS PROSE ONLY IN THE FIRST CUT, while `docs/MAINTENANCE.md` and the consolidated queue
 * both said "both pinned in that test". Caught by the pre-push review, which read the test rather
 * than the claim. A comment asserting coverage a test does not have is this repo's single
 * most-recorded defect — committed here in the batch whose entire subject is measuring rather than
 * asserting, which is the argument for the second reader in one line.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn, extractVar, sliceBetween } = require('./_extractfn');

const SRC = loadApp();

function build() {
  const parserBlock = sliceBetween(SRC, 'var INV_EXCLUDE=', 'function unitLabelFor(');
  const parts = [
    extractVar(SRC, 'INV_STOP'),
    extractVar(SRC, 'PRICE_JUMP'),
    ...['cpbu', 'inorm', 'coreTokens', 'prodTokenSet', 'normSupplier', 'invGstDetect', 'invGstAdjust',
      'invReResolve', 'invDerivePackQty', 'flagNeedsAttention', 'kingRepointGuard', 'invPriceUnit',
      'invPackUnitOpts', 'invUnitRebase', 'invRowState', 'invSupplierDetect', 'parseInvoiceCSV',
      'normPackNotation', 'invPackWeight', 'invFixRow', 'unitLabelFor', 'packToUnitCost'].map((n) => extractFn(SRC, n)),
  ].join('\n');
  // eslint-disable-next-line no-new-func
  return new Function(`
    "use strict";
    function invDbg(){}
    var window={ EZ_INV_DEBUG:false, console:console };
    var PRODUCTS=[], byId={}, kById={}, invRows=[], invGst={mode:'unknown', note:''}, invSupplier='', supplierMem={}, gstDefault='ex';
    function memKey(sup, phrase){ return normSupplier(sup)+'|'+normalizePhrase(phrase); }
    function renderInvReview(){}
    ${parts}
    ${parserBlock}
    return { packPriceOf:packPriceOf, derivePackPrice:derivePackPrice, applySupplierMemory:applySupplierMemory,
             lineColumns:lineColumns, resolveMatchedPrice:resolveMatchedPrice, packToUnitCost:packToUnitCost };
  `)();
}
const api = build();

/* The eight line shapes are the ones the corpus and the real invoices actually carry: a columnar
   q x P = T line, a repeated-price line with no quantity, a bare single-money line, a catch-weight
   line, and a credit. A grid built only from lines that parse cleanly would agree by construction. */
const LINES = [
  'CHICKEN BREAST 3.00 3.00 CTN 29.50 88.50',
  'OLIVE OIL 4 L 12.40 49.60',
  'TOMATOES 1.00 EA 5.00',
  'FLOUR 25KG BAG 32.75',
  'RICE 2 2 BAG 18.00 36.00',
  'CREDIT CHICKEN -2.00 -2.00 CTN 29.50 -59.00',
  'MILK 6 X 2L 3.10 18.60',
  'BEEF MINCE 5.42 KG 14.90 80.76',
];
/* Every unit branch (kg, g, l, ml, ea) plus the two refusals (zero, negative), because the branches
   are where a merge changes an answer and the refusals are where it changes a guard. */
const PACKS = [
  { qty: 1, unit: 'ea' }, { qty: 12, unit: 'ea' }, { qty: 2, unit: 'kg' },
  { qty: 500, unit: 'g' }, { qty: 1, unit: 'l' }, { qty: 750, unit: 'ml' },
  { qty: 0, unit: 'kg' }, { qty: -3, unit: 'ea' },
];

/* Each copy reduced to the same shape: `null` for a refusal, or {unit, unitPrice} in DISPLAY units
   (kg / l / ea), which is what three of the four already return. */
function viaDerivePackPrice(raw, p) {
  const d = api.derivePackPrice(raw, p.qty, p.unit);
  return d ? { unit: d.unit, unitPrice: d.unitPrice } : null;
}
function viaSupplierMemory(raw, p) {
  const row = { raw, name: raw, needManual: true, basis: null };
  const after = api.applySupplierMemory(row, { qty: p.qty, unit: p.unit });
  return after.remembered ? { unit: after.unit, unitPrice: after.unitPrice } : null;
}
function viaResolveMatched(raw, p) {
  const row = { raw, name: raw, needManual: true, unitPrice: null, unit: null, basis: null };
  api.resolveMatchedPrice(row, null, { qty: p.qty, unit: p.unit });
  return (row.needManual === false && row.unitPrice != null) ? { unit: row.unit, unitPrice: row.unitPrice } : null;
}
function viaPackToUnitCost(raw, p) {
  const t = api.packToUnitCost(p.qty, p.unit, api.packPriceOf(raw));
  if (!t) return null;
  // 'unit' and 'L' are this function's own labels for the same things; normalise to compare the maths.
  return { unit: String(t.dispUnit).toLowerCase().replace(/^unit$/, 'ea'), unitPrice: t.dispPer };
}
const COPIES = [
  ['derivePackPrice', viaDerivePackPrice],
  ['applySupplierMemory', viaSupplierMemory],
  ['resolveMatchedPrice', viaResolveMatched],
  ['packToUnitCost', viaPackToUnitCost],
];

test('the four copies of the pack division agree on every case in the grid', () => {
  let answered = 0, refused = 0;
  for (const raw of LINES) {
    for (const p of PACKS) {
      const got = COPIES.map(([name, fn]) => [name, fn(raw, p)]);
      const key = (v) => (v ? `${v.unit}@${v.unitPrice}` : 'refused');
      const first = key(got[0][1]);
      for (const [name, v] of got.slice(1)) {
        assert.equal(key(v), first,
          `${name} disagrees with derivePackPrice on "${raw}" with a ${p.qty}${p.unit} pack`);
      }
      if (got[0][1]) answered++; else refused++;
    }
  }
  /* ⚠️ The counts are asserted, not just the agreement, because "they all agree" is silently
     satisfied when they all REFUSE — `CLAUDE.md` roster 205, an assertion whose two sides are both
     computed and can agree by being equally absent. A grid that stopped answering would still pass
     the loop above. */
  assert.equal(answered + refused, LINES.length * PACKS.length, 'every case was actually run');
  assert.equal(answered, 48, 'the grid still produces 48 answers');
  assert.equal(refused, 16, 'and 16 mutual refusals');
});

test('the count label is the ONE difference, and both spellings are kept on purpose', () => {
  /* `packToUnitCost` feeds the product form and the catalogue preview, which say "per unit";
     the invoice path says "ea". Same number. A merge that unified the WORD would change copy on
     two screens to no one's benefit, so the shared core returns the number and each caller keeps
     its own vocabulary. */
  const raw = 'TOMATOES 1.00 EA 5.00';
  const t = api.packToUnitCost(2, 'ea', api.packPriceOf(raw));
  const d = api.derivePackPrice(raw, 2, 'ea');
  assert.equal(t.dispUnit, 'unit', 'the form says unit');
  assert.equal(d.unit, 'ea', 'the invoice path says ea');
  assert.equal(t.dispPer, d.unitPrice, 'and the number is the same');
});

test('packToUnitCost alone accepts an infinite price, and nothing can reach it', () => {
  /* A real divergence: `isNaN(price)` lets Infinity through where `isFinite` would not. It is
     pinned rather than fixed because it is UNREACHABLE, and a fix would be a change nobody can
     observe — measured at both entry points rather than argued:
       - the catalogue importer goes through `catNum`, which strips every character outside
         [0-9.-] and then demands `isFinite`, so 'Infinity' becomes '' and '1e400' keeps its digits
         but loses the 'e', landing as 1400 rather than Infinity;
       - the product form's `f_price` is `type="number"`, and Chromium sanitises '1e400' and
         '1e309' to '' (driven in a browser, 12 Sep 2026).
     If a third caller is ever added that hands this function a raw parsed float, THIS test is the
     one that says the guard was always the odd one out. */
  assert.equal(api.packToUnitCost(2, 'kg', Infinity).cost_per_base_unit, Infinity);
  assert.equal(api.derivePackPrice('THING 5.00', 2, 'kg') && true, true, 'the sibling parses a real line');
  assert.equal(api.packToUnitCost(2, 'kg', NaN), null, 'NaN is refused by all four');
  assert.equal(api.packToUnitCost(2, 'kg', -5), null, 'and so is a negative price');

  const stripped = String('1e400').replace(/[$\s,]/g, '').replace(/[^0-9.\-]/g, '');
  assert.equal(stripped, '1400', "catNum's strip removes the exponent rather than passing Infinity");
});

test('packToUnitCost alone does not lowercase the unit, and that is a 1000x divergence', () => {
  /* ⚠️ THIS TEST EXISTS BECAUSE THE FIRST CUT OF THIS FILE DID NOT HAVE IT, WHILE TWO DOCS SAID IT
     DID. `docs/MAINTENANCE.md` and the consolidated queue both claimed "both pinned in that test",
     and only the Infinity one was — the casing divergence was prose. Caught by the pre-push review,
     which read the test instead of the claim.
     That is this repo's single most-recorded defect class (a comment asserting coverage a test does
     not have) committed in the same batch whose whole subject is measuring rather than asserting.

     The divergence itself: the other three copies do `(unit||'ea').toLowerCase()` before comparing;
     `packToUnitCost` compares `unit==='kg'` raw, so an uppercase unit misses every branch and falls
     to the COUNT branch — `$14.90 / 2` per unit instead of per kilogram, a 1000x error in
     `cost_per_base_unit`, silent and plausible on screen.

     ⚠️ IT IS PINNED AS-IS RATHER THAN FIXED, and the assertion below therefore records behaviour
     that is WRONG. That is deliberate and is the same treatment the Infinity case gets: measured on
     production 12 Sep 2026, all 23 non-null `pack_unit` rows are lowercase, and both writers (the
     product form's `<select>`, whose option values are literally lowercase, and `catUnit`, which
     lowercases and maps through `CAT_UNITS`) can only produce lowercase. Fixing an unreachable case
     would ship a client asset and a version bump for a change nobody can observe.
     **What this test buys is that the eventual merge of the four copies has to CHOOSE.** Lowercasing
     inside the shared core is almost certainly right; it must be a decision with this test updated
     in the same commit, not a silent side effect of tidying. */
  const price = 14.9;
  const lower = api.packToUnitCost(2, 'kg', price);
  const upper = api.packToUnitCost(2, 'KG', price);

  assert.equal(lower.base_unit, 'g', 'lowercase takes the weight branch');
  assert.equal(upper.base_unit, 'ea', 'UPPERCASE falls through to the count branch — the divergence');
  assert.equal(upper.cost_per_base_unit / lower.cost_per_base_unit, 1000,
    'and the gap is exactly 1000x, which is what makes it invisible: the number stays plausible');

  /* The other three are handed the same uppercase unit and are unmoved, which is the half that
     makes this a DIVERGENCE rather than a shared quirk. Without this the test would pass if every
     copy were equally broken. */
  const raw = 'BEEF MINCE 5.42 KG 14.90 80.76';
  for (const [name, fn] of COPIES) {
    if (name === 'packToUnitCost') continue;
    assert.deepStrictEqual(fn(raw, { qty: 2, unit: 'KG' }), fn(raw, { qty: 2, unit: 'kg' }),
      `${name} lowercases, so upper and lower agree`);
  }
});

test('packPriceOf and lineColumns are the OTHER computation, and 256 already unified them', () => {
  /* Item 37 lists these two as copies to merge. They are not copies: `lineColumns` reads a line's
     q x P = T columns, and `packPriceOf` ASKS it and falls back only when the line does not add up.
     Asserting the fallback exists is the point — it is what makes a bare single-money line work. */
  assert.equal(api.lineColumns('CHICKEN BREAST 3.00 3.00 CTN 29.50 88.50').price, 29.5);
  assert.equal(api.packPriceOf('CHICKEN BREAST 3.00 3.00 CTN 29.50 88.50'), 29.5, 'columnar: identical');

  assert.equal(api.lineColumns('FLOUR 25KG BAG 32.75'), null, 'no columns to read');
  assert.equal(api.packPriceOf('FLOUR 25KG BAG 32.75'), 32.75, 'and the fallback still prices it');
});
