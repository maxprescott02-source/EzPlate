# Maintenance

Internal quality: docs, comments, test meaning, refactors, dead code, CI hygiene, process wording.
Real work. **Not shipping work** — worked only when `docs/QUEUE.md` is empty.

The classification test is in `docs/QUEUE.md`. **When a tier is genuinely ambiguous, it is C and it lands here.**

Split 11 Aug 2026 out of a 979-line `QUEUE.md`. Nothing below is new; every item was already open.
⚠️ **Every line number in this file predates one or more redesigns** (the v125 audit measured ~290 moved lines in `js/app.js`, ~255 in `css/style.css`, and F1a-F6 have moved far more since). **Re-grep by NAME, never by the number.**

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

### Mutation testing (Stryker) — measure the tests that cannot fail (APPROVED 9 Aug 2026, dev-only)
`CLAUDE.md` names fragile areas where a regression test is mandatory, and nothing checks whether those tests would actually FAIL if the code broke. A test that passes against broken code is worse than no test, because it is trusted.
The suite is **878 tests in ~1.6s** (measured 11 Aug 2026; 848 at the v145 audit, 822 at v135 — **re-measure, this number has been found stale by two audits running**), so mutating it is cheap.
⚠️ AUDIT-v145 looked for a fourth "test that cannot fail" specifically and did NOT find one. The three known incidents (F6's focus-ring, v143's marker-collision gap, the light-only sync pin) were each caught inside the batch that introduced them, which is the argument against promoting this.
Requirements: a mutation score for the fragile areas specifically, not a repo-wide number; every surviving mutant in those areas is either killed with a new assertion or written down as deliberate.
Max's yes: 9 Aug 2026, dev-only. The no-new-dependencies rule protects the CLIENT; nothing here ships to it.

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
Do after: **F10** — the fold-in forces honest rewrites screen by screen, so auditing now audits specs about to be rewritten.
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

## C — code hygiene and latent defects

### `isBuilderDirty` compares against the raw saved lines, not what was loaded
Found by the v118 pre-push review and **considered, not fixed** — an asymmetry rather than a reproducible bug.
`loadPlateState` silently DROPS a `pid` line whose product is gone (a `kid` line degrades to "product missing"), but `isBuilderDirty` compares `currentLinesSig()` — built from the filtered `plate` — against `sp.lines` mapped straight through `lineSig`. So a plate carrying such an orphan reads as dirty the instant it loads, re-arming the very "Unfinished plate" prompt v118 removed, for that plate only.
Believed unreachable today because `productRefs(pid)` refuses to delete a product any plate line still references — **that guard is the only thing holding it shut**, so this becomes live the moment a delete path stops checking, or a restore lands a line whose product did not come with it.
Requirements: decide whether `loadPlateState` should degrade a `pid` line the way it degrades a `kid` line, or whether `isBuilderDirty` should compare like against like.

### Menu / empty-state centring — four fixes, no root cause on record
Found by the v115 audit as **the strongest remaining candidate for an unfound root cause in this repo.** Fixed in `HANDOVER-v44`, `v49`, `v54` and `v70`, each as its own CSS correction. No handover names a shared cause and no Tier 1 entry was ever written — the signature of a symptom treated four times. `tests/empty-states.test.js` postdates all four, so it pins the current state rather than the thing that kept breaking.
Requirements: read the four fixes together, name the shared cause or state positively that there isn't one, and if there is, write the trap.
Do after: **F10** — every screen's §5 states are rebuilt from the mock, so a root cause named now is named against layout that is still moving.

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
Do after: **F10** — F7 removes the builder overlay entirely, so a pairing enumerated now is enumerated against modals about to move.

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
Do after: **F10** — F7-F10 each delete a modal's worth of old CSS and will ADD dead families to this list, so sweeping now means sweeping again. These rules are inert, not harmful.

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

