# Maintenance

Internal quality: docs, comments, test meaning, refactors, dead code, CI hygiene, process wording.
Real work. **Not shipping work.**

The classification test is in `docs/QUEUE.md`. **When a tier is genuinely ambiguous, it is C and it lands here.**

Split 11 Aug 2026 out of a 979-line `QUEUE.md`. Nothing below is new; every item was already open.
⚠️ **Every line number in this file predates one or more redesigns** (the v125 audit measured ~290 moved lines in `js/app.js`, ~255 in `css/style.css`, and F1a-F6 have moved far more since). **Re-grep by NAME, never by the number.**

---

## How this file gets worked: C items RIDE the batch that already touches the file (Max, 22 Aug 2026)

⚠️ **THE SEPARATE PARALLEL TRACK IS RETIRED. Max's call, 22 Aug 2026, reversing his own 13 Aug decision on measured evidence.**
The track was created with a second worktree, a collision rule and a five-batch tally to judge whether it was working.
Batches 181 to 197 ran. The git log holds exactly one maintenance commit, and it is a recording rather than a fix.
Two handovers record the track explicitly not running, and 194 found a structural reason it can never run during an audit batch.
**Seventeen batches, zero items. The tally has its answer**, and it was put to him with that number.

**What replaces it, and it is what already happened in practice:** when a batch opens a file, it takes the C items in this file that touch that file, in the same PR.
No second worktree, no collision rule to get wrong, and no separate track to forget.
The collision problem the worktree existed to solve disappears rather than being managed, because there is only ever one branch.

**The two consequences worth stating:**
- **A C item in a file nothing is touching will wait, possibly a long time.** That is the honest cost and it is accepted: it was already waiting under the old scheme, with a worktree and a procedure implying otherwise.
- **If the queue's A and B items are ever cleared, a maintenance sweep runs as its own ordinary batch.** That is the escape hatch, and it needs no special machinery.

*(The blind process audit of 22 Aug 2026 recommended this; `docs/audits/BLIND-AUDIT-2026-08-22-process.md` §4.2 carries the counts. It also noted the joke that the item proposing to retire the track was itself filed on the track, which is the evidence as much as the argument.)*

## The old parallel-track procedure, kept only as the record of what was tried

⚠️ **The line above read "worked only when `docs/QUEUE.md` is empty" until 13 Aug 2026, and `skills/batch` said the same.** It no longer does. Max is waiting on batches; the queue's A and B items are a dependency chain that cannot parallelise, while these are genuinely independent — which is exactly the shape that can.

**The worktree.** `/Users/max/Documents/Scoopys-Costing-maintenance`, created 13 Aug 2026 by `git worktree add --detach ../Scoopys-Costing-maintenance origin/main`. It is a second checkout of the same repository, so the two tracks cannot fight over one working tree.
Each maintenance batch starts there with `git fetch && git switch -c maintenance/<slug> origin/main`, and ends detached again (`git switch --detach origin/main`) so the branch can be deleted after merge.
**`npm test` runs there with no install** — it is `node --test` and needs no `node_modules` (1018 tests, verified in the worktree on the day it was created). **Playwright does not**: `npm i` in the worktree first if the item touches a spec.
If the worktree is missing, recreate it with the command above rather than working maintenance items in the main checkout.

**The collision rule, which is what makes this safe.** Before starting a maintenance item, read the files the current queue batch is touching (its branch diff, or its plan).
**If the maintenance item would touch one of them, STOP and take the next maintenance item instead.** Do not merge and hope, do not rebase around it, do not "just be careful" — the whole app is one `js/app.js`, so this will happen, and the answer is always to move on.
**Say in the handover when it happens**, naming the item skipped and the file it collided on. That record is the only evidence the next bullet can be judged on.

**Report after five maintenance batches** whether the collision rule blocked more than it let through. **If it did, the parallel track is not viable on this codebase and should stop — and that is a real answer, not a failure.**
The tally lives here so it survives a context clear:

| # | Item | Started | Collided? (file) |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |

---

## Displaced B items — promote when a `QUEUE.md` slot frees

These passed the launch test and lost on priority against the 20-item cap. They are not C.

### The converted screens' column bands are `aria-hidden`, so their figures are announced unlabelled
Found 10 Aug 2026 by the F5 pre-push review, which spotted it on Menu. It is **all four converted screens** — `renderIngredients`, `renderKitchenPanel`, `renderPlatesTab` and the Menu band in `index.html` each emit `aria-hidden="true"` on the column-heading row. F2 set the pattern and F3/F4/F5 followed it, so fixing it on Menu alone would leave two accessibility idioms across four tables that look identical.
**What a screen reader actually gets** (measured): each row is one `<button>`, so its accessible name is the concatenation of its cells, and a Menu row reads *"Roast $3.00 $10.00 $7.00 food cost 42.9% - well over your target"*. The verdict is fine — `vbadge`'s `aria-label` is the v131 law. The other three figures are bare. The old `<table><thead>` announced "Cost", "Suggested", "Price" against each cell; the div grid announces nothing.
On MOBILE the meta line's `::after`/`::before` supply "cost," and "suggested", but generated content is announced inconsistently and is cancelled at >=768 — so it cannot be the answer.
Requirements: ONE decision for all four screens. Two candidates, neither obviously right: visually-hidden per-cell labels inside each row (verbose — repeated on every row of a long list), or a per-row `aria-label` built by the renderer from the same values the cells show (concise, but a second string that can drift from the visible one, which is the failure mode `CLAUDE.md` names for stubs). Whichever wins, the band's `aria-hidden` is then correct rather than a gap.
Out of scope: the `vbadge` markup, wording and aria, exact-pinned and already correct.
Note this is the reason to keep `aria-hidden` for now rather than removing it: an announced floating row of five words before every list is worse than silence, and labels nothing.

### `.flag-review` text sits below the AA body-text floor, in BOTH themes — measured
Filed 23 Aug 2026 by batch 200, which added an explanation to the invoice review and measured whether a user could read it.
**Measured in a real browser, at the computed colour against the surface it is actually painted on: 4.17:1 in light, 4.32:1 in dark.** The WCAG AA floor for body text is 4.5:1. Both miss, and dark misses by less, which is the opposite of the usual guess.

`.flag-review` is the app's own review-flag colour and is worn by **every** explain line on the invoice review — the parser unit-mismatch message, the "Set the pack, or type the price" prompt, and now 0b's re-base explanation. So this is not one screen's copy being faint; it is a token.
**Why 201 did not fix it:** raising it is an app-wide palette change, and `CLAUDE.md` requires visual changes to be surgical and one screen at a time — a previous density pass was rolled back wholesale for exactly this. It also sits next to the two `1.4:1` control-boundary readings below and is plausibly the same question about the same palette, which is an argument for answering them together rather than nudging one hex.
`tests/visual/200-pack-unit.spec.js` MEASURES it every run and asserts a floor of **3.0** — the AA floor for large text and UI components — with the shortfall written out at the assertion. That is deliberate: asserting 4.5 leaves a permanently red test that says nothing new, and asserting 4.17 pins the defect as though it were intended. Raise the number in that spec as part of the fix.

### Control BOUNDARIES sit near 1.4:1, in two places, and it is ONE question
WCAG 1.4.11 wants 3:1 for the visual boundary of a control. Measured 10 Aug 2026: the toggle's off-track is **1.36:1**, and F5's "Delete this menu" button is **1.40:1 light / 1.38:1 dark** — its border is `--danger-border`, used exactly as the mock's §2 specifies for a destructive button.
Neither was fixed, for the same reason: the control's own TEXT carries the identification (the Delete label measures 5.43 light / 5.92 dark, clear of AA), so the boundary reinforces rather than identifies.
The toggle half is older and worse: a white knob on a `--border-2` `#E3DCCF` track, carried entirely by the knob's drop shadow, track-against-card ~1.35:1. v136 fixed the DARK case (`--knob` when off, `--on-accent` when on) and left light as it has always rendered.
Requirements: decide ONCE for every bordered control whether this app's boundaries clear 3:1, and if yes do it **in the token**, not per control — a per-control fix is how two became a pattern nobody can see. Candidates: darken the off-track, or add a hairline border to track and knob.
Note the palette block already carries three MEASURED DEVIATIONS from the mock on exactly this basis (`--text-3` twice, `--danger` once), so deviating is established practice and not a fight with R1; what is missing is the decision, not the permission.

### Retry on a failed write needs a write queue first, and that is the feature
Found by the v144 batch, which refused to ship the mock's Retry button rather than ship a dead one.
§5's error banner carries a **Retry**. On a failed WRITE there is nothing to retry: `pushWrite` does not keep the builder after it fails, and `CLAUDE.md` records the absence as a known gap. A button would either need a queue or would reload and lose the edit anyway. The one path where Retry is honest is a failed BOOT, and `#bootGate` already owns that.
Requirements: this is the WRITE QUEUE item, and Retry is its UI. Trigger: a write that fails while the app is open. Data: the pending builders are **closures**, so the queue must be built from serialisable intent — that is the design problem. State: a queued write must be visible, re-orderable against later edits of the same row, and must not resurrect a delete that succeeded. Error: a retry that fails again must not loop.
⚠️ If this ships, `css/style.css`'s `.sync-banner{pointer-events:none}` comes out in the same change and the placement is re-measured — the comment at the site says so.
Note the standing rule this does NOT change: offline already toasts *"you're offline. It has NOT been saved."* The user is told today; what they cannot do is act on it.

