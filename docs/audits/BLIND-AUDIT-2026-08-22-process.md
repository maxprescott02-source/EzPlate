# Independent process audit — EzPlate

**Scope:** the development process, not the application.
**Evidence base:** `skills/` (5), `.githooks/pre-push`, `.github/workflows/` (2), `tests/mutation/` (3), 149 handovers, 6 audit reports, 13 decision files, `docs/PHONE.md`, `docs/STAGING.md`, `GIT-LOG.txt`, `GIT-LOG-WITH-FILES.txt`, `TEST-FILE-LIST.txt`.
**Period covered:** 3 July – 18 August 2026. 537 commits, 196 PRs, 149 handovers, 47 days — about 3.2 batches per day.

Every claim below cites a file, a handover, or a commit. Where I could count something, I counted it.

---

## 1. One change from idea to production

I traced the shape common to batches 180–195, which is the current process. Here is every point where a wrong change could survive, what is supposed to stop it, and whether that thing is a **mechanism** (runs whether or not anyone remembers) or a **convention** (works only if a human or an agent chooses to follow it).

| # | Step | What stops a wrong change here | Kind |
|---|---|---|---|
| 1 | Item enters `docs/QUEUE.md` | Nothing. `skills/batch/SKILL.md` step 1: "An item in `docs/QUEUE.md` is already approved." | — |
| 2 | `/batch` takes the top unblocked item; sweeps `Do after:` lines | An agent reading the file and doing the sweep | **Convention** |
| 3 | "Decide whether to investigate… the code wins" | An agent choosing to check the item's premises | **Convention** |
| 4 | Plan, written down | Nothing reads it. The skill says "Do not wait for it to be read." | **Convention** |
| 5 | Build | — | — |
| 6 | Cache version, six spots (`skills/cache-version`) | `tests/settings.test.js` fails if `APP_VERSION` disagrees with `sw.js`'s `CACHE`; `tests/smoke.js` derives the version from `sw.js` | **Mechanism** (spots 1 and 6 only) |
| 6b | Cache spots 2–5 — the `?v=NN` query strings in `sw.js` `ASSETS` and `index.html` | Nothing. The skill says so outright: *"Neither test checks spots 2–5. Those are on you."* | **Convention** |
| 7 | `npm test`, `node -c` | Deterministic once run; running them before push is a choice | **Convention** until step 10 |
| 8 | Drive it in a real browser, both themes, 380px and desktop | An agent choosing to do it | **Convention** |
| 9 | **Pre-push `code-review` agent — mandatory** | An agent choosing to invoke it. It writes to the conversation, not to a file | **Convention** |
| 10 | `.githooks/pre-push` — `npm test`, `npm run smoke`, `mutate --changed` | Runs on push **if** `git config core.hooksPath .githooks` has been run in this clone. Bypassable with `git push --no-verify` | **Convention at the clone level, mechanism after that** |
| 11 | CI `tests` workflow on `pull_request`: `unit` (`node -c` + `npm test` + full `npm run mutate`), `smoke` | Unconditional, cannot be turned off by the author | **Mechanism** |
| 12 | CI `playwright` job | Runs unless every changed path is in a short named prose set. The gate is genuinely fail-closed | **Mechanism** |
| 13 | Paid `code-review.yml` deep review | Only fires if a human adds the `deep-review` label or runs it manually | **Convention** |
| 14 | Merge to `main` | Nothing observed blocking a merge on red checks — see §2 | — |
| 15 | Vercel deploys `main` | No gate between merge and deploy. `test.yml`'s own header: *"a merge to main is a production deploy"* | — |
| 16 | CI runs again on push to `main` | Runs **after** the deploy. An alarm, not a gate, and only if read | **Mechanism, post-hoc** |
| 17 | Handover written; findings routed; audit counter checked | An agent remembering step 10 of the skill | **Convention** |
| 18 | `docs/PHONE.md` device check | Max working through the file | **Convention** |

**The conventions are the interesting entries, and here is what the record says about each:**

- **Step 2** — the `Do after:` sweep failed on its first live trigger. `HANDOVER-129`: *"the audit found the `Do after:` deletion mechanism failing on its first live trigger: Q6 shipped and the dropdowns item's line survived the same batch's sweep."*
- **Step 3** — `AUDIT-v166` R1: *"four of the last seven batches found their QUEUE item materially wrong at the point of execution"* (187, 189, 192, 193). Earlier, `HANDOVER-v122`: *"This is the THIRD stale queue item in three batches."*
- **Step 8** — the browser drive is the single highest-yield convention in the process and it is entirely voluntary. `HANDOVER-170`: the ingredient dropdown had been clipped to 37px of its 96px since F7 and *"no spec caught it."* `HANDOVER-v122`: the mobile builder had been 24px too narrow since v54 and *"a 'mobile visual consistency' pass and four separate empty-state centring fixes"* had missed it.
- **Step 9** — this is the most productive gate in the whole process (§3) and it leaves no trace anywhere. See §2.
- **Step 17** — the audit counter fired at v155 and again at v156 and neither batch checked it (`HANDOVER-177`: *"the audit ran two batches late… It is step 10 of `/batch` and it is the last step, which is exactly when a batch is finished and wants to stop"*).

