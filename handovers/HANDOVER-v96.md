# HANDOVER v96 — Dashboard menu selection moves onto the By Menu list

**Completed:** 29 Jul 2026 · branch `feature/by-menu-selection`.
Brief: `ezplate-opus-menu-selector.md`. Two scope decisions taken with Max before building
(both recorded below). Six spots → **v96**. No migration. No Supabase write touched.

Ships **before** the grid rework in `ezplate-fable-dashboard-grid.md`, as the brief ordered:
that brief dissolves the card the picker lived in, so selection needed a new home first.

## What the brief assumed, and what the code actually was

The brief described a read-only By Menu card and a picker chip that had to be merged. **The
rows were already controls.** Since v89 each has been a real `<button class="mcmp-row"
data-scope=…>` wired to `setDashScope`, marked with `.act` + `aria-current`, at a 44px floor
the v94 density pass deliberately preserved ("the row is a button"). So the merge was mostly
a **deletion**, not a build:

- `dashScopeSelectorHtml` deleted outright, with its call site, its `onchange` wiring, and
  all four of its CSS blocks. A tombstone comment keeps the old name greppable.
- **"All menus" became a row.** It was never an implicit fallback — it was a real
  `<option value="all">` (brief question 2 answered: real, not fallback). With the picker
  gone it needed a home or the scope would have been a one-way door.
- Everything else about the list is unchanged: same ranking, same caption, same markup.

## The three questions the brief said to answer before writing code

1. **Where does the state live, does it survive reload?** `var dashScope=DASH_ALL`
   (`js/app.js`) — a module var, never written to localStorage, with a comment already
   saying so. **No persistence added**, per the brief. Follow-up below.
2. **Is "all menus" real or a fallback?** Real. See above.
3. **What else reads the value?** **Two dependents the brief did not list:** the insights
   panel (`dashInsightsHtml(scope)`) and the Dig-in drill-downs (`digInHtml(scope)`). Both
   re-render on every scope change and always did. Nothing outside the dashboard reads it —
   `currentMenuId`, the Menu tab's own persisted selection, stays untouched (still pinned).

## Two things the brief got wrong about the current code — flagged, not silently followed

**1. The chart and the comparison block do NOT follow the selection.** The brief's Outcome
and its first regression test say headline + comparisons + chart move together. In shipped
code only the **headline** is scope-aware: `dashComparisons()` takes no scope and reads
`priceHistory` (all-menus by definition), and `trendChart()` takes no scope. That is the v89
scope-honesty rule — per-menu history only started accumulating at v89, and drawing the
aggregate under a menu's name would be a figure the app can't stand behind. When narrowed,
the chart says so in words.

**Max's call (29 Jul): ship the merge only.** The menu-aware chart stays CLAUDE.md's
outstanding item 5, blocked on per-menu points. Regression test 1 was rewritten to pin what
the scope actually drives (headline + insights + drill-downs, moving together) plus the
chart's honesty note — rather than pinning behaviour that does not exist.

**2. "Ranking stays worst-food-cost-% first" is inverted.** `menuComparisonRows` sorts
**lowest first** — lower food cost is the better result — and has since v89, deliberately and
pinned. The brief's intent ("don't reorder") was followed exactly; only its description was
wrong. Order untouched, and now pinned against the selection too.

## The judgement call that changed behaviour: uncosted menus

