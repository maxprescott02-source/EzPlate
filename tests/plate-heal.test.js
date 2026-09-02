/*
 * plate-heal.test.js — 228: an unlinked dish finds its REAL recipe instead of starting a second empty one.
 *
 * THE DECISION, and it is Max's rather than a design call. `docs/decisions/2026-08-08-2.html`, question
 * "orphandish", answered 9 Aug 2026: *"Look for the plate first — relink if there's exactly one match,
 * ask me if there are several."* Before this, costing a dish whose plate link was lost minted a SECOND
 * empty plate and left the real recipe stranded in the library, with the dish reading "not costed" and
 * nothing anywhere saying why. The class arrives only from a restore or from history — production has
 * zero rows of it — and the one real incident of it took 76 of 77 dishes.
 *
 * WHAT IS PINNED AND WHY IT IS THE PLAN RATHER THAN THE EFFECT. `plateHealPlan` is a pure decision in
 * `publishPlan`'s idiom, and it is what these tests mostly drive: four named outcomes, so that "found
 * none" and "found several" cannot collapse into the same silent create. The effect is pinned too —
 * `ensurePlateForDish` must relink rather than mint — because a plan nobody acts on is worth nothing.
 *
 * Everything is brace-extracted from js/app.js. Nothing here re-implements a shipped function: this
 * repo's most-recorded defect is a stub written from the same wrong belief as the code.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn, extractVar } = require('./_extractfn');

const SRC = loadApp();

/* One harness for both the plan and the heal, because they share every dependency and splitting them
   would mean two fixtures that could drift. `S` is the mutable world the extracted code runs against. */
function makeHarness(plates, dishes) {
  const S = { savedPlates: plates, MENU: dishes, pushed: [] };
  // eslint-disable-next-line no-new-func
  const factory = new Function('S', `
    ${extractVar(SRC, '_uidSeq')}
    ${extractFn(SRC, 'uidRandom')}
    ${extractFn(SRC, 'uid')}
    "use strict";
    var savedPlates=S.savedPlates, MENU=S.MENU, customMenu=S.MENU;
    var kById={}, byId={};
    function dbPushMenuAfterPlate(item, sp){ S.pushed.push((sp&&sp.id)+'<-'+(item&&item.id)); return Promise.resolve(null); }
    /* 228: linkDishToPlate is the SHIPPED linker (change log, menu rebuild, its own toast) and this
       file does not own its contract — tests/publish-guard.test.js and tests/change-log.test.js do.
       Stubbed to the one thing the heal depends on: it links the dish and reports it happened. This
       is a stub of a DEPENDENCY, not of the subject; the subject is plateHealPlan, extracted whole. */
    function linkDishToPlate(dish, sp){
      if(!dish||!sp) return null;
      dish.plateId=sp.id;
      var i=customMenu.findIndex(function(c){return c.id===dish.id;}); if(i>=0) customMenu[i]=dish; else customMenu.push(dish);
      S.pushed.push(sp.id+'<-'+dish.id);
      return dish;
    }
    ${extractFn(SRC, 'menuIdOf')}
    ${extractFn(SRC, 'dishOnMenu')}
    ${extractFn(SRC, 'plateIdOf')}
    ${extractFn(SRC, 'plateForMenuItem')}
    ${extractFn(SRC, 'dishesOfPlate')}
    ${extractFn(SRC, 'normPlateName')}
    ${extractFn(SRC, 'plateHealPlan')}
    ${extractFn(SRC, 'ensurePlateForDish')}
    return {
      plan: function(dishId){ return plateHealPlan(S.MENU.find(function(d){return d.id===dishId;})); },
      heal: function(dishId){ var m=S.MENU.find(function(d){return d.id===dishId;}); return { sp: ensurePlateForDish(m), m: m }; },
      norm: normPlateName,
      library: function(){ return savedPlates; },
      writes: function(){ return S.pushed; },
    };
  `);
  return factory(S);
}

const dish = (id, name, menuId, extra) => Object.assign({ id, name, menuId }, extra || {});
const plate = (id, name, lines) => ({ id, name, lines: lines || [] });

/* ---- 1. the four outcomes ---- */

