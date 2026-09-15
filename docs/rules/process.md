# Process - the record behind the rules in `CLAUDE.md`

**Not auto-loaded.** `CLAUDE.md` carries the imperative; this file carries why it exists, which is what stops the next batch re-deriving a decision that was already taken. `skills/batch/SKILL.md` sends you here at the point it matters.

**Moved out of `CLAUDE.md` verbatim by batch 264.** Where a section also appears in `CLAUDE.md`, the copy there is the compressed rule and this is the full text.

⚠️ **Cross-references here were written before the split.** *"this file"*, *"Tier 1/2/3"* and *"the section above/below"* meant `CLAUDE.md` as it stood at 1,078 lines; the target is now `CLAUDE.md`, a file in `.claude/rules/`, or this one. **The text is deliberately unedited - rewriting fifty pointers by hand is how a rule drifts from the one that was agreed.** Grep the phrase rather than following the direction.

## Where things live

| | |
|---|---|
| Outstanding work - tier A and B only, capped at 20. **It is the WORKING SET, not the backlog** | `docs/QUEUE.md` |
| **The backlog itself - 72 items from the 8 Sep 2026 consolidation, struck as they ship** | `docs/QUEUE-2026-09-08-CONSOLIDATED.md` |
| **Which of those load the same context, and the promotion order `/batch` refills from** | `docs/QUEUE-GROUPS.md` |
| Tier C - internal quality, ridden along by whichever batch already touches the file (its header has the reasoning; the parallel worktree track was retired 22 Aug 2026) | `docs/MAINTENANCE.md` |
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

- **Scoopy's real food distributor is identifiable.** `Bidfood` appears in **around forty tracked files** (26 until 28 Aug 2026, 37 until 2 Sep 2026, and it will keep moving — **`git grep -l -i bidfood | wc -l` is the live figure and this sentence deliberately no longer competes with it**), including the real letterhead string `BIDFOOD SUNSHINE COAST a division of` in `js/app.js`, and handovers and tests that say outright they were *"proved against his four real Bidfood PDFs"*.
  ⚠️ **Two of those files were ALREADY public and the rest were not** - Vercel serves `js/app.js` and `css/style.css`, so the parser comments were world-readable before any of this; the **27** test files, `docs/PHONE.md` and the handovers are newly so.
- **`tests/fixtures/base-products.json`** - 393 real products with real unit costs. **Supplier names are absent from THIS FILE**, which is what made the first check answer "no supplier names". That was true of the fixture and false of the repo, and stating a narrow grep as a broad conclusion is the whole mistake.
- **Every commit carries Max's real name and personal Gmail** - every one in the history, permanently, and `git rev-list --count HEAD` is the figure (512 on 13 Aug 2026, 588 on 2 Sep 2026 - the number was written out here and went stale exactly as the Bidfood one above did). Not fixable without a history rewrite. Set GitHub's *Keep my email address private* for future commits.
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

## No new dependencies, no build step, no scope creep

Client-side there is **no build step** - four hand-written files: `js/app.js` (all logic, one browser script), `css/style.css`, `index.html`, `sw.js`.

Two third-party scripts ship in production: `@supabase/supabase-js` in `index.html`, and `pdfjs-dist` loaded on demand by `ensurePdfjs()`.
Both run with full DOM access on a page holding the anon key and the café's pricing, so both must stay **pinned to an exact version** (never a floating `@2`) and **integrity-checked wherever the load mechanism allows** - the pdf.js *worker* is the one exception, pinned only, because `new Worker()` has no SRI.
Changing a version means recomputing its `sha384` in the same commit; a stale hash blocks the script outright.
**Adding a third needs Max's yes, not a judgement call.**

