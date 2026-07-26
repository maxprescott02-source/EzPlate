# HANDOVER v86 — Terminology consistency + the invoice dropdown, root-caused

**Completed:** 25 Jul 2026 · branch `fix/terminology-pass` (off fresh `main` at v85) · brief
`~/Downloads/ezplate-opus-terminology-pass.md`. Baseline v85, **365 node green**, `node -c` clean, six spots at
v85. Ended **383 node green**, smoke green, `node -c` clean (app.js, sw.js, the four `api/*.js`), six spots →
**v86**. Client only (`index.html` + `css/style.css` + `js/app.js` + tests). Zero contact with the protected
parser region, the money law, the naming inversion, the data model, invoice row-build / `invRowState` /
auto-tick / state persistence, or `api/*.js`.

## A browser exists in this environment now

CLAUDE.md says "There is no browser here". **That is no longer true** — Playwright + Chromium launch fine, and
this batch used a real browser to reproduce, measure, and verify the dropdown bug at 380px and desktop in both
themes. This is the first batch that did not have to send a visual claim to Max's phone unverified. Worth
knowing for future visual work (and for finally reconciling `fresh-states.spec.js`).

## 1. The invoice dropdown — the screenshot was TWO bugs, not one

Reproduced Max's screenshot exactly at 380×820 (invoice import → an unmatched line → **+ Add as New Item** →
the last field's combobox). Measured:

```
input        426 -> 472        the line's card ends at 632
list         476 -> 776        Apply tick box 586 -> 610
             ^ overran the card by 144px, straight through the Apply row
```

**Cause A — the geometry was measured against the wrong box.** `anchorDrop` computed its space from
`window.innerHeight`, so on the LAST field of the form it still saw ~340px of "room below" and drew its full
300px list. It never knew the card ended 152px below the input.

**Cause B — a stacking context nobody meant to create.** `css/style.css:814` `.muted-row td{opacity:.92}`.
Opacity below 1 makes **every `<td>` its own stacking context**, so `.cat-drop`'s `z-index:60` could only stack
*within its own cell*. The Apply cell is a LATER sibling `<td>`, so it painted on top of the list — that is why
the tick box sits *over* the options in the screenshot rather than under them.

**Explicitly NOT the v59 bug.** The brief guessed this was the same overflow/stacking class as the ingredient
modal's product search. I tested that hypothesis first — `.modal-overlay` carries `backdrop-filter:blur(2px)`,
which would make it a containing block for `position:fixed` descendants — and **disproved it**: a fixed probe
at `left:0;top:0` inside the open overlay lands at exactly `0,0` in this Chromium. v59's fix is intact and
still doing its job; these are two new causes on top of it.

### The fix

- `anchorDrop` now places against a **bounding box** instead of the window, via a new pure `dropPlace(r, soft,
  hard)`:
  - **soft** = the modal ∩ the `.ni-panel` form — a list may float over its OWN fields, never over the controls
    that FOLLOW the form (Apply);
  - **hard** = the modal — an absolute bound, used only when the form is too tight on both sides.
  The last field therefore flips upward automatically; long lists still scroll internally via `.cat-drop`'s
  `overflow:auto` and the computed `max-height`.
