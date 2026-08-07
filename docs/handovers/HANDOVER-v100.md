# HANDOVER — v100 (batch 1: Menu)

**Branch:** `feature/menu-batch` · **Scope:** the Menu tab's approved cull +
Part B checklist from the Batch 0 audit, plus the two batch-1 riders Max
assigned: the v45 pin reconciliation and `user-scalable=no` removal.

## The cull table (Menu tab: 64 explanatory words → 20, −69%)

| Surface | Was | Now | Why |
|---|---|---|---|
| Strapline (index.html:113) | "Cost vs price for every plate — the lights show what needs a rework" (13w) | **CUT** | The Healthy/Watch/Rework chips are the colour key; the table is the explanation. |
| Target meta line (:142) | "…your 40% **food-cost** target — change in Settings" | **COMPRESSED** — "…your 40% target — change in Settings" | The money anchor (live %, Settings link) survives; ids untouched, the v52 header pin still passes. |
| Add-existing-plate modal | "Put an already-costed plate onto <menu> at its own price. The plate stays shared — update it once and both menus follow." (22w) | **COMPRESSED** — "Adds to <menu> at its own price — the plate stays shared." (11w) | Kept `#ad_menuName` (a real anchor: names the target menu, JS populates it — null-guarded but live). Both facts that prevent mistakes survive. |
| New-menu modal | "New menus start empty. Publish or move plates into them from the Plate Builder or a plate's Edit screen." (19w) | **CUT** | Duplicates the Menu tab's pinned empty state ("Publish a plate from the Plates tab to see it here"). |

KEEP (untouched, per the approved audit): the mlf-chip labels, tooltips,
`vbadge`/"not costed" labels, all confirm dialogs and empty states.

## Visual (Part B checklist applied)

- **The last third-tone band outside the dashboard is gone**: desktop
  `.atable tr.sec td` dropped its `--surface2` fill — section headers are now
  quiet uppercase text boundaries at every width (the v98 one-card-tone rule).
- **Quiet data labels**: the four per-card `td::before` labels lost their
  uppercase/letter-spacing eyebrow costume (now fs-xs/600/muted, UI face —
  they were inheriting `td.num`'s mono). Uppercase is reserved for the real
  boundaries: `tr.sec` and desktop `th`.
- **Spacing on the scale**: wrap side edge 12→16px (mobile), row padding
  5→4px, section margins on-scale, desktop cells 12px, ≥1024 "roomier" cells
  13/14px → 12/16px, mlf-chips 8/14 → 8/12px.
- **Card radius** 12px → `--radius-card` (16px), matching the system (Max's
  scope addition).
- **Type literals → tokens** on every line touched (13→`--fs-sm`,
  15→`--fs-base`, 11→`--fs-xs`).
- **`user-scalable=no` AND `maximum-scale=1` removed** from the viewport tag —
  removing only the former would have left zoom blocked on Android; the intent
  of the decision was "allow pinch zoom", so both went.

## The v45 pin — THE SUITE IS FULLY GREEN FOR THE FIRST TIME SINCE v72

`fresh-states.spec.js` expected `+ Existing dish`; the app has correctly said
`+ Existing plate` since the v86 dish→plate terminology pass. One word changed
in the spec (deliberate pin update). **Playwright is now 91/91** — green is a
real signal again.

## Scoping judgement call (and the CodeRabbit exchange)

The invoice review table does NOT carry `.atable` (it renders as
`class="invtable"`, app.js:4926 — the `:not(.invtable)` guards in the CSS are
vestigial), so section 12's `.atable` rules were edited in place without
touching the fragile area. The ONE shared class is `.atable-wrap`, which the
invoice modal reuses — its padding change is `#tab-analysis`-scoped with a
≥640 mirror (id-specificity would otherwise leak the mobile padding onto
desktop). CodeRabbit raised exactly this leak theory (false positive — it
assumed `.atable.invtable`; skipped with the markup as evidence) plus one real
find: at ≥1024 the more-specific ≥640 first-column selector out-ranked the
"roomier" padding rule, so the Plate column misaligned 4px from its header
(pre-existing at 2px; my change widened it) — **fixed** by listing the
first-child selector in the ≥1024 rule.

## Verification

- `npm test` 509 green · `node -c` clean · jsdom smoke green (24 sections).
- **Playwright 91/91** run alone. One mid-batch run produced 3 phantom
  failures (incl. a dashboard spec this batch cannot touch) on a run that was
  47% slower than baseline — the v98 degraded-host pattern; the named spec
  passed 7/7 in isolation and the clean rerun was 91/91. Machine, not code.
- Throwaway computed-style spec (scratchpad): both themes × 380/1280 —
  no third tone on section rows, quiet labels confirmed by computed style,
  radius/edges on-token, strapline absent, meta line keeps live % + link. 4/4,
  screenshots eyeballed.
- CodeRabbit: 2 findings — 1 fixed, 1 false positive (reasons above).

## Needs Max's phone (v100)

1. **Pinch-zoom now works — test it against the FIXED chrome** (Max's own
   rider): zoom in on each tab and check `.bottomnav` and the builder's sticky
   Save bar behave sanely under zoom. This is the one place removing
   `user-scalable=no` can bite, and it's why the attribute existed.
2. Menu cards at 380px: quiet lowercase labels — still scannable in kitchen
   light, or do the rows now blur together without the uppercase?
3. Desktop Menu: section headers without the beige band — do groups still
   separate clearly?
4. The compressed Add-plate modal line and target meta line in situ (the meta
   line wraps after "—" at 380px; acceptable pre-existing behaviour, say if
   it bothers).
5. **E1 from the v82 backlog** (this tab's carried item): price a dish in the
   Add-to-menu dialog, watch the live margin preview, save, and confirm the
   Menu row shows the same number/light.

Carried forward: the v82–v99 phone list.
