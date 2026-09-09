/*
 * tenant-switch.test.js — 242, queue item 13: café A's state must not survive into café B.
 *
 * THE DEFECT. `bootstrapSync` applies one café's rows to memory, and eleven of its stores are
 * applied CONDITIONALLY — a setting only `if(theRow)`, a history series by MERGE rather than
 * replace, `supplierMem` by keeping local entries over an empty read. Every one of those means
 * "the server said nothing about this, so keep what you had", which is right for a re-sync of the
 * SAME café and wrong for a different one. Nothing distinguished the two, because the app read the
 * tenant uuid purely to answer "is there one" and threw it away.
 *
 * The measured consequences, in the order they hurt:
 *   1. A's `supplier_phrases` are re-pushed INTO B — stamped as B's by the tenant machinery, which
 *      is the point. Cross-tenant disclosure plus a parser that matches B's invoices with packs
 *      learned in A.
 *   2. A's food-cost target survives, so B prices a $6 dish at $20 instead of $15.
 *   3. A's kitchen ingredients, change log, per-menu and per-dish price series, wizard skips, GST
 *      default and last-import date all survive, on screen, in B.
 *
 * WHAT THIS FILE PINS, and it is the SEQUENCE rather than the pieces. Every function here is the
 * real one, brace-extracted from js/app.js — CLAUDE.md's roster is twenty-two incidents of a test
 * that re-implemented what it was checking and passed against the defect. In particular
 * `supplierMemApply` is called for real after the reset, so a mutant that moves the reset AFTER the
 * supplier block, or deletes the reset call, produces a non-empty `rePush` and turns this red. A
 * test that only asserted "supplierMem is empty" would not: it would be checking the reset against
 * itself.
 *
 * The three-step boot is A -> non-member -> B, in one page, with EMPTY settings and phrases in B —
 * the exact sequence the item names, and the one `boot-gate.test.js` does not cover.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn, extractVar } = require('./_extractfn');

const SRC = loadApp();

const A_ID = '11111111-1111-4111-8111-111111111111';
const B_ID = '22222222-2222-4222-8222-222222222222';

/*
 * The sandbox holds the REAL declarations of every store the reset touches (extracted, not
 * retyped, wherever the declaration carries a value worth pinning) plus the collaborators
 * `resetTenantState` calls. `rebuild`, `rebuildKById` and `setKingWizSkips` are the shipped ones:
 * the reset's contract includes leaving the derived mirrors consistent, and stubbing them would
 * hide a store that was cleared while its index still held café A.
 */