- `.muted-row td:has(.ni-slot){opacity:1}` exempts the cell hosting an add-new form — it is the active editing
  surface, not muted background — so the dropdown's z-index can win at row level. `:has()` was already in use
  at `style.css:2249`, so this is not a new technique. The v35 contract (".muted-row carries its opacity
  treatment and nothing else") is otherwise untouched.
- Removed the desktop `@media (min-width:640px) .ni-grid .cat-drop` override: it only restated the base rule
  (anchorDrop's inline styles beat both) **except** `z-index:40`, which silently gave the same dropdown a
  different stacking weight on desktop than on mobile. One value (60) now governs at every width.

### Verified in a real browser — not on the phone list

| Check | 380 light | 380 dark | desktop light | desktop dark |
|---|---|---|---|---|
| Ingredient-name list does not overlap Apply | ok | ok | ok | ok |
| stays inside the modal | ok | ok | ok | ok |
| does not spill past the card | ok | ok | ok | ok |
| usable height (≥140px), scrolls internally | ok | ok | ok | ok |
| Brand (mid-form) still opens DOWNWARD in place | ok | ok | ok | ok |

Plus a **v59 regression check**: the product modal's Category combobox still opens, is still `position:fixed`
(still escaping the `.mbody` clip), still 296px tall — and is now additionally modal-bounded.

## 2. Terminology — the sweep, and what was left alone

A subagent swept `index.html` + `js/app.js` (grep, not a browser walk — copy hides in error/empty/confirm/toast
states you would have to trigger to see). Reported to Max **before** any edit, as the brief required.

**16 user-facing violations fixed.** Highlights:

| Was | Now |
|---|---|
| "**Kitchen words** for **recipes** — each one links to a product you buy" (always-on Ingredients strapline) | "The names you cook with — each one links to a product you buy" |
| "**Recipes** cost from this product… every **recipe** follows" | "**Plates** cost from this product… every **plate** follows" |
| "**Kitchen name** (optional)" — the invoice field | "**Ingredient name** (optional)" |
| "Every product has a **kitchen word** — **recipes** can use all of them" | "Every product has an **ingredient** — you can use all of them in plates" |
| "**Recipe** amounts… check any **recipe** that uses it" (×2 confirms) | "**Plate** amounts… check any **plate** that uses it" |
| "**Recipe card**" (printed docket) | "Untitled plate" / "Plate docket · N ingredients" |
| "N **kitchen word**s created" (import toast) | "N **ingredient**s created" |

**Kept as explanatory phrasing** (the brief permits describing without naming): the invoice field's placeholder,
retuned from "what the kitchen calls it" to **"the name you'll use when building plates"** — it now carries the
explanation the brief asked for without adding markup or a class to the fragile form.

**Untouched, deliberately:** every internal identifier, comment, `data-tab` value, `KINGKEY`,
`kitchen_ingredients`, `renderKitchenPanel`, `dishesOfPlate`… The naming inversion is a hard rule, and a
terminology pass is precisely when someone is tempted to "finish the job" — so the identifiers are now **pinned
by tests** (see below) rather than left to the next reviewer's eye.

## 3. Max's two decisions

The brief said to flag "dish" and not decide unilaterally. The sweep turned up more than the brief anticipated:
**"dish" (27 user-facing strings) and "menu item" (16) both name the same object as "plate"** — three names for
one thing, twice inside a single modal (`app.js:4887` "Pick a dish from the list first" sits two lines from
`app.js:4890` "That plate is already on this menu").

- **"dish" → Max chose: standardise on "plate" everywhere.** All 27 changed, including the 13 EzPlate Insights
  templates. Pluralisation adjusted (`dish/dishes` → `plate/plates`) at every site.
- **"menu item" → Max chose: fix the direct collisions only.** Changed where two nouns for one object sit in
  the same string or the same surface: the table header "Plate / menu item" → "Plate"; the Menu-tab search
  placeholder and empty state (that tab now says "plate" throughout); the new-menu hint's "a menu item's Edit
  screen" → "a plate's Edit screen"; the Dashboard trend explainer (which used both nouns in one paragraph);
  the Settings export help's noun list.

**Deliberately left, flagged for a future brief:** the standalone **Edit menu item** modal (`index.html:446,
450, 467, 474` + `app.js:5028, 5066, 5111`) and the Add-to-a-menu dialog's "Menu item name *"
(`index.html:329`). Each is internally consistent, so they are not collisions — but the app still has a fifth
noun living there. Also `app.js:2956` "Makes this a live menu item with pricing" (publish toggle) and
`app.js:3058/3062/3341` in the builder: near-misses I did not take, to stay inside Max's chosen scope.

## 4. Deliberate pinned-contract changes

Four assertions in `tests/insights.test.js` moved with the copy (`/2 dishes/` → `/2 plates/`, `/Cheese feeds 8
dishes/`, `/1 of 2 costed dishes sit over your 30% target/`, `/1 dish isn't costed/`). Two `smoke.js` test
*descriptions* renamed Kitchen→Ingredient. `tests/api-insight.test.js` fixtures were left alone — they exercise
number validation, not nouns.

## 5. Tests (365 → 383)

- **`tests/combo-drop.test.js` (+8)** — pure `dropPlace`, pinned with the **real measured numbers** from the
  reproduction, so it fails against the pre-v86 code: last field opens upward and clears Apply; a mid-form
  field still opens downward inside the form; the height never exceeds the room given; the hard bound is never
  exceeded. One test transcribes the pre-v86 rule verbatim and asserts it *did* cover the Apply row (586–610)
  and overran the card (632) — the bug is documented in executable form.
- **`tests/terminology.test.js` (+10)** — `index.html` contains no "recipe" at all; no "recipe" or "kitchen
  word/name" survives in shippable code (block + line comments stripped, since comments may legitimately use
  them); "dish" is gone from user-facing string literals; **plus two INVERSION GUARDS** pinning
  `kitchenIngredients`/`renderKitchenPanel`/`KINGKEY`/`cafeDB_kitchenIngredients`/`'kitchen_ingredients'` and
  the crossed `data-tab="pantry"` / `data-tab="ingredients"` values. If a future pass "tidies" an identifier,
  this fails loudly.

## 6. CodeRabbit — 2 findings, both real, both fixed

1. **minor, `dropPlace`** — flooring `maxHeight` at `DROP_MIN` could push the list back *outside* the hard
   bound when even the modal had under 140px either side (a very short window). Correct: `p.room` is already
   the best space available, so cap to it and nothing else. Fixed, plus a test for that exact case.
2. **major, `terminology.test.js`** — the "dish" detector exempted a whole SOURCE LINE when it contained an
   allowed identifier, so user-facing copy sharing a line with `dishesOfPlate` would have slipped through.
   Rewritten to extract and inspect each string literal individually. Verified the rewritten detector actually
   catches `var n=dishesOfPlate(p); toast('2 dishes removed');` — it does.

No project-specific false positives this time (nothing flagged the inversion, the protected region, or the
twice-defined `aRow`/`renderAnalysis`).

## Judgement calls

- **Root-caused before patching, and killed my own first hypothesis.** `backdrop-filter` on `.modal-overlay`
  looked like an obvious containing-block culprit; a 20-line browser probe disproved it in a minute. Shipping
  that "fix" would have changed nothing and buried the two real causes.
- **Fixed the z-index:40/60 inconsistency** even though nothing visibly depended on it — the same dropdown
  having two stacking weights is exactly how the next version of this bug gets written.
- **Reworded the menu-delete toast** rather than mechanically substituting: "N dishes removed; plates kept"
  became self-contradictory once dish→plate, so it is now "N plates came off it, still in your library".
- **Did NOT add a helper-text element** to the invoice form. The brief suggested one; the placeholder carries
  the same explanation with zero new markup, ids or classes in the app's most fragile form.
- **Did NOT touch `api/_insight.js`** — checked it for "dish"/"recipe"/"kitchen" and it is clean, so the Gemini
  rephrasing cannot reintroduce a retired noun.

## Needs Max's phone

Much less than usual — the geometry, both themes and both widths are browser-verified above. What a device
still has to judge:

1. A **real invoice import** on the phone: open an unmatched line's add-new form, tap **Ingredient name**, and
   confirm the list opens upward, is comfortably tappable, and the Apply row stays visible and unobstructed.
2. **iOS with the on-screen keyboard up** — the one case a desktop browser cannot model. Opening upward should
   be an improvement here (the keyboard covers the bottom), but it needs a real look.
3. The renamed copy in situ: the Ingredients strapline, the setup-from-products wizard's progress + done
   states, the unit-change confirm, a printed docket, and the EzPlate Insights lines now reading "plates".
4. That the invoice form still **persists state** normally (edit another line, come back) — untouched by this
   batch, but it is the fragile area next door.
