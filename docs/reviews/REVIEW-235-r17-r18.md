# REVIEW - 235 (R17+R18: one mobile title row, one desktop row floor)

Reviewed-commit: 5dced44
Reviewer: `code-review` agent on **Opus** (claude-opus-5), diff of `feature/r17-r18-more-header-row-heights` against `main`, no brief shown.
Fix range after the review: `5dced44..HEAD` (one fix commit; every finding below was taken or answered there).

## Findings, verbatim

### 1. MAJOR — the R17 title test cannot fail against half the rule it exists to pin

`tests/visual/v193-row-header-consistency.spec.js:75-98`, against `css/style.css:3854-3856`.

The rule is three declarations: `min-height:44px; display:flex; align-items:center`. Only `min-height` is pinned. Delete `display:flex` and `align-items:center` and all three assertions stay green.

Mechanism: the test compares **title text centre on More/Dashboard against title text centre on Settings**. Without `display:flex`/`align-items:center`, the h2 is still a 44px-tall block and the text line box sits at its **top** — but that is equally true on *every* screen, because after this change every `.scr-head h2` at ≤767 is 44px tall. Settings' h2 and More's h2 both shift up by the same ~10px, so `Math.abs(more.text - settings.text)` stays ≈0. `more.boxH >= 44` is satisfied by `min-height` alone. Green.

What actually breaks on screen in that state: the title text sits ~10px above the vertical centre of its own 69px header, i.e. ~10px above the `.scr-back` chevron and the action button beside it — on all nine screens ≤767. That is precisely the misalignment R17 exists to fix, and it is invisible to this test.

The comment at `:83-84` states the opposite (*"the box centre and the text centre coincide only while align-items:center holds"*) — true of the h2 in isolation, and irrelevant to an assertion that compares two h2s to each other. This is the file's own roster entry 205 shape: a two-sided comparison where both sides move together.

**Verify:** delete `display:flex;align-items:center` from `css/style.css:3855`, leave `min-height:44px`, run the spec. I expect green. Then look at Settings at 390 — the title will be sitting above the chevron.

**The assertion that would fail:** title text centre vs the `.scr-back` glyph centre *on the same screen* (title-to-button), which is the visual claim being made. Confidence in the mechanism: high — I traced the box model rather than running it, but the flex-item/`min-height` interaction here is unambiguous.

**Decision: TAKEN, and the repro was run first — green, exactly as predicted.** The fix adds the same-screen title-vs-glyph anchor the finding names. ⚠️ The FIRST draft of that anchor was itself vacuous — it measured `#tab-settings` while another pane was showing, so both rects were zero and zero agrees with zero (roster 205 again, one level down). Caught by re-running the finding's repro against the fixed test and watching it stay green; the anchor now navigates to Settings first and refuses zero-height rects. Verified: green on correct CSS, red under the exact repro.

### 2. MINOR — the `--lrow-min` comment describes a table that does not consume the token

The token comment ends: *"Taller content (the 768-1023 band's wrapped Ingredients sentences) still grows past it; this is a floor, not a height."* The "wrapped Ingredients sentences" is `.king-link` on `.king-row` — which is **not** one of the three converted tables and still reads `min-height:0`. So the sentence claims a floor is beneath content that has no floor. Whether the omission is a defect is a separate question: `.king-row`'s identity cell is a two-line flex column at ≥768, so it is ~55-60px anyway and would never touch a 45 floor. That is a defensible exclusion — but nothing in the diff says so, and the one sentence that mentions the table says the opposite.

**Decision: TAKEN as a comment fix.** `.king-row` keeps `min-height:0` deliberately (its rows never touch a 45 floor), and the token comment now says so by name instead of implying coverage.

### 3. MINOR — the R18 assertion is stricter than the design, and passes only because of the fixture

`expect(h).toBe(token)` enforces *exactly* 45 on every row, and its comment says over-height means disagreement — directly contradicting the CSS's *"this is a floor, not a height"*. A legitimately taller row exists in real data (`.mnu-cost .cost-range` renders a second line for a dish with a min/max cost band); only the fixture's misc-line plates keep it green. False-red risk, not false-green — but the two comments cannot both be right.

**Decision: TAKEN as a comment fix, deliberately KEEPING `toBe`.** Weakening to `>=`-plus-one-exact was tried and rejected: it no longer catches the 45→44 token drift (the pill row's 44.5 re-opens the within-table inequality, and a `>=` form stays green on it — re-derived by running that mutation). The honest resolution is that exact equality is a property of THIS fixture, which deliberately contains no cost-range dish; the comment now states the fixture guarantee and instructs a future editor to split rather than weaken. Both comments now agree the token is a floor.

### 4. NIT — the `::after` comment's "dead space" claim is not what it measures

At 390 the right extension ends at x53 and the h2 text box starts at x50, so it overlays the first ~3px of the title's text box, not dead space. Harmless in practice; the left-edge half checks out exactly, which is what makes the right-edge half read as measured when it is not.

**Decision: TAKEN.** The comment now states the x53/x50 overlap and why it is harmless.

### 5. NIT — the new h2 rule re-introduces the specificity tie the file warns about twenty lines above

`.scr-head h2` is 0-1-1 — the same specificity as the generic `.panel h2`, winning on source order only, added directly beneath the note explaining why the neighbouring rule deliberately uses `.panel > .scr-head > h2` (0-2-1).

**Decision: TAKEN.** The rule is now `.panel > .scr-head > h2` and cites the note above it.

### 6. NIT — "Dashboard has a bare h2" is data-dependent

`#dashScopeSlot` holds a real 44px button whenever two or more menus are costed, so Dashboard's ≤767 header was already 69px for any café past that; the 47.5 observation holds only in the one-menu case, which is the only case the spec's seed exercises. The fix is right at both, so this is comment precision, not a defect.

**Decision: TAKEN.** The R17 comment now states the data dependence — and it explains a measurement this batch had already taken (the real café's Dashboard captures showed zero changed pixels, because its two menus mean the button was already there).

## Areas the reviewer checked and found clean

Cache version (all six spots at 193) · the workflow's 53/52 spec count · R18 cascade (all three consumers inside ≥768, box-sizing arithmetic holds, no spec pins the old heights) · R17 h2 side effects on all nine screens (no ellipsis broken, seven screens genuinely unchanged, `.bld-head` genuinely has no h2) · the `::after` hit area (paints above the h2, nothing interactive covered, no overflow, no `:focus-within` stand-down needed) · the 1024 viewport choice · seed fidelity (the verdict-pill row that decided the token's value really renders).
