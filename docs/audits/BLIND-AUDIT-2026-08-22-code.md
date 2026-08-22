# EzPlate — independent code audit (Findings 1)

Scope: `js/app.js` (11,392 lines), `index.html`, `sw.js`, `api/`, `supabase/migrations/`,
`supabase/staging/`, `tests/`. Read as shipped, with no access to the project's rulebook,
backlog or history.

Method note: where I could run the shipped code I did, rather than reasoning about it. Six of
the findings below were reproduced by extracting the real functions from `js/app.js` with the
project's own `tests/_extractfn.js` harness and executing them. Those are marked **reproduced**
and I have pasted the actual output. The rest are marked with an honest confidence.

Baseline: `npm test` → **1332 pass, 3 fail**. All three failures are artefacts of this audit
bundle (`.github/workflows/test.yml`, `fonts/`, `icons/` and `.vercelignore` are not in it), not
defects. `node tests/mutation/run.js` → **367 mutants, 362 killed, 5 with written allowances**,
green.

---

## Summary of what I found

Two findings put a **wrong price into the database** through a path the app tells the user it is
protecting them from, and both are invisible on screen. One puts a **wrong number in front of the
owner on the Dashboard** while the code that is supposed to prevent exactly that reports success.
The rest are smaller, and I have said where I am guessing.

The single structural observation underneath most of it: **this codebase is tested one pure
function at a time, and its defects are living in the seams between them.** The invoice pricing
chain is a good example — `derivePackPrice`, `resolveMatchedPrice`, `packPriceOf` and
`applySupplierMemory` each have careful tests and each is individually correct. The bug is in
`buildInvRows`, the twenty lines that call them in order, and no test calls that function.

| # | Finding | Cost | Confidence |
|---|---------|------|-----------|
| 1 | GST-inclusive invoices store every taught-pack and remembered line 10% too high | Every plate using that product is costed 10% high, permanently | **Reproduced** |
| 2 | The insight validator accepts numbers that have been re-unitised, re-associated or reversed | A wrong percentage on the Dashboard, in the app's own voice | **Reproduced** |
| 3 | A taught pack in the wrong unit rewrites the product's `base_unit` with the mismatch guard deliberately disabled | Plate lines mis-scaled by 1000× or by a plausible factor | **Reproduced** |
| 4 | `costFromLines` throws away its own "missing lines" count | A plate with a dead line reads as fully costed and healthily priced | High |
| 5 | A price point is logged and pushed even when the product write is rejected | `ing_price_history` permanently disagrees with the product | High |
| 6 | `saveCurrentPlate` clears the draft before the server confirms | The only copy of a failed edit is destroyed | High |
| 7 | `invite_pending()` is an unauthenticated cross-tenant existence oracle | Anyone can probe any address against every café | High |
| 8 | Both `api/` endpoints are unauthenticated and billed | Open Gemini spend on a public URL | High |
| 9 | Supplier memory's `pid` never crosses the row boundary | `syncMemoryToProduct` is a no-op in every session but the one that taught the pack | High |
| 10 | The catalogue CSV importer never asks about GST | Same 10% error, different door | Medium |
| 11 | Four comments that disagree with the code | — | High |
| 12 | Test-quality assessment | — | — |

---

## 1. A GST-inclusive invoice stores a 10% too-high price on every line that has a taught pack or a remembered pack — while the screen says it converted them

**The claim.** The `÷1.1` that converts a GST-inclusive invoice to ex-GST storage is applied at
exactly one place, to exactly one of the four values that can become a product's price. The other
three re-derive the price from the raw invoice text *after* that conversion, and overwrite it.

**Where.** `js/app.js:9189` is the only division:

```js
var up=(r.unitPrice==null?null:r.unitPrice);
if(up!=null && invGst.mode==='inc') up=up/1.1;                 // store ex-GST
```

Twelve lines later, in the same function, `resolveMatchedPrice(row, …)` (`js/app.js:9266`) can
replace `row.unitPrice` outright:

- branch 1 — `derivePackPrice(row.raw||row.name, …)` (`js/app.js:9256`) → `packPriceOf(raw)`
  (`js/app.js:9228`) → `moneyMatches(raw)`. Reads the price straight off the printed line. No `÷1.1`.
- branch 2 — supplier memory, same shape, same `packPriceOf(row.raw)`. No `÷1.1`.
- branch 3 — the parser's own value, which *has* been divided. Correct.

The AI second reader has the same hole twice: `js/app.js:10294` (rule 4 adopts Gemini's
`derivedUnitPrice` verbatim) and `js/app.js:10309` (rule 5 appends a Gemini-only line at
`gc.per`). Neither is GST-adjusted.

