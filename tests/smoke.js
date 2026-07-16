/*
 * smoke.js — headless load + interaction check (jsdom + the REAL index.html/app.js).
 *
 * NOT part of the node:test suite — it needs jsdom, which is a dev-only dependency and
 * is deliberately not in package.json (no new runtime deps). Run it by hand:
 *     npm install jsdom --no-save && node tests/smoke.js
 *
 * `node -c` proves app.js parses. This proves it RUNS: that the script reaches the end
 * of the file against the real markup, that every id the v35 wiring reaches for actually
 * exists, and that the new surfaces open and respond. It is the closest thing to Max's
 * phone that exists in this container.
 */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let failures = 0;
const ok = (label, cond, detail) => {
  if (cond) { console.log('  ok    ' + label); }
  else { failures++; console.log('  FAIL  ' + label + (detail ? '  -> ' + detail : '')); }
};

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');

const dom = new JSDOM(html, { url: 'https://example.com/', pretendToBeVisual: true, runScripts: 'outside-only' });
const { window } = dom;

// minimal browser surface app.js expects but jsdom lacks
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }));
window.scrollTo = () => {};
window.requestAnimationFrame = cb => setTimeout(cb, 0);
Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
window.URL.createObjectURL = () => 'blob:stub';
window.URL.revokeObjectURL = () => {};
// no SUPA_URL -> the data layer stays local/offline, which is what we want for a smoke test

console.log('\n[1] app.js loads against the real markup');
let loaded = false, loadErr = null;
try { window.eval(appJs); loaded = true; }
catch (e) { loadErr = e; }
ok('app.js runs to completion with no thrown error', loaded, loadErr && (loadErr.message + '\n        ' + String(loadErr.stack).split('\n')[1]));
if (!loaded) { console.log('\nsmoke: aborting — nothing else can be trusted.\n'); process.exit(1); }

const $ = id => window.document.getElementById(id);

