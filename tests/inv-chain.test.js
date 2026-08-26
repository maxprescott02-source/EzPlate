/*
 * inv-chain.test.js — QUEUE 0c. THE SEAM, not the parts.
 *
 * The finding that commissioned this file: every function in the invoice pricing chain is
 * individually correct and individually tested, and the wrong numbers were arriving anyway.
 * `derivePackPrice` is correct. `resolveMatchedPrice` is correct. `invGstDetect` is correct. The
 * defect 197 shipped lived in the twenty lines that call them in order, and nothing ran those
 * twenty lines — `grep -rn buildInvRows tests/` returned one hit and it was a comment.
 *
 * So this file runs the WHOLE chain: raw invoice text -> pdfTextToRows -> buildInvRows -> a review
 * row, against a known product set, and asserts the row a human would actually see. Everything is
 * the real shipped code, sliced by tests/_extract.js. There is no stub anywhere in it, which
 * matters more here than usual: a stub of any one link would be a second implementation of the
 * exact composition under test.
 *
 * WHAT THIS PINS THAT NOTHING ELSE DID: candidate ranking feeding the confidence tier, the tier
 * feeding the add-new threshold, the threshold deciding bestId, and bestId deciding whether
 * resolveMatchedPrice runs at all. Four decisions in a row where each one's output is the next
 * one's input, which is the shape a single-function test cannot see.
 */
const test = require('node:test');
const assert = require('node:assert');
const H = require('./_extract.js');

const EX = { mode: 'ex', note: '' };
const INC = { mode: 'inc', note: '' };

/* A small, REAL-shaped catalogue. The three base units are all represented on purpose: the unit
   guard is a comparison between the row's unit and the product's, so a fixture where they all agree
   cannot tell you which side the code read (roster 184(b)). */
const CATALOGUE = [
  { id: 'P1', description: 'Chips Straight Cut 10Mm', brand: 'Safries', base_unit: 'g',  cost_per_base_unit: 0.0050 },
  { id: 'P2', description: 'Tomato Diced Italian Tinned Peeled', brand: 'Ardmona', base_unit: 'g', cost_per_base_unit: 0.0030 },
  { id: 'P3', description: 'Eggs Free Range 700G', brand: 'Sunny', base_unit: 'ea', cost_per_base_unit: 0.50 },
  { id: 'P4', description: 'Cheese Slices Tasty', brand: 'Yarde Farm', base_unit: 'ea', cost_per_base_unit: 0.20 },
];

/** Drive the real chain over one invoice line and hand back the row the review screen would build. */
function chain(line, opts) {
  opts = opts || {};
  H.setInvState({
    PRODUCTS: opts.products || CATALOGUE,
    invGst: opts.gst || EX,
    invSupplier: opts.supplier || '',
    supplierMem: opts.mem || {},
  });
  H.buildInvRows(H.pdfTextToRows(line));
  const rows = H.getInvRows();
  assert.strictEqual(rows.length, 1, `the fixture line must yield exactly one row, got ${rows.length}: ${line}`);
  return rows[0];
}

/* ---------------------------------------------------------------------------
 * 1. RANK -> TIER -> ADD-NEW -> bestId. Four decisions, each one's output the next one's input.
 * ------------------------------------------------------------------------- */

test('0c: a confident match resolves all the way to a priced, matched row', () => {
  const r = chain('CHIPS STRAIGHT CUT 10MM 10KG  55.00  55.00');
  assert.strictEqual(r.bestId, 'P1');
  assert.strictEqual(r.addNew, false);
  assert.strictEqual(r.tier, 'hi');
  assert.strictEqual(r.unit, 'kg');
  assert.strictEqual(r.unitPrice, 5.5, '$55 over a 10kg line is $5.50/kg');
  assert.strictEqual(r.needManual, false);
  assert.strictEqual(r.unitMismatch, false, 'kg against a per-gram product is the SAME category');
  assert.strictEqual(r.priceSource, 'parser');
});

