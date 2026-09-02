/*
 * publish-guard.test.js — v113.
 *
 * "One entry per (plate, menu)" was decided by `dishesOfPlate(sp).find(...)`, which resolves through
 * plateIdOf. A menu row with NO plate link is therefore invisible to it, so publishing the very plate
 * that row should have been using could not heal it — it silently added a SECOND row of the same name,
 * one costed and one not. That is how the v112 production orphan surfaced: Max published the plate to
 * test the delete flow, got two rows of "Cheese & Ham Toastie GF" in different sections, and reported a
 * publish bug that was not a publish bug.
 *
 * The enumeration behind v113 found TWO paths that create a menu row, not one — `submitMenuItem`
 * (Plates -> Publish) and `submitAddDish` (Menu tab -> Add existing plate) — carrying the identical
 * guard and the identical hole. Both now route through publishPlan, so the decision cannot drift
 * between them; the tests below pin the decision, and then pin that each path's OUTCOME matches it.
 *
 * The settled product decision this encodes: DETECT AND OFFER, never auto-heal, and never name-match.
 * Linking means guessing which row belongs to this plate, and the v112 repair needed the section, the
 * price and the price history in front of a human first.
 */
const test = require('node:test');
const assert = require('node:assert');
const { publishPlan, unlinkedDishesOn, plateIdOf } = require('./_extract');
const { loadApp, extractFn, extractVar } = require('./_extractfn');

const SRC = loadApp();

const ORPHAN = { id: 'ummrq8xbur', name: 'Cheese & Ham Toastie GF', section: 'Sandwiches', price: 8, menuId: 'MENU_ORIGINAL' };
const LINKED = { id: 'um1', name: 'Chips', section: 'Sides', price: 6, menuId: 'MENU_ORIGINAL', plateId: 'SP1' };
const OTHER_MENU = { id: 'um2', name: 'Soup', section: 'Mains', price: 9, menuId: 'MENU_WINTER' };

/* ---------------------------------------------------------------------------
   1. The decision.
   --------------------------------------------------------------------------- */

test('an unlinked row is found on its own menu, and only there', () => {
  const dishes = [LINKED, ORPHAN, OTHER_MENU];
  assert.deepEqual(unlinkedDishesOn(dishes, 'MENU_ORIGINAL').map(d => d.id), ['ummrq8xbur']);
  assert.deepEqual(unlinkedDishesOn(dishes, 'MENU_WINTER').map(d => d.id), ['um2']);
});

/* 184 REVERSED THIS TEST, and it is rewritten rather than deleted because the old contract was real
   and is worth being able to see. It read "a row with no menuId belongs to Original, matching every
   other resolver in the app" — true, because every resolver spelled `(m.menuId||'MENU_ORIGINAL')`.
   That fallback is gone: it named a menu row only Scoopy's has, so on any other cafe it silently
   attributed an unmenued dish to a menu that does not exist. A dish is on a menu or on none, and
   none is not a menu you can publish onto. Measured before changing it: 0 of 76 production rows
   have a null menu_id, so nothing real moves. */
test('184: a row with no menuId is on NO menu, so it is nobody’s unlinked row', () => {
  assert.deepEqual(unlinkedDishesOn([{ id: 'x', name: 'x' }], 'MENU_ORIGINAL').map(d => d.id), []);
  assert.deepEqual(unlinkedDishesOn([{ id: 'x', name: 'x' }], 'MENU_WINTER').map(d => d.id), []);
});

test('the legacy sourcePlateId link counts as linked — plateIdOf is the only resolver', () => {
  const legacy = { id: 'um9', name: 'Legacy', menuId: 'MENU_ORIGINAL', sourcePlateId: 'SP9' };
  assert.equal(plateIdOf(legacy), 'SP9');
  assert.deepEqual(unlinkedDishesOn([legacy], 'MENU_ORIGINAL'), [], 'a legacy-linked row is not an orphan');
});

test('publishing onto a clean menu asks nothing and creates — the normal case, and production today', () => {
  const plan = publishPlan([LINKED], 'SP_NEW', 'MENU_ORIGINAL');
  assert.equal(plan.action, 'create');
  assert.deepEqual(plan.unlinked, [], 'the user must see nothing when there is nothing to warn about');
});

