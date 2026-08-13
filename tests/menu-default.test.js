/*
 * menu-default.test.js — batch 184. The default menu, and the id it no longer hard-codes.
 *
 * TWO defects lived under one literal, and only one of them was the collision.
 *
 *  1. `MENU_ORIGINAL` was minted by `ensureDefaultMenu` and fallen back to in twenty places, one of
 *     which — `menuToRow` — wrote it into `menu_items.menu_id`, a FOREIGN KEY to `menus(id)`. That row
 *     exists for exactly one cafe (Scoopy's, where it predates the code). For anyone else the write is
 *     23503; and after batch 182's policies it is worse than an error, because FK validation runs as
 *     the constraint owner and BYPASSES RLS — so a second cafe's dish can be accepted against
 *     SCOOPY'S menu row, a row that cafe cannot read. Saved, no error, invisible forever.
 *
 *  2. `ensureDefaultMenu` seeds `menusList` IN MEMORY and nothing has ever pushed the row. For a
 *     brand-new cafe it is not even called: `bootstrapSync` seeds only when the `menus` table did not
 *     answer at all, and an empty table answers fine. So the first dish is published with no menu.
 *
 * Both are fixed here: the seed id is minted, both row mappers pass null through untouched, and
 * `ensurePublishMenu` creates a real menu row — CONFIRMED before the dish write is issued — at the
 * point of first need. Zero menus stays a legitimate state at boot (hard rule 7); it just is not a
 * state you can publish from.
 *
 * The sequencing assertions below deliberately do NOT record call order. CLAUDE.md: "a test that
 * records call ORDER passes against the broken code" — dispatching two writes in the right order and
 * awaiting neither produces the same trace as sequencing them. They assert instead that the dependent
 * call has not been ISSUED while the menu write is still pending.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn, extractVar } = require('./_extractfn');

const SRC = loadApp();

/* A sandbox holding the REAL menu-default functions, with only the boundaries stubbed: the Supabase
   write, the repaint, and the two DOM things the error path touches. `menusList` and the deferred
   write are controlled per test. */
function harness(opts = {}) {
  const S = { pushes: [], repaints: 0, errText: null, errShown: false, stored: null };
  let resolveWrite;
  const writeSettled = new Promise((r) => { resolveWrite = r; });

  const factory = new Function('S', 'WRITE', 'START', `
    "use strict";
    var menusList = START.menus;
    var currentMenuId = START.current;
    var localStorage = { getItem:function(){ return START.stored; },
                         setItem:function(k,v){ S.stored = v; } };
    var document = { getElementById:function(id){
      return (id === START.errBoxId) ? { set textContent(t){ S.errText = t; },
                                         style:{ set display(d){ S.errShown = (d === 'block'); } } } : null;
    } };
    function dbUpsertMenuRecord(rec){ S.pushes.push(rec); return WRITE; }
    function buildMenuSelector(){ S.repaints++; }
    ${extractVar(SRC, '_uidSeq')}
    ${extractFn(SRC, 'uidRandom')}
    ${extractFn(SRC, 'uid')}
    ${extractVar(SRC, 'DEFAULT_MENU_NAME')}
    ${extractFn(SRC, 'ensureDefaultMenu')}
    ${extractFn(SRC, 'fallbackMenuId')}
    ${extractFn(SRC, 'loadCurrentMenuId')}
    ${extractFn(SRC, 'setCurrentMenuId')}
    ${extractFn(SRC, 'menuNameById')}
    ${extractFn(SRC, 'menuIdOf')}
    ${extractVar(SRC, '_ensureMenuInFlight')}
    ${extractFn(SRC, 'ensurePublishMenu')}
    ${extractFn(SRC, 'withPublishMenu')}
    return {
      ensureDefaultMenu:ensureDefaultMenu, ensurePublishMenu:ensurePublishMenu,
      withPublishMenu:withPublishMenu, fallbackMenuId:fallbackMenuId,
      loadCurrentMenuId:loadCurrentMenuId, menuNameById:menuNameById, menuIdOf:menuIdOf,
      DEFAULT_MENU_NAME:DEFAULT_MENU_NAME,
      menus:function(){ return menusList; }, current:function(){ return currentMenuId; }
    };
  `);

  const api = factory(S, writeSettled, {
    menus: opts.menus || [],
    current: opts.current === undefined ? null : opts.current,
    stored: opts.stored === undefined ? null : opts.stored,
    errBoxId: 'mi_err',
  });
  return { api, S, resolveWrite };
}

