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
const keptCount = (writes) => new Function('W', `
  "use strict";
  ${extractFn(SRC, 'writeSaved')}
  ${extractFn(SRC, 'importKeptCount')}
  return importKeptCount(W);
`)(writes);

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

test('253: a partial import says how many the SERVER kept, in the headline card', () => {
  const html = render([CHANGES, 0, 0, 0, {}, 4, 36]);
  assert.match(html, /4 of 36 prices saved/, 'the two numbers a person needs to act on');
  assert.match(html, /did not reach the server/, 'and what happened to the rest');
  assert.match(html, /is-warn/, 'carried as a warning, not a muted aside');
});

test('253: a FULL import says nothing extra — the line is for a shortfall, not a receipt', () => {
  const html = render([CHANGES, 0, 0, 0, {}, 36, 36]);
  assert.doesNotMatch(html, /of 36 prices saved/,
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
  assert.match(html, /0 of 12 prices saved/, 'zero is a number and must be said, not treated as absent');
});

test('253: one price reads as "price", not "prices"', () => {
  const html = render([CHANGES, 0, 0, 0, {}, 0, 1]);
  assert.match(html, /0 of 1 price saved/);
  assert.doesNotMatch(html, /1 prices/);
});
