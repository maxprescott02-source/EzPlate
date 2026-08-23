/*
 * invoice-gate.test.js — v113.
 *
 * Invoice reading has two readers: the deterministic parser (Reader 1) and Gemini (Reader 2),
 * refereed by price history, escalating to a human tick when uncertain. That ordering only holds if
 * the human rules AFTER both readers have spoken.
 *
 * Until v113 it did not. `parseInvoice` set gemStatus='checking' and rendered the review table with a
 * fully live "Confirm All", so the whole window between render and the referee's answer was actionable.
 * The referee can only ever DEMOTE a row — gemPriceReview / gemMatchReview / gemReview each push
 * invRowState from 'matched' to 'review', which un-ticks it — so a row the referee was about to flag
 * was, in that window, rendered green and PRE-TICKED. Confirm All wrote it, applyInvoice set
 * gemApplied=true, and the verdict was then discarded by the guard in gemFireSecondReader: the check
 * ran and ruled on nothing.
 *
 * What is pinned here is the CONDITION, not a flag. In particular the timeout case asserts BOTH that
 * confirm unlocks AND that the unverified state is communicated — a "fix" that simply never unlocked
 * would satisfy "locked while pending" and fail here, which is the point.
 */
const test = require('node:test');
const assert = require('node:assert');
const { invConfirmState } = require('./_extract');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

/* ---------------------------------------------------------------------------
   1. The gate condition itself.
   --------------------------------------------------------------------------- */

test('while the referee is outstanding, confirm is unavailable and NOT yet marked unverified', () => {
  const s = invConfirmState('checking', true);
  assert.equal(s.disabled, true, 'Confirm All must not be pressable before the referee has spoken');
  // 180, from the mutation gate: this half was unpinned. "Unverified" is the TIMEOUT state — the
  // warning that the user is ruling on data nothing checked. Raising it while the check is still
  // running would cry wolf on every single import, and the hint below already says what is happening.
  assert.equal(s.unverified, false, 'still running is not the same as gave up');
  assert.match(s.hint, /Waiting for the AI check/);
});

test('once the referee answers, confirm is available and says nothing alarming', () => {
  const s = invConfirmState('checked', true);
  assert.equal(s.disabled, false);
  assert.equal(s.unverified, false);
  assert.match(s.hint, /Only ticked rows are saved/);
});

test('on timeout confirm UNLOCKS *and* the unverified state is communicated', () => {
  // Both halves matter. A fix that never unlocked would pass "locked while pending" and trap the user
  // whenever Gemini is down; a fix that unlocked silently would let them rule on unchecked lines
  // believing they had been checked.
  const s = invConfirmState('unavailable', true);
  assert.equal(s.disabled, false, 'a Gemini outage cannot mean invoices can never be imported');
  assert.equal(s.unverified, true);
  assert.match(s.hint, /didn.t finish/i, 'the user is ruling on unverified data and has a right to know');
  assert.match(s.hint, /double-checked/i);
});

test('with the AI check switched off there is nothing to wait for, so confirm stays available', () => {
  // v81 lets the user turn the second reader off entirely; gating on a check that never runs would
  // lock the import forever.
  assert.equal(invConfirmState('checking', false).disabled, false);
  assert.equal(invConfirmState(null, false).disabled, false);
  assert.equal(invConfirmState(null, true).disabled, false);   // no parse yet / manual entry
});

/* ---------------------------------------------------------------------------
   1b. WHY the gate sits before the table and not on the button.
   --------------------------------------------------------------------------- */

