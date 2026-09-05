# Independent code audit — EzPlate

**Reviewer: GPT-5.6 Sol, ChatGPT Plus, thinking effort High, 5 Sep 2026.
Worked for 25m 52s. It cloned the repo and read raw files over the network.**

⚠️ **NOT GPT-6 Astra.** The staged rollout had not reached this account: the model
picker offered GPT-5.6 Sol and GPT-5.5 only. Worth re-running when Astra lands.

Brief: `BLIND-AUDIT-2026-09-05-brief-code.md`. It was told not to read `CLAUDE.md`,
`docs/QUEUE.md`, `docs/MAINTENANCE.md` or `docs/handovers/`, so **a finding here
being already known is expected and is not a mark against it.**

Its own stated limitation, quoted: it inspected the tests most directly connected
to the defects below but **did not complete a file-by-file assessment of all ~130
test files**, so the test section is not exhaustive.

---

## ⚠️ VERIFICATION DONE BEFORE THIS FILE WAS WRITTEN — READ THIS FIRST

Per `CLAUDE.md`: run the finding's own repro before acting on it. Three were
checked on the spot. **The rest are unverified claims, not established defects.**

| # | Status | Evidence |
|---|---|---|
| **9** | ❌ **FALSE. Do not act on it.** | `git show origin/main:js/app.js \| node --check` → **parses clean** at `a56055e`. The "bare English prose" at 7290 and 11586 is the **continuation lines of `/* … */` block comments**. The reviewer fetched raw file slices and lost the comment context. It ranked this a release blocker; production is fine. |
| **4** | ✅ **CONFIRMED, exactly as described.** | `20260814_invitations.sql:495-540`. `claim_business_invite()` takes **no arguments**, selects `where i.email = em and i.accepted_at is null order by i.created_at, i.id limit 1`, and inserts `business_members` with **`inv.role`** from that arbitrarily-chosen invite. Two pending invites to one confirmed email means oldest café wins and its role is applied. |
| **10** | ⚠️ **Real, and already deliberately pinned.** | `tests/insight-parity.test.js` carries a comment headed *"THE RESIDUAL, PINNED AS A KNOWN GAP RATHER THAN LEFT TO BE REDISCOVERED"* and asserts the current truth so the test goes red the day someone closes it. The reviewer's mechanism is right; it is a recorded decision, not a discovery. |

**What #9 says about the other eight.** The reviewer read the repository over the
network in slices rather than whole files. That is the exact condition that
produced a confident, precisely-cited, wholly false finding, and it was its own
highest-urgency item. **Treat every line citation below as a pointer to check, not
as a fact.** Findings 1, 2, 3, 5, 6, 7 and 8 are unverified as of this file.

---

## Its summary

> I found multiple defects I would treat as release-significant. The worst ones
> are not cosmetic: there are plausible silent mis-costing paths, two same-session
> tenant-state contamination paths, and an invitation flow that can join the user
> to the wrong café.

## Ranked findings, as given

### 1. Critical — quantity-first carton invoices can silently halve an ingredient's unit cost
**Unverified.** `parseInvoiceText()` can count the purchased-carton quantity as
part of the pack weight while selecting a per-carton price.

Supplier line: `2 CTN Beef Mince 6 x 1kg 60.00 60.00 120.00`. The pack parser sees
both `2 CTN` and `6 x 1kg`, giving a 12 kg denominator; the monetary chooser takes
the repeated `60.00`. Result **$60 / 12 kg = $5/kg with `needManual:false`**. The
invoice says two 6 kg cartons at $60 each: **$120 / 12 kg = $10/kg**. Nothing
errors and the answer is believable.

Where: `js/app.js:10287-10340`, applied around `11576-11583`. Confidence high on
the arithmetic; uncertainty is how often suppliers emit quantity-first layout.

*Note: this sits in or near the protected parser region. A fix has to respect that.*

### 2. Critical — café A's costing settings survive a same-session transition into café B
**Unverified.** Successful bootstrap of a new tenant does not reset tenant-scoped
settings before applying rows, so settings absent in B inherit A's values.

