# EzPlate v3 redesign — implementation handoff

This folder replaces `docs/design_handoff_ezplate_redesign/` in the repo. Delete the old contents
entirely; nothing in it is still valid.

## What's in here

| File | What it is |
|---|---|
| `FOLD-IN-PROTOCOL.md` | **Read first.** How to fold v3 into the existing app without producing a hybrid: reset steps, conflict rubric, screen order, acceptance criteria. Supersedes §11 of the design package. |
| `V3-Design-Package.md` | The spec: tokens, layout system, every screen and modal, five state mappings, mobile parity rules (§6.1), behaviour-spec queue (§11.5). |
| `Redesign v3 - SaaS.dc.html` | Desktop mock — 10 screens, 4 modals, light + dark. Open in a browser; click through it. |
| `Redesign v3 - Mobile.dc.html` | Mobile mock — 9 screens, bottom tabs, sheets. |
| `support.js` | Runtime for the two mocks. Not for production. |

The mocks are the visual and interaction reference. They are not a component library — do not lift
their internals; rebuild in your stack using the tokens and patterns.

## The one-line brief

> Keep everything the app does. Replace everything it looks like and how it's arranged.

The v3 mock is the source of truth for structure, hierarchy and interaction. The existing app is the
source of truth for data, business rules and side effects. Each screen's view layer is **rebuilt**
from the mock and re-attached to existing logic — never restyled in place.

---

## Prompt 1 — queue reset (run this first, alone)

> I've replaced `docs/design_handoff_ezplate_redesign/` with a new design package. Read
> `FOLD-IN-PROTOCOL.md` in full, then `V3-Design-Package.md`, then open both `.dc.html` mocks in a
> browser and click through every screen. Do not write any application code in this pass.
>
> Then reset `docs/QUEUE.md` per §0a and §0b of the protocol:
>
> 1. Remove or mark superseded every entry relating to the old redesign/fold-in — including Q10, the
>    reversal entries, and anything added during the abandoned pass. Leave non-redesign functional
>    items untouched.
> 2. Add one shell item: token block (light + dark), sidebar, header bar, page container, modal/sheet
>    primitive.
> 3. Add one item per screen in protocol order — Plates, Ingredients, Products, Menu, Dashboard,
>    Plate Builder, Invoices, Settings, Account — each covering desktop and mobile together, each
>    carrying the §4 acceptance criteria as its definition of done.
> 4. Add the §11.5 behaviour specs as their own items, written as trigger / data / state changes /
>    error path.
>
> Show me the queue diff, and tell me in your own words what the fold-in direction is, before doing
> anything else.

**Check its answer.** If it says anything resembling *"restyle the existing screens with the new
tokens"*, it has not understood the inversion — correct it before a single screen is built.

## Prompt 2 — reset the app to a clean starting line

> Per §0a: revert every half-converted screen to its pre-redesign state and restore anything the
> abandoned pass deleted without replacing. If git history allows, reset the view layer to the last
> commit before that pass. Keep shell work only where you've checked it against the mock; old chrome
> with new colours gets reverted too.
>
> When you're done the app should build and look **entirely pre-redesign**. Confirm that before
> converting anything.

## Prompt 3 — build, one screen at a time

> Work the queue in order, one item per change set. Follow the protocol: rebuild the screen's view
> layer from the mock, re-attach existing logic, delete the old component and its CSS in the same
> change. Never leave a screen partially converted — an untouched old screen is fine, a half-done one
> is not.
>
> When the mock and the app disagree, walk the §3 rubric and record the rule number in the queue.
> Presentational differences: the mock always wins. Real constraints: the old behaviour survives,
> dressed in the new UI. Dropped controls: rehome them per v3's grammar, never silently delete.
> Missing backend capability: build for what exists and log a behaviour spec — never ship a control
> that does nothing. Genuine tie: the mock wins and you note what was given up. Never invent a third
> option.
>
> Report each screen against the §4 acceptance checklist. Stop and ask on any R3 dead end or R4
> missing capability — one question with your recommendation, not a redesign.

---

## How to tell it's working (your checks, not its claims)

- **Grep for `#` in a converted screen's styles.** Any hit outside the token block means it skinned
  something. This is the fastest hybrid detector you have.
- **Screens are all-or-nothing.** If a screen looks 70% new, it's a fail, not progress.
- **Old CSS shrinks every screen.** If the legacy stylesheet is still fully loaded after three
  screens are converted, deletions aren't happening.
- **Nothing lost.** Every action the old screen could do still works, or has a queue entry with an
  R3/R4 reason attached.
