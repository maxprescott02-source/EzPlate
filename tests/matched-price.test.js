/*
 * matched-price.test.js — QUEUE 0c, fourth slice. `resolveMatchedPrice`, the precedence itself.
 *
 * WHAT THE FUNCTION IS. It is the whole of "product pack > supplier memory > parser" — the rule
 * CLAUDE.md names as a fragile area and the one every invoice import runs on every matched line. It
 * picks ONE of three price sources, writes the price and its unit onto the row, records which source
 * won, copies the taught pack onto the row so the review screen can show it, and finally decides
 * whether a parser GUESS landed in the wrong unit category and must be blocked.
 *
 * WHY IT HAS ITS OWN FILE despite four others declaring it. The four are about their own subjects
 * (a product's pack, a pack surviving a re-import, ingredient units, GST) and they reach this
 * function through those subjects, which is why 31 of its 55 mutants already die against them. The
 * 24 that did not are the parts no subject leads through: the memory arm's unit spellings, the
 * fall-through to manual, and the four provenance fields it writes at the end. This file goes at
 * those directly rather than finding a longer route to them.
 *
 * ⚠️ THE FUNCTION IS ON `CLAUDE.md`'s NEVER-TOUCH LIST and inside the protected parser region.
 * Nothing here edits it. It is extracted by `tests/_extract.js` and called exactly as its two
 * callers call it — `buildInvRows` on a matched line, and `invSelChanged` when the user re-picks.
 *
 * ⚠️ AND ITS EXEMPTION IS THE ONE `CLAUDE.md` DEVOTES A SECTION TO: a taught pack is exempt from the
 * unit guard, because "a pack the user taught is the truth". That exemption is about PRICE and the
 * write it unblocked also wrote a UNIT, which cost $2166.67 on a $1.30 line. The tests in section 4
 * pin the exemption's boundary in both directions, because a batch widening it needs to see the
 * shape of what it is widening.
 */
const test = require('node:test');
const assert = require('node:assert');
const H = require('./_extract.js');

/* $21.00 repeated is the per-pack price column, which is what packPriceOf reads off the raw line.
   Every fixture below prices the SAME line three different ways, so a wrong winner is never a
   rounding argument: $0.20 a slice, $14.00 a kilo and $21.00 flat are unmistakable apart. */
const RAW = 'CHEESE SLICES TASTY 105S 1.5KG  21.00  21.00';

/** A matched row as buildInvRows hands one over: the parser has already had its go. */
function row(over) {
  return Object.assign({
    name: 'CHEESE SLICES TASTY 105S 1.5KG',
    raw: RAW,
    unitPrice: 14,          // the parser's own derivation: $21 over the 1.5kg it can see
    unit: 'kg',
    needManual: false,
    remembered: false,
  }, over || {});
}

/** The three fields resolveMatchedPrice reads off a product. `base_unit` is what the guard compares. */
function product(over) {
  return Object.assign({ pack_qty: 105, pack_unit: 'ea', base_unit: 'ea' }, over || {});
}

/* ---------------------------------------------------------------------------
 * 1. THE PRECEDENCE, one source at a time and then against each other.
 * ------------------------------------------------------------------------- */

test('0c: each of the three sources prices the SAME line differently, and says which it was', () => {
  /* The three arms in isolation. They must disagree numerically or nothing below can tell which one
     ran (roster 184(b)), and `priceSource` is the field the review screen reads to explain the
     number to the user — a right price under the wrong provenance is a row nobody can audit. */
  const pack = row(); H.resolveMatchedPrice(pack, product(), null);
  assert.strictEqual(pack.priceSource, 'product-pack');
  assert.strictEqual(pack.unitPrice, 0.2, '$21 over a taught 105-slice pack');
  assert.strictEqual(pack.unit, 'ea');

  const mem = row(); H.resolveMatchedPrice(mem, null, { qty: 1.5, unit: 'kg' });
  assert.strictEqual(mem.priceSource, 'memory');
  assert.strictEqual(mem.unitPrice, 14, '$21 over a remembered 1.5kg pack');
  assert.strictEqual(mem.unit, 'kg');
  assert.strictEqual(mem.needManual, false, 'a remembered price stops the row asking — that is the point of it');

  const parser = row(); H.resolveMatchedPrice(parser, null, null);
  assert.strictEqual(parser.priceSource, 'parser');
  assert.strictEqual(parser.unitPrice, 14, 'the row keeps the price it arrived with');
  assert.strictEqual(parser.unit, 'kg');
});