⚠️ **All of that was PROSE ONLY until 15 Aug 2026 — nothing checked any of it, and a floating `@2` or a stale hash would have shipped green.** `tests/third-party-pins.test.js` is now the mechanism: it holds each script's version-and-hash **pair**, so bumping one without recomputing the other fails by name.
**Read that file before touching either script, and treat it as the authority on WHICH version rather than reaching for the newest.** It encodes the advisory windows, and the newest is not always the safe answer — batch 195 took pdf.js to 4.10.38 rather than the latest release precisely because a second arbitrary-JS-execution hole affects a later line. Versions and CVE numbers are deliberately NOT restated here; they rot, and the test cannot.
**A test cannot verify a hash offline** (no network in CI, no dependencies here), so it proves only that you did not change a version and leave the old hash behind. Recomputing correctly is still yours: `curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A`.

No analytics, no tracking.
**Implement what was agreed, nothing more.** If you spot extra work worth doing, write it down - don't build it.
**Where it goes is decided by the tier test in `docs/QUEUE.md`'s header, and the default is `docs/MAINTENANCE.md`.** The queue holds only work that would stop, embarrass or hurt a paying customer at launch. (Max, 11 Aug 2026, after the queue reached 979 lines and 47 open items with the launch blockers at the bottom.)

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
  ⚠️ **BUT A QUEUED ITEM'S APPROVAL DOES NOT EXPIRE AND ITS FACTS DO, AND THOSE ARE TWO DIFFERENT THINGS.** (Added 15 Aug 2026 by AUDIT-v166, which measured it: **four of the last seven batches found their item materially wrong at the point of execution** - 187 *"wrong in two places, and split in a third"*, 189 *"its stated hard part was the wrong one"*, 192 *"presupposes something Max has said NO to"*, 193 *"lists two options, then supersedes itself"*. Four different framings, which is why no batch named it as one thing.)
  The cause is not carelessness, it is age: an item's claims about the code were true when it was written and the batches above it then shipped. **So read a queued item's factual claims exactly as you would a brief's - check them against the code before planning off them - and when they disagree, rewrite the item and carry on.** That is not re-asking and it is not a stop condition; every one of those four batches did it unprompted and nothing shipped wrong. Only the *approval* is settled by the item being in the file.
- **Rollbacks happen.** If Max says the baseline is X, believe him - then verify it yourself and report discrepancies before working.
- **Keep commentary in the PR and the handover - never in user-visible app copy.**

## Migrations - Claude applies them (REVERSED 8 Aug 2026)

`list_migrations` is empty, so **the migration files plus their commit messages ARE the audit trail.** That has not changed and is why every migration is still a committed file with its reasoning in the header.

**What changed:** this section used to read *"let Max run it… never apply one yourself"*, and a pending migration was a stop condition that halted the loop.
**Max reversed it** (his words: *"i dont want you to stop for me to hand run a query"*), on the strength of staging existing.
**A migration is no longer a stop condition.** Write it, apply it, verify it, record it.

**The safeguards are not optional - the old rule's protection has to be replaced, not just deleted:**

