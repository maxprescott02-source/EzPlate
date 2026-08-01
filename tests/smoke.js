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

/* v106: seed the two datasets the export learned to carry, BEFORE app.js runs. This is the
   cold-boot case the brief asked for and the only one that proves anything: with no SUPA_URL
   bootstrapSync never fires, so what buildBackup captures below is what a device holds having
   loaded from localStorage and synced NOTHING. If either var were hydrated lazily or post-sync,
   these come back empty and the file would look complete while being empty. The supplier name
   is deliberately one no fixture uses, so seeding can't perturb the invoice sections. */
window.localStorage.setItem('cafeDB_ingPriceLog', JSON.stringify({ P0001: [{ t: 1750000000000, v: 0.0241 }, { t: 1751000000000, v: 0.02478 }] }));
window.localStorage.setItem('cafeDB_supplierMem', JSON.stringify({ SMOKE1: { id: 'SMOKE1', supplier: 'ZZ Smoke Supplier', phrase_norm: 'smoke test phrase', qty: 2.5, unit: 'kg' } }));
/* v108: the products this file exercises used to come from the BASE_PRODUCTS literal inside app.js.
   That literal is deleted — the catalogue lives in the `ingredients` table now — so the 393 rows moved
   here, to tests/fixtures/base-products.json, and are seeded as the local product cache.
   This is the RIGHT place for them: smoke.js tests DOM wiring and rendering, not catalogue accuracy,
   and it deliberately runs with no SUPA_URL so bootstrapSync never fires. Without a seed there would be
   no products at all and two thirds of the sections below would be asserting against an empty app.
   The fixture is a snapshot taken at the moment of deletion; it does not need to track production,
   because nothing here checks a price against the real world. */
window.localStorage.setItem('cafeDB_overrides',
  require('fs').readFileSync(require('path').join(__dirname, 'fixtures', 'base-products.json'), 'utf8'));

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

console.log('\n[3b] v81 — Settings sectioned surface (sidebar / drill-down + AI toggles + theme)');
const setPanel = window.document.querySelector('#settingsPanel .settings-panel');
const navItem = g => window.document.querySelector(`.set-navitem[data-goto="${g}"]`);
$('settingsBtn').click();
ok('opens on the General section', $('setSec-general') && !$('setSec-general').hidden && $('setSec-invoices').hidden);
ok('General nav item is current on open', navItem('general').getAttribute('aria-current') === 'page');
ok('seven section nav items', window.document.querySelectorAll('#settingsPanel .set-navitem').length === 7);
navItem('invoices').click();
ok('tapping a section drills in (detail-open) and swaps the content', setPanel.classList.contains('detail-open') && !$('setSec-invoices').hidden && $('setSec-general').hidden);
ok('the drilled-into section is marked current', navItem('invoices').getAttribute('aria-current') === 'page');
$('settingsBack').click();
ok('back arrow returns to the list (detail-open cleared)', !setPanel.classList.contains('detail-open'));
ok('AI invoice check prefills from state (ON by default)', $('setAiInvoiceChk').checked === window.aiInvoiceCheck && window.aiInvoiceCheck === true);
ok('AI suggestions prefills from state (ON by default)', $('setAiSuggestChk').checked === window.aiSuggestions && window.aiSuggestions === true);
$('setAiInvoiceChk').checked = false; $('setAiInvoiceChk').dispatchEvent(new window.Event('change'));
ok('turning AI invoice check off flips the flag + mirrors it', window.aiInvoiceCheck === false && window.localStorage.getItem('cafeDB_aiInvoiceCheck') === '0');
$('setAiInvoiceChk').checked = true; $('setAiInvoiceChk').dispatchEvent(new window.Event('change'));   // restore ON
$('setAiSuggestChk').checked = false; $('setAiSuggestChk').dispatchEvent(new window.Event('change'));
ok('turning AI suggestions off removes the Dashboard insights panel', !window.document.querySelector('#dashBody .dash-ins') && window.aiSuggestions === false);
$('setAiSuggestChk').checked = true; $('setAiSuggestChk').dispatchEvent(new window.Event('change'));   // restore ON
window.document.querySelector('.seg-btn[data-theme-pref="dark"]').click();
ok('choosing Dark forces data-theme + writes the header toggle key', window.document.documentElement.getAttribute('data-theme') === 'dark' && window.localStorage.getItem('cafeCost_theme') === 'dark');
ok('the Dark segment reads selected', window.document.querySelector('.seg-btn[data-theme-pref="dark"]').getAttribute('aria-checked') === 'true');
window.document.querySelector('.seg-btn[data-theme-pref="system"]').click();
ok('choosing System clears the forced theme (falls back to the OS)', !window.document.documentElement.getAttribute('data-theme') && !window.localStorage.getItem('cafeCost_theme'));
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
ok('backup has all seven groups', ['products','kitchen_ingredients','plates','menu_items','ing_price_log','supplier_mem','settings'].every(k => k in backup));
// v106: present-but-empty is the failure this batch exists to prevent, so assert POPULATED, not just present
ok('cold boot: ing_price_log is populated (no sync ran)', !!(backup.ing_price_log && backup.ing_price_log.P0001 && backup.ing_price_log.P0001.length === 2), JSON.stringify(backup.ing_price_log));
ok('cold boot: supplier_mem is populated (no sync ran)', !!(backup.supplier_mem && backup.supplier_mem.SMOKE1 && backup.supplier_mem.SMOKE1.phrase_norm === 'smoke test phrase'), JSON.stringify(backup.supplier_mem));
/* v108 (D2): the export is a COMPLETE SNAPSHOT, so the two base_products_* fields are gone with the
   literal they fingerprinted. Asserting they are ABSENT rather than null is the point — a null hash
   compares equal to a null hash, which would read as a matching build. */
