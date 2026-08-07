# HANDOVER — v44 (Fable visual batch)

Branch: `fix/pack-control-and-menus` (same branch as v42/v43, **unmerged**). Ships as
**v44** — all six version spots bumped. `npm test` = **131 green** (128 + 3 new
save-draft tests); `node -c` clean; jsdom smoke passes; **21 Playwright checks pass**
(the batch was verified with real rendered screenshots at 380px and desktop, both
themes for the risky screens — not by eyeballing CSS).

## What shipped

**Item 1 — unified pack control (invoice review, FRAGILE).** The "Pack: N units —
change" chip is gone. Every row with pack context renders the same always-visible
`[qty][unit][✓]` row, prefilled by the untouched v38 precedence (product pack >
supplier memory > parser). A unit-mismatch/unresolved row is the SAME control with a
red `.pt-required` border and the existing hint line ("Priced per kg — set the pack.")
as its inline explanation — no second visual pattern. **Resolution logic,
`invRowState`, precedence and what ✓ writes: unchanged.** Both `inv-rowmarkup.test.js`
anchors survive; all pinned invariants (Old/Conf never hidden on flagged rows, v39
no-pre-tick) verified in the rendered shots. Dead chip CSS + its click handler removed.

**Item 2 — copy.** `price jump — check` → `price change — check`. Pinned strings
updated in the same commit: `tests/inv-rowmarkup.test.js` (2 assertions),
`tests/smoke.js` (1 regex + its label). The `PRICE_JUMP` identifier stays (naming rule).

**Item 3 — pills align with the title.** The invoice card's first cell is now a
baseline-aligned flex row: pill shares the title's baseline inline when it fits, and a
wrapped pill starts at the card's left edge (no lonely mid-air line).

**Item 4 — menu empty state centring (root-caused, the recurring one).** The mobile
card-collapse rule `.atable tbody tr > td:first-child` (specificity 0-2-3) put
asymmetric padding `0 28px 6px 0` on the empty state's `<td colspan=6>`; the later
`.an-empty td{padding:0}` reset (0-1-1) LOSES on specificity, so every past nudge was
fighting the wrong rule. Fixed by outranking it:
`.atable tbody tr.an-empty > td:first-child{padding:0}`. Verified two ways: a computed
`paddingLeft === paddingRight` assertion in Playwright + the rendered screenshot.

**Item 5 — one-line mobile buttons.** Nouns wrapped in `<span class="btn-noun">`,
hidden ≤639px: "+ New (ingredient)", "+ Add (product)", "+ New (menu)",
"+ Existing (dish)", "Set up (from products)". Gotcha found: `renderKingProgress`
rewrote the wizard button via `textContent` on every repaint, erasing the span — it
now writes the same markup (label copy only, no identifier change). The old
mobile `#kingNew{flex:1 1 auto}` stretch is overridden so the pantry pair shares one
line (screenshot-verified).

**Item 6 — confirm above Settings (root-caused).** `#confirmModal` precedes
`#settingsPanel` in the DOM and ALL `.modal-overlay`s shared `z-index:80` — equal
z-index means the later sibling paints on top, so Settings always covered the confirm.
Fix: `#confirmModal{z-index:85}` (a confirm is semantically always-on-top). Chose the
z-index route over "close Settings first" because the layering wasn't tangled — one
overlay simply needed its own layer; closing Settings would lose the user's place.
Playwright asserts the confirm owns the centre pixel with both open. This also covers
item 6b's remove-confirm over the ingredient modal.

**Item 6b — tap-card ingredients.** Edit/Remove links removed from `.king-row`; the
card is a `role="button"` element (click/Enter/Space → `openKingModal`, focus ring for
keyboard). Remove moved INTO the edit modal (muted destructive, parked left in the
footer), wired to the untouched `deleteKitchenIngredient` — the used-in-N-plates
confirm still runs; the modal closes first so the confirm sits on top (same pattern as
the v35 unit guard). Full flow Playwright-verified: tap → edit modal → Remove →
confirm → card gone.

