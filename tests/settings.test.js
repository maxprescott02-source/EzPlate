/*
 * settings.test.js — locks in the v35 Item 6 Settings surface.
 *
 * Three things worth guarding:
 *
 *  1. THE VERSION MIRROR. app.js's APP_VERSION is a mirror of sw.js's CACHE constant,
 *     which is the source of truth. The brief said "do not hardcode a second copy";
 *     the alternative was fetching and regexing sw.js at runtime, which adds an async
 *     network read that breaks offline for the sake of a label. A mirror is only safe
 *     if drift is impossible — so this test IS the safety mechanism. If someone bumps
 *     sw.js and forgets app.js, this fails.
 *
 *  2. THE BACKUP. It's a lifeboat. It has to actually contain the data.
 *
 *  3. THE COGS ROUND-TRIP. Editing the target in Settings must reach the maths, not
 *     just the label — asserted through analyze(), the real consumer.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
const SW = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`settings: function not found -> ${name}. app.js changed; update tests/settings.test.js`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`settings: unbalanced braces for ${name}`);
}

/* ---------- 1. the version mirror ---------- */

test('ITEM 6: APP_VERSION mirrors sw.js\u2019s CACHE constant \u2014 this test is why a mirror is allowed', () => {
  const cache = /const CACHE = 'ezplate-(v\d+)'/.exec(SW);
  assert.ok(cache, 'sw.js must declare CACHE as ezplate-vNN');
  const app = /var APP_VERSION='(v\d+)'/.exec(APP);
  assert.ok(app, 'app.js must declare APP_VERSION');
  assert.equal(app[1], cache[1],
    `APP_VERSION (${app[1]}) and sw.js CACHE (${cache[1]}) disagree — bump both, or the About block lies`);
});

test('ITEM 6: all five cache spots agree with each other', () => {
  const v = /const CACHE = 'ezplate-v(\d+)'/.exec(SW)[1];
  const swAssets = SW.match(/\?v=(\d+)/g) || [];
  assert.equal(swAssets.length, 2, 'sw.js ASSETS carries two ?v= stamps');
  swAssets.forEach(s => assert.equal(s, `?v=${v}`, `sw.js asset stamp ${s} disagrees with CACHE v${v}`));
  const htmlAssets = HTML.match(/\?v=(\d+)/g) || [];
  assert.equal(htmlAssets.length, 2, 'index.html carries two ?v= stamps');
  htmlAssets.forEach(s => assert.equal(s, `?v=${v}`, `index.html stamp ${s} disagrees with CACHE v${v}`));
});

/* ---------- 2. the backup ---------- */

function buildBackupIn(state) {
  // eslint-disable-next-line no-new-func
  const factory = new Function('S', `
    "use strict";
    var APP_VERSION = S.APP_VERSION;
    var overrides = S.overrides, kitchenIngredients = S.kitchenIngredients,
        savedPlates = S.savedPlates, customMenu = S.customMenu,
        cogsPct = S.cogsPct, gstDefault = S.gstDefault,
        deletedMenuIds = S.deletedMenuIds, deletedProdIds = S.deletedProdIds,
        menusList = S.menusList, currentMenuId = S.currentMenuId;
    var kingWizSkip = S.kingWizSkip;
    ${extractFn(APP, 'kingWizSkipIds')}
    ${extractFn(APP, 'buildBackup')}
    return buildBackup();
  `);
  return factory(state);
}

const STATE = {
  APP_VERSION: 'v35',
  overrides: { P0108: { id: 'P0108', cost_per_base_unit: 0.0031 } },
  kitchenIngredients: [{ id: 'K0001', name: 'Chips', pid: 'P0108' }],
  savedPlates: [{ id: 'SP1', name: 'Cod & Chips', lines: [{ kid: 'K0001', qty: 250 }] }],
  customMenu: [{ id: 'M1', section: 'FISH PACKS', name: 'Cod & Chips', price: 16 }],
  cogsPct: 38, gstDefault: 'inc',
  kingWizSkip: { P0005: 1 },
  deletedMenuIds: ['M9'], deletedProdIds: ['P0999'],
  menusList: [{ id: 'MENU_ORIGINAL', name: 'Original' }], currentMenuId: 'MENU_ORIGINAL'
};

test('ITEM 6: the backup serialises to real JSON and carries all five data groups', () => {
  const parsed = JSON.parse(JSON.stringify(buildBackupIn(STATE)));   // must survive a real round-trip
  ['products', 'kitchen_ingredients', 'plates', 'menu_items', 'settings'].forEach(k => {
    assert.ok(k in parsed, `backup is missing the "${k}" group`);
  });
  assert.equal(parsed.app, 'EzPlate');
  assert.equal(parsed.version, 'v35');
  assert.ok(!isNaN(Date.parse(parsed.exported_at)), 'exported_at is a real timestamp');
});

