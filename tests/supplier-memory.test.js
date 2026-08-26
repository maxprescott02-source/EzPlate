/*
 * supplier-memory.test.js — QUEUE 0c, third slice. `applySupplierMemory`, which had never run.
 *
 * THE FINDING THAT COMMISSIONED THIS FILE is not a bug, it is a measurement: the mutation gate
 * reported **24 mutants and ZERO kills** for this function. Every operator in it could be flipped
 * and both files that DECLARE it — `invoice-gst.test.js` and `pack-survives.test.js` — stayed green,
 * because neither one ever calls it. They mention it. That is the `tests:`-list defect batch 202
 * found in `costFromLines`, on a second function, and it is worth saying plainly: a declared test
 * file is a claim about coverage, never evidence of it.
 *
 * WHAT THE FUNCTION IS. Supplier memory is what the user taught the app about how ONE supplier
 * writes ONE item: "when Bidfood says CHEESE SLICES TASTY 105S, that is 105 units". This function
 * spends that memory — it re-reads the pack price off the raw invoice line and divides it by the
 * remembered pack, turning a row the parser could not price into a priced one. It is the LAST of
 * the three price sources (product pack > supplier memory > parser) and the only one that runs on a
 * row that has no product match at all.
 *
 * WHY THAT MAKES IT MONEY-CRITICAL DESPITE BEING SMALL. Everything it writes goes on to be applied
 * to a product: `row.unitPrice` becomes a stored cost, `row.unit` decides which unit that cost is
 * expressed in, and `row.needManual=false` is the flag that stops the review screen asking the user
 * to check it. Getting the UNIT wrong while getting the number right is the invisible failure
 * CLAUDE.md's `resolveMatchedPrice` section is about — the magnitude stays plausible and no screen
 * can notice — so several tests below assert the unit and the price TOGETHER and would be worth
 * much less apart.
 *
 * The function is inside the protected parser region. Nothing here edits it; it is extracted by
 * `tests/_extract.js` and called exactly as `buildInvRows` calls it.
 */
const test = require('node:test');
const assert = require('node:assert');
const H = require('./_extract.js');

/* One raw line, used almost everywhere: $21.00 repeated is the per-pack price column, which is what
   packPriceOf reads. `name` is deliberately DIFFERENT from `raw` and carries no money at all — the
   function chooses between them (`row.raw||row.name`) and a fixture where both parse to the same
   price cannot tell you which one it read (CLAUDE.md roster 184(b)). */
const RAW = 'CHEESE SLICES TASTY 105S 1.5KG  21.00  21.00';

/** A no-match invoice row as buildInvRows builds one: priced by nobody, waiting on the user. */
function manualRow(over) {
  return Object.assign({
    name: 'CHEESE SLICES TASTY 105S 1.5KG',
    raw: RAW,
    unitPrice: null,
    unit: 'auto',
    needManual: true,
    remembered: false,
  }, over || {});
}

/* ---------------------------------------------------------------------------
 * 1. THE CONTRACT: what a remembered pack does to a row.
 * ------------------------------------------------------------------------- */

test('0c: a remembered pack prices a manual row, and sets all FOUR fields together', () => {
  /* The four writes are one decision and the row is incoherent if they come apart: a price with no
     unit is uninterpretable, and a price with `needManual` still true is a number the user is being
     asked to supply. `remembered` is what the review screen reads to say WHERE the price came from. */
  const row = manualRow();
  const out = H.applySupplierMemory(row, { qty: 1.5, unit: 'kg' });

  assert.strictEqual(out, row, 'it mutates and returns the row it was handed, never a copy');
  assert.strictEqual(row.unitPrice, 14, '$21.00 over a remembered 1.5kg pack is $14.00/kg');
  assert.strictEqual(row.unit, 'kg', 'the UNIT is half the answer — $14 means nothing without it');
  assert.strictEqual(row.needManual, false, 'a priced row must stop asking the user for a price');
  assert.strictEqual(row.remembered, true, 'and must say the price came from memory');
});

test('0c: a row that already parsed is NEVER re-priced from memory', () => {
  /* This is the precedence rule at its own site: memory is the fallback for a row the parser could
     not read, not a correction to one it could. A row arriving with needManual false has a price
     already, and overwriting it here would silently outrank the parser on every later import. */
  const row = manualRow({ unitPrice: 5.5, unit: 'kg', needManual: false });
  H.applySupplierMemory(row, { qty: 105, unit: 'ea' });

  assert.strictEqual(row.unitPrice, 5.5, 'the parser price survives untouched');
  assert.strictEqual(row.unit, 'kg');
  assert.strictEqual(row.remembered, false, 'and the row must not claim a provenance it does not have');
});