**Count:** between an idea and a café's phone there are **three unconditional mechanisms** — the `unit` job, the `smoke` job, and the fail-closed `playwright` gate — and every one of them runs *after* the code is already on a branch that a single click will merge and deploy. Everything upstream of the push is a convention.

---

## 2. Which gates can be skipped silently

| Gate | Bypassable? | Bypass recorded? | Can a skipped run be told from a passed one on the PR? |
|---|---|---|---|
| Pre-push `code-review` agent | Trivially — just don't invoke it | Only if the author writes it in the handover, and **the handover template has no section for it** | **No.** No artifact, no check, no log. Nothing on the PR mentions it at all |
| `.githooks/pre-push` | `git push --no-verify`, or never running `git config core.hooksPath .githooks` | The hook asks for a declaration; exactly one handover (192) ever makes one | **No.** The hook produces nothing a PR can show |
| `npm run mutate` (CI `unit`) | No | n/a | Yes — job status |
| `npm test` / `smoke` (CI) | No | n/a | Yes |
| `playwright` (CI) | Only by the `changes` gate, which is fail-closed by design | The job logs a `::notice::` either way | Yes — the job shows as skipped |
| Paid `code-review.yml` | It is opt-in by default | No run means no record | **No** — and it has never been opted into (§4) |
| Cache version spots 2–5 | Nothing checks them | No | No |
| Audit counter | Just forget it | The next audit finds it late | No |
| `docs/PHONE.md` check | Never doing it is the default | No | No |

**The fresh clone.** Documented by the process itself and treated as a solved problem, which it is not. `.githooks/pre-push` requires `git config core.hooksPath .githooks` once per clone. `HANDOVER-180` puts it plainly: *"a fresh clone runs no gate and looks exactly like a clone that passed — this repo's own 'an absent check looks like a passing one'."* The stated fix was to move the full `npm run mutate` into the CI `unit` job, which does close that hole for the mutation gate. It does not close it for the *other two* checks in the hook (`npm test`, `npm run smoke`), because those also run in CI — so the hook is genuinely only a speed-up. **The thing a fresh clone actually loses is nothing mechanical.** The real fresh-clone hole is elsewhere: the `code-review` agent, which no clone, hook or workflow runs.

**Gates that run, find something, and fail to report it.** Three, all documented and all still live:

1. **`--retries=1` on Playwright.** A spec that fails once and passes on retry is classified `flaky` and **the job exits 0 and goes green**. `HANDOVER-159` corrects the queue item's own claim that this is not a silent pass: *"At the job level it is exactly a silent pass, because a run where every test eventually passes exits 0 and the check goes green."* The entire safety net is a `::warning::` annotation on a green check that a human must choose to read. `test.yml` says so: *"a `flaky` annotation on a green check is a FINDING, not noise."* That is a convention wrapped around a mechanism.
2. **`claude-code-action` exiting green having reviewed nothing.** Measured on 8 Aug: *"roughly $20 spent, ONE real diff actually reviewed, ZERO bugs found. Half the runs never reviewed anything at all."* The hand-rolled anti-tamper diff step in `code-review.yml` is a correct and genuinely good fix for this — but it only protects a workflow nobody uses.
3. **`screenshots.spec.js`.** Red since batch 186, ten deploy versions ago. CI filters it out and `tests/ci-workflow.test.js` pins the exclusion, so **nothing anywhere goes red** (`AUDIT-v166` T1). It is *"the single largest block of permanently-red tests in the repo and it teaches every batch to skim past red."*

**And the merge itself is not gated.** Two independent pieces of evidence:

- `HANDOVER-183`: GitHub Actions was blocked at the account level on a billing failure. *"All four checks went red without running."* The batch reproduced the four jobs locally and **merged on that basis** — including a production migration.
- `HANDOVER-172`: *"`main` has been RED since 171, and nothing said so."* A whole batch shipped over a permanently red `main`, and the batch that found it *"spent time proving the failure was not its own."* Its own conclusion: *"a merged PR whose checks are red looks identical to a merged PR whose checks are green, in the only place anyone looks, which is the branch."*

**The sharpest finding in this section.** The mandatory pre-push review is the process's primary defence (§3 shows it earning that), and it is the one gate with **no artifact of any kind**. It is not on the PR, not in CI, not in git, and not even in the handover template — `skills/handover/SKILL.md` lists six mandatory sections and a review is not one of them. Batches add a review section ad hoc.

I checked which shipping batches record one. **Six batches that shipped a client asset to production have no record of the mandatory review:**

| Batch | Shipped | Review record |
|---|---|---|
| 151 | `ezplate-v142` | none |
| 153 | `ezplate-v144` | none |
| 170 | `ezplate-v150` | none |
| 176 | `ezplate-v156` | **explicitly skipped** — *"the brief said 'no code review pass, just implement'"* |
| 179 | `ezplate-v158` | none |
| 183 | `ezplate-v159` + a production migration | none |

