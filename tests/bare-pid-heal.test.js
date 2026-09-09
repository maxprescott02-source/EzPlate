/*
 * bare-pid-heal.test.js — 239 (queue item 16). The legacy bare-pid heal.
 *
 * THE DEFECT, measured on production on 8 Sep 2026: a plate line is {kid,qty} — which resolves
 * through the kitchen ingredient, so a relink moves it — or legacy {pid,qty}, which resolves
 * straight through byId and NOTHING moves it. `saveKingModal` writes `k.pid` and only `k.pid`, so
 * "changing the product updates all of them" was true of one arm and false for 44 lines across 11
 * plates. The whole of §2 below is that sentence, driven against the real resolver.
 *
 * WHAT MAKES THE HEAL SAFE, and it is the property every test here is really pinning: it rewrites
 * {pid:P} to {kid:K} only where K.pid IS ALREADY P, so lineProduct returns the same product before
 * and after and every plate costs exactly what it costed a moment earlier. A heal that could move a
 * number would be a different item. §2's second test is that identity, and the offline rehearsal in
 * the handover is the same assertion run over all 103 real plates.
 *
 * WHAT IT REFUSES TO DO: a pid owned by NO ingredient, or by TWO, is left alone and reported. The
 * only way to heal those is to guess which ingredient a line meant, and a wrong guess is a silently
 * wrong cost — the one thing this app must never produce. 13 of the 44 are that case.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn, extractVar } = require('./_extractfn');

const SRC = loadApp();

/* The planner and its two readers, extracted alone: no DOM, no globals, no clock. */
const pure = new Function(`"use strict";
  ${extractFn(SRC, 'barePidPlan')}
  ${extractFn(SRC, 'barePidFixCount')}
  ${extractFn(SRC, 'barePidHealMessage')}
  return {barePidPlan:barePidPlan, barePidFixCount:barePidFixCount, barePidHealMessage:barePidHealMessage};
`)();

/* barePidLinesFor reads savedPlates off the enclosing scope, so it gets its own tiny harness. */
function linesFor(savedPlates, pid) {
  // eslint-disable-next-line no-new-func
  return new Function('SP', 'PID', `"use strict"; var savedPlates=SP;
    ${extractFn(SRC, 'barePidLinesFor')}
    return barePidLinesFor(PID);`)(savedPlates, pid);
}

/* =============================================================================================
 * 1. The plan — what it takes, and everything it refuses
 * ========================================================================================== */

const KINGS = [
  { id: 'K1', name: 'Chips', pid: 'P1' },          // the only owner of P1
  { id: 'K2', name: 'Salt', pid: 'P2' },           // one of TWO owners of P2
  { id: 'K3', name: 'Sea salt', pid: 'P2' },
];

test('a pid exactly one ingredient owns becomes that ingredient, at that line index', () => {
  const plan = pure.barePidPlan([
    { id: 'SP1', name: 'Fish & chips', lines: [{ kid: 'K1', qty: 1 }, { pid: 'P1', qty: 200 }] },
  ], KINGS);
  assert.equal(pure.barePidFixCount(plan), 1);
  assert.deepStrictEqual(plan.fix, [{ plateId: 'SP1', name: 'Fish & chips', moves: [{ i: 1, kid: 'K1' }] }]);
  assert.deepStrictEqual(plan.orphan, [], 'nothing was left over');
});

test('a pid NO ingredient owns is left alone and reported — never guessed at', () => {
  const plan = pure.barePidPlan([{ id: 'SP1', name: 'Bacon Bene', lines: [{ pid: 'P_GONE', qty: 2 }] }], KINGS);
  assert.equal(pure.barePidFixCount(plan), 0);
  assert.deepStrictEqual(plan.fix, [], 'a plate with nothing to move is not in the fix list at all');
  assert.deepStrictEqual(plan.orphan, [{ plateId: 'SP1', plate: 'Bacon Bene', pid: 'P_GONE', why: 'none' }]);
});

test('a pid TWO ingredients own is left alone too, and says which of the two reasons it is', () => {
  const plan = pure.barePidPlan([{ id: 'SP1', name: 'Chips', lines: [{ pid: 'P2', qty: 5 }] }], KINGS);
  assert.equal(pure.barePidFixCount(plan), 0);
  assert.equal(plan.orphan.length, 1);
  assert.equal(plan.orphan[0].why, 'ambiguous',
    'the two reasons are told apart because the copy says different things about them');
});

test('misc lines, kid lines and shapeless lines are not the planner’s business', () => {
  const plan = pure.barePidPlan([
    { id: 'SP1', name: 'X', lines: [
      { misc: true, label: 'Packaging', cost: 0.4 },      // carries no reference at all
      { kid: 'K1', qty: 1 },                              // already healed
      { qty: 3 },                                         // neither — broken in a way this cannot mend
      null,
      { kid: 'K1', pid: 'P1', qty: 1 },                   // kid WINS in lineProduct, so it wins here
    ] },
  ], KINGS);
  assert.equal(pure.barePidFixCount(plan), 0);
  assert.deepStrictEqual(plan.orphan, []);
});

test('a plate with no lines array, and no plates at all, plan to nothing rather than throwing', () => {
  assert.equal(pure.barePidFixCount(pure.barePidPlan([{ id: 'SP1' }, null], KINGS)), 0);
  assert.equal(pure.barePidFixCount(pure.barePidPlan(null, null)), 0);
});

