# CLAUDE.md - EzPlate (Scoopys-Costing)

EzPlate is a plate/menu-costing PWA for a real café ("Scoopy's Family Cafe").
The owner is **Max** - hospitality background, new to coding and to git.
Price data drives real menu decisions and the data is real, so a broken deploy costs money.

**Who uses it: ONE intermittent user, not staff on real phones mid-service.** Gaps of a week between uses are normal.
When a design call turns on how often the app is opened, this is the answer: an occasional user on mobile data can wait for a fetch, and would rather be told a thing did not save than discover it next week.

This file holds only what you could **violate without knowing**.
Everything true but inferable has been deleted on purpose: a stale fact is worse than no fact, because it gets trusted.
If a line here disagrees with the code, **the code is right and this file is a finding** - report it.

## Where things live

| | |
|---|---|
| Outstanding work | `QUEUE.md` |
| Device checks | `PHONE.md` |
| Per-batch history | `handovers/` (write-once; `README.md` explains the gaps) |
| Version bumps, handovers, running the checks | `skills/` - invoke them |
| Current state | git, the repo, the Supabase MCP. Not this file. |

Global working preferences live in `~/.claude/AGENTS.md` and are not repeated here.
This file wins wherever the two disagree.

`git fetch` and read `origin/main` yourself before trusting local `main` - Max merges via GitHub PR, so local goes stale.

---

# Tier 1 - Traps

Things that look like mistakes and are not.
Each one has already been "fixed" once, or cost real damage.

## The naming inversion - never "fix" it

UI labels and internal identifiers are deliberately CROSSED:

- `data-tab="pantry"` is **labelled "Ingredients"** (kitchen words).
- `data-tab="ingredients"` is **labelled "Products"** (supplier goods).
- `data-tab="builder"` is **labelled "Plates"**.
- Internally: `kitchenIngredients` / `king*` / `kById` / the Supabase `ingredients` table = kitchen words (UI "Ingredients").
  `PRODUCTS` / `byId` / `ing*` render code = supplier products (UI "Products").

**Only ever change text a human reads.** Never rename an identifier, class, id, `data-tab` value, localStorage key or Supabase table.
Renaming for consistency has caused rollbacks.
`tests/terminology.test.js` carries two inversion guards because a terminology pass is exactly when someone is tempted.

Same class: **`rowToMenu` maps a DISH**, despite the name.
Read the table name, not the function name.

## A duplicate definition is never "dead until reached"

`aRow` and `renderAnalysis` were each defined twice at top level in one scope, and **hoisting makes the LAST definition win everywhere**, before any statement runs.
Editing the first was a silent no-op that shipped real bugs.

Both dead copies are gone and `tests/housekeeping.test.js` now fails if any top-level name in `js/app.js` is defined twice again.

## `isFinite('')` is TRUE

`Number('')` is `0`, and so is `Number(null)`.
So a blank field passes an `isFinite` guard and fabricates a `$0.00` observation in the price history.

**Guard with `typeof x === 'number'` first, then `isFinite`.** The null check is separate from the finite check on purpose - do not merge them.
`tests/price-log-paths.test.js` pins it.

## The protected parser region

The contiguous block in `js/app.js` between the exact strings `var INV_EXCLUDE=` and `function unitLabelFor(` is sliced by `tests/_extract.js` using those anchors.
**Never edit anything inside it.** If a fix seems to require it, stop and tell Max - solve outside the region.
The taught-pack path exists precisely so the parser needn't learn every notation.

**Never touch** `resolveMatchedPrice`, `unitCatCategory`, `applySupplierMemory`, `packToUnitCost`.
Reading them is fine.

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
**Any change to what `bootstrapSync` puts in memory is a change to the backup format, and must bump `stamp.format`.** `parseBackupFile` accepts formats 2 and 3 and refuses everything else by name; it refuses format 1 outright because the literal needed to tell a delta from a snapshot was deleted.

## `ingredients.updated_at` is not history

