# EzPlate project audit

```
Audit at v166, 15 August 2026 — previous audit v156, 10 merges ago.
```

**Commit:** `8f045cc` (branch `chore/194-project-audit-v166`, clean, main plus nothing). **Window:** batches 177–193, deploy versions `ezplate-v157`–`v166`, following `docs/audits/AUDIT-v156.md`.

**Filed by batch 194.** The agent is read-only and hands the report back; `docs/QUEUE.md`'s item said why that matters — an unfiled report leaves the counter unchanged and the next audit is never queued. Findings were routed by batch 194 and the routing is recorded at the foot of this file, so a reader here can tell what was acted on from what was written down.

## Verdict

**The code is healthy and the process worked better this window than any previous one.** `npm test` is **1347/1347 green in 3.1s**; `npm run mutate` is **365 mutants, 360 killed, 5 survived with written allowances**; CI is green on `main` at v166. Every invariant holds — the protected parser region is still byte-identical to the hash first recorded at v125 (`3a630b5823933c8b82008787a54a7943`, 15,232 bytes) across **ten more deploy versions and the whole multi-tenant rewrite**, all six version spots agree at v166, and no Tier 1 trap is dead. **All fourteen AUDIT-v156 findings were actioned** — the first audit in this project's history with no carry-over. The 13 Aug standing-authority reversal visibly worked: every handover from 181 to 193 landed its `CLAUDE.md` edit directly, and none was parked.

**The single most important thing to address is that `CLAUDE.md` grew from 7,487 words to 14,257 in ten deploy versions — Tier 1 alone went from 2,642 to 7,067 words, +168% — and it is now drifting faster than it is being checked.** Six of the ten stale claims below were introduced *by* that growth: the FK count went stale at 191, the restrictive-policy count at 191, the `:not([hidden])` count re-drifted within ten versions of being corrected, and the `ing_price_history` sole-writer claim went false at 193. Nothing here is a dead trap; the problem is that a file loaded into every message of every batch nearly doubled while its counts went unmaintained, and **three separate numbers in it now disagree with the code that the file's own rule says wins.** The second-most important is structural and cheap: `docs/PHONE.md` has a heading reading *"Settled — checked from here, no phone needed"* with **eight active sections below it**, including 193's carton-price question that decides whether every cost in a new café is wrong by the carton size.

---

## 1. Invariants — all TRUE

| Invariant | Result | Evidence |
|---|---|---|
| **Protected parser region** | **TRUE — byte-identical to the v125/v135/v145/v156 hash** | Anchors `js/app.js:9112` (`var INV_EXCLUDE=`) and `:9338` (`function unitLabelFor(`). md5 `3a630b5823933c8b82008787a54a7943`, 15,232 bytes, computed with `sliceBetween` from `tests/_extractfn.js` as AUDIT-v156 §1 instructed |
| **No twice-defined top-level name** | **TRUE, test unchanged and still asserts ABSENCE** | `tests/housekeeping.test.js:173-174`, `assert.deepEqual(dupes, [], …)` |
| **Naming inversion** | **TRUE, both halves pinned** | `index.html:1569` `data-tab="pantry"` → `aria-label="Ingredients"`; `:1582` `data-tab="ingredients"` → `"Products"`; `:1567` `builder` → `"Plates"`. Guards at `tests/terminology.test.js:112-114`, `:134` |
| **Six version spots** | **TRUE** | `sw.js:2` `ezplate-v166`; `sw.js:5` two `?v=166`; `index.html:105`, `:1616`; `js/app.js:6738` `APP_VERSION='v166'` |
| **Four protected functions** | **TRUE, present and unrenamed** | `packToUnitCost` `js/app.js:1863`, `applySupplierMemory` `:9191`, `unitCatCategory` `:9209`, `resolveMatchedPrice` `:9225` |

Also re-verified clean: all five restrictive policies in `20260814_roles_part1.sql` and all four in `20260814_invitations.sql` carry `as restrictive` and name one command each · the `business_id` DEFAULT and the `set_default_business_id` trigger both compute `public.current_business_id()` (`supabase/migrations/20260813_business_id_part2.sql:274`, mirror `:451`) — the literal from part 1 was correctly replaced · `invited_by` has both the default and the trigger, and they agree · the three-value tenant gate is live (`js/app.js:744-746`, `:810-818`, `:863-864`) · `where true` still on all five restore deletes (`20260813_semantic_keys.sql:234-238`) · five `select *` inserts each followed by a timestamp backfill · no `onConflict` in `dbSetSetting`/`dbPushSupplierPhrase` · every `.delete()` in `js/app.js` is `.eq()`-scoped and inside `pushWrite`, including 192's new `dbRevokeInvite` (`js/app.js:7039`) · `publishPlan` the one publish decision shared by both callers (`:8805`, `:10771`) · `productRefs` both arms (`:4067`) · `nextKid` scans the live array (`:1330`) · watchdog bumps `gemToken` (`:8038`) · `addProduct` dead with five live references, all in `tests/visual/fresh-states.spec.js` · zero `TODO(`/`FIXME` markers · both third-party scripts pinned exact with `sha384`, worker pinned-only as documented · `TAB_PANES` is nine.

---

## 2a. `CLAUDE.md` claims verified — ten stale, ranked

### S1 — "`setProduct` is its one writer" is now FALSE, and the catalogue importer is what falsifies it *(MEDIUM — highest-yield of this set)*

| | |
|---|---|
| `CLAUDE.md:232` | *"The real per-product series is `ing_price_history`, and **`setProduct` is its one writer**."* |
| `CLAUDE.md:325` | *"The condition is a function, not a list: if **`setProduct`** wrote it, it is drift and belongs in `ing_price_history`."* |
| Reality | Batch 193 made the write plural. `setProducts` (`js/app.js:1274`) is the implementation; `setProduct` (`:1301`) is its N=1 wrapper. **`catImportApply` calls `setProducts` directly at `js/app.js:2460`, bypassing `setProduct` entirely** — up to 412 products and 412 price points per import. |

The behaviour is correct (`setProducts` calls `logIngPrice` then `saveIngLog`), so this is not a defect. It is the exact "exactly one writer" claim this audit is told to grep rather than believe, and it now names the wrapper: a reader auditing *"who can write `ing_price_history`?"* greps `setProduct(` and finds six call sites, all of them one row at a time, and misses the one path that writes hundreds. **The same wording is wrong in the code too**, at `js/app.js:3415`: *"every product-price write in the app funnels through `setProduct` (v109), which is ing_price_history's sole writer."*

