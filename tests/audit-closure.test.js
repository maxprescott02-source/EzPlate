/*
 * audit-closure.test.js — an audit recommendation that nobody decided about must not go quiet.
 *
 * WHY THIS EXISTS (batch 265, gap E8 of the 12 Sep 2026 standards audit). This project runs audits
 * and files them in docs/audits/, and nothing in the repo could tell a recommendation that was
 * actioned from one that was read once and forgotten. The fix-plan's own sentence is the rule:
 * "an audit finding that survives because nobody re-checked it is the same defect as a finding
 * nobody actions." `docs/reviews/` already has this gate for review findings - `.githooks/pre-push`
 * refuses a push without an artifact - and audits had nothing equivalent.
 *
 * WHAT IT CHECKS, and the scope is deliberately narrow. Only the NEWEST audit of each kind: the
 * highest `AUDIT-vNN.md` and the latest ISO-dated file. Older audits are history and are not
 * retrofitted - the property being enforced is "before the next audit is filed, close the last
 * one", which is exactly what a rolling check on the newest two gives you.
 *
 * WHAT IT IS NOT. It compares MARKERS, not truth. `done:` is a claim a human wrote; this file
 * cannot tell whether the work happened. What it removes is the third state - a recommendation
 * with no decision recorded at all, which is the one that survives by being unreadable.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const AUDITS = path.join(__dirname, '..', 'docs', 'audits');

// A heading that opens a recommendations section. Audits in this repo have used "2b. Dead traps
// recommended for removal", "Recommendations, ranked by expected value" and "What to change, in the
// order that buys the most time", so the match is on the WORDS, not on a numbering scheme.
const SECTION = /^(#{2,4})\s+.*(recommend|what to change|what to do|proposed fixes)/i;

// A numbered recommendation inside such a section: `**1. …`, `1. …`, `1) …`, `### R4 — …`.
// A BARE number needs its `.` or `)`; an `R`-prefixed one does not. That asymmetry is load-bearing:
// audit prose opens lines with figures ("71 open items in …"), and a rule that accepted `\d+\s`
// would read one of those as a recommendation and demand a decision about a sentence.
const NUMBERED = /^(?:\*{0,2}|#{1,4}\s*)(?:(R\d+)\b|(\d+)[.)]\s)/;

// The three closures. A queue reference (`#93`), a written decline, or a claim that it shipped.
const CLOSED = /(#\d+|\bdeclined:|\bdone:)/i;

/*
 * The whole check, as one pure function over a file's text, so the self-test below can run it
 * against synthetic audits. Returns a list of violations; an empty list is a pass.
 */