**Item 7 — pantry header matches the panel system.** `.king-head` restyled to the
`.panel h2` treatment (small-caps title, muted strapline below, buttons in the header
row). Ids/classes/text untouched — CSS only, placed at end-of-file so it wins the
older rules.

**Item 8 — builder two-row lines (Max's mockup).** Each line: name row (name + meta +
remove ×) and costs row (`[qty][unit] @ [unit price] ······ [line total]`). Same
inputs, ids and inline handlers — nodes just moved. The misc line gets the same split,
so its label field spans the full card width at 380px (measured 300+px in Playwright,
was ~150). Two findings on the way: a legacy `.qtybox{order:3}` mobile rule from the
one-row era reordered the costs row (overridden), and the words "Unit cost: " blew the
380px budget — replaced with the docket idiom `@` (`100 g @ $2.63/kg`), which also
reads better next to the line total. A width assertion pins "line total fits at 380px".

**Item 9 — "Save to Library" → "Save draft" (Max's design, chosen over removal).**
Removal would have orphaned the WIP flow: v42 deliberately blocks publishing NEW
dishes into the holding area, and publishing requires a name + price. Instead, saving
an UNLINKED plate now creates a real dish in **"Unassigned dishes"** (`section:
'Drafts'`, `price: 0`) so drafts are visible in the menu selector, not in an invisible
library. Plates already linked to a dish keep plain-save behaviour; loading saved
plates untouched. Rides the v42 machinery end to end: `ensureUnassignedMenu()` pushes
the menus row BEFORE the dish, and the plate write is sequenced after the dish write
(`dbPushPlateAfterMenu` — the FK contract). Publishing a draft later = the normal
"Update menu item" flow with a real menu picked — the draft MOVES, no zombie copy.
New `tests/save-draft.test.js` (3) pins: draft lands in `MENU_UNASSIGNED` with the
sequenced write; linked plate = plain save; nameless plate refuses.

## Judgement calls

- **Item 8 copy:** "Unit cost:" → "@" on the costs row (with `title="unit cost"`).
  Driven by measurement, not taste: the words alone overflowed 380px. Flag if it
  reads wrong on a real phone.
- **Item 9 draft price is `0`, not null** — safe if the DB column is NOT NULL, and
  `analyze()` treats `<=0` as "no menu price" so drafts show dashes, not fake margins.
- **Item 9 section is `'Drafts'`** — drafts group under a DRAFTS heading in Menu
  analysis when viewing the holding menu.
- The empty-pantry CTA ("+ New ingredient" inside the empty state) keeps its full
  label — it's a centred CTA with room; shortening it would help nothing.
- `updatePublishLabel` shows "Update Menu Item" when a draft is loaded. Accurate but
  arguably should say "Publish draft" — left as-is (copy-only, needs Max's view).
- New `tests/visual/fresh-states.spec.js` kept in the repo: offline fresh-install
  fixtures (blocks all off-origin requests) + the v44 interaction checks. It's how
  this batch was verified and future batches can reuse it. Not in `npm test` (needs
  Playwright), runs via `npm run shots`.

## Needs Max's phone (branch preview) — feel things screenshots can't prove

**Export a JSON backup first (Settings → Export).**

1. **Pack control on a REAL import** (the fixture was synthetic): matched rows show
   the filled pack row + ✓; a mismatch row shows the same control in red with the
   hint; teaching a pack still updates price + preview and survives re-import.
2. **Builder at 380px on your phone**: the two-row lines, the `@` unit-price chip
   (tap it — price edit must still work), the misc label typing feel.
3. **Save draft** → check "Unassigned dishes" appears in the Menu selector with the
   draft; publish it to a real menu; confirm it leaves the holding area.
4. **Tap an ingredient card** → edit modal; Remove → confirm sits on top; Enter/Space
   opens it with a keyboard if you ever use one.
5. **Clear-cache confirm** now sits above Settings.
6. Pantry header pair on one line; "+ New"/"+ Add"/"+ Existing" short labels feel OK.
7. Both themes on the invoice review + builder (dark shots looked right here).
