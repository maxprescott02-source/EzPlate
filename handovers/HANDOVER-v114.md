# HANDOVER v114 — the menu change log

**Branch:** `feature/v114-menu-change-log` · off `origin/main` @ `16290ec` (the PR #55 merge, which landed
the code-review workflow). **Date:** 6 Aug 2026.
**Brief:** `~/Downloads/ezplate-opus-menu-change-log.md` — record what MAX did, as distinct from what the
suppliers did. Prerequisite for the COGS trend reframe; the chart itself is a separate batch and is
untouched here.

**Suite:** `npm test` **720 green** (680 → 720: +33 `change-log`, plus seven new `restore`/`settings`
cases) · jsdom smoke green · Playwright **94/94** · `node -c` clean on `js/app.js`, `sw.js` and all four
`api/*`.

**✅ BOTH MIGRATIONS ARE APPLIED** (6 Aug 2026, on Max's instruction — the brief said hand them over, he
asked for them to be run):

1. `20260806_menu_change_log.sql` — 11 columns, RLS on, SELECT+INSERT policies, `recorded_at desc`
   index, 0 rows.
2. `20260806_restore_backup_v3.sql` — `restore_backup(jsonb)` replaced. Verified `SECURITY INVOKER`,
   five deletes all carrying `where true`, accepts formats 2 and 3, `on conflict (id) do nothing`.

**Applied through the MCP as `postgres`, then verified as `anon` from a real browser** — because those
are different roles and hard rule 10 exists for exactly this. anon SELECT ok · anon INSERT **ok** (the
check a select cannot make) · anon UPDATE and DELETE both affect zero rows · `rpc('restore_backup',
{payload:{format:1}})` refused by name before any write. The verify row was cleaned up as `postgres`,
since anon has no DELETE policy — which is the design, not an oversight.

**Two things the application turned up that the migration file had wrong, both now corrected in it:**

- **The grant line narrows nothing.** This project grants ALL on new public tables by default, so anon
  holds UPDATE/DELETE/TRUNCATE on `menu_change_log` exactly as it does on `plates` and
  `ing_price_history`. The file claimed least privilege; **append-only rests on the RLS policies alone**.
- **The refusal is silent.** An anon UPDATE or DELETE returns **204 with no error** and touches nothing,
  because RLS filters rather than rejects. A caller checking only for an error would believe it had
  edited the log. Same 200-with-no-rows ambiguity that hid the v90 RLS fault for a day.

**The app was also safe to ship BEFORE the migrations ran**, and that was checked rather than assumed
while the table was still absent: booted against production Supabase (`python3 -m http.server 8899`,
real client, real data) — 412 products, 77 dishes, `changeLogSupported` false, no page errors. The boot
read IS the probe, exactly as `menuHistSupported` (v89) and `menuPriceHistSupported` (v90). That
ordering guarantee still matters: previews and production share one database, so any future schema
dependency has to degrade the same way.

---

## The enumeration — it came back different, in both directions

The brief guessed seven paths and warned that every previous enumeration in this project has differed.
It did again.

| # | Path | Function | Kind logged |
|---|---|---|---|
| 1 | Plate saved from the builder | `saveCurrentPlate` | `plate_created` / `plate_edited` |
| 2 | Ingredient re-pointed (Ingredients tab) | `saveKingModal` | `ingredient_repointed` |
| 3 | Same, via the unit-type confirm | `confirmGuardedRepoints` | `ingredient_repointed` |
| 4 | **Same, from inside the invoice import** | `applyInvoice` (`kingRepoints`) | `ingredient_repointed` |
| 5 | Ingredient deleted | `deleteKitchenIngredient` | `ingredient_deleted` |
| 6 | Sell price / menu changed | `saveMenuEdit` | `dish_price` / `dish_moved` |
| 7 | Plate published to a menu | `submitMenuItem` | `dish_added` / `dish_price` |
| 8 | Plate added from the Menu tab | `submitAddDish` | `dish_added` |
| 9 | **Unlinked row linked to a plate** | `linkDishToPlate` | `dish_linked` |
| 10 | Plate taken off one menu | `mmRemove`, `doDeleteMenuOnly` | `dish_removed` |
| 11 | Plate deleted with its dishes | `deletePlate`, `doDeleteEverything` | `plate_deleted` |
| 12 | Menu deleted | `doDeleteMenu` | `menu_deleted` |