A has food-cost target 30% and GST default `inc`. A membership is revoked while
the page stays open (the non-member path deliberately leaves in-memory state
present). The account is later admitted to B. B has no `food_cost_target` row, so
bootstrap never assigns the variable and **A's 30% survives**. A $6 dish that
should use the 40% baseline is suggested at **$20 instead of $15**. An inherited
inclusive-GST default turns $110 into $100.

Where: `js/app.js:1082-1085, 1239-1249, 2737-2751, 9907-9918`.

### 3. Critical — supplier-learning data from café A is automatically written into café B
**Unverified.** `supplierMem` survives the same transition; if B has no supplier
phrases, bootstrap treats A's retained phrases as local unsynced data and pushes
them into B, correctly stamped as B by the tenant machinery.

**"This is not an RLS bypass. RLS is doing its job; the client is handing B data
that originated from A."** Cross-tenant disclosure plus persistent parser pollution.

Where: `js/app.js:1231-1237`, supplier-memory helpers ~`4131-4140`, non-member path
`1082-1085`.

### 4. High — an account with two pending invitations is silently joined to the oldest café
✅ **CONFIRMED above.** `claim_business_invite()` takes no invitation or business
identifier. A invites alice@ Monday, B invites the same address Tuesday; Alice
follows B's path, the client calls the argumentless RPC automatically, SQL orders
by `created_at, id LIMIT 1` and she becomes an **A** member. The one-business-per-user
constraint then blocks the membership she wanted. **The role comes from the
selected invitation too**, so the wrong pick also decides her role.

It adds: no evidence an already-accepted invitation can be replayed. The
locking/state transition is substantially better than the selection semantics.

### 5. High — transient role lookup failure lets staff alter the live costing target
**Unverified.** On a fresh session an unknown/error role is treated as owner
client-side. `current_business_role` transiently fails for a staff account; the
control stays operable; they change 40% to 30%; **`setCogs()` updates `cogsPct`
and recomputes pricing immediately**, then the Supabase write is correctly refused
by the owner-only policy and **nothing rolls back**. A $6 dish shows $20 instead
of $15 until reload.

Where: `js/app.js:916-926, 1131-1133, 2739-2750`, handler ~`8534-8540`; SQL policies
~`1732-1773`. **"The server authorization is sound here. The numeric client state
is not."**

### 6. High — a failed `menus` SELECT is treated as a valid boot and creates a fictional server menu
**Unverified.** `menus` is excluded from the fatal bootstrap-read check, after
which `ensureDefaultMenu()` can generate an in-memory menu id never inserted into
Supabase. Existing `menu_items` still point at real server ids and stop matching;
the publish guard sees a non-empty `menusList`, assumes a server menu exists, and
a write with the fictional id hits the FK.

**"This can first present as 'my dishes disappeared' and then become a failed-save
path."** Where: `js/app.js:1139`, ~`2626-2646`, publish guard `2712-2719`.

### 7. High — invoice Apply announces completion before the price writes have succeeded
**Unverified.** The importer increments its applied count synchronously, closes
the dialog and renders "Invoice imported" without awaiting the product upserts.
Eight confirmed prices on a phone, all eight `setProduct()` calls rejected by
connectivity/auth/RLS, and the affirmative completion signal is still false. Later
failures can toast, so not literally invisible.

Where: `js/app.js:11561-11660`, success presentation ~`11715-11718`, optimistic
`setProduct()` ~`1342-1384`.

### 8. High/medium — price/history rows can describe a change that failed to persist
**Unverified.** Some dish/plate mutation paths call `logHistory()` independently of
successful persistence. Change a dish price $15 → $17, the `menu_items` upsert
fails (finding 6 supplies a deterministic failure), and the history inserts
succeed on their own. **Supabase then holds a $17 price-history point for a menu
item that never became $17**, poisoning trend and insight history.

Where: dish mutation ~`js/app.js:1751-1767`, plate save ~`3031-3034`, history
persistence ~`4085-4126`.

It adds: **the ingredient-price history path does NOT have this defect** — that
one now gates its logging on the product write.

### 9. ❌ "Release blocker — bare English prose inside app.js"
**FALSE. Disproven above.** `origin/main` at `a56055e` parses clean. The cited text
is inside block comments.

### 10. Medium — the insight validator accepts semantically reversed advice
⚠️ **Real, already pinned as a known residual.** Template *"Beef, up 18% across 5
plates, is most of it"* versus candidate *"Beef, up 18% across 5 plates, is fine
and needs no action"*. Same tokens, reversed meaning, accepted.
`api/_insight.js:263-297`; `tests/insight-parity.test.js:161-172`.

