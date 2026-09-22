/*
 * unitless-product-price.test.js — 282 (queue item 102).
 *
 * A PRODUCT WITH NO RECORDED UNIT STORED ITS PRICE 1000x WRONG, AND EIGHT SUCH ROWS ARE IN PRODUCTION.
 *
 * `saveIngEdit` derived the unit it saves in from the STORED product — correctly, per v54 — with a
 * ternary that closed `: 'kg'`. A NULL `base_unit` landed on that final `'kg'`, `invUnitToBase('kg')`
 * divides by 1000, and the row was stored as `$/g` with `base_unit:'g'`. Type `1.41` for a $1.41
 * container and it was saved as **$1.41 per kilo** — wrong by a factor of 1000, silently, with a
 * weight unit invented for an item sold by count.
 *
 * `base_unit` NULL is a real production state and the repo documents it:
 * `supabase/migrations/20260801_base_products_backfill.sql` coerces EIGHT rows to null because their
 * unit is genuinely unknown, `P0122 "Container Food 3.15Lt Storage"` and `P0279 "Pump Syrup"` among
 * them. All eight are `cost_per_base_unit` NULL, which is the only reason this never cost anything —
 * and is also exactly what makes them the rows someone opens Edit on in order to give a price.
 *
 * WHY EACH TEST IS A REGRESSION RATHER THAN A DESCRIPTION:
 *
 *  1. THE MONEY TEST RUNS THE REAL `saveIngEdit`. It asserts the NUMBER that reaches `setProduct`,
 *     not that a helper was called — `.claude/rules/tests.md`: a test asserting a function was called
 *     cannot catch a wrong condition inside it. Restoring the `:'kg'` fallback turns $1.41 into
 *     $0.00141 and this test names both figures in its failure.
 *  2. THE REFUSAL TEST ASSERTS NOTHING WAS WRITTEN, not that an error string appeared. A save that
 *     shows a message and writes anyway is the defect wearing the fix's clothes.
 *  3. `igStoredUnitType` IS PINNED ON ITS NULL ARM SPECIFICALLY, and on an unrecognised arm too. The
 *     mapping's three real cases were never wrong; the fourth is the whole item, and a version that
 *     mapped only `null` while letting some other unknown fall through to 'kg' would pass a test
 *     written from the item's own words.
 *  4. THE LOCK IS ASSERTED IN BOTH DIRECTIONS. Unlocking on a product that HAS a unit is the v54
 *     hazard — flipping g/ml/ea re-means every saved plate line referencing it — so "it unlocks when
 *     the unit is null" is only half the assertion that matters.
 *  5. `igChosenUnitType` REFUSES TO READ A LOCKED SELECT. `igUnitLock` parks the stored unit in that
 *     control for display, so a locked read returns the stored answer under the chosen answer's name
 *     and the `disabled` guard is the only thing separating them.
 *  6. THE ROUND TRIP composes, exactly as `tests/pack-drives-price.test.js` does for a product that
 *     has a unit: what the pack fills into `#ig_price` and what the save divides by must compose back
 *     to the cost the pack describes. That test could not cover this case because the derivation
 *     refused it.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

/* ---------- the pure decision ---------- */
// eslint-disable-next-line no-new-func
const P = new Function(`
  ${extractFn(SRC, 'igStoredUnitType')}
  ${extractFn(SRC, 'invUnitToBase')}
  ${extractFn(SRC, 'packToUnitCost')}
  ${extractFn(SRC, 'igPackDerive')}
  return { igStoredUnitType, invUnitToBase, packToUnitCost, igPackDerive };
`)();

test('102: an unknown stored unit maps to null — NEVER to kg', () => {
  assert.strictEqual(P.igStoredUnitType(null), null);
  assert.strictEqual(P.igStoredUnitType(undefined), null);
  assert.strictEqual(P.igStoredUnitType(''), null);
  /* ⚠️ NOT ONLY NULL, AND THE ITEM NAMED ONLY THE NULL SPELLING. The defect has TWO literals in the
     repo: `tests/fixtures/base-products.json` — the 393-row catalogue the Playwright shim serves and
     the closest thing here to Scoopy's real data — carries `base_unit:"unknown"` on four rows and
     `"dim"` on four more, which is precisely the eight the 20260801 backfill coerces to null because
     the table's CHECK forbids them. Production holds null; the fixture holds the pre-migration
     strings; BOTH took the old `:'kg'` fallback. So the mapping refuses everything it does not
     recognise rather than refusing the one value the item happened to name. */
  assert.strictEqual(P.igStoredUnitType('unknown'), null);
  assert.strictEqual(P.igStoredUnitType('dim'), null);
  assert.strictEqual(P.igStoredUnitType('EA'), null);
  assert.strictEqual(P.igStoredUnitType('each'), null);
});

