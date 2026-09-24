// 284 - queue item 100: docs/MAINTENANCE.md is a working list, and this is
// what makes it one. tools/maintenance-check.js holds the check and the
// reasoning; this file runs it on the real file and proves each rule can fail.
//
// The synthetic cases are not decoration. A detector that has never been seen
// red is a claim, and the real file is green by construction on the day it
// ships, so without these nothing would show that a stale anchor, a struck
// entry or an overfull file is actually caught.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const { check, MARKER, ENTRY_CAP, NONE_CAP, INTRO_MAX, FILE } = require('../tools/maintenance-check.js');

// A fake repo for the synthetic cases, so they do not depend on what js/app.js
// happens to contain this week.
const FAKE = { 'js/app.js': 'function alive(){}\n', 'tests/visual/a.spec.js': 'spec text\n' };
const fake = {
  read: f => FAKE[f],
  files: w => { w = w.replace(/\/+$/, ''); return w in FAKE ? [w] : Object.keys(FAKE).filter(f => f.startsWith(w + '/')); },
};
const doc = body => `# Maintenance\nheader prose\n${MARKER}\n## C — group\n${body}`;
const problems = body => check(doc(body), fake).problems;

test('284: the real docs/MAINTENANCE.md passes its own check', () => {
  const r = check(fs.readFileSync(FILE, 'utf8'));
  assert.deepStrictEqual(r.problems, [], 'run `node tools/maintenance-check.js` for the same list');
  assert.ok(r.entries > 0, 'and it found entries - a parse that sees none would pass everything');
});

test('284: a well-formed entry passes, in a file and in a directory', () => {
  assert.deepStrictEqual(problems('### A thing\nAnchor: `alive` in `js/app.js`\n\nbody\n### B\nAnchor: `spec text` in `tests/visual`\nbody\n'), []);
});

test('284: an entry whose subject has been deleted goes red', () => {
  const p = problems('### Gone\nAnchor: `deadFn` in `js/app.js`\nbody\n');
  assert.strictEqual(p.length, 1);
  assert.match(p[0], /STALE - `deadFn` is no longer in `js\/app\.js`/);
});

test('284: an `absent` entry goes red the day the thing is built', () => {
  assert.deepStrictEqual(problems('### Unbuilt\nAnchor: absent `newThing` in `js/app.js`\n'), []);
  assert.match(problems('### Unbuilt\nAnchor: absent `alive` in `js/app.js`\n')[0], /now EXISTS/);
});

test('284: an anchor naming a file that is not tracked is refused, not skipped', () => {
  assert.match(problems('### X\nAnchor: `alive` in `js/nope.js`\n')[0], /not a tracked file/);
});

test('284: an entry with no anchor, or with the anchor below its prose, is refused', () => {
  assert.match(problems('### X\nbody\n')[0], /no `Anchor:` line/);
  assert.match(problems('### X\nbody\nAnchor: `alive` in `js/app.js`\n')[0], /no `Anchor:` line/);
  assert.match(problems('### X\nAnchor: alive in js/app.js\n')[0], /malformed anchor/);
});

test('284: a finished entry is refused - it is deleted, not struck', () => {
  for (const title of ['~~Old~~', 'Old thing — DONE, batch 1', '✅ Old', 'Old - SHIPPED']) {
    assert.match(problems(`### ${title}\nAnchor: \`alive\` in \`js/app.js\`\n`)[0], /reads as finished/, title);
  }
  // lowercase is prose, not a status: "done" in a live title must not trip it
  assert.deepStrictEqual(problems('### What is not done yet\nAnchor: `alive` in `js/app.js`\n'), []);
  assert.match(problems('### Live\nAnchor: `alive` in `js/app.js`\n- ~~an old bullet~~ gone\n')[0], /struck finding/);
});

test('284: a finding written as group prose instead of an entry is refused', () => {
  const intro = Array.from({ length: INTRO_MAX + 1 }, (_, i) => `- finding ${i}`).join('\n');
  assert.match(problems(`${intro}\n### A\nAnchor: \`alive\` in \`js/app.js\`\n`)[0], /lines before its first entry/);
  assert.match(check(doc('### A\nAnchor: `alive` in `js/app.js`\n## C — empty\n- a bullet finding\n'), fake).problems[0], /holds no `###` entry/);
});

test('284: an entry above the marker escapes nothing', () => {
  const r = check(`# M\n### Hidden\n${MARKER}\n## C — g\n### A\nAnchor: \`alive\` in \`js/app.js\`\n`, fake);
  assert.match(r.problems[0], /above the marker/);
  assert.match(check('# M\n### A\n', fake).problems[0], /marker is missing/);
});

test('284: the cap - one entry past it is red', () => {
  const entry = i => `### E${i}\nAnchor: \`alive\` in \`js/app.js\`\n`;
  const at = Array.from({ length: ENTRY_CAP }, (_, i) => entry(i)).join('');
  assert.deepStrictEqual(problems(at), []);
  assert.match(problems(at + entry('x')).at(-1), /against a cap of/);
});

test('284: `Anchor: none` is allowed and counted, and past its cap is red', () => {
  const none = i => `### N${i}\nAnchor: none - lives in production data\n`;
  assert.deepStrictEqual(problems(Array.from({ length: NONE_CAP }, (_, i) => none(i)).join('')), []);
  assert.match(problems(Array.from({ length: NONE_CAP + 1 }, (_, i) => none(i)).join('')).at(-1), /opt out/);
});
