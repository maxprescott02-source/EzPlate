# HANDOVER — v106 (the backup export completed)

**Branch:** `feature/backup-export-completion` · **Scope:** `buildBackup` — two
missing datasets, a provenance stamp, the Lemon diagnosis, and one durable rule
recorded in `CLAUDE.md`. Six version spots v105 → v106.

Runs **before** the online-only data layer batch, and that ordering is the whole
reason it exists: online-only migrates `BASE_PRODUCTS` into the products table
and deletes the overrides layer, which makes every backup taken before it
unrestorable — silently, because nothing in the old file records which build it
was a delta against.

## What changed

**1. `ing_price_log` (`cafeDB_ingPriceLog`) is in the export.** This is the
sharp one. There is **no server table** — one copy, one device, one browser
profile, and clearing Safari website data destroys it with no server wipe
required. Up to 60 points per product of cost history, and the input to
`ingPriceAt` → historical plate costs → the movers card and insight family 1.

**2. `supplier_mem` (`cafeDB_supplierMem`) is in the export.** It has a server
table (`supplier_phrases`) so it survives a device-only loss. Included anyway:
a backup exists for the case where both copies go.

Five data groups became seven. The keys are snake_case to match the existing
group names, not the camelCase of the in-memory vars they come from.

**3. The provenance stamp — the important one.**

```json
"stamp": { "format": 1, "app_version": "v106",
           "base_products_count": 393, "base_products_hash": "be5e0fbe" }
```

The export is a **delta**, not a snapshot. On Max's 1 Aug data: 118 overrides
(98 edited base rows + 20 custom) out of 412 live products. The other **295**
come from the `BASE_PRODUCTS` literal in whatever build does the restoring.
Restore against a drifted build and those 295 silently take that build's prices.
Silent wrong prices in a costing app is the worst failure class available, so
the file now says which literal it was taken against.

**A hash, not just the count, and that was a real decision.** The brief allowed
"a hash or, at minimum, the row count". A count cannot detect a **repricing** —
393 rows before, 393 after, every number different. That is precisely the drift
that produces silent wrong costs, so the count alone would have been a stamp
that passes the dangerous case. FNV-1a over `JSON.stringify(BASE_PRODUCTS)`:
no new dependency (hard rule 4), deterministic, moves on any field edit.
Memoised — `BASE_PRODUCTS` is `const` and `rebuild()` copies rather than mutates
— so the 132 KB serialisation happens once per session, on first export.
`tests/settings.test.js` pins the same-length-repricing case explicitly; if
someone ever "optimises" the hash back to a count, that test fails.

**The refusal on mismatch is deliberately NOT here.** It belongs to the restore
batch. What is here is `CLAUDE.md` hard rule 9, which states the obligation so
the restore batch cannot miss it.

## The audit's soft claim — checked, not carried forward

The audit said both datasets are "plain serialisable objects already in memory
at that point". The brief was right to flag it: if either were hydrated lazily
or post-sync, `buildBackup` would capture `{}` and produce a file that looks
complete and is not — the same failure shape this batch exists to close.

**Confirmed against the hydration order.** Both are plain `var`s initialised
**synchronously at module scope** — `ingPriceLog` at app.js:991, `supplierMem`
at app.js:1227 — roughly 2,200 lines before `buildBackup`, which only ever runs
from a click handler. Neither is lazy, neither waits on a sync.

**And verified, not just reasoned.** Smoke section [4] now seeds both
localStorage keys **before** `window.eval(appJs)` and asserts the export comes
back **populated**, not merely present. The smoke has no `SUPA_URL`, so
`bootstrapSync` never fires: what it captures is a device that has loaded from
disk and synced nothing. That is the cold boot the brief asked for.

The seeded supplier name (`ZZ Smoke Supplier`) is one no fixture uses, so
seeding cannot perturb the invoice sections — all 25 sections still pass.

## Lemon — diagnosed, and it is not a fault

`Umr9ypwaf` "Lemon", `pack_qty:0`, `pack_unit:null`, `pack_size_raw:"15 kg"`,
`cost_per_base_unit` 0.005666666666666667.

**Nothing is wrong, and nothing was changed.**

- **The cost is right.** $85 ÷ 15 kg = 0.0056667/g exactly. `pack_qty` plays no
  part in it: plate costing reads `cost_per_base_unit` via `cpbu()`.