test('publishing onto a menu holding an unlinked row surfaces the choice', () => {
  const plan = publishPlan([LINKED, ORPHAN], 'SP_NEW', 'MENU_ORIGINAL');
  assert.equal(plan.action, 'create');
  assert.deepEqual(plan.unlinked.map(d => d.id), ['ummrq8xbur']);
});

test('re-publishing a plate already on that menu still UPDATES, and asks nothing', () => {
  // Updating an existing entry duplicates nothing, so there is no question to put to the user even
  // though an unlinked row is sitting right there.
  const plan = publishPlan([LINKED, ORPHAN], 'SP1', 'MENU_ORIGINAL');
  assert.equal(plan.action, 'update');
  assert.equal(plan.existingId, 'um1');
  assert.deepEqual(plan.unlinked, []);
});

test('a null plate id can never match an unlinked row\'s null link', () => {
  // plateIdOf(orphan) is null, so a bare `plateIdOf(d)===plateId` comparison would read the orphan as
  // "this plate is already on the menu" and silently update it — an auto-heal by accident, which is
  // exactly what was decided against.
  const plan = publishPlan([ORPHAN], null, 'MENU_ORIGINAL');
  assert.equal(plan.action, 'create');
  assert.equal(plan.existingId, null);
  assert.deepEqual(plan.unlinked.map(d => d.id), ['ummrq8xbur'],
    'but the row is still surfaced — the Add-existing-plate modal asks before a plate has been picked');
});

test('an unlinked row on a DIFFERENT menu is not this menu\'s problem', () => {
  const plan = publishPlan([ORPHAN], 'SP_NEW', 'MENU_WINTER');
  assert.deepEqual(plan.unlinked, []);
});

/* ---------------------------------------------------------------------------
   2. Both creating paths obey it.
   --------------------------------------------------------------------------- */

