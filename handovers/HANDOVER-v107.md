# HANDOVER — v107 (1 Aug 2026) — supplier detection + the supplier-memory sync guard

**Branch:** `fix/supplier-detect-and-sync-guard` · **Scope:** two real faults the
v106 backup audit exposed, once supplier memory was finally in the export and
could be read. Six version spots v106 → v107.

Both are the same shape: data quietly wrong or quietly gone, with no error and
nothing on screen to notice.

## 1. Taught packs were keyed to a supplier that doesn't exist

Six of Max's seven `supplier_phrases` entries were stored under the supplier
name **`"Document No:"`**. `memKey()` keys taught packs off the supplier NAME,
so those six worked only by the coincidence of a *consistently* wrong parse —
and would have orphaned silently the moment the parser improved.

### Root cause — two defects, proved against four real invoices

Max supplied four Bidfood PDFs. Run through the real `extractPdfText`, every one
comes out identically:

```
 0: "Document No:"
 1: "I71088300.SUN"
 2: "TAX INVOICE"                            <- the header slice STOPPED here
 3: "BIDFOOD SUNSHINE COAST a division of"   <- the supplier is one line BELOW
```

**(a) The heading is not a reliable end-of-letterhead.** `header` was every line
*above* the first `Invoice`/`Tax Invoice`/`Statement` match. On this layout —
and it is a very common one — that is just the document number. The single line
naming the supplier sits below the heading and was unreachable. So strategy 2,
the known-supplier match, never had a chance, **even though `Bidfood` is a
supplier on Max's own products.**

**(b) A bare field label passed every filter in the guesser.** With strategy 2
starved, strategy 3 ran: *first business-name-looking line in the header*, whose
skip-list covers dates, ABN, streets, phone, email, `$`, and any run of 3+
digits. `Document No:` has none of those, has 3+ letters and is under 42 chars —
so it was returned as the supplier. Note the label *with* its value
(`Document No: 47821`) was already caught by the `\d{3,}` rule; it is the label
**alone**, its value wrapped to the next line by PDF text extraction, that leaked.

### The fix, and why it is asymmetric

**Only the known-name pass got a wider window.** It can match nothing that is not
already a supplier or brand on the user's own products, so widening it can only
find a supplier it would have missed — it cannot invent one. The **guesser keeps
the narrow letterhead** and gained a field-label skip, because that path *can* be
wrong and should stay tight.

Result: all four real invoices now resolve to **`Bidfood`** — the clean value
from Max's own data, not a scraped business line. An unidentified supplier now
returns **blank**, and blank is safe by design: `rememberSupplierPhrase` refuses
to store without a supplier, so no wrong key is ever written.

The label skip matches a line composed *entirely* of label words and separators,
so `Delivery Docket` and `Our Order No` are caught while a real business called
`Page Brothers` or `Account Foods` is not.

**Both edits are outside the protected parser region** (4315–4541);
`invSupplierDetect` lives at 1266.

### The six orphans were NOT migrated, deliberately

Changing the detector re-keys future imports, so the six existing entries stop
matching. I did not migrate them:

- The app **cannot know** retroactively which supplier they came from. Inferring
  "Document No: means Bidfood" is true of Max's data and false in general — a
  migration shipped to every user on a guess about one.
- A taught pack is user-confirmed ground truth. v71 made them read-only for
  exactly this reason; silently rewriting them is worse than leaving them.

**And the cost is one entry.** Checked, not assumed — against the precedence
chain (product pack > supplier memory > parser):

| phrase | product pack backstop |
|---|---|
| avocado tray (The Fruit Wagon) | unaffected — different supplier |
| mayonnaise | **P0222**, 1 l |
| pluto pups | **P0268**, 20 ea |
| spring rolls | **P0332**, 12 ea |
| cheese slices (105 ea) | **P0079**, 105 ea |
| cheese slices (**1.5 kg**) | none — and it *contradicts* the row above |
| cheesecake lime swirl | none |

Four of the six are also product packs, which **outrank** supplier memory, so
they keep working untouched. One is a contradictory duplicate for the same
cheese product — losing it is a fix. The real loss is the cheesecake, and one
Bidfood import re-teaches it.

