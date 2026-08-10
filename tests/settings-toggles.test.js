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
const { loadApp, extractFn } = require('./_extractfn');

const ROOT = path.join(__dirname, '..');
const APP = loadApp();
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

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

/* ---------- v136 (F1a): dark RETURNS — these three tests pinned its ABSENCE and are
   rewritten, not deleted. v132's condition for its return ("its own designed package")
   is met by the v3 replacement package, whose FOLD-IN-PROTOCOL §6 orders both palettes
   ported. What each guard protects is inverted, but the SHAPE is kept so the diff reads
   as a decision rather than as coverage quietly going missing. ---------- */

test('v136: the theme machinery is back in app.js and the segment in Settings', () => {
  ['function loadThemePref(', 'function applyThemePref(', 'function syncThemeSeg(', "THEME_KEY='cafeCost_theme'"]
    .forEach(sig => assert.ok(APP.indexOf(sig) >= 0, `app.js must carry ${sig}`));
  assert.ok(/data-theme-pref="light"/.test(HTML) && /data-theme-pref="dark"/.test(HTML) && /data-theme-pref="system"/.test(HTML),
    'all three Settings theme choices exist');
  // the mock's compact sidebar toggle is F1b's, not this batch's — assert the split so a
  // half-built second control cannot appear without a decision
  assert.ok(!/id="themeToggle"/.test(HTML), 'no header moon toggle: Settings is the only theme control until F1b');
});