test('an ingredient with no pid, no id, or no ingredient at all, owns nothing', () => {
  // Each of these three is a separate arm of the owner guard, and each one wrong in its own way:
  // a null entry throws, an id-less entry would register `undefined` as the owner of P9 and the
  // plan would then rewrite a real line to {kid:undefined} — a line pointing at nothing.
  const plan = pure.barePidPlan([{ id: 'SP1', name: 'X', lines: [{ pid: 'P9', qty: 1 }] }],
    [null, { id: 'K9', name: 'Unlinked', pid: null }, { name: 'No id at all', pid: 'P9' }]);
  assert.equal(pure.barePidFixCount(plan), 0);
  assert.equal(plan.orphan.length, 1);
  assert.equal(plan.orphan[0].why, 'none');
});

/* =============================================================================================
 * 2. The defect itself, and the heal, against the REAL cost path
 * ========================================================================================== */

function costing(kings, savedPlates) {
  const byId = {
    P1: { id: 'P1', description: 'Chips 2kg', base_unit: 'g', cost_per_base_unit: 1 },
    P2: { id: 'P2', description: 'Chips (dearer)', base_unit: 'g', cost_per_base_unit: 2 },
  };
  // eslint-disable-next-line no-new-func
  return new Function('BYID', 'KINGS', 'SP', `"use strict";
    var byId=BYID, kitchenIngredients=KINGS, savedPlates=SP, kById={};
    ${extractFn(SRC, 'rebuildKById')}
    rebuildKById();
    ${extractFn(SRC, 'cpbu')}
    ${extractFn(SRC, 'lineCost')}
    ${extractFn(SRC, 'lineProduct')}
    ${extractFn(SRC, 'costDetail')}
    ${extractFn(SRC, 'costFromLines')}
    ${extractFn(SRC, 'barePidPlan')}
    return {
      cost:function(i){ return costFromLines(savedPlates[i].lines); },
      relink:function(kid,pid){ kById[kid].pid=pid; },
      heal:function(){
        var plan=barePidPlan(savedPlates, kitchenIngredients);
        plan.fix.forEach(function(f){
          var sp=savedPlates.filter(function(s){ return s.id===f.plateId; })[0];
          var lines=sp.lines.slice();
          f.moves.forEach(function(m){ lines[m.i]={kid:m.kid, qty:lines[m.i].qty}; });
          sp.lines=lines;
        });
        return plan;
      },
      lines:function(i){ return savedPlates[i].lines; }
    };`)(byId, kings, savedPlates);
}

const twoArms = () => ([
  { id: 'SP_KID', name: 'By ingredient', lines: [{ kid: 'K1', qty: 10 }] },
  { id: 'SP_BARE', name: 'By product', lines: [{ pid: 'P1', qty: 10 }] },
]);

test('THE DEFECT: a relink moves the kid line and leaves the bare-pid line on the old product', () => {
  const api = costing([{ id: 'K1', name: 'Chips', pid: 'P1' }], twoArms());
  assert.equal(api.cost(0), 10);
  assert.equal(api.cost(1), 10, 'the two arms agree before the relink — that is what hides this');
  api.relink('K1', 'P2');
  assert.equal(api.cost(0), 20, 'the kid line followed');
  assert.equal(api.cost(1), 10, 'and the bare-pid line did not — the whole of item 16');
});

test('THE FIX: after the heal, a relink reaches both arms', () => {
  const api = costing([{ id: 'K1', name: 'Chips', pid: 'P1' }], twoArms());
  api.heal();
  assert.deepStrictEqual(api.lines(1), [{ kid: 'K1', qty: 10 }], 'the qty survives the rewrite');
  api.relink('K1', 'P2');
  assert.equal(api.cost(0), 20);
  assert.equal(api.cost(1), 20, 'both arms now cost off the new product');
});

test('THE SAFETY: the heal itself moves no cost — the product on both sides is the same one', () => {
  const api = costing([{ id: 'K1', name: 'Chips', pid: 'P1' }], twoArms());
  const before = [api.cost(0), api.cost(1)];
  api.heal();
  assert.deepStrictEqual([api.cost(0), api.cost(1)], before,
    'a heal that could move a number would be a different item, and would need Max on the day');
});

test('a heal is idempotent: run twice, the second finds nothing left to do', () => {
  const api = costing([{ id: 'K1', name: 'Chips', pid: 'P1' }], twoArms());
  api.heal();
  const again = api.heal();
  assert.deepStrictEqual(again.fix, []);
  assert.deepStrictEqual(again.orphan, []);
});

/* =============================================================================================
 * 3. barePidLinesFor — the number the ingredient modal has to admit to
 * ========================================================================================== */

test('barePidLinesFor counts LINES and PLATES, and only the bare arm', () => {
  const plates = [
    { id: 'A', lines: [{ pid: 'P1', qty: 1 }, { pid: 'P1', qty: 2 }] },   // two lines, one plate
    { id: 'B', lines: [{ kid: 'K1', qty: 1 }] },                          // the kid arm is not this
    { id: 'C', lines: [{ pid: 'P1', qty: 3 }, { misc: true, cost: 1 }] },
    { id: 'D', lines: [{ pid: 'P_OTHER', qty: 1 }] },
  ];
  assert.deepStrictEqual(linesFor(plates, 'P1'), { lines: 3, plates: 2 });
  assert.deepStrictEqual(linesFor(plates, 'P_NONE'), { lines: 0, plates: 0 });
  assert.deepStrictEqual(linesFor(plates, null), { lines: 0, plates: 0 },
    'an ingredient with no product asks about nothing, and must not match every kid line');
});

/* =============================================================================================
 * 4. The confirm's text — the part Max reads before a bulk write
 * ========================================================================================== */

const PRODUCTS = { P_GONE: { id: 'P_GONE', description: 'Bacon Middle Rindless' }, P2: { id: 'P2', description: 'Salt' } };

