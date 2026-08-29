/*
 * plate-draft-save.test.js — batch 221, docs/QUEUE.md item 8.
 *
 * `saveCurrentPlate` deleted the recovery draft on the DISPATCH line — `dbPushPlate(sp);
 * clearPlateDraft();` — so the draft was gone whether or not the write landed. Offline that is silent
 * loss of authored work, and the toast saying so is long past by the time this app's user next opens it.
 *
 * ⚠️ WHY THIS FILE EXECUTES THE FUNCTION INSTEAD OF GREPPING IT. tests/plate-draft.test.js pins this
 * area by matching source text, and the whole suite stayed GREEN when the fix was applied — no test
 * could tell the two behaviours apart, which is CLAUDE.md's most-recorded defect shape. Only running
 * the real function against a real storage slot, with the write made to FAIL, can. Every assertion
 * below therefore drives `saveCurrentPlate` and then reads the slot.
 *
 * The write stub honours pushWrite's real contract: it ALWAYS resolves, to the result or to {error},
 * and NEVER to null (CLAUDE.md Tier 2). A test that rejected instead would be testing a path
 * supabase-js does not take.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

/* One sandbox, the two real bodies, and no-ops for everything saveCurrentPlate merely paints.
   `clearPlateDraft` is EXTRACTED rather than stubbed: it is half of what is under test, and a
   hand-rolled `delete store[KEY]` would agree with a broken version of it — including about the
   `clearTimeout(_draftT)` that closes the race with the debounced writer. */
function harness() {
  const S = { writes: [], toasts: [], badge: [], fail: false, draftWrites: 0 };
  // eslint-disable-next-line no-new-func
  const factory = new Function('S', `
    "use strict";
    var DRAFTKEY='cafeDB_plateDraft';
    var store={};
    var localStorage={ getItem:function(k){ return (k in store)?store[k]:null; },
                       setItem:function(k,v){ store[k]=String(v); },
                       removeItem:function(k){ delete store[k]; } };
    var _draftT=null, _builderEdits=0, _draftArmed=true;
    var plate=[], savedPlates=[], loadedPlateId=null;
    var _name='Barra Basket';

    function el(id){ return { value:(id==='plateName'?_name:''), style:{}, textContent:'',
                              focus:function(){}, querySelectorAll:function(){ return []; } }; }
    var document={ getElementById:el, querySelector:function(){ return {focus:function(){}}; } };

    /* pushWrite's contract: always resolves, to the result or to {error}, never to null. */
    function dbPushPlate(sp){ S.writes.push(sp.id);
      return Promise.resolve(S.fail ? {error:{message:'offline'}} : {ok:true}); }

    function toast(m){ S.toasts.push(m); }
    function setBuilderSaved(v){ S.badge.push(v); }
    function uid(p){ return p+'1'; }
    function costFromLines(){ return {cost:0, miss:0}; }
    function computeAvgFoodCost(){ return 0; }
    function menusOfPlate(){ return []; }
    function builderCategoryValue(){ return ''; }
    function updateEditTag(){} function renderAnalysis(){} function renderPlatesTab(){}
    function syncBuilderPlateActions(){} function renderBuilderCost(){} function logHistory(){}
    function logChangeIfSaved(){}

    ${extractFn(SRC, 'clearPlateDraft')}
    ${extractFn(SRC, 'saveCurrentPlate')}

    return {
      save:function(asNew){ return saveCurrentPlate(!!asNew); },
      addLine:function(){ plate.push({uid:'u1', kid:'K1', qty:2}); },
      seedDraft:function(){ store[DRAFTKEY]=JSON.stringify({name:'Barra Basket', lines:[{kid:'K1',qty:2}]}); },
      draft:function(){ return store[DRAFTKEY]===undefined?null:store[DRAFTKEY]; },
      edit:function(){ _builderEdits++; },
      /* the debounced writer, armed the way scheduleDraftSave arms it, so the RACE is testable:
         a draft save pending from before the push must not outlive the clear. */
      armPendingDraftSave:function(){ _draftT=setTimeout(function(){ S.draftWrites++;
        store[DRAFTKEY]=JSON.stringify({name:_name, lines:[{kid:'K1',qty:2}]}); }, 0); },
    };
  `);
  return { S, api: factory(S) };
}

const settle = () => new Promise((r) => setTimeout(r, 5));

test('the harness really does drive the shipped saveCurrentPlate', () => {
  const { S, api } = harness();
  api.addLine(); api.seedDraft();
  assert.strictEqual(api.save(false), true, 'a named plate with a quantified line saves');
  assert.deepStrictEqual(S.writes, ['SP1'], 'and it actually reached the write');
});

test('item 8: a FAILED write KEEPS the recovery draft', { timeout: 5000 }, async () => {
  const { S, api } = harness();
  S.fail = true;
  api.addLine(); api.seedDraft();
  api.save(false);
  assert.notStrictEqual(api.draft(), null, 'the draft must survive the dispatch');
  await settle();
  /* THE ASSERTION THIS FILE EXISTS FOR. Against the pre-221 code the draft is gone by the end of the
     synchronous dispatch line, so this fails on the line above as well as this one. */
  assert.notStrictEqual(api.draft(), null,
    'the write was rejected, so the only copy of this work is the draft — deleting it is data loss');
  assert.deepStrictEqual(S.badge, [], 'and the "Saved just now" badge stays down, as it already did');
});

test('item 8: a SUCCESSFUL write clears the draft, once the server has answered', { timeout: 5000 }, async () => {
  const { S, api } = harness();
  api.addLine(); api.seedDraft();
  api.save(false);
  assert.notStrictEqual(api.draft(), null, 'not before the answer — that was the whole defect');
  await settle();
  assert.strictEqual(api.draft(), null, 'and it IS cleared once the plate is really stored');
  assert.deepStrictEqual(S.badge, [true], 'the badge and the draft agree, because one function decides both');
});

test('item 8: an edit made after the push keeps the draft even though the write SUCCEEDED', { timeout: 5000 }, async () => {
  /* The `_builderEdits` guard, which the badge already used. It matters more for the draft than for
     the badge: the draft now holds work NEWER than what was sent, so clearing it would discard an
     edit the server has never seen. Not merely safe — correct. */
  const { S, api } = harness();
  api.addLine(); api.seedDraft();
  api.save(false);
  api.edit();
  await settle();
  assert.notStrictEqual(api.draft(), null, 'the draft is newer than the write that just landed');
  assert.deepStrictEqual(S.badge, [], 'and the badge stays down for the same reason');
});

test('item 8: a draft save pending from BEFORE the push does not outlive the clear', { timeout: 5000 }, async () => {
  /* The race the fix has to survive: moving the clear later means a debounced write scheduled before
     it could land after it and resurrect a draft for a plate that IS saved — a spurious "Unfinished
     plate, resume or discard?" on the next builder entry. `clearPlateDraft` cancels `_draftT` before
     removing the slot, which is why it is extracted here rather than stubbed. */
  const { S, api } = harness();
  api.addLine(); api.seedDraft();
  api.armPendingDraftSave();
  api.save(false);
  await settle();
  assert.strictEqual(api.draft(), null, 'no resurrected draft for a plate that saved cleanly');
});
