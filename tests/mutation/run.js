#!/usr/bin/env node
/*
 * run.js — the mutation GATE.
 *
 * For each target function it flips one operator (or deletes one call) in js/app.js, runs ONLY the
 * test files that claim to pin that function, and asks whether they went red. A mutant that survives
 * means those tests would still pass with the guard broken — the defect class this project has
 * shipped ten times.
 *
 * WHY IT RUNS THE DECLARED TESTS RATHER THAN THE WHOLE SUITE. Two reasons, and the second is the
 * real one. It is faster (0.1s per mutant instead of 2.4s), and it answers the question that is
 * actually useful at push time: not "does something somewhere notice" but "does the test file whose
 * name says it pins this actually pin it". A mutant killed only by an unrelated test file is a test
 * file that will be deleted one day by someone who does not know it was load-bearing.
 *
 * NOTHING IN THE WORKING TREE IS EVER MUTATED. The mutation happens in a throwaway copy under the
 * OS temp directory — outside the repo entirely, so a crash cannot leave a mutated js/app.js on disk
 * where a batch might commit it, and there is no ignore rule to forget.
 *
 * Usage:
 *   node tests/mutation/run.js              every target
 *   node tests/mutation/run.js --changed    only targets whose code or tests changed vs origin/main
 *   node tests/mutation/run.js --target=publishPlan,productRefs
 *
 * Exit 0 = every mutant killed, or survived with a written allowance in targets.js.
 * Exit 1 = a survivor with no allowance, a stale allowance, or a red baseline.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { mutantsFor, apply } = require('./mutate');
const { extractFn } = require('../_extractfn');

const REPO = path.resolve(__dirname, '..', '..');
const TMP = path.join(os.tmpdir(), 'ezplate-mutation');

const SKIP_COPY = new Set(['.git', 'node_modules', 'playwright-report', 'test-results', 'docs', 'skills', '.claude', '.DS_Store']);

/** A disposable copy of the tree the tests run against. Rebuilt every run so it can never go stale. */
function buildSandbox(root, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(root, dest, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(root, src);
      if (!rel) return true;
      const first = rel.split(path.sep)[0];
      if (SKIP_COPY.has(first)) return false;
      if (rel === path.join('tests', 'visual')) return false;   // 19MB of screenshots the unit suite never opens
      return true;
    },
  });
}

/*
 * Run the declared test files in the sandbox. Exit code is the whole verdict: 0 = the mutant lived.
 *
 * NODE_TEST_CONTEXT is deleted deliberately, and it is not a tidy-up. `node --test` sets it on the
 * child processes it spawns, and any node process that sees it behaves as a test CHILD: it serialises
 * its results to the parent and stops reporting failure through its own exit status. Since
 * tests/mutation-gate.test.js drives this function from inside `node --test`, the variable is present
 * there, and with it inherited every single mutant came back status 0 — a gate reporting a perfect
 * score while checking nothing. Caught by the gate's own self-test, which is what it is for.
 */
