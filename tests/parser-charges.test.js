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
 * ⚠️ THE RULE ONLY EVER NARROWS A LINE `INV_EXCLUDE` ALREADY MATCHED. An ordinary product line
 * returns 'ok' before reaching it.
 * ⚠️ AND THE SENTENCE THAT USED TO FOLLOW THAT ONE WAS FALSE, WHICH IS WHY THE RULE IS AS TIGHT AS
 * IT IS. It said the worst case is "a MISSING review row — visible, and reportable — rather than a
 * wrong price, which is not". The pre-push review went and looked: **nothing reconciles the
 * invoice's line count against the rows built from it**, so a dropped line leaves no trace on any
 * screen. The summary counts what SURVIVED. That sentence was the argument for allowing a loose
 * rule, and it was wrong about the consequence it was weighing.
 */
const test = require('node:test');
const assert = require('node:assert');
const { parsePdfLine, pdfTextToRows } = require('./_extract');
const { loadApp, extractFn, extractVar } = require('./_extractfn');

/* The classifier on its own, so its GUARDS can be asked about directly. Reaching it only through
   parsePdfLine leaves the empty-name path untestable, because invLineClass never calls it with one. */
const SRC = loadApp();
// eslint-disable-next-line no-new-func
const nameIsAllChargeWords = new Function(`
  "use strict";
  ${extractVar(SRC, 'INV_EXCLUDE')}
  ${extractVar(SRC, 'INV_CHARGE_WORD')}
  ${extractFn(SRC, 'nameIsAllChargeWords')}
  return nameIsAllChargeWords;
`)();

const dropped = (line) => parsePdfLine(line) === null;

test('the real fuel levy, verbatim from a real invoice, is not a product', () => {
  assert.ok(dropped('S77 FUEL LEVY 1.00 1.00 EA 1.00 $3.00 $0.30 $3.30'),
    'this is the row Max dismissed on every import');
});

test('the other charges on a real columnar line go too', () => {
  /* `name` is sliced at the FIRST money, so on a real invoice line — which has an Ordered column, a
     Shipped column and several amounts — the name is the description alone. That is the shape these
     assert. */
  assert.ok(dropped('FREIGHT 1.00 EA 12.00'));
  assert.ok(dropped('S99 DELIVERY SURCHARGE 1.00 1.00 EA 1.00 $8.50 $0.00 $8.50'));
  assert.ok(dropped('MIN ORDER CHARGE 1.00 1.00 EA 1.00 $15.00 $0.00 $15.00'));
});

test('⚠️ THE SECOND BOUNDARY: a quantity that leaks into the NAME stops the rule, and that is the safe direction', () => {
  /* On a line with only ONE money value the name runs past the quantity — "DELIVERY CHARGE 1 EA 8.50"
     has the name "DELIVERY CHARGE 1 EA", and `EA` is not a charge word, so the rule declines.
     ⚠️ THE FIRST CUT EXEMPTED UNIT WORDS TO CATCH EXACTLY THIS, AND THAT EXEMPTION WAS THE BUG.
     `INV_QTY_UNIT` holds bag, box, carton, tray, roll — which a cafe buys as THINGS. With them
     exempt, a name only had to pair one INV_EXCLUDE word with one of them to vanish: `DELIVERY BAG`
     and `FREIGHT ROLL` were both dropped, silently. So the rule requires every word to be a charge
     word, and the cost is that a charge on a single-money line stays a review row.
     That is the right way round: an extra row to dismiss is an annoyance, and a missing product is a
     price that never lands. */
  assert.ok(!dropped('DELIVERY CHARGE 1 EA 8.50'), 'the quantity is inside the name here');
  assert.ok(!dropped('MIN ORDER SURCHARGE 1 EA 15.00'));
});

test('⚠️ A CAFE BUYS BAGS, BOXES, TRAYS AND ROLLS — none of them may vanish', () => {
  /* The regression the pre-push review found, and the reason the unit exemption is gone. Every one
     of these is a real thing on a real foodservice invoice, and every one was dropped with NO trace
     on any screen: nothing reconciles the invoice's line count against the rows built from it, so a
     dropped line is not "a missing row you would notice" — it is silence. */
  for (const line of ['DELIVERY BAG 1 EA 5.00', 'FREIGHT ROLL 1 EA 9.00',
                      'DELIVERY TRAY 2 EA 12.00', 'BOX OF FREIGHT LABELS 1 EA 4.00']) {
    assert.ok(!dropped(line), `${line} is a product, not a fee`);
  }
});

test('THE FIRST BOUNDARY: a charge word that INV_EXCLUDE does not know is still a row', () => {
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

test('⚠️ a name with no real words is NOT a charge — the empty guard, asked directly', () => {
  /* Unreachable through `invLineClass`, which only calls this once INV_EXCLUDE has matched, and every
     one of that regex's alternatives is two or more letters — so a name that reaches it always has a
     word in it. The guard is a contract on the FUNCTION rather than a live branch at its one call
     site, and the mutation gate found it unpinned because the only route to it was that call site.
     It matters in the direction that costs: flipped, a nameless line is a "charge" and is DISCARDED. */
  assert.equal(nameIsAllChargeWords(''), false);
  assert.equal(nameIsAllChargeWords('S77 1.00'), false, 'a bare code and a number say nothing either way');
  assert.equal(nameIsAllChargeWords('1 2 3'), false);
  assert.equal(nameIsAllChargeWords(null), false);
  // and the positive case through the same door, so the function is not simply always-false
  assert.equal(nameIsAllChargeWords('S77 FUEL LEVY'), true);
});
