# HANDOVER - 131 (Q7: Products redesign)

**Branch:** `feature/q7-products-redesign` (PR #94) · **Scope:** queue item Q7, the Products screen of the redesign phase.

**Ships `ezplate-v126`.**

**Suite at close:** `npm test` **800 green** · **105** Playwright green (one new spec) · `node -c` clean.

## What changed
The Products card grid became one surface of rows: name · brand / category / supplier / price / Change at desktop; name over a category · supplier sub-line with price and drift stacked right on the phone.
The Change column shows the last logged move by the same rule as the Ingredients rows and What-moved, "—" when untouched.
The density toggle (Comfortable/Compact) is the one legal new localStorage key, a pure view preference; compact drops sub-lines only, never a figure.
A floating add button serves the phone on the app's most-scrolled list.
The v99 price-basis rule survives by dedupe: the "per kg" label renders exactly when the figure does not already carry the basis - which is when it is the correctness flag.

## Into CLAUDE.md
Nothing.

## New docs/QUEUE.md items
None new; the stale handover-path comments rider was NOT done here (forgotten while the review findings were being fixed) and is now attached to Q8's entry with a fix-in-this-batch instruction.

## New docs/PHONE.md items
None - driven at 380/768/1280, both themes, both densities. The FAB's feel under a thumb (and whether it fights the install banner, which sits above it in z-order) is worth a glance during the standing v104 Products visit.

## Probe
**What did the item tell you to do that you would have done differently?**
Nothing structural. The mock's mobile frame puts the FAB inside the screen; the app's tabs animate transform on entry, which silently makes a fixed child position against the tab, not the viewport - the review measured it parked below the fold. The mock cannot know that; the fold rule covered it.

**What did you not propose because it was out of scope?**
Hiding the header "+ New" on mobile to satisfy one-primary-CTA (the FAB duplicates it) - the header actions row is measured by layout-consistency across tabs, and unpicking that is Q10 territory if Max minds the duplication.
A header row for the desktop columns - no list in the app has one; the drift spans carry aria-labels instead.

## Surprises
- **A transform ancestor captures position:fixed children.** The tabIn entry animation made the FAB position against the 393-row tab for 220ms on every entry - invisible, then popping into place. Fixed elements inside anything that animates transform are a trap this codebase now knows about; the button lives at body level with showTab gating it.
- The review caught the density control at 36px - under the global 44px floor - in the same batch whose stated purpose was thumb reach. The floor rule at style.css:167 is a type selector, so any class with min-height silently overrides it.
- Five of the review's eleven findings were about tests overclaiming (the docblock promised what no assertion checked; every fixture product has supplier:null so the supplier column had zero coverage). The fixture's blind spot was invisible until someone asked what the specs could NOT see.
