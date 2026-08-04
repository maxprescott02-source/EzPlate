# HANDOVER v111 — housekeeping pass

**Date:** 4 Aug 2026 · **Branch:** `chore/v111-housekeeping` · **Base:** `53c4778`
**Brief:** `~/Downloads/ezplate-opus-housekeeping.md` (four strands, one pass)

Behaviour change intended: **none for any input reachable today.** The one
exception is deliberate and worth stating precisely: the new `applyTidy` guard
**rejects a field outside category/brand/supplier and surfaces a toast**, where
before it would have written the column. No such field can currently be produced
— the only source is a `<select>` with exactly those three options — so no
reachable behaviour moved. Everything else below is deletion, one comment block,
and corrections to `CLAUDE.md`.

---

## Baseline, verified before starting

`npm test` **614 green** · Playwright **94/94** · `node -c js/app.js` clean · six
version spots all agreeing at v110.

**The first finding was in that baseline.** `CLAUDE.md` said `origin/main` was at
`a524d48`; it was at **`53c4778`** — PR #51 had merged after that line was
written. Second time in three batches. The bullet warning about this was itself
stale, which is the joke and also the point.

---

## Strand 1 — the `saveX()` call sites

### The enumeration (reported before building)

**35 call sites, not ~50.** Nine empty no-op functions:

| function | call sites | of which boot-read |
|---|---|---|
| `saveProductCache` | 3 | 1 |
| `saveKitchenLS` | 2 | 1 |
| `saveCustomMenu` | 6 | 1 |
| `saveMenus` | 3 | 1 |
| `savePlatesLS` | 10 | 1 |
| `saveHistory` | 2 | 1 |
| `saveMenuHistory` | 2 | 1 |
| `saveMenuPriceLog` | 2 | 1 |
| `saveSupplierMem` | 5 | 1 |

Nine sites were `bootstrapSync` read-path — correctly pushless. 26 were
mutations. (One of the 35, in `doDeleteMenuItem`, disappeared with strand 2
before strand 1 reached it; that function was dead.)

### The safety question, and its answer

The reason to read all 26 rather than delete on sight: a `saveX()` sitting where
a server push *should* be would be a silently dropped write wearing a no-op as
camouflage. **None was.** The nine sites with no push on the same line all push
via the enclosing `forEach` (3 sites) or a sequenced helper
(`dbPushMenuAfterPlate`, `dbDeleteMenu`).

**Verified by reading each site.** What would falsify it: a mutation site whose
enclosing function can return before its push runs. I found none.

### Why v109's shape does not generalise

The brief asked directly, and told me not to assume. v109 folded `logIngPrice`
into `setProduct` because a **real side effect** was being forgotten at call
sites and a choke point already existed to hold it. Here there is no side effect
to fold — the bodies are empty. Folding has no target. The fit is deletion.

### What deletion cost, and what was preserved

- **Five sites were the sole body of an `if`** (`CLAUDE.md` said four). Removing
  those `if`s stranded four locals — `changed` ×2, `touched`, `before` — all of
  which existed only to feed the condition. Behaviour-neutral only because no
  condition has a side effect; checked individually.
- **The nine comments were the only surviving record of which dataset persists
  via which `dbPush*` helper.** That map now lives in one block above
  `pushWrite`, which is the gateway all of them go through. Losing it was the
  only real cost of the deletion, so it was the one thing kept.
- **`saveIngLog` and `saveKitchenIngredients` are NOT no-ops** and survive.
  Deleting by prefix would have dropped a real `ing_price_history` flush.

### The one call site whose shape changed

`logAllMenuPrices` went from

```js
if(logMenuPrice(m.id, m.price)){ changed=true; if(menuPriceHistSupported) dbPushMenuPrice(...); }
```

to

```js
if(logMenuPrice(m.id, m.price) && menuPriceHistSupported) dbPushMenuPrice(...);
```

