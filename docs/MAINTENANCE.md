# Maintenance

Internal quality: docs, comments, test meaning, refactors, dead code, CI hygiene.
Real work. **Not shipping work.**
The classification test is in `docs/QUEUE.md`. **When a tier is genuinely ambiguous, it is C and it lands here.**
⚠️ **Line numbers in this file go stale with every batch. Re-grep by NAME, never by the number.**

## How it gets worked: C items RIDE the batch that already touches the file (Max, 22 Aug 2026)

When a batch opens a file, it takes the entries here that touch that file, in the same PR.
This replaced a parallel maintenance track in its own worktree, which Max retired on measured evidence: seventeen batches, one maintenance commit, and that one a recording rather than a fix (`docs/audits/BLIND-AUDIT-2026-08-22-process.md` §4.2).
**Two accepted consequences:** an entry in a file nothing is touching waits, possibly a long time; and if `docs/QUEUE.md` and the backlog behind it ever run dry, a maintenance sweep runs as its own ordinary batch.

## What this file is, and what enforces it (batch 284, queue item 100)

**A WORKING LIST, like `docs/QUEUE.md` - not a record.** Git and `docs/handovers/` are the record.
It had grown to 1,616 lines with no cap and no entry test, and three audits running found entries that still read as outstanding after their subject had been fixed or deleted.
Its own words, written about `docs/PHONE.md`, were the diagnosis: *"any file a process APPENDS to needs a stated cap and a stated test for entry, or it converts work into the appearance of work."*
**`tools/maintenance-check.js` enforces all of the following, and `tests/maintenance-file.test.js` runs it inside `npm test`:**

- **A finished entry is DELETED, never struck.** A heading with `~~`, ✅ or an uppercase status word (DONE, SHIPPED, MOOT …) is red. Say in the handover which entry you took.
- **Every entry is a `###` heading under a `##` group, and its first line is an `Anchor:`** - the literal the entry is about and the tracked file or directory it lives in:
  - `` Anchor: `renderPlate` in `js/app.js` `` - red the day that literal leaves that file. An entry about code that no longer exists is stale by construction, and now it says so.
  - `` Anchor: absent `signInWithOAuth` in `js/app.js` `` - for an entry about something UNBUILT: red the day it is built.
  - `Anchor: none - <reason>` - for an entry with no literal to point at, such as production data. Capped, because a file where entries opt out has no detector.
- **The entry test:** a C finding that can name its anchor. **One that cannot is usually not a C item** - it is writing about the process, which `skills/batch` says to fix once in the rule and stop writing about.
- **The cap is `ENTRY_CAP` in `tools/maintenance-check.js`.** Adding an entry past it means deleting the one you would least miss, and naming it in the handover. Raising the number is allowed and is a visible edit with a reason; that is the point of it living in code.
- **A group may carry at most six lines before its first entry**, so a finding cannot sit in group prose and escape the anchor check.

⚠️ **What the anchor CANNOT see: a defect fixed IN PLACE.** `doDeleteMenu`'s entry read as open for ~24 batches after batch 254 fixed it, and the function still exists, so an anchor on it stays green. That case is still caught only by the batch that fixes the thing deleting the entry. **Grep this file for the function you are changing before you push.**
⚠️ **When an anchor goes red, the entry is the question, not the anchor.** If the subject moved, re-anchor it. If it is gone, delete the entry. Changing the literal until it goes green is the one wrong answer.

<!-- entries: everything below this line is an entry, and tools/maintenance-check.js reads it -->

## C — from batches 277-283

### An external `renderPlate()` lands under the caret: the builder's misc input loses focus and its in-progress edit
Anchor: `function renderPlate` in `js/app.js`
(Found by 277's pre-push review, which caught the batch's own test comment claiming the case was proved safe. Measured, not reasoned.)

`#lines` is rebuilt with `innerHTML` by `renderPlate`, so every row in it is a fresh DOM node afterwards.
Typing in a misc-cost field does NOT trigger that — `setMiscCost` calls `updateTotals`, which calls `renderBuilderCost` and never `renderPlate` — and that is the path `tests/visual/277-edit-modal-figures.spec.js` pins.
**What is not pinned is every OTHER caller.** `renderPlate` is called from `bootstrapSync` (`js/app.js:1832`), and `.claude/rules/app-guards.md` records that `bootstrapSync` is re-run by the `online` listener whenever a connection returns — which on a café's mobile data is exactly when it will happen.
**Measured with the field focused mid-edit and `renderPlate()` called directly:** the input node is replaced (`sameNode:false`), `document.activeElement` moves off it, and the field re-renders from the stored value.

**C on two grounds, and both could change.** Nothing is written — the store already holds whatever `setMiscCost` last parsed, so the user loses an in-progress keystroke and not a saved figure. And it needs a reconnect to land inside the seconds a field is focused.
**It becomes B if the rebuild ever starts happening on a timer**, or if any other field inside `#lines` becomes something a user types into for longer than a moment.
**The fix, if it is taken, is not to stop rebuilding:** it is to preserve focus and selection across the rebuild, or to skip the rebuild while `#lines` contains `document.activeElement`. The second is smaller and is what the docket's own structure suggests.
⚠️ **This predates 277 and only the padding inside the template is new** — recorded because that batch's comment claimed the question was settled, and a comment that says "proved" about half a question is worse than no comment.

### The Plates library and the pricing screens disagree about a plate whose only line is a misc cost of exactly $0.00
Anchor: `function plateCostText` in `js/app.js`
(Same review.)

`plateCostText` (`js/app.js`, Plates library) gates on `plateFullyCosted` — `miss===0` and a line count.
`renderMenuMarginPreview`, `renderEditMargin`, `renderBuilderCost` and `vbadge` all gate on `cost>0`.
So the one shape where those disagree is a plate with lines, no missing costs, and a total of exactly zero: **Plates prints `$0.00`, every pricing surface says "not costed".**

**C: it needs a misc line typed to exactly $0.00**, which `costDetail`'s own comment calls a legitimate value rather than an error, and neither answer is a wrong PRICE — one screen declines to judge and the other states the total.
**The decision it needs is which is right**, and that is a product call rather than a bug: "a plate that costs nothing" and "a plate we cannot cost" are different sentences and the app currently says both.
Pre-existing — it arrived with `renderMenuMarginPreview`, not with 277.

### The Menu switcher row wraps to two lines between 1024 and 1059
Anchor: `menuSwitchRow` in `index.html`
(Measured by batch 278 while fixing the crushed-select regression its own review found. Accepted rather than fixed.)

Queue item 54 (U32) rehomed `#menuAddDishBtn` into `#menuSwitchRow` at every width, so that row carries three flex children above 768 where it used to carry two.
**Measured at 1024, 1060, 1100, 1150, 1200 and 1280: the row is 80px tall at 1024 and 56px at every width from 1060 up.** 1024 is exactly where the pill switcher replaces the `<select>`, and the three children are at their limit there.

**C, and the reason is that nothing is lost.** The row WRAPS — it does not clip, crush or overflow (`scrollWidth - clientWidth` is 0 at every width measured). A wrapped switcher row is what the phone has always shown, so the shape is already in the app's vocabulary; what changes is that one desktop width sees it too.
**The fix, if it is wanted, re-opens a shared contract.** `.plib-search` is pinned at 320-400 by §26 and that sizing is used by Ingredients, Products and Plates as well as Menu; letting it shrink here means re-measuring a hand-tuned row on four screens. That is why it was not taken inside an item about a picker.
⚠️ **The related defect WAS fixed and must not be re-opened by any attempt at this one:** `.mnu-selwrap{min-width:150px}` at >=768, which stops the select being squeezed to 48px across 768-1023. The comment at that rule carries the before-and-after measurements.

### Six remembered packs are keyed to a supplier called `Document No:`
Anchor: none - production data in the café's database, Max's to delete; no repo literal changes when it is done
(Moved here from `docs/PHONE.md` by AUDIT-v227, 16 Sep 2026. It had sat on the phone list since v107 and waited six weeks under a heading that said outright it was not a phone check.)

A parser bug fixed long ago left them behind; they have been there since **3 August 2026** and were still six when production was measured on **10 Sep 2026**. They match nothing and cost nothing — they are just wrong.
**Settings → Remembered packs → remove each row showing `Document No:`.** Two minutes, on a desktop, whenever. ⚠️ **The seventh row (`The Fruit Wagon` / avocado tray) is GENUINE — leave it.**

**Why it moved rather than being done:** it is data in the café's production database, and `CLAUDE.md` makes anything that deletes or rewrites production data Max's to authorise. A batch can neither do it nor stop recording it, which is exactly what `docs/MAINTENANCE.md` is for.
⚠️ **And the reason it is worth writing down twice:** `docs/PHONE.md`'s own retrospective calls this *"the clearest single example of why that list stopped working: it was never a phone check at all"* — and then kept it for another six weeks, under a heading admitting it. **A file that names its own defect in the entry that demonstrates it has a reader problem, not a writer problem.**

### A FOURTH register of food-cost % exists — whole numbers inside generated insight prose
Anchor: `Math.round(d.fromPct)` in `js/app.js`
(Found 23 Sep 2026, batch 283, while running QUEUE item 99. **Deliberately left alone, and this entry is the reason** — a decision not to change something is invisible unless it is written down.)

Item 99 aligned the per-dish food-cost % to one decimal across its six surfaces. **`insDrift` (`js/app.js`, `Math.round(d.fromPct)` / `Math.round(d.toPct)`) and `insVolatility` (`Math.round(d.costMin/d.menuPrice*100)` and its `costMax` twin) print the SAME quantity at whole numbers**, in sentences like *"at today's price that lifts it from 32% to 34%"*.

**Why it was not folded in, and neither reason is "it was out of scope":**
- **These are the `facts:` object the money/number law validates against.** `api/insight` rejects a phrasing containing a number not in the supplied facts, so changing their precision changes the contract at both ends, not just a display. That is a bigger change than item 99 was, and it belongs to whoever next opens `computeInsights`.
- **A figure in a prose sentence is a different register from a figure in a data cell.** "32% to 34%" reads correctly; "32.4% to 34.1%" in the same sentence reads like a spreadsheet. The argument that decided item 99 — that a whole number cannot be read against a one-decimal target — **does not apply here**, because these sentences state a MOVEMENT between two of their own numbers rather than a position against the target.

**So the honest statement is that this is probably right as it stands**, and it is recorded because the next reader comparing `foodCostPct` against these will otherwise find an inconsistency with no note and "fix" it. **If it is ever changed, the AI fact contract moves with it.**
⚠️ **`insCategory`'s `Math.round(by[s].sum/by[s].n*100)` is NOT this** — it is a mean of per-plate ratios, the `avgFoodCostForScope` family, and item 99's own warning forbids aligning that with the per-dish ratio.

## Displaced B items — promote when a `QUEUE.md` slot frees

These passed the launch test and lost on priority against the 20-item cap. They are not C, and this section holds TWO kinds of thing (batch 227, AUDIT-v186 S5):
- **DEFECTS that lost on priority** promote on a free slot, automatically - `/batch` step 1 checks this section every batch, because *"remember to check"* was never a mechanism.
- **FEATURES that were specced and DECLINED** - every `behaviour spec, §11.5` entry and the mock rows that did not ship - do **NOT** promote on a free slot. A slot is not an approval: Max never queued these, and one (invoice photography) reopens `CLAUDE.md`'s privacy gate.
**What the second kind needs is his priority call, put to him as a feature backlog.** Every entry below is the second kind.

### Retry on a failed write needs a write queue first, and that is the feature
Anchor: `It has NOT been saved` in `js/app.js`
Found by the v144 batch, which refused to ship the mock's Retry button rather than ship a dead one.
§5's error banner carries a **Retry**. On a failed WRITE there is nothing to retry: `pushWrite` does not keep the builder after it fails, and `CLAUDE.md` records the absence as a known gap. A button would either need a queue or would reload and lose the edit anyway. The one path where Retry is honest is a failed BOOT, and `#bootGate` already owns that.
Requirements: this is the WRITE QUEUE item, and Retry is its UI. Trigger: a write that fails while the app is open. Data: the pending builders are **closures**, so the queue must be built from serialisable intent — that is the design problem. State: a queued write must be visible, re-orderable against later edits of the same row, and must not resurrect a delete that succeeded. Error: a retry that fails again must not loop.
⚠️ If this ships, `css/style.css`'s `.sync-banner{pointer-events:none}` comes out in the same change and the placement is re-measured — the comment at the site says so.
Note the standing rule this does NOT change: offline already toasts *"you're offline. It has NOT been saved."* The user is told today; what they cannot do is act on it.

### "Synced N min ago" — the §3.1 quiet channel needs a last-sync timestamp
Anchor: absent `Synced ` in `js/app.js`
Found by the v144 batch, which decided the sync treatment and could not build this half of it.
§3.1's header carries a quiet **"Synced 4 min ago"** at 12px `--text-3`. The app has no last-sync concept: `setSync('ok')` shows "Saved" for 1400ms and hides, so there is nothing to render a relative time FROM.
Trigger: a successful boot load, and every successful `pushWrite`. Data: one timestamp, in memory — a derived cache of "when did the server last answer", so not a third localStorage category and not Supabase either. State: a relative time that must re-render as it ages — a ticking element in every screen header, which is the real cost.
⚠️ **Placement is the unsolved half, not the timestamp.** The mock puts it in the §2 header bar between the title spacer and the actions. This app's `.scr-head` is PER-SCREEN markup, five copies, and the sync element is deliberately ONE element — so either it becomes five (which the sync item's "never per screen" rule forbids) or a single fixed element is aligned into the header band, which v141 measured as unworkable there. Solve that before writing code.

### Recent range on the builder's cost card — the queue item's stated data source DOES NOT EXIST
Anchor: absent `Recent range` in `js/app.js`
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
Anchor: absent `metaKey` in `js/app.js`
Trigger: ⌘K and the sidebar button. Data: the live in-memory arrays (plates, menus, ingredients) + static actions (upload invoice, new plate); no new storage. State: selecting navigates to the screen or opens the action's modal; Esc closes; focus returns to the opener. Error: an honest zero-results row.
**The chord binds only once the palette exists — never a dead chord.** F1b put the 22px theme toggle in the mock's ⌘K slot, so nothing is dead today.

### Invoice import history — behaviour spec, §11.5 (the Invoices screen's recents; R4)
Anchor: `last_invoice_import` in `js/app.js`
Trigger: apply time. Data: date, supplier, item count, change count, status — a Supabase table with migration + RLS like the others, plus a retention decision. **This is DATA, so never localStorage** (Tier 2: there is no third category). State: one row per import; "Failed, retry" rows need a decision on whether pre-store failures are recordable at all. Error: a write failure surfaces via `pushWrite`'s toast, and the import itself must not be blocked by history bookkeeping.
F8 (v147) shipped the Invoices screen **without** the mock's recent-imports table and stated the absence in one sentence on the screen, so this is what would replace that sentence. The only import fact the app stores today is `cafeDB_lastImport` / `app_settings.last_invoice_import` — one date — and it is printed there.

### Photographing an invoice — behaviour spec, and the queue item that specified it was wrong about the code
Anchor: absent `capture=` in `index.html`
F8 (v147) was told to ship the mock's mobile "Take a photo" with `capture` on the file input "feeding the EXISTING parse path; no new parsing". **The code says otherwise and the code wins:** `handleInvFile` branches on `.pdf`, and everything else goes to `FileReader.readAsText` — a JPG or HEIC arrives as binary noise in the paste box and `parseInvoiceCSV` finds nothing. `api/parse-invoice` receives TEXT the client already extracted, so it does not close the gap either. §R4 forbids shipping a control that does nothing, so the button was not built.
Requirements, if this is ever wanted: Trigger: a camera button on the upload sheet. Data: an image has no text layer, so this needs OCR or a vision model call — **a genuinely new capability, not a wiring change.** State: the same three steps; the scanning step is where the extra latency lands, and it is much larger than a PDF's. Error: an unreadable photo must say so as specifically as the image-only-PDF path does.
⚠️ **A vision call reopens the privacy gate** — `CLAUDE.md`'s standing precondition binds any endpoint shipping user data to a third-party model, and an invoice photo is strictly more than the text the app sends today.

