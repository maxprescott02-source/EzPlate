# HANDOVER — v104 (batch 5: Products) — the sequence is COMPLETE

**Branch:** `feature/products-batch` · **Scope:** the Products tab
(`#tab-ingredients` — the naming inversion) including copy INSIDE the invoice
review area, the promotion of v102's `#plateList`-scoped card values to base,
and the invoice flow's elevation/tone alignment. Six version spots v103 → v104.

This is the last batch of the UX propagation sequence approved 31 Jul
(0.5 global chrome → 1 Menu → 2 Settings → 3 Plates → 4 Ingredients →
5 Products). **All six batches are now built and pending phone sign-off.**

## The cull table

| Surface | Was | Now | Verdict |
|---|---|---|---|
| `#invIntro` preamble | "Upload a supplier invoice PDF and we'll automatically match items to your database and update prices. New items not found will be flagged so you can add them. Nothing saves until you review and confirm each change." (37w) | "Upload a supplier invoice — nothing saves until you review and confirm each change." (13w) | **COMPRESS** — the middle two sentences describe what the user is about to WATCH happen; the reassurance is the only part that has to arrive before they act. Element, classes and the dismiss control untouched. |
| CSV paste hint (`.inv-csv-hint`) | "Most supplier PDFs work directly. Or paste lines manually as CSV, one per row: **product name, new price per kg/unit**." (18w) | "One line per product: name, new price." (7w) | **COMPRESS** — "most PDFs work directly" is redundant inside the box you only opened because you chose *not* to use the PDF path. The format example moved into the field itself (see the deviation below). |
| Pack-size sub-label (Edit product modal) | "Units per pack — e.g. a carton of eggs = 180. Helps invoice imports price it right." (15w) | "e.g. a carton of eggs = 180" (6w) | **COMPRESS** — the example teaches the field faster than the definition did, and the "helps invoice imports" clause is a reason to fill it in, not information needed to fill it in. |
| `renderInvReview` save hint | "Only ticked rows are saved when you tap Confirm All." | "Only ticked rows are saved." | **COMPRESS** — the string sits in the same template literal as the Confirm All button, six characters away. Naming the button in the sentence beside it is the definition of a redundant word. |
| `Food item (appears in ingredient search)` | unchanged | — | **KEEP** — pinned accessible name (`tests/a11y-fooditem.test.js`). |
| Calc line, `#lastImport` lines, every button label | unchanged | — | **KEEP** — out of scope by the brief. |

### The invoice-region KEEPs were deliberate, not oversights

The invoice review area is the app's densest prose and the obvious place for a
cull to over-reach. Everything below was read and left alone **on purpose**:

- **The GST lines** — honesty about what a price does and doesn't include.
  A user who mis-reads GST enters a wrong price into real menu costing. Prose
  that prevents a money error is not padding.
- **`.pt-explain`** (the pack-teach explainer) — the taught-pack flow is the
  one place a user is asked to teach the parser something. It is also pinned
  (`fresh-states.spec.js:254`).
- **Flag pills / chips / AI-status strings** — heavily pinned by
  `tests/smoke.js` and they *are* the row's state vocabulary; there is no
  shorter way to say "needs attention".
- **"the name you'll use when building plates"** — pinned by
  `tests/terminology.test.js`; it is also the canonical way to describe an
  Ingredient without using a forbidden noun.

No markup, class, or element ORDER inside `renderInvReview` was touched —
`tests/inv-rowmarkup.test.js` source-slices that function and pins both. The
one edit there is text-only, and well outside the protected parser region
(the region is lines 4286–4512; the edit is at 5018).

## The promotion (v102's recorded instruction, discharged)

v102 added the seam/radius to the shared `.ing-list`/`.ing-card` system
**scoped to `#plateList`**, precisely so a one-tab batch would not restyle two
tabs, and left a note that Products' batch should promote them. Done:

- Base `.ing-card` `border-radius:12px` → `var(--radius-card)` (16px).
- ≥640 `.ing-list` `gap:var(--sp-3)` → `var(--sp-2)`.
- ≥1024 `.ing-list` `gap:12px;padding:10px var(--sp-5) 8px` →
  `gap:var(--sp-2);padding:var(--sp-2) var(--sp-5) var(--sp-2)`.
- The three `#plateList`-scoped rules and the v102 comment block are DELETED,
  replaced by one short v104 comment.

