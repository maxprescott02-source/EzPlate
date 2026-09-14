---
paths:
  - "supabase/**"
---

# SQL, RLS and migrations

Loaded whenever anything under `supabase/` is read. Each of these was measured on a real project, not reasoned about.

**Moved out of `CLAUDE.md` verbatim by batch 264** so it loads with the file it protects instead of on every turn of every session. The rule in `CLAUDE.md` is the one-line version; this is the evidence.

⚠️ **Cross-references here were written before the split.** *"this file"*, *"Tier 1/2/3"* and *"the section above/below"* meant `CLAUDE.md` as it stood at 1,078 lines; the target is now `CLAUDE.md`, another file in `.claude/rules/`, or `docs/rules/process.md`. **The text is deliberately unedited - rewriting fifty pointers by hand is how a rule drifts from the one that was agreed.** Grep the phrase rather than following the direction.

## A column DEFAULT does not survive the restore

`restore_backup` inserts five tables as `insert into <t> select * from jsonb_populate_recordset(null::<t>, …)` — **no column list**.
`jsonb_populate_recordset` yields the table's whole column list, and **an absent JSON key becomes an EXPLICIT NULL, which OVERRIDES a column DEFAULT rather than falling back to it.**
That migration says so at its own site, which is why every one of those inserts is followed by an `update … where <col> is null` backfill.

**So adding a column with a DEFAULT to `ingredients`, `menus`, `plates`, `menu_items` or `supplier_phrases` gives you the default everywhere EXCEPT after a restore**, where every row lands null — and the restore still returns success with the right row counts.
The other restore paths name their columns and are safe: `ing_price_history`, `menu_change_log`, `app_settings`, and - since 219 put the last two history series in the backup - **`price_history` and `menu_price_history`**. (Said "the three other" until 2 Sep 2026, AUDIT-v186 F2. **The hazard half above - which five tables a DEFAULT is unsafe on - was and is exactly right**; only the safe list understated itself, which is the harmless direction and is still worth fixing, because a reader who counts three and finds five stops trusting the five.)