test('ROOT CAUSE: a match picked before the referee answers SILENCES it for that row', () => {
  // This is the test that justifies blocking the review rather than just the confirm. It runs the real
  // gemApplyReadings against a row the user has already ruled on, with a Gemini payload that names a
  // DIFFERENT product at a different price. Nothing happens to it — gemRowLocked skips the row whole.
  // So a ruling made in the waiting window is not merely uninformed; it is treated as final.
  const S = { rows: null };
  // eslint-disable-next-line no-new-func
  const run = new Function('S', `
    "use strict";
    var gemStatus=null, GEM_BAND=0.5;
    var byId={ P1:{id:'P1', base_unit:'g', cost_per_base_unit:0.01} };
    var invRows=S.rows;
    function renderInvReview(){}
    function rankCandidates(){ return [{id:'P2', coverage:0.9}]; }
    function packCount(){ return null; }
    function cpbu(p){ return p&&p.cost_per_base_unit; }
    function normalizePhrase(s){ return String(s||'').toLowerCase().trim(); }
    function gemDiag(){}
    /* 197: gemApplyReadings now converts every AI-read price to ex-GST at its own boundary, so this
       sandbox needs the app's real invGstAdjust and the invGst it reads. Left at mode 'ex' here on
       purpose — these specs are about the GATE, and a divisor firing inside them would change the
       numbers they assert for a reason that has nothing to do with what they test. */
    var invGst={mode:'ex', note:''};
    ${extractFn(SRC, 'invGstAdjust')}
    ${extractFn(SRC, 'gemCanon')}
    ${extractFn(SRC, 'gemHist')}
    ${extractFn(SRC, 'gemPackEq')}
    ${extractFn(SRC, 'gemMergeLine')}
    ${extractFn(SRC, 'gemMatchSuspect')}
    ${extractFn(SRC, 'gemRowLocked')}
    ${extractFn(SRC, 'gemNormKey')}
    ${extractFn(SRC, 'gemCleanFields')}
    ${extractFn(SRC, 'gemApplyReadings')}
    gemApplyReadings({status:'ok', lines:[{rawText:'CHIPS 10KG', description:'CHIPS 10KG',
      derivedUnitPrice:99, unitType:'kg', packCount:null}]});
    return gemStatus;
  `);
  const ruled = { name: 'CHIPS 10KG', raw: 'CHIPS 10KG', unitPrice: 2.5, unit: 'kg',
    bestId: 'P1', conf: 0.9, tier: 'hi', cands: [], manualPick: true };
  S.rows = [ruled];
  run(S);
  assert.equal(ruled.gemMatchReview, undefined, 'the wrong-match check never ran on a human-ruled row');
  assert.equal(ruled.gemPriceReview, undefined, 'nor did the price-history check');
  assert.equal(ruled.bestId, 'P1', 'and the row is left exactly as the user left it');

  // The same row, NOT ruled on, does get refereed — proving the skip above is the manualPick, not the fixture.
  const unruled = { name: 'CHIPS 10KG', raw: 'CHIPS 10KG', unitPrice: 2.5, unit: 'kg',
    bestId: 'P1', conf: 0.9, tier: 'hi', cands: [] };
  S.rows = [unruled];
  run(S);
  assert.ok(unruled.gemMatchReview || unruled.gemPriceReview,
    'an unruled row IS refereed — so the window is exactly what the ruling costs');
});

test('while the referee is outstanding there is nothing to pick, tick or teach', () => {
  // The consequence of the test above: the review must not RENDER actionable controls in the window.
  // Disabling Confirm All alone left every per-row ruling exposed, and those are the rulings that
  // silence the check.
  const render = extractFn(SRC, 'renderInvReview');
  const gate = render.indexOf('gemPending()');
  const tableBuild = render.indexOf("<table class=\"invtable\">");
  assert.ok(gate >= 0, 'renderInvReview must gate on the referee');
  assert.ok(tableBuild < 0 || gate < tableBuild, 'the gate must come BEFORE the table is built');
  assert.match(render, /gemPending\(\)\s*\)\s*\{[^}]*renderInvWaiting[^}]*return/,
    'and it must return without building anything actionable');
});

test('the waiting panel offers no control of any kind', () => {
  const wait = extractFn(SRC, 'renderInvWaiting');
  ['invSel', 'invAppr', 'invApply', 'invPrice', 'pack-teach', 'ni-add-btn', 'cand-chip', '<button', '<select', '<input']
    .forEach((frag) => assert.ok(!wait.includes(frag), `the waiting panel must not render ${frag}`));
  assert.match(wait, /Nothing has been saved/, 'and it says where the user stands');
});

/* ---------------------------------------------------------------------------
   2. The timeout, and what a late response may do after it.
   --------------------------------------------------------------------------- */

/* Runs the REAL gemFireSecondReader body against a controllable clock and a fetch the test resolves by
   hand, so "the response arrived after the timeout" is an observable sequence rather than a guess. */
