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
| Outstanding work - tier A and B only, capped at 20 | `docs/QUEUE.md` |
| Tier C - internal quality, worked on the PARALLEL track in its own worktree (its header has the procedure) | `docs/MAINTENANCE.md` |
| Device checks | `docs/PHONE.md` |
| **Migrations - the procedure, both projects, what staging can and cannot rehearse** | `docs/STAGING.md` |
| Per-batch history | `docs/handovers/` (write-once; `README.md` explains the gaps) |

**Two counters, and they are NOT the same number** (Max, 8 Aug 2026, after this confused him and, before him, the v115 audit):

- the **batch number** in a handover's filename increments once per batch, always;
- the **deploy version** (`sw.js` `CACHE`, the six cache spots) increments only when a batch ships a client asset.

Four docs-only batches in a row left them three apart, so `HANDOVER-v122` shipped `ezplate-v119`.
**New handovers drop the `v`: `HANDOVER-123-short-name.md`.** The `v` is what implied "app version"; a bare batch number does not.
Existing `HANDOVER-vNN.md` files keep their names - they are write-once, and renaming them would rewrite the record to fix a label.
**Every handover states the deploy version it shipped, or says it shipped none.**
**`docs/audits/AUDIT-vNN.md` KEEPS its `v` and is correct as-is** - an audit really is keyed to the deploy version, because the `/batch` counter compares it against `sw.js`. Do not "make it consistent" with the handovers; they are numbering two different things on purpose.
| Version bumps, handovers, running the checks | `skills/` - invoke them |
| Current state | git, the repo, the Supabase MCP. Not this file. |

Global working preferences live in `~/.claude/AGENTS.md` and are not repeated here.
This file wins wherever the two disagree.

## ⚠️ THE REPOSITORY IS PUBLIC (13 Aug 2026). NOTHING SECRET MAY EVER BE COMMITTED.

Every file, every branch and **the entire git history** is world-readable, and a commit that leaks a secret is not fixable by deleting it later - scanning bots archive public repos within minutes, and a fork survives the repo going private again.
**So the only safe rule for anything NEW is: it never goes in.** API keys stay in Vercel env vars, as the `api/` section already requires.
**No credentials were exposed** - checked before the switch: no `.env` ever committed, `.mcp.json` carries project refs and no token, and the `service_role` matches are all `GRANT` statements.

⚠️ **WHAT IS PUBLIC THAT IS NOT A CREDENTIAL - and this list was WRONG when it was first written, which is the point of writing it out.**
The pre-switch check looked for secrets and declared the repo clean. **It never looked for real-world business data, and there is some.** Caught by the pre-push review AFTER the switch, not before it.

- **Scoopy's real food distributor is identifiable.** `Bidfood` appears in **26 tracked files**, including the real letterhead string `BIDFOOD SUNSHINE COAST a division of` in `js/app.js`, and handovers and tests that say outright they were *"proved against his four real Bidfood PDFs"*.
  ⚠️ **Two of those files were ALREADY public and the rest were not** - Vercel serves `js/app.js` and `css/style.css`, so the parser comments were world-readable before any of this; the ~20 test files, `docs/PHONE.md` and the handovers are newly so.
- **`tests/fixtures/base-products.json`** - 393 real products with real unit costs. **Supplier names are absent from THIS FILE**, which is what made the first check answer "no supplier names". That was true of the fixture and false of the repo, and stating a narrow grep as a broad conclusion is the whole mistake.
- **Every commit carries Max's real name and personal Gmail** - 512 of them, permanently. Not fixable without a history rewrite. Set GitHub's *Keep my email address private* for future commits.
- **The Supabase anon key**, which was already public because it ships in `index.html`. **Rotating it achieves nothing while it ships in the page.** The real fix is the auth item's one-function change closing the anon fallback.

**The transferable rule: a check that finds nothing has only proved something about WHAT IT LOOKED FOR.** "No secrets" is not "safe to publish", and this file said the second on the strength of the first.

