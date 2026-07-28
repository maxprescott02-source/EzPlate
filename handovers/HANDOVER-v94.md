# HANDOVER v94 — Dashboard density: match the approved mockup

**Completed:** 28 Jul 2026 · branch `fix/dashboard-density`, off `main` at `f58a5e5` (v93 + the
menu_price_history RLS migration, PRs #32/#33 both merged before this batch started).
Brief: `ezplate-fable-dashboard-density.md`. Presentation only — no data, no logic, no handler,
id or class changes.
Baseline 485 node green. Ended **485 node green**, jsdom smoke green (24 sections), `node -c`
clean, **70 of 71 Playwright green** (the one red is the pre-existing known-stale `v45 item 4:
button copy` pin in fresh-states, red on unmodified main too), six spots → **v94**. No
migration. CodeRabbit (CLI 0.7.1, uncommitted): **zero findings**.

---

## What changed, by brief item

Stages 1/2 (v89/v90) shipped the right structure at roughly 3–4× the approved mockup's density.
Everything below compresses presentation only; measured result: the mobile dashboard went from
**1409px to ~1100px of scroll** on the same seed, the chart from **211px to 105px** tall.

### 1. Overall density — one scoped CSS section
All rules live in one `/* ===== batch (v94) ===== */` block at the end of `style.css`, every
selector scoped under `#dashBody`, tokens only. Zones now sit 8px apart (`gap: --sp-2`; panel
margins zeroed — the flex gap IS the seam), `.pad` drops its dead top padding, headings go
quiet (`color: --muted2` — colour only, see the pinned-skeleton note below), hints drop to
`--fs-xs`, and the stat blocks close up under the chart.

### 2. Chart
- `trendChart` viewBox **H 210 → 104** (`W`, `padL`/`axGap` gutter, `padT`/`padB`, tick/domain
  generation, target-line rule, scrub wiring: all untouched, per the brief's exclusions).
- With the domain logic unchanged, the line sits mid-plot at the new height (verified on a
  near-target seed: data 28.2–29.8% on domain 25–33 = the middle band). The old "top edge"
  reading came from the 210px plot making the below-line fill enormous, not from a domain bug.
- Dotted fill: pattern opacity **.28 → .15**, dot grid 6→7px, r 1.1→1 — reads as texture, the
  line is the focus. Still `pattern#tcdots` (pinned by fresh-states).

### 3. Menu selector
Still the Menu tab's `.menu-picker-row` + native select (pinned by v89-dash.spec). One scoped
rule un-stretches it: `flex:0 1 auto; width:auto`, `--fs-sm`, 8×12 padding — a compact inline
control instead of a full-width bar, same control family as everywhere else.

### 4. Prose → one hint line each (meaning kept)
- Trend sentence: "Average food cost across all menus — trending down (margins improving)." →
  **"All menus · trending down (margins improving)."** (v89 scope honesty + direction survive).
- Scope note (menu selected): → **"Per-menu history is still building — this line covers all
  menus."** Also quietly fixes the old line's claim that recording started "today", which had
  been drifting since v89 shipped.
- By-menu note: → **"Ranked by average food cost % — cost efficiency, not earnings (no sales
  figures)."** The pinned phrases `Ranked by average food cost %` and `no sales figures`
  (dash-scope.test.js) both survive compression, deliberately.

### 5. By-menu rows and Dig in
- `.mcmp-row` padding halved; the row is a button, so its **44px min-height stays**.
- `.dig-card` padding tightened (100px → 77px tall), grid gap 12→8px.
- `.dig-row` (drill-down list rows) slimmed to min-height 36px — see pinned-contract change.

## Pinned contracts touched — both deliberate, in the same commit

1. **`v90-flows.spec.js` "touch targets" test: dig-row floor 44 → 32.** Those rows are display
   rows — no handler, nothing to tap — so the touch floor never applied to them conceptually,
   and the approved mockup draws them slim. The dig **card** and **back arrow** assertions stay
   at 44px and pass. Comment added at the assertion.
2. **`layout-consistency.spec.js` was NOT changed — the code was.** My first cut moved the
   dashboard's panel-top and h2 geometry; that spec correctly failed ("one panel skeleton
   across all five tabs"). Final version keeps the skeleton identical (panel top offset, h2
   padding/divider) and takes only the un-pinned colour quiet. If a future pass wants the
   mockup's 10px eyebrows app-wide, that's a five-tab brief, not a dashboard override.

## Judgement calls

- **No By-menu sparklines**, though the mockup row is name · sparkline · figure. A sparkline
  needs per-menu history depth; that series only started accumulating at v89 and CLAUDE.md's
  standing list explicitly defers the menu-aware chart/sparklines until points exist. Drawing a
  one-point sparkline would be fabricated shape. The slim row treatment ships; the sparkline
  slot is ready when the data is. Same reasoning for the mockup's per-menu trend arrows
  (`28.4% ↓`): deriving a per-menu direction is new data on screen, out of a
  presentation-only batch.
- **The "How today's average compares" stat block stays.** The mockup doesn't show it, but
  removing content is not a density fix, and the brief's scope is presentation. It's tightened,
  not deleted.