test('0c: the three confidence tiers are the thresholds the code states, driven from real names', () => {
  // hi >= 0.6, mid 0.3-0.59, lo < 0.3. Measured against the real ranker rather than asserted from
  // the comment: these three lines were chosen BY running them, which is the only way to be sure a
  // fixture lands in the band its test claims.
  assert.strictEqual(chain('BULK PEELED CARTON 6X2.5KG  30.00  30.00').tier, 'hi');
  const mid = chain('ARDMONA PEELED 6X2.5KG  30.00  30.00');
  assert.strictEqual(mid.tier, 'mid');
  assert.ok(mid.conf >= 0.3 && mid.conf < 0.6, `mid must sit in the band, got ${mid.conf}`);
  assert.strictEqual(mid.bestId, 'P2', 'a mid row still carries its match — it is a tick it waits for, not a name');
  assert.strictEqual(mid.addNew, false);
});

test('0c: EXACTLY 0.6 is hi — the boundary is `>=`, and one character decides the auto-tick', () => {
  /* The tier boundary is the highest-consequence number in this function and the hardest to test by
     accident: `top>=0.6?'hi':...`, and only a 'hi' row can ever reach 'matched', which is the only
     state that PRE-TICKS. Flip that `>=` to `>` and every row sitting exactly on the line stops
     auto-ticking; flip the add-new `<` the other way and a row stops being matched at all.
     0.6 is reachable exactly, and not by contrivance: rankCandidates floors the score at 0.6
     whenever the first content word matches and is four characters or more ("one strong content
     word is enough"), so this is the value the FLOOR produces, on the boundary it is set to. A
     fixture at 0.5 or 0.65 cannot see either flip. */
  const r = chain('TOMATO BULK CARTON PALLET STOCK 6X2.5KG  30.00  30.00');
  assert.strictEqual(r.conf, 0.6, 'the fixture must land ON the boundary, or this test is about nothing');
  assert.strictEqual(r.tier, 'hi', '>= 0.6 is hi — exactly 0.6 is INSIDE');
  assert.strictEqual(r.addNew, false);
  assert.strictEqual(r.bestId, 'P2');
});

test('0c: below the add-new threshold there is NO match, and the two facts move together', () => {
  /* addNew and bestId are computed from the same `top`, one line apart, and the row is unusable if
     they disagree: an add-new row with a bestId would offer to create a product AND overwrite one. */
  const r = chain('FRESH PRODUCE MIXED 6X2.5KG  30.00  30.00');
  assert.strictEqual(r.addNew, true);
  assert.strictEqual(r.bestId, null, 'an add-new row must carry no match at all');
  assert.strictEqual(r.tier, 'lo');
  assert.ok(r.conf < 0.3, `below the threshold, got ${r.conf}`);
  assert.strictEqual(r.unitPrice, 2, '$30 over 15kg — the parser price survives; the row is new, not unreadable');
});

/* ---------------------------------------------------------------------------
 * 2. THE UNIT GUARD, reached through the chain rather than called directly.
 * ------------------------------------------------------------------------- */

test('0c: a parser price in the wrong category is BLOCKED, and blocked means needManual', () => {
  // Eggs are stored per unit; the line prices them per kg. resolveMatchedPrice sets both flags and
  // the review screen reads both — one without the other is a red row nobody can resolve, or a
  // resolvable row with no warning.
  const r = chain('EGGS FREE RANGE 700G 1DOZ  8.40  8.40');
  assert.strictEqual(r.bestId, 'P3');
  assert.strictEqual(r.unitMismatch, true);
  assert.strictEqual(r.needManual, true, 'the mismatch must also force the manual path');
});

test('0c: same category, no block — or every ordinary weighted line would flag', () => {
  const r = chain('TOMATO DICED TINNED 6X2.5KG  30.00  30.00');
  assert.strictEqual(r.unitMismatch, false);
  assert.strictEqual(r.needManual, false);
  assert.strictEqual(r.unitPrice, 2, '$30 over 15kg');
});

/* ---------------------------------------------------------------------------
 * 3. PRECEDENCE: product pack > supplier memory > parser. Max's real repro.
 * ------------------------------------------------------------------------- */

const SLICES = "CHEESE SLICES TASTY 105S 1.5KG  21.00  21.00";

