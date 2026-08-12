# Fold-in Protocol — v3 SaaS redesign into the existing EzPlate app

Supersedes §11 "fold-in playbook" of `V3-Design-Package.md`. Where the two disagree, this file wins.

> ## ⚠️ READ THIS BEFORE §0a: THE PHASE DESCRIBED BELOW IS FINISHED
>
> **The fold-in was NOT abandoned. It completed on 11 Aug 2026.** F1a–F10 all shipped
> (`ezplate-v136`–`v149`), plus the mobile More screen as `v151`, one handover each in
> `docs/handovers/` (144 → 171). Every screen is v3, desktop and mobile, light and dark.
>
> **§0a below is stale text describing 9 Aug 2026, and following it would revert nineteen shipped
> versions of merged, reviewed work.**
>
> ### ⚠️ THIS BOX HAS NOW BEEN DELETED TWICE, BY THE SAME MECHANISM, AND NEITHER TIME ON PURPOSE
>
> This file is the vendor's, and **a fresh copy of the design package does not carry the repo's
> amendments** — so dropping one in silently reverts them, in a diff that looks like "updated the
> handoff docs" and mentions nothing else.
>
> - **PR #159**, a Supabase-staging batch that never mentions this file — swept in, not authored.
> - **12 Aug 2026**, batch 177: the package was updated for the reworked Plate Builder (a real,
>   wanted change to `README.md` and `Redesign v3 - SaaS.dc.html`), and this box came out with it.
>   Caught by the pre-push review, which diffed the file rather than reading it.
>
> **So: whenever this folder is refreshed from the vendor, re-apply everything below before
> committing.** The two amendments are Max's own decisions and nothing in a vendor copy knows they
> exist. `git diff main...HEAD -- docs/design_handoff_ezplate_redesign/` is the one-line check.
>
> - **Amendment (Max, 10 Aug 2026): §0a steps 2–4 are OVERRIDDEN — there is no revert pass and no
>   "looks entirely old" starting line.** The fold-in proceeded from the shipped state
>   (`ezplate-v135`). §0a step 1 (the queue reset) ran on 10 Aug 2026. Everything else in this
>   protocol stands unchanged — including §2: a screen is fully v3 or not touched, and no NEW
>   skinning ever.
> - **Amendment (10 Aug 2026): the `.legacy` wrapper in §2 is STRUCK. It was never built and cannot
>   be.** `grep -rn "\.legacy" css/style.css index.html js/app.js` returns zero hits and always has
>   (re-measured 12 Aug 2026: still zero). There is no unconverted screen left to wrap. **The real
>   mechanism, used since F2, is per-screen manual deletion** — a converted screen deletes its own
>   markup and its own CSS in the same change, each selector grepped against both `index.html` and
>   `js/app.js` first. `docs/QUEUE.md` says the same thing and has since commit `4cd18a5`; without
>   this note the two files contradict each other.
>   §2's RULE is untouched — a screen is fully v3 or fully untouched. Only the enforcement sentence
>   goes.
>
> **What still binds from this file:** §2 (no hybrids), §3 (the conflict rubric), §4 (the acceptance
> criteria), §5, and §6 (dark mode). Those are standing rules and they apply to any screen touched
> from here on. §0a and §0b are history and must not be executed again.

## 0a. Starting state — a previous fold-in pass was abandoned  ⚠️ HISTORICAL — see the box above

An earlier attempt at this fold-in produced a hybrid and was stopped partway. Assume parts of the
app are half-converted, and assume the queue contains items describing that abandoned approach.

Reset before building, in this order:

1. **Reset the queue.** In `docs/QUEUE.md`, remove or mark superseded every entry relating to the
   old redesign/fold-in — including Q10, the reversal entries, and anything added during the
   abandoned pass. Leave non-redesign functional items untouched. Then add the new items described
   in §0b.
2. **Revert half-converted screens** to their pre-redesign state, and restore anything the old pass
   deleted without replacing. Do not finish those screens forward — reverting is cheaper than
   reasoning about which half was intentional. If you have git history, resetting the view layer to
   the last commit before the abandoned pass is the fastest route.
