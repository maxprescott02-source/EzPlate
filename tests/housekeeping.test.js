/*
 * housekeeping.test.js — v111.
 *
 * The batch deleted 31 dead functions, 35 `saveX()` no-op call sites and the nine no-op functions
 * themselves. Behaviour must be provably unchanged, so these tests assert what LANDS, not what is
 * called — the distinction that let a stale pin survive in smem-sync-guard until this batch (it
 * counted calls to a function whose body was empty, so it could not have failed).
 *
 * Three jobs:
 *   1. the mutation paths that lost a `saveX()` still reach their real server helper;
 *   2. the one call site whose SHAPE changed (logAllMenuPrices) behaves identically, including the
 *      short-circuit order — `&&` would silently skip the mutation if the operands were swapped;
 *   3. the deleted names stay deleted, and no name is defined twice again (retired hard rule 3).
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

/* ---- 1. the writes still land ---- */

test('v111: removeMenuItem still deletes the server row after dropping its saveCustomMenu() call', () => {
  const factory = new Function('S', `
    "use strict";
    var customMenu = S.menu;
    function dbDeleteMenu(id){ S.deleted.push(id); }
    ${extractFn(SRC, 'forgetMenuItems')}   /* v112: removeMenuItem's in-memory half, split out for the sequenced delete paths */
    ${extractFn(SRC, 'removeMenuItem')}
    removeMenuItem(S.id);
    return customMenu;
  `);
  const S = { menu: [{ id: 'D1' }, { id: 'D2' }], deleted: [], id: 'D1' };
  const left = factory(S);
  assert.deepEqual(left.map(d => d.id), ['D2'], 'the dish is gone from memory');
  assert.deepEqual(S.deleted, ['D1'], 'and the DELETE reached the server — the no-op never did that');
});

test('v111: removeMenuItem deletes the server row even when the dish was not in memory', () => {
  // the `if(customMenu.length!==before)` that guarded the no-op is gone; the DELETE was always
  // unconditional and must stay so — a row present only on the server still has to be removed.
  const factory = new Function('S', `
    "use strict";
    var customMenu = S.menu;
    function dbDeleteMenu(id){ S.deleted.push(id); }
    ${extractFn(SRC, 'forgetMenuItems')}   /* v112: removeMenuItem's in-memory half, split out for the sequenced delete paths */
    ${extractFn(SRC, 'removeMenuItem')}
    removeMenuItem(S.id);
    return customMenu;
  `);
  const S = { menu: [{ id: 'D2' }], deleted: [], id: 'D_not_here' };
  factory(S);
  assert.deepEqual(S.deleted, ['D_not_here'], 'still deleted server-side, exactly as before');
});

test('v111: syncMemoryToProduct still pushes every re-packed phrase after losing its `changed` flag', () => {
  const factory = new Function('S', `
    "use strict";
    var supplierMem = S.mem;
    function dbPushSupplierPhrase(e){ S.pushed.push(e.id); }
    ${extractFn(SRC, 'syncMemoryToProduct')}
    syncMemoryToProduct(S.pid, S.qty, S.unit);
    return supplierMem;
  `);
  const S = {
    mem: {
      a: { id: 'a', pid: 'P1', qty: 1, unit: 'ea' },
      b: { id: 'b', pid: 'P1', qty: 5, unit: 'kg' },
      c: { id: 'c', pid: 'P2', qty: 1, unit: 'ea' },   // different product — must not move
    },
    pushed: [], pid: 'P1', qty: 12, unit: 'ea',
  };
  const mem = factory(S);
  assert.deepEqual(S.pushed.sort(), ['a', 'b'], 'both entries for this product were pushed');
  assert.equal(mem.a.qty, 12, 'and the pack actually changed in memory');
  assert.equal(mem.b.unit, 'ea');
  assert.equal(mem.c.qty, 1, 'another product’s memory is untouched');
});