function boot(opts) {
  opts = opts || {};
  const removed = [];
  // eslint-disable-next-line no-new-func
  const api = new Function('LS', 'REMOVED', `
    "use strict";
    var localStorage = LS;
    var document = { getElementById: function(){ return null; } };
    /* The AI toggles fall back to a per-DEVICE localStorage preference, which is what a fresh page
       load in café B would give. Extracted with their loaders so the test cannot disagree with the
       app about what "the application default" is for them. */
    var AI_INV_KEY='cafeDB_aiInvoiceCheck';
    var AI_SUG_KEY='cafeDB_aiSuggestions';
    ${extractFn(SRC, 'loadAiInvoiceCheck')}
    ${extractFn(SRC, 'loadAiSuggestions')}
    ${extractVar(SRC, 'COGS_PCT_DEFAULT')}
    ${extractVar(SRC, 'GST_DEFAULT_MODE')}
    var cogsPct = COGS_PCT_DEFAULT;
    var gstDefault = GST_DEFAULT_MODE;
    var aiInvoiceCheck = loadAiInvoiceCheck();
    var aiSuggestions = loadAiSuggestions();
    var productsById = {}, PRODUCTS = [], byId = {};
    var kitchenIngredients = [], kById = {};
    var kingWizSkip = {};
    var customMenu = [], menusList = [], savedPlates = [];
    var changeLog = [];
    var priceHistory = [], menuHistory = {}, menuPriceLog = {}, ingPriceLog = {};
    var supplierMem = {};
    var teamData = { status:'idle', members:[], invites:[], err:'' };
    ${extractFn(SRC, 'rebuild')}
    ${extractFn(SRC, 'rebuildKById')}
    ${extractFn(SRC, 'setKingWizSkips')}
    ${extractFn(SRC, 'rowToSupplierPhrase')}
    ${extractFn(SRC, 'supplierMemApply')}
    ${extractVar(SRC, '_lastTenantId')}
    ${extractFn(SRC, 'tenantIdOf')}
    ${extractFn(SRC, 'tenantChanged')}
    ${extractFn(SRC, 'resetTenantState')}
    ${extractFn(SRC, 'applyTenantBoundary')}
    return {
      /* The REAL boundary, not a retyped copy of its three statements. bootstrapSync calls this
         same function with the same argument; the last test in this file pins that it still does.
         (No backticks in here — this whole block is inside a template literal.) */
      boundary: applyTenantBoundary,
      /* bootstrapSync's supplier step, called with whatever memory now holds. */
      applyPhrases: function(rows){
        var r = supplierMemApply(rows, supplierMem);
        supplierMem = r.mem;
        return r.rePush;
      },
      phrases: function(){ return supplierMem; },
      /* bootstrapSync's setting step, reduced to the two that carry a number: each is applied only
         when the café HAS a row, which is the conditional that let café A's value survive. */
      applySettings: function(rows){
        var cogsRow = rows.filter(function(r){ return r.key === 'food_cost_target'; })[0];
        if (cogsRow && cogsRow.value != null) {
          var pv = parseFloat(cogsRow.value);
          if (pv >= 1 && pv <= 99) cogsPct = pv;
        }
        var gstRow = rows.filter(function(r){ return r.key === 'gst_default'; })[0];
        if (gstRow && (gstRow.value === 'inc' || gstRow.value === 'ex')) gstDefault = gstRow.value;
        var kiRow = rows.filter(function(r){ return r.key === 'kitchen_ingredients'; })[0];
        if (kiRow && Array.isArray(kiRow.value)) { kitchenIngredients = kiRow.value; rebuildKById(); }
        var chg = rows.filter(function(r){ return r.key === 'king_wiz_skips'; })[0];
        if (chg && Array.isArray(chg.value)) setKingWizSkips(chg.value);
      },
      seedA: function(){
        cogsPct = 30; gstDefault = 'inc';
        kitchenIngredients = [{ id:'k1', name:'A onions', pid:'pA' }]; rebuildKById();
        setKingWizSkips(['pA']);
        productsById = { pA: { id:'pA', description:'A flour' } }; rebuild();
        savedPlates = [{ id:'plA' }]; customMenu = [{ menuId:'mA' }]; menusList = [{ id:'mA' }];
        changeLog = [{ id:'cA', t: 1 }];
        priceHistory = [{ t:1, v:30 }];
        menuHistory = { mA: [{ t:1, v:30 }] };
        menuPriceLog = { dA: [{ t:1, v:9 }] };
        ingPriceLog = { pA: [{ t:1, v:2 }] };
        supplierMem = { sA: { id:'sA', supplier:'Bidfood', phrase_norm:'a flour', qty:20, unit:'kg' } };
        teamData = { status:'ok', members:[{ email:'owner@cafe-a.test' }], invites:[], err:'' };
        LS.setItem('cafeDB_lastImport', '2026-09-01T00:00:00.000Z');
      },
      snap: function(){
        return {
          cogsPct: cogsPct, gstDefault: gstDefault,
          aiInvoiceCheck: aiInvoiceCheck, aiSuggestions: aiSuggestions,
          products: Object.keys(productsById).length, PRODUCTS: PRODUCTS.length, byId: Object.keys(byId).length,
          kitchen: kitchenIngredients.length, kById: Object.keys(kById).length,
          skips: Object.keys(kingWizSkip).length,
          customMenu: customMenu.length, menusList: menusList.length, savedPlates: savedPlates.length,
          changeLog: changeLog.length,
          priceHistory: priceHistory.length,
          menuHistory: Object.keys(menuHistory).length,
          menuPriceLog: Object.keys(menuPriceLog).length,
          ingPriceLog: Object.keys(ingPriceLog).length,
          supplierMem: Object.keys(supplierMem).length,
          teamStatus: teamData.status, teamMembers: teamData.members.length,
          lastImport: LS.getItem('cafeDB_lastImport'),
          lastTenantId: _lastTenantId,
        };
      },
    };
  `);
  const store = Object.assign({}, opts.ls || {});
  const LS = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { removed.push(k); delete store[k]; },
  };
  const app = api(LS, removed);
  app.removed = removed;
  return app;
}