test('the message states the size of the fix, and that it costs nothing', () => {
  const plan = pure.barePidPlan([
    { id: 'A', name: 'Fish', lines: [{ pid: 'P1', qty: 1 }, { pid: 'P1', qty: 2 }] },
    { id: 'B', name: 'Chips', lines: [{ pid: 'P1', qty: 1 }] },
  ], KINGS);
  const msg = pure.barePidHealMessage(plan, PRODUCTS);
  assert.match(msg, /^3 lines in 2 plates /, 'both counts, both plural');
  assert.match(msg, /Nothing costs a different amount afterwards\./,
    'the reason this is safe is IN the confirm, not only in a comment');
  assert.ok(!/left alone/.test(msg), 'and no left-alone paragraph when there is nothing left alone');
});

test('one line in one plate is not "1 lines in 1 plates"', () => {
  const plan = pure.barePidPlan([{ id: 'A', name: 'Fish', lines: [{ pid: 'P1', qty: 1 }] }], KINGS);
  assert.match(pure.barePidHealMessage(plan, PRODUCTS), /^1 line in 1 plate /);
});

test('the left-alone half groups BY PRODUCT, names the plates, and says which reason', () => {
  const plan = pure.barePidPlan([
    { id: 'A', name: 'Bacon Bene', lines: [{ pid: 'P_GONE', qty: 1 }] },
    { id: 'B', name: 'Scoopy’s Breakfast', lines: [{ pid: 'P_GONE', qty: 1 }, { pid: 'P2', qty: 1 }] },
  ], KINGS);
  const msg = pure.barePidHealMessage(plan, PRODUCTS);
  assert.match(msg, /3 lines will be left alone/);
  assert.match(msg, /• Bacon Middle Rindless — no ingredient uses it: Bacon Bene, Scoopy’s Breakfast/,
    'one bullet for the product, both plates named on it');
  assert.match(msg, /• Salt — two ingredients use it: Scoopy’s Breakfast/,
    'the ambiguous reason reads differently from the orphaned one, because the answer differs');
  assert.match(msg, /Open each plate and swap the line for an ingredient\./);
});

test('a product that is GONE is named by its id rather than crashing or printing "undefined"', () => {
  const plan = pure.barePidPlan([{ id: 'A', name: 'X', lines: [{ pid: 'P_MISSING', qty: 1 }] }], KINGS);
  const msg = pure.barePidHealMessage(plan, PRODUCTS);
  assert.match(msg, /a product that is gone \(P_MISSING\)/);
  assert.ok(!/undefined/.test(msg));
});

/* =============================================================================================
 * 5. The write — one plate at a time, rolled back when the server refuses
 * ========================================================================================== */

function healSandbox(opts) {
  const S = { writes: [], pushed: [], fail: {}, reject: {}, toasts: [], repaints: 0 };
  // eslint-disable-next-line no-new-func
  const factory = new Function('S', `"use strict";
    var savedPlates=${JSON.stringify(opts.savedPlates)};
    var kitchenIngredients=${JSON.stringify(opts.kings)};
    var kById={}; kitchenIngredients.forEach(function(k){ if(k&&k.id) kById[k.id]=k; });
    var byId=${JSON.stringify(opts.byId || {})};
    var MENU=${JSON.stringify(opts.MENU || [])};
    var menusList=${JSON.stringify(opts.menusList || [])};
    var changeLog=[], changeLogSupported=true;
    /* pushWrite's real contract: it ALWAYS resolves, to the result or to {error}. The REJECTION
       arm is stubbed as well, because CLAUDE.md's roster entry 184(a) is exactly a rollback test
       that took only the common settle path. */
    function dbPushPlate(sp){ S.writes.push(sp.id);
      if(S.reject[sp.id]) return Promise.reject(new Error('offline'));
      return Promise.resolve(S.fail[sp.id] ? {error:{message:'42501'}} : {ok:true}); }
    function dbPushChange(e){ S.pushed.push(e); return Promise.resolve({ok:true}); }
    function toast(m){ S.toasts.push(m); }
    /* Counted, not a no-op: this call is what makes the Settings row (and its verb) recompute after
       a heal, and it is the ONLY thing that does. A no-op stub makes "call it" and "do not call it"
       the same program — the note tests/_extract.js carries about stubbing real functions flat. */
    function rerenderCurrentTab(){ S.repaints++; }
    function repaintDashboardIfVisible(){}
    function computeAvgFoodCost(){ throw new Error('the heal must not read the average — it moves none'); }
    ${extractVar(SRC, '_uidSeq')}
    ${extractFn(SRC, 'uidRandom')}
    ${extractFn(SRC, 'uid')}
    ${['plateIdOf', 'dishesOfPlate', 'menuIdOf', 'menusOfPlate', 'menuIdsForPlates',
       'changeEntry', 'nextChangeId', 'logChange',
       'barePidPlan', 'barePidFixCount', 'barePidSameProduct', 'healBarePidPlate', 'applyBarePidHeal']
      .map((n) => extractFn(SRC, n)).join('\n')}
    var CHANGE_KINDS=${JSON.stringify(kindsFromSource())};
    return {
      run:function(){ return applyBarePidHeal(barePidPlan(savedPlates, kitchenIngredients)); },
      runPlan:function(p){ return applyBarePidHeal(p); },
      plan:function(){ return barePidPlan(savedPlates, kitchenIngredients); },
      plates:function(){ return savedPlates; },
      kids:function(){ return kById; },
      log:function(){ return changeLog; }
    };`);
  return { S, api: factory(S) };
}

// Read from source, never restated here: a call site inventing a kind the app does not declare is
// exactly what the closed set exists to stop, and a hand-copied list here would hide it.
function kindsFromSource() {
  const m = SRC.match(/var CHANGE_KINDS\s*=\s*\[([\s\S]*?)\];/);
  if (!m) throw new Error('bare-pid-heal: CHANGE_KINDS not found in app.js');
  return m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
}

