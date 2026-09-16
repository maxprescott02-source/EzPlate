# REVIEW - 276 (sync-banner-builder-bar)

Reviewed-commit: 02a37c6

**Agent:** the `code-review` agent, on **Sonnet**, overriding the definition's `opus` pin because this batch ran on Opus.
`CLAUDE.md` requires a different model from the batch, and only the batch knows which model it is.
It was given `git diff main...HEAD` and nothing about the queue item.

**Outcome: NO FINDINGS at severity.** Two nits, both below its own reporting bar; one was acted on anyway and the reason is below.

It did not review by reading alone. It ran the unit suite and then wrote five ad hoc Playwright probes covering states, widths and heights the shipped specs do not reach, and deleted them afterwards.

---

## The report, verbatim

I've done a thorough adversarial pass: read the full diff plus the CSS/JS it calls into and is called from, ran the full unit suite (2382 tests, all green), and then went beyond the repo's own coverage with five ad hoc Playwright probes (deleted afterward, working tree confirmed clean) exercising states, widths, and heights the shipped specs don't hit directly — all states (`loading`/`saving`/`offline`/`error`/`ok`) across widths 1024/1060/1080/1099 and heights 700–1000, the install-banner-shown case against `.bld-bar` directly, a tab-change mid-error-toast race, and the `'ok'` 1400ms auto-hide path. None produced a collision or a stale value.

**Finding: none at severity-worthy levels (categories 1–4 in the priority order).**

What I checked and why it holds up:

- **The chain order** (`publishBldBarClear` sets `--bld-bar-clear` then unconditionally calls `publishSyncBannerClear`, which reads the just-updated var via `getComputedStyle`) is correct: `document.documentElement.style.setProperty` plus a forced `getBoundingClientRect()`/`getComputedStyle()` read is synchronous, so there's no staleness window.
- **The `transform!=='none'` discriminator** in `publishSyncBannerClear` (js/app.js:11068-11075) is the fixed version of a documented earlier bug (`top!=='auto'`, always true). I verified the current check is correct at every breakpoint that touches `.sync-banner`'s `transform` (base rule, the 640-1023 tablet override, the >=1024 corner rule) — nothing else in the stylesheet sets `transform` on that selector.
- **All four `setSync` exit paths** (`'none'`, the `'ok'` auto-hide timeout, and the unconditional call at the end covering `loading`/`saving`/`offline`/`error`) republish. `tests/tenant-gate.test.js`'s new assertion pins the hide-then-show order for two of them; I confirmed the third (the `'ok'` 1400ms timeout) empirically since no unit test exercises it directly.
- **No recursion**: `publishSyncBannerClear` never writes anything `publishBldBarClear` reads, so the one-directional chain can't loop.
- **`.bld-bar` vs `.install-banner`** (a collision I suspected wasn't covered by the new tests, since the Playwright spec only asserts `syncVsInstall`/`toastVsInstall` and never `barVsInstall`) — measured directly: `html.has-install-banner .bld-bar{bottom:var(--install-banner-clear)}` (pre-existing, from 226) already lifts the bar clear of the banner whenever both are shown, at 1024/1080/1099. Not a live bug, just an assertion the new spec happens not to state.
- All six cache-version spots agree (v225 throughout).

**Two nits, well below the reporting bar but worth naming:**
- `docs/QUEUE.md` item 97 is left at `## doing` rather than struck, and `docs/STATE.json`'s `"batch"` still reads 275 against a `276:` commit message. Almost certainly just pre-handover state (code-review runs before the handover step that would fix this), not a defect.
- The shipped Playwright four-way spec (`tests/visual/v141-sync-corner.spec.js`) only exercises the `'error'` sync state in the builder-bar interaction; `'offline'` and the transient states aren't asserted there. I confirmed by direct reproduction that none of them collide, so this is a coverage gap that happens not to hide a bug, not a live one.

Files inspected: `js/app.js` (lines 319-340, 2651-2660, 10998-11146), `css/style.css` (lines 400-467, 1000-1300, 1870-1970, 2620-2745), `tests/toast-bottom-stack.test.js`, `tests/tenant-gate.test.js`, `tests/visual/v141-sync-corner.spec.js`, `tests/visual/226-bottom-stack.spec.js`, `tests/mutation/targets.js`, `docs/QUEUE.md`, `docs/STATE.json`.

---

## Decisions

### Nit 1 (`doing` status, STATE.json batch) — NO ACTION, and the reviewer's own reading is right.
Both are rewritten in the handover commit, which is the step after this one. `node tools/state.js` derives `batch` from the newest handover, so it cannot read 276 until the handover exists.

### Nit 2 (only `'error'` asserted) — ACTED ON, below its reporting bar, because this file's own header is the argument.
`v141-sync-corner.spec.js` opens with *"THE STATES ARE THE POINT... testing 'ok' alone is how this stayed invisible"*, and names **both** non-dismissing states with their widths (offline 230, error 273).
A new test in that file asserting only the wider one is that file's own recorded mistake in miniature, even though the reviewer measured that the narrower one does not collide.
The four-way block is now parameterised over `['error', 'offline']`: 20 cases to 28, all green.
**The nit is not that a bug is hiding there. It is that the assertion assumed the narrower state cannot fail differently, which is exactly what the file was written to stop anyone assuming.**

### The `barVsInstall` observation — NO ACTION, recorded rather than added.
The reviewer went looking for a pair the new spec does not state and found the relationship already held by `html.has-install-banner .bld-bar`, from 226. Adding the assertion would pin a rule that already has an owner one layer down, and the four-way test asserts the install banner's presence as a precondition, so the case is exercised rather than merely absent.

### Separately, the MUTATION GATE found something the review did not, and it was real.
`publishSyncBannerClear` survived a `||` → `&&` flip on `if(!h || !cs || cs.transform!=='none')`.
That is **not** an equivalent mutant to be allowed: `cs` was assigned `h ? getComputedStyle(sb) : null`, so `!cs` and `!h` are the same test written twice and the `||` between them could never decide anything.
The remedy is to delete the dead clause rather than to write a reason for keeping it — the guard is now two statements, each of which can fail.
Re-run scoped: `node tests/mutation/run.js --target=publishSyncBannerClear` → **4 mutants, 4 killed, 0 survived.**
Worth recording that the gate and the reviewer found different things here: the reviewer was checking whether the condition was CORRECT, which it was, and the gate was asking whether every part of it MATTERED, which one part did not.
