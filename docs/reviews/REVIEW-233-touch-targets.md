# Review — batch 233 (UI audit Phase 2 step 4: R5+R6 touch targets)

Reviewed-commit: 1853280
Addendum range: 1853280..7a1c3fc (the fixes to these findings; report appended below)
Reviewer: `code-review` agent forced onto Opus, diff only, no brief shown.

## Decisions, up front

Every finding taken. M1 fixed (`.pchip` ±9→±10); M2's comment rewritten with the
right mechanism (the 1px border term, not pixel-snapping) and the measured
figures (43/47); M3's figures corrected everywhere they were stated (CSS
comment, audit row, PHONE.md); M4 answered with a fourth spec test pinning the
gate rules from both sides — and its first mutation run showed the `bg-alt`
override was needless (deleting it causes no clip), so that rule is DELETED
and the swap links get the group's full 45px, pinned at ≥44; M5 fixed
(`position:relative` added); M6 answered by scoping the audit row's claim to
the resting state and naming the two states that move. N1 taken: probes
deepened to ±8.5 (pchip) and ±6 (range) so each assertion carries the 44px
claim itself.

Fix commit: 7a1c3fc. All mutations re-run against the final spec: gate
bg-privacy override deleted → red; #bgUpPrivacyLink rule deleted → red; group
padding 14→12 → red; pchip depth 10→9 → red; range depth 8→7 → red. Suites
after fixes: `npm test` 1830/0, smoke green, full Playwright 436 passed /
14 skipped / 0 failed.

## Verbatim report (initial run, commit 1853280)

### Critical
**None.**

### Major
**None.** No hit-area annexes a neighbouring control, the `:focus-within` guard is correct, the cascade is sound, and nothing clips or overflows. All measured, not reasoned — see the verification notes below.

### Minor

#### M1 — `.pchip` does not reach 44px effective. It is **43.73px**, and the shipped doc says 45.
`css/style.css:5413` · `docs/ui-audit-2026-09-02.md:179`

`top`/`bottom` on an absolutely positioned pseudo resolve against the containing block's **padding box**, and `.pchip` carries `border:1px dashed` (`css/style.css:545`). So `-9px` buys 8px of reach past the border box on each edge, not 9. Measured, at 390×900 in the builder, by binary-searching the outermost `elementFromPoint` hit:

```
offset -9px  → visual 26.75, hitTop 377.64, hitBot 421.37, effective 43.73  (above 8.98, below 8.00)
offset -10px → effective 45.73
offset -11px → effective 47.73
```

The batch's stated target is "~44px effective"; the audit row states **"a `::after` extension gives 45 effective"**. Both are false by 1.3px, and the actual figure is under 44. `top:-10px;bottom:-10px` gives 45.73 and costs nothing — the chip has 10.6px of clear space below (next `.bld-row` at y432 vs hit-bottom 421.4) and 13.7px above (`.bld-lc` bottom at y363.9), both non-interactive.

The pointed part: the block's own header comment spends a paragraph deriving the `.range-btn` shortfall and raising `±6 → ±8` for it, then applies **no** correction to `.pchip`, whose 1px border costs the same term. The reasoning was done once and not carried across.

*Confidence: high in both the measurement and the mechanism (the `-10px`/`-11px` ladder is linear at exactly 1px/edge, which is the border).*

#### M2 — the `.range-btn` figures in the comment do not reproduce, and the stated mechanism is wrong.
`css/style.css:5389-5393`

The comment says: *"nominal ±6 measured as ~±4.6 effective — the pseudo's box is pixel-snapped against the row's sub-pixel y, and each edge loses ~1.4px — so 32+9 ≈ 41. ±8 nominal ≥ ±6.6 measured → ≥45."*

Measured on `.range-btn:not(.act)` by the same binary search:

| width | rule in force | visual | effective |
|---|---|---|---|
| 900 | `±6` (base, item-7) | 32 | **42.98** |
| 700 | `±8` (this diff) | 32 | **46.98** |
| 390 | `±8` (this diff) | 32 | **46.98** |

So each edge gives ~5.5 and ~7.5, not ~4.6 and ~6.6; the ±6 baseline is 43, not 41. And the dominant loss is not snapping — it is `border:1px solid transparent` on `.range-btn` (`css/style.css:2750`), the identical padding-box term as M1. The comment records a real shortfall and files it under the wrong cause, which is exactly what let M1 through: had the cause been named correctly, the pchip's 1px border would have been obvious.

