/*
 * unique-ids.test.js — 173. Row ids that cannot collide across accounts.
 *
 * The defect: ids were `PREFIX + Date.now().toString(36)`, and every write is `.upsert()`. Two
 * accounts creating a plate in the same millisecond mint the same id and the second SILENTLY
 * OVERWRITES the first, under a green "Saved" banner. There is no error to notice.
 *
 * The real function is extracted, never mirrored — CLAUDE.md records four incidents where a test
 * that re-implemented a shipped function passed against the very defect it was written to catch.
 *
 * Two tests here are doing something other than checking `uid` works:
 *   - "a new id can never equal an old-format one" is the LOAD-BEARING claim of the whole change.
 *     It is why no migration of Scoopy's live rows was needed. If it stops holding, the change
 *     stops being safe and a migration becomes mandatory.
 *   - "the semantic keys are left alone" guards the SCOPE. The obvious next move for someone
 *     reading this file is to "finish the job" by randomising app_settings keys, memKey and
 *     nextKid, and that would break lookups rather than fix collisions. Written down here because
 *     this is where that person will be standing.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn, extractVar } = require('./_extractfn');

const SRC = loadApp();

/** Build the real uid/uidRandom pair in a sandbox, with an injectable crypto. */
function buildUid(cryptoImpl) {
  const code = `(function(crypto){
    ${extractVar(SRC, '_uidSeq')}
    ${extractFn(SRC, 'uidRandom')}
    ${extractFn(SRC, 'uid')}
    return { uid: uid, uidRandom: uidRandom };
  })`;
  return eval(code)(cryptoImpl);   // eslint-disable-line no-eval
}

const realCrypto = require('node:crypto').webcrypto;

test('ids are unique across many calls', () => {
  const { uid } = buildUid(realCrypto);
  const seen = new Set();
  for (let i = 0; i < 50000; i++) seen.add(uid('SP'));
  assert.strictEqual(seen.size, 50000, 'every id must be distinct');
});

test('ids are unique WITHIN one millisecond — the actual failure mode', () => {
  // The old format's entire uniqueness came from Date.now(), so freezing the clock reproduces the
  // bug exactly: the old scheme yields one value repeated, the new one must not.
  const { uid } = buildUid(realCrypto);
  const realNow = Date.now;
  Date.now = () => 1754870400000;
  try {
    const seen = new Set();
    for (let i = 0; i < 20000; i++) seen.add(uid('um'));
    assert.strictEqual(seen.size, 20000, 'a frozen clock must not collapse ids');
    // and prove the old scheme really did collapse, so this test is known to discriminate
    const old = new Set();
    for (let i = 0; i < 20000; i++) old.add('um' + Date.now().toString(36));
    assert.strictEqual(old.size, 1, 'sanity: the old format yields ONE id under a frozen clock');
  } finally {
    Date.now = realNow;
  }
});

test('two independent sessions do not collide — the cross-ACCOUNT case', () => {
  // Each page load starts its own counter at 0, so the counter cannot separate two accounts.
  // Only the random block can. Two fresh instances, same frozen clock, is that situation exactly.
  const a = buildUid(realCrypto);
  const b = buildUid(realCrypto);
  const realNow = Date.now;
  Date.now = () => 1754870400000;
  try {
    const A = new Set(); const B = [];
    for (let i = 0; i < 5000; i++) A.add(a.uid('SP'));
    for (let i = 0; i < 5000; i++) B.push(b.uid('SP'));
    const overlap = B.filter((id) => A.has(id));
    assert.deepStrictEqual(overlap, [], 'two sessions minted the same id');
  } finally {
    Date.now = realNow;
  }
});

