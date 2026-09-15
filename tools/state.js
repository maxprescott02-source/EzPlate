#!/usr/bin/env node
/*
 * state.js — write docs/STATE.json, the seven facts about where this repo's work stands.
 *
 * WHY THIS EXISTS. Those seven facts are spread across four prose files and a directory listing,
 * and every reader outside a batch re-derives them by hand and gets one wrong. The brain-ops folder
 * does exactly that on its Sunday pass (`tools/ezplate-state.py`): it re-derives the newest audit by
 * sorting filenames, counted open items by grepping `## next` in docs/QUEUE.md, and cannot see the
 * group order at all. Deriving the same thing twice, in two languages, from prose, is the repo's
 * most-recorded defect wearing a different hat.
 *
 * EVERY FIELD BUT ONE IS DERIVED FROM A FILE, NEVER FROM MEMORY OR FROM A STATUS MARKER. There is
 * nothing here a batch has to remember to update, which is the only property that makes it survive
 * a context clear. ⚠️ The exception is `written_at`, which is the clock - this line said "EVERY
 * FIELD" until AUDIT-v217 while the per-field docs below said otherwise, so the file disagreed with
 * itself about its own central claim. It is harmless because `batch` is cross-checked against the
 * handovers directory, and that is what actually catches staleness; the headline is corrected
 * rather than the field removed, because a date IS what that field means. If a derivation cannot be made, this script THROWS and writes nothing - a state
 * file that is partly guessed is worse than none, because it gets trusted.
 *
 *   batch                the highest-numbered docs/handovers/HANDOVER-<n>-*.md. This is the batch
 *                        counter, NOT the deploy version; they drift and CLAUDE.md says so.
 *   deploy_version       sw.js's `const CACHE = 'ezplate-vNN'`, read through bump-version.js's own
 *                        spot list rather than a second regex.
 *   first_unstruck_group the group `skills/batch`'s refill step would promote from next. See
 *                        firstUnstruckGroup() for what "unstruck" has to mean and why.
 *   open_ab_count        item headings in docs/QUEUE.md, any status, NUMBERED OR NOT. That file is
 *                        capped at 20 and holds tier A and B plus at most one process item
 *                        (docs/QUEUE.md's own header, batch 265), so its headings ARE the working
 *                        set. ⚠️ This said "tier A and B only" and the regex demanded a number
 *                        until AUDIT-v217, which is how an un-numbered item went uncounted.
 *   newest_audit         the highest-numbered docs/audits/AUDIT-vNN.md. That is the counter
 *                        `skills/batch` step 10 compares against sw.js; the dated audits in that
 *                        directory (UX-, PARSER-, WORKFLOW-) are not part of it and are excluded.
 *   newest_handover      the filename `batch` came from.
 *   written_at           the date this file was last written. Date only: a timestamp would change
 *                        every run and turn a meaningful diff into noise.
 *
 * Usage:  node tools/state.js            write docs/STATE.json
 *         node tools/state.js --check    derive and print; exit 1 if the file on disk disagrees
 *
 * RUN IT IN THE SAME COMMIT AS THE HANDOVER. tests/state-file.test.js asserts `batch` equals the
 * newest handover's number, so a handover landing without this run reddens `npm test` - which is
 * the mechanism, not an accident. `skills/batch` step 10 carries it.
 *
 * tests/state-file.test.js calls the REAL functions below, not a copy of these greps.
 */
const fs = require('fs');
const path = require('path');
const { readSpots } = require('./bump-version');

const ROOT = path.join(__dirname, '..');
const OUT = 'docs/STATE.json';

const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');

/* The handovers, oldest first. `HANDOVER-vNN.md` (write-once, pre-8 Aug 2026) and
   `HANDOVER-NNN-short-name.md` are both real shapes and both count; README.md is not one. */
function handovers(root) {
  root = root || ROOT;
  const found = fs.readdirSync(path.join(root, 'docs', 'handovers'))
    .map((file) => ({ file, m: /^HANDOVER-v?(\d+)[a-z]?(?:-|\.md$)/.exec(file) }))
    .filter((h) => h.m)
    .map((h) => ({ file: h.file, n: Number(h.m[1]) }))
    .sort((a, b) => a.n - b.n || a.file.localeCompare(b.file));
  if (!found.length) throw new Error('docs/handovers/ holds no HANDOVER-<n> file');
  return found;
}

