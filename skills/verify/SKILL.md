---
name: verify
description: Run EzPlate's checks and know what each one does not cover. Use at the start of every session to establish the baseline, after every item, and before opening a PR. Covers the suite, smoke, Playwright, the real browser, and why a green suite is not coverage of anything server-side.
---

# Verify

Five harnesses, each blind to what the next one sees.
Running one and reporting "tests pass" overstates what you know.
**The fifth is not blind to the app - it is blind to nothing except the tests, which is the point: it asks whether the OTHER harnesses would notice a break.**

## Check the machine before you diagnose the code

**Establish the baseline first, every session, before touching anything.**

```
npm test
```

It must be green *before you start*.
The container and the repo have drifted from their claimed state before.
If the pass count, the anchors or the file list do not match what a brief or a handover says, **stop and report what you actually found** - do not start work on top of an unexplained baseline.

The same rule applies mid-batch.
A test that starts failing after an unrelated edit is more often the machine, a stale process or a drifted fixture than a real regression.
Confirm the failure reproduces from a clean run before you go looking for the bug.

## The five harnesses

### 1. The suite - `npm test`

`node --test tests/*.test.js`.
Runs in about a second.
This is the one that must be green before you start and after every item.

Tests extract real shipped code from `js/app.js` by source slicing and brace extraction - there are no duplicate copies to drift.
If you rename an anchored function the tests fail loudly and name the anchor.
If you deliberately change a pinned contract, update the test **in the same commit** and say so in the PR and the handover.

### 2. Syntax - after any JS edit

```
node -c js/app.js
```

Cheap, and `js/app.js` is one browser script with no build step to catch this.

### 3. Smoke - NOT in the default suite, run it alone

```
npm install jsdom --no-save && node tests/smoke.js
```

Run it for anything touching rendering, wiring or Settings.

⚠️ **"Run it alone" USED TO BE THE WHOLE STORY AND IS NOW A FALLBACK: since 192 the pre-push hook runs it for you** (`.githooks/pre-push`, check 2 of 3, ~8s). That is deliberate mechanism rather than convenience.
**The failure it removes has now happened twice, in 174 and in 192, on the SAME assertion** - the one about which Account cards may carry controls, which is stated in three places of which `tests/smoke.js` is the only one outside `npm test`. Both times the batch moved the other two, saw `npm test`, the mutation gate and Playwright all green, and went red in CI on push.
174 left a warning inside `tests/smoke.js` saying precisely this would happen. It did not help, because it is only readable by somebody already opening the file they are about to break.
**So do not read the hook as permission to stop thinking about it** - a fresh clone runs no hook at all (`git config core.hooksPath .githooks` is per-clone) and looks exactly like a clone that passed one. If you have not confirmed the hook is installed, run it by hand.

**jsdom trap:** every `window.eval()` gets its own lexical environment, so top-level `let`s in `js/app.js` (`productsById`, `savedPlates`, `customMenu`, `byId`, `plate`) are unreachable from outside.
Concatenate your code onto `app.js` and evaluate them together.

### 4. Playwright - NOT in the default suite either, run it alone

```
npx playwright test
```

Drives the installed Chromium against the app from `file://`, over the specs in `tests/visual/`.

**Use it.** Layout, overflow, z-index, computed styles and measured geometry at any viewport are things you can reproduce and verify rather than defer to Max.
"It might overflow at 380px" is a measurable claim, not a phone question.

Because it is outside `npm test`, nothing it depends on fails loudly.
That is why `addProduct` is dead in the app and deliberately kept - the `fresh-states` specs have no other handle on the pid-line shape, and deleting it would fail silently.

### 5. The mutation gate - would the suite NOTICE a break?

```
npm run mutate            # every target, ~12s
npm run mutate:changed    # only what this branch touched - what the pre-push hook runs
```

