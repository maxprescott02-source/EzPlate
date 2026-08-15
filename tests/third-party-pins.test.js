/*
 * third-party-pins.test.js — the two third-party scripts that ship to production.
 *
 * CLAUDE.md: both run with full DOM access on a page holding the anon key and the
 * café's pricing, so both must stay PINNED TO AN EXACT VERSION and integrity-checked
 * wherever the load mechanism allows, and "changing a version means recomputing its
 * sha384 in the same commit". Until batch 195 NOTHING checked any of that — the rule
 * lived in prose only, and a floating "@2" or a stale hash would have shipped green.
 *
 * The hard part offline: a test cannot fetch the CDN and re-hash it (no network in
 * CI, no dependencies in this repo). So the (version, hash) PAIR is recorded here
 * as data. Bumping a version without recomputing its hash fails loudly against this
 * table, which is the whole point — it cannot tell you the hash is RIGHT, only that
 * you did not change the version and leave the old one behind.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const APP = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

/* The recorded pairs. Recompute with:
     curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A
   and update BOTH halves in the same commit. */
/* Each `ver` is the EXACT CODE FORM the version takes, never the bare number.
   Roster entry 183(a): a grep over a source file searches PROSE as well as code,
   and both of these versions are discussed in comments a few lines from where they
   are declared — so matching "4.10.38" would pass on the explanation alone. */
const PINS = [
  { what: 'pdf.js (main)', ver: "var PDFJS_VER='4.10.38'",
    sri: "integrity='sha384-z/XbAtvhBXJoK+yvYimnFuTCF6/2wTCDSIFD09/HtIfwFtvDKOMdAe5Z3wOChkmW'", where: APP },
  { what: 'supabase-js', ver: 'supabase-js@2.110.8"',
    sri: 'integrity="sha384-Tve8O+C6PBzsIMK/IRCwHbi8fyEzXIlIs6OfVBZHubplwYhaQF/4Mzxqgg+pp/oy"', where: HTML },
];

test('both third-party scripts carry the recorded version AND its recorded sha384', () => {
  for (const p of PINS) {
    assert.ok(p.where.includes(p.ver),
      p.what + ': the recorded pin `' + p.ver + '` is not in the source. If you bumped the ' +
      'version, recompute the sha384 and update BOTH halves of this table in the same commit.');
    assert.ok(p.where.includes(p.sri),
      p.what + ': the version is present but its recorded sha384 is NOT. A version was changed ' +
      'without recomputing the hash — that is the exact failure this pins.');
  }
});

