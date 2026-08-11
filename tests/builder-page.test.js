/*
 * builder-page.test.js — F7 (v146). The five decisions the builder-as-a-page batch made, each
 * pinned against the REAL shipped function rather than a copy of it (`_extractfn`'s loadApp +
 * extractFn — CLAUDE.md's "extract the real function instead" rule; a stub written from the same
 * belief as the code passes against the defect it was written to catch).
 *
 * What is here and why each one is a REGRESSION rather than a description:
 *
 *  1. "Saved just now" waits for the SERVER. It is the one claim on this screen that can be a lie,
 *     and the rule it obeys ("the occasional user would rather be told a thing did not save") is
 *     CLAUDE.md's, not this batch's. An offline drop resolves {error}, never null — the distinction
 *     that decides whether a caller treats a failure as success.
 *  2. Any edit RETRACTS it. Leaving it up after a change is the same lie one beat later.
 *  3. Duplicate does not copy the publish state. A copy published to the same menu would put two
 *     rows of the same dish on it — an invented dish, silently.
 *  4. Duplicate's guard runs BEFORE the clone, so the plate being duplicated is never the thing the
 *     unsaved-work prompt is asking about.
 *  5. deletePlate's onRemoved fires only after the confirm is taken and only on the optimistic
 *     removal — never on the rollback, which is how the builder page leaves itself exactly once.
 *
 * SOURCE CENSUS at the end for the two claims no sandbox can make.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn, extractVar } = require('./_extractfn');

const SRC = loadApp();

/* ------------------------------------------------------------------ 1 + 2. the saved state */

/* setBuilderSaved's real body reads getElementById('bldSaved'); the harness hands it a plain object
   whose `hidden` we can read back. One shared object, so the last write wins and IS the state. */
function savedState(opts) {
  const el = { hidden: true, textContent: '' };
  const S = {
    resolve: opts.resolve,
    plate: [{ uid: 1, kid: 'K1', qty: 100 }],
    name: 'Chips',
    el,
  };
  // eslint-disable-next-line no-new-func
  const factory = new Function('S', `
    "use strict";
    var plate=S.plate, savedPlates=[], loadedPlateId=null;
    var document={getElementById:function(id){
      if(id==='bldSaved') return S.el;
      if(id==='plateName') return {value:S.name, focus:function(){}};
      return {value:'', style:{}, textContent:'', hidden:false, focus:function(){}};
    }, querySelector:function(){ return {focus:function(){}}; }};
    function toast(){} function updateEditTag(){} function renderAnalysis(){} function renderPlatesTab(){}
    function clearPlateDraft(){} function logHistory(){} function logChangeIfSaved(){}
    function computeAvgFoodCost(){ return 30; } function costFromLines(){ return 1; }
    function menusOfPlate(){ return []; } function builderCategoryValue(){ return null; }
    function renderBuilderCost(){}
    function dbPushPlate(){ return S.resolve; }
    var _draftArmed=false, _draftT=null;
    var _builderEdits=0;   // F7 (v146): the builder's edit counter — real state, the logic that moves it is extracted
    /* 173: uid() is a shared dependency of every id-minting path below. Extracted, not stubbed:
       a hand-rolled counter here would agree with a broken generator and hide exactly the
       collision it exists to prevent (CLAUDE.md, "a stub that mirrors a real function must
       mirror its CONTRACT"). No backticks in this comment - it sits inside a template literal. */
    ${extractVar(SRC, '_uidSeq')}
    ${extractFn(SRC, 'uidRandom')}
    ${extractFn(SRC, 'uid')}
    ${extractFn(SRC, 'syncBuilderPlateActions')}
    function savePlateDraft(){}
    ${extractFn(SRC, 'setBuilderSaved')}
    ${extractFn(SRC, 'scheduleDraftSave')}
    ${extractFn(SRC, 'saveCurrentPlate')}
    return { save:function(){ return saveCurrentPlate(false); }, edit:function(){ scheduleDraftSave(); } };
  `);
  return { el, api: factory(S) };
}

