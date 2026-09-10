# REVIEW-258-contrast-tokens

Reviewed-commit: 66ec737609cda292ac46687a24b52b7205ee9e4b

`code-review` agent, Sonnet against Opus, on `git diff main...HEAD`.

**Three findings, all real, all fixed** — and the first one is the batch's own claim being wrong,
not a gap in it.

---

## The report, verbatim

## Findings

**1. MAJOR — the dark-mode switch-track boundary still fails the 3:1 the whole change exists to hit, and the comment that excuses it measures the wrong pair of colors**

`css/style.css:178-181` (comment) and `:206-207` (tokens).

The light-theme defect that motivated `--sw-edge` was measured as **track vs. card**: `.switch-track`'s fill (`--border-2` `#E3DCCF`) against the settings card (`--surface` `#FFFFFF`) = **1.36:1**. The fix adds a 1px border in that color pair's stead.

For dark, the comment claims *"Dark was fixed in v136 (the --knob pair above) and measures 7.87, so it is deliberately left alone."* That 7.87 is **knob vs. track** (`--knob` `#E4E3E1` vs `--border2` dark `#3F4247`) — a different boundary that was never the problem. The actual track-vs-card figure in dark, using the real markup (`#setAiInvoiceChk`/`#setAiSuggestChk` switches sit in `.stg-card{background:var(--surface)}`), is `--border-2` dark `#3F4247` against `--surface` dark `#232528` = **1.52:1** (or 1.63:1 against `--surface-2`) — essentially the same magnitude of failure as the light defect this diff was written to fix, and `--sw-edge` resolves to `transparent` in dark, so no border is applied there at all.

How to verify: compute WCAG contrast of `#3F4247` vs `#232528` directly (I did, via the standard relative-luminance formula: 1.523), or measure `.switch-track` in a real dark-mode render the way `tests/visual/200-pack-unit.spec.js` measures `.pt-explain` — get its computed `border-color`/`background-color` and the first opaque ancestor background.

Confidence: high on the arithmetic (plain two-flat-color contrast, no nested-tint subtlety); high that this is the shape of bug the task asked to look for — a guard/justification that checked the wrong quantity and is not merely under-conservative.

**2. MAJOR — a third destructive control still hardcodes the old fainter tint border, contradicting the diff's own "every bordered control, in the token" rule**

`css/style.css:3313` — `#kingModalRemove{margin-right:auto;color:var(--bad);border-color:var(--bad-bg)}`.

This is the kitchen-ingredient modal's delete button — its own adjacent comment (line 3309-3310, pre-existing) calls it "the modal's muted destructive action." It still borders itself with `--bad-bg` (the tint), the exact defect this diff fixed for `.mnu-del` (comment: "not 1.40" → `--danger-ctl-br`) and `.btn.danger` (comment: "bordered itself with --bad-bg, the tint, which is fainter still... Fixing only the one that was measured would have been the exact mistake that sentence forbids"). The diff's own comment at line 200-205 states the item's requirement was to decide **once, in the token, for every bordered control**, and states it was applied to "BOTH" destructive buttons — but a third exists and was missed.

Measured: `--bad-bg` (`--danger-bg`) against `--surface` (its actual rendered background, since `.btn.ghost` makes the base `transparent` and the modal card beneath is `--surface`) = **1.16:1 light, 1.08:1 dark** — both far under 3:1, effectively no visible boundary in either theme, on a real delete control.

How to verify: render the kitchen-ingredient edit modal, click an ingredient with usages so Remove is visible, inspect `#kingModalRemove`'s computed border color against its background in both themes.

Confidence: high — direct token trace, same computation method the diff itself uses at its own comment sites.

**3. MINOR — the Playwright comment cites the rejected token value and repeats the exact rounding mistake the CSS comment next to it warns against, though the assertion itself is correct and not flaky**

`tests/visual/200-pack-unit.spec.js:93-100`. The comment says *"`--text-3` is light #776B5C / dark #96938F... Re-measured here — 4.50 light, 4.66 dark... it clears by 0.004."* `#776B5C` is the **rejected** value — `css/style.css:150-159` explains it was discarded because its real contrast (4.4961) only *displayed* as "4.50" due to `toFixed(2)` rounding, and it never actually cleared the floor. The shipped token is `#766A5B` (`css/style.css:166`), whose real contrast against the element's actual background (`--danger-bg`) is **4.5627** — a margin of ~0.06, not 0.004. The dark figure (4.66, against `#96938F` on dark `--danger-bg`) happens to check out (4.664).

Net effect: the assertion (`toBeGreaterThanOrEqual(4.5)`) is sound and not flaky — the real light margin is over 15× larger than the comment claims — but the comment misrepresents both the deployed color and how tight the bound is, in the same file whose sibling comment explicitly warns "do not quote a contrast figure at 2dp when the decision is whether it clears a bound." A future reader trusting this comment would believe the test is on a hair-trigger when it isn't, or could hand-verify against the wrong hex.

How to verify: `grep "text-3:#" css/style.css` shows `#766A5B`; compute contrast of `#766A5B` vs `#FBEBEA` (light `--danger-bg`) = 4.5627, vs the comment's `#776B5C`/"4.50"/"clears by 0.004."

Confidence: high — straightforward hex/value cross-check.

