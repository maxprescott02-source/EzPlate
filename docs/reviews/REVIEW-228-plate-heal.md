# REVIEW - 228 (an unlinked dish relinks to its real plate)

Reviewed-commit: 42d8a54d05944e4fb6edb477c8e18989e0137a7b
Agent: `code-review`, Sonnet (the batch ran as Opus 5).
Given: the branch diff of `fix/relink-existing-plate` against `main`, and NOT the queue item.

---

## Report, verbatim

## Review: `fix/relink-existing-plate` (batch 228) vs `main`

**Scope covered:** `js/app.js` (the new `normPlateName`/`plateHealPlan`/`ensurePlateForDish`/`dishLinkedToast`/heal-picker code and their callers), `index.html`, `sw.js`, and all touched test files. I ran the full suite (1827/1827 green), plus targeted mutation testing by hand (copy-backup → mutate → run → diff-restore, confirmed each mutation actually changed the file, confirmed restore was byte-identical afterward).

### Mutation testing performed (all caught)
- `js/app.js:3269` — flipped the same-menu exclusion's `&&` to `||` (`d.id!==m.id || dishOnMenu(d, mine)`) → correctly turned `tests/plate-heal.test.js` red (`'create' !== 'relink'`).
- `js/app.js:~9826` — forced the "empty plate" branch of `dishLinkedToast` to never fire → correctly turned `tests/publish-guard.test.js` red on the exact scenario it exists to catch.
- `js/app.js:3296-3298` — swapped `plan.action==='relink'` for `plan.action==='create'` in `ensurePlateForDish` → correctly crashed/failed `tests/plates-independence.test.js`.

None of the new/changed guards are decorative; each one is load-bearing and the tests that pin them actually fail when the condition is wrong, not just when the code is deleted.

