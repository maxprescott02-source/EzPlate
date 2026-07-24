/*
 * settings-toggles.test.js — v81 Settings additions.
 *
 * Guards the two new AI toggles + the theme preference, all on the house
 * settings-persistence pattern (dbSetSetting + a localStorage mirror), and the
 * two behavioural GATES those toggles drive:
 *   - AI invoice check OFF  => gemFireSecondReader makes NO API call.
 *   - AI suggestions OFF     => renderMenuInsights renders nothing.
 * Defaults must preserve today's behaviour (both readers ON) so brand-new
 * accounts are unaffected — that's asserted first for each.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`function not found -> ${name}. app.js changed; update tests/settings-toggles.test.js`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`unbalanced braces for ${name}`);
}

/* ---------- harness: the load/set functions + theme, over stub storage/DOM ---------- */

function togglesHarness() {
  const writes = [];
  const store = {};
  const renders = { insights: 0 };
  const root = {
    attrs: {},
    setAttribute(k, v) { this.attrs[k] = String(v); },
    removeAttribute(k) { delete this.attrs[k]; },
    getAttribute(k) { return (k in this.attrs) ? this.attrs[k] : null; }
  };
  // eslint-disable-next-line no-new-func
  const factory = new Function('WRITES', 'STORE', 'ROOT', 'RENDERS', `
    "use strict";
    var localStorage = {
      getItem:function(k){ return (k in STORE)?STORE[k]:null; },
      setItem:function(k,v){ STORE[k]=String(v); },
      removeItem:function(k){ delete STORE[k]; }
    };
    var document = { documentElement: ROOT, getElementById:function(){ return null; } };
    function dbSetSetting(k,v){ WRITES.push({key:k, value:v}); }
    function renderMenuInsights(){ RENDERS.insights++; }
    var AI_INV_KEY='cafeDB_aiInvoiceCheck', AI_SUG_KEY='cafeDB_aiSuggestions', THEME_KEY='cafeCost_theme';
    var aiInvoiceCheck, aiSuggestions;
    ${extractFn(APP, 'loadAiInvoiceCheck')}
    ${extractFn(APP, 'setAiInvoiceCheck')}
    ${extractFn(APP, 'loadAiSuggestions')}
    ${extractFn(APP, 'setAiSuggestions')}
    ${extractFn(APP, 'loadThemePref')}
    ${extractFn(APP, 'applyThemePref')}
    return {
      loadAiInvoiceCheck:loadAiInvoiceCheck, setAiInvoiceCheck:setAiInvoiceCheck,
      loadAiSuggestions:loadAiSuggestions, setAiSuggestions:setAiSuggestions,
      loadThemePref:loadThemePref, applyThemePref:applyThemePref
    };
  `);
  return { api: factory(writes, store, root, renders), writes, store, root, renders };
}

/* ---------- AI invoice check ---------- */

test('v81: AI invoice check defaults ON (brand-new account, no stored value)', () => {
  const { api } = togglesHarness();
  assert.equal(api.loadAiInvoiceCheck(), true);
});

test('v81: turning AI invoice check off writes one setting + the localStorage mirror, and round-trips', () => {
  const { api, writes, store } = togglesHarness();
  api.setAiInvoiceCheck(false, true);
  assert.deepEqual(writes, [{ key: 'ai_invoice_check', value: false }], 'one dbSetSetting write');
  assert.equal(store['cafeDB_aiInvoiceCheck'], '0', 'mirrored locally');
  assert.equal(api.loadAiInvoiceCheck(), false, 'reload reads it back as off');
});

test('v81: AI invoice check set without persist mirrors locally but does NOT sync', () => {
  const { api, writes, store } = togglesHarness();
  api.setAiInvoiceCheck(false, false);
  assert.equal(writes.length, 0, 'no dbSetSetting when persist is false (the bootstrap-apply path)');
  assert.equal(store['cafeDB_aiInvoiceCheck'], '0');
});

/* ---------- AI suggestions ---------- */

test('v81: AI suggestions defaults ON', () => {
  const { api } = togglesHarness();
  assert.equal(api.loadAiSuggestions(), true);
});

test('v81: toggling AI suggestions persists, round-trips, and re-renders the insights surface', () => {
  const { api, writes, store, renders } = togglesHarness();
  api.setAiSuggestions(false, true);
  assert.deepEqual(writes, [{ key: 'ai_suggestions', value: false }]);
  assert.equal(store['cafeDB_aiSuggestions'], '0');
  assert.equal(api.loadAiSuggestions(), false);
  assert.equal(renders.insights, 1, 'the panel/trigger update immediately on toggle');
});

/* ---------- theme preference ---------- */

test('v81: theme preference defaults to "system" (no stored key = follow the OS)', () => {
  const { api } = togglesHarness();
  assert.equal(api.loadThemePref(), 'system');
});

