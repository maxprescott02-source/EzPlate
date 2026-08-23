/*
 * inv-unit-rebase.test.js — QUEUE 0b. A pack taught in the wrong unit silently re-based the product.
 *
 * THE DEFECT, as it shipped. resolveMatchedPrice exempts a TAUGHT pack — the product's own
 * pack_qty/pack_unit, or supplier memory — from its unit-mismatch guard, commented "a pack the user
 * taught is the truth". That is right about PRICE and says nothing about UNIT, and applyInvoice
 * wrote the row's unit straight into base_unit:
 *
 *     var priceUnit=(r.unit==='kg'||r.unit==='l'||r.unit==='ea')?r.unit:(…);
 *     setProduct(pid,{cost_per_base_unit:up/ub2.div, base_unit:ub2.base_unit, cost_basis:…});
 *
 * Teach "Flour Plain" (stored per gram) as 6 ea and the row carried unitMismatch:false,
 * needManual:false — so it was PRE-TICKED and applied with no prompt. A 200g plate line then cost
 * $2166.67 instead of $1.30.
 *
 * The one that actually hides is ml-vs-g: teach a kg pack on a product stored in ml, base_unit flips
 * ml → g, and a plate line reading 250 (meaning 250 mL) is costed as 250 g. The magnitude stays
 * plausible and nothing on any screen can notice — which is why the loud case is the safe one and
 * this file asserts the quiet one just as hard.
 *
 * Everything under test is EXTRACTED from the real js/app.js. Nothing here is a copy: the whole
 * point of invPriceUnit being a function is that the guard and the write cannot disagree about which
 * unit a row lands in, and a stub of it would agree with whichever belief wrote the stub.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

/* The extracted unit-category chain, exactly as shipped. kingRepointGuard is the SAME decision the
   ingredient-repoint confirm makes — 0b reuses it rather than adding a second answer to
   "did the unit category change?", which is how two answers drift. */
const CHAIN = ['unitCatCategory', 'unitToBaseFields', 'kingRepointGuard',
               'invPriceUnit', 'invUnitRebase', 'invPackUnitOpts', 'invRowState']
  .map(f => extractFn(SRC, f)).join('\n');

function harness(products) {
  const byId = {};
  (products || []).forEach(p => { byId[p.id] = p; });
  // eslint-disable-next-line no-new-func
  return new Function('BYID', `"use strict";
    var byId = BYID;
    ${CHAIN}
    return { invUnitRebase:invUnitRebase, invPriceUnit:invPriceUnit,
             invPackUnitOpts:invPackUnitOpts, invRowState:invRowState };`)(byId);
}

const FLOUR = { id: 'P1', description: 'Flour Plain', base_unit: 'g' };     // stored per gram
const OIL   = { id: 'P2', description: 'Oil Canola',  base_unit: 'ml' };    // stored per millilitre
const EGGS  = { id: 'P3', description: 'Eggs 700g',   base_unit: 'ea' };    // stored per unit
const MYSTERY = { id: 'P4', description: 'Unknown', base_unit: null };      // never had a unit
const H = harness([FLOUR, OIL, EGGS, MYSTERY]);

// A row that has resolved cleanly — which is the whole problem: nothing about it looks wrong.
const taughtRow = (bestId, unit) => ({ addNew: false, uncertain: false, bestId, unit,
  needManual: false, unitMismatch: false, needsAttention: false, packTaught: true,
  gemReview: false, gemMatchReview: false, gemPriceReview: false, tier: 'hi' });

/* ---------------------------------------------------------------------------
 * 1. THE GUARD ITSELF — it must name BOTH categories, because the message and the
 *    summary read them and a guard that only says "yes" cannot explain itself.
 * ------------------------------------------------------------------------- */

test('0b: teaching a per-gram product in units is a re-base, and the verdict names both categories', () => {
  const v = H.invUnitRebase(taughtRow('P1', 'ea'));
  assert.ok(v, 'a per-gram product priced per unit MUST be caught — this is Max’s $2166.67 line');
  assert.equal(v.oldCat, 'kg');
  assert.equal(v.newCat, 'ea');
});

test('0b: THE QUIET ONE — ml → kg is caught, and it is the case no screen can notice', () => {
  const v = H.invUnitRebase(taughtRow('P2', 'kg'));
  assert.ok(v, 'a product stored in ml priced per kg re-bases ml → g with the magnitude intact');
  assert.equal(v.oldCat, 'l');
  assert.equal(v.newCat, 'kg');
});

test('0b: per-unit → per-kg is caught in that direction too', () => {
  const v = H.invUnitRebase(taughtRow('P3', 'kg'));
  assert.ok(v);
  assert.equal(v.oldCat, 'ea');
  assert.equal(v.newCat, 'kg');
});

test('0b: SAME category is not a re-base — a per-gram product priced per kg is the normal case', () => {
  // The guard compares CATEGORIES, not units. 'kg' on a base_unit of 'g' is how every weighted
  // product in the file is priced; flagging it would flag every ordinary invoice line.
  assert.equal(H.invUnitRebase(taughtRow('P1', 'kg')), null);
  assert.equal(H.invUnitRebase(taughtRow('P2', 'l')), null);
  assert.equal(H.invUnitRebase(taughtRow('P3', 'ea')), null);
});