`applyInvoice` (`js/app.js:10387-10390`) then writes whatever `r.unitPrice` holds straight into
`cost_per_base_unit`.

**The failure scenario — reproduced.** Product "Chips Straight Cut", stored per gram, with a
taught pack of 10 kg. Invoice reads `Prices include GST` and carries the line
`CHIPS STRAIGHT CUT 10KG  55.00  55.00`. I ran the shipped `invGstDetect`, `pdfTextToRows` and
`buildInvRows`:

```
GST detect on "Prices include GST":
  { mode: 'inc',
    note: 'GST-inclusive prices detected — converted to ex-GST (÷1.10) for storage.' }

WITH taught pack (pack_qty 10 kg), GST=inc  ->  5.5   product-pack
WITHOUT taught pack,               GST=inc  ->  5     parser
```

Same invoice, same line, same product. The taught pack — the thing the app treats as the most
trustworthy signal it has — produces **$5.50/kg instead of $5.00/kg**, and the review screen
prints the note above it saying the conversion happened. Every plate using chips is then costed
10% high, every food-cost percentage on the Menu tab is 10% high for those dishes, and the
suggested sell price is 10% high. Nothing errors and nothing looks odd — $5.50/kg for chips is
entirely plausible.

The worst part of the shape is the direction of the incentive: the more the user teaches EzPlate
about their packs, the more of their catalogue moves onto the broken path. A café that has never
taught a pack is correct; a café that has done the work the app asks for is wrong.

**Confidence: certain.** Reproduced against the shipped code.

**Note on the fix, since one obvious version of it is wrong:** dividing inside `packPriceOf`
would also hit `applyInvoice`'s qty-derivation fallback (`js/app.js:10399`, `derived=pack/entered`),
where the entered price is *already* ex-GST — that would introduce a 1.1× error in the taught pack
size. The conversion belongs on the resolved `chosen.unitPrice` at the end of
`resolveMatchedPrice`, or on `row.unitPrice` after it returns, plus the two Gemini sites.

---

## 2. The insight validator lets the model change what a number means — it only checks that the digits appeared somewhere in the facts

**The claim.** `api/_insight.js` states a hard law — "any number in the model's text that isn't
one of the facts we handed it => the whole phrasing is rejected". It enforces exactly that
sentence and nothing more. A model output that keeps every digit but attaches it to a different
unit, a different noun, or the opposite direction passes validation and is printed on the
Dashboard as EzPlate's own statement.

**Where.** `api/_insight.js:40-58` (`validatePhrasing`). The check is set membership over
`/-?\d+(?:\.\d+)?/g`, with a ±0.005 tolerance. Nothing is checked about position, adjacency, unit
or sign of the surrounding words.

**The failure scenario — reproduced.** Facts `{pts: 18, plates: 5}`, i.e. the deterministic
template "Beef, up 18% across 5 plates, is most of it." I fed four candidate rephrasings to the
real `validatePhrasing`:

```
"Beef, up 18% across 5 plates, is most of it."  -> ACCEPTED   (correct)
"Beef, up $18 across 5 plates, is most of it."  -> ACCEPTED   (% became $)
"Beef, up 5% across 18 plates, is most of it."  -> ACCEPTED   (facts swapped)
"Beef is down 18% across 5 plates."             -> ACCEPTED   (direction reversed)
```

The endpoint runs at `temperature: 0.4` (`api/insight.js:59`), the toggle defaults ON
(`js/app.js:9041`), and the header of `api/insight.js` tells the reader this is safe: *"returns a
warmer phrasing of the SAME facts, with every number preserved (enforced by
`_insight.validateInsightResponse`)."* Number *preservation* is not what is enforced. A café owner
reading "Beef is down 18%" when beef is up 18% is exactly the plausible-wrong-figure outcome the
brief ranks worst, and it arrives with the app's authority behind it.

**Confidence: certain** that the validator accepts all three wrong sentences. **Medium** on how
often a model actually produces one — the prompt asks firmly for preservation. But the whole point
of the validator is to not depend on that.

**Smallest honest fix:** validate the *sequence* of numbers, not the set — the model must emit the
same numbers in the same order — and reject any candidate whose number-adjacent unit tokens
(`%`, `$`, `pts`) differ from the template's. That still permits rewording, which is all the
feature needs.

---

## 3. A pack taught in the wrong unit rewrites the product's `base_unit`, and the guard that would catch it is switched off for taught packs by design

