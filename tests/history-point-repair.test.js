/*
 * history-point-repair.test.js — consolidated item 89, the client half.
 *
 * WHAT THIS IS FOR. `logHistory` appends a food-cost reading and nothing in the app has ever removed
 * one, so a point written while a price was typed wrong is permanent from the user's side. Batch 241
 * shipped the BOUND that stops such a point distorting the average, and deliberately did not build
 * this: the bound is arithmetic, this is a destructive write surface. Batch 250 shipped the server
 * half and found a hole rather than a gap — `price_history` carried a permissive `FOR ALL` policy, so
 * any member including STAFF could delete the café's history, while its sibling permitted no delete
 * at all. Both are owner-only now.
 *
 * ⚠️ BOTH FOOD-COST SERIES LIVE IN `price_history`, and the comment block at the top of `js/app.js`
 * said otherwise until this batch. `priceHistory` is the all-menus series (`menu_id` null) and
 * `menuHistory` is the per-menu map (`menu_id` set); `menu_price_history` is a different thing
 * entirely — the per-DISH SELL PRICE. Measured on production: 167 all-menus rows and 229 per-menu
 * rows in `price_history`, 183 in `menu_price_history`.
 *
 * ⚠️ AND "CORRECT" IS DELIBERATELY NOT BUILT, only "remove". The item says "delete or correct". A
 * stored point is a MEASUREMENT of what the average was at a moment. Editing one to a value nobody
 * measured turns the series into an assertion, and there is no number to correct it TO: if the price
 * behind it was a typo, the reading was not "really" anything. Removing says the reading was garbage,
 * which is true; correcting says the reading was X, which is not. Both production points are
 * artefacts of an 8 Sep audit, not mis-valued readings.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn, extractVar } = require('./_extractfn');

const SRC = loadApp();

/* The real functions over injected state. `badHistoryPoints` reads two module-level series and one
   constant; nothing is stubbed, so the test and the app answer the same question. */
function build(ph, mh, ml) {
  // eslint-disable-next-line no-new-func
  return new Function('priceHistory', 'menuHistory', 'menusList', `
    "use strict";
    ${extractVar(SRC, 'FOOD_COST_SANE_MAX')}
    ${extractFn(SRC, 'ptMs')}
    ${extractFn(SRC, 'badHistoryPoints')}
    ${extractFn(SRC, 'historyPointScopeLabel')}
    ${extractFn(SRC, 'historyPointWhen')}
    ${extractFn(SRC, 'historyPointLabel')}
    return { bad: badHistoryPoints, label: historyPointLabel, scope: historyPointScopeLabel };
  `)(ph, mh, ml);
}
/* The ?? defaults are HERE and not inside `build`, so a test can deliberately hand the real function
   a null series — which is what the mutation gate asked for, and which `pick`'s `|| {}` had been
   quietly preventing any test from doing. */
function pick(state) {
  return build(state.priceHistory || [], state.menuHistory || {}, state.menusList || []);
}

const T = (iso) => new Date(iso).getTime();

test('a reading above the bound is offered, from BOTH series', () => {
  const api = pick({
    priceHistory: [{ t: T('2026-09-01T00:00:00Z'), v: 28.4 }, { t: T('2026-09-08T09:37:12Z'), v: 354.4 }],
    menuHistory: { 'MENUgood': [{ t: T('2026-09-02T00:00:00Z'), v: 31 }],
                   'MENUbad': [{ t: T('2026-09-08T09:37:12Z'), v: 30000 }] }
  });
  const bad = api.bad();
  assert.equal(bad.length, 2, 'the two real production points, one per series');
  assert.deepEqual(bad.map((p) => p.menuId), [null, 'MENUbad'], 'the all-menus one carries a null menu id');
  assert.deepEqual(bad.map((p) => p.v), [354.4, 30000]);
});

test('⚠️ a reading INSIDE the band is never offered, however wrong it later turned out to be', () => {
  /* The selection rule in one assertion. A point in the band is a real reading of a real state, even
     if the price behind it was corrected afterwards. Offering the whole series would turn a
     measurement into an opinion and put every genuine reading one tap from gone. */
  const api = pick({
    priceHistory: [{ t: T('2026-09-01T00:00:00Z'), v: 28.4 }, { t: T('2026-09-02T00:00:00Z'), v: 299.9 },
                   { t: T('2026-09-03T00:00:00Z'), v: 300 }]
  });
  assert.deepEqual(api.bad(), [], 'nothing at or below the bound is a candidate');
});