test('LOAD-BEARING: a new id can never equal an old-format id, so no migration is needed', () => {
  // Scoopy's live rows keep ids of the shape PREFIX + base36(timestamp) — digits and lowercase
  // letters only, no separator. Every new id contains "-". The two sets are therefore disjoint by
  // construction, which is the entire reason existing rows were left untouched.
  const { uid } = buildUid(realCrypto);
  const oldFormat = /^[A-Za-z]+[0-9a-z]+$/;
  for (const prefix of ['SP', 'um', 'MENU', 'CX', 'U', 'CL']) {
    for (let i = 0; i < 500; i++) {
      const id = uid(prefix);
      assert.ok(id.includes('-'), `${id} has no separator, so it could collide with an old id`);
      assert.ok(!oldFormat.test(id), `${id} matches the OLD id shape`);
      assert.ok(id.startsWith(prefix), `${id} lost its ${prefix} prefix`);
    }
  }
});

test('ids stay roughly time-ordered, which is why the timestamp is kept', () => {
  const { uid } = buildUid(realCrypto);
  const realNow = Date.now;
  let t = 1754870400000;
  Date.now = () => t;
  try {
    const early = uid('SP');
    t += 60000;
    const late = uid('SP');
    assert.ok(late > early, 'a later id should sort after an earlier one');
  } finally {
    Date.now = realNow;
  }
});

test('crypto is used when present, and its absence degrades rather than throws', () => {
  const calls = [];
  const fake = {
    getRandomValues(buf) { calls.push(buf.length); for (let i = 0; i < buf.length; i++) buf[i] = 7; return buf; },
  };
  const withCrypto = buildUid(fake);
  const id = withCrypto.uid('SP');
  assert.ok(calls.length > 0, 'crypto.getRandomValues must be used when available');
  assert.ok(id.endsWith('77777777'), 'the random block must come from crypto');

  // No crypto at all (an old browser). An id is not a secret — it must not REPEAT, and it must not
  // throw. Math.random satisfies the first and cannot fail the second.
  const noCrypto = buildUid(undefined);
  const seen = new Set();
  for (let i = 0; i < 20000; i++) seen.add(noCrypto.uid('SP'));
  assert.strictEqual(seen.size, 20000, 'the fallback must still not repeat');
});

test('every client-minted row id goes through uid — no bare Date.now() ids remain', () => {
  // The grep IS the test: a new call site that hand-rolls `'XX'+Date.now()` would reintroduce the
  // defect in a place no behavioural test would look.
  const bare = SRC.match(/id\s*=\s*'[A-Za-z]+'\s*\+\s*Date\.now\(\)/g) || [];
  assert.deepStrictEqual(bare, [], `hand-rolled id generators found: ${bare.join(', ')}`);
  for (const prefix of ['SP', 'um', 'MENU', 'CX', 'U', 'CL']) {
    assert.ok(SRC.includes(`uid('${prefix}')`), `nothing mints ${prefix} ids through uid()`);
  }
});

test('SCOPE GUARD: the semantic keys are deliberately NOT randomised', () => {
  // These four are NAMES the code looks things up by, not surrogate ids. Randomising them breaks
  // the lookup instead of fixing a collision, and their real fix is tenant scoping under the
  // business_id item. Pinned so "finishing the job" fails loudly rather than silently.
  assert.ok(/function memKey\(supplier, phrase\)\{ return normSupplier\(supplier\)/.test(SRC),
    'supplier_phrases.id must stay content-derived — it is what makes re-teaching a pack UPDATE one row');
  assert.ok(SRC.includes("return 'K'+String(max+1).padStart(4,'0')"),
    'nextKid must stay sequential — kitchen ids live inside an app_settings blob, not a global table');
  assert.ok(SRC.includes("menusList.unshift({id:'MENU_ORIGINAL'"),
    'ensureDefaultMenu still seeds MENU_ORIGINAL; changing it means fixing every literal fallback too');
  assert.ok(!SRC.includes("uid('K')") && !SRC.includes('uid(memKey'),
    'kitchen ids and supplier phrases must not be routed through uid()');
});
