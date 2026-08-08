/*
 * builder-modal.test.js (v119) — the builder's mobile takeover is genuinely edge-to-edge.
 *
 * WHY A GREP WOULD NOT HAVE CAUGHT THIS. `@media (max-width:560px){ .modal-builder{width:100%} }`
 * has been in the file since v54 and was never the problem — it was LOSING. §"margins locked —
 * modals pinned centre" adds `.modal{width:min(640px,calc(100vw - 24px))}` much later in the same
 * file at the same specificity (0,1,0), so the cascade handed the builder 356px at a 380px
 * viewport: square corners and 100dvh height (those rules had no later rival) but a 12px gutter
 * down each side. Measured in a real browser at 380px before the fix.
 *
 * So this test does not assert that a selector EXISTS. It resolves the cascade the way a browser
 * would — every `width` declaration that matches the builder element at a phone width, ordered by
 * specificity then source position — and asserts the WINNER is 100%. Re-introducing the bare
 * `.modal-builder{width:100%}` form, or moving §"margins locked" later still, fails this.
 *
 * SCOPE, stated because the first draft of this file overclaimed it: nothing here pins the modal
 * CONVERSION itself (that the builder markup lives in #builderModal rather than #tab-builder). That
 * was verified in a browser on 8 Aug 2026 and is not asserted anywhere in tests/ — if it needs a
 * guard, it needs its own, and this file is not it.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');

/* The elements under test, outermost first.
   `open` IS PART OF THE MODEL and must stay. `.modal-overlay` is display:none by default and only
   ever visible via `.modal-overlay.open`, so the ONLY state in which any of these widths matter is
   the open one — and the sheet already scopes rules that way one property over
   (`.modal-overlay.open .modal{animation:…}`). Omitting it made `.builder-overlay.open .modal-builder`
   look like a selector that "provably cannot match", so a width fix scoped under .open would have
   been dropped in silence and this test would have gone on passing. `closing` is deliberately NOT
   modelled: it is the mirror state, it never co-occurs with .open, and nothing sets width under it. */
const ELEMENTS = {
  builder: [
    ['modal-overlay', 'builder-overlay', 'open'],
    ['modal', 'modal-builder'],
  ],
  /* The wizard is the other half of the shipped rule and needs its own resolution, not an
     assumption that one selector covering both means both resolve the same way. Its element
     carries .modal-wide too — see index.html's #kingWizModal. */
  wizard: [
    ['modal-overlay', 'wiz-overlay', 'open'],
    ['modal', 'modal-wide', 'modal-wiz'],
  ],
};

/* Strip comments so a `width:` inside prose can never be read as a declaration. */
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');

/* A compound like ".a.b" matches a node whose class list contains every class named. */
function compoundMatches(compound, classes) {
  const parts = compound.trim().split('.').filter(Boolean);
  return parts.every((c) => classes.includes(c));
}