**Rows 4 and 9 were not in the brief.** Row 4 matters most: a re-link inside an invoice import is the
same "swap to a cheaper product" decision the Ingredients tab makes, and it sits in the middle of the
one function whose every OTHER write is supplier drift. Row 9 is v113's own new path.

**Two of the brief's guesses turned out not to exist as paths.** "A line's product swapped" is not one —
a plate line stores `{kid, qty}`, so swapping the product happens at the *ingredient* (rows 2–4). "A
supplier or pack change that alters effective unit cost" is not one either: `cost_per_base_unit` is
stored, so a pack edit only moves cost when it moves the price, which puts it in the excluded set.

**`logHistory` is NOT the funnel, and this is the finding worth carrying forward.** It looked like the
obvious hook — `logAllMenuPrices` already rides it — but it fires on paths 1, 6, 7, 8, 9 and the invoice
and **not** on 2, 3, 5, 10, 11 or 12. So today an ingredient repoint, the cheapest real intervention in
the app, does not even put a point on the food-cost trend line. Flagged, **not fixed** (hard rule 5) —
the change log records `avgBefore`/`avgAfter` itself, so the information is not lost.

### What must NOT be logged, and why the condition is a function rather than a list

Supplier price movements. They are the thing being measured; if they wrote here, the "how long since you
last acted" clock would reset on every supplier rise — the precise event the drift counter exists to
accumulate. Self-defeating.

**Every product-price write in the app funnels through `setProduct` (v109), which is
`ing_price_history`'s sole writer.** That is the whole condition: if `setProduct` wrote it, it is drift.
Five paths sit behind it — `commitPrice`, both `applyInvoice` branches, `saveIngEdit`, `submitNew` —
plus the invoice pack teach, `applyTidy` (guarded to `TIDY_COLS`) and a product delete (which refuses
if anything references it, so it cannot change a cost). **A one-function condition is what stops this
becoming v109's gap**, where the rule was stated and the Products tab was missed anyway.

Pinned two ways: behaviourally (`setProduct` runs, the log stays empty) and as a census (no
price-path body names `logChange`, and every kind `applyInvoice` writes is `ingredient_repointed`).
**Both verified red** by making drift leak in.

---

## The shape, and the decisions behind it

`public.menu_change_log` — `id` (client text) · `recorded_at` · `kind` · `plate_id` · `dish_id` ·
`menu_ids text[]` · `avg_before` / `avg_after` / `cost_before` / `cost_after` (numeric) · `detail` jsonb.

- **ONE entry per user action.** A plate on three menus is one entry listing three, not three entries —
  the user did one thing, and N rows would inflate any "interventions this month" count by a factor.
  The exception is the invoice's repoint loop: one entry *per ingredient*, because those are independent
  decisions that happen to share a confirm.
- **STORED, not derived — and the brief's framing of that trade does not apply.** Deriving an
  intervention's effect needs the plate's build as it was *before* and *after*. `plates.lines` holds only
  the current state and there is no recipe history in this app. Derived is not more expensive here, it is
  unavailable. What is stored is **primitives, not a percentage**: `avg_before`/`avg_after` in the chart's
  own units, and plate cost in dollars where the event is plate-scoped. A stored food-cost % would bake
  in the sell price and the target, both of which move independently. Exact values, never rounded.
- **NO FOREIGN KEYS, and that is forced twice.** Same reason `ing_price_history` and `menu_price_history`
  have none — deleting a plate must not destroy the record of what was done to it, and an entry naming a
  deleted plate is the most interesting kind. And the restore forces it: `restore_backup` deletes and
  reinserts every row of `menu_items`/`plates`/`menus`, so a NO ACTION edge would reject that delete and
  a SET NULL edge would silently blank every link in the log on a restore that appeared to succeed.
