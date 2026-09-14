---
paths:
  - "js/app.js"
---

# Client data - names, row boundaries, history and figures

Loaded whenever `js/app.js` is read. The naming inversion and the row boundary are the two that have cost real data.

**Moved out of `CLAUDE.md` verbatim by batch 264** so it loads with the file it protects instead of on every turn of every session. The rule in `CLAUDE.md` is the one-line version; this is the evidence.

⚠️ **Cross-references here were written before the split.** *"this file"*, *"Tier 1/2/3"* and *"the section above/below"* meant `CLAUDE.md` as it stood at 1,078 lines; the target is now `CLAUDE.md`, another file in `.claude/rules/`, or `docs/rules/process.md`. **The text is deliberately unedited - rewriting fifty pointers by hand is how a rule drifts from the one that was agreed.** Grep the phrase rather than following the direction.

## The naming inversion - never "fix" it

UI labels and internal identifiers are deliberately CROSSED:

- `data-tab="pantry"` is **labelled "Ingredients"** (kitchen words).
- `data-tab="ingredients"` is **labelled "Products"** (supplier goods).
- `data-tab="builder"` is **labelled "Plates"**.
- Internally: `kitchenIngredients` / `king*` / `kById` = kitchen words (UI "Ingredients").
  `PRODUCTS` / `byId` / `ing*` render code **and the Supabase `ingredients` TABLE** = supplier products (UI "Products").

⚠️ **THIS LIST PUT THE SUPABASE `ingredients` TABLE ON THE WRONG SIDE UNTIL 10 SEP 2026, AND IT IS THE ONE ENTRY THAT COULD COST DATA.** It grouped the table with the kitchen words; the table holds PRODUCTS. Tier 2 has always said so correctly - *"Products come from the Supabase `ingredients` table and nowhere else"* - so the file disagreed with itself, and the wrong half was in the section a reader consults precisely when they are unsure which is which.
**Measured on production, 10 Sep 2026, not reasoned:** `public.ingredients` holds **428 rows, 35 of them `is_custom`** (the same 428 batch 248 counted when it found `price_as_of` written by nothing), while the kitchen Ingredients are **164 entries in an `app_settings` JSON blob** under the key `kitchen_ingredients` - the row-boundary section below has always said that blob is where they live.
**Caught while writing a migration that names the table**, which is exactly the situation the section exists for: batch 255 was about to grant or revoke a delete on "products" and had to know which table that was. A reader trusting this line would have written the policy against the wrong data.
**The transferable half: a two-column mapping is wrong in a way prose is not, because you check the column you are unsure about and trust the row.** When a file states the same fact twice, in two sections, for two audiences, the two are not redundancy - they are a pair that can disagree, and this one did for months.

**Only ever change text a human reads.** Never rename an identifier, class, id, `data-tab` value, localStorage key or Supabase table.
Renaming for consistency has caused rollbacks.
`tests/terminology.test.js` carries three inversion guards because a terminology pass is exactly when someone is tempted. *(Said "two" until 28 Aug 2026, AUDIT-v176; the third — `:125` — is the strongest of them, pinning the CROSSING itself across nav buttons AND panel headings rather than either side alone.)*

Same class: **`rowToMenu` maps a DISH**, despite the name.
Read the table name, not the function name.

## The row boundary - the backup export is IN-MEMORY shape, not schema shape

`buildBackup` dumps live JS objects verbatim, so `menu_items` rows come out **camelCase**: `menuId`, `plateId`, `sourcePlateId`, `custom`.
The columns are `menu_id`, `plate_id`, `source_plate_id`, `is_custom`.
`rowToMenu`/`dbPushMenu` translate on every normal read and write; the export bypasses both.

A restore written from the schema therefore inserts every dish with a null plate link - **every row present, nothing connected**, no error raised.
It has already cost 76 of 77 dishes on one real file.

Any importer must translate through the existing `xToRow` writers and never name a column of its own.
Two groups have **no row mapper and that is not an oversight**: `kitchen_ingredients` and everything under `settings` are `app_settings` JSON blobs written by `dbSetSetting`, so **their boundary is the SETTING KEY**, not a column list.