test('0c: no memory, or no row, is a safe no-op rather than a throw', () => {
  /* buildInvRows only calls this when `mem` is truthy, so both guards are belt-and-braces — and they
     have a SECOND caller's worth of value now that the function is exported and reachable from
     anywhere. The assertion that matters is that neither one reaches `mem.qty`, which would throw. */
  const row = manualRow();
  assert.strictEqual(H.applySupplierMemory(row, null), row);
  assert.strictEqual(row.unitPrice, null, 'a row with nothing remembered comes back exactly as it went in');
  assert.strictEqual(row.needManual, true);
  assert.strictEqual(H.applySupplierMemory(null, { qty: 105, unit: 'ea' }), null);
});

/* ---------------------------------------------------------------------------
 * 2. WHERE THE PRICE COMES FROM. `row.raw`, not `row.name`.
 * ------------------------------------------------------------------------- */

test('0c: the pack price is read off the RAW line — the name has no money on it', () => {
  /* parsePdfLine sets `name` to the text BEFORE the first money and `raw` to the whole line, so on a
     real invoice the name almost never carries a price. Reading the name instead would leave every
     remembered row unpriced — silently, because the function returns the row either way.
     The fixture makes the two disagree on purpose: same row, one field with money and one without. */
  const row = manualRow();
  assert.ok(!/\d+\.\d{2}/.test(row.name), 'the fixture is only meaningful while the NAME carries no price');

  H.applySupplierMemory(row, { qty: 1.5, unit: 'kg' });
  assert.strictEqual(row.unitPrice, 14, 'priced from raw');

  /* And the fallback is real: a row with no `raw` at all falls back to the name, which is the shape
     `parseInvoiceCSV` and the AI reader can both produce. */
  const noRaw = manualRow({ raw: '', name: 'CHEESE SLICES TASTY  21.00  21.00' });
  H.applySupplierMemory(noRaw, { qty: 1.5, unit: 'kg' });
  assert.strictEqual(noRaw.unitPrice, 14, 'with no raw line, the name is the fallback — not nothing');
});

test('0c: a line with NO money is left for the user, never priced at $0.00', () => {
  /* packPriceOf returns null when the line carries no money at all, and the guard has to notice:
     `null / qty` is 0, which is finite and not negative, so without the guard the row would be
     stored at $0.00 with `needManual` cleared — a fabricated zero on the money path, which is the
     exact family as CLAUDE.md's `isFinite('')` trap. A $0.00 cost also reads as a free ingredient
     everywhere downstream. */
  const row = manualRow({ raw: 'MYSTERY WIDGET CARTON', name: 'MYSTERY WIDGET CARTON' });
  H.applySupplierMemory(row, { qty: 6, unit: 'ea' });

  assert.strictEqual(row.unitPrice, null, 'no price on the line means no price on the row');
  assert.strictEqual(row.needManual, true, 'and the row keeps asking');
  assert.strictEqual(row.remembered, false);
});

/* ---------------------------------------------------------------------------
 * 3. THE FIVE UNIT SPELLINGS, and the two conversions inside them.
 * ------------------------------------------------------------------------- */

test('0c: every remembered unit maps to the right STORED unit and the right divisor', () => {
  /* Three stored units (kg / l / ea) reached by five spellings, and the sub-unit spellings carry a
     1000x conversion. Both halves are asserted for every case, because they fail independently:
     a wrong branch gives the right number under the wrong unit, and a wrong divisor gives the wrong
     number under the right unit. Only one of those is visible to a human reading the review screen.
     Each case is 1.5 of the remembered unit against the same $21.00 line. */
  const cases = [
    { unit: 'kg', expectUnit: 'kg', expectPrice: 14,     why: '$21 / 1.5kg' },
    { unit: 'g',  expectUnit: 'kg', expectPrice: 14000,  why: '$21 / 0.0015kg — grams are stored per kg' },
    { unit: 'l',  expectUnit: 'l',  expectPrice: 14,     why: '$21 / 1.5L' },
    { unit: 'ml', expectUnit: 'l',  expectPrice: 14000,  why: '$21 / 0.0015L — millilitres are stored per litre' },
    { unit: 'ea', expectUnit: 'ea', expectPrice: 14,     why: '$21 / 1.5 units' },
  ];
  for (const c of cases) {
    const row = manualRow();
    H.applySupplierMemory(row, { qty: 1.5, unit: c.unit });
    assert.strictEqual(row.unit, c.expectUnit, `${c.unit} must be STORED as ${c.expectUnit}`);
    assert.ok(Math.abs(row.unitPrice - c.expectPrice) < 1e-9, `${c.unit}: ${c.why}, got ${row.unitPrice}`);
  }
});

