# REVIEW-263 — the safety batch

Reviewed-commit: f965ca4
Model: Sonnet (the batch ran as Opus 5, so the reviewer is a different model, per `CLAUDE.md`)
Brief: not shown to the reviewer. It was given the diff and the repo, and asked whether the code is correct.

The report is pasted below as it came back. Two findings were fixed in this branch; the third group was nits, disposed of individually.

---

## Findings

**1. `affectsSuite()`'s path filter misses exactly the files this batch itself makes safety-critical — major, confidence high, verified by execution.**

`tools/post-edit-tests.js:40-47` only fires for `tests/`, `api/`, `js/`, `css/`, `index.html`, `sw.js`, `package.json`. I ran the real exported function against the config files this very diff cares about:

```
.claude/settings.json       -> false
.mcp.json                   -> false
.mcp.production.json        -> false
.gitignore                  -> false
.vercelignore               -> false
.github/workflows/test.yml  -> false
supabase/migrations/*.sql   -> false
tools/post-edit-tests.js    -> false   (editing the hook itself)
```

Yet all of these are asserted on directly by tests introduced or already present in the suite:
- `tests/harness-config.test.js` reads `.mcp.json`, `.mcp.production.json`, `.claude/settings.json`, `.gitignore`, `.vercelignore` and `package.json`.
- `tests/ci-workflow.test.js` reads `.github/workflows/test.yml`.
- `tests/business-id.test.js` and `tests/cafe-create.test.js` read `supabase/migrations/*.sql` by name (the exact "pin the behaviour to whichever migration LAST defines the thing" pattern CLAUDE.md already warns rotted once, in `restore_backup` v5).

So an edit to `.mcp.json` that accidentally re-adds the production server, or an edit to `.claude/settings.json` that drops the hook's timeout, or an edit to a migration file that breaks `tests/cafe-create.test.js`'s grant assertions, all get **silent exit 0** from the tool whose entire stated purpose is "decide from the edited path whether anything could have broken" — the one class of file this "safety batch" (production-access control, migration correctness) is actually about. `tests/harness-config.test.js`'s own path-mapping test (`:67-75`) doesn't exercise any of these paths either, so the test suite added to guard this exact defect class can't see the gap.

This doesn't compromise the real gates — `.githooks/pre-push` runs full `npm test` regardless of path, and CI's `unit`/`smoke` jobs "run on everything, always" per `.github/workflows/test.yml`'s own comment — so nothing merges broken. But it means the fast local signal this batch built goes quiet on precisely the edits where fast local feedback matters most, and it does so by the same shape CLAUDE.md names repeatedly: "a check that finds nothing has only proved something about what it looked for."

**2. The "12 Sep 2026 standards audit" that motivates the whole batch is cited five times and recorded nowhere — minor, confidence high on the observation.**

`tools/post-edit-tests.js:6`, `tests/harness-config.test.js:4-8`, `docs/STAGING.md:27`, `CLAUDE.md:910` and `.gitignore:6` all attribute their changes to "the 12 Sep 2026 standards audit," and `tests/harness-config.test.js` says outright it found "twelve EzPlate gaps." This diff names and closes five of them by ID (E1, E2, E4, E9, E10). I checked `docs/audits/`, `docs/MAINTENANCE.md`, and grepped the whole repo for "standards audit" / "gap E" — there is no file recording what the audit examined, when it ran in full, or what E3/E5/E6/E7/E8/E11/E12 were. If those seven are real and unaddressed, nothing tracks them as outstanding (the exact "standing check needs an expiry" / done-mark discipline CLAUDE.md's AUDIT-v197 section already had to name once). If they were already fine, that disposition is also unrecorded. Either way, a future reader — including the `project-audit` agent, which checks documented claims against the code — has nothing to check this audit's completeness against.

**3. Minor/nit items, not blocking:**
- `tools/post-edit-tests.js:89` spawns `npm` without `shell:true`; on Windows this would ENOENT rather than run, but it's caught by the `run.error` branch (reported as a failure, not a crash) and this is a single-user macOS project, so low priority.
- The BOUND_MS timeout (110s) plus the subsequent reap call's own bound (`readPs`'s `execFileSync` timeout of 10s in `tests/preflight-processes.js:60`) can together approach the hook's configured 120s ceiling in the worst case; not a hang, just a thin margin.
- `package.json`'s `prepare` script (`git config core.hooksPath .githooks || true`) is correctly safe when git or `.git` is absent — verified `spawnSync`/shell semantics; `run.error.code === 'ETIMEDOUT'` was verified to actually fire on a real timed-out `spawnSync` in this Node version, so that mechanism is sound.

**No findings** on: `.mcp.json`/`.mcp.production.json` content (no token, consistent with CLAUDE.md's "project refs and no token" claim); `.vercelignore`/`.gitignore` coverage of the newly-tracked `.agents/`, `skills-lock.json`, `.mcp.production.json`, `tools/` (verified all four are listed and none are servable from the Vercel origin); the prose edits to `docs/STAGING.md`, `CLAUDE.md`, `skills/verify/SKILL.md`, `skills/handover/SKILL.md` (checked for contradictions against the rest of the repo — found none, and the stale-figure corrections they make are themselves verified true: `npm test` is 2248 tests / ~84s here, not "about a second"). Full suite run clean at 2248/2248 after review, no orphaned test workers left behind.

---

## Disposition

**1 — FIXED, and it was the right finding.** The filter was written from "which files are the app" rather than from "what does the suite read", which is the same mistake in a new place: a check that finds nothing has only proved something about what it looked for. `affectsSuite` now derives its list from what the test files open — `tools/`, `supabase/`, `.github/`, `.githooks/`, `.agents/`, `.claude/` as directories, and `.mcp.json`, `.mcp.production.json`, `.gitignore`, `.vercelignore`, `package.json` by name. `docs/` stays excluded by default (it is the 46-second cost the hook exists to remove) with the two files `tests/queue-routing.test.js` actually reads named explicitly, and both halves of that carve-out are pinned. The eleven paths the reviewer listed are now assertions in `tests/harness-config.test.js`, and restoring the narrow filter turns them red — run and confirmed, with the mutation diffed against a backup first.

**2 — FIXED.** `docs/MAINTENANCE.md` now carries all twelve gaps with an owner and a status against each, and says outright that the audit itself lives outside this repository. The prose of the audit is not copied; what is outstanding is. The reviewer is right that the alternative was a batch citing an authority nobody inside the repo could check.

**3 — one fixed, two recorded and not fixed.**
- The timeout margin is real: `BOUND_MS` is now 90s against the hook's 120s ceiling, which leaves room for the reaper's own 10s bound.
- `shell:true` for `npm` on Windows: not fixed. This repo is macOS and Linux CI only, the failure is caught and reported rather than silent, and adding a shell to a spawn is a real widening for a platform nobody runs.
- The reviewer independently verified `ETIMEDOUT` fires and that `prepare` is safe without git. Both were the two mechanisms this batch had the least evidence for, and they are the two it now has the most.