Only one of those six is knowable. The other five are silence, and silence here is indistinguishable from compliance. The 13 Aug rule added to `skills/batch/SKILL.md` — *"NOT SKIPPABLE BY INSTRUCTION… 176 shipped to production with no second reader because its brief said to skip it"* — fixes the case that was visible and does nothing about the five that were not, because it is another convention layered on the convention that failed.

There is a near-miss on record too. `HANDOVER-175`: *"It initially did not run because this session carried an instruction not to invoke agents; Max asked for it explicitly before merge."* The gate was rescued by the owner happening to ask.

---

## 3. What class of defect recurs — from the record alone

I read the handovers as data. Five classes account for nearly everything.

### Class A — a test that cannot fail. The dominant class by a distance.

**Counts.** `CLAUDE.md` keeps a roster, and it counts *shapes*, not instances. Its progression through the handovers: 7 → **12** (batch 180, reconciled against the handovers; the previous 7 and the queue's separate claim of 10 were both wrong and were counting different things) → **14** (182) → **16** (183) → **18** (184) → **19** (188) → **20** (190) → **21** (195). Batch 193 found two more and correctly added none, because they were not new shapes.

Instances are far more numerous. `AUDIT-v135` counted ten with citations across v91–141. My own grep finds **about 40 of the 149 handovers reporting at least one instance**. A representative sample, because the shape matters more than the count:

- `pushWrite` — six test files named it, **none executed its body**; two stubbed it to throw. Every mutant survived, including deleting the `!` from `if(!SUPA)` (180).
- `184(b)` — a round-trip fixture set `plateId` and `sourcePlateId` to the same value, so flipping `(item.plateId||item.sourcePlateId)` to `&&` — which drops the plate link on every dish written since v55 — stayed green. **Unable to fail since v55.**
- All seven tests batch 195 wrote for `ensurePdfjs` were source greps. Deleting `res()` from the `import()` success arm left every one green; the shipped consequence is a promise that never settles and a PDF upload that hangs silently.
- `v155-trend.spec.js` wrapped its whole comparison in `if (rows.mk.length)` while `boot()` never seeded `changeLog`, so the loop never ran (175).
- A Playwright spec named *"the latch, driven rather than read"* passed with the latch deleted (192).
- A `not.toBe(UA blue)` assertion was green in dark mode because Chromium picks a different default link colour there (190).
- The mutation gate's own self-test found the gate reporting a perfect score while checking nothing, on its first run — `NODE_TEST_CONTEXT` was inherited and suppressed every child's exit code (180).

**Which gate was supposed to catch it: `npm test`.** It cannot, by construction. A green suite is silent about whether it *could* have gone red. `AUDIT-v135` R2 named this in July — *"Ten recorded incidents, no root cause, remedy approved and not started"* — and the remedy sat mid-queue behind the entire v3 redesign phase until batch 180.

**Why the mutation gate does not close it.** It closes a slice. It mutates **48 named functions in `js/app.js`** and nothing else. It cannot see CSS, Playwright specs, `smoke.js`, SQL assertions, or `api/*`. And a function that is not on the list has never been asked the question — the process says so in its own words (`HANDOVER-190`: *"a function that is not a target has never been asked the question"*). Concretely, since the gate shipped:

- 186's two cannot-fail assertions were found by hand-mutation, *"because neither `bootGate` nor `bootstrapSync` is a target"*.
- 182's two were found by the pre-push review, in SQL.
- 190's and 192's were in Playwright specs.
- 194's three were in a **pure prose diff**.

The gate is real and it works. It is aimed at about 1% of the surface where this defect occurs.

### Class B — an operation returns success and does the wrong thing invisibly.

`AUDIT-v166` R2 counts **six discovered afresh** in ten deploy versions (181, 182, 183, 184, 185/186, 187), plus two more predicted by existing rules (191, 193). The mechanisms are all different: an absent JSON key overriding a column DEFAULT; a DEFAULT firing before a trigger so the trigger correctly does nothing; `on conflict` naming an arbiter that stops existing; a foreign key validated with RLS off so a cross-tenant reference saves cleanly and is invisible forever; RLS filtering rows rather than erroring so every store empties and nothing throws; `as permissive` being the default so dropping two words repeals a policy with its name and condition intact.

**Which gate was supposed to catch it: nothing generic.** Each one produced a Tier 1 rule *after* the fact. `AUDIT-v166` measured the consequence: `CLAUDE.md` grew **90% in ten deploy versions, Tier 1 by 168%**, and *"six of its seven new Tier 1 sections describe one mechanism from different angles."*

What actually caught them, every time: the pre-push review, or rehearsing as the real client role on staging. `HANDOVER-182` is the clearest instance — *"A defect that every SQL-side assertion passed straight over, found only by rehearsing as a real second tenant."*

The same shape runs through the *process's own tooling*, which is the part worth noticing: a mutation that never reached disk and reported SURVIVED (180); a `perl -0pi` whose pattern matched nothing, so the suite stayed green and the harness reported SURVIVED (184); a grep for `"status":"flaky"` that matches zero times because the reporter pretty-prints (162); `timeout` not existing on macOS, so a wrapped mutation run never happened and said nothing (195); `gh run` hiding a re-run's original attempt, so a fifteen-run search concluded an incident had never happened (163).

### Class C — the queue item or brief is factually wrong at the point of execution.

`AUDIT-v166` R1: **four of the last seven batches** (187, 189, 192, 193), under four different framings — a wrong premise, a wrong hard part, a superseded requirement, a contradicted decision. Earlier the same shape ran at the same rate: `HANDOVER-v122` records *"the THIRD stale queue item in three batches"*, all three claiming something was missing that had already shipped, and all three having survived a reconcile whose own note said every item *"was checked against the code or production before it was kept."* Its conclusion: *"the reconcile checked the paperwork against the paperwork."*

Read the Probe sections in sequence and this is the single most common answer. 166 ("one of them was impossible as written"), 167 ("the specification was a claim about the code"), 173 ("the item conflated two problems under one name"), 181 ("correct for the client and wrong for the restore"), 182 ("the queue item's design would have emptied the app"), 184 ("it is referenced by one, and `plates.menu_id` points somewhere else entirely"), 190 ("the item's headline claim was mostly already built").

**Which gate was supposed to catch it:** the `/batch` skill's own step 2, which is a convention, and which the skill *exempts* queue items from — *"An item in `docs/QUEUE.md` is already approved."* Batch 194 added the right one-sentence rule (*"a queued item's approval does not expire, but its facts do"*), which is also a convention. Nothing shipped wrong from this class — the batches caught it every time — but two of the four spent themselves on the discovery.

### Class D — CSS cascade, specificity and geometry, invisible to reading and to a green suite.

At least **17 batches** report one or more: v122, 135 (two), 139, 141, 142, 144, 146, 147 (**five in one screen, in one batch**), 148, 151, 152 (two), 166 (two), 167, 170, 174, 175, 176, 190.

`HANDOVER-147` is the honest one: *"I fixed the first three and then wrote the fourth into the fix for the third, which is the clearest evidence I have that this needed to be a rule rather than a lesson."* And `HANDOVER-176` found the worst version of it — a CSS syntax error is silent and discards every rule after it: *"The page rendered, the suites were green, `node -c` was clean, and the only symptom was a measurement that came back wrong."*

**Which gate was supposed to catch it: none exists.** `tests/css-syntax.test.js` catches parse errors only. The mutation gate cannot touch CSS. Playwright catches it only where a spec happens to measure that exact computed property, and the record shows the specs repeatedly measuring the wrong thing (`HANDOVER-166`: *"the spec asserted the DOM `hidden` PROPERTY, which reflects only the attribute. It passed while the bug shipped."*).

What catches it: opening the app and measuring. Every single instance in the list above was found either in a browser or by the pre-push review.

### Class E — a stale claim in prose that a later reader trusts.

Every audit finds a batch of these: `AUDIT-v166` §2a lists **ten stale `CLAUDE.md` claims**; `AUDIT-v156` six; `AUDIT-v135` and `AUDIT-v125` similar. Batch 194 corrected nine in one sitting.

The self-referential subclass is more interesting than the count. `HANDOVER-149`: *"Two of the three review findings were defects I introduced while removing defects of the same kind"* — a false claim about `cafeDB_plateDraft` and a wrong mechanism in a new Tier 1 rule, written in the batch whose entire purpose was removing false claims. `HANDOVER-177`: the review found *"an arithmetic error inside the correction about not trusting stale counts"* — 6 + 6 = 13 — plus a suite count already stale by one, in the line that had just been rewritten to say the number had been found stale twice.

And the propagation failure has its own tally. `AUDIT-v145` named it three times; `AUDIT-v156` D1 named the fourth; `docs/MAINTENANCE.md`'s own escalation note said *"If a fourth turns up, the routing itself is the item"* — and `AUDIT-v166` C4 found **the trigger had fired and nothing had happened**.

**Which gate was supposed to catch it:** `project-audit`, which does catch it — once every ten deploy versions, after the stale claim has been read by ten batches.

### Class F — infrastructure misdiagnosed as application defect, and vice versa.

v113 (an 18× machine load read as a red suite), v116 (Linux scrollbars taking layout width where macOS takes none), 150 (the CI runner's fixed-position containing block being narrower than the viewport, while `innerWidth` and `clientWidth` agree with each other and are both wrong), 155/159/162/163/164/165 (a Chromium segfault, six batches), 172 (`main` red on Linux font metrics against a zero-slack float comparison), 183 (an Actions billing block). This class is a large fraction of the process's total spend and produced zero user-facing defects — see §5.

---

## 4. What is ceremony

Being blunt, as asked. Each item below consumes real time and I could find **no traceable instance of it preventing anything** across the record.

### 4.1 `code-review.yml` — 320 lines, zero uses

The paid deep-review workflow was demoted to manual on 8 Aug 2026 on measured evidence (*"roughly $20 spent, ONE real diff actually reviewed, ZERO bugs found"*). Since then it fires only on a manual dispatch or the `deep-review` label.

**The label has been applied zero times.** It appears in no handover across roughly fifty batches; the only mention anywhere is `HANDOVER-149` citing it as documentation. No handover records a manual dispatch either.

The file is not free. It is 320 lines carrying an anti-tamper guard, a pinned action SHA with a documented un-pin condition, a `track_progress` expression with a two-paragraph justification, and a 60-line review prompt — all of it maintained, none of it executed. And it taxes other work: `HANDOVER-155` declined a one-line stale-count fix in `test.yml` because *"it is a workflow-file change that takes the mandatory review"*, and `HANDOVER-159` gives the same reason for why that count went stale for two audits. A workflow that never runs is still making other batches more expensive.

**Blunt version:** the free pre-push agent replaced this thing five weeks ago and the file has been kept warm ever since in case it is needed. Delete it, or cut it to twenty lines. If it is ever wanted back, git has it.

### 4.2 The parallel maintenance track — zero items completed in fifteen batches

Added 13 Aug 2026 (`e9b5af6`, *"four workflow amendments… the parallel maintenance track"*), with a second worktree at a named path, a collision rule, and a five-batch tally to judge whether it is working.

Batches 181–195 have run since. The git log contains exactly one maintenance commit (`735082d`, *"maintenance: record the two remaining CI-minute levers"*) — a **recording**, not a fix, made the same day the track was created. Two handovers record the track explicitly not running (182: *"The parallel `docs/MAINTENANCE.md` track did not run this batch"*; 194: *"The parallel maintenance track was skipped"*). Batch 194 also discovered a structural reason it can never run during an audit batch, and called that *"the first real data point for the five-batch tally."*

Fifteen batches, one data point, zero maintenance items. The five-batch tally has its answer.

### 4.3 `docs/PHONE.md` as a working list

756 lines. 38 sections spanning v99 to v167, plus a carried backlog of **61 unsigned-off items** inventoried at "Batch 0" and never worked through. `skills/batch/SKILL.md` says *"Max works through it in one session."*

Exactly **two bullets in the entire file are marked settled** (v106 and v109), and one of those two is marked superseded. Everything else is open.

Worse, until 15 August the file's "Settled" heading sat above seven live sections and told the reader to stop — `AUDIT-v166` D1 found it and ranked it the highest value-per-minute item in the report, because behind it sat batch 193's question about whether `LAST PRICE PAID` is per pack or per carton, *"getting this wrong makes every cost in the app wrong by the carton size, and it will look completely plausible."* The file that exists to route device risk was actively hiding the one entry that matches the project's stated worst failure mode.

**And no handover records a `docs/PHONE.md` check catching anything.** Max *does* catch defects — v51 (a phone clarification), v69 (the app suggesting Bacon → Ham as a substitute), 124 (*"they look janky"*, from a production screenshot), v113 (the invoice gate fix aimed at the wrong point), 155 (a failed check on PR #137), 170 (the builder fill order). Every one of those came from him using the app and saying something in chat. None came from working the list.

The entries are cheap to write and they are the only record of what a device check *would* be. But writing them every batch for a hundred batches has produced a backlog nobody will ever clear, and — this is the cost that is not obvious — a standing impression that device risk is managed.

### 4.4 `node -c js/app.js`

On the `verify` skill's pre-PR checklist, in the `batch` loop, and its own CI step. **It has never been red.** 149 handovers, zero instances. Every batch reports it clean. It costs about a second, so this is the mildest item on the list, but it is on a checklist whose length is itself a cost.

### 4.5 The `--retries=1` annotation as a safety net

`test.yml` accepts, in writing, that retries hide an intermittent real regression, and states that the compensating control is *"a `flaky` annotation on a green check is a FINDING, not noise."* There is no record of anyone ever acting on one — the only flaky annotation discussed in any handover is 162's, which was the batch that built the detector and was testing it.

### 4.6 The "run it on a DIFFERENT model" requirement

Cheap, and I am flagging it only for completeness: I found **strong** evidence for the *blind to the brief* half (`HANDOVER-125`: *"the review's 'Margin header' finding is the strongest argument yet for blinding it to the brief: the brief said 'Margin', so a brief-aware reviewer would have approved it"*) and **no** evidence for the different-model half. `HANDOVER-136` records the Opus reviewer dying on the session limit and the review re-running on Sonnet with no comment on quality. Keep it — it costs nothing — but it is currently an untested belief, not a measured one.

### 4.7 What is *not* ceremony, and I checked

- The **Probe section's first question** is load-bearing: it is where item-wrongness gets recorded, and it is the sole evidence base for `AUDIT-v166`'s R1. Keep it.
- **Decision files** work. Six files, all answered within a day or two, mostly in chat. The `decide` skill's own honesty about this — *"He answers in CHAT, never in the file, and no interactive control in the file has ever worked on his device"* — is a rule that was corrected on evidence.
- The **`decide` skill's "render every visual option"** rule (added 13 Aug) has never fired. Both decision files since are prose, and the 14 Aug one explains why: *"It is prose rather than a rendered file because nothing here is visual."* That is a rule waiting for its case, not ceremony.

---

## 5. Where the effort goes versus where the defects are

### The shape of the spend

Cumulative churn (insertions + deletions across the whole history), by area:

| Area | Lines changed |
|---|---|
| `tests/` (unit + smoke + mutation) | 31,278 |
| `js/app.js` | 20,354 |
| `docs/handovers/` | 17,053 |
| `css/` | 14,446 |
| `tests/visual/` (Playwright) | 13,905 |
| `CLAUDE.md` | 10,457 |
| `docs/` (queue, phone, maintenance, staging) | 9,723 |
| `supabase/` | 6,526 |
| `index.html` | 4,385 |
| `docs/audits/` | 1,610 |
| `docs/decisions/` | 1,061 |
| CI + hooks | 1,045 |
| `api/` | 966 |
| `skills/` | 730 |

Grouped: **test code ≈ 45,200 lines · client code ≈ 39,800 · process prose ≈ 40,600.** Roughly one-to-one-to-one. That is not automatically wrong for a solo operator with no reviewer, but it means the process has to justify a third of the total effort on its own merits.

### Mismatch 1 — the mutation gate is pointed away from the numbers

This is the sharpest mismatch in the project.

The gate's 48 targets are: `setProducts`, `dbPushIngredients`, `logIngPrice`, `samePrice`, `ensurePdfjs`, `invConfirmState`, `invRowState`, `flagNeedsAttention`, `tenantGateState`, `sessionUser`, `authSubmit`, `roleState`, `isOwner`, `ownerOnly`, `applyRoleUi`, `syncBuilderPlateActions`, `updateMenuDelBtn`, `openDelChoice`, `claimState`, `teamWriteLanded`, `authSignUpGated`, `authInvitePending`, `loadTeam`, `submitInvite`, the eight `cat*`/`csv*` importer functions, `publishPlan`, `productRefs`, `canDeleteMenu`, `fallbackMenuId`, `menuIdOf`, `pushWrite`, the three sequenced writers, and the five row-boundary mappers.

**Not one of them computes a price, a cost, a food-cost percentage, a trend point or an insight.** No `analyze`, no `menuMarginPreview`, no `costAtLines`, no `fmtTargetPct`, no `tcTicks`, no `trendMarkers`, no `computeInsights`, no parser function. The targets file states its own selection rule: *"The list is the code this project has already been burned on: the guards, the persistence sequencing, the row boundary and the invoice referee."*

That is a list of **past burns**, not a list of **consequences**. The brief's stated worst failure mode is a plausible-looking wrong number. Here is what the record says about wrong numbers:

- `HANDOVER-v90`: a fabricated 12-month claim about a plate whose cost had never been observed changing — *"unit tests passed, Playwright passed, and it took looking at a rendered screenshot."*
- `HANDOVER-v90`: *"across N plates"* counted lines, not plates, overstating an ingredient's reach — found re-reading the diff.
- `HANDOVER-140`: the "Not costed" KPI counted fully-costed plates that merely lacked a sell price — *"the label would have sent Max hunting ingredient gaps that do not exist."* Found by the review.
- `HANDOVER-155`: the `fmtTargetPct` stub carried the `%` and not the rounding, so a fractional target rendered `32.53%` where the real function renders `32.5%`. Latent, found by an audit.
- `HANDOVER-187`: staff could **DELETE** the food-cost target row, after which the client boots on its hardcoded default *"which moves every suggested price and every good/bad colour in the app."* Found by the review.
- `HANDOVER-193`: in carton mode a blank units-per-carton silently fell back to the pack size — *"an error of exactly the carton size with a plausible number on screen"* — and **a test in that same batch asserted the fallback as intended behaviour.** Found by the review.
- `HANDOVER-172`: the scale seed produced a $961 salad and a dashboard reading 1831% food cost. *"Every structural assertion in the file passed on that data… Only opening the app showed it."*
- `HANDOVER-v112` addendum: a product stored at 30c/kg, wrong by ~46×, making a toastie read $2.30/29% green when the truth was nearer $3.70/46% amber. Spotted by a human costing it.

**Every wrong number in the record was caught by the pre-push review or by a human looking at rendered output. Not one was caught by the suite, and none of them is covered by the mutation gate.** The gate's own header says a target should be *"any function whose correctness is load-bearing and whose test file you would be uneasy to see deleted."* By that test, `analyze` and the parser belong on the list ahead of `ownerOnly`.

The one function explicitly excluded is the worst case of all: **`gemApplyReadings`, the invoice referee's merge orchestrator, measured at 44 surviving mutants against a test file that pins exactly one property of it.** It has sat in `targets.js` under `pending` since batch 180 and is still there at 195. The reasoning for holding it back is sound (*"a gate nobody can satisfy gets disabled"*) — but fifteen batches have run since and the coverage batch it is waiting for has not been scheduled.

### Mismatch 2 — the invoice/AI path is the highest-stakes surface and the least measured

`AUDIT-v115` (July): *"The eval harness for the invoice reader is the one that matters: zero hits anywhere, on the app's highest-stakes surface and its only AI path."*

Status across every audit since:

| Audit | Status |
|---|---|
| v115 | Not done — reached no landing place at all |
| v125 | Not done — now properly queued |
| v135 | Not done — unchanged since v125 |
| v145 | Not done — unchanged |
| v156 | Not done — moved from QUEUE to MAINTENANCE |
| v166 | Not done — unchanged |

Six consecutive audits. The item has migrated from "not recorded anywhere" to "properly queued" to "correctly scoped in the C tier" without moving one inch toward existing. Meanwhile the surface it covers is the one that turns a supplier PDF into the numbers a café prices on, and `HANDOVER-132` describes it as having *"earned its reputation: every one of the three fragile-area invariants came up during the batch, and the pre-push review was the only thing standing between two of them and production."*

### Mismatch 3 — five batches on a test-harness crash that was never fixed

Batches **159, 162, 163, 164, 165** — five consecutive PRs, about 3% of all batches — went on a Chromium segfault in the Playwright runner. The work was genuinely excellent: a census of 44 CI runs, six occurrences resolved to an identical instruction offset with ASLR subtracted, a discovered `gh` CLI trap that had hidden the first occurrence, a designed experiment that inverted the queue item's own probes (which *"would have come back clean and been read as a fix"*), and a measured result of nine crashes in 210 tight cycles against zero in 210 padded ones, p ≈ 0.015.

Then: the Chromium bump did not fix it (three of 150 tight cycles, against 2.9% before — indistinguishable). The actual fix — blocking service-worker registration in `tests/visual/_boot.js` — was queued. `test.yml:311` still reads *"fixing that in `tests/visual/_boot.js` is queued"*, thirty batches later, and the item appears in **neither** `AUDIT-v156` **nor** `AUDIT-v166`.

Five batches of first-rate diagnosis of an infrastructure bug that produced zero user-facing defects, ending in a one-line fix that was never applied and has since fallen out of the audits' field of view. That is the clearest available picture of where this process's attention goes when left to its own gradient: toward the problem that is *legible* rather than the one that is *consequential*.

### Mismatch 4 — CSS is the second-largest code area and the least guarded

14,446 lines of churn, at least 17 batches reporting a cascade or geometry defect (§3, Class D), and precisely one mechanical guard: `tests/css-syntax.test.js`, which catches parse errors only. No mutation gate can reach it. Playwright reaches it only where a spec measures the exact computed property, and the record repeatedly shows specs measuring the wrong one.

### Heavily guarded and never breaking — the good news

- **The protected parser region.** `AUDIT-v166`: *"byte-identical across ten more deploy versions and the entire multi-tenant rewrite, twenty-one deploy versions and four audits after the hash was first recorded."* A Tier 1 rule plus a test-design choice (anchor slicing) has held a fragile boundary perfectly for the project's entire recorded life.
- **Dead traps.** Six consecutive audits recommending zero Tier 1 deletions. All 25 entries checked against live code, every subject present and reachable.
- **The charter's three named recurring symptoms** — pack-size persistence, invoice flag-pill alignment, menu/empty-state centring — **zero occurrences for six consecutive audits.**

Those three results are worth stating because they are the answer to the question "does any of this work". Yes: the parts of it that are mechanisms, or that are rules attached to something that can go red, have held perfectly.

---

## What to protect

Knowing what to keep matters as much as knowing what to cut.

1. **The pre-push `code-review` agent, blind to the brief.** This is the process's most valuable component by a wide margin. Across roughly 55 batches with a recorded review, about 50 produced at least one real finding, and a large share of them found *the* defect of the batch. It found: a delete guard walking one of two reference paths; a settings write resetting the food-cost target; a race in `claim_business_invite` under READ COMMITTED that a four-account end-to-end rehearsal had missed; an owner able to forge an acceptance through a GRANT no policy could stop; a sign-in that silently destroyed an unfinished plate; a missing restrictive DELETE that let staff remove the number every price in the app derives from; a whole catalogue that would have duplicated on second import; and, repeatedly, tests that could not fail. `HANDOVER-132`: *"Eighth batch this session; the review has found at least one major in six of them."*
   It has also earned the *blind* rule twice over (125's "Margin" header) and the *different reader* rule once in a way no test could (191: *"a race is not a case you think to name — it is one you only get by someone reading the statements and asking what happens between them"*).
2. **The mutation gate's design** — not its coverage, its design. Three choices in it are better than most professional setups: the textual mutation with the reasoning for rejecting Stryker written down; the allowance keyed to the source line's **text** rather than `file:line`, so an allowance stops matching the moment the code it excused is edited; and the gate failing on a **stale** allowance as well as a survivor. Plus the two-sided self-test, which caught the gate reporting a perfect score while checking nothing, on its first run.
3. **The fail-closed `changes` gate in `test.yml`.** `--no-renames` is load-bearing and was found by review rather than by reading; `!= 'false'` rather than `== 'true'` correctly handles a broken gate job; the empty-spec-list guard prevents Playwright falling back to `testDir` and silently running the non-hermetic spec. This is a small piece of CI reasoned to a standard I rarely see.
4. **Write-once handovers, and the Probe's first question.** The handovers are the only reason questions 1, 3 and 5 of this audit could be answered at all. The write-once rule is what makes them evidence rather than a wiki.
5. **The audit's dead-trap check and its "Nothing to report in" section.** An audit that reports what it *checked and found clean* is unusual and is what makes six consecutive clean results meaningful rather than an absence.
6. **Rehearsing as the real client role on staging.** The MCP-vs-client distinction (`safeupdate`, statement timeouts, RLS bypass) has caught things nothing else could, three times in one window by `AUDIT-v166`'s count.

---

## Recommendations, ranked by expected value

All are affordable by one person in an afternoon.

### 1. Make the pre-push review leave an artifact, and make the hook check for it. ← **do this one first**

**Why first:** the review is empirically the most productive gate in the process (§3, "What to protect"), and it is the *only* gate with no trace anywhere — not on the PR, not in CI, not in git, not in the handover template. Six batches that shipped client assets to production have no record of it, and five of those are unknowable in either direction (§2).

**What to do, concretely:**
- Have the `code-review` agent write its findings to `.review/<sha>.md` (gitignored, or committed — either works).
- Add a fourth check to `.githooks/pre-push`: if the diff against `origin/main` touches `js/`, `css/`, `index.html`, `sw.js`, `tests/`, `.github/` or `supabase/`, and no `.review/` file exists for the current HEAD, **refuse the push** with a message naming the rule.
- Add `## Review` to the handover template in `skills/handover/SKILL.md`, as a mandatory section, with the model used and the finding count — *"None"* being an acceptable answer, exactly as the Probe section works.

This converts the single highest-yield convention into a mechanism, and it makes the 176 case impossible rather than forbidden. It costs about an hour.

**What to delete to pay for the new documentation:** the `## New docs/PHONE.md items` section becomes optional rather than mandatory (see #6), and `code-review.yml` goes (see #4).

### 2. Turn on branch protection for `main`: require the `unit` and `smoke` checks.

One setting in GitHub, free, thirty seconds. It closes two documented incidents: `main` red for a whole batch with nothing saying so (172), and a merge with all four checks red because Actions was billing-blocked (183). Require only `unit` and `smoke` — both are seconds long and unconditional — so a Playwright skip or a runner outage never blocks a fix.

Note the trade honestly: on the 183 day this would have blocked the merge until the billing was cleared. That is the correct outcome for a repo whose numbers drive real prices, and it is one dashboard click to override when it is not.

### 3. Point the mutation gate at the numbers.

Add the pricing and parser functions to `targets.js` — `analyze`, `menuMarginPreview`, `costAtLines`, `fmtTargetPct`, and the parser's extractable pure functions — and schedule the `gemApplyReadings` coverage batch that has been pending since 180. The gate already exists and adding a target is two lines; the header of `targets.js` already says adding one is normal work.

The stated worst failure mode is a plausible wrong number, and today the gate cannot see a single line of the code that produces one (§5, Mismatch 1).

### 4. Delete `code-review.yml`, or cut it to twenty lines.

Zero uses across ~50 batches. It makes every other workflow edit more expensive (155, 159). Git keeps it. If a paid second opinion is ever wanted, `gh workflow run` against a fresh twenty-line file is ten minutes' work.

### 5. Resolve `screenshots.spec.js`.

`test.skip` with the reason in the message, per `AUDIT-v166`'s already-taken decision, or delete it. Ten deploy versions of thirteen permanently-red specs is the single largest thing in this repo training a reader to skim past red — which is the same reflex that let `main` stay red for a batch.

### 6. Retire the parallel maintenance track and change what `docs/PHONE.md` is for.

The maintenance track has produced zero items in fifteen batches; delete its section from `skills/batch/SKILL.md` and let C-tier items ride batches that are already in the file, which is what actually happens.

For `docs/PHONE.md`: stop pretending it is a working list. Two changes, both cheap. First, add a **"Costs money if wrong"** section pinned at the top, holding only the handful of entries where a wrong answer moves a price — 193's carton question is the live example, and it was sitting behind a heading telling the reader to stop. Second, cap the rest at the last three batches and delete everything older; the handovers are write-once and hold it all anyway. The 61-item Batch 0 backlog and the v82–v98 carried block are not going to be worked, and pretending otherwise is what let a real pricing question hide behind them.

### 7. Add one magnitude check, on real data.

`HANDOVER-172` already derived the right lesson and applied it only to a seed: *"a fixture can be internally consistent and still be nonsense, and the checks that would catch it are the ones about magnitude, not about shape."* Generalise it — a small set of assertions that every plate cost, unit cost and food-cost percentage lands inside a sane band, run against a snapshot of production. That is the only check in this list aimed directly at the failure mode the whole project is organised around, and it is the one thing that would have caught the $961 salad, the 1831% dashboard, the 30c/kg ham and the 6× carton error without a human looking.

---

## The one-paragraph answer

The process works, and it works for a reason that is not what the documentation emphasises. Its mechanisms are few and its conventions are many, but its conventions are unusually well-honoured because a single disciplined operator is running them at three batches a day — and the record shows that on the two occasions the convention lapsed (176's skipped review, 155's unread CI result), it lapsed exactly as the theory predicts. The one gate carrying most of the weight is also the one with no artifact, no CI check and no line in its own handover template; making it leave a trace is the highest-value hour available. And the process's attention systematically drifts toward the legible problem rather than the consequential one: five batches on a browser segfault whose fix was never applied, six audits of "eval harness: not done", and a mutation gate that guards who may press Delete while nothing at all guards the arithmetic that decides what a plate costs.

---

*Audit performed 22 August 2026 against the artifacts and record supplied. No application code was read; all conclusions about the code are drawn from what the record says about it.*
