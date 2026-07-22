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

console.log('\n[8] item 4 — wizard skips persist (v61: the wizard is a modal)');
window.kingWizSkip = {};
// v61 item 4: the "Set up from products" button opens the wizard MODAL; the × closes it.
window.showTab('pantry');
$('kingWizBtn').click();
ok('the button opens the wizard modal', $('kingWizModal').classList.contains('open') && window.kingWizOpen === true);
$('kingWizClose').click();
ok('the × closes it and clears kingWizOpen', !$('kingWizModal').classList.contains('open') && window.kingWizOpen === false);
window.kingWizOpen = true;
window.renderKingWizard();
ok('rendering the open wizard shows the modal', $('kingWizModal').classList.contains('open'));
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
ok('and says "price change" in words, not just colour', /price change/.test(row.textContent));   // v44 item 2: token renamed from "price jump"

// P0108 is stored at $2.63/kg. Price it at 2.65 so NO price jump fires — otherwise
// price jump (correctly) outranks low match and we'd be testing precedence, not the cue.
window.invRows[0].conf = 0.44; window.invRows[0].tier = 'mid';
window.invRows[0].cands = [{ id: 'P0108', coverage: 0.44 }]; window.invRows[0].unitPrice = 2.65;
window.renderInvReview();
const low = window.document.querySelector('#invReview tr.inv-data');
ok('a 44% match now carries a visible low-match cue', /low match/.test(low.textContent));
ok('and still shows its Old price', !low.querySelector('td.invOld').classList.contains('dash'));
ok('a low match is NOT auto-ticked \u2014 it waits for a human', !low.querySelector('.invAppr').checked);

// v72 (Max): the suggested-match chip now shows the FULL name inline (wraps on mobile, ellipsis + title on
// desktop) \u2014 the old truncation + white-toast long-press (data-full) reveal is gone. Two candidates \u2192 chips render.
window.invRows = [{ name: 'CHIPS', raw: 'CHIPS', bestId: 'P0108', unitPrice: 2.65, unit: 'kg', conf: 0.6, tier: 'mid',
  cands: [{ id: 'P0108', coverage: 0.6 }, { id: 'P0107', coverage: 0.5 }],
  addNew: false, manualPick: false, needManual: false, unitMismatch: false, uncertain: false, remembered: false }];
window.renderInvReview();
const chip0 = window.document.querySelector('#invReview .cand-chip');
ok('v72: a suggested-match chip shows the full product name inline (+ title for desktop hover, no data-full/toast)',
  !!chip0 && !!chip0.getAttribute('title') && chip0.textContent.indexOf(chip0.getAttribute('title')) >= 0 && !chip0.getAttribute('data-full'));

console.log('\n[10] item 5 — the kitchen-name combobox exists on an add-new line');
window.invRows = [{ name: 'CALAMARI RINGS 1KG', raw: 'CALAMARI RINGS 1KG', bestId: null, addNew: true,
  unitPrice: 14.92, unit: 'kg', conf: 0.1, tier: 'lo', cands: [], needManual: false,
  unitMismatch: false, uncertain: false, remembered: false }];
window.renderInvReview();
window.expandNewItem(0);
ok('the add-new row is .is-new (Old/Conf are genuinely meaningless there)', window.document.querySelector('#invReview tr.inv-data').classList.contains('is-new'));
ok('the Kitchen name field is a combobox, not free text', !!$('ni_kingDrop0'));
ok('v55 §F2: the Kitchen name field starts BLANK (no silent repoint prefill)', ($('ni_king0').value || '') === '', $('ni_king0').value);
// v55 §F1: parser-filled fields carry the "af" (auto-filled) mark; empty ones do not
ok('§F1: a parser-filled field is marked auto-filled', $('ni_name0').classList.contains('af'));
ok('§F1: the (blank) Kitchen field is NOT marked auto-filled', !$('ni_king0').classList.contains('af'));
$('ni_king0').value = 'Hot Chips';
$('ni_king0').dispatchEvent(new window.Event('input'));
ok('typing an existing word offers it', /Hot Chips/.test($('ni_kingDrop0').textContent));
ok('and resolves to a REPOINT, not a silent skip', window.kingNameAction('Hot Chips', window.kitchenIngredients).action === 'repoint');
ok('while a new name still resolves to create', window.kingNameAction('Calamari', window.kitchenIngredients).action === 'create');

