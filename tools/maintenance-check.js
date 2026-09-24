// 284 - the detector for docs/MAINTENANCE.md.
//
// Queue item 100: the file was 1,616 lines with no cap and no entry test, and
// three audits in a row found entries that still read as outstanding after the
// thing they described had been fixed or deleted. Nothing could see it happen.
// The file's own words about docs/PHONE.md were the diagnosis: "any file a
// process APPENDS to needs a stated cap and a stated test for entry, or it
// converts work into the appearance of work."
//
// The decision (284): docs/MAINTENANCE.md is a WORKING LIST, like docs/QUEUE.md.
// Git and docs/handovers/ are the record. So:
//   - a finished entry is DELETED, never struck - a struck entry is still a
//     thing every reader has to read past, and the file grew by keeping them;
//   - every entry opens with at least one `Anchor:` line naming a literal and
//     where it lives, and this checks the literal is still there. An entry about
//     code that no longer exists is stale BY CONSTRUCTION, and now goes red;
//   - `Anchor: absent ...` inverts it, for an entry about something unbuilt:
//     the day it is built, the entry goes red and makes someone come and say so
//     (the pattern tests/insight-parity.test.js already uses for a known gap);
//   - the entry count is capped, so adding one past the cap means deleting one.
//
// ⚠️ WHAT THIS CANNOT SEE, stated so nobody trusts it for more: an entry whose
// anchor still exists but whose defect was FIXED IN PLACE. `doDeleteMenu` was
// fixed by batch 254 and read as open for ~24 batches; the function still
// exists, so an anchor on it stays green. The anchor catches deletion and
// construction, not repair. Repair is still caught by the batch that does it
// striking - now deleting - the entry, which is `skills/batch`'s rule.
//
// Run it directly (`node tools/maintenance-check.js`) for a readable report;
// tests/maintenance-file.test.js runs the same check inside `npm test`.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'docs', 'MAINTENANCE.md');

// Everything above this line is the file's header: how it works, the cap, the
// entry test. Everything below it is an entry. The marker is explicit rather
// than inferred from a heading, because a heading gets reworded and a check
// keyed to one silently stops checking.
const MARKER = '<!-- entries: everything below this line is an entry, and tools/maintenance-check.js reads it -->';

// The cap. Set by 284 at the count the file held after its first run, so the
// NEXT entry displaces one. Raising it is allowed and is a visible edit to this
// line with a reason in the handover; that is the whole point of it being here.
const ENTRY_CAP = 99;
// `Anchor: none - <reason>` exists for an entry with no literal to point at (a
// production-data chore, a setting that lives outside the repo). It is an
// escape hatch, so it is counted: a file where half the entries opt out has no
// detector.
const NONE_CAP = 10;
// A `##` group may carry a short intro before its first entry; a finding
// written there as prose would escape the anchor check, which is how the
// un-headed bullet findings of the 5 Sep blind audit section sat unanchored.
const INTRO_MAX = 6;