function runTests(sandbox, testDir, files, timeoutMs) {
  const args = ['--test'].concat(files.map((f) => path.join(testDir, f)));
  const env = Object.assign({}, process.env);
  delete env.NODE_TEST_CONTEXT;
  const opts = { cwd: sandbox, encoding: 'utf8', env };
  if (timeoutMs) { opts.timeout = timeoutMs; opts.killSignal = 'SIGKILL'; }
  /*
   * ⚠️ `detached` AND THE NEGATIVE PID ARE ONE MECHANISM, AND WITHOUT THEM THIS FUNCTION LEAKS A
   * PERMANENTLY SPINNING PROCESS EVERY TIME IT TIMES OUT.
   *
   * `node --test` runs each test FILE in a child process of its own. The `killSignal` above is
   * SIGKILL, which cannot be caught — so when the timeout fires, the `node --test` parent dies
   * without ever tearing its workers down, and they are reparented to launchd and keep running.
   * Measured, not reasoned: parent killed, child alive with PPID 1, still executing its test.
   *
   * It is not a rare path. `tests/mutation-gate.test.js` runs two DELIBERATELY non-terminating
   * mutants to prove a hang is classified as a kill, and that file is part of `npm test` — so
   * before this, every single run of the suite left four node processes spinning at full CPU
   * forever. They page out to ~10MB resident against multi-GB of swap, which is what makes them
   * invisible in a process list and lethal over an afternoon: 8GB machine, ~40 orphans, 18.66GB
   * of swap, out of application memory. Introduced by batch 201's fix for the gate HANGING, which
   * is worth stating plainly — the bound was right and it swapped one unbounded resource for
   * another.
   *
   * `detached:true` makes the child a process-group leader; `process.kill(-pid)` then signals the
   * whole group, workers included. spawnSync's own timeout only ever signals the single pid, which
   * is why this second kill is here rather than being left to it. It runs unconditionally: the
   * group is already gone on the ordinary path, so the EPERM/ESRCH is expected and swallowed.
   *
   * ⚠️ `--test-isolation=none` also fixes the leak and was REJECTED on evidence: it removes the
   * child processes entirely, and it turns this gate's own self-test RED, so it changes semantics
   * the gate depends on. Do not reach for it as the tidier option.
   */
  opts.detached = true;
  const r = spawnSync(process.execPath, args, opts);
  const timedOut = !!(r.error && r.error.code === 'ETIMEDOUT');
  /* ⚠️ SCOPED TO THE TIMEOUT PATH, AND THE FIRST VERSION WAS NOT — caught by the pre-push review.
     A pgid is free for the OS to reuse the moment its last member exits, which on the ordinary path
     is the instant spawnSync returns; nothing here can check that the group still belongs to the
     child we spawned. So an unconditional kill is a signal aimed at a recycled group id, hundreds of
     times per run, on a box this same script is churning pids on — and a WRONG kill that succeeds
     raises nothing, so it would be indistinguishable from the no-op it was assumed to be.
     Measured before narrowing it: across 37 mutants the unconditional call succeeded ZERO times and
     threw "already gone" 37 times. It buys nothing off the timeout path, where the SIGKILLed parent
     really can leave workers behind, so that is the only place it now runs. */
  if (timedOut && r.pid) { try { process.kill(-r.pid, 'SIGKILL'); } catch (e) { /* already reaped */ } }
  /* A TIMED-OUT CHILD IS A THIRD OUTCOME AND spawnSync REPORTS IT AS status null, WHICH IS NOT 0.
     Reading only `status === 0` would therefore call it killed and move on, which is nearly right
     and hides the interesting half. See the note at the call site.
     ⚠️ KEYED ON ETIMEDOUT ALONE, and the first draft also accepted `status === null && signal != null`
     — which is EVERY signal-killed child, not just one this function killed. Measured:
       timeout      -> status null, signal SIGKILL, error.code ETIMEDOUT
       self-SIGKILL -> status null, signal SIGKILL, error undefined
     so the broad form reported an OOM kill, a native abort or a CI cancellation as a hang. Both
     still count as killed, so nothing would have gone green that should not — it would have put the
     wrong CAUSE in the report, which is how someone spends an afternoon looking for a loop that was
     never there. Found by the pre-push review. */
  return { ok: r.status === 0, timedOut: timedOut, out: (r.stdout || '') + (r.stderr || '') };
}

/* HOW LONG ONE MUTANT MAY TAKE BEFORE IT IS CALLED STUCK. Extracted so it can be pinned without a
   test having to sit through it: the self-test passes `mutantMs` explicitly to stay fast, which
   means the derived path would otherwise be exercised by nothing and could be broken to 0 — putting
   the hang back on every real run — with the whole suite still green. Found by mutating it.
   Ten times the baseline, so it cannot rot as the suite grows, floored at five seconds for the case
   where the baseline is too fast to measure. Anything slower than that is not slow, it is stuck. */
function mutantBudgetMs(baselineMs) {
  const n = Number(baselineMs);
  return Math.max(5000, (isFinite(n) && n > 0 ? n : 0) * 10);
}