test('0c: the order is pack, then memory, then parser — proved with all three in play at once', () => {
  /* Precedence is only observable when the candidates DISAGREE, so this hands the function three
     answers to the same line and checks which survives, then removes them one at a time. */
  const all = row(); H.resolveMatchedPrice(all, product(), { qty: 1.5, unit: 'kg' });
  assert.strictEqual(all.priceSource, 'product-pack', 'the pack outranks both');
  assert.strictEqual(all.unitPrice, 0.2);

  const noPack = row(); H.resolveMatchedPrice(noPack, null, { qty: 1.5, unit: 'kg' });
  assert.strictEqual(noPack.priceSource, 'memory', 'memory outranks the parser');
  assert.strictEqual(noPack.unitPrice, 14);
});

test('0c: a product with a pack size but NO pack unit is not a taught pack', () => {
  /* Both halves are required and the function says so with an `&&`. A pack quantity alone cannot be
     priced — 105 of WHAT — and treating it as one would silently default to "each": this line would
     come back at $0.20 a unit against a product stored per gram, which is the invisible-magnitude
     failure CLAUDE.md's taught-pack section is about. It must fall through instead. */
  const r = row(); H.resolveMatchedPrice(r, product({ pack_unit: null }), null);
  assert.strictEqual(r.priceSource, 'parser', 'half a pack is not a pack');
  assert.strictEqual(r.unitPrice, 14);
  assert.strictEqual(r.taughtQty, undefined, 'and nothing is recorded as taught');
});

test('0c: no product at all is a safe no-op, not a throw', () => {
  /* `invSelChanged` passes null whenever the matched product cannot be resolved, so the first guard
     is reached in production rather than only in theory. */
  const r = row();
  assert.strictEqual(H.resolveMatchedPrice(r, null, null), r, 'it mutates and returns the row');
  assert.strictEqual(r.priceSource, 'parser');
});

/* ---------------------------------------------------------------------------
 * 2. THE MEMORY ARM, which is where the units live.
 * ------------------------------------------------------------------------- */

test('0c: every remembered unit maps to the right STORED unit and the right divisor', () => {
  /* Three stored units reached by five spellings, with a 1000x conversion inside two of them. The
     unit and the price are asserted TOGETHER for every case because they fail independently: a
     wrong branch gives the right number under the wrong unit, and only one of those two is visible
     to a human reading the review screen.
     ⚠️ This arithmetic is duplicated in `applySupplierMemory`, which prices the NO-MATCH rows. The
     two are separate functions on separate branches of buildInvRows and each has its own test file;
     if one is ever changed, the other is the thing to check. */
  const cases = [
    { unit: 'kg', expectUnit: 'kg', expectPrice: 14,    why: '$21 / 1.5kg' },
    { unit: 'g',  expectUnit: 'kg', expectPrice: 14000, why: '$21 / 0.0015kg — grams are stored per kg' },
    { unit: 'l',  expectUnit: 'l',  expectPrice: 14,    why: '$21 / 1.5L' },
    { unit: 'ml', expectUnit: 'l',  expectPrice: 14000, why: '$21 / 0.0015L — millilitres are stored per litre' },
    { unit: 'ea', expectUnit: 'ea', expectPrice: 14,    why: '$21 / 1.5 units' },
  ];
  for (const c of cases) {
    const r = row(); H.resolveMatchedPrice(r, null, { qty: 1.5, unit: c.unit });
    assert.strictEqual(r.priceSource, 'memory', `${c.unit} must reach the memory arm at all`);
    assert.strictEqual(r.unit, c.expectUnit, `${c.unit} must be STORED as ${c.expectUnit}`);
    assert.ok(Math.abs(r.unitPrice - c.expectPrice) < 1e-9, `${c.unit}: ${c.why}, got ${r.unitPrice}`);
  }
});