**What to do:** change both `CLAUDE.md` sites and the `js/app.js:3415` comment to name `setProducts`, with one clause saying `setProduct` is its N=1 case. Do not restructure the rule — its substance survived the refactor intact, which is the good news here.

### S2 — "Custom ids are `CX*`" — since 193 there are two prefixes, and the field that actually answers is `is_custom` *(MEDIUM)*

`CLAUDE.md` Tier 2, Data and storage: *"Products come from the Supabase `ingredients` table and nowhere else. **Custom ids are `CX*`.**"*

Measured: `js/app.js` mints product ids at two sites — `uid('CX')` at `:10330` (invoice add-new) and **`uid('IMP')` at `:2455`** (catalogue import). Nothing anywhere reads either prefix; the only occurrences are the mints themselves. So the sentence invites a filter that is now half-blind: `id.startsWith('CX')` written to find user-made products silently misses every imported one, and a café that onboards through the importer has a catalogue that is 100% `IMP*`. The column that actually carries the answer is `is_custom`, which `ingredientToRow`/`rowToIngredient` round-trip (`:331`, `:353`) and which `js/app.js:329`'s own comment calls *"the column that tells a restore which rows the user made."*

**What to do:** replace with *"Client-minted product ids carry a `uid()` prefix (`CX` from the invoice flow, `IMP` from the importer) and **nothing reads the prefix** — `is_custom` is what says a row is the user's."*

### S3 — the foreign-key count went stale at 191 and the section's own justification for stating it now works against it *(MEDIUM)*

`CLAUDE.md:262`: *"⚠️ This heading said 'Three foreign keys' until 13 Aug 2026, and **the live count is now FIFTEEN**… the count is stated because **a reader who greps and finds fifteen needs to know which three this section means**."*

Counted against the schema, not inferred: 3 data FKs + 10 `business_id → businesses` (181) + 2 on `business_members` = **15 as at 182**. Batch 191 added `business_invites` with **three more** — `business_id → businesses on delete cascade`, `invited_by → auth.users on delete set null`, `accepted_by → auth.users on delete set null` (`supabase/staging/01-schema.sql:678-684`, `supabase/migrations/20260814_invitations.sql:255-274`). **Live count is 18.** `HANDOVER-191` says *"Into CLAUDE.md: Nothing"* — correctly, as no new rule was needed, but the count nobody owned went stale in the same breath.

The three named FKs are still the only ones that constrain the app, and *"the ten tenant FKs can only raise if someone deletes a `businesses` row, and nothing does"* is still true (no `.delete()` on `businesses` anywhere in `js/app.js`).

**What to do:** update to eighteen, or better — since this number has now gone stale twice in ten versions — replace the figure with *"grep `pg_constraint` for the live count; the three below are the only ones that constrain the app."* The section's value is the scoping, not the arithmetic.

### S4 — `tests/roles.test.js` "pins all four" — it pins five, and there are nine restrictive policies live *(MEDIUM)*

`CLAUDE.md:202`: *"`tests/roles.test.js` pins all four, and the mutation was run."*
`CLAUDE.md:205`: *"The other three restrictions here name a command on a table."*

Measured: `tests/roles.test.js:37-43`'s `RESTRICTED` array holds **five** entries. `20260814_roles_part1.sql` creates five restrictive policies — the fifth, `app_settings owner-only target delete`, is the one **the very next paragraph of `CLAUDE.md` describes being added** after the pre-push review. So the count contradicts its own section three lines later. And "the other three name a command on a table" is two (`plates`, `menus`); the other three all name the `food_cost_target` value.

Separately, 191 added **four more** restrictive policies on `business_invites` (`20260814_invitations.sql:373-386`), pinned by `tests/invites.test.js:93` — a different file. **Nine restrictive policies live, across two test files.**

**What to do:** correct to five in `roles.test.js` and two-versus-three, and add a clause naming `tests/invites.test.js` as the second pinning file. This one matters more than a count usually would, because the paragraph's whole argument is *"read its first line, not its condition"* — a reader who trusts "all four" and finds five stops trusting the paragraph.

### S5 — `:not([hidden])` is used on **thirteen** rules, not ten — and three different numbers are now on record *(MEDIUM)*

`CLAUDE.md:410`: *"It is used on **ten** rules in `css/style.css` — `#builderPage`, `.bld-pill`, `.inv-step`, `.ms-clear`, `.plib-controls`, `.plib-x`, `.plib-note`, `.mnu-pct` (twice) and `.mnu-band`… **The count is the point**."*

Measured in `css/style.css`, rules only (comments excluded): `:539` `#builderPage` · `:587` `.bld-pill` · **`:1117` `.mm-empty-err`** · `:1222` `.inv-step` · `:1640` `.ms-clear` · **`:2886` `.stg-row`** · **`:2950` `.stg-row`** · `:3702` `.plib-controls` · `:3763` `.plib-x` · `:3847` `.plib-note` · `:4282` `.mnu-pct` · `:4399` `.mnu-band` · `:4456` `.menu-picker-row.pills-on .mnu-pct` = **13**. The three not in `CLAUDE.md`'s list are bolded.

`css/style.css` itself disagrees in two more places: `:2918` says *"the **twelve** `:not([hidden])` guards elsewhere in this file"* and `:3495` says *"the **twelve** rules in this file that DO need `:not([hidden])`."* **Three numbers, three files, none of them 13.**

This is AUDIT-v156's S4 recurring inside ten deploy versions of being fixed — it went "twice" → "ten" (12 Aug) → wrong again by 15 Aug. **A third hand-correction will drift a third time.**

