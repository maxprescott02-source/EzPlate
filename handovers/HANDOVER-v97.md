# HANDOVER v97 — Scope persists, the all-menus figure counts plates, scope is stated once

**Completed:** 29 Jul 2026 · branch `feature/dash-scope-persistence`.
Brief: `ezplate-opus-scope-consolidation_1.md`. One scope decision taken with Max before building
(recorded below). Six spots → **v97**. No migration. No Supabase write touched.

Ships **before** the grid rework in `ezplate-fable-dashboard-grid.md`, as the brief ordered: that
brief should not have to design around a known headline bug or a scope indicator about to move.

## The three questions the brief said to answer before writing code

1. **How does chart timeframe persistence work?** `js/app.js` — `var dashRange` is read once at module
   init from `localStorage.getItem('cafeDB_dashRange')||'3m'` behind a try/catch; `setDashRange` writes
   on selection then re-renders. localStorage only, `cafeDB_` namespace, no Supabase, and untouched by
   Settings → "Clear cache & refresh" (that clears CacheStorage, not localStorage). Scope now copies it
   exactly, as `cafeDB_dashScope`.
2. **Does the chart's all-menus line aggregate distinct plates?** **No — and it was neither of the two
   cases the brief anticipated.** See §2.
3. **Where does the heading text come from, and what else reads "on specials"?** The heading is a literal
   in `renderDashboard`; the scope beside the number was `verdictHtml`'s `.verdict-cap`, from
   `dashScopeLabel`. That helper has **one other reader the brief did not list — the Dig-in card
   subtitles** — so it stays; only the `verdict-cap` call site went.

## What the brief got wrong about the current code — flagged, not silently followed

**Section 2's root cause was already fixed.** The brief says the All-menus row "currently has an empty
right-hand column", which is why it reads as a section header. **It has shown a percentage since v96**
(`menuCompareHtml` computes `allPct=computeAvgFoodCost()` and passes it to the row), along with a
sparkline, and `dash-scope.test.js` has pinned it since that batch. Placement above the ranking,
equal row height, the ≥44px target and the shared selected-state treatment were all already in place.

**Max's call (29 Jul): verify, don't rebuild.** All six of those properties were re-checked against the
shipped code and the measured Playwright run rather than re-implemented. Nothing in §2 was built.

What survived from §2 was its **correctness** half, which was live and wrong — below.

## The figure: the unit was a publication, not a plate

`avgFoodCostForScope` iterates `MENU` (dishes / `menu_items`). Since v55 **one plate backs one dish per
menu it is published to**, so every publication was its own term in the mean. Measured on the real
extracted function, with a 20% plate published to two menus plus a 50% plate on one:

| basis | figure |
|---|---|
| what shipped through v96 (per publication) | **30.0%** |
| distinct plates, counted once (v97) | **35.0%** |
| mean-of-menu-averages | 27.5% |

So it was **not** mean-of-menu-averages — the case the brief expected and warned against — but it **did**
double-count multi-published plates. Under it, publishing an existing plate to a second menu moved the
café's headline food-cost number, despite being an event with no cost content whatsoever.

**Fixed at the source, per the brief: the chart's figure changed and the row followed.** Each plate's
publications now collapse to that plate's own mean first; the headline is the unweighted mean across
distinct plates. A plate on two menus at different sell prices genuinely has two food-cost %s, and its
own mean is the only way to count it once without privileging one menu.

**Narrowed scopes are arithmetically unchanged** — a plate appears at most once on a given menu, so every
group at menu scope has exactly one member. That was proven, not assumed: `dash-scope.test.js`'s "all-menus
scope reproduces the pre-v89 figure exactly" stayed green untouched, and a new test pins per-menu figures
directly. Both scopes run one grouping path deliberately, so they cannot drift apart again.

### The consequence Max accepted, and it is worth remembering

`priceHistory` holds points logged on the **old** basis and they cannot be recomputed — the inputs were
never stored, only the resulting percentage. So:

- the trend line has **one visible step at v97** if any plate is multi-published on Max's real data;
- for up to a year, the stat cards compare a new-basis "today" against windows containing old-basis
  points ("vs last week" for ~a week, "vs this year" until January).

