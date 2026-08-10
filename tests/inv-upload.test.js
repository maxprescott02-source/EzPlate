/*
 * inv-upload.test.js — F8 (v147). The three-step upload, and the two review-screen defects the
 * queue item told this batch to answer rather than route onward.
 *
 * WHAT IS PINNED HERE AND WHY EACH NEEDS PINNING:
 *
 *  1. THE STEP MACHINE. `invStep` is the only thing that switches panels, and its correctness is
 *     entirely "exactly one of three is visible". A second place assigning `.hidden` is how two
 *     panels end up on screen together, so the count of assignment sites is asserted, not just the
 *     behaviour of the function.
 *
 *  2. THE [hidden] GUARD. `.inv-step` is hidden by the `hidden` attribute. An author `display` rule
 *     beats the UA's `[hidden]{display:none}` on ORIGIN — decided before specificity is compared —
 *     so an unguarded `.inv-step{display:block}` would leave all three panels stacked and no amount
 *     of specificity matching would fix it. This is CLAUDE.md's Tier 1 corollary, landing for the
 *     fourth time in this codebase; it gets a test rather than a comment this time.
 *
 *  3. EVERY FAILURE PATH RETURNS TO STEP 1. The scanning panel has no controls at all. Leaving the
 *     user on it with an error underneath means the recovery controls (browse again, the paste box)
 *     are on a panel they cannot see.
 *
 *  4. THE TICK WITH NOWHERE TO LIVE (the queue item's second question). An add-new row's tick lives
 *     on `r.newItem.approved`, and `r.newItem` does not exist until the form is opened. An
 *     AI-appended add-new row renders a checkbox and no form, so the tick was stored ONLY in the
 *     DOM — dropped by the next re-render, and, if it survived to Confirm, `collectNewItem`
 *     returned null and the whole import failed on "Fix the highlighted new item" with nothing
 *     highlighted. Answer: open the form on the first tick.
 *
 *  5. TINT VS HOVER (the queue item's first question). Decided: invoice review rows deliberately do
 *     not hover. `--warn-bg` is opaque and would be fully masked by a wash on exactly the rows the
 *     user is scanning — but the reason is the affordance, not the masking: this row is a form, not
 *     a button, and pressing it does nothing. Every other converted screen's row IS a button.
 *
 * Source assertions, not DOM ones, wherever the thing being protected is a source fact — Playwright
 * is not in `npm test`, so a rule that only a spec covers can be deleted silently (the `addProduct`
 * lesson). The measured half lives in tests/visual/v147-invoices.spec.js.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');

/* Every "X is deleted" assertion below has to read the file with its COMMENTS STRIPPED, and the
   reason is not tidiness: this repo tombstones what it removes, so `.inv-upload` and "Take a photo"
   both still appear in prose explaining why they are gone. A raw-text grep would fail on the
   tombstone and, worse, would PASS if someone deleted the tombstone and left the code. Stripping
   comments also means a comment can never satisfy one of these tests by accident. */
const noComments = (s, ...styles) => styles.reduce((acc, kind) => acc.replace(
  kind === 'block' ? /\/\*[\s\S]*?\*\//g
    : kind === 'line' ? /(^|[^:])\/\/.*$/gm
      : /<!--[\s\S]*?-->/g, kind === 'line' ? '$1' : ''), s);
const CSS_CODE = noComments(CSS, 'block');
const HTML_CODE = noComments(HTML, 'html');
const SRC_CODE = noComments(SRC, 'block', 'line');

/* -------------------------------------------------------------------------
   1. The step machine
   ------------------------------------------------------------------------- */

test('the three step panels exist, and step 1 is the only one that starts visible', () => {
  ['invStepChoose', 'invStepScan', 'invStepReview'].forEach((id) => {
    assert.ok(HTML.indexOf('id="' + id + '"') >= 0, id + ' must exist in the markup');
  });
  assert.match(HTML, /class="inv-step" id="invStepChoose">/, 'step 1 ships visible');
  assert.match(HTML, /id="invStepScan" hidden/, 'step 2 ships hidden');
  assert.match(HTML, /id="invStepReview" hidden/, 'step 3 ships hidden');
});