**Measured, not reasoned** (13 Aug 2026, staging, on Max's real 412-product export): with the `set_business_id` trigger dropped from `ingredients` only, all 412 restored products came back null while `plates` came back correct.

**The remedy that cannot be forgotten is a `BEFORE INSERT` trigger**, not a fix to the five inserts — because the next batch to rewrite `restore_backup` would have to remember the fix again. `set_default_business_id` + ten `set_business_id` triggers is the working example.
⚠️ **The general law is wider than one column:** any DEFAULT you add to those five tables is a claim that holds on every path except the one that runs after a disaster, which is the path nobody exercises.

### The other half: a DEFAULT is applied BEFORE the trigger, so the two must say the SAME thing

(Measured 13 Aug 2026, staging, batch 182 — and it is the mirror image of everything above, on the path that runs every day.)

A DEFAULT fires when the column is **ABSENT from the INSERT**, which is what every client write does. So by the time a `BEFORE` trigger runs, the column is already **non-NULL**, and a trigger written as *"fill it if it is null"* **correctly does nothing on the normal path**. It only ever fires on the restore, where the key is present and explicitly NULL.

That is harmless while the two agree and silent when they do not. `business_id` carried `default '<the legacy café>'::uuid` and a trigger that filled nulls with *the caller's tenant*; the moment a tenant-scoped `with check` existed, **every café except the seeded one could READ its rows and could not WRITE any** — `42501` on its own insert. Nothing in SQL catches it: the column is populated, the trigger is present, and a single-tenant database behaves perfectly. **It appears only as a SECOND tenant**, which is why it was invisible until staging had one.

**So: a DEFAULT and a BEFORE trigger on the same column are ONE mechanism with two entry points, and they must compute the same value.** Point both at the same function — `set default public.current_business_id()`, `new.x := public.current_business_id()` — rather than leaving one a literal. Two definitions of the same thing is the defect; which one is "right" is not the question.

## A FOREIGN KEY is checked with RLS OFF, so a cross-tenant reference SUCCEEDS instead of erroring

(Batch 184, 13 Aug 2026, removing the `MENU_ORIGINAL` literal.)

**Postgres validates a foreign key as the constraint's owner, not as the caller, and RLS is not applied to that check.** So a row whose FK column points at ANOTHER tenant's row is accepted. The write returns success. The referenced row is then unreadable to the writer, because the ordinary `select` policy *does* apply.

`menu_items.menu_id → menus(id)`, and `menuToRow` used to write `menu_id:(item.menuId||'MENU_ORIGINAL')` — a literal naming a `menus` row **only Scoopy's has**. The obvious reading is that a second café gets `23503`, and before 182 that is exactly what happened. After 182's tenant policies it is worse: the café that has no such row still passes the FK check against Scoopy's, saves cleanly, and the dish renders **on no menu at all, forever, with no error anywhere.** An error would have been the good outcome.

**The transferable rule: a foreign key does NOT confine a reference to your own tenant, and it is easy to assume it does** because every other operation on that table is scoped. If a column can be written with a value the caller did not read from its own rows — a literal, a default, an id from an imported file — then **only the application can guarantee the target is yours.** The restore path is the standing example of the import case.
**The symptom to recognise: a row that saved without error and is invisible.** Reach for this before assuming a render bug.

## A policy that RESTRICTS and a policy that GRANTS differ by one word and read identically

(Batch 187, 14 Aug 2026, owner-vs-staff.)

**Postgres ORs permissive policies together and ANDs restrictive ones in.** Every table here already carries a permissive `for all` tenant policy from 182, so a new policy meant to take something AWAY must say `as restrictive` — and `as permissive` is the DEFAULT, so the word is omitted far more naturally than it is written.

```sql
create policy "plates owner-only delete" on public.plates
  as restrictive for delete using (current_business_role() = 'owner');   -- takes away
create policy "plates owner-only delete" on public.plates
  for delete using (current_business_role() = 'owner');                  -- takes away NOTHING
```

The second is OR'd with the tenant policy, which already permits the delete, so **staff can delete plates again, the SQL still says `owner`, no error is raised anywhere and the policy list still shows a policy with the right name.** Dropping two words silently repeals the rule while leaving every trace of it in place.

**The tell: a policy whose NAME says what someone may not do.** Read its first line, not its condition — a restriction that is not `as restrictive` is decoration. **Two test files pin these, not one** — `tests/roles.test.js` holds 187's five (`plates`, `menus`, and three on the `food_cost_target` setting) and `tests/invites.test.js` holds 191's four on `business_invites`; the mutation was run on both, and flipping one to `permissive` turns it red.
*(This read "pins all four" until 15 Aug 2026, naming one file and one number, and it was already contradicted three lines further down by the paragraph describing the FIFTH being added. A reader who counts and finds five stops trusting the paragraph, which is the one thing this section cannot afford.)*

**⚠️ AND THE ONE THAT ACTUALLY SHIPPED PAST THE FIRST DRAFT: a restriction keyed to a VALUE must cover every command that can change that value, INCLUDING DELETE.**
Two of 187's restrictions name a command on a table — "staff may not delete a plate" — so the policy is the whole of it. The other three name a *value*: `key = 'food_cost_target'` in a shared settings table, one policy per command, **and it took three because of exactly the mistake below.** `dbSetSetting` upserts, so the frame was "an upsert has two halves", INSERT and UPDATE were both covered, and a test asserting exactly that passed.
**DELETE is not part of an upsert, so it never entered the frame.** A staff account could delete the row outright — measured, not reasoned: HTTP 200, row returned, target gone — and the client then boots on its hardcoded default with nothing raised anywhere, which moves every suggested price and every good/bad colour in the app. Caught by the pre-push review.
**The transferable question is "what are ALL the ways this value can stop being what the owner set", not "which commands does my client use".** A client that only ever upserts is not a bound on what a caller can send; the whole point of the policy is the caller you did not write. Enumerate the commands in the test, so the next one cannot be missed by having a smaller frame.

**Two corollaries that cost as much and are less obvious:**
- **`as restrictive for all` is not "restrict everything", it is "require this to READ".** On a tenant table that means staff open the app to an empty café. Name the command.
- **NULL refuses.** `current_business_role() = 'owner'` is NULL for a caller with no membership, and a policy evaluating to NULL denies — which is what you want on the server, and is the exact OPPOSITE of the client-side rule two sections up. **The server refuses when it cannot establish permission; the client must not lock anyone out when it cannot tell.** Same expression shape, opposite correct default, because the consequences are not symmetrical.
  In PL/pgSQL the same NULL is a trap rather than a help: `if role <> 'owner' then raise` never fires for a NULL role, so a guard written that way lets exactly the caller it was written for straight through. Use `is distinct from`.

## `revoke … from public` DOES NOT REVOKE `anon`, and every migration in this repo is written as if it does

(Batch 218, 29 Aug 2026, rehearsing `create_business` on staging. Measured as the anon client over PostgREST; it could not have been found by reading, and a test written to forbid it was green.)

**Supabase ships `alter default privileges in schema public grant execute on functions to anon, authenticated, service_role`** — two of them, from `postgres` and from `supabase_admin`; read them out of `pg_default_acl`. So **every function created in `public` is born with `anon=X` already in its ACL**, before any `grant` in your file runs.

`revoke all on function … from public` revokes the **PUBLIC pseudo-role**. `anon` is a **real role**. They are different things, and the revoke does not touch the default-privilege grant. Omitting `anon` from your own `grant execute … to authenticated, service_role` cannot help either — **you cannot decline a privilege you were never the one to give.**

The measured difference, and it is the whole tell:

```
before:  P0001  "sign in before creating a cafe"          HTTP 400   ← the BODY refused
after:   42501  "permission denied for function …"        HTTP 401   ← the GRANT refused
```

**Both are a refusal, which is exactly why this survives.** The function was never callable-and-harmful; it was callable-and-raising, so nothing looked wrong from any screen, and the file's own comment claimed *"two mechanisms, because a grant is checked before the body runs"* while shipping one.

**The remedy is one line, and it must name the role and follow the function:** `revoke execute on function public.f(args) from anon;`. Placed **above** the `create or replace` it runs against the old ACL and the fresh default grant lands afterwards, putting `anon` straight back.

⚠️ **THIS PARAGRAPH NAMED `claim_business_invite()` AND `business_team()` AS CARRYING THE SAME GAP UNTIL 10 SEP 2026, AND BATCH 243 HAD CLOSED BOTH ON 9 SEP** — by-name revokes in `20260909_invite_choice.sql`, mirrored in `01-schema.sql`, with `docs/MAINTENANCE.md` and consolidated item 40 both struck the same day. 243's handover says *"Into CLAUDE.md: Nothing."* **So the one file loaded into every message of every batch stated an open security gap that was shut, and pointed at a maintenance entry that was already closed.** Found by AUDIT-v207.
**Measured against `proacl` on PRODUCTION, 10 Sep 2026** — which is what the next sentence tells you to do, and the reason this correction is a measurement rather than a re-read of the migration:

| holds `anon` EXECUTE | does not |
|---|---|
| `current_business_id`, `current_business_role`, `invite_pending`, `restore_backup`, `set_default_business_id`, `set_member_role`, `stamp_invite` | `business_team`, `claim_business_invite`, `create_business`, `my_pending_invites` |

**`invite_pending` is deliberate** — the one intentionally unauthenticated endpoint, asserted as such by 243. **`set_default_business_id` and `stamp_invite` are trigger functions.** The two worth knowing about are **`restore_backup` and `set_member_role`**: both are refused by their own bodies, so neither is a hole, and both are the same *callable-and-raising* shape `create_business` was — which is precisely the shape that made this whole section necessary, because it looks identical from every screen.
**They are not fixed on sight**, because a migration should not quietly re-grant or re-revoke functions its item does not own. **Check `proacl`, never the file**, when you want to know who can call something — and note that this paragraph was wrong for a day and a half in the direction that costs most: it named two functions that were safe and none of the ones that were not.

**The transferable rule is this file's oldest one arriving in SQL: a check that finds nothing has only proved something about WHAT IT LOOKED FOR.** `tests/cafe-create.test.js` asserted that the word `anon` was ABSENT from the grant statement and that a `revoke … from public` was PRESENT. Both true; both about the file's text; neither about whether `anon` holds EXECUTE. That is roster entry 190 — a denylist assertion is weaker than an equality one — reaching a language where the privilege can arrive from outside the file entirely. **Assert the revoke BY NAME.**

## `create or replace function` REPLACES THE WHOLE BODY, so copying one forward from the wrong ancestor DELETES guards by omission

(Batch 219, 29 Aug 2026, `restore_backup` v5. Shipped to staging AND production before the pre-push review caught it.)

There is no `alter function … body` in Postgres, so every change to a function in this repo restates the entire thing. **That makes "which copy did you start from" a correctness question, not a housekeeping one** — anything another batch added in between is deleted the moment you paste, **with no diff anywhere that shows a deletion**, because the new file simply never contained it.

219 copied `restore_backup` forward from `20260813_semantic_keys.sql` and lost batch **187's owner-only guard**, added by `20260814_roles_part1.sql` the following day. The shipped function let any signed-in **staff** account wipe and replace the whole catalogue. It applied green, every existing test stayed green, and the client's own comment still said the server would refuse a non-owner.

**Why the wrong ancestor was chosen is the part worth generalising: the QUEUE ITEM named it.** It said *"Start from v4, not from `20260806_restore_backup_v3.sql`"* — correct when written, falsified about 36 hours later, and no mechanism can notice. That is Tier 3's *"a queued item's approval does not expire and its FACTS do"* arriving somewhere it costs a security guard rather than a wasted hour.

**The rule: find the newest definition by listing the DIRECTORY, never by trusting an item, a comment, a header or your memory.**

```
grep -l 'create or replace function public.<name>' supabase/migrations/*.sql | sort | tail -1
```

⚠️ **AND THE TEST THAT SHOULD HAVE CAUGHT IT COULD NOT, FOR A REASON THAT GENERALISES FURTHER THAN SQL: A MIGRATION FILE IS A HISTORICAL RECORD, SO A TEST PINNED TO ONE BY NAME PINS WHAT WAS TRUE ON THE DAY IT RAN.** `tests/roles.test.js` asserted the guard by reading `20260814_roles_part1.sql` at a hardcoded path. That file still contains the guard and always will — so the assertion was green while the deployed function had none. **Pin the behaviour to whichever migration LAST defines the thing**, the way `tests/semantic-keys.test.js` already did. Two files in this repo had learned that and the third, holding the only security-critical assertion of the three, had not.

**The rehearsal missed it too, and the shape is the same one the `anon` record kept finding:** staging exercised `anon` and the OWNER, never a signed-in **staff** member — so the one role the guard exists for was the one role never tried. **When a function's guard names a role, the rehearsal has to sign in AS that role**, and it has to send the payload shape that reaches the destructive statements: a refusal proved with a payload that fails at the first insert has not tested the deletes.

## A PRIMARY KEY's column list is a contract with every `ON CONFLICT` that names it — and with the client that names none

(Batch 183, 13 Aug 2026, widening `app_settings` to `(business_id, key)` and `supplier_phrases` to `(business_id, id)`.)

**Postgres resolves an `on conflict (cols)` arbiter at RUNTIME, not when the function is created.** So changing a primary key leaves every `on conflict` naming the old columns syntactically fine, stored happily, and **42P10 the first time it runs** — "there is no unique or exclusion constraint matching the ON CONFLICT specification".
`restore_backup` carried exactly one such clause. **A migration that widens a key and does not replace that function applies GREEN and breaks disaster recovery**, which is the path nobody exercises until they need it most. The two are one change; 183 does them in one transaction, function first, so no intermediate state names a dead arbiter.

**The client half is the opposite shape and is easier to break by being helpful.** `dbSetSetting` and `dbPushSupplierPhrase` name **no** conflict target, and that silence is what makes them correct: **PostgREST derives an upsert's `ON CONFLICT` from the table's PRIMARY KEY**, so the write resolves against the caller's own row and the server stays the only thing that decides the tenant.
Adding `onConflict:'key'` "for clarity" re-globalises the key and puts the whole defect back — a second café's first save of a food cost target refused **42501 on the USING expression**, permanently, with no workaround. Both call sites say so; `tests/semantic-keys.test.js` pins it.

**The general law: a key's width is depended on in three places that never mention each other** — the SQL that names it, the client that deliberately does not, and the schema mirror in `supabase/staging/01-schema.sql`. Change one and grep for all three.

## What staff may delete is decided by WHOSE work it destroys, not by how much damage it does

(Max, 10 Sep 2026, reversing his own 187 decision. His words: *"they can do plates but not products, since those can break other plates that arent theres"*, and when told the first half was a reversal and had deliberately not been acted on: *"touch it and sort the merge out."*)

**The line moved, and it moved to a better place than "how destructive is this".** Deleting a plate is plenty destructive. It is also *your own work*, and a cafe whose staff cost dishes has to let them delete their own mistakes. A **product** is the row every plate's cost is computed from, so deleting one reaches plates belonging to other people; a **taught pack** decides what every future import prices that product at, so it reaches them one step later and less visibly.

| | before 255 | after |
|---|---|---|
| plate | owner only (187) | **any member** |
| menu | owner only | owner only - he said plates, and widening it would be a decision he did not make |
| product (`ingredients`) | **any member** | owner only |
| taught pack (`supplier_phrases`) | any member | any member - extended to, then REVERTED; see below |
| dish (`menu_items`) | any member | any member - 187 decided that deliberately |

**So the two rules were exactly inverted against what he wanted**, which is what made this worth measuring rather than assuming: the restriction that existed was on the thing he was happy for staff to do, and the two that reach other people's work had none.

⚠️ **THE TAUGHT PACK WAS AN INFERENCE FROM HIS REASON, IT SHIPPED IN THE FIRST CUT, AND THE PRE-PUSH REVIEW SENT IT BACK. That sequence is the rule, not the outcome.**

The inference was sound and still looks sound: a taught pack decides what every future import prices a product at, so removing one reaches other people's plates the same way, one step later. What it MISSED is that `applyTidy`'s supplier rename **re-keys** every taught pack for that supplier, and re-keying is delete-then-insert - through a chain (`openTidyManage` -> `renderTidyValues` -> `openTidy` -> `applyTidy`) with **no role check anywhere in it**. So the restriction would have made a staff supplier rename refuse its DELETE, drop the entry from memory anyway, push the new row, toast success, and leave the old row to reappear at the next boot: this file's own orphaned-taught-pack trap, manufactured by the fix.

**The honest remedy would have been to make renaming a supplier owner-only - a capability he was never asked about.** At that point the question stopped being *"is my inference sound"* and became *"is it worth staff losing supplier renames"*, which is his.

**So: an inference from someone's stated reason is free to make WHILE IT COSTS NOTHING, and becomes theirs the moment it costs something.** The test is not whether the reasoning holds - it usually does, which is what makes this shape survive - but **what the extension takes away, and from whom.** Go and look for the OTHER callers of whatever you are restricting before deciding you have merely applied their answer.
**And say at every site that you extended it**, which is what made this recoverable: the migration, the mirror, the queue item and this file all said "inference, not his answer", so the review had something to check rather than a rule to re-derive.

**The client half is not the enforcement and is not decoration either.** `deleteIngredient` - which deletes a PRODUCT, the naming inversion again - already refused when the product was referenced by any ingredient or plate line. So the case the new policy newly refuses is an UNREFERENCED product, which still takes its `ing_price_history` with it, plus anything sent straight at PostgREST where no client guard exists at all.

## The client's role is not the MCP's role

**A migration verified through the MCP or the SQL editor has NOT been verified for the client.** Found the hard way, on production.

`postgres` (MCP, SQL editor) and `authenticator` (PostgREST, for `anon` and `authenticated`) differ in ways that change whether SQL *runs at all* - preloaded libraries, `statement_timeout`, and RLS, which the MCP bypasses entirely.
The `verify` skill has the differences and the procedure for exercising an RPC as the client.

The one that bites while AUTHORING A MIGRATION (there is no client code to edit - every `.delete()` in `js/app.js` is `.eq()`-scoped; the `where true` lines are SQL): **`safeupdate` rejects any WHERE-less `DELETE` or `UPDATE`** for `authenticator` but not for `postgres`.
So **the `where true` on the restore's deletes is load-bearing** - it looks like a no-op and is not.
Do not tidy it away.

Also: **an anon UPDATE or DELETE returns 204 with NO error** and touches nothing.
A caller checking only for an error would believe it had written.

## Some of this app's behaviour is not in this repo at all, and nothing here can read it

(Batch 238, 8 Sep 2026. A stranger's confirmation email sent them to `http://localhost:3000`.)

**GoTrue's Site URL and Redirect URLs live in the Supabase dashboard.** There is no file, no migration, no table and no MCP call that reaches them. So when `signUp` shipped without an `emailRedirectTo`, every confirmation link inherited a factory default that no test could see, no grep could find and no review could read - and the account was created *correctly*, so nothing on any screen was wrong either. The defect lived entirely in the gap between two things that were each fine.

**The tell: a flow where every artefact you can inspect is correct and the user still ends up somewhere wrong.** When you reach that, stop looking for the bug in the code and ask **which of this behaviour is decided somewhere I cannot read** - Supabase's auth settings, Vercel env vars, GitHub's branch protection, a DNS record. Then go and look at it by hand, because there is no other way.

**And the corollary that is easy to get backwards: a client-side fix for an out-of-repo default is usually NECESSARY AND NOT SUFFICIENT.** GoTrue validates `emailRedirectTo` against its allow-list and **silently falls back to the Site URL** when it does not match - no error, no warning, no way to tell from the app that the option was ignored. So shipping the redirect is safe (its worst case is the old behaviour) and *proves nothing about whether it works*. Say so at the site, or the next reader will read a green suite as a working flow.
`docs/MAINTENANCE.md` carries the item for writing these down; two are known and both were found by something breaking.