console.log('\n[11] v50 item 1 — a new-item form survives an edit to a DIFFERENT row');
window.invSupplier = '';
window.invRows = [
  { name: 'MAPLE SYRUP 1L', raw: 'MAPLE SYRUP 1L', bestId: null, addNew: true, unitPrice: 12.5, unit: 'l',
    conf: 0.1, tier: 'lo', cands: [], needManual: false, unitMismatch: false, uncertain: false, remembered: false, newItem: null },
  { name: 'CHIPS STRAIGHT CUT 6X2.5KG', raw: 'CHIPS STRAIGHT CUT 6X2.5KG', bestId: 'P0108', addNew: false,
    unitPrice: 2.65, unit: 'kg', conf: 0.82, tier: 'hi', cands: [{ id: 'P0108', coverage: 0.82 }],
    needManual: false, unitMismatch: false, uncertain: false, remembered: false, newItem: null }
];
window.renderInvReview();
// open + fill the new-item form on row 0
window.document.querySelector('#invReview tr.inv-data[data-i="0"] .ni-add-btn').click();
ok('the new-item form opened on row 0', !!$('ni_name0'));
ok('v72: the form nests INSIDE the line card (in the row, no separate .ni-row)',
  !!$('ni_name0') && $('ni_name0').closest('.inv-data') === window.document.querySelector('#invReview tr.inv-data[data-i="0"]') && !window.document.querySelector('#invReview .ni-row'));
$('ni_name0').value = 'Pure Maple Syrup';
$('ni_name0').dispatchEvent(new window.Event('input'));   // §F1: editing clears the auto-filled mark
ok('§F1: editing a marked field clears its auto-filled mark', !$('ni_name0').classList.contains('af'));
$('ni_price0').value = '13.75';
$('ni_pack0').value = '1 x 1L';
// tick Apply on row 0 (the user has finished the form)
const ap0 = window.document.querySelector('#invReview tr.inv-data[data-i="0"] .invAppr');
ap0.checked = true;
// now EDIT A DIFFERENT ROW — this is the exact repro: it forces a full renderInvReview()
const price1 = window.document.querySelector('#invReview tr.inv-data[data-i="1"] .invPrice');
price1.value = '2.80';
price1.dispatchEvent(new window.Event('change'));
// row 0's form + tick must be intact in the rebuilt markup
ok('row 0 form reopened after editing row 1', !!$('ni_name0'));
ok('row 0 kept its typed Name', ($('ni_name0') || {}).value === 'Pure Maple Syrup', ($('ni_name0') || {}).value);
ok('§F1: the edited Name stays un-marked after the re-render (mark does not come back)', !$('ni_name0').classList.contains('af'));
ok('row 0 kept its typed Price', ($('ni_price0') || {}).value === '13.75', ($('ni_price0') || {}).value);
ok('row 0 kept its typed Pack size', ($('ni_pack0') || {}).value === '1 x 1L', ($('ni_pack0') || {}).value);
const ap0b = window.document.querySelector('#invReview tr.inv-data[data-i="0"] .invAppr');
ok('row 0 Apply tick survived the re-render', !!(ap0b && ap0b.checked));
// and the summary still counts it as a NEW item, not matched
ok('row 0 is still an add-new line', window.document.querySelector('#invReview tr.inv-data[data-i="0"]').classList.contains('st-new'));

console.log('\n[12] v54 — Plates library tab + builder popup + publish-from-card');
// the Builder tab is now the Plates library; the builder lives in a popup.
ok('the tab container keeps data-tab="builder" (identifier unchanged)', !!$('tab-builder'));
ok('the Plates card grid exists', !!$('plateList'));
ok('the builder popup exists as a modal, not the tab body', !!$('builderModal') && !!$('docketPanel'));
ok('the old builder buttons are gone (no Publish-to-Menu / Save-draft)', !$('addMenuBtn'));
ok('the single Save button remains inside the popup', !!$('saveBtn'));