function makeReader(opts) {
  opts = opts || {};
  const S = { timers: [], now: 1000, renders: 0, applied: [], fetches: 0, aborted: 0 };
  // eslint-disable-next-line no-new-func
  const factory = new Function('S', 'opts', `
    "use strict";
    var gemToken=0, gemStatus=null, gemApplied=false, gemCheckStart=0;
    var GEM_MIN_VISIBLE=900;
    var aiInvoiceCheck=(opts.aiOn===false?false:true);
    var settleFetch=null, rejectFetch=null;
    function setTimeout(fn, ms){ S.timers.push({fn:fn, at:S.now+ms}); return S.timers.length; }
    function clearTimeout(id){ if(id) S.timers[id-1]=null; }
    var Date={ now: function(){ return S.now; } };
    var AbortController = opts.noAbortController ? undefined : function(){
      this.signal={}; this.abort=function(){ S.aborted++; if(rejectFetch) rejectFetch(new Error('aborted')); };
    };
    function renderInvReview(){ S.renders++; }
    function gemApplyReadings(p){ S.applied.push(p); gemStatus='checked'; renderInvReview(); }
    function prodCategories(){ return []; }
    function fetch(){ S.fetches++; return new Promise(function(res,rej){ settleFetch=res; rejectFetch=rej; }); }
    ${extractFn(SRC, 'gemSettle')}
    ${extractFn(SRC, 'gemFireSecondReader')}
    return {
      fire: function(t){ gemStatus='checking'; gemApplied=false; gemCheckStart=S.now; gemFireSecondReader(t||'x'); },
      tick: function(ms){
        S.now += ms;
        var due=S.timers.filter(function(t){ return t && t.at<=S.now; });
        due.forEach(function(t){ var i=S.timers.indexOf(t); if(i>=0) S.timers[i]=null; t.fn(); });
      },
      respond: function(payload){ if(settleFetch) settleFetch({ok:true, json:function(){ return Promise.resolve(payload); }}); },
      status: function(){ return gemStatus; },
      setApplied: function(){ gemApplied=true; },
      token: function(){ return gemToken; }
    };
  `);
  return { S, r: factory(S, opts) };
}

const flush = () => new Promise(r => global.setTimeout(r, 0));

test('a response that arrives normally is merged', async () => {
  const { S, r } = makeReader({});
  r.fire();
  assert.equal(S.fetches, 1);
  r.tick(1500);                                   // past GEM_MIN_VISIBLE, well short of the timeout
  r.respond({ status: 'ok', lines: [] });
  await flush(); await flush();
  r.tick(0);
  assert.equal(S.applied.length, 1, 'an in-time response is the whole point of the referee');
  assert.equal(r.status(), 'checked');
});

test('when nothing ever settles, the gate releases rather than trapping the user', async () => {
  // The trap this guards is real: gemFireSecondReader only aborts where AbortController exists, so a
  // hung socket used to leave gemStatus 'checking' forever. Harmless before the gate; a permanent lock
  // after it. 20s sits outside both budgets in play — api/parse-invoice.js caps Gemini at 15s and the
  // client aborts at 20s — so it fires only when neither terminated.
  const { r } = makeReader({ noAbortController: true });
  r.fire();
  r.tick(19000);
  assert.equal(r.status(), 'checking', 'it must not give up before the real budgets have elapsed');
  r.tick(2000);
  assert.equal(r.status(), 'unavailable');
  assert.equal(invConfirmState(r.status(), true).disabled, false, 'the gate is released');
  assert.equal(invConfirmState(r.status(), true).unverified, true, 'and honest about why');
});

test('a late response AFTER the timeout is discarded — no surprise reversal once the user can act', async () => {
  const { S, r } = makeReader({ noAbortController: true });
  r.fire();
  r.tick(21000);
  assert.equal(r.status(), 'unavailable');
  r.respond({ status: 'ok', lines: [{ rawText: 'x', derivedUnitPrice: 9, unitType: 'kg' }] });
  await flush(); await flush();
  r.tick(0);
  assert.equal(S.applied.length, 0, 'the user has already been handed the decision — the AI does not take it back');
  assert.equal(r.status(), 'unavailable');
});

test('a late response after the user has APPLIED is discarded (v62 rule, unchanged)', async () => {
  const { S, r } = makeReader({});
  r.fire();
  r.tick(1500);
  r.setApplied();                                  // applyInvoice sets gemApplied=true
  r.respond({ status: 'ok', lines: [] });
  await flush(); await flush();
  r.tick(0);
  assert.equal(S.applied.length, 0, 'human ruling is final');
});

test('with the AI check off, no request is made and nothing is ever gated', () => {
  const { S, r } = makeReader({ aiOn: false });
  r.fire();
  assert.equal(S.fetches, 0, 'v81: AI invoice check OFF means no API call at all');
  assert.equal(invConfirmState(r.status(), false).disabled, false);
});