/* The audit counter, which is the numbered AUDIT-vNN.md series and nothing else. A dated audit
   (UX-AUDIT-2026-09-08.md) is a different artefact keyed to a date, not to a deploy version, and
   `skills/batch`'s gap arithmetic cannot use one. Excluding them is the point of the anchored `^`. */
function audits(root) {
  root = root || ROOT;
  const found = fs.readdirSync(path.join(root, 'docs', 'audits'))
    .map((file) => ({ file, m: /^AUDIT-v(\d+)\.md$/.exec(file) }))
    .filter((a) => a.m)
    .map((a) => ({ file: a.file, n: Number(a.m[1]) }))
    .sort((a, b) => a.n - b.n);
  if (!found.length) throw new Error('docs/audits/ holds no AUDIT-vNN.md');
  return found;
}

/* Item headings in docs/QUEUE.md. Same shape queue-routing.test.js reads, asked a different
   question: that test asks WHICH items are routed, this asks HOW MANY are open. A heading with no
   number (the design-law sections) is not an item and is skipped rather than guessed at. */
/* ⚠️ AN ITEM NEED NOT BE NUMBERED, AND THIS FUNCTION REQUIRED A NUMBER UNTIL AUDIT-v217.
   Batch 265 gave `docs/QUEUE.md` the right to hold ONE un-numbered process item in a slot, and
   `project-audit` is exactly that shape. The old regex demanded `(\d+[a-z]?)·`, so it skipped one
   - `open_ab_count` read 3 against four real headings, and `tests/state-file.test.js` used a regex
   with the SAME requirement, so the two agreed and the suite was green. **Two readers derived from
   one wrong belief agree with each other; that is not corroboration.**
   The name is now optional: a heading is an item if it carries a status word. The design-law
   sections have no status word and are still correctly skipped, which is what the old number
   requirement was really standing in for. */
const QUEUE_ITEM = /^##\s+(?:next|blocked|doing)\s+(?:(\d+[a-z]?)\s*·|`?([A-Za-z][\w-]*)`?\s{2,})/;
function queueItems(root) {
  root = root || ROOT;
  return read(root, 'docs/QUEUE.md').split('\n')
    .map((l) => QUEUE_ITEM.exec(l))
    .filter(Boolean)
    .map((m) => m[1] || m[2]);
}

/* The promotion order, read from docs/QUEUE-GROUPS.md's own `## The order` list rather than from
   the order the group headings happen to appear in - those two are NOT the same (the file runs
   G1..G9, the order runs G1, G2, G4, G5, G3, G6, G8, G7, G9).
 *
 * Two narrowings, and the first draft of this function got the second one wrong:
 *   · only NUMBERED lines are read, so the prose under the list ("G8's schedule is a consequence of
 *     this order") cannot join the order;
 *   · only BOLD spans inside those lines count, because item 1 reads "**G1** - the wrong numbers,
 *     and three of G8's inputs" and a bare `\bG\d\b` scan would put G8 second.
 * The draft matched `**G4**` exactly and silently dropped G4 and G5, which the file writes as the
 * single span `**G4 + G5**`. It returned a shorter order that still looked like an order and named
 * the wrong current group. The completeness check below is what turns that class of miss loud. */