test('it reuses FOOD_COST_SANE_MAX rather than a second threshold', () => {
  /* If this ever stops being the same number the chart clamps to and the average excludes, the app
     can apologise on screen for a reading this surface will not offer to remove. One question, one
     answer — the defect this repo records more than any other. */
  const MAX = Number(/var FOOD_COST_SANE_MAX\s*=\s*(\d+)/.exec(SRC)[1]);
  const api = pick({ priceHistory: [{ t: T('2026-09-01T00:00:00Z'), v: MAX + 0.1 },
                                    { t: T('2026-09-02T00:00:00Z'), v: MAX }] });
  assert.equal(api.bad().length, 1, 'strictly above, and the boundary value is kept');
  assert.equal(api.bad()[0].v, MAX + 0.1);
});

test('a non-numeric or infinite reading is not a candidate', () => {
  /* `isFinite('')` is TRUE and `Number(null)` is 0 — this repo's oldest defect family. A point whose
     value is a blank string must not be compared against the bound at all. */
  const api = pick({
    priceHistory: [{ t: T('2026-09-01T00:00:00Z'), v: '' }, { t: T('2026-09-02T00:00:00Z'), v: null },
                   { t: T('2026-09-03T00:00:00Z'), v: Infinity }, { t: T('2026-09-04T00:00:00Z'), v: '9999' }]
  });
  assert.deepEqual(api.bad(), [], 'only a real number can be above a bound');
});

test('the points come back oldest first, across both series', () => {
  const api = pick({
    priceHistory: [{ t: T('2026-09-09T00:00:00Z'), v: 900 }],
    menuHistory: { M: [{ t: T('2026-09-03T00:00:00Z'), v: 800 }] }
  });
  assert.deepEqual(api.bad().map((p) => p.v), [800, 900]);
});

test('a point whose `t` is an ISO string sorts with one whose `t` is epoch ms', () => {
  /* The duality `ptMs` exists for: a point logged by this device carries a string, one that came back
     from Supabase carries a number, and both are in memory at once after a merge. */
  const api = pick({
    priceHistory: [{ t: '2026-09-09T00:00:00.000Z', v: 900 }],
    menuHistory: { M: [{ t: T('2026-09-03T00:00:00Z'), v: 800 }] }
  });
  assert.deepEqual(api.bad().map((p) => p.v), [800, 900], 'string and number compare on the same axis');
});

/* ---------- what the confirm says, which is the whole of what the user judges ---------- */

test('⚠️ the label names the series, the day and the value', () => {
  const api = pick({
    priceHistory: [{ t: T('2026-09-08T09:37:12Z'), v: 354.4 }],
    menusList: []
  });
  const label = api.label(api.bad()[0]);
  assert.match(label, /All menus/, 'which series');
  assert.match(label, /2026/, 'which day');
  assert.match(label, /354\.4%/, 'and what it reads — an "are you sure?" that names no reading cannot be answered');
});

test('a per-menu point names its menu', () => {
  const api = pick({
    menuHistory: { M1: [{ t: T('2026-09-08T00:00:00Z'), v: 900 }] },
    menusList: [{ id: 'M1', name: 'Winter Menu' }]
  });
  assert.match(api.label(api.bad()[0]), /Winter Menu/);
});

test('⚠️ a point whose menu is GONE says so, rather than printing an id', () => {
  /* The commonest reason a reading is junk in the first place is that the menu behind it was an
     artefact — which is exactly the second of the two real production points. A raw `MENUmtsh5o3t…`
     in a confirm is not something anyone can make a decision about. */
  const api = pick({
    menuHistory: { 'MENUmtsh5o3t-1-9v3bvrqw': [{ t: T('2026-09-08T09:37:12Z'), v: 30000 }] },
    menusList: [{ id: 'M1', name: 'Winter Menu' }]
  });
  const label = api.label(api.bad()[0]);
  assert.match(label, /no longer exists/);
  assert.doesNotMatch(label, /MENUmtsh5o3t/, 'the id is never shown to a person');
});

/* ---------- the write, and the order it happens in ---------- */