**The claim.** `applyInvoice` writes the invoice row's unit category into the product's
`base_unit` unconditionally. `resolveMatchedPrice` deliberately exempts a taught pack from the
unit-mismatch guard. Together, a single mistake in the pack-teach control silently re-bases a
product and mis-scales every plate line that uses it.

**Where.**
- `js/app.js:9299-9303` — `var taught=(chosen.source==='product-pack'||chosen.source==='memory');`
  then `if(!taught && baseCat && …){ row.unitMismatch=true; row.needManual=true; }`. Comment:
  *"a pack the user taught is the truth"*.
- `js/app.js:10387-10390` — `setProduct(pid,{cost_per_base_unit:newC, base_unit:ub2.base_unit,
  cost_basis:ub2.cost_basis})`.
- `js/app.js:9872` — the pack-unit `<select>` offers `ea/kg/g/l/ml` with no relation to the
  product's stored `base_unit`.

**The failure scenario — reproduced.** "Flour Plain", stored per gram at $0.0065/g ($6.50/kg). On
one invoice the user reads "6 bags to a carton" and teaches the pack as **6 ea** instead of 10 kg.
The next invoice for that product:

```
row after resolve: { unitPrice: 10.833…, unit: 'ea', source: 'product-pack',
                     unitMismatch: false, needManual: false }
applyInvoice would write: { cost_per_base_unit: 10.833…, base_unit: 'ea', cost_basis: '$/unit' }
a 200g plate line then costs: $2166.67   (instead of $1.30)
```

`unitMismatch` is `false` and `needManual` is `false`, so the row is pre-ticked and applies with
no prompt.

At 1667× the error is loud rather than silent, and that is the least dangerous version. The
**quiet** version is the same defect between `ml` and `g`: teach a `kg` pack on a product stored
in `ml` and `base_unit` flips `ml → g`, `cost_basis` flips `$/ml → $/g`, and a plate line reading
`250` (which meant 250 mL) is now costed as 250 g at the new $/g. The magnitude stays plausible
and there is nothing on any screen to notice.

**Confidence: high** on the mechanism (reproduced). **Medium** on how often a real user picks the
wrong unit — but the control gives them no reason not to, and the guard that would catch it is
explicitly turned off on this path.

---

## 4. `costFromLines` counts the lines it could not cost, and then throws the count away

**The claim.** Every cost, percentage, verdict pill and dashboard average outside the plate
builder is computed by `costFromLines`, which returns only the partial sum. A plate with a line
that costs nothing is indistinguishable from a plate that is fully costed — it just reads cheaper,
and therefore healthier.

**Where.** `js/app.js:2851`:

```js
function costFromLines(lines){let c=0,miss=0;(lines||[]).forEach(l=>{ … if(!p){miss++;return;} … });return c;}
```

`miss` is incremented in two branches and never read. Callers: `avgFoodCostForScope`
(`js/app.js:3606`), `dishesOverTarget` (`js/app.js:3573`), `renderAnalysis` (`js/app.js:10611`),
`kpiStripHtml` (`js/app.js:6499`), `plateCostText` (`js/app.js:8227`), `computeInsights`
(`js/app.js:5952`). The builder does **not** use it — `updateTotals` (`js/app.js:1589-1597`)
counts missing lines itself and raises `#flag`. So the one screen that warns is the one screen you
have to already be on.

There is a second, quieter way in. `lineCost` is `js/app.js:1314`:

```js
function lineCost(p,qty){if(!p)return null;const c=cpbu(p);return c==null?null:qty*c;}
```

With `qty === null`, `null * c` is `0` in JavaScript, not `null`. So a line with no quantity is
not "missing" — it is a real line costing exactly nothing, and even the builder's flag stays down
(`lc == null` is false). `saveCurrentPlate` blocks `qty <= 0` on save (`js/app.js:2790-2796`), so
this only reaches plates saved before that rule or restored from a file.

**The failure scenario.** Restore a backup whose reference check reported a *soft* problem —
`backupRefCheck` (`js/app.js:7602-7613`) explicitly offers this and the confirm says *"Those will
cost nothing until you relink them"*. The plate now has one dead line. On the Menu tab, `aRow`
(`js/app.js:10545-10556`) prints the reduced cost, a suggested price computed from the reduced
cost, and a **green** verdict pill via `vbadge` — with nothing on the row indicating a line is
missing. The plate's contribution to `computeAvgFoodCost` is also understated, so the Dashboard
headline and the "plates over target" count are both optimistic.