console.log('\n[2] item 6 — Settings');
ok('#settingsPanel exists', !!$('settingsPanel'));
ok('gear opens it', (() => { $('settingsBtn').click(); return $('settingsPanel').classList.contains('open'); })());
// derive the expected version from sw.js's CACHE so this never rots again (settings.test.js pins the full six-spot mirror)
const swVer = (fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').match(/ezplate-(v\d+)/) || [])[1];
ok('About shows the version, matching sw.js', $('setVersion').textContent === swVer, $('setVersion').textContent + ' vs ' + swVer);
ok('COGS input prefills from cogsPct', $('setCogsInput').value === String(window.cogsPct), $('setCogsInput').value);
ok('GST default prefills', ['ex','inc'].indexOf($('setGstDefault').value) >= 0, $('setGstDefault').value);
ok('Done closes it', (() => { $('settingsDone').click(); return !$('settingsPanel').classList.contains('open'); })());

console.log('\n[3] item 6 — COGS moved to Settings and still drives the maths');
ok('Menu tab has no editable #cogsTarget', !$('cogsTarget'));
ok('Menu tab shows the read-only value', !!$('cogsTargetRead'));
const before = window.analyze(4, null).suggested;
$('settingsBtn').click();
$('setCogsInput').value = '25';
$('setCogsInput').dispatchEvent(new window.Event('input'));
ok('editing in Settings changes analyze()', window.analyze(4, null).suggested === 16, `was ${before}, now ${window.analyze(4,null).suggested}`);
ok('and the Menu tab display follows', $('cogsTargetRead').textContent === '25', $('cogsTargetRead').textContent);
ok('"Change it in Settings" opens the panel', (() => { $('settingsDone').click(); $('cogsToSettings').click(); return $('settingsPanel').classList.contains('open'); })());
$('settingsDone').click();

console.log('\n[4] item 6 — backup export');
let exported = null;
const origCreate = window.document.createElement.bind(window.document);
window.document.createElement = function (t) {
  const el = origCreate(t);
  if (t === 'a') { el.click = function () { exported = el.download; }; }
  return el;
};
window.exportBackup();
ok('clicking Export produces a dated .json download', /^ezplate-backup-\d{4}-\d{2}-\d{2}\.json$/.test(exported || ''), exported);
const backup = window.buildBackup();
ok('backup has all five groups', ['products','kitchen_ingredients','plates','menu_items','settings'].every(k => k in backup));
window.document.createElement = origCreate;

console.log('\n[5] item 6 — clear cache is blocked offline');
Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
window.clearCacheAndRefresh();
ok('offline: no confirm shown, app not stranded', !$('confirmModal').classList.contains('open'));
Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
window.clearCacheAndRefresh();
ok('online: the confirm appears', $('confirmModal').classList.contains('open'));
ok('and its copy promises the data is safe', /NOT touched/.test($('confirmMsg').textContent));
$('confirmCancel').click();

console.log('\n[6] item 3 — pantry search');
window.kitchenIngredients.length = 0;
window.kitchenIngredients.push({ id: 'K0001', name: 'Chips', pid: 'P0108' }, { id: 'K0002', name: 'Fish', pid: 'P0010' });
window.rebuildKById();
window.renderKitchenPanel();
ok('both ingredients render', window.document.querySelectorAll('#kingList .king-row').length === 2);
$('kingSearch').value = 'fish';
$('kingSearch').dispatchEvent(new window.Event('input'));
ok('searching filters to one', window.document.querySelectorAll('#kingList .king-row').length === 1);
$('kingSearch').value = 'safries';
$('kingSearch').dispatchEvent(new window.Event('input'));
ok('searching the linked product\'s brand finds the word', (window.document.querySelector('#kingList .king-name') || {}).textContent === 'Chips');
$('kingSearch').value = 'zzzz';
$('kingSearch').dispatchEvent(new window.Event('input'));
ok('no match shows "No ingredients match"', /No ingredients match/.test($('kingList').textContent));
$('kingSearchClear').click();
ok('clearing restores the full list', window.document.querySelectorAll('#kingList .king-row').length === 2);

console.log('\n[7] item 2 — rename');
window.openKingModal('K0001');
ok('modal is titled "Edit ingredient"', $('kingModalTitle').textContent === 'Edit ingredient', $('kingModalTitle').textContent);
ok('the name field is EDITABLE (v34 locked it)', $('king_name').disabled === false);
$('king_name').value = 'Fish';
$('king_name').dispatchEvent(new window.Event('input'));
window.saveKingModal();
ok('renaming onto another word is refused inline', $('king_err').style.display === 'block' && /already an ingredient/.test($('king_err').textContent));
ok('and the modal stays open so it can be fixed', $('kingModal').classList.contains('open'));
$('king_name').value = 'Hot Chips';
$('king_name').dispatchEvent(new window.Event('input'));
window.saveKingModal();
ok('a valid rename persists', window.kById['K0001'].name === 'Hot Chips', window.kById['K0001'].name);
ok('and keeps its kid, so saved plates still resolve', !!window.kById['K0001'] && window.kById['K0001'].pid === 'P0108');

console.log('\n[8] item 4 — wizard skips persist');
window.kingWizSkip = {};
window.kingWizOpen = true;
window.renderKingWizard();
const skipBtn = window.document.querySelector('#kingWiz .kw-skip');
ok('the wizard renders skippable rows', !!skipBtn);
if (skipBtn) {
  skipBtn.click();
  ok('a skip lands in localStorage immediately', (JSON.parse(window.localStorage.getItem('cafeDB_kingWizSkips')) || []).length > 0);
  ok('the skipped list is reachable', !!window.document.querySelector('#kingWiz .kw-skiptoggle'));
  window.document.querySelector('#kingWiz .kw-skiptoggle').click();
  const unskip = window.document.querySelector('#kingWiz .kw-unskip');
  ok('"show" reveals an Unskip control', !!unskip);
  if (unskip) {
    unskip.click();
    ok('unskip clears it from storage', (JSON.parse(window.localStorage.getItem('cafeDB_kingWizSkips')) || []).length === 0);
  }
}
window.kingWizOpen = false; window.renderKingWizard();

console.log('\n[9] item 1 — the red-row bug, rendered for real');
window.invRows = [{
  name: 'CHIPS STRAIGHT CUT 6X2.5KG', raw: 'CHIPS STRAIGHT CUT 6X2.5KG', bestId: 'P0108',
  unitPrice: 9.99, unit: 'kg', conf: 0.82, tier: 'hi', cands: [{ id: 'P0108', coverage: 0.82 }],
  addNew: false, manualPick: false, needManual: false, unitMismatch: false, uncertain: false, remembered: false
}];
window.renderInvReview();
const row = window.document.querySelector('#invReview tr.inv-data');
ok('the price jump is flagged', row.classList.contains('needs-attention'));
ok('THE BUG: the red row still shows its Old price', !!row.querySelector('td.invOld') && !row.querySelector('td.invOld').classList.contains('dash'));
ok('and its confidence', /82%/.test(row.textContent));
ok('it is muted but NOT .is-new (so CSS cannot hide those cells)', row.classList.contains('muted-row') && !row.classList.contains('is-new'));
ok('and says "price jump" in words, not just colour', /price jump/.test(row.textContent));

// P0108 is stored at $2.63/kg. Price it at 2.65 so NO price jump fires — otherwise
// price jump (correctly) outranks low match and we'd be testing precedence, not the cue.
window.invRows[0].conf = 0.44; window.invRows[0].tier = 'mid';
window.invRows[0].cands = [{ id: 'P0108', coverage: 0.44 }]; window.invRows[0].unitPrice = 2.65;
window.renderInvReview();
const low = window.document.querySelector('#invReview tr.inv-data');
ok('a 44% match now carries a visible low-match cue', /low match/.test(low.textContent));
ok('and still shows its Old price', !low.querySelector('td.invOld').classList.contains('dash'));
ok('a low match is NOT auto-ticked \u2014 it waits for a human', !low.querySelector('.invAppr').checked);

console.log('\n[10] item 5 — the kitchen-name combobox exists on an add-new line');
window.invRows = [{ name: 'CALAMARI RINGS 1KG', raw: 'CALAMARI RINGS 1KG', bestId: null, addNew: true,
  unitPrice: 14.92, unit: 'kg', conf: 0.1, tier: 'lo', cands: [], needManual: false,
  unitMismatch: false, uncertain: false, remembered: false }];
window.renderInvReview();
window.expandNewItem(0);
ok('the add-new row is .is-new (Old/Conf are genuinely meaningless there)', window.document.querySelector('#invReview tr.inv-data').classList.contains('is-new'));
ok('the Kitchen name field is a combobox, not free text', !!$('ni_kingDrop0'));
ok('it is prefilled with a proposal', ($('ni_king0').value || '').length > 0, $('ni_king0').value);
$('ni_king0').value = 'Hot Chips';
$('ni_king0').dispatchEvent(new window.Event('input'));
ok('typing an existing word offers it', /Hot Chips/.test($('ni_kingDrop0').textContent));
ok('and resolves to a REPOINT, not a silent skip', window.kingNameAction('Hot Chips', window.kitchenIngredients).action === 'repoint');
ok('while a new name still resolves to create', window.kingNameAction('Calamari', window.kitchenIngredients).action === 'create');

console.log('\n' + (failures ? `smoke: ${failures} FAILURE(S)\n` : 'smoke: all checks passed\n'));
process.exit(failures ? 1 : 0);