test('F7: "Saved just now" appears only AFTER the server confirms', async () => {
  let settle;
  const pending = new Promise((r) => { settle = r; });
  const { el, api } = savedState({ resolve: pending });

  assert.strictEqual(api.save(), true, 'the save itself succeeds optimistically');
  assert.strictEqual(el.hidden, true,
    'the saved line must NOT be up while the write is still in flight — that is the lie this pins');

  settle({ ok: true });
  await pending;
  await Promise.resolve();
  assert.strictEqual(el.hidden, false, 'once the server answers, it shows');
  assert.match(el.textContent, /Saved/);
});

test('F7: an offline drop resolves {error}, and NOTHING claims the plate was saved', async () => {
  /* CLAUDE.md Tier 2: pushWrite resolves to the result or to {error} and NEVER to null. A caller
     that treated only null as failure would call this a success — which is exactly why the code
     tests `!r || !r.error` rather than `r !== null`. */
  const { el, api } = savedState({ resolve: Promise.resolve({ error: { message: 'offline' } }) });
  api.save();
  await Promise.resolve(); await Promise.resolve();
  assert.strictEqual(el.hidden, true, 'a failed write must never render "Saved just now"');
});

test('F7: any edit retracts "Saved just now"', async () => {
  const { el, api } = savedState({ resolve: Promise.resolve({ ok: true }) });
  api.save();
  await Promise.resolve(); await Promise.resolve();
  assert.strictEqual(el.hidden, false, 'precondition: it is up');
  api.edit();
  assert.strictEqual(el.hidden, true, 'a change makes the line describe a state the server does not have');
});

/* ------------------------------------------------------------------ 3 + 4. Duplicate */

function dupHarness(sourcePlate) {
  const S = { calls: [], plateOut: null, fields: {}, source: sourcePlate };
  // eslint-disable-next-line no-new-func
  const factory = new Function('S', `
    "use strict";
    var uidc=1, plate=[{uid:0,kid:'KOLD',qty:5}], loadedPlateId='SP1', menuTouched=true;
    var savedPlates=[S.source];
    var byId={};
    var document={getElementById:function(id){
      if(!S.fields[id]) S.fields[id]={value:'', style:{}, textContent:'', hidden:false};
      return S.fields[id];
    }};
    function toast(m){ S.calls.push('toast'); }
    function updateEditTag(){} function renderPlate(){} function hidePlateSuggest(){}
    function openBuilder(){ S.calls.push('openBuilder'); S.plateOut=plate.slice(); S.loadedAfter=loadedPlateId; }
    /* the guard is recorded, not stubbed away: order is the thing under test */
    function guardUnfinishedPlate(proceed){ S.calls.push('guard'); proceed(); }
    ${extractFn(SRC, 'duplicateCurrentPlate')}
    return function(){ duplicateCurrentPlate(); };
  `);
  factory(S)();
  return S;
}

test('F7: Duplicate clones the lines and the category, and does NOT carry the publish state', () => {
  const source = {
    id: 'SP1', name: 'Fish & Chips', category: 'Mains',
    lines: [{ kid: 'K1', qty: 350 }, { misc: true, label: 'Packaging', cost: 0.4 }],
    // a publish link, if one ever lands on the plate object, must not be copied
    menuId: 'MENU_WINTER',
  };
  const S = dupHarness(source);

  assert.ok(S.plateOut, 'the builder opened on the clone');
  assert.strictEqual(S.plateOut.length, 2, 'both lines came across');
  assert.strictEqual(S.plateOut[0].kid, 'K1');
  assert.strictEqual(S.plateOut[0].qty, 350);
  assert.strictEqual(S.plateOut[1].misc, true);
  assert.strictEqual(S.plateOut[1].label, 'Packaging');
  assert.strictEqual(S.fields.plateCat.value, 'Mains', 'the category is part of the recipe, so it copies');
  assert.match(S.fields.plateName.value, /copy/i, 'the copy is named as one');

  /* THE ONE THAT MATTERS. The clone is UNSAVED (no id) and carries no menu link, so publishing is
     a fresh decision. Copying it would put a second row of the same dish on the same menu. */
  assert.strictEqual(S.loadedAfter, null, 'the clone has no plate id — it is unsaved');
  for (const l of S.plateOut) {
    assert.strictEqual(l.menuId, undefined, 'no line carries a menu link');
  }
});

