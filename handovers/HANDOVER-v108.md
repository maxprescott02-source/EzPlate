# HANDOVER — v108 (2 Aug 2026) — the online-only data layer

**Branch:** `feature/online-only-client` · **Six spots v107 → v108.**
**Supabase becomes the source of truth. localStorage stops being a data store
and keeps only view preferences.**

This is the largest architectural change the app has had. It replaces the
planned `pushWrite` retry-queue work rather than following it, and closes four
open defects by removing their shared cause.

`npm test` **563 green** (533 → 563, +30 added, 8 pins retired) · jsdom smoke
green · Playwright **94/94** · `node -c` clean. app.js **590 KB → ~455 KB**.

Built in six phases, each ending green, on Max's instruction to checkpoint
before the risky one.

---

## Before any code: the gate the brief set

The brief said to confirm a stamped export exists and stop if it doesn't. It
does, and it is better than the brief anticipated: Max took one at
**19:32 on 1 Aug, two minutes after PR #47 merged**, and it caught the upgrade
the backfill had just produced — **412 products, a complete snapshot**, where
the 31 Jul file was a 118-product delta. That file is the fallback for
everything below. It should be kept against commit **`aa16387`**, which is the
last commit containing the `BASE_PRODUCTS` literal a format-1 restore needs.

**I was wrong about one thing here and it changed Max's to-do list.** I told him
the `ing_price_log` seed was stale by two points and that a fresh export was
urgent to rescue them. It wasn't. His 2 Aug export shows 33 points, newest
15 Jul, with no P0007 or P0267 entries — the seed was complete. The two prices
edited on 31 Jul went through the **Products-tab product form**, which calls
`setProduct` but never `logIngPrice`. Only the builder hand-edit and
invoice-confirm write that log.

The real finding underneath is worth more than the error: **a price edited on
the Products tab writes no per-product history point at all**, so the movers
card and insight family 1 never see it. Not v108 scope. It is item 4 on the
outstanding list.

---

## Phase 1 — the row boundary

Every crossing between a Supabase row and an in-memory object now lives in one
documented section, in pairs. Readers call `rowToX`, writers call `xToRow`,
nothing outside names a column.

The brief called this the likeliest source of silent breakage and it was right
to. Until now the translation ran on sync only, at a handful of sites, and a
reader could touch raw fields and get away with it. With the server as truth,
**every** read crosses the boundary, and a missed field doesn't throw — it
arrives `undefined`, and the damage presents as a missing *relationship* rather
than a naming bug. That is exactly how the v106 audit found `menu_items` being
exported camelCase against snake_case columns: every row present, nothing
connected, no error, 76 of 77 dishes.

`rowToIngredient` did not previously exist. `bootstrapSync` used the raw row **as**
the override object (`ov[r.id]=r`), which worked only because `ingredients`
columns happen to match the product model field-for-field — luck, not design,
and it left nowhere to normalise a value.

**A bug the new tests caught in code written in that same commit.** `rowToPoint`
guarded with `isFinite` alone. `Number(null)` is `0`, which is finite — so a
null price column would have become a real-looking **$0.00 price point**: a
*fabricated* observation in a series the dashboard draws bands from, not a
dropped one. Null and `''` are now rejected before conversion; `0` itself stays
legitimate (P0277 costs 0).

**A false comment I nearly shipped.** I asserted PostgREST returns `numeric` as
a string. It returns a JSON number — checked against production rather than left
standing. The `Number()` calls are defensive, not a fix, and the comment says so.

`rowToMenu` maps a **dish**, not a menu (v55 naming, pinned by tests, hard rule 3
forbids the rename). The new menus mapper is `rowToMenuRecord`, and the section
says to read the table name, not the function name.

---

## Phases 2 + 3 — the literals go

Landed together because `seedIfEmpty` referenced both; splitting them would have
produced a commit that didn't build.

| Deleted | Why it is now dead |
|---|---|
| `BASE_PRODUCTS` (393 rows, 132 KB) + `BASE_IDS` | Catalogue is in `ingredients`, 412 live products |
| `BASE_MENU` (69 dishes) | 66 ids were already rows; the missing 3 are exactly the 3 Max deleted |
| `isBaseMenuId` + the tombstone branch | Unreachable once there are no built-in dishes |
| `seedIfEmpty` | Nothing left to seed from — an empty database now stays empty |
| `baseProductsFingerprint` + two stamp fields | Nothing left to fingerprint (D2) |

The `seedIfEmpty` deletion also retires its `count === 0` whole-table check,
which the brief flagged as a multi-tenant hazard to note rather than fix. Free.

**`is_custom` lost its deriver** (`BASE_IDS`) and now round-trips through the
boundary. It's the only remaining record of which rows the user made, nothing
renders it, and the `!== false` default falls the safe way: a product the app is
*creating* has no `is_custom` and is custom by definition.