test('v111: syncMemoryToProduct pushes NOTHING when the pack already matches', () => {
  // the guard that matters is the per-entry `e.qty!==qty || e.unit!==unit`, not the dropped flag.
  const factory = new Function('S', `
    "use strict";
    var supplierMem = S.mem;
    function dbPushSupplierPhrase(e){ S.pushed.push(e.id); }
    ${extractFn(SRC, 'syncMemoryToProduct')}
    syncMemoryToProduct('P1', 12, 'ea');
  `);
  const S = { mem: { a: { id: 'a', pid: 'P1', qty: 12, unit: 'ea' } }, pushed: [] };
  factory(S);
  assert.deepEqual(S.pushed, [], 'an unchanged pack must not generate a write');
});

/* ---- 2. the one call site whose SHAPE changed ---- */

function runLogAll(dishes, supported) {
  const factory = new Function('S', `
    "use strict";
    var MENU = S.dishes;
    var menuPriceHistSupported = S.supported;
    function logMenuPrice(id, price){ S.logged.push(id); return S.accept.indexOf(id) >= 0; }
    function dbPushMenuPrice(id, iso, price){ S.pushed.push(id); }
    ${extractFn(SRC, 'logAllMenuPrices')}
    logAllMenuPrices();
  `);
  const S = { dishes, supported, logged: [], pushed: [], accept: dishes.filter(Boolean).map(d => d.id) };
  factory(S);
  return S;
}

test('v111: logAllMenuPrices still logs every priced dish, and skips the unpriced ones', () => {
  const S = runLogAll([{ id: 'A', price: 10 }, { id: 'B', price: 0 }, { id: 'C', price: 4 }, null], true);
  assert.deepEqual(S.logged, ['A', 'C'], 'price>0 is still the gate');
  assert.deepEqual(S.pushed, ['A', 'C'], 'and each new point reached the server');
});

test('v111: the && rewrite kept its operand ORDER — logging happens even when the table is unsupported', () => {
  // This is the whole risk of collapsing `if(log()){ changed=true; if(supported) push; }` into
  // `if(log() && supported) push;`. Swap the operands and `logMenuPrice` — which MUTATES
  // menuPriceLog — is short-circuited away whenever the table is missing, losing the in-memory
  // series silently. A structural test that merely found both names in the line would pass.
  const S = runLogAll([{ id: 'A', price: 10 }, { id: 'C', price: 4 }], false);
  assert.deepEqual(S.logged, ['A', 'C'], 'the in-memory log is still written with the table absent');
  assert.deepEqual(S.pushed, [], 'but nothing is pushed to a table that is not there');
});

test('v111: a dish whose price did not move is logged but never pushed', () => {
  const factory = new Function('S', `
    "use strict";
    var MENU = S.dishes;
    var menuPriceHistSupported = true;
    function logMenuPrice(id, price){ S.logged.push(id); return id === 'A'; }
    function dbPushMenuPrice(id){ S.pushed.push(id); }
    ${extractFn(SRC, 'logAllMenuPrices')}
    logAllMenuPrices();
  `);
  const S = { dishes: [{ id: 'A', price: 10 }, { id: 'B', price: 12 }], logged: [], pushed: [] };
  factory(S);
  assert.deepEqual(S.logged, ['A', 'B'], 'both were offered to the log');
  assert.deepEqual(S.pushed, ['A'], 'only the one that produced a NEW point was pushed');
});

/* ---- 3. the deletions stay deleted ---- */

const DELETED = [
  'subseq', 'runSearch', 'swapLine', 'toggleAlts', 'matchMenu', 'currentMenuPrice', 'plateCostNow',
  'plateNameVal', 'isPublishedPlate', 'monthKey', 'menuNameFor', 'tidyFieldLabel', 'menuScore',
  'nameNorm', 'bestNameMatch', 'rankPlateMatches', 'checkNameMatch', 'showMatchPrompt', 'linkMatch',
  'dismissMatch', 'pdfTextToCsv', 'itoks', 'simScore', 'matchScore', 'openMenuInBuilder',
  'doDeleteMenuItem', 'editOpenInBuilder', 'plateEditAction', 'tipText',
  'saveProductCache', 'saveKitchenLS', 'saveCustomMenu', 'saveMenus', 'savePlatesLS', 'saveHistory',
  'saveMenuHistory', 'saveMenuPriceLog', 'saveSupplierMem',
];

