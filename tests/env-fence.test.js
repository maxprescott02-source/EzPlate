/*
 * env-fence.test.js — 172. Local state must not cross between Supabase projects.
 *
 * The queue item's words are "Local state cannot cross environments — DEMONSTRATE it, do not assert
 * it". The demonstration has two halves and this file is the one Node can do:
 *
 *   - the REAL `envFence` from js/app.js is exercised against a fake Storage, so its decisions
 *     (first run, same project, switch, storage that throws) are pinned;
 *   - the SOURCE ORDER is pinned, because the function being correct is worthless if it runs after
 *     something has already read a stale key.
 *
 * The other half — that a real browser pointed at staging then at production really does start
 * clean — is a live check and lives in docs/STAGING.md, because it needs two Supabase projects.
 *
 * ⚠️ `envFence` is EXTRACTED, never re-implemented. CLAUDE.md records four incidents where a test
 * that mirrored a shipped function passed against the very defect it was written to catch, and the
 * remedy every time was to call the real thing. There is no second copy of this logic here.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadApp, extractFn, extractVar } = require('./_extractfn');

const SRC = loadApp();

// build the real function in a sandbox, with its real key constant
const envFence = (function () {
  const code = extractVar(SRC, 'ENV_STAMP_KEY') + '\n' + extractFn(SRC, 'envFence') + '\nenvFence;';
  return eval(code);                                          // eslint-disable-line no-eval
})();

const PROD = 'izrnptxhdylllodvglla';
const STAGE = 'pboidoxjghntalovzrke';

/**
 * The REAL environment-resolution IIFE from index.html's <head>, callable as (window, location).
 * Cut from the shipped file rather than copied, for the reason _extract.js exists at all.
 */
const envResolverFn = (function () {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const anchor = html.indexOf('var ENVS={');
  if (anchor < 0) throw new Error('index.html: "var ENVS={" not found — the env resolver moved; update this test');
  const open = html.lastIndexOf('<script>', anchor);
  const close = html.indexOf('</script>', anchor);
  const src = html.slice(open + '<script>'.length, close);
  // `window` and `location` become parameters, shadowing anything global.
  return new Function('window', 'location', src);   // eslint-disable-line no-new-func
})();

/** A minimal Storage: index-ordered keys, like the real thing. */
function fakeStore(initial, opts) {
  const o = Object.assign({}, initial);
  const s = {
    get length() { return Object.keys(o).length; },
    key(i) { return Object.keys(o)[i]; },
    getItem(k) { if (opts && opts.throwOnGet) throw new Error('SecurityError'); return k in o ? o[k] : null; },
    setItem(k, v) { if (opts && opts.throwOnSet) throw new Error('QuotaExceeded'); o[k] = String(v); },
    removeItem(k) { delete o[k]; },
    _all() { return o; },
  };
  return s;
}

function populated(extra) {
  return Object.assign({
    cafeDB_lastTab: 'analysis',
    cafeDB_dashRange: '6m',
    cafeDB_dashScope: 'ALL',
    cafeDB_currentMenuId: 'MENU_ORIGINAL',
    cafeDB_plateDraft: '{"name":"half-built plate","lines":[{"kid":"K0004","qty":30}]}',
    cafeDB_insightCache: '{}',
    cafeDB_lastImport: '2026-08-01T00:00:00Z',
    cafeDB_aiInvoiceCheck: '1',
    cafeDB_aiSuggestions: '1',
    cafeCost_theme: 'dark',
    cafeCost_installDismissed: '1',
  }, extra || {});
}

test('FIRST RUN purges nothing — a missing stamp is "never seen", not "changed"', () => {
  // This is the case that decides whether the deploy shipping this wipes Max's settings.
  const s = fakeStore(populated());
  const removed = envFence(s, PROD);
  assert.strictEqual(removed, 0, 'first run must remove nothing');
  assert.strictEqual(s._all().cafeDB_plateDraft !== undefined, true, 'the draft must survive first run');
  assert.strictEqual(s._all().cafeCost_theme, 'dark', 'the theme must survive first run');
  assert.strictEqual(s._all().cafeCost_env, PROD, 'and the environment must now be stamped');
});

test('SAME project on a later load purges nothing and stays stamped', () => {
  const s = fakeStore(populated({ cafeCost_env: PROD }));
  const before = Object.keys(s._all()).length;
  assert.strictEqual(envFence(s, PROD), 0);
  assert.strictEqual(Object.keys(s._all()).length, before, 'no key may be touched');
  assert.strictEqual(s._all().cafeCost_env, PROD);
});

