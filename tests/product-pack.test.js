/*
 * product-pack.test.js — Phase 1 (v21): product-pack pricing, precedence, and the
 * unit-mismatch guard. Locks in the eggs bug fix ("$50 carton of 180 eggs" must be
 * $0.2778/egg, never $83.33/kg) and the deliberate v20 rule change:
 *   product pack > supplier memory > parser  (parser only when nothing was taught).
 */
const test = require('node:test');
const assert = require('node:assert');
const { parsePdfLine, derivePackPrice, resolveMatchedPrice, unitCatCategory } = require('./_extract.js');

const near = (a, b, m) => assert.ok(Math.abs(a - b) < 0.01, `${m}: expected ~${b}, got ${a}`);
const EGGS = '1 130 Eggs - Ctn 600g $50.00 $50.00';

test('THE eggs case: a matched product pack of 180 units -> $0.2778/ea, NOT $83.33/kg', () => {
  // the parser alone reads "600g" and gets it wrong on unit:
  const parsed = parsePdfLine(EGGS);
  assert.equal(parsed.unit, 'kg');
  near(parsed.unitPrice, 50 / 0.6, 'parser alone (wrong unit)');   // ~83.33/kg
  // product pack fixes it:
  const d = derivePackPrice(EGGS, 180, 'ea');
  assert.equal(d.unit, 'ea');
  near(d.unitPrice, 50 / 180, 'per egg');                          // ~0.2778
});

test('resolveMatchedPrice applies the product pack and clears the mismatch (eggs)', () => {
  const row = parsePdfLine(EGGS);
  resolveMatchedPrice(row, { pack_qty: 180, pack_unit: 'ea', base_unit: 'ea' }, null);
  assert.equal(row.priceSource, 'product-pack');
  assert.equal(row.unit, 'ea');
  near(row.unitPrice, 50 / 180, 'per egg');
  assert.equal(row.unitMismatch, false);
  assert.equal(row.needManual, false);
});

test('unit-mismatch GUARD: kg-derived price against an ea product is blocked, not applied', () => {
  const row = parsePdfLine(EGGS);                                  // parses to $/kg
  resolveMatchedPrice(row, { pack_qty: null, pack_unit: null, base_unit: 'ea' }, null);
  assert.equal(row.unitMismatch, true, 'kg vs ea must flag');
  assert.equal(row.needManual, true, 'must require manual/pack resolution');
});

test('kg pack: $65 pack / 10 kg -> $6.50/kg', () => {
  const d = derivePackPrice('Flour Plain 10kg 1 65.00 65.00', 10, 'kg');
  assert.equal(d.unit, 'kg');
  near(d.unitPrice, 6.50, 'per kg');
});

/* ---------------------------------------------------------------------------
 * 0c: five surviving mutants lived in derivePackPrice, and every one of them was in a branch
 * no test had ever taken. The cases above cover 'ea' and 'kg' only.
 * ------------------------------------------------------------------------- */

const OIL = 'Canola Oil 20L 1 44.00 44.00';

test('0c: the VOLUME arm — litres and millilitres both resolve, and both to per-LITRE', () => {
  /* Two mutants here and they fail differently, which is why the unit is asserted as hard as the
     price. Breaking the `||` chain drops 'l' out of the volume arm and into the count fallback,
     where 44/20 is STILL 2.2 — the right number wearing the wrong unit, which downstream writes
     base_unit 'ea' onto a product sold by the litre. Breaking the `u==='l'?1:0.001` ternary keeps
     the unit and multiplies the price by a thousand. Only asserting both catches both. */
  const l = derivePackPrice(OIL, 20, 'l');
  assert.equal(l.unit, 'l', 'a litre pack is a VOLUME, not a count that happens to divide the same');
  near(l.unitPrice, 2.20, 'per litre');

  const ml = derivePackPrice(OIL, 20000, 'ml');
  assert.equal(ml.unit, 'l', 'millilitres normalise UP to litres — the app stores per-ml but prices per-L');
  near(ml.unitPrice, 2.20, 'the same pack said two ways must cost the same');
});

test('0c: a pack size of zero is refused, and zero is the boundary the guard names', () => {
  // `if(!(qty>0)) return null` — flipping `>` to `>=` accepts a zero pack, and 44/0 is Infinity,
  // which then gets written onto a product as its cost per unit. Nothing downstream re-checks it.
  assert.equal(derivePackPrice(OIL, 0, 'l'), null, 'zero is refused');
  assert.equal(derivePackPrice(OIL, -1, 'l'), null, 'and so is negative');
  assert.ok(derivePackPrice(OIL, 0.5, 'l'), 'but a fractional pack is legitimate — half a litre is a pack');
});