test('0c: MAX’S REPRO — the parser reads 1.5kg and gets the unit wrong; the taught pack fixes it', () => {
  /* The invoice never says how many slices, so the parser derives $14.00/kg from the 1.5kg it CAN
     see — against a product stored per unit, which is why the guard fires. Teaching 105 units turns
     the same line into $0.20/slice with nothing flagged. This is one line resolving two completely
     different ways depending on state the parser cannot see, which is exactly the seam. */
  const raw = chain(SLICES);
  assert.strictEqual(raw.priceSource, 'parser');
  assert.strictEqual(raw.unitPrice, 14, '$21 over 1.5kg');
  assert.strictEqual(raw.unitMismatch, true, 'per kg against a per-unit product');

  const taught = chain(SLICES, {
    products: CATALOGUE.map(p => (p.id === 'P4' ? { ...p, pack_qty: 105, pack_unit: 'ea' } : p)),
  });
  assert.strictEqual(taught.priceSource, 'product-pack');
  assert.strictEqual(taught.unitPrice, 0.2, '$21 over 105 slices');
  assert.strictEqual(taught.unit, 'ea');
  assert.strictEqual(taught.unitMismatch, false);
  assert.strictEqual(taught.needManual, false);
});

test('0c: supplier memory prices the line when the product has NO pack of its own', () => {
  const key = 'bidfood|' + H.normalizePhrase('CHEESE SLICES TASTY 105S 1.5KG');
  const mem = {}; mem[key] = { qty: 105, unit: 'ea' };
  const r = chain(SLICES, { supplier: 'Bidfood', mem });
  assert.strictEqual(r.priceSource, 'memory');
  assert.strictEqual(r.unitPrice, 0.2);
  assert.strictEqual(r.unit, 'ea');
});

test('0c: the product’s OWN pack outranks supplier memory when they disagree', () => {
  /* The precedence is only observable when the two say DIFFERENT things — a fixture where they agree
     cannot tell you which one the code read (roster 184(b)). 105 against 21 is a five-fold gap, so
     the wrong winner is unmistakable rather than a rounding argument. */
  const key = 'bidfood|' + H.normalizePhrase('CHEESE SLICES TASTY 105S 1.5KG');
  const mem = {}; mem[key] = { qty: 21, unit: 'ea' };
  const r = chain(SLICES, {
    products: CATALOGUE.map(p => (p.id === 'P4' ? { ...p, pack_qty: 105, pack_unit: 'ea' } : p)),
    supplier: 'Bidfood', mem,
  });
  assert.strictEqual(r.priceSource, 'product-pack');
  assert.strictEqual(r.unitPrice, 0.2, 'the PACK’s 105, not memory’s 21 (which would be $1.00)');
});

/* ---------------------------------------------------------------------------
 * 4. GST: converted ONCE, on the price that gets stored. 197's defect, pinned through the chain.
 * ------------------------------------------------------------------------- */

test('0c: the GST conversion lands on the RESOLVED price, not the parser’s candidate', () => {
  /* 197's defect in one assertion. The conversion used to run on the parser's price inside
     buildInvRows, and a taught pack then REPLACED that price by re-reading the raw line — which is
     still GST-inclusive — so the one path that got divided was the one that loses the precedence
     contest. The two rows below take different precedence branches and must both come back ex-GST. */
  const packed = CATALOGUE.map(p => (p.id === 'P4' ? { ...p, pack_qty: 105, pack_unit: 'ea' } : p));
  const inc = chain(SLICES, { products: packed, gst: INC });
  const ex  = chain(SLICES, { products: packed, gst: EX });
  assert.strictEqual(ex.unitPrice, 0.2);
  assert.ok(Math.abs(inc.unitPrice - 0.2 / 1.1) < 1e-9,
    `a taught pack on a GST-inclusive invoice must be divided too, got ${inc.unitPrice}`);

  const parserInc = chain('CHIPS STRAIGHT CUT 10MM 10KG  55.00  55.00', { gst: INC });
  assert.ok(Math.abs(parserInc.unitPrice - 5.5 / 1.1) < 1e-9, 'and so must a parser-priced row');
});

test('0c: an EXCLUSIVE invoice is not divided — the conversion is a decision, not a habit', () => {
  const r = chain('CHIPS STRAIGHT CUT 10MM 10KG  55.00  55.00', { gst: EX });
  assert.strictEqual(r.unitPrice, 5.5);
});

