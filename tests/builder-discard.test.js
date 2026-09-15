/*
 * tests/builder-discard.test.js (273, queue item 47's last bullet) — THE BUILDER HAS ONE RED VERB.
 *
 * The defect, measured in Chromium before the fix, on a saved plate at 1360x900, both themes:
 * #clearBtn ("Clear plate") and #bldDelete ("Delete plate") computed the IDENTICAL colour —
 * rgb(192,57,47) in light and rgb(229,135,125) in dark, i.e. --bad for both — and both were on
 * screen at the same time (y=279 and y=681). Two controls in one red, in one `<verb> plate`
 * grammar, meaning two different things: #clearBtn empties the working builder and LEAVES THE SAVED
 * PLATE ON THE SERVER, while #bldDelete destroys it.
 *
 * ⚠️ WHAT THIS FILE PINS AND WHAT IT CANNOT, stated because the honest limit is the reason the
 * Playwright half exists rather than an apology for it. Here we can only read the SOURCE: the label
 * in index.html, the `danger` classes inside #builderPage, and rules in css/style.css whose selector
 * names #clearBtn. A future `.bld-actrow .btn{color:var(--bad)}` — a selector that never types
 * "clearBtn" — would paint the button red again and every assertion below would stay green.
 * `tests/visual/273-builder-discard.spec.js` measures the COMPUTED colours instead, which is the
 * only form of the claim that can fail for every way of making it true. The pair is deliberate;
 * neither half is sufficient (`.claude/rules/css.md`: a rule that looks right in the file).
 *
 * ⚠️ AND THE LABEL IS ASSERTED AS AN EQUALITY FIRST, then as the denial. Roster entry 190: "not the
 * wrong value" is a guess about every wrong value there could be, so the weight goes on "is this
 * exact string" and the negative is kept only because it names the defect in its failure message.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const CSS = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');

/* The builder page's own markup, by its real delimiters rather than by "the next thing that looks
   like the end" — roster entry 268, where a structural claim tested by a proximity heuristic
   silently widened as the file grew. #builderPage opens at `<div id="builderPage"` and the file
   closes it with a named comment, which is what makes this sliceable at all. */
function builderMarkup() {
  const open = HTML.indexOf('<div id="builderPage"');
  assert.ok(open >= 0, 'precondition: #builderPage could not be found in index.html');
  const close = HTML.indexOf('<!-- /builderPage -->', open);
  assert.ok(close > open, 'precondition: the /builderPage close marker is gone — fix this slice, do not delete the test');
  return HTML.slice(open, close);
}

/* Every css/style.css rule whose SELECTOR mentions the given id, as {selector, body} pairs. Brace
   matching rather than "up to the next `}`", because a rule inside an @media block would otherwise
   be attributed to the query. */
function rulesNaming(id) {
  const out = [];
  const needle = '#' + id;
  let i = 0;
  while ((i = CSS.indexOf(needle, i)) >= 0) {
    const brace = CSS.indexOf('{', i);
    const prev = CSS.lastIndexOf('}', i);
    const prevOpen = CSS.lastIndexOf('{', i);
    // only a SELECTOR occurrence: nothing between the id and the next `{`, and the id is not itself
    // inside a declaration block or a comment.
    const selStart = Math.max(prev, prevOpen) + 1;
    const selector = CSS.slice(selStart, brace).trim();
    const inComment = CSS.lastIndexOf('/*', i) > CSS.lastIndexOf('*/', i);
    if (!inComment && brace > i && selector.indexOf(needle) >= 0 && selector.indexOf('*/') < 0) {
      out.push({ selector, body: CSS.slice(brace + 1, CSS.indexOf('}', brace)) });
    }
    i += needle.length;
  }
  return out;
}

const DESTRUCTIVE = /var\(\s*--(bad|danger)[\w-]*\s*\)/;

test('273: the builder\'s discard reads "Start over" and does not claim to act on the plate', () => {
  const m = builderMarkup().match(/<button[^>]*id="clearBtn"[^>]*>([^<]*)<\/button>/);
  assert.ok(m, 'precondition: #clearBtn is not a button inside #builderPage any more');
  const label = m[1].trim();
  assert.strictEqual(label, 'Start over',
    'the discard\'s label is the fix — "Clear plate" shared #bldDelete\'s `<verb> plate` grammar');
  assert.ok(!/\bplate\b/i.test(label),
    'the discard must not name "plate": #bldDelete does, and it is the one that destroys one');
  // the control — the button it was confused with still says what it does, so this file cannot
  // quietly become a test about a screen with no Delete on it.
  assert.ok(/<button[^>]*id="bldDelete"[^>]*>\s*Delete plate\s*<\/button>/.test(builderMarkup()),
    'precondition: #bldDelete still reads "Delete plate" — if that moved, re-derive this whole file');
});

test('273: exactly one control inside #builderPage wears the destructive class, and it is #bldDelete', () => {
  const buttons = builderMarkup().match(/<button[^>]*>/g) || [];
  assert.ok(buttons.length > 3, 'precondition: the builder page markup did not parse into buttons');
  const danger = buttons
    .filter((b) => /class="[^"]*\bdanger\b[^"]*"/.test(b))
    .map((b) => (b.match(/id="([^"]+)"/) || [null, '(no id)'])[1]);
  assert.deepStrictEqual(danger, ['bldDelete'],
    'the builder page has one destructive action; a second wearer spends the signal the first one needs');
});

test('273: no css/style.css rule paints #clearBtn or #printBtn in the destructive colour', () => {
  for (const id of ['clearBtn', 'printBtn']) {
    for (const rule of rulesNaming(id)) {
      assert.ok(!DESTRUCTIVE.test(rule.body),
        `#${id} is not destructive — it leaves the saved plate on the server — but \`${rule.selector}\` gives it ${rule.body.trim()}`);
    }
  }
  /* THE CONTROL, and this test is worth nothing without it: the destructive treatment must still
     EXIST somewhere for the assertion above to be about anything. `.btn.danger` is what #bldDelete
     wears. If a later batch deletes that pair, this goes red rather than the file above quietly
     becoming three assertions about a stylesheet with no red in it. */
  assert.ok(/\.btn\.danger\s*\{[^}]*var\(--bad\)/.test(CSS),
    'control: `.btn.danger` no longer paints --bad, so "#clearBtn is not painted --bad" proves nothing');
});