### `ensurePlateForDish` heals: relink when ONE plate matches, ask when several (DECIDED 9 Aug 2026)
Correct for a genuinely uncosted row; for one whose real recipe exists in the library it leaves that recipe unreferenced and silently starts a second, empty one. Flagged in v113, unchanged.
Requirements (Max's answer, 9 Aug 2026): the heal looks for an existing library plate by the dish's name BEFORE creating an empty one; exactly one match → relink automatically; several → ask; none → today's behaviour.
Note **no path creates an unlinked row**: the class arrives only from history or a restore, and production has **0** of them (verified 7 Aug 2026).
Build it with the both-sides lesson in mind — a relink heals kid-lines only (see `kingMissingImpact`'s v124 history).

### "Synced N min ago" — the §3.1 quiet channel needs a last-sync timestamp
Found by the v144 batch, which decided the sync treatment and could not build this half of it.
§3.1's header carries a quiet **"Synced 4 min ago"** at 12px `--text-3`. The app has no last-sync concept: `setSync('ok')` shows "Saved" for 1400ms and hides, so there is nothing to render a relative time FROM.
Trigger: a successful boot load, and every successful `pushWrite`. Data: one timestamp, in memory — a derived cache of "when did the server last answer", so not a third localStorage category and not Supabase either. State: a relative time that must re-render as it ages — a ticking element in every screen header, which is the real cost.
⚠️ **Placement is the unsolved half, not the timestamp.** The mock puts it in the §2 header bar between the title spacer and the actions. This app's `.scr-head` is PER-SCREEN markup, five copies, and the sync element is deliberately ONE element — so either it becomes five (which the sync item's "never per screen" rule forbids) or a single fixed element is aligned into the header band, which v141 measured as unworkable there. Solve that before writing code.

### Recent range on the builder's cost card — the queue item's stated data source DOES NOT EXIST
F7 (11 Aug 2026) was asked to build the mock's "Recent range · $6.61 to $7.28" row as a "read-only
derivation from `priceHistory`". **`priceHistory` is the ALL-MENUS food-cost average series**
(`{t, v}` points, one per logged change, `js/app.js:1435`) — not a per-plate cost history. There is
no series of "what this plate cost over time" anywhere in the app, so the derivation the item named
is impossible and the row did not ship (R4: absent, never a decorative control).
Requirements if it is wanted: reconstruct a plate's cost at time T from `ing_price_history`, which
holds each PRODUCT's price series — for each of the plate's lines, the product's price at T, times
the quantity. That is a real feature with a real cost (N products × the window), and it needs a
window and a copy decision. It is not a display tweak.
⚠️ **Do not "fix" this by reading `priceHistory` anyway.** It would render the café's average food
cost as though it were this plate's cost range — a wrong number on a costing screen, which is the
one thing this app must never do.

### Command palette (⌘K) — behaviour spec, §11.5
Trigger: ⌘K and the sidebar button. Data: the live in-memory arrays (plates, menus, ingredients) + static actions (upload invoice, new plate); no new storage. State: selecting navigates to the screen or opens the action's modal; Esc closes; focus returns to the opener. Error: an honest zero-results row.
**The chord binds only once the palette exists — never a dead chord.** F1b put the 22px theme toggle in the mock's ⌘K slot, so nothing is dead today.

### Invoice import history — behaviour spec, §11.5 (the Invoices screen's recents; R4)
Trigger: apply time. Data: date, supplier, item count, change count, status — a Supabase table with migration + RLS like the others, plus a retention decision. **This is DATA, so never localStorage** (Tier 2: there is no third category). State: one row per import; "Failed, retry" rows need a decision on whether pre-store failures are recordable at all. Error: a write failure surfaces via `pushWrite`'s toast, and the import itself must not be blocked by history bookkeeping.
F8 (v147) shipped the Invoices screen **without** the mock's recent-imports table and stated the absence in one sentence on the screen, so this is what would replace that sentence. The only import fact the app stores today is `cafeDB_lastImport` / `app_settings.last_invoice_import` — one date — and it is printed there.

### Photographing an invoice — behaviour spec, and the queue item that specified it was wrong about the code
F8 (v147) was told to ship the mock's mobile "Take a photo" with `capture` on the file input "feeding the EXISTING parse path; no new parsing". **The code says otherwise and the code wins:** `handleInvFile` branches on `.pdf`, and everything else goes to `FileReader.readAsText` — a JPG or HEIC arrives as binary noise in the paste box and `parseInvoiceCSV` finds nothing. `api/parse-invoice` receives TEXT the client already extracted, so it does not close the gap either. §R4 forbids shipping a control that does nothing, so the button was not built.
Requirements, if this is ever wanted: Trigger: a camera button on the upload sheet. Data: an image has no text layer, so this needs OCR or a vision model call — **a genuinely new capability, not a wiring change.** State: the same three steps; the scanning step is where the extra latency lands, and it is much larger than a PDF's. Error: an unreadable photo must say so as specifically as the image-only-PDF path does.
⚠️ **A vision call reopens the privacy gate** — `CLAUDE.md`'s standing precondition binds any endpoint shipping user data to a third-party model, and an invoice photo is strictly more than the text the app sends today.

### "Slightly under" is the one verdict phrase that does not carry its own subject
F8 (v147) answered the queue's three-vocabularies question: the split IS deliberate — the Menu cell judges COST against target ("over"/"well over"), `marginLightWord` judges PRICE against suggested ("Slightly under"/"Underpriced"), and the filter chips say what you would DO ("Watch"/"Rework"). Three subjects, one shared LIGHT from `analyze()`. Written out at `vbadge` in `js/app.js`, with pointers at the other two sites.
**The residual:** of the nine phrases, "Slightly under" alone names no subject, so it is the only one a user can read as being about cost when it is about price. "Underpriced", "Healthy margin", "over", "Watch" and the rest all carry theirs.
Requirements: one word or two, at one site, that names the subject without lengthening the row — and it must not turn into a re-litigation of the split, which is decided. Out of scope: colour, `analyze()`, and the other eight phrases.

### CSV export (Settings → Data) — behaviour spec, §11.5
Trigger: the Data-section button. Data: which objects and columns, to decide. State: a download; nothing else changes.
**CSV is an export for humans and NEVER an import path** — the JSON backup stays the restore format and the backup-format law is untouched.

### The toast and the install banner overlap each other at desktop
Found 10 Aug 2026 while measuring a free slot for the sync banner; the same class as the defect v141 fixed — two pieces of `position:fixed` bottom chrome whose owners never met.
Measured at 1024 with both showing: `.toast` x431-817 / y770-816, `.install-banner` x600-1000 / y787-876 — they share x600-817, y787-816. The same overlap holds at 1280, 1440 and 1920 (both anchored to the bottom, one centred and one right-aligned, so widening does not separate them).
The toast is `pointer-events:none` so nothing is BLOCKED, but the install banner's "Install" button and its ✕ sit under a pill of text. Only reachable pre-install (`beforeinstallprompt`), so Max on an installed PWA never sees it — **it is a new café's first ten minutes.**
Requirements: one owner for the bottom stack. v141 established the three-way split (left: sync banner, centre: toast, right: install banner) and this is the one pair that split does not separate, so the fix is vertical — stack the toast above the install banner when both are up, or move one. `tests/visual/v141-sync-corner.spec.js` already measures the banner against both and would extend to cover this pair.

---

## C — tests and CI

### ~~`tests/visual/screenshots.spec.js` cannot pass and cannot report it~~ — **EXECUTED, batch 200 (`ezplate-v170`)**
✅ `test.skip` at file level with the cause in the message, exactly as decided below. A full `npx playwright test tests/visual` now reports **14 skipped, 339 passed** instead of thirteen red at the bottom of a green suite.
**`tests/ci-workflow.test.js` needed NO change and the requirement below was wrong about that** — its assertion counts FILES in `tests/visual/` and compares them to the workflow comment, and a skipped file is still a file that CI still filters. What did move is the comment's number, from 39/38 to 40/39, because this batch added a spec. Left written out because a reader checking the requirement against the diff would otherwise think it was skipped.

**The decision and its reasoning, kept:**
⚠️ **THIS ENTRY IS TWO ENTRIES MERGED, 15 Aug 2026 (AUDIT-v166 C3).** Batches 188 and 190 each found this independently, a week apart, and each wrote it up without noticing the other's — 35 lines apart in this file, same spec, same cause, same two remedies. Both measurements are kept below because they were taken on different days by different means and agree exactly, which is worth more than either alone.

**Measured twice.** Batch 188, 14 Aug, on `origin/main` in the maintenance worktree so the batch could not be blamed: **1 passed, 13 failed.** Batch 190, running the full Playwright suite: **13 specs fail**, identically on unmodified `main`, verified by stashing the branch and re-running one. Red since 186 (`ezplate-v162`) — **ten deploy versions.**

**The cause is 186 doing exactly what it was built to do.** This is the one spec that does NOT call `installBoot` — it drives the real app against the café's live production database (its own header says so, and it is the sole reason CI filters it out — `test.yml`'s "N specs, N-1 survive the filter"). 186 made sign-in mandatory and removed the anon fallback from `current_business_id()`, so an unauthenticated load resolves to no tenant and every screen it photographs is the sign-in door. **There is no bug in the app; the spec's premise expired.**

**Why it matters more than a broken screenshot.** CI never runs it, so nothing anywhere goes red. `npm run shots` is the only signal, and it reads as 13 familiar-looking failures at the bottom of a green-looking suite. **A spec that cannot pass and cannot report is worse than a deleted one**: it trains every batch to skim past a block of red, which is the exact state a real regression would arrive in.

✅ **THE DECISION IS TAKEN — `test.skip` with a named reason, NOT deletion.** (Batch 194, under `CLAUDE.md`'s standing authority: how a test is structured is the assistant's call, and AUDIT-v166 T1 correctly said this needed a decision rather than a batch. Recorded here so whoever executes it does not re-litigate it.)
**Why skip and not delete**, given the file itself says deleting is a real answer: the two are not equivalent in what they leave behind. Deleting removes the only artefact recording that this app was once screenshot against a real signed-in café, and the capability is wanted again the moment there is a test account to do it with — 186 added `auth` to `_boot.js` for precisely that. A skip with the reason in the message keeps the premise visible and costs one line. **Deleting would also be reversible only by someone who knew the spec had ever existed**, and this entry is the evidence that two separate batches did not know about each other's write-up of it.
Requirements: `test.skip` at the file level with a message naming the cause (*"needs a signed-in session; 186 made sign-in mandatory"*), so a full run says **skipped, and why** instead of failed. **`tests/ci-workflow.test.js`'s spec-count assertion moves in the same change** — it pins the exclusion and will otherwise go red or, worse, keep passing against a number that no longer means what it says.
⚠️ Do not "fix" it by giving the harness a real password. The repo is public and credentials never go in.
⚠️ It ships no client asset, so it needs no cache bump — but it changes what runs, so it takes the mandatory `code-review`.

### ~~CI minutes~~ — EXPIRED THE DAY IT WAS WRITTEN, 13 Aug 2026
Written when GitHub blocked all Actions on a billing cap, proposing two ways to cut minutes. **Max made the repo PUBLIC instead, which makes Actions unlimited and free** (measured: `billable_ms` 0 for an 8-minute run), so neither lever saves money and neither should be built for that reason.
Measured usage at the time: **330 runs since 1 Aug; 168 in the five days from 9 Aug (94 `pull_request`, 74 `push` to main)** — about 34 a day, against a four-minute-per-run billing floor caused by GitHub rounding each JOB up to a whole minute.

**Three things outlived the cost argument and are kept in full, because they are the expensive parts to re-derive:**