/* ---------------------------------------------------------------------------
   1. The id is minted, not named.
   --------------------------------------------------------------------------- */

test('184: the seeded default menu carries a MINTED id, never a hard-coded one', () => {
  const a = harness().api; a.ensureDefaultMenu();
  const b = harness().api; b.ensureDefaultMenu();
  const idA = a.menus()[0].id, idB = b.menus()[0].id;

  assert.notStrictEqual(idA, 'MENU_ORIGINAL', 'a hard-coded id is what two cafes collide on');
  // A WHOLE-VALUE comparison, not a substring: 183(b) is the incident where gluing a prefix onto
  // either end of a key left a substring assertion green through the exact change it forbade.
  assert.notStrictEqual(idA, idB, 'two cafes seeding their first menu must not land on the same id');
  assert.match(idA, /^MENU/, 'still recognisably a menu id — uid() keeps the prefix');
  assert.ok(idA.includes('-'), 'the uid() separator, which is what can never collide with a legacy id');
});

test('184: the seed still respects a menus list that already has something in it', () => {
  const { api } = harness({ menus: [{ id: 'MENU-abc', name: 'Winter', season: null }] });
  api.ensureDefaultMenu();
  assert.strictEqual(api.menus().length, 1, 'never seeds over a real menu — hard rule 7');
});

test('184: the seeded name is the ONE constant every path promises', () => {
  const { api } = harness();
  api.ensureDefaultMenu();
  assert.strictEqual(api.menus()[0].name, api.DEFAULT_MENU_NAME);
});

/* ---------------------------------------------------------------------------
   2. Nothing falls back to a menu id any more.
   --------------------------------------------------------------------------- */

test('184: fallbackMenuId answers the first menu, and null when there is none', () => {
  assert.strictEqual(harness().api.fallbackMenuId(), null, 'zero menus is a legitimate state');
  const { api } = harness({ menus: [{ id: 'MENU-w' }, { id: 'MENU-s' }] });
  assert.strictEqual(api.fallbackMenuId(), 'MENU-w');
});

test('184: loadCurrentMenuId returns null on a fresh device, not a menu nobody has', () => {
  assert.strictEqual(harness().api.loadCurrentMenuId(), null);
  assert.strictEqual(harness({ stored: 'MENU-x' }).api.loadCurrentMenuId(), 'MENU-x');
});

test('184: menuNameById names only a menu that exists', () => {
  const { api } = harness({ menus: [{ id: 'MENU-w', name: 'Winter' }] });
  assert.strictEqual(api.menuNameById('MENU-w'), 'Winter');
  assert.strictEqual(api.menuNameById('MENU-gone'), '', 'a name for a menu nobody has is a guess dressed as a fact');
  assert.strictEqual(api.menuNameById(null), '');
});

test('184: menuIdOf answers a dish’s menu, or null — it never invents one', () => {
  const { api } = harness();
  assert.strictEqual(api.menuIdOf({ menuId: 'MENU-w' }), 'MENU-w');
  assert.strictEqual(api.menuIdOf({ menuId: null }), null);
  assert.strictEqual(api.menuIdOf({}), null);
  assert.strictEqual(api.menuIdOf(null), null, 'total, like plateIdOf — a bad call site gets null, not a throw');
});

/* ---------------------------------------------------------------------------
   3. The first dish in a cafe with no menu — SEQUENCED, not merely ordered.
   --------------------------------------------------------------------------- */