// Build a REAL plate through the actual Save flow (savedPlates/plate are `let`, not window props, so we
// drive the wired functions rather than poking state — a stronger end-to-end check than seeding).
$('newPlateBtn').click();
ok('+ New plate opens the builder popup', $('builderModal').classList.contains('open'));
ok('the popup opens on an empty, unlinked plate', $('plateName').value === '' && $('menuLink').value === '');
$('plateName').value = 'Smoke Plate';
ok('the builder has a category field (§J)', !!$('plateCat'));
$('plateCat').value = 'Breakfast';                      // §J: the plate's library category
window.addMiscCost();                                   // a misc line makes the plate non-empty
$('saveBtn').click();                                   // Save -> saves an UNPUBLISHED plate + closes the popup
ok('Save closes the builder popup', !$('builderModal').classList.contains('open'));
let libCard = window.document.querySelector('#plateList .ing-card');
ok('the saved plate appears as a card', !!libCard && /Smoke Plate/.test(libCard.textContent), libCard && libCard.textContent);
ok('the card shows its category (§J)', /Breakfast/.test(libCard.textContent), libCard && libCard.textContent);
ok('the category filter is populated (§J)', /Breakfast/.test(($('plateCatFilter') || {}).textContent || ''));
ok('a freshly-saved plate is Unpublished', !!libCard && /Unpublished/.test(libCard.textContent));
ok('the card shows a plate-cost cell', !!libCard && /plate cost/.test(libCard.textContent) && /\$/.test(libCard.textContent), libCard && libCard.textContent);

// tapping the card opens the action chooser -> Manage menus (v55 many-to-many)
libCard.click();
ok('tapping a card opens the action popup', $('plateActionsModal').classList.contains('open'));
ok('the card offers "Manage menus"', $('paPublish').textContent === 'Manage menus', $('paPublish').textContent);
$('paPublish').click();
ok('Manage menus opens its modal', $('manageMenusModal').classList.contains('open'));
let addBtn = window.document.querySelector('#mmList .mm-add');
ok('the plate is not yet on any menu (an Add row is offered)', !!addBtn);

// add the plate to the first menu -> the publish modal collects a per-menu price
addBtn.click();
ok('Add opens the publish modal', $('menuModal').classList.contains('open'));
$('mi_name').value = 'Smoke Plate';
$('mi_price').value = '12';
$('mi_cat').value = '';                                 // empty category -> "Uncategorised", no combo confirmation
window.submitMenuItem();
ok('publishing closes the publish modal', !$('menuModal').classList.contains('open'));
window.renderPlatesTab();
libCard = window.document.querySelector('#plateList .ing-card');
ok('the plate now shows which menu it is On', !!libCard && /On /.test(libCard.textContent), libCard && libCard.textContent);
// Manage menus now shows the menu with a price + Remove (published there)
libCard.click();
$('paPublish').click();
ok('the menu now shows a Remove control (plate is on it)', !!window.document.querySelector('#mmList .mm-remove'));
ok('the per-menu price is shown', /12\.00/.test($('mmList').textContent), $('mmList').textContent);
// remove it -> back to unpublished
window.document.querySelector('#mmList .mm-remove').click();
ok('removing from the menu unpublishes it there', !!window.document.querySelector('#mmList .mm-add'));
$('manageMenusDone').click();