### Structural checks
- No duplicate top-level declarations introduced (`normPlateName`, `plateHealPlan`, `ensurePlateForDish`, `openHealedPlate`, `dishLinkedToast`, `plateHealDishId`, `openPlateHealPicker`, `closePlateHeal`, `plateHealChoose`, `plateHealStartNew` — all single-defined); `tests/housekeeping.test.js` passes.
- All six cache-version spots agree (`sw.js` `CACHE`, `sw.js` `ASSETS` x2, `index.html` stylesheet/script query strings, `js/app.js` `APP_VERSION`).
- `ensurePlateForDish` has exactly two live callers (`loadMenuItemBlank`, `plateHealStartNew`), both pass an explicit `plan`, so the `'ask'` outcome can never reach it in production — confirmed by grep, not inferred.
- `linkDishToPlate` (unchanged sequencing) is still called plate-first via `dbPushMenuAfterPlate`, satisfying the `menu_items.plate_id → plates.id` FK ordering rule; the new relink path reuses this correctly (`tests/plate-heal.test.js`'s "sequenced, both ways" test pins it).
- `.ad-list/.ad-item/.ad-nm/.ad-meta` are genuinely unscoped generic classes in `css/style.css:1198-1204`, so the reuse claim in the new `docs/QUEUE.md` note is accurate — no CSS was needed and none was added.
- The row-boundary/backup format is untouched by this diff — no new persisted field, no `xToRow`/`rowToX` change.

### Things I looked at hard and conclude are not bugs
- **Auto-relink with no confirmation UI on exactly one candidate** (`plateHealPlan` → `ensurePlateForDish` → `linkDishToPlate`, fired straight from clicking "load menu item"): this silently performs a real write and a `dish_linked` change-log entry. It's within Max's own recorded decision ("relink if there's exactly one match... ask if there are several" — `docs/decisions/2026-08-08-2.html`), so not a defect against the spec, just worth knowing it's an unconfirmed auto-commit.
- **`dish_linked` logged even when the relink target is an empty/partially-costed plate**, which superficially contradicts the `create` branch's own stated principle ("an empty plate... there is no cost movement to explain and `dish_linked` would claim one" — `js/app.js:3299-3301`). I traced this through: `avgFoodCostForScope` (`js/app.js:4123-4140`) excludes any plate with `miss!==0` or `cost<=0` from the average entirely, so `avgBefore === avgAfter` in that case and the dashboard's fall-only marker logic (`js/app.js:5465-5467`) draws nothing. The toast (`dishLinkedToast`) also correctly reports "some of its lines still need costing" / "add ingredients to cost it" rather than lying. So the log entry is cosmetically inconsistent with its sibling's stated rationale, but not numerically wrong and not user-facing-misleading — this exact behavior (`dish_linked` fired unconditionally regardless of target plate costing state) already existed pre-diff for the manual "Add existing plate" flow, so it isn't new. **Minor, low severity, not flagging as a real defect** — noting only because the code's own comment implies a stronger guarantee than the code delivers.
- **`openHealedPlate(m, sp, plan.action==='relink')`** shows the generic mint toast ("add ingredients to cost it") for the theoretical `plan.action==='linked'` case too (since `relinked` is only true for `'relink'`, not `'linked'`). Traced the only entry point (`renderPlateSuggest`/`rankLoadMatches`, `js/app.js:9140-9145`, via `platesLinkedMenuIds()`) and confirmed it filters to unlinked dishes only, so `loadMenuItemBlank` can never actually observe `plan.action==='linked'` in production. Dead branch, harmless.
- **Same-menu exclusion is a no-op for menu-less dishes** (`dishOnMenu(d, mine)` returns `false` whenever `mine` is `null`, since it requires `!!mid`), so two orphaned dishes with the same name and no menu could both auto-relink to the one candidate plate without exclusion. Traced but judged very low real-world likelihood (comment states production has zero rows of the class this whole feature handles) and the "one plate per menu" invariant doesn't obviously apply to dishes that aren't on any menu. Noting for completeness, not raising as a finding — low confidence it matters.

### Bottom line
I could not break the core decision logic (`plateHealPlan`/`ensurePlateForDish`) or its guards with hand mutation, the money/costing rule (never present an understated total as a cost) is honored by the new three-state `dishLinkedToast` and is tested against the real `costDetail`/`plateFullyCosted` chain rather than a stub, the write sequencing (plate before dish) is preserved, and no row-boundary or cache-version issues exist. This is a clean diff — I have no critical or major finding to report, only the low-severity cosmetic note above about the `dish_linked` log entry's rationale not quite matching its sibling branch's stated principle.

---

## What was done about each

**No critical or major findings.** Three "looked at hard" notes; one produced a change, two are recorded as considered.

**The `dish_linked` rationale: FIXED, and it is the finding of the review.** The observation is exactly right and the conclusion ("cosmetic") understates why it matters here. My `create`-branch comment said the log is skipped because *"an empty plate is not costed yet, so there is no cost movement to explain"* — a principle the relink branch does not share, because it delegates to the shipped linker, which logs unconditionally. **A comment that implies a guarantee the code does not make is the exact shape `CLAUDE.md` gained a section for this week**, and it would have sent the next reader looking for a guard that was never there. The comment now states the honest reason: a mint creates nothing to link to, so there is no link to log — and it names the relink branch's behaviour and why it is harmless (`avgFoodCostForScope` drops any plate with `miss!==0`), which is the reviewer's own trace, kept.

**The menu-less exclusion no-op: RECORDED AT THE SITE, no behaviour change.** The trace is correct — `dishOnMenu` returns false for a null menu id, so two menu-less orphans of one name can both relink to one plate. That is the right behaviour rather than a hole: the invariant is one dish per (plate, MENU), and 184 made `menusOfPlate` skip a dish with no menu outright, so no screen can show the pair ambiguously. It is now written at the exclusion, because it reads like a bug and the obvious "fix" — comparing raw ids — is the null===null defect `tests/menu-default.test.js` already catches.

**The `'linked'` dead branch: CONSIDERED, no change.** The trace is right that it cannot be reached. It is also unchanged behaviour: before this batch `loadMenuItemBlank` toasted "add ingredients to cost it" for every dish it opened, linked or not. Adding a fourth message for a branch nothing reaches would be a control with no route to it.

**The unconfirmed auto-commit: NOT A FINDING, and correctly not raised as one.** It is Max's decision in his own words, and the review found it by reading the code rather than the item — which is what makes the note worth keeping in the record.
