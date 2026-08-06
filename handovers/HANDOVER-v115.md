# HANDOVER v115 — batch C: the dashboard the app has been building toward

**Branch:** `feature/v115-dashboard-batch-c` · off `origin/main` @ `a735e77`. **Date:** 7 Aug 2026.
**Brief:** `~/Downloads/ezplate-batch-c_1.md` + mockup `ezplate-dash-cogs-reframe.html` (the
author's sketch — four binding requirements, the rest explicitly didn't bind).

**Suite at close:** `npm test` **752 green** (722 → 752: +12 `history-paths`, +17 `trend-reframe`,
+1 boot-gate timer pin) · jsdom smoke green · Playwright **100/100** (94 existing + 6 new
`v115-reframe`) · `node -c` clean · booted against production Supabase from the working tree and
driven in a real browser, both themes.

**The batch-size and model questions the brief asked:** answered in the plan and held — one batch,
one PR, one model (Fable). The `logHistory` strand looked like it might want Opus from chat;
exploration reduced it to six mechanical insertions at sites v114 had already instrumented.

---

## Strand 1 — the six `logHistory` gaps are closed

The enumeration was re-verified against the code before anything was edited: **it matches v114's
twelve paths exactly, no new paths in either direction** (the first enumeration in this project to
come back the same as its brief — because the brief WAS v114's enumeration).

**No funnel, and the decisive reason is membership, not mechanics.** `commitPrice`, `saveIngEdit`
and `applyInvoice`'s price branch must fire `logHistory` but must NEVER touch the change log —
supplier drift is the thing being measured — so `logChange` cannot be the choke point by
construction. Fifteen call sites through one new helper would have been more surface, not less.
Six targeted additions instead:

| Path | Where | The trap it respects |
|---|---|---|
| 2 `saveKingModal` | inside `if(moved)` | a pure rename must not stipple the line |
| 3 `confirmGuardedRepoints` | inside `if(done)`, once | one confirm = one point, not one per ingredient |
| 5 `deleteKitchenIngredient` | beside its logChange | the drop is real but has no saving behind it (comment at the site) |
| 10 `mmRemove` / `doDeleteMenuOnly` | **after `rebuildMenu()`** | `computeAvgFoodCost` reads `MENU`, stale until then — beside the logChange call it logs the PRE-delete average |
| 11 `deletePlate` / `doDeleteEverything` ×2 | **inside the `.then` success branch** | the only success-gated sites: the in-memory delete precedes the await, and an optimistic point would survive `rollbackPlateDelete` as a phantom drop |
| 12 `doDeleteMenu` | after `rebuildMenu()` | same stale-`MENU` trap as 10 |

**`tests/history-paths.test.js`** pins the POINT THAT LANDS (value and presence), not that a call
happened — necessary because **every other sandbox in the suite stubs `logHistory` empty**, so
before this file no test could catch a missing or misplaced call. Both trap tests were verified
red: the stale-`MENU` mutation makes path 10 log 3.8 instead of 4; the optimistic mutation makes
the failed-delete test see a phantom point. No backfill (brief's rule — reconstructing history
would invent evidence in the series the chart draws).

## Strand 2 — the chart reframed

**Colour is anchored to the target, not direction.** The old condition (`trendUp → --bad`) made
the chart permanently red: prices drift up during ordinary trading and only fall when Max acts.
Green now means at-or-under target — the same thing it means on Menu Analysis. The judgement about
drift lives in a faint over-target wash above the dashed line and in the since-line, not in the
slope. The "never change" comment on the old semantic was superseded deliberately and rewritten in
place. `mcmpSparkSeries` (By-menu sparklines) and the verdict follow — `scopeTrend`/`scopeHistory`
(the "↑ creeping up" clause, the same failure in words) are deleted with a tombstone.

**Markers = Max's work, from the change log.** Display rules (the data stays complete):
- an entry marks when its `avgBefore`/`avgAfter` **primitives** show a fall — never keyed on
  `kind`, which automatically handles the combined price-and-menu edit (v114's rule, pinned);
- **one marker per calendar day**, magnitude = summed fall (the invoice repoint loop writes one
  entry per ingredient in a single confirm; a picket fence under one decision would misreport it);
- dots always draw; the **magnitude label drops when within 30 viewBox units of a neighbour** and
  labels live in the empty x-axis strip, so several markers at 380px cannot collide; the scrub
  tooltip always carries the full sentence ("You made a change — down 1.4 pts");
- **an entry naming a deleted plate draws normally** (markers aggregate by day and never name
  plates; the movement was real) — the recommendation the brief asked for;
- **entries describing a restore-rolled-back state draw** — a restore does not un-happen an
  intervention (v114's own language).

**The since-line** (the mockup's signature element): reports the LATEST entry — "Your last change
cut 1.2 pts." / "No changes for 6 weeks." / "Your last change was 6 days ago." — then the drift
since its after-figure ("Costs up 2.1 pts since."). Warm-tinted only when drift has accumulated;
never names portions, products, suppliers or prices (binding req 4 — prescribing is the thing this
app decided not to do). Scoped via `menuIds`, which is written on every kind, so it never consults
`kind` either. Omitted entirely on an empty log.

**The first render of the change log was treated as verification, not formality.**
`menu_change_log` held 0 rows (checked through the MCP); nothing had ever rendered an entry. The
new `tests/visual/v115-reframe.spec.js` seeds entries through the real page in both themes at
380px and desktop, and the batch also drove the served working tree against production. What the
first look caught: the since-line's flex container split its two sentences into columns; the
caption's marker key wrapped mid-sentence; the figures didn't match the anchor line's `toFixed(1)`
style. All fixed. **Production ships the EMPTY state** — no markers, no since-line, green line
under target — verified clean in the real browser with real data (avg 21.9% vs 30% target).

**Tests that catch the old condition:** a rising line under target stays green AND a falling line
over target stays red — verified red against the restored direction-colouring. Plus: drop marks /
raise doesn't; combined `dish_price`+move marks; deleted-plate entry renders; same-day clustering
sums; out-of-range entries ignored; empty log clean.

## Strand 3 — loading and motion

- **One ring language** for the three spinners that all wait on the same `bootstrapSync`: track
  `--line`, head `--accent`, `.8s linear` (`.bg-spin` head was `--text2`, `.ptr-ring` was
  `--brand`, `.inv-wait-spin` follows). `ptr-rot` gets the explicit reduced-motion guard the other
  rings already had.
- **The insight flash**: three mechanisms found (post-paint `textContent` rewrite; the credit line
  APPEARING added a line box and shifted every panel below; grid reflow). The credit's space is
  now **reserved** (`visibility`, the `.scope-note` precedent) and only the network path fades its
  rewritten lines in (`.ins-swap`, ~280ms) — cache/session paths land before paint and must not
  blink on every render. The local pass still renders first, unchanged: it is the offline state
  and its content is correct; the transition was the glitch.
- **Tab-tap scroll**: the jump used to fire AFTER the full innerHTML rebuild (two visual states in
  one frame). A tab switch now scrolls first and renders at the top; re-tapping the active tab
  smooth-scrolls (the OS reduced-motion setting downgrades 'smooth' natively). PTR's settle joins
  the motion tokens (`--t-med`/`--ease`) — the last ad-hoc duration.
- **Cold start: reported, not built.** The ~1,138 ms is Supabase/PostgREST waking, not app latency
  (boot is one `Promise.all`, 181–333 ms warm) — nothing app-side removes it. The one
  in-proportion change: after 4 s the boot gate swaps to "Still loading — the first open after a
  break takes a little longer." A warm boot never sees it; the timer dies with the gate
  (pinned in boot-gate.test.js).

## Strand 4 — visual cleanup (say each thing once)

- **Menu row pips gone** (the left stripe already carried the light): `aRow` cell, uncosted-row
  cell, `<th>Light</th>`, both `colspan`s 6→5, the `nth-child(6)` CSS.
- **Chip dots gone; the light moved onto the active chip** — `.mlf-chip[data-light].on` wears its
  own colour on border/text/tint, so the key survives exactly where it is used. Idle chips stay
  neutral (three permanently-coloured chips would shout). **Judgement call — needs Max's eye.**
- **The suggested-prices meta line removed** (`#cogsTargetRead`/`#cogsToSettings`/`syncCogsRead`
  deleted with it). The Suggested column header carries the live target %. The pins in
  settings.test.js / smoke.js / fresh-states.spec.js now assert the DELETION.
- **"Cheaper like-for-like" removed**: `alternatives()` deleted; `renderKingAlts` keeps only its
  delegation to `renderKingCreateSuggest` (which shares the box and stays). Matching like-for-like
  honestly needs semantics the app doesn't have; a cheaper WRONG product is worse than no
  suggestion. Dead CSS deleted with tombstones, including the pre-v34 `.alt-*` block.
- **`.btn.ghost` keeps a visible edge** (`--border2`) — system change, all 18 uses checked; the
  two `.btn.danger.ghost` cascade exceptions and `#kingModalRemove` (now `--bad-bg` edge) handled.
  The unused §25 `.btn-*`/`.badge-*`/`.toast-*` alias system (zero references ever) deleted.
- **One press language** (`scale(.98)` — the v24 `translateY` override was the odd one out), **one
  selected-state language** (`.range-btn.act` was the app's only inverted highlight; now
  accent-weak like the chips), `.cand-chip.sel` de-hardcoded (its light-theme rgba never showed a
  tint in dark mode).
- **Builder rows fit 380px by measurement**: the `.costs` row needed ~328px in a ~310px card and
  neither `.qtybox` nor `.priceline` could shrink. A `@media (max-width:380px)` block gives back
  ~38px (qty 76→64, gutter 32→26, gaps 8→6, priceline 116→106, padding 16→12, leader floor 10px —
  the fresh-states spec holds the leader to ≥10px of visible dots, and its overflow assertions now
  pass at 380px where they used to measure the escape).

## Judgement calls (the ones a reviewer should re-litigate if they disagree)

1. **The since-line reads the LATEST entry, any direction** — not the latest drop. "No changes
   for 6 weeks" must be true of *changes*, not of drops; a recent price correction resets it. A
   recent non-drop entry reads "Your last change was N days ago." — neutral, never punitive.
   And it renders at **all-menus scope only** (review finding 1 — its figures are the all-menus
   series and cannot be scoped honestly).
2. **Marker filter epsilon** is `drop > 0.001` (exact primitives); label suppressed under 0.05.
3. **Path 12 (`doDeleteMenu`) logs optimistically** like paths 2/3/5/10, not success-gated like
   11 — its in-memory state is not rolled back on a failed menus-row delete, so the trend point
   records what the app actually shows. Only the delete paths with rollback are gated.
4. **The over-target band derives from `targetInView`** — a target far above the domain shades
   nothing (nothing over target exists to shade), keeping v61's no-edge-annotation rule.

## Deliberately NOT built

- Cold-start elimination (server wake, not app latency — numbers above).
- The `priceHistory` wholesale-replace asymmetry at boot (pre-existing, still flagged at the site;
  the new "pushes reach the server too" test documents why it matters).
- Backfill of the six paths' historical gap (brief forbids — it would invent evidence).
- Per-menu chart/markers — the chart stays all-menus; `.scope-note` still explains it.
- `doDeleteMenu`'s unawaited dish deletes (v114 flagged; unchanged; still its own brief).

## The pre-push review — five findings, two of them real defects in the new surface

Run blind against the branch diff after the suite was green. Every finding got a decision:

**1. MAJOR — FIXED. The scoped since-line fabricated drift by mixing two series.** Every entry's
`avgBefore`/`avgAfter` IS `computeAvgFoodCost()` — the all-menus figure — while a narrowed
dashboard fed `sinceLineHtml` the per-menu current. All-menus 30 / Winter 45 would have read
"Costs up 15.0 pts since." for a change that moved nothing, warm tint and all. The scoped line
cannot be made honest (the log carries no per-menu figures), so a narrowed scope now renders **no
since-line** — the v89 scope-honesty rule applied. `menuIds`-based entry selection went with it
(selecting the entry per menu was never the problem; its figures were). Pinned with a real
cross-series fixture.

**2. MAJOR — FIXED, and this was the sharpest one. The marker for the change Max JUST made never
drew.** The entry is written when its carrying write settles — deliberately, v114's success-gate —
which lands its timestamp a beat AFTER the trend point `logHistory` pushes synchronously. The
marker filter's upper bound (`e.t>t1`) therefore excluded the feature's headline moment, every
time, until some future point arrived — for a weekly user, the next session. Lower bound only now;
an entry newer than all data is "now" and clamps to the line's right end. And `logChange` repaints
a visible dashboard via the same `repaintDashboardIfVisible` helper `logHistory` uses, so the
marker and since-line land in front of the user (also the review's minor 4). The v114 "renders
nothing" census keeps its boundary: the log's own functions still hold no DOM code — the helper
owns the DOM touch, on the rendering side of the line.

**3. minor — FIXED.** The boot gate's error branch now actually clears the patient-message timer
its comment claimed it cleared (the callback's `is-error` guard made this latent, not live).

**4. minor — FIXED** by the `logChange` repaint in finding 2.

**5. nit — FIXED.** Orphaned `.cogs-meta`/`.cogs-inline`/`.cogs-read` CSS deleted with tombstones.

**What it checked and cleared**, worth recording: version spots; no duplicate top-level
definitions; protected region and hard-rule-2 functions untouched; no `kind`-keyed filtering in
either new reader; path-11 gating and path-10/12 ordering "correctly placed and pinned by
value-asserting tests that would fail if the condition (not just the call) were wrong"; colspan
change complete; deleted CSS reference-free.

Suite after fixes: **752 green** · smoke green · Playwright **100/100**.

## The flow-test pass (real browser, production data, read-only)

Two runs: the first stalled on an environment quirk (Chrome window resize doesn't take effect
under the automation bridge — narrow-viewport geometry is Playwright's job anyway); the rerun
completed everything else. Console clean throughout; every popup/settings surface opened and
closed cleanly; ghost buttons read as controls in both themes; the chart scrub, all six ranges,
and the insight panel behaved with no visible flash.

**One defect found — PRE-EXISTING (v82 draft machinery, zero lines of it in this diff), so per
the triage rule it rides the next batch, not this PR:** opening the builder to LOOK at a plate
and closing it with × plants an autosaved draft that resurfaces as an "Unfinished plate —
resume or discard?" prompt on the next visit — possibly a week later. Discard clears it, but a
Resume against a plate that has since changed elsewhere could reintroduce stale lines. Added to
the outstanding list.

Also noted while testing scroll behaviour: **smooth scrolling is rAF-driven and Chrome pauses
rAF in background tabs**, so the re-tap smooth scroll appears inert when driven from an
unfocused tab. Artifact of the harness, not the app — the switch-path jump (synchronous,
pre-render) verified working. The phone's active tab always runs rAF.

## Max's same-day additions (same PR, on his instruction)

Four items, sent while the PR waited out a GitHub Actions outage:

1. **No splash on desktop** — one CSS rule (`min-width:701px` hides `#splash`); the loader script
   and phone behaviour are untouched.
2. **The chip dots are BACK** (reversing this batch's first-draft removal — Max's call): they are
   the colour key tying Healthy/Watch/Rework to the card stripes, same `--good/--warn/--bad`. The
   new light-tinted active state stays on top.
3+4. **The scoped chart — v89's "stage 2" promise, kept.** "Changing something on a menu doesn't
   store a change for that menu" was DISPLAY, not storage (his 21:09 dish removal wrote a perfect
   `dish_removed` row — verified in the table): the chart always drew the all-menus line, where a
   per-menu move is invisible. Now a narrowed dashboard draws the MENU'S OWN line whenever that
   menu has ≥2 points in the chosen range (production has 8 per menu since 30 Jul); the fallback —
   and only the fallback — is the all-menus line with the scope-note, exactly the old behaviour.
   Caption says "This menu ·" on a scoped draw (a reference, not a restatement — the heading owns
   the name, v97). **Markers and the since-line stay all-menus-only**: change-log figures ARE the
   all-menus average, and an all-menus magnitude on a per-menu line would mix two series — the
   same honesty rule the pre-push review enforced on the since-line. Verified against production:
   specials draws its own 22.2% line beside the all-menus 21.7%.

   Testing note that cost a few minutes: the SW serves `app.js?v=115` cache-first, so re-serving
   the working tree under the SAME version number hands the browser the stale build — clear the SW
   cache when re-testing an unmerged tree. (This is the six-spots discipline seen from the other
   side.)

## Needs Max's phone

- **The chart with markers and the since-line at 380px in both themes** — do the drops read as
  YOUR work? (Production currently shows the empty state: green line, no markers, until your
  first save/repoint/price change writes the first entry.)
- **The unified ring** — boot, pull-to-refresh and the invoice wait should now read as one thing.
- **The patient boot message** after a week idle — honest or annoying?
- **The re-tap smooth scroll** and tab-switch scroll — smoother, or does iOS Safari fight it?
- **The dotless chips** (Healthy/Watch/Rework) — active chip wears its light; is the idle row too
  quiet?
- **Builder rows at 380px** — contained now in Chromium; the phone is the judge.
- **The Gemini insight arrival** — settles rather than flashes?

## Version

v115 in all six spots (`sw.js` ×3, `index.html` ×2, `APP_VERSION`), pinned by settings.test.js
and smoke.