console.log('\n[13] v54 — product Unit type is create-only on the edit form');
window.showTab('ingredients');
window.renderIngredients();
const firstProd = window.document.querySelector('#ingList .ing-card');
ok('the Products tab renders cards', !!firstProd);
window.openIngEdit(firstProd.getAttribute('data-id'));
ok('the edit form opened', $('ingModal').classList.contains('open'));
ok('the Unit type control is disabled (read-only)', $('ig_unit').disabled === true);
// the pack-teach convenience must NOT change a product's base unit on the edit form
const unitBefore = $('ig_unit').value;
const other = unitBefore === 'kg' ? 'ea' : 'kg';
$('ig_packUnit').value = other;
$('ig_packUnit').dispatchEvent(new window.Event('change'));
ok('choosing a pack unit does NOT change the (create-only) unit type', $('ig_unit').value === unitBefore, $('ig_unit').value + ' vs ' + unitBefore);
$('ingCancel').click();

console.log('\n[14] v54 — Products "Clear filters" button (hidden when inert)');
window.showTab('ingredients');
window.renderIngredients();
ok('Clear filters is hidden when no filter is active', $('ingClearFilters').style.display === 'none', $('ingClearFilters').style.display);
$('ingSearch').value = 'zzzznomatch';
window.renderIngredients();
ok('Clear filters appears once a filter is active', $('ingClearFilters').style.display !== 'none');
$('ingClearFilters').click();
ok('clicking it clears the search', $('ingSearch').value === '');
ok('and it hides itself again', $('ingClearFilters').style.display === 'none');

console.log('\n[15] v62 — AI second reader (status note, merge, chip)');
// A matched hi-tier row for P0108 (stored ~$2.63/kg), priced high so the parser reading is far from history.
const matchedRow = () => ({
  name: 'CHIPS STRAIGHT CUT 6X2.5KG', raw: 'CHIPS STRAIGHT CUT 6X2.5KG', bestId: 'P0108',
  unitPrice: 9.99, unit: 'kg', conf: 0.82, tier: 'hi', cands: [{ id: 'P0108', coverage: 0.82 }],
  addNew: false, manualPick: false, needManual: false, unitMismatch: false, uncertain: false, remembered: false, newItem: null
});
const invSumText = () => ($('invReview').querySelector('.inv-sum') || {}).textContent || '';
const tbodyHtml = () => ($('invReview').querySelector('.invtable tbody') || {}).innerHTML || '';

// (a) the summary status note, three states
window.invRows = [matchedRow()];
window.gemStatus = 'checking'; window.renderInvReview();
ok('summary shows "AI double-checking…" while a check is in flight', /AI double-checking/.test(invSumText()));
const rowsWhileChecking = tbodyHtml();
window.gemStatus = 'unavailable'; window.renderInvReview();
ok('unavailable shows "AI check unavailable"', /AI check unavailable/.test(invSumText()));
ok('TIMEOUT/UNAVAILABLE degrades to IDENTICAL rows — only the summary note differs', tbodyHtml() === rowsWhileChecking);
window.gemStatus = 'checked'; window.renderInvReview();
ok('success shows "✓ AI checked"', /AI checked/.test(invSumText()));

// (b) v66: parser HAS a price and Gemini disagrees — the AI must NEVER overrule the parser's money.
//   b1: both readings far from history → history can't arbitrate → parser stands, no change, no flag.
window.invRows = [matchedRow()]; window.gemApplied = false;   // matchedRow priced 9.99/kg; P0108 history ~2.63/kg
window.gemApplyReadings({ status: 'ok', lines: [
  { rawText: 'CHIPS STRAIGHT CUT 6X2.5KG', description: 'CHIPS STRAIGHT CUT 6X2.5KG', derivedUnitPrice: 20, unitType: 'kg', packCount: 6 }
] });
ok('MONEY STAYS DETERMINISTIC: the AI does NOT overrule the parser price on disagreement', window.invRows[0].unitPrice === 9.99 && !window.invRows[0].aiSuggested);
const rKeep = window.document.querySelector('#invReview tr.inv-data[data-i="0"]');
ok('no AI flag when history can\'t arbitrate (both far from history) — parser just stands', !/check price/.test(rKeep.textContent));