/* The two answers `current_business_id` can give, in the shape supabase-js resolves with. */
const okRes = (id) => ({ data: id, error: null });

test('the three-step boot: A, then no membership, then B — nothing of A survives', () => {
  const app = boot();

  // ---- step 1: boot as a member of café A, and load A's data.
  app.boundary(okRes(A_ID));
  app.seedA();
  const inA = app.snap();
  assert.equal(inA.lastTenantId, A_ID, 'A must be recorded as the tenant in memory');
  assert.equal(inA.cogsPct, 30);
  assert.equal(inA.supplierMem, 1);

  /* ---- step 2: the A membership is revoked while the page stays open. `bootstrapSync` returns at
     the non-member gate WITHOUT reaching the boundary, so memory is deliberately left alone (185).
     Modelled by simply not calling the boundary — which is what the shipped early return does. */
  assert.equal(app.snap().cogsPct, 30, '185: the non-member path leaves memory present on purpose');

  // ---- step 3: the same account is admitted to café B, which has NO settings and NO phrases.
  const didReset = app.boundary(okRes(B_ID));
  assert.equal(didReset, true, 'a definite move to a different café must reset');

  /* The supplier step now runs for real against B's empty read. This is the assertion that would
     go green on a stubbed reset and red on a missing one. */
  const rePush = app.applyPhrases([]);
  assert.deepEqual(rePush, [], 'zero rows of A may be pushed into B');

  // B's settings read is empty, so every conditional apply is skipped — exactly as in production.
  app.applySettings([]);

  const inB = app.snap();
  assert.equal(inB.lastTenantId, B_ID);
  assert.equal(inB.cogsPct, 40, "B must price off the app default, not A's 30%");
  assert.equal(inB.gstDefault, 'ex', "A's inclusive-GST default must not read B's invoices");
  assert.equal(inB.supplierMem, 0, "A's taught packs must not match B's invoices");
  assert.equal(inB.kitchen, 0, "A's kitchen ingredients must not appear in B");
  assert.equal(inB.kById, 0, 'the kitchen index must be cleared with the store it indexes');
  assert.equal(inB.skips, 0);
  assert.equal(inB.products, 0);
  assert.equal(inB.PRODUCTS, 0, 'the derived product array must be rebuilt, not left holding A');
  assert.equal(inB.byId, 0);
  assert.equal(inB.savedPlates, 0);
  assert.equal(inB.customMenu, 0);
  assert.equal(inB.menusList, 0);
  assert.equal(inB.changeLog, 0, "A's Recent changes must not render in B");
  assert.equal(inB.priceHistory, 0);
  assert.equal(inB.menuHistory, 0, "A's per-menu series merges forward unless cleared");
  assert.equal(inB.menuPriceLog, 0, "A's per-dish sell-price series merges forward unless cleared");
  assert.equal(inB.ingPriceLog, 0);
  assert.equal(inB.teamStatus, 'idle', "A's team must not be held while B is loading");
  assert.equal(inB.teamMembers, 0, "A's members' email addresses must not survive");
  assert.equal(inB.lastImport, null, "A's import date prints as a fact about B");
});

test('the cross-tenant WRITE is what the reset prevents: without it, A is pushed into B', () => {
  /* The counterfactual, run against the real `supplierMemApply` rather than described in a comment.
     v107's protection is correct and is deliberately unchanged — an empty read over held memory
     re-pushes, because a successful-but-empty read and an RLS-blocked read are indistinguishable.
     What makes it safe is that the memory reaching it belongs to the café being loaded. */
  const app = boot();
  app.boundary(okRes(A_ID));
  app.seedA();

  // No boundary call — i.e. the tenant change goes unnoticed, which is the pre-242 behaviour.
  const rePush = app.applyPhrases([]);
  assert.equal(rePush.length, 1, 'this is the defect: A’s phrase is queued for a push into B');
  assert.equal(rePush[0].id, 'sA');
  assert.equal(rePush[0].supplier, 'Bidfood');
});

