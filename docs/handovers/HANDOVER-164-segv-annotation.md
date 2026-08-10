# HANDOVER - 164 (the segfault annotation)

**Branch:** `ci/segv-annotation` · **Scope:** the queue's top item - a browser segfault reads as a mystery flake, and the diagnosis is one grep nobody runs.
**Deploy version: NONE.** CI config, tests and a fixture, no client asset, so `sw.js` stays `ezplate-v145`.

## What changed

A CI run whose browser crashed now says so.
`.github/workflows/test.yml` gains a step, `Did the browser crash?`, which walks the json report's test error text for `Received signal` and names the spec in a `::warning::` reading "this is infra, NOT your diff".
It runs on `always()`, so it reports on a red run as well as a flaky one.

`tests/ci-workflow.test.js` gains eight tests, and `tests/fixtures/playwright-report-segv.json` is new.
Suite 870 to 878.

## The thing worth carrying forward

**The literal the item specified would have misfired, and the item's own warning is what caught it.**
`Received signal` appears five times in the real report from run `31384057429`, and two of those are in `config.metadata.gitDiff`.
Playwright captures the branch diff into the report in CI, so the diff that added the segfault comment block quotes the string into the report.
A file-wide grep would have announced a browser crash on a clean green run of this very batch.

The walk therefore reads test error text only, `results[].error.message`, `.stack` and `results[].errors[].message`, and recurses into nested suites because a `describe` block puts specs one level down.

That is the second consecutive batch where the specified check was right and the specified literal was wrong.

## The review, which found the better half of this

Two findings, both real, both fixed before push.

**A Playwright report has two error channels, and the one I read is not the one that matters most.**
Per-test error text covers a crash that lands mid-test, which is all six occurrences on record.
A crash that lands between tests, in the worker respawn Playwright does after every failure, goes through the reporter's `onError` and is serialized to the report's own top-level `errors` array, attributed to no spec at all.
That is the case where the reader has least to go on, and the first version was silent on it.
It now reads both channels and says plainly when no spec owns the crash.

**The honest fixture could not pin which channel was load-bearing.**
A real failure populates `error.message`, `error.stack` and `errors[].message` with the same text, so a detector reading any one of the three passed every test.
Four constructed single-channel reports now pin each read separately, and all five reads including the nested-suite recursion were mutation-checked by deleting them one at a time.

The shape worth remembering: the review did not find a wrong line.
It found an unearned claim.
The code was correct about what it read, and the comment said "and nothing else" as though that were complete coverage.

## Into CLAUDE.md

Nothing proposed.
The lesson here is already the file's rule about checking a literal against a real artifact, and the queue carries the instance.

## New docs/QUEUE.md items

One, in the Small list: all three CI jobs carry a Node 20 deprecation warning and GitHub is already forcing those actions onto Node 24.
Seen while confirming this batch's own step emitted no annotation.
Nothing is broken, but a permanent warning on every green run is noise on the exact channel this batch just started writing to.

The two follow-ups from the segfault investigation are already queued and untouched by this batch: the tightest-cycle experiment and the Playwright/Chromium bump.

## New docs/PHONE.md items

None.
Nothing here is reachable from the app.

## Probe

**What did the queue item tell you to do that you would have done differently?**
It named the grep, and the grep was wrong for the reason above.
It also said to extend the existing `Did any spec pass only on a retry?` step or add one beside it; I added one beside it, so the proven flaky detector and the artifact gate that depends on its output were not touched at all.

**What did you not propose because it was out of scope?**
Moving both inline `node -e` scripts into a file under `.github/scripts/`, which would let the tests require the real thing instead of slicing it out of the YAML.
It is better engineering and it is new machinery in a job the item itself describes as deliberately minimal, so it was not worth taking unasked.
The slicing is safe for one specific reason worth stating: the test executes what it slices, so a mis-slice throws rather than passing against a copy.

## Surprises

The extraction test failed on its first run, and it was right to.
The first version unescaped `\n` before handing the script to node, which produced a real newline inside a JS string literal.
Inside bash double quotes a backslash is special only before `$`, a backtick, `"`, `\` and a newline, so `\n` reaches node unchanged and node's own parser turns it into a newline.
A test that described the script instead of running it would have been green and wrong.

The other surprise is that a faithful fixture is not automatically a discriminating one.
Copying real output gave four tests that a detector reading one field in three would have passed.
Faithful and constructed fixtures answer different questions, and this file now carries both on purpose.
