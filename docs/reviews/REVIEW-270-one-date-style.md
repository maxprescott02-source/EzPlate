# REVIEW - 270, one date style through one `fmtDate` helper

Reviewed-commit: 3ab750b7787ce4d2412a32eb90d7b79b5e12d572

**Agent:** `code-review`, run on **Sonnet**.
The definition pins `opus`; this batch ran on Opus, so the reviewer was overridden to Sonnet for this run per `CLAUDE.md` ("a model reviewing its own work is not a second reader").
It was given the branch diff and **not** the queue item, the plan or the premise-check report, and was told explicitly to judge the code as it stands rather than against a stated intent.

**No findings.**
It raised two things it had chased and dismissed itself, and named one loop it had not closed.
**One of the two dismissed items was taken anyway** - see "What was done" below - so this batch's outcome is: nothing to fix, one doc correction adopted from a nit the reviewer graded as probably-not-wrong, and one gap closed in `skills/batch`.

---

## The agent's report, verbatim

## Review: `batch-270-one-date-style` against `origin/main`

I read the full diff (`js/app.js`, all touched test files, `sw.js`, `index.html`, `tests/mutation/targets.js`, and the docs), ran `node --check` on every changed file, ran the full unit suite (2327 tests, all passing), ran the newly/changed test files individually (134 tests, all passing), and ran `tests/state-file.test.js` specifically to check the STATE.json question below.

### What I looked for and did not find

- **Wrong conditions**: `fmtDate`'s threshold logic (`days<0` → absolute, `0`/`1` → today/yesterday, `<7` → "N days ago", else absolute) matches its own test file exactly, including the DST edge cases (23h/25h local days) and the calendar-day-vs-elapsed-hours distinction. `dateMs` correctly gates on `typeof x === 'number'`/`instanceof Date`/non-empty string *before* any `isFinite` check, so `dateMs('')` and `dateMs([])` do not fall into the `isFinite('')`/`Number([])===0` trap this repo has hit twice before (per `app-guards.md`) — confirmed by the explicit test in `tests/fmt-date.test.js`.
- **Writes not landing / row boundary**: no Supabase writes in this diff; nothing crosses the camelCase/snake_case boundary.
- **Sequencing**: not applicable — no cross-referencing writes/deletes.
- **Silent failure**: every `fmtDate`/`fmtDateAbs` call site that can receive an invalid value already has a fallback (`|| 'earlier'`, `|| 'an unknown date'`, `|| ('reading #'+...)`, `|| 'recently'`), and the one caller that doesn't need one (`recentChangesHtml`) is fed only from `recentChangeRows`, which already filters `!isFinite(e.t)` before the row is built — so `fmtDate` there always receives a finite number.
- **Tests that cannot fail**: `tests/fmt-date.test.js` extracts the real `fmtDate`/`fmtDateAbs`/`dateMs`/`MON3` via the new `dateKit()` helper (not a hand-rolled stub), forces `TZ=Australia/Sydney` before any `Date` is constructed (with a comment explaining why a UTC CI runner would make the DST assertions vacuous otherwise), and pins both sides of every threshold with literal expected strings rather than structural checks. `tests/dash-recent.test.js`'s rewritten `Date` shim correctly extends the real `Date` and forwards all constructor arguments (a prior single-arg shim would have silently broken `fmtDate`'s three-arg local-midnight construction — the comment calls this out explicitly). `tests/mutation/targets.js` adds `fmtDate`, `dateMs`, and `trendFmtDate` as mutation targets, and the accompanying comment says each was hand-confirmed red before listing.
- **Dead/unreachable code**: `relDayLabel` is fully deleted with no remaining call sites (only prose references it). No duplicate top-level declarations were introduced (`MON3`, `dateMs`, `fmtDateAbs`, `fmtDate` each appear exactly once).
- **Naming inversion**: not touched by this diff.
- **Parser region**: both anchor literals (`var INV_EXCLUDE=` and `function unitLabelFor(`) are untouched and still present verbatim; the new code sits well before that region.
- **Six cache-version spots**: all six agree at `v219` (`sw.js` CACHE + 2 asset query strings, `index.html` × 2, `js/app.js` `APP_VERSION`).
- **`monthLabel` exclusion**: correctly left alone and pinned by a dedicated test (`monthLabel stays a month NOUN`); `tests/fmt-date.test.js`'s "every remaining locale date call lives in monthLabel" census strips comments first (avoiding roster item 183(a)'s prose-matching trap) and I independently confirmed via grep that the only `toLocaleDateString`/etc. call left in `js/app.js` is inside `monthLabel`.