const CLASS_ONLY = /^\.[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$/;
const classesOf = (compound) => (compound.match(/\.[A-Za-z0-9_-]+/g) || []).map((c) => c.slice(1));

/* Descendant chains only (no >, +, ~ appear in the selectors that set width here). Matched
   right-to-left against the chain, which is the element's ancestor list.
   Returns false only for what PROVABLY cannot target the element, and null for a selector that
   could target it but this matcher cannot read — which the caller turns into a loud failure
   rather than a silent skip. Getting that distinction wrong is the false-pass direction. */
function selectorMatches(sel, chain) {
  const parts = sel.trim().split(/\s+/);
  const self = chain[chain.length - 1];
  const last = parts[parts.length - 1];
  /* Does the subject compound name any of the element's own classes at all? If not, it cannot be
     about this element however it is written — `:root`, `html`, `a:hover`, `.btn`, `#id` all exit
     here, silently and correctly. */
  const subjectClasses = classesOf(last);
  if (!subjectClasses.length || !subjectClasses.every((c) => self.includes(c))) return false;
  /* It IS about this element. From here anything unreadable is a guess, so say so out loud
     rather than dropping it — `.modal-builder:focus-within{width:…}` must not vanish. */
  if (!CLASS_ONLY.test(last)) return null;
  if (parts.slice(0, -1).some((p) => !CLASS_ONLY.test(p))) return null;
  let i = chain.length - 1;
  if (!compoundMatches(last, chain[i])) return false;
  i--;
  for (let p = parts.length - 2; p >= 0; p--) {
    while (i >= 0 && !compoundMatches(parts[p], chain[i])) i--;
    if (i < 0) return false;
    i--;
  }
  return true;
}

const specificity = (sel) => (sel.match(/\./g) || []).length; // class-only selectors here

/* Walk the sheet, tracking which @media block we are inside, and collect every `width`
   declaration whose selector matches `chain` AND whose media applies at 380px. */
function widthDeclarations(chain) {
  const out = [];
  let i = 0;
  let mediaStack = [];
  const applies = () => mediaStack.every((m) => {
    const max = /max-width:\s*(\d+)px/.exec(m);
    const min = /min-width:\s*(\d+)px/.exec(m);
    if (max && 380 > Number(max[1])) return false;
    if (min && 380 < Number(min[1])) return false;
    return true;
  });

  while (i < stripped.length) {
    const open = stripped.indexOf('{', i);
    if (open < 0) break;
    const head = stripped.slice(i, open).trim().replace(/^[};]+/, '').trim();
    if (head.startsWith('@media')) {
      mediaStack.push(head);
      i = open + 1;
      continue;
    }
    if (head.startsWith('@')) { // @keyframes etc — skip the whole block
      let depth = 1, n = open + 1;
      while (n < stripped.length && depth) { if (stripped[n] === '{') depth++; else if (stripped[n] === '}') depth--; n++; }
      i = n;
      continue;
    }
    const close = stripped.indexOf('}', open);
    const body = stripped.slice(open + 1, close);
    if (applies()) {
      for (const sel of head.split(',')) {
        const m = selectorMatches(sel, chain);
        assert.notStrictEqual(m, null,
          `builder-modal.test.js cannot parse selector "${sel.trim()}" — extend the matcher rather than letting it be skipped silently`);
        if (!m) continue;
        const w = /(?:^|;)\s*width\s*:\s*([^;]+)/.exec(body);
        if (w) out.push({ sel: sel.trim(), value: w[1].trim(), spec: specificity(sel), pos: open });
      }
    }
    i = close + 1;
    // leaving a media block: the next '}' after this rule closes it
    while (mediaStack.length && /^\s*\}/.test(stripped.slice(i))) {
      mediaStack.pop();
      i = stripped.indexOf('}', i) + 1;
    }
  }
  return out;
}

/* Both halves of the shipped rule are resolved independently. One selector covering two elements
   is not evidence that both elements resolve the same way — the wizard also carries .modal-wide,
   so its cascade is genuinely a different one. */
for (const name of ['builder', 'wizard']) {
  test(`at a 380px viewport the ${name} takeover resolves to full width`, () => {
    const decls = widthDeclarations(ELEMENTS[name]);
    assert.ok(decls.length >= 2,
      'expected the generic .modal rule AND the takeover rule to both match — got ' + JSON.stringify(decls));

    const winner = decls.reduce((a, b) => (b.spec > a.spec || (b.spec === a.spec && b.pos > a.pos) ? b : a));
    assert.strictEqual(winner.value, '100%',
      `the ${name}'s width at 380px resolves to "${winner.value}" from \`${winner.sel}\`, not 100%.\n` +
      'The mobile takeover is meant to be edge-to-edge; a narrower winner puts a gutter down each ' +
      'side of a square-cornered, full-height sheet. Candidates in cascade order:\n' +
      decls.map((d) => `  spec ${d.spec} @${d.pos} ${d.sel} -> ${d.value}`).join('\n'));
  });
}

test('the generic .modal width rule still exists and still comes later', () => {
  /* If this ever stops being true the fix above is load-bearing for nothing, and the extra
     specificity should be reconsidered rather than left as cargo. */
  const decls = widthDeclarations(ELEMENTS.builder);
  /* Two bare `.modal{width:…}` rules apply at this width — the base card (width:100%) and the
     later §"margins locked" one. Only the LAST matters to the cascade, and it is the one the
     bare takeover rule was losing to. */
  const generic = decls.filter((d) => d.sel === '.modal').sort((a, b) => a.pos - b.pos).pop();
  assert.ok(generic, 'expected a generic `.modal{width:…}` rule');
  const bare = decls.find((d) => d.sel === '.modal-builder');
  const descendant = decls.find((d) => /\.builder-overlay\s+\.modal-builder/.test(d.sel));
  assert.ok(bare, 'expected the original bare `.modal-builder{width:100%}` takeover rule');
  assert.ok(descendant, 'expected the descendant-form takeover rule');

  assert.ok(generic.pos > bare.pos,
    'the generic `.modal` width rule no longer comes after the bare takeover rule — the bug this ' +
    'guards is gone, so the extra specificity is now cargo and should be reconsidered rather than kept');
  assert.strictEqual(generic.spec, bare.spec,
    'the two are meant to tie on specificity — that tie is why source order decided it');
  assert.ok(descendant.spec > generic.spec,
    'the takeover rule must OUT-SPECIFY the generic one, not merely follow it');
});
