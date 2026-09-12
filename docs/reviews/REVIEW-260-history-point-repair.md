# REVIEW-260-history-point-repair

Reviewed-commit: 0a060c1

`code-review` agent, Sonnet against Opus, on `git diff main...HEAD`.

**Four findings. All four real, all four fixed.** The two that matter are a test that could not fail
on the guard it was written for, and a justification I wrote that cited a mechanism whose actual
condition I had not read.

---

## The report, verbatim

### 1. `syncHistFixRow`'s test asserts presence, not behaviour — `tests/history-point-repair.test.js:204-212`

**Severity: major** (a guard that can be inverted with the suite staying green — category 5).

The test reads:

```js
const body = extractFn(SRC, 'syncHistFixRow');
assert.match(body, /badHistoryPoints\(\)/, 'is there anything to review');
assert.match(body, /isOwner\(\)/, 'and may this person review it');
```

Both literals are present in the source whether the guard is `row.hidden = !n || !isOwner()` or
`row.hidden = !n || isOwner()`. I flipped it and re-ran the file: **22 pass, 0 fail.** The inverted
guard shows the control to exactly the staff it exists to hide it from, and hides it from every
owner — the dead control the diff's own comment says the design protocol forbids.

The data is not at risk (`price_history` refuses a non-owner DELETE on the server since batch 250),
so this would have shipped a dead control rather than a data defect. That is still the thing the
guard exists to prevent, and the test covering it cannot see it. This is CLAUDE.md roster 167(a):
a presence assertion cannot see a negation, and here the guard *is* the negation.

`syncHistFixRow` is also not in `tests/mutation/targets.js`, so nothing else was ever going to ask.

Confidence: **high** — reproduced by mutating the shipped function.

### 2. `dbDeleteHistoryPoint`'s natural key rests on a claim about `logHistory` that is not true — `js/app.js:4953-4955`

**Severity: medium** (a wrong justification in a comment guarding a delete — category 1).

The comment justifying delete-by-`(recorded_at, menu_id)` says:

> The natural key is unique in practice because `logHistory`'s hourly dedup admits one point per
> series per hour

I went and read that dedup. It is:

```js
if(last && Math.abs(last.v-v)<0.05 && (now-ptMs(last))<3600000) return;
```

That is **value-gated, not time-gated**. It suppresses a point whose value has barely moved; a
reading that moves by 0.05 or more inside the hour writes a second point, entirely legitimately. So
the stated reason for the key's uniqueness is not what that guard does. `price_history` has no
unique constraint on `(recorded_at, menu_id)` either — the index there is non-unique — so nothing
else enforces it.

The delete uses `.eq('recorded_at', …).eq('menu_id', …)` with no `limit`, so if two rows ever did
share a millisecond, both would go. That may well be the right behaviour, but the comment argues it
from a premise that does not hold, which is CLAUDE.md's "a justification that CITES A PRECEDENT is a
claim that the precedent's CONDITION holds here, and it is never checked."

Confidence: **high** — the dedup's condition is on screen at `js/app.js:5262`.

### 3. A stale `data-i` can be acted on if the series is reassigned while the modal is open — `js/app.js` (`renderHistFixList`'s click handler)

**Severity: medium** (deletes a different reading than the one named in the confirm — category 4).

The handler does `badHistoryPoints()[parseInt(b.dataset.i,10)]`, recomputing the list at click time,
which is right. But the index was baked in at render time. `bootstrapSync` reassigns `priceHistory`
and `menuHistory` wholesale, and an `online` event is enough to run it while this modal sits open.
If the recomputed list has a different length or order, index 2 names a different reading than the
one whose date and percentage were written into the confirm the user just read and accepted.

Both readings are bad ones by construction, so the list still looks correct afterwards and the
wrong deletion leaves no trace. Key the button to the point's identity rather than its position.

Confidence: **medium-high** — the reassignment path is real; whether it lands mid-modal is a race I
have not reproduced.

### 4. Three stray duplicate test files are tracked by git

**Severity: medium** (a trap for future readers — category 5).

`tests/parser-charges.test 2.js`, `tests/safe-area-inset.test 2.js` and `tests/supplier-snap.test 2.js`
are new files in this diff. They are **older** copies of the three real files — macOS "keep both"
artefacts. They do not run (`node --test tests/*.test.js` requires the name to end `.test.js`, and
these end ` 2.js`), which is worse rather than better: they are silent.