**Decision D2 came forward into this phase, forced.** The stamp fingerprinted
the literal, so deleting one required deleting the other. The export is now
`format: 2`. Keeping the fields would have been **worse** than dropping them:
with nothing to hash they could only be null, and a naive restore comparison
reads `null == null` as a match — turning rule 9's guard into a rubber stamp,
the exact failure it was written to prevent.

---

## Phase 4 — async boot, measured first

Max asked to checkpoint here, and asked for the measurement before the design.
Both were the right calls.

| | Before | After |
|---|---|---|
| Wall clock, 9 reads | ~915 ms | **181–333 ms** |
| Sequential round trips | 7 | **1** |

**Bytes were never the problem.** Supabase serves gzip: the whole payload is
**~36 KB on the wire** (259 KB decoded), 25 KB of it `ingredients`. *Latency*
dominates, and each sequential `await` is a full round trip on a phone.
Extrapolated: ~525 ms → ~225 ms on good 4G, ~3.0 s → ~1.2 s on 3G. That 4× is
what makes an honest loading state honest rather than an apology.

**The two schema probes are gone.** Each cost a round trip purely to ask "does
this column exist". Naming the columns explicitly in the real query answers the
same question — it errors exactly when the column is missing.

**The boot gate** covers the tabs until data lands. It is deliberately **not**
the splash: `index.html` skips the splash on a same-session refresh and gives up
after 3 s, so both a warm refresh and a slow fetch would have revealed an empty
app. The gate is keyed to the data and has no timeout. First boot only — a
full-screen overlay over a working app on every pull-to-refresh would be worse
than the problem — but a later *error* still surfaces. Offline and misconfigured
say different things, because they send the user to different fixes.

### Playwright went red, and the app was right

38 of 91 specs began timing out. Every spec aborted all off-origin requests —
**including the supabase-js CDN script** — leaving `SUPA` null. Under v107 that
silently rendered the hardcoded literal; under v108 it is a genuine failure the
app now reports, so the specs sat behind the error overlay until they timed out.

`tests/visual/_boot.js` replaces all 29 abort-everything call sites with a fake
Supabase client installed before app.js, so the **real** boot path runs against
fixtures. Per-table behaviour was chosen to preserve each spec's existing
seeding, so no spec needed rewriting.

---

## Phase 5 + 5b — writes get loud, localStorage stops being a store

**A failed write is never quiet again.** The defect this batch exists to remove
was never that offline happens — it was that offline failed *invisibly*: a price
edit vanished with no word, under a green banner. Two causes:

1. `pushWrite`'s `!navigator.onLine` branch set a quiet banner and **suppressed
   the toast**, reasoning the write was "saved locally". With localStorage no
   longer a data store that is false, and it was always half-false because
   nothing ever retried.
2. `if(!SUPA) return Promise.resolve(null)` returned a null that read as
   **success** to any caller testing `!res.error`.

v40's lesson is kept deliberately: **still no pre-skip on `navigator.onLine`**.
It false-reports in installed PWAs. We attempt and judge by the outcome;
`navigator.onLine` only words the message, where being wrong is free.

**`reconcileLocalOnly` deleted** — the batch's biggest simplification. It healed
one wound: dropped-silent offline writes meant a local-only row might be a real
dish. Both halves of that premise are now false. Keeping it would have been
actively harmful: against the empty-but-successful read an RLS fault produces,
it would resurrect every local row and re-push it, turning a permissions problem
into a data-integrity one. This is the heal-vs-purge collision the 26 Jul audit
said had no clean resolution without a write queue.

**`ing_price_log` moved to the server** — the one dataset with no server
destination at all. Read in the same single batch; the 9th query, still one
round trip.

**`overrides` → `productsById`**, owed since phase 2. `setOverride` →
`setProduct`. The localStorage *key* is untouched — hard rule 3.

**5b:** eleven load/save mirror pairs, three settings mirrors and eight dead key
constants retired. What remains in localStorage is exactly the brief's list:
`currentMenuId`, `dashScope`, `dashRange`, `lastTab`, `plateDraft`,
`lastImport`, `insightCache`, two AI toggles, theme, two dismissals.

### A deliberate trade, not an oversight

The `loadX` functions are deleted outright. The **`saveX` functions are gutted
but kept**, each with a one-line comment naming what persistence now is. They
have ~50 call sites; emptying the bodies is what matters for correctness, while
collapsing 50 call sites is a large mechanical diff whose only benefit is
tidiness — and four of them are the sole body of an `if`, where careless removal
leaves a dangling branch. In a repo where a broken deploy costs money that is
the wrong risk to take for neatness. It is item 2 on the outstanding list.

