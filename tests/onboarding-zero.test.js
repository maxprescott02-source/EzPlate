/*
 * onboarding-zero.test.js — batch 190. The two things a brand-new cafe meets before it has any data.
 *
 * The state under test is GENUINE zero: no products, no kitchen ingredients, no plates, no menus, no
 * dishes, no app_settings. Production has never been in it, which is why both of these shipped.
 *
 * 1. THE ONBOARDING LINK HAD NO COLOUR. `catalogueHintHtml()` is the one sentence offering a new cafe
 *    its first ingredient, and its anchor carried no class while css/style.css carried no anchor rule
 *    at all — so it painted the UA's blue in both themes. The app owns exactly three <a> elements and
 *    the other two carry a class that sets a colour, which is how a whole sheet came to say nothing
 *    about anchors.
 *
 * 2. renderManageMenus DEAD-ENDED AT ZERO MENUS. It rendered a sentence telling the user to go to
 *    another screen and returned, with nothing to press — while the two Save buttons silently create
 *    the default menu at the point of need (184) and openPublishModal diverts to the new-menu modal.
 *    Three answers to one question, and the one a new cafe reaches first was the only one that
 *    offered no way forward.
 *
 * ⚠️ renderManageMenus was STUBBED IN THREE TEST FILES AND PINNED BY NONE before this file existed
 *    (change-log, history-paths, publish-guard all declare an empty one). CLAUDE.md, 184: "a function
 *    that is not a target has never been asked the question." It is a mutation target now too.
 *
 * The DOM double below is deliberately NOT a stub that answers every querySelector. It answers only
 * what the innerHTML it was just handed actually contains — otherwise deleting the button from the
 * markup would leave every assertion here green, which is this repo's most-counted defect class.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();
const CSS = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');

/* ---------------------------------------------------------------------------
   1. The onboarding link is the app's link colour, not the browser's.
   --------------------------------------------------------------------------- */

/* ⚠️ COMMENTS ARE STRIPPED BEFORE ANY OF THIS IS SEARCHED. 183(a) is the incident: an assertion
   grepped a function body for a forbidden spelling, `pg_get_functiondef` returned the body's
   COMMENTS, and the comment above the statement quoted the spelling in prose — so the negative half
   fired on its own explanation and the positive half would have passed on the prose alone. The rule
   generalises to any grep of a source file, and the comment above the rule under test here talks
   about anchors and colours at length. */
const CSS_CODE = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

test('190: catalogueHintHtml still offers the link this rule exists for', () => {
  const fn = extractFn(SRC, 'catalogueHintHtml');
  assert.match(fn, /<a\b/, 'the hint is an anchor — if it stops being one, the CSS rule below is aimed at nothing');
  assert.match(fn, /id="bhGo"/, 'wireBhGo finds it by this id');
});

test('190: css/style.css carries a BARE anchor colour rule — its absence was the defect', () => {
  const rule = CSS_CODE.match(/(^|[};])\s*a\s*\{([^}]*)\}/);
  assert.ok(rule, 'no bare `a{...}` rule exists, so every unclassed anchor paints the UA blue again');
  assert.match(rule[2], /color\s*:/, 'the rule must set a colour — that is the whole defect');
  assert.match(rule[2], /var\(--/, '§4: every colour from a token, zero hard-coded hex in screen code');
  assert.doesNotMatch(rule[2], /#[0-9a-fA-F]{3,8}\b/, 'a literal hex here cannot be theme-aware');
});

test('190: the anchor rule stays WEAKER than the two classed anchors, which set their own colour', () => {
  // Specificity: `a` is 0-0-1 and both of these are 0-1-0, so they win wherever they apply. This is
  // asserted rather than assumed because the fix could plausibly have been written `a{...!important}`
  // or as `body a`, and either would silently repaint the phone number and the delete link.
  const bare = CSS_CODE.match(/(^|[};])\s*a\s*\{([^}]*)\}/);
  assert.doesNotMatch(bare[2], /!important/, 'an !important here would beat .linklike and .del-link');
  for (const cls of ['linklike', 'del-link']) {
    const m = CSS_CODE.match(new RegExp('\\.' + cls + '\\s*\\{([^}]*)\\}'));
    assert.ok(m, `.${cls} must still exist — the bare rule is only safe because it does`);
    assert.match(m[1], /color\s*:/, `.${cls} must set its own colour, or the new bare rule changes it`);
  }
});