/* ---------------------------------------------------------------------------
 * 5. QUEUE 0c, batch 203 — THE REST OF buildInvRows, measured rather than assumed.
 *
 * Sections 1-4 above were written against 197's GST defect and cover the pricing spine. The
 * mutation gate then reported TWELVE survivors on this function, and none of them was subtle:
 * every one was a decision in these twenty lines that no test had ever read back. The tier
 * boundary at 0.3, the row's provenance flags, which of `raw` and `name` the supplier-memory key
 * is built from, and whether the no-match memory branch runs at all.
 *
 * ⚠️ ONE OF THE TWELVE WAS NOT A GAP IN THIS FILE — it was a gap in the HARNESS. `tests/_extract.js`
 * stubbed `flagNeedsAttention` as a no-op on the grounds that it was "DOM-bound", which it is not:
 * it touches no DOM, reads byId and cpbu, and writes row.needsAttention. With a no-op stub in its
 * place, DELETING buildInvRows' call to it was indistinguishable from keeping it. It is extracted
 * now, and the two tests at the end of this section are what that bought.
 * ------------------------------------------------------------------------- */

/* A long product, used only for the confidence-boundary test. rankCandidates scores an invoice line
   as overlapping-tokens / the SHORTER of the two token counts, so landing exactly on 0.3 needs a
   product with at least ten meaningful tokens — the four in CATALOGUE above all score in coarser
   steps (sixths and fifths) and cannot express the boundary at all. */
const LONG_PRODUCT = {
  id: 'P5', base_unit: 'ea', cost_per_base_unit: 1, brand: '',
  description: 'Chicken Breast Fillet Skinless Boneless Marinated Peri Lemon Herb Crumbed',
};

test('0c: EXACTLY 0.3 is a MATCH — the add-new threshold and the mid tier are the same boundary', () => {
  /* The sibling of the 0.6 test in section 1, and the more consequential of the two: 0.6 decides
     whether a matched row is confident, 0.3 decides whether there is a match AT ALL. `top<0.3` is
     add-new and `top>=0.3` is the mid tier, one line apart, and they must agree about the same
     number — a row that is add-new and mid would offer to create a product it has also matched.
     Flip either character and a line sitting on the boundary stops carrying its match: the user is
     offered "create new product" for something already in the catalogue, and applying it makes a
     duplicate at a second price.
     The fixture lands on 0.3 exactly by construction — ten tokens on each side, three shared
     ("skinless", "boneless", "crumbed") and a first word that matches nothing, which keeps the
     0.6 floor (a strong first content word) out of it. It was found by RUNNING the ranker, not by
     reading it; the assertion below fails loudly if it ever drifts off the boundary. */
  const r = chain('BEEF RUMP SKINLESS BONELESS CRUMBED SEALED SMOKED LOIN RIBS WINGS  30.00  30.00',
    { products: CATALOGUE.concat([LONG_PRODUCT]) });

  assert.strictEqual(r.conf, 0.3, 'the fixture must land ON the boundary, or this test is about nothing');
  assert.strictEqual(r.addNew, false, '<0.3 is add-new — exactly 0.3 is NOT');
  assert.strictEqual(r.bestId, 'P5', 'and a matched row carries the match');
  assert.strictEqual(r.tier, 'mid', '>=0.3 is mid — exactly 0.3 is INSIDE');
});

test('0c: `raw` is the whole invoice line and `name` is only the part before the price', () => {
  /* Two fields, and everything downstream picks between them: the supplier-memory key is built from
     `raw`, and so is every pack price re-read (packPriceOf, derivePackPrice). Collapsing `raw` to
     `name` would throw away the half of the line that carries the money and the pack size, and the
     row would still look perfectly well-formed. */
  const line = 'CHIPS STRAIGHT CUT 10MM 10KG  55.00  55.00';
  const r = chain(line);
  assert.strictEqual(r.raw, line, 'raw is the line as the invoice printed it');
  assert.strictEqual(r.name, 'CHIPS STRAIGHT CUT 10MM 10KG', 'name stops at the first money');
  assert.notStrictEqual(r.raw, r.name, 'the two must differ, or nothing below can tell which was read');
});

test('0c: the provenance flags start OFF, and `uncertain` is a real boolean either way', () => {
  /* `remembered` says the price came from supplier memory and is read by the review screen to
     explain the number; starting it at true would credit memory for every parser price in the app.
     `uncertain` marks a line that reads like a summary row but has product shape — the coercion
     matters because the parser passes `undefined` for an ordinary line, and `undefined` and `false`
     render the same until something asks. Both directions are asserted: a plain line is false, and
     a line carrying a summary keyword is true. */
  const plain = chain('CHIPS STRAIGHT CUT 10MM 10KG  55.00  55.00');
  assert.strictEqual(plain.remembered, false, 'a parser-priced row remembers nothing');
  assert.strictEqual(plain.uncertain, false, 'and is not a suspected summary line');

  const suspect = chain('CREDIT NOTE CHIPS 10KG  55.00  55.00');
  assert.strictEqual(suspect.uncertain, true, '"credit" is a summary keyword — with product shape it is UNCERTAIN, not excluded');
  assert.strictEqual(suspect.unitPrice, 5.5, 'and it is still priced: uncertain is a flag, not a refusal');
});

