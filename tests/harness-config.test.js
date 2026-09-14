/*
 * harness-config.test.js — the settings that decide what runs, and what a session may reach.
 *
 * WHY THIS FILE EXISTS (batch 263). The 12 Sep 2026 standards audit's finding was not any one of
 * its twelve EzPlate gaps: it was that ELEVEN OF THE TWELVE HAD NO DETECTOR. Every one of them was
 * a fact about a config file that no test read, so the only thing that could notice a regression
 * was somebody opening the file for another reason. This repo acts on tests and not on prose, and
 * four of those gaps are closed by settings that a single careless edit puts back.
 *
 * So these are conditions on the harness itself, in the same spirit as ci-workflow.test.js: each
 * pins a decision with a consequence, and none of them cares where in its file the setting lives.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

test('the pre-push gate installs itself on npm install', () => {
  // E9: hooks are not carried by git, so a fresh clone ran NO gate and looked exactly like a clone
  // that had passed one. `prepare` runs on `npm install`, which is the one command every clone runs.
  const prepare = readJson('package.json').scripts.prepare;
  assert.ok(prepare, 'package.json needs a prepare script, or a fresh clone silently runs no gate');
  assert.match(prepare, /core\.hooksPath\s+\.githooks/, 'prepare must point core.hooksPath at .githooks');
  assert.ok(fs.existsSync(path.join(ROOT, '.githooks', 'pre-push')), 'the hook it points at must exist');
});

test('the default MCP config reaches staging and nothing else', () => {
  // E1, and it is the one on this list that can cost the cafe money. The production project was
  // connected in every session by default while the disposable staging rehearsal prompted.
  // Production now lives in .mcp.production.json, which is loaded only by
  // `claude --mcp-config .mcp.production.json`. Equality, not "does not contain": a denylist here
  // is a guess about every wrong value there could be (CLAUDE.md, roster entry 190).
  assert.deepStrictEqual(
    Object.keys(readJson('.mcp.json').mcpServers),
    ['supabase-staging'],
    'the auto-loaded config must carry staging alone',
  );
  assert.deepStrictEqual(
    Object.keys(readJson('.mcp.production.json').mcpServers),
    ['supabase'],
    'production keeps the name `supabase`, so every mcp__supabase__* reference in the migrations still reads correctly',
  );
});

test('the post-edit hook is filtered and bounded', () => {
  // E2: it used to run the whole suite after every Edit and Write, with no path filter, no timeout
  // and the wrong concurrency. A hang in a hook hangs the session, and `node --test` has no default
  // timeout - CLAUDE.md: a hang is a third outcome and nothing in this toolchain calls it a failure.
  const entries = readJson('.claude/settings.json').hooks.PostToolUse;
  assert.strictEqual(entries.length, 1, 'one PostToolUse entry, or the assertions below describe half the config');
  const hooks = entries[0].hooks;
  assert.strictEqual(hooks.length, 1, 'one command');
  assert.match(hooks[0].command, /tools\/post-edit-tests\.js/, 'the filter must be the thing that runs');
  assert.strictEqual(typeof hooks[0].timeout, 'number', 'an unbounded hook can hang the session');
  assert.ok(hooks[0].timeout <= 300, 'the bound has to be shorter than a person\'s patience');
});

test('the hook decides from the path, and asks the real function', () => {
  // The REAL exported function, not a copy of its rules: a stub written from the same belief as the
  // code agrees with it whether or not the code is right.
  const { affectsSuite } = require('../tools/post-edit-tests.js');
  for (const p of ['docs/QUEUE.md', 'CLAUDE.md', 'docs/handovers/HANDOVER-262-one-verb-per-intent.md', 'skills/verify/SKILL.md', 'README.md']) {
    assert.strictEqual(affectsSuite(p), false, `${p} cannot break the suite and must not fire it`);
  }
  for (const p of ['js/app.js', 'css/style.css', 'index.html', 'sw.js', 'tests/smoke.js', 'tests/harness-config.test.js', 'api/insight.js']) {
    assert.strictEqual(affectsSuite(p), true, `${p} can break the suite and must fire it`);
  }
  // tests/visual/ is Playwright, which this hook has never run and must not start running.
  assert.strictEqual(affectsSuite('tests/visual/v141-sync-corner.spec.js'), false, 'a browser spec must not fire the unit suite');
});

test('a docs edit runs nothing, end to end', () => {
  // The unit assertions above prove the mapping; this proves the plumbing around it - stdin parsing,
  // the path coming out of tool_input, and the silence. Deleting the filter turns this red by
  // TIMING OUT rather than by failing, which is why the timeout is explicit and short.
  const payload = JSON.stringify({ hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_input: { file_path: path.join(ROOT, 'docs/QUEUE.md') } });
  const run = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'post-edit-tests.js')], { input: payload, encoding: 'utf8', timeout: 20000 });
  assert.strictEqual(run.status, 0, 'a docs edit must exit clean');
  assert.strictEqual((run.stdout || '').trim(), '', 'and say nothing at all');
});

test('no duplicate " 2" test files', () => {
  // E10: three `*.test 2.js` files sat in tests/ for months. `npm test` globs `tests/*.test.js`, so
  // a Finder-duplicated copy is run by NOTHING while reading exactly like a test that runs - and it
  // is a copy of a real test, so it also reads as coverage. They are gone; this is what keeps them gone.
  const strays = fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => / \d+\.(js|json|mjs|cjs)$/.test(f));
  assert.deepStrictEqual(strays, [], 'a duplicated file in tests/ is run by nothing and reads as coverage');
});

test('the vendored agent skills are tracked, not ignored', () => {
  // E4: `.agents/` and `skills-lock.json` were gitignored, so the Supabase RLS material the
  // migration work reads existed on one laptop and in no clone. The lock file is the half that says
  // which version is checked out, so ignoring it made the pair unverifiable in both directions.
  const lines = read('.gitignore').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  assert.ok(!lines.includes('.agents/'), '.agents/ must not be ignored');
  assert.ok(!lines.includes('skills-lock.json'), 'skills-lock.json must not be ignored');
  assert.ok(fs.existsSync(path.join(ROOT, '.agents', 'skills')), 'and the material itself must be present');
  // Committed AND off the deployed origin: Vercel serves this repo's root.
  const vercel = read('.vercelignore').split('\n').map((l) => l.trim());
  for (const p of ['.agents/', 'skills-lock.json', '.mcp.json', '.mcp.production.json', 'tools/']) {
    assert.ok(vercel.includes(p), `${p} is tracked, so .vercelignore must keep it off the origin`);
  }
});