test('invStep is the ONLY thing that hides or shows a step panel', () => {
  const fn = extractFn(SRC, 'invStep');
  assert.match(fn, /\.hidden\s*=/, 'invStep sets .hidden');
  // Every `hidden =` write in the file that targets a step element. One function, one loop, one site.
  const sites = (SRC.match(/INV_STEPS\[/g) || []).length;
  assert.ok(sites >= 1, 'invStep reads the step map');
  const stray = (SRC.match(/getElementById\('invStep(Choose|Scan|Review)'\)/g) || []).length;
  assert.equal(stray, 0, 'no caller may reach a step panel by id — routing one panel by hand is how two end up open');
});

test('.inv-step carries no unguarded display rule (the [hidden] corollary)', () => {
  // Any `display` declaration whose selector mentions .inv-step must also carry :not([hidden]).
  const rules = CSS_CODE.match(/[^{}]*\.inv-step[^{}]*\{[^}]*\}/g) || [];
  const displayRules = rules.filter((r) => /display\s*:/.test(r.slice(r.indexOf('{'))));
  assert.ok(displayRules.length >= 1, 'there is at least one .inv-step display rule to check');
  displayRules.forEach((r) => {
    const selector = r.slice(0, r.indexOf('{'));
    assert.ok(selector.includes(':not([hidden])'),
      'an author display rule beats the UA [hidden] on ORIGIN — matching specificity does NOT fix it; the selector must not match a hidden element at all. Offender: ' + selector.trim());
  });
});

test('every render path lands the user on a step, and the two wait surfaces both mean step 3', () => {
  assert.match(extractFn(SRC, 'openInv'), /invStep\('choose'\)/, 'opening the modal starts at choose');
  assert.match(extractFn(SRC, 'renderInvReview'), /invStep\('review'\)/, 'a rendered review shows step 3');
  assert.match(extractFn(SRC, 'renderInvWaiting'), /invStep\('review'\)/,
    'the v113 referee wait is step 3 too — it replaces the rows in place, so bouncing back to step 2 would read as the file being re-read');
  assert.match(extractFn(SRC, 'handleInvFile'), /invStep\('scan'\)/, 'choosing a file shows scanning');
});

/* THE REAL handleInvFile, run against stubs, so the guard's CONDITION is exercised rather than its
   spelling. The first version of this test matched three substrings and asserted their left-to-right
   order, and the pre-push review proved it green against an INVERTED guard — the polarity flipped,
   the substrings unmoved. That is this project's oldest trap ("a test that records call ORDER passes
   against the broken code"), and the remedy it has always had is to call the real function.
   Only the synchronous head runs: a non-PDF reaches `new FileReader()` and returns, and the stub's
   readAsText does nothing, which is exactly the part under test. */
function runHandleInvFile({ modalOpen }) {
  const calls = { openInv: 0, steps: [] };
  const el = (extra) => Object.assign({ textContent: '', style: {}, classList: { contains: () => !!modalOpen } }, extra);
  // eslint-disable-next-line no-new-func
  const factory = new Function('CALLS', 'EL', `
    "use strict";
    var document = { getElementById: function(){ return EL(); } };
    function openInv(){ CALLS.openInv++; }
    function invStep(s){ CALLS.steps.push(s); }
    function invFileFailed(){ CALLS.steps.push('choose'); }
    function show(){}
    function setInvManual(){}
    function toast(){}
    function extractPdfText(){ return new Promise(function(){}); }   // never settles: the async tail is not what this test is about
    function FileReader(){ this.readAsText=function(){}; }
    var IMG_PDF_MSG='';
    ${extractFn(SRC, 'handleInvFile')}
    return handleInvFile;
  `);
  factory(calls, el)({ name: 'bidfood.csv', type: 'text/csv' });
  return calls;
}

test('a file arriving with the modal SHUT resets it; one arriving mid-flow does not', () => {
  /* The screen's dropzone can start an import with the modal shut, which is a route openInv() never
     sees. Without the reset, #invCsv still holds the previous invoice's text and #invReview its
     rendered rows, so a file that then fails to parse lands the user on step 1 beside a paste box
     full of the LAST invoice - one "Match products" from silently re-importing it. */
  const shut = runHandleInvFile({ modalOpen: false });
  assert.equal(shut.openInv, 1, 'a file arriving with the modal shut starts from a clean modal');

  /* The other half, and the half an order-only test cannot see: openInv WIPES state, so running it
     when the modal is already open would clear an import the user is in the middle of. */
  const open = runHandleInvFile({ modalOpen: true });
  assert.equal(open.openInv, 0, 'a file chosen from inside the open modal must NOT reset it');

  // and either way the user ends on the scanning panel, not still looking at the dropzone
  assert.equal(shut.steps[shut.steps.length - 1], 'scan', 'closed-modal path ends on scanning');
  assert.equal(open.steps[open.steps.length - 1], 'scan', 'open-modal path ends on scanning');
});

