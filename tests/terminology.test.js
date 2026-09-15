/*
 * terminology.test.js (v86) — the app has FOUR object nouns in user-facing copy:
 *   Product · Ingredient · Plate · Menu
 *
 * "Recipe" names nothing in this app, and "kitchen word" / "kitchen name" is internal
 * vocabulary for what the UI calls an Ingredient. Both had leaked into shipped copy twice
 * before (v83 removed one batch and flagged three survivors; v86 is the third sighting), so
 * they are pinned here rather than left to the next reviewer's eye.
 *
 * The second half of this file is the mirror-image guard: the deliberate naming INVERSION
 * (CLAUDE.md) means the internal identifiers must NOT be "tidied" to match the labels. A
 * terminology pass is exactly when someone is tempted to rename them, so the identifiers are
 * pinned too — renaming any of them is a rollback-grade mistake, not a cleanup.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');

// app.js keeps "recipe"/"kitchen word" in explanatory COMMENTS, which is fine — they are not
// copy. Strip whole-line comments so the assertions below look only at shippable code.
const appCode = app
  .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))   // block comments -> blanks (line numbers preserved)
  .split('\n')
  .map(l => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1'))             // line comments, but not the // in a URL
  .join('\n');

test('index.html contains no "recipe" anywhere — it names no object in this app', () => {
  const hits = html.split('\n')
    .map((l, i) => ({ n: i + 1, l }))
    .filter(o => /recipe/i.test(o.l));
  assert.deepEqual(hits.map(o => `${o.n}: ${o.l.trim()}`), [], 'index.html must not mention recipes');
});

test('the Ingredients strapline explains without naming a forbidden object', () => {
  /* F3 (v139): the sentence MOVED, and the test follows it rather than pinning a location. The v3
     header bar (§2) is title + one computed subtitle + actions, with no room for a strapline, so
     R3 re-housed this one into the screen's empty state — where a café that does not yet know what
     an Ingredient is will actually read it, instead of above a list that already answers it.
     What matters is that the app still explains Ingredient -> Product SOMEWHERE, in the four-noun
     vocabulary, so the assertion spans both files. */
  const anywhere = html + appCode;
  assert.match(anywhere, /Each one links to a product you buy/,
    'the Ingredient -> Product explanation still ships somewhere in the app');
  assert.match(anywhere, /the names you cook with/i,
    'and still describes an Ingredient without naming a fifth object');
  assert.ok(!/Kitchen words for recipes/i.test(anywhere), 'the old strapline named two non-objects');
});

test('the link-a-product hint costs from PLATES, not recipes', () => {
  assert.match(html, /Plates cost from this product\. Switch it later and every plate follows/);
});

