# HANDOVER v97 — Scope persists, scope is stated once, the headline stops going stale

**Completed:** 29 Jul 2026 · branch `feature/dash-scope-persistence`.
Brief: `ezplate-opus-scope-consolidation_1.md`. Two decisions taken with Max — one before building,
one **after seeing it on real data, which reversed the brief’s §2** (recorded in full below). Six spots
→ **v97**. No migration. No Supabase write touched.

Ships **before** the grid rework in `ezplate-fable-dashboard-grid.md`, as the brief ordered: that
brief should not have to design around a known headline bug or a scope indicator about to move.

## The three questions the brief said to answer before writing code

1. **How does chart timeframe persistence work?** `js/app.js` — `var dashRange` is read once at module
   init from `localStorage.getItem('cafeDB_dashRange')||'3m'` behind a try/catch; `setDashRange` writes
   on selection then re-renders. localStorage only, `cafeDB_` namespace, no Supabase, and untouched by
   Settings → "Clear cache & refresh" (that clears CacheStorage, not localStorage). Scope now copies it
   exactly, as `cafeDB_dashScope`.
2. **Does the chart’s all-menus line aggregate distinct plates?** **No.** It is a flat per-publication
   mean — neither of the two cases the brief anticipated. It was changed to distinct plates and then
   **reverted on real data**; see the section below, which is the most important part of this handover.
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

What survived from §2 was its **correctness** half — and that turned out to be a design question rather
than a bug. Below.

## The figure: attempted, tested, and reverted on real data

`avgFoodCostForScope` iterates `MENU` (dishes / `menu_items`), and since v55 **one plate backs one dish
per menu it is published to** — so every publication is its own term in the mean. The brief called this a
double-count and asked for distinct plates. It was built that way, fully tested, and then **reverted by
Max before merge, on his own data.** The final code counts per publication, as v96 did.

Recording the whole arc, because the shipped code now looks exactly like the bug the brief asked to fix
and the next person to notice it must find this rather than "fix" it again.

### What was measured

Not mean-of-menu-averages, the case the brief anticipated. A flat per-publication mean. With a 20% plate
published to two menus plus a 50% plate on one:

| basis | figure |
|---|---|
| per publication (v96, and now v97) | **30.0%** |
| distinct plates, counted once | 35.0% |
| mean-of-menu-averages | 27.5% |

### Why it was reverted

Max compared the preview against production and asked why All menus read **21.4%** when both By-menu rows
read **21.6%** and **21.7%**. His console breakdown: **41 dishes, 40 distinct plates, 0 orphaned dishes**,
and exactly one plate on two menus — **Bacon & Egg Muffin, 28.8% on specials and 30% on Original, ~29.4%**,
well above his ~21.5% average. Counting it once dropped one dear entry from the pool: 21.59% → 21.40%.
Arithmetic, reproduced exactly against the shipped function. No data fault.

**The property that was silently lost:** counting per publication makes the all-menus figure a
dish-count-**weighted blend** of the per-menu figures, so it is arithmetically guaranteed to sit inside
the range of the By-menu rows. Counting distinct plates does not — a shared plate dearer than average
loses its second copy and the headline falls **below every row**, in a list where it sits in the same
column as those rows.

A first attempt fixed the *presentation* — a conditional line explaining that All menus counts each plate
once. Max's call was that the number itself should not contradict every row: **a headline that
disagrees with everything under it costs more trust than the 0.19pt correction buys.**

### What the revert is pinned by

Three tests, and the middle one is the point:

- **the per-publication rule**, stated as a decision with a pointer to the reasoning in `js/app.js`;
- **the INVARIANT** — All menus lies within the range of the By-menu rows — swept over four shapes (dear
  shared plate, cheap shared plate, lopsided menus, same plate at different prices). Precondition: every
  counted dish has a row, i.e. its `menuId` is in `menusList`. Orphaned dishes are the one exception and
  are follow-up 3;
- **the KNOWN COST** — republishing a plate to another menu *does* move the headline, though nothing got
  dearer. Pinned so it reads as a choice rather than a regression.

Mutation-tested: reintroducing distinct-plate counting turns all three red, the invariant included.