test('0b: nothing to contradict → null, and each of the four reasons is separate', () => {
  assert.equal(H.invUnitRebase(null), null, 'no row');
  assert.equal(H.invUnitRebase({ addNew: true, bestId: 'P1', unit: 'ea' }), null,
    'an add-new row has no product yet — its own form owns the unit');
  assert.equal(H.invUnitRebase({ bestId: null, unit: 'ea' }), null, 'no match, nothing to re-base');
  assert.equal(H.invUnitRebase({ bestId: 'NOPE', unit: 'ea' }), null,
    'a bestId naming no product is skipped, not dereferenced');
  assert.equal(H.invUnitRebase(taughtRow('P4', 'ea')), null,
    'a product with no base_unit has no category to be moved out of');
});

test('0b: a row with no explicit unit takes the PRODUCT’s, so it can never be a re-base', () => {
  // invPriceUnit falls back to the product's own base_unit when r.unit is 'auto' or absent — so the
  // write is a no-op on the unit and the guard must agree. If these two ever disagree the guard
  // starts blocking ordinary rows, which is how a safety check gets deleted.
  assert.equal(H.invPriceUnit({ unit: 'auto' }, FLOUR), 'kg');
  assert.equal(H.invPriceUnit({ unit: undefined }, OIL), 'l');
  assert.equal(H.invPriceUnit({ unit: 'pk' }, EGGS), 'ea', 'an unrecognised unit is not trusted either');
  assert.equal(H.invUnitRebase(taughtRow('P1', 'auto')), null);
  assert.equal(H.invUnitRebase(taughtRow('P2', undefined)), null);
});

test('0b: invPriceUnit returns the row’s unit when it names one — this is what gets STORED', () => {
  assert.equal(H.invPriceUnit({ unit: 'ea' }, FLOUR), 'ea');
  assert.equal(H.invPriceUnit({ unit: 'kg' }, OIL), 'kg');
  assert.equal(H.invPriceUnit({ unit: 'l' }, EGGS), 'l');
});

/* ---------------------------------------------------------------------------
 * 2. THE PRE-TICK. This is the half that decides whether a human ever sees the row:
 *    only 'matched' is pre-ticked, by the renderer AND by every handler.
 * ------------------------------------------------------------------------- */

test('0b: a re-basing row is never ‘matched’, so it can never be PRE-TICKED', () => {
  const clean = taughtRow('P1', 'kg');
  assert.equal(H.invRowState(clean), 'matched', 'baseline: the same row in the right unit IS matched');
  assert.equal(H.invRowState(taughtRow('P1', 'ea')), 'review',
    'the ONLY difference is the unit, and it must be enough on its own');
  assert.equal(H.invRowState(taughtRow('P2', 'kg')), 'review');
});

test('0b: the re-base check does not disturb any other row state', () => {
  // Guard against the fix widening: a row that was already 'new' or 'review' for another reason must
  // keep saying so, because the summary counts these buckets and the tint reads them.
  assert.equal(H.invRowState({ ...taughtRow('P1', 'ea'), addNew: true }), 'new');
  assert.equal(H.invRowState({ ...taughtRow('P1', 'ea'), uncertain: true }), 'review');
  assert.equal(H.invRowState(taughtRow('P3', 'ea')), 'matched', 'a per-unit product taught in units is fine');
});

/* ---------------------------------------------------------------------------
 * 3. THE CONTROL. The strongest form of the fix: the mistake is unreachable.
 * ------------------------------------------------------------------------- */

test('0b: the pack-unit control offers only the product’s own category', () => {
  assert.deepEqual(H.invPackUnitOpts('kg', 'kg'), ['kg', 'g']);
  assert.deepEqual(H.invPackUnitOpts('l', 'l'), ['l', 'ml']);
  assert.deepEqual(H.invPackUnitOpts('ea', 'ea'), ['ea']);
});

test('0b: with no product, or no readable unit, every unit is still on offer', () => {
  // A row with no match has nothing to contradict, and the add-new form is the path that legitimately
  // decides a unit from scratch. Narrowing here would break creating a product the file has no unit for.
  assert.deepEqual(H.invPackUnitOpts(null, 'ea'), ['ea', 'kg', 'g', 'l', 'ml']);
  assert.deepEqual(H.invPackUnitOpts(undefined, 'kg'), ['ea', 'kg', 'g', 'l', 'ml']);
});

test('0b: a pack STORED in another category is still shown, exactly once', () => {
  /* Data taught before this guard existed sits outside the list. The control has to show what is
     actually stored — a select that silently reads back a value nobody chose is a second wrong-data
     bug wearing the fix for the first. invUnitRebase flags that row and applyInvoice refuses it,
     which is where the state gets resolved. */
  assert.deepEqual(H.invPackUnitOpts('kg', 'ea'), ['kg', 'g', 'ea']);
  assert.deepEqual(H.invPackUnitOpts('ea', 'ml'), ['ea', 'ml']);
  assert.deepEqual(H.invPackUnitOpts('kg', 'g'), ['kg', 'g'], 'already in the list — never duplicated');
  assert.deepEqual(H.invPackUnitOpts('l', ''), ['l', 'ml'], 'an empty prefill appends nothing');
});
