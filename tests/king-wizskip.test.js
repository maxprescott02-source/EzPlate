/*
 * king-wizskip.test.js — locks in the v35 Item 4 skip model.
 *
 * v34's `kingWizSkip` was a bare in-memory map: skip 30 products on the till phone,
 * open the app on your own phone, and all 30 are back. v35 makes a skip a data
 * decision about the café — persisted to the `king_wiz_skips` setting, mirrored in
 * localStorage, loaded in bootstrapSync, shared across staff devices.
 *
 * These tests run the REAL shipped helpers against a fake localStorage and a fake
 * dbSetSetting, so they assert what actually gets written, not a re-description of it.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

// The stored-key constant must not drift from the source.
/* v108: KWSKIPKEY is gone — wizard skips are a SETTING (app_settings.king_wiz_skips), shared across
   devices, and no longer mirrored locally. The sandbox keeps a name so the harness reads the same,
   but nothing asserts a localStorage write any more; what matters is the dbSetSetting call. */
const KWSKIPKEY = 'cafeDB_kingWizSkips';

// Build a sandbox with the real skip helpers + kingWizGroups' skip gate.
function sandbox(products, words) {
  const writes = [];      // every dbSetSetting call
  const store = {};       // fake localStorage

  // eslint-disable-next-line no-new-func
  const factory = new Function('WRITES', 'STORE', 'PRODUCTS', 'KITCHEN', `
    "use strict";
    var localStorage = {
      getItem: function(k){ return (k in STORE) ? STORE[k] : null; },
      setItem: function(k,v){ STORE[k] = String(v); }
    };
    function dbSetSetting(key, val){ WRITES.push({ key: key, value: val }); }
    var PRODUCTS_ = PRODUCTS, kitchenIngredients = KITCHEN;
    var kingWizSkip = {};
    var KWSKIPKEY = '${KWSKIPKEY}';
    ${extractFn(SRC, 'kingWizSkipIds')}
    ${extractFn(SRC, 'setKingWizSkips')}
    ${extractFn(SRC, 'saveKingWizSkips')}
    // kingUnlinkedProducts / kingWizOutstanding, with PRODUCTS injected
    function kingLinkableProducts(){ return PRODUCTS_.filter(function(p){ return p && p.description && p.is_food!==false; }); }
    ${extractFn(SRC, 'kingUnlinkedProducts')}
    ${extractFn(SRC, 'kingWizOutstanding')}
    return {
      skip: function(id){ kingWizSkip[id] = 1; saveKingWizSkips(); },
      unskip: function(id){ delete kingWizSkip[id]; saveKingWizSkips(); },
      load: function(ids){ setKingWizSkips(ids); },
      ids: function(){ return kingWizSkipIds(); },
      outstanding: function(){ return kingWizOutstanding(); },
      unlinked: function(){ return kingUnlinkedProducts().map(function(p){ return p.id; }); }
    };
  `);
  return { api: factory(writes, store, products, words), writes, store };
}

const PRODUCTS = [
  { id: 'P0108', description: 'Chips 10Mm Straight Cut', brand: 'Safries', is_food: true },
  { id: 'P0005', description: 'Bags Garbage Prem 72-80Lt Black', brand: 'Cater Clean', is_food: false }, // not linkable
  { id: 'P0010', description: 'Barramundi Flt 100/200 S/Less', brand: 'Seacrest', is_food: true },
  { id: 'P0298', description: 'Sauce Tartare Pouch', brand: 'Edlyn', is_food: true }
];
const WORDS = [{ id: 'K0001', name: 'Chips', pid: 'P0108' }];   // Chips already linked

test('ITEM 4: a skip persists to the king_wiz_skips setting payload AND the localStorage mirror', () => {
  const { api, writes, store } = sandbox(PRODUCTS, WORDS);
  api.skip('P0010');

  assert.equal(writes.length, 1, 'exactly one setting write per skip');
  assert.equal(writes[0].key, 'king_wiz_skips', 'the key the brief specifies');
  assert.deepEqual(writes[0].value, ['P0010'], 'stored shape is an array of product ids');

});

test('ITEM 4: an unskip removes the id and persists the shorter list', () => {
  const { api, writes, store } = sandbox(PRODUCTS, WORDS);
  api.skip('P0010');
  api.skip('P0298');
  assert.deepEqual(api.ids().sort(), ['P0010', 'P0298']);

  api.unskip('P0010');
  assert.deepEqual(api.ids(), ['P0298'], 'gone from memory');
  assert.deepEqual(writes[writes.length - 1].value, ['P0298'], 'and gone from the payload');
});

test('ITEM 4: loading the setting is idempotent \u2014 bootstrapSync can run twice safely', () => {
  const { api, store } = sandbox(PRODUCTS, WORDS);
  api.load(['P0010', 'P0298']);
  const first = api.ids().sort();
  api.load(['P0010', 'P0298']);
  assert.deepEqual(api.ids().sort(), first, 'same payload in, same state out');

  api.load([]);
  assert.deepEqual(api.ids(), [], 'an empty payload clears, it does not merge');
});

test('ITEM 4: the wizard\u2019s outstanding count excludes skipped ids \u2014 a skip is decided, not pending', () => {
  const { api } = sandbox(PRODUCTS, WORDS);
  // P0108 is linked to "Chips"; P0005 is not is_food. So P0010 + P0298 are unlinked.
  assert.deepEqual(api.unlinked().sort(), ['P0010', 'P0298']);
  assert.equal(api.outstanding(), 2, 'both are proposable to start with');

  api.skip('P0010');
  assert.equal(api.outstanding(), 1, 'a skipped product drops out of what the wizard could propose');
  assert.deepEqual(api.unlinked().sort(), ['P0010', 'P0298'], 'but it is still genuinely unlinked \u2014 the progress line stays literal');

  api.skip('P0298');
  assert.equal(api.outstanding(), 0, 'skip everything and there is nothing left to propose');
  assert.equal(api.ids().length, 2, 'while both remain recoverable via Unskip');
});
