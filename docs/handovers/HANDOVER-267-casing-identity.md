# HANDOVER - 267 (casing and identity)

**Branch:** `batch-267-casing-identity` · **Scope:** `docs/QUEUE.md` item 57, "One casing system and one product identity line" (consolidated backlog item 57).
**Deploy version shipped:** `ezplate-v216`.

## What changed

The builder's ingredient search offered you `→ CHEDDAR CHEESE BLOCK 2KG` and the row it produced said `→ Cheddar Cheese Block 2kg · Bega`.
One object, two typographic voices, one click apart, which is the item's own headline and it reproduced exactly.
`productIdentity` / `productIdentityMeta` are now the one definition of "Product - Brand · Supplier", behind eight render sites.

`.opt .ca` and `.suggest-drop .sug-opt .ca` stop forcing capitals.
That class is not a label class whatever its name suggests: it carries product descriptions, brands, unit costs and whole phrases, and one genuine label, which is now "Exists".

Nineteen placeholders moved to sentence case under one stated rule, pinned by a new assertion in `tests/terminology.test.js`.
The rule is about the FIRST CHARACTER, which is why `e.g. ` came off the text fields and stayed, as `E.g. `, on the four number-shaped ones.
A greyed "Chips" cannot be mistaken for a value the app already filled in; a greyed "24.00" on "Sell price on this menu ($)" can, and this is a costing app.

The pack-size example moved out of its `<label>`, where it was inheriting `.field label{text-transform:uppercase}` and rendering as "PACK SIZE (OPTIONAL) E.G. A CARTON OF EGGS = 180".
That label also gained the `for` it never had, so it now focuses something.

`updateKingCat` gained `catLabel`, so the Ingredient modal stops saying DESSERTS over a row that says Desserts.
`fillFilter` puts its values in one `<optgroup>` and the Tidy door in another, so a command stops being a silent sibling of a value.

**Premise check:** batch 266 had already checked this item and struck three ghost symbols.
An independent re-check found 266's note held on every symbol and line number, and found three claims of the ITEM still wrong: the print docket shows no brand at all, the Products card does render a supplier tag with only the desktop column hidden, and the uppercase was on `.ca`, which is not a category class.

## Review

The `code-review` agent ran on **Sonnet**, overridden from its pinned `opus` because this batch ran on Opus.
Three findings. All three were real.

1. **`docs/STATE.json` stale against the v216 bump.** True and reproduced. Its stated cause was half wrong and is worth recording rather than disputing: `node tools/state.js` runs in the handover commit by `skills/batch` step 10, which had not been reached. The suite genuinely was red when it looked, and a reviewer cannot know which step a batch is on.
2. **The `productIdentity` comment claimed a completeness it did not have.** True, and the finding itself UNDERCOUNTED. Running its own repro found `openKingModal`, the third writer of `#king_prod`'s value, left unmigrated - so Edit showed `Cheddar - Bega` and picking the same product one click later showed `Cheddar - Bega · Bidfood`. **That was a defect this batch created, in the field this batch had just fixed.** Migrated, along with the wizard, which rendered the same join two ways inside one function depending on how many candidates a name matched. `prodOptions` / `invMatchOptions` and the Dig-in row names are now stated refusals with reasons rather than omissions, and are filed.
3. **Two new tests were presence-only regexes that could not see a partial revert.** True. Verified in both directions: reverting only the click handler in `renderKingProdDrop` left the old check green and reddens the replacement absence guard.

Full report and disposal: `docs/reviews/REVIEW-267-casing-identity.md`.

**Gates.** `npm test` 2304 pass, 0 fail.
Mutation gate, full run: 1408 mutants, 1354 killed, 54 survived with all 54 carrying a written allowance, exit 0.
Playwright 479 passed, 14 skipped, 1 failed - `v90-dash.spec.js` "@ mobile dark", which passes in isolation and on re-run, touches nothing in this diff, and is a click-then-assert with no explicit wait. Recorded as flake, not chased.
`flow-tester` drove staging in both themes and found no defects, but reported honestly that it could not hold a true 380px viewport, so that width is pinned by `tests/visual/267-identity-line.spec.js` instead of re-driven.

## Into CLAUDE.md

Nothing. No rule was added or changed.

## New docs/QUEUE.md items

None. Item 57 is deleted from `docs/QUEUE.md` and struck in the consolidated file with its three refusals written into the strike.

## New docs/PHONE.md items

None.
The one width question this batch raised is settled by a Playwright spec, which is an agent check, so by `skills/batch`'s five-things test it does not earn a phone entry.

## Probe

**What the item told me to do that I would have done differently.**
It asked to "normalise whitespace on save", and that is the more damaging of the two options.
`HERBS  SPICES & SEASONINGS` is on dozens of production rows, so saving one product with the collapsed form leaves two categories that `catLabel` renders identically, in one filter list, one of which looks empty.
Nothing user-visible is gained, because `catLabel` already collapses it at every read-only render.
Refused, and the fix worth building - a canonicaliser that REUSES an existing value rather than forking it - is filed in `docs/MAINTENANCE.md` with its algorithm.
It also asked to title-case the category field and the Tidy list; refused, because those are the value and not a label, and Tidy is specifically where you go to SEE that a value has a double space in it.
It also asked to split the Tidy list, which `tidyValuesCombined`'s own comment records as Max's call and which would cost the single-action rename across products, ingredients and plates.

**What I did not propose because it was out of scope.**
`.mnu-sec` renders a section name in forced capitals while `.plib-cat`, `.ad-meta` and the Menu's own category filter all title-case it.
Kept as a group heading rather than a shout, and routed to consolidated item 61, which owns the Menu screen and should decide it beside that screen's chip vocabulary rather than in a casing sweep.

**Was any rule missing when I needed it.**
No. `css.md`, `app-guards.md`, `app-data.md`, `invoice.md` and `tests.md` all arrived with the files they protect, and the `.opt .ca` work needed `css.md`'s specificity section, which was there.

## Surprises

The mutation gate appeared to be editing `js/app.js` under me mid-batch, and I killed it on that belief.
It was not: it works in a per-pid sandbox copy, and the "modified on disk" warning came from my own `perl -0pi` edits.

Two `perl -0pi` mutations silently matched nothing because of em-dash encoding, which is the roster's "assert the mutation changed the file" trap arriving in the batch that had just read it.
Both were re-run through Node until `diff -q` proved the change had landed.

One comment I appended swallowed `drop.style.display='none'; resetDrop(drop); kingSyncSave();` into a `//`, which would have left the product picker stuck open.
Caught by reading the grep output rather than by any test, because no test covers that handler.
