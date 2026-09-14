/*
 * cache-version.test.js — the six deploy-version literals, all of them, in one assertion.
 *
 * WHAT WAS UNCOVERED UNTIL BATCH 265. `tests/settings.test.js` pins spot 6 (`APP_VERSION`) against
 * spot 1 (`sw.js`'s CACHE), and `tests/smoke.js` derives its expected version from sw.js. Spots 2
 * to 5 — the `?v=` query strings in sw.js's ASSETS list and in index.html — were pinned by nothing,
 * and skills/cache-version said so in as many words: "Neither test checks spots 2-5. Those are on
 * you." Missing one serves stale CSS against fresh JS on an installed PWA, which is a ghost bug.
 *
 * It calls tools/bump-version.js's OWN readSpots(), not a copy of its greps. A hand-rolled mirror
 * would be written from the same belief as the script and would agree with it about the spot it
 * forgot — this repo's most-recorded test defect, and the one a second set of greps invites.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { SPOTS, readSpots, bump } = require('../tools/bump-version.js');

test('all six deploy-version spots agree, and sw.js CACHE is the one they are read from', () => {
  const spots = readSpots();
  assert.strictEqual(spots.length, 6, 'six spots, or the skill and the script have diverged');

  // Derived, never written down here: whatever sw.js's CACHE says IS the deploy version. A literal
  // in this file would be a seventh spot to forget.
  const expected = spots[0].version;
  assert.match(spots[0].what, /CACHE/, 'spot 1 must be sw.js CACHE — the other five are compared to it');

  for (const s of spots.slice(1)) {
    assert.strictEqual(s.version, expected,
      `${s.file}:${s.line} (spot ${s.n}, ${s.what}) reads v${s.version}; sw.js CACHE reads v${expected}. ` +
      'Run: node tools/bump-version.js ' + expected);
  }
});

test('every spot is unique in its file, so a bump cannot half-apply', () => {
  // readSpots() throws on a count that is not exactly 1. That is the property: a second `?v=` link
  // added to index.html must be a hard stop with a message, not a silent miss.
  assert.doesNotThrow(() => readSpots());
  for (const s of SPOTS) {
    const text = fs.readFileSync(path.join(__dirname, '..', s.file), 'utf8');
    const hits = [...text.matchAll(s.re)];
    assert.strictEqual(hits.length, 1, `spot ${s.n} must appear exactly once in ${s.file}, found ${hits.length}`);
  }
});

/*
 * The self-test. Everything above reads the tree as it stands, so it proves the six AGREE today and
 * proves nothing about the writer — and a bump script that silently skips a spot would leave every
 * assertion above green until the batch that used it. So: copy the three files into a temp root,
 * bump them there, and read all six back.
 */
function tempRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ezplate-bump-'));
  for (const rel of ['sw.js', 'index.html', 'js/app.js']) {
    fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
    fs.copyFileSync(path.join(__dirname, '..', rel), path.join(dir, rel));
  }
  return dir;
}

test('bump() moves all six and leaves none behind', () => {
  const dir = tempRoot();
  try {
    const before = readSpots(dir)[0].version;
    const target = before + 7;   // not +1: an off-by-one in the writer would still land on a number
    const after = bump(target, dir);
    assert.strictEqual(after.length, 6);
    for (const s of after) {
      assert.strictEqual(s.version, target, `spot ${s.n} (${s.file}, ${s.what}) did not move`);
    }
    // and the old number must be gone from every one of them, not merely joined by the new one
    for (const rel of ['sw.js', 'index.html', 'js/app.js']) {
      const text = fs.readFileSync(path.join(dir, rel), 'utf8');
      assert.ok(!text.includes(`ezplate-v${before}`), `${rel} still carries ezplate-v${before}`);
      assert.ok(!text.includes(`?v=${before}`), `${rel} still carries ?v=${before}`);
      assert.ok(!text.includes(`APP_VERSION='v${before}'`), `${rel} still carries APP_VERSION v${before}`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('bump() refuses, and writes NOTHING, when a spot has gone missing', () => {
  // The direction that matters. A writer that edits the five it can find and reports success is
  // exactly the stale-asset bug, arriving from the tool built to prevent it.
  const dir = tempRoot();
  try {
    const sw = path.join(dir, 'sw.js');
    const before = fs.readFileSync(sw, 'utf8');
    fs.writeFileSync(sw, before.replace(/const CACHE = 'ezplate-v(\d+)'/, "const CACHE = 'ezplate'"));
    const indexBefore = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    assert.throws(() => bump(999, dir), /spot 1/, 'it must name the spot it could not find');
    assert.strictEqual(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), indexBefore,
      'index.html must be untouched — a refusal that already wrote two files is a half-applied bump');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('bump() refuses a version that is not a positive integer', () => {
  const dir = tempRoot();
  try {
    for (const bad of ['216', 0, -1, 1.5, NaN, undefined]) {
      assert.throws(() => bump(bad, dir), /positive integer/, `bump(${String(bad)}) must refuse`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