The kitchen-word tab surfaces broken `kid` links (`kingHeadSummary`, `js/app.js:4172-4177`), but
only the `kid` arm — the comment at `js/app.js:4625-4631` says so explicitly, and a direct `pid`
line has no surface anywhere outside the builder. The `kpiStripHtml` comment
(`js/app.js:6497-6499`) asserts *"the broken-link states on the Ingredients tab are the surface
that owns that problem"*; for `pid` lines that surface does not exist.

`deleteIngredient`'s guard (`js/app.js:4078-4106`) correctly blocks deleting a referenced product
via both arms, so the delete route is closed. The restore route and the pre-v60-quantity route are
not.

**Confidence: high** that the number is silently understated; **medium** on how often a real
install reaches the state, since it needs a restore the user was warned about or an old plate.

---

## 5. A price point is written to `ing_price_history` even when the write that carries the price was rejected

**The claim.** `setProducts` fires the `ingredients` upsert and the `ing_price_history` insert
independently, and gates neither on the other. When the product write fails and the log write
succeeds, the server permanently holds a price observation for a price it never accepted.

**Where.** `js/app.js:1279-1299`:

```js
rebuild();
var write=dbPushIngredients(entries.map(function(e){ return e.id; }));   // promise, never awaited
priced.forEach(function(p){ … logIngPrice(p.id, p.now); });
saveIngLog();                                                            // separate insert, fires now
return write;
```

**The failure scenario.** Café phone, one bar of signal, invoice import. The `ingredients` upsert
times out; the `ing_price_history` insert (a smaller request, different moment) lands.
`pushWrite` toasts the product failure honestly, so the user knows *that* write failed. On the
next `bootstrapSync` the product's price is replaced from the server with the old value —
correct — but `ingPriceLog` is also replaced from the server (`js/app.js:1157-1161`) and now
contains a point for a price that was never stored.

Downstream, that phantom point is read by `ingPriceBand` (`js/app.js:3384`), which feeds the
builder's "recent range $x–$y" line (`js/app.js:1690`) and the Menu tab's cost band
(`costRangeCell`, `js/app.js:10527`); by `ingLastMovePct` (`js/app.js:3396`), which draws the
Ingredients-row drift chip; and by `ingPriceAt`/`costAtLines` (`js/app.js:5872`, `5885`), which is
what the Dashboard's "your average food cost is N pts higher than at June prices — Beef, up 18%
across 5 plates" sentence is built from. All of them then describe a price movement that did not
happen. This is the one class of failure the change-log design goes to great lengths to prevent
for *interventions* (`logChangeIfSaved`, `js/app.js:3497`) — the same discipline is not applied to
the price log.

**Confidence: high** on the mechanism; the code is unambiguous. **Medium** on frequency — it needs
one of two concurrent requests to fail.

---

## 6. A plate save clears the recovery draft before the server has answered

**The claim.** `clearPlateDraft()` runs synchronously on the same line as `dbPushPlate`, so the
draft — the only copy of the edit that survives a reload — is deleted whether or not the write
lands.

**Where.** `js/app.js:2811`:

```js
var _write=dbPushPlate(sp); clearPlateDraft(); updateEditTag(); toast(asNew?'Saved as a new plate':'Plate saved');
```

**The failure scenario.** The user re-portions four lines of a plate on a phone with no signal and
taps Save. `pushWrite` toasts *"Couldn't save plate — you're offline. It has NOT been saved."* —
honest, and the "Saved just now" badge correctly stays down (`js/app.js:2814-2818`). But
`localStorage.cafeDB_plateDraft` is already gone, and `savedPlates` holds the new lines only in
memory. The user backgrounds the app; iOS discards the tab; on reopen `bootstrapSync` replaces
`savedPlates` from the server and the edit is gone with no draft to resume. The toast is a week
old by then, and this app's stated user goes a week between uses.

The comment at `authSwitchUser` (`js/app.js:6781-6789`) argues at length that the draft is
*"unsaved authored work … destroying it is data loss, not tidying, and the app never does that
silently anywhere else."* This is the place it does.

The fix is one line: move `clearPlateDraft()` into the `_write.then` success arm that already
exists three lines below for `setBuilderSaved(true)`.

**Confidence: high.** The ordering is plain; I have not driven the browser case.

---

## 7. `invite_pending()` answers for every café on the platform, to anyone holding the publishable key

**The claim.** A `SECURITY DEFINER` function granted to `anon` reports whether a pending
invitation exists for an arbitrary email address, with no tenant predicate at all.

**Where.** `supabase/migrations/20260814_invitations.sql:419-434`:

```sql
create or replace function public.invite_pending(p_email text)
returns boolean language sql stable security definer set search_path = ''
as $fn$
  select exists (
    select 1 from public.business_invites i
     where i.email = lower(btrim(coalesce(p_email, '')))
       and i.accepted_at is null );
$fn$;
grant execute on function public.invite_pending(text) to anon, authenticated, service_role;
```

Compare `business_team()` fifty lines below it, which correctly carries
`where m.business_id = (select public.current_business_id())`.

**The failure scenario.** The publishable anon key ships in `index.html:47` and the deployment URL
is in the page's own `<link rel="canonical">` (`index.html:87`). A stranger posts
`{"p_email":"someone@somecafé.com"}` to `/rest/v1/rpc/invite_pending` and gets `true` or `false`.
That is a cross-tenant read: the row belongs to a business the caller is a member of nothing in,
and every RLS policy on `business_invites` (lines 349-387) is correctly scoped — this function
walks past all of them. It also enumerates: it is a free oracle for "does this address have a
pending invitation anywhere on the platform", and a `true` confirms both that the address exists
and that it has been invited somewhere.

I want to be fair about the size of this: it leaks a boolean, not data, and only for an address
you already know. But the brief asks whether one tenant can read another's rows, and this is the
one place I found where the answer is yes.

The function does not need a tenant scope to serve its caller — that caller is signed out by
construction — but it does not need to be global either. Scoping it to the invitation's own
business is impossible for an anon caller; the honest options are to rate-limit it, or to accept
the leak deliberately and write down why. Right now the migration's header argues for the function
existing and does not address the scope.

**Confidence: high.** The SQL is unambiguous. I could not execute it (no database in the bundle).

---

## 8. Both serverless endpoints are unauthenticated and cost money per call

**The claim.** `POST /api/parse-invoice` and `POST /api/insight` accept a request from anyone and
forward it to the Gemini API on the project's key. Neither checks a session, an origin, or a rate.

**Where.** `api/parse-invoice.js:103-132` and `api/insight.js:98-119`. The only method gate is
`req.method !== 'POST'`. `readBody` caps the invoice body at ~2 MB
(`api/parse-invoice.js:48`) — that is the size cap, not a call cap.

**The failure scenario.** The deployment URL is public (`index.html:87`,
`https://scoopyscosting.vercel.app/`) and the repository is public. A loop of 2 MB POSTs to
`/api/parse-invoice` bills the project's Gemini account per request, at whatever
`gemini-3.1-flash-lite` charges for ~500k tokens of input, until the quota runs out — at which
point the café's own invoice import returns `unavailable` and degrades to the deterministic
parser. So the direct effect is spend, and the indirect one is denial of the AI reader for the
actual user.

The v70 comment at `api/parse-invoice.js:110-112` states the principle exactly — *"a billed
no-auth endpoint has no place before EzPlate is multi-tenant"* — and then removes only the
diagnostic `?probe=1` route, leaving the billed POST handler it was reasoning about. EzPlate is
now multi-tenant and sign-in is mandatory (`20260814_mandatory_sign_in.sql`), so the condition the
comment set has been met and the endpoint has not moved.

The cheapest real gate: require the caller's Supabase JWT in an `Authorization` header and verify
it against `SUPA_URL/auth/v1/user` before calling Gemini. The client already holds one on every
path that reaches these endpoints.

**Confidence: high** on the exposure; I have not tested against the live deployment, and I would
not without asking.

---

## 9. `supplier_phrases.pid` exists only in memory, so `syncMemoryToProduct` cannot work after a reload

**The claim.** The supplier-memory model carries a `pid`, the table has no such column, and
neither mapper carries it. The one function that reads it therefore matches nothing in any session
after the one that wrote it.

**Where.**
- `supabase/staging/01-schema.sql:163-170` — `supplier_phrases (id, supplier, phrase_norm, qty, unit, updated_at)`. No `pid`.
- `js/app.js:415-416` — `rowToSupplierPhrase` does not read it; `supplierPhraseToRow` does not write it.
- `js/app.js:3730` — `rememberSupplierPhrase` sets it in memory.
- `js/app.js:3733-3737` — `syncMemoryToProduct`, whose comment reads *"ITEM 1: keep Remembered items in step with the product's taught pack"*, matches on `e.pid===pid`.