test('v136: the stored preference and the APPLIED attribute are different things', () => {
  // The boot resolver must always WRITE an explicit value and must READ the key to do it.
  // v132's guard asserted the exact opposite (nothing may read the key) — that was correct
  // for a light-only app and is exactly what has to invert here.
  assert.ok(/localStorage\.getItem\(\s*['"]cafeCost_theme['"]\s*\)/.test(HTML),
    'the boot resolver reads the stored preference');
  assert.ok(/setAttribute\(\s*['"]data-theme['"]/.test(HTML),
    'the boot resolver writes an explicit data-theme before first paint');
  assert.ok(!/localStorage\.removeItem\(\s*['"]cafeCost_theme['"]\s*\)/.test(HTML),
    'index.html must no longer delete the key — it is a live preference again');
  // 'system' is stored as ABSENCE, so applyThemePref must remove the key for it rather
  // than writing the string 'system', which loadThemePref would then reject as invalid
  // and silently treat as system anyway — a latent disagreement between writer and reader.
  assert.ok(/if\(pref==='system'\)\s*localStorage\.removeItem\(THEME_KEY\);\s*else\s*localStorage\.setItem\(THEME_KEY,pref\)/.test(APP),
    "applyThemePref stores 'system' as absence, never as a literal");
});

test('v136: dark ships as ONE explicit-attribute block — no prefers-color-scheme rule may return to the CSS', () => {
  const CSS = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
  assert.ok(/html\[data-theme="dark"\]/.test(CSS), 'the dark palette exists');
  // THE load-bearing assertion. Before v132, "system" meant no attribute, so every dark
  // rule was written twice — once under [data-theme="dark"], once inside a
  // @media (prefers-color-scheme:dark) mirror — and a real bug came from writing one half
  // and forgetting the other. The head resolver now always writes an explicit value, which
  // makes the mirror unnecessary; if one ever reappears, the duplication bug class is back.
  assert.ok(!/prefers-color-scheme/.test(CSS),
    'no prefers-color-scheme in CSS: the boot resolver settles the OS preference, so a media mirror would re-open the duplicate-every-rule bug class');
  // ...and the OS preference is read in JS. Assert it inside the RESOLVER SCRIPT, not merely
  // somewhere in index.html: the first cut of this test matched `prefers-color-scheme`
  // anywhere in the file, which the theme-color <meta media=…> attributes satisfied on their
  // own — so the whole resolver could be deleted and the assertion stayed green.
  const resolver = HTML.match(/<script>\(function\(\)\{try\{[\s\S]*?data-theme[\s\S]*?<\/script>/);
  assert.ok(resolver, 'the head resolver script is present');
  assert.ok(/matchMedia\(['"]\(prefers-color-scheme:dark\)['"]\)/.test(resolver[0]),
    'the resolver itself reads the OS preference');
  assert.ok(/setAttribute\(['"]data-theme['"]/.test(resolver[0]),
    'the resolver itself writes the attribute');
  // Pin the LISTENER, not merely a matchMedia call: the same string appears in
  // systemPrefersDark(), which is a one-shot read, so an earlier version of this assertion
  // stayed green with the entire live-change listener deleted.
  assert.ok(/mq\.addEventListener\(\s*'change'\s*,\s*onChange\s*\)/.test(APP),
    'app.js subscribes to OS theme changes');
  assert.ok(/mq\.addListener\(onChange\)/.test(APP), 'with the Safari<14 fallback');
  assert.ok(/loadThemePref\(\)==='system'/.test(APP),
    "and only follows the OS while the preference is actually 'system'");
});

test('v136: the resolver runs BEFORE the stylesheet, or the theme it resolves arrives too late', () => {
  // The design rests on the attribute being set before first paint. Nothing else pins the
  // script's POSITION, so moving it to the end of <body> would leave every other theme test
  // green while a full light frame painted on each cold load.
  const resolverAt = HTML.search(/<script>\(function\(\)\{try\{[\s\S]*?data-theme/);
  const styleAt = HTML.search(/<link[^>]+rel="stylesheet"/);
  const bodyAt = HTML.search(/<body/);
  assert.ok(resolverAt > -1 && styleAt > -1 && bodyAt > -1, 'all three anchors found');
  assert.ok(resolverAt < styleAt, 'the resolver precedes the stylesheet link');
  assert.ok(resolverAt < bodyAt, 'the resolver is in <head>, not in the body');
});

test('v136: the PWA theme-color follows the STORED theme, not the OS', () => {
  // The browser resolves media="(prefers-color-scheme:…)" against the OS, while the page
  // resolves its palette against the stored preference. Keying the chrome to a media pair
  // therefore paints a near-black title bar over a white app for anyone on a dark phone who
  // chose Light — which is the exact bug v132 fixed by going light-only, and which the first
  // cut of this batch reintroduced.
  const metas = HTML.match(/<meta[^>]+name="theme-color"[^>]*>/g) || [];
  assert.equal(metas.length, 1, 'exactly one theme-color meta');
  assert.ok(!/media\s*=/.test(metas[0]), 'and it carries no media attribute');
  assert.ok(/querySelector\('meta\[name="theme-color"\]'\)[\s\S]{0,120}setAttribute\('content'/.test(HTML),
    'the resolver rewrites it at boot');
  assert.ok(/function applyResolvedTheme[\s\S]{0,600}querySelector\('meta\[name="theme-color"\]'\)[\s\S]{0,300}setAttribute\('content'/.test(APP),
    'and applyResolvedTheme rewrites it on every change');

  // The head script must hardcode the two surfaces (the stylesheet has not parsed yet when it
  // runs), so pin those literals against the real token values — that is the drift this
  // duplication would otherwise cause, silently.
  const CSS = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
  const lightSurface = (CSS.match(/:root\{\n--surface:(#[0-9A-Fa-f]{6})/) || [])[1];
  const darkSurface = (CSS.match(/html\[data-theme="dark"\]\{\n--surface:(#[0-9A-Fa-f]{6})/) || [])[1];
  assert.ok(lightSurface && darkSurface, `parsed both --surface values (${lightSurface} / ${darkSurface})`);
  const map = HTML.match(/THEME_SURFACE=\{light:'(#[0-9A-Fa-f]{6})',dark:'(#[0-9A-Fa-f]{6})'\}/);
  assert.ok(map, 'the resolver declares its THEME_SURFACE map');
  assert.equal(map[1].toUpperCase(), lightSurface.toUpperCase(), 'light chrome === light --surface');
  assert.equal(map[2].toUpperCase(), darkSurface.toUpperCase(), 'dark chrome === dark --surface');
});

test('v136: color-scheme is declared for both themes — the browser-drawn surfaces no audit can see', () => {
  // <select> popup lists, number-input spinners, the text caret and the autofill wash are
  // painted by the browser, never appear in the DOM, and stay LIGHT in a dark app unless
  // color-scheme says otherwise. Nothing else in this repo can catch that: the DOM sweep in
  // tests/visual/v136-theme.spec.js walks elements, and these surfaces are not elements.
  const CSS = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
  assert.ok(/:root\s*\{[^}]*color-scheme\s*:\s*light/.test(CSS), 'light declares color-scheme:light');
  assert.ok(/html\[data-theme="dark"\]\s*\{[^}]*color-scheme\s*:\s*dark/.test(CSS), 'dark declares color-scheme:dark');
});

test('v136: every colour token the app consumes has a dark value, or is an alias that inherits one', () => {
  // The dark-mode failure mode is silent: a token defined only in :root keeps its LIGHT
  // value under html[data-theme="dark"] and the screen looks almost right until you find
  // the one washed-out row. So: every literal colour declared in :root must either be
  // re-declared for dark, or be a var() alias (which inherits by construction).
  const CSS = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
  const rootDecls = new Map(), darkDecls = new Set();
  // Strip @media blocks first. A token whose only dark value sits inside
  // @media (prefers-reduced-motion:reduce) is NOT covered in the default cascade, and the
  // guard's stated condition is "has its own dark value" — which must mean unconditionally.
  const topLevel = CSS.replace(/@media[^{]*\{[\s\S]*?\n\}/g, '');
  const blockRe = /(:root|html\[data-theme="dark"\])\s*\{([^}]*)\}/g;
  let m;
  while ((m = blockRe.exec(topLevel))) {
    const body = m[2];
    const declRe = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
    let d;
    while ((d = declRe.exec(body))) {
      // LAST wins, as the cascade does — an earlier first-wins map recorded the mock's
      // pre-deviation --text-3 and would have named the wrong colour in a failure message.
      if (m[1] === ':root') rootDecls.set(d[1], d[2].trim());
      else darkDecls.add(d[1]);
    }
  }
  assert.ok(rootDecls.size > 30, `sanity: parsed ${rootDecls.size} :root tokens`);
  const isColour = v => /^#[0-9a-f]{3,8}$/i.test(v) || /^rgba?\(/i.test(v);
  const orphans = [];
  for (const [name, val] of rootDecls) {
    if (!isColour(val)) continue;              // type/spacing/motion/url() tokens are theme-neutral
    if (darkDecls.has(name)) continue;         // has its own dark value
    orphans.push(`${name}: ${val}`);
  }
  assert.deepEqual(orphans, [],
    'these :root colour literals have no dark counterpart and would keep their light value in dark mode');
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

/* F9 (v148) consciously changed this pin. What it MEANT was "every group has a visible home and
   none was silently dropped"; what it ASSERTED was the modal's nav markup, which is the affordance
   a screen removes — a screen shows every section at once, so there is no nav to be on. The
   contract survives the conversion; the mechanism does not. */
test('F9: every settings group has a visible home, and no group was dropped in the conversion', () => {
  const cards = [...HTML.matchAll(/class="stg-card-h">([^<]+)</g)].map(m => m[1]);
  // Costing and Data are the mock's §3.8 names; the other five are groups the app has and the
  // mock does not, kept per §R3 (rehome, never delete). Account/Team are F10's to decide.
  assert.deepEqual(cards,
    ['Costing', 'AI features', 'Appearance', 'Lists', 'Data', 'Account', 'Team', 'About'],
    'the eight section cards, in order');
  /* The modal's own machinery must be GONE, not merely unstyled — a leftover nav would be a second
     way to reach a section that is already on screen.
     Read with COMMENTS STRIPPED: this repo tombstones what it deletes, so every name below still
     appears in prose explaining why it is gone. A raw grep would fail on the tombstone and, worse,
     would PASS if someone deleted the tombstone and left the markup. */
  const HTML_CODE = HTML.replace(/<!--[\s\S]*?-->/g, '');
  ['set-nav', 'set-navitem', 'data-goto=', 'id="settingsBack"', 'id="settingsDone"',
   'id="settingsClose"', 'id="settingsPanel"'].forEach(dead => {
    assert.ok(HTML_CODE.indexOf(dead) < 0, `${dead} went with the modal`);
  });
});

/* The single most likely silent break, named as such in the queue item's §5 contract: openSettings()
   primed the form on every OPEN, and a screen has no open event. If renderSettingsTab stops writing
   one of these, that control renders its markup default for ever — 0%, GST-exclusive, an AI switch
   showing off while it is on — with no error anywhere.
   Asserted against the REAL function, driven with stub elements, not by reading its source: a
   substring check would pass against a line that computed the value and threw it away. */
test('F9: renderSettingsTab primes every control the modal used to prime on open', () => {
  const els = {};
  const mk = () => ({ value: '', checked: false, textContent: '' });
  ['setCogsInput', 'setGstDefault', 'setVersion', 'setAiInvoiceChk', 'setAiSuggestChk']
    .forEach(id => { els[id] = mk(); });
  let themeSynced = 0;
  const run = new Function('els', 'state', `
    const { cogsPct, gstDefault, APP_VERSION, aiInvoiceCheck, aiSuggestions, syncThemeSeg } = state;
    const document = { getElementById: id => els[id] || null };
    ${extractFn(APP, 'renderSettingsTab')}
    renderSettingsTab();
  `);
  run(els, {
    cogsPct: 31, gstDefault: 'inc', APP_VERSION: 'v999',
    aiInvoiceCheck: true, aiSuggestions: true,
    syncThemeSeg: () => { themeSynced++; },
  });
  assert.equal(els.setCogsInput.value, 31, 'the target % comes from memory, not the markup default');
  assert.equal(els.setGstDefault.value, 'inc', 'the GST default comes from memory');
  assert.equal(els.setVersion.textContent, 'v999', 'the About version is filled in');
  assert.equal(els.setAiInvoiceChk.checked, true, 'the AI invoice switch reflects the stored flag');
  assert.equal(els.setAiSuggestChk.checked, true, 'the AI suggestions switch reflects the stored flag');
  assert.equal(themeSynced, 1, 'the theme segment is synced too');
});

/* …and that showTab is what calls it. Priming that exists but is never invoked is the same bug with
   an extra step, and this is the line that a future edit to showTab would quietly drop. */
test('F9: showTab runs the priming on every entry to the screen', () => {
  const showTab = extractFn(APP, 'showTab');
  assert.ok(/if\(t==='settings'\)renderSettingsTab\(\);/.test(showTab),
    'showTab calls renderSettingsTab when it switches to the settings screen');
  assert.ok(/'invoices','settings'\]/.test(showTab),
    'and the pane-visibility list knows about the settings pane, or the screen never shows');
  // the boot race: restoreLastTab() runs BEFORE bootstrapSync resolves, so a refresh landing on
  // Settings paints pre-boot defaults unless rerenderCurrentTab re-primes it
  assert.ok(/t==='settings'\)renderSettingsTab\(\)/.test(extractFn(APP, 'rerenderCurrentTab')),
    'and rerenderCurrentTab re-primes it once boot data lands');
  assert.ok(/'pantry','settings'\]/.test(extractFn(APP, 'currentTab')),
    'currentTab must recognise the settings pane — below 1024 no .navbtn carries data-tab="settings"');
});

test('v81: relocating settings kept every id handlers bind to', () => {
  ['setCogsInput', 'setGstDefault', 'setExport', 'setClearCache', 'setTidyOpen', 'setSmemOpen', 'setVersion',
   'setAiInvoiceChk', 'setAiSuggestChk'].forEach(id => {
    assert.ok(HTML.indexOf(`id="${id}"`) >= 0, `#${id} must still exist after the restructure`);
  });
});

test('v81: Account/Team ship as coming-feature empty states, not disabled controls', () => {
  // F9 (v148): the class is .stg-soon now (the screen's card system replaced .set-empty with the
  // rest of the modal's CSS). The contract is unchanged and is the whole point of the test.
  assert.ok(/class="stg-soon"/.test(HTML), 'placeholder sections use the coming-feature style');
  assert.ok(/arrive with EzPlate accounts/.test(HTML), 'the copy frames them as a coming feature');
  // must not be faked as a real (disabled) control
  const acct = HTML.slice(HTML.indexOf('>Account</h3>'), HTML.indexOf('>Team</h3>'));
  assert.ok(acct.length > 0 && !/<(input|select|button)/.test(acct),
    'Account is a sentence, not a control — disabled or otherwise');
});