test('102: the fixture still carries both pre-migration spellings the mapping must refuse', () => {
  const fx = JSON.parse(fs.readFileSync(
    path.join(__dirname, 'fixtures', 'base-products.json'), 'utf8'));
  const odd = Object.values(fx).filter((p) => !['g', 'ml', 'ea'].includes(p.base_unit));
  /* A count, deliberately, because this one is a census of a committed file rather than of a live
     table — and if it moves, the sentence above about "two literals" is what needs re-reading. */
  assert.strictEqual(odd.length, 8, 'the eight rows the backfill documents');
  assert.deepStrictEqual([...new Set(odd.map((p) => p.base_unit))].sort(), ['dim', 'unknown']);
  odd.forEach((p) => assert.strictEqual(p.cost_per_base_unit, null,
    p.id + ' carries a cost in an unknown unit — the premise of this item has moved'));
});

test('102: the three recognised units are unchanged', () => {
  assert.strictEqual(P.igStoredUnitType('g'), 'kg');
  assert.strictEqual(P.igStoredUnitType('ml'), 'litre');
  assert.strictEqual(P.igStoredUnitType('ea'), 'unit');
});

/* ---------- the form's lock, and what may be read from it ---------- */
function unitSelect(value) {
  const el = {
    value: value == null ? '' : value,
    disabled: true,
    attrs: { 'aria-disabled': 'true' },
    setAttribute(k, v) { this.attrs[k] = v; },
    removeAttribute(k) { delete this.attrs[k]; },
  };
  return el;
}
function lockSandbox(sel) {
  // eslint-disable-next-line no-new-func
  return new Function('SEL', `
    "use strict";
    var document = { getElementById: function(id){ return id === 'ig_unit' ? SEL : null; } };
    ${extractFn(SRC, 'igUnitLock')}
    ${extractFn(SRC, 'igChosenUnitType')}
    ${extractFn(SRC, 'igStoredUnitType')}
    ${extractFn(SRC, 'invUnitToBase')}
    ${extractFn(SRC, 'igEffectiveBase')}
    return { igUnitLock, igChosenUnitType, igEffectiveBase };
  `)(sel);
}

test('102: a product with NO recorded unit unlocks the control and selects nothing', () => {
  const sel = unitSelect('kg');
  const A = lockSandbox(sel);
  A.igUnitLock(null);
  assert.strictEqual(sel.disabled, false, 'the unit must be settable when it is not recorded');
  assert.strictEqual(sel.value, '', 'nothing is pre-selected — a default here is the defect');
  assert.strictEqual(sel.attrs['aria-disabled'], undefined, 'the a11y state must move with the real one');
});

test('102: a product that HAS a unit stays locked — v54, and this is the half that protects data', () => {
  const sel = unitSelect('');
  const A = lockSandbox(sel);
  A.igUnitLock('litre');
  assert.strictEqual(sel.disabled, true, 'flipping g/ml/ea re-means every saved plate line');
  assert.strictEqual(sel.value, 'litre');
  assert.strictEqual(sel.attrs['aria-disabled'], 'true');
});

test('102: a LOCKED select is never read as the user\'s choice', () => {
  const sel = unitSelect('');
  const A = lockSandbox(sel);
  A.igUnitLock('kg');                       // parks the stored unit in the control for display
  assert.strictEqual(sel.value, 'kg');
  assert.strictEqual(A.igChosenUnitType(), null, 'a locked read is the stored answer, not a choice');
});

