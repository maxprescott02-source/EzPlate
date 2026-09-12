/*
 * queue-routing.test.js — 252.
 *
 * ONE RULE, MECHANISED AFTER THREE INSTANCES: an item in `docs/QUEUE.md` must also be routed in
 * `docs/QUEUE-GROUPS.md`. That file says which items load the same context, and `skills/batch`'s
 * refill step reads it to decide which group is current — so an item missing from it does not merely
 * look untidy, it makes the group it belongs to silently under-count, and the refill can promote the
 * wrong group or conclude a finished one is still open.
 *
 * ⚠️ WHY A TEST RATHER THAN A FOURTH RESTATEMENT OF THE RULE.
 *   · item 88 — AUDIT-v197 found it (raised by 239, routed in one file).
 *   · item 90 — raised by 247, routed in one file. That is the rule broken by the NEXT batch to
 *     raise an item after it was written down.
 *   · item 91 — raised by 252, routed in one file, **in the same commit in which 252 diagnosed and
 *     fixed instance two and restated the rule in bold.** Caught by that batch's pre-push review.
 * Three instances, the third by the author of the second's fix. `CLAUDE.md` says that when a rule is
 * violated repeatedly you fix it once and stop writing about it; here the honest fix is mechanical,
 * because the failure is never disagreement with the rule — it is forgetting a second file.
 *
 * WHAT THIS DOES NOT CHECK, deliberately: the reverse direction. `QUEUE-GROUPS.md` routes the whole
 * backlog and `QUEUE.md` is the working set, so a number in the routing file with no queue entry is
 * the ordinary state of every unpromoted item, not a defect.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', 'docs', f), 'utf8');
const QUEUE = read('QUEUE.md');
const GROUPS = read('QUEUE-GROUPS.md');

/* An item heading is `## next  15 · …` or `## blocked  2b · …`. The status word is what `/batch`
   acts on, so both statuses are items; a heading with no number (the audit item, the design-law
   sections) is not one and is skipped rather than guessed at. */
function queueItemNumbers(md) {
  return md.split('\n')
    .map((l) => /^##\s+(?:next|blocked|doing)\s+([0-9]+[a-z]?)\s*·/.exec(l))
    .filter(Boolean)
    .map((m) => m[1]);
}

/* ⚠️ ONLY THE `**Items:**` LINES, AND THE FIRST VERSION OF THIS SEARCHED THE WHOLE FILE — which
   made it useless in the way roster 183(a) describes. Removing item 91 from G3's Items line left it
   green, because 91 is also named in the paragraph EXPLAINING that it was once missing. A grep over
   a document searches its prose, and here the prose is this very rule being written about.
   Found by mutating the routing file and watching the check not fail, which is the only way this
   kind of weakness ever shows up. "Routed" means listed in a group, so that is what is read. */
const itemsLines = (md) => md.split('\n').filter((l) => l.startsWith('**Items:**')).join('\n');

/* A whole-token match: `9` must not be satisfied by `90`, and `2` must not be satisfied by `2b`.
   Digits and letters either side disqualify. */
function routed(md, n) {
  return new RegExp(`(^|[^0-9a-zA-Z])${n}([^0-9a-zA-Z]|$)`, 'm').test(itemsLines(md));
}

/* ⚠️ NUMBERS BELOW 16 PREDATE THE ROUTING FILE AND ARE OUT OF ITS SCOPE, by its own first line:
   *"Items are referenced by their consolidated-file number"*, and `QUEUE-2026-09-08-CONSOLIDATED.md`
   is *"numbered from 16 so they continue this file"*. So `2b`, `5` and `8` — the queue items that
   survived the consolidation — live in `docs/QUEUE.md` alone, correctly.
   The boundary is stated here rather than as a list of exemptions, so it cannot rot as those three
   ship: anything numbered 16 or above is a consolidated item and owes a group. */
const CONSOLIDATED_FROM = 16;

test('252: every item in QUEUE.md is routed in QUEUE-GROUPS.md', () => {
  const all = queueItemNumbers(QUEUE);
  const items = all.filter((n) => parseInt(n, 10) >= CONSOLIDATED_FROM);
  /* ⚠️ THE SANITY FLOOR COUNTS ALL ITEMS, NOT CONSOLIDATED ONES, AND IT USED TO COUNT THE LATTER.
     It read `items.length >= 3` and went RED in batch 256 for a reason that was not a defect: the
     queue held exactly three consolidated items, 256 shipped one of them, and two is not three. The
     floor was calibrated against a working set that is MEANT to drain — the refill exists precisely
     so this number goes to zero and is filled again — so it was asserting the queue's contents when
     it meant to assert that the file is still PARSEABLE.
     That is the difference the floor now respects: `all` measures whether the heading format still
     yields items at all (the thing that would make the real assertion below vacuous), and the >=16
     filter is scope, which is allowed to be empty. A group whose items have all shipped is the
     success case, not a failure. */
  /* ⚠️ AND WHAT IT ACTUALLY ENFORCES IS NOT WHAT THE PARAGRAPH ABOVE SAYS, which is worth writing
     down rather than renumbering. The comment calls this a parseability floor; a file holding TWO
     items parses perfectly well, so at `>= 3` this is still an assertion about CONTENTS — 256 moved
     what it counts and left it counting.
     It is kept, because the thing it really catches is worth catching and nothing else does:
     `/batch` step 10 can finish an item, leave the working set with nothing unblocked, and hand over
     in a state where the next run has no work to take. That is exactly what happened in batch 261,
     which shipped item 37, dropped the queue to two BLOCKED items, and was stopped by this line.
     So the message now names the refill instead of parseability. Both readings are true of the
     assertion; only one of them tells the next reader what to do when it goes red. */
  assert.ok(all.length >= 3,
    'the working set has been drained without a refill. `/batch` refills from the first group in '
    + 'docs/QUEUE-GROUPS.md that still has tier-A or tier-B items — a group whose survivors are all '
    + 'tier C is finished for promotion, because docs/QUEUE.md holds A and B only. Promote the next '
    + "group's items rather than lowering this floor.");
  const missing = items.filter((n) => !routed(GROUPS, n));
  assert.deepStrictEqual(missing, [],
    'these items exist in the working set and in no group — the refill reads QUEUE-GROUPS.md, so a '
    + 'missing item makes its group under-count. Add it to the group whose CONTEXT it loads, with one '
    + 'line saying why that group.');
});

test('252: the check can fail — a number in neither file is caught', () => {
  /* The half that matters after mechanising a rule: prove the assertion is capable of failing.
     Roster 195 and 205 are both tests that could not, and this one is three lines of regex. */
  assert.strictEqual(routed(GROUPS, '4242'), false, 'a number that is genuinely absent reads as absent');
  assert.strictEqual(routed('**Items:** 17, 91 and 89', '91'), true, 'and a present one reads as present');
  assert.strictEqual(routed('**Items:** 90 only', '9'), false, '9 is not satisfied by 90 — whole tokens, not substrings');
  assert.strictEqual(routed('**Items:** 2b only', '2'), false, 'nor 2 by 2b');
  /* THE ONE THE FIRST VERSION FAILED: a number named only in prose is NOT routed. */
  assert.strictEqual(routed('**Items:** 38, 39\n⚠️ item 91 was missing from here once.', '91'), false,
    'a mention in an explanatory paragraph is not a routing');
});
