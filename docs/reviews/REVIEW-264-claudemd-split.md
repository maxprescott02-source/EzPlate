# REVIEW - 264 (CLAUDE.md splits into path-scoped rules)

Reviewed-commit: 6c829ef

**Model: Sonnet 5.** The batch ran on Opus 5, so the reviewer was overridden downward rather than taking the definition's `model: opus` pin - see the disposition of the pin below. The brief was not shown to it.

---

## The report, verbatim

I verified the "byte-identical" claim directly rather than trusting the commit messages: extracted every MANIFEST-listed section from `git show main:CLAUDE.md` and diffed it against its new home in `.claude/rules/*.md` or the compressed copy left in `CLAUDE.md`. All ~40 substantive sections matched exactly (only trailing-blank-line artifacts differed, not content). The MANIFEST array in `tests/claude-md-split.test.js` also matches the original file's full heading set 1:1 (58/58, zero diff) - that part of the claim holds.

The real findings are about *scope*, not content fidelity.

**Major - two rules lost reach in the move, and it's checkable, not speculative:**

1. `## A comment can record the defect CORRECTLY and file it under the wrong consequence` was placed in `.claude/rules/app-guards.md`, scoped to `js/app.js` and `index.html` only. But 2 of its 5 worked examples (212, 226) are about Playwright **spec files** under `tests/`, not app code. `tests.md` - the file that *would* load for a session touching only a spec - never mentions this rule (`grep -n "wrong consequence" .claude/rules/tests.md` returns nothing). A batch editing only a test file, which is exactly the context that produced two of the five recorded incidents, will never see it.

2. `## position:fixed IS NOT VIEWPORT-RELATIVE` lives only in `.claude/rules/css.md` (scoped to `css/style.css`). Its own text names the tell as "`position:fixed` set from JS together with numbers out of `getBoundingClientRect()`" - a JS-authoring concern, illustrated by `anchorDrop` in `js/app.js`. Neither `app-guards.md` nor `app-data.md` nor `invoice.md` mentions `anchorDrop` or `fixedContainingBlock` (verified by grep); the only appearance outside `css.md` is one passing sentence inside the unrelated "wrong consequence" rule. A batch adding a new anchored layer in `js/app.js` without touching `css/style.css` in the same session never sees this warning, even though the rule's whole point is that an *unrelated* file can silently break it.

**Moderate, stated with appropriate uncertainty - a structural risk in the split's mechanism itself:**

3. Per the task's own framing, a rule file loads when its glob is matched by a file the session *reads*. A brand-new file - most acutely a new SQL migration under `supabase/migrations/` - is normally created with `Write`, which requires no prior `Read` of anything under `supabase/**`. That means `sql.md` (which holds this repo's highest-stakes traps: `revoke … from public` vs `anon`, `ON CONFLICT` vs a widened primary key, `create or replace` silently deleting a guard by omission, restore-time column `DEFAULT` nulling) can go unloaded for exactly the class of session most likely to need it. The same gap applies to inspection via `Bash cat`/`grep`/`sed` instead of the `Read` tool - which this very review relied on throughout. I can't independently confirm the exact trigger condition for Claude Code's loader, so I can't call this a proven defect, but it's self-consistent with the stated mechanism and the batch's own mitigations (`skills/batch/SKILL.md`'s "read the rule file by hand if planning against a file you haven't opened", the handover's new probe question) are both manual reminders, not positive controls - the same failure shape ("nothing able to notice") the split was built to fix.

**Minor - the detector's own gaps, since the task asked to judge it hard:**

4. Test 2 (`every section ... still exists somewhere`) proves a heading **string** survives, not that the content under it does. A future edit could gut a section to a stub while keeping the heading verbatim and stay green - this repo's own "test that cannot fail" shape, cataloged 22 times in `tests.md`. Not exploited today (verified above), but it's what the test actually checks.