## 2. An empty server read wiped local supplier memory

```js
if(spr && !spr.error && Array.isArray(spr.data)){ ... supplierMem=mm; saveSupplierMem(); }
```

`Array.isArray([])` is true, so a response of **zero rows** replaced
`supplierMem` with `{}` and persisted it — destroying every taught pack on that
device before the user could ever export one.

**Zero rows is not proof of zero rows.** Over PostgREST a successful-but-empty
read and an RLS-blocked read are indistinguishable — the same ambiguity
`CLAUDE.md` already records for `menu_price_history`, whose fix file may or may
not have been run. A policy fault on `supplier_phrases` would present as "the
server says you have none", and the app believed it.

**The trade, made explicitly (Max's call, 1 Aug 2026).** Wholesale replace is not
sloppiness — it is *how deletions propagate*: remove a phrase on the phone, and
the laptop's next sync sees the shorter list and drops it too. Guarding on
non-empty breaks that for the **last remaining** phrase, which will now survive
until removed locally. Accepted: a stale entry costs one Remove; losing every
taught pack costs a re-teach per phrase, and they have no second copy. Local is
**re-pushed** on the empty-server path so the server heals rather than diverges.

Non-empty reads are completely unchanged.

## Verification

- Baseline: `npm test` **514 green**, `node -c` clean, six spots agreed at v106,
  `main` at the v106 merge (PR #45).
- **The detector was run against the four real PDFs, before and after**, using
  the real `invSupplierDetect` sliced out of `app.js` and Max's real product set
  (BASE_PRODUCTS + his overrides − deletions), through a faithful copy of
  `extractPdfText`. Before: `"Document No:"` ×4. After: `"Bidfood"` ×4. The PDFs
  were read locally and never left the machine.
- After: **`npm test` 533 green** (514 + 19: 13 supplier-detect, 6 sync-guard) ·
  `node -c` clean (`js/app.js`, `sw.js`) · **jsdom smoke green, 25 sections** ·
  **Playwright 91/91**, run alone, 1.7m.
- The new tests use the **real Bidfood header as the fixture**, and pin the paths
  that already worked: an explicit `Supplier:` label still wins, a plain
  letterhead still resolves with `Pty Ltd` trimmed, an unreadable letterhead
  still returns blank, and the widened window must **not** let the guesser start
  reading down the page.

## CodeRabbit — 4 findings, 2 of them real, and one was mine

**FIXED — a known BRAND in an item row could be read as the supplier.** This was
a genuine regression I introduced: the widened window reaches far enough down a
compact invoice to touch the first item rows, where a brand like "Tip Top" would
have won. The two are now searched over **different windows on purpose** — a
supplier value *is* the answer to "who invoiced this" and earns the wide window;
a brand is only circumstantial and stays confined to the letterhead exactly as
before v107. This is strictly better than what I first wrote, and it also makes
a supplier below the heading beat a brand above it, which is the right order.

**FIXED — a bare `Supplier:` would have been returned as a supplier named
"Supplier:".** Strategy 1 requires `label: value` on ONE line, so a label whose
value wrapped falls through to the guesser — and my label list contained every
document label except strategy 1's own. Exactly the same bug I was fixing, one
door along. `supplier`/`vendor`/`sold`/`distributed`/`from`/`by`/`to`/`ship`/`bill`
added, with tests.

**DECLINED (×2) — "add regression tests" for both changes.** Both test files were
untracked when the review ran, so CodeRabbit reviewed the diff without them.
They existed already; the cases it listed were re-checked against them, and the
two genuine gaps it exposed (brand-in-item-row, wrapped `Supplier:`) are covered
by the four tests added above.

**FIXED (minor, second pass) — "1 Aug" without a year** in this handover's
heading and a test comment.

## Needs Max (v107)

1. **Import one Bidfood invoice on the phone** and check the supplier field
   reads `Bidfood`. This is the whole batch in one action.
2. **Clear the six orphans** — Settings → Remembered items, Remove each entry
   showing "from Document No:". The import in (1) re-teaches what it needs.
3. Nothing else changed on screen; no CSS, no markup.

Carried forward: the whole v82–v106 phone list, still the top item.
