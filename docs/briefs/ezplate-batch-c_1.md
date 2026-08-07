# Brief — batch C: the dashboard the app has been building toward

**Model: Fable** for the visual work; the `logHistory` strand is code and may
want Opus. **Propose the split before building** if running it as one model is
wrong.

Standing working method applies. Nothing here is beyond correction — if the code
contradicts this brief, the code wins.

---

## Why one batch

Four strands, one set of surfaces. The chart, the loading states, the insight
flash and the cosmetic sweep all land on the same CSS and the same dashboard
markup; splitting them means three passes over the same files and three reviews
of overlapping diffs.

Strand 1 is folded in because the chart cannot be built honestly without it.

**If the plan finds this genuinely too large, say so and propose the split.**
The batch-splitting habit in this project was protecting against mis-specified
briefs, not execution capacity — but that judgement is yours to make with the
code in front of you.

---

## Strand 1 — `logHistory` coverage (prerequisite for strand 2)

v114 found that `logHistory` fires on paths 1, 6, 7, 8, 9 and the invoice, and
**not** on 2, 3, 5, 10, 11 or 12. So an ingredient repoint — the cheapest real
intervention in the app — writes a change-log entry but puts no point on the
food-cost trend.

Strand 2 draws markers from the change log onto that line. Without this fix, a
marker announcing a drop sits on a flat section, because the line never recorded
one. The design premise is that the drops are Max's work made visible; a marker
with no movement under it inverts that.

**Outcome:** every path that changes the average food cost writes a history
point, so the line moves when an intervention moves it.

This is v109's shape again — a log with gaps in its writers — and the standing
rule applies: any "notice X changed" feature must confirm every path that changes
X writes the log it reads. **Enumerate first and report.** v114's own enumeration
came back with two paths the brief didn't know about, in both directions.

Consider whether the fix belongs at a choke point rather than at six call sites,
as v109 moved `logIngPrice` inside `setProduct` — but v114 explicitly found that
`logHistory` is **not** the funnel it appears to be, so verify rather than assume
the same shape works.

**No backfill.** The gap is historical and reconstructing it would invent
evidence in the series the chart draws from.

---

## Strand 2 — the food cost trend, reframed

**Mockup: `ezplate-dash-cogs-reframe.html`** — the brief author's sketch, not a
specification. See "what binds" below before treating any of it as settled.

### The problem

The chart is permanently red and always will be. Ingredient prices drift up
continuously; the number only falls when Max intervenes. Colouring by direction
therefore tells him he is failing during the ordinary operation of a café, which
is both demoralising and uninformative.

### What binds, and what doesn't

**Four requirements bind:**

1. Green must be **achievable** during ordinary trading, and must mean the same
   thing it means on Menu Analysis — at or under target, with overpriced not
   punished. Colouring by direction fails this.
2. Max's interventions must be **visible as his own work** on the line.
3. Whatever labels the interventions must survive **several markers at 380px**
   without collision.
4. **Nothing may prescribe a fix.** Chefs adjust portions, swap products, change
   supplier, drop an item or add one far more often than they reprice, because
   reprints cost money. Naming any of those is prescribing, which this app has
   already decided not to do. The rest of the dashboard points at *where*; this
   card only says the drift is real and how big.

**Everything below is the brief author's first attempt at satisfying those, and
does not bind.** The mockup is one answer, not the answer — it reads as a spec
and should not. Taste is the deliverable here and that is why this strand is
Fable's; if you see a better way to meet the four requirements, **build that
instead and say what you changed and why.**

### The author's attempt

**Colour anchored to target, not direction**, with a shaded band above the target
line so the red has somewhere to live and the line itself stops carrying the
judgement.

**Markers on interventions**, drawn from `menu_change_log`, so the sawtooth stops
being a mystery and becomes a record of what Max did about it.

**Only interventions that reduced cost get a marker.** A supplier price rise is
the thing being measured, not an intervention — and the change log excludes those
anyway, since `setProduct` is the drift condition. But the log does record
interventions that *raised* cost; filtering those is a **display** decision made
here, and the underlying data stays complete.

**The summary line leads with the achievement, then the gap** — the size of the
last intervention, then how far it has moved since.

**A bare dot plus a magnitude at each marker**, with the caption carrying the
sentence once, below the chart.

### Questions the data raises — answer before drawing

- **`detail` must be read, not `kind` alone** — v114 is explicit that a combined
  price-and-menu edit is one entry, and `kind` alone misreports it.
- **The log stores `avg_before`/`avg_after` as primitives, not percentages**, so
  a stored food-cost % cannot be assumed. Derive what the chart needs from the
  primitives and the current target.
