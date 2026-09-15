/*
 * fmt-date.test.js — ONE date style (QUEUE item 60, batch 270).
 *
 * The app printed a moment in time eight different ways: a bare `toLocaleDateString()` on Invoices
 * whose output depended on the DEVICE, a five-branch relative label on the Dashboard, three copies
 * of one options object, a month name under What moved, and a chart axis that rendered "8 Sept"
 * beside "24 Aug". They are all `fmtDate` now, and this file is what stops them separating again.
 *
 * ⚠️ THE TIMEZONE IS FORCED, AND IT HAS TO BE, BEFORE ANYTHING CONSTRUCTS A DATE.
 * fmtDate counts CALENDAR days, so every threshold in it is a question about a local midnight. On a
 * UTC runner the DST assertions below are vacuous — there is no 23-hour day to get wrong — which is
 * the "green test that cannot fail" class this repo records more than any other. A café timezone
 * with real transitions is what makes them mean something, and CI runs in UTC.
 *
 * `process.env.TZ` is read by V8 the first time a Date is built, so this assignment is the first
 * statement in the file on purpose. Moving it below the requires makes these tests pass for the
 * wrong reason rather than fail.
 */
process.env.TZ = 'Australia/Sydney';

const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn, noComments, dateKit } = require('./_extractfn');

const APP = loadApp();

/* Extracted, not stubbed — tests.md's oldest rule. A hand-rolled month table in this file would
   agree with whatever this file believed about "Sep", which is the exact thing under test. */
// eslint-disable-next-line no-new-func
const D = new Function(`"use strict"; ${dateKit(APP)}
  return { fmtDate: fmtDate, fmtDateAbs: fmtDateAbs, dateMs: dateMs, MON3: MON3 };`)();

const at = (y, m, d, h) => new Date(y, m - 1, d, h == null ? 12 : h, 0, 0).getTime();
const NOW = at(2026, 9, 15);                       // Tue 15 Sep 2026, local noon

/* ------------------------------------------------------------------ the thresholds */

test('under seven days is relative, and the words are today / yesterday / N days ago', () => {
  assert.strictEqual(D.fmtDate(at(2026, 9, 15), NOW), 'today');
  assert.strictEqual(D.fmtDate(at(2026, 9, 14), NOW), 'yesterday');
  assert.strictEqual(D.fmtDate(at(2026, 9, 13), NOW), '2 days ago');
  assert.strictEqual(D.fmtDate(at(2026, 9, 10), NOW), '5 days ago');
  assert.strictEqual(D.fmtDate(at(2026, 9, 9), NOW), '6 days ago', 'the last relative day');
});

test('from seven days it is the date, and seven is the switch', () => {
  assert.strictEqual(D.fmtDate(at(2026, 9, 9), NOW), '6 days ago');
  assert.strictEqual(D.fmtDate(at(2026, 9, 8), NOW), '8 Sep 2026', 'exactly seven days is the first absolute one');
  assert.strictEqual(D.fmtDate(at(2026, 9, 7), NOW), '7 Sep 2026');
  assert.strictEqual(D.fmtDate(at(2026, 8, 24), NOW), '24 Aug 2026');
  assert.strictEqual(D.fmtDate(at(2025, 8, 11), NOW), '11 Aug 2025', 'the year is always present');
});

/* ⚠️ THE BOUNDARY IS THE CALENDAR DAY, NOT ELAPSED HOURS, and this is the one behaviour change the
   fold-in makes rather than inherits. The deleted relDayLabel divided elapsed milliseconds by
   86400000, so a change made at 11pm still read "today" when it was opened at 10am — eleven hours
   is less than one. Both assertions below are red against that arithmetic. */
test('11pm yesterday is YESTERDAY at 10am, and 1am today is TODAY', () => {
  assert.strictEqual(D.fmtDate(at(2026, 9, 14, 23), at(2026, 9, 15, 10)), 'yesterday',
    'eleven elapsed hours, one calendar day — the word a human would use');
  assert.strictEqual(D.fmtDate(at(2026, 9, 15, 1), at(2026, 9, 15, 23)), 'today',
    'twenty-two elapsed hours, zero calendar days');
});

test('a 23-hour and a 25-hour day are each ONE day', () => {
  // Australia/Sydney: 4 Oct 2026 springs forward (23h), 5 Apr 2026 falls back (25h).
  assert.strictEqual(D.fmtDate(at(2026, 10, 4), at(2026, 10, 5)), 'yesterday', 'the 23-hour day');
  assert.strictEqual(D.fmtDate(at(2026, 4, 5), at(2026, 4, 6)), 'yesterday', 'the 25-hour day');
  // and the switch still lands on seven across a transition rather than six or eight
  assert.strictEqual(D.fmtDate(at(2026, 9, 29), at(2026, 10, 5)), '6 days ago');
  assert.strictEqual(D.fmtDate(at(2026, 9, 28), at(2026, 10, 5)), '28 Sep 2026');
});

/* ------------------------------------------------------------------ the device gets no vote */