1. **Folding `changes` into `unit` is still a real simplification** (one fewer runner startup, one fewer job in the checks list), it just no longer saves money. If anyone does it, repoint `playwright`'s `needs:` AND `if:` at `unit` — `test.yml` says at its own site that those two are a pair and neither works alone.
   ⚠️ **`tests/ci-workflow.test.js` EXTRACTS that script by its surrounding double quotes.** Move the script and you must move the extractor in the same change, **or the test throws rather than passing quietly** — which is the failure class this repo keeps finding.
   ⚠️ Against it: `test.yml`'s header calls the four-job split deliberate — *"FOUR JOBS ON PURPOSE, so the checks list says WHICH kind of thing broke without opening a log"*. That is a real property, not decoration.
2. **Dropping the duplicate push-to-main Playwright run is a SAFETY trade, not an implementation choice — it needs Max, not a batch.** It gives up the stated reason main is exempt from concurrency cancellation: *"every commit that reaches production gets its own recorded result."* Keeping `unit` and `smoke` on push to main and dropping only `playwright` retains most of it.
3. **`pull_request` tests `refs/pull/N/merge` — the merge RESULT — but GitHub does NOT re-run it when the BASE moves.** So a PR whose base advanced after its last run was never tested against what actually merges. Rare with sequential single-developer batches; still true, and independent of billing.

### One unit test fails for 60 seconds a day, and it is the clock, not the code
Caught live 10 Aug 2026 at **23:59:53 local**, three runs for three failures, then passing a minute later.
`tests/trend-reframe.test.js:133` ("several entries on one day cluster into ONE marker") builds two log entries at `t` and `t + 60000` where `t = Date.now() - 2 * DAY`, and asserts ONE marker.
**The app is right and the test is fragile.** `js/app.js` keys markers on the LOCAL calendar day (`getFullYear()+'-'+getMonth()+'-'+getDate()`), which is correct — a café's day is a local day. If the test module loads in the last 60 seconds before local midnight, the two entries fall on different local dates and the assertion fails. A ~0.07% window.
Requirements: anchor the fixture to a fixed time of day rather than to `Date.now()` — local noon two days ago is enough. **Check the whole file while there**: several other tests build offsets from `Date.now()` and any that straddle a local midnight have the same latent fault.
⚠️ Do not "fix" it by keying the app on UTC — that is a real behaviour change to serve a test.
Note this is a worked example of the thing the mutation-testing item is about: the test passed 8 straight batches that day and was not wrong until the clock made it so.