test('F7: the unsaved-work guard runs BEFORE the clone replaces the builder', () => {
  const S = dupHarness({ id: 'SP1', name: 'X', category: '', lines: [{ kid: 'K1', qty: 1 }] });
  /* Order, not presence. If the clone ran first, the guard would be asking about the copy it had
     just made instead of the work the user had in progress — and answering "Resume" would resume
     the wrong plate. */
  assert.deepStrictEqual(S.calls.slice(0, 2), ['guard', 'openBuilder']);
});

/* ------------------------------------------------------------------ 5. leaving on delete */

test('F7: deletePlate calls onRemoved once, after the confirm and after the optimistic removal', () => {
  const S = { order: [], confirmFn: null };
  // eslint-disable-next-line no-new-func
  const factory = new Function('S', `
    "use strict";
    var savedPlates=[{id:'SP1',name:'X',lines:[]}], loadedPlateId='SP1', MENU=[], customMenu=[];
    function askConfirm(t,m,l,fn){ S.order.push('askConfirm'); S.confirmFn=fn; }
    function menusOfPlate(){ return []; } function dishesOfPlate(){ return []; }
    function computeAvgFoodCost(){ return 30; } function forgetMenuItems(){}
    function rebuildMenu(){} function buildMenuOptions(){} function buildMenuSelector(){}
    function updateEditTag(){} function renderPlate(){} function renderAnalysis(){} function renderPlatesTab(){}
    function logChange(){} function logHistory(){} function toast(){}
    function rollbackPlateDelete(){ S.order.push('rollback'); }
    function dbDeletePlateAfterDishes(){ S.order.push('serverCall'); return {then:function(cb){ S.serverCb=cb; return this; }}; }
    ${extractFn(SRC, 'deletePlate')}
    return function(){ deletePlate('SP1', function(){ S.order.push('onRemoved'); }); };
  `);
  factory(S)();

  assert.deepStrictEqual(S.order, ['askConfirm'], 'nothing happens until the confirm is taken');
  S.confirmFn();
  assert.deepStrictEqual(S.order, ['askConfirm', 'onRemoved', 'serverCall'],
    'onRemoved fires on the optimistic removal, before the write is even dispatched — the page leaves ' +
    'at the moment the plate stops existing on screen, not when the server agrees');

  // and a server rejection rolls back WITHOUT a second onRemoved
  S.serverCb({ dishesOk: false, plateOk: false, failedDishIds: [] });
  assert.strictEqual(S.order.filter((x) => x === 'onRemoved').length, 1,
    'the rollback must not re-enter the builder the user has already left');
  assert.ok(S.order.includes('rollback'));
});

/* ---------------------------------------------- 6. the review's stale-resolution race (fix 3) */

test('F7: a write that resolves AFTER a further edit must NOT claim the plate was saved', async () => {
  /* Found by the F7 pre-push review, in a browser. Retracting the badge on the next edit is not
     enough on its own: save, keep typing while the write is in flight, and the resolver puts
     "Saved just now" up for a push that never contained the new line. On mobile data — the exact
     condition this app is designed around — that is reachable by anyone who does not stop to
     watch the spinner. The edit counter is what closes it. */
  let settle;
  const pending = new Promise((r) => { settle = r; });
  const { el, api } = savedState({ resolve: pending });

  api.save();
  assert.strictEqual(el.hidden, true, 'precondition: nothing claimed while in flight');
  api.edit();                                     // the user changes something else, mid-write
  settle({ ok: true });                           // the ORIGINAL write lands, successfully
  await pending; await Promise.resolve(); await Promise.resolve();

  assert.strictEqual(el.hidden, true,
    'the write succeeded, but it did not contain the later edit — claiming "Saved just now" here ' +
    'tells the user their current plate is on the server when it is not');
});

/* ---------------------------------------------- 7. the saved-plate-only controls (fix 2) */