test('café B’s OWN phrases are adopted, and A’s are not kept alongside them', () => {
  /* The other half of the move, and the one the empty-B case cannot reach: when B does have
     supplier memory of its own, the server's rows are what memory holds — A's are neither kept nor
     merged in. Both mutants the gate found here live on this path (discarding `rows`, and firing
     v107's keep-local arm whenever local is non-empty), and neither is visible with B empty. */
  const app = boot();
  app.boundary(okRes(A_ID));
  app.seedA();
  app.boundary(okRes(B_ID));

  const rePush = app.applyPhrases([
    { id: 'sB', supplier: 'Bidfood', phrase_norm: 'b flour', qty: 10, unit: 'kg' },
  ]);
  assert.deepEqual(rePush, [], 'a populated read is nothing to heal');
  const mem = app.phrases();
  assert.deepEqual(Object.keys(mem), ['sB'], "B's own phrase, and only B's");
  assert.equal(mem.sB.qty, 10, 'and it must arrive through the real row boundary');
  assert.equal(mem.sB.unit, 'kg');
});

test('a populated read REPLACES held memory — v107 protects an EMPTY read, not any read', () => {
  /* Same café, no tenant move. Server-wins on a populated read is how a phrase deleted on one
     device disappears from the others; only the zero-row case is ambiguous enough to protect. */
  const app = boot();
  app.boundary(okRes(A_ID));
  app.seedA();
  const rePush = app.applyPhrases([
    { id: 'sA2', supplier: 'Bidfood', phrase_norm: 'a rice', qty: 5, unit: 'kg' },
  ]);
  assert.deepEqual(rePush, [], 'nothing to re-push when the server answered with rows');
  assert.deepEqual(Object.keys(app.phrases()), ['sA2'], 'the server snapshot is the answer');
});

test('v107 still holds for the SAME café: an empty read over held memory re-pushes', () => {
  const app = boot();
  app.boundary(okRes(A_ID));
  app.seedA();
  const didReset = app.boundary(okRes(A_ID));           // a pull-to-refresh, same café
  assert.equal(didReset, false, 're-syncing the same café must reset nothing');
  const rePush = app.applyPhrases([]);
  assert.equal(rePush.length, 1, 'an RLS fault presenting as zero rows must not destroy taught packs');
  assert.equal(app.snap().supplierMem, 1);
});

test('a re-sync of the same café keeps every merge-preserved series', () => {
  /* The merges exist because `pushWrite` has no queue: a point logged with no signal lives only in
     memory. A reset on an ordinary refresh would delete exactly what they protect, so this is the
     half that stops the fix over-reaching. */
  const app = boot();
  app.boundary(okRes(A_ID));
  app.seedA();
  app.boundary(okRes(A_ID));
  const s = app.snap();
  assert.equal(s.changeLog, 1);
  assert.equal(s.menuHistory, 1);
  assert.equal(s.menuPriceLog, 1);
  assert.equal(s.cogsPct, 30, 'the target must survive an ordinary refresh of the same café');
});

test('a FIRST boot resets nothing — there is nothing in memory to belong to anyone', () => {
  const app = boot();
  const didReset = app.boundary(okRes(A_ID));
  assert.equal(didReset, false);
  assert.equal(app.snap().lastTenantId, A_ID);
  assert.deepEqual(app.removed, [], 'a first boot must not clear a key it never wrote');
});