function groupOrder(root) {
  root = root || ROOT;
  const md = read(root, 'docs/QUEUE-GROUPS.md');
  const after = md.split(/^## The order\s*$/m)[1];
  if (!after) throw new Error('docs/QUEUE-GROUPS.md has no "## The order" section - the file shape changed');
  const section = after.split(/^## /m)[0];
  const order = [];
  for (const line of section.split('\n')) {
    if (!/^\s*\d+\.\s/.test(line)) continue;
    for (const span of line.matchAll(/\*\*([^*]+)\*\*/g)) {
      for (const g of span[1].matchAll(/\bG\d\b/g)) if (!order.includes(g[0])) order.push(g[0]);
    }
  }
  if (!order.length) throw new Error('docs/QUEUE-GROUPS.md\'s "## The order" list names no **GN** group');
  // An order that omits a group is not a shorter order, it is a WRONG one, and it reads as fine.
  const sections = [...md.matchAll(/^### (G\d) · /gm)].map((m) => m[1]);
  const missing = sections.filter((g) => !order.includes(g));
  if (missing.length) {
    throw new Error(`docs/QUEUE-GROUPS.md's "## The order" list does not place ${missing.join(', ')}; `
      + `it named ${order.join(', ')}. Either the list changed shape or a group was added without ordering it.`);
  }
  return order;
}

/* Which consolidated items each group holds. The group file supplies MEMBERSHIP only; whether an
   item is struck and what tier it is come from the consolidated file, which that file itself names
   as the record ("What is left? The unstruck items in docs/QUEUE-2026-09-08-CONSOLIDATED.md").
   Two files disagreeing about an item's status is a thing that has happened here - four recorded
   instances, which is why tests/queue-routing.test.js exists - and one of them being the only
   reader of its own status is how it stops mattering.
 *
 * ⚠️ SO A `~~STRUCK~~` ITEM STAYS IN THE MEMBERSHIP LIST, deliberately. Dropping it here would make
 * this file's strike the deciding one, and an item struck in this file but still open in the
 * consolidated one would vanish from its group entirely - the group could then read as finished
 * with promotable work left in it, which is the exact failure the refill rule cannot survive.
 * Parenthesised asides hold batch numbers, so they are removed before item numbers are read, and
 * the range accepted is 16 to the HIGHEST NUMBER THE CONSOLIDATED FILE ACTUALLY USES - the backlog
 * numbers from 16, and a stray batch number is above the top of it.
 *
 * ⚠️ THE CEILING IS DERIVED BECAUSE THE FIRST DRAFT WROTE 200 AND THE PRE-PUSH REVIEW PRICED IT.
 * It held only while the backlog stayed in the 90s; the day an item number reaches 200 a real item
 * drops out of its group's membership silently, and nothing anywhere would say so. A constant that
 * is true today and false later, with no assertion on it, is the same defect as the status marker
 * this whole file exists to replace. */
function groupMembers(root, ceiling) {
  root = root || ROOT;
  if (ceiling === undefined) ceiling = Math.max(...Object.keys(consolidatedItems(root)).map(Number));
  const md = read(root, 'docs/QUEUE-GROUPS.md');
  const parts = md.split(/^### (G\d) · /m);
  const members = {};
  for (let i = 1; i < parts.length; i += 2) {
    const g = parts[i];
    const line = parts[i + 1].split('\n').find((l) => l.startsWith('**Items:**'));
    if (!line) throw new Error(`docs/QUEUE-GROUPS.md group ${g} has no **Items:** line`);
    const bare = line.replace(/\([^)]*\)/g, ' ');
    const nums = [...bare.matchAll(/\b(\d+)\b/g)].map((m) => Number(m[1])).filter((n) => n >= 16 && n <= ceiling);
    members[g] = [...new Set(nums)].sort((a, b) => a - b);
  }
  if (!Object.keys(members).length) throw new Error('docs/QUEUE-GROUPS.md holds no "### GN ·" group');
  return members;
}

/* Every consolidated item: struck or not, and its tier letter. A struck heading is `## ~~16 · …~~`;
 * an open one is `## next  57 · …  **[B, …]**`. The tier is the first letter in the bracket, so
 * "[C until a second client exists, then A]" is C, which is what it is today.
 *
 * ⚠️ IT REFUSES TO SKIP A HEADING IT CANNOT READ, which is the whole reason this is not a `continue`.
 * The pre-push review of this batch found the first draft silently passing over
 * `## ~~blocked~~  91 · original item` - the `\s+` it wanted after `blocked` is a `~` there - and a
 * skipped heading is INDISTINGUISHABLE FROM A STRUCK ITEM to firstUnstruckGroup() below. That is a
 * group silently reading as finished with open work in it, which is the exact failure this file was
 * written to remove, arriving through the file that removes it. Every `## ` heading in that file
 * carries a `·` (its sections are single-`#`), so anything with a `·` that will not parse is a
 * shape nobody has seen, and being loud about it costs one run.
 *
 * Struck is decided by whether the ITEM NUMBER is inside a `~~…~~` span, not by the line starting
 * with one - the 91 heading above strikes only the status word, and an open item wearing a struck
 * status word must not read as shipped. */
function consolidatedItems(root) {
  root = root || ROOT;
  const md = read(root, 'docs/QUEUE-2026-09-08-CONSOLIDATED.md');
  const items = {};
  const unreadable = [];
  for (const line of md.split('\n')) {
    if (!/^##\s/.test(line) || !line.includes('·')) continue;
    const m = /^##\s*(?:(?:next|blocked|doing)\s+)?(\d+)\s*·/.exec(line.replace(/~~/g, ''));
    if (!m) { unreadable.push(line.trim().slice(0, 80)); continue; }
    const n = Number(m[1]);
    const struck = [...line.matchAll(/~~([^~]*)~~/g)].some((s) => new RegExp(`^\\s*${n}\\s*·`).test(s[1]));
    const tier = (/\*\*\[([ABC])/.exec(line) || [])[1] || null;
    // First heading wins: item 91 keeps a struck "original item" heading below its closed one.
    if (!(n in items)) items[n] = { struck, tier };
  }
  if (unreadable.length) {
    throw new Error(`docs/QUEUE-2026-09-08-CONSOLIDATED.md has ${unreadable.length} item heading(s) `
      + `this cannot read, and a heading it skips is indistinguishable from a struck item: `
      + unreadable.join(' | '));
  }
  if (!Object.keys(items).length) throw new Error('docs/QUEUE-2026-09-08-CONSOLIDATED.md holds no item heading');
  return items;
}

/* The group `skills/batch`'s refill would promote from next.
 *
 * ⚠️ "UNSTRUCK" IS NOT ENOUGH ON ITS OWN, and reading it that way would name G1 forever. G1's only
 * survivors are four tier-C riders, and PROMOTION into docs/QUEUE.md is tier A and B only - so they
 * can never be promoted, the queue would never refill, and the group would read as current for
 * good. (The one process item that file may also hold is put there BY HAND, never by the refill,
 * so it does not affect this derivation - the distinction matters since batch 265.) That
 * group's own entry says this in prose ("a group whose only survivors are C is DONE for promotion
 * purposes"), and prose is not something a derivation can read. So: the first group in the order
 * with at least one unstruck item graded A or B. An item's blockedness is NOT a filter - a blocked
 * item is promoted blocked, which is the refill rule's business and not this one's.
 */
function firstUnstruckGroup(root) {
  root = root || ROOT;
  const order = groupOrder(root);
  const items = consolidatedItems(root);
  const members = groupMembers(root, Math.max(...Object.keys(items).map(Number)));
  for (const g of order) {
    const mine = members[g];
    if (!mine) throw new Error(`docs/QUEUE-GROUPS.md's order names ${g}, which has no "### ${g} ·" section`);
    if (mine.some((n) => items[n] && !items[n].struck && (items[n].tier === 'A' || items[n].tier === 'B'))) return g;
  }
  return null;   // every group promotable-empty. Real, and a finding rather than an error.
}

function derive(root, today) {
  root = root || ROOT;
  const hs = handovers(root);
  const newest = hs[hs.length - 1];
  return {
    batch: newest.n,
    deploy_version: readSpots(root)[0].version,
    first_unstruck_group: firstUnstruckGroup(root),
    open_ab_count: queueItems(root).length,
    newest_audit: audits(root).slice(-1)[0].file,
    newest_handover: newest.file,
    written_at: today || new Date().toISOString().slice(0, 10),
  };
}

function write(root, today) {
  root = root || ROOT;
  const state = derive(root, today);
  fs.writeFileSync(path.join(root, OUT), `${JSON.stringify(state, null, 2)}\n`);
  return state;
}

function onDisk(root) {
  return JSON.parse(read(root || ROOT, OUT));
}

if (require.main === module) {
  try {
    const check = process.argv[2] === '--check';
    if (check) {
      const want = derive(ROOT);
      const got = onDisk(ROOT);
      const stale = Object.keys(want).filter((k) => k !== 'written_at' && want[k] !== got[k]);
      console.log(JSON.stringify(got, null, 2));
      if (stale.length) {
        console.error(`\ndocs/STATE.json is STALE on: ${stale.map((k) => `${k} (${got[k]} -> ${want[k]})`).join(', ')}`);
        console.error('Run: node tools/state.js');
        process.exit(1);
      }
      console.log('\nEvery field matches what the files say.');
      process.exit(0);
    }
    console.log(JSON.stringify(write(ROOT), null, 2));
    console.log(`\nWrote ${OUT}.`);
  } catch (e) {
    console.error(`REFUSED: ${e.message}`);
    console.error('Nothing was written. A partly-guessed state file is worse than none.');
    process.exit(1);
  }
}

module.exports = {
  ROOT, OUT, handovers, audits, queueItems,
  groupOrder, groupMembers, consolidatedItems, firstUnstruckGroup,
  derive, write, onDisk,
};
