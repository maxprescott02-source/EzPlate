/*
 * builder-search.test.js — v55 §G: the Builder ingredient search (#q) matches the linked product's
 * description/brand as well as the kitchen word's own name (parity with the pantry search, v35).
 *
 * Against the REAL shipped kitchenSearchMatches (brace-extracted from js/app.js).
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

function makeSearch(kitchen, byId) {
  // eslint-disable-next-line no-new-func
  const factory = new Function('KI', 'BYID', `
    "use strict";
    var kitchenIngredients = KI, byId = BYID;
    ${extractFn(SRC, 'searchTokens')}
    ${extractFn(SRC, 'matchTokens')}
    ${extractFn(SRC, 'kingSearchFilter')}
    ${extractFn(SRC, 'kitchenSearchMatches')}
    return kitchenSearchMatches;
  `);
  return factory(kitchen, byId);
}

const KITCHEN = [{ id: 'K1', name: 'Bread', pid: 'P1' }, { id: 'K2', name: 'Chips', pid: 'P2' }];
const BYID = {
  P1: { description: 'Bread GF Loaf Sliced', brand: 'TipTop' },
  P2: { description: 'Chips 10mm Straight Cut', brand: 'Safries' },
};

test('v55 §G: a term in the linked product BRAND finds the ingredient', () => {
  const search = makeSearch(KITCHEN, BYID);
  const ids = search('tiptop').map(x => x.id);
  assert.deepStrictEqual(ids, ['K1'], '"tiptop" -> Bread (via its product brand)');
});

test('v55 §G: a term in the linked product DESCRIPTION finds the ingredient', () => {
  const search = makeSearch(KITCHEN, BYID);
  assert.deepStrictEqual(search('safries').map(x => x.id), ['K2'], '"safries" -> Chips (via product description/brand)');
  assert.deepStrictEqual(search('straight').map(x => x.id), ['K2'], '"straight" -> Chips (via product description)');
});

test('v55 §G: the kitchen word name still matches', () => {
  const search = makeSearch(KITCHEN, BYID);
  assert.deepStrictEqual(search('bread').map(x => x.id), ['K1']);
});

test('v55 §G: a term in NEITHER name nor product text does not match (correct)', () => {
  const search = makeSearch(KITCHEN, BYID);
  assert.deepStrictEqual(search('zzznope').map(x => x.id), [], 'no phantom matches');
});

test('v59: token-order-independent — "gf bread" and "bread gf" both find Bread', () => {
  const search = makeSearch(KITCHEN, BYID);
  assert.deepStrictEqual(search('gf bread').map(x => x.id), ['K1']);
  assert.deepStrictEqual(search('bread gf').map(x => x.id), ['K1'], 'reversed order still matches');
  assert.deepStrictEqual(search('bread safries').map(x => x.id), [], 'a token that matches no single item fails');
});

/* ---------------------------------------------------------------------------
 * v61 item 7: the builder search "sometimes doesn't work" — REPRODUCED.
 * ROOT CAUSE: the #qClear (×) handler set an INLINE dropEl.style.display='none',
 * which permanently beats .drop.open{display:block}. After one × clear, every
 * later search rendered its results but the dropdown stayed invisible — dead
 * until page reload, and it survived close/reopen because #drop persists in the
 * modal DOM. Fix: the × routes through closeDrop() (class-only), and renderDrop
 * defensively clears any inline display so visibility is class-driven only.
 * These pin BOTH the functional resurrection and the source-level root cause.
 * ------------------------------------------------------------------------- */
