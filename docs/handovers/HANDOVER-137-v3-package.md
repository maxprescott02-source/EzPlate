# HANDOVER - 137 (v3 design package into the queue)

**Branch:** `docs/v3-redesign-queue` · **Scope:** Max dropped the v3 design package into `docs/design_handoff_ezplate_redesign/` and asked for it to be queued.
**Shipped no deploy version** - docs only.

## What changed
The queue's redesign phase now targets the v3 package: batches V1 to V10 in the spec's §10 order, replacing the v2 phase's remaining items.
G1 (error restyle) and G3 (first-run) folded into V8 (states); G2 (tablet) survives keyed to the old addendum §17 because v3 has no tablet spec.
The old Q10 sweep became V10, carrying forward only the notes still true after v3 (aria-labels, `.misc-name` ring, reduced-motion check); the Esc-stacking and focus-trap defects moved to V6 where the modal shell is open.
Six v3 features queued to function per spec §11.5: command palette, invoice import history (needs a new Supabase table - nothing records an import today), plate Duplicate, builder recent-range, mobile camera upload, CSV export.
The Account screen and Delete-workspace modal were routed to the multi-tenant phase - they describe auth, roles and billing that do not exist.
Four downstream `Do after:` lines re-pointed from Q6/Q10 to V6/V10.
The package itself (spec + two mocks) and Max's rewritten README committed.

## Into CLAUDE.md
Nothing yet.
V5 ships the Tier 2 edit reversing "the builder IS a MODAL"; the yes for that edit was given with the decision below.

## New docs/QUEUE.md items
The whole V3 phase block: V1 to V10, G2 re-anchored, six feature items, one multi-tenant pickup.

## New docs/PHONE.md items
None.

## Probe
**What did the brief tell you to do that you would have done differently?**
The spec locks a light-only theme, draws the builder as a full page and specifies a new font - all three collide with shipped features or standing decisions, so none were queued silently.
Max was asked all three on 9 Aug 2026 and took all three recommendations: builder full-page (an explicit reversal of his 8 Aug modal decision, made with that history on the table), light only with the theme control removed in V1, Geist self-hosted.
**What did you not propose because it was out of scope?**
Deleting the superseded v1/v2 `.dc.html` files; G2 still keys to the addendum, so they stay.
The spec's §9 demo dataset as staging seeds; staging is still unreachable, so there is nowhere to seed.

## Surprises
The v3 spec's "recent imports" table has no backing store anywhere in the app; it looks like a restyle but is a data-model feature, which is why it got its own queue item.
The spec's §8 product rules independently confirm three decisions already shipped or queued (scope dropdown v129, no density toggle v130, no dollar deltas in verdict cells), so the package and the queue agree on those.