**If this is revisited, the fix is not to change the maths quietly.** It is to stop the By-menu list
presenting the headline as comparable to the rows — that is the actual tension, and it is a design
question, not an arithmetic one.

### What this means for the trend line

**Nothing.** The earlier plan warned of a one-time step in `priceHistory` and cross-basis stat-card
windows for up to a year. With the revert, the basis never changed: no step, no cross-basis comparison,
no caveat. That whole risk is gone.

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

- `npm test` — **509 green** (489 baseline + 20 new). Baseline verified green at 489 *before* starting.
- `node -c` clean on `js/app.js`, `sw.js` and the four `api/*.js`. jsdom smoke green (24 sections).
- **Playwright — 79 tests, 78 pass.** The one failure is `fresh-states.spec.js` "v45 item 4: button copy",
  the known-stale pin CLAUDE.md documents. **Confirmed pre-existing by stashing this branch and
  re-running it on unmodified `main`** — not caused here.
- **Everything load-bearing is mutation-tested.** Re-introducing the `dashComparisons` fallback turns the
  stale-headline regressions red; reverting the `setDashScope` write turns the reload spec red; and
  switching `avgFoodCostForScope` to distinct-plate counting turns all three figure tests red, the
  invariant included. A regression test that does not fail without the fix is not one.
- 380px screenshot checked directly: the heading renders `AVERAGE FOOD COST — WINTER` with the name
  visibly brighter than the metric.
- **CodeRabbit: 2 findings across the batch, both fixed, final run clean.** (1) My console-error filter
  was too broad — matching `/Failed to load resource/` would have swallowed a genuine app asset failure
  in a test whose entire assertion is "nothing surfaced"; rewritten to key on the failing request's URL.
  (2) After the revert, my tombstone comment read as though the distinct-plate maths had shipped;
  corrected. Both were right.

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

- Anything in §2's *presentation* — it shipped in v96. Verified, not rebuilt.
- §2's distinct-plate maths — **built, tested, then reverted by Max on real data.** The per-publication
  figure v96 shipped is what v97 ships. Fully documented above rather than quietly dropped.
- The conditional "one plate is on more than one menu" line that explained the distinct-plate figure —
  it went with the maths it explained. `multiPublishedCount()` left as a tombstone comment only.
- Any layout or grid work; no new metrics, tiles or cards; no further copy compression (out of scope).
- No "clear scope" / "reset" control — selecting All menus is that.
- No `priceHistory` rewrite — and with the revert, none is needed: the basis never changed.

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
4. **v97 does not change the headline number on current data** — the basis is unchanged, which is the
   whole point of the revert. (Republishing a plate still moves it; that is the accepted standing cost,
   not something v97 introduced.) Nothing to verify on the phone; noted so nobody re-opens it.
5. Carried forward: everything on the v82–v96 phone list, still unsigned-off.

## Follow-ups

1. **With the chart title no longer restating scope, two lines under the chart now both say "all menus"**
   — `.chart-hint` ("All menus · trending down.") and, when narrowed, `.scope-note`. That is one fewer
   restatement than v96 had, not one more, so nothing regressed; but the pair is now the redundancy worth
   looking at. Not touched here: it is chart copy, and the brief put copy compression out of scope.
2. **The By-menu list presents the headline as comparable to the rows, and that is the real tension.**
   Per-publication counting keeps them arithmetically consistent, at the cost of the headline moving when
   a plate is republished. Distinct plates fixes that and breaks the consistency. Both were built; Max
   chose consistency. If it is revisited, the answer is a design one — stop implying All menus is a row
   like the others — not a quiet change to the maths.
3. **`avgFoodCostForScope` includes dishes whose menu has NO By-menu row** (a `menuId` not in
   `menusList`). Max has zero of these today — verified in his console output — but such a dish would
   break the invariant above without any shared plate involved. Pre-existing, out of scope, unfixed.
4. `menu_price_history` RLS — still unverified whether Max has run
   `supabase/migrations/20260728_menu_price_history_rls.sql` in the SQL editor. A merged file grants
   nothing. Unchanged from v96, restated because it is still true.
