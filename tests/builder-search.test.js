/*
 * builder-search.test.js — v55 §G: the Builder ingredient search (#q) matches the linked product's
 * description/brand as well as the kitchen word's own name (parity with the pantry search, v35).
 *
 * Against the REAL shipped kitchenSearchMatches (brace-extracted from js/app.js).
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`builder-search: function not found -> ${name}`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`builder-search: unbalanced braces for ${name}`);
}

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
    ${extractFn(SRC, 'renderDrop')}
    ${extractFn(SRC, 'closeDrop')}
    return { renderDrop:renderDrop, closeDrop:closeDrop, dropEl:dropEl, qEl:qEl };
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
