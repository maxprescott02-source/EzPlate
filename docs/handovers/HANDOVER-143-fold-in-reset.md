# HANDOVER - 143 (v3 fold-in reset)

**Branch:** `docs/fold-in-reset` · **Scope:** Max replaced `docs/design_handoff_ezplate_redesign/` with a new package and asked for the §0a/§0b queue reset, then overrode §0a's revert in chat. Docs only.
**Shipped no deploy version.**

## What changed
The new package (FOLD-IN-PROTOCOL.md, V3-Design-Package.md, two dc mocks with light AND dark) is committed and both mocks were clicked through screen-by-screen before anything was written.
The fold-in direction is inverted: the mock is truth for structure, hierarchy and interaction; the app is truth for data, business rules and side effects; every screen's view layer is rebuilt from the mock and re-attached to existing logic, never restyled in place.
`docs/QUEUE.md` lost the V-series (V4c-V10, G2, the features list, the 9 Aug preamble) and gained F1-F10 (shell + one item per screen, desktop and mobile together, §4 criteria as definition of done) plus the §11.5 behaviour specs written as trigger / data / state changes / error path.
**Max overrode §0a's revert (10 Aug 2026, this session): no reset pass.** V1-V4b's shipped paint stands until each screen's F-item rebuilds it; F1 reconciles the shipped shell against the mock instead of starting clean.
The override is recorded three places: the queue preamble, a dated amendment at the top of FOLD-IN-PROTOCOL.md, and here.
Dark mode returns: the package ships dark and protocol §6 orders both palettes ported, which supersedes the 9 Aug light-only answer.
Stranded references were re-pointed (five Do-after lines to F10, the restore-wipe schedule to F1-F10, the blocked audit item's V5/V6 mentions to F7 and the floating-layers item).

## Into CLAUDE.md
Nothing proposed this batch.
The "builder IS a MODAL" Tier 2 edit still rides F7, per the standing 9 Aug yes.

## New docs/QUEUE.md items
F1-F10 and eight behaviour-spec entries, described above; G2 marked superseded.

## New docs/PHONE.md items
None.

## Probe
**What did the brief or queue item tell you to do that you would have done differently?**
The protocol's §0a assumed an abandoned, half-converted pass; the record shows five whole batches that shipped green and reviewed.
I flagged that the revert it ordered would have to preserve behaviour fixes tangled into v132-v135, and Max then cut the revert entirely, which I agreed with: every F-item deletes the old markup wholesale anyway, so the revert bought only legibility the queue already provides.
**What did you not propose because it was out of scope?**
Nothing built; per instruction no application code was touched.
The Account screen (F10) sits in tension with the recorded multi-tenant deferral, so the item is written to reduce to one question for Max rather than a build.

## Surprises
The desktop mock renders table rows a beat after the screen paints (staged entry motion), which looked like empty screens on the first fast click-through.
Esc does not close modals in the mock's own runtime even though §4 and §7 require it; the spec wins and F1's primitive builds it.
The package replacement deleted the old addendum mocks from disk, which is what forced G2's supersession rather than a re-point.
