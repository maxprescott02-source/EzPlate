/*
 * privacy-disclosure.test.js — QUEUE item 2, the privacy gate.
 *
 * Max answered option B on 15 Aug 2026: disclose that invoice text and costing figures go to
 * Google's FREE Gemini tier, rather than move to the paid tier that contractually may not train on
 * them (that is item 2b, deferred rather than declined).
 *
 * WHAT THESE TESTS ARE FOR, and it is unusual for this repo: most of them pin COPY. That is
 * deliberate, because the copy IS the feature. The item is explicit that vague wording does not
 * discharge this — *"we may share data with service providers" is exactly the phrasing that hides
 * the material fact* — so a notice that stopped naming Google, or stopped saying that humans may
 * read it, would still render, still be accepted, and no longer disclose anything. There is no
 * behaviour to assert about that; there is only the words.
 *
 * ⚠️ THEY PIN THE CLAIMS, NOT THE SENTENCES. Each test looks for the material fact — the company's
 * name, the word "training", human review — rather than a whole paragraph, so the notice can be
 * rewritten and improved without going red, and cannot be quietly hollowed out.
 * ⚠️ AND WHEN ITEM 2b SHIPS, THE SECOND SECTION'S TESTS MUST BE INVERTED, NOT DELETED. On the paid
 * tier the claim becomes "Google may NOT use this for training", which is just as material and just
 * as worth pinning. A batch that deletes these because the wording changed has removed the guard
 * along with the thing it guarded.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const H = require('./_extract.js');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const APP = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');

/** The notice's own markup, sliced so a match cannot come from somewhere else in the page. */
function noticeHtml() {
  const start = HTML.indexOf('id="privacyModal"');
  assert.ok(start > 0, 'the privacy notice modal must exist');
  const end = HTML.indexOf('</div>\n</div>', start);
  return HTML.slice(start, end > 0 ? end : start + 6000);
}

/* ---------------------------------------------------------------------------
 * 1. THE NOTICE SAYS THE THINGS THAT MAKE IT A DISCLOSURE.
 * ------------------------------------------------------------------------- */

test('item 2: the notice names GOOGLE, not "a service provider"', () => {
  /* The unusual specific is the whole point. A notice that says data goes to "third-party AI
     services" is true, discloses nothing, and is the exact phrasing the item warns about. */
  const n = noticeHtml();
  assert.match(n, /Google/, 'the company is named');
  assert.doesNotMatch(n, /service provider/i, 'and not hidden behind the generic phrase');
});

test('item 2: it says the tier may TRAIN on the data and that HUMANS may read it', () => {
  /* Google's two published terms for the free tier, and the two facts a café owner would want
     before uploading a supplier invoice. Either one missing makes the notice a description of a
     feature rather than a disclosure. */
  const n = noticeHtml();
  assert.match(n, /free tier/i, 'the tier is named, because the terms differ by tier');
  assert.match(n, /training/i, 'training is stated in the word people recognise');
  assert.match(n, /improve its products/i, 'in Google’s own framing, which is what the terms say');
  assert.match(n, /[Hh]uman reviewers.{0,40}may read/, 'and that humans may read it');
});

test('item 2: it says WHAT leaves — both paths, by name', () => {
  /* Two endpoints send data: api/parse-invoice (invoice text) and api/insight (plate names and
     figures). A notice covering one of them understates the exposure. */
  const n = noticeHtml();
  assert.match(n, /[Ii]nvoice text/, 'the invoice path');
  assert.match(n, /[Pp]late names/, 'and the insight path');
  assert.match(n, /supplier/i, 'naming the supplier, which is the commercially sensitive part');
});

test('item 2: it says what does NOT leave, and what can be turned off', () => {
  const n = noticeHtml();
  assert.match(n, /password/i, 'credentials are named as not leaving');
  assert.match(n, /AI suggestions/, 'the Settings toggle is named so it can be found');
  assert.match(n, /no analytics and no tracking/i, 'and the standing no-tracking promise is restated');
});

/* ---------------------------------------------------------------------------
 * 2. IT IS SHOWN BEFORE THE DATA MOVES — which is the half that is easy to ship wrong.
 * ------------------------------------------------------------------------- */

test('item 2: the sign-up form carries an acceptance the notice is linked from', () => {
  /* "Shown and accepted at signup, before an account exists." The checkbox is inside the sign-up
     form rather than beside it, so it cannot drift out of the form it gates. */
  const start = HTML.indexOf('id="bgSignUpForm"');
  assert.ok(start > 0, 'the sign-up form exists');
  const form = HTML.slice(start, HTML.indexOf('</form>', start));
  assert.match(form, /id="bgUpAccept"/, 'the acceptance is INSIDE the sign-up form');
  assert.match(form, /id="bgUpPrivacyLink"/, 'with the notice linked from the label');
  assert.match(form, /Google/, 'and the label names Google, so the checkbox is not a blind tick');
});

