# HANDOVER - 193 (the catalogue CSV importer)

**Branch:** `feature/catalogue-csv-import` · **Scope:** `docs/QUEUE.md` item 2, "Bulk catalogue bootstrap".
Shipped `ezplate-v166`.

## What changed

A café that is not Scoopy's can now get a product catalogue at all, which was the launch blocker.

- **A generic mapped CSV importer, with the supplier export as a recognised preset on top.**
  That ordering is Max's, taken on market research: a column-mapping step is the industry norm and a named supplier integration is the premium tier, so a preset that replaced the mapper would be below market and would need one build per supplier forever.
- **No model is in the path.** Every field is read from a column or left alone, which is the property that satisfies the not-messy requirement that killed bulk-accept. It also means the privacy gate does not bind this feature: nothing goes near `api/parse-invoice`.
- **CSV only, and it says so** (Max, 14 Aug 2026, q2 answer A). A workbook is refused by name with the fix in the message, because "nothing happened" is the worst possible first minute of a new café's life.
- **Re-importing updates rather than duplicates**, keyed on (supplier, product code), which is what the new `ingredients.supplier_code` column exists for.
- **The Products empty state now leads with it.** "Import invoice" is no longer offered there at all: at zero products `invRowState` can return `'matched'` for nothing, so every line of a first invoice arrives untickable. The route survives in the screen header at every width.
- **Product writes are plural now.** `setProduct` is the N=1 case of `setProducts`, `dbPushIngredient` of `dbPushIngredients`, and `saveIngLog` flushes one insert per chunk. A 412-product import was 412 upserts plus 412 history inserts; it is now three plus three.

## The migration

`20260815_supplier_code.sql`, one nullable column with no default, applied to staging and then production, verified as the client over PostgREST both times.
The seven-step procedure was followed and the fingerprints match again at 99 columns.

**The design it ruled out is the one anybody would reach for first, and the reason is measured:** `ingredients_pkey` is `PRIMARY KEY (id)`, not `(business_id, id)`.
Deriving the product id from (supplier, code) would need no migration at all and would make two cafés importing the same supplier's export collide on one primary key.
183 widened `app_settings` and `supplier_phrases` for exactly this; `ingredients` was never widened and gets away with it only because `uid()` is random.
Recorded in the migration header and in `docs/STAGING.md`.

**`stamp.format` was NOT bumped, deliberately**, with the reasoning written at `buildBackup`'s own site as 184 did.
Proved rather than argued: a **format 2** payload carrying `supplier_code` and one without it were both restored through the live `restore_backup` on staging, and came back with the code and with null respectively.
Bumping would also have spent the number the backup-history queue item has reserved, and made every older cached client refuse a new file.

## The pre-push review

Run on a different model, without the brief.
It found **one critical and one major, and both were real.** A process finding of its own was also correct and is worth recording.

1. **Critical, and already fixed in the working tree when it reported** - the supplier combo sets its input value programmatically, which fires neither `input` nor `change`, so typing a prefix and picking the existing supplier off the list left the plan computed against the prefix. Every row would have planned as new and the second import would have duplicated the whole catalogue, through the one control that exists to prevent that. Found independently while writing the flow; the review corroborating it from a stale index is the useful part.
2. **Major, and entirely new.** In carton mode a row with a blank units-per-carton silently fell back to the pack size, an error of exactly the carton size with a plausible number on screen. **A test in this batch asserted that fallback as intended behaviour.** It now refuses the row by name, and the test is rewritten with the inversion recorded in it.
3. **Also from that finding, the case it named second:** an update from a row with no pack size overwrote a per-kilo product's `base_unit` and cost with an each-based one. It now borrows the product's own stored pack when it has one, and refuses the row when it does not.
4. **Its process point was right and I had caused it.** I staged the diff and then kept editing, so it reviewed an index that was three fixes stale. Stage last, or say plainly that the tree is moving.
5. Minor: three helpers had example coverage but no mutation target. Added.

## Into CLAUDE.md