### The specs register a service worker they never test, and that is what crashes the browser
Proved 10 Aug 2026, not guessed. `js/app.js` registers `sw.js` on window load, so **every** Playwright spec registers a service worker, and the crash is the context teardown racing that registration: **9 crashes in 360 tight cycles against 0 in 360** padded ones, across two Chromium builds (1228: 6 of 210 · 1234: 3 of 150). The bump to 1234 did not help. Retries hide it competently, so this is not urgent — but it is a known mechanism now, and the trigger is a thing the specs do not test.
Requirements: stop the harness registering a service worker at all. `tests/visual/_boot.js` already installs a fake `window.supabase` and aborts off-origin requests before the app runs, so it is the one place — abort `**/sw.js`, or stub `navigator.serviceWorker` before `app.js` runs. Then re-run the tight probe (the two spec files are in the history of PR #147 and are the acceptance test: **done when 150+ tight cycles crash zero times**).
⚠️ **Do not measure this with a green suite** — that is the mistake the previous item's own probes would have made. Use the reproducer.
⚠️ It changes what the specs exercise, and that must be a decision rather than a side effect: no spec asserts anything about the service worker today, but the boot path they drive would no longer include registration. If that is wanted somewhere it wants ONE spec that tests it deliberately, not 209 that do it by accident.

### ~~Mutation testing (Stryker)~~ — **SHIPPED as the pre-push gate, batch 180**
Do not re-add it. It was C for four audits on the argument that the batches catch their own vacuous tests; Max promoted it himself on 13 Aug 2026, rescoped from a report into a gate, and it shipped the same day as `tests/mutation/` + `.githooks/pre-push`. **Not Stryker** — it rewrites source from its own AST, which breaks every anchor `tests/_extractfn.js` slices by, so the whole suite would go red on mutant #1 and report 100% killed. `tests/mutation/mutate.js` has that reasoning at the top.

### ~~Bring `gemApplyReadings` under the mutation gate~~ — **PROMOTED to `docs/QUEUE.md` item 0c2, batch 201**
It sat here for fifteen batches and completed nothing, which is the argument rather than a complaint: a line inside another item's requirements is exactly what let it be deferred, and 0c's third requirement was that it be SCHEDULED rather than deferred a sixteenth time. It is now an item that can reach the top of the queue on its own. Count re-confirmed at 201: still 44.

**The original entry, kept for the detail the queue item does not repeat:**
**Measured, not guessed: 44 of its mutants survive `tests/invoice-gate.test.js`** (180's first run). That file pins exactly one property of the referee's merge orchestrator — a row the user has already ruled on is skipped whole — and nothing else. The candidate map, the taught-pack short-circuit, the history lookup and every rule-table branch are unpinned.
It is listed in `tests/mutation/targets.js` under `pending` with that count, deliberately outside `targets` so the gate does not exit 1 on `main`: **a gate nobody can satisfy gets disabled, which is worse than one target short.**
Requirements: enough coverage of `gemApplyReadings` that its mutants die against a named test file, then move the line from `pending` into `targets` in the same change. `tests/inv-gemini-merge.test.js` already owns the pure `gemMergeLine` rule table — this is about the orchestration around it, so do not duplicate that.
⚠️ It is a **fragile area** in `CLAUDE.md` (the invoice review and the referee), so read the existing tests first and pin conditions, not structure.
Note the honest scope: 44 surviving mutants is the size of the gap, not the number of tests needed — one good case usually kills several.

### ~~More functions on the mutation gate's target list~~ — **SUPERSEDED by `docs/QUEUE.md` item 0c, batch 201**
Every candidate this entry names was RUN through the gate in 201 and now sits in `tests/mutation/targets.js`'s `pending` list with a measured survivor count, and the queue item carries the same table in cost order. A list of "obvious next candidates" is worth less than a list with numbers on it, and the numbers are what make the remaining work splittable.
Two corrections to the text below, measured rather than argued: the count was **54 targets, not 17**, and `computeAvgFoodCost` / `bootGate` / `purgeLocalState` were not re-measured — only the pricing surface was, which is what the queue item scopes.
⚠️ **Its last requirement — "keep the full run in the low tens of seconds" — was ALREADY FALSE when this was written and nobody had timed it.** Measured on unmodified `main` at 201: **306 seconds**, not tens. That matters because the sentence was being used as a reason not to add targets, and the constraint it appeals to had already gone. The real constraints are the per-mutant timeout (added in 201) and the CI job bound (also 201, and the `unit` job had none at all).

**The original entry:**
`tests/mutation/targets.js` covers 17 functions: the price guards, the invoice referee's decisions, the publish/delete guards, the write sequence and the row boundary. That is the code this project has already been burned on, and it is a starting scope rather than a finished one.
Obvious next candidates, each load-bearing and each with a test file it would be uneasy to lose: `resolveMatchedPrice` and `applySupplierMemory` (read-only — `CLAUDE.md` forbids editing them, which does not forbid mutating a copy in the sandbox), `gemMergeLine`, `invRowState`'s callers in `renderInvReview`, `computeAvgFoodCost`, `bootGate`, `purgeLocalState`.
Requirements: add them one or two at a time, triage every survivor in the same change, and keep the full run in the low tens of seconds — the gate's value is that people actually run it.

### The mutation gate's full run is minutes, not seconds, and it grows with every target
Filed 24 Aug 2026 by batch 202, which added ten targets and watched the number move.
**Measured on this laptop: 306s at 54 targets, 801s at 64.** The first reading was taken during batch 201 against `main` as it stood *before* that batch merged; 201 then promoted four, so `main` was at 58 between the two readings. *(The entry first said "54 targets, on unmodified `main`", which was true when measured and false by the time it was written down — caught by the pre-push review, and a small demonstration of the rot this entry is warning about.)* CI is faster — the `unit` job came back at 3m15s — so this is not urgent, and the job's `timeout-minutes: 20` has headroom either way.

**Why it is worth recording rather than acting on.** `docs/QUEUE.md` item 0c still has 143 survivors across four functions, and closing them means four more targets on a list whose cost is roughly linear. The pre-push hook runs `mutate:changed` and is unaffected; it is CI's unconditional full run that carries this.
The obvious lever is that the gate re-runs a target's whole declared test-file set for every single mutant, so a target with four declared files pays four times over. Nothing here needs it yet — write it down, watch the number in each 0c batch, and act if a CI job starts approaching its bound.
⚠️ **Its predecessor entry claimed "low tens of seconds" and had never been timed.** Whatever replaces this one should carry a measurement and the date it was taken, or it will rot the same way.

### An eval harness for the invoice reader
The invoice path is the app's highest-stakes surface and its only AI one, and **there is no way to tell whether a parser or prompt change made it better or worse.** `tests/invoice-gate.test.js` and `tests/inv-gemini-merge.test.js` pin specific decisions on hand-written inputs; neither measures accuracy over a corpus. So every change to `resolveMatchedPrice`, the taught-pack precedence or the Gemini prompt is judged by whether the unit tests still pass and whether one invoice looked right.
Requirements: a set of real invoices with expected line/price/pack outcomes, and a score comparable across two commits. It must run **offline against stored model responses** — re-calling Gemini per run would make the score non-deterministic and cost money.
Out of scope: changing the parser or the prompt. This is measurement; acting on what it measures is separate.
Note: this needs Max's real invoice set, and those invoices are commercial data — decide where the corpus lives before collecting it.

### Audit the older Playwright specs for MEANING, not for green
Measured 7 Aug 2026: `screenshots.spec.js` carries **2 assertions for the whole file** (a capture harness wearing a spec's clothes), while `fresh-states.spec.js` carries 117 but builds its fixtures by calling `window.addProduct(...)` at **five sites** — a function dead in the app and kept only because these specs are its last handle.
A spec that sets up through a door no user has cannot fail for a reason a user would hit.
Requirements: each spec either asserts something a user would notice, or is retired on purpose and said so.
Note Playwright is not in `npm test`, so nothing here fails loudly. That is the reason to look, not a reason to defer.
⚠️ **`addProduct` is a Tier 1 trap kept alive ONLY by `fresh-states.spec.js`, and the trap says deleting it fails SILENTLY.** If this item retires that spec, `addProduct` becomes dead in the same commit and nothing will notice. Close the trap in the same branch, or keep the spec for that reason and write it down.

### `_boot.js`'s empty-table list is a list of things NO browser spec can see
Found twice in three batches, and the second time it blocked verifying a change that had just been made.
`tests/visual/_boot.js` serves a handful of Supabase tables from localStorage and answers `{data:[]}` for everything in `emptyOk`. Two of those turned out to be the ONLY feeder for a visible feature:
- **`ing_price_history`** (fixed in F6/`v143`) feeds the What-moved panel and the "Biggest movers" row.
- **`menu_change_log`** (fixed in `v145`) feeds the trend chart's intervention markers and the dashboard's since-line.
Requirements: read the rest of `emptyOk` as a list of app features no browser spec can exercise, and for each either serve it from localStorage in the shape its row-mapper expects (the pattern is established three times now) or record at the site that nothing renders from it.
Note the cost is asymmetric, which is the argument for one pass: serving a table is a few lines, while discovering the gap costs a batch its verification step at the moment it needs one.

### `layout-consistency.spec.js` never measures the list BODY
Its comment claims it asserts "the shared left edge", but it stops at the actions row (`panelLeft`/`titleTextLeft`/`btnLeft`), so the v123 Plates surface sitting 4px proud at ≥1024 would have shipped silently; the review caught it, not the spec.
Extend it to measure each tab's list-body left edge at both sizes. Found by the v123 pre-push review, 9 Aug 2026.
(Also pre-existing and shared: at 561-1023px both Products and Plates sit 4px inside the h2 edge — decide once whether that is the design.)

### Four test files still read `js/app.js` by hand instead of `loadApp()`
Residue of the 48-file `extractFn` migration (10 Aug 2026), which scoped itself to the files that hand-rolled the EXTRACTOR. These four extract nothing, so they were never in the 48: `builder-nomatch.test.js`, `scroll-lock.test.js`, `terminology.test.js`, `smoke.js`.
Each is one line — `fs.readFileSync(path.join(__dirname,'..','js','app.js'),'utf8')` → `loadApp()` from `./_extractfn` — and `smoke.js` may want leaving alone, since it is not in `npm test` and runs standalone.
Note `tests/extractfn.test.js` reads the file by hand ON PURPOSE — that is how it proves `loadApp` returns the real thing — so it is not a fifth.

### All three CI jobs carry a Node 20 deprecation warning
Seen 10 Aug 2026 on run `31387797521`, as a `warning` annotation on every job: *"Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/cache@v4, actions/checkout@v4, actions/setup-node@v4."*
Nothing is broken — GitHub runs them on 24 regardless — so this is a bump of three `uses:` pins, not a fix. **Worth doing for a reason specific to this repo:** a permanent warning annotation on every green run is noise on the exact channel the segfault detector now writes to, and this project's whole safety net is someone actually reading a warning on a green check.
Requirements: bump the three actions to whatever major currently targets Node 24, in one commit, and confirm the annotation is gone on the next run.
Out of scope: the `node-version: '22'` the jobs request, which is a different thing and is not deprecated.

### Re-pin `claude-code-action` to a release tag — BLOCKED on upstream
`.github/workflows/code-review.yml` pins `anthropics/claude-code-action` to commit `751e0038` — **main's head on 8 Aug 2026, not a release.**
Forced, not a preference: at v1.0.187 `validateTrackProgressEvent` THROWS on the `labeled` action, so the label trigger could not work at all with `track_progress: true`. Dropping `track_progress` was the alternative and it is worse — that is the "runs, finds things, publishes nothing" failure this repo has already paid for twice.
A commit pin is immutable, so this is safe rather than floating — but it is **unreleased third-party code**, and an unreleased pin nobody revisits is how a temporary decision becomes permanent.
Requirements: once a release ≥ v1.0.188 contains upstream `d573b167`, pin back to `@v1` — one line. The check is in a comment above the pin:
`gh api repos/anthropics/claude-code-action/contents/src/modes/detector.ts?ref=v1 -H 'Accept: application/vnd.github.raw' | grep -A6 'const validActions'` — if `labeled` appears, re-pin.
Blocked on upstream, not Max. Check it when a batch next touches the workflow.

---

## C — `docs/PHONE.md` needs a groom, and Max asked for it (15 Aug 2026)

His words: *"i wonder if we can have claude in chrome do the phone check. id imagine the phone check needs auditing first though as some stuff probably old now."* **The instinct is right and here is the measured evidence, so the next batch to take this does not have to re-derive it.**

- **756 lines, 173 bullets, spanning v82 → v167.** Nothing has ever been deleted from it, only appended.
- **The same question is asked in FIVE places.** "Two buttons in a header, does it wrap on your phone" appears at lines 46, 199, 216, 225 and 250 (Ingredients, Products, Menu, Plates, More) — and the file itself says *"it is queued as one fix for both"* and *"answer it once for both screens"*. Max is being asked one question five times.
- **Whole blocks are explicitly reversed but still sit there in full.** `v132-v135` says dark mode is gone; `v136` above it says the opposite and tells the reader to treat the block below as history. Both are printed at full length.
- **It has already produced one real navigation failure**, found by AUDIT-v166 (D1): a `Settled — no phone needed` heading sat above SEVEN live sections, so a reader going top-down stopped seven sections early — including 193's carton-vs-pack question, which that file says *"makes every cost in the app wrong by the carton size."* The heading was moved; the underlying ordering (newest-first, then `Carried`, then chronological append) was not.
- **Playwright has meanwhile grown to 38 specs, 37 of them asserting at 380px.** A good deal of the older layout material is now mechanically covered and nobody went back to strike it.

**What this is NOT.** A sample read shows the authors were disciplined: most entries really are device judgements, and several name the reason precisely (*"iOS Safari is the one engine this was not driven in"*, *"an emulator will not show it honestly"*). **So the win is de-duplication and supersession, not reclassification.** Do not go in expecting to find the list is mostly bogus; expect to find it is mostly repeated.

Requirements: sort every bullet into (a) dead or superseded → delete with the reason, (b) already settled by a Playwright spec → strike and name the spec, (c) a desktop browser can settle it → do it and record the answer, (d) genuinely needs an iPhone → keep. Merge the five header-wrap bullets into one. Fix the ordering so it reads in one direction. **Judge (c) strictly** — a 380px Chromium window is not an iPhone, and `CLAUDE.md` already says so.

## C — code hygiene and latent defects

### A $0.00 invoice line means two different things to two functions on the same import
(Found 26 Aug 2026 by batch 203, writing coverage for `applySupplierMemory`. **Neither behaviour is wrong on its own; they disagree, and nothing anywhere says which is intended.**)

An invoice line whose price column reads `0.00` — a sample, a freebie, a credit — reaches two functions in the same import, and they take opposite views:

- **`invDerivePackQty`** treats it as a freebie or a credit and deliberately derives **no pack size** from it. That is written down, with the reasoning, as the reason one of its mutants is NOT allowed in `tests/mutation/targets.js`: *"a $0.00 invoice line is a freebie or a credit, and it must derive no pack size rather than a pack size of zero."*
- **`applySupplierMemory`** stores the zero. Its guard is `unitPrice<0`, not `<=0`, so a remembered pack over a $0.00 line yields `unitPrice: 0`, `needManual: false` and `remembered: true` — a row that looks fully resolved and, if confirmed, writes a cost of zero onto the product.

**Why it is C rather than B:** the row is on the no-match branch, so it never auto-ticks and the user confirms it by hand; and a $0.00 cost really is the honest answer for a line that cost nothing. **Why it is worth writing down anyway:** a zero cost reads as a free ingredient everywhere downstream — every plate using it gets cheaper, the food-cost KPI moves, and nothing on any screen says a price came from a $0.00 line. That is the quiet-wrong-number shape this repo keeps finding.

The behaviour is now **pinned as behaviour** in `tests/supplier-memory.test.js` (*"a $0.00 line IS priced, at zero — the guard refuses NEGATIVE, not free"*), with the disagreement written at the test's own site so the test cannot be read as an endorsement. **The pin is deliberate and is not the answer**: it exists so the `<` / `<=` boundary cannot be changed by accident, and it must be rewritten by whoever settles the question rather than treated as a constraint.
Requirements: decide what a $0.00 line means, once, and make both functions say it. If the answer is "a free line is a real price of zero", `invDerivePackQty`'s allowance reasoning is the thing that is wrong and should be corrected. If it is "a $0.00 line is not price information", `applySupplierMemory` needs `unitPrice<=0` and the test above needs inverting.
⚠️ **Do not change one of them alone.** Two functions agreeing on the wrong answer is recoverable; two functions disagreeing about the same line is what this entry is.

### "Try again" after a PDF-reader load failure cannot work, for TWO independent reasons
(Found 15 Aug 2026 by batch 195 while rewriting `ensurePdfjs()` for the 4.10.38 upgrade. **Pre-existing, not introduced — but 195 added the second reason, so it is written down rather than half-fixed.**)

A pdf.js load failure toasts *"Could not load the PDF reader — check your connection and try again"* and returns the user to step 1 of the import, which invites exactly the retry the wording names. Re-picking the file re-enters `handleInvFile` → `extractPdfText` → `ensurePdfjs()`, and **nothing is re-attempted**:

1. **`__pdfjsPromise` memoises the REJECTION** and is never cleared, so every later call returns the same settled failure. This has been true since v88 and is the older half.
2. **A failed module fetch is sticky in the document's MODULE MAP** (added by 195's ESM move). Per the HTML spec a failed fetch stores a null entry, and re-importing the same URL fails immediately without re-fetching — so even clearing the memo would not restore the retry.

Only a page reload actually retries. **Reason 2 is why this is filed rather than fixed**: clearing the memo is the obvious one-line "fix" and would leave the retry just as dead while *looking* repaired, which is worse than the honest current state. That is also why `ensurePdfjs()` says so at its own site.
Requirements: either make the retry real — a fresh URL on retry (a cache-busting param) so the module map has no entry, with the SRI hash re-checked against it since the bytes are identical — or change the wording so it does not promise something only a reload delivers. **Decide which; do not clear the memo alone.**

### The staging seeds' assertions assume exactly one tenant
(Found 13 Aug 2026 while widening the two semantic keys in 183. **Not wrong today, and that is why it is C.**)
`03-seed-realistic.sql` and `04-seed-scale.sql` verify themselves with statements like
`select jsonb_array_length(value) into m from public.app_settings where key = 'kitchen_ingredients'`.
Since 183 that key is only unique per café, so with two tenants seeded the query matches **two rows** and `select … into` silently takes an arbitrary one — no error, and the assertion then checks whichever café Postgres happened to return.
It cannot bite yet, because each seed's first act is to `delete … where true` as `postgres`, which is not RLS-scoped and therefore empties every tenant. **The assumption is load-bearing and unwritten**, which is the whole finding: the day a seed stops wiping across tenants, or someone runs an assertion block on its own against a two-tenant staging, it reports success on the wrong data.
Requirements: the self-checks filter on `business_id`, or say at their own site that they are only valid immediately after the wipe. Same for the summary `select` at the bottom of each seed.

### The Invoices screen still has the boot-race priming gap that F9 fixed for Settings
Filed 11 Aug 2026 by the F9 batch. **Half of it was fixed by F10 (v149) and this is the surviving half** — the original entry also described `currentTab()`'s fallback list, which is now the shared `TAB_PANES` constant and no longer has a hole.
What remains: `rerenderCurrentTab`'s `if/else` chain names `analysis`, `ingredients`, `dashboard`, `pantry` and `settings`, returns early for `account`, and falls through to `renderPlatesTab()` for everything else — so **`invoices` gets `renderPlatesTab()`**. `restoreLastTab()` runs before `bootstrapSync()` resolves, so a refresh landing on Invoices renders `#lastImport3` against pre-boot state and never corrects it, while a hidden Plates library is repainted instead.
Latent rather than live only because Invoices has no route below 1024; **the mobile More-screen item gives it one and makes this reachable.**
Requirements: one decision for the whole chain rather than a fourth special case. A screen-to-renderer map that `showTab` and `rerenderCurrentTab` both read would end the class, exactly as `TAB_PANES` ended the four-pane-lists class. Note the fallback being `renderPlatesTab()` means a wrong screen is repainted silently, with no error, which is why nothing has ever noticed.

### The mock's Business and Notifications sections are R4 with no spec written
F9 (v148) declined to draw either, per §R4 — no business name or currency is stored anywhere, and there is no notification system, no email and no scheduler behind "price rise alerts" or "weekly summary". Both are recorded here so the absence is a decision rather than a gap somebody re-discovers against the mock.
Business name and currency are cheap and near-useless with one café; **currency is the one with teeth**, because every money display in the app hard-codes `$` and a second café outside Australia makes that wrong everywhere at once, not just in Settings. Treat it as a costing question, not a Settings row.
Notifications are a server-side feature (a scheduler, an email sender, a subscriber list) and reopen the privacy gate the moment they carry plate or supplier names off-device. **Do not build them as a UI shell.**
Related: the CSV-export behaviour spec above, which came from the same section of the same mock.

### `isBuilderDirty` compares against the raw saved lines, not what was loaded
Found by the v118 pre-push review and **considered, not fixed** — an asymmetry rather than a reproducible bug.
`loadPlateState` silently DROPS a `pid` line whose product is gone (a `kid` line degrades to "product missing"), but `isBuilderDirty` compares `currentLinesSig()` — built from the filtered `plate` — against `sp.lines` mapped straight through `lineSig`. So a plate carrying such an orphan reads as dirty the instant it loads, re-arming the very "Unfinished plate" prompt v118 removed, for that plate only.
Believed unreachable today because `productRefs(pid)` refuses to delete a product any plate line still references — **that guard is the only thing holding it shut**, so this becomes live the moment a delete path stops checking, or a restore lands a line whose product did not come with it.
Requirements: decide whether `loadPlateState` should degrade a `pid` line the way it degrades a `kid` line, or whether `isBuilderDirty` should compare like against like.

### Menu / empty-state centring — four fixes, no root cause on record
Found by the v115 audit as **the strongest remaining candidate for an unfound root cause in this repo.** Fixed in `HANDOVER-v44`, `v49`, `v54` and `v70`, each as its own CSS correction. No handover names a shared cause and no Tier 1 entry was ever written — the signature of a symptom treated four times. `tests/empty-states.test.js` postdates all four, so it pins the current state rather than the thing that kept breaking.
Requirements: read the four fixes together, name the shared cause or state positively that there isn't one, and if there is, write the trap.

### `doDeleteMenu`'s unawaited dish deletes
Flagged in v114, unchanged. Same class as the v112 sequencing fixes.
Note `menu_items.menu_id → menus.id` is ON DELETE SET NULL, so unlike the plate case there is no FK to violate — this is about the change-log entry chaining off the write that actually decides the menu is gone, not about a 23503.

### `priceHistory` wholesale-replace at boot
Pre-existing asymmetry flagged at the site. An empty or filtered server response replaces local wholesale. `menuHistory` merges; `priceHistory` is the last of the series with the gap — a point logged offline is lost at next sync.

### Nothing makes "a modal opened over another must be LATER in the markup" a rule
Found by the v137 pre-push review; its stated mechanism was wrong while the thing it pointed at is real — the case `CLAUDE.md` warns never to dismiss.
Fifteen of the eighteen `.modal-overlay` elements share `z-index:80`; only `#confirmModal` is `85`. For equal z-index the browser paints the LATER sibling on top, so a flow that opens an earlier-in-markup modal over a later one gets the new modal rendered **behind** the old — a rendering bug that would look like "the button did nothing".
`topOverlay()` is NOT the defect and must not be "fixed": it computes paint order by the browser's own two rules, so whatever it returns genuinely is on top. It simply cannot rescue a modal painted in the wrong place.
No such flow exists today — verified: every real stack either routes through `#confirmModal` (which always wins) or closes the first modal before opening the second (`setSmemOpen` runs `closeSettings(); openSmem();`, `paPublish` runs `closePlateActions(); openManageMenus(id);`). The one genuine same-z stack, Tidy lists → a tidy action, has the child later in the markup and is pinned against `elementFromPoint` in `tests/visual/v137-modal-layer.spec.js`.
Requirements: make the ordering a rule that can fail — either a test asserting every reachable modal-over-modal pair paints its child on top, or an explicit stacking scheme (an `.is-stacked` layer above 80) that removes the dependency on markup order.
Out of scope: reordering `index.html` for its own sake, and any change to `topOverlay`.

### The trend chart does not re-measure on resize
Found and created by F6 (10 Aug 2026) — the residue of that batch's own fix.
Everything inside the trend SVG is in viewBox units (`font-size:11px` on an SVG `<text>` is 11 USER UNITS, not 11 device px), so the plot's type and stroke scale with its rendered width. F6 fixed the cause by sizing the viewBox to the column at render time (`trendPlotSize`, reading `#dashBody.clientWidth`), taking the desktop chart from a 2.7× enlargement to 1:1.
**But `renderDashboard` does not run on resize.** Drag a desktop window from 1360 to 900 and the viewBox stays at the old width: the SVG rescales smoothly, so nothing breaks, but the type is off by the ratio of the two widths until the next re-render — which any scope or range change performs.
Requirements: decide between a debounced `resize` listener calling `repaintDashboardIfVisible()` only when the plot width actually changed, and leaving it as a documented limit. If a listener ships it must not fire mid-scrub (the scrub holds state on the live SVG) and must not re-render while the tab is hidden.
Out of scope: `trendPlotSize`'s ratios and clamps, pinned in `tests/trend-reframe.test.js`.
Note the intermittent-user rule cuts BOTH ways: Max on a phone never resizes, which is why this is not urgent — and is also why nothing else will ever notice it.

### Dead CSS sweep
Six selector families with **zero** emitting markup anywhere in `index.html` or `js/app.js`. **Re-measured 10 Aug 2026** (lines containing each selector in `css/style.css`): `.ref-pill` 6 · `.db-tools` 2 · `.ing-empty` **9** · `.an-empty` 19 · `.plate-noresult` 1 · `.king-tag` 1, whose only `js` hit is a comment saying the pill was REMOVED, not hidden.
Requirements: a rule comes out only when nothing emits its class — grep both files per selector, not per family. `.an-empty` and `.an-empty-box` are separate names sharing a prefix; do not let one grep answer for both.

### `ing_price_history` needs its unique index reconsidered
Same-millisecond writes for one product would collide on `unique (product_id, recorded_at)`. Not reachable in practice (a human cannot re-price one product twice in a millisecond, and `applyInvoice` touches a different product each pass), but it constrains the normal price-logging path, so it needs its own brief. 0 duplicate pairs as of 4 Aug 2026, so a change would still apply cleanly.

### `saveIngLog`'s `_ingLogPending` buffer
Exactly one producer and one consumer on adjacent lines, so it holds at most one point. A real simplification, but it sits on the price-log path — not housekeeping.

### `ingredients.updated_at` is stale and means nothing
It is NOT history and must never be read as such. Either make it honest or drop it — the reason it is recorded here is so nobody builds on it. (The Tier 1 trap in `CLAUDE.md` is the live protection; this item is the cleanup.)

### `edDelArmed` is dead
Declared at `js/app.js:7949`, written at `:7976` and `:7988`, read nowhere. Verified 7 Aug 2026, still true 11 Aug 2026. Delete it.

### `analyze().absPct` lost its last reader in v122
The Q3 redesign replaced the "`32% under`" Variance cell — its only consumer — with the food-cost % composition. It is three lines inside `analyze` and part of that pure function's tested shape, so it was kept rather than trimmed mid-batch. Trim it (and its `Math.round`) the next time `analyze` is touched, or keep it deliberately — either way say so at the site.

### `avgFoodCostForScope` counts dishes whose `menuId` has no By-menu row
Latent; zero such dishes on current data.

### `verdictHtml`'s "Nothing costed and priced on this menu yet" branch is unreachable for a NAMED menu
Unreachable since v96 (the only reachable scopes are all-menus and menus with a costed plate). The all-menus wording of the same branch is still live, so this is a trim, not a delete.

### A plate whose NAME contains a digit fails the money-law number validator
e.g. "Pizza 4 Cheese" — the Gemini phrasing is dropped and the deterministic template stands. Safe degradation, never a wrong number, but those plates never get the warmer wording. Found in v90, unchanged.

### The ~390KB of self-hosted fonts re-download on every deploy
(v132 review) `CACHE` changes per version, `activate` deletes the old cache, and `install` re-fetches every ASSET — including the eight immutable woff2 files — on the mobile connection of an intermittent user.
Consider a separate versionless font cache (fonts never change once committed) or fetch-time caching.
Also: `cache.addAll`'s `.catch(function(){})` swallows a partial install silently — `tests/settings-toggles.test.js` pins that every ASSETS path exists on disk, which covers the typo case but not a deploy-time failure.

---

## C — copy, comments and records

### `ingredients_pkey` is `(id)`, not `(business_id, id)`, and only a migration header says why that is safe
Routed by AUDIT-v166 (check 3 of the three batch 193 asked for). **The recommendation is explicitly NOT to widen the key** — that is a migration on a critical table, it drags `restore_backup` in with it under 183's law, and `ingredients.id` is referenced by `plate.lines[].pid`, `kitchenIngredients[].pid` and `ing_price_history.product_id`, none of which carry a tenant. It defends against a design nobody has proposed.
**The real gap is that the protection is entirely narrative.** 193 designed around the narrow key — product ids stay random, never content-derived — and wrote the reasoning into `supabase/migrations/20260815_supplier_code.sql`. Nothing makes a future batch read that file before making an id meaningful, and a content-derived product id would collide across tenants on a key this narrow.
Requirements: two assertions in `tests/unique-ids.test.js`, beside the existing scope guard that already pins the INVERSE (that the semantic keys stay content-derived *because* they are tenant-scoped) — (a) every product-id mint in `js/app.js` goes through `uid(`, which today is `uid('CX')` and `uid('IMP')` and nothing else; (b) `supabase/staging/01-schema.sql`'s `ingredients` table still reads `id text primary key`, so the day someone widens it the guard is re-judged rather than silently satisfied. **Put the reason in the failure message and name the migration file**, so a red test hands the next batch the document instead of hoping they find it.
Note this ships no client asset but does change what runs, so it takes the mandatory review and no cache bump.

### ~~The two skill directories are byte-identical copies and nothing keeps them that way~~ — **THE PREMISE WAS FALSE. Measured 24 Aug 2026, batch 203.**
✅ **They are not copies. Every entry in `.claude/skills/` is a SYMLINK into the tracked `skills/` directory, and has been since 8 Aug 2026 — a week before this item was written.**
```
.claude/skills/batch         -> ../../skills/batch
.claude/skills/cache-version -> ../../skills/cache-version
.claude/skills/decide        -> ../../skills/decide
.claude/skills/handover      -> ../../skills/handover
.claude/skills/verify        -> ../../skills/verify
```
`stat` gives the same inode for both paths. There is ONE file, so the loaded copy IS the tracked copy, an edit to it is visible to git and to the review, and there is nothing that can drift. **The item's own stated fix — *"symlink `.claude/skills/<name>` at each tracked skill"* — was already in place when the item asked for it.**

⚠️ **HOW A CORRECT OBSERVATION BECAME A WRONG ITEM, because this is the transferable part.** The audit verified the two paths were **identical** and concluded they were **copies kept in sync by hand**. Identical is exactly what the same file looks like. The check could not distinguish "two files that happen to match" from "one file seen twice", and the conclusion assumed the first.
That is `CLAUDE.md`'s standing rule arriving again: **a check that finds nothing has only proved something about WHAT IT LOOKED FOR.** `diff` answers "do these bytes match"; it does not answer "are these two files", and `ls -l` or `stat` was one command away.
*(The gitignore half of the claim is true and harmless: `.gitignore:8` does list `.claude/skills/`, which is why `git check-ignore` on a path inside it reports "beyond a symbolic link" rather than a plain answer. Ignoring a directory of symlinks to tracked files ignores nothing.)*

**The `.DS_Store` in `skills/` is the only real difference `diff -rq` reports between the trees, and it is noise.**

Note the related-but-different item further down — three OTHER skills (`new-branch`, `investigate`, `test-flows`) live in `~/.claude/skills/` with no repo copy at all. That one is not fixed by a symlink and is the more serious of the two.

### Two importer threads 193 found, considered, and left in a write-once handover
Routed by AUDIT-v166 (D4). Both are **speculative** — 193's reason for not queuing them was that neither has been asked for and nobody has used the importer twice yet, which is sound. They are recorded here only because the handover is write-once and a thread that reaches neither this file nor the queue is a thread nobody will action.
- **The column mapping is not remembered between imports.** A café whose supplier exports an unrecognised format re-maps the same eight columns every month. Cheap to fix (one `app_settings` key, keyed by the header row's shape) and worth nothing until someone has done it twice.
- **Nothing anywhere shows a product's supplier code**, so a user cannot see why a re-import matched or did not match an existing product. **This is the more likely of the two to matter**: a re-import that silently matched the wrong product has no user-visible way to be diagnosed, which is the quiet-wrong-number shape this repo keeps finding.

### `cafeDB_plateDraft` has no tenant in it, so one device's unsaved plate belongs to whoever signed in last
Found 14 Aug 2026 by batch 186's pre-push review. The reachable half of it was fixed in that batch and this is the residue, stated so nobody re-derives it.
**The key is global.** `DRAFTKEY` is one localStorage entry holding a plate name and `{kid,qty}` lines, and `kid`s resolve against `kitchen_ingredients` rows that mean different things in different cafes. Nothing stamps it with the account or the business that authored it.
186 closed the two ways that could bite: signing in from the boot gate now ASKS about an unfinished plate and discards it on the switch, exactly as the Account card does, and `offerPlateDraftResume` returns early while the gate owns the screen so a signed-out visitor is never shown a plate by name.
**What is left is a worse outcome than necessary, not an exposure.** Asking is a blunt answer: a legitimate owner coming back to their own device is offered a choice between their work and signing in, and there is only one right answer for them (sign in, lose the plate) because a signed-out browser cannot save anything.
Requirements: stamp the draft with its author on write - the `envFence` pattern, one field - and have the switch KEEP a draft whose author matches the incoming account and ignore one that does not. An absent stamp reads as "the pre-186 era" and is kept, so no existing draft is destroyed by the upgrade. Then the gate's sign-in need not ask at all in the common case.
Out of scope: the resume prompt's copy and the gate guard, both correct as they stand.
Note this becomes reachable the moment TWO accounts can sign in on one device, which is the roles/invitations item. Doing it before that item ships is optional; doing it after that item ships is not.

### Google sign-in is still unbuilt, and it needs Max before it needs code
Arrived here 14 Aug 2026 when batch 186 finished the auth queue item and deleted it. It was the item's last surviving bullet, it was explicitly **optional** from the day it was written, and by the queue's own tier test it is a C: email/password sign-in works, so nobody is blocked, embarrassed or hurt by its absence.
**It needs a Google Cloud OAuth client id and secret pasted into the Supabase dashboard, which no code can create.** The client half is `signInWithOAuth({provider:'google'})` and a button — two lines and a control on the boot gate's sign-in screen (`#bgSignForm`, 186) and on the Account card, which are the two places the password form already lives.
Requirements: the dashboard credential exists first — ask Max, do not start without it. Then ONE shared handler, as 186 did for the password form: the two surfaces must not grow a second copy of the sign-in sequence.
Out of scope: sign-up. An account that joins no café can see nothing at all since 186, so self-service signup's only outcome is the "ask the café owner" screen — that is the roles item's invitation work, and it is written into that item.


### "Abbreviation matching in search" has been recorded as shipped for three audits and is not built
The old `QUEUE.md` cited "abbreviation search" as a past example of an item describing something as missing which had already shipped — one of the three that motivated the "check an item against the code before working it" warning.
**The citation is a different feature.** `kitchenSearchMatches` (v55 §G) matches the ingredient name and its linked product's description/brand/category/supplier — real and shipped, but a plain substring match (`hay.indexOf(token) >= 0`). There is no abbreviation expansion in the file.
The actual feature — "gf" finding "Gluten Free Bread" with no literal "gf" in the haystack — was **explicitly declined**, and says so a few lines below the code AUDIT-v135 cited as proof it shipped (`js/app.js:701-704`, unchanged since `HANDOVER-v83`: *"the fuzzy matcher can't match abbreviations… it produced duplicate ingredients"*).
`HANDOVER-v120.md:36` flagged the mislabelling once and it did not stick — v121, v122 and v135 each repeated it.
Requirements: **correct the record first**, everywhere it is cited — rename the closed thread to "product-text search (v55 §G)" so it stops being re-verified as done by every future audit. Then decide separately whether real abbreviation/synonym matching is wanted, and if so where the mapping comes from. Those are two jobs and only the first is certain.
~~Note this is the THIRD instance of a correction being written down and not propagated. If a fourth turns up, the routing itself is the item.~~
⚠️ **STRUCK 15 Aug 2026. THE TRIGGER FIRED AT AUDIT-v156 AND THE ROUTING NEVER BECAME AN ITEM — because the root cause was removed by a different route two days later, and nobody came back to cancel the alarm.** The 13 Aug standing-authority reversal deleted the mechanism that dropped corrections: a documentation fix is now made and reported, not proposed and parked. **Measured by AUDIT-v166: every handover from 181 to 193 landed its `CLAUDE.md` edit directly. Zero parked edits in thirteen batches.**
**Kept struck rather than deleted, because the lesson is about the trigger and not the bug:** a standing "if this happens once more, escalate" note has no way to notice that its own premise was fixed, so it sits there firing correctly and pointlessly, and a reader who checks it, finds it already tripped and sees nothing happened learns to skim the next one. **A trigger needs an owner and an expiry, or it trains people to ignore triggers.** The one thing still genuinely open in this entry is the record correction above, which is unaffected.

### Three skills live OUTSIDE the repo, so nothing can review or pin them
⚠️ **The reviewer half of this item was FIXED on 12 Aug 2026 (batch 177) and is not the open part.** `~/.claude/skills/new-branch/SKILL.md` §6 had the two reviewers exactly backwards — it called the on-demand PR workflow "MANDATORY and runs itself" and the pre-push `code-review` agent "OPTIONAL". It now matches `CLAUDE.md`, its gotchas are re-pointed, and step 5's unconditional "wait for the user to approve the plan" now branches on whether the work came from the queue (approved) or from chat/a brief (not).
**What remains is the reason it drifted, which no edit to that file fixes.** `new-branch`, `investigate` and `test-flows` live in `~/.claude/skills/`, outside the repo — the repo's own `.claude/skills/` holds `batch`, `cache-version`, `decide`, `handover`, `supabase*` and `verify`. An outside file cannot ride a PR, cannot be reviewed, and no test can pin it, which is how this one told every batch the wrong thing for **three audits running** (v135, v145, v156) while an in-repo copy would have been caught by the first reviewer to read the diff.
It has now cost something real: `HANDOVER-176` records the first batch to ship to production with no pre-push review at all.
Requirements: decide whether the three MOVE into `.claude/skills/`. If they do, they become reviewable and diffable like `batch` and `handover` already are; if they stay, say why and accept that they drift unpinned.
Note this is Max's call in one respect only — they are his global config and moving them changes what other projects see. Everything else about it is mechanical.

### The handovers' Playwright count uses a different filter from CI's, and the difference is the live-production spec
Found by AUDIT-v156 (T2). `HANDOVER-176` reports *"288 Playwright"* green. CI guarantees **274 in 30 files** — its filter is `ls tests/visual/*.spec.js | grep -v screenshots.spec.js`. The whole directory is 288 in 31.
**The 14-test delta is exactly `tests/visual/screenshots.spec.js`**, which imports only `gotoTab` and never calls `installBoot`, so it does not stub Supabase and does not abort off-origin requests. Its own header says *"the app talks to your live Supabase."* CI has an explicit fail-closed guard to keep it out of the hermetic job.
So a handover quoting 288 is quoting a number that came from running the one spec CI deliberately excludes, and is not the figure CI stands behind. It reads only, so this is not a data risk — the problem is that the reported green means something different from the guaranteed green, and nobody reading the handover can tell.
Requirements: settle ONE number that handovers quote, and say which filter produced it. The cheap answer is to quote CI's filter, since that is the one with a guard behind it. Do not fix this by editing past handovers — they are write-once.

### v156 shipped to production without a pre-push review, and has never had one
Found by AUDIT-v156. `HANDOVER-176` states it plainly: *"No pre-push review this time — the brief said 'no code review pass, just implement'."* That batch's layout work is live at `ezplate-v156`.
The **cause** is fixed — `CLAUDE.md` says a brief cannot relax its rules, and the `new-branch` skill that called the reviewer optional has been corrected (see above). This item is the **remediation**, which is separate.
Nothing is known to be wrong. 175's findings were reviewed and fixed; 176's claims are measured rather than argued, and both suites are green. But the diff was never read by a second model, and two of AUDIT-v156's findings (the 288/274 count above, and the missing `docs/PHONE.md` entries) are exactly what a reviewer catches.
Requirements: run the `code-review` agent retrospectively over the 175+176 diff (`git diff 023e311..d1a8e53`), on a different model, blind to the brief. **Anything it finds is a NEW branch and a new PR** — the code is already on `main`, so it cannot be fixed in the PR that carried it. That is the rule this must not break in the name of tidying up.
Tier note: C, not B, because no defect is known — this buys assurance, not a fix. Promote it if anything on those screens turns out to be wrong on a phone.

### The search ✕ shows on every search bar even when the field is empty
Pre-existing and app-wide (`.ms-clear`, `css/style.css:1160`), noticed on the converted Plates screen where the mock draws no clear control at all.
F2 kept the control (R3 — `type="search"` renders no native clear on iOS Safari, which is Max's phone) and rebuilt it as `.plib-x`, but did not change WHEN it shows, because the behaviour is shared with four unconverted screens.
Decide once: hide it while the field is empty (an input listener on each search bar, or one delegated handler), or keep it always-on deliberately and say so. Whichever way, it wants doing in one place for all six search bars, not per screen.

### `manifest.json`'s `theme_color` / `background_color` match NEITHER palette
`#3E2C26` / `#F7F3EC` — pre-existing, found by the v136 pre-push review while fixing the `theme-color` meta. The meta now follows the chosen theme correctly; the manifest is a separate static declaration used for the install splash and the task-switcher card, and it names colours from a palette two redesigns ago.
A manifest cannot be theme-aware, so this is a decision: pick the LIGHT palette values (`#FFFFFF` / `#FFFFFF`) as the install-time default, or the dark ones. Only seen at install and in the app-switcher, but wrong today either way.

### ~~Three vocabularies name the same three lights~~ — ANSWERED, F8 (v147)
Raised by the v131 pre-push review and carried since. **The split is deliberate: three subjects, one shared light.** The reasoning is written out once at `vbadge` in `js/app.js`, with pointers at `marginLightWord` and at the chips in `index.html`.
Struck rather than deleted so the decision is visible where the question was asked.
The only residual is **"Slightly under" is the one verdict phrase that does not carry its own subject**, above in this file — a smaller question than this one was, and named rather than pointed at, because a pointer to a position rots the moment anything is inserted.

### The publish dialog and the Menu row print the same ratio at different precision
Whole-number % vs one decimal (HANDOVER-125). Same `cost/price` ratio, two displays — align them or record the split as deliberate at both sites.

### `.range-btn` — visual size only, NOT an accessibility item
The chip is 32px tall but `css/style.css` gives it a `::after` extending 6px top and bottom, so the tappable area is already 44px. What is left is that the dashboard shows controls at two visual sizes after the 44px selector rows. Max deferred this 31 Jul 2026; it is a taste call.

### The stale v60 target-line comment in `trendChart`
v61 item 6 superseded the half it describes. (The *domain* half of the v60 comment block was rewritten by the v145 y-domain fix; the target-line sentence was not. Re-grep by name.)

### "Menu item" survives as a fifth object noun in the Edit-menu-item modal
`CLAUDE.md` Tier 2 records it as a known surviving fifth noun awaiting its own brief — it is not a bug to fix on sight.

### The `.chart-hint` / `.scope-note` "all menus" pair under the chart
Two hints under one chart saying overlapping things. Read them together and cut or merge.

### Builder cost panel: the design's "+ Add to another menu" shortcut was deferred out of Q6
(9 Aug 2026) It needs the manage-menus modal to stack over the open builder and the cost panel to refresh when menus change underneath — both untested territory that was not riding a redesign batch. The panel's "On menus" list ships without it; publishing still lives one tap away on the plate card.
**F7 rebuilds the builder as a full page and rehouses publishing, so re-read this against F7's result rather than against Q6's.**

### The Cost card paints an EMPTY 16px bordered box on the phone for an unpublished plate
(Found 11 Aug 2026 while measuring the builder for the fill-order item, 170. **Pre-existing since F7/v146 — not introduced by that change.**)
`#bCost` has three children and below 768 all three can be hidden at once: `@media (max-width:767px)` hides `#bCost > h2` and `#bCost .bld-kv` (the summary bar carries those two figures, §7), and `.bld-menus` is `display:none` whenever the plate is on no menu. What is left is `.bld-cardbody`'s padding inside `.bld-card`'s border.
**Measured at 380px on an unpublished plate: height 16, `display:block`, nothing painted inside it.** Every plate is unpublished until it is saved and added to a menu, so a brand-new plate shows it every time.
Not fixed here because it is a different screen region from the one the item scoped, and the fix is a judgement call rather than a line: hide the card when it has nothing to show (needs a JS hand, since CSS cannot see that all three children are hidden), or give the phone SOMETHING in it. Do not reach for `:has()` without checking it against the browsers the PWA actually runs in.

### The plate name now appears three times on the builder page
(Found 11 Aug 2026, same measurement. **This one IS a consequence of 170** and is recorded rather than fixed because changing the tag's copy was not in the item.)
Header title (`#bldTitle`, added by 170 as the mock's static §3.7 title), the `#plateName` field in step 2, and `#editTag`'s "Editing: Fish & Chips" directly under it. Before 170 it was twice — the header field and the tag.
`#editTag`'s real job is saying **saved plate vs new plate**, and the name is the part of its sentence that is now redundant three ways. `updateEditTag` is its one writer. It is a status label, not a control, so R3 does not apply, but the useful information in it should survive whatever is done.


### The Playwright suite has never been audited for specs that pass against a broken app
(Recorded 12 Aug 2026, batch 178. Declined as work in that batch because it is C by construction and the batch was already large.)
This project has hit the vacuous-test failure **seven** times, and CLAUDE.md's own test for it is "would this test FAIL if I broke the thing it names?" - answered by breaking the thing and watching it go red.
Nothing has ever asked that question of the 289 browser specs as a set. Two of the seven were found by accident, one batch apart, both green and both mine.
The method is mechanical rather than clever: mutate one load-bearing thing per spec's stated subject and confirm the spec that names it goes red. A spec that survives every mutation of its own subject is the finding.
It is also the honest answer to "is the suite carrying dead weight" - 3.8 min locally and 8.7 in CI is worth spending only on specs that can fail.

### `dispPrice` returns a string its callers have to unpick
(Recorded in `HANDOVER-176`, still true at v157.)
Two of its four callers put the return value where markup would be wrong, so the `/kg` suffix fix wraps it rather than changing it.
The cleaner shape is for it to return parts and let each caller compose. It touches the invoice review, so it is not a drive-by.

### The `.btn-noun` collapse still shortens two secondaries that now have room
(Found 12 Aug 2026 by looking at batch 179's own result at 360, after the rehome had shipped.)
`@media (max-width:639px){.btn-noun{display:none}}` turns "Set up from products" into **"Set up"** and "Import invoice" into **"Import"**. `renderKingProgress` states the reason at its own site: *"the noun span hides on phones so the pantry pair fits one line"* — i.e. it exists to make the HEADER fit, and 179 moved both buttons out of the header. Measured in the `.plib-controls` row at 360, each sits alone on its line with the row's full content width (328px) available and uses ~78–95px of it.
So the labels are shortened for a constraint that no longer applies to them, and **"Set up" on its own does not say what it sets up** — it is the first thing a café with a full catalogue and no ingredients is offered.
Not changed in 179 because it is a copy decision rather than the rehome, and because `tests/visual/fresh-states.spec.js` pins **both** short forms on purpose (*"the SECONDARY still shortens — the idiom survives where the room is tight"*), so whoever changes this changes that pin consciously and states what expired — the room is no longer tight.
⚠️ Do NOT just delete the `.btn-noun` rule: the word "More" on the back chevron is also a `.btn-noun` and `css/style.css` says at that site that the collapse is what stops the Products header wrapping. Scope any change to the rehomed actions.

### "Existing plate" is offered on the Menu screen when there are no menus
(Found 12 Aug 2026 while rehoming it in 179. **Pre-existing — it sat unhidden in `.scr-head` before, and 179 moved it without changing when it shows.**)
`#menuAddDishBtn` renders at zero menus, and `openAddDishModal` opens against a null `currentMenuId`: `#ad_menuName` fills from `menuNameById(null)` and `submitAddDish` would publish a dish with `menuId: null`. Every other control on that screen is stood down at zero — the switcher, the filter row, the column band, Delete and the footnote all hide, and `fresh-states.spec.js` asserts each one — so this is the odd one out rather than a considered exception.
Requirements: decide whether it hides at zero (consistent with every sibling, and there is genuinely nothing to publish onto) or whether it stays and `submitAddDish` refuses with a real message. Do not answer it by adding a fourth `hidden` toggle to `#menuSwitchRow` — 179 moved that row off `hidden` precisely because it hosts an action, so this hides the BUTTON, not the row.

### The sync pill flickers between chunks on a large catalogue import
(Found 15 Aug 2026 by batch 193, in the code it wrote, and left alone deliberately.)
`dbPushIngredients` and `dbPushIngPrices` chunk at 200 rows and each chunk is its own `pushWrite`, so a 412-product import runs `setSync('saving')` then `setSync('ok')` three times in a row rather than showing one continuous "Saving".
It is cosmetic and the end state is correct either way, which is why it is here and not in the queue.
The fix is not "chunk less" - the chunking is what keeps a request a sane size and what makes a partial failure reportable.
It is either a `pushWrite` variant that brackets a whole sequence, or a caller-held "busy" that the pill respects; the first is the tidier shape and touches every write path, so it is not a drive-by.
Whoever does it should check the import's own button state first, which already says "Importing…" for the whole run and is the thing the user is actually looking at.

---

## C — from the two independent blind audits, 22 Aug 2026

Two auditors, no shared context: one saw only the code (no `CLAUDE.md`, no `docs/`, no history), one saw only the process artifacts and the 149 handovers (no code). Both reports and both briefs are committed as `docs/audits/BLIND-AUDIT-2026-08-22-*`. **The A and B findings went to `docs/QUEUE.md` as items 0, 0b, 0c, 0d and 8-11.** What is below is the C tier.

### `supplier_phrases.pid` never crosses the row boundary, so `syncMemoryToProduct` is dead after any reload
`rememberSupplierPhrase` (`js/app.js:3730`) sets `pid` in memory. The table has **no such column** (`supabase/staging/01-schema.sql:163-170`) and **neither mapper carries it** — `rowToSupplierPhrase` / `supplierPhraseToRow` at `js/app.js:415-416`. So every entry loaded from the server has `pid === undefined`, and `syncMemoryToProduct` (`js/app.js:3733-3737`), which matches on `e.pid===pid`, finds nothing in any session but the one that taught the pack. Its own comment reads *"ITEM 1: keep Remembered items in step with the product's taught pack."*

Concrete cost is low and that is why this is C: `resolveMatchedPrice` prefers the product's own pack over memory, so memory only prices a line when the product has no pack at all. The Settings "Remembered items" list can display a stale qty beside a product whose real pack differs.
**What makes it worth recording: a guard that is present, documented and cannot fire, with nothing saying so.**

⚠️ **ONE OF THE THREE FIXES IS UNSAFE, and it was the cheapest-looking one.** (Batch 200, which opened `applyInvoice` for QUEUE 0b and considered taking this along.) *"Match on the normalised phrase instead of `pid`"* would make the guard fire — on **every supplier's entry for that phrase**. Two suppliers whose line text normalises the same way can genuinely sell different pack sizes; the guard would overwrite one of them with the other's, and `resolveMatchedPrice` re-prices from memory on the very next import. That turns a dead guard into a wrong-data path, which is strictly worse than nothing. **Two fixes remain: the column plus both mapper halves, or delete the guard and say why.**
The column is a `supplier_phrases` change, and that is one of the five tables `restore_backup` inserts with `select *` — so it must be nullable with NO default (`CLAUDE.md`'s four-clause carve-out, condition 3) and needs the full `docs/STAGING.md` procedure. That is why 201 did not ride it: it is a migration, not a one-liner.

### ~~`var catState` is declared TWICE at top level, and the duplicate guard cannot see it~~ — **DONE, batch 200 (`ezplate-v170`)**
✅ All three steps, in the order the requirements demanded. The combobox's is now `catCombo` (five sites plus its declaration, which carries the reason at its own site); `tests/housekeeping.test.js`'s regex covers `var`/`let`/`const` as well as `function`; and the new arm is exercised against injected source in a test of its own rather than trusted. **Proved it catches the real one**: renaming `catCombo` back to `catState` turns the guard red naming `catState`, which is the check that a widened guard nobody has watched fail would have skipped.
The scope is stated in the test: the `^` anchor compares TOP-LEVEL declarations only, so a nested shadow is not flagged — that is legal JavaScript and not what the guard is about.

**The original entry, kept for the mechanism:**
Found by batch 199's pre-push review, which was asked to look for state leaking between two unrelated flows and found two variables that ARE one variable.

`js/app.js` declares `var catState` at the catalogue importer (`headers/rows/map/preset/fileName/plan/busy`) and again at the Add-to-menu category combobox (`chosen/chosenIsNew`). **Grep the name, not a line number.**
This is `CLAUDE.md`'s "a duplicate definition is never dead until reached" trap in its `var` form, and the mechanism is worse than the function form rather than better: both declarations hoist, then **both assignments execute in source order, so the LAST one wins at boot** and the importer's object is discarded before any handler runs.

**Why it is C and not higher, measured rather than assumed.** Neither direction currently loses data. `openCatImport` reassigns `catState` wholesale, so the importer repairs itself every time it opens. The combobox's read is `catState.chosen!==null && catState.chosenIsNew && …`; after the importer has wiped it, `chosenIsNew` is `undefined`, the condition is false, and control reaches the `else`, which shows *"pick Create new category from the list to confirm"* and returns without writing. **A visible re-prompt, not a silent wrong value** — which is the whole reason this is not being fixed on sight. It also needs an unusual interleaving: leaving a category selection half-made to go and open the importer.

**⚠️ THE GUARD IS THE ACTUAL FINDING.** `tests/housekeeping.test.js`'s duplicate test matches `/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm` — functions only. Its title says so; `CLAUDE.md`'s prose said "any top-level name" and was corrected on 23 Aug 2026. So the guard written after `aRow` and `renderAnalysis` shipped real bugs covers one declaration keyword, and the other keyword has a live duplicate in the file today.

Requirements, and **they are ONE job in this order** — widening the regex alone goes red immediately, which is the point:
1. Rename one `catState`. The combobox's is the cheaper side (four read/write sites plus its declaration); `catCombo` or similar. **The naming-inversion rule does not apply** — this is a local, not a `data-tab`, a storage key or a table.
2. Widen the housekeeping regex to `var`/`let`/`const` as well as `function`, and say in the failure message that hoisting makes the last one win, so the next reader gets the mechanism rather than a name.
3. Assert the new arm can go red (add a duplicate, watch it fail, remove it) — a guard nobody has watched fail is this repo's most-recorded defect.

### Comments that disagree with the code
Reported as findings in their own right by the code audit, all of them the kind that sends the next reader the wrong way.
**No count in the heading on purpose** — it said "Four" and the `buildBackup` citation was fixed in 0e, which would have left the number wrong the moment the bullet went. Count the bullets.

- ✅ **DONE, batch 200.** **The ISO-vs-number comment in `dashRangePts`** (grep `typeof p.t==='string'`) — *"Supabase points arrive as ISO strings; a string is never >= a number."* Backwards. `rowToPoint` (`js/app.js:424-433`) converts `recorded_at` to epoch **milliseconds**, so server points arrive as numbers; it is the locally-logged points (`logHistory`, `logMenuPrice`) that are ISO strings. The code handles both and is correct — but anyone simplifying it on the comment's authority deletes the branch that is actually load-bearing.
- ✅ **DONE, batch 200**, and the TEST TITLE said it too — `tests/unique-ids.test.js` was titled *"so it always fits four base-36 characters"*, so the wrong claim was pinned as well as written. Both now say the BOUND rather than a width, and the test adds a one-character case so the un-padded half cannot be assumed again. **`js/app.js:163`** — `% 1679216` was commented *"36^4, so it always fits four chars"*. `_uidSeq.toString(36)` is not zero-padded, so it emits one to four characters. The bound is real; the fixed-width reading is not. Uniqueness is unaffected (the `-` separators carry it).
- **`setCogs` vs the boot read** — `setCogs` (`js/app.js:2608`) rounds to integers; `bootstrapSync` (`js/app.js:1181`) accepts any `parseFloat` in `[1,99]`; `fmtTargetPct` (`js/app.js:6252`) renders one decimal. A fractional target is loadable and renderable but not settable, and the first Settings touch silently rounds it. Decide which of the three is right.

### Resolve `screenshots.spec.js` rather than filtering it
Red since batch 186, ten deploy versions. CI excludes it (`test.yml:379`) and `tests/ci-workflow.test.js` pins the exclusion, so **nothing anywhere goes red**. `AUDIT-v166` T1 already called it *"the single largest block of permanently-red tests in the repo"* and said it *"teaches every batch to skim past red"* — which is the same reflex that let `main` stay red for a whole batch in 172.
`test.skip` with the reason in the message, per the decision already taken, or delete it. Either is better than a filter.

### One magnitude check, against real data
The process audit's highest-value new check, and the only one aimed squarely at this project's stated worst failure mode. `HANDOVER-172` already derived it and applied it only to a seed: *"a fixture can be internally consistent and still be nonsense, and the checks that would catch it are the ones about magnitude, not about shape."*
A small set of assertions that every plate cost, unit cost and food-cost percentage lands inside a sane band, run against a snapshot of production, would have caught the $961 salad, the 1831% dashboard, the 30c/kg ham and 193's carton error **without a human looking.**
⚠️ **State its limit at the site or it will be over-trusted: a band does NOT catch `QUEUE.md` item 0.** $5.50/kg for chips is inside every plausible band; a 10% error is invisible to magnitude and needs the composition test in item 0c. These two checks are complements, not substitutes.

### ~~Retire the parallel maintenance track~~ — DONE 22 Aug 2026, see this file's header
Added 13 Aug 2026 with a second worktree, a collision rule, and a five-batch tally to judge whether it was working. **Batches 181-195 have run since. The git log contains exactly one maintenance commit (`735082d`) and it is a recording, not a fix.** Two handovers record the track explicitly not running (182, 194), and 194 found a structural reason it can never run during an audit batch.
Fifteen batches, zero items. **The five-batch tally has its answer.** Delete the track's section from `skills/batch/SKILL.md` and this file's header, and let C items ride batches already in the file — which is what actually happens.
⚠️ **This item is on the track it proposes to delete, which is the joke and also the evidence.** Whoever picks it up should note that `QUEUE.md` items 0c and 0d exist because Max declined to file two structural fixes here for exactly this reason (22 Aug 2026).

### Change what `docs/PHONE.md` is for
756 lines, 38 sections, and **exactly two bullets marked settled** — one of which is superseded. A carried backlog of 61 unsigned-off items from "Batch 0" that will not be worked. `skills/batch/SKILL.md` says *"Max works through it in one session."*
**No handover records a `PHONE.md` check catching anything.** Max does catch defects — v51, v69, 124, v113, 155, 170 — and every one came from him using the app and saying so in chat, never from working the list. The cost that is not obvious: a standing impression that device risk is managed.
Two cheap changes. **A "Costs money if wrong" section pinned at the top**, holding only entries where a wrong answer moves a price — 193's `LAST PRICE PAID` per-pack-or-per-carton question is the live example, and until 15 Aug it was sitting *behind* a "Settled" heading telling the reader to stop. Then **cap the rest at the last three batches and delete what is older**; the handovers are write-once and hold it all.
