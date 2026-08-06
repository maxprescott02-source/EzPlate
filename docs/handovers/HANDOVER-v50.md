# HANDOVER v50 — invoice new-item state persistence, menu button colour

Branch: `fix/invoice-new-item-state` (off `main` at v49). Batch brief:
`~/Downloads/ezplate-opus-invoice-state-bug.md`. Model: Opus.

Baseline before starting (verified, not trusted): `main` had already advanced
to **v49** — the v42–v48 and v49 branches were merged after Max's phone
sign-off, contradicting the stale "main is v41" text in CLAUDE.md. That text
was corrected at the start of this session (with Max's confirmation). `npm test`
= 138 green, `node -c` clean, six version spots at v49.

Shipped v50: **139 green** (+1 new regression), jsdom smoke green (+1 new
section), 34 Playwright checks pass, `node -c` clean, six spots at v50.

---

## Item 1 — new-item form lost its data on unrelated row edits (FRAGILE AREA)

### Confirmed root cause (diagnosed before patching, per CLAUDE.md rule)
The invoice "+ New" inline form's field values **and its Apply tick lived only
as uncontrolled DOM inputs**, never on `invRows[i]`. Editing any *other* row
(pick a match, change a pack size, edit a price) calls `renderInvReview()`,
whose single render path does `box.innerHTML = html` — destroying the whole
table including the open form. On rebuild the row still had `r.addNew === true`
but an **empty, collapsed** `.ni-panel` (a fresh DOM node, so
`expandNewItem`'s `panel.dataset.built` guard rebuilt from scratch and was
never re-called), and the checkbox was recomputed as
`checked = (invRowState(r) === 'matched')` → `'new'` → **unticked**. So the
line silently cleared and un-ticked, and reported as unaddressed on Confirm All.

The `r.newItem` field already existed on every row (declared in `buildInvRows`,
`newItem:null`) but was **completely dead** — never read or written anywhere.
It was the intended home for exactly this state.

### Fix — state flows DOM → `r.newItem` → DOM across every render
Root-cause fix at the data flow, **not** by preventing re-renders (that would
risk the v33 stale-cell class of bug). New helpers `niSnapshot(i)` /
`niRehydrate(i)` (js/app.js, just above `expandNewItem`):

1. **Capture before the wipe.** At the very top of `renderInvReview`, before
   anything is destroyed, snapshot every *open* new-item form's live DOM
   (all fields + combo state + the row's `.invAppr` checked) into `r.newItem`.
   Because this runs on the ONE render path, it covers every trigger uniformly
   (invSelChanged, price change, pt-done, cand-chip, another row's + New, …) —
   no per-cell poking, v33 invariant intact.
2. **Guarded on `r.newItem` truthy** — see the sharp edge below.
3. **Restore after the rebuild.** After `box.innerHTML=html` + wiring, re-open
   and rehydrate any `r.addNew && r.newItem` form (inputs, `niCombos` state, and
   the "Editing new item ↓" button label).
4. **`expandNewItem` tail**: first open snapshots the prefilled defaults onto
   `r.newItem`; every later (re)build rehydrates from it — so the rehydration
   source of truth is the row, not the DOM.
5. **Tick persistence**: the row-build `checked` gains
   `|| !!(r.newItem && r.newItem.approved)`. Matched rows still auto-tick; the
   **v39 pin holds** because a row with no `newItem` is unchanged — a filled
   new item is only ticked once the *user* ticks it; the tick then survives
   re-renders. It is preserved user intent, not renderer auto-tick.
6. **Abandon paths clear it**: `closeNewItem` and `invSelChanged` set
   `r.newItem = null` (dismiss / pick a real match = discard the form).

### Sharp edge found by the regression test (fixed in the same batch)
First cut snapshotted **any** `#ni_name{i}` present in the DOM. Because a form
from a *previous* `invRows`/import can linger in the table between renders, a
brand-new `addNew` row (`newItem:null`) at the same index could **absorb that
stale form** and auto-reopen with someone else's half-typed values — a real
cross-import bleed my own fix would have introduced. Guarding the snapshot on
`r.addNew && r.newItem` (only re-capture a form THIS row actually opened) fixes
it: a fresh `newItem:null` row is never captured from stale DOM. The smoke test
caught this before it could ship.

### Regression tests (two, because the fix has a pure part and a DOM part)
- `tests/inv-rowmarkup.test.js` (**default suite**, source-sliced from the real
  `renderInvReview` row build): a new-item row with `newItem.approved:true`
  renders `invAppr" checked`; with `newItem:null` or `{approved:false}` it does
  not (v39 preserved); the ticked new row is still `st-new`.
- `tests/smoke.js` **section [11]** (jsdom — the field round-trip is inherently
  DOM, and jsdom is deliberately not a suite dep): open + fill the new-item form
  on row 0 (Name/Price/Pack) + tick Apply, then **edit a different row** (change
  row 1's price → real full re-render), and assert row 0's three fields + tick
  survive in the rebuilt markup and the row is still `st-new`. This is the exact
  repro from the brief.

---

## Item 2 — "+ New menu" button colour

`#menuNewBtn` (index.html:110) was `class="btn menu-new-btn"` while its
siblings `#kingNew` (Ingredients) and `#newBtn` (Products) are `btn primary`.
Added `primary` → `class="btn primary menu-new-btn"`. Verified computed
`background-color` is now `rgb(184,78,12)`, identical to `#newBtn`/`#kingNew`.
`.menu-new-btn` (font-size/padding only) doesn't fight `.btn.primary` (colour),
so the shared primary accent wins. The mobile short-label pattern
(`<span class="btn-noun"> menu</span>`) is untouched. `#menuAddDishBtn`
("+ Existing dish") deliberately stays plain — it's a secondary action, not a
"+ New", so it must not read as the primary CTA.

---

## Item 3 — chart caption vs the plot's left edge

**Outcome: no change shipped (Max's call, after seeing both rendered).**

The brief suspected the caption was at a different left edge from the chart.
Diagnosed with a throwaway Playwright measurement at 380px + 1280px: the
caption, the chart title, and the y-axis labels **already share one left edge**
(380px: all at 29px; 1280px: all at 281px), which is also the edge of every
other card header and stat row. The v48 "one left edge with the title +
caption" rule **was already applied here** — nothing was missed. The only thing
inset is the plotted curve (73px / 353px), by design: the axis labels live in
that `padL` gutter.

So the "two left edges" in the screenshot is the caption (correctly at the card
edge) vs the *curve* (correctly inset) — not a caption-vs-labels mismatch. The
only real options were **A** leave it (caption tracks the labels + headers) or
**B** indent caption+title to the curve (which would then jog away from the
axis labels and the section header directly beneath). Rendered both into a
comparison artifact; Max chose **A — leave as-is**. No CSS change. The v48 rule
stands.

(If ever revisited, B is a one-line change: `margin-left` on `.chart-hint` +
`.chart-title`, matching `padL/W` ≈ 13.75%. Not done — deliberately.)

---

## Cache version
All six spots bumped v49 → v50 (sw.js CACHE + two `?v=`, index.html css + js,
`APP_VERSION`). `tests/settings.test.js` + smoke's derive-from-sw.js check both
green.

## Deliberately NOT built (scope discipline)
- Item 3 alternative (B) — Max chose A.
- General per-row tick persistence for *matched/review* rows (same latent
  "tick lost on re-render" class, but out of scope; the brief scoped item 1 to
  the new-item form). Flagging it here as a known, un-fixed parallel: ticking a
  review/price-change row and then editing another row still drops that tick.
  Worth a follow-up if Max sees it in the wild.
- Tidy lists Settings UI (HANDOVER-v40 spec) — still not built; next feature.

## Needs Max's phone (branch preview) before merge
**Export a JSON backup first.**
1. **Item 1, the real repro on a real invoice**: import a supplier invoice with
   at least one unmatched line. Open "+ New" on it, fill Name/Brand/Category/
   Price/Pack/Kitchen-name, tick Apply. Then go and change a *different* row
   (pick a different match, or edit its pack qty). The new-item form must keep
   every typed value AND stay ticked. Confirm All must then actually create it.
   Also: open + New on two different lines, fill both, confirm neither wipes the
   other.
2. **Item 1 combos**: the Brand/Category/Supplier/Kitchen-name comboboxes must
   keep their picked/typed value (and "Create new" confirmation) across the
   re-render, not just the plain text fields.
3. **Item 2**: Menu tab — the "+ New menu" button now reads as the primary
   orange, matching "+ New ingredient"/"+ New product"; "+ Existing dish" beside
   it stays plain. Both themes.
4. **Item 3**: nothing changed — sanity-check the chart caption still looks
   right to you at a glance (both themes, a couple of ranges).

## How verified in-container
`npm test` 139 green · `node tests/smoke.js` all pass (jsdom) · `node -c
js/app.js` clean · `npx playwright test layout-consistency + fresh-states` 34
pass · computed-style check on the three +New buttons. No browser here for
*feel* — items above are the phone list.