Max's call, asked explicitly with the alternative (suppress the straddling comparisons) on the table:
**fix it and accept the step.** The figure is wrong every day it stays wrong. Nothing was done to hide it.

## The stale headline: one root cause, two stale regions

**Root cause — `dashComparisons()`:** the line
`if(current==null && priceHistory.length) current=priceHistory[priceHistory.length-1].v;`.
When nothing is costed **and** priced, `computeAvgFoodCost()` correctly returns null and this substituted
the **last logged point** — a figure describing a state that no longer existed.

The brief was right to say check whether all three regions recover. **It was never one region:**
`cmp.current` is the single value the headline **and all three stat cards** read, so both went stale
together — and `ytd=current` then re-injected the ghost as its own baseline, so "vs this year" reported
"holding steady" against nothing. **The chart was always honest** and is untouched: `priceHistory` is a
log of what *was* true, and drawing it is not a claim about now.

Fixed by deleting the fallback and letting null propagate. This also **re-reaches the dead branch the v96
handover flagged as follow-up 2** — `verdictHtml`'s "Nothing costed and priced yet" copy had been
unreachable at all-menus scope for exactly this reason, since v89. Same root cause, so it is not a
separate fix.

## Scope persistence

Mirrors `dashRange` exactly: read once at module init, written in `setDashScope` on selection only,
`cafeDB_dashScope`, device-local. **No Supabase, no `pushWrite`** — a view preference is not data and must
never become a row needing business-scoping when multi-tenant lands. The menu's **identifier** is stored,
never its list position.

**Validated at render, not at read** — a deliberate choice worth recording. `dashScopeValid()` already
collapses a scope with no row to All menus, silently, which is precisely the required fallback for a
deleted menu. Checking at module init instead would be actively wrong: `menusList` loads *after* the
module var initialises, so a boot-time check would discard every valid scope while Supabase sync was
still in flight. The stored id is kept, the display shows All menus until the menus arrive, and the scope
is honoured once they do. Pinned by a test that models exactly that sequence.

## Scope is stated once

Was three times: the highlighted By-menu row, `on <menu>` beside the number, and `— ALL MENUS` on the
chart title. Now: the card heading carries **metric + scope together**, the `.verdict-cap` is gone, and
the chart title is plain `Food cost trend`.

**The brief's deliberate exception was implemented and measured**, not just written: the metric stays
muted like every other `#dashBody` heading, and the menu name is full-strength via `.dh-scope`. A
Playwright test reads the **computed colours** rather than the source, because what matters is which rule
actually wins — a muted-by-default `h2` out-specifying the exception would have failed silently and
invisibly. The em dash separator was put on the muted side; only the name is bright.

**What deliberately stayed:** `.scope-note` ("Per-menu history is still building…"). It is not a
restatement but the v89 honesty **correction** — the line under a menu's name still covers every menu —
and dropping it would make the new heading lie about the chart. Same for `statLead`'s "all-menus".

## Verification

- `npm test` — **510 green** (489 baseline + 21 new). Baseline verified green at 489 *before* starting.
- `node -c` clean on `js/app.js`, `sw.js` and the four `api/*.js`. jsdom smoke green (24 sections).
- **Playwright — 79 tests, 78 pass.** The one failure is `fresh-states.spec.js` "v45 item 4: button copy",
  the known-stale pin CLAUDE.md documents. **Confirmed pre-existing by stashing this branch and
  re-running it on unmodified `main`** — not caused here.
- **Both fixes mutation-tested.** Re-introducing the v96 fallback and the per-publication mean turned
  5 of the new tests red; reverting the `setDashScope` write turned the reload spec red. The regression
  tests fail without the fix, which is the only thing that makes them regression tests.
- 380px screenshot checked directly: the heading renders `AVERAGE FOOD COST — WINTER` with the name
  visibly brighter than the metric.