function makeHarness(opts) {
  opts = opts || {};
  const S = {
    customMenu: JSON.parse(JSON.stringify(opts.customMenu || [])),
    savedPlates: opts.savedPlates || [{ id: 'SP_NEW', name: 'Toastie', category: 'Sandwiches', lines: [] }],
    writes: [], toasts: [], errs: [], closed: 0, boxes: {},
    byId: opts.byId || {},
  };
  // eslint-disable-next-line no-new-func
  const factory = new Function('S', 'opts', `
    "use strict";
    var customMenu=S.customMenu, savedPlates=S.savedPlates, MENU=[], menuById={};
    var currentMenuId='MENU_ORIGINAL', adSelectedPlateId=(opts.selected===undefined?'SP_NEW':opts.selected);
    function rebuildMenu(){ MENU=customMenu.map(function(m){return Object.assign({},m);}); menuById={}; MENU.forEach(function(m){menuById[m.id]=m;}); }
    function dbPushMenuAfterPlate(item, sp){ S.writes.push({item:item, plate:sp.id}); return Promise.resolve({}); }
    function buildMenuOptions(){} function logHistory(){} function renderAnalysis(){} function renderPlatesTab(){}
    /* v114: the change log rides these paths too. Stubbed here — this file pins publishing/deleting
       behaviour, and tests/change-log.test.js owns the log's own contract. */
    function computeAvgFoodCost(){ return 30; }
    function costFromLines(){ return 0; }
    /* 228: the link toast is a DECISION now, so it is extracted rather than stubbed — a test that
       asserts what the user is told must run the code that decides it. It brings the real costing
       chain with it, which is the point: the message's whole claim is about whether this plate can
       be costed, and a stubbed plateFullyCosted would agree with whatever the code believed. */
    var kById={}, byId=S.byId||{};
    ${extractFn(SRC, 'cpbu')}
    ${extractFn(SRC, 'lineProduct')}
    ${extractFn(SRC, 'lineCost')}
    ${extractFn(SRC, 'costDetail')}
    ${extractFn(SRC, 'plateFullyCosted')}
    ${extractFn(SRC, 'dishLinkedToast')}
    function logChange(){ return null; }
    function logChangeIfSaved(){ return Promise.resolve(null); }
    function buildMenuSelector(){} function renderManageMenus(){ S.manageRerendered=true; }
    function setCurrentMenuId(id){ currentMenuId=id; S.currentMenu=id; }
    function renderDishPicker(){} function show(){} function buildMenuPickers(){}
    function closeAddDishModal(){ S.closed++; }
    function toast(m){ S.toasts.push(m); }
    function menuNameById(){ return 'Original menu'; }
    /* the app's OWN escaper and formatter — a passthrough stub would hide a real escaping bug in copy
       that interpolates a user-typed name */
    /* 173: uid() is a shared dependency of every id-minting path below. Extracted, not stubbed:
       a hand-rolled counter here would agree with a broken generator and hide exactly the
       collision it exists to prevent (CLAUDE.md, "a stub that mirrors a real function must
       mirror its CONTRACT"). No backticks in this comment - it sits inside a template literal. */
    ${extractVar(SRC, '_uidSeq')}
    ${extractFn(SRC, 'uidRandom')}
    ${extractFn(SRC, 'uid')}
    ${extractFn(SRC, 'esc')}
    ${extractFn(SRC, 'fmt2')}
    /* Element stubs. querySelectorAll returns a stand-in per rendered .up-link, built from the html the
       renderer just wrote, so the REAL wiring runs: renderer -> onclick -> onLink -> linkDishToPlate.
       Returning [] here would leave the one action a user actually performs untested. */
    var els={};
    function el(id){
      if(!els[id]) els[id]={ id:id, value:'', textContent:'', innerHTML:'', style:{display:''},
        classList:{ contains:function(){ return false; } },   /* no modal is "open" in the harness */
        querySelectorAll:function(sel){
          if(sel!=='.up-link') return [];
          var out=[], re=/class="btn small up-link" type="button" data-n="(\\d+)"/g, m;
          while((m=re.exec(this.innerHTML))!==null){
            (function(n){ out.push({ getAttribute:function(a){ return a==='data-n'?n:null; }, onclick:null }); })(m[1]);
          }
          this._links=out; return out;
        } };
      return els[id];
    }
    var document={ getElementById:function(id){ return el(id); } };
    ${extractFn(SRC, 'menuIdOf')}
    ${extractFn(SRC, 'dishOnMenu')}
    ${extractFn(SRC, 'plateIdOf')}
    ${extractFn(SRC, 'unlinkedDishesOn')}
    ${extractFn(SRC, 'publishPlan')}
    ${extractFn(SRC, 'renderUnlinkedPrompt')}
    ${extractFn(SRC, 'renderAddDishUnlinked')}
    ${extractFn(SRC, 'linkDishToPlate')}
    ${extractFn(SRC, 'openAddDishModal')}
    ${extractFn(SRC, 'submitAddDish')}
    rebuildMenu();
    return {
      addDish: function(price){ el('ad_price').value=String(price); submitAddDish(); S.errs=[el('ad_err').textContent]; },
      openAdd: function(){ openAddDishModal(); },
      pick: function(pid){ adSelectedPlateId=pid; renderAddDishUnlinked(); },
      clickLink: function(n){ var b=el('ad_unlinked')._links[n]; b.onclick(); },   // the real button wiring
      link: function(dishId){
        var d=MENU.filter(function(x){return x.id===dishId;})[0];
        return linkDishToPlate(d, savedPlates[0]);
      },
      box: function(id){ return el(id); },
      menu: function(){ return MENU; },
      rows: function(){ return customMenu; }
    };
  `);
  return { S, h: factory(S, opts) };
}

test('choosing "new entry" on a menu with an unlinked row still produces exactly ONE new row', () => {
  const { S, h } = makeHarness({ customMenu: [ORPHAN] });
  h.addDish(12);
  assert.equal(S.customMenu.length, 2, 'the orphan stays and one new row is added — nothing is merged behind the user');
  assert.equal(S.writes.length, 1);
  const added = S.customMenu.filter(d => d.id !== ORPHAN.id);
  assert.equal(added.length, 1);
  assert.equal(added[0].plateId, 'SP_NEW');
  assert.equal(S.customMenu.filter(d => d.id === ORPHAN.id)[0].plateId, undefined, 'the orphan is untouched');
});

