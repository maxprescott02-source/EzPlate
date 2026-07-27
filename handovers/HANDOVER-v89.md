# HANDOVER v89 — Dashboard rework, stage 1: structure + menu awareness

**Completed:** 27 Jul 2026 · branch `feature/dashboard-stage1` (off `main` at v88, `be88567`, PR #27 merged) ·
brief `~/Downloads/ezplate-opus-dashboard-stage1.md` + mockup `~/Downloads/ezplate-dashboard-mockup_1.html`.
Baseline v88, **392 node green**, `node -c` clean. Ended **413 node green** (+21), jsdom smoke green,
`node -c` clean (`js/app.js`, `sw.js`), six spots → **v89**, CodeRabbit clean on re-review.

Zero contact with the protected parser region, the money law, the naming inversion, the data model, the
invoice path, the insight engine, or `api/*.js`. The chart's geometry — `plotLeft`/gutter, axis fonts,
range stability, scrubbing, target-on-a-labelled-tick, motion tokens — is **untouched**; the only edit
inside `trendChart()` is one line of caption copy, explained in §5.

---

## ⚠️ Read first: this needs a migration applied BEFORE the deploy

`supabase/migrations/20260727_price_history_menu_id.sql` adds a **nullable `menu_id`** to `price_history`.
Apply it in the SQL editor before merging — previews and production share one database, and CLAUDE.md's
schema-can-lag rule says apply before the deploy that reads it.

**If you forget, nothing breaks.** `bootstrapSync` probes for the column once; if it's absent,
`menuHistSupported` goes false and per-menu points stay in localStorage — no errors, no toasts, no
repeated failing writes. But that history won't survive a device change, so apply it.

## The blocker that shaped this batch

**Per-menu history did not exist, and could not be invented.** `price_history` has always held ONE number
per moment — `avg_food_cost_pct` across every menu — and `bootstrapSync` *replaces* the local array from
the server, so enriching it client-side would be wiped on the next sync.

That made two of the brief's four items unbuildable as written:

| Brief | Status |
|---|---|
| §1 verdict header, scope-aware | ✅ built — live computation, any scope |
| §2 menu selector | ✅ built |
| §3 chart reflects the selection, two lines | ❌ **not built** — no per-menu series existed |
| §4 comparison list — name + current % | ✅ built |
| §4 — trend arrow + sparkline | ❌ **not built** — same missing data |

Reconstructing a per-menu past from `ingPriceLog` was considered and rejected: menu prices have no history
at all, so the result would be figures the app cannot stand behind — exactly what the brief's §5 honesty
constraint forbids. **Max's call, taken before any code was written: build the honest subset and start the
clock** (start logging per-menu points now so Stage 2 has data to draw), rather than defer the whole
question and lose the accumulation time.

## 1 — Per-menu history, kept deliberately apart

`menuHistory` is a **separate** `{menuId: [{t,v}]}` map (`cafeDB_menuHistory`), not a field on
`priceHistory`. Mixing per-menu rows into `priceHistory` would have silently skewed `dashComparisons`,
`histInRange`, the 500-point cap and the dedup guard — every one of which assumes one point = one moment
across the whole business. Keeping them apart means **no existing all-menus figure changes by a decimal**,
and `avgFoodCostForScope('all')` is byte-for-byte the old `computeAvgFoodCost` maths (pinned by a test).

`logMenuHistory()` mirrors `logHistory`'s contract per menu: deduped per series within the hour, capped per
series, and a menu with nothing costed logs **nothing** rather than a misleading `0`.

## 2 — The selector is not a sixth floating layer

The 26 Jul audit warned the next new dropdown would be the sixth independent owner of placement logic.
**It isn't one, because the Menu tab's selector was never a floating layer.** `#menuSelect`
(`index.html:122`) is a plain native `<select>` in a `.menu-picker-row`; `anchorDrop`/`dropPlace`/
`.cat-drop` are the *combobox* machinery for the modal ingredient pickers and are untouched here. The
Dashboard selector reuses that exact markup and CSS. Nothing new to place, no new owner. The structural
consolidation of the five real ones remains open and untouched.

## 3 — Scope is a separate variable from `currentMenuId`

`dashScope` is module-level and **never persisted** (session-only, as briefed — a reload lands on "All
menus"). It is deliberately *not* `currentMenuId`: that is the Menu tab's own selection, it persists across
reloads, and it seeds the menu insights via `insightSeedFor`. Re-scoping a read-only dashboard must not
silently re-point the tab where Max edits prices. Verified in the browser: scoping the Dashboard leaves
`currentMenuId` where it was.

`dashScopeValid()` collapses to all-menus when the scope's menu is gone **or** when fewer than two menus
remain — see CodeRabbit §1.

## 4 — What the By-menu list does and does not claim

Ranked by average food cost %, **lowest first**, menus with no costed plates excluded (an empty row invites
a comparison that isn't there). Ties break on name so the order can't jitter between renders. Rows are
tappable and re-scope the header.

Per the honesty constraint, the panel says in the UI: *"Ranked by average food cost % — lower is better.
EzPlate has no sales figures, so this compares cost efficiency, not what each menu earns."* A test asserts
the copy contains the basis and matches none of /profit|earns the most|revenue/. **Carry this into Stage 2.**

## 5 — Scope honesty on the chart (the judgement call I'd most like checked)

The chart and the stat cards still draw the **all-menus** series, because there is nothing else to draw
yet. Rather than leave that implicit, when a menu is selected the block says so: the title becomes
"Food cost trend — all menus", the stat lead becomes "How today's all-menus average compares", and a
`.scope-note` appears — *"A trend for one menu needs its own history — EzPlate started recording that from
today, so this line still covers every menu."*

**One copy edit inside `trendChart()`, beyond the letter of the brief:** the caption read "Average food cost
across **the menu**". Singular, when the app has always allowed several — and with a scope selector now
sitting directly above it, that ambiguity actively misleads, reading as though it describes the selected
menu. Changed to "across all menus". No geometry touched; no test pinned the string (`fresh-states.spec.js`
captures it but only asserts non-empty). Trivially revertible if you disagree.

## 6 — Contradictory target-line rules: REPORTED, not resolved (as instructed)

The brief asked me to report these rather than fix them, and the audit's version of the finding is now
partly stale:

- **CLAUDE.md no longer carries any target-line rule at all** — v88's snapshot rewrite purged them. The
  audit's "CLAUDE.md still carries all three" is no longer true.
- **The contradiction moved into the code comments.** `js/app.js:1774` (v60) says a far-off target
  "becomes a small edge annotation instead of dragging the whole axis to meet it". `js/app.js:1856` (v61)
  and `tests/trend-domain.test.js:76` both say the opposite: when the target is far outside, **nothing is
  drawn — no edge annotation**. The shipped behaviour and the test agree with each other; the v60 comment
  is stale. One comment line to delete, but it needs its own decision, not a silent fix in this batch.

## Judgement calls

- **Kept `tests/visual/v89-dash.spec.js` rather than deleting it as a one-off** (v88 deleted its
  equivalent). These 6 tests assert *behaviour* — rendered text, scope switching, grid placement, overflow —
  and pin **no screenshot baselines**, so unlike the v72-era shots they can't go stale from an unrelated
  visual tweak. They are the only browser cover the new Dashboard has. Say the word and it goes.
- **Explicit grid rows on desktop.** `#dashBody` had two children and relied on auto-placement to put the
  highlight cards top-right; my third panel pushed them into row 2, below the fold. Caught in the browser,
  not by a test. All three children now have explicit `grid-row`, so a fourth panel can't repeat it.
- **`priceHistory` still replaces wholesale on sync; `menuHistory` now merges.** The two behave differently
  and I chose that knowingly — see CodeRabbit §2. Fixing the aggregate path is a real improvement but it
  touches code everything reads, on a brief about the Dashboard. **Listed as follow-up, not done.**
- **The trend clause is omitted, not flattened, when a scope has no history.** "→ steady" against no data
  is a claim the app can't make.

## CodeRabbit — 2 findings, both real, both fixed; re-review clean

**1. `dashScopeSelectorHtml` — a narrowed scope could become a trap (minor). REAL, fixed.**
The selector is hidden below two menus. Delete one of two menus while the Dashboard is scoped to the
survivor and the scope stayed narrowed with no visible control to get back to "All menus". CodeRabbit
suggested rendering the selector anyway; I fixed it at the source instead — `dashScopeValid()` now collapses
to all-menus below two menus, giving one invariant: **a narrowed scope exists if and only if the selector is
on screen.** That keeps "no dead control" *and* closes the trap. Two regression tests.

**2. Bootstrap replaced `menuHistory` wholesale, dropping points logged offline (minor). REAL, fixed.**
`pushWrite` drops writes silently when fully offline (CLAUDE.md's known gap), so a point logged on a café
phone with no signal exists only in localStorage — and the next sync would have deleted it. Cost history Max
can never get back. Extracted a pure `mergeMenuHistory(server, local)`: server points win on an identical
timestamp, local-only points survive, output sorted, inputs not mutated. Three tests run the real extracted
function rather than a copy.

## flow-tester — no defects, and one environment finding worth your attention

The subagent ran against the Dashboard and Menu tabs and **found no defects** in what it could test:
the all-menus verdict, scoping via both the selector and a By-menu row, full label/figure agreement in
every scoped state, Menu-tab independence in **both** directions, all six chart ranges, and a clean console.

**It refused to run two of the six priorities, correctly.** It found real café data in the browser profile
(menus "Original menu" and "specials", 78 real plate names) and would not reset or reseed it — and it
reported that **no staging environment exists on this branch**: `index.html:759` points at a single
hardcoded Supabase project with no hostname branching, so localhost hits the same database production
does. That matches CLAUDE.md's own Outstanding list, where staging is still unbuilt. Good judgement on its
part; the alternative was risking real data or syncing fabricated plates into the live DB.

**I covered the two skipped priorities myself instead**, in Playwright — safe because it uses a throwaway
browser profile and the spec aborts every off-origin request, so Supabase is never contacted. Six new tests
(12 in the file, all green):

- deleting the OTHER menu while scoped → scope collapses with the selector, figure is the survivor's own
- deleting the menu the dashboard is scoped TO → recovers to all-menus, no stale figure
- **zero menus** (a legitimate state) → no selector, no comparison panel, "—" and a useful line, no overflow
- a menu whose plates have no sell price → "—", never `0%`
- a menu with prices but no costed plates → "—", never `0%`
- an uncosted menu → excluded from By-menu rather than ranked at `0%`, and honest when scoped to

The CodeRabbit scope-collapse fix is therefore verified end-to-end in the real app, not just at unit level.

**Its one friction finding, verified and NOT fixed:** `.range-btn` (the 1W/1M/3M/6M/1Y/All row) is
`min-height:32px` — under the 44px floor. It is **pre-existing**, set in **v46**, the batch whose own commit
message reads "44px hit areas". It sits directly under the new verdict header, which is why it surfaced now.
Left alone per strict scope (CLAUDE.md hard rule 4: list it, don't build it) — it's a one-line change in
`css/style.css:2209` whenever you want it. The By-menu rows and the scope selector are both exactly 44px.

The subagent's browser floored at 500px, so it could not check 380px; the Playwright spec does, at 380px,
in both themes.

## What was deliberately NOT built

Per the brief's OUT list and the blocker above: the two-line/overlay chart (§3), sparklines and trend arrows
in the By-menu list (§4), drill-down cards, moving the insights panel off the Menu tab, any role-based
gating. The Menu tab's suggestions panel is exactly where it was. The mockup's "Dig in" cards are not built.

## Follow-ups this batch created or found

1. **Stage 2 needs accumulated data.** The per-menu series starts empty; a menu-specific chart is only
   honest once it has points. Don't schedule Stage 2's chart work for next week.
2. **`priceHistory` has the same offline-drop gap `menuHistory` just fixed** — one merge away, but on the
   path everything reads. Its own decision.
3. **The stale v60 target-line comment** (§6) — one line, needs a yes.
4. Per-menu logging multiplies history writes by (menus + 1) per change event. Fine at 2–3 menus; worth a
   look if menus ever proliferate.
5. **`.range-btn` is 32px, not 44px** (`css/style.css:2209`, since v46) — see the flow-tester section.
6. **No staging environment**, re-confirmed by the flow-tester from the outside: it could not safely test
   destructive flows against real data. Already on CLAUDE.md's Outstanding list; this is a second, concrete
   cost of not having it.

## Needs Max's phone

The desktop browser verified the numbers, the scope switching, both themes, both breakpoints, no horizontal
overflow at 380px, and that every chart range still renders with the selector present. What it cannot tell
you:

1. **The selector as a real touch control at 380px** — a native `<select>` opens the iOS wheel picker, which
   no desktop models. Does landing back on the Dashboard after picking feel right?
2. **The By-menu rows as tap targets.** They're 44px minimum by CSS, but only a thumb can say whether a row
   that re-scopes the whole screen wants more separation from its neighbour.
3. **The verdict number's weight at real phone density** — 24px mono at the top of the panel looked right in
   Chromium; that's a judgement the phone owns.
4. **The scope-note under the chart** — it's an extra paragraph on an already-tall mobile panel. If it reads
   as clutter rather than clarification, it should become a smaller inline note.