ok('stamp declares format 2 and names the build', !!(backup.stamp && backup.stamp.format === 2 && backup.stamp.app_version === swVer), JSON.stringify(backup.stamp));
ok('the retired fingerprint fields are absent, not null',
   !('base_products_hash' in backup.stamp) && !('base_products_count' in backup.stamp), JSON.stringify(backup.stamp));
ok('cold boot: products come from the local cache, not a literal', Object.keys(backup.products || {}).length === 393, String(Object.keys(backup.products || {}).length));
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
ok('the Ingredient name field is a combobox, not free text', !!$('ni_kingDrop0'));
ok('v55 §F2: the Ingredient name field starts BLANK (no silent repoint prefill)', ($('ni_king0').value || '') === '', $('ni_king0').value);
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

// tapping the card opens the action chooser -> Add to a menu (v82 wording; opens the v55 many-to-many manager)
libCard.click();
ok('tapping a card opens the action popup', $('plateActionsModal').classList.contains('open'));
ok('the card offers "Add to a menu"', $('paPublish').textContent === 'Add to a menu', $('paPublish').textContent);
$('paPublish').click();
ok('Add to a menu opens the manage-menus modal', $('manageMenusModal').classList.contains('open'));
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

  // (c) v90 — insights live INLINE on the DASHBOARD, scoped by its selector. The Menu tab has no
  // suggestions UI at all any more: no pill, no panel, no host element. Templates render immediately;
  // a valid rephrasing swaps in place and only THEN is the "Refined by Gemini" credit revealed.
  const stashCI = window.computeInsights;
  window.computeInsights = () => ([
    { kind: 'costbase', facts: { pts: 1.2, ingPct: 18, plates: 5 },
      text: 'Your average food cost is 1.2 pts higher than at April prices — Beef, up 18% across 5 plates, is most of it.' },
    { kind: 'nearcluster', facts: { count: 3, targetPct: 30 },
      text: '3 plates sit within half a point of your 30% target.' }
  ]);
  pending = [];
  window.showTab('dashboard');
  let dashThrew = null; try { window.renderDashboard(); } catch (e) { dashThrew = e; }
  ok('v90: the Dashboard renders with the insights panel without throwing', !dashThrew, dashThrew && dashThrew.message);
  const di = $('dashInsBody');
  ok('v90: the insights block renders on the DASHBOARD', !!di);
  ok('v90: it is INLINE in the dashboard flow, not a floating layer', !!di && !!di.closest('#dashBody') && !di.closest('[role="dialog"]'));
  ok('v90: the deterministic templates render immediately (no input box, no chat)',
    di && di.querySelectorAll('.ins-line').length === 2 && !di.querySelector('input,textarea'));
  ok('v90: the heading reads "What needs attention"',
    !!window.document.querySelector('#dashBody .dash-ins h2') && /What needs attention/.test(window.document.querySelector('#dashBody .dash-ins h2').textContent));
  // both halves of the AI marker: the sparkle always, the credit only when earned
  const spark = window.document.querySelector('#dashBody .dash-ins h2 svg.ins-spark');
  ok('v90: the gradient sparkle sits beside the heading (the app\'s only Gemini identity marker)', !!spark);
  ok('v90: the sparkle references the shared gradient def, it does not redeclare one in re-rendered markup',
    !!spark && /url\(#ezSparkGrad\)/.test(spark.innerHTML) && !spark.querySelector('linearGradient'));
  ok('v90: the sparkle gradient is defined EXACTLY once in the document (no duplicate ids from re-renders)',
    window.document.querySelectorAll('#ezSparkGrad').length === 1);
  ok('v90: the "Refined by Gemini" credit is present but HIDDEN while the template shows (honest attribution)',
    di && di.querySelector('.ins-credit') && di.querySelector('.ins-credit').hidden === true);
  ok('v90: the template numbers show verbatim', di && /1\.2 pts higher/.test(di.textContent) && /18%/.test(di.textContent));
  ok('v90: a single phrasing call is posted to /api/insight', pending.filter(p => /\/api\/insight/.test(p.url)).length === 1);
  // v90 quota guard: the Dashboard re-renders on every scope change and every drill-down open, and each
  // of those used to fire a SECOND identical POST while the first was still in flight.
  window.renderDashboard();
  ok('v90: a re-render while the call is still IN FLIGHT does not fire a duplicate (quota guard)',
    pending.filter(p => /\/api\/insight/.test(p.url)).length === 1);
  const ip = pending.find(p => /\/api\/insight/.test(p.url));
  if (ip) ip.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok', lines: [
    { text: 'Beef is up 18% across 5 plates — that is 1.2 pts on your average.' },
    { text: '3 plates sit within half a point of your 30% target.' } ] }) });
  await tick(); await tick();
  // re-query: the quota-guard re-render above replaced the panel, and applyPhrasedInsights resolves
  // #dashInsBody fresh at apply time precisely so it lands on the LIVE node, not a detached one.
  const dl = $('dashInsBody');
  ok('v90: a valid rephrasing (numbers intact) swaps into the block in place', dl && /Beef is up 18% across 5 plates/.test(dl.textContent));
  ok('v90: once Gemini actually phrased a shown line, the credit is revealed',
    dl && dl.querySelector('.ins-credit') && dl.querySelector('.ins-credit').hidden === false);
  // v69 cache: a re-render within the period must not hit Gemini again (the quota is limited)
  const fetchesBefore = pending.filter((p) => /\/api\/insight/.test(p.url)).length;
  window.renderDashboard();
  const dj = $('dashInsBody');
  ok('v90: a re-render within the period reuses the cache — no second Gemini call',
    pending.filter((p) => /\/api\/insight/.test(p.url)).length === fetchesBefore);
  ok('v90: the cached phrasing (and its credit) apply immediately on the cache hit',
    dj && /Beef is up 18%/.test(dj.textContent) && dj.querySelector('.ins-credit') && dj.querySelector('.ins-credit').hidden === false);

  // the Menu tab is CLEAN — the whole v69–v81 suggestions surface is gone, not merely hidden
  ok('v90: the Menu tab has NO suggestions pill, panel or host left behind',
    !$('menuSuggestFab') && !$('menuSuggestBtn') && !$('menuSuggestPanel') && !$('menuSuggestClose') && !$('menuInsights'));
  ok('v90: no .msug markup survives anywhere in the document', !window.document.querySelector('.msug,.msug-pill,.msug-panel'));
  ok('v90: the open/close/toggle/swipe API is gone from the global scope',
    ['renderMenuInsights','menuSuggestOpen','menuSuggestClose','menuSuggestToggle','suggestFabSwipeOff','suggestFabDismiss','suggestFabHidden']
      .every((k) => typeof window[k] === 'undefined'));
  ok('v90: the old .mi-line/.mi-credit insight markup is not rendered anywhere',
    !window.document.querySelector('.mi-line,.mi-credit,.mi-intro,.menu-insights'));

  // (d) v90 — the "Dig in" drill-downs replace the three highlight cards and #hlModal
  ok('v90: the Dig in grid renders four cards', window.document.querySelectorAll('#dashBody .dig-card').length === 4);
  ok('v90: the old highlight cards and their modal are gone entirely',
    !window.document.querySelector('.hl-row,.hl-card') && !$('hlModal') && !$('hlTitle') && !$('hlBody') && typeof window.openHighlight === 'undefined');
  const firstCard = window.document.querySelector('#dashBody .dig-card');
  firstCard.click();
  ok('v90: tapping a card replaces the grid with its full list (no modal opens)',
    !window.document.querySelector('#dashBody .dig-card') && !!window.document.querySelector('#dashBody .dig-list, #dashBody .empty-state')
    && !window.document.querySelector('.modal-overlay.open'));
  ok('v90: the detail view offers a back arrow', !!$('digBack'));
  $('digBack').click();
  ok('v90: back returns to the grid', window.document.querySelectorAll('#dashBody .dig-card').length === 4 && !window.document.querySelector('#dashBody .dig-list'));

  window.computeInsights = () => [];
  let emptyThrew = null; try { window.renderDashboard(); } catch (e) { emptyThrew = e; }
  ok('v90: rendering with no insights does not throw', !emptyThrew, emptyThrew && emptyThrew.message);
  ok('v90: a scope with nothing to say drops the insights panel (the verdict header already explains it)',
    !window.document.querySelector('#dashBody .dash-ins'));
  window.computeInsights = stashCI;
  window.showTab('analysis');

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

  // ---- [19] v73 — Gemini prefills the add-new-item form's descriptive fields cleanly ----
  console.log('\n[19] v73 — clean AI prefill for the new-item form');
  const niRow = () => ({
    name: 'CTN 140201 #MUFFINS ENGLISH TIP TOP 6x400gr', raw: 'CTN 140201 #MUFFINS ENGLISH TIP TOP 6x400gr',
    bestId: null, addNew: false, unitPrice: 1.2, unit: 'ea', conf: 0.1, tier: 'lo', cands: [],
    needManual: false, unitMismatch: false, uncertain: false, remembered: false, newItem: null
  });
  const niAiLine = (over) => Object.assign({
    rawText: 'CTN 140201 #MUFFINS ENGLISH TIP TOP 6x400gr', description: 'Muffins',
    derivedUnitPrice: 1.2, unitType: 'ea', cleanName: 'English Muffins', brand: 'Tip Top',
    category: 'Bakery', supplier: null
  }, over || {});
  const openNew = () => window.document.querySelector('#invReview tr.inv-data[data-i="0"] .ni-add-btn').click();
  const niMark = (id) => { const c = $(id) && $(id).closest('.ni-f').querySelector('.ni-af'); return c ? c.textContent : ''; };

  // (a) full clean prefill + AI-suggested marks; the mis-grabbed parser supplier is corrected
  window.invSupplier = 'Document No:';   // the parser's WRONG header supplier
  window.invRows = [niRow()]; window.gemApplied = false;
  window.gemApplyReadings({ status: 'ok', supplier: 'Bidfood', lines: [niAiLine()] });
  ok('v73: aiClean is stashed on the row for the form to read', !!(window.invRows[0].aiClean && window.invRows[0].aiClean.name === 'English Muffins'));
  openNew();
  ok('v73: Name prefills the CLEAN name, not the raw code string', $('ni_name0').value === 'English Muffins', $('ni_name0').value);
  ok('v73: Brand prefills from the AI', $('ni_brand0').value === 'Tip Top', $('ni_brand0').value);
  ok('v73: Category prefills from the AI', $('ni_cat0').value === 'Bakery', $('ni_cat0').value);
  ok('v73: Supplier prefills the AI/header supplier, NOT the parser mis-grab', $('ni_sup0').value === 'Bidfood', $('ni_sup0').value);
  ok('v73: the AI-filled Name carries the "AI suggested" mark', /AI suggested/.test(niMark('ni_name0')) && $('ni_name0').classList.contains('af'));
  ok('v73: the AI-filled Brand carries the "AI suggested" mark', /AI suggested/.test(niMark('ni_brand0')) && $('ni_brand0').classList.contains('af'));
  ok('v73: the AI category is AUTO-CONFIRMED so Confirm All accepts it', !!(window.niCombos['ni_cat0'] && window.niCombos['ni_cat0'].confirmed === true));

  // (b) fall back cleanly when the AI has nothing for a field
  window.invSupplier = '';
  window.invRows = [niRow()]; window.gemApplied = false;
  window.gemApplyReadings({ status: 'ok', supplier: null, lines: [niAiLine({ cleanName: null, brand: null, category: null })] });
  openNew();
  ok('v73: no cleanName → Name falls back to the raw parsed name (auto-filled)', $('ni_name0').value === niRow().name && /auto-filled/.test(niMark('ni_name0')));
  ok('v73: no AI brand → Brand blank, no chip', $('ni_brand0').value === '' && !$('ni_brand0').classList.contains('af'));
  ok('v73: no AI category → Category blank, no chip (deterministic fall-back)', $('ni_cat0').value === '' && !$('ni_cat0').classList.contains('af'));

  // (c) offline / no reader response → aiClean never set → form is byte-for-byte today's deterministic prefill
  window.invRows = [niRow()]; window.gemApplied = false; window.renderInvReview();
  openNew();
  ok('v73: offline (no aiClean) → Name is the deterministic parsed name, exactly as today', $('ni_name0').value === niRow().name);
  ok('v73: offline → Brand blank, no chip (identical to pre-v73)', $('ni_brand0').value === '' && !$('ni_brand0').classList.contains('af'));

  // (d) late-response upgrade: form opened BEFORE the reader returns → deterministic; when AI lands,
  //     an untouched field upgrades but a user-EDITED field is never overwritten (human ruling is final)
  window.invRows = [niRow()]; window.gemApplied = false; window.renderInvReview();
  openNew();
  ok('v73 late: form opens deterministically before the reader returns', $('ni_name0').value === niRow().name && $('ni_brand0').value === '');
  $('ni_name0').value = 'My Muffins';
  $('ni_name0').dispatchEvent(new window.Event('input'));   // the user edits Name; leaves Brand untouched
  window.gemApplyReadings({ status: 'ok', supplier: 'Bidfood', lines: [niAiLine()] });   // the AI response lands
  ok('v73 late: a user-EDITED field is NEVER overwritten by the late AI value', $('ni_name0').value === 'My Muffins', $('ni_name0').value);
  ok('v73 late: an UNtouched field upgrades to the AI value', $('ni_brand0').value === 'Tip Top', $('ni_brand0').value);

  console.log('\n[20] v83 — new-user friction (margin preview · draft · sticky Save · no product-card creation path)');
  window.showTab('ingredients');
  $('ingSearch').value = ''; if ($('ingCatFilter')) $('ingCatFilter').value = ''; if ($('ingSupFilter')) $('ingSupFilter').value = '';
  window.renderIngredients();
  // v83: the v82 product-card "bridge" was REMOVED (mis-specified — a create-kitchen-word affordance does
  // not belong on the product card, and "recipes" is not one of the app's nouns). Pinned so it can't return
  // by accident: a product card is the plain .ing-card button, nothing else.
  const pcard = window.document.querySelector('#ingList .ing-card');
  ok('[20] a product card is a plain .ing-card button (no wrapper, no strip)',
     !!pcard && pcard.parentElement.id === 'ingList');
  ok('[20] NO create-ingredient affordance on any product card',
     !window.document.querySelector('#ingList .prod-card, #ingList .prod-bridge, #ingList .prod-userecipes, #ingList .prod-inrecipes'));
  ok('[20] no "recipes" wording in the product list', !/recipes/i.test($('ingList').textContent), $('ingList').textContent.slice(0, 120));

  ok('[20] the Add-to-menu dialog has a live margin preview slot', !!$('mi_preview'));
  ok('[20] menuMarginPreview reuses analyze (same light — cannot disagree with the Menu row)',
     window.menuMarginPreview(0.15, 5).light === window.analyze(0.15, 5).light);

  window.clearPlateDraft();
  ok('[20] draft helpers exist and clear cleanly',
     typeof window.savePlateDraft === 'function' && typeof window.offerPlateDraftResume === 'function' && !window.localStorage.getItem('cafeDB_plateDraft'));

  ok('[20] Save is pinned in a builder footer (reachable without scrolling)',
     !!window.document.querySelector('#builderModal .builder-foot #saveBtn'));

  // v83 item 7 — the builder search dead end, wired end to end.
  window.openBuilderNew();
  $('q').value = 'dressing';
  $('q').dispatchEvent(new window.Event('input'));
  ok('[20] a no-match search opens an informative message naming the term',
     $('drop').classList.contains('open') && /No ingredient called .dressing. yet/.test($('drop').textContent),
     $('drop').textContent);
  ok('[20] no creation affordance in the builder search (v59 removal holds)',
     !window.document.querySelector('#drop .opt-create, #drop [data-create]'));
  ok('[20] an EMPTY plate offers no action (nothing to lose)', !window.document.querySelector('#drop .nomatch-go'));

  // now there IS work worth preserving. (addKitchenLine clears the search box, so re-type the term —
  // in the real flow the user has lines first and types the missing ingredient second.)
  window.addKitchenLine(window.kitchenIngredients[0].id);
  const retype = () => { $('q').value = 'dressing'; $('q').dispatchEvent(new window.Event('input')); };
  retype();
  const goBtn = window.document.querySelector('#drop .nomatch-go');
  ok('[20] with lines on the plate, ONE action appears', !!goBtn && /Save plate/.test(goBtn.textContent));
  ok('[20] the message reassures the plate is kept', /waiting in Plates/.test($('drop').textContent));
  ok('[20] still exactly ONE action (no forms, no inline creation)',
     window.document.querySelectorAll('#drop button').length === 1);

  goBtn.click();                                                 // unnamed plate: the save must be REFUSED, not navigated past
  ok('[20] a nameless plate is refused and the builder stays open (work not abandoned)',
     $('builderModal').classList.contains('open') && $('plateNameErr').style.display === 'block');

  $('plateName').value = 'Chef Salad';
  // v60: save needs a real quantity on every line. jsdom runs 'outside-only', so the qty box's inline
  // oninput never fires — call the wired handler with the line's own (numeric) uid, as the markup does.
  window.setQty(Number(window.document.querySelector('#lines .line').getAttribute('data-uid')), 2);
  retype();
  window.document.querySelector('#drop .nomatch-go').click();
  ok('[20] …the builder closes and lands on the Ingredients tab',
     !$('builderModal').classList.contains('open') && $('tab-pantry').style.display !== 'none');
  window.showTab('builder');
  const savedCard = [...window.document.querySelectorAll('#plateList .ing-card')]
    .find(c => /Chef Salad/.test(c.textContent));
  ok('[20] …and the plate was SAVED to the library, not lost', !!savedCard,
     [...window.document.querySelectorAll('#plateList .ing-card')].map(c => c.textContent).join(' | '));

  // ---------------------------------------------------------------------------
  // [21] v83 — "resuming a plate doesn't work" (Max). This needs a FRESH boot with a
  // draft already in localStorage, i.e. a reload, so it gets its own window. Both
  // causes were load-order bugs that only appear when app.js runs top to bottom.
  // ---------------------------------------------------------------------------
  console.log('\n[21] v83 — an unfinished plate survives a reload and actually resumes');
  const bootWithDraft = (draft) => {
    const d2 = new JSDOM(html, { url: 'https://example.com/', pretendToBeVisual: true, runScripts: 'outside-only' });
    const w = d2.window;
    w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }));
    w.scrollTo = () => {};
    w.requestAnimationFrame = cb => setTimeout(cb, 0);
    Object.defineProperty(w.navigator, 'onLine', { value: true, configurable: true });
    w.URL.createObjectURL = () => 'blob:stub';
    w.URL.revokeObjectURL = () => {};
    if (draft) w.localStorage.setItem('cafeDB_plateDraft', JSON.stringify(draft));
    w.eval(appJs);
    return w;
  };
  const DRAFT = { lines: [{ uid: 1, kid: 'K1', qty: 3 }], name: 'Half-built Plate', cat: 'Breakfast', loadedPlateId: null, ts: Date.now() };
  const settle = () => new Promise(r => setTimeout(r, 400));   // longer than the 250ms draft debounce

  let w2 = bootWithDraft(DRAFT);
  ok('[21] a stored draft is offered on boot', w2.document.getElementById('confirmModal').classList.contains('open'));
  ok('[21] the offer names the plate and both choices',
     /Half-built Plate/.test(w2.document.getElementById('confirmMsg').textContent) &&
     w2.document.getElementById('confirmOk').textContent === 'Resume' &&
     w2.document.getElementById('confirmCancel').textContent === 'Discard');
  w2.document.getElementById('confirmOk').click();             // THE reported bug: this used to do nothing
  ok('[21] Resume opens the builder', w2.document.getElementById('builderModal').classList.contains('open'));
  ok('[21] Resume restores name, category and lines',
     w2.document.getElementById('plateName').value === 'Half-built Plate' &&
     w2.document.getElementById('plateCat').value === 'Breakfast' &&
     w2.document.querySelectorAll('#lines .line').length === 1,
     w2.document.getElementById('plateName').value + ' / ' + w2.document.getElementById('plateCat').value);
  w2.document.getElementById('plateName').value = 'Renamed After Resume';
  w2.document.getElementById('plateName').dispatchEvent(new w2.Event('input'));
  await settle();
  const reSaved = JSON.parse(w2.localStorage.getItem('cafeDB_plateDraft') || 'null');
  ok('[21] edits made after resuming persist again', !!reSaved && reSaved.name === 'Renamed After Resume',
     reSaved && reSaved.name);

  w2 = bootWithDraft(DRAFT);                                   // second cause: the boot render used to wipe the slot
  await settle();
  ok('[21] an untouched boot does NOT wipe the stored draft (a 2nd reload still offers it)',
     !!w2.localStorage.getItem('cafeDB_plateDraft'));

  w2 = bootWithDraft(DRAFT);
  w2.document.getElementById('confirmCancel').click();
  await settle();
  ok('[21] Discard really discards', !w2.localStorage.getItem('cafeDB_plateDraft'));

  w2 = bootWithDraft(DRAFT);
  w2.document.getElementById('confirmClose').click();          // a stray × must not throw the plate away
  await settle();
  ok('[21] dismissing the dialog KEEPS the draft', !!w2.localStorage.getItem('cafeDB_plateDraft'));

  w2 = bootWithDraft({ lines: [{ uid: 1, kid: 'K_GONE', qty: 2 }], name: 'Ghost Plate', cat: '', loadedPlateId: null, ts: Date.now() });
  w2.document.getElementById('confirmOk').click();
  ok('[21] a draft naming a deleted ingredient still resumes (degrades, never crashes)',
     w2.document.getElementById('builderModal').classList.contains('open') &&
     w2.document.getElementById('plateName').value === 'Ghost Plate');

  w2 = bootWithDraft(null);
  ok('[21] a clean boot offers nothing', !w2.document.getElementById('confirmModal').classList.contains('open'));

  // ---------------------------------------------------------------------------
  // [22] v85 — re-entering the builder must not bin unfinished work (Max's flow 3:
  // build, press ×, go make an ingredient, come back and tap "+ New plate").
  // ---------------------------------------------------------------------------
  console.log('\n[22] v85 — "+ New plate" / "Edit plate" no longer discard an in-progress plate');
  const buildThenClose = async (w, name) => {
    w.openBuilderNew();
    w.addMiscCost();                                    // a misc line needs no ingredient library
    w.document.getElementById('plateName').value = name;
    w.document.getElementById('plateName').dispatchEvent(new w.Event('input'));
    await settle();
    w.closeBuilder();                                   // the ×
  };

  let w3 = bootWithDraft(null);
  const $3 = id => w3.document.getElementById(id);
  await buildThenClose(w3, 'Half-built Plate');
  w3.showTab('pantry');                                 // "go make an ingredient"
  await new Promise(r => setTimeout(r, 30));
  w3.showTab('builder');
  w3.openBuilderNew();                                  // tap "+ New plate"
  ok('[22] "+ New plate" offers to resume the unfinished plate', $3('confirmModal').classList.contains('open'));
  ok('[22] the offer names it', /Half-built Plate/.test($3('confirmMsg').textContent), $3('confirmMsg').textContent);
  $3('confirmOk').click();
  ok('[22] Resume brings the work back',
     $3('builderModal').classList.contains('open') && $3('plateName').value === 'Half-built Plate' &&
     w3.document.querySelectorAll('#lines .line').length === 1);

  w3 = bootWithDraft(null);
  await buildThenClose(w3, 'Half-built Plate');
  w3.openBuilderNew();
  w3.document.getElementById('confirmCancel').click();  // Discard -> a genuinely new plate
  await settle();
  ok('[22] Discard gives a clean builder and clears the draft',
     w3.document.getElementById('builderModal').classList.contains('open') &&
     w3.document.getElementById('plateName').value === '' &&
     w3.document.querySelectorAll('#lines .line').length === 0 &&
     !w3.localStorage.getItem('cafeDB_plateDraft'));

  w3 = bootWithDraft(null);
  await buildThenClose(w3, 'Half-built Plate');
  w3.openBuilderNew();
  w3.document.getElementById('confirmClose').click();   // a stray dismiss decides nothing
  await settle();
  ok('[22] a stray dismiss keeps the unfinished plate', !!w3.localStorage.getItem('cafeDB_plateDraft'));

  // and it must NOT nag when there is nothing to protect
  w3 = bootWithDraft(null);
  w3.openBuilderNew();
  ok('[22] a clean builder opens straight away (no nag)',
     !w3.document.getElementById('confirmModal').classList.contains('open') &&
     w3.document.getElementById('builderModal').classList.contains('open'));
  w3.addMiscCost();
  w3.document.getElementById('plateName').value = 'Done Plate';
  w3.saveCurrentPlate(false);
  w3.closeBuilder();
  await settle();
  w3.openBuilderNew();
  ok('[22] after SAVING, "+ New plate" opens straight away (a saved plate is not unfinished)',
     !w3.document.getElementById('confirmModal').classList.contains('open') &&
     w3.document.getElementById('builderModal').classList.contains('open'));

  // ---------------------------------------------------------------------------
  // [23] v87 — the page behind a modal must not scroll (Max: "scrolling whilst having
  // modal open still scrolls the main page behind modal"). jsdom has no layout, so this
  // pins the STATE MACHINE: does the lock go on, survive a stacked confirm, come off, and
  // clean up after itself? The geometry itself was verified in a real browser.
  // ---------------------------------------------------------------------------
  console.log('\n[23] v87 — body scroll lock while an overlay is open');
  const wl = bootWithDraft(null);
  const body = wl.document.body;
  // jsdom reports pageYOffset as 0 and has no real scrollTo, so seed a scroll position and
  // capture the restore call — otherwise the offset/restore assertions pass trivially.
  Object.defineProperty(wl, 'pageYOffset', { value: 150, configurable: true });
  let restoredScroll = null;
  wl.scrollTo = (x, y) => { restoredScroll = [x, y]; };

  ok('[23] the page is not locked with nothing open', !body.classList.contains('scroll-locked'));

  wl.show('modal');
  ok('[23] opening a modal locks the page', body.classList.contains('scroll-locked'));
  ok('[23] the scroll offset is held on <body>', body.style.top === '-150px', body.style.top);

  // opening a SECOND overlay on top must not disturb the lock
  wl.show('confirmModal');
  ok('[23] a stacked confirm keeps the lock', body.classList.contains('scroll-locked'));

  // ...and closing only the confirm must NOT free the page underneath it
  wl.hide('confirmModal');
  ok('[23] closing the stacked confirm does NOT unlock (the modal is still open)',
     body.classList.contains('scroll-locked'));

  wl.hide('modal');
  ok('[23] closing the last overlay unlocks the page', !body.classList.contains('scroll-locked'));
  ok('[23] the original scroll position is restored (no jump on close)',
     !!restoredScroll && restoredScroll[0] === 0 && restoredScroll[1] === 150, restoredScroll);
  ok('[23] the inline top is cleaned up', body.style.top === '');
  ok('[23] the inline padding-right is cleaned up', body.style.paddingRight === '');

  // the lock is derived from the DOM, so a re-open after a full close still works
  wl.show('modal');
  ok('[23] re-opening locks again', body.classList.contains('scroll-locked'));
  wl.hide('modal');
  ok('[23] and releases again', !body.classList.contains('scroll-locked'));

  // ---------------------------------------------------------------------------
  // [24] v91 — the two price logs must not disagree. `logHistory` (priceHistory, the all-menus
  // average) fired on every data change, but `logIngPrice` (ingPriceLog, per product) was called
  // from ONE place: the invoice-confirm path. So a price edited by hand moved the comparison bar
  // and left the per-product log empty — which is why "Biggest movers" read "Nothing yet" while
  // the bar reported movement, and why insight family 1 had no history to reconstruct. Pinned
  // here because the fix is a WIRING fix: the pure engine cannot see it.
  // ---------------------------------------------------------------------------
  console.log('\n[24] v91 — a hand-edited price feeds BOTH logs, not just the average');
  // the MAIN window, because it is the one with kitchen ingredients seeded by the earlier sections
  const w4 = window;
  w4.openBuilderNew();
  if ($('confirmModal').classList.contains('open')) $('confirmCancel').click();   // discard any leftover draft
  const kw = w4.kitchenIngredients[0];
  const pid4 = w4.kById[kw.id].pid;
  w4.addKitchenLine(kw.id);
  const uid4 = Number(w4.document.querySelector('#lines .line').getAttribute('data-uid'));
  const logBefore = (w4.ingPriceLog[pid4] || []).length;
  // The expected value is derived, not guessed: the price chip renders the product's DISPLAY unit
  // (unitCostStr), and a per-kg/per-L product stores 1/1000 of what the box takes. `byId` is a
  // top-level `let` — a global lexical binding jsdom's per-call eval cannot reach — so the DOM is the
  // available source, and it is the same value the user is looking at. (CodeRabbit, v91.)
  const chipTxt = w4.document.getElementById(`pc-${uid4}`).textContent;
  const per1000 = /\/(kg|L)\b/.test(chipTxt);
  const expected4 = per1000 ? 7.77 / 1000 : 7.77;

  w4.commitPrice(uid4, '7.77');
  const logAfter = (w4.ingPriceLog[pid4] || []);
  ok('[24] editing a price in the builder logs a per-product price point',
     logAfter.length === logBefore + 1, `${logBefore} -> ${logAfter.length}`);
  const v4 = logAfter.length ? logAfter[logAfter.length - 1].v : null;
  ok(`[24] …at the committed price in base units (chip reads ${chipTxt.trim()})`,
     v4 != null && Math.abs(v4 - expected4) < 1e-9, `${v4} vs ${expected4}`);
  ok('[24] …and persists it, so a reload can still see the change',
     ((JSON.parse(w4.localStorage.getItem('cafeDB_ingPriceLog') || '{}')[pid4] || []).length) === logAfter.length,
     w4.localStorage.getItem('cafeDB_ingPriceLog'));

  // Re-committing the SAME price is a no-op — the log records changes, not keystrokes. Snapshot the
  // STORED log as well as the in-memory one: a guard that skips the push but still writes would leave
  // the array right and the write budget wrong, and only the stored copy shows it. (CodeRabbit, v91.)
  const steadyMem = JSON.stringify(w4.ingPriceLog[pid4] || []);
  const steadyLS = w4.localStorage.getItem('cafeDB_ingPriceLog');
  w4.commitPrice(uid4, '7.77');
  ok('[24] re-committing an unchanged price adds no point',
     JSON.stringify(w4.ingPriceLog[pid4] || []) === steadyMem, JSON.stringify(w4.ingPriceLog[pid4] || []));
  ok('[24] …and does not rewrite the stored log either',
     w4.localStorage.getItem('cafeDB_ingPriceLog') === steadyLS);

  // ------------------------------------------------------------------
  console.log('\n[25] v102 — builderHint empty-state survives the empty-plate early return (CodeRabbit)');
  // The hint update must run BEFORE renderPlate's empty-plate early return: a fresh install has
  // no ingredients AND an empty plate, and that user needs the add-first-ingredient link.
  const w5 = bootWithDraft(null);
  w5.document.getElementById('newPlateBtn').click();
  const bh5 = w5.document.getElementById('builderHint');
  ok('[25] fresh install (no ingredients, EMPTY plate): the add-first-ingredient link shows',
     bh5.style.display !== 'none' && !!w5.document.getElementById('bhGo'), bh5.outerHTML.slice(0, 120));
  w5.document.getElementById('bhGo').click();
  ok('[25] the link routes to the Ingredients tab', w5.document.getElementById('tab-pantry').style.display !== 'none');
  window.renderPlate();                                        // main window: ingredients ARE seeded
  ok('[25] with ingredients present the hint is hidden and empty (the v102 cull)',
     $('builderHint').style.display === 'none' && $('builderHint').textContent === '');

  console.log('\n' + (failures ? `smoke: ${failures} FAILURE(S)\n` : 'smoke: all checks passed\n'));
  process.exit(failures ? 1 : 0);
})();