The conclusion (`±8` is enough) is still right. Only the arithmetic and the attribution are wrong.

*Caveat on confidence: these are macOS/Chromium at dpr 1. The absolute snapping term could differ on the Linux CI runner; the 1px border term cannot.*

#### M3 — the two boot-gate figures are 3px high, in the CSS comment **and** in the audit row.
`css/style.css:5438-5444` · `docs/ui-audit-2026-09-02.md:179`

Both say the gate links land at **"42px and 32px effective"**. Measured at 380×820 on the real gate:

```
#bgToSignUp   (.bg-alt a,     padding:12px 0 10px) → height 39
#bgPrivacyLink(.bg-privacy a, padding:12px 0 0)    → height 29
#bgUpPrivacyLink (padding 6/6)                     → height 29, effective 29.86
```

The content box is 17px, not the 20px the two figures assume. The third number (29) is right, which is what makes this a slip rather than a systematic error. Both are declared deliberate shortfalls, so nothing breaks — but the numbers are the whole justification recorded for the shortfall, and nothing pins them.

#### M4 — the three boot-gate rules are entirely untested; all three mutations survive.
`tests/visual/v192-touch-targets.spec.js`

Deleting each, then running the new spec (backup by `cp`, `diff -q` verified the mutation applied each time):

```
delete #bootGate .bg-alt a{padding:12px 0 10px}      → 3 passed   SURVIVED
delete #bootGate .bg-privacy a{padding:12px 0 0}     → 3 passed   SURVIVED
delete #bgUpPrivacyLink{padding-top:6px;…}           → 3 passed   SURVIVED
```

The first two matter more than "missing coverage": deleting them does not restore the status quo, it lets the group's `padding-top:14px;padding-bottom:14px` apply to the gate links — which is precisely the state the comment says *"v161/v162's 'nothing is clipped' assertion rightly refuses"*. I ran `v161-nonmember.spec.js` and `v162-signin.spec.js` in the full-suite pass and they are green **with** the overrides; nothing in the branch demonstrates they go red without them. So the comment's stated safety net is asserted, not shown.

*The rest of the block is genuinely load-bearing.* Five mutations, five kills:

```
delete .bld-rm{padding/margin/min-height}      → 1 failed
delete .pchip::after                           → 1 failed
delete .pchip{position:relative}               → 1 failed
delete .pchip:focus-within::after{content:none}→ 1 failed
delete .range-btn::after{top:-8px;bottom:-8px} → 1 failed
drop position:relative from the linklike group → 1 failed   (the "load-bearing" claim is real)
linklike padding 14px → 12px                   → 1 failed
pchip ±9 → ±7                                  → 1 failed
```

#### M5 — `#bgUpPrivacyLink` omits the `position:relative` the block three lines above declares load-bearing.
`css/style.css:5450`

The group rule states *"`position:relative` (no offsets) is load-bearing, not decoration"* — and the `M4` mutation proves it (dropping it turns the spec red). `#bgUpPrivacyLink` gets padding without it, with no note saying why it is exempt. Measured, it currently doesn't bite: computed `position: static`, and the full 29.86px is still hit-testable, because the anchor sits on the last line of its `<span>` and nothing in-flow paints over it there. But it is the one member of the batch that relies on a fact nobody stated and nothing checks — a reflow of that label (a longer sentence, a narrower phone) puts the following line's inline boxes over its bottom padding, and unlike its five siblings it has no defence.

#### M6 — "not one painted pixel moved" is scoped to the resting state; two states move.
`docs/ui-audit-2026-09-02.md:179`

- **Focus ring.** `button:focus-visible, a:focus-visible {outline:2px solid var(--accent); outline-offset:2px}` (`css/style.css:270`) draws on the *border* box. `.bld-rm`'s border box goes 15.5×36 → 42.53×44, so its keyboard ring is now 27px wider and 8px taller and lands 1px short of the row edge; the five anchors' rings grow 28px vertically and will overlap adjacent lines. A before/after static capture at four widths cannot see this.
- **Hover.** `.pchip:hover` repaints background, border-colour and colour (`css/style.css:549`). The `::after` is part of the element for `:hover`, so at ≤767 the chip now lights up from ~9px away. This matches the item-7 precedent for `.ms-clear`/`.range-btn`, so it is consistent rather than novel — but it is a painted pixel moving, at a width a narrow desktop window reaches.

