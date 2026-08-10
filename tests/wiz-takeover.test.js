/*
 * wiz-takeover.test.js — the wizard's mobile takeover is genuinely edge-to-edge.
 *
 * RENAMED FROM builder-modal.test.js BY F7 (v146), not deleted, and the rename is the honest move
 * rather than the tidy one. This file was written for the BUILDER modal, which F7 replaced with a
 * full page; the identical cascade fight is still live for `#kingWizModal`, which the original
 * already resolved as its second element precisely because "one selector covering both is not
 * evidence that both resolve the same way". Deleting the file would have thrown away a working
 * resolver for a bug that is still reachable. What went with the builder: the builder half of
 * ELEMENTS, and the third test, whose subject was the bare-vs-descendant `.modal-builder` pair.
 * The v119 history below is kept because it is WHY the descendant form is there.
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
 * SCOPE, stated because the first draft of this file overclaimed it: nothing here pins any
 * markup, only the resolved width. The builder page's own shape is pinned by
 * tests/visual/v146-builder.spec.js and tests/builder-page.test.js.
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
  /* The wizard's element carries .modal-wide too — see index.html's #kingWizModal. */
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

/* F7 (v146) — `:not(.x)` is READ now, not guessed at.
   It used to be handled by accident. The sheet's exclusion was written
   `.modal:not(.modal-builder):not(.modal-wiz)`, and `classesOf` pulled `modal-builder` out of the
   :not() as though it were a positive class — the wizard element does not carry it, so the matcher
   returned "provably cannot match", which happened to be the right answer for the wrong reason.
   F7 deleted `:not(.modal-builder)` with the builder, the accident stopped working, and the
   matcher failed loudly exactly as its own message asks you to fix rather than skip.
   Only the class-only form is handled; anything else still returns null and fails loudly. */
const NOT_RE = /:not\(\s*(\.[A-Za-z0-9_-]+)\s*\)/g;
function splitNot(compound) {
  const negated = [];
  const positive = compound.replace(NOT_RE, (_, cls) => { negated.push(cls.slice(1)); return ''; });
  return { positive, negated };
}

/* Descendant chains only (no >, +, ~ appear in the selectors that set width here). Matched
   right-to-left against the chain, which is the element's ancestor list.
   Returns false only for what PROVABLY cannot target the element, and null for a selector that
   could target it but this matcher cannot read — which the caller turns into a loud failure
   rather than a silent skip. Getting that distinction wrong is the false-pass direction. */
function selectorMatches(sel, chain) {
  /* `>` is a combinator, not part of a compound. It is dropped here rather than modelled: this
     sheet's only child selectors run `.modal-overlay > .modal…`, and .modal IS the overlay's
     direct child, so descendant matching gives the same answer. A `>` between two compounds that
     are NOT parent and child would be read too loosely — say so if one ever appears. */
  const parts = sel.trim().split(/\s+/).filter((p) => p !== '>');
  const self = chain[chain.length - 1];
  const last = parts[parts.length - 1];
  /* An exclusion the element matches is a rule that provably does NOT target it. */
  const neg = splitNot(last);
  if (neg.negated.some((c) => self.includes(c))) return false;
  /* Does the subject compound name any of the element's own classes at all? If not, it cannot be
     about this element however it is written — `:root`, `html`, `a:hover`, `.btn`, `#id` all exit
     here, silently and correctly. */
  const subjectClasses = classesOf(neg.positive);
  if (!subjectClasses.length || !subjectClasses.every((c) => self.includes(c))) return false;
  /* It IS about this element. From here anything unreadable is a guess, so say so out loud
     rather than dropping it — `.modal-builder:focus-within{width:…}` must not vanish. */
  if (!CLASS_ONLY.test(neg.positive)) return null;
  if (parts.slice(0, -1).some((p) => !CLASS_ONLY.test(splitNot(p).positive))) return null;
  let i = chain.length - 1;
  if (!compoundMatches(neg.positive, chain[i])) return false;
  i--;
  for (let p = parts.length - 2; p >= 0; p--) {
    const anc = splitNot(parts[p]);
    while (i >= 0 && (!compoundMatches(anc.positive, chain[i]) || anc.negated.some((c) => chain[i].includes(c)))) i--;
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
      /* An EMPTY block — including one holding nothing but comments, which are stripped above —
         closes RIGHT HERE. Without this the next `{` search jumps straight past its `}`, that `}`
         is swallowed by the following rule's `replace(/^[};]+/,'')`, and the block never pops: every
         later rule in the file is then resolved as if it were inside this media query. F4 (v140)
         hit exactly that by leaving a comment where the last rule had been, and it dropped the
         `.modal` width rule the assertions below depend on. It failed loudly that time; the same
         slip could as easily make a rule that does not apply look like it does. */
      while (mediaStack.length && /^\s*\}/.test(stripped.slice(i))) {
        mediaStack.pop();
        i = stripped.indexOf('}', i) + 1;
      }
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
          `wiz-takeover.test.js cannot parse selector "${sel.trim()}" — extend the matcher rather than letting it be skipped silently`);
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

for (const name of ['wizard']) {
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

/* F7 (v146): the third test went with the builder. Its subject was the bare `.modal-builder`
   rule losing to the later generic `.modal` one — the pair that made the descendant form
   necessary. The wizard has no bare rule to compare against (it was never written in the losing
   form), so re-pointing the test at it would have asserted nothing. The test above still fails if
   the descendant form is "tidied" back, which is the outcome that mattered. */
