# REVIEW - 267, one product identity line and one casing system

Reviewed-commit: c0e8ccfcea8a7611a647c638ce08e668abc03c01

**Agent:** `code-review`, run on **Sonnet**.
The definition pins `opus`; this batch ran on Opus, so the reviewer was overridden to Sonnet for this run per `CLAUDE.md` ("a model reviewing its own work is not a second reader").
It was given the branch and the diff and **not** the queue item, the premise check or the plan.

Three findings. All three were real. Two were acted on in this branch; one was already scheduled and is now done.

---

## The agent's report, verbatim

### Findings

**1. CRITICAL (verified, not inferred) — the branch fails its own required test suite as committed.**

`js/app.js` bumps `APP_VERSION` to `v216` and `sw.js`/`index.html` bump their six cache-version spots to match, but `docs/STATE.json` (`deploy_version: 215`) was never regenerated with `node tools/state.js`. Running `npm test` on this branch (commit `c0e8ccf`) produces:

```
✖ STATE.json deploy_version is sw.js CACHE, and newest_audit is the highest AUDIT-vNN
  AssertionError: docs/STATE.json says v215; sw.js says v216. Run: node tools/state.js
✖ every other field agrees with the files too, and written_at is a real past date
```

2 of 2301 tests fail. `npm test` is exactly the `unit tests` job that branch protection requires (`.github/workflows/test.yml:173`), and it is also check 1 of `.githooks/pre-push`. As committed, this branch cannot pass CI and, absent `--no-verify`, should not have been pushable at all.

- **Repro:** `npm test` on `batch-267-casing-identity` (or `node --test tests/state-file.test.js`).
- **Fix location:** run `node tools/state.js` and commit the regenerated `docs/STATE.json`.
- **Confidence:** high — directly reproduced, not reasoned about.

**2. Minor — the "ONE PRODUCT IDENTITY LINE" comment overstates what was actually consolidated.**

`js/app.js:2049-2067`'s comment at `productIdentityMeta`/`productIdentity` names exactly two "deliberate refusals" (`renderIngredients`, `printDocketFor`) and implies every other product-beside-metadata surface now goes through the shared helper. Several surfaces just as "one click apart" from the migrated ones still hand-roll `description + (' — '/' · ' + brand)` with no supplier and the old capitalisation baked into their own markup, and are neither migrated nor listed as a refusal:
- `kingWizRowHtml` / `kingWizSkippedHtml` (`js/app.js:6107`, `6108`, `6124`) — the "Set up from products" wizard, one screen away from `kingProductLabel`, which *was* migrated.
- `prodOptions` (`js/app.js:12861`), `invMatchOptions` (`js/app.js:13377`) — the invoice review's product-match `<option>`s.
- the candidate-chip `fullNm` build (`js/app.js:13604`).

None of these are functionally broken by the diff, but the comment's implicit completeness claim is false, and it's exactly the kind of comment this repo's own rule file warns about (`.claude/rules/app-guards.md`, "a comment can record the defect correctly and file it under the wrong consequence") — a future reader who trusts "not every surface takes it, and the two refusals are deliberate" will believe the sweep was exhaustive when it wasn't.

**3. Minor — two new source-regex tests can't catch a partial regression within the same function.**

`tests/product-identity.test.js:79-90` ("every surface... goes through the shared builder") asserts only that `productIdentity(`/`productIdentityMeta(` appears *somewhere* in the extracted function body (`assert.match`). `renderKingProdDrop` contains two independent call sites — `productIdentityMeta(p)` building the dropdown list (`js/app.js:6260`) and `productIdentity(p)` filling the input on click (`js/app.js:6262`/`6270`ish). Reverting only the click-handler line back to the old hand-rolled `p.description+(p.brand?' — '+p.brand:'')` — i.e. reintroducing the exact "two typographic voices, one click apart" bug this batch exists to fix — would leave the regex match on the *other* call site untouched, so the test stays green. Same shape, lower stakes, for the `renderPlate` assertion (`/productIdentity\(p\)/`), which only pins the `isKid` arm and says nothing about the legacy-line arm two lines below it.
- **Confidence:** high on the mechanism (the regex is a presence check, not a per-call-site check); this is the "test that cannot fail against a specific regression class" shape from `tests.md`'s roster, not one of the 22 named instances but the same family.

### What checked out (no defect found)

- `productIdentity`/`productIdentityMeta` (`js/app.js:2049-2067`) are pure, correctly handle brand-only/supplier-only/neither/empty-string/no-description/null-product cases, and are genuinely unit-tested via extraction (`tests/product-identity.test.js`), not stubbed.
- `fillFilter`'s new `<optgroup>` markup (`js/app.js:5574-5583`): `select.value` reads/writes are unaffected by grouping, no code reads options positionally, the `grp` label derivation (`"All categories"` → `"Categories"`) is correct for both actual call sites, and `TIDY_DOOR`'s capture-phase handler is untouched.
- `catLabel` used in `updateKingCat` (`js/app.js:6239-6243`) is confirmed display-only — `#king_cat`'s `.textContent` is never read back anywhere, so it can't leak into a write, consistent with `tests/cat-label.test.js`'s scope guard.
- The parser-region anchors (`var INV_EXCLUDE=` at `js/app.js:12240`, `function unitLabelFor(` at `js/app.js:12705`) are untouched; all invoice-review edits in the diff (placeholder casing, `catLabel`) fall outside that slice.
- All six cache-version spots (APP_VERSION, index.html × 2, sw.js CACHE + ASSETS × 2) agree at `v216`.
- The `_boot.js` `productPatch` addition is additive/opt-in, defaults to `{}`, and doesn't change any existing spec's served rows.
- `test.yml`'s "61 specs, 60 survive" comment matches the actual file count post-diff.