test('ITEM 6: the backup carries the actual data, not just the shape', () => {
  const b = JSON.parse(JSON.stringify(buildBackupIn(STATE)));
  assert.equal(b.products.P0108.cost_per_base_unit, 0.0031, 'product overrides are the only thing not in BASE_PRODUCTS \u2014 losing them loses every price ever imported');
  assert.deepEqual(b.kitchen_ingredients, STATE.kitchenIngredients);
  assert.equal(b.plates[0].lines[0].kid, 'K0001', 'plate lines reference kitchen words by kid');
  assert.equal(b.menu_items[0].price, 16);
});

test('ITEM 6: the backup carries every setting, including the ones added this version', () => {
  const s = JSON.parse(JSON.stringify(buildBackupIn(STATE))).settings;
  assert.equal(s.food_cost_target, 38);
  assert.equal(s.gst_default, 'inc');
  assert.deepEqual(s.king_wiz_skips, ['P0005'], 'v35 skips are data — they belong in a backup');
  assert.deepEqual(s.deleted_menu_ids, ['M9']);
  assert.deepEqual(s.deleted_prod_ids, ['P0999']);
  assert.equal(s.current_menu_id, 'MENU_ORIGINAL');
});

/* ---------- 3. the COGS round-trip, through the real consumer ---------- */

function cogsHarness() {
  const writes = [];
  const store = {};
  // eslint-disable-next-line no-new-func
  const factory = new Function('WRITES', 'STORE', `
    "use strict";
    var localStorage = { getItem:function(k){return (k in STORE)?STORE[k]:null;}, setItem:function(k,v){STORE[k]=String(v);} };
    var document = { getElementById: function(){ return null; } };
    function dbSetSetting(k,v){ WRITES.push({key:k, value:v}); }
    function renderAnalysis(){}
    var cogsPct = 40;
    ${extractFn(APP, 'foodTarget')}
    ${extractFn(APP, 'setCogs')}
    ${extractFn(APP, 'analyze')}
    return { setCogs:setCogs, analyze:analyze, foodTarget:foodTarget, get:function(){return cogsPct;} };
  `);
  return { api: factory(writes, store), writes, store };
}

test('ITEM 6: editing the target in Settings writes one setting + the localStorage mirror', () => {
  const { api, writes, store } = cogsHarness();
  api.setCogs(32, true);
  assert.equal(writes.length, 1, 'one dbSetSetting write, per the house rule');
  assert.deepEqual(writes[0], { key: 'food_cost_target', value: 32 });
  assert.equal(store['cafeDB_cogsPct'], '32', 'mirrored locally');
});

test('ITEM 6: a target set in Settings reaches the MATHS, not just the label', () => {
  const { api } = cogsHarness();
  // a $4 plate at a 40% target should suggest $10
  assert.equal(api.analyze(4, null).suggested, 10);

  api.setCogs(25, true);
  assert.equal(api.foodTarget(), 0.25);
  assert.equal(api.analyze(4, null).suggested, 16, 'the same plate at a 25% target must suggest $16');
});

test('ITEM 6: the target stays clamped to a sane range from any entry point', () => {
  const { api } = cogsHarness();
  api.setCogs(0, true);   assert.equal(api.get(), 1,  'floor');
  api.setCogs(500, true); assert.equal(api.get(), 99, 'ceiling');
  api.setCogs(37.6, true); assert.equal(api.get(), 38, 'rounded');
});

/* ---------- the Menu tab actually gave up its editor ---------- */

test('ITEM 6: the Menu tab no longer has a COGS input \u2014 editing really did move', () => {
  assert.ok(HTML.indexOf('id="cogsTargetRead"') >= 0, 'the Menu tab shows a read-only value');
  assert.ok(!/id="cogsTarget"/.test(HTML), 'the old editable input is gone, not just hidden');
  assert.ok(HTML.indexOf('id="cogsToSettings"') >= 0, 'and points at Settings');
  assert.ok(HTML.indexOf('id="setCogsInput"') >= 0, 'which is where the editor now lives');
});

test('ITEM 6: Settings is a header gear, not a sixth nav tab', () => {
  assert.ok(/id="settingsBtn"[^>]*aria-label="Settings"/.test(HTML), 'gear button with an aria-label');
  const navTabs = (HTML.match(/class="navbtn[^"]*" data-tab=/g) || []).length;
  assert.equal(navTabs, 5, 'the nav bar stays at five tabs');
  assert.ok(!/data-tab="settings"/.test(HTML), 'Settings must not become a tab');
});