const writeCase = () => ({
  kings: [{ id: 'K1', name: 'Chips', pid: 'P1' }],
  savedPlates: [
    { id: 'SP1', name: 'Fish', lines: [{ pid: 'P1', qty: 10 }] },
    { id: 'SP2', name: 'Chips', lines: [{ pid: 'P1', qty: 5 }, { kid: 'K1', qty: 1 }] },
  ],
  MENU: [{ id: 'D1', plateId: 'SP1', menuId: 'M1' }],
  menusList: [{ id: 'M1', name: 'Winter' }],
});

test('one write per touched plate, and the lines are rewritten in memory', async () => {
  const { S, api } = healSandbox(writeCase());
  const r = await api.run();
  assert.deepStrictEqual(S.writes, ['SP1', 'SP2'], 'one dbPushPlate per plate, never one per line');
  assert.deepStrictEqual(r, { plates: 2, lines: 2, failed: 0 });
  assert.deepStrictEqual(api.plates()[0].lines, [{ kid: 'K1', qty: 10 }]);
  assert.deepStrictEqual(api.plates()[1].lines, [{ kid: 'K1', qty: 5 }, { kid: 'K1', qty: 1 }]);
  assert.deepStrictEqual(S.toasts, ['Fixed 2 lines in 2 plates'], 'and it says what it did, plurals and all');
  assert.equal(S.repaints, 1, 'and the screen is repainted, which is what retires the Settings row');
});

test('the success toast counts LINES and PLATES separately, and gets the singulars right', async () => {
  const c = writeCase();
  c.savedPlates = [{ id: 'SP1', name: 'Fish', lines: [{ pid: 'P1', qty: 10 }] }];
  const { S, api } = healSandbox(c);
  await api.run();
  assert.deepStrictEqual(S.toasts, ['Fixed 1 line in 1 plate']);
});

test('one change-log entry per plate the SERVER TOOK, and every figure on it is null', async () => {
  const { api } = healSandbox(writeCase());
  await api.run();
  const log = api.log();
  assert.equal(log.length, 2, 'per plate — not one for the batch, and not one per line');
  assert.deepStrictEqual([...new Set(log.map((e) => e.kind))], ['plate_relinked']);
  assert.ok(kindsFromSource().includes('plate_relinked'), 'and the app declares that kind');
  const e = log[0];
  assert.deepStrictEqual([e.avgBefore, e.avgAfter, e.costBefore, e.costAfter], [null, null, null, null],
    'the heal moves no cost, so a figure here would be a number saying nothing moved — and a non-null '
    + 'avgAfter would reset the since-line clock, exactly as a rename must not');
  assert.deepStrictEqual(e.menuIds, ['M1'], 'the menus it reached, from the same helper the repoint uses');
  assert.deepStrictEqual(e.detail, { name: 'Fish', lines: 1 });
});

test('a REFUSED write puts that plate’s lines back, logs nothing, and does not touch the others', async () => {
  const c = writeCase();
  const { S, api } = healSandbox(c);
  S.fail.SP1 = true;
  const r = await api.run();
  assert.deepStrictEqual(api.plates()[0].lines, [{ pid: 'P1', qty: 10 }], 'rolled back to the bare line');
  assert.deepStrictEqual(api.plates()[1].lines, [{ kid: 'K1', qty: 5 }, { kid: 'K1', qty: 1 }], 'SP2 stands');
  assert.deepStrictEqual(api.log().map((e) => e.detail.name), ['Chips'], 'only the plate that landed is logged');
  assert.deepStrictEqual(r, { plates: 1, lines: 1, failed: 1 });
  assert.deepStrictEqual(S.toasts, ['Fixed 1 line — 1 plate could not be saved'],
    'the toast names both halves: a partial result reported as a success is the lie this is about');
});

test('a REJECTED write rolls back too — a promise has two settle paths (roster 184a)', async () => {
  const { S, api } = healSandbox(writeCase());
  S.reject.SP1 = true;
  const r = await api.run();
  assert.deepStrictEqual(api.plates()[0].lines, [{ pid: 'P1', qty: 10 }]);
  assert.equal(api.log().length, 1);
  assert.equal(r.failed, 1);
});

test('every write failing says nothing was saved, and leaves every plate exactly as it was', async () => {
  const { S, api } = healSandbox(writeCase());
  S.fail.SP1 = true; S.fail.SP2 = true;
  const r = await api.run();
  assert.deepStrictEqual(r, { plates: 0, lines: 0, failed: 2 });
  assert.deepStrictEqual(api.plates()[0].lines, [{ pid: 'P1', qty: 10 }]);
  assert.deepStrictEqual(api.plates()[1].lines, [{ pid: 'P1', qty: 5 }, { kid: 'K1', qty: 1 }]);
  assert.deepStrictEqual(api.log(), []);
  assert.ok(S.toasts.some((t) => /Nothing was saved/.test(t)));
});

/* The plan is made, Max reads the confirm, and MEANWHILE the plate changes — he edited it in another
   tab, or a re-sync replaced savedPlates. Every arm of the re-check is a different way the line at
   that index is no longer the line the plan was about, and each is asserted on its own: an arm that
   is never exercised is an arm nobody has asked a question. */