test('no floating major-version specifier survives on either script', () => {
  // "@2" / "@4" instead of "@2.110.8" lets jsdelivr swap the file under a fixed hash,
  // which breaks the load outright — and under NO hash, swaps the code silently.
  for (const src of [APP, HTML]) {
    const floating = src.match(/cdn\.jsdelivr\.net\/npm\/[^@'"]+@\d+(?=[/'"])/g) || [];
    assert.deepStrictEqual(floating, [],
      'floating version specifier on a jsdelivr URL: ' + floating.join(', '));
  }
});

test('every jsdelivr URL in the shipped code is one of the three we know about', () => {
  // Catches a fourth script arriving without Max's yes (CLAUDE.md: "Adding a third
  // needs Max's yes"), and catches a URL drifting away from the PDFJS_VER constant.
  // The pdf.js URLs are BUILT BY CONCATENATION ('…pdfjs-dist@'+PDFJS_VER+'/legacy/…'),
  // so the alternation has to admit that form or it truncates at the quote and every
  // URL looks unrecognised.
  const RE = /https:\/\/cdn\.jsdelivr\.net\/npm\/(?:@[\w.-]+\/)?[\w.-]+@(?:[\d.]+|'\+PDFJS_VER\+')[^'"]*/g;
  const urls = new Set([...(APP + HTML).matchAll(RE)].map(m => m[0]));
  const allowed = new Set([
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.8',
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@'+PDFJS_VER+'/legacy/build/pdf.min.mjs",
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@'+PDFJS_VER+'/legacy/build/pdf.worker.min.mjs",
  ]);
  assert.ok(urls.size >= 3, 'expected all three script URLs to be found, got ' + urls.size);
  for (const u of urls) {
    assert.ok(allowed.has(u),
      'unexpected third-party script URL: ' + u + ' — a new dependency needs Max\'s yes');
  }
});

/* ---- the CVE floor and ceiling, which are the reason 195 happened at all ---- */

test('pdf.js stays inside the version window that is clear of BOTH known RCEs', () => {
  const ver = (APP.match(/var PDFJS_VER='([\d.]+)'/) || [])[1];
  assert.ok(ver, 'PDFJS_VER constant not found in js/app.js');
  const n = ver.split('.').map(Number);
  const cmp = (a, b) => (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]);

  // GHSA-wgrm-67xf-hhpq / CVE-2024-4367: arbitrary JS execution, fixed in 4.2.67.
  assert.ok(cmp(n, [4, 2, 67]) >= 0,
    'pdf.js ' + ver + ' is below 4.2.67 and carries CVE-2024-4367');

  // GHSA-hq66-cqwq-w95j: a SECOND arbitrary-JS-execution hole, introduced 5.6.83 and
  // fixed in 6.2.108. This is why 195 chose 4.10.38 over "the latest" — the 5.x line
  // is a downgrade in safety, and nothing but this assertion would say so to whoever
  // next reaches for the newest version.
  const inSecondHole = cmp(n, [5, 6, 83]) >= 0 && cmp(n, [6, 2, 108]) < 0;
  assert.ok(!inSecondHole,
    'pdf.js ' + ver + ' is inside the GHSA-hq66-cqwq-w95j window (5.6.83 <= v < 6.2.108)');
});

/* ---- the load MECHANISM, which is the half that fails silently ---- */

test('pdf.js is loaded as an ES module, because 4.x ships no UMD build', () => {
  const fn = APP.slice(APP.indexOf('function ensurePdfjs('));
  const body = fn.slice(0, fn.indexOf('\n}') + 2);

  assert.match(body, /\.type\s*=\s*'module'/,
    'the injected script must be type="module" — 4.x pdf.min.mjs is an ES module');
  assert.match(body, /import\(PDFJS_SRC\)/,
    'the namespace must come from import(); an ES module defines no window.pdfjsLib');
  assert.match(body, /window\.pdfjsLib\s*=\s*ns/,
    'extractPdfText and the ensurePdfjs memo both read window.pdfjsLib');

  // The pairing is the actual trap: a classic script + .mjs loads and defines nothing,
  // and type="module" + .js would be the same mistake mirrored.
  assert.ok(/pdf\.min\.mjs/.test(APP) && !/pdf\.min\.js'/.test(APP),
    'the .mjs build must be used, and the dropped UMD pdf.min.js must not be referenced');
});

test('the module script is integrity-checked, and both settle paths reject with pdfjs-load', () => {
  const fn = APP.slice(APP.indexOf('function ensurePdfjs('));
  const body = fn.slice(0, fn.indexOf('\n}') + 2);

  assert.match(body, /\.integrity\s*=\s*'sha384-/, 'the module script must carry SRI');
  assert.match(body, /\.crossOrigin\s*=\s*'anonymous'/, 'SRI on a cross-origin script needs CORS');

  // Roster entry 184(a): a promise has two settle paths, and a test that only takes
  // the common one has pinned half a contract. import() can REJECT — if that arm does
  // not produce 'pdfjs-load', the caller's catch falls through to the image-only-PDF
  // message and blames the user's file for a network failure.
  const rejects = body.match(/rej\(new Error\('pdfjs-load'\)\)/g) || [];
  assert.equal(rejects.length, 2,
    'both failure arms — the script onerror AND the import() rejection — must reject with pdfjs-load');
});

/* ---- RUNNING ensurePdfjs, not reading it ----
 *
 * Everything above is a source grep, and the pre-push review of batch 195 proved
 * that is not enough: it deleted `res()` from the import() success arm, and all of
 * the assertions above stayed GREEN. The shipped consequence is worse than the
 * failure they do cover — the returned promise never settles, `extractPdfText`
 * awaits it forever, and picking a PDF hangs the upload with no toast and no error.
 * That is roster entry "a test whose assertion cannot distinguish right from wrong".
 *
 * So these three EXECUTE the real function. `new Function` is used rather than vm
 * because dynamic import() inside a vm context throws ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING,
 * while code built by new Function can import() normally. PDFJS_SRC is pointed at a
 * local .mjs fixture so no network is needed; the FUNCTION under test is the real
 * shipped source, sliced out of js/app.js — nothing here re-implements it.
 */
const { loadApp, extractFn } = require('./_extractfn');

function runEnsurePdfjs(srcUrl) {
  const body = extractFn(loadApp(), 'ensurePdfjs');
  const win = {};
  // `appended` is set ONLY by appendChild, never by createElement. That distinction is
  // the whole point: an element that is built and configured but never inserted never
  // loads, so the promise never settles — the same silent hang as a missing res(), and
  // the mutation gate caught this fake conflating the two.
  let appended = null;
  const doc = {
    createElement: () => ({}),
    head: { appendChild(node) { appended = node; } },
  };
  // __pdfjsPromise and PDFJS_VER are ensurePdfjs's own module-level neighbours; they
  // are supplied here rather than stubbed, because the function reads them directly.
  // PDFJS_VER is read out of the SOURCE, not hardcoded — a literal here would be a
  // second copy of the version that could agree with a stale app and never say so.
  const make = new Function('window', 'document', 'PDFJS_SRC', 'PDFJS_VER',
    'var __pdfjsPromise=null;\n' + body + '\nreturn ensurePdfjs;');
  const fn = make(win, doc, srcUrl, APP_VER);
  return { promise: fn(), el: () => appended, win };
}

const APP_VER = (APP.match(/var PDFJS_VER='([\d.]+)'/) || [])[1];

const STUB = 'file://' + path.join(__dirname, 'fixtures', 'pdfjs-stub.mjs');

/* The timeout is load-bearing, not boilerplate: the defect this test exists for is a
   promise that NEVER SETTLES, and node:test has no default timeout — without this the
   suite would hang forever instead of going red, which in CI is indistinguishable from
   a stuck runner. Five seconds is ~2500x the honest path (measured at ~2ms). */
test('RUNS: ensurePdfjs RESOLVES once the module loads, and publishes the namespace', { timeout: 5000 }, async () => {
  const r = runEnsurePdfjs(STUB);
  assert.ok(r.el(), 'the script must be APPENDED to the document — an element that is never inserted never loads');
  assert.equal(r.el().type, 'module', 'the injected element must be a module script');
  assert.ok(r.el().integrity && r.el().integrity.startsWith('sha384-'), 'SRI must be set before insertion');

  r.el().onload();          // the browser having fetched and verified the module
  await r.promise;          // <-- deleting res() from the success arm hangs HERE, and the test times out

  assert.ok(r.win.pdfjsLib, 'window.pdfjsLib must be published — extractPdfText reads it');
  assert.equal(typeof r.win.pdfjsLib.getDocument, 'function');
  assert.equal(r.win.pdfjsLib.GlobalWorkerOptions.workerSrc,
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + APP_VER + '/legacy/build/pdf.worker.min.mjs',
    'the worker must be pointed at the SAME pinned version as the main script');
});

test('RUNS: a failed module fetch rejects with pdfjs-load (the import() arm)', { timeout: 5000 }, async () => {
  const r = runEnsurePdfjs('file:///nonexistent/definitely-not-here.mjs');
  r.el().onload();          // the script element reported success; the import still fails
  await assert.rejects(r.promise, e => e.message === 'pdfjs-load',
    'the import() rejection must surface as pdfjs-load, or the caller blames the user\'s PDF');
});

test('RUNS: a failed script load rejects with pdfjs-load (the onerror arm)', { timeout: 5000 }, async () => {
  const r = runEnsurePdfjs(STUB);
  r.el().onerror();         // what an SRI mismatch or an offline café produces
  await assert.rejects(r.promise, e => e.message === 'pdfjs-load');
});

test('the worker is pinned to the same version and is documented as SRI-exempt', () => {
  const fn = APP.slice(APP.indexOf('function ensurePdfjs('));
  const body = fn.slice(0, fn.indexOf('\n}') + 2);
  assert.match(body, /workerSrc='https:\/\/cdn\.jsdelivr\.net\/npm\/pdfjs-dist@'\+PDFJS_VER\+'/,
    'the worker URL must be built from PDFJS_VER, so main and worker can never disagree');

  // CLAUDE.md allows exactly one pinned-only script, and only because new Worker()
  // has no integrity mechanism. The exemption has to stay STATED at the site, or the
  // next reader reads a missing hash as an oversight and "fixes" it into a broken load.
  const preamble = APP.slice(APP.indexOf('/* 195:'), APP.indexOf('function ensurePdfjs('));
  assert.match(preamble, /SRI/, 'the worker\'s SRI exemption must be explained at the site');
});
