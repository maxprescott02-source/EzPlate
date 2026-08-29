# REVIEW-214 — the Menu screen's dead control, and the empty-state voice

Reviewed-commit: cdac60b
**Agent:** `code-review`, on **Sonnet** against work done on **Opus 5**, on the branch diff, without a brief.
**Outcome:** **no blocking findings.** Two minor notes, **both taken**.

---

## No defect found

The agent's conclusion, quoted in full because "nothing found" is the report and a summary of it in my own words would be exactly the silence this artifact exists to prevent:

> No wrong conditions, no writes that don't land, no sequencing defect, no silent failure, and no test that would pass against a broken guard. This is a well-executed instance of the "reuse the real function, re-run the guard from every mutation path" pattern the project's own history argues for.

What it verified rather than assumed, in its own words:

> **Guard reuses the real function, not a stub.** […] the exact same `eligibleDishes()` the picker […] filters from. Button and modal content are structurally incapable of disagreeing […]

> **The guard is re-run on every practical mutation path.** […] I traced `savePlate`, `deletePlate`+rollback, `doDeleteMenu`, `submitNewMenu` and confirmed each repaint touches one of these two entry points.

> **CSS relocation (`data-mobile-home="menuSwitchRow"`) doesn't fight the `hidden` attribute.** `.plib-btn2` sets no `display` property, so there's no author-origin rule to beat the UA's `[hidden]{display:none}` (the trap CLAUDE.md documents repeatedly).

> **The Playwright test genuinely pins the guard's condition, not just its presence.** I hand-traced the `&&`→`||` mutation against the three fixtures […] the first two scenarios produce opposite `hidden` results under `&&` vs `||`, so the test suite would catch an inverted guard.

That last one is the check this repo cares most about, and it was done by hand against the actual fixtures rather than asserted.

---

## Note 1 (fragility, not a live bug) — the guard's condition is a proxy

> the guard's condition (`menusList.length`) is a proxy for "a menu to add to," while the actual gate the modal enforces is `currentMenuId`. The two are kept in sync today only because `buildMenuSelector` always runs alongside `updateMenuAddDishBtn`. If a future change ever calls `renderAnalysis()`/`updateMenuAddDishBtn()` from a path that mutates `menusList` without also running `buildMenuSelector`'s correction first, the button could reappear while `submitAddDish` still refuses — recreating exactly the "dead control" symptom this batch was fixing. Worth a one-line comment noting the coupling, not a fix. Confidence: low that this is currently reachable; I checked every mutation call site in the diff's blast radius and found none that skip `buildMenuSelector`.

**Taken as the agent proposed it: a comment, not a change.** I could not construct a reachable flow either, and rewriting the guard to read `currentMenuId` would trade a proxy that holds for a second read of a value the same function is in the middle of correcting.
**The comment says the ORDER is the contract** — `buildMenuSelector` fixes a stale `currentMenuId` immediately before calling this, in the same function — so the next person to move either one is told what they are breaking.

## Note 2 (nit) — the fixture used a key the app never writes

> the test fixtures' misc plate line is `{misc:true, name:'x', cost:6.5}`, but the app's own `savePlate` writes misc lines as `{misc:true, label:l.label||'', cost:...}` […] `costFromLines` doesn't read `name`/`label` for misc lines, so this doesn't affect the test's correctness — just a cosmetic mismatch with real data shape.

**Taken, and FIXED, and I would not file it as cosmetic.** The agent is right that nothing reads the key, so the test's result is unaffected today — but a fixture describing data the app cannot produce is the front half of roster entry 184(b), where a fixture whose fields agreed made a broken `||` undetectable. The cost of matching the real shape is one word; the cost of a fixture that has quietly drifted from the writer is a test that measures a coincidence.
Changed to `{misc:true, label:'Chips', cost:6.5}`, with a note at the fixtures saying why.