- **Verdict number left at `--fs-xl`** (mockup's is ~36px). Enlarging type wasn't in the five
  fix items and the app has no larger token; flagging rather than inventing one (hard rule 4's
  spirit). Listed below for Max.
- **Chart empty-state untouched** — it hides the svg and sizes itself, so the H change can't
  squash it (checked).

## Root cause worth remembering

The v89/v90 density miss wasn't padding taste — it was **reusing the app-wide panel skeleton
verbatim** (20px pads, 16px seams, brand-loud headings) on the one tab whose job is glanceable
aggregate reading. The fix pattern — a scoped override section, tokens only, skeleton geometry
preserved — is repeatable if any other read-only surface needs the same treatment.

## Verification

- `npm test` 485 green before and after every item; `node -c js/app.js` clean.
- jsdom smoke green (rendering/wiring touched → required).
- Full Playwright: 74/75 green at 380px and 1280px, both themes (fresh-states' v45 copy pin
  was red on baseline main and stays red — not this batch's).
- CodeRabbit CLI on the diff: zero findings, nothing to adjudicate.
- Flow-test run on the restyled dashboard, per the brief: all four dig-in drill-downs and
  back, scope selector + By-menu scope switching, every range button, scrubbing (tooltip
  shows), both themes at 380px and 1280px — zero defects, zero UX findings, no horizontal
  overflow, no console/page errors, no clipped text, and a Products-tab check confirming the
  dashboard-scoped CSS didn't leak. (The flow-tester agent died three times on infrastructure
  connection errors, so the same checklist ran as a scripted Playwright pass instead. One
  lesson kept in CLAUDE.md: never run two browser suites concurrently here — the contention
  reads as 15-minute phantom test failures.)
- Review screenshots (`tests/visual/__shots__/density-*.png`, gitignored) taken on a
  near-target seed and an insights-firing seed, light+dark, 380/1280.

---

## Second pass (same batch, 29 Jul): desktop bento grid

Max's follow-up brief: at desktop the dashboard was one tall left column beside a 2–3 line
insights card — half the right side dead. Layout and spacing only, mobile untouched.

**What changed (all inside the v94 CSS section + one svg mask in `trendChart`):**
- `#dashBody` at ≥1024px is now a **12-column grid**, rows `auto 1fr`: chart card cols 1–7
  spanning both rows; WHAT NEEDS ATTENTION cols 8–12 row 1; BY MENU cols 8–12 row 2;
  DIG IN full-width row 3, four cards across. The explicit `1fr` row matters: without it the
  spanning panel's height distributes across both tracks and opens a hole between the two
  right-hand cards.
- **The scope selector rides beside the verdict** (a 2-col grid inside `.dash-panel .pad`) —
  the card no longer spends a full row on it. Gotcha for the next person: grid items with
  `margin:0 auto` (`.dash-chart`, `.chart-controls`) don't stretch — they collapsed to the
  svg's 300px default intrinsic width until given `width:100%`.
- **COMPARES is a slim 3-up strip** under the chart (label over verdict per cell) instead of
  three stacked full-width lines — the brief's "own compact region", done without moving
  markup.
- **BY MENU stretches to the chart card's floor** with `.mcmp-note` anchored at the card
  bottom (`margin-top:auto`), so residual height reads as air inside one card, not a hole in
  the grid; it shrinks as real data grows the insights and menu lists. Columns end flush
  (measured `panel.bottom − compare.bottom = 0` at 1024/1280/1440/1680).
- **Dotted fill vertical extent**: a `userSpaceOnUse` luminance mask (`#tcfadem`) fades the
  area fill to nothing at the plot floor (both themes, both breakpoints — it's the same svg).
  `pattern#tcdots` still exists; fresh-states' pin passes.
- Chart card height 518 → ~452 at 1280; left/right columns balance at every checked width.

**Verified:** 485 node green, jsdom smoke green, `node -c` clean, full Playwright 70/71 alone
(same single stale v45 pin), measured no overflow and flush columns at 1024/1280/1440/1680,
screenshots both themes. Version stays **v94** — same unmerged PR, one deploy, one bump.

## Needs Max's phone

- The whole point of the batch is *feel* — is the dashboard now scannable in one glance on the
  real device? 380px Chromium says yes; only the phone says true.
- The compact chart under a thumb: scrub still usable at 105px tall? (Pointer logic untouched,
  but the target is smaller.)
- The slim dig-in list rows (36px) — comfortable to read in the drill-downs?
- Dark theme: the .15-opacity dotted fill — still visible enough on the phone's panel, or too
  faint?
- The two-line wrap of the By-menu hint at 380px — acceptable, or want it shorter still?
- Open question for a future brief: mockup's ~36px verdict number (needs a type-scale
  decision), and the untracked `ezplate-dashboard-mockup_1.html` at the repo root — commit as
  the design reference or keep out of the tree?
- (Desktop pass) A laptop/desktop eyeball of the bento: does the COMPARES 3-up strip read
  clearly, and is the faded dotted fill still legible on a real screen in dark theme?
