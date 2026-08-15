# HANDOVER - 195 (pdf.js 4.10.38, and the ESM load path)

**Branch:** `195-pdfjs-esm` · **Scope:** `docs/QUEUE.md` item 3, `pdf.js 4.2.67+`, the [A] launch blocker for CVE-2024-4367.
**Deploy version shipped: `ezplate-v167`.**

## What changed

pdf.js went from 3.11.174 to **4.10.38**, so CVE-2024-4367 is closed outright rather than mitigated.
`isEvalSupported:false` stays as a second layer, and its comment now says that is what it is.
`ensurePdfjs()` was rewritten, because 4.x ships no UMD build and a version-string swap would have loaded a script that defines no global.
The integrity hash survived the move to ESM, which was the part the item flagged as unknown.
`tests/third-party-pins.test.js` is new and is the first thing that has ever checked the pinning rules, for either script.
`ensurePdfjs` is now a mutation-gate target, which it was not before.

## The pre-push review found a real defect, and it was mine

The `code-review` agent ran on a different model without the brief, and it earned its keep.

**All seven tests I wrote were source greps, and none executed the function.**
It deleted `res()` from the `import()` success arm, re-ran the suite, and every one of them stayed green.
The shipped consequence is worse than the failure they did cover: the promise never settles, `extractPdfText` awaits it forever, and picking a PDF hangs the upload with no toast, no error and nothing in the console.
That is the roster class exactly, written by someone who had just read the roster and believed he was avoiding it.

The fix is three tests that RUN the real function, sliced out with `extractFn` and built with `new Function` so dynamic `import()` works, against a local ESM fixture so no network is needed.
Each carries an explicit `{timeout: 5000}`, and that is load-bearing rather than boilerplate: node:test has no default timeout, so without it a never-settling promise hangs the suite instead of failing it, which in CI is indistinguishable from a stuck runner.

**Adding `ensurePdfjs` to the mutation gate then found a second one the review had not**: deleting `document.head.appendChild(s)` survived, because my fake `document` captured the element at `createElement` rather than at append.
An element that is built and configured but never inserted never loads, so that is the same silent hang by another route.
The fake now captures only at `appendChild` and the test asserts insertion.

Ten mutations were run by hand afterwards and all ten are red, measured on the process **exit code**.
That detail matters and cost time: a timeout-cancelled test prints `✖` and appears under "failing tests:", but is **not** counted in node's `ℹ fail N` tally, so a harness parsing the tally reports a false SURVIVED.
Mine did, once, and I nearly believed it.

## Into CLAUDE.md

**Three edits made under the standing documentation authority.**

**Roster entry 195, and the count moved 20 to 21.**
The shape is new and is not just "grepping source is weak", which 167 already covers.
It is that a promise which never settles is a third outcome nothing in this toolchain treats as a failure: node:test has no default timeout, so such a test hangs rather than going red, and in CI that is indistinguishable from a stuck runner.
The entry carries the remedy, an explicit `{timeout: N}` plus actually executing the function, and the two harness sub-failures found alongside it.

**Two hand-mutation traps**, added beside the existing `cp` and `diff -q` warnings, because both produced a false SURVIVED in this batch.
`node --test` does not count a timed-out test in its `ℹ fail N` tally even though it prints `✖` and exits 1, so read the exit code.
And `timeout` does not exist on macOS, so a run wrapped in it never happens and says nothing.

**The third-party-scripts paragraph in Tier 2** gained a block recording that its rules were prose only until today, pointing at `tests/third-party-pins.test.js` as the mechanism, and saying the newest version is not automatically the safe one.
Versions and CVE numbers are deliberately not restated there, because they rot and the test cannot.

No new Tier 1 trap was added for the two-step load.
It looks redundant and is not, which is the shape that usually earns one, but it is commented at its own site and the test goes red if either half is removed.
A rule would have been a third copy of a fact that already has two homes that can fail.

## New docs/QUEUE.md items

**None.** Item 3 is deleted, both `Do after:` lines that named it lost that half, and the remaining items renumbered.
Item 1 is now behind a decision and nothing else: pdf.js was the last piece of code standing between it and Max's answer on the privacy gate.

## New docs/PHONE.md items

**One, and it is the only check that matters for this batch.**
Import the four real Bidfood PDFs.
A failure looks like the parse getting worse rather than erroring: fewer rows detected, a description running into the next column, a price in the wrong field, or "Couldn't auto-detect priced lines" on a file that used to work.
pdf.js 4.x can group text into lines differently from 3.x and the parser reads those lines by position, so this cannot be settled without his files.

## Probe

**What did the queue item tell you to do that you would have done differently?**

The item said 4.2.67 and I shipped 4.10.38, which is a change of target rather than a change of method.
OSV lists a second arbitrary-JS-execution advisory, GHSA-hq66-cqwq-w95j, affecting 5.6.83 up to 6.2.108.
So "upgrade to the latest" is actively wrong here and 4.10.38 is the last release clear of all three known holes.
The item could not have known this and nothing would have caught it, so the version window is now an assertion rather than a paragraph.

The item also asked me to check whether an intermediate 4.x keeps UMD before committing to ESM.
I probed 4.0 through 4.5 and the answer is no, on every one, so the cheap upgrade the item hoped for does not exist.

**What did you not propose because it was out of scope?**

The "check your connection and try again" toast after a PDF-reader load failure cannot be retried, and I did not fix it.
It has two independent causes, one of which this batch added, and it is filed in `docs/MAINTENANCE.md` with both.
I deliberately did not apply the obvious one-line fix of clearing the memoised promise: a failed module fetch is also sticky in the document's module map, so clearing the memo alone would leave the retry just as dead while looking repaired.
That reasoning is recorded at the call site, because the half-fix is what a future reader will reach for.

## Surprises

**The `integrity` attribute survives on an ESM load, which the item treated as doubtful.**
A bare `import()` carries no SRI mechanism, but an external `<script type="module">` honours `integrity` normally, and a subsequent `import()` of the same URL resolves from the document's module map without a second request.
Measured rather than assumed: one network fetch of the URL, and a deliberately wrong hash rejects.
So the hash did not have to be dropped and no new pinned-only exception was created.

**The cross-origin worker needed nothing.**
pdf.js 4.x detects a cross-origin `workerSrc` and wraps it in a blob that does `await import(url)`, then constructs `new Worker(blob, {type:"module"})` itself.
The worker stays pinned-only for the same reason as before, and the exemption is still stated at the site.

**Two of the seven new tests failed on first run, for the same real reason.**
The pdf.js URL is built by concatenation from `PDFJS_VER`, so `@4.10.38/` never appears literally in `js/app.js`.
Both assertions were rewritten to match the exact code form rather than the bare version number, which also closes roster entry 183(a): both versions are discussed in comments a few lines from where they are declared, so a bare-number match would have passed on the prose alone.

**One mutation pattern silently matched nothing** and was reported as a broken pattern rather than as a survivor, by the `diff -q` guard `CLAUDE.md` requires.
That guard earned its place in this batch: without it the run would have reported the worker assertion as unpinned and sent me to write a test for a defect that was not there.
All eight mutations went red once the pattern was fixed.

**`timeout` does not exist on macOS**, and a mutation run wrapped in it reported SURVIVED for a mutation that was never executed at all.
The command failed with "command not found", the grep matched nothing, and nothing in the output said so.
This is the same family as the `diff -q` rule and is worth the same habit: a mutation harness must prove it RAN, not just that it printed.
The battery was re-run measuring the process exit code instead, which is also what fixed the `ℹ fail N` misread described above.
