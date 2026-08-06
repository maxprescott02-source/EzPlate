# HANDOVER v91 — Insight engine: every family runs on every render

**Completed:** 28 Jul 2026 · branch `fix/insight-families` (off `main` at v90, `d12d77f`, PR #29 merged) ·
brief `~/Downloads/ezplate-opus-insight-families.md`.
Baseline v90, **432 node green**, jsdom smoke green, `node -c` clean. Ended **436 node green**, jsdom smoke
green (new section [24]), `node -c` clean (`js/app.js`, `sw.js`, the four `api/*.js`), **26 Playwright green**,
six spots → **v91**.

No migration. Zero contact with the protected parser region, the naming inversion, the menu data model,
`api/*.js`, or the chart. The money law is unchanged — no family gained a number, and the new copy adds only
words.

---

## The bug, as reported

The panel said *"All 4 costed plates currently sit at or under your 30% target, so nothing needs attention
right now"* while the comparison bar directly underneath read **↑ 0.2 pts vs last week · ↑ 1.2 pts vs this
year — costs creeping up**.

## Confirmed root cause — and the brief's hypothesis was close but not right

The brief guessed the engine *"short-circuits to the all-healthy line, never evaluating the remaining
families."* That is not what the code did, and the difference matters, because it means **two separate
faults** were producing one symptom.

### Fault 1 — the over-target count was a GATE on the orchestrator (`deriveInsights`)

v90 split the families into two lists and picked one by `over`:

- `!over` → build the **neutral** list only, prepend the all-healthy line unconditionally, and fill the
  remaining `max - 1` slots.
- `over` → build the full list.

So the neutral families (including family 1, cost-base movement) *were* evaluated when nothing was over
target. What actually went wrong:

1. **Drift was dropped entirely.** It sat in the `over`-only list as a "concern type". But being under target
   is not the same as not having moved — a plate that went 20% → 27% under a 30% target has drifted, is worth
   knowing, and was unreportable.
2. **The all-healthy line took a slot it hadn't earned.** With 4 costed plates the cap is 2, so `max - 1`
   left exactly **one** slot for everything the engine could actually observe.
3. **Its trigger was target compliance, not silence.** It fired on `over === 0` and was *prepended*, so any
   insight that did fire printed underneath a line asserting nothing needed attention. The screenshot is that
   contradiction with the second slot empty.

**Fixed:** one candidate list, every family, every render. `over` is now used for exactly one thing — whether
the all-healthy line may fire once the engine has come back empty. Written up as **Rule D** in the engine's
header comment, alongside Rules A–C.

### Fault 2 — the real reason family 1 was silent is a DATA bug, not control flow

Fixing fault 1 alone would **not** have produced a movement insight on that screen. Family 1 reconstructs
past plate costs from `ingPriceLog`, and `logIngPrice` was called from exactly **one** place in the whole
app: the invoice-confirm path (`applyInvoice`).

`commitPrice` — the builder's tap-the-price-chip edit, the main way a price gets changed by hand — called
`setOverride` and `logHistory`, and never logged a per-product point. So:

- `priceHistory` (the all-menus average, which feeds the comparison bar) moved on every edit;
- `ingPriceLog` (per product, which feeds family 1 *and* the movers card) recorded nothing.

The two logs disagreed about whether a price had changed at all. **That is also the answer to the "Also
check" item** — see below. `commitPrice` now logs and saves the point.

Two smaller things found in the same path and fixed:

- `applyInvoice` gated `saveIngLog()` on `priceChanges.length`, which is only populated when there *was* an
  old price. A product's **first** logged price stayed in memory until something else happened to save the
  log. `logIngPrice` now returns whether it pushed, and the save is gated on that.
- `logIngPrice`'s no-op-repeat guard is a *relative* tolerance (`< |v| * 1e-6`), which collapses to `0 < 0`
  at zero — so a repeated $0.00 logged a fresh point every time. Newly reachable now that hand edits feed
  this log (`commitPrice` accepts `v >= 0`). Exact-equality arm added. (CodeRabbit.)

---

## "Biggest movers shows Nothing yet while the compares block reports movement"

**Confirmed, and it is the same bug — but not for the reason the brief proposed.** It is not a window
mismatch. The two cards read **two different logs**, fed by different events:

| | source | written by |
|---|---|---|
| Compares block | `priceHistory` — all-menus **average food cost** | `logHistory()`, on *every* data-changing event |
| Biggest movers | `ingPriceLog` — **per-product price** steps | `logIngPrice()`, **invoice import only** (until now) |

`digData('movers')` needs `a.length >= 2` for some product. With hand-edited prices never logged, that is
never true for a café that has not imported the same supplier's invoice twice — so the card reads "Nothing
yet" while the bar reports real movement. Same class as fault 2, same one-line cause, fixed by the same
change. The card will populate from the next hand-edited price onward.

Worth being explicit about what this does **not** do: `priceHistory` also moves when a plate is added,
edited, or repriced — no ingredient price need change at all. So the bar and the movers card answer
genuinely different questions and can legitimately differ. They just should not differ *because one of them
was never being written*.

---

## ⚠️ What this does NOT fix, and you should expect

**The dashboard will probably still show the all-healthy line today.** Family 1 needs a reference moment
**at least 30 days back** with ≥2 plates whose every priced line has a logged price reaching that far
(`INSIGHT_WINDOWS` = 30/60/90/180 days; `costAtLines(...).complete`). Since hand-edited prices were never
logged, that history does not exist yet — and it **cannot be backfilled honestly**. The app would have to
invent when each price changed.

This is the same shape as v90's sell-price log: **the fix starts the clock.** The structural fault is gone
and family 1 will fire the moment it has something real to reconstruct — roughly a month of ordinary use
away, sooner if you import invoices.

I deliberately did **not** build a `priceHistory`-based variant of family 1 to fill the gap. It would be a
single time × aggregation restatement of the number already printed in the comparison bar on the same
screen — exactly the status roll-up the v90 REMOVED list killed for failing the "so what" bar.

---

## Judgement calls

- **A pinned v90 contract was deliberately reversed.** `tests/insights.test.js` pinned *"a healthy menu never
  emits a CONCERN family, however much history exists"* — written to stop the panel manufacturing worry, but
  it is the exact gate that caused this bug. Replaced in the same commit with six Rule D tests (four of which
  fail against v90's `app.js` — verified by running the new tests against the old file).
- **`insBest` is in the pool but does not count as "something to say".** It is the counterpart of the
  all-healthy line, not an observation that something moved; otherwise any menu with one standout plate
  would lose its warm line to a compliment. It *is* now available on healthy menus, where v90 gated it to
  over-target scopes only.
- **Over target with no family able to speak still returns nothing** (panel absent), rather than the warm
  line. Reassuring on the basis of "we couldn't compute anything" would be worse than silence.
- **`insLongStanding` is not gated.** It requires the caller to have established a run, and `computeInsights`
  only builds one for a plate over target *now*, so it self-suppresses. Adding a gate would reintroduce the
  fault in miniature.
- **The all-healthy copy changed.** It now states both halves ("…at or under your 30% target, **and nothing
  else stands out**"), because under Rule D that is what it means. All four pool variants stay under the
  24-word scannability cap that `gemPhrasingOk` and `_insight.js` enforce.
- **Fault 2 was arguably outside the brief** (it says *report* the movers finding). I fixed it because the
  brief's own required outcome — "must produce a cost-base-movement insight" — is unreachable without it,
  and it is one line at the exact fix site. Flagging it rather than burying it.

## CodeRabbit

Three minor findings, all accepted and fixed:

1. `logIngPrice` zero-price dedup — real, fixed (above).
2. Smoke [24] accepted either unit conversion for the logged value — tightened to derive the expected value
   from the rendered price chip. (`byId` is a top-level `let`, a global *lexical* binding that jsdom's
   per-call `eval` cannot reach, so the DOM is the available source — and it is what the user is looking at.)
3. A Rule D test asserted only the absence of `allgood` — tightened to assert the result is empty. Also
   dropped a genuinely vacuous `priceHistory.length >= before` assertion it flagged nearby: the edited line
   is on an unsaved builder plate, so the average legitimately does not move, and the check could never fail.

**Second round** (the first `--base main` re-review timed out server-side twice — review IDs `07770933`
and `78d34355`; a third run scoped `-t uncommitted` completed and also picked up `CLAUDE.md`, which the
first round predated). Three findings:

1. *Strengthen smoke [24]: snapshot both stores before the repeat commit, and assert the average history
   too.* **Half accepted.** The duplicate-**persistence** check is real and is now in — a guard that skips
   the push but still writes would leave the array right and the write budget wrong, and only the stored
   copy shows that. The `priceHistory` half is the vacuous assertion already dropped above; re-adding it
   would re-add a check that cannot fail, because the edited line is on an unsaved builder plate.
2. *"State as of 28 Jul 2026" is a future date.* **False positive** — that is the date of this batch.
3. *Rule D and the three-logs rule are in CLAUDE.md's durable section without Max's approval.* **False
   positive on placement, right on the principle.** Both sit at lines 390–406, inside `## State as of`
   (line 342) and above `**Outstanding**` (line 410) — i.e. in the snapshot that is overwritten every
   batch, not above the line. The underlying point is exactly what Outstanding item 8 already records:
   they probably *should* be durable rules, and moving them needs Max's yes.

## Files touched

- `js/app.js` — `deriveInsights` rewritten; `healthyLine` copy; Rule D added to the engine header;
  `logIngPrice` returns a boolean + zero-dedup; `commitPrice` logs a price point; `applyInvoice` save gate.
- `tests/insights.test.js` — v90's healthy-menu contract replaced by six Rule D tests (+4 net).
- `tests/smoke.js` — new section [24], the wiring lock the pure engine cannot see.
- `sw.js`, `index.html` — version spots.

## Needs your phone

- **The main one:** does the panel still read sensibly now the warm line is exclusive? On a healthy menu with
  one neutral fact you now get the fact alone under the heading "What needs attention", where v90 gave you
  the warm line *plus* the fact. I think that is right — the heading is about attention and the warm line was
  making a claim it hadn't checked — but it is a tone call and it is yours.
- The all-healthy copy is longer by ~4 words. Check it doesn't wrap badly on the phone.
- Whether "Biggest movers" starts populating after you next edit a price by hand.