3. **Keep shell work only if it is genuinely correct** — token block, sidebar, header, page
   container, modal primitive — and only after checking it against the mock. Old chrome wearing new
   colours gets reverted like everything else.
4. **Confirm the app builds and looks entirely old** before converting anything.

Expected end state: an app that looks entirely pre-redesign, a clean queue, this package in place.
That is the correct starting line.

## 0b. The queue this package should produce

Replace the old redesign entries with:

- **One shell item.** Token block (light + dark), sidebar, header bar, page container, modal/sheet
  primitive. No screens.
- **One item per screen**, in this order: Plates → Ingredients → Products → Menu → Dashboard →
  Plate Builder → Invoices → Settings → Account. Each item covers **desktop and mobile together**
  and carries the §4 acceptance criteria as its definition of done.
- **The §11.5 behaviour specs** from `V3-Design-Package.md` as their own items — these are missing
  capabilities, written as trigger / data / state changes / error path, not as UI descriptions.

Nothing else goes in as a redesign item. If a conflict during a screen produces new work, it enters
the queue via the §3 rubric with its rule number recorded.

## 0. Why the current attempt produced a hybrid

The agent applied the new **styling** to the **old markup**. That is skinning, and skinning always
produces the worst of both: old information architecture, old interaction grammar, new colours and
radii. It also makes every screen half-done, so there is no point at which anything can be called
finished or reverted.

The direction has to be inverted:

> **The v3 mock is the source of truth for structure, hierarchy and interaction.
> The existing app is the source of truth for data, business rules and side effects.**

Nothing else is negotiable. You are not restyling screens; you are **rebuilding each screen's view
layer from the mock and re-attaching it to the existing logic**.

## 1. Order of operations (do not reorder)

1. **Tokens + shell.** Port the token block (`:root` and `html[data-theme="dark"]`) from
   `Redesign v3 - SaaS.dc.html` verbatim. Build the app shell — sidebar, header bar, page container,
   the modal/sheet primitive. The shell is new from day one; it is never the old chrome restyled.
2. **One screen at a time, whole.** Pick a screen. Rebuild its markup from the mock, wire it to the
   existing data/handlers, delete the old screen's markup and CSS in the same change. A screen is
   either fully v3 or fully untouched — no screen is ever partially converted.
3. **Mobile after desktop, per screen.** Convert desktop Plates and mobile Plates together, then move
   on. Do not convert all desktop screens then all mobile screens.
4. **Delete as you go.** Every converted screen deletes its old component, its old stylesheet rules
   and any now-orphaned helper. If old CSS still loads after a screen is converted, the screen is
   not converted.

Suggested screen order (lowest risk to highest): Plates → Ingredients → Products → Menu →
Dashboard → Plate Builder → Invoices → Settings → Account.

## 2. The one rule that stops hybrids

**No screen may render old markup with new tokens applied.**

If a screen cannot be fully rebuilt in this change, leave it entirely alone — old markup, old CSS,
old chrome — and let it look like the old app. A visibly old screen next to a v3 screen is fine and
temporary. A screen that is 60% v3 is permanent damage, because nobody can tell what is left to do.

~~Enforce mechanically: the old stylesheet is scoped to a `.legacy` wrapper on unconverted screens
only. New screens live outside it. When `.legacy` has no children left, delete the stylesheet.~~

**STRUCK — see the amendment box at the top of this file.** The `.legacy` wrapper was never built
and cannot be. Per-screen manual deletion IS the mechanism, and there is no other one.

## 3. Conflict rubric — how to decide which UI/UX wins

When the mock and the existing app disagree, walk these in order and stop at the first that applies.
Record the decision in `docs/QUEUE.md` with the rule number.

**R1 — Is the difference purely presentational?** (spacing, type scale, colour, radius, icon,
copy tone, table row height, where a label sits)
→ **The mock wins. Always. No exceptions, no discussion, no "but the old one was more compact".**