test('F7: Clear plate hides Duplicate and Delete, because it drops the plate id', () => {
  /* Found by the F7 pre-push review, end to end including the dead click. Both controls read
     `loadedPlateId`, "Clear plate" is the app's explicit discard and sets it to null, and neither
     openBuilder nor saveCurrentPlate runs on that path — so both stayed visible and both became
     silent no-ops. §R4: never a control that does nothing.

     ⚠️ THIS TEST RUNS THE REAL HANDLER, and the first draft of it did not — it called
     syncBuilderPlateActions() from its own shim, which tested the helper and not the WIRING, and
     passed against the unfixed code. The handler is an inline addEventListener with no name, so it
     is sliced out of the source by its anchor; if that anchor ever stops matching, the slice
     assertion below fails loudly rather than the test quietly proving nothing. */
  const anchor = "document.getElementById('clearBtn').addEventListener('click',";
  const at = SRC.indexOf(anchor);
  assert.ok(at >= 0, 'the clearBtn handler could not be found — update the anchor, do not delete the test');
  const body = SRC.slice(at + anchor.length, SRC.indexOf('});', at) + 1);
  assert.ok(/loadedPlateId=null/.test(body), 'precondition: the discard really does drop the plate id');

  const S = { els: {} };
  // eslint-disable-next-line no-new-func
  const factory = new Function('S', 'HANDLER', `
    "use strict";
    var plate=[{uid:1}], loadedPlateId='SP1', menuTouched=true, uidc=2;
    var menuLinkEl={value:'MI1'};
    var document={getElementById:function(id){
      if(!S.els[id]) S.els[id]={hidden:false, value:'x', style:{}, textContent:''};
      return S.els[id];
    }};
    function hideMatchPrompt(){} function updateEditTag(){} function clearPlateDraft(){} function renderPlate(){}
    ${extractFn(SRC, 'syncBuilderPlateActions')}
    var run=eval('(' + HANDLER + ')');
    return function(){ syncBuilderPlateActions(); return { before:{d:S.els.bldDuplicate.hidden, x:S.els.bldDelete.hidden}, run:function(){ run(); return {d:S.els.bldDuplicate.hidden, x:S.els.bldDelete.hidden}; } }; };
  `);
  const api = factory(S, body)();

  assert.deepStrictEqual(api.before, { d: false, x: false }, 'a saved plate can be duplicated and deleted');
  assert.deepStrictEqual(api.run(), { d: true, x: true },
    'after the real Clear-plate handler runs, neither control is left visible — a visible Duplicate ' +
    'on a discarded plate is a button that silently does nothing');
});

test('F7 census: nothing outside syncBuilderPlateActions sets those controls hidden', () => {
  /* The defect was not the missing line, it was that TWO `hidden=` assignments were copied to each
     call site instead of one function owning them. This is the guard against the third copy. */
  const owner = extractFn(SRC, 'syncBuilderPlateActions');
  const elsewhere = SRC.split(owner).join('');
  for (const id of ['bldDuplicate', 'bldDelete']) {
    assert.ok(owner.includes(id), `syncBuilderPlateActions must own #${id}`);
    assert.ok(!new RegExp("getElementById\\('" + id + "'\\)[^;\\n]*hidden\\s*=").test(elsewhere),
      `#${id}'s hidden state is set outside syncBuilderPlateActions — that is how the Clear-plate ` +
      'gap happened, and a third call site will reopen it');
  }
});

/* ------------------------------------------------------------------ source census */

test('F7 census: the builder modal and the plate-action chooser are GONE from the app', () => {
  const html = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  for (const id of ['builderModal', 'plateActionsModal', 'docketPanel', 'platePanel', 'builderModalTitle']) {
    assert.ok(!new RegExp('id="' + id + '"').test(html), `#${id} still exists in index.html`);
  }
  assert.ok(/id="builderPage"/.test(html), 'the builder page exists');
  /* the four rehomed actions, each with a live home — R3 forbids a dropped control, and this is
     the assertion that would fail if a later tidy-up deleted one instead of moving it */
  for (const id of ['bldDuplicate', 'printBtn', 'bldDelete', 'bPublish']) {
    assert.ok(new RegExp('id="' + id + '"').test(html), `#${id} — a rehomed action lost its home`);
  }
});

test('F7 census: Save does not navigate away, because publishing lives on the page now', () => {
  const fn = extractFn(SRC, 'saveFromBuilder');
  assert.ok(!/closeBuilder/.test(fn),
    'saveFromBuilder must not close the builder: the Publishing card is the control the user needs next, ' +
    'and navigating away would put it one screen from the plate they just saved');
});
