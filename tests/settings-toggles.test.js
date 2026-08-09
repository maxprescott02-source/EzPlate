/*
 * settings-toggles.test.js — v81 Settings additions.
 *
 * Guards the two new AI toggles, on the house settings-persistence pattern
 * (dbSetSetting + a localStorage mirror), and the two behavioural GATES those
 * toggles drive:
 * (v132: the theme-preference block is GONE with the machinery it pinned —
 * light only per the v3 spec, Max's yes 9 Aug 2026. The absence pins live in
 * the v132 block at the bottom.)
 *   - AI invoice check OFF  => gemFireSecondReader makes NO API call.
 *   - AI suggestions OFF     => dashInsightsHtml renders nothing (v90: the Dashboard, not the Menu tab).
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
    function renderDashboard(){ RENDERS.insights++; }   /* v90: insights render on the Dashboard now */
    var AI_INV_KEY='cafeDB_aiInvoiceCheck', AI_SUG_KEY='cafeDB_aiSuggestions';
    var aiInvoiceCheck, aiSuggestions;
    ${extractFn(APP, 'loadAiInvoiceCheck')}
    ${extractFn(APP, 'setAiInvoiceCheck')}
    ${extractFn(APP, 'loadAiSuggestions')}
    ${extractFn(APP, 'setAiSuggestions')}
    return {
      loadAiInvoiceCheck:loadAiInvoiceCheck, setAiInvoiceCheck:setAiInvoiceCheck,
      loadAiSuggestions:loadAiSuggestions, setAiSuggestions:setAiSuggestions
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

/* ---------- v132: light only — pin the ABSENCE, both halves ---------- */

test('v132: the theme machinery is gone from app.js and the segment from Settings (light only)', () => {
  // the functions and the key must not quietly return — dark comes back as its own
  // designed package (Max, 9 Aug 2026, decision 2), never as a leftover mechanism
  ['function loadThemePref(', 'function applyThemePref(', 'function syncThemeSeg(', "THEME_KEY='cafeCost_theme'"]
    .forEach(sig => assert.ok(APP.indexOf(sig) < 0, `app.js must not carry ${sig}`));
  assert.ok(!/data-theme-pref/.test(HTML), 'the Settings theme segment is gone');
  assert.ok(!/id="themeToggle"/.test(HTML), 'the header moon toggle is gone');
});

test('v132: the stale cafeCost_theme key is actively removed at boot (the v130 stale-key pattern)', () => {
  assert.ok(/localStorage\.removeItem\(\s*['"]cafeCost_theme['"]\s*\)/.test(HTML),
    'index.html must remove the dead key so an old install cannot keep a forced theme');
  assert.ok(!/localStorage\.getItem\(\s*['"]cafeCost_theme['"]\s*\)/.test(HTML),
    'nothing may READ the key any more');
});

test('v132: no dark-theme rules survive anywhere the client ships (light only, locked)', () => {
  const CSS = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
  assert.ok(!/data-theme/.test(CSS), 'no data-theme selectors');
  assert.ok(!/prefers-color-scheme/.test(CSS), 'no color-scheme media queries in CSS');
  // the review found the one surviving artefact in the file this guard did not scan:
  // a dark-media theme-color meta painting a near-black PWA title bar over a white app
  assert.ok(!/prefers-color-scheme/.test(HTML), 'no color-scheme media anywhere in index.html (metas included)');
});

test('v132: every service-worker ASSET path resolves to a real file (a 404 rejects the whole cache.addAll, silently)', () => {
  const SW = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const list = SW.match(/const ASSETS = \[([^\]]+)\]/)[1].match(/'[^']+'/g).map(s => s.slice(1, -1));
  assert.ok(list.length >= 15, `ASSETS list found (${list.length} entries)`);
  list.forEach(p => {
    const clean = p.replace(/\?v=\d+$/, '');
    if (clean === './') return;
    assert.ok(fs.existsSync(path.join(ROOT, clean)), `ASSETS entry must exist on disk: ${p}`);
  });
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

test('v90: dashInsightsHtml is gated on aiSuggestions (OFF => the panel is not built at all)', () => {
  const fn = extractFn(APP, 'dashInsightsHtml');
  assert.ok(/if\(!aiSuggestions\) return '';/.test(fn),
    'dashInsightsHtml must return an empty string before computing anything when suggestions are off');
  // and nothing is computed on that path — the bail precedes the computeInsights call
  assert.ok(fn.indexOf("if(!aiSuggestions) return '';") < fn.indexOf('computeInsights('),
    'the gate must come BEFORE computeInsights, so an off toggle costs no work');
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