test('0c: a FREE line prices at zero rather than being thrown away', () => {
  /* `if(!isFinite(unitPrice)||unitPrice<0) return null` — flipping `<` to `<=` discards any line
     that costs nothing. Suppliers really do send $0.00 lines (samples, credits, freight already
     billed), and refusing them is not neutral: resolveMatchedPrice then falls through to the parser
     or to manual, so the row asks the user to type a price for something that is free. */
  const free = derivePackPrice('Free Sample 1EA 1 0.00 0.00', 1, 'ea');
  assert.ok(free, 'a zero price is a price');
  assert.equal(free.unitPrice, 0);
  assert.equal(free.unit, 'ea');
});

test('0c: a non-finite result is refused — the ONLY input that reaches that guard', () => {
  /* `!isFinite(unitPrice) || unitPrice<0` with the `||` flipped to `&&` requires BOTH, so Infinity
     sails through and becomes a product's cost per unit.
     The input is exotic and that is the point: qty is already guaranteed > 0, so the denominator can
     only get small enough by underflowing, which takes a denormal — and then the QUOTIENT overflows
     to Infinity rather than the denominator being literally zero. (The first draft of this test
     asserted the denominator was 0 and was wrong: 5e-321 * 0.001 is 5e-324, not 0. The guard still
     fires, for the reason above rather than the reason first written down.)
     That is exactly one shape of input, and if the guard is not tested with it the guard is tested
     with nothing — it would read as dead code to the next person simplifying this function. */
  assert.ok(5e-321 > 0, 'sanity: the qty guard passes this, so the isFinite guard is what must catch it');
  assert.ok(!isFinite(44 / (5e-321 * 0.001)), 'sanity: the denominator underflows and the QUOTIENT overflows');
  assert.equal(derivePackPrice(OIL, 5e-321, 'ml'), null, 'Infinity must never be returned as a price');
});

test('precedence: product pack > supplier memory > parser (all three distinct)', () => {
  const RAW = 'Widget 2kg CTN 1 20.00 20.00';                     // parser: 20/2kg = $10/kg
  near(parsePdfLine(RAW).unitPrice, 10, 'parser baseline');

  // 1) product pack wins over both memory and parser
  let r = parsePdfLine(RAW);
  resolveMatchedPrice(r, { pack_qty: 4, pack_unit: 'kg', base_unit: 'g' }, { qty: 5, unit: 'kg' });
  assert.equal(r.priceSource, 'product-pack');
  near(r.unitPrice, 20 / 4, 'pack: $5/kg');

  // 2) no pack -> supplier memory wins over parser
  r = parsePdfLine(RAW);
  resolveMatchedPrice(r, { pack_qty: null, pack_unit: null, base_unit: 'g' }, { qty: 5, unit: 'kg' });
  assert.equal(r.priceSource, 'memory');
  near(r.unitPrice, 20 / 5, 'memory: $4/kg');

  // 3) parser derivation is used ONLY when nothing was taught (the renamed v20 rule)
  r = parsePdfLine(RAW);
  resolveMatchedPrice(r, { pack_qty: null, pack_unit: null, base_unit: 'g' }, null);
  assert.equal(r.priceSource, 'parser');
  near(r.unitPrice, 10, 'parser: $10/kg');
});

test('unitCatCategory maps units to kg/l/ea', () => {
  assert.equal(unitCatCategory('g'), 'kg');
  assert.equal(unitCatCategory('kg'), 'kg');
  assert.equal(unitCatCategory('ml'), 'l');
  assert.equal(unitCatCategory('l'), 'l');
  assert.equal(unitCatCategory('ea'), 'ea');
  assert.equal(unitCatCategory('unit'), 'ea');
  assert.equal(unitCatCategory('xyz'), null);
});

test('no false mismatch when derived unit already matches the product base unit', () => {
  const row = parsePdfLine('Chips 6x2.5kg CTN 8 40.17 40.17 321.36 0.00 321.36');
  resolveMatchedPrice(row, { pack_qty: null, pack_unit: null, base_unit: 'g' }, null);
  assert.equal(row.unitMismatch, false);
  near(row.unitPrice, 40.17 / 15, 'chips still ~$2.68/kg');        // regression anchor stays intact
});

/* ===== v27: Remembered-items overwrite relies on a STABLE key across qty/price noise ===== */
test("normalizePhrase: same item written with different qty/price/code noise -> identical key (so re-teaching overwrites, never duplicates)", () => {
  const { normalizePhrase } = require('./_extract.js');
  const a = normalizePhrase("AVOCADO TRAY 18'S 1-234 2.5kg 1 45.00 45.00");
  const b = normalizePhrase("AVOCADO TRAY 20'S 1-999 2.5kg 2 50.00 50.00");
  assert.equal(a, b, 'volatile numbers (qty, codes, prices) must be stripped so the memory key is stable');
  assert.ok(a.includes('avocado') && a.includes('tray'), 'the item words survive');
});