- ⚠️ **AND SINCE BATCH 263 AN ORDINARY SESSION CANNOT REACH PRODUCTION AT ALL.** `.mcp.json` carries **staging only**; production lives in `.mcp.production.json`, which nothing loads unless the session was started with `claude --mcp-config .mcp.production.json`. So "write it, apply it, verify it, record it" now ends at staging by default, and the production half is a deliberate act with a different session behind it. **That is the point** - the reversal above made Claude the one who applies migrations, and the 12 Sep 2026 audit found the consequence nobody had noticed: the café's live database was connected and `execute_sql` pre-approved in every session, while the disposable staging rehearsal prompted. `docs/STAGING.md` step 6 has what to write in the header and the one line to hand Max when production is out of reach. **Never write a header that reads as applied because you could have applied it.**
- **Staging first, then production - AND STAGING IS NOW REAL. `docs/STAGING.md` is the procedure; follow it rather than this bullet.** Seven steps: write the migration with its one-statement rollback in the header · re-run `01-schema.sql` to re-mirror · load a seed · apply to staging · verify AS THE CLIENT over PostgREST · apply to production and record it in the header · diff the two schemas with the fingerprint query.
  ⚠️ **This bullet said the OPPOSITE until 12 Aug 2026** - *"staging is EMPTY, so there is still nothing to rehearse against… the schema has not been mirrored and no seeds exist… every migration is still UNREHEARSED"* - which stopped being true on **11 Aug 2026**, when batch 172 shipped the mirror, three seeds and that procedure as `ezplate-v152`. The stale text sat here for four days with the queue's next four A-items all migrations, and `docs/STAGING.md:5` had already said *"That warning is now spent."* **The clause carried its own expiry** - *"the safeguard becomes real when the queue's staging item RUNS"* - and the item ran; this is that sentence being honoured, not overridden.
  **CONFIRMED by Max, 12 Aug 2026**, when the correction was put to him with the option of reinstating the old caution: *"yes leave it"*. So the removal of "defer destructive ones" from THIS bullet is deliberate and agreed - it was a weaker duplicate of the standing destructive-work rule below, not a second protection. Do not restore it.
  (History kept because both prior corrections asked for it: marked unavailable 9 Aug 2026, Max's yes, after the v125 audit found this file presenting the safeguard as available; the "has never yet loaded" clause corrected 10 Aug 2026, Max's yes, per AUDIT-v135 D1.)
  ⚠️ **What staging still does NOT rehearse, and this half is unchanged:** the DATA is invented, so staging tells you a migration RUNS - never that it gives the right answer for Scoopy's. **Neither project has more than one user**, so `anon` is the only role either has been exercised as, and the multi-tenant policies are the first that will distinguish roles: staging can prove they run and let the right rows through, **not that a second tenant is excluded.** A rehearsal you over-trust is worse than none.
- ⚠️ **A BULK REWRITE FROM THE CLIENT IS NOT A MIGRATION, SO NOTHING ABOVE REACHES IT - REHEARSE IT OFFLINE, AGAINST THE REAL DATA, WRITING NOTHING.** (Batch 239, the relink heal.) The seven steps are about SQL. A loop in `js/app.js` that rewrites a hundred `plates` rows has no migration file, and staging cannot help: its data is invented, and the whole safety argument for a heal is usually a claim about the RESULT - *"no cost moves"* - rather than about whether it runs.
  **That claim is checkable in ten minutes, and nothing else in this process checks it.** Pull the real rows READ-ONLY through the Supabase MCP into a scratch file, extract the REAL functions with `tests/_extractfn`, run the plan and the apply over them in Node, and compare the figure before against the figure after for EVERY row - not for a sample. 239 did exactly that over 103 real plates: 31 lines rewritten, 0 costs changed, and the 13 the heal refuses matched the SQL count.
  **The extraction is what makes it evidence.** A hand-rolled copy of the costing walk agrees with the code whether or not the code is right, which is this file's oldest recorded defect. **And it is read-only, so it needs nobody's permission** - the write itself is still Max's, unchanged.
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

⚠️ **AND THE ALIAS ITSELF SERVES STALE FOR A WHILE AFTER A MERGE, so "check which build answered" is not enough on its own** (31 Aug 2026, batch 225, measured rather than reasoned). Minutes after #245 merged and Vercel reported the deployment complete, a plain `curl https://scoopyscosting.vercel.app/sw.js` returned the PREVIOUS version's `CACHE` line, repeatedly and consistently - and a cache-busted request to the same path, in the same minute, returned the new one six times out of six.
**So a bare fetch of a stable path can be answered from a CDN edge cache rather than from the deployment**, and the failure looks exactly like a deploy that did not happen. The wrong conclusion is the dangerous one: it invites a batch to re-push, re-bump or start hunting a build failure that does not exist.
**Append a throwaway query string** - `?cb=$RANDOM` - **and send `Cache-Control: no-cache`, or you are testing the CDN rather than the deploy.** The same caution applies to `index.html`, `js/app.js` and `css/style.css`; `sw.js` is simply the one with a version number printed in it.
This is the same shape as this file's oldest rule one level up: **a check that finds nothing has only proved something about WHAT IT LOOKED FOR**, and an unparameterised GET looked at a cache.