**The operand order is load-bearing.** `logMenuPrice` MUTATES `menuPriceLog`;
swap the operands and it is short-circuited away whenever the table is missing,
losing the in-memory series silently. `tests/housekeeping.test.js` pins the
order by running the function with `menuPriceHistSupported=false` and asserting
the log was still written — a test that merely found both names on the line
would pass either way.

---

## Strand 2 — dead code

### The enumeration

**31 deleted, not 6.** The 26 Jul inventory predated three batches that deleted
code, so it was re-derived rather than trusted: a transitive closure over 523
top-level declarations, converging in 3 rounds because dead code holds other
code alive (`bestNameMatch`→`nameNorm`, `runSearch`→`subseq`,
`simScore`→`itoks`).

- **Retired "did you mean" matcher (7)** — `bestNameMatch`, `nameNorm`,
  `menuScore`, `checkNameMatch`, `showMatchPrompt`, `linkMatch`, `dismissMatch`.
  `#matchPrompt` **does not exist** in `index.html` or the CSS; `renderPlateSuggest`
  replaced it. `linkMatch` would have thrown if reached.
- **Legacy builder API (4)** — `swapLine`, `toggleAlts`, `runSearch`, `subseq`.
- **Superseded handlers (4)** — `doDeleteMenuItem`, `openMenuInBuilder`,
  `editOpenInBuilder`, `plateEditAction`. The v55 delete-choice flow
  (`doDeleteMenuOnly`/`doDeleteEverything`) fully covers the first, and the edit
  modal has no "open in builder" button left. **`doDeleteMenuItem` is the "still
  writing a legacy column" one from the 26 Jul audit** — it read and nulled
  `sp.menuId`.
- **Superseded invoice scorers (3)** — `simScore`, `itoks`, `matchScore`.
- **Orphans (10)** — `matchMenu`, `currentMenuPrice`, `plateCostNow`,
  `plateNameVal`, `isPublishedPlate`, `monthKey`, `menuNameFor`,
  `tidyFieldLabel`, `rankPlateMatches`, `pdfTextToCsv`.
- **Exposed by the rule-3 deletion (1)** — `tipText`. See below.
- Plus the two dead first definitions (`aRow`, `renderAnalysis`), and four
  stranded variables (`dismissedMatch`, `SEARCHABLE` and its assignment, a
  nested dead `isiOS`).

**Proof of death:** zero textual references anywhere in `js/app.js` outside their
own bodies, zero in `index.html` (which catches inline handlers built as
strings), and **zero dynamic dispatch in the file** — `window[` and `this[` both
occur 0 times. **None was inside the protected parser region** (hard rule 1).

### Rule 3, verified rather than pattern-matched

The brief flagged the hazard: a "dead" first definition is dead only if nothing
reaches it first. **Verified: both pairs were top-level declarations in one
scope, so hoisting makes the second overwrite the first before any statement
runs.** The first definitions were unconditionally unreachable — not
"dead unless reached". Max approved retiring the rule.

**Retiring it immediately exposed dead code the duplicates had been hiding.**
`tipText` was referenced exactly once, from inside the dead first `aRow` body.
The first closure could not see this: `aRow` had live references (to the second
definition), so its dead body counted as live context. **Re-run a reachability
closure AFTER removing duplicate definitions, not before.** This is now recorded
in `CLAUDE.md`.

**Hard rule 3 keeps its number and is marked RETIRED** rather than deleted —
rules 4–10 are cross-referenced by number in the tests, the restore code
comments and every handover, and renumbering would silently invalidate all of
them.

### `addProduct` — deliberately kept, and why

`addProduct` is dead in the app but is **not** deleted, and this was a judgement
call worth recording rather than a miss.