test('184: with no menus, the dependent action is NOT ISSUED while the menu write is pending', async () => {
  const { api, S, resolveWrite } = harness();
  let ran = 0;
  const done = api.withPublishMenu('mi_err', () => { ran++; });

  await Promise.resolve(); await Promise.resolve();          // let every already-queued microtask drain
  assert.strictEqual(S.pushes.length, 1, 'the menu write went out');
  assert.strictEqual(ran, 0,
    'THE POINT: the dish must not be issued while the menu row is unconfirmed — menu_items.menu_id references menus(id)');

  resolveWrite({ data: [{ id: S.pushes[0].id }] });
  await done;
  assert.strictEqual(ran, 1, 'and it runs once the menu is confirmed');
  assert.strictEqual(api.menus().length, 1, 'the menu is now in memory too');
  assert.strictEqual(api.current(), S.pushes[0].id, 'and it is the menu being published onto');
  assert.strictEqual(S.repaints, 1, 'the selector was rebuilt, so the picker can offer it');
});

test('184: a FAILED menu write never runs the dependent action, and says so in the modal', async () => {
  const { api, S, resolveWrite } = harness();
  let ran = 0;
  const done = api.withPublishMenu('mi_err', () => { ran++; });
  resolveWrite({ error: { message: 'permission denied' } });
  await done;

  assert.strictEqual(ran, 0, 'no dish may be written against a menu that did not land');
  assert.strictEqual(api.menus().length, 0, 'and memory must not claim a menu the server refused');
  assert.strictEqual(api.current(), null);
  assert.ok(S.errShown && /nothing was saved/i.test(S.errText),
    'the user is told the thing did not save — CLAUDE.md: they would rather be told than find out next week');
});

test('184: a REJECTED menu write is the same answer as a refused one, not an unhandled throw', async () => {
  const { api, S, resolveWrite } = harness();
  let ran = 0;
  const done = api.withPublishMenu('mi_err', () => { ran++; });
  resolveWrite(Promise.reject(new Error('network')));
  await done;
  assert.strictEqual(ran, 0);
  assert.strictEqual(api.menus().length, 0);
  assert.ok(S.errShown);
});

test('184: a double-tap creates ONE menu, not two', async () => {
  const { api, S, resolveWrite } = harness();
  let ran = 0;
  const a = api.withPublishMenu('mi_err', () => { ran++; });
  const b = api.withPublishMenu('mi_err', () => { ran++; });

  await Promise.resolve(); await Promise.resolve();
  assert.strictEqual(S.pushes.length, 1, 'the in-flight promise is shared — two menus is the bug this guards');

  resolveWrite({ data: [{ id: S.pushes[0].id }] });
  await Promise.all([a, b]);
  assert.strictEqual(api.menus().length, 1);
});

test('184: a retry after a failure is allowed — the memo is cleared on both settle paths', async () => {
  const { api, S, resolveWrite } = harness();
  const first = api.withPublishMenu('mi_err', () => {});
  resolveWrite({ error: { message: 'offline' } });
  await first;
  assert.strictEqual(S.pushes.length, 1);

  // A second attempt must actually attempt something, or the modal is dead until reload.
  api.ensurePublishMenu();
  await Promise.resolve();
  assert.strictEqual(S.pushes.length, 2, 'a stuck memo would silently swallow every retry');
});

/* Written because the test above SURVIVED the mutation that stops clearing the memo. It resolves with
   `{error}`, which is the FULFILLED handler — supabase-js resolves with {error} rather than rejecting —
   so it never touched the rejection arm, and deleting `_ensureMenuInFlight=null` from that arm left it
   green. Two settle paths, two clears, two tests. (CLAUDE.md's roster is 16 incidents of a test that
   could not fail; this one was caught by running the mutation, which is the whole point of running it.) */
test('184: a retry after a REJECTED write is allowed too — the other settle path clears the memo', async () => {
  const { api, S, resolveWrite } = harness();
  const first = api.withPublishMenu('mi_err', () => {});
  resolveWrite(Promise.reject(new Error('network')));
  await first;
  assert.strictEqual(S.pushes.length, 1);

  api.ensurePublishMenu();
  await Promise.resolve();
  assert.strictEqual(S.pushes.length, 2, 'a network throw must not wedge the button until reload');
});

