---
name: cache-version
description: Bump EzPlate's cache version across all six spots. Use whenever a batch ships a change to js/app.js, css/style.css, index.html or sw.js - before opening the PR. Miss one spot and Max's phone serves stale code.
---

# Cache version

The PWA is served by a network-first service worker.
Every change that ships JS/CSS/HTML bumps the version by one in **all six** spots.
Miss one and the installed app serves stale code against fresh code, which costs an hour to diagnose and looks like a ghost bug.

## The six spots

Read the current number from `sw.js` - never from a handover, a PR title or this file.

| # | File | What to change |
|---|---|---|
| 1 | `sw.js` | `const CACHE = 'ezplate-vNN'` |
| 2 | `sw.js` | `?v=NN` on `style.css` in `ASSETS` |
| 3 | `sw.js` | `?v=NN` on `app.js` in `ASSETS` |
| 4 | `index.html` | `css/style.css?v=NN` |
| 5 | `index.html` | `js/app.js?v=NN` |
| 6 | `js/app.js` | `var APP_VERSION='vNN'` |

Spot 6 is shown in Settings → About.

## Do it in one pass

```
grep -n "ezplate-v\|style.css?v=\|app.js?v=" sw.js index.html
grep -n "APP_VERSION" js/app.js
```

Six lines come back.
Change all six, then run the same greps again and confirm one number appears six times.

## What catches a miss

- `tests/settings.test.js` **fails** if `APP_VERSION` disagrees with `sw.js`'s `CACHE`.
  That is deliberate - it is the reason a mirror is allowed to exist.
- `tests/smoke.js` derives its expected version from `sw.js` rather than hardcoding one, so it never rots.

Neither test checks spots 2–5. Those are on you.

## One bump per batch

The version goes up by one per batch, not per commit.
A batch that ships three commits still moves `v115` to `v116`.
If you are mid-batch and the version is already bumped, leave it alone.

## When NOT to bump

A change that ships no client asset.
A docs-only PR (a handover, `docs/QUEUE.md`, `docs/PHONE.md`, `CLAUDE.md`), a test-only change, or a change confined to `api/*.js`
- Vercel serves those routes directly and the service worker never caches them.
