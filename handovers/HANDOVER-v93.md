# HANDOVER v93 — Family-coverage suite for the insight engine, + near-miss names the plates

**Completed:** 28 Jul 2026 · branch `test/insight-family-coverage`, **stacked on
`fix/insight-value-ranking` (v92), which is stacked on `fix/insight-families` (v91)**. Merge order:
**v91 → v92 → v93.** Brief: in-chat, 28 Jul.
Baseline v92, 447 node green. Ended **485 node green** (+38), jsdom smoke green, `node -c` clean,
**26 Playwright green**, six spots → **v93**. No migration.

---

## ⭐ THE DELIVERABLE: which families fail their own trigger fixture

**None. All nine families fire correctly on data built to trigger them, with correct numbers.**

That is a real result, not a shrug — but it is only worth anything because the suite is demonstrably
able to fail. See §3, where I deliberately broke the builder five times to prove it.

Two tests went red on the first run. **Neither was an engine fault**, and the distinction is the
whole point of the brief, so here is exactly what each was:

| first-run failure | verdict |
|---|---|
| `F1 costbase` — expected 2.3 pts, got 2.2 | **Fixture, not engine.** The family fired and attributed correctly; only the last decimal differed. My fixture produced exactly 2.25 pts, and `0.0115 - 0.01` is `0.00149999…` in binary floating point, so `pts1` rounds down. A fixture parked on a rounding boundary tests the float representation. Melt went 200g → 300g, giving a clean 3.0. |
| `SCOPE category at MENU_ORIGINAL` — nothing fired | **Fixture, not engine.** At that scope Lunch had exactly one plate, and the family's documented gate is ≥2 sections of ≥2 plates. It was obeying its contract. The fixture now puts two Lunch plates on Original and a third on Winter — which also made the test *better*, because the two scopes now report genuinely different numbers. |

**What this does NOT tell you.** Every family works when handed data that satisfies it. On your real
menu, four of them (cost-base, drift, volatility, long-standing) are still quiet for the reason
diagnosed in v92: `ingPriceLog` has no depth yet. The suite now lets you tell those two situations
apart — which is the thing you couldn't do before.

---

## 1 — What was actually missing

`insights.test.js` tests each family as a pure function with its primitives **handed to it
ready-made** — `insCostBase(MV)` where `MV` is already `{pts, name, ingPct, plates, sinceLabel}`.
That proves formatting and gating. It proves nothing about **`computeInsights`**, the impure builder
that turns MENU / savedPlates / PRODUCTS / ingPriceLog / menuPriceLog into those primitives.

So the entire builder — every window loop, every reconstruction, every supplier tally — was
**untested**, and a broken builder is indistinguishable from a quiet family on real data. Both look
like "nothing to say". That is the root problem, and it is now closed.

`tests/insight-coverage.test.js` seeds app state and calls `computeInsights(scope, 0)` **exactly as
the Dashboard does** — same code, same order, no stubs in the path under test.

## 2 — The suite

36 tests. Per family: one **TRIGGER** fixture (assert it fires *and* its numbers are right) and at
least one **SILENCE** fixture (assert it doesn't). Every fixture's arithmetic is worked out in a
comment above it, so a failure tells you which number moved rather than that a string changed.

Fixtures are deliberately **isolating**: the category fixture uses misc-cost lines only, so no price
history exists and no movement family can interfere; the volatility fixture logs both price points
inside 30 days so no window can reconstruct. Each one tests one thing.

Plus: the ranking test (§3 of the brief), four scope tests (§4), and three pipeline tests that would
catch a broken builder while every family stayed correct — a dangling `plateId`, an unpriced dish,
and malformed state.

**Extraction.** `tests/_extract.js` gained `computeInsights` and its full dependency closure (22
functions) plus a `setAppState()` helper that assigns the app globals. This runs in `npm test` — no
jsdom, no browser — which matters because a diagnostic suite you have to remember to run separately
is one you won't run.

## 3 — Proving the suite can fail (mutation testing)

A green coverage suite is worthless if it would stay green against a broken builder. So I broke it,
five ways, and checked:

| deliberate break | caught? |
|---|---|
| culprit attribution removed (`movementCulprit` → null) | ✅ 2 tests |
| dish `section` dropped in the builder | ✅ 3 tests |
| volatility band never computed | ✅ 1 test |
| concentration price lookup broken | ✅ 2 tests |
| supplier coverage forced to 100% | ❌ **survived** |

**The survivor is the most useful thing in this batch.** My F7 coverage-silence test emptied a
supplier field to push coverage down — but doing so also left only *one* distinct supplier, so the
family was silenced by the "trivially all of them" gate and the coverage gate was never exercised at
all. The test passed for the wrong reason.

Rebuilt so that only the coverage gate *can* silence it: two distinct suppliers, 75% reach, a 3.0-pt
consequence — all passing — with just 2 of 5 used products carrying a supplier. The mutation is now
caught. The fixture carries a comment explaining why it is shaped that way, so nobody simplifies it
back.

## 4 — Near-miss now names the plates

`"2 plates are sitting within half a point of your 30% target — the closest on your menu."`
→ `"Barra & Chips and Cheeseburger sit within half a point of your 30% target."`

The trailing clause is gone — it restated the first half in more words. Beyond two names the rest
become a counted remainder (`"Barra & Chips, Cheeseburger and 2 others sit within…"`), and `others`
is in `facts` because it is a figure and the money law applies to every figure.

**On your real data** it now reads: *"Bacon & Egg Roll and Bacon & Egg Muffin sit within half a
point of your 30% target."*

## 5 — CodeRabbit

Two rounds, two findings, both on the new copy:

1. **Real bug, fixed.** I computed the remainder from `named.length` instead of `n`. A qualifying
   plate with a blank name would be silently dropped from the sentence while still counted in
   `facts.count` — "A and B" printed over a count of 4. Now counted off the cluster. Regression test
   added with two nameless plates.
2. **Partially accepted.** It wanted the deficit-language guard widened to include "below" and
   "under". I took `shortfall`, `deficit`, `short of`, `less than your`, and tightened `just`, but
   deliberately **not** "under"/"below": in this app sitting *under* the food-cost target is the good
   outcome, so banning those words would forbid correct copy rather than wrong framing. Noted at the
   assertion.

## 6 — Judgement calls

- **Node extraction rather than jsdom or Playwright.** Both were viable and both are more faithful.
  But jsdom is `--no-save` here by deliberate choice (`npm test` must not need it) and Playwright
  runs separately. A suite whose whole purpose is "tell me if a family is broken" has to run on every
  `npm test`, so the closure extraction was worth the extra work.
- **`extractVar` now also pulls `DASH_ALL`, `INSIGHT_WINDOWS`, `INSIGHT_PERIOD_MS`** — same
  no-second-copy rule as v92's `INSIGHT_VALUE`.
- **The suite asserts facts, not sentences,** wherever a sentence would be brittle. `monthLabel`
  output depends on the run date, so no test asserts a month name.

## 7 — Needs your phone

- The near-miss line with your real plate names — it is the one copy change that ships here.
- Long plate names could make it wrap; two names plus "and N others" is the worst case.
