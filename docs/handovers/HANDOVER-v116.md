# HANDOVER - v116 (the two browser specs that could not run in CI)

**Branch:** `fix/ci-browser-specs` · **Scope:** `docs/QUEUE.md` → "Two browser specs cannot run in CI - find out why, don't widen the tolerance".

**No client asset changed, so no cache bump: `sw.js` stays `ezplate-v115`.**
This is a test-and-docs batch numbered for the diary, not for a deploy.

**Suite at close:** `npm test` **756 green** (unchanged) · `node -c` clean · jsdom smoke green · Playwright **88/88 in CI on Linux**, up from 86 of 88 with two skipped.

## What changed

Both `test.skip(!!process.env.CI, ...)` lines are gone, and neither was traded for a wider tolerance or a longer timeout.
They had the same cause, which is worth more than either fix: **the app's scrollbar takes real layout width on Linux and none on macOS**, and every machine that had ever run these specs was a Mac.
Two rules together do it: `*::-webkit-scrollbar{width:10px}` (`style.css:1490`) sets the width, and `html{scrollbar-gutter:stable}` (`:2693`) reserves it on every page whether it scrolls or not.

- `v108-boot.spec.js` now measures its reference instead of naming it, with a throwaway `position:fixed;inset:0` probe.
  It therefore pins the app's property (the gate spans its whole containing block) rather than the browser's (that `inset:0` covers the viewport), which was never ours to test.
- `fresh-states.spec.js:792` clicks the chart's centre instead of a hardcoded `{x:150, y:100}`.

## Into CLAUDE.md

Nothing proposed.
The mechanism is written at both call sites, where `CLAUDE.md`'s own test ("true but inferable is a deletion") says it belongs.

## New docs/QUEUE.md items

- **Run `project-audit` and FILE the report.** Queued above every unblocked item because `docs/audits/` does not exist at all, which trips the `/batch` counter rule outright.
  The item spells out that the agent is read-only and the report has to be filed by hand, because an unfiled report leaves the counter unchanged and the next audit never gets queued.

One existing item was corrected rather than added to: **"Insights rules D and E"** named a `CLAUDE.md` structure the three-tier rewrite deleted, and a rule that does not exist.
The code carries **A–D only** (`js/app.js:2974–2998`); "A–E" was a miscount the old `CLAUDE.md` propagated.
Still blocked on Max, but now on a question that can actually be answered.

## New docs/PHONE.md items

None.
Nothing a user can reach changed, so there is nothing a device could settle.

## Probe

**What did the queue item tell you to do that you would have done differently?**
Nothing about the method - "start from a trace, not a theory" was right and is what found this.
But **half the item's diagnosis was wrong, and following it would have sent me after an app bug that does not exist.**
It recorded the second failure as "the svg appears then goes missing... if the chart really does swap its svg out from under a pointer, that is an app behaviour", and instructed me to check that before touching the test.
The trace says otherwise on the first read: the locator *resolves* to the `<svg>`, then 53 click retries against `#trendWrap intercepts pointer events`.
The element never went anywhere; the click point left it.
The item's inference was reasonable from a log - a timeout "waiting for locator" after a passing `toBeVisible` really does read as a vanished element - and it is wrong, which is the standing lesson about reading logs instead of artefacts.

**What did you not propose because it was out of scope?**
That the app has never been laid out on a platform whose scrollbars take space, and CI is now the first place it happens.
I did not propose changing anything about it: the 10px scrollbar and the stable gutter are both deliberate, documented at their rules, and correct for a café on iPhones and a Mac.
It is worth knowing only because it will surface again the moment another spec measures a width, and both call sites now say so.

## Surprises

- **The previous attempt was right about the scrollbar and wrong about one number, which made a correct theory look disproved.** The item recorded that measuring `documentElement.clientWidth` instead of `page.viewportSize()` "did NOT fix it, so that theory is wrong or incomplete".
  Measured on the runner: `innerWidth` 1280, `documentElement.clientWidth` **1280**, fixed containing block **1270**.
  Both candidates report 1280 on Linux exactly as they do on a Mac, so swapping one for the other could never have helped - the scrollbar comes out of the fixed-positioning containing block without being subtracted from either.
  A disproved *fix* had been read as a disproved *cause*.
- **The pre-push review found no defect but supplied a fact I had missed.** I had credited the whole 10px to Linux drawing a classic scrollbar, which does not explain why the boot-gate page pays it with nothing to scroll (measured: no vertical overflow there at all).
  `html{scrollbar-gutter:stable}` is the missing half.
  Both comments and the queue entry were corrected before merge rather than shipping a half-true explanation that would later be trusted.
- The chart's CI geometry was predictable to the pixel once the cause was known - predicted 304×98.8, measured 304×98.8 - and `elementFromPoint` at the old click coordinate returned `DIV#trendWrap`, the same words the failing trace used.