test('228: a dish that still has its plate is `linked` — the heal never runs', () => {
  const h = makeHarness([plate('SP1', 'Soup')], [dish('D1', 'Soup', 'M1', { plateId: 'SP1' })]);
  const p = h.plan('D1');
  assert.strictEqual(p.action, 'linked');
  assert.strictEqual(p.plate.id, 'SP1');
});

test('228: exactly one same-named library plate is `relink`', () => {
  const h = makeHarness([plate('SP1', 'Soup')], [dish('D1', 'Soup', 'M1')]);
  const p = h.plan('D1');
  assert.strictEqual(p.action, 'relink');
  assert.strictEqual(p.plate.id, 'SP1');
});

test('228: several same-named plates is `ask` — the app never guesses between them', () => {
  const h = makeHarness([plate('SP1', 'Soup'), plate('SP2', 'soup')], [dish('D1', 'Soup', 'M1')]);
  const p = h.plan('D1');
  assert.strictEqual(p.action, 'ask');
  assert.deepStrictEqual(p.candidates.map((s) => s.id), ['SP1', 'SP2']);
});

test('228: no match is `create` — today’s behaviour, unchanged', () => {
  const h = makeHarness([plate('SP1', 'Chowder')], [dish('D1', 'Soup', 'M1')]);
  assert.strictEqual(h.plan('D1').action, 'create');
});

/* ---- 2. what counts as the same name ---- */

test('228: matching ignores case and collapses inner whitespace', () => {
  const h = makeHarness([plate('SP1', '  FISH   and Chips ')], [dish('D1', 'fish and chips', 'M1')]);
  const p = h.plan('D1');
  assert.strictEqual(p.action, 'relink', 'the same dish by any spacing or case is the same dish');
  assert.strictEqual(h.norm('  FISH   and Chips '), 'fish and chips');
});

/* THE ONE THAT MATTERS MOST, because its failure is silent and wholesale. A dish with no name would
   match every unnamed plate in the library, and `relink` would then hand it somebody else's recipe —
   a wrong cost on a costing screen, arrived at automatically. Both sides are covered: a nameless dish
   finds nothing, and a nameless PLATE is never a candidate for a named dish. */
test('228: a dish with no name matches NOTHING, and an unnamed plate is never a candidate', () => {
  const blankDish = makeHarness([plate('SP1', ''), plate('SP2', '   ')], [dish('D1', '', 'M1')]);
  assert.strictEqual(blankDish.plan('D1').action, 'create', 'a nameless dish must not adopt a nameless plate');

  const named = makeHarness([plate('SP1', '')], [dish('D1', 'Soup', 'M1')]);
  assert.strictEqual(named.plan('D1').action, 'create');
});

/* ---- 3. the exclusion the queue item did not mention ---- */

/* Relinking to a plate that already backs a dish on THIS dish's menu would put two dishes of one plate
   on one menu — the "one entry per (plate, menu)" rule v113 established, and the thing dishesOfPlate
   and menusOfPlate would then report ambiguously. Minting an empty plate is the RIGHT answer there,
   not a fallback: the real recipe is demonstrably already in use on this menu, so this row is a
   duplicate for a human to resolve. */
test('228: a plate already backing a dish on THIS menu is not a candidate', () => {
  const h = makeHarness(
    [plate('SP1', 'Soup')],
    [dish('D1', 'Soup', 'M1', { plateId: 'SP1' }), dish('D2', 'Soup', 'M1')],
  );
  assert.strictEqual(h.plan('D2').action, 'create', 'D1 already uses SP1 on M1, so SP1 is out');
});

test('228: the same plate on a DIFFERENT menu is still a candidate — plates are many-to-many', () => {
  const h = makeHarness(
    [plate('SP1', 'Soup')],
    [dish('D1', 'Soup', 'M1', { plateId: 'SP1' }), dish('D2', 'Soup', 'M2')],
  );
  const p = h.plan('D2');
  assert.strictEqual(p.action, 'relink', 'one plate backs one dish per menu, which is the v55 design');
  assert.strictEqual(p.plate.id, 'SP1');
});