/* ⚠️ THE CONTROL NAMES ITS LOCALES, AND THE FIRST DRAFT DID NOT — IT PASSED HERE AND FAILED IN CI.
   It asserted `toLocaleDateString(undefined, …) === '8 Sept'`, which is true on a machine set to
   en-AU or en-GB and false on the ubuntu-latest runner, where the ambient locale is en-US and the
   same call returns "Sep 8". `process.env.TZ` at the top of this file forces the TIMEZONE and says
   nothing about the LOCALE, and I had read the one as covering the other.
   ⚠️ **It passed locally for the reason it was written to rule out: this machine already agreed
   with it.** That is the same shape as a stub written from the same belief as the code.
   Naming both locales is strictly stronger than what it replaced, because the two halves of the
   defect are different on each: en-AU gets the month abbreviation wrong (four letters against
   three) and en-US gets the ORDER wrong. One ambient assertion could only ever show one of them. */
test('the month is the app\'s own three letters, never the device\'s "Sept" or "Sep 8"', () => {
  assert.strictEqual(D.fmtDateAbs(at(2026, 9, 8)), '8 Sep 2026');

  const d = new Date(at(2026, 9, 8));
  assert.strictEqual(d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }), '8 Sept',
    'en-AU really does say Sept, or this test is measuring nothing');
  assert.strictEqual(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), '8 Sept',
    'and so does en-GB');
  assert.strictEqual(d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }), 'Sep 8',
    'while en-US reverses the ORDER — the half of this defect a UK-only control cannot see');

  // every month, and every one exactly three letters, so no second "Sept" can appear
  const months = Array.from({ length: 12 }, (_, i) => D.fmtDateAbs(at(2026, i + 1, 1)).split(' ')[1]);
  assert.deepStrictEqual(months, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
  months.forEach((m) => assert.strictEqual(m.length, 3, `${m} is not three letters`));
});

test('the day is never zero-padded and the order is day month year', () => {
  assert.strictEqual(D.fmtDateAbs(at(2026, 9, 1)), '1 Sep 2026');
  assert.strictEqual(D.fmtDateAbs(at(2026, 9, 30)), '30 Sep 2026');
});

/* ------------------------------------------------------------------ the inputs it is really given */

test('it takes what the app actually stores: epoch ms, an ISO string, a Date', () => {
  const ms = at(2026, 8, 24);
  assert.strictEqual(D.fmtDateAbs(ms), '24 Aug 2026');
  assert.strictEqual(D.fmtDateAbs(new Date(ms).toISOString()), '24 Aug 2026', 'Supabase points arrive as ISO strings');
  assert.strictEqual(D.fmtDateAbs(new Date(ms)), '24 Aug 2026', 'backupToPayload hands over Date objects');

  /* A numeric STRING is refused, and that is deliberate rather than an oversight. The two shapes
     this app stores are epoch ms (ptMs, logHistory) and ISO strings (cafeDB_lastImport, exported_at,
     recorded_at) — checked at the writers, not assumed. Accepting "1758..." as well would mean
     guessing whether a four-digit string is a year or a timestamp, and new Date('2026') already
     answers that one way. An unsupported shape returns '' and the caller shows its own fallback. */
  assert.strictEqual(D.fmtDateAbs(String(ms)), '', 'a numeric string is not a shape this app stores');
});

/* ⚠️ THE EMPTY STRING IS THE POINT OF THIS TEST, not the nulls. app-guards.md: isFinite('') is TRUE
   because Number('') is 0, so a guard written as isFinite alone turns a blank into 1 Jan 1970 —
   which every caller here would then print as a real date beside a real price. */
test('nothing unusable renders as a date', () => {
  ['', '   ', null, undefined, NaN, Infinity, -Infinity, 'not a date', {}, []].forEach((bad) => {
    assert.strictEqual(D.fmtDate(bad, NOW), '', `fmtDate(${JSON.stringify(bad)})`);
    assert.strictEqual(D.fmtDateAbs(bad), '', `fmtDateAbs(${JSON.stringify(bad)})`);
  });
  assert.ok(!isFinite(D.dateMs('')), 'the empty string is refused at dateMs, before isFinite can say true');
});

test('a future stamp is a clock skew and shows its date, never "in 3 days"', () => {
  assert.strictEqual(D.fmtDate(at(2026, 9, 20), NOW), '20 Sep 2026');
  assert.strictEqual(D.fmtDate(at(2026, 9, 16), NOW), '16 Sep 2026', 'tomorrow too — there is no forward vocabulary');
});

test('with no second argument it reads the real clock', () => {
  assert.strictEqual(D.fmtDate(Date.now()), 'today');
  assert.strictEqual(D.fmtDate(Date.now() - 40 * 86400000).length > 'today'.length, true, 'and forty days back is a date');
});

/* ------------------------------------------------------------------ nothing else formats a date */

/* ⚠️ A COUNT, NOT AN ABSENCE, and the comments are stripped first — tests.md roster 183(a): an
   assertion that greps a source file is searching PROSE as well as code, and the prose here is a
   comment naming toLocaleDateString in order to forbid it. A bare "no call sites survive" test
   would go red on its own explanation.
   The census is by IDENTITY rather than by number: every locale date call left in js/app.js must be
   one of monthLabel's, so a new one anywhere else fails even if somebody deletes one of these two. */