//   b2: parser out of band, Gemini IN band (history says parser looks wrong) → FLAG "check price", price untouched.
window.invRows = [matchedRow()]; window.gemApplied = false;
window.gemApplyReadings({ status: 'ok', lines: [
  { rawText: 'CHIPS STRAIGHT CUT 6X2.5KG', description: 'CHIPS STRAIGHT CUT 6X2.5KG', derivedUnitPrice: 2.60, unitType: 'kg', packCount: 6 }
] });
ok('rule 3 FLAG: the parser price is left UNCHANGED (never overruled)', window.invRows[0].unitPrice === 9.99);
const rFlag = window.document.querySelector('#invReview tr.inv-data[data-i="0"]');
ok('rule 3 FLAG: review-state, unticked, shows "check price"', rFlag.classList.contains('st-review') && !rFlag.querySelector('.invAppr').checked && /check price/.test(rFlag.textContent));
ok('summary flips to checked after the merge', /AI checked/.test(invSumText()));

// (c) rule 5: a Gemini-only line the parser dropped → appended as an unticked add-new row with AI chips
window.invRows = [matchedRow()]; window.gemApplied = false;
window.gemApplyReadings({ status: 'ok', lines: [
  { rawText: 'MYSTERY SAUCE 2L', description: 'Mystery Sauce', derivedUnitPrice: 5, unitType: 'l', packCount: 1 }
] });
ok('rule 5: the parser row is untouched (rule 6, no G match)', window.invRows[0].unitPrice === 9.99);
ok('rule 5: a new add-new row was appended', window.invRows.length === 2 && window.invRows[1].addNew === true && window.invRows[1].aiSource === true);
window.expandNewItem(1);
ok('rule 5: the appended row is never auto-ticked', !window.document.querySelector('#invReview tr.inv-data[data-i="1"] .invAppr').checked);
const niAf1 = $('ni_name1') && $('ni_name1').closest('.ni-f').querySelector('.ni-af');
ok('rule 5: the new-item form labels its prefilled fields "AI suggested" (one chip system, two labels)', !!niAf1 && /AI suggested/.test(niAf1.textContent), niAf1 && niAf1.textContent);

// (d) a parser-built new-item form still says "auto-filled" (the other label of the same system)
window.invRows = [{ name: 'CALAMARI 1KG', raw: 'CALAMARI 1KG', bestId: null, addNew: true, unitPrice: 14.92, unit: 'kg',
  conf: 0.1, tier: 'lo', cands: [], needManual: false, unitMismatch: false, uncertain: false, remembered: false, newItem: null }];
window.renderInvReview(); window.expandNewItem(0);
ok('a parser-built new-item form keeps the "auto-filled" label', /auto-filled/.test($('ni_name0').closest('.ni-f').querySelector('.ni-af').textContent));

// (e) async: the request fires, a stale/late response is discarded, a current one flips to checked
let pending = [];
window.fetch = (url, opts) => new Promise((resolve, reject) => { pending.push({ resolve, reject, url, opts }); });
const tick = () => new Promise(r => setTimeout(r, 0));