### Two CSS comments state the `[hidden]` override mechanism wrongly
Found 10 Aug 2026 by the pre-push review of the CLAUDE.md batch, which caught the same error in the new Tier 1 rule and then in the code it was describing.
`css/style.css:3263` says a bare `display:flex` "outranks the UA's `[hidden]{display:none}`", and `:3378-3380` says the same plus "(class beats attribute-less type rules)".
**Both mechanisms are wrong.** `[hidden]` is an attribute selector at the same specificity as a class, so nothing out-ranks anything: an author rule wins because **author origin beats UA origin, and origin is resolved before specificity is compared.**
The `:not([hidden])` guards those comments sit above are CORRECT and must not change — only the explanation is wrong. It matters because the wrong explanation invites the wrong fix: someone reading "outranks" reasons that matching specificity will do, and it will not.
Requirements: reword both comments to name cascade origin. No selector, rule or behaviour changes.
Note this is a comment fix, but it lands in a client asset, so it takes a cache bump and the mandatory review like any other.

### "Abbreviation matching in search" has been recorded as shipped for three audits and is not built
The old `QUEUE.md` cited "abbreviation search" as a past example of an item describing something as missing which had already shipped — one of the three that motivated the "check an item against the code before working it" warning.
**The citation is a different feature.** `kitchenSearchMatches` (v55 §G) matches the ingredient name and its linked product's description/brand/category/supplier — real and shipped, but a plain substring match (`hay.indexOf(token) >= 0`). There is no abbreviation expansion in the file.
The actual feature — "gf" finding "Gluten Free Bread" with no literal "gf" in the haystack — was **explicitly declined**, and says so a few lines below the code AUDIT-v135 cited as proof it shipped (`js/app.js:701-704`, unchanged since `HANDOVER-v83`: *"the fuzzy matcher can't match abbreviations… it produced duplicate ingredients"*).
`HANDOVER-v120.md:36` flagged the mislabelling once and it did not stick — v121, v122 and v135 each repeated it.
Requirements: **correct the record first**, everywhere it is cited — rename the closed thread to "product-text search (v55 §G)" so it stops being re-verified as done by every future audit. Then decide separately whether real abbreviation/synonym matching is wanted, and if so where the mapping comes from. Those are two jobs and only the first is certain.
Note this is the THIRD instance of a correction being written down and not propagated. If a fourth turns up, the routing itself is the item.

### The `new-branch` skill tells every batch that the MANDATORY reviewer is optional
Found 10 Aug 2026 by the CLAUDE.md-corrections batch, which runs that skill at step 1 of every batch.
`~/.claude/skills/new-branch/SKILL.md` §6 says the PR **workflow** is *"MANDATORY and runs itself … fires on every pull request … you can't skip it"*, and that the pre-push **`code-review` agent** is *"OPTIONAL"*.
**Both halves are backwards**, and have been since the 8 Aug 2026 demotion. `.github/workflows/code-review.yml` is `workflow_dispatch` + the `deep-review` label only. `CLAUDE.md` Tier 3 makes the pre-push agent the mandatory one and calls it *"the only thing standing between a mistake and production"*.
So the skill instructs a batch to rely on a reviewer that will never fire, and to treat the real one as optional. It also promises the workflow "lands as PR comments" that a batch may sit waiting for.
Requirements: §6 restated to match `CLAUDE.md` — pre-push agent mandatory, workflow on-demand — including the "different model" and "never show it the brief" conditions, and the three ways a workflow check has been wrong. While there, re-point the same section's "Treating a green PR workflow as no findings" gotcha, and step 5's "wait for the user to approve the plan", which contradicts `/batch` for queued items (it is correct for chat/brief work — say which is which).
⚠️ **This file is OUTSIDE the repo** (`~/.claude/skills/`; the repo's own `.claude/skills/` holds `batch`, `cache-version`, `decide`, `handover`, `supabase*`, `verify`). It cannot ride a PR, cannot be reviewed, and no test can pin it — which is why it drifted two days without notice. Decide as part of this item whether `new-branch`, `investigate` and `test-flows` should MOVE into the repo.

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