Neither is a defect. The unqualified claim is the thing that is wrong.

### Nit

- **N1** — the `.pchip` assertions probe `chipBB.y ± 6`, while the rule delivers ±8.5. The comment is honest about this ("6px above and below the visual box still lands on the chip"), and the ±7 mutation does kill it — so it is not a test that cannot fail. But it pins *"≥6px beyond each edge"*, i.e. ≥38.75 effective, and the claim the batch actually makes is *44 effective*. That gap is exactly the 0.27px M1 lives in: the assertion is structurally unable to fail on the number the audit row states. `tests/visual/v192-touch-targets.spec.js` — the `.range-btn` test has the same shape (probes ±5 against a ±7.5 reach) but sits far enough from its own boundary that `-7px` still yields 45, so it is harmless there.

### Verified clean (checked, nothing wrong)

- **Six version spots agree** at v192: `sw.js:2` `CACHE`, `sw.js:5` (both `?v=`), `index.html:105`, `index.html:1770`, `js/app.js:7488` `APP_VERSION`. `tests/settings.test.js`'s sw.js cross-check passes.
- **Workflow count** — `52 specs, 51 survive` matches `ls tests/visual/*.spec.js` = 52 with one `screenshots.spec.js`; `tests/ci-workflow.test.js` passes.
- **No annexation, anywhere I could reach it.** `.pchip` right edge and `.bld-rm` border-box left edge are both at x=333.47 — they abut with a 0px seam and 0px overlap (half-pixel horizontal scan: `pchip` through −0.5, `bld-rm` from 0). `.bld-rm`'s right edge is at 376 against a row edge of 377, i.e. 15px into the 16px padding, so `fresh-states.spec.js:96` (`rmRight ≤ lineRight`) holds with 1px to spare — and the cited line number is correct.
- **The Settings privacy link does *not* steal the AI toggle**, though it comes closer than the comment suggests. Its padded box overlaps the switch's vertical band by **4.5px at every width from 305 to 767**. At 305, 375 and 520 it also overlaps horizontally (88 intersection points probed). Zero taps stolen at any of them — because `.switch input{position:absolute;inset:0}` (`css/style.css:3092`) is itself positioned and later in DOM order, so it wins the paint order the anchor's `position:relative` bought. The safety comes from the switch, not from anything in this diff.
- **`#invzPrivacyLink` vs `#invDropZone`** — link top is 34px below the dropzone's bottom; no overlap, 0 taps stolen. Height 45 ✓.
- **Cascade.** `a.linklike` (0,2,0) beats `.linklike{padding:0}` (0,1,0) at `css/style.css:1243`; the two `#bootGate …` overrides match their group counterparts at (1,1,1) and win on source order; `#bgUpPrivacyLink` matches none of the group selectors (it is in the sign-up label at `index.html:236`, not inside `.bg-privacy` at `:282`), so its (1,0,0) is uncontested. `.pchip:focus-within::after` (0,2,1) beats `.pchip::after` (0,1,1). No `[hidden]` exposure — every rule targets the `<a>`, not the `hidden` `<p>`.
- **`:focus-within` is correct.** `editPrice` (`js/app.js:1638-1648`) writes the `.pin` input into `chip.innerHTML`, so it is a descendant and `:focus-within` matches; `content:none` un-generates the pseudo rather than merely hiding it; deleting the guard turns the spec red.
- **Zero layout movement is real, and provable rather than eyeballed.** `.bld-rm` is a grid item in an `auto` track whose contribution is its *margin* box: 42.5 − 27 = 15.5, unchanged; `min-height:44` with `margin:-4px` top/bottom gives an outer 36, unchanged; the glyph's centre is at `trackRight − 7.75` before and after. Measured row height 110.3 on both rows, `.bld-rm` at 42.53×44, `#lines` unchanged.
- **No clipping or overflow.** `#bootGate .bg-inner` `scrollHeight === clientHeight` (336/336) on both the sign-in and sign-up gates at 380×820.
- **`a.linklike` really is one element** — `index.html:990`, the tel: link. Every other `.linklike` is a `<button>` and already clears the `button,.btn,.navbtn,input,select{min-height:44px}` floor at `css/style.css:249`. The comment's claim that the audit misread this is correct.
- **`.pchip` has exactly one emit site** (`js/app.js:1762`, `renderPlate`), so the ≤767 rule cannot reach a screen nobody looked at.
- **No regressions.** Full Playwright: 435 passed, 14 skipped, exit 0. `npm test`: 1830 passed.