- **An entry can name a plate that no longer exists** — no FKs, deliberately,
  because an entry naming a deleted plate is the most interesting kind. How a
  marker draws for one is this batch's call. Recommend something.
- **Restore is additive**, so the log can hold entries describing a state a
  restore has rolled back. Decide what the chart does with those and say why.
- **`menu_change_log` currently holds 0 rows.** Nothing has rendered it yet, so a
  wrong `kind` or figure has been invisible since it shipped. **This batch is the
  first time that data is looked at** — treat the first render as a verification
  step, not a formality.

---

## Strand 3 — loading and motion

**Two loading animations exist since v108** — one for pull-to-refresh, one for
the Supabase boot fetch. They are the same idea in two visual languages. Unify
them.

**The Gemini insight flash.** Local insights render, then swap to AI-assisted a
moment later, and the change is visible enough to read as a glitch. Decide
whether the local pass renders at all, or renders in a state that makes the
subsequent arrival read as completion rather than replacement.

**Refresh and tab-tap scroll-to-top** are both reported as unsmooth.

**Related, in scope if it fits:** the ~1,138 ms cold start after idle, measured
against 79–152 ms warm. With week-long gaps between sessions, cold *is* the
normal path — the 181–333 ms boot figure was taken warm and does not describe the
real experience. If a fix is out of proportion here, report the numbers and
leave it.

---

## Strand 4 — visual cleanup

- **Remove the light dots/pips** from menu item cards — the card itself changes
  colour, so they restate what the surface already says.
- **Remove the suggested-prices line** from the Menu section.
- **Remove "cheaper like for like"** — it needs a vector DB and semantics that do
  not exist, and shipping it without them produces bad suggestions.
- **Button and card colour and highlight inconsistencies**, including the pips on
  category chips.
- **Lines escaping their margins in the builder** — see Max's screenshot; the
  ingredient row's price chip and cost overflow the card at 380px.
- **`.btn.ghost` has a transparent border**, found in v113 when the Link button
  rendered as centred text rather than a control. Fix it as a system change, not
  at that one site.

---

## Design system — established, do not re-derive

v94–v99 settled these on the dashboard and propagated them app-wide. Carry them;
do not invent a second vocabulary beside them.

One card tone on one page tone in both modes, no card-in-card. The two-mode
`--elev` token — `--shadow` in light, `none` in dark. One 8px seam on both axes,
16px card-to-page edge on mobile and the dashboard only. Fixed-width
right-aligned figure columns. Muted small-caps eyebrows reserved for true section
boundaries. Scope stated once, in the card heading.

**Check light and dark at every step.** The card-in-card bug only showed in
light, so a dark-only review passed it for weeks.

---

## Out of scope

Floating layers and the mobile dropdown bugs — their own batch, and they are the
queued floating-layer consolidation. Builder-as-modal — a real UX change needing
its own decision. Multi-tenant, auth, pdf.js, ID generation. `kitchen_items` (a
tenth table nobody reads — dropping it needs Max's yes).

No DB migration expected. If one appears, **stop and hand it to Max.**

---

## Tests

Pin conditions, not structure.

- Strand 1: each enumerated path writes a history point; assert the point that
  lands, not that a function was called.
- The chart colours by target: a rising line under target stays green; a falling
  line over target stays red. **This is the test that catches the old
  condition** — a direction-coloured chart passes any test that only checks "over
  target is red".
- A marker draws for a cost-reducing entry and not for a cost-raising one.
- A combined price-and-menu entry is read from `detail`, not `kind`.
- An entry naming a missing plate renders whatever was decided, without throwing.
- Both themes, 380px and desktop, on every visual change.

**Open it in a browser.** v113 shipped two real defects that 680 passing tests
could not see — a duplicated computation ten lines from the function introduced
to prevent it, and a control that rendered as plain text. Both surfaced only by
driving the real UI.

---

## Rules

- Six version spots.
- Pre-push `code-review` agent first — on v114 it found four real defects
  including one that would have broken every restore, while the PR workflow found
  none. Fixes from it land in the same branch and cost nothing.
- **Do not merge before the PR review is readable.** v114 cost six extra PRs and
  ~$20 because a finding on `main` cannot be fixed in the PR that carried it.
- Run the Playwright suite alone; check the machine before diagnosing the code.
- `CLAUDE.md` "State as of" is a snapshot to overwrite.

## After the pass

`flow-tester`, then Max's phone: the chart in both themes at 380px, whether the
markers read as his own work, whether the unified loading state reads as one
thing, and the builder rows no longer overflowing.

This is the first batch in a long run that Max will actually *see*. The
verification is whether it feels like the app got better.