## Checked and found correct
- Cache version: all 6 spots agree at v212 (index.html ×2, sw.js `CACHE` + 2 `ASSETS` entries, `js/app.js` `APP_VERSION`).
- Switch geometry: `box-sizing:border-box` (global) means the added 1px borders on `.switch-track` and its `::after` knob do not change outer width/height at either breakpoint (38×22/18px knob and 44×26/22px knob), and `translateX(16px)`/`translateX(18px)` remain correct for the checked state at both sizes — verified arithmetically.
- `--danger-ctl-br` values (`#A3908E` light / `#806A65` dark) measure 3.03/3.05 against their real surfaces as claimed — confirmed by direct computation, not just trusted.
- `--sw-edge` light value (`#98938B`) measures 3.05 against `--surface` as claimed.
- `--danger-br`/`--danger-border` were correctly left untouched on the three tinted message boxes and the offline banner (`.bld-warn.bv-red`, `.envbadge`, `.acct-err`, `.sync-banner`) — none is a control, so 1.4.11 doesn't reach them.
- `@media (hover:none)` reset for `.btn.danger:hover` correctly points at the new `--danger-ctl-br` (resting value) rather than the stale `--bad-bg`.
- `--text-3`/`--text-2` hierarchy ordering (text < text-2 < text-3 in luminance) is preserved in both themes, though the *separation* between text-2 and text-3 shrank substantially (light: 2.12:1 → 1.20:1; dark: 1.73:1 → 1.30:1) — this is a legitimate readability/hierarchy-softening side effect worth being aware of, but it's not a WCAG requirement and I'm not confident enough it's wrong to call it a finding rather than a note.

Files referenced: `css/style.css`, `tests/visual/200-pack-unit.spec.js`, `index.html`.

---

## What was done about each

### Finding 1 — FIXED, and it is the sharpest thing in the batch

**Confirmed by computing both pairs.** `#E4E3E1` on `#3F4247` = 7.87 (knob on track). `#3F4247` on
`#232528` = **1.52** (track on card). The v136 block in this very file says *"a light knob when off
(7.87:1 on --border-2)"* — it names its own pair correctly, and the figure was then carried through
batch 229's decision file and into this batch's comment as though it answered a different question.

⚠️ **The consequence is not a code defect, it is that MAX WAS TOLD DARK WAS FINE in the decision he
answered.** The question he was shown said *"Dark mode was fixed in v136 and reads fine at 7.87;
this is the light case only."* That was wrong, and nobody asked which boundary the number described.

**So the dark edge is an EXTENSION of his answer, not his answer, and it is labelled as such at the
site.** He chose "outline track and knob" for this defect; the defect turned out to exist in both
themes. It was taken rather than deferred because the cost is one hairline and one token to reverse,
while the alternative was shipping a control that fails the criterion the whole change exists for,
under a comment claiming it passes. `--sw-edge` dark is `#6E7075` — 3.10 on `--surface`, 3.33 on
`--surface-2`, and still 3.86 against the knob so the two never merge.

**This is `CLAUDE.md`'s "a comment can record the defect CORRECTLY and file it under the wrong
consequence", except the observation was not even mine** — it was inherited, twice, and repeated with
confidence each time. **A number carried forward from another document is a claim, and "which two
things does this measure" is the question nobody asked of it.**

### Finding 2 — FIXED

`#kingModalRemove` at 1.16 light / 1.08 dark, under a v115 comment describing it as *"a visible edge
at rest"* — a correct intention filed against the wrong value, which is the same shape as finding 1.
Now on `--danger-ctl-br` with the other two.

⚠️ **It was missed by a comment that had just finished quoting the rule against fixing only the
controls you measured.** The remedy in that comment is now the general one: **grep the token, not the
screens you happen to be thinking about.**

### Finding 3 — FIXED

The comment cited `#776B5C` and "clears by 0.004" — the rejected value and its rounding artefact —
one file away from the CSS comment warning against exactly that, written in the same change. It is
`#766A5B` and clears by ~0.06.
**That the stale figure survived into the comment warning about stale figures is the point, and it is
recorded rather than quietly corrected:** a number in prose is checked by nothing. Only the assertion
is, and the assertion was right the whole time.

### The note about `--text-2` / `--text-3` separation — considered, no action

The agent flagged, without calling it a finding, that the *gap between* the two text greys narrowed
(light 2.12 → 1.20, dark 1.73 → 1.30). That is real and it is the known cost of this token, written
into the DEVIATIONS block since v132: darkening `--text-3` walks it toward `--text-2` and collapses a
three-level hierarchy. The shipped value is checked against that bound — `#766A5B` is 5.27 on white
against `--text-2`'s 6.35, still clearly two levels, and the block's standing instruction not to
darken further to chase the hover wash is unchanged. Recorded here so the next reader knows it was
weighed rather than missed.

**After the fixes, measured on the real controls in Chromium with transitions disabled, both themes:**

| | light | dark |
|---|---|---|
| switch track edge vs card | 3.052 | 3.100 |
| switch knob edge vs card | 3.052 | 3.100 |
| `.mnu-del` / `.btn.danger` / `#kingModalRemove` | 3.027 | 3.049 |

The track FILL remains 1.363 / 1.523 **by design** — he chose "outline the track and knob" over
"darken the whole track", so the soft fill is kept and the edge carries the boundary.

`npm test` 2168 pass / 0 fail · Playwright 478 passed, 14 skipped · smoke green · `node -c` clean.