**The failure scenario.** Session A: an invoice teaches "Bidfood / bacon middle rashers = 6 ea".
The memory entry gets `pid: 'P0123'` in memory, and the row that reaches the server carries
everything except that. Session B (next week, after a reload): the user corrects the same
product's pack to 4 ea through a different invoice. `applyInvoice` calls
`syncMemoryToProduct('P0123', 4, 'ea')` (`js/app.js:10412`), which loops every memory entry and
finds none with a matching `pid`, because they all came back from the server with `pid` undefined.
The Bidfood memory entry keeps `6`, and the Remembered-items list in Settings displays `6` beside
a product whose real pack is `4`.

Whether that becomes a wrong *price* is narrow: `resolveMatchedPrice` prefers the product's own
pack over memory (`js/app.js:9267-9276`), so memory only prices a line when the product has no
pack at all. So I would rank the concrete cost as low. What makes it worth reporting at all is
that a guard is present, documented, and cannot fire — and nothing says so.

**Confidence: high.** The absence of the column and of both mapper halves is verifiable in the
bundle.

---

## 10. The catalogue CSV importer writes prices as ex-GST without ever asking

**The claim.** `catImportPlan` takes the mapped price column at face value and stores it in
`cost_per_base_unit` and `current_price_exgst`. There is no GST question, no detection, and no
note — while the invoice importer has all three for the same destination column.

**Where.** `js/app.js:2255` — `current_price_exgst:price` inside the patch; `js/app.js:2245`
`packToUnitCost(total, unit, price)`. The mapping UI (`js/app.js:2374-2378`) asks one question
about the price — pack or carton — and nothing about tax.

**The failure scenario.** A café's first hour with EzPlate. They export their purchase history
from the supplier portal; the export's "LAST PRICE PAID" column happens to be GST-inclusive (the
comment at `js/app.js:2069-2072` admits outright that the file *"was never downloaded"* and that
what that column is the price *of* is unmeasured — which is exactly why `priceCovers` is asked).
Four hundred products land 10% high in one action, the preview shows plausible per-kg figures, and
nothing on any subsequent screen ever revisits it.

Given that the invoice path treats "which GST basis is this?" as important enough to detect from
the text, fall back to a stored default, and print a note about, the bulk path writing the same
column with no question at all is an inconsistency worth closing — most cheaply as a third radio
beside the existing pack/carton pair.

**Confidence: medium.** The code is certain; whether a given supplier's export is GST-inclusive is
not something I can determine from the bundle.

---

## 11. Comments that disagree with the code

The brief asks for these as findings in their own right. Four, none dangerous on its own, all of
them the kind that sends the next reader the wrong way:

**a. `js/app.js:7454` vs `js/app.js:7463`.** `buildBackup`'s comment argues a decision by citing
*"the precedent below is `format:chg.length?3:2`"* — but the code four lines below it is a flat
`format:3`. The construct it names is in a **different function**, `backupToPayload`
(`js/app.js:7646`), which is the wire format rather than the file format. The two are deliberately
different and the reasoning at `js/app.js:7635-7644` explains why; the word "below" makes the
first comment read as though the file format were conditional, which it is not.

**b. `js/app.js:3201`.** *"Supabase points arrive as ISO strings; a string is never >= a number."*
Since the row boundary was introduced, `rowToPoint` (`js/app.js:424-433`) converts
`recorded_at` to epoch milliseconds, so server points arrive as **numbers** — it is the
locally-logged points (`logHistory`, `js/app.js:3671`; `logMenuPrice`, `js/app.js:3527`) that are
ISO strings. The code handles both and is correct; the comment has the two sources exactly
backwards, and anyone simplifying it on the comment's authority would delete the branch that is
actually load-bearing.

**c. `js/app.js:163`.** `_uidSeq = (_uidSeq + 1) % 1679616;  // 36^4, so it always fits four chars`.
`_uidSeq.toString(36)` is not zero-padded, so it emits one to four characters. The modulus does
bound it, and the `-` separators mean uniqueness is unaffected — but "always fits four chars" reads
as a fixed-width claim and it is not one.

**d. `setCogs` vs the boot read.** `setCogs` (`js/app.js:2608`) does
`pct=Math.max(1,Math.min(99, Math.round(pct)))` — integers only. `bootstrapSync`
(`js/app.js:1181`) accepts `parseFloat(cogsRow.value)` for anything in `[1,99]`, and
`fmtTargetPct` (`js/app.js:6252`) is written to render one decimal place
(`cogsPct%1?cogsPct.toFixed(1):…`). So a fractional target is loadable and renderable but not
settable, and the first time the owner touches the Settings field it silently rounds. Low cost;
worth deciding which of the three is right.

---

## 12. Test quality — would these tests fail if the behaviour they name were broken?