const RESHAPED = [
  ['became a kid line', [{ kid: 'K9', qty: 99 }]],
  ['became a kid line still carrying its old pid', [{ kid: 'K9', pid: 'P1', qty: 99 }]],
  ['became a misc cost line', [{ misc: true, label: 'Packaging', cost: 0.5 }]],
  ['lost its product', [{ qty: 99 }]],
  ['was deleted outright', []],
  ['is a hole in the array', [null]],
];
for (const [what, lines] of RESHAPED) {
  test(`a line that ${what} between the plan and the confirm is skipped, not overwritten`, async () => {
    const { S, api } = healSandbox(writeCase());
    const plan = api.plan();
    api.plates()[0].lines = JSON.parse(JSON.stringify(lines));
    const r = await api.runPlan(plan);
    assert.deepStrictEqual(api.plates()[0].lines, lines, 'the newer state survives untouched');
    assert.deepStrictEqual(S.writes, ['SP2'], 'and no write is issued for a plate with nothing to move');
    assert.deepStrictEqual(r, { plates: 1, lines: 1, failed: 0 });
  });
}

test('a plan naming a plate that has since been deleted writes nothing, and SAYS nothing happened', async () => {
  const { S, api } = healSandbox(writeCase());
  const r = await api.runPlan({ fix: [{ plateId: 'SP_GONE', name: 'X', moves: [{ i: 0, kid: 'K1' }] }], orphan: [] });
  assert.deepStrictEqual(S.writes, []);
  assert.deepStrictEqual(r, { plates: 0, lines: 0, failed: 0 });
  assert.deepStrictEqual(S.toasts, ['Nothing to change — those plate lines have already moved'],
    'pressing a button and being told nothing is how a user concludes it worked');
  assert.equal(S.repaints, 1,
    'repainted even though nothing was written: a stale plan means the DATA moved, so the row\'s own count is stale too');
});

/* =============================================================================================
 * 5b. The confirm-to-apply window — found by the pre-push review, and it is the whole safety claim
 *
 * The plan is built when the confirm OPENS and applied when it is PRESSED. `bootstrapSync` replaces
 * BOTH kitchenIngredients and savedPlates in between whenever the `online` listener fires, which on
 * this app's user is café mobile data. The shipped first cut re-checked the LINE'S SHAPE only, which
 * is not the condition the safety argument rests on — and the two failures below both write a
 * product the user never agreed to, with no error and a change-log entry whose figures are null by
 * design, so nothing on any screen could notice.
 * ========================================================================================== */

const sameProduct = new Function(`"use strict";
  ${extractFn(SRC, 'barePidSameProduct')} return barePidSameProduct;`)();

test('barePidSameProduct is the identity, not a presence check', () => {
  const kids = { K1: { id: 'K1', pid: 'P1' }, K2: { id: 'K2', pid: null } };
  assert.equal(sameProduct(kids, 'K1', 'P1'), true);
  assert.equal(sameProduct(kids, 'K1', 'P2'), false, 'the ingredient exists and points somewhere else');
  assert.equal(sameProduct(kids, 'K_GONE', 'P1'), false);
  assert.equal(sameProduct(kids, 'K2', null), false, 'null === null must not read as "same product"');
  assert.equal(sameProduct(null, 'K1', 'P1'), false);
});

test('the ingredient was RELINKED while the confirm was open: the line is left alone', async () => {
  const { S, api } = healSandbox(writeCase());
  const plan = api.plan();
  // saveKingModal on another device, arriving here through bootstrapSync's `online` re-run
  api.kids().K1.pid = 'P9';
  const r = await api.runPlan(plan);
  assert.deepStrictEqual(api.plates()[0].lines, [{ pid: 'P1', qty: 10 }], 'still on the product it named');
  assert.deepStrictEqual(S.writes, [], 'and nothing was written at all');
  assert.deepStrictEqual(r, { plates: 0, lines: 0, failed: 0 });
  assert.deepStrictEqual(api.log(), []);
});

test('a re-sync REORDERED the lines: the index now names a different product, and nothing is written', async () => {
  const c = writeCase();
  c.kings = [{ id: 'K1', name: 'Chips', pid: 'P1' }, { id: 'K2', name: 'Salt', pid: 'P7' }];
  c.savedPlates = [{ id: 'SP1', name: 'Fish', lines: [{ pid: 'P1', qty: 10 }, { pid: 'P7', qty: 2 }] }];
  const { S, api } = healSandbox(c);
  const plan = api.plan();
  assert.equal(plan.fix[0].moves.length, 2, 'both lines were plannable before the re-sync');
  // bootstrapSync hands back the same plate with its lines the other way round
  api.plates()[0].lines = [{ pid: 'P7', qty: 2 }, { pid: 'P1', qty: 10 }];
  const r = await api.runPlan(plan);
  /* Both moves are refused, which is the SAFE answer rather than the clever one: index 0 now holds
     P7 and the plan says K1 (which owns P1), index 1 holds P1 and the plan says K2. Healing them
     "correctly" by re-deriving the owner here would be a second planner living inside the writer —
     a stub of barePidPlan that agrees with it right up until it does not. The row recomputes on the
     next Settings render and the user presses Fix again against a plan that is true. */
  assert.deepStrictEqual(api.plates()[0].lines, [{ pid: 'P7', qty: 2 }, { pid: 'P1', qty: 10 }]);
  assert.deepStrictEqual(S.writes, []);
  assert.deepStrictEqual(r, { plates: 0, lines: 0, failed: 0 });
});

/* =============================================================================================
 * 6. The two surfaces — the ingredient modal's sentence, and the Settings row
 * ========================================================================================== */