test('0c: the spellings are case-insensitive, and an absent unit means EACH', () => {
  const upper = row(); H.resolveMatchedPrice(upper, null, { qty: 1.5, unit: 'KG' });
  assert.strictEqual(upper.unit, 'kg');
  assert.strictEqual(upper.unitPrice, 14);

  for (const missing of [undefined, '']) {
    const r = row(); H.resolveMatchedPrice(r, null, { qty: 1.5, unit: missing });
    assert.strictEqual(r.unit, 'ea', `a remembered pack with unit ${JSON.stringify(missing)} counts units`);
    assert.strictEqual(r.unitPrice, 14);
  }
});

test('0c: a line with no money on it is not priced from memory at $0.00', () => {
  /* packPriceOf returns null when the line carries no money, and `null / q` is 0 — finite and not
     negative, so without the guard the row would be stored at zero with memory named as the source.
     A fabricated zero on the money path is CLAUDE.md's `isFinite('')` family, and downstream a zero
     cost reads as a free ingredient on every plate that uses it.
     The product below carries a real pack too, so this also proves the pack arm refuses the same
     line rather than the row simply having no candidates. */
  const r = row({ raw: 'MYSTERY WIDGET CARTON', name: 'MYSTERY WIDGET CARTON', unitPrice: null, needManual: true });
  H.resolveMatchedPrice(r, product(), { qty: 6, unit: 'ea' });
  assert.strictEqual(r.priceSource, 'manual', 'neither taught source can read a line with no price');
  assert.strictEqual(r.unitPrice, null, 'and nothing invents one');
  assert.strictEqual(r.needManual, true);
});

test('0c: a $0.00 line IS priced from memory, at zero — the guard refuses NEGATIVE', () => {
  /* `up>=0`, one character from `up>0`, and the difference is whether a free line can be imported at
     all. Pinned as behaviour, not endorsed: `invDerivePackQty` treats a $0.00 line as a freebie and
     derives nothing from it, so the app holds two views of the same line. That disagreement is
     written up in docs/MAINTENANCE.md rather than settled inside a coverage batch. */
  const r = row({ raw: 'CHEESE SLICES SAMPLE 1.5KG  0.00  0.00' });
  H.resolveMatchedPrice(r, null, { qty: 1.5, unit: 'kg' });
  assert.strictEqual(r.priceSource, 'memory', 'a free line is priced, not refused');
  assert.strictEqual(r.unitPrice, 0);
  assert.strictEqual(r.remembered, true);
});

test('0c: a division that cannot produce a finite price falls through instead of storing Infinity', () => {
  /* The only input that reaches `isFinite(up)` on its own: a remembered pack small enough that the
     0.001 gram conversion underflows to zero, so $21 / 0 is Infinity. The row must fall through to
     the parser, which still has a usable price — storing Infinity would be a number no arithmetic
     downstream survives, under a provenance saying the user taught it. */
  const r = row(); H.resolveMatchedPrice(r, null, { qty: Number.MIN_VALUE, unit: 'g' });
  assert.strictEqual(r.priceSource, 'parser', 'Infinity is not a price — the next source gets its turn');
  assert.strictEqual(r.unitPrice, 14);
});

/* ---------------------------------------------------------------------------
 * 3. THE FALL-THROUGH, and the four provenance fields written at the end.
 * ------------------------------------------------------------------------- */

