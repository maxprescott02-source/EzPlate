# HANDOVER - 125 (Q3: Menu redesign)

**Branch:** `feature/q3-menu-redesign` (PR #83) · **Scope:** queue item Q3, the Menu screen of the redesign phase.

**Ships `ezplate-v122`.**

**Suite at close:** `npm test` **791 green** · **102** Playwright green · `node -c` clean.

## What changed
The Menu row's verdict cell now composes figures: food-cost % plus the dollar amount the price is short of suggested ("20.0% ✓", "42.2% · +90c").
The light still comes from `analyze()`, so the publish preview, the filter chips and the row cannot disagree.
Mobile rows went from a 2x2 labelled card per plate to one surface of one-line rows, name + coloured verdict + "$x cost · $y on menu".
Column headers tightened to Cost / Menu price / Food cost; the `lt-*` stripe paint retired (classes stay as wiring).
Uncosted rows read "· not costed yet" beside the name with a muted dash for a verdict, never red.
The verdict span carries an aria-label because the phone layout hides the thead, which was the cell's only announced meaning.
Also shipped: `docs/decisions/2026-08-08-2.html`, one file covering all five decision-blocked queue items.

## Into CLAUDE.md
Nothing.

## New docs/QUEUE.md items
`analyze().absPct` lost its last reader in v122 - trim or keep next time `analyze` is touched (in Small).
Mobile amber/red verdicts now differ only by hue for sighted users - folded into Q10, where the contrast rules land.

## New docs/PHONE.md items
None - driven at 320, 380 and 1280 in both themes, and the one-line rows are comfortably above the touch floor.

## Probe
**What did the item tell you to do that you would have done differently?**
The queue plan named the column "Margin" and specified "cost it →" for uncosted rows, both straight from the mock.
Both shipped in the first commit and both were wrong: the cell shows food-cost % (27.2% food cost is a 72.8% margin), and the row tap opens the price editor, which has had no route to the builder since v55.
The pre-push review caught both; the header is now "Food cost" and the dead arrow is an honest dash.
Worth noticing: I implemented the mock's copy faithfully even after v120's "judged against the mock" lesson - the fold rule covered layout but the same failure mode applies to words.

**What did you not propose because it was out of scope?**
A route from an uncosted dish to its plate in the builder - it would make "cost it →" honest instead of deleted, but v55 removed that chip deliberately, so reopening it is a decision, not a patch.
Aligning the publish dialog's whole-number % with the row's one-decimal % - same ratio, different display precision, different screen's batch.

## Surprises
- The review's "Margin header" finding is the strongest argument yet for blinding it to the brief: the brief said "Margin", so a brief-aware reviewer would have approved it.
- The invoice modal turned out to share only `.atable-wrap`, not `.atable` - the fragile-area warning in the CSS comments reads scarier than the actual coupling, and every `.atable` rule is Menu-only.
- `menuMarginPreview` already computed the exact food-cost % the redesign needed, eight versions early - reuse cost three lines.
- The decide threshold felt right this time: five parked questions went into one file without stalling anything, but Max answered five others only this morning, so if this second file sits unanswered a week the threshold is reading as homework and should rise.