## Addendum report (range 1853280..7a1c3fc)

Run on Sonnet — the first addendum attempt on Opus died mid-run on a spend
limit (HTTP 429) and was relaunched; Sonnet is still a different model from
the Fable batch runner, which is what the independence rule requires.

**Decisions on its two findings, both taken in the follow-up commit:** the gate
test's rect-read deviation from the spec file's own hit-test standard is now
acknowledged at the site with the addendum's reasoning; the "each edge loses
~1px" comment is reworded to the measured asymmetry. The process note about
this file's empty addendum section is discharged by this very section.

### Verbatim

#### Summary
No critical or major findings. The fix commit correctly addresses every finding in `docs/reviews/REVIEW-233-touch-targets.md`'s initial report, and I could not break any of its new assertions by reverting the specific defects they were written to catch. One minor doc/process gap and one nit.

#### (1) `tests/visual/v192-touch-targets.spec.js` — new gate test and the tightened `.pchip`/`.range-btn` probes

Not vacuous. I mutated each rule the test depends on and confirmed a red result in every case:

- Reverted `#bgUpPrivacyLink` padding to 0 → `h('#bgUpPrivacyLink') >= 28` fails (17 < 28).
- Removed `#bootGate .bg-privacy a{padding:12px 0 0}` → `clipProbe()` goes `true` (scrollHeight 348 vs clientHeight 336), and separately `v161-nonmember.spec.js`/`v162-signin.spec.js` both go red at 380 (their own `scrollHeight>clientHeight+1` assertions), exactly as the new code comment claims.
- Re-added the deleted `#bootGate .bg-alt a{padding:12px 0 10px}` cap → `h('#bgToSignUp') >= 44` fails (39 < 44).
- Weakened the group rule from `14px/14px` to `12px/12px` → same assertion fails (41 < 44).
- Reverted `.range-btn::after` to `±6` → the new `hit(..., bb.y±6, ...)` assertion fails (was previously passing at the old, shallower `±5` probe — the tightened probe genuinely can't pass against the old rule).
- Reverted `.pchip::after` to `±9` → the new `hit(..., chipBB.y±8.5, ...)` assertion fails (was previously passing at the old `±6` probe — same story, and this is precisely the review's N1 finding being closed).

No vacuous selector: `h()` calls `document.querySelector(s).getBoundingClientRect()` with no null guard, but every id in the test is always in the DOM (hidden state elements still exist, `getBoundingClientRect()` on a `display:none` ancestor just returns a 0-height rect, which correctly fails the `>=44`/`>=28` assertions rather than passing vacuously — confirmed this is a real fail path, not a silent pass).

One thing worth naming: the new boot-gate test uses `getBoundingClientRect().height`, not the file's own stated standard of a real `elementFromPoint` hit test (the file's header comment says "every assertion here is a REAL HIT TEST … never a computed-style read"). In this specific case it isn't vacuous — I confirmed `getBoundingClientRect()` on these inline anchors does report the full padded box (verified against direct `elementFromPoint` probing at the same coordinates, which independently agreed with the rect height) — but it's a genuine deviation from the file's own design rule, and it means the gate test doesn't itself prove hit-testability the way the other three tests do. Minor, not a functional bug: `clipProbe()` plus the height check happen to add up to real coverage here, but a future reader following this file's own stated pattern would expect a hit-probe, not a rect read.

#### (2) Deleted `#bootGate .bg-alt a{padding:12px 0 10px}` override

Measured directly at 380×820, signed-out, real DOM (not synthetic):

- `#bgSignBtn` bottom edge: `y=498.75`. `#bgToSignUp`'s now-unclamped padded box starts at `y=501.75` — a 3px gap, no overlap. `elementFromPoint` at the button's bottom edge +0..+2px resolves to `bg-inner` (empty space), not `#bgToSignUp`, at every offset I tried. **No tap is stolen from the sign-in button.**
- `.bg-inner` clipping: confirmed empirically that `scrollHeight > clientHeight` is a real, working signal here — Chromium counts an inline descendant's ink-overflow padding (the anchor's bottom padding extending past its parent `<p>`'s own box) as scrollable overflow even under `overflow:visible`, so the clip probe genuinely fires when the `.bg-privacy` override is removed (348 vs 336) and stays flat (336/336, 408/408) with the diff as shipped, in both the sign-in and sign-up states.
- `v161-nonmember.spec.js` and `v162-signin.spec.js`: ran unmodified, both fully green (15/15). Ran again with the `.bg-privacy` override deleted: both go red on exactly their clip assertions, confirming the code comment's claim ("deleting this override re-clips the gate … turns v192's clip probe red") is true in both directions.
- The claimed arithmetic checks out: `.bg-privacy`'s un-padded gap above it really is 24px (`.bg-inner`'s `gap:var(--sp-4)`=16px + `.bg-privacy{margin:var(--sp-2)}`=8px), and the measured heights (45 for the swap line, 29 for both privacy links) match the comments exactly.