### Two things I chased that turned out not to be findings

- I initially suspected `docs/STATE.json` was left internally inconsistent (`deploy_version` bumped to 219, but `batch` still 269 and `newest_handover` still pointing at batch 269's handover, with no `HANDOVER-270-*.md` in this diff). Running `tests/state-file.test.js` shows this is correct, not stale: `batch` is derived from the newest `docs/handovers/HANDOVER-<n>-*.md` file, and since batch 270 hasn't written its handover yet (this review runs pre-handover, pre-push, per the documented workflow), 269 is the right derived value. `deploy_version` is independently derived from `sw.js`'s `CACHE`, which this diff did bump. Not a defect.
- `docs/QUEUE-GROUPS.md` line 152 lists item 60 among G4's items without a strikethrough, even though `docs/QUEUE.md`/`docs/QUEUE-2026-09-08-CONSOLIDATED.md` mark it shipped in this diff. This is a minor documentation-lag nit (category 7) at most, not a code defect, and the line's wording ("promoted... by batch 261's refill") is a historical statement rather than a live status field, so it isn't clearly wrong either.

### Bottom line

I did not find a defect in this diff. It is unusually careful: the date-folding logic is correct against its own thorough test suite (which I ran and verified independently, not just read), the exclusions (`monthLabel`, the chart axis, the backup filename) are deliberate and each pinned by a test, the six cache-version spots agree, the parser-region anchors are untouched, and no duplicate top-level definitions were introduced. If you want a second pass, the one thing I did not do is run the full `npm run mutate` gate (only spot-checked the new targets' listed rationale and ran the relevant test files directly) — that's the only unclosed loop I'd flag as unverified-by-me rather than as a finding.

---

## What was done

**Finding 1 - STATE.json:** correctly dismissed by the reviewer, and its reasoning is right. Nothing done.

**Finding 2 - `docs/QUEUE-GROUPS.md` listing item 60 unstruck: TAKEN, against the reviewer's own grading of it.**
It called the `**Items:**` line *"a historical statement rather than a live status field"*. **That half is wrong, and it is the half worth arguing with.** The G5 note four sections below in the same file says the opposite in as many words, about item 85: *"the line is what `tools/state.js` and `tests/queue-routing.test.js` read, and prose is not a field."* The line IS the field.
**The reviewer was nonetheless right that nothing was broken, and for a reason it did not state:** `tools/state.js` reads struck-ness from `docs/QUEUE-2026-09-08-CONSOLIDATED.md`, not from this line, so the derivation had the correct answer throughout. **The only reader the stale line could mislead was a human deciding whether G4 was finished** - which is why three shipped items (57, 58, 60) had accumulated there unstruck across three batches with nothing noticing.
Both ends fixed: the three strikes are in, and **`skills/batch` step 10 now names BOTH backlog files**, since it named only the consolidated one and that omission is the actual cause.

**The unclosed loop the reviewer named - the full mutation gate - was closed, before it ran.**
`npm run mutate`: **1408 mutants, 1354 killed, 54 survived (54 with a written allowance), 3 killed by timeout, 799s, exit 0.**
The three new targets were then run individually: `fmtDate` 6/6 killed, `dateMs` 3/3 killed, `trendFmtDate` 1/1 killed, **zero survivors and zero allowances between them.**
Recorded here rather than left as the reviewer's caveat, because "I did not run it" and "it was not run" are the same sentence to anyone reading this file later.