test('0c: with no price anywhere the row goes MANUAL, and keeps the unit it arrived with', () => {
  /* The manual branch is the row the user has to finish by hand, and the unit it carries is the one
     the review screen prefills. Blanking it to 'auto' when the parser did read a unit throws away
     the only hint the user has about what the line is sold in. Both are asserted, on a row whose
     unit is NOT 'auto' — a fixture already at 'auto' cannot tell the two apart. */
  const r = row({ unitPrice: null, needManual: true, unit: 'kg' });
  H.resolveMatchedPrice(r, null, null);
  assert.strictEqual(r.priceSource, 'manual');
  assert.strictEqual(r.unitPrice, null);
  assert.strictEqual(r.needManual, true, 'a manual row must ASK');
  assert.strictEqual(r.unit, 'kg', 'and keeps the unit the line stated');

  const noUnit = row({ unitPrice: null, needManual: true, unit: null });
  H.resolveMatchedPrice(noUnit, null, null);
  assert.strictEqual(noUnit.unit, 'auto', 'with no unit stated, the fallback is auto');
});

test('0c: a row already marked manual is NOT re-adopted as a parser price', () => {
  /* Both halves of `!row.needManual && row.unitPrice!=null` are required. A row can carry a stale
     price while being flagged manual — `invSelChanged` re-runs this function over a row a previous
     pass had blocked — and adopting that price would silently un-block it under the parser's name.
     The mirror case is a row that claims to be priced and is not; both must land on manual. */
  const flagged = row({ needManual: true, unitPrice: 14, unit: 'kg' });
  H.resolveMatchedPrice(flagged, null, null);
  assert.strictEqual(flagged.priceSource, 'manual', 'a flagged row stays flagged');
  assert.strictEqual(flagged.unitPrice, null, 'and its stale price is dropped, not adopted');

  const priceless = row({ needManual: false, unitPrice: null });
  H.resolveMatchedPrice(priceless, null, null);
  assert.strictEqual(priceless.priceSource, 'manual', 'no price is no price, whatever the flag says');
  assert.strictEqual(priceless.needManual, true);
});

test('0c: `remembered` is true for memory and false for everything else', () => {
  /* It is the flag the review screen reads to say a price came from what the user taught this
     supplier, and applyInvoice reads it too. True on a parser row would credit memory for every
     ordinary price in the import. */
  const mem = row(); H.resolveMatchedPrice(mem, null, { qty: 1.5, unit: 'kg' });
  assert.strictEqual(mem.remembered, true);

  const parser = row(); H.resolveMatchedPrice(parser, null, null);
  assert.strictEqual(parser.remembered, false);

  const pack = row(); H.resolveMatchedPrice(pack, product(), null);
  assert.strictEqual(pack.remembered, false, 'a PRODUCT pack is not supplier memory');
  assert.strictEqual(pack.fromProductPack, true, 'it has its own flag');
});

test('0c: the taught pack is copied onto the row, from whichever source taught it', () => {
  /* `taughtQty` / `taughtUnit` are what the review screen shows in the pack-teach field, so they
     have to match the pack that actually won. Both sources are checked with a unit that is NOT the
     default 'ea', because a fixture on the default cannot tell a real read from the fallback. */
  const pack = row(); H.resolveMatchedPrice(pack, product({ pack_qty: 1.5, pack_unit: 'kg', base_unit: 'g' }), null);
  assert.strictEqual(pack.taughtQty, 1.5);
  assert.strictEqual(pack.taughtUnit, 'kg', 'the PRODUCT’s unit, not the default');

  const mem = row(); H.resolveMatchedPrice(mem, null, { qty: 1.5, unit: 'kg' });
  assert.strictEqual(mem.taughtQty, 1.5);
  assert.strictEqual(mem.taughtUnit, 'kg', 'and MEMORY’s unit, not the default');
});

test('0c: when both taught sources exist, the recorded pack is the one that WON', () => {
  /* Two writes, ten lines apart, each guarded on which source was chosen — and they write the same
     two fields. With a pack AND a memory in play the pack wins the price, so the pack is what the
     review screen must show; letting the memory write land afterwards would leave the row explaining
     $0.20 a slice with a pack of 1.5kg, which is a number and an explanation that do not match.
     The two packs are deliberately different in BOTH quantity and unit, so neither field can be
     right by coincidence. */
  const r = row(); H.resolveMatchedPrice(r, product({ pack_qty: 105, pack_unit: 'ea' }), { qty: 1.5, unit: 'kg' });
  assert.strictEqual(r.priceSource, 'product-pack', 'the pack must have won, or this proves nothing');
  assert.strictEqual(r.unitPrice, 0.2);
  assert.strictEqual(r.taughtQty, 105, 'the PACK’s 105, not memory’s 1.5');
  assert.strictEqual(r.taughtUnit, 'ea', 'and the PACK’s unit, not memory’s kg');
});

