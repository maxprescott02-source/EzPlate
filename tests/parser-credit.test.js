/*
 * parser-credit.test.js — D5 of PARSER-AUDIT-2026-09-08.
 *
 * `moneyMatches` had no sign. "-2.00" matched as 2.00 and "$-59.00" as 59.00, so the credit page
 * stapled to the back of a real 25/08 invoice — two cartons of chips returned — was read as a
 * PURCHASE, and priced at $0.17/kg with no flag. A credit is not a purchase at a strange price; it
 * is not a purchase at all, and on a credit note the unit-price column is usually not what it looks
 * like either. So the row refuses, loudly, and a human decides.
 *
 * ⚠️ THE SIGN HAS TO BE GLUED TO THE NUMBER, and that is the whole subtlety. A dash is the commonest
 * character in this cafe's invoice descriptions — "BACON - RINDLESS MIDDLE", "FZ CHIPS - S/CUT" —
 * so a rule that read any preceding dash as a minus would flag every line of every invoice as a
 * credit and the import would become useless. The last test below is that case.
 */
const test = require('node:test');
const assert = require('node:assert');
const { moneyMatches, parsePdfLine } = require('./_extract');

test('D5: a minus glued to the digits or to the $ is negative', () => {
  assert.equal(moneyMatches('-2.00')[0].neg, true, 'a returned quantity');
  assert.equal(moneyMatches('$-59.00')[0].neg, true, 'a credited extension');
  assert.equal(moneyMatches('-$59.00')[0].neg, true, 'and the other way round');
});

test('⚠️ a dash in a DESCRIPTION is not a minus sign', () => {
  assert.equal(moneyMatches('BACON - RINDLESS MIDDLE 2.5KG 12.20')[0].neg, false,
    'if this were true, every line of every invoice from this supplier would refuse');
  assert.equal(moneyMatches('Bread - 4.50')[0].neg, false);
  assert.equal(moneyMatches('FZ CHIPS - S/CUT 10MM GF 6X2KG 29.50')[0].neg, false);
});

test('the amount, its position and its $ are unchanged for every existing caller', () => {
  const m = moneyMatches('BUNS 4 52.12 208.48');
  assert.equal(m.length, 2);
  assert.equal(m[0].val, 52.12);
  assert.equal(m[1].val, 208.48);
  assert.equal(m[0].dollar, false);
  assert.equal(moneyMatches('$29.50')[0].dollar, true, 'the $ is what marks a price column in lineColumns');
  assert.equal(moneyMatches('1,234.50')[0].val, 1234.50, 'thousands separators still parse');
});

test('D5: the real credit line refuses instead of pricing', () => {
  const r = parsePdfLine('13612 FZ CHIPS - S/CUT 10MM GF 6X2KG GARDEN LAND -2.00 -2.00 CTN $29.50 $-59.00');
  assert.equal(r.needManual, true, 'flagged for a human');
  assert.equal(r.unitPrice, null, 'and NOT stored at $0.17/kg, which is what shipped');
  assert.equal(r.basis.kind, 'credit', 'the row says why it refused');
});

test('D5: one negative amount is enough — the whole line is suspect', () => {
  // The all-zero second row of a real credit page, and a reversal written the other way about.
  const r = parsePdfLine('90210 RETURN - DAMAGED STOCK 1.00 1.00 CTN $18.40 $-18.40');
  assert.equal(r.needManual, true);
  assert.equal(r.unitPrice, null);
});

test('an ordinary purchase on the same layout is untouched', () => {
  const r = parsePdfLine('13612 FZ CHIPS - S/CUT 10MM GF 6X2KG GARDEN 3.00 3.00 CTN 3.00 CTN $29.50 $0.00 $88.50');
  assert.equal(r.needManual, false);
  assert.ok(r.unitPrice > 0);
});

/* ---------- the refusal has to SURVIVE the two paths that re-price a row ---------- */
/*
 * ⚠️ THE FIRST CUT OF THIS BATCH REFUSED THE CREDIT IN `parsePdfLine` AND NOWHERE ELSE, and the
 * pre-push review found it. `resolveMatchedPrice` and `applySupplierMemory` re-derive the price
 * from `row.raw` through `packPriceOf`, which reads the digits and drops the sign — so on the real
 * credit page, `firstPairPrice` sees the `-2.00 -2.00` pair as **2**, and a taught 12kg pack turned
 * a refusal into $0.1667/kg with `needManual:false`. Pre-ticked, on a matched product.
 *
 * That is `CLAUDE.md`'s exemption-scope trap read backwards: a REFUSAL is scoped to the function
 * that made it, and the paths downstream never asked why the row was refused. The guard is on the
 * two functions rather than on their call sites, because `resolveMatchedPrice` has two callers and
 * the second is the user picking a product by hand — which wants the same answer.
 */
const { resolveMatchedPrice, applySupplierMemory } = require('./_extract');

const CREDIT = '13612 FZ CHIPS - S/CUT 10MM GF 6X2KG GARDEN LAND -2.00 -2.00 CTN $29.50 $-59.00';
const PURCHASE = '13612 FZ CHIPS - S/CUT 10MM GF 6X2KG GARDEN 3.00 3.00 CTN 3.00 CTN $29.50 $0.00 $88.50';

test('⚠️ a TAUGHT PACK does not turn a credit into a purchase', () => {
  const row = Object.assign({}, parsePdfLine(CREDIT));
  resolveMatchedPrice(row, { pack_qty: 12, pack_unit: 'kg' }, null);
  assert.equal(row.unitPrice, null, 'was $0.1667/kg — the credited quantity divided by the pack');
  assert.equal(row.needManual, true);
  assert.equal(row.priceSource, 'manual', 'the taught-pack branch did not run');
});

