# REVIEW - 272 (modal footers)

Reviewed-commit: 719d03bd1b9bb72e7dd82d3c20e16902bd95a280

**Agent:** the pre-push `code-review` agent, run on **Sonnet**.
The definition pins `opus` and this batch ran on Opus, so the reviewer was overridden for this run per `CLAUDE.md`'s rule that a model may not review its own work.
It was given the branch diff and the suite's state, and told which surfaces to attack.
It was NOT given the queue item, the plan or the premise-check report.

**Three findings. One is the handover step this batch had not reached yet, and two are real and both are TAKEN.**
The report is pasted verbatim below; what I did about each follows it.

---

## The report

## Findings

**1. Major — the branch fails a required CI check right now; the "2359 green" premise is false.**

Running `npm test` on this branch produces **2 failing tests**, not 2359/2359 green:

```
test at tests/state-file.test.js:58 — "STATE.json deploy_version is sw.js CACHE..."
  docs/STATE.json says v220; sw.js says v221. Run: node tools/state.js
test at tests/state-file.test.js:86 — "every other field agrees with the files too..."
  docs/STATE.json is stale on deploy_version (220 -> 221)
```

Mechanism: this branch bumps all six cache-version spots to v221 (`index.html` x2, `js/app.js` `APP_VERSION`, `sw.js` `CACHE`, `sw.js` `ASSETS` x2 — verified consistent) and its single commit message is `"272: one modal footer pattern..."`, but `docs/STATE.json` still reads `{"batch": 271, "deploy_version": 220, ...}` — untouched by this branch, staged or unstaged. `unit tests` is a required, `enforce_admins`-bound check per `CLAUDE.md`, so as committed this cannot merge.

How to verify: `git checkout fix/272-modal-footers && npm test 2>&1 | tail -40`, or just `cat docs/STATE.json` vs `sw.js`'s `CACHE` line.

Confidence: high — directly reproduced, not inferred. This is very likely just an unfinished step (the `node tools/state.js` + handover pass that normally follows the pre-push review), and there are uncommitted working-tree edits to `docs/QUEUE.md`/`docs/MAINTENANCE.md` consistent with that read — but it is a concrete defect in the branch as it stands, and the prompt's stated suite state does not match reality.

**2. Minor — `tests/onboarding-zero.test.js`'s rewritten anchor-colour test is weaker than the one it replaced, not merely adapted.**