**The good news first, because it is real.** The extraction harness (`tests/_extractfn.js`) runs
the *shipped* functions rather than copies, and it is careful about it — the `async` preservation
fix, the brace-naive slice plus a `new Function` parse check, the "which occurrence" parameter.
The mutation gate is not decoration: I ran it, it is green at **362/367 killed with 5 written
allowances**, and it correctly refuses to inherit `NODE_TEST_CONTEXT` (the self-test that catches
a gate scoring 100% while checking nothing is a better idea than most projects have). The five
allowances I checked are genuinely equivalent mutants with arguments, not excuses. Several tests
do exactly what the brief asks — `tests/menu-margin.test.js` proves the preview and the Menu row
share `analyze()` by running both and comparing across seven cases, which is a real invariant, not
a restated implementation.

**Tests I can name that stay green against the defect they appear to exist to catch:**

**`tests/api-insight.test.js`** — header: *"the HARD LAW: the model may rephrase but may NEVER
produce a figure."* It has five assertions on `validatePhrasing`, and every one tests the same
half of the law: a number *not in the fact set* is rejected (`'…raising it 5 dollars…'`,
`'$22.00'`). Nothing tests that the numbers keep their **meaning**. I ran the three wrong
sentences from Finding 2 against it and all three are accepted. The test file's own summary
sentence is therefore false about what it checks, and the defect it names is live.

**No test exercises GST at all.** `grep -rn "invGstDetect\|buildInvRows" tests/` returns exactly
one hit, and it is a comment in `tests/inv-conf.test.js:41`. `invGstDetect` — the function that
decides whether a whole invoice is divided by 1.1 — has zero coverage. `buildInvRows`, which
contains the only `÷1.1` in the codebase, sits *inside* the parser block that
`tests/_extract.js:22` slices into the sandbox, so it is compiled on every test run and never
called. That is worse than an untested function: it is a function that looks covered.

The near-miss is instructive. `tests/product-pack.test.js` is a good file — it pins the eggs case,
the precedence order, and the unit-mismatch guard, all by running the real
`resolveMatchedPrice`. But it calls `resolveMatchedPrice` **directly**, never through
`buildInvRows`, so the GST division that `buildInvRows` applies and then discards is outside its
field of view by construction. Same for `tests/pack-survives.test.js` and
`tests/ingredient-unit.test.js`. Three files test the pieces; none tests the assembly.