test('184: with a menu already present nothing is created and the action runs SYNCHRONOUSLY', () => {
  const { api, S } = harness({ menus: [{ id: 'MENU-w', name: 'Winter' }], current: 'MENU-w' });
  let ran = 0;
  api.withPublishMenu('mi_err', () => { ran++; });

  // Not `await`ed on purpose. The submit handlers are extracted and driven synchronously by
  // publish-guard.test.js and change-log.test.js; if this path ever became async, every one of those
  // assertions would start racing its own subject and the failures would look like flakes.
  assert.strictEqual(ran, 1, 'the normal path must not be deferred to a microtask');
  assert.strictEqual(S.pushes.length, 0, 'and nothing is written');
});

test('184: ensurePublishMenu answers the CURRENT menu when there is one, falling back to the first', async () => {
  const withCurrent = harness({ menus: [{ id: 'MENU-w' }, { id: 'MENU-s' }], current: 'MENU-s' });
  assert.strictEqual(await withCurrent.api.ensurePublishMenu(), 'MENU-s');

  const stale = harness({ menus: [{ id: 'MENU-w' }, { id: 'MENU-s' }], current: null });
  assert.strictEqual(await stale.api.ensurePublishMenu(), 'MENU-w');
});

/* ---------------------------------------------------------------------------
   4. The handlers refuse on their own, so the gate is not only in the wiring.
   --------------------------------------------------------------------------- */