test('0c: a row nobody taught records NO taught pack, even when the product has one', () => {
  /* The trap this pins: the product below carries a perfectly good 105-each pack, and the LINE has
     no money on it, so derivePackPrice cannot use it and the row falls through. Copying the pack
     onto the row anyway would show the user a pack-teach field pre-filled with a pack that did not
     price this row — an explanation of a number that came from somewhere else. */
  const r = row({ raw: 'MYSTERY WIDGET CARTON', name: 'MYSTERY WIDGET CARTON', unitPrice: null, needManual: true });
  H.resolveMatchedPrice(r, product(), null);
  assert.notStrictEqual(r.priceSource, 'product-pack', 'the pack must NOT have won, or this proves nothing');
  assert.strictEqual(r.taughtQty, undefined);
  assert.strictEqual(r.taughtUnit, undefined);
});

/* ---------------------------------------------------------------------------
 * 4. THE UNIT GUARD, and the exemption CLAUDE.md devotes a section to.
 * ------------------------------------------------------------------------- */

test('0c: a PARSER guess in the wrong unit category is blocked, and blocking sets BOTH flags', () => {
  /* The row's unit is kg; the product is stored per unit. The parser is guessing, so the guard
     fires. Both flags are asserted because the review screen reads both: a mismatch without
     needManual is a warning the user cannot act on, and needManual without the mismatch is a red row
     with no stated reason. */
  const r = row(); H.resolveMatchedPrice(r, product({ pack_qty: 0, pack_unit: null, base_unit: 'ea' }), null);
  assert.strictEqual(r.priceSource, 'parser');
  assert.strictEqual(r.unitMismatch, true, 'per-kg against a per-unit product');
  assert.strictEqual(r.needManual, true, 'and a blocked row must ASK');
});

test('0c: a TAUGHT pack is exempt from the guard — that is the exemption, and it is deliberate', () => {
  /* CLAUDE.md: "a pack the user taught is the truth". Both taught sources are exempt, and this test
     exists so the exemption is visible rather than implied — a batch narrowing or widening it needs
     to see both arms go through the guard untouched.
     ⚠️ The exemption is about PRICE. Batch 200 found that the write it unblocks also wrote the row's
     UNIT into the product's base_unit, which is a different claim and cost $2166.67 on a $1.30 line.
     The guard that fixed that lives on the row, in invUnitRebase, not here. */
  const pack = row(); H.resolveMatchedPrice(pack, product({ pack_qty: 1.5, pack_unit: 'kg', base_unit: 'ea' }), null);
  assert.strictEqual(pack.priceSource, 'product-pack');
  assert.strictEqual(pack.unit, 'kg', 'kg against a per-unit product');
  assert.strictEqual(pack.unitMismatch, false, 'and it is NOT blocked — the user taught this pack');
  assert.strictEqual(pack.needManual, false);

  const mem = row(); H.resolveMatchedPrice(mem, product({ pack_qty: 0, pack_unit: null, base_unit: 'ea' }), { qty: 1.5, unit: 'kg' });
  assert.strictEqual(mem.priceSource, 'memory');
  assert.strictEqual(mem.unitMismatch, false, 'supplier memory is taught too');
});

test('0c: matching categories are not blocked, or every ordinary weighted line would flag', () => {
  const r = row(); H.resolveMatchedPrice(r, product({ pack_qty: 0, pack_unit: null, base_unit: 'g' }), null);
  assert.strictEqual(r.priceSource, 'parser');
  assert.strictEqual(r.unitMismatch, false, 'kg against a per-gram product is the SAME category');
  assert.strictEqual(r.needManual, false);
});