It means nothing.
Every product row carries the **same single timestamp** - the restore's - so it records when the table was last rewritten wholesale, not when anything changed.
Never read it as a modification time, a price date, or an ordering key.

The real per-product series is `ing_price_history`, and **`setProduct` is its one writer**.
Its condition is the PREVIOUS STORED price, not the last logged point - two separate guards, deliberately not merged.
Product creation logs a first point on purpose.

## Per-publication counting was decided, then reverted on real data

The dashboard headline counts **per publication**, so a plate on two menus counts twice.
Distinct-plate maths was built, tested, and **reverted by Max against his own data** because it broke arithmetic consistency with the By-menu rows.

It is a decision, not a bug.
If it is revisited, the answer is a design one - stop implying All menus is a row like the others - not a quiet change to the maths.
Related: **arithmetic across two series fabricates movement.** The change log stores an ALL-MENUS average; subtracting it from a per-menu current invents a number.
That is why the since-line renders at all-menus scope only.

## The client's role is not the MCP's role

**A migration verified through the MCP or the SQL editor has NOT been verified for the client.** Found the hard way, on production.

`postgres` (MCP, SQL editor) and `authenticator` (PostgREST, for `anon` and `authenticated`) differ in ways that change whether SQL *runs at all* - preloaded libraries, `statement_timeout`, and RLS, which the MCP bypasses entirely.
The `verify` skill has the differences and the procedure for exercising an RPC as the client.

The one that bites while editing code: **`safeupdate` rejects any WHERE-less `DELETE` or `UPDATE`** for `authenticator` but not for `postgres`.
So **the `where true` on the restore's deletes is load-bearing** - it looks like a no-op and is not.
Do not tidy it away.

Also: **an anon UPDATE or DELETE returns 204 with NO error** and touches nothing.
A caller checking only for an error would believe it had written.

## Three foreign keys, and only one can ever error

- `menu_items.plate_id → plates.id` - **NO ACTION**.
  Deleting a plate while a dish references it raises **23503**.
  The app's only FK hazard.
- `plates.menu_id → menu_items.id` - ON DELETE SET NULL.
  **Legacy, read by nothing.**
- `menu_items.menu_id → menus.id` - ON DELETE SET NULL.

So `doDeleteMenu`'s dishes-before-menu ordering guards nothing; its comment claiming an FK violation is **wrong**, and it is not precedent for anything.

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

## Gating the last committing action is not a gate

The invoice review does not render at all until the AI referee answers, because a match picked, an add-new ticked or a pack taught during the window makes `gemApplyReadings` skip that row - the referee then defers to a ruling made without it.
Disabling the final confirm would not have helped.

`invConfirmState` is the pure decision.
**The watchdog MUST bump `gemToken`**, or a late response is still merged.

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

## Five history series, deliberately separate - don't merge them

`priceHistory` · `menuHistory` · `menuPriceLog` · `ingPriceLog` · `changeLog`.

The last is not a price series at all: **`menu_change_log` records what MAX did; every other log records what a SUPPLIER did.** A supplier price movement must NEVER reach it - it is the thing being measured.

**The condition is a function, not a list: if `setProduct` wrote it, it is drift and belongs in `ing_price_history`.** Two more:

- **`avgBefore` must be read BEFORE the mutation** - `computeAvgFoodCost()` is live, so one line later it is already the AFTER figure.
- **`kind` alone does not answer "did this move menus"** - a save that changes the price AND the menu logs `dish_price`; the move is in `detail.menuFrom` / `detail.menuTo`.
  **Read `detail`, never `kind` alone.**

When checking whether a change is logged, **check the writer, not just the reader.**

## Chart colour is anchored to the TARGET, not to direction

Green = at or under target, the Menu-Analysis meaning; sparklines match.
The older "green = improving" rule made the chart permanently red during ordinary trading.
`tests/trend-reframe.test.js` holds the pair that catches a revert: rising-under stays green AND falling-over stays red.

## `addProduct` is dead in the app and DELIBERATELY KEPT

The `fresh-states` Playwright specs have no other handle on the pid-line shape, and Playwright is not in `npm test` - so deleting it fails **silently**.