(async function asyncSection() {
  // late-discard: fire, then a newer parse bumps the token; the old response must not mutate the rows
  window.invRows = [matchedRow()]; window.gemApplied = false; window.gemStatus = 'checking';
  window.gemFireSecondReader('SOME INVOICE TEXT');
  ok('fire posts to /api/parse-invoice', pending.length === 1 && /\/api\/parse-invoice/.test(pending[0].url));
  window.gemToken++;   // a newer parse/openInv invalidates the in-flight request
  pending[0].resolve({ ok: true, json: () => Promise.resolve({ status: 'ok', lines: [
    { rawText: 'CHIPS STRAIGHT CUT 6X2.5KG', description: 'CHIPS STRAIGHT CUT 6X2.5KG', derivedUnitPrice: 20, unitType: 'kg', packCount: 6 } ] }) });
  await tick(); await tick();
  ok('LATE-RESPONSE-DISCARDED: a stale token never alters the rows', window.invRows[0].unitPrice === 9.99);

  // current response: fires, resolves with an agreeing (rule 2) reading → status becomes checked, no change
  pending = [];
  window.invRows = [matchedRow()]; window.invRows[0].unitPrice = 2.63; window.gemApplied = false; window.gemStatus = 'checking';
  window.gemFireSecondReader('SOME INVOICE TEXT');
  pending[0].resolve({ ok: true, json: () => Promise.resolve({ status: 'ok', lines: [
    { rawText: 'CHIPS STRAIGHT CUT 6X2.5KG', description: 'CHIPS STRAIGHT CUT 6X2.5KG', derivedUnitPrice: 2.63, unitType: 'kg', packCount: 6 } ] }) });
  await tick(); await tick();
  ok('a current, agreeing response flips the note to checked with no row change', /AI checked/.test(invSumText()) && window.invRows[0].unitPrice === 2.63);

  // a failing fetch degrades silently to "unavailable"
  pending = [];
  window.invRows = [matchedRow()]; window.gemApplied = false; window.gemStatus = 'checking';
  window.gemFireSecondReader('SOME INVOICE TEXT');
  pending[0].reject(new Error('network down'));
  await tick(); await tick();
  ok('a failed request degrades to "AI check unavailable" (no error modal)', /AI check unavailable/.test(invSumText()));

  console.log('\n[16] v63 — status flicker guard, check-match row, Dashboard insights');
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // (a) flicker guard: a fast/agreeing response must NOT flip the note before it can be read
  pending = [];
  window.invRows = [matchedRow()]; window.invRows[0].unitPrice = 2.63; window.gemApplied = false;
  window.gemStatus = 'checking'; window.gemCheckStart = Date.now();   // exactly as parseInvoice stamps it
  window.renderInvReview();                                            // paint the "checking" note first
  window.gemFireSecondReader('SOME INVOICE TEXT');
  pending[0].resolve({ ok: true, json: () => Promise.resolve({ status: 'ok', lines: [
    { rawText: 'CHIPS STRAIGHT CUT 6X2.5KG', description: 'CHIPS STRAIGHT CUT 6X2.5KG', derivedUnitPrice: 2.63, unitType: 'kg', packCount: 6 } ] }) });
  await tick(); await tick();
  ok('FLICKER GUARD: a fast result does NOT flip the note instantly — "checking" is still up', /AI double-checking/.test(invSumText()));
  await wait(window.GEM_MIN_VISIBLE + 80);
  ok('FLICKER GUARD: once the minimum-visible window passes, the note flips to checked', /AI checked/.test(invSumText()));

  // (b) item 2 — a suspected wrong-match row renders unticked, flagged "check match", AI product ranked first
  window.invRows = [{ name: 'MAPLE SYRUP 1L', raw: 'MAPLE SYRUP 1L', bestId: 'P0108', unitPrice: 12, unit: 'l', conf: 0.4, tier: 'mid',
    gemMatchReview: true, gemSuggestId: 'P0107', cands: [{ id: 'P0107', coverage: 0.8, ai: true }, { id: 'P0108', coverage: 0.4 }],
    addNew: false, manualPick: false, needManual: false, unitMismatch: false, uncertain: false, remembered: false, newItem: null }];
  window.renderInvReview();
  const cm = window.document.querySelector('#invReview tr.inv-data[data-i="0"]');
  ok('check-match: the row is a review state (st-review)', cm.classList.contains('st-review'));
  ok('check-match: the row is NOT auto-ticked (a human ticks the right product)', !cm.querySelector('.invAppr').checked);
  ok('check-match: the "check match" flag pill shows (not "price change")', /check match/.test(cm.textContent) && !/price change/.test(cm.textContent));
  ok('check-match: the AI-suggested product is the FIRST candidate chip and carries the AI marker',
    !!cm.querySelector('.cand-chip') && cm.querySelector('.cand-chip').classList.contains('ai') && /AI/.test((cm.querySelector('.cc-ai') || {}).textContent || ''));

  // (c) item 5 (v67) — the "Suggestions" card now lives on the MENU tab (moved off the Dashboard),
  // scoped to the current menu. Templates render immediately; a valid rephrasing swaps in place.
  const stashCI = window.computeInsights;
  window.computeInsights = () => ([
    { kind: 'reprice', facts: { name: 'Barra & Chips', pts: 10, menuPrice: 15, targetPrice: 20, targetPct: 30 }, text: 'Barra & Chips runs 10 pts over at $15.00 — lift it to $20.00 to land near 30%.' },
    { kind: 'count', facts: { over: 1, total: 3, targetPct: 30 }, text: '1 of 3 costed dishes sit over your 30% target.' }
  ]);
  pending = [];
  let menuThrew = null; try { window.renderMenuInsights(); } catch (e) { menuThrew = e; }
  ok('menu Suggestions renders without throwing', !menuThrew, menuThrew && menuThrew.message);
  const di = $('menuInsightsPanel');
  ok('the "Suggestions" note renders on the MENU tab when there are insights', !!di);
  ok('it renders the deterministic templates immediately (1–3 lines, no input box)', di && di.querySelectorAll('.mi-line').length === 2 && !di.querySelector('input,textarea'));
  ok('v68: the title reads "What stands out on {menu}", no eyebrow/mark chrome', di && /What stands out on/.test(di.textContent) && !/SUGGESTIONS/i.test(di.textContent) && !di.querySelector('.mi-mark,svg'));
  ok('v68: the "Refined by Gemini" credit is present but HIDDEN while the template shows (honest attribution)', di && di.querySelector('.mi-credit') && di.querySelector('.mi-credit').hidden === true);
  ok('the reprice template shows its computed numbers verbatim', di && /10 pts over/.test(di.textContent) && /\$20\.00/.test(di.textContent));
  ok('a single phrasing call is posted to /api/insight', pending.filter(p => /\/api\/insight/.test(p.url)).length === 1);
  const ip = pending.find(p => /\/api\/insight/.test(p.url));
  if (ip) ip.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok', lines: [
    { text: 'Heads up — Barra & Chips runs 10 pts hot; nudging $15.00 to $20.00 lands you at ~30%.' },
    { text: '1 of 3 costed dishes sit over your 30% target.' } ] }) });
  await tick(); await tick();
  ok('a valid rephrasing (numbers intact) swaps into the card in place', di && /runs 10 pts hot/.test(di.textContent) && /\$20\.00/.test(di.textContent));
  ok('v68: once Gemini actually phrased a shown line, the "Refined by Gemini" credit is revealed', di && di.querySelector('.mi-credit') && di.querySelector('.mi-credit').hidden === false);
  // v69 (Max): insights + their phrasing are cached per menu per period — a re-render within the period must
  // NOT hit Gemini again (saves the limited quota); the cached phrasing + its credit show straight away.
  const fetchesBefore = pending.filter((p) => /\/api\/insight/.test(p.url)).length;
  window.renderMenuInsights();
  const dj = $('menuInsightsPanel');
  ok('v69: a re-render within the period reuses the cache — no second Gemini call', pending.filter((p) => /\/api\/insight/.test(p.url)).length === fetchesBefore);
  ok('v69: the cached phrasing (and its credit) apply immediately on the cache hit', dj && /runs 10 pts hot/.test(dj.textContent) && dj.querySelector('.mi-credit') && dj.querySelector('.mi-credit').hidden === false);
  // v69 item 1: the Suggestions content lives behind a floating rainbow button (bottom-RIGHT of the Menu).
  const fab = $('menuSuggestFab');
  ok('v69: the Suggestions FAB is shown when the menu has insights', !!fab && fab.hidden === false);
  ok('v69: the rainbow button carries a gradient logo + an accessible label', !!$('menuSuggestBtn') && !!$('menuSuggestBtn').querySelector('svg linearGradient') && $('menuSuggestBtn').getAttribute('aria-label') === 'Menu suggestions');
  ok('v69: the panel starts closed until the button is tapped', $('menuSuggestPanel') && $('menuSuggestPanel').hidden === true);
  $('menuSuggestBtn').click();
  ok('v69: tapping the button opens the panel (aria-expanded flips)', $('menuSuggestPanel').hidden === false && fab.classList.contains('open') && $('menuSuggestBtn').getAttribute('aria-expanded') === 'true');
  ok('v69: focus moves into the panel on open (a11y — never left on hidden content)', window.document.activeElement === $('menuSuggestPanel'));
  ok('v69: the panel holds the same insight content (mi-lines) + the credit', $('menuSuggestPanel').querySelectorAll('.mi-line').length === 2 && !!$('menuSuggestPanel').querySelector('.mi-credit'));
  $('menuSuggestClose').click();
  ok('v69: the × closes the panel', $('menuSuggestPanel').hidden === true && $('menuSuggestBtn').getAttribute('aria-expanded') === 'false');
  ok('v69: focus returns to the trigger button on close (a11y)', window.document.activeElement === $('menuSuggestBtn'));
  // v71 item 6: the button is dismissable (→ slim restore tab) and recallable; the state persists globally.
  window.localStorage.removeItem('cafeDB_suggestFabHidden');
  window.suggestFabDismiss();
  ok('v71: dismissing swaps the button for the restore edge tab', fab.classList.contains('dismissed') && !!$('menuSuggestRestore'));
  ok('v71: the dismissed state persists to localStorage (survives reload)', window.localStorage.getItem('cafeDB_suggestFabHidden') === '1');
  window.renderMenuInsights();
  ok('v71: a re-render keeps it dismissed (global, not reset per menu switch)', fab.hidden === false && fab.classList.contains('dismissed'));
  $('menuSuggestRestore').click();
  ok('v71: the restore tab brings the button straight back and clears the flag', !fab.classList.contains('dismissed') && window.localStorage.getItem('cafeDB_suggestFabHidden') === '0');
  window.computeInsights = () => [];
  try { window.renderMenuInsights(); } catch (e) {}
  ok('v69: a menu with nothing to say hides the whole FAB', fab.hidden === true);
  window.computeInsights = stashCI;

  // ---- [17] v68 — Menu margin-light filter chips (multi-select) wire up + fold into Clear filters ----
  console.log('\n[17] v68 — Menu margin-light filter chips');
  const chip = (l) => window.document.querySelector('.mlf-chip[data-light="' + l + '"]');
  const pressed = (l) => chip(l) && chip(l).getAttribute('aria-pressed') === 'true';
  ok('three light chips render in the Menu controls', ['green', 'amber', 'red'].every((l) => !!chip(l)));
  chip('red').click();
  ok('tapping Reprice activates red only', pressed('red') && !pressed('amber') && !pressed('green'));
  chip('amber').click();
  ok('tapping Watch too activates amber+red (everything needing attention)', pressed('red') && pressed('amber') && !pressed('green'));
  chip('red').click();
  ok('tapping Reprice again clears red, leaving amber', pressed('amber') && !pressed('red'));
  window.clearMenuFilters();
  ok('Clear filters resets every light chip', ['green', 'amber', 'red'].every((l) => !pressed(l)));

  // ---- [18] v72 — modal reverse-out wiring (close animates but .open drops synchronously) ----
  console.log('\n[18] v72 — modal close-out animation');
  const mm2 = $('menuModal');
  window.show('menuModal');
  ok('opening adds .open and clears aria-hidden', mm2.classList.contains('open') && mm2.getAttribute('aria-hidden') === 'false');
  window.hide('menuModal');
  ok('closing drops .open synchronously (every .open check stays honest)', !mm2.classList.contains('open'));
  ok('closing marks the modal closed for a11y at once', mm2.getAttribute('aria-hidden') === 'true');
  ok('closing adds .closing so CSS can run the fade-out', mm2.classList.contains('closing'));
  window.show('menuModal');
  ok('reopening cancels the pending close (.closing cleared, .open back)', mm2.classList.contains('open') && !mm2.classList.contains('closing'));
  window.hide('menuModal');

  console.log('\n' + (failures ? `smoke: ${failures} FAILURE(S)\n` : 'smoke: all checks passed\n'));
  process.exit(failures ? 1 : 0);
})();