They're a trap: if the real file's test is later tightened for a bug fix, the stale "2" copy will
keep silently passing the old, weaker assertion forever — and a grep for a test's name now returns
two files with different assertions in them.

Confidence: **high** — `git ls-files` lists all three.

### No bugs found elsewhere

- **`removeHistoryPoint`'s `writeLanded` gate** is correct and is the right lesson from the
  signed-out defect the diff documents: `.select()` plus a length check is the only way to tell a
  blocked PostgREST delete from a successful one, since both return 200 with no error.
- **`avgBefore`/`avgAfter`** are captured before the write is issued and written as the same figure,
  which matches CLAUDE.md's rule that `computeAvgFoodCost()` is live.
- **`CHANGE_KINDS`** gains `history_point_removed` with the comment correctly placed *above* the
  array — the census parser splits the literal on commas.
- **Six cache-version spots** all agree at `v214`.

### Relevant files
- `/Users/max/Documents/Scoopys-Costing/js/app.js`
- `/Users/max/Documents/Scoopys-Costing/tests/history-point-repair.test.js`
- `/Users/max/Documents/Scoopys-Costing/tests/mutation/targets.js`

---

## What was done about each

### Finding 1 — FIXED, and it is the batch's own defect

**Reproduced before touching anything.** Backed the file up by copy (never `git checkout --`, per
CLAUDE.md) and flipped `!isOwner()` to `isOwner()` in the shipped function. Against the ORIGINAL
test: **22 pass, 0 fail**, exactly as reported. Against the rewritten one: **21 pass, 1 fail**.
The mutation was confirmed to have actually changed the file with `diff -q` before each run, per
CLAUDE.md — a pattern that matches nothing reads as a survivor.

The test now **runs** `syncHistFixRow` against a fake document with `badHistoryPoints` and `isOwner`
stubbed, and asserts `row.hidden` across **all four** combinations — because a guard with two terms
has one visible case and three that are only reachable by asking for them. A second test pins the
button's count label. The hand-mutation now goes red.

`syncHistFixRow` is added to `tests/mutation/targets.js`: **5 mutants, 5 killed.** CLAUDE.md's own
words on why that matters more than the one fix — *a function that is not a target has never been
asked the question.*

### Finding 2 — FIXED, and the finding is right about the mechanism

I read the dedup rather than re-reading my own comment, and it is exactly as reported:
value-gated, not time-gated. **My sentence was the argument for the key, and it was false.**

Measured on production rather than argued: `select recorded_at, menu_id … having count(*) > 1`
returns **zero rows**.

**The key is kept, for a reason that is actually true.** Two rows would have to share the same
*millisecond*, and if they ever did, `mergeSeries` has already collapsed them into ONE point on the
way in — it dedups on `ptMs`. So the user is looking at a single reading, cannot distinguish the
rows behind it, and "remove this reading" can only coherently mean all of them. Deleting both is
what the screen offered. The comment now says that, and records the false first draft and how it
was caught, because the citation trap is the transferable half.

### Finding 3 — FIXED, and the race is real; I reproduced it

The button now carries `data-t` and `data-menu` — the reading's identity — and the lookup is a named
function, `badPointByIdentity`, rather than four lines inline, so it can be tested and mutated. A
reading that has gone repaints the list and says nothing, because nothing went wrong.

**Driven in a real browser** with two bad readings that share a timestamp and differ only by series
— the case an index confuses. Both buttons resolved to the reading named on their own row. Then I
reassigned `priceHistory` with a new bad reading landing *ahead* of the rendered one, which is what
shifts every index by one:

| | button 0 resolves to |
|---|---|
| before the re-sync | 912.5% |
| after, by identity | **912.5%** — the reading named on the confirm |
| after, by index | **555.5%** — a reading the user has never seen |

Three tests pin it, on a fixture where the two candidates differ in *one* half of the key at a time
(roster 184(b): a fixture whose candidates agree cannot tell you which half the code read), plus the
null-vs-`''` menu id the DOM hands back. `badPointByIdentity` is a mutation target: **6 mutants, 6
killed.**

### Finding 4 — FIXED

Deleted. They came in with my own `git add -A` this batch (`git log --diff-filter=A` names
`0a060c1`), and the reviewer is right that not running is the worse failure: nothing would ever have
gone red.

**After the fixes: `npm test` 2229 pass / 0 fail; smoke green; `node -c` clean; mutation gate green
on both new targets.**