- **`pack_qty` is read at four sites and every one guards `pack_qty>0 &&
  pack_unit`** (app.js:4401, 4950, 4951 behind 4950, 5404). A zero therefore
  behaves exactly as `null` does — it means "no taught pack" and falls through
  to supplier memory, then the parser. No division by zero exists to guard.
- **No plate renders wrong or infinite.** One plate uses it — "Cod & Chips",
  20 g → $0.113. Correct.
- **It is not even unusual:** 113 of the 118 overrides carry `null` already, and
  `0` and `null` are indistinguishable at every read site.

So the answer to the brief's question is not "structural, report and stop" — it
is "there is no fault". A guard would have been a line or two, but it would have
guarded nothing, and hard rule 5 says implement what was agreed.

**One adjacent oddity, reported not fixed:** `saveIngEdit` (app.js:1442-1445)
writes `pack_qty`/`pack_unit` but never `pack_size_raw`, so Lemon retains a
stale `"15 kg"` display string against an empty structured pack. It is invisible
— `pack_size_raw` is written in four places and **read for display in none**.
Worth knowing if a future batch ever surfaces it.

## Recorded in CLAUDE.md — two hard rules, above the line

The brief authorised these explicitly ("this is exactly the category `CLAUDE.md`
exists for"), which is the yes the file's own convention requires. Flagging
anyway, because they sit above the "State as of" line.

**Hard rule 8 — the export is in-memory shape, not schema shape.** `buildBackup`
dumps the live JS objects verbatim, so `menu_items` comes out camelCase:
`menuId` / `plateId` / `sourcePlateId` / `custom`. The table has `menu_id` /
`plate_id` / `source_plate_id` / `is_custom`. `rowToMenu` and `dbPushMenu`
translate on every normal read and write; the export bypasses both. A restore
script written from the schema inserts **every row present with nothing
connected** — on Max's 1 Aug file, 76 of 77 dishes lose their plate link, and
no error is raised.

**Hard rule 9 — the delta and the stamp**, including the obligation that a
restore path compare the stamp and **refuse** on mismatch.

## Found on the way — NOT fixed, wants its own brief

**`bootstrapSync` can wipe local supplier memory** (app.js:171). It replaces
`supplierMem` wholesale with the server read and immediately `saveSupplierMem()`s
it. The guard is `Array.isArray(spr.data)` — and an empty array passes. So a
`supplier_phrases` table that is empty, or gets emptied, silently destroys the
local copy on the next boot, before the user could ever export it.

Out of scope here and deliberately untouched. It is the same failure shape this
batch closes, one layer up, and it is now item 10 in the outstanding list.

## Out of scope, as briefed

- **The restore importer.** It must target the post-online-only data shape, not
  the localStorage shape that batch deletes. Building it now is work thrown away.
- Anything in the online-only brief.
- The five taught packs, beyond the Lemon diagnosis.
- Any `pack_qty` normalisation (see above — there is nothing to fix).

## Verification

- Baseline before starting: `npm test` 509 green, `node -c` clean, six spots
  agreed at v104, `main` at the v104 merge (PR #43).
- **The branch was rebuilt off v105** after Max merged PR #44 mid-batch —
  the version bump was deliberately held until then so the two branches could
  not collide on the six spots. Verified after: both sides intact (the About
  privacy line at v105, this batch's `buildBackup` changes) and all six spots
  agree at v106.
- After: **`npm test` 514 green** (509 + 5 new) · `node -c` clean on
  `js/app.js`, `sw.js` and the four `api/*.js` · **jsdom smoke green, all 25
  sections**, including the cold-boot export assertions.
- **Playwright 91/91**, run alone, 1.7m — normal wall-clock.
- The real app's stamp read back out of jsdom: `393` / `be5e0fbe`, matching an
  independent recomputation of the literal.

## Needs Max (v106)

1. **Re-export from the app and confirm the file** — all seven groups populated,
   and a `stamp` reading `393` / `be5e0fbe`. **That file is the backup the
   online-only batch runs against.** The 1 Aug export is superseded and should
   be kept only as a fallback, since it predates the stamp and both datasets.
2. Export it **from a cold boot** if you can — open the app fresh rather than
   from a session that has been syncing. The smoke proves the code path; your
   file is the one that has to actually contain your data.

Carried forward: the whole v82–v105 phone list, which remains the top item.