test('choosing "link" produces NO new row — it links the one that was already there', () => {
  const { S, h } = makeHarness({ customMenu: [ORPHAN] });
  const before = S.customMenu.length;
  h.link('ummrq8xbur');
  assert.equal(S.customMenu.length, before, 'linking must never add a row');
  assert.equal(S.customMenu[0].plateId, 'SP_NEW');
  assert.equal(plateIdOf(S.customMenu[0]), 'SP_NEW', 'and it must RESOLVE — a set field that does not resolve is the v110 trap');
});

test('linking keeps the row\'s own name, price and section — the app does not reprice it', () => {
  const { S, h } = makeHarness({ customMenu: [ORPHAN] });
  h.link('ummrq8xbur');
  const d = S.customMenu[0];
  assert.equal(d.name, 'Cheese & Ham Toastie GF');
  assert.equal(d.price, 8, 'it is already priced on this menu; silently repricing it would be the app deciding');
  assert.equal(d.section, 'Sandwiches');
  /* 228 — THIS ASSERTED "price is unchanged" AGAINST A PLATE WITH NO LINES, and the message was
     wrong rather than the test. The default fixture's SP_NEW is `lines: []`, so the app was telling
     the user an empty plate had costed their dish. dishLinkedToast is three-valued now, and this
     row's honest branch is the empty one; the costed branch is pinned by the test below, against a
     plate that really can be costed. */
  assert.match(S.toasts[0], /add ingredients to cost it/);
});

test('228: the link toast tells the truth about what the plate can actually cost', () => {
  const costable = [{ id: 'SP_NEW', name: 'Toastie', category: 'Sandwiches', lines: [{ pid: 'P1', qty: 2 }] }];
  const broken = [{ id: 'SP_NEW', name: 'Toastie', category: 'Sandwiches', lines: [{ pid: 'P1', qty: 2 }, { pid: 'GONE', qty: 1 }] }];
  const byId = { P1: { id: 'P1', cost_per_base_unit: 1.5 } };

  const ok = makeHarness({ customMenu: [ORPHAN], savedPlates: costable, byId });
  ok.h.link('ummrq8xbur');
  assert.match(ok.S.toasts[0], /is now costed from this plate — its menu price is unchanged\./);

  /* THE ONE THAT MATTERS: a line whose product is gone makes costDetail's total an UNDERSTATEMENT,
     and announcing it as a cost is the single thing a costing app must never do. The other line
     still costs, so the plate has a plausible number behind it — which is why this is invisible
     without the check rather than obviously wrong. */
  const part = makeHarness({ customMenu: [ORPHAN], savedPlates: broken, byId });
  part.h.link('ummrq8xbur');
  assert.match(part.S.toasts[0], /some of its lines still need costing\./);
  assert.doesNotMatch(part.S.toasts[0], /is now costed/);
});

test('pressing the rendered Link button actually links, and adds no row', () => {
  // End to end through the shipped wiring: renderer -> onclick -> onLink -> linkDishToPlate.
  const { S, h } = makeHarness({ customMenu: [ORPHAN] });
  h.openAdd();
  h.pick('SP_NEW');
  h.clickLink(0);
  assert.equal(S.customMenu.length, 1, 'still one row');
  assert.equal(plateIdOf(S.customMenu[0]), 'SP_NEW');
  assert.equal(S.closed, 1, 'and the modal closes — the job is done');
});

test('pressing Link with no plate picked says so instead of failing silently', () => {
  const { S, h } = makeHarness({ customMenu: [ORPHAN], selected: null });
  h.openAdd();                                   // openAddDishModal nulls the selection itself
  h.clickLink(0);
  assert.equal(plateIdOf(S.customMenu[0]), null, 'nothing was linked');
  assert.equal(S.closed, 0);
  assert.match(h.box('ad_err').textContent, /Pick a plate from the list first/);
});

