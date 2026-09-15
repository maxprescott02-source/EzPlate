# HANDOVER - 273 (builder-discard)

**Branch:** `273-builder-clear-verb` · **Scope:** `docs/QUEUE.md` item 47, its one remaining bullet (the builder's Clear/Delete pair). Shipped deploy version **ezplate-v222**.

## What changed

`#clearBtn` reads "Start over" instead of "Clear plate", and its two `--bad` rules in `css/style.css` are deleted, so `--bad` belongs to `#bldDelete` alone on that screen.
The defect was exact rather than approximate, and was measured in Chromium on a saved plate before anything was changed: the two buttons computed the IDENTICAL colour, `rgb(192, 57, 47)` light and `rgb(229, 135, 125)` dark, and at 1360x900 both were painted at once, at y=279 and y=681.
The item also asked to move the button into the docket header, and that was declined on two measurements at 380: `.bld-mast` is 322px of 11px nowrap mono already holding a title and `#dCount`, and the two verbs were 402px apart already, so distance was never what made them read alike.
"Keep Delete alone at the bottom" needed no change and is recorded as already true: `.bld-actions` holds `#bldDuplicate` (neutral) and `#bldDelete` (`danger ghost`), and Delete is the only destructive control there.
Three `js/app.js` comments quoted the old label and are corrected; no JS logic changed.
`.github/workflows/test.yml`'s spec-count comment moves 62/61 to 63/62 for the new spec.

Two new tests, and the reason there are two is verified rather than asserted.
`tests/builder-discard.test.js` pins the source: the label, that exactly one control inside `#builderPage` wears `danger`, and that no rule naming `#clearBtn` paints it `--bad`.
`tests/visual/273-builder-discard.spec.js` pins the painted colours at both themes.
Each of the four conditions was mutated by hand and watched go red, and it was then confirmed that a selector which never types `#clearBtn` (`.bld-actrow .btn:last-child{color:var(--bad)}`) leaves all three unit tests green and turns both spec colour tests red.
That is the whole argument for the pair, and it was run rather than reasoned.

## Review

The pre-push `code-review` agent ran on **Sonnet**, overriding the definition's `opus` pin, because this batch ran on Opus.
It was given the branch diff and was not shown the queue item or the plan.
Artifact: `docs/reviews/REVIEW-273-builder-discard.md`.

Finding 1, `docs/STATE.json` stale against the bumped `sw.js`: correct as an observation, not a defect.
`node tools/state.js` runs in the handover commit by design, so the reviewer measured a window the process creates on purpose; it was run before push and `npm test` is green.
Worth noting for next time: the agent is deliberately given no process context, so every batch that bumps a version will produce this finding.

Finding 2, MAJOR, and confirmed by running its own repro before changing anything.
The reason written for not moving the button, "below 768 `.bld-actrow` is the only thing `#bCost` shows", was measured against a plate on no menu and then stated as a fact about the screen.
Re-measured at 380 across 0, 1 and 2 menus: card height **60 / 127 / 164px**, the second carrying `#bPriceRow` and the third `#bMenus`, because `.is-bare` is set from `on.length===0`.
The counter-evidence was in the same media block the whole time, since `#bCost .bld-menus{border-top:0}` is only worth writing if that list renders at this width.
Fixed in all four places the claim had reached (the `index.html` comment, the spec's docstring, the spec's test, the consolidated item), each written out as wrong rather than deleted.
The spec's 380 case is now a table over 0/1/2 menus asserting the bare-card state by its CONDITION rather than by a name.
The decision not to move the button stands on its other two reasons, and the handover says so because a reader could otherwise assume the finding reversed it.

## Into CLAUDE.md

Nothing.
The lesson from finding 2 is already `.claude/rules/app-guards.md`'s "an exemption is scoped to the CLAIM that justified it", and it is recorded at the four sites rather than added as a second copy.

## New docs/QUEUE.md items

Item **96** (tier B, routed to G5): "Start over" bins an unsaved plate with no confirm and no undo.
`clearPlateDraft` does `removeItem(DRAFTKEY)`, so `guardUnfinishedPlate` cannot offer the work back either.
Raised by this batch, which caused the half of it that is new: removing the red took away the only heaviness signal the button had.
The asymmetry is the argument, and it is the app's own - `guardUnfinishedPlate` asks before binning a draft implicitly and nothing asks before binning it explicitly.

`docs/MAINTENANCE.md`, tier C rather than a queue item: `tests/visual/v190-sticky-header.spec.js` is reliably red on macOS and green in CI.
R21 fails every run with "Expected 80, Received 88"; the other two come and go, giving 1, 2 and 3 failures across four runs of unchanged code.
CI's Playwright job was green on `main` for batch 272, so it is neither an app defect nor a `main` defect.

## New docs/PHONE.md items

None.
Everything here was settled by a browser at 380 in both themes, which is the test an entry in that file has to fail.

## Probe

**What the item told you to do that you would have done differently:** it asked for the move into the docket header, and that was declined on measurement rather than done.
The measurements and the decision are in the consolidated item so it is not re-proposed.

**What was not proposed because it was out of scope:** a confirm or an undo on the discard.
The item says "keep the behaviour", so it is item 96 instead of a change here.

**Was any rule missing when you needed it:** no rule was missing, and the one that mattered did not reach the moment it was needed.
`.claude/rules/app-guards.md` loaded correctly with `js/app.js`, and its "an exemption is scoped to the CLAIM that justified it" section is exactly the mistake that was then made - in a measurement rather than in code.
Reading a rule is not the same as recognising its shape in a different costume, and the pre-push review caught it rather than the rule.
That is the honest answer to the question rather than the expected one, and it is the only instrument the split has.

## Surprises

The screen was measured before planning, and batch 272's own corrections to this item still had one stale line number in them: the `--bad` paint was at `css/style.css:550-551`, not the 542-543 that 272 had measured and written down three days earlier.
Every other correction 272 made held exactly.
A corrected citation is still a citation, and it goes stale the moment anyone edits above it.

CI's Playwright job being green while the same spec is reliably red locally was not expected, and it cost a cycle to establish that the two failures were not this branch's.

A `git add -A` issued while `npm test` was still running committed that suite's own scratch file, `docs/reviews/REVIEW-000-uncommitted-probe.md`.
`tests/review-gate.test.js` writes it into `docs/reviews/` to prove `gather()` reads the committed tree, then unlinks it.
The consequence is worse than a stray file and is the part worth recording: once the probe is IN the committed tree, `gather()` seeing it is the CORRECT answer, so the self-test goes red permanently while reporting that the gate is broken.
Removed in its own commit, and the fragility is filed in `docs/MAINTENANCE.md` with the fix that keeps the test where it is.