function kingModal(opts) {
  const S = { used: '', usedShown: false };
  // eslint-disable-next-line no-new-func
  return new Function('S', `"use strict";
    var savedPlates=${JSON.stringify(opts.savedPlates)};
    var kitchenIngredients=${JSON.stringify(opts.kings)};
    var byId=${JSON.stringify(opts.byId)}, kById={};
    (kitchenIngredients||[]).forEach(function(k){ kById[k.id]=k; });
    var kingEditId=${JSON.stringify(opts.kid)}, kingChosenPid=null, kingAddToPlateOnSave=false;
    function el(id){ var o={value:'', textContent:'', style:{}, disabled:false, addEventListener:function(){}};
      if(id==='king_used'){ o.__used=true; }
      return o; }
    var made={};
    var document={ getElementById:function(id){ if(!made[id]) made[id]=el(id); return made[id]; } };
    function renderKingAlts(){} function kingSyncSave(){} function show(){}
    function renderKingProdDrop(){} function renderKingCreateSuggest(){} function resetDrop(){}
    ${extractFn(SRC, 'barePidLinesFor')}
    ${extractFn(SRC, 'openKingModal')}
    openKingModal(kingEditId);
    S.used=made['king_used'].textContent;
    S.usedShown=made['king_used'].style.display;
    return S;`)(S);
}

const MODAL_BYID = { P1: { id: 'P1', description: 'Chips 2kg', brand: '' } };

test('the modal’s promise is true: it says what the count covers when a bare line would not follow', () => {
  const s = kingModal({
    kid: 'K1',
    kings: [{ id: 'K1', name: 'Chips', pid: 'P1' }],
    byId: MODAL_BYID,
    savedPlates: [
      { id: 'A', lines: [{ kid: 'K1', qty: 1 }] },
      { id: 'B', lines: [{ pid: 'P1', qty: 1 }, { pid: 'P1', qty: 2 }] },
    ],
  });
  assert.match(s.used, /^Used in 1 saved plate — changing the product updates all of them\./,
    'the kid-arm count and its promise are unchanged — that half was always true');
  assert.match(s.used, /2 older lines point straight at this product and won’t follow/,
    'and the other arm is finally admitted to, with its own number');
  assert.match(s.used, /Settings, under Data, fixes that\./, 'and it says where the fix is');
});

test('no bare lines, no extra sentence — the copy does not warn about a state that is not there', () => {
  const s = kingModal({
    kid: 'K1',
    kings: [{ id: 'K1', name: 'Chips', pid: 'P1' }],
    byId: MODAL_BYID,
    savedPlates: [{ id: 'A', lines: [{ kid: 'K1', qty: 1 }] }],
  });
  assert.equal(s.used, 'Used in 1 saved plate — changing the product updates all of them.');
});

test('an unused ingredient with bare lines still gets the warning — the two halves are independent', () => {
  const s = kingModal({
    kid: 'K1',
    kings: [{ id: 'K1', name: 'Chips', pid: 'P1' }],
    byId: MODAL_BYID,
    savedPlates: [{ id: 'B', lines: [{ pid: 'P1', qty: 1 }] }],
  });
  assert.match(s.used, /^Not used in any saved plates yet\. 1 older line points straight at this product/,
    'singular, and the "not used" half is the one that is most misleading on its own');
});

/* 249: the harness now serves BOTH Settings rows, because syncHealRow decides both. `orphanHidden`
   is the second half of the contract these tests pin — see the rewritten case below. */
function healRow(opts) {
  const S = { hidden: null, label: null, orphanHidden: null };
  // eslint-disable-next-line no-new-func
  return new Function('S', `"use strict";
    var savedPlates=${JSON.stringify(opts.savedPlates)};
    var kitchenIngredients=${JSON.stringify(opts.kings)};
    var row={hidden:false}, btn={textContent:'Fix'}, orow={hidden:false};
    var document={ getElementById:function(id){
      if(id==='setHealRow') return row;
      if(id==='setHealLines') return btn;
      if(id==='setOrphanRow') return orow;
      return null; } };
    ${extractFn(SRC, 'barePidPlan')}
    ${extractFn(SRC, 'barePidFixCount')}
    ${extractFn(SRC, 'orphanPidGroups')}
    ${extractFn(SRC, 'syncHealRow')}
    syncHealRow();
    S.hidden=row.hidden; S.label=btn.textContent; S.orphanHidden=orow.hidden;
    return S;`)(S);
}

test('BOTH Settings rows are hidden when there is nothing to fix and nothing to report', () => {
  const s = healRow({ kings: [{ id: 'K1', name: 'Chips', pid: 'P1' }], savedPlates: [{ id: 'A', lines: [{ kid: 'K1', qty: 1 }] }] });
  assert.equal(s.hidden, true, 'a permanent row for a one-off migration is clutter that outlives its reason');
  assert.equal(s.orphanHidden, true, 'and so is a row for a question nobody has been asked');
});

test('the heal row shows, and says "Fix", while there is something it can fix', () => {
  const s = healRow({ kings: [{ id: 'K1', name: 'Chips', pid: 'P1' }], savedPlates: [{ id: 'A', lines: [{ pid: 'P1', qty: 1 }] }] });
  assert.equal(s.hidden, false);
  assert.equal(s.label, 'Fix');
  assert.equal(s.orphanHidden, true, 'a line the heal CAN fix is not a question for a person');
});

/* ⚠️ REWRITTEN BY 249, WHICH DELIBERATELY REVERSES WHAT 239 DECIDED HERE — and the property this
   test existed to protect is kept, which is why it is rewritten rather than deleted.
   239 left the heal row visible after the fixable half was gone, with its button reading "Show",
   so that "the lines nothing can decide still have to be findable". QUEUE item 88 is that those
   lines CAN be decided, by a person, so the report became an ask — and the ask is a second row.
   The lines are still findable. They are findable somewhere that can act on them. */
test('249: with only un-decidable lines left, the ASK row is what shows — and the heal row stands down', () => {
  const s = healRow({ kings: [], savedPlates: [{ id: 'A', lines: [{ pid: 'P_GONE', qty: 1 }] }] });
  assert.equal(s.orphanHidden, false, 'the lines nothing can decide still have to be findable');
  assert.equal(s.hidden, true, 'but not by two rows describing the same lines, one of which can only list them');
  assert.equal(s.label, 'Fix', 'and the surviving verb cannot drift, because it now has only one meaning');
});