test('⚠️ SUPPLIER MEMORY does not turn a credit into a purchase either', () => {
  const viaResolve = Object.assign({}, parsePdfLine(CREDIT));
  resolveMatchedPrice(viaResolve, null, { qty: 12, unit: 'kg' });
  assert.equal(viaResolve.unitPrice, null, 'the memory branch of the matched path');
  assert.equal(viaResolve.needManual, true);

  const viaMemory = Object.assign({}, parsePdfLine(CREDIT));
  applySupplierMemory(viaMemory, { qty: 12, unit: 'kg' });
  assert.equal(viaMemory.unitPrice, null, 'and the no-match path, which is a different function');
  assert.equal(viaMemory.needManual, true);
  assert.ok(!viaMemory.remembered, 'nothing was remembered onto a refund');
});

test('⚠️ and the PRECEDENCE RULE is untouched — a purchase still prices off its taught pack', () => {
  /* The half that makes the two tests above meaningful. If the guard were too wide it would take
     the taught pack away from every line, which is a bigger defect than the one it fixes: a taught
     pack is the user's own correction and it outranks the parser by design. Same product, same
     pack, same supplier — the only difference is the sign. */
  const row = Object.assign({}, parsePdfLine(PURCHASE));
  resolveMatchedPrice(row, { pack_qty: 12, pack_unit: 'kg' }, null);
  assert.equal(row.priceSource, 'product-pack', 'the taught pack still wins on a purchase');
  assert.equal(row.needManual, false);
  assert.ok(Math.abs(row.unitPrice - 2.4583) < 0.001,
    `$29.50 a carton over a taught 12kg pack — got ${row.unitPrice}`);
});

test('⚠️ packPriceOf reads the SAME columns the parser does, or a taught pack re-opens D1', () => {
  /* `packPriceOf` carried the old rule — first equal pair, else the last amount — and it feeds the
     path that OUTRANKS the parser. So before this batch a product the user had taught was priced
     at $0.25/kg (the quantity, 3.00, over the 12kg pack) while every untaught product beside it
     came out right. Measured on production: 23 of 431 products carry a taught pack.
     The assertion is on the RESOLVED price rather than on packPriceOf directly, because that is
     what gets stored, and because the two must not be able to disagree. */
  const row = Object.assign({}, parsePdfLine(PURCHASE));
  resolveMatchedPrice(row, { pack_qty: 12, pack_unit: 'kg' }, null);
  assert.ok(row.unitPrice > 2, `a taught pack must not divide the QUANTITY — got ${row.unitPrice}`);

  /* ⚠️ AND THE FALLBACK, WITH A FIXTURE WHOSE THREE AMOUNTS DIFFER. The obvious version of this
     line uses `60.00 60.00 60.00`, and it cannot fail: the repeated pair and the last amount are
     the same number, so it passes whichever of the two `packPriceOf` returns — roster 184(b), a
     fixture whose candidates agree cannot tell you which one the code read. Found by the mutation
     gate, which reported the `p!=null` ternary as surviving once `lineColumns` began short-
     circuiting past it on every other fixture in the file.
     At 130.00 the two answers are $10.00/kg and $21.67/kg. */
  const pairRow = Object.assign({}, parsePdfLine('Beef Mince 6 x 1kg 60.00 60.00 130.00'));
  resolveMatchedPrice(pairRow, { pack_qty: 6, pack_unit: 'kg' }, null);
  assert.equal(pairRow.priceSource, 'product-pack');
  assert.ok(Math.abs(pairRow.unitPrice - 10) < 0.001,
    `the repeated PAIR over a taught 6kg pack, not the line total — got ${pairRow.unitPrice}`);
});

test('⚠️ END TO END through buildInvRows: a matched credit line reaches the screen unpriced', () => {
  /* THE THREE TESTS ABOVE CALL THE RE-PRICERS DIRECTLY, AND THAT LEAVES A GAP THE MUTATION GATE
     FOUND: `buildInvRows` has to CARRY `basis` onto the row it builds, or the refusal the parser
     made is thrown away one line before anything can read it. Break that single `basis:r.basis||null`
     and every assertion above still passes, because they hand `resolveMatchedPrice` a row straight
     from `parsePdfLine` which of course still has its basis.
     So this one drives the real chain the review screen drives — rank, match, resolve, GST, flag —
     and asserts on what the user would actually be shown. */
  const { setInvState, buildInvRows, getInvRows, pdfTextToRows } = require('./_extract');
  setInvState({
    invGst: { mode: 'ex', note: '' },
    PRODUCTS: [{ id: 'CHIPS', description: 'Chips Straight Cut 10mm Gluten Free', brand: 'Garden',
                 unit: 'kg', base_unit: 'kg', cost_per_base_unit: 2.40, pack_qty: 12, pack_unit: 'kg' }]
  });
  buildInvRows(pdfTextToRows([PURCHASE, CREDIT].join('\n')));
  const rows = getInvRows();
  assert.equal(rows.length, 2, 'both lines reach the screen');

  const buy = rows[0], credit = rows[1];
  assert.equal(buy.needManual, false, 'the purchase is priced');
  assert.ok(Math.abs(buy.unitPrice - 2.4583) < 0.001, `the purchase off its taught pack — got ${buy.unitPrice}`);

  assert.equal(credit.unitPrice, null, 'the credit arrives with NO price, through the whole chain');
  assert.equal(credit.needManual, true, 'and asking, so it can never be pre-ticked');
  assert.equal(credit.basis && credit.basis.kind, 'credit',
    'the reason survives onto the row — this is the assertion that dies if buildInvRows drops basis');
});