5. Test 1 caps `CLAUDE.md` at 200 **lines**, but the stated problem (in both the test's header comment and `CLAUDE.md` itself) is **byte size** (164KB, "18% growth in three days"). Line count is a weak proxy, defeatable by writing fewer/longer lines. Not exploited today (176 lines / 24KB, a real ~7x reduction) but doesn't directly measure what it claims to guard.

**Already self-disclosed by the batch, checked and accurate - not new findings:** the three EzPlate-specific skills (`new-branch`, `investigate`, `test-flows`) still outside the repo despite E4 being marked done; ~141 stale `CLAUDE.md` comment-pointers across tests/app.js/style.css; the handover's new "was any rule missing" probe as the only instrument for this failure mode. I checked these against the code and found no misstatement.

**Verified correct, no finding:** frontmatter globs in all 7 rule files match real repo files and correctly correspond to the table in `CLAUDE.md`; compressed summaries left in `CLAUDE.md` (naming inversion, Data/Writes/Menus, privacy gate, migrations/review process) preserve their originals' substance with no contradictions found; `.claude/` was correctly added to the review-gate's `GUARDED` list in the same commit set, closing a real bootstrapping hole (a diff rewriting the reviewer's own definition previously needed no review) - confirmed in `tests/review/check.js` and `tests/review-gate.test.js`, both passing; `tests/claude-md-split.test.js` passes 5/5 as of the current HEAD.

---

## Disposition

**Each finding was reproduced before it was acted on, per `CLAUDE.md`: run the finding's repro, then run its fix.**

**1. FIXED.** Repro confirmed: `grep -c "wrong consequence" .claude/rules/tests.md` returns **0**, `app-guards.md` returns 1. `tests/**` added to `app-guards.md`'s `paths:`, with the reason written at the site. The cost is that a session reading any test file now also loads the client guards (23KB) - which is correct rather than merely tolerable, since `isFinite('')`, exemption scope and fail-open are all things a test is usually written *about*.

**2. FIXED.** Repro confirmed: `grep -rln "anchorDrop\|fixedContainingBlock" .claude/rules/` returns `css.md` alone. `js/app.js` added to `css.md`'s `paths:`. The finding is right about the mechanism as well as the fact: the rule exists *because* an unrelated file changed a coordinate space, so scoping it to the stylesheet shows it only to the half of the pair that is never doing the arithmetic.

**3. NOT FIXED. Documented and filed, and this is the batch's most important open item.** The finding is correct and its own uncertainty is correctly placed. Two mitigations shipped and **both are reminders rather than controls, which is stated plainly rather than presented as a close**: `CLAUDE.md`'s index section now says the trigger is a READ, that creating a file is not one and `cat`/`grep` is not one, and that nothing reports a rule failing to load; `skills/batch/SKILL.md` says to open the file by hand when creating or planning. The mechanism that would actually close it - a `PreToolUse` hook on `Write|Edit` returning the matching rule path as `additionalContext` - is written up in `docs/MAINTENANCE.md` with its design and the reason it was not built today: 263 had just filtered and bounded the one existing hook, and adding a second hook class on the same day, unasked, in the batch whose job was to de-risk the instruction layer, is the wrong order.

**4. PARTIALLY FIXED, and the limit is now measured rather than asserted.** A corpus floor was added to assertion 2. **Then it was tested against the finding's own scenario and did not fire:** deleting the entire `revoke … from public` section, ~5KB, left the assertion green. So the floor catches a *collapse* and not a *gutting*, the test's comment now says exactly that with the measurement in it, and the first draft of that comment - which claimed the floor was "the half that notices" - was corrected. Nothing in this repo catches a single gutted section; that is written down rather than covered.

**5. FIXED.** A 32KB cap joins the 200-line cap. Proved with the finding's own attack: appending 10,000 bytes on two lines leaves the file at **178 lines** and **34,139 bytes**, which the line cap alone passes and the byte cap reddens.

**Suite after all fixes: 2253 pass, 0 fail. Smoke green. Mutation gate: nothing in scope.**
