/*
 * verdict-subject.test.js — 229: every verdict phrase names what it is judging.
 *
 * THE SPLIT IS DECIDED AND THIS DOES NOT REOPEN IT. F8 (v147) settled that the app speaks three
 * vocabularies on purpose, because they have three different SUBJECTS: the Menu cell judges COST
 * against target ("over" / "well over"), `marginLightWord` judges PRICE against suggested, and the
 * filter chips say what you would DO ("Watch" / "Rework"). One shared LIGHT from `analyze()` keeps
 * the colour consistent; the words differ because the questions differ.
 *
 * WHAT WAS WRONG. Of the nine phrases, "Slightly under" alone named no subject — and it renders
 * directly after "…→ 30.0% food cost", so the nearest figure a reader has just been handed is a
 * COST while the phrase is about PRICE. Under what, exactly, was the whole defect.
 *
 * WHY A TEST AT ALL, for two words. Nothing pinned any of these strings before this batch, so the
 * property "a verdict phrase names its subject" lived only in a comment — and the phrase that
 * violated it survived a whole batch (F8) that was explicitly reasoning about these three
 * vocabularies and wrote the violation down as a residual rather than fixing it. A property that
 * one careful reader recorded and did not act on is exactly the kind worth mechanising.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

// eslint-disable-next-line no-new-func
const marginLightWord = new Function(`${extractFn(SRC, 'marginLightWord')} return marginLightWord;`)();

/* The subject words this app is allowed to judge. Deliberately a small allowlist rather than a
   "must not be vague" denylist: roster entry 190 is that a denylist is a guess about every wrong
   value there could be, while an allowlist is a fact about this app. */
const SUBJECTS = ['margin', 'price', 'priced', 'cost'];
const namesASubject = (s) => SUBJECTS.some((w) => s.toLowerCase().includes(w));

test('229: every margin verdict phrase names what it judges', () => {
  const phrases = ['green', 'amber', 'red'].map((l) => marginLightWord(l));
  assert.deepStrictEqual(phrases, ['Healthy margin', 'Slightly underpriced', 'Underpriced']);
  for (const p of phrases) {
    assert.ok(namesASubject(p), `"${p}" names no subject — a reader cannot tell what it is about`);
  }
});

/* The amber and red phrases must stay TELLABLE APART by their words, not only by their colour.
   That is the app's own established idiom — `vbadge` uses "over" against "well over" for exactly
   this reason, and its comment says hue was otherwise the only difference between the two. */
test('229: amber and red differ in words, not just in hue', () => {
  const amber = marginLightWord('amber');
  const red = marginLightWord('red');
  assert.notStrictEqual(amber, red);
  assert.match(amber, /^Slightly /, 'amber is the SAME judgement at a lesser degree');
  assert.ok(amber.toLowerCase().includes(red.toLowerCase()),
    'and it says so by containing the stronger phrase, the way "well over" contains "over"');
});

/* An unknown light is the empty string, not a phrase. `renderMenuMarginPreview` concatenates this
   after a "·" separator, so a fallback word would print a verdict for a state that has none. */
test('229: an unrecognised light says nothing at all', () => {
  for (const l of ['none', '', null, undefined, 'blue']) {
    assert.strictEqual(marginLightWord(l), '', `${String(l)} must not produce a verdict`);
  }
});
