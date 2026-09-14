#!/usr/bin/env node
/*
 * bump-version.js — move the deploy version in all six spots, in one pass, or refuse.
 *
 * WHY THIS EXISTS. The six literals were a hand-edit against a checklist in skills/cache-version,
 * and two of the six (the `?v=` strings in sw.js's ASSETS) were covered by no test at all: miss one
 * and the installed PWA serves stale CSS against fresh JS, which reads as a ghost bug and costs an
 * hour. WORKFLOW-AUDIT-2026-09-09 recommendation 4 asked for one source instead of six.
 *
 * WHAT IT WILL NOT DO. It refuses unless every spot below matches EXACTLY ONCE in its file, and it
 * writes nothing until all six have been located — a partial bump is the failure it exists to
 * prevent, so there is no path that half-applies one. A second `?v=` link added to index.html is
 * therefore a hard stop with the count in the message, not a silent miss.
 *
 * Usage:  node tools/bump-version.js 216     (or `v216`)
 *         node tools/bump-version.js --check  (print the six, change nothing; exit 1 if they disagree)
 *
 * tests/cache-version.test.js calls readSpots() and bump() — the REAL functions, not a copy of the
 * greps. A hand-rolled mirror of this walk would be written from the same belief as this file and
 * would agree with it about the spot it forgot.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/*
 * The six spots. `re` must have the digits as group 1 and must match exactly once in its file.
 * ORDER IS THE SKILL'S ORDER, so a reader can hold the doc and the output side by side.
 */
const SPOTS = [
  { n: 1, file: 'sw.js',      what: "const CACHE = 'ezplate-vNN'", re: /const CACHE = 'ezplate-v(\d+)'/g },
  { n: 2, file: 'sw.js',      what: "?v=NN on style.css in ASSETS", re: /'\.\/css\/style\.css\?v=(\d+)'/g },
  { n: 3, file: 'sw.js',      what: "?v=NN on app.js in ASSETS",    re: /'\.\/js\/app\.js\?v=(\d+)'/g },
  { n: 4, file: 'index.html', what: 'css/style.css?v=NN',           re: /href="css\/style\.css\?v=(\d+)"/g },
  { n: 5, file: 'index.html', what: 'js/app.js?v=NN',               re: /src="js\/app\.js\?v=(\d+)"/g },
  { n: 6, file: 'js/app.js',  what: "var APP_VERSION='vNN'",        re: /var APP_VERSION='v(\d+)'/g },
];

// Reads every spot. Throws — never returns a partial answer — if one is missing or doubled, because
// a caller that got five of six would have no way to tell.
function readSpots(root) {
  root = root || ROOT;
  const cache = {};
  return SPOTS.map((s) => {
    if (!(s.file in cache)) cache[s.file] = fs.readFileSync(path.join(root, s.file), 'utf8');
    const hits = [...cache[s.file].matchAll(s.re)];
    if (hits.length !== 1) {
      throw new Error(`spot ${s.n} (${s.file}, ${s.what}) matched ${hits.length} times, expected 1`);
    }
    const before = cache[s.file].slice(0, hits[0].index);
    return { ...s, version: Number(hits[0][1]), line: before.split('\n').length, text: hits[0][0] };
  });
}

// Rewrites all six to `to`. Reads everything first, writes only once every spot has been located.
function bump(to, root) {
  root = root || ROOT;
  if (!Number.isInteger(to) || to <= 0) throw new Error(`version must be a positive integer, got ${to}`);
  const spots = readSpots(root);
  const edited = {};
  for (const s of spots) {
    const p = path.join(root, s.file);
    if (!(s.file in edited)) edited[s.file] = fs.readFileSync(p, 'utf8');
    // Replace the WHOLE matched literal, rebuilt from its own text, so a digit sequence that
    // happens to appear elsewhere in the file cannot be touched.
    edited[s.file] = edited[s.file].replace(s.text, s.text.replace(/(\d+)/, String(to)));
  }
  for (const [file, text] of Object.entries(edited)) fs.writeFileSync(path.join(root, file), text);
  return readSpots(root);
}

function report(spots) {
  for (const s of spots) console.log(`  ${s.n}. ${s.file}:${s.line}  ${s.text}`);
}

if (require.main === module) {
  const arg = process.argv[2];
  try {
    if (arg === '--check' || arg === undefined) {
      const spots = readSpots();
      report(spots);
      const versions = [...new Set(spots.map((s) => s.version))];
      if (versions.length !== 1) {
        console.error(`\nThe six spots DISAGREE: ${versions.join(', ')}. Run: node tools/bump-version.js <NN>`);
        process.exit(1);
      }
      console.log(`\nAll six read v${versions[0]}.`);
      if (arg === undefined) console.log('Pass a number to bump, or --check to say so explicitly.');
      process.exit(0);
    }
    const to = Number(String(arg).replace(/^v/, ''));
    const before = readSpots()[0].version;
    report(bump(to));
    console.log(`\nAll six moved v${before} -> v${to}.`);
  } catch (e) {
    console.error(`REFUSED: ${e.message}`);
    console.error('Nothing was written. Fix the file, or the spot list in this script if a literal moved.');
    process.exit(1);
  }
}

module.exports = { SPOTS, readSpots, bump, ROOT };
