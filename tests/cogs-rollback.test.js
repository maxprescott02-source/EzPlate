/*
 * cogs-rollback.test.js — 244. A refused food-cost-target write takes the number back with it.
 *
 * QUEUE item 15. `setCogs` moved `cogsPct` — which every suggested price and every good/bad colour
 * in the app is computed from — and then sent the write unawaited with its promise discarded. When
 * the server refused (187's three owner-only policies on this one `app_settings` key, or no signal
 * at all) `pushWrite` toasted, and the SCREEN kept the rejected target until a reload.
 *
 * ⚠️ WHAT THIS FILE ASSERTS IS THE ROLLBACK, NOT THE REFUSAL, and the item said so for a reason:
 * `tests/roles-client.test.js` already pins that an unknown role reads as owner and that the four
 * controls are offered, so the whole existing role suite is green against this defect and always
 * was. A test that checked "the write was rejected" would be too — the server was never wrong here.
 * The measurable harm is a NUMBER, so the assertions are on the number and on the price derived
 * from it: a $6 dish against a rejected 30% reads $20 where the honest answer is $15.
 *
 * WHAT RUNS: the real shipped `cogsRound`, `applyCogs`, `setCogs`, `foodTarget` and `fmtTargetPct`,
 * brace-extracted from js/app.js. Nothing here re-implements a shipped decision.
 *
 * THE FIXTURE'S THREE NUMBERS ARE DELIBERATELY ALL DIFFERENT — boot 40, confirmed 32.5, refused 30
 * — because CLAUDE.md roster 184(b) is a fixture whose fields agree being unable to say which one
 * the code read. Rolling back to "the value before this call" and rolling back to "the last value
 * the server confirmed" are two different fixes, and only a fixture where those differ can tell
 * them apart.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

/* CLAUDE.md roster 183(a): a source assertion searches PROSE as well as code, and the prose here is
   this very mechanism being explained at its own site. Strip comments before any grep. */
const jsCode = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
  .map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');

/* The sandbox. `dbSetSetting` is the SERVER's answer and is the only thing stubbed — it is an
   observed collaborator, not a decision re-implemented. It follows pushWrite's real contract:
   resolves to the result or to `{error}`, and NEVER to null (CLAUDE.md, Tier 2 Writes). */
function harness(opts) {
  opts = opts || {};
  const C = { writes: [], renders: 0, resolvers: [] };
  // eslint-disable-next-line no-new-func
  const api = new Function('C', 'OPT', `
    "use strict";
    /* A real HTMLInputElement's \`value\` setter STRINGIFIES, and the app assigns a number to it
       here and at the boot read. A stub holding whatever it was given would let a number-vs-string
       bug through — CLAUDE.md 195: a fake DOM must not collapse a step the real one keeps. */
    var _fv = String(OPT.boot === undefined ? 40 : OPT.boot);
    var field = OPT.noField ? null : { get value(){ return _fv; }, set value(v){ _fv = String(v); } };
    var document = { getElementById: function(id){ return id === 'setCogsInput' ? field : null; } };
    var COGS_PCT_DEFAULT = 40;
    var cogsPct = OPT.boot === undefined ? 40 : OPT.boot;
    var cogsServer = cogsPct;
    var _cogsSeq = 0, _cogsConfirmed = 0;
    function renderAnalysis(){ C.renders++; }
    function dbSetSetting(key, val){
      C.writes.push([key, val]);
      if(OPT.manual) return new Promise(function(res){ C.resolvers.push(res); });
      return Promise.resolve(OPT.refuse ? {error:{message:'permission denied for table app_settings', code:'42501'}} : {data:[{key:key, value:val}]});
    }
    ${extractFn(SRC, 'cogsRound')}
    ${extractFn(SRC, 'applyCogs')}
    ${extractFn(SRC, 'setCogs')}
    ${extractFn(SRC, 'foodTarget')}
    ${extractFn(SRC, 'fmtTargetPct')}
    return {
      setCogs: setCogs, foodTarget: foodTarget, fmtTargetPct: fmtTargetPct, cogsRound: cogsRound,
      field: field,
      get cogsPct(){ return cogsPct; },
      get cogsServer(){ return cogsServer; },
      refuse: function(v){ OPT.refuse = v; }
    };
  `);
  const A = api(C, opts);
  A.calls = C;
  /* The one number a café owner actually reads: what the app tells them to sell a $6 dish for. */
  A.suggested = (cost) => (cost || 6) / A.foodTarget();
  return A;
}