/* The exclusion must not exclude the dish being healed BY ITSELF. Without the `d.id!==m.id` guard a
   dish that somehow appears in its own dishesOfPlate would rule out its own recipe. */
test('228: the exclusion ignores the dish being healed', () => {
  const h = makeHarness([plate('SP1', 'Soup')], [dish('D1', 'Soup', 'M1')]);
  assert.strictEqual(h.plan('D1').action, 'relink');
});

/* ---- 4. the effect: it relinks rather than minting ---- */

test('228: ensurePlateForDish RELINKS the real recipe and mints nothing', () => {
  const lines = [{ kid: 'K1', qty: 100 }];
  const h = makeHarness([plate('SP1', 'Soup', lines)], [dish('D1', 'Soup', 'M1')]);
  const { sp, m } = h.heal('D1');
  assert.strictEqual(sp.id, 'SP1', 'the dish gets the EXISTING plate');
  assert.strictEqual(m.plateId, 'SP1', 'and is linked to it');
  assert.strictEqual(sp.lines, lines, 'its recipe is untouched — a relink changes the link, never the lines');
});

/* The defect this whole item is about, stated as a count: the library must not grow. Before 228 the
   heal pushed a second, empty "Soup" and left the real one stranded — two rows of one recipe, one
   costed and one not, which is how the v112 orphan presented. */
test('228: a relink does not grow the library, and is idempotent', () => {
  const h = makeHarness([plate('SP1', 'Soup')], [dish('D1', 'Soup', 'M1')]);
  assert.strictEqual(h.library().length, 1);
  h.heal('D1');
  assert.strictEqual(h.library().length, 1, 'no second plate was minted');
  assert.deepStrictEqual(h.library().map((s) => s.id), ['SP1']);
  assert.strictEqual(h.plan('D1').action, 'linked', 'the second look finds it linked');
  h.heal('D1');
  assert.strictEqual(h.library().length, 1, 'and healing twice still mints nothing');
});

test('228: with no match it still mints an empty plate and links it — v55 §B is unchanged', () => {
  const h = makeHarness([plate('SP1', 'Chowder')], [dish('D1', 'Soup', 'M1')]);
  const { sp, m } = h.heal('D1');
  assert.ok(sp && sp.id && sp.id !== 'SP1', 'a NEW plate');
  assert.deepStrictEqual(sp.lines, [], 'empty — "not costed yet", never a $0.00 cost');
  assert.strictEqual(m.plateId, sp.id);
});

/* `ask` reaching ensurePlateForDish would be a caller bug — loadMenuItemBlank routes it to the picker.
   It MINTS rather than picking one, which is the conservative half of Max's answer honoured at the
   wrong door: never guess between several. Pinned so a later refactor cannot make it "helpful". */
test('228: reaching the heal with several candidates mints rather than guessing', () => {
  const h = makeHarness([plate('SP1', 'Soup'), plate('SP2', 'Soup')], [dish('D1', 'Soup', 'M1')]);
  const { sp } = h.heal('D1');
  assert.ok(sp.id !== 'SP1' && sp.id !== 'SP2', 'neither candidate was chosen for the user');
  assert.deepStrictEqual(sp.lines, []);
});

/* ---- 5. the write is sequenced, both ways ---- */

/* menu_items.plate_id -> plates.id is this app's only FK that can error, so the referenced row goes
   first. A relink uses the SAME writer as a mint, deliberately: the plate upsert is idempotent, and it
   closes the one case a dish-only write would hit 23503 on — a plate created this session whose own
   push never landed. */
test('228: a relink and a mint both write through dbPushMenuAfterPlate, plate first', () => {
  const relink = makeHarness([plate('SP1', 'Soup')], [dish('D1', 'Soup', 'M1')]);
  relink.heal('D1');
  assert.deepStrictEqual(relink.writes(), ['SP1<-D1'],
    'the relink sends the PLATE with the dish, not the dish alone — a plate whose own push never landed would 23503');

  const mint = makeHarness([], [dish('D1', 'Soup', 'M1')]);
  const { sp } = mint.heal('D1');
  assert.deepStrictEqual(mint.writes(), [sp.id + '<-D1'], 'the mint writes the same way');
});