## Independent review before merge

Max has no human reviewer, so this is the only second reader the code gets.

⚠️ **THE REPOSITORY WENT PUBLIC ON 13 AUG 2026 (Max's call, taken twice), AND THAT REVERSED THIS PARAGRAPH.**
It read: *"Nothing can actually BLOCK a merge. Branch protection and rulesets need GitHub Pro on a private repo - the API returns 403 - so 'mandatory' below is a convention you keep, not a mechanism that stops you."*
**Branch protection is FREE on a public repository**, and it is now **TURNED ON**.
⚠️ **This paragraph said "available and simply not yet turned on" until 28 Aug 2026, and told you to keep reading "mandatory" as a convention. That is now wrong**, found by batch 212 when a docs-only handover PR was refused with *"the base branch policy prohibits the merge"* and the API answered with a live policy instead of the `404 Branch not protected` recorded here.

**What is actually enforced, because "protected" is not one thing and the gap is the useful part:**

- **Two required checks: `unit tests` and `smoke (jsdom)`.** A PR cannot merge until both pass, and that is a real mechanism rather than a convention.
- ⚠️ **`browser specs (Playwright)` is NOT required, and neither is anything else.** So a PR that reddens Playwright still merges.
- ⚠️ **AND THE MUTATION GATE IS INSIDE `unit tests`, WHICH IS THE ONE PIECE OF GOOD NEWS HERE** - it is not a separate job, so requiring `unit tests` does require the full `npm run mutate`. The gate section below says CI "is the one that actually holds" against a forgotten local hook, and that claim survives this correction. Check it if that job is ever split.
- ✅ **`enforce_admins` is TRUE as of 15 Sep 2026** (Max ran batch 265's one-liner), so the checks above bind him too and there is no admin bypass. ⚠️ **This said FALSE for three days after it stopped being true**, and so did `CLAUDE.md`, `.claude/agents/code-review.md` and `docs/MAINTENANCE.md`'s gap list - four documents describing one API-readable fact, none of which could notice it changing. Found by AUDIT-v217, which asked the API. **A setting that lives outside the repo is not a fact this repo can hold; read it, do not cite it.**

**So the honest reading: the merge is gated on the suite, the mutation gate AND the review artifact, and on nothing else.**
⚠️ **The artifact gate was described here as hook-only until 28 Aug 2026, and that UNDERSTATED enforcement** (AUDIT-v176). `.github/workflows/test.yml` runs `node tests/review/check.js` as a step of the **`unit`** job, which is required - so the artifact gate is inside CI exactly the way the mutation gate is, and the good-news paragraph above applies to it verbatim. The understatement is the dangerous direction: it invites a batch to think it can skip a gate it cannot. **Check this if that job is ever split.** The `code-review` agent, its artifact and the browser specs are still conventions you keep - the artifact gate lives in `.githooks/pre-push`, which `--no-verify` skips and which a fresh clone does not install at all.
The reason it went public was GitHub blocking Actions on a billing cap; **Actions are unlimited and free on a public repo, measured at `billable_ms: 0` for an 8-minute run.**

**DECIDED, 8 Aug 2026 (Max): no second reader beyond the pre-push agent. CodeRabbit is NO and GitHub Pro is NO - do not re-propose either.**
Both were put to him with costs, records and a recommendation to take CodeRabbit; he declined both.
The option he chose was worded "the current pre-push review is enough", so this declines an ADDITIONAL reader and relaxes nothing below.
It also means the convention above is the whole mechanism, permanently - **the pre-push agent is the only thing standing between a mistake and production.**
On the day it was decided that agent caught a four-word change that would have silently discarded a plate's category edit, with the suite green and the change already driven in a browser.

- **The mutation gate - MECHANICAL.** It covers exactly one thing: a test that would still pass with the code it names broken. See Tier 1's twelve-incident roster for why that one thing earned automation.
  **It runs in TWO places and only the second one is a mechanism.** `.githooks/pre-push` runs it in changed scope, and needs `git config core.hooksPath .githooks` once per clone - **so a fresh clone runs no gate at all and looks exactly like a clone that passed it.** That is why the `unit` CI job also runs the full `npm run mutate` unconditionally, where nothing has to be installed and nothing can be forgotten.
  ⚠️ **AND THE HOOK DOES NOT RUN PLAYWRIGHT, WHICH MEANS A GREEN HOOK IS NOT A GREEN SUITE.** Its five steps are orphan reaping, `npm test`, `npm run smoke`, the changed-scope mutation gate and the review artifact. The browser specs take ~7 minutes and are deliberately left to CI; that trade is fine and is not the trap. **The trap is reading "hook passed" as "everything passed"**, and it is a live one: batch 214 hid a control that `tests/visual/v158-header-actions.spec.js` asserts is on screen, pushed on a green hook and a green `npm test`, and was caught by CI three of whose assertions had gone red.
  **So: if a change alters WHETHER A CONTROL EXISTS, or any other precondition a screen's specs were written against, run `npx playwright test` before pushing and grep the specs for the id.** The specs that break are about OTHER screens, which is exactly why the author does not think of them. (This bullet also said the hook ran two commands; it runs five, and the list is left un-numbered here on purpose so it cannot go stale again - read `.githooks/pre-push`.)
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
  ⚠️ **AND IT NOW LEAVES A FILE BEHIND, WHICH IS THE HALF THAT WAS MISSING** (27 Aug 2026, QUEUE item 0d). Save its report to **`docs/reviews/REVIEW-<batch>-<short-name>.md`** with a `Reviewed-commit: <sha>` line, and `.githooks/pre-push` refuses a push whose diff changes what runs when no such file names a commit on the branch.
  **Why it needed a mechanism rather than another rule: this was the most productive gate in the process and the ONLY one leaving no trace of any kind** - not on the PR, not in CI, not in git, and not in the handover template. Six batches that shipped a client asset to production have no record of one, and only 176 is knowable, because its brief said to skip it. **The other five are silence, and silence is indistinguishable from compliance.** The "NOT SKIPPABLE BY INSTRUCTION" line above fixed the one visible case and could do nothing about the five that were not, because it is another convention layered on the convention that failed.
  **Two halves, doing different jobs.** The artifact is a gate against FORGETTING - it cannot tell whether a review happened, only whether a file says one did, and `--no-verify` skips it. The handover's now-mandatory **`## Review`** section is the half that records a judgement, and the half a human reads. `docs/reviews/README.md` states the limit; `tests/review/check.js` is the rule and `tests/review-gate.test.js` pins it.
  **`Reviewed-commit:` names an ANCESTOR, not the tip.** Requiring the exact HEAD is unsatisfiable - the review's own findings get fixed, each fix is a commit - and a gate nobody can satisfy gets disabled, which is this repo's most-recorded gate failure.
- ⚠️ **`.github/workflows/code-review.yml` IS DELETED** (Max, 22 Aug 2026, reversing his own 8 Aug demote-not-delete; shipped 27 Aug 2026). **There is no second reviewer and no PR check of any kind - the pre-push agent is the whole mechanism, permanently.**
  **Why, measured rather than argued:** 320 lines, **zero runs since the 8 Aug demotion** and the `deep-review` label **never once applied**, both verified against the GitHub API. It was not free either: two batches declined one-line CI fixes because touching a workflow file triggers the mandatory review, so a workflow nobody ran was making other work more expensive.
  Before that it ran 11 times across its whole life, **5 were silent skips that did no work**, and the runs that did work found **ZERO bugs** - its 3 findings were two missing tests and a doc gap. It authenticated by OAuth against Max's personal Claude subscription, so it competed with his own coding sessions at roughly $20 and ~15 minutes per batch.
  **Git keeps the file. Do not re-propose it, and do not propose CodeRabbit or GitHub Pro either** - both were declined on 8 Aug 2026 with costs and a recommendation in front of him.
  ⚠️ **The three ways its green check was untrustworthy are deleted with it and are NOT re-derivable lessons about the pre-push agent** - they were about a GitHub Action publishing to a PR (a refusal that exited green, a run that threw its findings away, and an outage where an absent check looked exactly like a passing one). `docs/audits/AUDIT-v115.md` and `AUDIT-v125.md` hold the detail if a future PR-based reviewer is ever proposed. **The transferable half survives one level up and applies to the artifact gate too: an absent check looks exactly like a passing one.**

**⚠️ NEVER DISMISS A FINDING BECAUSE ITS STATED CAUSE IS WRONG.** A finding whose *mechanism* is wrong may still point at a real bug.
That has happened twice and both were worth acting on.
The finding and the explanation are separate claims - disprove the explanation and you have disproved nothing.
**Go and look at what it was pointing at.**

⚠️ **AND THE SAME SPLIT APPLIES TO THE REMEDY, WHICH IS THE HALF THIS RULE DID NOT COVER** (batch 223).
A finding carries up to THREE claims - the defect, the mechanism, and the fix it implies - and they fail independently.
The rule above stops you under-reacting by dismissing a real defect; nothing stopped you OVER-reacting by applying a fix the finding reasoned its way to.
**Measured instance:** the review correctly found that a name is matched inside a longer one (`Rice` inside "Rice Noodles", so a rephrasing can blame a different product), and attributed it to a deliberately open trailing word boundary.
Closing that boundary **fixes nothing** - the character after `Rice` is a SPACE, which satisfies a trailing edge exactly as it satisfies a leading one - and it **rejects "Tomatoes" for an ingredient named `Tomato`**, which is a false reject, the failure mode with no symptom.
So the honest outcome was: defect real and recorded, mechanism wrong, remedy actively harmful, and the overclaiming comment the finding also caught fixed on the spot.
**Run the finding's own repro, then run its FIX, before you apply it.** A fix that is reasoned rather than measured is exactly the input this repo has found wrong most often, and a review is not exempt from that just because it is right about the bug.
**And when you decline the remedy, PIN why** - `tests/insight-parity.test.js` asserts the two facts that rule it out, so the next reader cannot re-derive the wrong answer from the same finding.

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

## A DONE-MARK IS NOT A STRIKE, AND A STANDING CHECK NEEDS AN EXPIRY

(Named 9 Sep 2026 by AUDIT-v197, on two findings that turned out to be one shape. Both are about a correction that was MADE and did not reach the thing the next reader acts on.)

**Recording that an item is done, somewhere else in the file, does not close the item.** Batch 230 fixed two `docs/MAINTENANCE.md` entries and wrote "DONE, batch 230" into the done-marks list near the top - and left both original entries standing, unstruck, ~470 lines below. For ten deploy versions that file said the same two things were finished and outstanding, and **the end a rider batch actually reads is the entry**, because that is where the work is described. A done-mark is a claim ABOUT an entry; the entry is the artefact. **Strike the entry.**

**And its mirror, which costs more: a standing checklist item is an instruction to spend part of every future audit's budget, and nothing expires one.** The `project-audit` agent's dropped-threads list carried *"abbreviation matching in search"* - a feature DECLINED in `HANDOVER-v83` and never built - so **four consecutive audits re-derived the same correction**, each correctly reporting it as unfinished because the checklist kept asking the question. `docs/MAINTENANCE.md` had held the fix as its own first instruction (*"correct the record FIRST, everywhere it is cited"*) since AUDIT-v135, unactioned through four audits.

**The transferable rule: when you disprove something, fix the SOURCE that keeps asking - not just the report you are writing.** A finding that says "this was never true" has two halves, and the second one is the only one that stops it recurring. The tell is a report telling you something you have read before: **if an audit re-derives a correction a previous audit already made, the defect is in the record, not in the code.**

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
