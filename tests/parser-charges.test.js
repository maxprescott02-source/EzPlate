/*
 * parser-charges.test.js — a charge is not a product, even when it carries a quantity.
 *
 * Max, 11 Sep 2026, after running the phone list against a real import: **"fuel levys being caught
 * as an item"**. One review row to dismiss on every import from that supplier, every week.
 *
 * The parser audit recorded this as residual D14 and left it, correctly at the time: it is an
 * annoyance rather than a wrong number. What changed is that it is now known to recur weekly, and an
 * annoyance that recurs weekly is worth a rule.
 *
 * WHY IT SURVIVED. `INV_EXCLUDE` already contains `levy|levies`, so the line WAS suspected. The
 * rescue is `hasProductStructure`, which exists so a real product that happens to mention a keyword
 * ("CHEESE ... TOTAL 42.58") is not thrown away — and it decides by looking for a QUANTITY. A fuel
 * levy has one: `1.00 EA`. So the rescue fired every time.
 *
 * THE DISCRIMINATOR IS THE NAME, NOT THE STRUCTURE. If every real word in the name is a charge word,
 * no amount of quantity makes it a thing you cook with.
 *
 * ⚠️ THE RULE ONLY EVER NARROWS A LINE `INV_EXCLUDE` ALREADY MATCHED, which is what makes it cheap
 * to be wrong about. An ordinary product line returns 'ok' before reaching it. The worst case is a
 * MISSING review row — visible, and reportable — rather than a wrong price, which is not.
 */
const test = require('node:test');
const assert = require('node:assert');
const { parsePdfLine, pdfTextToRows } = require('./_extract');

const dropped = (line) => parsePdfLine(line) === null;

test('the real fuel levy, verbatim from a real invoice, is not a product', () => {
  assert.ok(dropped('S77 FUEL LEVY 1.00 1.00 EA 1.00 $3.00 $0.30 $3.30'),
    'this is the row Max dismissed on every import');
});

test('the other charges that wear a quantity go too', () => {
  assert.ok(dropped('FREIGHT 1.00 EA 12.00'));
  assert.ok(dropped('DELIVERY CHARGE 1 EA 8.50'), 'a UNIT word in the name is evidence of neither');
  assert.ok(dropped('MIN ORDER SURCHARGE 1 EA 15.00'));
});

test('⚠️ THE BOUNDARY: a charge word that INV_EXCLUDE does not know is still a row', () => {
  /* This asserts a LIMIT rather than a feature, and it is here because the first draft of this file
     asserted the opposite and went red. `invLineClass` returns 'ok' before reaching the new rule
     unless INV_EXCLUDE matched, and INV_EXCLUDE has no `cartage` or `fee`. So the charge vocabulary
     only ever NARROWS a suspicion; it cannot raise one.
     That is the safe direction and it is deliberate — INV_EXCLUDE gates a great deal of other
     behaviour and widening it to chase a charge nobody has seen on a real invoice would be trading a
     known annoyance for an unknown one. If one of these ever turns up on a real import, the fix is
     one word in INV_EXCLUDE and this test is where to come and change the expectation. */
  assert.ok(!dropped('CARTAGE 1.00 EA 9.90'), 'cartage is not an INV_EXCLUDE keyword, so it is never suspected');
  assert.ok(!dropped('ADMIN FEE 1 EA 5.00'), 'nor is admin, nor fee');
});

test('⚠️ a PRODUCT that merely mentions a keyword is still rescued — that is what the rule it narrows is for', () => {
  /* The whole reason `hasProductStructure` exists. If this regresses, the fix has eaten real lines
     and the symptom is a missing row rather than a wrong price. */
  const r = parsePdfLine("PKT 218662 #CHEESE SLICES TASTY 105'S YARDE FARM 1.5kg 2 21.29 42.58");
  assert.ok(r, 'a real product line survives a keyword in its text');
  assert.ok(r.unitPrice > 0);
});

test('⚠️ and every ordinary product line never reaches the rule at all', () => {
  // These carry no INV_EXCLUDE keyword, so invLineClass returns 'ok' on its first line.
  for (const line of [
    '13612 FZ CHIPS - S/CUT 10MM GF 6X2KG GARDEN 3.00 3.00 CTN 3.00 CTN $29.50 $0.00 $88.50',
    '19022 CHICKEN 1/2 BREAST (F) S/OFF 5KG BAG 5.00 5.00 KG 1.00 BAG $8.90 $0.00 $44.50',
    '20110 FLOUR - PLAIN FLOUR 12.5KG 1.00 1.00 BAG 1.00 BAG $12.50 $0.00 $12.50',
    '2 CTN Beef Mince 6 x 1kg 60.00 60.00 130.00'
  ]) {
    assert.ok(parsePdfLine(line), `${line.slice(0, 40)}… must still be a row`);
  }
});

test('a name made of nothing but units is not dropped', () => {
  /* The `charge > 0` requirement. Without it, a name whose only real words are unit words would be
     excluded on the strength of having no product words — which is a different claim entirely. */
  const r = parsePdfLine('CTN BOX 2 x 1kg 20.00 20.00 40.00');
  assert.ok(r, 'no charge word present, so nothing here says "this is a fee"');
});

test('the levy does not come back through the continuation splice', () => {
  /* pdfTextToRows joins a money-less line onto the row above it. A dropped levy must not be
     resurrected as somebody else's second line, and the row above must not absorb it. */
  const rows = pdfTextToRows([
    '13612 FZ CHIPS - S/CUT 10MM GF 6X2KG GARDEN 3.00 3.00 CTN 3.00 CTN $29.50 $0.00 $88.50',
    'S77 FUEL LEVY 1.00 1.00 EA 1.00 $3.00 $0.30 $3.30'
  ].join('\n'));
  assert.equal(rows.length, 1, 'the chips only');
  assert.ok(!/LEVY/i.test(rows[0].name), 'and the levy is not glued onto its name');
});
