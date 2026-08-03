# HANDOVER v110 — backup restore, the counterpart to exportBackup

**Date:** 3–4 Aug 2026 (NZST) — built 3 Aug; destructive steps 1 and 2 run 3 and 4 Aug
**Branch:** `feature/backup-restore` off `main` at `c8a6dd2` (the v109 merge)
**Brief:** `ezplate-opus-backup-restore.md`
**Suite:** `npm test` 614 green (582 → 614) · jsdom smoke green · Playwright 94/94 · `node -c` clean

---

## Why this existed as a gap

`exportBackup` has shipped without a counterpart since it was written. That mattered more
after v108's D3 made a product delete a real `DELETE`: the reasoning that made that
acceptable was "reversibility is provided by the export" — and that sentence is only true
once something can READ the file. Until now, recovery meant hand-inserting rows in the
Supabase SQL editor.

---

## The three findings that shaped the build

These came out of reconnaissance, before any code, and two of them changed the design.

### 1. `plates_menu_id_fkey` is not gone — CLAUDE.md hard rule 6 was wrong

Rule 6 said the old `plates.menu_id → menu_items.id` FK "and the old `dbPushPlateAfterMenu`
are gone". `dbPushPlateAfterMenu` is genuinely gone. **The constraint is not.** It is live,
`ON DELETE SET NULL`, and **20 of 78 plates still carry a non-null `menu_id`**.

The application-level direction flipped in v55; the database constraint never did. So the
two tables are **circular**, and that dictates restore order rather than the other way
round:

- `menu_items.plate_id → plates.id` has **no** delete action, so deleting plates first
  raises an FK violation → **dishes must be deleted first**.
- `plates.menu_id → menu_items.id` means a plate carrying a dish reference **cannot be
  inserted before the dishes exist** → plates must insert with `menu_id` omitted.