`plate` is declared `let`, so it is **not a window property** — which makes
`addProduct` the only handle four `fresh-states` specs have on the **pid-line**
shape. pid-lines are live production data (84 of Max's 179 plate lines) that
reach the builder via `loadPlateState`. Deleting it would have traded one line
for the only Playwright coverage of that shape, or forced a rewrite of four
order-sensitive test setups — the brief's own "must not quietly reduce coverage"
rule points the other way. Its comment now says this instead of the vague
"retained for programmatic use".

### `isPublishedPlate` — deleted, coverage checked first

Extracted by `plates-independence.test.js`, whose single assertion sat directly
above `dishesOfPlate(plates[0]).length === 2` — the same fact, pinned twice. The
assertion went with the function. Nothing became unpinned.

### The `applyTidy` guard (proposed, then built — it stayed small)

`applyTidy` writes `productsById[id][col]` directly, bypassing `setProduct`,
which since v109 is the **only** writer of `ing_price_history`. `tidyPlanAll`
takes `field` free and hands it straight back. Today `col` can only be one of
three values because a `<select>` with three options is its source — nothing in
code constrains it. A future field routing a **price** column through here would
move money with no price-log point and no error.

Two lines: `TIDY_COLS` and a refusal that surfaces a toast. The test asserts the
**condition** — a disallowed column writes nothing AND leaves `productsById`
untouched (the guard runs before the patch loop), while a permitted one still
writes exactly as before.

---

## Strand 3 — the brief's premise was wrong

**There was no standing failure. The suite was 94/94 before I touched anything.**
`"v45 item 4: button copy at both breakpoints"` exists at
`fresh-states.spec.js:335` and passes.

The batch's stated reason for existing — *"green currently needs an asterisk"* —
was not true. Reported before building rather than worked around.

Two further corrections:

- The **45** count is right: `fresh-states` 31 + `layout-consistency` 2 +
  `screenshots` 12. But `CLAUDE.md`'s "resolves 45 tests across the three specs"
  was wrong about the suite: it is **94 tests across nine specs**; 45 is only the
  pre-v89 three.
- **"Stale since v72" holds for one of the three.** `fresh-states` and
  `layout-consistency` were both updated in v108 (`dd8bc3d`, 2 Aug). Only
  `screenshots.spec.js` is untouched since v82.

So the deliverable as written — "green with no known-failing test" — was already
met. **Max's call: touch only what strands 1–2 touched.** Two tests changed, both
because the code they extracted moved:

- `empty-states.test.js` — the `LIVE_OCC = { renderAnalysis: 2 }` machinery is
  retired with rule 3; `LIVE_OCC` is now empty and the `occ` parameter survives
  only so a future duplicate can be pinned deliberately.
- `plates-independence.test.js` — `isPublishedPlate` removed, as above.

**What remains genuinely stale is recorded as outstanding item 4, downgraded:**
12 of the 45 are capture-only, and four `fresh-states` setups build a plate
through a door no user has had since v31. None of it is urgent, because a
passing stale test costs nothing per batch.

---

## The stale pin this batch found by accident

`smem-sync-guard.test.js` tracked a `saved` array, pushed to by a stub of
`saveSupplierMem`. Three assertions read `saved.length === 1` or
`deepEqual(saved, [])`.

**That function's real body was empty.** The test asserted *a function was
called* — and the function did nothing — so it could not have failed if the
adoption logic itself were wrong. This is exactly the failure mode the brief
names ("a test asserting 'this path calls the guard' cannot catch a wrong
condition inside the guard"), sitting in the suite unnoticed.

Rewritten to pin outcomes: the surviving memory now has to match `LOCAL`
**field for field**, and the server-wins case asserts the adopted entry equals
the **server** row rather than merely having the right key — which the old
key-set assertion could not distinguish from adopting the local row that
happened to share an id.

---

## Strand 4 — `CLAUDE.md` audited against the code

Every claim checked. **Which role verified what matters (hard rule 10):**
schema and row counts below were read through the **MCP, which connects as
`postgres`** — role-independent facts, safe to read there. **No claim about
whether a statement is *permitted* was re-verified this batch**, because that
requires the client's role and this batch ran no new SQL.

### Corrected above the snapshot line (with Max's explicit yes)

| Claim | Was | Is |
|---|---|---|
| Hard rule 3 | aRow/renderAnalysis defined twice | RETIRED; a test pins uniqueness |
| Hard rule 6 | menus "backed by localStorage `cafeDB_menus`" | that key is gone (v108) |
| Hard rule 6 | "20 of 78 plates carry `menu_id`" | **0** — v110's restore nulled them |
| Hard rule 7 | seeds "only on a fresh install (the `cafeDB_menus` key was never written)" | v108 deleted that test **as a bug**; the signal is whether the `menus` table answered |
| Products | "~400, seeded from `BASE_PRODUCTS`" | 412, from `ingredients`; no literal exists |
| File sizes | app.js ~3000+ / css ~2000 / html ~500 | **6,576 / 2,804 / 819** |

Hard rule 7's old wording described a mechanism v108 **deleted because it was a
bug**: `menusKeyExists` read a key nothing wrote any more, so it returned false
forever and re-seeded "Original menu" on every boot once the user deleted their
last menu — silently resurrecting a deleted menu, in violation of the very rule
the line was in. The code has been right since v108; only the documentation
lagged. A stale comment in `app.js` repeating the old wording two lines above
the corrected one was removed.

### The `plates.menu_id` finding

`CLAUDE.md` said 20 of 78 plates carried a non-null `menu_id`. It is now **0**,
and the cause is v110's own restore: `plateToRow` omits the column, so every
reinserted plate lands with it null.

**Checked whether a real link was lost.** The 4 Aug `PRE-STEP2` backup already
showed 0 plates carrying `menuId`, and the one dish with no plate link
("Cheese & Ham Toastie GF", `ummrq8xbur`) had **no plate pointing back at it**.
So nothing resolved through those values and nothing was lost — `plateIdOf`'s
`sp.menuId` last-resort fallback is simply dead in practice for server-loaded
plates now.

**The FK is still live, so hard rule 6's ordering advice is unchanged** — it is
now belt-and-braces rather than load-bearing on the data. The pinning test in
`restore.test.js` had the stale 20-of-78 number in its comment; corrected there
too, with the reasoning that the CONSTRAINT is what the test protects, not the
values.

### Confirmed unchanged

Protected-region anchors (both present, exactly one each) · the four
never-touch functions · both third-party pins (supabase-js 2.110.8, pdfjs-dist
3.11.174) and their SRI · the five `where true` deletes and `security invoker`
in the restore migration · `plateToRow` still omits `menu_id` · **the 12
localStorage keys, exactly as listed** · `restore_backup` still the only
function in the schema · both FKs live.

### Also stale, corrected in the snapshot

`price_history` 43→**49** (11 with `menu_id`, not 7) · `menu_price_history`
77→**78** · suite 614→**626** · and **`GET /api/parse-invoice?probe=1` was
already removed in v70** — it was listed as an open multi-tenant gate. Only a
key-free `?health=1` remains, reporting the model name and whether a key is
configured, never the key.

---

## Tests

**626 green** (614 + 12), Playwright **94/94** run alone, jsdom smoke green,
`node -c` clean on `js/app.js`, `sw.js` and all four `api/*`.

`tests/housekeeping.test.js` is new. It pins **conditions, not structure**:

- `removeMenuItem` still DELETEs server-side — including for a dish that was
  never in memory, since the `if` that guarded the no-op is gone and the DELETE
  was always unconditional.
- `syncMemoryToProduct` pushes every re-packed phrase after losing its `changed`
  flag, pushes nothing when the pack already matches, and leaves another
  product's memory alone.
- `logAllMenuPrices` — three tests, including the operand-order one above.
- Every deleted name stays deleted; the two real `save*` survivors stay.
- No top-level function is defined twice (the retired rule 3, mechanised).
- `applyTidy` refuses a disallowed column **and writes nothing**, while a
  permitted one still lands.

---

## CodeRabbit

Ran before push, as the standing method requires. All 10 changed files were
reviewed (the two new ones were `git add -N`'d first, per
[[coderabbit-skips-untracked-files]]). Four findings, four decisions:

**1. major — `deletePlate` deletes the plate without awaiting the dish deletes.
REAL, pre-existing, NOT fixed (out of scope).** `removeMenuItem` → `dbDeleteMenu`
and `dbDeletePlate` are both fire-and-forget `pushWrite`s, so the `plates` DELETE
can reach the server before the `menu_items` ones — and
`menu_items.plate_id → plates.id` has no delete action, so that ordering errors.
The same shape is in `doDeleteEverything`. This is exactly what the
"Cross-referencing writes are a SEQUENCE" fragile-area rule exists for, and this
path predates my diff — I only removed a no-op from those lines. **Recorded as
outstanding item 4.**

**2. major — `savePlateRestore` should await `upsertCustomMenu`. FALSE POSITIVE
as stated, but it uncovered a real and worse defect.** CodeRabbit's reasoning was
that `dbPushPlate(sp)` carries the FK reference `sp.menuId` and so must be
sequenced. It does not: **`plateToRow` omits `menu_id`**, so that write carries no
reference and cannot violate the constraint. Sequencing it would change nothing.

But following the pointer found this: `savePlateRestore` creates the dish with
**no `plateId`**, linking it only through `sp.menuId=newId` — the third branch of
`plateIdOf`, and a value that is never persisted for exactly the reason above.
**After a reload the restored dish resolves to no plate.** It reads as uncosted,
and if the user taps it to cost it, `ensurePlateForDish` creates a SECOND empty
plate and orphans the original again. Nothing auto-heals; `ensurePlateForDish` is
reached only from `loadMenuItemBlank`. **Recorded as outstanding item 3**, above
the delete-ordering one, because it silently produces duplicate plates.

This is the batch's clearest argument for the review step: an independent reader
was wrong about the mechanism and still pointed at a real bug, and the thing that
made it visible was v111's own audit finding that `plates.menu_id` is 0 across
the board.

**3. minor — `CLAUDE.md` still described the pre-v108 persistence model. FIXED.**
"Data: **localStorage (offline-first) + Supabase sync**" sat 550 lines above the
rule saying localStorage is not a data store. A seventh correction of the same
class I missed in strand 4, and the reviewer caught it. Corrected with Max's
standing yes for factual corrections.

Reading that paragraph again turned up an **eighth**: the opening section still
said "the data is real and irreplaceable, and there is no restore." v110 shipped
one and it has recovered a real deletion against production. Corrected, with the
caveat that a restore is only as good as the newest export — which is why that
file is named in the snapshot with its size and timestamp.

**4. minor — the handover's "behaviour change: none" overclaimed. FIXED.** The
`applyTidy` guard does change behaviour for a disallowed field; that no such
field is reachable today is the reason it is safe, not a reason to say "none".
The opening line now says so precisely.

## Deliberately NOT built

- **The full 45-test Playwright audit** — Max's call, and the justification for
  it had evaporated. Downgraded to outstanding item 4 with the specifics.
- **The `ing_price_history` unique index** (outstanding 6) — real, but it
  constrains the normal price-logging path too, so it needs its own brief. Still
  0 duplicate pairs as of 4 Aug, so it would apply cleanly.
- **Collapsing `saveIngLog`'s `_ingLogPending` buffer.** It now has exactly one
  producer and one consumer on adjacent lines, so it holds at most one point.
  Reported, not touched — it is a real simplification but it is not housekeeping,
  and it sits on the price-log path.
- **No DB migration.** None was needed; none was written.

## Needs Max's phone

Nothing new. This batch changed no UI, no copy and no behaviour, so it adds
nothing to the device list. The carried items (v108 behavioural sign-off, v82–v104
visual sign-off, the restore UI on iOS Safari) are unchanged in the snapshot.