/* ⚠️ THE TEST ABOVE PASSED WHILE THE SHEET WAS WRONG, and the pre-push review found what it missed.
   It inspects the BARE `a{...}` rule and nothing else, so it had nothing to say about the `a:hover`
   rule shipped beside it — which is (0,1,1), because a pseudo-class scores in the CLASS column and
   the type selector then breaks the tie against `.del-link{color:var(--bad)}` (0,1,0). Measured in
   Chromium: .del-link rests rgb(192,57,47) and the hover rule painted it rgb(150,64,9), turning the
   Delete control from danger-red to brand orange under the pointer.
   So the invariant is not "the bare rule is weak" but "NO anchor-targeting type selector in this
   sheet may out-rank a class", and that is what this asserts. */
test('190: no bare-anchor selector with a pseudo-class may set COLOUR — that out-ranks .del-link', () => {
  /* Scoped to `color` deliberately, and the first draft of this test was NOT — it flagged the
     pre-existing `a:focus-visible`, which is (0,1,1) too but sets only `outline`, a property no
     classed anchor competes for. The hazard is a colour conflict with `.del-link{color:var(--bad)}`
     and `.linklike{color:var(--accent-ink)}`, neither of which declares a hover colour, so a
     type-selector colour at (0,1,1) simply takes over. Asserting on the SELECTOR alone would make
     this test fire on a harmless focus ring, and a test that cries wolf is one someone deletes. */
  const rules = [...CSS_CODE.matchAll(/(?:^|[}\n;])\s*([^{}@\n][^{}]*?)\s*\{([^{}]*)\}/g)];
  const offenders = [];
  let sawBase = false;

  for (const [, selText, body] of rules) {
    for (const sel of selText.split(',').map((s) => s.trim())) {
      if (!/^a(?:[:][a-zA-Z-]+(?:\([^)]*\))?)*$/.test(sel)) continue;
      if (sel === 'a') { sawBase = true; continue; }              // (0,0,1) — the safe one
      if (/(^|[;\s])color\s*:/.test(body)) offenders.push(sel);   // (0,1,1) AND competing for colour
    }
  }

  assert.ok(sawBase, 'the base `a{}` rule must be among the parsed rules — else nothing is being measured');
  assert.deepStrictEqual(offenders, [],
    `these set a colour on a bare anchor with a pseudo-class, which is (0,1,1) and beats .del-link's `
    + `(0,1,0): ${offenders.join(', ')}. Give the state colour to the CLASS that wants it.`);
});

/* ---------------------------------------------------------------------------
   2. The zero-menus branch offers a way forward.
   --------------------------------------------------------------------------- */

/* A box whose querySelector is answered FROM THE MARKUP IT WAS GIVEN. Nothing here parses HTML — it
   checks the class token is present in the string the function actually wrote, which is enough to
   make "delete the button" fail and is honest about being no more than that. */
function fakeBox() {
  let html = '';
  const made = {};
  const el = (cls) => {
    if (made[cls]) return made[cls];
    made[cls] = cls === 'mm-first'
      ? { tag: 'button', disabled: false, onclick: null }
      : { tag: 'p', hidden: true, textContent: '' };
    return made[cls];
  };
  return {
    set innerHTML(v) { html = v; for (const k of Object.keys(made)) delete made[k]; },
    get innerHTML() { return html; },
    querySelector(sel) {
      const cls = sel.replace(/^\./, '');
      // The token must appear inside a class="..." in the markup just written.
      const present = new RegExp('class="[^"]*\\b' + cls + '\\b[^"]*"').test(html);
      return present ? el(cls) : null;
    },
    made,
  };
}