test('102: the effective base unit is the stored one, and the chosen one only when there is none', () => {
  const sel = unitSelect('');
  const A = lockSandbox(sel);

  A.igUnitLock('ml');                                     // a product stored per ml
  assert.strictEqual(A.igEffectiveBase('ml'), 'ml');
  sel.disabled = false; sel.value = 'kg';                 // even if something unlocked it, stored wins
  assert.strictEqual(A.igEffectiveBase('ml'), 'ml');

  /* ⚠️ THE ONE THE FIRST CUT GOT WRONG, AND A BROWSER FOUND IT. `if(storedBaseUnit)` accepts a
     truthy-but-unrecognised unit, so the fixture's `"unknown"` was treated as a stored unit and the
     pack read-out rendered "measured in unit, but this product is stored per unit". */
  A.igUnitLock(null);
  assert.strictEqual(A.igEffectiveBase('unknown'), null, 'a truthy unknown is still unknown');
  assert.strictEqual(A.igEffectiveBase('dim'), null);
  sel.value = 'unit';
  assert.strictEqual(A.igEffectiveBase('unknown'), 'ea', 'and the choice fills in for it');

  sel.value = '';                                         // a product with no unit, nothing chosen yet
  assert.strictEqual(A.igEffectiveBase(null), null);
  sel.value = 'unit';                                     // the user picks "per unit/each"
  assert.strictEqual(A.igEffectiveBase(null), 'ea');
  sel.value = 'kg';
  assert.strictEqual(A.igEffectiveBase(null), 'g');
});

/* ---------- the derivation, which only unblocks once the unit is known ---------- */
const parts = (qty, unit, price) => ({ qty: String(qty), unit, price: String(price) });

test('102: the pack still refuses while the unit is unknown, and derives once it is chosen', () => {
  assert.strictEqual(P.igPackDerive(parts(1, 'ea', 1.41), null).state, 'nounit');
  const d = P.igPackDerive(parts(1, 'ea', 1.41), 'ea');
  assert.strictEqual(d.state, 'ok');
  assert.strictEqual(d.perUnit, 1.41);
  assert.strictEqual(d.unitWord, 'unit');
});

/* ---------- the real save, against the documented production state ---------- */
function saveSandbox(opts) {
  const C = { writes: [], toasts: [], errors: [], closed: 0 };
  const fields = {
    ig_name: { value: opts.name === undefined ? 'Container Food 3.15Lt Storage' : opts.name },
    ig_price: { value: String(opts.price === undefined ? '1.41' : opts.price) },
    ig_cat: { value: '' }, ig_brand: { value: '' }, ig_sup: { value: '' },
    ig_packQty: { value: opts.packQty === undefined ? '' : String(opts.packQty) },
    ig_packUnit: { value: opts.packUnit || '' },
    ig_packPrice: { value: opts.packPrice === undefined ? '' : String(opts.packPrice) },
    ig_unit: unitSelect(''),
    ig_err: { textContent: '', style: { display: 'none' } },
  };
  // eslint-disable-next-line no-new-func
  const api = new Function('C', 'F', `
    "use strict";
    var document = { getElementById: function(id){ return F[id] || null; } };
    var byId = { P0122: { id:'P0122', description:'Container Food 3.15Lt Storage', base_unit: F.__stored, cost_per_base_unit: null } };
    var ingEditId = 'P0122';
    var prodCategories = [], prodBrands = [], prodSuppliers = [];
    function resolveCombo(){ return { ok:true, value:'' }; }
    function setProduct(id, patch){ C.writes.push({ id: id, patch: patch }); return Promise.resolve({ data:[{}] }); }
    function syncMemoryToProduct(){ }
    function logHistory(){ }
    function renderIngredients(){ }
    function closeIngEdit(){ C.closed++; }
    function toast(m){ C.toasts.push(m); }
    ${extractFn(SRC, 'igStoredUnitType')}
    ${extractFn(SRC, 'igChosenUnitType')}
    ${extractFn(SRC, 'igUnitLock')}
    ${extractFn(SRC, 'invUnitToBase')}
    ${extractFn(SRC, 'saveIngEdit')}
    return { saveIngEdit: saveIngEdit, lock: igUnitLock };
  `);
  fields.__stored = opts.stored === undefined ? null : opts.stored;
  const A = api(C, fields);
  /* Exactly what `openIngEdit` does: the REAL mapping decides, and the REAL lock applies it. Writing
     the lock argument by hand here would let the test pass against a mapping the app does not use. */
  A.lock(P.igStoredUnitType(fields.__stored));
  if (opts.chosen !== undefined) fields.ig_unit.value = opts.chosen;
  return { A, C, fields };
}