**Plates must not move, and does not.** The scoped rules carried id
specificity, so Plates already computed 8px/16px at every width; base now
supplies exactly those values. Verified rather than reasoned: the throwaway
spec asserts `#plateList` is still 16px radius / 8px seam at light+dark ×
380/1280, which is what makes the promotion provably a no-op there. The
rendering change is Products-only, and it is the change the sequence intended.

## Elevation and tone in the invoice flow

- **Two-mode elevation (the v98 rule, app-wide since v99):** four card-styled
  invoice surfaces still cast a hard shadow in dark mode —
  `box-shadow:var(--shadow)` → `var(--elev)` on `.ni-panel` (both sites),
  `.invtable tbody tr:not(.sec):not(.ni-row)`, and `.import-summary`. In dark,
  depth is now the surface step, as everywhere else.
- **One card tone (light mode):** the `.invtable` row rule at ≥640 filled rows
  with `--surface2` *inside* an already-`--surface` modal — the card-in-card
  beige that v98 removed from the dashboard. Now `--surface`; the row already
  carries a border, so nothing is lost.
- **`.ni-raw` keeps its `--surface2` deliberately.** It is a semantic inset
  well holding the RAW invoice text — "here is literally what the supplier's
  file said" — not a card. The tone is doing real work there: it separates
  data the app is quoting from data the app is asserting. Don't flatten it in
  a future tone pass without replacing that distinction with something else.

## Verification

- Baseline before starting: `npm test` 509 green, `node -c` clean, six spots
  agreed at v103, `main` at the v103 merge (PR #42).
- After: **`npm test` 509 green** · `node -c js/app.js` and `node -c sw.js`
  clean · **jsdom smoke green** (all sections, including the invoice sections
  [9], [10], [11], [15], [16], [19] that are this area's real coverage).
- **Playwright 91/91**, run alone, 1.7m — normal wall-clock, no degradation.
- Throwaway spec (scratchpad, not committed), light+dark × 380/1280:
  Products `.ing-card` 16px radius and 8px seam; `#plateList` UNCHANGED at
  16px/8px; the compressed `#invIntro` and `.inv-csv-hint` render verbatim;
  the CSV textarea carries a name-and-price format example. 12 screenshots
  eyeballed — the light-mode invoice modal now reads as one card tone.
- **CodeRabbit: 0 findings** (all four changed files reviewed).

## Deviation from the brief (one, judgement call)

Item 2 asked me to *add* a format example to the paste textarea's
`placeholder`. **It already had one** — three lines
(`Barramundi Fillet, 16.90` / `Tasty Cheese Block, 9.80` /
`Chips Straight Cut, 1.95`) — so I left it rather than replacing it with the
single suggested line. Reason: the compressed hint now *states* "one line per
product" but no longer *shows* it, and a three-line placeholder in a `rows="6"`
textarea demonstrates the repetition in a way one line cannot. The brief's
goal (hint compressed, format example living in the field) is met as written.
Flagging it because it is the one place I did not do the literal instruction.

## Needs Max's phone (v104)

1. **Invoice import end-to-end on a real supplier PDF** — the carried C4–C8
   backlog items, all of which need a real file and a real phone:
   C4 add-new dropdown geometry · C5 form state persistence across rows ·
   C6 real-PDF parse over mobile data · C7 catalogue load ·
   C8 unit-change confirm copy.
2. **The compressed `#invIntro` + the CSV placeholder in situ** — the intro is
   now one sentence above the Upload button; does it still land as reassurance
   at arm's length, or does it read as decoration you dismiss without reading?
3. **Products cards with the new seam/radius** — the tab with ~400 cards is
   where an 8px seam either resolves into a rhythm or looks cramped. This is
   the single most-scrolled list in the app; it is the batch's main visual risk.
4. **The invoice modal in light mode** — one card tone now; check the rows
   still separate cleanly on a bright screen at arm's length.
5. **iOS modal items F1–F4 (carried)** — **the invoice modal is their stress
   case**: it is the tallest, the most scrollable, and the only one that
   stacks a confirm over itself. If the v87 scroll-lock has an iOS edge, this
   is where it shows.

Carried forward: the rest of the v82–v103 phone list.

## Sequence status

Batches 0.5, 1, 2, 3, 4 and 5 are **all built**. Nothing in the approved
sequence remains unimplemented. What remains is device sign-off on eighteen
batches, which is now the top of the outstanding list — and the reason none of
the above may be called finished yet.