function harness(opts = {}) {
  const S = { ensureCalls: 0, analysis: 0, rerenders: 0, published: null };
  /* One deferred PER CALL, not one shared promise — the retry test needs the second attempt to be a
     different write from the first, which is the whole point of it being a retry. */
  const settlers = [];
  const nextPending = () => new Promise((r) => settlers.push(r));
  const pending = { next: nextPending };
  const settle = (v, i = 0) => settlers[i](v);

  /* The modal element, because the success path now asks whether this flow is still the one on
     screen before it opens a dialog over the user. `classList` is the two-method subset the real
     code uses; anything more would be a DOM reimplementation the test then has to be right about. */
  const modal = { open: true };
  const modalEl = {
    classList: {
      contains: (c) => c === 'open' && modal.open,
      add: () => { modal.open = true; },
      remove: () => { modal.open = false; },
    },
  };

  const factory = new Function('S', 'PENDING', 'START', 'MODAL', `
    "use strict";
    var manageMenusPid = START.pid;
    var document = { getElementById:function(id){ return id==='manageMenusModal' ? MODAL : null; } };
    function ensurePublishMenu(){ S.ensureCalls++; return PENDING.next(); }
    function renderAnalysis(){ S.analysis++; }
    function renderManageMenus(){ S.rerenders++; }
    function openPublishModal(pid, mid){ S.published = { pid:pid, mid:mid }; }
    ${extractFn(SRC, 'renderManageMenusZero')}
    return { renderManageMenusZero:renderManageMenusZero,
             closeManageMenus:function(){ manageMenusPid = null; MODAL.classList.remove('open'); },
             openFor:function(id){ manageMenusPid = id; MODAL.classList.add('open'); } };
  `);

  const api = factory(S, pending, { pid: opts.pid === undefined ? 'P-1' : opts.pid }, modalEl);
  const box = fakeBox();
  api.renderManageMenusZero(box);
  return { api, S, box, settle, modal };
}

test('190: the zero-menus branch renders a real CONTROL, not just a sentence', () => {
  const { box } = harness();
  assert.match(box.innerHTML, /<button\b/, 'a dead-end sentence is exactly what this replaced');
  assert.ok(box.querySelector('.mm-first'), 'the control must be findable by the handler that wires it');
  // The prose still has to say what a menu IS — a brand-new cafe has never seen one.
  assert.match(box.innerHTML, /sell prices/i, 'the empty state explains the noun, per the four-noun rule');
});

test('190: pressing it creates exactly ONE menu and lands the user in the publish dialog', async () => {
  const { S, box, settle } = harness();
  const btn = box.querySelector('.mm-first');
  btn.onclick();
  assert.strictEqual(S.ensureCalls, 1);
  assert.strictEqual(btn.disabled, true, 'in flight, so a second press is visibly refused');
  assert.strictEqual(S.published, null, 'the dialog must NOT open before the menu is confirmed');

  settle('MENU-new');
  await new Promise((r) => setTimeout(r, 0));

  assert.strictEqual(btn.disabled, false);
  assert.deepStrictEqual(S.published, { pid: 'P-1', mid: 'MENU-new' },
    'the publish dialog opens on the plate it was about, with the new menu preselected');
  assert.strictEqual(S.analysis, 1,
    'the Menu tab is still showing "No menus yet." over a menu that now exists — ensurePublishMenu repaints the selector, not the tab');
  assert.strictEqual(S.rerenders, 1, 'this modal now has a row to list');
});

test('190: a REFUSED write opens nothing and says so where the user is looking', async () => {
  const { S, box, settle } = harness();
  const btn = box.querySelector('.mm-first');
  btn.onclick();
  settle(null);                       // ensurePublishMenu resolves null on {error} AND on a throw
  await new Promise((r) => setTimeout(r, 0));

  assert.strictEqual(S.published, null, 'opening the dialog onto a menu that was never created is the defect');
  assert.strictEqual(S.analysis, 0, 'nothing to repaint — no menu was made');
  assert.strictEqual(btn.disabled, false, 'the user must be able to try again');
  const err = box.querySelector('.mm-empty-err');
  assert.ok(err, 'the failure surface must exist in the markup');
  assert.strictEqual(err.hidden, false, 'and be shown');
  assert.match(err.textContent, /connection/i);
  assert.match(err.textContent, /nothing was saved/i,
    'it must say the write did NOT happen — pushWrite already toasted the cause, this says the consequence');
});

test('190: the error line starts HIDDEN, so nothing reports a failure before one happens', () => {
  const { box } = harness();
  assert.match(box.innerHTML, /class="mm-empty-err"[^>]*\bhidden\b/,
    'the attribute must be in the markup, not applied later by script');
});

/* Found by `npm run mutate`, not by writing this file: flipping `errEl.hidden=true` to `false` on
   the way IN survived every assertion above, because all of them press the button at most once. A
   stale failure left on screen through the retry says the second attempt failed too — and the user
   would be reading it while the write was still in flight. */