### CSV export (Settings → Data) — behaviour spec, §11.5
Anchor: absent `text/csv` in `js/app.js`
Trigger: the Data-section button. Data: which objects and columns, to decide. State: a download; nothing else changes.
**CSV is an export for humans and NEVER an import path** — the JSON backup stays the restore format and the backup-format law is untouched.

## C — tests and CI

### The specs register a service worker they never test, and that is what crashes the browser
Anchor: absent `sw.js` in `tests/visual/_boot.js`
Proved 10 Aug 2026, not guessed. `js/app.js` registers `sw.js` on window load, so **every** Playwright spec registers a service worker, and the crash is the context teardown racing that registration: **9 crashes in 360 tight cycles against 0 in 360** padded ones, across two Chromium builds (1228: 6 of 210 · 1234: 3 of 150). The bump to 1234 did not help. Retries hide it competently, so this is not urgent — but it is a known mechanism now, and the trigger is a thing the specs do not test.
Requirements: stop the harness registering a service worker at all. `tests/visual/_boot.js` already installs a fake `window.supabase` and aborts off-origin requests before the app runs, so it is the one place — abort `**/sw.js`, or stub `navigator.serviceWorker` before `app.js` runs. Then re-run the tight probe (the two spec files are in the history of PR #147 and are the acceptance test: **done when 150+ tight cycles crash zero times**).
⚠️ **Do not measure this with a green suite** — that is the mistake the previous item's own probes would have made. Use the reproducer.
⚠️ It changes what the specs exercise, and that must be a decision rather than a side effect: no spec asserts anything about the service worker today, but the boot path they drive would no longer include registration. If that is wanted somewhere it wants ONE spec that tests it deliberately, not 209 that do it by accident.

### Bring `saveCurrentPlate` under the mutation gate
Anchor: absent `fn: 'saveCurrentPlate'` in `tests/mutation/targets.js`

**Measured 29 Aug 2026, batch 221 (queue item 8), which added it as a target, read the result and took it back out.**
`saveCurrentPlate` is **not** a mutation target, and it is *"THE ONE PLACE A PLATE'S RECIPE CHANGES"* by its own comment - a line added, removed, re-portioned or re-pointed, a rename, a recategorisation, all of it arrives there and nowhere else.

**The numbers, so nobody has to re-derive them:** listed against `plate-draft-save.test.js` + `change-log.test.js` it leaves **17 survivors**; widening to six files (adding `plate-draft.test.js`, `builder-page.test.js`, `builder-nomatch.test.js`, `plates-independence.test.js`) leaves **12**. They cluster on the name/quantity validation, the `asNew || !loadedPlateId` branch, and the change-log "before" figures - none of which any current test can distinguish from broken.

**Why it was taken back out rather than shipped with allowances:** they are genuine coverage gaps, not equivalent mutants, so the honest close is twelve assertions and that is a batch, not a ride-along on an item about one line. This is the `gemApplyReadings` precedent exactly - filed here, promoted to `docs/QUEUE.md` when someone picks it up, shipped as its own batch (206).
⚠️ **Do NOT add the target without doing the work.** A target with twelve written allowances is worse than no target: it reads as covered.

**What 221 DID pin, so this entry is not mistaken for total silence:** `tests/plate-draft-save.test.js` executes the real function and pins the draft-versus-write contract, proved by reverting the fix and watching three of its five tests go red.

### Audit the older Playwright specs for MEANING, not for green
Anchor: `window.addProduct(` in `tests/visual/fresh-states.spec.js`
Measured 7 Aug 2026: `screenshots.spec.js` carries **2 assertions for the whole file** (a capture harness wearing a spec's clothes), while `fresh-states.spec.js` carries 117 but builds its fixtures by calling `window.addProduct(...)` at **five sites** — a function dead in the app and kept only because these specs are its last handle.
A spec that sets up through a door no user has cannot fail for a reason a user would hit.
Requirements: each spec either asserts something a user would notice, or is retired on purpose and said so.
Note Playwright is not in `npm test`, so nothing here fails loudly. That is the reason to look, not a reason to defer.
⚠️ **`addProduct` is a Tier 1 trap kept alive ONLY by `fresh-states.spec.js`, and the trap says deleting it fails SILENTLY.** If this item retires that spec, `addProduct` becomes dead in the same commit and nothing will notice. Close the trap in the same branch, or keep the spec for that reason and write it down.

### `tests/review-gate.test.js` writes its scratch file INTO `docs/reviews/`, and a concurrent `git add -A` commits it
Anchor: `REVIEW-000-uncommitted-probe` in `tests/review-gate.test.js`
Hit in batch 273, which committed `docs/reviews/REVIEW-000-uncommitted-probe.md` by running `git add -A` while `npm test` was still going.
**The consequence is not a lost file, it is a self-test that goes red PERMANENTLY and correctly:** the probe exists to prove `gather()` reads the committed tree rather than the working directory, so once the probe is IN the committed tree, `gather()` seeing it is the right answer and the assertion is right to fail. The test cannot distinguish "the gate is broken" from "somebody committed my scratch file", and its failure message says the first.
Requirements: write the probe somewhere a repo operation cannot sweep up. The obstacle is real rather than incidental - `gather()` runs `git ls-tree HEAD docs/reviews/` against the repo root, so the file has to be inside this repo to be a valid negative case. The honest options are a scratch clone, or a probe name added to `.gitignore` so `git add -A` cannot see it (which is one line and keeps the test where it is).
⚠️ **The same shape is worth looking for in every test that writes into the working tree**, and `.claude/rules/tests.md` already carries its sibling: *back a file up by COPYING it, never with `git checkout --`*. Both are about a test and a VCS operation reaching for the same file with no interlock. The mutation gate got this right by working in `$TMPDIR/ezplate-mutation/<name>-<pid>/`, which is the pattern to copy.
**And the operational half, which cost the time:** do not run `git add -A` while a suite is running. The mutation gate's own rule says not to EDIT app files during a run because it confounds the results; this is the same rule pointed at the index instead.

### `v190-sticky-header.spec.js` is red on macOS and green in CI, so local Playwright red is being trained into noise
Anchor: `page-side rule sits at` in `tests/visual/v190-sticky-header.spec.js`
Found by batch 273, which ran the full suite before pushing and had to spend a cycle proving the two failures were not its own.
**Measured, three runs on the same unchanged branch plus one on stashed `main`:** R21 (`:49`) fails **every time** on macOS with *"page-side rule sits at --header-h: Expected 80, Received 88"* — an 8px disagreement — while R22 (`:83`) and R22-mobile (`:130`) come and go, giving 1, 2 and 3 failures across four runs of the same code. **CI's `browser specs (Playwright)` job was green on `main` for batch 272**, so none of this is a defect in the app and none of it is a defect on `main`.
**The class is `.claude/rules/tests.md`'s viewport-geometry rule and roster entry 270 in one:** an assertion whose reference is the ENVIRONMENT rather than the app, plus a control satisfied by the platform. The known instance is overlay scrollbars — the Linux runner measures 370 inside a 380 viewport and 759 inside 768 while macOS makes the three agree — and 80-vs-88 on a header hairline is the same shape at a different measurement, not necessarily the same cause.
Requirements: find what the 8px is (probe the fixed containing block per the rule rather than reasoning about it), then either make the assertion measure its own reference or state in the spec's header which platform it is valid on. The flaky pair needs its own look; a spec that returns three different answers to the same code is not a slower green.
⚠️ **The cost is not the eight pixels, it is that `npx playwright test` is the thing `CLAUDE.md` tells every batch to run before pushing when a control's existence changes.** A file that is reliably red locally and green in CI teaches the next batch to skim past red — which is the same harm as a green test that cannot fail, arriving from the other direction.

### `_boot.js`'s empty-table list is a list of things NO browser spec can see
Anchor: `emptyOk` in `tests/visual/_boot.js`
Found twice in three batches, and the second time it blocked verifying a change that had just been made.
`tests/visual/_boot.js` serves a handful of Supabase tables from localStorage and answers `{data:[]}` for everything in `emptyOk`. Two of those turned out to be the ONLY feeder for a visible feature:
- **`ing_price_history`** (fixed in F6/`v143`) feeds the What-moved panel and the "Biggest movers" row.
- **`menu_change_log`** (fixed in `v145`) feeds the trend chart's intervention markers and the dashboard's since-line.
Requirements: read the rest of `emptyOk` as a list of app features no browser spec can exercise, and for each either serve it from localStorage in the shape its row-mapper expects (the pattern is established three times now) or record at the site that nothing renders from it.
Note the cost is asymmetric, which is the argument for one pass: serving a table is a few lines, while discovering the gap costs a batch its verification step at the moment it needs one.
⚠️ **A FOURTH INSTANCE, FIXED IN PASSING BY BATCH 239, AND IT WAS NOT IN `emptyOk` AT ALL** — which widens this entry rather than shrinking it. `kitchen_ingredients` is an `app_settings` ROW, so it fell outside the list this entry is about, and `settingRows()` served only `food_cost_target`: every kitchen ingredient, every kid plate line and the whole Ingredients screen were therefore unreachable in a browser. `v136-theme.spec.js` states that limit in its own header and attributes it to the table being answered with an error, which was the wrong diagnosis of a real gap. `_boot.js` now serves it from `cafeDB_king`. **So the list to read is not `emptyOk`, it is "everything the app reads at boot that this shim does not serve"**, and the settings rows are a second such list.

### `layout-consistency.spec.js` never measures the list BODY
Anchor: `panelLeft` in `tests/visual/layout-consistency.spec.js`
Its comment claims it asserts "the shared left edge", but it stops at the actions row (`panelLeft`/`titleTextLeft`/`btnLeft`), so the v123 Plates surface sitting 4px proud at ≥1024 would have shipped silently; the review caught it, not the spec.
Extend it to measure each tab's list-body left edge at both sizes. Found by the v123 pre-push review, 9 Aug 2026.
(Also pre-existing and shared: at 561-1023px both Products and Plates sit 4px inside the h2 edge — decide once whether that is the design.)

### `updateLastImport` writes to three ids and only two exist, and the test pins the LIST rather than the elements
Anchor: `'lastImport','lastImport2','lastImport3'` in `js/app.js`
**[C — nothing is broken today; the loop guards with `if(el)` and both live elements render.]**
Found by batch 270 while driving the Invoices date in a real browser, not by reading. `updateLastImport` loops `['lastImport','lastImport2','lastImport3']`; `index.html` has **`lastImport2` and `lastImport3` only** — the bare `lastImport` has not existed since **v140** (`d833742`, F4, the Products rebuild), so a dead id has been carried for over seventy deploy versions.
⚠️ **The interesting half is the test, and it is a roster-shaped defect rather than a stray string.** `tests/inv-upload.test.js` asserts `/'lastImport','lastImport2','lastImport3'/` against the SOURCE — so it pins the literal list and can never notice that one of the three names nothing. It would stay green if all three were dead. **A test that asserts a list of ids is asserting a list of ids**; the assertion worth having is that each id in the loop resolves to an element in `index.html`, which is a derivation both ends share rather than a copy of one end.
Requirements: drop the dead id from the loop, and rewrite that assertion to derive the ids from `js/app.js` and check each against `index.html`. Do NOT simply delete the test — it is the only thing pointing at this function's sinks.
⚠️ Check `#lastImport3` before touching the loop: it is the Invoices screen's line and `css.md` records that batch 268 moved that fact between a body element and a header slot. The sinks are what this is about.

### Four test files still read `js/app.js` by hand instead of `loadApp()`
Anchor: `readFileSync(path.join(__dirname, '..', 'js', 'app.js')` in `tests/builder-nomatch.test.js`
Residue of the 48-file `extractFn` migration (10 Aug 2026), which scoped itself to the files that hand-rolled the EXTRACTOR. These four extract nothing, so they were never in the 48: `builder-nomatch.test.js`, `scroll-lock.test.js`, `terminology.test.js`, `smoke.js`.
Each is one line — `fs.readFileSync(path.join(__dirname,'..','js','app.js'),'utf8')` → `loadApp()` from `./_extractfn` — and `smoke.js` may want leaving alone, since it is not in `npm test` and runs standalone.
Note `tests/extractfn.test.js` reads the file by hand ON PURPOSE — that is how it proves `loadApp` returns the real thing — so it is not a fifth.

### All three CI jobs carry a Node 20 deprecation warning
Anchor: `actions/checkout@v4` in `.github/workflows/test.yml`
Seen 10 Aug 2026 on run `31387797521`, as a `warning` annotation on every job: *"Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/cache@v4, actions/checkout@v4, actions/setup-node@v4."*
Nothing is broken — GitHub runs them on 24 regardless — so this is a bump of three `uses:` pins, not a fix. **Worth doing for a reason specific to this repo:** a permanent warning annotation on every green run is noise on the exact channel the segfault detector now writes to, and this project's whole safety net is someone actually reading a warning on a green check.
Requirements: bump the three actions to whatever major currently targets Node 24, in one commit, and confirm the annotation is gone on the next run.
Out of scope: the `node-version: '22'` the jobs request, which is a different thing and is not deprecated.

## C — code hygiene and latent defects

### `applyInvoice` is not a mutation target, and the request for it exists only in a struck item
Anchor: `function applyInvoice` in `js/app.js`
(Routed here 10 Sep 2026 by AUDIT-v207 §2a.8, which found it homeless.)

Consolidated item 22 asked for the invoice writers to be added to `tests/mutation/targets.js`. Batch 248 declined — correctly, on the `gemApplyReadings` precedent that a target added without doing the work first produces a list of allowances reading as coverage — and routed it to *"`docs/MAINTENANCE.md`'s 'more functions on the gate' entry"*. **That entry names `saveCurrentPlate` and a magnitude check and does not mention it**, and `tests/mutation/targets.js`'s `pending` list is empty. So the request survived only in a struck item and a write-once handover, which is where things go to be forgotten.

**What it needs is the `pending` mechanism this file already documents**: measure the survivor count first, write it into `pending` with the batch that measured it, promote when the coverage lands. `applyInvoice` is very large, so expect a lot; that is the reason to measure before listing, not a reason to skip it.
⚠️ **Do it with item 90's invoice work, not before.** 90 changes what that function does at the end (a completion message gated on a saved manifest), so measuring survivors now would measure a function about to move.

### Six products no INGREDIENT uses, and thirteen plate lines that still cost off them
Anchor: `Link older plate lines` in `index.html`
(Routed here 10 Sep 2026 by AUDIT-v207 §5, which found it in a handover Probe and nowhere else. **Rewritten the same day after the pre-push review caught the first version stating the opposite of the truth** — see the warning below, which is the more useful half of this entry.)

**Measured on production 10 Sep 2026:** all six products are in the catalogue, **no kitchen ingredient points at any of them**, and **thirteen plate lines across nine real plates still cost off them directly**:

| product | live bare-pid lines | plates |
|---|---|---|
| `P0004` Bacon Middle Rindless Gas Flushed (Qld) | 3 | 3 |
| `CXmr8nx4z80` Eggs - Ctn 600g | 3 | 3 |
| `P0214` Maple Syrup Flavoured | 3 | 3 |
| `P0073` Cheese Fetta Danish | 2 | 2 |
| `P0181` Ham Leg Sliced | 1 | 1 |
| `P0184` Hash Browns Triangles Chunky | 1 | 1 |

**Batch 249 shipped the picker that ASKS which ingredient each was meant to be — it does not apply anything on its own**, and the choice is Max's, one per product, in Settings → "Link older plate lines". Until he makes it, these are exactly the thirteen lines item 88 measured, unchanged.

⚠️ **DO NOT DELETE THESE PRODUCTS.** Nine real plates — Bacon Bene, Ham Bene, Scoopy's Breakfast, Bacon & Egg Roll, three Pancakes variants, the Staff Meal and Feta Spinach & Mushroom Bene — would each silently lose a costed line. `productRefs` refuses such a delete from the APP, and it is client-side: it says nothing about a SQL statement.
**Whether they should go at all is a question for AFTER the picker has been used**, not before, and it is Max's either way.

⚠️ **THE FIRST VERSION OF THIS ENTRY SAID THE OPPOSITE, AND HOW IT GOT THERE IS WORTH MORE THAN THE ENTRY.** It stated that "after 249 no plate line" references them — sourced from `HANDOVER-249`'s Probe line, *"the six products themselves are still in the catalogue with nothing using them"*, which meant **no INGREDIENT uses them** and was true. Carried forward one step, "nothing uses them" became "nothing references them", and a true sentence about ingredients turned into a false one about plate lines that would have justified deleting six products nine plates depend on.
**That is a measurement quoted one step too far — the same shape this batch corrected in the ZZ-AUDIT bullet, committed in the same diff, by the same author, in the batch whose entire subject was re-measuring stale claims.** Caught by the pre-push review, which queried production rather than reading the handover. **The rule it argues for is not new and is why this entry now leads with a table: if you are writing a fact about production into a file, measure it — especially when you are copying it from somewhere that measured something adjacent.**

### A refused optimistic edit is left in memory, so the next successful edit's history point includes it
Anchor: `function logHistory` in `js/app.js`
(Raised 9 Sep 2026 by batch 247's pre-push review, which stated it at medium confidence and was right to.)

247 made `logHistory` wait for the write that justifies its point. **The gate proves that write landed; it does not prove the STATE the point is computed from landed**, because `computeAvgFoodCost` reads live memory and this app does not roll back an optimistic edit outside the plate and menu delete paths.

**The sequence:** edit A mutates memory and calls `logHistory(writeA)`; edit B mutates memory further and calls `logHistory(writeB)`; B's write is refused, so B correctly logs nothing — **and leaves its un-landed change sitting in memory**; A's write then succeeds and its point is computed off the combined state, including B's. The point is real about A and wrong about the total.

**It is C on three measured grounds and each could change.** The window is one round trip. `pushWrite` toasts B's failure, so the user is told. And the next boot replaces memory with the server's snapshot, so the wrongness does not persist in the app — only in the `price_history` row, which is the part that matters and is why this is written down at all.
**The real fix is not a harder gate — it is rolling back a refused edit**, which is what the plate and menu delete paths already do (`rollbackPlateDelete`, `submitNewMenu`'s filter) and what every other optimistic path does not. That is a bigger change than 247 and it is the honest shape of this entry: **do not "fix" this by gating `logHistory` more tightly; there is nothing tighter to gate on.**
⚠️ **Related and NOT the same:** `docs/QUEUE.md` item 90 is about announcing success before a write settles. This is about the state a correctly-gated success is computed from. A batch that takes 90 should read this entry and decide whether the rollback belongs with it.

### The `type="number"` inputs nothing has asked a question of
Anchor: `type="number"` in `js/app.js`
(Raised 9 Sep 2026 by batch 245, which fixed the one that was measured and counted the surface rather than guessing at it.)

QUEUE item 19 was a misc-cost field carrying `min="0"` while `setMiscCost` had no sign guard, so a typed `-2` reached the plate and saved. **The attribute is not a guard for any field this app reads on `oninput`/`change` rather than through native form submission**, and the browser agrees: `validity.rangeUnderflow` was TRUE on that keystroke and nothing asked.

**Measured, 9 Sep 2026:** `index.html` and `js/app.js` carry **15** `type="number"` inputs between them; **14 declare `min="0"`** and one declares `min="1" max="99"`. **Four are known to be guarded** — `setQty` clamps, `commitPrice` refuses `v<0`, the food-cost target's handler re-checks `v>=1&&v<=99`, and `setMiscCost` now clamps. **The other eleven have not been looked at.** The list deliberately is not written out here: `grep -n 'type="number"' index.html js/app.js` is the live one, and a copy in this file would rot the way every enumeration in this project has — including the two numbers in this paragraph, which are a record of one measurement on one day and not a live count.

**It is C because it is UNMEASURED, not because it is small.** Three of the eleven are on the invoice review (`invPrice`, `invPackQty`, and the price cell at the row level), where a negative would be a wrong unit cost rather than a cosmetic slip — the same grade as the item that produced this entry. **Step one is the repro, one field at a time, and any that reproduces is a B and belongs in `docs/QUEUE.md`, not here.** Do not "fix" the eleven on sight: `costDetail` already refuses a negative line by either route since 245, so several of these may be harmless in a way that a blanket clamp would hide rather than prove.
⚠️ **And the invoice ones sit next to the protected parser region and next to consolidated items 17 and 26** (negative and $0.00 invoice lines), which are deciding what a negative line MEANS. Whatever they decide is the answer for those fields; do not settle it here first.

### The Chromium segfault has an EIGHTH occurrence — batch 278, `238-confirm-link.spec.js:79`
Anchor: `238-confirm-link` in `tests/visual`
(16 Sep 2026. Recorded because the entry below asks for it, and it is the second on Playwright 1.62.1.)

PR #307's `browser specs (Playwright)` job went red, and **not on an assertion**: it failed its own *"Did any spec pass only on a retry?"* gate, and the crash detector named `238-confirm-link.spec.js:79`.
The job's own annotation is the diagnosis — *"a segfault cannot be caused by the code under test"* — and that spec is about a confirmation link, with nothing to do with 278's diff (a picker's sort order and a button's parent element).
**The same commit's full Playwright run passed locally: 554 passed, 14 skipped, exit 0.**

**What this adds to the entry below.** That one recorded the SEVENTH occurrence as *"the first on 1.62.1, so the bump from 1.61.1 did NOT fix it."* This is the second on 1.62.1, which is the beginning of a rate rather than a one-off on the new pin.
**The count to watch is occurrences per Playwright version, not occurrences.** Two on 1.62.1 is not yet worth a version change, and the newest release is not automatically the safe one.
⚠️ **AND THE VERSION IS NOT PINNED WHERE BOTH OF THESE ENTRIES SAID IT WAS** (AUDIT-v227). `grep -ci playwright tests/third-party-pins.test.js` returns **0** - that file scopes itself to the two scripts that SHIP TO PRODUCTION, pdf.js and supabase-js, and says so in its own header. Playwright is a devDependency at **`^1.62.1` in `package.json` - a caret, not an exact pin** - held still only by `package-lock.json`. A batch following this entry would have opened a file with nothing to tell it. Read `package.json` and the lockfile.
The spec that ran immediately before was not captured this time; the next batch to hit one should take it from the report artifact, which the job uploads.

### The Chromium segfault has a SEVENTH occurrence, and HANDOVER-163's fingerprint method needs one correction
Anchor: `v141-sync-corner` in `tests/visual`
(Recorded 15 Sep 2026, batch 272, from PR #301's `browser specs (Playwright)` failure. The job's own crash detector named it; the arithmetic below was done afterwards rather than taken on trust.)

`v141-sync-corner.spec.js:252` died again in CI, and the job failed on its "passed only on a retry" rule, which is the intended behaviour rather than noise.

⚠️ **THE OFFSET TEST HANDOVER-163 ESTABLISHED DOES NOT SURVIVE A VERSION BUMP, AND READING IT LITERALLY SAYS THIS IS A DIFFERENT BUG.** That handover pinned six occurrences at **binary offset `0x2af9eec`**, computed to survive ASLR, in `chrome-headless-shell-1228` under Playwright **1.61.1**. This one computes to **`0x2e283cc`** - in `chrome-headless-shell-**1234**` under Playwright **1.62.1**. **A different binary puts the same source-level bug at a different offset**, so the offsets cannot be compared across builds and a mismatch is not evidence of a second bug.

**What DOES match, and is the fingerprint to use from now on:**
- `Received signal 11 SEGV_MAPERR` at fault address **`0000000001b0`**, with `cr2: 0x1b0` - a null dereference at a fixed member offset;
- **`ax: 0`** - the null pointer itself;
- **`cx: 74736f686c61636f`**, which is the ASCII **`ocalhost`** little-endian, the same register holding the same string fragment;
- the same spec, `v141-sync-corner.spec.js`.

**So the rule is: compare the FAULT ADDRESS and the register signature, not the binary offset.** Compute the offset only to tell two crashes apart *within one build*. `docs/handovers/HANDOVER-163-browser-segv.md` is write-once and stays as it is; this entry is the correction, and the next batch to hit a segfault should read both.

**Not queued, and the reason is the cost rather than the count.** `--retries=1` already absorbs it, the required checks (`unit tests`, `smoke`, `what changed`) are unaffected, and no client code is involved. What it costs is one CI job per occurrence and a batch's attention. **If it becomes frequent enough to matter, the variable is the Playwright version in `package.json` (`^1.62.1`, a caret) and the lockfile that holds it still** - ~~`tests/third-party-pins.test.js` is the authority on which one is safe~~ **(corrected by AUDIT-v227: that file covers only the two production scripts and has zero Playwright hits)** - note that this occurrence is the first on 1.62.1, so the bump from 1.61.1 did NOT fix it.

### Nothing records that a user accepted the privacy notice
Anchor: absent `privacy_accepted` in `js/app.js`
(Found 27 Aug 2026 by batch 208's pre-push review, which read the notice's own promise and went looking for the mechanism behind it.)

The sign-up tick gates the form and is never written anywhere. There is no `app_settings` key, no column and no version string, so **nothing knows who accepted which version of the notice** — and the notice's first draft promised *"you will be asked to read it again"* when it changes, which nothing could have honoured. That sentence now says only what is true; this entry is the other half.

**It is C rather than higher because the disclosure itself is complete without it.** The item's four requirements are about the notice being SHOWN before the data moves, and it is — at sign-up, at both import dropzones and on the Settings control. A record is about proving consent after the fact, which is a different question and one nobody has asked yet.

⚠️ **It becomes B the moment item 2b ships**, and that is the thing to notice here rather than the record itself. On the paid tier the notice's second section reverses, which is a material change in the user's favour — but a café that accepted the old wording has been told something that is no longer true, and with no record there is no way to identify them or re-ask. **Whoever takes 2b should read this entry first.**

Requirements: a `privacy_accepted` setting written through `dbSetSetting` carrying the version and an ISO date, set on the first successful boot after sign-up; a version constant beside the notice; and a re-prompt when the stored version is older than the current one. Then the notice can promise the re-prompt again.
⚠️ **`app_settings` is a JSON blob keyed by setting, so this needs no migration** — but read `CLAUDE.md`'s backup-format carve-out before adding a key, because what `bootstrapSync` puts in memory is the backup format.
⚠️ Do not record it at sign-up time. The account does not exist yet, there is no session, and there is nothing to attach it to.

### A $0.00 invoice line means two different things to two functions on the same import
Anchor: `unitPrice<0` in `js/app.js`
Anchor: `function invDerivePackQty` in `js/app.js`
(Found 26 Aug 2026 by batch 203, writing coverage for `applySupplierMemory`. **Neither behaviour is wrong on its own; they disagree, and nothing anywhere says which is intended.**)

An invoice line whose price column reads `0.00` — a sample, a freebie, a credit — reaches two functions in the same import, and they take opposite views:

- **`invDerivePackQty`** treats it as a freebie or a credit and deliberately derives **no pack size** from it. That is written down, with the reasoning, as the reason one of its mutants is NOT allowed in `tests/mutation/targets.js`: *"a $0.00 invoice line is a freebie or a credit, and it must derive no pack size rather than a pack size of zero."*
- **`applySupplierMemory`** stores the zero. Its guard is `unitPrice<0`, not `<=0`, so a remembered pack over a $0.00 line yields `unitPrice: 0`, `needManual: false` and `remembered: true` — a row that looks fully resolved and, if confirmed, writes a cost of zero onto the product.

**Why it is C rather than B:** the row is on the no-match branch, so it never auto-ticks and the user confirms it by hand; and a $0.00 cost really is the honest answer for a line that cost nothing. **Why it is worth writing down anyway:** a zero cost reads as a free ingredient everywhere downstream — every plate using it gets cheaper, the food-cost KPI moves, and nothing on any screen says a price came from a $0.00 line. That is the quiet-wrong-number shape this repo keeps finding.

The behaviour is now **pinned as behaviour** in `tests/supplier-memory.test.js` (*"a $0.00 line IS priced, at zero — the guard refuses NEGATIVE, not free"*), with the disagreement written at the test's own site so the test cannot be read as an endorsement. **The pin is deliberate and is not the answer**: it exists so the `<` / `<=` boundary cannot be changed by accident, and it must be rewritten by whoever settles the question rather than treated as a constraint.
Requirements: decide what a $0.00 line means, once, and make both functions say it. If the answer is "a free line is a real price of zero", `invDerivePackQty`'s allowance reasoning is the thing that is wrong and should be corrected. If it is "a $0.00 line is not price information", `applySupplierMemory` needs `unitPrice<=0` and the test above needs inverting.
⚠️ **Do not change one of them alone.** Two functions agreeing on the wrong answer is recoverable; two functions disagreeing about the same line is what this entry is.

### "Try again" after a PDF-reader load failure cannot work, for TWO independent reasons
Anchor: `__pdfjsPromise` in `js/app.js`
(Found 15 Aug 2026 by batch 195 while rewriting `ensurePdfjs()` for the 4.10.38 upgrade. **Pre-existing, not introduced — but 195 added the second reason, so it is written down rather than half-fixed.**)

A pdf.js load failure toasts *"Could not load the PDF reader — check your connection and try again"* and returns the user to step 1 of the import, which invites exactly the retry the wording names. Re-picking the file re-enters `handleInvFile` → `extractPdfText` → `ensurePdfjs()`, and **nothing is re-attempted**:

1. **`__pdfjsPromise` memoises the REJECTION** and is never cleared, so every later call returns the same settled failure. This has been true since v88 and is the older half.
2. **A failed module fetch is sticky in the document's MODULE MAP** (added by 195's ESM move). Per the HTML spec a failed fetch stores a null entry, and re-importing the same URL fails immediately without re-fetching — so even clearing the memo would not restore the retry.

Only a page reload actually retries. **Reason 2 is why this is filed rather than fixed**: clearing the memo is the obvious one-line "fix" and would leave the retry just as dead while *looking* repaired, which is worse than the honest current state. That is also why `ensurePdfjs()` says so at its own site.
Requirements: either make the retry real — a fresh URL on retry (a cache-busting param) so the module map has no entry, with the SRI hash re-checked against it since the bytes are identical — or change the wording so it does not promise something only a reload delivers. **Decide which; do not clear the memo alone.**

### The staging seeds' assertions assume exactly one tenant
Anchor: `select jsonb_array_length(value) into m from public.app_settings where key = 'kitchen_ingredients'` in `supabase/staging`
(Found 13 Aug 2026 while widening the two semantic keys in 183. **Not wrong today, and that is why it is C.**)
`03-seed-realistic.sql` and `04-seed-scale.sql` verify themselves with statements like
`select jsonb_array_length(value) into m from public.app_settings where key = 'kitchen_ingredients'`.
Since 183 that key is only unique per café, so with two tenants seeded the query matches **two rows** and `select … into` silently takes an arbitrary one — no error, and the assertion then checks whichever café Postgres happened to return.
It cannot bite yet, because each seed's first act is to `delete … where true` as `postgres`, which is not RLS-scoped and therefore empties every tenant. **The assumption is load-bearing and unwritten**, which is the whole finding: the day a seed stops wiping across tenants, or someone runs an assertion block on its own against a two-tenant staging, it reports success on the wrong data.
Requirements: the self-checks filter on `business_id`, or say at their own site that they are only valid immediately after the wipe. Same for the summary `select` at the bottom of each seed.

### The Invoices screen still has the boot-race priming gap that F9 fixed for Settings
Anchor: `else renderPlatesTab(); }catch(e){ console.error('[rerender]'` in `js/app.js`
Filed 11 Aug 2026 by the F9 batch. **Half of it was fixed by F10 (v149) and this is the surviving half** — the original entry also described `currentTab()`'s fallback list, which is now the shared `TAB_PANES` constant and no longer has a hole.
What remains: `rerenderCurrentTab`'s `if/else` chain names `analysis`, `ingredients`, `dashboard`, `pantry` and `settings`, returns early for `account`, and falls through to `renderPlatesTab()` for everything else — so **`invoices` gets `renderPlatesTab()`**. `restoreLastTab()` runs before `bootstrapSync()` resolves, so a refresh landing on Invoices renders `#lastImport3` against pre-boot state and never corrects it, while a hidden Plates library is repainted instead.
Latent rather than live only because Invoices has no route below 1024; **the mobile More-screen item gives it one and makes this reachable.**
Requirements: one decision for the whole chain rather than a fourth special case. A screen-to-renderer map that `showTab` and `rerenderCurrentTab` both read would end the class, exactly as `TAB_PANES` ended the four-pane-lists class. Note the fallback being `renderPlatesTab()` means a wrong screen is repainted silently, with no error, which is why nothing has ever noticed.

### The mock's Business and Notifications sections are R4 with no spec written
Anchor: absent `Intl.NumberFormat` in `js/app.js`
F9 (v148) declined to draw either, per §R4 — no business name or currency is stored anywhere, and there is no notification system, no email and no scheduler behind "price rise alerts" or "weekly summary". Both are recorded here so the absence is a decision rather than a gap somebody re-discovers against the mock.
Business name and currency are cheap and near-useless with one café; **currency is the one with teeth**, because every money display in the app hard-codes `$` and a second café outside Australia makes that wrong everywhere at once, not just in Settings. Treat it as a costing question, not a Settings row.
Notifications are a server-side feature (a scheduler, an email sender, a subscriber list) and reopen the privacy gate the moment they carry plate or supplier names off-device. **Do not build them as a UI shell.**
Related: the CSV-export behaviour spec above, which came from the same section of the same mock.

### `isBuilderDirty` compares against the raw saved lines, not what was loaded
Anchor: `function isBuilderDirty` in `js/app.js`
Found by the v118 pre-push review and **considered, not fixed** — an asymmetry rather than a reproducible bug.
`loadPlateState` silently DROPS a `pid` line whose product is gone (a `kid` line degrades to "product missing"), but `isBuilderDirty` compares `currentLinesSig()` — built from the filtered `plate` — against `sp.lines` mapped straight through `lineSig`. So a plate carrying such an orphan reads as dirty the instant it loads, re-arming the very "Unfinished plate" prompt v118 removed, for that plate only.
Believed unreachable today because `productRefs(pid)` refuses to delete a product any plate line still references — **that guard is the only thing holding it shut**, so this becomes live the moment a delete path stops checking, or a restore lands a line whose product did not come with it.
Requirements: decide whether `loadPlateState` should degrade a `pid` line the way it degrades a `kid` line, or whether `isBuilderDirty` should compare like against like.

### Menu / empty-state centring — four fixes, no root cause on record
Anchor: none - a request to read four old CSS fixes together; the four fixes are history, and `tests/empty-states.test.js` is the nearest live surface
Found by the v115 audit as **the strongest remaining candidate for an unfound root cause in this repo.** Fixed in `HANDOVER-v44`, `v49`, `v54` and `v70`, each as its own CSS correction. No handover names a shared cause and no Tier 1 entry was ever written — the signature of a symptom treated four times. `tests/empty-states.test.js` postdates all four, so it pins the current state rather than the thing that kept breaking.
Requirements: read the four fixes together, name the shared cause or state positively that there isn't one, and if there is, write the trap.

### Nothing makes "a modal opened over another must be LATER in the markup" a rule
Anchor: `function topOverlay` in `js/app.js`
Anchor: absent `is-stacked` in `css/style.css`
Found by the v137 pre-push review; its stated mechanism was wrong while the thing it pointed at is real — the case `CLAUDE.md` warns never to dismiss.
Fifteen of the eighteen `.modal-overlay` elements share `z-index:80`; only `#confirmModal` is `85`. For equal z-index the browser paints the LATER sibling on top, so a flow that opens an earlier-in-markup modal over a later one gets the new modal rendered **behind** the old — a rendering bug that would look like "the button did nothing".
`topOverlay()` is NOT the defect and must not be "fixed": it computes paint order by the browser's own two rules, so whatever it returns genuinely is on top. It simply cannot rescue a modal painted in the wrong place.
No such flow exists today — verified: every real stack either routes through `#confirmModal` (which always wins) or closes the first modal before opening the second (`setSmemOpen` runs `closeSettings(); openSmem();`, `paPublish` runs `closePlateActions(); openManageMenus(id);`). The one genuine same-z stack, Tidy lists → a tidy action, has the child later in the markup and is pinned against `elementFromPoint` in `tests/visual/v137-modal-layer.spec.js`.
Requirements: make the ordering a rule that can fail — either a test asserting every reachable modal-over-modal pair paints its child on top, or an explicit stacking scheme (an `.is-stacked` layer above 80) that removes the dependency on markup order.
Out of scope: reordering `index.html` for its own sake, and any change to `topOverlay`.

### The trend chart does not re-measure on resize
Anchor: `function trendPlotSize` in `js/app.js`
Found and created by F6 (10 Aug 2026) — the residue of that batch's own fix.
Everything inside the trend SVG is in viewBox units (`font-size:11px` on an SVG `<text>` is 11 USER UNITS, not 11 device px), so the plot's type and stroke scale with its rendered width. F6 fixed the cause by sizing the viewBox to the column at render time (`trendPlotSize`, reading `#dashBody.clientWidth`), taking the desktop chart from a 2.7× enlargement to 1:1.
**But `renderDashboard` does not run on resize.** Drag a desktop window from 1360 to 900 and the viewBox stays at the old width: the SVG rescales smoothly, so nothing breaks, but the type is off by the ratio of the two widths until the next re-render — which any scope or range change performs.
Requirements: decide between a debounced `resize` listener calling `repaintDashboardIfVisible()` only when the plot width actually changed, and leaving it as a documented limit. If a listener ships it must not fire mid-scrub (the scrub holds state on the live SVG) and must not re-render while the tab is hidden.
Out of scope: `trendPlotSize`'s ratios and clamps, pinned in `tests/trend-reframe.test.js`.
Note the intermittent-user rule cuts BOTH ways: Max on a phone never resizes, which is why this is not urgent — and is also why nothing else will ever notice it.

### Dead CSS sweep
Anchor: `.ref-pill` in `css/style.css`
Six selector families with **zero** emitting markup anywhere in `index.html` or `js/app.js`. **Re-measured 10 Aug 2026** (lines containing each selector in `css/style.css`): `.ref-pill` 6 · `.db-tools` 2 · `.ing-empty` **9** · `.an-empty` 19 · `.plate-noresult` 1 · `.king-tag` 1, whose only `js` hit is a comment saying the pill was REMOVED, not hidden.
Requirements: a rule comes out only when nothing emits its class — grep both files per selector, not per family. `.an-empty` and `.an-empty-box` are separate names sharing a prefix; do not let one grep answer for both.

### `ing_price_history` needs its unique index reconsidered
Anchor: `unique (product_id, recorded_at)` in `supabase/migrations/20260801_ing_price_history.sql`
Same-millisecond writes for one product would collide on `unique (product_id, recorded_at)`. Not reachable in practice (a human cannot re-price one product twice in a millisecond, and `applyInvoice` touches a different product each pass), but it constrains the normal price-logging path, so it needs its own brief. 0 duplicate pairs as of 4 Aug 2026, so a change would still apply cleanly.

### `ingredients.updated_at` is stale and means nothing
Anchor: `update ingredients set updated_at = now() where updated_at is null` in `supabase/staging/01-schema.sql`
It is NOT history and must never be read as such. Either make it honest or drop it — the reason it is recorded here is so nobody builds on it. (The Tier 1 trap in `CLAUDE.md` is the live protection; this item is the cleanup.)

### `avgFoodCostForScope` counts dishes whose `menuId` has no By-menu row
Anchor: `function avgFoodCostForScope` in `js/app.js`
Latent; zero such dishes on current data.

### `verdictHtml`'s "Nothing costed and priced on this menu yet" branch is unreachable for a NAMED menu
Anchor: `Nothing is costed and priced '+(onMenu?'on this menu ':'')` in `js/app.js`
Unreachable since v96 (the only reachable scopes are all-menus and menus with a costed plate). The all-menus wording of the same branch is still live, so this is a trim, not a delete.

### A plate whose NAME contains a digit fails the money-law number validator
Anchor: `function validatePhrasing` in `api/_insight.js`
e.g. "Pizza 4 Cheese" — the Gemini phrasing is dropped and the deterministic template stands. Safe degradation, never a wrong number, but those plates never get the warmer wording. Found in v90, unchanged.

### The ~390KB of self-hosted fonts re-download on every deploy
Anchor: `return c.addAll(ASSETS); }).catch(function(){})` in `sw.js`
(v132 review) `CACHE` changes per version, `activate` deletes the old cache, and `install` re-fetches every ASSET — including the eight immutable woff2 files — on the mobile connection of an intermittent user.
Consider a separate versionless font cache (fonts never change once committed) or fetch-time caching.
Also: `cache.addAll`'s `.catch(function(){})` swallows a partial install silently — `tests/settings-toggles.test.js` pins that every ASSETS path exists on disk, which covers the typo case but not a deploy-time failure.

## C — copy, comments and records

### `ingredients_pkey` is `(id)`, not `(business_id, id)`, and only a migration header says why that is safe
Anchor: `create table if not exists public.ingredients` in `supabase/staging/01-schema.sql`
Anchor: absent `01-schema.sql` in `tests/unique-ids.test.js`
Routed by AUDIT-v166 (check 3 of the three batch 193 asked for). **The recommendation is explicitly NOT to widen the key** — that is a migration on a critical table, it drags `restore_backup` in with it under 183's law, and `ingredients.id` is referenced by `plate.lines[].pid`, `kitchenIngredients[].pid` and `ing_price_history.product_id`, none of which carry a tenant. It defends against a design nobody has proposed.
**The real gap is that the protection is entirely narrative.** 193 designed around the narrow key — product ids stay random, never content-derived — and wrote the reasoning into `supabase/migrations/20260815_supplier_code.sql`. Nothing makes a future batch read that file before making an id meaningful, and a content-derived product id would collide across tenants on a key this narrow.
Requirements: two assertions in `tests/unique-ids.test.js`, beside the existing scope guard that already pins the INVERSE (that the semantic keys stay content-derived *because* they are tenant-scoped) — (a) every product-id mint in `js/app.js` goes through `uid(`, which today is `uid('CX')` and `uid('IMP')` and nothing else; (b) `supabase/staging/01-schema.sql`'s `ingredients` table still reads `id text primary key`, so the day someone widens it the guard is re-judged rather than silently satisfied. **Put the reason in the failure message and name the migration file**, so a red test hands the next batch the document instead of hoping they find it.
Note this ships no client asset but does change what runs, so it takes the mandatory review and no cache bump.

### Two importer threads 193 found, considered, and left in a write-once handover
Anchor: `function openCatImport` in `js/app.js`
Routed by AUDIT-v166 (D4). Both are **speculative** — 193's reason for not queuing them was that neither has been asked for and nobody has used the importer twice yet, which is sound. They are recorded here only because the handover is write-once and a thread that reaches neither this file nor the queue is a thread nobody will action.
- **The column mapping is not remembered between imports.** A café whose supplier exports an unrecognised format re-maps the same eight columns every month. Cheap to fix (one `app_settings` key, keyed by the header row's shape) and worth nothing until someone has done it twice.
- **Nothing anywhere shows a product's supplier code**, so a user cannot see why a re-import matched or did not match an existing product. **This is the more likely of the two to matter**: a re-import that silently matched the wrong product has no user-visible way to be diagnosed, which is the quiet-wrong-number shape this repo keeps finding.

### `cafeDB_plateDraft` has no tenant in it, so one device's unsaved plate belongs to whoever signed in last
Anchor: `const DRAFTKEY='cafeDB_plateDraft'` in `js/app.js`
Found 14 Aug 2026 by batch 186's pre-push review. The reachable half of it was fixed in that batch and this is the residue, stated so nobody re-derives it.
**The key is global.** `DRAFTKEY` is one localStorage entry holding a plate name and `{kid,qty}` lines, and `kid`s resolve against `kitchen_ingredients` rows that mean different things in different cafes. Nothing stamps it with the account or the business that authored it.
186 closed the two ways that could bite: signing in from the boot gate now ASKS about an unfinished plate and discards it on the switch, exactly as the Account card does, and `offerPlateDraftResume` returns early while the gate owns the screen so a signed-out visitor is never shown a plate by name.
**What is left is a worse outcome than necessary, not an exposure.** Asking is a blunt answer: a legitimate owner coming back to their own device is offered a choice between their work and signing in, and there is only one right answer for them (sign in, lose the plate) because a signed-out browser cannot save anything.
Requirements: stamp the draft with its author on write - the `envFence` pattern, one field - and have the switch KEEP a draft whose author matches the incoming account and ignore one that does not. An absent stamp reads as "the pre-186 era" and is kept, so no existing draft is destroyed by the upgrade. Then the gate's sign-in need not ask at all in the common case.
Out of scope: the resume prompt's copy and the gate guard, both correct as they stand.
Note this becomes reachable the moment TWO accounts can sign in on one device, which is the roles/invitations item. Doing it before that item ships is optional; doing it after that item ships is not.

### Google sign-in is still unbuilt, and it needs Max before it needs code
Anchor: absent `signInWithOAuth` in `js/app.js`
Arrived here 14 Aug 2026 when batch 186 finished the auth queue item and deleted it. It was the item's last surviving bullet, it was explicitly **optional** from the day it was written, and by the queue's own tier test it is a C: email/password sign-in works, so nobody is blocked, embarrassed or hurt by its absence.
**It needs a Google Cloud OAuth client id and secret pasted into the Supabase dashboard, which no code can create.** The client half is `signInWithOAuth({provider:'google'})` and a button — two lines and a control on the boot gate's sign-in screen (`#bgSignForm`, 186) and on the Account card, which are the two places the password form already lives.
Requirements: the dashboard credential exists first — ask Max, do not start without it. Then ONE shared handler, as 186 did for the password form: the two surfaces must not grow a second copy of the sign-in sequence.
Out of scope: sign-up. An account that joins no café can see nothing at all since 186, so self-service signup's only outcome is the "ask the café owner" screen — that is the roles item's invitation work, and it is written into that item.

### FOUR process files live OUTSIDE the repo, so nothing can review or pin them (three skills and the `project-audit` agent)
Anchor: absent `project-audit` in `.claude/agents`
Anchor: absent `name: new-branch` in `skills`
⚠️ **The reviewer half of this item was FIXED on 12 Aug 2026 (batch 177) and is not the open part.** `~/.claude/skills/new-branch/SKILL.md` §6 had the two reviewers exactly backwards — it called the on-demand PR workflow "MANDATORY and runs itself" and the pre-push `code-review` agent "OPTIONAL". It now matches `CLAUDE.md`, its gotchas are re-pointed, and step 5's unconditional "wait for the user to approve the plan" now branches on whether the work came from the queue (approved) or from chat/a brief (not).
**What remains is the reason it drifted, which no edit to that file fixes.** `new-branch`, `investigate` and `test-flows` live in `~/.claude/skills/`, outside the repo — the repo's own tracked skills live in **`skills/` at the repo root** and are **five**: `batch`, `cache-version`, `decide`, `handover`, `verify` (⚠️ corrected by AUDIT-v227 - `.claude/skills/` is GITIGNORED and holds symlinks, and the `supabase*` pair point outside the repo, so a clone gets five, not seven). An outside file cannot ride a PR, cannot be reviewed, and no test can pin it, which is how this one told every batch the wrong thing for **three audits running** (v135, v145, v156) while an in-repo copy would have been caught by the first reviewer to read the diff.
It has now cost something real: `HANDOVER-176` records the first batch to ship to production with no pre-push review at all.
Requirements: decide whether the three MOVE into `.claude/skills/`. If they do, they become reviewable and diffable like `batch` and `handover` already are; if they stay, say why and accept that they drift unpinned.
Note this is Max's call in one respect only — they are his global config and moving them changes what other projects see. Everything else about it is mechanical.
⚠️ **AND IT IS FOUR, NOT THREE — the `project-audit` AGENT lives out there too, at `~/.claude/agents/project-audit/project-audit.md`, and it is the one with teeth.** Its standing checklist is a list of things every audit must spend budget on, and nothing in this repo can see that list, review a change to it, or notice a line going stale. **Measured, 9 Sep 2026 (AUDIT-v197):** it carried *"abbreviation matching in search"* — a feature explicitly DECLINED in `HANDOVER-v83` and never built — so **four consecutive audits re-derived the same correction**, each one reporting it as a dropped thread because the checklist kept asking. It also carried a `TODO(Max)` grep that four audits in a row found zero of. Batch 240 struck both out there under standing authority and added an expiry rule at the site, and **there is no diff of that in this repo, which is the entry's whole point.** Add it to whatever this item decides for the other three.

### The handovers' Playwright count uses a different filter from CI's, and the difference is the live-production spec
Anchor: `every spec in tests/visual EXCEPT screenshots.spec.js` in `.github/workflows/test.yml`
Found by AUDIT-v156 (T2). `HANDOVER-176` reports *"288 Playwright"* green. CI guarantees **274 in 30 files** — its filter is `ls tests/visual/*.spec.js | grep -v screenshots.spec.js`. The whole directory is 288 in 31.
**The 14-test delta is exactly `tests/visual/screenshots.spec.js`**, which imports only `gotoTab` and never calls `installBoot`, so it does not stub Supabase and does not abort off-origin requests. Its own header says *"the app talks to your live Supabase."* CI has an explicit fail-closed guard to keep it out of the hermetic job.
So a handover quoting 288 is quoting a number that came from running the one spec CI deliberately excludes, and is not the figure CI stands behind. It reads only, so this is not a data risk — the problem is that the reported green means something different from the guaranteed green, and nobody reading the handover can tell.
Requirements: settle ONE number that handovers quote, and say which filter produced it. The cheap answer is to quote CI's filter, since that is the one with a guard behind it. Do not fix this by editing past handovers — they are write-once.

### The search ✕ shows on every search bar even when the field is empty
Anchor: `.ms-clear` in `css/style.css`
Pre-existing and app-wide (`.ms-clear`, `css/style.css:1160`), noticed on the converted Plates screen where the mock draws no clear control at all.
F2 kept the control (R3 — `type="search"` renders no native clear on iOS Safari, which is Max's phone) and rebuilt it as `.plib-x`, but did not change WHEN it shows, because the behaviour is shared with four unconverted screens.
Decide once: hide it while the field is empty (an input listener on each search bar, or one delegated handler), or keep it always-on deliberately and say so. Whichever way, it wants doing in one place for all six search bars, not per screen.

### `manifest.json`'s `theme_color` / `background_color` match NEITHER palette
Anchor: `"theme_color": "#3E2C26"` in `manifest.json`
`#3E2C26` / `#F7F3EC` — pre-existing, found by the v136 pre-push review while fixing the `theme-color` meta. The meta now follows the chosen theme correctly; the manifest is a separate static declaration used for the install splash and the task-switcher card, and it names colours from a palette two redesigns ago.
A manifest cannot be theme-aware, so this is a decision: pick the LIGHT palette values (`#FFFFFF` / `#FFFFFF`) as the install-time default, or the dark ones. Only seen at install and in the app-switcher, but wrong today either way.

### `.range-btn` — visual size only, NOT an accessibility item
Anchor: `.range-btn` in `css/style.css`
The chip is 32px tall but `css/style.css` gives it a `::after` extending 6px top and bottom, so the tappable area is already 44px. What is left is that the dashboard shows controls at two visual sizes after the 44px selector rows. Max deferred this 31 Jul 2026; it is a taste call.

### The stale v60 target-line comment in `trendChart`
Anchor: `v60 item 1b: present only when the target is inside the domain` in `js/app.js`
v61 item 6 superseded the half it describes. (The *domain* half of the v60 comment block was rewritten by the v145 y-domain fix; the target-line sentence was not. Re-grep by name.)

### "Menu item" survives as a fifth object noun in the Edit-menu-item modal
Anchor: `<h3 id="editTitle">Edit menu item</h3>` in `index.html`
`CLAUDE.md` Tier 2 records it as a known surviving fifth noun awaiting its own brief — it is not a bug to fix on sight.

### The `.chart-hint` / `.scope-note` "all menus" pair under the chart
Anchor: `scope-note` in `js/app.js`
Anchor: `chart-hint` in `js/app.js`
Two hints under one chart saying overlapping things. Read them together and cut or merge.

### Builder cost panel: the design's "+ Add to another menu" shortcut was deferred out of Q6
Anchor: absent `Add to another menu` in `js/app.js`
(9 Aug 2026) It needs the manage-menus modal to stack over the open builder and the cost panel to refresh when menus change underneath — both untested territory that was not riding a redesign batch. The panel's "On menus" list ships without it; publishing still lives one tap away on the plate card.
**F7 rebuilds the builder as a full page and rehouses publishing, so re-read this against F7's result rather than against Q6's.**

### The Playwright suite has never been audited for specs that pass against a broken app
Anchor: none - it is an audit of the whole Playwright suite as a set; no single literal is its subject
(Recorded 12 Aug 2026, batch 178. Declined as work in that batch because it is C by construction and the batch was already large.)
This project has hit the vacuous-test failure **seven** times, and CLAUDE.md's own test for it is "would this test FAIL if I broke the thing it names?" - answered by breaking the thing and watching it go red.
Nothing has ever asked that question of the 399 browser tests (44 files; said "289 browser specs" until AUDIT-v176 re-counted on 28 Aug 2026, so any cost estimate below is priced off the smaller number) as a set. Two of the seven were found by accident, one batch apart, both green and both mine.
The method is mechanical rather than clever: mutate one load-bearing thing per spec's stated subject and confirm the spec that names it goes red. A spec that survives every mutation of its own subject is the finding.
It is also the honest answer to "is the suite carrying dead weight" - 3.8 min locally and 8.7 in CI is worth spending only on specs that can fail.

### `dispPrice` returns a string its callers have to unpick
Anchor: `function dispPrice` in `js/app.js`
(Recorded in `HANDOVER-176`, still true at v157.)
Two of its four callers put the return value where markup would be wrong, so the `/kg` suffix fix wraps it rather than changing it.
The cleaner shape is for it to return parts and let each caller compose. It touches the invoice review, so it is not a drive-by.

### The `.btn-noun` collapse still shortens two secondaries that now have room
Anchor: `.btn-noun{display:none}` in `css/style.css`
(Found 12 Aug 2026 by looking at batch 179's own result at 360, after the rehome had shipped.)
`@media (max-width:639px){.btn-noun{display:none}}` turns "Set up from products" into **"Set up"** and "Import invoice" into **"Import"**. `renderKingProgress` states the reason at its own site: *"the noun span hides on phones so the pantry pair fits one line"* — i.e. it exists to make the HEADER fit, and 179 moved both buttons out of the header. Measured in the `.plib-controls` row at 360, each sits alone on its line with the row's full content width (328px) available and uses ~78–95px of it.
So the labels are shortened for a constraint that no longer applies to them, and **"Set up" on its own does not say what it sets up** — it is the first thing a café with a full catalogue and no ingredients is offered.
Not changed in 179 because it is a copy decision rather than the rehome, and because `tests/visual/fresh-states.spec.js` pins **both** short forms on purpose (*"the SECONDARY still shortens — the idiom survives where the room is tight"*), so whoever changes this changes that pin consciously and states what expired — the room is no longer tight.
⚠️ Do NOT just delete the `.btn-noun` rule: the word "More" on the back chevron is also a `.btn-noun` and `css/style.css` says at that site that the collapse is what stops the Products header wrapping. Scope any change to the rehomed actions.

### The sync pill flickers between chunks on a large catalogue import
Anchor: `function dbPushIngredients` in `js/app.js`
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
Anchor: `e.pid===pid` in `js/app.js`
`rememberSupplierPhrase` (`js/app.js:3730`) sets `pid` in memory. The table has **no such column** (`supabase/staging/01-schema.sql:163-170`) and **neither mapper carries it** — `rowToSupplierPhrase` / `supplierPhraseToRow` at `js/app.js:415-416`. So every entry loaded from the server has `pid === undefined`, and `syncMemoryToProduct` (`js/app.js:3733-3737`), which matches on `e.pid===pid`, finds nothing in any session but the one that taught the pack. Its own comment reads *"ITEM 1: keep Remembered items in step with the product's taught pack."*

Concrete cost is low and that is why this is C: `resolveMatchedPrice` prefers the product's own pack over memory, so memory only prices a line when the product has no pack at all. The Settings "Remembered items" list can display a stale qty beside a product whose real pack differs.
**What makes it worth recording: a guard that is present, documented and cannot fire, with nothing saying so.**

⚠️ **ONE OF THE THREE FIXES IS UNSAFE, and it was the cheapest-looking one.** (Batch 200, which opened `applyInvoice` for QUEUE 0b and considered taking this along.) *"Match on the normalised phrase instead of `pid`"* would make the guard fire — on **every supplier's entry for that phrase**. Two suppliers whose line text normalises the same way can genuinely sell different pack sizes; the guard would overwrite one of them with the other's, and `resolveMatchedPrice` re-prices from memory on the very next import. That turns a dead guard into a wrong-data path, which is strictly worse than nothing. **Two fixes remain: the column plus both mapper halves, or delete the guard and say why.**
The column is a `supplier_phrases` change, and that is one of the five tables `restore_backup` inserts with `select *` — so it must be nullable with NO default (`CLAUDE.md`'s four-clause carve-out, condition 3) and needs the full `docs/STAGING.md` procedure. That is why 201 did not ride it: it is a migration, not a one-liner.

### One magnitude check, against real data
Anchor: none - a proposed band check over a production snapshot; nothing that exists yet names it
The process audit's highest-value new check, and the only one aimed squarely at this project's stated worst failure mode. `HANDOVER-172` already derived it and applied it only to a seed: *"a fixture can be internally consistent and still be nonsense, and the checks that would catch it are the ones about magnitude, not about shape."*
A small set of assertions that every plate cost, unit cost and food-cost percentage lands inside a sane band, run against a snapshot of production, would have caught the $961 salad, the 1831% dashboard, the 30c/kg ham and 193's carton error **without a human looking.**
⚠️ **State its limit at the site or it will be over-trusted: a band does NOT catch `QUEUE.md` item 0.** $5.50/kg for chips is inside every plausible band; a 10% error is invisible to magnitude and needs the composition test in item 0c. These two checks are complements, not substitutes.

---

## C — from the gate review before public signup, batch 210 (27 Aug 2026)

Filed here rather than in `docs/QUEUE.md` per the tier test: none of the three would stop, embarrass or hurt a paying customer at launch **as things stand today**. The first one says at its own site what would change that.
`docs/GATE-REVIEW.md` is the sign-off these three fell out of; read it there rather than re-deriving them.

### Per-account rate limiting on the AI endpoints
Anchor: `It is NOT a rate limit` in `api/_auth.js`
Batch 210 closed the **anonymous** half of this: `api/_auth.js` requires a live, confirmed session on `api/parse-invoice` and `api/insight`, which before it were POSTable by anyone on the internet spending Max's Gemini key.
**A signed-in caller is still unbounded.** Requiring an account raises the cost of abuse from nothing to "confirm an email address"; it caps nobody.
⚠️ **This is C only while the tier is free, and it becomes a launch blocker the day the paid tier lands** — that is the day abuse stops costing quota and starts costing money, and `docs/QUEUE.md`'s paid-tier item says so at its own site. **The cheap half needs no code at all: set the Google Cloud SPEND CAP in the same sitting as enabling billing.**
The reason it was not built in 210: a per-account counter must survive between serverless invocations, so it needs a table, so it needs a migration, so it needs staging — **and staging was paused at the time**. Half-building it against production was the wrong trade.
✅ **THAT OBSTACLE IS GONE. Staging came back on 29 Aug 2026** (`docs/STAGING.md`, measured — 14 tables, 9 functions, 4 accounts), and batches 218 and 219 have both rehearsed full migrations against it since. **So this item is no longer blocked on anything; it is merely undone**, and the distinction matters because a reader of the old sentence concluded the work was impossible.
Corrected 2 Sep 2026 by AUDIT-v186 C1, which called it the single most important thing in the report: this is the one C entry that **becomes a launch blocker the day item 2b ships**, since abuse costs quota on the free tier and money on the paid one.

### Drop `invite_pending` once no cached client calls it
Anchor: `create or replace function public.invite_pending` in `supabase/staging/01-schema.sql`
It is `SECURITY DEFINER`, granted to `anon`, and answers whether any café has a pending invitation for an address — the only unauthenticated endpoint this app has ever deliberately shipped. The gate review accepts it, on the grounds that its surface is narrow and shrinking.
**The café-creation branch removes its last caller**: sign-up stops being invitation-gated, so once that ships nothing in the shipped client invokes it. It is deliberately not dropped in the same change — an old client still cached on a phone calls it and refuses sign-up on an unreadable answer, so **the drop must FOLLOW the client, never lead it.**
Take this once the café-creation client has been live long enough that no cached client plausibly remains.

---

## C — the insight validator and dead UI (batches 212-223)

### `.tipbox` and `.tip` are dead — CSS, a wired handler, and a document-wide click listener
Anchor: `.tipbox{` in `css/style.css`
Anchor: `querySelectorAll('.tip')` in `js/app.js`

Found by batch 212 while counting the app's floating layers for `docs/QUEUE.md` item 6, which listed
`.tipbox` as one of five live layers with the note *"suggested-price tooltip, CSS only"*. It is not a
layer at all: **nothing in `index.html` or `js/app.js` emits `class="tipbox"` or `class="tip"`.**

Three things to remove together, and the second and third are why this is worth an entry rather than a
silent deletion:

- `css/style.css` §13 — `.tip`, `.tipbox`, `.tipbox::after`, `.tip:hover .tipbox`, `.num .tipbox`.
- `js/app.js` — a `document.querySelectorAll('.tip').forEach(...)` that wires click handlers to a
  selector matching nothing, **plus a `document.addEventListener('click', ...)` that runs on every
  click anywhere in the app** to close a class no element carries.
- `docs/handovers/HANDOVER-144-tokens-dark.md` records `.tipbox` being converted to `--inverse` in the
  dark-theme pass — a batch spent styling a rule that renders nowhere, which is the cost of leaving it.

⚠️ **Verify the emitter before deleting, not the selector.** `.tip` is greppable in `js/app.js` as a
LIVE selector (the handler above), so a reader checking "is this used?" finds a hit and stops. The
question that settles it is what puts the class ON an element, and the answer is nothing.

It rides whichever batch next opens `css/style.css` §13 or that handler block. Related: the
dead-selector family recorded earlier in this file (`.ref-pill`, `.db-tools`, `.ing-empty`,
`.an-empty`, `.plate-noresult`, `.king-tag`) — same class, and this is a seventh.

### A REJECTED phrasing is not free, and the entry below says it is
Anchor: `function validatePhrasing` in `api/_insight.js`

Batch 215, third review round. Recorded because it qualifies a sentence sitting a few lines down —
*"a rejected line costs nothing because the deterministic template is always the fallback"* — which is
true about CORRECTNESS and false about everything else.

By the time the validator rejects a line, the POST has already happened: the café's plate names and
costing figures have gone to Google's free Gemini tier, the quota is spent, and `docs/` carries a
privacy disclosure covering exactly that transfer. What the rejection saves is only the wrong words.
**So the false-reject rate is a real cost with no visible symptom** — the panel renders correct
templates and looks like it is working, which is the same shape as every silent failure this repo
records.

**Measured while fixing the prompt (batch 215):** against hand-written faithful rewordings of the real
templates, **4 of 10 were rejected, every one a clause reorder.** That was caused by the prompt telling
the model to *"FRONT-LOAD the fact"* while the validator required the figures in template order — the
two halves of one feature disagreeing. The prompt now asks for what the validator allows, and
`tests/api-insight.test.js` pins the instruction.

⚠️ **What is NOT known, and the honest limit of that number: those ten sentences were written by hand,
not sampled from Gemini.** They show the check forbids a natural class of rewording; they are not a
production reject rate, and nothing here measures one.

**What would settle it** is instrumenting the real endpoint — count validated vs rejected phrasings
over a period of Max's actual use and read the ratio. That is a small change to `api/insight.js` plus
somewhere to put the counter, and it is C rather than B because the failure it would expose degrades to
correct output. **Do it before anyone argues from a guess about how often this fires**, in either
direction: the ordering rule is load-bearing (see the `insDrift` tests in
`tests/insight-real-templates.test.js`, where order is the ONLY signal separating "from 25% to 40%"
from "from 40% to 25%"), so a high reject rate is an argument for a better PROMPT, never for relaxing
the check.

⚠️ **BATCH 220 ADDED A SECOND RULE THAT CAN REJECT, AND IT IS RECORDED HERE SO THE NEXT MEASUREMENT IS
NOT COMPARED AGAINST A PRE-220 GUESS.** `namesAllPresent` requires every name the template uses to
survive into the candidate — so a rewording that DROPS the subject ("Up 18% across 5 plates drove it")
is now refused where it was accepted. **The prompt already demanded exactly this** (*"MUST keep every
number (… product names) EXACTLY as written"*), so this is the two halves agreeing rather than a new
constraint on the model, and the 4-of-10 figure above was measured before it existed. If the rate is
ever instrumented, note that five of the eight families publish ONE name and are newly covered.
The direction is the safe one — a reject falls back to the deterministic template, which names the
right subject — but it is still a reject, and the entry above is the argument for measuring rather
than guessing which way it moved.

⚠️ **AND 223 MOVED THE RATE IN BOTH DIRECTIONS AT ONCE, WHICH IS WHY IT IS RECORDED RATHER THAN
ASSUMED TO BE NEUTRAL.** It made a name match only at a word boundary, and that:
- **removes** a class of false reject — where a template contained a spurious substring hit (`Rice`
  inside "prices"), a candidate that reworded that prose away DROPPED a name the template "used" and
  was refused for it;
- **adds** a stricter presence test — a name is now only present where it stands as its own word.
It also gave `insVolatility` and `insNearCluster` a published subject, and **measured after the
change, all EIGHT families publish at least one name**, so every one of them is now covered by
`namesAllPresent`. (`insNearCluster` was the only family publishing NONE; `insVolatility` published
the plate and not the ingredient the sentence blamed.)
Nothing here is measured against real Gemini output, which is the whole point of the entry above.

### Two ways a name check can be satisfied by the wrong entity, neither fixed
Anchor: `function nameSequence` in `api/_insight.js`
Anchor: `Rice Noodles` in `tests/insight-parity.test.js`

Found and left open by batch 223, which closed the neighbouring case and could not close this one.

223 made `nameSequence` require a match to START at a word boundary, because a name matched INSIDE a
longer word appears on both sides of the comparison and lets the real subject be swapped out
unnoticed — an ingredient called `Rice` was being found inside the template's own word "prices".

**That fixes the substring case and not the whole-word case.** A plate literally named **"Point"**,
against `insNearCluster`'s "…sit within half a **point** of your 30% target", produces a template
name sequence of `[point, cheeseburger, point]` — one real mention and one from the prose. A
rewording that replaces the real "Point" with another plate still leaves the prose "point" standing,
so `namesAllPresent` is satisfied and the swap is ACCEPTED. Measured on the real builder.

⚠️ **It is not specific to the two families 223 touched** — `insCostBase` ships "across 5 **plates**"
and would behave the same way for a plate named "Plates". The exposure is bounded by how odd the
name has to be, which is why this is C: the collider must be an ordinary English word that already
appears in that family's fixed prose.

**Why it is not half-fixed on sight.** Distinguishing "the name the sentence is ABOUT" from "the same
letters appearing in the boilerplate" needs the builder to publish WHERE the name sits, not just what
it is — an offset or a marked slot in the template — which is a change to all eight families and to
the shape of `facts`. That is a real piece of work, not a tightening, and it should be one item with
its own measurement rather than a rider on someone else's.
**Do not reach for a denylist of prose words.** `CLAUDE.md` roster entry 190: "not the wrong value"
is a guess about every wrong value there could be, and the prose differs per family.

**What holds meanwhile:** the deterministic template is always the fallback and always names the
right subject, so the failure needs the model to produce a swap AND the café to have named a plate
after a word in the boilerplate.

**The second one, and it is the WIDER of the two: a name that is a PREFIX of a longer name**

Raised by 223's pre-push review. `Rice` is matched inside **"Rice Noodles"**, so a rephrasing can
name a *different real product* that merely starts with the same word, and every figure, symbol and
direction check passes. `Cream` → `Cream Cheese`, `Beef` → `Beef Mince`, `Tomato` → `Tomato Paste`
are all the same shape, and they are ordinary compound names in a real supplier catalogue.

⚠️ **It is wider than the boilerplate case above because it needs nothing unusual of the café** — no
oddly-named plate, just a model that elaborates a product name. That is the reason to rank it first
if these are ever worked.

⚠️ **TWO CLAIMS THE REVIEW MADE ABOUT IT ARE WRONG, AND BOTH ARE RECORDED BECAUSE THEY POINT AT THE
WRONG REMEDY**, which is the expensive kind of error to leave in a file people act on:

- **It is NOT caused by 223's open trailing edge, and closing that edge does not fix it.** The
  character after "Rice" is a **space**, which satisfies a trailing boundary exactly as it satisfies
  a leading one. Measured: with a strict trailing edge, "Rice Noodles" is *still* matched — and
  "Tomatoes" stops matching `Tomato`, so the only thing a strict edge buys is a class of false
  reject. `tests/insight-parity.test.js` asserts both halves so this is not re-argued from scratch.
- **It is NOT new in 223.** Measured on `main` before that branch: `insCostBase` has published a bare
  name since 220, and "Beef" → "Beef Mince" was accepted then. It affects every family that
  publishes a name, which is now all eight.

**The real fix is the same one the boilerplate case needs** — the builders publishing WHERE a name
sits rather than only what it is — which is why the two are filed together: one item, all eight
families, its own measurement. Neither is worth a partial fix, and a denylist is not available here
for the reason given above.

**What holds meanwhile** is unchanged: the deterministic template is the fallback and names the right
product, and the prompt already demands names be kept exactly.

### The insight validator cannot see an inverted RECOMMENDATION
Anchor: `is fine and needs no action.` in `tests/insight-parity.test.js`

Left open deliberately by batch 215.
⚠️ **An earlier draft of this entry said 215 "fixed the other three cases the blind audit found", and the pre-push review was right that it overstated.** 215 fixed the audit's three *as the audit demonstrated them*, and the review then found a FOURTH shape of the same swap class — two entity NAMES with one figure each, where swapping the names preserves order and symbols perfectly. That is fixed too (the names are sequenced), so the standing gap is the one below and only the one below.

`validatePhrasing` now compares a candidate against the deterministic template's figures in **order**
and **symbol** (`%` vs `$`), and rejects a reversed **direction**. What it cannot see is advice:

```
template   "Beef, up 18% across 5 plates, is most of it."
accepted   "Beef, up 18% across 5 plates, is fine and needs no action."
```

Same figures, same symbols, no direction word — every check passes, and the sentence tells Max to do
nothing about the thing the dashboard raised.

⚠️ **It is NOT built because the only cheap implementation is a denylist of advice phrasings, which is
the weakest assertion shape this repo records** (`CLAUDE.md` roster entry 190: *"not the wrong value"
is a guess about every wrong value there could be). A real fix would have to compare intent, which is
the thing the app deliberately refuses to let a model decide.

**What holds the line meanwhile:** the prompt, the one-sentence and 24-word caps, and that a rejected
line costs nothing because the deterministic template is always the fallback. The toggle also defaults
ON, which is why this is recorded rather than shrugged at.

**`tests/insight-parity.test.js` pins the gap as it stands** — it asserts both copies currently ACCEPT
the inverted-advice sentence, so the day someone closes it that test goes red and makes them come here
and update this entry rather than the gap silently changing status.

## C — from AUDIT-v176 (28 Aug 2026)

Filed here per the tier test: none of these would stop, embarrass or hurt a paying customer at launch. The first is the exception in spirit and is flagged for Max rather than queued, because it turns on a decision he owns.

### A handover thread reached NEITHER `QUEUE.md` NOR `MAINTENANCE.md`: the supplier filter over a 95%-empty field
Anchor: `ingSupFilter` in `js/app.js`

Recorded because the failure is the routing, not the item: it existed only in a write-once handover, where nothing would ever action it.

- **`HANDOVER-175`** — the supplier FILTER survives over a field that is **95% empty**, so it filters on data that is almost never there.

### `buildBackup`'s comment quotes a format literal that no longer exists — AUDIT-v197, C, a rider
Anchor: `format:chg.length?3:2` in `js/app.js`

Filed 9 Sep 2026 by batch 240. Not load-bearing and not worth a deploy version on its own; it rides the next batch that opens its function. Its shape: **a correction landed BESIDE the error instead of replacing it.**

- **`buildBackup`'s comment quotes a format literal that no longer exists.** It says *"the precedent is `format:chg.length?3:2` in `backupToPayload`"*. The live expression is `format:(ph.length||mph.length)?4:(chg.length?3:2)` — batch 219 widened it when it took the file to format 4. **The FUNCTION NAME is now right** (AUDIT-v186 X3 fixed that half, after the comment spent months citing `buildBackup`'s own flat number); the quoted expression is the half that rotted next. ⚠️ **This is the third correction to one comment, and `CLAUDE.md` already draws the lesson: read the two literals out of `js/app.js`, and do not restate either of them anywhere.** The fix is to DELETE the quoted expression and name the function only.

### `cafeCost_env` is a stamp, and Tier 2 still says there is no third category
Anchor: `var ENV_STAMP_KEY='cafeCost_env'` in `js/app.js`

`HANDOVER-172` asked for *"one clause so the next audit does not rediscover it as a violation"*. It was not written, and AUDIT-v176 rediscovered it — the fourth audit in a row to do so for one of these. `js/app.js:43` is `var ENV_STAMP_KEY='cafeCost_env'`; `CLAUDE.md`'s Tier 2 names the constant in its grep list but never resolves the classification.

### `HANDOVER-178`'s proposed rule was never applied
Anchor: absent `inside a node that re-renders` in `.claude/rules/`

*"A primary action must not live inside a node that re-renders."* Earned by a real defect: Save lived inside `#bFootSum`, which was replaced between touchstart and touchend, so the click was dropped. It was parked on Max's yes **the day before that requirement was reversed**, and the reversal's own justification was that a parked rule sat unapplied while the thing it warned about cost a diagnose cycle. ⚠️ **The reversal does not reach edits proposed BEFORE it** — that is the gap, and `HANDOVER-172`'s proposal is in the same state.

### ⚠️ FOR MAX: `AGENTS.md` forbids commit co-authorship and every commit does it anyway
Anchor: `Never add yourself as commit co-author` in `AGENTS.md`

Flagged verbatim by `HANDOVER-264` - *"which one is wrong is his call"* - and it then reached **neither `docs/QUEUE.md` nor `docs/PHONE.md` nor this file**, which AUDIT-v217 found and is why it is written here now.

**Measured 15 Sep 2026:** `AGENTS.md` says *"Never add yourself as commit co-author."* The last eight merge commits on `main` carry **13** `Co-Authored-By:` trailers between them. They arrive because the **harness instructs it** in the session prompt, not because a batch chose to.

**Neither side can be called wrong by a batch, which is the whole problem.** `AGENTS.md` is Max's working-preferences file; the trailer is the environment's. A batch that edits `AGENTS.md` is overruling his stated preference, and a batch that follows `AGENTS.md` is disobeying its own harness.

**The cost is not the trailers. It is that a repo rule which every single commit breaks teaches every reader to discount the file it lives in** - and `AGENTS.md` is the file carrying "reproduce before fixing", "enumerate before changing" and "no em dashes", which are rules this repo actually relies on.

**Two answers, and it is one line either way:**
- **Keep the trailers:** delete that line from `AGENTS.md`, or qualify it to *"never add a human as co-author; the harness's own trailer is expected"*.
- **Drop the trailers:** the line stays, and the harness instruction has to be overridden per-session, which nothing in the repo can enforce - so this only works if he wants it enough to notice when it lapses.

**Recommended: the first.** The rule as written has been false on every commit for months, and a preference nothing can honour is worse than no preference. **But it is his file and his call; do not take it on a free slot.**

### `tests/king-wizskip.test.js` hand-rolls `kingLinkableProducts` instead of extracting it
Anchor: `function kingLinkableProducts(){ return PRODUCTS_` in `tests/king-wizskip.test.js`

Found by batch 268 while writing `tests/king-head-sub.test.js` against the same neighbourhood.
`tests/king-wizskip.test.js:44` writes its own `function kingLinkableProducts(){ return PRODUCTS_.filter(function(p){ return p && p.description && p.is_food!==false; }); }` rather than extracting the shipped one. It is byte-identical today, which is exactly the state the roster's first entry describes: **a stub written from the same belief as the code passes against the defect it was written to catch.** Change the `is_food!==false` predicate in `js/app.js` — widen it, or start excluding a second column — and that file stays green while `kingUnlinkedProducts` returns a different set.
Requirements: inject `PRODUCTS` and use `extractFn(SRC, 'kingLinkableProducts')`, as the same file already does for `kingUnlinkedProducts` two lines below. `tests/king-head-sub.test.js` injects it for the same reason and has the same gap; fix both in one pass.
Tier C: no number moves today, and both files are green for the right reason at this commit.

### `renderManageMenusZero` still reports, and the rule now written down says it should invite
Anchor: `<p class="mm-empty-t">No menus yet.</p>` in `js/app.js`

Batch 217, filed at the moment the rule was written rather than after someone rediscovers the inconsistency.

Max chose option A of `docs/decisions/2026-08-28.html` — change one title, write the rule down — and the rule is now at `emptyStateHtml`'s own site: **one obvious action → invite; anything else → report.**

`renderManageMenusZero` (`js/app.js`, the manage-menus modal opened from a plate) shows **"No menus yet."** over **one** action, "Add to a new menu". By the rule as written it should invite. It was left alone because the decision enumerated six tab-level empty states and this is a seventh surface, so changing it would have gone past what was approved — and user-visible copy is Max's.

⚠️ **BATCH 268 REACHED THIS THROUGH QUEUE ITEM 58 AND STILL DID NOT CHANGE IT, deliberately** — the item's own bullet says *"Copy is Max's; propose the line in the handover"*, so it is proposed rather than taken. **What 268 adds is that the item's framing was wrong and this entry's is right:** item 58 described it as *"reports where the written rule says invite"* with the remedy *"one obvious action → invite"*, which reads as though the ACTION were missing. It is not — "Add to a new menu" is there, primary, and is the only action on the surface. **The only thing out of step is the TITLE.**
**The proposed line, matching what batch 217 did to the Menu tab for the identical reason: "No menus yet." → "Create your first menu".** The body sentence and the button are already correct and are not proposed for change. **Ask Max; do not take it on a free slot.**

⚠️ **The reason this is filed rather than shrugged at: a café creating its first plate can reach this modal BEFORE it ever opens the Menu tab**, so the two surfaces are not merely inconsistent in the abstract — one user, one session, two voices for the same underlying state (no menus, one way out). That is the exact complaint the queue item was about, one surface over.

**It is copy, so it needs Max**, and it is a one-line change plus the CTA already reading as a verb. The rule's own comment says at its site not to read this title as evidence against the rule.

### Supabase's leaked-password protection is OFF, and sign-up is now public
Anchor: none - a Supabase dashboard toggle (Authentication → Policies); nothing in the repo can read it

`auth_leaked_password_protection`, a WARN in the production advisors, checks new passwords against HaveIBeenPwned. It mattered little while every account was made by hand in the dashboard; batch 218 shipped self-service sign-up, so strangers now choose their own passwords.

**It is a dashboard toggle, so it is Max's to flip** — one switch under Authentication → Policies. It is filed here rather than in the queue because nothing in the repo can do it and nothing is broken without it; `docs/GATE-REVIEW.md` (batch 210) reviewed the signup gates and did not cover this one, because the bullet naming it existed only on the unmerged café-creation branch at the time.

### There is no inventory of the settings this app depends on that live OUTSIDE the repo
Anchor: none - the fix is a new file, and a literal that only the new file would contain cannot be grepped for before it exists

Batch 238, 8 Sep 2026. Filed here rather than in the queue because the fix is a page of prose, and because the two live instances are each already recorded — what is missing is the list.

**The prompt was a real defect that cost a real stranger their sign-up.** GoTrue's **Site URL** was still the factory default `http://localhost:3000` on the day self-service sign-up shipped, so every confirmation email verified the address correctly and then handed the browser to a machine that was not theirs. 238 fixed the client half (`authRedirectTo` names an origin explicitly) and the dashboard half is Max's click. **Nothing in this repo could have caught it, and that is not a gap in the suite** — the value lived in a Supabase dashboard field, so there was no file to read, no migration to grep and no MCP call that reaches it. A test asserting the app "sends a redirect" would have been green throughout, because the app did not send one and the default was doing the work.

**Two of these are now known and they were found separately, years of versions apart, each by something breaking:**

- the **auth URL configuration** — Site URL and the Redirect URLs allow-list (238);
- **`auth_leaked_password_protection`**, the entry directly above (218).

Both are one switch, both are Max's, and neither is discoverable from the repo. `GEMINI_API_KEY` in Vercel is a third of the same class, differing only in that `CLAUDE.md` happens to name it.

**Requirements:** one file — `docs/EXTERNAL-CONFIG.md` — listing every setting the running app depends on that is not in git: what it is, where it lives, what it should be, how to check it by hand, and what breaks silently when it is wrong. It is a checklist, not a mechanism; the point is that a reader can go and look, which is currently impossible without knowing in advance that the field exists.
⚠️ **`docs/GATE-REVIEW.md` (batch 210) reviewed the sign-up gates and missed BOTH of these**, which is the argument for the list rather than for another review: a review reads what is in front of it, and none of this is.
⚠️ **Staging almost certainly carries the same default and nobody has looked.** A sign-up rehearsed there will land on `localhost:3000` exactly as production did — which means the flow this repo cannot test is also the flow staging cannot rehearse until that field is set on both projects.

### The café name limit is 60 in three places and only two of them count the same thing
Anchor: `function cafeNameProblem(name)` in `js/app.js`
Anchor: `maxlength="60" required` in `index.html`

Found by batch 218's pre-push review, measured on both sides rather than reasoned:

```
'😀'.repeat(31)     JS  .length      = 62   (UTF-16 code units)
                    PG  length()     = 31   (codepoints)
```

`cafeNameProblem` in `js/app.js` and `maxlength="60"` on `#bgCafeName` both count **UTF-16 code units**; the migration's `length(nm) > 60` counts **characters**. Every astral-plane character — emoji, and a number of historic and rare scripts — costs two on the client and one on the server, so a 31-emoji café name is refused by the client and would have been accepted by the server.

⚠️ **It is filed rather than fixed, and the reason is the DIRECTION rather than the size.** The client is the STRICTER of the two, so the only thing it can produce is a **false refusal** — never a value that survives the client and is then rejected after a round trip, and never a stored name the server's guard was meant to stop. Nothing is wrong with any data.

**And the obvious fix moves the mismatch rather than closing it.** Making `cafeNameProblem` count codepoints (`[...nm].length`) aligns it with the server and leaves `maxlength` as the sole binding constraint — still UTF-16, still stricter, still silent, because **HTML `maxlength` has no codepoint-counting form**. Closing it properly means dropping `maxlength` altogether and giving up a native affordance, for a case a café name will not meet. That is a real trade and it should be made deliberately by whoever next has reason to touch this form, not smuggled in as a tidy-up.

**What IS pinned, in `tests/cafe-create.test.js`:** the property that actually matters — *the client may refuse more than the server and must never accept more* — across a spread of astral lengths. So the tempting direction, loosening the client to remove the false refusal, goes red by name. The equality test one above it deliberately keeps asserting the three numbers match, and now says at its own site that equal numbers in different units are not agreement.

## C — from the 5 Sep 2026 blind audit (GPT-5.6 Sol, 25m52s)

**Source: `docs/audits/BLIND-AUDIT-2026-09-05-code.md`.** Its four A/B findings became `QUEUE.md` items 12-15 and all four shipped; its top-ranked finding (that `js/app.js` did not parse) was FALSE.
⚠️ **The transferable rule: a reviewer that reads a file in fragments cannot see anything whose meaning is established outside the fragment** — block comments, hoisting, the naming inversion. Confidence and citation density are not evidence, so **run the repro before the fix, every time.**

### `api/_insight.js` can drop template numbers, and the prompt and test claim it cannot.
Anchor: `function skeletonIsSubsequence` in `api/_insight.js`

⚠️ UNMEASURED. Claim: the candidate number skeleton is only required to be a **subsequence**, so a candidate that invents no number can omit both `18%` and `5 plates` and pass — template *"Beef, up 18% across 5 plates, is most of it"* against candidate *"Beef is the main pressure point."* Claimed sites `api/_insight.js:31-35, 190-213, 263-297`. **`api-insight.test.js:89-94` is named as false confidence: its "forbids changing numbers" assertion checks the prohibition WORDING, not that the validator prevents removal.** That is roster entry 183(a) — an assertion that greps prose written by the same person in the same hour saying the same words. **The implementation's own comments acknowledge omission as permissible**, so this is also a comment/behaviour disagreement, and the honest fix may be to correct the prompt and the test rather than the validator.

## C — from batch 256's browser check (10 Sep 2026)

### A CREDIT line is refused correctly and EXPLAINED wrongly — it says "unit mismatch"
Anchor: `<span class="flag-mismatch">unit mismatch</span>` in `js/app.js`
Anchor: `function invRowIsCredit` in `js/app.js`

**Measured in Chromium, light and dark, 380px and 1456px**, driving the real chain (`pdfTextToRows` → `invFixRow` → `buildInvRows` → `renderInvReview`) over the real credit line from a 25/08 invoice: `13612 FZ CHIPS … LAND -2.00 -2.00 CTN $29.50 $-59.00`.

**The behaviour is right and is not in question.** The row comes back `needManual:true`, `unitPrice:null`, not pre-ticked, with an empty price field. That is batch 256 / consolidated item 17 doing exactly what it set out to do: a credit is not a purchase, and before the fix this line was stored as a purchase at $0.17/kg with nothing raised.

**What is wrong is the WORDING.** `parsePdfLine` records `basis.kind === 'credit'` — the row knows precisely why it refused — and nothing surfaces it. The row inherits the generic flag pill **"unit mismatch"** and the generic explain line *"Set the pack, or type the price"*, plus the paragraph about the product being measured per kg. All of that is literally true (the row's unit is `auto` against a kg product) and none of it is the reason. A user reading it will go and set a pack for a line that is a **refund**, and the honest instruction is "this is a credit — do not apply it".

**Why C rather than B:** nothing is stored, nothing is pre-ticked, and the user is stopped. It is a wrong explanation in front of a correct refusal, not a wrong number.
⚠️ **It rides whichever batch next opens `renderInvReview` / `flagNeedsAttention`, and it is cheap:** the row already carries the reason, so this is a `basis.kind` read and one more `st-*` case, not new state. **Consolidated item 26** is the natural companion — it is deciding what a `$0.00` line MEANS, which is the same question about the same screen, and both are about a row whose refusal needs its own words.
⚠️ **And the general shape, which is why this is written down rather than fixed on sight:** the fix put a NEW reason into the data (`basis.kind`) and reused an OLD label for it. A flag that is true for the wrong reason is this file's own comment trap arriving in UI copy — the observation ("the units do not match") is accurate, and the conclusion it invites ("set the pack") is the wrong action.

## C — the checks that came off `docs/PHONE.md` (10 Sep 2026, batch 257)

**The new rule is in that file's header and is a hard test:** a check belongs there only if a browser agent *could not* settle it — a real file, the soft keyboard, the installed PWA, a real network drop, or a real inbox. A batch adding one must name which. Everything else is below.

### A one-off `flow-tester` sweep of the AGENT checks that came off the phone list — 380px and desktop, both themes

Anchor: none - a UI-wide sweep with no single subject; it ends when the sweep is run

None of these needs Max and none ever did. They are listed so the deletion is not silent, and because several are worth one sweep.

- **Header wrap and truncation at 380 and 360:** the Ingredients, Products and Menu headers with two controls; a long menu name beside the Dashboard scope button; a long plate name in a Plates row; a long category pushing the plate count off an Ingredients meta line; a product name plus brand truncating in a Products row.
- **Overflow and clipping:** the builder's ingredient dropdown drawing its full height; the Menu verdict pill wrapping to two lines; the trend chart's date axis clipping at the card edge; the last table row sitting under the install banner.
- **Hit targets:** the builder's remove ✕ against the adjacent unit-price chip (they meet at a column gap and must not feel swapped); the trend range pills; the More back chevron; the search clear ✕. Geometry only — `elementFromPoint` and bounding boxes already pass, so what is left is a regression net, not a discovery.
- **Contrast:** every text/background pair in both themes. Already measured; item 66 owns the two that fail.
- **Empty and first-run states:** "Set up" staying visible under the Ingredients header on a café with products but no ingredients; the Dashboard's "Cost your first plate" card.
- **Rotation:** the second header button moving between the header and the control row across ~767px on all three screens.

⚠️ **Several of these have Playwright specs already** (`tests/visual/`), so the honest first step is to grep before writing anything: this list is what the PHONE file was asking a human to eyeball, not a claim that none of it is covered.

## C — from batch 260's pre-push review and browser drive (12 Sep 2026)

### Every `pushWrite` caller except two reads an absent error as a successful write

Anchor: `writeLanded` in `js/app.js`

⚠️ **`writeLanded` exists because the same silent no-op bit twice, and both times it was found by driving the app rather than by any test.**
Batch 251 added it (as `teamWriteLanded`) after a blocked DELETE on `business_invites` returned HTTP 200 with no error; batch 260 hit it again on `price_history`, signed out, where a delete reported success, repainted the screen, wrote a change-log entry saying the reading was gone, and **left the row untouched**.
`CLAUDE.md` states the mechanism outright - *"an anon UPDATE or DELETE returns 204 with NO error and touches nothing"* - and the only way to tell the two apart is `.select()` plus a length check, which is what `writeLanded` is.

**Two call sites use it. Every other `pushWrite` caller in `js/app.js` treats `!res.error` as proof the write landed**, and for an UPDATE or DELETE filtered by RLS that is exactly the case where it is false.

**Why this is C and not B:** nothing is known to be broken. The two paths that were measured are the two that are fixed, and the rest are mostly INSERTs, where a blocked write does raise. It is a sweep across dozens of call sites with an unknown hit rate, which is a batch of its own rather than a rider.

**What it would take, and the order matters:** enumerate every `.update(` and `.delete(` reaching Supabase, decide for each whether a zero-row result is a failure or a legitimate no-op (some are - deleting a row that is already gone is fine), and only then add the check. **A blanket `writeLanded` would turn every harmless no-op into a false alarm**, which is the direction that gets a guard disabled.
**And any test for it has to exercise the BLOCKED path**, not the happy one: the whole defect is that both return 200.

### `dbDeleteHistoryPoint` has no DB-side uniqueness behind its natural key

Anchor: `dbDeleteHistoryPoint` in `js/app.js`

It deletes by `(recorded_at, menu_id)` and `price_history`'s index on those columns is **not unique**, so the key is a convention rather than a constraint.
Measured on production 12 Sep 2026: **zero** pairs occur twice, and `mergeSeries` collapses same-millisecond rows into one point before the user sees them - so removing both is what the screen offered, and the behaviour is right today.
**The entry exists because the guarantee is external to the database.** If a future batch adds a second writer to that table, or relaxes `mergeSeries`, this delete starts removing more than the confirm named, silently. A unique constraint would make it a fact rather than an observation; adding one is a migration and needs the existing rows checked first, which is why it is not done on sight.

## C — from batch 261 (12 Sep 2026)

### The pack division has four copies; they are measured identical and a test now says so

Anchor: `packToUnitCost` in `js/app.js`

**Not a defect today, and the entry exists so the next reader does not re-derive the measurement.**
`derivePackPrice`, `applySupplierMemory`, `resolveMatchedPrice`'s branch 2 and `packToUnitCost` each carry "pack price + pack size -> unit price".
`tests/pack-arithmetic.test.js` runs all four over 8 line shapes x 8 pack shapes and asserts they agree: **48 answers, 16 mutual refusals, 0 disagreements**, proved to go red by diverging one copy's gram factor.

**Extracting the shared core is the tidy-up.** It was deliberately not done in 261: it touches four shipped functions on the money path **and about fourteen test sandboxes** that extract one of them and would throw `ReferenceError` without the new dependency — a large diff for zero behaviour change. The standing test already buys what the merge would buy, which is that they cannot drift apart unnoticed.

**Two things the merge must decide rather than absorb, both pinned in that test:**
- **`packToUnitCost` labels a count `unit` where the other three say `ea`.** Same number. Both spellings are deliberate — the product form and the catalogue preview say "per unit", the invoice path says "ea" — so the shared core should return the number and leave each caller its own vocabulary.
- **`packToUnitCost` guards with `isNaN(price)` where the others use `isFinite`**, so it alone accepts an infinite price, and it compares `unit==='kg'` **without lowercasing**, so an uppercase stored unit would take the count branch. **Neither is reachable** (measured: `catNum` strips the exponent, Chromium sanitises `1e400` to `''`, and all 23 non-null `pack_unit` rows on production are lowercase) — but a merge picks one guard, and picking the stricter one is a real change in an unreachable case that should be stated rather than slipped in.
**The casing one is a 1000x error in `cost_per_base_unit`** if it is ever reached: an uppercase unit misses every branch and lands on the count branch, so a kilogram price is stored as a per-unit price.
⚠️ **This paragraph claimed BOTH were "pinned in that test" when only the Infinity one was** — the casing divergence was prose, in both this file and the consolidated queue. Caught by batch 261's pre-push review, which read the test instead of the claim; the second pin was added in the same batch, so the sentence is now true. **It is left written out because a comment asserting coverage a test does not have is this repo's most-recorded defect, and it was committed here by the batch whose entire subject was measuring rather than asserting.**

**Ride it with whichever batch next opens that region for another reason**, per this file's rule.

## C — from batch 262 (item 46, 13 Sep 2026)

### `fresh-states.spec.js` asserts the Menu secondary's label on a HIDDEN element, so it cannot see how it renders

Anchor: `page.locator('#menuAddDishBtn').innerText()` in `tests/visual/fresh-states.spec.js`

**Found by a first cut of item 46 going red for the right reason.** The Menu header's `#menuAddDishBtn` was given the app's `.btn-noun` collapse and the spec was updated to assert the shortened form; it failed with the FULL text at a 380px viewport.

**The mechanism is worth keeping even though that label no longer collapses.** In a fresh state there are no menus and no eligible plates, so `updateMenuAddDishBtn` sets `hidden` on the button - and **Playwright's `innerText()` on a hidden node returns the raw text rather than the rendered text.** So the assertion has never observed anything about layout, while its message said *"it already fits"*, which is a rendered-width claim.
That is `CLAUDE.md`'s *"a comment can record the defect correctly and file it under the wrong consequence"*, in an assertion message rather than a comment: the string being asserted was right, and what the message said it proved was not.

**What it would take:** a spec that drives the Menu screen **with a menu and a costed plate in it**, so the button is actually displayed, and then asserts the rendered label at 380 and at desktop. That is a fixture, not a one-line change, which is why it is filed rather than done - and the label it would pin is currently the same at both widths, so nothing is unprotected today. **It becomes worth building the moment any Menu-header control takes a `.btn-noun` again.**

### Other `tests/visual/` specs may still assert exact float geometry or sleep through a transition

Anchor: `getBoundingClientRect` in `tests/visual`

Batch 262 fixed two instances (`v143-dashboard.spec.js`'s exact float equality, `226-bottom-stack.spec.js`'s 300ms sleep); the residual work is the sweep both left:
**Any other `toBe` on a `getBoundingClientRect()` value in `tests/visual/` is the same defect waiting**; they are not swept here because each one needs its own tolerance argued from what it is protecting.

**Any other fixed `setTimeout` waiting on a transition in `tests/visual/` is the same defect waiting.** They are not swept here because each needs to know which element's settling it is waiting for.

⚠️ **And the meta-lesson, which cost more than either flake: `v143-dashboard` and this one BOTH reddened on a diff that could not reach them**, and the honest first reading of a red test is *"my change broke this"*. **Run a suspect spec three times in isolation AND once as part of a full run on clean `main` before investigating your own diff** - the two differ, and this one only fails in the second.

## C — the 12 Sep 2026 standards audit (outside this repo, `~/Desktop/brain-ops`), open rows only

**Eleven of its twelve EzPlate gaps had NO DETECTOR**, so an open row here is only closed by something that can go red.

### E11 · The RLS tests assert SQL **text**, not the deployed grant

Anchor: `They read SQL text, so they cannot prove a policy behaves` in `tests/roles.test.js`

**OPEN, and deliberately after the October relaunch.** `CLAUDE.md` already carries the measured version of this: check `proacl`, never the file.

### E12 · No CodeQL, axe-core or perf budget

Anchor: absent `codeql` in `.github/workflows/test.yml`
Anchor: absent `axe-core` in `package.json`

**OPEN, lowest.** `git ls-files .claude/` lists only `settings.json`, which was the part of it that mattered.

## C — from batch 264 (gaps E3 and E4, 15 Sep 2026)

### Three EzPlate-specific skills are still outside the repo, and E4 was declared closed without them

Anchor: absent `new-branch` in `skills`

`~/.claude/skills/new-branch`, `~/.claude/skills/investigate` and `~/.claude/skills/test-flows` are all written **about this project** — `new-branch` runs `npm test` here and cites `CLAUDE.md` by name; `investigate` and `test-flows` describe EzPlate's own screens — and all three live in Max's home directory. A fresh clone gets `skills/` (batch, cache-version, decide, handover, verify), gets the reviewer as of 264, and does not get these.

**This is the same gap E4 named, found while closing it.** E4's own done-when is *"clone to a temp dir: the reviewer resolves and the RLS material is present"*, which these three pass by not being mentioned — the row can be ticked with the defect still in place. **A done-when that enumerates is a done-when that stops at the end of its list.**

**The move is not free and that is why it is filed rather than done.** `.claude/skills/` is gitignored on purpose (it holds symlinks, which are facts about one machine), so landing them means putting the bodies in `skills/` and re-pointing three symlinks — and `test-flows` duplicates the `flow-tester` agent, which is *also* at `~/.claude/agents/`, so the honest fix is to move the agents too and decide whether the skill and the agent are one thing. That is a batch, not a rider.

**Ride it with whichever batch next opens `skills/`.** Until then: a clone of this repo can run `/batch` and cannot run `/new-branch`, and nothing says so.

### Comments across the repo cite `CLAUDE.md` for text that is now in `.claude/rules/`

Anchor: `CLAUDE.md's roster` in `tests/boot-gate.test.js`

**25 test files, `js/app.js` (90 mentions) and `css/style.css` (26)** point at `CLAUDE.md` by name for rules that moved in 264 - *"CLAUDE.md's roster"*, *"CLAUDE.md Tier 1"*, *"CLAUDE.md's Tier 1 corollary"*. The rule is intact and the pointer is not.

**It is filed rather than fixed, and the reason is the one thing that makes it tolerable: in almost every case the text now arrives anyway.** A comment in `tests/*.js` citing the roster sits in a file whose own rule file (`.claude/rules/tests.md`) the harness loads when that file is read; the same is true of `js/app.js` and `css/style.css`. So the reader gets the content and a wrong address, rather than nothing.

**Do not sweep all 141 mentions.** Most are a phrase inside a sentence about something else, and a find-and-replace across three files that ship to a phone is a large diff with no test behind it. **Correct the ones in whatever file a batch already has open**, which is what this file is for, and prefer naming the rule file directly (`.claude/rules/tests.md`) over `CLAUDE.md`.

⚠️ **The honest risk, stated because it is the one this split actually creates:** a reader who follows the pointer, greps `CLAUDE.md`, finds nothing, and concludes the rule was DELETED. `CLAUDE.md`'s own header says where the evidence went, which is the mitigation, and it is a weaker one than a correct pointer would be.

### A `PreToolUse` hook is the only mechanism that would close the split's read-trigger gap

Anchor: absent `PreToolUse` in `.claude/settings.json`

**Found by 264's own pre-push review, and it is the one finding that batch could not close.** `.claude/rules/*.md` load when Claude Code **reads** a file matching their `paths:`. Creating a new file does not read one, and `cat`/`grep`/`sed` is not a read. So the session most likely to need `sql.md` - one writing a fresh migration under `supabase/migrations/` - is the session least likely to have loaded it, and **nothing reports that it did not load**, which is the same shape the split was built to fix, one level up.

**264 shipped two mitigations and both are reminders, not controls:** `CLAUDE.md` states the gap, and `skills/batch/SKILL.md` says to open the rule file by hand when creating or planning. The repo's own doctrine is that a rule an agent is asked to follow is a suggestion.

**The mechanism, if it is wanted:** a `PreToolUse` hook matching `Write|Edit`, reading the target path out of the tool input, and returning the matching rule file's path as `additionalContext`. Claude Code's own documentation names `PreToolUse` as the thing to reach for when an instruction must hold regardless of what the model decides.

⚠️ **It is filed rather than built, deliberately.** 263 had just filtered and bounded the one existing hook after it ran 134 test files on every edit; building a second hook class on the same day, in the batch whose whole job was to make the instruction layer *less* risky, and unasked by the item, is the wrong order. **Whoever takes it owns proving it fires** - a hook that silently does nothing is worse than the gap, because it reads as closed.

## C — from batch 267 (item 57, 15 Sep 2026)

### A category, brand or supplier typed on a form can FORK an existing value, and nothing notices

Anchor: `resolveCombo` in `js/app.js`

Queue item 57 asked for *"normalise whitespace on save"*, naming the double space in `HERBS  SPICES & SEASONINGS`. **That fix, taken literally, is worse than the defect.** The double-spaced strings are on dozens of production rows, so saving one product with the collapsed form leaves `HERBS  SPICES & SEASONINGS` on forty products and `HERBS SPICES & SEASONINGS` on one — two categories that `catLabel` renders **identically**, in the same filter list, one of which will look empty. The item's own requirement says *"store as-is"*, and the two halves of it disagree.

**Nothing user-visible is gained by normalising alone:** `catLabel` already collapses whitespace at every read-only render (`renderIngredients`, `renderKitchenPanel`, both `fillFilter` category selects, and `updateKingCat` as of 267), so a user never sees the double space outside the Tidy modal, which exists to show it.

**The fix worth building is a canonicaliser, not a normaliser**, and it prevents forks instead of causing them:

```
canonicalValue(existing, input)
  key = input.trim().replace(/\s+/g,' ').toLowerCase()
  → an existing value whose own key matches, VERBATIM        // reuse, never fork
  → else input.trim().replace(/\s+/g,' ')                    // a genuinely new value, tidied
```

Applied on save at the six combobox fields that write one of these three columns: `f_category`/`f_brand`/`f_sup` (create), `ig_cat`/`ig_brand`/`ig_sup` (edit), and the invoice add-new's `ni_cat`/`ni_brand`/`ni_sup`. It catches the CASE fork too — typing `desserts` where `DESSERTS` exists is the commoner of the two and today makes a second category.

⚠️ **It is a WRITE-path change to strings the invoice parser matches on**, which is why it is filed rather than ridden: `tests/cat-label.test.js`'s scope guard exists precisely to keep a display transform off the write path, and this is a different thing that will look like the same thing to the next reader. It needs its own regression test proving the reuse arm returns the STORED spelling byte for byte, plus a parser-corpus run either side.

⚠️ **THIS ENTRY SAID "filed rather than ridden" AND THEN "Ride it with whichever batch next opens `openIngEdit` or the add-new form" IN THE SAME PARAGRAPH, AND BATCH 282 WAS THE FIRST TO REACH THAT CONDITION AND HAD TO DECIDE WHICH HALF MEANT IT.** (22 Sep 2026, under `CLAUDE.md`'s standing documentation authority.) **The first half is the one that holds**, and the reason is measurable rather than a preference: this touches **six combobox fields across three forms**, changes strings the invoice parser matches on, and owes a parser-corpus run in both directions. 282 was an **[A]** fix writing a wrong cost to the database; folding a six-field write-path canonicaliser into that PR would have diluted the review of the half that matters, which is `CLAUDE.md`'s "the batch would exceed what one PR can be reviewed as" arriving as a rider instead of as a scope decision.

**So the ride condition is REPLACED rather than deleted, because "never rides" would strand it exactly as the old process rule stranded workflow work.** It rides a batch that is **already changing a write path on one of those three forms and already owes a parser-corpus run** — not one that merely opens the file. A batch that only reads or edits display code on `openIngEdit` takes nothing from here. **If you skip it under this rule, say so in the handover**, so a skip and a miss stay distinguishable.

**It does NOT fix the rows already forked or already double-spaced.** That is a rewrite of production data and is Max's, every time.

### `.mnu-sec` renders a data value in forced capitals, and 267 deliberately left it

Anchor: `.mnu-sec` in `css/style.css`

The Menu screen's group row prints a section name (`sp.category` / `m.section`) through `text-transform:uppercase`, so a menu reads `MAINS` where the Plates library's `.plib-cat`, the Add-dish picker's `.ad-meta` and the Menu's own category filter all say `Mains`. Same string, two voices, one screen apart — the class item 57 was about.

**Kept, considered, not missed.** It is a GROUP HEADING, which is the one place this design system's small caps are a typographic device rather than a shout, and `css/style.css` records it as *"the mock's uppercase group row"*. Item 57's own requirement says to drop the transform for product NAMES and keep it for labels, and a group row is a label for the rows beneath it.

**Recorded because the judgement could go the other way**, and if it does it belongs to **consolidated item 61** (the Menu screen), not to a casing sweep: changing it changes the Menu screen's rhythm and wants deciding beside 61's chip-vocabulary work, in one look at one screen.

### Two product-identity surfaces batch 267 deliberately did NOT migrate

Anchor: `invMatchOptions` in `js/app.js`
Anchor: `val:Math.abs(pct)` in `js/app.js`

267 put `Product — Brand · Supplier` behind one builder (`productIdentity`) and moved eight render sites onto it. Two more print the same object and were left hand-rolled, on purpose. Both are recorded at the helper's own site; they are here so they are findable by someone who is not already reading that comment.

- **`prodOptions` / `invMatchOptions`** — the invoice review's product-match `<option>`s. Migrating adds a supplier to ~400 option labels in the densest control on the screen where a wrong pick stores a wrong price, and `invMatchOptions` appends the coverage percentage **after** the label, which a native select truncates from the right — so the thing lost first is the number the user is choosing on. `.claude/rules/invoice.md` makes that screen regression-test territory: whoever takes it owes a `tests/parser-corpus/run.js` pass either side and a look at the select at 380.
- **The trend/Dig-in row names** (grep `val:Math.abs(pct)`) — these `name` strings are passed to `api/insight` as FACTS. Changing what the model is given is not a presentation change. The money/number law says an AI helper may only phrase numbers the app already computed, and the validator rejects a phrasing carrying a number absent from the facts; a supplier name is not a number, so this is safe rather than forbidden — but it is a change to the model's input and wants deciding as one.

**Ride either with a batch that already opens its screen.** Neither is a defect today: each is internally consistent, and the reason they are worth recording is that the MIGRATED list is now long enough to read as complete.

## C — from batch 282 (item 102, 22 Sep 2026)

### `#ig_pricePer` does not exist, and two lines of `js/app.js` have been writing into it

Anchor: `ig_pricePer` in `js/app.js`
Anchor: absent `id="ig_pricePer"` in `index.html`

`openIngEdit` and `syncIgUnitFromPack` each do `var lp=document.getElementById('ig_pricePer'); if(lp) lp.textContent=igPriceSuffix();`.
`index.html` has no such element, so both are inert and `igPriceSuffix` — which returns `/kg`, `/L`, `/mL`, `/g` or `/unit` — is called by nothing that renders.
Grepped, not assumed: the id appears twice in `js/app.js`, zero times in `index.html`, zero times in `css/style.css`, zero times in `tests/`.

**Not a defect, and it got MORE valuable in 282 rather than less**, which is why it is filed instead of deleted.
The field is labelled "Price per unit ($)" and holds a price per **kg, litre or unit** depending on the product, and until 282 the unit beside it was always locked, so the label's vagueness cost nothing a user could act on.
Now the unit is **settable** on a product that has none: someone picks "per kg" and types a number into a field that does not say `/kg`.
The read-out under the pack (`#ig_calc`) says it whenever a pack is entered, and nothing says it when one is not.

**Two ways to close it and they are not equivalent, which is why this is not a fix-on-sight.**
Adding a `<span id="ig_pricePer">` inside `.field label` inherits that rule's `text-transform:uppercase` — the exact trap 267 recorded when it moved the pack hint OUT of a label — so the element has to sit outside the label, and then "/kg" alone reads as debris rather than as help.
The alternative is to put the unit in the label text itself and drop the element, which makes `igPriceSuffix` dead and deletable.
**Either is a copy decision on a form Max uses, so it wants deciding rather than picking.**
Ride it with whichever batch next changes the Edit-product form's layout.

### `igUnitWord` sends everything it does not recognise to "unit", and one caller printed the same word twice

Anchor: `b==='ml'?'volume':'unit'` in `js/app.js`

`igUnitWord(b)` is `b==='g'?'weight':b==='ml'?'volume':'unit'`, so a base unit of `"unknown"` renders as **"unit"** — the same string `'ea'` renders as.
Measured in a browser during 282: `igPackFill`'s mismatch line read *"That pack is measured in unit, but this product is stored per unit."*
**Unreachable as of 282** — `igEffectiveBase` now returns only `'g'`, `'ml'`, `'ea'` or null, so `d.want` can no longer be an unrecognised string — and it is recorded because the function itself still has the shape, and the next caller to hand it a raw stored `base_unit` gets the same sentence back.
**The honest fix is the `igStoredUnitType` shape: return null for what it does not know and make each caller say what it does with that.** It is three lines and one caller; it is filed rather than done because 282's diff is already an [A] money fix and this is now latent.

### `saveIngEdit` is NOT a mutation target, and `logHistory(_prodWrite)` was deletable with the whole suite green

Anchor: absent `fn: 'saveIngEdit'` in `tests/mutation/targets.js`

282 tried to add it and backed out, so this entry is the measurement rather than a suggestion.

`saveIngEdit` writes `cost_per_base_unit`, which is the one column `CLAUDE.md` says this app must never get wrong, and it has never been asked the mutation question.
**Added as a target with `tests/unitless-product-price.test.js` alone, it produced THREE survivors.**
Adding `price-log-paths.test.js`, `change-log.test.js` and `product-pack.test.js` to the claim took it to two, which is the useful half of the measurement: **those files name `saveIngEdit` in their prose and do not exercise it** - they test extracted pieces around it.

**Two of the three are now dead and their assertions are committed**, because they were about the write rather than about the form:

- **`logHistory(_prodWrite);` deleted entirely, and nothing went red.** That is the call deciding whether a product price change is ever recorded in `ing_price_history`. `tests/unitless-product-price.test.js` now asserts it fires exactly once and receives `setProduct`'s own returned write by IDENTITY, which is 247's gate rather than a call count.
- **`(pu||'ea')` flipped to `&&`**, which keys a supplier-memory entry on the empty string. Pinned, with the `pq>0` vs `pq>=0` sibling.

**ELEVEN survive and they are why the target was backed out**, all in branches item 102 had no business claiming to pin: the three `resolveCombo` arms for brand, category and supplier; the `isNaN(price)||price<0` validation; and 280's `current_price_exgst` guard (`String(packPriceRaw||'').trim()===''||isNaN(packPrice)`), whose `||`→`&&` mutant stores `NaN` for a non-numeric pack price.
**Writing eleven allowances would have been the dishonest option** - an allowance says "this mutant cannot matter", not "I did not test this", and `tests/mutation/targets.js`'s own header says a target's `tests` list is a CLAIM the gate exists to check.

**What it needs:** a test that drives `saveIngEdit` through each of those branches against the real function, the way the new file drives the unit ones - the sandbox already exists and takes an options object, so this is assertions rather than scaffolding.
**Then add the target in the same change**, so the claim and the coverage land together.
Ride it with whichever batch next has a reason to open the Edit-product form's write path.

