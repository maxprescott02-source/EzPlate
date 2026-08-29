# REVIEW-221 - the recovery draft survives a plate save the server rejected

Reviewed-commit: 833be985635c07fc1114f2906cf38db35932bb43

Pre-push `code-review` agent, Sonnet against Opus 5, on `git diff main...HEAD`, without the brief or
the queue item in the prompt. **TWO passes**, because the first pass's fixes changed the mechanism
substantially - a new module-level counter and a new term in a guard - and 215's precedent is that a
second pass over a reworked mechanism is where the expensive defects turn up. It was here too.

⚠️ **Same independence caveat as REVIEW-220:** the agent was not handed the item, but it reads the
repo, which contains `docs/QUEUE.md`.

**Four defects in total, and the item's own fix was one line.** Three came from the reviews and one
from applying the first review's lesson back to the batch's own work. None was in the shipped app
before this batch except the last, which was latent and which this batch would have escalated.

---

## PASS ONE - the agent's findings, verbatim

> **1. MAJOR — `_builderEdits` is a global, whole-app counter, not a per-plate one, and this diff newly makes it gate whether the recovery draft survives a *successful* save.**
>
> `js/app.js:2888` — `scheduleDraftSave()` (and thus the `_builderEdits++` it does) is triggered from `renderPlate()`, which is called from flows that have nothing to do with the currently-open plate — e.g. `saveIngEdit()` at `js/app.js:4383` (`renderIngredients(); if(typeof renderPlate==='function') renderPlate(); ...`) fires whenever *any product's* price/name/pack is edited on the Ingredients (Products) tab, and several other unrelated flows do the same (`js/app.js:11390`, `11967`, `12025`, `12039`). `_draftArmed` (`js/app.js:2873`) is set once by `openBuilder()` and never reset for the rest of the session, so every one of these calls, anywhere in the app, counts as a "builder edit" once the builder has been opened once.
>
> `saveCurrentPlate` now uses that same counter to decide whether to run `clearPlateDraft()` on a *successful* write (`js/app.js:3014-3018`, `_plateLanded`). Sequence: user saves a plate in the builder, the write is in flight; before it resolves, the user switches to the Products tab and edits an unrelated ingredient's price (`saveIngEdit`); `_builderEdits` bumps. When the plate write later resolves successfully, `_builderEdits!==_editsAtPush`, so `_plateLanded()` — and therefore `clearPlateDraft()` — is skipped, even though the save genuinely landed on the server. `cafeDB_plateDraft` is left behind. Next time the user (a "goes a week between uses" user, per CLAUDE.md) opens the builder for any plate, `unfinishedPlateWaiting()` (`js/app.js:9013`) reads `draftHasContent(readPlateDraft())===true` and fires "You were building X. Resume it, or discard?" for a plate that was already saved correctly — a permanent false nag until someone happens to hit that exact code path with a matching counter again.
>
> Before this diff, `clearPlateDraft()` ran unconditionally and synchronously on dispatch, so this counter mismatch could only ever affect the cosmetic badge, never data. This diff extends the same guard to a case where being wrong has a lasting, user-visible consequence, without checking that the guard's assumption ("this counter only moves when the user edits the SAME plate") still holds for the new use. It doesn't — it moves on literally any `renderPlate()` call app-wide.
>
> Confidence: high on the mechanism — traced `_draftArmed`'s single set-and-never-reset, confirmed `scheduleDraftSave` increments unconditionally before checking `_draftArmed`, and confirmed `renderPlate()` is called from unrelated screens.
>
> **2. MAJOR — moving `clearPlateDraft()` off the synchronous dispatch line opens a window where "Discard" on the Unfinished-plate guard destroys the draft for a save whose outcome isn't known yet, reproducing the exact bug this batch fixes via a different trigger.**
>
> `js/app.js:2986` no longer clears the draft synchronously; the clear now waits for `_write.then()` (`js/app.js:3016-3018`). Nothing blocks navigation while `_write` is in flight — no disabled button, no lock. If, between clicking Save and the promise settling, the user reaches one of the four guarded entry points (`openBuilderNew`, `editPlateFromCard`, `requestLoadPlate`, `requestLoadMenuItem`), `unfinishedPlateWaiting()` (`js/app.js:9013`) is true — `isBuilderDirty()` is false (the in-memory `sp.lines`/`sp.name` were already optimistically overwritten by the synchronous part of `saveCurrentPlate`, `js/app.js:2983`), but `draftHasContent(readPlateDraft())` is still true because the draft hasn't been cleared yet — so `guardUnfinishedPlate` (`js/app.js:9025-9029`) fires "Unfinished plate — resume or discard?" If the user picks **Discard**, `clearPlateDraft()` (`js/app.js:9028`) runs immediately, deleting the only local record of that in-flight save. If the still-pending write then resolves with `{error}` (offline drop, server rejection), the code path this whole batch exists to protect (`js/app.js:2997-3013`'s own comment: background the app, the edit is gone with nothing to resume) is reached anyway — just via "tapped through to another plate" instead of "backgrounded the tab." The comment block at `js/app.js:3010-3013` explicitly reasons about "no race with the debounced draft writer" but says nothing about this guard/Discard interaction, so it reads as though the race space was fully covered when it wasn't.
>
> Confidence: high on mechanism; reachability requires the user to act (tap into another plate, choose Discard) within the network round-trip window, which is plausible but narrower than finding 1 — this app is explicitly built around "an occasional user on mobile data," making that window non-trivial.
>
> **Test-fidelity note (minor, not a correctness bug on its own):** in `tests/plate-draft-save.test.js`, the harness's `edit()` stub (`api.edit=function(){ _builderEdits++; }`) only increments the counter; the real trigger, `scheduleDraftSave()` (`js/app.js:2888`), also calls `setBuilderSaved(false)` synchronously. Test 4 asserts `S.badge` deep-equals `[]` after an edit, but the real app would produce `[false]` at that point (from the edit's own `scheduleDraftSave` call) before any `_plateLanded` skip. The qualitative claim the test makes ("badge stays down") is still true either way, so this doesn't hide a defect in the guard being tested, but the sandbox is not a faithful mirror of `scheduleDraftSave`'s real side effects — it's a hand-rolled partial stub rather than the extracted real function, the exact shape CLAUDE.md's roster warns about (extract, don't hand-roll).

*(The agent's "verified as sound" list is omitted here for length; it confirmed the core fix, pushWrite's contract, the debounced-writer race, the six cache spots and the duplicate-declaration guard.)*

### What was done

**1 — FIXED.** Verified first: `renderPlate()` really does call `scheduleDraftSave()` on its first
line, and its callers include `bootstrapSync`'s own repaint, which needs no user action at all.
The draft now asks **`isBuilderDirty()`**, which is the same call `savePlateDraft` already makes to
decide whether a draft should exist - so the writer and the clearer cannot disagree. The badge keeps
`_builderEdits`: it is claiming something about the PUSH, which is what that counter is for.

**2 — FIXED.** `_platePushPending`, a count (not a flag - two saves can overlap), decremented on
every settle path including the rejection arm. `unfinishedPlateWaiting` suppresses only the
STORED-DRAFT half while a write is in flight; a dirty builder is unfinished work whatever the network
is doing. ⚠️ **This had been reported to Max as an accepted trade before the review** - the spurious
prompt was known and judged tolerable. That judgement was wrong because it had not traced what
**Discard** does. A known cosmetic annoyance turned out to have a destructive branch.

**Test-fidelity note — FIXED**, and it was worse than reported: see the third defect below.

---

## BETWEEN PASSES - a third defect, found by applying pass one's lesson to the batch's own fix

Not from the agent. Pass one's finding 1 is really *"you adopted a guard without checking its
assumptions hold for your new use"*, so the same question was put to the newly-adopted guard.

**`isBuilderDirty()` compared the category RAW; `saveCurrentPlate` stores it TRIMMED.**
`#plateCat` is a free-text `<input>`, `builderCategoryValue()` does `.trim()`, and `name` one line up
was already trimmed for exactly this reason. So a category typed or pasted with a trailing space was
unequal to the value just written from it, and the builder read as dirty immediately after its own
successful save - a permanent "resume or discard?" about a plate that saved perfectly.

Latent before this batch (draft churn only, since the clear was unconditional); this batch is what
would have escalated it.

⚠️ **A STUB HID IT FOR A WHOLE TEST RUN.** The new test file stubbed `builderCategoryValue` to return
`''`, so the category never round-tripped and the mismatch could not appear. The real function is
extracted now. That is CLAUDE.md's oldest roster entry, biting inside the test file written to catch
this class.

---

## PASS TWO - the agent's finding, verbatim

> ## Finding 1 — CRITICAL: the pending-save protection can be wiped by navigating to a different plate before the write answers, reopening exactly the data-loss bug this batch fixes
>
> **Mechanism.** `unfinishedPlateWaiting()` (`js/app.js:9058`) now reads:
>
> ```js
> function unfinishedPlateWaiting(){ return isBuilderDirty() || (!_platePushPending && draftHasContent(readPlateDraft())); }
> ```
>
> Right after `saveCurrentPlate` dispatches a push, `sp.lines`/`sp.name`/`sp.category` have already been mutated in-memory to match the screen (`js/app.js:2990-2991`), so `isBuilderDirty()` is `false` before the server has answered anything. With `_platePushPending>0` at that same instant, the second clause is also forced `false`. So **`unfinishedPlateWaiting()` reports "nothing unfinished" for the entire in-flight window**, and `guardUnfinishedPlate` (`:9068`) lets its caller proceed with zero confirmation.
>
> But `guardUnfinishedPlate`/`unfinishedPlateWaiting` is only one of several ways to replace the builder's contents. `requestLoadPlate` (`:8849`) and `requestLoadMenuItem` (`:8813`) gate on `isBuilderDirty()` alone — not on `unfinishedPlateWaiting()` — and were never touched by this diff, so they inherit the same blind spot directly.
>
> Whichever door is used, loading different content calls `renderPlate()`, whose first line is `scheduleDraftSave()` (`:2899`), which — 250ms later — runs `savePlateDraft()`. That function is **unconditional about which draft it's looking at**: `:2862` does `if(!isBuilderDirty() || !draftHasContent(d)){ localStorage.removeItem(DRAFTKEY); return; }`. Since the newly-loaded/blank builder is never dirty immediately after loading, this call removes the **one shared `DRAFTKEY` slot outright** — including the safety copy of the still-pending save from the plate the user just left.
>
> When that original save later settles as a failure (offline, 4xx, timeout — the exact case this whole batch exists to protect), `_plateLanded(false)` (`:3027-3028`) only decrements the counter and returns; it does nothing to restore the draft. Result: the edited plate exists only in the in-memory `sp` object inside `savedPlates`, was never confirmed by the server, and has no recovery draft. A background/kill (iOS), a reload, or the next `bootstrapSync` replacing `savedPlates` from the server erases it permanently, silently.
>
> **Verified by execution**, not just reading — I extracted the real `saveCurrentPlate`, `startNewPlate`, `renderPlate`(delegating to the real `scheduleDraftSave`), `savePlateDraft`, `isBuilderDirty`, and `unfinishedPlateWaiting` out of `js/app.js` via `tests/_extractfn`, and drove the sequence: save a plate (write left pending) → `unfinishedPlateWaiting()` → `false` → `startNewPlate()` (simulating an unguarded "+ New plate") → wait 260ms → draft is `null` → resolve the original write as a failure → draft is still `null`. Output:
>
> ```
> draft immediately after save() dispatched: {"name":"Barra Basket","lines":[{"kid":"K1","qty":2}]}
> _platePushPending: 1
> unfinishedPlateWaiting() right before + New plate is clicked: false
> draft 260ms after "+ New plate": null
> draft after the pending save FAILS: null
> ```
>
> **What breaks, concretely:** on the exact mobile-data/spotty-signal scenario this app is designed around, a user taps Save, then — before the write answers — taps a different plate row (or "+ New plate", or "Load menu item") to keep working. If the save fails, the edit they just made is gone with no recovery draft and no durable record beyond a toast that has already scrolled away.
>
> **Confidence:** high — reproduced against the real shipped functions, not a hand-rolled stub. None of the five new tests in `tests/plate-draft-save.test.js`, nor the rewritten assertion in `tests/plate-draft.test.js`, exercise this path (they only ever call `saveCurrentPlate` and then read the draft/badge/`unfinishedPlateWaiting()` in place — never a subsequent `loadPlateState`/`startNewPlate`/`requestLoadPlate` while the push is still pending), so this regression would ship green.
>
> ## Finding 2 — minor: `isBuilderDirty()` can go stale if `bootstrapSync` races the push it's meant to validate
>
> `isBuilderDirty()` (`:8820`) re-resolves `sp` via `savedPlates.find(loadedPlateId)` at call time. `bootstrapSync` reassigns `savedPlates` wholesale from a fresh server SELECT (`js/app.js:1243`) with brand-new objects, not the same references `saveCurrentPlate` mutated. If that SELECT happens to run (and return) before the in-flight push's own commit is visible — a genuine race between two independent requests — `_plateLanded`'s `isBuilderDirty()` check compares the live builder against a stale `sp`, sees a mismatch, and leaves the draft in place even though the save actually succeeded. Direction of the failure is safe (keeps a draft rather than losing one), but it produces an incorrect "Unfinished plate — resume or discard?" prompt for a plate that is, in fact, saved and correct on the server. Not data loss; a UX inconsistency. I did not reproduce this one (would need a real two-request race), so flag it as a plausible but unverified secondary concern — worth a comment or acceptance note near `_plateLanded`, not necessarily a fix.
>
> ## Everything else checked and found clean
>
> - `_platePushPending` itself cannot go negative or leak in the paths reachable from `saveCurrentPlate`: `pushWrite` (`:252`) always resolves (never rejects) to a value or `{error}`, so the `.then(ok, fail)` pair in `saveCurrentPlate` settles exactly once per push and decrements exactly once. Two overlapping saves increment/decrement independently and net back to zero. The non-thenable `else` branch (`_write` always being a real Promise in practice) makes that branch dead code — a nit, not a bug.
> - The `_builderEdits`→`isBuilderDirty()` switch for the *clear* decision (keeping `_builderEdits` for the badge) is sound reasoning and matches the tests pinning it (`REVIEW 1`).
> - The four other sandboxes that gained `_platePushPending`/`isBuilderDirty`/`lineSig`/`currentLinesSig` extraction stub `clearPlateDraft`/`savePlateDraft` as no-ops, so the newly-real `isBuilderDirty()` only has to not throw there — confirmed it doesn't (all 104 relevant tests pass), and it doesn't change what those tests are measuring.
> - `tests/plate-draft.test.js`'s rewritten source assertion correctly pins both halves of the new OR rather than loosening to a single regex, and is honest in its own comment that a source match is weak without `plate-draft-save.test.js` backing it — reasonable.

### What was done

**Pass-two finding 1 — FIXED, at the WRITER rather than at the guards.** Confirmed the mechanism by
reading `savePlateDraft`'s removal line and `requestLoadPlate`'s gate. The fix is in
`savePlateDraft`: it no longer removes the shared slot while `_platePushPending` is non-zero. It went
there rather than into the guards precisely because, as the finding says, **the doors are not all
guarded** - `requestLoadPlate` and `requestLoadMenuItem` consult `isBuilderDirty()` alone, which is
false right after a save, so they never even ask. Fixing the guards would have left those two open.
The **counterweight** is pinned in the same test: with nothing pending, a stale draft is still binned,
which is `savePlateDraft`'s v118 job and which "never remove" would have silently repealed.

⚠️ **One limit is accepted and written at the site rather than fixed:** one slot cannot hold two
plates, so navigating away AND authoring a NEW plate mid-flight writes the new work over the pending
copy. That is a genuine conflict between two pieces of unsaved work; a draft LIBRARY keyed by plate
is the real answer and is a feature, not a guard.

**Pass-two finding 2 — ACCEPTED, NOT FIXED**, exactly as the reviewer suggested, with the reasoning
written at `_plateLanded`: the direction is safe (a spurious prompt, never lost work) and the next
clean repaint clears it. Building against an unreproduced race would be more machinery than the
symptom justifies.

**The "dead code" nit — NOT changed, deliberately.** The non-thenable `else` branch is unreachable
while `dbPushPlate` returns `pushWrite`'s promise, and it predates this batch. Deleting it is a
behaviour change to a defensive branch for no benefit, and CLAUDE.md routes nits to a later batch.

---

## The pattern this review is worth recording for

**The item's fix was ONE LINE. Reviewing it found four defects**, and three of them were in the fix
rather than in the app. Every one was invisible to a green suite: two passes of `npm test`, smoke,
Playwright and the mutation gate were green at the moment each was found.
**Two of the four were only ever going to be found by EXECUTING the code** - pass two's by the
reviewer driving the real functions, and the category one by extracting a real function the test had
stubbed. Reading found the other two.