test('A SWITCH purges every app key — including the plate draft, which is the one that matters', () => {
  const s = fakeStore(populated({ cafeCost_env: PROD }));
  const removed = envFence(s, STAGE);
  assert.strictEqual(removed, 11, 'all eleven app keys go');
  const left = Object.keys(s._all());
  assert.deepStrictEqual(left, ['cafeCost_env'], 'only the stamp survives');
  assert.strictEqual(s._all().cafeCost_env, STAGE, 're-stamped to the new project');
});

test('the plate draft specifically cannot survive a switch', () => {
  // Called out on its own because it is the only key holding AUTHORED WORK rather than a
  // preference: its `kid`/`pid` values name different rows in the other project, so carrying it
  // across would cost a real plate against ids that mean something else.
  const s = fakeStore({ cafeCost_env: STAGE, cafeDB_plateDraft: '{"lines":[{"kid":"K0004"}]}' });
  envFence(s, PROD);
  assert.strictEqual(s._all().cafeDB_plateDraft, undefined);
});

test('a switch BACK purges too — the fence is symmetric, not one-way', () => {
  const s = fakeStore(populated({ cafeCost_env: PROD }));
  envFence(s, STAGE);
  Object.assign(s._all(), { cafeDB_plateDraft: '{"name":"authored against staging"}', cafeDB_lastTab: 'pantry' });
  const removed = envFence(s, PROD);
  assert.strictEqual(removed, 2, 'staging-era keys go on the way back');
  assert.strictEqual(s._all().cafeDB_plateDraft, undefined);
  assert.strictEqual(s._all().cafeCost_env, PROD);
});

test('EVERY key is removed, not every other one — the re-indexing trap', () => {
  // Removing while iterating by index shortens the store underneath the loop and silently skips
  // alternate keys. That failure leaves a plausible-looking half-purge, so it is pinned directly
  // with an odd count where the off-by-one would show.
  const init = { cafeCost_env: PROD };
  for (let i = 0; i < 25; i++) init['cafeDB_k' + i] = String(i);
  const s = fakeStore(init);
  assert.strictEqual(envFence(s, STAGE), 25);
  assert.deepStrictEqual(Object.keys(s._all()), ['cafeCost_env']);
});

test('foreign keys are left alone — the fence owns this app, not the origin', () => {
  const s = fakeStore({ cafeCost_env: PROD, cafeDB_lastTab: 'x', somethingElse: 'keep', 'vercel.thing': 'keep' });
  envFence(s, STAGE);
  assert.strictEqual(s._all().somethingElse, 'keep');
  assert.strictEqual(s._all()['vercel.thing'], 'keep');
  assert.strictEqual(s._all().cafeDB_lastTab, undefined);
});

test('storage that throws is survivable — no throw, and nothing claimed', () => {
  assert.strictEqual(envFence(fakeStore({}, { throwOnGet: true }), PROD), null);
  assert.strictEqual(envFence(null, PROD), null);
  assert.strictEqual(envFence(fakeStore({}), null), null, 'no resolved project means nothing to fence');
  // a store that reads but cannot write still purges; it just cannot stamp, so it will purge again
  // next load. Purging twice is harmless; NOT purging is not.
  const s = fakeStore(populated({ cafeCost_env: PROD }), { throwOnSet: true });
  assert.strictEqual(envFence(s, STAGE), 11);
});

test('SOURCE ORDER: the fence runs before every top-level localStorage reader in app.js', () => {
  // The function being right is worthless if `var dashRange = localStorage.getItem(...)` has already
  // run. This asserts the ordering in the shipped file rather than trusting a comment.
  //
  // ⚠️ THIS TEST ONLY SEES js/app.js, because `loadApp()` only reads js/app.js — and that blind spot
  // let a FALSE claim stand: the code used to say the fence beat "the theme preference" too, which
  // it never could, because that read happens in index.html's <head> before this file is fetched.
  // The test passed anyway, which is the exact shape CLAUDE.md warns about — a green test that
  // cannot fail. The index.html half is covered by the two tests below; neither is sufficient alone.
  const call = SRC.indexOf('envFence(window.localStorage, window.SUPA_REF)');
  assert.ok(call > 0, 'the fence must actually be called in app.js');
  const readers = [];
  const re = /localStorage\.(getItem|setItem|removeItem)/g;
  let m;
  while ((m = re.exec(SRC)) !== null) readers.push(m.index);
  const outside = readers.filter((i) => i < call);
  // the only localStorage touches allowed before the call are the ones INSIDE envFence itself
  const fnStart = SRC.indexOf('function envFence(');
  assert.ok(fnStart > 0 && fnStart < call, 'envFence must be defined above its call');
  const stray = outside.filter((i) => i < fnStart);
  assert.deepStrictEqual(stray, [], 'no localStorage access may precede the environment fence');
});