---

# Tier 2 - Constraints

Decisions already made.
These bound what may be built; they are not open questions.

## The four object nouns - UI copy may not invent a fifth

- **Product** - something you buy from a supplier.
- **Ingredient** - the name you cook with; links to exactly ONE product.
- **Plate** - a costed dish built from ingredients.
- **Menu** - a set of plates with sell prices.

**Forbidden as object nouns:** "recipe" (names nothing in this app), "kitchen word" / "kitchen name" (internal vocabulary - the object is an **Ingredient**), and **"dish"** (Max, 25 Jul 2026: a plate on a menu is still a plate).

Describing without naming is fine - "the name you'll use when building plates" is good copy; "your kitchen name" is not.
`tests/terminology.test.js` pins this.
**"Menu item" is a known surviving fifth noun** in the Edit-menu-item modal, awaiting its own brief - it is not a bug to fix on sight.

## Data and storage

- **Supabase is the source of truth; the app is online-only.**
- **localStorage holds view preferences and derived caches ONLY** - never data.
  If something new resists that classification, **ask: there is no third category.**
- Products come from the Supabase `ingredients` table and nowhere else.
  Custom ids are `CX*`.
- Plates persist `{kid, qty}` only; kitchen-word renames are display-only.
- `nextKid()` scans the live `kitchenIngredients` array - push immediately, never batch ids.

## Writes

- **Every Supabase write goes through the `pushWrite`-wrapped helpers** (`dbPushPlate`, `dbPushMenu`, `dbPushIngredient`, `dbSetSetting`, `saveKitchenIngredients`, …).
  They set sync state and surface the REAL error to a toast.
  Never call the client raw.
- **`pushWrite` returns its settled promise** - resolves to the result, `{error}`, or `null` when offline.
  Use it whenever write B depends on write A landing.
- **Known gap, flagged not fixed:** `pushWrite` drops writes silently when fully offline - no queue, no retry.
  Don't assume a write happened because the call was made.
- **Rounding (Max, 15 Jul):** currency DISPLAYS round to the cent (`toFixed(2)`); stored costs (`cost_per_base_unit` etc.) stay exact.
  **Never round stored values.**

## Menus

**Menu deletion deletes its dishes and UNLINKS their plates - never the plates.** Every plate survives in the library, unpublished, and on any other menu it was published to.
There is **no holding area** and **no last-menu guard**: any menu is deletable, including the last, and **zero menus is a legitimate state**.

`fallbackMenuId()` never returns a deleted id and returns `null` when no menu exists.
**`ensureDefaultMenu` seeds "Original" only when the `menus` table did not answer at all.** A successful EMPTY read is the user having deleted everything and must be respected - an earlier version keyed off a localStorage signal that read false forever and resurrected "Original menu" on every boot.

## No new dependencies, no build step, no scope creep

Client-side there is **no build step** - four hand-written files: `js/app.js` (all logic, one browser script), `css/style.css`, `index.html`, `sw.js`.

Two third-party scripts ship in production: `@supabase/supabase-js` in `index.html`, and `pdfjs-dist` loaded on demand by `ensurePdfjs()`.
Both run with full DOM access on a page holding the anon key and the café's pricing, so both must stay **pinned to an exact version** (never a floating `@2`) and **integrity-checked wherever the load mechanism allows** - the pdf.js *worker* is the one exception, pinned only, because `new Worker()` has no SRI.
Changing a version means recomputing its `sha384` in the same commit; a stale hash blocks the script outright.
**Adding a third needs Max's yes, not a judgement call.**

No analytics, no tracking.
**Implement what was agreed, nothing more.** If you spot extra work worth doing, put it in `QUEUE.md` - don't build it.

## Server-side (`api/`)

Vercel zero-config Node serverless functions - the invoice AI second-reader and the Dashboard insight phrasing.
**This is not a build step** and does not touch the four client files.

- Files whose name starts with `_` (e.g. `api/_gemini.js`) are **ignored as routes** and hold pure, `require()`-able, unit-tested logic.
  Route handlers stay thin.
