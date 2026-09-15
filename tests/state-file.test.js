/*
 * state-file.test.js — docs/STATE.json says what the files say, or the suite is red.
 *
 * THE ONE ASSERTION THE ITEM ASKED FOR is `batch` against the newest handover. It is a FRESHNESS
 * assertion rather than a correctness one: the writer derives both from the same directory, so they
 * can only disagree when the writer has not been run since the handover landed. That is exactly the
 * failure worth catching, because a state file nobody refreshes is a state file that lies while
 * looking maintained - and this repo has three recorded instances of a status marker outliving the
 * thing it described. The remedy is one command, and the failure message says it.
 *
 * ⚠️ IT IS COMPARED AGAINST AN INDEPENDENT WALK, NOT ONLY AGAINST derive(). A test that asked the
 * writer what it thinks and then agreed with it would be green against a broken writer - the stub
 * defect in .claude/rules/tests.md, twenty-two incidents. So the committed file is checked against a
 * second reading of the directory, written differently, below.
 *
 * WHAT THE FIXTURE TESTS ARE FOR. The group derivation is the only field that is not a max() over a
 * directory, and its first draft was WRONG in the quiet direction: it matched `**G4**` exactly, so
 * the file's `**G4 + G5**` dropped two groups and it named the wrong current group while returning
 * a list that still looked like an order. Those cases are pinned against synthetic files here,
 * because the real ones will be edited by hand every time a group finishes.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const state = require('../tools/state.js');

const ROOT = path.join(__dirname, '..');
const onDisk = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/STATE.json'), 'utf8'));

/* A second reading of docs/handovers/, deliberately not the one tools/state.js uses. */
function newestHandoverByHand() {
  let best = null;
  for (const file of fs.readdirSync(path.join(ROOT, 'docs', 'handovers'))) {
    if (!file.startsWith('HANDOVER-')) continue;
    const digits = /(\d+)/.exec(file.slice('HANDOVER-'.length));
    if (!digits) continue;
    const n = Number(digits[1]);
    if (!best || n > best.n) best = { n, file };
  }
  return best;
}

test('STATE.json batch is the newest handover, so a handover cannot land without the writer', () => {
  const hand = newestHandoverByHand();
  assert.ok(hand, 'docs/handovers/ holds no HANDOVER-<n> file at all');
  assert.strictEqual(onDisk.batch, hand.n,
    `docs/STATE.json says batch ${onDisk.batch}; the newest handover is ${hand.file}. Run: node tools/state.js`);
  assert.strictEqual(onDisk.newest_handover, hand.file,
    `docs/STATE.json names ${onDisk.newest_handover} as the newest handover; the directory says ${hand.file}. Run: node tools/state.js`);
});

test('STATE.json deploy_version is sw.js CACHE, and newest_audit is the highest AUDIT-vNN', () => {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const cache = /const CACHE = 'ezplate-v(\d+)'/.exec(sw);
  assert.ok(cache, 'sw.js has no CACHE literal - tools/bump-version.js would have refused first');
  assert.strictEqual(onDisk.deploy_version, Number(cache[1]),
    `docs/STATE.json says v${onDisk.deploy_version}; sw.js says v${cache[1]}. Run: node tools/state.js`);

  // The counter skills/batch step 10 reads is the NUMBERED series only. A dated audit
  // (UX-AUDIT-2026-09-08.md) is keyed to a date and cannot be compared against a deploy version.
  const nums = fs.readdirSync(path.join(ROOT, 'docs', 'audits'))
    .map((f) => /^AUDIT-v(\d+)\.md$/.exec(f)).filter(Boolean).map((m) => Number(m[1]));
  assert.ok(nums.length, 'docs/audits/ holds no AUDIT-vNN.md');
  assert.strictEqual(onDisk.newest_audit, `AUDIT-v${Math.max(...nums)}.md`,
    `docs/STATE.json names ${onDisk.newest_audit}. Run: node tools/state.js`);
});

