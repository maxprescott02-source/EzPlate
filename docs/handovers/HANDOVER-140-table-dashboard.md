# HANDOVER - 140 (V2+V3: table system + Dashboard)

**Branch:** `feature/v3-table-dashboard` (PR #111) · **Scope:** queue items V2 (table system) and V3 (Dashboard, spec §3.1), run together per V2's `Do with:`.
**Deploy version shipped: `ezplate-v133`.**

## What changed
Desktop Dashboard is the v3 screen: a 3-cell KPI strip (avg food cost with the pts gap, plates over target, not costed or priced) replaces the 44px hero at ≥1024; band headers on Needs-attention / What moved / Dig in; What-moved deltas as tinted mono pills; the scope dropdown restyled with every v129 behaviour intact.
The sidebar Dashboard entry now carries an honest badge: the all-menus average, only when over target, announced to screen readers through the button's label.
Mobile is untouched until V9.
V2's shipped primitives are the header band and the good/bad pills; the row-button base, `.pill-warn` and the group rows deliberately wait for V4a, their first real consumer.
The Gemini credit now reads "Phrased by Gemini, computed by EzPlate" - the reveal law (hidden until Gemini truly phrased a shown line) is unchanged.

## Into CLAUDE.md
Nothing proposed.

## New docs/QUEUE.md items
- KPI delta pill (blocked on Max): the mock draws "+2.4 pts vs last month"; v98's tombstone records Max deleting exactly that stat class. Shipped without it; his call whether it returns labelled.
- (Carried from the plan, not new: briefing-row action links are new function and wait for a §11.5 brief.)

## New docs/PHONE.md items
None - the mobile screen did not change.

## Probe
**What did the queue item tell you to do that you would have done differently?**
The spec §3.1 asks for a delta pill and an always-visible credit in the band; both lost to recorded app law (the v98 deletion and the credit-reveal law).
The mock's §1.2 "muted" was already corrected in V1; this batch found the §11.1 audit-first rule genuinely load-bearing - the v129 dismissal/focus rules would have been easy to break unseen.
**What did you not propose because it was out of scope?**
Making the briefing rows navigable (the mock's ONE-link-per-row) - queued to function.
The Dig-in detail rows showing the same figure unpilled as What-moved's pills - V4a/V10 territory, noted in the review ledger.

## Surprises
The review caught the "Not costed" cell counting fully-costed plates that merely lack a sell price - the label would have sent Max hunting ingredient gaps that do not exist. The cell is now "Not costed or priced" and counts honestly.
It also caught the two KPI cells using different target epsilons (green 30.0% beside a red "1 over target" on a rounding hair), the badge going stale on a target change (the one input that changes its answer without changing data), and the first-cut tests passing with the counters swapped.
The browser drive caught a "30%%" in the strip that the unit stub had hidden by mirroring `fmtTargetPct` wrongly - the second stub-lied incident in two batches; stubs now mirror return shapes and say so.