function closureViolations(text) {
  const lines = text.split('\n');
  const out = [];
  let section = null;      // { level, title } while inside one
  let item = null;         // { id, line, body[] } while inside a numbered recommendation
  const finish = () => {
    if (item && !CLOSED.test(item.body.join('\n'))) {
      out.push({ id: item.id, line: item.line, title: item.body[0].trim().slice(0, 70) });
    }
    item = null;
  };
  lines.forEach((line, i) => {
    const heading = /^(#{1,6})\s/.exec(line);
    if (heading) {
      // any heading at or above the section's level closes it
      if (section && heading[1].length <= section.level) { finish(); section = null; }
      const m = SECTION.exec(line);
      if (m) { finish(); section = { level: m[1].length, title: line.trim() }; return; }
    }
    if (!section) return;
    const num = NUMBERED.exec(line);
    if (num) { finish(); item = { id: num[1] || num[2], line: i + 1, body: [line] }; return; }
    if (item) item.body.push(line);
  });
  finish();
  return out;
}

// The newest audit of each kind. Derived from the FILENAME only - never mtime, which a fresh clone
// does not preserve, and never git, which a tarball does not carry.
function newestAudits(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  const versioned = files.filter((f) => /^AUDIT-v(\d+)\.md$/.test(f))
    .sort((a, b) => Number(/(\d+)/.exec(a)[1]) - Number(/(\d+)/.exec(b)[1]));
  const dated = files.filter((f) => /\d{4}-\d{2}-\d{2}/.test(f))
    .sort((a, b) => {
      const d = /(\d{4}-\d{2}-\d{2})/.exec(a)[1].localeCompare(/(\d{4}-\d{2}-\d{2})/.exec(b)[1]);
      return d !== 0 ? d : a.localeCompare(b);
    });
  return [versioned[versioned.length - 1], dated[dated.length - 1]].filter(Boolean);
}

test('the newest audit of each kind closes every numbered recommendation', () => {
  const newest = newestAudits(AUDITS);
  assert.strictEqual(newest.length, 2,
    `expected a newest AUDIT-vNN and a newest dated audit, got ${newest.join(', ')}`);

  for (const file of newest) {
    const text = fs.readFileSync(path.join(AUDITS, file), 'utf8');

    // Non-vacuity, and the assertion that keeps this test honest: an audit that numbers its
    // recommendations under a heading this file cannot recognise would be checked for nothing.
    assert.ok(text.split('\n').some((l) => SECTION.test(l)),
      `${file} has no recommendations section this gate can find. Name one - "Recommendations", ` +
      '"What to change" - or if the audit genuinely has none, say so under such a heading.');

    const open = closureViolations(text);
    assert.deepStrictEqual(open, [],
      `${file}: ${open.length} recommendation(s) with no decision recorded - ` +
      open.map((v) => `${v.id} (line ${v.line})`).join(', ') +
      '. Each needs a queue reference (#nn), `declined:` with a reason, or `done:` with the batch.');
  }
});

/*
 * THE SELF-TEST. Everything above is green when the repo's audits are closed, and would be equally
 * green if `closureViolations` returned [] unconditionally - which is this repo's most-recorded
 * defect. So the checker is run against audits written here, one of each shape.
 */
const FIXTURE = (body) => `# A synthetic audit\n\n## Findings\n\n**1. not a recommendation, no marker needed**\n\n## What to change\n\n${body}\n\n## The pushback\n\n**9. outside the section, ignored**\n`;

test('an unclosed recommendation IS a violation', () => {
  const v = closureViolations(FIXTURE('**1. Do the thing.**\nSome reasoning with no decision in it.'));
  assert.strictEqual(v.length, 1, 'the open recommendation must be reported');
  assert.strictEqual(v[0].id, '1');
});

test('each of the three closures satisfies it', () => {
  for (const close of ['Queued as #93.', 'declined: nobody is paying the cost this saves.',
                       'done: batch 264.']) {
    assert.deepStrictEqual(closureViolations(FIXTURE(`**1. Do the thing.**\n${close}`)), [],
      `"${close}" must count as a decision`);
  }
});

test('a closure on ONE recommendation does not cover its neighbour', () => {
  // The failure a section-wide search would have: one `#93` anywhere in the section, and every
  // other recommendation in it rides along closed.
  const v = closureViolations(FIXTURE('**1. Closed.**\nQueued as #93.\n\n**2. Open.**\nNo decision here.'));
  assert.strictEqual(v.length, 1);
  assert.strictEqual(v[0].id, '2', 'the SECOND one is the open one');
});

test('a figure opening a line of prose is not a recommendation', () => {
  // Measured against the real file: WORKFLOW-AUDIT-2026-09-09's recommendation 1 has the line
  // "71 open items in `docs/QUEUE-2026-09-08-CONSOLIDATED.md`". A gate that read that as item 71
  // would demand a decision about a sentence, and would then be satisfied by the decision on the
  // recommendation above it - a false pass and a false alarm from the same regex.
  const v = closureViolations(FIXTURE('**1. Do the thing.**\n71 open items in the backlog.\nNo decision.'));
  assert.deepStrictEqual(v.map((x) => x.id), ['1'], 'only the real recommendation is reported');
});

test('recommendations outside a recommendations section are not policed', () => {
  // Audits number their FINDINGS too, and a finding is a statement about the code, not a decision
  // anyone owes. Policing those would make the gate unpassable and it would be turned off.
  assert.deepStrictEqual(closureViolations('# x\n\n## 2a. VERIFY\n\n**1. A finding.**\nNo marker.\n'), []);
});

test('the `R4` and heading forms are recognised too', () => {
  const v = closureViolations('# x\n\n## Recommendations\n\n### R4 — do the thing\n\nNo decision.\n');
  assert.strictEqual(v.length, 1, 'AUDIT-v186 numbers its recommendations `R4`, as a heading');
  assert.strictEqual(v[0].id, 'R4');
});

test('newestAudits picks by number and by date, not by sort order', () => {
  // `AUDIT-v9` sorts after `AUDIT-v207` as a string. The bug this guards against is the one
  // brain-ops found in its own tools the same week: `sorted(glob)[-1]` is not "the newest".
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ezplate-audits-'));
  try {
    for (const f of ['AUDIT-v9.md', 'AUDIT-v207.md', 'UX-AUDIT-2026-01-02.md',
                     'WORKFLOW-AUDIT-2026-09-09.md', 'README.md']) {
      fs.writeFileSync(path.join(dir, f), '# x\n');
    }
    assert.deepStrictEqual(newestAudits(dir), ['AUDIT-v207.md', 'WORKFLOW-AUDIT-2026-09-09.md']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