test('v111: every deleted name is gone from app.js entirely — definition AND call sites', () => {
  const alive = DELETED.filter(n => new RegExp(`\\b${n}\\b`).test(SRC));
  assert.deepEqual(alive, [], 'a reintroduced name means either dead code came back or a real call site was missed');
});

test('v111: the survivors are the two `save*` names that are NOT no-ops', () => {
  // Deleting these by pattern-matching the prefix would drop a real flush (saveIngLog pushes the
  // pending ing_price_history points) and a real settings write.
  assert.ok(/function saveIngLog\(\)\{/.test(SRC.replace(/\s+/g, m => m.includes('\n') ? '\n' : ' ')) || /function saveIngLog\(\)/.test(SRC), 'saveIngLog still exists');
  assert.ok(/function saveKitchenIngredients\(\)/.test(SRC), 'saveKitchenIngredients still exists');
  assert.ok(/_ingLogPending/.test(SRC), 'and saveIngLog still has a real body to flush');
});

test('v111: hard rule 3 is retired — no top-level function in app.js is defined twice', () => {
  const counts = {};
  const re = /^function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  let m;
  while ((m = re.exec(SRC))) counts[m[1]] = (counts[m[1]] || 0) + 1;
  const dupes = Object.keys(counts).filter(k => counts[k] > 1);
  assert.deepEqual(dupes, [],
    'aRow and renderAnalysis were each defined twice with the first dead (old hard rule 3). Both dead '
    + 'definitions are deleted; a new duplicate would silently resurrect the whole class of bug, because '
    + 'hoisting makes the LAST definition win wherever it sits.');
});

/* ---- 4. the applyTidy column guard (condition, not presence) ---- */

test('v111: applyTidy refuses a column outside the permitted set', () => {
  // The guard exists because tidyPlanAll takes `field` free, and applyTidy writes it straight into
  // productsById — bypassing setProduct, the only writer of ing_price_history. A price column routed
  // through here would move money with no price-log point and no error.
  const run = (field) => {
    const factory = new Function('S', `
      "use strict";
      var PRODUCTS = [], savedPlates = [], productsById = {}, supplierMem = {};
      var tidyField = S.field, tidyAction = 'rename', tidyFrom = 'x';
      ${extractFn(SRC, 'applyTidy').replace(/^function applyTidy/, 'function applyTidy')}
      ${/var TIDY_COLS=\[[^\]]*\];/.exec(SRC)[0]}
      function tidyPlanAll(){ return { field: S.field, action: 'rename', from: 'x', to: 'y', productPatches: [{id:'P1', value:'y'}], platePatches: [], isMerge: false, count: 1 }; }
      function rebuild(){ S.rebuilt = true; }
      function dbPushIngredient(id){ S.pushed.push(id); }
      function hide(){}
      function toast(msg){ S.toasts.push(msg); }
      function renderTidyValues(){ S.rendered = true; }
      function tidyBlast(){ return ''; }
      var document = { getElementById: function(){ return { value: 'y' }; } };
      applyTidy();
      return productsById;
    `);
    const S = { field, pushed: [], toasts: [], rebuilt: false };
    return { db: factory(S), S };
  };

  const bad = run('cost_per_base_unit');
  assert.deepEqual(bad.S.pushed, [], 'a disallowed column writes NOTHING');
  assert.deepEqual(bad.db, {}, 'and productsById is untouched — the guard runs before the patch loop');
  assert.ok(bad.S.toasts.some(t => /tidy that field/i.test(t)), 'and the refusal is surfaced, not silent');

  const good = run('category');
  assert.deepEqual(good.S.pushed, ['P1'], 'a permitted column still writes exactly as before');
  assert.equal(good.db.P1.category, 'y', 'and the value lands');
});

test('v111: TIDY_COLS is the three label columns and nothing else', () => {
  const m = /var TIDY_COLS=(\[[^\]]*\])/.exec(SRC);
  assert.ok(m, 'TIDY_COLS must exist in app.js');
  assert.deepEqual(JSON.parse(m[1].replace(/'/g, '"')), ['category', 'brand', 'supplier']);
});