test('0c: the spellings are case-insensitive, and an absent unit means EACH', () => {
  /* The user types the unit into the pack-teach field, so "KG" and "Kg" reach here as often as "kg".
     An absent unit defaulting to 'ea' is the conservative choice: a count needs no conversion, so
     guessing wrong about a missing unit cannot silently multiply a price by a thousand. */
  const upper = manualRow();
  H.applySupplierMemory(upper, { qty: 1.5, unit: 'KG' });
  assert.strictEqual(upper.unit, 'kg');
  assert.strictEqual(upper.unitPrice, 14);

  for (const missing of [undefined, '']) {
    const row = manualRow();
    H.applySupplierMemory(row, { qty: 1.5, unit: missing });
    assert.strictEqual(row.unit, 'ea', `a remembered pack with unit ${JSON.stringify(missing)} counts units`);
    assert.strictEqual(row.unitPrice, 14);
  }
});

/* ---------------------------------------------------------------------------
 * 4. THE TWO REFUSALS, and the one thing it deliberately allows through.
 * ------------------------------------------------------------------------- */

test('0c: a remembered pack of zero or nonsense prices nothing', () => {
  /* qty comes from a field the user typed, so a blank, a zero and a word all have to arrive here
     safely. Every one of them must leave the row asking rather than storing an infinity.
     ⚠️ The `qty>0` guard is not the only thing catching these — `!isFinite(unitPrice)` one line
     later catches the same inputs a second time, which is why the gate's `>` -> `>=` mutant on this
     line is ALLOWED in tests/mutation/targets.js rather than killed here. The assertions below pin
     the OUTCOME, which is what a reader of this file cares about, and are honest that they do not
     discriminate which of the two guards produced it. */
  for (const qty of [0, -1, '', 'lots', null, undefined, NaN]) {
    const row = manualRow();
    H.applySupplierMemory(row, { qty, unit: 'kg' });
    assert.strictEqual(row.unitPrice, null, `qty ${JSON.stringify(qty)} must price nothing`);
    assert.strictEqual(row.needManual, true);
    assert.strictEqual(row.remembered, false);
  }
});

test('0c: a division that cannot produce a finite price leaves the row alone', () => {
  /* This is the only input that reaches `!isFinite(unitPrice)` on its own — a remembered pack small
     enough that multiplying it by the 0.001 gram conversion underflows to zero, so $21 / 0 is
     Infinity. It is an extreme value rather than a likely one, and it is here because the guard's
     WHOLE JOB is this case: without it the row would be stored at Infinity, `needManual` cleared,
     and the review screen would show a price no arithmetic downstream can survive.
     Number.MIN_VALUE is used rather than a literal so the intent — "the smallest thing a number can
     be" — is legible, and so the test does not encode a decimal expansion of it. */
  const row = manualRow();
  H.applySupplierMemory(row, { qty: Number.MIN_VALUE, unit: 'g' });

  assert.strictEqual(row.unitPrice, null, 'Infinity is not a price');
  assert.strictEqual(row.needManual, true);
  assert.strictEqual(row.remembered, false);
});

test('0c: a $0.00 line IS priced, at zero — the guard refuses NEGATIVE, not free', () => {
  /* Recorded as behaviour rather than endorsed as a rule, because it is a genuine boundary and the
     surrounding code disagrees with itself about it: `invDerivePackQty` treats a $0.00 line as a
     freebie or a credit and deliberately derives NO pack size from it, while this function stores
     the zero and clears `needManual`. Both are defensible — a $0.00 line really can be a sample —
     and the difference is written up in docs/MAINTENANCE.md rather than changed inside a coverage
     batch, which has no mandate to alter what the app stores.
     What this test is FOR is the boundary itself: `unitPrice<0` and `unitPrice<=0` are one character
     apart and the second one silently stops every free line being importable. */
  const row = manualRow({ raw: 'CHEESE SLICES SAMPLE 1.5KG  0.00  0.00', name: 'CHEESE SLICES SAMPLE' });
  H.applySupplierMemory(row, { qty: 1.5, unit: 'kg' });

  assert.strictEqual(row.unitPrice, 0, 'a free line is priced at zero, not refused');
  assert.strictEqual(row.unit, 'kg');
  assert.strictEqual(row.needManual, false);
  assert.strictEqual(row.remembered, true);
});
