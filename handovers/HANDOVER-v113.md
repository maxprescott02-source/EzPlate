# HANDOVER v113 — commit-before-check

**Branch:** `fix/v113-commit-before-check` · off `origin/main` @ `3985d9c` (the PR #53 merge, which
landed v112 — the v112 snapshot said `96c648f` and was already stale, the fourth batch running).
**Date:** 5 Aug 2026.
**Brief:** `~/Downloads/ezplate-opus-batch-a.md` — two defects, one shape: the app lets a user commit
something before the check that would have caught it has run.

**Suite:** `npm test` **680 green** (643 → 680: +13 `invoice-gate`, +24 `publish-guard`) · jsdom smoke
green · Playwright **94/94** · `node -c` clean on `js/app.js`, `sw.js` and all four `api/*`.

## A note on the Playwright run — read this before diagnosing a red suite

The suite went **85 passed / 9 failed** on one run, and **every one of the nine was
`Test timeout of 30000ms exceeded`** on tests that took **5.1–16.8 minutes of wall clock** — in a suite
that completes in **1.7 minutes** when the machine is idle. Load average was 4–6, from other work on
the Mac (checked: no orphaned Playwright or Chromium processes; that was Max's own Chrome). Re-run on a
quieter machine, the same specs pass at ~3 s each.

Two things worth carrying forward:

- **CLAUDE.md's "run the Playwright suite alone; check the machine before diagnosing the code" is not
  boilerplate.** An 18× slowdown turns a healthy suite red, and it reds out the *slowest* specs —
  dashboards, screenshots, flows — none of which this batch touches.
- **Do not pipe the run through `tail -3`.** That is how the first sighting got misread: the summary
  line survived, the `9 failed` heading did not, and the output looked like a clean run with a smaller
  count. Capture the whole output to a file.

## CodeRabbit

**The CLI review TIMED OUT before completing** (`Review timed out`, review id
`f0722efa-e029-486b-9a5d-ee49b8b521bd`) — so this is a PARTIAL review, not a clean bill. It emitted
exactly one finding before dying, and that finding was real:

> `linkDishToPlate` did not call `setCurrentMenuId` / `buildMenuSelector`, where `submitMenuItem`
> does.

**Fixed, and it matters more than "consistency".** The Publish modal can target a menu **other than
the one on screen**, and the prompt lists unlinked rows on the *chosen* menu. So linking one would
have left the user looking at a different menu with nothing visibly changed — they'd have had no
evidence their action did anything. Pinned by `linking follows the menu it just acted on`.

Because the review is incomplete, the GitHub CodeRabbit app should be allowed to review the PR — that
path has worked when the CLI times out ([[coderabbit-skips-untracked-files]]).

---

## Defect 1 — invoice matches could be applied before the AI referee returned

### What the code actually did

The brief described this from the decisions record and asked for it to be verified against the
pipeline first. It was accurate, and the sequence is worth writing down because it is not obvious:

1. `parseInvoice` (and the PDF path) set `gemStatus='checking'` **before** `buildInvRows`, so the very
   first render already carries the "AI double-checking…" chip.
2. `renderInvReview` drew every row **and a fully live `Confirm All`**. Nothing disabled it, ever.
3. Rows pre-tick from `invRowState` — and the referee can only ever **demote** a row.
   `gemPriceReview`, `gemMatchReview` and `gemReview` each push `invRowState` from `'matched'` to
   `'review'`, which un-ticks it.
4. `applyInvoice` sets `gemApplied=true`, and the guard in `gemFireSecondReader` then discards the
   response.

So the harm was exact: **a row the referee was about to flag was, during the window, rendered green
and pre-ticked, and Confirm All wrote it.** The check ran and ruled on nothing.

### ⚠️ THE FIRST FIX WAS AIMED AT THE WRONG POINT — Max caught it (6 Aug)

The first cut of this batch only disabled `Confirm All`. **Max rejected it, correctly:** a user can act
on every row long before they reach that button, and by the time the referee lands the rulings are
already made. He was right, and the mechanism is worse than "they acted on stale output" —
**a ruling made in the window SILENCES the referee for that line:**

| User action in the window | Sets | Effect on the referee |
|---|---|---|
| Picks a match (dropdown or chip) | `r.manualPick` | `gemRowLocked` → `gemApplyReadings` **skips the row whole** (`app.js:5913`) |
| Ticks an add-new row | `r.newItem.approved` | same total skip |
| Teaches a pack | `r.packTaught` / `r.taughtQty` | `T` true → `gemMergeLine` rule 1 `keep`, no adjudication at all |

and `invSelChanged` additionally clears `gemMatchReview` / `gemPriceReview`.

So the referee does not merely arrive too late to matter. **It defers to a human decision made without
it, and treats it as informed.** Gating the last step left every step before it exposed. The gate
therefore moved to `renderInvReview`, which now renders a **waiting panel and nothing actionable**
until the referee has spoken.

**This overrides the brief's "Do not block the whole review", which it listed as made and not to be
re-opened.** Justified on two grounds: the decision was taken without knowledge of `gemRowLocked`, and
Max — whose app it is — ruled the other way when shown the behaviour. CLAUDE.md's own recorded
principle points the same way: *"One occasional user on mobile data can wait for a fetch, and would
rather be told a thing did not save than discover it next week."*

**What it costs.** The user no longer sees rows instantly; they see a progress panel for the referee's
latency (typically a few seconds, server-capped at 15 s, watchdog at 20 s). That is the price of the
rulings being informed, and it is bounded and honest.

**Per-row progress is not expensive — it is fictional**, which is why the panel is one panel. There is
**one request for the whole invoice**; until the payload lands every row is equally unchecked and they
all flip in the same instant. Per-row spinners would fake a granularity this pipeline does not have.
The panel also deliberately **does not show the matched/new/review counts** — the referee changes them
(it demotes rows and appends its own), so a summary shown then would be a number that silently
rewrites itself.

**There was a real trap path already.** `gemFireSecondReader` only aborts where `AbortController`
exists, so a hung socket left `gemStatus==='checking'` forever. Harmless before this batch — the chip
just never flipped. **A permanent lock after it.** The watchdog is therefore required by the gate, not
belt-and-braces.

### What shipped

- **`invConfirmState(status, aiOn)`** — pure, returns `{disabled, unverified, hint}`. The whole
  condition lives in one place so tests pin the state rather than a flag.
  - referee outstanding → `disabled`, which is what `gemPending()` reads. Its hint ("Waiting for the
    AI check — usually a few seconds.") is no longer rendered anywhere, since the review does not
    draw at all in that state — so `confirmApplyInvoice` uses it as its toast rather than carrying a
    second copy of the wording.
  - `checked` → enabled, "Only ticked rows are saved." (unchanged wording)
  - `unavailable` → **enabled**, and "The AI check didn't finish — these lines haven't been
    double-checked."
  - AI check switched off (v81) → never gated. Gating on a check that never runs would lock the
    import forever.
- **`gemPending()`** reads that same decision, and it is used in exactly two places: the early return in
  `renderInvReview` (the real gate) and `confirmApplyInvoice` (the choke point every apply passes
  through, since `applyInvoice` is also reachable via `askConfirm`'s callback).
- **`renderInvWaiting`** — the panel. It renders no `<button>`, `<select>` or `<input>` at all; a test
  asserts that by name for each control class, because "nothing to act on" is the entire contract.
- **The Confirm All button carries NO `disabled` binding.** Reaching that line means `gemPending()` was
  false, so it could only ever render enabled — an attribute that cannot fire reads as a second gate
  and is not one (the v112 lesson about fallbacks that cannot fire). One gate, not a decorative pair.
- **A 20 s watchdog** in `gemFireSecondReader`, token-guarded.

**Timeout value, and what it is based on.** 20 s, measured from `gemCheckStart`. It sits outside both
budgets already in play: `api/parse-invoice.js` caps Gemini at **15 s** and always returns valid JSON,
and the client aborts at **20 s**. In the normal world the gate is released by the real terminal flip
long before this. The watchdog fires only when the pipeline itself failed to terminate, and lands on
exactly the state the abort path would have — so the race between them is harmless.

### A bug I shipped into my own fix, and the test that caught it

The first watchdog set `gemStatus='unavailable'` and stopped. But `token===gemToken` and
`gemApplied===false` were both still true, so **a response arriving after the gate released would
still have been merged** — breaking "a late response after a timeout is still discarded", which is the
rule the whole referee rests on. In the normal world the abort timer hides this; in the exact case the
watchdog exists for (no `AbortController`) it does not.

The fix is `gemToken++` in the watchdog — voiding the request exactly as a fresh parse does, which is
the mechanism already documented at the token's declaration. **Verified red**: with the bump removed,
`a late response AFTER the timeout is discarded` fails and the other ten pass.

### Three smoke assertions were deliberately changed

`tests/smoke.js` pinned the OLD contract — that the "AI double-checking…" note shows *beside live rows*,
and that the rows are byte-identical while checking and after a timeout. That contract was the bug.
Updated in the same commit (CLAUDE.md's rule): while checking, the waiting panel shows and `tbody` is
empty with no `#invApply`; the degradation check now compares the two states that both render rows
(`unavailable` vs `checked`), which is where "a failed AI check must not alter the deterministic rows"
actually lives. The flicker guard now holds up the *panel* rather than a note — same contract in
substance, and it gained an assertion that the rows appear only once it settles.

### What was deliberately NOT changed

The parser, the matching algorithm, the referee's rules, the model and the prompt are all untouched.
`gemApplied` still discards a late response after a human ruling (v62), unchanged. With the AI check
switched off (v81) nothing is gated and nothing waits — the deterministic review renders immediately,
exactly as today.

---

## Defect 2 — an unlinked row was invisible to the publish guard

### The enumeration came back different, as it always does

The brief asked for **every path that creates a dish**, warning that every enumeration in this project
has differed from the brief's guess. It did again. There are **two**, carrying the identical guard and
the identical hole:

| Path | Old guard | Blind to unlinked rows |
|---|---|---|
| `submitMenuItem` — Plates → Publish | `dishesOfPlate(sp).find(d => d.menuId===chosenMenu)` | yes |
| **`submitAddDish`** — Menu tab → Add existing plate | `dishesOfPlate(sp).some(d => d.menuId===currentMenuId)` | **yes — not in the brief** |

Everything else that touches `customMenu` is not creation: `rollbackPlateDelete` and `doDeleteMenu`'s
single-dish branch are v112's delete rollbacks, `upsertCustomMenu` is the generic upsert, and
`saveEdit` edits an existing row.

**Both now route through one shared `publishPlan`,** so the decision cannot drift between them again.

### Two further findings, flagged and NOT built (hard rule 5)

- **`ensurePlateForDish` is a second, silent healer with the wrong answer for an orphan.** Reached from
  the builder's "load menu item" (`loadMenuItemBlank`). It gives an unlinked row a **brand-new empty
  plate**. Correct for a genuinely uncosted row; for the v112 toastie it would have linked an empty
  plate and left the real recipe unreferenced — quietly making the loss look permanent. Needs its own
  brief and a decision, because the right behaviour depends on which case you are in and the app
  cannot tell.
- **No path creates an unlinked row.** Both creation paths set `plateId` from a real plate. So the
  orphan class **cannot recur through creation** — it can only arrive from history or from a **backup
  restore** (`rowToMenu` maps a null `plate_id` straight through). That confirms the brief's framing:
  this is a guard against a pre-existing orphan going unnoticed, not against a new one being made.
- `saveEdit` can MOVE an unlinked row onto another menu, producing the collision state without
  creating anything. Left alone: the user is looking straight at the row they are editing.

### What shipped

- **`unlinkedDishesOn(dishes, menuId)`** and **`publishPlan(dishes, plateId, menuId)`** — both pure,
  both resolving through `plateIdOf` and never the raw fields. `publishPlan` returns
  `{action:'update'|'create', existingId, unlinked}`.
- **One inline prompt**, no new screen and no new modal, in both modals: it names each unlinked row
  with its **section and price** (the two facts that let a human tell rows apart — they are what the
  v112 repair turned on), a **Link to this one** button per row, and a plain statement that the normal
  button adds a new entry instead. Neither option is preselected.
- **`linkDishToPlate(dish, sp)`** — sets the link and nothing else. Sequenced with
  `dbPushMenuAfterPlate`, because the row references the plate (`menu_items.plate_id → plates.id`).

**Judgement call, put to Max in the plan and confirmed:** linking keeps the row's **own** name, price
and section. It is already priced on that menu, and repricing it from whatever happens to be typed in
the modal would be the app deciding something it was not asked to. This mirrors the v112 repair, which
kept the Sandwiches section and the $8 price.

**No auto-heal and no name matching**, per the brief's settled decision. `publishPlan`'s
`plateId ? … : null` is load-bearing for this: `plateIdOf(an unlinked row)` is `null`, so a bare
`plateIdOf(d)===plateId` against a null id would read that row as "this plate is already here" and
quietly update it — an **auto-heal by accident**, the one thing that was decided against. Pinned.

### A gap the browser found that no unit test would have

The prompt originally called `unlinkedDishesOn` directly instead of reading `publishPlan`'s list. So
it offered the choice **even when the plate was already on that menu** — where the button UPDATES an
existing entry and duplicates nothing. Two computations of "should we ask?" is two chances to
disagree, which is the exact failure `publishPlan` was introduced to prevent, reintroduced ten lines
away from it.

This surfaced by opening the modal in Chromium against the fake-Supabase fixture, not from any test.
It is now `renderUnlinkedPrompt(boxId, plateId, menuId, onLink)` reading `publishPlan(...).unlinked`,
and in the Add-existing-plate modal the prompt follows the **selection** (`renderAddDishUnlinked`) —
picking a plate already on the menu withdraws the question. It has to: that Link button would
otherwise put a second row for the same (plate, menu) on the board, the very invariant the guard
exists to hold.

Also seen only in the browser: `.btn.ghost` is a transparent background **and** a transparent border,
so on the prompt's amber field the Link button rendered as a line of centred text rather than a
control. It is `.btn.small` now.

---

## Tests — conditions, not structure

`tests/invoice-gate.test.js` (11) and `tests/publish-guard.test.js` (21). Both build a sandbox from the
**real shipped function bodies** by brace extraction, following `delete-sequencing.test.js`.

The ones that carry weight:

- **On timeout, confirm unlocks AND the unverified state is communicated.** Both halves asserted. A
  fix that never unlocked would satisfy "locked while pending" and trap the user whenever Gemini is
  down; a fix that unlocked silently would let them rule on unchecked lines believing otherwise.
- **A late response after the timeout is discarded** — run against a controllable clock and a fetch the
  test settles by hand, so "it arrived after the timeout" is an observed sequence. **Verified red.**
- **Choosing "new entry" produces exactly one row; choosing "link" produces none** — and the linked row
  must **RESOLVE** through `plateIdOf`, not merely carry a set field. Row counts pass happily with
  every link null; that is the v110 trap in miniature.
- **Both creating paths route through `publishPlan`**, and neither keeps its own
  `dishesOfPlate(...).find/some` guard. If a third path appears, this fails and names it.
- The prompt harness uses the app's **own** `esc` and `fmt2`. A passthrough stub hid a real escaping
  question in copy that interpolates a user-typed name (`Cheese & Ham Toastie GF`).
- **The Link button's wiring is exercised, not just its markup.** The harness's `querySelectorAll`
  returns a stand-in per rendered `.up-link`, built from the HTML the renderer just wrote, so the click
  path runs end to end: renderer → `onclick` → `onLink` → `linkDishToPlate`. Returning `[]` there (the
  first draft) left the one action a user actually performs untested — the prompt could have rendered
  perfectly and done nothing. Also pinned: pressing Link with no plate picked says so rather than
  failing silently.

`tests/terminology.test.js` caught the first draft of the prompt copy: **"dish" is not a UI noun** — a
plate on a menu is still a plate. The copy describes the menu row without naming a fifth object.

---

## Needs Max's phone

Nothing here was verified on a device. Specifically:

1. **The invoice wait must read as progress, not as the app being stuck.** This is the one real risk in
   the batch. On mobile data after a week idle, the cold-start penalty (~1,138 ms, outstanding item 0)
   lands *before* the referee even starts. The disabled button plus "Waiting for the AI check" is
   honest, but only the phone says whether it feels like waiting or like breakage.
2. **The timeout path**, which is hard to provoke deliberately — if Gemini is slow once, check that
   Confirm All comes back and the amber "didn't finish" line is legible.
3. **Publish a plate normally** and confirm the prompt stays out of the way when there is nothing to
   warn about. Production has **0 orphan rows**, so the expected result is that you see nothing at all.
4. The prompt itself can only be seen by creating an orphan, which is not worth doing on real data.
   It was checked at 380px in Chromium: no overflow, the Link button clears the 44px floor.

## Not built, listed for Max

- `ensurePlateForDish`'s empty-plate heal (above) — its own brief.
- The restore path as an orphan arrival route.
- Everything the brief put out of scope: the menu change log, the COGS chart, floating layers,
  loading-state unification, the `ing_price_history` unique index, `edDelArmed`, `public.menus` RLS.

**No DB migration.** None was needed; nothing in this batch touches the schema.