test('184: BOTH dish-creating handlers refuse a falsy menu before writing anything', () => {
  // Source-level, because the alternative is standing up two large DOM harnesses to prove a guard
  // clause exists. What makes this non-vacuous is the ORDER assertion: the refusal must come before
  // the write, and it is checked by position, not by mere presence.
  ['submitMenuItem', 'submitAddDish'].forEach((name) => {
    const fn = extractFn(SRC, name);
    const guard = fn.search(/if\(!(chosenMenu|currentMenuId)\)\{?\s*(if\(err\)\{)?err\.textContent='There’s no menu/);
    assert.ok(guard > 0, `${name} must refuse when there is no menu to publish onto`);
    const write = fn.indexOf('publishPlan(');
    assert.ok(write > 0 && guard < write,
      `${name}'s refusal must come BEFORE the publish decision — a guard after the write guards nothing`);
  });
});

/* ---------------------------------------------------------------------------
   5. The two pre-push review findings.
   --------------------------------------------------------------------------- */

/* FINDING 1. withPublishMenu decides whether a menu needs creating by asking `menusList.length`, so
   that list has to mean "menus the server has". submitNewMenu broke it: it pushed optimistically and
   DROPPED the write's promise, so a refused menu stayed in memory, the gate waved every later dish
   through, and the dish referenced a menus row that does not exist. The route is real and is the one
   a new cafe takes first: openPublishModal refuses at zero menus and diverts to the new-menu modal. */
function newMenuHarness(writeResult) {
  const S = { toasts: [], pushes: [], repaints: 0 };
  let settle;
  const write = new Promise((r) => { settle = r; });
  const factory = new Function('S', 'WRITE', `
    "use strict";
    var menusList = [];
    var currentMenuId = null;
    var localStorage = { getItem:function(){return null;}, setItem:function(){} };
    var fields = { nm_name:'Winter', nm_season:'', nm_err:{ textContent:'', style:{} } };
    var document = { getElementById:function(id){
      if(id === 'nm_err') return fields.nm_err;
      if(id in fields) return { value: fields[id] };
      return null;
    } };
    function dbUpsertMenuRecord(rec){ S.pushes.push(rec); return WRITE; }
    function buildMenuSelector(){ S.repaints++; }
    function renderAnalysis(){}
    function closeNewMenuModal(){}
    function toast(t){ S.toasts.push(t); }
    ${extractVar(SRC, '_uidSeq')}
    ${extractFn(SRC, 'uidRandom')}
    ${extractFn(SRC, 'uid')}
    ${extractFn(SRC, 'fallbackMenuId')}
    ${extractFn(SRC, 'setCurrentMenuId')}
    ${extractFn(SRC, 'submitNewMenu')}
    return { submitNewMenu:submitNewMenu, menus:function(){ return menusList; },
             current:function(){ return currentMenuId; } };
  `);
  return { api: factory(S, write), S, settle: () => settle(writeResult) };
}

test('184 (review): a REFUSED new menu is taken back out of menusList, not left for the gate to trust', async () => {
  const { api, S, settle } = newMenuHarness({ error: { message: 'permission denied' } });
  api.submitNewMenu();
  assert.strictEqual(api.menus().length, 1, 'optimistic push happens first, as every other path does');

  settle();
  await new Promise((r) => setTimeout(r, 0));

  assert.strictEqual(api.menus().length, 0,
    'THE POINT: menusList must mean "menus the server has" — withPublishMenu reads its length as exactly that');
  assert.strictEqual(api.current(), null, 'and the current menu cannot point at one that was rolled back');
  assert.ok(S.toasts.some((t) => /not saved/i.test(t)), 'the user is told, and told what it cost');
  assert.ok(!S.toasts.some((t) => /menu created/i.test(t)), 'a refused menu was never created');
});

test('184 (review): a menu the server KEPT stays, and only then says it was created', async () => {
  const { api, S, settle } = newMenuHarness({ data: [{ id: 'x' }] });
  api.submitNewMenu();
  settle();
  await new Promise((r) => setTimeout(r, 0));

  assert.strictEqual(api.menus().length, 1);
  assert.strictEqual(api.current(), api.menus()[0].id);
  assert.ok(S.toasts.some((t) => /menu created/i.test(t)));
  assert.ok(!S.toasts.some((t) => /not saved/i.test(t)));
});

/* FINDING 2. Removing the 'MENU_ORIGINAL' fallback INTRODUCED a hazard the old code could not have:
   both sides of the membership test can now be null, and null===null is true. So an orphaned dish
   read as being on the no-menu, at exactly the moment the screen is meant to be empty. */
test('184 (review): a dish on no menu is not "on" the no-menu — null never equals null here', () => {
  const { api } = harness();
  const factory = new Function(`
    "use strict";
    ${extractFn(SRC, 'menuIdOf')}
    ${extractFn(SRC, 'dishOnMenu')}
    return dishOnMenu;
  `);
  const dishOnMenu = factory();

  assert.strictEqual(dishOnMenu({ menuId: null }, null), false,
    'THE POINT: zero menus means currentMenuId is null, and an orphan must not match it');
  assert.strictEqual(dishOnMenu({}, null), false);
  assert.strictEqual(dishOnMenu({ menuId: null }, 'MENU-w'), false);
  assert.strictEqual(dishOnMenu({ menuId: 'MENU-w' }, null), false);
  assert.strictEqual(dishOnMenu({ menuId: 'MENU-w' }, 'MENU-w'), true, 'and a real match still matches');
  assert.strictEqual(api.menuIdOf({ menuId: 'MENU-w' }), 'MENU-w', 'menuIdOf itself is unchanged');
});

test('184 (review): every menu-membership test in the app goes through dishOnMenu', () => {
  // A bare `menuIdOf(x)===<menu>` is the spelling that reintroduces the null match, so it is the
  // thing to forbid — not merely to have fixed at the three sites that had it.
  const code = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const bare = code.match(/menuIdOf\([^)]*\)\s*[!=]==/g) || [];
  assert.deepStrictEqual(bare, [],
    'compare through dishOnMenu — a direct === can match null against null when there are no menus');
});

test('184: both Publish buttons are wired through withPublishMenu', () => {
  assert.match(SRC, /getElementById\('menuSave'\)\.addEventListener\('click',function\(\)\{ withPublishMenu\('mi_err', submitMenuItem\); \}\)/,
    'the Plates → Publish button');
  assert.match(SRC, /addEventListener\('click',function\(\)\{ withPublishMenu\('ad_err', submitAddDish\); \}\)/,
    'the Menu → Add existing plate button');
});
