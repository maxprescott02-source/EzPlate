/*
 * import-summary.test.js — 253, QUEUE item 90's first instance.
 *
 * THE DEFECT. `showImportSummary` is the corner card that says "Invoice imported · 36 prices", and
 * until this batch `applyInvoice` fired it SYNCHRONOUSLY off `n` — the count of rows the screen had
 * applied — without waiting for a single product write. An import whose upserts were all refused
 * still announced itself as done. `pushWrite` toasted each failure underneath it, so the user was
 * told twice, once truthfully and once not: a false completion rather than silent loss, which is
 * why item 21 graded it below the history half and 247 split it out.
 *
 * ⚠️ WHAT THIS FILE PINS IS THE SENTENCE, NOT THE PLUMBING. Whether the loop collects each write is
 * pinned in `tests/inv-unit-rebase-apply.test.js`; this runs the real `showImportSummary` against a
 * DOM stub and reads what it puts on screen. Two questions, two files, because a summary that reads
 * the manifest correctly and a loop that collects it are independently breakable.
 *
 * ⚠️ AND THE OLD FIVE-ARGUMENT CALL MUST STILL WORK. `kept`/`attempted` are optional on purpose —
 * the shortfall line is an addition, and a call without them prints exactly what it always did.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

/* The real function against a DOM stub that records the markup it builds. `money`, `esc` and
   `cogsPct` are the app's own — `esc` extracted rather than stubbed, for the reason
   `tests/dash-recent.test.js` records: a hand-rolled one disagreed with the shipped one twice. */
function render(args) {
  // eslint-disable-next-line no-new-func
  const api = new Function('OUT', 'ARGS', `
    "use strict";
    var cogsPct = 40;
    var el = { className:'', innerHTML:'', classList:{ add:function(){}, remove:function(){} },
               remove:function(){}, addEventListener:function(){}, appendChild:function(){},
               querySelector:function(){ return { addEventListener:function(){} }; } };
    var stack = { appendChild:function(n){ OUT.html = n.innerHTML; } };
    var document = {
      getElementById:function(id){ return id === 'cornerToasts' ? stack : null; },
      createElement:function(){ return el; },
      body:{ appendChild:function(){} }
    };
    function requestAnimationFrame(fn){ fn(); }
    function setTimeout(){ return 0; }
    function money(n){ return '$' + Number(n).toFixed(2); }
    ${extractFn(SRC, 'esc')}
    ${extractFn(SRC, 'showImportSummary')}
    showImportSummary.apply(null, ARGS);
    return OUT;
  `);
  return api({ html: '' }, args).html;
}

const CHANGES = [{ name: 'Flour', oldC: 0.006, newC: 0.0065, unit: 'g', dir: 1, pctAbs: 8 }];

/* The real `importKeptCount`, which is the decision the whole fix turns on. It was inline in
   `applyInvoice` until the mutation gate showed that flipping its tally to `oks.length` — attempted
   rather than kept, the defect restored exactly — survived every test in the batch, because nothing
   can run a line inside a 500-line function. */
const keptCount = (writes, ms) => new Function('W', 'MS', 'ST', `
  "use strict";
  /* The real bound, overridable per test. Left at the shipped value everywhere except the one test
     that is ABOUT the bound — a 15-second wait in a unit suite would be the hang roster 195 is
     about, in the test rather than the app. */
  var IMPORT_VERDICT_MS = MS;
  var setTimeout = ST;
  ${extractFn(SRC, 'writeSaved')}
  ${extractFn(SRC, 'importKeptCount')}
  return importKeptCount(W);
`)(writes, ms === undefined ? 15000 : ms, setTimeout);

const ok = (pid, saved) => ({ pid, write: Promise.resolve({ data: [], error: null, saved }) });

test('253: the count is what the manifest NAMED, not how many writes came back', async () => {
  /* Three writes resolve; two name their own product and one does not. A tally of resolutions says
     3 and is the defect; a tally of manifests says 2. */
  const n = await keptCount([ok('A', ['A']), ok('B', ['B']), ok('C', [])]);
  assert.strictEqual(n, 2, 'C resolved cleanly and saved nothing — that is the case a boolean misses');
});