test('"could not tell" changes nothing in either direction, and is not remembered', () => {
  /* The three-answer discipline `_bootNoMember` and `roleState` already follow: only a DEFINITE
     answer may move the standing verdict. An unreadable tenant lookup on a re-sync must neither
     reset café A's data nor overwrite the recorded tenant with nothing. */
  const app = boot();
  app.boundary(okRes(A_ID));
  app.seedA();

  [{ error: { message: 'network' } }, { data: undefined, error: null }, null].forEach((res) => {
    const didReset = app.boundary(res);
    assert.equal(didReset, false, 'an unreadable answer is not evidence of a different café');
    assert.equal(app.snap().lastTenantId, A_ID, 'the recorded tenant must survive an unreadable answer');
    assert.equal(app.snap().cogsPct, 30);
  });

  // And having been unreadable three times, a definite move still resets.
  assert.equal(app.boundary(okRes(B_ID)), true);
  assert.equal(app.snap().cogsPct, 40);
});

test('tenantIdOf: only a non-empty string is an identity', () => {
  const app = boot();
  /* `tenantGateState` answers 'ok' for ANY non-null, non-undefined body, so a number or an object
     reaches the boundary. It must not become an id that a later boot is compared against — the
     same reason `claimState` is written the long way. */
  [okRes(''), { data: 7, error: null }, { data: {}, error: null }, { data: null, error: null }]
    .forEach((res) => {
      assert.equal(app.boundary(res), false);
      assert.equal(app.snap().lastTenantId, '', 'a non-string body must not be remembered as a tenant');
    });
  assert.equal(app.boundary(okRes(A_ID)), false, 'still a first boot');
  assert.equal(app.snap().lastTenantId, A_ID);
});

test('bootstrapSync still calls the boundary, and calls it BEFORE it applies anything', () => {
  /*
   * ⚠️ THE ONE ASSERTION IN THIS FILE THAT READS SOURCE, AND THE REASON IS THAT NOTHING ELSE CAN.
   * Every test above drives real functions, but `bootstrapSync` is 200 lines with dozens of
   * collaborators and is not extractable — so "the boundary is wired in, and wired in early
   * enough" has no runtime harness here. Deleting the one call restores the whole defect with
   * every test above still green, which is precisely the silence this repo keeps finding.
   *
   * COMMENTS ARE STRIPPED FIRST, because CLAUDE.md's roster entry 183(a) is exactly this mistake:
   * a grep over a source file searches PROSE as well as CODE, and the prose here is a long comment
   * that names `applyTenantBoundary` and `supplierMemApply` while explaining them. Without the
   * strip, both halves below would pass on the explanation alone.
   *
   * The ORDER is the half that matters most. The reset must precede the supplier step, or A's
   * phrases are re-pushed into B before anything clears them.
   */
  const body = extractFn(SRC, 'bootstrapSync')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

  const boundary = body.indexOf('applyTenantBoundary(');
  assert.ok(boundary > 0, 'bootstrapSync must call applyTenantBoundary — deleting it restores item 13');

  const phrases = body.indexOf('supplierMemApply(');
  assert.ok(phrases > 0, 'bootstrapSync must apply supplier phrases through supplierMemApply');
  assert.ok(boundary < phrases, 'the tenant boundary must run BEFORE the supplier phrases are applied');

  /* And before the settings, which are the conditional applies that let A's target survive. */
  const target = body.indexOf("'food_cost_target'");
  assert.ok(target > 0);
  assert.ok(boundary < target, 'the tenant boundary must run BEFORE the settings are applied');

  /* And the extracted supplier step must be the ONLY one: the inline copy this batch replaced
     built its own `mm` map and pushed from `supplierMem` directly. */
  assert.ok(!/dbPushSupplierPhrase\(supplierMem\[/.test(body),
    'the pre-242 inline re-push must not come back alongside supplierMemApply');
});

test('the AI toggles go back to the DEVICE preference, not to café A’s stored value', () => {
  /* A fresh page load in B reads these from localStorage, so that — not a hardcoded ON — is the
     application default here. The residue (a device-level preference crossing tenants) is
     identical to closing the tab and reopening it, and is item 39's territory, not this item's. */
  const app = boot({ ls: { cafeDB_aiSuggestions: '0' } });
  app.boundary(okRes(A_ID));
  app.seedA();
  app.boundary(okRes(B_ID));
  const s = app.snap();
  assert.equal(s.aiSuggestions, false, 'the device preference is what a reopened tab would give');
  assert.equal(s.aiInvoiceCheck, true, 'and an unset toggle keeps its ON default');
});