**The general law:** a backup that dumps live in-memory objects inherits every assumption those objects carry.
Change what fills them and you have changed the file format without touching the exporter - silently, with the tests still green.
**Any change to what `bootstrapSync` puts in memory is a change to the backup format, and must bump `stamp.format`** - **UNLESS ALL FOUR of these hold**, which is the carve-out 184 and 193 each applied on their own and which read as a violation both times because this rule did not carry it:

1. **no group is added, removed or renamed**;
2. **no key is removed or renamed**, and none changes type;
3. **the new key is NULLABLE with NO COLUMN DEFAULT**, if it lands in one of the five tables `restore_backup` inserts with `select *`;
4. both directions were **restored on staging and checked**, not reasoned about.

A new nullable, default-less field inside an existing group is the case that passes: both directions read it as null, an old file restores clean and a new file restores into an old build clean, so the number would be announcing a compatibility break that did not happen. `backupToPayload`'s conditional `format` is the precedent - **the number declares what the PAYLOAD CONTAINS, not which build sent it.**
⚠️ **This said "`buildBackup`'s own" until 22 Aug 2026 and the function was wrong.** `buildBackup` carries a FLAT format number; the conditional is in `backupToPayload`, which is the WIRE format rather than the FILE format, and the two are deliberately different.
⚠️ **AND NO FORMAT NUMBER IS WRITTEN OUT HERE ANY MORE, ON PURPOSE.** This paragraph said "a flat `format:3`" and quoted `format:chg.length?3:2`, and batch 219 moved BOTH when it took the file to 4 - so the sentence telling a reader to go and check the citation was itself the stale claim, which is the failure it was written to fix, one format number later. **Read the two literals from `js/app.js`; what does not rot is which function holds which kind of number.** (Corrected 2 Sep 2026 by AUDIT-v186 F1.) The error originates in `js/app.js`'s own comment at the `buildBackup` site, which says "the precedent below" about a construct ~190 lines away in another function - so a reader who checks the citation finds a flat `3` and concludes the rule is wrong, when only the pointer is. **Found by a blind code auditor that had never seen this file** (`docs/audits/BLIND-AUDIT-2026-08-22-code.md`, finding 11a); ~~the comment in `js/app.js` is queued for the same fix in `docs/MAINTENANCE.md`.~~ ✅ **BOTH ENDS ARE GONE** — the comment at the `buildBackup` site cites `backupToPayload` correctly and the maintenance entry records it done. (This named `js/app.js:7726`, and by 2 Sep 2026 that line was `submitInvite`; the comment itself is still correct. **Grep the name, per this file's own header.**) Struck 28 Aug 2026 by AUDIT-v176, which followed the pointer and found nothing at either end.
⚠️ **CONDITION 3 IS NOT BELT-AND-BRACES AND IT IS WHY THIS CARVE-OUT IS FOUR CLAUSES RATHER THAN ONE.** (Added 15 Aug 2026 by batch 194's pre-push review, which caught the first draft stating only conditions 1 and 2.) The DEFAULT section below is the reason: `jsonb_populate_recordset` turns a key that is ABSENT from an old file into an **explicit NULL that overrides the column DEFAULT**. So a new column WITH a default satisfies "no group touched, no type changed" perfectly, skips the bump under a two-clause rule, and then **restores every old file with that column null instead of defaulted** - silently, with the right row counts. The two rules would have been in one file disagreeing about what is safe. **A defaulted column is a format change even though nothing about the JSON shape says so.**
⚠️ **AND IF YOU DECIDE IT DOES NOT NEED A BUMP, SAY SO AT `buildBackup`'S OWN SITE.** 184 wrote that note and gave the reason in one line: *a silent decision against this rule is indistinguishable from having missed it.* 193 made the same call, its handover said the note was written, and **it was not** - so the audit trail claimed a comment that did not exist. The carve-out is the cheap half of this; the note at the site is the half that makes it checkable.
`parseBackupFile` accepts every format the current build writes and refuses everything else BY NAME; it refuses format 1 outright because the literal needed to tell a delta from a snapshot was deleted. **Read the accepted set from its guard rather than from here** - this line said "2 and 3" until 2 Sep 2026 and 219 had added 4.

## Data and storage

- **Supabase is the source of truth; the app is online-only.**
- **localStorage holds view preferences and derived caches ONLY** - never data.
  If something new resists that classification, **ask: there is no third category.**
  **The one standing exception is the plate draft** (`cafeDB_plateDraft`), which is authored content and not a preference: it is the in-progress builder plate, held so an interrupted user can resume, and it is deliberately NOT a third category - it is unsaved work on its way to Supabase, deleted by `clearPlateDraft` the moment it lands or stops being dirty.
  **A `localStorage.getItem('...')` grep MISSES it**, because every use goes through the `DRAFTKEY` constant - which is why two audits in a row rediscovered it as an unexplained violation. Named here so the third one doesn't.
  ⚠️ **And it is NOT a special case - that framing was the actually misleading part, corrected 12 Aug 2026 by AUDIT-v156.** Measured against `js/app.js`: there are **thirteen** `cafe*` keys. A `getItem('...')` grep finds **six** of them and misses **seven**, for TWO different reasons:
  - **six go through a constant** - `ENV_STAMP_KEY`, `DRAFTKEY`, `KEY`, `AI_INV_KEY`, `AI_SUG_KEY`, `THEME_KEY`;
  - **one is never read at all** - `cafeDB_prodDensity` is a tombstone, only ever `removeItem`'d, so no read-side grep of any kind finds it.
  (This line previously said the grep "finds the other nine keys and MISSES this one". Wrong on both halves, and it implied the draft was the single exception when it is one of seven.)
  **So: grep the STRING `cafeDB_`/`cafeCost_`, never the call site** - that finds all thirteen, constants and tombstone included.
  ⚠️ **It actually returns FOURTEEN, and the fourteenth is PROSE** (AUDIT-v176, 28 Aug 2026): `cafeDB_menus` appears only inside the comment at `js/app.js:2590` explaining that the key is dead. **That is roster entry 183(a) biting inside the sentence that recommends the grep** - the same trap the `:not([hidden])` paragraph below already warns about, and it is left written out for the same reason. Read the hits; do not trust the count. No line number here on purpose; grep the name.
- Products come from the Supabase `ingredients` table and nowhere else.
  Client-minted product ids carry a `uid()` prefix - **`CX` from the invoice add-new flow and `IMP` from the catalogue importer** - and **NOTHING READS EITHER PREFIX**. The column that says a row is the user's is **`is_custom`**, which both mappers round-trip and which `js/app.js` calls, at its own site, *"the column that tells a restore which rows the user made."*
  ⚠️ **This said "Custom ids are `CX*`" until 15 Aug 2026, which invited a filter that is now half-blind:** `id.startsWith('CX')` silently misses every imported product, and a café that onboards through the importer has a catalogue that is **100% `IMP*`**. The sentence was true when there was one mint and became a trap when 193 added the second. Read the column, never the prefix.
- NEW plate lines are written `{kid, qty}`; legacy `{pid, qty}` and `{misc, label, cost}` lines are LIVE data (84 of 179 lines at the v125 count) that every reader must keep resolving. Kitchen-word renames are display-only. (The word "only" was dropped 9 Aug 2026, Max's yes - it invited a refactor or importer to discard the legacy shapes on the authority of a hard rule.)
- `nextKid()` scans the live `kitchenIngredients` array - push immediately, never batch ids.

## Writes

- **Every Supabase write goes through the `pushWrite`-wrapped helpers** (`dbPushPlate`, `dbPushMenu`, `dbPushIngredient`, `dbSetSetting`, `saveKitchenIngredients`, …).
  They set sync state and surface the REAL error to a toast.
  Never call the client raw.
- **`pushWrite` returns its settled promise** - resolves to the result or to `{error}`, and **NEVER to `null`**.
  Use it whenever write B depends on write A landing.
  **`null` is `dbPushMenuAfterPlate`'s contract, not `pushWrite`'s** (corrected 10 Aug 2026, Max's yes, after AUDIT-v135 - this file claimed `pushWrite` resolved `null` when offline, and it has no such path: every exit is the result or `{error}`).
  The distinction decides real code: **a caller that treats only `null` as failure sequences its dependent write straight after an error.**
- **Known gap, flagged not fixed:** `pushWrite` **drops** writes when fully offline - no queue, no retry.
  Don't assume a write happened because the call was made.
  **It is not SILENT, and don't write a "tell the user" fix for a case already covered** (corrected 10 Aug 2026, same audit): the fail handler toasts *"you're offline. It has NOT been saved."* - offline changes the WORDING only, never whether the user is told.
- **Rounding (Max, 15 Jul):** currency DISPLAYS round to the cent (`toFixed(2)`); stored costs (`cost_per_base_unit` etc.) stay exact.
  **Never round stored values.**

## Menus

**Menu deletion deletes its dishes and UNLINKS their plates - never the plates.** Every plate survives in the library, unpublished, and on any other menu it was published to.
There is **no holding area** and **no last-menu guard**: any menu is deletable, including the last, and **zero menus is a legitimate state**.

`fallbackMenuId()` never returns a deleted id and returns `null` when no menu exists.
**`menusList` MEANS MENUS THE SERVER HAS, and `withPublishMenu` decides whether to create one by reading `menusList.length`** - so a writer that puts a menu there before the server has kept it puts a hole straight through the publish path, and the app then writes a dish against an id no `menus` row answers to. **Three writers, all of which wait for the server:** `bootstrapSync` assigns what the table returned, `submitNewMenu` pushes and takes back anything the server refused, `ensurePublishMenu` pushes only after a confirmed write. **If you add a fourth, this is what it owes.**

**A successful EMPTY read is the user having deleted everything and must be respected** - zero menus is a legitimate state, and an earlier version keyed off a localStorage signal that read false forever and resurrected "Original menu" on every boot.
⚠️ **THIS PARAGRAPH DESCRIBED `ensureDefaultMenu` AND ITS CALL-SITE GATE UNTIL 9 SEP 2026; BOTH ARE DELETED** (batch 246, QUEUE item 20), and the reason is the more useful half of the rule. The seeder was reached when the `menus` read **errored**, and an error cannot tell a table that does not exist from one request that failed - so a single flaky read out of the boot's thirteen invented a menu, repointed `currentMenuId` at it, and left every real dish on a menu not in the list. Measured in Chromium: a clean-looking boot, the café's menu gone, and the Menu screen offering *"Nothing on this menu yet. Publish a plate from the Plates tab to see it here."*
**The `menus` read is now REQUIRED** - its error joins the four that raise the boot gate - so there are only two cases left, rows or a legitimate zero, which is what the rule above was always about. **A two-valued gate could not express the third case, and the answer was to remove the third case rather than to give the seeder a better guess.** (The 9 Aug 2026 correction that put the gate at the call site was right about where it belonged; what expired is that there is a gate at all.)

## `ingredients.updated_at` is not history

It means nothing.
Every product row carries the **same single timestamp** - the restore's - so it records when the table was last rewritten wholesale, not when anything changed.
Never read it as a modification time, a price date, or an ordering key.

The real per-product series is `ing_price_history`, and **`setProducts` is its one writer** - plural, since batch 193.
⚠️ **This said `setProduct` until 15 Aug 2026 and the singular is now the WRAPPER, not the writer.** `setProduct(id, patch)` is `setProducts([{id, patch}])`, its N=1 case; the catalogue importer calls `setProducts` **directly** with up to a whole catalogue at once. So a reader asking *"who can write `ing_price_history`?"* who greps `setProduct(` finds six call sites, every one of them a single row, and **misses the one path that writes hundreds**. Grep the plural.
Its condition is the PREVIOUS STORED price, not the last logged point - two separate guards, deliberately not merged.
Product creation logs a first point on purpose.

## Three foreign keys between the DATA tables, and only one can ever error

⚠️ **This heading said "Three foreign keys" until 13 Aug 2026, and the live count is MUCH HIGHER** - fifteen after **181** added `business_id → businesses` on all ten public tables plus two on `business_members`, eighteen after **191** added `business_invites`'s three, and **whatever it is when you read this.** (182 is the policy swap and the key widening and adds no foreign key at all; a first draft of this line credited it and was corrected by batch 194's pre-push review. Only two migrations have ever added one of these: `20260813_business_id_part1.sql` and `20260814_invitations.sql`.)
**The three below are still the only ones that constrain the app**, which is why the section is scoped rather than rewritten: the tenant FKs can only raise if someone deletes a `businesses` row, and nothing does.
⚠️ **The number used to be written out here and it went stale TWICE in ten deploy versions** - both times because a batch added a table without owning a count in a file it had no reason to open. **Grep `pg_constraint` for the live figure**; what this section is for is telling a reader which three of them matter, and that part does not rot.

- `menu_items.plate_id → plates.id` - **NO ACTION**.
  Deleting a plate while a dish references it raises **23503**.
  The app's only FK hazard.
- `plates.menu_id → menu_items.id` - ON DELETE SET NULL.
  **Legacy, read by nothing.**
- `menu_items.menu_id → menus.id` - ON DELETE SET NULL.

`doDeleteMenu`'s comment claiming an FK violation was **wrong** and is corrected at the site (batch 254).

⚠️ **BUT THIS SECTION THEN DREW THE WRONG CONCLUSION FROM ITS OWN CORRECT OBSERVATION, AND SAID SO FOR MONTHS: "the dishes-before-menu ordering guards nothing".** It guards something, and calling `plate_id` "the app's only FK hazard" is true only if a hazard has to be an ERROR.

**`ON DELETE SET NULL` IS MORE DANGEROUS THAN `NO ACTION`, NOT LESS, AND IT READS AS THE MILD ONE.**
- `NO ACTION` (`menu_items.plate_id`): delete the plate with a dish still referencing it and Postgres **raises 23503**. Loud, immediate, and the write did not happen.
- `SET NULL` (`menu_items.menu_id`): delete the menus row with a dish delete still in flight and Postgres **helpfully detaches the dish for you**. If that dish's own delete then fails, the row **survives, attached to no menu, on no screen, with nothing raised anywhere** — this file's own "a row that saved without error and is invisible". An error would have been the good outcome.

So the ordering is load-bearing in BOTH paths; only the failure mode differs, and the quiet one needs the sequencing more because nothing will ever tell you it was needed. Both are sequenced and rolled back as of 254; measured on production that day, 90 `menu_items` rows and **0 orphaned**, so this was latent rather than damage already done.

**The transferable half is not about foreign keys: a referential action that "handles" your mistake has converted an error into a silent state change, and the milder-sounding clause is the one to sequence against.** Reach for the same question wherever a database, a framework or an API says it will clean up after you — `ON DELETE CASCADE`, an upsert that inserts what it cannot find, a retry that swallows a 4xx.

The two tables are nonetheless **CIRCULAR**, which constrains any restore: `menu_items.plate_id` errors if plates go first, while `plates.menu_id` cannot be inserted before the dishes exist.
**Any delete-and-reinsert of both tables must delete dishes first and insert plates with `menu_id` omitted** - which is what `plateToRow` already does, so the restore is correct by existing design rather than by luck.
If `plateToRow` ever starts writing that column, restore breaks.
`tests/restore.test.js` pins it.

Resolve plate↔dish links ONLY through `plateIdOf` / `plateForMenuItem` / `dishesOfPlate` / `menusOfPlate`.
One plate can back many dishes, one per menu - it is many-to-many.

## Cross-referencing writes are a SEQUENCE, not two independent writes

On the way IN, the referenced row lands first: push the plate, confirm it, then the dish (`dbPushMenuAfterPlate`).
On the way OUT it mirrors - the REFERENCING rows go first: dishes, then the plate (`dbDeletePlateAfterDishes`).

Two traps this cost real time to find:

- **Dispatching in the right order is not sequencing.** The delete paths already fired the dish deletes before the plate delete; they just never awaited them, so commit order was arbitrary and the plate delete could be rejected with 23503. It presented as "sometimes broken".
  **A test that records call ORDER passes against the broken code** - assert instead that the dependent write has not been ISSUED while the others are still pending.
- **A helper that swallows its promise cannot be sequenced by anyone.** If you add a `dbDelete*` helper, RETURN the write.

Rolling back on failure is part of the sequence: the optimistic repaint stays, but the WORDING waits for the server, and anything the server kept is put back.
A delete that SUCCEEDED is never resurrected because a sibling failed.

## Five history series, deliberately separate - don't merge them

`priceHistory` · `menuHistory` · `menuPriceLog` · `ingPriceLog` · `changeLog`.

The last is not a price series at all: **`menu_change_log` records what MAX did; every other log records what a SUPPLIER did.** A supplier price movement must NEVER reach it - it is the thing being measured.

**The condition is a function, not a list: if `setProducts` wrote it, it is drift and belongs in `ing_price_history`.** (Plural - `setProduct` is its N=1 wrapper and the importer bypasses it; see the `updated_at` section above.) Two more:

- **`avgBefore` must be read BEFORE the mutation** - `computeAvgFoodCost()` is live, so one line later it is already the AFTER figure.
- **`kind` alone does not answer "did this move menus"** - a save that changes the price AND the menu logs `dish_price`; the move is in `detail.menuFrom` / `detail.menuTo`.
  **Read `detail`, never `kind` alone.**

When checking whether a change is logged, **check the writer, not just the reader.**

## Two more that look like simplifications

- **`productRefs(pid)` checks BOTH paths** - ingredient→pid AND plate-line→pid.
  Deleting a product refuses if either hits.
  Don't collapse it.
- **`publishPlan` is the ONE publish decision**, shared by `submitMenuItem` and `submitAddDish`.
  Two row-creating paths once carried the identical blind guard.
  `renderUnlinkedPrompt` reads its `.unlinked` rather than computing its own.

## The absence of a back-pointer is not evidence that nothing was lost

A dish once read as uncosted while its recipe sat unreferenced in the library, because only one direction was checked.
**Look on the OTHER side too.**

## The headline average is a MEAN OF PER-PLATE RATIOS, and it is bounded at 300%

(241, queue items 18 and 23. Two decisions about one number, written together because they are read together.)

**Which average.** `avgFoodCostForScope` averages each plate's own `cost/price`, so a $0.36 fritter weighs exactly as much as an $18.84 seafood box. The defensible alternative — total cost over total price — is a different number, **1.4 points away on Max's real data** (25.0 against 26.4, turning "5.0 pts under" into "3.6"). Nothing on any screen used to say which one you were reading, and the tile, the menu pills and the sidebar badge all agree with each other, so the disagreement was invisible by construction. **Both tiles now name the method** — "Average of plate food costs" — and the method itself is unchanged. Change the maths and you change every stored history point's meaning; change the label and you have only told the truth.

**And it is bounded.** A plate whose ratio exceeds `FOOD_COST_SANE_MAX` (300%) is excluded from the average, from the over-target count, from the insight facts and from the Dig-in ranking — because **a ratio that high is not a menu that needs repricing, it is a price that is wrong**, and averaging it in let one $0.01 typo take the production headline to 354.4%, the trend axis to 380%, and the AI copy to "swings 20000-30000%". Every figure deterministic, correctly phrased, and about a typo.
⚠️ **EXCLUDING IS ONLY HALF A FIX AND THE OTHER HALF IS NOT OPTIONAL: the plate is NAMED on its own Dashboard row.** A figure that silently drops a plate is exactly as unreconcilable as one that silently includes it — the reader cannot tie either back to the menu in front of them. Any future exclusion from a headline figure owes the same debt.
**The number is written once, in `js/app.js`, with its reason.** Do not restate it here; grep the constant.

## Per-publication counting was decided, then reverted on real data

The dashboard headline counts **per publication**, so a plate on two menus counts twice.
Distinct-plate maths was built, tested, and **reverted by Max against his own data** because it broke arithmetic consistency with the By-menu rows.

It is a decision, not a bug.
If it is revisited, the answer is a design one - stop implying All menus is a row like the others - not a quiet change to the maths.
Related: **arithmetic across two series fabricates movement.** The change log stores an ALL-MENUS average; subtracting it from a per-menu current invents a number.
That is why the since-line renders at all-menus scope only.

## Chart colour is anchored to the TARGET, not to direction

Green = at or under target, the Menu-Analysis meaning; sparklines match.
The older "green = improving" rule made the chart permanently red during ordinary trading.
`tests/trend-reframe.test.js` holds the pair that catches a revert: rising-under stays green AND falling-over stays red.

**The Dashboard's KPI figures carry the same anchoring** - at or under target is good, over is bad - so the strip, the chart, the sparklines and the Menu rows can never disagree.
**Colour on a headline figure is a target reading, not a delta.** (Max, 10 Aug 2026.)
This is also why a "vs last month" delta keeps being the wrong answer to "what does this colour mean": it has now been declined three times (deleted in v98, declined 9 Aug 2026, declined again 10 Aug 2026 as the mechanism a colour-free KPI would have needed).

## `addProduct` is dead in the app and DELIBERATELY KEPT

The `fresh-states` Playwright specs have no other handle on the pid-line shape, and Playwright is not in `npm test` - so deleting it fails **silently**.