- **Append-only at the POLICY level, not by convention.** SELECT + INSERT granted; UPDATE and DELETE are
  not granted to any role reaching this through PostgREST. There is no `dbUpdateChange` and no
  `dbDeleteChange`, and a test pins their absence.
- **`id` is client-generated text**, unlike the three history tables' `bigserial`. That is what makes the
  restore exactly idempotent: an entry carries its own identity into the file and back out, so the server
  uses `on conflict (id) do nothing` rather than a composite natural key two entries written in the same
  millisecond could collide on. `nextChangeId` carries a counter for exactly that reason — the invoice
  import writes several entries in one pass.

### ⚠️ NO ENTRY IS EVER WRITTEN FOR A CHANGE THE SERVER DID NOT TAKE

The log is append-only and cannot be corrected, so an optimistically-written entry could never be
retracted. Every call site logs in its **success branch**, via `logChangeIfSaved(write, kind, opts)`.
On the delete paths this is not stylistic: v112's rollback restores everything on a partial failure, and
an entry there would permanently record a deletion that did not happen.

Two helpers had to start returning their writes for this to be possible at all — **`dbSetSetting`** and
**`dbDeleteMenuRecord`**, the same one-word gap v112 closed on `dbDeleteMenu`/`dbDeletePlate`. A helper
that swallows its promise cannot be sequenced by anyone, however much a caller wants to.

### The change log is written by `removeMenuItem`'s CALLERS, not by `removeMenuItem`

Three callers, two meanings: `mmRemove` and `doDeleteMenuOnly` are a user taking one plate off one menu;
`doDeleteMenu` calls it once per dish while deleting a whole menu, which is ONE decision. Logging inside
would turn a menu deletion into N+1 entries and report a burst of interventions that never happened. The
cost is that a fourth caller could be added silently, so a census test asserts the call sites by name and
fails naming the newcomer.

### `avgBefore` must be read before the mutation, and that is a real trap

`computeAvgFoodCost()` is live — it reads `MENU` and the plates as they stand. The first draft of the
`saveKingModal` repoint captured it one line *after* `k.pid=pid`, so it was already the AFTER figure and
the entry would have recorded no movement at all. Every call site now reads it first, and the comment at
each says why.

---

## The backup — format 2 became format 3, and BOTH still restore

Adding a group is a format change under hard rule 9's general law, so `stamp.format` is **3**.

**`parseBackupFile` accepts 2 and 3, and refusing 2 would have been the more dangerous choice.**
`~/Downloads/ezplate-PRE-STEP2.json` is format 2 and is the newest backup in existence — the only
recovery path there is. Refusing it costs a real disaster; accepting it costs nothing, because the only
thing it lacks is a log that did not exist when it was written. That is a true statement about the file,
not a guess about it — which is exactly the distinction that makes format 1 refusable and format 2 not.

**The restore of this table is ADDITIVE, the second deliberate exception to "replace".** The reason is
sharper than `ing_price_history`'s: a replace would mean that restoring last month's backup ERASES every
intervention made since — the silent loss of the record of what was done while the trend line it
annotates survives, which is the exact failure that ruled out `plates.updated_at` and made the table
necessary. What additive leaves behind is entries describing a state the restore has just rolled back.
That is honest: a restore does not un-happen an intervention, and the log's own rule is that one which
later proved wrong still happened. How a chart draws a marker pointing at a plate that no longer exists
is that batch's call.

Because nothing is deleted, `menu_change_log` is **not** in the SQL function's `required` list and not in
`parseBackupFile`'s group list. The strict "missing group = damaged file" rule exists because every other
group is DELETEd before it is reinserted; a missing one there empties a live table. A missing one here can
destroy exactly nothing. Present-but-wrong-typed is still damage and is named as such.

`backupToPayload` maps through `changeToRow` like every other group, so hard rule 8 is obeyed
structurally — the function names no column of its own.

