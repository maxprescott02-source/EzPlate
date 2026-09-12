# The parser corpus — how a parser change gets judged

This is the procedure for the invoice-parser eval.
It exists because before batch 256 a parser change was judged by one invoice somebody looked at, and the audit that preceded 256 found the parser wrong on **36 of 41 real lines** while every test in the repo was green.

**The harness is `tests/parser-corpus/run.js` and it is part of `npm test`.**
It runs the REAL shipped parser, sliced out of `js/app.js`, over a directory of cases and scores every line against a hand-written answer.
Nothing in it is a stub, which is the whole point: a copy of the parser agrees with the parser whether or not the parser is right.

---

## The two corpora, and why only one of them can live here

| | where | committed? | runs in `npm test`? |
|---|---|---|---|
| **synthetic** — fourteen invented layouts | `tests/parser-corpus/fixtures/` | yes, text and truth both | **yes** |
| **real** — six of Scoopy's own invoices | the truth files are at `spike/parser-audit/real-truth/`; **the extracted text is not in this repository and must never be** | truth only | **no — it cannot be** |

⚠️ **THE REAL INVOICES' TEXT CARRIES THE CAFÉ'S OWN DETAILS AND THIS REPOSITORY IS PUBLIC.**
That is why only the truth files are committed: a truth file names a product and a price, which is already public in `tests/fixtures/base-products.json`, while the extracted text carries the letterhead, the account number and the delivery address.
**So no test in this repo can run the real corpus**, and a green `npm test` means *no synthetic layout regressed*.
It never means *the real invoices are right*.

⚠️ **A GREEN CORPUS IS NOT A GREEN PARSER, and over-trusting this harness is worse than not having it.**
The fourteen synthetic layouts are **invented**. They were written by reading real invoices, so they carry the shapes that matter, but a layout nobody thought of is a layout the corpus does not contain.
`CLAUDE.md` states the general form: *a check that finds nothing has only proved something about what it looked for.*

---

## Running it

```
node tests/parser-corpus/run.js                                            # the synthetic set
node tests/parser-corpus/run.js --products tests/fixtures/base-products.json
node tests/parser-corpus/run.js --cases /path/to/real-corpus                # the real set
```

**The two runs answer different questions and a parser batch owes both.**
Without `--products` the columns report what the PARSER knew — did it realise it was guessing.
With `--products` the full `buildInvRows` chain runs against a real catalogue and a second column reports `invRowState()`, whose `matched` value is **the only state the review screen pre-ticks**.
A line can be wrong-and-flagged (a human is asked) or wrong-and-ticked (the number is stored).
Only the second costs money, and only the `--products` run can see it.

`--json out.json` writes the scores for diffing; `--verbose` prints every line; `--csv` is the same table as CSV.

---

## The two numbers a parser batch reports

**Before and after, on both corpora, in the handover:**

1. **silent-wrong** — captured, wrong unit or price, and **not flagged**. This is the number the app would store without asking. It is the number that costs money.
2. **pre-ticked-wrong** — from the `--products` run: a wrong row whose `invRowState` is `matched`, so the review screen arrives with it already ticked.

**A change that moves either the wrong way does not ship.**
A change that moves `noisy` up (right, but flagged) is a trade to argue about in the handover, not a blocker: asking about a correct number is an annoyance, storing a wrong one is not.

**Two residuals are allowed by NAME AND BY LINE** in `tests/parser-corpus.test.js`, so a new silent-wrong cannot hide behind an old one.
If you fix one, delete its allowance in the same commit.

---

## Onboarding a new supplier

One invoice, one truth file, one score in the handover.

1. **Extract the text the APP would see.** Never `pdftotext` — its column order differs from pdf.js, and on the real Supplier A invoice the unit-of-measure column lands at the *start* of page-1 lines and the *end* of page-2 lines. That difference is the bug surface, so an extractor that tidies it away is measuring the wrong thing.

   ```
   mkdir /tmp/pdfjs && cd /tmp/pdfjs && npm i pdfjs-dist@4.10.38
   PDFJS_DIR=/tmp/pdfjs node spike/parser-audit/extract-pdf.mjs invoice.pdf > NAME.txt
   ```

   ⚠️ **`pdfjs-dist` is deliberately NOT a dependency of this repo** and must not become one — `CLAUDE.md`'s no-new-dependencies rule. `PDFJS_DIR` is what keeps it outside.
   ⚠️ **Pin the same version the app pins.** `tests/third-party-pins.test.js` is the authority on which that is; if it disagrees with the `4.10.38` written above, **the test is right and this line is stale**.

2. **Write the truth by hand, from the PDF, not from the parser's output.** The schema is in `tests/parser-corpus/fixtures/README.md`. Truth prices are **ex-GST, per stored unit**.
   ⚠️ **Reading the truth off the parser is the one mistake that makes the whole harness worthless** — it then scores the parser against itself and is green by construction. That is `CLAUDE.md`'s stub trap wearing a data costume.
   An **empty `accept` list means "the only right answer is to ask"**. Use it; a line the parser cannot know is not a failure, and pretending there is a number teaches the harness to prefer a guess.

3. **`exclude` lists the lines that must not become priced rows** — fuel levies, totals, credit-note headers, balance-owing. A row built from one of these is a **leak**, and leaks are counted separately because they are the failure the café notices as "why is there a $29 product called TOTAL DUE".

4. **Put the pair side by side** in the real-corpus directory as `NAME.txt` + `NAME.truth.json`, and run `--cases` at it.

5. **Report its score in the handover.** A supplier whose first run is bad is not a reason to delay the onboarding — it is the finding.

---

## What is NOT built, and is queued rather than forgotten

- **The AI second reader is not replayed.** `--products` reports what the app would pre-tick from the parser and the catalogue alone; on a real import the Gemini referee also gets a vote, and nothing here stores its answers to replay offline. So the pre-ticked-wrong number is a **lower bound** on what the screen would show.
- **The extractor never sorts a line's items by x.** `extractPdfText` groups by y and joins in content-stream order, which is why the UOM word moves between pages. Sorting by `transform[4]` within a y-group would put it where it prints — and it must be done with the real corpus in place, showing whether any real invoice changes, because it moves every line of every layout at once.

Both are consolidated item 93.