Shipped in 180. It flips one operator, or deletes one call, in a listed function of `js/app.js`, runs **only the test files that claim to pin that function**, and reports any mutant that survived.
A survivor means those tests would still be green with that line broken - the defect class this repo has shipped **twelve** times (`CLAUDE.md`'s roster).

**Run it whenever you write or change a test**, not only before pushing. It answers in seconds the question the rules make you ask by hand: *would this test FAIL if I broke the thing it names?*

- The list of what is covered, and every deliberate survivor with its reason, is `tests/mutation/targets.js`. **Adding a target is normal work** - do it when you write a test you would be uneasy to see deleted.
- A survivor is fixed by an ASSERTION, or by an allowance with a reason someone could disagree with. The gate fails on a survivor with neither, and equally on an allowance that is no longer needed.
- It mutates a throwaway copy in the OS temp directory. It never touches the working tree.

**What it cannot see, which is most things:** a wrong premise, a comment whose stated mechanism is backwards, a control that does nothing, anything in CSS, anything Playwright covers, anything server-side. It is one narrow, mechanical check.

**Where it runs, and which half you can rely on.** The pre-push hook is the fast local copy and it needs `git config core.hooksPath .githooks` once per clone, so a fresh clone runs nothing and looks identical to a clone that passed. The `unit` CI job runs the full `npm run mutate` unconditionally, and **that is the half that actually holds.**
`tests/mutation-gate.test.js` proves it can go red as well as green, because a gate that always passes is the same defect one level up.

## What none of them cover

### The network boundary

`npm test`, smoke and Playwright all stop before the network.
The Supabase MCP sits on the *far* side of it, as a different and more privileged role.
**A green suite plus a green MCP check is not coverage of a migration or an RPC.**

`postgres` (the MCP and the SQL editor) and `authenticator` (PostgREST, for `anon` and `authenticated`) differ in ways that change whether SQL runs at all:

- **`safeupdate`** is preloaded for `authenticator` and not for `postgres`.
  It rejects any `DELETE` or `UPDATE` with no `WHERE` clause.
  So `delete from t;` works perfectly in the SQL editor and fails on the real client path.
  Measured: bare is blocked, while `where true`, `where id is not null` and a self-subquery all pass - safeupdate reads the parse tree, not the plan.
- **`statement_timeout`** - `anon` 3s, `authenticated` 8s, `postgres` unlimited.
  A function that is comfortable through the MCP can time out for a user.
- **RLS** - the MCP bypasses it entirely.
  A SELECT+INSERT-only table is one the anon key cannot DELETE from at all, and that is invisible to every SQL test.

**Exercise any new RPC as the client's role.** From the app itself, or from the browser console with a payload the function's own guards refuse:

```js
rpc('restore_backup', {payload:{format:1}})   // rejected before any write
```

Cheap, and the only thing that tests the role your users actually are.

### A real browser

To run the real client against the real database, including code that is not deployed yet:

```
python3 -m http.server 8899
```

Serve the working tree and open it - the local build talks to production Supabase, so it exercises the true path.
Drive anything a user can reach, both themes, 380px and desktop.
Real defects have been invisible to a green suite and obvious within seconds here.

### A device

**A narrow viewport is still not a device.** Anything about *feel* - touch targets, spacing, animation, keyboard, pull-to-refresh, iOS Safari specifically - goes on `docs/PHONE.md` and the handover's phone list.
Never claim it verified.

The browser tells you whether the pixels are right.
Only the phone tells you whether it feels right.

## Before opening the PR

Suite green · `node -c` clean · `npm run mutate` green if you wrote or changed a test · **`npm run smoke` — not "if anything renders", ALWAYS, because it is outside `npm test` and has caught two batches that were green everywhere else** · Playwright if anything moved on screen · the `code-review` agent against the branch diff.

Open the PR when the diff is **final**.
**No review fires on its own, and there is no longer a workflow that could** - `.github/workflows/code-review.yml` was deleted in batch 207 (Max, 22 Aug 2026), after zero runs since its 8 Aug demotion.
So the `code-review` agent above is the review this branch gets, and waiting after opening the PR waits for nothing.
**Save its report to `docs/reviews/REVIEW-<batch>-<short-name>.md` with a `Reviewed-commit: <sha>` line** - the pre-push hook and the `unit` CI job both refuse a diff that changes what runs without one.