/* =============================================================================================
 * 249 / QUEUE item 88 — the lines the heal REFUSES, and the choice only a person can make.
 *
 * Measured on production 9 Sep 2026: 13 bare-pid lines across 9 plates and six products, every one
 * with ZERO owning ingredients — 239's heal took every single-owner line and correctly refused these.
 *
 * ⚠️ THE HEAL'S PROMISE DOES NOT TRANSFER, and that is what these tests are mostly about. The heal
 * can say "nothing costs a different amount afterwards" because `barePidSameProduct` proves the
 * ingredient it writes already points at the line's product. Here no ingredient owns the product, so
 * every candidate points at a DIFFERENT one and the cost moves by construction. A picker that
 * borrowed the heal's sentence would be lying, so the delta is computed and shown.
 * ========================================================================================== */

function groupsOf(savedPlates, kings) {
  // eslint-disable-next-line no-new-func
  return new Function('P', 'K', `"use strict";
    ${extractFn(SRC, 'barePidPlan')}
    ${extractFn(SRC, 'orphanPidGroups')}
    return orphanPidGroups(P, K);`)(savedPlates, kings);
}

function deltaOf(pid, kid, savedPlates, kids, products) {
  // eslint-disable-next-line no-new-func
  return new Function('PID', 'KID', 'P', 'K', 'B', `"use strict";
    var byId=B;
    ${extractFn(SRC, 'cpbu')}
    ${extractFn(SRC, 'lineCost')}
    ${extractFn(SRC, 'orphanChoiceDelta')}
    return orphanChoiceDelta(PID, KID, P, K, B);`)(pid, kid, savedPlates, kids, products);
}

test('249: the groups are the heal\'s own refusals, grouped BY PRODUCT', () => {
  /* Derived from barePidPlan rather than re-walked, so the picker can never offer a line the heal
     would have fixed, nor miss one it refused. Two products, three lines, three plates — the shape
     production has six of. */
  const kings = [{ id: 'K1', name: 'Chips', pid: 'P1' }];
  const plates = [
    { id: 'A', name: 'Bacon Bene', lines: [{ pid: 'P_GONE', qty: 50 }, { pid: 'P_EGG', qty: 2 }] },
    { id: 'B', name: 'Scoopy\'s Breakfast', lines: [{ pid: 'P_GONE', qty: 30 }] },
    { id: 'C', name: 'Healed', lines: [{ pid: 'P1', qty: 10 }] },   // one owner — the heal takes this
  ];
  const g = groupsOf(plates, kings);
  assert.strictEqual(g.length, 2, 'two products to ask about, not three lines and not the healable one');
  const gone = g.find((x) => x.pid === 'P_GONE');
  assert.strictEqual(gone.lines, 2, 'both lines pointing at it');
  assert.strictEqual(gone.plates.length, 2, 'across both plates');
  assert.deepStrictEqual(gone.plates.map((p) => p.name).sort(), ['Bacon Bene', "Scoopy's Breakfast"]);
  assert.strictEqual(gone.why, 'none', 'no ingredient uses it — the production case');
  assert.ok(!g.some((x) => x.pid === 'P1'), 'a line the heal can fix is never offered as a question');
});

test('249: a product TWO ingredients own is a question too, and a different one', () => {
  const kings = [{ id: 'K1', name: 'Chips', pid: 'P1' }, { id: 'K2', name: 'Fries', pid: 'P1' }];
  const plates = [{ id: 'A', name: 'Fish', lines: [{ pid: 'P1', qty: 10 }] }];
  const g = groupsOf(plates, kings);
  assert.strictEqual(g.length, 1);
  assert.strictEqual(g[0].why, 'ambiguous', 'the app will not choose between two owners');
});

test('249: the delta is what those plates cost before and after — the promise the heal cannot make', () => {
  const products = {
    P_GONE: { id: 'P_GONE', base_unit: 'g', cost_per_base_unit: 0.01 },   // 50g = $0.50
    P_NEW: { id: 'P_NEW', base_unit: 'g', cost_per_base_unit: 0.03 },     // 50g = $1.50
  };
  const kids = { K9: { id: 'K9', name: 'Bacon', pid: 'P_NEW' } };
  const plates = [{ id: 'A', name: 'Bene', lines: [{ pid: 'P_GONE', qty: 50 }] }];
  const d = deltaOf('P_GONE', 'K9', plates, kids, products);
  assert.strictEqual(d.plates.length, 1);
  assert.strictEqual(Math.round(d.before * 100) / 100, 0.5);
  assert.strictEqual(Math.round(d.after * 100) / 100, 1.5);
  assert.notStrictEqual(d.before, d.after, 'the whole reason this picker cannot borrow the heal\'s sentence');
});

test('249: two ingredients on ONE product come out at zero — the same arithmetic, no branch', () => {
  /* The ambiguous case states the OPPOSITE cost promise, and it is not a special case in the code:
     both owners resolve to the same product, so the delta is zero on its own. */
  const products = { P1: { id: 'P1', base_unit: 'g', cost_per_base_unit: 0.01 } };
  const kids = { K1: { id: 'K1', name: 'Chips', pid: 'P1' }, K2: { id: 'K2', name: 'Fries', pid: 'P1' } };
  const plates = [{ id: 'A', name: 'Fish', lines: [{ pid: 'P1', qty: 100 }] }];
  const d = deltaOf('P1', 'K2', plates, kids, products);
  assert.strictEqual(d.before, d.after, 'either ingredient costs the same, and the copy says so');
});