test('linking follows the menu it just acted on, as publishing does', () => {
  // The Publish modal can target a menu other than the one on screen. Without this the user links a
  // row and is left looking at a different menu with nothing visibly changed. (CodeRabbit, v113.)
  const { S, h } = makeHarness({ customMenu: [{ ...ORPHAN, menuId: 'MENU_WINTER' }] });
  h.link('ummrq8xbur');
  assert.equal(S.currentMenu, 'MENU_WINTER');
});

test('linking sequences the write AFTER the plate — the row references it (menu_items.plate_id -> plates.id)', () => {
  const { S, h } = makeHarness({ customMenu: [ORPHAN] });
  h.link('ummrq8xbur');
  assert.equal(S.writes.length, 1);
  assert.equal(S.writes[0].plate, 'SP_NEW', 'must go through dbPushMenuAfterPlate, not a bare dbPushMenu');
});

test('the Add-existing-plate path refuses a duplicate through the SAME decision', () => {
  const { S, h } = makeHarness({ customMenu: [{ ...LINKED, plateId: 'SP_NEW' }] });
  h.addDish(12);
  assert.equal(S.customMenu.length, 1, 'one entry per (plate, menu) still holds');
  assert.match(S.errs[0], /already on this menu/);
});

test('opening Add-existing-plate on a menu with an unlinked row surfaces the choice', () => {
  const { h } = makeHarness({ customMenu: [ORPHAN] });
  h.openAdd();
  const box = h.box('ad_unlinked');
  assert.equal(box.style.display, 'block');
  assert.match(box.innerHTML, /Cheese &amp; Ham Toastie GF/, 'it names the row, escaped');
  assert.match(box.innerHTML, /Sandwiches/);
  assert.match(box.innerHTML, /\$8\.00/, 'section and price are what let a human tell rows apart');
  assert.match(box.innerHTML, /Link to this one/);
});

test('opening it on a clean menu shows nothing at all', () => {
  const { h } = makeHarness({ customMenu: [{ ...LINKED, plateId: 'SP1' }] });
  h.openAdd();
  const box = h.box('ad_unlinked');
  assert.equal(box.style.display, 'none');
  assert.equal(box.innerHTML, '', 'this fires for zero rows in production — it must be invisible there');
});

test('neither option is preselected, and the prompt offers no automatic anything', () => {
  const { h } = makeHarness({ customMenu: [ORPHAN] });
  h.openAdd();
  const html = h.box('ad_unlinked').innerHTML;
  assert.ok(!/checked|selected|autofocus/i.test(html), 'the user chooses; the app does not lean');
  assert.match(html, /add a new entry as usual/i, 'the other option is stated in words, not just implied');
});

/* ---------------------------------------------------------------------------
   3. The two creating paths cannot drift apart again.
   --------------------------------------------------------------------------- */