**R2 — Does the old behaviour exist because of a real constraint?** (a permission check, a data
shape, a rounding/GST rule, a sync limitation, a legal/tax requirement, an integration's API)
→ **The old behaviour wins, dressed in the new UI.** Keep the rule; express it with v3's components.
Never drop a constraint to make a screen match the mock more neatly.

**R3 — Does the mock drop a control the old app has?** (a filter, a bulk action, an export, a rarely
used toggle)
→ The mock's *hierarchy* wins, the control *survives*. Place it per v3's grammar — into the row's
overflow menu, the command palette, or a section footer. It is never silently deleted, and it never
gets re-added as a stray button that breaks the layout. If there is genuinely nowhere for it, log it
and ask; do not improvise.

**R4 — Does the mock imply a capability the backend does not have?**
→ Build the v3 UI for what *does* exist today, and log the missing capability as a behaviour spec
(trigger, data, state changes, error path). **Never ship a control that does nothing.** A disabled
control with a reason is acceptable; a decorative one is not.

**R5 — Do both work and it is genuinely a judgement call?**
→ **The mock wins, and you write one line saying what you gave up.** The tie-break exists so that
the codebase converges on one system. Never synthesise a third option that is in neither the mock
nor the app — that is exactly how the hybrid appeared.

Anti-rule, worth stating explicitly: *"I'll keep the old layout but use the new colours"* is not a
valid outcome of any branch above. If you find yourself there, you are in R1 and the mock wins.

## 4. Acceptance criteria per screen

A screen is done when all of these are true. Check them off in the PR description.

- Side-by-side against the mock at 1360×900, the structure matches: same regions in the same order,
  same row grammar (identity left, mono figures right, status pill rightmost), same header pattern.
- Every colour, border and shadow comes from a token. Zero hard-coded hex in the screen's code.
- Type: Geist for UI, Geist Mono with `font-variant-numeric: tabular-nums` for every number,
  money and percentage. No exceptions on tables.
- All five states exist and are v3-styled: loading (skeleton), empty, error, first-run, permission
  denied. Old-styled fallbacks are a fail.
- Mobile counterpart converted, nav order and row grammar mirroring desktop (§6.1 of the package).
- The old component and its CSS are deleted in the same change.
- Keyboard: focus ring visible on every interactive element; modals trap focus and close on Esc.
- No behaviour regression: every action the old screen could perform still performs, or is logged
  under R3/R4 with a written reason.

## 5. Working rules for the agent

- **One screen per change set.** Never touch two screens in one pass; never mix shell work with
  screen work.
- **Read before writing.** Open the existing screen's logic first and list its data inputs, handlers
  and edge cases. Rebuild the view around that list — do not discover behaviour by deleting it.
- **Do not invent components.** If the mock has no pattern for something, reuse the closest pattern
  in the mock. Adding a new visual pattern requires asking.
- **Do not "improve" the mock.** Fidelity first. Improvements are logged, not applied.
- **Stop and ask** when: a screen needs a control the mock has no home for (R3 dead end), a backend
  capability is missing and the flow can't degrade honestly (R4), or two constraints genuinely
  conflict. One question, with your recommendation attached — not a redesign.

## 6. Dark mode

The v3 mock now ships light and dark. Both palettes are in the mock's `<style>` block as CSS custom
properties: `:root` (light) and `html[data-theme="dark"]`. Port them verbatim, switch by setting
`document.documentElement.dataset.theme`, persist the choice, and default to the OS preference.

Because every surface, border and semantic colour is a token, **any hard-coded hex in a converted
screen is automatically a dark-mode bug**. That makes the token rule in §4 self-enforcing: grep for
`#` in a screen's styles; if there are hits outside the token block, the screen is not done.

Dark is intentionally soft and grey — neutral surfaces (`#232528` canvas, `#1E1F22` sidebar),
hairline borders, off-white text, and desaturated accent/semantic colours. Do not "fix" it by
increasing contrast or pushing surfaces toward black.