test('index.html: production is the default, and an unknown env falls back to it', () => {
  // Pinned as SOURCE because the resolution lives in an inline script that no harness can import.
  // The property that matters is that nothing but the literal string "staging" reaches staging.
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const block = html.slice(html.indexOf('var ENVS={'), html.indexOf('window.SUPA_ENV=name'));
  assert.ok(block.includes('izrnptxhdylllodvglla'), 'production project must be present');
  assert.ok(block.includes('pboidoxjghntalovzrke'), 'staging project must be present');
  assert.ok(html.includes('window.SUPA_REF=env.ref'), 'the project ref must be published for envFence to stamp');
  // The fallback BEHAVIOUR is pinned by executing the real resolver below, not by matching its
  // source text. An earlier version of this test asserted the exact line, which meant a correct
  // fix to that line failed the test while a broken rewrite of it would have passed.
});

test('SOURCE ORDER in index.html: the project is resolved before ANY localStorage read', () => {
  // The half app.js cannot see. The theme resolver reads localStorage in <head>; if the project has
  // not been resolved by then it has no stamp to compare against and paints with the other
  // environment's theme. Found by review, after the app.js test above passed on the broken order.
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const resolved = html.indexOf('window.SUPA_REF=env.ref');
  const firstRead = html.indexOf('localStorage.getItem');
  assert.ok(resolved > 0, 'the env block must be present');
  assert.ok(firstRead > 0, 'the theme resolver must still read localStorage');
  assert.ok(resolved < firstRead,
    'the Supabase project must be resolved before the first localStorage read in index.html');
});

test('the theme resolver refuses a theme stamped against a different project', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const head = html.slice(0, html.indexOf('</head>'));
  assert.ok(head.includes("localStorage.getItem('cafeCost_env')"),
    'the theme resolver must cross-check the environment stamp');
  assert.ok(/st!==window\.SUPA_REF\)\s*stored=null/.test(head),
    'and it must DISCARD the stored theme when the stamp disagrees, not merely read the stamp');
});

test('an unrecognised ?env= cannot reach a prototype member', () => {
  // `ENVS[want]` is truthy for "constructor", "toString", "__proto__" and friends, so a plain
  // truthiness test skipped the production fallback and left SUPA_URL undefined — a dead app.
  // The guard must be about what the object OWNS. Exercised, not just grepped.
  // The REAL shipped IIFE is cut out of index.html and executed against a stubbed window and
  // location. Re-implementing the two-line resolution here would be the mirror-the-function trap
  // CLAUDE.md records four times over: a copy written from the same wrong belief passes happily.
  const resolve = (search) => {
    const win = {};
    envResolverFn(win, { search });
    return win;
  };
  for (const hostile of ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf', 'bogus', '']) {
    const win = resolve(`?env=${hostile}`);
    assert.strictEqual(win.SUPA_ENV, 'production', `?env=${hostile || '(empty)'} must fall back to production`);
    assert.strictEqual(win.SUPA_REF, PROD);
    assert.ok(typeof win.SUPA_URL === 'string' && win.SUPA_URL.startsWith('https://'),
      `?env=${hostile || '(empty)'} left SUPA_URL as ${JSON.stringify(win.SUPA_URL)} — the app would be dead`);
    assert.ok(typeof win.SUPA_KEY === 'string' && win.SUPA_KEY.length > 0);
  }
  assert.strictEqual(resolve('?env=staging').SUPA_REF, STAGE, 'and the real value must still work');
  assert.strictEqual(resolve('').SUPA_REF, PROD, 'no query string at all is production');
});

test('the two projects are distinct, or the fence can never fire', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const refs = (html.match(/ref:"([a-z]+)"/g) || []).map((s) => s.split('"')[1]);
  assert.strictEqual(refs.length, 2);
  assert.notStrictEqual(refs[0], refs[1], 'two environments pointing at one project is not an environment');
});