test('BOTH row-creating paths route through publishPlan', () => {
  // The hole existed twice. If a third path appears, or one of these reverts to its own
  // dishesOfPlate(...) test, this fails and names it.
  ['submitMenuItem', 'submitAddDish'].forEach((name) => {
    const fn = extractFn(SRC, name);
    assert.match(fn, /publishPlan\(/, `${name} must use the shared decision`);
    assert.ok(!/dishesOfPlate\([^)]*\)\s*\.(find|some)\(/.test(fn),
      `${name} still has its own guard — that is the bug this batch closed`);
  });
});

test('the prompt is rendered by both modals from one renderer', () => {
  assert.match(extractFn(SRC, 'openPublishModal'), /renderPubUnlinked\(\)/);
  assert.match(extractFn(SRC, 'renderPubUnlinked'), /renderUnlinkedPrompt\('mi_unlinked'/);
  assert.match(extractFn(SRC, 'openAddDishModal'), /renderAddDishUnlinked\(\)/);
  assert.match(extractFn(SRC, 'renderAddDishUnlinked'), /renderUnlinkedPrompt\('ad_unlinked'/);
});

test('the prompt reads its list off publishPlan, never a second computation of it', () => {
  // Found in the browser, not in a unit test: the renderer originally called unlinkedDishesOn directly,
  // so it offered the choice even where the button would UPDATE an existing entry rather than duplicate
  // anything. Two computations of "should we ask?" is two chances to disagree.
  const fn = extractFn(SRC, 'renderUnlinkedPrompt');
  assert.match(fn, /publishPlan\(MENU, plateId, menuId\)\.unlinked/);
  assert.ok(!/unlinkedDishesOn\(/.test(fn), 'the renderer must not re-derive the list');
});

test('picking a plate already on this menu WITHDRAWS the question', () => {
  // Its Link button would otherwise put a second row for the same (plate, menu) on the board — the
  // exact invariant the guard exists to hold.
  const { h } = makeHarness({ customMenu: [ORPHAN, { ...LINKED, plateId: 'SP_NEW' }] });
  h.openAdd();
  assert.equal(h.box('ad_unlinked').style.display, 'block', 'nothing picked yet — every unlinked row is a candidate');
  h.pick('SP_NEW');
  assert.equal(h.box('ad_unlinked').style.display, 'none');
  h.pick('SP_OTHER');
  assert.equal(h.box('ad_unlinked').style.display, 'block', 'a plate not yet on this menu brings it back');
});

test('the publish modal asks nothing when the plate is already on the chosen menu', () => {
  const plan = publishPlan([ORPHAN, { ...LINKED, plateId: 'SP_NEW' }], 'SP_NEW', 'MENU_ORIGINAL');
  assert.equal(plan.action, 'update');
  assert.deepEqual(plan.unlinked, []);
});

/* ---------------------------------------------------------------------------
   4. The menu half of the "already here?" comparison (180).

   Every case above is on MENU_ORIGINAL, which is also the fallback the comparison substitutes for a
   missing menuId. That made the two indistinguishable: the mutation gate replaced
   `(d.menuId||'MENU_ORIGINAL')` with `(d.menuId&&'MENU_ORIGINAL')` — which reads EVERY dish as
   though it were on the Original menu — and the whole file stayed green.

   Both directions cost real rows. Read every dish as Original and re-publishing to any other menu
   creates a SECOND copy of a plate already on it. Read a legacy null as anything else and a pre-menus
   row stops matching, with the same duplicate.
   --------------------------------------------------------------------------- */

test('180: a plate already on a NON-default menu updates rather than duplicating', () => {
  const onWinter = { id: 'umW', name: 'Fish & Chips', menuId: 'MENU_WINTER', plateId: 'SP1' };
  const plan = publishPlan([onWinter], 'SP1', 'MENU_WINTER');
  assert.equal(plan.action, 'update', 'publishing it again is an edit, not a second row');
  assert.equal(plan.existingId, 'umW');
});

test('180: the same plate on a DIFFERENT menu does not count as already here', () => {
  const onWinter = { id: 'umW', name: 'Fish & Chips', menuId: 'MENU_WINTER', plateId: 'SP1' };
  const plan = publishPlan([onWinter], 'SP1', 'MENU_ORIGINAL');
  assert.equal(plan.action, 'create', 'one plate can back many dishes, one per menu — that is the design');
  assert.equal(plan.existingId, null);
});

/* 184 REVERSED THIS ONE TOO — same reason as the unlinkedDishesOn pair above. It asserted that a row
   with no menuId counts as already-on-Original, so re-publishing there UPDATED it. It cannot: a row on
   no menu is not on the menu you are publishing to, and the old answer was only right for the one cafe
   whose menu happens to be called MENU_ORIGINAL. `create` is the honest plan, and the new row carries a
   real menu id while the orphan is left alone. */
test('184: a row with no menuId at all is on no menu, so publishing anywhere CREATES', () => {
  const orphan = { id: 'umL', name: 'Fish & Chips', plateId: 'SP1' };
  assert.equal(publishPlan([orphan], 'SP1', 'MENU_ORIGINAL').action, 'create');
  assert.equal(publishPlan([orphan], 'SP1', 'MENU_WINTER').action, 'create');
  assert.equal(publishPlan([orphan], 'SP1', 'MENU_ORIGINAL').existingId, null,
    'nothing is updated in place — the orphan is not the row being published');
});