✅ **GitHub secret scanning AND push protection are ON** (enabled 13 Aug 2026, free on a public repo). Push protection is the useful half: it **rejects the push** rather than telling you afterwards, which is the only timing that helps when a leak cannot be undone.
**It is a backstop, not the rule** - it knows vendor key formats and knows nothing about a café's invoices or a supplier's name, which is exactly the class this repo actually leaked. Do not let a green push mean the diff was checked.
*(Dependabot alerts are also free and remain OFF - deliberately unaddressed rather than forgotten: `pdf.js` loads from a CDN and would be invisible to it, and this repo's standing rule is no new dependencies.)*

**Process docs live in `docs/` because Vercel serves the repo root**, so anything left there is publicly fetchable.
⚠️ **That was a PRIVACY reason and it no longer is one** - the docs are world-readable on GitHub whatever `.vercelignore` says. The rule stands for a different reason: keeping non-user-facing files off the deployed origin. **Do not delete it, and do not trust it to hide anything.**
`CLAUDE.md` is the exception and stays at root - it is only auto-loaded from the project root, so moving it would silently stop it loading.
`.vercelignore` keeps it, and everything else non-user-facing, off the origin.
**Anything new that is process rather than product goes in `docs/`.**

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

## A column DEFAULT does not survive the restore

`restore_backup` inserts five tables as `insert into <t> select * from jsonb_populate_recordset(null::<t>, …)` — **no column list**.
`jsonb_populate_recordset` yields the table's whole column list, and **an absent JSON key becomes an EXPLICIT NULL, which OVERRIDES a column DEFAULT rather than falling back to it.**
That migration says so at its own site, which is why every one of those inserts is followed by an `update … where <col> is null` backfill.

**So adding a column with a DEFAULT to `ingredients`, `menus`, `plates`, `menu_items` or `supplier_phrases` gives you the default everywhere EXCEPT after a restore**, where every row lands null — and the restore still returns success with the right row counts.
The three other restore paths (`ing_price_history`, `menu_change_log`, `app_settings`) name their columns and are safe.

**Measured, not reasoned** (13 Aug 2026, staging, on Max's real 412-product export): with the `set_business_id` trigger dropped from `ingredients` only, all 412 restored products came back null while `plates` came back correct.

**The remedy that cannot be forgotten is a `BEFORE INSERT` trigger**, not a fix to the five inserts — because the next batch to rewrite `restore_backup` would have to remember the fix again. `set_default_business_id` + ten `set_business_id` triggers is the working example.
⚠️ **The general law is wider than one column:** any DEFAULT you add to those five tables is a claim that holds on every path except the one that runs after a disaster, which is the path nobody exercises.

### The other half: a DEFAULT is applied BEFORE the trigger, so the two must say the SAME thing

(Measured 13 Aug 2026, staging, batch 182 — and it is the mirror image of everything above, on the path that runs every day.)

A DEFAULT fires when the column is **ABSENT from the INSERT**, which is what every client write does. So by the time a `BEFORE` trigger runs, the column is already **non-NULL**, and a trigger written as *"fill it if it is null"* **correctly does nothing on the normal path**. It only ever fires on the restore, where the key is present and explicitly NULL.

That is harmless while the two agree and silent when they do not. `business_id` carried `default '<the legacy café>'::uuid` and a trigger that filled nulls with *the caller's tenant*; the moment a tenant-scoped `with check` existed, **every café except the seeded one could READ its rows and could not WRITE any** — `42501` on its own insert. Nothing in SQL catches it: the column is populated, the trigger is present, and a single-tenant database behaves perfectly. **It appears only as a SECOND tenant**, which is why it was invisible until staging had one.

**So: a DEFAULT and a BEFORE trigger on the same column are ONE mechanism with two entry points, and they must compute the same value.** Point both at the same function — `set default public.current_business_id()`, `new.x := public.current_business_id()` — rather than leaving one a literal. Two definitions of the same thing is the defect; which one is "right" is not the question.

## "Fail open" is what you do with NO information — reusing it as the answer to a RECHECK reopens the hole

(Batch 185, 14 Aug 2026, the non-member boot gate. Caught by the pre-push review, after the fix for one half of it created the other half.)

A guard that refuses on a definite answer and proceeds on anything else is usually right the FIRST time it runs: with nothing known, a false alarm is worse than a miss, and here it would have locked a legitimate user out of a working app.
**It is wrong the SECOND time, and the wrongness is invisible, because the same expression is still sitting there reading correctly.**
Once the server has already said *"this caller has no café"*, `could not tell` is **not evidence to the contrary** — but a two-valued gate has nowhere to put that, so it lands on the permissive branch and DISCARDS the known state.

The measured shape: from the standing gate, the `online` listener re-runs `bootstrapSync`; the tenant lookup alone fails, one flaky request out of twelve; the check falls open; **the four required reads still succeed with `[]`, because RLS filters rows rather than erroring**, so nothing throws, every store is emptied and the success path hides the gate.
A silent empty app, reached by a network blip, on the exact path the guard was hardened for.

**The remedy is a THIRD value.** `ok` / `nomember` / **`unknown`**, resolved by the caller against what it already knows: only a definite answer may change the standing verdict, and "could not tell" changes nothing in either direction.
**The tell to recognise: a boolean guard whose two branches are "definitely bad" and "everything else".** Ask what it should do when it is asked a second time, by a caller that already has an answer — and if the honest reply is "keep what I had", the guard needs the third value, not a better default.
This is the same family as the empty-read ambiguity above: **a successful-but-empty read, an RLS-blocked read and a failed read are three different things that arrive looking like two.**

**And the counterweight, or the rule above becomes a tax on every unknown** (batch 186, the sign-in gate). A second unreadable answer landed one line away from the first — `getSession` failing while the tenant lookup succeeded — and it is deliberately collapsed to two values, which is not an inconsistency.
**The question to ask is not "are there three states" but "does either branch do something I cannot take back?"** The tenant answer decides whether the app is USABLE, so guessing it wrongly locks someone out or shows them an empty café: three values, and the caller resolves the third. The session answer decides only **which of two screens explains a refusal that has already been decided** — a sign-in form or a "your account has no café" message — and both are recoverable in one tap, so the safer of the two is simply chosen and the third value would be ceremony.
**So: a fail-open default is a decision about CONSEQUENCE, not about epistemics.** Two unknowns in the same function can honestly default in opposite directions, and the comment at each site has to say which consequence it was weighing — otherwise the next reader "fixes" the inconsistency.

## A FOREIGN KEY is checked with RLS OFF, so a cross-tenant reference SUCCEEDS instead of erroring

(Batch 184, 13 Aug 2026, removing the `MENU_ORIGINAL` literal.)

**Postgres validates a foreign key as the constraint's owner, not as the caller, and RLS is not applied to that check.** So a row whose FK column points at ANOTHER tenant's row is accepted. The write returns success. The referenced row is then unreadable to the writer, because the ordinary `select` policy *does* apply.

`menu_items.menu_id → menus(id)`, and `menuToRow` used to write `menu_id:(item.menuId||'MENU_ORIGINAL')` — a literal naming a `menus` row **only Scoopy's has**. The obvious reading is that a second café gets `23503`, and before 182 that is exactly what happened. After 182's tenant policies it is worse: the café that has no such row still passes the FK check against Scoopy's, saves cleanly, and the dish renders **on no menu at all, forever, with no error anywhere.** An error would have been the good outcome.

**The transferable rule: a foreign key does NOT confine a reference to your own tenant, and it is easy to assume it does** because every other operation on that table is scoped. If a column can be written with a value the caller did not read from its own rows — a literal, a default, an id from an imported file — then **only the application can guarantee the target is yours.** The restore path is the standing example of the import case.
**The symptom to recognise: a row that saved without error and is invisible.** Reach for this before assuming a render bug.

## A policy that RESTRICTS and a policy that GRANTS differ by one word and read identically

(Batch 187, 14 Aug 2026, owner-vs-staff.)

**Postgres ORs permissive policies together and ANDs restrictive ones in.** Every table here already carries a permissive `for all` tenant policy from 182, so a new policy meant to take something AWAY must say `as restrictive` — and `as permissive` is the DEFAULT, so the word is omitted far more naturally than it is written.

```sql
create policy "plates owner-only delete" on public.plates
  as restrictive for delete using (current_business_role() = 'owner');   -- takes away
create policy "plates owner-only delete" on public.plates
  for delete using (current_business_role() = 'owner');                  -- takes away NOTHING
```

The second is OR'd with the tenant policy, which already permits the delete, so **staff can delete plates again, the SQL still says `owner`, no error is raised anywhere and the policy list still shows a policy with the right name.** Dropping two words silently repeals the rule while leaving every trace of it in place.

**The tell: a policy whose NAME says what someone may not do.** Read its first line, not its condition — a restriction that is not `as restrictive` is decoration. `tests/roles.test.js` pins all four, and the mutation was run: flipping one to `permissive` turns it red.

**⚠️ AND THE ONE THAT ACTUALLY SHIPPED PAST THE FIRST DRAFT: a restriction keyed to a VALUE must cover every command that can change that value, INCLUDING DELETE.**
The other three restrictions here name a command on a table — "staff may not delete a plate" — so the policy is the whole of it. The fourth names a *value*: `key = 'food_cost_target'` in a shared settings table. `dbSetSetting` upserts, so the frame was "an upsert has two halves", INSERT and UPDATE were both covered, and a test asserting exactly that passed.
**DELETE is not part of an upsert, so it never entered the frame.** A staff account could delete the row outright — measured, not reasoned: HTTP 200, row returned, target gone — and the client then boots on its hardcoded default with nothing raised anywhere, which moves every suggested price and every good/bad colour in the app. Caught by the pre-push review.
**The transferable question is "what are ALL the ways this value can stop being what the owner set", not "which commands does my client use".** A client that only ever upserts is not a bound on what a caller can send; the whole point of the policy is the caller you did not write. Enumerate the commands in the test, so the next one cannot be missed by having a smaller frame.

**Two corollaries that cost as much and are less obvious:**
- **`as restrictive for all` is not "restrict everything", it is "require this to READ".** On a tenant table that means staff open the app to an empty café. Name the command.
- **NULL refuses.** `current_business_role() = 'owner'` is NULL for a caller with no membership, and a policy evaluating to NULL denies — which is what you want on the server, and is the exact OPPOSITE of the client-side rule two sections up. **The server refuses when it cannot establish permission; the client must not lock anyone out when it cannot tell.** Same expression shape, opposite correct default, because the consequences are not symmetrical.
  In PL/pgSQL the same NULL is a trap rather than a help: `if role <> 'owner' then raise` never fires for a NULL role, so a guard written that way lets exactly the caller it was written for straight through. Use `is distinct from`.

## A PRIMARY KEY's column list is a contract with every `ON CONFLICT` that names it — and with the client that names none

(Batch 183, 13 Aug 2026, widening `app_settings` to `(business_id, key)` and `supplier_phrases` to `(business_id, id)`.)

**Postgres resolves an `on conflict (cols)` arbiter at RUNTIME, not when the function is created.** So changing a primary key leaves every `on conflict` naming the old columns syntactically fine, stored happily, and **42P10 the first time it runs** — "there is no unique or exclusion constraint matching the ON CONFLICT specification".
`restore_backup` carried exactly one such clause. **A migration that widens a key and does not replace that function applies GREEN and breaks disaster recovery**, which is the path nobody exercises until they need it most. The two are one change; 183 does them in one transaction, function first, so no intermediate state names a dead arbiter.

**The client half is the opposite shape and is easier to break by being helpful.** `dbSetSetting` and `dbPushSupplierPhrase` name **no** conflict target, and that silence is what makes them correct: **PostgREST derives an upsert's `ON CONFLICT` from the table's PRIMARY KEY**, so the write resolves against the caller's own row and the server stays the only thing that decides the tenant.
Adding `onConflict:'key'` "for clarity" re-globalises the key and puts the whole defect back — a second café's first save of a food cost target refused **42501 on the USING expression**, permanently, with no workaround. Both call sites say so; `tests/semantic-keys.test.js` pins it.

**The general law: a key's width is depended on in three places that never mention each other** — the SQL that names it, the client that deliberately does not, and the schema mirror in `supabase/staging/01-schema.sql`. Change one and grep for all three.

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

The one that bites while AUTHORING A MIGRATION (there is no client code to edit - every `.delete()` in `js/app.js` is `.eq()`-scoped; the `where true` lines are SQL): **`safeupdate` rejects any WHERE-less `DELETE` or `UPDATE`** for `authenticator` but not for `postgres`.
So **the `where true` on the restore's deletes is load-bearing** - it looks like a no-op and is not.
Do not tidy it away.

Also: **an anon UPDATE or DELETE returns 204 with NO error** and touches nothing.
A caller checking only for an error would believe it had written.

## Three foreign keys between the DATA tables, and only one can ever error

⚠️ **This heading said "Three foreign keys" until 13 Aug 2026, and the live count is now FIFTEEN** (batch 181 added `business_id → businesses` on all ten public tables, plus two on `business_members`).
**The three below are still the only ones that constrain the app**, which is why the section is scoped rather than rewritten: the ten tenant FKs can only raise if someone deletes a `businesses` row, and nothing does.
Counted against the live catalogue, not inferred - and the count is stated because a reader who greps and finds fifteen needs to know which three this section means.

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

**The Dashboard's KPI figures carry the same anchoring** - at or under target is good, over is bad - so the strip, the chart, the sparklines and the Menu rows can never disagree.
**Colour on a headline figure is a target reading, not a delta.** (Max, 10 Aug 2026.)
This is also why a "vs last month" delta keeps being the wrong answer to "what does this colour mean": it has now been declined three times (deleted in v98, declined 9 Aug 2026, declined again 10 Aug 2026 as the mechanism a colour-free KPI would have needed).

## `addProduct` is dead in the app and DELIBERATELY KEPT

The `fresh-states` Playwright specs have no other handle on the pid-line shape, and Playwright is not in `npm test` - so deleting it fails **silently**.

## A stub that mirrors a real function must mirror its CONTRACT - so extract the real function instead

A test that re-implements a shipped function in order to test around it **passes against the very defect it was written to catch**, because the stub is written from the same wrong belief as the code.

**The remedy is always the same and is already proven here: extract and call the REAL function** (`tests/_extract.js` exists for this), rather than hand-rolling a copy that agrees with you.

**TWENTY incidents, one remedy.** (Was "four" until 12 Aug 2026, then "seven" via AUDIT-v156, then twelve after 180 reconciled the lists, fourteen after 182 added two of its own, sixteen after 183 added two more, eighteen after 184, **nineteen after 188 — which added its entry to the list below and left this number reading eighteen, so the header undercounted its own roster for two batches** — and twenty after 190.  `docs/QUEUE.md` separately claimed "ten across 165-176". **All three were wrong and the two lists were counting different things**, which is why 180 reconciled them against the handovers themselves and left ONE roster. Seven of the twelve fall in batches 165-176; the queue's "ten" for that window could not be sourced from any handover.)

- **v113** - a passthrough stub hid a real escaping bug.
- **139** - a stub hid `showTab(undefined)`, because it asserted DOM counts rather than the contract.
- **140** - a stub mirrored `fmtTargetPct` wrongly and hid a `30%%`.
- **141** - a hand-rolled `esc` was missing `>`; the fix was to use the app's own `esc`, which is what v113 had already concluded.
- **162** - an assertion searched a job block for a filename it had extracted from that same block a line earlier, so the `||` chain ended in a tautology. **In the test file written to police this class.**
- **167 (a)** - an order-only assertion stayed green against an INVERTED guard: it matched three substrings and checked their left-to-right order, which flipping the condition does not disturb.
- **167 (b)** - an assertion looked for a fragment at the END of a handler's source, and there is always code after it, so it passed whatever the branch did.
- **172** - a test pinning an ordering scanned `js/app.js` only, because `loadApp()` does, so it could never have failed on the case it named (the resolver runs in `index.html`).
- **173** - the counter in `uid` was masked by real `crypto`: freezing `_uidSeq` at a constant left all five uniqueness tests green, because 41 bits of entropy hide a broken counter at those sample sizes.
- **174** - `S.purges` was read but never incremented, so the line asserting it could not fail.
- **175** - a spec wrapped its comparison in `if (rows.mk.length)` while `boot()` never seeded the data, so the loop never ran. **Caught by the pre-push review, not by the batch.**
- **176** - a truncation test went vacuous when the fix removed the pressure its own precondition assumed.
- **182 (a)** - an assertion built its regex around a table NAME (`create policy…'ing_price_history'…for all`) where the SQL builds the statement from a loop VARIABLE, so it matched nothing and passed whatever the policy said. Turning three append-only logs into `for all` sailed through it.
- **182 (b)** - an ordering test compared ONE named create against ONE named drop, and survived a DIFFERENT drop being moved above the creates. The invariant was "every create before every drop"; the test pinned one pair of it.

- **183 (a)** - a SQL assertion inside a migration searched the deployed function body for a forbidden `on conflict` spelling. **`pg_get_functiondef` returns the body's COMMENTS**, and the comment above that very statement quoted both spellings in prose - so the negative half fired on its own explanation, and **the POSITIVE half would have passed on the prose alone, green whatever the statement said.** The fix is to strip `--` comments before searching. ⚠️ **Generalise it: any assertion that greps a function body, a source file or a diff is searching PROSE as well as CODE, and the prose is usually written by the same person, in the same hour, saying the same words.**
- **183 (b)** - a test pinned `memKey` with a SUBSTRING match, so gluing a tenant onto either end left the substring intact and the test green - which is the exact change it existed to forbid. Caught by mutating it; fixed by comparing the whole normalised body.

- **184 (a)** - a retry test proved the in-flight memo was cleared, and pinned only ONE of the two settle paths. It resolved the write with `{error}`, which is the FULFILLED handler - **supabase-js resolves with `{error}` rather than rejecting** - so deleting the clear from the REJECTION arm left it green, and a network throw would have wedged the button until reload. ⚠️ **Generalise it: a promise has two settle paths and a test that only takes the common one has pinned half a contract.** In this codebase the uncommon path is the one that fires when the café has no signal.
- **184 (b)** - the `menu_items` row-boundary round trip used a fixture where `plateId` and `sourcePlateId` held the **SAME value**, so `(item.plateId||item.sourcePlateId)` could not be told apart from either half alone: flipping the `||` to `&&` - which drops the plate link on every dish written since v55, the exact 76-of-77 failure - left the test green. ⚠️ **Generalise it, because this one is not about tests at all: A FIXTURE WHOSE FIELDS AGREE CANNOT TELL YOU WHICH ONE THE CODE READ.** Any fallback chain, precedence rule or mirrored pair needs a fixture where the candidates DIFFER, or the assertion is measuring a coincidence. Found by the mutation gate the day `menuToRow` was first added to it.

- **188** - a spec proving a re-sync had happened asserted `__rpcCalls > 1`, a counter the Playwright shim bumps on every `rpc()` call, with the comment *"the re-sync must actually have run, or this test proves nothing"*. **Boot issued ONE rpc when that was written.** 188 added a second (`current_business_role`) to the same `Promise.all`, so the first boot alone reached 2 and the assertion could never fail again - in the spec written to pin 185's silent-empty-app defect, the worst one this repo has had. ⚠️ **Generalise it, because NOTHING in the changed file was a test: A COUNTER IN A SHARED FIXTURE IS COUPLED TO EVERY FUTURE CALLER, so adding an unrelated call to the harness can silently retire an assertion in a spec you never opened.** The remedy is to make the counter count the THING ITS READER MEANS - here, "how many times was the TENANT asked" - rather than "how many times was this function entered". **The tell: a test asserting `> N` on a number some other file produces.** Grep the counter's writers before adding one, not just its readers.

- **190** - a Playwright assertion checked that the onboarding link was **not** the browser's default blue, `rgb(0,0,238)`. Four cases: two homes x two themes. Deleting the CSS rule turned three of them red and left the **dark** one green, because Chromium picks a *lighter* default link colour under a dark `color-scheme` and the constant named only the light one. ⚠️ **Generalise it: A DENYLIST ASSERTION IS WEAKER THAN AN EQUALITY ONE, AND THE GAP IS INVISIBLE UNTIL THE ENVIRONMENT VARIES.** "Not the wrong value" is a guess about every wrong value there could be; "is the right value" is a fact about this app. **The tell: `not.toBe`, `assert.notStrictEqual`, `doesNotMatch` carrying a test's whole meaning.** Keep the negative for the failure message if it names the defect well, but put the weight on the positive. Found by the hand-run mutation, in a spec written that hour by someone who had just read this roster.

**Both 182s, both 183s, both 184s AND 190 were caught BEFORE merge, by running the mutation** - which is the point of recording them rather than quietly fixing them. They were written in the same hour as the paragraph above telling you to do exactly that, by someone who believed the tests were sound. **The count is 20 and the belief is never the check.**
**190 is also the one that argues hardest for running the mutation on a NEW test rather than only on changed app code**: nothing was broken, nothing was legacy, and the weak assertion was three minutes old. `npm run mutate` could not have found it either - the gap was in a Playwright spec, which the gate does not run.
**184 is also the first pair the MECHANISED gate found rather than a hand-run mutation** - 184(b) was a test that had been green and unable to fail since v55, and it surfaced within seconds of `menuToRow` being added to `tests/mutation/targets.js`. **The lesson is about the LIST, not the gate: a function that is not a target has never been asked the question.** Adding one is two lines.

**Most of these are a WIDER failure than a stub**, and that is the point of recording them here: 141 and before were copies that disagreed with the real function; 162, 167, 172, 173, 174, 175 and 176 were tests whose assertion **never executed, or could not distinguish right from wrong**. Same green, same false assurance, and no stub involved.
**So the check is not "did I hand-roll a copy" but "would this test FAIL if I broke the thing it names?"** Answer it by breaking the thing and watching it go red - the only proof that costs one minute and settles it.

⚠️ **And when you run that check by hand, BACK THE FILE UP BY COPYING IT, never with `git checkout --`.** (13 Aug 2026, batch 182.) `git checkout -- <tracked> <untracked>` restores **NOTHING** - one pathspec git does not know aborts the whole command - so a new file being mutation-tested is never put back, and if the loop is quiet about it the mutations **ACCUMULATE**. Two files were silently corrupted that way, and the run's own results were confounded: every "red" after the first was red for the wrong reason. `cp` to a scratch path and `cp` back. **A mutation harness that cannot restore is worse than no harness, because it reports green results you then believe.**

⚠️ **And ASSERT THAT THE MUTATION CHANGED THE FILE, every time** (184). A hand-written `perl -0pi -e "s/…/…/"` whose pattern does not match edits nothing, the suite is green because the code is untouched, and the harness reports **SURVIVED** - so you go and write a test for a defect that was never there. It happened twice in one batch, both times on a multi-line pattern with curly quotes in it. `diff -q` the file against the backup before running the suite, and treat "no difference" as a broken mutation rather than a result. The direction is at least safe - a no-op can only ever read as a false ALARM, never as a false green - but a harness that cries wolf is one you stop believing, which costs you the real survivors.

**Since 180 that check is MECHANISED for the code most likely to need it: `npm run mutate`.** It flips one operator (or deletes one call) in a listed function of `js/app.js`, runs ONLY the test files that claim to pin it, and reports any mutant that survived. `tests/mutation/targets.js` holds the list and the allowances; `.githooks/pre-push` runs the changed-scope version alongside `npm test`.
**It is not a substitute for the reasoning above and it is deliberately not repo-wide** - it cannot see a wrong premise, a backwards comment or a control that does nothing, which is what the `code-review` agent is for. What it removes is the excuse: the answer to "would this fail?" is now one command for anything on that list.

**If a stub is genuinely unavoidable, assert the stub against the real function first** - one test that they agree - so the copy cannot drift silently.
This is the same family as **"a test that records call ORDER passes against the broken code"** above and as `addProduct`: the failure is never a red test, it is a green one.

## A `@media` block does not win by being later

**Specificity is compared BEFORE source order**, so a multi-class selector written outside a media query beats a single-class rule written inside one.
Putting the narrow selector on the small screen and the plain one on the large screen inverts the cascade, and **the symptom is a rule that looks right in the file and does nothing on screen** - which is why this is never caught by reading, only by measuring.

**When a declaration appears at both breakpoints, give the two rules the SAME specificity.**

**Five instances in ONE screen in ONE batch** (F3/v139) - a cell thrown into the wrong column on broken rows; desktop `—` placeholders losing to a mobile `.is-nil` rule and rendering blank; a dead grid row under every healthy mobile name; a column headed "Used in" reading ", in —" on every row because the desktop cancel of a mobile `::before` could never win; and a header right-alignment keyed off one class of button.
Three were found by looking at the app and two by the review - **and the fourth was written INTO the fix for the third**, which is what makes this a rule and not a lesson.
F2/v138 hit the same class twice more, as `[hidden]` overrides: a single-class rule beats the UA's `[hidden]`, so an element told to hide stays visible.

**The `[hidden]` corollary is a DIFFERENT mechanism with the same symptom, and the specificity advice above does not fix it.**
An author rule beats the UA's `[hidden]{display:none}` because **author origin wins over UA origin, and origin is decided BEFORE specificity is even compared** - so `.thing{display:block}` overrides it no matter how the selectors measure. Matching specificity therefore achieves nothing here.
**The remedy is a selector guard, `.thing:not([hidden])`**, which stops the rule matching a hidden element at all. It is used on **ten** rules in `css/style.css` - `#builderPage`, `.bld-pill`, `.inv-step`, `.ms-clear`, `.plib-controls`, `.plib-x`, `.plib-note`, `.mnu-pct` (twice) and `.mnu-band` - each after a renderer's hide was silently ignored and an element sat visible.
(Was "twice, `.plib-controls` and `.plib-note`" until 12 Aug 2026; corrected by AUDIT-v156. **The count is the point**: at two it reads as a curiosity worth remembering, at ten it is an app-wide idiom, and a new `display` rule on a JS-hidden element needs the guard by default rather than on recall.)
**So: any `display` rule on an element the JS hides with `hidden` needs the guard.**

## A CSS syntax error is SILENT, and it discards every rule after it

(Max's yes, 12 Aug 2026, after it cost batch 176 a full diagnose cycle.)

An edit inserted comment text **without its opening `/*`**.
The browser did exactly what the spec requires - discarded the malformed rule **and every rule after it** until it could resynchronise - so `.wrap{max-width:1200px}` and its followers were simply absent.

**There is no build step and nothing in this project parses `css/style.css`**, so this class of mistake has no way to surface on its own.
`npm test` was green, `node -c` was clean, the page rendered, and **the only symptom was one measurement coming back wrong.**
It was found by dumping which `.wrap` rules the CSSOM actually contained and seeing that the new one was not there at all.

**So a layout that measures wrong is not always a specificity problem - check the rule EXISTS before reasoning about why it loses.** That is the diagnostic order, and getting it backwards is what cost the cycle.
`tests/css-syntax.test.js` is the guard: it checks the comments and braces balance, which are the two failures that can silently swallow rules. It is deliberately structural rather than a real parser, because no dependency may be added here.

## A viewport-geometry assertion must MEASURE its reference, never name it

**When a Playwright assertion depends on the width of the viewport - anything centred, anything positioned by percentage, anything compared against "the whole screen" - measure the fixed-position containing block with a `position:fixed;left:0;right:0` probe.**
Never `window.innerWidth`, never `document.documentElement.clientWidth`.

On the Linux CI runner all three disagree: the containing block is **370 inside a 380 viewport and 759 inside 768**, while `innerWidth` and `clientWidth` agree with each other and are both wrong.
Anything resolved against the block - `left:50%` and friends - is then off by half the difference, so the assertion **passes on macOS, where overlay scrollbars make the three agree, and fails only in CI.**
Two fixes written from theory without measuring were both wrong; instrumenting the assertion to print its own geometry settled it in one run.

**Scope, stated honestly:** the measurement is one runner and one browser, so read this as a rule about **how to obtain the reference**, not as a claim that the three values differ everywhere.
The probe is correct wherever they agree too, which is why it is the default rather than a CI workaround.

**The corollary bit twice in the same batch and is a separate trap:** `.bottomnav` measures **370 wide at a 380 viewport**, so discriminating "left rail vs bottom tab bar" by comparing its width against the viewport misfires.
**Discriminate on ORIENTATION** - a left rail is taller than it is wide.

Worked example and comment: `tests/visual/v141-sync-corner.spec.js` (which states the 370/380 and 759/768 figures at the probe).
The `.bottomnav` number is recorded in `docs/handovers/HANDOVER-150-sync-corner.md`, not in the spec - cited separately because a reader sent to the spec for it will not find it.

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
  **The one standing exception is the plate draft** (`cafeDB_plateDraft`), which is authored content and not a preference: it is the in-progress builder plate, held so an interrupted user can resume, and it is deliberately NOT a third category - it is unsaved work on its way to Supabase, deleted by `clearPlateDraft` the moment it lands or stops being dirty.
  **A `localStorage.getItem('...')` grep MISSES it**, because every use goes through the `DRAFTKEY` constant - which is why two audits in a row rediscovered it as an unexplained violation. Named here so the third one doesn't.
  ⚠️ **And it is NOT a special case - that framing was the actually misleading part, corrected 12 Aug 2026 by AUDIT-v156.** Measured against `js/app.js`: there are **thirteen** `cafe*` keys. A `getItem('...')` grep finds **six** of them and misses **seven**, for TWO different reasons:
  - **six go through a constant** - `ENV_STAMP_KEY`, `DRAFTKEY`, `KEY`, `AI_INV_KEY`, `AI_SUG_KEY`, `THEME_KEY`;
  - **one is never read at all** - `cafeDB_prodDensity` is a tombstone, only ever `removeItem`'d, so no read-side grep of any kind finds it.
  (This line previously said the grep "finds the other nine keys and MISSES this one". Wrong on both halves, and it implied the draft was the single exception when it is one of seven.)
  **So: grep the STRING `cafeDB_`/`cafeCost_`, never the call site** - that finds all thirteen, constants and tombstone included. No line number here on purpose; grep the name.
- Products come from the Supabase `ingredients` table and nowhere else.
  Custom ids are `CX*`.
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
**The `ensureDefaultMenu` GATE lives at its CALL SITE in `bootstrapSync`, not in the function** - the function seeds `'Original menu'` whenever the array it is handed is empty and must never guess (its own comment says so); the caller invokes it only when the `menus` table did not answer at all. A successful EMPTY read is the user having deleted everything and must be respected - an earlier version keyed off a localStorage signal that read false forever and resurrected "Original menu" on every boot. (Wording corrected 9 Aug 2026, Max's yes - the old sentence sent a batch to guard the wrong place.)

## No new dependencies, no build step, no scope creep

Client-side there is **no build step** - four hand-written files: `js/app.js` (all logic, one browser script), `css/style.css`, `index.html`, `sw.js`.

Two third-party scripts ship in production: `@supabase/supabase-js` in `index.html`, and `pdfjs-dist` loaded on demand by `ensurePdfjs()`.
Both run with full DOM access on a page holding the anon key and the café's pricing, so both must stay **pinned to an exact version** (never a floating `@2`) and **integrity-checked wherever the load mechanism allows** - the pdf.js *worker* is the one exception, pinned only, because `new Worker()` has no SRI.
Changing a version means recomputing its `sha384` in the same commit; a stale hash blocks the script outright.
**Adding a third needs Max's yes, not a judgement call.**

No analytics, no tracking.
**Implement what was agreed, nothing more.** If you spot extra work worth doing, write it down - don't build it.
**Where it goes is decided by the tier test in `docs/QUEUE.md`'s header, and the default is `docs/MAINTENANCE.md`.** The queue holds only work that would stop, embarrass or hurt a paying customer at launch. (Max, 11 Aug 2026, after the queue reached 979 lines and 47 open items with the launch blockers at the bottom.)

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

⚠️ **AND ON 14 AUG 2026 MAX SET A DATE ON IT WITHOUT NAMING ONE, which is why this paragraph now has teeth it did not have yesterday.**

**He chose SELF-SERVICE SIGNUP** - a stranger creates an account and names their own café, unattended - **reversing his own "a self-service sign-up form is still NO" call of the same day.** He was told in writing that it was a reversal, and told that it makes this gate urgent, and chose it anyway. So it is a decision, not an oversight, and it may not be re-litigated. (`docs/decisions/2026-08-14-cafe-creation.md`, question 1, answer B.)

**What that changes here: the trigger for this gate stops being hypothetical.** The moment self-service signup ships, a stranger's café exists, and *"before the first non-Scoopy's row exists, not after"* is this section's own wording. **So the signup work is ordered BEHIND this gate and behind pdf.js 4.2.67+**, and that ordering is a scheduling fact rather than a second decision - it lives as a `Do after:` on the queue item, per this file's own rule about where sequencing belongs.
**Do not read the reversal as permission to ship signup first.** He reversed which mechanism creates a café; he did not reverse this.

**He also chose CSV-ONLY for the catalogue importer** (same file, question 2, answer A), which is a decision about the no-new-dependencies rule rather than about privacy: an `.xlsx` is a ZIP of XML and cannot be read without a third third-party script. **So the importer accepts CSV and says so; adding XLSX is a fresh yes, not an enhancement.**

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
- **The builder is a FULL PAGE.** `#builderPage`, a child of the Plates library rather than a tab of its own: `openBuilder` hides the `#tab-*` panes and shows it, the Plates nav item stays lit, and any tab change leaves it.
  ⚠️ **There are NINE panes, not five** - this said "five" until 12 Aug 2026, when AUDIT-v156 counted them; F8, F9, F10 and 171 each added one. **Read the list from `TAB_PANES` in `js/app.js`, never from a count written down anywhere**, because a pane missing from that array renders UNDERNEATH the builder page - the code says so at its own site.
  **The whole history, because this line has been wrong in both directions and each time it cost a batch:** the builder was a modal from v54; Max confirmed that shape on 8 Aug 2026 against a recommendation to change it; Q6 (v125) shipped its redesign inside the modal; **he then reversed it on 9 Aug 2026**, and this file carried both facts at once until **F7 shipped the page as `ezplate-v146` on 11 Aug 2026.** A batch once spent itself hunting a conversion that had already shipped two years of versions earlier, which is why the record is written out rather than summarised.
  **Leaving the page is not a data risk and must not be "fixed" into one.** Tapping another tab hides it and keeps the plate in memory and in the draft - exactly what pressing × did while it was a modal - and `guardUnfinishedPlate` offers the work back at the next entry.
  **Publishing, printing, duplicating and deleting a plate all live on this page.** The v54 plate-action chooser (`#plateActionsModal`) is deleted and a Plates row opens the builder directly; F7 rehomed all four of its actions rather than dropping any (§R3).
  **A sentence here claiming the dropdown placement work is "UNBLOCKED" because "the positioning context is already final" was DELETED 10 Aug 2026** (Max's yes, AUDIT-v135): both halves were false the moment the reversal was taken.
  The scheduling it asserted lives on the queue item, which re-checks it every batch.
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
  An item **already in `docs/QUEUE.md` is approved** - Max said yes when he queued it, so `/batch` runs it without stopping.
  Re-asking there spends the only resource that is actually scarce.
- **Rollbacks happen.** If Max says the baseline is X, believe him - then verify it yourself and report discrepancies before working.
- **Keep commentary in the PR and the handover - never in user-visible app copy.**

## Migrations - Claude applies them (REVERSED 8 Aug 2026)

`list_migrations` is empty, so **the migration files plus their commit messages ARE the audit trail.** That has not changed and is why every migration is still a committed file with its reasoning in the header.

**What changed:** this section used to read *"let Max run it… never apply one yourself"*, and a pending migration was a stop condition that halted the loop.
**Max reversed it** (his words: *"i dont want you to stop for me to hand run a query"*), on the strength of staging existing.
**A migration is no longer a stop condition.** Write it, apply it, verify it, record it.

**The safeguards are not optional - the old rule's protection has to be replaced, not just deleted:**

- **Staging first, then production - AND STAGING IS NOW REAL. `docs/STAGING.md` is the procedure; follow it rather than this bullet.** Seven steps: write the migration with its one-statement rollback in the header · re-run `01-schema.sql` to re-mirror · load a seed · apply to staging · verify AS THE CLIENT over PostgREST · apply to production and record it in the header · diff the two schemas with the fingerprint query.
  ⚠️ **This bullet said the OPPOSITE until 12 Aug 2026** - *"staging is EMPTY, so there is still nothing to rehearse against… the schema has not been mirrored and no seeds exist… every migration is still UNREHEARSED"* - which stopped being true on **11 Aug 2026**, when batch 172 shipped the mirror, three seeds and that procedure as `ezplate-v152`. The stale text sat here for four days with the queue's next four A-items all migrations, and `docs/STAGING.md:5` had already said *"That warning is now spent."* **The clause carried its own expiry** - *"the safeguard becomes real when the queue's staging item RUNS"* - and the item ran; this is that sentence being honoured, not overridden.
  **CONFIRMED by Max, 12 Aug 2026**, when the correction was put to him with the option of reinstating the old caution: *"yes leave it"*. So the removal of "defer destructive ones" from THIS bullet is deliberate and agreed - it was a weaker duplicate of the standing destructive-work rule below, not a second protection. Do not restore it.
  (History kept because both prior corrections asked for it: marked unavailable 9 Aug 2026, Max's yes, after the v125 audit found this file presenting the safeguard as available; the "has never yet loaded" clause corrected 10 Aug 2026, Max's yes, per AUDIT-v135 D1.)
  ⚠️ **What staging still does NOT rehearse, and this half is unchanged:** the DATA is invented, so staging tells you a migration RUNS - never that it gives the right answer for Scoopy's. **Neither project has more than one user**, so `anon` is the only role either has been exercised as, and the multi-tenant policies are the first that will distinguish roles: staging can prove they run and let the right rows through, **not that a second tenant is excluded.** A rehearsal you over-trust is worse than none.
- **Order the statements so the dangerous intermediate state cannot exist**, rather than trusting the transaction alone to prevent it. Keep the transaction as well. (Worked example in `20260808_menus_rls.sql`: create the inert policy first, enable RLS second, so a failure between them leaves today's behaviour.)
- **Verify AS THE CLIENT, over PostgREST with the anon key.** The MCP and the SQL editor run as `postgres` and bypass RLS, so they cannot see a policy mistake - see "The client's role is not the MCP's role".
  On a write, send `Prefer: return=representation` and check a row came back: **a blocked anon write returns success and touches nothing**, so an empty response, not an error, is the failure signal.
- ⚠️ **A CLIENT CHANGE AND A MIGRATION ARE ONE CHANGE, AND THE ORDER BETWEEN THEM IS AN INTERMEDIATE STATE THE TRANSACTION CANNOT PROTECT** (batch 186). "Order the statements so the dangerous intermediate state cannot exist" is the same law one level up: between the migration landing and the deploy going out, the database is answering a client that has not shipped yet — and that window is minutes, not milliseconds, with a real person's phone in it.
  **Work out which order has the harmless intermediate, and it is usually the client first**, because a client written for both answers is cheap while a database that answers only the new way is not. 186's migration made `anon` resolve to no tenant; the new client reads that as "sign in", and the OLD client — still cached on a phone — read it as "you are signed in, but your account has no café", to somebody who was not signed in at all.
  **Say the order in the migration header and why**, because the file is the only artefact that outlives the batch. It also decides where the "applied to production" line gets written: after the merge, which is a second small docs-only commit and is worth it.
- **A migration whose failure mode is a LOCKOUT can refuse to run.** A `do $$ … raise exception … $$;` block ahead of the change, asserting the precondition that makes it survivable — 186 refuses to close the anon fallback unless a confirmed account already holds a membership — turns "I checked first" into something the file enforces every time it is ever run, including on a project nobody has measured. **Prove it FIRES** (staging, inside a block that removes the precondition and lets the raise unwind it) or it is one more assertion nobody has watched execute.
- **Know the one-statement rollback before you run it**, and say what it is in the file.
- **Record in the file's header that it was applied, when, by whom, and how it was verified.** With `list_migrations` empty, the file is the only place that can say so.
  ⚠️ **WRITE THAT RECORD WHEN IT HAPPENS, NEVER AHEAD OF IT** (batch 186, caught by the pre-push review). A header was drafted with the production application already written out — date, method, row counts — before a single statement had run there, and it read exactly like a verified fact because that is the form the rule above asks for. **A pre-written record is not a formatting slip; it is the audit trail lying**, and nothing downstream can tell the difference. If the application is deliberately deferred, say **that**, in the header, with the reason.
- **Anything that DELETES or REWRITES data is still Max's**, not because of who types it but because it is not reversible by a rollback statement. Destructive means data loss is possible if it is wrong - the restore's full-wipe step is the standing example.

## Deploy

GitHub `main` → Vercel auto-deploys → installed PWAs pick it up via the network-first service worker.
**Treat every merge to `main` as a production deploy.**

**Production is `https://scoopyscosting.vercel.app`** - the stable alias, and the only URL that answers without a login.
The per-deployment URLs from `gh api …/deployments` are auth-protected and 302 to Vercel SSO, so a `curl` against one proves nothing.
Fetch the alias, and check WHICH build answered before concluding anything from a device - **a branch push deploys a PREVIEW.**

## Independent review before merge

Max has no human reviewer, so this is the only second reader the code gets.

⚠️ **THE REPOSITORY WENT PUBLIC ON 13 AUG 2026 (Max's call, taken twice), AND THAT REVERSED THIS PARAGRAPH.**
It read: *"Nothing can actually BLOCK a merge. Branch protection and rulesets need GitHub Pro on a private repo - the API returns 403 - so 'mandatory' below is a convention you keep, not a mechanism that stops you."*
**Branch protection is FREE on a public repository.** The API now answers `404 Branch not protected` - "none is configured" - where it used to answer `403`. So the mechanism this file has always said was unavailable is now available and simply **not yet turned on**.
Until someone turns it on, the sentence above still describes reality: **"mandatory" is a convention you keep.** Do not read the unlock as the gate.
The reason it went public was GitHub blocking Actions on a billing cap; **Actions are unlimited and free on a public repo, measured at `billable_ms: 0` for an 8-minute run.**

**DECIDED, 8 Aug 2026 (Max): no second reader beyond the pre-push agent. CodeRabbit is NO and GitHub Pro is NO - do not re-propose either.**
Both were put to him with costs, records and a recommendation to take CodeRabbit; he declined both.
The option he chose was worded "the current pre-push review is enough", so this declines an ADDITIONAL reader and relaxes nothing below.
It also means the convention above is the whole mechanism, permanently - **the pre-push agent is the only thing standing between a mistake and production.**
On the day it was decided that agent caught a four-word change that would have silently discarded a plate's category edit, with the suite green and the change already driven in a browser.

- **The mutation gate - MECHANICAL.** It covers exactly one thing: a test that would still pass with the code it names broken. See Tier 1's twelve-incident roster for why that one thing earned automation.
  **It runs in TWO places and only the second one is a mechanism.** `.githooks/pre-push` runs `npm test` then `npm run mutate:changed`, and needs `git config core.hooksPath .githooks` once per clone - **so a fresh clone runs no gate at all and looks exactly like a clone that passed it.** That is why the `unit` CI job also runs the full `npm run mutate` unconditionally, where nothing has to be installed and nothing can be forgotten.
  The hook is the fast local copy; **CI is the one that actually holds.**
  **A survivor is not a suggestion.** Kill it with an assertion, or write the allowance and its reason into `tests/mutation/targets.js` - the gate fails on a survivor with neither, and equally on an allowance that is no longer needed.
  `git push --no-verify` bypasses it. **If you use it, say so in the handover** - an unexplained skip is the silence the gate replaced.
- **The `code-review` agent - MANDATORY. Runs BEFORE push**, adversarially, on the branch diff, after the suite is green.
  **Force it onto a DIFFERENT model from the one running the batch** - a model reviewing its own work is not a second reader - and **never show it the brief**: it judges whether the code is CORRECT, not whether it matches what was asked.
  It has the better record - four real defects on v114 alone, one of which would have broken every restore.
  It is not free: it spends the same Claude subscription capacity the workflow did, just far less of it - **~116k tokens** on the 8 Aug batch, against the workflow's ~$2.
  **Mandatory whenever the diff changes WHAT RUNS** - app code, tests, CI workflows, the harness.
  **Skip it only for pure prose**: handovers, queue entries, briefs.
  **The line is deliberately not code-versus-docs.** It was nearly written that way on 8 Aug, and the review of the batch that wrote it - a diff of nothing but YAML and Markdown - found a CI change that would have silently run the live-production-database spec in a job documented as hermetic.
  A rule that skipped "config and prose" would have shipped it.
  ⚠️ **IT IS NOT SKIPPABLE BY INSTRUCTION** (Max, 13 Aug 2026). **176 shipped to production with no second reader because its brief said to skip it** - in a codebase whose most common defect class is a test that cannot fail, that is the wrong trade, and a brief is the one input that has been wrong repeatedly.
  **If a brief, a plan or an item says to skip the review, run it anyway and record the conflict in the handover.** The only exception is the pure-prose line above: a docs-only change that ships no client asset.
- **`.github/workflows/code-review.yml` - ON DEMAND only.** It no longer fires on every PR: run it manually, or apply the **`deep-review`** label to a PR.
  **Don't paste the brief into the PR body** - that removes the only thing making it independent.
  **Why it was demoted (8 Aug 2026), recorded because this is the kind of thing that gets re-litigated:** across its whole life it ran 11 times, **5 were silent skips that did no work**, and the runs that did work found **ZERO bugs** - its 3 findings were two missing tests and a doc gap.
  It authenticates by OAuth against **Max's personal Claude subscription**, so it competes with his own coding sessions: roughly **$20 of capacity and ~15 minutes of waiting per batch.**

**⚠️ WHEN THE WORKFLOW DOES RUN, A GREEN CHECK HAS BEEN WRONG - and so has an ABSENT one.** Three ways, all indistinguishable from approval in the checks list:

1. **A skipped review used to report SUCCESS.** The action refuses to run when `code-review.yml` on the PR differs from the copy on `main` - otherwise a PR could rewrite its own reviewer.
   It used to **exit GREEN** on that refusal, posting nothing and saying why only in the job log.
   **Now caught automatically: a refusal FAILS the job.** A red X on a PR that touches the workflow file is that, not a finding.
2. **A review that ran and threw its findings away.** It completed cleanly, twice, and posted nothing, because nothing was configured to publish.
   `gh run rerun --debug` does NOT recover it.
   The fix is `track_progress: true` and `show_full_output: true`.
   **If a run goes quiet, check those two inputs are still on the workflow BEFORE paying for a re-run.**
3. **No run at all.** A GitHub Actions outage during v115 meant nothing fired - no red, no comment, no job.
   **An ABSENT check looks exactly like a passing one.** Confirm the run EXISTS before reading its silence as anything.

**⚠️ NEVER DISMISS A FINDING BECAUSE ITS STATED CAUSE IS WRONG.** A finding whose *mechanism* is wrong may still point at a real bug.
That has happened twice and both were worth acting on.
The finding and the explanation are separate claims - disprove the explanation and you have disproved nothing.
**Go and look at what it was pointing at.**

Every finding gets a decision Max can see: fixed, or explained as intentional, or noted as considered and skipped.
**Silence is not a pass.** Neither review overrides this file's rules or the tests.

### Where a finding gets fixed

**Fix it in the SAME branch, before merge.
A finding does NOT get its own PR unless it is wrong data or silent loss.** Everything else - a missing test, a stale comment, a nit, a real-but-not-urgent improvement - is written down and rides a later batch. **It goes in `docs/MAINTENANCE.md` unless it passes the queue's tier test**; a missing test, a stale comment and a nit are all C by construction.

**⚠️ And it does not become PR-worthy because the work is already written, because it is small, or because a commit needs re-landing.** Those are the three ways the rule gets rationalised around, and they are named here because the rule above did not stop the assistant that wrote it.
**If you catch yourself explaining why this particular small PR is different, stop and add it to the queue instead.**

**Why (Max, 6 Aug 2026):** one batch merged before its review was readable, so every finding afterwards needed a *new* PR, and each new PR drew its own review, which found its own smaller thing - severity decaying each round, cost not.
Six PRs and ten review runs from one mistake.
**The steady state is ONE batch, ONE PR, ONE review.** A docs-only PR is free, so moving something to the queue loses nothing.

## Which item runs before which belongs in the QUEUE, never here

**A claim that one piece of WORK should happen before another piece of WORK lives in `docs/QUEUE.md`, as a `Do after:` line.** The queue re-checks its ordering every batch through the step-1 sweep and deletes the line the moment it is satisfied; this file has no mechanism that can notice a scheduling claim going stale, so one rots here silently and is then trusted.

The evidence is a sentence that sat here after the decision that falsified it: *"the dropdown placement work is therefore UNBLOCKED - the positioning context is already final"*, both halves false from the day the builder reversal was taken, and nothing could catch it.
`Do after:` exists at all because the same rot in QUEUE prose left one item waiting two years of versions on a conversion that had already shipped.

⚠️ **This is NOT a ban on sequencing language, and reading it as one would contradict rules elsewhere in this file.** The distinction is what the sequence is about:

- **Which queue item runs before which** - "do the dropdowns after F10", "this gets cheaper once F8 lands" → **the queue.** It names items, it expires, and something checks it.
- **Standing procedure INSIDE one piece of work** - "staging first, then production", "order the statements so the dangerous intermediate state cannot exist", "push the plate, confirm it, then the dish" → **here.** It names no item, it never expires, and it is true every time the work is done.

If you cannot name the queue item, you are probably writing the second kind and it belongs here.

**And a note aimed at ONE FUTURE ITEM lives in that item's own body, in the imperative, ending "answer it here, do not route it onward."** Never in a general list with a pointer at the item. Moved here 11 Aug 2026 from the queue preamble, where it could not survive a queue reset.
The failure is specific and is not the same as a stale `Do after:`: a line saying *"decide this in F5"* sits in a section the F5 batch never opens, so F5 ships without answering it and the next audit finds the note pointing at a batch that has gone past. The tint-vs-hover note did it **four times** (V2 → F1 → F2 → F5), was wrong the last two, and the fifth re-point would have been wrong too - the collision it described had been deleted underneath it while nobody re-read the code. AUDIT-v135 C2 named the shape and it recurred **twice more in the same file after being named**.

**The worked example, because the boundary is where this gets decided wrongly:** the privacy gate above says to revisit the Gemini tier *before any multi-tenant customer's data flows through those endpoints.* That LOOKS like the first kind and is the second. It names no queue item, it never expires, and it binds **any** future endpoint that ships user data to a third-party model - so it is a standing precondition on a class of work, not "item A before item B", and it stays here.
Contrast the sentence this rule was written for: *"the dropdown placement work is therefore UNBLOCKED"* named specific work, was falsified by one decision, and nothing here could notice.

(Approved by Max 10 Aug 2026, taking the recommendation, with this narrower wording rather than the original "sequencing lives in the queue, **never** in `CLAUDE.md`" - which its own pre-push review found too broad, because Tier 3's Migrations section legitimately states standing sequencing.)

## Changing this file - the edit is YOURS to make (Max, 13 Aug 2026)

Everything above only changes when a **genuinely new, durable rule** is discovered.
**Standing authority: make the edit and report it in the handover.** Do not park it on a yes.
This covers `CLAUDE.md` in all three tiers, new rules, corrections, strikes, `docs/MAINTENANCE.md`, `docs/QUEUE.md` prose, the skills, and every other process file.

⚠️ **This section said "propose it to Max and get a yes - don't edit silently" until 13 Aug 2026.** It was reversed on evidence: 172 and 176 each parked a documentation change on his approval, and **176's proposed rule - the one about a CSS syntax error silently discarding every rule after it - sat unapplied while the thing it warned about had already cost a full diagnose cycle.** He has never once deviated from a recommendation on a documentation question.
**The asymmetry is the argument: a wrong edit is caught, because `project-audit` re-checks every documented claim against the code. A parked edit is caught by nothing.**

**Two things still need him, and only these:**

- **a change to a decision he made himself** - the naming inversion, per-publication counting, the builder-as-a-page reversal, the 12 Aug matching-edges call, the More-screen gear removal. Reversing his own call is his, however good the reason;
- **anything that would DELETE or REWRITE production data.** Unchanged, and it is a stop condition rather than a decision file.

Everything else - which implementation is cleaner, what a thing is called, how a test is structured, whether to split a batch, what goes in `docs/MAINTENANCE.md`, every word of every process doc - **decide it and write it down.**

Rules here exist because a mistake already happened once.

The test for any line: **would a competent model reading this repo get this wrong?** True but inferable is a deletion.
Version numbers, commit hashes, suite counts and descriptions of past batches belong to git, not here.