- **CodeRabbit: 1 finding, fixed; re-run clean.** It flagged my new console-error filter as too broad —
  matching `/Failed to load resource/` would have swallowed a genuine app asset failure in a test whose
  entire assertion is "nothing surfaced". Correct catch. Rewritten to key on the failing request's URL,
  so only the off-origin and `/api/**` aborts `boot()` itself installs are ignored.

## A test that was passing for the wrong reason

`v96-menu-select.spec.js` seeds via `addInitScript`, which re-runs on **every** navigation — including
`page.reload()` — and the seed begins `localStorage.clear()`. So the reload wiped the very preference the
reload test existed to check. v96 could not see this: it re-seeded `cafeDB_dashRange` to `3m` and then
asserted `3m`, which passes whether the value persisted or was simply rewritten. The seed is now guarded
by a one-shot sentinel (`__spec_seeded`, deliberately outside the `cafeDB_` namespace) so storage belongs
to the app after the first load. **The v96 "range survives a reload" assertion was not evidence of
persistence.** Worth remembering for any future reload test.

## Pinned contracts changed in this commit, and why

- `.verdict-cap` assertions in `v89-dash.spec.js` (7) and `v96-menu-select.spec.js` (3) repointed to
  `.dh-scope`; the `.chart-title` "— all menus" assertions to plain `Food cost trend`. These are copy
  pins, not the desktop **geometry** blocks the brief reserved for the Fable grid batch — those were left
  pinning the current bento, untouched.
- `v96-menu-select.spec.js`'s "the selection does not survive a reload" is **reversed, not deleted**, with
  the reasoning at the test, so the file still records what the behaviour is meant to be.
- Untouched exactly as instructed: chart pins in `fresh-states.spec.js`, the dig-row touch floor in
  `v90-flows.spec.js`, the copy pins in `dash-scope.test.js`, and the geometry blocks in
  `v89-dash.spec.js` / `v90-dash.spec.js`.

## Deliberately NOT built

- Anything in §2 — it shipped in v96. Verified, not rebuilt.
- Any layout or grid work; no new metrics, tiles or cards; no further copy compression (out of scope).
- No "clear scope" / "reset" control — selecting All menus is that.
- No attempt to rewrite or backfill `priceHistory` onto the new basis. The inputs were never stored, so
  it is not recoverable; inventing it would be worse than the step.

## Needs Max's phone

Nothing here was device-verified. A narrow viewport is not a device. Per the brief there was **no
`flow-tester` pass** on this batch, so the automated tests carry more weight than usual — they were
written accordingly, and mutation-tested.

1. **The four v96 behaviours are now regression surface** and none is re-verifiable here: separate thumb
   hits, no select-on-scroll, selected state legible in kitchen light, tapping the selected row is a
   no-op. Nothing in this batch should have touched them — the row markup is unchanged — but that is a
   claim about the code, not about the thumb.
2. **The new heading.** Is `Average food cost — Winter` legible as *one* thing at arm's length in kitchen
   light, with the name bright and the metric quiet? The contrast is measured; whether it reads is not.
3. **A reload that restores the scope.** Open scoped to a menu, force-quit, reopen — does landing on a
   narrowed dashboard read as correct, or as the app having lost the overview?
4. **The headline number will move** if any plate is published to more than one menu. Worth a look on
   real data: does the new figure match Max's own sense of the café's food cost better than the old one?
5. Carried forward: everything on the v82–v96 phone list, still unsigned-off.

## Follow-ups

1. **With the chart title no longer restating scope, two lines under the chart now both say "all menus"**
   — `.chart-hint` ("All menus · trending down.") and, when narrowed, `.scope-note`. That is one fewer
   restatement than v96 had, not one more, so nothing regressed; but the pair is now the redundancy worth
   looking at. Not touched here: it is chart copy, and the brief put copy compression out of scope.
2. **The trend-line step at v97** (see above). If it looks wrong on real data, the options are to leave it
   or to suppress straddling stat-card comparisons — both were costed; Max chose to accept the step.
3. `menu_price_history` RLS — still unverified whether Max has run
   `supabase/migrations/20260728_menu_price_history_rls.sql` in the SQL editor. A merged file grants
   nothing. Unchanged from v96, restated because it is still true.
