---
name: cache-version
description: Bump EzPlate's cache version across all six spots. Use whenever a batch ships a change to js/app.js, css/style.css, index.html or sw.js - before opening the PR. Miss one spot and Max's phone serves stale code.
---

# Cache version

The PWA is served by a network-first service worker.
Every change that ships JS/CSS/HTML bumps the version by one in **all six** spots.
Miss one and the installed app serves stale code against fresh code, which costs an hour to diagnose and looks like a ghost bug.

## Do it with the script

```
node tools/bump-version.js <NN>
```

It rewrites all six literals and prints each one with its file and line, so the output IS the check.
Read the current number from `sw.js` first - never from a handover, a PR title or this file:

```
node tools/bump-version.js --check
```

⚠️ **It refuses rather than half-applying.** Every spot must match exactly once in its file, and nothing is written until all six have been located. A spot that has moved, been deleted, or been doubled - a second `?v=` link in `index.html`, say - is a hard stop naming the spot and the count. **Fix the file, or fix the spot list in the script; do not hand-edit around it**, because a hand pass is what the script replaced.

## What the six spots are

`tools/bump-version.js`'s `SPOTS` array is the list, and it is the only one. Kept here for reading, not for editing:

| # | File | What changes |
|---|---|---|
| 1 | `sw.js` | `const CACHE = 'ezplate-vNN'` |
| 2 | `sw.js` | `?v=NN` on `style.css` in `ASSETS` |
| 3 | `sw.js` | `?v=NN` on `app.js` in `ASSETS` |
| 4 | `index.html` | `css/style.css?v=NN` |
| 5 | `index.html` | `js/app.js?v=NN` |
| 6 | `js/app.js` | `var APP_VERSION='vNN'` |

Spot 1 is the source: every other spot is compared against it.
Spot 6 is what Settings → About shows.

## What catches a miss

- **`tests/cache-version.test.js` fails if any of the six disagrees with `sw.js`'s `CACHE`**, naming the file, the line and the spot number. It calls the script's own `readSpots()`, so the test and the tool cannot drift apart.
- It also runs `bump()` against a temp copy of the three files and asserts all six moved, so a writer that silently skips a spot goes red without a batch having to use it.
- `tests/settings.test.js` independently pins spot 6 against spot 1. `tests/smoke.js` derives its expected version from `sw.js` rather than hardcoding one.

⚠️ **Spots 2-5 were covered by nothing at all until batch 265**, and this file said so. If you are reading an older handover that repeats "those are on you", it is out of date.

## Tag the merge

After the PR merges, on `main`:

```
git tag ezplate-v<NN> && git push origin ezplate-v<NN>
```

**The tag is what makes a deploy version findable in git.** `sw.js`'s history gives you the commit that bumped the number on a branch; the tag gives you the commit that actually shipped it, which is the merge. `docs/audits/AUDIT-vNN.md` is keyed to the same number.

## One bump per batch

The version goes up by one per batch, not per commit.
A batch that ships three commits still moves `v115` to `v116`.
If you are mid-batch and the version is already bumped, leave it alone.

## When NOT to bump

A change that ships no client asset.
A docs-only PR (a handover, `docs/QUEUE.md`, `docs/PHONE.md`, `CLAUDE.md`), a test-only change, or a change confined to `api/*.js`
- Vercel serves those routes directly and the service worker never caches them.