**`tests/restore.test.js`'s migration-condition tests now read `20260806_restore_backup_v3.sql`,** not
v110's file. The older file stays as the record of what ran that day, but pinning conditions against a
superseded definition asserts facts about SQL nobody executes any more.

---

## What the browser showed

Ran against the fake-Supabase fixture with the table present, driving real actions:

- Re-portioning a plate 200g → 100g wrote one `plate_edited` row: `cost_before` 0.8, `cost_after` 0.4,
  `avg_before` 4, `avg_after` 2, `menu_ids` `["MENU_ORIGINAL"]`.
- Raising the sell price 20 → 23 wrote one `dish_price` row with both prices in `detail`.
- Three saves against a server that REFUSES the insert produce exactly **one** attempt — the latch holds
  in the real thing, not just in the sandbox — and the three entries stay in memory, so a backup taken
  afterwards still carries them.
- Nothing appeared on screen, and there were no page errors in either run.

Also confirmed the opposite state against **production**: with the table absent, boot is clean
(412 products, 77 dishes, `changeLogSupported` false) and the log silently records nothing.

---

## The pre-push review found seven things, and four of them were real defects

Run against the branch diff with no knowledge of the brief. Every finding got a decision.

**1. The schema probe tests SELECT and gates INSERT — FIXED.** Those fail independently. The migration
creates the table, the grants, RLS and two policies as separate statements, so a half-applied run leaves
a table that reads `200 []` and refuses every insert with 42501 — the exact shape v90's
`menu_price_history` came up in. `changeLogSupported` would have latched **true** and every save fired a
doomed insert and a red toast, once per action, forever. `dbPushChange` now latches it **false** on the
first error. The probe covers the table being absent; the latch covers it being unwritable, and both are
needed. Verified in Chromium: three saves against a refusing server produce **one** attempt.

**2. `format: 3` on the wire would have broken disaster recovery during the rollout — FIXED, and this
was the sharpest one.** `backupToPayload` sent 3 unconditionally, reasoning that the object is built
here and now. But the deployed function is whatever was last applied by hand, and v110's refuses format 3
outright — so between this code reaching Vercel and migration 2 being run, **every restore would have
failed**, including a restore of `~/Downloads/ezplate-PRE-STEP2.json`. The batch takes care to keep
format 2 restorable and then removed the one thing making the WIRE backward-compatible.
**The fix is a principle, not a patch: the wire format declares what the payload CONTAINS, not which
version built it.** A payload with no change log genuinely is a format-2 payload, so it says 2 and the
old function takes it. It says 3 the moment there is a log to carry — by which time the table exists,
which means migration 1 has been run.

**3. A failed insert lost the entry at the next boot, and my comment justifying that was wrong — FIXED.**
The comment claimed a local-only entry is "by construction an entry for something that did not happen".
It reads as airtight and it is false: `logChangeIfSaved` confirms the write that CARRIES the change, not
the log's own insert. So a local-only entry is one for something that **did** happen whose insert failed
— and replacing wholesale deleted exactly the record this table exists to keep. Now merges by id
(`mergeChangeLog`), server wins on a collision, newest 500 kept. Same reason `menuHistory` and
`menuPriceLog` merge, and the v107 empty-read lesson applies unchanged. **Verified red.**

**4. The "nothing user-facing" test could not fail — FIXED by narrowing what it claims.** It grepped the
pure functions for `toast(`; every write delegates to `pushWrite`, which is where the toast lives, so the
body could not have contained one even if the feature shouted. It now claims only "renders nothing"
(no DOM), and the silence it used to imply is enforced by the latch above, pinned behaviourally. The
`pushWrite` label also changed from `'change log'` to `'your change history'` — the generic toast names
it to the user, and "change log" is not a phrase Max has ever seen.

**5. Five of the eleven kinds had no behavioural test — FIXED.** `submitMenuItem`'s branch split,
`doDeleteEverything`'s two branches, `dish_linked`, `ingredient_deleted`, and `saveKingModal`'s
`if(moved)` gate were pinned by a `>=11` regex census and nothing else. All now run the real path. The
rename gate is the one that mattered: it is the "guard that runs but tests the wrong thing" shape, and
inverting it left every other test green. **Verified red.**

