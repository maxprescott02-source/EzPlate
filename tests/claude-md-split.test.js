// 264 - the detector for the CLAUDE.md split.
//
// Gap E3 of the 12 Sep 2026 standards audit was not that CLAUDE.md was 1,078
// lines. It was that NOTHING FAILED when it grew: the file put on 18% in three
// days and no check in this repo could see it. "Eleven of twelve EzPlate gaps
// have no detector" was the audit's actual finding, and a gap with no detector
// is permanent whatever its severity. So the split is only half the work and
// this file is the other half.
//
// Five assertions, and each one is here because the thing it checks can break
// SILENTLY - no error, no red, nothing on any screen:
//   1. CLAUDE.md creeps back over 200 lines.
//   2. A section quietly stops existing during a move or a "tidy".
//   3. A `paths:` glob is typed wrong, so the rule never loads and reads exactly
//      like one that does. This repo's oldest rule in a new language: a
//      declaration is not an enforcement.
//   4. A rule file is orphaned, or the index points at one that is gone.
//   5. The reviewer definition leaves the repo again, which is gap E4.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RULES_DIR = path.join(ROOT, '.claude', 'rules');
const PROCESS_DOC = path.join(ROOT, 'docs', 'rules', 'process.md');
const read = p => fs.readFileSync(p, 'utf8');

// Every `##`/`###` heading CLAUDE.md carried at 2dacc00, the commit before the
// split. This is a FROZEN manifest, not a recomputation: the point is that a
// section cannot leave the repo without somebody editing this list, which makes
// the deletion a deliberate, visible act rather than a diff nobody reads.
//
// Deleting a trap on purpose is legitimate - this file's own doctrine is that a
// stale rule is worse than none. Delete it from here in the SAME commit and say
// why in the handover.
const MANIFEST = [
  "## Where things live",
  "## ⚠️ THE REPOSITORY IS PUBLIC (13 Aug 2026). NOTHING SECRET MAY EVER BE COMMITTED.",
  "## The naming inversion - never \"fix\" it",
  "## A duplicate definition is never \"dead until reached\"",
  "## An exemption granted for one property applies to EVERY property the same path writes",
  "## `isFinite('')` is TRUE",
  "## `min`, `max` and `required` ARE INERT on every input this app reads, and they read exactly like the check",
  "## The parser region - THE PROTECTION IS LIFTED (Max, 10 Sep 2026: *\"its lifted\"*)",
  "## The row boundary - the backup export is IN-MEMORY shape, not schema shape",
  "## A column DEFAULT does not survive the restore",
  "### The other half: a DEFAULT is applied BEFORE the trigger, so the two must say the SAME thing",
  "## \"Fail open\" is what you do with NO information — reusing it as the answer to a RECHECK reopens the hole",
  "## A FOREIGN KEY is checked with RLS OFF, so a cross-tenant reference SUCCEEDS instead of erroring",
  "## What staff may delete is decided by WHOSE work it destroys, not by how much damage it does",
  "## A policy that RESTRICTS and a policy that GRANTS differ by one word and read identically",
  "## `revoke … from public` DOES NOT REVOKE `anon`, and every migration in this repo is written as if it does",
  "## `create or replace function` REPLACES THE WHOLE BODY, so copying one forward from the wrong ancestor DELETES guards by omission",
  "## A PRIMARY KEY's column list is a contract with every `ON CONFLICT` that names it — and with the client that names none",
  "## `ingredients.updated_at` is not history",
  "## The headline average is a MEAN OF PER-PLATE RATIOS, and it is bounded at 300%",
  "## Per-publication counting was decided, then reverted on real data",
  "## The client's role is not the MCP's role",
  "## Some of this app's behaviour is not in this repo at all, and nothing here can read it",
  "## Three foreign keys between the DATA tables, and only one can ever error",
  "## Cross-referencing writes are a SEQUENCE, not two independent writes",
  "## Gating the last committing action is not a gate",
  "## Two more that look like simplifications",
  "## The absence of a back-pointer is not evidence that nothing was lost",
  "## Five history series, deliberately separate - don't merge them",
  "## Chart colour is anchored to the TARGET, not to direction",
  "## `addProduct` is dead in the app and DELIBERATELY KEPT",
  "## A stub that mirrors a real function must mirror its CONTRACT - so extract the real function instead",
  "## A `@media` block does not win by being later",
  "## `position:fixed` IS NOT VIEWPORT-RELATIVE, and this app's standard escape hatch assumes it is",
  "## An optimistic write that changes a FIGURE owes a rollback - and the wait it avoids may not exist",
  "## \"The server refuses it anyway\" is true of an ACTION and false of a VALUE",
  "## A justification that CITES A PRECEDENT is a claim that the precedent's CONDITION holds here, and it is never checked",
  "## A comment can record the defect CORRECTLY and file it under the wrong consequence",
  "## Offsets on a `position:static` box are INERT, and everything around them can still read as deliberate",
  "## A CSS syntax error is SILENT, and it discards every rule after it",
  "## A viewport-geometry assertion must MEASURE its reference, never name it",
  "## The four object nouns - UI copy may not invent a fifth",
  "## Data and storage",
  "## Writes",
  "## Menus",
  "## No new dependencies, no build step, no scope creep",
  "## Server-side (`api/`)",
  "## The privacy gate - before EzPlate serves anyone but Scoopy's",
  "## Fragile areas - regression tests mandatory",
  "## Chat cannot see this repo",
  "## Working with Max",
  "## Migrations - Claude applies them (REVERSED 8 Aug 2026)",
  "## Deploy",
  "## Independent review before merge",
  "### Where a finding gets fixed",
  "## Which item runs before which belongs in the QUEUE, never here",
  "## A DONE-MARK IS NOT A STRIKE, AND A STANDING CHECK NEEDS AN EXPIRY",
  "## Changing this file - the edit is YOURS to make (Max, 13 Aug 2026)",
];