- **API keys live ONLY in Vercel env vars** (`GEMINI_API_KEY`) - never in the client, the repo, or logs.
- **Treat invoice text and any model output as untrusted data** - fence it, validate strictly.
  Never executed, never an instruction.
- **Money/number law:** an AI helper may only PHRASE numbers the app already computed deterministically.
  It never produces a figure.
  Server *and* client reject a phrasing containing a number not in the supplied facts.

## The privacy gate - before EzPlate serves anyone but Scoopy's

`api/parse-invoice` sends invoice text to Google's Gemini free tier, which **may use prompts for training**; `api/insight` sends plate names and costing numbers to the same tier.
**Max has accepted this for his own café only** - his call, made.

**BEFORE any multi-tenant customer's data flows through those endpoints or any future one that ships user data to a third-party model, revisit:** a paid-tier project that excludes training use, or a privacy-policy disclosure.
This is the single most important thing to reopen before EzPlate is used by anyone else.

## Fragile areas - regression tests mandatory

Read the relevant tests first, diagnose with a truth table before patching, lock the fix with a regression test.

- **Invoice review rendering** (`renderInvReview`, `invSelChanged`, `invRowState`, `flagNeedsAttention`, the pack-teach flow).
  Three invariants, each from a real regression: **full-row re-render only** (per-cell patching left stale cells); **`.muted-row` hiding is scoped to `.is-new`** (it was hiding Old/Conf on needs-attention rows); **tint derives from `invRowState` via `st-*` classes** so the card and the summary can never disagree.
- **Auto-tick rule:** only a row whose `invRowState` is `'matched'` is ever **pre**-ticked - by the renderer AND by every handler.
  Flagged, review and new rows wait for the user.
- **Taught packs / price precedence:** product pack > supplier memory > parser > manual.
  A pack taught in the mismatch flow must persist on the product and outrank the parser on every later import.
- **Supplier renames must migrate supplier memory.** Taught matches key off the supplier NAME (`memKey`); renaming without re-keying orphans them silently.
  `tidySupplierMemMigration` rebuilds keys from each entry's already-normalised `phrase_norm`.
  Apply the same pattern to any future rename of a name used as a lookup key elsewhere.
- **Mobile visual consistency:** one card system, compact header pills not full-width bars, one primary CTA per screen.
  A previous density pass was rolled back wholesale - visual changes are surgical, one screen at a time.

---

# Tier 3 - How work arrives

## Chat cannot see this repo

Every claim a brief makes about the code is an **inference from a summary**, and those inferences have been wrong repeatedly.

**When a brief contradicts the code, the code wins and the brief was wrong.** Report it; never work around it silently.
Nothing in a brief is beyond correction, including anything it calls settled.

**Pushback is the point, not a courtesy.** Every enumeration in this project has come back different from the brief's guess - one named price path found three, six dead functions found thirty-one, one creation path found two.
**If a brief's list looks complete, check it anyway.**

`/investigate` runs before a brief when one is warranted - read-only, no branch, no code.
Its highest-value output is "this is the wrong question": one request asked which tab held the invoice review, and the answer was that the tabs were identified backwards.

## Working with Max

- He communicates tersely, in note form, usually with phone screenshots.
  Real examples beat abstract descriptions - **ask for a screenshot when unsure.**
- **Plan first - when the work is not already approved.** The trigger is where it came from.
  Work arriving from **chat, a brief or a screenshot** is unapproved and the brief may be wrong: restate it as a scoped, root-cause-framed plan and get a yes before editing, asking any clarifying questions up front with your recommended answer for each.
  An item **already in `QUEUE.md` is approved** - Max said yes when he queued it, so `/batch` runs it without stopping.
  Re-asking there spends the only resource that is actually scarce.
- **Rollbacks happen.** If Max says the baseline is X, believe him - then verify it yourself and report discrepancies before working.
- **Keep commentary in the PR and the handover - never in user-visible app copy.**

## Migrations are applied BY HAND