test('item 2: the gate RUNS the real decision — ticked passes, everything else refuses', () => {
  /* ⚠️ THIS TEST REPLACED AN ORDER-ONLY ONE THAT COULD NOT FAIL, and the story is roster entry
     167(a) arriving again. The first version asserted that `bgUpAccept` was read BEFORE
     `authSubmit` and that a `return` sat between them — both true of an INVERTED guard, so flipping
     `!acc.checked` to `acc.checked` (blocking sign-up when the box IS ticked) left all twelve tests
     green. Caught by the pre-push review, which ran the mutation rather than reading the test.
     The remedy is the standing one: the decision is extracted as `privacyAcceptNeeded` and this
     calls the REAL function rather than describing where it sits. */
  assert.equal(H.privacyAcceptNeeded({ checked: true }), false, 'a ticked box is the only thing that passes');
  assert.equal(H.privacyAcceptNeeded({ checked: false }), true, 'an unticked one refuses');

  /* And it REFUSES when the checkbox is missing, rather than falling open. The inline version was
     `acc && !acc.checked`, which is false for a null element — so a markup rename would have
     shipped an ungated sign-up in silence. A missing checkbox blocks sign-up loudly and is fixed by
     restoring one element; the other direction sends a stranger's invoice text to Google having
     never shown them what leaves. */
  for (const missing of [null, undefined, false, 0, '']) {
    assert.equal(H.privacyAcceptNeeded(missing), true, `a ${JSON.stringify(missing)} element must refuse, not fall open`);
  }
  /* A truthy non-checkbox is the other half of the same worry: `checked` must be read strictly, so
     an element that simply has no such property cannot pass by being truthy. */
  assert.equal(H.privacyAcceptNeeded({}), true, 'an element with no checked property refuses');
  assert.equal(H.privacyAcceptNeeded({ checked: 'yes' }), true, 'and a truthy non-boolean does not count as ticked');
});

test('item 2: the gate is called BEFORE anything commits', () => {
  /* The order still matters and is still worth pinning — `authSubmit` reaches `signUp`, which
     creates the account and spends one of the project's rate-limited confirmation emails, and
     CLAUDE.md's rule is that gating the last committing action is not a gate.
     This is a source-level check and weak ON ITS OWN (roster 183a), which is exactly why it is now
     one of three: the test above proves the decision is right, this proves it runs first, and
     tests/visual/item2-privacy.spec.js proves the refusal actually reaches the screen. */
  const start = APP.indexOf('function wireGateSignUp');
  const fn = APP.slice(start, APP.indexOf('\nfunction ', start + 10));
  const gate = fn.indexOf('privacyAcceptNeeded(');
  const commit = fn.indexOf('authSubmit(');
  assert.ok(gate > 0, 'the handler calls the extracted decision');
  assert.ok(commit > 0, 'and calls authSubmit');
  assert.ok(gate < commit, 'the acceptance is checked BEFORE the account is created');
  assert.match(fn.slice(gate, commit), /return;/, 'and refuses rather than warning and continuing');
});

test('item 2: the notice is reachable WITHOUT an account, from the gate screen', () => {
  /* A policy you can only read by signing in is not one a prospective user can consider. The gate
     is z-index 60 and the modal overlay is 80, so it opens over the top. */
  assert.match(HTML, /id="bgPrivacyLink"/, 'the signed-out gate links to it');
  assert.match(APP, /#bgPrivacyLink/, 'and the link is wired');
});

test('item 2: it is RESTATED at both invoice dropzones, where the data actually leaves', () => {
  /* "Someone who accepted a policy three weeks ago has not meaningfully consented to today's
     upload." Two dropzones exist — the Invoices screen and the upload modal's step 1 — and the
     import can start from either, so a restatement on one is a restatement on the path the user
     did not take. */
  const zones = HTML.split('class="inv-privacy"').length - 1;
  assert.equal(zones, 2, 'both import entry points restate it');
  assert.match(HTML, /id="invPrivacyLink"/, 'the upload modal links to the full notice');
  assert.match(HTML, /id="invzPrivacyLink"/, 'and so does the Invoices screen');
});

test('item 2: the Settings toggle says where the data goes, not just that calls stop', () => {
  /* The item's fourth bullet. The old copy was "Off = no AI calls" — true about calls, silent about
     Google, which is the one fact the notice exists to surface. */
  const start = HTML.indexOf('for="setAiSuggestChk"');
  const row = HTML.slice(start, start + 900);
  assert.match(row, /Google/, 'the destination is named on the control itself');
  assert.match(row, /id="stgPrivacyLink"/, 'with the notice one tap away');
});

/* ---------------------------------------------------------------------------
 * 3. THE MECHANICS.
 * ------------------------------------------------------------------------- */

test('item 2: one opener serves every link, wired by class', () => {
  /* Five placements today and a sixth is likely. Wiring by class means the next one is a class in
     the markup rather than another line in the wiring — and, more importantly, that every link
     opens the SAME notice, which is the property that would otherwise rot. */
  assert.match(APP, /function openPrivacyNotice/, 'there is one definition of "open the notice"');
  assert.match(APP, /\.privacy-open/, 'and the links are found by class');
  const wired = APP.indexOf('wirePrivacyNotice()');
  assert.ok(wired > 0, 'and it is called at boot');
});

test('item 2: the notice closes the three ways every other modal here does', () => {
  const start = APP.indexOf('function wirePrivacyNotice');
  const fn = APP.slice(start, APP.indexOf('\nfunction ', start + 10));
  assert.match(fn, /privacyClose/, 'the × button');
  assert.match(fn, /privacyDone/, 'the footer button');
  assert.match(fn, /ev\.target===ov/, 'and the scrim, without dismissing on a click inside it');
});

test('item 2: every display rule for the new copy carries the [hidden] guard', () => {
  /* CLAUDE.md's standing idiom: an author `display` rule beats the UA's `[hidden]{display:none}`
     because ORIGIN is compared before specificity, so an element the JS hides stays visible. The
     acceptance row is the one that would bite — it lives inside a form that is `hidden` on the
     sign-in side of the gate. */
  const css = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
  for (const sel of ['.acct-accept', '.inv-privacy']) {
    const re = new RegExp('\\' + sel + '(:not\\(\\[hidden\\]\\))?\\{[^}]*display:', 'g');
    const hits = css.match(re) || [];
    assert.ok(hits.length, `${sel} must have a display rule to check`);
    for (const h of hits) {
      assert.match(h, /:not\(\[hidden\]\)/, `${sel} sets display without the [hidden] guard`);
    }
  }
});