**The mutation gate's aim, not its mechanism.** 48 targets against **620 top-level functions** in
`js/app.js`. That is a deliberate choice and `tests/mutation/targets.js` argues it well — a
repo-wide score is a number nobody acts on. But the list's own stated criterion is *"any function
whose correctness is load-bearing and whose test file you would be uneasy to see deleted"*, and
the entire invoice pricing chain fails to appear: `buildInvRows`, `resolveMatchedPrice`,
`derivePackPrice`, `packPriceOf`, `applySupplierMemory`, `invGstDetect`, `packWeight`,
`packCount`, `parsePdfLine`, `flagNeedsAttention`'s price-jump arm. `catImportPlan` and its five
helpers are targets — correctly, and the reasoning given for adding them ("fails by producing a
PLAUSIBLE WRONG NUMBER rather than by throwing") applies word for word to the invoice chain, which
is the *older* and more heavily-used of the two import paths. The file's own line — *"a function
that is not a target has never been asked the question"* — is the right diagnosis of Finding 1.

**One target is honest about being absent** and deserves credit: `gemApplyReadings` is in
`pending` with a measured **44 surviving mutants** against the one test file that names it. That
is the correct way to carry a debt. It is also a live gap: 44 survivors means the AI merge
orchestrator — which can adopt a price (rule 4) and append a whole new product line (rule 5) — is
pinned on exactly one property.

**Things the SQL tests cannot do, stated plainly.** `tests/roles.test.js`, `tests/invites.test.js`,
`tests/business-id.test.js` and `tests/semantic-keys.test.js` assert against the migration files
*as text*. That is the only option without a database, and the files are careful about it. But it
means none of them can catch Finding 7: `invite_pending` has a policy-shaped test that checks the
function is `security definer` and granted to `anon` — both of which are true and both of which
are the problem. A text test cannot ask "is this predicate scoped to a tenant"; only a rehearsal
against a second tenant can, and the migration headers show that rehearsal being run by hand for
`app_settings` and `supplier_phrases` and not for this function.

**The three failing tests are bundle artefacts**, not defects: `tests/ci-workflow.test.js` reads
`.github/workflows/test.yml`, the service-worker asset test resolves `fonts/` and `icons/`, and
`tests/staging-seeds.test.js` reads `.vercelignore`. None of the four paths is in the audit bundle.

---

## What I checked and found sound

A clean finding is information, so:

- **The row boundary.** I checked every `rowToX`/`xToRow` pair at `js/app.js:312-468` against the
  column lists in `supabase/staging/01-schema.sql:104-208`. The case-crossing table
  (`menu_items`) is correct in both directions, the three history logs genuinely share one point
  shape, the `Number()` coercions are harmless, and `rowToPoint`'s separate null check
  (`js/app.js:427-429`) is the right call — `Number(null)` being `0` really would have fabricated
  $0.00 observations. The one field that does not round-trip is `supplier_phrases.pid`
  (Finding 9), and it does not round-trip because the column does not exist.

- **Multi-tenancy through PostgREST.** I went looking for a way for one café to read or write
  another's rows and did not find one. `current_business_id()` after
  `20260814_mandatory_sign_in.sql` has no anon branch; all ten data tables carry both a `using`
  and a `with check` predicate against it (`20260813_business_id_part2.sql:356-373`); the
  migration's own verification block (lines 401-421) fails the run if any `qual` or `with_check`
  is still `true`; the semantic keys are widened to `(business_id, …)`; and the absence of
  `onConflict` in `dbSetSetting`/`dbPushSupplierPhrase` is load-bearing exactly as the comment at
  `js/app.js:501-509` claims. The four owner-only restrictive policies in `20260814_roles_part1.sql`
  are enforced server-side and the client guards are correctly described as affordances rather
  than enforcement (`ownerOnly`, `js/app.js:878-882`). The one leak I found is the RPC in
  Finding 7, which bypasses all of it.

- **Delete sequencing.** `dbDeletePlateAfterDishes` (`js/app.js:8636`) is correct against
  `menu_items.plate_id → plates.id` with no delete action: dishes first, plate only if every dish
  succeeded, per-dish outcomes reported, and `rollbackPlateDelete` puts the UI back to the state
  the server is actually in. The belt-and-braces rejection handlers are not paranoia — they are
  what makes the contract independent of `pushWrite`'s internals.

- **The boot and tenant gates.** I specifically tried to construct a re-sync where a failing
  tenant lookup falls open over a known non-member, and the three-value `tenantGateState` /
  `_bootNoMember` latch closes it. `claimState`'s refusal to treat `undefined` as a definite
  answer is the same discipline and is right. The `_claiming` latch does provably terminate the
  claim→resync loop.

- **`uid()`** (`js/app.js:128-166`). The rejection sampling at 252 is correct, the bound on the
  refill loop is justified, the `Math.random` top-up is a top-up rather than an append, and the
  "a new id can never equal an old one because it carries a `-`" argument holds.

- **`restore_backup`.** The `security invoker` + RLS combination means the `delete … where true`
  statements are tenant-scoped, and the argument for a trigger *as well as* a column DEFAULT — that
  `jsonb_populate_recordset` turns an absent key into an explicit NULL which overrides a DEFAULT —
  is correct and is the kind of thing that is usually got wrong. `backupToPayload` naming no column
  of its own is the right structural answer to the camelCase/snake_case trap.

- **Third-party supply chain.** Both scripts are version-pinned with SRI
  (`index.html:1613-1615`, `js/app.js:8874`), `isEvalSupported:false` is kept as defence in depth
  behind the pdf.js upgrade, and the anon keys in `index.html:47-48` are publishable keys that are
  correctly not treated as secrets.

- **`envFence` / `purgeLocalState`.** Collect-then-remove is right (removing while iterating by
  index really does skip every other key), the first-run null-stamp behaviour is right, and the
  duplicated stamp comparison in the `<head>` theme resolver (`index.html:74-75`) is a genuine
  necessity rather than a copy.

---

## If I could only fix three

1. **Finding 1** — it is putting a 10% error into the database today, on the path the app rewards
   users for using, under a banner saying it did the opposite.
2. **Finding 3** — same destination, larger magnitude, and the guard that would catch it is
   switched off on purpose.
3. **Finding 2** — because the fix is fifteen lines and because a wrong figure that arrives in the
   app's own considered voice is worth more than the sum of the small ones.

And one process note, offered because it is the shape of Finding 1 rather than a finding of its
own: the harness that makes this suite good — extract one pure function, run it, pin it — is also
what let this through. `resolveMatchedPrice` is correct. `derivePackPrice` is correct.
`invGstDetect` is correct. The wrong number is produced by the twenty lines that call them in
order, and there is no test in the repository that runs those twenty lines.