Nothing.
Every trap this batch hit was already written down and every one of them fired: `isFinite('')`, the DEFAULT-versus-restore law, the `[hidden]` origin rule, the @media specificity rule, the row boundary's three places, and the twenty-incident roster.
Two candidates were considered and rejected as already covered.
The primary-key-width finding is real but it is a fact about this schema rather than a rule, so it lives in the migration header, in `docs/STAGING.md` and as a pointer on the audit item, where something re-checks it.

## New docs/QUEUE.md items

**One: `project-audit`, as item 2.**
The counter fired exactly as 192's handover predicted: newest report is `AUDIT-v156`, this batch shipped `v166`, so the gap is 10.
It sits above every unblocked item and its entry names three things it should be pointed at.
The finished item is deleted. No renumbering was needed, because the audit took the freed slot.

Nothing else was queued. Two things found and routed elsewhere rather than queued:

- The sync pill flickers between chunks on a large import, because each chunk is its own `pushWrite`. Cosmetic, and it goes to `docs/MAINTENANCE.md` by the tier test.
- `catImportApply` mints ids and writes, and is the only part of this feature no unit test reaches. It is covered by Playwright end to end, which is why it is not queued.

## New docs/PHONE.md items

Six, under "193 - the catalogue importer".
The two that only Max can settle are both about the real file, and neither is a bug: **does the supplier portal's Export actually offer CSV**, and **is `LAST PRICE PAID` the price of one pack or of the whole carton**.
The columns were read from the portal on 14 Aug 2026 and the file was never downloaded, so nothing in this repo knows either answer.
The importer asks the second question rather than guessing, and the preview shows the computed unit cost so a wrong answer is visible before anything is written.
The sharpest failure to watch for is the product count DOUBLING on a second import of the same file.

## Probe

**What did the queue item tell you to do that you would have done differently?**

One thing, and I did it differently.
The item says the importer must "ask what happens for a café on a different supplier before designing the file picker", and lists a named-format importer and a generic CSV as the two options, then supersedes itself with the mapper.
It also says the file picker should accept CSV and say so.
What it does not mention is that the supplier is a required input in its own right, and I made it one: one supplier per import, chosen through the existing combo rather than read from a column.
The item's dedup requirement cannot be met without it, because a product code is only unique within a supplier, and picking from a list is what stops "Bidfood" drifting to "BIDFOOD" on the second file and duplicating everything.

**What did you not propose because it was out of scope?**

Two.
The mapping is not remembered between imports, so a café on an unrecognised format re-maps eight columns every month; the honest fix is to save the mapping per supplier, which is a new `app_settings` key and a decision about where it lives.
And nothing anywhere shows a product's supplier code, so a user cannot check why a re-import matched or did not.
Neither is queued because neither has been asked for and both are speculative until somebody has actually used this twice.

## Surprises

**Four, and three were found by running things rather than by reading them.**

- **The mutation gate found a WRONG ALLOWANCE, not just a survivor.** Two `setProduct` allowances written in an earlier batch became dead when the target moved, and one of them was false: it argued that `productsById[id]||{}` and `&&{}` cannot be told apart, reasoning only about an absent product. With the product PRESENT, `x&&{}` is `{}`, so the assign wipes every field the patch does not mention. It was always killable. **An allowance is only as wide as the case it reasons about, and "no input distinguishes them" is a claim about every input.** Both are deleted with the argument recorded in place.
- **A brand-new Playwright test claimed to pin two things and pinned one.** The comment said either half of the combo fix alone would let it pass; hand-mutating each half showed that removing the listener turns it red and removing the re-plan does not. The re-plan turned out to be a line no test could make fail, so it was deleted rather than allowed, exactly as the redundant `logged` flag and `catNum`'s early return were earlier in the same batch.
- **`6X2.5KG` parsed as six kilos, not fifteen**, because the character class was `[x×*]` with no uppercase X and supplier exports shout. Caught by its own test within a minute of it being written, which is the only reason it is a note here rather than a defect in production.
- **A `/pack/` regex in a refusal assertion matched both refusal messages on that path**, so it was green whichever branch fired. The gate found it. Anchored to `^no pack size`.
