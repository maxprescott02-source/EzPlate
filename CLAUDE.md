# CLAUDE.md - EzPlate (Scoopys-Costing)

@AGENTS.md

EzPlate is a plate/menu-costing PWA for a real cafe ("Scoopy's Family Cafe"). The owner is **Max** - hospitality background, new to coding and to git. Price data drives real menu decisions and the data is real, so a broken deploy costs money.

**Who uses it: ONE intermittent user, not staff on real phones mid-service.** Gaps of a week between uses are normal. When a design call turns on how often the app is opened, this is the answer: an occasional user on mobile data can wait for a fetch, and would rather be told a thing did not save than discover it next week.

**This file holds the RULE. `.claude/rules/` holds the EVIDENCE, and the harness loads it with the file it protects.** Every rule here exists because a mistake already happened once; the incident, the measurement and the date are in the rule file named below. Everything true but inferable has been deleted on purpose: a stale fact is worse than no fact, because it gets trusted. If a line here disagrees with the code, **the code is right and this file is a finding** - report it.

**It is under 200 lines and `tests/claude-md-split.test.js` fails if it grows past that.** A rule that earns its place here displaces one. The alternative is what this replaced: 1,078 lines and 164KB, loaded in full on every turn of every session, growing 18% in three days with nothing able to notice (batch 264, gap E3 of the 12 Sep 2026 standards audit).

## The rules that load with the file they protect

`.claude/rules/*.md` carry `paths:` frontmatter, so **Claude Code loads them when it reads a matching file** and not otherwise. They are a mechanism, not a pointer you are asked to follow.