test('the invoice add-new form labels the object it creates: an Ingredient', () => {
  assert.match(appCode, /niLab\('Ingredient name \(optional\)'/, 'the field creates/links an Ingredient');
  assert.ok(!/Kitchen name \(optional\)/.test(appCode), '"Kitchen name" is internal vocabulary');
});

test('its placeholder still EXPLAINS the field (explanatory phrasing is allowed)', () => {
  // 267: sentence case, per the placeholder rule pinned at the bottom of this file. The guard here
  // is about the WORDS — explaining the field without naming a fifth object — and they are unchanged.
  assert.match(appCode, /placeholder="The name you\\u2019ll use when building plates"/);
});

test('no "kitchen word" / "kitchen name" survives in shippable code', () => {
  const bad = appCode.split('\n')
    .map((l, i) => ({ n: i + 1, l }))
    .filter(o => /kitchen (word|name)/i.test(o.l));
  assert.deepEqual(bad.map(o => `${o.n}: ${o.l.trim().slice(0, 120)}`), []);
});

test('no "recipe" survives in shippable code', () => {
  const bad = appCode.split('\n')
    .map((l, i) => ({ n: i + 1, l }))
    .filter(o => /recipe/i.test(o.l));
  assert.deepEqual(bad.map(o => `${o.n}: ${o.l.trim().slice(0, 120)}`), []);
});

test('v86: "dish" is no longer a UI noun — the object is a Plate (Max, 25 Jul 2026)', () => {
  // Inspect each STRING LITERAL on its own, not the whole line: a line may legitimately mention
  // dishesOfPlate/data-dish and ALSO carry user-facing copy, and exempting the line would hide it.
  const IDENTIFIERS = /dishesOfPlate|dishDriver|dishCount|dishNamesByPid|data-dish|addDishModal|menuAddDishBtn|dishesOf\b/g;
  const re = /(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g;
  const bad = [];
  let m;
  while ((m = re.exec(appCode)) !== null) {
    const literal = m[2];
    if (!/\bdish(es)?\b/i.test(literal.replace(IDENTIFIERS, ''))) continue;
    bad.push(`${appCode.slice(0, m.index).split('\n').length}: ${literal.slice(0, 110)}`);
  }
  assert.deepEqual(bad, []);
});

/* ---- 267: ONE CASING SYSTEM for placeholders ----------------------------------
   The rule, and it is the whole rule: A PLACEHOLDER STARTS WITH A CAPITAL LETTER OR A DIGIT.
   The one exception is a literal email address, which is lower case because that is how an email
   address is written — capitalising it would be teaching the user something false about their own
   address.

   Before this, 44 placeholders came in three unstated styles: sentence case ("Search your products…"),
   lower case ("search suppliers…", "qty", "unit price"), and "e.g. " prefixes ("e.g. Chips",
   "e.g. 65.00"). Two of the three appeared in ONE modal, in adjacent fields.

   ⚠️ THE `e.g. ` CAME OFF THE TEXT FIELDS AND STAYED ON THE NUMERIC ONES, and that is a decision
   rather than an oversight. A greyed "Chips" in a product-name field cannot be mistaken for a value
   the app has already filled in. A greyed "24.00" in "Sell price on this menu ($)" CAN, and this is a
   costing app — a number the user believes is already there is the expensive kind of wrong. So the
   four number-shaped examples keep an explicit marker and wear it in sentence case: "E.g. 24.00".
   Both halves satisfy the one rule above, which is why the rule is about the FIRST CHARACTER and not
   about the wording.

   This is asserted over BOTH files, and comments are stripped first — a grep over source searches
   PROSE as well as code (roster 183(a)), and this very paragraph quotes four of the old placeholders. */
test('267: every placeholder starts with a capital or a digit — an email address is the one exception', () => {
  const EMAIL = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;      // a literal address, e.g. you@example.com
  const bad = [];
  for (const [name, text] of [['index.html', html.replace(/<!--[\s\S]*?-->/g, '')], ['js/app.js', appCode]]) {
    const re = /placeholder=(\\?["'])((?:\\.|(?!\1)[^\\\n])*)\1/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const value = m[2].replace(/\\u2019/g, '’').replace(/&#10;/g, '\n').split('\n')[0];
      if (!value) continue;
      if (EMAIL.test(value)) continue;
      if (/^[A-Z0-9]/.test(value)) continue;
      bad.push(`${name} :: ${value}`);
    }
  }
  assert.deepEqual(bad, [], 'these placeholders start lower case');
});

test('267: the assertion above can actually see a bad placeholder', () => {
  /* The guard on the guard, because an assertion that scans two large files for a pattern is exactly
     the shape that goes vacuous when the pattern stops matching (roster 167/205): a regex that found
     NOTHING and a regex that found nothing WRONG produce the same empty array. So: it must find the
     real ones, and it must reject an injected bad one. */
  const re = /placeholder=(\\?["'])((?:\\.|(?!\1)[^\\\n])*)\1/g;
  const found = (html.match(re) || []).length + (appCode.match(re) || []).length;
  assert.ok(found > 30, `the placeholder pattern must still match the real attributes — found ${found}`);
  assert.ok(/^[A-Z0-9]/.test('Search suppliers…'), 'sanity: the accept side');
  assert.ok(!/^[A-Z0-9]/.test('search suppliers…'), 'sanity: the reject side — the exact string this batch fixed');
});

/* ---- the naming inversion: these must NEVER be renamed to match the labels ---- */

test('INVERSION GUARD: the internal identifiers are untouched by the copy pass', () => {
  for (const id of ['kitchenIngredients', 'renderKitchenPanel', 'addKitchenLine',
                    'saveKitchenIngredients', 'kitchenSearchMatches']) {
    assert.ok(app.includes(id), `${id} must still exist — renaming identifiers has caused rollbacks`);
  }
  /* v108: KINGKEY and the `cafeDB_kitchenIngredients` literal were dropped from this list because the
     local mirror they named is GONE — kitchen words live in app_settings.kitchen_ingredients now. The
     guard itself is unweakened: it lost a localStorage key and kept the SERVER key, which is the
     stronger contract of the two and the one a rename would actually corrupt. Deleting a store is not
     the failure this guard exists to catch; renaming `kitchenIngredients` to match the UI label is,
     and that is still pinned above. */
  assert.match(app, /'kitchen_ingredients'/, 'the Supabase app_settings key is a data contract');
});

test('INVERSION GUARD: the crossed data-tab values still say pantry/ingredients', () => {
  assert.match(html, /data-tab="pantry"/, 'the tab LABELLED "Ingredients"');
  assert.match(html, /data-tab="ingredients"/, 'the tab LABELLED "Products"');
});

/* v126 (audit T1): the guard above proves both attributes EXIST — it cannot catch the label SWAP,
   which is the exact "fix" Tier 1 forbids. This one pins the CROSSING itself, both halves of it:
   the nav button carries the internal name and the crossed human label on the same element, and
   the PANEL each tab opens carries the same crossed heading (showTab binds data-tab straight to
   tab-<name>, so the h2 is the label a user reads once inside — the review found the first cut
   pinned only the nav half). Swapping either half goes red while both attributes still exist.
   The exact-label positives make "never says the other word" negatives redundant — a swap flips
   the positives — and a whole-button negative false-positived on legitimate attribute text. */
test('INVERSION GUARD: the CROSSING itself — nav buttons AND panel headings carry the crossed labels', () => {
  const nav = (tab) => {
    const m = html.match(new RegExp(`<button[^>]*data-tab="${tab}"[^>]*>[\\s\\S]*?</button>`));
    assert.ok(m, `nav button with data-tab="${tab}" exists`);
    return m[0];
  };
  const label = (name) => new RegExp(`<span class="nl(?: [^"]*)?">${name}</span>`);   // tolerant of added classes, not of a different label

  const pantry = nav('pantry');
  assert.match(pantry, /aria-label="Ingredients"/, 'pantry announces as Ingredients');
  assert.match(pantry, label('Ingredients'), 'pantry is LABELLED Ingredients');

  const ingredients = nav('ingredients');
  assert.match(ingredients, /aria-label="Products"/, 'ingredients announces as Products');
  assert.match(ingredients, label('Products'), 'ingredients is LABELLED Products');

  const builder = nav('builder');
  assert.match(builder, /aria-label="Plates"/, 'builder announces as Plates');
  assert.match(builder, label('Plates'), 'builder is LABELLED Plates');

  // the other half: the panel a tab opens says the same crossed word in its h2
  const panel = (id) => {
    const m = html.match(new RegExp(`<div id="tab-${id}"[\\s\\S]*?<h2>([^<]*)</h2>`));
    assert.ok(m, `#tab-${id} exists with a leading h2`);
    return m[1];
  };
  assert.equal(panel('pantry'), 'Ingredients', 'the pantry PANEL is headed Ingredients');
  assert.equal(panel('ingredients'), 'Products', 'the ingredients PANEL is headed Products');
});

/* ---------------------------------------------------------------------------------------------
 * 268 (queue item 58): THE `.scr-sub` SLOT MEANS ONE THING.
 *
 * It meant four. Plates and Products carried counts, Menu a name, Invoices a promise that
 * CONTRADICTED its own dropzone six lines below, Settings a save rule, Account a roadmap note, and
 * the Dashboard nothing — so the eye learns to read the slot one way and is wrong on the next
 * screen. The rule item 58 settles: **a subtitle is scope or a count, never a sentence.** Sentences
 * move into the body, which is where a reader looks for them anyway.
 *
 * ⚠️ WHY THIS IS ASSERTED AS A SHAPE AND NOT AS A LIST OF THE SEVEN STRINGS. A list would go red
 * on any edit and green on a wrong one — it pins the copy, which is Max's, rather than the rule,
 * which is the thing 58 decided. The shape test fails the day somebody writes a sentence into the
 * slot, and that is the only failure worth having. This is the roster's "pin the condition, not the
 * structure" applied to copy.
 *
 * The two tells of a sentence, both measured against the seven literals as they shipped: a
 * TERMINAL FULL STOP, and a FINITE VERB. The verb list is the closed set that actually occurred
 * here plus the obvious neighbours — it is not a grammar, and it does not need to be: a subtitle
 * that is scope or a count has no verb at all, so any hit is a finding worth looking at by hand.
 * -------------------------------------------------------------------------------------------- */
test('268: every .scr-sub literal is scope or a count, never a sentence', () => {
  // comments are stripped FIRST — roster 183(a): a grep searches prose as well as code, and the
  // comments 268 left at three of these slots quote the sentences it removed, word for word.
  const htmlCode = html.replace(/<!--[\s\S]*?-->/g, '');
  const subs = [...htmlCode.matchAll(/<span class="scr-sub"[^>]*>([\s\S]*?)<\/span>/g)].map(m => m[1].trim());

  assert.ok(subs.length >= 7, `every converted screen's subtitle is scanned (found ${subs.length})`);

  /* The empty ones are the JS-filled slots (#plateHeadSub, #menuHeadSub, #kingHeadSub, #ingHeadSub,
     and #lastImport3 since 268) plus any screen that deliberately has none, as the Dashboard does.
     They are not exempt from the rule — they are the rule's best case, and what fills them is
     asserted at its own site (kingHeadSummary, plateHeadSummary, updateLastImport). */
  const literals = subs.filter(s => s.length > 0 && s !== '&mdash;');

  assert.ok(literals.length > 0, 'at least one hard-coded subtitle exists, or this test is vacuous');

  const VERBS = /\b(is|are|was|were|does|do|has|have|follows?|updates?|works?|save[sd]?|keeps?|changes?|comes?|stays?|sends?|means?|will|can|should)\b/i;
  literals.forEach((s) => {
    assert.ok(!/[.!?]$/.test(s),
      `.scr-sub "${s}" ends in a full stop — that is a sentence, and a sentence belongs in the body (item 58)`);
    assert.ok(!VERBS.test(s),
      `.scr-sub "${s}" carries a finite verb, so it is making a statement rather than naming scope or a count (item 58)`);
    assert.ok(!/;/.test(s),
      `.scr-sub "${s}" joins two clauses — the slot holds one thing`);
  });

  /* THE INVOICES CONTRADICTION, pinned by name because it is the one that shipped a FALSE statement
     rather than a stylistic one: the subtitle said imports update prices "automatically" while the
     dropzone under it said "Nothing changes without your review". Both were true of different
     things and a user reading top to bottom got the wrong one first. */
  const invPane = htmlCode.slice(htmlCode.indexOf('id="tab-invoices"'), htmlCode.indexOf('/tab-invoices'));
  assert.ok(!/automatically/.test(invPane),
    'the Invoices screen never says an import happens automatically — every row is reviewed (item 58)');
  assert.ok(/Nothing changes without your review/.test(invPane),
    'and it still says so where the user is about to drop a file');
});

/* 268: the About line read "Version v216" — the markup says "Version" and APP_VERSION carries its
   own `v`. The constant must keep it (six cache spots mirror it verbatim), so the fix is at the
   concatenation. This asserts BOTH halves, because fixing either one alone is a silent regression
   in the other direction: strip the constant and the cache bump breaks; drop the word and the About
   card reads "v216" with no label. */
test('268: the About version prints its number once, and APP_VERSION keeps its v', () => {
  const htmlCode = html.replace(/<!--[\s\S]*?-->/g, '');
  assert.match(htmlCode, /Version <span id="setVersion">/,
    'the markup supplies the WORD, so the constant must not supply a second one');
  assert.match(app, /var APP_VERSION='v\d+'/,
    "APP_VERSION keeps its `v` — tests/cache-version.test.js pins the same spelling in six places");
  assert.match(appCode, /setVersion'\);\s*if\(v\)\s*v\.textContent=APP_VERSION\.replace\(\/\^v\/,\s*''\)/,
    'and the render strips it, so the line reads "Version 216" rather than "Version v216"');
});