test('253: a manifest naming SOMEONE ELSE does not count', async () => {
  /* A chunked write carries every id its chunk saved, so "the response mentions ids" is not the
     question — "does it mention MINE" is. */
  const n = await keptCount([ok('A', ['B', 'C'])]);
  assert.strictEqual(n, 0);
});

test('253: a REJECTED write is not kept, and does not take the count down with it', async () => {
  /* The offline arm. `pushWrite` resolves rather than rejecting, but a genuine network throw reaches
     here — and one bad write must not lose the verdict of the good ones beside it. */
  const n = await keptCount([ok('A', ['A']), { pid: 'B', write: Promise.reject(new Error('offline')) }]);
  assert.strictEqual(n, 1);
});

test('253: an error result is not kept either, whatever else it carries', async () => {
  const n = await keptCount([{ pid: 'A', write: Promise.resolve({ error: { message: 'nope' } }) }]);
  assert.strictEqual(n, 0, 'no manifest, nothing confirmed');
});

test('253: no writes is zero, not a crash', async () => {
  assert.strictEqual(await keptCount([]), 0);
  assert.strictEqual(await keptCount(undefined), 0);
});

test('253 (review): a write that NEVER SETTLES yields null, not a hang', { timeout: 400 }, async () => {
  /* THE MAJOR FINDING of 253's pre-push review, and it is roster 195 in the app rather than in a
     test: `pushWrite` always settles GIVEN that the fetch under it does, and `createClient` is built
     with no timeout. One stalled request on café data would hold this open forever — and the caller
     waits on it before it renders anything, so the completion card would never appear at all.
     That is worse than the defect this batch fixed: the old code was wrong and always spoke.
     `null` is the third value — "no answer yet" — and the caller prints it as its own sentence. */
  /* ⚠️ THE TEST'S OWN TIMEOUT IS SHORT ON PURPOSE, AND IT IS A COST THIS BATCH MEASURED. With the
     bound under test set to 20ms, a working race answers instantly; the test timeout only bites when
     a MUTANT has broken the bound, and the mutation gate runs every mutant of this function on every
     push. At 5000ms the full gate went 240s -> 588s; at 400ms a broken-bound mutant costs 0.49s
     instead of 5.12s. **Testing a timeout makes the gate pay for it, so bound the test too.** */
  const forever = { pid: 'A', write: new Promise(() => {}) };
  assert.strictEqual(await keptCount([forever], 20), null, 'bounded, and null means unanswered');
});

test('253 (review): the bound does not fire when the writes DO answer', { timeout: 5000 }, async () => {
  /* The counterweight: a bound that always won would make every import read as unanswered, which is
     the same silence by a different route. */
  assert.strictEqual(await keptCount([ok('A', ['A'])], 5000), 1, 'a real answer beats the timer');
});

test('253: a partial import says how many the SERVER kept, in the headline card', () => {
  const html = render([CHANGES, 0, 0, 0, {}, 4, 36]);
  assert.match(html, /4 of 36 price writes saved/, 'the two numbers a person needs to act on');
  assert.match(html, /did not reach the server/, 'and what happened to the rest');
  assert.match(html, /is-warn/, 'carried as a warning, not a muted aside');
});

test('253: a FULL import says nothing extra — the line is for a shortfall, not a receipt', () => {
  const html = render([CHANGES, 0, 0, 0, {}, 36, 36]);
  assert.doesNotMatch(html, /of 36 price writes saved/,
    'every write landed, so a line about writes that did not is noise on the common path');
  assert.match(html, /Invoice imported/, 'and the card is otherwise unchanged');
});