/** Files changed against origin/main, committed and not. Empty array if git cannot answer. */
function changedFiles() {
  try {
    const base = execFileSync('git', ['merge-base', 'HEAD', 'origin/main'], { cwd: REPO, encoding: 'utf8' }).trim();
    const committed = execFileSync('git', ['diff', '--name-only', base, 'HEAD'], { cwd: REPO, encoding: 'utf8' });
    const working = execFileSync('git', ['diff', '--name-only', 'HEAD'], { cwd: REPO, encoding: 'utf8' });
    const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: REPO, encoding: 'utf8' });
    return { base, files: new Set((committed + working + untracked).split('\n').filter(Boolean)) };
  } catch (e) {
    return null;
  }
}

/** The line ranges touched in `file`, so a target is only re-mutated when its own body moved. */
function changedLines(base, file) {
  const ranges = [];
  try {
    const diff = execFileSync('git', ['diff', '-U0', base, '--', file], { cwd: REPO, encoding: 'utf8' })
      + execFileSync('git', ['diff', '-U0', 'HEAD', '--', file], { cwd: REPO, encoding: 'utf8' });
    for (const m of diff.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
      const start = Number(m[1]);
      const len = m[2] === undefined ? 1 : Number(m[2]);
      if (len > 0) ranges.push([start, start + len - 1]);
    }
  } catch (e) { /* fall through: no ranges means "treat the file as wholly changed" upstream */ }
  return ranges;
}

function lineOf(src, offset) { return src.slice(0, offset).split('\n').length; }

/**
 * The run.
 * cfg = { root, appRel, testDir, targets, allow, only }
 */
