/*
 * pack-drives-price.test.js — 280 (queue item 98).
 *
 * THE EDIT-PRODUCT FORM NOW ASKS WHAT THE NEW-PRODUCT FORM ASKS. New takes pack size + pack unit +
 * pack price and derives the unit cost into `#f_calc`; Edit took a price PER UNIT, so a sack bought
 * as "10 kg for $65" reopened as "6.50" — and the $65 had been stored in `current_price_exgst`
 * since creation and read by nothing anywhere in the app.
 *
 * ⚠️ WHAT THE ITEM ASKED FOR THAT IS NOT WHAT SHIPPED, and the difference is the safety of it.
 * It said "make Edit mirror New". A literal mirror is unsafe: on New, `packToUnitCost` derives
 * `base_unit` FROM the pack unit. `js/app.js` makes that create-only at two sites — *"never
 * auto-change a product's base unit (it would corrupt saved plate costs)"* — because a saved plate
 * line holds its quantity in the product's base unit, so flipping g/ml/ea silently re-means every
 * line referencing it. `.claude/rules/app-guards.md` records the invoice-path version of exactly
 * that costing a 200g line **$2166.67 instead of $1.30**.
 *
 * So the pack FILLS `#ig_price` and the write path is untouched: `saveIngEdit` still reads that
 * field and still derives its unit from the STORED product. The pack cannot reach `base_unit` or
 * `cost_basis` because it never touches the code that writes them.
 *
 * WHY EACH TEST IS A REGRESSION RATHER THAN A DESCRIPTION:
 *  1. The MISMATCH case is the one that matters. A pack whose unit does not convert to the stored
 *     base unit is REFUSED, not computed — `price / qty` is then a price in the wrong unit, which
 *     is the unit-mismatch defect by another road. Asserted as its own state, with the two units
 *     named, so a version that silently fell back to computing would fail rather than pass quietly.
 *  2. The arithmetic is asserted against `packToUnitCost`'s own output, not against a copy of its
 *     formula — `.claude/rules/tests.md`: a stub written from the same belief as the code passes
 *     against the defect it was written to catch.
 *  3. PARTIAL is distinct from NONE. A half-filled pack must not read as "no pack" and must not
 *     compute; the read-out stays hidden and the price is left alone either way, but the states
 *     differ and a future change to one must not silently take the other.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

/* The REAL `igPackDerive` and the REAL `packToUnitCost` it calls. Extracting both is the point:
   the derivation under test is the shipped one, and the expected values below come from the same
   shipped helper rather than from arithmetic retyped here. */
// eslint-disable-next-line no-new-func
const H = new Function(`
  ${extractFn(SRC, 'packToUnitCost')}
  ${extractFn(SRC, 'igPackDerive')}
  return { igPackDerive: igPackDerive, packToUnitCost: packToUnitCost };
`)();

const parts = (qty, unit, price) => ({ qty: String(qty), unit, price: String(price) });

test('280: a 10 kg pack at $65 on a gram-stored product derives $6.50 per kg', () => {
  const d = H.igPackDerive(parts(10, 'kg', 65), 'g');
  assert.strictEqual(d.state, 'ok');
  assert.strictEqual(d.unitWord, 'kg');
  /* The expected figure comes from the shipped deriver, not from 65/10 written out here. */
  assert.strictEqual(d.perUnit, H.packToUnitCost(10, 'kg', 65).dispPer);
  assert.strictEqual(d.perUnit, 6.5);
});

test('280: litres and counts derive in their own units', () => {
  const l = H.igPackDerive(parts(4, 'l', 20), 'ml');
  assert.strictEqual(l.state, 'ok');
  assert.strictEqual(l.perUnit, 5);
  assert.strictEqual(l.unitWord, 'L');

  const ea = H.igPackDerive(parts(180, 'ea', 90), 'ea');
  assert.strictEqual(ea.state, 'ok');
  assert.strictEqual(ea.perUnit, 0.5);
  assert.strictEqual(ea.unitWord, 'unit');
});

/* ⚠️ THE ONE THAT PROTECTS A STORED COST. A kg pack on a product stored per unit, or an `ea` pack
   on a product stored by weight, means `price / qty` is not a price in this product's unit. The
   form must decline and say which two units disagree. */