`plateToRow` already omits it, so the restore is correct **by existing design rather than by
luck**. If it ever starts writing that column, restore breaks. `tests/restore.test.js` pins
it. Rule 6 is corrected (Max's yes, asked and given).

I did not discover this by reading — the atomicity probe forced it. My first probe payload
built plates from `to_jsonb(p)`, which included `menu_id`, and it would have failed at the
plates insert rather than where I intended.

### 2. Atomicity has exactly one honest mechanism, and RLS proves it

The brief asked me to report how atomicity can actually be achieved before writing the
restore path. The answer is a Postgres function, and the argument is not preference:

- PostgREST gives no cross-table transaction across requests. ~575 rows from the client is
  ~6 independent transactions with no rollback between them.
- **`ing_price_history` and `menu_price_history` carry SELECT+INSERT policies only.** The
  anon key cannot `DELETE` from them at all. A client-side staged apply cannot even perform
  the wipe half of "replace", let alone roll it back.

So a staged apply with verified rollback **cannot be made honest here**. That is a finding,
and it is why the function exists.

### 3. `anon` has `statement_timeout = 3s`

The function sets its own `30s`. ~575 rows is tens of milliseconds, so this is
belt-and-braces; whether a `SET` inside a function extends an already-armed statement timer
is the one thing I flagged as verify-at-use rather than assumed.

---

## SECURITY INVOKER, and why the first draft was wrong

My first draft was `SECURITY DEFINER`, reasoning that a restore must wipe
`ing_price_history` and anon cannot. **That assumption died with the additive-log decision.**
Once the log is never deleted, the function needs nothing the anon key does not already
hold — ALL policies on `ingredients` / `menu_items` / `plates` / `app_settings` /
`supplier_phrases`, RLS off entirely on `menus`, INSERT+SELECT on `ing_price_history`.

So it is `SECURITY INVOKER` and buys **atomicity and no new privilege**. That matters
because the anon key is public in `index.html`: a DEFINER function here would have handed
every reader of the page a one-call database wipe that RLS would otherwise refuse.

Worth keeping in view for the multi-tenant gate — this function is as safe as the anon key's
existing grants and no safer, which is fine today and is not a permanent answer.

---

## The one deliberate exception to "replace"

`ing_price_history` is **additive** — inserted only where `(product_id, recorded_at)` is
absent, never deleted. The export caps each product at 60 points (`bootstrapSync` slices,
`logIngPrice` caps), so a replace could only ever LOSE observations, silently, in the series
the movers card and insight family 1 read. Only 34 points exist today so nothing was at
risk yet; the point is that it is a landmine, not that it has gone off. Max chose this over
strict uniformity.

Everything else is a true replace: products, ingredients, plates, entries on menus, menus,
supplier memory, and the settings the export carries.

`app_settings` is **upserted, not replaced** — the export holds only some of its keys, and
`last_invoice_import`, the two AI toggles and the two dead `deleted_*` tombstones are not
this file's to destroy.

---

## What was verified against production, and how

Nothing here is inferred.

The migration was applied **three times** — initial, then the `DISTINCT ON` fix, then the
`where true` fix — with the body hash re-checked against the file each time. The final,
shipped hash is **`3f91871f…91c4`**; `3b15aec4…c848` and `9b3174f5…b93b` appear elsewhere in
this document and are the two HISTORICAL values, not disagreements. Every row below was
re-run after the last re-apply.

| Check | Method | Result |
|---|---|---|
| Function body matches the reviewed file | `md5(prosrc)` vs local hash | `3f91871f…91c4` **exact** |
| SECURITY INVOKER | `pg_proc.prosecdef` | `false` |
| Guards refuse before any DELETE | 5 payloads through the function | all refused, each naming why |
| Row counts after those 5 refusals | recount 8 tables | unchanged |
| **Atomicity** | payload failing at the dishes insert | `23503` raised, **everything rolled back** |
| The tell | `plates.menu_id` non-null count | still **20** after the probe |
| Real file end to end | 3 Aug export → `backupToPayload` | 214 KB, every FK condition satisfied |

The atomicity probe built its payload **from the live tables**, so even a catastrophic
partial commit would have written the current data back. It failed exactly where intended —
after five deletes and three successful inserts — and all ten post-checks matched.

---

## Judgement calls

**Hard vs soft broken references.** A dish pointing at a plate or menu the file does not
contain is **hard** — Postgres rejects the whole restore on the FK, so catching it in the
client turns an opaque error into a sentence. A dangling `pid`/`kid` is **soft**: it
restores fine and then costs nothing. I chose to **report and proceed** rather than refuse,
because refusing would leave someone whose only lifeboat is slightly imperfect with nothing
at all. The counts appear in the confirm and the choice is Max's.

**Format 1 is refused wholesale**, per the brief. The honest reason is not "format 1 is
incomplete" — some are complete, including Max's 2 Aug file. It is that the app can no
longer RUN rule 9's per-id test, because v108 deleted the literal it needs. The refusal
message says exactly that and names `aa16387`.

**Repaint from the server, never from the file.** On success the client re-runs
`bootstrapSync`. Rendering the file's own objects would show a screen that agrees with the
backup whether or not the write landed — the two-sources-of-truth ambiguity v108 removed.

**"Entry on your menus", not "item".** The broken-reference copy needed a word for a
`menu_items` row. "Menu item" already survives as a known fifth noun in the Edit modal
awaiting its own brief, and this copy must not add another. Describing without naming is
allowed; inventing a noun is not. A test pins it.

**A missing group is a damaged file, not an empty dataset.** Both the client and the
function refuse a payload missing a group. Empty arrays pass — zero menus is a legitimate
state (hard rule 7) — but a payload with no `products` would otherwise replace a
412-product catalogue with nothing.

**The stamp guard exists on both sides.** The client refuses format 1 with an explanation;
the function refuses anything reaching it without `format: 2`. A guard only one side knows
about is a guard a future caller skips by not knowing about it.

---

## Three bugs found in my own code before shipping

**1. Verb agreement in the broken-reference copy** — caught by the test I had just written.
It read **"1 plate line use an ingredient"**, and it appears in the one dialog that precedes
replacing a café's pricing. Fixed in the app rather than the assertion; a test now pins
agreement for one and for many across all four messages.

**2. "1 menu, with 1 plate on them"** — same class, found by self-review of the confirm copy
rather than by a test. Now `on it` / `on them`, and every count in the summary pluralises its
own noun. Also pinned.

**3. The additive price-log insert could double a point.** `not exists` dedupes against rows
already in the table — which is what makes re-running a restore idempotent, and that part was
right. But it cannot see duplicates **within the payload**, and there is no unique constraint
on `(product_id, recorded_at)` to catch them. A file holding two points with the same
timestamp would have inserted both, silently doubling an observation in the series the movers
card reads. Fixed with `DISTINCT ON (product_id, recorded_at)` plus an `ORDER BY` so the
survivor is deterministic rather than arbitrary. The migration was re-applied and re-verified
(new body md5 `9b3174f5…b93b`, guards and atomicity re-run, all counts unchanged).

The pattern in all three: none would have thrown, and none would have looked wrong.

---

## Deliberately NOT built

- **No change to `exportBackup`'s contents or shape** (out of scope, and rule 9's law says
  changing what fills memory changes the file format — not something to do in the same batch
  as the first reader of that format).