test('102: THE MONEY TEST — a $1.41 container priced as one unit stores $1.41, not $0.00141', () => {
  const { A, C } = saveSandbox({ stored: null, chosen: 'unit', price: '1.41' });
  A.saveIngEdit();
  assert.strictEqual(C.writes.length, 1, 'the save must reach setProduct');
  const p = C.writes[0].patch;
  /* The old `:'kg'` fallback stored 0.00141 with base_unit 'g' — $1.41 per KILO for a $1.41 pot. */
  assert.strictEqual(p.cost_per_base_unit, 1.41,
    'a unit price of $1.41 stored as ' + p.cost_per_base_unit + ' is the 1000x defect');
  assert.strictEqual(p.base_unit, 'ea', 'stored as ' + p.base_unit + ' — a weight invented for a count');
  assert.strictEqual(p.cost_basis, '$/unit');
});

test('102: choosing "per kg" on the same product stores per GRAM, which is what kg has always meant', () => {
  const { A, C } = saveSandbox({ stored: null, chosen: 'kg', price: '6.50' });
  A.saveIngEdit();
  assert.strictEqual(C.writes[0].patch.base_unit, 'g');
  assert.strictEqual(C.writes[0].patch.cost_per_base_unit, 0.0065);
});

test('102: with NO unit chosen the save REFUSES and writes nothing at all', () => {
  const { A, C, fields } = saveSandbox({ stored: null, chosen: '', price: '1.41' });
  A.saveIngEdit();
  assert.strictEqual(C.writes.length, 0, 'a refusal that still writes is the defect with a message on top');
  assert.strictEqual(C.closed, 0, 'the form stays open on the field the user has to fill');
  assert.strictEqual(C.toasts.length, 0);
  assert.match(fields.ig_err.textContent, /no unit recorded/i);
  assert.strictEqual(fields.ig_err.style.display, 'block');
});

test('102: a product that HAS a unit is unaffected — the stored unit still wins', () => {
  const { A, C, fields } = saveSandbox({ stored: 'g', price: '6.50' });
  fields.ig_unit.value = 'unit';                       // locked, so this must be ignored entirely
  A.saveIngEdit();
  assert.strictEqual(C.writes[0].patch.base_unit, 'g');
  assert.strictEqual(C.writes[0].patch.cost_per_base_unit, 0.0065);
});

/* ---------- the round trip, per pack-drives-price.test.js's own argument ---------- */
test('102: the pack-filled price and the save\'s divisor compose back to the pack\'s unit cost', () => {
  const cases = [
    { qty: 1, unit: 'ea', price: 1.41, chosen: 'unit' },
    { qty: 10, unit: 'kg', price: 65, chosen: 'kg' },
    { qty: 4, unit: 'l', price: 20, chosen: 'litre' },
  ];
  cases.forEach(({ qty, unit, price, chosen }) => {
    const base = P.invUnitToBase(chosen).base_unit;                 // what the user's choice means
    const filled = P.igPackDerive(parts(qty, unit, price), base).perUnit;
    const { A, C } = saveSandbox({ stored: null, chosen: chosen, price: String(filled) });
    A.saveIngEdit();
    const stored = C.writes[0].patch.cost_per_base_unit;
    const truth = P.packToUnitCost(qty, unit, price).cost_per_base_unit;
    assert.ok(Math.abs(stored - truth) < 1e-12,
      `${qty}${unit} at $${price} chosen as ${chosen}: stored ${stored} against ${truth}`);
  });
});

/* ---------- the production state this item is about ---------- */
test('102: the eight null-unit rows the backfill documents are still named in the migration', () => {
  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', '20260801_base_products_backfill.sql'), 'utf8');
  /* Not a count of nulls in a live table — that is production state no test can hold. This pins that
     the STATE the fix is written for is still documented in the repo, so a future reader deleting
     the null arm as unreachable has to delete this too. */
  assert.match(sql, /P0122/);
  assert.match(sql, /P0279/);
  assert.match(sql, /null/i);
});

/* ---------- the copy that routes the user, which 280 wrote and 282 had to change ---------- */
test('102: the pack read-out sends the user to the unit control, not to the price field', () => {
  const fill = extractFn(SRC, 'igPackFill');
  assert.match(fill, /Choose a unit type above first/,
    'the no-unit read-out must point at the control that unlocks');
  assert.doesNotMatch(fill, /Enter the price per unit directly/,
    "280's instruction is now the route into the 1000x store and must not survive");
});