test('190: a RETRY clears the previous failure before it reports a new outcome', async () => {
  const { S, box, settle } = harness();
  const btn = box.querySelector('.mm-first');
  const err = () => box.querySelector('.mm-empty-err');

  btn.onclick();
  settle(null, 0);                                   // first attempt refused
  await new Promise((r) => setTimeout(r, 0));
  assert.strictEqual(err().hidden, false, 'precondition: the first failure is on screen');

  btn.onclick();                                     // the user tries again
  assert.strictEqual(S.ensureCalls, 2, 'precondition: a second write really was attempted');
  assert.strictEqual(err().hidden, true,
    'the old failure must go the moment the retry starts — leaving it up reports the new attempt as failed before it has settled');
  assert.strictEqual(err().textContent, '', 'and its words with it');

  settle('MENU-new', 1);
  await new Promise((r) => setTimeout(r, 0));
  assert.deepStrictEqual(S.published, { pid: 'P-1', mid: 'MENU-new' }, 'the retry succeeds normally');
  assert.strictEqual(err().hidden, true, 'nothing failed, so nothing is reported');
});

/* ⚠️ THIS TEST ASSERTED THE OPPOSITE UNTIL THE PRE-PUSH REVIEW OF THIS BATCH, and the old version
   is worth recording rather than quietly replacing: it pinned that the dialog DID open after the
   user closed the modal, on the reasoning that capturing `pid` before the await was the whole of the
   problem. It is not. The capture protects the VALUE; it says nothing about whether the user is
   still there. On cafe wifi the real sequence is tap, wait, give up, tap Done, start something else
   — and the dialog then opened over that. */
test('190: closing the modal mid-flight still creates the menu, and opens NOTHING over the user', async () => {
  const { api, S, box, settle } = harness({ pid: 'P-42' });
  box.querySelector('.mm-first').onclick();
  api.closeManageMenus();             // the user gave up waiting
  settle('MENU-new');
  await new Promise((r) => setTimeout(r, 0));

  assert.strictEqual(S.published, null,
    'the write landed, but the user has moved on — a dialog appearing now steals focus for a plate they left');
  assert.strictEqual(S.analysis, 1,
    'the menu EXISTS, so the Menu tab must be repainted regardless — skipping it leaves "No menus yet." over a real row');
  assert.strictEqual(S.rerenders, 0, 'nothing to re-render: the modal is closed');
});

test('190: a DIFFERENT plate opened mid-flight is not published onto by the first flow', async () => {
  // ensurePublishMenu is memoised across concurrent callers, so a stale .then is reachable: two
  // plates, one in-flight write, and the first callback must not act on the second plate's screen.
  const { api, S, box, settle } = harness({ pid: 'P-first' });
  box.querySelector('.mm-first').onclick();
  api.openFor('P-second');            // user backs out and opens Manage menus on another plate
  settle('MENU-new');
  await new Promise((r) => setTimeout(r, 0));

  assert.strictEqual(S.published, null,
    'publishing P-first while P-second is the plate on screen shows one plate’s data under another’s title');
  assert.strictEqual(S.analysis, 1, 'the menu still exists and the Menu tab still needs it');
});

test('190: with the modal still open on the same plate, the dialog DOES open', async () => {
  // The counterweight to the two above: the guard must not refuse the ordinary path, which is the
  // way a guard like this usually goes wrong.
  const { S, box, settle } = harness({ pid: 'P-42' });
  box.querySelector('.mm-first').onclick();
  settle('MENU-new');
  await new Promise((r) => setTimeout(r, 0));
  assert.deepStrictEqual(S.published, { pid: 'P-42', mid: 'MENU-new' });
  assert.strictEqual(S.rerenders, 1);
});

test('190: a double-tap cannot create two menus', async () => {
  const { S, box, settle } = harness();
  const btn = box.querySelector('.mm-first');
  btn.onclick();
  btn.onclick();                      // the impatient second press on cafe wifi
  assert.strictEqual(S.ensureCalls, 1, 'the button is disabled in flight; ensurePublishMenu is memoised behind it');
  settle('MENU-new');
  await new Promise((r) => setTimeout(r, 0));
  assert.strictEqual(S.published.mid, 'MENU-new');
});

/* The shipped caller still routes to it — the branch is worth nothing if renderManageMenus stops
   reaching it. Asserted against the real function body, not a copy of it. */
test('190: renderManageMenus delegates its zero-menus branch here', () => {
  const fn = extractFn(SRC, 'renderManageMenus');
  assert.match(fn, /!menusList\.length/, 'the zero test itself');
  assert.match(fn, /renderManageMenusZero\(/, 'and it must call the branch, not re-inline a sentence');
  assert.doesNotMatch(fn, /create one on the Menu tab first/,
    'the dead-end wording must be gone, not merely bypassed');
});