No defect found here — the deletion is correct and the geometry claims hold up under direct measurement, not just the tests.

#### (3) The ±10/±8 `::after` depths and the "1px border" comment

The mechanism is real and I confirmed it precisely via `getComputedStyle(el, '::after')`: `.range-btn`'s `::after` with specified `top:-8px` resolves its containing block against the **padding box** (border-box height 32, minus 2×1px border = 30), giving a computed pseudo-height of 46px rather than the naive 48px a border-less model would predict — an exact 2px (1px/edge) loss, matching the comment.

However, direct `elementFromPoint` binary search shows the loss is **not evenly split**: for `.range-btn` the true reach is ~7.95px above the border box and ~7.0px below; for `.pchip` it's ~9.95px above and ~9.0px below. One edge loses essentially the full 1px, the other loses almost none. The new comment's "each edge loses ~1px to the border" reads as symmetric, and measured behavior is asymmetric — though the comment does hedge with "(plus a sub-px snapping crumb)," which is broad enough to cover the asymmetry after the fact rather than predict it. This doesn't affect correctness: the pinned test thresholds (±6 for `.range-btn`, ±8.5 for `.pchip`) sit safely under even the *worse* of the two real edges in both cases, so nothing is at risk of flipping on a rendering engine or DPR difference in the shipped assertions themselves. Flagging as a documentation-precision nit only, per this repo's own recorded trap about comments that are right about the effect but not quite right about the mechanism.

#### (4) Corrected figures in `css/style.css`, `docs/ui-audit-2026-09-02.md`, `docs/PHONE.md`

Spot-checked the load-bearing numbers against measurement, all consistent:
- `.pchip` ±10 effective ≈ 45.7-46 measured (doc says "~45.7") — confirmed via `hit()` boundary search (true edges ~9.0/~9.95).
- `.range-btn` ±8 effective ≈ 47 measured (doc says "~47") — confirmed (true edges ~7.0/~7.95, total 32+7+7.95≈47).
- Boot gate: "12px top into the 24px gap above; 29px effective (17px line + 12)" for `#bgPrivacyLink`, and the equivalent for `#bgUpPrivacyLink` (6+17+6=29) — both match measured `getBoundingClientRect` heights exactly (29 in both cases).
- `docs/QUEUE.md`'s batch-233 line and `docs/ui-audit-2026-09-02.md`'s R5+R6 row correctly describe what shipped (the override deletion, the two-of-three corrected audit readings, the M6 scoping caveat about focus rings and hover). No discrepancy found between the prose and the code.

#### Process note (not a code defect)
`docs/reviews/REVIEW-233-touch-targets.md` ends its initial report with `## Addendum report (range 1853280..7a1c3fc)` followed only by `(appended when the addendum run returned — see below)` — the promised addendum content was never written into the file (146 lines total, nothing after that line). Not something this diff's code is wrong about, but worth flagging since the file is the artifact this repo's merge gate and CLAUDE.md's review-recording rule both point at.

#### Full-suite results
`npm test`: 1830/1830 passed. Targeted Playwright runs: `v192-touch-targets.spec.js` (4/4), `v161-nonmember.spec.js` + `v162-signin.spec.js` (15/15), `item2-privacy.spec.js` + `209-cafe.spec.js` + `v165-invite.spec.js` (32/32) — all green, unmodified.
