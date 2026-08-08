# EzPlate project audit

```
Audit at v125, 9 August 2026 — previous audit v115, 10 merges ago.
```

## Verdict

**The project is healthy.** `npm test` is **799/799 green in 0.86s** (64 files, 0 fail, 0 skipped, 0 todo); Playwright is **103 tests / 12 files** locally and **91 / 11** in CI's hermetic set. Every Tier 1 invariant reachable from the repo verified TRUE, all six version spots agree at 125, and the protected parser region is **byte-identical to v115** (md5 `3a630b5823933c8b82008787a54a7943`, 15,232 bytes) — ten deploy versions and five whole-screen redesigns went past it without a scratch. The Q2–Q6 redesign batches kept every pinned contract: all 7 named ids, all 11 named render functions, `data-mid`/`data-pid`/`data-scope`/`data-tab`, the `lt-*`/`st-*` classes and the `.mi-row` delegate are intact.

**The single most important thing to address: `CLAUDE.md` Tier 3 tells every batch it may apply migrations to production because staging exists, and staging has never once worked.** The rule that stopped for Max was retired *on the strength of staging*, and the replacement safeguard ("Staging first, then production") is stated as available in the file that is in context on every message. `docs/QUEUE.md:206–210` knows it is unavailable; `CLAUDE.md` does not say so; and `supabase/migrations/20260808_menus_rls.sql:7–8` — which Tier 3 designates as the audit trail — asserts staging "is reachable from the next session on", a prediction the queue records as **disproved**. Two of the three sources are wrong, and the one that is right is the one a batch reads least often.

**Coverage:** all six handovers 123–128 read in full, plus v116–v122 and keyword grep across all 81. **No Supabase MCP tool was available to this session** (neither production nor staging), so every claim needing a live database read is marked UNVERIFIABLE rather than assumed. Note that the v115 audit's addendum verified the three foreign keys against production on 8 Aug 2026 — one day ago — so those are fresh.

---

## 1. Invariants

| Invariant | Result | Evidence |
|---|---|---|
| Protected parser region, both anchors | **TRUE** | `js/app.js:5628` (`var INV_EXCLUDE=`), `js/app.js:5854` (`function unitLabelFor(`); sliced at `tests/_extract.js:67` |
| Protected region **unchanged since v115** | **TRUE** | md5 `3a630b5823933c8b82008787a54a7943`, 15,232 bytes, identical at `76f458d` and `HEAD`. No prior handover recorded a hash — **recording this one for the next auditor** |
| No twice-defined top-level name; test asserts **absence** | **TRUE** | `tests/housekeeping.test.js:182–192`; `assert.deepEqual(dupes, [])`. Only `renderPlate`/`renderPlateSuggest`/`renderPlatesTab` share a prefix — three distinct names |
| `data-tab="pantry"` labelled "Ingredients" | **TRUE** | `index.html:798` |
| `data-tab="ingredients"` labelled "Products" | **TRUE** | `index.html:796` |
| `data-tab="builder"` labelled "Plates" | **TRUE** | `index.html:800` |
| Two inversion guards exist | **TRUE, but see finding T1 below** | `tests/terminology.test.js:88`, `:102` |
| Six version spots agree at 125 | **TRUE** | `sw.js:2`, `sw.js:5` ×2, `index.html:32`, `index.html:812`, `js/app.js:4291` |
| `resolveMatchedPrice` · `unitCatCategory` · `applySupplierMemory` · `packToUnitCost` present and unrenamed | **TRUE** | `js/app.js:5741`, `:5725`, `:5707`, `:977` |

Three of the four protected functions (`:5707`, `:5725`, `:5741`) sit **inside** the region `5628–5854`, so they are doubly covered. Only `packToUnitCost` (`:977`) is protected by the rule alone — unchanged from v115.