test('0c: a row with no price ASKS, even if its producer forgot to say so', () => {
  /* `needManual:(!!r.needManual || up==null)` is two claims OR'd: what the producer said, and what
     the row actually has. Today's two producers set them together, so the OR arm is only reachable
     from a producer that disagrees with itself — which is precisely what it is defending against,
     and why it is worth a test rather than an argument. Handing buildInvRows a row that claims to
     be priced and carries no price is the whole case: with the OR, it asks; without it, the review
     screen shows a confident row with an empty price and applying it writes nothing. */
  H.setInvState({ PRODUCTS: CATALOGUE, invGst: EX, invSupplier: '', supplierMem: {} });
  H.buildInvRows([{ name: 'MYSTERY WIDGET CARTON', raw: 'MYSTERY WIDGET CARTON  12.00  12.00',
                    unitPrice: null, unit: 'auto', needManual: false, uncertain: false }]);
  const r = H.getInvRows()[0];
  assert.strictEqual(r.unitPrice, null, 'the fixture must carry no price, or it is testing nothing');
  assert.strictEqual(r.needManual, true, 'no price means manual, whatever the producer claimed');
});

/* ---------------------------------------------------------------------------
 * 5b. The no-match memory branch — `else if(row.needManual && mem)`.
 *
 * Section 3 above covers memory on a MATCHED row, which is resolveMatchedPrice's memory arm. This
 * is the other one: a line that matched no product at all, which the parser could not price, and
 * which supplier memory rescues. It is the only branch in this function that can turn an unusable
 * row into a priced one, and nothing had ever taken it.
 * ------------------------------------------------------------------------- */

/* A line no product in CATALOGUE matches, that the parser cannot price (no weight, no count, no
   explicit unit price), and whose text CONTINUES PAST THE PRICE — the trailing "CARTON" is what
   makes `raw` and `name` normalise differently, so the test below can tell which one the memory key
   was built from. Columnar invoices really do print a UOM column after the price. */
const NOMATCH = 'MYSTERY WIDGET  12.00  12.00  CARTON';

test('0c: supplier memory rescues a line that matched NOTHING and the parser could not price', () => {
  const bare = chain(NOMATCH);
  assert.strictEqual(bare.addNew, true, 'the fixture must match no product');
  assert.strictEqual(bare.needManual, true, 'and must be unpriceable by the parser');
  assert.strictEqual(bare.unitPrice, null);

  const mem = {}; mem['bidfood|' + H.normalizePhrase(NOMATCH)] = { qty: 6, unit: 'ea' };
  const r = chain(NOMATCH, { supplier: 'Bidfood', mem });
  assert.strictEqual(r.unitPrice, 2, '$12.00 over a remembered 6-pack');
  assert.strictEqual(r.unit, 'ea');
  assert.strictEqual(r.needManual, false, 'the row stops asking');
  assert.strictEqual(r.remembered, true, 'and says the price came from memory');
  assert.strictEqual(r.addNew, true, 'a remembered price does not invent a match — this is still a new product');
});

test('0c: the memory key is built from `raw`, not from `name`', () => {
  /* `memKey(invSupplier, row.raw||row.name)` — and the two normalise differently whenever the line
     carries text after the price, which columnar invoices do. Keying off `name` would miss every
     such memory silently: the row simply comes back unpriced, which is indistinguishable from the
     user never having taught it. The fixture proves the keys differ before relying on it. */
  const keyFromRaw = 'bidfood|' + H.normalizePhrase(NOMATCH);
  const keyFromName = 'bidfood|' + H.normalizePhrase('MYSTERY WIDGET');
  assert.notStrictEqual(keyFromRaw, keyFromName, 'the fixture must distinguish the two keys');

  const onName = {}; onName[keyFromName] = { qty: 6, unit: 'ea' };
  const r = chain(NOMATCH, { supplier: 'Bidfood', mem: onName });
  assert.strictEqual(r.unitPrice, null, 'a memory filed under the NAME must not be found');
  assert.strictEqual(r.remembered, false);
});