**6. The success-branch census passed against wrong logic — DELETED rather than patched.** It asserted a
gate appeared earlier *in the source text*, not that the call was lexically inside it; in
`doDeleteEverything` the second `logChange` could have been moved out of its `.then` entirely and the
test would still have passed. A test that cannot fail for the mutation it guards is worse than no test
(v111). The four behavioural rollback tests do the real work and now cover both branches of both paths.

**7. One malformed entry could veto the entire restore — FIXED.** The insert was `select *` into a table
with four NOT NULL columns, while the function's own header notes that absent JSON keys populate as NULL.
One entry missing `kind` would raise a not-null violation and roll back the whole transaction, taking the
products, plates, dishes and menus with it. The migration argues this group "can destroy exactly nothing";
as written it was the only group able to block a catalogue recovery. Now filtered and column-named, the
same discipline `ing_price_history` already had.

**Smaller, all acted on:** `nextChangeId` reset its counter on every page load, so two tabs acting in the
same millisecond minted the same id — a 23505 on the restore's idempotency key. It now carries a
per-load random token. `rowToChange`'s number coercion accepted numeric strings where `changeEntry`
rejects them, so a garbage server value could reach memory as `NaN`; it is finite-or-null now.
**And one correction to the migration's own prose:** "additive means a restore can never lose an entry"
is true of the FUNCTION and false of the FILE — the export carries at most 500, so after a full wipe
anything older is unrecoverable. Same shape as `ing_price_history`'s 60-per-product cap; now stated.

**Noted, not changed:** the review points out that `changeLog` has exactly one reader (`buildBackup`), so
the feature ships write-only and a wrong `kind` or figure is undetectable in the app until the chart
batch lands. That is true and is the batch's real risk — it is why the enumeration and the behavioural
tests carry the weight here rather than a device check.

## Deliberately NOT built (hard rule 5)

- **`logHistory` does not fire on six of the twelve paths** (above). Real, pre-existing, its own brief.
- **`doDeleteMenu` fires its dish deletes unawaited.** Unlike the plate case there is nothing to sequence
  against — `menu_items.menu_id → menus.id` is ON DELETE SET NULL — so the change-log entry chains off the
  `menus` row delete, which is the write that decides whether the menu is gone.
- **No backfill.** History starts now. Reconstructing interventions from timestamps would invent evidence
  in the series the chart draws from, for the same reason v109 refused to backfill price points.
- **No UI.** Nothing user-facing changed; a test asserts none of the new functions touch the DOM.

## Two documented facts that turned out to be wrong

- **The `ing_price_history` unique index ALREADY EXISTS** —
  `ing_price_history_product_moment_key UNIQUE (product_id, recorded_at)`, created in
  `20260801_ing_price_history.sql`. CLAUDE.md outstanding item 10 said it was "deliberately NOT built"
  and would "apply cleanly". It has been live since 1 Aug. The restore's `DISTINCT ON` is still
  load-bearing (it stops two same-key rows *inside one payload* raising), but "not race-safe" is no
  longer true. **Item 10 should be closed, not scheduled.**
- **There is a TENTH public table, `kitchen_items`** (`id`/`name`/`current_product_id`/`created_at`), not
  in the snapshot's list and not read or written by `js/app.js`. It looks like a relic from before kitchen
  words moved into `app_settings`. Not touched — dropping a table needs Max's yes.

Also drifted: production now holds **77** `menu_items`, not 78. 0 unlinked rows.

## Needs Max's phone

Nothing here is visible, so there is no visual check. The one behavioural thing worth watching: **every
save now fires one extra INSERT.** On mobile data after a week idle, the cold-start penalty (outstanding
item 0) already lands on the first request; this adds a second small write behind it. It is fire-and-
forget and never blocks the UI, but if a plate save feels slower than it did, that is the thing to look
at first.