**What to do:** stop counting in prose. Either add a one-line assertion to an existing CSS test that the number in `CLAUDE.md` matches `grep -c` (the mechanism AUDIT-v156's T1 used for the CI spec count, which held perfectly — see §3), or delete the enumeration and write *"it is an app-wide idiom; grep `:not(\[hidden\])` for the current set."* The rule is right and load-bearing; only the arithmetic keeps failing.

### S6 — the twenty-incident roster is CORRECT, but 193 found two more and did not count them *(LOW-MEDIUM — this is check 2 of batch 193's three asks)*

**The header and the list agree.** I counted the bullets: v113, 139, 140, 141, 162, 167(a), 167(b), 172, 173, 174, 175, 176, 182(a), 182(b), 183(a), 183(b), 184(a), 184(b), 188, 190 = **20**, and `CLAUDE.md:353` reads *"TWENTY incidents."* **Every cited number maps to a real handover** — verified individually against `docs/handovers/`, including the two `v`-prefixed and the two lettered pairs. The failure mode 193 warned about (the header reading eighteen for two batches while the list held nineteen) has not recurred.

**But the count now understates the frequency.** `HANDOVER-193:92-94` records two more of exactly this class, found in that batch:
- *"A brand-new Playwright test claimed to pin two things and pinned one… removing the listener turns it red and removing the re-plan does not."*
- *"A `/pack/` regex in a refusal assertion matched **both** refusal messages on that path, so it was green whichever branch fired. The gate found it."*

193's *"Into CLAUDE.md: Nothing — two candidates were considered and rejected as already covered"* is a defensible call about **rules**; it is not a call about **the count**, and the header's own history (*"Was four… then seven… then twelve… fourteen… sixteen… eighteen… twenty"*) reads unmistakably as a tally of instances.

**What to do:** pick one and say so — either add 193(a) and 193(b) and make it 22, or add one sentence: *"this roster records new SHAPES, not every instance; the raw count is higher."* Leaving it silent is what produced the eighteen/nineteen mismatch 193 asked this audit to check.

### S7 — `HANDOVER-193` claims a `buildBackup` comment that does not exist *(LOW-MEDIUM — this is the residue of check 1)*

`HANDOVER-193:28`: *"**`stamp.format` was NOT bumped, deliberately**, with the reasoning written at `buildBackup`'s own site as 184 did."*

`grep -n "193" js/app.js` returns eight hits; **none is anywhere near `buildBackup`** (`:7434`). The comment block at `:7444-7462` carries 184's non-bump reasoning and nothing from 193. `grep -n supplier_code js/app.js` → `:321, :323, :349, :2169, :2176, :2257`, all in the mappers and the importer.

The decision itself is sound and was proved, not argued (`HANDOVER-193:29`: both a format-2 payload carrying `supplier_code` and one without were restored through the live `restore_backup` on staging). And `CLAUDE.md`'s hard rule — *"Any change to what `bootstrapSync` puts in memory is a change to the backup format, and must bump `stamp.format`"* — is a rule 193 consciously did not follow. **184's comment exists precisely because "a silent decision against it is indistinguishable from having missed it"** (`js/app.js:7444-7445`), and 193 made the same call and left it silent at the site.

**What to do:** add the four-line note at `buildBackup` that the handover says is already there — no group added, removed or renamed; no key changed type; nullable with no default so both directions read null correctly; format 4 reserved by the backup-history queue item. This is the cheapest finding in the report and it closes a rule that has now been consciously not-followed twice.

### S8 — `CLAUDE.md`'s row-boundary section does not mention `supplier_code`, and the three places DO agree *(LOW — this is check 1 of batch 193's three asks)*

**All three agree. Verified individually:**

| Place | Evidence |
|---|---|
| `ingredientToRow` | `js/app.js:323` `supplier_code:p.supplier_code||null` |
| `rowToIngredient` | `js/app.js:349` `supplier_code:r.supplier_code||null` |
| The migration | `supabase/migrations/20260815_supplier_code.sql`, `add column if not exists supplier_code text` — nullable, no default, no unique index |
| The schema mirror | `supabase/staging/01-schema.sql:516`, same statement, under a §4a2 heading naming the migration |

The `||null` on both sides is correct and the comment at `js/app.js:320-322` explains why (`''` would make every code-less product look like the same product). Nullable-with-no-default is the right answer under the DEFAULT-does-not-survive-the-restore law, and the migration header says so at length.

**`CLAUDE.md` contains zero occurrences of `supplier_code`.** Whether that is a finding is a judgement, and my answer is **mostly no**: the semantic-keys section already carries the general law (*"a key's width is depended on in three places that never mention each other… Change one and grep for all three"*), and `CLAUDE.md`'s own closing test is that true-but-inferable is a deletion. `supplier_code` is one nullable column with no default, no constraint and no cross-file contract beyond the general one.

**What to do:** nothing, unless you want the four column lists enumerated. If you do, the honest version is one clause in the row-boundary section: *"`ingredients` now has a fourth mapper pair to keep in step with the mirror — `supplier_code`, added 193."* I would leave it out; QUEUE.md's pointer did its job by causing this check, and the check came back clean.

### S9 — the privacy gate states a scheduling claim that `CLAUDE.md`'s own Tier 3 rule forbids it from holding *(LOW-MEDIUM)*

`CLAUDE.md:545`: *"**So the signup work is ordered BEHIND this gate and behind pdf.js 4.2.67+**, and that ordering is a scheduling fact rather than a second decision — it lives as a `Do after:` on the queue item, per this file's own rule about where sequencing belongs."*

Tier 3, *Which item runs before which belongs in the QUEUE, never here*: *"A claim that one piece of WORK should happen before another piece of WORK lives in `docs/QUEUE.md`, as a `Do after:` line… this file has no mechanism that can notice a scheduling claim going stale, so one rots here silently and is then trusted."*

The sentence names **two specific queue items** (the privacy gate, pdf.js 4.2.67+) and a third by description (signup). It is duplicated correctly at `docs/QUEUE.md:39`. The day the privacy gate ships, QUEUE deletes its `Do after:` by the mechanism the header describes and **`CLAUDE.md`'s copy rots**, which is the "dropdown placement is therefore UNBLOCKED" failure the rule was written from, verbatim.

**What to do:** keep the standing precondition — *"before the first non-Scoopy's row exists, not after"* — which is the second kind (a class of work, no expiry, correct here). Delete the clause naming pdf.js and the signup item's position; `docs/QUEUE.md:39` already carries it and re-checks it every batch.

### S10 — the `skills/` and `.claude/skills/` copies are byte-identical and nothing keeps them that way *(LOW)*

`skills/{batch,cache-version,decide,handover,verify}/SKILL.md` are tracked; `.claude/skills/` is **gitignored** (`gitignore:7`, since v50) and holds byte-identical copies plus two third-party skills installed from `supabase/agent-skills`. Verified md5-identical on all five today. **Nothing in `tests/` or `.github/` references `.claude/skills`**, so an edit to the loaded copy is invisible to git, to CI and to the mandatory review — and the loaded copy is the one that runs.

Not new (predates every prior audit) and not currently drifted, so LOW. Worth recording because AUDIT-v156's S2 fix landed in *both* copies by hand and nothing would have caught it if it had landed in only one.

**What to do:** either symlink `.claude/skills/{batch,…}` at the five tracked skills, or add three lines to an existing test asserting the pairs are identical. Both are cheap; the symlink is cheaper and cannot go stale.

**Re-verified TRUE, no action:** the storage-key claim, in full — **thirteen** `cafe*` keys measured in `js/app.js`, a `getItem('...')` grep finds **six** and misses **seven** (six behind constants `ENV_STAMP_KEY`/`DRAFTKEY`/`KEY`/`AI_INV_KEY`/`AI_SUG_KEY`/`THEME_KEY`, plus `cafeDB_prodDensity`, a tombstone only ever `removeItem`'d at `:4022`). AUDIT-v156's S5 correction was right on both halves and has held · nine `TAB_PANES` · `restore_backup`'s five `select *` inserts each followed by a backfill and three named-column paths · `parseBackupFile` accepts 2 and 3, refuses 1 by name · `plateToRow` still omits `menu_id` · the ten tenant FKs still cannot raise · `menu_items_plate_id_fkey` still NO ACTION, both others SET NULL · `MENU_ORIGINAL` gone from executable code, pinned as an absence with comments stripped first (`tests/unique-ids.test.js:231-237`) · four client files, no build step, no fourth dependency, no analytics · `api/_gemini.js`/`_insight.js` underscore-prefixed.

---

## 2b. Dead traps recommended for removal

**None. Sixth consecutive clean result.** All 25 Tier 1 entries were checked against current code and every subject is present, named and reachable. The four pressed hardest, and why each stays:

- **`addProduct` is dead and deliberately kept** — still exactly five live references, all in `tests/visual/fresh-states.spec.js`, and Playwright is still not in `npm test`. The trap is doing its job. **Keep.**
- **The `@media` specificity rule** and **the `[hidden]` corollary** — both are the *trap-worked* shape. The `[hidden]` guard is now on 13 rules and 188 added two of them (`css/style.css:2878`'s comment cites 188 hiding `#setRestoreRow` for staff), so it earned its keep again this window. **Keep.**
- **Per-publication counting** and **the client's role is not the MCP's role** — decision entries, true regardless of code. The second earned its keep three times this window: `HANDOVER-191`'s spoofable `invited_by` and `HANDOVER-193`'s 204-on-`ing_price_history` were both found by verifying as the client rather than through the MCP. **Keep.**

**But the growth is the finding this section should carry, and it has no owner:**

| | v156 (`d1a8e53`) | v166 | Δ |
|---|---|---|---|
| Whole file | 532 lines / **7,487 words** | 746 lines / **14,257 words** | **+90%** |
| **Tier 1** | **2,642 words** | **7,067 words** | **+168%** |
| Tier 2 | 1,752 | 2,185 | +25% |
| Tier 3 | 2,578 | 3,861 | +50% |

Tier 1 nearly tripled in ten deploy versions. **Six of its seven new sections describe one mechanism from different angles** — an operation that returns success and does the wrong thing invisibly:

| Section | Batch | The silent-success it names |
|---|---|---|
| A column DEFAULT does not survive the restore | 181 | absent JSON key → explicit NULL overrides the default |
| A DEFAULT is applied BEFORE the trigger | 182 | trigger correctly does nothing; second tenant gets 42501 |
| A PRIMARY KEY's column list is a contract | 183 | `on conflict` resolves at runtime; 42P10 only on the restore |
| A FOREIGN KEY is checked with RLS OFF | 184 | cross-tenant reference saves cleanly and is invisible forever |
| "Fail open" reused as the answer to a RECHECK | 185/186 | RLS filters rows rather than erroring; every store empties, nothing throws |
| A policy that RESTRICTS vs one that GRANTS | 187 | `as permissive` is the default; the rule is repealed with every trace intact |

Each is individually correct and each was earned by a real measured defect. **None of them is dead and I am recommending no deletion.** The observation is that the file has no pruning mechanism and this is what that looks like after one window: 4,425 new Tier 1 words on one theme, cross-referenced in places (185 → the empty-read ambiguity; 191 → 182's law read backwards) and not in others.

**What to do — a recommendation, not a finding:** when Tier 1 next needs an edit, consider a short shared preamble — *"the recurring shape below is an operation that returns success and does the wrong thing: a write that saved and is invisible, a policy that reads right and permits everything, a read that came back empty because it was filtered"* — with the six sections kept as the worked instances beneath it. That is a consolidation, not a deletion, and it is the only lever I can see that does not lose measured information. **It is a judgement about the file rather than a fact about the code, so it is yours.**

---

## 2c. Contradictions

### C1 — `docs/QUEUE.md` item 1 says *answered* at the top and *blocked, here are your three options* in the body *(MEDIUM)*

| Location | Wording |
|---|---|
| `docs/QUEUE.md:36-37` | *"✅ **ANSWERED 14 Aug 2026 (Max): shape B — SELF-SERVICE**… **It is a decision and may not be re-litigated.** Options A and C… are **DECLINED**; do not re-propose either."* |
| `docs/QUEUE.md:56` (heading) | *"⚠️ **THE DECISION, AND WHY IT IS HIS** — added by batch 192, which went to build this and stopped"* |
| `docs/QUEUE.md:70` | *"**C — a FOUNDER invitation**… This is the shape that fits what is already there, and **it is the recommendation if he does not want B**."* |
| `docs/QUEUE.md:74` | *"Which of A/B/C decides who may do the creating, and **that is the blocked question**."* |

**The code supports the header** — `docs/decisions/2026-08-14-cafe-creation.md` carries `✅ ANSWERED, 14 Aug 2026 — 1B, 2A` in a block quote at the top of the file, and `CLAUDE.md`'s privacy gate records the same reversal. The body is 192's pre-answer text, correct when written and superseded a day later.

The header reads first and says the right thing, which limits the damage. The risk is real anyway: this item is 41 lines long, its **section heading** still announces a decision as pending, and the queue's rule is that a queued item is approved and `/batch` runs it without stopping. A batch that reaches item 1 after the gates clear, skims to the `Requirements:` line at `:74`, and reads *"that is the blocked question"* re-opens a decision the header forbids re-opening.

**What to do:** strike `docs/QUEUE.md:56-74`'s A/B/C section down to one line — *"A and C are declined; the reasoning is in `docs/decisions/2026-08-14-cafe-creation.md`"* — and rewrite `Requirements:` to state what B has to build. Keep `:75`'s warning about not widening the policies and `:76`'s note about invitations; both survive the answer and are the useful part.

### C2 — `CLAUDE.md` says a `stamp.format` bump is mandatory; 193 did not bump and left no note *(LOW-MEDIUM)*

`CLAUDE.md` row boundary: *"**Any change to what `bootstrapSync` puts in memory is a change to the backup format, and must bump `stamp.format`.**"* — against `js/app.js:7463` `format:3`, unchanged, with `rowToIngredient` now putting a fourteenth field into every in-memory product.

**The code supports 193's call**, not the rule as literally written: `buildBackup`'s own precedent is `format:chg.length?3:2`, i.e. the number describes what the payload contains rather than which build wrote it, and 193 proved both directions restore correctly on staging. 184 hit the same tension and resolved it the same way. **So the rule has now been consciously not-followed twice and reads as absolute both times.**

**What to do:** two options, and either closes it. Add 193's paragraph at `buildBackup` (= S7, and the handover already claims it exists), *or* soften the rule to what both batches actually applied — *"a change to what `bootstrapSync` puts in memory must bump `stamp.format` **unless a group is neither added, removed nor renamed and no key changes type** — and if you decide it does not, say so at `buildBackup`'s site, because a silent decision against this rule is indistinguishable from having missed it."* I would do both; the second sentence is the one that has done the work twice.

### C3 — `docs/MAINTENANCE.md` records the same finding twice, from two batches, neither noticing the other *(LOW)*

`docs/MAINTENANCE.md:123` — *"`tests/visual/screenshots.spec.js` has been UNABLE TO PASS since 186, and nothing says so"* (batch 190, *"13 of its specs fail"*).
`docs/MAINTENANCE.md:158` — *"`screenshots.spec.js` has been RED since 186, and nothing anywhere reports it"* (batch 188, *"1 passed, 13 failed"*).

Same spec, same cause, same two remedies proposed (delete it, or make it skip explicitly), 35 lines apart in one file. 190 wrote the second without noticing 188's. Both are correct; neither is wrong; the file just carries the item twice.

**What to do:** merge into one entry keeping 188's measurement and 190's stash-and-re-run verification. Trivial, but it is the same "two batches a week apart, neither notices" shape this section exists for, and it is the only instance I found this window.

### C4 — `docs/MAINTENANCE.md`'s own escalation trigger fired at v156 and nothing happened *(LOW)*

`docs/MAINTENANCE.md:351`: *"Note this is the **THIRD** instance of a correction being written down and not propagated. **If a fourth turns up, the routing itself is the item.**"*
`AUDIT-v156` D1: *"…by `docs/MAINTENANCE.md:267`'s own standing note, **this is the fourth.**"*

No routing item exists in `docs/QUEUE.md` or `docs/MAINTENANCE.md`.

**But the root cause was independently removed**, which is why this is LOW rather than a repeat finding: the 13 Aug standing-authority reversal deleted the mechanism that dropped corrections, and the evidence is that **every handover from 181 to 193 landed its `CLAUDE.md` edit directly** ("made under standing authority; reported rather than parked" in 181, 182, 183, 184; "one new Tier 1 trap, added" in 185; "four edits, under standing authority" in 186; "nothing, and that is a deliberate answer" in 191, 192, 193). Zero parked edits in thirteen batches.

**What to do:** strike the note, or annotate it *"trigger fired at AUDIT-v156; the routing failure was removed by the 13 Aug standing-authority reversal instead — 181–193 all landed their edits directly."* Leaving a live trigger that has already fired trains the next reader to ignore it.

---

## 3. Test drift

1. **T1 *(MEDIUM)* — `tests/visual/screenshots.spec.js` has been unable to pass for ten deploy versions and cannot report it.** Red since 186 (`ezplate-v162`, 14 Aug), 1 passed / 13 failed, measured twice independently. It is the only spec that does not call `installBoot` — it drives the real app against the live production database — and 186's mandatory sign-in means it now lands on the sign-in gate with no screen to photograph. CI excludes it deliberately and `tests/ci-workflow.test.js` pins the exclusion, so **nothing anywhere goes red**; the only signal is a local `npm run shots`, where it reads as 13 familiar failures under a green suite. Documented twice (C3) and open. **What to do:** take one of the two honest answers `docs/MAINTENANCE.md:163` already names — delete it, or `test.skip` with the reason — and move `ci-workflow.test.js`'s count with it. It is the single largest block of permanently-red tests in the repo and it teaches every batch to skim past red.

2. **T2 *(LOW)* — batch 189 shipped with no handover and the gap is not recorded.** Commit `1cb623b` *"189: invitations is blocked, and its stated hard part was the wrong one (#183)"* rewrote `docs/QUEUE.md` (25 insertions, 11 deletions) and renumbered items. There is no `HANDOVER-189-*.md`, and `docs/handovers/README.md`'s *"Known gaps in this record"* table lists v41, v65 and v66 only. That README's own argument is that an unrecorded gap is indistinguishable from a mislaid file. Docs-only, so nothing was lost technically — but the file that decided item 1's shape for the next four batches has no diary entry. **What to do:** add one row to the README's gap table naming 189 and pointing at the commit. Do not reconstruct a handover; the README forbids it and is right.

3. **T3 *(LOW)* — a stale citation in a maintenance entry that is itself a stale-citation item.** `docs/MAINTENANCE.md:337` cites the two wrong-mechanism CSS comments at `css/style.css:3263` and `:3378-3380`. They are now at **`:3700`** and **`:3844`**, ~440 lines adrift, and both still say *"outranks."* `docs/MAINTENANCE.md`'s own header says *"Re-grep by NAME, never by the number."* **What to do:** re-point by name (`grep -n outranks css/style.css`), or fix the two comments and delete the entry — see D2.

4. **No unexplained drop, and the growth is fully attributable.** 986 → **1347** unit tests (+361) across 93 test files, all traceable to new files this window (`roles`, `roles-client`, `invites`, `invites-client`, `catalogue-import`, `semantic-keys`, `restore`, `mutation/`). 38 Playwright spec files, **37 hermetic**. The mutation gate reports 365 mutants / 360 killed / 5 allowed.

5. **AUDIT-v156's T1 fix HELD, and it is the model for S5.** The CI spec-count comment had gone stale three audits running; 177 made it a test instead of a number. `.github/workflows/test.yml:361` now reads *"(38 specs, 37 survive the filter)"* — **measured correct today**, having absorbed seven new specs without drifting once. That is the difference between a corrected number and a mechanised one, and it is why S5 should not get a third hand-correction.

---

## 4. Recurring symptoms

### R1 *(MEDIUM)* — four of the last seven batches found their QUEUE item materially wrong at the point of execution

- **187** — `HANDOVER-187:19`, section heading: *"The item was WRONG in two places, and split in a third."*
- **189** — commit `1cb623b`: *"invitations is blocked, and **its stated hard part was the wrong one**… Taking queue item 1 found its premise incomplete."*
- **192** — `docs/QUEUE.md:58`: *"**This item's requirement presupposes something Max has said NO to**, and nobody noticed because the two were decided a day apart."* The batch went to build and stopped.
- **193** — `HANDOVER-193:75`: *"The item… lists a named-format importer and a generic CSV as the two options, **then supersedes itself with the mapper**."*

Four in seven. The framings differ every time — a wrong premise, a wrong hard part, a superseded requirement, a contradicted decision — which is why no batch has named it as one thing. `CLAUDE.md` Tier 3 covers the *brief* case in detail (*"every enumeration in this project has come back different from the brief's guess"*) and explicitly exempts the queue: *"An item **already in `docs/QUEUE.md` is approved** — Max said yes when he queued it, so `/batch` runs it without stopping. Re-asking there spends the only resource that is actually scarce."*

**That exemption is the root cause, and it is a deliberate trade rather than an oversight.** Queue items age: item 1 was written before 191 and 192 shipped invitations, before 189 measured `auth.users`, and before Max's 14 Aug answer. Its facts were true when written and false when run. The batches caught it every time — nothing shipped wrong — but two of the four spent themselves on the discovery.

**What to do:** this is not a defect and I am not proposing the exemption be reversed; re-asking Max is expensive and he said so. The cheap half is a `CLAUDE.md` Tier 3 clause distinguishing *approval* from *accuracy*: **a queued item's approval does not expire, but its facts do — check the item's factual claims against the code before planning off them, exactly as you would a brief, and report a mismatch without stopping.** That is what 187, 189, 192 and 193 each did independently, and writing it down costs one sentence.

### R2 *(LOW)* — "an operation that returns success and does the wrong thing" was discovered afresh six times

Enumerated in §2b's table: 181, 182, 183, 184, 185/186, 187, plus 191's spoofable `invited_by` and 193's silent `DELETE` 204, both of which were *predicted* by existing rules rather than newly discovered. Not a bug fixed six times — each was a genuinely different mechanism and each fix was right. It is a *symptom* discovered six times under six framings, which is the signal §2b's consolidation recommendation is built on. Recording it here so the two sections are not read as separate.

### R3 — the charter's known three: **zero occurrences**

**Pack-size persistence** appears in `HANDOVER-177`→`193` only in 193, and there as the importer's carton-price *question*, not a persistence fix. **Invoice flag-pill alignment**: zero. **Menu/empty-state centring**: zero — still open and unchanged at `docs/MAINTENANCE.md:255`, still four fixes with no named root cause, and its `Do after: F10` was correctly swept by 177. Sixth consecutive clean result on all three.

### R4 *(LOW)* — AUDIT-v156's R4 crossed its own threshold and has not been touched

`HANDOVER-169` wrote *"if it happens a third time it is a rule."* It happened a third time in 175 and a fourth sits open at `docs/MAINTENANCE.md:335` — two CSS comments (`css/style.css:3700`, `:3844`) stating the `[hidden]` override mechanism backwards. **The reason 177 parked it has since expired**: `HANDOVER-177:64` says it was *"left as a flag rather than a proposal, because only Max…"*, and the 13 Aug standing-authority reversal made exactly this class the assistant's own call. See D2.

---

## 5. Dropped threads

### D1 *(MEDIUM)* — `docs/PHONE.md` tells Max to stop reading eight sections early

`docs/PHONE.md:527` is a heading: **`## Settled - checked from here, no phone needed`**.

Below it, in order: `:533` 175+176/v155-v156 · `:563` F7/v146 · `:570` 178/v157 · `:589` 179/v158 · `:623` 186 · `:655` 192 · `:692` 193. **Seven active sections, ~200 lines, none of them settled.**

The file is reverse-chronological from `:14` (171/v151) down to `:499` (v99), then `Carried` and `Settled`, and then reverts to chronological append. The append is correct per `CLAUDE.md` (*"`/batch` appends here rather than stopping"*); the heading it appends after is not. A reader following the file top-to-bottom reaches a heading saying the rest needs no phone and stops.

**What is behind it is not cosmetic.** `docs/PHONE.md:697-712` (193) holds two questions only Max can answer, and the second decides correctness for every new café:

> *"⚠️ **AND THE SECOND ONE, WHICH NO TEST CAN SETTLE: is `LAST PRICE PAID` the price of ONE PACK or of the WHOLE CARTON?**… Getting this wrong makes every cost in the app wrong by the carton size, and it will look completely plausible."*

Also behind it: 186's *"you will be signed out, and the phone is where that lands"* and 192's password-manager and keyboard checks, which `HANDOVER-192` says **a desktop browser cannot show**.

**What to do:** move the `Settled` heading to the end of the file, or retitle it *"Settled — the v82–v98 backlog, no phone needed"* so it scopes to what sits above it. One line, and it is the difference between Max seeing 193's carton question and not.

### D2 *(MEDIUM)* — two backwards CSS comments, open since 10 Aug, whose stated blocker no longer exists

`css/style.css:3700` — *"a bare `display:flex` **outranks** the UA's `[hidden]{display:none}`"* — and `:3844` — *"a bare `display:block` **outranks** the UA's `[hidden]{display:none}`"*. Both mechanisms are wrong: `[hidden]` is an attribute selector at the same specificity as a class, so nothing out-ranks anything — the author rule wins because **origin is resolved before specificity is compared**, which is exactly what `CLAUDE.md`'s own `[hidden]` corollary says.

Open since 10 Aug 2026 — **17 batches, 10 deploy versions.** `docs/MAINTENANCE.md:340` states why it matters: *"the wrong explanation invites the wrong fix: someone reading 'outranks' reasons that matching specificity will do, and it will not."* The guards themselves are correct and must not change.

**What to do:** reword both to name cascade origin. It lands in a client asset so it takes a cache bump and the mandatory review — which is the whole reason it has never ridden a batch. **The 13 Aug standing-authority reversal makes this the assistant's call now**, and the entry's line-number citations have drifted 440 lines while it waited (T3).

### D3 *(LOW)* — nothing mechanical stops a future batch making a product id meaningful *(this is check 3 of batch 193's three asks — recommendation in §6)*

### D4 *(LOW)* — two threads 193 found and deliberately did not queue

`HANDOVER-193:83`: *"The mapping is not remembered between imports, so a café on an unrecognised format re-maps eight columns every month"* and *"nothing anywhere shows a product's supplier code, so a user cannot check why a re-import matched or did not."* Both reached **neither `docs/QUEUE.md` nor `docs/MAINTENANCE.md`** — they exist only in a write-once handover.

193's stated reason is sound (*"neither has been asked for and both are speculative until somebody has actually used this twice"*) and I am not disputing it. But `CLAUDE.md`'s rule is *"If you spot extra work worth doing, **write it down** — don't build it"*, with `docs/MAINTENANCE.md` as the default destination, and the interesting kind of dropped thread is exactly one that reached neither file. **What to do:** two lines in `docs/MAINTENANCE.md` under C, marked speculative. The second one is the more likely to matter — a re-import that silently matched the wrong product has no user-visible way to be diagnosed.

### The charter's named candidates

| Thread | Status | Proof |
|---|---|---|
| **Staging Supabase** | **DONE** (172), and now routine | `docs/STAGING.md` records three more rehearsals this window: 181, 191, 193. 191 and 193 both satisfied step 2 by **diffing the seven fingerprints** rather than re-running `01-schema.sql` — a real procedural improvement, recorded as transferable at `docs/STAGING.md:262` |
| **Eval harness for the invoice reader** | **Not done** | `docs/MAINTENANCE.md:180-185`, unchanged. Still correctly scoped (offline against stored responses; needs Max's real invoice set; corpus location undecided) |
| **`manager` as a third role** | **DONE — closed by decision, and now enforced** | Two roles only. `business_members_role_check` and `business_invites_role_check` both `check (role in ('owner','staff'))`; `tests/roles.test.js:184` pins it |
| **The privacy revisit** | **Not done — and it became URGENT on 14 Aug** | `docs/QUEUE.md:92-98` (item 3). Max's answer 1B (self-service signup) means a stranger's café is now a scheduled event, not a hypothetical. `CLAUDE.md`'s gate correctly grew teeth and `docs/QUEUE.md:39` carries the `Do after:`. **This is the top open item in the project** |
| **Bulk catalogue bootstrap** | **DONE** — shipped 193 as `ezplate-v166` | `js/app.js:1943` onward, `tests/catalogue-import.test.js`, `tests/visual/v166-catalogue-import.spec.js`, `supabase/migrations/20260815_supplier_code.sql` |
| **Import/restore from JSON backup** | **DONE**; step 3 still open and correctly not discharged | `docs/QUEUE.md:149-167` (6b), gated behind 6a. Rehearsed on staging (172), never on production |
| **Abbreviation matching in search** | **Still not built; record correction still not propagated** | `docs/MAINTENANCE.md:343-350`. `js/app.js:701-704`'s decline is unchanged. The requirement is *"correct the record first"* and it has not been done in three audits |
| **`TODO(Max)` markers** | **DONE — zero remain** | `grep -rn "TODO(\|TODO:\|FIXME\|XXX:" js/ index.html sw.js css/ api/` → no hits |

---

## 6. Batch 193's three questions — the direct answers

**1. `supplier_code` in the three places — VERIFIED, all three agree.** Table in S8. Nullable, no default, no unique index, `||null` on both mapper directions, mirror carries the same statement under a §4a2 heading naming the migration. `CLAUDE.md` does not mention it and **I do not recommend adding it** — the semantic-keys general law already covers the class, and the row-boundary section's subject is the camelCase/snake_case boundary, which `supplier_code` does not cross. The residue from this check is S7: the handover claims a `buildBackup` comment that was never written.

**2. The twenty-incident roster — the header is CORRECT and every citation resolves.** 20 bullets, header reads twenty, all 16 distinct batch numbers map to real handover files (verified individually, including the `v113` legacy form and the four lettered pairs). The undercount failure has not recurred. The residue is S6: 193 found two more instances and did not count them, so the number now understates frequency while reading like a tally.

**3. `ingredients_pkey` being `PRIMARY KEY (id)` — my recommendation: DO NOT widen the key. Close the gap with a test instead.** *(LOW-MEDIUM, and it is cheap)*

The fact is confirmed against the mirror: `supabase/staging/01-schema.sql:105` `id text primary key`. 193's reasoning in `20260815_supplier_code.sql` is correct and the design it chose is the right one.

**Why not widen it.** Widening to `(business_id, id)` is a real migration with 183's law attached — the `restore_backup` function would have to be replaced in the same transaction, and `ingredients.id` is depended on by `plate.lines[].pid`, `kitchenIngredients[].pid` and `ing_price_history.product_id`, none of which carry a tenant. It buys nothing today: `uid()` mints random ids (`tests/unique-ids.test.js` pins that at six tests including *"two independent sessions do not collide — the cross-ACCOUNT case"*), and `docs/STAGING.md:249` records the one real cross-tenant collision seen in a rehearsal **failing loudly with 23505 and rolling the whole transaction back** — the good failure mode. The cost is a migration on a critical table to defend against a design nobody has proposed.

**Why the gap is nonetheless real.** The protection is entirely narrative — a migration header, a `docs/STAGING.md` section and a queue pointer that this audit is about to consume. `tests/unique-ids.test.js:212` already carries the *inverse* guard, pinning that the semantic keys stay content-derived *because they are tenant-scoped* — but **nothing pins the direction that matters here**: that `ingredients.id` stays random *because it is not*.

**What to do — two assertions in `tests/unique-ids.test.js`, beside the existing scope guard:**
- every product-id mint in `js/app.js` goes through `uid(` — measured today: `uid('CX')` at `:10330`, `uid('IMP')` at `:2455`, and no others;
- `supabase/staging/01-schema.sql`'s `ingredients` create table still reads `id text primary key`, so the day someone widens it the guard is re-judged rather than silently satisfied.

Both with the reason in the failure message: *"ingredients_pkey is (id), not (business_id, id) — a content-derived product id collides across tenants. See `supabase/migrations/20260815_supplier_code.sql`."* That turns "nothing enforces that a future batch reads that file" into a red test that hands them the filename, for two assertions and no migration.

---

## Ranked: what is worth a batch, and what is noise

**Worth one docs-and-comments batch, and it is mostly `CLAUDE.md`:** S1 (the `setProduct` sole-writer claim, plus the same wording in `js/app.js:3415`) · S2 (`CX*`) · S3 (FK count) · S4 (`roles.test.js` pins five, and `invites.test.js` is a second file) · S7/C2 (the `buildBackup` note 193's handover already claims exists) · S6 (roster count or a scoping sentence). Six corrections, all counts and citations where the code is the sole authority, all inside live entries — `CLAUDE.md`'s own law says the code wins and none of these needs Max.

**Worth mechanising rather than correcting a third time:** S5. `:not([hidden])` has now drifted twice in ten versions and three files carry three different numbers. AUDIT-v156's T1 fix is the proof that the mechanical version holds — the CI spec count absorbed seven new specs without moving.

**Worth ten minutes each, rides any batch:** D1 (move one heading in `docs/PHONE.md` — highest value-per-minute in this report) · D2/T3/R4 (two CSS comments, blocker expired) · C1 (strike the superseded A/B/C block from queue item 1) · C3 (merge the duplicate maintenance entry) · C4 (strike the fired trigger) · T2 (one row in the handovers README) · D4 (two speculative C entries) · check-3's two assertions.

**Worth a decision, not a batch:** T1 — `screenshots.spec.js` has been unable to pass for ten deploy versions and cannot report it. `docs/MAINTENANCE.md:163` names the two honest answers; someone has to pick one. **Deleting it is a real answer** and the file says so.

**A judgement for Max, not a finding:** §2b's Tier 1 consolidation. The file nearly doubled, Tier 1 nearly tripled, nothing in it is dead, and the six multi-tenant sections are one theme seen six times. Consolidating is a rewrite of measured material and I am not recommending it unilaterally.

**Noise — recorded, not worth chasing:** S9 (one duplicated scheduling sentence, correctly mirrored in QUEUE) · S10 (the skills copies are identical today) · S8 (`supplier_code` needs no `CLAUDE.md` line).

---

## Nothing to report in

- **Invariants** — every one TRUE. The protected parser region is **byte-identical across ten more deploy versions and the entire multi-tenant rewrite**, twenty-one deploy versions and four audits after the hash was first recorded.
- **Dead traps** — none recommended for removal. **Sixth consecutive clean result.** All 25 Tier 1 entries checked against current code; every subject present, named and reachable.
- **The multi-tenant Tier 1 sections vs the migrations** — every one verified against the live SQL and every one matches. All nine restrictive policies carry `as restrictive` and name one command; the `business_id` DEFAULT and its trigger both call `current_business_id()` (part 2 correctly replaced part 1's literal); `invited_by` has both and they agree; the three-value gate is live with the two-value counterweight one function away and commented as such; `where true` intact on all five restore deletes; no `onConflict` at either client upsert. **No Tier 1 claim about the multi-tenant work disagrees with the code** — the ten stale claims in §2a are counts and function names elsewhere.
- **The `supplier_code` three-place check** — clean, all three agree (batch 193's ask #1).
- **The twenty-incident roster** — header correct, list correct, every citation resolves to a real handover (batch 193's ask #2).
- **Test suite health** — 1347/1347 unit green in 3.1s, mutation gate 360/365 killed with five written allowances, CI green on `main` at v166, 38 Playwright spec files with the 37/38 hermetic filter pinned by test and **measured correct**. No unexplained drop; +361 tests all attributable to named new files.
- **The charter's three known recurring symptoms** — zero new occurrences of pack-size persistence, invoice flag-pill alignment or menu empty-state centring. Sixth consecutive clean result.
- **AUDIT-v156's findings** — **all fourteen actioned.** S1/C2 staging (`CLAUDE.md` now reads "STAGING IS NOW REAL") · S2/C1 (`.claude/skills/batch/SKILL.md:97` now says *"A migration does not count and does not block"*) · S3 nine panes · S4 ten `:not([hidden])` (corrected then re-drifted — S5) · S5 storage keys (correct on both halves and holding) · S6 roster count · C3/D3 `new-branch` skill (`:90` now *"MANDATORY and runs BEFORE push"*) · C5/D6 `--text3` entry deleted and the token gone from CSS · T1 mechanised and holding · T3 struck · D4 all four `Do after: F10` swept · D5 `docs/PHONE.md` maintained, with 186, 192 and 193 all adding entries and 181–191 each recording a deliberate "None". **First audit in this project's history with no carry-over.**
- **Documentation routing** — thirteen consecutive batches (181–193) landed their `CLAUDE.md` edits directly under the 13 Aug standing authority. Zero parked edits. The failure class that produced AUDIT-v156's D1 is gone.
- **Third-party supply chain** — both scripts pinned exact with `sha384` (`@supabase/supabase-js@2.110.8`, `pdfjs-dist@3.11.174`), worker pinned-only as documented, no fourth dependency, no build step, no analytics, zero `TODO(`/`FIXME` markers.
- **Queue hygiene** — 8 items against a cap of 20. Every `Do after:` accurate and traceable. The `6a`/`6b` renumbering ledger at `docs/QUEUE.md:151` is exemplary record-keeping.
- **Migration discipline** — all seven migrations this window carry the rollback statement in the header, the applied-to-staging and applied-to-production records with dates and verification method, and the client-versus-server ordering with its reason. 186 shipped a `do $$ … raise exception` precondition block and **proved it fires**; 193 states its ordering explicitly and says why it is the opposite of 186's.

---

# How batch 194 routed these findings

Written at filing time, so a later reader can tell what was acted on from what was merely recorded. **Four of the audit's counts were independently re-measured before acting on them** — `setProducts`'s three call sites, the five-entry `RESTRICTED` array, the thirteen `:not([hidden])` rules and the eighteen live foreign keys — and all four confirmed. The rest are taken on the audit's evidence.

**Fixed in batch 194** (all prose; no client asset, so no cache bump and no `code-review`): S1's two `CLAUDE.md` sites · S2 · S3 · S4 · S5 (enumeration deleted rather than re-counted) · S6 · S9 · C1 · C2's rule-softening half · C3 · C4 · D1 · D4 · T2 · T3 · R1's Tier 3 clause.

**Routed to `docs/MAINTENANCE.md`** as C-tier, because each changes a file that ships or runs and therefore needs a cache bump and the mandatory review, which a prose batch must not carry: S1's `js/app.js:3415` comment · S7/C2's `buildBackup` note · D2 (the two backwards CSS comments, with T3's corrected line numbers and the note that its blocker expired) · D3/check-3's two `tests/unique-ids.test.js` assertions · S10 · T1 **with the decision already taken** — `test.skip` with a named reason rather than deletion, so whoever executes it does not re-litigate it.

**Not actioned, deliberately:** S8 (the audit recommends against it and I agree) · §2b's Tier 1 consolidation, which the audit correctly calls a judgement for Max rather than a finding — it is recorded in `HANDOVER-194` for him rather than acted on unilaterally, because condensing measured material is the one documentation call where a wrong edit loses evidence rather than adding it.