test('0c: with no supplier detected, memory is not consulted at all', () => {
  /* memKey is supplier-scoped, and `normSupplier(invSupplier)` guards the lookup — an invoice whose
     supplier could not be read must not borrow another supplier's packs. */
  const mem = {}; mem['|' + H.normalizePhrase(NOMATCH)] = { qty: 6, unit: 'ea' };
  const r = chain(NOMATCH, { supplier: '', mem });
  assert.strictEqual(r.unitPrice, null, 'an unattributed invoice reads nobody’s memory');
  assert.strictEqual(r.remembered, false);
});

/* ---------------------------------------------------------------------------
 * 5c. flagNeedsAttention — the one signal per row, reached through the chain.
 * ------------------------------------------------------------------------- */

test('0c: every row gets its attention flag decided — a mismatch is RAISED', () => {
  /* buildInvRows' last act on each row. Deleting the call leaves `needsAttention` undefined on
     every row, which renders as "nothing to see" for the whole import: the unit mismatch below is
     the case CLAUDE.md's taught-pack section is about, and it is the one thing on that screen
     asking the user to look. */
  const r = chain('EGGS FREE RANGE 700G 1DOZ  8.40  8.40');
  assert.strictEqual(r.unitMismatch, true, 'per-kg against a per-unit product');
  assert.strictEqual(r.needsAttention, true, 'and the row must SAY so');

  const clean = chain('CHIPS STRAIGHT CUT 10MM 10KG  55.00  55.00');
  assert.strictEqual(clean.needsAttention, false, 'an ordinary matched row is quiet — or the flag means nothing');
});

test('0c: a price JUMP is flagged, and an ordinary move is not', () => {
  /* The flag's other half, and the one that decides whether the threshold is doing anything. P1 is
     stored at $0.0050/g, i.e. $5.00/kg. A 10% move is trading; a 20% move is worth a glance.
     Both rows are otherwise identical, so the only thing that can move the flag is the price. */
  const ordinary = chain('CHIPS STRAIGHT CUT 10MM 10KG  55.00  55.00');
  assert.strictEqual(ordinary.unitPrice, 5.5, '+10% on the stored $5.00/kg');
  assert.strictEqual(ordinary.needsAttention, false, 'inside the threshold — no flag');

  const jump = chain('CHIPS STRAIGHT CUT 10MM 10KG  60.00  60.00');
  assert.strictEqual(jump.unitPrice, 6, '+20% on the stored $5.00/kg');
  assert.strictEqual(jump.needsAttention, true, 'past the threshold — flagged');
});

test('0c: `rawUnit` keeps what the PARSER read, even after resolution overwrites `unit`', () => {
  /* Two unit fields on one row, and they exist because they are allowed to disagree: `unit` is the
     resolved answer that gets stored, `rawUnit` is what the invoice line itself said. The only
     reader is invSelChanged — when the user picks a different product, `r.unit=(r.rawUnit||...)`
     rewinds the row to the parser's reading before re-resolving against the new match.
     Collapse rawUnit to 'auto' and that rewind throws the invoice's own units away: switching the
     match on a per-kg line re-resolves it as if the line had stated no unit at all.
     The taught-pack row below is the fixture that can see it, because there the two fields hold
     DIFFERENT values — on an ordinary row they agree, and agreement cannot tell you which was read. */
  const packed = CATALOGUE.map(p => (p.id === 'P4' ? { ...p, pack_qty: 105, pack_unit: 'ea' } : p));
  const r = chain(SLICES, { products: packed });

  assert.strictEqual(r.priceSource, 'product-pack', 'the taught pack must have won, or the two units agree');
  assert.strictEqual(r.unit, 'ea', 'the RESOLVED unit is the taught pack’s');
  assert.strictEqual(r.rawUnit, 'kg', 'and the parser’s own reading survives beside it');

  const plain = chain('CHIPS STRAIGHT CUT 10MM 10KG  55.00  55.00');
  assert.strictEqual(plain.rawUnit, 'kg', 'an unresolved row carries the parser’s unit too');

  const unreadable = chain(NOMATCH);
  assert.strictEqual(unreadable.rawUnit, 'auto', 'and a line stating no unit says so, rather than guessing');
});