test('244: a refused target write leaves the client showing what the server holds', { timeout: 5000 }, async () => {
  const A = harness({ boot: 40, refuse: true });
  assert.strictEqual(A.suggested(6), 15, 'precondition: 40% target suggests $15.00 for a $6 dish');

  A.field.value = '30';
  const r = await A.setCogs(30, true);

  assert.deepStrictEqual(A.calls.writes, [['food_cost_target', 30]], 'the write is still attempted — the server is what decides');
  assert.ok(r && r.error, 'precondition: the server refused');
  assert.strictEqual(A.cogsPct, 40, 'the target is back to the value the server holds');
  assert.strictEqual(A.suggested(6), 15, 'and so is the price on screen — $20 here was the defect');
  assert.strictEqual(A.field.value, '40', 'the field cannot be left stating a target nothing else agrees with');
});

test('244: an accepted write is what moves the confirmed value', { timeout: 5000 }, async () => {
  const A = harness({ boot: 40, refuse: false });
  A.field.value = '30';
  const r = await A.setCogs(30, true);
  assert.ok(r && !r.error, 'precondition: the server accepted');
  assert.strictEqual(A.cogsPct, 30, 'an accepted target stands');
  assert.strictEqual(A.cogsServer, 30, 'and becomes the value a later refusal rolls back to');
  assert.strictEqual(A.suggested(6), 20, 'the price follows it');
});

test('244: the rollback goes to the last CONFIRMED value, not to the previous client one', { timeout: 5000 }, async () => {
  /* The three numbers differ on purpose. A rollback to "what cogsPct was before this call" would
     land on 32.5 here too — so the SECOND refusal is what tells the two fixes apart. */
  const A = harness({ boot: 40, refuse: false });
  A.field.value = '32.5';
  await A.setCogs(32.5, true);
  assert.strictEqual(A.cogsServer, 32.5, 'precondition: 32.5 is confirmed');

  A.refuse(true);
  A.field.value = '30';
  await A.setCogs(30, true);
  assert.strictEqual(A.cogsPct, 32.5, 'back to 32.5, the confirmed value — not 40, and not the 30 that was refused');
  assert.strictEqual(A.field.value, '32.5');

  /* And again from there: a second refusal must not walk the number back a step each time. */
  A.field.value = '25';
  await A.setCogs(25, true);
  assert.strictEqual(A.cogsPct, 32.5, 'a second refusal lands on the same confirmed value, not on 30');
});

test('244: a refusal of a superseded value does not clobber a newer one — both settle orders', { timeout: 5000 }, async () => {
  /* `#setCogsInput` is debounced now, but a second edit can still be in flight before the first
     settles (two devices, a slow first write, a programmatic dispatch). Only a refusal of what is
     CURRENTLY on screen may move it, or the older answer overwrites the newer edit. */
  for (const order of [[0, 1], [1, 0]]) {
    const A = harness({ boot: 40, manual: true });
    const p1 = A.setCogs(30, true);
    const p2 = A.setCogs(35, true);
    assert.strictEqual(A.cogsPct, 35, 'precondition: the newer edit is what is on screen');

    const refuse = { error: { message: 'permission denied', code: '42501' } };
    order.forEach((i) => A.calls.resolvers[i](refuse));
    await Promise.all([p1, p2]);

    assert.strictEqual(A.cogsPct, 40, `settle order ${order.join(',')}: both refused, so the confirmed 40 stands`);
    assert.strictEqual(A.cogsServer, 40);
  }
});