---

## Disposal

### Finding 1 - STATE.json stale. TRUE. Done.

The fact is right and reproduced. Its stated CAUSE is half wrong and worth correcting for the record rather than disputing: `node tools/state.js` runs **in the same commit as the handover** by `skills/batch` step 10, which had not been reached when the reviewer read the branch. So "should not have been pushable" describes a state no push was attempted from. The suite was red at the moment it looked, which is a true and useful thing to report, and a reviewer has no way to know which step a batch is on - reporting it is the right behaviour.

`node tools/state.js` run with the handover; `npm test` green at 2304/2304.

### Finding 2 - the comment claimed a completeness it did not have. TRUE, and it UNDERCOUNTED. Fixed.

The finding is correct and the sweep really was partial. Running its own repro turned up a site it did not name, and that one was **a defect this batch created rather than one it inherited**:

**`openKingModal` (`js/app.js:6277`) is the THIRD writer of `#king_prod`'s value.** The other two - `renderKingCreateSuggest` and `renderKingProdDrop` - were moved onto `productIdentity` by this batch and this one was not. So opening **Edit** on an ingredient showed `Cheddar - Bega`, and picking the same product from the picker one click later showed `Cheddar - Bega · Bidfood`. One field, two formats, one click apart: the item's own defect, introduced into the field the item's own fix had just touched.

Acted on:
- **`openKingModal`** migrated. This is the finding's real payload.
- **`kingWizRowHtml` / `kingWizSkippedHtml`** migrated. That one function rendered the same join **two ways** - a middle dot for a single product and an em dash for several - so the wizard disagreed with itself depending on how many candidates a name happened to match.
- **`prodOptions` / `invMatchOptions`** NOT migrated, and now a stated refusal rather than an omission: a supplier on ~400 option labels lengthens the densest control on the screen where a wrong pick stores a wrong price, and `invMatchOptions` appends the coverage percentage *after* the label, which a native select truncates from the right - so the first thing lost is the number being chosen on. `.claude/rules/invoice.md` makes that screen regression-test territory.
- **The `fullNm` / Dig-in row names** NOT migrated: those strings reach `api/insight` as FACTS. Changing the model's input is not a presentation change.

The comment is rewritten to carry an explicit MIGRATED list (eight functions) and an explicit NOT-MIGRATED list with a reason each, and it now says in as many words that it is not an exhaustive sweep. Both refusals are filed in `docs/MAINTENANCE.md` so they are findable without reading that comment.

### Finding 3 - presence-only assertions cannot see a partial revert. TRUE. Fixed, and verified in both directions.

Ran the finding's own repro: reverted **only** the click handler in `renderKingProdDrop`.

- the old presence regex still returned `true` - green, exactly as predicted;
- the replacement absence guard went **red**.

The test is now an ABSENCE assertion - no migrated function may contain a hand-rolled `description + (… brand …)` at any call site - kept alongside the presence one so both directions are pinned, plus a guard-on-the-guard running the regex against the three exact strings this batch deleted (roster 205: a source-scanning assertion goes vacuous when its pattern stops matching, and "found nothing" reads the same as "found nothing wrong"). `renderPlate` now pins both arms separately. `openKingModal` is in the migrated list because its partial revert was not hypothetical - it was the real state of the branch.

---

## Other gates

- **`npm test`**: 2304 pass, 0 fail.
- **Mutation gate** (`npm run mutate`, full): 1408 mutants, 1354 killed, **54 survived, all 54 carrying a written allowance**, 3 killed by timeout. Exit 0. No new survivor from this diff.
- **Playwright**: 479 passed, 14 skipped, 1 failed - `v90-dash.spec.js` "@ mobile dark", which **passes in isolation and on re-run**, does not touch anything in this diff, and is a click-then-assert with no explicit wait. Recorded as flake, not chased.
- **Hand-mutation of the new tests**, backed up by `cp` rather than `git checkout --`: restoring the uppercase on `.opt .ca` reddens both the unit test and the browser spec; reverting `renderDrop` to the bare description reddens the spec's precondition; changing the identity separator reddens four assertions. One mutation attempt silently matched nothing (a `perl` encoding problem with the em dash) and was re-run through Node until `diff -q` proved the file had changed - a mutation that edits nothing reports SURVIVED for a test that was never exercised.
- **Browser drive** (`flow-tester`, staging, both themes): no defects across all seven changed surfaces. It reported honestly that it could not hold a true 380px viewport (clamped to ~606), so that width is now pinned by `tests/visual/267-identity-line.spec.js` instead of re-driven.