test('STATE.json open_ab_count counts every item heading in docs/QUEUE.md, whatever its status', () => {
  /* Counted here off the raw file rather than via queueItems(), for the same reason as above.
     ⚠️ THIS PATTERN REQUIRED A DIGIT UNTIL AUDIT-v217, AND SO DID `tools/state.js`'s, WHICH IS WHY
     NEITHER CAUGHT THE OTHER. Batch 265 let one un-numbered process item hold a slot; both regexes
     skipped it, `open_ab_count` read 3 against four headings, and this assertion passed because
     the two wrong beliefs matched. **Deriving a check from the same assumption as the code makes
     it a mirror, not a second opinion** — the roster's oldest entry, in the test file written to
     police a derived value. The independence here is that this reads the RAW MARKDOWN and
     `tools/state.js` parses it; that only pays off if the patterns can disagree. */
  const queue = fs.readFileSync(path.join(ROOT, 'docs', 'QUEUE.md'), 'utf8');
  const heads = queue.split('\n').filter((l) => /^##\s+(next|blocked|doing)\s+\S/.test(l));
  assert.strictEqual(onDisk.open_ab_count, heads.length,
    `docs/STATE.json says ${onDisk.open_ab_count} open items; docs/QUEUE.md has ${heads.length} headings. Run: node tools/state.js`);
  assert.ok(heads.length <= 20, 'docs/QUEUE.md is capped at 20 items by its own header');
});

test('every other field agrees with the files too, and written_at is a real past date', () => {
  const want = state.derive(ROOT);
  const stale = Object.keys(want).filter((k) => k !== 'written_at' && want[k] !== onDisk[k]);
  assert.deepStrictEqual(stale, [],
    `docs/STATE.json is stale on ${stale.map((k) => `${k} (${onDisk[k]} -> ${want[k]})`).join(', ')}. Run: node tools/state.js`);

  assert.match(onDisk.written_at, /^\d{4}-\d{2}-\d{2}$/, 'written_at is a plain ISO date');
  assert.ok(onDisk.written_at <= new Date().toISOString().slice(0, 10),
    `written_at ${onDisk.written_at} is in the future`);
});

/*
 * ⚠️ THE ONE FIELD THAT HAD NO INDEPENDENT CHECK, and the pre-push review named it.
 * Every other field above is compared against a second reading of the real tree. first_unstruck_group
 * was exercised only by the fixtures below and by `derive() === STATE.json` - and BOTH SIDES OF THAT
 * ARE THE SAME FUNCTION, which is the stub-agrees-with-itself shape this file's own header warns
 * about. A firstUnstruckGroup() that named the wrong group on the real files would be written into
 * docs/STATE.json and every test would stay green.
 *
 * So this checks it against a third file the derivation never consults for this field: the WORKING
 * SET. docs/QUEUE.md holds what the last refill promoted, and skills/batch promotes from the current
 * group - so if the state file names a group that none of the promoted items belong to, one of the
 * two is wrong and a reader has no way to tell which. Read off the raw section text, not through
 * groupMembers(), so a broken membership parse cannot satisfy it.
 */
test('the current group is one docs/QUEUE.md was actually refilled from', () => {
  const named = onDisk.first_unstruck_group;
  if (named === null) return;   // every group promotable-empty is a legitimate state
  const groups = fs.readFileSync(path.join(ROOT, 'docs', 'QUEUE-GROUPS.md'), 'utf8');
  const section = groups.split(new RegExp(`^### ${named} · `, 'm'))[1];
  assert.ok(section, `docs/STATE.json names ${named}, which has no "### ${named} ·" section`);
  const itemsLine = section.split('\n').find((l) => l.startsWith('**Items:**'));

  // The promoted items are QUEUE.md's headings numbered 16 or above; its own 1-15 predate the
  // consolidation and belong to no group. tests/queue-routing.test.js already requires each to be
  // routed somewhere, so "routed, but not in the group we call current" is the gap this closes.
  const promoted = fs.readFileSync(path.join(ROOT, 'docs', 'QUEUE.md'), 'utf8').split('\n')
    .map((l) => /^##\s+(?:next|blocked|doing)\s+(\d+)[a-z]?\s*·/.exec(l))
    .filter(Boolean).map((m) => Number(m[1])).filter((n) => n >= 16);
  if (!promoted.length) return;   // a working set of pre-consolidation items only says nothing here

  const mine = promoted.filter((n) => new RegExp(`\\b${n}\\b`).test(itemsLine));
  assert.ok(mine.length,
    `docs/STATE.json says the current group is ${named}, but none of docs/QUEUE.md's promoted items `
    + `(${promoted.join(', ')}) appear in that group's Items line. Either the refill took from a `
    + `different group or first_unstruck_group is wrong.`);
});

/* ---- newest-by-NUMBER, against synthetic directories ----
 *
 * ⚠️ ADDED BECAUSE A HAND-MUTATION SURVIVED. Replacing audits()' `a.n - b.n` with a filename
 * compare left every assertion above green: the ten AUDIT-vNN.md files in this repo today happen to
 * sort identically either way. It breaks the first time the series crosses a digit boundary -
 * "AUDIT-v99.md" sorts ABOVE "AUDIT-v207.md" as a string - and what it would produce then is a
 * newest_audit five deploy versions stale, which is the input to the audit counter in
 * skills/batch step 10. That is the `sorted(glob)[-1]` defect, and it is silent by construction.
 * The real tree cannot pin it, so these two build the disagreement on purpose.
 */
function dirRoot(sub, files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ezplate-state-'));
  fs.mkdirSync(path.join(dir, 'docs', sub), { recursive: true });
  for (const f of files) fs.writeFileSync(path.join(dir, 'docs', sub, f), 'x\n');
  return dir;
}

test('newest audit is the highest NUMBER, not the last filename', () => {
  const dir = dirRoot('audits', [
    'AUDIT-v99.md', 'AUDIT-v207.md', 'AUDIT-v115.md',
    'WORKFLOW-AUDIT-2026-09-09.md', 'UX-AUDIT-2026-12-31.md',   // dated, and NOT in the series
  ]);
  try {
    assert.strictEqual(state.audits(dir).slice(-1)[0].file, 'AUDIT-v207.md');
    assert.deepStrictEqual(state.audits(dir).map((a) => a.n), [99, 115, 207],
      'a dated audit is keyed to a date, not a deploy version, and cannot feed the counter');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('newest handover is the highest NUMBER, across both filename shapes', () => {
  const dir = dirRoot('handovers', [
    'HANDOVER-v99.md',              // the write-once pre-8-Aug shape
    'HANDOVER-266-state-file.md',   // the current shape
    'HANDOVER-123-dashboard.md',
    'README.md',                    // not a handover
  ]);
  try {
    const hs = state.handovers(dir);
    assert.deepStrictEqual(hs.map((h) => h.n), [99, 123, 266]);
    assert.strictEqual(hs.slice(-1)[0].file, 'HANDOVER-266-state-file.md');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/* ---- the group derivation, against synthetic files ---- */

function fixtureRoot(groups, consolidated) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ezplate-state-'));
  fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'docs/QUEUE-GROUPS.md'), groups);
  fs.writeFileSync(path.join(dir, 'docs/QUEUE-2026-09-08-CONSOLIDATED.md'), consolidated);
  return dir;
}

const GROUPS_OK = [
  '# groups',
  '',
  '### G1 · first',
  '',
  '**Items:** ~~16~~ (239) · 17 · 18',
  '',
  '### G2 · second',
  '',
  '**Items:** 19, 20',
  '',
  '### G3 · third',
  '',
  '**Items:** 21 · shipped in 266, routed by 999',
  '',
  '## The order',
  '',
  '1. **G1** - the wrong numbers, and three of G3\'s inputs.',
  '2. **G2 + G3** - the polish tranche.',
  '',
  '**G3\'s schedule is a consequence of this order.**',
  '',
  '## What is not routed here',
  '',
  'Tranche 0 is not in any group.',
  '',
].join('\n');

const CONSOLIDATED_OK = [
  '# backlog',
  '',
  '## ~~16 · a shipped one~~  **SHIPPED, batch 239, `ezplate-v197`**',
  '## next  17 · a C one  **[C, nobody sees it]**',
  '## next  18 · another C one  **[C until a second client exists, then A]**',
  '## next  19 · a B one  **[B, a real person sees it]**',
  '## next  20 · an A one  **[A, launch is unsafe without it]**',
  '## next  21 · a B one  **[B, later]**',
  '',
].join('\n');

test('the order is read from the numbered list, and a bold span can name two groups', () => {
  const dir = fixtureRoot(GROUPS_OK, CONSOLIDATED_OK);
  try {
    // `**G2 + G3**` is ONE bold span naming two groups - the shape that broke the first draft.
    assert.deepStrictEqual(state.groupOrder(dir), ['G1', 'G2', 'G3']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a group named in prose inside a numbered line does not join the order', () => {
  // Item 1 above says "three of G3's inputs" outside its bold span. A bare \bG\d\b scan would put
  // G3 second and name the wrong current group, with no symptom anywhere.
  const dir = fixtureRoot(GROUPS_OK.replace('2. **G2 + G3** - the polish tranche.', '2. **G2** - alone.'), CONSOLIDATED_OK);
  try {
    assert.throws(() => state.groupOrder(dir), /does not place G3/,
      'a group with a section but no place in the order must be a hard stop, not a shorter list');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('groupOrder refuses a file with no "## The order" section rather than guessing one', () => {
  const dir = fixtureRoot(GROUPS_OK.replace('## The order', '## The plan'), CONSOLIDATED_OK);
  try {
    assert.throws(() => state.groupOrder(dir), /no "## The order" section/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('membership reads item numbers, not the batch numbers in the asides beside them', () => {
  const dir = fixtureRoot(GROUPS_OK, CONSOLIDATED_OK);
  try {
    // `~~16~~ (239)` must contribute 16 and NOT 239. Struck items stay in the membership list on
    // purpose: the consolidated file, not this one, is what says whether an item is finished.
    assert.deepStrictEqual(state.groupMembers(dir).G1, [16, 17, 18]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a number above the backlog\'s highest item is a batch number, not a member', () => {
  // G3's line reads "21 · shipped in 266, routed by 999" - bare numbers, no parentheses to strip.
  // The ceiling is the consolidated file's own top item, so both are excluded.
  const dir = fixtureRoot(GROUPS_OK, CONSOLIDATED_OK);
  try {
    assert.deepStrictEqual(state.groupMembers(dir).G3, [21]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('and the ceiling MOVES WITH THE BACKLOG, so an item numbered past 200 is still a member', () => {
  /* ⚠️ THIS IS THE HALF THE TEST ABOVE CANNOT PROVE, and hand-mutation is what showed it: reverting
     the derived ceiling to the first draft's literal `n < 200` left that test green, because 266 and
     999 are above 200 as well. The defect only appears once the BACKLOG reaches 200 - a real item
     dropping silently out of its group's membership - so the fixture has to get there. */
  const groups = [
    '### G1 · first', '', '**Items:** 210, 211 (shipped in 266)', '',
    '## The order', '', '1. **G1** - all of it.', '',
  ].join('\n');
  const consolidated = [
    '## next  210 · an A one past the old ceiling  **[A, launch is unsafe without it]**',
    '## ~~211 · a shipped one~~  **SHIPPED, batch 266**',
    '',
  ].join('\n');
  const dir = fixtureRoot(groups, consolidated);
  try {
    assert.deepStrictEqual(state.groupMembers(dir).G1, [210, 211],
      'a literal ceiling drops both and the group reads as empty');
    assert.strictEqual(state.firstUnstruckGroup(dir), 'G1',
      'with 210 dropped from membership this returns null - a finished backlog that is not finished');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('an item heading it cannot read is a hard stop, never a skip', () => {
  // A skipped heading is indistinguishable from a struck item to firstUnstruckGroup, so the group
  // reads as finished with open work in it. Found by the pre-push review on the real file's
  // `## ~~blocked~~  91 · original item`.
  const dir = fixtureRoot(GROUPS_OK, `${CONSOLIDATED_OK}## next 22 - no middot but a heading · ish\n`
    .replace('## next 22 - no middot but a heading · ish', '## item twenty-two · a shape nobody has seen'));
  try {
    assert.throws(() => state.consolidatedItems(dir), /cannot read/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a struck STATUS WORD on an open item does not make the item struck', () => {
  // `## ~~blocked~~  91 · original item` strikes the status, not the item. Reading the leading ~~
  // as "shipped" would drop a live A or B item out of its group with no symptom.
  const dir = fixtureRoot(GROUPS_OK, CONSOLIDATED_OK
    .replace('## next  19 · a B one  **[B, a real person sees it]**',
      '## ~~blocked~~  19 · a B one  **[B, a real person sees it]**'));
  try {
    assert.strictEqual(state.consolidatedItems(dir)[19].struck, false);
    assert.strictEqual(state.firstUnstruckGroup(dir), 'G2', 'item 19 is still open, so G2 is still current');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a group whose only unstruck items are tier C is NOT the current group', () => {
  // The G1 case, and the reason "unstruck" alone is the wrong test: docs/QUEUE.md holds tier A and
  // B only, so a C-only group can never be promoted and would read as current for ever.
  const dir = fixtureRoot(GROUPS_OK, CONSOLIDATED_OK);
  try {
    assert.strictEqual(state.firstUnstruckGroup(dir), 'G2', 'G1 holds one shipped item and two C items');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('striking a group\'s last A and B items moves the current group on', () => {
  const struck = CONSOLIDATED_OK
    .replace('## next  19 · a B one  **[B, a real person sees it]**', '## ~~19 · a B one~~  **SHIPPED, batch 266**')
    .replace('## next  20 · an A one  **[A, launch is unsafe without it]**', '## ~~20 · an A one~~  **SHIPPED, batch 266**');
  const dir = fixtureRoot(GROUPS_OK, struck);
  try {
    assert.strictEqual(state.firstUnstruckGroup(dir), 'G3');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('with every A and B struck the answer is null, which is a finding and not an error', () => {
  const struck = CONSOLIDATED_OK.replace(/^## next  (19|20|21) · (.*)$/gm, '## ~~$1 · $2~~  **SHIPPED**');
  const dir = fixtureRoot(GROUPS_OK, struck);
  try {
    assert.strictEqual(state.firstUnstruckGroup(dir), null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('write() refuses and leaves the old file alone when a source file is unreadable', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ezplate-state-'));
  try {
    fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'docs/STATE.json'), '{"batch":1}\n');
    assert.throws(() => state.write(dir), /ENOENT/, 'no handovers, no sw.js - it must throw');
    assert.strictEqual(fs.readFileSync(path.join(dir, 'docs/STATE.json'), 'utf8'), '{"batch":1}\n',
      'a partly-derived state file must never be written over a good one');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