const DONE_WORDS = /\b(DONE|SHIPPED|CLOSED|MOOT|EXPIRED|ANSWERED|SUPERSEDED|MERGED|EXECUTED|PROMOTED|RESOLVED|FIXED)\b/;
const ANCHOR_RE = /^Anchor: (?:(absent) )?`([^`]+)` in `([^`]+)`/;
const NONE_RE = /^Anchor: none - (\S.*)$/;

function parse(text) {
  const lines = text.split('\n');
  const markerAt = lines.findIndex(l => l.trim() === MARKER);
  const out = { markerAt, groups: [], entries: [], problems: [], headerEntries: [] };
  if (markerAt < 0) { out.problems.push('the entries marker is missing, so nothing below it can be checked'); return out; }
  for (let i = 0; i < markerAt; i++) if (/^### /.test(lines[i])) out.headerEntries.push({ line: i + 1, title: lines[i] });
  let group = null, entry = null;
  for (let i = markerAt + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^## /.test(l)) { group = { line: i + 1, title: l, intro: 0, entries: 0 }; out.groups.push(group); entry = null; continue; }
    if (/^### /.test(l)) {
      entry = { line: i + 1, title: l.slice(4), anchors: [], nones: [], bad: [], struckLines: [] };
      out.entries.push(entry);
      if (group) group.entries++;
      // anchors: the consecutive `Anchor:` lines starting at the first non-blank line
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;
      while (j < lines.length && /^Anchor:/.test(lines[j])) {
        const m = lines[j].match(ANCHOR_RE), n = lines[j].match(NONE_RE);
        if (m) entry.anchors.push({ line: j + 1, absent: !!m[1], literal: m[2], where: m[3] });
        else if (n) entry.nones.push({ line: j + 1, reason: n[1] });
        else entry.bad.push({ line: j + 1, text: lines[j] });
        j++;
      }
      continue;
    }
    if (/^- ~~|^~~/.test(l.trim())) {
      const msg = `line ${i + 1} is a struck finding: ${l.slice(0, 80)}`;
      if (entry) entry.struckLines.push(msg); else out.problems.push(msg);
    }
    if (group && !entry && l.trim() !== '') group.intro++;
    if (!group && l.trim() !== '' && l.trim() !== '---') out.problems.push(`line ${i + 1} sits below the marker outside any \`##\` group`);
  }
  return out;
}

let _tracked = null;
function tracked() {
  if (!_tracked) _tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
  return _tracked;
}

// The files an anchor names: one tracked file, or every tracked file under a
// directory. Untracked files are ignored on purpose - a literal that exists only
// in someone's working tree is not in the repo.
function filesFor(where) {
  const w = where.replace(/\/+$/, '');
  const all = tracked();
  if (all.includes(w)) return [w];
  return all.filter(f => f.startsWith(w + '/'));
}

function check(text, { read = f => fs.readFileSync(path.join(ROOT, f), 'utf8'), files = filesFor } = {}) {
  const p = parse(text);
  const problems = [...p.problems];
  for (const h of p.headerEntries) problems.push(`line ${h.line}: an entry heading above the marker escapes every check - move it below`);
  for (const g of p.groups) {
    if (g.entries === 0) problems.push(`line ${g.line}: group "${g.title}" holds no \`###\` entry - a finding written as prose here is unanchored`);
    if (g.intro > INTRO_MAX) problems.push(`line ${g.line}: group "${g.title}" has ${g.intro} lines before its first entry (max ${INTRO_MAX}) - findings belong in \`###\` entries`);
  }
  let noneCount = 0;
  for (const e of p.entries) {
    const at = `line ${e.line} "${e.title.slice(0, 70)}"`;
    if (/~~|✅/.test(e.title) || DONE_WORDS.test(e.title)) problems.push(`${at}: reads as finished - delete a finished entry, git and the handover are the record`);
    for (const s of e.struckLines) problems.push(`${at}: ${s}`);
    for (const b of e.bad) problems.push(`${at}: malformed anchor at line ${b.line}: ${b.text}`);
    if (!e.anchors.length && !e.nones.length) problems.push(`${at}: has no \`Anchor:\` line directly under its heading`);
    noneCount += e.nones.length ? 1 : 0;
    for (const a of e.anchors) {
      const fs_ = files(a.where);
      if (!fs_.length) { problems.push(`${at}: anchor names \`${a.where}\`, which is not a tracked file or directory`); continue; }
      const found = fs_.some(f => { try { return read(f).includes(a.literal); } catch { return false; } });
      if (!a.absent && !found) problems.push(`${at}: STALE - \`${a.literal}\` is no longer in \`${a.where}\`. The entry's subject has gone: delete the entry, or re-anchor it if the subject moved`);
      if (a.absent && found) problems.push(`${at}: STALE - \`${a.literal}\` now EXISTS in \`${a.where}\`, and this entry is about it being absent. Delete the entry or say what is still missing`);
    }
  }
  if (noneCount > NONE_CAP) problems.push(`${noneCount} entries opt out with \`Anchor: none\` (cap ${NONE_CAP}) - an entry that cannot name a literal is usually not a C item`);
  if (p.entries.length > ENTRY_CAP) problems.push(`${p.entries.length} entries against a cap of ${ENTRY_CAP}: adding one means deleting one, and saying which in the handover`);
  return { problems, entries: p.entries.length, nones: noneCount, groups: p.groups.length };
}

module.exports = { MARKER, ENTRY_CAP, NONE_CAP, INTRO_MAX, parse, check, filesFor, FILE };

if (require.main === module) {
  const r = check(fs.readFileSync(FILE, 'utf8'));
  console.log(`${r.entries} entries (cap ${ENTRY_CAP}), ${r.nones} unanchored by choice (cap ${NONE_CAP}), ${r.groups} groups`);
  for (const p of r.problems) console.log('  - ' + p);
  process.exit(r.problems.length ? 1 : 0);
}