test('249: a line the app cannot cost EITHER WAY is reported as unknown, never as a number', () => {
  /* A confident figure over an uncostable line is the one thing this app must never print, and it
     is the same rule `plateCostText` follows in the picker one modal along. */
  const products = {
    P_GONE: { id: 'P_GONE', base_unit: 'g', cost_per_base_unit: 0.01 },
    P_NOPRICE: { id: 'P_NOPRICE', base_unit: 'g', cost_per_base_unit: null },
  };
  const kids = { K9: { id: 'K9', name: 'Mystery', pid: 'P_NOPRICE' } };
  const plates = [{ id: 'A', name: 'Bene', lines: [{ pid: 'P_GONE', qty: 50 }] }];
  const d = deltaOf('P_GONE', 'K9', plates, kids, products);
  assert.strictEqual(d.unknown, 1, 'the line is counted as uncostable…');
  assert.strictEqual(d.after, 0, '…and contributes no invented figure to the after total');
});

test('249: the shapes these two defend against — every guard exercised, not just written', () => {
  /* Added because the mutation gate reported seven survivors on the two functions above: their
     defensive guards were all UNEXERCISED, which is the difference between a guard that works and a
     guard that has never been asked. Each line below is one of those mutants.
     `costFromLines` and friends step over the same three shapes (a misc line carries no reference,
     a kid line is already healed, a line with neither is broken differently) — so a fixture that
     omits them is not a simpler fixture, it is one that never reaches the code. */
  const products = { P_GONE: { id: 'P_GONE', base_unit: 'g', cost_per_base_unit: 0.01 },
                     P_NEW: { id: 'P_NEW', base_unit: 'g', cost_per_base_unit: 0.02 } };
  const kids = { K9: { id: 'K9', name: 'Bacon', pid: 'P_NEW' } };
  const messy = [
    null,                                                        // a null plate
    { id: 'X', name: 'No lines array', lines: 'nope' },           // lines not an array
    { id: 'Y', name: 'Mixed', lines: [
      null,                                                      // a null line
      { misc: true, label: 'Box', cost: 1 },                     // a misc line — no reference at all
      { kid: 'K9', qty: 5 },                                     // already healed
      { pid: 'P_OTHER', qty: 9 },                                // a different product
      { pid: 'P_GONE', qty: 100 },                               // the only one that counts
    ] },
  ];
  const d = deltaOf('P_GONE', 'K9', messy, kids, products);
  assert.deepStrictEqual(d.plates.map((p) => p.id), ['Y'], 'only the plate holding a line on this product');
  assert.strictEqual(d.plates[0].name, 'Mixed',
    'and it carries the plate NAME — the picker prints it, so a delta that loses it names nothing');
  assert.strictEqual(d.plates[0].lines, 1, 'and only the ONE line — the other four are stepped over');
  assert.strictEqual(Math.round(d.before * 100) / 100, 1, '100g at $0.01');
  assert.strictEqual(Math.round(d.after * 100) / 100, 2, '100g at $0.02');

  /* The grouping side: a plate with NO id still has its lines counted, and is not recorded as a
     plate the user can be sent to — `barePidPlan` emits `plateId:null` for it. */
  const g = groupsOf([{ name: 'Nameless', lines: [{ pid: 'P_GONE', qty: 1 }] },
                      { id: 'Z', name: 'Named', lines: [{ pid: 'P_GONE', qty: 1 }] }], []);
  assert.strictEqual(g.length, 1);
  assert.strictEqual(g[0].lines, 2, 'both lines are counted, id or no id');
  assert.deepStrictEqual(g[0].plates.map((p) => p.id), ['Z'], 'only the plate that can actually be opened');
});

test('249: a plate with no line on this product is not in the delta at all', () => {
  const products = { P_GONE: { id: 'P_GONE', base_unit: 'g', cost_per_base_unit: 0.01 },
                     P_NEW: { id: 'P_NEW', base_unit: 'g', cost_per_base_unit: 0.02 } };
  const kids = { K9: { id: 'K9', name: 'Bacon', pid: 'P_NEW' } };
  const plates = [
    { id: 'A', name: 'Bene', lines: [{ pid: 'P_GONE', qty: 50 }] },
    { id: 'B', name: 'Unrelated', lines: [{ kid: 'K9', qty: 10 }, { misc: true, cost: 1 }] },
  ];
  const d = deltaOf('P_GONE', 'K9', plates, kids, products);
  assert.deepStrictEqual(d.plates.map((p) => p.id), ['A'], 'only the plates the choice actually touches');
});

/* =============================================================================================
 * 7. Reachability — the markup, the wiring, and the one-way door
 * ========================================================================================== */

test('CENSUS: the row exists in the markup, ships hidden, and its button is wired to the heal', () => {
  const html = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  const row = html.match(/<div class="stg-row" id="setHealRow"[^>]*>/);
  assert.ok(row, '#setHealRow is in the Settings markup');
  assert.match(row[0], /\bhidden\b/, 'and ships hidden, so syncHealRow is the only thing that can reveal it');
  assert.ok(/id="setHealLines"/.test(html), 'the button exists');
  assert.match(SRC, /on\('setHealLines',\s*runBarePidHeal\)/, 'and is bound to the heal, not to a stub');
});

test('CENSUS: nothing in the app MINTS a bare-pid line, which is what makes this a one-off', () => {
  // saveCurrentPlate is the one writer of plate.lines. It preserves a bare line that is already
  // there and writes {kid,qty} for everything else — so once healed, a plate stays healed.
  const save = extractFn(SRC, 'saveCurrentPlate');
  assert.match(save, /l\.kid\?\{kid:l\.kid,qty:l\.qty\}:\{pid:l\.pid,qty:l\.qty\}/,
    'if this stops preserving shape, the heal is no longer one-off and this file is the wrong shape');
});
