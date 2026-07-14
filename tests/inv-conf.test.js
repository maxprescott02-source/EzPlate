/*
 * inv-conf.test.js — locks in the invoice Old-price / Confidence contract (v33 Item 1).
 *
 * REBUILT IN v35: the v33 brief says this file was written, but it was never
 * committed — the suite shipped at 39, not the 44 the v34 handover claims. The
 * behaviour it guards is real and lives in js/app.js; these tests restore the lock.
 *
 * The rule being pinned: a manual pick is NOT missing data. v32 blanked BOTH the
 * Old and Confidence cells whenever the user switched the matched product, even
 * though the picked candidate's coverage was sitting right there. v33 routed every
 * confidence decision through invDisplayConf():
 *   auto match                        -> the match's own confidence %
 *   manual pick of a ranked candidate -> THAT candidate's coverage %
 *   manual pick outside the candidates-> a labelled 'manual' token
 *   no product / add-new              -> a labelled dash (has:false)
 * Never a bare, unexplained dash on a row that has a product.
 *
 * invDisplayConf + tierOf are brace-extracted from the REAL shipped js/app.js —
 * no second copy to drift out of sync.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`inv-conf: function not found -> ${name}. app.js changed; update tests/inv-conf.test.js`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`inv-conf: unbalanced braces for ${name}`);
}

function build() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  const factory = new Function(`
    "use strict";
    ${extractFn(src, 'tierOf')}
    ${extractFn(src, 'invDisplayConf')}
    return { tierOf: tierOf, invDisplayConf: invDisplayConf };
  `);
  return factory();
}

const { tierOf, invDisplayConf } = build();

const DASH = '\u2014';

test('tierOf: the same thresholds buildInvRows uses (>=0.6 hi, >=0.3 mid, else lo)', () => {
  assert.equal(tierOf(0.9), 'hi');
  assert.equal(tierOf(0.6), 'hi');    // boundary is inclusive
  assert.equal(tierOf(0.59), 'mid');
  assert.equal(tierOf(0.3), 'mid');   // boundary is inclusive
  assert.equal(tierOf(0.29), 'lo');
  assert.equal(tierOf(0), 'lo');
});

test('auto match shows the match confidence, not a dash', () => {
  const r = { bestId: 'P0107', manualPick: false, conf: 0.82, tier: 'hi',
              cands: [{ id: 'P0107', coverage: 0.82 }] };
  const d = invDisplayConf(r);
  assert.equal(d.has, true);
  assert.equal(d.label, '82%');
  assert.equal(d.tier, 'hi');
});

test('THE v32 bug: manually picking a ranked candidate shows THAT candidate\u2019s coverage', () => {
  // user rejected the 82% auto-match and chose the second candidate at 44%.
  // v32 blanked the cell here. It must now read 44% and be tiered off 44%, not off r.tier.
  const r = { bestId: 'P0108', manualPick: true, conf: 0.82, tier: 'hi',
              cands: [{ id: 'P0107', coverage: 0.82 }, { id: 'P0108', coverage: 0.44 }] };
  const d = invDisplayConf(r);
  assert.equal(d.has, true);
  assert.equal(d.label, '44%');
  assert.equal(d.tier, 'mid');        // 0.44 -> mid, NOT the stale 'hi' from the auto match
});

test('manual pick from outside the ranked candidates shows a labelled \u201cmanual\u201d token, never a bare dash', () => {
  const r = { bestId: 'P0999', manualPick: true, conf: 0.82, tier: 'hi',
              cands: [{ id: 'P0107', coverage: 0.82 }] };
  const d = invDisplayConf(r);
  assert.equal(d.has, true);
  assert.equal(d.label, 'manual');
  assert.equal(d.tier, 'manual');
  assert.notEqual(d.label, DASH);
});

test('only a row with NO product dashes out \u2014 add-new and unmatched both report has:false', () => {
  const unmatched = invDisplayConf({ bestId: null, manualPick: false, cands: [] });
  assert.equal(unmatched.has, false);
  assert.equal(unmatched.label, DASH);
  assert.equal(unmatched.tier, 'none');

  // add-new wins even when a bestId is somehow still hanging around
  const addNew = invDisplayConf({ addNew: true, bestId: 'P0107', conf: 0.9, tier: 'hi',
                                  cands: [{ id: 'P0107', coverage: 0.9 }] });
  assert.equal(addNew.has, false);
  assert.equal(addNew.label, DASH);
});