### 11. Medium — "numbers cannot be removed" is contradicted by the validator
**Unverified.** The number skeleton is only required to be a **subsequence**, so a
candidate that invents no number can drop both `18%` and `5 plates` and pass.
`api/_insight.js:31-35, 190-213, 263-297`; `tests/api-insight.test.js:89-94`.

## Two comment/behaviour disagreements it flagged as defects in their own right

1. The role-error commentary at `js/app.js:916-919` calls fail-open role
   presentation harmless because the server rejects owner-only writes. **Incomplete:
   `setCogs()` has already changed live numeric state before the rejection, with no
   rollback.** Not "an extra control plus a toast" but a wrong $20 where $15 is right.
2. The publishing code relies on a non-empty `menusList` meaning menus the server
   has. Finding 6's bootstrap path puts an unsaved generated menu in that list, so
   **the invariant is false on a reachable error path.**

## Tests it assessed

Its answer to *"would this test fail if the behaviour it names were broken?"*, with
the hole it names:

| Test | Fails if broken? | Hole |
|---|---|---|
| `parser.test.js` | Yes, for its fixtures | Multi-carton fixtures put pack composition **before** purchased quantity, so it stays green for finding 1 |
| `inv-packnorm.test.js` | Yes for compound-pack normalisation | Does not exercise purchased quantity during parsing; green against finding 1 |
| `matched-price.test.js` | Yes for matching parsed rows | Starts downstream of raw parsing, cannot see the wrong $5/kg |
| `inv-unit-rebase-apply.test.js` | Yes for its gate | Supplies prepared rows and controlled writes; does not prove completion waits for persistence |
| `invoice-gate.test.js` | Yes for its reviewer gate | Does not prove writes committed before "imported" |
| `menu-default.test.js` | Yes for failed create-menu rollback | **"Expensive green test"** — asserts `menusList` consists of server menus, never exercises a failed `menus` SELECT during bootstrap, the separate path that violates it |
| `boot-gate.test.js` | Yes for the membership gate | Does not cover `menus` as a bootstrap dependency, so finding 6 survives |
| `insight-parity.test.js` | Mostly, but one test is the opposite of protection | The "fine and needs no action" case asserts inversion is accepted *(known and deliberate — see verification table)* |
| `api-insight.test.js` | Partially | **False confidence:** its "forbids changing numbers" assertion checks prohibition **wording**, not that the validator prevents removal |
| role/client tests | Yes for the specified unknown-role semantics | By pinning unknown as owner-like, they do not establish rollback of cost-affecting state after rejection |
| invitation tests | Yes for what they exercise | Never two simultaneous pending invitations for one confirmed email, so oldest-invite selection is invisible |
| history-path tests | Yes that history is called | **That is the weakness:** proving the call occurs does not prove it occurs only after the primary write succeeds |

> The strongest example of a test creating false confidence is `menu-default.test.js`:
> it protects a good invariant at the explicit create-menu entry point while
> bootstrap independently violates that same invariant.

## Areas it found clean

- **No ordinary-table cross-tenant RLS bypass** in the migrations it traced. The
  tenant function and table policies consistently scope ordinary data operations
  to the current business, and the owner-only restrictive policies it checked
  enforce the privilege at Postgres rather than trusting the client. That is why
  2 and 3 are client-state contamination, not SQL isolation failure.
- **No straightforward invitation replay** turning an accepted invitation into a
  second membership, and no path where the client chooses a more privileged role
  during claim. The stored role is what SQL inserts.
- **The newer ingredient-price-history persistence is materially safer** than the
  dish/plate history paths: tied to the product write result rather than blindly
  recording optimistic state.

## Its triage order

Block on #9, then #1, #2/#3, #4/#5, #6/#7, #8, then the two insight-validator gaps.

**#9 is false, so the real head of that list is #1.**

Regression tests it wants added: the exact quantity-first carton fixture, an
A → non-member → B same-page bootstrap with empty B settings and supplier phrases,
two pending invitations to the same confirmed email, a failed `menus` SELECT, and
an invoice whose product writes reject after Apply is pressed.