function makeDropHarness() {
  // eslint-disable-next-line no-new-func
  const factory = new Function(`
    "use strict";
    // v83: renderDrop now also sets a role on #drop (listbox for results, group for the message that
    // carries the no-match action) and wires that action, so the stub grew setAttribute/querySelector.
    function fakeEl(){ var cls=new Set(), attrs={}; return { classList:{add:function(c){cls.add(c);},remove:function(c){cls.delete(c);},contains:function(c){return cls.has(c);}}, style:{}, innerHTML:'', setAttribute:function(k,v){attrs[k]=v;}, getAttribute:function(k){return attrs[k];}, querySelector:function(){return null;} }; }
    var dropEl=fakeEl();
    var qEl={ value:'', setAttribute:function(){} };
    var curList=[], hiIdx=-1;
    var plate=[];
    var byId={P1:{description:'Chips'}};
    function esc(s){return s;}
    function hl(s){return s;}
    function unitCostStr(){return '$1';}
    function builderNoMatchHtml(){ return '<div class="opt opt-msg"></div>'; }
    function saveAndAddIngredients(){}
    function kitchenSearchMatches(q){ return q ? [{__kid:true,id:'K1',name:'Chips',pid:'P1'}] : []; }
    /* 212: the placement engine is STUBBED here, and the stub is not a placeholder — it records the
       one thing this harness can honestly see about it. anchorDrop measures a live rect, which a fake
       DOM cannot supply, so its GEOMETRY is pinned where geometry is real: tests/layer-anchor.test.js
       for the containing-block walk and tests/visual/212-layers.spec.js in a browser.
       What IS visible here is the ORDER, and the order is load-bearing: a display:none element
       measures zero, so placing before the layer opens gives a maxHeight of nothing. So the stub
       records whether the open class was already set when it was called, and the test asserts it. */
    var placed=[], reset=0;
    function anchorDrop(el, anchor){ placed.push({ openAtCall: el.classList.contains('open'), anchor: anchor }); }
    function resetDrop(){ reset++; }
    ${extractFn(SRC, 'renderDrop')}
    ${extractFn(SRC, 'closeDrop')}
    return { renderDrop:renderDrop, closeDrop:closeDrop, dropEl:dropEl, qEl:qEl,
             placed:placed, resetCount:function(){return reset;} };
  `);
  return factory();
}

test('v61 item 7: a search dropdown re-opens after a clear left an inline display:none (not dead)', () => {
  const h = makeDropHarness();
  h.qEl.value = 'chips'; h.renderDrop();
  assert.ok(h.dropEl.classList.contains('open'), 'the dropdown opens on the first search');
  // reproduce the PRE-v61 stuck state: an inline display:none left on #drop by the old × handler
  h.dropEl.style.display = 'none';
  h.qEl.value = 'chips'; h.renderDrop();
  assert.strictEqual(h.dropEl.style.display, '', 'renderDrop clears the inline display so .drop.open can show it');
  assert.ok(h.dropEl.classList.contains('open'), 'the dropdown is visible again — the reported "sometimes dead" state is gone');
});

test('v61 item 7: closeDrop toggles the class only and never leaves a sticky inline display', () => {
  const h = makeDropHarness();
  h.qEl.value = 'chips'; h.renderDrop();
  h.closeDrop();
  assert.ok(!h.dropEl.style.display, 'no inline display is set (undefined or empty, never "none")');
  assert.ok(!h.dropEl.classList.contains('open'), 'and the dropdown is closed');
});

test('v61 item 7: the × clear handler no longer sets an inline display:none (root cause locked out of source)', () => {
  assert.ok(!/dropEl\.style\.display\s*=\s*'none'/.test(SRC), 'the qClear handler must close via closeDrop(), never an inline display:none');
});

/* ---------------------------------------------------------------------------
 * 212: the builder's ingredient list is placed by the shared engine now. Its geometry is pinned
 * where geometry is real (tests/layer-anchor.test.js, tests/visual/212-layers.spec.js); what belongs
 * HERE is the sequencing, because this is the file that owns renderDrop's open/close contract.
 * ------------------------------------------------------------------------- */
test('212: the dropdown is PLACED after it is opened, never before', () => {
  const h = makeDropHarness();
  h.qEl.value = 'chips'; h.renderDrop();
  assert.strictEqual(h.placed.length, 1, 'a results render places the layer exactly once');
  // A display:none element measures zero, so placing first yields a maxHeight of nothing — the
  // dropdown would open one row tall. Inverting the two lines in renderDrop turns this red.
  assert.strictEqual(h.placed[0].openAtCall, true, 'the layer was already open when it was measured');
  assert.strictEqual(h.placed[0].anchor, h.qEl, 'and it was anchored to the search field, not derived');
});

test('212: the NO-MATCH render places the layer too — both open paths, not just the common one', () => {
  // The two open paths in renderDrop return separately, and 184(a) is this repo's record of a test
  // that took the common settle path and left the other unpinned. Both are asserted.
  const h = makeDropHarness();
  h.qEl.value = ''; h.renderDrop();          // no query -> the no-match branch
  assert.ok(h.dropEl.classList.contains('open'), 'the no-match message opens the layer');
  assert.strictEqual(h.placed.length, 1, 'and that branch places it as well');
  assert.strictEqual(h.placed[0].openAtCall, true, 'after opening, on this path too');
});

test('212: closing clears the inline geometry, so the next open starts from the stylesheet', () => {
  const h = makeDropHarness();
  h.qEl.value = 'chips'; h.renderDrop();
  const before = h.resetCount();
  h.closeDrop();
  assert.strictEqual(h.resetCount(), before + 1, 'closeDrop resets the engine-written geometry');
  assert.ok(!h.dropEl.classList.contains('open'), 'and still closes by class, as v61 item 7 requires');
});
