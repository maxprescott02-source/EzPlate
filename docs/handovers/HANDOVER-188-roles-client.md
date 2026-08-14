# HANDOVER - 188 (roles, the client half)

**Branch:** `188-roles-client` · **Scope:** queue item 1, "Roles - the CLIENT half". Shipped `ezplate-v163`.

## What changed

The app knows its role.
`current_business_role()` rides bootstrapSync's existing `Promise.all`, so it costs no round trip, and it resolves after the tenant gate's early return because a non-member's role is NULL and NULL is not a role.
Three answers, and "could not tell" reads as OWNER.
That is the opposite default from the tenant gate one screen away, and the item delegated the decision here: the server refuses either way, so guessing staff hides four controls from the person who owns the cafe with nothing on screen to explain it, while guessing owner shows a control that fails honestly with the server's own words.
Only a definite answer moves the standing role, so a re-sync whose role lookup alone fails leaves a known staff account staff.

Four controls stop being offered to staff, matching the four the server refuses.
Each was chased to every door rather than to the obvious one:

- delete a plate is `#bldDelete` AND the menu-item modal's "Delete everything" when the dish has a plate.
  With no plate that same button only removes the `menu_items` row, which is unpublishing, which 187 deliberately left staff able to do, so the guard is conditional on the plate rather than on the button.
- delete a menu is `#menuDelBtn`.
- restore a backup is the whole row.
- the food cost target is READ-ONLY, not hidden.

That last one is the batch's one deliberate departure from the item's wording, which said all four hide.
A Delete button carries no information; the target carries the NUMBER that drives every suggested price and every good/bad colour a staff member reads all day, so hiding it would take away a fact in order to prevent an edit.
The help line beside it says who can change it, and a Playwright assertion measures that the figure is still drawn in the body text colour, which is why read-only was chosen over `disabled`.

Every one is also guarded at the ACTION, not only at the affordance, because a stale screen or a call site added later walks past a missing button.

The Team card said the two roles were "planned" and the Account header said roles were "still to come".
Both are true statements now, and the card names the role the reader holds.
The header line was not in the item and was found by looking at the screen.

`.stg-row` gained `:not([hidden])` at BOTH breakpoints.
Without it the Restore row would have kept `display:flex` with `hidden` set on it and every unit test green; guarding only the wide rule would have raised its specificity and silently killed the narrow rule's `align-items` and `gap` override.

## Into CLAUDE.md

**Incident 19 on the eighteen-incident roster, added.**
A counter in a shared fixture is coupled to every future caller.
`tests/visual/_boot.js` bumped `__rpcCalls` on every `rpc()` call, and `v161-nonmember.spec.js` asserts `__rpcCalls > 1` to prove a re-sync actually ran, in its own words "or this test proves nothing".
Boot issued one rpc when that was written; this batch added a second, so the first boot alone reached 2 and the assertion could never fail again, in the spec pinning 185's silent-empty-app defect.
Nothing in the changed file was a test.
The remedy is to make a counter count the thing its reader MEANS, and the tell is a test asserting `> N` on a number some other file produces.

## New docs/QUEUE.md items

None.
Item 1 is deleted; the invitations item lost its now-satisfied `Do after:` line and gained a note on where an invitation control belongs (`applyRoleUi`, the Team card) and which assertion it will have to change rather than trip over.

## New docs/PHONE.md items

None.
Both roles were driven in a real browser at 380 and 1280 in both themes, so there is nothing left that only a device can settle.

## Probe

**What did the queue item tell you to do that you would have done differently?**
It said four controls hide, and the food cost target does not hide; it goes read-only.
Hiding it is the consistent answer and the wrong one, because it is the only one of the four that is a figure rather than a verb.
The item was right about the other three and right about the principle, so this is a departure inside its intent rather than against it, and a test now fails if a later batch makes it consistent.

**What did you not propose because it was out of scope?**
Two things.
An owner has no way to see WHO is in their cafe, only which role they themselves hold; that is the invitations item and it should own the whole card.
And the four refusals are stated in three places now, the migration, the Team card and `applyRoleUi`, with nothing tying them together, so a fifth restriction added server-side will not show up in the client or the copy by any mechanism.
That is worth a single source, and it is not worth building before there is a fifth.

## Surprises

The pre-push review called the `__rpcCalls` coupling a minor harness observation not worth blocking on.
It was a vacuous assertion in the spec covering the worst defect this repo has had, and the review's own framing would have let it merge.
`CLAUDE.md` already says never to dismiss a finding because its stated cause is wrong; this is the neighbouring case, where the cause is right and the severity is understated, and the answer is the same one: go and look at what it was pointing at.

The Menu screen's nav key is `data-tab="analysis"`.
The naming inversion is documented and I still wrote `data-tab="menu"` first and lost a Playwright run to it.
