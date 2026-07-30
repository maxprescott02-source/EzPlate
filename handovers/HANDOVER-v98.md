# HANDOVER v98 — the desktop grid: variable rows go full-width, light mode loses its third tone

**Completed:** 31 Jul 2026 · branch `feature/dashboard-grid`.
Brief: `ezplate-fable-dashboard-grid.md`. Its stated dependency (`ezplate-opus-menu-selector.md`)
was verified as shipped-and-merged (it is v96, PR #35) before any code. Six spots → **v98**.
No migration. No Supabase write touched. No behaviour change.

## Root causes, as built

**1. The dead space was structural.** The bento put fixed-height tiles beside variable-height
ones; it was retuned twice and the space moved rather than closed. v98 stops asking them to
agree. Row 1 is the only side-by-side — chart card (7 tracks) | menu-selector card (5 tracks) —
and the CHART ALONE sets the row height. Insights (1–5 by design) and Dig in each get a
full-width row where nothing sits beside them.

**2. Light mode had three stacked tones.** Cream page → white card → beige inner (`--surface2`).
Fixed by removing a level of nesting, not by picking colours: the `.dp-tile` fill is gone (the
wrappers are chrome-free ordering handles now) and `.dig-card` moved to `--surface` + the
existing hairline border — at EVERY width, both modes. Dark hid the bug because tonal deltas
compress at the dark end; it is now pinned by COMPUTED STYLE in `v90-dash.spec.js`, so a
dark-only review can never pass it again.

## The one desktop placement layer (the brief's hard requirement)

Deleted, not overridden: the v89 `7fr/5fr` rules inside the big ≥1024 block, the v49-era
`#dashBody{display:grid}` re-declare, the v89 explicit-rows block, and BOTH v95 bento bands.
Tombstones at each site point to the single v98 block at the end of style.css.
Two survivals the brief ordered were re-checked rather than assumed: `scrollbar-gutter:stable`
was ALREADY hoisted to un-media'd `html` (nothing to rescue), and the `.dp-tile` wrappers were
REUSED, not unwrapped — they are the CSS-`order` handles that let the desktop card read
number → target line → compares → trend while the mobile DOM order stays untouched.

## ⚠️ Lesson that will bite again: abs-pos grid children need BOTH lines definite

The selector card is absolutely positioned into its grid area so the menu count can never
stretch row 1 (its containing block is the placed area; `.pad` scrolls internally past what
fits). First run shipped `grid-row:1` — start line only — and the containing block's BOTTOM
edge silently fell back to the grid container's padding edge: the card stretched 251px past the
panel, to the page end. **An auto end line means that edge of the containing block is the
container's padding edge, not the track's.** `grid-row:1/2` fixed it. The floor pin in
`v98-grid.spec.js` caught it on its first run — the pin earned its keep before it was a day old.

## The sparse-state decision (made explicitly, as the brief ordered)

With two menus the selector card carries quiet space below the rows. **Accepted, deliberately:**
it self-corrects as menus are added, and a content-sized card would give row 1 a ragged bottom
edge against the full-width row beneath — the same dead space, relocated to the page. Judged on
the 2-menu screenshot: reads as a calm card, not a broken one.

## ⚠️ What the brief got wrong — flagged, then fixed on Max's yes

**The ranking WAS best-first, not worst-first as both briefs claimed.** The grid brief justified
truncation with "the ranking is worst-first, so overflow hides the best-performing menus", and
the Opus selector brief asserted the same — but `menuComparisonRows()` had sorted ascending
(lowest food cost % first) since v89, pinned by `dash-scope.test.js`. With the new internal
scroll that would have hidden the WORST menus — the ones a manager most needs (visible in the
12-menu screenshot, where every hidden row was 52%+). Per the brief's own stop-and-say-so rule
this was flagged rather than silently changed; **Max said flip it, so v98 ships worst-first**
(highest food cost % leads). One comparator line in `menuComparisonRows`, re-pinned in
`dash-scope.test.js` (two tests, one now naming the decision and its date) and
`v89-dash.spec.js`. The tie-break (name, ascending) is unchanged.

## The sparkle: it marks AI provenance (decided, not tweaked)

The code already declared it "the app's ONE Gemini identity marker", paired with the earned
"Refined by Gemini" credit — so it keeps Gemini's own hues rather than going palette-native.
The wash-out on cream is fixed as a SYSTEM change: `#ezSparkGradDeep` (the same four hues at
deeper luminance) sits beside the stock gradient in index.html; CSS selects it in LIGHT mode
only, mirroring the token theme pattern, and the switch is pinned by computed fill. Any future
Gemini marker uses the same pair.

## Empty Dig-in tiles

`digCardHtml` adds `is-empty` when a tile has no top row; CSS quiets the name (muted,
non-bold). Same card chrome — not a second card style. Pinned by comparing computed
font-weight of an empty vs populated tile.

## Pinned contracts changed in this commit

- Desktop geometry blocks in `v89-dash.spec.js` and `v90-dash.spec.js` (the brief's own test
  surface) now pin the v98 grid: row-1 top-align + matched floors, insights spanning edge to
  edge below (edge pins, not width — CodeRabbit), Dig in below insights, the in-card zone
  order, and the 1024/1280 fork gone. Plus the unconditional every-width surface pin.
- NEW `v98-grid.spec.js` (9 tests): the LOADED state first (6 menus @ 1280+1600, light+dark),
  the sparse floor (2 menus), the full ceiling (12 menus scroll inside the card — 8 fit
  outright at 1280, measured, so 8 would pass vacuously), zero row-1 geometry on scope change,
  the quiet empty tile, the sparkle gradient switch.
- **Two test-design lessons recorded in the spec itself:** the no-jump pin covers ROW 1 only —
  the insight SET is scope-dependent by design (v90), so scoping can legitimately unrender the
  panel and close its row up (pinning rows 2–3 asserts app behaviour, not grid); and a
  scroll-overflow pin needs a seed that actually overflows.
- Untouched, per the brief: chart pins in fresh-states.spec.js, the 32px dig-row floor in
  v90-flows.spec.js (dig rows stayed display rows), copy pins in dash-scope.test.js,
  sparklines and their extraction hook.

## Verification

- `npm test` — **509 green** (baseline verified 509 before starting; no unit-level surface
  changed). `node -c` clean on app.js + sw.js. jsdom smoke green (24 sections).
- **Playwright: 88 tests (79 + 9 new), 87 pass.** The one failure is fresh-states'
  "v45 item 4: button copy" — the known-stale pin CLAUDE.md documents, failing on unmodified
  main since before v97.
- **Mutation-tested, three ways:** the grid-row:1 bug was caught live by the floor pin (above);
  restoring the beige `--surface2` dig fill turns the surface pin red; deleting the reserved
  caption band turns the no-jump pin red. Both mutations reverted, suite re-green.
- **A triage worth recording:** the first full run produced 13 boot TIMEOUTS scattered across
  files this batch never touched, including mobile-only tests the ≥1024 CSS cannot reach. The
  host was severely degraded at the time (a ~1s `npm test` took 16 minutes of wall-clock).
  A rerun on the recovered machine: 87/88 in 1.6m. Phantom timeouts look exactly like real
  failures — check the machine before diagnosing the code.
- **CodeRabbit: 1 finding (minor), accepted and fixed** — the insights full-width check
  asserted width, which could pass offset; replaced with left/right edge pins in BOTH specs
  (it could only see the tracked one). Re-run green. Nothing flagged on the CSS or JS.

## Deliberately NOT built

- No mobile redesign: the only sub-1024 change is the dig-card tone — the same three-tone bug,
  same one-line fix, flagged in the plan and approved with the batch.
- No copy changes (the prose cull is a separate queued batch, `ezplate-fable-ux-standard.md`).
- `.range-bar` keeps its `--surface2` track: it is a segmented CONTROL's track, not a card.
  The brief's "no second fill" rule governs surfaces; restyling controls was out of scope.
- The verdict-line height reservation (v95's `min-height:2.9em`) was dropped, not carried: at
  the new full-card width every scope's sentence renders one line, and the no-jump pin now
  proves it instead of reserving air for a wrap that cannot happen.

## Needs Max's phone

1. The dig-card tone change is the one thing visible on the phone: do the Dig-in tiles still
   read as tappable against the white panel in kitchen light, with only a hairline for an edge?
2. The sparkle in light mode — brighter, still reads "Gemini", at arm's length?
3. Desktop is where this batch lives: at ~1280 on the laptop, does the quiet space under two
   menus read as calm or broken? The decision says calm; only eyes confirm it.
4. Carried forward: the v82–v97 phone list, still unsigned-off.