const ruleFiles = () =>
  fs.readdirSync(RULES_DIR).filter(f => f.endsWith('.md')).sort();

const headingsIn = text =>
  text.split('\n').filter(l => /^#{2,3} /.test(l)).map(l => l.trimEnd());

// A minimal glob -> RegExp, covering the two shapes the rule files use: a
// literal path and a `dir/**` subtree. Deliberately not a general glob engine.
//
// ⚠️ The honest limit, because a net you over-trust is worse than none: this
// proves the pattern matches a real file under a standard globstar reading. It
// does NOT prove Claude Code's own matcher agrees, because nothing in this repo
// can see that matcher. It catches the failure that has actually happened to
// declarations here - a path typed wrong, or a file moved out from under one -
// not a disagreement about globstar semantics.
function globToRe(g) {
  // Split on `**` first, so no placeholder character is ever parked in the
  // string - a marker you cannot see in the source is a marker somebody edits.
  const esc = s => s.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*');
  return new RegExp('^' + g.split('**').map(esc).join('.*') + '$');
}

function repoFiles() {
  const out = [];
  const skip = new Set(['node_modules', '.git', 'test-results', 'playwright-report']);
  (function walk(dir, rel) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(e.name)) continue;
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) walk(path.join(dir, e.name), r);
      else out.push(r);
    }
  })(ROOT, '');
  return out;
}

test('1. CLAUDE.md stays under 200 lines AND under 32KB', () => {
  const text = read(path.join(ROOT, 'CLAUDE.md'));
  const lines = text.split('\n');
  // Trailing newline gives one empty final element; do not count it.
  const n = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
  assert.ok(
    n <= 200,
    `CLAUDE.md is ${n} lines. It is loaded in full on every turn of every session, ` +
    `and it reached 1,078 lines the last time nothing was watching. A rule that ` +
    `earns its place displaces one, or its evidence moves to .claude/rules/.`
  );
  // The line cap alone is a PROXY, and the pre-push review of the split said so:
  // the stated problem is 164,502 BYTES on every turn, and a line count is
  // defeated by writing fewer, longer lines - which is exactly the house style
  // here. Cap what the problem was actually measured in. 32KB against today's
  // 24KB leaves real headroom and still catches a slide back toward 164KB.
  assert.ok(
    text.length <= 32768,
    `CLAUDE.md is ${text.length} bytes. The 200-line cap is a proxy for this ` +
    `number, and this is the one the audit measured.`
  );
});

