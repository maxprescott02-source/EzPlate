# HANDOVER - 187 (roles, the server half)

**Branch:** `feature/187-roles-server` · **Scope:** queue item 1, Roles owner vs staff — the server half only. The item is split; see below.
**Deploy version shipped:** NONE. No client asset changed, so the six spots are untouched and stay at `ezplate-v162`.

## What changed

The database knows two roles and enforces the four things staff may not do: delete a plate, delete a menu, change the food cost target, restore a backup.
Everything else stays theirs, including deleting a `menu_items` row, which is unpublishing a dish rather than deleting a menu.

`business_members.role` exists, checked to the two roles Max decided on 9 Aug 2026, and is filled by ONE mechanism: a `BEFORE INSERT` trigger making a business's FIRST member its owner and everyone after staff.
There is deliberately no column DEFAULT, and that is `CLAUDE.md`'s law rather than a preference: a DEFAULT fires when the column is absent, so the trigger would never see a null and would correctly do nothing, and no DEFAULT can answer "is this the first member of this business" because a DEFAULT cannot see the row.

`current_business_role()` reads the role OF THE ROW `current_business_id()` has already picked rather than picking one of its own, so the two can never disagree about which membership is yours.

The four restrictions are RESTRICTIVE policies, which AND with 182's permissive tenant policy instead of replacing it, so nothing already proved is re-litigated by this batch.
The restore is the exception and had to be a guard inside the function: it is `SECURITY INVOKER`, so its deletes already run as the caller, and staff legitimately delete ingredients and dishes in the ordinary course of work - there is nothing in a row that tells the two apart.

## The item was WRONG in two places, and split in a third

**Its opening claim was false.** It said the app "tells staff 'owner and staff access is already planned' while nothing is built" and that "that copy ships or comes out".
No such string exists. `index.html` says *"Two roles are planned: an owner, and working staff who can import invoices and edit ingredients and plates but not delete menus, change the target or restore a backup"*, on the Account screen, which only the account holder can reach.
That is an accurate statement of a plan, it misled nobody, and there were no staff to mislead. It becomes wrong only NOW, which is the client item's first job.

**It is more than one PR**, so it is split into three and only the first shipped: the server model (this), the client knowing its role, and invitations. The queue carries the other two with their own reasoning.

**And it delegated a decision, which is answered: one café per person**, enforced by a unique constraint on `user_id`.
Measured first, in both projects: nobody holds two memberships, so it locked nothing out. What it buys is that the failure moves to the moment somebody is ADDED, as a refusal an owner can read, instead of `current_business_id()` silently picking the older row - which 182 made stable rather than correct and said so.
The alternative is not "allow two", it is "allow two, store which is active, and build a switcher", because a stored choice with no control to set it is a dead control. The one-statement reversal is in the migration header.

## The pre-push review found the batch's real defect

**The four restrictions were three and a half.** There was no restrictive DELETE on `app_settings`, so a staff account could not CHANGE the food cost target but could REMOVE it. Reproduced as a real staff account on staging before fixing: HTTP 200, the row returned, the target gone. The client then boots on its hardcoded default with nothing raised anywhere, which moves every suggested price and every good/bad colour in the app.

**Why I missed it, because that is the transferable part.** The other three restrictions name a COMMAND on a table, so "restrict delete" is the whole of it. This one names a VALUE, `key = 'food_cost_target'` in a shared settings table - and `dbSetSetting` upserts, so my frame was "an upsert has two halves". DELETE is not part of an upsert, so it never entered the frame. **I then wrote a test called "the target restriction covers BOTH halves of the upsert", which passed, because it was written from the same wrong frame as the code.** That is the roster's defect class arriving in a shape I did not recognise while writing the roster entry beside it.
The test is replaced by one that enumerates the commands rather than naming two, and the mutation was run: deleting the new policy turns ten assertions red.

**And the stated rollback was wrong in a way that mattered.** The header said "ROLLBACK, one statement" while the body admitted a second step - and the order it implied is the damaging one, because the `do` block drops `current_business_role()` while `restore_backup` still calls it, so every restore would raise `42883` for everybody. Restore worked before this migration; a rollback done as the headline described would have left production worse off than not rolling back at all. It now says TWO STEPS IN THIS ORDER, with the restore first.