/* -------------------------------------------------------------------------
   2. Failure paths
   ------------------------------------------------------------------------- */

test('every failure path returns to step 1, where the recovery controls are', () => {
  const fail = extractFn(SRC, 'invFileFailed');
  assert.match(fail, /invStep\('choose'\)/, 'invFileFailed is what puts the user back');
  const handle = extractFn(SRC, 'handleInvFile');
  // the image-only PDF, the pdfjs load failure, the unparseable PDF and the unreadable non-PDF
  const calls = (handle.match(/invFileFailed\(/g) || []).length;
  assert.equal(calls, 5, 'five failure exits in handleInvFile: image-only PDF, no priced lines, pdfjs load, unreadable PDF, unreadable non-PDF');
  assert.ok(!/showInvFileErr\(/.test(handle),
    'handleInvFile must not show an error without also changing step — that is the state this replaced');
  assert.match(extractFn(SRC, 'parseInvoice'), /invFileFailed\(/,
    'the CSV upload reaches parseInvoice mid-scan, so its no-rows exit has to move the step too');
});

test('the "review the extracted text" message now opens the box it names', () => {
  const handle = extractFn(SRC, 'handleInvFile');
  const msg = handle.indexOf('review the extracted text');
  assert.ok(msg >= 0, 'the message still exists');
  const open = handle.indexOf('setInvManual(true)');
  assert.ok(open > msg, 'and setInvManual(true) follows it — v67 collapsed the paste box and left this message pointing at nothing');
});

/* -------------------------------------------------------------------------
   3. The tick with nowhere to live
   ------------------------------------------------------------------------- */

test('ticking a never-opened add-new form OPENS the form, so the tick has a home', () => {
  const render = extractFn(SRC, 'renderInvReview');
  // the handler body for .invAppr change
  const i = render.indexOf("box.querySelectorAll('.invAppr')");
  assert.ok(i >= 0, 'the tick handler must exist');
  const handler = render.slice(i);
  const guard = handler.indexOf('if(!r.newItem && cb.checked)');
  const expand = handler.indexOf('expandNewItem(i)');
  const assign = handler.indexOf('if(r.newItem) r.newItem.approved=cb.checked');
  assert.ok(guard >= 0, 'the no-form case must be handled explicitly');
  assert.ok(expand > guard, 'and it opens the form');
  assert.ok(assign > expand,
    'the assignment must come AFTER the form opens, or r.newItem is still null and the tick is dropped exactly as before');
});

test('the add-new tick still has exactly ONE home, and it is not the DOM', () => {
  // The v50 contract: r.newItem.approved. Opening a form on tick must not have introduced a second.
  const render = extractFn(SRC, 'renderInvReview');
  assert.match(render, /r\.addNew \? !!\(r\.newItem && r\.newItem\.approved\)/,
    'the renderer still reads the tick from r.newItem.approved and nowhere else');
  /* The branch STRUCTURE, not a trailing-text pattern. The first version of this assertion looked
     for `r.userTick=cb.checked;` at the very end of the handler source, which nothing could ever
     match — there is always code after it — so it passed whatever the branch did. Pinning the
     if/else shape instead fails if the addNew branch is removed or the else is widened to cover it,
     which is the actual "two homes for one tick" regression. */
  const handler = noComments(render.slice(render.indexOf("box.querySelectorAll('.invAppr')")), 'block', 'line');
  assert.match(handler, /if\(r\.addNew\)\{[\s\S]*?\}\s*else r\.userTick=cb\.checked;/,
    'userTick is the ELSE of addNew — an add-new row must never also write one, or one tick has two homes');
});

/* -------------------------------------------------------------------------
   4. Tint vs hover, and the touch target
   ------------------------------------------------------------------------- */

test('DECIDED: invoice review rows carry no hover wash', () => {
  // Any rule whose selector both mentions .invtable ... tr and :hover, setting a background.
  const rules = CSS.match(/[^{}]*\{[^}]*\}/g) || [];
  const offenders = rules.filter((r) => {
    const sel = r.slice(0, r.indexOf('{'));
    if (!/\.invtable/.test(sel) || !/:hover/.test(sel)) return false;
    if (!/\btr\b|\.inv-data/.test(sel)) return false;          // a hovering BUTTON inside a row is fine and wanted
    return /background/.test(r.slice(r.indexOf('{')));
  });
  assert.deepEqual(offenders, [],
    'a row-level hover wash would fully mask the opaque --warn-bg tint on exactly the rows the user is scanning — and it would promise a press that does nothing, because this row is a form, not a button. The controls inside it carry the affordance.');
});

test('the Apply tick has a 44px target, and it is a real element a spec can measure', () => {
  assert.match(SRC, /<label class="appr-hit"><input type="checkbox" class="invAppr"/,
    'the checkbox is wrapped in a label — ::before/::after on a replaced element is not dependably rendered, and a pseudo-element has no boundingBox for a spec to read');
  const rule = (CSS.match(/\.appr-hit\{[^}]*\}/) || [''])[0];
  assert.match(rule, /min-width:44px/, 'the label is at least 44px wide');
  assert.match(rule, /min-height:44px/, 'and at least 44px tall');
  assert.ok(!/\.invAppr\{width:/.test(CSS_CODE),
    'the dead `.invAppr{width:26px}` is gone: `input[type=checkbox]` is 0-1-1 and beats it at 0-1-0, so the box has always painted at the base 24px. Re-adding the number without also beating that selector re-creates a rule that looks right and does nothing.');
  assert.ok(!/td\[style\*="text-align:center"\]/.test(CSS),
    'the inline-style attribute selector went with the inline style');
});

/* -------------------------------------------------------------------------
   5. The screen, and what was deleted with the conversion
   ------------------------------------------------------------------------- */

test('Invoices is a screen: the sidebar navigates to it and does not also open the modal', () => {
  assert.match(HTML, /data-tab="invoices" id="sideInvoices"/, 'the sidebar entry is a tab');
  assert.ok(HTML.indexOf('id="tab-invoices"') >= 0, 'and the pane it names exists');
  assert.ok(!/on\('sideInvoices'/.test(SRC_CODE),
    'wiring openInv here as well would fire BOTH the navigation and the modal');
  assert.match(SRC, /'builder','ingredients','analysis','dashboard','pantry','invoices'/,
    'showTab must hide the new pane like every other, or it stays on screen under the next tab');
  assert.match(extractFn(SRC, 'restoreLastTab'), /'invoices'/,
    'and a refresh on Invoices must come back to Invoices, not silently to Plates');
});

test('the screen states what it cannot do rather than drawing a table with no data behind it', () => {
  // R4. The mock's recent-imports table has no backing store; nothing in this app records an import.
  const pane = HTML.slice(HTML.indexOf('id="tab-invoices"'), HTML.indexOf('/tab-invoices'));
  assert.ok(pane.indexOf('id="lastImport3"') >= 0, 'the one import fact the app does store is printed');
  assert.ok(pane.indexOf('doesn&rsquo;t keep a list of past imports yet') >= 0, 'and the absence is stated in words');
  assert.ok(!/<table/.test(pane), 'no table is drawn for data that does not exist');
  assert.match(SRC, /'lastImport','lastImport2','lastImport3'/, 'updateLastImport fills it');
});

test('the mobile sheet ships no camera button, because there is no path behind it', () => {
  // The queue item specified `capture` on the file input feeding the EXISTING parse path. The code
  // says otherwise: handleInvFile reads any non-PDF with FileReader.readAsText, so a JPG becomes
  // binary noise in the paste box. §R4 forbids a control that does nothing. Recorded, not built.
  assert.ok(!/Take a photo/.test(HTML_CODE), 'no camera control');
  assert.ok(!/capture=/.test(HTML_CODE), 'and no capture attribute quietly enabling one');
  const accept = (HTML_CODE.match(/id="invFile"[^>]*accept="([^"]*)"/) || [])[1] || '';
  assert.ok(!/image/.test(accept), 'the file input does not offer image types it cannot read');
});

test('the v67 intro banner is deleted, markup and CSS together', () => {
  ['inv-intro', 'invIntroX', 'invIntro'].forEach((frag) => {
    assert.ok(!new RegExp('id="' + frag + '"').test(HTML_CODE), frag + ' is gone from the markup');
  });
  assert.ok(!/\.inv-intro\b/.test(CSS_CODE), '.inv-intro CSS is gone in the same change');
  assert.ok(!/\.inv-introx\b/.test(CSS_CODE), '.inv-introx CSS is gone in the same change');
  assert.ok(!/getElementById\('invIntro'\)/.test(SRC_CODE), 'and nothing still reaches for it');
  assert.ok(!/\.inv-upload\b/.test(CSS_CODE), '.inv-upload — the old one-panel flex row — is gone too');
});