test('2. every section of the pre-split CLAUDE.md still exists somewhere', () => {
  const present = new Set([
    ...headingsIn(read(path.join(ROOT, 'CLAUDE.md'))),
    ...ruleFiles().flatMap(f => headingsIn(read(path.join(RULES_DIR, f)))),
    ...headingsIn(read(PROCESS_DOC)),
  ]);
  const missing = MANIFEST.filter(h => !present.has(h));
  assert.deepStrictEqual(
    missing, [],
    `these rules exist in no file any more:\n  ${missing.join('\n  ')}\n` +
    `If a deletion was intended, delete it from MANIFEST in the same commit and ` +
    `say why in the handover.`
  );
  // Equality, not containment - roster entry 190: "not the wrong value" is a
  // guess about every wrong value there could be. A heading that is present but
  // is not in the manifest is a NEW rule, which is fine and is why this half
  // only reports; the assertion above is the one that holds.
  assert.ok(present.size >= MANIFEST.length);

  // ⚠️ THE HONEST LIMIT, and the pre-push review of the split named it: the
  // check above proves a heading STRING survived, not that anything is left
  // under it. A section gutted to a stub with its heading intact stays green -
  // which is this repo's own most-recorded shape, a test that cannot fail,
  // arriving in the test written to police a split.
  //
  // The floor below bounds the corpus, and it is worth being exact about what
  // that buys, because the comfortable version of this sentence is wrong.
  // MEASURED, by doing it: deleting the whole `revoke … from public` section -
  // ~5KB, one of the highest-stakes rules here - leaves this assertion GREEN.
  // The floor catches a COLLAPSE, not a gutting. Nothing in this repo catches a
  // gutting, and the honest reason the floor is still here is that a collapse
  // is the failure a bulk edit or a bad merge actually produces.
  //
  // The pre-split file was 164,502 bytes; the same text plus the new headers is
  // ~193,000 across CLAUDE.md, the rule files and process.md. 150,000 is
  // deliberately slack, because a floor that reddens on a typo fix teaches
  // people to bump the number without reading it, and a number nobody reads is
  // worse than no number. Pruning a stale rule is legitimate and this repo does
  // it; taking a fifth of the corpus out has to be somebody editing this line
  // on purpose, the same way MANIFEST works one level up.
  const corpus = [
    read(path.join(ROOT, 'CLAUDE.md')),
    ...ruleFiles().map(f => read(path.join(RULES_DIR, f))),
    read(PROCESS_DOC),
  ].reduce((n, t) => n + t.length, 0);
  assert.ok(
    corpus >= 150000,
    `the rules corpus is ${corpus} bytes, down from 164,502 in CLAUDE.md alone ` +
    `before the split. This catches a collapse, not a single gutted section. ` +
    `If the shrink is deliberate, lower this floor in the same commit.`
  );
});

test('3. every rule file declares paths that match a real file', () => {
  const files = repoFiles();
  const names = ruleFiles();
  assert.ok(names.length > 0, '.claude/rules/ is empty - the split is gone');
  for (const name of names) {
    const text = read(path.join(RULES_DIR, name));
    const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(fm, `${name} has no YAML frontmatter, so it loads on EVERY turn ` +
      `at full cost - which is the thing the split exists to stop`);
    const globs = fm[1].split('\n')
      .filter(l => /^\s+-\s/.test(l))
      .map(l => l.replace(/^\s+-\s*/, '').replace(/^["']|["']$/g, ''));
    assert.ok(globs.length, `${name} declares no paths`);
    for (const g of globs) {
      const re = globToRe(g);
      assert.ok(
        files.some(f => re.test(f)),
        `${name} is scoped to "${g}", which matches no file in this repo. ` +
        `A path-scoped rule whose glob matches nothing never loads, and reads ` +
        `exactly like one that does - the same shape as min="0" on an input ` +
        `nothing validates.`
      );
    }
  }
});

test('4. CLAUDE.md and .claude/rules/ name each other, both directions', () => {
  const claude = read(path.join(ROOT, 'CLAUDE.md'));
  for (const name of ruleFiles()) {
    assert.ok(
      claude.includes('.claude/rules/' + name),
      `.claude/rules/${name} exists and CLAUDE.md never mentions it. An orphaned ` +
      `rule file is read by nobody who did not already know it was there.`
    );
  }
  const cited = [...claude.matchAll(/\.claude\/rules\/([A-Za-z0-9._-]+\.md)/g)].map(m => m[1]);
  for (const c of new Set(cited)) {
    assert.ok(
      fs.existsSync(path.join(RULES_DIR, c)),
      `CLAUDE.md points at .claude/rules/${c}, which does not exist.`
    );
  }
  assert.ok(
    claude.includes('docs/rules/process.md') && fs.existsSync(PROCESS_DOC),
    'CLAUDE.md must point at docs/rules/process.md and it must exist'
  );
});

test('5. the reviewer definition is in the repo and pins a model', () => {
  const p = path.join(ROOT, '.claude', 'agents', 'code-review.md');
  assert.ok(
    fs.existsSync(p),
    'the code-review agent is the only second reader this project has. Outside ' +
    'the repo, a fresh clone gets the rules and not the reviewer - gap E4.'
  );
  const text = read(p);
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(fm, '.claude/agents/code-review.md has no frontmatter');
  assert.match(
    fm[1], /^model:\s*\S+/m,
    'the reviewer must pin a model. CLAUDE.md requires a reviewer on a ' +
    'different model from the one running the batch, and unpinned it inherits ' +
    'the batch\'s - a model reviewing its own work is not a second reader.'
  );
});