test('244: a refusal of a superseded value leaves an ACCEPTED newer one alone', { timeout: 5000 }, async () => {
  const A = harness({ boot: 40, manual: true });
  const p1 = A.setCogs(30, true);
  const p2 = A.setCogs(35, true);
  A.calls.resolvers[1]({ data: [{ key: 'food_cost_target', value: 35 }] });   // the newer one lands
  A.calls.resolvers[0]({ error: { message: 'permission denied', code: '42501' } });   // the older is refused, late
  await Promise.all([p1, p2]);
  assert.strictEqual(A.cogsPct, 35, 'the accepted newer target survives a late refusal of the older one');
  assert.strictEqual(A.cogsServer, 35);
});

test('244: two writes that both SUCCEED out of order leave the NEWER one confirmed', { timeout: 5000 }, async () => {
  /* Found by 244's own pre-push review, measured against the real functions, and it is the fix's
     own defect rather than the item's: a response's arrival order is not its send order. The
     debounce sends one write 500ms after typing stops and a blur flushes the next immediately, so
     two really can be in flight — and `cogsServer = pct` on every success let the LATE answer for
     the OLDER value win. The screen and the server both hold 35; the rollback target was 30.
     Asserted through a subsequent refusal, because `cogsServer` is not a number any user reads —
     what it does is decide where a refusal lands, and that is where the harm was. */
  const A = harness({ boot: 40, manual: true });
  const p1 = A.setCogs(30, true);
  const p2 = A.setCogs(35, true);
  A.calls.resolvers[1]({ data: [{ key: 'food_cost_target', value: 35 }] });   // the NEWER answer, first
  A.calls.resolvers[0]({ data: [{ key: 'food_cost_target', value: 30 }] });   // the older, late
  await Promise.all([p1, p2]);
  assert.strictEqual(A.cogsServer, 35, 'the confirmed value is the newer write, not whichever answered last');

  A.field.value = '25';
  const p3 = A.setCogs(25, true);
  A.calls.resolvers[2]({ error: { message: 'permission denied', code: '42501' } });
  await p3;
  assert.strictEqual(A.cogsPct, 35, 'so a later refusal rolls back to 35 — 30 is a number nobody chose');
  assert.strictEqual(A.field.value, '35');
});

test('244: a re-save of the SAME value is told apart by its sequence, not by its number', { timeout: 5000 }, async () => {
  /* The case the value guard alone cannot see: both writes carry pct=30, so `cogsPct===pct` is true
     for the older one's refusal even though a newer write is still in flight and will decide. */
  const A = harness({ boot: 40, manual: true });
  const p1 = A.setCogs(30, true);
  const p2 = A.setCogs(30, true);
  A.calls.resolvers[0]({ error: { message: 'permission denied', code: '42501' } });   // the older, refused
  A.calls.resolvers[1]({ data: [{ key: 'food_cost_target', value: 30 }] });           // the newer, accepted
  await Promise.all([p1, p2]);
  assert.strictEqual(A.cogsPct, 30, 'the accepted write is the last word, not the refusal that raced it');
  assert.strictEqual(A.cogsServer, 30);
});

test('244: the field is only restored while it still shows the refused number', { timeout: 5000 }, async () => {
  const A = harness({ boot: 40, manual: true });
  const p = A.setCogs(30, true);
  A.field.value = '37';                                   // the user has typed on while it was in flight
  A.calls.resolvers[0]({ error: { message: 'permission denied', code: '42501' } });
  await p;
  assert.strictEqual(A.field.value, '37', 'a rollback must not rewrite a field somebody is typing into');
  assert.strictEqual(A.cogsPct, 40, 'the costing state is still put back — the two are separate questions');
});

test('244: setCogs RETURNS the write, so a caller can sequence on it', { timeout: 5000 }, async () => {
  const A = harness({ boot: 40, refuse: false });
  const p = A.setCogs(30, true);
  assert.ok(p && typeof p.then === 'function', 'a persisting call returns the promise — it used to return undefined');
  const r = await p;
  assert.ok(r && r.data, 'and it resolves to the write result');
  assert.strictEqual(A.setCogs(30, false), undefined, 'a local-only apply has nothing to settle and says so');
});