function mutationRun(cfg, log) {
  const say = log || ((s) => process.stdout.write(s + '\n'));
  const appPath = path.join(cfg.root, cfg.appRel);
  const src = fs.readFileSync(appPath, 'utf8');

  const plan = [];
  for (const t of cfg.targets) {
    if (cfg.only && !cfg.only.has(t.fn)) continue;
    const fnSrc = extractFn(src, t.fn);
    const base = src.indexOf(fnSrc);
    if (base < 0) throw new Error(`mutation: could not locate ${t.fn} in ${cfg.appRel}`);
    plan.push({ target: t, base, fnSrc, mutants: mutantsFor(fnSrc, base, t.fn) });
  }
  if (!plan.length) return { ran: 0, killed: 0, survivors: [], allowed: [], stale: [], baselineOk: true };

  /* The pid is in the directory name so two runs cannot share one sandbox. They otherwise would:
     the pre-push hook, a manual `npm run mutate` and the gate's own self-test all name the same tree,
     and one clobbering another's mutant is a wrong verdict rather than a crash. */
  const sandbox = path.join(TMP, `${cfg.sandboxName}-${process.pid}`);
  buildSandbox(cfg.root, sandbox);
  const sandboxApp = path.join(sandbox, cfg.appRel);

  try {
  // BASELINE. Without this the gate is vacuous in the worst way: a broken sandbox fails every test
  // file, every mutant reads as killed, and the gate reports a perfect score while checking nothing.
  const allTests = [...new Set(plan.flatMap((p) => p.target.tests))];
  const baselineStart = Date.now();
  /* ⚠️ THE BASELINE NEEDS ITS OWN BOUND AND CANNOT DERIVE ONE, which is the whole reason this is a
     separate constant rather than a tidier reuse of mutantBudgetMs. The per-mutant limit is ten
     times how long the baseline took — so it does not exist until the baseline has already returned,
     and a baseline that never returns is exactly the case that needs bounding.
     The first version of this fix bounded every mutant and left this call with no `timeoutMs` at
     all, so a genuinely hanging TEST FILE (a real bug in the test, not a mutation) still wedged the
     gate forever — the identical failure this whole change exists to remove, on the one path that
     runs first every single time. Caught by the pre-push review, which reproduced it.
     BASELINE_MS is absolute because there is nothing to scale it against. Measured: the union of all
     31 declared test files runs in 4.3s, so three minutes is forty times headroom and still finite. */
  const BASELINE_MS = cfg.baselineMs || 180000;
  const baseline = runTests(sandbox, cfg.testDir, allTests, BASELINE_MS);
  /* ⚠️ THE PER-MUTANT TIME LIMIT, AND WHY THE GATE NEEDED ONE BEFORE IT COULD BE POINTED AT THE
     PRICING CODE AT ALL. spawnSync had no `timeout`, and `node --test` has no default timeout of its
     own — so a mutant that turns a loop condition into a non-terminating one hung the gate FOREVER.
     Not red, not green: no output at all, indistinguishable from a slow run, and in CI
     indistinguishable from a stuck runner. That is CLAUDE.md's 195 lesson arriving inside the tool
     written to enforce it. Measured, not reasoned: `computeInsights` (118 mutants, 156 lines, its two
     test files running in 0.15s clean) ran past TEN MINUTES and produced nothing.
     The bound is derived from the baseline rather than hardcoded, so it cannot rot as the suite
     grows: ten times what all of these files take together, floored at five seconds for the case
     where the baseline is too fast to measure. Anything slower than that is not slow, it is stuck. */
  const MUTANT_MS = cfg.mutantMs || mutantBudgetMs(Date.now() - baselineStart);
  if (baseline.timedOut) {
    say(`MUTATION BASELINE TIMED OUT after ${BASELINE_MS}ms — one of the declared test files hangs before any mutation `
      + `was applied, so this is a bug in a TEST rather than a finding about the code. Gate cannot report. Files: ${allTests.join(', ')}`);
    return { ran: 0, killed: 0, survivors: [], allowed: [], timedOut: [], stale: [], baselineOk: false };
  }
  if (!baseline.ok) {
    say('MUTATION BASELINE RED — the declared test files fail before any mutation. Gate cannot report.');
    say(baseline.out.split('\n').slice(-25).join('\n'));
    return { ran: 0, killed: 0, survivors: [], allowed: [], timedOut: [], stale: [], baselineOk: false };
  }

  const allowByKey = new Map((cfg.allow || []).map((a) => [a.key, a]));
  const seenAllowed = new Set();
  const survivors = [];
  const allowed = [];
  const timedOut = [];
  let ran = 0, killed = 0;
  const started = Date.now();

  for (const p of plan) {
    for (const m of p.mutants) {
      const mutated = apply(src, m, 'at');
      fs.writeFileSync(sandboxApp, mutated);
      /* Read it BACK before trusting the verdict. A mutant that never reached disk runs the tests
         against pristine code, they pass, and the gate reports "survived" — a finding that is not a
         finding, in a tool whose entire output is findings. This is the cheapest possible guard
         against every way that can happen (a stale sandbox, a failed write, a second run of this
         script clobbering the same directory) and it turns all of them into a loud stop instead of a
         plausible-looking report. */
      if (fs.readFileSync(sandboxApp, 'utf8') !== mutated) {
        throw new Error(`mutation: the sandbox copy of ${cfg.appRel} does not hold the mutant (${m.key}). `
          + 'Refusing to report a verdict from an unmutated file.');
      }
      const r = runTests(sandbox, cfg.testDir, p.target.tests, MUTANT_MS);
      ran++;
      const rec = {
        key: m.key,
        fn: m.fn,
        op: m.op,
        from: m.from.length > 60 ? m.from.slice(0, 57) + '…' : m.from,
        to: m.to || '(deleted)',
        srcLine: lineOf(src, m.at),
        line: m.line,
        tests: p.target.tests,
      };
      if (r.timedOut) {
        /* KILLED, and listed separately rather than folded in. The mutant WAS detected — the suite
           did not pass — so calling it a survivor would send someone to write a test for a defect
           that is already caught, which is the worst thing this tool can do. But it was detected by
           hanging, and a test file that hangs instead of failing is its own finding: in CI that is a
           stuck job, not a red one. Naming these keeps both facts. */
        killed++;
        timedOut.push(rec);
        if (allowByKey.has(m.key)) seenAllowed.add(m.key);
      } else if (r.ok) {
        const a = allowByKey.get(m.key);
        if (a) { seenAllowed.add(m.key); allowed.push(Object.assign({ reason: a.reason }, rec)); }
        else survivors.push(rec);
      } else {
        killed++;
        if (allowByKey.has(m.key)) seenAllowed.add(m.key);   // allowance now unnecessary — reported stale
      }
    }
  }
  const ranFns = new Set(plan.map((p) => p.target.fn));
  const stale = (cfg.allow || []).filter((a) => {
    const fn = a.key.split(' :: ')[0];
    if (!ranFns.has(fn)) return false;
    if (!seenAllowed.has(a.key)) return true;               // the mutant no longer exists at all
    return allowed.every((x) => x.key !== a.key);           // it exists and is now killed
  });

  return { ran, killed, survivors, allowed, timedOut, stale, mutantMs: MUTANT_MS, baselineOk: true, ms: Date.now() - started };
  } finally {
    /* The run owns this directory, and it is removed on EVERY exit — the normal one, the red-baseline
       early return, and the readback-mismatch throw. The early return is the one that was leaking:
       a repeatedly red baseline is exactly the situation where someone runs this over and over. */
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

function report(res, say) {
  if (!res.baselineOk) return 1;
  if (!res.ran) { say('mutation gate: nothing in scope — no targeted function or its tests changed.'); return 0; }
  const to = (res.timedOut || []).length;
  say(`mutation gate: ${res.ran} mutants, ${res.killed} killed, ${res.survivors.length + res.allowed.length} survived `
    + `(${res.allowed.length} with a written allowance)${to ? `, ${to} killed BY TIMEOUT` : ''} in ${(res.ms / 1000).toFixed(1)}s`);
  /* Named, never silent. These are counted as killed and they are not ordinary kills: the mutant made
     the declared tests HANG rather than fail, which in CI is a stuck job rather than a red one.
     Folding them into the tally would hide that those files have no timeout of their own. */
  for (const t of (res.timedOut || [])) {
    say(`  TIMED OUT (counted as killed)  ${t.fn}  js/app.js:${t.srcLine}   ${t.op}: ${t.from} -> ${t.to}`);
  }
  for (const s of res.survivors) {
    say('');
    say(`  SURVIVED  ${s.fn}  js/app.js:${s.srcLine}`);
    say(`    ${s.op}: ${s.from}  ->  ${s.to}`);
    say(`    ${s.line}`);
    say(`    not caught by: ${s.tests.join(', ')}`);
    say(`    key: ${s.key}`);
  }
  for (const s of res.stale) {
    say('');
    say(`  STALE ALLOWANCE  ${s.key}`);
    say('    This mutant is now killed, or no longer exists. Delete the allowance from tests/mutation/targets.js.');
  }
  if (res.survivors.length) {
    say('');
    say('Each survivor is a test that would still pass with that line broken. Kill it with an assertion,');
    say('or add it to allowedSurvivors in tests/mutation/targets.js with a reason someone can disagree with.');
  }
  return (res.survivors.length || res.stale.length) ? 1 : 0;
}

function main(argv) {
  const { targets, allowedSurvivors } = require('./targets');
  const only = (() => {
    const arg = argv.find((a) => a.startsWith('--target='));
    if (arg) return new Set(arg.slice('--target='.length).split(',').filter(Boolean));
    if (!argv.includes('--changed')) return null;
    const ch = changedFiles();
    if (!ch) { process.stdout.write('mutation gate: git unavailable, running every target\n'); return null; }
    const appChanged = ch.files.has('js/app.js');
    const ranges = appChanged ? changedLines(ch.base, 'js/app.js') : [];
    const src = fs.readFileSync(path.join(REPO, 'js', 'app.js'), 'utf8');
    const picked = new Set();
    for (const t of targets) {
      if (t.tests.some((f) => ch.files.has(`tests/${f}`))) { picked.add(t.fn); continue; }
      if (!appChanged) continue;
      const fnSrc = extractFn(src, t.fn);
      const at = src.indexOf(fnSrc);
      const from = lineOf(src, at), to = from + fnSrc.split('\n').length - 1;
      // No parseable hunks (a rename, a mode change) means we cannot prove the body is untouched.
      if (!ranges.length || ranges.some(([a, b]) => a <= to && b >= from)) picked.add(t.fn);
    }
    return picked;
  })();

  const res = mutationRun({
    root: REPO,
    appRel: path.join('js', 'app.js'),
    testDir: 'tests',
    sandboxName: 'app',
    targets,
    allow: allowedSurvivors,
    only,
  });
  process.exit(report(res, (s) => process.stdout.write(s + '\n')));
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { mutationRun, report, buildSandbox, runTests, mutantBudgetMs };