test('every remaining locale date call lives in monthLabel, and there are no others', () => {
  const LOCALE_DATE = /toLocaleDateString|toLocaleTimeString|toLocaleString|toDateString|Intl\.DateTimeFormat/g;
  const code = noComments(APP, 'block', 'line');
  const monthLabel = noComments(extractFn(APP, 'monthLabel'), 'block', 'line');

  const inFile = code.match(LOCALE_DATE) || [];
  const inMonthLabel = monthLabel.match(LOCALE_DATE) || [];

  assert.ok(inMonthLabel.length > 0, 'monthLabel still formats a date, or this test is vacuous');
  assert.deepStrictEqual(inFile, inMonthLabel,
    `js/app.js has ${inFile.length} locale date call(s) and monthLabel accounts for ${inMonthLabel.length}. ` +
    'Item 60 folded every other one into fmtDate — add the new site to fmtDate, do not re-open a second style.');
});

/* ⚠️ monthLabel IS THE DELIBERATE EXCEPTION AND THIS TEST EXISTS TO STOP THE NEXT DATE SWEEP
   "FINISHING THE JOB". It is a month NOUN, not a date: its callers put it inside "higher than at
   March prices", "cost $1.40 more than in June", "every cost change since April". A date there is
   not English, and tests/insights.test.js calls a null one "no reference month". */
test('monthLabel stays a month NOUN — it is not a date and must not become one', () => {
  // eslint-disable-next-line no-new-func
  const ml = new Function(`"use strict"; ${extractFn(APP, 'monthLabel')} return monthLabel;`)();
  const sameYear = ml(at(2026, 3, 9));
  const otherYear = ml(at(2025, 3, 9));

  /* These four hold in EVERY locale, because the contract is "a month noun" and not "an English
     word". They are what carries this test; the literal below is guarded and cannot make it
     vacuous. `monthLabel` reads the DEVICE locale deliberately, unlike fmtDate, which is the whole
     reason it was excluded from item 60 — so a test that pins its output pins the runner. */
  assert.ok(sameYear.length > 0, 'it names something');
  assert.ok(!/\d/.test(sameYear), 'no digits in the same-year form, so "at March prices" stays a sentence');
  assert.match(otherYear, /\b2025\b/, 'a different year IS named, because the month alone would lie');
  assert.ok(otherYear.startsWith(sameYear), 'and it is that same month word plus a year, not a second format');

  /* ⚠️ GUARDED, and the guard is the finding rather than a convenience. The first draft asserted
     'March' unconditionally; it is green on en-US (CI) and en-AU (Max's machine) and RED on a
     French runtime, where monthLabel returns "mars". That is the same defect as the locale control
     above, one test along, found by running this file under fr-FR rather than by reading it.
     The literal is kept because it is the only assertion that says what the copy actually READS,
     and a monthLabel emitting "mars" inside four English sentences would be a real defect — it is
     simply not one this repo can reproduce, so it is asserted where it is meaningful and skipped
     where it would only measure the runner. */
  if (/^en\b/.test(Intl.DateTimeFormat().resolvedOptions().locale)) {
    assert.strictEqual(sameYear, 'March', 'a month in this year is the month alone');
    assert.strictEqual(otherYear, 'March 2025');
  }
});

/* ------------------------------------------------------------------ the axis keeps its own form */

/* The chart axis is the one surface item 60's relative rule does NOT reach, and that is a decision:
   a tick is a POSITION on a scale, so "6 days ago" under a reading says nothing about where it sits
   relative to its neighbour. What was wrong there was the month vocabulary, and that is what moved.
   Pinned here rather than only in trend-reframe.test.js because the refusal belongs beside the rule
   it is an exception to — a reader finding this file will not otherwise learn the axis was asked. */
test('the axis is absolute, compact, and uses the same month words', () => {
  // eslint-disable-next-line no-new-func
  const tf = new Function(`"use strict"; ${dateKit(APP)} ${extractFn(APP, 'trendFmtDate')} return trendFmtDate;`)();
  assert.strictEqual(tf(at(2026, 9, 8), false), '8 Sep', 'the defect the item names, on the surface it named');
  assert.strictEqual(tf(at(2026, 8, 24), false), '24 Aug');
  assert.strictEqual(tf(at(2026, 9, 8), true), 'Sep 26', 'the long-span branch keeps its two-digit year');
  assert.strictEqual(tf(at(2026, 1, 8), true), 'Jan 26');
  assert.strictEqual(tf(at(2005, 1, 8), true), 'Jan 05', 'a year under ten is padded, not rendered as "Jan 5"');
  assert.strictEqual(tf('nonsense', false), '');

  assert.ok(!/ago|today|yesterday/.test([tf(Date.now(), false), tf(Date.now(), true)].join(' ')),
    'no relative word can reach a tick label, whatever fmtDate does');
});
