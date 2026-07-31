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

// the supplier_phrases sync block, verbatim, by its anchors
const START = "try{ var spr=await SUPA.from('supplier_phrases')";
const END = "/* supplier_phrases table may not exist yet -> keep local */ }";

function extractBlock() {
  const i = SRC.indexOf(START);
  if (i < 0) throw new Error('smem-sync-guard: start anchor not found. app.js changed; update this test');
  const j = SRC.indexOf(END, i);
  if (j < 0) throw new Error('smem-sync-guard: end anchor not found. app.js changed; update this test');
  return SRC.slice(i, j + END.length);
}

/* Run the real block against a stubbed Supabase. Returns the resulting local memory,
   what was persisted, and everything re-pushed to the server. */
async function syncWith(localMem, serverRows, opts) {
  opts = opts || {};
  const saved = [], pushed = [];
  // eslint-disable-next-line no-new-func
  const factory = new Function('S', `
    "use strict";
    return (async function(){
      var supplierMem = S.localMem;
      var SUPA = S.SUPA;
      function saveSupplierMem(){ S.saved.push(JSON.parse(JSON.stringify(supplierMem))); }
      function dbPushSupplierPhrase(e){ S.pushed.push(e.id); }
      function invDbg(){}
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
  const mem = await factory({ localMem, SUPA, saved, pushed });
  return { mem, saved, pushed };
}

const LOCAL = {
  'bidfood|cheese slices tasty s yarde farm kg': { id: 'bidfood|cheese slices tasty s yarde farm kg', supplier: 'Bidfood', phrase_norm: 'cheese slices tasty s yarde farm kg', qty: 105, unit: 'ea' },
  'the fruit wagon|avocado tray': { id: 'the fruit wagon|avocado tray', supplier: 'The Fruit Wagon', phrase_norm: 'avocado tray', qty: 18, unit: 'ea' }
};

test('v107: an EMPTY server read does not wipe a populated local supplier memory', async () => {
  const { mem, saved } = await syncWith({ ...LOCAL }, []);
  assert.equal(Object.keys(mem).length, 2, 'both taught packs must survive — this is the whole bug');
  assert.deepEqual(saved, [], 'and nothing is persisted over the top of them');
});

test('v107: the surviving local entries are re-pushed so the server heals', async () => {
  const { pushed } = await syncWith({ ...LOCAL }, []);
  assert.deepEqual(pushed.sort(), Object.keys(LOCAL).sort(),
    'a server that lost the rows should get them back, not diverge silently');
});

test('v107: a NON-empty server read still wins — deletions propagate as before', async () => {
  const rows = [{ id: 'the fruit wagon|avocado tray', supplier: 'The Fruit Wagon', phrase_norm: 'avocado tray', qty: 18, unit: 'ea' }];
  const { mem, saved, pushed } = await syncWith({ ...LOCAL }, rows);
  assert.deepEqual(Object.keys(mem), ['the fruit wagon|avocado tray'],
    'the phrase deleted on another device is gone here too — server-wins is preserved');
  assert.equal(saved.length, 1, 'and the replacement is persisted');
  assert.deepEqual(pushed, [], 'no re-push when the server had data');
});

test('v107: qty is still coerced to a number on the server path', async () => {
  const rows = [{ id: 'k', supplier: 'Bidfood', phrase_norm: 'p', qty: '105', unit: 'ea' }];
  const { mem } = await syncWith({}, rows);
  assert.strictEqual(mem.k.qty, 105, 'a string qty would break every pack comparison downstream');
});

test('v107: an empty server read on an empty local memory is a plain no-op', async () => {
  const { mem, saved, pushed } = await syncWith({}, []);
  assert.deepEqual(mem, {}, 'nothing to protect, nothing to do');
  assert.deepEqual(pushed, [], 'a fresh install must not push phantom rows');
  assert.equal(saved.length, 1, 'the empty server state is still adopted normally');
});

test('v107: a real server ERROR leaves local untouched (the pre-existing guard)', async () => {
  const { mem, saved } = await syncWith({ ...LOCAL }, null, { error: true });
  assert.equal(Object.keys(mem).length, 2, 'a missing table or a failed read must never clear memory');
  assert.deepEqual(saved, []);
});