⚠️ **The trigger is a READ, and that is a real gap rather than a technicality** (named by 264's own pre-push review). **Creating a NEW file needs no read, and `cat`/`grep`/`sed` is not a read either** - so writing a fresh migration under `supabase/migrations/`, which is the highest-stakes thing anyone does here, is exactly the case where `sql.md` may never load. **Open the rule file by hand whenever you are creating a file, or planning against one you have not opened.** Nothing will tell you it did not load.

| File | Loads when you read | What it holds |
|---|---|---|
| `.claude/rules/app-guards.md` | `js/app.js`, `index.html` | duplicate top-level definitions · the scope of an exemption · `isFinite('')` · inert `min`/`max` · fail-open vs a third value · an optimistic write that moves a FIGURE · citing a precedent · a comment filed under the wrong consequence |
| `.claude/rules/app-data.md` | `js/app.js` | the naming inversion in full · the row boundary and the backup format · `updated_at` · the five history series · cross-referencing write ORDER · the three FKs · the headline average · per-publication counting |
| `.claude/rules/invoice.md` | `js/app.js` | the parser region and its two anchor literals · the corpus · review-render invariants · auto-tick · taught packs · supplier renames |
| `.claude/rules/sql.md` | `supabase/**` | column DEFAULTs and the restore · DEFAULT vs BEFORE trigger · cross-tenant FKs · `as restrictive` · `anon` and `revoke … from public` · `create or replace` · `ON CONFLICT` · the client's role vs the MCP's · who may delete what |
| `.claude/rules/css.md` | `css/style.css` | `@media` specificity · the `:not([hidden])` guard · `position:fixed` containing blocks · offsets on a static box · a silent syntax error |
| `.claude/rules/tests.md` | `tests/**`, `.github/workflows/**` | the 22-incident roster of tests that could not fail · the mutation gate · viewport-geometry assertions |
| `.claude/rules/api.md` | `api/**` | the server functions · the money/number law · untrusted model output |
| `docs/rules/process.md` | nothing - read it by hand | the full record behind every Tier 3 rule below, and the full text of anything compressed here |

## Where things live

| | |
|---|---|
| Outstanding work - tier A and B, **plus at most ONE process item**, capped at 20. **The WORKING SET, not the backlog** | `docs/QUEUE.md` |
| The backlog - 72 items from the 8 Sep 2026 consolidation, struck as they ship | `docs/QUEUE-2026-09-08-CONSOLIDATED.md` |
| Which of those load the same context, and the promotion order `/batch` refills from | `docs/QUEUE-GROUPS.md` |
| Tier C - internal quality, ridden along by whichever batch already touches the file | `docs/MAINTENANCE.md` |
| Device checks | `docs/PHONE.md` |
| Migrations - the procedure, both projects, what staging can and cannot rehearse | `docs/STAGING.md` |
| Per-batch history | `docs/handovers/` (write-once; `README.md` explains the gaps) |
| Version bumps, handovers, running the checks | `skills/` - invoke them |
| Derived state - batch, deploy version, current group, open count, newest audit | `docs/STATE.json`, rewritten by `node tools/state.js` in the same commit as each handover |
| Current state | git, the repo, the Supabase MCP. Not this file. |

**Two counters, and they are NOT the same number.** The **batch number** in a handover's filename increments once per batch, always; the **deploy version** (`sw.js` `CACHE`, the six cache spots) increments only when a batch ships a client asset. Four docs-only batches in a row once left them three apart. **New handovers drop the `v`: `HANDOVER-123-short-name.md`**, and existing `HANDOVER-vNN.md` files keep their names because they are write-once. **Every handover states the deploy version it shipped, or says it shipped none.** **`docs/audits/AUDIT-vNN.md` KEEPS its `v`** and is correct as-is: an audit is keyed to the deploy version, because the `/batch` counter compares it against `sw.js`. Do not make them consistent; they number two different things.

**Process docs live in `docs/` because Vercel serves the repo root**, so anything left there is publicly fetchable. That is no longer a privacy reason - the docs are world-readable on GitHub whatever `.vercelignore` says - but the rule stands to keep non-user-facing files off the deployed origin. **Anything new that is process rather than product goes in `docs/`.** `CLAUDE.md`, `AGENTS.md` and `.claude/` are the exceptions and stay at root, because that is the only place the harness loads them from.

**`git fetch` and read `origin/main` yourself before trusting local `main`** - Max merges via GitHub PR, so local goes stale.

## ⚠️ THE REPOSITORY IS PUBLIC (13 Aug 2026). NOTHING SECRET MAY EVER BE COMMITTED.

Every file, every branch and **the entire git history** is world-readable, and a commit that leaks a secret is not fixable by deleting it later. **The only safe rule for anything NEW is: it never goes in.** API keys stay in Vercel env vars. GitHub secret scanning and push protection are ON, and push protection is the useful half because it rejects the push rather than telling you afterwards. **It is a backstop, not the rule** - it knows vendor key formats and knows nothing about a cafe's invoices or a supplier's name, which is the class this repo actually leaked.

**What is public that is not a credential**, because the pre-switch check looked for secrets and never looked for business data: the real distributor is identifiable in dozens of tracked files (`git grep -l -i bidfood | wc -l` is the live figure); `tests/fixtures/base-products.json` holds 393 real products with real unit costs; every commit carries Max's real name and personal Gmail, permanently; the Supabase anon key ships in `index.html`, so rotating it achieves nothing while the anon fallback is open.

**The transferable rule: a check that finds nothing has only proved something about WHAT IT LOOKED FOR.** "No secrets" is not "safe to publish", and this file said the second on the strength of the first. Full record: `docs/rules/process.md`.

## The naming inversion - never "fix" it

UI labels and internal identifiers are deliberately CROSSED.

- `data-tab="pantry"` is **labelled "Ingredients"** (kitchen words); `data-tab="ingredients"` is **labelled "Products"** (supplier goods); `data-tab="builder"` is **labelled "Plates"**.
- `kitchenIngredients` / `king*` / `kById` = kitchen words (UI "Ingredients"), and they live in an `app_settings` JSON blob under `kitchen_ingredients`.
- `PRODUCTS` / `byId` / `ing*` **and the Supabase `ingredients` TABLE** = supplier products (UI "Products").
- Same class: **`rowToMenu` maps a DISH**, despite the name. Read the table name, not the function name.

**Only ever change text a human reads.** Never rename an identifier, class, id, `data-tab` value, localStorage key or Supabase table. Renaming for consistency has caused rollbacks. `tests/terminology.test.js` carries three inversion guards because a terminology pass is exactly when someone is tempted.

## The four object nouns - UI copy may not invent a fifth

- **Product** - something you buy from a supplier.
- **Ingredient** - the name you cook with; links to exactly ONE product.
- **Plate** - a costed dish built from ingredients.
- **Menu** - a set of plates with sell prices.

**Forbidden as object nouns:** "recipe" (names nothing in this app), "kitchen word" / "kitchen name" (internal vocabulary - the object is an **Ingredient**), and **"dish"** (Max, 25 Jul 2026: a plate on a menu is still a plate). Describing without naming is fine - "the name you'll use when building plates" is good copy; "your kitchen name" is not. `tests/terminology.test.js` pins this. **"Menu item" is a known surviving fifth noun** in the Edit-menu-item modal, awaiting its own brief - not a bug to fix on sight.

## Data and storage

- **Supabase is the source of truth; the app is online-only.**
- **localStorage holds view preferences and derived caches ONLY** - never data. If something new resists that classification, **ask: there is no third category.** The plate draft (`cafeDB_plateDraft`) is the one standing exception and is unsaved work on its way to Supabase.
- **Grep the STRING `cafeDB_`/`cafeCost_`, never the call site.** Thirteen keys exist; a `getItem('...')` grep finds six, because six go through a constant and one is never read at all. A fourteenth hit is PROSE. Read the hits; do not trust the count.
- Products come from the Supabase `ingredients` table and nowhere else. **`is_custom` is the column that says a row is the user's - never the id prefix**, which is `CX` from the invoice flow and `IMP` from the importer, and nothing reads either.
- NEW plate lines are written `{kid, qty}`; legacy `{pid, qty}` and `{misc, label, cost}` lines are LIVE data that every reader must keep resolving. `nextKid()` scans the live array - push immediately, never batch ids.

## Writes

- **Every Supabase write goes through the `pushWrite`-wrapped helpers** (`dbPushPlate`, `dbPushMenu`, `dbPushIngredient`, `dbSetSetting`, `saveKitchenIngredients`, …). They set sync state and surface the REAL error to a toast. Never call the client raw.
- **`pushWrite` returns its settled promise** - the result or `{error}`, and **NEVER `null`**. `null` is `dbPushMenuAfterPlate`'s contract, not `pushWrite`'s. **A caller that treats only `null` as failure sequences its dependent write straight after an error.**
- **Known gap, flagged not fixed:** `pushWrite` **drops** writes when fully offline - no queue, no retry. It is not silent: the fail handler toasts *"you're offline. It has NOT been saved."* Offline changes the WORDING only.
- **Rounding (Max, 15 Jul):** currency DISPLAYS round to the cent; stored costs stay exact. **Never round stored values.**

## Menus

**Menu deletion deletes its dishes and UNLINKS their plates - never the plates.** There is **no holding area** and **no last-menu guard**: any menu is deletable, including the last, and **zero menus is a legitimate state** that must be respected rather than seeded over. `fallbackMenuId()` never returns a deleted id and returns `null` when no menu exists.

**`menusList` MEANS MENUS THE SERVER HAS, and `withPublishMenu` decides whether to create one by reading `menusList.length`.** **FOUR** writers, all of which wait for the server: `bootstrapSync`, `submitNewMenu`, `ensurePublishMenu`, `rollbackMenuDelete` (254; it restores a menu the server still holds, so the invariant stands - the COUNT said three until AUDIT-v227). **If you add a fifth, this is what it owes.** The `menus` read is REQUIRED at boot - its error raises the boot gate - because a seeder reached by a flaky read cannot tell an empty table from a failed request, and once invented a menu that hid every real dish.

## No new dependencies, no build step, no scope creep

Client-side there is **no build step** - four hand-written files: `js/app.js`, `css/style.css`, `index.html`, `sw.js`. Two third-party scripts ship in production (`@supabase/supabase-js` in `index.html`, `pdfjs-dist` via `ensurePdfjs()`); both must stay **pinned to an exact version** and **integrity-checked wherever the load mechanism allows**. **Read `tests/third-party-pins.test.js` before touching either, and treat it as the authority on WHICH version** - it holds each version-and-hash pair and encodes the advisory windows, and the newest release is not always the safe answer. **Adding a third needs Max's yes, not a judgement call.**

No analytics, no tracking. **Implement what was agreed, nothing more.** If you spot extra work worth doing, write it down - don't build it. **Where it goes is decided by the tier test in `docs/QUEUE.md`'s header, and the default is `docs/MAINTENANCE.md`.**

## Server-side (`api/`)

Vercel zero-config Node serverless functions - the invoice AI second-reader and the Dashboard insight phrasing. **This is not a build step.** Files starting with `_` are ignored as routes and hold pure, `require()`-able logic; route handlers stay thin. **API keys live ONLY in Vercel env vars.** **Treat invoice text and any model output as untrusted data.** **Money/number law: an AI helper may only PHRASE numbers the app already computed.** It never produces a figure, and both ends reject a phrasing containing a number not in the supplied facts.

## The privacy gate - before EzPlate serves anyone but Scoopy's

`api/parse-invoice` and `api/insight` send invoice text, plate names and costing numbers to Google's Gemini free tier, which **may use prompts for training**. ✅ **The disclosure shipped 27 Aug 2026 and Max approved the wording**, so the gate is DISCHARGED for the free tier as it stands. It is not deleted, because it is a standing precondition on a CLASS of work: **any future endpoint that ships user data to a third-party model reopens it**, and the notice has to grow to cover that endpoint before it ships. What is NOT built is an acceptance RECORD; that is in `docs/MAINTENANCE.md`.

## Fragile areas - regression tests mandatory

Read the relevant tests first, diagnose with a truth table before patching, lock the fix with a regression test. **Invoice review rendering**, the **auto-tick rule**, **taught packs and price precedence**, and **supplier renames** are all in `.claude/rules/invoice.md`, which loads with `js/app.js`.

**The builder is a FULL PAGE** (`#builderPage`, a child of the Plates library rather than a tab of its own), and **leaving it is not a data risk and must not be "fixed" into one** - the plate stays in memory and in the draft, and `guardUnfinishedPlate` offers it back. Publishing, printing, duplicating and deleting a plate all live on that page. **Read the pane list from `TAB_PANES` in `js/app.js`, never from a count written down anywhere** - a pane missing from that array renders UNDERNEATH the builder page.

**Mobile visual consistency:** one card system, compact header pills not full-width bars, one primary CTA per screen. A previous density pass was rolled back wholesale - visual changes are surgical, one screen at a time.

# Tier 3 - How work arrives

## Chat cannot see this repo

Every claim a brief makes about the code is an **inference from a summary**, and those inferences have been wrong repeatedly. **When a brief contradicts the code, the code wins and the brief was wrong.** Report it; never work around it silently. **Pushback is the point, not a courtesy** - every enumeration in this project has come back different from the brief's guess. `/investigate` runs before a brief when one is warranted, and its highest-value output is "this is the wrong question".

## Working with Max

- He communicates tersely, in note form, usually with phone screenshots. **Ask for a screenshot when unsure.**
- **Plan first - when the work is not already approved.** Work arriving from chat, a brief or a screenshot is unapproved: restate it as a scoped, root-cause-framed plan and get a yes, asking any clarifying questions up front with your recommended answer for each. **An item already in `docs/QUEUE.md` is approved** and `/batch` runs it without stopping.
- ⚠️ **A queued item's approval does not expire and its FACTS do.** Four of seven consecutive batches found their item materially wrong at execution. **Check a queued item's factual claims against the code before planning off them, and when they disagree, rewrite the item and carry on.** That is not re-asking and it is not a stop condition.
- **Rollbacks happen.** If Max says the baseline is X, believe him - then verify it yourself and report discrepancies before working.
- **Keep commentary in the PR and the handover - never in user-visible app copy.**

## Migrations - Claude applies them (REVERSED 8 Aug 2026)

`list_migrations` is empty, so **the migration files plus their commit messages ARE the audit trail.** Max reversed the old "let Max run it" rule - *"i dont want you to stop for me to hand run a query"* - so **a migration is not a stop condition.** Write it, apply it, verify it, record it. `docs/STAGING.md` is the procedure; `.claude/rules/sql.md` is why each step exists.

- ⚠️ **An ordinary session cannot reach production at all.** `.mcp.json` carries **staging only**; production lives in `.mcp.production.json`, which nothing loads unless the session was started with `claude --mcp-config .mcp.production.json`. **Never write a header that reads as applied because you could have applied it.**
- **Staging first, then production.** Staging proves a migration RUNS, never that it gives the right answer for Scoopy's, and neither project has a second tenant.
- **Verify AS THE CLIENT, over PostgREST with the anon key.** The MCP runs as `postgres` and bypasses RLS. On a write, send `Prefer: return=representation`: **a blocked anon write returns success and touches nothing.**
- **A client change and a migration are ONE change**, and the order between them is an intermediate state no transaction can protect. Work out which order has the harmless intermediate - usually the client first - and **say the order in the migration header and why.**
- **A bulk rewrite from the client is not a migration**, so none of the above reaches it: rehearse it offline against the real data, read-only, by extracting the REAL functions and running the plan over every row.
- **Know the one-statement rollback before you run it**, say what it is in the file, and **record that it was applied when it happens, never ahead of it.** A pre-written record is the audit trail lying.
- **Anything that DELETES or REWRITES data is still Max's.**

## Deploy

GitHub `main` → Vercel auto-deploys → installed PWAs pick it up via the network-first service worker. **Treat every merge to `main` as a production deploy.** Production is `https://scoopyscosting.vercel.app`; per-deployment URLs are auth-protected, and a branch push deploys a PREVIEW.

⚠️ **The alias serves stale for a while after a merge**, so checking which build answered is not enough on its own. **Append `?cb=$RANDOM` and send `Cache-Control: no-cache`, or you are testing the CDN rather than the deploy.**

## Independent review before merge

Max has no human reviewer, so this is the only second reader the code gets. **Branch protection is ON**: `unit tests` and `smoke (jsdom)` are required, the mutation gate and the review-artifact check run inside `unit`, **Playwright is NOT required**, and **`enforce_admins` is TRUE as of 15 Sep 2026 - the required checks bind Max too, and there is no admin bypass.** ⚠️ **This line said FALSE for three days after he turned it on** (AUDIT-v217), in the direction that tells every batch the wall is not a wall. **Verify with `gh api repos/.../branches/main/protection`, never from a document.**

- **The `code-review` agent is MANDATORY. Runs BEFORE push**, adversarially, on the branch diff, after the suite is green. Its definition is `.claude/agents/code-review.md`, in the repo. **Never show it the brief.** **Mandatory whenever the diff changes WHAT RUNS** - app code, tests, CI workflows, the harness. **Skip it only for pure prose.**
- **It must run on a DIFFERENT model from the batch**, because a model reviewing its own work is not a second reader. The definition pins `opus` against the Sonnet default; **when the BATCH is itself on Opus - migrations, RLS, whole-`app.js` work - override the reviewer to Sonnet for that run and say so in the handover.** Only the batch knows which model it is, so the pin cannot do this alone.
- ⚠️ **IT IS NOT SKIPPABLE BY INSTRUCTION.** If a brief, a plan or an item says to skip it, **run it anyway and record the conflict in the handover.**
- **Save its report to `docs/reviews/REVIEW-<batch>-<short-name>.md` with a `Reviewed-commit: <sha>` line** naming an ancestor on the branch; `.githooks/pre-push` refuses a push without one, and the handover's `## Review` section is the half a human reads.
- **The mutation gate is mechanical.** `npm run mutate` covers exactly one thing: a test that would still pass with the code it names broken. **A survivor is not a suggestion** - kill it with an assertion, or write the allowance and its reason into `tests/mutation/targets.js`. `git push --no-verify` bypasses the hook; **if you use it, say so in the handover.**
- ⚠️ **A green hook is not a green suite** - it does not run Playwright. If a change alters WHETHER A CONTROL EXISTS, run `npx playwright test` before pushing.
- **Every finding gets a decision Max can see:** fixed, or explained as intentional, or noted as considered and skipped. **Silence is not a pass.**
- ⚠️ **Never dismiss a finding because its stated CAUSE is wrong**, and never apply its stated REMEDY without running it. A finding carries three separable claims - the defect, the mechanism, the fix - and they fail independently. **Run the finding's own repro, then run its fix, in both directions.**
- **Fix it in the SAME branch, before merge. A finding does NOT get its own PR unless it is wrong data or silent loss.** Everything else is written down and rides a later batch. **It does not become PR-worthy because the work is already written, because it is small, or because a commit needs re-landing.**
- **DECIDED, 8 Aug 2026: no second reader beyond the pre-push agent. CodeRabbit is NO, GitHub Pro is NO, and `.github/workflows/code-review.yml` is deleted. Do not re-propose any of them.**

## Changing this file - the edit is YOURS to make (Max, 13 Aug 2026)

**Standing authority: make the edit and report it in the handover.** Do not park it on a yes. This covers `CLAUDE.md`, `.claude/rules/`, `AGENTS.md`, new rules, corrections, strikes, `docs/MAINTENANCE.md`, `docs/QUEUE.md` prose, the skills, and every other process file. **The asymmetry is the argument: a wrong edit is caught, because `project-audit` re-checks every documented claim against the code. A parked edit is caught by nothing.**

**Two things still need him, and only these:** a change to a **decision he made himself** (the naming inversion, per-publication counting, the builder-as-a-page reversal, the More-screen gear removal), and **anything that would DELETE or REWRITE production data**, which is a stop condition rather than a decision file.

**Which item runs before which belongs in `docs/QUEUE.md` as a `Do after:` line, never here** - the queue re-checks its ordering every batch and deletes the line when it is satisfied, and nothing here can notice a scheduling claim going stale. Standing procedure INSIDE one piece of work ("staging first", "push the plate, confirm it, then the dish") names no item, never expires, and belongs here. **A note aimed at ONE FUTURE ITEM lives in that item's own body**, in the imperative, ending "answer it here, do not route it onward."

**A DONE-MARK IS NOT A STRIKE.** Recording that an item is done somewhere else in a file does not close the item - **strike the entry**, because the entry is what the next reader acts on. And **a standing checklist item is an instruction to spend part of every future audit's budget**: when you disprove something, fix the SOURCE that keeps asking. **If an audit re-derives a correction a previous audit already made, the defect is in the record, not in the code.**

The test for any line here: **would a competent model reading this repo get this wrong?** True but inferable is a deletion. Version numbers, commit hashes, suite counts and descriptions of past batches belong to git, not here.