test('253: the OLD five-argument call is untouched, which is what makes this safe to add', () => {
  /* Four existing callers and tests pass five arguments. If the shortfall line keyed off anything
     other than both counts being numbers, every one of them would grow a sentence about writes. */
  const html = render([CHANGES, 2, 0, 0, {}]);
  assert.match(html, /Invoice imported/);
  assert.doesNotMatch(html, /saved/, 'no shortfall line without counts');
  assert.doesNotMatch(html, /did not reach the server/);
});

test('253: kept === 0 is the case the defect was loudest on, and it is stated', () => {
  /* The whole import refused. Before this batch the card read "Invoice imported · 1 price" with no
     hint that nothing had landed — the false completion in its purest form. */
  const html = render([CHANGES, 0, 0, 0, {}, 0, 12]);
  assert.match(html, /0 of 12 price writes saved/, 'zero is a number and must be said, not treated as absent');
});

test('253: one write reads as "write", not "writes"', () => {
  const html = render([CHANGES, 0, 0, 0, {}, 0, 1]);
  assert.match(html, /0 of 1 price write saved/);
  assert.doesNotMatch(html, /1 price writes/);
});

test('253 (review): "price writes", never "prices" — the headline already means something else by it', () => {
  /* Finding 3. The headline counts `priceChanges` — rows that MOVED by more than half a percent —
     and this line counts every price the import sent, re-confirmations included. Both true, both
     called "prices", they legitimately differ: "2 prices ▲▼" beside "9 of 10 prices saved" reads as
     a contradiction on one card. Two meanings, two words. */
  const html = render([CHANGES, 0, 0, 0, {}, 9, 10]);
  assert.match(html, /1 price ▲/, 'the headline still counts the rows that moved');
  assert.match(html, /9 of 10 price writes saved/, 'and the shortfall counts what was sent');
});

test('253 (review): an UNANSWERED verdict says so, and never prints a count', () => {
  /* The bounded wait's arm. `kept === null` means the writes have not answered — printing
     "0 of 36 saved" there would claim something nobody has established, and the old code's sin was
     claiming the opposite thing on the same absence of evidence. */
  const html = render([CHANGES, 0, 0, 0, {}, null, 36]);
  assert.match(html, /36 price writes still saving/, 'it says what is actually known');
  assert.doesNotMatch(html, /0 of 36/, 'and does NOT render an unmeasured count');
  assert.doesNotMatch(html, /is-warn/, 'nor colour an unknown as a failure');
});


/* =============================================================================================
 * 253 (review) — DOES THIS IMPORT OWE A TREND POINT?
 *
 * The second major finding. The first cut gated `logHistory()` on the price manifest alone, and a
 * repoint inside an import takes the `addNew` branch — it increments `added` and `relinked` and
 * never touches `priceWrites`. So an invoice that only repointed an existing ingredient moved the
 * cost of every plate using it and logged nothing, which is the defect v114 exists to have fixed.
 * ========================================================================================== */

const movedCost = (kept, relinked) => new Function('K', 'R', `
  "use strict";
  ${extractFn(SRC, 'importMovedCost')}
  return importMovedCost(K, R);
`)(kept, relinked);

test('253 (review): a repoint alone owes a point, even with no price kept', () => {
  assert.strictEqual(movedCost(0, 1), true,
    'the addNew branch never touches priceWrites, and a repoint re-costs every plate using it');
});

test('253 (review): a kept price alone owes a point', () => {
  assert.strictEqual(movedCost(3, 0), true);
});

test('253 (review): nothing kept and nothing relinked owes nothing', () => {
  assert.strictEqual(movedCost(0, 0), false, 'an import the server refused entirely moved no cost');
});

test('253 (review): an UNANSWERED verdict does not log on its own…', () => {
  /* The bounded wait again. A point is a claim that a movement happened; "we do not know yet" is
     not one, and a point written now could not be taken back. */
  assert.strictEqual(movedCost(null, 0), false);
});

test('253 (review): …but a repoint alongside it still does', () => {
  /* The repoint is applied in memory and its own write is gated separately, so it is a movement
     whatever the price writes end up saying. */
  assert.strictEqual(movedCost(null, 2), true);
});