test('confirmApplyInvoice refuses while pending — the one choke point every apply passes through', () => {
  // The button is disabled, but applyInvoice is also reachable through askConfirm's callback, so the
  // guard lives where every path meets rather than on the control.
  const fn = extractFn(SRC, 'confirmApplyInvoice');
  assert.match(fn, /^function confirmApplyInvoice\(\)\{[^]*?gemPending\(\)/,
    'the pending check must come before any apply work');
  const guardAt = fn.indexOf('gemPending()');
  const applyAt = fn.indexOf('applyInvoice(');
  assert.ok(guardAt >= 0 && guardAt < applyAt, 'gemPending must be checked before applyInvoice can run');
});

/* ---------------------------------------------------------------------------
   6. invRowState's review conditions, one at a time (180).

   The state machine is CLAUDE.md's "single source of truth — the summary and the cards must never
   disagree", and every condition in it is a separate reason a human must look at the row. They were
   pinned as a group, through rendered markup, which cannot tell one condition from another: the
   mutation gate turned `r.needManual || r.unitMismatch` into `&&` and nothing in the suite noticed,
   even though that alone un-flags every row whose unit could not be reconciled.

   Only 'matched' is ever pre-ticked, so a condition that stops returning 'review' does not merely
   mislabel a row — it auto-ticks a row nobody checked, and Confirm All writes the price.
   --------------------------------------------------------------------------- */

/* 0b: invRowState now asks invUnitRebase whether applying the row would change what its product is
   measured in, so the harness has to carry the real chain and a real product to ask about. Every
   link is EXTRACTED — a stub of unitCatCategory or of invPriceUnit would be a copy of the very
   comparison the guard exists to make. `products` lets a test give P0108 whatever base_unit the case
   needs; the default is a per-gram product, which is what every pre-existing case here assumed. */
const buildRowState = (products) => {
  // eslint-disable-next-line no-new-func
  return new Function('BYID', `"use strict";
    var byId = BYID;
    ${extractFn(SRC, 'unitCatCategory')}
    ${extractFn(SRC, 'unitToBaseFields')}
    ${extractFn(SRC, 'kingRepointGuard')}
    ${extractFn(SRC, 'invPriceUnit')}
    ${extractFn(SRC, 'invUnitRebase')}
    ${extractFn(SRC, 'invRowState')}
    return invRowState;`)(products);
};
const rowState = buildRowState({ P0108: { id: 'P0108', base_unit: 'g' } });

// A row with nothing wrong with it: high-confidence match, no flags. The baseline every case below
// changes exactly ONE field of, so the assertion names the condition and not the fixture.
const cleanRow = () => ({ addNew: false, uncertain: false, bestId: 'P0108', needManual: false,
                          unitMismatch: false, needsAttention: false, gemReview: false,
                          gemMatchReview: false, gemPriceReview: false, tier: 'hi' });

test('the clean row is the only one that reaches matched — and matched is the only pre-ticked state', () => {
  assert.equal(rowState(cleanRow()), 'matched');
});

test('EACH review condition alone is enough — none of them needs a second flag to count', () => {
  const cases = [
    ['needManual', 'the parser could not resolve the line'],
    ['unitMismatch', 'the invoice unit and the stored unit disagree'],
    ['needsAttention', 'the price moved more than 12%'],
    ['gemReview', 'the AI adopted a value the parser disagreed with'],
    ['gemMatchReview', 'the AI suspects the wrong product was matched'],
    ['gemPriceReview', 'the AI suspects the price was misread'],
    ['uncertain', 'the match itself is uncertain'],
  ];
  for (const [flag, why] of cases) {
    const r = Object.assign(cleanRow(), { [flag]: true });
    assert.equal(rowState(r), 'review', `${flag} alone must mean review — ${why}`);
  }
});

test('a row with no match at all is review, and an add-new row is new', () => {
  assert.equal(rowState(Object.assign(cleanRow(), { bestId: null })), 'review');
  assert.equal(rowState(Object.assign(cleanRow(), { addNew: true })), 'new');
  assert.equal(rowState(Object.assign(cleanRow(), { addNew: true, unitMismatch: true })), 'new',
    'addNew is checked first: an add-new row has no stored product to disagree with');
});

test('a low-confidence match still waits for a human tick', () => {
  assert.equal(rowState(Object.assign(cleanRow(), { tier: 'mid' })), 'review');
  assert.equal(rowState(Object.assign(cleanRow(), { tier: 'lo' })), 'review');
});