- **No merge mode.** Restore replaces. A merge reintroduces "which copy is the truth", the
  question v108 removed.
- **No scheduled or automated backups.**
- **`price_history` and `menu_price_history` are untouched** — the export does not contain
  them, and restore replaces only what the file contains. Both key by id with no FK, so they
  survive a restore as harmless orphans rather than being cascade-deleted. Worth knowing:
  after restoring an OLDER file, some `menu_price_history` rows point at entries that no
  longer exist.
- **The ~50 `saveX()` call sites** (still outstanding item 2).

---

## The JS → PostgREST hop, verified in a real browser

Every server-side check above went through the MCP's SQL connection, which does not exercise
PostgREST at all. So `SUPA.rpc('restore_backup', {payload})` was run for real, against the
**production deploy** (v109, `c8a6dd2`) in Chrome, using payloads the guards refuse before any
DELETE:

| Call | Result |
|---|---|
| `{payload:{format:1}}` | `P0001` — "unsupported payload format 1; only format 2 is accepted" |
| `{payload:{}}` | `P0001` — "unsupported payload format (none)" |
| `{payload:{format:2, ingredients:[]}}` | `P0001` — `group "menus" is missing or is not an array` |
| Row counts after all three | 412 / 78 / 78 / 2 / 7 / 34 — unchanged |

That proves the four things the SQL tests could not: PostgREST exposes the function (the
schema cache picked it up), the `payload` argument name maps correctly, the anon key's EXECUTE
grant works in practice, and **the raised message reaches the client verbatim** — which is
what `pushWrite` will put in front of Max.

The third row matters most: a `format: 2` payload PASSED the format guard and stopped at the
group check. That is the real restore's own path, walked as far as it can be walked without
replacing data.

**A warning for whoever runs the destructive steps:** a `format: 2` payload with all seven
groups present is a live restore. Do not paste one into a console to "see what happens".

## Step 1 of the destructive plan — RUN, and it found a real bug

Run against production data from a local v110 build (localhost served, real Supabase), driving
the actual `restoreFromBackupFile` with a real `File`, clicking the actual confirm.

### The bug: `DELETE requires a WHERE clause`

The first attempt **failed**, and it failed for a reason no test in this repo could have caught:

> Supabase preloads the `safeupdate` extension for the **`authenticator`** role
> (`session_preload_libraries = supautils, safeupdate`). It rejects any `DELETE` with no `WHERE`
> clause. The **`postgres`** role does not load it.

Every SQL check I ran went through the MCP as `postgres`. The migration was verified, hashed,
guard-tested and atomicity-proven — all as a role for which the guard does not exist. **The
first time the real anon path ran it, it failed on line one of the deletes.**

That is the general lesson, and it is bigger than this batch: **a migration verified through the
MCP or the SQL editor has not been verified for the client.** They are different roles with
different preloaded libraries, different `statement_timeout`, and different RLS treatment.

**This is now CLAUDE.md hard rule 10** (proposed to Max, yes given). It went above the snapshot
line because it outlives this batch and applies to every future migration and RPC, not to the
restore. The "Testing & verification" section gained a pointer to it, plus the recipe that found
it: serve the working tree with `python3 -m http.server` and open it — the local build talks to
production Supabase, so it exercises the real client role against real data while letting you
test code that is not deployed yet.

The fix is `delete from <t> where true` on all five. I did not guess which form survives —
`safeupdate` might have been fooled by constant folding — so I probed it from the anon path with
a throwaway table and function (both dropped afterwards):

| Form | anon path |
|---|---|
| `delete from t` | **blocked** |
| `delete from t where true` | allowed |
| `delete from t where id is not null` | allowed |
| `delete from t where id in (select id from t)` | allowed |

`where true` passing proves `safeupdate` inspects the **parse tree**, not the plan, so constant
folding cannot reintroduce the problem. Chosen because it states the intent: every row,
deliberately. Pinned by a test that reads the migration file.

### What the failure proved for free

The failed attempt was the **best possible atomicity test** — a genuine mid-flight failure on the
real client path, not a synthetic one. All eight before/after fingerprints matched exactly,
including the 20 legacy `plates.menu_id` values. And `pushWrite` surfaced the real Postgres
message to a toast: *"Couldn't save the restore: DELETE requires a WHERE clause"*.

### The successful run

`Restoring…` → `Restored — 412 products back`, **~1.1 s** from click to repainted screen
(3.2 s including the confirm). Then, comparing a fresh `buildBackup()` against the file that was
restored, keyed by id:

| Group | Result |
|---|---|
| products | 412, **zero changed** — every numeric survived exactly |
| plates | 78, zero changed |
| kitchen ingredients | 159, zero changed |
| menus · supplier memory · settings | zero changed |
| ing_price_log | every original point present; 33 → 34 (the extra was already in the table) |
| menu_items | 78 present, **70 changed in exactly two fields** |

Those two fields are `custom: false → true` and `sourcePlateId: null → <plate id>`. **Both are
`menuToRow`'s own behaviour** — it hardcodes `is_custom:true` and mirrors `plate_id` into
`source_plate_id` for the v55 rollout. Every normal dish save already does this; the restore just
did all 78 at once. Nothing in the app reads a dish's `.custom` (grepped), and the mirroring is
what v55 intended. **Not a restore defect.**

The brief's acceptance criteria, re-verified on the restored data: **0 dangling `pid`, 0 dangling
`kid`, 0 plates costing zero** across the 42 plates that have lines, `current_menu_id` resolving,
77 of 78 menu entries resolving to a plate. Sample real costs: Mollys Breakfast $2.9479, chicken
ceasar $5.2818.

### The two expected, documented changes

`plates.menu_id` went 20 → 0 (legacy, unread, `plateToRow` never wrote it) and every `updated_at`
was reset. Both were predicted before the run. A third, unpredicted but benign: `app_settings`
went 9 → 10 because the export carried `gst_default` and the database had never had that row.

## Step 2 — RUN, and recovery is bit-perfect

Step 1 proved the restore is a faithful round-trip. Step 2 is the one that proves **recovery**:
lose something real, get it back.

**Safety net first.** A fresh `format: 2` export was written to
`~/Downloads/ezplate-PRE-STEP2.json` (v110, 313 KB) *before* anything was deleted — and then
**validated before the deletion, not after**: it parses, has no hard or soft broken references,
contains both delete targets, and produces a payload whose every dish reference resolves. An
unverified safety net is not a safety net.

**The losses, through the real user paths** — `deletePlate()` and `doDeleteMenuItem()`, not
hand-written SQL:

- plate `SPms07iwy5` "chippy" (unpublished, 2 lines) → *"chippy" deleted*
- menu entry `ummry6gs0i` "prawn ceasar", $20 on the specials menu → *Deleted prawn ceasar*

The plate confirm read: *"Delete "chippy"? The plate is removed. Your products and ingredients are
untouched."* — and that promise held: products stayed at 412, ingredients at 159.

**The loss was real.** 78 → 77 on both tables on the server, and it survived a full page reload —
a cold boot from the database, not a stale in-memory view. "prawn ceasar" was gone from the
specials menu, which showed 3 entries instead of 4.

**The recovery.** Restoring the pre-step-2 file: `Restored — 412 products back` in **~0.6 s**.
Both came back. Then, against the fingerprints taken before the deletion:

| Table | Result |
|---|---|
| plates · menu_items · ingredients | **exact md5 match** |
| menus · supplier_phrases · ing_price_history · app_settings | **exact md5 match** |

**All seven match byte-for-byte** — not row counts, actual content. After a further cold boot:
"chippy" costs **$3.85**, identical to before it was deleted; "prawn ceasar" is back at $20 on the
specials menu with its plate resolving. 0 dangling kid, 0 dangling pid, 0 plates costing zero,
every `menuId` resolving, `current_menu_id` resolving.

**A free result worth naming: the restore is idempotent.** The `menu_items` fingerprint after this
restore is identical to the one after step 1's — so the `custom` / `sourcePlateId` normalisation
that `menuToRow` performs converges on the first restore and never moves again. Restoring twice is
safe.

### Still not run

Step 3 (full wipe and restore). It is the only remaining unknown, and after steps 1 and 2 the
things it would newly prove are narrow: that an EMPTY table restores as well as a populated one,
and that the boot gate behaves when the database is genuinely empty mid-restore.

## CodeRabbit

**The CLI did not complete — three attempts, three server-side timeouts** (review IDs
`ac5ac955`, `dd161da7`, and a third). The **GitHub app reviewed PR #50 successfully**, so the
code did get its second reviewer; if the CLI times out again, push the PR and let the app do
it rather than treating the CLI's silence as a pass.

Seven findings. **Four fixed, three skipped with reasons.**

**Fixed — documentation (three), all mine:**

1. **Suite count stale** — the header said 611 while the tree registered 614. I updated
   `CLAUDE.md` when the three migration-pinning tests landed and never came back here.