test('280: a pack whose unit does not convert to the STORED base unit is refused, not computed', () => {
  const eaOnWeight = H.igPackDerive(parts(5, 'ea', 80), 'g');
  assert.strictEqual(eaOnWeight.state, 'mismatch');
  assert.strictEqual(eaOnWeight.want, 'g');
  assert.strictEqual(eaOnWeight.got, 'ea');
  assert.strictEqual(eaOnWeight.perUnit, undefined, 'a refusal carries no figure to fall back on');

  const kgOnCount = H.igPackDerive(parts(2, 'kg', 10), 'ea');
  assert.strictEqual(kgOnCount.state, 'mismatch');

  const mlOnWeight = H.igPackDerive(parts(500, 'ml', 3), 'g');
  assert.strictEqual(mlOnWeight.state, 'mismatch', 'volume against weight is the dangerous pair — the magnitudes stay plausible');
});

test('280: g against g and ml against ml convert without complaint', () => {
  assert.strictEqual(H.igPackDerive(parts(500, 'g', 4), 'g').state, 'ok');
  assert.strictEqual(H.igPackDerive(parts(750, 'ml', 9), 'ml').state, 'ok');
});

test('280: a half-filled pack is PARTIAL — it neither computes nor reads as absent', () => {
  assert.strictEqual(H.igPackDerive(parts(10, 'kg', ''), 'g').state, 'partial');
  assert.strictEqual(H.igPackDerive(parts('', 'kg', 65), 'g').state, 'partial');
  assert.strictEqual(H.igPackDerive(parts(10, '', 65), 'g').state, 'partial');
  /* A zero or non-numeric quantity reaches `packToUnitCost`, which returns null — partial, not a
     division by zero. */
  assert.strictEqual(H.igPackDerive(parts(0, 'kg', 65), 'g').state, 'partial');
  assert.strictEqual(H.igPackDerive(parts('abc', 'kg', 65), 'g').state, 'partial');
});

test('280: an empty pack is NONE, which is the ordinary state of a product with no pack', () => {
  assert.strictEqual(H.igPackDerive(parts('', '', ''), 'g').state, 'none');
  assert.strictEqual(H.igPackDerive(null, 'g').state, 'none');
});

/* With no stored base unit to check against there is nothing to disagree with, so the derivation
   stands. This is the create-ish path and it must not start refusing. */
test('280: with no stored base unit the pack derives freely', () => {
  const d = H.igPackDerive(parts(5, 'ea', 80), null);
  assert.strictEqual(d.state, 'ok');
  assert.strictEqual(d.perUnit, 16);
});

/* ⚠️ THE ROUND TRIP, and it is what makes the whole change safe rather than merely convenient.
   What the pack fills into `#ig_price` must be exactly what `saveIngEdit` needs in order to store
   the cost the pack describes. That function does `cost_per_base_unit = price / invUnitToBase(
   unitTypeFromStoredBaseUnit).div`, so the two have to compose back to `packToUnitCost`'s own
   `cost_per_base_unit`. If they ever stop composing, a pack-driven save stores a wrong figure —
   silently, because both halves look right on their own. */
// eslint-disable-next-line no-new-func
const U = new Function(`${extractFn(SRC, 'invUnitToBase')} return invUnitToBase;`)();

test('280: the filled price and saveIngEdit\'s divisor compose back to the pack\'s own unit cost', () => {
  const cases = [
    { qty: 10, unit: 'kg', price: 65, stored: 'g', displayUnit: 'kg' },
    { qty: 4, unit: 'l', price: 20, stored: 'ml', displayUnit: 'litre' },
    { qty: 180, unit: 'ea', price: 90, stored: 'ea', displayUnit: 'unit' },
    { qty: 500, unit: 'g', price: 4, stored: 'g', displayUnit: 'kg' },
  ];
  cases.forEach(({ qty, unit, price, stored, displayUnit }) => {
    const filled = H.igPackDerive(parts(qty, unit, price), stored).perUnit;   // what lands in #ig_price
    const div = U(displayUnit).div;                                          // what saveIngEdit divides by
    const stores = filled / div;                                             // what saveIngEdit writes
    const truth = H.packToUnitCost(qty, unit, price).cost_per_base_unit;     // what the pack means
    assert.ok(Math.abs(stores - truth) < 1e-12,
      `${qty}${unit} at $${price} on a ${stored} product: stored ${stores} against ${truth}`);
  });
});