A menu with nothing costed has **never** been a By Menu row (excluded by the honesty rule:
no cost efficiency to rank, and an empty row invites a comparison that isn't there) but **was**
a picker option. Removing the picker makes it an unreachable scope.

**Max's call: accept it.** Nothing is lost that could be shown — scoping to one only ever
produced the "Nothing costed and priced on this menu yet" headline, which is now unreachable.
The `v89-dash.spec.js` test that pinned the old reachability was rewritten to pin the new
behaviour, with the reasoning in a comment at the test.

## The trap this could have reopened, and the structural fix

v89 pinned an invariant after a CodeRabbit catch: **a narrowed scope exists if and only if
the control that can undo it is on screen.** That control was the picker, rendered per
*menu*, so `dashScopeValid` guarded on `menusList.length < 2`.

The control is now the list, rendered per **costed** menu — a strictly smaller set. Left
alone, the guard would have missed a shape the picker never had: two menus exist, the
dashboard is scoped to one, the other's last costed plate goes away, the list stops
rendering, and the scope is stranded with nothing to press. `dashScopeValid` now asks
`menuComparisonRows()` instead, which closes menu-deleted, fewer-than-two-costed and
lost-its-last-plate in one condition. Pinned by a new unit test.

## Also done

- **Bento CSS untangled.** Four rules keyed off `:has(.dash-scope)` / `:not(:has(.dash-scope))`
  to fork the 1024–1279 band between "selector present" and "single menu". With the selector
  gone the verdict tile is *always* the short stack, so the two splits collapse into one
  unconditional 5/7 (the former single-menu split). The ≥1280 re-pin that existed only to
  out-specify the fallback went with it — there is nothing left to out-specify.
- **All-menus sparkline.** The row draws from `priceHistory` (the all-menus average series —
  the same numbers the chart above already draws), routed inside `mcmpSparkHtml` so the row
  markup stays one code path for every scope. `mcmpSparkSeries` is the extracted core; the
  <2-points rule is unchanged, so it draws nothing until there is something honest to draw.

## Verification

- `npm test` — **489 green** (485 baseline − 3 deleted picker tests + 7 new).
- `node -c` clean on `js/app.js` and `sw.js`. jsdom smoke green (24 sections).
- **Playwright — 77 tests, 76 pass.** The one failure is `fresh-states.spec.js` "v45 item 4:
  button copy", the known-stale pin CLAUDE.md documents. **Confirmed pre-existing by stashing
  this branch and re-running it on unmodified `main`** — not caused here.
- New `tests/visual/v96-menu-select.spec.js` drives the brief's regression list in Chromium:
  every scope-following region moves on one tap; returning to All menus restores `#dashBody`
  **byte-identical**; thin history shows the existing "not enough history yet" copy with no
  `NaN`; reload lands back on All menus while the persisted chart range survives it; and all
  three rows measure ≥44px at 380px while dig rows keep their 32px pin.
- 1024 / 1100 / 1279 / 1280 measured directly after the CSS change — no overlap, no
  horizontal overflow, tiles equal-height in the side-by-side band.
- **CodeRabbit: 0 findings** across all eight changed files (re-run with the new spec staged,
  since untracked files are absent from the diff).

## flow-tester pass

Run as the brief required, against a throwaway profile with off-origin and `/api/**` blocked.
**No defects.** Every item held: all scope-following regions moved together with no stale
region (including mid-drill-down), exactly one `.mcmp-row.act` with correct `aria-current` at
every step, range/scope independent in both directions, `#dashBody` identical after a round
trip, no `NaN`/`undefined`, tab-away-and-back preserved the scope, menu deletion (down to zero
menus) recovered cleanly every time, and 380px showed three ~44px rows with no overflow.

It raised two friction items. **Both checked; neither is a v96 defect, neither was changed:**

1. **The insights panel disappears rather than rescoping** when scoped to a one-thin-plate
   menu. That is the documented rule — CLAUDE.md: "No empty state here, by design: when there
   is nothing to say the panel is absent" — combined with v92's value floor. Correct
   behaviour. Worth Max's eyes only against his real menu, where the question is whether a
   real single-plate menu also comes back empty.
2. **With zero menus the headline shows the last logged figure, not "—".** Pre-existing and
   deliberate: `dashComparisons` falls back to `priceHistory[last].v` when nothing is costed
   (`js/app.js:1882`, v89), so the headline is "exactly the one this dashboard has always
   shown". The v89 `zero menus` spec asserts "—" only because its seed has no history at all.
   Untouched here — listed as a follow-up below rather than fixed on sight.

One transparency note on method: the agent drove Chromium with a standalone Playwright script
rather than an interactive click-through. Real browser, real route-blocking, real seeded boot,
run alone — so the coverage is genuine, but it is not the interactive path.

## Deliberately NOT built

- The menu-aware chart and per-menu comparison block (Max's call; blocked on history).
- Persistence for the selection (the brief forbids adding it in this batch).
- Any change to the ranking, the caption, the metric, or the selected-row visual treatment —
  the last is settled in the Fable brief.
- Uncosted menus as "—" rows.

## Needs Max's phone

Nothing here was device-verified. A narrow viewport is not a device.

1. **The 44px rows are measured, not felt.** Three rows now stack in one card and the top one
   is a new tap target. Do the rows feel like separate hits on a real thumb, or does the
   All-menus row read as a header you'd tap by accident?
2. **Is "All menus" obviously a *row you can press*** rather than a summary line above the
   list? It is marked exactly as the menu rows are — that is the brief's "plain marking is
   fine" — but only the phone shows whether it reads as a control.
3. **The picker is gone from the headline block.** Confirm nothing about that block looks
   unbalanced on the phone now that it holds only the figure and its target line.
4. Carried forward: everything on the v82–v95 phone list, still unsigned-off.

## Follow-ups

1. **Selection does not persist across a reload** (inherited from the picker, unchanged by
   design). Worth a decision now that it is the dashboard's only scope control: a reload
   silently returns to All menus. Small, needs Max's yes.
2. The "Nothing costed and priced on this menu yet" branch of `verdictHtml` is now
   **unreachable** for a named menu — the only scopes reachable are all-menus and menus with
   a costed plate. Dead-ish code; left in place rather than removed on sight, since the
   all-menus wording of the same branch is still live.
3. **Zero menus + existing history shows a stale headline figure** (friction item 2 above).
   Pre-existing v89 behaviour, not touched here. It is arguably an honesty question — nothing
   is costed, yet the dashboard states a percentage — but changing it moves the headline
   number in a state that has shipped for seven versions, so it needs Max's yes, not a
   judgement call.