test('244: a local-only apply sends no write and still repaints', { timeout: 5000 }, async () => {
  const A = harness({ boot: 40, refuse: true });
  const before = A.calls.renders;
  A.setCogs(30, false);
  assert.deepStrictEqual(A.calls.writes, [], 'no write');
  assert.strictEqual(A.cogsPct, 30, 'the figures follow the field immediately — that is the live preview');
  assert.ok(A.calls.renders > before, 'and renderAnalysis ran');
});

test('244: a missing field is not a crash — the rollback still moves the number', { timeout: 5000 }, async () => {
  const A = harness({ boot: 40, refuse: true, noField: true });
  await A.setCogs(30, true);
  assert.strictEqual(A.cogsPct, 40);
});

/* ---------------------------------------------------------------------------------------------
   QUEUE item 25, riding this batch: ONE precision, in all three places.
   --------------------------------------------------------------------------------------------- */

test('25: the settable precision is one decimal, and a stored 32.5 survives being touched', { timeout: 5000 }, async () => {
  const A = harness({ boot: 32.5, refuse: false });
  await A.setCogs(32.5, true);
  assert.strictEqual(A.cogsPct, 32.5, 'this rounded to 33 before — the first Settings touch rewrote a stored target');
  assert.deepStrictEqual(A.calls.writes, [['food_cost_target', 32.5]], 'and wrote the rounded-up number to the server');
});

test('25: cogsRound clamps to [1,99] and holds one decimal', () => {
  const A = harness({});
  assert.strictEqual(A.cogsRound(32.5), 32.5);
  assert.strictEqual(A.cogsRound(32.55), 32.6, 'a precision the app cannot enter is not carried');
  assert.strictEqual(A.cogsRound(32.44), 32.4);
  assert.strictEqual(A.cogsRound(0.5), 1, 'clamped low');
  assert.strictEqual(A.cogsRound(200), 99, 'clamped high');
  assert.strictEqual(A.cogsRound(40), 40, 'a whole number stays whole');
});

test('25: what is settable is what fmtTargetPct renders', { timeout: 5000 }, async () => {
  const A = harness({ boot: 40, refuse: false });
  assert.strictEqual(A.fmtTargetPct(), '40%', 'a whole target renders without a decimal');
  await A.setCogs(32.5, true);
  assert.strictEqual(A.fmtTargetPct(), '32.5%', 'and a fractional one renders the decimal it was set to');
  /* The ~10 sites that concatenate cogsPct raw must print the same thing, which is only true while
     cogsPct is held at one decimal. This is the reason both entry points round. */
  assert.strictEqual('at ' + A.cogsPct + '%', 'at ' + A.fmtTargetPct(), 'raw concatenation and the formatter agree');
});

test('25: BOTH entry points round through the same function', () => {
  /* ⚠️ A COUPLING CHECK, NOT A BEHAVIOUR TEST, and it is labelled as one because CLAUDE.md's roster
     is largely tests that grep source and prove nothing. The behaviour is pinned above by running
     cogsRound and setCogs. What cannot be run here is bootstrapSync's `food_cost_target` read — it
     is one line inside a 400-line async boot — so what is asserted is that the read names the same
     rounding function the setter does, which is the whole of item 25's "make the three agree".
     If this ever goes red because the line moved, run the read; do not delete the assertion. */
  const code = jsCode(SRC);
  const line = code.split('\n').filter((l) => l.includes("r.key==='food_cost_target'") || (l.includes('cogsRow') && l.includes('parseFloat')));
  assert.ok(line.length >= 1, 'the boot read of food_cost_target is still findable');
  const read = line.find((l) => l.includes('parseFloat'));
  assert.ok(read, 'the boot read parses the stored value');
  assert.match(read, /cogsRound\(/, 'and rounds it through the same function setCogs uses');
  assert.match(read, /cogsServer/, 'and records it as what the server holds, which is what a refusal rolls back to');
});