test('⚠️ the delete helper RETURNS its write', () => {
  /* CLAUDE.md's data-write rule: a `dbDelete*` helper that swallows its promise cannot be sequenced
     by anyone. Here the caller gates BOTH the in-memory removal and the change-log entry on it. */
  const body = extractFn(SRC, 'dbDeleteHistoryPoint');
  assert.match(body, /return\s+pushWrite\(/, 'the promise reaches the caller');
});

test('⚠️ the all-menus series is matched with .is(), never .eq(..., null)', () => {
  /* PostgREST renders `.eq('menu_id', null)` as `menu_id=eq.null`, which matches nothing in SQL — so
     the delete would return success and remove NOTHING. CLAUDE.md records that exact shape: an anon
     UPDATE or DELETE returning 204 with no error and touching nothing. */
  const body = extractFn(SRC, 'dbDeleteHistoryPoint');
  assert.match(body, /\.is\('menu_id',\s*null\)/, 'the null branch uses IS NULL');
  assert.doesNotMatch(body, /\.eq\('menu_id',\s*null\)/);
});

test('⚠️ memory is not touched until the server answers', () => {
  /* `pushWrite` DROPS writes when fully offline, so a point spliced out optimistically comes back at
     the next boot with nothing to say it ever left. The removal and the log both sit inside the
     resolved branch, and the error branch returns false without mutating anything. */
  const body = extractFn(SRC, 'removeHistoryPoint');
  const gate = body.indexOf('if(!r || r.error) return false;');
  assert.ok(gate > 0, 'the write is checked before anything local changes');
  assert.ok(body.indexOf('priceHistory=priceHistory.filter') > gate, 'the all-menus splice is after the gate');
  assert.ok(body.indexOf('menuHistory[menuId]=') > gate, 'and so is the per-menu one');
  assert.ok(body.indexOf('logChangeIfSaved') > gate, 'and the log entry');
});

test('⚠️ the removal is RECORDED, and gated on the same promise', () => {
  /* "A history the user can silently edit is a different artefact from one they cannot" is the item's
     own acceptance. `logChangeIfSaved` rather than `logChange` for batch 247's reason: an entry for an
     intervention that did not happen is worse than no entry, because the audit trail is the one
     artefact nobody can check against anything else. */
  const body = extractFn(SRC, 'removeHistoryPoint');
  assert.match(body, /logChangeIfSaved\(write,\s*'history_point_removed'/);
  const kinds = /var CHANGE_KINDS\s*=\s*\[([\s\S]*?)\];/.exec(SRC)[1];
  assert.match(kinds, /'history_point_removed'/, 'and the kind is declared, or changeEntry returns null');
});

test('⚠️ avgBefore is captured BEFORE the write, and equals avgAfter', () => {
  /* The standing rule is to read the average before mutating. Here it genuinely cannot move — the
     headline is computed from PLATES, not from the stored series — so the pair is passed honestly
     rather than omitted. That is also what stops the entry drawing a trend marker it has not earned:
     `trendMarkers` needs `avgBefore > avgAfter`. */
  const body = extractFn(SRC, 'removeHistoryPoint');
  const cap = body.indexOf('var avgBefore=computeAvgFoodCost();');
  const write = body.indexOf('dbDeleteHistoryPoint(');
  assert.ok(cap > 0 && write > cap, 'captured before the write is even issued');
  assert.match(body, /avgBefore:avgBefore,\s*avgAfter:avgBefore/, 'the same figure both sides: nothing moved');
});

test('the row is owner-only AND conditional, and both halves are asked', () => {
  /* `price_history` refuses a non-owner DELETE on the server since batch 250, so offering staff a
     button whose every press fails is the dead control the design protocol forbids. Two conditions
     with two owners, so whichever runs last has to re-ask the other. */
  const body = extractFn(SRC, 'syncHistFixRow');
  assert.match(body, /badHistoryPoints\(\)/, 'is there anything to review');
  assert.match(body, /isOwner\(\)/, 'and may this person review it');
  assert.match(extractFn(SRC, 'applyRoleUi'), /syncHistFixRow/, 'a role change re-decides the row');
});

/* =============================================================================================
 * ⚠️ THE DEFECT THIS BATCH SHIPPED AND THEN FOUND IN A BROWSER
 *
 * `removeHistoryPoint` originally gated on `r.error` alone. Driven at production while SIGNED OUT,
 * the delete came back with NO error, the reading vanished from the screen, and a change-log entry
 * was written saying it had been removed — while the row sat untouched in the database. RLS had
 * refused it silently, which is exactly what `CLAUDE.md` records: "an anon UPDATE or DELETE returns
 * 204 with NO error and touches nothing. A caller checking only for an error would believe it had
 * written."
 *
 * Nothing was lost — the server did its job. What was wrong was the app's ACCOUNT of what happened,
 * and on a surface whose entire purpose is editing the audit trail, that IS the product.
 *
 * No unit test could have caught it: the suite has no Supabase, so there is no refusal to observe.
 * What the tests below pin is the STRUCTURE that makes the refusal visible — the `.select()` that
 * asks for a body, and the caller requiring one.
 * ========================================================================================== */

test('⚠️ the delete asks for the rows back, or the check below can never pass', () => {
  /* PostgREST returns a body on a DELETE only when `.select()` is chained. A helper that omits it
     makes `writeLanded` permanently false — so this assertion and the next are a PAIR, and neither
     is meaningful alone. */
  const body = extractFn(SRC, 'dbDeleteHistoryPoint');
  assert.match(body, /\.select\(\)/, 'no body, no proof the delete touched anything');
});

test('⚠️ an empty result is treated as a FAILURE, not a success', () => {
  const body = extractFn(SRC, 'removeHistoryPoint');
  assert.match(body, /if\(!writeLanded\(r\)\)/, 'the shared predicate, not a second copy of it');
  const gate = body.indexOf('writeLanded(r)');
  assert.ok(body.indexOf('priceHistory=priceHistory.filter') > gate, 'memory is spliced only after it');
  assert.ok(body.indexOf('logChangeIfSaved') > gate, 'and the audit entry is written only after it');
});

test('⚠️ the failure SAYS something — a silent refusal is how this got shipped', () => {
  const body = extractFn(SRC, 'removeHistoryPoint');
  assert.match(body, /toast\(/, 'the user is told the reading is still there');
});

test('writeLanded is one predicate with two callers, not two copies', () => {
  /* It was `teamWriteLanded`, written for the invite flow in 191. The history delete hit the
     identical shape. A second implementation is written from the same belief as the first and agrees
     with it right up to the day it does not. */
  const fn = extractFn(SRC, 'writeLanded');
  assert.match(fn, /res\.data && res\.data\.length/, 'a row came back');
  assert.match(fn, /!res\.error/, 'and no error');
  const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '');
  const callers = (CODE.match(/writeLanded\(/g) || []).length;
  assert.ok(callers >= 3, `one definition and at least two call sites, found ${callers} mentions`);
  assert.doesNotMatch(CODE, /teamWriteLanded/, 'the old name is gone, not shadowed by a duplicate');
});

test('⚠️ the per-menu boundary is the same as the all-menus one', () => {
  /* The bound is tested twice because it is WRITTEN twice — once per loop — and the gate found the
     per-menu copy unpinned. Two spellings of one rule is the shape this repo records most; asserting
     only the first would let them drift by exactly one reading. */
  const MAX = Number(/var FOOD_COST_SANE_MAX\s*=\s*(\d+)/.exec(SRC)[1]);
  const api = pick({ menuHistory: { M: [{ t: T('2026-09-01T00:00:00Z'), v: MAX },
                                        { t: T('2026-09-02T00:00:00Z'), v: MAX + 0.1 }] } });
  assert.equal(api.bad().length, 1, 'strictly above here too');
  assert.equal(api.bad()[0].v, MAX + 0.1);
});

test('a null per-menu map is survivable, not a crash', () => {
  /* `menuHistory` is a module-level `var`, so it is `undefined` before bootstrapSync assigns it and
     could be handed back as null by a future merge. `Object.keys(null)` throws, and this surface is
     reached from Settings — a throw here takes the whole render with it. */
  assert.doesNotThrow(() => build([{ t: T('2026-09-01T00:00:00Z'), v: 900 }], null, []).bad());
  assert.equal(build([{ t: T('2026-09-01T00:00:00Z'), v: 900 }], null, []).bad().length, 1,
    'and the all-menus series is still read');
  assert.doesNotThrow(() => build([], undefined, []).bad());
});