test('v81: choosing Light/Dark sets data-theme + the same key the header toggle uses', () => {
  const { api, store, root } = togglesHarness();
  api.applyThemePref('dark');
  assert.equal(root.getAttribute('data-theme'), 'dark');
  assert.equal(store['cafeCost_theme'], 'dark', 'reuses the header toggle key — not a second mechanism');
  assert.equal(api.loadThemePref(), 'dark');

  api.applyThemePref('light');
  assert.equal(root.getAttribute('data-theme'), 'light');
  assert.equal(api.loadThemePref(), 'light');
});

test('v81: choosing System clears the key and the forced attribute (falls back to prefers-color-scheme)', () => {
  const { api, store, root } = togglesHarness();
  api.applyThemePref('dark');
  api.applyThemePref('system');
  assert.equal(root.getAttribute('data-theme'), null, 'no forced theme');
  assert.equal('cafeCost_theme' in store, false, 'key removed so CSS media query wins');
  assert.equal(api.loadThemePref(), 'system');
});

/* ---------- the GATE: AI invoice check OFF => no API call ---------- */

function gemGateHarness(enabled) {
  const calls = { fetch: 0, renderInvReview: 0 };
  // eslint-disable-next-line no-new-func
  const factory = new Function('CALLS', 'ENABLED', `
    "use strict";
    var aiInvoiceCheck = ENABLED;
    var gemToken = 0, gemStatus = 'checking', gemApplied = false;
    var AbortController = undefined;          // exercise the no-AbortController branch
    function setTimeout(){ return 0; }
    function clearTimeout(){}
    function prodCategories(){ return []; }
    function renderInvReview(){ CALLS.renderInvReview++; }
    function gemSettle(){}
    function fetch(){ CALLS.fetch++; return { then:function(){ return this; }, catch:function(){ return this; } }; }
    ${extractFn(APP, 'gemFireSecondReader')}
    return { fire:gemFireSecondReader, status:function(){ return gemStatus; } };
  `);
  return { api: factory(calls, enabled), calls };
}

test('v81 GATE: AI invoice check OFF => gemFireSecondReader makes NO fetch and clears the note', () => {
  const { api, calls } = gemGateHarness(false);
  api.fire('some invoice text');
  assert.equal(calls.fetch, 0, 'no API call at all when the toggle is off');
  assert.equal(api.status(), null, 'the "checking" note is cleared, not left hanging');
  assert.equal(calls.renderInvReview, 1, 're-rendered so the note disappears');
});

test('v81 GATE: AI invoice check ON => gemFireSecondReader still fires the request (unchanged behaviour)', () => {
  const { api, calls } = gemGateHarness(true);
  api.fire('some invoice text');
  assert.equal(calls.fetch, 1, 'the second reader fires exactly as before when on');
});

/* ---------- source pins: the wiring the harness can't reach ---------- */

test('v81: renderMenuInsights is gated on aiSuggestions (OFF => nothing renders)', () => {
  const fn = extractFn(APP, 'renderMenuInsights');
  assert.ok(/if\(!aiSuggestions\)\{[^}]*host\.innerHTML=''/.test(fn),
    'renderMenuInsights must clear the host and bail when suggestions are off');
});

test('v81: bootstrapSync round-trips both AI toggles across devices', () => {
  assert.ok(/key===['"]ai_invoice_check['"]/.test(APP), 'reads the ai_invoice_check setting on sync');
  assert.ok(/key===['"]ai_suggestions['"]/.test(APP), 'reads the ai_suggestions setting on sync');
});

/* ---------- the sectioned surface exists and kept every control id ---------- */

test('v81: Settings is a sectioned surface — a nav plus one section per group', () => {
  assert.ok(/class="set-nav"/.test(HTML), 'the section nav exists');
  ['general', 'invoices', 'lists', 'data', 'account', 'team', 'about'].forEach(id => {
    assert.ok(new RegExp(`data-goto="${id}"`).test(HTML), `nav has a ${id} item`);
    assert.ok(new RegExp(`id="setSec-${id}"`).test(HTML), `content has the ${id} section`);
  });
  assert.ok(/id="settingsBack"/.test(HTML), 'a back control exists for the mobile drill-down');
});

test('v81: relocating settings kept every id handlers bind to', () => {
  ['setCogsInput', 'setGstDefault', 'setExport', 'setClearCache', 'setTidyOpen', 'setSmemOpen', 'setVersion',
   'setAiInvoiceChk', 'setAiSuggestChk'].forEach(id => {
    assert.ok(HTML.indexOf(`id="${id}"`) >= 0, `#${id} must still exist after the restructure`);
  });
});

test('v81: Account/Team ship as coming-feature empty states, not disabled controls', () => {
  assert.ok(/class="set-empty"/.test(HTML), 'placeholder sections use the empty-state style');
  assert.ok(/arrive with EzPlate accounts/.test(HTML), 'the copy frames them as a coming feature');
  // must not be faked as a real (disabled) control
  assert.ok(!/id="setSec-account"[\s\S]*?<(input|select|button)[^>]*disabled/.test(HTML),
    'Account is an empty state, not a disabled fake control');
});