**T1 — the inversion guard cannot fail for the failure it names.** *(consequence: high — this is the project's #1 rollback-causing trap)*

`tests/terminology.test.js:102–105` is:

```js
assert.match(html, /data-tab="pantry"/, 'the tab LABELLED "Ingredients"');
assert.match(html, /data-tab="ingredients"/, 'the tab LABELLED "Products"');
```

It asserts only that both `data-tab` strings appear **somewhere** in `index.html`. It never asserts the crossing. A terminology pass that swapped the two `<span class="nl">` labels — the exact "fix" Tier 1 forbids, and the one it says "a terminology pass is exactly when someone is tempted" to make — leaves both attributes present and **the suite stays green**. The assertion messages claim knowledge the assertions do not check. The `aria-label` attributes (`index.html:796`, `:798`) are unpinned too, and `tests/smoke.js:338` pins only `data-tab="builder"`.

The sibling guard at `:88–100` is sound — it pins the internal identifiers and the `'kitchen_ingredients'` settings key, which catches a *rename*. Nothing catches a *swap*. Recommend the guard assert label-and-attribute together on the same element.

---

## 2a. `CLAUDE.md` claims, verified one at a time

### Verified TRUE

| Claim | Evidence |
|---|---|
| `rowToMenu` maps a DISH despite the name | `js/app.js:163`; warning restated at `:177–179` |
| Columns are `menu_id`/`plate_id`/`source_plate_id`/`is_custom` | `js/app.js:166–168` (`menuToRow`) |
| `buildBackup` dumps camelCase `menuId`/`plateId`/`sourcePlateId`/`custom` | `js/app.js:4477`; `rowToMenu:163` produces exactly those four |
| `stamp.format` is 3, and any `bootstrapSync` change must bump it | `js/app.js:4464–4471`, rule at `:4466` |
| `parseBackupFile` accepts 2 and 3, refuses 1 by name | `js/app.js:4538`, `:4545`, `:4553` |
| `plateToRow` omits `menu_id`; `tests/restore.test.js` pins it | `js/app.js:175`; `tests/restore.test.js:386` — *"a restored plate carries NO menu_id — the plates/menu_items FK is CIRCULAR"* |
| `kitchen_ingredients` and `settings` have no row mapper; boundary is the SETTING KEY | `js/app.js:270` (`dbSetSetting`), `:642`, `:4515–4517` |
| `isFinite('')` guard is `typeof` **then** `isFinite`, kept separate | `js/app.js:1507`, `:1532`, and four more; `tests/price-log-paths.test.js:244` pins it by name |
| **`setProduct` is `ing_price_history`'s sole writer** | Traced end to end: `dbPushIngPrice:1487` ← `saveIngLog:1482` ← `_ingLogPending:1513` ← `logIngPrice:1503`, whose **only** call site is `setProduct:612`. All 11 `ing_price_history` hits checked; the only other is the boot read at `:398` |
| Its condition is the PREVIOUS STORED price; two guards not merged | `js/app.js:603–614` (stored) vs `:1510` (last logged); reasoning at `:598–602` |
| Product creation logs a first point on purpose | `js/app.js:610–612`, `had==null` arm |
| `ingredients.updated_at` is never read | 0 readers in `js/app.js`, `api/`, `tests/`. The only `updated_at` write is `supplier_phrases` (`:213`) |
| Five history series, all five live | `priceHistory` 20 · `menuHistory` 11 · `menuPriceLog` 10 · `ingPriceLog` 13 · `changeLog` 9 |
| `menu_change_log` records what MAX did; the line is a function not a list | `js/app.js:183–186`, `:1536–1558` |
| `avgBefore` must be read BEFORE the mutation | `js/app.js:7042` (`doDeleteMenu`), `:1272` (`saveCurrentPlate`), `:7328` — all read first |
| **`doDeleteMenu`'s comment claiming an FK violation is wrong** | `js/app.js:7039`: *"dishes already gone, so the menu_items.menu_id FK can never be violated"*. The FK is SET NULL. **The claim holds** — note the *other* comment at `:7045–7049` states the SET NULL behaviour correctly, so the file contradicts itself six lines apart |
| Circular FKs constrain the restore; `plateToRow` correct by design | `js/app.js:171–175`; `tests/restore.test.js:386` |
| `plateIdOf` / `plateForMenuItem` / `dishesOfPlate` / `menusOfPlate` all live | `js/app.js` — 1 definition each, 10/10/4/8 uses |
| Cross-referencing writes are a sequence; both helpers exist and return their writes | `dbPushMenuAfterPlate:5254` (called `:1335`, `:5396`, `:5441`, `:7124`), `dbDeletePlateAfterDishes:5275` (called `:5173`, `:7374`) |
| `gemToken` MUST be bumped by the watchdog | `js/app.js:6522` — `gemToken++; // VOID this request` |
| `invConfirmState` is the pure decision; `gemApplyReadings` live | `js/app.js` — 6 and 3 references |
| `productRefs(pid)` checks BOTH paths | `js/app.js:2077–2087` — `l.pid===pid \|\| kids[l.kid]` |
| `publishPlan` is the ONE publish decision, shared by both submitters | `js/app.js:1318`; called from `submitMenuItem:5412` (at `:5431`) and `submitAddDish:7113` (at `:7119`) |
| `renderUnlinkedPrompt` reads `.unlinked` | `js/app.js:5355`, reading at `:5362` |
| Auto-tick: only `invRowState === 'matched'` pre-ticks | `js/app.js:6344`, `:6414`, `:6430`, `:6441` |
| `.muted-row` hiding scoped to `.is-new` | `js/app.js:6296–6297`; `css/style.css:835`, `:841–842`, `:1589–1592` |
| Full-row re-render only; tint from `invRowState` via `st-*` | `js/app.js:6297`; 31 `st-` references in app.js, 65 rules in css |
| `tidySupplierMemMigration` rebuilds keys from `phrase_norm`; `memKey` off supplier NAME | `js/app.js` — 3 and 8 references |
| Chart colour target-anchored; the revert-catching pair exists | `tests/trend-reframe.test.js:86` (rising-under green) and `:93` (falling-over red), both green |
| `addProduct` dead in app, kept only for `fresh-states` | `js/app.js:751` with its reason at `:752–755`; **exactly five** call sites, all in `tests/visual/fresh-states.spec.js:53, 165, 271, 272, 491` |
| Playwright is not in `npm test` | `package.json:7` — `node --test tests/*.test.js` |
| `where true` is load-bearing on the restore's deletes | `20260803_restore_backup_fn.sql:76–83`, `20260806_restore_backup_v3.sql:97–107` |
| Every Supabase write goes through `pushWrite`; `pushWrite` returns its settled promise | Every `SUPA.from(...)` outside `pushWrite` is a `.select()` in `bootstrapSync` (`js/app.js:390–402`). No raw write exists |
| `nextKid()` scans the live array | `js/app.js:643` |
| `fallbackMenuId()` never returns a deleted id, null on zero menus | `js/app.js:1074–1077` |
| Menu deletion unlinks plates, never deletes them; zero menus legitimate | `js/app.js:7037–7043`, `:1062–1064`, `canDeleteMenu:1078` |
| Custom ids are `CX*` | `js/app.js:6769` |
| Four hand-written client files, no build step | `js/app.js` 7594 · `css/style.css` 3128 · `index.html` 863 · `sw.js` 42; `package.json` has no build script |
| Both third-party scripts pinned exact + SRI; pdf.js worker pinned only | `index.html:809–810` (supabase-js 2.110.8); `js/app.js:5464–5472` (pdfjs 3.11.174), worker exception documented at `:5468–5469` |
| No third dependency added | `package.json` devDependencies: `@playwright/test` only |
| `api/_*.js` ignored as routes and hold the testable logic | `api/_gemini.js`, `api/_insight.js`; routes `insight.js`, `parse-invoice.js` |
| Money law: server rejects a phrasing with a number not in the facts | `api/_insight.js:15–22` (`factNumbers`), `:79` (`validatePhrasing`) |
| `docs/` is off the origin; `CLAUDE.md` stays at root and is excluded | `.vercelignore` — `docs/`, `CLAUDE.md`, `skills/`, `tests/`, `supabase/`, `.github/` all listed |
| `.mcp.json` carries both projects; staging is `supabase-staging` | `.mcp.json` — production `izrnptxhdylllodvglla`, staging `pboidoxjghntalovzrke` |
| `code-review.yml` on demand only, `deep-review` label, a refusal fails the job | `.github/workflows/code-review.yml:14`, `:29–30`, `:64–65`, `:107` |
| `skills/` holds the named skills; `verify` covers the client-role procedure | `skills/{batch,cache-version,decide,handover,verify}`; `skills/verify/SKILL.md` |
| Every handover states its deploy version or says it shipped none | v116–v128 all do (v118 states the 115→118 bump and why two numbers were skipped) |
| `docs/handovers/README.md` explains the gaps | `README.md:19–31` — v41, v65, v66 |

### STALE or WRONG

**S1 — Tier 2 states a plate line shape that 84 of 179 live plate lines contradict.** *(consequence: high)*

> `CLAUDE.md` Tier 2 → Data and storage: *"Plates persist `{kid, qty}` only; kitchen-word renames are display-only."*

`js/app.js:1265` — the one writer of `plate.lines` — persists **three** shapes:

```js
var lines=plate.map(function(l){ return l.misc?{misc:true,label:l.label||'',cost:Number(l.cost)||0}:(l.kid?{kid:l.kid,qty:l.qty}:{pid:l.pid,qty:l.qty}); });
```

And `js/app.js:753`, inside the `addProduct` trap in Tier 1's own subject matter, states the count: *"pid-lines are live production data (84 of 179 plate lines)"*. `lineProduct:648–652` resolves both, `loadPlateState:5047` reads all three, `productRefs:2082` checks both.

So `CLAUDE.md` contradicts `CLAUDE.md`: Tier 1 keeps a dead function alive **because pid-lines are real**, while Tier 2 says they do not exist. The word "only" is doing the damage — it invites an importer, a restore path or a refactor to drop `{pid,qty}` and `{misc,…}` lines silently, on the authority of a hard rule. This is the same failure class as the row-boundary trap (76 of 77 dishes lost), and the already-queued `isBuilderDirty` item is a live symptom of exactly this shape. The true statement is that *new* lines are written as `{kid,qty}`.

**S2 — `ensureDefaultMenu`'s stated condition is still not in the function.** *(consequence: medium — unchanged since v115, still open)*

> Tier 2 → Menus: *"`ensureDefaultMenu` seeds "Original" only when the `menus` table did not answer at all."*

`js/app.js:1073` seeds whenever the array is empty and knows nothing about whether the table answered. The gate is at the call site, `js/app.js:457–459`. The mitigating comment the v115 filer noted still exists, now at `js/app.js:1070–1072`. The seeded name is `'Original menu'`, not `"Original"`. **Queued and blocked on Max since 8 Aug** (`docs/QUEUE.md:134`); carried forward unchanged, no new evidence.

**S3 — the `where true` rule is still filed under "the one that bites while editing code".** *(consequence: low — misdirection)*

Unchanged since v115. Every `.delete()` in `js/app.js` is `.eq()`-scoped; the `where true` lines are SQL. Queued and blocked (`docs/QUEUE.md:135`).

**S4 — the builder-modal rule is still in the future tense, and its "meantime" has now expired twice over.** *(consequence: medium, and rising)*

> Tier 2 → Fragile areas: *"**The builder becomes a MODAL (Max, 8 Aug 2026)** … the builder is converted first, the dropdown placement work second. … Do not "fix" a dropdown against the page layout in the meantime."*

The builder has been a modal since v54 (`openBuilder()` → `show('builderModal')`; `index.html` `#builderModal` present) — and since this sentence was written, **Q6 has shipped the builder's redesign as `ezplate-v125`**. Both halves of the ordering are satisfied. The sentence still reads as work outstanding and still forbids the dropdown work. Queued and blocked (`docs/QUEUE.md:136–138`), but the queue's suggested replacement wording predates Q6 and no longer goes far enough.

**S5 — Tier 3 presents staging as an available safeguard.** *(consequence: high — the lead finding; detail in C1 below)*

**S6 — a nuance, not a defect: `track_progress` is now conditional.** `CLAUDE.md` says *"The fix is `track_progress: true` and `show_full_output: true`."* The workflow has `track_progress: ${{ github.event_name == 'pull_request' }}` (`.github/workflows/code-review.yml:217`) with 15 lines explaining why `workflow_dispatch` must not set it. The instruction to *check the two inputs are still on the workflow* is satisfiable and the file self-documents. Recorded so a future auditor does not re-raise it.

**S7 — one soft spot in "localStorage holds view preferences and derived caches ONLY — never data."** Twelve keys enumerated; eleven are preferences or caches. The twelfth, `cafeDB_plateDraft` (`js/app.js:1146`), holds a user's unsaved plate — authored content that exists nowhere else until saved. It is deliberate, documented at `:1141–1145`, and eight versions old. The rule says *"if something new resists that classification, ask: there is no third category"* — this one already resisted and was resolved silently. Worth naming as the known exception so the next batch does not re-derive it.

### UNVERIFIABLE from this session

**No Supabase MCP tool was available** — not production, not staging.

| Claim | Status |
|---|---|
| Three FKs and their ON DELETE behaviours | Verified against production 8 Aug 2026 (`AUDIT-v115.md` addendum) — **1 day old, treat as fresh** |
| `ingredients.updated_at` carries one timestamp on every row | UNVERIFIABLE |
| `safeupdate` rejects WHERE-less DELETE/UPDATE for `authenticator` but not `postgres` | UNVERIFIABLE; measured and recorded at `20260803_restore_backup_fn.sql:83` |
| Anon UPDATE/DELETE returns 204 with no error | UNVERIFIABLE; recorded at `20260808_menus_rls.sql:16–18` |
| `list_migrations` is empty | UNVERIFIABLE |
| `kitchen_items` exists with 0 rows | UNVERIFIABLE (queue item) |
| Whether staging is reachable **today** | UNVERIFIABLE — no MCP namespace of any kind in this session, so this session cannot distinguish "staging broken" from "no MCP configured for me". The queue's 8 Aug diagnosis stands with no evidence of a retry |

---

## 2b. Dead traps recommended for removal

**None.** All **16** Tier 1 entries were checked by going to find their subject:

- **Live code, still reachable:** naming inversion · `isFinite('')` · protected parser region · row boundary / `buildBackup` · cross-referencing writes · gating the last committing action · `productRefs` + `publishPlan` · five history series · `addProduct`.
- **The "trap worked, a test enforces its absence" shape — must stay:** the duplicate-definition entry. `aRow` and `renderAnalysis` are single-definition; `tests/housekeeping.test.js:182` fails on any new duplicate. Deleting the entry would remove the reason the test exists.
- **Decisions, true regardless of the code:** per-publication counting · the client's role is not the MCP's role · the three foreign keys · the absence of a back-pointer · chart colour anchored to target · `ingredients.updated_at` is not history (a prohibition — 0 readers is the trap *working*, not the trap being dead).

Tier 1 is still earning its context cost. **This is the second consecutive audit to recommend no deletions**, which is worth noting: the pruning check keeps coming back clean, so the risk it guards against has not materialised here yet.

**One to watch, unchanged from v115:** the `addProduct` trap depends entirely on `fresh-states.spec.js`. The queue item that would retire that spec (`docs/QUEUE.md:255–265`) still carries the coupling warning. Still correct, still open.

---

## 2c. Contradictions

**C1 — staging: three sources, two of them wrong, and the wrong ones are the ones a batch reads.** *(the lead finding)*

- `CLAUDE.md` Tier 3 → Migrations: *"**Staging first, then production.** `.mcp.json` carries both projects; staging is `supabase-staging`. Rehearse there, then apply to production."* — stated as an available, mandatory safeguard, in the file loaded on every message.
- `supabase/migrations/20260808_menus_rls.sql:7–8`: *"Staging is now IN .mcp.json as a second server and is **reachable from the next session on** — this was the last migration that could not be rehearsed."*
- `docs/QUEUE.md:206–210`: *"the staging MCP server **does not load**. Verified 8 Aug 2026, in a session AFTER the one that added it … v121 predicted it would be 'reachable once the MCP reconnects next session'. **It was not**, so that prediction is now disproved … ⚠️ Until it resolves, every migration still goes straight to production with no rehearsal."*

**The code supports the queue.** `.mcp.json` does list both servers, so the configuration claim is literally true and that is exactly what makes it misleading — the file that carries the safeguard cannot tell you the safeguard does not run. Tier 3 also says *"The safeguards are not optional — the old rule's protection has to be replaced, not just deleted"*, and the hand-run stop condition was retired **on the strength of staging existing**. It exists as a URL and not as a capability. The migration header compounds it: Tier 3 designates migration files as the audit trail, and this one contains a forward-looking claim that has since been disproved, in a file nobody will re-read.

**C2 — `docs/QUEUE.md` violates the `Do after:` rule it wrote one batch earlier.**

- `docs/QUEUE.md:16`: *"**`Do after:` is deleted the moment it is satisfied**, and that is the point of it rather than housekeeping. … A line naming a finished item is stale by construction, so it gets noticed."*
- `docs/QUEUE.md:227` (Floating layers and mobile dropdowns): *"Do after: **Q6** — every screen a dropdown opens over is being restructured by the redesign."*

**Q6 shipped as `ezplate-v125` on 9 Aug** and sits in the done list at `docs/QUEUE.md:367`. The convention was invented specifically because the dropdowns item had spent two years behind a dependency satisfied in v54 — and the very first time it came due, it was not deleted. The mechanism works only if someone acts on it; nothing does. All other `Do after:`/`Do with:` lines (Q8 ×2, Q10 ×3) are genuinely unsatisfied.

**C3 — `docs/PHONE.md` tells Max a fixed bug is still a known bug.**

- `docs/PHONE.md:152–153` (v102 block): *"the queue's 'builder plants a draft just from looking' bug lives exactly here. **If the resume prompt greets you after a look-only visit, that is the known bug, not a new finding.**"*
- `docs/PHONE.md:28–31` (v118 block, higher in the same file): *"The old build planted a draft on that second visit … Chromium says it is fixed … **Failure: the prompt still appears after a look-only visit.**"*

**The code supports v118.** `savePlateDraft` asks `isBuilderDirty()` (fixed in v118, `docs/QUEUE.md:420–424`). One block asks Max to report the prompt as a failure; the other tells him to ignore it. This is the same shape as v115's C3 chip-dots finding, in the same file, one section apart.

**C4 — two device checks describe screens that no longer exist, and both handovers said so without fixing it.**

- `docs/PHONE.md:146` (v102): *"Plates cards: 16px radius + 8px seam"* vs `HANDOVER-126:10`: *"The Plates library's card grid became **one surface of rows**"* — and `HANDOVER-126:21` explicitly: *"the standing v102 Plates block in `docs/PHONE.md` now describes the OLD card grid."*
- `docs/PHONE.md:140` (v103): *"Ingredient cards with the price column at 380px"* vs `HANDOVER-127:10`: *"The Ingredients card grid became one surface of rows"* — and `HANDOVER-127:23` says the same thing about the v103 block.

**The code supports rows** (`#plateList`- and `#kingList`-scoped CSS, v123/v124). Both batches noticed, wrote it in the write-once diary, and left `docs/PHONE.md` — the file Max actually works from — describing the old UI. A handover is not a landing place.

**C5 — the Playwright count is quoted three ways.**

- `docs/QUEUE.md:70` (standing rule for every redesign item): *"`npm test` **and** the 102 Playwright specs green per batch."*
- `HANDOVER-128:7`: *"**103** Playwright green (one new spec)."*
- `.github/workflows/test.yml`: *"Latent today (**9 specs, 8 survive the filter**)"* and *"Measured locally: 2.1 min at 2 workers vs 3.9 min at 1, for **88 tests**."*

**Measured now:** 103 tests / 12 files locally; **91 tests / 11 files** in CI's hermetic set. All three numbers are stale, in three different directions. The CI comment matters most: it is attached to the fail-closed guard whose whole point is that the spec list must not silently include `screenshots.spec.js`, and it now understates the file count by three.

**C6 — `docs/QUEUE.md` says the redesign package is not in the repo. It is.**

- `docs/QUEUE.md:44–46`: *"It arrived as `~/Downloads/…zip` and **is NOT in the repo**. It must land in **`docs/design/`** … **committing it is the first action of Q2.**"*
- Reality: committed in Q2 (`e9bf902`) at **`docs/design_handoff_ezplate_redesign/`** — 12 files, exactly as described.

The instruction was carried out; the header was never updated. Substance is fine (it is under `docs/`, so `.vercelignore` keeps it off the origin) but the path differs and the "NOT in the repo" claim is false. Five batches (Q2–Q6) read this header and none corrected it. Q7–Q10 will read it too.

**C7 — `docs/handovers/README.md` points at a `CLAUDE.md` section that was deleted.**

- `docs/handovers/README.md:9`: *"`CLAUDE.md`'s "State as of" section is the *snapshot* — current state only, overwritten every batch."*
- `CLAUDE.md`: *"Current state | git, the repo, the Supabase MCP. **Not this file.**"* — and `grep -c "State as of" CLAUDE.md` returns **0**.

`CLAUDE.md` names this README as the authority on the handover gaps, so a reader is sent there and then told to look in `CLAUDE.md` for a snapshot that the three-tier rewrite deleted. Same file, `:3` and `:43`, still teach `HANDOVER-vNN.md` as the naming convention — though `:52–64` documents the change, so a reader who gets that far is corrected.

**C8 — the suite size is quoted at 756 inside a live queue item.** `docs/QUEUE.md:155` (mutation testing): *"The suite is ~756 tests in 0.84s, so mutating it is cheap."* Actual: **799**. The argument survives (0.86s) but the number is the v115 figure, and this item is blocked on Max — he would be deciding against a stale premise.

---

## 3. Test drift

1. **The inversion guard cannot fail for a label swap.** See finding T1. This is the most consequential test-integrity finding in the report: the guard for the trap that has "caused rollbacks" checks attribute presence, not the crossing.
2. **`screenshots.spec.js` inflates every batch's headline Playwright number by 12.** It carries **2 `expect()` calls for 12 tests**, is the only spec that does not install `tests/visual/_boot.js`, and reads the **live production database** over the CDN (documented at `.github/workflows/test.yml`, the exclusion block). Every handover 123–128 quotes the local total (102/103) as "green", which either means the batch ran a live-production spec or reported a number it did not measure. CI's honest gate is **91**. Open since the 7 Aug reconcile; queued behind Q10.
3. **`.github/workflows/test.yml`'s spec inventory is three files stale** — "9 specs, 8 survive the filter" against 12 and 11. The comment is attached to a fail-closed guard whose failure mode is "silently runs the non-hermetic spec in a job documented as hermetic". The guard itself still works (it computes the list from the directory); only its self-description drifted.
4. **`fresh-states.spec.js` still builds fixtures through a door no user has** — five `window.addProduct(...)` calls (`:53, 165, 271, 272, 491`). Flagged v111, queued, unchanged. The line numbers moved (v115 recorded `:457`, now `:491`) but the count is stable at five.
5. **Source-grep pins are no longer a systemic problem.** HANDOVER-127's finding — *"all seven of my source-grep markup pins passed with the two render branches inverted"* — was fixed in-batch. Measured across the suite: only 9 of 64 files carry any source-text assertion, and the two densest (`housekeeping`, `terminology`) are legitimately source-text tests. The three test files added since v115 (`builder-modal`, `dash-chips`, `king-rows`) contain **zero** source-grep assertions.
6. **No test count dropped unexplained.** 756 (v115) → 770 (v118, +14 `plate-draft`) → 773 (v122) → 782 (v123) → 791 (v125/v126) → 799 (v127/v128). Every step is accounted for in a handover.
7. **No test references a function, id or copy that no longer exists.** Suite fully green; `terminology`, `housekeeping`, `restore`, `trend-reframe`, `builder-modal` all pin identifiers independently confirmed live.
8. **`tests/smoke.js` is not in `npm test`** (`node --test tests/*.test.js` matches 64 `.test.js` files; `smoke.js` is not one). It runs in CI as its own job and every handover reports it separately, so this is by design — recorded so it is not mistaken for drift.

---

## 4. Recurring symptoms

Ranked by evidence that the root cause was never found.

1. **"A test that is green against broken code" — five occurrences, five framings, and the fix is queued and blocked.** `HANDOVER-v91:159` (a check that cannot fire) · `HANDOVER-v112:115` (a call-order test passes against the broken code — promoted to Tier 1) · `HANDOVER-v114:257` (*"a test that cannot fail for the mutation it guards is worse than no test"*) · `HANDOVER-123:52` (dead code carrying live coverage: `menuCompareHtml`'s standalone branch, two test files asserting through it, 782 green) · `HANDOVER-127:38` (seven source-grep pins pass with both render branches inverted). **The root cause has been named** — nothing measures whether a test would fail — **and the remedy is `docs/QUEUE.md:152–157` (Stryker), blocked on Max's yes since 8 Aug.** Two of the five occurrences landed *after* that item was written. Every one was caught by the pre-push reviewer, not by the suite. Finding T1 above is a sixth instance found by this audit rather than by a review. **This is the strongest recurring signal in the repo and the only one whose fix is one decision away.**
2. **Falsy-zero / empty-coercion — two near-misses in consecutive batches.** `HANDOVER-127:39`: *"The `isFinite('')` trap nearly shipped in new code the same week CLAUDE.md's warning about it was in context — copied shape, not copied guard."* `HANDOVER-128:37`: *"`rank[light]||3` burying red (rank.red is 0) — the exact falsy-zero trap this project has already documented, in code written the same day."* Both caught by review. `CLAUDE.md` has a Tier 1 entry for the `isFinite('')` half and none for `||` defaulting over a legitimate `0`, which is the same root cause wearing a different operator. Worth considering as one trap rather than two.
3. **Menu / empty-state centring — four fixes, no root cause, and correctly parked.** `HANDOVER-v44`, `v49`, `v54`, `v70`. **No fifth fix in v116–v128** — verified by grep across all thirteen. Queued with `Do after: Q10` and a sound reason (the empty-state CSS is mid-redesign; Q10 carries them over unchanged, which is what makes the target hold still). No action.
4. **Pack-size persistence — five fixes, root cause found in v107, no recurrence.** No mention in any handover v116–v128. The residue is data, not code: **six orphaned taught packs still in production** (`docs/PHONE.md:118–121`, supplier `Document No:`), verified 7 Aug, waiting on a phone visit since v107 — now two audits running.
5. **Invoice flag-pill alignment — two fixes (`v46`, `v62`), no recurrence.** The surface is `renderInvReview`, already a documented fragile area, and Q8 rewrites it. No separate action; Q8's plan already carries the three invariants.
6. **Invoice ticks lost on re-render — flagged three times, never fixed.** v50, v52, re-verified 7 Aug. A repeated *observation* rather than a repeated fix. Queued as `Do with: Q8`, which is correct.

---

## 5. Dropped threads

### The charter's named candidates

| Item | Status | Proof |
|---|---|---|
| **Staging Supabase** | **Not done — queued, blocked on diagnosis, and the blocker is not in `CLAUDE.md`** | `docs/QUEUE.md:202–218`. Max's part is done (project created, ref in `.mcp.json`); the server does not load. See **C1** — this is the report's lead finding |
| **Eval harness for the invoice reader** | Not done — **now properly queued** | `docs/QUEUE.md:159–166`. The v115 audit found it had reached no landing place at all; the 8 Aug triage gave it its own item with requirements and an open question (where the invoice corpus lives). Landing fixed; work not started |
| **`manager` as a third role** | Not done — **folded, correctly** | `docs/QUEUE.md:340` — *"**Is there a third role?** A `manager` was sketched in `HANDOVER-v60`, `v82` and `v98` and never carried forward"*. Named inside Roles because "how many roles" and "what can each do" are one question |
| **Privacy revisit before other businesses' invoices flow through Gemini** | Not done — queued, named the top gate in two places | `CLAUDE.md` Tier 2 privacy gate; `docs/QUEUE.md:350–356`. Properly landed. Residual gap unchanged from v115: the only user-facing privacy text is a Settings hint, not a policy |
| **Bulk catalogue bootstrap for onboarding** | Not done — **now named explicitly** | `docs/QUEUE.md:346` — *"**Including how a new café gets a product catalogue at all** — named explicitly here by the v115 audit's triage, because … an implied requirement is one nobody builds"* |
| **Import/restore from JSON backup** | **DONE** | Shipped v110; `parseBackupFile:4538`; pinned by `tests/restore.test.js` (98 assertions) |
| **Abbreviation matching in search** | **DONE — shipped v55, the thread was never dropped** | `docs/QUEUE.md:412–413`. `kitchenSearchMatches` → `kingSearchFilter`; the worked example is at `js/app.js:673` |
| **`TODO(Max)` markers** | **Exactly one survives** — queued, and its blocking condition has been met | `index.html:11` — absolute `og:url`/canonical/`og:image` *"once the Vercel domain is fixed"*. The domain is fixed. `docs/QUEUE.md:168–174`. **No privacy-policy or contact-details TODO exists** in any shipped file |

### Flagged in handovers 123–128 and reaching neither `docs/QUEUE.md` nor `docs/PHONE.md`

These are the interesting kind. Each was written down in a write-once diary and nowhere a batch will read it.

1. **The trend chart was never diffed against the mock, and Q10 does not know.** `HANDOVER-123:47`: *"The design gives it an over-target wash, a dashed target line and accent markers; the shipped chart already has all three, so nothing was needed — **but I did not verify them against the mock pixel by pixel, and if they differ it belongs in Q10's sweep rather than here.**"* Q10's queue entry (`docs/QUEUE.md:97–105`) carries three other fold-ins and not this one. `grep -ci "trend chart" docs/QUEUE.md` = **0**.
2. **The publish dialog and the Menu row print the same ratio at different precision.** `HANDOVER-125:37`: *"Aligning the publish dialog's whole-number % with the row's one-decimal % — same ratio, different display precision, different screen's batch."* Nowhere in the queue (`"precision"` = 0, `"one-decimal"` = 0). Q9 (Settings) and Q7 (Products) will not pick it up; the publish dialog belongs to no remaining Q item.
3. **Two visual languages for "this row has no price".** `HANDOVER-127:20`: *"the review's remaining nit ('—' bold for a linked product with no price vs 'no cost' muted for a missing product, two visual languages for the same fact) **is recorded here** and is Q7/Q10 territory."* Recorded *here* is the problem — Q7's plan (`docs/QUEUE.md:79–81`) says nothing about it.
4. **jsdom does not compile inline `oninput=` handlers on innerHTML-created nodes.** `HANDOVER-128:38`: *"Worth knowing before the Q8 invoice batch, whose renderer is full of inline handlers."* A warning aimed at a specific named future batch, filed where that batch will not look. Q8's entry (`docs/QUEUE.md:83–89`) does not carry it.
5. **Row `aria-label`s announce neither drift nor unit cost.** `HANDOVER-127:35`: *"that is a screen-wide row-labelling question for Q10."* Not in Q10.
6. **The mock's Plates header sub-line and column-header row.** `HANDOVER-126:28` — deferred because *"the prose-cull precedent (v100/v115) says they need Max's ask, not my initiative."* Correct instinct, but the ask was never put anywhere Max sees, so the deferral is permanent by default rather than by decision.
7. **A route from an uncosted dish to its plate in the builder.** `HANDOVER-125:36` — *"v55 removed that chip deliberately, so reopening it is a decision, not a patch."* Q3 shipped an honest muted dash instead of the mock's "cost it →". The decision was never put to Max; it is not in `docs/decisions/2026-08-08-2.html` (which covers `kitchen_items`, the `ensurePlateForDish` heal, the three stale `CLAUDE.md` sentences, insight rule D, mutation testing).

### Dropped threads whose trigger condition has since been met

8. **The two stale handover-path comments — six batches have satisfied their trigger.** `index.html:808` names `handovers/HANDOVER-v88.md`; `js/app.js:6473` names `handovers/HANDOVER-v62.md`. Both moved under `docs/`. `docs/QUEUE.md:308–310`: *"Deliberately NOT fixed when the docs moved: editing `js/app.js` even for a comment makes it a shipped change, which forces the six-spot cache bump for zero user benefit. **Fix them free, with no extra bump, in the next batch that touches those files anyway.**"* Six batches (v120–v125) have touched **both** files and bumped the cache each time. The condition has been met six times over. Open since v115.
9. **`.invAppr` is still 26×26px** — `css/style.css:834`, markup `js/app.js:6378`. The app's last sub-44px target, on its highest-stakes screen. Correctly held for Q8 now (`Do with: Q8`), which is an improvement on v115 where it was just open.
10. **`edDelArmed` is still dead** — declared `js/app.js:7199`, written `:7226` and `:7238`, read nowhere. Verified again. Two audits, unchanged.
11. **Six orphaned taught packs still in production** — `docs/PHONE.md:118–121`, open since v107, unchanged across two audits.

### Queue items re-measured against the code (the caller's specific ask)

Every concrete claim in the "Small" block still holds in **substance** — no fourth instance of the "already shipped" failure. But **every line number in that block is now stale**, and `docs/QUEUE.md:31` claims *"line numbers and counts are measured, not quoted."*

| Queue claim | Measured now |
|---|---|
| `edDelArmed` at `6910`/`6937`/`6949` | `7199`/`7226`/`7238` — still dead ✅ |
| `.invAppr` at `style.css:829`, `app.js:6094` | `style.css:834`, `app.js:6378` — still 26px ✅ |
| `.range-btn` 32px at `style.css:2180`, `::after` at `2374–2375` | `:2184`, `:2377–2378` — the `::after` still gives 44px ✅ |
| Zero-ingredients hint at `app.js:820`, no anchor rule anywhere | `app.js:820` exact; **zero** `a{}`/`a:link`/`a:visited` colour rules in `css/style.css` ✅ |
| `analyze().absPct` lost its last reader | Computed `js/app.js:1115`, returned `:1120`, **zero readers** in `js/app.js` or `tests/` ✅ |
| Six dead CSS families, zero-emitting | Re-measured: `.ref-pill` 6 · `.db-tools` 2 · `.ing-empty` 9 · `.an-empty` 19 (of which `.an-empty-box` 3) · `.plate-noresult` 1 · `.king-tag` 1. All still zero-emitting; `.king-tag`'s only `js` hit is the comment at `app.js:852` saying the pill was removed ✅ |
| `_ingLogPending` has one producer and one consumer | Producer `js/app.js:1513`, consumer `:1484`, chained on one line at `:612` ✅ |

The redesign moved ~290 lines in `js/app.js` and ~255 in `css/style.css`. A batch that greps the queue's line numbers now lands in unrelated code — the failure mode that produced three stale items in three batches, arriving by a different route.

---

## Nothing to report in

- **Invariants** — every one TRUE. Protected parser region **byte-identical to v115** across ten deploy versions and five screen redesigns; all six version spots agree at 125; all four protected functions present and unrenamed; the naming inversion holds in the markup.
- **Dead traps** — none recommended for deletion. All 16 Tier 1 entries located in live code, or a decision, or the trap-worked-and-a-test-enforces-its-absence shape. Second consecutive clean result.
- **Redesign contract compliance** — Q2–Q6 kept every pinned id, `data-*` attribute, wiring class and render function. All 7 named ids and all 11 named render functions present; `menuCompareHtml` survived its dead-branch removal as a live function. Zero identifier renames.
- **`setProduct` as sole writer** — traced end to end through four hops; no second path into `ing_price_history` exists. The five history series remain distinct and unmerged.
- **Test suite health** — 799/799 green, 0 skipped, 0 todo, 0.86s; no unexplained count drop across six batches; no test references anything that no longer exists; source-grep pins are not systemic.
- **Third-party supply chain** — both production scripts pinned exact with SRI (`supabase-js@2.110.8`, `pdfjs-dist@3.11.174`), the worker exception documented at its call site, no third dependency added, no build step.
- **Write discipline** — every `SUPA.from(...)` outside `pushWrite` is a `bootstrapSync` read. No raw client write exists in the four client files.
- **Recurring symptoms, the known three** — pack-size persistence, invoice flag-pill alignment and empty-state centring produced **zero** new fixes in v116–v128.

---

## Filing note

This report is handed back, not saved. It is expected at `docs/audits/AUDIT-v125.md` — filed under **v125**, matching `sw.js:2`, per `CLAUDE.md`'s rule that audit filenames keep the `v` and key to the **deploy** version, not the batch number. `docs/QUEUE.md:72–75` already asks for exactly that filename, so the counter should reconcile cleanly. Nothing else in this audit needs a decision from Max except **C1 (staging)** and **finding S1 (the plate-line shape)**, both of which are `CLAUDE.md` edits and therefore his call, not a batch's.

**Files referenced, all absolute:**
`/Users/max/Documents/Scoopys-Costing/CLAUDE.md` · `/Users/max/Documents/Scoopys-Costing/docs/QUEUE.md` · `/Users/max/Documents/Scoopys-Costing/docs/PHONE.md` · `/Users/max/Documents/Scoopys-Costing/docs/handovers/README.md` · `/Users/max/Documents/Scoopys-Costing/docs/handovers/HANDOVER-123-dashboard.md` … `HANDOVER-128-builder.md` · `/Users/max/Documents/Scoopys-Costing/js/app.js` · `/Users/max/Documents/Scoopys-Costing/index.html` · `/Users/max/Documents/Scoopys-Costing/css/style.css` · `/Users/max/Documents/Scoopys-Costing/sw.js` · `/Users/max/Documents/Scoopys-Costing/tests/terminology.test.js` · `/Users/max/Documents/Scoopys-Costing/tests/housekeeping.test.js` · `/Users/max/Documents/Scoopys-Costing/tests/visual/screenshots.spec.js` · `/Users/max/Documents/Scoopys-Costing/.github/workflows/test.yml` · `/Users/max/Documents/Scoopys-Costing/supabase/migrations/20260808_menus_rls.sql` · `/Users/max/Documents/Scoopys-Costing/.mcp.json`
