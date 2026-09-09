# HANDOVER - 255 (staff may delete plates, not products)

**Branch:** `255-queue-unblock` · **Scope:** `docs/QUEUE.md` item 91, plus recording the three decisions Max gave on 10 Sep.
**Deploy version shipped:** `ezplate-v210`.

## What changed

**The staff/owner delete line moved to where Max put it**, and the two rules were exactly INVERTED against what he wanted: staff could not delete a plate, and could delete every product that plate is costed from.

> *"they can do plates but not products, since those can break other plates that arent theres."*

**His reason is better than the rule it produced and is carried at every site.** The line is not *how much damage does this delete do* — deleting a plate is plenty. It is **whose work it destroys**. A plate belongs to whoever built it, and a café whose staff cost dishes has to let them delete their own mistakes. A product is the row every plate's cost is computed from.

- `plates` — 187's owner-only DELETE **dropped**. This is him reversing his own decision; he was told it was a reversal, said *"touch it and sort the merge out"*.
- `ingredients` (the PRODUCTS table) — restrictive owner-only DELETE **added**, server and client.
- `menus` — untouched. He said plates.

**Verified on staging AS A SIGNED-IN STAFF MEMBER**, which is the role every rule here names and the thing batch 219's failure was about: staff deleted the plate, was refused the product, the owner then deleted it. The harness was proved to fail by inverting one assertion. Applied to production and read back.

## Review

**Three findings, all mine. The major is the best this process has produced, because it did not find a bug — it found the COST of a judgement I had made on Max's behalf.**

I extended his answer to **taught packs**, on his stated reason: removing one changes what every future import prices a product at, so it reaches other people's plates the same way, one step later. That reasoning still looks right.

**What it missed: `applyTidy`'s supplier rename RE-KEYS every taught pack, and re-keying is delete-then-insert** — through a chain (`openTidyManage` → `renderTidyValues` → `openTidy` → `applyTidy`) with **no role check anywhere in it**. With the policy in place a staff supplier rename would have its DELETE refused, drop the entry from memory anyway, push the new row, toast *"Renamed supplier … on N packs"*, and leave the old row to reappear at the next boot. **`CLAUDE.md`'s own orphaned-taught-pack trap, manufactured by my fix.**

**The remedy was not to gate the tidy flow.** That takes away a capability he was never asked about. So the policy is reverted everywhere — migration, mirror, staging, production — and item 91 is reopened as one question with both options costed.

Two smaller ones, both fixed: `newestPolicySource` selected its file from RAW text and comment-stripped only the winner (183(a) at the selection step, inside the function written to apply 219's lesson); and `openDelChoice` was "tidied" in a way that newly hid a button for every role, which nobody asked for.

Full report verbatim: `docs/reviews/REVIEW-255-staff-deletes.md`.

## Into CLAUDE.md

**One new Tier 1 section** — what staff may delete is decided by whose work it destroys, with the before/after table and the reason.

**And the rule the review earned, which is 254's lesson one day later and one level up:**
**an inference from someone's stated reason is FREE WHILE IT COSTS NOTHING, and becomes THEIRS the moment it costs something.** The test is not whether the reasoning holds — it usually does, which is what lets this shape survive — but **what the extension takes away, and from whom.** Find the OTHER callers of whatever you are restricting before deciding you have merely applied their answer.
**Labelling it is what made it recoverable:** four documents said "inference, not his answer", so the reviewer had a claim to check rather than a rule to re-derive.

**One correction, and it is the one that could have cost data.** The naming-inversion table put the Supabase `ingredients` table on the **kitchen** side. It holds PRODUCTS — measured: 428 rows against 164 kitchen ingredients in an `app_settings` blob — and Tier 2 always said so correctly, so the file disagreed with itself in the section a reader consults *precisely when they are unsure which is which*. Caught only because this migration had to name the table.
**The transferable half: a two-column mapping fails in a way prose does not, because you check the column you are unsure about and trust the row.**

## New docs/QUEUE.md items

None. **Item 91 is reopened** as one question — may staff remove a taught pack? — with the cost now attached and everything needed to build either answer written down.

## New docs/PHONE.md items

None. The role controls are asserted in a real browser at both themes and both widths by `tests/visual/188-roles.spec.js`.

## Probe

**What did the item tell you to do that you would have done differently?**
Nothing — but the ANSWER told me something the item could not: his reason drew a better line than "how destructive is this". I would have gated by blast radius and got plates wrong.

**What did you not propose because it was out of scope?**
Gating the tidy chain. It is the honest completion of the taught-pack restriction and is exactly why that restriction is now a question rather than a shipped change. Written into item 91 as option B rather than filed separately, because the two only make sense together.
Also the plate-less "Delete everything" wording, which offers to delete everything for a dish with nothing extra to delete. Pre-existing, spotted by the review, filed rather than fixed inside an unrelated PR.

## Surprises

**Playwright was the only thing that went red.** `tests/visual/188-roles.spec.js` asserted `#bldDelete` is hidden for staff — the exact rule being reversed — while `npm test` and the mutation gate were both green on the change. `CLAUDE.md` says in as many words: if a change alters WHETHER A CONTROL EXISTS, run Playwright and grep the specs for the id. It was right.

⚠️ **And a Playwright run was DISCARDED for a cause the `verify` skill did not cover.** It reported **exit 0, no failures, 474 passed + 14 skipped = 488** against **492 collected** — four tests neither passed, failed nor skipped. The cause: I launched the `code-review` agent while Playwright was running, and **the reviewer hand-mutates `js/app.js` to check its findings.** "Commit first, run second" is about *your* edits.
**Now in `skills/verify`, with the harder half: check the total against `--list` every time.** A green exit code that has not run what you think it ran is the same class as `node --test` printing `fail 0` while exiting 1, and the number is the only thing that shows it.

**I guessed a selector instead of measuring one** and timed out eight tests: `#ingList .ing-row, #ingList tr`, where the renderer wires `.ing-card`. Thirty seconds with the renderer would have been faster than the run that found it.