Both fixed and re-verified on both projects; the fingerprints were re-taken afterwards and match at 20 policies.

## Into CLAUDE.md

Two additions to one new Tier 1 trap: **a policy that RESTRICTS and a policy that GRANTS differ by one word and read identically**, plus - from the review finding above - **a restriction keyed to a VALUE must cover every command that can change that value, including DELETE.** The second carries the reason I missed it: a client that only ever upserts is not a bound on what a caller can send, and the whole point of a policy is the caller you did not write.
Permissive policies are OR'd, every table here already carries a permissive `for all`, and `as permissive` is the DEFAULT - so dropping two words repeals the rule while leaving the policy, its name and its condition in place, with no error anywhere.
Two corollaries went with it: `as restrictive for all` means "require this to READ", which on a tenant table empties the app; and NULL refuses in a policy but falls THROUGH an `if x <> 'owner'` in PL/pgSQL, which is why the restore guard uses `is distinct from`.
It also records that the server's correct default (refuse when you cannot establish permission) is the exact opposite of the client's (never lock anyone out when you cannot tell), because the consequences are not symmetrical.

## New docs/QUEUE.md items

Two, both from the split, both [A]:
**Roles - the CLIENT half** (the app reads its role, four controls hide, the Team card stops saying "planned"), and **Roles - invitations** (`Do after:` the client half), which carries the real difficulty: turning an email into a `user_id` needs a `SECURITY DEFINER` function, and written naively that answers "does an account exist for this email" to anyone signed in.
The gate-review item's stale line was corrected in the same sweep - it still said closing the anon key was "the auth item's one-function change", which shipped in 186.

## New docs/PHONE.md items

None. Nothing a user can reach changed: Max is the owner, and an owner's every action is unaffected.

## Probe

**What did the queue item tell you to do that you would have done differently?**
Two things, both above: its opening claim about the app's copy was simply not true of the code, and it read as one batch when it is three. The first mattered more than it looks - "that copy ships or comes out" would have had me delete an honest sentence to satisfy a premise nobody had checked.

**What did you not propose because it was out of scope?**
That `restore_backup` is now 181 lines carrying its own authorisation check, its own format validation and its own row-boundary translation, and that it is copied verbatim into two files. It is correct and it is pinned, but it is the largest single thing in this database and the next change to it will be the fourth copy-the-whole-block exercise. I did not propose splitting it because doing so during a batch that also adds a role check would put two hard things in one migration.

## Surprises

**The one-word inversion is real and I checked it rather than assuming.**
`as restrictive` dropped leaves a policy that grants, named as if it restricts, with no error - staff would delete plates again. All four are pinned and the mutation was run: flipping one to `permissive` turns the test red. Three sibling mutations were run too (a DEFAULT on the column, the trigger's branches swapped, `is distinct from` weakened to `<>`), and each of them is a silent inversion of the same kind.

**A test that names the migration it compares against is pinned to a moment, not to an invariant.**
`tests/semantic-keys.test.js` compared the mirror's `restore_backup` to `20260813_semantic_keys.sql` BY NAME, so this batch turned it red by being correct. The fix is not to re-point it: it now reads the migrations directory and compares against whichever migration last defines the function, plus a companion test that an OLDER migration still differs - because "make them all the same" would rewrite history in a repo whose only migration audit trail is these files.
Writing that extractor then took two goes: it assumed `$fn$` (one older migration uses `$$`) and then assumed the body opener sits within 400 characters (another has a comment in between). Both read as a broken test rather than as what they were.

**I did not retype the 170-line function body, and that was the right call.**
The guard was spliced into the deployed `prosrc` server-side on each project, then the result was proved byte-identical to this repo's copy: one md5 across staging, production and the file. Hand-copying it is precisely the drift the fingerprint exists to catch, and catching it afterwards is worse than never creating it.

**Making a staging account by hand fails as `500 Database error querying schema`**, which says nothing about the cause. It needs an `auth.identities` row with `provider='email'` AND empty strings rather than NULLs in eight token columns GoTrue scans. Three attempts; now written into `docs/STAGING.md` so the next batch spends none.
The signup API is not a way around it - it rejects `@example.com` outright.
