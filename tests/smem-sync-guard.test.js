/*
 * smem-sync-guard.test.js — v107. An empty server read must never wipe local supplier memory.
 *
 * FOUND: during the v106 backup batch, reading bootstrapSync after adding supplier_mem to
 * the export. The supplier_phrases read did:
 *
 *     if(spr && !spr.error && Array.isArray(spr.data)){ ... supplierMem=mm; saveSupplierMem(); }
 *
 * `Array.isArray([])` is true, so a response of zero rows replaced supplierMem with {} and
 * SAVED it — destroying every taught pack on that device before the user could export one.
 *
 * WHY ZERO ROWS IS NOT PROOF OF ZERO ROWS: over PostgREST a successful-but-empty read and an
 * RLS-blocked read are indistinguishable — exactly the ambiguity CLAUDE.md already records for
 * menu_price_history, whose fix file may or may not have been run. So a policy fault on
 * supplier_phrases presents as "the server says you have none" and the app believes it.
 *
 * THE TRADE, MADE DELIBERATELY (Max, 1 Aug 2026): server-wins is how a phrase deleted on one device
 * disappears from the others, and this guard breaks that for the LAST remaining phrase — delete
 * it elsewhere and it survives here until removed locally. Accepted: a stale entry costs one
 * Remove; losing every taught pack costs a re-teach per phrase, and taught packs are
 * user-confirmed ground truth with no second copy. Local is re-pushed so the server heals.
 *
 * The block under test is sliced from the REAL shipped js/app.js.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

/* the supplier_phrases sync block, verbatim, by its anchors.
   v108: the block no longer fetches for itself — the read moved into bootstrapSync's single
   Promise.all, so the block now RECEIVES `spr` instead of awaiting it. The anchors moved with it and
   the harness below supplies `spr` from the same stub, so what is under test is unchanged: the guard
   that an empty server read must not wipe a populated local memory. */
const START = "if(spr && !spr.error && Array.isArray(spr.data)){";
const END = "/* supplier_phrases table may not exist yet -> keep local */";

function extractBlock() {
  const i = SRC.indexOf(START);
  if (i < 0) throw new Error('smem-sync-guard: start anchor not found. app.js changed; update this test');
  const j = SRC.indexOf(END, i);
  if (j < 0) throw new Error('smem-sync-guard: end anchor not found. app.js changed; update this test');
  return SRC.slice(i, j + END.length);
}

/* v108: the block now maps rows through the shared row boundary instead of an inline object literal,
   so the sandbox needs the REAL mapper — brace-extracted, never mirrored, or this test would pass
   against a copy while production used a different one. */
function extractFn(name) {
  const sig = `function ${name}(`;
  const i = SRC.indexOf(sig);
  if (i < 0) throw new Error(`smem-sync-guard: function not found -> ${name}. app.js changed; update this test`);
  const start = SRC.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < SRC.length; n++) {
    if (SRC[n] === '{') depth++;
    else if (SRC[n] === '}' && --depth === 0) return SRC.slice(i, n + 1);
  }
  throw new Error(`smem-sync-guard: unbalanced braces for ${name}`);
}

/* Run the real block against a stubbed Supabase. Returns the resulting local memory and
   everything re-pushed to the server.
   v111: the `saved` tracker is gone with the `saveSupplierMem()` no-op it counted. It asserted that a
   FUNCTION WAS CALLED, and that function did nothing — so it could not have failed if the adoption
   itself were wrong. The assertions below now pin the resulting supplierMem instead, which is the
   outcome the guard exists to protect. */
async function syncWith(localMem, serverRows, opts) {
  opts = opts || {};
  const pushed = [];
  // eslint-disable-next-line no-new-func
  const factory = new Function('S', `
    "use strict";
    return (async function(){
      var supplierMem = S.localMem;
      var SUPA = S.SUPA;
      function dbPushSupplierPhrase(e){ S.pushed.push(e.id); }
      function invDbg(){}
      ${extractFn('rowToSupplierPhrase')}
      /* v108: bootstrapSync now hands the block its already-settled read. Same stub, same values —
         only the fetch moved out, so the guard below still sees exactly what production gives it. */
      var spr = await SUPA.from('supplier_phrases').select('*');
      ${extractBlock()}
      return supplierMem;
    })();
  `);
  const SUPA = {
    from() {
      return {
        select: async () => (opts.error ? { error: { message: 'boom' } } : { data: serverRows, error: null })
      };
    }
  };
  const mem = await factory({ localMem, SUPA, pushed });
  return { mem, pushed };
}

const LOCAL = {
  'bidfood|cheese slices tasty s yarde farm kg': { id: 'bidfood|cheese slices tasty s yarde farm kg', supplier: 'Bidfood', phrase_norm: 'cheese slices tasty s yarde farm kg', qty: 105, unit: 'ea' },
  'the fruit wagon|avocado tray': { id: 'the fruit wagon|avocado tray', supplier: 'The Fruit Wagon', phrase_norm: 'avocado tray', qty: 18, unit: 'ea' }
};

test('v107: an EMPTY server read does not wipe a populated local supplier memory', async () => {
  const { mem } = await syncWith({ ...LOCAL }, []);
  assert.equal(Object.keys(mem).length, 2, 'both taught packs must survive — this is the whole bug');
  assert.deepEqual(mem, LOCAL, 'and every field survives intact, not just the keys');
});

test('v107: the surviving local entries are re-pushed so the server heals', async () => {
  const { pushed } = await syncWith({ ...LOCAL }, []);
  assert.deepEqual(pushed.sort(), Object.keys(LOCAL).sort(),
    'a server that lost the rows should get them back, not diverge silently');
});

test('v107: a NON-empty server read still wins — deletions propagate as before', async () => {
  const rows = [{ id: 'the fruit wagon|avocado tray', supplier: 'The Fruit Wagon', phrase_norm: 'avocado tray', qty: 18, unit: 'ea' }];
  const { mem, pushed } = await syncWith({ ...LOCAL }, rows);
  assert.deepEqual(Object.keys(mem), ['the fruit wagon|avocado tray'],
    'the phrase deleted on another device is gone here too — server-wins is preserved');
  assert.deepEqual(mem['the fruit wagon|avocado tray'],
    { id: 'the fruit wagon|avocado tray', supplier: 'The Fruit Wagon', phrase_norm: 'avocado tray', qty: 18, unit: 'ea' },
    'the SERVER row is what was adopted, field for field — not the local one that happened to share an id');
});

test('v107: qty is still coerced to a number on the server path', async () => {
  const rows = [{ id: 'k', supplier: 'Bidfood', phrase_norm: 'p', qty: '105', unit: 'ea' }];
  const { mem } = await syncWith({}, rows);
  assert.strictEqual(mem.k.qty, 105, 'a string qty would break every pack comparison downstream');
});

test('v107: an empty server read on an empty local memory is a plain no-op', async () => {
  const { mem, pushed } = await syncWith({}, []);
  assert.deepEqual(mem, {}, 'nothing to protect, nothing to do');
  assert.deepEqual(pushed, [], 'a fresh install must not push phantom rows');
});

test('v107: a real server ERROR leaves local untouched (the pre-existing guard)', async () => {
  const { mem } = await syncWith({ ...LOCAL }, null, { error: true });
  assert.equal(Object.keys(mem).length, 2, 'a missing table or a failed read must never clear memory');
  assert.deepEqual(mem, LOCAL, 'and untouched means field-for-field, not merely the right count');
});