The old test hard-required `.linklike` and `.del-link` to exist as CSS rules and to set `color` (`assert.ok(m, '.${cls} must still exist...')`). The new version (`onboarding-zero.test.js:79-93`) derives the class list from every `<a class="...">` in `index.html`, and for any class with **no matching CSS block at all**, it silently `continue`s rather than failing. In the current markup this reduces the check to effectively one class (`.linklike`) actually being asserted — `.privacy-open` (worn by three `<a>` elements) has no own-name CSS rule (it's coloured via `.inv-privacy a, .stg-help a{color:...}` instead) and is silently skipped, and `checked >= 1` passes on `.linklike` alone. If a future edit deletes the `.linklike{}` block entirely (its only guard, per `grep -rn linklike tests/*.js`), this test can no longer catch it — the old one would have failed on `assert.ok(m, ...)`.

How to verify: temporarily delete the `.linklike{...}` rule from `css/style.css` and run `node --test tests/onboarding-zero.test.js` — expect it to stay green.

Confidence: high on the mechanism (traced by hand); this is the kind of "test weakened rather than corrected" the review explicitly asks about.

**3. Nit — a load-bearing comment's anchor count is wrong, and the diff edits it without fixing it.**

`css/style.css:346-351` (touched by this diff) says *"the app owned exactly three `<a>` elements... 272: `.del-link` is gone... so that count is two anchors, one classed and one bare."* Actual count in `index.html` alone is 8 `<a>` elements (`bgToSignUp`, `bgUpPrivacyLink`, `bgToSignIn`, `bgPrivacyLink`, three `privacy-open` links, `linklike`), plus `#bhGo` generated in `js/app.js` = 9. The comment was already wrong pre-diff (undercounting even before `.del-link`'s removal — the boot-gate anchors were never in its "three"), and this diff edits the same comment to assert a new, still-wrong number rather than correcting it. It's not load-bearing for any assertion (the actual tests derive their list from the DOM rather than trusting this prose), so it's a documentation nit, not a functional defect — flagged because stale counts in comments are exactly what this project's own rules warn get trusted.

## Checked and found correct (no finding)

- `.mfoot > .btn.danger:first-child{margin-right:auto}` — verified by hand against every `.mfoot` in `index.html`; the only three `.btn.danger` elements are the three edit-form Delete buttons and all are first children; `#delChoiceAll` (the confirm-dialog carve-out) is `.btn.primary`, never `.danger`, so it can't be dragged left. No JS builds a `.mfoot` dynamically. `#bldDelete` (also `danger ghost`) lives in `.bld-actions`, not `.mfoot`.
- `edDelArmed` / `ed_deleteRow` deletions — confirmed dead in `main` already (write-only, no reads anywhere before this diff); removal is a correct no-op cleanup, not a behavior change.
- `.del-link`, `.ig-foot`, `.mfoot-spacer`, `.king-remove`, `#kingModalRemove{}` — all fully retired; no stale reference left in `js/app.js`, `index.html`, or CSS; JS toggles `kingModalRemove` via `style.display`, not the deleted class, so removing the dead CSS rule is safe.
- `.use::after` vertical ±4px extension — checked against `.ka-row`'s actual padding (7px top/bottom, 14px between adjacent buttons); the extended hit areas leave ~6px clear, so it can't steal a tap from the next suggestion row. `position:relative` addition has no other CSS depending on `.use`'s previous static position.
- `@media (max-width:420px){.mfoot .btn{...}}` — applies to all `.mfoot` buttons app-wide (not just the three edit forms), but this is neutral-to-helpful everywhere else (`del-choice-foot` already wraps); no overflow or breakage found at width 380/1280 in either theme, and the new Playwright spec measures real rects confirming the >20px gap.
- `ed_delete` becoming a real `<button type="button">` with a direct `editDeleteTap` listener — no stale `<a>`/`role="button"` reference remains; `editDeleteTap` ignores the passed event arg harmlessly; not wrapped in a `<form>`, so `type="button"` is correct rather than merely decorative.
- Six cache-version spots agree at v221; `.github/workflows/test.yml`'s spec-count comment (61→62) matches the actual file count and is mechanically guarded by `tests/ci-workflow.test.js`.

---

## What I did about each

**Finding 1, the stale `docs/STATE.json` — CORRECT AS AN OBSERVATION, and it is the handover step rather than a defect in the change.**
`skills/batch` step 10 runs `node tools/state.js` **in the same commit as the handover**, which is written after the review, so every batch's branch is red on exactly these two tests between the version bump and the handover commit.
That is the mechanism working: `tests/state-file.test.js` exists so a handover cannot land without the derivation being re-run.
**The reviewer is nonetheless right about the fact it reports** - the branch as it stood could not merge, and "the suite is green" was true of the commit before the bump and not of the one it read. The prompt should have said so; the review was given a claim it was able to falsify, and did.
Run in the handover commit, with `npm test` green at 2359 after it.

**Finding 2, the weakened anchor test — TAKEN, and it was the most useful thing in the report.**
The rewrite made the list DERIVED, which is right, and lost the existence guarantee, which is not: a class with no own-name rule and a class whose rule was DELETED both hit the same `continue`.
The reviewer's repro is exact - deleting `.linklike{...}` left it green.
Fixed with a two-tier check: the derived loop stays (it covers a class added later), plus a literal floor naming the classes that colour themselves BY NAME today, which is `.linklike` alone.
**Proved against the reviewer's own repro:** deleting the `.linklike` rule now fails the file, and restoring it passes.
The comment at the site names the distinction that caused this, because it is the part that will happen again: the original list named `.del-link`, this batch deleted that element, and the right response was to remove that ONE literal rather than the floor. A class that legitimately disappears comes off the list; a class that stops setting a colour is the defect.

**Finding 3, the wrong anchor count — TAKEN, and worse than the reviewer graded it.**
It is not only that the number is wrong. **A comment saying "the app owns exactly three anchors" was edited, by this batch, into a comment saying "that count is two anchors" - a fresh wrong number written into the fix for a stale one**, which is this repo's most-recorded rot occurring inside the correction for itself.
The enumeration is DELETED rather than re-counted, per the standing rule that a count in prose is the one thing nothing keeps true: the live list is derived by `tests/onboarding-zero.test.js` from the markup.
The hover paragraph's worked example still names `.del-link` deliberately, and says why at the site: the measurement is the evidence, and re-pointing it at a class nobody measured would be inventing a figure.

## The other gates

Full `npm run mutate` on the reviewed commit: **1436 mutants, 1382 killed, 54 survived all with written allowances, 3 killed by timeout, exit 0.**
Full Playwright: **493 passed, 14 skipped** (the suite gained 13: twelve in `tests/visual/272-modal-footers.spec.js` and one in `v192-touch-targets.spec.js`).
`npm test`: 2359 green after the handover commit's `node tools/state.js`.
Every assertion in `tests/modal-footers.test.js` was proved red by hand against seven separate mutations of the shipped markup and CSS, and the `.use` probe against removing its `::after`.