`list_migrations` is empty, so **the migration files plus their commit messages ARE the audit trail.** Write the migration, put it in the queue item, mark the item blocked, and let Max run it.
Never bundle one into a batch, never apply one yourself.

## Deploy

GitHub `main` → Vercel auto-deploys → installed PWAs pick it up via the network-first service worker.
**Treat every merge to `main` as a production deploy.**

**Production is `https://scoopyscosting.vercel.app`** - the stable alias, and the only URL that answers without a login.
The per-deployment URLs from `gh api …/deployments` are auth-protected and 302 to Vercel SSO, so a `curl` against one proves nothing.
Fetch the alias, and check WHICH build answered before concluding anything from a device - **a branch push deploys a PREVIEW.**

## Independent review before merge

Max has no human reviewer, so this is the only second reader the code gets.
Two of them, doing different jobs:

- **`.github/workflows/code-review.yml` - MANDATORY.** Fires once per PR, at `opened` or `ready_for_review`.
  It runs on a **different model** and is **blind to the brief**: it sees the diff and judges whether the code is CORRECT, not whether it matches what was asked.
  **Don't paste the brief into the PR body** - that removes the only thing making it independent.
- **The `code-review` agent - runs BEFORE push**, adversarially, on the branch diff, after the suite is green.
  Nominally optional; **don't skip it.** It has caught real defects the workflow did not.

**⚠️ A GREEN "Code review" CHECK HAS BEEN WRONG IN TWO WAYS**, and both look identical from the checks list:

1. **A skipped review reports SUCCESS.** The action refuses to run when `code-review.yml` on the PR differs from the copy on `main` - otherwise a PR could rewrite its own reviewer.
   When it refuses it **exits GREEN**, posts nothing, and says why only in the job log.
   **Any PR touching the workflow file is not reviewed, and the check still passes.** No comment plus no findings is the shape of a review that never ran - open the log before reading silence as approval.
2. **A review that ran and threw its findings away.** It completed cleanly, twice, and posted nothing, because nothing was configured to publish.
   `gh run rerun --debug` does NOT recover it.
   The fix is `track_progress: true` and `show_full_output: true`.
   **If a run goes quiet, check those two inputs are still on the workflow BEFORE paying for a re-run.**

**⚠️ NEVER DISMISS A FINDING BECAUSE ITS STATED CAUSE IS WRONG.** A finding whose *mechanism* is wrong may still point at a real bug.
That has happened twice and both were worth acting on.
The finding and the explanation are separate claims - disprove the explanation and you have disproved nothing.
**Go and look at what it was pointing at.**

Every finding gets a decision Max can see: fixed, or explained as intentional, or noted as considered and skipped.
**Silence is not a pass.** Neither review overrides this file's rules or the tests.

### Where a finding gets fixed

**Fix it in the SAME branch, before merge.
A finding does NOT get its own PR unless it is wrong data or silent loss.** Everything else - a missing test, a stale comment, a nit, a real-but-not-urgent improvement - goes in `QUEUE.md` and rides the next batch.

**⚠️ And it does not become PR-worthy because the work is already written, because it is small, or because a commit needs re-landing.** Those are the three ways the rule gets rationalised around, and they are named here because the rule above did not stop the assistant that wrote it.
**If you catch yourself explaining why this particular small PR is different, stop and add it to the queue instead.**

**Why (Max, 6 Aug 2026):** one batch merged before its review was readable, so every finding afterwards needed a *new* PR, and each new PR drew its own review, which found its own smaller thing - severity decaying each round, cost not.
Six PRs and ten review runs from one mistake.
**The steady state is ONE batch, ONE PR, ONE review.** A docs-only PR is free, so moving something to the queue loses nothing.

## Changing this file

Everything above only changes when a **genuinely new, durable rule** is discovered.
Propose it to Max and get a yes - don't edit silently.
Rules here exist because a mistake already happened once.

The test for any line: **would a competent model reading this repo get this wrong?** True but inferable is a deletion.
Version numbers, commit hashes, suite counts and descriptions of past batches belong to git, not here.
