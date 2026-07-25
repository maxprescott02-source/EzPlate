/*
 * plate-draft.test.js — v82 D1. The in-progress plate must survive a reload (offline-first).
 *
 * Building a plate then reloading used to lose everything — no draft, no warning. The builder now
 * persists to ONE localStorage slot (cafeDB_plateDraft), restored on the next open. This locks the
 * data contract: what gets stored, that an empty builder stores NO stale draft, and that a draft
 * referencing a since-deleted ingredient still round-trips (the render layer degrades it to
 * "product missing" — that's renderPlate's job, covered by the app's existing orphan-line handling).
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`plate-draft: function not found -> ${name}. app.js changed; update tests/plate-draft.test.js`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`plate-draft: unbalanced braces for ${name}`);
}

function makeDraft({ plate = [], name = '', cat = '', loadedPlateId = null } = {}) {
  // eslint-disable-next-line no-new-func
  const factory = new Function('PLATE', 'NAME', 'CAT', 'LID', `
    "use strict";
    var DRAFTKEY='cafeDB_plateDraft';
    var store={};
    var localStorage={ getItem:function(k){return (k in store)?store[k]:null;},
                       setItem:function(k,v){store[k]=String(v);}, removeItem:function(k){delete store[k];} };
    var plate=PLATE, loadedPlateId=LID, _name=NAME, _cat=CAT, _draftT=null;
    var document={ getElementById:function(id){
      if(id==='plateName') return {value:_name};
      if(id==='plateCat')  return {value:_cat};
      return null;
    }};
    ${extractFn(SRC, 'draftHasContent')}
    ${extractFn(SRC, 'savePlateDraft')}
    ${extractFn(SRC, 'clearPlateDraft')}
    return {
      draftHasContent: draftHasContent,
      savePlateDraft: savePlateDraft,
      clearPlateDraft: clearPlateDraft,
      read: function(){ var v=store[DRAFTKEY]; return v?JSON.parse(v):null; }
    };
  `);
  return factory(plate, name, cat, loadedPlateId);
}

test('draftHasContent: lines OR a name make it worth resuming; nothing does not', () => {
  const d = makeDraft();
  assert.equal(d.draftHasContent(null), false);
  assert.equal(d.draftHasContent({ lines: [], name: '' }), false);
  assert.equal(d.draftHasContent({ lines: [], name: '   ' }), false, 'whitespace name is not content');
  assert.equal(d.draftHasContent({ lines: [{ kid: 'K1', qty: 100 }], name: '' }), true);
  assert.equal(d.draftHasContent({ lines: [], name: 'Big Breakfast' }), true);
});

test('a plate in progress persists its lines, name, category and loadedPlateId', () => {
  const d = makeDraft({ plate: [{ kid: 'K1', qty: 100 }, { misc: true, label: 'Box', cost: 0.4 }],
    name: 'Big Breakfast', cat: 'Mains', loadedPlateId: 'SP7' });
  d.savePlateDraft();
  const saved = d.read();
  assert.ok(saved, 'a draft was written');
  assert.equal(saved.name, 'Big Breakfast');
  assert.equal(saved.cat, 'Mains');
  assert.equal(saved.loadedPlateId, 'SP7');
  assert.equal(saved.lines.length, 2, 'ingredient + misc line both stored');
  assert.equal(saved.lines[0].kid, 'K1');
  assert.equal(saved.lines[0].qty, 100);
});

test('an empty builder writes NO stale draft (and clears any prior one)', () => {
  const d = makeDraft({ plate: [], name: '' });
  d.savePlateDraft();
  assert.equal(d.read(), null, 'nothing worth resuming ⇒ no draft slot');
});

test('clearPlateDraft removes the slot (save on a real plate, then clear)', () => {
  const d = makeDraft({ plate: [{ kid: 'K1', qty: 50 }], name: 'X' });
  d.savePlateDraft();
  assert.ok(d.read(), 'stored');
  d.clearPlateDraft();
  assert.equal(d.read(), null, 'cleared');
});

test('a draft referencing a since-deleted ingredient still round-trips (graceful degrade is the render layer)', () => {
  const d = makeDraft({ plate: [{ kid: 'K_GONE', qty: 100 }], name: 'Ghost plate' });
  d.savePlateDraft();
  const saved = d.read();
  assert.equal(saved.lines[0].kid, 'K_GONE', 'the orphaned line survives serialization — restore never crashes on it');
  assert.equal(saved.name, 'Ghost plate');
});
