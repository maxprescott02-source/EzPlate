# HANDOVER - 270 (one date style)

**Branch:** `batch-270-one-date-style` · **Scope:** `docs/QUEUE.md` item 60, consolidated item 60, "Dates render three ways", promoted from group G4.

## What changed

One `fmtDate` helper prints every moment the app shows: relative under seven days (`today` / `yesterday` / `N days ago`), then `29 Aug 2026`.
Eight call sites folded into it, all in `js/app.js`, and `relDayLabel` is deleted.
It counts LOCAL CALENDAR days rather than elapsed hours, so a change made at 11pm reads "yesterday" when it is opened at 10am.
The absolute half builds from a fixed month table, which is the actual fix for the item's complaint: en-AU and en-GB ICU render "8 Sept" beside "24 Aug", and en-US reorders the whole string.
`updateLastImport` was the worst of the eight and the item had it wrong: a bare `toLocaleDateString()` with no options, so the cafe's own import date read differently on a different device.
Three surfaces are deliberately NOT folded in, each recorded at its site and pinned by a test: `monthLabel` is a month noun inside four insight sentences, the chart axis is a position scale, and the backup filename is sorted by a file manager rather than read.
`tests/fmt-date.test.js` is new: 13 tests over both sides of every threshold, the calendar-day boundary, a 23-hour and a 25-hour DST day, the `isFinite('')` family, and a census that every surviving locale date call belongs to `monthLabel`.
`fmtDate`, `dateMs` and `trendFmtDate` are now mutation targets at 10 mutants, 10 killed, zero allowances.

**Rider taken** (`docs/MAINTENANCE.md`, "One unit test fails for 60 seconds a day"): `tests/trend-reframe.test.js`'s single `now` is local noon rather than `Date.now()`.
Fixed at the ANCHOR, which is what covers the whole file as that entry asked, and demonstrated rather than reasoned: with the old anchor, two entries 60 seconds apart at 23:59:53 key to different local dates.

**Shipped `ezplate-v219`.**

## Review

The pre-push `code-review` agent, run on **Sonnet**.
The definition pins `opus` and this batch ran on Opus, so the reviewer was overridden for this run per `CLAUDE.md`.
It was given the branch diff and not the queue item, the plan or the premise-check report.

**No findings.**
It raised two things it had chased and dismissed itself.
The first, `docs/STATE.json` looking internally inconsistent, it dismissed correctly: `batch` is derived from the newest handover file, which did not exist yet.
The second it graded probably-not-wrong and **I took anyway, arguing with its grading**: it called `docs/QUEUE-GROUPS.md`'s `**Items:**` line "a historical statement rather than a live status field", and the same file's G5 note says the opposite in as many words, because `tools/state.js` and `tests/queue-routing.test.js` read that line.
It was right that nothing was broken, for a reason it did not state: struck-ness is derived from the consolidated file, so the machine had the correct answer throughout and the only reader the stale line could mislead was a human deciding whether G4 was finished.
That is how three shipped items sat unstruck there across three batches.

It named one loop it had not closed, the full `npm run mutate` gate.
It had been run before the review: 1408 mutants, 1354 killed, 54 survived all with written allowances, 3 killed by timeout, exit 0.
Artifact: `docs/reviews/REVIEW-270-one-date-style.md`.

## Into CLAUDE.md

Nothing in `CLAUDE.md` itself.
Two process edits under the 13 Aug 2026 standing authority.
`skills/batch` step 10 now requires striking a shipped item in **both** backlog files, `docs/QUEUE-2026-09-08-CONSOLIDATED.md` and `docs/QUEUE-GROUPS.md`; it named only the first, which is the cause of the review finding above.
`docs/QUEUE-GROUPS.md` gained the three missing strikes (57, 58, 60) and a note on why its `**Items:**` line is a field rather than prose.

## New docs/QUEUE.md items

None as new work.
The refill promoted consolidated item 51, the copy half of "Builder readiness and copy", which is G4's last unstruck A-or-B item.
Its entry flags that three of its six bullets are readiness BEHAVIOUR rather than copy, and that splitting them is legitimate provided the residue is written back into the consolidated item.
When 51 ships, G4 is drained for promotion purposes (78 is C and rides) and the next refill opens G5.

## New docs/PHONE.md items

None.
Every date surface was settled by a browser agent at 380px and 1360px in both themes, so by the five-way test in `skills/batch` none of it needs a real phone.

## Probe

**What the item told me to do that I would have done differently.**
It said the rule applies "everywhere", and that is wrong for three surfaces; I refused all three and recorded each with a test rather than following it.
It also asked for a grep asserting "no other `toLocaleDateString` call site remains", which cannot be satisfied truthfully, because the comments explaining the rule contain the string.
The test counts call sites by identity with comments stripped instead, and I proved both directions: a new call outside `monthLabel` turns it red, a comment merely naming the function does not.

**What I did not propose because it was out of scope.** Nothing.

**Was any rule missing when I needed it.**
Yes, one.
`skills/batch` step 10 named only the consolidated file for strikes and not `docs/QUEUE-GROUPS.md`, which is why three shipped items sat unstruck there with nothing able to notice.
Fixed in this batch.

## Surprises

`premise-check` found the item's enumeration short by a factor of two: it named four surfaces and there are eight call sites.
That is the eighth batch in a row to find its item's enumeration short.

Two of the item's stated facts were wrong, both in the direction that understates the defect.
`relDayLabel` was at `:4487`, not `:3822`.
And `updateLastImport` was not rendering "29/08/2026" at all; it was a bare `toLocaleDateString()`, so the item had described one cafe's symptom as if it were the code's behaviour.

A ninth surface the item never named, `sinceLineHtml`, was printing a different word for the same moment on the same screen as the Dashboard row it did name.

My own new test caught two real defects in my first draft, which is the argument for writing the test before believing the code.
`fmtDate([])` returned "1 Jan 1970" because `Number([])` is 0, which is `app-guards.md`'s `isFinite('')` family arriving in a function written with that rule open.
And the `dash-recent` `Date` shim forwarded only its first constructor argument, which collapsed both local midnights to the same instant and turned "yesterday" into "today".

`updateLastImport` writes to three element ids and only two have existed since v140.
The test pins the id LIST rather than the elements, so it would stay green if all three were dead.
Pre-existing, routed to `docs/MAINTENANCE.md` as C.