2. **This document contradicted itself on the destructive plan** (major) — the body recorded
   steps 1 and 2 as run, while the "Needs Max's phone" list still said "Steps 1–3 as agreed.
   None of it has been run." That bullet predated both runs.
3. **The verification table's migration hash was stale** — it showed `3b15aec4…c848`, the
   FIRST of three applies. CodeRabbit proposed `9b3174f5…b93b`, which is the SECOND. The
   shipped hash is `3f91871f…91c4`. The table now carries the final value and names the other
   two as historical, so a reader hitting three hashes in one document knows which is live.

**Fixed — code (one), and the only finding in shipped code:**

4. **The restore's promise chain had no rejection handler.** If the rpc succeeded but
   `bootstrapSync` or the repaint below it threw, the last thing the user saw was the
   `Restoring…` toast — forever, after a destructive operation, with no way to tell whether
   their data had been replaced. The fix says the true thing, which is neither "restored" nor
   "failed": **"Restored — but the screen couldn't refresh. Close and reopen EzPlate."**
   Getting that wording wrong in the other direction would be worse than the bug: "couldn't
   restore" would invite a second restore of a database that had already been replaced.

**Skipped, each with a reason:**

5. **Mark step 2 pending until `~/Downloads/ezplate-PRE-STEP2.json` is confirmed to exist.**
   It exists — 312,999 bytes, 4 Aug 2026 05:16 NZST — and was validated *before* the
   deletion. But CodeRabbit's sandbox cannot see outside the repo and correctly declined to
   take the claim on trust. Rather than unwind a passing result, the size and timestamp are
   now recorded in both documents: a safety net named only by a path is a claim, not evidence.
6. **A unique index on `ing_price_history (product_id, recorded_at)`, replacing `not exists` +
   `DISTINCT ON` with `on conflict do nothing`.** A genuine improvement and genuinely
   race-safe, and checked as applicable (0 duplicate pairs on 4 Aug). Not built, under hard
   rule 5: it constrains `logIngPrice`/`dbPushIngPrice` too, turning a silent duplicate on the
   NORMAL price-logging path into a surfaced error. That is probably right, but it is a change
   to the price log rather than to the restore. **Now outstanding item 6** with the check
   already done.
7. **Rewrite the brace-extraction helper to understand strings, comments and regexes.** Not
   done: it is the same helper `_extract.js` and `row-boundary.test.js` use, and diverging
   would make this file inconsistent with the repo's convention for no proven gain. Its second
   suggestion WAS taken — each extracted slice is now validated with `new Function` and names
   the function when it fails to parse. That addresses the real cost, which was never a wrong
   extraction but an unreadable error if one ever happened.

Worth noting what this says about the batch: **CodeRabbit found nothing wrong with the
migration, and one defensive gap in the client.** Three of the four fixes were in my record of
the work rather than the work. That is the failure mode a 380-line handover invites — code
gets re-read constantly, prose gets written once and goes quietly stale.

## Needs Max's phone / not verified here

- **Step 3 of the destructive plan — the only step not run.** Steps 1 and 2 are done and
  passed (see their sections above; this bullet said "none of it has been run" until
  CodeRabbit caught that it had gone stale). What step 3 would newly prove is narrow: that an
  EMPTY table restores as well as a populated one, and how the boot gate reads against a
  genuinely empty database mid-restore.
  Recorded for step 1, since it was predicted rather than discovered: restoring permanently
  nulls the 20 legacy `plates.menu_id` values and resets every `updated_at`. Both are
  documented as unread — but "unread" is a claim worth re-checking, not a guarantee.
- **NONE of the restore UI has been seen on a phone.** Everything above was a desktop
  browser driving the real client against the real database. That is the largest remaining
  gap, and it is bigger than step 3.
- **Does the file picker behave on iOS Safari?** A hidden `<input type="file">` driven by a
  button is the invoice-upload pattern and works there, but a `.json` `accept` filter is not
  the same as a PDF one, and iOS is particular about which files it will offer.
- **Does the confirm read as serious enough?** It is the most destructive button in the app
  and it sits one tap from Export. The copy says "replaces" and "can't be recovered", but
  whether it FEELS like a stop sign is a phone question.
- **How long a real restore takes on mobile data**, and whether the boot gate reappearing
  after `bootstrapSync` reads as progress or as a fault. The cold-start penalty
  (~1,138 ms, outstanding item 0) lands on top of this.
- **Carried, unchanged:** phone sign-off on v82–v104 and on v108's behavioural items.