### The jsdom trap, worth recording

`smoke.js` asserts synchronously and has no server, so it injects what
`bootstrapSync` would have delivered. That injection must be **concatenated onto
app.js and evaluated with it**. `productsById` / `savedPlates` / `customMenu`
are top-level `let`s — global *lexical* bindings — and jsdom gives every
`window.eval()` call its own lexical environment. So `w.productsById = x`
silently creates an unrelated window property, and a second
`w.eval('productsById = x')` cannot reach the real binding either. Verified, not
assumed. The same trap is already recorded against `byId` from v91 — **that is
twice**, which makes it a repo fact.

---

## Phase 6 — D3, and deletion means one thing

**The tombstone lists are gone.** They existed to make deletion survive a
hardcoded base layer that re-added the row, and `reconcileLocalOnly`, which
needed telling which absences were deliberate. Both are deleted, so a tombstone
became a second, weaker way of saying "deleted" — the third category the brief
rules out.

**The guard, and why it is not scope creep.** Until v108, `deleted_prod_ids`
filtered at *render* time and the row stayed, so "deleting" a product could not
break a plate that costed from it — every reference still resolved. **That
property was accidental and undocumented**, and a real DELETE removes it. The
chain is plate → ingredient → product, so the damage lands on plate **costs**: a
dangling pid makes a line cost nothing and the plate quietly gets cheaper. That
is the worst shape of bug available in a costing app, because the number still
looks like a number and the margin still shows green.

`productRefs(pid)` checks **both** live paths — ingredient→pid and
plate-line→pid. Of Max's 179 plate lines, **81 take the first and 84 the
second**, so a guard walking only one would miss half of them and would look
correct in every test written against the other half.

The delete now **refuses** and names what breaks, rather than a generic "are you
sure". Refusing beats a scary confirm because the fix is work the user has to do
anyway: an ingredient must point at *some* product, so repointing it first is
the correct next step, not an obstacle.

The old confirm copy promised *"It won't change plates you've already saved."*
That was true only because of the accident above, and would have become a lie
the moment this shipped.

---

## Pins retired, and why (the brief asked for this explicitly)

| Pin | Why it died |
|---|---|
| 3 × v106 fingerprint tests | Pinned that the export was a delta and the hash tracked the literal. Both premises gone. |
| 4 × `reconcileLocalOnly` heal tests | Pinned behaviour deliberately removed. The **ordering** contract in the same file survives untouched. |
| `is_custom` derived from `BASE_IDS` | Both halves died with the literal; replaced by a round-trip pin. |
| smoke: `ing_price_log` / `supplier_mem` cold-boot | **Inverted.** Both are server data now; a cold boot correctly holds none. The v107 empty-read guard is untouched and still pinned properly in `smem-sync-guard.test.js` — that is about a read that *returned*, not a boot that hasn't happened. |
| settings: "+ the localStorage mirror" | The target drives every suggested price; a second copy with no way to tell its age is the disease. |
| terminology inversion guard | Lost `KINGKEY` and the localStorage literal, **kept the Supabase key** — the stronger contract and the one a rename would corrupt. Deleting a store is not what that guard exists to catch. |
| settings: tombstone lists in the backup | Restoring hidden-but-present rows would reintroduce the concept the app just dropped. |

**Added:** `row-boundary` (18), `boot-gate` (8), `product-delete-guard` (7),
`v108-boot.spec` (3 browser).

---

## Needs Max's phone — and this list is a different KIND

Every previous list was visual. This one is behavioural, and none of it can be
checked from here.

1. **The cold-start penalty.** The first request after idle measured
   **~1,138 ms**, against 79–152 ms warm. With week-long gaps that is the
   **normal** case, and it lands on top of the boot gate. This is the single
   most important thing to feel.
2. **Does the gate read as honest, or as broken?** It is the first thing the app
   shows now.
3. **Does the offline message arrive when the signal actually drops** — not just
   when `navigator.onLine` says so? That flag is unreliable in installed PWAs,
   which is why nothing pre-skips on it.
4. **Does a refused product delete explain itself** well enough to act on?
5. **Take a fresh `format: 2` export** once v108 is on the phone. The 2 Aug
   format-1 file is the fallback until then.

Carried: the whole v82–v104 UX sequence, still not device-verified.

---

## Deliberately NOT built

- **The restore importer.** Its own brief, and now well-defined by hard rule 9
  plus `stamp.format`.
- **Unique ID generation**, auth, RLS policy work, multi-tenant anything — out
  of scope per the brief, and harmless with one user.
- **A retry queue.** This batch exists so one isn't needed.
- **The Products-tab price-log gap** (item 4). Found during this batch, real,
  and its own change.
- **Collapsing the ~50 `saveX()` call sites** (item 2).
